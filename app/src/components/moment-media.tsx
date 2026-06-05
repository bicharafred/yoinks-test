import { Moment as MomentType } from "@/gql/graphql";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useEffect, useState } from "react";
import { type ViewStyle, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { MomentCarousel } from "@/components/moment-carousel";
import { getMediaItems, subscribeToRegistry } from "@/services/mediaItemRegistry";
import { ASPECT_RATIO } from "@/utils/constants";

interface MomentMediaProps {
  moment: MomentType;
  isBlurred: boolean;
  width: number;
  // height is optional — defaults to width * ASPECT_RATIO when not provided.
  height?: number;
  isVisibleMedia: boolean;
  isFeedScreenActive: boolean;
  isMuted: boolean;
}

export const MomentMedia = ({
  moment,
  isBlurred,
  width,
  height: heightProp,
  isVisibleMedia,
  isFeedScreenActive,
  isMuted,
}: MomentMediaProps) => {
  const height = heightProp ?? width * ASPECT_RATIO;

  // Subscribe to registry updates for optimistic-post moments: when
  // writeOptimisticMomentToFeed registers items, this triggers a re-render
  // so the carousel appears immediately. Server-fetched moments use
  // moment.mediaItems from the Apollo cache (reactive; no subscription needed).
  const [, setRegistryVersion] = useState(0);
  useEffect(() => {
    return subscribeToRegistry((id) => {
      if (id === moment.id) setRegistryVersion((v) => v + 1);
    });
  }, [moment.id]);

  // Prefer mediaItems from the Apollo cache (populated via MomentFragment).
  // Fall back to the registry only for optimistic posts where moment.mediaItems
  // is null because the optimistic Apollo write precedes the server response.
  const graphqlItems = moment.mediaItems && moment.mediaItems.length > 1 ? moment.mediaItems : null;
  const carouselItems = graphqlItems ?? getMediaItems(moment.id);

  if (carouselItems && carouselItems.length > 1) {
    if (__DEV__) {
      console.log(
        "[carousel-render] moment:", moment.id,
        "source:", graphqlItems ? "graphql" : "registry",
        "mediaItems:", carouselItems.length,
        carouselItems.map((item) => item.mediaUrl),
      );
    }
    return (
      <MomentCarousel
        items={carouselItems}
        width={width}
        height={height}
        isVisibleMedia={isVisibleMedia}
        isFeedScreenActive={isFeedScreenActive}
        isBlurred={isBlurred}
        isMuted={isMuted}
      />
    );
  }

  // Single-item fallback: use moment.mediaUrl and moment.cropTransform directly.
  return (
    <SingleMomentMedia
      moment={moment}
      isBlurred={isBlurred}
      isVisibleMedia={isVisibleMedia}
      isFeedScreenActive={isFeedScreenActive}
      isMuted={isMuted}
    />
  );
};

// ---------------------------------------------------------------------------
// Single-item rendering (existing behavior, extracted for clarity)
// ---------------------------------------------------------------------------

type SingleProps = {
  moment: MomentType;
  isBlurred: boolean;
  isVisibleMedia: boolean;
  isFeedScreenActive: boolean;
  isMuted: boolean;
};

function SingleMomentMedia({
  moment,
  isBlurred,
  isVisibleMedia,
  isFeedScreenActive,
  isMuted,
}: SingleProps) {
  const isVideo = moment.type === "VIDEO";
  const mediaUrl = moment.mediaUrl;
  const cropTransform = moment.cropTransform ?? null;

  const player = useVideoPlayer(mediaUrl, (p) => {
    p.loop = true;
    p.muted = isMuted;
  });

  useEffect(() => {
    if (!player) return;
    player.muted = isMuted;
  }, [isMuted, player]);

  useEffect(() => {
    if (!player) return;
    if (isVisibleMedia && isFeedScreenActive && !isBlurred) {
      player.play();
    } else {
      player.pause();
    }
  }, [isVisibleMedia, isFeedScreenActive, isBlurred, player]);

  const transformStyle: ViewStyle | undefined = cropTransform
    ? {
        transform: [
          { scale: cropTransform.scale },
          { translateX: cropTransform.translateX },
          { translateY: cropTransform.translateY },
        ],
      }
    : undefined;

  if (isVideo) {
    return (
      <View style={styles.clip}>
        <View style={[styles.fill, transformStyle]}>
          <VideoView
            style={styles.media}
            player={player}
            fullscreenOptions={{ enable: false }}
            allowsPictureInPicture={false}
            nativeControls={false}
            contentFit="cover"
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.clip}>
      <View style={[styles.fill, transformStyle]}>
        <Image
          style={styles.media}
          source={mediaUrl}
          contentFit="cover"
          transition={200}
          blurRadius={isBlurred ? 15 : 0}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create(() => ({
  clip: {
    width: "100%",
    height: "100%",
    overflow: "hidden",
  },
  fill: {
    width: "100%",
    height: "100%",
  },
  media: {
    width: "100%",
    height: "100%",
  },
}));
