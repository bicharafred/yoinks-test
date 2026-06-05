import React, { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { RootMachineContext } from "@/machines/rootMachine";
import { useWalletTransferableYoinks } from "@/hooks/useWalletTransferableYoinks";
import { InviteSheet } from "@/components/invite-sheet";
import { InviteContactsSheet } from "@/components/invite-contacts-sheet";
import KoinsIcon from "@/assets/icons/koins.fill.svg";
import PersonIcon from "@/assets/icons/circle.person.fill.svg";

export function ProfileInviteSection() {
  const { theme } = useUnistyles();

  const walletMachineRef = RootMachineContext.useSelector(
    (state) => state.context.walletMachineRef,
  );
  const yoinks = useWalletTransferableYoinks(walletMachineRef);

  const [inviteSheetVisible, setInviteSheetVisible] = useState(false);
  const [contactsSheetVisible, setContactsSheetVisible] = useState(false);

  const handleInvitePress = useCallback(() => {
    setInviteSheetVisible(true);
  }, []);

  const handleContactsOpen = useCallback(() => {
    setContactsSheetVisible(true);
  }, []);

  const handleCopied = useCallback(() => {
    Toast.show({
      type: "success",
      text1: "Link copied!",
      text2: "Share it with friends to earn Yoinks when they join.",
      visibilityTime: 4000,
    });
  }, []);

  const handleInvitesSent = useCallback(
    (count: number) => {
      walletMachineRef?.send({ type: "REFRESH_BALANCE" });

      if (count > 0) {
        // MOCK ONLY: In the simulator we immediately credit Yoinks when an invite is sent.
        // Production behavior is different — see referralService.ts for the full lifecycle.
        // The inviter only earns Yoinks after the invited person signs up and becomes active.
        Toast.show({
          type: "success",
          text1: `${count} invite${count === 1 ? "" : "s"} sent!`,
          text2: `+${count} Yoink${count === 1 ? "" : "s"} added (simulator only — real rewards arrive when friends join).`,
          visibilityTime: 4000,
        });
      } else {
        Toast.show({
          type: "info",
          text1: "Invites sent!",
          text2: "Yoinks are earned when your friends join Yoinks.",
          visibilityTime: 4000,
        });
      }
    },
    [walletMachineRef],
  );

  return (
    <>
      <View style={styles.container}>
        <View style={styles.balancePill}>
          <KoinsIcon
            width={18}
            height={18}
            color={theme.colors.foundation.foreground.brand.tertiary}
          />
          <Text style={styles.balanceText}>{yoinks}</Text>
          <Text style={styles.balanceLabel}>Yoinks</Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.inviteButton,
            pressed && styles.pressed,
          ]}
          onPress={handleInvitePress}
          accessibilityRole="button"
          accessibilityLabel="Invite Friends"
        >
          <PersonIcon
            width={18}
            height={18}
            color={theme.colors.foundation.foreground.primary}
          />
          <Text style={styles.inviteButtonText}>Invite Friends</Text>
        </Pressable>
      </View>

      <InviteSheet
        visible={inviteSheetVisible}
        onClose={() => setInviteSheetVisible(false)}
        onContactsPress={handleContactsOpen}
        onCopied={handleCopied}
      />

      <InviteContactsSheet
        visible={contactsSheetVisible}
        onClose={() => setContactsSheetVisible(false)}
        onInvitesSent={handleInvitesSent}
      />
    </>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xsmall,
    marginTop: theme.spacing.normal,
  },
  balancePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xxsmall,
    paddingHorizontal: theme.spacing.small,
    paddingVertical: theme.spacing.xsmall,
    borderRadius: 120, // pill shape — no token for this structural radius
    backgroundColor: theme.colors.foundation.background.secondary,
  },
  balanceText: {
    color: theme.colors.foundation.foreground.primary,
    fontSize: 14, // raw — no typography token; matches existing feed overlay text size
    fontWeight: "700",
  },
  balanceLabel: {
    color: theme.colors.foundation.foreground.secondary,
    fontSize: 14, // raw — same as above
    fontWeight: "400",
  },
  inviteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xxsmall,
    paddingHorizontal: theme.spacing.small,
    paddingVertical: theme.spacing.xsmall,
    borderRadius: 120, // pill shape — no token for this structural radius
    borderWidth: 1,
    borderColor: theme.colors.foundation.foreground.primary,
  },
  inviteButtonText: {
    color: theme.colors.foundation.foreground.primary,
    fontSize: 14, // raw — no typography token; matches balance pill text
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.7,
  },
}));
