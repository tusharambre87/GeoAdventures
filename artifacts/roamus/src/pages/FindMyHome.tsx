import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Star, Trophy, Volume2, VolumeX, Lock, CheckCircle, Award, Play, RotateCcw } from "lucide-react";
import LearningSummary, { getGameLearningPoints } from "@/components/LearningSummary";
import confetti from "canvas-confetti";
import { useUser } from "@/lib/userContext";
import { soundManager } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { FIND_MY_HOME_DATA, Buddy } from "@/lib/findMyHomeData";
import { useSessionOptional } from "@/lib/sessionContext";
import { recordGamePlayed } from "@/components/TravelModeReminders";

import { getCityMapUrl } from "@/lib/cityMaps";

import { Input } from "@/components/ui/input";
import certificateBg from "@assets/generated_images/fun_colorful_certificate_border_for_kids.png";
import chinaMap from "@assets/image_1764692657002.png";
import australiaMap from "@assets/Gemini_Generated_Image_13clci13clci13cl_1764692907489.png";
import indiaMap from "@assets/Gemini_Generated_Image_yt05vyt05vyt05vy_1764692971899.png";
import russiaMap from "@assets/Gemini_Generated_Image_6eki2e6eki2e6eki_1764693022174.png";
import peruMap from "@assets/Gemini_Generated_Image_oskm6roskm6roskm_1764693084149.png";
import japanMap from "@assets/Gemini_Generated_Image_ur67laur67laur67_1764693128761.png";
import antarcticaMap from "@assets/Gemini_Generated_Image_inelscinelscinel_1764693201213.png";
import brazilMap from "@assets/Gemini_Generated_Image_ncthwpncthwpncth_1764693723516.png";
import franceMap from "@assets/Gemini_Generated_Image_mck1xlmck1xlmck1_1764693968583.png";
import usaMap from "@assets/Gemini_Generated_Image_g548zog548zog548_1764693973167.png";
import canadaMap from "@assets/Gemini_Generated_Image_tzfcyctzfcyctzfc_1764693993980.png";
import kenyaMap from "@assets/Gemini_Generated_Image_vdv6l2vdv6l2vdv6_1764694307864.png";
import egyptMap from "@assets/Gemini_Generated_Image_e9k7n2e9k7n2e9k7_1764694314600.png";
import icelandMap from "@assets/Gemini_Generated_Image_t2a3wet2a3wet2a3_1764694339684.png";
import newZealandMap from "@assets/Gemini_Generated_Image_b0nd52b0nd52b0nd_1764694542183.png";
import argentinaMap from "@assets/Gemini_Generated_Image_rmgnmsrmgnmsrmgn_1764694545631.png";
import norwayMap from "@assets/Gemini_Generated_Image_5mb0u65mb0u65mb0_1764694909687.png";
import italyMap from "@assets/Gemini_Generated_Image_hz90f3hz90f3hz90_1764694918681.png";
import mexicoMap from "@assets/Gemini_Generated_Image_lmo9pxlmo9pxlmo9_1764695006601.png";
import thailandMap from "@assets/Gemini_Generated_Image_hubxb6hubxb6hubx_1764695050186.png";
import spainMap from "@assets/Gemini_Generated_Image_urau78urau78urau_1764695059194.png";
import germanyMap from "@assets/Gemini_Generated_Image_8u2fhd8u2fhd8u2f_1764695106707.png";
import southKoreaMap from "@assets/Gemini_Generated_Image_kc23gukc23gukc23_1764695150697.png";

// Import Generated Images
import pandaImg from "@assets/generated_images/cute_cartoon_panda_sticker.png";
import ninjaCatImg from "@assets/generated_images/cute_cartoon_ninja_cat_sticker.png";
import koalaImg from "@assets/generated_images/cute_cartoon_koala_sticker.png";
import penguinImg from "@assets/generated_images/cute_cartoon_penguin_sticker.png";
import llamaImg from "@assets/Gemini_Generated_Image_4qdth74qdth74qdt_1764695932770.png";
import pupImg from "@assets/Gemini_Generated_Image_74v52y74v52y74v5_1764695216463.png";
import mouseImg from "@assets/Gemini_Generated_Image_he5t4ahe5t4ahe5t_1764695309306.png";
import lionImg from "@assets/Gemini_Generated_Image_21bjom21bjom21bj_1764695433483.png";
import pharaohCamelImg from "@assets/Gemini_Generated_Image_3ryavy3ryavy3rya_1764696076840.png";
import parrotImg from "@assets/Gemini_Generated_Image_423zpj423zpj423z_1764695370957.png";
import polarBearImg from "@assets/Gemini_Generated_Image_sbdla0sbdla0sbdl_1764695793246.png";
import tigerImg from "@assets/Gemini_Generated_Image_j8g0ngj8g0ngj8g0_1764695476649.png";
import puffinImg from "@assets/Gemini_Generated_Image_ypzd7cypzd7cypzd_1764695888236.png";
import kiwiImg from "@assets/Gemini_Generated_Image_jfd730jfd730jfd7_1764695722138.png";
import tangoFoxImg from "@assets/Gemini_Generated_Image_toinuntoinuntoin_1764696041798.png";

// Map images for specific IDs (others will use generic placeholders)
const BUDDY_IMAGES: Record<string, string> = {
    "panda": pandaImg,
    "ninja-cat": ninjaCatImg,
    "koala": koalaImg,
    "penguin": penguinImg,
    "fiesta-llama": llamaImg,
    "cowboy-pup": pupImg,
    "eiffel-mouse": mouseImg,
    "safari-lion": lionImg,
    "pharaoh-camel": pharaohCamelImg,
    "samba-parrot": parrotImg,
    "snowy-bear": polarBearImg,
    "taj-tiger": tigerImg,
    "viking-puffin": puffinImg,
    "kiwi-bird": kiwiImg,
    "tango-fox": tangoFoxImg
};

function safeSpeech(text: string, rate = 0.9, pitch = 1.0) {
  if (typeof window === "undefined" || !window.SpeechSynthesisUtterance || !window.speechSynthesis) return;
  const utterance = new window.SpeechSynthesisUtterance(text);
  utterance.rate = rate;
  utterance.pitch = pitch;
  window.speechSynthesis.speak(utterance);
}

export default function FindMyHome() {
  const [, setLocation] = useLocation();
  const fromPage = new URLSearchParams(window.location.search).get('from');
  const { stats, unlockFindMyHomeBuddy, addStars, syncStatsToBackend } = useUser();
  const session = useSessionOptional();
  
  const unlockedIds = stats.findMyHomeUnlockedIds || [];

  const [view, setView] = useState<"INTRO" | "GAME" | "BOOK" | "CERTIFICATE">("INTRO");
  const [childName, setChildName] = useState("");
  const [nameSubmitted, setNameSubmitted] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Practice mode - for replaying after completing the game
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [practiceOrder, setPracticeOrder] = useState<typeof FIND_MY_HOME_DATA>([]);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practiceComplete, setPracticeComplete] = useState(false);
  
  // Find the next locked buddy (for first-time play)
  const currentBuddyIndex = FIND_MY_HOME_DATA.findIndex(b => !unlockedIds.includes(b.id));
  const isComplete = currentBuddyIndex === -1;
  const normalBuddy = isComplete ? null : FIND_MY_HOME_DATA[currentBuddyIndex];
  
  // Get the active buddy - either from practice mode or normal progression
  const currentBuddy = isPracticeMode ? practiceOrder[practiceIndex] : normalBuddy;

  const [isAutoSpeechMuted, setIsAutoSpeechMuted] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('geoquest_auto_speech_muted') === 'true';
    }
    return false;
  });
  
  const toggleAutoSpeechMute = () => {
    setIsAutoSpeechMuted(prev => {
      const newValue = !prev;
      localStorage.setItem('geoquest_auto_speech_muted', String(newValue));
      if (newValue) {
        soundManager.stopSpeaking();
      }
      return newValue;
    });
  };

  useEffect(() => {
    if (!window.speechSynthesis) return;
    const checkSpeaking = setInterval(() => {
        setIsSpeaking(window.speechSynthesis?.speaking ?? false);
    }, 200);
    return () => clearInterval(checkSpeaking);
  }, []);

  // Shuffle options when buddy changes
  useEffect(() => {
      if (currentBuddy) {
          setShuffledOptions([...currentBuddy.options].sort(() => Math.random() - 0.5));
          setSelectedOption(null);
          setShowSuccess(false);
      }
  }, [currentBuddy?.id]);

  // Track game time for analytics
  useEffect(() => {
    if (view === "GAME" && session) {
      session.startGameTimer();
    } else if (view !== "GAME" && session) {
      session.stopGameTimer();
    }
  }, [view, session]);

  // Start practice mode - shuffle all buddies for review
  const startPracticeMode = () => {
    const shuffled = [...FIND_MY_HOME_DATA].sort(() => Math.random() - 0.5);
    setPracticeOrder(shuffled);
    setPracticeIndex(0);
    setPracticeComplete(false);
    setIsPracticeMode(true);
    setSelectedOption(null);
    setShowSuccess(false);
    setView("GAME");
  };

  // Move to next buddy in practice mode
  const goToNextPracticeBuddy = () => {
    if (practiceIndex < practiceOrder.length - 1) {
      setPracticeIndex(prev => prev + 1);
      setSelectedOption(null);
      setShowSuccess(false);
    } else {
      // Practice complete
      setPracticeComplete(true);
    }
  };

  const handleOptionClick = (option: string) => {
      if (!currentBuddy || showSuccess) return;
      
      setSelectedOption(option);
      
      if (option === currentBuddy.country) {
          // Correct!
          soundManager.playSuccess();
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          setShowSuccess(true);
          
          // Speak the logic
          // Format: [Character Name] [fun fact lowercased without period] in [Country].
          // Example: "Tango Cat dances on tiny paws in Argentina."
          
          // Remove trailing period if exists
          let fact = currentBuddy.funFact.endsWith('.') ? currentBuddy.funFact.slice(0, -1) : currentBuddy.funFact;
          // Lowercase first letter
          fact = fact.charAt(0).toLowerCase() + fact.slice(1);
          
          const sentence = `${currentBuddy.name} ${fact} in ${currentBuddy.country}.`;
          
          if (!isAutoSpeechMuted) {
            safeSpeech(sentence, 0.9, 1.2);
          }

          if (isPracticeMode) {
            // In practice mode - just move to next buddy after delay, no stars/unlocking
            setTimeout(() => {
              goToNextPracticeBuddy();
            }, 2000);
          } else {
            // Normal mode - unlock and add stars
            setTimeout(() => {
               unlockFindMyHomeBuddy(currentBuddy.id);
               addStars(1);
               
               // Track analytics event
               import('@/lib/analytics').then(({ trackGameEvent }) => {
                 trackGameEvent('find_my_home_complete', 'find_my_home', {
                   starsEarned: 1,
                   completed: true,
                   won: true,
                 });
               });
               
               // Sync stats to backend
               setTimeout(() => syncStatsToBackend(), 500);
            }, 2000);
          }
      } else {
          // Wrong
          soundManager.playError();
          if (!isAutoSpeechMuted) {
            safeSpeech("Oops! Try again!");
          }
          setTimeout(() => setSelectedOption(null), 1000);
      }
  };

  const playVoiceLine = (buddy: Buddy) => {
      if (isAutoSpeechMuted) return;
      safeSpeech(buddy.voiceLine, 0.9, 1.1);
  };

  const getBuddyImage = (id: string) => {
      return BUDDY_IMAGES[id] || `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`; 
  };

  const getMapForOption = (option: string) => {
      const opt = option.toLowerCase();
      if (opt === "china") return chinaMap;
      if (opt === "australia") return australiaMap;
      if (opt === "india") return indiaMap;
      if (opt === "russia") return russiaMap;
      if (opt === "peru") return peruMap;
      if (opt === "japan") return japanMap;
      if (opt === "antarctica") return antarcticaMap;
      if (opt === "brazil") return brazilMap;
      if (opt === "france") return franceMap;
      if (opt === "united states" || opt === "usa") return usaMap;
      if (opt === "canada") return canadaMap;
      if (opt === "kenya") return kenyaMap;
      if (opt === "egypt") return egyptMap;
      if (opt === "iceland") return icelandMap;
      if (opt === "new zealand") return newZealandMap;
      if (opt === "argentina") return argentinaMap;
      if (opt === "norway") return norwayMap;
      if (opt === "italy") return italyMap;
      if (opt === "mexico") return mexicoMap;
      if (opt === "thailand") return thailandMap;
      if (opt === "spain") return spainMap;
      if (opt === "germany") return germanyMap;
      if (opt === "south korea") return southKoreaMap;
      
      return getCityMapUrl("", option);
  };

  return (
    <div className="min-h-screen bg-sky-100 dark:bg-gray-900 flex flex-col items-center py-4 px-4 font-sans select-none overflow-y-auto">
      <div className="w-full max-w-md flex flex-col items-center min-h-full pb-20">
      {/* Header */}
      <div className="w-full max-w-md flex items-center justify-between mb-4">
        <Button variant="ghost" onClick={() => setLocation(fromPage || "/play-games")} className="text-slate-600 dark:text-slate-300 p-0 hover:bg-transparent">
          <ArrowLeft className="w-8 h-8" />
        </Button>
        
        <div className="flex items-center gap-2 bg-yellow-400 px-4 py-2 rounded-full shadow-md border-2 border-yellow-500">
            <Star className="w-6 h-6 fill-white text-white" />
            <span className="font-bold text-yellow-900 text-xl">
              {isPracticeMode ? `${practiceIndex + 1}/${practiceOrder.length}` : `${unlockedIds.length}/${FIND_MY_HOME_DATA.length}`}
            </span>
            {isPracticeMode && (
              <span className="text-xs bg-yellow-600 text-white px-2 py-0.5 rounded-full ml-1">Practice</span>
            )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={toggleAutoSpeechMute}
            className={cn(
              "rounded-full p-2",
              isAutoSpeechMuted 
                ? "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400" 
                : "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300"
            )}
            data-testid="button-mute-auto-speech"
            title={isAutoSpeechMuted ? "Unmute" : "Mute"}
          >
            {isAutoSpeechMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
          </Button>
          
          <Button 
              variant="ghost" 
              onClick={() => setView(view === "GAME" ? "BOOK" : "GAME")}
              className="bg-white/50 dark:bg-gray-700/50 p-2 rounded-full"
          >
              {view === "GAME" ? <Trophy className="w-8 h-8 text-orange-500" /> : <Volume2 className="w-8 h-8 text-blue-500" />}
          </Button>
        </div>
      </div>

      {/* Views */}
      <AnimatePresence mode="wait">

        {/* === INTRO VIEW === */}
        {view === "INTRO" && (
          <motion.div 
            key="intro"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="flex flex-col items-center justify-center min-h-[60vh] w-full"
          >
             {/* Title Section */}
             <motion.div
               initial={{ y: -20, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               transition={{ delay: 0.2 }}
               className="text-center mb-6"
             >
               <h1 className="text-4xl font-heading text-sky-800 dark:text-sky-300 mb-2">Find My Home</h1>
               <div className="inline-flex items-center gap-2 bg-amber-100 dark:bg-amber-900/50 px-4 py-1.5 rounded-full border-2 border-amber-300 dark:border-amber-600">
                 <span className="text-amber-700 dark:text-amber-300 font-bold text-sm">Ages 3+</span>
               </div>
             </motion.div>

             {/* Bouncing Buddies Carousel */}
             <div className="flex items-end justify-center gap-4 h-40 mb-6 w-full">
                {/* Panda - Bouncing */}
                <motion.div
                   animate={{ y: [0, -20, 0] }}
                   transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                   className="relative w-28 h-28"
                >
                   <img src={pandaImg} alt="Panda" className="w-full h-full object-contain drop-shadow-xl" loading="lazy" />
                </motion.div>

                {/* Ninja Cat - Peeking */}
                <motion.div
                   initial={{ y: 40 }}
                   animate={{ y: [40, 0, 40] }}
                   transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                   className="relative w-28 h-28 z-0"
                >
                   <img src={ninjaCatImg} alt="Ninja Cat" className="w-full h-full object-contain drop-shadow-xl" loading="lazy" />
                </motion.div>

                {/* Koala - Swinging */}
                <motion.div
                   animate={{ rotate: [-10, 10, -10] }}
                   transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                   style={{ transformOrigin: "top center" }}
                   className="relative w-28 h-28"
                >
                   <img src={koalaImg} alt="Koala" className="w-full h-full object-contain drop-shadow-xl" loading="lazy" />
                </motion.div>
             </div>

             {/* Instructions */}
             <motion.div
               initial={{ y: 20, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               transition={{ delay: 0.4 }}
               className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 mb-6 max-w-xs text-center shadow-lg border-2 border-sky-200 dark:border-sky-700"
             >
               <p className="text-sky-800 dark:text-sky-200 font-bold text-lg mb-2">Help the animals find their homes!</p>
               <p className="text-slate-600 dark:text-slate-300 text-sm">
                 Each animal will tell you a clue. Tap the country where they live!
               </p>
             </motion.div>

             {/* Big Play Button or Practice Button */}
             {isComplete ? (
               <>
                 <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                        soundManager.playDing();
                        startPracticeMode();
                    }}
                    className="w-28 h-28 bg-green-500 rounded-full shadow-[0_10px_0_rgb(21,128,61)] active:shadow-none active:translate-y-[10px] flex items-center justify-center border-4 border-white z-20 group"
                 >
                    <RotateCcw className="w-12 h-12 text-white group-hover:scale-110 transition-transform" />
                 </motion.button>
                 
                 <p className="text-sky-600 dark:text-sky-400 font-bold mt-4 text-sm">Practice Again!</p>
                 <p className="text-sky-500 dark:text-sky-500 text-xs mt-1">Your stickers are safe 🎖️</p>
               </>
             ) : (
               <>
                 <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                        soundManager.playDing();
                        setView("GAME");
                    }}
                    className="w-28 h-28 bg-green-500 rounded-full shadow-[0_10px_0_rgb(21,128,61)] active:shadow-none active:translate-y-[10px] flex items-center justify-center border-4 border-white z-20 group"
                 >
                    <Play className="w-14 h-14 fill-white text-white ml-2 group-hover:scale-110 transition-transform" />
                 </motion.button>
                 
                 <p className="text-sky-600 dark:text-sky-400 font-bold mt-4 text-sm">Tap to Start!</p>
               </>
             )}
          </motion.div>
        )}
        
        {/* === GAME VIEW === */}
        {view === "GAME" && currentBuddy && !practiceComplete && (
            <motion.div 
                key="game"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="w-full max-w-md flex flex-col items-center"
            >
                <h1 className="text-3xl font-heading text-sky-900 mb-2 text-center">Find My Home</h1>
                
                {/* Character Card */}
                <div className="bg-white p-6 rounded-[2rem] shadow-xl border-4 border-sky-200 w-full aspect-[4/5] flex flex-col items-center justify-center mb-6 relative overflow-hidden">
                    {/* Background Decor */}
                    <div className="absolute top-0 left-0 w-full h-1/2 bg-sky-50 rounded-b-[50%] -z-0" />
                    
                    <div className="relative w-48 h-48 mb-4 z-10 transition-transform duration-500 hover:scale-105">
                        <div className="absolute inset-0 bg-[#FFFDD0] rounded-full shadow-inner opacity-100 scale-90" />
                        <img 
                            src={getBuddyImage(currentBuddy.id)} 
                            alt={currentBuddy.name}
                            className="w-full h-full object-contain relative z-10 drop-shadow-lg"
                        />
                    </div>
                    
                    <div className="flex items-center justify-center gap-2 mb-2 z-10">
                        <h2 className="text-2xl font-bold text-slate-800">{currentBuddy.name}</h2>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 rounded-full bg-sky-100 hover:bg-sky-200 text-sky-600"
                            onClick={() => {
                                if (isSpeaking) {
                                    soundManager.stopSpeaking();
                                } else {
                                    soundManager.speak(currentBuddy.storyHook);
                                }
                            }}
                        >
                            {isSpeaking ? <VolumeX className="w-5 h-5 text-red-500" /> : <Volume2 className="w-5 h-5" />}
                        </Button>
                    </div>
                    <p className="text-slate-500 text-center z-10 max-w-[80%] font-medium text-lg">
                        "{currentBuddy.storyHook}"
                    </p>
                    
                    {showSuccess && (
                        <motion.div 
                            initial={{ scale: 0 }} 
                            animate={{ scale: 1 }}
                            className="absolute inset-0 bg-green-500/90 z-20 flex flex-col items-center justify-center text-white"
                        >
                            <CheckCircle className="w-24 h-24 mb-4" />
                            <h2 className="text-4xl font-bold mb-2">Correct!</h2>
                            <p className="text-xl">{currentBuddy.country}</p>
                        </motion.div>
                    )}
                </div>

                {/* Question */}
                <h3 className="text-xl font-bold text-sky-800 mb-4 text-center bg-white/50 px-6 py-2 rounded-full">
                    Does {currentBuddy.name.split(" ")[0]} live in...
                </h3>

                {/* Options */}
                <div className="grid grid-cols-2 gap-4 w-full">
                    {shuffledOptions.map(option => (
                        <Button
                            key={option}
                            onClick={() => handleOptionClick(option)}
                            disabled={showSuccess}
                            className={cn(
                                "h-48 flex flex-col items-center justify-center text-xl font-bold rounded-3xl shadow-lg border-b-8 transition-all active:border-b-0 active:translate-y-2 whitespace-normal leading-tight p-4 gap-2",
                                selectedOption === option 
                                    ? (option === currentBuddy.country ? "bg-green-500 hover:bg-green-600 border-green-700 text-white" : "bg-red-500 hover:bg-red-600 border-red-700 text-white")
                                    : "bg-white hover:bg-sky-50 border-slate-200 text-slate-700"
                            )}
                        >
                            <span className="text-center">{option}</span>
                            <img 
                                src={getMapForOption(option)} 
                                alt={`Map of ${option}`}
                                className="w-32 h-32 object-contain opacity-80"
                            />
                        </Button>
                    ))}
                </div>
            </motion.div>
        )}

        {/* === PRACTICE MODE COMPLETE VIEW === */}
        {view === "GAME" && isPracticeMode && practiceComplete && (
             <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md flex flex-col items-center text-center pt-10"
            >
                <Trophy className="w-32 h-32 text-yellow-500 mb-6 animate-bounce" />
                <h1 className="text-4xl font-heading text-sky-900 dark:text-sky-200 mb-4">Great Practice!</h1>
                <p className="text-xl text-sky-700 dark:text-sky-300 mb-8 font-medium">
                    You reviewed all 15 animals and their homes!
                </p>
                
                <div className="flex flex-col gap-4 w-full">
                    <Button 
                        onClick={startPracticeMode}
                        className="w-full h-14 text-xl font-bold bg-green-500 hover:bg-green-600 text-white rounded-xl shadow-lg"
                    >
                        🔄 Practice Again
                    </Button>
                    <Button 
                        onClick={() => setView("BOOK")}
                        className="w-full h-14 text-xl font-bold bg-blue-500 hover:bg-blue-600 text-white rounded-xl shadow-lg"
                    >
                        📖 Souvenir Book
                    </Button>
                    <Button 
                        onClick={() => {
                          setIsPracticeMode(false);
                          setPracticeComplete(false);
                          setView("INTRO");
                        }}
                        variant="outline"
                        className="w-full h-12 text-lg font-bold rounded-xl"
                    >
                        Back to Menu
                    </Button>
                </div>
            </motion.div>
        )}

        {/* === COMPLETED VIEW (NAME INPUT) === */}
        {view === "GAME" && isComplete && !isPracticeMode && !nameSubmitted && (
             <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md flex flex-col items-center text-center pt-10"
            >
                <Award className="w-32 h-32 text-yellow-500 mb-6 animate-bounce" />
                <h1 className="text-4xl font-heading text-sky-900 mb-4">Super Geo Explorer!</h1>
                <p className="text-xl text-sky-700 mb-8 font-medium">
                    You've found a home for all 15 buddies!
                </p>
                
                <div className="bg-white p-6 rounded-[2rem] shadow-xl border-4 border-yellow-400 w-full mb-8">
                    <h3 className="text-xl font-bold text-yellow-600 mb-4">Enter your name for the certificate!</h3>
                    <Input 
                        type="text" 
                        placeholder="Your Name" 
                        value={childName}
                        onChange={(e) => setChildName(e.target.value)}
                        className="text-center text-2xl font-bold h-14 rounded-xl border-2 border-yellow-200 mb-4 focus-visible:ring-yellow-400"
                    />
                    <Button 
                        onClick={() => {
                            if (childName.trim()) {
                                setNameSubmitted(true);
                                setView("CERTIFICATE");
                                soundManager.playFanfare();
                                confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
                            }
                        }}
                        className="w-full h-14 text-xl font-bold bg-green-500 hover:bg-green-600 text-white rounded-xl shadow-lg"
                        disabled={!childName.trim()}
                    >
                        Create Certificate
                    </Button>
                </div>
            </motion.div>
        )}

        {/* === CERTIFICATE VIEW === */}
        {view === "CERTIFICATE" && (
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-2xl flex flex-col items-center"
            >
                <h1 className="text-3xl font-heading text-sky-900 mb-6 text-center">Your Certificate</h1>
                
                <div className="relative w-full aspect-[4/3] bg-white rounded-xl shadow-2xl overflow-hidden mb-8">
                    <img src={certificateBg} alt="Certificate Border" className="w-full h-full object-cover" />
                    
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12">
                        <h2 className="text-3xl sm:text-5xl font-heading text-orange-500 drop-shadow-md mb-2" style={{ fontFamily: 'Fredoka, sans-serif' }}>SUPER GEO</h2>
                        <h2 className="text-3xl sm:text-5xl font-heading text-green-500 drop-shadow-md mb-4" style={{ fontFamily: 'Fredoka, sans-serif' }}>EXPLORER</h2>
                        
                        <p className="text-slate-600 font-medium mb-6 text-sm sm:text-base">Awarded for exploring the world with GeoQuest!</p>
                        
                        <div className="relative mb-8">
                            <h1 className="text-4xl sm:text-6xl text-black transform -rotate-2" style={{ fontFamily: "'Dancing Script', cursive" }}>
                                {childName}
                            </h1>
                        </div>
                        
                        <div className="flex gap-4 mt-auto">
                             <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center border-4 border-blue-300 relative overflow-hidden">
                                <div className="absolute inset-0 bg-[#FFFDD0]" />
                                <img src={pandaImg} className="w-12 h-12 object-contain relative z-10" />
                             </div>
                             <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center border-4 border-green-300">
                                <Trophy className="w-8 h-8 text-yellow-500" />
                             </div>
                        </div>
                    </div>
                </div>

                {/* Learning Summary */}
                <div className="w-full max-w-md mb-6">
                    <LearningSummary points={getGameLearningPoints("find-my-home")} />
                </div>
                
                <div className="flex flex-col gap-3 w-full max-w-md">
                    <Button 
                        onClick={startPracticeMode}
                        className="w-full h-14 text-xl font-bold bg-green-500 hover:bg-green-600 text-white rounded-xl shadow-lg"
                    >
                        🔄 Practice Again
                    </Button>
                    <div className="flex gap-4">
                        <Button 
                            onClick={() => setView("BOOK")}
                            className="flex-1 h-14 text-xl font-bold bg-blue-500 hover:bg-blue-600 text-white rounded-xl shadow-lg"
                        >
                            Souvenir Book
                        </Button>
                        <Button 
                            onClick={() => window.print()}
                            className="flex-1 h-14 text-xl font-bold bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl shadow-lg"
                        >
                            Print
                        </Button>
                    </div>
                </div>
            </motion.div>
        )}

        {/* === SOUVENIR BOOK VIEW === */}
        {view === "BOOK" && (
            <motion.div 
                key="book"
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className="w-full max-w-md"
            >
                <h1 className="text-3xl font-heading text-sky-900 mb-6 text-center">My World Souvenir Book</h1>
                
                <div className="grid grid-cols-3 gap-4 pb-20">
                    {FIND_MY_HOME_DATA.map((buddy) => {
                        const isUnlocked = unlockedIds.includes(buddy.id);
                        return (
                            <div 
                                key={buddy.id}
                                onClick={() => isUnlocked && playVoiceLine(buddy)}
                                className={cn(
                                    "aspect-square rounded-2xl flex flex-col items-center justify-center p-2 relative shadow-md border-2 transition-all",
                                    isUnlocked 
                                        ? "bg-white border-white cursor-pointer hover:scale-105 active:scale-95" 
                                        : "bg-slate-200 border-slate-300 opacity-70"
                                )}
                            >
                                {isUnlocked ? (
                                    <>
                                        <div className="absolute inset-2 bg-[#FFFDD0] rounded-full opacity-80" />
                                        <img src={getBuddyImage(buddy.id)} alt={buddy.name} className="w-full h-full object-contain relative z-10" />
                                        <div className="absolute bottom-1 right-1 bg-yellow-400 rounded-full p-1 shadow-sm z-20">
                                            <Volume2 className="w-3 h-3 text-yellow-900" />
                                        </div>
                                    </>
                                ) : (
                                    <Lock className="w-8 h-8 text-slate-400" />
                                )}
                            </div>
                        );
                    })}
                </div>
                
                <Button 
                    onClick={() => setView("GAME")}
                    className="w-full h-14 text-xl font-bold bg-sky-500 hover:bg-sky-600 text-white rounded-2xl shadow-lg mb-8"
                >
                    Back to Game
                </Button>
            </motion.div>
        )}

      </AnimatePresence>
      </div>
    </div>
  );
}
