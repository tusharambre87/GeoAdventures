import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { dispatchXPGain } from "@/components/XPGainToast";

interface Country {
  id: string;
  countryName: string;
  capital: string;
  flagEmoji: string;
}

interface Props {
  countries: Country[];
  playerId: string;
  onComplete: () => void;
  onBack: () => void;
}

export default function GeoAtlasFlagQuest({ countries, playerId, onComplete, onBack }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [options, setOptions] = useState<Country[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isFinished, setIsFinished] = useState(false);

  const rawCountry = countries[currentIndex];
  const currentCountry = rawCountry && ('country' in rawCountry) ? (rawCountry as any).country : rawCountry;

  const recallMutation = useMutation({
    mutationFn: async ({ countryId, correct }: { countryId: string, correct: boolean }) => {
      const res = await fetch(`/api/geoatlas/progress/${playerId}/recall`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countryId, correct, type: "flag" }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.xpAwarded > 0) dispatchXPGain(data.xpAwarded, data.leveledUp, data.newRankName, data.oldRankName, data.oldRankIcon, data.newRankIcon, data.totalXp);
      }
    }
  });

  useEffect(() => {
    if (currentCountry && !isFinished) {
      const normalizedCountries = countries.map((c: any) => ('country' in c) ? c.country : c);
      const otherCountries = normalizedCountries.filter((c: any) => c.id !== currentCountry.id);
      const randomOthers = [...otherCountries].sort(() => 0.5 - Math.random()).slice(0, 3);
      const allOptions = [...randomOthers, currentCountry].sort(() => 0.5 - Math.random());
      setOptions(allOptions);
      setSelectedOption(null);
      setIsCorrect(null);
    }
  }, [currentIndex, isFinished]);

  const handleAnswer = (answerId: string) => {
    if (selectedOption) return;
    
    const correct = answerId === currentCountry.id;
    setSelectedOption(answerId);
    setIsCorrect(correct);
    if (correct) setScore(s => s + 1);
    
    recallMutation.mutate({ countryId: currentCountry.id, correct });
    
    setTimeout(() => {
      if (currentIndex < countries.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setIsFinished(true);
      }
    }, 1500);
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
              🏅
            </motion.div>
            <h2 className="text-3xl font-bold text-gray-800">Flag Expert!</h2>
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
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="w-full space-y-8"
        >
          <Card className="rounded-2xl shadow-lg bg-white border-none overflow-hidden py-10">
            <CardContent className="flex flex-col items-center space-y-8">
              <motion.div 
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="text-9xl" 
                data-testid="display-flag"
              >
                {currentCountry.flagEmoji}
              </motion.div>
              <h2 className="text-3xl font-bold text-gray-800 text-center">Which country does this flag belong to?</h2>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {options.map((option) => (
              <Button
                key={option.id}
                onClick={() => handleAnswer(option.id)}
                variant="outline"
                disabled={selectedOption !== null}
                data-testid={`button-option-${option.id}`}
                className={`
                  h-20 text-xl font-bold rounded-2xl border-2 transition-all
                  ${selectedOption === option.id 
                    ? (option.id === currentCountry.id ? "bg-green-100 border-green-500 text-green-700" : "bg-red-100 border-red-500 text-red-700 animate-shake")
                    : (selectedOption !== null && option.id === currentCountry.id ? "bg-green-100 border-green-500 text-green-700" : "bg-white hover:bg-blue-50 hover:border-blue-400 text-gray-700")
                  }
                `}
              >
                {option.countryName}
              </Button>
            ))}
          </div>

          <div className="h-10 flex justify-center items-center">
            {isCorrect === true && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2 text-green-600 font-bold text-xl">
                <CheckCircle2 className="w-8 h-8" /> Spot on!
              </motion.div>
            )}
            {isCorrect === false && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2 text-red-600 font-bold text-xl">
                <XCircle className="w-8 h-8" /> Nice try! It's {currentCountry.countryName}
              </motion.div>
            )}
          </div>
        </motion.div>
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
