"use strict";

const pathLib = require("path");
require("dotenv").config({ path: pathLib.join(__dirname, "../.env") });

// ── Identity ──────────────────────────────────────────────────────────────────
const MOCK_AUTHOR_ID = "mock-user-001";

// ── Money constants (all amounts stored as integer USD micros internally) ─────
const USD_MICROS_PER_DOLLAR = 1_000_000;
const YOINK_VALUE_USD_MICROS = 50_000;  // $0.05 per Yoink
const CREATOR_SHARE_BPS      = 7_000;   // 70% to creator
const PLATFORM_SHARE_BPS     = 3_000;   // 30% platform fee
const UNLOCK_COST_YOINKS     = 1;

// ── Packages available for purchase ──────────────────────────────────────────
// Keyed by amount in USD cents (matches what the app sends as body.amount).
const STRIPE_PACKAGES = {
  499: { packageId: "yoinks_40", yoinks: 40 },
};

// ── Payment mode ──────────────────────────────────────────────────────────────
// MOCK_PAYMENTS=true  → fake PIs, no Stripe needed, POST /mock-payment/complete
// MOCK_PAYMENTS=false → real Stripe Test Mode with sk_test_ key + webhook
const MOCK_PAYMENTS_ENABLED = process.env.MOCK_PAYMENTS === "true";

function isStripeConfigured() {
  const key = (process.env.STRIPE_SECRET_KEY ?? "").trim();
  return key.startsWith("sk_test_") || key.startsWith("sk_live_");
}

const PAYMENTS_MODE = MOCK_PAYMENTS_ENABLED
  ? "mock"
  : isStripeConfigured()
    ? "stripe_test"
    : "unconfigured";

// ── Network ───────────────────────────────────────────────────────────────────
// PORT: Railway/Render/Fly inject this automatically; local dev falls back to 4000.
const PORT = parseInt(process.env.PORT ?? "4000", 10);

// PUBLIC_API_BASE_URL: used to construct absolute upload/media URLs returned to the app.
// Local:  http://localhost:4000
// Hosted: https://your-mock-server.onrender.com  (set via server env var)
const PUBLIC_API_BASE_URL = (process.env.PUBLIC_API_BASE_URL ?? `http://localhost:${PORT}`).replace(/\/$/, "");

module.exports = {
  MOCK_AUTHOR_ID,
  USD_MICROS_PER_DOLLAR,
  YOINK_VALUE_USD_MICROS,
  CREATOR_SHARE_BPS,
  PLATFORM_SHARE_BPS,
  UNLOCK_COST_YOINKS,
  STRIPE_PACKAGES,
  MOCK_PAYMENTS_ENABLED,
  PAYMENTS_MODE,
  PORT,
  PUBLIC_API_BASE_URL,
  isStripeConfigured,
};
