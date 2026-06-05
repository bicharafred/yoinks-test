import { Image } from "expo-image";
import React from "react";
import { View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import LockedIcon from "@/assets/icons/lock.svg";
import type { ProfileMomentItem } from "@/machines/profileMachine";
import { ASPECT_RATIO } from "@/utils/constants";
import { getFeedMomentVisibility } from "@/utils/momentVisibility";

export interface ProfileMomentCardProps {
  moment: ProfileMomentItem;
  viewerAuthorId: string | undefined;
  /**
   * Explicit cell width (e.g. from a 4-column grid). Height follows `ASPECT_RATIO`, matching feed moment layout.
   * When omitted, the card fills the parent width and derives height via `aspectRatio`.
   */
  width?: number;
  /** Optional clock injection for tests (`getFeedMomentVisibility`). */
  now?: Date;
  /**
   * When false, hides this subtree from accessibility so a parent `Pressable` can own the focus ring and label (e.g. profile grid navigation).
   */
  accessible?: boolean;
}

function profileGridThumbnailUri(
  moment: ProfileMomentItem,
  displayIsBlurred: boolean,
  isLocked: boolean,
): string {
  if (moment.type !== "VIDEO") {
    return moment.mediaUrl;
  }
  const visuallyObscured = isLocked || displayIsBlurred;
  if (!visuallyObscured && moment.videoThumbnailUrl) {
    return moment.videoThumbnailUrl;
  }
  return moment.mediaUrl;
}

export function ProfileMomentCard({
  moment,
  viewerAuthorId,
  width,
  now,
  accessible = true,
}: ProfileMomentCardProps) {
  const { theme } = useUnistyles();
  const visibility = getFeedMomentVisibility({
    createdAt: moment.createdAt,
    hasViewerSeen: moment.hasViewerSeen,
    isBlurred: moment.isBlurred,
    isLocal: moment.isLocal,
    viewerAuthorId,
    momentAuthorId: moment.author.id,
    now,
  });

  const isLocked = Boolean(moment.isLocked);
  const uri = profileGridThumbnailUri(
    moment,
    visibility.displayIsBlurred,
    isLocked,
  );

  const sizingStyle =
    width != null
      ? { width, height: width * ASPECT_RATIO }
      : { width: "100%" as const, aspectRatio: 1 / ASPECT_RATIO };

  return (
    <View
      style={[styles.root, sizingStyle]}
      accessible={accessible}
      {...(accessible
        ? {
            accessibilityRole: "image" as const,
            accessibilityLabel: "Moment thumbnail",
          }
        : {})}
    >
      {uri ? (
        <Image
          style={styles.image}
          source={uri}
          contentFit="cover"
          transition={200}
          blurRadius={visibility.displayIsBlurred ? 15 : 0}
        />
      ) : (
        <View style={styles.placeholder} />
      )}

      {isLocked ? (
        <View style={styles.lockBadge} pointerEvents="none">
          <LockedIcon width={18} height={18} color={theme.colors.common.white} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: {
    position: "relative",
    overflow: "hidden",
    borderRadius: theme.spacing.small,
    backgroundColor: theme.colors.foundation.background.alpha30,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.foundation.background.alpha30,
  },
  lockBadge: {
    position: "absolute",
    top: theme.spacing.xsmall,
    right: theme.spacing.xsmall,
    padding: theme.spacing.xxsmall,
    borderRadius: theme.spacing.xxsmall,
    backgroundColor: theme.colors.foundation.background.alpha30,
  },
}));
