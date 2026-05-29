import { motion } from "framer-motion";
import { MapPin, Clock, Home, Check } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import type { TravelTrip } from "@shared/schema";
import { isHomeAdventure } from "@/lib/adventureModeUtils";

interface SwitchAdventureSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trips: TravelTrip[];
  activeAdventureId: string | null;
  onSelectAdventure: (tripId: string) => void;
}

function formatLastActivity(trip: TravelTrip): string {
  const lastActive = trip.updatedAt ? new Date(trip.updatedAt) : 
                     trip.createdAt ? new Date(trip.createdAt) : null;
  if (!lastActive) return "";
  
  const now = new Date();
  const diffMs = now.getTime() - lastActive.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffHours < 1) return "Active now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return "";
}

export function SwitchAdventureSheet({
  open,
  onOpenChange,
  trips,
  activeAdventureId,
  onSelectAdventure,
}: SwitchAdventureSheetProps) {
  const activeTrips = trips.filter(t => !t.isLocked && t.status !== "completed");
  
  const handleSelect = (tripId: string) => {
    onSelectAdventure(tripId);
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-center pb-2">
          <DrawerTitle className="text-lg font-bold">Switch Adventure</DrawerTitle>
          <DrawerDescription className="text-sm text-muted-foreground">
            Choose an adventure to continue
          </DrawerDescription>
        </DrawerHeader>
        
        <div className="px-4 pb-6 space-y-2 overflow-y-auto max-h-[60vh]">
          {activeTrips.map((trip, index) => {
            const isActive = trip.id === activeAdventureId;
            const isHome = isHomeAdventure(trip);
            const lastActivity = formatLastActivity(trip);
            
            return (
              <motion.button
                key={trip.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleSelect(trip.id)}
                className={`w-full p-4 rounded-xl flex items-center gap-3 text-left transition-all ${
                  isActive
                    ? "bg-green-50 dark:bg-green-950/30 border-2 border-green-400 dark:border-green-600"
                    : "bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-600"
                }`}
                data-testid={`button-switch-to-${trip.id}`}
              >
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${
                  isHome 
                    ? "bg-teal-100 dark:bg-teal-900/50" 
                    : "bg-blue-100 dark:bg-blue-900/50"
                }`}>
                  {trip.destination?.slice(0, 2) || "🌍"}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {trip.name || trip.destination}
                    </span>
                    {isActive && (
                      <span className="flex items-center gap-1 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        Active
                      </span>
                    )}
                    {isHome && !isActive && (
                      <span className="flex items-center gap-1 text-xs bg-teal-500 text-white px-1.5 py-0.5 rounded-full">
                        <Home className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{trip.destination}</span>
                    {lastActivity && (
                      <>
                        <span className="text-slate-300 dark:text-slate-600">•</span>
                        <span className="flex items-center gap-1 text-xs">
                          <Clock className="w-3 h-3" />
                          {lastActivity}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                
                {isActive && (
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                )}
              </motion.button>
            );
          })}
          
          {activeTrips.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No active adventures</p>
              <p className="text-sm">Create a new adventure to get started!</p>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
