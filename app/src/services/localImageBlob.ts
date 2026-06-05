/**
 * Helpers for avatar upload: read a local `file://` (or content) URI as a Blob
 * and normalize public URLs after signed PUT uploads.
 */

export function stripUrlQuery(url: string): string {
  const trimmed = url.trim();
  const q = trimmed.indexOf("?");
  return q === -1 ? trimmed : trimmed.slice(0, q);
}

/**
 * Reads image bytes from a local picker URI via `fetch` (supported on native for file URIs).
 */
export async function fetchLocalUriAsBlob(uri: string): Promise<Blob> {
  const trimmed = uri.trim();
  if (trimmed === "") {
    throw new Error("Image URI is empty.");
  }

  const response = await fetch(trimmed);
  if (!response.ok) {
    throw new Error(`Could not read the selected image (${response.status}).`);
  }

  return await response.blob();
}
