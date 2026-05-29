import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";

type ClueStep = "Curiosity" | "Locate" | "Understand" | "Explore";

interface LearningPoint {
  emoji: string;
  text: string;
  clueStep: ClueStep;
}

interface LearningSummaryProps {
  points: LearningPoint[];
  className?: string;
  variant?: "dark" | "light";
}

const GAME_LEARNING_POINTS: Record<string, LearningPoint[]> = {
  "spin-the-world": [
    { emoji: "🗺️", text: "Continent & city recognition", clueStep: "Locate" },
    { emoji: "🧠", text: "Using clues to make predictions", clueStep: "Understand" },
    { emoji: "🌐", text: "Exploring the globe", clueStep: "Curiosity" },
  ],
  "daily-quest": [
    { emoji: "🌆", text: "Learning about a new city", clueStep: "Curiosity" },
    { emoji: "🔍", text: "Following clues step-by-step", clueStep: "Understand" },
    { emoji: "🌟", text: "Daily practice builds knowledge", clueStep: "Explore" },
  ],
  "guess-and-go": [
    { emoji: "🏛️", text: "Recognizing famous landmarks", clueStep: "Locate" },
    { emoji: "📖", text: "Reading and understanding clues", clueStep: "Curiosity" },
    { emoji: "🎯", text: "Making smart predictions", clueStep: "Understand" },
  ],
  "crossworld": [
    { emoji: "✍️", text: "Spelling capital city names", clueStep: "Understand" },
    { emoji: "🗺️", text: "Learning countries & capitals", clueStep: "Locate" },
    { emoji: "🧩", text: "Solving puzzles with patterns", clueStep: "Explore" },
  ],
  "find-my-home": [
    { emoji: "🦁", text: "Discovering animal habitats", clueStep: "Curiosity" },
    { emoji: "🌍", text: "Learning about continents", clueStep: "Locate" },
    { emoji: "🧩", text: "Matching animals to homes", clueStep: "Understand" },
  ],
  "spell-geo": [
    { emoji: "✍️", text: "Spelling state & place names", clueStep: "Understand" },
    { emoji: "🗺️", text: "Learning US geography", clueStep: "Locate" },
    { emoji: "🧠", text: "Building memory skills", clueStep: "Explore" },
  ],
  "memory-match": [
    { emoji: "🧠", text: "Matching cities & landmarks", clueStep: "Understand" },
    { emoji: "🗼", text: "Learning famous landmarks", clueStep: "Locate" },
    { emoji: "💡", text: "Discovering fun facts", clueStep: "Curiosity" },
  ],
  "flag-quiz": [
    { emoji: "🏳️", text: "Recognizing country flags", clueStep: "Locate" },
    { emoji: "🌍", text: "Learning about countries", clueStep: "Curiosity" },
    { emoji: "💡", text: "Using memory tips", clueStep: "Explore" },
  ],
};

export function getGameLearningPoints(gameId: string): LearningPoint[] {
  return GAME_LEARNING_POINTS[gameId] || [];
}

export default function LearningSummary({ points, className = "", variant = "light" }: LearningSummaryProps) {
  if (!points || points.length === 0) return null;

  const isDark = variant === "dark";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className={`w-full rounded-2xl p-4 border ${
        isDark 
          ? "bg-gradient-to-br from-indigo-500/20 to-purple-500/20 backdrop-blur-sm border-indigo-300/30" 
          : "bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200"
      } ${className}`}
    >
      <div className="flex items-center justify-center gap-2 mb-3">
        <BookOpen className={`w-5 h-5 ${isDark ? "text-indigo-300" : "text-indigo-500"}`} />
        <h3 className={`font-bold text-sm ${isDark ? "text-white" : "text-indigo-800"}`}>
          What You Learned Today!
        </h3>
      </div>
      
      <div className="space-y-2">
        {points.map((point, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + index * 0.1 }}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
              isDark ? "bg-white/10" : "bg-white/80 border border-indigo-100"
            }`}
          >
            <span className="text-lg">{point.emoji}</span>
            <div className="flex-1">
              <span className={`text-sm ${isDark ? "text-white" : "text-gray-800"}`}>
                {point.text}
              </span>
              <span className={`text-xs ml-1 ${isDark ? "text-indigo-300" : "text-indigo-500"}`}>
                ({point.clueStep})
              </span>
            </div>
          </motion.div>
        ))}
      </div>
      
      <p className={`text-center text-xs mt-3 ${isDark ? "text-indigo-300/70" : "text-indigo-400"}`}>
        Powered by C.L.U.E.™ Learning
      </p>
    </motion.div>
  );
}
