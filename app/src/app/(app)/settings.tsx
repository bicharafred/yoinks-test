import { AppHeaderBackButton } from "@/components/navigation/app-header-back-button";
import { AppScreenContainer } from "@/components/navigation/app-screen-container";
import { SettingsAvatarEditor } from "@/components/settings/settings-avatar-editor";
import { SettingsAvatarPermissionBanner } from "@/components/settings/settings-avatar-permission-banner";
import { SettingsDangerActions } from "@/components/settings/settings-danger-actions";
import { SettingsNameEditor } from "@/components/settings/settings-name-editor";
import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import type { Author } from "@/gql/graphql";
import { RootMachineContext } from "@/machines/rootMachine";
import {
  settingsMachine,
  type SettingsMachineEvents,
  type SettingsPendingOperation,
} from "@/machines/settingsMachine";
import {
  openPrivacyPolicyUrl,
  openTermsOfServiceUrl,
} from "@/services/legalUrlsService";
import { getAppHeaderOptions } from "@/navigation/app-header-options";
import {
  pickAvatarImageFromCamera,
  pickAvatarImageFromLibrary,
  type PickAvatarImageResult,
} from "@/services/avatarImagePicker";
import {
  deleteAccount,
  updateDisplayName,
  uploadAvatar,
  type SettingsPersistedAuthor,
} from "@/services/settingsService";
import { getAppMarketingVersion } from "@/utils/appVersion";
import * as Haptics from "expo-haptics";
import { useNavigation, useRouter } from "expo-router";
import { useMachine } from "@xstate/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";

function applyAvatarPickResult(
  send: (event: SettingsMachineEvents) => void,
  result: PickAvatarImageResult,
): void {
  switch (result.status) {
    case "selected":
      send({ type: "CLEAR_AVATAR_PERMISSION_FOCUS" });
      send({ type: "AVATAR_SELECTED", payload: { uri: result.uri } });
      break;
    case "cancelled":
      send({ type: "CLEAR_AVATAR_PERMISSION_FOCUS" });
      break;
    case "denied":
      send({
        type: "SET_AVATAR_PERMISSION_FOCUS",
        payload: {
          source: result.source,
          canAskAgain: result.canAskAgain,
        },
      });
      break;
    case "unsupported":
      Alert.alert(
        "Change profile photo",
        "Changing your profile photo is only available on the iOS and Android apps.",
      );
      break;
  }
}

function SettingsShellBody({
  pendingOperation,
  error,
  remoteAvatarUrl,
  selectedAvatarUri,
  persistedName,
  draftName,
  isNameEditing,
  isSavingName,
  onStartNameEdit,
  onChangeDraftName,
  onCancelNameEdit,
  onSubmitName,
  onPressChangeAvatar,
  avatarPermissionFocus,
  onAvatarPermissionRetry,
  onAvatarPermissionOpenSettings,
  onAvatarPermissionDismiss,
  onPressBlockedUsers,
  onPressHiddenCreators,
  onPressPrivacyPolicy,
  onPressTermsOfService,
  onPressGettingStarted,
  appVersionLabel,
  onPressLogout,
  onPressDeleteAccount,
  avatarBusy,
  avatarInteractionDisabled,
}: {
  pendingOperation: SettingsPendingOperation;
  error: string | null;
  remoteAvatarUrl: string;
  selectedAvatarUri: string | null;
  persistedName: string;
  draftName: string;
  isNameEditing: boolean;
  isSavingName: boolean;
  onStartNameEdit: () => void;
  onChangeDraftName: (name: string) => void;
  onCancelNameEdit: () => void;
  onSubmitName: () => void;
  onPressChangeAvatar: () => void;
  avatarPermissionFocus: {
    source: "library" | "camera";
    canAskAgain: boolean;
  } | null;
  onAvatarPermissionRetry: () => void;
  onAvatarPermissionOpenSettings: () => void;
  onAvatarPermissionDismiss: () => void;
  onPressBlockedUsers: () => void;
  onPressHiddenCreators: () => void;
  onPressPrivacyPolicy: () => void;
  onPressTermsOfService: () => void;
  onPressGettingStarted: () => void;
  appVersionLabel: string;
  onPressLogout: () => void;
  onPressDeleteAccount: () => void;
  avatarBusy: boolean;
  avatarInteractionDisabled: boolean;
}) {
  const insets = useSafeAreaInsets();

  const showBlockingSpinner =
    pendingOperation != null && pendingOperation !== "savingName";

  if (showBlockingSpinner) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
        <Text style={styles.shellHint}>Please wait...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: insets.bottom + 24 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View>
        {error != null ? (
          <View style={styles.inlineError} accessibilityRole="alert">
            <Text style={styles.inlineErrorTitle}>Something went wrong</Text>
            <Text style={styles.inlineErrorMessage}>{error}</Text>
          </View>
        ) : null}
        {avatarPermissionFocus != null ? (
          <SettingsAvatarPermissionBanner
            source={avatarPermissionFocus.source}
            canAskAgain={avatarPermissionFocus.canAskAgain}
            onRequestAgain={onAvatarPermissionRetry}
            onOpenSettings={onAvatarPermissionOpenSettings}
            onDismiss={onAvatarPermissionDismiss}
          />
        ) : null}
        <SettingsAvatarEditor
          remoteAvatarUrl={remoteAvatarUrl}
          previewUri={selectedAvatarUri}
          onPressChange={onPressChangeAvatar}
          busy={avatarBusy}
          interactionDisabled={avatarInteractionDisabled}
        />
        <SettingsNameEditor
          persistedName={persistedName}
          draftName={draftName}
          isEditing={isNameEditing}
          isSaving={isSavingName}
          onStartEdit={onStartNameEdit}
          onChangeDraft={onChangeDraftName}
          onCancel={onCancelNameEdit}
          onSubmit={onSubmitName}
        />
        <SettingsSection title="Legal">
          <SettingsRow
            label="Privacy Policy"
            onPress={onPressPrivacyPolicy}
            isFirst
            accessibilityLabel="Privacy policy"
            accessibilityHint="Opens the privacy policy in the browser"
          />
          <SettingsRow
            label="Terms of Service"
            onPress={onPressTermsOfService}
            isLast
            accessibilityLabel="Terms of service"
            accessibilityHint="Opens the terms of service in the browser"
          />
        </SettingsSection>
        <SettingsSection title="Help">
          <SettingsRow
            label="Getting started"
            onPress={onPressGettingStarted}
            isFirst
            accessibilityLabel="Getting started"
            accessibilityHint="Opens getting started replay"
          />
          <SettingsRow
            label={`App version: ${appVersionLabel}`}
            showChevron={false}
            isLast
          />
        </SettingsSection>
        <SettingsSection title="Privacy">
          <SettingsRow
            label="Blocked Users"
            onPress={onPressBlockedUsers}
            isFirst
            accessibilityLabel="Blocked users"
            accessibilityHint="Opens the list of authors you have blocked"
          />
          <SettingsRow
            label="Hidden Creators"
            onPress={onPressHiddenCreators}
            isLast
            accessibilityLabel="Hidden creators"
            accessibilityHint="Opens the list of creators you have hidden with I Don't like this"
          />
        </SettingsSection>
      </View>
      <SettingsDangerActions
        onPressLogout={onPressLogout}
        onPressDeleteAccount={onPressDeleteAccount}
      />
    </ScrollView>
  );
}

function SettingsRouteBody({ author }: { author: Author }) {
  const router = useRouter();
  const [state, send] = useMachine(settingsMachine, {
    input: { author },
  });
  const rootRef = RootMachineContext.useActorRef();
  const nameSaveInputRef = useRef({ author, draftName: author.name });
  const settingsSnapshotRef = useRef({
    author: author as SettingsPersistedAuthor,
    selectedAvatarUri: null as string | null,
  });
  const onboardingRootSendForNonce = useRef<number | null>(null);

  useEffect(() => {
    send({ type: "SYNC_AUTHOR", payload: { author } });
  }, [author, send]);

  const {
    pendingOperation,
    error,
    author: contextAuthor,
    draftName,
    isNameEditing,
    selectedAvatarUri,
    avatarPermissionFocus,
    pendingRouteIntent,
    pendingAuthIntent,
    intentNonce,
  } = state.context;

  useEffect(() => {
    if (pendingRouteIntent !== "onboarding") {
      return;
    }
    if (onboardingRootSendForNonce.current === intentNonce) {
      return;
    }
    onboardingRootSendForNonce.current = intentNonce;
    rootRef.send({ type: "START_ONBOARDING" });
    send({ type: "CLEAR_PENDING_INTENTS" });
  }, [intentNonce, pendingRouteIntent, rootRef, send]);

  useEffect(() => {
    if (pendingAuthIntent !== "logout") {
      return;
    }
    rootRef.send({ type: "LOGOUT" });
    send({ type: "CLEAR_PENDING_INTENTS" });
  }, [intentNonce, pendingAuthIntent, rootRef, send]);

  useEffect(() => {
    if (pendingAuthIntent !== "deleteAccount") {
      return;
    }
    if (pendingOperation !== "deletingAccount") {
      return;
    }
    let cancelled = false;
    void (async () => {
      const result = await deleteAccount();
      if (cancelled) {
        return;
      }
      if (result.ok) {
        send({ type: "DELETE_ACCOUNT_FLOW_COMPLETED" });
        rootRef.send({ type: "LOGOUT" });
      } else {
        Alert.alert("Delete account", result.message);
        send({ type: "DELETE_ACCOUNT_FLOW_COMPLETED" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    intentNonce,
    pendingAuthIntent,
    pendingOperation,
    rootRef,
    send,
  ]);

  nameSaveInputRef.current = {
    author: contextAuthor,
    draftName,
  };

  settingsSnapshotRef.current = {
    author: contextAuthor as SettingsPersistedAuthor,
    selectedAvatarUri,
  };

  useEffect(() => {
    if (pendingOperation !== "savingName") {
      return;
    }
    let cancelled = false;
    const { author: currentAuthor, draftName: nameDraft } =
      nameSaveInputRef.current;

    void (async () => {
      const result = await updateDisplayName({
        currentAuthor: currentAuthor as SettingsPersistedAuthor,
        newName: nameDraft,
      });
      if (cancelled) {
        return;
      }
      if (result.ok) {
        rootRef.send({ type: "SET_AUTHOR", author: result.mergedAuthor });
        send({
          type: "NAME_SAVE_SUCCEEDED",
          payload: { author: result.mergedAuthor as Author },
        });
      } else {
        send({
          type: "NAME_SAVE_FAILED",
          payload: { message: result.message },
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pendingOperation, rootRef, send]);

  useEffect(() => {
    if (pendingOperation !== "uploadingAvatar") {
      return;
    }
    let cancelled = false;
    const { author: currentAuthor, selectedAvatarUri: uri } =
      settingsSnapshotRef.current;
    const trimmedUri = (uri ?? "").trim();
    if (trimmedUri === "") {
      Alert.alert(
        "Profile photo",
        "Something went wrong while reading the selected photo.",
      );
      send({ type: "AVATAR_UPLOAD_FAILED" });
      return;
    }

    void (async () => {
      const result = await uploadAvatar({
        localImageUri: trimmedUri,
        currentAuthor,
      });
      if (cancelled) {
        return;
      }
      if (result.ok) {
        rootRef.send({ type: "SET_AUTHOR", author: result.mergedAuthor });
        send({
          type: "AVATAR_UPLOAD_SUCCEEDED",
          payload: { author: result.mergedAuthor as Author },
        });
      } else {
        Alert.alert("Profile photo", result.message);
        send({ type: "AVATAR_UPLOAD_FAILED" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pendingOperation, rootRef, send]);

  const appVersionLabel = useMemo(() => getAppMarketingVersion(), []);

  const persistedName = useMemo(() => {
    const n = contextAuthor.name;
    return typeof n === "string" ? n : "";
  }, [contextAuthor.name]);

  const remoteAvatarUrl = useMemo(() => {
    const u = contextAuthor.avatar;
    return typeof u === "string" ? u : "";
  }, [contextAuthor.avatar]);

  const isSavingName = pendingOperation === "savingName";
  const isUploadingAvatar = pendingOperation === "uploadingAvatar";

  const onStartNameEdit = useCallback(() => {
    send({ type: "START_NAME_EDIT" });
  }, [send]);

  const onChangeDraftName = useCallback(
    (name: string) => {
      send({ type: "CHANGE_NAME", payload: { name } });
    },
    [send],
  );

  const onCancelNameEdit = useCallback(() => {
    send({ type: "CANCEL_NAME_EDIT" });
  }, [send]);

  const onSubmitName = useCallback(() => {
    send({ type: "SUBMIT_NAME" });
  }, [send]);

  const runLibraryPick = useCallback(async () => {
    const result = await pickAvatarImageFromLibrary();
    applyAvatarPickResult(send, result);
  }, [send]);

  const runCameraPick = useCallback(async () => {
    const result = await pickAvatarImageFromCamera();
    applyAvatarPickResult(send, result);
  }, [send]);

  const onPressChangeAvatar = useCallback(() => {
    send({ type: "CLEAR_AVATAR_PERMISSION_FOCUS" });
    if (Platform.OS === "ios" || Platform.OS === "android") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (Platform.OS === "web") {
      Alert.alert(
        "Change profile photo",
        "Changing your profile photo is only available on the iOS and Android apps.",
      );
      return;
    }
    Alert.alert("Change profile photo", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Choose from library",
        onPress: () => {
          void runLibraryPick();
        },
      },
      {
        text: "Take photo",
        onPress: () => {
          void runCameraPick();
        },
      },
    ]);
  }, [runCameraPick, runLibraryPick, send]);

  const onAvatarPermissionRetry = useCallback(() => {
    if (avatarPermissionFocus == null) {
      return;
    }
    if (avatarPermissionFocus.source === "library") {
      void runLibraryPick();
      return;
    }
    void runCameraPick();
  }, [avatarPermissionFocus, runCameraPick, runLibraryPick]);

  const onAvatarPermissionOpenSettings = useCallback(() => {
    void Linking.openSettings();
  }, []);

  const onAvatarPermissionDismiss = useCallback(() => {
    send({ type: "CLEAR_AVATAR_PERMISSION_FOCUS" });
  }, [send]);

  const onPressLogout = useCallback(() => {
    send({ type: "LOGOUT_REQUESTED" });
  }, [send]);

  const onPressDeleteAccount = useCallback(() => {
    Alert.alert(
      "Delete your Yoinks account?",
      "This action is final and permanent. All claps, media and balance will be lost.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: () => {
            send({ type: "DELETE_ACCOUNT_CONFIRMED" });
          },
        },
      ],
      { cancelable: true },
    );
  }, [send]);

  const onPressBlockedUsers = useCallback(() => {
    router.push("/(app)/blocked-users");
  }, [router]);

  const onPressHiddenCreators = useCallback(() => {
    router.push("/(app)/hidden-creators");
  }, [router]);

  const onPressPrivacyPolicy = useCallback(async () => {
    const result = await openPrivacyPolicyUrl();
    if (!result.ok) {
      Alert.alert("Privacy policy", result.message);
    }
  }, []);

  const onPressTermsOfService = useCallback(async () => {
    const result = await openTermsOfServiceUrl();
    if (!result.ok) {
      Alert.alert("Terms of service", result.message);
    }
  }, []);

  const onPressGettingStarted = useCallback(() => {
    send({ type: "SHOW_ONBOARDING" });
  }, [send]);

  return (
    <AppScreenContainer>
      <SettingsShellBody
        pendingOperation={pendingOperation}
        error={error}
        remoteAvatarUrl={remoteAvatarUrl}
        selectedAvatarUri={selectedAvatarUri}
        persistedName={persistedName}
        draftName={draftName}
        isNameEditing={isNameEditing}
        isSavingName={isSavingName}
        onStartNameEdit={onStartNameEdit}
        onChangeDraftName={onChangeDraftName}
        onCancelNameEdit={onCancelNameEdit}
        onSubmitName={onSubmitName}
        onPressChangeAvatar={onPressChangeAvatar}
        avatarPermissionFocus={avatarPermissionFocus}
        onAvatarPermissionRetry={onAvatarPermissionRetry}
        onAvatarPermissionOpenSettings={onAvatarPermissionOpenSettings}
        onAvatarPermissionDismiss={onAvatarPermissionDismiss}
        onPressBlockedUsers={onPressBlockedUsers}
        onPressHiddenCreators={onPressHiddenCreators}
        onPressPrivacyPolicy={onPressPrivacyPolicy}
        onPressTermsOfService={onPressTermsOfService}
        onPressGettingStarted={onPressGettingStarted}
        appVersionLabel={appVersionLabel}
        onPressLogout={onPressLogout}
        onPressDeleteAccount={onPressDeleteAccount}
        avatarBusy={isUploadingAvatar}
        avatarInteractionDisabled={isSavingName}
      />
    </AppScreenContainer>
  );
}

export default function SettingsScreen() {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      ...getAppHeaderOptions({
        title: "Settings",
        leftAction: <AppHeaderBackButton />,
        leftAccessibilityLabel: "Go back",
      }),
    });
  }, [navigation]);

  const author = RootMachineContext.useSelector(
    (s) => s.context.author as Author | null,
  );

  if (author == null) {
    return (
      <AppScreenContainer>
        <View style={styles.centered}>
          <Text style={styles.fallbackTitle}>Unavailable</Text>
          <Text style={styles.fallbackMessage}>
            Signed-in account data is unavailable. Try signing in again.
          </Text>
        </View>
      </AppScreenContainer>
    );
  }

  return <SettingsRouteBody author={author} />;
}

const styles = StyleSheet.create((theme) => ({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: theme.spacing.normal,
    justifyContent: "space-between",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.large,
  },
  shellHint: {
    marginTop: theme.spacing.normal,
    color: theme.colors.foundation.foreground.secondary,
    fontSize: 14,
    fontWeight: "500",
  },
  inlineError: {
    marginBottom: theme.spacing.normal,
    padding: theme.spacing.normal,
    borderRadius: 10,
    backgroundColor: theme.colors.foundation.error.background.secondary,
  },
  inlineErrorTitle: {
    color: theme.colors.foundation.error.foreground.primary,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  inlineErrorMessage: {
    color: theme.colors.foundation.error.foreground.secondary,
    fontSize: 14,
    fontWeight: "500",
  },
  fallbackTitle: {
    color: theme.colors.foundation.foreground.primary,
    fontSize: 18,
    fontWeight: "600",
    marginBottom: theme.spacing.small,
    textAlign: "center",
  },
  fallbackMessage: {
    textAlign: "center",
    color: theme.colors.foundation.foreground.secondary,
    fontSize: 14,
    fontWeight: "500",
  },
}));
