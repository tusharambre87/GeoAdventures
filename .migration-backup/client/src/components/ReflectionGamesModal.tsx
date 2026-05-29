import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, Gamepad2 } from "lucide-react";
import { ReflectionGamesEngine } from "./ReflectionGames";

interface ReflectionGamesModalProps {
  tripId: string;
  explorerId: string;
  onClose: (gamesCompleted?: boolean) => void;
}

export function ReflectionGamesModal({
  tripId,
  explorerId,
  onClose
}: ReflectionGamesModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-gradient-to-b from-amber-900/95 via-orange-900/95 to-red-900/95 overflow-auto"
    >
      <div className="min-h-screen flex flex-col p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-white">
            <Gamepad2 className="w-6 h-6" />
            <h2 className="text-xl font-bold">Memory Games</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onClose(false)}
            className="text-white hover:bg-white/20"
            data-testid="button-close-games"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden">
            <ReflectionGamesEngine
              tripId={tripId}
              explorerId={explorerId}
              sessionType="adventure_recap"
              onComplete={(stars) => {
                onClose(true);
              }}
              onClose={() => onClose(false)}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
