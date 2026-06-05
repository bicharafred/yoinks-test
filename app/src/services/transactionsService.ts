import { getValidToken } from "@/services/tokenManager";
import { resolveLocalUrl } from "@/utils/apiUrl";

export type TransactionType =
  | "YOINKS_PURCHASED"
  | "YOINKS_SPENT"
  | "CREATOR_EARNED"
  | "PAYOUT_REQUESTED"
  | "PAYOUT_PAID"
  | "PAYOUT_FAILED"
  | "REFERRAL_REWARD";

export type TransactionRange = "last_week" | "last_month" | "last_year";

export interface Transaction {
  id: string;
  type: TransactionType;
  status: string;
  amountYoinks: number | null;
  amountUsdMicros: number | null;
  momentId: string | null;
  payoutId: string | null;
  createdAt: string;
}

function restBase(): string {
  const raw = (process.env.EXPO_PUBLIC_API_BASE_REST ?? "").trim().replace(/\/$/, "");
  return resolveLocalUrl(raw);
}

export async function fetchTransactions(range: TransactionRange): Promise<Transaction[]> {
  const token = await getValidToken();
  if (!token) throw new Error("Authorization token unavailable");

  const url = `${restBase()}/transactions?range=${range}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Transactions request failed (${res.status})`);
  }

  const json = (await res.json()) as { transactions?: Transaction[] };
  return Array.isArray(json.transactions) ? json.transactions : [];
}
