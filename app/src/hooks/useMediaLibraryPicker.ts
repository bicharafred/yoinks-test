import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useCallback, useEffect } from "react";

import { MomentType } from "@/gql/graphql";
import type { MomentCreatorEvent } from "@/machines/momentCreatorMachine";
import { initStaging } from "@/services/cropMomentStagingStore";
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
    let perm = await ImagePicker.getMediaLibraryPermissionsAsync();
    let access = mapMediaLibraryAccess(perm);
    if (access === "unknown") {
      perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      access = mapMediaLibraryAccess(perm);
    }
    send({ type: "LIBRARY_PERMISSION_UPDATED", access });
    if (access === "granted" || access === "limited") {
      await launchLibraryPicker();
    }
  }, [launchLibraryPicker, send]);

  return { openLibrary };
}
