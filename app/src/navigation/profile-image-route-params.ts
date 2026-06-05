import type { Author } from "@/gql/graphql";

/**
 * Search params for `/(app)/profile-image` (full-screen avatar preview).
 * All values are serialized as strings in the router.
 */
export interface ProfileImageRouteParams {
  /** Non-empty public URL of the avatar image. */
  authorAvatar: string;
  authorName?: string;
}

export const PROFILE_IMAGE_PATHNAME = "/(app)/profile-image" as const;

/**
 * Serial shape for `router.push` (string values only).
 */
export type ProfileImageRouterParams = {
  authorAvatar: string;
  authorName?: string;
};

function paramToString(
  value: string | string[] | undefined
): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export function serializeProfileImageRouteParams(
  p: ProfileImageRouteParams
): ProfileImageRouterParams {
  return {
    authorAvatar: p.authorAvatar,
    ...(p.authorName !== undefined ? { authorName: p.authorName } : {}),
  };
}

export function buildProfileImageRouteParamsFromAuthor(
  author: Pick<Author, "name" | "avatar">
): ProfileImageRouteParams | null {
  const url = author.avatar?.trim();
  if (!url) {
    return null;
  }
  const name = author.name?.trim();
  return {
    authorAvatar: url,
    ...(name ? { authorName: name } : {}),
  };
}

export function getProfileImagePush(values: ProfileImageRouteParams) {
  return {
    pathname: PROFILE_IMAGE_PATHNAME,
    params: serializeProfileImageRouteParams(values),
  } as const;
}

/**
 * Build a typed `router.push` payload from an author, or `null` when there is no avatar URL.
 */
export function getProfileImagePushFromAuthor(
  author: Pick<Author, "name" | "avatar">
) {
  const built = buildProfileImageRouteParamsFromAuthor(author);
  if (!built) {
    return null;
  }
  return getProfileImagePush(built);
}

/**
 * Read search params on the profile-image screen.
 */
export function parseProfileImageLocalParams(
  raw: Record<string, string | string[] | undefined>
): ProfileImageRouteParams | null {
  const authorAvatar = paramToString(raw.authorAvatar);
  if (!authorAvatar) {
    return null;
  }
  const authorName = paramToString(raw.authorName);
  return {
    authorAvatar,
    ...(authorName !== undefined ? { authorName } : {}),
  };
}
