import type { PayoutRecord } from "@/wallet/walletTypes";
import { ActivityIndicator, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

type Props = {
  loading: boolean;
  payouts: PayoutRecord[];
  iconColorPrimary: string;
};

export function PayoutHistoryList({ loading, payouts, iconColorPrimary }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Payout History</Text>

      {loading ? (
        <ActivityIndicator
          accessibilityLabel="Loading payout history"
          color={iconColorPrimary}
        />
      ) : payouts.length === 0 ? (
        <Text style={styles.emptyText}>No payouts yet.</Text>
      ) : (
        <View style={styles.narrowColumn}>
          {payouts.map((p) => (
            <View key={p.id} style={styles.row}>
              <Text style={styles.rowAmount}>
                ${(p.amountUsdCents / 100).toFixed(2)}
              </Text>
              <View style={styles.rowMeta}>
                <Text
                  style={[
                    styles.rowStatus,
                    p.status === "PAID"
                      ? styles.statusPaid
                      : p.status === "FAILED"
                        ? styles.statusFailed
                        : styles.statusPending,
                  ]}
                >
                  {p.status === "PAID"
                    ? "Paid"
                    : p.status === "FAILED"
                      ? "Failed"
                      : p.status === "PROCESSING"
                        ? "Processing"
                        : "Requested"}
                </Text>
                <Text style={styles.rowDate}>
                  {new Date(p.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    width: "100%",
    marginTop: theme.spacing.large,
    rowGap: theme.spacing.small,
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: theme.spacing.xlarge,
    fontWeight: "600",
    color: theme.colors.foundation.foreground.primary,
    textAlign: "center",
    width: "100%",
  },
  narrowColumn: {
    width: "90%",
    alignSelf: "center",
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.foundation.foreground.secondary,
    textAlign: "center",
    paddingVertical: theme.spacing.normal,
  },
  row: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: theme.spacing.xsmall,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.foundation.background.secondary,
  },
  rowAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.foundation.foreground.primary,
  },
  rowMeta: {
    flexDirection: "row",
    gap: theme.spacing.small,
    alignItems: "center",
  },
  rowStatus: {
    fontSize: 12,
    fontWeight: "500",
  },
  statusPaid: {
    color: theme.colors.foundation.foreground.primary,
  },
  statusPending: {
    color: theme.colors.foundation.foreground.secondary,
  },
  statusFailed: {
    color: theme.colors.foundation.foreground.error.primary,
  },
  rowDate: {
    fontSize: 12,
    color: theme.colors.foundation.foreground.tertiary,
  },
}));
