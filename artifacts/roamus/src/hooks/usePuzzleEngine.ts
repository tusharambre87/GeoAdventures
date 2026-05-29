import { useState, useCallback, useRef, useEffect } from "react";
import type { GeoRelicPuzzle, GeoRelicPuzzlePiece } from "@shared/schema";

export interface PuzzlePieceState {
  id: string;
  pieceIndex: number;
  currentX: number;
  currentY: number;
  targetX: number;
  targetY: number;
  width: number;
  height: number;
  imageUrl: string;
  isPlaced: boolean;
  isDragging: boolean;
  zIndex: number;
}

export interface PuzzleEngineState {
  pieces: PuzzlePieceState[];
  completedPieces: number[];
  isComplete: boolean;
  isDragging: boolean;
  draggedPieceId: string | null;
}

interface UsePuzzleEngineProps {
  puzzle: GeoRelicPuzzle | null;
  pieces: GeoRelicPuzzlePiece[];
  onPiecePlaced?: (pieceIndex: number) => void;
  onComplete?: () => void;
  snapThreshold?: number; // Percentage distance to snap (default: 10)
}

export function usePuzzleEngine({
  puzzle,
  pieces,
  onPiecePlaced,
  onComplete,
  snapThreshold = 12, // 12% tolerance for snapping
}: UsePuzzleEngineProps) {
  const [state, setState] = useState<PuzzleEngineState>({
    pieces: [],
    completedPieces: [],
    isComplete: false,
    isDragging: false,
    draggedPieceId: null,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Initialize pieces with scattered positions
  useEffect(() => {
    if (!puzzle || pieces.length === 0) return;

    const initialPieces: PuzzlePieceState[] = pieces.map((piece, index) => {
      // Scatter pieces around the edges
      const scatterX = piece.initialX ?? (index % 2 === 0 ? 5 + Math.random() * 15 : 80 + Math.random() * 15);
      const scatterY = piece.initialY ?? (10 + (index / pieces.length) * 70 + Math.random() * 10);

      return {
        id: piece.id,
        pieceIndex: piece.pieceIndex,
        currentX: scatterX,
        currentY: scatterY,
        targetX: piece.targetX,
        targetY: piece.targetY,
        width: piece.width,
        height: piece.height,
        imageUrl: piece.imageUrl,
        isPlaced: false,
        isDragging: false,
        zIndex: piece.zIndex || index,
      };
    });

    setState({
      pieces: initialPieces,
      completedPieces: [],
      isComplete: false,
      isDragging: false,
      draggedPieceId: null,
    });
  }, [puzzle?.id, pieces]);

  // Play snap sound
  const playSnapSound = useCallback(() => {
    try {
      // Use Web Audio API for a gentle snap sound
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
    } catch (e) {
      // Audio not supported
    }
  }, []);

  // Play completion sound
  const playCompleteSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

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
    } catch (e) {
      // Audio not supported
    }
  }, []);

  // Start dragging a piece
  const startDrag = useCallback((pieceId: string, clientX: number, clientY: number) => {
    setState((prev) => {
      const piece = prev.pieces.find((p) => p.id === pieceId);
      if (!piece || piece.isPlaced) return prev;

      // Bring piece to front
      const maxZ = Math.max(...prev.pieces.map((p) => p.zIndex));

      return {
        ...prev,
        isDragging: true,
        draggedPieceId: pieceId,
        pieces: prev.pieces.map((p) =>
          p.id === pieceId
            ? { ...p, isDragging: true, zIndex: maxZ + 1 }
            : p
        ),
      };
    });
  }, []);

  // Move piece while dragging
  const moveDrag = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return;

    setState((prev) => {
      if (!prev.isDragging || !prev.draggedPieceId) return prev;

      const container = containerRef.current;
      if (!container) return prev;

      const rect = container.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * 100;
      const y = ((clientY - rect.top) / rect.height) * 100;

      return {
        ...prev,
        pieces: prev.pieces.map((p) =>
          p.id === prev.draggedPieceId
            ? { ...p, currentX: Math.max(0, Math.min(100 - p.width, x - p.width / 2)), currentY: Math.max(0, Math.min(100 - p.height, y - p.height / 2)) }
            : p
        ),
      };
    });
  }, []);

  // End dragging - check if snapped
  const endDrag = useCallback(() => {
    setState((prev) => {
      if (!prev.isDragging || !prev.draggedPieceId) return prev;

      const piece = prev.pieces.find((p) => p.id === prev.draggedPieceId);
      if (!piece) return { ...prev, isDragging: false, draggedPieceId: null };

      // Check if close enough to target
      const distX = Math.abs(piece.currentX - piece.targetX);
      const distY = Math.abs(piece.currentY - piece.targetY);
      const shouldSnap = distX < snapThreshold && distY < snapThreshold;

      if (shouldSnap) {
        playSnapSound();
        onPiecePlaced?.(piece.pieceIndex);

        const newCompletedPieces = [...prev.completedPieces, piece.pieceIndex];
        const allComplete = newCompletedPieces.length === prev.pieces.length;

        if (allComplete) {
          setTimeout(() => {
            playCompleteSound();
            onComplete?.();
          }, 300);
        }

        return {
          ...prev,
          isDragging: false,
          draggedPieceId: null,
          completedPieces: newCompletedPieces,
          isComplete: allComplete,
          pieces: prev.pieces.map((p) =>
            p.id === prev.draggedPieceId
              ? { ...p, currentX: p.targetX, currentY: p.targetY, isPlaced: true, isDragging: false }
              : p
          ),
        };
      }

      // Not close enough - just stop dragging
      return {
        ...prev,
        isDragging: false,
        draggedPieceId: null,
        pieces: prev.pieces.map((p) =>
          p.id === prev.draggedPieceId ? { ...p, isDragging: false } : p
        ),
      };
    });
  }, [snapThreshold, playSnapSound, playCompleteSound, onPiecePlaced, onComplete]);

  // Reset puzzle
  const reset = useCallback(() => {
    if (!puzzle || pieces.length === 0) return;

    const initialPieces: PuzzlePieceState[] = pieces.map((piece, index) => {
      const scatterX = piece.initialX ?? (index % 2 === 0 ? 5 + Math.random() * 15 : 80 + Math.random() * 15);
      const scatterY = piece.initialY ?? (10 + (index / pieces.length) * 70 + Math.random() * 10);

      return {
        id: piece.id,
        pieceIndex: piece.pieceIndex,
        currentX: scatterX,
        currentY: scatterY,
        targetX: piece.targetX,
        targetY: piece.targetY,
        width: piece.width,
        height: piece.height,
        imageUrl: piece.imageUrl,
        isPlaced: false,
        isDragging: false,
        zIndex: piece.zIndex || index,
      };
    });

    setState({
      pieces: initialPieces,
      completedPieces: [],
      isComplete: false,
      isDragging: false,
      draggedPieceId: null,
    });
  }, [puzzle, pieces]);

  return {
    state,
    containerRef,
    startDrag,
    moveDrag,
    endDrag,
    reset,
    progress: state.pieces.length > 0 ? (state.completedPieces.length / state.pieces.length) * 100 : 0,
  };
}
