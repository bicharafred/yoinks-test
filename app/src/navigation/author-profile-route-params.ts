import type { Author } from "@/gql/graphql";

/**
 * Dynamic segment + search params for:
 * - `/(app)/visitor/[authorId]`
 * - `/(app)/user-moments/[authorId]`
 *
 * All values are serialized as strings in the router.
 */
export interface AuthorProfileStackParams {
  authorId: string;
  authorName?: string;
  authorAvatar?: string;
}

export const VISITOR_PROFILE_PATHNAME = "/(app)/visitor/[authorId]" as const;
export const USER_MOMENTS_PATHNAME = "/(app)/user-moments/[authorId]" as const;

function paramToString(
  value: string | string[] | undefined
): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export function buildAuthorProfileStackParamsFromAuthor(
  author: Pick<Author, "id" | "name" | "avatar">
): AuthorProfileStackParams {
  return {
    authorId: author.id,
    authorName: author.name,
    ...(author.avatar ? { authorAvatar: author.avatar } : {}),
  };
}

/**
 * Serial shape for `router.push` (string values only). `authorId` is always set for typed routes.
 */
export type AuthorProfileStackRouterParams = {
  authorId: string;
  authorName?: string;
  authorAvatar?: string;
};

/** Router params for user-moments; `initialIndex` is a search param string when set. */
export type UserMomentsStackRouterParams = AuthorProfileStackRouterParams & {
  initialIndex?: string;
};

export function serializeAuthorProfileStackParams(
  p: AuthorProfileStackParams
): AuthorProfileStackRouterParams {
  return {
    authorId: p.authorId,
    ...(p.authorName !== undefined ? { authorName: p.authorName } : {}),
    ...(p.authorAvatar !== undefined ? { authorAvatar: p.authorAvatar } : {}),
  };
}

function initialIndexToSearchParam(
  value: string | number | undefined
): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return undefined;
    return String(value);
  }
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

export function serializeUserMomentsStackRouterParams(
  author: Pick<Author, "id" | "name" | "avatar">,
  initialIndex?: string | number
): UserMomentsStackRouterParams {
  const base = serializeAuthorProfileStackParams(
    buildAuthorProfileStackParamsFromAuthor(author)
  );
  const indexParam = initialIndexToSearchParam(initialIndex);
  if (indexParam === undefined) return base;
  return { ...base, initialIndex: indexParam };
}

export function getVisitorProfilePush(author: Pick<Author, "id" | "name" | "avatar">) {
  return {
    pathname: VISITOR_PROFILE_PATHNAME,
    params: serializeAuthorProfileStackParams(
      buildAuthorProfileStackParamsFromAuthor(author)
    ),
  } as const;
}

export function getUserMomentsPush(
  author: Pick<Author, "id" | "name" | "avatar">,
  initialIndex?: string | number
) {
  return {
    pathname: USER_MOMENTS_PATHNAME,
    params: serializeUserMomentsStackRouterParams(author, initialIndex),
  } as const;
}

/**
 * Read search + path params on visitor or user-moments screens.
 */
export function parseAuthorProfileLocalParams(
  raw: Record<string, string | string[] | undefined>
): AuthorProfileStackParams | null {
  const authorId = paramToString(raw.authorId);
  if (!authorId) {
    return null;
  }
  return {
    authorId,
    authorName: paramToString(raw.authorName),
    authorAvatar: paramToString(raw.authorAvatar),
  };
}

/**
 * Optional grid index for `/(app)/user-moments/[authorId]` (search param).
 * Invalid or missing values yield null; non-integers are rejected.
 */
export function parseUserMomentsInitialIndex(
  raw: Record<string, string | string[] | undefined>,
): number | null {
  const s = paramToString(raw.initialIndex);
  if (s === undefined) {
    return null;
  }
  const trimmed = s.trim();
  if (trimmed === "") {
    return null;
  }
  const n = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(n) || n < 0 || String(n) !== trimmed) {
    return null;
  }
  return n;
}
