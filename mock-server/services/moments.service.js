"use strict";

const { db } = require("../db");

// ── mediaItems normalisation ──────────────────────────────────────────────────
// Apollo requires the field to exist on every Moment when the fragment selects it.
// Single-image moments get []. Carousel moments get their items with a guaranteed
// thumbnailUrl field (null if missing rather than undefined).
function normalizeMomentMediaItems(moment) {
  if (!moment.mediaItems || moment.mediaItems.length === 0) {
    return { ...moment, mediaItems: [] };
  }
  return {
    ...moment,
    mediaItems: moment.mediaItems.map((item) => ({
      ...item,
      thumbnailUrl: item.thumbnailUrl ?? null,
    })),
  };
}

// ── commentCount ──────────────────────────────────────────────────────────────
// Count only top-level comments (parentCommentId == null) so the feed badge
// matches the number of visible comments in the sheet. Replies are nested under
// their parent and are excluded from this count.
function computeCommentCount(momentId) {
  return db.comments.filter((c) => c.momentId === momentId && !c.parentCommentId).length;
}

// ── normalizeMoment ───────────────────────────────────────────────────────────
// Single normalizer applied to every Moment returned to the client.
// Ensures mediaItems is always present and commentCount reflects live db state.
function normalizeMoment(moment) {
  return {
    ...normalizeMomentMediaItems(moment),
    commentCount: computeCommentCount(moment.id),
  };
}

module.exports = { normalizeMoment, normalizeMomentMediaItems, computeCommentCount };
