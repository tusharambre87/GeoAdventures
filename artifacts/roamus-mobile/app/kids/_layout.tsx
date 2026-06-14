import { Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect } from "react";

import { getMyPlayers } from "@/lib/apiClient";
import { KidsProvider, useKids } from "@/lib/kidsContext";

function KidsLayoutInner() {
  const params = useLocalSearchParams<{
    stopId?: string;
    stopName?: string;
    tripId?: string;
    explorerId?: string;
    explorerName?: string;
  }>();
  const { setStopInfo, setKidName, setExplorerId, setXpToday } = useKids();

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
      const name = decodeURIComponent(params.explorerName);
      setKidName(name);
      getMyPlayers()
        .then(players => {
          const match = players.find(
            p => !p.isParent && p.name.toLowerCase() === name.toLowerCase()
          );
          const fallback = players.find(p => !p.isParent);
          const resolved = match ?? fallback;
          if (resolved) {
            setExplorerId(resolved.id);
            setXpToday(resolved.totalXp ?? 0);
          }
        })
        .catch(() => {});
    } else if (params.stopName) {
      setKidName("Explorer");
    }
  }, [params.stopId, params.explorerId, params.explorerName]);

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
