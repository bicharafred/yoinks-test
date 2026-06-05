import DocumentFillIcon from "@/assets/icons/document.fill.svg";
import { AppScreenContainer } from "@/components/navigation/app-screen-container";
import {
  WalletBalanceCard,
  WalletTabs,
  type WalletTabsValue,
} from "@/components/wallet";
import { RootMachineContext } from "@/machines/rootMachine";
import type { WalletMachineActorRef } from "@/machines/walletMachine";
import { walletMachine } from "@/machines/walletMachine";
import { getAppHeaderOptions } from "@/navigation/app-header-options";
import { getAppTabBarScrollContentBottomPadding } from "@/navigation/app-tab-bar-layout";
import {
  openPrivacyPolicyUrl,
  openTermsOfServiceUrl,
} from "@/services/legalUrlsService";
import {
  fetchPayoutHistory,
  mockEarnDev,
  requestPayout,
} from "@/wallet/walletService";
import type { PayoutRecord, WalletOffering } from "@/wallet/walletTypes";
import {
  formatRedeemableBalance,
} from "@/wallet/walletUtils";
import { runtimeConfig } from "@/config/runtimeConfig";
import { PayoutTab } from "@/wallet/components/PayoutTab";
import { YoinksTab } from "@/wallet/components/YoinksTab";
import { WalletInfoModal, type InfoKind } from "@/wallet/components/WalletInfoModal";
import { useSelector } from "@xstate/react";
import { Tabs, useFocusEffect, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import type { SnapshotFrom } from "xstate";

type WalletSnapshot = SnapshotFrom<typeof walletMachine>;

function walletBootstrapping(snapshot: WalletSnapshot): boolean {
  return (
    snapshot.matches("initializing") ||
    snapshot.matches("settingUpOfferings") ||
    snapshot.matches("gettingBalance") ||
    snapshot.matches("gettingStripeConnectedAccountStatus")
  );
}

function WalletScreenWithActor({
  actor,
  contentBottomPadding,
}: {
  actor: WalletMachineActorRef;
  contentBottomPadding: number;
}) {
  const { theme } = useUnistyles();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const prevNonceRef = useRef(0);
  // Synchronous guard so rapid taps can't fire BUY_SELECTED_OFFERING twice before
  // the XState machine has re-rendered and the `buying` selector catches up.
  const isProcessingRef = useRef(false);

  const [segment, setSegment] = useState<WalletTabsValue>("yoinks");
  const [infoOpen, setInfoOpen] = useState<InfoKind | null>(null);
  const [payoutHistory, setPayoutHistory] = useState<PayoutRecord[]>([]);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutRequesting, setPayoutRequesting] = useState(false);
  const [earningsSeeding, setEarningsSeeding] = useState(false);

  const {
    transferableYoinks,
    redeemable,
    redeemableFormatted,
    offerings,
    selectedOfferingType,
    error,
    refreshing,
    buying,
    bootstrapping,
    purchaseScrollNonce,
    hasValidSelection,
  } = useSelector(actor, (snapshot) => {
    const ctx = snapshot.context;
    const sel = ctx.selectedOfferingType.trim();
    const hasSel =
      sel !== "" && ctx.offerings.some((o: WalletOffering) => o.type === sel);
    return {
      transferableYoinks: ctx.transferableYoinks,
      redeemable: ctx.redeemable,
      redeemableFormatted: formatRedeemableBalance(ctx.redeemable),
      offerings: ctx.offerings as WalletOffering[],
      selectedOfferingType: ctx.selectedOfferingType,
      error: ctx.error,
      refreshing: snapshot.matches("refreshing"),
      buying: snapshot.matches("buyingSelectedOffering"),
      bootstrapping: walletBootstrapping(snapshot),
      purchaseScrollNonce: ctx.purchaseScrollNonce,
      hasValidSelection: hasSel,
    };
  });

  useEffect(() => {
    if (purchaseScrollNonce > prevNonceRef.current) {
      prevNonceRef.current = purchaseScrollNonce;
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  }, [purchaseScrollNonce]);

  // Reset the synchronous processing guard once the machine leaves buyingSelectedOffering.
  useEffect(() => {
    if (!buying) {
      isProcessingRef.current = false;
    }
  }, [buying]);

  // Reload payout history whenever the balance tab becomes active (mock payout mode).
  useEffect(() => {
    if (!runtimeConfig.enableMockPayout || segment !== "balance") return;
    setPayoutLoading(true);
    fetchPayoutHistory()
      .then(setPayoutHistory)
      .catch(() => {})
      .finally(() => setPayoutLoading(false));
  }, [segment]);

  useFocusEffect(
    useCallback(() => {
      actor.send({ type: "REFRESH_BALANCE" });
    }, [actor]),
  );

  const iconColorPrimary = theme.colors.foundation.foreground.primary;

  const openYoinksInfo = useCallback(() => setInfoOpen("yoinks"), []);
  const openBalanceInfo = useCallback(() => setInfoOpen("balance"), []);
  const closeInfo = useCallback(() => setInfoOpen(null), []);

  const handleRefresh = useCallback(() => {
    actor.send({ type: "REFRESH_BALANCE" });
  }, [actor]);

  const handleSelectOffering = useCallback(
    (offeringType: string) => {
      if (buying || bootstrapping) return;
      actor.send({ type: "SELECT_OFFERING", offeringType });
    },
    [actor, bootstrapping, buying],
  );

  const handleContinue = useCallback(() => {
    if (!hasValidSelection || buying || isProcessingRef.current) return;
    isProcessingRef.current = true;
    actor.send({ type: "BUY_SELECTED_OFFERING" });
  }, [actor, buying, hasValidSelection]);

  const handleRequestPayout = useCallback(() => {
    if (payoutRequesting || redeemable <= 0) return;
    setPayoutRequesting(true);
    requestPayout(Math.round(redeemable * 100))
      .then(() => {
        actor.send({ type: "REFRESH_BALANCE" });
        return fetchPayoutHistory();
      })
      .then(setPayoutHistory)
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Payout request failed. Try again.";
        Alert.alert("Payout", msg);
      })
      .finally(() => setPayoutRequesting(false));
  }, [actor, payoutRequesting, redeemable]);

  const handleSeedEarnings = useCallback(() => {
    if (earningsSeeding) return;
    setEarningsSeeding(true);
    mockEarnDev(500)
      .then(() => {
        actor.send({ type: "REFRESH_BALANCE" });
        return fetchPayoutHistory();
      })
      .then(setPayoutHistory)
      .catch(() => {})
      .finally(() => setEarningsSeeding(false));
  }, [actor, earningsSeeding]);

  const handlePressLegalTerms = useCallback(async () => {
    const result = await openTermsOfServiceUrl();
    if (!result.ok) Alert.alert("Terms of use", result.message);
  }, []);

  const handlePressLegalPrivacy = useCallback(async () => {
    const result = await openPrivacyPolicyUrl();
    if (!result.ok) Alert.alert("Privacy Policy", result.message);
  }, []);

  const walletHeaderOptions = useMemo(
    () =>
      getAppHeaderOptions({
        title: "Wallet",
        rightAction: (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View transactions"
            hitSlop={12}
            onPress={() => router.push("/(app)/transactions")}
          >
            <DocumentFillIcon width={24} height={24} color={iconColorPrimary} />
          </Pressable>
        ),
        rightAccessibilityLabel: "View transactions",
      }),
    [iconColorPrimary],
  );

  const yoinksLabel = String(
    Number.isFinite(transferableYoinks) ? transferableYoinks : 0,
  );
  const balanceLabel = `$${redeemableFormatted}`;
  const continueDisabled = !hasValidSelection || buying;

  return (
    <>
      <Tabs.Screen options={walletHeaderOptions} />

      <WalletInfoModal
        balanceLabel={balanceLabel}
        infoOpen={infoOpen}
        yoinksLabel={yoinksLabel}
        onDismiss={closeInfo}
      />

      <Modal
        accessibilityLabel="Checkout in progress"
        accessibilityViewIsModal
        animationType="fade"
        statusBarTranslucent
        transparent
        visible={buying}
      >
        <View style={styles.paymentBlocker}>
          <View pointerEvents="none" style={styles.paymentBlockerScrim} />
          <ActivityIndicator
            accessibilityLabel="Checkout loading indicator"
            color={iconColorPrimary}
            size="large"
            style={styles.paymentBlockerSpinner}
          />
        </View>
      </Modal>

      <AppScreenContainer>
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl onRefresh={handleRefresh} refreshing={refreshing} />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: contentBottomPadding },
          ]}
        >
          {bootstrapping ? (
            <View accessibilityLabel="Loading wallet" style={styles.inlineLoader}>
              <ActivityIndicator />
            </View>
          ) : null}

          {error != null && error !== "" ? (
            <Text accessibilityRole="alert" style={styles.errorBanner}>
              {error}
            </Text>
          ) : null}

          <View style={styles.narrowColumn}>
            <WalletTabs onChange={setSegment} value={segment} />

            {segment === "yoinks" ? (
              <WalletBalanceCard
                amountLabel={yoinksLabel}
                iconColor={iconColorPrimary}
                infoAccessibilityHint="Opens explanation about Yoinks"
                infoAccessibilityLabel="What Are Yoinks?"
                trailing={
                  refreshing ? (
                    <ActivityIndicator
                      accessibilityLabel="Refreshing balance"
                      color={iconColorPrimary}
                      size="small"
                    />
                  ) : null
                }
                variant="yoinks"
                onInfoPress={openYoinksInfo}
              />
            ) : (
              <WalletBalanceCard
                amountLabel={balanceLabel}
                iconColor={iconColorPrimary}
                infoAccessibilityHint="Opens explanation about balance"
                infoAccessibilityLabel="What is Balance?"
                trailing={
                  refreshing ? (
                    <ActivityIndicator
                      accessibilityLabel="Refreshing balance"
                      color={iconColorPrimary}
                      size="small"
                    />
                  ) : null
                }
                variant="balance"
                onInfoPress={openBalanceInfo}
              />
            )}
          </View>

          {segment === "yoinks" ? (
            <YoinksTab
              bootstrapping={bootstrapping}
              buying={buying}
              continueDisabled={continueDisabled}
              offerings={offerings}
              selectedOfferingType={selectedOfferingType}
              onContinue={handleContinue}
              onPressLegalPrivacy={handlePressLegalPrivacy}
              onPressLegalTerms={handlePressLegalTerms}
              onSelectOffering={handleSelectOffering}
            />
          ) : (
            <PayoutTab
              earningsSeeding={earningsSeeding}
              iconColorPrimary={iconColorPrimary}
              payoutHistory={payoutHistory}
              payoutLoading={payoutLoading}
              payoutRequesting={payoutRequesting}
              redeemable={redeemable}
              onRequestPayout={handleRequestPayout}
              onSeedEarnings={handleSeedEarnings}
            />
          )}
        </ScrollView>
      </AppScreenContainer>
    </>
  );
}

export default function WalletScreen() {
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();

  const tabBarScrollBottomPadding = useMemo(
    () => getAppTabBarScrollContentBottomPadding(insets.bottom, theme),
    [insets.bottom, theme],
  );

  const walletActor = RootMachineContext.useSelector(
    (s) => s.context.walletMachineRef,
  );

  if (walletActor == null) {
    return (
      <>
        <Tabs.Screen options={getAppHeaderOptions({ title: "Wallet" })} />
        <AppScreenContainer>
          <View style={styles.fallbackWrap}>
            <Text style={styles.fallbackTitle}>Wallet</Text>
            <Text style={styles.fallbackBody}>
              Wallet is unavailable until you sign in with a valid account.
            </Text>
          </View>
        </AppScreenContainer>
      </>
    );
  }

  return (
    <WalletScreenWithActor
      actor={walletActor}
      contentBottomPadding={tabBarScrollBottomPadding}
    />
  );
}

const styles = StyleSheet.create((theme) => ({
  scrollContent: {
    paddingHorizontal: theme.spacing.normal,
    paddingTop: theme.spacing.normal,
    flexGrow: 1,
    alignItems: "center",
  },
  narrowColumn: {
    width: "90%",
    alignSelf: "center",
  },
  inlineLoader: {
    alignItems: "center",
    paddingVertical: theme.spacing.small,
  },
  errorBanner: {
    padding: theme.spacing.normal,
    borderRadius: theme.spacing.large,
    backgroundColor: theme.colors.foundation.error.background.secondary,
    borderWidth: 1,
    borderColor: theme.colors.foundation.error.foreground.tertiary,
    fontSize: theme.spacing.small,
    color: theme.colors.foundation.error.foreground.primary,
    overflow: "hidden",
  },
  fallbackWrap: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.large,
  },
  fallbackTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.foundation.foreground.primary,
    marginBottom: theme.spacing.small,
  },
  fallbackBody: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.foundation.foreground.secondary,
  },
  paymentBlocker: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  paymentBlockerScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.foundation.background.alpha50,
  },
  paymentBlockerSpinner: {
    zIndex: 1,
  },
}));
