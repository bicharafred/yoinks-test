import React from "react";
import { Pressable, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import ClapsIcon from "@/assets/icons/claps.svg";
// chat.svg is the speech-bubble icon from our existing icon library.
import CommentIcon from "@/assets/icons/chat.svg";
import SpeakerOffIcon from "@/assets/icons/speaker.slash.svg";
import SpeakerOnIcon from "@/assets/icons/speaker.svg";

interface MomentActionsProps {
  isVideo: boolean;
  isMuted: boolean;
  hasClaps: boolean;
  claps: number;
  isMomentAuthor: boolean;
  // Total comment count shown on the comment pill.
  commentCount: number;
  onToggleMuted: () => void;
  onClapPress: () => void;
  // Opens the comment sheet when the user taps the chat icon.
  onCommentPress: () => void;
  // Long-pressing the clap pill (viewers) or tapping it (authors) opens the clappers list.
  onClapCountPress?: () => void;
  onClapLongPress?: () => void;
  onClapPanUpdate?: (translationX: number, translationY: number) => void;
  onClapPanEnd?: () => void;
  // When true, counts are visible but all interactions are disabled.
  isLocked?: boolean;
}

export const MomentActions = ({
  isVideo,
  isMuted,
  hasClaps,
  claps,
  isMomentAuthor,
  commentCount,
  onToggleMuted,
  onClapPress,
  onCommentPress,
  onClapCountPress,
  onClapLongPress,
  onClapPanUpdate,
  onClapPanEnd,
  isLocked = false,
}: MomentActionsProps) => {
  const { theme } = useUnistyles();

  // Locked moments always show neutral (dark) pills regardless of clap state.
  const clapIsActive = isLocked ? false : hasClaps;
  const commentIsActive = false;

  const getActionIconColor = (isActive: boolean) =>
    isActive ? theme.colors.common.black : theme.colors.common.white;

  const tap = Gesture.Tap().onEnd(() => {
    if (!isLocked) runOnJS(onClapPress)();
  });

  const pan = Gesture.Pan()
    .activateAfterLongPress(250)
    .onStart(() => {
      if (!isLocked && onClapLongPress) runOnJS(onClapLongPress)();
    })
    .onUpdate((e) => {
      if (!isLocked && onClapPanUpdate) runOnJS(onClapPanUpdate)(e.translationX, e.translationY);
    })
    .onEnd(() => {
      if (!isLocked && onClapPanEnd) runOnJS(onClapPanEnd)();
    });

  // Viewers: long press (500ms, no movement) opens clappers list.
  // The pan gesture still wins if the user holds + moves (250ms threshold).
  const viewerLongPress = Gesture.LongPress()
    .minDuration(500)
    .onStart(() => {
      if (!isLocked && onClapCountPress) runOnJS(onClapCountPress)();
    });

  // Authors: tap opens clappers list (via onClapPress → handleClapPress in moment.tsx).
  // Viewers: race — quick tap claps, long-hold opens clappers, long-hold + drag undoes.
  const gesture = isMomentAuthor
    ? tap
    : Gesture.Race(viewerLongPress, pan, tap);

  return (
    <View style={styles.buttonsContainer}>
      {isVideo && (
        <Pressable onPress={onToggleMuted}>
          <View style={styles.actionPill(false)}>
            {isMuted ? (
              <SpeakerOffIcon width={24} height={24} color={theme.colors.common.white} />
            ) : (
              <SpeakerOnIcon width={24} height={24} color={theme.colors.common.white} />
            )}
          </View>
        </Pressable>
      )}

      {/* Comment and clap actions sit side-by-side in a horizontal row. */}
      <View style={styles.actionRow}>
        <Pressable
          onPress={isLocked ? undefined : onCommentPress}
          style={styles.actionPill(commentIsActive)}
        >
          {commentCount > 0 && (
            <Text style={styles.actionCountText(commentIsActive)}>{commentCount}</Text>
          )}
          <CommentIcon width={24} height={24} color={getActionIconColor(commentIsActive)} />
        </Pressable>

        <GestureDetector gesture={gesture}>
          <Animated.View style={styles.actionPill(clapIsActive)}>
            {/* Count shown for everyone when there are claps, or the locked placeholder. */}
            {(claps > 0 || isLocked) && (
              <Text style={styles.actionCountText(clapIsActive)}>{claps}</Text>
            )}
            <ClapsIcon width={24} height={24} color={getActionIconColor(clapIsActive)} />
          </Animated.View>
        </GestureDetector>
      </View>
    </View>
  );
};

const styles = StyleSheet.create((theme) => ({
  buttonsContainer: {
    position: "absolute",
    bottom: 0,
    right: 0,
    paddingBottom: 8,
    paddingRight: 8,
    alignItems: "flex-end",
    flexDirection: "column",
    gap: theme.spacing.xsmall,
  },
  actionPill: (isActive: boolean) => ({
    flexDirection: "row",
    gap: theme.spacing.xsmall,
    padding: theme.spacing.xsmall,
    paddingHorizontal: 12, // raw — no token for this structural inset
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: isActive
      ? theme.colors.common.white
      : theme.colors.foundation.background.alpha30,
    borderRadius: 120, // raw — pill shape; no token for this
  }),
  actionCountText: (isActive: boolean) => ({
    color: isActive ? theme.colors.common.black : theme.colors.common.white,
    fontSize: 16, // raw — no token; consistent with rest of feed overlay text
    fontWeight: "700",
  }),
  actionRow: {
    flexDirection: "row",
    gap: theme.spacing.xsmall,
    alignItems: "center",
  },
}));
