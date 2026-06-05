"use strict";

const { db, resetDb } = require("../db");
const { MOCK_AUTHOR_ID, MOCK_PAYMENTS_ENABLED } = require("../config/env");
const { getOrCreateWallet, walletToApiShape, payoutSummary } = require("../services/wallet");
const { ledgerEntryToHistoryItem } = require("../services/transactions");

const WALLET_HISTORY_TYPES = new Set(["YOINKS_PURCHASED", "YOINKS_SPENT", "REFERRAL_REWARD"]);

module.exports = async function handleDebug(req, res, { path, method, json }) {
  // ── GET /health ────────────────────────────────────────────────────────────
  // Used by authService.local.ts as a pre-flight before dev login.
  if (path === "/health" && method === "GET") {
    return json(res, 200, { ok: true, server: "yoinks-mock", time: new Date().toISOString() }), true;
  }

  // ── GET / and HEAD / — root health probe (Render, uptime monitors) ─────────
  if (path === "/" && (method === "GET" || method === "HEAD")) {
    if (method === "HEAD") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end();
      return true;
    }
    return json(res, 200, { ok: true, message: "Yoinks mock API is running", env: process.env.APP_ENV ?? "local", timestamp: new Date().toISOString() }), true;
  }

  // ── POST /support-email ────────────────────────────────────────────────────
  if (path === "/support-email" && method === "POST") {
    return json(res, 200, { success: true }), true;
  }

  // ── GET /wallet/history — human-friendly Yoinks event history ────────────
  if (path === "/wallet/history" && method === "GET") {
    const items = db.ledger
      .filter((e) => WALLET_HISTORY_TYPES.has(e.type))
      .map(ledgerEntryToHistoryItem)
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return json(res, 200, { history: items, count: items.length }), true;
  }

  // ── GET /wallet — debug: wallet + ledger summary ───────────────────────────
  if (path === "/wallet" && method === "GET") {
    const wallet = getOrCreateWallet(MOCK_AUTHOR_ID);
    return json(res, 200, {
      walletApiShape:  walletToApiShape(wallet),
      walletInternal:  wallet,
      payoutSummary:   payoutSummary(wallet),
      ledger:          db.ledger,
      ledgerCount:     db.ledger.length,
    }), true;
  }

  // ── GET /ledger — debug: full ledger ──────────────────────────────────────
  if (path === "/ledger" && method === "GET") {
    return json(res, 200, { ledger: db.ledger, count: db.ledger.length }), true;
  }

  // ── GET /debug/state — full in-memory state snapshot ─────────────────────
  if (path === "/debug/state" && method === "GET") {
    const wallet = getOrCreateWallet(MOCK_AUTHOR_ID);
    return json(res, 200, {
      user:                    db.user,
      wallets:                 db.wallets,
      walletApiShape:          walletToApiShape(wallet),
      ledger:                  db.ledger,
      payouts:                 db.payouts,
      momentsCount:            db.moments.length,
      processedIdempotencyKeys: [...db.processedIdempotencyKeys],
      processedStripeEvents:   [...db.processedStripeEvents],
      unlockedMoments:         [...db.unlockedMoments],
      mockPendingPayments:     db.mockPendingPayments,
    }), true;
  }

  // ── POST /debug/reset — reset all mutable state to seed ──────────────────
  if (path === "/debug/reset" && method === "POST") {
    resetDb();
    console.log("[debug] State reset to seed.");
    const wallet = getOrCreateWallet(MOCK_AUTHOR_ID);
    return json(res, 200, {
      ok: true,
      message: "State reset to seed.",
      walletApiShape: walletToApiShape(wallet),
    }), true;
  }

  return false;
};
