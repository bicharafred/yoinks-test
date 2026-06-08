import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { forwardRef, useImperativeHandle } from "react";
import { View, useWindowDimensions } from "react-native";
import Animated, {
  clamp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { MomentType } from "@/gql/graphql";
import type { CropTransform } from "@/types/cropTransform";
import { ASPECT_RATIO } from "@/utils/constants";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_SCALE = 1.0;
const MAX_SCALE = 4.0;
const SPRING = { mass: 1, damping: 20, stiffness: 200 } as const;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type MediaCropperRef = {
  getCropTransform: () => CropTransform;
  reset: () => void;
};

type Props = {
  localUri: string;
  mediaType: MomentType;
  // Pre-populate the crop state when revisiting an already-adjusted item.
  initialCropTransform?: CropTransform | null;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const MediaCropper = forwardRef<MediaCropperRef, Props>(
  ({ localUri, mediaType, initialCropTransform }, ref) => {
    const { width } = useWindowDimensions();
    const { theme } = useUnistyles();

    const horizontalPadding = theme.spacing.normal;
    const frameWidth = width - horizontalPadding * 2;
    const frameHeight = frameWidth * ASPECT_RATIO;

    const initScale = initialCropTransform?.scale ?? MIN_SCALE;
    const initX = initialCropTransform?.translateX ?? 0;
    const initY = initialCropTransform?.translateY ?? 0;

    const scale = useSharedValue(initScale);
    const translateX = useSharedValue(initX);
    const translateY = useSharedValue(initY);
    const savedScale = useSharedValue(initScale);
    const savedTranslateX = useSharedValue(initX);
    const savedTranslateY = useSharedValue(initY);

    const isVideo = mediaType === MomentType.Video;

    const player = useVideoPlayer(isVideo ? localUri : null, (p) => {
      p.loop = true;
      p.play();
    });

    const pinch = Gesture.Pinch()
      .onUpdate((e) => {
        "worklet";
        const s = clamp(savedScale.value * e.scale, MIN_SCALE, MAX_SCALE);
        scale.value = s;
        // Re-clamp live position to the new scale bounds so the image never reveals empty space.
        const maxX = (frameWidth * (s - 1)) / 2;
        const maxY = (frameHeight * (s - 1)) / 2;
        translateX.value = clamp(translateX.value, -maxX, maxX);
        translateY.value = clamp(translateY.value, -maxY, maxY);
      })
      .onEnd(() => {
        "worklet";
        savedScale.value = scale.value;
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      });

    const pan = Gesture.Pan()
      .onUpdate((e) => {
        "worklet";
        const maxX = (frameWidth * (scale.value - 1)) / 2;
        const maxY = (frameHeight * (scale.value - 1)) / 2;
        translateX.value = clamp(
          savedTranslateX.value + e.translationX,
          -maxX,
          maxX,
        );
        translateY.value = clamp(
          savedTranslateY.value + e.translationY,
          -maxY,
          maxY,
        );
      })
      .onEnd(() => {
        "worklet";
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      });

    const composed = Gesture.Simultaneous(pinch, pan);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        { scale: scale.value },
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
    }));

    useImperativeHandle(ref, () => ({
      getCropTransform: (): CropTransform => ({
        scale: scale.value,
        translateX: translateX.value,
        translateY: translateY.value,
        cropAspectRatio: ASPECT_RATIO,
      }),
      reset: () => {
        scale.value = withSpring(MIN_SCALE, SPRING);
        translateX.value = withSpring(0, SPRING);
        translateY.value = withSpring(0, SPRING);
        savedScale.value = MIN_SCALE;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      },
    }));

    return (
      <GestureDetector gesture={composed}>
        <View style={styles.frame(frameWidth, frameHeight)}>
          <Animated.View style={[styles.fill, animatedStyle]}>
            {isVideo ? (
              <VideoView
                player={player}
                style={styles.fill}
                contentFit="cover"
                nativeControls={false}
              />
            ) : (
              <Image
                source={{ uri: localUri }}
                style={styles.fill}
                contentFit="cover"
              />
            )}
          </Animated.View>
        </View>
      </GestureDetector>
    );
  },
);

MediaCropper.displayName = "MediaCropper";

const styles = StyleSheet.create((theme) => ({
  frame: (width: number, height: number) => ({
    width,
    height,
    overflow: "hidden" as const,
    borderRadius: theme.spacing.xlarge,
    alignSelf: "center" as const,
  }),
  fill: {
    width: "100%" as const,
    height: "100%" as const,
  },
}));
