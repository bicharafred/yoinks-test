import { Stack } from "expo-router";

/**
 * Nested create flow: the tab opens a full-screen stack, not a titled tab page.
 * Camera permission prompts and capability checks belong here or on these screens,
 * not in the tab bar component.
 */
export default function CreateStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="camera" />
      <Stack.Screen name="share-media" options={{ headerShown: false }} />
    </Stack>
  );
}
