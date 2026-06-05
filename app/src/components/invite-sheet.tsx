import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { BottomSheet } from "@/components/bottom-sheet";
import PersonIcon from "@/assets/icons/circle.person.fill.svg";
import LinkIcon from "@/assets/icons/share.svg";
import { fetchReferral } from "@/services/referralService";

interface InviteSheetProps {
  visible: boolean;
  onClose: () => void;
  onContactsPress: () => void;
  onCopied: () => void;
}

export function InviteSheet({
  visible,
  onClose,
  onContactsPress,
  onCopied,
}: InviteSheetProps) {
  const { theme } = useUnistyles();
  const [isCopying, setIsCopying] = useState(false);

  const handleCopyLink = useCallback(async () => {
    setIsCopying(true);
    try {
      // fetchReferral returns a DEV fallback when the mock server is unreachable,
      // so info.referralLink is always available in __DEV__ builds.
      const info = await fetchReferral();
      try {
        await Clipboard.setStringAsync(info.referralLink);
      } catch (clipboardError) {
        if (!__DEV__) throw clipboardError;
        // Clipboard unavailable in this Android dev environment — log and continue.
        console.warn("[invite] Clipboard.setStringAsync failed:", clipboardError);
        console.log("[invite] referral link:", info.referralLink);
      }
      onClose();
      onCopied();
    } catch {
      Alert.alert("Error", "Failed to copy invite link. Please try again.");
    } finally {
      setIsCopying(false);
    }
  }, [onClose, onCopied]);

  const handleContactsPress = useCallback(() => {
    onClose();
    setTimeout(() => {
      Alert.alert(
        "Access Contacts",
        "Yoinks would like to access your contacts to help you invite friends.",
        [
          { text: "Not Now", style: "cancel" },
          { text: "Give Access", onPress: onContactsPress },
        ],
      );
    }, 350);
  }, [onClose, onContactsPress]);

  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeight={0.45}>
      <Text style={styles.title}>From where do you want to{"\n"}invite friends?</Text>
      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.outlinedButton, pressed && styles.pressed]}
          onPress={handleContactsPress}
        >
          <PersonIcon width={20} height={20} color={theme.colors.foundation.foreground.primary} />
          <Text style={styles.outlinedButtonText}>Invite From Contacts</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.filledButton, pressed && styles.pressed]}
          onPress={handleCopyLink}
          disabled={isCopying}
        >
          {isCopying ? (
            <ActivityIndicator color={theme.colors.common.white} />
          ) : (
            <>
              <LinkIcon width={20} height={20} color={theme.colors.common.white} />
              <Text style={styles.filledButtonText}>Copy Invite Link</Text>
            </>
          )}
        </Pressable>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create((theme) => ({
  title: {
    color: theme.colors.foundation.foreground.primary,
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: theme.spacing.xlarge,
    lineHeight: 28,
  },
  actions: {
    gap: theme.spacing.small,
  },
  outlinedButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xsmall,
    paddingVertical: theme.spacing.normal,
    borderRadius: theme.spacing.xlarge,
    borderWidth: 1,
    borderColor: theme.colors.foundation.foreground.primary,
  },
  filledButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xsmall,
    paddingVertical: theme.spacing.normal,
    borderRadius: theme.spacing.xlarge,
    backgroundColor: theme.colors.foundation.foreground.brand.tertiary,
  },
  outlinedButtonText: {
    color: theme.colors.foundation.foreground.primary,
    fontSize: 16,
    fontWeight: "600",
  },
  filledButtonText: {
    color: theme.colors.common.white,
    fontSize: 16,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.75,
  },
}));
