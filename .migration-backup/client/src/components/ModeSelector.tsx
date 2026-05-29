import { motion } from "framer-motion";
import { Gamepad2, Compass } from "lucide-react";
import { useLocation } from "wouter";
import { setInternalNavToAdventures } from "./GatedTravelMode";

type Mode = "games" | "adventures";

interface ModeSelectorProps {
  currentMode: Mode;
  className?: string;
}

export function ModeSelector({ currentMode, className = "" }: ModeSelectorProps) {
  const [, setLocation] = useLocation();

  const handleModeChange = (mode: Mode) => {
    if (mode === currentMode) return;
    
    if (mode === "adventures") {
      setInternalNavToAdventures(); // Mark as internal navigation for parental gate
      setLocation("/geoadventures");
    } else {
      setLocation("/");
    }
  };

  return (
    <div className={`flex justify-center ${className}`} data-testid="mode-selector">
      <div className="relative bg-gray-200 dark:bg-gray-700 rounded-full p-1 flex gap-1 shadow-inner">
        <motion.div
          className="absolute top-1 bottom-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg"
          initial={false}
          animate={{
            left: currentMode === "games" ? "4px" : "50%",
            width: "calc(50% - 4px)",
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
        
        <button
          onClick={() => handleModeChange("games")}
          className={`relative z-10 flex items-center gap-2 px-4 py-2.5 rounded-full font-semibold text-sm transition-colors ${
            currentMode === "games"
              ? "text-white"
              : "text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
          }`}
          data-testid="mode-games-button"
        >
          <Gamepad2 className="w-4 h-4" />
          <span>GeoGames</span>
        </button>
        
        <button
          onClick={() => handleModeChange("adventures")}
          className={`relative z-10 flex items-center gap-2 px-4 py-2.5 rounded-full font-semibold text-sm transition-colors ${
            currentMode === "adventures"
              ? "text-white"
              : "text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
          }`}
          data-testid="mode-adventures-button"
        >
          <Compass className="w-4 h-4" />
          <span>GeoAdventures</span>
        </button>
      </div>
    </div>
  );
}
