import type { ThemeType } from "@/styles/index";

/**
 * Maps existing Unistyles foundation tokens to the floating tab bar (legacy
 * “Yoinks” pill + inverted focus ring). This keeps light/dark parity in one
 * place: active state uses `foreground.primary` for the circle and
 * `background.primary` for the icon so contrast inverts like the old shell.
 */
export function getAppTabBarChromeColors(theme: ThemeType) {
  return {
    inactiveIcon: theme.colors.foundation.foreground.primary,
    selectedIcon: theme.colors.foundation.background.primary,
    selectedFocusBackground: theme.colors.foundation.foreground.primary,
    createIcon: theme.colors.foundation.foreground.brand.tertiary,
    pillBackground: theme.colors.foundation.background.secondary,
    shadow: theme.colors.common.black,
  } as const;
}

/**
 * Border for the notification unread dot so it separates from the icon and
 * matches the focus circle vs pill surface in both themes.
 */
export function getAppTabBarBadgeBorderColor(
  theme: ThemeType,
  isTabFocused: boolean,
): string {
  return isTabFocused
    ? theme.colors.foundation.foreground.quaternary
    : theme.colors.foundation.background.secondary;
}
