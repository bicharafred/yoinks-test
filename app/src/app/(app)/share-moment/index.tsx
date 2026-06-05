import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useMachine } from "@xstate/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  type ViewStyle,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import ChevronLeftIcon from "@/assets/icons/chevron.left.svg";
import { AppHeader } from "@/components/navigation/app-header";
import { MomentCarousel } from "@/components/moment-carousel";
import { MomentType } from "@/gql/graphql";
import { shareMomentMachine } from "@/machines/shareMomentMachine";
import { getStagedItems, clearStaging } from "@/services/cropMomentStagingStore";
import type { MediaItem } from "@/types/mediaItem";

// Maximum characters allowed in the description field.
// 2200 matches Instagram's caption limit for MVP parity.
const MAX_DESCRIPTION_LENGTH = 2200;

export default function ShareMomentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();

  // Media preview height: ~52% of window height gives roughly 70% of the space
  // the image would occupy when flex: 1 fills all remaining screen real-estate.
  const mediaHeight = windowHeight * 0.52;
  const hasNavigatedRef = useRef(false);

  // Local state for the optional caption the user types before posting.
  const [description, setDescription] = useState("");

  // Read from staging store — this is the source of truth after multi-media crop.
  const stagedItems = getStagedItems();
  const hasStagedItems = stagedItems.length > 0;

  // Derive machine input from staging store (multi-media) or fall back to empty
  // (should not happen in normal flow, but avoids hard crashes).
  const primaryItem = stagedItems[0];
  const localUri = primaryItem?.localUri ?? "";
  const mediaType: MomentType = primaryItem?.mediaType ?? MomentType.Photo;
  const source: "camera" | "library" = primaryItem?.source ?? "camera";
  const isMultiItem = stagedItems.length > 1;

  // For single-item moments, derive crop transform from the staged item.
  const singleCropTransform = (!isMultiItem && primaryItem?.cropTransform) ? primaryItem.cropTransform : null;

  const [state, send] = useMachine(shareMomentMachine, {
    input: {
      localUri,
      mediaType,
      source,
      cropTransform: singleCropTransform,
      mediaItems: isMultiItem ? stagedItems : null,
    },
  });

  const isVideo = mediaType === MomentType.Video;

  const player = useVideoPlayer(
    (!isMultiItem && isVideo) ? localUri : null,
    (p) => {
      p.loop = true;
      p.play();
    },
  );

  const navigateToFeed = useCallback(() => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    clearStaging();

    if (router.canDismiss()) {
      router.dismissAll();
    }
    router.replace("/(app)/(tabs)/feed");
  }, [router]);

  const navigateBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    }
  }, [router]);

  useEffect(() => {
    if (state.matches("queued")) {
      navigateToFeed();
    }
    if (state.matches("dismissed")) {
      navigateBack();
    }
  }, [state.value, navigateToFeed, navigateBack]);

  const handleShare = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Trim whitespace; passing null tells the pipeline no description was provided.
    send({ type: "SHARE", description: description.trim() || null });
  }, [send, description]);

  const handleGoBack = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    send({ type: "GO_BACK" });
  }, [send]);

  const isEnqueuing = state.matches("enqueuing");
  const isPreview = state.matches("preview");
  const error = state.context.error;

  // For single-item: apply crop transform as a visual style.
  const cropStyle: ViewStyle | undefined = singleCropTransform
    ? {
        transform: [
          { scale: singleCropTransform.scale },
          { translateX: singleCropTransform.translateX },
          { translateY: singleCropTransform.translateY },
        ],
      }
    : undefined;

  // Build MediaItem[] for carousel preview from staged items.
  const carouselItems: MediaItem[] = isMultiItem
    ? stagedItems.map((item) => ({
        id: item.id,
        mediaUrl: item.localUri,
        mediaType: item.mediaType,
        thumbnailUrl: null,
        cropTransform: item.cropTransform,
      }))
    : [];

  // Card media width is full card width (window minus 2× horizontal margins).
  const cardMediaWidth = windowWidth - theme.spacing.normal * 2;

  return (
    <View style={styles.root}>
      {/* Header: centered "Review" title with back chevron on the left. */}
      <AppHeader
        title="Review"
        leftAction={
          <Pressable
            onPress={handleGoBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ChevronLeftIcon
              width={28}
              height={28}
              color={theme.colors.foundation.foreground.primary}
            />
          </Pressable>
        }
      />

      {/*
       * KeyboardAvoidingView wraps everything below the header so the caption
       * input and the Share Moment button lift above the software keyboard.
       */}
      {/*
       * "padding" on both platforms: KAV adds paddingBottom = keyboard height,
       * compressing the spacer so the footer stays pinned above the keyboard.
       * The ScrollView lets the card scroll if the media + caption exceed the
       * remaining space when the keyboard is open.
       */}
      <KeyboardAvoidingView
        behavior="padding"
        style={styles.content}
      >
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText} numberOfLines={2}>
              {error}
            </Text>
          </View>
        ) : null}

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/*
           * Unified card: image/carousel + caption live inside one rounded gray surface.
           * overflow:hidden clips the media to the card's top rounded corners.
           */}
          <View style={styles.card}>
            {/* Media occupies the top portion of the card at a fixed height. */}
            <View style={[styles.mediaWrapper, { height: mediaHeight }]}>
              {isMultiItem ? (
                <MomentCarousel
                  items={carouselItems}
                  width={cardMediaWidth}
                  height={mediaHeight}
                  isVisibleMedia
                  isFeedScreenActive
                  isBlurred={false}
                  isMuted={false}
                />
              ) : (
                /*
                 * Single-item: cropClip prevents the scaled/shifted media from
                 * bleeding outside the card's media area.
                 */
                <View style={styles.cropClip}>
                  <View style={[styles.cropInner, cropStyle]}>
                    {isVideo ? (
                      <VideoView
                        player={player}
                        style={styles.media}
                        contentFit="cover"
                        nativeControls={false}
                      />
                    ) : (
                      <Image
                        source={{ uri: localUri }}
                        style={styles.media}
                        contentFit="cover"
                        transition={200}
                      />
                    )}
                  </View>
                </View>
              )}
            </View>

            {/* Caption sits in the gray lower section of the same card. */}
            <TextInput
              style={styles.captionInput}
              placeholder="Click here to add a caption…"
              placeholderTextColor={theme.colors.foundation.foreground.tertiary}
              value={description}
              onChangeText={(text) =>
                setDescription(text.slice(0, MAX_DESCRIPTION_LENGTH))
              }
              maxLength={MAX_DESCRIPTION_LENGTH}
              multiline
              textAlignVertical="top"
              accessibilityLabel="Moment caption"
              accessibilityHint="Optional caption that will appear on your moment"
            />
          </View>

          {/* Flex spacer inside ScrollView: pushes footer down when keyboard is closed. */}
          <View style={styles.spacer} />
        </ScrollView>

        {/* Footer lives outside the ScrollView so Share Moment stays pinned above the keyboard. */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + theme.spacing.small }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share moment"
            disabled={!isPreview}
            onPress={handleShare}
            style={({ pressed }) => [
              styles.shareButton,
              pressed && styles.shareButtonPressed,
              !isPreview && styles.shareButtonDisabled,
            ]}
          >
            {isEnqueuing ? (
              <ActivityIndicator color={theme.colors.common.white} />
            ) : (
              <Text style={styles.shareLabel}>Share Moment</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  // Light-background screen container — matches AppScreenContainer background.
  root: {
    flex: 1,
    backgroundColor: theme.colors.foundation.background.primary,
  },
  // Content area below the header — fills remaining space.
  content: {
    flex: 1,
  },
  // ScrollView fills the space between the error banner (if any) and the footer.
  scroll: {
    flex: 1,
  },
  // flexGrow: 1 lets the spacer expand to push the card up when keyboard is closed.
  scrollContent: {
    flexGrow: 1,
  },
  // Unified card: wraps both the media and the caption input.
  // background.secondary (gray[50] = #f0f1f2) is the muted surface token.
  // spacing.xxlarge (28px) is the largest structural radius in the design system.
  // overflow:hidden clips the image to the card's top corners.
  card: {
    marginHorizontal: theme.spacing.normal,
    marginTop: theme.spacing.small,
    borderRadius: theme.spacing.xxlarge,
    overflow: "hidden",
    backgroundColor: theme.colors.foundation.background.secondary,
  },
  // Inner wrapper that constrains the image height; the card clips its corners.
  mediaWrapper: {
    width: "100%",
    // height applied inline from windowHeight
  },
  // Clips crop transforms to the media area so shifted/zoomed content
  // does not bleed into the caption section below.
  cropClip: {
    width: "100%",
    height: "100%",
    overflow: "hidden",
  },
  cropInner: {
    width: "100%",
    height: "100%",
  },
  media: {
    width: "100%",
    height: "100%",
  },
  // Caption sits below the image inside the gray card — transparent so the
  // card background shows through as the caption area surface.
  captionInput: {
    paddingHorizontal: theme.spacing.normal,
    paddingVertical: theme.spacing.large,
    color: theme.colors.foundation.foreground.primary,
    fontSize: 15, // raw — body text, same as other inputs in the app
    backgroundColor: "transparent",
    maxHeight: 160, // raw — ~4 lines at 20px lineHeight + vertical padding
  },
  spacer: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: theme.spacing.normal,
    paddingTop: theme.spacing.small,
  },
  // Pill-shaped button: borderRadius is half the height (52/2 = 26) for a
  // true pill shape. Dark background with white label — matches reference.
  shareButton: {
    width: "100%",
    height: 52, // raw — standard action button height used across the app
    borderRadius: 26, // raw — pill: exactly half of height (52 / 2)
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.foundation.foreground.primary,
  },
  shareButtonPressed: {
    opacity: 0.85,
  },
  shareButtonDisabled: {
    opacity: 0.5,
  },
  shareLabel: {
    fontSize: 17, // raw — same as other primary action labels in the app
    fontWeight: "700",
    // background.secondary instead of common.white: foreground.primary is white
    // in dark mode, so common.white would be invisible. background.secondary
    // (#f0f1f2 light / #16181A dark) stays legible on the inverted button bg.
    color: theme.colors.foundation.background.secondary,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.normal,
    paddingVertical: theme.spacing.small,
    backgroundColor: theme.colors.foundation.error.background.secondary,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 14, // raw
    color: theme.colors.foundation.error.foreground.primary,
    textAlign: "center",
  },
}));
