import { getValidToken } from "@/services/tokenManager";
import { resolveLocalUrl } from "@/utils/apiUrl";

// Mirrors the mock server's seeded contacts — used as a local fallback when
// the mock server is unreachable (e.g., Android emulator before mock starts).
const DEV_FALLBACK_CONTACTS: ReferralContact[] = [
  { id: "c-1", name: "Alex Rivera",   phone: "+1 555-0101", invited: false },
  { id: "c-2", name: "Brenda Kim",    phone: "+1 555-0102", invited: false },
  { id: "c-3", name: "Carlos Mendes", phone: "+1 555-0103", invited: false },
  { id: "c-4", name: "Diana Osei",    phone: "+1 555-0104", invited: false },
  { id: "c-5", name: "Ethan Zhao",    phone: "+1 555-0105", invited: false },
  { id: "c-6", name: "Fatima Hassan", phone: "+1 555-0106", invited: false },
  { id: "c-7", name: "George Patel",  phone: "+1 555-0107", invited: false },
  { id: "c-8", name: "Hannah Müller", phone: "+1 555-0108", invited: false },
];

// ─────────────────────────────────────────────────────────────────────────────
// Production referral lifecycle
// ─────────────────────────────────────────────────────────────────────────────
//
// Sending an invite does NOT earn the inviter any Yoinks.
//
// Reward is granted only when the invited person:
//   1. Opens the referral link            → status: "opened"
//   2. Creates a Yoinks account           → status: "signed_up"
//   3. Completes onboarding / first open  → status: "active"   ← reward fires here
//
// Once rewarded the status becomes "rewarded" and the same referral cannot
// be rewarded again (duplicate-proof on the backend).
//
// MOCK MVP exception (simulator only):
//   The mock server skips steps 1–3 and immediately credits +1 Yoink per
//   selected contact when POST /me/invite/send is called. This shortcut
//   exists only for testing the wallet update and success toast in the
//   iOS Simulator. It must never ship as real production logic.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full lifecycle of a single referral invite.
 *
 * Production flow: sent → opened → signed_up → active → rewarded
 *
 * The mock server jumps directly to "rewarded" on send for simulator testing.
 */
export interface ReferralInvite {
  id: string;
  inviterUserId: string;
  /** Phone number or email used to deliver the invite. */
  invitedContact: string;
  referralCode: string;
  referralLink: string;
  /**
   * "sent"      — invite dispatched; no Yoinks earned yet.
   * "opened"    — invited person tapped the link.
   * "signed_up" — invited person created a Yoinks account.
   * "active"    — signed up AND completed onboarding/first open. Reward triggers here.
   * "rewarded"  — inviter received Yoinks. Terminal state; cannot be rewarded again.
   */
  status: "sent" | "opened" | "signed_up" | "active" | "rewarded";
  /** Always 1 under current product rules. */
  rewardYoinks: number;
  createdAt: string;
  /** Set when status reaches "signed_up". */
  acceptedAt: string | null;
  /** Set when status reaches "rewarded". */
  rewardedAt: string | null;
}

export interface ReferralContact {
  id: string;
  name: string;
  phone: string;
  /**
   * True when an invite was previously sent to this contact.
   * In production this maps to ReferralInvite.status !== "sent" (i.e., the invite
   * progressed at least to "opened"). In the mock it is set permanently on send.
   */
  invited: boolean;
}

export interface ReferralInfo {
  referralCode: string;
  referralLink: string;
  /** Yoinks earned per successfully activated referral (always 1 in current rules). */
  yoinksEarned: number;
}

/**
 * Returned by POST /me/invite/send.
 *
 * "invited" = number of contacts that were newly sent an invite this call
 *             (contacts already in "invited" state are skipped to prevent double-sends).
 *
 * MOCK ONLY: newBalance reflects an immediate Yoinks credit. In production,
 * newBalance changes only after an invited contact reaches "active" status.
 */
export interface SendInvitesResult {
  invited: number;
  newBalance: number;
}

const REST_BASE = resolveLocalUrl(
  (process.env.EXPO_PUBLIC_API_BASE_REST ?? "").replace(/\/$/, ""),
);

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getValidToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token ?? ""}`,
  };
}

export async function fetchReferral(): Promise<ReferralInfo> {
  const url = `${REST_BASE}/me/referral`;
  try {
    const res = await fetch(url, { headers: await authHeaders() });
    if (!res.ok) throw new Error(`fetchReferral failed: ${res.status}`);
    const info = (await res.json()) as ReferralInfo;
    if (__DEV__) console.log("[invite] referral link:", info.referralLink);
    return info;
  } catch (error) {
    if (__DEV__) {
      const fallback: ReferralInfo = {
        referralCode: "YOINKS-DEV7",
        referralLink: "https://yoinks.app/invite/YOINKS-DEV7",
        yoinksEarned: 1,
      };
      console.warn("[invite] fetchReferral failed, using DEV fallback:", error);
      console.log("[invite] referral link:", fallback.referralLink);
      return fallback;
    }
    throw error;
  }
}

export async function fetchContacts(): Promise<ReferralContact[]> {
  const url = `${REST_BASE}/me/contacts`;
  if (__DEV__) console.log("[invite] contacts URL:", url);
  try {
    const res = await fetch(url, { headers: await authHeaders() });
    if (!res.ok) throw new Error(`fetchContacts failed: ${res.status}`);
    const data = (await res.json()) as { contacts: ReferralContact[] };
    return data.contacts ?? [];
  } catch (error) {
    if (__DEV__) {
      console.warn("[invite] fetchContacts failed, using DEV fallback:", error);
      console.log("[invite] contacts fallback used:", DEV_FALLBACK_CONTACTS.map((c) => c.name));
      return DEV_FALLBACK_CONTACTS;
    }
    throw error;
  }
}

/**
 * Dispatches invites to the given contacts.
 *
 * Production: creates ReferralInvite records with status "sent" and sends
 * an invite message (SMS / email / deep link). No Yoinks are credited yet.
 *
 * Mock MVP: immediately simulates all selected contacts reaching "active"
 * status and credits +1 Yoink per new invite for simulator testing.
 */
export async function sendInvites(
  contactIds: string[],
): Promise<SendInvitesResult> {
  const res = await fetch(`${REST_BASE}/me/invite/send`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ contactIds }),
  });
  if (!res.ok) throw new Error(`sendInvites failed: ${res.status}`);
  return res.json() as Promise<SendInvitesResult>;
}
