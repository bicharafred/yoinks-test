import { client } from "@/services/client";

/**
 * Evicts the cached `getAuthorMoments` field for one author (see Apollo `keyArgs: ["authorId"]`).
 * Call after hide/delete (and similar) so profile grid and author-moments lists do not reuse a stale merged list.
 */
export function evictCachedAuthorMomentsList(authorId: string): void {
  const id = authorId.trim();
  if (id === "") {
    return;
  }

  client.cache.evict({
    id: "ROOT_QUERY",
    fieldName: "getAuthorMoments",
    args: { authorId: id },
  });
  client.cache.gc();
}

/**
 * Evicts the cached `getFeedMoments` field for the viewer (see Apollo `keyArgs: ["authorId"]`).
 * Call after unblock (and similar) so the feed refetches without stale merged pages.
 */
export function evictCachedFeedMomentsList(authorId: string): void {
  const id = authorId.trim();
  if (id === "") {
    return;
  }

  client.cache.evict({
    id: "ROOT_QUERY",
    fieldName: "getFeedMoments",
    args: { authorId: id },
  });
  client.cache.gc();
}
