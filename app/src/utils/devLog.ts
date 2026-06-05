/**
 * Scoped dev-only logging helpers.
 *
 * All three functions are no-ops in production builds (__DEV__ === false).
 * Use these instead of bare console.* calls so that verbose diagnostic output
 * is automatically stripped from release bundles.
 *
 * Usage:
 *   devLog("feed", "fetched", items.length, "items");
 *   devWarn("tokenManager", "token stale, refreshing");
 *   devError("shareMoment", "upload failed", error);
 *
 * Candidate call-sites for migration (not exhaustive):
 *   src/app/_layout.tsx                      — [startup] diagnostics
 *   src/app/(app)/(tabs)/feed.tsx            — [try-again] diagnostics
 *   src/machines/feedMachine.ts              — [feed] fetch errors
 *   src/machines/notificationsMachine.ts     — notification fetch logging
 *   src/machines/shareMomentMachine.ts       — [shareMoment] flush errors
 *   src/services/authService.local.ts        — [dev-login] full request trace
 *   src/services/tokenManager.ts             — token refresh lifecycle
 *   src/services/momentRestApi.ts            — [momentRestApi] request logging
 *   src/services/momentUploadProcessor.ts   — [momentUploadProcessor] upload trace
 *   src/services/momentOptimisticFeed.ts    — cache write warnings
 *   src/services/interactionProcessor.ts    — interaction error logging
 *   src/services/referralService.ts          — [invite] fallback warnings
 *   src/hooks/useComments.ts                 — comment fetch/submit errors
 *   src/components/invite-sheet.tsx          — clipboard error
 *   src/components/moment-media.tsx          — media debug logging
 *   src/components/notifications/...         — subscription errors
 */

export function devLog(scope: string, ...args: unknown[]): void {
  if (__DEV__) {
    console.log(`[${scope}]`, ...args);
  }
}

export function devWarn(scope: string, ...args: unknown[]): void {
  if (__DEV__) {
    console.warn(`[${scope}]`, ...args);
  }
}

export function devError(scope: string, ...args: unknown[]): void {
  if (__DEV__) {
    console.error(`[${scope}]`, ...args);
  }
}
