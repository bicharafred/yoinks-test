import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable } from "react-native";
import { useUnistyles } from "react-native-unistyles";

/**
 * Stack screens that use `getAppHeaderOptions` should pass this as `leftAction`
 * so the user can dismiss the modal/card route with the same affordance as legacy `BackButtonComponent`.
 */
export function AppHeaderBackButton() {
  const router = useRouter();
  const { theme } = useUnistyles();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      onPress={() => router.back()}
    >
      <Ionicons
        name="chevron-back"
        size={28}
        color={theme.colors.foundation.foreground.primary}
      />
    </Pressable>
  );
}
