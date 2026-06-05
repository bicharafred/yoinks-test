"use strict";

const { db } = require("../db");
const { MOCK_AUTHOR_ID, YOINK_VALUE_USD_MICROS, USD_MICROS_PER_DOLLAR } = require("../config/env");

const HIDDEN_TYPES = new Set(["PLATFORM_FEE"]);

const RANGE_MS = {
  last_week:  7   * 24 * 60 * 60 * 1000,
  last_month: 30  * 24 * 60 * 60 * 1000,
  last_year:  365 * 24 * 60 * 60 * 1000,
};

module.exports = async function handleTransactions(req, res, { path, method, json }) {
  if (path !== "/transactions" || method !== "GET") return false;

  const url      = new URL(req.url, "http://localhost");
  const range    = url.searchParams.get("range") ?? "last_week";
  const cutoffMs = RANGE_MS[range] ?? RANGE_MS.last_week;
  const cutoff   = Date.now() - cutoffMs;

  const items = db.ledger
    .filter((e) => {
      if (HIDDEN_TYPES.has(e.type)) return false;
      if (e.userId !== MOCK_AUTHOR_ID) return false;
      return new Date(e.createdAt).getTime() >= cutoff;
    })
    .map((e) => ({
      id:              e.id,
      type:            e.type,
      status:          e.status ?? "CONFIRMED",
      amountYoinks:    e.amountYoinks    ?? null,
      amountUsdMicros: e.amountUsdMicros ?? null,
      momentId:        e.momentId        ?? null,
      payoutId:        e.payoutId        ?? null,
      createdAt:       e.createdAt,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return json(res, 200, { transactions: items, count: items.length }), true;
};
