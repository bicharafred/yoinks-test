import { jwtDecode } from "jwt-decode";
import { mmkvStorage, StorageKeys } from "./storage";
import { globalEvents } from "./eventBus";
import { resolveLocalUrl } from "@/utils/apiUrl";

type Tokens = {
  accessToken: string;
  refreshToken: string;
  idToken?: string;
};

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

export const refreshAccessToken = async (): Promise<string | null> => {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const tokens = mmkvStorage.get<Tokens>(StorageKeys.TOKENS);
      if (!tokens?.refreshToken) {
        throw new Error("No refresh token available");
      }

      const response = await fetch(
        `${resolveLocalUrl(process.env.EXPO_PUBLIC_API_BASE_REST ?? "")}refresh-token`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: tokens.refreshToken }),
        }
      );

      if (!response.ok) {
        // Se for erro 4xx (Client Error), o token é inválido ou revogado. Logout necessário.
        if (response.status >= 400 && response.status < 500) {
          console.warn("Fatal Auth Error. Logging out.");
          mmkvStorage.delete(StorageKeys.TOKENS);
          mmkvStorage.delete(StorageKeys.AUTHOR);
          globalEvents.next({ type: "LOGOUT" });
          throw new Error(`Refresh token invalid or expired: ${response.status}`);
        }
        
        // Se for 5xx (Server Error) ou outro, NÃO desloga.
        // Apenas lança erro para que o retry tente novamente depois ou use cache.
        throw new Error(`Server error during refresh: ${response.status}`);
      }

      const data = await response.json();
      
      // A lambda de refreshToken retorna { accessToken, idToken, expiresIn }
      // NÃO retorna um objeto aninhado `tokens: {...}`
      if (data.accessToken) {
        const newTokens: Tokens = {
          ...tokens, // Mantém o refreshToken antigo, pois o Cognito não retorna um novo
          accessToken: data.accessToken,
          idToken: data.idToken || tokens.idToken,
        };
        mmkvStorage.set(StorageKeys.TOKENS, newTokens);
        return data.accessToken;
      }
      
      throw new Error("Invalid refresh token response format");
    } catch (error) {
      console.warn("[tokenManager] token refresh failed:", (error as Error)?.message ?? error);
      // Repassa o erro para o caller (seja o interceptor 401 ou o getValidToken)
      throw error;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

export const getValidToken = async (): Promise<string | null> => {
  const tokens = mmkvStorage.get<Tokens>(StorageKeys.TOKENS);
  
  if (!tokens?.accessToken) {
    return null;
  }

  let decoded: { exp: number };
  try {
    decoded = jwtDecode<{ exp: number }>(tokens.accessToken);
  } catch (error) {
    console.warn("[tokenManager] failed to decode token:", error);
    // Em caso de erro no decode, retornamos o token que temos.
    // Se for inválido, o Apollo Link de erro pegará o 401.
    return tokens.accessToken;
  }

  const now = Math.floor(Date.now() / 1000);
  const timeUntilExpiry = decoded.exp - now;

  // Hard expired
  if (timeUntilExpiry <= 0) {
    console.log("Token hard expired. Blocking for refresh.");
    return await refreshAccessToken();
  }

  // Soft expired (less than 5 minutes remaining)
  if (timeUntilExpiry < 5 * 60) {
    console.log("Token stale (expires soon). Triggering background refresh.");
    // Trigger refresh in background but return current token
    refreshAccessToken().catch((e) =>
      console.warn("[tokenManager] background refresh failed:", (e as Error)?.message ?? e),
    );
    return tokens.accessToken;
  }

  return tokens.accessToken;
};
