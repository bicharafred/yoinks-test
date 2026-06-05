/**
 * Navigation contract for migrated XState machines (root, feed, auth).
 *
 * The legacy `SET_NAVIGATION` and `SPAWN_SHARE_MOMENT_SCREEN` patterns are not
 * used. Machines hold no navigation refs; imperative routing stays in the UI
 * layer via Expo Router (`expo-router`). Feed tab re-tap (scroll-to-top) uses
 * `feed-tab-repress-registry` so machines do not receive navigation objects.
 *
 * If a future machine needs imperative routes, add a narrow typed callback or
 * a small router wrapper consumed only at mount boundaries—not a full
 * navigation object on context.
 */

export {};
