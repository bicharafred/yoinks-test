import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useRouter } from "expo-router";

import { AppScreenContainer } from "@/components/navigation/app-screen-container";
import { getVisitorProfilePush } from "@/navigation/author-profile-route-params";
import { resolveLocalUrl } from "@/utils/apiUrl";

// ── Types ─────────────────────────────────────────────────────────────────────

type SearchUser = {
  id: string;
  name: string;
  handle: string;
  avatar: string | null;
  momentsCount: number;
};

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; users: SearchUser[] }
  | { status: "error" };

// ── Fetch helper ──────────────────────────────────────────────────────────────

const REST_BASE = resolveLocalUrl((process.env.EXPO_PUBLIC_API_BASE_REST ?? "").replace(/\/$/, ""));

async function fetchUsers(q: string): Promise<SearchUser[]> {
  const url = `${REST_BASE}/search/users?q=${encodeURIComponent(q)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Search failed (${res.status})`);
  const json = await res.json();
  return (json.users ?? []) as SearchUser[];
}

// ── Result row ────────────────────────────────────────────────────────────────

type ResultRowProps = {
  user: SearchUser;
  onPress: (user: SearchUser) => void;
};

const ResultRow = ({ user, onPress }: ResultRowProps) => (
  <Pressable
    style={styles.row}
    onPress={() => onPress(user)}
    accessibilityRole="button"
    accessibilityLabel={`View ${user.name}'s profile`}
  >
    <Image
      source={user.avatar ? { uri: user.avatar } : require("@/assets/images/avatar.png")}
      style={styles.avatar}
      contentFit="cover"
    />
    <View style={styles.rowBody}>
      <Text style={styles.rowName} numberOfLines={1}>
        {user.name}
      </Text>
      <Text style={styles.rowHandle} numberOfLines={1}>
        @{user.handle}
        {user.momentsCount > 0 ? `  ·  ${user.momentsCount} moments` : ""}
      </Text>
    </View>
    <Ionicons name="chevron-forward" size={16} style={styles.rowChevron} />
  </Pressable>
);

// ── Search screen ─────────────────────────────────────────────────────────────

const DEBOUNCE_MS = 300;

export default function SearchScreen() {
  const router = useRouter();
  const { theme } = useUnistyles();

  const [query, setQuery] = useState("");
  const [searchState, setSearchState] = useState<SearchState>({ status: "idle" });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (q: string) => {
    setSearchState({ status: "loading" });
    try {
      const users = await fetchUsers(q);
      setSearchState({ status: "success", users });
    } catch {
      setSearchState({ status: "error" });
    }
  }, []);

  // Load suggested creators on mount (empty query = all users).
  useEffect(() => {
    runSearch("");
  }, []);

  const handleChangeText = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runSearch(text.trim());
    }, DEBOUNCE_MS);
  };

  const handleClear = () => {
    setQuery("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    runSearch("");
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleUserPress = useCallback(
    (user: SearchUser) => {
      router.push(
        getVisitorProfilePush({
          id: user.id,
          name: user.name,
          avatar: user.avatar ?? undefined,
        }),
      );
    },
    [router],
  );

  // ── Render helpers ──────────────────────────────────────────────────────────

  const isSuggested = query.trim().length === 0;
  const sectionLabel = isSuggested ? "Suggested creators" : "Results";

  const renderContent = () => {
    if (searchState.status === "loading") {
      return (
        <View style={styles.centeredFill}>
          <ActivityIndicator color={theme.colors.foundation.foreground.tertiary} />
        </View>
      );
    }

    if (searchState.status === "error") {
      return (
        <View style={styles.centeredFill}>
          <Text style={styles.feedbackText}>Search failed. Try again.</Text>
        </View>
      );
    }

    if (searchState.status === "success") {
      if (searchState.users.length === 0) {
        return (
          <View style={styles.centeredFill}>
            <Text style={styles.feedbackText}>No users found.</Text>
          </View>
        );
      }

      return (
        <>
          <Text style={styles.sectionLabel}>{sectionLabel}</Text>
          <FlatList
            data={searchState.users}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ResultRow user={item} onPress={handleUserPress} />
            )}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
          />
        </>
      );
    }

    return null;
  };

  return (
    <AppScreenContainer>
      {/* Search input */}
      <View style={styles.inputWrapper}>
        <Ionicons
          name="search-outline"
          size={18}
          color={theme.colors.foundation.foreground.tertiary}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.input}
          placeholder="Search people"
          placeholderTextColor={theme.colors.foundation.foreground.tertiary}
          value={query}
          onChangeText={handleChangeText}
          autoFocus
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="never"
        />
        {query.length > 0 && (
          <Pressable
            onPress={handleClear}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Clear search"
          >
            <Ionicons
              name="close-circle"
              size={18}
              color={theme.colors.foundation.foreground.tertiary}
            />
          </Pressable>
        )}
      </View>

      {/* Results area */}
      <View style={styles.resultsArea}>{renderContent()}</View>
    </AppScreenContainer>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create((theme) => ({
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.foundation.background.secondary,
    borderRadius: theme.spacing.large,
    marginHorizontal: theme.spacing.normal,
    marginTop: theme.spacing.normal,
    marginBottom: theme.spacing.small,
    paddingHorizontal: theme.spacing.normal,
    height: 44, // raw — standard touch-target height for an input pill
  },
  searchIcon: {
    marginRight: theme.spacing.xsmall,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.foundation.foreground.primary,
  },
  resultsArea: {
    flex: 1,
  },
  centeredFill: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  feedbackText: {
    color: theme.colors.foundation.foreground.tertiary,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.foundation.foreground.tertiary,
    marginHorizontal: theme.spacing.normal,
    marginTop: theme.spacing.small,
    marginBottom: theme.spacing.xsmall,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  listContent: {
    paddingBottom: theme.spacing.xlarge,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.normal,
    paddingVertical: theme.spacing.small,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.foundation.background.alpha10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22, // raw — perfect circle; half of 44
    backgroundColor: theme.colors.foundation.background.secondary,
    marginRight: theme.spacing.normal,
    flexShrink: 0,
  },
  rowBody: {
    flex: 1,
  },
  rowName: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.foundation.foreground.primary,
    marginBottom: 2,
  },
  rowHandle: {
    fontSize: 13,
    color: theme.colors.foundation.foreground.tertiary,
  },
  rowChevron: {
    color: theme.colors.foundation.foreground.tertiary,
    marginLeft: theme.spacing.small,
  },
}));
