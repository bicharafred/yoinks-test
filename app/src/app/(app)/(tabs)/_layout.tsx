import { AppTabBar } from "@/components/navigation/app-tab-bar";
import { getAppTabBarChromeColors } from "@/navigation/app-tab-bar-chrome";
import { APP_TABS } from "@/navigation/app-tabs.config";
import { APP_TAB_SCREEN_OPTIONS } from "@/navigation/app-tabs.screen-options";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Tabs } from "expo-router";
import { useMemo } from "react";
import { useUnistyles } from "react-native-unistyles";

/** Stable `tabBar` implementer: same function identity for every `TabLayout` render. */
function renderAppTabBar(props: BottomTabBarProps) {
  return <AppTabBar {...props} />;
}

export default function TabLayout() {
  const { theme } = useUnistyles();
  const tabBarChrome = useMemo(
    () => getAppTabBarChromeColors(theme),
    [theme],
  );

  return (
    <Tabs
      tabBar={renderAppTabBar}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: tabBarChrome.selectedIcon,
        tabBarInactiveTintColor: tabBarChrome.inactiveIcon,
      }}
    >
      {APP_TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={APP_TAB_SCREEN_OPTIONS[tab.name]}
        />
      ))}
    </Tabs>
  );
}
