"use strict";

const { createSeedData } = require("../data/seed");

// Single shared in-memory database. CommonJS module caching ensures all
// require('../db') calls return this same object reference.
const db = createSeedData();

/**
 * Resets all mutable db fields to their seed values in-place.
 * Object/array references are preserved so modules that already destructured
 * them continue to see the changes.
 */
function resetDb() {
  const fresh = createSeedData();

  // User (includes blockedAuthorIds, hiddenMomentIds, hiddenCreatorIds)
  Object.assign(db.user, fresh.user);

  // Wallets (plain object — clear keys then assign fresh)
  for (const k in db.wallets) delete db.wallets[k];
  Object.assign(db.wallets, fresh.wallets);

  // Arrays — mutate in-place to preserve references
  db.moments.length = 0;
  db.moments.push(...fresh.moments);

  db.comments.length = 0;
  db.comments.push(...fresh.comments);

  db.replies.length = 0;
  db.replies.push(...fresh.replies);

  db.contacts.length = 0;
  db.contacts.push(...fresh.contacts);

  db.notifications.length = 0;
  db.notifications.push(...fresh.notifications);

  db.interactions.length = 0;
  db.interactions.push(...fresh.interactions);

  db.ledger.length = 0;
  db.ledger.push(...fresh.ledger);

  db.payouts.length = 0;
  db.reports.length = 0;

  // Sets
  db.processedIdempotencyKeys.clear();
  db.processedStripeEvents.clear();
  db.unlockedMoments.clear();

  // Plain object
  for (const k in db.mockPendingPayments) delete db.mockPendingPayments[k];

  db.momentCounter = fresh.momentCounter;
}

module.exports = { db, resetDb };
