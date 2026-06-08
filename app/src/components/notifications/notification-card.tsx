import ExclamationRoundedIcon from "@/assets/icons/exclamation.rounded.svg";
import WalletOutlineIcon from "@/assets/icons/wallet.outline.svg";
import YoinksKoinsIcon from "@/assets/icons/yoinks.koins.svg";
import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

const AVATAR_PLACEHOLDER = require("@/assets/images/avatar.png");

export interface NotificationCardProps {
  /** Payload type from notifications API or synthetic rows */
  type: string;
  isUnread?: boolean;
  avatarUrl?: string;
  title: React.ReactNode;
  /** Secondary line below title (relative time, etc.) */
  time?: string;
  /** Optional extra line between title and time when needed */
  subtitle?: string;
  rightImageUrl?: string;
  onDiscard?: () => void;
  onRetry?: () => void;
  onAuthorPress?: () => void;
}

export function NotificationCard({
  type,
  isUnread,
  avatarUrl,
  title,
  time,
  subtitle,
  rightImageUrl,
  onDiscard,
  onRetry,
  onAuthorPress,
}: NotificationCardProps) {
  const { theme } = useUnistyles();

  const renderLeft = () => {
    if (type === "error") {
      return (
        <View accessible={false}>
          <ExclamationRoundedIcon
            width={40}
            height={40}
            color={theme.colors.foundation.error.foreground.primary}
          />
        </View>
      );
    }

    const showRemoteAvatar =
      type !== "UNBLUR_MOMENT" && typeof avatarUrl === "string";

    if (showRemoteAvatar) {
      const avatarImg = (
        <Image
          accessibilityIgnoresInvertColors
          source={{ uri: avatarUrl }}
          style={styles.avatar}
        />
      );
      if (onAuthorPress) {
        return (
          <Pressable
            onPress={onAuthorPress}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="View profile"
          >
            {avatarImg}
          </Pressable>
        );
      }
      return avatarImg;
    }

    return (
      <Image
        accessibilityIgnoresInvertColors
        accessibilityLabel="Default avatar"
        source={AVATAR_PLACEHOLDER}
        style={styles.avatar}
      />
    );
  };

  const renderRight = () => {
    if (type === "UNBLUR_MOMENT") {
      return (
        <View accessibilityLabel="Wallet">
          <WalletOutlineIcon
            width={32}
            height={32}
            color={theme.colors.foundation.foreground.primary}
          />
        </View>
      );
    }

    if (type === "invite") {
      return (
        <View style={styles.inviteRight} accessibilityLabel="Invite reward plus one Yoinks">
          <Text style={styles.invitePlus}>+1</Text>
          <YoinksKoinsIcon
            width={24}
            height={24}
            color={theme.colors.foundation.foreground.primary}
          />
        </View>
      );
    }

    if (typeof rightImageUrl === "string") {
      return (
        <Image
          accessibilityIgnoresInvertColors
          accessibilityLabel="Attachment thumbnail"
          source={{ uri: rightImageUrl }}
          style={styles.rightImage}
        />
      );
    }

    return null;
  };

  const renderFooter = () => {
    // Error-row actions are deferred until discard/retry backend contracts exist.
    if (type !== "error" || (onDiscard == null && onRetry == null)) {
      return null;
    }

    return (
      <View style={styles.footerContainer}>
        {onDiscard != null ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Discard error notification"
            onPress={onDiscard}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          >
            <Text style={styles.buttonText}>Discard</Text>
          </Pressable>
        ) : null}
        {onRetry != null ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Try uploading again"
            onPress={onRetry}
            style={({ pressed }) => [
              styles.button,
              styles.buttonPrimary,
              pressed && styles.buttonPrimaryPressed,
            ]}
          >
            <Text style={[styles.buttonText, styles.buttonTextPrimary]}>
              Try Again
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  };

  const isError = type === "error";

  return (
    <View style={styles.outer}>
      <View style={styles.row}>
        <View style={styles.dotColumn}>
          {isUnread ? <View style={styles.unreadDot} accessibilityLabel="Unread" /> : null}
        </View>

        <View style={styles.leftColumn}>{renderLeft()}</View>

        <View style={styles.centerColumn}>
          <Text
            style={[styles.headerText, isError && styles.errorText]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitleText} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
          {time ? (
            <Text style={styles.timeText} numberOfLines={1}>
              {time}
            </Text>
          ) : null}
        </View>

        <View style={styles.rightColumn}>{renderRight()}</View>
      </View>

      {renderFooter()}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  outer: {
    width: "100%",
    paddingVertical: theme.spacing.small,
    paddingHorizontal: theme.spacing.normal,
    backgroundColor: theme.colors.foundation.background.primary,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  dotColumn: {
    width: 12,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 6,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.foundation.brand.background.primary,
  },
  leftColumn: {
    marginRight: theme.spacing.small,
    justifyContent: "center",
    alignItems: "center",
    width: 40,
  },
  centerColumn: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.small,
    minWidth: 0,
  },
  rightColumn: {
    marginLeft: theme.spacing.small,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 40,
  },
  headerText: {
    fontSize: 14,
    color: theme.colors.foundation.foreground.primary,
    fontWeight: "400",
  },
  errorText: {
    color: theme.colors.foundation.error.foreground.primary,
  },
  subtitleText: {
    fontSize: 13,
    color: theme.colors.foundation.foreground.secondary,
    marginTop: theme.spacing.xxsmall,
  },
  timeText: {
    fontSize: 12,
    color: theme.colors.foundation.foreground.tertiary,
    marginTop: 2,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 20,
    backgroundColor: theme.colors.foundation.background.secondary,
  },
  rightImage: {
    width: 40,
    height: 54,
    borderRadius: 4,
    backgroundColor: theme.colors.foundation.background.skeleton,
  },
  footerContainer: {
    flexDirection: "row",
    marginTop: theme.spacing.small,
    gap: theme.spacing.small,
  },
  button: {
    flex: 1,
    minHeight: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.foundation.foreground.primary,
  },
  buttonPrimary: {
    backgroundColor: theme.colors.foundation.foreground.primary,
    borderColor: theme.colors.foundation.foreground.primary,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonPrimaryPressed: {
    opacity: 0.85,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.foundation.foreground.primary,
  },
  buttonTextPrimary: {
    color: theme.colors.foundation.background.primary,
  },
  inviteRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  invitePlus: {
    fontWeight: "700",
    fontSize: 14,
    color: theme.colors.foundation.foreground.primary,
  },
}));
