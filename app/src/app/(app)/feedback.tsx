import { AppHeaderBackButton } from "@/components/navigation/app-header-back-button";
import { AppScreenContainer } from "@/components/navigation/app-screen-container";
import { RootMachineContext } from "@/machines/rootMachine";
import { getAppHeaderOptions } from "@/navigation/app-header-options";
import { submitFeedback } from "@/services/feedbackService";
import { useNavigation, useRouter } from "expo-router";
import { useCallback, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";
import Toast from "react-native-toast-message";

const MAX_LENGTH = 1000;
const COUNTER_THRESHOLD = MAX_LENGTH - 100;

export default function FeedbackScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const author = RootMachineContext.useSelector(
    (s) => s.context.author as { id: string } | null,
  );

  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      ...getAppHeaderOptions({
        title: "Feedback",
        leftAction: <AppHeaderBackButton />,
        leftAccessibilityLabel: "Go back",
      }),
    });
  }, [navigation]);

  const handleSend = useCallback(async () => {
    const trimmed = message.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await submitFeedback({ message: trimmed, userId: author?.id });
      Toast.show({ type: "success", text1: "Thanks for your feedback." });
      router.back();
    } catch {
      Toast.show({
        type: "error" as "info",
        text1: "Couldn't send feedback. Please try again.",
      });
    } finally {
      setSending(false);
    }
  }, [message, sending, author, router]);

  const sendDisabled = message.trim().length === 0 || sending;
  const showCounter = message.length >= COUNTER_THRESHOLD;

  return (
    <AppScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.label}>What happened?</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Tell us what is not working or how we could improve Yoinks."
            placeholderTextColor={styles.placeholder.color}
            value={message}
            onChangeText={(t) => setMessage(t.slice(0, MAX_LENGTH))}
            multiline
            textAlignVertical="top"
            maxLength={MAX_LENGTH}
            blurOnSubmit={false}
            accessibilityLabel="Feedback message"
          />
          {showCounter && (
            <Text
              style={[
                styles.charCounter,
                message.length >= MAX_LENGTH - 10 && styles.charCounterWarning,
              ]}
            >
              {message.length}/{MAX_LENGTH}
            </Text>
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Pressable
            style={styles.cancelBtn}
            onPress={() => router.back()}
            disabled={sending}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>

          <Pressable
            style={[styles.sendBtn, sendDisabled && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={sendDisabled}
            accessibilityRole="button"
            accessibilityLabel="Send feedback"
            accessibilityState={{ disabled: sendDisabled }}
          >
            {sending ? (
              <ActivityIndicator color={styles.sendBtnText.color} size="small" />
            ) : (
              <Text style={styles.sendBtnText}>Send</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </AppScreenContainer>
  );
}

const styles = StyleSheet.create((theme) => ({
  flex: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.large,
    flexGrow: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.foundation.foreground.primary,
    marginBottom: theme.spacing.small,
  },
  textArea: {
    backgroundColor: theme.colors.foundation.background.secondary,
    borderRadius: theme.spacing.normal,
    padding: theme.spacing.normal,
    fontSize: 15,
    color: theme.colors.foundation.foreground.primary,
    minHeight: 160,
    borderWidth: 1,
    borderColor: theme.colors.foundation.background.alpha10,
  },
  placeholder: {
    color: theme.colors.foundation.foreground.tertiary,
  },
  charCounter: {
    fontSize: 12,
    color: theme.colors.foundation.foreground.tertiary,
    textAlign: "right",
    marginTop: theme.spacing.xsmall,
  },
  charCounterWarning: {
    color: theme.colors.foundation.error.foreground.primary,
  },
  footer: {
    flexDirection: "row",
    gap: theme.spacing.normal,
    paddingHorizontal: theme.spacing.large,
    paddingTop: theme.spacing.normal,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.foundation.foreground.tertiary,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: theme.spacing.normal,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: theme.colors.foundation.foreground.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.foundation.foreground.primary,
  },
  sendBtn: {
    flex: 1,
    paddingVertical: theme.spacing.normal,
    borderRadius: 50,
    backgroundColor: theme.colors.foundation.foreground.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    opacity: 0.45,
  },
  sendBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.foundation.background.primary,
  },
}));
