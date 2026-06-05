import { Pressable, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

export type SettingsAvatarPermissionBannerSource = "library" | "camera";

export interface SettingsAvatarPermissionBannerProps {
  source: SettingsAvatarPermissionBannerSource;
  canAskAgain: boolean;
  onRequestAgain: () => void;
  onOpenSettings: () => void;
  onDismiss: () => void;
}

function titleForSource(source: SettingsAvatarPermissionBannerSource): string {
  return source === "library"
    ? "Photo library access is required"
    : "Camera access is required";
}

function bodyForSource(
  source: SettingsAvatarPermissionBannerSource,
  canAskAgain: boolean,
): string {
  if (source === "library") {
    return canAskAgain
      ? "Allow photo library access when prompted, or try again to open the permission dialog."
      : "Photo library access is turned off for Yoinks. You can enable it in system settings.";
  }
  return canAskAgain
    ? "Allow camera access when prompted, or try again to open the permission dialog."
    : "Camera access is turned off for Yoinks. You can enable it in system settings.";
}

export function SettingsAvatarPermissionBanner({
  source,
  canAskAgain,
  onRequestAgain,
  onOpenSettings,
  onDismiss,
}: SettingsAvatarPermissionBannerProps) {
  return (
    <View
      style={styles.card}
      accessibilityRole="alert"
      accessibilityLabel={titleForSource(source)}
    >
      <Text style={styles.title}>{titleForSource(source)}</Text>
      <Text style={styles.body}>{bodyForSource(source, canAskAgain)}</Text>
      <View style={styles.actions}>
        {canAskAgain ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Try again"
            onPress={onRequestAgain}
            style={({ pressed }) => [
              styles.actionButton,
              pressed ? styles.actionButtonPressed : null,
            ]}
          >
            <Text style={styles.actionButtonLabel}>Try again</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open system settings"
          onPress={onOpenSettings}
          style={({ pressed }) => [
            styles.actionButton,
            pressed ? styles.actionButtonPressed : null,
          ]}
        >
          <Text style={styles.actionButtonLabel}>Open settings</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          onPress={onDismiss}
          style={({ pressed }) => [
            styles.dismissButton,
            pressed ? styles.dismissButtonPressed : null,
          ]}
        >
          <Text style={styles.dismissLabel}>Dismiss</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: {
    marginBottom: theme.spacing.normal,
    padding: theme.spacing.normal,
    borderRadius: 10,
    backgroundColor: theme.colors.foundation.background.alpha30,
    borderWidth: 1,
    borderColor: theme.colors.foundation.foreground.quinary,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.foundation.foreground.primary,
    marginBottom: theme.spacing.small,
  },
  body: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.foundation.foreground.secondary,
    marginBottom: theme.spacing.normal,
  },
  actions: {
    gap: theme.spacing.small,
  },
  actionButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.small,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.foundation.foreground.quinary,
    backgroundColor: theme.colors.foundation.background.alpha30,
  },
  actionButtonPressed: {
    opacity: 0.88,
  },
  actionButtonLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.foundation.foreground.primary,
  },
  dismissButton: {
    alignItems: "center",
    paddingVertical: theme.spacing.small,
  },
  dismissButtonPressed: {
    opacity: 0.75,
  },
  dismissLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.foundation.foreground.secondary,
  },
}));
