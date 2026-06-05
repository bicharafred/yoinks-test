"use strict";

const { db } = require("../db");
const { MOCK_AUTHOR_ID } = require("../config/env");
const { walletToApiShape, getOrCreateWallet } = require("../services/wallet");
const { unlockMoment } = require("../services/unlock");
const { normalizeUserId } = require("../utils/ids");
const { normalizeMoment } = require("../services/moments.service");
const { applyFeedFilters } = require("../services/feed.service");

const NOW = () => Math.floor(Date.now() / 1000);

function publicUser() {
  const { linkedProviders, ...rest } = db.user;
  return rest;
}

// ── Resolvers ─────────────────────────────────────────────────────────────────

const resolvers = {
  // Queries
  getFeedMoments({ limit = 20 }) {
    const visible = applyFeedFilters(db.moments, db.user);
    const sorted  = [...visible].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const items   = sorted.slice(0, limit).map(normalizeMoment);
    return { items, nextToken: null, resultCount: items.length };
  },

  getAuthorMoments({ authorId, limit = 20 }) {
    if ((db.user.blockedAuthorIds || []).includes(authorId)) {
      return { items: [], nextToken: null, resultCount: 0 };
    }
    const items = db.moments
      .filter((m) => m.author.id === authorId)
      .slice(0, limit)
      .map(normalizeMoment);
    return { items, nextToken: null, resultCount: items.length };
  },

  getMoment({ input }) {
    const m = db.moments.find(
      (m) => m.author.id === input.authorId && m.sequence === input.sequence
    );
    return m ? normalizeMoment(m) : null;
  },

  getWalletBalance({ authorId }) {
    const wallet = getOrCreateWallet(authorId || MOCK_AUTHOR_ID);
    return walletToApiShape(wallet);
  },

  interactionsByMoment({ momentId }) {
    const interactions = db.interactions
      .filter((i) => i.momentId === momentId)
      .map((i) => ({
        __typename: "Interaction",
        ...i,
        viewerId: i.viewerId ?? i.viewer?.id ?? "",
        viewer: i.viewer
          ? { __typename: "Viewer", id: i.viewer.id, name: i.viewer.name ?? null, avatar: i.viewer.avatar ?? null }
          : null,
      }));
    return { __typename: "InteractionsByMomentResult", interactions, nextToken: null };
  },

  getNotifications({ limit = 20 }) {
    return { items: db.notifications.slice(0, limit), nextToken: null };
  },

  getUser() {
    return publicUser();
  },

  commentsByMoment({ momentId }) {
    const items = db.comments
      .filter((c) => c.momentId === momentId)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .map((c) => ({
        __typename: "Comment",
        ...c,
        parentCommentId: c.parentCommentId ?? null,
        author: c.author ? { __typename: "Author", ...c.author } : null,
      }));
    return { __typename: "CommentsByMomentResult", items, nextToken: null };
  },

  // Mutations
  createComment({ input }) {
    if (!input.text || input.text.length > 500) {
      throw new Error("Comments can be up to 500 characters.");
    }
    let parentCommentId = input.parentCommentId ?? null;
    if (parentCommentId) {
      const parent = db.comments.find((c) => c.id === parentCommentId);
      if (!parent) {
        console.warn(`[createComment] parentCommentId ${parentCommentId} not found — storing as top-level`);
        parentCommentId = null;
      } else if (parent.momentId !== input.momentId) {
        console.warn(`[createComment] parentCommentId ${parentCommentId} belongs to different moment — storing as top-level`);
        parentCommentId = null;
      }
    }
    const comment = {
      __typename: "Comment",
      id: `comment-${Date.now()}`,
      momentId: input.momentId,
      text: input.text,
      createdAt: NOW(),
      parentCommentId,
      author: publicUser(),
    };
    db.comments.push(comment);
    return comment;
  },

  createInteraction({ input }) {
    const viewerId = normalizeUserId(input.viewer?.id || input.viewerId || "");
    const delta = (input.applauseCount || 0) - (input.previousApplauseCount || 0);
    const existing = db.interactions.find(
      (i) => i.momentId === input.momentId && normalizeUserId(i.viewer?.id || i.viewerId || "") === viewerId
    );
    if (existing) {
      existing.applauseCount = (existing.applauseCount || 0) + delta;
      existing.updatedAt = NOW();
    } else {
      db.interactions.push({
        ...input,
        id: `int-${Date.now()}`,
        viewer: input.viewer ? { ...input.viewer, id: viewerId } : undefined,
      });
    }
    const moment = db.moments.find((m) => m.id === input.momentId);
    if (moment) moment.applauseCount += delta;
    return true;
  },

  createMoment({ input }) {
    const newMoment = {
      __typename: "Moment",
      id: input.id || `moment-${db.momentCounter++}`,
      mediaUrl: `https://picsum.photos/seed/${input.id}/400/300`,
      videoThumbnailUrl: null,
      isValidated: true,
      hasAdultContent: false,
      type: input.type || "PHOTO",
      isLocal: input.isLocal || false,
      isBlurred: false,
      isLocked: false,
      applauseCount: 0,
      viewerApplauseCount: 0,
      hasViewerSeen: false,
      sequence: db.momentCounter,
      createdAt: NOW(),
      updatedAt: null,
      description: input.description || null,
      commentCount: 0,
      mediaItems: input.mediaItems || [],
      author: {
        __typename: "Author",
        id: input.author?.id || MOCK_AUTHOR_ID,
        name: input.author?.name || "Dev User",
        avatar: null,
      },
    };
    db.moments.unshift(newMoment);
    return normalizeMoment(newMoment);
  },

  updateUserName({ input }) {
    db.user.name = input.name;
    db.user.updatedAt = new Date().toISOString();
    return publicUser();
  },

  unblurMoment({ input }) {
    const result = unlockMoment(input.momentId);

    if (!result.ok) {
      console.warn(`[unlock] ${result.code}: ${result.message}`);
      return { success: false, error: result.message };
    }

    if (result.alreadyUnlocked) {
      console.log(`[unlock] ${input.momentId} — already unlocked (idempotent)`);
    } else {
      console.log(`[unlock] ${input.momentId} — unlocked successfully`);
    }

    return { success: true, error: null };
  },

  createReport({ input }) {
    const report = { id: `report-${Date.now()}`, ...input, status: "PENDING", createdAt: NOW() };
    db.reports.push(report);
    return { success: true, reportId: report.id, error: null };
  },

  blockAuthor({ input }) {
    const authorId = normalizeUserId(input.blockedAuthorId);
    if (!db.user.blockedAuthorIds.includes(authorId)) {
      db.user.blockedAuthorIds.push(authorId);
    }
    return publicUser();
  },

  unblockAuthor({ input }) {
    const authorId = normalizeUserId(input.blockedAuthorId);
    db.user.blockedAuthorIds = db.user.blockedAuthorIds.filter((id) => id !== authorId);
    return publicUser();
  },

  hideMoment({ input }) {
    if (!db.user.hiddenMomentIds.includes(input.hiddenMomentId)) {
      db.user.hiddenMomentIds.push(input.hiddenMomentId);
    }
    return publicUser();
  },

  saveDeviceToken({ deviceToken, platform }) {
    console.log(`[mock] saveDeviceToken: ${platform} → ${deviceToken.slice(0, 20)}...`);
    return true;
  },

  setNotificationAsRead({ notificationId }) {
    const n = db.notifications.find((n) => n.notificationId === notificationId);
    if (n) n.isRead = true;
    return true;
  },

  createUser({ input }) {
    db.user = { ...db.user, ...input };
    return publicUser();
  },
};

// ── Dispatcher ────────────────────────────────────────────────────────────────

function handleGraphQL(body) {
  const { operationName, variables = {} } = body;
  try {
    if (operationName === "GetFeedMoments")          return { data: { getFeedMoments:       resolvers.getFeedMoments(variables) } };
    if (operationName === "GetAuthorMoments")        return { data: { getAuthorMoments:     resolvers.getAuthorMoments(variables) } };
    if (operationName === "GetMoment")               return { data: { getMoment:            resolvers.getMoment(variables) } };
    if (operationName === "GetWalletBalance")        return { data: { getWalletBalance:     resolvers.getWalletBalance(variables) } };
    if (operationName === "GetInteractionsByMoment") return { data: { interactionsByMoment: resolvers.interactionsByMoment(variables) } };
    if (operationName === "GetNotifications")        return { data: { getNotifications:     resolvers.getNotifications(variables) } };
    if (operationName === "GetCommentsByMoment")     return { data: { commentsByMoment:     resolvers.commentsByMoment(variables) } };
    if (operationName === "CreateInteraction")       return { data: { createInteraction:    resolvers.createInteraction(variables) } };
    if (operationName === "CreateMoment")            return { data: { createMoment:         resolvers.createMoment(variables) } };
    if (operationName === "UpdateUserName")          return { data: { updateUserName:       resolvers.updateUserName(variables) } };
    if (operationName === "UnblurMoment")            return { data: { unblurMoment:         resolvers.unblurMoment(variables) } };
    if (operationName === "CreateReport")            return { data: { createReport:         resolvers.createReport(variables) } };
    if (operationName === "BlockAuthor")             return { data: { blockAuthor:          resolvers.blockAuthor(variables) } };
    if (operationName === "UnblockAuthor")           return { data: { unblockAuthor:        resolvers.unblockAuthor(variables) } };
    if (operationName === "HideMoment")              return { data: { hideMoment:           resolvers.hideMoment(variables) } };
    if (operationName === "SaveDeviceToken")         return { data: { saveDeviceToken:      resolvers.saveDeviceToken(variables) } };
    if (operationName === "SetNotificationAsRead")   return { data: { setNotificationAsRead: resolvers.setNotificationAsRead(variables) } };
    if (operationName === "CreateUser")              return { data: { createUser:           resolvers.createUser(variables) } };
    if (operationName === "CreateComment")           return { data: { createComment:        resolvers.createComment(variables) } };

    console.warn(`[graphql] Unknown operation: ${operationName}`);
    return { data: null, errors: [{ message: `Unknown operation: ${operationName}` }] };
  } catch (err) {
    console.error(`[graphql] Error in ${operationName}:`, err);
    return { data: null, errors: [{ message: err.message }] };
  }
}

module.exports = async function handleGraphQLRoute(req, res, { path, method, readBody, json }) {
  if (path !== "/graphql" || method !== "POST") return false;
  const body   = await readBody(req);
  const result = handleGraphQL(body);
  json(res, 200, result);
  return true;
};
