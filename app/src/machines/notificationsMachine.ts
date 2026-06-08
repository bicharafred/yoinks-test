import type { GetNotificationsQuery } from "@/gql/graphql";
import { GetNotificationsDocument } from "@/gql/graphql";
import { client, resolvedApiBase } from "@/services/client";
import type { ActorRefFrom } from "xstate";
import { assign, fromPromise, setup } from "xstate";

/**
 * Notification row shape for the inbox (from GraphQL `GetNotifications`).
 */
export type NotificationsMachineItem = {
  notificationId: string;
  momentSequence: string;
  isRead: boolean;
  type?: string;
  /** GraphQL `title` (fallback when `message` is empty). */
  apiTitle: string;
  message: string;
  viewerName?: string;
  viewerId?: string;
  createdAt: string;
  avatarUrl?: string;
  rightImageUrl?: string;
};

type NotificationsContext = {
  notifications: NotificationsMachineItem[];
  nextToken: string | null;
  hasUnreadNotifications: boolean;
};

type NotificationsEvents =
  | { type: "LOAD_MORE" }
  | { type: "REFRESH" }
  | { type: "SET_AS_READ"; payload: { notificationId: string } };

type FetchNotificationsOutput = {
  items: NotificationsMachineItem[];
  nextToken: string | null;
};

type NotificationGraphqlRow =
  GetNotificationsQuery["getNotifications"]["items"][number];

function mapGraphqlNotificationToMachineItem(
  row: NotificationGraphqlRow,
): NotificationsMachineItem {
  return {
    notificationId: row.notificationId,
    momentSequence:
      row.momentSequence != null ? String(row.momentSequence) : "",
    isRead: row.isRead,
    type: row.type,
    apiTitle: row.title,
    message: row.message,
    viewerName: row.viewerName ?? undefined,
    viewerId: row.viewerId ?? undefined,
    createdAt: row.createdAt,
    avatarUrl: row.viewerAvatar ?? undefined,
    rightImageUrl: row.mediaUrl ?? undefined,
  };
}

export const notificationsMachine = setup({
  types: {
    context: {} as NotificationsContext,
    events: {} as NotificationsEvents,
  },
  actors: {
    fetchNotifications: fromPromise(
      async ({
        input,
      }: {
        input: { nextToken: string | null; limit: number };
      }): Promise<FetchNotificationsOutput> => {
        const { nextToken, limit } = input;

        if (__DEV__) {
          console.log("[notifications] fetching from:", resolvedApiBase);
        }

        try {
          const response = await client.query<GetNotificationsQuery>({
            query: GetNotificationsDocument,
            fetchPolicy: "network-only",
            variables: {
              limit,
              nextToken: nextToken ?? undefined,
            },
          });

          const result = response.data?.getNotifications;
          if (result == null) {
            console.warn("[notifications] GetNotifications missing getNotifications payload");
            throw new Error(
              "GetNotifications missing getNotifications payload",
            );
          }

          const items =
            result.items.map(mapGraphqlNotificationToMachineItem);

          return {
            items,
            nextToken: result.nextToken ?? null,
          };
        } catch (error: unknown) {
          console.warn("[notifications] fetchNotifications failed:", (error as Error)?.message ?? error);
          if (__DEV__) {
            // In local dev the mock server may be unreachable; return empty
            // rather than blocking the feed or crashing the machine.
            return { items: [], nextToken: null };
          }
          throw error;
        }
      },
    ),
  },
}).createMachine({
  id: "notifications",
  context: {
    notifications: [],
    nextToken: null,
    hasUnreadNotifications: false,
  },
  initial: "loading",
  on: {
    SET_AS_READ: {
      actions: assign(({ context, event }) => {
        if (event.type !== "SET_AS_READ") {
          return {};
        }
        const updatedNotifications = context.notifications.map((n) =>
          n.notificationId === event.payload.notificationId
            ? { ...n, isRead: true }
            : n,
        );
        return {
          notifications: updatedNotifications,
          hasUnreadNotifications: updatedNotifications.some((n) => !n.isRead),
        };
      }),
    },
  },
  states: {
    loading: {
      invoke: {
        src: "fetchNotifications",
        input: { nextToken: null, limit: 30 },
        onDone: {
          target: "idle",
          actions: assign(({ event }) => {
            const output = event.output as FetchNotificationsOutput;
            return {
              notifications: output.items,
              nextToken: output.nextToken,
              hasUnreadNotifications: output.items.some((n) => !n.isRead),
            };
          }),
        },
        onError: {
          target: "idle",
        },
      },
    },
    idle: {
      on: {
        LOAD_MORE: {
          target: "loadingMore",
          guard: ({ context }) => context.nextToken != null,
        },
        REFRESH: {
          target: "loading",
        },
      },
    },
    loadingMore: {
      invoke: {
        src: "fetchNotifications",
        input: ({ context }) => ({
          nextToken: context.nextToken,
          limit: 30,
        }),
        onDone: {
          target: "idle",
          actions: assign(({ context, event }) => {
            const output = event.output as FetchNotificationsOutput;
            const notifications = [
              ...context.notifications,
              ...output.items,
            ];
            return {
              notifications,
              nextToken: output.nextToken,
              hasUnreadNotifications: notifications.some((n) => !n.isRead),
            };
          }),
        },
        onError: {
          target: "idle",
        },
      },
    },
  },
});

export type NotificationsMachineActorRef = ActorRefFrom<
  typeof notificationsMachine
>;
