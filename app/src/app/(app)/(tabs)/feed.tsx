import { AppScreenContainer } from "@/components/navigation/app-screen-container";
import { getAppHeaderHeight } from "@/components/navigation/app-header";
import { MomentList } from "@/components/moment-list";
import { feedMachine } from "@/machines/feedMachine";
import { RootMachineContext } from "@/machines/rootMachine";
import { getAppTabBarScrollContentBottomPadding } from "@/navigation/app-tab-bar-layout";
import { setFeedTabRepressHandler } from "@/navigation/feed-tab-repress-registry";
import { getAppHeaderOptions } from "@/navigation/app-header-options";
import { ASPECT_RATIO } from "@/utils/constants";
import { useMachine } from "@xstate/react";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo } from "react";
import {
  Button,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { devError } from "@/utils/devLog";

export default function Feed() {
  const router = useRouter();
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const headerHeight = getAppHeaderHeight(insets.top);
  const tabBarScrollBottomPadding = useMemo(
    () => getAppTabBarScrollContentBottomPadding(insets.bottom, theme),
    [insets.bottom, theme],
  );
  const author = RootMachineContext.useSelector(
    (state) => state.context.author,
  );

  const [state, send] = useMachine(feedMachine, {
    input: { authorId: author?.id ?? "" },
  });

  useEffect(() => {
    setFeedTabRepressHandler(() => {
      send({ type: "SCROLL_FEED_TO_TOP" });
    });
    return () => {
      setFeedTabRepressHandler(null);
    };
  }, [send]);

  useFocusEffect(
    useCallback(() => {
      send({ type: "SET_ACTIVE_CONTEXT", isActive: true });

      return () => {
        send({ type: "SET_ACTIVE_CONTEXT", isActive: false });
      };
    }, [send]),
  );

  const onSearchPress = useCallback(() => {
    router.push("/(app)/search");
  }, [router]);

  const { moments, scrollToTopNonce } = state.context;
  const isGettingMoments = state.matches("gettingMoments");
  const isRefreshing = state.matches("refreshingMoments");
  const isLoadingMore = state.matches("loadingMoreMoments");
  const hasError = state.matches("error");

  useEffect(() => {
    if (!__DEV__ || !hasError) return;
    devError("try-again", "─── feed error state triggered ───────────────────");
    devError("try-again", "reason          :", state.context.error ?? "(none)");
    devError("try-again", "author id       :", author?.id ?? "(none)");
    devError("try-again", "graphql URL     :", process.env.EXPO_PUBLIC_API_BASE ?? "(unset)");
    devError("try-again", "USE_ADB_REVERSE :", process.env.EXPO_PUBLIC_USE_ADB_REVERSE ?? "(unset)");
    devError("try-again", "─────────────────────────────────────────────────");
  }, [hasError]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasReachedEnd =
    state.matches("idle") &&
    moments.length > 0 &&
    state.context.nextToken === null;

  const handleRefresh = useCallback(() => {
    send({ type: "REFRESH_FEED" });
  }, [send]);

  const handleLoadMore = useCallback(() => {
    send({ type: "LOAD_MORE" });
  }, [send]);

  const handleSetVisibleMedia = useCallback(
    (momentId: string | null) => {
      send({ type: "SET_MEDIA", momentId });
    },
    [send],
  );

  const handleToggleMuted = useCallback(() => {
    send({ type: "TOGGLE_MUTED" });
  }, [send]);

  const feedHeaderOptions = useMemo(
    () =>
      getAppHeaderOptions({
        title: "Yoinks",
        rightAction: (
          <Pressable
            onPress={onSearchPress}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Search"
            style={styles.headerButton}
          >
            <Ionicons
              name="search-outline"
              size={24}
              color={theme.colors.foundation.foreground.primary}
            />
          </Pressable>
        ),
      }),
    [onSearchPress, theme.colors.foundation.foreground.primary],
  );

  if (hasError) {
    return (
      <>
        <Tabs.Screen options={feedHeaderOptions} />
        <AppScreenContainer>
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>Oops! Something went wrong.</Text>
            <Button title="Try Again" onPress={() => send({ type: "RETRY" })} />
          </View>
        </AppScreenContainer>
      </>
    );
  }

  return (
    <>
      <Tabs.Screen options={feedHeaderOptions} />
      <AppScreenContainer offsetForHeader={false}>
        {isGettingMoments && moments.length === 0 ? (
          <FeedLoadingSkeleton
            headerHeight={headerHeight}
            bottomPadding={tabBarScrollBottomPadding}
          />
        ) : (
          <MomentList
            data={moments}
            isRefreshing={isRefreshing}
            isLoadingMore={isLoadingMore}
            visibleMediaMomentId={state.context.visibleMediaMomentId}
            isFeedScreenActive={state.context.isFeedScreenActive}
            isMuted={state.context.isMuted}
            hasReachedEnd={hasReachedEnd}
            scrollToTopNonce={scrollToTopNonce}
            onRefresh={handleRefresh}
            onLoadMore={handleLoadMore}
            onSetVisibleMedia={handleSetVisibleMedia}
            onToggleMuted={handleToggleMuted}
            contentTopPadding={headerHeight}
            contentBottomPadding={tabBarScrollBottomPadding}
          />
        )}
      </AppScreenContainer>
    </>
  );
}

function FeedLoadingSkeleton({
  headerHeight,
  bottomPadding,
}: {
  headerHeight: number;
  bottomPadding: number;
}) {
  const { width } = useWindowDimensions();

  return (
    <View style={styles.skeletonContainer(headerHeight, bottomPadding)}>
      <View style={styles.skeletonCard(width)}>
        <View style={styles.skeletonHeader}>
          <View style={styles.skeletonAvatar} />
          <View style={styles.skeletonTextGroup}>
            <View style={styles.skeletonLineLarge} />
            <View style={styles.skeletonLineSmall} />
          </View>
        </View>
        <View style={styles.skeletonActions}>
          <View style={styles.skeletonActionPill} />
          <View style={styles.skeletonActionPill} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  headerButton: {
    padding: theme.spacing.xsmall,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.foundation.background.primary,
  },
  errorText: {
    color: theme.colors.common.white,
    marginBottom: 16,
  },
  skeletonContainer: (headerHeight: number, bottomPadding: number) => ({
    paddingTop: headerHeight,
    paddingBottom: bottomPadding,
    flex: 1,
  }),
  skeletonCard: (width: number) => ({
    width,
    height: width * ASPECT_RATIO,
    borderRadius: theme.spacing.xlarge,
    backgroundColor: theme.colors.foundation.background.secondary,
    marginBottom: theme.spacing.xlarge,
    padding: theme.spacing.normal,
    justifyContent: "space-between",
  }),
  skeletonHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xsmall,
  },
  skeletonAvatar: {
    width: theme.spacing.xxxlarge,
    height: theme.spacing.xxxlarge,
    borderRadius: theme.spacing.xxxlarge,
    backgroundColor: theme.colors.foundation.background.alpha30,
  },
  skeletonTextGroup: {
    gap: theme.spacing.xxsmall,
  },
  skeletonLineLarge: {
    width: 112,
    height: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.foundation.background.alpha30,
  },
  skeletonLineSmall: {
    width: 72,
    height: 10,
    borderRadius: 10,
    backgroundColor: theme.colors.foundation.background.alpha30,
  },
  skeletonActions: {
    alignItems: "flex-end",
    gap: theme.spacing.xsmall,
  },
  skeletonActionPill: {
    width: 48,
    height: 40,
    borderRadius: 120,
    backgroundColor: theme.colors.foundation.background.alpha30,
  },
}));
