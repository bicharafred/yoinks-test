import { Moment, type MomentBeforeListRefreshPayload } from "@/components/moment";
import { Moment as MomentType } from "@/gql/graphql";
import { ASPECT_RATIO } from "@/utils/constants";
import { FlashList } from "@shopify/flash-list";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ElementRef,
} from "react";
import {
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
  View,
} from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { EmptyFeedMoment } from "./emptyFeedMoment";
import { CaughtUpCard } from "./caught-up-card";
import { enqueue } from "@/services/interactionQueue";
import { buildCreateInteractionInput } from "@/utils/createInteractionPayload";
import { RootMachineContext } from "@/machines/rootMachine";
import { getFeedMomentVisibility } from "@/utils/momentVisibility";
import { client } from "@/services/client";

interface MomentListProps {
  data: MomentType[];
  isRefreshing: boolean;
  isLoadingMore: boolean;
  visibleMediaMomentId: string | null;
  isFeedScreenActive: boolean;
  isMuted: boolean;
  hasReachedEnd: boolean;
  /** Bumped by the feed machine when the Feed tab is re-pressed while focused. */
  scrollToTopNonce: number;
  onRefresh: () => void;
  onLoadMore: () => void;
  onSetVisibleMedia: (momentId: string | null) => void;
  onToggleMuted: () => void;
  contentTopPadding?: number;
  /** Clearance above the floating tab bar (use `getAppTabBarScrollContentBottomPadding` on feed tabs). */
  contentBottomPadding: number;
  /**
   * When set, FlashList opens scrolled to this data index (clamped when out of range).
   * Omit or pass `null` for feed/default top-of-list behavior; updates after mount are ignored by the native list (same as FlatList).
   */
  initialScrollIndex?: number | null;
  /**
   * Optional hook for profile/author lists: run before `onRefresh` after hide/block/delete
   * so local list state (e.g. profile machine) can update immediately.
   */
  onBeforeListRefresh?: (payload: MomentBeforeListRefreshPayload) => void;
}

export const MomentList = ({
  data,
  isRefreshing,
  isLoadingMore,
  visibleMediaMomentId,
  isFeedScreenActive,
  isMuted,
  hasReachedEnd,
  scrollToTopNonce,
  onRefresh,
  onLoadMore,
  onSetVisibleMedia,
  onToggleMuted,
  contentTopPadding = 0,
  contentBottomPadding,
  initialScrollIndex,
  onBeforeListRefresh,
}: MomentListProps) => {
  const { width, height: windowHeight } = useWindowDimensions();
  const { theme } = useUnistyles();
  const viewer = RootMachineContext.useSelector(
    (state) => state.context.author,
  );
  const listRef = useRef<ElementRef<typeof FlashList<MomentType>>>(null);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 90,
  }).current;

  const onViewableItemsChanged = useCallback(
    ({
      viewableItems,
    }: {
      viewableItems: {
        item: MomentType;
        isViewable: boolean;
        index: number | null;
      }[];
    }) => {
      const visible = viewableItems
        .filter(
          (t) =>
            t.isViewable && t.index !== null && t.index !== undefined,
        )
        .sort(
          (a, b) => (a.index as number) - (b.index as number),
        );
      const firstVisibleMoment = visible[0]?.item;
      const id = firstVisibleMoment?.id ?? null;
      onSetVisibleMedia(id);

      // Handle mark-as-seen logic
      if (firstVisibleMoment && viewer) {
        const { displayIsBlurred } = getFeedMomentVisibility({
          createdAt: firstVisibleMoment.createdAt,
          hasViewerSeen: firstVisibleMoment.hasViewerSeen,
          isBlurred: firstVisibleMoment.isBlurred,
          isLocal: firstVisibleMoment.isLocal,
          viewerAuthorId: viewer.id,
          momentAuthorId: firstVisibleMoment.author.id,
        });

        const isMomentAuthor = viewer.id === firstVisibleMoment.author.id;

        if (!displayIsBlurred && !isMomentAuthor && !firstVisibleMoment.hasViewerSeen) {
          // 1. Update Apollo Cache immediately
          client.cache.modify({
            id: client.cache.identify(firstVisibleMoment),
            fields: {
              hasViewerSeen() {
                return true;
              },
            },
          });

          // 2. Enqueue zero-applause interaction
          const interactionInput = buildCreateInteractionInput({
            moment: {
              ...firstVisibleMoment,
              sequence: firstVisibleMoment.sequence ?? 0,
            },
            viewer,
            applauseCount: 0,
            previousApplauseCount: firstVisibleMoment.viewerApplauseCount || 0,
            interactionCreatedAtUnixSeconds: Math.floor(Date.now() / 1000),
          });
          
          enqueue(interactionInput);
        }
      }
    },
    [onSetVisibleMedia, viewer],
  );

  useEffect(() => {
    if (data.length === 0) {
      onSetVisibleMedia(null);
    }
  }, [data.length, onSetVisibleMedia]);

  useEffect(() => {
    if (scrollToTopNonce === 0) {
      return;
    }
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [scrollToTopNonce]);

  const drawDistance = useMemo(
    () => Math.max(250, Math.ceil(windowHeight * 0.5)),
    [windowHeight],
  );

  const resolvedInitialScrollIndex = useMemo((): number | undefined => {
    if (initialScrollIndex === undefined || initialScrollIndex === null) {
      return undefined;
    }
    const raw = Number(initialScrollIndex);
    if (!Number.isFinite(raw)) {
      return undefined;
    }
    const idx = Math.floor(raw);
    if (idx < 0 || data.length === 0) {
      return undefined;
    }
    return Math.min(idx, data.length - 1);
  }, [initialScrollIndex, data.length]);

  const renderFooter = useCallback(() => {
    if (isLoadingMore) {
      return (
        <View style={styles.footer}>
          <ActivityIndicator size="small" color={theme.colors.foundation.foreground.primary} />
        </View>
      );
    }

    if (hasReachedEnd) {
      return <CaughtUpCard />;
    }

    return null;
  }, [hasReachedEnd, isLoadingMore]);

  return (
    <FlashList
      ref={listRef}
      data={data}
      keyExtractor={keyExtractor}
      getItemType={() => "moment"}
      {...(resolvedInitialScrollIndex !== undefined
        ? { initialScrollIndex: resolvedInitialScrollIndex }
        : {})}
      drawDistance={drawDistance}
      renderItem={({ item }) => (
        <View style={styles.momentRow(width)}>
          <Moment
            moment={item}
            isVisibleMedia={visibleMediaMomentId === item.id}
            isFeedScreenActive={isFeedScreenActive}
            isMuted={isMuted}
            onToggleMuted={onToggleMuted}
            onRefresh={onRefresh}
            onBeforeListRefresh={onBeforeListRefresh}
          />
        </View>
      )}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={<EmptyFeedMoment />}
      ListFooterComponent={renderFooter}
      contentContainerStyle={styles.contentContainer(
        contentTopPadding,
        contentBottomPadding,
      )}
      viewabilityConfig={viewabilityConfig}
      onViewableItemsChanged={onViewableItemsChanged}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.foundation.foreground.primary}
        />
      }
    />
  );
};

function keyExtractor(item: MomentType) {
  return item.id;
}

const styles = StyleSheet.create((theme) => ({
  contentContainer: (paddingTop: number, paddingBottom: number) => ({
    paddingTop,
    paddingBottom,
  }),
  footer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  momentRow: (width: number) => ({
    width,
  }),
}));
