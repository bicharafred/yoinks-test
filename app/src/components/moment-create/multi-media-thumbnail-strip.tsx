import { Image } from "expo-image";
import { Pressable, ScrollView, Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { MomentType } from "@/gql/graphql";
import type { StagedItem } from "@/types/mediaItem";

const THUMB_SIZE = 52; // raw — fixed thumbnail square
const THUMB_RADIUS = 8; // raw — inner card radius

type Props = {
  items: StagedItem[];
  currentIndex: number;
  onSelectIndex: (index: number) => void;
  onAddMore?: () => void;
};

export function MultiMediaThumbnailStrip({ items, currentIndex, onSelectIndex, onAddMore }: Props) {
  const { theme } = useUnistyles();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[
        styles.strip,
        { paddingHorizontal: theme.spacing.normal },
      ]}
      style={styles.container}
    >
      {items.map((item, index) => {
        const isSelected = index === currentIndex;
        return (
          <Pressable
            key={item.id}
            onPress={() => onSelectIndex(index)}
            accessibilityRole="button"
            accessibilityLabel={`Select item ${index + 1}`}
            accessibilityState={{ selected: isSelected }}
            style={[
              styles.thumb,
              isSelected ? styles.thumbSelected : styles.thumbUnselected,
              index > 0 ? styles.thumbGap : undefined,
            ]}
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
          </Pressable>
        );
      })}
      {onAddMore ? (
        <Pressable
          onPress={onAddMore}
          accessibilityRole="button"
          accessibilityLabel="Add more media"
          style={styles.addMoreTile}
        >
          <Text style={styles.addMoreLabel} aria-hidden>+</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flexGrow: 0,
  },
  strip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.small,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_RADIUS,
    overflow: "hidden",
    borderWidth: 2,
  },
  thumbGap: {
    marginLeft: theme.spacing.xsmall,
  },
  thumbSelected: {
    borderColor: theme.colors.foundation.foreground.brand.tertiary,
  },
  thumbUnselected: {
    borderColor: "transparent",
  },
  thumbInner: {
    width: "100%",
    height: "100%",
  },
  videoPlaceholder: {
    backgroundColor: theme.colors.foundation.background.secondary,
  },
  addMoreTile: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_RADIUS,
    borderWidth: 2,
    borderColor: theme.colors.foundation.foreground.tertiary,
    backgroundColor: theme.colors.foundation.background.secondary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginLeft: theme.spacing.xsmall,
  },
  addMoreLabel: {
    fontSize: 22, // raw — sized for the plus glyph within the 52pt tile
    lineHeight: 26,
    color: theme.colors.foundation.foreground.tertiary,
    fontWeight: "300" as const,
  },
}));
