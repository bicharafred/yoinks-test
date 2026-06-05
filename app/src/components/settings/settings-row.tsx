import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

export interface SettingsRowProps {
  label: string;
  value?: string;
  icon?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  showChevron?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  isOnly?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function SettingsRow({
  label,
  value,
  icon,
  onPress,
  disabled = false,
  showChevron = true,
  isFirst = false,
  isLast = false,
  isOnly = false,
  accessibilityLabel,
  accessibilityHint,
}: SettingsRowProps) {
  const resolvedA11yLabel = accessibilityLabel ?? label;

  const borderStyle = [
    styles.row,
    isFirst && !isOnly ? styles.rowFirst : null,
    isLast && !isOnly ? styles.rowLast : null,
    isOnly ? styles.rowOnly : null,
    !isFirst && !isOnly ? styles.rowNotFirst : null,
  ];

  const content = (
    <>
      {icon != null ? <View style={styles.icon}>{icon}</View> : null}
      <View style={styles.labelBlock}>
        <Text style={styles.label}>{label}</Text>
      </View>
      {value != null && value !== "" ? (
        <Text
          style={styles.value}
          numberOfLines={1}
          ellipsizeMode="tail"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {value}
        </Text>
      ) : null}
      {onPress != null && showChevron ? (
        <Text
          style={styles.chevron}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {"\u203A"}
        </Text>
      ) : null}
    </>
  );

  if (onPress == null) {
    return (
      <View style={borderStyle} accessibilityRole="text">
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={resolvedA11yLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        ...borderStyle,
        pressed && !disabled ? styles.rowPressed : null,
        disabled ? styles.rowDisabled : null,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.normal,
    width: "100%",
    paddingVertical: theme.spacing.normal,
    paddingHorizontal: theme.spacing.xlarge,
    borderWidth: 1,
    borderColor: theme.colors.foundation.foreground.primary,
  },
  rowFirst: {
    borderTopLeftRadius: theme.spacing.xlarge,
    borderTopRightRadius: theme.spacing.xlarge,
  },
  rowLast: {
    borderBottomLeftRadius: theme.spacing.xlarge,
    borderBottomRightRadius: theme.spacing.xlarge,
  },
  rowOnly: {
    borderRadius: 10,
  },
  rowNotFirst: {
    borderTopWidth: 0,
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowDisabled: {
    opacity: 0.45,
  },
  icon: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  labelBlock: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 18,
    color: theme.colors.foundation.foreground.primary,
  },
  value: {
    fontSize: 15,
    fontWeight: "500",
    color: theme.colors.foundation.foreground.secondary,
  },
  chevron: {
    fontSize: 20,
    fontWeight: "600",
    color: theme.colors.foundation.foreground.secondary,
  },
}));
