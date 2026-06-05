import { StyledGradient } from "@/components/styledGradient";
import { ASPECT_RATIO } from "@/utils/constants";
import { Image } from "expo-image";
import React from "react";
import {
  StyleSheet as RNStyleSheet,
  Text,
  View,
} from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

const EMPTY_GIF = require("@/assets/GIFs/empty-self-profile.gif");

/**
 * Full-width empty illustration with bottom-fade gradient and title, matching
 * legacy `empty-state` (GIF + overlay + copy).
 */
export function EmptyState() {
  const { theme } = useUnistyles();
  return (
    <View style={styles.container}>
      <View
        style={styles.mediaClip}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
      >
        <Image
          source={EMPTY_GIF}
          style={styles.media}
          contentFit="cover"
          autoplay
        />
        <StyledGradient
          colors={[theme.colors.foundation.foreground.tertiary, "transparent"]}
          locations={[0, 0.2]}
          style={styles.gradientOverlay}
        />
      </View>
      <Text
        style={styles.title}
        accessibilityRole="header"
        accessibilityLabel="Nothing here yet"
      >
        Nothing here yet =/
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    width: "100%",
    aspectRatio: 1 / ASPECT_RATIO,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "flex-end",
    padding: theme.spacing.normal,
    borderRadius: theme.spacing.xlarge,
    overflow: "hidden",
  },
  mediaClip: {
    ...RNStyleSheet.absoluteFillObject,
    borderRadius: theme.spacing.xlarge,
    overflow: "hidden",
  },
  media: {
    ...RNStyleSheet.absoluteFillObject,
    borderRadius: theme.spacing.xlarge,
  },
  gradientOverlay: {
    ...RNStyleSheet.absoluteFillObject,
    transform: [{ rotate: "180deg" }],
    borderRadius: theme.spacing.xlarge,
  },
  title: {
    zIndex: 2,
    fontSize: theme.spacing.large,
    fontWeight: "600",
    color: theme.colors.common.white,
    textAlign: "center",
    marginBottom: theme.spacing.small,
  },
}));
