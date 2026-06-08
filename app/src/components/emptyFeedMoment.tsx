import { ASPECT_RATIO } from "@/utils/constants";
import { APP_CREATE_MOMENT_HREF } from "@/navigation/app-tabs.config";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import {
  Pressable,
  StyleSheet as RNStyleSheet,
  Text,
  View,
} from "react-native";
import { StyleSheet } from "react-native-unistyles";

const emptyFeedGif = require("@/assets/GIFs/empty-feed.gif");

export const EmptyFeedMoment = () => {
  const router = useRouter();

  const handleClickNewPost = () => {
    router.push(APP_CREATE_MOMENT_HREF);
  };

  return (
    <View style={styles.container}>
      <Image
        style={[styles.image, RNStyleSheet.absoluteFillObject]}
        source={emptyFeedGif}
        contentFit="cover"
        autoplay
      />
      <Text style={styles.emptyTitle}>Nothing to see here yet.</Text>
      <Pressable
        style={styles.actionButton}
        onPress={handleClickNewPost}
      >
        <Text style={styles.actionButtonText}>New Post</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create((theme) => ({
  container: {
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: theme.spacing.xlarge,
    marginBottom: theme.spacing.xlarge,
    width: "100%",
    aspectRatio: 1 / ASPECT_RATIO,
    padding: theme.spacing.normal,
    overflow: "hidden",
  },
  image: {
    borderRadius: theme.spacing.xlarge,
  },
  emptyTitle: {
    fontSize: theme.spacing.large,
    fontWeight: "600",
    color: theme.colors.common.white,
  },
  actionButton: {
    alignSelf: "stretch",
    padding: theme.spacing.normal,
    backgroundColor: theme.colors.foundation.background.alpha50,
    borderRadius: 8000,
    borderWidth: 1,
    borderColor: theme.colors.common.white,
    justifyContent: "center",
    alignItems: "center",
  },
  actionButtonText: {
    fontSize: theme.spacing.normal,
    fontWeight: "700",
    color: theme.colors.common.white,
  },
}));
