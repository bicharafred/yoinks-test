"use strict";

const { db } = require("../db");
const { AUTHORS } = require("../data/seed");
const { HANDLES } = require("../data/handles");

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

module.exports = async function handleUsers(req, res, { path, method, json }) {
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
