import {
  Pressable,
  Text,
  View,
} from "react-native";
import { StyleSheet } from "react-native-unistyles";

export type WalletTabsValue = "yoinks" | "balance";

export type WalletTabsProps = {
  value: WalletTabsValue;
  onChange: (next: WalletTabsValue) => void;
};

/** Yoinks / Balance tabs: full-width row, brand underline on active (legacy + Figma `tabs.menu`). */
export function WalletTabs({ value, onChange }: WalletTabsProps) {
  return (
    <View style={styles.row}>
      <WalletTabChip
        accessibilityHint="Shows Yoinks balance and packs"
        label="Yoinks"
        selected={value === "yoinks"}
        onPress={() => {
          onChange("yoinks");
        }}
      />
      <WalletTabChip
        accessibilityHint="Shows creator earnings and payout history"
        label="Earn"
        selected={value === "balance"}
        onPress={() => {
          onChange("balance");
        }}
      />
    </View>
  );
}

function WalletTabChip({
  label,
  selected,
  onPress,
  accessibilityHint,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityHint?: string;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipActive]}
      hitSlop={8}
    >
      <Text style={[styles.label, selected && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: "row",
    width: "100%",
    alignItems: "stretch",
    marginBottom: 20,
  },
  chip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    minWidth: 120,
  },
  chipActive: {
    borderBottomColor: theme.colors.foundation.foreground.brand.tertiary,
  },
  label: {
    fontSize: theme.spacing.xlarge,
    fontWeight: "400",
    color: theme.colors.foundation.foreground.secondary,
  },
  labelActive: {
    fontWeight: "700",
    color: theme.colors.foundation.foreground.primary,
  },
}));
