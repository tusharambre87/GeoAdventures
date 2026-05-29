import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useMutation } from "@tanstack/react-query";
import { ChevronRight, ArrowLeft, CheckCircle2, XCircle, Eye } from "lucide-react";
import { dispatchXPGain } from "@/components/XPGainToast";

interface Country {
  id: string;
  countryName: string;
  capital: string;
  flagEmoji: string;
  memoryHook?: string;
  landmarkAnchor?: string;
}

interface Props {
  countries: Country[];
  playerId: string;
  onComplete: () => void;
  onBack: () => void;
}

type Step = "learn" | "recall" | "next";

export default function GeoAtlasCapitalQuest({ countries, playerId, onComplete, onBack }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [step, setStep] = useState<Step>("learn");
  const [score, setScore] = useState(0);
  const [options, setOptions] = useState<Country[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [showCapital, setShowCapital] = useState(false);
  const [showFlagHints, setShowFlagHints] = useState(false);

  const rawCountry = countries[currentIndex];
  const currentCountry = rawCountry && ('country' in rawCountry) ? (rawCountry as any).country : rawCountry;

  const learnMutation = useMutation({
    mutationFn: async (countryId: string) => {
      await fetch(`/api/geoatlas/progress/${playerId}/learn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countryId }),
      });
    }
  });

  const recallMutation = useMutation({
    mutationFn: async ({ countryId, correct }: { countryId: string, correct: boolean }) => {
      const res = await fetch(`/api/geoatlas/progress/${playerId}/recall`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countryId, correct, type: "capital" }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.xpAwarded > 0) dispatchXPGain(data.xpAwarded, data.leveledUp, data.newRankName, data.oldRankName, data.oldRankIcon, data.newRankIcon, data.totalXp);
      }
    }
  });

  useEffect(() => {
    if (step === "learn" && currentCountry) {
      learnMutation.mutate(currentCountry.id);
    }
    if (step === "recall" && currentCountry) {
      const normalizedCountries = countries.map((c: any) => ('country' in c) ? c.country : c);
      const otherCountries = normalizedCountries.filter((c: Country) => c.id !== currentCountry.id);
      const randomOthers = [...otherCountries].sort(() => 0.5 - Math.random()).slice(0, 3);
      const allOptions = [...randomOthers, currentCountry].sort(() => 0.5 - Math.random());
      setOptions(allOptions);
      setSelectedOption(null);
      setIsCorrect(null);
    }
  }, [step, currentIndex]);

  const handleAnswer = (answerId: string) => {
    if (selectedOption) return;
    
    const correct = answerId === currentCountry.id;
    setSelectedOption(answerId);
    setIsCorrect(correct);
    if (correct) setScore(s => s + 1);
    
    recallMutation.mutate({ countryId: currentCountry.id, correct });
    
    setTimeout(() => {
      setStep("next");
    }, 1500);
  };

  const handleNext = () => {
    if (currentIndex < countries.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setStep("learn");
      setShowCapital(false);
      setShowFlagHints(false);
    } else {
      setIsFinished(true);
    }
  };

  if (isFinished) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center p-6 space-y-6 text-center"
      >
        <Card className="w-full max-w-md overflow-hidden rounded-2xl shadow-xl bg-white border-none">
          <CardContent className="p-8 space-y-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 12 }}
              className="text-6xl"
            >
              🎉
            </motion.div>
            <h2 className="text-3xl font-bold text-gray-800">Quest Complete!</h2>
            <div className="p-4 bg-green-50 rounded-xl">
              <p className="text-lg text-green-700 font-medium">You got {score} out of {countries.length} correct!</p>
            </div>
            <Button 
              onClick={onComplete} 
              className="w-full py-6 text-xl rounded-xl bg-green-500 hover:bg-green-600 transition-all shadow-md"
              data-testid="button-continue"
            >
              Continue Adventure
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="flex items-center gap-2" data-testid="button-back">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <div className="flex flex-col items-end gap-1">
          <span className="text-sm font-bold text-gray-500">{currentIndex + 1} / {countries.length}</span>
          <Progress value={((currentIndex + 1) / countries.length) * 100} className="w-32 h-3" data-testid="progress-bar" />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === "learn" && (
          <motion.div
            key="learn"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full"
          >
            <Card className="rounded-2xl shadow-lg bg-white border-none overflow-hidden">
              <CardContent className="p-10 flex flex-col items-center space-y-8">
                <div className="text-8xl" data-testid="display-flag">{currentCountry.flagEmoji}</div>
                <div className="text-center space-y-4">
                  <h3 className="text-2xl font-bold text-gray-500 uppercase tracking-widest">Country</h3>
                  <h2 className="text-5xl font-black text-blue-600" data-testid="text-country-name">{currentCountry.countryName}</h2>
                </div>
                
                {showCapital && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full text-center space-y-4"
                  >
                    <div className="h-px bg-gray-100 w-full" />
                    <h3 className="text-xl font-bold text-gray-500 uppercase tracking-widest">Capital City</h3>
                    <h2 className="text-5xl font-black text-green-600" data-testid="text-capital-name">{currentCountry.capital}</h2>
                    {currentCountry.memoryHook && (
                      <p className="text-lg italic text-gray-600 mt-4 bg-yellow-50 p-4 rounded-xl border border-yellow-100" data-testid="text-memory-hook">
                        "{currentCountry.memoryHook}"
                      </p>
                    )}
                  </motion.div>
                )}

                {!showCapital && (
                  <div className="w-full text-center space-y-4 py-4">
                    <p className="text-lg text-gray-400 font-medium">Do you know the capital?</p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 w-full mt-4">
                  {!showCapital && (
                    <Button 
                      onClick={() => setShowCapital(true)} 
                      variant="outline"
                      className="flex-1 px-8 py-6 text-lg rounded-xl border-2 border-green-300 text-green-600 hover:bg-green-50 font-bold flex items-center justify-center gap-2"
                      data-testid="button-show-me"
                    >
                      <Eye className="w-5 h-5" /> Show Me
                    </Button>
                  )}
                  <Button 
                    onClick={() => setStep("recall")} 
                    className={`flex-1 px-8 py-6 text-lg rounded-xl bg-blue-500 hover:bg-blue-600 shadow-md font-bold flex items-center justify-center gap-2 ${showCapital ? 'w-full' : ''}`}
                    data-testid="button-start-recall"
                  >
                    I'm ready to try! <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === "recall" && (
          <motion.div
            key="recall"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full space-y-8"
          >
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-gray-800">What is the capital of {currentCountry.countryName}?</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {options.map((option) => (
                <Button
                  key={option.id}
                  onClick={() => handleAnswer(option.id)}
                  variant="outline"
                  disabled={selectedOption !== null}
                  data-testid={`button-option-${option.id}`}
                  className={`
                    h-24 text-xl font-bold rounded-2xl border-2 transition-all flex items-center justify-between px-6
                    ${selectedOption === option.id 
                      ? (option.id === currentCountry.id ? "bg-green-100 border-green-500 text-green-700" : "bg-red-100 border-red-500 text-red-700 animate-shake")
                      : (selectedOption !== null && option.id === currentCountry.id ? "bg-green-100 border-green-500 text-green-700" : "bg-white hover:bg-blue-50 hover:border-blue-400 text-gray-700")
                    }
                  `}
                >
                  <span>{option.capital}</span>
                  {showFlagHints && <span className="text-3xl opacity-50">{option.flagEmoji}</span>}
                </Button>
              ))}
            </div>

            {!showFlagHints && selectedOption === null && (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => setShowFlagHints(true)}
                  className="rounded-2xl border-2 border-blue-200 text-blue-600 hover:bg-blue-50 font-bold gap-2"
                  data-testid="button-hint-flags"
                >
                  <Eye className="w-5 h-5" />
                  Hint with Flags
                </Button>
              </div>
            )}

            <div className="h-10 flex justify-center items-center">
              {isCorrect === true && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2 text-green-600 font-bold text-xl">
                  <CheckCircle2 className="w-8 h-8" /> Brilliant!
                </motion.div>
              )}
              {isCorrect === false && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2 text-red-600 font-bold text-xl">
                  <XCircle className="w-8 h-8" /> Not quite, keep going!
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {step === "next" && (
          <motion.div
            key="next"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full text-center py-10"
          >
             <div className="text-8xl mb-6">
                {isCorrect ? "⭐" : "💪"}
             </div>
             <h2 className="text-4xl font-black mb-8 text-gray-800">
                {isCorrect ? "Great Job!" : "You're Learning!"}
             </h2>
             <Button 
                onClick={handleNext} 
                className="px-12 py-8 text-2xl rounded-2xl bg-green-500 hover:bg-green-600 shadow-lg"
                data-testid="button-next"
             >
                {currentIndex < countries.length - 1 ? "Next Country" : "Show Results"}
             </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 0s 2;
        }
      `}} />
    </div>
  );
}
