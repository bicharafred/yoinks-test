import type { ReactNode } from "react";

import { AppHeader } from "@/components/navigation/app-header";

export type AppHeaderOptionsInput = {
  title: string;
  leftAction?: ReactNode;
  rightAction?: ReactNode;
  leftAccessibilityLabel?: string;
  rightAccessibilityLabel?: string;
};

export function getAppHeaderOptions({
  title,
  leftAction,
  rightAction,
  leftAccessibilityLabel,
  rightAccessibilityLabel,
}: AppHeaderOptionsInput) {
  return {
    title,
    headerShown: true,
    headerTransparent: true,
    headerShadowVisible: false,
    headerStyle: {
      backgroundColor: "transparent",
    },
    header: () => (
      <AppHeader
        title={title}
        leftAction={leftAction}
        rightAction={rightAction}
        leftAccessibilityLabel={leftAccessibilityLabel}
        rightAccessibilityLabel={rightAccessibilityLabel}
      />
    ),
  };
}
