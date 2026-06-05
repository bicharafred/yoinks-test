import { AppHeaderBackButton } from "@/components/navigation/app-header-back-button";
import { AppScreenContainer } from "@/components/navigation/app-screen-container";
import { getAppHeaderOptions } from "@/navigation/app-header-options";
import {
  getHiddenCreators,
  unhideCreator,
  type ModerationUser,
} from "@/services/moderationService";
import { client } from "@/services/client";
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

export default function HiddenCreatorsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();

  useLayoutEffect(() => {
    navigation.setOptions({
      ...getAppHeaderOptions({
        title: "Hidden Creators",
        leftAction: <AppHeaderBackButton />,
        leftAccessibilityLabel: "Go back",
      }),
    });
  }, [navigation]);

  const [creators, setCreators] = useState<ModerationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isUnhiding, setIsUnhiding] = useState(false);

  useEffect(() => {
    setLoading(true);
    getHiddenCreators()
      .then(setCreators)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleToggleRow = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  const handleUnhidePress = useCallback(async () => {
    if (selectedId == null || isUnhiding) return;

    const target = creators.find((u) => u.id === selectedId);
    setIsUnhiding(true);
    try {
      await unhideCreator(selectedId);
      // Allow their posts to reappear on next feed refresh — no cache restore needed
      // (pull-to-refresh will re-fetch from server which now includes them again).
      client.cache.evict({ fieldName: "getFeedMoments" });
      client.cache.gc();

      setCreators((prev) => prev.filter((u) => u.id !== selectedId));
      setSelectedId(null);

      const handle = target ? `@${target.handle}` : "Creator";
      Toast.show({ type: "success", text1: `${handle} has been unhidden.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not unhide creator.";
      Alert.alert("Unhide failed", message);
    } finally {
      setIsUnhiding(false);
    }
  }, [selectedId, isUnhiding, creators]);

  const renderItem = useCallback<ListRenderItem<ModerationUser>>(
    ({ item }) => {
      const selected = selectedId === item.id;
      return (
        <Pressable
          onPress={() => handleToggleRow(item.id)}
          disabled={isUnhiding}
          style={[styles.row, selected && styles.rowSelected]}
          accessibilityRole="button"
          accessibilityLabel={`Hidden creator ${item.name}`}
          accessibilityState={{ selected, disabled: isUnhiding }}
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
    [handleToggleRow, isUnhiding, selectedId],
  );

  if (loading) {
    return (
      <AppScreenContainer>
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      </AppScreenContainer>
    );
  }

  if (creators.length === 0) {
    return (
      <AppScreenContainer>
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>No hidden creators</Text>
          <Text style={styles.emptyMessage}>
            Creators you hide via "I Don't like this" will appear here.
          </Text>
        </View>
      </AppScreenContainer>
    );
  }

  const unhideDisabled = selectedId == null || isUnhiding;

  return (
    <AppScreenContainer>
      <View style={styles.root}>
        <FlatList
          data={creators}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
        />
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, theme.spacing.normal) }]}>
          <Pressable
            onPress={() => { void handleUnhidePress(); }}
            disabled={unhideDisabled}
            style={[styles.unhideButton, unhideDisabled && styles.unhideButtonDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Unhide selected creator"
            accessibilityState={{ disabled: unhideDisabled, busy: isUnhiding }}
          >
            {isUnhiding ? (
              <ActivityIndicator color={theme.colors.foundation.background.primary} />
            ) : (
              <Text style={[styles.unhideLabel, unhideDisabled && styles.unhideLabelDisabled]}>
                Unhide
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
  unhideButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.normal,
    borderRadius: theme.spacing.large,
    backgroundColor: theme.colors.foundation.foreground.primary,
  },
  unhideButtonDisabled: { opacity: 0.45 },
  unhideLabel: {
    color: theme.colors.foundation.background.primary,
    fontSize: 16,
    fontWeight: "600",
  },
  unhideLabelDisabled: { opacity: 0.9 },
}));
