import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import { useMachine } from "@xstate/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  type AppStateStatus,
  Linking,
  Pressable,
  StyleSheet as RNStyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import {
  Camera,
  useCameraDevice,
  useCameraFormat,
} from "react-native-vision-camera";

import BoltFillIcon from "@/assets/icons/bolt.fill.svg";
import BoltSlashFillIcon from "@/assets/icons/bolt.slash.fill.svg";
import XLargeIcon from "@/assets/icons/x.large.svg";
import {
  MomentCaptureHeader,
  MomentCreateScreenContainer,
} from "@/components/moment-create";
import { momentCreatorMachine } from "@/machines/momentCreatorMachine";
import { initStaging } from "@/services/cropMomentStagingStore";
import type { StagedItem } from "@/types/mediaItem";
import { ASPECT_RATIO, CameraPosition } from "@/utils/constants";
import { useCameraCapture } from "@/hooks/useCameraCapture";
import { useMediaLibraryPicker, useGalleryTrayCapturer } from "@/hooks/useMediaLibraryPicker";
import { CaptureControls } from "@/create-moment/components/CaptureControls";
import { CameraCaptureTray } from "@/create-moment/components/CameraCaptureTray";
import { CreateMomentCameraView } from "@/create-moment/components/CreateMomentCameraView";
import { PermissionStateView } from "@/create-moment/components/PermissionStateView";
import { CreateMomentPermissionEducation } from "@/create-moment/components/CreateMomentPermissionEducation";

export default function CreateMomentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { theme } = useUnistyles();
  const cameraRef = useRef<Camera>(null);
  const cameraReadyRef = useRef(false);
  const [isScreenFocused, setIsScreenFocused] = useState(true);

  const [state, send] = useMachine(momentCreatorMachine, { input: {} });
  const [trayItems, setTrayItems] = useState<StagedItem[]>([]);

  const horizontalInset = theme.spacing.xsmall;
  const viewfinderWidth = width - horizontalInset * 2;
  /** Same ratio as `useCameraFormat` / `ASPECT_RATIO` so the preview matches capture. */
  const viewfinderHeight = viewfinderWidth * ASPECT_RATIO;

  const lens =
    state.context.cameraPosition === CameraPosition.FRONT ? "front" : "back";
  const device = useCameraDevice(lens);
  const format = useCameraFormat(device, [
    { photoAspectRatio: ASPECT_RATIO, photoResolution: "max", photoHdr: true },
    { videoAspectRatio: ASPECT_RATIO, videoResolution: "max" },
  ]);

  const syncNativePermissions = useCallback(() => {
    void import("react-native-vision-camera").then(({ Camera: Cam }) => {
      send({
        type: "PERMISSIONS_UPDATED",
        camera: Cam.getCameraPermissionStatus(),
        microphone: Cam.getMicrophonePermissionStatus(),
      });
    });
  }, [send]);

  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      syncNativePermissions();
      return () => {
        setIsScreenFocused(false);
        cameraReadyRef.current = false;
      };
    }, [syncNativePermissions]),
  );

  const isInPermissionsChecking = state.matches("permissionsChecking");
  useEffect(() => {
    if (isInPermissionsChecking) {
      syncNativePermissions();
    }
  }, [isInPermissionsChecking, syncNativePermissions]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (next === "active") {
        syncNativePermissions();
      }
      if (next === "background" || next === "inactive") {
        send({ type: "APP_BLURRED" });
      }
    });
    return () => sub.remove();
  }, [send, syncNativePermissions]);

  useEffect(() => {
    send({
      type: "DEVICE_CAPABILITIES_UPDATED",
      deviceSupportsFlash: device?.hasFlash ?? false,
    });
  }, [device?.hasFlash, send]);

  const isRecording = state.matches({ capture: "recording" });
  const isLibraryProcessing = state.matches({ capture: "libraryProcessing" });
  const inCapture =
    state.matches({ capture: "live" }) ||
    state.matches({ capture: "recording" }) ||
    state.matches({ capture: "flipCoolingDown" }) ||
    state.matches({ capture: "libraryFlow" }) ||
    state.matches({ capture: "libraryProcessing" });

  const handlePhotoStaged = useCallback((item: StagedItem) => {
    setTrayItems((prev) => {
      if (prev.length >= 10) return prev;
      return [...prev, item];
    });
  }, []);

  const handleTrayCapture = useCallback((newItems: StagedItem[]) => {
    setTrayItems((prev) => [...prev, ...newItems].slice(0, 10));
  }, []);

  const handleTrayNext = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    initStaging(trayItems);
    setTrayItems([]);
    router.push({ pathname: "/(app)/crop-moment" });
  }, [trayItems, router]);

  const { takePhoto, startVideoCapture, stopVideoCapture } = useCameraCapture({
    send,
    cameraRef,
    flashMode: state.context.flashMode,
    isRecording,
    onPhotoStaged: handlePhotoStaged,
  });

  const { openLibrary, confirmAlbumPermission } = useMediaLibraryPicker({ send, router });

  const { captureFromGallery } = useGalleryTrayCapturer({
    onCaptured: handleTrayCapture,
    slotsAvailable: 10 - trayItems.length,
  });

  const handleAlbumPress = useCallback(() => {
    if (trayItems.length > 0) {
      void captureFromGallery();
    } else {
      void openLibrary();
    }
  }, [trayItems.length, captureFromGallery, openLibrary]);

  const handleCameraInitialized = useCallback(() => {
    cameraReadyRef.current = true;
  }, []);

  const handleCameraError = useCallback(() => {
    cameraReadyRef.current = false;
    send({ type: "CAMERA_UNAVAILABLE" });
  }, [send]);

  const onClose = useCallback(() => {
    if (isRecording) {
      Alert.alert(
        "Discard recording?",
        "Stop recording and leave the camera?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Leave",
            style: "destructive",
            onPress: () => {
              stopVideoCapture();
              setTrayItems([]);
              send({ type: "RESET_SESSION" });
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/(app)/(tabs)/feed");
              }
            },
          },
        ],
      );
      return;
    }
    setTrayItems([]);
    send({ type: "RESET_SESSION" });
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(app)/(tabs)/feed");
    }
  }, [isRecording, router, send, stopVideoCapture]);

  const iconColor = theme.colors.foundation.foreground.primary;
  const flashActiveColor =
    theme.colors.foundation.foreground.brand.tertiary ?? iconColor;

  const showVideoChrome = isRecording;
  const showFlashSlot = !showVideoChrome && inCapture;
  const flashEnabled = state.context.deviceSupportsFlash;

  const permissionsGranted =
    state.context.grantedPermissions.camera === "granted" &&
    state.context.grantedPermissions.microphone === "granted";
  /** Pause Vision Camera when the screen loses focus or we're outside capture. */
  const cameraIsActive = Boolean(
    isScreenFocused && inCapture && device != null && permissionsGranted,
  );

  const permissionLoading =
    state.matches("permissionsChecking") || state.matches("permissionsRequesting");
  const showCaptureLoading = permissionLoading || isLibraryProcessing;
  const sessionError = state.context.sessionError;

  const isHandoff = state.matches("handoff");
  const handoffNavigatedRef = useRef(false);

  useEffect(() => {
    if (!isHandoff || handoffNavigatedRef.current) return;
    const pending = state.context.pendingMedia;
    if (!pending) return;
    handoffNavigatedRef.current = true;

    const stagedItem: StagedItem = {
      id: `staged-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      localUri: pending.localUri,
      mediaType: pending.mediaType,
      source: pending.source,
      cropTransform: null,
    };
    initStaging([stagedItem]);
    router.push({ pathname: "/(app)/crop-moment" });
  }, [isHandoff, state.context.pendingMedia, router]);

  useFocusEffect(
    useCallback(() => {
      if (handoffNavigatedRef.current && state.matches("handoff")) {
        handoffNavigatedRef.current = false;
        cameraReadyRef.current = false;
        setTrayItems([]);
        send({ type: "RESET_SESSION" });
      }
    }, [send, state]),
  );

  if (isHandoff) {
    return (
      <PermissionStateView
        variant="handoff"
        insetTop={insets.top}
        onRetry={() => {
          send({ type: "RESET_SESSION" });
          syncNativePermissions();
        }}
        onClose={onClose}
      />
    );
  }

  if (state.matches("failure")) {
    return (
      <PermissionStateView
        variant="failure"
        insetTop={insets.top}
        onRetry={() => {
          send({ type: "RESET_SESSION" });
          syncNativePermissions();
        }}
        onClose={onClose}
      />
    );
  }

  if (state.matches("permissionsNeedRequest") || state.matches("permissionsRequesting")) {
    return (
      <CreateMomentPermissionEducation
        variant="camera-request"
        insetTop={insets.top}
        insetBottom={insets.bottom}
        onPrimaryAction={() => send({ type: "REQUEST_CAMERA_MIC_PERMISSION" })}
        onClose={onClose}
      />
    );
  }

  if (state.matches("permissionsDenied")) {
    return (
      <CreateMomentPermissionEducation
        variant="camera-denied"
        insetTop={insets.top}
        insetBottom={insets.bottom}
        onPrimaryAction={() => { void Linking.openSettings(); }}
        onClose={onClose}
      />
    );
  }

  if (state.context.albumPermissionScreen !== "hidden") {
    const isAlbumRequest = state.context.albumPermissionScreen === "requesting";
    return (
      <CreateMomentPermissionEducation
        variant={isAlbumRequest ? "album-request" : "album-denied"}
        insetTop={insets.top}
        insetBottom={insets.bottom}
        onPrimaryAction={isAlbumRequest
          ? () => { void confirmAlbumPermission(); }
          : () => { void Linking.openSettings(); }}
        onClose={() => send({ type: "HIDE_ALBUM_PERMISSION_SCREEN" })}
      />
    );
  }

  return (
    <MomentCreateScreenContainer>
      <View style={[styles.flex, { paddingTop: insets.top }]}>
        <MomentCaptureHeader
          onClose={onClose}
          leadingIcon={
            <XLargeIcon width={24} height={24} color={iconColor} />
          }
          trailingSlot={
            showFlashSlot ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Toggle flash"
                hitSlop={12}
                disabled={!flashEnabled}
                onPress={() => {
                  void Haptics.selectionAsync();
                  send({ type: "TOGGLE_FLASH" });
                }}
                style={[
                  styles.headerPill,
                  !flashEnabled && styles.headerPillDisabled,
                ]}
              >
                {state.context.flashMode === "on" ? (
                  <BoltFillIcon width={24} height={24} color={flashActiveColor} />
                ) : (
                  <BoltSlashFillIcon width={24} height={24} color={iconColor} />
                )}
              </Pressable>
            ) : (
              <View style={styles.headerTrailingPlaceholder} />
            )
          }
        />

        <View style={styles.body}>
          {showCaptureLoading ? (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator />
            </View>
          ) : null}

          {sessionError && inCapture ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText} numberOfLines={2}>
                {sessionError.message ?? sessionError.code}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Dismiss error"
                hitSlop={8}
                onPress={() => send({ type: "DISMISS_ERROR" })}
                style={styles.errorDismiss}
              >
                <Text style={styles.errorDismissLabel}>Dismiss</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.captureStack}>
            <CreateMomentCameraView
              width={viewfinderWidth}
              height={viewfinderHeight}
              showTimer={showVideoChrome}
              recordingElapsedMs={state.context.recordingElapsedMs}
              device={device}
              permissionsGranted={permissionsGranted}
              cameraRef={cameraRef}
              cameraIsActive={cameraIsActive}
              format={format}
              onError={handleCameraError}
              onInitialized={handleCameraInitialized}
            />
            <View style={styles.captureSpacer} />
          </View>

          {inCapture && trayItems.length > 0 ? (
            <CameraCaptureTray
              items={trayItems}
              onNext={handleTrayNext}
            />
          ) : null}

          {inCapture ? (
            <CaptureControls
              isRecording={isRecording}
              hasTrayItems={trayItems.length > 0}
              iconColor={iconColor}
              onAlbumPress={handleAlbumPress}
              onFlipPress={() => {
                void Haptics.selectionAsync();
                send({
                  type: "SET_CAMERA_POSITION",
                  position:
                    state.context.cameraPosition === CameraPosition.FRONT
                      ? CameraPosition.BACK
                      : CameraPosition.FRONT,
                });
              }}
              onShutterPress={() => {
                if (trayItems.length >= 10) return;
                send({ type: "SHUTTER_TAP" });
                if (state.matches({ capture: "live" }) && cameraReadyRef.current) {
                  void takePhoto();
                }
              }}
              onShutterLongPress={startVideoCapture}
              onShutterPressOut={() => {
                if (isRecording && !state.context.recordingLocked) {
                  stopVideoCapture();
                }
              }}
            />
          ) : null}
        </View>
      </View>
      <View style={{ height: insets.bottom }} />
    </MomentCreateScreenContainer>
  );
}

const styles = StyleSheet.create((theme) => ({
  flex: {
    flex: 1,
  },
  body: {
    flex: 1,
    width: "100%",
  },
  captureStack: {
    flex: 1,
    width: "100%",
    alignItems: "center",
  },
  captureSpacer: {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: theme.spacing.xxxlarge,
    width: "100%",
  },
  loadingOverlay: {
    ...RNStyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  errorBanner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.small,
    paddingHorizontal: theme.spacing.normal,
    paddingVertical: theme.spacing.small,
    backgroundColor: theme.colors.foundation.error.background.secondary,
    zIndex: 3,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.foundation.error.foreground.primary,
  },
  errorDismiss: {
    paddingVertical: theme.spacing.xxsmall,
    paddingHorizontal: theme.spacing.xsmall,
  },
  errorDismissLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.foundation.error.foreground.secondary,
  },
  headerPill: {
    padding: theme.spacing.xsmall,
    borderRadius: 80,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.foundation.background.secondary,
  },
  headerPillDisabled: {
    opacity: 0.35,
  },
  headerTrailingPlaceholder: {
    width: 40,
    height: 40,
  },
}));
