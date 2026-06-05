"use strict";

const { db } = require("../db");
const { AUTHORS } = require("../data/seed");
const { HANDLES } = require("../data/handles");
const { normalizeUserId } = require("../utils/ids");

function resolveUserDetail(id) {
  const seedKey = Object.keys(AUTHORS).find((k) => AUTHORS[k].id === id);
  const seed = seedKey ? AUTHORS[seedKey] : null;
  const isDevUser = id === db.user.id;
  return {
    id,
    name:   isDevUser ? db.user.name   : (seed?.name   ?? id),
    handle: HANDLES[id] ?? id,
    avatar: isDevUser ? (db.user.avatar ?? null) : (seed?.avatar ?? null),
  };
}

module.exports = async function handleModeration(req, res, { path, method, readBody, json, apiError }) {
  // GET /me/hidden-creators
  if (path === "/me/hidden-creators" && method === "GET") {
    const ids = db.user.hiddenCreatorIds || [];
    json(res, 200, { hiddenCreators: ids.map(resolveUserDetail) });
    return true;
  }

  // POST /me/hidden-creators  { authorId }
  if (path === "/me/hidden-creators" && method === "POST") {
    const body = await readBody(req);
    const authorId = normalizeUserId((body.authorId ?? "").trim());
    if (!authorId) {
      json(res, 400, apiError("MISSING_AUTHOR_ID", "authorId is required"));
      return true;
    }
    if (!db.user.hiddenCreatorIds.includes(authorId)) {
      db.user.hiddenCreatorIds.push(authorId);
    }
    json(res, 200, { ok: true, hiddenCreatorIds: db.user.hiddenCreatorIds });
    return true;
  }

  // DELETE /me/hidden-creators/:authorId
  if (method === "DELETE" && path.startsWith("/me/hidden-creators/")) {
    const authorId = normalizeUserId(decodeURIComponent(path.slice("/me/hidden-creators/".length)));
    db.user.hiddenCreatorIds = db.user.hiddenCreatorIds.filter((id) => id !== authorId);
    json(res, 200, { ok: true, hiddenCreatorIds: db.user.hiddenCreatorIds });
    return true;
  }

  // GET /me/blocked-users
  if (path === "/me/blocked-users" && method === "GET") {
    const ids = db.user.blockedAuthorIds || [];
    json(res, 200, { blockedUsers: ids.map(resolveUserDetail) });
    return true;
  }

  return false;
};
