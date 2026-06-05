"use strict";

const { MOCK_AUTHOR_ID } = require("../config/env");
const { transferableToYoinks, dollarsToMicros } = require("../utils/money");

const NOW = () => Math.floor(Date.now() / 1000);

// ── Authors ───────────────────────────────────────────────────────────────────
const AUTHORS = {
  dev:     { __typename: "Author", id: "mock-user-001", name: "Dev User",        avatar: null },
  sofia:   { __typename: "Author", id: "mock-user-002", name: "Sofia Rodriguez", avatar: "https://picsum.photos/seed/sofia-face/100/100" },
  marcus:  { __typename: "Author", id: "mock-user-003", name: "Marcus Johnson",  avatar: "https://picsum.photos/seed/marcus-face/100/100" },
  emma:    { __typename: "Author", id: "mock-user-004", name: "Emma Williams",   avatar: "https://picsum.photos/seed/emma-face/100/100" },
  amanda:  { __typename: "Author", id: "mock-user-005", name: "Amanda Gomez",    avatar: "https://picsum.photos/seed/amanda-face/100/100" },
  renata:  { __typename: "Author", id: "mock-user-006", name: "Renata Louise",   avatar: "https://picsum.photos/seed/renata-face/100/100" },
  daniel:  { __typename: "Author", id: "mock-user-007", name: "Daniel Carter",   avatar: "https://picsum.photos/seed/daniel-face/100/100" },
  vanessa: { __typename: "Author", id: "mock-user-008", name: "Vanessa Gomes",   avatar: "https://picsum.photos/seed/vanessa-face/100/100" },
  lucas:   { __typename: "Author", id: "mock-user-009", name: "Lucas Martin",    avatar: "https://picsum.photos/seed/lucas-face/100/100" },
  maya:    { __typename: "Author", id: "mock-user-010", name: "Maya Chen",       avatar: "https://picsum.photos/seed/maya-face/100/100" },
  olivia:  { __typename: "Author", id: "mock-user-011", name: "Olivia Brown",    avatar: "https://picsum.photos/seed/olivia-face/100/100" },
  ethan:   { __typename: "Author", id: "mock-user-012", name: "Ethan Brooks",    avatar: "https://picsum.photos/seed/ethan-face/100/100" },
  andre:   { __typename: "Author", id: "mock-user-013", name: "André Cabral",    avatar: "https://picsum.photos/seed/andre-face/100/100" },
};

function createSeedData() {
  const A = AUTHORS;
  const t = NOW();

  return {
    // ── Logged-in user ──────────────────────────────────────────────────────
    user: {
      __typename: "Author",
      id: MOCK_AUTHOR_ID,
      email: "dev@yoinks.local",
      name: "Dev User",
      isAdult: true,
      hasIdentityValidation: true,
      allowAdultContent: false,
      avatar: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      blockedAuthorIds: [],
      hiddenMomentIds: [],
      hiddenCreatorIds: [],
      setupStatus: "complete",
      payoutBetaEnabled: false,
      referralCode: "YOINKS-DEV7",
      referralLink: "https://yoinks.app/invite/YOINKS-DEV7",
      // MOCK ONLY — never sent to app
      linkedProviders: [
        { provider: "apple",  providerUserId: "apple-dev-001",  email: "dev@yoinks.local" },
        { provider: "google", providerUserId: "google-dev-001", email: "dev@yoinks.local" },
      ],
    },

    // ── Wallets (keyed by userId) ────────────────────────────────────────────
    // Seed: 2999 Yoinks (was transferable: 149.95 = 2999 * $0.05)
    //       $0.05 creator earnings (was redeemable: 0.05 = 50,000 micros)
    wallets: {
      [MOCK_AUTHOR_ID]: {
        userId: MOCK_AUTHOR_ID,
        yoinksAvailable: transferableToYoinks(149.95),      // 2999
        payoutAvailableUsdMicros: dollarsToMicros(0.05),    // 50_000
        payoutRequestedUsdMicros: 0,
        payoutPaidLifetimeUsdMicros: 0,
        updatedAt: new Date().toISOString(),
      },
      // Tester user (mock-user-013) starts with 100 Yoinks so the wallet screen is not empty
      "mock-user-013": {
        userId: "mock-user-013",
        yoinksAvailable: 100,
        payoutAvailableUsdMicros: 0,
        payoutRequestedUsdMicros: 0,
        payoutPaidLifetimeUsdMicros: 0,
        updatedAt: new Date().toISOString(),
      },
    },

    // ── Moments ──────────────────────────────────────────────────────────────
    moments: [
      // ── Dev User (mock-user-001) ──────────────────────────────────────────
      { __typename: "Moment", id: "moment-001", mediaUrl: "https://picsum.photos/seed/dev1/400/300",         videoThumbnailUrl: null, isValidated: true, hasAdultContent: false, type: "PHOTO", isLocal: false, isBlurred: false, isLocked: false, applauseCount: 12, viewerApplauseCount: 0, hasViewerSeen: true,  sequence: 1,  createdAt: t - 1800,  updatedAt: null, description: null,                              commentCount: 3,  author: A.dev },
      { __typename: "Moment", id: "moment-002", mediaUrl: "https://picsum.photos/seed/dev2/400/300",         videoThumbnailUrl: null, isValidated: true, hasAdultContent: false, type: "PHOTO", isLocal: false, isBlurred: false, isLocked: false, applauseCount: 28, viewerApplauseCount: 0, hasViewerSeen: true,  sequence: 2,  createdAt: t - 3600,  updatedAt: null, description: "Sunsets from the rooftop 🌇",      commentCount: 2,  author: A.dev },
      { __typename: "Moment", id: "moment-003", mediaUrl: "https://picsum.photos/seed/dev3/400/300",         videoThumbnailUrl: null, isValidated: true, hasAdultContent: false, type: "PHOTO", isLocal: false, isBlurred: false, isLocked: false, applauseCount: 7,  viewerApplauseCount: 0, hasViewerSeen: true,  sequence: 3,  createdAt: t - 7200,  updatedAt: null, description: null,                              commentCount: 0,  author: A.dev },
      { __typename: "Moment", id: "moment-004", mediaUrl: "https://picsum.photos/seed/dev-photo4/400/533",   videoThumbnailUrl: null, isValidated: true, hasAdultContent: false, type: "PHOTO", isLocal: false, isBlurred: false, isLocked: false, applauseCount: 45, viewerApplauseCount: 0, hasViewerSeen: true,  sequence: 4,  createdAt: t - 10800, updatedAt: null, description: "Quick timelapse from my walk 🌿",  commentCount: 1,  author: A.dev },
      { __typename: "Moment", id: "moment-005", mediaUrl: "https://picsum.photos/seed/dev5/400/300",         videoThumbnailUrl: null, isValidated: true, hasAdultContent: false, type: "PHOTO", isLocal: false, isBlurred: false, isLocked: false, applauseCount: 19, viewerApplauseCount: 0, hasViewerSeen: true,  sequence: 5,  createdAt: t - 14400, updatedAt: null, description: "Love this lighting 💫",             commentCount: 0,  author: A.dev },

      // ── Emma Williams (mock-user-004) ─────────────────────────────────────
      { __typename: "Moment", id: "moment-012", mediaUrl: "https://picsum.photos/seed/emma1/400/300",        videoThumbnailUrl: null, isValidated: true, hasAdultContent: false, type: "PHOTO", isLocal: false, isBlurred: false, isLocked: false, applauseCount: 55, viewerApplauseCount: 5, hasViewerSeen: true,  sequence: 12, createdAt: t - 2700,  updatedAt: null, description: "Golden hour never disappoints 🌅", commentCount: 3,  author: A.emma },
      { __typename: "Moment", id: "moment-013", mediaUrl: "https://picsum.photos/seed/emma3/400/300",        videoThumbnailUrl: null, isValidated: true, hasAdultContent: false, type: "PHOTO", isLocal: false, isBlurred: true,  isLocked: false, applauseCount: 7,  viewerApplauseCount: 0, hasViewerSeen: false, sequence: 13, createdAt: t - 25200, updatedAt: null, description: null,                              commentCount: 0,  author: A.emma },
      { __typename: "Moment", id: "moment-014", mediaUrl: "https://picsum.photos/seed/emma2/400/300",        videoThumbnailUrl: null, isValidated: true, hasAdultContent: false, type: "PHOTO", isLocal: false, isBlurred: false, isLocked: false, applauseCount: 18, viewerApplauseCount: 0, hasViewerSeen: false, sequence: 14, createdAt: t - 36000, updatedAt: null, description: "New favorite spot 📍",              commentCount: 1,  author: A.emma },

      // ── Sofia Rodriguez (mock-user-002) ───────────────────────────────────
      { __typename: "Moment", id: "moment-006", mediaUrl: "https://picsum.photos/seed/sofia1/400/300",       videoThumbnailUrl: null, isValidated: true, hasAdultContent: false, type: "PHOTO", isLocal: false, isBlurred: false, isLocked: false, applauseCount: 24, viewerApplauseCount: 0, hasViewerSeen: false, sequence: 6,  createdAt: t - 5400,  updatedAt: null, description: "Morning coffee and good vibes ☕",  commentCount: 3,  author: A.sofia },
      { __typename: "Moment", id: "moment-007", mediaUrl: "https://picsum.photos/seed/sofia2/400/300",       videoThumbnailUrl: null, isValidated: true, hasAdultContent: false, type: "PHOTO", isLocal: false, isBlurred: true,  isLocked: false, applauseCount: 8,  viewerApplauseCount: 0, hasViewerSeen: false, sequence: 7,  createdAt: t - 9000,  updatedAt: null, description: null,                              commentCount: 0,  author: A.sofia },
      { __typename: "Moment", id: "moment-008", mediaUrl: "https://picsum.photos/seed/sofia3/400/300",       videoThumbnailUrl: null, isValidated: true, hasAdultContent: false, type: "PHOTO", isLocal: false, isBlurred: false, isLocked: false, applauseCount: 33, viewerApplauseCount: 1, hasViewerSeen: true,  sequence: 8,  createdAt: t - 21600, updatedAt: null, description: "City walks at dusk 🌆",             commentCount: 2,  author: A.sofia },

      // ── Marcus Johnson (mock-user-003) ────────────────────────────────────
      { __typename: "Moment", id: "moment-009", mediaUrl: "https://picsum.photos/seed/marcus1/400/300",      videoThumbnailUrl: null, isValidated: true, hasAdultContent: false, type: "PHOTO", isLocal: false, isBlurred: false, isLocked: false, applauseCount: 41, viewerApplauseCount: 2, hasViewerSeen: true,  sequence: 9,  createdAt: t - 18000, updatedAt: null, description: null,                              commentCount: 1,  author: A.marcus },
      { __typename: "Moment", id: "moment-010", mediaUrl: "https://picsum.photos/seed/marcus-photo10/400/533", videoThumbnailUrl: null, isValidated: true, hasAdultContent: false, type: "PHOTO", isLocal: false, isBlurred: true,  isLocked: false, applauseCount: 15, viewerApplauseCount: 0, hasViewerSeen: false, sequence: 10, createdAt: t - 28800, updatedAt: null, description: null,                              commentCount: 0,  author: A.marcus },
      { __typename: "Moment", id: "moment-011", mediaUrl: "https://picsum.photos/seed/marcus2/400/300",      videoThumbnailUrl: null, isValidated: true, hasAdultContent: false, type: "PHOTO", isLocal: false, isBlurred: false, isLocked: false, applauseCount: 22, viewerApplauseCount: 0, hasViewerSeen: false, sequence: 11, createdAt: t - 32400, updatedAt: null, description: "Late night walks hit different 🌙",  commentCount: 2,  author: A.marcus },

      // ── Amanda Gomez (mock-user-005) ──────────────────────────────────────
      { __typename: "Moment", id: "moment-015", mediaUrl: "https://picsum.photos/seed/amanda1/400/300",      videoThumbnailUrl: null, isValidated: true, hasAdultContent: false, type: "PHOTO", isLocal: false, isBlurred: false, isLocked: false, applauseCount: 29, viewerApplauseCount: 0, hasViewerSeen: false, sequence: 15, createdAt: t - 43200, updatedAt: null, description: "Sunday reset mode 🧘",              commentCount: 2,  author: A.amanda },
      { __typename: "Moment", id: "moment-016", mediaUrl: "https://picsum.photos/seed/amanda2/400/300",      videoThumbnailUrl: null, isValidated: true, hasAdultContent: false, type: "PHOTO", isLocal: false, isBlurred: true,  isLocked: false, applauseCount: 4,  viewerApplauseCount: 0, hasViewerSeen: false, sequence: 16, createdAt: t - 54000, updatedAt: null, description: null,                              commentCount: 0,  author: A.amanda },

      // ── Renata Louise (mock-user-006) ─────────────────────────────────────
      { __typename: "Moment", id: "moment-017", mediaUrl: "https://picsum.photos/seed/renata-photo17/400/533", videoThumbnailUrl: null, isValidated: true, hasAdultContent: false, type: "PHOTO", isLocal: false, isBlurred: false, isLocked: false, applauseCount: 38, viewerApplauseCount: 3, hasViewerSeen: true,  sequence: 17, createdAt: t - 39600, updatedAt: null, description: "First skate session of the year 🛹", commentCount: 2,  author: A.renata },
      { __typename: "Moment", id: "moment-018", mediaUrl: "https://picsum.photos/seed/renata1/400/300",       videoThumbnailUrl: null, isValidated: true, hasAdultContent: false, type: "PHOTO", isLocal: false, isBlurred: true,  isLocked: false, applauseCount: 6,  viewerApplauseCount: 0, hasViewerSeen: false, sequence: 18, createdAt: t - 61200, updatedAt: null, description: null,                              commentCount: 0,  author: A.renata },

      // ── Daniel Carter (mock-user-007) ─────────────────────────────────────
      { __typename: "Moment", id: "moment-019", mediaUrl: "https://picsum.photos/seed/daniel1/400/300",       videoThumbnailUrl: null, isValidated: true, hasAdultContent: false, type: "PHOTO", isLocal: false, isBlurred: false, isLocked: false, applauseCount: 14, viewerApplauseCount: 0, hasViewerSeen: false, sequence: 19, createdAt: t - 50400, updatedAt: null, description: "Morning run done ✅",               commentCount: 1,  author: A.daniel },

      // ── Vanessa Gomes (mock-user-008) ─────────────────────────────────────
      { __typename: "Moment", id: "moment-020", mediaUrl: "https://picsum.photos/seed/vanessa1/400/300",      videoThumbnailUrl: null, isValidated: true, hasAdultContent: false, type: "PHOTO", isLocal: false, isBlurred: true,  isLocked: false, applauseCount: 21, viewerApplauseCount: 0, hasViewerSeen: false, sequence: 20, createdAt: t - 72000, updatedAt: null, description: "Studio session tonight 🎵",          commentCount: 0,  author: A.vanessa },

      // ── Long-caption moment — stable seeded Read More test target ────────
      { __typename: "Moment", id: "moment-long-001", mediaUrl: "https://picsum.photos/seed/emma-hike/400/533", videoThumbnailUrl: null, isValidated: true, hasAdultContent: false, type: "PHOTO", isLocal: false, isBlurred: false, isLocked: false, applauseCount: 61, viewerApplauseCount: 0, hasViewerSeen: false, sequence: 26, createdAt: t - 900, updatedAt: null, description: "Just got back from the most incredible hiking trip in Peneda-Gerês, Portugal. Woke up at 5am two days in a row to catch the fog rolling over the valley — and every groggy minute was worth it. The trails, the silence, the cold air, the waterfalls. My legs are done. My boots are ruined. I already want to go back. If you haven't been yet, you're missing out. Seriously. Stop sleeping on Gerês. 🏔️🌿", commentCount: 0, author: A.emma },

      // ── Carousels (multi-media) ───────────────────────────────────────────
      // mediaItems flow via MomentFragment; mediaUrl mirrors the first item.
      {
        __typename: "Moment", id: "carousel-001", type: "PHOTO", isLocal: false,
        mediaUrl: "https://picsum.photos/seed/carousel001a/400/533", videoThumbnailUrl: null,
        isValidated: true, hasAdultContent: false, isBlurred: false, isLocked: false,
        applauseCount: 34, viewerApplauseCount: 0, hasViewerSeen: true, sequence: 21,
        createdAt: t - 5400, updatedAt: null, description: "Weekend adventures 📸", commentCount: 0, author: A.sofia,
        mediaItems: [
          { id: "carousel-001-item-1", mediaUrl: "https://picsum.photos/seed/carousel001a/400/533", blurredUrl: "https://picsum.photos/seed/carousel001a/400/533", videoThumbnailUrl: null, mediaType: "PHOTO" },
          { id: "carousel-001-item-2", mediaUrl: "https://picsum.photos/seed/carousel001b/400/533", blurredUrl: "https://picsum.photos/seed/carousel001b/400/533", videoThumbnailUrl: null, mediaType: "PHOTO" },
          { id: "carousel-001-item-3", mediaUrl: "https://picsum.photos/seed/carousel001c/400/533", blurredUrl: "https://picsum.photos/seed/carousel001c/400/533", videoThumbnailUrl: null, mediaType: "PHOTO" },
        ],
      },
      {
        __typename: "Moment", id: "carousel-002", type: "PHOTO", isLocal: false,
        mediaUrl: "https://picsum.photos/seed/carousel002a/400/533", videoThumbnailUrl: null,
        isValidated: true, hasAdultContent: false, isBlurred: true, isLocked: false,
        applauseCount: 18, viewerApplauseCount: 0, hasViewerSeen: false, sequence: 22,
        createdAt: t - 14400, updatedAt: null, description: null, commentCount: 0, author: A.marcus,
        mediaItems: [
          { id: "carousel-002-item-1", mediaUrl: "https://picsum.photos/seed/carousel002a/400/533", blurredUrl: "https://picsum.photos/seed/carousel002a/400/533", videoThumbnailUrl: null, mediaType: "PHOTO" },
          { id: "carousel-002-item-2", mediaUrl: "https://picsum.photos/seed/carousel002b/400/533", blurredUrl: "https://picsum.photos/seed/carousel002b/400/533", videoThumbnailUrl: null, mediaType: "PHOTO" },
          { id: "carousel-002-item-3", mediaUrl: "https://picsum.photos/seed/carousel002c/400/533", blurredUrl: "https://picsum.photos/seed/carousel002c/400/533", videoThumbnailUrl: null, mediaType: "PHOTO" },
        ],
      },
      {
        __typename: "Moment", id: "carousel-003", type: "PHOTO", isLocal: false,
        mediaUrl: "https://picsum.photos/seed/carousel003a/400/533", videoThumbnailUrl: null,
        isValidated: true, hasAdultContent: false, isBlurred: false, isLocked: false,
        applauseCount: 52, viewerApplauseCount: 0, hasViewerSeen: true, sequence: 23,
        createdAt: t - 28800, updatedAt: null, description: "Golden hour never disappoints ✨", commentCount: 0, author: A.emma,
        mediaItems: [
          { id: "carousel-003-item-1", mediaUrl: "https://picsum.photos/seed/carousel003a/400/533", blurredUrl: "https://picsum.photos/seed/carousel003a/400/533", videoThumbnailUrl: null, mediaType: "PHOTO" },
          { id: "carousel-003-item-2", mediaUrl: "https://picsum.photos/seed/carousel003b/400/533", blurredUrl: "https://picsum.photos/seed/carousel003b/400/533", videoThumbnailUrl: null, mediaType: "PHOTO" },
          { id: "carousel-003-item-3", mediaUrl: "https://picsum.photos/seed/carousel003c/400/533", blurredUrl: "https://picsum.photos/seed/carousel003c/400/533", videoThumbnailUrl: null, mediaType: "PHOTO" },
        ],
      },
      {
        __typename: "Moment", id: "carousel-004", type: "PHOTO", isLocal: false,
        mediaUrl: "https://picsum.photos/seed/carousel004a/400/533", videoThumbnailUrl: null,
        isValidated: true, hasAdultContent: false, isBlurred: false, isLocked: false,
        applauseCount: 27, viewerApplauseCount: 0, hasViewerSeen: true, sequence: 24,
        createdAt: t - 7200, updatedAt: null, description: "Road trip dump 🚗 part 1", commentCount: 0, author: A.daniel,
        mediaItems: [
          { id: "carousel-004-item-1", mediaUrl: "https://picsum.photos/seed/carousel004a/400/533", blurredUrl: "https://picsum.photos/seed/carousel004a/400/533", videoThumbnailUrl: null, mediaType: "PHOTO" },
          { id: "carousel-004-item-2", mediaUrl: "https://picsum.photos/seed/carousel004b/400/533", blurredUrl: "https://picsum.photos/seed/carousel004b/400/533", videoThumbnailUrl: null, mediaType: "PHOTO" },
          { id: "carousel-004-item-3", mediaUrl: "https://picsum.photos/seed/carousel004c/400/533", blurredUrl: "https://picsum.photos/seed/carousel004c/400/533", videoThumbnailUrl: null, mediaType: "PHOTO" },
          { id: "carousel-004-item-4", mediaUrl: "https://picsum.photos/seed/carousel004d/400/533", blurredUrl: "https://picsum.photos/seed/carousel004d/400/533", videoThumbnailUrl: null, mediaType: "PHOTO" },
          { id: "carousel-004-item-5", mediaUrl: "https://picsum.photos/seed/carousel004e/400/533", blurredUrl: "https://picsum.photos/seed/carousel004e/400/533", videoThumbnailUrl: null, mediaType: "PHOTO" },
        ],
      },
      {
        __typename: "Moment", id: "carousel-005", type: "PHOTO", isLocal: false,
        mediaUrl: "https://picsum.photos/seed/carousel005a/400/533", videoThumbnailUrl: null,
        isValidated: true, hasAdultContent: false, isBlurred: false, isLocked: false,
        applauseCount: 0, viewerApplauseCount: 0, hasViewerSeen: true, sequence: 25,
        createdAt: t - 900, updatedAt: null, description: "Full grid dump — all 10 🙌", commentCount: 0, author: A.dev,
        mediaItems: [
          { id: "carousel-005-item-1",  mediaUrl: "https://picsum.photos/seed/carousel005a/400/533",  blurredUrl: "https://picsum.photos/seed/carousel005a/400/533",  videoThumbnailUrl: null, mediaType: "PHOTO" },
          { id: "carousel-005-item-2",  mediaUrl: "https://picsum.photos/seed/carousel005b/400/533",  blurredUrl: "https://picsum.photos/seed/carousel005b/400/533",  videoThumbnailUrl: null, mediaType: "PHOTO" },
          { id: "carousel-005-item-3",  mediaUrl: "https://picsum.photos/seed/carousel005c/400/533",  blurredUrl: "https://picsum.photos/seed/carousel005c/400/533",  videoThumbnailUrl: null, mediaType: "PHOTO" },
          { id: "carousel-005-item-4",  mediaUrl: "https://picsum.photos/seed/carousel005d/400/533",  blurredUrl: "https://picsum.photos/seed/carousel005d/400/533",  videoThumbnailUrl: null, mediaType: "PHOTO" },
          { id: "carousel-005-item-5",  mediaUrl: "https://picsum.photos/seed/carousel005e/400/533",  blurredUrl: "https://picsum.photos/seed/carousel005e/400/533",  videoThumbnailUrl: null, mediaType: "PHOTO" },
          { id: "carousel-005-item-6",  mediaUrl: "https://picsum.photos/seed/carousel005f/400/533",  blurredUrl: "https://picsum.photos/seed/carousel005f/400/533",  videoThumbnailUrl: null, mediaType: "PHOTO" },
          { id: "carousel-005-item-7",  mediaUrl: "https://picsum.photos/seed/carousel005g/400/533",  blurredUrl: "https://picsum.photos/seed/carousel005g/400/533",  videoThumbnailUrl: null, mediaType: "PHOTO" },
          { id: "carousel-005-item-8",  mediaUrl: "https://picsum.photos/seed/carousel005h/400/533",  blurredUrl: "https://picsum.photos/seed/carousel005h/400/533",  videoThumbnailUrl: null, mediaType: "PHOTO" },
          { id: "carousel-005-item-9",  mediaUrl: "https://picsum.photos/seed/carousel005i/400/533",  blurredUrl: "https://picsum.photos/seed/carousel005i/400/533",  videoThumbnailUrl: null, mediaType: "PHOTO" },
          { id: "carousel-005-item-10", mediaUrl: "https://picsum.photos/seed/carousel005j/400/533",  blurredUrl: "https://picsum.photos/seed/carousel005j/400/533",  videoThumbnailUrl: null, mediaType: "PHOTO" },
        ],
      },
      {
        __typename: "Moment", id: "carousel-006", type: "PHOTO", isLocal: false,
        mediaUrl: "https://picsum.photos/seed/carousel006a/400/533", videoThumbnailUrl: null,
        isValidated: true, hasAdultContent: false, isBlurred: true, isLocked: false,
        applauseCount: 41, viewerApplauseCount: 0, hasViewerSeen: false, sequence: 26,
        createdAt: t - 18000, updatedAt: null, description: null, commentCount: 0, author: A.amanda,
        mediaItems: [
          { id: "carousel-006-item-1", mediaUrl: "https://picsum.photos/seed/carousel006a/400/533", blurredUrl: "https://picsum.photos/seed/carousel006a/400/533", videoThumbnailUrl: null, mediaType: "PHOTO" },
          { id: "carousel-006-item-2", mediaUrl: "https://picsum.photos/seed/carousel006b/400/533", blurredUrl: "https://picsum.photos/seed/carousel006b/400/533", videoThumbnailUrl: null, mediaType: "PHOTO" },
          { id: "carousel-006-item-3", mediaUrl: "https://picsum.photos/seed/carousel006c/400/533", blurredUrl: "https://picsum.photos/seed/carousel006c/400/533", videoThumbnailUrl: null, mediaType: "PHOTO" },
          { id: "carousel-006-item-4", mediaUrl: "https://picsum.photos/seed/carousel006d/400/533", blurredUrl: "https://picsum.photos/seed/carousel006d/400/533", videoThumbnailUrl: null, mediaType: "PHOTO" },
          { id: "carousel-006-item-5", mediaUrl: "https://picsum.photos/seed/carousel006e/400/533", blurredUrl: "https://picsum.photos/seed/carousel006e/400/533", videoThumbnailUrl: null, mediaType: "PHOTO" },
        ],
      },
    ],

    // ── Comments ──────────────────────────────────────────────────────────────
    // All comments share the same collection. Top-level: parentCommentId null.
    // Replies: parentCommentId references the parent comment's id.
    comments: [
      // moment-001 — top-level (3)
      { __typename: "Comment", id: "comment-001", momentId: "moment-001", parentCommentId: null, text: "This is stunning!! 😍",                    createdAt: t - 1600,  author: A.sofia  },
      { __typename: "Comment", id: "comment-002", momentId: "moment-001", parentCommentId: null, text: "Wow, incredible shot!",                    createdAt: t - 1400,  author: A.marcus },
      { __typename: "Comment", id: "comment-003", momentId: "moment-001", parentCommentId: null, text: "Love the perspective 🔥",                  createdAt: t - 1200,  author: A.emma   },
      // moment-001 — replies (2) under comment-001
      { __typename: "Comment", id: "reply-001",   momentId: "moment-001", parentCommentId: "comment-001", text: "Totally agree! 🙌",              createdAt: t - 1500,  author: A.marcus },
      { __typename: "Comment", id: "reply-002",   momentId: "moment-001", parentCommentId: "comment-001", text: "Thank you all so much! 🙏",      createdAt: t - 1300,  author: A.dev    },
      // moment-002 — top-level (2)
      { __typename: "Comment", id: "comment-004", momentId: "moment-002", parentCommentId: null, text: "The caption sold me on this one 😂",       createdAt: t - 3200,  author: A.sofia  },
      { __typename: "Comment", id: "comment-005", momentId: "moment-002", parentCommentId: null, text: "That golden light though 🌇",              createdAt: t - 2900,  author: A.marcus },
      // moment-004 — top-level (1)
      { __typename: "Comment", id: "comment-006", momentId: "moment-004", parentCommentId: null, text: "This is gorgeous, where was this?",        createdAt: t - 10000, author: A.emma   },
      // moment-006 — top-level (3)
      { __typename: "Comment", id: "comment-007", momentId: "moment-006", parentCommentId: null, text: "Morning vibes are the best ☀️",            createdAt: t - 4800,  author: A.marcus },
      { __typename: "Comment", id: "comment-008", momentId: "moment-006", parentCommentId: null, text: "I need this coffee routine 😅",            createdAt: t - 4500,  author: A.emma   },
      { __typename: "Comment", id: "comment-009", momentId: "moment-006", parentCommentId: null, text: "This looks so cozy ☕",                    createdAt: t - 4200,  author: A.dev    },
      // moment-006 — reply (1) under comment-007
      { __typename: "Comment", id: "reply-003",   momentId: "moment-006", parentCommentId: "comment-007", text: "Right?! This is the dream ☕",   createdAt: t - 4600,  author: A.dev    },
      // moment-008 — top-level (2)
      { __typename: "Comment", id: "comment-010", momentId: "moment-008", parentCommentId: null, text: "That lighting is perfect ✨",              createdAt: t - 20000, author: A.marcus },
      { __typename: "Comment", id: "comment-011", momentId: "moment-008", parentCommentId: null, text: "City feels at its best 🌆",                createdAt: t - 19500, author: A.dev    },
      // moment-009 — top-level (1)
      { __typename: "Comment", id: "comment-012", momentId: "moment-009", parentCommentId: null, text: "When was this?! 📸",                       createdAt: t - 17000, author: A.sofia  },
      // moment-011 — top-level (2)
      { __typename: "Comment", id: "comment-013", momentId: "moment-011", parentCommentId: null, text: "Night owl hours 🦉",                       createdAt: t - 30000, author: A.emma   },
      { __typename: "Comment", id: "comment-014", momentId: "moment-011", parentCommentId: null, text: "100% agree, night walks are elite",        createdAt: t - 29000, author: A.dev    },
      // moment-012 — top-level (3)
      { __typename: "Comment", id: "comment-015", momentId: "moment-012", parentCommentId: null, text: "Beautiful! Where is this? 🌅",             createdAt: t - 2400,  author: A.sofia  },
      { __typename: "Comment", id: "comment-016", momentId: "moment-012", parentCommentId: null, text: "Golden hour looks different everywhere ✨", createdAt: t - 2100,  author: A.marcus },
      { __typename: "Comment", id: "comment-017", momentId: "moment-012", parentCommentId: null, text: "Emma always finds the best spots",         createdAt: t - 1800,  author: A.dev    },
      // moment-012 — reply (1) under comment-015
      { __typename: "Comment", id: "reply-004",   momentId: "moment-012", parentCommentId: "comment-015", text: "Ask Emma for the coordinates 😂", createdAt: t - 2200,  author: A.marcus },
      // moment-014 — top-level (1)
      { __typename: "Comment", id: "comment-018", momentId: "moment-014", parentCommentId: null, text: "Need the address asap 📍",                 createdAt: t - 34000, author: A.sofia  },
      // moment-015 — top-level (2)
      { __typename: "Comment", id: "comment-019", momentId: "moment-015", parentCommentId: null, text: "Sunday vibes are real 🙏",                 createdAt: t - 41000, author: A.emma   },
      { __typename: "Comment", id: "comment-020", momentId: "moment-015", parentCommentId: null, text: "Reset mode activated 🧘",                  createdAt: t - 40000, author: A.dev    },
      // moment-017 — top-level (2)
      { __typename: "Comment", id: "comment-021", momentId: "moment-017", parentCommentId: null, text: "The tricks though!! 🛹",                   createdAt: t - 38000, author: A.marcus },
      { __typename: "Comment", id: "comment-022", momentId: "moment-017", parentCommentId: null, text: "When are you teaching me?! 😂",            createdAt: t - 37000, author: A.dev    },
      // moment-017 — replies (2) under comment-021
      { __typename: "Comment", id: "reply-005",   momentId: "moment-017", parentCommentId: "comment-021", text: "Anytime! Come skate 🛹",         createdAt: t - 37500, author: A.renata },
      { __typename: "Comment", id: "reply-006",   momentId: "moment-017", parentCommentId: "comment-021", text: "I want in too! 🙋",             createdAt: t - 37200, author: A.emma   },
      // moment-019 — top-level (1)
      { __typename: "Comment", id: "comment-023", momentId: "moment-019", parentCommentId: null, text: "Goals!! 🏃",                              createdAt: t - 49000, author: A.sofia  },
    ],

    // ── Replies — DEPRECATED ─────────────────────────────────────────────────
    // Replies are now stored in db.comments with parentCommentId set.
    // This array remains empty; kept only so existing code referencing db.replies does not crash.
    replies: [],

    // ── Contacts ──────────────────────────────────────────────────────────────
    contacts: [
      { id: "c-1",  name: "Alex Rivera",   phone: "+1 555-0101", invited: true  },
      { id: "c-2",  name: "Brenda Kim",    phone: "+1 555-0102", invited: true  },
      { id: "c-3",  name: "Carlos Mendes", phone: "+1 555-0103", invited: false },
      { id: "c-4",  name: "Diana Osei",    phone: "+1 555-0104", invited: true  },
      { id: "c-5",  name: "Ethan Zhao",    phone: "+1 555-0105", invited: false },
      { id: "c-6",  name: "Fatima Hassan", phone: "+1 555-0106", invited: false },
      { id: "c-7",  name: "George Patel",  phone: "+1 555-0107", invited: true  },
      { id: "c-8",  name: "Hannah Müller", phone: "+1 555-0108", invited: false },
      { id: "c-9",  name: "Isabel Torres", phone: "+1 555-0109", invited: false },
      { id: "c-10", name: "James Okafor",  phone: "+1 555-0110", invited: false },
      { id: "c-11", name: "Kira Nakamura", phone: "+1 555-0111", invited: false },
      { id: "c-12", name: "Leo Fernandez", phone: "+1 555-0112", invited: false },
    ],

    // ── Notifications ─────────────────────────────────────────────────────────
    notifications: [
      {
        notificationId: "notif-001", userId: MOCK_AUTHOR_ID,
        title: "Someone viewed your moment!", message: "Sofia viewed your moment",
        type: "VIEW", isRead: false,
        createdAt: new Date(Date.now() - 900000).toISOString(),
        mediaUrl: "https://picsum.photos/seed/dev1/400/300",
        momentId: "moment-001", momentSequence: 1,
        viewerId: AUTHORS.sofia.id, viewerName: AUTHORS.sofia.name, viewerAvatar: AUTHORS.sofia.avatar,
      },
      {
        notificationId: "notif-002", userId: MOCK_AUTHOR_ID,
        title: "Someone unlocked your moment!", message: "Marcus unlocked your moment",
        type: "UNBLUR_MOMENT", isRead: false,
        createdAt: new Date(Date.now() - 1800000).toISOString(),
        mediaUrl: "https://picsum.photos/seed/dev2/400/300",
        momentId: "moment-002", momentSequence: 2,
        viewerId: AUTHORS.marcus.id, viewerName: AUTHORS.marcus.name, viewerAvatar: AUTHORS.marcus.avatar,
      },
      {
        notificationId: "notif-003", userId: MOCK_AUTHOR_ID,
        title: "New applause on your moment!", message: "Emma clapped for your moment",
        type: "APPLAUSE", isRead: true,
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        mediaUrl: "https://picsum.photos/seed/dev4/400/300",
        momentId: "moment-004", momentSequence: 4,
        viewerId: AUTHORS.emma.id, viewerName: AUTHORS.emma.name, viewerAvatar: AUTHORS.emma.avatar,
      },
    ],

    // ── Transient state (reset to empty on restart/debug reset) ──────────────
    interactions: [
      // moment-001 (dev — 12 claps: sofia:5 + marcus:4 + emma:3)
      { id: "int-seed-001", momentId: "moment-001", momentSequence: 1,  authorId: A.dev.id,     viewer: { id: A.sofia.id,   name: A.sofia.name,   avatar: A.sofia.avatar   }, applauseCount: 5,  previousApplauseCount: 0, interactionCreatedAt: t - 900   },
      { id: "int-seed-002", momentId: "moment-001", momentSequence: 1,  authorId: A.dev.id,     viewer: { id: A.marcus.id,  name: A.marcus.name,  avatar: A.marcus.avatar  }, applauseCount: 4,  previousApplauseCount: 0, interactionCreatedAt: t - 800   },
      { id: "int-seed-003", momentId: "moment-001", momentSequence: 1,  authorId: A.dev.id,     viewer: { id: A.emma.id,    name: A.emma.name,    avatar: A.emma.avatar    }, applauseCount: 3,  previousApplauseCount: 0, interactionCreatedAt: t - 700   },
      // moment-002 (dev — 28 claps: marcus:10 + sofia:8 + amanda:6 + emma:4)
      { id: "int-seed-004", momentId: "moment-002", momentSequence: 2,  authorId: A.dev.id,     viewer: { id: A.marcus.id,  name: A.marcus.name,  avatar: A.marcus.avatar  }, applauseCount: 10, previousApplauseCount: 0, interactionCreatedAt: t - 3200  },
      { id: "int-seed-005", momentId: "moment-002", momentSequence: 2,  authorId: A.dev.id,     viewer: { id: A.sofia.id,   name: A.sofia.name,   avatar: A.sofia.avatar   }, applauseCount: 8,  previousApplauseCount: 0, interactionCreatedAt: t - 3000  },
      { id: "int-seed-006", momentId: "moment-002", momentSequence: 2,  authorId: A.dev.id,     viewer: { id: A.amanda.id,  name: A.amanda.name,  avatar: A.amanda.avatar  }, applauseCount: 6,  previousApplauseCount: 0, interactionCreatedAt: t - 2800  },
      { id: "int-seed-007", momentId: "moment-002", momentSequence: 2,  authorId: A.dev.id,     viewer: { id: A.emma.id,    name: A.emma.name,    avatar: A.emma.avatar    }, applauseCount: 4,  previousApplauseCount: 0, interactionCreatedAt: t - 2600  },
      // moment-003 (dev — 7 claps: sofia:4 + marcus:3)
      { id: "int-seed-008", momentId: "moment-003", momentSequence: 3,  authorId: A.dev.id,     viewer: { id: A.sofia.id,   name: A.sofia.name,   avatar: A.sofia.avatar   }, applauseCount: 4,  previousApplauseCount: 0, interactionCreatedAt: t - 7000  },
      { id: "int-seed-009", momentId: "moment-003", momentSequence: 3,  authorId: A.dev.id,     viewer: { id: A.marcus.id,  name: A.marcus.name,  avatar: A.marcus.avatar  }, applauseCount: 3,  previousApplauseCount: 0, interactionCreatedAt: t - 6800  },
      // moment-004 (dev — 45 claps: sofia:12 + marcus:10 + emma:8 + amanda:7 + renata:8)
      { id: "int-seed-010", momentId: "moment-004", momentSequence: 4,  authorId: A.dev.id,     viewer: { id: A.sofia.id,   name: A.sofia.name,   avatar: A.sofia.avatar   }, applauseCount: 12, previousApplauseCount: 0, interactionCreatedAt: t - 10500 },
      { id: "int-seed-011", momentId: "moment-004", momentSequence: 4,  authorId: A.dev.id,     viewer: { id: A.marcus.id,  name: A.marcus.name,  avatar: A.marcus.avatar  }, applauseCount: 10, previousApplauseCount: 0, interactionCreatedAt: t - 10400 },
      { id: "int-seed-012", momentId: "moment-004", momentSequence: 4,  authorId: A.dev.id,     viewer: { id: A.emma.id,    name: A.emma.name,    avatar: A.emma.avatar    }, applauseCount: 8,  previousApplauseCount: 0, interactionCreatedAt: t - 10300 },
      { id: "int-seed-013", momentId: "moment-004", momentSequence: 4,  authorId: A.dev.id,     viewer: { id: A.amanda.id,  name: A.amanda.name,  avatar: A.amanda.avatar  }, applauseCount: 7,  previousApplauseCount: 0, interactionCreatedAt: t - 10200 },
      { id: "int-seed-014", momentId: "moment-004", momentSequence: 4,  authorId: A.dev.id,     viewer: { id: A.renata.id,  name: A.renata.name,  avatar: A.renata.avatar  }, applauseCount: 8,  previousApplauseCount: 0, interactionCreatedAt: t - 10100 },
      // moment-005 (dev — 19 claps: sofia:8 + marcus:6 + emma:5)
      { id: "int-seed-015", momentId: "moment-005", momentSequence: 5,  authorId: A.dev.id,     viewer: { id: A.sofia.id,   name: A.sofia.name,   avatar: A.sofia.avatar   }, applauseCount: 8,  previousApplauseCount: 0, interactionCreatedAt: t - 14200 },
      { id: "int-seed-016", momentId: "moment-005", momentSequence: 5,  authorId: A.dev.id,     viewer: { id: A.marcus.id,  name: A.marcus.name,  avatar: A.marcus.avatar  }, applauseCount: 6,  previousApplauseCount: 0, interactionCreatedAt: t - 14100 },
      { id: "int-seed-017", momentId: "moment-005", momentSequence: 5,  authorId: A.dev.id,     viewer: { id: A.emma.id,    name: A.emma.name,    avatar: A.emma.avatar    }, applauseCount: 5,  previousApplauseCount: 0, interactionCreatedAt: t - 14000 },
      // moment-006 (sofia — 24 claps: marcus:10 + emma:9 + daniel:5)
      { id: "int-seed-018", momentId: "moment-006", momentSequence: 6,  authorId: A.sofia.id,   viewer: { id: A.marcus.id,  name: A.marcus.name,  avatar: A.marcus.avatar  }, applauseCount: 10, previousApplauseCount: 0, interactionCreatedAt: t - 5200  },
      { id: "int-seed-019", momentId: "moment-006", momentSequence: 6,  authorId: A.sofia.id,   viewer: { id: A.emma.id,    name: A.emma.name,    avatar: A.emma.avatar    }, applauseCount: 9,  previousApplauseCount: 0, interactionCreatedAt: t - 5100  },
      { id: "int-seed-020", momentId: "moment-006", momentSequence: 6,  authorId: A.sofia.id,   viewer: { id: A.daniel.id,  name: A.daniel.name,  avatar: A.daniel.avatar  }, applauseCount: 5,  previousApplauseCount: 0, interactionCreatedAt: t - 5000  },
      // moment-007 (sofia — 8 claps, blurred: marcus:5 + emma:3)
      { id: "int-seed-021", momentId: "moment-007", momentSequence: 7,  authorId: A.sofia.id,   viewer: { id: A.marcus.id,  name: A.marcus.name,  avatar: A.marcus.avatar  }, applauseCount: 5,  previousApplauseCount: 0, interactionCreatedAt: t - 8800  },
      { id: "int-seed-022", momentId: "moment-007", momentSequence: 7,  authorId: A.sofia.id,   viewer: { id: A.emma.id,    name: A.emma.name,    avatar: A.emma.avatar    }, applauseCount: 3,  previousApplauseCount: 0, interactionCreatedAt: t - 8600  },
      // moment-008 (sofia — 33 claps, viewerApplauseCount:1: dev:1 + marcus:12 + emma:10 + daniel:10)
      { id: "int-seed-023", momentId: "moment-008", momentSequence: 8,  authorId: A.sofia.id,   viewer: { id: A.dev.id,     name: A.dev.name,     avatar: A.dev.avatar     }, applauseCount: 1,  previousApplauseCount: 0, interactionCreatedAt: t - 21400 },
      { id: "int-seed-024", momentId: "moment-008", momentSequence: 8,  authorId: A.sofia.id,   viewer: { id: A.marcus.id,  name: A.marcus.name,  avatar: A.marcus.avatar  }, applauseCount: 12, previousApplauseCount: 0, interactionCreatedAt: t - 21200 },
      { id: "int-seed-025", momentId: "moment-008", momentSequence: 8,  authorId: A.sofia.id,   viewer: { id: A.emma.id,    name: A.emma.name,    avatar: A.emma.avatar    }, applauseCount: 10, previousApplauseCount: 0, interactionCreatedAt: t - 21000 },
      { id: "int-seed-026", momentId: "moment-008", momentSequence: 8,  authorId: A.sofia.id,   viewer: { id: A.daniel.id,  name: A.daniel.name,  avatar: A.daniel.avatar  }, applauseCount: 10, previousApplauseCount: 0, interactionCreatedAt: t - 20800 },
      // moment-009 (marcus — 41 claps, viewerApplauseCount:2: sofia:12 + emma:9 + dev:2 + amanda:10 + renata:8)
      { id: "int-seed-027", momentId: "moment-009", momentSequence: 9,  authorId: A.marcus.id,  viewer: { id: A.sofia.id,   name: A.sofia.name,   avatar: A.sofia.avatar   }, applauseCount: 12, previousApplauseCount: 0, interactionCreatedAt: t - 17800 },
      { id: "int-seed-028", momentId: "moment-009", momentSequence: 9,  authorId: A.marcus.id,  viewer: { id: A.emma.id,    name: A.emma.name,    avatar: A.emma.avatar    }, applauseCount: 9,  previousApplauseCount: 0, interactionCreatedAt: t - 17600 },
      { id: "int-seed-029", momentId: "moment-009", momentSequence: 9,  authorId: A.marcus.id,  viewer: { id: A.dev.id,     name: A.dev.name,     avatar: A.dev.avatar     }, applauseCount: 2,  previousApplauseCount: 0, interactionCreatedAt: t - 17400 },
      { id: "int-seed-030", momentId: "moment-009", momentSequence: 9,  authorId: A.marcus.id,  viewer: { id: A.amanda.id,  name: A.amanda.name,  avatar: A.amanda.avatar  }, applauseCount: 10, previousApplauseCount: 0, interactionCreatedAt: t - 17200 },
      { id: "int-seed-031", momentId: "moment-009", momentSequence: 9,  authorId: A.marcus.id,  viewer: { id: A.renata.id,  name: A.renata.name,  avatar: A.renata.avatar  }, applauseCount: 8,  previousApplauseCount: 0, interactionCreatedAt: t - 17000 },
      // moment-010 (marcus — 15 claps, blurred: emma:8 + sofia:7)
      { id: "int-seed-032", momentId: "moment-010", momentSequence: 10, authorId: A.marcus.id,  viewer: { id: A.emma.id,    name: A.emma.name,    avatar: A.emma.avatar    }, applauseCount: 8,  previousApplauseCount: 0, interactionCreatedAt: t - 28600 },
      { id: "int-seed-033", momentId: "moment-010", momentSequence: 10, authorId: A.marcus.id,  viewer: { id: A.sofia.id,   name: A.sofia.name,   avatar: A.sofia.avatar   }, applauseCount: 7,  previousApplauseCount: 0, interactionCreatedAt: t - 28400 },
      // moment-011 (marcus — 22 claps: sofia:10 + emma:8 + amanda:4)
      { id: "int-seed-034", momentId: "moment-011", momentSequence: 11, authorId: A.marcus.id,  viewer: { id: A.sofia.id,   name: A.sofia.name,   avatar: A.sofia.avatar   }, applauseCount: 10, previousApplauseCount: 0, interactionCreatedAt: t - 32200 },
      { id: "int-seed-035", momentId: "moment-011", momentSequence: 11, authorId: A.marcus.id,  viewer: { id: A.emma.id,    name: A.emma.name,    avatar: A.emma.avatar    }, applauseCount: 8,  previousApplauseCount: 0, interactionCreatedAt: t - 32000 },
      { id: "int-seed-036", momentId: "moment-011", momentSequence: 11, authorId: A.marcus.id,  viewer: { id: A.amanda.id,  name: A.amanda.name,  avatar: A.amanda.avatar  }, applauseCount: 4,  previousApplauseCount: 0, interactionCreatedAt: t - 31800 },
      // moment-012 (emma — 55 claps, viewerApplauseCount:5: dev:5 + sofia:18 + marcus:15 + renata:10 + amanda:7)
      { id: "int-seed-037", momentId: "moment-012", momentSequence: 12, authorId: A.emma.id,    viewer: { id: A.dev.id,     name: A.dev.name,     avatar: A.dev.avatar     }, applauseCount: 5,  previousApplauseCount: 0, interactionCreatedAt: t - 2600  },
      { id: "int-seed-038", momentId: "moment-012", momentSequence: 12, authorId: A.emma.id,    viewer: { id: A.sofia.id,   name: A.sofia.name,   avatar: A.sofia.avatar   }, applauseCount: 18, previousApplauseCount: 0, interactionCreatedAt: t - 2400  },
      { id: "int-seed-039", momentId: "moment-012", momentSequence: 12, authorId: A.emma.id,    viewer: { id: A.marcus.id,  name: A.marcus.name,  avatar: A.marcus.avatar  }, applauseCount: 15, previousApplauseCount: 0, interactionCreatedAt: t - 2200  },
      { id: "int-seed-040", momentId: "moment-012", momentSequence: 12, authorId: A.emma.id,    viewer: { id: A.renata.id,  name: A.renata.name,  avatar: A.renata.avatar  }, applauseCount: 10, previousApplauseCount: 0, interactionCreatedAt: t - 2000  },
      { id: "int-seed-041", momentId: "moment-012", momentSequence: 12, authorId: A.emma.id,    viewer: { id: A.amanda.id,  name: A.amanda.name,  avatar: A.amanda.avatar  }, applauseCount: 7,  previousApplauseCount: 0, interactionCreatedAt: t - 1800  },
      // moment-013 (emma — 7 claps, blurred: sofia:4 + marcus:3)
      { id: "int-seed-042", momentId: "moment-013", momentSequence: 13, authorId: A.emma.id,    viewer: { id: A.sofia.id,   name: A.sofia.name,   avatar: A.sofia.avatar   }, applauseCount: 4,  previousApplauseCount: 0, interactionCreatedAt: t - 25000 },
      { id: "int-seed-043", momentId: "moment-013", momentSequence: 13, authorId: A.emma.id,    viewer: { id: A.marcus.id,  name: A.marcus.name,  avatar: A.marcus.avatar  }, applauseCount: 3,  previousApplauseCount: 0, interactionCreatedAt: t - 24800 },
      // moment-014 (emma — 18 claps: marcus:8 + sofia:6 + daniel:4)
      { id: "int-seed-044", momentId: "moment-014", momentSequence: 14, authorId: A.emma.id,    viewer: { id: A.marcus.id,  name: A.marcus.name,  avatar: A.marcus.avatar  }, applauseCount: 8,  previousApplauseCount: 0, interactionCreatedAt: t - 35800 },
      { id: "int-seed-045", momentId: "moment-014", momentSequence: 14, authorId: A.emma.id,    viewer: { id: A.sofia.id,   name: A.sofia.name,   avatar: A.sofia.avatar   }, applauseCount: 6,  previousApplauseCount: 0, interactionCreatedAt: t - 35600 },
      { id: "int-seed-046", momentId: "moment-014", momentSequence: 14, authorId: A.emma.id,    viewer: { id: A.daniel.id,  name: A.daniel.name,  avatar: A.daniel.avatar  }, applauseCount: 4,  previousApplauseCount: 0, interactionCreatedAt: t - 35400 },
      // moment-015 (amanda — 29 claps: sofia:10 + emma:9 + marcus:10)
      { id: "int-seed-047", momentId: "moment-015", momentSequence: 15, authorId: A.amanda.id,  viewer: { id: A.sofia.id,   name: A.sofia.name,   avatar: A.sofia.avatar   }, applauseCount: 10, previousApplauseCount: 0, interactionCreatedAt: t - 43000 },
      { id: "int-seed-048", momentId: "moment-015", momentSequence: 15, authorId: A.amanda.id,  viewer: { id: A.emma.id,    name: A.emma.name,    avatar: A.emma.avatar    }, applauseCount: 9,  previousApplauseCount: 0, interactionCreatedAt: t - 42800 },
      { id: "int-seed-049", momentId: "moment-015", momentSequence: 15, authorId: A.amanda.id,  viewer: { id: A.marcus.id,  name: A.marcus.name,  avatar: A.marcus.avatar  }, applauseCount: 10, previousApplauseCount: 0, interactionCreatedAt: t - 42600 },
      // moment-016 (amanda — 4 claps, blurred: sofia:4)
      { id: "int-seed-050", momentId: "moment-016", momentSequence: 16, authorId: A.amanda.id,  viewer: { id: A.sofia.id,   name: A.sofia.name,   avatar: A.sofia.avatar   }, applauseCount: 4,  previousApplauseCount: 0, interactionCreatedAt: t - 53800 },
      // moment-017 (renata — 38 claps, viewerApplauseCount:3: dev:3 + sofia:12 + marcus:10 + emma:8 + amanda:5)
      { id: "int-seed-051", momentId: "moment-017", momentSequence: 17, authorId: A.renata.id,  viewer: { id: A.dev.id,     name: A.dev.name,     avatar: A.dev.avatar     }, applauseCount: 3,  previousApplauseCount: 0, interactionCreatedAt: t - 39400 },
      { id: "int-seed-052", momentId: "moment-017", momentSequence: 17, authorId: A.renata.id,  viewer: { id: A.sofia.id,   name: A.sofia.name,   avatar: A.sofia.avatar   }, applauseCount: 12, previousApplauseCount: 0, interactionCreatedAt: t - 39200 },
      { id: "int-seed-053", momentId: "moment-017", momentSequence: 17, authorId: A.renata.id,  viewer: { id: A.marcus.id,  name: A.marcus.name,  avatar: A.marcus.avatar  }, applauseCount: 10, previousApplauseCount: 0, interactionCreatedAt: t - 39000 },
      { id: "int-seed-054", momentId: "moment-017", momentSequence: 17, authorId: A.renata.id,  viewer: { id: A.emma.id,    name: A.emma.name,    avatar: A.emma.avatar    }, applauseCount: 8,  previousApplauseCount: 0, interactionCreatedAt: t - 38800 },
      { id: "int-seed-055", momentId: "moment-017", momentSequence: 17, authorId: A.renata.id,  viewer: { id: A.amanda.id,  name: A.amanda.name,  avatar: A.amanda.avatar  }, applauseCount: 5,  previousApplauseCount: 0, interactionCreatedAt: t - 38600 },
      // moment-018 (renata — 6 claps, blurred: sofia:4 + marcus:2)
      { id: "int-seed-056", momentId: "moment-018", momentSequence: 18, authorId: A.renata.id,  viewer: { id: A.sofia.id,   name: A.sofia.name,   avatar: A.sofia.avatar   }, applauseCount: 4,  previousApplauseCount: 0, interactionCreatedAt: t - 61000 },
      { id: "int-seed-057", momentId: "moment-018", momentSequence: 18, authorId: A.renata.id,  viewer: { id: A.marcus.id,  name: A.marcus.name,  avatar: A.marcus.avatar  }, applauseCount: 2,  previousApplauseCount: 0, interactionCreatedAt: t - 60800 },
      // moment-019 (daniel — 14 claps: sofia:6 + marcus:5 + emma:3)
      { id: "int-seed-058", momentId: "moment-019", momentSequence: 19, authorId: A.daniel.id,  viewer: { id: A.sofia.id,   name: A.sofia.name,   avatar: A.sofia.avatar   }, applauseCount: 6,  previousApplauseCount: 0, interactionCreatedAt: t - 50200 },
      { id: "int-seed-059", momentId: "moment-019", momentSequence: 19, authorId: A.daniel.id,  viewer: { id: A.marcus.id,  name: A.marcus.name,  avatar: A.marcus.avatar  }, applauseCount: 5,  previousApplauseCount: 0, interactionCreatedAt: t - 50000 },
      { id: "int-seed-060", momentId: "moment-019", momentSequence: 19, authorId: A.daniel.id,  viewer: { id: A.emma.id,    name: A.emma.name,    avatar: A.emma.avatar    }, applauseCount: 3,  previousApplauseCount: 0, interactionCreatedAt: t - 49800 },
      // moment-020 (vanessa — 21 claps, blurred: sofia:8 + marcus:7 + emma:6)
      { id: "int-seed-061", momentId: "moment-020", momentSequence: 20, authorId: A.vanessa.id, viewer: { id: A.sofia.id,   name: A.sofia.name,   avatar: A.sofia.avatar   }, applauseCount: 8,  previousApplauseCount: 0, interactionCreatedAt: t - 71800 },
      { id: "int-seed-062", momentId: "moment-020", momentSequence: 20, authorId: A.vanessa.id, viewer: { id: A.marcus.id,  name: A.marcus.name,  avatar: A.marcus.avatar  }, applauseCount: 7,  previousApplauseCount: 0, interactionCreatedAt: t - 71600 },
      { id: "int-seed-063", momentId: "moment-020", momentSequence: 20, authorId: A.vanessa.id, viewer: { id: A.emma.id,    name: A.emma.name,    avatar: A.emma.avatar    }, applauseCount: 6,  previousApplauseCount: 0, interactionCreatedAt: t - 71400 },
      // carousel-001 (sofia — 34 claps: marcus:15 + emma:10 + daniel:9)
      { id: "int-seed-064", momentId: "carousel-001", momentSequence: 21, authorId: A.sofia.id,  viewer: { id: A.marcus.id, name: A.marcus.name,  avatar: A.marcus.avatar  }, applauseCount: 15, previousApplauseCount: 0, interactionCreatedAt: t - 5200  },
      { id: "int-seed-065", momentId: "carousel-001", momentSequence: 21, authorId: A.sofia.id,  viewer: { id: A.emma.id,   name: A.emma.name,    avatar: A.emma.avatar    }, applauseCount: 10, previousApplauseCount: 0, interactionCreatedAt: t - 5000  },
      { id: "int-seed-066", momentId: "carousel-001", momentSequence: 21, authorId: A.sofia.id,  viewer: { id: A.daniel.id, name: A.daniel.name,  avatar: A.daniel.avatar  }, applauseCount: 9,  previousApplauseCount: 0, interactionCreatedAt: t - 4800  },
      // carousel-002 (marcus — 18 claps, blurred: sofia:10 + emma:8)
      { id: "int-seed-067", momentId: "carousel-002", momentSequence: 22, authorId: A.marcus.id, viewer: { id: A.sofia.id,  name: A.sofia.name,   avatar: A.sofia.avatar   }, applauseCount: 10, previousApplauseCount: 0, interactionCreatedAt: t - 14200 },
      { id: "int-seed-068", momentId: "carousel-002", momentSequence: 22, authorId: A.marcus.id, viewer: { id: A.emma.id,   name: A.emma.name,    avatar: A.emma.avatar    }, applauseCount: 8,  previousApplauseCount: 0, interactionCreatedAt: t - 14000 },
      // carousel-003 (emma — 52 claps: sofia:20 + marcus:17 + amanda:15)
      { id: "int-seed-069", momentId: "carousel-003", momentSequence: 23, authorId: A.emma.id,   viewer: { id: A.sofia.id,  name: A.sofia.name,   avatar: A.sofia.avatar   }, applauseCount: 20, previousApplauseCount: 0, interactionCreatedAt: t - 28600 },
      { id: "int-seed-070", momentId: "carousel-003", momentSequence: 23, authorId: A.emma.id,   viewer: { id: A.marcus.id, name: A.marcus.name,  avatar: A.marcus.avatar  }, applauseCount: 17, previousApplauseCount: 0, interactionCreatedAt: t - 28400 },
      { id: "int-seed-071", momentId: "carousel-003", momentSequence: 23, authorId: A.emma.id,   viewer: { id: A.amanda.id, name: A.amanda.name,  avatar: A.amanda.avatar  }, applauseCount: 15, previousApplauseCount: 0, interactionCreatedAt: t - 28200 },
      // carousel-004 (daniel — 27 claps: sofia:10 + marcus:8 + emma:9)
      { id: "int-seed-072", momentId: "carousel-004", momentSequence: 24, authorId: A.daniel.id, viewer: { id: A.sofia.id,  name: A.sofia.name,   avatar: A.sofia.avatar   }, applauseCount: 10, previousApplauseCount: 0, interactionCreatedAt: t - 7000  },
      { id: "int-seed-073", momentId: "carousel-004", momentSequence: 24, authorId: A.daniel.id, viewer: { id: A.marcus.id, name: A.marcus.name,  avatar: A.marcus.avatar  }, applauseCount: 8,  previousApplauseCount: 0, interactionCreatedAt: t - 6800  },
      { id: "int-seed-074", momentId: "carousel-004", momentSequence: 24, authorId: A.daniel.id, viewer: { id: A.emma.id,   name: A.emma.name,    avatar: A.emma.avatar    }, applauseCount: 9,  previousApplauseCount: 0, interactionCreatedAt: t - 6600  },
      // carousel-006 (amanda — 41 claps, blurred: sofia:15 + marcus:13 + emma:13)
      { id: "int-seed-075", momentId: "carousel-006", momentSequence: 26, authorId: A.amanda.id, viewer: { id: A.sofia.id,  name: A.sofia.name,   avatar: A.sofia.avatar   }, applauseCount: 15, previousApplauseCount: 0, interactionCreatedAt: t - 17800 },
      { id: "int-seed-076", momentId: "carousel-006", momentSequence: 26, authorId: A.amanda.id, viewer: { id: A.marcus.id, name: A.marcus.name,  avatar: A.marcus.avatar  }, applauseCount: 13, previousApplauseCount: 0, interactionCreatedAt: t - 17600 },
      { id: "int-seed-077", momentId: "carousel-006", momentSequence: 26, authorId: A.amanda.id, viewer: { id: A.emma.id,   name: A.emma.name,    avatar: A.emma.avatar    }, applauseCount: 13, previousApplauseCount: 0, interactionCreatedAt: t - 17400 },
    ],
    ledger: [
      // Today — 30 min ago: creator earned from unlock (sofia viewed moment-001)
      { id: "ledger-seed-001", type: "CREATOR_EARNED",    userId: MOCK_AUTHOR_ID, amountUsdMicros: 35_000, momentId: "moment-001", relatedUserId: A.sofia.id,   idempotencyKey: "ledger-seed-001", source: "UNLOCK",   status: "CONFIRMED", createdAt: new Date((t - 1_800)           * 1000).toISOString() },
      // Today — 2 hr ago: user purchased Yoinks
      { id: "ledger-seed-002", type: "YOINKS_PURCHASED",  userId: MOCK_AUTHOR_ID, amountYoinks: 100,       paymentIntentId: "pi_seed_002", stripeEventId: null, idempotencyKey: "ledger-seed-002", source: "STRIPE",    status: "CONFIRMED", createdAt: new Date((t - 7_200)           * 1000).toISOString() },
      // Today — 3 hr ago: user unlocked a moment
      { id: "ledger-seed-003", type: "YOINKS_SPENT",      userId: MOCK_AUTHOR_ID, amountYoinks: -1,        momentId: "moment-009",         relatedUserId: A.marcus.id, idempotencyKey: "ledger-seed-003", source: "UNLOCK", status: "CONFIRMED", createdAt: new Date((t - 10_800)          * 1000).toISOString() },
      // Last Week — 2 days ago: referral reward
      { id: "ledger-seed-004", type: "REFERRAL_REWARD",   userId: MOCK_AUTHOR_ID, amountYoinks: 5,         idempotencyKey: "ledger-seed-004", source: "REFERRAL",  status: "CONFIRMED", createdAt: new Date((t - 2 * 86_400)     * 1000).toISOString() },
      // Last Week — 4 days ago: user purchased Yoinks
      { id: "ledger-seed-005", type: "YOINKS_PURCHASED",  userId: MOCK_AUTHOR_ID, amountYoinks: 40,        paymentIntentId: "pi_seed_005", stripeEventId: null, idempotencyKey: "ledger-seed-005", source: "STRIPE",    status: "CONFIRMED", createdAt: new Date((t - 4 * 86_400)     * 1000).toISOString() },
    ],
    payouts:      [],
    reports:      [],

    // Processed idempotency keys (mock payments + unlock + payout operations)
    processedIdempotencyKeys: new Set(),
    // Stripe event IDs already handled (prevents double-credit on webhook retry)
    processedStripeEvents: new Set(),
    // Pending mock payment intents: piId → { userId, yoinks, amountUsdCents }
    mockPendingPayments: {},
    // Unlocked moments: "viewerId:momentId" → true
    unlockedMoments: new Set(),

    // Counter for new post IDs/sequences (starts after all seeded moments)
    momentCounter: 27,
  };
}

module.exports = { createSeedData, AUTHORS };
