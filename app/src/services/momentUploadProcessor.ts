import { Platform } from "react-native";
import Toast from "react-native-toast-message";
import { File } from "expo-file-system";
import { MomentType } from "@/gql/graphql";
import { processMediaForUpload } from "@/services/momentMediaProcessor";
import { createMomentAndGetUploadUrls } from "@/services/momentRestApi";
import { removeCapturedMedia } from "@/services/momentCaptureStorage";
import type {
  MomentUploadFlushResult,
  MomentUploadJob,
} from "@/services/momentUploadQueue";
import { fetchLocalUriAsBlob } from "@/services/localImageBlob";
import { registerMediaItems } from "@/services/mediaItemRegistry";
import type { MediaItem } from "@/types/mediaItem";

// ---------------------------------------------------------------------------
// File existence helpers
// ---------------------------------------------------------------------------

function fileExists(uri: string): boolean {
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// S3 upload
// ---------------------------------------------------------------------------

async function uploadToS3(
  presignedUrl: string,
  filePath: string,
  contentType: string,
): Promise<void> {
  const uri = filePath.startsWith("file://") ? filePath : `file://${filePath}`;

  if (__DEV__) {
    console.log("[momentUploadProcessor] upload URL:", presignedUrl);
    console.log("[momentUploadProcessor] request method: PUT");
    console.log("[momentUploadProcessor] file URI:", uri);
    console.log("[momentUploadProcessor] platform:", Platform.OS);
  }

  const blob = await fetchLocalUriAsBlob(uri);

  const response = await fetch(presignedUrl, {
    method: "PUT",
    body: blob,
    headers: {
      "Content-Type": contentType,
      "Content-Length": blob.size.toString(),
    },
  });

  if (!response.ok) {
    throw new Error(`S3 upload failed: ${response.status}`);
  }
}

// ---------------------------------------------------------------------------
// Flush handler
// ---------------------------------------------------------------------------

/**
 * The flush handler that `momentUploadQueue.flush()` calls for each job.
 *
 * Pipeline:
 * 1. FFMPEG: compress media, generate blurred version, extract thumbnail (video)
 * 2. REST `create-moment`: register moment on backend, get pre-signed S3 URLs
 * 3. Upload processed files to S3 in parallel
 * 4. Clean up local cache files
 */
export async function processMomentUploadJob(
  job: MomentUploadJob,
): Promise<MomentUploadFlushResult> {
  // Belt-and-suspenders: discard any video job that reached the queue in local
  // dev (FFmpeg is excluded from this build and would fail anyway).
  if (__DEV__ && job.mediaType === MomentType.Video) {
    if (__DEV__) {
      console.warn(
        `[momentUploadProcessor] Discarding video job ${job.id} — video not supported in local dev.`,
      );
    }
    return "discard";
  }

  try {
    if (__DEV__) {
      console.log("[momentUploadProcessor] starting job", job.id);
      console.log("[momentUploadProcessor] platform:", Platform.OS);
      console.log("[momentUploadProcessor] file URI:", job.localMediaUri);
      console.log("[momentUploadProcessor] request method: POST");
      console.log("[momentUploadProcessor] endpoint: create-moment");
    }

    // Multi-media path: job has an array of staged items.
    if (job.mediaItems && job.mediaItems.length > 1) {
      // Pre-flight: verify all item source files still exist.
      // Cache files (Library/Caches/moment-captures/) are ephemeral — the OS
      // or cleanupStaleCaptureMedia() may have removed them since the job was
      // enqueued. Discarding immediately avoids FFmpeg "no such file" errors
      // and stops the job from retrying across app restarts.
      const missingItems = job.mediaItems.filter((item) => !fileExists(item.localUri));
      if (missingItems.length > 0) {
        if (__DEV__) {
          console.warn(
            `[momentUploadProcessor] Discarding stale multi-media job ${job.id} —` +
            ` ${missingItems.length}/${job.mediaItems.length} source file(s) no longer exist.`,
            missingItems.map((i) => i.localUri),
          );
        }
        return "discard";
      }
      if (__DEV__) {
        console.log("[carousel-upload] mediaItems count:", job.mediaItems.length);
      }

      const urls = await createMomentAndGetUploadUrls({
        authorId: job.author.id,
        id: job.id,
        author: job.author,
        isLocal: job.isLocal,
        type: job.mediaType,
        description: job.description ?? undefined,
        mediaItems: job.mediaItems.map((item) => ({ id: item.id, type: item.mediaType })),
      });

      if (__DEV__) {
        console.log("[carousel-upload] mediaItemUrls from server:", urls.mediaItemUrls?.length ?? 0, urls.mediaItemUrls?.map((u) => u.mediaUrl));
      }

      const resolvedItems: MediaItem[] = [];

      for (let i = 0; i < job.mediaItems.length; i++) {
        const item = job.mediaItems[i];
        const itemUrls = urls.mediaItemUrls?.[i];
        if (!itemUrls) continue;

        const isItemVideo = item.mediaType === MomentType.Video;
        const processed = await processMediaForUpload(
          item.localUri,
          item.mediaType,
          job.isLocal,
        );

        const itemUploads: Promise<void>[] = [
          uploadToS3(itemUrls.mediaUrl, processed.normalPath, isItemVideo ? "video/mp4" : "image/jpeg"),
          uploadToS3(itemUrls.blurredUrl, processed.blurredPath, "image/jpeg"),
        ];
        if (isItemVideo && processed.thumbnailPath && itemUrls.videoThumbnailUrl) {
          itemUploads.push(uploadToS3(itemUrls.videoThumbnailUrl, processed.thumbnailPath, "image/jpeg"));
        }
        await Promise.all(itemUploads);
        if (__DEV__) {
          console.log("[carousel-upload] uploaded item:", item.id, "→", itemUrls.mediaUrl, itemUrls.blurredUrl);
        }
        cleanupFiles(item.localUri, processed);

        resolvedItems.push({
          id: item.id,
          mediaUrl: itemUrls.mediaUrl,
          mediaType: item.mediaType,
          thumbnailUrl: itemUrls.videoThumbnailUrl,
          cropTransform: item.cropTransform,
        });
      }

      // Update the registry with final server URLs (replaces optimistic local URIs).
      // Guard: only write when we have items — an empty resolvedItems would
      // overwrite the optimistic local-URI items and collapse the carousel.
      if (resolvedItems.length > 0) {
        registerMediaItems(job.id, resolvedItems);
      }

      return "success";
    }

    // Single-media path (existing behavior).
    // Pre-flight: verify the source file still exists before invoking FFmpeg.
    if (!fileExists(job.localMediaUri)) {
      if (__DEV__) {
        console.warn(
          `[momentUploadProcessor] Discarding stale job ${job.id} —` +
          ` source file no longer exists: ${job.localMediaUri}`,
        );
      }
      return "discard";
    }

    const isVideo = job.mediaType === MomentType.Video;

    const processed = await processMediaForUpload(
      job.localMediaUri,
      job.mediaType,
      job.isLocal,
    );

    const urls = await createMomentAndGetUploadUrls({
      authorId: job.author.id,
      id: job.id,
      author: job.author,
      isLocal: job.isLocal,
      type: job.mediaType,
      // Forward the caption that was stored with the job at enqueue time.
      // undefined is used (not null) because the REST type declares it as
      // optional — JSON.stringify omits undefined keys automatically.
      description: job.description ?? undefined,
    });

    if (__DEV__) {
      console.log("[momentUploadProcessor] create-moment response:", {
        mediaUrl: urls.mediaUrl,
        blurredUrl: urls.blurredUrl,
        videoThumbnailUrl: urls.videoThumbnailUrl,
      });
    }

    const uploads: Promise<void>[] = [
      uploadToS3(
        urls.mediaUrl,
        processed.normalPath,
        isVideo ? "video/mp4" : "image/jpeg",
      ),
      uploadToS3(urls.blurredUrl, processed.blurredPath, "image/jpeg"),
    ];

    if (isVideo && processed.thumbnailPath && urls.videoThumbnailUrl) {
      uploads.push(
        uploadToS3(urls.videoThumbnailUrl, processed.thumbnailPath, "image/jpeg"),
      );
    }

    await Promise.all(uploads);

    cleanupFiles(job.localMediaUri, processed);

    return "success";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (__DEV__) {
      console.error("[momentUploadProcessor] Job failed:", job.id, error);

      // Surface the failure as a non-fatal toast so the developer sees it
      // without a redbox. The job returns "retry" so the queue handles backoff.
      Toast.show({
        type: "error",
        text1: "Upload failed (dev)",
        text2: message.length > 120 ? `${message.slice(0, 117)}…` : message,
        visibilityTime: 5000,
      });
    }

    return "retry";
  }
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

function cleanupFiles(
  originalUri: string,
  processed: { normalPath: string; blurredPath: string; thumbnailPath: string | null },
): void {
  removeCapturedMedia(originalUri);

  for (const path of [
    processed.normalPath,
    processed.blurredPath,
    processed.thumbnailPath,
  ]) {
    if (path) {
      removeCapturedMedia(path.startsWith("file://") ? path : `file://${path}`);
    }
  }
}
