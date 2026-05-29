import { useState } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import { LocationCard, EventCard, MissionCard } from "@/lib/gameData";
import { MapPin, Plane, Trophy, Star, HelpCircle, Info, Users, Coins, Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCityImage } from "@/lib/cityImages";
import { TTSButton } from "./TTSButton";
import { FlagImage } from "./FlagImage";

interface GameCardProps {
  card: LocationCard | EventCard | MissionCard;
  isRevealed?: boolean;
  isMystery?: boolean; // New prop: If true, shows "Mystery Card" state (hidden back)
  hideBadges?: boolean; // New prop: If true, hides the mission badges
  missionProgress?: {
    playerId: number;
    playerName: string;
    playerColor: string;
    current: number;
    target: number;
  }[];
  onReveal?: () => void;
  className?: string;
}

export function GameCard({ card, isRevealed = false, isMystery = false, hideBadges = false, missionProgress, onReveal, className }: GameCardProps) {
  // --- 3D Tilt Effect Logic ---
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseX = useSpring(x, { stiffness: 500, damping: 100 });
  const mouseY = useSpring(y, { stiffness: 500, damping: 100 });

  const rotateX = useTransform(mouseY, [-0.5, 0.5], ["15deg", "-15deg"]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], ["-15deg", "15deg"]);
  const shineOpacity = useTransform(mouseX, [-0.5, 0.5], [0, 0.3]);

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseXFromCenter = event.clientX - rect.left - width / 2;
    const mouseYFromCenter = event.clientY - rect.top - height / 2;

    x.set(mouseXFromCenter / width);
    y.set(mouseYFromCenter / height);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }
  
  // Location Card Render
  if (card.type === "Location") {
    const c = card as LocationCard;
    
    // Determine colors based on bandColor/Continent
    const getContinentColor = (continent: string) => {
      switch(continent) {
        case "Europe": return "bg-[#9d7ad2] border-[#9d7ad2]"; // Purple
        case "North America": return "bg-[#ef5350] border-[#ef5350]"; // Red
        case "Asia": return "bg-[#fdd835] border-[#fdd835] text-black"; // Yellow
        case "South America": return "bg-[#66bb6a] border-[#66bb6a]"; // Green
        case "Africa": return "bg-[#ff9800] border-[#ff9800]"; // Orange
        case "Oceania": return "bg-[#26c6da] border-[#26c6da]"; // Teal
        default: return "bg-primary border-primary";
      }
    };

    const colorClass = getContinentColor(c.continent);
    const cardImage = getCityImage(c.city, c.continent);

    // If it's a mystery card, we show a generic back without specific continent hints
    if (isMystery) {
      return (
        <div className={cn("relative w-72 h-96", className)}>
           <div className="absolute inset-0 w-full h-full bg-slate-800 rounded-2xl shadow-xl border-4 border-white overflow-hidden flex flex-col text-white">
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 relative overflow-hidden">
                 {/* Pattern */}
                 <div className="absolute inset-0 opacity-10 pointer-events-none">
                   <svg width="100%" height="100%">
                     <pattern id="pattern-circles" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                       <circle cx="10" cy="10" r="2" fill="currentColor" />
                     </pattern>
                     <rect x="0" y="0" width="100%" height="100%" fill="url(#pattern-circles)" />
                   </svg>
                 </div>
                 
                 <Plane className="w-16 h-16 mb-6 opacity-80 animate-pulse text-yellow-400" />
                 <h3 className="text-2xl font-heading mb-2">Mystery Location</h3>
                 <p className="text-sm opacity-80">Choose your challenge level to reveal a clue!</p>
              </div>
              <div className="h-12 bg-black/20 flex items-center justify-center">
                 <span className="text-xs uppercase font-bold tracking-wider">GeoQuest Junior</span>
              </div>
           </div>
        </div>
      );
    }

    return (
      <div 
        className={cn("relative w-72 h-96 perspective-1000", className)} 
        data-testid={`card-location-${c.id}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <motion.div
          className="w-full h-full relative preserve-3d transition-all duration-500"
          style={{
            rotateX: isRevealed ? rotateX : 0, // Only tilt when revealed (front facing)
            rotateY: isRevealed ? rotateY : useTransform(() => 180), // Use manual 180 if not revealed
            transformStyle: "preserve-3d",
          }}
          animate={{ rotateY: isRevealed ? 0 : 180 }} // This handles the FLIP, the style prop handles the TILT
          transition={{ rotateY: { duration: 0.5 } }} // Smooth flip
        >
          {/* FRONT (Revealed - Answer) */}
          <div className="absolute inset-0 w-full h-full backface-hidden bg-white rounded-2xl shadow-xl border-4 border-white overflow-hidden flex flex-col">
            
            {/* Shine Effect */}
            <motion.div 
              className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-tr from-transparent via-white/40 to-transparent"
              style={{ opacity: shineOpacity }}
            />

            {/* Header Band */}
            <div className={cn("h-16 flex flex-col items-center justify-center text-white shadow-sm z-10 relative", colorClass)}>
              <span className="text-xs font-bold uppercase tracking-widest opacity-90">{c.continent}</span>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-heading leading-none mt-1 drop-shadow-md">{c.city}</h2>
                <TTSButton text={c.city} className="text-white hover:bg-white/20 w-6 h-6" size="icon" />
              </div>
              <span className="text-xs font-medium opacity-90">{c.country}</span>
            </div>

            {/* Image Placeholder */}
            <div className={cn("h-32 w-full relative overflow-hidden bg-gray-200")}>
               <img 
                 src={cardImage} 
                 alt={c.continent} 
                 className="w-full h-full object-cover opacity-90"
                 loading="eager"
                 onError={(e) => {
                    // Fallback to generic placeholder if fails
                    e.currentTarget.src = "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400&q=80";
                 }}
               />
               <div className="absolute bottom-2 right-2 flex flex-col items-end gap-1">
                   {!hideBadges && c.badge && (
                     <div className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold shadow-sm text-foreground border border-white/50">
                       {c.badge}
                     </div>
                   )}
                   {/* @ts-ignore - secondaryBadge might not be in types yet but is in data */}
                   {!hideBadges && c.secondaryBadge && (
                       <div className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold shadow-sm text-foreground border border-white/50">
                         {c.secondaryBadge}
                       </div>
                   )}
               </div>
            </div>

            {/* Facts Grid */}
            <div className="grid grid-cols-3 gap-1 p-2 bg-gray-50 border-b border-gray-100 relative h-[52px]">
               <div className="absolute -top-3 right-2 w-10 h-6 shadow-sm rounded overflow-hidden border border-white z-20">
                   {/* @ts-ignore - flagUrl is injected dynamically */}
                   <FlagImage src={c.flagUrl} alt={c.country} className="w-full h-full object-cover" countryCode={c.country} />
               </div>
               
               <div className="flex flex-col items-center text-center">
                  <Users className="w-4 h-4 text-blue-500 mb-1" />
                  <span className="text-[10px] text-gray-500 leading-none">Pop.</span>
                  <span className="text-[10px] font-bold text-gray-700 leading-tight">{c.population}</span>
               </div>
               <div className="flex flex-col items-center text-center border-l border-r border-gray-200">
                  <Coins className="w-4 h-4 text-yellow-500 mb-1" />
                  <span className="text-[10px] text-gray-500 leading-none">Currency</span>
                  <span className="text-[10px] font-bold text-gray-700 leading-tight">{c.currency}</span>
               </div>
               <div className="flex flex-col items-center text-center">
                  <Languages className="w-4 h-4 text-green-500 mb-1" />
                  <span className="text-[10px] text-gray-500 leading-none">Language</span>
                  <span className="text-[10px] font-bold text-gray-700 leading-tight">{c.language}</span>
               </div>
            </div>

            {/* Did You Know */}
            <div className="flex-1 p-3 bg-card flex flex-col">
               <div className="bg-blue-50 p-2 rounded-lg border border-blue-100 flex-1 mb-1">
                  <h4 className="text-xs font-bold text-blue-600 uppercase mb-1">Did You Know?</h4>
                  <p className="text-xs text-blue-900 italic leading-tight line-clamp-3">
                    {c.didYouKnow}
                  </p>
               </div>
            </div>
          </div>

          {/* BACK (Hidden) - Not really used in new flow as we use Mystery Card, but kept for transition */}
          <div className={cn(
            "absolute inset-0 w-full h-full backface-hidden bg-slate-800 rounded-2xl shadow-xl border-4 border-white overflow-hidden flex flex-col text-white rotate-y-180",
            colorClass 
          )} style={{ transform: "rotateY(180deg)" }}>
             <div className="flex-1 flex items-center justify-center">
                <Plane className="w-12 h-12 opacity-50" />
             </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Event Card Render
  if (card.type === "Event") {
    const c = card as EventCard;
    const isPositive = c.eventType === "Positive";
    
    return (
      <div className={cn("w-72 h-96 bg-green-800 rounded-2xl shadow-xl border-4 border-yellow-600 relative overflow-hidden flex flex-col text-white", className)} data-testid={`card-event-${c.id}`}>
         <div className="absolute inset-0 border-2 border-yellow-500/50 m-2 rounded-xl pointer-events-none" />
         
         <div className="h-24 flex items-center justify-center relative z-10 mt-6">
            <div className={cn("w-20 h-20 rounded-full flex items-center justify-center border-4 border-yellow-500 shadow-lg", isPositive ? "bg-blue-500" : "bg-red-500")}>
               {isPositive ? <Star className="w-10 h-10 text-yellow-300" /> : <HelpCircle className="w-10 h-10 text-white" />}
            </div>
         </div>

         <div className="flex-1 p-6 text-center z-10 flex flex-col">
            <h2 className="text-2xl font-heading text-yellow-400 drop-shadow-sm mb-1">{c.name}</h2>
            <div className="w-full h-0.5 bg-yellow-500/30 my-2" />
            <p className="font-hand text-lg mb-4 leading-tight">{c.description}</p>
            
            <div className="mt-auto bg-black/30 rounded-lg p-3 border border-yellow-500/30">
              <p className="font-bold text-yellow-200 text-sm uppercase tracking-wide">Effect</p>
              <p className="font-medium text-sm">{c.effect}</p>
            </div>
         </div>
      </div>
    );
  }

  // Mission Card Render
  if (card.type === "Mission") {
    const c = card as MissionCard;
    return (
      <div className={cn("w-64 h-40 bg-[#fdf6e3] rounded-xl shadow-md border-2 border-[#d4c5a9] flex flex-col p-4 relative", className)} data-testid={`card-mission-${c.id}`}>
         {/* Parchment texture effect */}
         <div className="absolute top-0 left-0 w-full h-full opacity-50 bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] pointer-events-none" />
         
         <div className="flex justify-between items-start mb-2 relative z-10">
            <h3 className="font-heading text-lg text-amber-900 leading-tight w-2/3">{c.name}</h3>
            <div className="bg-amber-100 text-amber-800 px-2 py-1 rounded-full text-xs font-bold border border-amber-200 shadow-sm">
              {c.reward}
            </div>
         </div>
         
         <p className="text-xs text-amber-900/80 font-medium leading-snug relative z-10 flex-1">
           {c.description}
         </p>
         
         <div className="mt-auto pt-2 border-t border-amber-900/10 flex flex-col items-center w-full">
            {/* Progress Bars */}
            {missionProgress && missionProgress.length > 0 ? (
               <div className="w-full space-y-1 mb-2">
                 {missionProgress.slice(0, 3).map((p, idx) => (
                   <div key={p.playerId} className="flex items-center gap-1 w-full">
                     <div className={cn("w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-white font-bold shrink-0", p.playerColor)}>
                        {(() => {
                          // Helper to determine best initial
                          const getInitial = (name: string) => {
                             const parts = name.split(" ");
                             // If multiple words, use first char of second word (e.g. "Explorer V" -> "V")
                             if (parts.length > 1) return parts[1].charAt(0);
                             // Otherwise use first char (e.g. "Alice" -> "A")
                             return name.charAt(0);
                          };

                          const myInitial = getInitial(p.playerName);
                          
                          // Check collision with other players in this specific mission list
                          const collision = missionProgress.some(other => 
                             other.playerId !== p.playerId && getInitial(other.playerName) === myInitial
                          );

                          if (collision) {
                             // If collision, try to be smarter:
                             // 1. If multi-word, maybe first word initial + second word initial? "EV" for "Explorer V"?
                             // 2. Or first 2 chars of the unique part? "Vi" for "Victor"?
                             const parts = p.playerName.split(" ");
                             if (parts.length > 1) {
                                // "Explorer Victor" -> "Vi"
                                return parts[1].substring(0, 2).toUpperCase(); 
                             } else {
                                // "Alice" -> "Al"
                                return p.playerName.substring(0, 2).toUpperCase();
                             }
                          }

                          return myInitial;
                        })()}
                     </div>
                     <div className="flex-1 h-2 bg-white/50 rounded-full overflow-hidden border border-amber-900/10">
                        <div 
                          className="h-full bg-green-500 transition-all duration-500" 
                          style={{ width: `${Math.min(100, (p.current / p.target) * 100)}%` }}
                        />
                     </div>
                     <span className="text-[8px] font-bold text-amber-900 w-6 text-right">{p.current}/{p.target}</span>
                   </div>
                 ))}
               </div>
            ) : (
               <div className="flex items-center justify-center mb-1">
                  <Trophy className="w-4 h-4 text-amber-600 mr-1" />
                  <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider">Active Mission</span>
               </div>
            )}
         </div>
      </div>
    );
  }

  return null;
}
