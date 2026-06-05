import { RootMachineContext } from "@/machines/rootMachine";
import { useEffect } from "react";

/**
 * Mirrors notifications machine unread state to root context for the tab bar badge.
 */
export function NotificationsUnreadBadgeSync() {
  const rootRef = RootMachineContext.useActorRef();
  const isLoggedIn = RootMachineContext.useSelector((s) => s.matches("loggedIn"));
  const notificationsRef = RootMachineContext.useSelector(
    (s) => s.context.notificationsMachineRef,
  );

  useEffect(() => {
    if (!isLoggedIn || notificationsRef == null) {
      return;
    }

    const pushUnreadToRoot = () => {
      const snapshot = notificationsRef.getSnapshot();
      rootRef.send({
        type: "SET_HAS_UNREAD_NOTIFICATIONS",
        hasUnread: snapshot.context.hasUnreadNotifications,
      });
    };

    pushUnreadToRoot();
    const sub = notificationsRef.subscribe(pushUnreadToRoot);
    return () => sub.unsubscribe();
  }, [isLoggedIn, notificationsRef, rootRef]);

  return null;
}
