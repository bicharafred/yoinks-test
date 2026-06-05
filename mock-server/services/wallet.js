"use strict";

const { db } = require("../db");
const { appendLedgerEntry } = require("./ledger");
const { yoinksToTransferable, microsToDollars } = require("../utils/money");

/** Gets the wallet for userId, creating an empty one if needed. */
function getOrCreateWallet(userId) {
  if (!db.wallets[userId]) {
    db.wallets[userId] = {
      userId,
      yoinksAvailable: 0,
      payoutAvailableUsdMicros: 0,
      payoutRequestedUsdMicros: 0,
      payoutPaidLifetimeUsdMicros: 0,
      updatedAt: new Date().toISOString(),
    };
  }
  return db.wallets[userId];
}

/**
 * Returns the wallet shape the app's getWalletBalance GraphQL query expects:
 *   { transferable: float, redeemable: float }
 * transferable = yoinksAvailable * $0.05 (app divides by 0.05 to display Yoinks count)
 * redeemable   = payoutAvailableUsdMicros as dollars
 */
function walletToApiShape(wallet) {
  return {
    transferable: yoinksToTransferable(wallet.yoinksAvailable),
    redeemable:   microsToDollars(wallet.payoutAvailableUsdMicros),
  };
}

/**
 * Returns a full human-readable summary of the payout wallet for the
 * GET /payout/summary endpoint.
 */
function payoutSummary(wallet) {
  return {
    userId:                       wallet.userId,
    payoutAvailableUsdMicros:     wallet.payoutAvailableUsdMicros,
    payoutRequestedUsdMicros:     wallet.payoutRequestedUsdMicros,
    payoutPaidLifetimeUsdMicros:  wallet.payoutPaidLifetimeUsdMicros,
    payoutAvailableDisplay:       microsToDollars(wallet.payoutAvailableUsdMicros).toFixed(2),
    payoutRequestedDisplay:       microsToDollars(wallet.payoutRequestedUsdMicros).toFixed(2),
    payoutPaidLifetimeDisplay:    microsToDollars(wallet.payoutPaidLifetimeUsdMicros).toFixed(2),
  };
}

function touchWallet(wallet) {
  wallet.updatedAt = new Date().toISOString();
}

// ── Yoinks ────────────────────────────────────────────────────────────────────

/**
 * Credits yoinksAmount to userId and writes a YOINKS_PURCHASED ledger entry.
 * meta: { paymentIntentId, stripeEventId, idempotencyKey, source }
 */
function creditYoinks(userId, yoinksAmount, meta = {}) {
  const wallet = getOrCreateWallet(userId);
  wallet.yoinksAvailable += yoinksAmount;
  touchWallet(wallet);
  return appendLedgerEntry({
    type:               "YOINKS_PURCHASED",
    userId,
    amountYoinks:       yoinksAmount,
    paymentIntentId:    meta.paymentIntentId ?? null,
    stripeEventId:      meta.stripeEventId   ?? null,
    idempotencyKey:     meta.idempotencyKey  ?? null,
    source:             meta.source          ?? null,
    status:             "CONFIRMED",
  });
}

/**
 * Debits 1 Yoink from viewerId for an unlock. Returns false if insufficient.
 * Writes a YOINKS_SPENT ledger entry on success.
 * meta: { momentId, relatedUserId (creator), idempotencyKey }
 */
function debitYoinksForUnlock(viewerId, meta = {}) {
  const wallet = getOrCreateWallet(viewerId);
  if (wallet.yoinksAvailable < 1) return false;
  wallet.yoinksAvailable -= 1;
  touchWallet(wallet);
  appendLedgerEntry({
    type:           "YOINKS_SPENT",
    userId:         viewerId,
    amountYoinks:   -1,
    momentId:       meta.momentId       ?? null,
    relatedUserId:  meta.relatedUserId  ?? null,
    idempotencyKey: meta.idempotencyKey ?? null,
    source:         "UNLOCK",
    status:         "CONFIRMED",
  });
  return true;
}

// ── Payout / creator earnings ─────────────────────────────────────────────────

/**
 * Credits creator earnings in micros to userId's payoutAvailable.
 * Writes a CREATOR_EARNED ledger entry.
 * meta: { momentId, relatedUserId (viewer), idempotencyKey, source }
 */
function creditCreatorEarnings(userId, amountUsdMicros, meta = {}) {
  const wallet = getOrCreateWallet(userId);
  wallet.payoutAvailableUsdMicros += amountUsdMicros;
  touchWallet(wallet);
  return appendLedgerEntry({
    type:           "CREATOR_EARNED",
    userId,
    amountUsdMicros,
    momentId:       meta.momentId      ?? null,
    relatedUserId:  meta.relatedUserId ?? null,
    idempotencyKey: meta.idempotencyKey ?? null,
    source:         meta.source        ?? "UNLOCK",
    status:         "CONFIRMED",
  });
}

/**
 * Records a platform fee in micros. No wallet is debited — this is a record only.
 * Writes a PLATFORM_FEE ledger entry.
 */
function recordPlatformFee(amountUsdMicros, meta = {}) {
  return appendLedgerEntry({
    type:           "PLATFORM_FEE",
    userId:         "platform",
    amountUsdMicros,
    momentId:       meta.momentId      ?? null,
    relatedUserId:  meta.relatedUserId ?? null,
    idempotencyKey: meta.idempotencyKey ?? null,
    source:         meta.source        ?? "UNLOCK",
    status:         "CONFIRMED",
  });
}

/**
 * Moves amountUsdMicros from payoutAvailable → payoutRequested.
 * Writes a PAYOUT_REQUESTED ledger entry.
 * Returns false if insufficient available balance.
 * meta: { payoutId, idempotencyKey }
 */
function moveToPayoutRequested(userId, amountUsdMicros, meta = {}) {
  const wallet = getOrCreateWallet(userId);
  if (wallet.payoutAvailableUsdMicros < amountUsdMicros) return false;
  wallet.payoutAvailableUsdMicros  -= amountUsdMicros;
  wallet.payoutRequestedUsdMicros  += amountUsdMicros;
  touchWallet(wallet);
  appendLedgerEntry({
    type:           "PAYOUT_REQUESTED",
    userId,
    amountUsdMicros,
    payoutId:       meta.payoutId       ?? null,
    idempotencyKey: meta.idempotencyKey ?? null,
    status:         "CONFIRMED",
  });
  return true;
}

/**
 * Moves amountUsdMicros from payoutRequested → payoutPaidLifetime.
 * Writes a PAYOUT_PAID ledger entry.
 * Throws if payoutRequested < amountUsdMicros (payout inconsistency).
 * meta: { payoutId, idempotencyKey }
 */
function moveToPayoutPaid(userId, amountUsdMicros, meta = {}) {
  const wallet = getOrCreateWallet(userId);
  if (wallet.payoutRequestedUsdMicros < amountUsdMicros) {
    throw new Error(
      `Payout inconsistency for ${userId}: requested ${wallet.payoutRequestedUsdMicros} micros but trying to mark paid ${amountUsdMicros} micros`,
    );
  }
  wallet.payoutRequestedUsdMicros     -= amountUsdMicros;
  wallet.payoutPaidLifetimeUsdMicros  += amountUsdMicros;
  touchWallet(wallet);
  return appendLedgerEntry({
    type:           "PAYOUT_PAID",
    userId,
    amountUsdMicros,
    payoutId:       meta.payoutId       ?? null,
    idempotencyKey: meta.idempotencyKey ?? null,
    status:         "CONFIRMED",
  });
}

/**
 * Moves amountUsdMicros from payoutRequested back → payoutAvailable (payout failed).
 * Writes a PAYOUT_FAILED ledger entry.
 * Throws if payoutRequested < amountUsdMicros (payout inconsistency).
 * meta: { payoutId, reason, idempotencyKey }
 */
function movePayoutBackToAvailable(userId, amountUsdMicros, meta = {}) {
  const wallet = getOrCreateWallet(userId);
  if (wallet.payoutRequestedUsdMicros < amountUsdMicros) {
    throw new Error(
      `Payout inconsistency for ${userId}: requested ${wallet.payoutRequestedUsdMicros} micros but trying to roll back ${amountUsdMicros} micros`,
    );
  }
  wallet.payoutRequestedUsdMicros  -= amountUsdMicros;
  wallet.payoutAvailableUsdMicros  += amountUsdMicros;
  touchWallet(wallet);
  return appendLedgerEntry({
    type:           "PAYOUT_FAILED",
    userId,
    amountUsdMicros,
    payoutId:       meta.payoutId       ?? null,
    idempotencyKey: meta.idempotencyKey ?? null,
    metadata:       meta.reason ? { reason: meta.reason } : undefined,
    status:         "CONFIRMED",
  });
}

/**
 * Credits creator earnings without a corresponding unlock — used by mock-earn
 * (seeding payout balance for testing).
 * meta: { source }
 */
function seedCreatorEarnings(userId, amountUsdMicros, meta = {}) {
  const wallet = getOrCreateWallet(userId);
  wallet.payoutAvailableUsdMicros += amountUsdMicros;
  touchWallet(wallet);
  return appendLedgerEntry({
    type:           "CREATOR_EARNED",
    userId,
    amountUsdMicros,
    source:         meta.source ?? "MOCK_EARN",
    status:         "CONFIRMED",
  });
}

/**
 * Credits yoinks from referral invite (mock shortcut — simulates full lifecycle).
 * Writes a REFERRAL_REWARD ledger entry.
 */
function creditReferralReward(userId, yoinksAmount, meta = {}) {
  const wallet = getOrCreateWallet(userId);
  wallet.yoinksAvailable += yoinksAmount;
  touchWallet(wallet);
  return appendLedgerEntry({
    type:           "REFERRAL_REWARD",
    userId,
    amountYoinks:   yoinksAmount,
    idempotencyKey: meta.idempotencyKey ?? null,
    source:         "REFERRAL",
    status:         "CONFIRMED",
  });
}

module.exports = {
  getOrCreateWallet,
  walletToApiShape,
  payoutSummary,
  creditYoinks,
  debitYoinksForUnlock,
  creditCreatorEarnings,
  recordPlatformFee,
  moveToPayoutRequested,
  moveToPayoutPaid,
  movePayoutBackToAvailable,
  seedCreatorEarnings,
  creditReferralReward,
};
