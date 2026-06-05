"use strict";

const { db, resetDb } = require("../db");
const { MOCK_AUTHOR_ID } = require("../config/env");
const { AUTHORS } = require("../data/seed");
const { makeFakeJwt } = require("../utils/jwt");

// Build a lookup map from userId → Author for dev-login user selection.
const AUTHORS_BY_ID = Object.fromEntries(
  Object.values(AUTHORS).map((a) => [a.id, a])
);

function publicUser() {
  const { linkedProviders, ...rest } = db.user;
  return rest;
}

// Build a full user profile object for any seeded author (used for non-001 logins).
function buildUserProfile(author) {
  return {
    __typename: "Author",
    id: author.id,
    email: `${author.id}@yoinks.local`,
    name: author.name,
    isAdult: true,
    hasIdentityValidation: true,
    allowAdultContent: false,
    avatar: author.avatar ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    blockedAuthorIds: [],
    hiddenMomentIds: [],
    hiddenCreatorIds: [],
    setupStatus: "complete",
    payoutBetaEnabled: false,
    referralCode: null,
    referralLink: null,
  };
}

module.exports = async function handleAuth(req, res, { path, method, readBody, json }) {
  // ── POST /login ─────────────────────────────────────────────────────────────
  if (path === "/login" && method === "POST") {
    const body = await readBody(req);

    let provider;
    if (body.localDevBypass)             provider = "dev-bypass";
    else if (body.appleAuthRequest)      provider = "apple";
    else if (body.provider === "GOOGLE") provider = "google";
    else provider = `unknown (keys: ${Object.keys(body).join(", ")})`;

    // Dev-bypass supports a specific mock user; default to MOCK_AUTHOR_ID.
    let selectedUserId = MOCK_AUTHOR_ID;
    if (body.localDevBypass && body.mockUserId) {
      if (AUTHORS_BY_ID[body.mockUserId]) {
        selectedUserId = body.mockUserId;
      } else {
        console.warn(`[auth] /login — unknown mockUserId "${body.mockUserId}", falling back to ${MOCK_AUTHOR_ID}`);
      }
    }

    console.log(`[auth] /login — provider: ${provider} → userId: ${selectedUserId}`);

    const token = makeFakeJwt(selectedUserId);
    const author = selectedUserId === MOCK_AUTHOR_ID
      ? publicUser()
      : buildUserProfile(AUTHORS_BY_ID[selectedUserId]);

    return json(res, 200, {
      tokens: { accessToken: token, refreshToken: `mock-refresh-${selectedUserId}`, idToken: token },
      author,
    }), true;
  }

  // ── POST /refresh-token ─────────────────────────────────────────────────────
  if (path === "/refresh-token" && method === "POST") {
    const token = makeFakeJwt();
    return json(res, 200, { accessToken: token, idToken: token, expiresIn: 86400 }), true;
  }

  // ── POST /me/delete-account ──────────────────────────────────────────────────
  if (path === "/me/delete-account" && method === "POST") {
    resetDb();
    console.log("[auth] /me/delete-account — session cleared, db reset to seed");
    return json(res, 200, { ok: true }), true;
  }

  return false;
};
