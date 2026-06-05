"use strict";

const { MOCK_PAYMENTS_ENABLED, STRIPE_PACKAGES } = require("../config/env");
const { normalizeUserId } = require("../utils/ids");
const {
  createMockPaymentIntent,
  completeMockPayment,
  createStripePaymentIntent,
} = require("../services/payment");

module.exports = async function handlePayments(req, res, { path, method, readBody, json, apiError }) {
  // ── POST /create-payment-intent ────────────────────────────────────────────
  if (path === "/create-payment-intent" && method === "POST") {
    const body       = await readBody(req);
    const amountCents = typeof body.amount === "number" && body.amount > 0 ? body.amount : 499;
    const userId      = normalizeUserId(
      typeof body.userId === "string" && body.userId.trim() !== ""
        ? body.userId.trim()
        : "mock-user-001",
    );

    if (MOCK_PAYMENTS_ENABLED) {
      const result = createMockPaymentIntent(amountCents, userId);
      return json(res, 200, result), true;
    }

    try {
      const result = await createStripePaymentIntent(amountCents, userId);
      return json(res, 200, result), true;
    } catch (err) {
      const isAuthErr = err?.type === "StripeAuthenticationError";
      const safeMsg = isAuthErr
        ? "Stripe authentication failed — STRIPE_SECRET_KEY in mock-server/.env is invalid or missing."
        : `Stripe error (${err.code ?? err.type ?? "unknown"}) — check mock-server/.env.`;
      console.error("[stripe] paymentIntents.create failed:", err.message);
      return json(res, 503, apiError("STRIPE_NOT_CONFIGURED", safeMsg)), true;
    }
  }

  // ── POST /mock-payment/complete ────────────────────────────────────────────
  if (path === "/mock-payment/complete" && method === "POST") {
    if (!MOCK_PAYMENTS_ENABLED) {
      return json(res, 400, apiError(
        "PAYMENT_NOT_CONFIGURED",
        "MOCK_PAYMENTS is not enabled. Set MOCK_PAYMENTS=true in mock-server/.env.",
      )), true;
    }

    const body = await readBody(req);
    let piId = typeof body.paymentIntentId === "string" ? body.paymentIntentId.trim() : "";

    // Fall back to the most recently created mock PI when no id is supplied
    if (piId === "") {
      const ids = Object.keys(require("../db").db.mockPendingPayments);
      piId = ids[ids.length - 1] ?? "";
    }

    const result = completeMockPayment(piId);
    if (!result.ok) {
      return json(res, 404, apiError("PAYMENT_NOT_FOUND", result.error, { pending: result.pending })), true;
    }
    return json(res, 200, result), true;
  }

  return false;
};
