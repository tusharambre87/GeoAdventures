import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useAdventureShell } from "./AdventureShell";
import { useTravel } from "@/lib/travelContext";
import { useExplorer } from "@/lib/explorerContext";
import { completeSection, markStopVisited } from "@/lib/travelEvents";
import { navReplace } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, RotateCcw, Mic, MicOff, Heart, Rocket, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { GeoBuddyCharacter } from "@/components/GeoBuddyCharacter";
import type { ExplorerChallengeMission } from "@shared/schema";

type ReflectStep = "reflection" | "spotit" | "keepsake" | "done";

interface SpotItReminder {
  stopName: string;
  mission: string;
  stopId?: string;
}

export default function AdventureKidReflectStop() {
  const { tripId } = useAdventureShell();
  const [, params] = useRoute("/adventure/:tripId/kid/reflect/:stopId");
  const stopId = params?.stopId || "";
  const [, setLocation] = useLocation();
  const { activeExplorer } = useExplorer();

  const { currentTrip, currentTripStops, fetchTrip } = useTravel();

  const stop = useMemo(
    () => currentTripStops.find((s) => s.id === stopId),
    [currentTripStops, stopId]
  );

  const stopName = stop?.name || "this place";

  const keepsakeEligible = useMemo(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('skipKeepsake') === '1') return false;
    const missions = stop?.stopMissions as ExplorerChallengeMission[] | null | undefined;
    if (!missions || !Array.isArray(missions) || missions.length === 0) return true;
    const completedCount = missions.filter(m => m.completed).length;
    return completedCount >= Math.ceil(missions.length * 2 / 3);
  }, [stop?.stopMissions]);

  const spotItReminder = useMemo<SpotItReminder | null>(() => {
    try {
      const raw = localStorage.getItem(`spotit-reminder-${tripId}`);
      if (!raw) return null;
      const data = JSON.parse(raw) as SpotItReminder;
      return data;
    } catch {
      return null;
    }
  }, [tripId]);

  const [step, setStep] = useState<ReflectStep>("reflection");
  const [reflectionText, setReflectionText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [spotItAnswer, setSpotItAnswer] = useState<"yes" | "no" | null>(null);
  const [spotItNote, setSpotItNote] = useState("");
  const [keepsakes, setKeepsakes] = useState<any[]>([]);
  const [newKeepsake, setNewKeepsake] = useState<any | null>(null);
  const recognitionRef = useRef<any>(null);
  const [nextStopPackReady, setNextStopPackReady] = useState<{ stopId: string; stopName: string } | null>(null);

  // Find the next unvisited stop and check if its Story Pack is cached
  useEffect(() => {
    if (!currentTrip || !currentTripStops || !stopId) return;
    const unvisited = currentTripStops.filter(s => !s.isVisited && s.id !== stopId);
    const nextStop = unvisited[0];
    if (!nextStop) return;
    fetch(`/api/travel/stops/${nextStop.id}/journey-pack`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const hasStoryPack = data && data.quickHits && Array.isArray(data.quickHits) && data.quickHits.length > 0;
        if (hasStoryPack) {
          setNextStopPackReady({ stopId: nextStop.id, stopName: nextStop.name });
        }
      })
      .catch(() => {});
  }, [stopId, currentTrip?.id, currentTripStops]);

  useEffect(() => {
    if (stop && currentTrip && activeExplorer) {
      Promise.all([
        fetch(`/api/travel/artifacts/by-stop/${encodeURIComponent(stop.name)}`, { credentials: 'include' }).then(r => r.ok ? r.json() : []),
        fetch(`/api/travel/artifacts/collected/${activeExplorer.id}/${currentTrip.id}`, { credentials: 'include' }).then(r => r.ok ? r.json() : []),
      ])
        .then(([stopArtifacts, collected]) => {
          const collectedIds = new Set((collected || []).map((c: any) => c.artifactId));
          const merged = (stopArtifacts || []).map((a: any) => ({
            ...a,
            isCollected: collectedIds.has(a.id),
          }));
          setKeepsakes(merged);
          if (keepsakeEligible) {
            const justEarned = merged.find((a: any) => a.isCollected);
            if (justEarned) setNewKeepsake(justEarned);
          }
        })
        .catch(() => {});
    }
  }, [stop?.name, currentTrip?.id, activeExplorer?.id, keepsakeEligible]);

  const handleSpeechToggle = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition isn't available in this browser. Please type your thoughts instead!");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setReflectionText(prev => {
        const base = prev.trim();
        return base ? `${base} ${transcript}` : transcript;
      });
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  const finishAndAdvance = useCallback(() => {
    if (spotItReminder) {
      setStep("spotit");
    } else {
      setStep("done");
    }
  }, [spotItReminder]);

  const collectKeepsakeForStop = useCallback(async () => {
    if (!activeExplorer || !currentTrip || !stop) return;
    if (!keepsakeEligible) return;
    try {
      const artifacts = await fetch(`/api/travel/artifacts/by-stop/${encodeURIComponent(stop.name)}`, { credentials: 'include' }).then(r => r.ok ? r.json() : []);
      if (artifacts.length > 0) {
        const artifact = artifacts[0];
        await fetch('/api/travel/artifacts/collect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            explorerId: activeExplorer.id,
            tripId: currentTrip.id,
            stopId: stop.id,
            artifactId: artifact.id,
          }),
        });
        setNewKeepsake({ ...artifact, isCollected: true });
        setKeepsakes(prev => prev.map(k => k.id === artifact.id ? { ...k, isCollected: true } : k));
      }
    } catch (e) {
      console.error("[KidReflect] Failed to collect keepsake:", e);
    }
  }, [activeExplorer, currentTrip, stop, keepsakeEligible]);

  const handleSaveReflection = useCallback(async () => {
    try {
      await completeSection(stopId, tripId, "reflect");
      await markStopVisited(stopId, tripId, activeExplorer?.id, stop?.stopType || undefined);
      await collectKeepsakeForStop();
      fetchTrip(tripId).catch(() => {});

      if (reflectionText.trim()) {
        const key = `geoquest-reflections-${tripId}`;
        const existing = JSON.parse(localStorage.getItem(key) || "[]");
        existing.push({
          stopId,
          stopName,
          text: reflectionText.trim(),
          timestamp: Date.now(),
        });
        localStorage.setItem(key, JSON.stringify(existing));
      }
    } catch (e) {
      console.error("[KidReflect] Failed to save reflection:", e);
    }

    finishAndAdvance();
  }, [stopId, tripId, reflectionText, stopName, activeExplorer?.id, stop?.stopType, finishAndAdvance, collectKeepsakeForStop, fetchTrip]);

  const handleSkipReflection = useCallback(async () => {
    try {
      await completeSection(stopId, tripId, "reflect");
      await markStopVisited(stopId, tripId, activeExplorer?.id, stop?.stopType || undefined);
      await collectKeepsakeForStop();
      fetchTrip(tripId).catch(() => {});
    } catch {}

    finishAndAdvance();
  }, [stopId, tripId, activeExplorer?.id, stop?.stopType, finishAndAdvance, collectKeepsakeForStop, fetchTrip]);

  const handleSpotItDone = useCallback(() => {
    if (spotItNote.trim()) {
      const key = `geoquest-spotit-notes-${tripId}`;
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      existing.push({
        stopId,
        stopName,
        answer: spotItAnswer,
        note: spotItNote.trim(),
        timestamp: Date.now(),
      });
      localStorage.setItem(key, JSON.stringify(existing));
    }

    localStorage.removeItem(`spotit-reminder-${tripId}`);
    setStep("done");
  }, [spotItAnswer, spotItNote, tripId, stopId, stopName]);

  const handleNavigateNext = useCallback(async () => {
    sessionStorage.removeItem(`adventure_override_stop_${tripId}`);
    try {
      await fetchTrip(tripId);
    } catch {}
    navReplace(setLocation, `/adventure/${tripId}/kid/next`);
  }, [tripId, setLocation, fetchTrip]);

  if (step === "reflection") {
    return (
      <div className="flex flex-col min-h-[calc(100vh-56px)] bg-[#F0EDFF]" data-testid="kid-reflect-page">
        <div className="flex-1 flex flex-col items-center px-6">
          <div style={{ paddingTop: '8vh' }} className="w-full flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <GeoBuddyCharacter size="md" state="wondering" showGlow={false} />
            </motion.div>
          </div>

          <div className="mt-4" />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-5"
          >
            <h1 className="text-2xl font-black text-[#2D1B69]" data-testid="text-reflect-title">
              GeoMoment <span className="text-purple-500">Reflection</span>
            </h1>
            <p className="text-sm text-[#6B7280] mt-1.5">at {stopName}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-lg shadow-purple-200/50"
          >
            <h2 className="text-lg font-bold text-[#2D1B69] text-center mb-4" data-testid="text-reflect-question">
              What will you remember about this place?
            </h2>

            <Textarea
              value={reflectionText}
              onChange={(e) => setReflectionText(e.target.value)}
              placeholder="Tell us what you think..."
              className="min-h-[120px] resize-none rounded-2xl border-purple-200 focus:border-purple-400 focus:ring-purple-300 text-[15px]"
              data-testid="input-reflect-text"
            />

            <button
              onClick={handleSpeechToggle}
              className={`flex items-center justify-center gap-2 w-full py-2.5 mt-3 rounded-full text-sm font-semibold transition-all ${
                isListening
                  ? "bg-red-100 text-red-600 border border-red-200"
                  : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
              }`}
              data-testid="button-speak-to-type"
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              {isListening ? "Stop Listening" : "Speak to Type"}
            </button>
          </motion.div>
        </div>

        <div className="px-6 pb-8 pt-4 space-y-3">
          <Button
            onClick={handleSaveReflection}
            className="w-full h-14 rounded-full text-base font-bold shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #A78BFA 0%, #8B5CF6 100%)',
              boxShadow: '0 8px 24px rgba(139,92,246,0.35)',
            }}
            data-testid="button-save-reflection"
          >
            <Heart className="w-5 h-5 mr-2" />
            Save My Reflection
          </Button>

          <button
            onClick={handleSkipReflection}
            className="w-full text-center text-gray-400 text-sm font-medium py-2"
            data-testid="button-skip-reflection"
          >
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  if (step === "spotit" && spotItReminder) {
    const missionText = spotItReminder.mission.split(" | ")[0];
    return (
      <div className="flex flex-col min-h-[calc(100vh-56px)] bg-[#ECFDF5]" data-testid="kid-spotit-reminder-page">
        <div className="flex-1 flex flex-col items-center px-6 pt-8">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-2"
          >
            <h1 className="text-xl font-black text-green-800 flex items-center justify-center gap-2" data-testid="text-spotit-title">
              👀 Remember Your Mission!
            </h1>
            <p className="text-sm text-green-600 mt-1">
              From your last stop at {spotItReminder.stopName}:
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="text-5xl my-4"
          >
            👀
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-lg shadow-green-200/50"
          >
            <h2 className="font-bold text-center text-gray-800 mb-3">Your mission:</h2>
            <p className="text-[15px] text-gray-600 leading-relaxed mb-5">{missionText}</p>

            <h3 className="text-center font-bold text-green-700 mb-3">Did you spot it?</h3>
            <div className="flex gap-3 justify-center mb-4">
              <button
                onClick={() => setSpotItAnswer("yes")}
                className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all ${
                  spotItAnswer === "yes"
                    ? "bg-green-500 text-white shadow-md"
                    : "bg-green-100 text-green-700 hover:bg-green-200"
                }`}
                data-testid="button-spotit-yes"
              >
                Yes! 👀 ✨
              </button>
              <button
                onClick={() => setSpotItAnswer("no")}
                className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all ${
                  spotItAnswer === "no"
                    ? "bg-gray-500 text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                data-testid="button-spotit-no"
              >
                Not yet 🤷
              </button>
            </div>

            <p className="text-center text-sm text-gray-500 mb-2">
              What else did you notice about this stop? ✏️
            </p>
            <div className="relative">
              <Textarea
                value={spotItNote}
                onChange={(e) => setSpotItNote(e.target.value)}
                placeholder="Tell us what you saw, heard, or felt..."
                className="min-h-[80px] resize-none rounded-2xl border-green-200 focus:border-green-400 text-[15px] pr-10"
                data-testid="input-spotit-note"
              />
              <button
                onClick={handleSpeechToggle}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                data-testid="button-spotit-mic"
              >
                {isListening ? <MicOff className="w-5 h-5 text-red-500" /> : <Mic className="w-5 h-5" />}
              </button>
            </div>
          </motion.div>
        </div>

        <div className="px-6 pb-8 pt-4">
          <Button
            onClick={handleSpotItDone}
            disabled={spotItAnswer === null}
            className="w-full h-14 bg-green-500 hover:bg-green-600 text-white rounded-full text-base font-bold shadow-lg shadow-green-500/30 disabled:opacity-50"
            data-testid="button-spotit-done"
          >
            Done! Let's explore! <Rocket className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  if (step === "keepsake") {
    return (
      <div className="flex flex-col min-h-[calc(100vh-56px)] bg-gradient-to-b from-amber-50 to-orange-50" data-testid="kid-keepsake-reveal-page">
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="text-center"
          >
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="text-6xl mb-4"
            >
              🏆
            </motion.div>

            <h1 className="text-2xl font-black text-amber-800 mb-2" data-testid="text-keepsake-title">
              Travel Keepsake Earned!
            </h1>
            <p className="text-sm text-amber-600 mb-6">
              You unlocked a new keepsake from {stopName}
            </p>
          </motion.div>

          {keepsakes.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-xl"
            >
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h2 className="font-bold text-amber-800">
                  Travel Keepsakes
                </h2>
                <span className="ml-auto text-xs text-amber-500 font-semibold">
                  {keepsakes.filter((k: any) => k.isCollected).length} of {keepsakes.length} collected
                </span>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {keepsakes.map((k: any, i: number) => (
                  <motion.div
                    key={k.id || i}
                    initial={k.isCollected && newKeepsake?.id === k.id ? { scale: 0 } : {}}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.6 + i * 0.05, type: "spring" }}
                    className={`aspect-square rounded-xl flex items-center justify-center text-2xl ${
                      k.isCollected
                        ? "bg-gradient-to-br from-amber-100 to-orange-100 shadow-sm"
                        : "bg-gray-100 grayscale opacity-40"
                    }`}
                    data-testid={`keepsake-${k.id || i}`}
                  >
                    <span>{k.imageEmoji || k.emoji || "🎁"}</span>
                  </motion.div>
                ))}
              </div>

              {newKeepsake && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="mt-3 text-center text-xs text-amber-600"
                >
                  ✨ New: <span className="font-bold">{newKeepsake.name || "Mystery Keepsake"}</span>
                </motion.div>
              )}

              <p className="text-center text-[11px] text-gray-400 mt-3">
                Complete Journey Packs to earn keepsakes!
              </p>
            </motion.div>
          )}
        </div>

        <div className="px-6 pb-8 pt-4 flex gap-3">
          <Button
            onClick={() => navReplace(setLocation, `/adventure/${tripId}/kid/story/${stopId}`)}
            className="flex-1 h-14 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-full text-base font-bold shadow-sm"
            data-testid="button-keepsake-revisit"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Revisit Stop
          </Button>
          <Button
            onClick={handleNavigateNext}
            className="flex-1 h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-full text-base font-bold shadow-lg shadow-orange-500/30"
            data-testid="button-keepsake-next"
          >
            Next Stop
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="flex flex-col min-h-[calc(100vh-56px)] bg-gradient-to-b from-green-50 to-emerald-50" data-testid="kid-reflect-done">
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="text-center"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, repeatType: "reverse" }}
              className="text-7xl mb-5"
            >
              🎉
            </motion.div>

            <h1 className="text-2xl font-black text-emerald-800 mb-2" data-testid="text-stop-complete-title">
              Stop Complete!
            </h1>
            <p className="text-base text-emerald-600 mb-1 font-medium">{stopName}</p>
            <p className="text-sm text-emerald-500">
              Great exploring! Ready for the next adventure?
            </p>
          </motion.div>

          {newKeepsake && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-xl mt-6"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-3xl shadow-sm">
                  {newKeepsake.imageEmoji || newKeepsake.emoji || "🎁"}
                </div>
                <div className="flex-1">
                  <p className="text-xs text-amber-500 font-semibold uppercase tracking-wide">Keepsake Unlocked!</p>
                  <h3 className="text-base font-bold text-amber-800">{newKeepsake.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{newKeepsake.description}</p>
                </div>
              </div>
            </motion.div>
          )}

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-sm text-gray-400 mt-5 text-center max-w-sm px-4"
          >
            You can view all your unlocked travel keepsakes in the Travel Vault.
          </motion.p>

          {/* Story Pack nudge for next stop */}
          {nextStopPackReady && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
              onClick={() => navReplace(setLocation, `/adventure/${tripId}/kid/story/${nextStopPackReady.stopId}`)}
              className="mt-5 w-full max-w-sm bg-white rounded-2xl border border-orange-200 px-4 py-3.5 flex items-center gap-3 shadow-sm hover:bg-orange-50 transition-colors text-left"
              data-testid="next-stop-story-pack-nudge"
            >
              <span className="text-2xl shrink-0">🎧</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-orange-500 uppercase tracking-wide">Story Pack ready</p>
                <p className="text-sm font-bold text-gray-800 truncate">{nextStopPackReady.stopName}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-orange-400 shrink-0" />
            </motion.button>
          )}
        </div>

        <div className="px-6 pb-8 pt-4 flex gap-3">
          <Button
            onClick={() => navReplace(setLocation, `/adventure/${tripId}/kid/story/${stopId}`)}
            className="flex-1 h-14 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-full text-base font-bold shadow-sm"
            data-testid="button-done-revisit-stop"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Revisit Stop
          </Button>
          <Button
            onClick={handleNavigateNext}
            className="flex-1 h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-full text-base font-bold shadow-lg shadow-orange-500/30"
            data-testid="button-done-next-stop"
          >
            Next Stop
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
