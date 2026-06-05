import type { Author } from "@/gql/graphql";
import { EmptyState } from "@/components/empty-state/empty-state";
import { EmptyFeedMoment } from "@/components/emptyFeedMoment";
import { AppScreenContainer } from "@/components/navigation/app-screen-container";
import {
  ProfileHeaderContent,
  type ProfileHeaderAuthor,
} from "@/components/profile/profile-header-content";
import { ProfileInviteSection } from "@/components/profile/profile-invite-section";
import { ProfileGridSkeleton } from "@/components/profile/profile-grid-skeleton";
import { ProfileMomentCard } from "@/components/profile/profile-moment-card";
import {
  profileMachine,
  type ProfileMomentItem,
} from "@/machines/profileMachine";
import { useFocusEffect } from "@react-navigation/native";
import { useMachine } from "@xstate/react";
import type { PropsWithChildren } from "react";
import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  useWindowDimensions,
  View,
} from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

export type ProfileScreenSource = "self" | "visitor";

/** Minimum fields to compare viewer vs viewed identity. */
export type ProfileScreenViewerAuthor = Pick<Author, "id">;

export interface ProfileScreenProps extends PropsWithChildren {
  /** Author whose profile is displayed (avatar, name context). */
  viewedAuthor: ProfileHeaderAuthor;
  /** Signed-in viewer; `id` is used with `viewedAuthor.id` to derive ownership. */
  viewerAuthor: ProfileScreenViewerAuthor;
  /** Route/layout hint; does not replace id-based ownership checks. */
  source: ProfileScreenSource;
  /**
   * Visitor stack routes pass this so the navigation header matches route params then API-backed labels.
   */
  onResolvedVisitorHeaderTitle?: (title: string) => void;
  /**
   * Bottom padding for scroll content. Pass `getAppTabBarScrollContentBottomPadding` from the profile tab so the grid clears the floating tab bar.
   * Stack-only usage can omit this; defaults to theme spacing.
   */
  scrollContentBottomPadding?: number;
}

export interface ProfileScreenContextValue {
  viewedAuthor: ProfileHeaderAuthor;
  viewerAuthor: ProfileScreenViewerAuthor;
  source: ProfileScreenSource;
  /** True when the viewer is viewing their own profile, from ids only. */
  isSelfProfile: boolean;
}

const ProfileScreenContext = createContext<ProfileScreenContextValue | null>(
  null,
);

export function useProfileScreenContext(): ProfileScreenContextValue {
  const ctx = React.useContext(ProfileScreenContext);
  if (ctx === null) {
    throw new Error("useProfileScreenContext must be used within ProfileScreen");
  }
  return ctx;
}

function gridKeyExtractor(item: ProfileMomentItem) {
  return item.id;
}

/**
 * Profile grid only: exclude invalid rows and backend "System" placeholder moments.
 * `getAuthorMoments` may still interleave these until the API stops returning them;
 * we filter per-item (never clear the whole list because the first row is System).
 */
export function selectProfileGridMoments(
  moments: ProfileMomentItem[],
): ProfileMomentItem[] {
  return moments.filter(isRenderableProfileGridMoment);
}

function isRenderableProfileGridMoment(moment: ProfileMomentItem): boolean {
  const id = typeof moment.id === "string" ? moment.id.trim() : "";
  if (id === "") {
    return false;
  }
  const author = moment.author;
  const authorId =
    author != null && typeof author.id === "string" ? author.id.trim() : "";
  if (authorId === "") {
    return false;
  }
  const authorName =
    author != null && typeof author.name === "string"
      ? author.name.trim().toLowerCase()
      : "";
  const authorIdLower = authorId.toLowerCase();
  if (authorName === "system" || authorIdLower === "system") {
    return false;
  }
  return true;
}

/**
 * Title for stacked visitor profiles: prefers author name from loaded moments, then route name, then a generic fallback.
 */
function resolveVisitorStackHeaderTitle(
  gridMoments: ProfileMomentItem[],
  viewedAuthorName: string,
): string {
  for (const moment of gridMoments) {
    const author = moment.author;
    const name =
      author != null && typeof author.name === "string"
        ? author.name.trim()
        : "";
    if (name !== "") {
      return name;
    }
  }
  const routeName = viewedAuthorName.trim();
  if (routeName !== "") {
    return routeName;
  }
  return "Author";
}


/**
 * Shell for author profile (tab or visitor): header and layout container.
 * `isSelfProfile` is derived from `viewerAuthor.id === viewedAuthor.id`; `source` does not imply ownership.
 */
export function ProfileScreen({
  viewedAuthor,
  viewerAuthor,
  source,
  onResolvedVisitorHeaderTitle,
  children,
  scrollContentBottomPadding: scrollContentBottomPaddingProp,
}: ProfileScreenProps) {
  const router = useRouter();
  const { theme } = useUnistyles();
  const { width: windowWidth } = useWindowDimensions();
  const isSelfProfile = viewerAuthor.id === viewedAuthor.id;

  const scrollContentBottomPadding =
    scrollContentBottomPaddingProp ?? theme.spacing.xlarge;

  const [state, send] = useMachine(profileMachine, {
    input: { authorId: viewedAuthor.id },
  });

  const hasCompletedInitialFocusRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!hasCompletedInitialFocusRef.current) {
        hasCompletedInitialFocusRef.current = true;
        return;
      }
      send({ type: "REFRESH" });
    }, [send]),
  );

  const { moments } = state.context;

  const gridMoments = useMemo(
    () => selectProfileGridMoments(moments),
    [moments],
  );

  useEffect(() => {
    if (onResolvedVisitorHeaderTitle == null) {
      return;
    }
    onResolvedVisitorHeaderTitle(
      resolveVisitorStackHeaderTitle(gridMoments, viewedAuthor.name),
    );
  }, [
    gridMoments,
    viewedAuthor.name,
    onResolvedVisitorHeaderTitle,
  ]);

  const contextValue = useMemo<ProfileScreenContextValue>(
    () => ({
      viewedAuthor,
      viewerAuthor,
      source,
      isSelfProfile,
    }),
    [viewedAuthor, viewerAuthor, source, isSelfProfile],
  );

  const isRefreshing = state.matches("refreshingMoments");
  const isLoadingMoreMoments = state.matches("loadingMoreMoments");
  const isGettingInitialMoments = state.matches("gettingMoments");
  const showGridSkeleton =
    isGettingInitialMoments && gridMoments.length === 0;

  const handleRefresh = useCallback(() => {
    send({ type: "REFRESH" });
  }, [send]);

  const handleEndReached = useCallback(() => {
    send({ type: "LOAD_MORE" });
  }, [send]);

  const handleGridMomentPress = useCallback(
    (moment: ProfileMomentItem) => {
      router.push({
        pathname: "/(app)/single-moment",
        params: { momentId: moment.id },
      });
    },
    [router],
  );

  const paddingHorizontal = theme.spacing.normal;
  const interGap = theme.spacing.small;
  const innerWidth = windowWidth - paddingHorizontal * 2;
  const cellWidth = (innerWidth - interGap * 3) / 4;

  const listHeader = useMemo(
    () => (
      <View style={styles.headerSection}>
        <ProfileHeaderContent author={viewedAuthor} />
        {isSelfProfile && <ProfileInviteSection />}
      </View>
    ),
    [viewedAuthor, isSelfProfile],
  );

  const renderMoment = useCallback(
    ({ item, index }: { item: ProfileMomentItem; index: number }) => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open author's moments list, item ${index + 1} of ${gridMoments.length}`}
        onPress={() => {
          handleGridMomentPress(item);
        }}
        style={({ pressed }) => (pressed ? styles.gridCellPressed : undefined)}
      >
        <ProfileMomentCard
          moment={item}
          viewerAuthorId={viewerAuthor.id}
          width={cellWidth}
          accessible={false}
        />
      </Pressable>
    ),
    [
      cellWidth,
      gridMoments.length,
      handleGridMomentPress,
      viewerAuthor.id,
    ],
  );

  const listEmpty = useMemo(() => {
    if (showGridSkeleton) {
      return (
        <ProfileGridSkeleton cellWidth={cellWidth} interGap={interGap} />
      );
    }
    if (gridMoments.length === 0) {
      return isSelfProfile ? <EmptyFeedMoment /> : <EmptyState />;
    }
    return null;
  }, [
    showGridSkeleton,
    cellWidth,
    interGap,
    gridMoments.length,
    isSelfProfile,
  ]);

  const listFooter = useMemo(() => {
    if (!isLoadingMoreMoments && children == null) {
      return null;
    }
    return (
      <View>
        {isLoadingMoreMoments ? (
          <View style={styles.footerBlock}>
            <ActivityIndicator size="small" color={theme.colors.foundation.foreground.primary} />
          </View>
        ) : null}
        {children != null ? <View>{children}</View> : null}
      </View>
    );
  }, [children, isLoadingMoreMoments]);

  const columnWrapperStyle = useMemo(
    () =>
      ({
        gap: interGap,
        marginBottom: interGap,
      }) as const,
    [interGap],
  );

  return (
    <ProfileScreenContext.Provider value={contextValue}>
      <AppScreenContainer>
        <FlatList<ProfileMomentItem>
          style={styles.list}
          data={gridMoments}
          keyExtractor={gridKeyExtractor}
          numColumns={4}
          columnWrapperStyle={columnWrapperStyle}
          renderItem={renderMoment}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          ListFooterComponent={listFooter}
          contentContainerStyle={
            styles.listContent(scrollContentBottomPadding)
          }
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.foundation.foreground.primary}
            />
          }
        />
      </AppScreenContainer>
    </ProfileScreenContext.Provider>
  );
}

const styles = StyleSheet.create((theme) => ({
  list: {
    flex: 1,
  },
  listContent: (paddingBottom: number) => ({
    flexGrow: 1,
    paddingHorizontal: theme.spacing.normal,
    paddingBottom,
  }),
  headerSection: {
    alignItems: "center",
    paddingVertical: theme.spacing.large,
  },
  footerBlock: {
    paddingVertical: theme.spacing.large,
    alignItems: "center",
  },
  gridCellPressed: {
    opacity: 0.85,
  },
}));
