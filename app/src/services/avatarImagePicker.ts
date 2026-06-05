import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";

export type AvatarPickSource = "library" | "camera";

export type PickAvatarImageResult =
  | { status: "selected"; uri: string }
  | { status: "cancelled" }
  | { status: "denied"; source: AvatarPickSource; canAskAgain: boolean }
  | { status: "unsupported" };

const imagePickOptions: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  allowsEditing: false,
  allowsMultipleSelection: false,
  quality: 0.92,
};

function isNativeMobile(): boolean {
  return Platform.OS === "ios" || Platform.OS === "android";
}

function assetUriOrEmpty(asset: ImagePicker.ImagePickerAsset | undefined): string {
  if (asset == null) {
    return "";
  }
  const uri = asset.uri;
  return typeof uri === "string" ? uri.trim() : "";
}

/**
 * Requests photo library permission (if needed) and opens the system image library.
 */
export async function pickAvatarImageFromLibrary(): Promise<PickAvatarImageResult> {
  if (!isNativeMobile()) {
    return { status: "unsupported" };
  }

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return {
      status: "denied",
      source: "library",
      canAskAgain: permission.canAskAgain,
    };
  }

  const result = await ImagePicker.launchImageLibraryAsync(imagePickOptions);
  if (result.canceled) {
    return { status: "cancelled" };
  }
  const uri = assetUriOrEmpty(result.assets[0]);
  if (uri === "") {
    return { status: "cancelled" };
  }
  return { status: "selected", uri };
}

/**
 * Requests camera permission (if needed) and opens the system camera capture flow.
 */
export async function pickAvatarImageFromCamera(): Promise<PickAvatarImageResult> {
  if (!isNativeMobile()) {
    return { status: "unsupported" };
  }

  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    return {
      status: "denied",
      source: "camera",
      canAskAgain: permission.canAskAgain,
    };
  }

  const result = await ImagePicker.launchCameraAsync(imagePickOptions);
  if (result.canceled) {
    return { status: "cancelled" };
  }
  const uri = assetUriOrEmpty(result.assets[0]);
  if (uri === "") {
    return { status: "cancelled" };
  }
  return { status: "selected", uri };
}
