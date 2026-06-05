/**
 * Public legal document URLs opened from Settings.
 *
 * Current exports use Yoinks-hosted pages for consistent branding with the web
 * product. Legacy app URLs (for audit / product comparison):
 * - Privacy: https://app.termly.io/policy-viewer/policy.html?policyUUID=590a8cff-ae31-4112-89bb-0c3f648dc704
 * - Terms: https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
 *
 * Replace the constants below only if product/legal requires parity with legacy
 * Termly or Apple destinations; see `.cursor/migration-plans/settings-plan.md`
 * (Recorded product decisions — Legal URLs).
 *
 * App surfaces (`Settings`, `Wallet`) resolve links through `@/services/legalUrlsService`.
 */
export const PRIVACY_POLICY_URL =
  "https://app.termly.io/policy-viewer/policy.html?policyUUID=590a8cff-ae31-4112-89bb-0c3f648dc704";

export const TERMS_OF_SERVICE_URL =
  "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";
