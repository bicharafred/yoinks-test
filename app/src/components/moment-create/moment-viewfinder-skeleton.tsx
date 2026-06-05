import { StyleSheet as RNStyleSheet, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

/**
 * Neutral placeholder while the camera device is resolving.
 */
export function MomentViewfinderSkeleton() {
  return <View style={styles.root} />;
}

const styles = StyleSheet.create((theme) => ({
  root: {
    ...RNStyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.foundation.background.skeleton,
  },
}));
