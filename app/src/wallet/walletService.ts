import {
  GetWalletBalanceDocument,
  type GetWalletBalanceQuery,
  type GetWalletBalanceQueryVariables,
} from "@/gql/graphql";
import { client } from "@/services/client";
import { runtimeConfig } from "@/config/runtimeConfig";
import { getValidToken } from "@/services/tokenManager";
import { resolveLocalUrl } from "@/utils/apiUrl";
import type {
  CreatePaymentIntentPayload,
  CreateStripeConnectedAccountPayload,
  PayoutRecord,
  StripeConnectedAccountStatus,
  WalletBalance,
} from "@/wallet/walletTypes";

/**
 * Wallet REST + GraphQL boundaries. Balances are server-authoritative (Wallet migration Step 14).
 * No RevenueCat, Watermelon token reads, or MMKV persistence of monetary fields.
 */

export class WalletServiceError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "WalletServiceError";
  }
}

function assertNonBlankAuthorId(authorId: string): string {
  const id = authorId.trim();
  if (id === "") {
    throw new WalletServiceError("Author id must not be empty");
  }
  return id;
}

function normalizeRestBase(): string {
  const raw = (process.env.EXPO_PUBLIC_API_BASE_REST ?? "").trim();
  if (raw === "") {
    throw new WalletServiceError("Missing EXPO_PUBLIC_API_BASE_REST");
  }
  const normalized = raw.endsWith("/") ? raw.slice(0, -1) : raw;
  return resolveLocalUrl(normalized);
}

function walletRestUrl(pathSegment: string): string {
  const base = normalizeRestBase();
  const seg = pathSegment.replace(/^\//, "");
  return `${base}/${seg}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new WalletServiceError(`Invalid REST field "${field}": expected string`);
  }
  const s = value.trim();
  if (s === "") {
    throw new WalletServiceError(`Invalid REST field "${field}": empty string`);
  }
  return s;
}

function readPositiveIntAmount(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new WalletServiceError(`Invalid REST field "${field}": expected positive integer`);
  }
  return value;
}

function readHttpUrl(value: unknown, field: string): string {
  const s =
    typeof value === "string"
      ? value.trim()
      : typeof value === "number"
        ? String(value)
        : "";
  if (s === "") {
    throw new WalletServiceError(`Invalid REST field "${field}": missing URL`);
  }
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      throw new WalletServiceError(`Invalid REST field "${field}": unsupported protocol`);
    }
    return s;
  } catch {
    throw new WalletServiceError(`Invalid REST field "${field}": not a URL`);
  }
}

function parseCreatePaymentIntentResponse(raw: unknown): CreatePaymentIntentPayload {
  if (!isRecord(raw)) {
    throw new WalletServiceError("Malformed create-payment-intent JSON");
  }
  const nested = raw.paymentIntent;
  if (!isRecord(nested)) {
    throw new WalletServiceError('Malformed PaymentIntent envelope: missing "paymentIntent" object');
  }
  const secret =
    nested.client_secret ??
    nested.clientSecret;
  return {
    paymentIntent: {
      id: readNonEmptyString(nested.id, "paymentIntent.id"),
      clientSecret: readNonEmptyString(secret, "paymentIntent.client_secret"),
      amountInCents: readPositiveIntAmount(nested.amount, "paymentIntent.amount"),
      currency: readNonEmptyString(nested.currency, "paymentIntent.currency").toLowerCase(),
      status: readNonEmptyString(nested.status, "paymentIntent.status"),
    },
  };
}

/** Matches legacy selective read: omit partial onboarding rows. */
function parseStripeConnectedAccountStatusPayload(
  raw: unknown,
): StripeConnectedAccountStatus | null {
  if (!isRecord(raw)) {
    throw new WalletServiceError("Malformed stripe-connected-account JSON");
  }

  const idRaw = raw.stripeConnectedAccountId;
  const finishedRaw = raw.finishedStripeAccountSetup;

  const id =
    typeof idRaw === "string"
      ? idRaw.trim()
      : typeof idRaw === "number"
        ? String(idRaw).trim()
        : "";

  if (id === "") {
    return null;
  }
  if (finishedRaw !== true) {
    return null;
  }

  return {
    stripeConnectedAccountId: id,
    finishedStripeAccountSetup: true,
  };
}

function parseCreateStripeConnectedAccountResponse(
  raw: unknown,
): CreateStripeConnectedAccountPayload {
  if (!isRecord(raw)) {
    throw new WalletServiceError("Malformed create-stripe-connected-account JSON");
  }
  const url =
    raw.onboardingUrl ?? raw.onboarding_url;
  return {
    onboardingUrl: readHttpUrl(url, "onboardingUrl"),
  };
}

async function authorizedWalletRestJson(
  pathSegment: string,
  init: RequestInit & { headers?: HeadersInit } = {},
): Promise<unknown> {
  const token = await getValidToken();
  if (!token || token.trim() === "") {
    throw new WalletServiceError("Authorization token unavailable");
  }

  const merged = new Headers(init.headers);
  if (!merged.has("Content-Type")) {
    merged.set("Content-Type", "application/json");
  }
  merged.set("Authorization", `Bearer ${token}`);

  const response = await fetch(walletRestUrl(pathSegment), {
    ...init,
    headers: merged,
  });

  const text = await response.text();
  if (!response.ok) {
    throw new WalletServiceError(
      `Wallet REST "${pathSegment}" failed (${response.status} ${response.statusText})`,
      { cause: text.length > 0 ? text.slice(0, 500) : undefined },
    );
  }

  if (text.trim().length === 0) {
    return {};
  }

  try {
    return JSON.parse(text) as unknown;
  } catch (cause) {
    throw new WalletServiceError(`Wallet REST "${pathSegment}" returned non-JSON`, {
      cause,
    });
  }
}

/** GraphQL authoritative balance for the authenticated viewer. */
export async function fetchWalletBalance(authorId: string): Promise<WalletBalance> {
  const id = assertNonBlankAuthorId(authorId);

  const { data, error } = await client.query<
    GetWalletBalanceQuery,
    GetWalletBalanceQueryVariables
  >({
    query: GetWalletBalanceDocument,
    variables: { authorId: id },
    fetchPolicy: "network-only",
  });

  if (error) {
    throw new WalletServiceError(error.message, { cause: error });
  }

  const row = data?.getWalletBalance ?? null;

  if (row == null) {
    throw new WalletServiceError("Empty getWalletBalance response");
  }

  const transferable = row.transferable;
  const redeemable = row.redeemable;

  if (!Number.isFinite(transferable) || !Number.isFinite(redeemable)) {
    throw new WalletServiceError("Malformed wallet numeric fields");
  }

  return {
    transferable,
    redeemable,
  };
}

export async function createPaymentIntent(input: {
  authorId: string;
  amountInCents: number;
}): Promise<CreatePaymentIntentPayload> {
  const authorId = assertNonBlankAuthorId(input.authorId);
  const cents = input.amountInCents;
  if (!Number.isInteger(cents) || cents <= 0) {
    throw new WalletServiceError("amountInCents must be a positive integer");
  }

  const userId = `USER#${authorId}`;
  /** Legacy `{ amount: cents, userId }` Lambda contract preserved from `walletMachine`. */
  const body = JSON.stringify({ amount: cents, userId });

  const raw = await authorizedWalletRestJson("create-payment-intent", {
    method: "POST",
    body,
  });

  return parseCreatePaymentIntentResponse(raw);
}

export async function fetchStripeConnectedAccountStatus(
  authorId: string,
): Promise<StripeConnectedAccountStatus | null> {
  const id = encodeURIComponent(assertNonBlankAuthorId(authorId));

  const raw = await authorizedWalletRestJson(`stripe-connected-account/${id}`, {
    method: "GET",
  });

  return parseStripeConnectedAccountStatusPayload(raw);
}

/**
 * Confirms a mock payment intent created by the server in MOCK_PAYMENTS=true mode.
 * Calls POST /mock-payment/complete which credits the wallet and writes a ledger entry.
 * Controlled by runtimeConfig.enableMockPayments — works in staging APK as well as local dev.
 */
export async function completeMockPayment(paymentIntentId: string): Promise<void> {
  if (!runtimeConfig.enableMockPayments) {
    throw new WalletServiceError("completeMockPayment requires EXPO_PUBLIC_ENABLE_MOCK_PAYMENTS=true");
  }
  await authorizedWalletRestJson("mock-payment/complete", {
    method: "POST",
    body: JSON.stringify({ paymentIntentId }),
  });
}

/**
 * Seeds creator earnings on the mock-server for staging/local payout testing.
 * Controlled by runtimeConfig.enableMockPayout.
 */
export async function mockEarnDev(amountUsdCents: number): Promise<void> {
  if (!runtimeConfig.enableMockPayout) {
    throw new WalletServiceError("mockEarnDev requires EXPO_PUBLIC_ENABLE_MOCK_PAYOUT=true");
  }
  await authorizedWalletRestJson("payout/mock-earn", {
    method: "POST",
    body: JSON.stringify({ amountUsdCents }),
  });
}

export async function fetchPayoutHistory(): Promise<PayoutRecord[]> {
  if (!runtimeConfig.enableMockPayout) {
    throw new WalletServiceError("fetchPayoutHistory requires EXPO_PUBLIC_ENABLE_MOCK_PAYOUT=true");
  }
  const raw = await authorizedWalletRestJson("payout/history", { method: "GET" });
  if (!isRecord(raw) || !Array.isArray(raw.payouts)) {
    return [];
  }
  return raw.payouts as PayoutRecord[];
}

export async function requestPayout(amountUsdCents: number): Promise<PayoutRecord> {
  if (!runtimeConfig.enableMockPayout) {
    throw new WalletServiceError("requestPayout requires EXPO_PUBLIC_ENABLE_MOCK_PAYOUT=true");
  }
  if (!Number.isInteger(amountUsdCents) || amountUsdCents <= 0) {
    throw new WalletServiceError("amountUsdCents must be a positive integer");
  }
  const raw = await authorizedWalletRestJson("payout/request", {
    method: "POST",
    body: JSON.stringify({ amountUsdCents }),
  });
  if (!isRecord(raw) || !isRecord(raw.payout)) {
    throw new WalletServiceError("Malformed payout response");
  }
  return raw.payout as PayoutRecord;
}

/**
 * Staging-only: asks the mock server to verify a Stripe test PI and credit wallet.
 * Called after a successful PaymentSheet presentation when enableMockPayments is false.
 */
export async function confirmStripePayment(paymentIntentId: string): Promise<void> {
  await authorizedWalletRestJson("wallet/confirm-payment", {
    method: "POST",
    body: JSON.stringify({ paymentIntentId }),
  });
}

export async function createStripeConnectedAccount(
  authorId: string,
): Promise<CreateStripeConnectedAccountPayload> {
  const id = assertNonBlankAuthorId(authorId);

  const raw = await authorizedWalletRestJson("create-stripe-connected-account", {
    method: "POST",
    body: JSON.stringify({ authorId: id }),
  });

  return parseCreateStripeConnectedAccountResponse(raw);
}
