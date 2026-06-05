import type { ThemeType } from "@/styles/index";

/**
 * Must stay in sync with the floating pill height in `AppTabBar` (`styles.pill`).
 */
export const APP_TAB_BAR_PILL_HEIGHT = 64;

/**
 * Use as `contentContainerStyle.paddingBottom` (or `paddingBottom` on a scroll
 * view) for tab screens whose body scrolls under the absolute-positioned
 * `AppTabBar`, so the last content clears the bar and its bottom safe area.
 *
 * Matches: `useSafeAreaInsets().bottom` + `theme.spacing.large` (outer padding)
 * + `APP_TAB_BAR_PILL_HEIGHT`.
 */
export function getAppTabBarScrollContentBottomPadding(
  safeAreaBottom: number,
  theme: Pick<ThemeType, "spacing">,
): number {
  return safeAreaBottom + theme.spacing.large + APP_TAB_BAR_PILL_HEIGHT;
}
