import type { Author } from "@/gql/graphql";
import type { ActorRefFrom } from "xstate";
import { assign, setup } from "xstate";

/**
 * Route-owned settings view model only: the `/(app)/settings` screen should
 * `createActor(settingsMachine, { input: { author } })` and dispose on unmount.
 * Do not spawn this machine from `rootMachine` (no legacy IN/OUT settings screen
 * lifecycle on root).
 *
 * Root integration is one-way from the route: read the signed-in author from
 * `RootMachineContext`, pass it as `input`, and when `pendingAuthIntent` or
 * `pendingRouteIntent` is set, the route clears intents and dispatches root
 * events that already exist — e.g. `{ type: "LOGOUT" }`, `{ type: "SET_AUTHOR", author }`.
 * Onboarding: `SHOW_ONBOARDING` sets `pendingRouteIntent` to `onboarding`; the
 * settings route sends `START_ONBOARDING` on the root machine and clears intents.
 * Root `loggedIn.onboardingReplay` opens `/(app)/onboarding`; `FINISH_ONBOARDING_REPLAY`
 * returns to `loggedIn.active`.
 */

/** Matches legacy display-name cap; enforced on draft changes. */
const DISPLAY_NAME_MAX_LENGTH = 20;

export type SettingsMachineInput = {
  author: Author;
};

/**
 * Long-running operations the settings screen will surface (wired in later steps).
 * Step 39 only defines the shape; transitions that set non-null values arrive with services.
 */
export type SettingsPendingOperation =
  | null
  | "savingName"
  | "uploadingAvatar"
  | "deletingAccount"
  | "loggingOut";

export type SettingsMachineContext = {
  /** Signed-in author snapshot for this screen. */
  author: Author;
  /** Editable display name while editing or after local changes before sync. */
  draftName: string;
  /** Local `file://` URI after picker selection; cleared after successful upload. */
  selectedAvatarUri: string | null;
  pendingOperation: SettingsPendingOperation;
  error: string | null;
  isNameEditing: boolean;
  avatarSourceChooserOpen: boolean;
  /**
   * When set, the UI should show permission rationale / denied UI for that source.
   */
  avatarPermissionFocus: null | {
    source: "library" | "camera";
    canAskAgain: boolean;
  };
  /**
   * Bumped whenever `pendingAuthIntent` or `pendingRouteIntent` is set so the route can react.
   */
  intentNonce: number;
  pendingAuthIntent: null | "logout" | "deleteAccount";
  pendingRouteIntent: null | "blockedUsers" | "onboarding";
};

export type SettingsMachineEvents =
  | { type: "SYNC_AUTHOR"; payload: { author: Author } }
  | { type: "START_NAME_EDIT" }
  | { type: "CANCEL_NAME_EDIT" }
  | { type: "CHANGE_NAME"; payload: { name: string } }
  | { type: "SUBMIT_NAME" }
  | { type: "NAME_SAVE_SUCCEEDED"; payload: { author: Author } }
  | { type: "NAME_SAVE_FAILED"; payload: { message: string } }
  | { type: "OPEN_AVATAR_SOURCE_CHOOSER" }
  | { type: "CLOSE_AVATAR_SOURCE_CHOOSER" }
  | { type: "CHOOSE_AVATAR_SOURCE"; payload: { source: "library" | "camera" } }
  | { type: "AVATAR_SELECTED"; payload: { uri: string } }
  | {
      type: "AVATAR_UPLOAD_SUCCEEDED";
      payload: { author: Author };
    }
  | { type: "AVATAR_UPLOAD_FAILED" }
  | { type: "CLEAR_SELECTED_AVATAR" }
  | {
      type: "SET_AVATAR_PERMISSION_FOCUS";
      payload: { source: "library" | "camera"; canAskAgain: boolean };
    }
  | { type: "CLEAR_AVATAR_PERMISSION_FOCUS" }
  | { type: "CLEAR_ERROR" }
  | { type: "CLEAR_PENDING_INTENTS" }
  | { type: "LOGOUT_REQUESTED" }
  | { type: "DELETE_ACCOUNT_CONFIRMED" }
  | { type: "DELETE_ACCOUNT_FLOW_COMPLETED" }
  | { type: "SHOW_ONBOARDING" }
  | { type: "NAVIGATE_BLOCKED_USERS" };

function clampDisplayName(name: string): string {
  if (name.length <= DISPLAY_NAME_MAX_LENGTH) {
    return name;
  }
  return name.slice(0, DISPLAY_NAME_MAX_LENGTH);
}

export const settingsMachine = setup({
  types: {
    context: {} as SettingsMachineContext,
    events: {} as SettingsMachineEvents,
    input: {} as SettingsMachineInput,
  },
  guards: {
    nameDraftEmpty: ({ context }) => context.draftName.trim().length === 0,
    nameDraftUnchanged: ({ context }) =>
      context.draftName.trim() === context.author.name,
    canStartNameSave: ({ context }) => context.pendingOperation !== "savingName",
    canBeginAvatarUploadAfterPick: ({ context }) =>
      context.pendingOperation !== "savingName" &&
      context.pendingOperation !== "uploadingAvatar",
    canConfirmDeleteAccount: ({ context }) =>
      context.pendingOperation !== "deletingAccount",
  },
  actions: {
    syncAuthor: assign(({ context, event }) => {
      if (event.type !== "SYNC_AUTHOR") {
        return {};
      }
      const nextAuthor = event.payload.author;
      return {
        author: nextAuthor,
        draftName: context.isNameEditing
          ? context.draftName
          : nextAuthor.name,
      };
    }),
    startNameEdit: assign(({ context }) => ({
      isNameEditing: true,
      draftName: context.author.name,
      error: null,
    })),
    cancelNameEdit: assign(({ context }) => ({
      isNameEditing: false,
      draftName: context.author.name,
      error: null,
    })),
    changeDraftName: assign(({ event }) => {
      if (event.type !== "CHANGE_NAME") {
        return {};
      }
      return {
        draftName: clampDisplayName(event.payload.name),
        error: null,
      };
    }),
    setNameEmptyError: assign({
      error: "Display name cannot be empty.",
    }),
    exitNameEditUnchanged: assign(({ context }) => ({
      isNameEditing: false,
      draftName: context.author.name,
      error: null,
    })),
    beginSaveDisplayName: assign({
      pendingOperation: "savingName" as const,
      error: null,
    }),
    nameSaveSucceeded: assign(({ event }) => {
      if (event.type !== "NAME_SAVE_SUCCEEDED") {
        return {};
      }
      const nextAuthor = event.payload.author;
      return {
        author: nextAuthor,
        draftName:
          typeof nextAuthor.name === "string" ? nextAuthor.name : "",
        isNameEditing: false,
        pendingOperation: null,
        error: null,
      };
    }),
    nameSaveFailed: assign(({ event }) => {
      if (event.type !== "NAME_SAVE_FAILED") {
        return {};
      }
      return {
        pendingOperation: null,
        error: event.payload.message,
      };
    }),
    openAvatarChooser: assign({
      avatarSourceChooserOpen: true,
    }),
    closeAvatarChooser: assign({
      avatarSourceChooserOpen: false,
    }),
    chooseAvatarSource: assign({
      avatarSourceChooserOpen: false,
    }),
    avatarSelected: assign(({ event }) => {
      if (event.type !== "AVATAR_SELECTED") {
        return {};
      }
      return {
        selectedAvatarUri: event.payload.uri,
        error: null,
      };
    }),
    beginAvatarUpload: assign({
      pendingOperation: "uploadingAvatar" as const,
      error: null,
    }),
    avatarUploadSucceeded: assign(({ event }) => {
      if (event.type !== "AVATAR_UPLOAD_SUCCEEDED") {
        return {};
      }
      const nextAuthor = event.payload.author;
      return {
        author: nextAuthor,
        selectedAvatarUri: null,
        pendingOperation: null,
        error: null,
      };
    }),
    avatarUploadFailed: assign({
      pendingOperation: null,
      selectedAvatarUri: null,
    }),
    clearSelectedAvatar: assign({
      selectedAvatarUri: null,
    }),
    setAvatarPermissionFocus: assign(({ event }) => {
      if (event.type !== "SET_AVATAR_PERMISSION_FOCUS") {
        return {};
      }
      return {
        avatarPermissionFocus: {
          source: event.payload.source,
          canAskAgain: event.payload.canAskAgain,
        },
      };
    }),
    clearAvatarPermissionFocus: assign({
      avatarPermissionFocus: null,
    }),
    clearError: assign({
      error: null,
    }),
    clearPendingIntents: assign({
      pendingAuthIntent: null,
      pendingRouteIntent: null,
    }),
    emitLogoutIntent: assign(({ context }) => ({
      pendingAuthIntent: "logout" as const,
      intentNonce: context.intentNonce + 1,
    })),
    emitDeleteAccountIntent: assign(({ context }) => ({
      pendingAuthIntent: "deleteAccount" as const,
      intentNonce: context.intentNonce + 1,
    })),
    beginDeletingAccount: assign({
      pendingOperation: "deletingAccount" as const,
      error: null,
    }),
    clearDeleteAccountFlow: assign({
      pendingOperation: null,
      pendingAuthIntent: null,
    }),
    emitOnboardingIntent: assign(({ context }) => ({
      pendingRouteIntent: "onboarding" as const,
      intentNonce: context.intentNonce + 1,
    })),
    emitBlockedUsersIntent: assign(({ context }) => ({
      pendingRouteIntent: "blockedUsers" as const,
      intentNonce: context.intentNonce + 1,
    })),
  },
}).createMachine({
  id: "settings",
  initial: "active",
  context: ({ input }) => ({
    author: input.author,
    draftName: input.author.name,
    selectedAvatarUri: null,
    pendingOperation: null,
    error: null,
    isNameEditing: false,
    avatarSourceChooserOpen: false,
    avatarPermissionFocus: null,
    intentNonce: 0,
    pendingAuthIntent: null,
    pendingRouteIntent: null,
  }),
  states: {
    active: {
      on: {
        SYNC_AUTHOR: { actions: "syncAuthor" },
        START_NAME_EDIT: { actions: "startNameEdit" },
        CANCEL_NAME_EDIT: { actions: "cancelNameEdit" },
        CHANGE_NAME: { actions: "changeDraftName" },
        SUBMIT_NAME: [
          { guard: "nameDraftEmpty", actions: "setNameEmptyError" },
          { guard: "nameDraftUnchanged", actions: "exitNameEditUnchanged" },
          {
            guard: "canStartNameSave",
            actions: "beginSaveDisplayName",
          },
        ],
        NAME_SAVE_SUCCEEDED: { actions: "nameSaveSucceeded" },
        NAME_SAVE_FAILED: { actions: "nameSaveFailed" },
        OPEN_AVATAR_SOURCE_CHOOSER: { actions: "openAvatarChooser" },
        CLOSE_AVATAR_SOURCE_CHOOSER: { actions: "closeAvatarChooser" },
        CHOOSE_AVATAR_SOURCE: { actions: "chooseAvatarSource" },
        AVATAR_SELECTED: [
          {
            guard: "canBeginAvatarUploadAfterPick",
            actions: ["avatarSelected", "beginAvatarUpload"],
          },
          { actions: "avatarSelected" },
        ],
        AVATAR_UPLOAD_SUCCEEDED: { actions: "avatarUploadSucceeded" },
        AVATAR_UPLOAD_FAILED: { actions: "avatarUploadFailed" },
        CLEAR_SELECTED_AVATAR: { actions: "clearSelectedAvatar" },
        SET_AVATAR_PERMISSION_FOCUS: { actions: "setAvatarPermissionFocus" },
        CLEAR_AVATAR_PERMISSION_FOCUS: { actions: "clearAvatarPermissionFocus" },
        CLEAR_ERROR: { actions: "clearError" },
        CLEAR_PENDING_INTENTS: { actions: "clearPendingIntents" },
        LOGOUT_REQUESTED: { actions: "emitLogoutIntent" },
        DELETE_ACCOUNT_FLOW_COMPLETED: { actions: "clearDeleteAccountFlow" },
        DELETE_ACCOUNT_CONFIRMED: [
          {
            guard: "canConfirmDeleteAccount",
            actions: ["beginDeletingAccount", "emitDeleteAccountIntent"],
          },
        ],
        SHOW_ONBOARDING: { actions: "emitOnboardingIntent" },
        NAVIGATE_BLOCKED_USERS: { actions: "emitBlockedUsersIntent" },
      },
    },
  },
});

export type SettingsMachineActorRef = ActorRefFrom<typeof settingsMachine>;
