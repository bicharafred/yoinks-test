import { getValidToken } from "@/services/tokenManager";
import { resolveLocalUrl } from "@/utils/apiUrl";

export interface ModerationUser {
  id: string;
  name: string;
  handle: string;
  avatar: string | null;
}

function restBase(): string {
  const raw = (process.env.EXPO_PUBLIC_API_BASE_REST ?? "").trim().replace(/\/$/, "");
  return resolveLocalUrl(raw);
}

async function authedFetch(path: string, init: RequestInit = {}): Promise<unknown> {
  const token = await getValidToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const res = await fetch(`${restBase()}${path}`, { ...init, headers });
  const text = await res.text();
  if (!res.ok) throw new Error(`Moderation request failed (${res.status}): ${text.slice(0, 200)}`);
  return text.length > 0 ? (JSON.parse(text) as unknown) : {};
}

export async function hideCreator(authorId: string): Promise<void> {
  await authedFetch("/me/hidden-creators", {
    method: "POST",
    body: JSON.stringify({ authorId }),
  });
}

export async function unhideCreator(authorId: string): Promise<void> {
  await authedFetch(`/me/hidden-creators/${encodeURIComponent(authorId)}`, {
    method: "DELETE",
  });
}

export async function getHiddenCreators(): Promise<ModerationUser[]> {
  const raw = await authedFetch("/me/hidden-creators", { method: "GET" });
  const data = raw as { hiddenCreators?: unknown[] };
  return Array.isArray(data.hiddenCreators) ? (data.hiddenCreators as ModerationUser[]) : [];
}

export async function getBlockedUsersDetail(): Promise<ModerationUser[]> {
  const raw = await authedFetch("/me/blocked-users", { method: "GET" });
  const data = raw as { blockedUsers?: unknown[] };
  return Array.isArray(data.blockedUsers) ? (data.blockedUsers as ModerationUser[]) : [];
}
