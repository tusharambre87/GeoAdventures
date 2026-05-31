import { Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect } from "react";

import { KidsProvider, useKids } from "@/lib/kidsContext";

function KidsLayoutInner() {
  const params = useLocalSearchParams<{
    stopId?: string;
    stopName?: string;
    tripId?: string;
    explorerId?: string;
    explorerName?: string;
  }>();
  const { setStopInfo, setKidName, setExplorerId } = useKids();

  useEffect(() => {
    if (params.stopId) {
      setStopInfo(
        params.stopId,
        params.stopName ? decodeURIComponent(params.stopName) : "This Stop",
        params.tripId ?? ""
      );
    }
    if (params.explorerId) {
      setExplorerId(params.explorerId);
    }
    if (params.explorerName) {
      setKidName(decodeURIComponent(params.explorerName));
    } else if (params.stopName) {
      setKidName("Explorer");
    }
  }, [params.stopId, params.explorerId]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: "#FFF8F0" },
      }}
    />
  );
}

export default function KidsLayout() {
  return (
    <KidsProvider>
      <KidsLayoutInner />
    </KidsProvider>
  );
}
