import type { PropsWithChildren, ReactNode } from "react";
import { StyleSheet as RNStyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet } from "react-native-unistyles";

export type MomentViewfinderFrameProps = PropsWithChildren<{
  /** Width from layout (typically screen width). */
  width: number;
  /** Preview height (e.g. width * ASPECT_RATIO). */
  height: number;
  /** Optional top overlay (timer pill). */
  topOverlay?: ReactNode;
}>;

/**
 * Rounded viewfinder with hairline border and optional cosmetic top gradient (Figma capture frame).
 */
export function MomentViewfinderFrame({
  width,
  height,
  children,
  topOverlay,
}: MomentViewfinderFrameProps) {
  return (
    <View style={[styles.wrapper, { width, height }]}>
      <View style={styles.clip}>{children}</View>
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0.4)", "transparent"]}
        locations={[0, 0.2]}
        style={styles.gradient}
      />
      {topOverlay ? (
        <View style={styles.topOverlay}>{topOverlay}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  wrapper: {
    borderRadius: theme.spacing.xlarge,
    borderWidth: 1,
    borderColor: theme.colors.foundation.background.alpha10,
    overflow: "hidden",
    alignSelf: "center",
  },
  clip: {
    ...RNStyleSheet.absoluteFillObject,
    overflow: "hidden",
    borderRadius: theme.spacing.xlarge,
  },
  gradient: {
    ...RNStyleSheet.absoluteFillObject,
    borderRadius: theme.spacing.xlarge,
  },
  topOverlay: {
    position: "absolute",
    top: 15,
    left: 0,
    right: 0,
    alignItems: "center",
  },
}));
