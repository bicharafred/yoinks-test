"use strict";

const { db } = require("../db");
const { UNLOCK_COST_YOINKS, MOCK_AUTHOR_ID } = require("../config/env");
const { creatorShareMicros, platformFeeMicros } = require("../utils/money");
const { unlockKey } = require("../utils/ids");
const { hasIdempotencyKey, markIdempotencyKey } = require("./ledger");
const {
  getOrCreateWallet,
  debitYoinksForUnlock,
  creditCreatorEarnings,
  recordPlatformFee,
} = require("./wallet");

/**
 * Returns true if viewerId has already unlocked momentId.
 * Checks both the in-memory Set and the app-side flag (moment.isBlurred === false
 * on the dev user's own moments, which are pre-unlocked in seed).
 */
function isUnlocked(viewerId, momentId) {
  return db.unlockedMoments.has(unlockKey(viewerId, momentId));
}

function markUnlocked(viewerId, momentId) {
  db.unlockedMoments.add(unlockKey(viewerId, momentId));
}

/**
 * Full unlock flow. Returns:
 *   { ok: true, alreadyUnlocked: true }          — idempotent re-unlock
 *   { ok: true }                                  — successful new unlock
 *   { ok: false, code, message }                  — error
 *
 * The viewerId is always MOCK_AUTHOR_ID in this mock (single auth user).
 */
function unlockMoment(momentId) {
  const viewerId = MOCK_AUTHOR_ID;
  const idemKey  = unlockKey(viewerId, momentId);

  // Idempotency: already unlocked in this session
  if (isUnlocked(viewerId, momentId) || hasIdempotencyKey(idemKey)) {
    return { ok: true, alreadyUnlocked: true };
  }

  const moment = db.moments.find((m) => m.id === momentId);
  if (!moment) {
    return { ok: false, code: "MOMENT_NOT_FOUND", message: `Moment "${momentId}" not found.` };
  }

  // Already visible (not blurred) — treat as unlocked without charging
  if (!moment.isBlurred && !moment.isLocked) {
    markUnlocked(viewerId, momentId);
    markIdempotencyKey(idemKey);
    return { ok: true, alreadyUnlocked: true };
  }

  const creatorId = moment.author?.id;
  const viewerWallet = getOrCreateWallet(viewerId);

  if (viewerWallet.yoinksAvailable < UNLOCK_COST_YOINKS) {
    return {
      ok: false,
      code: "INSUFFICIENT_YOINKS",
      message: "You do not have enough Yoinks to unlock this Moment.",
      details: { required: UNLOCK_COST_YOINKS, available: viewerWallet.yoinksAvailable },
    };
  }

  // Debit viewer (writes YOINKS_SPENT ledger entry)
  debitYoinksForUnlock(viewerId, {
    momentId,
    relatedUserId:  creatorId,
    idempotencyKey: idemKey,
  });

  // Credit creator (writes CREATOR_EARNED ledger entry)
  if (creatorId) {
    creditCreatorEarnings(creatorId, creatorShareMicros(), {
      momentId,
      relatedUserId:  viewerId,
      idempotencyKey: idemKey,
    });
  }

  // Record platform fee (writes PLATFORM_FEE ledger entry)
  recordPlatformFee(platformFeeMicros(), {
    momentId,
    relatedUserId:  viewerId,
    idempotencyKey: idemKey,
  });

  // Update moment state
  moment.isBlurred = false;
  moment.isLocked  = false;

  // Mark as processed
  markUnlocked(viewerId, momentId);
  markIdempotencyKey(idemKey);

  return { ok: true };
}

module.exports = { unlockMoment, isUnlocked, markUnlocked };
