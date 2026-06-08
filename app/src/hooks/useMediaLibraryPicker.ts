import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useCallback, useEffect } from "react";
import { Alert, Linking } from "react-native";

import { MomentType } from "@/gql/graphql";
import type { MomentCreatorEvent } from "@/machines/momentCreatorMachine";
import {
  initStaging,
  appendStagingItems,
  getStagedItemCount,
} from "@/services/cropMomentStagingStore";
import { mapMediaLibraryAccess } from "@/services/momentCapturePermissions";
import { copyTransientMediaToDocuments } from "@/services/momentCaptureStorage";
import type { StagedItem } from "@/types/mediaItem";

type Props = {
  send: (event: MomentCreatorEvent) => void;
  router: ReturnType<typeof useRouter>;
};

export function useMediaLibraryPicker({ send, router }: Props) {
  useEffect(() => {
    void ImagePicker.getMediaLibraryPermissionsAsync().then((perm) => {
      send({
        type: "LIBRARY_PERMISSION_UPDATED",
        access: mapMediaLibraryAccess(perm),
      });
    });
  }, [send]);

  const launchLibraryPicker = useCallback(async () => {
    send({ type: "OPEN_LIBRARY_PICKER_REQUESTED" });
    try {
      const videoEnabled = process.env.EXPO_PUBLIC_VIDEO_ENABLED === "true";
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: videoEnabled
          ? ImagePicker.MediaTypeOptions.All
          : ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 10,
        videoMaxDuration: 6,
      });

      if (result.canceled || result.assets.length === 0) {
        send({ type: "RESET_SESSION" });
        return;
      }

      const stableItems = await Promise.all(
        result.assets.map(async (asset) => {
          const isVideo = asset.type === "video";
          const mediaType = isVideo ? MomentType.Video : MomentType.Photo;
          const stableUri = await copyTransientMediaToDocuments(asset.uri, mediaType);
          const item: StagedItem = {
            id: `staged-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            localUri: stableUri,
            mediaType,
            source: "library",
            cropTransform: null,
          };
          return item;
        }),
      );

      initStaging(stableItems);
      send({ type: "RESET_SESSION" });
      router.push({ pathname: "/(app)/crop-moment" });
    } catch {
      send({ type: "RESET_SESSION" });
    }
  }, [send, router]);

  const openLibrary = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const perm = await ImagePicker.getMediaLibraryPermissionsAsync();
    const access = mapMediaLibraryAccess(perm);

    if (access === "unknown") {
      // Show custom education screen — user taps Allow in that screen to trigger native prompt.
      send({ type: "SHOW_ALBUM_PERMISSION_SCREEN", screen: "requesting" });
      return;
    }

    send({ type: "LIBRARY_PERMISSION_UPDATED", access });

    if (access === "granted" || access === "limited") {
      await launchLibraryPicker();
      return;
    }

    if (access === "denied") {
      // Denied once but canAskAgain — show request screen so user can grant in-app.
      send({ type: "SHOW_ALBUM_PERMISSION_SCREEN", screen: "requesting" });
      return;
    }
    // Blocked (canAskAgain=false) — must redirect to Settings.
    send({ type: "SHOW_ALBUM_PERMISSION_SCREEN", screen: "denied" });
  }, [launchLibraryPicker, send]);

  const confirmAlbumPermission = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const access = mapMediaLibraryAccess(perm);
    send({ type: "LIBRARY_PERMISSION_UPDATED", access });
    if (access === "granted" || access === "limited") {
      send({ type: "HIDE_ALBUM_PERMISSION_SCREEN" });
      await launchLibraryPicker();
    } else if (access === "denied") {
      // Still canAskAgain — show request screen again so user can try once more.
      send({ type: "SHOW_ALBUM_PERMISSION_SCREEN", screen: "requesting" });
    } else {
      // Blocked — canAskAgain=false; must go to Settings.
      send({ type: "SHOW_ALBUM_PERMISSION_SCREEN", screen: "denied" });
    }
  }, [launchLibraryPicker, send]);

  return { openLibrary, confirmAlbumPermission };
}

type GalleryTrayCapturerProps = {
  onCaptured: (items: StagedItem[]) => void;
  slotsAvailable: number;
};

export function useGalleryTrayCapturer({ onCaptured, slotsAvailable }: GalleryTrayCapturerProps) {
  const captureFromGallery = useCallback(async () => {
    if (slotsAvailable <= 0) return;

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    let perm = await ImagePicker.getMediaLibraryPermissionsAsync();
    let access = mapMediaLibraryAccess(perm);
    if (access === "unknown" || access === "denied") {
      // "unknown" = never asked; "denied" = denied once but canAskAgain=true on Android.
      perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      access = mapMediaLibraryAccess(perm);
    }

    if (access !== "granted" && access !== "limited") {
      if (access === "blocked") {
        Alert.alert(
          "Photo Library Access Required",
          "Allow Yoinks to access your photos and videos in Settings to choose media for your moments.",
          [
            { text: "Not Now", style: "cancel" },
            { text: "Open Settings", onPress: () => { void Linking.openSettings(); } },
          ],
        );
      }
      return;
    }

    const videoEnabled = process.env.EXPO_PUBLIC_VIDEO_ENABLED === "true";
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: videoEnabled
        ? ImagePicker.MediaTypeOptions.All
        : ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: slotsAvailable,
      videoMaxDuration: 6,
    });

    if (result.canceled || result.assets.length === 0) return;

    try {
      const newItems = await Promise.all(
        result.assets.map(async (asset) => {
          const isVideo = asset.type === "video";
          const mediaType = isVideo ? MomentType.Video : MomentType.Photo;
          const stableUri = await copyTransientMediaToDocuments(asset.uri, mediaType);
          const item: StagedItem = {
            id: `staged-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            localUri: stableUri,
            mediaType,
            source: "library",
            cropTransform: null,
          };
          return item;
        }),
      );
      onCaptured(newItems);
    } catch {
      // File copy failed — silently bail; tray is untouched
    }
  }, [onCaptured, slotsAvailable]);

  return { captureFromGallery };
}

type AppenderProps = {
  onAppended: (firstNewIndex: number) => void;
};

export function useMediaLibraryAppender({ onAppended }: AppenderProps) {
  const appendFromLibrary = useCallback(async () => {
    const currentCount = getStagedItemCount();
    if (currentCount >= 10) return;

    let perm = await ImagePicker.getMediaLibraryPermissionsAsync();
    let access = mapMediaLibraryAccess(perm);
    if (access === "unknown" || access === "denied") {
      // "unknown" = never asked; "denied" = denied once but canAskAgain=true on Android.
      perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      access = mapMediaLibraryAccess(perm);
    }

    if (access !== "granted" && access !== "limited") {
      if (access === "blocked") {
        Alert.alert(
          "Photo Library Access Required",
          "Allow Yoinks to access your photos and videos in Settings to choose media for your moments.",
          [
            { text: "Not Now", style: "cancel" },
            { text: "Open Settings", onPress: () => { void Linking.openSettings(); } },
          ],
        );
      }
      return;
    }

    const selectionLimit = 10 - getStagedItemCount();
    const videoEnabled = process.env.EXPO_PUBLIC_VIDEO_ENABLED === "true";
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: videoEnabled
        ? ImagePicker.MediaTypeOptions.All
        : ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit,
      videoMaxDuration: 6,
    });

    if (result.canceled || result.assets.length === 0) return;

    const firstNewIndex = getStagedItemCount();

    try {
      const newItems = await Promise.all(
        result.assets.map(async (asset) => {
          const isVideo = asset.type === "video";
          const mediaType = isVideo ? MomentType.Video : MomentType.Photo;
          const stableUri = await copyTransientMediaToDocuments(asset.uri, mediaType);
          const item: StagedItem = {
            id: `staged-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            localUri: stableUri,
            mediaType,
            source: "library",
            cropTransform: null,
          };
          return item;
        }),
      );

      appendStagingItems(newItems);
      onAppended(firstNewIndex);
    } catch {
      // File copy failed — silently bail; staging is untouched
    }
  }, [onAppended]);

  return { appendFromLibrary };
}
