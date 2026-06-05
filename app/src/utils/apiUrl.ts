import { Platform } from "react-native";

/**
 * Resolves a local dev API URL for the current runtime:
 *   iOS Simulator    — 127.0.0.1 reaches the host Mac directly. No remap.
 *   Android Emulator — 127.0.0.1 is the emulator's own loopback. Remap to 10.0.2.2.
 *   Physical Android — With `adb reverse`, 127.0.0.1 tunnels to the host. No remap.
 *   Production       — Real HTTPS URL. No remap (__DEV__ is false, no-op).
 *
 * Physical Android requirement: EXPO_PUBLIC_USE_ADB_REVERSE=true in .env
 * and: adb reverse tcp:4000 tcp:4000 && adb reverse tcp:8081 tcp:8081
 */
export function resolveLocalUrl(raw: string): string {
  if (
    __DEV__ &&
    Platform.OS === "android" &&
    process.env.EXPO_PUBLIC_USE_ADB_REVERSE !== "true"
  ) {
    return raw.replace(
      /^(https?:\/\/)(localhost|127\.0\.0\.1)(:\d+)?/,
      (_, proto, _host, port) => `${proto}10.0.2.2${port ?? ""}`,
    );
  }
  return raw;
}
