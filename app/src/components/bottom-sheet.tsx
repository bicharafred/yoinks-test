import React, { useEffect } from "react";
import { Keyboard, Modal, Platform, Pressable, View, useWindowDimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { StyleSheet } from "react-native-unistyles";

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  // Fraction of screen height the sheet can grow to. Defaults to 0.8 (80%).
  maxHeight?: number;
  // Fraction of screen height the sheet must be at minimum. Unset = content-driven.
  minHeight?: number;
  // When true, the panel lifts above the software keyboard. Use for sheets with text inputs.
  keyboardAware?: boolean;
}

export const BottomSheet = ({ visible, onClose, children, maxHeight = 0.8, minHeight, keyboardAware = false }: BottomSheetProps) => {
  const { height } = useWindowDimensions();

  const backdropOpacity = useSharedValue(0);
  const sheetTranslateY = useSharedValue(height);
  // Extra upward offset applied when the software keyboard is open.
  const keyboardOffset = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Backdrop fades in while the sheet slides up — backdrop never "rises" with the sheet.
      backdropOpacity.value = withTiming(1, { duration: 220 });
      sheetTranslateY.value = withSpring(0, { damping: 26, stiffness: 300, mass: 0.8 });
    } else {
      backdropOpacity.value = withTiming(0, { duration: 200 });
      sheetTranslateY.value = withSpring(height, { damping: 20, stiffness: 260, mass: 0.8 });
      // Clear any keyboard offset so the next open starts from the correct position.
      keyboardOffset.value = 0;
    }
  }, [visible, height]);

  useEffect(() => {
    if (!keyboardAware) return;
    // iOS fires Will-events before the animation so the panel moves in sync with the keyboard.
    // Android only fires Did-events; the panel snaps up after the keyboard is fully visible.
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      keyboardOffset.value = withTiming(e.endCoordinates.height, { duration: 220 });
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardOffset.value = withTiming(0, { duration: 200 });
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardAware]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  // keyboardOffset shifts the panel upward (negative Y) by the keyboard height so the
  // input row sits just above the keyboard even inside a Modal on Android.
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value - keyboardOffset.value }],
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop covers the full screen and is always fixed — never animated upward. */}
        <Animated.View style={[styles.backdrop, backdropStyle]} pointerEvents="box-none">
          <Pressable style={styles.backdropPress} onPress={onClose} />
        </Animated.View>
        {/* Only the panel slides up from below the viewport. */}
        <Animated.View style={[styles.sheetContainer(height, maxHeight, minHeight), sheetStyle]}>
          <View style={styles.handle} />
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create((theme) => ({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.foundation.background.alpha50,
  },
  backdropPress: {
    flex: 1,
  },
  sheetContainer: (height: number, maxHeightFraction: number, minHeightFraction?: number) => ({
    backgroundColor: theme.colors.foundation.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 48,
    maxHeight: height * maxHeightFraction,
    ...(minHeightFraction != null ? { minHeight: height * minHeightFraction } : {}),
  }),
  handle: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.foundation.background.alpha30,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 24,
  },
}));
