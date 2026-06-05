"use strict";

const { db } = require("../db");
const { MOCK_AUTHOR_ID } = require("../config/env");
const { creditReferralReward } = require("../services/wallet");

module.exports = async function handleReferrals(req, res, { path, method, readBody, json }) {
  // ── GET /me/referral ───────────────────────────────────────────────────────
  if (path === "/me/referral" && method === "GET") {
    return json(res, 200, {
      referralCode: db.user.referralCode,
      referralLink: db.user.referralLink,
      yoinksEarned: 1,
    }), true;
  }

  // ── GET /me/contacts ───────────────────────────────────────────────────────
  if (path === "/me/contacts" && method === "GET") {
    return json(res, 200, { contacts: db.contacts }), true;
  }

  // ── POST /me/invite/send ───────────────────────────────────────────────────
  if (path === "/me/invite/send" && method === "POST") {
    const body       = await readBody(req);
    const contactIds = Array.isArray(body.contactIds) ? body.contactIds : [];

    let newlyInvited = 0;
    for (const id of contactIds) {
      const contact = db.contacts.find((c) => c.id === id);
      if (contact && !contact.invited) {
        contact.invited = true;
        newlyInvited++;
      }
    }

    // MOCK ONLY: immediately simulate the full referral-accepted lifecycle.
    // In production, the reward fires only when the invitee signs up and
    // completes onboarding. Here we shortcut straight to credited.
    if (newlyInvited > 0) {
      creditReferralReward(MOCK_AUTHOR_ID, newlyInvited, {
        source: "REFERRAL",
      });
      console.log(`[referral] credited ${newlyInvited} Yoink(s) for new invites`);
    }

    const wallet = require("../services/wallet").getOrCreateWallet(MOCK_AUTHOR_ID);
    return json(res, 200, {
      invited:         newlyInvited,
      newYoinksBalance: wallet.yoinksAvailable,
    }), true;
  }

  return false;
};
