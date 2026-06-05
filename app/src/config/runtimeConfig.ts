/**
 * Centralized runtime feature flags derived from build-time env vars.
 *
 * Local dev:   set in app/.env
 * Staging APK: set in eas.json "staging-apk" profile env block
 * Production:  all enableX flags default to false (safe)
 *
 * __DEV__ remains valid for technical logging; product behavior should use
 * these flags so staging APKs (which have __DEV__ = false) still work.
 */
export const runtimeConfig = {
  appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? "local",
  isLocal: process.env.EXPO_PUBLIC_APP_ENV === "local",
  isStaging: process.env.EXPO_PUBLIC_APP_ENV === "staging",
  isProduction: process.env.EXPO_PUBLIC_APP_ENV === "production",

  /** Shows the dev-login user selection buttons on the login screen. */
  enableDevLogin: process.env.EXPO_PUBLIC_ENABLE_DEV_LOGIN === "true",

  /** Allows mock payment intents (pi_mock_) to be confirmed without Stripe. */
  enableMockPayments: process.env.EXPO_PUBLIC_ENABLE_MOCK_PAYMENTS === "true",

  /** Shows the "Seed $5 Earnings" / "Request Payout" debug buttons in the wallet. */
  enableMockPayout: process.env.EXPO_PUBLIC_ENABLE_MOCK_PAYOUT === "true",

  /** Allows mock upload URLs from the hosted mock-server. */
  enableMockUploads: process.env.EXPO_PUBLIC_ENABLE_MOCK_UPLOADS === "true",

  /** Gates video capture and upload. Keep false until pipeline is production-ready. */
  videoEnabled: process.env.EXPO_PUBLIC_VIDEO_ENABLED === "true",
} as const;
