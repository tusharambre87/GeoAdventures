import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs, useSegments } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";

import { useColors } from "@/hooks/useColors";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "map", selected: "map.fill" }} />
        <Label>Trips</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="memories">
        <Icon sf={{ default: "photo.on.rectangle", selected: "photo.fill.on.rectangle.fill" }} />
        <Label>Memories</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="me">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>Me</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="home">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="kidszone">
        <Icon sf={{ default: "gamecontroller", selected: "gamecontroller.fill" }} />
        <Label>Kids Zone</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  // Highlight the Home tab when the user is on the hidden today route so
  // the tab bar always has an active selection (Android / web / ClassicTabLayout).
  const segments = useSegments();
  const isOnTodayRoute = segments[0] === '(tabs)' && segments[1] === 'today';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.card },
              ]}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Trips",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="map" tintColor={color} size={24} />
            ) : (
              <Ionicons name="map-outline" size={22} color={color} />
            ),
        }}
      />
      {/* today.tsx stays in (tabs)/ so the /(tabs)/today route keeps working,
          but it is no longer a visible tab — Home's CTA pushes to it instead. */}
      <Tabs.Screen name="today" options={{ href: null }} />
      <Tabs.Screen
        name="memories"
        options={{
          title: "Memories",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="photo.on.rectangle" tintColor={color} size={24} />
            ) : (
              <Ionicons name="images-outline" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: "Me",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person" tintColor={color} size={24} />
            ) : (
              <Ionicons name="person-outline" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => {
            const effectiveFocused = focused || isOnTodayRoute;
            const effectiveColor   = effectiveFocused ? colors.primary : color;
            return isIOS ? (
              <SymbolView
                name={effectiveFocused ? "house.fill" : "house"}
                tintColor={effectiveColor}
                size={24}
              />
            ) : (
              <Ionicons
                name={effectiveFocused ? "home" : "home-outline"}
                size={22}
                color={effectiveColor}
              />
            );
          },
          tabBarLabelStyle: isOnTodayRoute ? { color: colors.primary } : undefined,
        }}
      />
      <Tabs.Screen
        name="kidszone"
        options={{
          title: "Kids Zone",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="gamecontroller" tintColor={color} size={24} />
            ) : (
              <Ionicons name="game-controller-outline" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  return <ClassicTabLayout />;
}
