import { createActorContext } from "@xstate/react";
import type { ActorRefFrom } from "xstate";
import { assign, setup, stopChild } from "xstate";
import { notificationsMachine } from "@/machines/notificationsMachine";
import {
  walletMachine,
  type WalletMachineActorRef,
} from "@/machines/walletMachine";
import { mmkvStorage, StorageKeys } from "@/services/storage";

const initialTokens = mmkvStorage.get<{ accessToken: string }>(StorageKeys.TOKENS);
const initialAuthor = mmkvStorage.get<any>(StorageKeys.AUTHOR);
const isInitiallyLoggedIn = !!(initialTokens?.accessToken && initialAuthor);

function sendWalletRefreshBalance({
  context,
}: {
  context: {
    walletMachineRef: WalletMachineActorRef | null;
  };
}) {
  context.walletMachineRef?.send({ type: "REFRESH_BALANCE" });
}

/**
 * Root spawns only long-lived app-wide actors (notifications, wallet). Profile and settings
 * machines stay route-owned (local `createActor` per screen); do not add a settings child here.
 */
/** Stable child id for root spawn/stop lifecycle. */
const NOTIFICATIONS_ACTOR_ID = "notifications" as const;

/** Matches `spawn("wallet", { id })`; used with `stopChild` on logout (migration plan Step 7). */
export const WALLET_ACTOR_ID = "wallet" as const;

export type RootNotificationsActorRef = ActorRefFrom<typeof notificationsMachine>;

/** Root-owned wallet actor (`walletMachine`) ref for the Wallet tab + unblur path. */
export type RootWalletMachineActorRef = WalletMachineActorRef;

/**
 * `hasUnreadNotifications` feeds the tab badge. `NotificationsUnreadBadgeSync`
 * forwards updates from the notifications actor via
 * `SET_HAS_UNREAD_NOTIFICATIONS`.
 */
export const rootMachine = setup({
  types: {
    context: {} as {
      author: any | null;
      hasUnreadNotifications: boolean;
      notificationsMachineRef: RootNotificationsActorRef | null;
      walletMachineRef: RootWalletMachineActorRef | null;
    },
    events: {} as
      | { type: "LOGIN_SUCCESS"; author: any }
      | { type: "SET_AUTHOR"; author: any }
      | { type: "LOGOUT" }
      | { type: "SET_HAS_UNREAD_NOTIFICATIONS"; hasUnread: boolean }
      | { type: "MOMENT_UNBLURRED" }
      | { type: "AUTHENTICATED_APP_FOREGROUND" }
      | { type: "START_ONBOARDING" }
      | { type: "FINISH_ONBOARDING_REPLAY" },
  },
  actors: {
    notifications: notificationsMachine,
    wallet: walletMachine,
  },
}).createMachine({
  id: "root",
  context: {
    author: initialAuthor || null,
    hasUnreadNotifications: false,
    notificationsMachineRef: null,
    walletMachineRef: null,
  },
  initial: isInitiallyLoggedIn ? "loggedIn" : "loggedOut",
  states: {
    loggedOut: {
      on: {
        LOGIN_SUCCESS: {
          target: "loggedIn",
          actions: assign({
            author: ({ event }) => event.author,
            hasUnreadNotifications: false,
          }),
        },
      },
    },
    loggedIn: {
      initial: "active",
      entry: [
        assign({
          notificationsMachineRef: ({ context, spawn }) => {
            if (context.notificationsMachineRef != null) {
              return context.notificationsMachineRef;
            }
            return spawn("notifications", { id: NOTIFICATIONS_ACTOR_ID });
          },
        }),
        assign({
          walletMachineRef: ({ context, spawn }) => {
            if (context.walletMachineRef != null) {
              return context.walletMachineRef;
            }
            const rawId = context.author?.id;
            const authorId =
              typeof rawId === "string"
                ? rawId.trim()
                : rawId != null
                  ? String(rawId).trim()
                  : "";
            if (authorId === "") {
              return null;
            }
            return spawn("wallet", {
              id: WALLET_ACTOR_ID,
              input: { authorId },
            });
          },
        }),
      ],
      states: {
        active: {
          on: {
            START_ONBOARDING: {
              target: "onboardingReplay",
            },
          },
        },
        onboardingReplay: {
          on: {
            FINISH_ONBOARDING_REPLAY: {
              target: "active",
            },
          },
        },
      },
      on: {
        LOGOUT: {
          target: "loggedOut",
          actions: [
            stopChild(NOTIFICATIONS_ACTOR_ID),
            stopChild(WALLET_ACTOR_ID),
            () => {
              mmkvStorage.delete(StorageKeys.TOKENS);
              mmkvStorage.delete(StorageKeys.AUTHOR);
            },
            assign({
              author: null,
              hasUnreadNotifications: false,
              notificationsMachineRef: null,
              walletMachineRef: null,
            }),
          ],
        },
        SET_HAS_UNREAD_NOTIFICATIONS: {
          actions: assign({
            hasUnreadNotifications: ({ event }) => event.hasUnread,
          }),
        },
        MOMENT_UNBLURRED: {
          actions: [sendWalletRefreshBalance],
        },
        AUTHENTICATED_APP_FOREGROUND: {
          actions: [sendWalletRefreshBalance],
        },
        SET_AUTHOR: {
          actions: [
            ({ event }) => {
              mmkvStorage.set(StorageKeys.AUTHOR, event.author);
            },
            assign({
              author: ({ event }) => event.author,
            }),
          ],
        },
      },
    },
  },
});

export const RootMachineContext = createActorContext(rootMachine);
