import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useLocation } from "wouter";

const GAMES: { id: string; emoji: string; label: string; route: string }[] = [
  { id: "guess-go",      emoji: "🔮", label: "Guess & Go",    route: "/play" },
  { id: "compass-quest", emoji: "🧭", label: "Compass Quest", route: "/compass-quest" },
  { id: "crossworld",    emoji: "🌍", label: "CrossWorld",    route: "/crossworld" },
  { id: "flags",         emoji: "🚩", label: "Flags",         route: "/geo-atlas" },
  { id: "maps",          emoji: "🗺️",  label: "Maps",          route: "/geo-atlas" },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function KeepThemBusySheet({ open, onClose }: Props) {
  const [, setLocation] = useLocation();

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="busy-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50"
            style={{ zIndex: 9998 }}
            onClick={onClose}
          />
          <motion.div
            key="busy-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 rounded-t-3xl bg-white"
            style={{ zIndex: 9999 }}
            onClick={e => e.stopPropagation()}
            data-testid="keep-them-busy-sheet"
          >
            <div className="px-5 pt-4 pb-8">
              <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-4" />

              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-gray-900">Keep them busy 🎮</h3>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                  data-testid="button-busy-close"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {GAMES.map(g => (
                  <button
                    key={g.id}
                    onClick={() => { onClose(); setLocation(g.route); }}
                    className="flex flex-col items-center gap-1.5 py-3.5 rounded-2xl border border-gray-100 bg-gray-50 hover:bg-orange-50 hover:border-orange-200 active:scale-95 transition-all"
                    data-testid={`button-busy-${g.id}`}
                  >
                    <span className="text-2xl">{g.emoji}</span>
                    <span className="text-[10px] font-bold text-gray-700 leading-tight text-center">{g.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
