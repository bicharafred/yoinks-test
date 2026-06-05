"use strict";

const { db } = require("../db");
const { AUTHORS } = require("../data/seed");
const { HANDLES } = require("../data/handles");
const { PUBLIC_API_BASE_URL } = require("../config/env");
const { uid } = require("../utils/ids");

function buildUserList() {
  // Count moments per author from the live db (reflects moments added this session).
  const momentCountMap = {};
  for (const m of db.moments) {
    const aid = m.author?.id;
    if (aid) momentCountMap[aid] = (momentCountMap[aid] || 0) + 1;
  }

  return Object.values(AUTHORS).map((a) => {
    // Dev user name/avatar can change at runtime via updateUserName / avatar upload.
    const isDevUser = a.id === db.user.id;
    return {
      id: a.id,
      name: isDevUser ? db.user.name : a.name,
      handle: HANDLES[a.id] ?? a.name.toLowerCase().replace(/\s+/g, ""),
      avatar: isDevUser ? (db.user.avatar ?? null) : (a.avatar ?? null),
      momentsCount: momentCountMap[a.id] || 0,
    };
  });
}

module.exports = async function handleUsers(req, res, { path, method, readBody, json }) {
  // POST /uploads/avatar/sign — returns signed PUT URL for avatar upload
  if (path === "/uploads/avatar/sign" && method === "POST") {
    const body = await readBody(req);
    const authorId = typeof body.authorId === "string" ? body.authorId.trim() : "unknown";
    const fileId = uid("avatar");
    const uploadPath = `/s3-upload/avatars/${encodeURIComponent(authorId)}/${fileId}.jpg`;
    const putUrl = `${PUBLIC_API_BASE_URL}${uploadPath}`;
    return json(res, 200, { putUrl, contentType: "image/jpeg", avatarUrl: putUrl }), true;
  }

  // POST /me/avatar — persist avatar URL so GraphQL queries reflect the new avatar.
  // Accepts optional authorId to support non-default dev users (e.g. André).
  if (path === "/me/avatar" && method === "POST") {
    const body = await readBody(req);
    const avatarUrl = typeof body.avatarUrl === "string" ? body.avatarUrl.trim() : "";
    const authorId  = typeof body.authorId  === "string" ? body.authorId.trim()  : db.user.id;
    if (avatarUrl === "") {
      return json(res, 400, { error: "avatarUrl is required" }), true;
    }
    // Update the correct in-memory record so subsequent profile queries return the new avatar.
    const authorRecord = authorId === db.user.id
      ? db.user
      : Object.values(AUTHORS).find((a) => a.id === authorId);
    if (authorRecord) {
      authorRecord.avatar = avatarUrl;
    }
    return json(res, 200, { avatar: avatarUrl }), true;
  }

  // GET /search/users?q=<query>
  if (path === "/search/users" && method === "GET") {
    const url = new URL(req.url, "http://localhost");
    const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();

    const allUsers = buildUserList();

    const users = q.length === 0
      ? allUsers
      : allUsers.filter(
          (u) =>
            u.name.toLowerCase().includes(q) ||
            u.handle.toLowerCase().includes(q),
        );

    json(res, 200, { users: users.slice(0, 20) });
    return true;
  }

  return false;
};
