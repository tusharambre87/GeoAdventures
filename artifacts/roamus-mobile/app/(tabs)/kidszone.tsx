/**
 * Kids Zone tab — renders the existing GameHub screen from app/kids/games.tsx.
 *
 * GameHub lives inside the kids/ Stack which provides KidsProvider via its
 * _layout.tsx. As a tab it sits outside that stack, so we supply KidsProvider
 * here. games.tsx itself is unchanged — it stays reachable at both routes.
 * (Phase C will tidy up the navigation once the full tab structure lands.)
 */

import React from "react";
import { KidsProvider } from "@/lib/kidsContext";
import GameHub from "@/app/kids/games";

export default function KidsZoneScreen() {
  return (
    <KidsProvider>
      <GameHub />
    </KidsProvider>
  );
}
