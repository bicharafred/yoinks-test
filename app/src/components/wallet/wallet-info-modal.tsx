import CircleInformationIcon from "@/assets/icons/circle.information.svg";
import YoinksKoinsIcon from "@/assets/icons/yoinks.koins.svg";
import type { ReactNode } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { WalletPrimaryButton } from "@/components/wallet/wallet-primary-button";

export type WalletInfoModalProps = {
  visible: boolean;
  title: string;
  sampleVariant: "yoinks" | "balance";
  sampleAmountLabel: string;
  body: ReactNode;
  onDismiss: () => void;
};

/**
 * Legacy-aligned info modal: dark scrim, primary card, info glyph, sample row, body, **Got it**.
 */
export function WalletInfoModal({
  visible,
  title,
  sampleVariant,
  sampleAmountLabel,
  body,
  onDismiss,
}: WalletInfoModalProps) {
  const { theme } = useUnistyles();
  const leadingIconColor = theme.colors.foundation.foreground.primary;

  return (
    <Modal
      accessibilityViewIsModal
      accessibilityLabel={title}
      animationType="fade"
      transparent
      visible={visible}
      statusBarTranslucent
      supportedOrientations={["portrait", "landscape"]}
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel="Dismiss dialog backdrop"
          style={styles.scrim}
          onPress={onDismiss}
        />
        <View style={styles.card} pointerEvents="box-none">
          <CircleInformationIcon
            color={theme.colors.foundation.information.foreground.tertiary}
            height={32}
            width={32}
          />
          <Text style={styles.title}>{title}</Text>

          <View style={styles.sampleShell}>
            <View style={styles.sampleRow}>
              {sampleVariant === "yoinks" ? (
                <YoinksKoinsIcon
                  color={leadingIconColor}
                  height={32}
                  width={32}
                />
              ) : (
                <Text style={styles.flagEmoji} accessibilityLabel="United States dollar">
                  🇺🇸
                </Text>
              )}
              <Text style={styles.sampleAmount}>{sampleAmountLabel}</Text>
            </View>
            <View style={styles.bodyBlock}>{body}</View>
          </View>

          <WalletPrimaryButton label="Got it" onPress={onDismiss} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create((theme) => ({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.xlarge,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    zIndex: 1,
    width: "100%",
    maxWidth: 400,
    borderRadius: theme.spacing.normal,
    backgroundColor: theme.colors.foundation.background.primary,
    padding: theme.spacing.xlarge,
    alignItems: "center",
    rowGap: theme.spacing.small,
  },
  title: {
    fontSize: theme.spacing.large + 4,
    fontWeight: "700",
    color: theme.colors.foundation.foreground.primary,
    textAlign: "center",
    marginBottom: theme.spacing.xxsmall,
  },
  sampleShell: {
    width: "100%",
    backgroundColor: theme.colors.foundation.background.secondary,
    borderRadius: theme.spacing.xxsmall * 2,
    paddingVertical: theme.spacing.small + theme.spacing.xxsmall,
    paddingHorizontal: theme.spacing.normal,
    marginBottom: theme.spacing.normal,
    rowGap: theme.spacing.xxsmall,
  },
  sampleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xxsmall,
    paddingVertical: theme.spacing.small,
  },
  flagEmoji: {
    fontSize: 40,
    lineHeight: 44,
  },
  sampleAmount: {
    fontSize: 32,
    fontWeight: "700",
    color: theme.colors.foundation.foreground.primary,
  },
  bodyBlock: {
    width: "100%",
  },
}));
