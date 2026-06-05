import { Image } from "expo-image";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

const DEFAULT_AVATAR = require("@/assets/images/avatar.png");

const AVATAR_SIZE = 96;

export interface SettingsAvatarEditorProps {
  /** Remote avatar URL or empty when using the default asset. */
  remoteAvatarUrl: string;
  /** Local `file://` preview URI after selection; takes precedence over remote when set. */
  previewUri?: string | null;
  onPressChange: () => void;
  busy?: boolean;
  /** Disables the control without showing the busy overlay (e.g. while saving name). */
  interactionDisabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

export function SettingsAvatarEditor({
  remoteAvatarUrl,
  previewUri,
  onPressChange,
  busy = false,
  interactionDisabled = false,
  accessibilityLabel = "Change profile photo",
  accessibilityHint,
  style,
}: SettingsAvatarEditorProps) {
  const { theme } = useUnistyles();
  const trimmedRemote = remoteAvatarUrl.trim();
  const trimmedPreview =
    typeof previewUri === "string" ? previewUri.trim() : "";
  const source =
    trimmedPreview !== ""
      ? trimmedPreview
      : trimmedRemote !== ""
        ? trimmedRemote
        : DEFAULT_AVATAR;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ busy, disabled: busy || interactionDisabled }}
      disabled={busy || interactionDisabled}
      onPress={onPressChange}
      style={({ pressed }) => [
        styles.wrapper,
        pressed && !busy ? styles.wrapperPressed : null,
        style,
      ]}
    >
      <View style={styles.avatarOuter}>
        <Image
          style={styles.avatarImage}
          source={source}
          contentFit="cover"
          transition={200}
          accessibilityIgnoresInvertColors
        />
        {busy ? (
          <View style={styles.busyOverlay} accessibilityElementsHidden>
            <ActivityIndicator color={theme.colors.common.white} />
          </View>
        ) : null}
      </View>
      <Text style={styles.caption}>Edit picture</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  wrapper: {
    alignItems: "center",
    alignSelf: "center",
    paddingVertical: theme.spacing.normal,
  },
  wrapperPressed: {
    opacity: 0.88,
  },
  avatarOuter: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    overflow: "hidden",
    backgroundColor: theme.colors.foundation.background.alpha30,
  },
  avatarImage: {
    ...StyleSheet.absoluteFillObject,
  },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  caption: {
    marginTop: theme.spacing.small,
    fontSize: theme.spacing.normal,
    fontWeight: "600",
    color: theme.colors.foundation.foreground.brand.tertiary,
  },
}));
