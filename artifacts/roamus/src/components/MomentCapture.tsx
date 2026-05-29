import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { X, Camera, Image, Sparkles, Send, Loader2, ChevronDown, Star, Mic, MicOff, Plus, Trash2 } from "lucide-react";
import type { TravelStop, TravelTrip } from "@shared/schema";
import confetti from "canvas-confetti";
import { GeoBuddyCharacter, GEOBUDDY_MESSAGES } from "./GeoBuddyCharacter";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import { useQualitySignal } from "@/hooks/useQualitySignal";

interface MomentCaptureProps {
  trip: TravelTrip;
  stops: TravelStop[];
  onSave: (moment: {
    stopId?: string;
    photoUrl?: string;
    photoUrls?: string[];
    kidPromptResponse?: string;
    parentPromptResponse?: string;
    isSharedCommunity?: boolean;
  }) => Promise<void>;
  onClose: () => void;
  preSelectedStopId?: string;
  isParentMode?: boolean;
}

const KID_PROMPTS = [
  "The best thing I saw was...",
  "I was surprised that...",
  "My favorite part was...",
  "I learned that...",
  "This place made me feel...",
];

const PARENT_PROMPTS = [
  "My favorite kid moment was when...",
  "I loved watching them...",
  "The funniest thing was...",
  "I want to remember...",
  "Today taught us...",
];

const MAX_PHOTOS = 5;

export function MomentCapture({ trip, stops, onSave, onClose, preSelectedStopId, isParentMode = false }: MomentCaptureProps) {
  const [step, setStep] = useState<"photo" | "kid" | "parent" | "review">("photo");
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(preSelectedStopId ?? null);
  const { fireSignal } = useQualitySignal();
  const savedRef = useRef(false);
  const openedSignalFiredRef = useRef(false);

  // Fire moment_capture_opened when a stop is selected (first time), parent-only
  useEffect(() => {
    if (isParentMode && selectedStopId && !openedSignalFiredRef.current) {
      openedSignalFiredRef.current = true;
      fireSignal(selectedStopId, "moment_capture_opened");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStopId, isParentMode]);
  const [kidPrompt, setKidPrompt] = useState(KID_PROMPTS[0]);
  const [kidResponse, setKidResponse] = useState("");
  const [parentPrompt, setParentPrompt] = useState(PARENT_PROMPTS[0]);
  const [parentResponse, setParentResponse] = useState("");
  const [showStopPicker, setShowStopPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const [processingCount, setProcessingCount] = useState(0);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  const compressImage = (file: File, maxWidth: number = 1200): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          const compressed = canvas.toDataURL('image/jpeg', 0.7);
          resolve(compressed);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const kidSpeech = useSpeechToText({
    onResult: (text) => {
      setKidResponse(prev => prev + text + ' ');
    },
  });

  const parentSpeech = useSpeechToText({
    onResult: (text) => {
      setParentResponse(prev => prev + text + ' ');
    },
  });

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const remainingSlots = MAX_PHOTOS - photoPreviews.length;
      const filesToProcess = Math.min(files.length, remainingSlots);
      
      setIsProcessingPhotos(true);
      setProcessingCount(filesToProcess);
      
      const fileArray = Array.from(files).slice(0, filesToProcess);
      
      for (const file of fileArray) {
        try {
          const compressed = await compressImage(file);
          setPhotoPreviews(prev => [...prev, compressed]);
          setProcessingCount(prev => prev - 1);
        } catch (err) {
          console.error('Failed to process photo:', err);
          setProcessingCount(prev => prev - 1);
        }
      }
      
      setIsProcessingPhotos(false);
      setProcessingCount(0);
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  const removePhoto = (index: number) => {
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const celebrateSave = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FF69B4', '#FFD700', '#87CEEB', '#98FB98', '#DDA0DD']
    });
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 }
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 }
      });
    }, 250);
  };

  const [isSharedCommunity, setIsSharedCommunity] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showKidBuddy, setShowKidBuddy] = useState(false);

  useEffect(() => {
    if (step === "kid") {
      setShowKidBuddy(true);
      const timer = setTimeout(() => setShowKidBuddy(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await onSave({
        stopId: selectedStopId || undefined,
        photoUrl: photoPreviews[0] || undefined,
        photoUrls: photoPreviews.length > 0 ? photoPreviews : undefined,
        kidPromptResponse: kidResponse ? `${kidPrompt} ${kidResponse}` : undefined,
        parentPromptResponse: parentResponse ? `${parentPrompt} ${parentResponse}` : undefined,
        isSharedCommunity,
      });
      // Fire quality signals for parent moments only
      if (isParentMode && selectedStopId) {
        const hasPhotos = photoPreviews.length > 0;
        const hasNote = parentResponse.trim().length > 0;
        if (hasPhotos) fireSignal(selectedStopId, "photo_added", { signalValue: String(photoPreviews.length) });
        if (hasNote) fireSignal(selectedStopId, "note_added");
        if (hasPhotos && hasNote) fireSignal(selectedStopId, "photo_and_note");
      }
      savedRef.current = true;
      setIsSaving(false);
      setShowSuccess(true);
      celebrateSave();
      setTimeout(() => onClose(), 1500);
    } catch (error) {
      console.error("Failed to save moment:", error);
      setIsSaving(false);
      setSaveError("Couldn't save your moment. Please try again!");
    }
  };

  const handleClose = useCallback(() => {
    if (isParentMode && selectedStopId && !savedRef.current) {
      fireSignal(selectedStopId, "capture_dismissed");
    }
    onClose();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStopId, isParentMode, onClose]);

  const selectedStop = stops.find(s => s.id === selectedStopId);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-gradient-to-b from-pink-100 to-orange-100 dark:from-slate-900 dark:to-slate-800"
    >
      <div className="max-w-lg mx-auto p-4 h-full flex flex-col">
        <header className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={handleClose} data-testid="button-close-moment">
            <X className="w-6 h-6" />
          </Button>
          <div className="text-center flex-1">
            <h1 className="font-bold text-lg">Capture a Moment</h1>
            <p className="text-sm text-muted-foreground">{trip.name}</p>
          </div>
          <div className="w-10" />
        </header>

        <div className="flex-1 overflow-y-auto space-y-4">
          <AnimatePresence mode="wait">
            {step === "photo" && (
              <motion.div
                key="photo"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card className="bg-white/80 dark:bg-slate-800/80">
                  <CardContent className="p-6">
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Camera className="w-8 h-8 text-pink-500" />
                      </div>
                      <h2 className="text-xl font-bold">Add a Photo</h2>
                      <p className="text-sm text-muted-foreground">Capture the memory!</p>
                    </div>

                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoCapture}
                      className="hidden"
                      data-testid="input-camera"
                    />
                    <input
                      ref={libraryInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoCapture}
                      className="hidden"
                      data-testid="input-library"
                    />

                    {isProcessingPhotos && (
                      <div className="flex items-center justify-center gap-2 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl mb-3">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                        <span className="text-sm text-blue-600 dark:text-blue-300">
                          Processing {processingCount} photo{processingCount > 1 ? 's' : ''}...
                        </span>
                      </div>
                    )}

                    {photoPreviews.length > 0 ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          {photoPreviews.map((photo, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={photo}
                                alt={`Photo ${index + 1}`}
                                className="w-full h-32 object-cover rounded-xl"
                              />
                              <button
                                onClick={() => removePhoto(index)}
                                className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                data-testid={`button-remove-photo-${index}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          
                          {photoPreviews.length < MAX_PHOTOS && !isProcessingPhotos && (
                            <button
                              onClick={() => libraryInputRef.current?.click()}
                              className="h-32 flex flex-col items-center justify-center gap-1 bg-slate-100 dark:bg-slate-700 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                              data-testid="button-add-more-photos"
                            >
                              <Plus className="w-8 h-8 text-slate-400" />
                              <span className="text-xs text-slate-500 dark:text-slate-400">Add More</span>
                            </button>
                          )}
                        </div>
                        
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => cameraInputRef.current?.click()}
                            disabled={photoPreviews.length >= MAX_PHOTOS || isProcessingPhotos}
                            data-testid="button-take-another"
                          >
                            <Camera className="w-4 h-4 mr-1" />
                            Take Photo
                          </Button>
                        </div>
                        
                        <p className="text-xs text-center text-muted-foreground">
                          {photoPreviews.length} of {MAX_PHOTOS} photos added
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Button
                          onClick={() => cameraInputRef.current?.click()}
                          className="w-full h-28 flex flex-col gap-2 bg-pink-50 dark:bg-pink-900/20 hover:bg-pink-100 dark:hover:bg-pink-900/30 rounded-2xl border-2 border-dashed border-pink-300 dark:border-pink-700"
                          variant="ghost"
                          data-testid="button-take-photo"
                        >
                          <Camera className="w-10 h-10 text-pink-500" />
                          <span className="text-pink-600 dark:text-pink-300 font-medium">Take a Photo</span>
                        </Button>
                        <Button
                          onClick={() => libraryInputRef.current?.click()}
                          className="w-full h-28 flex flex-col gap-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-2xl border-2 border-dashed border-blue-300 dark:border-blue-700"
                          variant="ghost"
                          data-testid="button-choose-from-library"
                        >
                          <Image className="w-10 h-10 text-blue-500" />
                          <span className="text-blue-600 dark:text-blue-300 font-medium">Choose from Library</span>
                        </Button>
                      </div>
                    )}

                    <div className="mt-4">
                      <label className="text-sm font-medium mb-2 block">Link to a stop (optional)</label>
                      <Button
                        variant="outline"
                        className="w-full justify-between"
                        onClick={() => setShowStopPicker(!showStopPicker)}
                        data-testid="button-select-stop"
                      >
                        <span>{selectedStop?.name || "Choose a stop..."}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${showStopPicker ? "rotate-180" : ""}`} />
                      </Button>
                      
                      <AnimatePresence>
                        {showStopPicker && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-2 bg-white dark:bg-slate-800 rounded-xl border shadow-lg max-h-48 overflow-y-auto">
                              <button
                                className="w-full px-4 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 text-sm"
                                onClick={() => { setSelectedStopId(null); setShowStopPicker(false); }}
                              >
                                No specific stop
                              </button>
                              {stops.map(stop => (
                                <button
                                  key={stop.id}
                                  className={`w-full px-4 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 text-sm ${
                                    selectedStopId === stop.id ? "bg-orange-50 dark:bg-orange-900/20" : ""
                                  }`}
                                  onClick={() => { setSelectedStopId(stop.id); setShowStopPicker(false); }}
                                >
                                  {stop.name}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {step === "kid" && (
              <motion.div
                key="kid"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card className="bg-white/80 dark:bg-slate-800/80">
                  <CardContent className="p-6">
                    <div className="text-center mb-6">
                      <AnimatePresence>
                        {showKidBuddy && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex justify-center mb-3"
                          >
                            <GeoBuddyCharacter 
                              state="remembering" 
                              size="md"
                              message={GEOBUDDY_MESSAGES.remembering.moment}
                              showMessage={true}
                              autoHide={false}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <h2 className="text-xl font-bold">Kid's Turn!</h2>
                      <p className="text-sm text-muted-foreground">What do you want to remember?</p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Choose a prompt:</label>
                        <div className="flex flex-wrap gap-2">
                          {KID_PROMPTS.map((prompt, i) => (
                            <button
                              key={i}
                              className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                                kidPrompt === prompt
                                  ? "bg-purple-500 text-white"
                                  : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                              }`}
                              onClick={() => setKidPrompt(prompt)}
                            >
                              {prompt}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
                        <p className="font-medium text-purple-800 dark:text-purple-200 mb-2">{kidPrompt}</p>
                        <div className="relative">
                          <Textarea
                            value={kidResponse}
                            onChange={(e) => setKidResponse(e.target.value)}
                            placeholder="Tell us your story! Or tap the microphone to talk."
                            className="min-h-24 bg-white dark:bg-slate-800 pr-14"
                            data-testid="textarea-kid-response"
                          />
                          {kidSpeech.isSupported && (
                            <button
                              onClick={kidSpeech.isListening ? kidSpeech.stopListening : kidSpeech.startListening}
                              className={`absolute right-2 bottom-2 w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-md ${
                                kidSpeech.isListening 
                                  ? "bg-red-500 text-white animate-pulse" 
                                  : "bg-purple-500 text-white hover:bg-purple-600"
                              }`}
                              data-testid="button-kid-speech"
                            >
                              {kidSpeech.isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                            </button>
                          )}
                        </div>
                        {kidSpeech.isListening && (
                          <p className="text-xs text-purple-600 dark:text-purple-300 mt-2 animate-pulse">
                            🎤 Listening... speak now!
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {step === "parent" && (
              <motion.div
                key="parent"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card className="bg-white/80 dark:bg-slate-800/80">
                  <CardContent className="p-6">
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-sky-100 dark:bg-sky-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Sparkles className="w-8 h-8 text-sky-500" />
                      </div>
                      <h2 className="text-xl font-bold">Parent's Turn!</h2>
                      <p className="text-sm text-muted-foreground">Save your perspective too</p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Choose a prompt:</label>
                        <div className="flex flex-wrap gap-2">
                          {PARENT_PROMPTS.map((prompt, i) => (
                            <button
                              key={i}
                              className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                                parentPrompt === prompt
                                  ? "bg-sky-500 text-white"
                                  : "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300"
                              }`}
                              onClick={() => setParentPrompt(prompt)}
                            >
                              {prompt}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="bg-sky-50 dark:bg-sky-900/20 rounded-xl p-4">
                        <p className="font-medium text-sky-800 dark:text-sky-200 mb-2">{parentPrompt}</p>
                        <div className="relative">
                          <Textarea
                            value={parentResponse}
                            onChange={(e) => setParentResponse(e.target.value)}
                            placeholder="Share your thoughts... or tap the mic to dictate."
                            className="min-h-24 bg-white dark:bg-slate-800 pr-14"
                            data-testid="textarea-parent-response"
                          />
                          {parentSpeech.isSupported && (
                            <button
                              onClick={parentSpeech.isListening ? parentSpeech.stopListening : parentSpeech.startListening}
                              className={`absolute right-2 bottom-2 w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-md ${
                                parentSpeech.isListening 
                                  ? "bg-red-500 text-white animate-pulse" 
                                  : "bg-sky-500 text-white hover:bg-sky-600"
                              }`}
                              data-testid="button-parent-speech"
                            >
                              {parentSpeech.isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                            </button>
                          )}
                        </div>
                        {parentSpeech.isListening && (
                          <p className="text-xs text-sky-600 dark:text-sky-300 mt-2 animate-pulse">
                            🎤 Listening... speak now!
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {step === "review" && (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card className="bg-white/80 dark:bg-slate-800/80">
                  <CardContent className="p-6">
                    <div className="text-center mb-6">
                      <h2 className="text-xl font-bold">Your Moment</h2>
                      <p className="text-sm text-muted-foreground">Ready to save?</p>
                    </div>

                    {photoPreviews.length > 0 && (
                      <div className="mb-4">
                        {photoPreviews.length === 1 ? (
                          <img
                            src={photoPreviews[0]}
                            alt="Moment"
                            className="w-full h-48 object-cover rounded-xl"
                          />
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            {photoPreviews.map((photo, index) => (
                              <img
                                key={index}
                                src={photo}
                                alt={`Moment ${index + 1}`}
                                className={`w-full object-cover rounded-xl ${
                                  index === 0 && photoPreviews.length % 2 === 1 
                                    ? "col-span-2 h-32" 
                                    : "h-24"
                                }`}
                              />
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-center text-muted-foreground mt-2">
                          {photoPreviews.length} photo{photoPreviews.length > 1 ? 's' : ''} captured
                        </p>
                      </div>
                    )}

                    {selectedStop && (
                      <p className="text-sm text-muted-foreground mb-4">
                        📍 {selectedStop.name}
                      </p>
                    )}

                    {kidResponse && (
                      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 mb-3">
                        <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
                          {kidPrompt} {kidResponse}
                        </p>
                      </div>
                    )}

                    {parentResponse && (
                      <div className="bg-sky-50 dark:bg-sky-900/20 rounded-xl p-4">
                        <p className="text-sm font-medium text-sky-800 dark:text-sky-200">
                          {parentPrompt} {parentResponse}
                        </p>
                      </div>
                    )}

                    {photoPreviews.length > 0 && (
                      <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
                        <label className="flex items-start gap-3 cursor-pointer" htmlFor="share-community-toggle">
                          <input
                            id="share-community-toggle"
                            type="checkbox"
                            checked={isSharedCommunity}
                            onChange={(e) => setIsSharedCommunity(e.target.checked)}
                            className="mt-0.5 w-4 h-4 accent-orange-500 cursor-pointer"
                            data-testid="checkbox-share-community"
                          />
                          <div>
                            <p className="text-sm font-semibold text-orange-800 dark:text-orange-200">Share this photo to inspire other families visiting {trip.city || trip.destination || "this city"}</p>
                            <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">
                              No names or personal details are shared.
                            </p>
                          </div>
                        </label>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <footer className="mt-4 pb-4">
          <AnimatePresence>
            {saveError && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center gap-3"
                data-testid="save-error-banner"
              >
                <span className="text-2xl">😢</span>
                <div>
                  <p className="font-medium text-red-800 dark:text-red-200">{saveError}</p>
                  <p className="text-sm text-red-600 dark:text-red-300">Check your connection and try again</p>
                </div>
              </motion.div>
            )}

            {showSuccess && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-4 p-6 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-xl text-center"
                data-testid="save-success-banner"
              >
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
                  transition={{ repeat: 2, duration: 0.5 }}
                  className="text-5xl mb-2"
                >
                  🎉
                </motion.div>
                <p className="font-bold text-lg text-green-800 dark:text-green-200">Moment Saved!</p>
                <p className="text-sm text-green-600 dark:text-green-300">You made a memory forever</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-3">
            {step !== "photo" && !showSuccess && (
              <Button
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={() => {
                  const steps = ["photo", "kid", "parent", "review"] as const;
                  const currentIndex = steps.indexOf(step);
                  if (currentIndex > 0) {
                    setStep(steps[currentIndex - 1]);
                  }
                }}
                data-testid="button-prev-step"
              >
                Back
              </Button>
            )}

            {step === "review" && !showSuccess ? (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                <Button
                  size="lg"
                  className="w-full bg-gradient-to-r from-pink-500 to-orange-500"
                  onClick={handleSave}
                  disabled={isSaving}
                  data-testid="button-save-moment"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Star className="w-5 h-5 mr-2" />
                      Save Moment ⭐
                    </>
                  )}
                </Button>
              </motion.div>
            ) : !showSuccess ? (
              <Button
                size="lg"
                className="flex-1 bg-gradient-to-r from-orange-500 to-pink-500"
                onClick={() => {
                  const steps = ["photo", "kid", "parent", "review"] as const;
                  const currentIndex = steps.indexOf(step);
                  if (currentIndex < steps.length - 1) {
                    setStep(steps[currentIndex + 1]);
                  }
                }}
                data-testid="button-next-step"
              >
                Next
              </Button>
            ) : null}
          </div>

          {!showSuccess && (
            <div className="flex justify-center gap-1.5 mt-3">
              {["photo", "kid", "parent", "review"].map((s, i) => (
                <div
                  key={s}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    s === step
                      ? "bg-pink-500"
                      : i < ["photo", "kid", "parent", "review"].indexOf(step)
                      ? "bg-green-400"
                      : "bg-slate-300"
                  }`}
                />
              ))}
            </div>
          )}
        </footer>
      </div>
    </motion.div>
  );
}
