import {
  MomentCaptureTimer,
  MomentViewfinderFrame,
  MomentViewfinderSkeleton,
} from "@/components/moment-create";
import type { RefObject } from "react";
import { StyleSheet as RNStyleSheet } from "react-native";
import { Camera, useCameraFormat } from "react-native-vision-camera";
import type { CameraDevice, CameraRuntimeError } from "react-native-vision-camera";

type Props = {
  width: number;
  height: number;
  showTimer: boolean;
  recordingElapsedMs: number;
  device: CameraDevice | undefined;
  permissionsGranted: boolean;
  cameraRef: RefObject<Camera | null>;
  cameraIsActive: boolean;
  format: ReturnType<typeof useCameraFormat>;
  onError: (error: CameraRuntimeError) => void;
  onInitialized: () => void;
};

export function CreateMomentCameraView({
  width,
  height,
  showTimer,
  recordingElapsedMs,
  device,
  permissionsGranted,
  cameraRef,
  cameraIsActive,
  format,
  onError,
  onInitialized,
}: Props) {
  return (
    <MomentViewfinderFrame
      width={width}
      height={height}
      topOverlay={showTimer ? <MomentCaptureTimer elapsedMs={recordingElapsedMs} /> : null}
    >
      {!device || !permissionsGranted ? (
        <MomentViewfinderSkeleton />
      ) : (
        <Camera
          ref={cameraRef}
          style={RNStyleSheet.absoluteFill}
          device={device}
          isActive={cameraIsActive}
          format={format}
          photo
          video
          audio
          enableZoomGesture
          photoHdr={format?.supportsPhotoHdr}
          onError={onError}
          onInitialized={onInitialized}
        />
      )}
    </MomentViewfinderFrame>
  );
}
