import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

export interface SettingsSectionProps {
  title: string;
  children?: ReactNode;
}

export function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <View style={styles.root} accessibilityRole="none">
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: {
    marginTop: theme.spacing.large,
  },
  title: {
    marginBottom: theme.spacing.small,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 22,
    color: theme.colors.foundation.foreground.primary,
  },
}));
