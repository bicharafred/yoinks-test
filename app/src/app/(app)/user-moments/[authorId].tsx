import { AppScreenContainer } from "@/components/navigation/app-screen-container";
import { AppHeaderBackButton } from "@/components/navigation/app-header-back-button";
import { MomentList } from "@/components/moment-list";
import { selectProfileGridMoments } from "@/components/profile/profile-screen";
import type { Author } from "@/gql/graphql";
import { profileMachine } from "@/machines/profileMachine";
import { RootMachineContext } from "@/machines/rootMachine";
import {
  parseAuthorProfileLocalParams,
  parseUserMomentsInitialIndex,
} from "@/navigation/author-profile-route-params";
import { getAppHeaderOptions } from "@/navigation/app-header-options";
import { useFocusEffect } from "@react-navigation/native";
import { useMachine } from "@xstate/react";
import { useLocalSearchParams, useNavigation } from "expo-router";
import React, { useCallback, useLayoutEffect, useMemo } from "react";
import { ActivityIndicator, Button, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

function resolveViewerProfileAuthor(
  author: Author | null,
): Pick<Author, "id"> | null {
  if (author == null) {
    return null;
  }
  const id = typeof author.id === "string" ? author.id.trim() : "";
  if (id === "") {
    return null;
  }
  return { id };
}

function userMomentsHeaderTitle(
  parsed: NonNullable<ReturnType<typeof parseAuthorProfileLocalParams>>,
): string {
  const n =
    typeof parsed.authorName === "string" ? parsed.authorName.trim() : "";
  return n !== "" ? n : "Moments";
}

type UserMomentsBodyProps = {
  authorId: string;
  /**
   * Index from the profile grid (`getUserMomentsPush`). Matches `selectProfileGridMoments`
   * order.
   */
  initialIndex: number | null;
};

function UserMomentsBody({ authorId, initialIndex }: UserMomentsBodyProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();

  const [state, send] = useMachine(profileMachine, {
    input: { authorId },
  });

  useFocusEffect(
    useCallback(() => {
      send({ type: "SET_ACTIVE_CONTEXT", payload: { active: true } });
      return () => {
        send({ type: "SET_ACTIVE_CONTEXT", payload: { active: false } });
      };
    }, [send]),
  );

  const listMoments = useMemo(
    () => selectProfileGridMoments(state.context.moments),
    [state.context.moments],
  );

  const isRefreshing = state.matches("refreshingMoments");
  const isLoadingMore = state.matches("loadingMoreMoments");
  const isGettingInitial = state.matches("gettingMoments");
  const hasReachedEnd =
    state.matches("idle") &&
    listMoments.length > 0 &&
    state.context.nextToken === null;

  const handleRefresh = useCallback(() => {
    send({ type: "REFRESH" });
  }, [send]);

  const handleBeforeListRefresh = useCallback(
    (payload: { reason: "hide" | "block" | "delete"; momentId: string }) => {
      if (payload.reason === "block") {
        send({ type: "CLEAR_AUTHOR_MOMENTS" });
        return;
      }
      send({
        type: "REMOVE_MOMENT_FROM_LIST",
        payload: { momentId: payload.momentId },
      });
    },
    [send],
  );

  const handleLoadMore = useCallback(() => {
    send({ type: "LOAD_MORE" });
  }, [send]);

  const handleSetVisibleMedia = useCallback(
    (momentId: string | null) => {
      send({ type: "SET_MEDIA", payload: { momentId } });
    },
    [send],
  );

  const handleToggleMuted = useCallback(() => {
    send({ type: "TOGGLE_MUTED" });
  }, [send]);

  const contentBottomPadding = useMemo(
    () => insets.bottom + theme.spacing.large,
    [insets.bottom, theme.spacing.large],
  );

  if (state.matches("error")) {
    return (
      <View style={styles.errorBox}>
        <Text style={styles.errorTitle}>Could not load moments</Text>
        <Text style={styles.errorMessage}>
          {state.context.error ?? "Something went wrong."}
        </Text>
        <Button title="Try again" onPress={() => send({ type: "RETRY" })} />
      </View>
    );
  }

  if (isGettingInitial && listMoments.length === 0) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color={theme.colors.foundation.foreground.primary} />
      </View>
    );
  }

  return (
    <MomentList
      data={listMoments}
      isRefreshing={isRefreshing}
      isLoadingMore={isLoadingMore}
      visibleMediaMomentId={state.context.visibleMediaMomentId}
      isFeedScreenActive={state.context.isScreenActive}
      isMuted={state.context.isMuted}
      hasReachedEnd={hasReachedEnd}
      scrollToTopNonce={0}
      onRefresh={handleRefresh}
      onBeforeListRefresh={handleBeforeListRefresh}
      onLoadMore={handleLoadMore}
      onSetVisibleMedia={handleSetVisibleMedia}
      onToggleMuted={handleToggleMuted}
      contentTopPadding={0}
      contentBottomPadding={contentBottomPadding}
      initialScrollIndex={initialIndex}
    />
  );
}

export default function UserMomentsScreen() {
  const navigation = useNavigation();
  const rawParams = useLocalSearchParams();

  const parsed = useMemo(
    () =>
      parseAuthorProfileLocalParams(
        rawParams as Record<string, string | string[] | undefined>,
      ),
    [rawParams],
  );

  const initialIndex = useMemo(
    () =>
      parseUserMomentsInitialIndex(
        rawParams as Record<string, string | string[] | undefined>,
      ),
    [rawParams],
  );

  const rawViewerAuthor = RootMachineContext.useSelector(
    (state) => state.context.author as Author | null,
  );

  const viewerAuthor = useMemo(
    () => resolveViewerProfileAuthor(rawViewerAuthor),
    [rawViewerAuthor],
  );

  useLayoutEffect(() => {
    if (parsed == null) {
      navigation.setOptions({
        ...getAppHeaderOptions({
          title: "Moments unavailable",
          leftAction: <AppHeaderBackButton />,
          leftAccessibilityLabel: "Go back",
        }),
      });
      return;
    }
    navigation.setOptions({
      ...getAppHeaderOptions({
        title: userMomentsHeaderTitle(parsed),
        leftAction: <AppHeaderBackButton />,
        leftAccessibilityLabel: "Go back",
      }),
    });
  }, [navigation, parsed]);

  if (parsed == null) {
    return (
      <AppScreenContainer>
        <View style={styles.fallbackContent}>
          <Text style={styles.fallbackTitle}>Moments unavailable</Text>
          <Text style={styles.fallbackMessage}>
            This link is missing a valid author id.
          </Text>
        </View>
      </AppScreenContainer>
    );
  }

  if (viewerAuthor == null) {
    return (
      <AppScreenContainer>
        <View style={styles.fallbackContent}>
          <Text style={styles.fallbackTitle}>Moments</Text>
          <Text style={styles.fallbackMessage}>
            Signed-in account data is unavailable. Try signing in again.
          </Text>
        </View>
      </AppScreenContainer>
    );
  }

  return (
    <AppScreenContainer>
      <UserMomentsBody authorId={parsed.authorId} initialIndex={initialIndex} />
    </AppScreenContainer>
  );
}

const styles = StyleSheet.create((theme) => ({
  fallbackContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.large,
  },
  fallbackTitle: {
    color: theme.colors.foundation.foreground.primary,
    fontSize: 18,
    fontWeight: "600",
    marginBottom: theme.spacing.small,
  },
  fallbackMessage: {
    textAlign: "center",
    color: theme.colors.foundation.foreground.secondary,
    fontSize: 14,
    fontWeight: "500",
  },
  loadingBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.large,
    gap: theme.spacing.small,
  },
  errorTitle: {
    color: theme.colors.foundation.foreground.primary,
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  errorMessage: {
    color: theme.colors.foundation.foreground.secondary,
    fontSize: 14,
    textAlign: "center",
    marginBottom: theme.spacing.normal,
  },
}));
