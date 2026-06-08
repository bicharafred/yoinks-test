import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

export type MomentCameraControlsProps = {
  albumIcon: ReactNode;
  flipIcon: ReactNode;
  isRecording: boolean;
  // lockIcon?: ReactNode;
  // recordingLocked?: boolean;
  // onLockPress?: () => void;
  onAlbumPress: () => void;
  onFlipPress: () => void;
  onShutterPress: () => void;
  onShutterLongPress?: () => void;
  onShutterPressOut: () => void;
};

/**
 * Album + shutter + flip for stills; during recording only the shutter is shown (Figma).
 */
export function MomentCameraControls({
  albumIcon,
  flipIcon,
  isRecording,
  onAlbumPress,
  onFlipPress,
  onShutterPress,
  onShutterLongPress,
  onShutterPressOut,
}: MomentCameraControlsProps) {
  return (
    <View style={styles.row}>
      {!isRecording ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open photo library"
            onPress={onAlbumPress}
            style={styles.sidePill}
          >
            {albumIcon}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Take photo. Long press to record video."
            delayLongPress={300}
            onPress={onShutterPress}
            onLongPress={onShutterLongPress}
            onPressOut={onShutterPressOut}
            style={styles.shutterOuter}
          >
            <View style={styles.shutterInner} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Flip camera"
            onPress={onFlipPress}
            style={styles.sidePill}
          >
            {flipIcon}
          </Pressable>
        </>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Recording — release to stop unless locked"
          onPressOut={onShutterPressOut}
          style={[styles.shutterOuter, styles.shutterOuterRecording]}
        >
          <View style={[styles.shutterInner, styles.shutterInnerRecording]} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.gigalarge,
    paddingHorizontal: theme.spacing.normal,
    width: "100%",
    maxWidth: 288,
    alignSelf: "center",
  },
  sidePill: {
    padding: theme.spacing.xsmall,
    borderRadius: 80,
    backgroundColor: theme.colors.foundation.background.alpha10,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterOuter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.foundation.background.alpha05,
  },
  shutterOuterRecording: {
    backgroundColor: theme.colors.foundation.error.background.secondary,
  },
  shutterInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.foundation.foreground.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInnerRecording: {
    backgroundColor: theme.colors.foundation.error.foreground.tertiary,
  },
}));
