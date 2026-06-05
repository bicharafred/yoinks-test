"use strict";

const feedbacks = [];

module.exports = async function handleFeedback(req, res, { path, method, readBody, json }) {
  // ── POST /feedback ─────────────────────────────────────────────────────────
  if (path === "/feedback" && method === "POST") {
    const body = await readBody(req);
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!message) {
      return json(res, 400, { ok: false, error: "Message is required." }), true;
    }
    if (message.length > 1000) {
      return json(res, 400, { ok: false, error: "Message must be 1000 characters or fewer." }), true;
    }

    const feedback = {
      id: `feedback-${Date.now()}`,
      userId: typeof body.userId === "string" ? body.userId : "unknown",
      message,
      screen: typeof body.screen === "string" ? body.screen : "unknown",
      source: typeof body.source === "string" ? body.source : "floating_button",
      createdAt: new Date().toISOString(),
    };
    feedbacks.push(feedback);
    console.log(`[feedback] stored id=${feedback.id} screen=${feedback.screen} len=${message.length}`);
    return json(res, 200, { ok: true, feedback }), true;
  }

  // ── GET /debug/feedback ────────────────────────────────────────────────────
  if (path === "/debug/feedback" && method === "GET") {
    return json(res, 200, { feedbacks, count: feedbacks.length }), true;
  }

  return false;
};
