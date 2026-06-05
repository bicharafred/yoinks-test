import AppleLogo from "@/assets/icons/apple.svg";
import GoogleLogo from "@/assets/icons/google.svg";
import { runtimeConfig } from "@/config/runtimeConfig";
import { RootMachineContext } from "@/machines/rootMachine";
import { loginWithNativeProviderAsync } from "@/services/authService";
import { loginWithNativeProviderAsync as devLoginAsync } from "@/services/authService.local";
import { Image } from "expo-image";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";

SplashScreen.preventAutoHideAsync();

export default function Login() {
  const platform = Platform.OS;
  const rootRef = RootMachineContext.useActorRef();
  const [isLoading, setIsLoading] = useState(false);
  const [devLoadingUserId, setDevLoadingUserId] = useState<string | null>(null);

  const loginTitle = useMemo(() => {
    return platform === "android"
      ? "Sign in with Google"
      : "Sign in with Apple";
  }, [platform]);

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  const openPrivacyPolicy = () => {
    void Linking.openURL(
      "https://app.termly.io/policy-viewer/policy.html?policyUUID=590a8cff-ae31-4112-89bb-0c3f648dc704",
    );
  };

  const openTermsOfUse = () => {
    void Linking.openURL(
      "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/",
    );
  };

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      const data = await loginWithNativeProviderAsync();
      rootRef.send({ type: "LOGIN_SUCCESS", author: data.author });
    } catch (error: any) {
      Alert.alert("Login Error", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDevLogin = async (userId: string) => {
    if (devLoadingUserId != null) return;
    try {
      setDevLoadingUserId(userId);
      const data = await devLoginAsync(userId);
      rootRef.send({ type: "LOGIN_SUCCESS", author: data.author });
    } catch (error: any) {
      Alert.alert("Dev Login Error", error.message);
    } finally {
      setDevLoadingUserId(null);
    }
  };

  // Note that there is no `useStyles` hook here! Unistyles v3 does not cause re-renders.

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          style={styles.gifImage}
          source={require("@/assets/GIFs/YoinksAnimation1_WaveLoop.gif")}
          contentFit="contain"
          autoplay
        />
        <Text style={styles.title}>
          Welcome to{" "}
          <Text style={[styles.title, styles.brandTitle]}>Yoinks</Text>!
        </Text>
      </View>

      <TouchableOpacity
        style={styles.loginButton}
        onPress={handleLogin}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator color={styles.loginButtonText.color as string} />
        ) : (
          <>
            {platform === "ios" ? (
              <AppleLogo width={24} height={24} />
            ) : (
              <GoogleLogo width={24} height={24} />
            )}
            <Text style={styles.loginButtonText}>{loginTitle}</Text>
          </>
        )}
      </TouchableOpacity>

      {runtimeConfig.enableDevLogin && (
        <View style={styles.devLoginGroup}>
          <TouchableOpacity
            style={styles.devLoginButton}
            onPress={() => handleDevLogin("mock-user-001")}
            disabled={devLoadingUserId != null}
            activeOpacity={0.7}
          >
            {devLoadingUserId === "mock-user-001" ? (
              <ActivityIndicator color="rgba(255, 255, 255, 0.5)" size="small" />
            ) : (
              <Text style={styles.devLoginText}>[DEV] Continue as Frederico</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.devLoginButton}
            onPress={() => handleDevLogin("mock-user-013")}
            disabled={devLoadingUserId != null}
            activeOpacity={0.7}
          >
            {devLoadingUserId === "mock-user-013" ? (
              <ActivityIndicator color="rgba(255, 255, 255, 0.5)" size="small" />
            ) : (
              <Text style={styles.devLoginText}>[DEV] Continue as André</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.legalContainer}>
        <Text style={styles.legalText}>By joining you agree to Yoinks</Text>
        <Text style={styles.legalText}>
          <Text
            style={[styles.legalText, styles.legalLink]}
            onPress={openTermsOfUse}
          >
            Terms of use
          </Text>{" "}
          &{" "}
          <Text
            style={[styles.legalText, styles.legalLink]}
            onPress={openPrivacyPolicy}
          >
            Privacy Policy
          </Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}

// The StyleSheet gains "superpowers" and injects its theme
const styles = StyleSheet.create((theme) => {
  const LegalTextFontSize = 16;
  const LegalTextLineHeight = LegalTextFontSize * 1.25;

  return {
    container: {
      flex: 1,
      width: "100%",
      height: "100%",
      backgroundColor: theme.colors.foundation.foreground.brand.tertiary,
      padding: theme.spacing.normal,
    },
    logoContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    gifImage: {
      width: 111,
      height: 111,
    },
    title: {
      fontSize: 28,
      fontStyle: "normal",
      fontWeight: "400",
      color: theme.colors.common.white,
      marginTop: theme.spacing.xxxlarge,
    },
    brandTitle: {
      color: theme.colors.common.black,
      marginTop: 0,
    },
    loginButton: {
      width: "100%",
      padding: theme.spacing.normal,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.colors.common.white,
      borderRadius: 8000,
      flexDirection: "row",
    },
    loginButtonText: {
      fontSize: 16,
      fontStyle: "normal",
      fontWeight: "700",
      color: theme.colors.common.black,
      marginLeft: theme.spacing.xsmall,
    },
    devLoginGroup: {
      marginTop: theme.spacing.normal,
      gap: theme.spacing.xsmall,
    },
    devLoginButton: {
      alignItems: "center",
      padding: theme.spacing.xsmall,
    },
    devLoginText: {
      fontSize: 14,
      fontWeight: "400",
      color: "rgba(255, 255, 255, 0.5)",
      textDecorationLine: "underline",
    },
    legalContainer: {
      marginTop: theme.spacing.normal,
    },
    legalText: {
      fontSize: LegalTextFontSize,
      fontStyle: "normal",
      fontWeight: "400",
      lineHeight: LegalTextLineHeight,
      textAlign: "center",
      color: "rgba(255, 255, 255, 0.6)",
    },
    legalLink: {
      color: theme.colors.common.white,
    },
  };
});
