import type { PropsWithChildren } from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

export type MomentCreateScreenContainerProps = PropsWithChildren;

/**
 * Full-screen column shell for the moment capture flow (safe area handled by parent / OS).
 */
export function MomentCreateScreenContainer({
  children,
}: MomentCreateScreenContainerProps) {
  return <View style={styles.root}>{children}</View>;
}

const styles = StyleSheet.create((theme) => ({
  root: {
    flex: 1,
    backgroundColor: theme.colors.foundation.background.primary,
  },
}));
