import { useState, useRef, useCallback, useEffect, useLayoutEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Trophy, ArrowLeft, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";
import type { MapPuzzleRegion } from "@shared/schema";
import { US_STATES, US_MAP_VIEWBOX, type USState } from "@/data/usStatesMapData";


interface MapPuzzleProps {
  puzzleId: string;
  puzzleName: string;
  viewBox: string;
  backgroundColor: string;
  regions: MapPuzzleRegion[];
  starsReward: number;
  explorerId?: string;
  outlinePath?: string;
  onComplete?: (starsAwarded: number) => void;
  onBack?: () => void;
}

interface DragState {
  isDragging: boolean;
  regionId: string | null;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

function computePathCenters(paths: string[]): Map<string, { cx: number; cy: number }> {
  const centers = new Map<string, { cx: number; cy: number }>();
  if (typeof document === 'undefined') return centers;
  
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 959 593");
  svg.style.cssText = "position:absolute;visibility:hidden;width:0;height:0";
  document.body.appendChild(svg);
  
  const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
  svg.appendChild(pathEl);
  
  for (const d of paths) {
    try {
      pathEl.setAttribute("d", d);
      const bbox = pathEl.getBBox();
      centers.set(d, { cx: bbox.x + bbox.width / 2, cy: bbox.y + bbox.height / 2 });
    } catch {
      centers.set(d, { cx: 0, cy: 0 });
    }
  }
  
  document.body.removeChild(svg);
  return centers;
}

export function MapPuzzle({
  puzzleId,
  puzzleName,
  viewBox,
  backgroundColor,
  regions,
  starsReward,
  explorerId,
  outlinePath,
  onComplete,
  onBack,
}: MapPuzzleProps) {
  const [placedRegions, setPlacedRegions] = useState<Set<string>>(new Set());
  const [revealedRegions, setRevealedRegions] = useState<Map<string, MapPuzzleRegion>>(new Map());
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    regionId: null,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });
  const [isCompleted, setIsCompleted] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [selectedFact, setSelectedFact] = useState<MapPuzzleRegion | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [shuffledRegions, setShuffledRegions] = useState<MapPuzzleRegion[]>([]);
  const [stateCenters, setStateCenters] = useState<Map<string, { cx: number; cy: number }>>(new Map());
  
  const isUSAPuzzle = puzzleName.toLowerCase().includes('usa') || 
                      puzzleName.toLowerCase().includes('united states') ||
                      puzzleId.toLowerCase().includes('usa');

  // For USA puzzles: compute bounding boxes and centers for all 50 states
  const [stateBboxes, setStateBboxes] = useState<Map<string, { x: number; y: number; width: number; height: number }>>(new Map());
  
  useLayoutEffect(() => {
    if (isUSAPuzzle && stateCenters.size === 0) {
      const paths = US_STATES.map(s => s.svgPath);
      const centers = computePathCenters(paths);
      setStateCenters(centers);
      
      // Compute bboxes for proper positioning
      if (typeof document !== 'undefined') {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 959 593");
        svg.style.cssText = "position:absolute;visibility:hidden;width:0;height:0";
        document.body.appendChild(svg);
        const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
        svg.appendChild(pathEl);
        
        const bboxes = new Map<string, { x: number; y: number; width: number; height: number }>();
        for (const state of US_STATES) {
          try {
            pathEl.setAttribute("d", state.svgPath);
            const bbox = pathEl.getBBox();
            bboxes.set(state.code, { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height });
          } catch {
            bboxes.set(state.code, { x: 0, y: 0, width: 50, height: 40 });
          }
        }
        document.body.removeChild(svg);
        setStateBboxes(bboxes);
      }
    }
  }, [isUSAPuzzle, stateCenters.size]);

  // Convert US_STATES to MapPuzzleRegion format for USA puzzles (all 50 states)
  const effectiveRegions = useMemo(() => {
    if (isUSAPuzzle && stateBboxes.size > 0) {
      return US_STATES.map((state, index): MapPuzzleRegion => {
        const bbox = stateBboxes.get(state.code) || { x: 0, y: 0, width: 50, height: 40 };
        return {
          id: `region-usa-${state.code}`,
          mapPuzzleId: puzzleId,
          regionName: state.name,
          regionCode: state.code,
          svgPath: state.svgPath,
          targetX: bbox.x,
          targetY: bbox.y,
          width: bbox.width,
          height: bbox.height,
          fillColor: state.fillColor,
          strokeColor: '#1e3a5f',
          capital: state.capital,
          funFact: state.funFact,
          displayOrder: index,
        };
      });
    }
    return regions;
  }, [isUSAPuzzle, stateBboxes, regions, puzzleId]);

  useEffect(() => {
    console.log("[MapPuzzle] Effective regions:", effectiveRegions?.length);
    if (effectiveRegions && effectiveRegions.length > 0) {
      const shuffled = [...effectiveRegions].sort(() => Math.random() - 0.5);
      console.log("[MapPuzzle] Setting shuffled regions:", shuffled.length);
      setShuffledRegions(shuffled);
    }
  }, [effectiveRegions]);

  const unplacedRegions = shuffledRegions.filter(
    (r) => !placedRegions.has(r.id)
  );

  const getMousePosition = useCallback((e: MouseEvent | TouchEvent) => {
    const point = "touches" in e ? e.touches[0] : e;
    return { x: point.clientX, y: point.clientY };
  }, []);

  const handleDragStart = useCallback(
    (regionId: string, e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      const point = "touches" in e ? e.touches[0] : e;
      setDragState({
        isDragging: true,
        regionId,
        startX: point.clientX,
        startY: point.clientY,
        currentX: point.clientX,
        currentY: point.clientY,
      });
    },
    []
  );

  const handleDragMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!dragState.isDragging) return;
      e.preventDefault();
      const pos = getMousePosition(e);
      setDragState((prev) => ({
        ...prev,
        currentX: pos.x,
        currentY: pos.y,
      }));
    },
    [dragState.isDragging, getMousePosition]
  );

  const handleDragEnd = useCallback(() => {
    if (!dragState.isDragging || !dragState.regionId) {
      setDragState({
        isDragging: false,
        regionId: null,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
      });
      return;
    }

    const region = effectiveRegions.find((r) => r.id === dragState.regionId);
    if (!region || !svgRef.current) {
      setDragState({
        isDragging: false,
        regionId: null,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
      });
      return;
    }

    const svgRect = svgRef.current.getBoundingClientRect();
    const usedViewBox = isUSAPuzzle ? US_MAP_VIEWBOX : viewBox;
    const viewBoxValues = usedViewBox.split(" ").map(Number);
    const [, , vbWidth, vbHeight] = viewBoxValues;

    const scaleX = vbWidth / svgRect.width;
    const scaleY = vbHeight / svgRect.height;

    const dropX = (dragState.currentX - svgRect.left) * scaleX;
    const dropY = (dragState.currentY - svgRect.top) * scaleY;

    const targetCenterX = region.targetX + region.width / 2;
    const targetCenterY = region.targetY + region.height / 2;
    // Use a minimum tolerance of 40 pixels so small states are easier to place
    const baseTolerance = Math.max(region.width, region.height) * 0.6;
    const tolerance = Math.max(baseTolerance, 40);

    const distance = Math.sqrt(
      Math.pow(dropX - targetCenterX, 2) + Math.pow(dropY - targetCenterY, 2)
    );

    if (distance <= tolerance) {
      const newPlaced = new Set(placedRegions);
      newPlaced.add(region.id);
      setPlacedRegions(newPlaced);

      const newRevealed = new Map(revealedRegions);
      newRevealed.set(region.id, region);
      setRevealedRegions(newRevealed);

      const audio = new Audio("/sounds/correct.mp3");
      audio.volume = 0.3;
      audio.play().catch(() => {});

      setSelectedFact(region);
      
      setTimeout(() => {
        if ("speechSynthesis" in window) {
          const utterance = new SpeechSynthesisUtterance(
            `${region.regionName}${region.capital ? `. Capital: ${region.capital}` : ""}${region.funFact ? `. ${region.funFact}` : ""}`
          );
          utterance.rate = 0.9;
          utterance.pitch = 1.1;
          window.speechSynthesis.speak(utterance);
        }
      }, 500);

      if (newPlaced.size === effectiveRegions.length) {
        setTimeout(() => {
          setIsCompleted(true);
          setShowCelebration(true);
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
            colors: ["#FF6B6B", "#4ECDC4", "#FFE66D", "#95E1D3"],
          });
          onComplete?.(starsReward);
        }, 500);
      }
    } else {
      const audio = new Audio("/sounds/wrong.mp3");
      audio.volume = 0.2;
      audio.play().catch(() => {});
    }

    setDragState({
      isDragging: false,
      regionId: null,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
    });
  }, [
    dragState,
    effectiveRegions,
    viewBox,
    placedRegions,
    revealedRegions,
    starsReward,
    onComplete,
    isUSAPuzzle,
  ]);

  useEffect(() => {
    if (dragState.isDragging) {
      window.addEventListener("mousemove", handleDragMove);
      window.addEventListener("mouseup", handleDragEnd);
      window.addEventListener("touchmove", handleDragMove, { passive: false });
      window.addEventListener("touchend", handleDragEnd);

      return () => {
        window.removeEventListener("mousemove", handleDragMove);
        window.removeEventListener("mouseup", handleDragEnd);
        window.removeEventListener("touchmove", handleDragMove);
        window.removeEventListener("touchend", handleDragEnd);
      };
    }
  }, [dragState.isDragging, handleDragMove, handleDragEnd]);

  const speakText = (text: string) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full w-full overflow-hidden"
      style={{ touchAction: "none" }}
    >
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-white hover:bg-white/20"
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5 mr-1" />
          Back
        </Button>
        <h2 className="text-lg font-bold" data-testid="text-puzzle-title">
          {puzzleName} Map Puzzle
        </h2>
        <div className="flex items-center gap-1">
          <Star className="w-5 h-5 text-yellow-300 fill-yellow-300" />
          <span className="font-bold" data-testid="text-progress">
            {placedRegions.size}/{effectiveRegions.length}
          </span>
        </div>
      </div>

      {/* Pieces Tray - At TOP like reference apps */}
      {isUSAPuzzle && unplacedRegions.length > 0 && (
        <div className="bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 border-b border-slate-300 dark:border-slate-600">
          <p className="text-xs text-center text-slate-500 dark:text-slate-400 pt-2 font-medium">
            Drag pieces to the map
          </p>
          <div className="flex flex-wrap justify-center gap-1 p-2 max-h-[180px] overflow-y-auto" style={{ touchAction: "pan-y" }}>
            {unplacedRegions.map((region) => {
              const stateData = US_STATES.find(s => s.code === region.regionCode);
              return (
                <motion.div
                  key={region.id}
                  className="cursor-grab active:cursor-grabbing select-none"
                  style={{ touchAction: "none" }}
                  whileHover={{ scale: 1.08, zIndex: 10 }}
                  whileTap={{ scale: 0.95 }}
                  onMouseDown={(e) => handleDragStart(region.id, e)}
                  onTouchStart={(e) => handleDragStart(region.id, e)}
                  data-testid={`piece-${region.regionCode}`}
                >
                  <div className="relative flex flex-col items-center">
                    <svg
                      viewBox={`${region.targetX - 8} ${region.targetY - 8} ${Math.max(region.width + 16, 30)} ${Math.max(region.height + 16, 25)}`}
                      className="w-16 h-12"
                      style={{ filter: "drop-shadow(2px 2px 3px rgba(0,0,0,0.25))" }}
                    >
                      <path
                        d={region.svgPath}
                        fill={stateData?.fillColor || region.fillColor || "#4FC3F7"}
                        stroke="#1e3a5f"
                        strokeWidth={1.5}
                      />
                    </svg>
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 mt-0.5">
                      {region.regionCode}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      <div
        className="flex-1 flex flex-col md:flex-row gap-3 p-3 overflow-hidden"
        style={{ backgroundColor }}
      >
        <div className="flex-1 relative bg-white/90 rounded-xl shadow-lg overflow-hidden min-h-[250px]">
          <svg
            ref={svgRef}
            viewBox={isUSAPuzzle ? US_MAP_VIEWBOX : viewBox}
            className="w-full h-full"
            style={{ maxHeight: isUSAPuzzle ? "55vh" : "50vh" }}
            data-testid="svg-map"
          >
            {/* For USA puzzles: render complete connected US map with all 50 states */}
            {isUSAPuzzle ? (
              <>
                {/* Layer 1: Base outline layer - all states with thin dark borders, empty fill */}
                {US_STATES.map((state) => (
                  <path
                    key={`outline-${state.code}`}
                    d={state.svgPath}
                    fill="#ffffff"
                    stroke="#334155"
                    strokeWidth={0.8}
                    className="pointer-events-none"
                    data-testid={`path-outline-${state.code}`}
                  />
                ))}
                
                {/* Layer 2: Placed states overlay - filled with color when correctly placed */}
                {US_STATES.map((state) => {
                  const puzzleRegion = effectiveRegions.find(r => r.regionCode === state.code);
                  const isPlaced = puzzleRegion ? placedRegions.has(puzzleRegion.id) : false;
                  const center = stateCenters.get(state.svgPath) || { cx: 0, cy: 0 };
                  
                  if (!isPlaced) return null;
                  
                  return (
                    <g key={`placed-${state.code}`}>
                      <path
                        d={state.svgPath}
                        fill={state.fillColor}
                        stroke="#1e3a5f"
                        strokeWidth={1.2}
                        className="transition-all duration-300"
                        data-testid={`path-placed-${state.code}`}
                      />
                      <text
                        x={center.cx}
                        y={center.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#1e293b"
                        fontSize="10"
                        fontWeight="bold"
                        className="pointer-events-none select-none"
                        style={{ textShadow: "0 1px 2px rgba(255,255,255,0.9)" }}
                        data-testid={`text-state-name-${state.code}`}
                      >
                        {state.name}
                      </text>
                    </g>
                  );
                })}
              </>
            ) : (
              <>
                {/* For non-USA puzzles: use original rendering logic */}
                {outlinePath && (
                  <path
                    d={outlinePath}
                    fill="#f0f4f8"
                    stroke="#94a3b8"
                    strokeWidth={3}
                    strokeLinejoin="round"
                    data-testid="path-outline"
                  />
                )}
                {regions.map((region) => {
                  const isPlaced = placedRegions.has(region.id);
                  return (
                    <g key={region.id}>
                      <path
                        d={region.svgPath}
                        fill={isPlaced ? region.fillColor || "#4FC3F7" : "#f8fafc"}
                        stroke={isPlaced ? region.strokeColor || "#0288D1" : "#94a3b8"}
                        strokeWidth={2}
                        strokeDasharray={isPlaced ? "none" : "5,3"}
                        className="transition-all duration-300"
                        data-testid={`path-region-${region.regionCode}`}
                      />
                      {isPlaced && (
                        <text
                          x={region.targetX + region.width / 2}
                          y={region.targetY + region.height / 2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="#1A237E"
                          fontSize="12"
                          fontWeight="bold"
                          className="pointer-events-none select-none"
                          style={{ textShadow: "0 1px 2px rgba(255,255,255,0.8)" }}
                          data-testid={`text-region-name-${region.regionCode}`}
                        >
                          {region.regionName}
                        </text>
                      )}
                    </g>
                  );
                })}
              </>
            )}
          </svg>

          {selectedFact && !isCompleted && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-2 left-2 right-2 bg-white/95 rounded-lg p-3 shadow-lg border-l-4"
              style={{ borderLeftColor: selectedFact.fillColor || "#4FC3F7" }}
            >
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800">
                      {selectedFact.regionName}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => speakText(`${selectedFact.regionName}. ${selectedFact.funFact || ""}`)}
                      data-testid="button-speak-fact"
                    >
                      <Volume2 className="w-4 h-4" />
                    </Button>
                  </div>
                  {selectedFact.capital && (
                    <p className="text-xs text-gray-600">
                      Capital: {selectedFact.capital}
                    </p>
                  )}
                  {selectedFact.funFact && (
                    <p className="text-sm text-gray-700 mt-1">
                      {selectedFact.funFact}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFact(null)}
                  className="h-6 w-6 p-0"
                  data-testid="button-close-fact"
                >
                  ×
                </Button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Side tray for non-USA puzzles only */}
        {!isUSAPuzzle && (
          <div className="flex flex-col gap-2 md:w-48">
            <h3 className="text-sm font-semibold text-gray-700 px-2">
              Drag pieces to the map:
            </h3>
            <div className="flex flex-wrap md:flex-col gap-2 p-2 bg-white/60 rounded-xl max-h-[200px] md:max-h-[400px] overflow-auto">
              {unplacedRegions.map((region) => (
                <motion.div
                  key={region.id}
                  className="cursor-grab active:cursor-grabbing"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onMouseDown={(e) => handleDragStart(region.id, e)}
                  onTouchStart={(e) => handleDragStart(region.id, e)}
                  data-testid={`piece-${region.regionCode}`}
                >
                  <svg
                    viewBox={`${region.targetX - 5} ${region.targetY - 5} ${region.width + 10} ${region.height + 10}`}
                    className="w-16 h-12 md:w-full md:h-16"
                    style={{ filter: "drop-shadow(2px 2px 4px rgba(0,0,0,0.3))" }}
                  >
                    <path
                      d={region.svgPath}
                      fill={region.fillColor || "#4FC3F7"}
                      stroke={region.strokeColor || "#0288D1"}
                      strokeWidth={2}
                    />
                  </svg>
                </motion.div>
              ))}
              {unplacedRegions.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  All pieces placed!
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {dragState.isDragging && dragState.regionId && (
        <motion.div
          className="fixed pointer-events-none z-50"
          style={{
            left: dragState.currentX - 40,
            top: dragState.currentY - 30,
            transform: "translate(-50%, -50%)",
          }}
          initial={{ scale: 1.2, opacity: 0.8 }}
          animate={{ scale: 1.3, opacity: 0.9 }}
        >
          {(() => {
            const region = effectiveRegions.find((r) => r.id === dragState.regionId);
            if (!region) return null;
            const stateData = isUSAPuzzle ? US_STATES.find(s => s.code === region.regionCode) : null;
            return (
              <div className="flex flex-col items-center">
                <svg
                  viewBox={`${region.targetX - 10} ${region.targetY - 10} ${Math.max(region.width + 20, 40)} ${Math.max(region.height + 20, 35)}`}
                  className="w-24 h-18"
                  style={{ filter: "drop-shadow(4px 4px 8px rgba(0,0,0,0.4))" }}
                >
                  <path
                    d={region.svgPath}
                    fill={stateData?.fillColor || region.fillColor || "#4FC3F7"}
                    stroke="#1e3a5f"
                    strokeWidth={2}
                  />
                </svg>
                {isUSAPuzzle && (
                  <span className="text-sm font-bold text-white mt-1 bg-slate-800/70 px-2 py-0.5 rounded">
                    {region.regionCode}
                  </span>
                )}
              </div>
            );
          })()}
        </motion.div>
      )}

      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl p-8 max-w-sm mx-4 text-center shadow-2xl"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Trophy className="w-20 h-20 mx-auto text-yellow-500 mb-4" />
              </motion.div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Puzzle Complete!
              </h2>
              <p className="text-gray-600 mb-4">
                You learned all {effectiveRegions.length} regions!
              </p>
              <div className="flex items-center justify-center gap-2 mb-6">
                <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
                <span className="text-3xl font-bold text-yellow-600">
                  +{starsReward}
                </span>
              </div>
              <Button
                onClick={onBack}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                data-testid="button-finish"
              >
                Continue Exploring!
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
