"use strict";

const { db } = require("../db");
const { MOCK_AUTHOR_ID } = require("../config/env");
const { uid, payoutRequestKey, payoutCompleteKey } = require("../utils/ids");
const { centsToMicros, microsToDollars } = require("../utils/money");
const { hasIdempotencyKey, markIdempotencyKey } = require("./ledger");
const {
  getOrCreateWallet,
  payoutSummary,
  moveToPayoutRequested,
  moveToPayoutPaid,
  movePayoutBackToAvailable,
  seedCreatorEarnings,
} = require("./wallet");

/**
 * Requests a payout.
 * amountUsdCents is what the app sends (integer cents).
 * Internally converts to micros and uses integer wallet buckets.
 *
 * requestId (optional): caller-supplied idempotency key. If the same requestId
 * is submitted twice, the existing payout is returned without a second deduction.
 *
 * Returns { ok, payout, summary } or { ok: false, code, message }
 */
function requestPayout(userId, amountUsdCents, requestId) {
  const amountUsdMicros = centsToMicros(amountUsdCents);
  const wallet = getOrCreateWallet(userId);

  if (amountUsdMicros <= 0) {
    return { ok: false, code: "VALIDATION_ERROR", message: "amountUsdCents must be a positive integer." };
  }

  // Idempotency: same requestId → return existing payout without deducting again
  if (requestId) {
    const idemKey = payoutRequestKey(userId, requestId);
    if (hasIdempotencyKey(idemKey)) {
      const existing = db.payouts.find((p) => p.requestId === requestId);
      console.log(`[payout] request ${requestId} already processed — skipping (idempotent)`);
      return { ok: true, alreadyProcessed: true, payout: existing ?? null, summary: payoutSummary(wallet) };
    }
  }

  // No requestId: if a payout is already pending, return it rather than creating a second
  if (!requestId) {
    const pending = db.payouts.find(
      (p) => p.userId === userId && (p.status === "REQUESTED" || p.status === "PROCESSING"),
    );
    if (pending) {
      console.log(`[payout] existing pending payout ${pending.id} — returning without creating duplicate`);
      return { ok: true, existingPayout: true, payout: pending, summary: payoutSummary(wallet) };
    }
  }

  if (wallet.payoutAvailableUsdMicros < amountUsdMicros) {
    return {
      ok: false,
      code: "INSUFFICIENT_PAYOUT_BALANCE",
      message: "You do not have enough available payout balance.",
      details: {
        requestedCents:  amountUsdCents,
        availableCents:  Math.floor(wallet.payoutAvailableUsdMicros / 10_000),
      },
    };
  }

  const payoutId = uid("payout");
  const now      = new Date().toISOString();

  const payout = {
    id:             payoutId,
    userId,
    status:         "REQUESTED",
    amountUsdCents,
    ...(requestId ? { requestId } : {}),
    createdAt:      now,
    updatedAt:      now,
  };
  db.payouts.unshift(payout);

  // Mark idempotency key after creating record so duplicate requests return the same payout
  if (requestId) {
    markIdempotencyKey(payoutRequestKey(userId, requestId));
  }

  moveToPayoutRequested(userId, amountUsdMicros, { payoutId });

  console.log(`[payout] requested: ${amountUsdCents}¢ — id: ${payoutId}${requestId ? ` — requestId: ${requestId}` : ""}`);
  return { ok: true, payout, summary: payoutSummary(wallet) };
}

/**
 * Marks a payout as PAID, moves requested → paid lifetime.
 * Idempotent: returns alreadyProcessed if already paid.
 */
function completePayout(payoutId) {
  const payout = payoutId
    ? db.payouts.find((p) => p.id === payoutId)
    : db.payouts.find((p) => p.status === "REQUESTED" || p.status === "PROCESSING");

  if (!payout) {
    return {
      ok: false,
      code: "PAYOUT_NOT_FOUND",
      message: `No pending payout found: "${payoutId ?? "(auto)"}"`,
      pending: db.payouts.filter((p) => p.status === "REQUESTED" || p.status === "PROCESSING").map((p) => p.id),
    };
  }

  const idemKey = payoutCompleteKey(payout.id);
  if (payout.status === "PAID" || hasIdempotencyKey(idemKey)) {
    return { ok: true, alreadyProcessed: true, payout };
  }

  const amountUsdMicros = centsToMicros(payout.amountUsdCents);

  try {
    moveToPayoutPaid(payout.userId, amountUsdMicros, { payoutId: payout.id, idempotencyKey: idemKey });
  } catch (err) {
    return { ok: false, code: "INTERNAL_ERROR", message: err.message };
  }

  payout.status    = "PAID";
  payout.updatedAt = new Date().toISOString();
  markIdempotencyKey(idemKey);

  const wallet = getOrCreateWallet(payout.userId);
  console.log(`[payout] mock-complete: ${payout.id} — ${payout.amountUsdCents}¢`);
  return { ok: true, payout, summary: payoutSummary(wallet) };
}

/**
 * Marks a payout as FAILED, moves requested back → available.
 * Idempotent: returns alreadyProcessed if already resolved.
 */
function failPayout(payoutId, reason) {
  const payout = payoutId
    ? db.payouts.find((p) => p.id === payoutId)
    : db.payouts.find((p) => p.status === "REQUESTED" || p.status === "PROCESSING");

  if (!payout) {
    return {
      ok: false,
      code: "PAYOUT_NOT_FOUND",
      message: `No pending payout found: "${payoutId ?? "(auto)"}"`,
    };
  }

  if (payout.status === "PAID" || payout.status === "FAILED") {
    return { ok: true, alreadyProcessed: true, payout };
  }

  const amountUsdMicros = centsToMicros(payout.amountUsdCents);

  try {
    movePayoutBackToAvailable(payout.userId, amountUsdMicros, { payoutId: payout.id, reason });
  } catch (err) {
    return { ok: false, code: "INTERNAL_ERROR", message: err.message };
  }

  payout.status    = "FAILED";
  payout.updatedAt = new Date().toISOString();

  const wallet = getOrCreateWallet(payout.userId);
  console.log(`[payout] mock-fail: ${payout.id} — ${payout.amountUsdCents}¢ — reason: ${reason ?? "none"}`);
  return { ok: true, payout, summary: payoutSummary(wallet) };
}

/**
 * Seeds creator earnings for testing payout UI.
 * amountUsdMicros: integer micros (e.g. 5_000_000 for $5.00)
 */
function mockEarn(userId, amountUsdMicros) {
  if (amountUsdMicros <= 0) {
    return { ok: false, code: "VALIDATION_ERROR", message: "amountUsdMicros must be a positive integer." };
  }
  seedCreatorEarnings(userId, amountUsdMicros, { source: "MOCK_EARN" });
  const wallet = getOrCreateWallet(userId);
  console.log(`[payout] mock-earn: +${amountUsdMicros} micros ($${microsToDollars(amountUsdMicros).toFixed(2)}) — ${userId}`);
  return { ok: true, creditedMicros: amountUsdMicros, summary: payoutSummary(wallet) };
}

module.exports = { requestPayout, completePayout, failPayout, mockEarn };
