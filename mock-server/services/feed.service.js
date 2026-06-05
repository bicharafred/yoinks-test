"use strict";

// ── Feed filtering rules ──────────────────────────────────────────────────────
// These three exclusion lists are independent and all applied to the feed:
//   hiddenMomentIds    — specific moments the viewer has hidden
//   hiddenCreatorIds   — all content from a creator is hidden from feed
//   blockedAuthorIds   — all content from a blocked user is hidden from feed
//
// Profile pages and search are intentionally NOT subject to these filters —
// only the feed applies creator/moment hiding. Blocking hides profile posts
// via a separate check in getAuthorMoments.
function applyFeedFilters(moments, user) {
  const blocked       = new Set(user.blockedAuthorIds || []);
  const hidden        = new Set(user.hiddenCreatorIds || []);
  const hiddenMoments = new Set(user.hiddenMomentIds || []);
  return moments.filter(
    (m) =>
      !blocked.has(m.author.id) &&
      !hidden.has(m.author.id) &&
      !hiddenMoments.has(m.id),
  );
}

module.exports = { applyFeedFilters };
