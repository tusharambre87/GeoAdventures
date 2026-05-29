import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { MapPin, Star, ChevronRight, ArrowLeft, Globe, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MapPuzzle } from "@/components/MapPuzzle";
import { useExplorer } from "@/lib/explorerContext";
import type { MapPuzzle as MapPuzzleType, MapPuzzleRegion } from "@shared/schema";

interface MapPuzzleWithRegions extends MapPuzzleType {
  regions: MapPuzzleRegion[];
}

export default function MapPuzzles() {
  const [, setLocation] = useLocation();
  const { activeExplorer } = useExplorer();
  const [puzzles, setPuzzles] = useState<MapPuzzleType[]>([]);
  const [selectedPuzzle, setSelectedPuzzle] = useState<MapPuzzleWithRegions | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPuzzles();
  }, []);

  const fetchPuzzles = async () => {
    try {
      const response = await fetch("/api/map-puzzles");
      if (response.ok) {
        const data = await response.json();
        setPuzzles(data);
      }
    } catch (error) {
      console.error("Failed to fetch map puzzles:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePuzzleSelect = async (puzzleId: string) => {
    try {
      const response = await fetch(`/api/map-puzzles/${puzzleId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedPuzzle(data);
      }
    } catch (error) {
      console.error("Failed to fetch puzzle details:", error);
    }
  };

  const handlePuzzleComplete = async (starsAwarded: number) => {
    if (!activeExplorer || !selectedPuzzle) return;
    
    try {
      await fetch(`/api/map-puzzles/${selectedPuzzle.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ explorerId: activeExplorer.id }),
      });
    } catch (error) {
      console.error("Failed to save puzzle completion:", error);
    }
  };

  if (selectedPuzzle) {
    return (
      <div className="h-screen flex flex-col bg-gradient-to-b from-blue-100 to-blue-50">
        <MapPuzzle
          puzzleId={selectedPuzzle.id}
          puzzleName={selectedPuzzle.name}
          viewBox={selectedPuzzle.viewBox || "0 0 959 593"}
          backgroundColor={selectedPuzzle.backgroundColor || "#E3F2FD"}
          regions={selectedPuzzle.regions}
          starsReward={selectedPuzzle.starsReward || 5}
          explorerId={activeExplorer?.id}
          onComplete={handlePuzzleComplete}
          onBack={() => setSelectedPuzzle(null)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 via-blue-50 to-green-50">
      <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/mini-games")}
            className="text-white hover:bg-white/20"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Globe className="w-6 h-6" />
            <h1 className="text-xl font-bold">Map Puzzles</h1>
          </div>
          <div className="w-20" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Learn Geography with Fun!
          </h2>
          <p className="text-gray-600">
            Drag the shapes onto the map and learn about each region!
          </p>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : puzzles.length === 0 ? (
          <div className="text-center py-12">
            <Globe className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No map puzzles available yet.</p>
            <p className="text-sm text-gray-400 mt-2">Check back soon!</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {puzzles.map((puzzle, index) => (
              <motion.div
                key={puzzle.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => handlePuzzleSelect(puzzle.id)}
                data-testid={`card-puzzle-${puzzle.id}`}
              >
                <div
                  className="h-32 flex items-center justify-center"
                  style={{ backgroundColor: puzzle.backgroundColor || "#E3F2FD" }}
                >
                  <div className="text-6xl">
                    {puzzle.region === "usa" && "🇺🇸"}
                    {puzzle.region === "india" && "🇮🇳"}
                    {puzzle.region === "europe" && "🇪🇺"}
                    {puzzle.region === "world" && "🌍"}
                    {!["usa", "india", "europe", "world"].includes(puzzle.region) && "🗺️"}
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg">
                        {puzzle.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {puzzle.regionCount || 10} regions to learn
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="text-sm font-medium">
                        +{puzzle.starsReward || 5}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          puzzle.difficulty === "easy"
                            ? "bg-green-100 text-green-700"
                            : puzzle.difficulty === "medium"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {puzzle.difficulty || "easy"}
                      </span>
                      <span className="text-xs text-gray-400">
                        Ages {puzzle.ageRange || "4+"}
                      </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </motion.div>
            ))}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: puzzles.length * 0.1 }}
              className="bg-gray-100 rounded-xl shadow overflow-hidden opacity-60"
            >
              <div className="h-32 flex items-center justify-center bg-gray-200">
                <Lock className="w-12 h-12 text-gray-400" />
              </div>
              <div className="p-4">
                <h3 className="font-bold text-gray-500">More Coming Soon!</h3>
                <p className="text-sm text-gray-400 mt-1">
                  India, Europe, World & more
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
