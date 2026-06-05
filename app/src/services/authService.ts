import {
  GoogleSignin,
  isSuccessResponse,
} from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";
import { Platform } from "react-native";
import { mmkvStorage, StorageKeys } from "./storage";

// You need to call this at the start of the app (e.g. in _layout.tsx or right here)
if (Platform.OS === "android") {
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });
}

export const loginWithNativeProviderAsync = async () => {
  let requestBody: any = {};

  if (Platform.OS === "ios") {
    const appleAuthRequestResponse = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!appleAuthRequestResponse.identityToken) {
      throw new Error("Could not login with Apple. No identity token.");
    }

    // Keeping the exact old format for iOS to not break backwards compatibility
    requestBody = {
      appleAuthRequest: appleAuthRequestResponse,
    };
  } else {
    // Android Flow
    console.log("Starting Google Sign-In flow...");
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) {
      // The user may have closed the modal (response.type === 'cancelled')
      throw new Error("Google login was cancelled or failed.");
    }
    if (!response.data.idToken) {
      throw new Error("Could not login with Google. No identity token.");
    }
    requestBody = {
      provider: "GOOGLE",
      token: response.data.idToken,
    };
  }

  // Unified API call
  const response = await fetch(
    `${process.env.EXPO_PUBLIC_API_BASE_REST}login`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    },
  );

  if (!response.ok) {
    let serverErrorMessage = response.statusText;
    try {
      // Try to read the error JSON that our Lambda returns
      const errorBody = await response.json();
      serverErrorMessage =
        errorBody.error || errorBody.message || serverErrorMessage;
    } catch (e) {
      // If it's not JSON (e.g. proxy/gateway error), ignore
    }
    throw new Error(
      `Server error (${response.status}): ${serverErrorMessage}`,
    );
  }

  const data = await response.json();

  mmkvStorage.set(StorageKeys.TOKENS, data.tokens);
  mmkvStorage.set(StorageKeys.AUTHOR, data.author);

  return data;
};
