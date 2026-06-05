import React from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { ASPECT_RATIO } from "@/utils/constants";

export interface ProfileGridSkeletonProps {
  cellWidth: number;
  interGap: number;
  /** Number of grid rows (4 columns each). Defaults to 3. */
  rows?: number;
}

/**
 * Placeholder grid matching profile moment cell size and 4-column spacing.
 */
export function ProfileGridSkeleton({
  cellWidth,
  interGap,
  rows = 3,
}: ProfileGridSkeletonProps) {
  const cellHeight = cellWidth * ASPECT_RATIO;

  return (
    <View
      accessibilityLabel="Loading profile moments"
      accessibilityRole="progressbar"
    >
      {Array.from({ length: rows }, (_, row) => (
        <View
          key={row}
          style={[styles.row, { gap: interGap, marginBottom: interGap }]}
        >
          {[0, 1, 2, 3].map((col) => (
            <View
              key={col}
              style={[
                styles.cell,
                { width: cellWidth, height: cellHeight },
              ]}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: "row",
  },
  cell: {
    borderRadius: theme.spacing.small,
    backgroundColor: theme.colors.foundation.background.alpha30,
  },
}));
