import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import {
  memo,
  useCallback,
  type ComponentProps,
  type NamedExoticComponent,
} from "react";
import { useRouter } from "expo-router";
import { Image, Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import FeedFillIcon from "@/assets/icons/feed.fill.svg";
import FeedOutlineIcon from "@/assets/icons/feed.outline.svg";
import NotificationsIcon from "@/assets/icons/notifications.outline.svg";
import PlusIcon from "@/assets/icons/circle.plus.fill.svg";
import WalletIcon from "@/assets/icons/wallet.outline.svg";
import { RootMachineContext } from "@/machines/rootMachine";
import { getAppTabBarBadgeBorderColor } from "@/navigation/app-tab-bar-chrome";
import { notifyFeedTabRepress } from "@/navigation/feed-tab-repress-registry";
import {
  APP_CREATE_MOMENT_HREF,
  getAppTabConfig,
} from "@/navigation/app-tabs.config";

const avatarFallbackImage = require("@/assets/images/avatar.png");

const NOTIFICATIONS_UNREAD_DOT_SIZE = 8;
const NOTIFICATIONS_UNREAD_DOT_BORDER = 1.5;

const STANDARD_ICON_SIZE = 32;
const CREATE_ICON_SIZE = 40;
const HIT_SIZE = 48;

type CommonNavItemProps = {
  readonly routeKey: string;
  readonly routeName: string;
  readonly routeParams: Readonly<Record<string, unknown>> | undefined;
  readonly stateIndex: number;
  readonly index: number;
  readonly isFocused: boolean;
  readonly options: NonNullable<BottomTabBarProps["descriptors"][string]>["options"];
  readonly navigation: BottomTabBarProps["navigation"];
};

const AppTabBarCenterPlusItemBase = (props: CommonNavItemProps & {
  readonly color: string;
}) => {
  const {
    routeKey,
    routeName,
    routeParams,
    stateIndex,
    index,
    isFocused,
    options,
    navigation,
    color,
  } = props;

  const router = useRouter();

  const onPress = useCallback(() => {
    const event = navigation.emit({
      type: "tabPress",
      target: routeKey,
      canPreventDefault: true,
    });

    if (event.defaultPrevented) {
      return;
    }

    if (routeName === "create") {
      router.push(APP_CREATE_MOMENT_HREF);
      return;
    }

    if (stateIndex !== index) {
      navigation.navigate(
        routeName,
        routeParams as object | undefined,
      );
    }
  }, [navigation, routeKey, routeName, routeParams, router, stateIndex, index]);

  const onLongPress = useCallback(() => {
    navigation.emit({ type: "tabLongPress", target: routeKey });
  }, [navigation, routeKey]);

  const a11yLabel =
    options.tabBarAccessibilityLabel ??
    getAppTabConfig(routeName)?.accessibilityLabel ??
    (typeof options.title === "string" ? options.title : null) ??
    routeName;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={a11yLabel}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.centerPlusPressable}
    >
      <View accessible={false} importantForAccessibility="no-hide-descendants">
        <PlusIcon
          width={CREATE_ICON_SIZE}
          height={CREATE_ICON_SIZE}
          color={color}
        />
      </View>
    </Pressable>
  );
};

const areCenterItemPropsEqual = (
  prev: Readonly<ComponentProps<typeof AppTabBarCenterPlusItemBase>>,
  next: Readonly<ComponentProps<typeof AppTabBarCenterPlusItemBase>>,
): boolean =>
  prev.routeKey === next.routeKey &&
  prev.isFocused === next.isFocused &&
  prev.stateIndex === next.stateIndex &&
  prev.index === next.index &&
  prev.routeName === next.routeName &&
  prev.options === next.options &&
  prev.navigation === next.navigation &&
  prev.color === next.color &&
  prev.routeParams === next.routeParams;

export const AppTabBarCenterPlusItem = memo(
  AppTabBarCenterPlusItemBase,
  areCenterItemPropsEqual,
);

type AppTabBarStandardItemProps = CommonNavItemProps & {
  readonly inactiveIconColor: string;
  readonly selectedBackgroundColor: string;
  readonly selectedIconColor: string;
  /** Parent-owned unread flag for the Notifications tab (visual + screen reader). */
  readonly unreadA11yState: boolean;
};

const AppTabBarStandardItemBase = (props: AppTabBarStandardItemProps) => {
  const {
    routeKey,
    routeName,
    routeParams,
    stateIndex,
    index,
    isFocused,
    options,
    navigation,
    inactiveIconColor,
    selectedBackgroundColor,
    selectedIconColor,
    unreadA11yState,
  } = props;

  const onPress = useCallback(() => {
    const event = navigation.emit({
      type: "tabPress",
      target: routeKey,
      canPreventDefault: true,
    });

    if (stateIndex !== index && !event.defaultPrevented) {
      navigation.navigate(
        routeName,
        routeParams as object | undefined,
      );
    } else if (
      stateIndex === index &&
      routeName === "feed" &&
      !event.defaultPrevented
    ) {
      notifyFeedTabRepress();
    }
  }, [navigation, routeKey, routeName, routeParams, stateIndex, index]);

  const onLongPress = useCallback(() => {
    navigation.emit({ type: "tabLongPress", target: routeKey });
  }, [navigation, routeKey]);

  const iconColor = isFocused ? selectedIconColor : inactiveIconColor;
  const baseA11yLabel =
    options.tabBarAccessibilityLabel ??
    getAppTabConfig(routeName)?.accessibilityLabel ??
    (typeof options.title === "string" ? options.title : null) ??
    routeName;
  const accessibilityLabel =
    routeName === "notifications" && unreadA11yState
      ? `${baseA11yLabel}, unread`
      : baseA11yLabel;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tabPressable}
    >
      <View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.iconFocusCircle,
          isFocused && { backgroundColor: selectedBackgroundColor },
        ]}
      >
        <TabIcon
          routeName={routeName}
          color={iconColor}
          isFocused={isFocused}
          hasUnreadNotifications={unreadA11yState}
        />
      </View>
    </Pressable>
  );
};

const areStandardItemPropsEqual = (
  prev: Readonly<AppTabBarStandardItemProps>,
  next: Readonly<AppTabBarStandardItemProps>,
): boolean =>
  prev.routeKey === next.routeKey &&
  prev.isFocused === next.isFocused &&
  prev.stateIndex === next.stateIndex &&
  prev.index === next.index &&
  prev.routeName === next.routeName &&
  prev.options === next.options &&
  prev.navigation === next.navigation &&
  prev.inactiveIconColor === next.inactiveIconColor &&
  prev.selectedBackgroundColor === next.selectedBackgroundColor &&
  prev.selectedIconColor === next.selectedIconColor &&
  prev.routeParams === next.routeParams &&
  prev.unreadA11yState === next.unreadA11yState;

export const AppTabBarStandardItem: NamedExoticComponent<AppTabBarStandardItemProps> = memo<AppTabBarStandardItemProps>(
  AppTabBarStandardItemBase,
  areStandardItemPropsEqual,
);

const ProfileTabBarAvatarBase = () => {
  const avatar = RootMachineContext.useSelector(
    (state) => state.context.author?.avatar ?? null,
  );
  const source =
    typeof avatar === "string" && avatar.length > 0
      ? { uri: avatar }
      : avatarFallbackImage;
  return (
    <Image
      source={source}
      style={styles.avatar}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
};

const ProfileTabBarAvatar = memo(ProfileTabBarAvatarBase);

const NotificationsTabBarIconBase = ({
  color,
  isFocused,
  hasUnread,
}: {
  readonly color: string;
  readonly isFocused: boolean;
  readonly hasUnread: boolean;
}) => {
  const { theme } = useUnistyles();
  const badgeBorderColor = getAppTabBarBadgeBorderColor(theme, isFocused);

  return (
    <View
      style={styles.notificationsIconWrap}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <NotificationsIcon
        width={STANDARD_ICON_SIZE}
        height={STANDARD_ICON_SIZE}
        color={color}
      />
      {hasUnread ? (
        <View
          style={[
            styles.unreadNotificationDot,
            {
              backgroundColor: theme.colors.foundation.error.foreground.tertiary,
              borderColor: badgeBorderColor,
            },
          ]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
        />
      ) : null}
    </View>
  );
};

const NotificationsTabBarIcon = memo(NotificationsTabBarIconBase);

function TabIcon({
  routeName,
  color,
  isFocused,
  hasUnreadNotifications = false,
}: {
  readonly routeName: string;
  readonly color: string;
  readonly isFocused: boolean;
  /**
   * Only used for the notifications route; driven by the parent tab bar
   * so a11y text and the badge stay in sync without extra context subscriptions.
   */
  readonly hasUnreadNotifications?: boolean;
}) {
  switch (routeName) {
    case "feed":
      return isFocused ? (
        <FeedFillIcon
          width={STANDARD_ICON_SIZE}
          height={STANDARD_ICON_SIZE}
          color={color}
        />
      ) : (
        <FeedOutlineIcon
          width={STANDARD_ICON_SIZE}
          height={STANDARD_ICON_SIZE}
          color={color}
        />
      );
    case "notifications":
      return (
        <NotificationsTabBarIcon
          color={color}
          isFocused={isFocused}
          hasUnread={hasUnreadNotifications}
        />
      );
    case "wallet":
      return (
        <WalletIcon
          width={STANDARD_ICON_SIZE}
          height={STANDARD_ICON_SIZE}
          color={color}
        />
      );
    case "profile":
      return <ProfileTabBarAvatar />;
    default:
      return null;
  }
}

const styles = StyleSheet.create((theme) => ({
  centerPlusPressable: {
    minWidth: HIT_SIZE,
    minHeight: HIT_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  tabPressable: {
    minWidth: HIT_SIZE,
    minHeight: HIT_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  iconFocusCircle: {
    width: HIT_SIZE,
    height: HIT_SIZE,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatar: {
    width: STANDARD_ICON_SIZE,
    height: STANDARD_ICON_SIZE,
    borderRadius: 800,
    borderWidth: 1,
    borderColor: theme.colors.foundation.background.alpha10,
  },
  notificationsIconWrap: {
    width: STANDARD_ICON_SIZE,
    height: STANDARD_ICON_SIZE,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  unreadNotificationDot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: NOTIFICATIONS_UNREAD_DOT_SIZE,
    height: NOTIFICATIONS_UNREAD_DOT_SIZE,
    borderRadius: 100,
    borderWidth: NOTIFICATIONS_UNREAD_DOT_BORDER,
  },
}));
