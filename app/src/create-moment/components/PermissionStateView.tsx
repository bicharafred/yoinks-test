import { MomentCreateScreenContainer } from "@/components/moment-create";
import { ActivityIndicator, Linking, Pressable, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

type Props = {
  variant: "handoff" | "failure" | "denied";
  insetTop: number;
  onRetry: () => void;
  onClose: () => void;
};

export function PermissionStateView({ variant, insetTop, onRetry, onClose }: Props) {
  return (
    <MomentCreateScreenContainer>
      <View style={[styles.centered, { paddingTop: insetTop }]}>
        {variant === "handoff" ? (
          <ActivityIndicator />
        ) : variant === "failure" ? (
          <>
            <Text style={styles.title}>Camera unavailable</Text>
            <Pressable style={styles.textButton} onPress={onRetry}>
              <Text style={styles.textButtonLabel}>Try again</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.title}>Camera access blocked</Text>
            <Pressable
              style={styles.textButton}
              onPress={() => { void Linking.openSettings(); }}
            >
              <Text style={styles.textButtonLabel}>Open Settings</Text>
            </Pressable>
            <Pressable style={styles.textButton} onPress={onClose}>
              <Text style={styles.textButtonLabel}>Go Back</Text>
            </Pressable>
          </>
        )}
      </View>
    </MomentCreateScreenContainer>
  );
}

const styles = StyleSheet.create((theme) => ({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.normal,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.foundation.foreground.primary,
    textAlign: "center",
  },
  textButton: {
    marginTop: theme.spacing.large,
    padding: theme.spacing.small,
  },
  textButtonLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.foundation.foreground.brand.tertiary,
  },
}));
