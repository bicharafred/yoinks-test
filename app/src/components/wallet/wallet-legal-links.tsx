import { Pressable, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

export type WalletLegalLinksProps = {
  onTermsPress?: () => void;
  onPrivacyPress?: () => void;
};

const TERMS_COPY = "Terms of use";
const PRIVACY_COPY = "Privacy Policy";

export function WalletLegalLinks({
  onTermsPress,
  onPrivacyPress,
}: WalletLegalLinksProps) {
  return (
    <View style={styles.block}>
      <Text style={styles.line}>For more information review our</Text>
      <View style={styles.linkLine}>
        {onTermsPress != null ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={TERMS_COPY}
            onPress={onTermsPress}
            hitSlop={6}
          >
            <Text style={styles.link}>{TERMS_COPY}</Text>
          </Pressable>
        ) : (
          <Text style={styles.link}>{TERMS_COPY}</Text>
        )}
        <Text style={styles.ampersand}> & </Text>
        {onPrivacyPress != null ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={PRIVACY_COPY}
            onPress={onPrivacyPress}
            hitSlop={6}
          >
            <Text style={styles.link}>{PRIVACY_COPY}</Text>
          </Pressable>
        ) : (
          <Text style={styles.link}>{PRIVACY_COPY}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  block: {
    marginTop: theme.spacing.normal,
    alignItems: "center",
    rowGap: 0,
  },
  line: {
    fontSize: theme.spacing.normal,
    fontWeight: "400",
    textAlign: "center",
    lineHeight: theme.spacing.normal * 1.25,
    color: theme.colors.foundation.foreground.tertiary,
  },
  linkLine: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
  },
  link: {
    fontSize: theme.spacing.normal,
    fontWeight: "400",
    lineHeight: theme.spacing.normal * 1.25,
    color: theme.colors.foundation.foreground.primary,
  },
  ampersand: {
    fontSize: theme.spacing.normal,
    fontWeight: "400",
    lineHeight: theme.spacing.normal * 1.25,
    color: theme.colors.foundation.foreground.tertiary,
  },
}));
