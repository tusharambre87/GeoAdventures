import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, ArrowRight, Check, Star, Globe, MapPin, Compass, BookOpen, Lightbulb, Trophy } from "lucide-react";
import { PassportStamp } from "@/components/PassportStamp";
import { useUser } from "@/lib/userContext";
import { useExplorer } from "@/lib/explorerContext";
import { useLocation } from "wouter";
import { soundManager } from "@/lib/sound";
import confetti from "canvas-confetti";
import { DAILY_QUEST_CITIES, fuzzyMatchCity } from "@/lib/dailyQuestData";

import pandaCharacter from "@assets/generated_images/cute_cartoon_panda_sticker.png";
import penguinCharacter from "@assets/generated_images/cute_cartoon_penguin_sticker.png";
import llamaCharacter from "@assets/characters/llama.png";

type Stage = "WELCOME" | "QUEST" | "STAMP" | "SLIDE_A" | "SLIDE_B" | "SLIDE_C";

export function FirstTimeQuest({ onSkip }: { onSkip: () => void }) {
  const [stage, setStage] = useState<Stage>("WELCOME");
  const [, navigate] = useLocation();
  const { addCollectedCard, awardPassportStar, stats, collectedCardIds } = useUser();
  const { activeExplorer } = useExplorer();

  // Quest State
  const [guess, setGuess] = useState("");
  const [guessesLeft, setGuessesLeft] = useState(3);
  const [isCorrect, setIsCorrect] = useState(false);
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set([0])); // Start with 'P' revealed for PARIS

  const parisCity = DAILY_QUEST_CITIES.find(c => c.id === "dq_paris");
  const clues = [
    "This city has the Eiffel Tower.",
    "It's the capital of France.",
    "People call it the City of Light."
  ];

  const handleStart = () => {
    soundManager.playClick();
    setStage("QUEST");
  };

  const handleGuessSubmit = () => {
    if (!guess.trim()) return;

    const correct = fuzzyMatchCity(guess.trim(), "Paris");
    if (correct) {
      soundManager.playSuccess();
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      setIsCorrect(true);
      setRevealedIndices(new Set([0, 1, 2, 3, 4]));
      setTimeout(() => setStage("STAMP"), 1500);
    } else {
      const newGuessesLeft = guessesLeft - 1;
      setGuessesLeft(newGuessesLeft);
      soundManager.playError();
      
      if (newGuessesLeft <= 0) {
        setRevealedIndices(new Set([0, 1, 2, 3, 4]));
        setTimeout(() => setStage("STAMP"), 2000);
      } else {
        // Reveal more letters on wrong guess
        const newRevealed = new Set(revealedIndices);
        if (newGuessesLeft === 2) newRevealed.add(4); // Reveal 'S'
        if (newGuessesLeft === 1) newRevealed.add(2); // Reveal 'R'
        setRevealedIndices(newRevealed);
        setGuess("");
      }
    }
  };

  const completeJourney = () => {
    soundManager.playClick();
    const explorerId = activeExplorer?.id || 'guest';
    addCollectedCard("dq_paris");
    awardPassportStar("dq_paris", 1);
    localStorage.setItem(`geoquest_onboarding_seen_${explorerId}`, 'true');
    navigate('/city/dq_paris?from=quest');
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white overflow-y-auto">
      <AnimatePresence mode="wait">
        {stage === "WELCOME" && (
          <motion.div 
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-purple-600 to-indigo-700 text-white text-center relative"
          >
            <button 
              onClick={onSkip}
              className="absolute top-6 right-6 text-white/80 hover:text-white font-bold py-2 px-4 rounded-full bg-white/10"
              data-testid="button-skip-onboarding"
            >
              Skip
            </button>

            <div className="flex justify-center gap-4 mb-8">
              <motion.img 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                src={pandaCharacter} 
                className="w-20 h-20 md:w-32 md:h-32 rounded-2xl shadow-lg bg-white/60" 
                alt="Panda" 
              />
              <motion.img 
                initial={{ y: 0, opacity: 0 }}
                animate={{ y: -20, opacity: 1 }}
                transition={{ delay: 0.1 }}
                src={penguinCharacter} 
                className="w-24 h-24 md:w-40 md:h-40 rounded-2xl shadow-lg bg-white/60" 
                alt="Penguin" 
              />
              <motion.img 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                src={llamaCharacter} 
                className="w-20 h-20 md:w-32 md:h-32 rounded-2xl shadow-lg bg-white/60" 
                alt="Llama" 
              />
            </div>

            <motion.h1 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-4xl md:text-6xl font-heading mb-4"
              data-testid="text-welcome-title"
            >
              Ready to Explore?
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-xl md:text-2xl max-w-2xl mb-12 text-purple-100"
              data-testid="text-welcome-subtitle"
            >
              Solve mysteries, discover cities, and travel the world with GeoQuest.
            </motion.p>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <Button 
                onClick={handleStart}
                className="bg-yellow-400 hover:bg-yellow-500 text-purple-900 text-xl font-bold py-8 px-12 rounded-3xl border-b-8 border-yellow-600 active:border-b-0 active:translate-y-2 transition-all shadow-xl"
                data-testid="button-start-journey"
              >
                Start the Journey
              </Button>
            </motion.div>
          </motion.div>
        )}

        {stage === "QUEST" && (
          <motion.div 
            key="quest"
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="min-h-screen flex flex-col items-center bg-slate-50 p-4 md:p-8"
          >
            <div className="w-full max-w-2xl flex flex-col gap-6">
              <div className="bg-white rounded-3xl p-6 shadow-xl border-4 border-purple-200">
                <div className="flex items-center gap-2 mb-4">
                  <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                    <Compass className="w-4 h-4" /> FIRST MISSION
                  </span>
                  <div className="ml-auto flex gap-1">
                    {[1, 2, 3].map(i => (
                      <div key={i} className={`w-3 h-3 rounded-full ${i <= guessesLeft ? 'bg-rose-500' : 'bg-slate-200'}`} />
                    ))}
                  </div>
                </div>

                <h2 className="text-2xl font-heading text-slate-800 mb-6">Mystery Destination</h2>
                
                <div className="space-y-4 mb-8">
                  {clues.map((clue, idx) => (
                    <motion.div 
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: idx * 0.2 }}
                      key={idx} 
                      className="flex items-start gap-3 bg-purple-50 p-4 rounded-2xl border-2 border-purple-100"
                    >
                      <div className="bg-purple-200 text-purple-700 rounded-full p-1 mt-0.5">
                        <Check className="w-4 h-4" />
                      </div>
                      <p className="text-lg text-purple-900 font-medium">{clue}</p>
                    </motion.div>
                  ))}
                </div>

                <div className="flex justify-center gap-2 mb-8">
                  {"PARIS".split('').map((char, i) => (
                    <div 
                      key={i} 
                      className={`w-12 h-16 md:w-16 md:h-20 rounded-xl flex items-center justify-center text-3xl md:text-4xl font-black border-4 transition-all ${
                        revealedIndices.has(i) 
                        ? 'bg-yellow-400 border-yellow-500 text-yellow-900' 
                        : 'bg-slate-100 border-slate-200 text-slate-300'
                      }`}
                    >
                      {revealedIndices.has(i) ? char : '?'}
                    </div>
                  ))}
                </div>

                {isCorrect ? (
                  <div className="text-center py-4 bg-green-100 rounded-2xl text-green-700 font-bold text-xl animate-bounce">
                    Correct! It's Paris!
                  </div>
                ) : guessesLeft <= 0 ? (
                  <div className="text-center py-4 bg-orange-100 rounded-2xl text-orange-700 font-bold text-lg">
                    That's okay! The city was Paris. It's yours to explore!
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input 
                      value={guess}
                      onChange={(e) => setGuess(e.target.value)}
                      placeholder="Type the city name..."
                      className="text-xl py-6 rounded-2xl border-2 focus:ring-purple-400"
                      onKeyDown={(e) => e.key === 'Enter' && handleGuessSubmit()}
                      autoFocus
                      data-testid="input-city-guess"
                    />
                    <Button 
                      onClick={handleGuessSubmit}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-8 rounded-2xl"
                      data-testid="button-submit-guess"
                    >
                      Guess
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {stage === "STAMP" && (
          <motion.div 
            key="stamp"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-green-50 to-emerald-50 text-center"
          >
            <div className="bg-green-50 border-4 border-green-200 rounded-3xl p-8 max-w-sm w-full mb-6 relative">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Star className="w-5 h-5 text-green-600" />
                <span className="text-green-700 font-bold text-sm">New Discovery!</span>
              </div>
              <h2 className="text-2xl font-heading text-green-800 mb-6">Passport Stamp Earned!</h2>
              <div className="flex justify-center mb-6">
                <PassportStamp 
                  city="Paris"
                  date={new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}
                  color="#16a34a"
                  rotation={-5}
                />
              </div>
              <p className="text-slate-700 text-base">You've discovered <strong>Paris</strong>!</p>
              <p className="text-slate-500 text-sm mt-1">This city has been added to your passport.</p>
            </div>
            
            <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-full shadow-md border-2 border-green-200 mb-8" data-testid="status-discovery">
              <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
              <span className="text-xl font-bold text-slate-700">Cities Discovered: <span className="text-green-600">{collectedCardIds.length} / 101</span></span>
            </div>

            <Button 
              onClick={() => setStage("SLIDE_A")}
              className="w-full max-w-sm bg-green-500 hover:bg-green-600 text-white text-xl font-bold py-8 rounded-3xl border-b-8 border-green-700 active:border-b-0 active:translate-y-2 transition-all shadow-lg"
              data-testid="button-continue-onboarding"
            >
              Continue
            </Button>
          </motion.div>
        )}

        {stage === "SLIDE_A" && (
          <OnboardingSlide 
            character={penguinCharacter}
            title="Daily Quest"
            description="Every day there's a mystery city. Use clues to guess the destination and earn a passport stamp."
            bgColor="from-blue-400 to-indigo-500"
            footer="Come back every day to build your explorer streak."
            items={[
              { icon: <Check className="w-4 h-4" />, label: "3 New Clues" },
              { icon: <MapPin className="w-4 h-4" />, label: "101+ Cities" },
              { icon: <Star className="w-4 h-4" />, label: "Passport Stamps" },
              { icon: <Trophy className="w-4 h-4" />, label: "Daily Rewards" }
            ]}
            onNext={() => setStage("SLIDE_B")}
            testId="slide-daily-quest"
          />
        )}

        {stage === "SLIDE_B" && (
          <OnboardingSlide 
            character={pandaCharacter}
            title="Explore Every City"
            description="After discovering a city, play mini-games to learn about it."
            bgColor="from-green-400 to-emerald-500"
            footer="Earn stars to master each city."
            items={[
              { icon: <Globe className="w-4 h-4" />, label: "Map Me" },
              { icon: <Check className="w-4 h-4" />, label: "Flag Quiz" },
              { icon: <Compass className="w-4 h-4" />, label: "City Vibe" },
              { icon: <ArrowRight className="w-4 h-4" />, label: "Spin Globe" }
            ]}
            onNext={() => setStage("SLIDE_C")}
            testId="slide-explore-cities"
          />
        )}

        {stage === "SLIDE_C" && (
          <OnboardingSlide 
            character={llamaCharacter}
            title="Your Explorer Journey"
            description="Become a Master Explorer by completing all four stages of the journey."
            bgColor="from-pink-400 to-rose-500"
            buttonText="Explore Paris"
            onNext={completeJourney}
            testId="slide-explorer-journey"
            fullJourney
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function OnboardingSlide({ 
  character, 
  title, 
  description, 
  bgColor, 
  footer, 
  items, 
  onNext, 
  buttonText = "Next",
  testId,
  fullJourney = false
}: { 
  character?: string, 
  title: string, 
  description: string, 
  bgColor: string, 
  footer?: string, 
  items?: {icon: React.ReactNode, label: string}[], 
  onNext: () => void,
  buttonText?: string,
  testId?: string,
  fullJourney?: boolean
}) {
  return (
    <motion.div 
      key={title}
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      className={`min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br ${bgColor} text-white text-center`}
      data-testid={testId}
    >
      <div className="w-full max-w-lg bg-white/10 backdrop-blur-md rounded-[2.5rem] p-8 md:p-12 border-4 border-white/20 shadow-2xl relative">
        {character && (
          <motion.img 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            src={character} 
            className="w-32 h-32 md:w-48 md:h-48 object-contain rounded-2xl shadow-lg bg-white/60 mx-auto -mt-24 md:-mt-36 mb-6" 
            alt="Character" 
          />
        )}

        <h2 className="text-3xl md:text-5xl font-heading mb-4">{title}</h2>
        <p className="text-lg md:text-xl text-white/90 mb-8 leading-relaxed">{description}</p>

        {items && (
          <div className="grid grid-cols-2 gap-3 mb-8">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-2 bg-black/20 rounded-2xl p-3 text-left border border-white/20">
                <div className="bg-white/30 rounded-full p-1.5">{item.icon}</div>
                <span className="font-bold text-sm md:text-base">{item.label}</span>
              </div>
            ))}
          </div>
        )}

        {fullJourney && (
          <div className="space-y-4 mb-8 text-left">
            <JourneyStep num={1} title="Discover" desc="Solve the Daily Quest to discover a city" icon={<Compass className="w-5 h-5" />} />
            <JourneyStep num={2} title="Learn" desc="Play challenges to learn about the place" icon={<BookOpen className="w-5 h-5" />} />
            <JourneyStep num={3} title="Remember" desc="Earn stars to master the city" icon={<Star className="w-5 h-5" />} />
            <JourneyStep num={4} title="Visit" desc="Explore the destination in GeoAdventures" icon={<Globe className="w-5 h-5" />} />
          </div>
        )}

        {footer && <p className="text-white/80 font-bold mb-8 italic">"{footer}"</p>}

        <Button 
          onClick={onNext}
          className="w-full bg-white text-slate-800 hover:bg-slate-50 text-xl font-bold py-8 rounded-3xl shadow-xl border-b-8 border-slate-300 active:border-b-0 active:translate-y-2 transition-all"
          data-testid={`button-${buttonText.toLowerCase().replace(' ', '-')}`}
        >
          {buttonText} {buttonText === "Next" && <ArrowRight className="ml-2 w-6 h-6" />}
        </Button>
      </div>
    </motion.div>
  );
}

function JourneyStep({ num, title, desc, icon }: { num: number, title: string, desc: string, icon: React.ReactNode }) {
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-yellow-500",
    "bg-purple-500"
  ];
  
  return (
    <div className="flex gap-4 items-center bg-white/20 rounded-2xl p-4">
      <div className={`${colors[num-1]} w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0`}>
        {icon}
      </div>
      <div>
        <h4 className="font-black text-lg leading-none mb-1">{num}. {title}</h4>
        <p className="text-white/80 text-sm leading-tight">{desc}</p>
      </div>
    </div>
  );
}
