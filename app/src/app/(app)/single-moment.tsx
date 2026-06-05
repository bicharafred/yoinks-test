import { AppHeaderBackButton } from "@/components/navigation/app-header-back-button";
import { AppScreenContainer } from "@/components/navigation/app-screen-container";
import { Moment } from "@/components/moment";
import {
  GetMomentDocument,
  type GetMomentQuery,
  SetNotificationAsReadDocument,
  type SetNotificationAsReadMutation,
} from "@/gql/graphql";
import { resolveLocalUrl } from "@/utils/apiUrl";
import { RootMachineContext } from "@/machines/rootMachine";
import { getAppHeaderOptions } from "@/navigation/app-header-options";
import { useMutation, useQuery } from "@apollo/client/react";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";

function graphqlErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const gqlErrors = (error as { graphQLErrors?: readonly { message?: string }[] })
      .graphQLErrors;
    if (gqlErrors?.length) {
      return gqlErrors[0]?.message ?? "";
    }
    if ("message" in error && typeof (error as Error).message === "string") {
      return (error as Error).message;
    }
  }
  return "";
}

export default function SingleMomentScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  useLayoutEffect(() => {
    navigation.setOptions({
      ...getAppHeaderOptions({
        title: "Moment",
        leftAction: <AppHeaderBackButton />,
        leftAccessibilityLabel: "Go back",
      }),
    });
  }, [navigation]);

  const { momentSequence, notificationId, isUnread, authorId, momentId } =
    useLocalSearchParams<{
      momentSequence?: string;
      notificationId?: string;
      isUnread?: string;
      authorId?: string;
      momentId?: string;
    }>();

  const author = RootMachineContext.useSelector(
    (s) => s.context.author as { id: string } | null,
  );
  const notificationsActor = RootMachineContext.useSelector(
    (s) => s.context.notificationsMachineRef,
  );

  const [setNotificationAsRead] = useMutation<SetNotificationAsReadMutation>(
    SetNotificationAsReadDocument,
  );

  const readSyncStartedRef = useRef(false);

  // ── Path A: momentId present — REST GET /moments/:id (Read More from feed) ─
  const [restMoment, setRestMoment] =
    useState<GetMomentQuery["getMoment"] | null>(null);
  const [restLoading, setRestLoading] = useState(false);
  const [restError, setRestError] = useState(false);

  useEffect(() => {
    if (!momentId) return;
    const base = resolveLocalUrl(
      (process.env.EXPO_PUBLIC_API_BASE_REST ?? "").replace(/\/$/, ""),
    );
    setRestLoading(true);
    setRestError(false);
    fetch(`${base}/moments/${encodeURIComponent(momentId)}`)
      .then((r) => {
        if (!r.ok) throw new Error("not_found");
        return r.json();
      })
      .then((data) => {
        setRestMoment(data);
        setRestLoading(false);
      })
      .catch(() => {
        setRestError(true);
        setRestLoading(false);
      });
  }, [momentId]);

  // ── Path B: momentSequence present — GraphQL GetMoment (notification links) ─
  const sequenceParsed = momentSequence != null ? Number(momentSequence) : NaN;
  const sequenceValid =
    Number.isFinite(sequenceParsed) && !Number.isNaN(sequenceParsed);
  const resolvedAuthorId = authorId ?? author?.id ?? "";

  const {
    data: gqlData,
    loading: gqlLoading,
    error: gqlError,
    refetch: gqlRefetch,
  } = useQuery<GetMomentQuery>(GetMomentDocument, {
    variables: {
      input: {
        authorId: resolvedAuthorId,
        sequence: sequenceParsed,
      },
    },
    skip: !!momentId || !resolvedAuthorId || !sequenceValid,
  });

  const [isMuted, setIsMuted] = useState(true);

  // Mark notification as read — only relevant for notification deeplinks.
  useEffect(() => {
    if (isUnread !== "true" || notificationId == null || notificationId === "") {
      return;
    }
    if (readSyncStartedRef.current) {
      return;
    }
    readSyncStartedRef.current = true;
    void (async () => {
      try {
        await setNotificationAsRead({ variables: { notificationId } });
        notificationsActor?.send({
          type: "SET_AS_READ",
          payload: { notificationId },
        });
      } catch (readError: unknown) {
        readSyncStartedRef.current = false;
        console.warn("SetNotificationAsRead failed", readError);
      }
    })();
  }, [isUnread, notificationId, notificationsActor, setNotificationAsRead]);

  if (author?.id == null) {
    return (
      <AppScreenContainer>
        <View style={styles.centered}>
          <Text style={styles.body}>You need to be signed in to view this moment.</Text>
        </View>
      </AppScreenContainer>
    );
  }

  // Sequence validation only applies to notification deeplinks (path B).
  if (!momentId && !sequenceValid) {
    return (
      <AppScreenContainer>
        <View style={styles.centered}>
          <Text style={styles.body}>Invalid moment link.</Text>
        </View>
      </AppScreenContainer>
    );
  }

  const isLoading = momentId ? restLoading : gqlLoading;
  if (isLoading) {
    return (
      <AppScreenContainer>
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      </AppScreenContainer>
    );
  }

  if (momentId && restError) {
    return (
      <AppScreenContainer>
        <View style={styles.centered}>
          <Text style={styles.body}>Something went wrong.</Text>
        </View>
      </AppScreenContainer>
    );
  }

  const errMsg = graphqlErrorMessage(gqlError);
  if (!momentId && gqlError != null && errMsg !== "No moment found") {
    return (
      <AppScreenContainer>
        <View style={styles.centered}>
          <Text style={styles.body}>Something went wrong.</Text>
        </View>
      </AppScreenContainer>
    );
  }

  const moment = momentId ? restMoment : gqlData?.getMoment;

  if (moment == null) {
    return (
      <AppScreenContainer>
        <View style={styles.centered}>
          <Text style={styles.body}>Moment not found.</Text>
        </View>
      </AppScreenContainer>
    );
  }

  return (
    <AppScreenContainer>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom }]}
        keyboardShouldPersistTaps="handled"
      >
        <Moment
          moment={moment}
          isVisibleMedia
          isFeedScreenActive
          showFullCaption
          isMuted={isMuted}
          onToggleMuted={() => setIsMuted((v) => !v)}
          onRefresh={() => {
            if (!momentId) void gqlRefetch();
          }}
        />
      </ScrollView>
    </AppScreenContainer>
  );
}

const styles = StyleSheet.create((theme) => ({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.normal,
  },
  body: {
    color: theme.colors.foundation.foreground.primary,
    fontSize: 16,
    textAlign: "center",
  },
  scrollContent: {
    flexGrow: 1,
    width: "100%",
  },
}));
