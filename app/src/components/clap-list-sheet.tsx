import React, { useEffect, useState } from "react";
import { View, Text, FlatList, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { StyleSheet } from "react-native-unistyles";
import { BottomSheet } from "./bottom-sheet";
import { Moment } from "@/gql/graphql";
import { useMomentActions } from "@/hooks/useMomentActions";

interface ClapListSheetProps {
  visible: boolean;
  onClose: () => void;
  moment: Moment;
}

type Interaction = {
  viewerId: string;
  viewer?: {
    id: string;
    name?: string | null;
    avatar?: string | null;
  } | null;
  applauseCount: number;
};

export const ClapListSheet = ({ visible, onClose, moment }: ClapListSheetProps) => {
  const { getInteractions, isFetchingInteractions } = useMomentActions({
    momentId: moment.id,
    momentSequence: moment.sequence || 0,
    authorId: moment.author.id,
  });

  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // True until the first fetch resolves — prevents the empty state from flashing before data arrives.
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  const fetchInteractions = async (token: string | null = null, isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    const result = await getInteractions(token);
    if (isRefresh) setIsRefreshing(false);

    setIsFirstLoad(false);

    if (result.success && result.data) {
      const newInteractions = (result.data.interactions || []) as Interaction[];
      if (token) {
        setInteractions((prev) => [...prev, ...newInteractions]);
      } else {
        setInteractions(newInteractions);
      }
      setNextToken(result.data.nextToken || null);
    }
  };

  useEffect(() => {
    if (visible) {
      setIsFirstLoad(true);
      fetchInteractions(null);
    } else {
      setInteractions([]);
      setNextToken(null);
      setIsFirstLoad(true);
    }
  }, [visible]);

  const handleRefresh = () => {
    fetchInteractions(null, true);
  };

  const handleLoadMore = () => {
    if (nextToken && !isFetchingInteractions) {
      fetchInteractions(nextToken);
    }
  };

  const renderItem = ({ item }: { item: Interaction }) => (
    <View style={styles.interactionRow}>
      <Image
        source={
          item.viewer?.avatar
            ? { uri: item.viewer.avatar }
            : require("@/assets/images/avatar.png")
        }
        style={styles.avatar}
        contentFit="cover"
      />
      <Text style={styles.viewerName} numberOfLines={1}>
        {item.viewer?.name || "Unknown"}
      </Text>
      <View style={styles.clapCountContainer}>
        <Text style={styles.clapCountText}>{item.applauseCount}</Text>
      </View>
    </View>
  );

  const showSpinner = isFirstLoad || (isFetchingInteractions && !isRefreshing && interactions.length === 0);
  const showEmpty = !showSpinner && interactions.length === 0;
  const showList = !showSpinner && interactions.length > 0;

  return (
    // minHeight keeps the sheet at half-screen even when empty.
    <BottomSheet visible={visible} onClose={onClose} minHeight={0.5}>
      <View style={styles.container}>
        <Text style={styles.headerTitle}>Claps</Text>

        {showSpinner && (
          <View style={styles.centeredFill}>
            <ActivityIndicator />
          </View>
        )}

        {showEmpty && (
          <View style={styles.centeredFill}>
            <Text style={styles.emptyText}>No claps yet.</Text>
          </View>
        )}

        {showList && (
          <FlatList
            data={interactions}
            keyExtractor={(item, index) => `${item.viewerId}-${index}`}
            renderItem={renderItem}
            onRefresh={handleRefresh}
            refreshing={isRefreshing}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            contentContainerStyle={styles.listContent}
            ListFooterComponent={
              isFetchingInteractions && interactions.length > 0 ? (
                <ActivityIndicator style={styles.footerLoader} />
              ) : null
            }
          />
        )}
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.foundation.foreground.primary,
    textAlign: "center",
    marginBottom: theme.spacing.normal,
  },
  // Fills the remaining space below the header and centers content within it.
  centeredFill: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingBottom: 24,
  },
  interactionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.foundation.background.alpha30,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  viewerName: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.foundation.foreground.primary,
    fontWeight: "500",
  },
  clapCountContainer: {
    backgroundColor: theme.colors.foundation.background.alpha30,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  clapCountText: {
    color: theme.colors.foundation.foreground.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  emptyText: {
    textAlign: "center",
    color: theme.colors.foundation.foreground.tertiary,
    fontSize: 20,
    fontWeight: "700",
  },
  footerLoader: {
    marginVertical: 16,
  },
}));
