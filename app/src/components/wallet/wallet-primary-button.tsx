import { Pressable, Text } from "react-native";
import { StyleSheet } from "react-native-unistyles";

export type WalletPrimaryButtonProps = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityHint?: string;
  /** Outline transfer treatment vs filled primary CTA (legacy `ButtonContainer`). */
  variant?: "filled" | "outline";
};

/**
 * Wallet CTAs aligned with legacy `ButtonContainer` / `ButtonText` in `wallet.styled.ts`:
 * filled uses `foreground.primary` fill and `background.secondary` label (not raw white—fixes dark theme).
 */
export function WalletPrimaryButton({
  label,
  onPress,
  disabled,
  accessibilityHint,
  variant = "filled",
}: WalletPrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: Boolean(disabled) }}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={(state) => [
        styles.base,
        variant === "filled" ? styles.filled : styles.outline,
        variant === "filled" &&
          Boolean(disabled || !onPress) &&
          styles.filledDisabled,
        variant === "outline" && Boolean(disabled || !onPress) && styles.outlineDisabled,
        state.pressed && !disabled ? styles.pressed : null,
      ]}
    >
      <Text
        style={[
          variant === "filled" ? styles.filledLabel : styles.outlineLabel,
          variant === "filled" && Boolean(disabled || !onPress)
            ? styles.filledLabelDisabled
            : null,
          variant === "outline" && Boolean(disabled || !onPress)
            ? styles.outlineLabelDisabled
            : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  base: {
    minHeight: 52,
    width: "100%",
    borderRadius: 80,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.small,
    paddingHorizontal: theme.spacing.normal,
    borderCurve: "continuous",
  },
  filled: {
    backgroundColor: theme.colors.foundation.foreground.primary,
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: theme.colors.foundation.foreground.primary,
  },
  filledDisabled: {
    backgroundColor: theme.colors.foundation.background.secondary,
  },
  outlineDisabled: {
    borderColor: theme.colors.foundation.background.secondary,
  },
  pressed: {
    opacity: 0.92,
  },
  filledLabel: {
    fontSize: theme.spacing.large,
    fontWeight: "600",
    color: theme.colors.foundation.background.secondary,
  },
  filledLabelDisabled: {
    color: theme.colors.foundation.background.primary,
  },
  outlineLabel: {
    fontSize: theme.spacing.large,
    fontWeight: "600",
    color: theme.colors.foundation.foreground.primary,
  },
  outlineLabelDisabled: {
    color: theme.colors.foundation.background.secondary,
  },
}));
