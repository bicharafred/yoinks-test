import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useMemo } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import {
  AppTabBarCenterPlusItem,
  AppTabBarStandardItem,
} from "@/components/navigation/app-tab-bar-item";
import { RootMachineContext } from "@/machines/rootMachine";
import { getAppTabBarChromeColors } from "@/navigation/app-tab-bar-chrome";
import { APP_TAB_BAR_PILL_HEIGHT } from "@/navigation/app-tab-bar-layout";
import { getAppTabConfig } from "@/navigation/app-tabs.config";

/**
 * The tab bar is not wrapped in `React.memo` on the root because this component
 * uses `useSafeAreaInsets()`: memoizing only `BottomTabBarProps` would skip
 * updates when the device inset changes without a navigation change. Per-tab
 * items are memoized in `app-tab-bar-item.tsx` to avoid re-rendering inactive
 * tabs.
 */
export function AppTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom + theme.spacing.large;
  const hasUnreadNotifications = RootMachineContext.useSelector(
    (s) => s.context.hasUnreadNotifications,
  );

  const tabColors = useMemo(() => {
    const chrome = getAppTabBarChromeColors(theme);
    return {
      createIcon: chrome.createIcon,
      inactiveIcon: chrome.inactiveIcon,
      selectedBackground: chrome.selectedFocusBackground,
      selectedIcon: chrome.selectedIcon,
    };
  }, [theme]);
  const focusedRouteName = state.routes[state.index]?.name;

  if (focusedRouteName === "create") {
    return null;
  }

  return (
    <View
      style={[styles.outer, { paddingBottom: bottomInset }]}
      pointerEvents="box-none"
    >
      <View
        style={styles.pill}
        accessibilityRole="tablist"
        accessibilityLabel="Main navigation"
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key]!;
          const isFocused = state.index === index;
          const appTab = getAppTabConfig(route.name);

          const routeParams = route.params as
            | Readonly<Record<string, unknown>>
            | undefined;
          const unreadA11yState =
            appTab?.name === "notifications" && hasUnreadNotifications;

          if (appTab?.tabBarVisual === "centerPlus") {
            return (
              <AppTabBarCenterPlusItem
                key={route.key}
                routeKey={route.key}
                routeName={route.name}
                routeParams={routeParams}
                stateIndex={state.index}
                index={index}
                isFocused={isFocused}
                options={options}
                navigation={navigation}
                color={tabColors.createIcon}
              />
            );
          }

          return (
            <AppTabBarStandardItem
              key={route.key}
              routeKey={route.key}
              routeName={route.name}
              routeParams={routeParams}
              stateIndex={state.index}
              index={index}
              isFocused={isFocused}
              options={options}
              navigation={navigation}
              inactiveIconColor={tabColors.inactiveIcon}
              selectedBackgroundColor={tabColors.selectedBackground}
              selectedIconColor={tabColors.selectedIcon}
              unreadA11yState={unreadA11yState}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => {
  const chrome = getAppTabBarChromeColors(theme);
  return {
    outer: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: "center",
      paddingHorizontal: theme.spacing.normal,
    },
    pill: {
      width: "100%",
      height: APP_TAB_BAR_PILL_HEIGHT,
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "center",
      justifyContent: "space-between",
      overflow: "visible",
      backgroundColor: chrome.pillBackground,
      borderRadius: 80,
      paddingHorizontal: theme.spacing.xsmall,
      paddingVertical: theme.spacing.xsmall,
      shadowColor: chrome.shadow,
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.25,
      shadowRadius: 32,
      elevation: 16,
    },
  };
});
