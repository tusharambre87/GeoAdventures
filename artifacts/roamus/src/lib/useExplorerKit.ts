import { useState, useCallback, useRef } from "react";
import { useExplorer } from "./explorerContext";
import { hasMilestoneBeenSeen } from "@/components/MilestoneCelebration";

interface UpgradeResult {
  itemId: string;
  itemName: string;
  oldTier: number;
  oldTierName: string;
  newTier: number;
  newTierName: string;
  iconPrefix: string;
}

interface SurpriseItem {
  itemId: string;
  name: string;
  description: string;
  iconPrefix: string;
}

export function useExplorerKit() {
  const { activeExplorer } = useExplorer();
  const [pendingUpgrades, setPendingUpgrades] = useState<UpgradeResult[]>([]);
  const [pendingSurprise, setPendingSurprise] = useState<SurpriseItem | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const checkingRef = useRef(false);

  const checkUpgrades = useCallback(async (eventType?: string) => {
    const playerId = activeExplorer?.id;
    if (!playerId || checkingRef.current) return;

    checkingRef.current = true;
    try {
      const upgradeRes = await fetch(`/api/explorer-kit/${playerId}/check-upgrades`, {
        method: 'POST',
        credentials: 'include',
      });
      if (upgradeRes.ok) {
        const { upgrades } = await upgradeRes.json();
        if (upgrades && upgrades.length > 0) {
          const isFirstKitEver = playerId && !hasMilestoneBeenSeen(playerId, 'first_kit');

          if (isFirstKitEver) {
            const firstUpgrade = upgrades[0];
            if (firstUpgrade) {
              window.dispatchEvent(new CustomEvent('geoquest:kit-unlocked', {
                detail: {
                  itemName: firstUpgrade.itemName,
                  tierName: firstUpgrade.newTierName,
                  iconEmoji: firstUpgrade.iconPrefix === 'compass' ? '🧭' :
                             firstUpgrade.iconPrefix === 'map' ? '🗺️' :
                             firstUpgrade.iconPrefix === 'binoculars' ? '🔭' :
                             firstUpgrade.iconPrefix === 'journal' ? '📓' :
                             firstUpgrade.iconPrefix === 'backpack' ? '🎒' :
                             firstUpgrade.iconPrefix === 'canteen' ? '🫗' :
                             firstUpgrade.iconPrefix === 'hat' ? '🎩' : '🧭',
                },
              }));
            }
          } else {
            setPendingUpgrades(upgrades);
            setShowUpgradeModal(true);
          }
        }
      }

      if (eventType) {
        const surpriseRes = await fetch(`/api/explorer-kit/${playerId}/surprise-roll`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ eventType }),
        });
        if (surpriseRes.ok) {
          const { surpriseItem } = await surpriseRes.json();
          if (surpriseItem) {
            setPendingSurprise(surpriseItem);
            if (!showUpgradeModal) {
              setShowUpgradeModal(true);
            }
          }
        }
      }
    } catch (e) {
      console.warn("[ExplorerKit] Check upgrades failed:", e);
    } finally {
      checkingRef.current = false;
    }
  }, [activeExplorer?.id]);

  const dismissUpgrades = useCallback(() => {
    setShowUpgradeModal(false);
    setPendingUpgrades([]);
    setPendingSurprise(null);
  }, []);

  return {
    checkUpgrades,
    pendingUpgrades,
    pendingSurprise,
    showUpgradeModal,
    dismissUpgrades,
  };
}
