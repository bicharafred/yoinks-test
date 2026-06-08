import { Image } from "expo-image";
import { Pressable, ScrollView, Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { MomentType } from "@/gql/graphql";
import type { StagedItem } from "@/types/mediaItem";

const THUMB_SIZE = 52; // raw — matches MultiMediaThumbnailStrip
const THUMB_RADIUS = 8; // raw — inner card radius
const MAX_ITEMS = 10;

type Props = {
  items: StagedItem[];
  onNext: () => void;
};

export function CameraCaptureTray({ items, onNext }: Props) {
  const { theme } = useUnistyles();

  return (
    <View
      style={[
        styles.container,
        { paddingHorizontal: theme.spacing.normal },
      ]}
      accessibilityLabel={`Capture tray with ${items.length} item${items.length !== 1 ? "s" : ""}`}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {items.map((item, index) => (
          <View
            key={item.id}
            style={[styles.thumb, index > 0 ? styles.thumbGap : undefined]}
            accessible
            accessibilityLabel={`Captured ${item.mediaType === MomentType.Video ? "video" : "photo"} ${index + 1}`}
          >
            {item.mediaType === MomentType.Video ? (
              <View style={[styles.thumbInner, styles.videoPlaceholder]} />
            ) : (
              <Image
                source={{ uri: item.localUri }}
                style={styles.thumbInner}
                contentFit="cover"
              />
            )}
          </View>
        ))}
      </ScrollView>

      <Pressable
        onPress={onNext}
        accessibilityRole="button"
        accessibilityLabel={`Continue with ${items.length} of ${MAX_ITEMS} captured items`}
        style={styles.nextPill}
      >
        <Text style={styles.countLabel} aria-hidden>
          {items.length}/{MAX_ITEMS}
        </Text>
        <Text style={styles.nextLabel}>Next</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.small,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: theme.spacing.xsmall,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_RADIUS,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: theme.colors.foundation.foreground.brand.tertiary,
  },
  thumbGap: {
    marginLeft: theme.spacing.xsmall,
  },
  thumbInner: {
    width: "100%" as const,
    height: "100%" as const,
  },
  videoPlaceholder: {
    backgroundColor: theme.colors.foundation.background.secondary,
  },
  nextPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xsmall,
    paddingVertical: theme.spacing.small,
    paddingHorizontal: theme.spacing.normal,
    backgroundColor: theme.colors.foundation.foreground.brand.tertiary,
    borderRadius: 80,
    marginLeft: theme.spacing.small,
  },
  countLabel: {
    fontSize: 12, // raw — compact count badge within pill
    fontWeight: "600" as const,
    color: theme.colors.foundation.background.primary,
    opacity: 0.75,
  },
  nextLabel: {
    fontSize: 15, // raw — matches crop-screen action label size
    fontWeight: "700" as const,
    color: theme.colors.foundation.background.primary,
  },
}));
