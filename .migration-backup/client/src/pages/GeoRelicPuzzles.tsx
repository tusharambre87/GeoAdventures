import { useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Puzzle, Lock, Star, MapPin, ChevronRight, Globe, Map } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useExplorer } from "@/lib/explorerContext";
import { GeoRelicPuzzle } from "@/components/GeoRelicPuzzle";
import { MapPuzzle } from "@/components/MapPuzzle";
import type { GeoRelicPuzzle as PuzzleType, GeoRelicPuzzlePiece, PlayerPuzzleProgress, MapPuzzle as MapPuzzleType, MapPuzzleRegion } from "@shared/schema";

const CONTINENTS = [
  { id: "Africa", emoji: "🌍", color: "from-orange-400 to-orange-600", bg: "bg-orange-50 dark:bg-orange-900/20" },
  { id: "Asia", emoji: "🌏", color: "from-yellow-400 to-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-900/20" },
  { id: "Europe", emoji: "🏰", color: "from-purple-400 to-purple-600", bg: "bg-purple-50 dark:bg-purple-900/20" },
  { id: "North America", emoji: "🗽", color: "from-red-400 to-red-600", bg: "bg-red-50 dark:bg-red-900/20" },
  { id: "South America", emoji: "🦜", color: "from-green-400 to-green-600", bg: "bg-green-50 dark:bg-green-900/20" },
  { id: "Oceania", emoji: "🦘", color: "from-teal-400 to-teal-600", bg: "bg-teal-50 dark:bg-teal-900/20" },
] as const;

interface MapPuzzleWithRegions extends MapPuzzleType {
  regions: MapPuzzleRegion[];
}

export default function GeoRelicPuzzles() {
  const [, navigate] = useLocation();
  const fromPage = new URLSearchParams(window.location.search).get('from');
  const { activeExplorer } = useExplorer();
  const [selectedContinent, setSelectedContinent] = useState<string | null>(null);
  const [activePuzzle, setActivePuzzle] = useState<{ puzzle: PuzzleType; pieces: GeoRelicPuzzlePiece[] } | null>(null);
  const [puzzleTab, setPuzzleTab] = useState<"landmarks" | "maps">("landmarks");
  const [mapPuzzles, setMapPuzzles] = useState<MapPuzzleType[]>([]);
  const [selectedMapPuzzle, setSelectedMapPuzzle] = useState<MapPuzzleWithRegions | null>(null);
  const [isLoadingMaps, setIsLoadingMaps] = useState(false);

  const explorerId = activeExplorer?.id;

  useEffect(() => {
    if (puzzleTab === "maps") {
      fetchMapPuzzles();
    }
  }, [puzzleTab]);

  const fetchMapPuzzles = async () => {
    setIsLoadingMaps(true);
    try {
      const response = await fetch("/api/map-puzzles", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        setMapPuzzles(data);
      }
    } catch (error) {
      console.error("Failed to fetch map puzzles:", error);
    } finally {
      setIsLoadingMaps(false);
    }
  };

  const handleMapPuzzleSelect = async (puzzleId: string) => {
    try {
      const response = await fetch(`/api/map-puzzles/${puzzleId}`, { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        console.log("[MapPuzzle] Fetched puzzle data:", data?.regions?.length, "regions");
        setSelectedMapPuzzle(data);
      }
    } catch (error) {
      console.error("Failed to fetch puzzle details:", error);
    }
  };

  const handleMapPuzzleComplete = async (starsAwarded: number) => {
    if (!activeExplorer || !selectedMapPuzzle) return;
    try {
      await fetch(`/api/map-puzzles/${selectedMapPuzzle.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ explorerId: activeExplorer.id }),
      });
    } catch (error) {
      console.error("Failed to save puzzle completion:", error);
    }
  };

  // Fetch all world mode puzzles
  const { data: puzzlesData, isLoading } = useQuery<{
    puzzles: PuzzleType[];
    byContinent: Record<string, PuzzleType[]>;
  }>({
    queryKey: ['/api/puzzles/world'],
    queryFn: async () => {
      const res = await fetch('/api/puzzles/world');
      if (!res.ok) throw new Error('Failed to fetch puzzles');
      return res.json();
    },
  });

  // Fetch completed puzzles for the explorer
  const { data: completedData, refetch: refetchCompleted } = useQuery<PlayerPuzzleProgress[]>({
    queryKey: ['/api/puzzles/completed', explorerId],
    queryFn: async () => {
      if (!explorerId) return [];
      const res = await fetch(`/api/puzzles/completed/${explorerId}`);
      if (!res.ok) throw new Error('Failed to fetch progress');
      return res.json();
    },
    enabled: !!explorerId,
  });

  const completedPuzzleIds = new Set(
    completedData?.filter((p) => p.isCompleted).map((p) => p.puzzleId) || []
  );

  const handleSelectPuzzle = useCallback(async (puzzle: PuzzleType) => {
    try {
      const res = await fetch(`/api/puzzles/${puzzle.id}`);
      if (!res.ok) throw new Error('Failed to fetch puzzle');
      const data = await res.json();
      setActivePuzzle({ puzzle: data.puzzle, pieces: data.pieces });
    } catch (error) {
      console.error('Error loading puzzle:', error);
    }
  }, []);

  const handlePuzzleComplete = useCallback(
    (result: { starsAwarded: number }) => {
      refetchCompleted();
      setActivePuzzle(null);
    },
    [refetchCompleted]
  );

  const continentPuzzles = selectedContinent
    ? (puzzlesData?.byContinent[selectedContinent] || [])
    : [];

  const continentStats = CONTINENTS.map((c) => {
    const puzzles = puzzlesData?.byContinent[c.id] || [];
    const completed = puzzles.filter((p) => completedPuzzleIds.has(p.id)).length;
    return { ...c, total: puzzles.length, completed };
  });

  // If a map puzzle is active, show it
  if (selectedMapPuzzle && explorerId) {
    return (
      <div className="h-screen flex flex-col bg-gradient-to-b from-blue-100 to-blue-50">
        <MapPuzzle
          puzzleId={selectedMapPuzzle.id}
          puzzleName={selectedMapPuzzle.name}
          viewBox={selectedMapPuzzle.viewBox || "0 0 959 593"}
          backgroundColor={selectedMapPuzzle.backgroundColor || "#E3F2FD"}
          regions={selectedMapPuzzle.regions}
          starsReward={selectedMapPuzzle.starsReward || 5}
          explorerId={explorerId}
          onComplete={handleMapPuzzleComplete}
          onBack={() => setSelectedMapPuzzle(null)}
        />
      </div>
    );
  }

  // If a landmark puzzle is active, show the puzzle game
  if (activePuzzle && explorerId) {
    return (
      <GeoRelicPuzzle
        puzzle={activePuzzle.puzzle}
        pieces={activePuzzle.pieces}
        mode="world"
        explorerId={explorerId}
        onComplete={handlePuzzleComplete}
        onClose={() => setActivePuzzle(null)}
        geoBuddyMessage={activePuzzle.puzzle.funFact || "Let's explore together and find where this belongs!"}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-amber-50 dark:from-gray-900 dark:to-gray-800 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-400 to-amber-400 dark:from-sky-700 dark:to-amber-700 p-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => (selectedContinent ? setSelectedContinent(null) : navigate(fromPage || "/play-games"))}
            className="bg-white/20 hover:bg-white/30 text-white rounded-full"
            data-testid="button-back-puzzles"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Puzzle className="w-7 h-7" />
              GeoRelic Puzzles
            </h1>
            <p className="text-white/80 text-sm">
              {puzzleTab === "landmarks" 
                ? (selectedContinent ? `Explore ${selectedContinent}` : "Discover landmarks from around the world")
                : "Drag state shapes onto the map!"}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-4 max-w-4xl mx-auto">
        <Button
          variant={puzzleTab === "landmarks" ? "default" : "outline"}
          onClick={() => { setPuzzleTab("landmarks"); setSelectedContinent(null); }}
          className={cn(
            "flex-1 gap-2",
            puzzleTab === "landmarks" && "bg-gradient-to-r from-amber-500 to-orange-500"
          )}
          data-testid="tab-landmarks"
        >
          <Puzzle className="w-4 h-4" />
          Landmark Puzzles
        </Button>
        <Button
          variant={puzzleTab === "maps" ? "default" : "outline"}
          onClick={() => setPuzzleTab("maps")}
          className={cn(
            "flex-1 gap-2",
            puzzleTab === "maps" && "bg-gradient-to-r from-blue-500 to-purple-500"
          )}
          data-testid="tab-maps"
        >
          <Globe className="w-4 h-4" />
          Map Puzzles
        </Button>
      </div>

      <div className="p-4 max-w-4xl mx-auto pt-0">
        <AnimatePresence mode="wait">
          {puzzleTab === "maps" ? (
            // Map Puzzles tab
            <motion.div
              key="maps"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-800 dark:to-purple-800 rounded-full flex items-center justify-center mx-auto shadow-lg border-4 border-blue-200 dark:border-blue-600 mb-4">
                  <Globe className="w-10 h-10 text-blue-600 dark:text-blue-300" />
                </div>
                <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                  Drag state and country shapes onto the map outline to learn geography!
                </p>
              </div>

              {isLoadingMaps ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full" />
                </div>
              ) : mapPuzzles.length === 0 ? (
                <div className="text-center py-12">
                  <Globe className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No map puzzles available yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {mapPuzzles.map((puzzle, index) => (
                    <motion.div
                      key={puzzle.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => handleMapPuzzleSelect(puzzle.id)}
                      className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border-2 border-blue-200 dark:border-blue-700 cursor-pointer hover:shadow-xl transition-all hover:scale-[1.02]"
                      data-testid={`map-puzzle-card-${puzzle.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center">
                          <Map className="w-8 h-8 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200">
                            {puzzle.name}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {puzzle.difficulty} difficulty
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-400" />
                            <span className="text-sm font-medium text-yellow-600">
                              +{puzzle.starsReward || 5} stars
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : !selectedContinent ? (
            // Continent selection
            <motion.div
              key="continents"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-800 dark:to-orange-800 rounded-full flex items-center justify-center mx-auto shadow-lg border-4 border-amber-200 dark:border-amber-600 mb-4">
                  <span className="text-4xl">🧭</span>
                </div>
                <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                  Each continent has ancient relics waiting to be pieced together. Complete puzzles to earn stars!
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {continentStats.map((continent) => (
                  <motion.button
                    key={continent.id}
                    onClick={() => setSelectedContinent(continent.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "p-6 rounded-2xl border-2 text-left transition-all",
                      continent.bg,
                      "border-gray-200 dark:border-gray-700 hover:shadow-lg"
                    )}
                    data-testid={`button-continent-${continent.id.toLowerCase().replace(' ', '-')}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-4xl">{continent.emoji}</span>
                      {continent.total > 0 && (
                        <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-500" />
                          <span className="text-sm font-medium">
                            {continent.completed}/{continent.total}
                          </span>
                        </div>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                      {continent.id}
                    </h3>
                    {continent.total > 0 ? (
                      <div className="mt-2">
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full bg-gradient-to-r", continent.color)}
                            style={{ width: `${(continent.completed / continent.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 mt-2">Coming soon...</p>
                    )}
                    <div className="flex items-center text-sm text-gray-500 mt-3">
                      <span>Explore puzzles</span>
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            // Puzzle list for selected continent
            <motion.div
              key="puzzles"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {continentPuzzles.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Puzzle className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">
                    No puzzles yet
                  </h3>
                  <p className="text-gray-500">
                    {selectedContinent} puzzles are coming soon!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {continentPuzzles.map((puzzle, index) => {
                    const isCompleted = completedPuzzleIds.has(puzzle.id);
                    const isLocked = false; // Future: implement unlock progression

                    return (
                      <motion.div
                        key={puzzle.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={cn(
                          "relative rounded-2xl overflow-hidden border-2 transition-all",
                          isCompleted
                            ? "border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/20"
                            : isLocked
                            ? "border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/50 opacity-60"
                            : "border-sky-300 dark:border-sky-700 bg-white dark:bg-gray-800 hover:shadow-lg"
                        )}
                      >
                        {/* Puzzle image preview */}
                        <div className="relative h-40 overflow-hidden">
                          <img
                            src={puzzle.imageUrl}
                            alt={puzzle.title}
                            className={cn(
                              "w-full h-full object-cover",
                              isLocked && "blur-sm grayscale"
                            )}
                          />
                          {isCompleted && (
                            <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center">
                              <div className="bg-white dark:bg-gray-800 rounded-full p-3 shadow-lg">
                                <Star className="w-8 h-8 text-yellow-500 fill-yellow-400" />
                              </div>
                            </div>
                          )}
                          {isLocked && (
                            <div className="absolute inset-0 bg-gray-500/50 flex items-center justify-center">
                              <div className="bg-white dark:bg-gray-800 rounded-full p-3 shadow-lg">
                                <Lock className="w-8 h-8 text-gray-500" />
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-bold text-gray-800 dark:text-gray-200">
                                {puzzle.title}
                              </h3>
                              <p className="text-sm text-gray-500 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {puzzle.continent}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded-full">
                              <Puzzle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                              <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                                {puzzle.pieceCount || 6} pcs
                              </span>
                            </div>
                          </div>

                          {puzzle.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                              {puzzle.description}
                            </p>
                          )}

                          <Button
                            onClick={() => handleSelectPuzzle(puzzle)}
                            disabled={isLocked}
                            className={cn(
                              "w-full rounded-xl",
                              isCompleted
                                ? "bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600"
                                : "bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-500 hover:to-blue-600"
                            )}
                            data-testid={`button-puzzle-${puzzle.id}`}
                          >
                            {isCompleted ? "Play Again" : isLocked ? "Locked" : "Start Puzzle"}
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
