import { runtimeConfig } from "@/config/runtimeConfig";
import { WalletPrimaryButton } from "@/components/wallet";
import type { PayoutRecord } from "@/wallet/walletTypes";
import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { PayoutHistoryList } from "./PayoutHistoryList";

type Props = {
  redeemable: number;
  payoutRequesting: boolean;
  earningsSeeding: boolean;
  payoutHistory: PayoutRecord[];
  payoutLoading: boolean;
  iconColorPrimary: string;
  onRequestPayout: () => void;
  onSeedEarnings: () => void;
};

export function PayoutTab({
  redeemable,
  payoutRequesting,
  earningsSeeding,
  payoutHistory,
  payoutLoading,
  iconColorPrimary,
  onRequestPayout,
  onSeedEarnings,
}: Props) {
  return (
    <View style={styles.container}>
      {runtimeConfig.enableMockPayout ? (
        <>
          <View style={styles.narrowColumn}>
            <View style={styles.continueWrap}>
              <WalletPrimaryButton
                accessibilityHint="Add $5.00 of mock creator earnings to test the payout flow"
                disabled={earningsSeeding}
                label={earningsSeeding ? "Adding earnings…" : "Add Mock $5 Earnings (Dev)"}
                variant="outline"
                onPress={onSeedEarnings}
              />
            </View>
            <View style={styles.continueWrap}>
              <WalletPrimaryButton
                accessibilityHint={
                  redeemable > 0
                    ? "Request a payout of your available balance"
                    : "No balance available for payout"
                }
                disabled={redeemable <= 0 || payoutRequesting}
                label={payoutRequesting ? "Requesting…" : "Request Payout"}
                onPress={onRequestPayout}
              />
            </View>
          </View>

          <PayoutHistoryList
            iconColorPrimary={iconColorPrimary}
            loading={payoutLoading}
            payouts={payoutHistory}
          />
        </>
      ) : (
        <View style={styles.narrowColumn}>
          <View style={styles.transferBlock}>
            <WalletPrimaryButton
              accessibilityHint="Transfers are not available yet"
              disabled
              label="Transfer - Coming Soon"
              variant="outline"
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    width: "100%",
    marginTop: theme.spacing.xxxlarge,
    rowGap: theme.spacing.normal,
    alignItems: "center",
  },
  narrowColumn: {
    width: "90%",
    alignSelf: "center",
  },
  continueWrap: {
    width: "100%",
    marginTop: theme.spacing.normal,
  },
  transferBlock: {
    width: "100%",
    paddingTop: theme.spacing.normal,
    rowGap: theme.spacing.xxsmall,
  },
  note: {
    fontSize: 12,
    color: theme.colors.foundation.foreground.tertiary,
    textAlign: "center",
    marginTop: theme.spacing.xsmall,
    lineHeight: 18,
  },
  noteCode: {
    fontWeight: "600",
    color: theme.colors.foundation.foreground.secondary,
  },
}));
