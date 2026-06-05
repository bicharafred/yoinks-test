"use strict";

let _seq = 0;

function uid(prefix) {
  _seq++;
  return `${prefix}_${Date.now()}_${_seq}`;
}

/**
 * Strips the "USER#" prefix the app sometimes sends in userId fields.
 * "USER#mock-user-001" → "mock-user-001"
 * "mock-user-001"      → "mock-user-001"
 */
function normalizeUserId(userId) {
  if (typeof userId === "string" && userId.startsWith("USER#")) {
    return userId.slice(5);
  }
  return userId;
}

/**
 * Compare two user IDs regardless of prefix.
 * isSameUserId("USER#mock-user-001", "mock-user-001") → true
 */
function isSameUserId(a, b) {
  return normalizeUserId(a) === normalizeUserId(b);
}

/** Stable key for unlock idempotency */
function unlockKey(viewerId, momentId) {
  return `unlock:${viewerId}:${momentId}`;
}

/** Stable key for mock/stripe purchase idempotency */
function purchaseKey(paymentIntentId) {
  return `purchase:${paymentIntentId}`;
}

/** Stable key for payout-request idempotency */
function payoutRequestKey(userId, requestId) {
  return `payout-request:${userId}:${requestId}`;
}

/** Stable key for payout-complete idempotency */
function payoutCompleteKey(payoutId) {
  return `payout-complete:${payoutId}`;
}

module.exports = { uid, normalizeUserId, isSameUserId, unlockKey, purchaseKey, payoutRequestKey, payoutCompleteKey };
