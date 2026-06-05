import type { NotificationListItem } from "@/components/notifications/notification-list";
import type { NotificationsMachineItem } from "@/machines/notificationsMachine";
import { formatNotificationRelativeTime } from "@/utils/formatDuration";
import type { ReactNode } from "react";
import { Text } from "react-native";

const boldViewerNameStyle = { fontWeight: "700" as const };

/**
 * Maps API notification type strings to values understood by NotificationCard.
 */
export function toNotificationCardType(type: string | undefined): string {
  if (type == null || type === "") {
    return "DEFAULT";
  }
  const upper = type.toUpperCase();
  if (upper === "ERROR") {
    return "error";
  }
  if (upper === "INVITE") {
    return "invite";
  }
  if (upper === "UNBLUR_MOMENT") {
    return "UNBLUR_MOMENT";
  }
  return type;
}

function buildTitleNode(params: {
  cardType: string;
  viewerName?: string;
  message: string;
  apiTitle: string;
}): ReactNode {
  const { cardType, viewerName, message, apiTitle } = params;
  const name = viewerName?.trim();
  const body = message.trim() || apiTitle.trim() || "Notification";

  if (cardType === "error" || cardType === "UNBLUR_MOMENT") {
    if (name) {
      return `${name} ${body}`;
    }
    return body;
  }

  if (name) {
    return [
      <Text key="viewer" style={boldViewerNameStyle}>
        {name}
      </Text>,
      <Text key="body">{` ${body}`}</Text>,
    ];
  }

  return body;
}

/**
 * Maps XState notification rows (GraphQL-backed) to list/card props.
 */
export function mapMachineNotificationToListItem(
  row: NotificationsMachineItem,
): NotificationListItem {
  const cardType = toNotificationCardType(row.type);
  const title = buildTitleNode({
    cardType,
    viewerName: row.viewerName,
    message: row.message,
    apiTitle: row.apiTitle ?? "",
  });

  const rightImageUrl =
    cardType === "UNBLUR_MOMENT" ? undefined : row.rightImageUrl;

  return {
    id: row.notificationId,
    momentSequence: row.momentSequence,
    notificationId: row.notificationId,
    isUnread: !row.isRead,
    type: cardType,
    title,
    time: formatNotificationRelativeTime(row.createdAt),
    avatarUrl: row.avatarUrl,
    rightImageUrl,
  };
}
