import type { CameraPermissionStatus } from "react-native-vision-camera";
import type { ActorRefFrom } from "xstate";
import { assign, fromPromise, setup } from "xstate";

import { MomentType } from "@/gql/graphql";
import { CameraPosition } from "@/utils/constants";

/** Vision Camera v4 `Camera.getCameraPermissionStatus()` values. */
export type VisionCameraPermissionStatus = CameraPermissionStatus;

export type MomentCreatorLibraryAccess =
  | "unknown"
  | "granted"
  | "limited"
  | "denied"
  | "blocked";

export type MomentCreatorPendingMedia = {
  localUri: string;
  mediaType: MomentType;
  source: "camera" | "library";
};

export type MomentCreatorInput = {
  onExit?: () => void;
  onMediaReady?: (payload: MomentCreatorPendingMedia) => void;
};

export type MomentCreatorEvent =
  | { type: "REQUEST_CAMERA_MIC_PERMISSION" }
  | {
      type: "PERMISSIONS_UPDATED";
      camera: VisionCameraPermissionStatus;
      microphone: VisionCameraPermissionStatus;
    }
  | { type: "LIBRARY_PERMISSION_UPDATED"; access: MomentCreatorLibraryAccess }
  | { type: "OPEN_LIBRARY_PICKER_REQUESTED" }
  | { type: "SET_CAMERA_POSITION"; position: CameraPosition }
  | { type: "TOGGLE_FLASH" }
  | { type: "SHUTTER_TAP" }
  | { type: "RECORD_START" }
  | { type: "RECORD_STOP" }
  | { type: "RECORD_LOCK" }
  | { type: "RECORD_UNLOCK" }
  | {
      type: "LIBRARY_ASSET_SELECTED";
      localUri: string;
      mediaType: MomentType;
    }
  | { type: "PREVIEW_READY"; pendingMedia: MomentCreatorPendingMedia }
  | { type: "RESET_SESSION" }
  | {
      type: "SHOW_ALBUM_PERMISSION_SCREEN";
      screen: "requesting" | "denied";
    }
  | { type: "HIDE_ALBUM_PERMISSION_SCREEN" }
  | { type: "DISMISS_ERROR" }
  | { type: "APP_BLURRED" }
  | { type: "FOCUS_LOST" }
  | { type: "CAMERA_UNAVAILABLE" }
  | { type: "RECORDING_ELAPSED"; elapsedMs: number }
  | { type: "DEVICE_CAPABILITIES_UPDATED"; deviceSupportsFlash: boolean }
  | { type: "MEDIA_PERSIST_FAILED"; message?: string }
  | { type: "VIDEO_TRIM_COMPLETED"; localUri: string };

const MAX_VIDEO_DURATION_MS = 6000 as const;
const FLIP_COOLDOWN_MS = 300 as const;

function bothCapturePermissionsAuthorized(
  camera: VisionCameraPermissionStatus,
  microphone: VisionCameraPermissionStatus,
): boolean {
  return camera === "granted" && microphone === "granted";
}

function capturePermissionsBlocked(
  camera: VisionCameraPermissionStatus,
  microphone: VisionCameraPermissionStatus,
): boolean {
  return (
    camera === "denied" ||
    camera === "restricted" ||
    microphone === "denied" ||
    microphone === "restricted"
  );
}

function canRequestCapturePermissions(
  camera: VisionCameraPermissionStatus,
  microphone: VisionCameraPermissionStatus,
): boolean {
  return camera === "not-determined" || microphone === "not-determined";
}

function libraryAllowsPicker(access: MomentCreatorLibraryAccess): boolean {
  return access === "granted" || access === "limited";
}

export const momentCreatorMachine = setup({
  types: {
    context: {} as {
      cameraPosition: CameraPosition;
      flashMode: "off" | "on";
      grantedPermissions: {
        camera: VisionCameraPermissionStatus;
        microphone: VisionCameraPermissionStatus;
      };
      libraryAccess: MomentCreatorLibraryAccess;
      captureKind: "idle" | "photo" | "video";
      isRecording: boolean;
      recordingLocked: boolean;
      recordingElapsedMs: number;
      maxVideoDurationMs: number;
      pendingMedia: MomentCreatorPendingMedia | null;
      sessionError: { code: string; message?: string } | null;
      deviceSupportsFlash: boolean;
      onMediaReady?: MomentCreatorInput["onMediaReady"];
      onExit?: MomentCreatorInput["onExit"];
      libraryStaging: { uri: string; mediaType: MomentType } | null;
      albumPermissionScreen: "hidden" | "requesting" | "denied";
    },
    events: {} as MomentCreatorEvent,
    input: {} as MomentCreatorInput,
  },
  actors: {
    requestCameraMic: fromPromise(async () => {
      // Dynamic import keeps the native module from loading until permission flow runs.
      const { Camera } = await import("react-native-vision-camera");
      await Camera.requestCameraPermission();
      await Camera.requestMicrophonePermission();
      return {
        camera: Camera.getCameraPermissionStatus(),
        microphone: Camera.getMicrophonePermissionStatus(),
      };
    }),
    persistCaptureMedia: fromPromise(
      async ({
        input,
      }: {
        input: {
          transientUri: string;
          mediaType: MomentType;
          source: "camera" | "library";
        };
      }) => {
        const { copyTransientMediaToDocuments } = await import(
          "@/services/momentCaptureStorage"
        );
        const localUri = await copyTransientMediaToDocuments(
          input.transientUri,
          input.mediaType,
        );
        return {
          pendingMedia: {
            localUri,
            mediaType: input.mediaType,
            source: input.source,
          } satisfies MomentCreatorPendingMedia,
        };
      },
    ),
  },
  guards: {
    canFlip: ({ context }) => !context.isRecording,
    canToggleFlash: ({ context }) => context.deviceSupportsFlash,
    canOpenLibrary: ({ context }) => libraryAllowsPicker(context.libraryAccess),
    shouldEnterCapture: ({ event }) => {
      if (event.type !== "PERMISSIONS_UPDATED") {
        return false;
      }
      return bothCapturePermissionsAuthorized(event.camera, event.microphone);
    },
    shouldNeedPermissionRequest: ({ event }) => {
      if (event.type !== "PERMISSIONS_UPDATED") {
        return false;
      }
      return (
        !bothCapturePermissionsAuthorized(event.camera, event.microphone) &&
        canRequestCapturePermissions(event.camera, event.microphone)
      );
    },
    shouldDenyCapture: ({ event }) => {
      if (event.type !== "PERMISSIONS_UPDATED") {
        return false;
      }
      return (
        !bothCapturePermissionsAuthorized(event.camera, event.microphone) &&
        capturePermissionsBlocked(event.camera, event.microphone)
      );
    },
    canTakePhoto: ({ context }) =>
      context.captureKind !== "video" && !context.isRecording,
    canStartRecording: ({ context }) => !context.isRecording,
  },
  actions: {
    assignPermissionsFromEvent: assign(({ event }) => {
      if (event.type !== "PERMISSIONS_UPDATED") {
        return {};
      }
      return {
        grantedPermissions: {
          camera: event.camera,
          microphone: event.microphone,
        },
      };
    }),
    assignLibraryAccess: assign(({ event }) => {
      if (event.type !== "LIBRARY_PERMISSION_UPDATED") {
        return {};
      }
      return { libraryAccess: event.access };
    }),
    assignCameraPosition: assign(({ event }) => {
      if (event.type !== "SET_CAMERA_POSITION") {
        return {};
      }
      return { cameraPosition: event.position, flashMode: "off" as const };
    }),
    toggleFlash: assign(({ context }) => ({
      flashMode: (context.flashMode === "off" ? "on" : "off") as "off" | "on",
    })),
    assignDeviceCapabilities: assign(({ event, context }) => {
      if (event.type !== "DEVICE_CAPABILITIES_UPDATED") {
        return {};
      }
      return {
        deviceSupportsFlash: event.deviceSupportsFlash,
        flashMode: (event.deviceSupportsFlash ? context.flashMode : "off") as "off" | "on",
      };
    }),
    startRecordingSession: assign(() => ({
      isRecording: true,
      captureKind: "video" as const,
      recordingElapsedMs: 0,
      recordingLocked: false,
    })),
    stopRecordingSession: assign(() => ({
      isRecording: false,
      recordingLocked: false,
      recordingElapsedMs: 0,
      captureKind: "photo" as const,
    })),
    lockRecording: assign(() => ({ recordingLocked: true })),
    unlockRecording: assign(() => ({ recordingLocked: false })),
    assignRecordingElapsed: assign(({ event }) => {
      if (event.type !== "RECORDING_ELAPSED") {
        return {};
      }
      return { recordingElapsedMs: event.elapsedMs };
    }),
    assignPendingMedia: assign(({ event }) => {
      if (event.type !== "PREVIEW_READY") {
        return {};
      }
      return { pendingMedia: event.pendingMedia };
    }),
    notifyMediaReady: ({ context, event }) => {
      if (event.type === "PREVIEW_READY") {
        context.onMediaReady?.(event.pendingMedia);
      }
    },
    notifyPendingMediaFromContext: ({ context }) => {
      const pending = context.pendingMedia;
      if (pending) {
        context.onMediaReady?.(pending);
      }
    },
    assignLibraryStaging: assign(({ event }) => {
      if (event.type !== "LIBRARY_ASSET_SELECTED") {
        return {};
      }
      return {
        libraryStaging: {
          uri: event.localUri,
          mediaType: event.mediaType,
        },
      };
    }),
    assignPendingMediaFromPersistOutput: assign(({ event }) => {
      const done = event as unknown as {
        output?: { pendingMedia: MomentCreatorPendingMedia };
      };
      const pendingMedia = done.output?.pendingMedia;
      if (!pendingMedia) {
        return {};
      }
      return {
        pendingMedia,
        libraryStaging: null,
      };
    }),
    assignPersistFailure: assign(({ event }) => ({
      sessionError: {
        code: "MEDIA_PERSIST_FAILED",
        message:
          event.type === "MEDIA_PERSIST_FAILED" ? event.message : undefined,
      },
    })),
    assignLibraryPersistInvokeError: assign(({ event }) => {
      let message = "Could not save the selected media.";
      if (typeof event === "object" && event !== null && "error" in event) {
        const err = (event as { error: unknown }).error;
        if (err instanceof Error) {
          message = err.message;
        } else if (typeof err === "string") {
          message = err;
        }
      }
      return {
        sessionError: {
          code: "LIBRARY_PERSIST_FAILED",
          message,
        },
        libraryStaging: null,
      };
    }),
    showAlbumPermissionScreen: assign(({ event }) => {
      if (event.type !== "SHOW_ALBUM_PERMISSION_SCREEN") {
        return {};
      }
      return { albumPermissionScreen: event.screen };
    }),
    hideAlbumPermissionScreen: assign(() => ({
      albumPermissionScreen: "hidden" as const,
    })),
    clearSession: assign(() => ({
      pendingMedia: null,
      sessionError: null,
      isRecording: false,
      recordingLocked: false,
      recordingElapsedMs: 0,
      captureKind: "photo" as const,
      flashMode: "off" as const,
      libraryStaging: null,
      albumPermissionScreen: "hidden" as const,
    })),
    dismissError: assign(() => ({ sessionError: null })),
  },
}).createMachine({
  id: "momentCreator",
  context: ({ input }) => ({
    cameraPosition: CameraPosition.BACK,
    flashMode: "off",
    grantedPermissions: {
      camera: "not-determined",
      microphone: "not-determined",
    },
    libraryAccess: "unknown",
    captureKind: "photo",
    isRecording: false,
    recordingLocked: false,
    recordingElapsedMs: 0,
    maxVideoDurationMs: MAX_VIDEO_DURATION_MS,
    pendingMedia: null,
    sessionError: null,
    deviceSupportsFlash: false,
    onMediaReady: input?.onMediaReady,
    onExit: input?.onExit,
    libraryStaging: null,
    albumPermissionScreen: "hidden",
  }),
  initial: "permissionsChecking",
  states: {
    permissionsChecking: {
      on: {
        PERMISSIONS_UPDATED: [
          {
            guard: "shouldEnterCapture",
            target: "capture",
            actions: "assignPermissionsFromEvent",
          },
          {
            guard: "shouldNeedPermissionRequest",
            target: "permissionsNeedRequest",
            actions: "assignPermissionsFromEvent",
          },
          {
            guard: "shouldDenyCapture",
            target: "permissionsDenied",
            actions: "assignPermissionsFromEvent",
          },
          {
            actions: "assignPermissionsFromEvent",
          },
        ],
        REQUEST_CAMERA_MIC_PERMISSION: {
          target: "permissionsRequesting",
        },
        LIBRARY_PERMISSION_UPDATED: {
          actions: "assignLibraryAccess",
        },
        DEVICE_CAPABILITIES_UPDATED: {
          actions: "assignDeviceCapabilities",
        },
      },
    },
    permissionsNeedRequest: {
      on: {
        REQUEST_CAMERA_MIC_PERMISSION: {
          target: "permissionsRequesting",
        },
        PERMISSIONS_UPDATED: [
          {
            guard: "shouldEnterCapture",
            target: "capture",
            actions: "assignPermissionsFromEvent",
          },
          {
            guard: "shouldDenyCapture",
            target: "permissionsDenied",
            actions: "assignPermissionsFromEvent",
          },
          {
            actions: "assignPermissionsFromEvent",
          },
        ],
        LIBRARY_PERMISSION_UPDATED: {
          actions: "assignLibraryAccess",
        },
        DEVICE_CAPABILITIES_UPDATED: {
          actions: "assignDeviceCapabilities",
        },
      },
    },
    permissionsRequesting: {
      invoke: {
        src: "requestCameraMic",
        onDone: [
          {
            guard: ({ event }) =>
              bothCapturePermissionsAuthorized(
                event.output.camera,
                event.output.microphone,
              ),
            target: "capture",
            actions: assign(({ event }) => ({
              grantedPermissions: {
                camera: event.output.camera,
                microphone: event.output.microphone,
              },
            })),
          },
          {
            guard: ({ event }) =>
              capturePermissionsBlocked(
                event.output.camera,
                event.output.microphone,
              ),
            target: "permissionsDenied",
            actions: assign(({ event }) => ({
              grantedPermissions: {
                camera: event.output.camera,
                microphone: event.output.microphone,
              },
            })),
          },
          {
            target: "permissionsNeedRequest",
            actions: assign(({ event }) => ({
              grantedPermissions: {
                camera: event.output.camera,
                microphone: event.output.microphone,
              },
            })),
          },
        ],
        onError: {
          target: "permissionsDenied",
          actions: assign(() => ({
            sessionError: {
              code: "PERMISSION_REQUEST_FAILED",
              message: "Could not request camera or microphone access.",
            },
          })),
        },
      },
    },
    permissionsDenied: {
      on: {
        PERMISSIONS_UPDATED: [
          {
            guard: "shouldEnterCapture",
            target: "capture",
            actions: "assignPermissionsFromEvent",
          },
          {
            actions: "assignPermissionsFromEvent",
          },
        ],
        DEVICE_CAPABILITIES_UPDATED: {
          actions: "assignDeviceCapabilities",
        },
      },
    },
    capture: {
      initial: "live",
      states: {
        live: {
          on: {
            SHUTTER_TAP: {
              guard: "canTakePhoto",
            },
            RECORD_START: {
              guard: "canStartRecording",
              target: "recording",
              actions: "startRecordingSession",
            },
            SET_CAMERA_POSITION: {
              guard: "canFlip",
              target: "flipCoolingDown",
              actions: "assignCameraPosition",
            },
            OPEN_LIBRARY_PICKER_REQUESTED: {
              guard: "canOpenLibrary",
              target: "libraryFlow",
            },
            PREVIEW_READY: {
              target: "#momentCreator.handoff",
              actions: ["assignPendingMedia", "notifyMediaReady"],
            },
            LIBRARY_PERMISSION_UPDATED: {
              actions: "assignLibraryAccess",
            },
            DEVICE_CAPABILITIES_UPDATED: {
              actions: "assignDeviceCapabilities",
            },
            TOGGLE_FLASH: {
              guard: "canToggleFlash",
              actions: "toggleFlash",
            },
            CAMERA_UNAVAILABLE: {
              target: "#momentCreator.failure",
            },
          },
        },
        recording: {
          after: {
            [MAX_VIDEO_DURATION_MS]: {
              target: "live",
              actions: "stopRecordingSession",
            },
          },
          on: {
            RECORD_STOP: {
              target: "live",
              actions: "stopRecordingSession",
            },
            RECORD_LOCK: {
              actions: "lockRecording",
            },
            RECORD_UNLOCK: {
              actions: "unlockRecording",
            },
            RECORDING_ELAPSED: {
              actions: "assignRecordingElapsed",
            },
            SET_CAMERA_POSITION: {},
            APP_BLURRED: {
              target: "live",
              actions: "stopRecordingSession",
            },
            FOCUS_LOST: {
              target: "live",
              actions: "stopRecordingSession",
            },
            DEVICE_CAPABILITIES_UPDATED: {
              actions: "assignDeviceCapabilities",
            },
            LIBRARY_PERMISSION_UPDATED: {
              actions: "assignLibraryAccess",
            },
            PREVIEW_READY: {
              target: "#momentCreator.handoff",
              actions: ["assignPendingMedia", "notifyMediaReady"],
            },
          },
        },
        flipCoolingDown: {
          after: {
            [FLIP_COOLDOWN_MS]: {
              target: "live",
            },
          },
          on: {
            SET_CAMERA_POSITION: {
              target: "flipCoolingDown",
              actions: "assignCameraPosition",
            },
          },
        },
        libraryFlow: {
          on: {
            LIBRARY_ASSET_SELECTED: {
              target: "libraryProcessing",
              actions: "assignLibraryStaging",
            },
            RESET_SESSION: {
              target: "#momentCreator.capture.live",
              actions: "clearSession",
            },
            LIBRARY_PERMISSION_UPDATED: {
              actions: "assignLibraryAccess",
            },
            APP_BLURRED: {},
            FOCUS_LOST: {},
          },
        },
        libraryProcessing: {
          invoke: {
            src: "persistCaptureMedia",
            input: ({ context }) => {
              const staging = context.libraryStaging;
              if (!staging) {
                throw new Error("Library staging is missing.");
              }
              return {
                transientUri: staging.uri,
                mediaType: staging.mediaType,
                source: "library" as const,
              };
            },
            onDone: {
              target: "#momentCreator.handoff",
              actions: [
                "assignPendingMediaFromPersistOutput",
                "notifyPendingMediaFromContext",
              ],
            },
            onError: {
              target: "live",
              actions: "assignLibraryPersistInvokeError",
            },
          },
        },
      },
      on: {
        MEDIA_PERSIST_FAILED: {
          actions: "assignPersistFailure",
        },
        PERMISSIONS_UPDATED: [
          {
            guard: ({ event }) =>
              event.type === "PERMISSIONS_UPDATED" &&
              !bothCapturePermissionsAuthorized(event.camera, event.microphone),
            target: "permissionsChecking",
            actions: "assignPermissionsFromEvent",
          },
          {
            actions: "assignPermissionsFromEvent",
          },
        ],
        RESET_SESSION: {
          actions: "clearSession",
        },
        DISMISS_ERROR: {
          actions: "dismissError",
        },
        SHOW_ALBUM_PERMISSION_SCREEN: {
          actions: "showAlbumPermissionScreen",
        },
        HIDE_ALBUM_PERMISSION_SCREEN: {
          actions: "hideAlbumPermissionScreen",
        },
        DEVICE_CAPABILITIES_UPDATED: {
          actions: "assignDeviceCapabilities",
        },
        LIBRARY_PERMISSION_UPDATED: {
          actions: "assignLibraryAccess",
        },
      },
    },
    handoff: {
      on: {
        RESET_SESSION: {
          target: "capture",
          actions: "clearSession",
        },
        DEVICE_CAPABILITIES_UPDATED: {
          actions: "assignDeviceCapabilities",
        },
      },
    },
    failure: {
      on: {
        RESET_SESSION: {
          target: "permissionsChecking",
          actions: "clearSession",
        },
      },
    },
  },
});

export type MomentCreatorActorRef = ActorRefFrom<typeof momentCreatorMachine>;
