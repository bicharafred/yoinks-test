import { AppErrorBoundary } from "@/components/app-error-boundary";
import { devLog } from "@/utils/devLog";
import { StripeProviderGate } from "@/components/stripe-provider-gate";
import { NotificationsSubscriptionBridge } from "@/components/notifications/notifications-subscription-bridge";
import { NotificationsUnreadBadgeSync } from "@/components/notifications/notifications-unread-badge-sync";
import { RootMachineContext } from "@/machines/rootMachine";
import { globalEvents } from "@/services/eventBus";
import {
  useNavigationAnalytics,
  type NavigationScreenView,
} from "@/navigation/use-navigation-analytics";
import { client, resolvedApiBase } from "@/services/client";
import { flush } from "@/services/interactionQueue";
import { processCreateInteractionJob } from "@/services/interactionProcessor";
import { flush as flushMomentUploads } from "@/services/momentUploadQueue";
import { processMomentUploadJob } from "@/services/momentUploadProcessor";
import { cleanupStaleCaptureMedia } from "@/services/momentCaptureStorage";
import { ApolloProvider } from "@apollo/client/react";
import {
  Stack,
  usePathname,
  useRootNavigationState,
  useRouter,
  useSegments,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import Toast, { BaseToast } from "react-native-toast-message";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useUnistyles } from "react-native-unistyles";

// Unistyles: `index.js` imports `./src/styles/unistyles` before `expo-router/entry`
// (required so themes exist before any screen uses `useUnistyles`).

function AppStatusBar() {
  const { theme } = useUnistyles();
  const headerBackgroundColor = theme.colors.foundation.background.primary;
  const isLightHeader =
    headerBackgroundColor.toLowerCase() === theme.colors.common.white;

  return (
    <StatusBar
      backgroundColor={headerBackgroundColor}
      style={
        Platform.OS === "android" ? (isLightHeader ? "dark" : "light") : "auto"
      }
    />
  );
}

function RootNavigator() {
  const state = RootMachineContext.useSelector((state) => state);
  const rootRef = RootMachineContext.useActorRef();
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const onboardingPushScheduledRef = useRef(false);
  const isLoggedInRef = useRef(state.matches("loggedIn"));
  const appStateRef = useRef(AppState.currentState ?? "unknown");

  useEffect(() => {
    const subscription = globalEvents.subscribe((event) => {
      if (event.type === "LOGOUT") {
        rootRef.send({ type: "LOGOUT" });
      }
    });
    return () => subscription.unsubscribe();
  }, [rootRef]);

  useEffect(() => {
    if (!__DEV__) return;
    const isLoggedIn = state.matches("loggedIn");
    const isLoggedOut = state.matches("loggedOut");
    const restBase = process.env.EXPO_PUBLIC_API_BASE_REST ?? "(unset)";
    devLog("startup", "─────────────────────────────────────────────────────");
    devLog("startup", "app mounted");
    devLog("startup", "platform              :", Platform.OS);
    devLog("startup", "is dev                : true");
    devLog("startup", "auth state            :", isLoggedIn ? "loggedIn" : isLoggedOut ? "loggedOut" : "initializing");
    devLog("startup", "EXPO_PUBLIC_API_BASE  :", process.env.EXPO_PUBLIC_API_BASE ?? "(unset)");
    devLog("startup", "EXPO_PUBLIC_API_BASE_REST:", restBase);
    devLog("startup", "USE_ADB_REVERSE       :", process.env.EXPO_PUBLIC_USE_ADB_REVERSE ?? "(unset)");
    devLog("startup", "API base resolved     :", resolvedApiBase);
    devLog("startup", "mock health URL       :", `${restBase}health`);
    devLog("startup", "─────────────────────────────────────────────────────");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    isLoggedInRef.current = state.matches("loggedIn");
  }, [state]);

  const onNavigationScreenView = useCallback((view: NavigationScreenView) => {
    if (!__DEV__) {
      return;
    }
    // Dev-only: replace with analytics SDK `screen` event when integrated.
    devLog("nav:screen", view.pathname, view.globalParams);
  }, []);
  useNavigationAnalytics(onNavigationScreenView);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = nextAppState;

      if (nextAppState === "active") {
        flush(processCreateInteractionJob).catch((error) => {
          console.error("Failed to flush interaction queue on foreground", error);
        });
        flushMomentUploads(processMomentUploadJob).catch((error) => {
          console.error("Failed to flush moment upload queue on foreground", error);
        });

        const returnedToForeground =
          prev === "background" ||
          prev === "inactive";

        if (returnedToForeground && isLoggedInRef.current) {
          rootRef.send({ type: "AUTHENTICATED_APP_FOREGROUND" });
        }
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );

    flush(processCreateInteractionJob).catch((error) => {
      console.error("Failed to flush interaction queue on mount", error);
    });
    flushMomentUploads(processMomentUploadJob).catch((error) => {
      console.error("Failed to flush moment upload queue on mount", error);
    });
    cleanupStaleCaptureMedia();

    return () => {
      subscription.remove();
    };
  }, [rootRef]);

  useEffect(() => {
    if (!navigationState?.key) return;

    // Route groups: (app) = private; (auth) = login. Unauthenticated users must
    // be redirected only from (app) so deep links to /(app)/... go to login,
    // while the root index route can show null or <Redirect> without a race.
    const inAuthGroup = segments[0] === "(auth)";
    const inAppGroup = segments[0] === "(app)";
    const isLoggedIn = state.matches("loggedIn");

    setTimeout(() => {
      if (!isLoggedIn && inAppGroup) {
        router.replace("/(auth)/login");
      } else if (isLoggedIn && inAuthGroup) {
        router.replace("/(app)/(tabs)/feed");
      }
    }, 0);
  }, [state.value, segments, navigationState?.key, state, router]);

  useEffect(() => {
    if (!navigationState?.key) {
      return;
    }
    const inOnboardingReplay = state.matches({
      loggedIn: "onboardingReplay",
    });
    const onOnboardingRoute =
      typeof pathname === "string" && pathname.includes("onboarding");

    if (!inOnboardingReplay) {
      onboardingPushScheduledRef.current = false;
      return;
    }
    if (onOnboardingRoute) {
      return;
    }
    if (onboardingPushScheduledRef.current) {
      return;
    }
    onboardingPushScheduledRef.current = true;
    router.push("/(app)/onboarding");
  }, [navigationState?.key, pathname, router, state]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}

function ThemedToast() {
  const { theme } = useUnistyles();
  return (
    <Toast
      position="top"
      config={{
        koins: (toastParams) => (
          <BaseToast
            style={{ borderLeftColor: theme.colors.foundation.foreground.warning.tertiary }}
            text1={toastParams.text1}
            text2={toastParams.text2}
            text1Style={toastParams.text1Style}
            text2Style={toastParams.text2Style}
            onPress={toastParams.onPress}
          />
        ),
        applause: (toastParams) => (
          <BaseToast
            style={{ borderLeftColor: theme.colors.foundation.foreground.brand.tertiary }}
            text1={toastParams.text1}
            text2={toastParams.text2}
            text1Style={toastParams.text1Style}
            text2Style={toastParams.text2Style}
            onPress={toastParams.onPress}
          />
        ),
        success: (toastParams) => (
          <BaseToast
            style={{ borderLeftColor: theme.colors.foundation.foreground.success.tertiary }}
            text1={toastParams.text1}
            text2={toastParams.text2}
            text1Style={toastParams.text1Style}
            text2Style={toastParams.text2Style}
            onPress={toastParams.onPress}
          />
        ),
      }}
    />
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ApolloProvider client={client}>
          <StripeProviderGate>
            <AppErrorBoundary>
              <RootMachineContext.Provider>
                <NotificationsUnreadBadgeSync />
                <NotificationsSubscriptionBridge />
                <AppStatusBar />
                <RootNavigator />
              </RootMachineContext.Provider>
              <ThemedToast />
            </AppErrorBoundary>
          </StripeProviderGate>
        </ApolloProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
