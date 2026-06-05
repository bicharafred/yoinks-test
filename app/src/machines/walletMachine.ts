import {
  initPaymentSheet,
  PaymentSheetError,
  presentPaymentSheet,
} from "@stripe/stripe-react-native";
import type { ActorRefFrom } from "xstate";
import { assign, fromPromise, setup } from "xstate";

import {
  completeMockPayment,
  createPaymentIntent,
  createStripeConnectedAccount,
  fetchStripeConnectedAccountStatus,
  fetchWalletBalance,
  WalletServiceError,
} from "@/wallet/walletService";
import type { WalletOffering } from "@/wallet/walletTypes";
import { convertTransferableToYoinks } from "@/wallet/walletUtils";

const ONE_TIME_OFFERING_TYPE = "One-time";

function formatWalletMachineError(reason: unknown): string {
  if (reason instanceof WalletServiceError) {
    return reason.message;
  }
  if (reason instanceof Error) {
    return reason.message;
  }
  return JSON.stringify(reason);
}

async function noopInitializeWallet(input: {
  authorId: string;
}): Promise<void> {
  if (input.authorId.trim() === "") {
    throw new WalletServiceError("Wallet initialize: empty author id");
  }
}

async function loadHardcodedOfferings(): Promise<WalletOffering[]> {
  return [
    {
      type: ONE_TIME_OFFERING_TYPE,
      title: "40 Yoinks Pack",
      detail: "Receive 40 Yoinks, no strings attached.",
      yoinksCredits: 40,
      amountInCents: 499,
      currencyCode: "USD",
    },
  ];
}

async function invokeFetchBalance(input: {
  authorId: string;
}): Promise<{ transferable: number; redeemable: number }> {
  return fetchWalletBalance(input.authorId);
}

async function invokeFetchConnectStatus(input: {
  authorId: string;
}): Promise<{
  stripeConnectedAccountId: string;
  finishedStripeAccountSetup: boolean;
} | null> {
  return fetchStripeConnectedAccountStatus(input.authorId);
}

async function invokeConnectStripe(input: {
  authorId: string;
}): Promise<string> {
  const { onboardingUrl } = await createStripeConnectedAccount(input.authorId);
  return onboardingUrl;
}

type BuyInput = {
  authorId: string;
  pack: WalletOffering | undefined;
};

type BuyPackOutcome = { outcome: "completed" } | { outcome: "canceled" };

function isPaymentSheetUserCancellation(
  error: { code: PaymentSheetError } | undefined | null,
): boolean {
  return error?.code === PaymentSheetError.Canceled;
}

/**
 * Mirrors legacy Stripe PaymentSheet sequencing; user-cancel returns `canceled` without throwing.
 */
async function invokeBuySelectedPack(input: BuyInput): Promise<BuyPackOutcome> {
  if (input.pack == null) {
    throw new WalletServiceError("No pack selected");
  }

  const { paymentIntent } = await createPaymentIntent({
    authorId: input.authorId,
    amountInCents: input.pack.amountInCents,
  });

  // MOCK_PAYMENTS mode: server returns a fake PI (id starts with "pi_mock_").
  // Bypass Stripe PaymentSheet entirely — call the server's complete endpoint
  // directly. __DEV__ guard ensures this path is stripped in production builds.
  if (__DEV__ && paymentIntent.id.startsWith("pi_mock_")) {
    await completeMockPayment(paymentIntent.id);
    return { outcome: "completed" };
  }

  const { error: initError } = await initPaymentSheet({
    allowsDelayedPaymentMethods: false,
    merchantDisplayName: "Yoinks",
    paymentIntentClientSecret: paymentIntent.clientSecret,
  });

  if (initError != null) {
    if (isPaymentSheetUserCancellation(initError)) {
      return { outcome: "canceled" };
    }
    throw new WalletServiceError(initError.message, { cause: initError });
  }

  const { error: presentError } = await presentPaymentSheet();

  if (presentError != null) {
    if (isPaymentSheetUserCancellation(presentError)) {
      return { outcome: "canceled" };
    }
    throw new WalletServiceError(presentError.message, { cause: presentError });
  }

  return { outcome: "completed" };
}

export type WalletMachineContext = {
  authorId: string;
  transferable: number;
  transferableYoinks: number;
  redeemable: number;
  offerings: WalletOffering[];
  /** Matches `WalletOffering.type` rows (e.g. `One-time`). */
  selectedOfferingType: string;
  error: string | undefined;
  onboardingUrl: string | undefined;
  finishedStripeAccountSetup: boolean;
  stripeConnectedAccountId: string | undefined;
  /**
   * UI scroll-to-top cue after PaymentSheet succeeds (replacing legacy `scrollViewRef`).
   */
  purchaseScrollNonce: number;
};

export type WalletMachineEvents =
  | { type: "REFRESH_BALANCE" }
  | { type: "UPDATE_BALANCE"; balance: number }
  | { type: "SELECT_OFFERING"; offeringType: string }
  | { type: "BUY_SELECTED_OFFERING" }
  | { type: "CONNECT_WALLET" }
  | { type: "CLOSE_WEBVIEW" }
  | { type: "WEBVIEW_COMPLETED" };

export type WalletMachineInput = {
  authorId: string;
  initialBalance?: number;
};

export const walletMachine = setup({
  types: {
    context: {} as WalletMachineContext,
    events: {} as WalletMachineEvents,
    input: {} as WalletMachineInput,
  },
  actors: {
    initializeWallet: fromPromise(({ input }: { input: { authorId: string } }) =>
      noopInitializeWallet(input),
    ),
    setupWalletOfferings: fromPromise(() => loadHardcodedOfferings()),
    fetchBalanceActor: fromPromise(({ input }: { input: { authorId: string } }) =>
      invokeFetchBalance(input),
    ),
    fetchStripeConnectStatusActor: fromPromise(
      ({ input }: { input: { authorId: string } }) =>
        invokeFetchConnectStatus(input),
    ),
    connectStripeActor: fromPromise(
      ({ input }: { input: { authorId: string } }) =>
        invokeConnectStripe(input),
    ),
    buySelectedPackActor: fromPromise(({ input }: { input: BuyInput }) =>
      invokeBuySelectedPack(input),
    ),
  },
}).createMachine({
  id: "wallet",
  context: ({ input }) => {
    const seed = input.initialBalance ?? 0;
    return {
      authorId: input.authorId,
      transferable: seed,
      transferableYoinks: convertTransferableToYoinks(seed),
      redeemable: 0,
      offerings: [],
      selectedOfferingType: ONE_TIME_OFFERING_TYPE,
      error: undefined,
      onboardingUrl: undefined,
      finishedStripeAccountSetup: false,
      stripeConnectedAccountId: undefined,
      purchaseScrollNonce: 0,
    };
  },
  initial: "initializing",
  states: {
    initializing: {
      invoke: {
        src: "initializeWallet",
        input: ({ context }) => ({ authorId: context.authorId }),
        onDone: { target: "settingUpOfferings" },
        onError: { target: "gettingBalance" },
      },
    },
    settingUpOfferings: {
      invoke: {
        src: "setupWalletOfferings",
        onDone: {
          target: "gettingBalance",
          actions: assign(({ event }) => {
            const offerings = event.output as WalletOffering[];
            const defaultSelection =
              offerings.find((o) => o.type === ONE_TIME_OFFERING_TYPE)
                ?.type ?? offerings[0]?.type ?? ONE_TIME_OFFERING_TYPE;
            return {
              offerings,
              selectedOfferingType: defaultSelection,
            };
          }),
        },
        onError: {
          target: "idle",
          actions: assign({
            error: ({ event }) => formatWalletMachineError(event.error),
            offerings: () => [],
          }),
        },
      },
    },
    gettingBalance: {
      invoke: {
        src: "fetchBalanceActor",
        input: ({ context }) => ({ authorId: context.authorId }),
        onDone: {
          target: "gettingStripeConnectedAccountStatus",
          actions: assign(({ event }) => {
            const payload = event.output as {
              transferable: number;
              redeemable: number;
            };
            return {
              transferable: payload.transferable,
              transferableYoinks: convertTransferableToYoinks(
                payload.transferable,
              ),
              redeemable: payload.redeemable,
              error: undefined,
            };
          }),
        },
        onError: {
          target: "gettingStripeConnectedAccountStatus",
          actions: assign(({ event }) => ({
            error: formatWalletMachineError(event.error),
          })),
        },
      },
    },
    gettingStripeConnectedAccountStatus: {
      invoke: {
        src: "fetchStripeConnectStatusActor",
        input: ({ context }) => ({ authorId: context.authorId }),
        onDone: {
          target: "idle",
          actions: assign(({ event }) => {
            const out = event.output as {
              stripeConnectedAccountId: string;
              finishedStripeAccountSetup: boolean;
            } | null;
            if (out === null) {
              return {
                stripeConnectedAccountId: undefined,
                finishedStripeAccountSetup: false,
              };
            }
            return {
              stripeConnectedAccountId: out.stripeConnectedAccountId,
              finishedStripeAccountSetup: out.finishedStripeAccountSetup,
            };
          }),
        },
        onError: {
          target: "idle",
          actions: assign(() => ({
            stripeConnectedAccountId: undefined,
            finishedStripeAccountSetup: false,
          })),
        },
      },
    },
    idle: {
      on: {
        UPDATE_BALANCE: {
          actions: assign(({ event }) => ({
            transferable: event.balance,
            transferableYoinks: convertTransferableToYoinks(event.balance),
          })),
        },
        SELECT_OFFERING: {
          actions: assign(({ context, event }) => {
            const hit = context.offerings.find((o) => o.type === event.offeringType);
            if (!hit) {
              return {};
            }
            return { selectedOfferingType: event.offeringType };
          }),
        },
        BUY_SELECTED_OFFERING: { target: "buyingSelectedOffering" },
        REFRESH_BALANCE: { target: "refreshing" },
        /** UI does not dispatch until payouts are approved (`@/wallet/stripeConnectGate`). */
        CONNECT_WALLET: { target: "connectingStripeAccount" },
        CLOSE_WEBVIEW: {
          actions: assign(() => ({
            onboardingUrl: undefined,
          })),
        },
        WEBVIEW_COMPLETED: {
          target: "refreshing",
          actions: assign(() => ({
            onboardingUrl: undefined,
          })),
        },
      },
    },
    refreshing: {
      entry: assign(() => ({
        error: undefined,
      })),
      invoke: {
        src: "fetchBalanceActor",
        input: ({ context }) => ({ authorId: context.authorId }),
        onDone: {
          target: "idle",
          actions: assign(({ event }) => {
            const payload = event.output as {
              transferable: number;
              redeemable: number;
            };
            return {
              transferable: payload.transferable,
              transferableYoinks: convertTransferableToYoinks(
                payload.transferable,
              ),
              redeemable: payload.redeemable,
              error: undefined,
            };
          }),
        },
        onError: {
          target: "idle",
          actions: assign(({ event }) => ({
            error: formatWalletMachineError(event.error),
          })),
        },
      },
    },
    buyingSelectedOffering: {
      invoke: {
        src: "buySelectedPackActor",
        input: ({ context }) =>
          ({
            authorId: context.authorId,
            pack: context.offerings.find(
              (o) => o.type === context.selectedOfferingType,
            ),
          }) satisfies BuyInput,
        onDone: [
          {
            guard: ({ event }) =>
              (event.output as BuyPackOutcome).outcome === "completed",
            target: "refreshing",
            actions: assign(({ context }) => ({
              error: undefined,
              purchaseScrollNonce: context.purchaseScrollNonce + 1,
            })),
          },
          {
            guard: ({ event }) =>
              (event.output as BuyPackOutcome).outcome === "canceled",
            target: "idle",
            actions: assign(() => ({
              error: undefined,
            })),
          },
          {
            target: "idle",
            actions: assign(() => ({
              error: "Payment could not be completed. Please try again.",
            })),
          },
        ],
        onError: {
          target: "idle",
          actions: assign(({ event }) => ({
            error: formatWalletMachineError(event.error),
          })),
        },
      },
    },
    connectingStripeAccount: {
      invoke: {
        src: "connectStripeActor",
        input: ({ context }) => ({ authorId: context.authorId }),
        onDone: {
          target: "showingOnboarding",
          actions: assign(({ event }) => ({
            onboardingUrl: event.output as string,
          })),
        },
        onError: {
          target: "idle",
          actions: assign(({ event }) => ({
            stripeConnectedAccountId: undefined,
            onboardingUrl: undefined,
            error: formatWalletMachineError(event.error),
          })),
        },
      },
    },
    showingOnboarding: {
      on: {
        CLOSE_WEBVIEW: {
          target: "idle",
          actions: assign(() => ({
            onboardingUrl: undefined,
          })),
        },
        WEBVIEW_COMPLETED: {
          target: "refreshing",
          actions: assign(() => ({
            onboardingUrl: undefined,
          })),
        },
      },
    },
  },
});

export type WalletMachineActorRef = ActorRefFrom<typeof walletMachine>;
