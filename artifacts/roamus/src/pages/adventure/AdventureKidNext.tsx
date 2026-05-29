import { useAdventureShell } from "./AdventureShell";
import { useTravel } from "@/lib/travelContext";
import { useExplorer } from "@/lib/explorerContext";
import { getPlannedNextStop, getCurrentStop } from "./adventureRouter";
import { ExplorerChallenge } from "@/components/MissionCard";
import type { ExplorerChallengeMission } from "@shared/schema";

import { navPush } from "@/lib/nav";
import { useLocation } from "wouter";
import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { getHandoffReturn, getKidFlowState, setKidFlowState } from "@/lib/kidModeSession";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Check, Brain, Mic, MicOff, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type GameType = "guess" | "thisorthat" | "spotit" | "buildit";
type GameStep = "question" | "roundComplete" | "allComplete";

interface GuessRound { question: string; options: { emoji: string; label: string }[] }
interface ThisOrThatRound { question: string; optionA: { emoji: string; label: string }; optionB: { emoji: string; label: string }; funFact: string }
interface SpotItRound { prompt: string }
interface BuildItRound { prompt: string; options: { emoji: string; label: string }[] }

interface GameContentRounds {
  guess: GuessRound[];
  thisorthat: ThisOrThatRound[];
  spotit: SpotItRound[];
  buildit: BuildItRound[];
  connectionFact?: string;
}

const DEFAULT_GAMES: GameContentRounds = {
  guess: [
    { question: "What do you think you'll see first at this place?", options: [{ emoji: "🌿", label: "Nature" }, { emoji: "🏛️", label: "Buildings" }] },
    { question: "Will you hear birds singing here?", options: [{ emoji: "🐦", label: "Yes!" }, { emoji: "🔇", label: "Probably not" }] },
    { question: "Is this place bigger than your school?", options: [{ emoji: "📏", label: "Much bigger!" }, { emoji: "🏫", label: "About the same" }] }
  ],
  thisorthat: [
    { question: "Would you rather explore...", optionA: { emoji: "🚶", label: "On foot" }, optionB: { emoji: "🚗", label: "By car" }, funFact: "Walking lets you discover hidden treasures cars might miss!" },
    { question: "Would you rather see...", optionA: { emoji: "🌅", label: "Sunrise" }, optionB: { emoji: "🌇", label: "Sunset" }, funFact: "Sunrises and sunsets look different because of how light travels through air!" },
    { question: "Would you rather bring...", optionA: { emoji: "📷", label: "Camera" }, optionB: { emoji: "🎨", label: "Sketchbook" }, funFact: "Both are great ways to remember special moments!" }
  ],
  spotit: [
    { prompt: "Try to find something you've never seen before!" },
  ],
  buildit: [
    { prompt: "If you were the architect here...", options: [{ emoji: "🌳", label: "More trees" }, { emoji: "🎨", label: "Colorful art" }, { emoji: "🪑", label: "Cozy seats" }, { emoji: "💡", label: "Fun lights" }] },
    { prompt: "Design the perfect rest stop...", options: [{ emoji: "🚽", label: "Clean bathrooms" }, { emoji: "🍦", label: "Ice cream" }, { emoji: "🎮", label: "Games" }, { emoji: "🛝", label: "Playground" }] },
    { prompt: "Build a learning area...", options: [{ emoji: "📚", label: "Book nook" }, { emoji: "🖥️", label: "Touch screens" }, { emoji: "🎭", label: "Dress up" }, { emoji: "🔬", label: "Science station" }] }
  ],
};

const GAME_META: { type: GameType; emoji: string; title: string; subtitle: string; bg: string; border: string }[] = [
  { type: "guess", emoji: "🔮", title: "Guess Before You See", subtitle: "Make a prediction!", bg: "bg-violet-50/60", border: "border-violet-100/60" },
  { type: "thisorthat", emoji: "⚖️", title: "This or That", subtitle: "Quick comparison!", bg: "bg-amber-50/60", border: "border-amber-100/60" },
  { type: "spotit", emoji: "👀", title: "Spot It", subtitle: "Observation mission!", bg: "bg-emerald-50/60", border: "border-emerald-100/60" },
];

function StopGameOverlay({
  gameType,
  gameContent,
  onClose,
  tripId,
  stopName,
}: {
  gameType: GameType;
  gameContent: GameContentRounds;
  onClose: () => void;
  tripId: string;
  stopName: string;
}) {
  const [gameStep, setGameStep] = useState<GameStep>("question");
  const [currentRound, setCurrentRound] = useState(0);
  const TOTAL_ROUNDS = gameType === "spotit" ? 1 : 3;

  const handleGameComplete = () => setGameStep("roundComplete");

  const handleNextRound = () => {
    if (currentRound + 1 >= TOTAL_ROUNDS) {
      setGameStep("allComplete");
    } else {
      setCurrentRound(prev => prev + 1);
      setGameStep("question");
    }
  };

  const handleGameDone = () => {
    if (gameType === "spotit" && tripId) {
      try {
        const firstMission = gameContent.spotit[0]?.prompt || "Look for something special!";
        localStorage.setItem(`spotit-reminder-${tripId}`, JSON.stringify({
          stopName,
          mission: firstMission
        }));
      } catch {}
    }
    if (gameContent.connectionFact && tripId) {
      try {
        const existing = JSON.parse(localStorage.getItem("geoquest-connections") || "[]");
        if (!existing.find((c: { fact: string }) => c.fact === gameContent.connectionFact)) {
          existing.push({ tripId, stopName, fact: gameContent.connectionFact, timestamp: Date.now() });
          localStorage.setItem("geoquest-connections", JSON.stringify(existing));
        }
      } catch {}
    }
    onClose();
  };

  const gameTitle = gameType === "guess" ? "Guess Before You See"
    : gameType === "thisorthat" ? "This or That"
    : gameType === "spotit" ? "Spot It"
    : "Build It";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-gradient-to-b from-green-100 to-teal-100"
      data-testid={`game-overlay-${gameType}`}
    >
      <div className="max-w-lg mx-auto p-4 h-full flex flex-col safe-area-inset">
        <header className="flex items-center justify-between mb-6">
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/50"
            data-testid="button-close-game"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="text-center">
            <h1 className="font-bold text-lg">{gameTitle}</h1>
            <p className="text-xs text-gray-500">Round {currentRound + 1} of {TOTAL_ROUNDS}</p>
          </div>
          <div className="w-10" />
        </header>

        <AnimatePresence mode="wait">
          {gameStep === "question" && (
            <motion.div
              key={`question-${currentRound}`}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="flex-1 flex flex-col justify-center"
            >
              {gameType === "guess" && gameContent.guess[currentRound] && (
                <div className="space-y-6">
                  <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-6xl text-center mb-4">🔮</motion.div>
                  <h2 className="text-xl font-bold text-center">{gameContent.guess[currentRound].question}</h2>
                  <p className="text-sm text-center text-gray-500">Just guessing — you'll see soon!</p>
                  <div className="grid grid-cols-2 gap-4">
                    {gameContent.guess[currentRound].options.map((opt, i) => (
                      <motion.button
                        key={i}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleGameComplete}
                        className="p-6 bg-white rounded-2xl shadow-lg flex flex-col items-center gap-2"
                        data-testid={`button-guess-option-${i}`}
                      >
                        <span className="text-4xl">{opt.emoji}</span>
                        <span className="font-bold">{opt.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {gameType === "thisorthat" && gameContent.thisorthat[currentRound] && (
                <div className="space-y-6">
                  <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-6xl text-center mb-4">⚖️</motion.div>
                  <h2 className="text-xl font-bold text-center">{gameContent.thisorthat[currentRound].question}</h2>
                  <p className="text-sm text-center text-gray-500">Go with your gut!</p>
                  <div className="flex gap-4">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleGameComplete}
                      className="flex-1 p-6 bg-white rounded-2xl shadow-lg flex flex-col items-center gap-2"
                      data-testid="button-thisorthat-a"
                    >
                      <span className="text-5xl">{gameContent.thisorthat[currentRound].optionA.emoji}</span>
                      <span className="font-bold">{gameContent.thisorthat[currentRound].optionA.label}</span>
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleGameComplete}
                      className="flex-1 p-6 bg-white rounded-2xl shadow-lg flex flex-col items-center gap-2"
                      data-testid="button-thisorthat-b"
                    >
                      <span className="text-5xl">{gameContent.thisorthat[currentRound].optionB.emoji}</span>
                      <span className="font-bold">{gameContent.thisorthat[currentRound].optionB.label}</span>
                    </motion.button>
                  </div>
                </div>
              )}

              {gameType === "spotit" && gameContent.spotit[currentRound] && (
                <div className="space-y-6 text-center">
                  <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-6xl mb-4">👀</motion.div>
                  <h2 className="text-xl font-bold">Your mission:</h2>
                  <div className="bg-white/80 rounded-2xl p-6 shadow-sm">
                    <p className="text-lg">{gameContent.spotit[currentRound].prompt}</p>
                  </div>
                  <p className="text-sm text-gray-500">No need to do it now — just remember!</p>
                  <Button
                    size="lg"
                    onClick={handleGameComplete}
                    className="bg-green-500 hover:bg-green-600"
                    data-testid="button-spotit-gotit"
                  >
                    Got it! 👍
                  </Button>
                </div>
              )}

              {gameType === "buildit" && gameContent.buildit[currentRound] && (
                <div className="space-y-6">
                  <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-6xl text-center mb-4">🏗️</motion.div>
                  <h2 className="text-xl font-bold text-center">{gameContent.buildit[currentRound].prompt}</h2>
                  <p className="text-sm text-center text-gray-500">What would you add?</p>
                  <div className="grid grid-cols-2 gap-3">
                    {gameContent.buildit[currentRound].options.map((opt, i) => (
                      <motion.button
                        key={i}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleGameComplete}
                        className="p-4 bg-white rounded-xl shadow-lg flex items-center gap-3"
                        data-testid={`button-buildit-option-${i}`}
                      >
                        <span className="text-3xl">{opt.emoji}</span>
                        <span className="font-medium text-sm">{opt.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {gameStep === "roundComplete" && (
            <motion.div
              key={`roundComplete-${currentRound}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex-1 flex flex-col items-center justify-center text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.5 }}
                className="text-6xl mb-4"
              >
                {currentRound === 0 ? "👍" : currentRound === 1 ? "🌟" : "✨"}
              </motion.div>
              <h2 className="text-xl font-bold mb-2">
                {gameType === "guess" && "Nice guess!"}
                {gameType === "thisorthat" && "Interesting choice!"}
                {gameType === "spotit" && "Got it!"}
                {gameType === "buildit" && "Cool idea!"}
              </h2>
              <p className="text-gray-500 mb-2">
                {gameType === "guess" && "Keep an eye out when you arrive."}
                {gameType === "thisorthat" && gameContent.thisorthat[currentRound]?.funFact}
                {gameType === "spotit" && "Remember to look when you get there!"}
                {gameType === "buildit" && "See how the real place compares."}
              </p>
              <div className="flex gap-1 my-4">
                {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full ${i <= currentRound ? "bg-green-500" : "bg-gray-300"}`}
                  />
                ))}
              </div>
              <Button size="lg" onClick={handleNextRound} className="bg-green-500 hover:bg-green-600" data-testid="button-next-round">
                {currentRound + 1 >= TOTAL_ROUNDS ? "See Results!" : "Next Round →"}
              </Button>
            </motion.div>
          )}

          {gameStep === "allComplete" && (
            <motion.div
              key="allComplete"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex flex-col items-center justify-center text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.5 }}
                className="text-8xl mb-6"
              >
                🎉
              </motion.div>
              <h2 className="text-2xl font-bold mb-2">All {TOTAL_ROUNDS} rounds complete!</h2>
              <p className="text-gray-500 mb-6">You'll find out when you arrive 😊</p>
              <Button size="lg" onClick={handleGameDone} className="bg-green-500 hover:bg-green-600" data-testid="button-game-done">
                Done
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default function AdventureKidNext() {
  const { tripId } = useAdventureShell();
  const { currentTrip, currentTripStops, fetchTrip } = useTravel();
  const { activeExplorer } = useExplorer();
  const [, setLocation] = useLocation();

  const [wonderOpen, setWonderOpen] = useState(false);
  const [wonderResponse, setWonderResponse] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [wonderSaved, setWonderSaved] = useState(false);
  const recognitionRef = useRef<any>(null);

  const [activeGame, setActiveGame] = useState<GameType | null>(null);
  const [gameContent, setGameContent] = useState<GameContentRounds>(DEFAULT_GAMES);
  const flowInitRef = useRef(false);

  type FlowPhase = "arrival" | "wonder_reveal" | "wonder" | "mission_intro" | "mission" | "complete" | "game";
  const [flowPhase, setFlowPhase] = useState<FlowPhase>("arrival");

  const handleCompleteExplorerMission = useCallback(async (stopId: string, missionIndex: number, payload: {
    selectedOption?: number | null;
    skipped?: boolean;
    textResponse?: string;
    photoUrl?: string;
  }) => {
    const response = await fetch(`/api/travel/stops/${stopId}/complete-explorer-mission`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ missionIndex, ...payload, explorerId: activeExplorer?.id }),
    });
    const data = await response.json();
    if ((data.success || data.skipped) && currentTrip) {
      await fetchTrip(currentTrip.id);
    }
    return data;
  }, [currentTrip, activeExplorer, fetchTrip]);

  const plannedStop = getPlannedNextStop(currentTripStops);
  const overrideStopId = sessionStorage.getItem("adventure_override_stop_" + tripId);
  const currentStopId = getCurrentStop(plannedStop?.id || null, overrideStopId);
  const currentStop = currentTripStops.find((s) => s.id === currentStopId);

  const isVirtualAdventure = currentTrip?.adventureContext === 'home';

  useEffect(() => {
    if (!currentStop || isVirtualAdventure || !currentTrip) return;
    const missions = currentStop.stopMissions as ExplorerChallengeMission[] | null | undefined;
    if (missions && Array.isArray(missions) && missions.length > 0) return;
    fetch(`/api/travel/stops/${currentStop.id}/generate-missions`, {
      method: 'POST',
      credentials: 'include',
    }).then(r => r.ok ? fetchTrip(currentTrip.id) : null).catch(() => null);
  }, [currentStop?.id, isVirtualAdventure]);

  // Restore flow phase from localStorage on mount
  useLayoutEffect(() => {
    if (!currentStopId || flowInitRef.current) return;
    flowInitRef.current = true;
    const saved = getKidFlowState(tripId, currentStopId);
    if (saved.wonderResponse) setWonderResponse(saved.wonderResponse);
    if (saved.gamesCompleted || saved.missionCompleted) {
      setFlowPhase("complete");
    } else if (saved.wonderCompleted) {
      setFlowPhase("mission_intro");
    } else if (saved.storyCompleted) {
      setFlowPhase("wonder_reveal");
    } else {
      setFlowPhase("arrival");
    }
  }, [currentStopId, tripId]);

  // Called by ExplorerChallenge when all missions complete → go to complete screen
  const handleAllMissionsComplete = useCallback(() => {
    if (currentStopId) setKidFlowState(tripId, currentStopId, { missionCompleted: true, completionLevel: "story_mission" });
    setFlowPhase("complete");
  }, [currentStopId, tripId]);

  // wonder_reveal auto-advances to wonder after 1.8s
  useEffect(() => {
    if (flowPhase !== "wonder_reveal") return;
    const t = setTimeout(() => setFlowPhase("wonder"), 1800);
    return () => clearTimeout(t);
  }, [flowPhase]);

  // arrival phase: auto-navigate to story after 1.8s (no manual tap needed)
  useEffect(() => {
    if (flowPhase !== "arrival") return;
    const t = setTimeout(() => {
      if (currentStopId) setKidFlowState(tripId, currentStopId, { kidExperienceStarted: true });
      navPush(setLocation, `/adventure/${tripId}/kid/story/${currentStopId}`);
    }, 1800);
    return () => clearTimeout(t);
  }, [flowPhase, currentStopId, tripId, setLocation]);

  // wonder phase: auto-open the wonder overlay
  useEffect(() => {
    if (flowPhase === "wonder") setWonderOpen(true);
  }, [flowPhase]);

  const unvisitedStops = currentTripStops
    .filter((s) => !s.isVisited)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  const totalStops = currentTripStops.length;
  const stopIndex = currentStop ? currentTripStops.findIndex(s => s.id === currentStop.id) + 1 : 0;

  useEffect(() => {
    if (!currentStopId) return;
    fetch(`/api/travel/stops/${currentStopId}/games`, { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setGameContent(data); })
      .catch(() => {});
  }, [currentStopId]);

  if (unvisitedStops.length === 0 && !overrideStopId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center" data-testid="all-stops-explored">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.1 }}
          className="text-7xl mb-6"
        >
          🎉
        </motion.div>
        <h2 className="text-2xl font-bold text-orange-900 mb-3">All stops explored!</h2>
        <p className="text-orange-600 mb-8">You've seen everything on this adventure!</p>
        <Button
          onClick={() => navPush(setLocation, `/adventure/${tripId}/kid/recap`)}
          className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-8 h-12 text-base font-bold shadow-lg"
          data-testid="button-go-recap"
        >
          See My Adventure Recap
        </Button>
      </div>
    );
  }

  const handoffReturnUrl = getHandoffReturn(tripId, `/adventure/${tripId}/today`);

  const handleHandBackToParent = () => {
    // Do NOT clear kid session here — parent return screen reads it to show what the kid did.
    // Session is cleared when parent marks the stop done or skips it.
    setLocation(handoffReturnUrl);
  };

  const xpEarned = (() => {
    const missions = currentStop?.stopMissions as ExplorerChallengeMission[] | null | undefined;
    const base = 5;
    if (!missions || !Array.isArray(missions)) return base;
    const earned = missions
      .filter((m) => m.completed && !m.skipped)
      .reduce((sum, m) => sum + (m.xpReward ?? 5), 0);
    return base + earned;
  })();

  return (
    <div className="flex flex-col min-h-[calc(100vh-56px)]" data-testid="kid-next-page">

      {/* ── ARRIVAL ── full-screen welcome moment ─────────────────────── */}
      <AnimatePresence>
        {flowPhase === "arrival" && (
          <motion.div
            key="arrival"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex flex-col items-center justify-center px-6 text-center"
            style={{ background: "linear-gradient(180deg, #FFF7ED 0%, #FEF3C7 100%)" }}
            data-testid="phase-arrival"
          >
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
              className="text-8xl mb-6"
            >
              🎉
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-black text-orange-900 mb-3 leading-tight"
              data-testid="text-arrival-headline"
            >
              You made it to<br />{currentStop?.name || "your next stop"}!
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-orange-500 font-medium text-lg"
            >
              Let's explore this place together
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── WONDER REVEAL ── soft transition after story ───────────────── */}
      <AnimatePresence>
        {flowPhase === "wonder_reveal" && (
          <motion.div
            key="wonder_reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex flex-col items-center justify-center px-8 text-center bg-gradient-to-b from-violet-50 to-purple-50"
            data-testid="phase-wonder-reveal"
          >
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: [0.5, 1.1, 1] }}
              transition={{ duration: 0.8 }}
              className="text-7xl mb-6"
            >
              🎯
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-black text-purple-900 mb-3"
            >
              Now it's your turn
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-lg text-purple-600 leading-snug"
            >
              Look around…<br />what do you notice?
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MISSION INTRO ── energy build-up before missions ──────────── */}
      <AnimatePresence>
        {flowPhase === "mission_intro" && (
          <motion.div
            key="mission_intro"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex flex-col items-center justify-center px-6 text-center"
            style={{ background: "linear-gradient(180deg, #FFFBEB 0%, #FEF3C7 100%)" }}
            data-testid="phase-mission-intro"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
              className="text-7xl mb-6"
            >
              🎯
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-black text-orange-900 mb-3"
            >
              Your mission is ready
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-orange-500 font-semibold text-lg mb-12"
            >
              Let's go find it!
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="w-full max-w-xs space-y-3"
            >
              <button
                onClick={() => setFlowPhase("mission")}
                className="w-full py-5 rounded-full text-white text-xl font-black shadow-xl active:scale-[0.98] transition-all"
                style={{ background: "linear-gradient(135deg, #E8962F 0%, #D4872B 100%)" }}
                data-testid="button-start-mission"
              >
                Start mission →
              </button>
              <button
                onClick={handleHandBackToParent}
                className="w-full py-3 text-slate-400 text-sm font-medium"
                data-testid="button-hand-back-mission-intro"
              >
                Hand back to parent
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── COMPLETE ── celebration + handoff ──────────────────────────── */}
      <AnimatePresence>
        {flowPhase === "complete" && (
          <motion.div
            key="complete"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-white flex flex-col items-center justify-center px-6 text-center overflow-y-auto"
            data-testid="phase-complete"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
              className="text-8xl mb-3"
            >
              ⭐
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl font-black text-orange-900 mb-1"
            >
              You leveled up!
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-orange-500 font-semibold text-base mb-5"
            >
              You explored {currentStop?.name || "this place"}
            </motion.p>

            {/* What you did — achievements first */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="w-full max-w-xs space-y-2 mb-5 text-left"
            >
              <div className="flex items-center gap-3 bg-orange-50 rounded-2xl px-4 py-3">
                <span className="text-xl shrink-0">🎧</span>
                <p className="text-orange-800 font-semibold text-sm">You listened to the story</p>
              </div>
              {(() => {
                const ms = currentStop?.stopMissions as ExplorerChallengeMission[] | null;
                const done = Array.isArray(ms) ? ms.filter(m => m.completed || m.skipped).length : 0;
                if (!done) return null;
                return (
                  <div className="flex items-center gap-3 bg-amber-50 rounded-2xl px-4 py-3">
                    <span className="text-xl shrink-0">🎯</span>
                    <p className="text-amber-800 font-semibold text-sm">You completed {done} mission{done > 1 ? "s" : ""}!</p>
                  </div>
                );
              })()}
              {wonderResponse && (
                <div className="flex items-start gap-3 bg-purple-50 rounded-2xl px-4 py-3">
                  <span className="text-xl shrink-0">💭</span>
                  <p className="text-purple-800 font-medium text-sm leading-snug">
                    You noticed "{wonderResponse}"
                  </p>
                </div>
              )}
            </motion.div>

            {/* XP appears last — confirms, doesn't lead */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.65, type: "spring", bounce: 0.3 }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl mb-6"
              style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}
            >
              <span className="text-xl">✨</span>
              <span className="text-white font-black text-xl">+{xpEarned} XP</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="w-full max-w-xs space-y-3"
            >
              <button
                onClick={handleHandBackToParent}
                className="w-full py-5 rounded-full text-white text-lg font-black shadow-xl active:scale-[0.98] transition-all"
                style={{ background: "linear-gradient(135deg, #E8962F 0%, #D4872B 100%)" }}
                data-testid="button-tell-parent"
              >
                Tell your parent! 👆
              </button>
              <button
                onClick={() => {
                  if (currentStopId) setKidFlowState(tripId, currentStopId, { gamesCompleted: true, completionLevel: "full" });
                  setFlowPhase("game");
                }}
                className="w-full py-3 rounded-2xl text-slate-500 font-semibold text-sm bg-slate-100 hover:bg-slate-200 transition-colors"
                data-testid="button-want-game"
              >
                🎮 Want one more quick game?
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MISSION PHASE ── one mission at a time ────────────────────── */}
      {flowPhase === "mission" && (
        <div className="flex flex-col min-h-screen pb-28 px-5 pt-5">
          <div className="mb-5">
            <p className="text-orange-500 font-black text-xs uppercase tracking-widest mb-1">🎯 Mission time</p>
            <h1 className="text-2xl font-black text-orange-950 mb-1" data-testid="text-stop-name">
              {currentStop?.name || "Next Adventure"}
            </h1>
            <p className="text-orange-400 text-sm" data-testid="text-stop-count">Stop {stopIndex} of {totalStops}</p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full"
            data-testid="phase-mission-content"
          >
            {!isVirtualAdventure ? (() => {
              const missions = currentStop?.stopMissions as ExplorerChallengeMission[] | null;
              if (!missions || !Array.isArray(missions) || missions.length === 0) {
                return (
                  <div className="text-center py-16">
                    <div className="text-3xl mb-3 animate-pulse">🎯</div>
                    <p className="text-orange-400 text-sm">Loading your missions…</p>
                  </div>
                );
              }
              return (
                <ExplorerChallenge
                  stopId={currentStop!.id}
                  stopName={currentStop!.name}
                  missions={missions}
                  onComplete={handleCompleteExplorerMission}
                  onAllComplete={handleAllMissionsComplete}
                  singleMode
                />
              );
            })() : (
              <div className="space-y-4">
                <button
                  onClick={() => setActiveGame(GAME_META[0].type)}
                  className="w-full py-5 rounded-full text-white text-lg font-bold shadow-lg active:scale-[0.98] transition-all"
                  style={{ background: "linear-gradient(135deg, #E8962F 0%, #D4872B 100%)" }}
                  data-testid="button-play-game"
                >
                  🎯 Play a Stop Game
                </button>
                <button
                  onClick={handleAllMissionsComplete}
                  className="block mx-auto text-xs text-slate-400 hover:text-slate-600"
                >
                  Skip to completion
                </button>
              </div>
            )}
          </motion.div>

          {/* Sticky: Hand to Parent */}
          <div
            className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 px-4 py-3"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 12px)" }}
          >
            <button
              onClick={handleHandBackToParent}
              className="w-full py-3 rounded-2xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] transition-all"
              data-testid="button-hand-back-to-parent"
            >
              Hand back to parent
            </button>
          </div>
        </div>
      )}

      {/* ── GAME PHASE ── daily challenge + more games ─────────────────── */}
      {flowPhase === "game" && (
        <div className="flex flex-col min-h-screen pb-28 px-5 pt-5">
          <div className="mb-6">
            <p className="text-orange-500 font-black text-xs uppercase tracking-widest mb-1">🎮 One more game</p>
            <h1 className="text-xl font-black text-orange-950">{currentStop?.name || "Quick game"}</h1>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full space-y-4"
            data-testid="phase-game-content"
          >
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-5 border border-orange-100 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">🌟</span>
                <span className="text-xs font-black text-orange-500 uppercase tracking-wider">Today's Challenge</span>
              </div>
              <h3 className="text-lg font-black text-orange-900 mb-1">Guess Before You See</h3>
              <p className="text-sm text-orange-600/80 mb-4">Make a prediction about this place!</p>
              <button
                onClick={() => setActiveGame("guess")}
                className="w-full py-4 rounded-2xl text-white font-black text-base shadow-md active:scale-[0.98] transition-all"
                style={{ background: "linear-gradient(135deg, #E8962F 0%, #D4872B 100%)" }}
                data-testid="button-daily-challenge"
              >
                🎮 Play challenge
              </button>
            </div>

            <div className="text-center">
              <p className="text-xs text-slate-400 font-medium mb-3">or</p>
              <button
                onClick={() => {
                  const returnUrl = `/adventure/${tripId}/kid/next`;
                  setLocation(`/geoadventures?tab=kids&from=${encodeURIComponent(returnUrl)}`);
                }}
                className="w-full py-3 rounded-2xl text-orange-600 font-semibold text-sm bg-orange-50 border border-orange-100 hover:bg-orange-100 transition-colors"
                data-testid="button-play-more-games"
              >
                Play more games →
              </button>
            </div>
          </motion.div>

          {/* Sticky: Hand to Parent */}
          <div
            className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 px-4 py-3"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 12px)" }}
          >
            <button
              onClick={handleHandBackToParent}
              className="w-full py-3 rounded-2xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] transition-all"
              data-testid="button-hand-back-to-parent"
            >
              Hand back to parent
            </button>
          </div>
        </div>
      )}

      {/* ── Game overlay ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {activeGame && (
          <StopGameOverlay
            gameType={activeGame}
            gameContent={gameContent}
            onClose={() => setActiveGame(null)}
            tripId={tripId}
            stopName={currentStop?.name || ""}
          />
        )}
      </AnimatePresence>

      {/* ── Wonder overlay ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {wonderOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              className="relative bg-white w-full max-w-lg rounded-t-[2rem] p-6 shadow-2xl"
            >
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-500" />
                  <h3 className="text-lg font-bold text-purple-900">Wonder Time</h3>
                </div>
                <button
                  onClick={() => {
                    if (currentStopId) setKidFlowState(tripId, currentStopId, { wonderCompleted: true });
                    setWonderOpen(false);
                    setFlowPhase("mission_intro");
                  }}
                  className="text-xs text-slate-400 hover:text-slate-600 font-medium py-1 px-2"
                  data-testid="button-wonder-skip"
                >
                  Skip
                </button>
              </div>

              <p className="text-purple-800 font-medium text-sm mb-4">
                What's one thing you're wondering about {currentStop?.name || "this place"}? 🤔
              </p>

              {wonderSaved ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-4 space-y-4"
                >
                  <span className="text-4xl block">✅</span>
                  <p className="text-purple-700 font-black text-xl">Nice! Ready for your mission?</p>
                  <button
                    onClick={() => {
                      setWonderOpen(false);
                      setWonderSaved(false);
                      setFlowPhase("mission_intro");
                    }}
                    className="w-full py-4 rounded-full text-white font-black text-lg shadow-lg active:scale-[0.98] transition-all"
                    style={{ background: "linear-gradient(135deg, #E8962F 0%, #D4872B 100%)" }}
                    data-testid="button-wonder-start-mission"
                  >
                    Start mission →
                  </button>
                </motion.div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2 justify-center mb-3">
                    {[
                      { emoji: "🌿", label: "nature" },
                      { emoji: "🦎", label: "animals" },
                      { emoji: "📜", label: "history" },
                      { emoji: "😲", label: "it's huge" },
                      { emoji: "✨", label: "it's beautiful" },
                      { emoji: "💭", label: "other" },
                    ].map((chip) => (
                      <motion.button
                        key={chip.label}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          const addition = chip.label === "other" ? "" : chip.label;
                          setWonderResponse(prev => prev ? `${prev}, ${addition}` : addition);
                        }}
                        className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                          wonderResponse.includes(chip.label)
                            ? "bg-purple-500 text-white"
                            : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                        }`}
                        data-testid={`chip-${chip.label}`}
                      >
                        {chip.emoji} {chip.label}
                      </motion.button>
                    ))}
                  </div>

                  <div className="relative mb-3">
                    <Textarea
                      value={wonderResponse}
                      onChange={(e) => setWonderResponse(e.target.value)}
                      placeholder="Anything you notice..."
                      className="min-h-[80px] resize-none rounded-xl border-purple-200 focus:border-purple-400 pr-12"
                      data-testid="input-wonder-response"
                    />
                    <button
                      onClick={() => {
                        if (isListening) {
                          recognitionRef.current?.stop();
                          setIsListening(false);
                          return;
                        }
                        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
                        if (!SpeechRecognition) return;
                        const recognition = new SpeechRecognition();
                        recognition.continuous = false;
                        recognition.interimResults = true;
                        recognition.lang = 'en-US';
                        recognition.onresult = (event: any) => {
                          let transcript = '';
                          for (let i = 0; i < event.results.length; i++) {
                            transcript += event.results[i][0].transcript;
                          }
                          setWonderResponse(transcript);
                        };
                        recognition.onend = () => setIsListening(false);
                        recognition.onerror = () => setIsListening(false);
                        recognitionRef.current = recognition;
                        recognition.start();
                        setIsListening(true);
                      }}
                      className={`absolute bottom-3 right-3 p-2 rounded-full transition-colors ${isListening ? 'bg-red-100 text-red-600' : 'bg-purple-100 text-purple-600 hover:bg-purple-200'}`}
                      data-testid="button-wonder-mic"
                    >
                      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                  </div>

                  <Button
                    onClick={async () => {
                      const response = wonderResponse.trim() || "something interesting";
                      if (currentStopId) {
                        setKidFlowState(tripId, currentStopId, { wonderCompleted: true, wonderResponse: response });
                      }
                      try {
                        await fetch(`/api/travel/stops/${currentStopId}/journey-progress`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({ wonderResponse: response })
                        });
                      } catch (e) {
                        console.error("[Wonder] Save failed:", e);
                      }
                      setWonderResponse(response);
                      setWonderSaved(true);
                    }}
                    className="w-full h-12 bg-purple-500 hover:bg-purple-600 text-white rounded-full font-semibold"
                    data-testid="button-submit-wonder"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    I found something!
                  </Button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
