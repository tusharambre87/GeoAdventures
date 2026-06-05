import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts,
} from "@expo-google-fonts/plus-jakarta-sans";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import * as Linking from "expo-linking";
import { router, Stack, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/lib/authContext";
import { OnboardingProvider, useOnboarding } from "@/lib/onboardingContext";
import { drainAllPhotoQueues } from "@/lib/photoQueue";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
      staleTime: 1000 * 60 * 30,         // 30 min
      retry: 1,
    },
  },
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "ROAMUS_QUERY_CACHE",
});

const persistOptions = {
  persister: asyncStoragePersister,
  maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
};

function handleDeepLink(url: string) {
  const itineraryMatch = url.match(/\/itinerary\/([^/?#]+)/);
  if (itineraryMatch) {
    router.push(`/memories/shared/${itineraryMatch[1]}`);
    return;
  }
  const storyMatch = url.match(/\/s\/([^/?#]+)/);
  if (storyMatch) {
    router.push(`/memories/shared/${storyMatch[1]}`);
  }
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { token, isLoading, user } = useAuth();
  const { data } = useOnboarding();
  const segments = useSegments();

  // Drain photo queue when app returns to foreground (paid users only)
  useEffect(() => {
    if (!token || user?.subscriptionTier === "free") return;
    const sub = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (nextState === "active") {
        drainAllPhotoQueues(token).catch(() => {});
      }
    });
    return () => sub.remove();
  }, [token, user?.subscriptionTier]);

  useEffect(() => {
    if (isLoading) return;

    const inOnboarding = segments[0] === "onboarding";
    const inLegacyLogin = segments[0] === "login";
    const inAuth      = segments[0] === "auth";
    const inTabPreview = __DEV__ && (segments[1] === 'today' || segments[1] === 'atstop');
    // Shared itinerary is public — no auth required
    const inSharedItinerary = segments[0] === 'memories' && segments[1] === 'shared';

    if (!token && !inOnboarding && !inLegacyLogin && !inAuth && !inTabPreview && !inSharedItinerary) {
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
      <Stack.Screen name="memories/[tripId]" options={{ headerShown: false }} />
      <Stack.Screen name="memories/shared/[slug]" options={{ headerShown: false }} />
      <Stack.Screen
        name="kids"
        options={{ presentation: "fullScreenModal", headerShown: false, animation: "slide_from_bottom" }}
      />
      <Stack.Screen name="atstop" options={{ headerShown: false }} />
      <Stack.Screen name="me" options={{ headerShown: false }} />
      <Stack.Screen name="discover" options={{ headerShown: false }} />
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

  // Deep link: cold start (app not running) + warm start (app in background)
  useEffect(() => {
    Linking.getInitialURL().then(url => {
      if (url) handleDeepLink(url);
    });
    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleDeepLink(url);
    });
    return () => subscription.remove();
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
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
        </PersistQueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
