/**
 * Yoinks Mock Server
 * ──────────────────
 * Local-development only. Simulates backend behavior for UX/product testing.
 * Not production code.
 *
 * REST      → http://localhost:4000/
 * GraphQL   → http://localhost:4000/graphql
 * WebSocket → ws://localhost:4000/graphql
 * Webhook   → POST http://localhost:4000/stripe/webhook
 *
 * See docs/MOCK_SERVER_API.md for full endpoint reference.
 */

"use strict";

const http    = require("http");
const { WebSocketServer } = require("ws");

const { PORT, MOCK_PAYMENTS_ENABLED, PAYMENTS_MODE, isStripeConfigured } = require("./config/env");
const { json, readBody, readBodyBuffer, CORS_HEADERS, apiError } = require("./utils/http");
const { db } = require("./db");

// ── Route handlers (evaluated in order; first match wins) ─────────────────────
const routes = [
  require("./routes/auth"),
  require("./routes/graphql"),
  require("./routes/moments"),
  require("./routes/payments"),
  require("./routes/payouts"),
  require("./routes/referrals"),
  require("./routes/stripe"),
  require("./routes/users"),
  require("./routes/moderation"),
  require("./routes/transactions"),
  require("./routes/feedback"),
  require("./routes/debug"),
];

// ── HTTP handler ──────────────────────────────────────────────────────────────

async function handleRequest(req, res) {
  const url    = new URL(req.url, "http://localhost");
  const path   = url.pathname;
  const method = req.method;

  // CORS preflight
  if (method === "OPTIONS") {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  console.log(`[mock] ${method} ${path}`);

  const ctx = { path, method, readBody, readBodyBuffer, json, apiError };

  for (const route of routes) {
    try {
      const handled = await route(req, res, ctx);
      if (handled) return;
    } catch (err) {
      console.error(`[mock] Unhandled error in route for ${method} ${path}:`, err);
      json(res, 500, apiError("INTERNAL_ERROR", err.message));
      return;
    }
  }

  console.warn(`[mock] No handler: ${method} ${path}`);
  json(res, 404, apiError("NOT_FOUND", `No mock handler for ${method} ${path}`));
}

// ── Server startup ────────────────────────────────────────────────────────────

const server = http.createServer(handleRequest);

// WebSocket — notifications subscription (silent; connection accepted, events never fire)
const wss = new WebSocketServer({ server, path: "/graphql" });
wss.on("connection", (ws) => {
  console.log("[mock] WebSocket connected (notifications subscription)");
  ws.send(JSON.stringify({ type: "connection_ack", payload: { connectionTimeoutMs: 300000 } }));
  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg.toString());
      if (data.type === "connection_init") ws.send(JSON.stringify({ type: "connection_ack", payload: {} }));
      if (data.type === "start" || data.type === "subscribe") ws.send(JSON.stringify({ id: data.id, type: "start_ack" }));
    } catch {}
  });
  ws.on("error", () => {});
});

function validateCommentCounts() {
  const mismatches = db.moments.filter((m) => {
    const actual = db.comments.filter((c) => c.momentId === m.id && !c.parentCommentId).length;
    return m.commentCount !== actual;
  });
  mismatches.forEach((m) => {
    const actual = db.comments.filter((c) => c.momentId === m.id && !c.parentCommentId).length;
    console.warn(`[validate] commentCount mismatch: ${m.id} stored=${m.commentCount} actual=${actual}`);
  });
}

function validateReplies() {
  db.comments
    .filter((c) => c.parentCommentId)
    .forEach((r) => {
      const parent = db.comments.find((c) => c.id === r.parentCommentId && !c.parentCommentId);
      if (!parent) {
        console.warn(`[validate] reply ${r.id} has invalid/missing parentCommentId: ${r.parentCommentId}`);
      } else if (parent.momentId !== r.momentId) {
        console.warn(`[validate] reply ${r.id} momentId=${r.momentId} does not match parent momentId=${parent.momentId}`);
      }
    });
}

function validateInteractions() {
  const seen = new Set();
  db.interactions.forEach((i) => {
    const key = `${i.momentId}:${i.viewer?.id ?? i.viewerId ?? "unknown"}`;
    if (seen.has(key)) {
      console.warn(`[validate] duplicate interaction record: ${key}`);
    } else {
      seen.add(key);
    }
  });
}

server.listen(PORT, () => {
  const seededBlurred   = db.moments.filter((m) => m.isBlurred).length;
  const seededVideos    = db.moments.filter((m) => m.type === "VIDEO").length;
  const seededCarousels = db.moments.filter((m) => Array.isArray(m.mediaItems) && m.mediaItems.length > 1).length;
  const seededInvited   = db.contacts.filter((c) => c.invited).length;

  const wallet = require("./services/wallet").getOrCreateWallet(require("./config/env").MOCK_AUTHOR_ID);
  const { yoinksToTransferable, microsToDollars } = require("./utils/money");

  const paymentStatus = PAYMENTS_MODE === "mock"
    ? "✅ mock — POST /mock-payment/complete to confirm a purchase"
    : PAYMENTS_MODE === "stripe_test"
      ? "✅ stripe_test — webhook required"
      : "⚠️  unconfigured — set MOCK_PAYMENTS=true or add STRIPE_SECRET_KEY";

  const webhookStatus = MOCK_PAYMENTS_ENABLED
    ? "— skipped (PAYMENTS_MODE=mock)"
    : (process.env.STRIPE_WEBHOOK_SECRET ?? "") !== "" && process.env.STRIPE_WEBHOOK_SECRET !== "whsec_REPLACE_ME"
      ? "✅ configured"
      : "⚠️  not configured — run: stripe listen --forward-to localhost:4000/stripe/webhook";

  validateCommentCounts();
  validateReplies();
  validateInteractions();
  console.log(`[payment] mode: ${PAYMENTS_MODE}`);
  console.log(`\n✅  Yoinks mock server running!\n`);
  console.log(`   GraphQL   → http://localhost:${PORT}/graphql`);
  console.log(`   REST      → http://localhost:${PORT}/`);
  console.log(`   WebSocket → ws://localhost:${PORT}/graphql`);
  console.log(`   Webhook   → POST http://localhost:${PORT}/stripe/webhook\n`);
  console.log(`   Dev user  : ${db.user.name} (${db.user.email})`);
  console.log(`   Moments   : ${db.moments.length} total (${seededBlurred} blurred, ${seededVideos} video, ${seededCarousels} carousel)`);
  console.log(`   Contacts  : ${db.contacts.length} (${seededInvited} already invited)`);
  console.log(`   Wallet    : ${wallet.yoinksAvailable} Yoinks | payout available $${microsToDollars(wallet.payoutAvailableUsdMicros).toFixed(2)}`);
  console.log(`   Payments  : ${paymentStatus}`);
  console.log(`   Webhook   : ${webhookStatus}`);
  console.log(`\n   Debug     : GET /wallet  GET /wallet/history  GET /ledger  GET /stripe/debug  GET /debug/state`);
  console.log(`   Reset     : POST /debug/reset`);
  if (MOCK_PAYMENTS_ENABLED) {
    console.log(`   Mock pay  : POST /mock-payment/complete`);
  }
  console.log(`   Payout    : GET /payout/history  GET /payout/summary`);
  console.log(`              POST /payout/request  POST /payout/mock-earn`);
  console.log(`              POST /payout/mock-complete  POST /payout/mock-fail`);
  console.log(`\n   Press Ctrl+C to stop.\n`);
});
