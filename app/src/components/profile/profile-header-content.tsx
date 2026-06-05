import type { Author } from "@/gql/graphql";
import { getProfileImagePushFromAuthor } from "@/navigation/profile-image-route-params";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

const DEFAULT_AVATAR = require("@/assets/images/avatar.png");

const AVATAR_SIZE = 88;

export type ProfileHeaderAuthor = Pick<Author, "id" | "name" | "avatar">;

export interface ProfileHeaderContentProps {
  /** Displayed profile author (self or visitor); id is used for future wiring. */
  author: ProfileHeaderAuthor;
}

export function ProfileHeaderContent({ author }: ProfileHeaderContentProps) {
  const router = useRouter();
  const avatarUrl = author.avatar?.trim() ?? "";
  const hasNavigableAvatar = avatarUrl.length > 0;
  const displayName = author.name?.trim();
  const nameForA11y = displayName ?? "Author";

  const avatarImage = (
    <Image
      style={styles.avatarImage}
      source={hasNavigableAvatar ? avatarUrl : DEFAULT_AVATAR}
      contentFit="cover"
      transition={200}
      accessibilityIgnoresInvertColors
    />
  );

  if (hasNavigableAvatar) {
    const handlePress = () => {
      const push = getProfileImagePushFromAuthor(author);
      if (push !== null) {
        router.push(push);
      }
    };

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View ${nameForA11y} profile picture`}
        accessibilityHint="Opens a full-screen preview"
        style={styles.avatarOuter}
        onPress={handlePress}
      >
        {avatarImage}
      </Pressable>
    );
  }

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`${nameForA11y}, default profile picture`}
      style={styles.avatarOuter}
    >
      {avatarImage}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  avatarOuter: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    overflow: "hidden",
    backgroundColor: theme.colors.foundation.background.alpha30,
  },
  avatarImage: {
    ...StyleSheet.absoluteFillObject,
  },
}));
