import { AppHeaderBackButton } from "@/components/navigation/app-header-back-button";
import { AppScreenContainer } from "@/components/navigation/app-screen-container";
import {
  UnblockAuthorDocument,
  type UnblockAuthorMutation,
  type UnblockAuthorMutationVariables,
  type User,
} from "@/gql/graphql";
import { RootMachineContext } from "@/machines/rootMachine";
import { getAppHeaderOptions } from "@/navigation/app-header-options";
import {
  evictCachedAuthorMomentsList,
  evictCachedFeedMomentsList,
} from "@/services/authorMomentsCache";
import { client } from "@/services/client";
import { getBlockedUsersDetail, type ModerationUser } from "@/services/moderationService";
import { Image } from "expo-image";
import { useNavigation } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  View,
  type ListRenderItem,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import Toast from "react-native-toast-message";

export default function BlockedUsersScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const rootRef = RootMachineContext.useActorRef();

  useLayoutEffect(() => {
    navigation.setOptions({
      ...getAppHeaderOptions({
        title: "Blocked Users",
        leftAction: <AppHeaderBackButton />,
        leftAccessibilityLabel: "Go back",
      }),
    });
  }, [navigation]);

  const author = RootMachineContext.useSelector(
    (state) => state.context.author as User | null,
  );

  const [blockedUsers, setBlockedUsers] = useState<ModerationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isUnblocking, setIsUnblocking] = useState(false);

  useEffect(() => {
    setLoading(true);
    getBlockedUsersDetail()
      .then(setBlockedUsers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleToggleRow = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  const handleUnblockPress = useCallback(async () => {
    if (author == null || selectedId == null || isUnblocking) return;

    const target = blockedUsers.find((u) => u.id === selectedId);
    setIsUnblocking(true);
    try {
      const result = await client.mutate<UnblockAuthorMutation, UnblockAuthorMutationVariables>({
        mutation: UnblockAuthorDocument,
        variables: { input: { blockedAuthorId: selectedId } },
      });

      if (result.error) throw new Error(result.error.message);

      const updatedFromServer = result.data?.unblockAuthor;
      if (updatedFromServer == null) throw new Error("No user returned from unblock.");

      rootRef.send({ type: "SET_AUTHOR", author: { ...(author as User), ...updatedFromServer } });
      evictCachedFeedMomentsList(author.id);
      evictCachedAuthorMomentsList(selectedId);

      setBlockedUsers((prev) => prev.filter((u) => u.id !== selectedId));
      setSelectedId(null);

      const handle = target ? `@${target.handle}` : "User";
      Toast.show({ type: "success", text1: `${handle} has been unblocked.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not unblock user.";
      Alert.alert("Unblock failed", message);
    } finally {
      setIsUnblocking(false);
    }
  }, [author, isUnblocking, rootRef, selectedId, blockedUsers]);

  const renderItem = useCallback<ListRenderItem<ModerationUser>>(
    ({ item }) => {
      const selected = selectedId === item.id;
      return (
        <Pressable
          onPress={() => handleToggleRow(item.id)}
          disabled={isUnblocking}
          style={[styles.row, selected && styles.rowSelected]}
          accessibilityRole="button"
          accessibilityLabel={`Blocked user ${item.name}`}
          accessibilityState={{ selected, disabled: isUnblocking }}
        >
          <View style={styles.avatar}>
            {item.avatar ? (
              <Image source={{ uri: item.avatar }} style={styles.avatarImg} contentFit="cover" />
            ) : (
              <View style={styles.avatarPlaceholder} />
            )}
          </View>
          <View style={styles.rowInfo}>
            <Text style={styles.rowName}>{item.name}</Text>
            <Text style={styles.rowHandle}>@{item.handle}</Text>
          </View>
          {selected && (
            <View style={styles.checkmark}>
              <Text style={styles.checkmarkText}>✓</Text>
            </View>
          )}
        </Pressable>
      );
    },
    [handleToggleRow, isUnblocking, selectedId],
  );

  if (author == null) {
    return (
      <AppScreenContainer>
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>Unavailable</Text>
          <Text style={styles.emptyMessage}>Signed-in account data is unavailable. Try signing in again.</Text>
        </View>
      </AppScreenContainer>
    );
  }

  if (loading) {
    return (
      <AppScreenContainer>
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      </AppScreenContainer>
    );
  }

  if (blockedUsers.length === 0) {
    return (
      <AppScreenContainer>
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>No blocked users</Text>
          <Text style={styles.emptyMessage}>You have not blocked anyone yet.</Text>
        </View>
      </AppScreenContainer>
    );
  }

  const unblockDisabled = selectedId == null || isUnblocking;

  return (
    <AppScreenContainer>
      <View style={styles.root}>
        <FlatList
          data={blockedUsers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
        />
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, theme.spacing.normal) }]}>
          <Pressable
            onPress={() => { void handleUnblockPress(); }}
            disabled={unblockDisabled}
            style={[styles.unblockButton, unblockDisabled && styles.unblockButtonDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Unblock selected user"
            accessibilityState={{ disabled: unblockDisabled, busy: isUnblocking }}
          >
            {isUnblocking ? (
              <ActivityIndicator color={theme.colors.foundation.background.primary} />
            ) : (
              <Text style={[styles.unblockLabel, unblockDisabled && styles.unblockLabelDisabled]}>
                Unblock
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </AppScreenContainer>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: { flex: 1 },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.large,
    paddingTop: theme.spacing.normal,
    paddingBottom: theme.spacing.small,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.small,
    paddingHorizontal: theme.spacing.normal,
    marginBottom: theme.spacing.small,
    borderRadius: theme.spacing.small,
    backgroundColor: theme.colors.foundation.background.secondary,
    gap: theme.spacing.normal,
  },
  rowSelected: {
    borderWidth: 2,
    borderColor: theme.colors.foundation.foreground.primary,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    flexShrink: 0,
  },
  avatarImg: { width: 44, height: 44 },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    backgroundColor: theme.colors.foundation.background.alpha10,
  },
  rowInfo: { flex: 1 },
  rowName: {
    color: theme.colors.foundation.foreground.primary,
    fontSize: 15,
    fontWeight: "600",
  },
  rowHandle: {
    color: theme.colors.foundation.foreground.secondary,
    fontSize: 13,
    fontWeight: "400",
    marginTop: 2,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.foundation.foreground.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmarkText: {
    color: theme.colors.foundation.background.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.large,
  },
  emptyTitle: {
    color: theme.colors.foundation.foreground.primary,
    fontSize: 18,
    fontWeight: "600",
    marginBottom: theme.spacing.small,
    textAlign: "center",
  },
  emptyMessage: {
    textAlign: "center",
    color: theme.colors.foundation.foreground.secondary,
    fontSize: 14,
    fontWeight: "500",
  },
  footer: {
    paddingHorizontal: theme.spacing.large,
    paddingTop: theme.spacing.small,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.foundation.foreground.secondary,
  },
  unblockButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.normal,
    borderRadius: theme.spacing.large,
    backgroundColor: theme.colors.foundation.foreground.primary,
  },
  unblockButtonDisabled: { opacity: 0.45 },
  unblockLabel: {
    color: theme.colors.foundation.background.primary,
    fontSize: 16,
    fontWeight: "600",
  },
  unblockLabelDisabled: { opacity: 0.9 },
}));
