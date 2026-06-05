import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from "@/constants/legalUrls";
import {
  openExternalUrl,
  type OpenExternalUrlResult,
} from "@/services/openExternalUrl";

export type LegalUrlOpenResult = OpenExternalUrlResult;

/**
 * Shared legal openings for Settings and Wallet. URLs come from `@/constants/legalUrls`
 * (Yoinks-branded yoinks.com pages; legacy Termly/Apple links documented there).
 */

export async function openTermsOfServiceUrl(): Promise<LegalUrlOpenResult> {
  return openExternalUrl(TERMS_OF_SERVICE_URL);
}

export async function openPrivacyPolicyUrl(): Promise<LegalUrlOpenResult> {
  return openExternalUrl(PRIVACY_POLICY_URL);
}
