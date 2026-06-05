"use strict";

const { db } = require("../db");
const { uid } = require("../utils/ids");

/**
 * Appends a ledger entry and returns it.
 * Caller provides all domain fields; this function adds id + createdAt.
 *
 * Required: type, userId
 * Optional: relatedUserId, momentId, payoutId, paymentIntentId, stripeEventId,
 *           idempotencyKey, amountYoinks, amountUsdMicros, status, source, metadata
 */
function appendLedgerEntry(fields) {
  const entry = {
    id: uid("ledger"),
    createdAt: new Date().toISOString(),
    status: "CONFIRMED",
    ...fields,
  };
  db.ledger.push(entry);
  return entry;
}

/** Returns true if the idempotency key has already been processed. */
function hasIdempotencyKey(key) {
  return db.processedIdempotencyKeys.has(key);
}

/** Marks an idempotency key as processed. */
function markIdempotencyKey(key) {
  db.processedIdempotencyKeys.add(key);
}

/** Returns true if the Stripe event ID has already been processed. */
function hasStripeEvent(stripeEventId) {
  return db.processedStripeEvents.has(stripeEventId);
}

/** Marks a Stripe event ID as processed. */
function markStripeEvent(stripeEventId) {
  db.processedStripeEvents.add(stripeEventId);
}

module.exports = {
  appendLedgerEntry,
  hasIdempotencyKey,
  markIdempotencyKey,
  hasStripeEvent,
  markStripeEvent,
};
