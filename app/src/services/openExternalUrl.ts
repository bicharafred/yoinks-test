import { Linking } from "react-native";

export type OpenExternalUrlSuccess = { ok: true };

export type OpenExternalUrlFailure = {
  ok: false;
  message: string;
};

export type OpenExternalUrlResult =
  | OpenExternalUrlSuccess
  | OpenExternalUrlFailure;

/**
 * Opens a URL with React Native `Linking`. Surfaces `canOpenURL` and open failures
 * without throwing, so callers can map results to UI.
 */
export async function openExternalUrl(
  url: string,
): Promise<OpenExternalUrlResult> {
  const trimmed = url.trim();
  if (trimmed.length === 0) {
    return { ok: false, message: "URL is empty." };
  }

  try {
    const supported = await Linking.canOpenURL(trimmed);
    if (!supported) {
      return {
        ok: false,
        message: "This URL cannot be opened on this device.",
      };
    }
    await Linking.openURL(trimmed);
    return { ok: true };
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : "Failed to open URL.";
    return { ok: false, message };
  }
}
