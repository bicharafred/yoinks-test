import React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import KoinsIcon from "@/assets/icons/koins.fill.svg";
import LockedIcon from "@/assets/icons/lock.svg";
import { UNBLUR_PRICE_YOINKS } from "@/utils/momentVisibility";

interface MomentLockedOverlayProps {
  isLocked: boolean;
  onUnlockPress?: () => void;
  isUnblurring?: boolean;
}

export const MomentLockedOverlay = ({
  isLocked,
  onUnlockPress,
  isUnblurring,
}: MomentLockedOverlayProps) => {
  const { theme } = useUnistyles();
  return (
    <View style={styles.centerOverlay} pointerEvents="box-none">
      <View style={styles.lockedMomentContainer}>
        {isLocked ? (
          <LockedIcon width={32} height={32} color={theme.colors.common.white} />
        ) : (
          <>
            <Text style={styles.labelLockedMoment}>See with</Text>
            <Pressable
              style={styles.buttonUnlockContent}
              onPress={onUnlockPress}
              disabled={isUnblurring}
            >
              {isUnblurring ? (
                <ActivityIndicator color={theme.colors.common.white} />
              ) : (
                <>
                  <KoinsIcon width={24} height={24} color={theme.colors.common.white} />
                  <Text style={styles.buttonUnlockText}>
                    {UNBLUR_PRICE_YOINKS} {UNBLUR_PRICE_YOINKS === 1 ? "Yoink" : "Yoinks"}
                  </Text>
                </>
              )}
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create((theme) => ({
  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  lockedMomentContainer: {
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  labelLockedMoment: {
    fontSize: 16,
    fontWeight: "400",
    color: theme.colors.common.white,
  },
  buttonUnlockContent: {
    width: 216,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    borderRadius: 80,
    borderWidth: 1,
    borderColor: theme.colors.common.white,
    gap: theme.spacing.small,
  },
  buttonUnlockText: {
    fontSize: 20,
    fontWeight: "600",
    color: theme.colors.common.white,
  },
}));
