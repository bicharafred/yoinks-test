import { AppFeedbackFab } from "@/components/navigation/app-feedback-fab";
import { AppHeaderBackButton } from "@/components/navigation/app-header-back-button";
import { getAppHeaderOptions } from "@/navigation/app-header-options";
import { Stack } from "expo-router";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

/**
 * Shared options for private stack routes pushed above tabs.
 */
const privateStackScreenOptions = {
  presentation: "card" as const,
};

export default function AppLayout() {
  return (
    <View style={styles.root}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="search"
          options={{
            ...privateStackScreenOptions,
            ...getAppHeaderOptions({
              title: "Search",
              leftAction: <AppHeaderBackButton />,
              leftAccessibilityLabel: "Go back",
            }),
          }}
        />
        <Stack.Screen
          name="visitor/[authorId]"
          options={{
            ...privateStackScreenOptions,
          }}
        />
        <Stack.Screen
          name="report"
          options={{
            ...privateStackScreenOptions,
            ...getAppHeaderOptions({ title: "Report" }),
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            ...privateStackScreenOptions,
            ...getAppHeaderOptions({ title: "Settings" }),
          }}
        />
        <Stack.Screen
          name="onboarding"
          options={{
            ...privateStackScreenOptions,
            ...getAppHeaderOptions({ title: "Getting started" }),
          }}
        />
        <Stack.Screen
          name="feedback"
          options={{
            ...privateStackScreenOptions,
            ...getAppHeaderOptions({ title: "Feedback" }),
          }}
        />
        <Stack.Screen
          name="user-moments/[authorId]"
          options={{
            ...privateStackScreenOptions,
          }}
        />
        <Stack.Screen
          name="blocked-users"
          options={{
            ...privateStackScreenOptions,
          }}
        />
        <Stack.Screen
          name="hidden-creators"
          options={{
            ...privateStackScreenOptions,
          }}
        />
        <Stack.Screen
          name="profile-image"
          options={{
            ...privateStackScreenOptions,
          }}
        />
        <Stack.Screen
          name="single-moment"
          options={{
            ...privateStackScreenOptions,
            ...getAppHeaderOptions({ title: "Single Moment" }),
          }}
        />
        <Stack.Screen
          name="create-moment"
          options={{
            ...privateStackScreenOptions,
          }}
        />
        <Stack.Screen
          name="crop-moment"
          options={{
            ...privateStackScreenOptions,
            animation: "slide_from_right",
          }}
        />
        <Stack.Screen
          name="share-moment"
          options={{
            ...privateStackScreenOptions,
            animation: "slide_from_right",
          }}
        />
        <Stack.Screen
          name="transactions"
          options={{
            ...privateStackScreenOptions,
          }}
        />
      </Stack>
      <AppFeedbackFab />
    </View>
  );
}

const styles = StyleSheet.create(() => ({
  root: {
    flex: 1,
  },
}));
