import CircleXFill from "@/assets/icons/circle.x.fill.svg";
import PencilFill from "@/assets/icons/pencil.fill.svg";
import { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Pressable,
  TextInput,
  Text,
  View,
} from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

const DEFAULT_MAX_LENGTH = 20;

export interface SettingsNameEditorProps {
  persistedName: string;
  draftName: string;
  isEditing: boolean;
  maxLength?: number;
  isSaving?: boolean;
  onStartEdit: () => void;
  onChangeDraft: (name: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export function SettingsNameEditor({
  persistedName,
  draftName,
  isEditing,
  maxLength = DEFAULT_MAX_LENGTH,
  isSaving = false,
  onStartEdit,
  onChangeDraft,
  onCancel,
  onSubmit,
}: SettingsNameEditorProps) {
  const { theme } = useUnistyles();
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  const onTapAction = () => {
    if (isEditing) {
      onCancel();
    } else {
      onStartEdit();
    }
  };

  return (
    <View style={styles.root}>
      <Text
        style={[
          styles.label,
          isEditing ? styles.labelFocused : styles.labelInactive,
        ]}
      >
        Name
      </Text>
      <View
        style={[
          styles.field,
          isEditing ? styles.fieldFocused : styles.fieldInactive,
        ]}
      >
        <TextInput
          ref={inputRef}
          accessibilityLabel="Display name"
          value={isEditing ? draftName : persistedName}
          onChangeText={onChangeDraft}
          maxLength={maxLength}
          editable={isEditing && !isSaving}
          inputMode="text"
          returnKeyType="done"
          numberOfLines={1}
          onSubmitEditing={onSubmit}
          cursorColor={theme.colors.foundation.foreground.brand.tertiary}
          selectionColor={theme.colors.foundation.foreground.brand.tertiary}
          style={[
            styles.input,
            isEditing ? styles.inputEditable : styles.inputReadonly,
          ]}
          pointerEvents={isEditing ? "auto" : "none"}
        />
        {isSaving ? (
          <ActivityIndicator size="small" />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isEditing ? "Cancel edit" : "Edit name"}
            disabled={isSaving}
            onPress={onTapAction}
            style={styles.actionIcon}
            hitSlop={8}
          >
            {isEditing ? (
              <CircleXFill
                color={theme.colors.foundation.foreground.primary}
              />
            ) : (
              <PencilFill
                color={theme.colors.foundation.foreground.primary}
              />
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: {
    marginTop: theme.spacing.normal,
    width: "100%",
    gap: theme.spacing.xxsmall,
  },
  label: {
    fontSize: theme.spacing.small,
    fontWeight: "700",
  },
  labelInactive: {
    color: theme.colors.foundation.background.alpha50,
  },
  labelFocused: {
    color: theme.colors.foundation.foreground.primary,
  },
  field: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    padding: theme.spacing.xsmall,
    gap: theme.spacing.xsmall,
    borderRadius: theme.spacing.xsmall,
    borderWidth: 1,
    backgroundColor: theme.colors.foundation.background.secondary,
  },
  fieldInactive: {
    borderColor: "transparent",
  },
  fieldFocused: {
    borderColor: theme.colors.foundation.foreground.brand.tertiary,
  },
  input: {
    flex: 1,
    fontSize: theme.spacing.normal,
    fontWeight: "400",
    padding: 0,
    margin: 0,
  },
  inputEditable: {
    color: theme.colors.foundation.foreground.primary,
  },
  inputReadonly: {
    color: theme.colors.foundation.background.alpha30,
  },
  actionIcon: {
    alignItems: "center",
    justifyContent: "center",
  },
}));
