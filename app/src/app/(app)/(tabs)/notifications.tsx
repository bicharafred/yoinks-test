import { AppScreenContainer } from "@/components/navigation/app-screen-container";
import { mapMachineNotificationToListItem } from "@/components/notifications/map-machine-item-to-list-item";
import {
  NotificationList,
  type NotificationListItem,
} from "@/components/notifications/notification-list";
import { getAppTabBarScrollContentBottomPadding } from "@/navigation/app-tab-bar-layout";
import type { NotificationsMachineActorRef } from "@/machines/notificationsMachine";
import { RootMachineContext } from "@/machines/rootMachine";
import { useSelector } from "@xstate/react";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUnistyles } from "react-native-unistyles";

function NotificationsScreenWithActor({
  actor,
  contentBottomPadding,
}: {
  actor: NotificationsMachineActorRef;
  contentBottomPadding: number;
}) {
  const router = useRouter();

  const { listItems, refreshing } = useSelector(actor, (snapshot) => ({
    listItems: snapshot.context.notifications.map(mapMachineNotificationToListItem),
    refreshing: snapshot.matches("loading"),
  }));

  const handleRefresh = useCallback(() => {
    actor.send({ type: "REFRESH" });
  }, [actor]);

  const handleLoadMore = useCallback(() => {
    actor.send({ type: "LOAD_MORE" });
  }, [actor]);

  const handleItemPress = useCallback(
    (item: NotificationListItem) => {
      router.push({
        pathname: "/(app)/single-moment",
        params: {
          momentSequence: item.momentSequence,
          notificationId: item.notificationId,
          isUnread: item.isUnread ? "true" : "false",
        },
      });
    },
    [router],
  );

  return (
    <AppScreenContainer>
      <NotificationList
        data={listItems}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onEndReached={handleLoadMore}
        contentBottomPadding={contentBottomPadding}
        onItemPress={handleItemPress}
        suppressEmptyState={refreshing}
      />
    </AppScreenContainer>
  );
}

export default function NotificationsScreen() {
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();

  const tabBarScrollBottomPadding = useMemo(
    () => getAppTabBarScrollContentBottomPadding(insets.bottom, theme),
    [insets.bottom, theme],
  );

  const notificationsActor = RootMachineContext.useSelector(
    (s) => s.context.notificationsMachineRef,
  );

  if (notificationsActor == null) {
    return (
      <AppScreenContainer>
        <NotificationList
          data={[]}
          refreshing={false}
          onRefresh={() => {}}
          onEndReached={() => {}}
          contentBottomPadding={tabBarScrollBottomPadding}
          onItemPress={() => {}}
        />
      </AppScreenContainer>
    );
  }

  return (
    <NotificationsScreenWithActor
      actor={notificationsActor}
      contentBottomPadding={tabBarScrollBottomPadding}
    />
  );
}
