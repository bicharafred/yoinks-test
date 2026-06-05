import Constants from "expo-constants";

/**
 * User-facing app version from Expo config (Expo Go / dev) or native metadata
 * when running a standalone build. Avoids `react-native-device-info`.
 */
export function getAppMarketingVersion(): string {
  const fromExpoConfig = Constants.expoConfig?.version;
  if (typeof fromExpoConfig === "string" && fromExpoConfig.trim() !== "") {
    return fromExpoConfig.trim();
  }

  const native = Constants.nativeAppVersion;
  if (typeof native === "string" && native.trim() !== "") {
    return native.trim();
  }

  return "Unknown";
}
