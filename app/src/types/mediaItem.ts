import type { MomentType } from "@/gql/graphql";
import type { CropTransform } from "@/types/cropTransform";

/** A single resolved media item within a multi-media Moment (server/display side). */
export type MediaItem = {
  id: string;
  mediaUrl: string;
  mediaType: MomentType;
  thumbnailUrl?: string | null;
  cropTransform?: CropTransform | null;
};

/** A staged media item during the creation flow (local file URIs, pre-upload). */
export type StagedItem = {
  id: string;
  localUri: string;
  mediaType: MomentType;
  source: "camera" | "library";
  cropTransform: CropTransform | null;
};
