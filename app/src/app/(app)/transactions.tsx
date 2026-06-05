import { AppHeaderBackButton } from "@/components/navigation/app-header-back-button";
import { AppScreenContainer } from "@/components/navigation/app-screen-container";
import { BottomSheet } from "@/components/bottom-sheet";
import { getAppHeaderOptions } from "@/navigation/app-header-options";
import {
  fetchTransactions,
  type Transaction,
  type TransactionRange,
} from "@/services/transactionsService";
import { useNavigation } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  type SectionListData,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

// ── Inline filter funnel icon (no SVG equivalent in asset set) ────────────────

function FunnelIcon({ color }: { color: string }) {
  return (
    <View style={{ gap: 3, alignItems: "center", paddingVertical: 2 }}>
      <View style={{ width: 18, height: 2, backgroundColor: color, borderRadius: 1 }} />
      <View style={{ width: 13, height: 2, backgroundColor: color, borderRadius: 1 }} />
      <View style={{ width: 8,  height: 2, backgroundColor: color, borderRadius: 1 }} />
    </View>
  );
}

function FilterButton({ onPress }: { onPress: () => void }) {
  const { theme } = useUnistyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Filter transactions"
      hitSlop={12}
      onPress={onPress}
    >
      <FunnelIcon color={theme.colors.foundation.foreground.primary} />
    </Pressable>
  );
}

// ── Amount / display helpers ──────────────────────────────────────────────────

const YOINK_USD = 0.05;

function relativeTime(isoStr: string): string {
  const diffMs = Date.now() - new Date(isoStr).getTime();
  const min = Math.floor(diffMs / 60_000);
  const hr  = Math.floor(diffMs / 3_600_000);
  const day = Math.floor(diffMs / 86_400_000);
  if (min < 1)  return "Just now";
  if (min < 60) return `${min} Min Ago`;
  if (hr  < 24) return `${hr} Hr Ago`;
  return `${day} Day${day !== 1 ? "s" : ""} Ago`;
}

function formatUsd(micros: number): string {
  return `$${(micros / 1_000_000).toFixed(2)}`;
}

type AmountColor = "positive" | "negative" | "pending" | "neutral";

interface TxnDisplay {
  title: string;
  subtitle: string;
  subtitleVariant: "warning" | "secondary";
  amountLabel: string;
  amountColor: AmountColor;
  usdEquivalent: string | null;
}

function displayForTxn(txn: Transaction): TxnDisplay {
  switch (txn.type) {
    case "YOINKS_PURCHASED": {
      const n = Math.abs(txn.amountYoinks ?? 0);
      return {
        title: "You added Yoinks!",
        subtitle: txn.status === "CONFIRMED" ? relativeTime(txn.createdAt) : "Pending",
        subtitleVariant: txn.status === "CONFIRMED" ? "secondary" : "warning",
        amountLabel: `+${n}`,
        amountColor: "positive",
        usdEquivalent: `($${(n * YOINK_USD).toFixed(2)})`,
      };
    }
    case "YOINKS_SPENT": {
      const n = Math.abs(txn.amountYoinks ?? 1);
      return {
        title: "You unlocked a Moment",
        subtitle: relativeTime(txn.createdAt),
        subtitleVariant: "secondary",
        amountLabel: `-${n}`,
        amountColor: "negative",
        usdEquivalent: `($${(n * YOINK_USD).toFixed(2)})`,
      };
    }
    case "CREATOR_EARNED": {
      const micros = txn.amountUsdMicros ?? 0;
      return {
        title: "You earned from a Moment",
        subtitle: relativeTime(txn.createdAt),
        subtitleVariant: "secondary",
        amountLabel: `+${formatUsd(micros)}`,
        amountColor: "positive",
        usdEquivalent: null,
      };
    }
    case "PAYOUT_REQUESTED": {
      const micros = txn.amountUsdMicros ?? 0;
      return {
        title: "Withdrawal requested",
        subtitle: "Pending",
        subtitleVariant: "warning",
        amountLabel: `-${formatUsd(micros)}`,
        amountColor: "pending",
        usdEquivalent: null,
      };
    }
    case "PAYOUT_PAID": {
      const micros = txn.amountUsdMicros ?? 0;
      return {
        title: "Withdrawal completed",
        subtitle: relativeTime(txn.createdAt),
        subtitleVariant: "secondary",
        amountLabel: `-${formatUsd(micros)}`,
        amountColor: "neutral",
        usdEquivalent: null,
      };
    }
    case "PAYOUT_FAILED": {
      const micros = txn.amountUsdMicros ?? 0;
      return {
        title: "Withdrawal failed",
        subtitle: "Failed",
        subtitleVariant: "warning",
        amountLabel: formatUsd(micros),
        amountColor: "negative",
        usdEquivalent: null,
      };
    }
    case "REFERRAL_REWARD": {
      const n = Math.abs(txn.amountYoinks ?? 0);
      return {
        title: "Referral reward",
        subtitle: relativeTime(txn.createdAt),
        subtitleVariant: "secondary",
        amountLabel: `+${n}`,
        amountColor: "positive",
        usdEquivalent: `($${(n * YOINK_USD).toFixed(2)})`,
      };
    }
    default:
      return {
        title: txn.type,
        subtitle: relativeTime(txn.createdAt),
        subtitleVariant: "secondary",
        amountLabel: "",
        amountColor: "neutral",
        usdEquivalent: null,
      };
  }
}

// ── Grouping ──────────────────────────────────────────────────────────────────

interface TransactionSection {
  title: string;
  data: Transaction[];
}

function groupTransactions(transactions: Transaction[]): TransactionSection[] {
  const now        = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const ystdStart  = todayStart - 86_400_000;
  const weekStart  = todayStart - 6 * 86_400_000;

  const today: Transaction[]     = [];
  const yesterday: Transaction[] = [];
  const lastWeek: Transaction[]  = [];
  const older: Transaction[]     = [];

  for (const txn of transactions) {
    const ts = new Date(txn.createdAt).getTime();
    if (ts >= todayStart)      today.push(txn);
    else if (ts >= ystdStart)  yesterday.push(txn);
    else if (ts >= weekStart)  lastWeek.push(txn);
    else                       older.push(txn);
  }

  const sections: TransactionSection[] = [];
  if (today.length     > 0) sections.push({ title: "Today",     data: today });
  if (yesterday.length > 0) sections.push({ title: "Yesterday", data: yesterday });
  if (lastWeek.length  > 0) sections.push({ title: "Last Week", data: lastWeek });
  if (older.length     > 0) sections.push({ title: "Older",     data: older });
  return sections;
}

// ── Filter options ────────────────────────────────────────────────────────────

const FILTER_OPTIONS: { label: string; value: TransactionRange }[] = [
  { label: "Last Week",  value: "last_week"  },
  { label: "Last Month", value: "last_month" },
  { label: "Last Year",  value: "last_year"  },
];

// ── Screen ────────────────────────────────────────────────────────────────────

export default function TransactionsScreen() {
  const navigation = useNavigation();
  const insets     = useSafeAreaInsets();
  const { theme }  = useUnistyles();

  const [range,        setRange]        = useState<TransactionRange>("last_week");
  const [pendingRange, setPendingRange] = useState<TransactionRange>("last_week");
  const [filterOpen,   setFilterOpen]   = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);

  const openFilter = useCallback(() => {
    setPendingRange(range);
    setFilterOpen(true);
  }, [range]);

  useLayoutEffect(() => {
    navigation.setOptions({
      ...getAppHeaderOptions({
        title: "Transactions",
        leftAction: <AppHeaderBackButton />,
        leftAccessibilityLabel: "Go back",
        rightAction: <FilterButton onPress={openFilter} />,
        rightAccessibilityLabel: "Filter transactions",
      }),
    });
  }, [navigation, openFilter]);

  const load = useCallback((r: TransactionRange) => {
    setLoading(true);
    setError(null);
    fetchTransactions(r)
      .then(setTransactions)
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Failed to load transactions.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(range);
  }, [load, range]);

  const handleApply = useCallback(() => {
    setFilterOpen(false);
    setRange(pendingRange);
  }, [pendingRange]);

  // ── Sub-renders ─────────────────────────────────────────────────────────────

  const renderItem = useCallback(
    ({ item }: { item: Transaction }) => {
      const d = displayForTxn(item);

      const amountColor = (() => {
        switch (d.amountColor) {
          case "positive": return theme.colors.foundation.foreground.brand.tertiary;
          case "negative": return theme.colors.foundation.error.foreground.tertiary;
          case "pending":  return theme.colors.foundation.warning.foreground.tertiary;
          default:         return theme.colors.foundation.foreground.secondary;
        }
      })();

      return (
        <View style={styles.row}>
          <View style={styles.dot} />
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>{d.title}</Text>
            <Text
              style={[
                styles.rowSubtitle,
                d.subtitleVariant === "warning"
                  ? styles.rowSubtitleWarning
                  : styles.rowSubtitleSecondary,
              ]}
            >
              {d.subtitle}
            </Text>
          </View>
          <View style={styles.rowAmounts}>
            <Text style={[styles.rowAmount, { color: amountColor }]}>
              {d.amountLabel}
            </Text>
            {d.usdEquivalent != null && (
              <Text style={styles.rowUsd}>{d.usdEquivalent}</Text>
            )}
          </View>
        </View>
      );
    },
    [theme],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionListData<Transaction, TransactionSection> }) => (
      <View style={styles.sectionHeaderWrap}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>{section.data.length}</Text>
          </View>
        </View>
        <View style={styles.sectionDivider} />
      </View>
    ),
    [],
  );

  // ── Filter sheet (always mounted so it can animate in any screen state) ─────

  const filterSheet = (
    <BottomSheet visible={filterOpen} onClose={() => setFilterOpen(false)} minHeight={0.45}>
      <View style={styles.sheetContent}>
        <Text style={styles.sheetTitle}>Filter</Text>
        <View style={styles.sheetOptions}>
          {FILTER_OPTIONS.map((opt) => {
            const selected = pendingRange === opt.value;
            return (
              <Pressable
                key={opt.value}
                accessibilityRole="radio"
                accessibilityLabel={opt.label}
                accessibilityState={{ checked: selected }}
                style={[styles.filterOption, selected && styles.filterOptionSelected]}
                onPress={() => setPendingRange(opt.value)}
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    selected && styles.filterOptionTextSelected,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ paddingBottom: Math.max(insets.bottom, theme.spacing.normal) }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Apply filter"
            style={styles.applyButton}
            onPress={handleApply}
          >
            <Text style={styles.applyButtonText}>Apply</Text>
          </Pressable>
        </View>
      </View>
    </BottomSheet>
  );

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <AppScreenContainer>
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
        {filterSheet}
      </AppScreenContainer>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────

  if (error != null) {
    return (
      <AppScreenContainer>
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>Something went wrong</Text>
          <Text style={styles.emptyMessage}>{error}</Text>
        </View>
        {filterSheet}
      </AppScreenContainer>
    );
  }

  // ── Empty ────────────────────────────────────────────────────────────────────

  if (transactions.length === 0) {
    return (
      <AppScreenContainer>
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>No transactions yet</Text>
          <Text style={styles.emptyMessage}>
            Your Yoinks purchases, unlocks, and earnings will appear here.
          </Text>
        </View>
        {filterSheet}
      </AppScreenContainer>
    );
  }

  // ── List ─────────────────────────────────────────────────────────────────────

  const sections = groupTransactions(transactions);

  return (
    <AppScreenContainer>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + theme.spacing.xlarge },
        ]}
      />
      {filterSheet}
    </AppScreenContainer>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create((theme) => ({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xlarge,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.foundation.foreground.primary,
    marginBottom: theme.spacing.small,
    textAlign: "center",
  },
  emptyMessage: {
    fontSize: 14,
    fontWeight: "400",
    color: theme.colors.foundation.foreground.secondary,
    textAlign: "center",
    lineHeight: 20,
  },

  // ── List ──────────────────────────────────────────────────────────────────
  listContent: {
    paddingHorizontal: theme.spacing.large,
  },

  // ── Section header ────────────────────────────────────────────────────────
  sectionHeaderWrap: {
    paddingTop: theme.spacing.xlarge,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: theme.spacing.small,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: theme.colors.foundation.foreground.primary,
  },
  sectionBadge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.foundation.foreground.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.xxsmall,
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.foundation.background.primary,
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.foundation.foreground.quaternary,
    marginBottom: theme.spacing.xxsmall,
  },

  // ── Transaction row ───────────────────────────────────────────────────────
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.normal,
    gap: theme.spacing.small,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.foundation.background.alpha10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.foundation.message.foreground.secondary,
    flexShrink: 0,
    marginTop: 2,
    alignSelf: "flex-start",
  },
  rowBody: {
    flex: 1,
    gap: 3,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: theme.colors.foundation.foreground.primary,
  },
  rowSubtitle: {
    fontSize: 12,
    fontWeight: "400",
  },
  rowSubtitleSecondary: {
    color: theme.colors.foundation.foreground.secondary,
  },
  rowSubtitleWarning: {
    color: theme.colors.foundation.warning.foreground.tertiary,
  },
  rowAmounts: {
    alignItems: "flex-end",
    gap: 2,
    flexShrink: 0,
  },
  rowAmount: {
    fontSize: 15,
    fontWeight: "600",
  },
  rowUsd: {
    fontSize: 11,
    fontWeight: "400",
    color: theme.colors.foundation.foreground.secondary,
  },

  // ── Filter sheet ──────────────────────────────────────────────────────────
  sheetContent: {
    gap: theme.spacing.normal,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.foundation.foreground.primary,
    textAlign: "center",
    marginBottom: theme.spacing.xsmall,
  },
  sheetOptions: {
    gap: theme.spacing.small,
  },
  filterOption: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.normal,
    borderRadius: theme.spacing.xlarge,
    borderWidth: 1.5,
    borderColor: theme.colors.foundation.foreground.quaternary,
    backgroundColor: "transparent",
  },
  filterOptionSelected: {
    backgroundColor: theme.colors.foundation.foreground.primary,
    borderColor: theme.colors.foundation.foreground.primary,
  },
  filterOptionText: {
    fontSize: 16,
    fontWeight: "500",
    color: theme.colors.foundation.foreground.primary,
  },
  filterOptionTextSelected: {
    color: theme.colors.foundation.background.primary,
  },
  applyButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.normal,
    borderRadius: theme.spacing.xlarge,
    backgroundColor: theme.colors.foundation.foreground.primary,
    marginTop: theme.spacing.small,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.foundation.background.primary,
  },
}));
