import { Paths } from "expo-file-system";
import { Platform } from "react-native";

import { MomentType } from "@/gql/graphql";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProcessedMedia = {
  normalPath: string;
  blurredPath: string;
  thumbnailPath: string | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tempPath(extension: string): string {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${Paths.cache.uri}/${unique}.${extension}`.replace("file://", "");
}

function stripFileScheme(uri: string): string {
  return uri.replace("file://", "");
}

async function ffmpegExec(command: string): Promise<void> {
  // TEMPORARY: ffmpeg-kit-react-native is excluded from Android autolinking via
  // expo.autolinking.android.exclude in package.json while ffmpeg-kit-full-gpl.aar
  // is unavailable. This guard prevents the native import from being reached on Android.
  //
  // TO RESTORE full Android video processing:
  //   1. Obtain ffmpeg-kit-full-gpl.aar from the team and place it at android-libs/
  //   2. Remove "ffmpeg-kit-react-native" from expo.autolinking.android.exclude in package.json
  //   3. Remove this Platform.OS === "android" block below
  if (Platform.OS === "android") {
    if (__DEV__) {
      // Dev emulator: no-op so all other flows (feed, comments, profile, wallet) work normally.
      console.warn(
        "[momentMediaProcessor] Video processing is unavailable on Android — " +
        "ffmpeg-kit-react-native is excluded from this dev build. " +
        "Obtain ffmpeg-kit-full-gpl.aar from the team to enable it.",
      );
      return;
    }
    // Production Android: throw so the upload queue surfaces the error clearly
    // rather than silently producing a broken/unprocessed moment.
    throw new Error(
      "Video processing is not available in this Android build. " +
      "ffmpeg-kit-react-native is excluded — place ffmpeg-kit-full-gpl.aar in android-libs/ " +
      "and remove expo.autolinking.android.exclude from package.json.",
    );
  }

  const { FFmpegKit, ReturnCode } = await import("ffmpeg-kit-react-native");
  const session = await FFmpegKit.execute(command);
  const returnCode = await session.getReturnCode();

  if (!ReturnCode.isSuccess(returnCode)) {
    const output = await session.getOutput();
    throw new Error(`FFmpeg failed (code ${returnCode.getValue()}): ${output}`);
  }
}

// ---------------------------------------------------------------------------
// Photo processing
// ---------------------------------------------------------------------------

async function processPhoto(inputUri: string): Promise<ProcessedMedia> {
  const input = stripFileScheme(inputUri);

  // On Android dev, ffmpeg-kit is excluded from autolinking so every
  // ffmpegExec call is a silent no-op. The temp output files are never
  // written to disk, which would cause fetchLocalUriAsBlob to fail when
  // the processor tries to upload them. Skip processing entirely and
  // forward the raw capture file for both paths — no compression or blur,
  // but posting works end-to-end in the Android emulator.
  if (Platform.OS === "android" && __DEV__) {
    console.warn(
      "[momentMediaProcessor] Photo compression skipped on Android dev — " +
      "uploading raw capture file. ffmpeg-kit is excluded from this build.",
    );
    return { normalPath: input, blurredPath: input, thumbnailPath: null };
  }

  // iOS dev: HEIC files use the ISOBMFF container (same base as MP4), which
  // causes FFmpeg to error with "moov atom not found". Skip processing and
  // forward the raw file — same no-op pattern used for Android above.
  if (__DEV__) {
    console.warn(
      "[momentMediaProcessor] Photo processing skipped in iOS dev — " +
      "uploading raw capture file.",
    );
    return { normalPath: input, blurredPath: input, thumbnailPath: null };
  }

  const normalOut = tempPath("jpg");
  const blurredOut = tempPath("jpg");

  await ffmpegExec(
    `-i "${input}" -q:v 14 -update 1 "${normalOut}"`,
  );
  await ffmpegExec(
    `-i "${input}" -vf "gblur=sigma=150:steps=5" -q:v 10 -update 1 "${blurredOut}"`,
  );

  return {
    normalPath: normalOut,
    blurredPath: blurredOut,
    thumbnailPath: null,
  };
}

// ---------------------------------------------------------------------------
// Video processing
// ---------------------------------------------------------------------------

async function compressVideo(
  inputPath: string,
  outputPath: string,
): Promise<void> {
  const encoder =
    Platform.OS === "ios" ? "h264_videotoolbox" : "libx264";
  const bitrateFlag =
    Platform.OS === "ios" ? "-b:v 2.5M" : "-crf 23 -preset fast";

  await ffmpegExec(
    `-i "${inputPath}" -vcodec ${encoder} ${bitrateFlag} -c:a aac -b:a 128k "${outputPath}"`,
  );
}

async function cutVideo(inputPath: string): Promise<string> {
  const output = tempPath("mp4");
  await ffmpegExec(`-y -i "${inputPath}" -t 6 -c copy "${output}"`);
  return output;
}

async function processVideo(
  inputUri: string,
  isLocal: boolean,
): Promise<ProcessedMedia> {
  // On Android dev, ffmpeg-kit is excluded. Throw early with a clear message
  // rather than letting the pipeline run and fail later on missing temp files.
  // The upload processor catches this and returns "retry", which surfaces the
  // error in logs without crashing the app.
  if (Platform.OS === "android" && __DEV__) {
    throw new Error(
      "[momentMediaProcessor] Video posting is unavailable on Android dev — " +
      "ffmpeg-kit-react-native is excluded from this build. " +
      "Obtain ffmpeg-kit-full-gpl.aar from the team and remove " +
      "expo.autolinking.android.exclude from package.json to enable it.",
    );
  }

  const input = stripFileScheme(inputUri);
  const normalOut = tempPath("mp4");
  const blurredOut = tempPath("jpg");
  const thumbnailOut = tempPath("jpg");

  if (isLocal) {
    const cutPath = await cutVideo(input);
    await compressVideo(cutPath, normalOut);
  } else {
    await compressVideo(input, normalOut);
  }

  await ffmpegExec(
    `-i "${input}" -vf "select=eq(n\\,0)" -q:v 6 -update 1 "${thumbnailOut}"`,
  );
  await ffmpegExec(
    `-i "${input}" -vf "select=eq(n\\,0),gblur=sigma=150:steps=5" -q:v 10 -update 1 "${blurredOut}"`,
  );

  return {
    normalPath: normalOut,
    blurredPath: blurredOut,
    thumbnailPath: thumbnailOut,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Processes a captured/picked media file: compresses, generates blurred
 * preview, and (for video) extracts a thumbnail frame.
 *
 * All output files are written to the cache directory and should be
 * deleted after upload.
 */
export async function processMediaForUpload(
  localUri: string,
  mediaType: MomentType,
  isLocal: boolean,
): Promise<ProcessedMedia> {
  if (mediaType === MomentType.Video) {
    return processVideo(localUri, isLocal);
  }
  return processPhoto(localUri);
}
