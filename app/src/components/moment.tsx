import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Moment as MomentType } from "@/gql/graphql";
import { WALLET_APP_TAB_PATH } from "@/constants/walletRoutes";
import { ASPECT_RATIO } from "@/utils/constants";
import { getFeedMomentVisibility, UNBLUR_PRICE_YOINKS } from "@/utils/momentVisibility";
import React, { useState, useRef, useEffect } from "react";
import { Alert, Pressable, useWindowDimensions, View } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from "react-native-reanimated";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import Toast from "react-native-toast-message";
import { AuthorInfo } from "./authorInfo";
import { StyledGradient } from "./styledGradient";
import { useMomentActions } from "@/hooks/useMomentActions";
import { useWalletTransferableYoinks } from "@/hooks/useWalletTransferableYoinks";
import { client } from "@/services/client";
import { evictCachedAuthorMomentsList } from "@/services/authorMomentsCache";

import RecycleBinIcon from "@/assets/icons/bin.svg";
import MenuIcon from "@/assets/icons/menu.svg";
import { RootMachineContext } from "@/machines/rootMachine";
import { MomentActions } from "./moment-actions";
import { MomentLockedOverlay } from "./moment-locked-overlay";
import { MomentMedia } from "./moment-media";
import { MomentMenu } from "./moment-menu";
import { MomentCaptionPreview } from "./moment-caption-preview";
import { ClapListSheet } from "./clap-list-sheet";
// CommentListSheet shows the thread of comments for this Moment.
import { CommentListSheet } from "./comment-list-sheet";
import {
  buildReportRouteParams,
  serializeReportRouteParams,
} from "@/navigation/report-route-params";

/** Fired before `onRefresh` after hide/block/delete succeeds (e.g. author profile lists). */
export type MomentBeforeListRefreshPayload = {
  reason: "hide" | "block" | "delete";
  momentId: string;
};

interface MomentProps {
  moment: MomentType;
  isVisibleMedia?: boolean;
  isFeedScreenActive?: boolean;
  isMuted?: boolean;
  onToggleMuted?: () => void;
  onRefresh?: () => void;
  onBeforeListRefresh?: (payload: MomentBeforeListRefreshPayload) => void;
  showFullCaption?: boolean;
}

export const Moment = ({
  moment,
  isVisibleMedia = false,
  isFeedScreenActive = false,
  isMuted = false,
  onToggleMuted = () => {},
  onRefresh = () => {},
  onBeforeListRefresh,
  showFullCaption = false,
}: MomentProps) => {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { theme } = useUnistyles();
  
  const viewerAuthor = RootMachineContext.useSelector(
    (state) => state.context.author as { id: string; name: string; avatar?: string | null } | undefined,
  );
  const viewerAuthorId = viewerAuthor?.id;

  const isMomentAuthor = viewerAuthorId === moment.author.id;

  const walletMachineRef = RootMachineContext.useSelector(
    (state) => state.context.walletMachineRef,
  );
  const rootActor = RootMachineContext.useActorRef();
  const transferableYoinks = useWalletTransferableYoinks(walletMachineRef);

  const { unblurMoment, hideMoment, blockAuthor, deleteMoment, isUnblurring, enqueueClap } = useMomentActions({
    momentId: moment.id,
    momentSequence: moment.sequence || 0,
    authorId: moment.author.id,
  });

  const [optimisticClaps, setOptimisticClaps] = useState(moment.applauseCount || 0);
  const [optimisticViewerClaps, setOptimisticViewerClaps] = useState(moment.viewerApplauseCount || 0);
  const previousViewerClapsRef = useRef(moment.viewerApplauseCount || 0);
  const [optimisticCommentCount, setOptimisticCommentCount] = useState(moment.commentCount ?? 0);

  useEffect(() => {
    setOptimisticClaps(moment.applauseCount || 0);
    setOptimisticViewerClaps(moment.viewerApplauseCount || 0);
    previousViewerClapsRef.current = moment.viewerApplauseCount || 0;
  }, [moment.applauseCount, moment.viewerApplauseCount]);

  useEffect(() => {
    setOptimisticCommentCount(moment.commentCount ?? 0);
  }, [moment.commentCount]);

  useEffect(() => {
    return () => {
      if (hideCounterTimeoutRef.current) {
        clearTimeout(hideCounterTimeoutRef.current);
      }
    };
  }, []);

  const [isViewerInteracting, setIsViewerInteracting] = useState(false);
  const [showRecycleBin, setShowRecycleBin] = useState(false);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isClapListVisible, setIsClapListVisible] = useState(false);
  // Controls whether the comment sheet is open for this Moment.
  const [isCommentSheetVisible, setIsCommentSheetVisible] = useState(false);
  // Optimistic unlock: set to true immediately after a successful unblur so the
  // feed card re-renders without blur before the feed machine's snapshot updates.
  const [isLocallyUnblurred, setIsLocallyUnblurred] = useState(false);
  const hideCounterTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const hideCounterWithDelay = () => {
    if (hideCounterTimeoutRef.current) {
      clearTimeout(hideCounterTimeoutRef.current);
    }
    hideCounterTimeoutRef.current = setTimeout(() => {
      setIsViewerInteracting(false);
      setShowRecycleBin(false);
    }, 1500);
  };

  const handleClapPress = () => {
    if (isMomentAuthor) {
      // Step 32: author opens clap list
      // Step 39: implemented UI
      setIsClapListVisible(true);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const newViewerClaps = optimisticViewerClaps + 1;
    const newClaps = optimisticClaps + 1;
    
    setOptimisticViewerClaps(newViewerClaps);
    setOptimisticClaps(newClaps);
    setIsViewerInteracting(true);
    hideCounterWithDelay();
    
    if (viewerAuthor) {
      enqueueClap(
        { id: viewerAuthor.id, name: viewerAuthor.name, avatar: viewerAuthor.avatar },
        newViewerClaps,
        previousViewerClapsRef.current
      );
    }
  };

  const handleClapLongPress = () => {
    if (isMomentAuthor) return;
    
    if (hideCounterTimeoutRef.current) {
      clearTimeout(hideCounterTimeoutRef.current);
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsViewerInteracting(true);
    setShowRecycleBin(false);
  };

  const handleClapPanUpdate = (translationX: number, translationY: number) => {
    if (isMomentAuthor) return;
    
    // Drag threshold shows recycle state
    const distance = Math.sqrt(translationX * translationX + translationY * translationY);
    if (distance > 60) {
      if (!showRecycleBin) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setShowRecycleBin(true);
      }
    } else {
      if (showRecycleBin) {
        setShowRecycleBin(false);
      }
    }
  };

  const handleClapPanEnd = () => {
    if (isMomentAuthor) return;
    
    if (showRecycleBin) {
      // Release past threshold enqueues zero applause
      const newViewerClaps = 0;
      const newClaps = Math.max(0, optimisticClaps - optimisticViewerClaps);
      
      setOptimisticViewerClaps(newViewerClaps);
      setOptimisticClaps(newClaps);
      
      if (viewerAuthor) {
        enqueueClap(
          { id: viewerAuthor.id, name: viewerAuthor.name, avatar: viewerAuthor.avatar },
          newViewerClaps,
          previousViewerClapsRef.current
        );
      }
    }
    
    hideCounterWithDelay();
  };

  const handleUnblurPress = async () => {
    if (!viewerAuthor) return;

    if (transferableYoinks < UNBLUR_PRICE_YOINKS) {
      Alert.alert("Not enough Yoinks", "You don't have enough Yoinks to unlock this moment.");
      return;
    }

    const result = await unblurMoment({
      id: viewerAuthor.id,
      name: viewerAuthor.name,
      avatar: viewerAuthor.avatar,
    });

    if (!result.success) {
      Alert.alert("Error", result.error || "Failed to unlock content.");
      return;
    }

    // Optimistically clear the blur locally before the feed machine re-snapshots.
    setIsLocallyUnblurred(true);
    rootActor.send({ type: "MOMENT_UNBLURRED" });
  };

  const authorHandle = moment.author.name ?? moment.author.id;

  const handleHideMoment = async () => {
    setIsMenuVisible(false);
    const result = await hideMoment();
    if (!result.success) {
      Alert.alert("Error", result.error ?? "Could not hide this moment. Try again.");
      return;
    }
    onBeforeListRefresh?.({ reason: "hide", momentId: moment.id });
    onRefresh();
    Toast.show({ type: "success", text1: "This moment won't appear in your feed." });
  };

  const handleBlockAuthor = () => {
    setIsMenuVisible(false);
    Alert.alert(
      `Block ${authorHandle}?`,
      "You won't see their content, and they won't be able to interact with you in Yoinks.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            const result = await blockAuthor();
            if (result.success) {
              onBeforeListRefresh?.({ reason: "block", momentId: moment.id });
              onRefresh();
              Toast.show({ type: "success", text1: `You have blocked ${authorHandle}.` });
            } else {
              Alert.alert("Error", result.error || "Failed to block user.");
            }
          },
        },
      ]
    );
  };

  const handleDeleteMoment = () => {
    setIsMenuVisible(false);
    Alert.alert(
      "Delete Moment",
      "Are you sure you want to delete this moment? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const result = await deleteMoment();
            if (result.success) {
              onBeforeListRefresh?.({
                reason: "delete",
                momentId: moment.id,
              });
              onRefresh();
            } else {
              Alert.alert("Error", result.error || "Failed to delete moment.");
            }
          },
        },
      ]
    );
  };

  const handleReportContent = () => {
    setIsMenuVisible(false);
    router.push({
      pathname: "/(app)/report",
      params: serializeReportRouteParams(
        buildReportRouteParams("content", moment)
      ),
    });
  };

  const handleReportUser = () => {
    setIsMenuVisible(false);
    router.push({
      pathname: "/(app)/report",
      params: serializeReportRouteParams(
        buildReportRouteParams("user", moment)
      ),
    });
  };

  const { displayIsBlurred: serverIsBlurred } = getFeedMomentVisibility({
    createdAt: moment.createdAt,
    hasViewerSeen: moment.hasViewerSeen,
    isBlurred: moment.isBlurred,
    isLocal: moment.isLocal,
    viewerAuthorId,
    momentAuthorId: moment.author.id,
  });
  // isLocallyUnblurred overrides the server flag immediately after a successful
  // unlock so the card re-renders without waiting for the feed machine snapshot.
  const isBlurred = serverIsBlurred && !isLocallyUnblurred;
  const isVideo = moment.type === "VIDEO";

  // Legacy: filled clap pill style applies only when the viewer (not author) has claps.
  const hasClaps = optimisticClaps > 0 && !isMomentAuthor;

  return (
    <View style={styles.container(width)}>
      {/*
       * Modals render at the OS level regardless of their position in the JSX
       * tree, so they are safe outside the card View below.
       */}
      <MomentMenu
        visible={isMenuVisible}
        onClose={() => setIsMenuVisible(false)}
        isMomentAuthor={isMomentAuthor}
        onHide={handleHideMoment}
        onBlock={handleBlockAuthor}
        onReportContent={handleReportContent}
        onReportUser={handleReportUser}
        onDelete={handleDeleteMoment}
      />

      <ClapListSheet
        visible={isClapListVisible}
        onClose={() => setIsClapListVisible(false)}
        moment={moment}
      />

      {/* Comment sheet — available to all users (authors and viewers). */}
      <CommentListSheet
        visible={isCommentSheetVisible}
        onClose={() => setIsCommentSheetVisible(false)}
        moment={moment}
        currentAuthor={viewerAuthor}
        onCommentSubmitted={() => setOptimisticCommentCount((c) => c + 1)}
      />

      {/*
       * Card: wraps media + caption into one unified rounded visual object.
       * overflow:hidden clips the media to the top corners and the caption
       * section to the bottom corners — no individual borderRadius needed
       * on child elements.
       */}
      <View style={styles.card}>
        {/* Media section: fixed height, position:relative for all overlay children */}
        <View style={styles.mediaSection(width)}>
          <MomentMedia
            moment={moment}
            isBlurred={isBlurred}
            width={width}
            isVisibleMedia={isVisibleMedia}
            isFeedScreenActive={isFeedScreenActive}
            isMuted={isMuted}
          />

          <StyledGradient
            colors={
              isBlurred
                ? [theme.colors.common.black, "transparent"]
                : ["rgba(0,0,0,0.6)", "transparent"]
            }
            start={isBlurred ? { x: 0, y: 0 } : undefined}
            end={isBlurred ? { x: 0, y: 1 } : undefined}
            locations={isBlurred ? undefined : [0, 0.2]}
            pointerEvents="none"
            style={styles.gradientOverlay}
          />

          <View style={styles.topHeader}>
            <AuthorInfo
              isMomentAuthor={isMomentAuthor}
              createdAt={moment.createdAt}
              author={
                isMomentAuthor && viewerAuthor
                  ? { ...moment.author, name: viewerAuthor.name ?? moment.author.name, avatar: viewerAuthor.avatar ?? moment.author.avatar }
                  : moment.author
              }
              sequence={moment.sequence || 0}
            />

            <Pressable
              style={styles.menuButton}
              onPress={() => setIsMenuVisible(true)}
            >
              <MenuIcon width={24} height={24} color={theme.colors.common.white} />
            </Pressable>
          </View>

          {isBlurred && (
            <>
              <MomentLockedOverlay
                isLocked={moment.isLocked ?? false}
                onUnlockPress={handleUnblurPress}
                isUnblurring={isUnblurring}
              />
              {/* Read-only social counts visible while locked.
                  Interactions are disabled until the moment is unlocked. */}
              <MomentActions
                isVideo={false}
                isMuted={isMuted}
                hasClaps={false}
                claps={moment.applauseCount || 0}
                isMomentAuthor={false}
                commentCount={moment.commentCount ?? 0}
                onToggleMuted={onToggleMuted}
                onClapPress={() => {}}
                onCommentPress={() => {}}
                isLocked={true}
              />
            </>
          )}

          {!isBlurred && (
            <>
              {/* Center count / recycle bin: only for non-author while interacting. */}
              {!isMomentAuthor && isViewerInteracting && (
                <Animated.View style={styles.clapsCountContainer}>
                  {!showRecycleBin ? (
                    <Animated.Text style={styles.clapsTextCount}>
                      {optimisticViewerClaps}
                    </Animated.Text>
                  ) : (
                    <Animated.View>
                      <RecycleBinIcon width={24} height={24} />
                    </Animated.View>
                  )}
                </Animated.View>
              )}

              <MomentActions
                isVideo={isVideo}
                isMuted={isMuted}
                hasClaps={hasClaps}
                claps={optimisticClaps}
                isMomentAuthor={isMomentAuthor}
                commentCount={optimisticCommentCount}
                onToggleMuted={onToggleMuted}
                onClapPress={handleClapPress}
                onCommentPress={() => setIsCommentSheetVisible(true)}
                onClapCountPress={() => setIsClapListVisible(true)}
                onClapLongPress={handleClapLongPress}
                onClapPanUpdate={handleClapPanUpdate}
                onClapPanEnd={handleClapPanEnd}
              />
            </>
          )}
        </View>

        {/*
         * Caption section: rendered below the media only when the moment has a
         * description AND is not blurred. Blurred moments hide the caption until
         * the viewer unlocks the content.
         */}
        {!!moment.description && !isBlurred && (
          <View style={styles.captionSection}>
            <MomentCaptionPreview
              caption={moment.description}
              maxChars={showFullCaption ? Infinity : undefined}
              onReadMore={() =>
                router.push({
                  pathname: "/(app)/single-moment",
                  params: { momentId: moment.id },
                })
              }
            />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create((theme) => ({
  container: (width: number) => ({
    marginBottom: theme.spacing.xlarge,
    width: width,
  }),
  card: {
    borderRadius: theme.spacing.xlarge,
    overflow: "hidden",
    backgroundColor: theme.colors.foundation.background.secondary,
  },
  mediaSection: (width: number) => ({
    width: "100%",
    height: width * ASPECT_RATIO,
    position: "relative",
  }),
  captionSection: {
    backgroundColor: theme.colors.foundation.background.secondary,
    paddingHorizontal: theme.spacing.normal,
    paddingVertical: theme.spacing.small,
  },
  captionText: {
    color: theme.colors.foundation.foreground.primary,
    fontSize: 14, // raw — consistent with other raw font sizes in this file
    lineHeight: 20, // raw — 1.4× for readability
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  topHeader: {
    width: "100%",
    padding: 16,
    position: "absolute",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    pointerEvents: "auto",
  },
  menuButton: {
    width: theme.spacing.xxxlarge,
    height: theme.spacing.xxxlarge,
    backgroundColor: theme.colors.foundation.background.alpha30,
    borderRadius: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  clapsCountContainer: {
    position: "absolute",
    bottom: 32,
    right: 62,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.common.white,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: theme.colors.common.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  clapsTextCount: {
    color: theme.colors.common.black,
    fontSize: 16,
    fontWeight: "700",
  },
}));
