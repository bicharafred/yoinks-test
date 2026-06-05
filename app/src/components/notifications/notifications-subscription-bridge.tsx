import { RootMachineContext } from "@/machines/rootMachine";
import { OnNewNotificationDocument } from "@/gql/graphql";
import { client } from "@/services/client";
import { showNewNotificationToast } from "@/services/notificationToast";
import { useEffect } from "react";

/**
 * Appsync subscription for new inbox rows: shows a toast then refreshes the list.
 * `userId` matches legacy (`USER#${author.id}`).
 */
export function NotificationsSubscriptionBridge() {
  const isLoggedIn = RootMachineContext.useSelector((s) =>
    s.matches("loggedIn"),
  );
  const authorId = RootMachineContext.useSelector(
    (s) => s.context.author?.id as string | undefined,
  );
  const notificationsMachineRef = RootMachineContext.useSelector(
    (s) => s.context.notificationsMachineRef,
  );

  useEffect(() => {
    if (
      !isLoggedIn ||
      authorId == null ||
      authorId === "" ||
      notificationsMachineRef == null
    ) {
      return;
    }

    const userId = `USER#${authorId}`;
    const observable = client.subscribe({
      query: OnNewNotificationDocument,
      variables: { userId },
    });

    const sub = observable.subscribe({
      next(result) {
        const n = result.data?.onNewNotification;
        if (n == null) return;
        showNewNotificationToast({
          type: n.type,
          title: n.title,
          message: n.message,
        });
        notificationsMachineRef.send({ type: "REFRESH" });
      },
      error(error) {
        console.warn("OnNewNotification subscription error:", error);
      },
    });

    return () => {
      sub.unsubscribe();
    };
  }, [isLoggedIn, authorId, notificationsMachineRef]);

  return null;
}
