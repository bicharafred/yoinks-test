/**
 * Wallet-only domain aliases (UI segment control + API balance snapshot helpers).
 */

/** Matches the migrated Wallet tab segmented control (“Yoinks” | “Balance”). */
export type WalletTab = "yoinks" | "balance";

/** Authoritative transferable / redeemable numbers from GET wallet balance flows. */
export type WalletBalance = Readonly<{
  transferable: number;
  redeemable: number;
}>;

/** Mirrors wallet machine `offerings[].type`; keep string-backed until catalog grows. */
export type WalletOfferingType = string;

/** Optional promo / state row on a pack (legacy `extraDetails`). */
export type WalletOfferingPromoTag = "popular" | "value" | "coming_soon";

/**
 * One purchasable pack row (Stripe payment intent cents + surfaced copy IDs).
 */
export type WalletOffering = Readonly<{
  type: WalletOfferingType;
  title: string;
  detail: string;
  yoinksCredits: number;
  amountInCents: number;
  currencyCode: string;
  promoTag?: WalletOfferingPromoTag;
}>;

/** Stripe PaymentIntent envelope after Lambda `create-payment-intent`. */
export type WalletPaymentIntent = Readonly<{
  id: string;
  clientSecret: string;
  amountInCents: number;
  currency: string;
  status: string;
}>;

export type CreatePaymentIntentPayload = Readonly<{
  paymentIntent: WalletPaymentIntent;
}>;

/** Returned when Connect onboarding is complete (`GET stripe-connected-account/:id`). */
export type StripeConnectedAccountStatus = Readonly<{
  stripeConnectedAccountId: string;
  finishedStripeAccountSetup: boolean;
}>;

export type CreateStripeConnectedAccountPayload = Readonly<{
  onboardingUrl: string;
}>;

export type PayoutStatus = "REQUESTED" | "PROCESSING" | "PAID" | "FAILED";

export type PayoutRecord = Readonly<{
  id: string;
  userId: string;
  status: PayoutStatus;
  /** Amount in USD cents (integer). Divide by 100 for display. */
  amountUsdCents: number;
  createdAt: string;
  updatedAt: string;
}>;
