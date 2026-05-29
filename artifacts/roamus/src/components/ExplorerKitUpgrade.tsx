import { useState, useEffect } from "react";

interface UpgradeResult {
  itemId: string;
  itemName: string;
  oldTier: number;
  oldTierName: string;
  newTier: number;
  newTierName: string;
  iconPrefix: string;
}

interface SurpriseReveal {
  itemId: string;
  name: string;
  description: string;
  iconPrefix: string;
}

const TIER_SUFFIXES: Record<string, string> = {
  Bronze: "bronze",
  Silver: "silver",
  Gold: "gold",
  Mythic: "mythic",
};

const UPGRADE_MESSAGES: Record<string, string> = {
  Bronze: "Your journey begins!",
  Silver: "Your skills are growing!",
  Gold: "A true explorer emerges!",
  Mythic: "Legendary status achieved!",
};

const TIER_GLOW_COLORS: Record<string, { ring: string; bg: string; particles: string; text: string }> = {
  Bronze: { ring: "ring-amber-400/60", bg: "from-amber-500/20 to-orange-500/10", particles: "bg-amber-400", text: "text-amber-600 dark:text-amber-400" },
  Silver: { ring: "ring-slate-400/60", bg: "from-slate-400/20 to-gray-300/10", particles: "bg-slate-400", text: "text-slate-600 dark:text-slate-300" },
  Gold: { ring: "ring-yellow-400/70", bg: "from-yellow-400/25 to-amber-400/15", particles: "bg-yellow-400", text: "text-yellow-600 dark:text-yellow-400" },
  Mythic: { ring: "ring-purple-500/70", bg: "from-purple-500/25 to-violet-500/15", particles: "bg-purple-400", text: "text-purple-600 dark:text-purple-400" },
};

function Sparkles({ color }: { color: string }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className={`absolute w-1.5 h-1.5 rounded-full ${color} animate-ping`}
          style={{
            left: `${15 + Math.random() * 70}%`,
            top: `${10 + Math.random() * 80}%`,
            animationDelay: `${Math.random() * 1.5}s`,
            animationDuration: `${1 + Math.random() * 1.5}s`,
            opacity: 0.7,
          }}
        />
      ))}
    </div>
  );
}

function ShimmerOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
      <div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
        style={{
          animation: "shimmer 2s ease-in-out infinite",
          transform: "skewX(-20deg)",
        }}
      />
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-200%) skewX(-20deg); }
          100% { transform: translateX(200%) skewX(-20deg); }
        }
      `}</style>
    </div>
  );
}

interface ExplorerKitUpgradeProps {
  upgrades: UpgradeResult[];
  surpriseItem?: SurpriseReveal | null;
  onClose: () => void;
  onViewKit?: () => void;
}

export default function ExplorerKitUpgrade({ upgrades, surpriseItem, onClose, onViewKit }: ExplorerKitUpgradeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<'old' | 'glow' | 'shimmer' | 'new' | 'surprise'>('old');
  const [showingSurprise, setShowingSurprise] = useState(false);

  const currentUpgrade = upgrades[currentIndex];
  const isLastUpgrade = currentIndex >= upgrades.length - 1;
  const hasSurprise = !!surpriseItem;

  useEffect(() => {
    if (!currentUpgrade && !showingSurprise) {
      if (hasSurprise) {
        setShowingSurprise(true);
        setPhase('surprise');
      } else {
        onClose();
      }
      return;
    }

    if (currentUpgrade) {
      setPhase('old');
      const t1 = setTimeout(() => setPhase('glow'), 600);
      const t2 = setTimeout(() => setPhase('shimmer'), 1200);
      const t3 = setTimeout(() => setPhase('new'), 2000);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
  }, [currentIndex, currentUpgrade]);

  function handleNext() {
    if (!isLastUpgrade) {
      setCurrentIndex(prev => prev + 1);
    } else if (hasSurprise && !showingSurprise) {
      setShowingSurprise(true);
      setPhase('surprise');
    } else {
      onClose();
    }
  }

  if (showingSurprise && surpriseItem) {
    return (
      <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4" data-testid="surprise-reveal-modal">
        <div className="relative bg-gradient-to-b from-purple-50 to-violet-100 dark:from-purple-950 dark:to-violet-950 rounded-3xl p-8 max-w-sm w-full text-center shadow-[0_0_60px_rgba(147,51,234,0.4)] border-2 border-purple-400/50 overflow-hidden">
          <Sparkles color="bg-purple-400" />
          <ShimmerOverlay />

          <div className="relative">
            <div className="mb-3">
              <span className="text-4xl">✨</span>
            </div>
            <h2 className="text-xl font-bold text-purple-700 dark:text-purple-300 mb-4">
              Surprise Find!
            </h2>

            <div className="relative w-32 h-32 mx-auto mb-4">
              <img
                src={`/images/explorer-kit/${surpriseItem.iconPrefix}.png`}
                alt={surpriseItem.name}
                className="w-full h-full object-contain drop-shadow-lg animate-bounce"
              />
              <div className="absolute inset-0 rounded-full bg-purple-400/20 animate-ping" />
            </div>

            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-1">
              {surpriseItem.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {surpriseItem.description}
            </p>

            <div className="flex flex-col gap-2">
              {onViewKit && (
                <button
                  onClick={onViewKit}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-purple-400/30"
                  data-testid="surprise-view-kit"
                >
                  View Explorer Kit
                </button>
              )}
              <button
                onClick={onClose}
                className="w-full py-2.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-medium"
                data-testid="surprise-dismiss"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUpgrade) return null;

  const oldSuffix = currentUpgrade.oldTier > 0 ? TIER_SUFFIXES[currentUpgrade.oldTierName] || 'bronze' : 'bronze';
  const newSuffix = TIER_SUFFIXES[currentUpgrade.newTierName] || 'bronze';
  const message = UPGRADE_MESSAGES[currentUpgrade.newTierName] || "Keep exploring!";
  const glowColors = TIER_GLOW_COLORS[currentUpgrade.newTierName] || TIER_GLOW_COLORS.Bronze;

  const isGlowing = phase === 'glow' || phase === 'shimmer';
  const isRevealed = phase === 'new';

  return (
    <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4" data-testid="upgrade-animation-modal">
      <div className={`relative bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl overflow-hidden transition-all duration-700 ${
        isGlowing ? `ring-4 ${glowColors.ring} shadow-[0_0_40px_rgba(234,179,8,0.3)]` :
        isRevealed ? `ring-4 ${glowColors.ring} shadow-[0_0_50px_rgba(234,179,8,0.4)]` : ''
      }`}>
        {isRevealed && <Sparkles color={glowColors.particles} />}
        {(isGlowing || isRevealed) && <ShimmerOverlay />}

        <div className={`absolute inset-0 bg-gradient-to-b ${glowColors.bg} transition-opacity duration-700 pointer-events-none ${
          isGlowing || isRevealed ? 'opacity-100' : 'opacity-0'
        }`} />

        <div className="relative">
          <div className="mb-3">
            <span className="text-3xl">{isRevealed ? '🎉' : isGlowing ? '⚡' : '⬆️'}</span>
          </div>

          <h2 className={`text-lg font-bold mb-4 transition-all duration-500 ${
            isRevealed ? glowColors.text : 'text-gray-700 dark:text-gray-300'
          }`}>
            {isRevealed ? `${currentUpgrade.itemName} Upgraded!` : 'Upgrading...'}
          </h2>

          <div className="relative w-36 h-36 mx-auto mb-4">
            <img
              src={`/images/explorer-kit/${currentUpgrade.iconPrefix}-${isRevealed ? newSuffix : oldSuffix}.png`}
              alt={currentUpgrade.itemName}
              className={`w-full h-full object-contain transition-all duration-700 ${
                phase === 'glow' ? 'scale-110 brightness-125' :
                phase === 'shimmer' ? 'scale-115 brightness-150 blur-[2px]' :
                isRevealed ? 'scale-100 drop-shadow-[0_0_20px_rgba(234,179,8,0.5)]' :
                'scale-100'
              }`}
            />
            {isGlowing && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`w-28 h-28 rounded-full ${glowColors.particles}/20 animate-ping`} />
              </div>
            )}
          </div>

          {isRevealed && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-center gap-3 mb-2">
                {currentUpgrade.oldTier > 0 && (
                  <span className="text-sm text-gray-400 line-through">{currentUpgrade.oldTierName}</span>
                )}
                <span className="text-lg">→</span>
                <span className={`text-sm font-extrabold uppercase tracking-wider ${glowColors.text}`}>
                  {currentUpgrade.newTierName}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{message}</p>

              <div className="flex flex-col gap-2">
                {onViewKit && (
                  <button
                    onClick={onViewKit}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-amber-400/30"
                    data-testid="upgrade-view-kit"
                  >
                    View Explorer Kit
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className="w-full py-2.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-medium"
                  data-testid="upgrade-continue"
                >
                  {isLastUpgrade && !hasSurprise ? 'Close' : 'Next'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
