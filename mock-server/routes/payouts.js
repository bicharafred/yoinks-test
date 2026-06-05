"use strict";

const { db } = require("../db");
const { MOCK_AUTHOR_ID } = require("../config/env");
const { centsToMicros } = require("../utils/money");
const { getOrCreateWallet, payoutSummary } = require("../services/wallet");
const { requestPayout, completePayout, failPayout, mockEarn } = require("../services/payout");

module.exports = async function handlePayouts(req, res, { path, method, readBody, json, apiError }) {
  // ── GET /payout/history ────────────────────────────────────────────────────
  if (path === "/payout/history" && method === "GET") {
    return json(res, 200, { payouts: db.payouts }), true;
  }

  // ── GET /payout/summary ────────────────────────────────────────────────────
  if (path === "/payout/summary" && method === "GET") {
    const wallet = getOrCreateWallet(MOCK_AUTHOR_ID);
    return json(res, 200, payoutSummary(wallet)), true;
  }

  // ── POST /payout/request ───────────────────────────────────────────────────
  if (path === "/payout/request" && method === "POST") {
    const body = await readBody(req);

    // Determine amount: prefer amountUsdCents, fall back to full available balance
    let amountUsdCents;
    if (typeof body.amountUsdCents === "number" && Number.isInteger(body.amountUsdCents) && body.amountUsdCents > 0) {
      amountUsdCents = body.amountUsdCents;
    } else {
      const wallet = getOrCreateWallet(MOCK_AUTHOR_ID);
      amountUsdCents = Math.floor(wallet.payoutAvailableUsdMicros / 10_000);
    }

    const userId    = MOCK_AUTHOR_ID;
    const requestId = typeof body.requestId === "string" && body.requestId.trim() !== ""
      ? body.requestId.trim()
      : undefined;
    const result = requestPayout(userId, amountUsdCents, requestId);

    if (!result.ok) {
      return json(res, 400, apiError(result.code, result.message, result.details)), true;
    }
    return json(res, 200, result), true;
  }

  // ── POST /payout/mock-complete ─────────────────────────────────────────────
  if (path === "/payout/mock-complete" && method === "POST") {
    const body    = await readBody(req);
    const payoutId = typeof body.payoutId === "string" ? body.payoutId.trim() : "";
    const result  = completePayout(payoutId || null);

    if (!result.ok) {
      return json(res, 404, apiError(result.code, result.message, { pending: result.pending })), true;
    }
    return json(res, 200, result), true;
  }

  // ── POST /payout/mock-fail ─────────────────────────────────────────────────
  if (path === "/payout/mock-fail" && method === "POST") {
    const body    = await readBody(req);
    const payoutId = typeof body.payoutId === "string" ? body.payoutId.trim() : "";
    const reason  = typeof body.reason === "string" ? body.reason : "Simulated failure";
    const result  = failPayout(payoutId || null, reason);

    if (!result.ok) {
      return json(res, 404, apiError(result.code, result.message)), true;
    }
    return json(res, 200, result), true;
  }

  // ── POST /payout/mock-earn ─────────────────────────────────────────────────
  if (path === "/payout/mock-earn" && method === "POST") {
    const body = await readBody(req);

    // Accept amountUsdMicros (preferred) or amountUsdCents (legacy)
    let amountUsdMicros;
    if (typeof body.amountUsdMicros === "number" && Number.isInteger(body.amountUsdMicros) && body.amountUsdMicros > 0) {
      amountUsdMicros = body.amountUsdMicros;
    } else if (typeof body.amountUsdCents === "number" && Number.isInteger(body.amountUsdCents) && body.amountUsdCents > 0) {
      amountUsdMicros = centsToMicros(body.amountUsdCents);
    } else {
      amountUsdMicros = 1_000_000; // default $1.00
    }

    const userId = MOCK_AUTHOR_ID;
    const result = mockEarn(userId, amountUsdMicros);

    if (!result.ok) {
      return json(res, 400, apiError(result.code, result.message)), true;
    }
    return json(res, 200, result), true;
  }

  return false;
};
