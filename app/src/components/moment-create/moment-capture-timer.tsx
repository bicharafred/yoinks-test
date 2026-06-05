import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

export type MomentCaptureTimerProps = {
  elapsedMs: number;
};

function formatElapsed(ms: number): string {
  const capped = Math.min(ms, 999000);
  const totalSec = Math.floor(capped / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function MomentCaptureTimer({ elapsedMs }: MomentCaptureTimerProps) {
  return (
    <View style={styles.pill}>
      <Text style={styles.text} accessibilityLiveRegion="polite">
        {formatElapsed(elapsedMs)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 38,
    /** Readable on both themes over live preview (Figma: ~20% black). */
    backgroundColor: theme.colors.foundation.background.alpha20,
  },
  text: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.common.white,
    fontVariant: ["tabular-nums"],
  },
}));
