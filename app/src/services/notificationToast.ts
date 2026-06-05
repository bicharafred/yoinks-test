import Toast from "react-native-toast-message";

export type NewNotificationToastPayload = {
  type: string;
  title: string;
  message: string;
};

/** Toast types mirrored from legacy notification mapping (`UNBLUR_MOMENT`, `APPLAUSE`, …). */
export function showNewNotificationToast(
  payload: NewNotificationToastPayload,
): void {
  const toastType =
    payload.type === "UNBLUR_MOMENT"
      ? "koins"
      : payload.type === "APPLAUSE"
        ? "applause"
        : ("info" as const);

  Toast.show({
    type: toastType,
    text1: payload.title,
    text2: payload.message,
    visibilityTime: 4000,
  });
}
