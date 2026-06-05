import HappyFaceIcon from "@/assets/icons/happy-face.svg";
import SoonIcon from "@/assets/icons/soon.svg";
import StarIcon from "@/assets/icons/star.svg";
import type { WalletOfferingPromoTag } from "@/wallet/walletTypes";
import { Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

export type WalletBuyOptionProps = {
  title: string;
  detail: string;
  priceLabel: string;
  selected?: boolean;
  extraDetails?: WalletOfferingPromoTag;
};

/**
 * Pack row matching legacy `BuyOptionComponent` + Figma `buy.option` (104pt, badge slot, 16/12/20 type).
 */
export function WalletBuyOption({
  title,
  detail,
  priceLabel,
  selected = false,
  extraDetails,
}: WalletBuyOptionProps) {
  const { theme } = useUnistyles();
  const isComingSoon = extraDetails === "coming_soon";
  const titleStyle = isComingSoon ? styles.titleDisabled : styles.title;
  const detailStyle = isComingSoon ? styles.detailDisabled : styles.detail;
  const priceStyle = isComingSoon ? styles.priceDisabled : styles.price;

  return (
    <View
      style={[
        styles.shell,
        selected && !isComingSoon ? styles.shellSelected : null,
        isComingSoon ? styles.shellDisabled : null,
      ]}
    >
      <View style={styles.badgeRow}>
        {extraDetails === "popular" ? (
          <View style={styles.badgeBlue}>
            <HappyFaceIcon
              color={theme.colors.common.white}
              height={14}
              width={14}
            />
            <Text style={styles.badgeLabel}>Most popular</Text>
          </View>
        ) : null}
        {extraDetails === "value" ? (
          <View style={styles.badgeOrange}>
            <StarIcon
              color={theme.colors.common.white}
              height={14}
              width={14}
            />
            <Text style={styles.badgeLabel}>Best value</Text>
          </View>
        ) : null}
        {extraDetails === "coming_soon" ? (
          <View style={styles.badgeGray}>
            <SoonIcon
              color={theme.colors.foundation.foreground.quaternary}
              height={14}
              width={14}
            />
            <Text style={styles.badgeLabel}>Coming soon</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.dealCol}>
          <Text style={titleStyle}>{title}</Text>
          <Text style={detailStyle}>{detail}</Text>
        </View>
        <Text style={priceStyle}>{priceLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  shell: {
    height: 104,
    width: "100%",
    borderRadius: 12,
    marginBottom: theme.spacing.normal,
    padding: theme.spacing.normal,
    backgroundColor: theme.colors.foundation.background.skeletonBone,
    borderWidth: 0,
    justifyContent: "space-between",
  },
  shellSelected: {
    borderWidth: 2,
    borderColor: theme.colors.foundation.foreground.primary,
  },
  shellDisabled: {
    backgroundColor: theme.colors.foundation.background.primary,
    borderWidth: 2,
    borderColor: theme.colors.foundation.background.secondary,
  },
  badgeRow: {
    minHeight: 28,
    width: "100%",
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  badgeBlue: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xxsmall,
    paddingVertical: theme.spacing.xxsmall,
    paddingHorizontal: theme.spacing.small,
    borderRadius: theme.spacing.xxsmall,
    backgroundColor: theme.colors.foundation.message.foreground.quinary,
  },
  badgeOrange: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xxsmall,
    paddingVertical: theme.spacing.xxsmall,
    paddingHorizontal: theme.spacing.small,
    borderRadius: theme.spacing.xxsmall,
    backgroundColor: theme.colors.foundation.warning.foreground.quinary,
  },
  badgeGray: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xxsmall,
    paddingVertical: theme.spacing.xxsmall,
    paddingHorizontal: theme.spacing.small,
    borderRadius: theme.spacing.xxsmall,
    backgroundColor: theme.colors.foundation.background.secondary,
  },
  badgeLabel: {
    fontSize: theme.spacing.small,
    fontWeight: "700",
    color: theme.colors.foundation.foreground.primary,
  },
  bottomRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    width: "100%",
  },
  dealCol: {
    flexShrink: 1,
    gap: theme.spacing.xxsmall,
    marginRight: theme.spacing.small,
  },
  title: {
    fontSize: theme.spacing.normal,
    fontWeight: "600",
    color: theme.colors.foundation.foreground.primary,
  },
  titleDisabled: {
    fontSize: theme.spacing.normal,
    fontWeight: "600",
    color: theme.colors.foundation.foreground.quaternary,
  },
  detail: {
    fontSize: theme.spacing.small,
    lineHeight: theme.spacing.normal,
    color: theme.colors.foundation.foreground.tertiary,
  },
  detailDisabled: {
    fontSize: theme.spacing.small,
    lineHeight: theme.spacing.normal,
    color: theme.colors.foundation.foreground.quaternary,
  },
  price: {
    fontSize: theme.spacing.large,
    fontWeight: "600",
    color: theme.colors.foundation.foreground.primary,
  },
  priceDisabled: {
    fontSize: theme.spacing.large,
    fontWeight: "600",
    color: theme.colors.foundation.foreground.quaternary,
  },
}));
