import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Trophy, Clock, Zap, Swords, MapPin, UserPlus, LogIn, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useExplorer } from "@/lib/explorerContext";
import { formatTime } from "@/lib/compassQuestData";

interface ChallengeData {
  challengeId: string;
  shareCode: string;
  quest: {
    id: string;
    questKey: string;
    title: string;
    subtitle: string | null;
    icon: string | null;
    description: string | null;
    startCity: string;
    cities: string[];
    stepsJson: unknown;
    isCustom: boolean | null;
  };
  creatorAttempt: {
    id: string;
    playerName: string;
    xp: number | null;
    timeMs: number | null;
    wrongGuesses: number | null;
    accuracy: number | null;
  };
}

export default function ChallengeIntro() {
  const params = useParams<{ share_code: string }>();
  const shareCode = params.share_code;
  const [, setLocation] = useLocation();
  const { activeExplorer } = useExplorer();

  const [challengeData, setChallengeData] = useState<ChallengeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [starting, setStarting] = useState(false);
  const [isPwa, setIsPwa] = useState(true);

  useEffect(() => {
    setIsPwa(window.matchMedia("(display-mode: standalone)").matches);
  }, []);

  useEffect(() => {
    if (activeExplorer?.name) {
      setPlayerName(activeExplorer.name);
    }
  }, [activeExplorer?.name]);

  useEffect(() => {
    if (!shareCode) return;
    setLoading(true);
    fetch(`/api/challenges/${shareCode}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Challenge not found");
        }
        return res.json();
      })
      .then((data: ChallengeData) => {
        setChallengeData(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message || "Challenge not found");
        setLoading(false);
      });
  }, [shareCode]);

  async function handleStartChallenge() {
    if (!challengeData || !playerName.trim() || starting) return;
    setStarting(true);
    try {
      const attemptRes = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questId: challengeData.quest.id, playerName: playerName.trim() }),
      });
      if (!attemptRes.ok) throw new Error("Failed to create attempt");
      const attempt = await attemptRes.json();
      setLocation(
        `/compass-quest?challenge=${shareCode}&attemptId=${attempt.id}&questKey=${encodeURIComponent(challengeData.quest.questKey)}`
      );
    } catch {
      setStarting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-orange-50">
        <div className="text-center space-y-4">
          <div className="text-5xl animate-bounce">🧭</div>
          <p className="text-amber-700 font-medium">Loading challenge...</p>
        </div>
      </div>
    );
  }

  if (error || !challengeData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-orange-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm w-full text-center space-y-6"
        >
          <div className="text-6xl">❌</div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Challenge Not Found</h2>
            <p className="text-gray-500 mt-2 text-sm">
              {error === "This challenge is no longer active"
                ? "This challenge is no longer active."
                : "This challenge code is invalid or has expired."}
            </p>
          </div>
          <Button
            onClick={() => setLocation("/compass-quest")}
            className="bg-amber-600 hover:bg-amber-700 text-white"
            data-testid="button-back-to-quests"
          >
            Browse Quests
          </Button>
        </motion.div>
      </div>
    );
  }

  const { quest, creatorAttempt } = challengeData;
  const hasExplorer = !!activeExplorer?.name;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 p-4">
      {/* PWA banner — shown only when opened in a regular browser, not the installed app */}
      {!isPwa && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 flex items-center gap-3 shadow-lg"
        >
          <Smartphone className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold leading-tight">Using the GeoQuest app?</p>
            <p className="text-xs opacity-90 leading-tight">
              Open <span className="font-bold">Compass Quest → My Challenges</span> and enter code{" "}
              <span className="font-mono font-bold bg-white/20 px-1 rounded">{shareCode}</span>
            </p>
          </div>
        </motion.div>
      )}

      <div className={`max-w-md mx-auto space-y-6 ${!isPwa ? "pt-20" : "pt-6"}`}>
        <button
          onClick={() => setLocation("/compass-quest")}
          className="flex items-center gap-2 text-amber-700 hover:text-amber-900 text-sm font-medium"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Quests
        </button>

        <AnimatePresence>
          <motion.div
            key="challenge-intro"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            <div className="text-center space-y-2">
              <motion.div
                animate={{ scale: [1, 1.08, 1], rotate: [0, -5, 5, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                className="text-6xl"
              >
                ⚔️
              </motion.div>
              <h1 className="text-2xl font-bold text-amber-800">You've Been Challenged!</h1>
              <p className="text-amber-600 font-medium text-sm">
                <span className="font-bold text-amber-700">{creatorAttempt.playerName}</span> challenges you to beat their score
              </p>
            </div>

            <Card className="border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{quest.icon || "🧭"}</span>
                  <div>
                    <h2 className="font-bold text-gray-800">{quest.title}</h2>
                    {quest.subtitle && <p className="text-sm text-gray-500">{quest.subtitle}</p>}
                  </div>
                </div>

                {quest.cities && quest.cities.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <MapPin className="w-3 h-3 text-amber-500" />
                    <span>{quest.startCity} → {quest.cities.slice(0, 3).join(" → ")}{quest.cities.length > 3 ? "…" : ""}</span>
                  </div>
                )}

                <div className="border-t border-amber-200 pt-4 space-y-2">
                  <p className="text-xs text-amber-600 font-semibold uppercase tracking-wider">Score to Beat</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white rounded-xl p-3 text-center border border-amber-100 shadow-sm">
                      <Zap className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                      <p className="font-bold text-amber-700 text-sm">{creatorAttempt.xp ?? "—"}</p>
                      <p className="text-xs text-gray-400">XP</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 text-center border border-amber-100 shadow-sm">
                      <Clock className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                      <p className="font-bold text-blue-600 text-sm">{creatorAttempt.timeMs ? formatTime(creatorAttempt.timeMs) : "—"}</p>
                      <p className="text-xs text-gray-400">Time</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 text-center border border-amber-100 shadow-sm">
                      <Trophy className="w-4 h-4 text-green-500 mx-auto mb-1" />
                      <p className="font-bold text-green-600 text-sm">{creatorAttempt.accuracy != null ? `${Math.round(creatorAttempt.accuracy)}%` : "—"}</p>
                      <p className="text-xs text-gray-400">Accuracy</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Identity / login section */}
            <Card className="border border-amber-200 bg-white">
              <CardContent className="p-4 space-y-3">
                {hasExplorer ? (
                  <>
                    <p className="text-sm font-medium text-gray-700">Playing as</p>
                    <div className="flex items-center gap-2 bg-amber-50 rounded-xl p-3 border border-amber-200">
                      <span className="text-xl">🌟</span>
                      <span className="font-semibold text-amber-800">{activeExplorer.name}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-700">Sign in to save your score</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          sessionStorage.setItem("challenge_redirect", shareCode);
                          setLocation("/");
                        }}
                        className="border-amber-300 text-amber-700 hover:bg-amber-50 flex items-center justify-center gap-1.5 text-sm"
                        data-testid="button-sign-in"
                      >
                        <LogIn className="w-4 h-4" /> Sign In
                      </Button>
                      <Button
                        onClick={() => {
                          sessionStorage.setItem("challenge_redirect", shareCode);
                          setLocation("/");
                        }}
                        className="bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center gap-1.5 text-sm"
                        data-testid="button-create-account"
                      >
                        <UserPlus className="w-4 h-4" /> Join Free
                      </Button>
                    </div>
                    <div className="relative flex items-center gap-2">
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-xs text-gray-400 whitespace-nowrap">or play as guest</span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>
                    <Input
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="Enter your name to play as guest"
                      className="border-amber-300 focus:border-amber-500"
                      maxLength={30}
                      data-testid="input-player-name"
                    />
                  </>
                )}
              </CardContent>
            </Card>

            <motion.div
              animate={{ boxShadow: ["0 0 0px #f59e0b", "0 0 20px #f59e0b60", "0 0 0px #f59e0b"] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="rounded-2xl"
            >
              <Button
                onClick={handleStartChallenge}
                disabled={!playerName.trim() || starting}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white py-4 text-lg font-bold rounded-2xl shadow-lg flex items-center justify-center gap-2"
                data-testid="button-start-challenge"
              >
                {starting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Swords className="w-5 h-5" />
                    Start Challenge
                  </>
                )}
              </Button>
            </motion.div>

            <p className="text-center text-xs text-gray-400">
              Play the same quest and try to beat {creatorAttempt.playerName}'s score!
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
