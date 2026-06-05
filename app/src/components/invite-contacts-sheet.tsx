import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { BottomSheet } from "@/components/bottom-sheet";
import { fetchContacts, sendInvites, type ReferralContact } from "@/services/referralService";
import CheckIcon from "@/assets/icons/circle.check.fill.svg";

interface InviteContactsSheetProps {
  visible: boolean;
  onClose: () => void;
  onInvitesSent: (count: number) => void;
}

export function InviteContactsSheet({
  visible,
  onClose,
  onInvitesSent,
}: InviteContactsSheetProps) {
  const { theme } = useUnistyles();
  const [contacts, setContacts] = useState<ReferralContact[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setIsLoading(true);
    fetchContacts()
      .then(setContacts)
      .catch(() => setContacts([]))
      .finally(() => setIsLoading(false));
  }, [visible]);

  const toggleContact = useCallback((id: string, alreadyInvited: boolean) => {
    if (alreadyInvited) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSend = useCallback(async () => {
    if (selected.size === 0) return;
    setIsSending(true);
    try {
      const result = await sendInvites(Array.from(selected));
      setSelected(new Set());
      onClose();
      onInvitesSent(result.invited);
    } catch {
      // swallow — parent shows generic toast
    } finally {
      setIsSending(false);
    }
  }, [selected, onClose, onInvitesSent]);

  const renderContact = useCallback(
    ({ item }: { item: ReferralContact }) => {
      const isSelected = selected.has(item.id);
      const isInvited = item.invited;
      return (
        <Pressable
          style={({ pressed }) => [
            styles.contactRow,
            pressed && !isInvited && styles.pressed,
          ]}
          onPress={() => toggleContact(item.id, isInvited)}
          disabled={isInvited}
        >
          <View style={styles.contactInfo}>
            <Text style={styles.contactName}>{item.name}</Text>
            {isInvited && (
              <Text style={styles.invitedBadge}>Already invited</Text>
            )}
          </View>
          {isInvited ? (
            <CheckIcon
              width={22}
              height={22}
              color={theme.colors.foundation.foreground.success.tertiary}
            />
          ) : (
            <View
              style={[
                styles.checkbox,
                isSelected && styles.checkboxSelected,
              ]}
            >
              {isSelected && (
                <CheckIcon
                  width={16}
                  height={16}
                  color={theme.colors.common.white}
                />
              )}
            </View>
          )}
        </Pressable>
      );
    },
    [selected, toggleContact, theme],
  );

  const sendLabel =
    selected.size > 0
      ? `Send ${selected.size} Invite${selected.size === 1 ? "" : "s"}`
      : "Select contacts to invite";

  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeight={0.75}>
      <Text style={styles.title}>Invite Friends</Text>
      {isLoading ? (
        <ActivityIndicator
          color={theme.colors.foundation.foreground.primary}
          style={styles.loader}
        />
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(c) => c.id}
          renderItem={renderContact}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          style={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
      <Pressable
        style={({ pressed }) => [
          styles.sendButton,
          selected.size === 0 && styles.sendButtonDisabled,
          pressed && selected.size > 0 && styles.pressed,
        ]}
        onPress={handleSend}
        disabled={selected.size === 0 || isSending}
      >
        {isSending ? (
          <ActivityIndicator color={theme.colors.common.white} />
        ) : (
          <Text style={styles.sendButtonText}>{sendLabel}</Text>
        )}
      </Pressable>
    </BottomSheet>
  );
}

const styles = StyleSheet.create((theme) => ({
  title: {
    color: theme.colors.foundation.foreground.primary,
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: theme.spacing.normal,
  },
  loader: {
    marginVertical: theme.spacing.xlarge,
  },
  list: {
    flexGrow: 0,
    marginBottom: theme.spacing.normal,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.small,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    color: theme.colors.foundation.foreground.primary,
    fontSize: 16,
    fontWeight: "500",
  },
  invitedBadge: {
    color: theme.colors.foundation.foreground.success.tertiary,
    fontSize: 12,
    fontWeight: "400",
    marginTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.foundation.foreground.tertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    backgroundColor: theme.colors.foundation.foreground.brand.tertiary,
    borderColor: theme.colors.foundation.foreground.brand.tertiary,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.foundation.background.alpha10,
  },
  sendButton: {
    paddingVertical: theme.spacing.normal,
    borderRadius: theme.spacing.xlarge,
    backgroundColor: theme.colors.foundation.foreground.brand.tertiary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.spacing.xsmall,
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.foundation.background.alpha30,
  },
  sendButtonText: {
    color: theme.colors.common.white,
    fontSize: 16,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.75,
  },
}));
