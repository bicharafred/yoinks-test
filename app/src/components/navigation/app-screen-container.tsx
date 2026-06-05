import type { PropsWithChildren } from "react";
import { StyleSheet as RNStyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";

import { getAppHeaderHeight } from "@/components/navigation/app-header";

type AppScreenContainerProps = PropsWithChildren<{
  offsetForHeader?: boolean;
}>;

export function AppScreenContainer({
  children,
  offsetForHeader = true,
}: AppScreenContainerProps) {
  const insets = useSafeAreaInsets();
  const headerHeight = getAppHeaderHeight(insets.top);

  return (
    <View
      style={[
        RNStyleSheet.absoluteFillObject,
        styles.container,
        offsetForHeader && { paddingTop: headerHeight },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.foundation.background.primary,
  },
}));
