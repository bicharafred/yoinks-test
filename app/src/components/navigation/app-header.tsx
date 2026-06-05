import type { ReactNode } from "react";
import { Platform, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";

export type AppHeaderProps = {
  title: string;
  leftAction?: ReactNode;
  rightAction?: ReactNode;
  leftAccessibilityLabel?: string;
  rightAccessibilityLabel?: string;
};

export const APP_HEADER_ACTION_SLOT_HEIGHT = 48;
export const APP_HEADER_BOTTOM_PADDING = 16;

export function getAppHeaderSafeTop(insetTop: number): number {
  const boostedTop = insetTop + 16;

  if (Platform.OS === "android") {
    return boostedTop;
  }

  if (Platform.OS === "ios" && insetTop < 30) {
    return boostedTop;
  }

  return insetTop;
}

export function getAppHeaderHeight(insetTop: number): number {
  return (
    getAppHeaderSafeTop(insetTop) +
    APP_HEADER_ACTION_SLOT_HEIGHT +
    APP_HEADER_BOTTOM_PADDING
  );
}

export function AppHeader({
  title,
  leftAction,
  rightAction,
  leftAccessibilityLabel,
  rightAccessibilityLabel,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const paddingTop = getAppHeaderSafeTop(insets.top);

  return (
    <View style={[styles.container, { paddingTop }]}>
      <View
        style={styles.actionSlot}
        accessibilityLabel={leftAccessibilityLabel}
      >
        {leftAction}
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View
        style={[styles.actionSlot, styles.rightActionSlot]}
        accessibilityLabel={rightAccessibilityLabel}
      >
        {rightAction}
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  /** Foundation primary background + foreground title (adaptive themes). */
  container: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.foundation.background.primary,
    borderBottomLeftRadius: theme.spacing.xxlarge,
    borderBottomRightRadius: theme.spacing.xxlarge,
    paddingHorizontal: theme.spacing.normal,
    paddingBottom: theme.spacing.normal,
  },
  actionSlot: {
    flex: 1,
    minHeight: APP_HEADER_ACTION_SLOT_HEIGHT,
    justifyContent: "center",
  },
  rightActionSlot: {
    alignItems: "flex-end",
  },
  title: {
    flexShrink: 1,
    maxWidth: "60%",
    textAlign: "center",
    fontSize: theme.spacing.large,
    fontWeight: "700",
    color: theme.colors.foundation.foreground.primary,
  },
}));
