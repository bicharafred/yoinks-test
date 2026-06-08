import { AppHeaderBackButton } from "@/components/navigation/app-header-back-button";
import { AppScreenContainer } from "@/components/navigation/app-screen-container";
import {
  CreateReportDocument,
  type CreateReportMutation,
  type CreateReportMutationVariables,
  HideMomentDocument,
  type HideMomentMutation,
  type HideMomentMutationVariables,
} from "@/gql/graphql";
import { hideCreator } from "@/services/moderationService";
import { evictCachedAuthorMomentsList, evictCachedFeedMomentsList } from "@/services/authorMomentsCache";
import { getAppHeaderOptions } from "@/navigation/app-header-options";
import { parseReportRouteParams } from "@/navigation/report-route-params";
import { client } from "@/services/client";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useCallback, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import Toast from "react-native-toast-message";

const CONTENT_REASONS = [
  { key: "NUDITY_VIOLENCE_SELF_INJURY", label: "Nudity, Violence, self injury" },
  { key: "HATE_SPEECH",                 label: "Hate Speech" },
  { key: "SCAM_FRAUD_SPAM",             label: "Scam, Fraud or Spam" },
  { key: "FALSE_INFORMATION",           label: "False information" },
  { key: "ILLEGAL_ACTIVITY_CRIME",      label: "Illegal activity / Crime" },
];

const USER_REASONS = [
  { key: "IMPERSONATION",         label: "Impersonation" },
  { key: "HARASSMENT_BULLYING",   label: "Harassment or bullying" },
  { key: "SCAM_FRAUD_SPAM",       label: "Scam, Fraud or Spam" },
  { key: "HATE_SPEECH",           label: "Hate Speech" },
  { key: "ILLEGAL_ACTIVITY_CRIME", label: "Illegal activity / Crime" },
  { key: "OTHER",                 label: "Other" },
];

function RadioOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { theme } = useUnistyles();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.radioRow}
      activeOpacity={0.7}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
    >
      <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
        {selected && <View style={styles.radioInner} />}
      </View>
      <Text style={styles.radioLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function ReportScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const raw = useLocalSearchParams<Record<string, string | string[]>>();
  const report = parseReportRouteParams(raw);

  const isContent = report?.type === "content";
  const reasons = isContent ? CONTENT_REASONS : USER_REASONS;
  const screenTitle = isContent ? "Report Content" : "Report User";
  const bodyTitle = isContent
    ? "Why are you reporting this moment?"
    : "Why are you reporting this user?";

  useLayoutEffect(() => {
    navigation.setOptions({
      ...getAppHeaderOptions({
        title: screenTitle,
        leftAction: <AppHeaderBackButton />,
        leftAccessibilityLabel: "Go back",
      }),
    });
  }, [navigation, screenTitle]);

  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = useCallback(async () => {
    if (!report || !selectedReason || sending) return;
    setSending(true);
    try {
      await client.mutate<CreateReportMutation, CreateReportMutationVariables>({
        mutation: CreateReportDocument,
        variables: {
          input: {
            authorId: report.authorId,
            momentId: report.momentId,
            reason: selectedReason,
            description: description.trim() || undefined,
          },
        },
      });

      if (isContent) {
        await client.mutate<HideMomentMutation, HideMomentMutationVariables>({
          mutation: HideMomentDocument,
          variables: { input: { hiddenMomentId: report.momentId } },
        });
        client.cache.evict({ id: `Moment:${report.momentId}` });
        evictCachedAuthorMomentsList(report.authorId);
        client.cache.gc();
      } else {
        await hideCreator(report.authorId);
        evictCachedFeedMomentsList(report.authorId);
        evictCachedAuthorMomentsList(report.authorId);
        client.cache.gc();
      }

      Toast.show({ type: "success", text1: "Thanks for your report." });
      router.back();
    } catch {
      Toast.show({ type: "error" as "info", text1: "Could not send report. Try again." });
    } finally {
      setSending(false);
    }
  }, [report, selectedReason, description, sending, router]);

  if (!report) {
    return (
      <AppScreenContainer>
        <View style={styles.fallback}>
          <Text style={styles.fallbackText}>Missing report parameters.</Text>
        </View>
      </AppScreenContainer>
    );
  }

  const sendDisabled = !selectedReason || sending;

  return (
    <AppScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>{bodyTitle}</Text>
          <Text style={styles.subtitle}>Please give us more details.</Text>

          <View style={styles.reasonsList}>
            {reasons.map((r) => (
              <RadioOption
                key={r.key}
                label={r.label}
                selected={selectedReason === r.key}
                onPress={() => setSelectedReason(r.key)}
              />
            ))}
          </View>

          <TextInput
            style={styles.textArea}
            placeholder="Describe what happened..."
            placeholderTextColor={styles.placeholder.color}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={500}
            accessibilityLabel="Additional description"
          />
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Pressable
            style={styles.cancelBtn}
            onPress={() => router.back()}
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
            accessibilityLabel="Send report"
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
  scroll: {
    padding: theme.spacing.large,
    flexGrow: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.foundation.foreground.primary,
    marginBottom: theme.spacing.xsmall,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.foundation.foreground.secondary,
    marginBottom: theme.spacing.xlarge,
  },
  reasonsList: {
    gap: theme.spacing.normal,
    marginBottom: theme.spacing.xlarge,
  },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.normal,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.foundation.foreground.secondary,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  radioOuterSelected: {
    borderColor: theme.colors.foundation.foreground.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.foundation.foreground.primary,
  },
  radioLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: theme.colors.foundation.foreground.primary,
    flex: 1,
  },
  textArea: {
    backgroundColor: theme.colors.foundation.background.secondary,
    borderRadius: theme.spacing.normal,
    padding: theme.spacing.normal,
    fontSize: 14,
    color: theme.colors.foundation.foreground.primary,
    minHeight: 100,
    borderWidth: 1,
    borderColor: theme.colors.foundation.background.alpha10,
  },
  placeholder: {
    color: theme.colors.foundation.foreground.tertiary,
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
  fallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  fallbackText: {
    color: theme.colors.foundation.foreground.secondary,
    fontSize: 14,
  },
}));
