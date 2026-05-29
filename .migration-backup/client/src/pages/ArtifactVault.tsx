import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Gem, Lock, MapPin, Star, Sparkles, Filter, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useTravel } from "@/lib/travelContext";
import { useExplorer } from "@/lib/explorerContext";
import { setInternalNavToAdventures } from "@/components/GatedTravelMode";

const RARITY_STYLES = {
  common: {
    bg: "bg-slate-100 dark:bg-slate-700",
    border: "border-slate-300 dark:border-slate-600",
    glow: "",
    label: "Common",
    icon: "🪨",
    gradient: "from-slate-400 to-slate-500",
  },
  rare: {
    bg: "bg-blue-50 dark:bg-blue-900/30",
    border: "border-blue-400 dark:border-blue-600",
    glow: "shadow-blue-200 dark:shadow-blue-800/50 shadow-md",
    label: "Rare",
    icon: "💎",
    gradient: "from-blue-400 to-blue-600",
  },
  legendary: {
    bg: "bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30",
    border: "border-amber-400 dark:border-amber-500",
    glow: "shadow-amber-300 dark:shadow-amber-700/60 shadow-lg",
    label: "Legendary",
    icon: "⭐",
    gradient: "from-amber-400 via-yellow-400 to-amber-500",
  },
};

interface CollectedArtifact {
  id: number;
  artifactId: number;
  collectedAt: string;
  artifact: {
    id: number;
    stopName: string;
    name: string;
    emoji: string;
    description: string;
    rarity: string;
    unlockType: string;
    funFact: string | null;
  };
}

export default function ArtifactVault() {
  const [, navigate] = useLocation();
  const { trips } = useTravel();
  const { activeExplorer } = useExplorer();
  const [selectedTrip, setSelectedTrip] = useState<string | null>(null);
  const [selectedRarity, setSelectedRarity] = useState<string | null>(null);
  const [viewingArtifact, setViewingArtifact] = useState<CollectedArtifact | null>(null);

  const { data: collectedData, isLoading } = useQuery<{ artifacts: CollectedArtifact[] }>({
    queryKey: ['/api/travel/artifacts/collected', activeExplorer?.id, selectedTrip],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeExplorer?.id) params.set('explorerId', activeExplorer.id);
      if (selectedTrip) params.set('tripId', selectedTrip);
      const res = await fetch(`/api/travel/artifacts/collected?${params}`);
      if (!res.ok) throw new Error('Failed to fetch artifacts');
      return res.json();
    },
    enabled: !!activeExplorer?.id,
  });

  const collectedArtifacts = collectedData?.artifacts || [];
  
  const filteredArtifacts = selectedRarity 
    ? collectedArtifacts.filter(a => a.artifact.rarity === selectedRarity)
    : collectedArtifacts;

  const stats = {
    total: collectedArtifacts.length,
    common: collectedArtifacts.filter(a => a.artifact.rarity === 'common').length,
    rare: collectedArtifacts.filter(a => a.artifact.rarity === 'rare').length,
    legendary: collectedArtifacts.filter(a => a.artifact.rarity === 'legendary').length,
  };

  const groupedByStop = filteredArtifacts.reduce((acc, artifact) => {
    const stop = artifact.artifact.stopName;
    if (!acc[stop]) acc[stop] = [];
    acc[stop].push(artifact);
    return acc;
  }, {} as Record<string, CollectedArtifact[]>);

  // If no active explorer, show a message to select one
  if (!activeExplorer) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 dark:from-slate-900 dark:to-slate-800"
      >
        <header className="sticky top-0 z-40 bg-amber-50/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-amber-200 dark:border-slate-700">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => { setInternalNavToAdventures(); navigate('/geoadventures'); }}
              data-testid="button-back-vault-no-explorer"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Gem className="w-5 h-5 text-amber-500" />
                Travel Keepsake
              </h1>
            </div>
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 py-8">
          <Card className="bg-white/50 dark:bg-slate-800/50">
            <CardContent className="p-8 text-center">
              <div className="text-5xl mb-4">👤</div>
              <h3 className="font-semibold mb-2">Select an Explorer</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Please select an explorer profile to view their collected treasures.
              </p>
              <Button onClick={() => navigate('/')} data-testid="button-select-explorer">
                Go to Explorer Selection
              </Button>
            </CardContent>
          </Card>
        </main>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 dark:from-slate-900 dark:to-slate-800"
    >
      <header className="sticky top-0 z-40 bg-amber-50/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-amber-200 dark:border-slate-700">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => { setInternalNavToAdventures(); navigate('/geoadventures'); }}
            data-testid="button-back-vault"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Gem className="w-5 h-5 text-amber-500" />
              Travel Keepsake
            </h1>
            <p className="text-xs text-muted-foreground">Treasures from your adventures</p>
          </div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-2xl"
          >
            🏛️
          </motion.div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <Card className="bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 border-amber-200 dark:border-amber-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500" />
                <span className="font-semibold">Collection Stats</span>
              </div>
              <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.total}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setSelectedRarity(selectedRarity === 'common' ? null : 'common')}
                className={cn(
                  "flex flex-col items-center p-2 rounded-lg transition-all",
                  selectedRarity === 'common' 
                    ? "bg-slate-200 dark:bg-slate-600 ring-2 ring-slate-400"
                    : "bg-white/50 dark:bg-slate-800/50"
                )}
              >
                <span className="text-lg">🪨</span>
                <span className="text-xs text-muted-foreground">Common</span>
                <span className="font-bold">{stats.common}</span>
              </button>
              <button
                onClick={() => setSelectedRarity(selectedRarity === 'rare' ? null : 'rare')}
                className={cn(
                  "flex flex-col items-center p-2 rounded-lg transition-all",
                  selectedRarity === 'rare' 
                    ? "bg-blue-100 dark:bg-blue-800/50 ring-2 ring-blue-400"
                    : "bg-white/50 dark:bg-slate-800/50"
                )}
              >
                <span className="text-lg">💎</span>
                <span className="text-xs text-muted-foreground">Rare</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{stats.rare}</span>
              </button>
              <button
                onClick={() => setSelectedRarity(selectedRarity === 'legendary' ? null : 'legendary')}
                className={cn(
                  "flex flex-col items-center p-2 rounded-lg transition-all",
                  selectedRarity === 'legendary' 
                    ? "bg-amber-100 dark:bg-amber-800/50 ring-2 ring-amber-400"
                    : "bg-white/50 dark:bg-slate-800/50"
                )}
              >
                <span className="text-lg">⭐</span>
                <span className="text-xs text-muted-foreground">Legendary</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">{stats.legendary}</span>
              </button>
            </div>
          </CardContent>
        </Card>

        {trips.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            <Button
              variant={selectedTrip === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTrip(null)}
              className="shrink-0"
            >
              All Trips
            </Button>
            {trips.map(trip => (
              <Button
                key={trip.id}
                variant={selectedTrip === trip.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTrip(trip.id)}
                className="shrink-0"
              >
                {trip.destination}
              </Button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="text-4xl mb-4"
            >
              💎
            </motion.div>
            <p className="text-muted-foreground">Loading your treasures...</p>
          </div>
        ) : filteredArtifacts.length === 0 ? (
          <Card className="bg-white/50 dark:bg-slate-800/50">
            <CardContent className="p-8 text-center">
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-5xl mb-4"
              >
                🗺️
              </motion.div>
              <h3 className="font-semibold mb-2">No Artifacts Yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {selectedRarity 
                  ? `You haven't collected any ${selectedRarity} artifacts yet.`
                  : "Start exploring Journey Packs to collect historical treasures!"}
              </p>
              <Button onClick={() => { setInternalNavToAdventures(); navigate('/geoadventures'); }} data-testid="button-go-explore">
                <MapPin className="w-4 h-4 mr-2" />
                Start Exploring
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByStop).map(([stopName, artifacts]) => (
              <div key={stopName}>
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-amber-500" />
                  <h2 className="font-semibold text-sm text-muted-foreground">{stopName}</h2>
                  <span className="text-xs bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full text-amber-700 dark:text-amber-300">
                    {artifacts.length} treasure{artifacts.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {artifacts.map((collected, i) => {
                    const rarity = RARITY_STYLES[collected.artifact.rarity as keyof typeof RARITY_STYLES] || RARITY_STYLES.common;
                    return (
                      <motion.button
                        key={collected.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        onClick={() => setViewingArtifact(collected)}
                        className={cn(
                          "relative p-4 rounded-xl border-2 text-left transition-transform hover:scale-105",
                          rarity.bg,
                          rarity.border,
                          rarity.glow
                        )}
                        data-testid={`artifact-${collected.id}`}
                      >
                        {collected.artifact.rarity === 'legendary' && (
                          <motion.div
                            className="absolute -top-1 -right-1"
                            animate={{ rotate: [0, 15, -15, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            <Sparkles className="w-4 h-4 text-amber-500" />
                          </motion.div>
                        )}
                        <div className="text-3xl mb-2">{collected.artifact.emoji}</div>
                        <h3 className="font-semibold text-sm leading-tight mb-1">{collected.artifact.name}</h3>
                        <div className="flex items-center gap-1">
                          <span className="text-xs">{rarity.icon}</span>
                          <span className="text-xs text-muted-foreground">{rarity.label}</span>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <AnimatePresence>
        {viewingArtifact && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
            onClick={() => setViewingArtifact(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className={cn(
                "w-full max-w-sm rounded-2xl p-6 relative",
                RARITY_STYLES[viewingArtifact.artifact.rarity as keyof typeof RARITY_STYLES]?.bg || "bg-white dark:bg-slate-800",
                RARITY_STYLES[viewingArtifact.artifact.rarity as keyof typeof RARITY_STYLES]?.border || "",
                "border-2"
              )}
            >
              {viewingArtifact.artifact.rarity === 'legendary' && (
                <motion.div
                  className="absolute inset-0 rounded-2xl pointer-events-none"
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{
                    background: "radial-gradient(circle at center, rgba(251, 191, 36, 0.2) 0%, transparent 70%)"
                  }}
                />
              )}
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
                  className="text-6xl mb-4"
                >
                  {viewingArtifact.artifact.emoji}
                </motion.div>
                <h2 className="text-xl font-bold mb-2">{viewingArtifact.artifact.name}</h2>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className="text-sm px-3 py-1 rounded-full bg-white/50 dark:bg-slate-700/50">
                    {RARITY_STYLES[viewingArtifact.artifact.rarity as keyof typeof RARITY_STYLES]?.icon}{' '}
                    {RARITY_STYLES[viewingArtifact.artifact.rarity as keyof typeof RARITY_STYLES]?.label}
                  </span>
                  <span className="text-sm px-3 py-1 rounded-full bg-white/50 dark:bg-slate-700/50">
                    📍 {viewingArtifact.artifact.stopName}
                  </span>
                </div>
                <p className="text-muted-foreground mb-4">{viewingArtifact.artifact.description}</p>
                {viewingArtifact.artifact.funFact && (
                  <Card className="bg-white/50 dark:bg-slate-800/50 mb-4">
                    <CardContent className="p-3">
                      <p className="text-sm flex items-start gap-2">
                        <span className="text-lg shrink-0">💡</span>
                        <span>{viewingArtifact.artifact.funFact}</span>
                      </p>
                    </CardContent>
                  </Card>
                )}
                <p className="text-xs text-muted-foreground mb-4">
                  Collected on {new Date(viewingArtifact.collectedAt).toLocaleDateString()}
                </p>
                <Button 
                  onClick={() => setViewingArtifact(null)}
                  className="w-full"
                  data-testid="button-close-artifact"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
