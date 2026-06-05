import type { Href } from "expo-router";

/**
 * Signed-in user profile tab. Do not pass author data via route params; read
 * `RootMachineContext` on the profile screen instead.
 */
export const APP_TAB_PROFILE_HREF = "/(app)/(tabs)/profile" as const satisfies Href;

/**
 * Moment capture stack route (Vision Camera). Spec: `src/app/(app)/create-moment/`.
 * Opened from the Create tab / center control above the tab navigator, not from the legacy tab-local placeholder stack.
 */
export const APP_CREATE_MOMENT_HREF = "/(app)/create-moment" as const satisfies Href;

/**
 * File-based tab segment names under `src/app/(app)/(tabs)/`. Order matches visible tab order.
 */
export const APP_TAB_ROUTE_NAMES = [
  "feed",
  "notifications",
  "create",
  "wallet",
  "profile",
] as const;

export type AppTabRouteName = (typeof APP_TAB_ROUTE_NAMES)[number];

export type AppTabConfig = {
  readonly name: AppTabRouteName;
  readonly title: string;
  /** `tabBarAccessibilityLabel` and primary screen-reader name for the tab. */
  readonly accessibilityLabel: string;
  /** When true, the rounded app header is shown for this tab. */
  readonly headerShown: boolean;
  /**
   * `centerPlus`: Create tab only — middle column with the Figma inline plus treatment.
   */
  readonly tabBarVisual?: "centerPlus";
};

/**
 * Single source of truth for private app tab order, copy, icons, and a11y labels.
 */
export const APP_TABS: readonly AppTabConfig[] = [
  {
    name: "feed",
    title: "Feed",
    accessibilityLabel: "Feed",
    headerShown: true,
  },
  {
    name: "notifications",
    title: "Notifications",
    accessibilityLabel: "Notifications",
    headerShown: true,
  },
  {
    name: "create",
    title: "Create",
    accessibilityLabel: "Create",
    headerShown: true,
    tabBarVisual: "centerPlus",
  },
  {
    name: "wallet",
    title: "Wallet",
    accessibilityLabel: "Wallet",
    headerShown: true,
  },
  {
    name: "profile",
    title: "Profile",
    accessibilityLabel: "Profile",
    headerShown: true,
  },
];

export function getAppTabConfig(routeName: string): AppTabConfig | undefined {
  return APP_TABS.find((tab) => tab.name === routeName);
}
