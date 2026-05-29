import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Map, Award, User, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { MissionCard, LocationCard } from "@/lib/gameData";

interface Player {
  id: number;
  name: string;
  stars: number;
  avatarColor: string;
  isTurn: boolean;
  collectedCards: LocationCard[];
  completedMissions: MissionCard[];
}

interface PlayerPanelProps {
  players: Player[];
  currentPlayerId: number;
}

export function PlayerPanel({ players, currentPlayerId }: PlayerPanelProps) {
  return (
    <div className="w-full max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {players.map((player) => {
        const isActive = player.id === currentPlayerId;
        
        return (
          <motion.div
            key={player.id}
            layout
            className={cn(
              "relative rounded-2xl p-3 flex flex-col items-center transition-all duration-300 border-2",
              isActive 
                ? "bg-white shadow-lg border-primary scale-105 z-10" 
                : "bg-white/60 border-transparent scale-95 opacity-80"
            )}
          >
            {/* Turn Indicator Badge */}
            {isActive && (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-3 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm uppercase tracking-wider z-20"
              >
                Their Turn
              </motion.div>
            )}

            <div className="flex items-center justify-between w-full mb-2">
              {/* Avatar */}
              <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-sm relative overflow-hidden", player.avatarColor)}>
                <User className="w-6 h-6 relative z-10" />
                {/* Visual indicator for completed missions on avatar */}
                {player.completedMissions.length > 0 && (
                   <div className="absolute inset-0 bg-yellow-400/30 z-0 animate-pulse" />
                )}
              </div>
              
              {/* Star Count */}
              <div className="flex flex-col items-end">
                <div className="flex items-center">
                  <span className="text-2xl font-heading font-bold text-amber-600 dark:text-amber-400 mr-1 drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]">{player.stars}</span>
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500 drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]" />
                </div>
              </div>
            </div>

            <div className="w-full text-center mb-1">
              <h3 className={cn("font-heading text-lg leading-none truncate", isActive ? "text-primary" : "text-gray-600")}>
                {player.name}
              </h3>
            </div>

            {/* Completed Missions Display */}
            <div className="w-full flex flex-wrap gap-1 justify-center min-h-[20px] mb-1">
               {player.completedMissions.map((m, idx) => (
                 <div key={m.id + idx} className="bg-yellow-100 text-yellow-800 text-[9px] font-bold px-1.5 py-0.5 rounded border border-yellow-200 flex items-center truncate max-w-full" title={m.name}>
                    <Trophy className="w-2 h-2 mr-0.5 text-yellow-600" />
                    {m.name}
                 </div>
               ))}
            </div>

            {/* Collected Cards Display */}
            {player.collectedCards.length > 0 && (
               <div className="w-full overflow-x-auto no-scrollbar flex gap-1 px-1 py-1.5 bg-gray-50/80 rounded-lg border border-dashed border-gray-200 mb-2">
                   {player.collectedCards.map(card => {
                      // Simple color mapping based on bandColor or continent fallback
                      let dotColor = "bg-gray-400";
                      if (card.bandColor === "Purple") dotColor = "bg-purple-500";
                      if (card.bandColor === "Green") dotColor = "bg-green-500";
                      if (card.bandColor === "Yellow") dotColor = "bg-yellow-500";
                      if (card.bandColor === "Red") dotColor = "bg-red-500";
                      if (card.bandColor === "Blue") dotColor = "bg-blue-500";
                      if (card.bandColor === "Orange") dotColor = "bg-orange-500";
                      
                      return (
                        <div key={card.id} className="flex-shrink-0 bg-white border border-gray-200 rounded-md px-1.5 py-0.5 shadow-sm text-[9px] font-medium text-gray-700 whitespace-nowrap flex items-center gap-1" title={`${card.city}, ${card.country}`}>
                             <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotColor)}></span>
                             {card.city}
                        </div>
                      );
                   })}
               </div>
            )}

            {/* Progress Bar (Visual only for now) */}
            <div className="w-full h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
               <motion.div 
                 className="h-full bg-yellow-400"
                 initial={{ width: 0 }}
                 animate={{ width: `${(player.stars / 10) * 100}%` }}
               />
            </div>
            <div className="w-full flex justify-between text-[10px] text-gray-500 dark:text-gray-300 mt-1 font-medium uppercase">
              <span>Start</span>
              <span className="flex items-center gap-0.5">Goal: 10<Star className="w-3 h-3 text-amber-500 fill-amber-500 inline" /></span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
