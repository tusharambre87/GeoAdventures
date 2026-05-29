import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Video, Image, ChevronRight, Sparkles, Heart, Star, Gamepad2, SkipForward, X, BookOpen } from "lucide-react";
import { TravelTrip, TravelStop, TravelMoment } from "@shared/schema";
import confetti from "canvas-confetti";
import { ReflectionGamesEngine } from "./ReflectionGames";
import { getAdventureMode } from "@/lib/adventureModeUtils";
import { markCameFromGeoAdventures } from "./GeoGamesFromAdventures";

interface AdventureRecapProps {
  trip: TravelTrip;
  stops: TravelStop[];
  moments: TravelMoment[];
  explorerId?: string;
  sessionType?: 'adventure_recap' | 'end_of_day' | 'end_of_trip';
  isHomeAdventure?: boolean;
  onClose: () => void;
  onCreateVideo?: () => void;
  onCreateCollage?: () => void;
  onGamesCompleted?: (starsEarned: number) => void;
}

export function AdventureRecap({
  trip,
  stops,
  moments,
  explorerId,
  sessionType = 'adventure_recap',
  isHomeAdventure = false,
  onClose,
  onCreateVideo,
  onCreateCollage,
  onGamesCompleted
}: AdventureRecapProps) {
  const [currentStep, setCurrentStep] = useState<"celebration" | "games" | "options">("celebration");
  const [gamesStarsEarned, setGamesStarsEarned] = useState(0);

  const visitedStops = stops.filter(s => s.isVisited);
  const keepsakeCount = visitedStops.length;
  const canPlayGames = stops.length >= 1 && explorerId;
  
  // Get adventure mode context for language and capability checks
  const adventureMode = getAdventureMode(trip);
  const { language, capabilities } = adventureMode;

  useEffect(() => {
    if (currentStep === "celebration") {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [currentStep]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-gradient-to-b from-purple-900/95 via-indigo-900/95 to-blue-900/95 overflow-auto"
    >
      <div className="absolute top-4 right-4 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:bg-white/20"
          data-testid="button-close-recap"
        >
          <X className="w-6 h-6" />
        </Button>
      </div>

      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <AnimatePresence mode="wait">
          {currentStep === "celebration" && (
            <motion.div
              key="celebration"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="text-center max-w-md"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.5 }}
                className="text-8xl mb-6"
              >
                🎉
              </motion.div>
              
              <h1 className="text-3xl font-bold text-white mb-4">
                Adventure Recap!
              </h1>
              
              <p className="text-xl text-white/90 mb-4">
                {trip.name}
              </p>
              
              <div className="bg-white/10 rounded-2xl p-4 mb-6">
                <div className="flex justify-around text-center">
                  {/* For home adventures, show places explored instead of keepsakes */}
                  {isHomeAdventure ? (
                    <>
                      <div>
                        <p className="text-3xl font-bold text-teal-400">{visitedStops.length}</p>
                        <p className="text-white/70 text-sm">Places {language.visited}</p>
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-cyan-400">{stops.length}</p>
                        <p className="text-white/70 text-sm">To Discover</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-3xl font-bold text-amber-400">{keepsakeCount}</p>
                        <p className="text-white/70 text-sm">Keepsakes Earned</p>
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-pink-400">{moments.length}</p>
                        <p className="text-white/70 text-sm">Moments Captured</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              <p className="text-white/80 mb-8">
                {isHomeAdventure 
                  ? `You've explored ${visitedStops.length} amazing places from the comfort of home!`
                  : `You've visited ${visitedStops.length} amazing places together as a family!`
                }
              </p>
              
              <div className="flex flex-col gap-3">
                {canPlayGames && (
                  <Button
                    onClick={() => setCurrentStep("games")}
                    className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-lg px-8 py-6"
                    data-testid="button-play-games"
                  >
                    <Gamepad2 className="w-5 h-5" />
                    Play Memory Games
                    <Star className="w-5 h-5" />
                  </Button>
                )}
                <Button
                  onClick={() => setCurrentStep("options")}
                  variant={canPlayGames ? "outline" : "default"}
                  className={canPlayGames 
                    ? "gap-2 text-white border-white/30 hover:bg-white/10" 
                    : "gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-lg px-8 py-6"
                  }
                  data-testid="button-skip-to-options"
                >
                  <Heart className="w-5 h-5" />
                  {canPlayGames ? "Skip to Options" : "Continue"}
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          )}

          {currentStep === "games" && explorerId && (
            <motion.div
              key="games"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md"
            >
              <Card className="bg-white/10 border-white/20">
                <CardContent className="p-0">
                  <ReflectionGamesEngine
                    tripId={trip.id}
                    explorerId={explorerId}
                    sessionType={sessionType}
                    onComplete={(stars) => {
                      setGamesStarsEarned(stars);
                      onGamesCompleted?.(stars);
                      setCurrentStep("options");
                    }}
                    onClose={() => setCurrentStep("options")}
                  />
                </CardContent>
              </Card>
              
              <Button
                onClick={() => setCurrentStep("options")}
                variant="ghost"
                className="w-full mt-4 text-white/70 hover:text-white hover:bg-white/10"
                data-testid="button-skip-games"
              >
                <SkipForward className="w-4 h-4 mr-2" />
                Skip Games
              </Button>
            </motion.div>
          )}

          {currentStep === "options" && (
            <motion.div
              key="options"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-md"
            >
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5 }}
                  className="text-6xl mb-4"
                >
                  {gamesStarsEarned > 0 ? "⭐" : "✨"}
                </motion.div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {gamesStarsEarned > 0 
                    ? `You earned ${gamesStarsEarned} Memory ${gamesStarsEarned === 1 ? 'Star' : 'Stars'}!`
                    : "Great Adventure!"
                  }
                </h2>
                <p className="text-white/80">
                  Create something special with your memories
                </p>
              </div>
              
              <div className="space-y-3 mb-8">
                {/* Video/Collage options only for Travel adventures that allow media capture */}
                {capabilities.allowMediaCapture ? (
                  <>
                    <Card 
                      className="bg-white/10 border-white/20 cursor-pointer hover:bg-white/15 transition-colors"
                      onClick={onCreateVideo}
                      data-testid="card-create-video"
                    >
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center">
                          <Video className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-white">Make a Video</p>
                          <p className="text-white/60 text-sm">Turn your moments into a slideshow</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-white/40" />
                      </CardContent>
                    </Card>
                    
                    <Card 
                      className="bg-white/10 border-white/20 cursor-pointer hover:bg-white/15 transition-colors"
                      onClick={onCreateCollage}
                      data-testid="card-create-collage"
                    >
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl flex items-center justify-center">
                          <Image className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-white">Create a Collage</p>
                          <p className="text-white/60 text-sm">Combine photos into one memory</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-white/40" />
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  /* For Home Adventures - show learning-focused options */
                  <Card 
                    className="bg-white/10 border-white/20"
                    data-testid="card-home-learning-promo"
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center">
                        <BookOpen className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-white">Keep Learning!</p>
                        <p className="text-white/60 text-sm">Explore more places from home or plan a real trip to collect memories</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {/* Parent-initiated memory reinforcement option */}
                <Card 
                  className="bg-white/10 border-white/20 cursor-pointer hover:bg-white/15 transition-colors"
                  onClick={() => {
                    markCameFromGeoAdventures();
                    window.location.href = '/?openDailyQuest=true';
                  }}
                  data-testid="card-memory-reinforcement"
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl flex items-center justify-center">
                      <Gamepad2 className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white">Practice Today's Places</p>
                      <p className="text-white/60 text-sm">A quick GeoGame helps build recall</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-white/40" />
                  </CardContent>
                </Card>
              </div>
              
              <Button
                onClick={onClose}
                variant="ghost"
                className="w-full text-white/70 hover:text-white hover:bg-white/10"
                data-testid="button-close-recap"
              >
                Back to Trip
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
