"use strict";

const { db } = require("../db");
const { MOCK_PAYMENTS_ENABLED, STRIPE_PACKAGES, isStripeConfigured } = require("../config/env");
const { uid, purchaseKey, normalizeUserId } = require("../utils/ids");
const { hasIdempotencyKey, markIdempotencyKey, hasStripeEvent, markStripeEvent } = require("./ledger");
const { creditYoinks } = require("./wallet");

let _stripeClient = null;

function getStripeClient() {
  if (_stripeClient) return _stripeClient;
  if (!isStripeConfigured()) return null;
  const Stripe = require("stripe");
  _stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-12-18.acacia" });
  return _stripeClient;
}

// ── Mock payment ──────────────────────────────────────────────────────────────

/**
 * Creates a fake payment intent (MOCK_PAYMENTS mode only).
 * Returns the PI envelope the app expects.
 */
function createMockPaymentIntent(amountCents, userId) {
  if (!MOCK_PAYMENTS_ENABLED) throw new Error("Mock payments not enabled");

  const normalizedUserId = normalizeUserId(userId);
  const pkg  = STRIPE_PACKAGES[amountCents] ?? STRIPE_PACKAGES[499];
  const piId = uid("pi_mock");

  db.mockPendingPayments[piId] = {
    userId: normalizedUserId,
    packageId: pkg.packageId,
    yoinks:    pkg.yoinks,
    amountUsdCents: amountCents,
    createdAt: new Date().toISOString(),
  };

  console.log(`[mock-payment] created ${piId} — ${amountCents}¢ — ${pkg.yoinks} Yoinks — ${normalizedUserId}`);
  console.log(`[mock-payment] to confirm: POST /mock-payment/complete  { "paymentIntentId": "${piId}" }`);

  return {
    paymentIntent: {
      id:            piId,
      client_secret: `${piId}_secret_mock`,
      amount:        amountCents,
      currency:      "usd",
      status:        "requires_payment_method",
    },
  };
}

/**
 * Completes a mock payment intent — credits wallet, writes ledger.
 * Returns { ok, alreadyProcessed?, credited?, ledgerEntry?, error? }
 */
function completeMockPayment(piId) {
  const idemKey = purchaseKey(piId);

  if (!piId || !db.mockPendingPayments[piId]) {
    return {
      ok: false,
      error: `Mock payment intent not found: "${piId}". Tap Buy in the app first.`,
      pending: Object.keys(db.mockPendingPayments),
    };
  }

  if (hasIdempotencyKey(idemKey)) {
    console.log(`[mock-payment] ${piId} already processed — skipping (idempotent)`);
    return { ok: true, alreadyProcessed: true };
  }

  const pending          = db.mockPendingPayments[piId];
  const normalizedUserId = normalizeUserId(pending.userId);
  markIdempotencyKey(idemKey);

  const ledgerEntry = creditYoinks(normalizedUserId, pending.yoinks, {
    paymentIntentId: piId,
    stripeEventId:   null,
    idempotencyKey:  idemKey,
    source:          "MOCK_PAYMENT",
  });

  const wallet = require("./wallet").getOrCreateWallet(normalizedUserId);
  console.log(`[mock-payment] credited ${pending.yoinks} Yoinks — userId: ${normalizedUserId} — PI: ${piId}`);
  console.log(`[wallet] yoinksAvailable: ${wallet.yoinksAvailable}`);

  return { ok: true, credited: pending.yoinks, ledgerEntry };
}

// ── Stripe payment ────────────────────────────────────────────────────────────

/**
 * Creates a real Stripe Test Mode payment intent.
 * Returns the PI envelope or throws on failure.
 */
async function createStripePaymentIntent(amountCents, userId) {
  const stripe = getStripeClient();
  if (!stripe) throw new Error("Stripe not configured — add a valid sk_test_/sk_live_ key as STRIPE_SECRET_KEY in mock-server/.env.");

  const normalizedUserId = normalizeUserId(userId);
  const pkg = STRIPE_PACKAGES[amountCents] ?? STRIPE_PACKAGES[499];

  const pi = await stripe.paymentIntents.create({
    amount:   amountCents,
    currency: "usd",
    automatic_payment_methods: { enabled: true },
    metadata: { userId: normalizedUserId, packageId: pkg.packageId, yoinks: String(pkg.yoinks) },
  });

  console.log(`[stripe] created PI ${pi.id} — ${amountCents}¢ — ${pkg.yoinks} Yoinks — ${normalizedUserId}`);

  return {
    paymentIntent: {
      id:            pi.id,
      client_secret: pi.client_secret,
      amount:        pi.amount,
      currency:      pi.currency,
      status:        pi.status,
    },
  };
}

/**
 * Handles a verified Stripe webhook event.
 * Returns { handled: true } or { handled: false } for unhandled event types.
 * Throws on bad data (caller should respond 400).
 */
function handleStripeWebhookEvent(event) {
  if (event.type !== "payment_intent.succeeded") {
    return { handled: false };
  }

  const pi             = event.data.object;
  const stripeEventId  = event.id;
  const piId           = pi.id;
  const userId         = normalizeUserId(pi.metadata?.userId ?? "unknown");
  const yoinksRaw      = pi.metadata?.yoinks;
  const amountYoinks   = yoinksRaw ? parseInt(yoinksRaw, 10) : 0;

  if (!Number.isInteger(amountYoinks) || amountYoinks <= 0) {
    throw new Error(`Invalid yoinks in metadata for PI ${piId}: "${yoinksRaw}"`);
  }

  if (hasStripeEvent(stripeEventId)) {
    console.log(`[stripe:webhook] ${stripeEventId} already processed — skipping (idempotent)`);
    return { handled: true, alreadyProcessed: true };
  }

  // Second guard: same PI arriving via a different event id (retry or duplicate)
  const idemKey = purchaseKey(piId);
  if (hasIdempotencyKey(idemKey)) {
    console.log(`[stripe:webhook] PI ${piId} already credited — skipping duplicate event ${stripeEventId}`);
    markStripeEvent(stripeEventId); // prevent re-processing this event id in future
    return { handled: true, alreadyProcessed: true };
  }

  markStripeEvent(stripeEventId);
  markIdempotencyKey(idemKey);

  const ledgerEntry = creditYoinks(userId, amountYoinks, {
    paymentIntentId: piId,
    stripeEventId,
    idempotencyKey:  idemKey,
    source:          "STRIPE_TEST",
  });

  const wallet = require("./wallet").getOrCreateWallet(userId);
  console.log(`[stripe:webhook] payment_intent.succeeded — PI: ${piId}`);
  console.log(`[wallet] credited ${amountYoinks} Yoinks — yoinksAvailable: ${wallet.yoinksAvailable}`);

  return { handled: true, ledgerEntry };
}

module.exports = {
  getStripeClient,
  createMockPaymentIntent,
  completeMockPayment,
  createStripePaymentIntent,
  handleStripeWebhookEvent,
};
