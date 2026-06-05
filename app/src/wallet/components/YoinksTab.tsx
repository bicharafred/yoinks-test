import {
  WalletBuyOption,
  WalletLegalLinks,
  WalletPrimaryButton,
} from "@/components/wallet";
import type { WalletOffering } from "@/wallet/walletTypes";
import { formatOfferingPrice } from "@/wallet/walletUtils";
import { Pressable, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

type Props = {
  offerings: WalletOffering[];
  selectedOfferingType: string;
  buying: boolean;
  bootstrapping: boolean;
  continueDisabled: boolean;
  onSelectOffering: (type: string) => void;
  onContinue: () => void;
  onPressLegalTerms: () => void;
  onPressLegalPrivacy: () => void;
};

export function YoinksTab({
  offerings,
  selectedOfferingType,
  buying,
  bootstrapping,
  continueDisabled,
  onSelectOffering,
  onContinue,
  onPressLegalTerms,
  onPressLegalPrivacy,
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Add Yoinks</Text>

      <View style={styles.narrowColumn}>
        {offerings.map((o) => {
          const comingSoon = o.promoTag === "coming_soon";
          return (
            <Pressable
              key={o.type}
              accessibilityHint="Choose this Yoinks pack"
              accessibilityRole="button"
              accessibilityState={{
                selected: o.type === selectedOfferingType,
                disabled: comingSoon,
              }}
              disabled={buying || bootstrapping || comingSoon}
              onPress={() => {
                if (!comingSoon) {
                  onSelectOffering(o.type);
                }
              }}
            >
              <WalletBuyOption
                detail={o.detail}
                extraDetails={o.promoTag}
                priceLabel={formatOfferingPrice(o.amountInCents, o.currencyCode)}
                selected={o.type === selectedOfferingType}
                title={o.title}
              />
            </Pressable>
          );
        })}
      </View>

      <View style={styles.narrowColumn}>
        <View style={styles.continueWrap}>
          <WalletPrimaryButton
            accessibilityHint="Opens checkout for the selected pack"
            disabled={continueDisabled}
            label="Continue"
            onPress={onContinue}
          />
        </View>

        <WalletLegalLinks
          onPrivacyPress={onPressLegalPrivacy}
          onTermsPress={onPressLegalTerms}
        />
      </View>
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
  continueWrap: {
    width: "100%",
    marginTop: theme.spacing.normal,
  },
}));
