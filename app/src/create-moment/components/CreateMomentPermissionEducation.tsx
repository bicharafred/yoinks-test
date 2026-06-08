import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { MomentCreateScreenContainer } from "@/components/moment-create";
import XLargeIcon from "@/assets/icons/x.large.svg";

export type PermissionEducationVariant =
  | "camera-request"
  | "camera-denied"
  | "album-request"
  | "album-denied";

type Props = {
  variant: PermissionEducationVariant;
  insetTop: number;
  insetBottom: number;
  onPrimaryAction: () => void;
  onClose: () => void;
};

type VariantContent = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  gif: any;
  title: string;
  heading: string;
  body: string;
  primaryLabel: string;
  secondaryLabel: string | null;
};

const CONTENT: Record<PermissionEducationVariant, VariantContent> = {
  "camera-request": {
    gif: require("@/assets/GIFs/cameraAccess.gif"),
    title: "Camera Access",
    heading: "Allow Yoinks to access your camera and microphone",
    body: "This lets you share photos and record videos.",
    primaryLabel: "Allow Camera and Microphone",
    secondaryLabel: null,
  },
  "camera-denied": {
    gif: require("@/assets/GIFs/cameraAccessDenied.gif"),
    title: "Camera Access Required",
    heading: "Camera and microphone access has been blocked",
    body: "Open Settings to allow Yoinks to use your camera.",
    primaryLabel: "Go To Settings",
    secondaryLabel: "Go Back",
  },
  "album-request": {
    gif: require("@/assets/GIFs/requestAlbumAccess.gif"),
    title: "Photo Library Access",
    heading: "Allow Yoinks to access your photo library",
    body: "This lets you choose photos and videos for your moments.",
    primaryLabel: "Allow Photo Library Access",
    secondaryLabel: "Not Now",
  },
  "album-denied": {
    gif: require("@/assets/GIFs/requestAlbumAccess.gif"),
    title: "Photo Library Access Required",
    heading: "Photo library access has been blocked",
    body: "Open Settings to allow Yoinks to access your photos.",
    primaryLabel: "Go To Settings",
    secondaryLabel: "Go Back",
  },
};

export function CreateMomentPermissionEducation({
  variant,
  insetTop,
  insetBottom,
  onPrimaryAction,
  onClose,
}: Props) {
  const { theme } = useUnistyles();
  const content = CONTENT[variant];

  return (
    <MomentCreateScreenContainer>
      <View
        style={[
          styles.root,
          {
            paddingTop: insetTop + theme.spacing.small,
            paddingBottom: insetBottom + theme.spacing.normal,
          },
        ]}
      >
        {/* Close button */}
        <View style={styles.closeRow}>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={12}
            style={styles.closeHitArea}
          >
            <XLargeIcon
              width={20}
              height={20}
              color={theme.colors.foundation.foreground.secondary}
            />
          </Pressable>
        </View>

        {/* GIF */}
        <View style={styles.gifSection}>
          <Image
            source={content.gif}
            style={styles.gif}
            contentFit="contain"
            autoplay
            accessibilityLabel={content.title}
          />
        </View>

        {/* Text */}
        <View style={styles.textBlock}>
          <Text style={styles.title}>{content.title}</Text>
          <Text style={styles.heading}>{content.heading}</Text>
          <Text style={styles.body}>{content.body}</Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            onPress={onPrimaryAction}
            accessibilityRole="button"
            accessibilityLabel={content.primaryLabel}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryLabel}>{content.primaryLabel}</Text>
          </Pressable>

          {content.secondaryLabel ? (
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={content.secondaryLabel}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryLabel}>{content.secondaryLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </MomentCreateScreenContainer>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: {
    flex: 1,
    paddingHorizontal: theme.spacing.large,
  },
  closeRow: {
    alignItems: "flex-end",
    paddingBottom: theme.spacing.small,
  },
  closeHitArea: {
    padding: theme.spacing.xsmall,
  },
  gifSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  gif: {
    width: 220,
    height: 220,
  },
  textBlock: {
    gap: theme.spacing.small,
    paddingBottom: theme.spacing.xlarge,
  },
  title: {
    fontSize: 13, // raw — small eyebrow label above heading
    fontWeight: "600" as const,
    color: theme.colors.foundation.foreground.secondary,
    textAlign: "center",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  heading: {
    fontSize: 22, // raw — primary statement, should be legible at a glance
    fontWeight: "700" as const,
    color: theme.colors.foundation.foreground.primary,
    textAlign: "center",
    lineHeight: 28,
  },
  body: {
    fontSize: 15, // raw — supporting detail below heading
    color: theme.colors.foundation.foreground.secondary,
    textAlign: "center",
    lineHeight: 22,
  },
  actions: {
    gap: theme.spacing.normal,
    alignItems: "center",
  },
  primaryButton: {
    width: "100%" as const,
    paddingVertical: theme.spacing.normal,
    borderRadius: 100,
    backgroundColor: theme.colors.foundation.foreground.brand.tertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryLabel: {
    fontSize: 16, // raw — CTA label, matches other primary action labels in app
    fontWeight: "700" as const,
    color: theme.colors.foundation.background.primary,
  },
  secondaryButton: {
    paddingVertical: theme.spacing.small,
    paddingHorizontal: theme.spacing.normal,
  },
  secondaryLabel: {
    fontSize: 16, // raw — secondary text action, same size as primary for balance
    fontWeight: "500" as const,
    color: theme.colors.foundation.foreground.secondary,
  },
}));
