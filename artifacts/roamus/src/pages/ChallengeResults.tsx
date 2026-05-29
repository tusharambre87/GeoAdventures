import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Trophy, Clock, Zap, Swords, RotateCcw, Wand2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import {
  formatTime,
  loadCompassStats,
  saveCompassStats,
  loadCompassAchievements,
  saveCompassAchievements,
  checkAndUnlockAchievements,
  type AchievementDef,
} from "@/lib/compassQuestData";
import { useExplorer } from "@/lib/explorerContext";
import { UserPlus } from "lucide-react";

interface ComparisonAttempt {
  id: string;
  playerName: string;
  xp: number | null;
  timeMs: number | null;
  wrongGuesses: number | null;
  accuracy: number | null;
  completed: boolean | null;
}

interface ComparisonResult {
  creator: ComparisonAttempt;
  challenger: ComparisonAttempt;
  quest: {
    id: string;
    questKey: string;
    title: string;
    icon: string | null;
    startCity: string;
  };
  winner: "creator" | "challenger" | "draw";
}

interface StatRowProps {
  label: string;
  creatorVal: string;
  challengerVal: string;
  winner: "creator" | "challenger" | "draw";
  higherIsBetter?: boolean;
  icon: React.ReactNode;
}

function StatRow({ label, creatorVal, challengerVal, winner, icon }: StatRowProps) {
  return (
    <div className="grid grid-cols-3 items-center gap-2 py-2 border-b border-amber-100 last:border-0">
      <div className={`text-center font-bold text-sm rounded-lg p-2 transition-all ${winner === "creator" ? "bg-amber-100 text-amber-800 ring-2 ring-amber-400" : "text-gray-600"}`}>
        {creatorVal}
      </div>
      <div className="text-center flex flex-col items-center gap-1">
        <div className="text-amber-500">{icon}</div>
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <div className={`text-center font-bold text-sm rounded-lg p-2 transition-all ${winner === "challenger" ? "bg-purple-100 text-purple-800 ring-2 ring-purple-400" : "text-gray-600"}`}>
        {challengerVal}
      </div>
    </div>
  );
}

function ChallengeAchievementBanner({ achievements, onDone }: { achievements: AchievementDef[]; onDone?: () => void }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (achievements.length === 0) return;
    try {
      const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(1100, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
      }
    } catch {}
  }, [achievements]);

  useEffect(() => {
    if (!visible || achievements.length === 0) return;
    const timer = setTimeout(() => {
      if (currentIdx < achievements.length - 1) {
        setCurrentIdx(i => i + 1);
      } else {
        setVisible(false);
        onDone?.();
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [currentIdx, visible, achievements.length]);

  if (!visible || achievements.length === 0) return null;
  const ach = achievements[currentIdx];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentIdx}
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-auto max-w-xs"
        data-testid="achievement-unlock-banner"
      >
        <div className="flex items-center gap-3 bg-amber-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-amber-600">
          <span className="text-2xl">{ach.icon}</span>
          <div>
            <p className="text-[10px] font-bold text-amber-300 uppercase tracking-widest">🏅 Achievement Unlocked!</p>
            <p className="text-sm font-bold">{ach.label}</p>
            <p className="text-[10px] text-amber-200">{ach.description}</p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function ChallengeResults() {
  const params = useParams<{ share_code: string; attempt_id: string }>();
  const { share_code: shareCode, attempt_id: attemptId } = params;
  const [, setLocation] = useLocation();
  const { activeExplorer } = useExplorer();
  const explorerId = activeExplorer?.id;

  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confettiFired, setConfettiFired] = useState(false);
  const [challengeBackData, setChallengeBackData] = useState<{ shareCode: string; shareUrl: string } | null>(null);
  const [challengeBackLoading, setChallengeBackLoading] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [newlyUnlockedAchievements, setNewlyUnlockedAchievements] = useState<AchievementDef[]>([]);
  const [statsUpdated, setStatsUpdated] = useState(false);

  useEffect(() => {
    fetch("/api/auth/user")
      .then(r => { if (r.status === 401) setIsGuest(true); })
      .catch(() => setIsGuest(true));
  }, []);

  useEffect(() => {
    if (!shareCode || !attemptId) return;
    setLoading(true);
    fetch(`/api/challenges/${shareCode}/compare/${attemptId}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load results");
        }
        return res.json();
      })
      .then((data: ComparisonResult) => {
        setResult(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, [shareCode, attemptId]);

  // Update challenge stats when result loads (idempotent: track processed attempt IDs)
  useEffect(() => {
    if (!result || statsUpdated || !attemptId) return;
    const processedKey = `compass_challenge_processed${explorerId ? `_${explorerId}` : ""}`;
    let processed: string[] = [];
    try { processed = JSON.parse(localStorage.getItem(processedKey) || "[]"); } catch {}
    if (processed.includes(attemptId)) {
      setStatsUpdated(true);
      return;
    }
    setStatsUpdated(true);
    processed.push(attemptId);
    try { localStorage.setItem(processedKey, JSON.stringify(processed.slice(-100))); } catch {}
    const prevStats = loadCompassStats(explorerId);
    const isWin = result.winner === "challenger";
    const newStats = {
      ...prevStats,
      challengesPlayed: prevStats.challengesPlayed + 1,
      challengesWon: prevStats.challengesWon + (isWin ? 1 : 0),
    };
    saveCompassStats(newStats, explorerId);
    const existingAchievements = loadCompassAchievements(explorerId);
    const newUnlocks = checkAndUnlockAchievements(newStats, existingAchievements);
    if (newUnlocks.length > 0) {
      const updatedAchievements = { ...existingAchievements };
      for (const ach of newUnlocks) {
        updatedAchievements[ach.key] = { unlockedAt: new Date().toISOString() };
      }
      saveCompassAchievements(updatedAchievements, explorerId);
      setNewlyUnlockedAchievements(newUnlocks);
    }
  }, [result, statsUpdated, explorerId, attemptId]);

  useEffect(() => {
    if (!result || confettiFired) return;
    if (result.winner === "challenger") {
      setConfettiFired(true);
      setTimeout(() => {
        confetti({ particleCount: 200, spread: 90, origin: { y: 0.6 } });
        setTimeout(() => confetti({ particleCount: 100, spread: 70, origin: { y: 0.5 }, angle: 60 }), 300);
        setTimeout(() => confetti({ particleCount: 100, spread: 70, origin: { y: 0.5 }, angle: 120 }), 600);
      }, 500);
    }
  }, [result, confettiFired]);

  async function handleChallengeBack() {
    if (!result || challengeBackLoading) return;
    setChallengeBackLoading(true);
    try {
      // Create a new challenge using the challenger's completed attempt
      const res = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questId: result.quest.id, creatorAttemptId: attemptId }),
      });
      if (!res.ok) throw new Error("Failed to create challenge");
      const data = await res.json();
      setChallengeBackData({ shareCode: data.shareCode, shareUrl: data.shareUrl });
    } catch {
      toast.error("Failed to create challenge back. Try again!");
    } finally {
      setChallengeBackLoading(false);
    }
  }

  async function handleShare(shareCode: string, shareUrl: string) {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Can you beat my Compass Quest score?",
          text: `I challenge you to beat my score! Use code: ${shareCode}`,
          url: shareUrl,
        });
      } catch {
        // User cancelled or share failed — fall back to clipboard
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied!");
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied!");
    }
  }

  function handleTryAgain() {
    if (!result) return;
    setLocation(`/challenge/${shareCode}`);
  }

  function handleCreateQuest() {
    setLocation("/compass-quest");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-50 to-amber-50">
        <div className="text-center space-y-4">
          <div className="text-5xl animate-bounce">⚔️</div>
          <p className="text-amber-700 font-medium">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-50 to-amber-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm w-full text-center space-y-6"
        >
          <div className="text-6xl">❌</div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Results Not Found</h2>
            <p className="text-gray-500 mt-2 text-sm">{error || "Could not load comparison results."}</p>
          </div>
          <Button onClick={() => setLocation("/compass-quest")} className="bg-amber-600 hover:bg-amber-700 text-white" data-testid="button-back-to-quests">
            Back to Quests
          </Button>
        </motion.div>
      </div>
    );
  }

  const { creator, challenger, quest, winner } = result;
  const challengerWon = winner === "challenger";
  const creatorWon = winner === "creator";
  const isDraw = winner === "draw";

  const verdictText = challengerWon
    ? `You beat ${creator.playerName}!`
    : creatorWon
    ? `${creator.playerName} still wins!`
    : "It's a Draw!";

  const verdictEmoji = challengerWon ? "🏆" : creatorWon ? "😤" : "🤝";
  const verdictColor = challengerWon ? "text-purple-700" : creatorWon ? "text-amber-700" : "text-blue-700";

  const xpWinner = (() => {
    const c = challenger.xp ?? 0;
    const cr = creator.xp ?? 0;
    if (c > cr) return "challenger";
    if (cr > c) return "creator";
    return "draw";
  })();

  const timeWinner = (() => {
    const c = challenger.timeMs ?? Infinity;
    const cr = creator.timeMs ?? Infinity;
    if (c < cr) return "challenger";
    if (cr < c) return "creator";
    return "draw";
  })();

  const accWinner = (() => {
    const c = challenger.accuracy ?? 0;
    const cr = creator.accuracy ?? 0;
    if (c > cr) return "challenger";
    if (cr > c) return "creator";
    return "draw";
  })();

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-amber-50 p-4">
      {/* Achievement unlock banner */}
      {newlyUnlockedAchievements.length > 0 && (
        <ChallengeAchievementBanner
          achievements={newlyUnlockedAchievements}
          onDone={() => setNewlyUnlockedAchievements([])}
        />
      )}
      <div className="max-w-md mx-auto space-y-5 pt-6 pb-12">
        <button
          onClick={() => setLocation("/compass-quest")}
          className="flex items-center gap-2 text-amber-700 hover:text-amber-900 text-sm font-medium"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Quests
        </button>

        <AnimatePresence>
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            <div className="text-center space-y-2">
              <motion.div
                animate={challengerWon ? { scale: [1, 1.15, 1], rotate: [0, -8, 8, 0] } : {}}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="text-5xl"
              >
                {verdictEmoji}
              </motion.div>
              <motion.h1
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
                className={`text-2xl font-bold ${verdictColor}`}
                data-testid="text-verdict"
              >
                {verdictText}
              </motion.h1>
              <p className="text-sm text-gray-500">
                {quest.icon} {quest.title}
              </p>
            </div>

            <Card className="border-2 border-amber-200 overflow-hidden">
              <div className="grid grid-cols-3 bg-gradient-to-r from-amber-50 via-white to-purple-50">
                <div className={`p-3 text-center border-r border-amber-100 ${creatorWon ? "ring-2 ring-amber-400 bg-amber-50" : ""}`}>
                  <p className="text-xs text-gray-400 mb-1">Challenger</p>
                  <p className="font-bold text-amber-800 text-sm truncate" data-testid="text-creator-name">{creator.playerName}</p>
                  {creatorWon && <p className="text-xs text-amber-600 mt-1 font-bold">🏆 Winner</p>}
                </div>
                <div className="p-3 text-center flex items-center justify-center">
                  <span className="text-2xl font-black text-gray-300">VS</span>
                </div>
                <div className={`p-3 text-center border-l border-purple-100 ${challengerWon ? "ring-2 ring-purple-400 bg-purple-50" : ""}`}>
                  <p className="text-xs text-gray-400 mb-1">You</p>
                  <p className="font-bold text-purple-800 text-sm truncate" data-testid="text-challenger-name">{challenger.playerName}</p>
                  {challengerWon && <p className="text-xs text-purple-600 mt-1 font-bold">🏆 Winner</p>}
                  {isDraw && <p className="text-xs text-blue-600 mt-1 font-bold">🤝 Draw</p>}
                </div>
              </div>

              <CardContent className="p-4 space-y-1">
                <StatRow
                  label="XP"
                  creatorVal={creator.xp != null ? `${creator.xp} XP` : "—"}
                  challengerVal={challenger.xp != null ? `${challenger.xp} XP` : "—"}
                  winner={xpWinner}
                  icon={<Zap className="w-4 h-4" />}
                />
                <StatRow
                  label="Time"
                  creatorVal={creator.timeMs ? formatTime(creator.timeMs) : "—"}
                  challengerVal={challenger.timeMs ? formatTime(challenger.timeMs) : "—"}
                  winner={timeWinner}
                  icon={<Clock className="w-4 h-4" />}
                />
                <StatRow
                  label="Accuracy"
                  creatorVal={creator.accuracy != null ? `${Math.round(creator.accuracy)}%` : "—"}
                  challengerVal={challenger.accuracy != null ? `${Math.round(challenger.accuracy)}%` : "—"}
                  winner={accWinner}
                  icon={<Trophy className="w-4 h-4" />}
                />
              </CardContent>
            </Card>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="space-y-3"
            >
              {/* Challenge Back share panel - shown after clicking Challenge Back */}
              {challengeBackData && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-300 rounded-2xl p-4 space-y-3"
                  data-testid="panel-challenge-back-share"
                >
                  <div className="text-center">
                    <p className="font-bold text-purple-700 text-sm">⚔️ Challenge Sent!</p>
                    <p className="text-xs text-gray-500 mt-1">Share this code with your opponent</p>
                  </div>
                  <div className="bg-white rounded-xl p-3 text-center border border-purple-200">
                    <p className="font-mono font-bold text-2xl tracking-widest text-purple-700" data-testid="text-challenge-back-code">{challengeBackData.shareCode}</p>
                  </div>
                  <Button
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                    data-testid="button-share-challenge-back"
                    onClick={() => handleShare(challengeBackData.shareCode, challengeBackData.shareUrl)}
                  >
                    <Share2 className="w-4 h-4" /> Share Challenge
                  </Button>
                </motion.div>
              )}

              {!challengeBackData && (
                <Button
                  onClick={handleChallengeBack}
                  disabled={challengeBackLoading}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 py-3"
                  data-testid="button-challenge-back"
                >
                  {challengeBackLoading ? (
                    <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating...</>
                  ) : (
                    <><Swords className="w-4 h-4" /> Challenge Back</>
                  )}
                </Button>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={handleTryAgain}
                  variant="outline"
                  className="border-amber-300 text-amber-700 hover:bg-amber-50 rounded-xl flex items-center justify-center gap-2"
                  data-testid="button-try-again"
                >
                  <RotateCcw className="w-4 h-4" /> Try Again
                </Button>
                <Button
                  onClick={handleCreateQuest}
                  variant="outline"
                  className="border-purple-300 text-purple-700 hover:bg-purple-50 rounded-xl flex items-center justify-center gap-2"
                  data-testid="button-create-quest"
                >
                  <Wand2 className="w-4 h-4" /> Create Quest
                </Button>
              </div>

              {isGuest && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }}>
                  <Card className="border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50">
                    <CardContent className="p-5 text-center space-y-3">
                      <p className="text-base font-bold text-amber-800">🌍 Want to keep exploring?</p>
                      <p className="text-sm text-gray-600 leading-relaxed">Create a free account to save your scores, build your own quests, and challenge friends anytime!</p>
                      <Button
                        onClick={() => setLocation("/")}
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white rounded-xl flex items-center justify-center gap-2"
                        data-testid="button-create-account"
                      >
                        <UserPlus className="w-4 h-4" /> Create Free Account
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
