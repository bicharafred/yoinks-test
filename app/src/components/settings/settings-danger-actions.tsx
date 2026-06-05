import { Pressable, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

export interface SettingsDangerActionsProps {
  onPressLogout: () => void;
  onPressDeleteAccount: () => void;
  logoutDisabled?: boolean;
  deleteDisabled?: boolean;
}

export function SettingsDangerActions({
  onPressLogout,
  onPressDeleteAccount,
  logoutDisabled = false,
  deleteDisabled = false,
}: SettingsDangerActionsProps) {
  return (
    <View style={styles.root}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Log out"
        disabled={logoutDisabled}
        onPress={onPressLogout}
        style={({ pressed }) => [
          styles.logoutButton,
          pressed && !logoutDisabled ? styles.logoutPressed : null,
          logoutDisabled ? styles.disabled : null,
        ]}
      >
        <Text style={styles.logoutLabel}>Logout</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Delete account"
        accessibilityHint="Permanently deletes your account after confirmation"
        disabled={deleteDisabled}
        onPress={onPressDeleteAccount}
        style={({ pressed }) => [
          styles.deleteButton,
          pressed && !deleteDisabled ? styles.deletePressed : null,
          deleteDisabled ? styles.disabled : null,
        ]}
      >
        <Text style={styles.deleteLabel}>Delete Account</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: {
    marginTop: 32,
    width: "100%",
    gap: theme.spacing.xsmall,
  },
  logoutButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.normal,
    borderRadius: theme.spacing.xlarge,
    borderWidth: 1,
    borderColor: theme.colors.foundation.foreground.primary,
  },
  logoutPressed: {
    opacity: 0.7,
  },
  logoutLabel: {
    fontSize: theme.spacing.normal,
    fontWeight: "600",
    color: theme.colors.foundation.foreground.primary,
  },
  deleteButton: {
    alignItems: "center",
    width: "100%",
    paddingVertical: theme.spacing.normal,
  },
  deletePressed: {
    opacity: 0.7,
  },
  deleteLabel: {
    fontWeight: "600",
    fontSize: theme.spacing.normal,
    color: theme.colors.foundation.error.foreground.tertiary,
  },
  disabled: {
    opacity: 0.45,
  },
}));
