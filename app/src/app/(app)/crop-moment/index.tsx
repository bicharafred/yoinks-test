import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import ChevronLeftIcon from "@/assets/icons/chevron.left.svg";
import { AppHeader } from "@/components/navigation/app-header";
import {
  MediaCropper,
  type MediaCropperRef,
} from "@/components/moment-create/media-cropper";
import { MultiMediaThumbnailStrip } from "@/components/moment-create/multi-media-thumbnail-strip";
import { WalletPrimaryButton } from "@/components/wallet/wallet-primary-button";
import {
  getStagedItems,
  getCurrentIndex,
  setCurrentIndex,
  setCropForIndex,
} from "@/services/cropMomentStagingStore";

export default function CropMomentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const cropperRef = useRef<MediaCropperRef>(null);

  // Derive current item from staging store on every render.
  // `itemVersion` triggers a re-render when the user navigates between items.
  const [itemVersion, setItemVersion] = useState(0);

  const items = getStagedItems();
  const currentIndex = getCurrentIndex();
  const currentItem = items[currentIndex];
  const isMultiItem = items.length > 1;
  const isLastItem = currentIndex === items.length - 1;

  const saveCropForCurrent = useCallback(() => {
    const transform = cropperRef.current?.getCropTransform() ?? null;
    setCropForIndex(currentIndex, transform);
  }, [currentIndex]);

  const handleBack = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentIndex > 0) {
      saveCropForCurrent();
      setCurrentIndex(currentIndex - 1);
      setItemVersion((v) => v + 1);
    } else {
      if (router.canGoBack()) {
        router.back();
      }
    }
  }, [currentIndex, router, saveCropForCurrent]);

  const handleReset = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    cropperRef.current?.reset();
  }, []);

  const handleSelectIndex = useCallback(
    (index: number) => {
      void Haptics.selectionAsync();
      saveCropForCurrent();
      setCurrentIndex(index);
      setItemVersion((v) => v + 1);
    },
    [saveCropForCurrent],
  );

  const handleContinue = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    saveCropForCurrent();

    if (!isLastItem) {
      setCurrentIndex(currentIndex + 1);
      setItemVersion((v) => v + 1);
      return;
    }

    // All items adjusted — proceed to share screen.
    router.push({ pathname: "/(app)/share-moment" });
  }, [isLastItem, currentIndex, router, saveCropForCurrent]);

  if (!currentItem) {
    // Staging store is empty — should not happen in normal flow.
    if (router.canGoBack()) {
      router.back();
    }
    return null;
  }

  return (
    <View style={styles.root}>
      <AppHeader
        title="Adjust"
        leftAction={
          <Pressable
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel={currentIndex > 0 ? "Previous item" : "Go back"}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ChevronLeftIcon
              width={28}
              height={28}
              color={theme.colors.foundation.foreground.primary}
            />
          </Pressable>
        }
        rightAction={
          <Pressable
            onPress={handleReset}
            accessibilityRole="button"
            accessibilityLabel="Reset crop adjustment"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.resetLabel}>Reset</Text>
          </Pressable>
        }
      />

      {isMultiItem ? (
        <MultiMediaThumbnailStrip
          items={items}
          currentIndex={currentIndex}
          onSelectIndex={handleSelectIndex}
        />
      ) : null}

      <View style={styles.content}>
        {/*
         * key forces MediaCropper to remount when the user switches items,
         * so shared values are re-initialized from initialCropTransform.
         */}
        <MediaCropper
          key={`${currentItem.id}-${itemVersion}`}
          ref={cropperRef}
          localUri={currentItem.localUri}
          mediaType={currentItem.mediaType}
          initialCropTransform={currentItem.cropTransform}
        />
      </View>

      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + theme.spacing.small },
        ]}
      >
        <WalletPrimaryButton
          label={isLastItem ? "Continue" : "Next"}
          onPress={handleContinue}
          accessibilityHint={
            isLastItem
              ? "Proceed to review and share your moment"
              : "Adjust the next item"
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: {
    flex: 1,
    backgroundColor: theme.colors.foundation.background.primary,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.normal,
  },
  resetLabel: {
    fontSize: 15, // raw — matches other header action labels in the app
    fontWeight: "600",
    color: theme.colors.foundation.foreground.brand.tertiary,
  },
  footer: {
    paddingHorizontal: theme.spacing.normal,
    paddingTop: theme.spacing.small,
  },
}));
