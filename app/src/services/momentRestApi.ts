import type { Author, MomentType } from "@/gql/graphql";
import { getValidToken } from "@/services/tokenManager";
import { resolveLocalUrl } from "@/utils/apiUrl";

export type MediaItemUploadUrls = {
  id: string;
  mediaUrl: string;
  blurredUrl: string;
  videoThumbnailUrl: string | null;
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CreateMomentRequest = {
  authorId: string;
  id: string;
  author: Pick<Author, "id" | "name" | "avatar">;
  isLocal: boolean;
  type: MomentType;
  // Optional caption typed by the user on the caption screen.
  // When undefined the field is omitted from the JSON body entirely
  // (JSON.stringify skips undefined values), so existing backends that do
  // not yet read this field continue to work without changes.
  description?: string;
  // Multi-media: list of item IDs and their media types for upload URL allocation.
  // Omitted for single-media Moments (backward compat).
  mediaItems?: Array<{ id: string; type: MomentType }>;
};

export type CreateMomentResponse = {
  mediaUrl: string;
  blurredUrl: string;
  videoThumbnailUrl: string | null;
  // Present when the request included mediaItems. One entry per item in the
  // same order. For single-media Moments this field is absent.
  mediaItemUrls?: MediaItemUploadUrls[];
};

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

const API_BASE = resolveLocalUrl(process.env.EXPO_PUBLIC_API_BASE_REST ?? "");

async function authedFetch<T>(
  endpoint: string,
  init: RequestInit,
  signal?: AbortSignal,
): Promise<T> {
  const token = await getValidToken();
  const url = `${API_BASE}${endpoint}`;

  if (__DEV__) {
    console.log("[momentRestApi] →", init.method ?? "GET", url);
  }

  const response = await fetch(url, {
    ...init,
    signal,
    headers: {
      ...init.headers,
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `[momentRestApi] ${endpoint} failed (${response.status}): ${body}`,
    );
  }

  return response.json() as Promise<T>;
}

/**
 * Registers a new moment on the backend and returns pre-signed S3 URLs
 * for uploading the processed media files (normal, blurred, video thumbnail).
 *
 * On Android dev the returned presigned URLs are also remapped from
 * localhost → 10.0.2.2 so the subsequent S3 PUT requests can reach the
 * mock server's /s3-upload/ handler.
 */
export async function createMomentAndGetUploadUrls(
  input: CreateMomentRequest,
  signal?: AbortSignal,
): Promise<CreateMomentResponse> {
  const response = await authedFetch<CreateMomentResponse>(
    "create-moment",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    signal,
  );
  // Remap localhost in the presigned S3 URLs returned by the mock server so
  // the Android emulator can reach them via 10.0.2.2. No-op on iOS/prod.
  return {
    mediaUrl: resolveLocalUrl(response.mediaUrl),
    blurredUrl: resolveLocalUrl(response.blurredUrl),
    videoThumbnailUrl: response.videoThumbnailUrl
      ? resolveLocalUrl(response.videoThumbnailUrl)
      : null,
    // Pass through per-item URLs for multi-media Moments. Without this the
    // upload processor sees mediaItemUrls as undefined and skips every item,
    // then overwrites the optimistic registry with an empty array.
    mediaItemUrls: response.mediaItemUrls?.map((item) => ({
      id: item.id,
      mediaUrl: resolveLocalUrl(item.mediaUrl),
      blurredUrl: resolveLocalUrl(item.blurredUrl),
      videoThumbnailUrl: item.videoThumbnailUrl
        ? resolveLocalUrl(item.videoThumbnailUrl)
        : null,
    })),
  };
}
