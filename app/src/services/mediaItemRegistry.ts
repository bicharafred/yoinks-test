import type { MediaItem } from "@/types/mediaItem";

/**
 * Module-level registry mapping momentId → MediaItem[].
 *
 * Used only for optimistic multi-media posts: writeOptimisticMomentToFeed sets
 * mediaItems to null in the Apollo write (to avoid a race with the server
 * response) and populates this registry with local-URI items so the carousel
 * renders immediately while the upload runs in the background.
 *
 * Server-fetched moments carry mediaItems directly via MomentFragment and do not
 * use this registry. MomentMedia prefers moment.mediaItems from Apollo and falls
 * back here only when that field is null.
 *
 * The registry is in-memory only — cleared on app restart. Single-media moments
 * are always served via moment.mediaUrl and are unaffected.
 */
const registry = new Map<string, MediaItem[]>();

type RegistryListener = (momentId: string) => void;
const listeners = new Set<RegistryListener>();

export function subscribeToRegistry(listener: RegistryListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function registerMediaItems(momentId: string, items: MediaItem[]): void {
  registry.set(momentId, items);
  listeners.forEach((l) => l(momentId));
}

export function getMediaItems(momentId: string): MediaItem[] | null {
  const items = registry.get(momentId);
  return items ?? null;
}

export function clearMediaItemsForMoment(momentId: string): void {
  registry.delete(momentId);
}
