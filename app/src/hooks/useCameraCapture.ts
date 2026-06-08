import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useRef } from "react";
import { Alert } from "react-native";
import type { Camera } from "react-native-vision-camera";
import type { RefObject } from "react";

import { MomentType } from "@/gql/graphql";
import type { MomentCreatorEvent } from "@/machines/momentCreatorMachine";
import { copyTransientMediaToDocuments } from "@/services/momentCaptureStorage";
import type { StagedItem } from "@/types/mediaItem";

type Props = {
  send: (event: MomentCreatorEvent) => void;
  cameraRef: RefObject<Camera | null>;
  flashMode: "off" | "on";
  isRecording: boolean;
  onPhotoStaged: (item: StagedItem) => void;
};

export function useCameraCapture({ send, cameraRef, flashMode, isRecording, onPhotoStaged }: Props) {
  const wasRecordingRef = useRef(false);

  useEffect(() => {
    if (!isRecording) return;
    const started = Date.now();
    const id = setInterval(() => {
      send({ type: "RECORDING_ELAPSED", elapsedMs: Date.now() - started });
    }, 120);
    return () => clearInterval(id);
  }, [isRecording, send]);

  useEffect(() => {
    if (isRecording) {
      wasRecordingRef.current = true;
      return;
    }
    if (wasRecordingRef.current) {
      wasRecordingRef.current = false;
      void cameraRef.current?.stopRecording().catch(() => undefined);
    }
  }, [isRecording, cameraRef]);

  const stopVideoCapture = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    send({ type: "RECORD_STOP" });
    void cameraRef.current?.stopRecording().catch(() => undefined);
  }, [send, cameraRef]);

  const startVideoCapture = useCallback(() => {
    if (__DEV__) {
      Alert.alert(
        "Video not available",
        "Video posting is not available in local dev yet. Please select images only.",
      );
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    send({ type: "RECORD_START" });
    const cam = cameraRef.current;
    if (!cam) return;
    cam.startRecording({
      flash: flashMode === "on" ? "on" : "off",
      onRecordingFinished: async (video) => {
        const raw = video.path;
        const transientUri = raw.startsWith("file://") ? raw : `file://${raw}`;
        try {
          const stableUri = await copyTransientMediaToDocuments(transientUri, MomentType.Video);
          send({
            type: "PREVIEW_READY",
            pendingMedia: { localUri: stableUri, mediaType: MomentType.Video, source: "camera" },
          });
        } catch {
          send({ type: "MEDIA_PERSIST_FAILED", message: "Could not save video." });
        }
      },
      onRecordingError: () => {
        send({ type: "RESET_SESSION" });
      },
    });
  }, [send, cameraRef, flashMode]);

  const takePhoto = useCallback(async () => {
    const cam = cameraRef.current;
    if (!cam) return;
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const photo = await cam.takePhoto({
        flash: flashMode === "on" ? "on" : "off",
        enableShutterSound: false,
      });
      const raw = photo.path;
      const transientUri = raw.startsWith("file://") ? raw : `file://${raw}`;
      try {
        const stableUri = await copyTransientMediaToDocuments(transientUri, MomentType.Photo);
        onPhotoStaged({
          id: `staged-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          localUri: stableUri,
          mediaType: MomentType.Photo,
          source: "camera",
          cropTransform: null,
        });
      } catch {
        send({ type: "MEDIA_PERSIST_FAILED", message: "Could not save photo." });
      }
    } catch {
      send({ type: "MEDIA_PERSIST_FAILED", message: "Could not take photo. Please try again." });
    }
  }, [send, cameraRef, flashMode, onPhotoStaged]);

  return { takePhoto, startVideoCapture, stopVideoCapture };
}
