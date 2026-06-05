import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useCallback, useRef, useState } from "react";
import {
  type ViewStyle,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  ScrollView,
  View,
  Pressable,
  Text,
} from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { MomentType } from "@/gql/graphql";
import type { MediaItem } from "@/types/mediaItem";

// ---------------------------------------------------------------------------
// Per-item sub-component (each gets its own video player hook)
// ---------------------------------------------------------------------------

type CarouselItemProps = {
  item: MediaItem;
  width: number;
  height: number;
  isActive: boolean;
  isFeedScreenActive: boolean;
  isBlurred: boolean;
  isMuted: boolean;
};

function CarouselItemView({
  item,
  width,
  height,
  isActive,
  isFeedScreenActive,
  isBlurred,
  isMuted,
}: CarouselItemProps) {
  const isVideo = item.mediaType === MomentType.Video;

  const player = useVideoPlayer(isVideo ? item.mediaUrl : null, (p) => {
    p.loop = true;
    p.muted = isMuted;
  });

  React.useEffect(() => {
    if (!player || !isVideo) return;
    player.muted = isMuted;
  }, [isMuted, player, isVideo]);

  React.useEffect(() => {
    if (!player || !isVideo) return;
    if (isActive && isFeedScreenActive && !isBlurred) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, isFeedScreenActive, isBlurred, player, isVideo]);

  const cropTransform = item.cropTransform;
  const transformStyle: ViewStyle | undefined = cropTransform
    ? {
        transform: [
          { scale: cropTransform.scale },
          { translateX: cropTransform.translateX },
          { translateY: cropTransform.translateY },
        ],
      }
    : undefined;

  return (
    <View style={{ width, height }}>
      <View style={styles.clip}>
        <View style={[styles.fill, transformStyle]}>
          {isVideo ? (
            <VideoView
              style={styles.media}
              player={player}
              fullscreenOptions={{ enable: false }}
              allowsPictureInPicture={false}
              nativeControls={false}
              contentFit="cover"
            />
          ) : (
            <Image
              style={styles.media}
              source={item.mediaUrl}
              contentFit="cover"
              transition={200}
              blurRadius={isBlurred ? 15 : 0}
            />
          )}
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Carousel
// ---------------------------------------------------------------------------

type Props = {
  items: MediaItem[];
  width: number;
  height: number;
  isVisibleMedia: boolean;
  isFeedScreenActive: boolean;
  isBlurred: boolean;
  isMuted: boolean;
};

export function MomentCarousel({
  items,
  width,
  height,
  isVisibleMedia,
  isFeedScreenActive,
  isBlurred,
  isMuted,
}: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
      setActiveIndex(newIndex);
    },
    [width],
  );

  const goToPrev = useCallback(() => {
    const nextIndex = Math.max(0, activeIndex - 1);
    scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
    setActiveIndex(nextIndex);
  }, [activeIndex, width]);

  const goToNext = useCallback(() => {
    const nextIndex = Math.min(items.length - 1, activeIndex + 1);
    scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
    setActiveIndex(nextIndex);
  }, [activeIndex, items.length, width]);

  return (
    <View style={{ width, height }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={16}
      >
        {items.map((item, index) => (
          <CarouselItemView
            key={item.id}
            item={item}
            width={width}
            height={height}
            isActive={isVisibleMedia && index === activeIndex}
            isFeedScreenActive={isFeedScreenActive}
            isBlurred={isBlurred}
            isMuted={isMuted}
          />
        ))}
      </ScrollView>

      {/* Left arrow — hidden on first item */}
      {activeIndex > 0 && (
        <View style={styles.arrowLeftContainer} pointerEvents="box-none">
          <Pressable style={[styles.arrowButton, styles.arrowButtonBack]} onPress={goToPrev} hitSlop={8}>
            <Text style={styles.arrowText}>{"‹"}</Text>
          </Pressable>
        </View>
      )}

      {/* Right arrow — hidden on last item */}
      {activeIndex < items.length - 1 && (
        <View style={styles.arrowRightContainer} pointerEvents="box-none">
          <Pressable style={styles.arrowButton} onPress={goToNext} hitSlop={8}>
            <Text style={styles.arrowText}>{"›"}</Text>
          </Pressable>
        </View>
      )}

      {/* Dot pagination */}
      {items.length > 1 && (
        <View style={styles.dots} pointerEvents="none">
          {items.map((_, index) => (
            <View
              key={index}
              style={index === activeIndex ? styles.dotActive : styles.dotInactive}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const ARROW_SIZE = 32; // raw — fixed circular button diameter
const DOT_SIZE = 6;    // raw — no spacing token at dot scale

const styles = StyleSheet.create((theme) => ({
  clip: {
    width: "100%",
    height: "100%",
    overflow: "hidden",
  },
  fill: {
    width: "100%",
    height: "100%",
  },
  media: {
    width: "100%",
    height: "100%",
  },
  arrowLeftContainer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: theme.spacing.small,
    justifyContent: "center",
    zIndex: 1,
  },
  arrowRightContainer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: theme.spacing.small,
    justifyContent: "center",
    zIndex: 1,
  },
  arrowButton: {
    width: ARROW_SIZE,
    height: ARROW_SIZE,
    borderRadius: ARROW_SIZE / 2,
    // brand.tertiary = #FF5533 in both themes — Yoinks primary orange as button fill.
    backgroundColor: theme.colors.foundation.foreground.brand.tertiary,
    justifyContent: "center",
    alignItems: "center",
  },
  // Back/left arrow reads as "slightly lighter" via opacity rather than a
  // different color token. No single DS token maps to a lighter orange
  // consistently across both light and dark themes.
  arrowButtonBack: {
    opacity: 0.72,
  },
  arrowText: {
    // common.white = #fff — on-primary icon color on the orange button background.
    color: theme.colors.common.white,
    fontSize: 22, // raw — glyph size for ‹ ›
    fontWeight: "600",
    lineHeight: 26,
    textAlign: "center",
    includeFontPadding: false,
  },
  dots: {
    position: "absolute",
    // gigalarge (48px) clears the MomentActions button row (~48px tall from
    // the bottom) so dots sit above the action pills, not behind them.
    bottom: theme.spacing.gigalarge,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: theme.spacing.xxsmall,
    zIndex: 1,
  },
  dotActive: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    // brand.tertiary = #FF5533 — Yoinks primary orange.
    backgroundColor: theme.colors.foundation.foreground.brand.tertiary,
  },
  dotInactive: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    // alpha30 = rgba(255,255,255,0.3) dark / rgba(0,0,0,0.3) light — translucent
    // overlay that stays visible on any photo/video background.
    backgroundColor: theme.colors.foundation.background.alpha30,
  },
}));
