import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="splash" options={{ animation: "fade" }} />
      <Stack.Screen name="login" />
      <Stack.Screen name="where" />
      <Stack.Screen name="who" />
      <Stack.Screen name="when" />
      <Stack.Screen name="how" />
      <Stack.Screen name="building" options={{ animation: "fade", gestureEnabled: false }} />
      <Stack.Screen name="preview" options={{ animation: "fade", gestureEnabled: false }} />
      <Stack.Screen name="account" />
      <Stack.Screen name="upgrade" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
