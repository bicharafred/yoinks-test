import type { ProfileHeaderAuthor } from "@/components/profile/profile-header-content";
import { ProfileScreen } from "@/components/profile/profile-screen";
import { AppScreenContainer } from "@/components/navigation/app-screen-container";
import type { Author } from "@/gql/graphql";
import { RootMachineContext } from "@/machines/rootMachine";
import { getAppHeaderOptions } from "@/navigation/app-header-options";
import { getAppTabBarScrollContentBottomPadding } from "@/navigation/app-tab-bar-layout";
import GearIcon from "@/assets/icons/gear.svg";
import { Tabs, useRouter } from "expo-router";
import React, { useCallback, useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

function resolveProfileHeaderAuthor(
  author: Author | null,
): ProfileHeaderAuthor | null {
  if (author == null) {
    return null;
  }
  const id = typeof author.id === "string" ? author.id.trim() : "";
  if (id === "") {
    return null;
  }
  return {
    id,
    name: author.name,
    avatar: author.avatar ?? undefined,
  };
}

function getProfileTabHeaderTitle(author: Author | null): string {
  if (author == null) {
    return "Profile";
  }
  const name = typeof author.name === "string" ? author.name.trim() : "";
  return name !== "" ? name : "Profile";
}

export default function ProfileTab() {
  const router = useRouter();
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();

  const rawAuthor = RootMachineContext.useSelector(
    (state) => state.context.author as Author | null,
  );

  const headerAuthor = useMemo(
    () => resolveProfileHeaderAuthor(rawAuthor),
    [rawAuthor],
  );

  const tabBarScrollBottomPadding = useMemo(
    () => getAppTabBarScrollContentBottomPadding(insets.bottom, theme),
    [insets.bottom, theme],
  );

  const handleSettingsPress = useCallback(() => {
    router.push("/(app)/settings");
  }, [router]);

  const profileHeaderOptions = useMemo(
    () =>
      getAppHeaderOptions({
        title: getProfileTabHeaderTitle(rawAuthor),
        rightAction: (
          <Pressable
            onPress={handleSettingsPress}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            accessibilityHint="Opens settings"
            style={styles.headerButton}
          >
            <GearIcon
              width={24}
              height={24}
              color={theme.colors.foundation.foreground.primary}
            />
          </Pressable>
        ),
        rightAccessibilityLabel: "Settings",
      }),
    [
      handleSettingsPress,
      rawAuthor,
      theme.colors.foundation.foreground.primary,
    ],
  );

  if (headerAuthor == null) {
    return (
      <>
        <Tabs.Screen options={profileHeaderOptions} />
        <AppScreenContainer>
          <View style={styles.fallbackContent}>
            <Text style={styles.fallbackTitle}>Profile</Text>
            <Text style={styles.fallbackMessage}>
              Signed-in account data is unavailable. Try signing in again.
            </Text>
          </View>
        </AppScreenContainer>
      </>
    );
  }

  return (
    <>
      <Tabs.Screen options={profileHeaderOptions} />
      <ProfileScreen
        source="self"
        viewedAuthor={headerAuthor}
        viewerAuthor={headerAuthor}
        scrollContentBottomPadding={tabBarScrollBottomPadding}
      />
    </>
  );
}

const styles = StyleSheet.create((theme) => ({
  headerButton: {
    padding: theme.spacing.xsmall,
  },
  fallbackContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.large,
  },
  fallbackTitle: {
    color: theme.colors.foundation.foreground.primary,
    fontSize: 18,
    fontWeight: "600",
    marginBottom: theme.spacing.small,
  },
  fallbackMessage: {
    textAlign: "center",
    color: theme.colors.foundation.foreground.secondary,
    fontSize: 14,
    fontWeight: "500",
  },
}));
