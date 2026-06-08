import React, { useCallback } from "react";
import {
  FlatList,
  type ListRenderItem,
  Pressable,
  RefreshControl,
  StyleSheet as RNStyleSheet,
  View,
} from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { EmptyState } from "@/components/empty-state/empty-state";
import { NotificationCard } from "@/components/notifications/notification-card";

export interface NotificationListItem {
  id: string;
  momentSequence: string;
  notificationId: string;
  isUnread: boolean;
  /** Notification payload type from API */
  type?: string;
  avatarUrl?: string;
  rightImageUrl?: string;
  /** Relative time label (same role as legacy Luxon duration formatting). */
  time?: string;
  subtitle?: string;
  title?: React.ReactNode;
  viewerId?: string;
  viewerName?: string;
}

export interface NotificationListProps {
  data: NotificationListItem[];
  refreshing: boolean;
  onRefresh: () => void;
  onEndReached: () => void;
  contentBottomPadding: number;
  onItemPress: (item: NotificationListItem) => void;
  onAuthorPress?: (item: NotificationListItem) => void;
  /**
   * When true, the list shows no empty UI while data is empty (e.g. initial
   * `loading` / pull-to-refresh), matching legacy
   * `ListEmptyComponent={isLoading ? null : <EmptyState />}`.
   */
  suppressEmptyState?: boolean;
}

export function NotificationList({
  data,
  refreshing,
  onRefresh,
  onEndReached,
  contentBottomPadding,
  onItemPress,
  onAuthorPress,
  suppressEmptyState = false,
}: NotificationListProps) {
  const { theme } = useUnistyles();
  const renderItem: ListRenderItem<NotificationListItem> = useCallback(
    ({ item }) => {
      const accessibilityLabel =
        typeof item.title === "string" ? item.title : "Notification";

      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={
            item.time ? `Relative time ${item.time}` : undefined
          }
          onPress={() => onItemPress(item)}
          style={({ pressed }) => [
            styles.row,
            item.isUnread && styles.rowUnread,
            pressed && styles.rowPressed,
          ]}
        >
          <NotificationCard
            type={item.type ?? "DEFAULT"}
            isUnread={item.isUnread}
            avatarUrl={item.avatarUrl}
            title={item.title ?? "Notification"}
            time={item.time}
            subtitle={item.subtitle}
            rightImageUrl={item.rightImageUrl}
            onAuthorPress={onAuthorPress ? () => onAuthorPress(item) : undefined}
          />
        </Pressable>
      );
    },
    [onItemPress, onAuthorPress],
  );

  const keyExtractor = useCallback((item: NotificationListItem) => item.id, []);

  return (
    <FlatList
      style={styles.list}
      data={data}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.foundation.foreground.primary} />
      }
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={suppressEmptyState ? null : EmptyState}
      contentContainerStyle={[
        styles.contentContainer,
        { paddingBottom: contentBottomPadding },
      ]}
    />
  );
}

const styles = StyleSheet.create((theme) => ({
  list: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  row: {
    borderBottomWidth: RNStyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.foundation.background.secondary,
  },
  rowUnread: {
    backgroundColor: theme.colors.foundation.background.secondary,
  },
  rowPressed: {
    opacity: 0.85,
  },
}));
