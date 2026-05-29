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

    if (!token && !inOnboarding && !inLegacyLogin) {
      // No auth — send to onboarding splash
      router.replace("/onboarding/splash");
    } else if (token && !inOnboarding) {
      // Has token and not in onboarding — ensure tabs are shown
      // (only redirect away from the legacy login page)
      if (inLegacyLogin) router.replace("/(tabs)");
    } else if (token && inOnboarding && !data.onboardingInProgress) {
      // Returning user with token who is not mid-onboarding → send to app
      router.replace("/(tabs)");
    }
    // token + inOnboarding + onboardingInProgress = true → stay put (post-register flow)
  }, [token, isLoading, segments, data.onboardingInProgress]);

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="trip" options={{ headerShown: false }} />
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
