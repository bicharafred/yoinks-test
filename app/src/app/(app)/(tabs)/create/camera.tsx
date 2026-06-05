import { Ionicons } from "@expo/vector-icons";
import { AppHeader } from "@/components/navigation/app-header";
import { useNavigation, useRouter } from "expo-router";
import { useCallback, useLayoutEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

/**
 * Placeholder for the camera capture screen. Permission handling and device
 * capability checks should run in this route (or shared create helpers), not in
 * the tab bar.
 */
export default function CreateCameraScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const { theme } = useUnistyles();
  const [isFlashActive, setIsFlashActive] = useState(false);

  const closeCreateFlow = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/(app)/(tabs)/feed");
  }, [router]);

  const toggleFlash = useCallback(() => {
    setIsFlashActive((current) => !current);
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTransparent: true,
      headerShadowVisible: false,
      headerStyle: { backgroundColor: "transparent" },
      header: () => (
        <AppHeader
          title=""
          leftAction={
            <Pressable
              onPress={closeCreateFlow}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close create moment"
              style={styles.headerButton}
            >
              <Ionicons
                name="close"
                size={28}
                color={theme.colors.foundation.foreground.primary}
              />
            </Pressable>
          }
          rightAction={
            <Pressable
              onPress={toggleFlash}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={
                isFlashActive ? "Turn flash off" : "Turn flash on"
              }
              accessibilityState={{ selected: isFlashActive }}
              style={styles.headerButton}
            >
              <Ionicons
                name={isFlashActive ? "flash" : "flash-outline"}
                size={24}
                color={
                  isFlashActive
                    ? theme.colors.foundation.foreground.brand.tertiary
                    : theme.colors.foundation.foreground.primary
                }
              />
            </Pressable>
          }
        />
      ),
    });
  }, [
    closeCreateFlow,
    isFlashActive,
    navigation,
    theme.colors.foundation.foreground.brand.tertiary,
    theme.colors.foundation.foreground.primary,
    toggleFlash,
  ]);

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Camera</Text>
      <Text style={styles.hint}>
        Full-screen create flow. The X button closes back to the previous tab.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  headerButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  root: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.normal,
    backgroundColor: theme.colors.foundation.background.primary,
  },
  title: {
    color: theme.colors.foundation.foreground.primary,
    fontSize: 18,
    fontWeight: "600",
  },
  hint: {
    marginTop: theme.spacing.small,
    color: theme.colors.foundation.foreground.secondary,
    fontSize: 14,
    textAlign: "center",
  },
}));
