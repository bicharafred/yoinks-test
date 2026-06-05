/**
 * Regenerates `.expo/types/router.d.ts` for Expo Router typed routes (`experiments.typedRoutes`).
 * Run before `tsc` in CI or locally so `Href` / `router.push` are checked against the file tree.
 */
"use strict";

const path = require("node:path");
const fs = require("node:fs");
const { getTypedRoutesDeclarationFile } = require("expo-router/build/typed-routes/generate");
const requireContext = require("expo-router/build/testing-library/require-context-ponyfill").default;
const { EXPO_ROUTER_CTX_IGNORE } = require("expo-router/_ctx-shared");

const projectRoot = path.join(__dirname, "..");
const appRoot = path.join(projectRoot, "src", "app");
process.env.EXPO_ROUTER_APP_ROOT = appRoot;

const ctx = requireContext(appRoot, true, EXPO_ROUTER_CTX_IGNORE);
const file = getTypedRoutesDeclarationFile(ctx, {});

if (!file) {
  console.error("expo-router: failed to generate typed routes declaration.");
  process.exit(1);
}

const outDir = path.join(projectRoot, ".expo", "types");
fs.mkdirSync(outDir, { recursive: true });
const target = path.join(outDir, "router.d.ts");
fs.writeFileSync(target, file);
console.log("Wrote", path.relative(projectRoot, target));
