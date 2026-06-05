import React from "react";
import { View, Text, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { StyleSheet } from "react-native-unistyles";
import { ASPECT_RATIO } from "@/utils/constants";
import { StyledGradient } from "./styledGradient";

const emptyFeedGif = require("@/assets/GIFs/empty-feed.gif");

export const CaughtUpCard = () => {
  const { width } = useWindowDimensions();

  return (
    <View style={styles.container(width)}>
      <Image
        style={styles.image}
        source={emptyFeedGif}
        contentFit="cover"
        autoplay
      />
      <StyledGradient
        colors={["rgba(0,0,0,0.8)", "transparent", "rgba(0,0,0,0.8)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientOverlay}
        pointerEvents="none"
      />
      <View style={styles.textContainer}>
        <Text style={styles.title}>You&apos;re all caught up for now!</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create((theme) => ({
  container: (width: number) => ({
    width: width,
    height: width * ASPECT_RATIO,
    marginBottom: theme.spacing.xlarge,
    borderRadius: theme.spacing.xlarge,
    overflow: "hidden",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  }),
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  textContainer: {
    position: "absolute",
    bottom: 40,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.common.white,
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
}));
