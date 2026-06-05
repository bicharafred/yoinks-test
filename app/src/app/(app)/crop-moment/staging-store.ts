// Moved to @/services/cropMomentStagingStore.
//
// This stub exists because Expo Router scans every file inside src/app/ and
// warns about files that lack a default export. The real module lives outside
// the route tree so the router ignores it.
//
// All imports have been updated to the new path. This file can be deleted
// once confirmed that no stale Metro cache references remain.
export * from "@/services/cropMomentStagingStore";

// Satisfies Expo Router's "missing default export" check without registering
// a real screen. Returning null renders nothing if this route is ever reached.
export default function _StagingStorePlaceholder(): null {
  return null;
}
