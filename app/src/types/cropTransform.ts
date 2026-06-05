/**
 * Describes how a media file should be displayed after the user repositioned
 * and zoomed it on the crop screen. The original file is never modified —
 * this metadata is applied at render time only.
 *
 * Stored with the upload job and on the optimistic feed entry so the crop
 * is visible immediately after posting, before the real server data arrives.
 */
export type CropTransform = {
  scale: number;
  translateX: number;
  translateY: number;
  cropAspectRatio: number;
  mediaWidth?: number;
  mediaHeight?: number;
};
