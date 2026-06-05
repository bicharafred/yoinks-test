"use strict";

const fs      = require("fs");
const os      = require("os");
const pathLib = require("path");
const { db } = require("../db");
const { MOCK_AUTHOR_ID, PUBLIC_API_BASE_URL } = require("../config/env");
const { normalizeMoment } = require("../services/moments.service");

const UPLOAD_DIR = pathLib.join(os.tmpdir(), "yoinks-mock-uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const NOW = () => Math.floor(Date.now() / 1000);

module.exports = async function handleMoments(req, res, { path, method, readBody, readBodyBuffer, json }) {
  // ── POST /create-moment ────────────────────────────────────────────────────
  if (path === "/create-moment" && method === "POST") {
    const body = await readBody(req);
    const id   = body.id || `moment-${db.momentCounter++}`;

    const isMultiMedia     = Array.isArray(body.mediaItems) && body.mediaItems.length > 0;
    const storedMediaItems = isMultiMedia
      ? body.mediaItems.map((item) => ({
          id:               item.id,
          mediaUrl:         `${PUBLIC_API_BASE_URL}/s3-upload/${id}/item-${item.id}/media`,
          blurredUrl:       `${PUBLIC_API_BASE_URL}/s3-upload/${id}/item-${item.id}/blurred`,
          videoThumbnailUrl: null,
          mediaType:        item.type || "PHOTO",
        }))
      : null;

    if (!db.moments.find((m) => m.id === id)) {
      const newMoment = {
        __typename: "Moment",
        id,
        mediaUrl: isMultiMedia
          ? `${PUBLIC_API_BASE_URL}/s3-upload/${id}/item-${body.mediaItems[0].id}/media`
          : `${PUBLIC_API_BASE_URL}/s3-upload/${id}/media`,
        videoThumbnailUrl: null,
        isValidated: true,
        hasAdultContent: false,
        type: body.type || "PHOTO",
        isLocal: body.isLocal || false,
        isBlurred: false,
        isLocked: false,
        applauseCount: 0,
        viewerApplauseCount: 0,
        hasViewerSeen: false,
        sequence: db.momentCounter,
        createdAt: NOW(),
        updatedAt: null,
        description: body.description || null,
        commentCount: 0,
        author: {
          __typename: "Author",
          id: body.author?.id || MOCK_AUTHOR_ID,
          name: body.author?.name || "Dev User",
          avatar: null,
        },
        mediaItems: storedMediaItems,
      };
      db.moments.unshift(newMoment);
      console.log(`[create-moment] stored: id=${id} mediaItems=${storedMediaItems ? storedMediaItems.length : 0} desc="${body.description || ""}"`);
    }

    if (isMultiMedia) {
      return json(res, 200, {
        mediaUrl:   `${PUBLIC_API_BASE_URL}/s3-upload/${id}/media`,
        blurredUrl: `${PUBLIC_API_BASE_URL}/s3-upload/${id}/blurred`,
        videoThumbnailUrl: null,
        mediaItemUrls: storedMediaItems.map((item) => ({
          id:               item.id,
          mediaUrl:         item.mediaUrl,
          blurredUrl:       item.blurredUrl,
          videoThumbnailUrl: item.videoThumbnailUrl,
        })),
      }), true;
    }

    return json(res, 200, {
      mediaUrl:         `${PUBLIC_API_BASE_URL}/s3-upload/${id}/media`,
      blurredUrl:       `${PUBLIC_API_BASE_URL}/s3-upload/${id}/blurred`,
      videoThumbnailUrl: `${PUBLIC_API_BASE_URL}/s3-upload/${id}/thumbnail`,
    }), true;
  }

  // ── GET /s3-upload/... — serve stored uploads ──────────────────────────────
  if (path.startsWith("/s3-upload/") && method === "GET") {
    const filename = path.slice(1).replace(/\//g, "_");
    const filepath = pathLib.join(UPLOAD_DIR, filename);
    if (fs.existsSync(filepath)) {
      const data = fs.readFileSync(filepath);
      console.log(`[s3] serving: ${path} (${data.length} bytes)`);
      res.writeHead(200, {
        "Content-Type": "image/jpeg",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache",
      });
      res.end(data);
    } else {
      console.warn(`[s3] GET not found: ${path}`);
      res.writeHead(404, { "Access-Control-Allow-Origin": "*" });
      res.end();
    }
    return true;
  }

  // ── PUT /s3-upload/... — store uploads ────────────────────────────────────
  if (path.startsWith("/s3-upload/") && method === "PUT") {
    const buffer   = await readBodyBuffer(req);
    const filename = path.slice(1).replace(/\//g, "_");
    const filepath = pathLib.join(UPLOAD_DIR, filename);
    fs.writeFileSync(filepath, buffer);
    console.log(`[s3] stored: ${path} (${buffer.length} bytes)`);
    res.writeHead(200, { "Access-Control-Allow-Origin": "*" });
    res.end();
    return true;
  }

  // ── GET /moments/:id — fetch single moment by ID ─────────────────────────
  if (path.startsWith("/moments/") && method === "GET") {
    const momentId = decodeURIComponent(path.slice("/moments/".length));
    const found = db.moments.find((m) => m.id === momentId);
    if (!found) {
      return json(res, 404, { error: "Moment not found" }), true;
    }
    return json(res, 200, normalizeMoment(found)), true;
  }

  return false;
};
