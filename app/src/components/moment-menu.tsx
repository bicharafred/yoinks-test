import React from "react";
import { View, Text, Pressable } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { BottomSheet } from "./bottom-sheet";

import EyeSlashIcon from "@/assets/icons/eye.slash.svg";
import BlockIcon from "@/assets/icons/block.svg";
import ExclamationIcon from "@/assets/icons/circle.exclamation.svg";

interface MomentMenuProps {
  visible: boolean;
  onClose: () => void;
  isMomentAuthor: boolean;
  onHide: () => void;
  onBlock: () => void;
  onReportContent: () => void;
  onReportUser: () => void;
  onDelete: () => void;
}

export const MomentMenu = ({
  visible,
  onClose,
  isMomentAuthor,
  onHide,
  onBlock,
  onReportContent,
  onReportUser,
  onDelete,
}: MomentMenuProps) => {
  const { theme } = useUnistyles();
  const destructiveColor = theme.colors.foundation.error.foreground.primary;
  const primaryColor = theme.colors.foundation.foreground.primary;

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.container}>
        {isMomentAuthor ? (
          <Pressable
            style={({ pressed }) => [styles.menuItem, styles.menuItemNoBorder, pressed && styles.menuItemPressed]}
            onPress={onDelete}
          >
            <Text style={[styles.menuText, styles.destructiveText]}>Delete Moment</Text>
          </Pressable>
        ) : (
          <>
            <Pressable
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
              onPress={onHide}
            >
              <EyeSlashIcon width={22} height={22} color={primaryColor} style={styles.icon} />
              <Text style={styles.menuText}>I Don't like this</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
              onPress={onBlock}
            >
              <BlockIcon width={22} height={22} color={primaryColor} style={styles.icon} />
              <Text style={styles.menuText}>Block User</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
              onPress={onReportContent}
            >
              <ExclamationIcon width={22} height={22} color={destructiveColor} style={styles.icon} />
              <Text style={[styles.menuText, styles.destructiveText]}>Report Inappropriate Content</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.menuItem, styles.menuItemNoBorder, pressed && styles.menuItemPressed]}
              onPress={onReportUser}
            >
              <ExclamationIcon width={22} height={22} color={destructiveColor} style={styles.icon} />
              <Text style={[styles.menuText, styles.destructiveText]}>Report User</Text>
            </Pressable>
          </>
        )}
        <Pressable style={styles.cancelButton} onPress={onClose}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create((theme) => ({
  container: {
    gap: 0,
  },
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.foundation.background.alpha10,
  },
  menuItemNoBorder: {
    borderBottomWidth: 0,
  },
  menuItemPressed: {
    backgroundColor: theme.colors.foundation.background.alpha10,
  },
  icon: {
    flexShrink: 0,
  },
  menuText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.foundation.foreground.primary,
    flex: 1,
  },
  destructiveText: {
    color: theme.colors.foundation.error.foreground.primary,
  },
  cancelButton: {
    paddingVertical: theme.spacing.normal,
    marginTop: theme.spacing.normal,
    borderRadius: 50, // pill shape
    borderWidth: 1.5,
    borderColor: theme.colors.foundation.foreground.tertiary,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.foundation.foreground.primary,
    textAlign: "center",
  },
}));
