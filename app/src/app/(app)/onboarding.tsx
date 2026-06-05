import { AppScreenContainer } from "@/components/navigation/app-screen-container";
import { RootMachineContext } from "@/machines/rootMachine";
import { getAppHeaderOptions } from "@/navigation/app-header-options";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRouter } from "expo-router";
import { useLayoutEffect, useCallback, useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

/**
 * Getting-started replay entry: opened when the root machine is in
 * `loggedIn.onboardingReplay`. Replace body content with the real onboarding
 * flow when designs and content are ready.
 */
export default function OnboardingReplayScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const rootRef = RootMachineContext.useActorRef();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();

  const leaveReplay = useCallback(() => {
    rootRef.send({ type: "FINISH_ONBOARDING_REPLAY" });
  }, [rootRef]);

  const goBack = useCallback(() => {
    leaveReplay();
    router.back();
  }, [leaveReplay, router]);

  useEffect(() => {
    return navigation.addListener("beforeRemove", () => {
      rootRef.send({ type: "FINISH_ONBOARDING_REPLAY" });
    });
  }, [navigation, rootRef]);

  useLayoutEffect(() => {
    navigation.setOptions({
      ...getAppHeaderOptions({
        title: "Getting started",
        leftAction: (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={goBack}
          >
            <Ionicons
              name="chevron-back"
              size={28}
              color={theme.colors.foundation.foreground.primary}
            />
          </Pressable>
        ),
        leftAccessibilityLabel: "Go back",
      }),
    });
  }, [goBack, navigation, theme.colors.foundation.foreground.primary]);

  const onPressDone = useCallback(() => {
    goBack();
  }, [goBack]);

  return (
    <AppScreenContainer>
      <View
        style={[styles.body, { paddingBottom: insets.bottom + 24 }]}
        accessibilityLabel="Getting started replay"
      >
        <Text style={styles.lead}>
          Welcome back to Yoinks. Full guided onboarding content will appear
          here when the product flow is wired.
        </Text>
        <Pressable
          onPress={onPressDone}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.primaryButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Done"
        >
          <Text style={styles.primaryButtonLabel}>Done</Text>
        </Pressable>
      </View>
    </AppScreenContainer>
  );
}

const styles = StyleSheet.create((theme) => ({
  body: {
    flex: 1,
    paddingHorizontal: theme.spacing.large,
    paddingTop: theme.spacing.large,
    justifyContent: "center",
    gap: theme.spacing.large,
  },
  lead: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "500",
    color: theme.colors.foundation.foreground.secondary,
    textAlign: "center",
  },
  primaryButton: {
    alignSelf: "center",
    minWidth: 160,
    paddingVertical: theme.spacing.normal,
    paddingHorizontal: theme.spacing.large,
    borderRadius: 12,
    backgroundColor: theme.colors.foundation.foreground.primary,
  },
  primaryButtonPressed: {
    opacity: 0.88,
  },
  primaryButtonLabel: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.foundation.background.primary,
  },
}));
