import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { RotateCcw, Star, Volume2, VolumeX, Home } from "lucide-react";
import type { GeoRelicPuzzle as PuzzleType, GeoRelicPuzzlePiece, TravelKeepsake } from "@shared/schema";
import { cn } from "@/lib/utils";

interface GeoRelicPuzzleProps {
  puzzle: PuzzleType;
  pieces: GeoRelicPuzzlePiece[];
  mode: "world" | "travel";
  explorerId: string;
  tripId?: string;
  onComplete: (result: { starsAwarded: number; keepsake?: TravelKeepsake }) => void;
  onClose: () => void;
  geoBuddyMessage?: string;
}

interface PieceState {
  id: string;
  pieceIndex: number;
  imageUrl: string;
  targetX: number;
  targetY: number;
  width: number;
  height: number;
  isPlaced: boolean;
  isDragging: boolean;
}

export function GeoRelicPuzzle({
  puzzle,
  pieces,
  mode,
  explorerId,
  tripId,
  onComplete,
  onClose,
  geoBuddyMessage = "Let's put this together!",
}: GeoRelicPuzzleProps) {
  const [showCompletion, setShowCompletion] = useState(false);
  const [completionData, setCompletionData] = useState<{ starsAwarded: number; keepsake?: TravelKeepsake } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [pieceStates, setPieceStates] = useState<PieceState[]>([]);
  const [draggedPieceId, setDraggedPieceId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  
  const boardRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize pieces when they change
  useEffect(() => {
    if (pieces.length > 0) {
      setPieceStates(pieces.map((piece) => ({
        id: piece.id,
        pieceIndex: piece.pieceIndex,
        imageUrl: piece.imageUrl,
        targetX: piece.targetX,
        targetY: piece.targetY,
        width: piece.width,
        height: piece.height,
        isPlaced: false,
        isDragging: false,
      })));
    }
  }, [pieces]);

  const placedCount = pieceStates.filter(p => p.isPlaced).length;
  const totalPieces = pieceStates.length;
  const progress = totalPieces > 0 ? (placedCount / totalPieces) * 100 : 0;

  const playSnapSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 800;
      oscillator.type = "sine";
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {}
  }, [soundEnabled]);

  const playCompleteSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, i) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = freq;
        oscillator.type = "sine";
        const startTime = audioContext.currentTime + i * 0.1;
        gainNode.gain.setValueAtTime(0.15, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.3);
      });
    } catch (e) {}
  }, [soundEnabled]);

  const handlePuzzleComplete = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    playCompleteSound();

    try {
      const response = await fetch(`/api/puzzles/${puzzle.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ explorerId, tripId }),
      });

      if (response.ok) {
        const data = await response.json();
        setCompletionData({
          starsAwarded: data.starsAwarded || 0,
          keepsake: data.keepsake,
        });
        setShowCompletion(true);
      }
    } catch (error) {
      console.error("Error completing puzzle:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [puzzle.id, explorerId, tripId, isSubmitting, playCompleteSound]);

  // Get coordinates from touch or mouse event
  const getEventCoords = (e: React.TouchEvent | React.MouseEvent | TouchEvent | MouseEvent) => {
    if ('touches' in e && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    if ('changedTouches' in e && e.changedTouches.length > 0) {
      return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    }
    if ('clientX' in e) {
      return { x: e.clientX, y: e.clientY };
    }
    return { x: 0, y: 0 };
  };

  const handleDragStart = useCallback((e: React.TouchEvent | React.MouseEvent, pieceId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const coords = getEventCoords(e);
    setDraggedPieceId(pieceId);
    setDragPosition(coords);
    
    setPieceStates(prev => prev.map(p => 
      p.id === pieceId ? { ...p, isDragging: true } : p
    ));
  }, []);

  const handleDragMove = useCallback((e: React.TouchEvent | React.MouseEvent | TouchEvent | MouseEvent) => {
    if (!draggedPieceId) return;
    e.preventDefault();
    const coords = getEventCoords(e);
    setDragPosition(coords);
  }, [draggedPieceId]);

  const handleDragEnd = useCallback((e?: React.TouchEvent | React.MouseEvent | TouchEvent | MouseEvent) => {
    if (!draggedPieceId || !boardRef.current) {
      setDraggedPieceId(null);
      setPieceStates(prev => prev.map(p => ({ ...p, isDragging: false })));
      return;
    }

    const piece = pieceStates.find(p => p.id === draggedPieceId);
    if (!piece) {
      setDraggedPieceId(null);
      return;
    }

    const boardRect = boardRef.current.getBoundingClientRect();
    const dropX = ((dragPosition.x - boardRect.left) / boardRect.width) * 100;
    const dropY = ((dragPosition.y - boardRect.top) / boardRect.height) * 100;
    
    // Check if close to target (within 20% threshold for easier placement)
    const targetCenterX = piece.targetX + piece.width / 2;
    const targetCenterY = piece.targetY + piece.height / 2;
    const distX = Math.abs(dropX - targetCenterX);
    const distY = Math.abs(dropY - targetCenterY);
    
    if (distX < 20 && distY < 20) {
      playSnapSound();
      
      setPieceStates(prev => {
        const updated = prev.map(p => 
          p.id === draggedPieceId 
            ? { ...p, isPlaced: true, isDragging: false }
            : p
        );
        
        const newPlacedCount = updated.filter(p => p.isPlaced).length;
        if (newPlacedCount === updated.length) {
          setTimeout(handlePuzzleComplete, 500);
        }
        
        return updated;
      });
    } else {
      setPieceStates(prev => prev.map(p => 
        p.id === draggedPieceId ? { ...p, isDragging: false } : p
      ));
    }
    
    setDraggedPieceId(null);
  }, [draggedPieceId, dragPosition, pieceStates, playSnapSound, handlePuzzleComplete]);

  // Add global touch/mouse listeners for drag
  useEffect(() => {
    if (!draggedPieceId) return;

    const handleGlobalMove = (e: TouchEvent | MouseEvent) => {
      handleDragMove(e);
    };

    const handleGlobalEnd = (e: TouchEvent | MouseEvent) => {
      handleDragEnd(e);
    };

    window.addEventListener('touchmove', handleGlobalMove, { passive: false });
    window.addEventListener('mousemove', handleGlobalMove);
    window.addEventListener('touchend', handleGlobalEnd);
    window.addEventListener('mouseup', handleGlobalEnd);

    return () => {
      window.removeEventListener('touchmove', handleGlobalMove);
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('touchend', handleGlobalEnd);
      window.removeEventListener('mouseup', handleGlobalEnd);
    };
  }, [draggedPieceId, handleDragMove, handleDragEnd]);

  const handleReset = useCallback(() => {
    setPieceStates(prev => prev.map(p => ({ ...p, isPlaced: false, isDragging: false })));
  }, []);

  const handleFinish = useCallback(() => {
    if (completionData) {
      onComplete(completionData);
    }
    onClose();
  }, [completionData, onComplete, onClose]);

  const trayPieces = pieceStates.filter(p => !p.isPlaced && !p.isDragging);
  const placedPieces = pieceStates.filter(p => p.isPlaced);
  const draggingPiece = pieceStates.find(p => p.isDragging);

  // Calculate background position for a piece to show only its portion
  const getPieceBackgroundStyle = (piece: PieceState) => {
    const bgPosX = (piece.targetX / (100 - piece.width)) * 100 || 0;
    const bgPosY = (piece.targetY / (100 - piece.height)) * 100 || 0;
    
    return {
      backgroundImage: `url(${piece.imageUrl})`,
      backgroundSize: `${100 / (piece.width / 100)}% ${100 / (piece.height / 100)}%`,
      backgroundPosition: `${bgPosX}% ${bgPosY}%`,
      backgroundRepeat: 'no-repeat',
    };
  };

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-50 bg-gradient-to-b from-sky-200 via-sky-100 to-amber-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700 flex flex-col"
      style={{ touchAction: 'none' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 z-20">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="w-12 h-12 rounded-full bg-sky-500 hover:bg-sky-600 text-white shadow-lg"
          data-testid="button-close-puzzle"
        >
          <Home className="w-6 h-6" />
        </Button>

        <div className="text-center">
          <h2 className="font-bold text-gray-800 dark:text-white">{puzzle.title}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {placedCount}/{totalPieces} pieces placed
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="w-10 h-10 rounded-full bg-white/50 hover:bg-white/70"
            data-testid="button-toggle-sound"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleReset}
            className="w-10 h-10 rounded-full bg-white/50 hover:bg-white/70"
            data-testid="button-reset-puzzle"
          >
            <RotateCcw className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-4 p-4 overflow-hidden">
        {/* GeoBuddy mascot - desktop only */}
        <div className="hidden md:flex flex-col items-center w-36 flex-shrink-0">
          <div className="w-24 h-24 bg-gradient-to-br from-amber-100 to-orange-200 rounded-full flex items-center justify-center shadow-xl border-4 border-amber-300">
            <span className="text-5xl">🧭</span>
          </div>
          <div className="mt-3 bg-white rounded-xl p-3 shadow-lg max-w-[130px]">
            <p className="text-xs text-center text-gray-700 font-medium leading-tight">
              {geoBuddyMessage}
            </p>
          </div>
          {/* Progress */}
          <div className="mt-4 w-full px-2">
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-green-400 to-emerald-500"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </div>

        {/* Puzzle Board */}
        <div 
          ref={boardRef}
          className="relative bg-gradient-to-br from-sky-50 to-sky-100 dark:from-gray-700 dark:to-gray-800 rounded-3xl border-4 border-sky-300 dark:border-sky-600 shadow-2xl overflow-hidden"
          style={{
            width: 'min(80vw, 450px)',
            height: 'min(55vh, 340px)',
          }}
        >
          {/* Silhouette slots for each piece - show faded/grayscale hints */}
          {pieceStates.map((piece) => (
            <div
              key={`slot-${piece.id}`}
              className={cn(
                "absolute rounded-lg overflow-hidden transition-all duration-300",
                piece.isPlaced ? "opacity-0" : "opacity-100"
              )}
              style={{
                left: `${piece.targetX}%`,
                top: `${piece.targetY}%`,
                width: `${piece.width}%`,
                height: `${piece.height}%`,
              }}
            >
              {/* Grayscale silhouette hint */}
              <div 
                className="absolute inset-0 grayscale opacity-40"
                style={getPieceBackgroundStyle(piece)}
              />
              {/* Dashed border overlay */}
              <div className="absolute inset-0 border-2 border-dashed border-sky-400/80 dark:border-sky-500/80 rounded-lg bg-sky-200/30 dark:bg-sky-800/30" />
            </div>
          ))}

          {/* Placed pieces on the board */}
          {placedPieces.map((piece) => (
            <motion.div
              key={`placed-${piece.id}`}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              className="absolute rounded-lg overflow-hidden shadow-md"
              style={{
                left: `${piece.targetX}%`,
                top: `${piece.targetY}%`,
                width: `${piece.width}%`,
                height: `${piece.height}%`,
                ...getPieceBackgroundStyle(piece),
              }}
            >
              <div className="absolute inset-0 border-2 border-green-400 rounded-lg pointer-events-none" />
            </motion.div>
          ))}
        </div>

        {/* Piece Tray - desktop (right side) */}
        <div className="hidden md:flex flex-col gap-3 w-28 max-h-[55vh] overflow-y-auto p-2 bg-amber-100/70 dark:bg-amber-900/40 rounded-2xl">
          <p className="text-xs text-center text-amber-800 dark:text-amber-200 font-medium mb-1">Drag pieces</p>
          {trayPieces.map((piece) => (
            <div
              key={piece.id}
              className="w-20 h-16 mx-auto rounded-xl overflow-hidden shadow-lg border-2 border-white dark:border-gray-600 hover:border-sky-400 hover:scale-105 transition-all cursor-grab active:cursor-grabbing"
              style={{ 
                ...getPieceBackgroundStyle(piece),
                touchAction: 'none',
              }}
              onMouseDown={(e) => handleDragStart(e, piece.id)}
              onTouchStart={(e) => handleDragStart(e, piece.id)}
            />
          ))}
        </div>
      </div>

      {/* Mobile: Piece Tray at bottom */}
      <div className="md:hidden px-4 pb-4">
        <div className="bg-amber-100/80 dark:bg-amber-900/50 rounded-2xl p-3 shadow-lg">
          <p className="text-xs text-amber-800 dark:text-amber-200 font-medium mb-2 text-center">Touch and drag pieces to the puzzle</p>
          <div className="flex gap-3 overflow-x-auto pb-2 justify-center flex-wrap">
            {trayPieces.map((piece) => (
              <div
                key={piece.id}
                className="w-16 h-14 flex-shrink-0 rounded-xl overflow-hidden shadow-lg border-2 border-white dark:border-gray-600 hover:border-sky-400 transition-all cursor-grab active:cursor-grabbing"
                style={{ 
                  ...getPieceBackgroundStyle(piece),
                  touchAction: 'none',
                }}
                onMouseDown={(e) => handleDragStart(e, piece.id)}
                onTouchStart={(e) => handleDragStart(e, piece.id)}
              />
            ))}
          </div>
          {/* Mobile progress */}
          <div className="mt-2">
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Dragging piece overlay */}
      {draggingPiece && (
        <div
          className="fixed pointer-events-none z-[100]"
          style={{
            left: dragPosition.x - 50,
            top: dragPosition.y - 40,
            width: 100,
            height: 80,
          }}
        >
          <motion.div
            initial={{ scale: 1 }}
            animate={{ scale: 1.2 }}
            className="w-full h-full rounded-xl overflow-hidden shadow-2xl border-4 border-sky-400"
            style={getPieceBackgroundStyle(draggingPiece)}
          />
        </div>
      )}

      {/* Completion overlay */}
      <AnimatePresence>
        {showCompletion && completionData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", bounce: 0.5 }}
                className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg"
              >
                <span className="text-5xl">🎉</span>
              </motion.div>

              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Puzzle Complete!
              </h3>

              {puzzle.funFact && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-gray-600 dark:text-gray-400 mb-6 text-lg"
                >
                  {puzzle.funFact}
                </motion.p>
              )}

              <div className="space-y-4 mb-6">
                {mode === "world" && completionData.starsAwarded > 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex items-center justify-center gap-3 bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-xl"
                  >
                    <div className="flex">
                      {[...Array(completionData.starsAwarded)].map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ delay: 0.6 + i * 0.1, type: "spring" }}
                        >
                          <Star className="w-8 h-8 text-yellow-500 fill-yellow-400" />
                        </motion.div>
                      ))}
                    </div>
                    <span className="text-lg font-bold text-yellow-700 dark:text-yellow-300">
                      +{completionData.starsAwarded} Stars!
                    </span>
                  </motion.div>
                )}

                {mode === "travel" && completionData.keepsake && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-purple-50 dark:bg-purple-900/30 p-6 rounded-xl"
                  >
                    <p className="text-sm text-purple-600 dark:text-purple-400 mb-2">
                      You found a Travel Keepsake!
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-4xl">{completionData.keepsake.emoji}</span>
                      <div className="text-left">
                        <p className="font-bold text-purple-800 dark:text-purple-200">
                          {completionData.keepsake.name}
                        </p>
                        <p className="text-sm text-purple-600 dark:text-purple-400">
                          {completionData.keepsake.description}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              <Button
                onClick={handleFinish}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 rounded-xl text-lg"
                data-testid="button-finish-puzzle"
              >
                Continue
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default GeoRelicPuzzle;
