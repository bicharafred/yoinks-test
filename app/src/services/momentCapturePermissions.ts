import type { MediaLibraryPermissionResponse } from "expo-image-picker";

import type { MomentCreatorLibraryAccess } from "@/machines/momentCreatorMachine";

/**
 * Maps expo-image-picker library permission to moment creator machine access.
 * iOS limited library is treated as openable for the mixed picker (spec).
 */
export function mapMediaLibraryAccess(
  perm: MediaLibraryPermissionResponse,
): MomentCreatorLibraryAccess {
  if (perm.status === "undetermined") {
    return "unknown";
  }
  if (perm.granted) {
    if (perm.accessPrivileges === "limited") {
      return "limited";
    }
    return "granted";
  }
  if (perm.status === "denied") {
    return perm.canAskAgain === false ? "blocked" : "denied";
  }
  return "denied";
}
