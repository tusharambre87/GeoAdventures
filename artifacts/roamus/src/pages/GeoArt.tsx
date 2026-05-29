import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, Palette, Save, Trash2, RotateCcw, Image, Sparkles, Paintbrush, Stamp, Eraser } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { useExplorer } from "@/lib/explorerContext";

interface CountryFlag {
  country: string;
  flag: string;
  hint: string;
  outlineImage?: string;
}

const COUNTRIES_FOR_FLAGS: CountryFlag[] = [
  // Original 8 with guide lines
  { country: "France", flag: "🇫🇷", hint: "Blue, White, Red (left to right)" },
  { country: "Japan", flag: "🇯🇵", hint: "White background with a red circle in the center" },
  { country: "Germany", flag: "🇩🇪", hint: "Black, Red, Yellow (top to bottom)" },
  { country: "Italy", flag: "🇮🇹", hint: "Green, White, Red (left to right) - like pizza!" },
  { country: "Poland", flag: "🇵🇱", hint: "White on top, Red on bottom" },
  { country: "Ukraine", flag: "🇺🇦", hint: "Blue sky on top, Yellow wheat field on bottom" },
  { country: "Indonesia", flag: "🇮🇩", hint: "Red on top, White on bottom" },
  { country: "Austria", flag: "🇦🇹", hint: "Red, White, Red (top to bottom)" },
  // Europe
  { country: "Spain", flag: "🇪🇸", hint: "Red, Yellow (wide), Red - with coat of arms in yellow" },
  { country: "Portugal", flag: "🇵🇹", hint: "Green on left, Red on right, with emblem" },
  { country: "Netherlands", flag: "🇳🇱", hint: "Red, White, Blue (top to bottom)" },
  { country: "Belgium", flag: "🇧🇪", hint: "Black, Yellow, Red (left to right)" },
  { country: "Switzerland", flag: "🇨🇭", hint: "Red square with white cross in center" },
  { country: "Sweden", flag: "🇸🇪", hint: "Blue with yellow cross" },
  { country: "Norway", flag: "🇳🇴", hint: "Red with blue-white cross" },
  { country: "Denmark", flag: "🇩🇰", hint: "Red with white cross" },
  { country: "Finland", flag: "🇫🇮", hint: "White with blue cross" },
  { country: "Iceland", flag: "🇮🇸", hint: "Blue with red-white cross" },
  { country: "Ireland", flag: "🇮🇪", hint: "Green, White, Orange (left to right)" },
  { country: "United Kingdom", flag: "🇬🇧", hint: "Union Jack - red, white, blue crosses" },
  { country: "Greece", flag: "🇬🇷", hint: "Blue and white stripes with blue corner cross" },
  { country: "Czech Republic", flag: "🇨🇿", hint: "White on top, Red on bottom, Blue triangle left" },
  { country: "Hungary", flag: "🇭🇺", hint: "Red, White, Green (top to bottom)" },
  { country: "Romania", flag: "🇷🇴", hint: "Blue, Yellow, Red (left to right)" },
  { country: "Bulgaria", flag: "🇧🇬", hint: "White, Green, Red (top to bottom)" },
  { country: "Croatia", flag: "🇭🇷", hint: "Red, White, Blue with checkered shield" },
  { country: "Slovenia", flag: "🇸🇮", hint: "White, Blue, Red with mountain emblem" },
  { country: "Slovakia", flag: "🇸🇰", hint: "White, Blue, Red with shield" },
  { country: "Serbia", flag: "🇷🇸", hint: "Red, Blue, White with coat of arms" },
  { country: "Montenegro", flag: "🇲🇪", hint: "Red with gold border and eagle" },
  { country: "Albania", flag: "🇦🇱", hint: "Red with black two-headed eagle" },
  { country: "North Macedonia", flag: "🇲🇰", hint: "Red with yellow sun rays" },
  { country: "Bosnia", flag: "🇧🇦", hint: "Blue with yellow triangle and stars" },
  { country: "Kosovo", flag: "🇽🇰", hint: "Blue with yellow map and stars" },
  { country: "Moldova", flag: "🇲🇩", hint: "Blue, Yellow, Red with eagle emblem" },
  { country: "Belarus", flag: "🇧🇾", hint: "Red and green with white pattern on left" },
  { country: "Lithuania", flag: "🇱🇹", hint: "Yellow, Green, Red (top to bottom)" },
  { country: "Latvia", flag: "🇱🇻", hint: "Dark red with white stripe in middle" },
  { country: "Estonia", flag: "🇪🇪", hint: "Blue, Black, White (top to bottom)" },
  { country: "Russia", flag: "🇷🇺", hint: "White, Blue, Red (top to bottom)" },
  { country: "Luxembourg", flag: "🇱🇺", hint: "Red, White, Light blue (top to bottom)" },
  { country: "Monaco", flag: "🇲🇨", hint: "Red on top, White on bottom" },
  { country: "Malta", flag: "🇲🇹", hint: "White on left, Red on right with cross" },
  { country: "Cyprus", flag: "🇨🇾", hint: "White with orange island shape and olive branches" },
  // Asia
  { country: "China", flag: "🇨🇳", hint: "Red with yellow stars in corner" },
  { country: "South Korea", flag: "🇰🇷", hint: "White with red-blue circle and black symbols" },
  { country: "North Korea", flag: "🇰🇵", hint: "Blue, Red (with star), Blue stripes" },
  { country: "India", flag: "🇮🇳", hint: "Orange, White, Green with blue wheel" },
  { country: "Pakistan", flag: "🇵🇰", hint: "Green with white stripe, crescent and star" },
  { country: "Bangladesh", flag: "🇧🇩", hint: "Green with red circle" },
  { country: "Thailand", flag: "🇹🇭", hint: "Red, White, Blue (wide), White, Red stripes" },
  { country: "Vietnam", flag: "🇻🇳", hint: "Red with yellow star" },
  { country: "Philippines", flag: "🇵🇭", hint: "Blue on top, Red on bottom, White triangle with sun" },
  { country: "Malaysia", flag: "🇲🇾", hint: "Red and white stripes with blue corner" },
  { country: "Singapore", flag: "🇸🇬", hint: "Red on top, White on bottom with crescent and stars" },
  { country: "Myanmar", flag: "🇲🇲", hint: "Yellow, Green, Red with white star" },
  { country: "Cambodia", flag: "🇰🇭", hint: "Blue, Red (wide with temple), Blue" },
  { country: "Laos", flag: "🇱🇦", hint: "Red, Blue (with white circle), Red" },
  { country: "Nepal", flag: "🇳🇵", hint: "Red double-triangle shape with blue border" },
  { country: "Sri Lanka", flag: "🇱🇰", hint: "Yellow lion on maroon with green and orange stripes" },
  { country: "Mongolia", flag: "🇲🇳", hint: "Red, Blue, Red with yellow symbol" },
  { country: "Kazakhstan", flag: "🇰🇿", hint: "Light blue with yellow sun and eagle" },
  { country: "Uzbekistan", flag: "🇺🇿", hint: "Blue, White, Green stripes with crescent" },
  { country: "Turkey", flag: "🇹🇷", hint: "Red with white crescent and star" },
  { country: "Iran", flag: "🇮🇷", hint: "Green, White, Red with emblem" },
  { country: "Iraq", flag: "🇮🇶", hint: "Red, White, Black with green text" },
  { country: "Saudi Arabia", flag: "🇸🇦", hint: "Green with white Arabic text and sword" },
  { country: "UAE", flag: "🇦🇪", hint: "Red bar left, then Green, White, Black" },
  { country: "Israel", flag: "🇮🇱", hint: "White with blue stripes and Star of David" },
  { country: "Jordan", flag: "🇯🇴", hint: "Black, White, Green with red triangle and star" },
  { country: "Lebanon", flag: "🇱🇧", hint: "Red, White (with green tree), Red" },
  { country: "Qatar", flag: "🇶🇦", hint: "White and maroon with zigzag border" },
  { country: "Kuwait", flag: "🇰🇼", hint: "Green, White, Red with black trapezoid" },
  // Africa
  { country: "Egypt", flag: "🇪🇬", hint: "Red, White (with eagle), Black" },
  { country: "South Africa", flag: "🇿🇦", hint: "Colorful Y-shape design with 6 colors" },
  { country: "Nigeria", flag: "🇳🇬", hint: "Green, White, Green (left to right)" },
  { country: "Kenya", flag: "🇰🇪", hint: "Black, Red, Green with warrior shield" },
  { country: "Morocco", flag: "🇲🇦", hint: "Red with green star" },
  { country: "Algeria", flag: "🇩🇿", hint: "Green and white with red crescent and star" },
  { country: "Tunisia", flag: "🇹🇳", hint: "Red with white circle, red crescent and star" },
  { country: "Ethiopia", flag: "🇪🇹", hint: "Green, Yellow, Red with blue circle and star" },
  { country: "Ghana", flag: "🇬🇭", hint: "Red, Yellow (with black star), Green" },
  { country: "Ivory Coast", flag: "🇨🇮", hint: "Orange, White, Green (like Ireland reversed)" },
  { country: "Senegal", flag: "🇸🇳", hint: "Green, Yellow (with star), Red" },
  { country: "Cameroon", flag: "🇨🇲", hint: "Green, Red (with star), Yellow" },
  { country: "Tanzania", flag: "🇹🇿", hint: "Green, Yellow, Black diagonal with blue corners" },
  { country: "Uganda", flag: "🇺🇬", hint: "Black, Yellow, Red stripes with crane" },
  { country: "Rwanda", flag: "🇷🇼", hint: "Blue, Yellow, Green with sun" },
  // Americas
  { country: "United States", flag: "🇺🇸", hint: "Red and white stripes with blue corner and stars" },
  { country: "Canada", flag: "🇨🇦", hint: "Red, White (with maple leaf), Red" },
  { country: "Mexico", flag: "🇲🇽", hint: "Green, White (with eagle), Red" },
  { country: "Brazil", flag: "🇧🇷", hint: "Green with yellow diamond and blue circle" },
  { country: "Argentina", flag: "🇦🇷", hint: "Light blue, White (with sun), Light blue" },
  { country: "Chile", flag: "🇨🇱", hint: "White on top, Red on bottom, Blue square with star" },
  { country: "Colombia", flag: "🇨🇴", hint: "Yellow (wide), Blue, Red" },
  { country: "Peru", flag: "🇵🇪", hint: "Red, White, Red (left to right)" },
  { country: "Venezuela", flag: "🇻🇪", hint: "Yellow, Blue (with stars), Red" },
  { country: "Ecuador", flag: "🇪🇨", hint: "Yellow (wide), Blue, Red with emblem" },
  { country: "Bolivia", flag: "🇧🇴", hint: "Red, Yellow, Green (top to bottom)" },
  { country: "Paraguay", flag: "🇵🇾", hint: "Red, White, Blue with emblem" },
  { country: "Uruguay", flag: "🇺🇾", hint: "White and blue stripes with sun in corner" },
  { country: "Cuba", flag: "🇨🇺", hint: "Blue and white stripes with red triangle and star" },
  { country: "Jamaica", flag: "🇯🇲", hint: "Black and green with yellow X cross" },
  { country: "Panama", flag: "🇵🇦", hint: "White and blue quarters with red and blue stars" },
  { country: "Costa Rica", flag: "🇨🇷", hint: "Blue, White, Red (wide), White, Blue" },
  { country: "Guatemala", flag: "🇬🇹", hint: "Blue, White (with emblem), Blue" },
  // Oceania
  { country: "Australia", flag: "🇦🇺", hint: "Blue with Union Jack and stars" },
  { country: "New Zealand", flag: "🇳🇿", hint: "Blue with Union Jack and red stars" },
  { country: "Fiji", flag: "🇫🇯", hint: "Light blue with Union Jack and shield" },
  { country: "Papua New Guinea", flag: "🇵🇬", hint: "Red and black diagonal with bird and stars" },
  { country: "Tonga", flag: "🇹🇴", hint: "Red with white corner and red cross" },
  { country: "Samoa", flag: "🇼🇸", hint: "Red with blue corner and white stars" },
];

const LANDMARK_STAMPS = [
  { id: "eiffel", icon: "🗼", name: "Eiffel Tower" },
  { id: "fuji", icon: "🗻", name: "Mount Fuji" },
  { id: "liberty", icon: "🗽", name: "Statue of Liberty" },
  { id: "pyramid", icon: "🏛️", name: "Pyramid" },
  { id: "castle", icon: "🏰", name: "Castle" },
  { id: "bridge", icon: "🌉", name: "Bridge" },
  { id: "mountain", icon: "⛰️", name: "Mountain" },
  { id: "tree", icon: "🌳", name: "Tree" },
];

const COLORS = [
  "#FF0000", "#00FF00", "#0000FF", "#FFFF00", 
  "#FF00FF", "#00FFFF", "#FFFFFF", "#000000",
  "#FFA500", "#800080", "#008000", "#FFD700",
];

const BRUSH_SIZES = [
  { id: "small", size: 8, label: "Small" },
  { id: "medium", size: 16, label: "Medium" },
  { id: "large", size: 28, label: "Large" },
];

interface PlacedStamp {
  id: string;
  stampId: string;
  icon: string;
  x: number;
  y: number;
  size: number;
}

interface GeoArtStar {
  countryCode: string;
  countryName: string;
  earnedAt: string;
}

export default function GeoArtPage() {
  const [, navigate] = useLocation();
  const geoArtReturnTo = new URLSearchParams(window.location.search).get('from');
  const goHome = () => navigate(geoArtReturnTo || "/");
  const { activeExplorer } = useExplorer();
  const [showReadyConfirm, setShowReadyConfirm] = useState(false);
  const [view, setView] = useState<"menu" | "country-select" | "designer" | "gallery">("menu");
  const [selectedCountry, setSelectedCountry] = useState<typeof COUNTRIES_FOR_FLAGS[0] | null>(null);
  const [placedStamps, setPlacedStamps] = useState<PlacedStamp[]>([]);
  const [selectedStamp, setSelectedStamp] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>("#FF0000");
  const [isErasing, setIsErasing] = useState<boolean>(false);
  const [brushSize, setBrushSize] = useState<number>(16);
  const [stampSize, setStampSize] = useState<number>(30);
  const [tool, setTool] = useState<"brush" | "stamp">("brush");
  const [showSuccess, setShowSuccess] = useState(false);
  const [earnedStars, setEarnedStars] = useState<GeoArtStar[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showBrushCursor, setShowBrushCursor] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [strokeCount, setStrokeCount] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef<ImageData | null>(null);
  
  const MIN_WORK_REQUIRED = 5;
  const hasEnoughWork = strokeCount >= MIN_WORK_REQUIRED || placedStamps.length >= MIN_WORK_REQUIRED;

  const getStorageKey = useCallback(() => {
    const explorerId = activeExplorer?.id || 'guest';
    return `geoquest_geoart_stars_${explorerId}`;
  }, [activeExplorer?.id]);

  useEffect(() => {
    const saved = localStorage.getItem(getStorageKey());
    if (saved) {
      try {
        setEarnedStars(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load stars:', e);
      }
    } else {
      setEarnedStars([]);
    }
  }, [getStorageKey]);

  const saveStars = (stars: GeoArtStar[]) => {
    localStorage.setItem(getStorageKey(), JSON.stringify(stars));
    setEarnedStars(stars);
  };

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedCountry) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#CCCCCC";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    if (selectedCountry.country === "France") {
      ctx.beginPath();
      ctx.moveTo(100, 0);
      ctx.lineTo(100, 200);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(200, 0);
      ctx.lineTo(200, 200);
      ctx.stroke();
    } else if (selectedCountry.country === "Japan") {
      ctx.beginPath();
      ctx.arc(150, 100, 50, 0, Math.PI * 2);
      ctx.stroke();
    } else if (selectedCountry.country === "Germany" || selectedCountry.country === "Austria") {
      ctx.beginPath();
      ctx.moveTo(0, 67);
      ctx.lineTo(300, 67);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 133);
      ctx.lineTo(300, 133);
      ctx.stroke();
    } else if (selectedCountry.country === "Italy") {
      ctx.beginPath();
      ctx.moveTo(100, 0);
      ctx.lineTo(100, 200);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(200, 0);
      ctx.lineTo(200, 200);
      ctx.stroke();
    } else if (selectedCountry.country === "Poland" || selectedCountry.country === "Ukraine" || selectedCountry.country === "Indonesia") {
      ctx.beginPath();
      ctx.moveTo(0, 100);
      ctx.lineTo(300, 100);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(100, 0);
      ctx.lineTo(100, 200);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(200, 0);
      ctx.lineTo(200, 200);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 67);
      ctx.lineTo(300, 67);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 133);
      ctx.lineTo(300, 133);
      ctx.stroke();
    }

    ctx.setLineDash([]);
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    drawingRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
  }, [selectedCountry]);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx || !drawingRef.current) return;

    ctx.putImageData(drawingRef.current, 0, 0);

    placedStamps.forEach(stamp => {
      ctx.font = `${stamp.size}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(stamp.icon, stamp.x, stamp.y);
    });

    ctx.strokeStyle = "#333";
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
  }, [placedStamps]);

  useEffect(() => {
    if (view === "designer" && selectedCountry) {
      initCanvas();
    }
  }, [view, selectedCountry, initCanvas]);

  useEffect(() => {
    redrawCanvas();
  }, [placedStamps, redrawCanvas]);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY
      };
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    }
  };

  const getDrawColor = () => isErasing ? "#FFFFFF" : selectedColor;

  const drawBrush = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = getDrawColor();
    ctx.fill();

    drawingRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
  };

  const drawLine = (x1: number, y1: number, x2: number, y2: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = getDrawColor();
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();

    drawingRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
  };

  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (tool !== "brush") return;
    
    e.preventDefault();
    setIsDrawing(true);
    const coords = getCanvasCoords(e);
    lastPosRef.current = coords;
    drawBrush(coords.x, coords.y);
  };

  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    
    if ('touches' in e) {
      setCursorPos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        setCursorPos({ x: e.clientX, y: e.clientY });
      }
    }

    if (!isDrawing || tool !== "brush") return;
    
    e.preventDefault();
    
    if (lastPosRef.current) {
      drawLine(lastPosRef.current.x, lastPosRef.current.y, coords.x, coords.y);
    }
    lastPosRef.current = coords;
  };

  const handlePointerUp = () => {
    if (isDrawing) {
      setStrokeCount(prev => prev + 1);
    }
    setIsDrawing(false);
    lastPosRef.current = null;
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool !== "stamp" || !selectedStamp) return;

    const coords = getCanvasCoords(e);
    const stampInfo = LANDMARK_STAMPS.find(s => s.id === selectedStamp);
    if (stampInfo) {
      const newStamp: PlacedStamp = {
        id: `stamp-${Date.now()}`,
        stampId: selectedStamp,
        icon: stampInfo.icon,
        x: coords.x,
        y: coords.y,
        size: stampSize,
      };
      setPlacedStamps(prev => [...prev, newStamp]);
    }
  };

  const handleSave = () => {
    if (!selectedCountry) return;
    
    const countryCode = selectedCountry.country.toLowerCase().replace(/\s+/g, '-');
    const alreadyEarned = earnedStars.some(s => s.countryCode === countryCode);
    
    if (!alreadyEarned) {
      const newStar: GeoArtStar = {
        countryCode,
        countryName: selectedCountry.country,
        earnedAt: new Date().toISOString(),
      };
      saveStars([...earnedStars, newStar]);
    }
    
    setShowSuccess(true);
    confetti({
      particleCount: 60,
      spread: 50,
      origin: { y: 0.6 }
    });
  };

  const handleUndo = () => {
    if (placedStamps.length > 0) {
      setPlacedStamps(prev => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    setPlacedStamps([]);
    setStrokeCount(0);
    initCanvas();
  };

  const totalStars = earnedStars.length;

  if (showSuccess) {
    const countryCode = selectedCountry?.country.toLowerCase().replace(/\s+/g, '-') || '';
    const justEarned = !earnedStars.slice(0, -1).some(s => s.countryCode === countryCode);
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-600 via-indigo-600 to-blue-700 p-4 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white/95 dark:bg-gray-800/95 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="text-6xl mb-4"
          >
            🎨
          </motion.div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Beautiful Work!</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            You created art for {selectedCountry?.country}!
          </p>
          
          {justEarned && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/50 dark:to-yellow-900/50 rounded-2xl p-4 mb-4"
            >
              <p className="text-amber-700 dark:text-amber-300 font-bold mb-2">⭐ You earned a Star!</p>
              <div className="text-4xl">⭐</div>
              <p className="text-amber-600 dark:text-amber-400 text-sm mt-2">
                "Amazing creativity! You're becoming a geography artist!"
              </p>
            </motion.div>
          )}
          
          <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-3 mb-4">
            <p className="text-purple-700 dark:text-purple-300 font-bold text-sm">
              Your Geo-Art Stars: {totalStars} ⭐
            </p>
          </div>

          <div className="flex gap-3 justify-center">
            <Button
              onClick={() => {
                setShowSuccess(false);
                setPlacedStamps([]);
                setView("country-select");
              }}
              className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-bold"
            >
              <Palette className="w-4 h-4 mr-2" />
              Create Another
            </Button>
            <Button
              onClick={() => {
                setShowSuccess(false);
                setView("gallery");
              }}
              variant="outline"
              className="border-gray-300 dark:border-gray-600"
            >
              <Image className="w-4 h-4 mr-2" />
              My Stars
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (showReadyConfirm && activeExplorer) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-600 via-indigo-600 to-blue-700 p-4 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white/95 dark:bg-gray-800/95 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-500 flex items-center justify-center"
          >
            <Palette className="w-10 h-10 text-white" />
          </motion.div>
          
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            Ready, {activeExplorer.name}?
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Create beautiful flag art and earn stars!
          </p>
          
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => {
                setShowReadyConfirm(false);
                setView("country-select");
              }}
              className="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600 text-white font-bold py-3"
              data-testid="button-start-geoart"
            >
              <Palette className="w-5 h-5 mr-2" />
              Start Geo-Art
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowReadyConfirm(false)}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              data-testid="button-cancel-ready"
            >
              Back to Menu
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (view === "menu") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-600 via-indigo-600 to-blue-700 p-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              onClick={goHome}
              className="text-white/80 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Home
            </Button>
            <div className="bg-white/20 rounded-full px-4 py-2 text-white font-bold">
              ⭐ {totalStars} Stars
            </div>
          </div>

          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-6xl mb-4"
            >
              🎨
            </motion.div>
            <h1 className="text-3xl font-bold text-white mb-2">Geo-Art Studio</h1>
            <p className="text-purple-200">Be creative! Paint flags your way!</p>
          </div>

          <div className="space-y-4">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (activeExplorer) {
                  setShowReadyConfirm(true);
                } else {
                  setView("country-select");
                }
              }}
              className="bg-white/95 dark:bg-gray-800/95 rounded-2xl p-6 shadow-lg cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-rose-400 to-pink-500 rounded-xl flex items-center justify-center text-3xl">
                  🖌️
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white">Paint a Flag</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">Use your brush to create art!</p>
                </div>
                <Sparkles className="w-6 h-6 text-amber-500" />
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setView("gallery")}
              className="bg-white/95 dark:bg-gray-800/95 rounded-2xl p-6 shadow-lg cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-xl flex items-center justify-center text-3xl">
                  ⭐
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white">My Stars</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">View the stars you've collected!</p>
                </div>
                <Image className="w-6 h-6 text-amber-500" />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  if (view === "country-select") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-600 via-indigo-600 to-blue-700 p-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              onClick={() => setView("menu")}
              className="text-white/80 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </Button>
          </div>

          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">Choose a Country</h1>
            <p className="text-purple-200 text-sm">Pick a flag to paint and earn a star!</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {COUNTRIES_FOR_FLAGS.map((country) => {
              const hasEarned = earnedStars.some(s => s.countryCode === country.country.toLowerCase().replace(/\s+/g, '-'));
              return (
                <motion.div
                  key={country.country}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setSelectedCountry(country);
                    setPlacedStamps([]);
                    setStrokeCount(0);
                    setView("designer");
                  }}
                  className="bg-white/95 dark:bg-gray-800/95 rounded-xl p-4 shadow-lg cursor-pointer text-center relative"
                >
                  {hasEarned && (
                    <div className="absolute top-2 right-2 text-lg">⭐</div>
                  )}
                  <div className="text-4xl mb-2">{country.flag}</div>
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{country.country}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (view === "gallery") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-600 via-indigo-600 to-blue-700 p-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              onClick={() => setView("menu")}
              className="text-white/80 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </Button>
          </div>

          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">⭐ My Stars ⭐</h1>
            <p className="text-purple-200 text-sm">Flags you've painted: {totalStars}</p>
          </div>

          {earnedStars.length === 0 ? (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center">
              <div className="text-5xl mb-4">🎨</div>
              <h3 className="text-xl font-bold text-white mb-2">No stars yet!</h3>
              <p className="text-purple-200 mb-4">Paint your first flag to earn a star.</p>
              <Button
                onClick={() => setView("country-select")}
                className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold"
              >
                <Palette className="w-4 h-4 mr-2" />
                Start Painting
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {earnedStars.map((star, index) => {
                const country = COUNTRIES_FOR_FLAGS.find(c => c.country.toLowerCase().replace(/\s+/g, '-') === star.countryCode);
                return (
                  <motion.div
                    key={star.countryCode}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white/95 dark:bg-gray-800/95 rounded-xl p-4 shadow-lg text-center"
                  >
                    <div className="text-4xl mb-2">{country?.flag || "🏳️"}</div>
                    <div className="text-2xl mb-1">⭐</div>
                    <p className="font-bold text-gray-800 dark:text-white text-sm">{star.countryName}</p>
                    <p className="text-gray-500 dark:text-gray-400 text-xs">
                      {new Date(star.earnedAt).toLocaleDateString()}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-600 via-indigo-600 to-blue-700 p-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            onClick={() => setView("country-select")}
            className="text-white/80 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleUndo}
              disabled={placedStamps.length === 0}
              className="text-white/80 hover:text-white hover:bg-white/10"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClear}
              className="text-white/80 hover:text-white hover:bg-white/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-3xl">{selectedCountry?.flag}</span>
            <h1 className="text-xl font-bold text-white">{selectedCountry?.country}</h1>
          </div>
          <p className="text-purple-200 text-sm">
            {tool === "brush" ? "Click and drag to paint!" : "Tap to place stamps!"}
          </p>
        </div>

        <div className="bg-amber-100 dark:bg-amber-900/50 rounded-xl p-3 mb-4 text-center">
          <p className="text-amber-800 dark:text-amber-200 text-sm font-medium">
            💡 Hint: {selectedCountry?.hint}
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-4 relative">
          <canvas
            ref={canvasRef}
            width={300}
            height={200}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
            onClick={handleCanvasClick}
            onMouseEnter={() => tool === "brush" && setShowBrushCursor(true)}
            className="w-full rounded-xl shadow-lg mx-auto block bg-white select-none"
            style={{ 
              maxWidth: '300px', 
              touchAction: 'none',
              cursor: tool === "brush" ? 'none' : 'pointer'
            }}
          />
          
          {tool === "brush" && showBrushCursor && (
            <div
              className="pointer-events-none fixed z-50 rounded-full border-2 border-gray-800 shadow-lg"
              style={{
                left: cursorPos.x - brushSize / 2,
                top: cursorPos.y - brushSize / 2,
                width: brushSize,
                height: brushSize,
                backgroundColor: isErasing ? "#FFFFFF" : selectedColor,
                transform: 'translate(0, 0)',
              }}
            />
          )}
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-4">
          <div className="flex gap-2 mb-3">
            <Button
              size="sm"
              onClick={() => {
                setTool("brush");
                setShowBrushCursor(true);
              }}
              className={cn(
                "flex-1 font-bold",
                tool === "brush" 
                  ? "bg-white text-purple-700" 
                  : "bg-white/20 text-white hover:bg-white/30"
              )}
            >
              <Paintbrush className="w-4 h-4 mr-2" />
              Paint
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setTool("stamp");
                setShowBrushCursor(false);
              }}
              className={cn(
                "flex-1 font-bold",
                tool === "stamp" 
                  ? "bg-white text-purple-700" 
                  : "bg-white/20 text-white hover:bg-white/30"
              )}
            >
              <Stamp className="w-4 h-4 mr-2" />
              Stamps
            </Button>
          </div>

          {tool === "brush" && (
            <>
              <p className="text-white/80 text-xs font-bold uppercase tracking-wider mb-2">Colors</p>
              <div className="flex flex-wrap gap-2 justify-center mb-4">
                {COLORS.map((color) => (
                  <motion.button
                    key={color}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      setSelectedColor(color);
                      setIsErasing(false);
                    }}
                    className={cn(
                      "w-9 h-9 rounded-full transition-all border-2",
                      selectedColor === color && !isErasing
                        ? "ring-2 ring-yellow-400 ring-offset-2 ring-offset-transparent scale-110"
                        : "border-white/30 hover:scale-105"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsErasing(true)}
                  className={cn(
                    "w-9 h-9 rounded-full transition-all border-2 flex items-center justify-center bg-white",
                    isErasing
                      ? "ring-2 ring-yellow-400 ring-offset-2 ring-offset-transparent scale-110"
                      : "border-white/30 hover:scale-105"
                  )}
                  title="Eraser"
                >
                  <Eraser className="w-5 h-5 text-gray-600" />
                </motion.button>
              </div>
              
              <p className="text-white/80 text-xs font-bold uppercase tracking-wider mb-2">Brush Size</p>
              <div className="flex gap-2 justify-center">
                {BRUSH_SIZES.map((size) => (
                  <motion.button
                    key={size.id}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setBrushSize(size.size)}
                    className={cn(
                      "flex flex-col items-center justify-center p-2 rounded-xl transition-all min-w-[60px]",
                      brushSize === size.size
                        ? "bg-white text-purple-700 shadow-lg"
                        : "bg-white/20 text-white hover:bg-white/30"
                    )}
                  >
                    <div 
                      className="rounded-full mb-1"
                      style={{ 
                        width: size.size, 
                        height: size.size, 
                        backgroundColor: brushSize === size.size ? "#7c3aed" : "white"
                      }}
                    />
                    <span className="text-xs font-bold">{size.label}</span>
                  </motion.button>
                ))}
              </div>
            </>
          )}

          {tool === "stamp" && (
            <>
              <p className="text-white/80 text-xs font-bold uppercase tracking-wider mb-2">Landmark Stamps</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {LANDMARK_STAMPS.map((stamp) => (
                  <motion.button
                    key={stamp.id}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSelectedStamp(stamp.id)}
                    className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all",
                      selectedStamp === stamp.id
                        ? "bg-white shadow-lg ring-2 ring-yellow-400"
                        : "bg-white/20 hover:bg-white/30"
                    )}
                    title={stamp.name}
                  >
                    {stamp.icon}
                  </motion.button>
                ))}
              </div>
              
              <div className="mt-3">
                <p className="text-white/80 text-xs font-bold uppercase tracking-wider mb-2">Size: {stampSize}px</p>
                <input
                  type="range"
                  min="20"
                  max="50"
                  value={stampSize}
                  onChange={(e) => setStampSize(Number(e.target.value))}
                  className="w-full accent-yellow-400"
                />
              </div>
            </>
          )}
        </div>

        {hasEnoughWork ? (
          <Button
            onClick={handleSave}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-6 text-lg"
          >
            <Save className="w-5 h-5 mr-2" />
            Done - Earn a Star! ⭐
          </Button>
        ) : (
          <div className="w-full bg-white/20 rounded-xl py-4 px-6 text-center">
            <p className="text-white/80 text-sm font-medium">
              🎨 Keep painting! {strokeCount + placedStamps.length}/{MIN_WORK_REQUIRED} strokes
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
