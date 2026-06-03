import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts,
} from "@expo-google-fonts/plus-jakarta-sans";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router, Stack, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/lib/authContext";
import { OnboardingProvider, useOnboarding } from "@/lib/onboardingContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});

function AuthGate({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth();
  const { data } = useOnboarding();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inOnboarding = segments[0] === "onboarding";
    const inLegacyLogin = segments[0] === "login";

    const inAuth      = segments[0] === "auth";
    const inTabPreview = __DEV__ && (segments[1] === 'today' || segments[1] === 'atstop');
    if (!token && !inOnboarding && !inLegacyLogin && !inAuth && !inTabPreview) {
      router.replace("/auth/splash");
    } else if (token && !inOnboarding) {
      if (inLegacyLogin || inAuth) router.replace("/(tabs)");
    } else if (token && inOnboarding && !data.onboardingInProgress) {
      router.replace("/(tabs)");
    }
  }, [token, isLoading, segments, data.onboardingInProgress]);

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="trip/[tripId]" options={{ headerShown: false }} />
      <Stack.Screen name="memories/[tripId]/index" options={{ headerShown: false }} />
      <Stack.Screen name="memories/[tripId]/recap" options={{ headerShown: false }} />
      <Stack.Screen name="memories/[tripId]/story" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      <Stack.Screen
        name="kids"
        options={{ presentation: "fullScreenModal", headerShown: false, animation: "slide_from_bottom" }}
      />
      <Stack.Screen name="atstop" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <OnboardingProvider>
              <GestureHandlerRootView>
                <KeyboardProvider>
                  <AuthGate>
                    <RootLayoutNav />
                  </AuthGate>
                </KeyboardProvider>
              </GestureHandlerRootView>
            </OnboardingProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
