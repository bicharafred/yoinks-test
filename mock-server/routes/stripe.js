"use strict";

const { isStripeConfigured, MOCK_PAYMENTS_ENABLED, PAYMENTS_MODE } = require("../config/env");
const { db } = require("../db");
const { getStripeClient, handleStripeWebhookEvent } = require("../services/payment");

module.exports = async function handleStripe(req, res, { path, method, readBody, readBodyBuffer, json, apiError }) {
  // ── GET /stripe-connected-account/:id ─────────────────────────────────────
  if (path.startsWith("/stripe-connected-account/") && method === "GET") {
    return json(res, 200, {
      stripeConnectedAccountId:   "acct_mock_001",
      finishedStripeAccountSetup: true,
    }), true;
  }

  // ── POST /create-stripe-connected-account ──────────────────────────────────
  if (path === "/create-stripe-connected-account" && method === "POST") {
    return json(res, 200, { onboardingUrl: "https://connect.stripe.com/mock-onboarding" }), true;
  }

  // ── GET /stripe/debug ──────────────────────────────────────────────────────
  if (path === "/stripe/debug" && method === "GET") {
    const secretKey     = process.env.STRIPE_SECRET_KEY    ?? "";
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
    return json(res, 200, {
      paymentsMode:          PAYMENTS_MODE,
      mockPaymentsEnabled:   MOCK_PAYMENTS_ENABLED,
      hasStripeSecretKey:    secretKey    !== "" && secretKey    !== "sk_test_REPLACE_ME",
      hasStripeWebhookSecret: webhookSecret !== "" && webhookSecret !== "whsec_REPLACE_ME",
      stripeConfigured:      isStripeConfigured(),
      pendingMockPayments:   Object.keys(db.mockPendingPayments),
    }), true;
  }

  // ── POST /stripe/webhook ───────────────────────────────────────────────────
  if (path === "/stripe/webhook" && method === "POST") {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
    const stripe        = getStripeClient();

    if (!stripe || webhookSecret.trim() === "" || webhookSecret === "whsec_REPLACE_ME") {
      console.error("[stripe:webhook] STRIPE_WEBHOOK_SECRET not configured");
      return json(res, 503, apiError("STRIPE_WEBHOOK_INVALID_SIGNATURE", "Stripe webhook not configured. Add STRIPE_WEBHOOK_SECRET to mock-server/.env.")), true;
    }

    const rawBody = await readBodyBuffer(req);
    const sig     = req.headers["stripe-signature"];

    let event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err) {
      console.error("[stripe:webhook] signature verification failed:", err.message);
      return json(res, 400, apiError("STRIPE_WEBHOOK_INVALID_SIGNATURE", `Webhook signature verification failed: ${err.message}`)), true;
    }

    console.log(`[stripe:webhook] received: ${event.type} (${event.id})`);

    try {
      handleStripeWebhookEvent(event);
    } catch (err) {
      console.error("[stripe:webhook] handler error:", err.message);
      return json(res, 400, apiError("VALIDATION_ERROR", err.message)), true;
    }

    return json(res, 200, { received: true }), true;
  }

  return false;
};
