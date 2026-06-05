import {
  GetFeedMomentsDocument,
  type GetFeedMomentsQuery,
  type Moment,
  type MomentType,
  type Author,
} from "@/gql/graphql";
import { client } from "@/services/client";
import { registerMediaItems } from "@/services/mediaItemRegistry";
import type { CropTransform } from "@/types/cropTransform";
import type { StagedItem, MediaItem } from "@/types/mediaItem";

/**
 * Writes a synthetic Moment entry at the top of the Apollo cache for the
 * GetFeedMoments query so the user sees their new moment immediately while
 * processing + upload happen in the background.
 *
 * The moment uses the local `file://` URI as `mediaUrl` so the feed card
 * can display the preview from disk. Once the real upload completes and
 * the backend responds, a feed refresh will replace this entry with the
 * real server data.
 */
export function writeOptimisticMomentToFeed(params: {
  momentId: string;
  authorId: string;
  author: Pick<Author, "id" | "name" | "avatar">;
  localMediaUri: string;
  mediaType: MomentType;
  isLocal: boolean;
  // Caption the user typed on the share screen. Passed through so the feed
  // card shows the description immediately, before the upload completes.
  description?: string | null;
  cropTransform?: CropTransform | null;
  // For multi-media Moments: all staged items. When present, mediaItemRegistry
  // is populated with optimistic MediaItems using local file URIs so the carousel
  // renders immediately while uploading happens in the background.
  mediaItems?: StagedItem[] | null;
}): void {
  const { momentId, authorId, author, localMediaUri, mediaType, isLocal, description, cropTransform, mediaItems } =
    params;

  // Populate the registry for multi-media Moments.
  if (mediaItems && mediaItems.length > 1) {
    const optimisticMediaItems: MediaItem[] = mediaItems.map((item) => ({
      id: item.id,
      mediaUrl: item.localUri,
      mediaType: item.mediaType,
      thumbnailUrl: null,
      cropTransform: item.cropTransform,
    }));
    registerMediaItems(momentId, optimisticMediaItems);
  }

  const optimisticMoment: Moment = {
    __typename: "Moment",
    id: momentId,
    applauseCount: 0,
    viewerApplauseCount: 0,
    createdAt: Math.floor(Date.now() / 1000),
    updatedAt: null,
    isLocal: isLocal,
    isBlurred: false,
    isLocked: false,
    hasAdultContent: false,
    sequence: null,
    type: mediaType,
    videoThumbnailUrl: null,
    mediaUrl: localMediaUri,
    hasViewerSeen: true,
    // Use the caption the user just typed so it appears instantly on the feed
    // card. The server value (identical) replaces this on the next refresh.
    description: description ?? null,
    cropTransform: cropTransform ?? null,
    // New posts start with zero comments; the icon shows 0 until the sheet is opened.
    commentCount: 0,
    // Null so Apollo's cache write is explicit. MomentMedia falls back to the
    // registry (populated above) for multi-media optimistic moments.
    mediaItems: null,
    author: {
      __typename: "Author",
      id: author.id,
      name: author.name,
      avatar: author.avatar ?? null,
    },
  };

  try {
    const existing = client.cache.readQuery<GetFeedMomentsQuery>({
      query: GetFeedMomentsDocument,
      variables: { authorId },
    });

    const existingItems = existing?.getFeedMoments?.items ?? [];

    client.cache.writeQuery<GetFeedMomentsQuery>({
      query: GetFeedMomentsDocument,
      variables: { authorId },
      data: {
        __typename: "Query",
        getFeedMoments: {
          __typename: "GetFeedMomentResult",
          items: [optimisticMoment, ...existingItems],
          nextToken: existing?.getFeedMoments?.nextToken ?? null,
          resultCount: (existing?.getFeedMoments?.resultCount ?? 0) + 1,
        },
      },
    });
  } catch (error) {
    if (__DEV__) {
      console.warn("[momentOptimisticFeed] Cache write failed:", error);
    }
  }
}
