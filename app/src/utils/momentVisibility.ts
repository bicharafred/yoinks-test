import { addHours, fromUnixTime, isBefore } from "date-fns";

/**
 * 24h visibility & blur (product rule):
 * - A moment is free to view for 24 hours after `createdAt` (Unix seconds).
 * - If the viewer opened the moment in that window (`hasViewerSeen`), it stays
 *   visible; otherwise it becomes paywalled after the window.
 * - The author always sees their own content unblurred.
 * - Paid unblur is always exactly 1 Yoink (see `UNBLUR_PRICE_YOINKS`).
 *
 * Blur field invariant:
 * - Server-backed items (`isLocal === false`): trust API `isBlurred`. The server
 *   is authoritative for unlock, moderation, and sync with the 24h rule.
 * - Local / pending items (`isLocal === true`, e.g. optimistic cache): do not
 *   rely on `isBlurred`; derive display blur from `createdAt`, `hasViewerSeen`,
 *   and author identity so UI stays consistent before the server response lands.
 */
export const UNBLUR_PRICE_YOINKS = 1 as const;

const FREE_WINDOW_HOURS = 24 as const;

export type FeedMomentVisibilityInput = {
  /** Unix seconds since epoch */
  createdAt: number;
  hasViewerSeen?: boolean | null;
  isBlurred?: boolean | null;
  isLocal: boolean;
  viewerAuthorId: string | undefined;
  momentAuthorId: string;
  /** Defaults to `new Date()`; inject for tests */
  now?: Date;
};

export type FeedMomentVisibility = {
  displayIsBlurred: boolean;
  isMomentAuthor: boolean;
  /** True while `now` is strictly before `createdAt + 24h` */
  isWithinFreeWindow: boolean;
  unblurPriceYoinks: typeof UNBLUR_PRICE_YOINKS;
  /** Blur for non-author from the 24h + seen rule only (ignores API) */
  isBlurDerivedFrom24HourRule: boolean;
};

function isViewerWithinFreeWindow(createdAt: number, now: Date): boolean {
  const created = fromUnixTime(createdAt);
  const freeUntil = addHours(created, FREE_WINDOW_HOURS);
  return isBefore(now, freeUntil);
}

/**
 * For a non-author, whether the 24h rule says content should be blurred
 * (no window and not yet seen in-window).
 */
export function isViewerBlurredBy24HourRule(
  createdAt: number,
  hasViewerSeen: boolean | null | undefined,
  now: Date = new Date(),
): boolean {
  if (hasViewerSeen === true) {
    return false;
  }
  return !isViewerWithinFreeWindow(createdAt, now);
}

export function getFeedMomentVisibility(
  input: FeedMomentVisibilityInput,
): FeedMomentVisibility {
  const now = input.now ?? new Date();
  const isMomentAuthor =
    input.viewerAuthorId !== undefined &&
    input.viewerAuthorId === input.momentAuthorId;

  const isWithinFreeWindow = isViewerWithinFreeWindow(
    input.createdAt,
    now,
  );

  if (isMomentAuthor) {
    return {
      displayIsBlurred: false,
      isMomentAuthor: true,
      isWithinFreeWindow,
      unblurPriceYoinks: UNBLUR_PRICE_YOINKS,
      isBlurDerivedFrom24HourRule: false,
    };
  }

  const isBlurDerivedFrom24HourRule = isViewerBlurredBy24HourRule(
    input.createdAt,
    input.hasViewerSeen,
    now,
  );

  if (input.isLocal) {
    return {
      displayIsBlurred: isBlurDerivedFrom24HourRule,
      isMomentAuthor: false,
      isWithinFreeWindow,
      unblurPriceYoinks: UNBLUR_PRICE_YOINKS,
      isBlurDerivedFrom24HourRule,
    };
  }

  return {
    displayIsBlurred: Boolean(input.isBlurred),
    isMomentAuthor: false,
    isWithinFreeWindow,
    unblurPriceYoinks: UNBLUR_PRICE_YOINKS,
    isBlurDerivedFrom24HourRule,
  };
}
