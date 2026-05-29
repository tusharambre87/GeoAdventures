import { useState, useEffect } from "react";
import { Lock } from "lucide-react";
import { useUser } from "../lib/userContext";
import { useExplorer } from "../lib/explorerContext";
import { useQuery } from "@tanstack/react-query";
import { EXPLORER_XP_RANKS, KIT_TIER_RANK_GATES, getExplorerRank } from "@shared/schema";
import { GeoPassModal } from "@/components/GeoPassModal";

interface TierDef {
  tier: number;
  name: string;
  label: string;
  metric: string;
  threshold: number;
}

interface KitItemProgress {
  itemId: string;
  name: string;
  description: string;
  iconPrefix: string;
  category: string;
  displayOrder: number;
  isSurprise: boolean;
  currentTier: number;
  currentTierName: string;
  currentTierLabel: string;
  nextTierThreshold: number | null;
  nextTierName: string | null;
  progressValue: number;
  progressPercent: number;
  maxTier: number;
  isMaxed: boolean;
  isUnlocked: boolean;
  tiers: TierDef[];
}

interface SurpriseItem {
  itemId: string;
  name: string;
  description: string;
  iconPrefix: string;
  unlockedAt: string;
}

interface ExplorerKitState {
  items: KitItemProgress[];
  surpriseItems: SurpriseItem[];
  totalTierPoints: number;
  maxTierPoints: number;
}

const TIER_CARD_STYLES: Record<string, {
  bg: string; border: string; text: string; glow: string;
  gradient: string; progressBar: string; badgeBg: string;
}> = {
  Locked: {
    bg: "bg-gray-100 dark:bg-gray-800/60",
    border: "border-gray-300/60 dark:border-gray-600/40",
    text: "text-gray-400",
    glow: "",
    gradient: "",
    progressBar: "bg-gray-400",
    badgeBg: "bg-gray-200 dark:bg-gray-700",
  },
  Bronze: {
    bg: "bg-gradient-to-b from-amber-50 via-orange-50 to-amber-100/80 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-amber-900/40",
    border: "border-amber-500/70 dark:border-amber-600/60",
    text: "text-amber-700 dark:text-amber-400",
    glow: "shadow-[0_0_12px_rgba(217,119,6,0.25)] dark:shadow-[0_0_12px_rgba(217,119,6,0.15)]",
    gradient: "bg-[radial-gradient(ellipse_at_top,rgba(217,119,6,0.08),transparent_70%)]",
    progressBar: "bg-gradient-to-r from-amber-500 to-orange-500",
    badgeBg: "bg-amber-100 dark:bg-amber-900/50",
  },
  Silver: {
    bg: "bg-gradient-to-b from-slate-50 via-gray-100 to-slate-100/80 dark:from-slate-900/50 dark:via-gray-800/40 dark:to-slate-800/50",
    border: "border-slate-400/70 dark:border-slate-500/60",
    text: "text-slate-600 dark:text-slate-300",
    glow: "shadow-[0_0_14px_rgba(148,163,184,0.3)] dark:shadow-[0_0_14px_rgba(148,163,184,0.15)]",
    gradient: "bg-[radial-gradient(ellipse_at_top,rgba(148,163,184,0.1),transparent_70%)]",
    progressBar: "bg-gradient-to-r from-slate-400 to-gray-400",
    badgeBg: "bg-slate-100 dark:bg-slate-800/50",
  },
  Gold: {
    bg: "bg-gradient-to-b from-yellow-50 via-amber-50 to-yellow-100/80 dark:from-yellow-950/40 dark:via-amber-950/30 dark:to-yellow-900/40",
    border: "border-yellow-500/80 dark:border-yellow-500/60",
    text: "text-yellow-700 dark:text-yellow-400",
    glow: "shadow-[0_0_20px_rgba(234,179,8,0.35)] dark:shadow-[0_0_20px_rgba(234,179,8,0.2)]",
    gradient: "bg-[radial-gradient(ellipse_at_top,rgba(234,179,8,0.12),transparent_70%)]",
    progressBar: "bg-gradient-to-r from-yellow-500 to-amber-500",
    badgeBg: "bg-yellow-100 dark:bg-yellow-900/50",
  },
  Mythic: {
    bg: "bg-gradient-to-b from-purple-50 via-violet-50 to-purple-100/80 dark:from-purple-950/50 dark:via-violet-950/30 dark:to-purple-900/40",
    border: "border-purple-500/80 dark:border-purple-500/60",
    text: "text-purple-700 dark:text-purple-400",
    glow: "shadow-[0_0_24px_rgba(147,51,234,0.4)] dark:shadow-[0_0_24px_rgba(147,51,234,0.25)]",
    gradient: "bg-[radial-gradient(ellipse_at_top,rgba(147,51,234,0.15),transparent_70%)]",
    progressBar: "bg-gradient-to-r from-purple-500 to-violet-500",
    badgeBg: "bg-purple-100 dark:bg-purple-900/50",
  },
};

const ITEM_TEXTURES: Record<string, string> = {
  compass: "bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMTgiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgxNjEsMTI4LDY3LDAuMDYpIiBzdHJva2Utd2lkdGg9IjAuNSIvPjxsaW5lIHgxPSIyMCIgeTE9IjIiIHgyPSIyMCIgeTI9IjgiIHN0cm9rZT0icmdiYSgxNjEsMTI4LDY3LDAuMDUpIiBzdHJva2Utd2lkdGg9IjAuNSIvPjwvc3ZnPg==')] bg-repeat",
  "map-scroll": "bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAiIGhlaWdodD0iMzAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjMwIiBoZWlnaHQ9IjMwIiBmaWxsPSJub25lIi8+PGxpbmUgeDE9IjAiIHkxPSIxNSIgeDI9IjMwIiB5Mj0iMTUiIHN0cm9rZT0icmdiYSgxMzksOTAsNDMsMC4wNCkiIHN0cm9rZS13aWR0aD0iMC41Ii8+PC9zdmc+')] bg-repeat",
  boots: "bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSJub25lIi8+PGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iMSIgZmlsbD0icmdiYSgxMDEsNjcsMzMsMC4wNCkiLz48L3N2Zz4=')] bg-repeat",
  sundial: "bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGxpbmUgeDE9IjIwIiB5MT0iMCIgeDI9IjIwIiB5Mj0iNDAiIHN0cm9rZT0icmdiYSgyMDAsMTcwLDUwLDAuMDQpIiBzdHJva2Utd2lkdGg9IjAuMyIvPjxsaW5lIHgxPSIwIiB5MT0iMjAiIHgyPSI0MCIgeTI9IjIwIiBzdHJva2U9InJnYmEoMjAwLDE3MCw1MCwwLjA0KSIgc3Ryb2tlLXdpZHRoPSIwLjMiLz48L3N2Zz4=')] bg-repeat",
  badge: "bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBvbHlnb24gcG9pbnRzPSIxMiwyIDE1LDkgMjIsOSAxNiwxNCAyMCwyMiAxMiwxNyA0LDIyIDgsMTQgMiw5IDksOSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDE4MCwxNDAsMjAsMC4wNCkiIHN0cm9rZS13aWR0aD0iMC4zIi8+PC9zdmc+')] bg-repeat",
  "globe-lens": "bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAiIGhlaWdodD0iMzAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMTUiIGN5PSIxNSIgcj0iMTIiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSg1MCwxMDAsMjAwLDAuMDQpIiBzdHJva2Utd2lkdGg9IjAuMyIvPjwvc3ZnPg==')] bg-repeat",
  journal: "bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGxpbmUgeDE9IjIiIHkxPSI1IiB4Mj0iMTgiIHkyPSI1IiBzdHJva2U9InJnYmEoMTIwLDgwLDMwLDAuMDUpIiBzdHJva2Utd2lkdGg9IjAuMyIvPjxsaW5lIHgxPSIyIiB5MT0iMTAiIHgyPSIxOCIgeTI9IjEwIiBzdHJva2U9InJnYmEoMTIwLDgwLDMwLDAuMDUpIiBzdHJva2Utd2lkdGg9IjAuMyIvPjxsaW5lIHgxPSIyIiB5MT0iMTUiIHgyPSIxOCIgeTI9IjE1IiBzdHJva2U9InJnYmEoMTIwLDgwLDMwLDAuMDUpIiBzdHJva2Utd2lkdGg9IjAuMyIvPjwvc3ZnPg==')] bg-repeat",
};

const TIER_SUFFIXES: Record<string, string> = {
  Bronze: "bronze",
  Silver: "silver",
  Gold: "gold",
  Mythic: "mythic",
};

const METRIC_LABELS: Record<string, string> = {
  cities_discovered: "Cities Discovered",
  cities_mastered: "Cities Mastered",
  adventures_completed: "Adventures Completed",
  stories_listened: "Stories Listened",
  games_played: "Games Played",
  continents_explored: "Continents Explored",
};

function getItemImageUrl(iconPrefix: string, tierName: string, isUnlocked: boolean): string {
  if (!isUnlocked) {
    return `/images/explorer-kit/${iconPrefix}-bronze.png`;
  }
  const suffix = TIER_SUFFIXES[tierName] || "bronze";
  return `/images/explorer-kit/${iconPrefix}-${suffix}.png`;
}

function getSurpriseImageUrl(iconPrefix: string): string {
  return `/images/explorer-kit/${iconPrefix}.png`;
}

function getRankGateLabel(tierNumber: number): string | null {
  const requiredLevel = KIT_TIER_RANK_GATES[tierNumber];
  if (requiredLevel === undefined || requiredLevel === 0) return null;
  const rank = EXPLORER_XP_RANKS.find(r => r.level === requiredLevel);
  return rank ? rank.name : null;
}

interface ItemCardProps {
  item: KitItemProgress;
  onClick: (item: KitItemProgress) => void;
  playerRankLevel?: number;
}

function ItemCard({ item, onClick, playerRankLevel = 1 }: ItemCardProps) {
  const tierStyle = TIER_CARD_STYLES[item.currentTierName] || TIER_CARD_STYLES.Locked;
  const metric = item.tiers[0]?.metric || '';
  const metricLabel = METRIC_LABELS[metric] || '';
  const texture = ITEM_TEXTURES[item.iconPrefix] || '';

  const nextTierNumber = item.currentTier + 1;
  const nextRankGate = getRankGateLabel(nextTierNumber);
  const nextTierRequiredLevel = KIT_TIER_RANK_GATES[nextTierNumber] || 0;
  const isRankBlocked = !item.isMaxed && nextTierRequiredLevel > 0 && playerRankLevel < nextTierRequiredLevel;

  return (
    <button
      data-testid={`kit-item-${item.itemId}`}
      onClick={() => onClick(item)}
      className={`relative flex flex-col items-center rounded-2xl border-2 overflow-hidden transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] ${tierStyle.bg} ${tierStyle.border} ${tierStyle.glow}`}
    >
      <div className={`absolute inset-0 ${tierStyle.gradient} ${texture} pointer-events-none`} />

      <div className={`relative w-full pt-4 pb-2 px-3 flex items-center justify-center ${!item.isUnlocked ? 'opacity-25 grayscale blur-[1px]' : ''}`}>
        <img
          src={getItemImageUrl(item.iconPrefix, item.currentTierName, item.isUnlocked)}
          alt={item.name}
          className="w-[10rem] h-[10rem] object-contain drop-shadow-md"
          loading="lazy"
        />
        {item.isMaxed && (
          <div className="absolute top-2 right-2 w-7 h-7 bg-purple-500 rounded-full flex items-center justify-center shadow-lg shadow-purple-300/50">
            <span className="text-white text-sm">★</span>
          </div>
        )}
        {isRankBlocked && item.isUnlocked && (
          <div className="absolute top-2 right-2 w-7 h-7 bg-amber-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-300/50">
            <span className="text-white text-[10px]">🔒</span>
          </div>
        )}
      </div>

      <div className="relative w-full px-3 pb-3 pt-1 flex flex-col items-center">
        {item.isUnlocked && (
          <span className={`text-[10px] font-extrabold uppercase tracking-widest mb-0.5 ${tierStyle.text}`}>
            {item.currentTierName}
          </span>
        )}

        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 text-center leading-tight">
          {item.isUnlocked ? item.name : item.name}
        </h3>
        {!item.isUnlocked && (
          <div className="flex items-center gap-1 mt-0.5">
            <Lock className="w-3 h-3 text-purple-400" />
            <span className="text-[10px] text-purple-500 font-semibold">Included with GeoPass</span>
          </div>
        )}

        {item.isMaxed && (
          <span className="text-[10px] font-bold text-purple-500 dark:text-purple-400 uppercase tracking-wider mt-0.5">MAXED</span>
        )}

        {item.isUnlocked && !item.isMaxed && (
          <div className="w-full mt-1.5">
            <div className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${tierStyle.progressBar}`}
                style={{ width: `${item.progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-gray-500 dark:text-gray-400">{item.progressValue}/{item.nextTierThreshold}</span>
              <span className="text-[9px] text-gray-400 dark:text-gray-500">{metricLabel}</span>
            </div>
            {isRankBlocked && nextRankGate && item.nextTierName && (
              <p className="text-[9px] text-amber-500 dark:text-amber-400 mt-0.5 text-center font-semibold">
                {item.nextTierName} 🔒 Reach {nextRankGate} rank
              </p>
            )}
          </div>
        )}

        {!item.isUnlocked && (
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 text-center leading-tight">
            {item.tiers[0]?.threshold} {metricLabel} to unlock
          </p>
        )}
      </div>
    </button>
  );
}

interface ItemDetailProps {
  item: KitItemProgress;
  onClose: () => void;
  playerRankLevel?: number;
}

function ItemDetail({ item, onClose, playerRankLevel = 1 }: ItemDetailProps) {
  const tierStyle = TIER_CARD_STYLES[item.currentTierName] || TIER_CARD_STYLES.Locked;
  const metric = item.tiers[0]?.metric || '';
  const metricLabel = METRIC_LABELS[metric] || '';
  const texture = ITEM_TEXTURES[item.iconPrefix] || '';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className={`relative rounded-3xl p-6 max-w-sm w-full overflow-hidden ${tierStyle.bg} border-2 ${tierStyle.border} ${tierStyle.glow}`}
        onClick={e => e.stopPropagation()}
      >
        <div className={`absolute inset-0 ${tierStyle.gradient} ${texture} pointer-events-none`} />

        <div className="relative">
          <div className="flex justify-end">
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl w-8 h-8 flex items-center justify-center rounded-full bg-white/50 dark:bg-black/30" data-testid="close-item-detail">
              ✕
            </button>
          </div>

          <div className={`flex justify-center mb-4 ${!item.isUnlocked ? 'opacity-25 grayscale blur-[1px]' : ''}`}>
            <img
              src={getItemImageUrl(item.iconPrefix, item.currentTierName, item.isUnlocked)}
              alt={item.name}
              className="w-36 h-36 object-contain drop-shadow-lg"
            />
          </div>

          {item.isUnlocked && (
            <p className={`text-center font-extrabold text-xs uppercase tracking-widest mb-1 ${tierStyle.text}`}>
              {item.currentTierName}
            </p>
          )}

          <h2 className="text-xl font-bold text-center text-gray-800 dark:text-gray-200 mb-1">
            {item.name}
          </h2>

          {item.isUnlocked && (
            <p className="text-center text-xs text-gray-500 dark:text-gray-400 mb-1">
              {item.currentTierLabel}
            </p>
          )}

          <p className="text-center text-gray-500 dark:text-gray-400 text-sm mb-4">
            {item.description}
          </p>

          <div className="space-y-1.5 mb-4">
            {item.tiers.map(tier => {
              const isCurrentOrPast = tier.tier <= item.currentTier;
              const isCurrent = tier.tier === item.currentTier;
              const tierColor = TIER_CARD_STYLES[tier.name] || TIER_CARD_STYLES.Locked;
              const rankGate = getRankGateLabel(tier.tier);
              const gateLevel = KIT_TIER_RANK_GATES[tier.tier] || 0;
              const isRankMet = gateLevel === 0 || playerRankLevel >= gateLevel;
              const isActivityMet = item.progressValue >= tier.threshold;
              return (
                <div
                  key={tier.tier}
                  className={`flex items-center gap-3 p-2 rounded-xl transition-all ${isCurrent ? 'bg-white/60 dark:bg-white/10 border ' + tierColor.border + ' ' + tierColor.glow : 'bg-white/20 dark:bg-white/5'}`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isCurrentOrPast ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                  }`}>
                    {isCurrentOrPast ? '✓' : tier.tier}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${isCurrentOrPast ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}`}>
                      {tier.name} — {tier.label}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5 ${
                        isActivityMet
                          ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                      }`}>
                        {isActivityMet ? '✓' : '○'} {tier.threshold} {metricLabel}
                      </span>
                      {rankGate && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5 ${
                          isRankMet
                            ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400'
                            : 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
                        }`}>
                          {isRankMet ? '✓' : '🔒'} {rankGate} rank
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {!item.isMaxed && item.isUnlocked && (
            <div className="bg-white/40 dark:bg-black/20 rounded-xl p-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progress to {item.nextTierName}</span>
                <span>{item.progressValue} / {item.nextTierThreshold}</span>
              </div>
              <div className="w-full h-2 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${tierStyle.progressBar}`}
                  style={{ width: `${item.progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {item.isMaxed && (
            <div className="text-center py-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-bold">
                ★ MAXED — Legendary Explorer Gear
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const DEFAULT_KIT_ITEMS: KitItemProgress[] = [
  { itemId: "compass", name: "Explorer's Compass", description: "Guides you to new cities.", iconPrefix: "compass", category: "core", displayOrder: 1, isSurprise: false, currentTier: 0, currentTierName: "Locked", currentTierLabel: "Locked", nextTierThreshold: 5, nextTierName: "Bronze", progressValue: 0, progressPercent: 0, maxTier: 4, isMaxed: false, isUnlocked: false, tiers: [{ tier: 1, name: "Bronze", label: "Bronze Compass", metric: "cities_discovered", threshold: 5 }] },
  { itemId: "map-scroll", name: "Map Scroll", description: "Charts your journey.", iconPrefix: "map-scroll", category: "core", displayOrder: 2, isSurprise: false, currentTier: 0, currentTierName: "Locked", currentTierLabel: "Locked", nextTierThreshold: 3, nextTierName: "Bronze", progressValue: 0, progressPercent: 0, maxTier: 4, isMaxed: false, isUnlocked: false, tiers: [{ tier: 1, name: "Bronze", label: "Bronze Map", metric: "continents_explored", threshold: 3 }] },
  { itemId: "boots", name: "Explorer Boots", description: "For every adventure.", iconPrefix: "boots", category: "core", displayOrder: 3, isSurprise: false, currentTier: 0, currentTierName: "Locked", currentTierLabel: "Locked", nextTierThreshold: 3, nextTierName: "Bronze", progressValue: 0, progressPercent: 0, maxTier: 4, isMaxed: false, isUnlocked: false, tiers: [{ tier: 1, name: "Bronze", label: "Bronze Boots", metric: "adventures_completed", threshold: 3 }] },
  { itemId: "sundial", name: "Sundial Watch", description: "Tracks your streaks.", iconPrefix: "sundial", category: "core", displayOrder: 4, isSurprise: false, currentTier: 0, currentTierName: "Locked", currentTierLabel: "Locked", nextTierThreshold: 10, nextTierName: "Bronze", progressValue: 0, progressPercent: 0, maxTier: 4, isMaxed: false, isUnlocked: false, tiers: [{ tier: 1, name: "Bronze", label: "Bronze Sundial", metric: "games_played", threshold: 10 }] },
  { itemId: "badge", name: "Explorer Badge", description: "Shows your rank.", iconPrefix: "badge", category: "core", displayOrder: 5, isSurprise: false, currentTier: 0, currentTierName: "Locked", currentTierLabel: "Locked", nextTierThreshold: 3, nextTierName: "Bronze", progressValue: 0, progressPercent: 0, maxTier: 4, isMaxed: false, isUnlocked: false, tiers: [{ tier: 1, name: "Bronze", label: "Bronze Badge", metric: "cities_mastered", threshold: 3 }] },
  { itemId: "globe-lens", name: "Globe Lens", description: "See the world clearly.", iconPrefix: "globe-lens", category: "core", displayOrder: 6, isSurprise: false, currentTier: 0, currentTierName: "Locked", currentTierLabel: "Locked", nextTierThreshold: 3, nextTierName: "Bronze", progressValue: 0, progressPercent: 0, maxTier: 4, isMaxed: false, isUnlocked: false, tiers: [{ tier: 1, name: "Bronze", label: "Bronze Lens", metric: "stories_listened", threshold: 3 }] },
  { itemId: "journal", name: "Field Journal", description: "Records your discoveries.", iconPrefix: "journal", category: "core", displayOrder: 7, isSurprise: false, currentTier: 0, currentTierName: "Locked", currentTierLabel: "Locked", nextTierThreshold: 10, nextTierName: "Bronze", progressValue: 0, progressPercent: 0, maxTier: 4, isMaxed: false, isUnlocked: false, tiers: [{ tier: 1, name: "Bronze", label: "Bronze Journal", metric: "cities_discovered", threshold: 10 }] },
];

const DEFAULT_KIT_STATE: ExplorerKitState = {
  items: DEFAULT_KIT_ITEMS,
  surpriseItems: [],
  totalTierPoints: 0,
  maxTierPoints: 28,
};

interface ExplorerKitProps {
  onClose?: () => void;
}

export default function ExplorerKit({ onClose }: ExplorerKitProps) {
  const { user } = useUser();
  const { activeExplorer } = useExplorer();
  const [kitState, setKitState] = useState<ExplorerKitState | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<KitItemProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showGeoPassModal, setShowGeoPassModal] = useState(false);

  const playerId = activeExplorer?.id;

  const { data: rankData } = useQuery<{ rank: { level: number }; totalXp: number }>({
    queryKey: ["/api/players", playerId, "xp"],
    queryFn: async () => {
      const res = await fetch(`/api/players/${playerId}/xp`);
      if (!res.ok) throw new Error("Failed to fetch XP");
      return res.json();
    },
    enabled: !!playerId,
    staleTime: 15000,
  });
  const playerRankLevel = rankData?.rank?.level || 1;

  useEffect(() => {
    async function loadKit() {
      try {
        setLoading(true);
        if (!playerId) {
          setKitState(DEFAULT_KIT_STATE);
          return;
        }
        const res = await fetch(`/api/explorer-kit/${playerId}`, { credentials: 'include' });
        if (!res.ok) {
          setKitState(DEFAULT_KIT_STATE);
          return;
        }
        const data = await res.json();
        setKitState(data);
      } catch (e) {
        console.error("Failed to load explorer kit:", e);
        setKitState(DEFAULT_KIT_STATE);
      } finally {
        setLoading(false);
      }
    }

    loadKit();
  }, [playerId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20" data-testid="explorer-kit-loading">
        <div className="w-12 h-12 border-4 border-amber-300 border-t-amber-600 rounded-full animate-spin mb-4" />
        <p className="text-gray-500">Loading Explorer Kit...</p>
      </div>
    );
  }

  if (!kitState) {
    return (
      <div className="flex flex-col items-center justify-center py-20" data-testid="explorer-kit-error">
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  const unlockedCount = kitState.items.filter(i => i.isUnlocked).length;
  const overallPercent = kitState.maxTierPoints > 0
    ? Math.round((kitState.totalTierPoints / kitState.maxTierPoints) * 100)
    : 0;

  return (
    <div className="pb-8" data-testid="explorer-kit-screen">
      <div className="flex items-center justify-between mb-4">
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            data-testid="explorer-kit-back"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
          <span>🎒</span> Explorer Kit
        </h1>
        <div className="w-6" />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6" data-testid="explorer-kit-grid">
        {kitState.items.map(item => (
          <ItemCard
            key={item.itemId}
            item={item}
            onClick={(clicked) => {
              if (!clicked.isUnlocked) {
                setShowGeoPassModal(true);
              } else {
                setSelectedItem(clicked);
              }
            }}
            playerRankLevel={playerRankLevel}
          />
        ))}
      </div>

      {kitState.surpriseItems.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
            <span>✨</span> Surprise Finds
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {kitState.surpriseItems.map(si => (
              <div
                key={si.itemId}
                className="relative flex flex-col items-center p-4 rounded-2xl border-2 border-purple-400/60 bg-gradient-to-b from-purple-50 via-violet-50 to-purple-100/80 dark:from-purple-950/50 dark:via-violet-950/30 dark:to-purple-900/40 shadow-[0_0_20px_rgba(147,51,234,0.3)] overflow-hidden"
                data-testid={`surprise-item-${si.itemId}`}
              >
                <img
                  src={getSurpriseImageUrl(si.iconPrefix)}
                  alt={si.name}
                  className="w-24 h-24 object-contain mb-2 drop-shadow-md"
                />
                <h3 className="text-sm font-bold text-purple-700 dark:text-purple-300 text-center">{si.name}</h3>
                <p className="text-[10px] text-purple-500 dark:text-purple-400 text-center mt-1">{si.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-2xl p-4 border border-amber-200/50 dark:border-amber-700/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-amber-800 dark:text-amber-300">Kit Progress</span>
          <span className="text-sm font-bold text-amber-700 dark:text-amber-400">{unlockedCount}/{kitState.items.length} items</span>
        </div>
        <div className="w-full h-2.5 bg-amber-200/50 dark:bg-amber-800/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-700"
            style={{ width: `${overallPercent}%` }}
          />
        </div>
        <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">{overallPercent}% complete</p>
      </div>

      {selectedItem && <ItemDetail item={selectedItem} onClose={() => setSelectedItem(null)} playerRankLevel={playerRankLevel} />}

      <GeoPassModal
        isOpen={showGeoPassModal}
        onClose={() => setShowGeoPassModal(false)}
      />
    </div>
  );
}
