import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

export type MomentCaptureHeaderProps = {
  onClose: () => void;
  leadingIcon: ReactNode;
  trailingSlot?: ReactNode;
};

/**
 * Figma-aligned top nav: 8px horizontal padding, 40px action columns, optional trailing (flash).
 */
export function MomentCaptureHeader({
  onClose,
  leadingIcon,
  trailingSlot,
}: MomentCaptureHeaderProps) {
  return (
    <View style={styles.shell}>
      <View style={styles.row}>
        <View style={styles.leadingSlot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={12}
            onPress={onClose}
            style={styles.pill}
          >
            {leadingIcon}
          </Pressable>
        </View>
        <View style={styles.centerSpacer} />
        <View style={styles.trailingSlot}>{trailingSlot}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  shell: {
    backgroundColor: theme.colors.foundation.background.primary,
    borderBottomLeftRadius: theme.spacing.xxlarge,
    borderBottomRightRadius: theme.spacing.xxlarge,
    overflow: "hidden",
    paddingBottom: theme.spacing.normal,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.xsmall,
    paddingTop: theme.spacing.xsmall,
  },
  leadingSlot: {
    width: 40,
    alignItems: "flex-start",
  },
  trailingSlot: {
    width: 40,
    alignItems: "flex-end",
    justifyContent: "center",
    minHeight: 40,
  },
  centerSpacer: {
    flex: 1,
  },
  pill: {
    padding: theme.spacing.xsmall,
    borderRadius: 80,
    alignItems: "center",
    justifyContent: "center",
  },
}));
