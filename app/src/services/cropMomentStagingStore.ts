import type { CropTransform } from "@/types/cropTransform";
import type { StagedItem } from "@/types/mediaItem";

/**
 * Module-level staging store for the multi-media creation flow.
 *
 * Avoids serializing arrays through Expo Router string params. The crop-moment
 * and share-moment screens read/write this store directly instead of passing
 * data through navigation params.
 *
 * Lifecycle:
 *   initStaging()    — called by create-moment before pushing to crop-moment
 *   clearStaging()   — called by share-moment after the moment is enqueued
 *
 * Intentionally lives outside src/app/ so Expo Router does not treat it as a
 * route file (it has no default export and is not a screen).
 */

let stagedItems: StagedItem[] = [];
let currentIndex = 0;

export function initStaging(items: StagedItem[]): void {
  stagedItems = items.map((item) => ({ ...item }));
  currentIndex = 0;
}

export function getStagedItems(): StagedItem[] {
  return stagedItems;
}

export function getStagedItemCount(): number {
  return stagedItems.length;
}

export function getCurrentIndex(): number {
  return currentIndex;
}

export function setCurrentIndex(index: number): void {
  if (index >= 0 && index < stagedItems.length) {
    currentIndex = index;
  }
}

export function setCropForIndex(
  index: number,
  cropTransform: CropTransform | null,
): void {
  if (stagedItems[index]) {
    stagedItems[index] = { ...stagedItems[index], cropTransform };
  }
}

export function removeItemAtIndex(index: number): void {
  stagedItems = stagedItems.filter((_, i) => i !== index);
  if (currentIndex >= stagedItems.length) {
    currentIndex = Math.max(0, stagedItems.length - 1);
  }
}

export function clearStaging(): void {
  stagedItems = [];
  currentIndex = 0;
}
