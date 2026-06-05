import { AppScreenContainer } from "@/components/navigation/app-screen-container";
import { AppHeaderBackButton } from "@/components/navigation/app-header-back-button";
import type { ProfileHeaderAuthor } from "@/components/profile/profile-header-content";
import { ProfileScreen } from "@/components/profile/profile-screen";
import type { Author } from "@/gql/graphql";
import { RootMachineContext } from "@/machines/rootMachine";
import { parseAuthorProfileLocalParams } from "@/navigation/author-profile-route-params";
import { getAppHeaderOptions } from "@/navigation/app-header-options";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

function buildViewedAuthorFromParams(
  parsed: NonNullable<ReturnType<typeof parseAuthorProfileLocalParams>>,
): ProfileHeaderAuthor {
  return {
    id: parsed.authorId,
    name: parsed.authorName ?? "",
    avatar: parsed.authorAvatar,
  };
}

function getVisitorStackFallbackTitleFromRoute(
  parsed: NonNullable<ReturnType<typeof parseAuthorProfileLocalParams>>,
): string {
  const n =
    typeof parsed.authorName === "string" ? parsed.authorName.trim() : "";
  return n !== "" ? n : "Author";
}

function resolveViewerProfileAuthor(author: Author | null): Pick<Author, "id"> | null {
  if (author == null) {
    return null;
  }
  const id = typeof author.id === "string" ? author.id.trim() : "";
  if (id === "") {
    return null;
  }
  return { id };
}

export default function VisitorProfileScreen() {
  const router = useRouter();
  const navigation = useNavigation();

  const rawParams = useLocalSearchParams();

  const parsed = useMemo(
    () =>
      parseAuthorProfileLocalParams(
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

  const normalizedRouteAuthorId = useMemo(() => {
    if (parsed == null) {
      return "";
    }
    return parsed.authorId.trim();
  }, [parsed]);

  const shouldRedirectToSelfTab =
    parsed != null &&
    viewerAuthor != null &&
    normalizedRouteAuthorId !== "" &&
    normalizedRouteAuthorId === viewerAuthor.id;

  const [resolvedVisitorHeaderTitle, setResolvedVisitorHeaderTitle] = useState<
    string | null
  >(null);

  useEffect(() => {
    setResolvedVisitorHeaderTitle(null);
  }, [parsed?.authorId]);

  const handleResolvedVisitorHeaderTitle = useCallback((title: string) => {
    setResolvedVisitorHeaderTitle(title);
  }, []);

  useLayoutEffect(() => {
    if (!shouldRedirectToSelfTab) {
      return;
    }
    router.replace("/(app)/(tabs)/profile");
  }, [router, shouldRedirectToSelfTab]);

  useLayoutEffect(() => {
    if (parsed == null) {
      navigation.setOptions({
        ...getAppHeaderOptions({
          title: "Profile unavailable",
          leftAction: <AppHeaderBackButton />,
          leftAccessibilityLabel: "Go back",
        }),
      });
      return;
    }
    if (viewerAuthor == null) {
      navigation.setOptions({
        ...getAppHeaderOptions({
          title: "Profile",
          leftAction: <AppHeaderBackButton />,
          leftAccessibilityLabel: "Go back",
        }),
      });
      return;
    }
    if (shouldRedirectToSelfTab) {
      navigation.setOptions({
        ...getAppHeaderOptions({
          title: getVisitorStackFallbackTitleFromRoute(parsed),
          leftAction: <AppHeaderBackButton />,
          leftAccessibilityLabel: "Go back",
        }),
      });
      return;
    }
    navigation.setOptions({
      ...getAppHeaderOptions({
        title:
          resolvedVisitorHeaderTitle ??
          getVisitorStackFallbackTitleFromRoute(parsed),
        leftAction: <AppHeaderBackButton />,
        leftAccessibilityLabel: "Go back",
      }),
    });
  }, [
    navigation,
    parsed,
    viewerAuthor,
    shouldRedirectToSelfTab,
    resolvedVisitorHeaderTitle,
  ]);

  if (parsed == null) {
    return (
      <AppScreenContainer>
        <View style={styles.fallbackContent}>
          <Text style={styles.fallbackTitle}>Profile unavailable</Text>
          <Text style={styles.fallbackMessage}>
            This profile link is missing a valid author id.
          </Text>
        </View>
      </AppScreenContainer>
    );
  }

  if (viewerAuthor == null) {
    return (
      <AppScreenContainer>
        <View style={styles.fallbackContent}>
          <Text style={styles.fallbackTitle}>Profile</Text>
          <Text style={styles.fallbackMessage}>
            Signed-in account data is unavailable. Try signing in again.
          </Text>
        </View>
      </AppScreenContainer>
    );
  }

  if (shouldRedirectToSelfTab) {
    return (
      <AppScreenContainer>
        <View style={styles.fallbackContent}>
          <Text style={styles.fallbackMessage}>Opening your profile...</Text>
        </View>
      </AppScreenContainer>
    );
  }

  const viewedAuthor = buildViewedAuthorFromParams(parsed);

  return (
    <ProfileScreen
      source="visitor"
      viewedAuthor={viewedAuthor}
      viewerAuthor={viewerAuthor}
      onResolvedVisitorHeaderTitle={handleResolvedVisitorHeaderTitle}
    />
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
}));
