import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { X, MapPin, Plus, Trash2, Check, Sparkles } from "lucide-react";
import { getStopTypeEmoji } from "@/lib/travelAvatars";

interface SuggestedStop {
  name: string;
  stopType: string;
  displayOrder: number;
  address?: string;
}

interface StopSelectionDialogProps {
  suggestedStops: SuggestedStop[];
  destination: string;
  onConfirm: (selectedStops: SuggestedStop[], customStops: string[]) => void;
  onClose: () => void;
}

export function StopSelectionDialog({
  suggestedStops,
  destination,
  onConfirm,
  onClose,
}: StopSelectionDialogProps) {
  const [selectedStops, setSelectedStops] = useState<Set<string>>(
    new Set(suggestedStops.map(s => s.name))
  );
  const [customStops, setCustomStops] = useState<string[]>([]);
  const [newCustomStop, setNewCustomStop] = useState("");

  const toggleStop = (stopName: string) => {
    setSelectedStops(prev => {
      const next = new Set(prev);
      if (next.has(stopName)) {
        next.delete(stopName);
      } else {
        next.add(stopName);
      }
      return next;
    });
  };

  const addCustomStop = () => {
    if (newCustomStop.trim() && customStops.length < 3) {
      setCustomStops(prev => [...prev, newCustomStop.trim()]);
      setNewCustomStop("");
    }
  };

  const removeCustomStop = (index: number) => {
    setCustomStops(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = () => {
    const selected = suggestedStops.filter(s => selectedStops.has(s.name));
    onConfirm(selected, customStops);
  };

  const totalSelected = selectedStops.size + customStops.length;
  const canAddMore = customStops.length < 3;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden"
      >
        <div className="bg-gradient-to-r from-orange-500 to-pink-500 p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold">Select Your Stops</h2>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
              <X className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-sm opacity-90">
            Choose which places to visit in {destination}
          </p>
          <div className="mt-3 flex items-center gap-2 bg-white/20 rounded-full px-3 py-1 w-fit">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">{totalSelected} stops selected</span>
          </div>
        </div>

        <div className="p-4 max-h-[50vh] overflow-y-auto">
          <div className="mb-4">
            <p className="text-sm font-medium text-muted-foreground mb-3">
              🎯 Recommended stops (tap to select/deselect)
            </p>
            <div className="space-y-2">
              {suggestedStops.map((stop, index) => (
                <motion.div
                  key={stop.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className={`cursor-pointer transition-all ${
                      selectedStops.has(stop.name)
                        ? "border-2 border-green-500 bg-green-50 dark:bg-green-900/20"
                        : "border-2 border-transparent hover:border-slate-200"
                    }`}
                    onClick={() => toggleStop(stop.name)}
                    data-testid={`stop-checkbox-${stop.name}`}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                        selectedStops.has(stop.name)
                          ? "bg-green-500 border-green-500 text-white"
                          : "border-slate-300"
                      }`}>
                        {selectedStops.has(stop.name) && <Check className="w-4 h-4" />}
                      </div>
                      <div className="text-2xl">
                        {getStopTypeEmoji(stop.stopType)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{stop.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{stop.stopType}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm font-medium text-muted-foreground mb-3">
              ✨ Add your own stops (up to 3)
            </p>
            
            {customStops.map((stop, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 mb-2"
              >
                <Card className="flex-1 border-2 border-purple-500 bg-purple-50 dark:bg-purple-900/20">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-6 h-6 rounded-md bg-purple-500 text-white flex items-center justify-center">
                      <Check className="w-4 h-4" />
                    </div>
                    <div className="text-2xl">📍</div>
                    <div className="flex-1">
                      <p className="font-medium">{stop}</p>
                      <p className="text-xs text-muted-foreground">Custom stop</p>
                    </div>
                  </CardContent>
                </Card>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCustomStop(index)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  data-testid={`remove-custom-stop-${index}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </motion.div>
            ))}

            {canAddMore && (
              <div className="flex gap-2">
                <Input
                  placeholder="Add a custom stop..."
                  value={newCustomStop}
                  onChange={(e) => setNewCustomStop(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCustomStop()}
                  className="flex-1"
                  data-testid="input-custom-stop"
                />
                <Button
                  onClick={addCustomStop}
                  disabled={!newCustomStop.trim()}
                  className="bg-purple-500 hover:bg-purple-600"
                  data-testid="button-add-custom-stop"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            )}

            {!canAddMore && (
              <p className="text-xs text-muted-foreground text-center py-2">
                Maximum 3 custom stops added
              </p>
            )}
          </div>
        </div>

        <div className="p-4 border-t bg-slate-50 dark:bg-slate-900/50">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              data-testid="button-cancel-stops"
            >
              Cancel
            </Button>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
              <Button
                onClick={handleConfirm}
                disabled={totalSelected === 0}
                className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
                data-testid="button-confirm-stops"
              >
                <MapPin className="w-4 h-4 mr-2" />
                Confirm {totalSelected} Stops
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
