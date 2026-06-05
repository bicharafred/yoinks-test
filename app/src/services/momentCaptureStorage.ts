import { Directory, File, Paths } from "expo-file-system";

import { MomentType } from "@/gql/graphql";

/**
 * Uses cache storage instead of documents so media is NOT browsable
 * in the device's Files app. Files here are ephemeral — the OS may
 * reclaim space, and we delete them after a successful upload.
 */
const CAPTURE_SUBDIR = "moment-captures";

function normalizeToFileUri(uri: string): string {
  if (uri.startsWith("file://")) {
    return uri;
  }
  if (uri.startsWith("/")) {
    return `file://${uri}`;
  }
  return uri;
}

function fileExtensionFor(mediaType: MomentType, sourceUri: string): string {
  if (mediaType === MomentType.Photo) {
    const lower = sourceUri.toLowerCase();
    if (lower.endsWith(".heic") || lower.endsWith(".heif")) {
      return "heic";
    }
    return "jpg";
  }
  const lower = sourceUri.toLowerCase();
  if (lower.endsWith(".mov")) {
    return "mov";
  }
  if (lower.endsWith(".m4v")) {
    return "m4v";
  }
  return "mp4";
}

function getCaptureDir(): Directory {
  const dir = new Directory(Paths.cache, CAPTURE_SUBDIR);
  dir.create({ intermediates: true, idempotent: true });
  return dir;
}

/**
 * Copies a transient capture or picker URI into app **cache** storage so
 * handoff does not rely on sandbox URIs that may be revoked after backgrounding.
 * Cache is not user-browsable (unlike Documents).
 */
export async function copyTransientMediaToDocuments(
  transientUri: string,
  mediaType: MomentType,
): Promise<string> {
  const normalizedSource = normalizeToFileUri(transientUri);
  const ext = fileExtensionFor(mediaType, normalizedSource);
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const baseDir = getCaptureDir();

  const dest = new File(baseDir, `${unique}.${ext}`);
  const source = new File(normalizedSource);
  source.copy(dest);

  return dest.uri;
}

/**
 * Remove a single cached media file after it has been uploaded.
 */
export function removeCapturedMedia(fileUri: string): void {
  try {
    const file = new File(fileUri);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // Best-effort cleanup; the OS will eventually reclaim cache space.
  }
}

/**
 * Purge all files in the capture cache directory older than `maxAgeMs`.
 * Call on app launch to prevent stale media from accumulating.
 */
export function cleanupStaleCaptureMedia(
  maxAgeMs: number = 24 * 60 * 60 * 1000,
): void {
  try {
    const dir = getCaptureDir();
    const now = Date.now();
    for (const entry of dir.list()) {
      if (entry instanceof File) {
        const ageMs = now - (entry.lastModified ?? 0);
        if (ageMs > maxAgeMs) {
          entry.delete();
        }
      }
    }
  } catch {
    // Best-effort cleanup.
  }
}
