import * as Haptics from "expo-haptics";
import { type Href, usePathname, useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import ExclamationIcon from "@/assets/icons/exclamation.svg";

/**
 * Pinned height of the floating tab bar pill; must stay in sync with
 * `app-tab-bar.tsx` `pill` height.
 */
const TAB_PILL_HEIGHT = 64;

const FEEDBACK_HREF = "/(app)/feedback" as const satisfies Href;

/**
 * Legacy-style floating entry to the private feedback stack route. Kept
 * at the (app) layout level so it stays available above tabs. Hidden while
 * the feedback screen is focused or during full-screen create flows.
 * `react-native-view-shot` capture is deferred (see migration plan).
 */
export function AppFeedbackFab() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();

  const isFeedbackRoute =
    pathname.split("/").filter(Boolean).pop() === "feedback";
  const isCreateFlow = pathname.includes("/create");

  const bottomOffset =
    insets.bottom +
    theme.spacing.large +
    TAB_PILL_HEIGHT +
    theme.spacing.normal;

  if (isFeedbackRoute || isCreateFlow) {
    return null;
  }

  return (
    <View
      style={[styles.wrapper, { bottom: bottomOffset }]}
      pointerEvents="box-none"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Send feedback"
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push(FEEDBACK_HREF);
        }}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      >
        <ExclamationIcon
          width={24}
          height={24}
          color={theme.colors.foundation.background.primary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  wrapper: {
    position: "absolute",
    right: theme.spacing.normal,
    zIndex: 10,
  },
  fab: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xsmall,
    padding: theme.spacing.small,
    borderRadius: 80,
    backgroundColor: theme.colors.foundation.foreground.primary,
  },
  fabPressed: {
    opacity: 0.9,
  },
}));
