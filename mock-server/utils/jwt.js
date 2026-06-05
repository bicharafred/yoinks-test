"use strict";

const { MOCK_AUTHOR_ID } = require("../config/env");

function makeFakeJwt(userId) {
  const sub     = userId || MOCK_AUTHOR_ID;
  const header  = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const exp     = Math.floor(Date.now() / 1000) + 60 * 60 * 24; // 24h
  const payload = Buffer.from(
    JSON.stringify({ sub, exp, iat: Math.floor(Date.now() / 1000) })
  ).toString("base64url");
  return `${header}.${payload}.mock-signature`;
}

module.exports = { makeFakeJwt };
