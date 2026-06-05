import type { BottomTabNavigationOptions } from "@react-navigation/bottom-tabs";
import { View } from "react-native";

import { APP_TABS, type AppTabRouteName } from "@/navigation/app-tabs.config";
import { getAppHeaderOptions } from "@/navigation/app-header-options";

/**
 * The real tab chrome is `AppTabBar` (SVGs + theme tokens). React Navigation
 * still expects a `tabBarIcon` option; use a zero-size placeholder so we do not
 * depend on default tint colors or temporary Ionicons. Active/inactive tint
 * colors are set from Unistyles on the `Tabs` layout for any code that reads
 * `tabBarActiveTintColor` / `tabBarInactiveTintColor`.
 */
const hiddenTabBarIcon: NonNullable<
  BottomTabNavigationOptions["tabBarIcon"]
> = ({ size }) => (
  <View
    accessible={false}
    importantForAccessibility="no-hide-descendants"
    pointerEvents="none"
    style={{ width: size, height: size }}
  />
);

const tabBarIconByRoute: Record<
  AppTabRouteName,
  NonNullable<BottomTabNavigationOptions["tabBarIcon"]>
> = {
  feed: hiddenTabBarIcon,
  notifications: hiddenTabBarIcon,
  create: hiddenTabBarIcon,
  wallet: hiddenTabBarIcon,
  profile: hiddenTabBarIcon,
};

const built = APP_TABS.reduce(
  (acc, t) => {
    if (t.name === "create") {
      // Create uses a nested Stack; index applies the shared header via Stack.Screen.
      acc[t.name] = {
        headerShown: false,
        tabBarIcon: tabBarIconByRoute[t.name],
        tabBarAccessibilityLabel: t.accessibilityLabel,
      };
    } else {
      acc[t.name] = {
        ...getAppHeaderOptions({ title: t.title }),
        headerShown: t.headerShown,
        tabBarIcon: tabBarIconByRoute[t.name],
        tabBarAccessibilityLabel: t.accessibilityLabel,
      };
    }

    return acc;
  },
  {} as Record<AppTabRouteName, BottomTabNavigationOptions>,
);

/**
 * Pre-built screen options with stable `tabBarIcon` references (tab shell performance).
 * Created once; same object for each route on every layout render.
 */
export const APP_TAB_SCREEN_OPTIONS: Readonly<
  Record<AppTabRouteName, BottomTabNavigationOptions>
> = built;
