import { Author } from "@/gql/graphql";
import { getVisitorProfilePush } from "@/navigation/author-profile-route-params";
import { APP_TAB_PROFILE_HREF } from "@/navigation/app-tabs.config";
import { formatDuration } from "@/utils/dateUtils";
import { differenceInSeconds } from "date-fns";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

interface AuthorInfoProps {
  author?: Author;
  createdAt: number;
  isMomentAuthor: boolean;
  sequence: number;
}

export const AuthorInfo = ({
  author,
  createdAt,
  isMomentAuthor,
  sequence,
}: AuthorInfoProps) => {
  const router = useRouter();

  const duration = useMemo(() => {
    const creationDate = new Date(createdAt * 1000);
    const now = new Date();

    const diff = differenceInSeconds(now, creationDate);

    return formatDuration(diff);
  }, [createdAt]);

  const onPressAuthor = useCallback(() => {
    if (!author) {
      return;
    }

    if (isMomentAuthor) {
      router.push(APP_TAB_PROFILE_HREF);
      return;
    }

    router.push(getVisitorProfilePush(author));
  }, [author, isMomentAuthor, router]);

  if (!author) {
    return null;
  }

  return (
    <Pressable style={styles.container} onPress={onPressAuthor}>
      <Image
        style={styles.profilePicture}
        source={
          author.avatar
            ? { uri: author.avatar }
            : require("@/assets/images/avatar.png")
        }
        contentFit="cover"
        transition={200}
      />
      <View style={styles.postDetails}>
        <Text style={styles.authorName}>{author.name}</Text>
        <View style={styles.row}>
          <View style={styles.momentNumberContainer}>
            <Text style={styles.momentNumberText}>{sequence}</Text>
          </View>
          <Text style={styles.durationText}>{duration} ago</Text>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create((theme) => ({
  container: {
    flexDirection: "row",
    zIndex: 100,
  },
  postDetails: {
    marginLeft: theme.spacing.xsmall,
    gap: 4,
  },
  profilePicture: {
    width: theme.spacing.xxxlarge,
    height: theme.spacing.xxxlarge,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.spacing.xxxlarge,
    backgroundColor: theme.colors.foundation.foreground.quaternary,
  },
  authorName: {
    color: theme.colors.common.white,
    fontSize: 12,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
  },
  momentNumberContainer: {
    borderRadius: theme.spacing.xxxlarge,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.xxsmall,
    backgroundColor: theme.colors.foundation?.background.alpha30,
  },
  momentNumberText: {
    fontSize: theme.spacing.xsmall,
    fontWeight: "700",
    color: theme.colors.common.white,
  },
  durationText: {
    color: theme.colors.common.white,
    fontSize: theme.spacing.xsmall,
    fontWeight: "400",
  },
  momentIdText: {
    fontSize: 10,
    color: theme.colors.common.white,
  },
}));
