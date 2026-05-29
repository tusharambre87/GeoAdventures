import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Eye, Lightbulb, Brain, Check, ChevronRight, Star, Gift, HelpCircle, X, Camera, MessageCircle, Mic, MicOff } from "lucide-react";
import { XP_REWARDS } from "@shared/schema";
import type { ExplorerChallengeMission } from "@shared/schema";

interface MissionCardProps {
  stopId: string;
  stopName: string;
  missionType: string;
  missionQuestion: string;
  missionHint?: string | null;
  missionAnswer?: string | null;
  missionDifficulty: string;
  missionCompleted: boolean;
  missionKeepsakeReward: boolean;
  missionXpAwarded?: number;
  onComplete: (stopId: string, answer: string) => Promise<{
    success: boolean;
    isCorrect: boolean;
    xpAwarded: number;
    keepsakeUnlocked: boolean;
    unlockedKeepsake?: { name: string; emoji: string; description: string } | null;
    correctAnswer?: string;
  }>;
  isActive: boolean;
  isLocked: boolean;
  index: number;
}

function CuriosityMission({ stopId, missionQuestion, missionAnswer, submitting, onComplete }: {
  stopId: string;
  missionQuestion: string;
  missionAnswer?: string | null;
  submitting: boolean;
  onComplete: () => void;
}) {
  const [revealed, setRevealed] = useState(false);

  if (!revealed) {
    return (
      <button
        onClick={() => setRevealed(true)}
        className="w-full py-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
        data-testid={`mission-curiosity-reveal-${stopId}`}
      >
        <Lightbulb className="w-5 h-5" />
        Tap to discover!
      </button>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
      {missionAnswer && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-4 py-3">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">{missionAnswer}</p>
        </div>
      )}
      <button
        onClick={onComplete}
        disabled={submitting}
        className="w-full py-3 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        data-testid={`mission-curiosity-cool-${stopId}`}
      >
        {submitting ? "Completing..." : "Cool! 🌟"}
      </button>
    </motion.div>
  );
}

const missionTypeConfig: Record<string, { icon: React.ReactNode; label: string; color: string; bgColor: string; verb: string }> = {
  knowledge: {
    icon: <Brain className="w-5 h-5" />,
    label: "Knowledge",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700",
    verb: "Answer",
  },
  observation: {
    icon: <Eye className="w-5 h-5" />,
    label: "Observation",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700",
    verb: "I found it!",
  },
  curiosity: {
    icon: <Lightbulb className="w-5 h-5" />,
    label: "Curiosity",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700",
    verb: "Share",
  },
};

const difficultyXp: Record<string, number> = {
  easy: XP_REWARDS.MISSION_EASY,
  normal: XP_REWARDS.MISSION_NORMAL,
  challenge: XP_REWARDS.MISSION_CHALLENGE,
};

const difficultyLabel: Record<string, { label: string; stars: number; color: string }> = {
  easy: { label: "Easy", stars: 1, color: "text-green-500" },
  normal: { label: "Normal", stars: 2, color: "text-amber-500" },
  challenge: { label: "Challenge", stars: 3, color: "text-red-500" },
};

export function MissionCard({
  stopId,
  stopName,
  missionType,
  missionQuestion,
  missionHint,
  missionAnswer,
  missionDifficulty,
  missionCompleted,
  missionKeepsakeReward,
  missionXpAwarded,
  onComplete,
  isActive,
  isLocked,
  index,
}: MissionCardProps) {
  const [answer, setAnswer] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [wrongAnswer, setWrongAnswer] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    isCorrect: boolean;
    xpAwarded: number;
    keepsakeUnlocked: boolean;
    unlockedKeepsake?: { name: string; emoji: string; description: string } | null;
    correctAnswer?: string;
  } | null>(null);

  const config = missionTypeConfig[missionType] || missionTypeConfig.curiosity;
  const difficulty = difficultyLabel[missionDifficulty] || difficultyLabel.normal;
  const xpReward = difficultyXp[missionDifficulty] || difficultyXp.normal;

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setWrongAnswer(false);
    try {
      const res = await onComplete(stopId, answer);
      if (!res.success && !res.isCorrect) {
        setWrongAnswer(true);
        setAnswer("");
      } else {
        setResult(res);
      }
    } catch (e) {
      console.error("Mission completion error:", e);
    } finally {
      setSubmitting(false);
    }
  };

  if (missionCompleted || result?.success) {
    const awarded = result?.xpAwarded || missionXpAwarded || 0;
    return (
      <motion.div
        initial={result ? { scale: 0.95, opacity: 0 } : false}
        animate={{ scale: 1, opacity: 1 }}
        className="rounded-xl border-2 border-green-200 dark:border-green-700 bg-green-50/50 dark:bg-green-900/20 p-4"
        data-testid={`mission-completed-${stopId}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-800/40 flex items-center justify-center">
            <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-green-700 dark:text-green-300 text-sm">Mission Complete!</p>
            <p className="text-xs text-green-600/70 dark:text-green-400/70 truncate">{stopName}</p>
          </div>
          {awarded > 0 && (
            <motion.div
              initial={result ? { scale: 0, rotate: -180 } : false}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, type: "spring" }}
              className="flex items-center gap-1 bg-amber-100 dark:bg-amber-900/40 px-3 py-1.5 rounded-full"
            >
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="font-bold text-amber-700 dark:text-amber-300 text-sm">+{awarded} XP</span>
            </motion.div>
          )}
        </div>
        {result?.keepsakeUnlocked && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.6, type: "spring" }}
            className="mt-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg p-3 border border-purple-200 dark:border-purple-700"
          >
            <div className="flex items-center gap-3">
              <motion.span
                initial={{ rotate: -30, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ delay: 0.8, type: "spring", bounce: 0.5 }}
                className="text-3xl"
              >
                {result.unlockedKeepsake?.emoji || '🎁'}
              </motion.span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-purple-700 dark:text-purple-300">
                  {result.unlockedKeepsake?.name || 'Keepsake unlocked!'}
                </p>
                {result.unlockedKeepsake?.description && (
                  <p className="text-xs text-purple-600/70 dark:text-purple-400/70 truncate">
                    {result.unlockedKeepsake.description}
                  </p>
                )}
              </div>
              <Gift className="w-5 h-5 text-purple-400 shrink-0" />
            </div>
          </motion.div>
        )}
      </motion.div>
    );
  }

  if (isLocked) {
    return (
      <div
        className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 p-4 opacity-50"
        data-testid={`mission-locked-${index}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
            <span className="text-lg">🔒</span>
          </div>
          <div className="flex-1">
            <p className="font-medium text-slate-500 dark:text-slate-400 text-sm">Mission #{index + 1}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">Complete previous missions to unlock</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isActive) {
    return (
      <div
        className={`rounded-xl border ${config.bgColor} p-4 opacity-60`}
        data-testid={`mission-upcoming-${index}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/60 dark:bg-white/10 flex items-center justify-center">
            {config.icon}
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">{stopName}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
              <span className="text-xs text-slate-400">•</span>
              <span className={`text-xs font-medium ${difficulty.color}`}>+{xpReward} XP</span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-300" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`rounded-xl border-2 ${config.bgColor} p-4 shadow-lg`}
      data-testid={`mission-active-${stopId}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${config.color} bg-white/60 dark:bg-white/10`}>
            {config.icon}
          </div>
          <div>
            <span className={`text-xs font-bold uppercase tracking-wider ${config.color}`}>{config.label} Mission</span>
            <div className="flex items-center gap-1 mt-0.5">
              {Array.from({ length: difficulty.stars }).map((_, i) => (
                <Star key={i} className={`w-3 h-3 fill-current ${difficulty.color}`} />
              ))}
              <span className={`text-xs ml-1 ${difficulty.color}`}>{difficulty.label}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-white/60 dark:bg-white/10 px-2.5 py-1 rounded-full">
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400">+{xpReward} XP</span>
        </div>
      </div>

      <p className="text-sm font-medium mb-1 text-slate-500 dark:text-slate-400">{stopName}</p>
      <p className="text-base font-semibold mb-3 leading-snug">{missionQuestion}</p>

      {missionKeepsakeReward && (
        <div className="flex items-center gap-1.5 mb-3 text-purple-600 dark:text-purple-400">
          <Gift className="w-4 h-4" />
          <span className="text-xs font-medium">Complete to earn a keepsake!</span>
        </div>
      )}

      {missionType === "knowledge" ? (
        <div className="space-y-2">
          {wrongAnswer && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 text-xs text-red-600 dark:text-red-400 font-medium"
            >
              Not quite! Try again or use the hint. 🤔
            </motion.div>
          )}
          <input
            type="text"
            value={answer}
            onChange={(e) => { setAnswer(e.target.value); setWrongAnswer(false); }}
            placeholder="Type your answer..."
            className={`w-full px-4 py-2.5 rounded-lg border ${wrongAnswer ? 'border-red-300 dark:border-red-600' : 'border-slate-200 dark:border-slate-600'} bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400`}
            onKeyDown={(e) => e.key === "Enter" && answer.trim() && handleSubmit()}
            data-testid={`mission-answer-input-${stopId}`}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleSubmit}
              disabled={!answer.trim() || submitting}
              className="flex-1 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm disabled:opacity-50 transition-colors"
              data-testid={`mission-submit-${stopId}`}
            >
              {submitting ? "Checking..." : "Submit Answer"}
            </button>
            {missionHint && (
              <button
                onClick={() => setShowHint(!showHint)}
                className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                data-testid={`mission-hint-${stopId}`}
              >
                <HelpCircle className="w-5 h-5 text-slate-400" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {missionType === "observation" ? (
            <button
              onClick={() => handleSubmit()}
              disabled={submitting}
              className="w-full py-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              data-testid={`mission-observe-${stopId}`}
            >
              <Eye className="w-5 h-5" />
              {submitting ? "Completing..." : config.verb}
            </button>
          ) : (
            <CuriosityMission
              stopId={stopId}
              missionQuestion={missionQuestion}
              missionAnswer={missionAnswer}
              submitting={submitting}
              onComplete={handleSubmit}
            />
          )}
        </div>
      )}

      <AnimatePresence>
        {showHint && missionHint && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 overflow-hidden"
          >
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg px-3 py-2 flex items-start gap-2">
              <HelpCircle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
              <p className="text-xs text-yellow-700 dark:text-yellow-300">{missionHint}</p>
              <button onClick={() => setShowHint(false)} className="ml-auto shrink-0">
                <X className="w-3.5 h-3.5 text-yellow-500" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface MissionProgressBarProps {
  completed: number;
  total: number;
  xpTotal: number;
}

export function MissionProgressBar({ completed, total, xpTotal }: MissionProgressBarProps) {
  if (total === 0) return null;
  const pct = Math.round((completed / total) * 100);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3" data-testid="mission-progress-bar">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm">Missions</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{completed}/{total}</span>
          {xpTotal > 0 && (
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
              {xpTotal} XP
            </span>
          )}
        </div>
      </div>
      <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-orange-400 to-pink-500 rounded-full"
        />
      </div>
      {completed === total && total > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-center mt-1.5 font-semibold text-green-600 dark:text-green-400"
        >
          All missions complete! 🎉
        </motion.p>
      )}
    </div>
  );
}

interface RouteOverviewBarProps {
  stops: Array<{ id: string; name: string; missionCompleted?: boolean; missionType?: string | null }>;
  activeStopIndex: number;
}

export function RouteOverviewBar({ stops, activeStopIndex }: RouteOverviewBarProps) {
  if (stops.length === 0) return null;

  const missionStops = stops.filter(s => !!s.missionType);

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto pb-1 px-1 scrollbar-hide" data-testid="route-overview-bar">
      {missionStops.map((stop, i) => {
        const origIdx = stops.indexOf(stop);
        const isCompleted = stop.missionCompleted;
        const isActive = origIdx === activeStopIndex;

        const shortName = stop.name.length > 12 ? stop.name.substring(0, 11) + "…" : stop.name;

        return (
          <div key={stop.id} className="flex items-center shrink-0">
            <div
              className={`px-2 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap border transition-all ${
                isCompleted
                  ? "bg-green-100 dark:bg-green-800/40 border-green-300 dark:border-green-600 text-green-700 dark:text-green-300"
                  : isActive
                  ? "bg-orange-100 dark:bg-orange-800/40 border-orange-300 dark:border-orange-600 text-orange-700 dark:text-orange-300 ring-1 ring-orange-200"
                  : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400"
              }`}
              title={stop.name}
            >
              {isCompleted ? "✓ " : ""}{shortName}
            </div>
            {i < missionStops.length - 1 && (
              <ChevronRight className={`w-3 h-3 shrink-0 mx-0.5 ${origIdx < activeStopIndex ? "text-green-400" : "text-slate-300 dark:text-slate-600"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface KeepsakeItem {
  name: string;
  emoji: string;
  stopName: string;
}

interface MissionCompletionSummaryProps {
  tripName: string;
  totalMissions: number;
  missionsCompleted: number;
  totalXp: number;
  keepsakesEarned: KeepsakeItem[];
  onClose: () => void;
}

export function MissionCompletionSummary({
  tripName,
  totalMissions,
  missionsCompleted,
  totalXp,
  keepsakesEarned,
  onClose,
}: MissionCompletionSummaryProps) {
  const allComplete = missionsCompleted >= totalMissions;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 50 }}
        className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        data-testid="mission-completion-summary"
      >
        <div className="text-center mb-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="text-5xl mb-3"
          >
            {allComplete ? "🏆" : "📊"}
          </motion.div>
          <h2 className="text-xl font-bold mb-1">
            {allComplete ? "All Missions Complete!" : "Mission Progress"}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{tripName}</p>
        </div>

        <div className="space-y-3 mb-5">
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎯</span>
              <span className="text-sm font-medium">Missions</span>
            </div>
            <span className="font-bold text-lg">{missionsCompleted}/{totalMissions}</span>
          </div>
          <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              <span className="text-sm font-medium">XP Earned</span>
            </div>
            <span className="font-bold text-lg text-amber-600 dark:text-amber-400">{totalXp}</span>
          </div>
          {keepsakesEarned.length > 0 && (
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Gift className="w-5 h-5 text-purple-500" />
                <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                  Keepsakes Collected ({keepsakesEarned.length})
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {keepsakesEarned.map((k, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3 + i * 0.15, type: "spring" }}
                    className="flex flex-col items-center bg-white dark:bg-slate-700 rounded-lg p-2 border border-purple-200 dark:border-purple-600"
                  >
                    <span className="text-2xl mb-1">{k.emoji}</span>
                    <span className="text-[10px] font-medium text-center leading-tight text-purple-700 dark:text-purple-300 line-clamp-2">
                      {k.name}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold text-sm hover:opacity-90 transition-opacity"
          data-testid="mission-summary-close"
        >
          {allComplete ? "Awesome! 🎉" : "Keep Exploring!"}
        </button>
      </motion.div>
    </motion.div>
  );
}

interface ExplorerChallengeProps {
  stopId: string;
  stopName: string;
  missions: ExplorerChallengeMission[];
  onAllComplete?: () => void;
  singleMode?: boolean;
  onComplete: (stopId: string, missionIndex: number, payload: {
    selectedOption?: number | null;
    skipped?: boolean;
    textResponse?: string;
    photoUrl?: string;
  }) => Promise<{
    success: boolean;
    isCorrect: boolean;
    skipped?: boolean;
    xpAwarded: number;
    allComplete: boolean;
    completedCount: number;
    totalMissions: number;
    totalXpEarned: number;
    attempts?: number;
    maxAttempts?: number;
    correctOption?: number | null;
  }>;
}

const OPTION_COLORS = [
  { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", letter: "bg-blue-100 text-blue-700" },
  { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", letter: "bg-emerald-100 text-emerald-700" },
  { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", letter: "bg-amber-100 text-amber-700" },
  { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", letter: "bg-purple-100 text-purple-700" },
];
const OPTION_LETTERS = ["A", "B", "C", "D"];

const MISSION_CONFIG = {
  knowledge: { icon: <Brain className="w-5 h-5" />, label: "KNOWLEDGE MISSION", color: "text-blue-600", bgColor: "bg-blue-50 border-blue-200", headerBg: "bg-blue-500" },
  observation: { icon: <Eye className="w-5 h-5" />, label: "OBSERVATION MISSION", color: "text-emerald-600", bgColor: "bg-emerald-50 border-emerald-200", headerBg: "bg-emerald-500" },
  photo: { icon: <Camera className="w-5 h-5" />, label: "PHOTO MISSION", color: "text-orange-600", bgColor: "bg-orange-50 border-orange-200", headerBg: "bg-orange-500" },
};

function KnowledgeMissionCard({
  mission,
  missionIndex,
  stopId,
  onComplete,
}: {
  mission: ExplorerChallengeMission;
  missionIndex: number;
  stopId: string;
  onComplete: ExplorerChallengeProps["onComplete"];
}) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [attempts, setAttempts] = useState(mission.attempts || 0);
  const [wrongOptions, setWrongOptions] = useState<Set<number>>(new Set());
  const [isCorrect, setIsCorrect] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [revealedCorrectOption, setRevealedCorrectOption] = useState<number | null>(null);

  const handleSelect = async (optionIdx: number) => {
    if (submitting || isCorrect || attempts >= 2) return;
    setSelectedOption(optionIdx);
    setSubmitting(true);
    try {
      const res = await onComplete(stopId, missionIndex, { selectedOption: optionIdx });
      if (res.success && res.isCorrect) {
        setIsCorrect(true);
        setXpEarned(res.xpAwarded);
      } else {
        const newAttempts = res.attempts || attempts + 1;
        setAttempts(newAttempts);
        setWrongOptions(prev => new Set(prev).add(optionIdx));
        setSelectedOption(null);
        if (res.correctOption !== null && res.correctOption !== undefined) {
          setRevealedCorrectOption(res.correctOption);
        }
      }
    } catch {
      setWrongOptions(prev => new Set(prev).add(optionIdx));
      setSelectedOption(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onComplete(stopId, missionIndex, { skipped: true });
    } catch {} finally {
      setSubmitting(false);
    }
  };

  // Auto-advance: when the correct answer is revealed (after 2 failures),
  // show it for 1.8 s then skip automatically — no manual tap required.
  useEffect(() => {
    if (revealedCorrectOption === null) return;
    const t = setTimeout(() => handleSkip(), 1800);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealedCorrectOption]);

  const config = MISSION_CONFIG.knowledge;

  return (
    <div className="min-w-[85vw] max-w-[85vw] snap-center" data-testid={`explorer-mission-knowledge-${missionIndex}`}>
      <div className={`rounded-2xl border-2 ${config.bgColor} overflow-hidden`}>
        <div className="flex items-center justify-between px-4 py-2.5 bg-blue-500/10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              {config.icon}
            </div>
            <span className={`text-xs font-bold uppercase tracking-wider ${config.color}`}>{config.label}</span>
          </div>
          <div className="flex items-center gap-1 bg-amber-100 px-2.5 py-1 rounded-full">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-bold text-amber-700">+{mission.xpReward} XP</span>
          </div>
        </div>

        <div className="p-4">
          <p className="text-[15px] font-semibold text-gray-900 mb-4 leading-snug">{mission.question}</p>

          {attempts >= 2 && !isCorrect && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
              <p className="text-xs text-red-600 font-medium">2 tries used! Skip to continue.</p>
            </motion.div>
          )}

          {attempts === 1 && !isCorrect && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-red-500 font-medium mb-2">
              Not quite! One more try. 🤔
            </motion.p>
          )}

          <div className="grid grid-cols-1 gap-2 mb-3">
            {(mission.options || []).map((option, i) => {
              const colors = OPTION_COLORS[i];
              const isWrong = wrongOptions.has(i);
              const isCorrectResult = isCorrect && selectedOption === i;
              const isRevealedAnswer = !isCorrect && revealedCorrectOption === i;
              const isDisabled = submitting || isCorrect || attempts >= 2 || isWrong;
              return (
                <motion.button
                  key={i}
                  whileTap={isDisabled ? undefined : { scale: 0.97 }}
                  onClick={() => handleSelect(i)}
                  disabled={isDisabled}
                  className={`flex items-center gap-3 w-full p-3 rounded-xl border-2 text-left transition-all ${
                    isCorrectResult
                      ? "border-green-400 bg-green-50 ring-2 ring-green-200"
                      : isRevealedAnswer
                      ? "border-yellow-400 bg-yellow-50 ring-2 ring-yellow-200"
                      : isWrong
                      ? "border-red-200 bg-red-50/50 opacity-50"
                      : `${colors.border} ${colors.bg}`
                  } disabled:cursor-not-allowed`}
                  data-testid={`explorer-option-${missionIndex}-${i}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
                    isCorrectResult ? "bg-green-200 text-green-800" : isRevealedAnswer ? "bg-yellow-200 text-yellow-800" : isWrong ? "bg-red-200 text-red-600" : colors.letter
                  }`}>
                    {isCorrectResult ? <Check className="w-4 h-4" /> : isRevealedAnswer ? <Check className="w-4 h-4" /> : isWrong ? <X className="w-4 h-4" /> : OPTION_LETTERS[i]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm font-medium ${isCorrectResult ? "text-green-800" : isRevealedAnswer ? "text-yellow-800 font-bold" : isWrong ? "text-red-400 line-through" : colors.text}`}>
                      {option}
                    </span>
                    {isRevealedAnswer && (
                      <p className="text-[10px] text-yellow-600 font-semibold mt-0.5">✓ Correct answer</p>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>

          {isCorrect && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center justify-center gap-2 py-2 text-green-600 font-semibold text-sm">
              <Check className="w-4 h-4" /> Correct! +{xpEarned} XP 🎉
            </motion.div>
          )}

          {!isCorrect && (
            <button
              onClick={handleSkip}
              disabled={submitting}
              className={`w-full text-center text-xs font-medium py-2 transition-colors ${
                attempts >= 2
                  ? "text-orange-600 hover:text-orange-700 bg-orange-50 rounded-lg border border-orange-200 py-2.5"
                  : "text-gray-400 hover:text-gray-600"
              }`}
              data-testid={`explorer-skip-${missionIndex}`}
            >
              {attempts >= 2 ? "Skip → Next Mission" : "Skip (no XP)"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ObservationMissionCard({
  mission,
  missionIndex,
  stopId,
  onComplete,
}: {
  mission: ExplorerChallengeMission;
  missionIndex: number;
  stopId: string;
  onComplete: ExplorerChallengeProps["onComplete"];
}) {
  const [textInput, setTextInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const handleSubmit = async () => {
    if (submitting || !textInput.trim()) return;
    setSubmitting(true);
    try {
      const res = await onComplete(stopId, missionIndex, { textResponse: textInput.trim() });
      if (res.success) {
        setIsComplete(true);
        setXpEarned(res.xpAwarded);
      }
    } catch {} finally {
      setSubmitting(false);
    }
  };

  const handleSkip = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onComplete(stopId, missionIndex, { skipped: true });
    } catch {} finally {
      setSubmitting(false);
    }
  };

  const toggleSpeech = () => {
    const SpeechRecognitionAPI = (window as unknown as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript || "";
      setTextInput(prev => prev ? prev + " " + transcript : transcript);
    };
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  const config = MISSION_CONFIG.observation;

  return (
    <div className="min-w-[85vw] max-w-[85vw] snap-center" data-testid={`explorer-mission-observation-${missionIndex}`}>
      <div className={`rounded-2xl border-2 ${config.bgColor} overflow-hidden`}>
        <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-500/10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              {config.icon}
            </div>
            <span className={`text-xs font-bold uppercase tracking-wider ${config.color}`}>{config.label}</span>
          </div>
          <div className="flex items-center gap-1 bg-amber-100 px-2.5 py-1 rounded-full">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-bold text-amber-700">+{mission.xpReward} XP</span>
          </div>
        </div>

        <div className="p-4">
          <p className="text-[15px] font-semibold text-gray-900 mb-4 leading-snug">{mission.question}</p>

          {isComplete ? (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Check className="w-5 h-5 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-700">Great observation! +{xpEarned} XP</span>
              </div>
              <p className="text-sm text-emerald-600 italic">"{textInput}"</p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Tell us what you noticed..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-emerald-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                  data-testid={`explorer-observation-input-${missionIndex}`}
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSubmit}
                  disabled={!textInput.trim() || submitting}
                  className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  data-testid={`explorer-observation-submit-${missionIndex}`}
                >
                  <MessageCircle className="w-4 h-4" />
                  {submitting ? "Saving..." : "Share!"}
                </button>
                <button
                  onClick={toggleSpeech}
                  className={`p-3 rounded-xl border-2 transition-colors ${
                    isRecording
                      ? "border-red-400 bg-red-50 text-red-600"
                      : "border-emerald-200 bg-white text-emerald-600 hover:bg-emerald-50"
                  }`}
                  data-testid={`explorer-observation-mic-${missionIndex}`}
                >
                  {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              </div>

              <button
                onClick={handleSkip}
                disabled={submitting}
                className="w-full text-center text-xs text-gray-400 hover:text-gray-600 font-medium py-1 transition-colors"
                data-testid={`explorer-skip-${missionIndex}`}
              >
                Skip (no XP)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PhotoMissionCard({
  mission,
  missionIndex,
  stopId,
  onComplete,
}: {
  mission: ExplorerChallengeMission;
  missionIndex: number;
  stopId: string;
  onComplete: ExplorerChallengeProps["onComplete"];
}) {
  const [submitting, setSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || submitting) return;

    const reader = new FileReader();
    reader.onerror = () => setSubmitting(false);
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      setPhotoPreview(dataUrl);
      setSubmitting(true);
      try {
        const res = await onComplete(stopId, missionIndex, { photoUrl: dataUrl });
        if (res.success) {
          setIsComplete(true);
          setXpEarned(res.xpAwarded);
        }
      } catch {
        setSubmitting(false);
      } finally {
        setSubmitting(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSkip = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onComplete(stopId, missionIndex, { skipped: true });
    } catch {} finally {
      setSubmitting(false);
    }
  };

  const config = MISSION_CONFIG.photo;

  return (
    <div className="min-w-[85vw] max-w-[85vw] snap-center" data-testid={`explorer-mission-photo-${missionIndex}`}>
      <div className={`rounded-2xl border-2 ${config.bgColor} overflow-hidden`}>
        <div className="flex items-center justify-between px-4 py-2.5 bg-orange-500/10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
              {config.icon}
            </div>
            <span className={`text-xs font-bold uppercase tracking-wider ${config.color}`}>{config.label}</span>
          </div>
          <div className="flex items-center gap-1 bg-amber-100 px-2.5 py-1 rounded-full">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-bold text-amber-700">+{mission.xpReward} XP</span>
          </div>
        </div>

        <div className="p-4">
          <p className="text-[15px] font-semibold text-gray-900 mb-4 leading-snug">{mission.question}</p>

          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            data-testid={`explorer-photo-input-${missionIndex}`}
          />

          {isComplete && photoPreview ? (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="rounded-xl overflow-hidden mb-3 border border-orange-200">
                <img src={photoPreview} alt="Mission photo" className="w-full h-48 object-cover" />
              </div>
              <div className="flex items-center justify-center gap-2 py-2 text-orange-600 font-semibold text-sm">
                <Camera className="w-4 h-4" /> Great photo! +{xpEarned} XP 📸
              </div>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {photoPreview && (
                <div className="rounded-xl overflow-hidden border border-orange-200">
                  <img src={photoPreview} alt="Preview" className="w-full h-40 object-cover" />
                </div>
              )}

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={submitting}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg"
                data-testid={`explorer-photo-capture-${missionIndex}`}
              >
                <Camera className="w-5 h-5" />
                {submitting ? "Saving..." : "📸 Add a Photo"}
              </button>

              <button
                onClick={handleSkip}
                disabled={submitting}
                className="w-full text-center text-xs text-gray-400 hover:text-gray-600 font-medium py-1 transition-colors"
                data-testid={`explorer-skip-${missionIndex}`}
              >
                Skip (no XP)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LockedMissionCard({ mission, missionIndex }: { mission: ExplorerChallengeMission; missionIndex: number }) {
  const config = MISSION_CONFIG[mission.type] || MISSION_CONFIG.knowledge;
  return (
    <div className="min-w-[85vw] max-w-[85vw] snap-center" data-testid={`explorer-mission-locked-${missionIndex}`}>
      <div className="rounded-2xl border-2 border-gray-200 bg-gray-50/80 p-5 opacity-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-lg">🔒</span>
          </div>
          <div className="flex-1">
            <span className={`text-xs font-bold uppercase tracking-wider text-gray-400`}>{config.label}</span>
            <p className="text-xs text-gray-400 mt-0.5">Complete previous mission to unlock</p>
          </div>
          <span className="text-xs text-gray-400 font-medium">+{mission.xpReward} XP</span>
        </div>
      </div>
    </div>
  );
}

function CompletedMissionCard({ mission, missionIndex }: { mission: ExplorerChallengeMission; missionIndex: number }) {
  const config = MISSION_CONFIG[mission.type] || MISSION_CONFIG.knowledge;
  return (
    <div className="min-w-[85vw] max-w-[85vw] snap-center" data-testid={`explorer-mission-done-${missionIndex}`}>
      <div className="rounded-2xl border-2 border-green-200 bg-green-50/80 p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
            <Check className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <span className={`text-xs font-bold uppercase tracking-wider ${config.color}`}>{config.label}</span>
            <p className="text-sm text-green-700 truncate mt-0.5">{mission.question}</p>
          </div>
          <div className="flex items-center gap-1 bg-amber-100 px-2 py-1 rounded-full shrink-0">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-bold text-amber-700">+{mission.xpReward}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SkippedMissionCard({ mission, missionIndex }: { mission: ExplorerChallengeMission; missionIndex: number }) {
  const config = MISSION_CONFIG[mission.type] || MISSION_CONFIG.knowledge;
  return (
    <div className="min-w-[85vw] max-w-[85vw] snap-center" data-testid={`explorer-mission-skipped-${missionIndex}`}>
      <div className="rounded-2xl border-2 border-gray-200 bg-gray-50/80 p-4 opacity-60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-sm text-gray-500">—</span>
          </div>
          <div className="flex-1 min-w-0">
            <span className={`text-xs font-bold uppercase tracking-wider text-gray-400`}>{config.label}</span>
            <p className="text-sm text-gray-500 truncate mt-0.5">{mission.question}</p>
            <p className="text-xs text-gray-400">Skipped</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ExplorerChallengeProgressBar({
  missions,
}: {
  missions: ExplorerChallengeMission[];
}) {
  if (!missions || missions.length === 0) return null;
  const completed = missions.filter(m => m.completed).length;
  const finished = missions.filter(m => m.completed || m.skipped).length;
  const allDone = finished === missions.length;

  const typeIcons = { knowledge: "🧠", observation: "👀", photo: "📸" };

  return (
    <div className="flex items-center gap-2" data-testid="explorer-challenge-progress">
      <span className="text-xs font-semibold text-orange-600 whitespace-nowrap">Explorer Challenge</span>
      <div className="flex items-center gap-1.5">
        {missions.map((m, i) => (
          <motion.div
            key={i}
            initial={false}
            animate={{
              backgroundColor: m.completed ? "#22c55e" : m.skipped ? "#d1d5db" : "#f3f4f6",
              scale: m.completed ? [1, 1.3, 1] : 1,
            }}
            transition={{ duration: 0.3 }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs"
          >
            {m.completed ? "✓" : typeIcons[m.type] || "·"}
          </motion.div>
        ))}
      </div>
      <span className="text-xs text-gray-500">
        {allDone ? "Complete!" : `${completed}/${missions.length}`}
      </span>
    </div>
  );
}

export function ExplorerChallenge({ stopId, stopName, missions, onComplete, onAllComplete, singleMode }: ExplorerChallengeProps) {
  const [localMissions, setLocalMissions] = useState(missions);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationXp, setCelebrationXp] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const completedCount = localMissions.filter(m => m.completed).length;
  const activeIndex = localMissions.findIndex(m => !m.completed && !m.skipped);

  const handleComplete: ExplorerChallengeProps["onComplete"] = async (sid, missionIndex, payload) => {
    const apiPayload: Record<string, unknown> = { missionIndex };
    if (payload.skipped) {
      apiPayload.skipped = true;
    } else if (payload.selectedOption !== undefined && payload.selectedOption !== null) {
      apiPayload.selectedOption = payload.selectedOption;
    } else if (payload.textResponse) {
      apiPayload.textResponse = payload.textResponse;
    } else if (payload.photoUrl) {
      apiPayload.photoUrl = payload.photoUrl;
    }

    const result = await onComplete(sid, missionIndex, payload);
    if (result.success || result.skipped) {
      // How long to show the current card's result state before advancing.
      // Correct answers: 1.2 s so the kid sees the "Correct! 🎉" celebration.
      // Skips / wrong-max: advance immediately (skip card handles its own delay).
      const advanceDelay = result.isCorrect && !result.allComplete ? 1200 : 0;

      setTimeout(() => {
        setLocalMissions(prev => {
          const updated = [...prev];
          if (payload.skipped || result.skipped) {
            updated[missionIndex] = { ...updated[missionIndex], skipped: true };
          } else if (result.isCorrect) {
            updated[missionIndex] = {
              ...updated[missionIndex],
              completed: true,
              textResponse: payload.textResponse,
              photoUrl: payload.photoUrl,
            };
          }
          return updated;
        });

        if (result.allComplete) {
          setCelebrationXp(result.totalXpEarned);
          setTimeout(() => setShowCelebration(true), 600);
        } else if (result.success || payload.skipped) {
          setTimeout(() => {
            if (scrollRef.current) {
              const nextCard = scrollRef.current.children[missionIndex + 1] as HTMLElement;
              nextCard?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
            }
          }, 400);
        }
      }, advanceDelay);
    }
    return result;
  };

  if (singleMode) {
    const activeMission = activeIndex >= 0 ? localMissions[activeIndex] : null;
    return (
      <div data-testid="explorer-challenge-section-single">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🧭</span>
            <span className="text-sm font-black text-gray-800">Mission {Math.min(activeIndex + 1, localMissions.length)} of {localMissions.length}</span>
          </div>
          <div className="flex gap-1.5">
            {localMissions.map((m, i) => (
              <motion.div
                key={i}
                animate={{ backgroundColor: m.completed ? "#22c55e" : m.skipped ? "#d1d5db" : i === activeIndex ? "#f97316" : "#f3f4f6" }}
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
              >
                {m.completed ? "✓" : m.skipped ? "–" : i + 1}
              </motion.div>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeMission ? (
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
              style={{ width: "100%", maxWidth: "100%", overflow: "hidden", minWidth: 0 }}
            >
              {activeMission.type === "knowledge" && (
                <KnowledgeMissionCard mission={activeMission} missionIndex={activeIndex} stopId={stopId} onComplete={handleComplete} />
              )}
              {activeMission.type === "observation" && (
                <ObservationMissionCard mission={activeMission} missionIndex={activeIndex} stopId={stopId} onComplete={handleComplete} />
              )}
              {activeMission.type === "photo" && (
                <PhotoMissionCard mission={activeMission} missionIndex={activeIndex} stopId={stopId} onComplete={handleComplete} />
              )}
            </motion.div>
          ) : (
            <motion.div
              key="all-done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <div className="text-5xl mb-3">🎯</div>
              <p className="font-black text-orange-900 text-lg">All missions done!</p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showCelebration && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6"
              onClick={() => { setShowCelebration(false); onAllComplete?.(); }}
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="bg-white rounded-3xl p-8 max-w-xs w-full text-center shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 1 }} className="text-6xl mb-4 inline-block">🧭</motion.div>
                <h2 className="text-xl font-black text-gray-900 mb-1">{stopName}</h2>
                <p className="text-sm text-gray-500 mb-4">Explorer Challenge Complete!</p>
                <div className="flex items-center justify-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-4 py-2 mx-auto w-fit mb-4">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <span className="text-lg font-bold text-amber-700">+{celebrationXp} XP earned</span>
                </div>
                <button
                  onClick={() => { setShowCelebration(false); onAllComplete?.(); }}
                  className="w-full py-3 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-base transition-colors"
                  data-testid="explorer-challenge-close"
                >
                  Continue Adventure! 🎉
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div data-testid="explorer-challenge-section">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🧭</span>
          <h3 className="text-sm font-bold text-gray-900">Explorer Challenge</h3>
        </div>
        <span className="text-xs font-medium text-gray-500">{localMissions.length} Missions • {completedCount} done</span>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-3 -mx-1 px-1 scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {localMissions.map((mission, i) => {
          if (mission.completed) return <CompletedMissionCard key={i} mission={mission} missionIndex={i} />;
          if (mission.skipped) return <SkippedMissionCard key={i} mission={mission} missionIndex={i} />;
          if (i !== activeIndex) return <LockedMissionCard key={i} mission={mission} missionIndex={i} />;

          if (mission.type === "knowledge") {
            return <KnowledgeMissionCard key={i} mission={mission} missionIndex={i} stopId={stopId} onComplete={handleComplete} />;
          }
          if (mission.type === "observation") {
            return <ObservationMissionCard key={i} mission={mission} missionIndex={i} stopId={stopId} onComplete={handleComplete} />;
          }
          if (mission.type === "photo") {
            return <PhotoMissionCard key={i} mission={mission} missionIndex={i} stopId={stopId} onComplete={handleComplete} />;
          }
          return <LockedMissionCard key={i} mission={mission} missionIndex={i} />;
        })}
      </div>

      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6"
            onClick={() => { setShowCelebration(false); onAllComplete?.(); }}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-xs w-full text-center shadow-2xl"
              onClick={e => e.stopPropagation()}
              data-testid="explorer-challenge-complete-modal"
            >
              <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 1, ease: "easeInOut" }} className="text-6xl mb-4 inline-block">
                🧭
              </motion.div>
              <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-xl font-black text-gray-900 mb-1">
                {stopName}
              </motion.h2>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-sm text-gray-500 mb-4">
                Explorer Challenge Complete!
              </motion.p>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6, type: "spring" }}
                className="flex items-center justify-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-4 py-2 mx-auto w-fit mb-4"
              >
                <Zap className="w-5 h-5 text-amber-500" />
                <span className="text-lg font-bold text-amber-700">+{celebrationXp} XP earned</span>
              </motion.div>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="text-sm text-gray-500 mb-5">
                {completedCount === localMissions.length
                  ? "Perfect score! You got every mission right!"
                  : `You completed ${completedCount} of ${localMissions.length} missions!`}
              </motion.p>
              <button
                onClick={() => { setShowCelebration(false); onAllComplete?.(); }}
                className="w-full py-3 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-base transition-colors"
                data-testid="explorer-challenge-close"
              >
                Continue Adventure! 🎉
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
