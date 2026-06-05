/**
 * authService.local.ts
 * --------------------
 * LOCAL DEVELOPMENT ONLY — used by the "[DEV] Continue as Dev User" button in
 * login.tsx when __DEV__ && Platform.OS === "android".
 *
 * Hits the mock server's /login endpoint with a bypass payload and writes the
 * returned tokens + author to MMKV — identical to what the real auth flow does.
 *
 * Android networking is controlled by EXPO_PUBLIC_USE_ADB_REVERSE in .env:
 *   true  → physical device with `adb reverse tcp:4000 tcp:4000`
 *            The device's 127.0.0.1:4000 tunnels to the host. Keep as-is.
 *   false / absent → Android Emulator (AVD)
 *            127.0.0.1 inside the emulator is the emulator's own loopback.
 *            Host machine is at 10.0.2.2. Remap automatically.
 *
 * iOS Simulator is unaffected — Platform.OS !== "android" skips all remapping.
 */

import { Platform } from "react-native";
import { mmkvStorage, StorageKeys } from "./storage";
import { resolveLocalUrl } from "@/utils/apiUrl";

const DEV_LOGIN_TIMEOUT_MS = 5000;
const DEV_HEALTH_TIMEOUT_MS = 3000;

export const loginWithNativeProviderAsync = async (userId = "mock-user-001") => {
  const rawBase = process.env.EXPO_PUBLIC_API_BASE_REST ?? "";
  const useAdbReverse = process.env.EXPO_PUBLIC_USE_ADB_REVERSE === "true";
  const mockBase = resolveLocalUrl(rawBase);
  const loginUrl = `${mockBase}login`;
  const healthUrl = `${mockBase}health`;
  const payload = JSON.stringify({ localDevBypass: true, mockUserId: userId });

  if (__DEV__) {
    console.log("[dev-login] ─── pressed ────────────────────────────────────");
    console.log("[dev-login] userId               :", userId);
    console.log("[dev-login] Platform.OS          :", Platform.OS);
    console.log("[dev-login] USE_ADB_REVERSE      :", useAdbReverse);
    console.log("[dev-login] API base (.env)      :", rawBase);
    console.log("[dev-login] API base (resolved)  :", mockBase);
    console.log("[dev-login] final login URL      :", loginUrl);
    console.log("[dev-login] payload              :", payload);
    console.log("[dev-login] request started at   :", new Date().toISOString());
  }

  // Pre-flight health check — confirms the mock server is reachable and (on
  // physical devices) that adb reverse is forwarding traffic.
  // Non-fatal: login proceeds regardless of health check result.
  // Never runs in production (guarded by __DEV__).
  if (__DEV__) {
    try {
      const hc = new AbortController();
      const hcTimer = setTimeout(() => hc.abort(), DEV_HEALTH_TIMEOUT_MS);
      const hRes = await fetch(healthUrl, { method: "GET", signal: hc.signal });
      clearTimeout(hcTimer);
      const hBody = await hRes.json().catch(() => ({})) as object;
      console.log("[dev-login] health check        : ok", JSON.stringify(hBody));
    } catch (hErr) {
      const isHcTimeout = hErr instanceof Error && hErr.name === "AbortError";
      const hErrName = hErr instanceof Error ? hErr.name : "Unknown";
      const hErrMsg  = hErr instanceof Error ? hErr.message : String(hErr);
      console.warn(
        "[dev-login] health check        : FAILED —",
        isHcTimeout
          ? `timed out after ${DEV_HEALTH_TIMEOUT_MS / 1000}s (is mock server running? is adb reverse active?)`
          : `${hErrName}: ${hErrMsg}`,
      );
      console.warn("[dev-login] health URL          :", healthUrl);
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEV_LOGIN_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(loginUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      signal: controller.signal,
    });
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === "AbortError";
    const errName   = err instanceof Error ? err.name    : "Unknown";
    const errMsg    = err instanceof Error ? err.message : String(err);
    if (__DEV__) {
      console.error("[dev-login] fetch error — name   :", errName);
      console.error("[dev-login] fetch error — message:", errMsg);
      console.error("[dev-login] fetch error — URL    :", loginUrl);
    }
    throw new Error(
      isTimeout
        ? `Dev login timed out after ${DEV_LOGIN_TIMEOUT_MS / 1000}s\nURL: ${loginUrl}\nIs the mock server running? Is adb reverse active?`
        : `Dev login network error (${errName}): ${errMsg}\nURL: ${loginUrl}`,
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (__DEV__) {
    console.log("[dev-login] response status      :", response.status);
  }

  if (!response.ok) {
    const responseBody = await response.text().catch(() => "");
    if (__DEV__) {
      console.error("[dev-login] response error body  :", responseBody);
    }
    throw new Error(
      `Mock login failed: ${response.status} ${response.statusText}\nURL: ${loginUrl}`,
    );
  }

  const data = await response.json() as { tokens: object; author: { id: string } };

  if (__DEV__) {
    console.log("[dev-login] response body        :", JSON.stringify(data));
    console.log("[dev-login] author id            :", data.author?.id);
    console.log("[dev-login] navigating to feed ─────────────────────────────");
  }

  mmkvStorage.set(StorageKeys.TOKENS, data.tokens);
  mmkvStorage.set(StorageKeys.AUTHOR, data.author);

  return data;
};
