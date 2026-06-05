import { AppScreenContainer } from "@/components/navigation/app-screen-container";
import { AppHeaderBackButton } from "@/components/navigation/app-header-back-button";
import { parseProfileImageLocalParams } from "@/navigation/profile-image-route-params";
import { getAppHeaderOptions } from "@/navigation/app-header-options";
import { Image as ExpoImage } from "expo-image";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image as RNImage,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { StyleSheet } from "react-native-unistyles";

const FALLBACK_HEADER_TITLE = "Profile photo";

function normalizeParsedParams(
  parsed: NonNullable<ReturnType<typeof parseProfileImageLocalParams>>,
): { authorAvatar: string; authorName?: string } | null {
  const url = parsed.authorAvatar.trim();
  if (url.length === 0) {
    return null;
  }
  return {
    authorAvatar: url,
    ...(parsed.authorName !== undefined ? { authorName: parsed.authorName } : {}),
  };
}

function getHeaderTitle(params: {
  authorName?: string;
}): string {
  const n =
    typeof params.authorName === "string" ? params.authorName.trim() : "";
  return n.length > 0 ? n : FALLBACK_HEADER_TITLE;
}

type SizeState =
  | { status: "loading" }
  | { status: "ready"; width: number; height: number }
  | { status: "error" };

export default function ProfileImageScreen() {
  const navigation = useNavigation();
  const rawParams = useLocalSearchParams();
  const { width: windowWidth } = useWindowDimensions();

  const parsed = useMemo(() => {
    const raw = parseProfileImageLocalParams(
      rawParams as Record<string, string | string[] | undefined>,
    );
    if (raw == null) {
      return null;
    }
    return normalizeParsedParams(raw);
  }, [rawParams]);
  const imageUri = parsed?.authorAvatar ?? null;

  useLayoutEffect(() => {
    if (parsed == null) {
      navigation.setOptions({
        ...getAppHeaderOptions({
          title: "Unavailable",
          leftAction: <AppHeaderBackButton />,
          leftAccessibilityLabel: "Go back",
        }),
      });
      return;
    }
    navigation.setOptions({
      ...getAppHeaderOptions({
        title: getHeaderTitle(parsed),
        leftAction: <AppHeaderBackButton />,
        leftAccessibilityLabel: "Go back",
      }),
    });
  }, [navigation, parsed]);

  const [sizeState, setSizeState] = useState<SizeState>({ status: "loading" });

  useEffect(() => {
    if (imageUri == null) {
      return;
    }
    setSizeState({ status: "loading" });
    let cancelled = false;

    RNImage.getSize(
      imageUri,
      (w, h) => {
        if (cancelled) {
          return;
        }
        if (
          w <= 0 ||
          h <= 0 ||
          !Number.isFinite(w) ||
          !Number.isFinite(h)
        ) {
          setSizeState({ status: "error" });
          return;
        }
        setSizeState({ status: "ready", width: w, height: h });
      },
      () => {
        if (!cancelled) {
          setSizeState({ status: "error" });
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [imageUri]);

  if (parsed == null) {
    return (
      <AppScreenContainer>
        <View style={styles.fallbackContent}>
          <Text style={styles.fallbackTitle}>Image unavailable</Text>
          <Text style={styles.fallbackMessage}>
            This link is missing a valid profile image URL.
          </Text>
        </View>
      </AppScreenContainer>
    );
  }

  if (sizeState.status === "loading") {
    return (
      <AppScreenContainer>
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      </AppScreenContainer>
    );
  }

  if (sizeState.status === "error") {
    return (
      <AppScreenContainer>
        <View style={styles.fallbackContent}>
          <Text style={styles.fallbackTitle}>Could not load image</Text>
          <Text style={styles.fallbackMessage}>
            The image could not be loaded. Check your connection or try again
            later.
          </Text>
        </View>
      </AppScreenContainer>
    );
  }

  const { width: iw, height: ih } = sizeState;
  const displayWidth = windowWidth;
  const displayHeight = (displayWidth / iw) * ih;

  return (
    <AppScreenContainer>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        bounces
      >
        <ExpoImage
          source={{ uri: parsed.authorAvatar }}
          style={{ width: displayWidth, height: displayHeight }}
          contentFit="contain"
          accessibilityLabel={getHeaderTitle(parsed)}
        />
      </ScrollView>
    </AppScreenContainer>
  );
}

const styles = StyleSheet.create((theme) => ({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
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
