"use strict";

/**
 * Static username handles keyed by author id.
 * Single source of truth — imported by routes that need to resolve handles.
 */
const HANDLES = {
  "mock-user-001": "devuser",
  "mock-user-002": "sofiar",
  "mock-user-003": "marcusj",
  "mock-user-004": "emmaw",
  "mock-user-005": "amandag",
  "mock-user-006": "renatal",
  "mock-user-007": "danielc",
  "mock-user-008": "vanessag",
  "mock-user-009": "lucasm",
  "mock-user-010": "mayac",
  "mock-user-011": "oliviab",
  "mock-user-012": "ethanb",
};

module.exports = { HANDLES };
