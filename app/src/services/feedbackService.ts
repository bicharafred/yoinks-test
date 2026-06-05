import { getValidToken } from "@/services/tokenManager";
import { resolveLocalUrl } from "@/utils/apiUrl";

const API_BASE = resolveLocalUrl(
  (process.env.EXPO_PUBLIC_API_BASE_REST ?? "").replace(/\/$/, ""),
);

export async function submitFeedback({
  message,
  userId,
  screen = "unknown",
}: {
  message: string;
  userId?: string;
  screen?: string;
}): Promise<void> {
  const token = await getValidToken();
  const response = await fetch(`${API_BASE}/feedback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      message,
      userId: userId ?? "unknown",
      screen,
      source: "floating_button",
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `HTTP ${response.status}`);
  }
}
