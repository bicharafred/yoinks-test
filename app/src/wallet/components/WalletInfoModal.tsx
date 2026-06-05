import { WalletInfoModal as WalletInfoModalBase } from "@/components/wallet";
import { Text } from "react-native";
import { StyleSheet } from "react-native-unistyles";

export type InfoKind = "yoinks" | "balance";

type Props = {
  infoOpen: InfoKind | null;
  yoinksLabel: string;
  balanceLabel: string;
  onDismiss: () => void;
};

export function WalletInfoModal({
  infoOpen,
  yoinksLabel,
  balanceLabel,
  onDismiss,
}: Props) {
  const isBalance = infoOpen === "balance";

  const title = isBalance ? "What is Balance?" : "What Are Yoinks?";
  const sampleVariant = isBalance ? ("balance" as const) : ("yoinks" as const);
  const sampleAmountLabel = isBalance ? balanceLabel : yoinksLabel;

  const body = isBalance ? (
    <Text style={styles.body}>
      Balance is{" "}
      <Text style={styles.bodyBold}>
        real money you earn when others unlock your posts
      </Text>
      . Withdraw it to your bank or use it to buy Yoinks. Yoinks you bought
      can&apos;t be withdrawn directly.
    </Text>
  ) : (
    <Text style={styles.body}>
      Yoinks are the app&apos;s currency. Use them to unlock blurred posts.
    </Text>
  );

  return (
    <WalletInfoModalBase
      body={body}
      onDismiss={onDismiss}
      sampleAmountLabel={sampleAmountLabel}
      sampleVariant={sampleVariant}
      title={title}
      visible={infoOpen !== null}
    />
  );
}

const styles = StyleSheet.create((theme) => ({
  body: {
    fontSize: theme.spacing.small,
    lineHeight: 20,
    color: theme.colors.foundation.foreground.primary,
    textAlign: "center",
  },
  bodyBold: {
    fontWeight: "700",
  },
}));
