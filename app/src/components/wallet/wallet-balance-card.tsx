import CircleInformationIcon from "@/assets/icons/circle.information.svg";
import UsaIcon from "@/assets/icons/usa.svg";
import YoinksKoinsIcon from "@/assets/icons/yoinks.koins.svg";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

export type WalletBalanceCardProps = {
  variant: "yoinks" | "balance";
  amountLabel: string;
  iconColor: string;
  onInfoPress: () => void;
  infoAccessibilityLabel: string;
  infoAccessibilityHint?: string;
  /** Shown inline after the amount while balance is refreshing (legacy `KoinsCenter`). */
  trailing?: ReactNode;
};

/**
 * Legacy / Figma wallet hero: fixed 191pt card, centered icon + amount row, trailing info pill.
 */
export function WalletBalanceCard({
  variant,
  amountLabel,
  iconColor,
  onInfoPress,
  infoAccessibilityLabel,
  infoAccessibilityHint,
  trailing,
}: WalletBalanceCardProps) {
  const { theme } = useUnistyles();
  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={infoAccessibilityLabel}
        accessibilityHint={infoAccessibilityHint}
        onPress={onInfoPress}
        style={styles.infoPill}
        hitSlop={8}
      >
        <CircleInformationIcon
          width={20}
          height={20}
          color={theme.colors.foundation.information.foreground.tertiary}
        />
      </Pressable>

      <View style={styles.centerRow}>
        {variant === "yoinks" ? (
          <YoinksKoinsIcon width={32} height={32} color={iconColor} />
        ) : (
          <UsaIcon width={32} height={32} color={iconColor} />
        )}
        <Text style={styles.amount}>{amountLabel}</Text>
        {trailing != null ? trailing : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: {
    height: 191,
    width: "100%",
    marginTop: theme.spacing.xlarge,
    borderRadius: theme.spacing.xlarge,
    backgroundColor: theme.colors.foundation.background.secondary,
    padding: theme.spacing.xlarge,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  centerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xxsmall,
    flex: 1,
  },
  flagEmoji: {
    fontSize: 40,
    lineHeight: 44,
  },
  infoPill: {
    position: "absolute",
    top: 10,
    right: theme.spacing.normal,
    width: 52,
    height: 52,
    borderRadius: 120,
    backgroundColor: theme.colors.foundation.information.background.primary,
    borderWidth: 1,
    borderColor: theme.colors.foundation.information.foreground.quinary,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  amount: {
    fontSize: 32,
    fontWeight: "700",
    color: theme.colors.foundation.foreground.primary,
  },
}));
