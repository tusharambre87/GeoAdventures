import { useState, useEffect, useMemo, useRef } from "react";
import type { TravelTrip } from "@shared/schema";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ExplorerXPBar } from "@/components/ExplorerXPBar";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Compass, Play, BookOpen, Star, X, ChevronLeft, ChevronRight, Globe, Award, MapPin, UserPlus, Trophy, Calendar, Sparkles, Grid3X3, Users, Check, Bell, HelpCircle, Gem, Gamepad2, Menu, Sun, Moon, User, Crown, Shield, Headphones } from "lucide-react";
import confetti from 'canvas-confetti';
import { toast } from "sonner";
import bgImage from "@assets/generated_images/playful_hand-drawn_world_adventure_map_pattern.png";
import geoQuestLogo from "@assets/geoquest_logo.png";
import pandaCharacter from "@assets/generated_images/cute_cartoon_panda_sticker.png";
import penguinCharacter from "@assets/generated_images/cute_cartoon_penguin_sticker.png";
import llamaCharacter from "@assets/characters/llama.png";
import { FirstTimeQuest } from "@/components/FirstTimeQuest";
import { LOCATION_CARDS } from "@/lib/gameData";
import { ALL_PASSPORT_CITIES } from "@/lib/dailyQuestData";
import { getCityImage } from "@/lib/cityImages";
import { SignUpPrompt } from "@/components/SignUpPrompt";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useUser } from "@/lib/userContext";
import { useExplorer } from "@/lib/explorerContext";
import { useLocation } from "wouter";
import { UserHeader } from "@/components/UserHeader";
import { SyncIndicator } from "@/components/SyncIndicator";
import { useParentalGate } from "@/components/ParentalGate";
import { FAQDialog } from "@/components/FAQDialog";
import { PreOrderPopup } from "@/components/PreOrderPopup";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/components/ThemeProvider";

import { soundManager } from "@/lib/sound";
import { usePWA } from "@/hooks/usePWA";
import { useSubscription } from "@/lib/subscriptionContext";
import { Download, Smartphone } from "lucide-react";
import { DownloadBanner } from "@/components/PWAComponents";
import { EndOfDayRecap, useEndOfDayRecap } from "@/components/EndOfDayRecap";
import { useFreeLimits } from "@/hooks/useFreeLimits";
import { PhysicalGameEarlyAccessModal } from "@/components/PhysicalGameEarlyAccessModal";
import { EarlyExplorerOfferModal } from "@/components/EarlyExplorerOfferModal";
import { PrivacySettingsMenu } from "@/components/PrivacySettingsMenu";
import { usePhysicalGamePopup } from "@/hooks/usePhysicalGamePopup";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useSubscription as useSubscriptionHook } from "@/hooks/useSubscription";
import { SpinningCompass } from "@/components/SpinningCompass";
import { setInternalNavToAdventures } from "@/components/GatedTravelMode";
import { useTravel } from "@/lib/travelContext";


interface TooltipStep {
  targetId: string;
  title: string;
  description: string;
  position: string;
}

function TooltipTourOverlay({ 
  step, 
  steps, 
  onNext, 
  onSkip 
}: { 
  step: number; 
  steps: TooltipStep[]; 
  onNext: () => void; 
  onSkip: () => void;
}) {
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0, arrowPosition: "top" });
  const currentStep = steps[step];
  
  useEffect(() => {
    const updatePosition = () => {
      const targetElement = document.getElementById(currentStep.targetId);
      if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        const tooltipWidth = 280;
        const tooltipHeight = 140;
        const padding = 16;
        
        let top = 0;
        let left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
        let arrowPos = "top";
        
        // Position below or above based on step preference and screen space
        if (currentStep.position === "bottom" || rect.top < tooltipHeight + 60) {
          top = rect.bottom + padding;
          arrowPos = "top";
        } else {
          top = rect.top - tooltipHeight - padding;
          arrowPos = "bottom";
        }
        
        // Keep tooltip within screen bounds
        if (left < padding) left = padding;
        if (left + tooltipWidth > window.innerWidth - padding) {
          left = window.innerWidth - tooltipWidth - padding;
        }
        
        // Scroll element into view if needed
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        setTooltipPosition({ top, left, arrowPosition: arrowPos });
      }
    };
    
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);
    
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [currentStep]);
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90]"
    >
      {/* Dark overlay with cutout for highlighted element */}
      <div className="absolute inset-0 bg-black/60" onClick={onSkip} />
      
      {/* Highlight ring around target */}
      <HighlightRing targetId={currentStep.targetId} />
      
      {/* Tooltip */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: tooltipPosition.arrowPosition === "top" ? -10 : 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className="fixed z-[95] w-[280px]"
        style={{ top: tooltipPosition.top, left: tooltipPosition.left }}
      >
        {/* Arrow */}
        <div 
          className={`absolute left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] border-r-[12px] border-l-transparent border-r-transparent ${
            tooltipPosition.arrowPosition === "top" 
              ? "-top-3 border-b-[12px] border-b-white" 
              : "-bottom-3 border-t-[12px] border-t-white"
          }`}
        />
        
        <div className="bg-white rounded-2xl shadow-2xl p-4 border-4 border-yellow-400">
          {/* Step indicator */}
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">
              {step + 1} of {steps.length}
            </span>
            <button 
              onClick={onSkip}
              className="text-gray-400 hover:text-gray-600 text-sm"
            >
              Skip
            </button>
          </div>
          
          {/* Title */}
          <h3 className="font-heading text-lg text-gray-800 mb-1">
            {currentStep.title}
          </h3>
          
          {/* Description */}
          <p className="text-sm text-gray-600 mb-4 leading-relaxed">
            {currentStep.description}
          </p>
          
          {/* Next button */}
          <Button
            onClick={onNext}
            className="w-full bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-white font-bold rounded-xl border-b-4 border-orange-500"
          >
            {step < steps.length - 1 ? "Next" : "Got it!"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function HighlightRing({ targetId }: { targetId: string }) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  
  useEffect(() => {
    const updateRect = () => {
      const element = document.getElementById(targetId);
      if (element) {
        setRect(element.getBoundingClientRect());
      }
    };
    
    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect);
    
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect);
    };
  }, [targetId]);
  
  if (!rect) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed z-[92] pointer-events-none"
      style={{
        top: rect.top - 8,
        left: rect.left - 8,
        width: rect.width + 16,
        height: rect.height + 16,
      }}
    >
      <div className="absolute inset-0 rounded-2xl border-4 border-yellow-400 animate-pulse" />
      <div className="absolute inset-0 rounded-2xl bg-yellow-400/20" />
    </motion.div>
  );
}

// Countdown timer for Daily Quest
function DailyQuestCountdown() {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-rose-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-md z-10"
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      ⏰ Ends in {timeLeft}
    </motion.div>
  );
}

export default function Home() {
  const [showRules, setShowRules] = useState(false);
  
  // Navigation Menu State
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark" || (theme === "system" && typeof window !== 'undefined' && window.matchMedia("(prefers-color-scheme: dark)").matches);
  
  // Auth Context
  const { user, login, collectedCardIds: userCollectedCardIds, collectedCardTimestamps, stats, passportMastery: userPassportMastery, awardPassportStar, currentPlayerId, loadPlayerFromBackend } = useUser();
  const { activeExplorer, loadExplorers, isLoading: explorerLoading, createGuestExplorer, setActiveExplorer, explorers } = useExplorer();
  
  // Sync stats when active explorer changes
  useEffect(() => {
    if (activeExplorer?.id && activeExplorer.id !== currentPlayerId) {
      loadPlayerFromBackend(activeExplorer.id);
    }
  }, [activeExplorer?.id, currentPlayerId, loadPlayerFromBackend]);
  
  // Use explorer-specific collected cards (passport stamps are per explorer)
  // Prefer userCollectedCardIds (live state from userContext) over activeExplorer snapshot
  // This ensures newly collected cards from Daily Quest appear immediately in passport
  const explorerCollectedCards = (activeExplorer?.collectedCardIds as string[]) || [];
  const collectedCardIds = userCollectedCardIds.length >= explorerCollectedCards.length 
    ? userCollectedCardIds 
    : explorerCollectedCards;
  
  // Custom stamps from GeoAdventures trips (outside the 42 predefined cities)
  type CustomStamp = {
    stampId: string;
    stampName: string;
    displayName: string;
    city: string;
    state?: string;
    country: string;
    isUS: boolean;
    tripId: string;
    tripName: string;
    visitedAt: string;
    travelMonth?: number;
    travelYear?: number;
  };
  const customStamps = (activeExplorer?.customStamps as CustomStamp[]) || [];
  
  const [, navigate] = useLocation();
  const isLoggedIn = !!user;
  
  // PWA and Subscription
  const { isInstallable, isInstalled, installApp } = usePWA();
  const { isPro, rawTier } = useSubscription() || {};
  const isFoundingFamily = rawTier === 'founding';
  
  // Redirect authenticated users without active explorer to profile selection
  useEffect(() => {
    if (isLoggedIn && user?.id && !activeExplorer && !explorerLoading) {
      loadExplorers(user.id);
      navigate('/whos-playing');
    }
  }, [isLoggedIn, user?.id, activeExplorer, explorerLoading, loadExplorers, navigate]);
  
  
  
  // Parental Gate
  const { requestAccess } = useParentalGate();
  
  // End of Day Recap
  const { showRecap, closeRecap } = useEndOfDayRecap();
  
  // Game Limit Logic
  const [showPreOrderPopup, setShowPreOrderPopup] = useState(false);
  
  const { isPaidUser, earlyExplorerShown, gameLimitDayCount, markEarlyExplorerShown, hasCompletedPaidTrip } = useFreeLimits();
  const [showEarlyExplorerModal, setShowEarlyExplorerModal] = useState(false);
  
  // Get trial status from subscription hook
  const { isTrialActive, trialDaysRemaining, tier, isLoading: isSubscriptionLoading } = useSubscriptionHook();
  
  // Feature flag for Founding Families system
  const { foundingFamiliesEnabled } = useFeatureFlags();

  const { createTrip, fetchTrip, trips, isLoading: travelLoading } = useTravel();

  // Early Explorer Offer triggers — fires once per user when any condition is met:
  // (a) streak >= 5, (b) user has explicitly paid to unlock a trip (set at purchase time), (c) game limit hit >= 3 days
  useEffect(() => {
    if (earlyExplorerShown) return;
    if (isPaidUser) return;
    const explorerStreak = activeExplorer?.streak ?? 0;
    const streakTrigger = explorerStreak >= 5;
    const gameLimitTrigger = gameLimitDayCount >= 3;
    const paidTripCompletedTrigger = hasCompletedPaidTrip;
    if (streakTrigger || gameLimitTrigger || paidTripCompletedTrigger) {
      const delay = setTimeout(() => setShowEarlyExplorerModal(true), 1500);
      return () => clearTimeout(delay);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeExplorer?.streak, gameLimitDayCount, earlyExplorerShown, isPaidUser, hasCompletedPaidTrip]);
  const [creatingAdventure, setCreatingAdventure] = useState(false);

  // HIDDEN (Phase 6): TripContextScreen auto-redirect disabled — superseded by TodayScreen / StopViewScreen
  // useEffect(() => {
  //   if (travelLoading || trips.length === 0) return;
  //   const activeTrip = trips.find((t: TravelTrip) => {
  //     if (t.adventureContext === "home" || t.status === "completed") return false;
  //     return true;
  //   });
  //   if (!activeTrip) return;
  //   const todayKey = new Date().toISOString().slice(0, 10);
  //   if (sessionStorage.getItem(`trip_ctx_shown_${activeTrip.id}_${todayKey}`)) return;
  //   navigate(`/adventure/${activeTrip.id}/context`);
  // }, [trips, travelLoading, navigate]);

  const { data: templatedCities } = useQuery<{ citySlug: string; cityName: string; country: string; continent: string; stopCount: number }[]>({
    queryKey: ['/api/city-templates/list'],
    staleTime: 24 * 60 * 60 * 1000,
  });

  // Physical Card Game Early Access
  const physicalGamePopup = usePhysicalGamePopup();
  const [showPhysicalGamePopup, setShowPhysicalGamePopup] = useState(false);
  const physicalGamePopupShownRef = useRef(false);
  
  
  // Onboarding State
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Tooltip Tour State
  const [showTooltipTour, setShowTooltipTour] = useState(false);
  const [tooltipStep, setTooltipStep] = useState(0);
  
  const tooltipTourSteps = [
    { targetId: "tour-play-game", title: "Play Guess & Go", description: "Explore cities around the world!", position: "bottom" },
    { targetId: "tour-daily-quest", title: "Daily Challenges", description: "Come back daily for new quests and puzzles!", position: "bottom" },
    { targetId: "tour-passport", title: "Your Passport", description: "Collect stamps and stickers as you explore!", position: "top" },
    { targetId: "tour-find-my-home", title: "Keep Exploring", description: "Discover more games as you play!", position: "top" },
  ];
  
  // Invite Dialog State
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  
  // FAQ Dialog State
  const [showFAQ, setShowFAQ] = useState(false);
  
  // PWA Download Dialog State
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  
  // Pro Coming Soon Dialog State
  const [showProComingSoon, setShowProComingSoon] = useState(false);
  
  
  
  
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [showDisableReminderConfirm, setShowDisableReminderConfirm] = useState(false);
  const [showReminderEmailDialog, setShowReminderEmailDialog] = useState(false);
  const [reminderEmail, setReminderEmail] = useState("");
  const [isSubmittingReminder, setIsSubmittingReminder] = useState(false);
  
  // Check for first-time visitor on mount - only for logged-in users with active explorer
  useEffect(() => {
    if (!isLoggedIn || !activeExplorer) {
      return;
    }
    
    const explorerId = activeExplorer.id;
    const hasSeenOnboarding = localStorage.getItem(`geoquest_onboarding_seen_${explorerId}`);
    
    const explorerCollectedCities = (activeExplorer.collectedCardIds as string[]) || [];
    let hasProgress = explorerCollectedCities.length > 0 || (stats?.gamesPlayed || 0) > 0;
    
    if (!hasProgress) {
      try {
        const guestCollection = localStorage.getItem('geoquest_collection_guest');
        if (guestCollection) {
          const parsed = JSON.parse(guestCollection);
          if (Array.isArray(parsed) && parsed.length > 0) hasProgress = true;
        }
        const guestStats = localStorage.getItem('geoquest_stats_guest');
        if (guestStats) {
          const parsed = JSON.parse(guestStats);
          if (parsed?.gamesPlayed > 0) hasProgress = true;
        }
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('geoquest_collection_explorer_') && key !== `geoquest_collection_explorer_${explorerId}`) {
            const val = localStorage.getItem(key);
            if (val) {
              const parsed = JSON.parse(val);
              if (Array.isArray(parsed) && parsed.length > 0) { hasProgress = true; break; }
            }
          }
          if (key && key.startsWith('geoquest_onboarding_seen_') && key !== `geoquest_onboarding_seen_${explorerId}`) {
            hasProgress = true;
            break;
          }
        }
      } catch {}
    }
    
    if (!hasSeenOnboarding && !hasProgress) {
      setShowOnboarding(true);
    } else if (!hasSeenOnboarding && hasProgress) {
      localStorage.setItem(`geoquest_onboarding_seen_${explorerId}`, 'true');
    }
  }, [isLoggedIn, activeExplorer, stats]);
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('openPassport') === 'true') {
      const tab = params.get('tab');
      window.history.replaceState({}, '', window.location.pathname);
      navigate(tab === 'kit' ? '/passport?tab=kit' : '/passport');
    }
    if (params.get('showHowToPlay') === 'true') {
      window.history.replaceState({}, '', window.location.pathname);
      setShowOnboarding(true);
    }
  }, []);
  
  const completeOnboarding = () => {
    const explorerId = activeExplorer?.id || 'guest';
    localStorage.setItem(`geoquest_onboarding_seen_${explorerId}`, 'true');
    setShowOnboarding(false);
  };
  
  const skipOnboarding = () => {
    const explorerId = activeExplorer?.id || 'guest';
    localStorage.setItem(`geoquest_onboarding_seen_${explorerId}`, 'true');
    setShowOnboarding(false);
  };
  
  const nextTooltipStep = () => {
    if (tooltipStep < tooltipTourSteps.length - 1) {
      setTooltipStep(tooltipStep + 1);
    } else {
      localStorage.setItem('geoquest_tooltip_tour_seen', 'true');
      setShowTooltipTour(false);
      setTooltipStep(0);
    }
  };
  
  const skipTooltipTour = () => {
    localStorage.setItem('geoquest_tooltip_tour_seen', 'true');
    setShowTooltipTour(false);
    setTooltipStep(0);
  };
  


  
  const handleGuestProfileSelect = async (profileType: 'adult' | 'kid') => {
    setIsCreatingGuest(true);
    try {
      const ageRange = profileType === 'adult' ? 'adult' : '6-9';
      const difficultyLevel = profileType === 'adult' ? 'medium' : 'easy';
      
      const explorer = await createGuestExplorer({
        name: profileType === 'adult' ? 'Explorer' : 'Junior Explorer',
        profileType: profileType === 'adult' ? 'adult' : 'kid',
        ageRange,
        difficultyLevel,
        avatarKey: profileType === 'adult' ? 'compass' : 'panda',
      });
      
      if (explorer) {
        setShowGuestSelection(false);
        navigate('/play');
      }
    } catch (error) {
      console.error('Failed to create guest explorer:', error);
    } finally {
      setIsCreatingGuest(false);
    }
  };


  // Local State for Login Dialog
  const [showLogin, setShowLogin] = useState(false);
  const [showExplorerSetupPrompt, setShowExplorerSetupPrompt] = useState(false);
  
  // Guest Profile Selection State
  const [showGuestSelection, setShowGuestSelection] = useState(false);
  const [isCreatingGuest, setIsCreatingGuest] = useState(false);
  const [showGeoXplorerStampPopup, setShowGeoXplorerStampPopup] = useState(false);
  const [geoXplorerStampCity, setGeoXplorerStampCity] = useState("");

  // Check for ?login=true or ?signup=true URL parameter to auto-show login dialog
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('login') === 'true' || urlParams.get('signup') === 'true') {
      setShowLogin(true);
      // Clean up the URL after showing the dialog
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (urlParams.get('openDailyQuest') === 'true') {
      window.history.replaceState({}, '', window.location.pathname);
      navigate("/daily-quest");
    }
  }, []);

  useEffect(() => {
    if (!user?.id || physicalGamePopupShownRef.current) return;
    
    const checkAndShowPopup = async () => {
      const canShow = await physicalGamePopup.checkEligibility();
      if (canShow && !physicalGamePopupShownRef.current) {
        setTimeout(() => {
          if (!physicalGamePopupShownRef.current) {
            physicalGamePopupShownRef.current = true;
            setShowPhysicalGamePopup(true);
          }
        }, 3000);
      }
    };
    
    checkAndShowPopup();
  }, [user?.id]);


  


  const handlePromptLogin = async (data: any) => {
    if (typeof data === 'string') {
      return;
    } 
    
    if (data.method === 'email') {
      login(
        data.name, 
        data.email, 
        undefined, 
        data.players,
        { 
          registrationSource: 'email', 
          verified: data.verified === true,
          userId: data.userId
        }
      );
      setShowLogin(false);
      
      // Clear guest session data after successful login
      localStorage.removeItem('geoquest_guest_session');
      
      // Load explorers for the newly logged-in user and auto-select the adult one
      if (data.userId) {
        try {
          const response = await fetch(`/api/explorers/user/${data.userId}`);
          if (response.ok) {
            const loadedExplorers = await response.json();
            // Find the adult explorer and auto-select it
            const adultExplorer = loadedExplorers.find((e: any) => e.profileType === 'adult');
            if (adultExplorer) {
              setActiveExplorer(adultExplorer);
            } else if (loadedExplorers.length > 0) {
              // If no adult, select the first explorer
              setActiveExplorer(loadedExplorers[0]);
            }
          }
        } catch (error) {
          console.error('Failed to load explorers after signup:', error);
        }
        
        // Also trigger the normal loadExplorers to update context
        loadExplorers(data.userId);
        
        // Show explorer setup prompt for new signups
        setShowExplorerSetupPrompt(true);
      }
      
      toast.success("Welcome aboard! Your account is ready.", { icon: "🎉" });
    }
  };


  const handleCollectClick = () => {
    navigate("/passport");
  };

  return (
    <div className="min-h-screen w-full bg-cover bg-center bg-fixed flex flex-col relative overflow-x-hidden overflow-y-auto font-sans pb-28"
         style={{ backgroundImage: `url(${bgImage})` }}>
      
      <div className="absolute inset-0 bg-sky-900/50 backdrop-blur-[3px]" />
      
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            {/* Left side - Spinning Compass, Menu and icons */}
            <div className="flex items-center gap-2">
              {/* Spinning Compass - Brand Identity - Links to GeoGames landing */}
              <Link href="/geogames-landing">
                <SpinningCompass size={40} />
              </Link>
              
              {/* Hamburger Menu */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="w-10 h-10 rounded-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-white/50 dark:border-gray-600 shadow-md hover:bg-white dark:hover:bg-gray-700"
                data-testid="button-menu-toggle"
              >
                <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              </Button>
              
              {/* Hidden: Home button - available via menu if needed */}
              {/* Hidden: Info Tour button - available via menu if needed */}
              {/* Hidden: Dark Mode Toggle - moved to menu */}
            </div>
            
            {/* Right side - Parent Login or User Info */}
            {isLoggedIn ? (
              <UserHeader onLoginClick={() => setShowLogin(true)} inline />
            ) : (
              <Button
                onClick={() => setShowLogin(true)}
                variant="ghost"
                size="icon"
                className="rounded-full bg-white/60 dark:bg-gray-800/60 backdrop-blur-md text-gray-500 dark:text-gray-400 hover:bg-white/80 dark:hover:bg-gray-700 w-9 h-9"
                data-testid="button-parent-login"
              >
                <User className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          {/* Dropdown Menu */}
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-16 left-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/50 dark:border-gray-600 p-4 w-64 max-h-[calc(100vh-6rem)] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-3 px-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Quick Access</p>
                  <button 
                    onClick={() => setIsMenuOpen(false)}
                    className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    data-testid="button-close-quick-access"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-indigo-400 dark:text-indigo-300 uppercase tracking-widest px-3 pt-1 pb-1">Learn</p>
                  <Link href="/geo-atlas" onClick={() => setIsMenuOpen(false)}>
                    <div className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-sky-50 dark:hover:bg-sky-900/20 text-left transition-colors" data-testid="link-geo-atlas-menu">
                      <MapPin className="w-5 h-5 text-sky-500" />
                      <span className="font-bold text-gray-700 dark:text-gray-200">GeoAtlas</span>
                    </div>
                  </Link>
                  <Link href="/knowledge-hub" onClick={() => setIsMenuOpen(false)}>
                    <div className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left transition-colors">
                      <BookOpen className="w-5 h-5 text-blue-500" />
                      <span className="font-bold text-gray-700 dark:text-gray-200">Explorer Journal</span>
                    </div>
                  </Link>

                  <div className="border-t border-gray-200 dark:border-gray-600 my-2" />
                  <p className="text-[10px] font-bold text-indigo-400 dark:text-indigo-300 uppercase tracking-widest px-3 pt-1 pb-1">Play</p>
                  <Link href="/play-games" onClick={() => setIsMenuOpen(false)}>
                    <div className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-left transition-colors">
                      <Gamepad2 className="w-5 h-5 text-indigo-500" />
                      <span className="font-bold text-gray-700 dark:text-gray-200">All Games</span>
                    </div>
                  </Link>
                  <button onClick={() => { navigate("/daily-quest"); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/20 text-left transition-colors">
                    <Calendar className="w-5 h-5 text-rose-500" />
                    <span className="font-bold text-gray-700 dark:text-gray-200">Daily Quest</span>
                  </button>
                  <Link href="/crossworld" onClick={() => setIsMenuOpen(false)}>
                    <div className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/20 text-left transition-colors">
                      <Grid3X3 className="w-5 h-5 text-rose-500" />
                      <span className="font-bold text-gray-700 dark:text-gray-200">CrossWorld</span>
                    </div>
                  </Link>

                  <div className="border-t border-gray-200 dark:border-gray-600 my-2" />
                  <p className="text-[10px] font-bold text-indigo-400 dark:text-indigo-300 uppercase tracking-widest px-3 pt-1 pb-1">Explore</p>
                  <Link href="/explore" onClick={() => setIsMenuOpen(false)}>
                    <div className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-cyan-50 dark:hover:bg-cyan-900/20 text-left transition-colors">
                      <Compass className="w-5 h-5 text-cyan-500" />
                      <span className="font-bold text-gray-700 dark:text-gray-200">Explore Hub</span>
                    </div>
                  </Link>
                  <Link href="/explorer-map" onClick={() => setIsMenuOpen(false)}>
                    <div className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-cyan-50 dark:hover:bg-cyan-900/20 text-left transition-colors" data-testid="link-explorer-map-menu">
                      <Globe className="w-5 h-5 text-cyan-500" />
                      <span className="font-bold text-gray-700 dark:text-gray-200">Explorer Map</span>
                    </div>
                  </Link>
                  <button onClick={() => { handleCollectClick(); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/20 text-left transition-colors">
                    <Award className="w-5 h-5 text-amber-500" />
                    <span className="font-bold text-gray-700 dark:text-gray-200">Passport</span>
                  </button>
                  <Link href="/sticker-book" onClick={() => setIsMenuOpen(false)}>
                    <div className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/20 text-left transition-colors">
                      <Gem className="w-5 h-5 text-amber-500" />
                      <span className="font-bold text-gray-700 dark:text-gray-200">Souvenir Book</span>
                    </div>
                  </Link>
                  <Link href="/geobuddy-adventures" onClick={() => setIsMenuOpen(false)}>
                    <div className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 text-left transition-colors">
                      <Headphones className="w-5 h-5 text-purple-500" />
                      <span className="font-bold text-gray-700 dark:text-gray-200">GeoBuddy Stories</span>
                    </div>
                  </Link>
                  <Link href="/geoshorts" onClick={() => setIsMenuOpen(false)}>
                    <div className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-left transition-colors">
                      <Play className="w-5 h-5 text-indigo-500" />
                      <span className="font-bold text-gray-700 dark:text-gray-200">GeoShorts</span>
                    </div>
                  </Link>
                  <div className="border-t border-gray-200 dark:border-gray-600 my-2" />
                  <Link href="/geoadventures" onClick={() => { setInternalNavToAdventures(); setIsMenuOpen(false); }}>
                    <div className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-900/20 text-left transition-colors">
                      <Compass className="w-5 h-5 text-orange-500" />
                      <span className="font-bold text-gray-700 dark:text-gray-200">GeoAdventures</span>
                      <span className="ml-auto text-[9px] bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-300 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                        <Shield className="w-2.5 h-2.5" /> Parent
                      </span>
                    </div>
                  </Link>
                  <div className="border-t border-gray-200 dark:border-gray-600 my-2" />
                  {/* Dark Mode Toggle */}
                  <button 
                    onClick={() => { setTheme(isDark ? "light" : "dark"); }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-left transition-colors"
                    data-testid="button-theme-toggle-menu"
                  >
                    {isDark ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-indigo-500" />}
                    <span className="font-bold text-gray-700 dark:text-gray-200">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
                  </button>
                  <div className="border-t border-gray-200 dark:border-gray-600 my-2" />
                  {isPro && isFoundingFamily ? (
                    <div 
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-100 via-yellow-50 to-amber-100 dark:from-amber-900/30 dark:via-yellow-900/20 dark:to-amber-900/30 border border-amber-300/50 dark:border-amber-600/30"
                      data-testid="badge-founding-family"
                    >
                      <div className="relative flex-shrink-0">
                        <Shield className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                        <Star className="w-3 h-3 text-yellow-500 absolute -top-1 -right-1 fill-yellow-400" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-extrabold text-amber-700 dark:text-amber-300 text-sm leading-tight">Founding Family</span>
                        <span className="text-[10px] text-amber-600/70 dark:text-amber-400/60 font-medium leading-tight">Early Supporter</span>
                      </div>
                      <Check className="w-4 h-4 text-green-500 ml-auto flex-shrink-0" />
                    </div>
                  ) : isPro ? (
                    <div 
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30"
                      data-testid="badge-pro-account"
                    >
                      <Crown className="w-5 h-5 text-purple-500" />
                      <span className="font-bold text-purple-700 dark:text-purple-300">Pro Account</span>
                      <Check className="w-4 h-4 text-green-500 ml-auto" />
                    </div>
                  ) : foundingFamiliesEnabled ? null : (
                    <button
                      onClick={() => {
                        setShowProComingSoon(true);
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-50 to-amber-50 dark:from-purple-900/30 dark:to-amber-900/30 hover:from-purple-100 hover:to-amber-100 dark:hover:from-purple-800/40 dark:hover:to-amber-800/40 transition-colors cursor-pointer border border-purple-200 dark:border-purple-700"
                      data-testid="button-upgrade-pro-coming-soon"
                    >
                      <Crown className="w-5 h-5 text-purple-500" />
                      <span className="font-bold text-gray-700 dark:text-gray-200">Upgrade to Pro</span>
                      <span className="ml-auto text-xs bg-gradient-to-r from-purple-500 to-amber-500 text-white px-2 py-0.5 rounded-full font-medium">Coming Soon</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      requestAccess(() => {
                        setIsMenuOpen(false);
                        window.location.href = "/reviews";
                      });
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/20 text-left transition-colors"
                    data-testid="button-review-us"
                  >
                    <Star className="w-5 h-5 text-amber-500" />
                    <span className="font-bold text-gray-700 dark:text-gray-200">Review Us</span>
                  </button>
                  <PrivacySettingsMenu onClose={() => setIsMenuOpen(false)} />
                  
                  {/* PRO features hidden for now - app is free for everyone */}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>
      

          <div className="relative z-10 flex flex-col items-center min-h-screen p-4 pt-24 gap-4">

            {/* ── CONTINUE GEOADVENTURE CARD (most recently accessed real travel trip) ── */}
            {(() => {
              const activeRealTrip = ([...trips] as any[])
                .filter((t: any) => t.adventureContext !== 'home' && t.status !== 'completed')
                .sort((a: any, b: any) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())[0] as any;
              if (!activeRealTrip) return null;

              const tripStops: any[] = activeRealTrip.stops || [];
              const nextStop = tripStops.find((s: any) => !s.isVisited);
              const visitedCount = activeRealTrip.visitedStops ?? tripStops.filter((s: any) => s.isVisited).length;
              const totalCount = activeRealTrip.totalStops ?? tripStops.length;
              const cityImg = getCityImage(activeRealTrip.city || '', activeRealTrip.continent || '');

              const relativeTime = (() => {
                if (!activeRealTrip.updatedAt) return null;
                const diffMs = Date.now() - new Date(activeRealTrip.updatedAt).getTime();
                const diffDays = Math.floor(diffMs / 86400000);
                if (diffDays === 0) return 'today';
                if (diffDays === 1) return 'yesterday';
                return `${diffDays} days ago`;
              })();

              return (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="max-w-lg w-full"
                  data-testid="card-continue-geoadventure"
                >
                  <div
                    className="rounded-2xl overflow-hidden shadow-xl relative cursor-pointer"
                    style={{ minHeight: 220 }}
                    onClick={() => navigate(activeRealTrip.adventureStartedAt ? `/adventure/${activeRealTrip.id}/today` : `/adventure/${activeRealTrip.id}/parent-plan`)}
                  >
                    {/* Background image */}
                    {cityImg ? (
                      <img src={cityImg} alt={activeRealTrip.city} className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-amber-500" />
                    )}
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />

                    {/* Content */}
                    <div className="relative z-10 p-4 flex flex-col" style={{ minHeight: 220 }}>
                      {/* Top row */}
                      <div className="flex items-start justify-between mb-auto">
                        <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-white/90 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
                          ✈️ Your Family Adventure
                        </div>
                      </div>

                      {/* Bottom content */}
                      <div className="space-y-2 mt-auto">
                        {/* Trip name */}
                        <div>
                          <h2 className="text-[22px] font-black text-white leading-tight tracking-tight">{activeRealTrip.name}</h2>
                          <p className="text-white/60 text-xs mt-0.5">
                            {activeRealTrip.city}{activeRealTrip.country ? `, ${activeRealTrip.country}` : ''}
                            {totalCount > 0 && ` · ${visitedCount} of ${totalCount} shared discoveries`}
                          </p>
                        </div>

                        {/* Badges row */}
                        <div className="flex flex-wrap gap-2">
                          {relativeTime && (
                            <div className="flex items-center gap-1 bg-white/15 backdrop-blur-sm text-white/90 text-[11px] font-semibold px-2.5 py-1 rounded-full">
                              📅 Last explored together · {relativeTime}
                            </div>
                          )}
                          {nextStop && (
                            <div className="flex items-center gap-1 bg-white/15 backdrop-blur-sm text-white/90 text-[11px] font-semibold px-2.5 py-1 rounded-full">
                              Next Stop: {nextStop.name} →
                            </div>
                          )}
                        </div>

                        {/* Continue button */}
                        <button
                          className="w-full rounded-xl font-bold text-white text-base py-3 active:scale-[0.98] transition-all shadow-lg"
                          style={{ background: '#E67E22' }}
                          onClick={(e) => { e.stopPropagation(); navigate(activeRealTrip.adventureStartedAt ? `/adventure/${activeRealTrip.id}/today` : `/adventure/${activeRealTrip.id}/parent-plan`); }}
                          data-testid="button-continue-geoadventure"
                        >
                          {activeRealTrip.adventureStartedAt ? "Continue Together →" : "View Trip Plan →"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Switch trip link */}
                  <div className="text-center mt-2">
                    <button
                      onClick={() => navigate('/travel')}
                      className="text-orange-500 text-sm font-semibold"
                      data-testid="button-switch-trip"
                    >
                      Switch trip →
                    </button>
                  </div>
                </motion.div>
              );
            })()}

            {/* Hero Section - Today's Quest */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-lg w-full rounded-3xl p-6 bg-gradient-to-br from-cyan-400/80 via-sky-400/80 to-teal-400/80 dark:from-cyan-600/80 dark:via-sky-600/80 dark:to-teal-600/80 shadow-xl backdrop-blur-sm"
              data-testid="card-todays-quest"
            >
              <div className="text-center space-y-3">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.08, duration: 0.2 }}
                  className="text-4xl"
                >
                  🧭
                </motion.div>

                <h1 className="text-2xl font-bold text-white leading-tight" data-testid="text-home-title">
                  Today's Quest
                </h1>

                <p className="text-sm text-white/85 leading-relaxed max-w-xs mx-auto">
                  {Math.max(stats?.explorerStreak || 0, stats?.dailyQuestStreak || 0) > 0 
                    ? `${Math.max(stats?.explorerStreak || 0, stats?.dailyQuestStreak || 0)} Day Explorer Streak 🔥`
                    : "Discover a new city every day — start your streak!"}
                </p>

                <DailyQuestCountdown />

                <div className="flex flex-col items-center gap-2 pt-1">
                  <Button 
                    id="tour-daily-quest"
                    onClick={() => navigate("/daily-quest")}
                    className="bg-white hover:bg-white/90 text-emerald-700 font-semibold px-8 h-12 rounded-xl shadow-lg text-base"
                    data-testid="button-start-quest"
                  >
                    <Compass className="w-5 h-5 mr-2" />
                    Start Today's Quest
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* Continue Exploring Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="max-w-lg w-full"
            >
              {(() => {
                const explorerCards = (activeExplorer?.collectedCardIds as string[]) || [];
                const lastCity = explorerCards.length > 0 
                  ? ALL_PASSPORT_CITIES.find(c => c.id === explorerCards[explorerCards.length - 1])
                  : null;
                const cityStars = lastCity ? (stats?.cityMastery as Record<string, number> || {})[lastCity.id] || 1 : 0;
                
                return (
                  <div 
                    className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-2xl p-4 border border-slate-200/50 dark:border-slate-700 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => lastCity ? navigate(`/explorer-map?openCity=${lastCity.id}`) : navigate("/daily-quest")}
                    data-testid="card-continue-exploring"
                  >
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Continue Exploring</p>
                    {lastCity ? (
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center flex-shrink-0">
                          <span className="text-2xl">{lastCity.landmarkIcon || '🌍'}</span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">{lastCity.city}</h3>
                          <div className="flex items-center gap-1 mt-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`w-3.5 h-3.5 ${i < cityStars ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />
                            ))}
                            <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">{cityStars}/5</span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                          <span className="text-2xl">🧭</span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">Start your first city!</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Play a quest to discover cities</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      </div>
                    )}
                  </div>
                );
              })()}
            </motion.div>

            {/* Explorer XP Progress */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="max-w-lg w-full"
            >
              <ExplorerXPBar />
            </motion.div>

            {/* GeoAdventures Card */}
            {(() => {
              const hasTemplates = templatedCities && templatedCities.length > 0;
              const dayIndex = Math.floor(Date.now() / 86400000);
              const previewCity = hasTemplates
                ? (() => {
                    const tc = templatedCities![dayIndex % templatedCities!.length];
                    return { cityName: tc.cityName, country: tc.country, continent: tc.continent || '', stopCount: tc.stopCount || 5 };
                  })()
                : (() => {
                    const pc = ALL_PASSPORT_CITIES[dayIndex % ALL_PASSPORT_CITIES.length];
                    return { cityName: pc.city, country: pc.country, continent: pc.continent, stopCount: 5 };
                  })();
              const cityImage = getCityImage(previewCity.cityName, previewCity.continent);
              const flagCity = ALL_PASSPORT_CITIES.find(c => c.city.toLowerCase() === previewCity.cityName.toLowerCase());

              const handleStartAdventure = async (e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                if (creatingAdventure || !user) return;

                const existingTrip = trips.find(t =>
                  t.city?.toLowerCase() === previewCity.cityName.toLowerCase() &&
                  t.adventureContext === 'home' &&
                  t.status !== 'completed'
                );
                if (existingTrip) {
                  await fetchTrip(existingTrip.id);
                  navigate(`/adventure/${existingTrip.id}/kid`);
                  return;
                }

                setCreatingAdventure(true);
                try {
                  const travelers = activeExplorer
                    ? [{ name: activeExplorer.name, avatarKey: activeExplorer.avatarKey || 'panda' }]
                    : [{ name: 'Explorer', avatarKey: 'panda' }];
                  const trip = await createTrip({
                    name: `${previewCity.cityName} Adventure`,
                    continent: previewCity.continent || '',
                    country: previewCity.country,
                    city: previewCity.cityName,
                    destination: `${previewCity.cityName}, ${previewCity.country}`,
                    travelers,
                    travelerNames: travelers.map(t => t.name),
                    autoGenerateStops: true,
                    adventureContext: 'home',
                    stopCount: previewCity.stopCount || 5,
                  });
                  if (trip) {
                    await fetchTrip(trip.id);
                    navigate(`/adventure/${trip.id}/kid`);
                  }
                } catch (err: any) {
                  if (err.code === 'DUPLICATE_CITY' && err.existingTrip) {
                    await fetchTrip(err.existingTrip.id);
                    navigate(`/adventure/${err.existingTrip.id}/kid`);
                  } else {
                    toast.error(err.message || "Couldn't start adventure");
                  }
                } finally {
                  setCreatingAdventure(false);
                }
              };

              return (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.175 }}
                  className="max-w-lg w-full"
                >
                  <div
                    onClick={handleStartAdventure}
                    className="rounded-2xl shadow-md hover:shadow-xl transition-all cursor-pointer relative overflow-hidden"
                    style={{ minHeight: '180px' }}
                    data-testid="card-geoadventures-home"
                  >
                    {cityImage && (
                      <img
                        src={cityImage}
                        alt={previewCity.cityName}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />

                    <div className="relative z-10 p-4 flex flex-col h-full" style={{ minHeight: '180px' }}>
                      <div className="flex items-center justify-between mb-auto">
                        <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                          <motion.div
                            animate={{ rotate: [0, 20, -20, 0] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                          >
                            <Compass className="w-3.5 h-3.5" />
                          </motion.div>
                          GeoAdventures
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                          🧭 Try an Adventure
                        </div>
                      </div>

                      <div className="mt-auto space-y-3">
                        <div>
                          <p className="text-white/60 text-[10px] font-semibold uppercase tracking-wider mb-0.5">Today's Destination</p>
                          <div className="flex items-center gap-2">
                            <h3 className="text-2xl font-black text-white tracking-tight">{previewCity.cityName}</h3>
                            {flagCity?.flagUrl && (
                              <img src={flagCity.flagUrl} alt="" className="w-7 h-5 rounded object-cover shadow-sm" />
                            )}
                          </div>
                          <p className="text-white/50 text-xs font-medium">{previewCity.country} · {previewCity.continent}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={creatingAdventure}
                            className="flex-1 bg-white text-slate-900 font-bold text-sm py-2.5 rounded-xl shadow-lg text-center disabled:opacity-70"
                            data-testid="button-start-adventure-home"
                          >
                            {creatingAdventure ? "Starting..." : "Start Adventure"}
                          </motion.button>
                        </div>

                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })()}

            {/* Value Banner - shown to non-paid users */}
            {!isPaidUser && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.185 }}
                className="max-w-lg w-full"
                data-testid="card-value-banner"
              >
                <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-5 shadow-md">
                  <p className="text-white font-black text-base leading-snug mb-4">
                    Turn your next trip into something your kids will actually remember.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate("/travel")}
                      className="flex-1 py-2.5 bg-white text-orange-600 font-bold text-sm rounded-xl shadow-sm hover:bg-orange-50 transition-colors"
                      data-testid="button-value-banner-plan"
                    >
                      Start Planning
                    </button>
                    <button
                      onClick={() => navigate("/play-games")}
                      className="flex-1 py-2.5 bg-white/20 text-white font-bold text-sm rounded-xl hover:bg-white/30 transition-colors"
                      data-testid="button-value-banner-games"
                    >
                      Explore Games
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Explorer Map Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="max-w-lg w-full"
            >
              <Link href="/explorer-map">
                <div 
                  className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-2xl p-4 border border-slate-200/50 dark:border-slate-700 shadow-sm hover:shadow-md transition-all cursor-pointer"
                  data-testid="card-world-map"
                >
                  <p className="text-[10px] font-bold text-orange-500 dark:text-orange-400 uppercase tracking-widest mb-2">Explorer Map</p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">🗺️</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">Explorer Map</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {collectedCardIds.length} / {ALL_PASSPORT_CITIES.length} Cities
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
              </Link>
            </motion.div>

            {/* Passport Preview Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="max-w-lg w-full"
            >
              <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-2xl p-4 border border-slate-200/50 dark:border-slate-700 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-amber-700 dark:text-amber-300 text-sm flex items-center gap-2">
                    <span className="text-lg">📘</span>
                    Passport
                  </h3>
                  <button 
                    onClick={handleCollectClick}
                    className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-medium"
                    data-testid="button-view-passport"
                  >
                    Open Passport →
                  </button>
                </div>
                
                <div className="flex gap-4 justify-center flex-wrap">
                  {(() => {
                    const placeholderCities = [
                      { id: 'dq_paris', city: 'Paris', country: 'France' },
                      { id: 'mumbai', city: 'Mumbai', country: 'India' },
                      { id: 'new-york', city: 'New York', country: 'USA' },
                      { id: 'sydney', city: 'Sydney', country: 'Australia' },
                    ];
                    
                    const collectedCities = ALL_PASSPORT_CITIES.filter(city => collectedCardIds.includes(city.id));
                    const hasDiscoveredCities = collectedCities.length > 0;
                    
                    const stampsToShow = hasDiscoveredCities 
                      ? collectedCities.slice(0, 4)
                      : placeholderCities;
                    
                    return (
                      <>
                        {stampsToShow.map((city, index) => {
                          const isDiscovered = hasDiscoveredCities 
                            ? true 
                            : false;
                          
                          return (
                            <div 
                              key={city.id} 
                              className={`w-[72px] h-[72px] rounded-full flex flex-col items-center justify-center border-[3px] relative ${
                                isDiscovered 
                                  ? 'border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/20' 
                                  : 'border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/20 opacity-40'
                              }`}
                              style={{ 
                                transform: `rotate(${(index * 7) % 14 - 7}deg)`,
                                mixBlendMode: 'multiply'
                              }}
                              data-testid={`stamp-${city.id}`}
                            >
                              {isDiscovered && (
                                <div className="flex items-center gap-0.5 mb-0.5">
                                  <Star className="w-2 h-2 text-amber-500 fill-amber-500" />
                                  <Star className="w-2 h-2 text-amber-500 fill-amber-500" />
                                  <Star className="w-2 h-2 text-amber-500 fill-amber-500" />
                                </div>
                              )}
                              <span className={`text-[7px] font-bold uppercase tracking-wider ${isDiscovered ? 'text-blue-500 dark:text-blue-300' : 'text-slate-400'}`}>
                                Entry
                              </span>
                              <span className={`text-[9px] font-black text-center leading-none uppercase ${isDiscovered ? 'text-blue-700 dark:text-blue-200' : 'text-slate-400'}`}>
                                {city.city.length > 8 ? city.city.slice(0, 8) : city.city}
                              </span>
                              <span className={`text-[6px] uppercase mt-0.5 ${isDiscovered ? 'text-blue-400 dark:text-blue-400' : 'text-slate-300'}`}>
                                {city.country.slice(0, 10)}
                              </span>
                            </div>
                          );
                        })}
                      </>
                    );
                  })()}
                </div>
                
                <p className="text-center text-xs text-amber-600/60 dark:text-amber-400/60 mt-3 italic">
                  {collectedCardIds.length > 0 ? 'Your passport fills up as you explore new cities' : 'Discover cities to fill your passport'}
                </p>
              </div>
            </motion.div>

            {/* Download Banner */}
            <div className="w-full max-w-lg">
              <DownloadBanner />
            </div>
            
            {/* Bottom spacer for footer */}
            <div className="h-20"></div>
          </div>

      {/* Login Prompt */}
      <SignUpPrompt 
        isOpen={showLogin} 
        onClose={() => setShowLogin(false)} 
        onLogin={handlePromptLogin} 
      />

      {/* Explorer Setup Prompt after Signup */}
      <Dialog open={showExplorerSetupPrompt} onOpenChange={setShowExplorerSetupPrompt}>
        <DialogContent className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/80 dark:to-purple-900/80 border-4 border-blue-400 dark:border-blue-600 rounded-[2rem] max-w-md p-6">
          <DialogHeader className="relative">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mb-4 shadow-lg">
              <span className="text-4xl">🎉</span>
            </div>
            <DialogTitle className="text-2xl font-heading text-blue-700 dark:text-blue-200 text-center mb-2">
              Welcome to Guess & Go!
            </DialogTitle>
            <DialogDescription className="text-center text-gray-600 dark:text-gray-300">
              Your account is ready! You can add more explorers (like your kids) anytime from the explorer menu.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col gap-3 mt-6">
            <Button
              onClick={() => {
                setShowExplorerSetupPrompt(false);
                navigate('/whos-playing');
              }}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 rounded-xl"
              data-testid="button-manage-explorers"
            >
              <Users className="w-5 h-5 mr-2" />
              Manage Explorers
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowExplorerSetupPrompt(false)}
              className="w-full border-2 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300 font-bold py-3 rounded-xl"
              data-testid="button-start-playing"
            >
              Start Playing Now
            </Button>
          </div>
          
          <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4">
            You can switch between explorers anytime by clicking the Explorer button
          </p>
        </DialogContent>
      </Dialog>

      {/* Guest Profile Selection Dialog */}
      <Dialog open={showGuestSelection} onOpenChange={setShowGuestSelection}>
        <DialogContent className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/80 dark:to-purple-900/80 border-4 border-blue-400 dark:border-blue-600 rounded-[2rem] max-w-md p-6">
          <DialogHeader className="relative">
            <DialogTitle className="text-2xl font-heading text-blue-700 dark:text-blue-200 text-center mb-2">
              Who's Playing?
            </DialogTitle>
            <DialogDescription className="text-center text-gray-600 dark:text-gray-300">
              Choose your explorer type to customize your game experience
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 mt-6">
            <button
              onClick={() => handleGuestProfileSelect('kid')}
              disabled={isCreatingGuest}
              className="flex flex-col items-center p-6 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl shadow-lg border-4 border-green-300 hover:scale-105 transition-transform disabled:opacity-50"
              data-testid="button-guest-kid"
            >
              <span className="text-5xl mb-3">🐼</span>
              <span className="text-xl font-bold text-white drop-shadow">Kid</span>
              <span className="text-sm text-white/80 mt-1">Ages 4+</span>
            </button>
            
            <button
              onClick={() => handleGuestProfileSelect('adult')}
              disabled={isCreatingGuest}
              className="flex flex-col items-center p-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg border-4 border-blue-300 hover:scale-105 transition-transform disabled:opacity-50"
              data-testid="button-guest-adult"
            >
              <span className="text-5xl mb-3">🧭</span>
              <span className="text-xl font-bold text-white drop-shadow">Adult</span>
            </button>
          </div>
          
          {isCreatingGuest && (
            <div className="mt-4 text-center text-blue-600 dark:text-blue-300">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="inline-block w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full mr-2"
              />
              Creating your explorer...
            </div>
          )}
          
          <div className="mt-6 text-center">
            <button
              onClick={() => setShowLogin(true)}
              className="text-sm text-blue-600 dark:text-blue-300 hover:underline"
              data-testid="button-guest-signin"
            >
              Already have an account? Sign In
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rules Dialog */}
      <Dialog open={showRules} onOpenChange={setShowRules}>
        <DialogContent className="bg-white border-4 border-green-500 rounded-[2rem] max-w-2xl max-h-[90vh] overflow-y-auto [&>button]:hidden">
          <DialogHeader className="relative">
            <DialogTitle className="text-3xl font-heading text-green-700 text-center mb-4 pt-4">
              How to Play GeoQuest
            </DialogTitle>
            <DialogDescription className="sr-only">Learn how to play GeoQuest games</DialogDescription>
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute right-0 top-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
              onClick={() => setShowRules(false)}
            >
              <X className="w-6 h-6" />
            </Button>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
             <div className="bg-green-50 p-4 rounded-xl flex flex-col items-center text-center">
                <div className="bg-white p-3 rounded-full shadow-sm mb-2">
                   <Globe className="w-8 h-8 text-green-600" />
                </div>
                <h4 className="font-bold text-green-800 mb-1">1. Draw a Card</h4>
                <p className="text-sm text-green-900">Pick a mystery location card from the deck.</p>
             </div>
             
             <div className="bg-blue-50 p-4 rounded-xl flex flex-col items-center text-center">
                <div className="bg-white p-3 rounded-full shadow-sm mb-2">
                   <Compass className="w-8 h-8 text-blue-600" />
                </div>
                <h4 className="font-bold text-blue-800 mb-1">2. Choose Difficulty</h4>
                <p className="text-sm text-blue-900">Easy (Continent), Medium (Country), or Hard (City).</p>
             </div>

             <div className="bg-yellow-50 p-4 rounded-xl flex flex-col items-center text-center">
                <div className="bg-white p-3 rounded-full shadow-sm mb-2">
                   <Star className="w-8 h-8 text-yellow-500" />
                </div>
                <h4 className="font-bold text-yellow-800 mb-1">3. Earn Stars</h4>
                <p className="text-sm text-yellow-900">Guess correctly to win stars and collect the card!</p>
             </div>

             <div className="bg-purple-50 p-4 rounded-xl flex flex-col items-center text-center">
                <div className="bg-white p-3 rounded-full shadow-sm mb-2">
                   <Award className="w-8 h-8 text-purple-600" />
                </div>
                <h4 className="font-bold text-purple-800 mb-1">4. Complete Missions</h4>
                <p className="text-sm text-purple-900">Collect matching cards to finish missions and win big!</p>
             </div>
          </div>

          <div className="text-center mt-4 bg-gray-100 p-4 rounded-xl">
             <p className="font-bold text-gray-700">🏆 First player to reach 10 Stars wins the game!</p>
          </div>

          <Button className="w-full mt-4 bg-green-500 hover:bg-green-600 text-white text-xl h-14 rounded-xl" onClick={() => setShowRules(false)}>
            Got it, Let's Play!
          </Button>
        </DialogContent>
      </Dialog>

      {/* Pre-Order Popup */}
      <PreOrderPopup 
          isOpen={showPreOrderPopup} 
          onClose={() => setShowPreOrderPopup(false)} 
      />
      
      {/* Pro Coming Soon Modal */}
      <Dialog open={showProComingSoon} onOpenChange={setShowProComingSoon}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl">
          <DialogHeader className="sr-only">
            <DialogTitle>GeoQuest Pro - Coming Soon</DialogTitle>
          </DialogHeader>
          <div className="bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 p-6 text-white text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Crown className="w-8 h-8 text-yellow-300" />
            </div>
            <h2 className="text-2xl font-bold mb-2">GeoQuest Pro</h2>
            <p className="text-purple-100 text-sm">Coming Soon!</p>
          </div>
          
          <div className="p-6 bg-white dark:bg-gray-800">
            <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
              We're building something special for families who love exploring the world together!
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/30 rounded-xl">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-800 rounded-full flex items-center justify-center">
                  <Download className="w-5 h-5 text-purple-600 dark:text-purple-300" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">Offline Access</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Play anywhere, even without internet</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
                  <Map className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">GeoAdventure Packs</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Travel journeys for 100+ destinations</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-800 rounded-full flex items-center justify-center">
                  <Gem className="w-5 h-5 text-amber-600 dark:text-amber-300" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">Treasure Vault Access</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Exclusive rewards and collectibles</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/30 rounded-xl">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-green-600 dark:text-green-300" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">Souvenir Book</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Beautiful memories from every adventure</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-pink-50 dark:bg-pink-900/30 rounded-xl">
                <div className="w-10 h-10 bg-pink-100 dark:bg-pink-800 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-pink-600 dark:text-pink-300" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">Up to 7 Explorers</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">The whole family can play together</p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/40 dark:to-blue-900/40 rounded-xl text-center">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Stay tuned! We'll let you know when it's ready.
              </p>
            </div>
            
            <Button 
              onClick={() => setShowProComingSoon(false)}
              className="w-full mt-4 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-bold py-3 rounded-xl"
            >
              Got it!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Physical Card Game Early Access Modal */}
      <PhysicalGameEarlyAccessModal
        open={showPhysicalGamePopup}
        onOpenChange={setShowPhysicalGamePopup}
        onJoinEarlyAccess={async (name: string, email: string) => {
          await physicalGamePopup.joinEarlyAccess(name, email);
        }}
        onDismiss={async () => {
          await physicalGamePopup.dismissPopup();
        }}
        defaultName={user?.firstName || ''}
        defaultEmail={user?.email || ''}
      />


      
      {/* Spin the Globe Star Popup */}
      <Dialog open={showGeoXplorerStampPopup} onOpenChange={setShowGeoXplorerStampPopup}>
        <DialogContent className="bg-gradient-to-br from-indigo-50 to-purple-100 dark:from-indigo-900 dark:to-purple-900 border-4 border-indigo-400 rounded-3xl max-w-sm mx-auto">
          <DialogHeader className="text-center">
            <DialogTitle className="text-2xl font-bold text-indigo-700 dark:text-indigo-300 flex items-center justify-center gap-2">
              <Globe className="w-6 h-6 text-indigo-500" />
              Spin the Globe
            </DialogTitle>
            <DialogDescription className="text-indigo-800 dark:text-indigo-200 text-base mt-2">
              Earn this star by identifying <span className="font-bold">{geoXplorerStampCity}</span> in Spin the Globe!
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Button
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-bold rounded-xl py-3 text-lg"
              onClick={() => {
                setShowGeoXplorerStampPopup(false);
                navigate('/spin-the-world');
              }}
              data-testid="button-play-spin-the-globe"
            >
              🌍 Play Spin the Globe
            </Button>
            <Button
              variant="outline"
              className="w-full border-2 border-indigo-400 text-indigo-700 dark:text-indigo-300 font-bold rounded-xl"
              onClick={() => setShowGeoXplorerStampPopup(false)}
              data-testid="button-close-spin-globe-popup"
            >
              Maybe Later
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* FAQ Dialog */}
      <FAQDialog open={showFAQ} onClose={() => setShowFAQ(false)} />

      {/* PWA Download Dialog */}
      <Dialog open={showDownloadDialog} onOpenChange={setShowDownloadDialog}>
        <DialogContent className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/80 dark:to-emerald-900/80 border-4 border-green-400 dark:border-green-600 rounded-[2rem] max-w-md max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2 text-2xl font-heading text-green-700 dark:text-green-300">
              <Smartphone className="w-7 h-7" />
              Install GeoQuest
            </DialogTitle>
            <DialogDescription className="text-center text-gray-600 dark:text-gray-300">
              Play anywhere, anytime - even offline!
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 mt-4">
            <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-3 border border-green-200 dark:border-green-700">
              <h4 className="font-bold text-green-700 dark:text-green-300 mb-2 flex items-center gap-2 text-sm">
                <Check className="w-4 h-4" /> What You Get
              </h4>
              <ul className="space-y-1 text-xs text-gray-700 dark:text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">*</span>
                  <span>App icon on your home screen</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">*</span>
                  <span>Full-screen experience without browser bars</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">*</span>
                  <span>Faster loading with cached content</span>
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-800/50 dark:to-pink-800/50 rounded-xl p-3 border-2 border-purple-300 dark:border-purple-600">
              <h4 className="font-bold text-purple-800 dark:text-purple-200 mb-2 flex items-center gap-2 text-sm">
                <Crown className="w-4 h-4" /> GeoQuest Pro Features
              </h4>
              <ul className="space-y-1 text-xs text-gray-700 dark:text-gray-300">
                <li className="flex items-start gap-2">
                  <Check className="w-3 h-3 text-purple-500 mt-0.5 shrink-0" />
                  <span>Full offline play - Guess & Go anytime!</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3 h-3 text-purple-500 mt-0.5 shrink-0" />
                  <span>Up to 7 explorer profiles (vs 3 free)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3 h-3 text-purple-500 mt-0.5 shrink-0" />
                  <span>Unlimited Geo-Buddy questions</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3 h-3 text-purple-500 mt-0.5 shrink-0" />
                  <span>Ad-free experience</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3 h-3 text-purple-500 mt-0.5 shrink-0" />
                  <span>Premium missions & printable certificates</span>
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-800/50 dark:to-emerald-800/50 rounded-xl p-3 border-2 border-green-300 dark:border-green-600">
              <h4 className="font-bold text-green-800 dark:text-green-200 mb-1 text-sm">How to Install:</h4>
              <div className="text-xs text-gray-700 dark:text-gray-300 space-y-1">
                <p><strong>iPhone/iPad:</strong> Tap Share, then "Add to Home Screen"</p>
                <p><strong>Android:</strong> Tap menu (3 dots), then "Install App"</p>
                <p><strong>Desktop:</strong> Look for install icon in address bar</p>
              </div>
            </div>

            {isInstallable && !isInstalled && (
              <Button 
                onClick={async () => {
                  const success = await installApp();
                  if (success) {
                    setShowDownloadDialog(false);
                    toast.success("GeoQuest installed! Find it on your home screen.");
                  }
                }}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-3 rounded-xl shadow-lg"
                data-testid="button-install-pwa"
              >
                <Download className="w-5 h-5 mr-2" />
                Install Now
              </Button>
            )}

            {isInstalled && (
              <div className="text-center p-2 bg-green-100 dark:bg-green-800/50 rounded-xl">
                <p className="text-green-700 dark:text-green-300 font-bold flex items-center justify-center gap-2 text-sm">
                  <Check className="w-4 h-4" />
                  Already Installed!
                </p>
              </div>
            )}

            <Button 
              variant="outline"
              onClick={() => setShowDownloadDialog(false)}
              className="w-full rounded-xl"
              data-testid="button-close-download-dialog"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Daily Reminder Email Dialog */}
      <Dialog open={showReminderEmailDialog} onOpenChange={setShowReminderEmailDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-purple-500" />
              Get Daily Reminders
            </DialogTitle>
            <DialogDescription>
              Enter your email to receive daily challenge notifications
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="reminder-email" className="text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="reminder-email"
                type="email"
                placeholder="your@email.com"
                value={reminderEmail}
                onChange={(e) => setReminderEmail(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:outline-none"
                data-testid="input-reminder-email"
              />
            </div>
            <Button
              onClick={async () => {
                if (!reminderEmail || !reminderEmail.includes('@')) {
                  toast.error("Please enter a valid email address");
                  return;
                }
                setIsSubmittingReminder(true);
                try {
                  const response = await fetch('/api/email/subscribe-reminder', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: reminderEmail })
                  });
                  
                  if (response.ok) {
                    setReminderEnabled(true);
                    setShowReminderEmailDialog(false);
                    setReminderEmail("");
                    toast.success(
                      <div>
                        <p className="font-bold">You're signed up for daily alerts!</p>
                        <p className="text-sm mt-1">By providing your email, you agree to our <a href="/privacy" className="underline text-purple-600">Privacy Policy</a> and <a href="/terms" className="underline text-purple-600">Terms of Service</a>.</p>
                      </div>,
                      { duration: 6000, icon: "📧" }
                    );
                  } else {
                    toast.error("Failed to subscribe. Please try again.");
                  }
                } catch (error) {
                  toast.error("Failed to subscribe. Please try again.");
                } finally {
                  setIsSubmittingReminder(false);
                }
              }}
              disabled={isSubmittingReminder}
              className="w-full bg-purple-500 hover:bg-purple-600 text-white rounded-xl h-12"
              data-testid="button-submit-reminder-email"
            >
              {isSubmittingReminder ? "Subscribing..." : "Sign Up for Reminders"}
            </Button>
            <p className="text-xs text-gray-500 text-center">
              By signing up, you agree to our{" "}
              <a href="/privacy" className="underline text-purple-600">Privacy Policy</a> and{" "}
              <a href="/terms" className="underline text-purple-600">Terms of Service</a>.
            </p>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Invite Friends Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="bg-gradient-to-br from-purple-50 to-pink-50 border-4 border-purple-400 rounded-[2rem] max-w-md p-0 overflow-hidden shadow-2xl [&>button]:hidden">
          <DialogHeader className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-center">
            <div className="flex justify-center mb-2">
              <div className="bg-white/20 p-3 rounded-full">
                <Users className="w-8 h-8 text-white" />
              </div>
            </div>
            <DialogTitle className="text-2xl font-heading text-white">Invite Friends!</DialogTitle>
            <DialogDescription className="text-purple-100">
              Share GeoQuest with your friends and family
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-6 space-y-4">
            <p className="text-center text-gray-600 text-sm mb-4">
              Choose how you'd like to invite:
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Facebook */}
              <Button
                onClick={() => {
                  const shareText = "I found this cool map guessing game! Want to give it a try? Click the link and beat my score!";
                  const shareUrl = "https://game.geoquestgame.com";
                  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
                  requestAccess(() => {
                    window.open(fbUrl, '_blank', 'width=600,height=400');
                    setShowInviteDialog(false);
                  });
                }}
                className="h-16 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-xl flex flex-col items-center justify-center gap-1 border-b-4 border-[#1467D8]"
                data-testid="invite-facebook"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                <span className="text-xs font-bold">Facebook</span>
              </Button>

              {/* Instagram */}
              <Button
                onClick={() => {
                  const shareText = "I found this cool map guessing game! 🌍✈️ Want to give it a try? Beat my score at game.geoquestgame.com";
                  navigator.clipboard.writeText(shareText);
                  toast.success("Copied! Open Instagram to share", {
                    description: "Paste in your story or post caption",
                    duration: 4000,
                  });
                  requestAccess(() => {
                    window.open('https://www.instagram.com/', '_blank');
                    setShowInviteDialog(false);
                  });
                }}
                className="h-16 bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737] hover:opacity-90 text-white rounded-xl flex flex-col items-center justify-center gap-1 border-b-4 border-[#7B2FAE]"
                data-testid="invite-instagram"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                <span className="text-xs font-bold">Instagram</span>
              </Button>

              {/* Twitter/X */}
              <Button
                onClick={() => {
                  const shareText = "I found this cool map guessing game! 🌍✈️ Want to give it a try? Beat my score:";
                  const shareUrl = "https://game.geoquestgame.com";
                  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
                  requestAccess(() => {
                    window.open(twitterUrl, '_blank', 'width=600,height=400');
                    setShowInviteDialog(false);
                  });
                }}
                className="h-16 bg-black hover:bg-gray-800 text-white rounded-xl flex flex-col items-center justify-center gap-1 border-b-4 border-gray-700"
                data-testid="invite-twitter"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                <span className="text-xs font-bold">X (Twitter)</span>
              </Button>

              {/* Text/SMS */}
              <Button
                onClick={() => {
                  const shareText = "Hey! I found this cool map guessing game! 🌍✈️ Want to give it a try? Click the link and beat my score: https://game.geoquestgame.com";
                  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                  if (isMobile) {
                    window.location.href = `sms:?body=${encodeURIComponent(shareText)}`;
                  } else {
                    navigator.clipboard.writeText(shareText);
                    toast.success("Message copied!", {
                      description: "Paste it in your messaging app",
                      duration: 3000,
                    });
                  }
                  setShowInviteDialog(false);
                }}
                className="h-16 bg-green-500 hover:bg-green-600 text-white rounded-xl flex flex-col items-center justify-center gap-1 border-b-4 border-green-700"
                data-testid="invite-text"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                <span className="text-xs font-bold">Text</span>
              </Button>
            </div>
            
            <div className="text-center pt-2">
              <button
                onClick={() => setShowInviteDialog(false)}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Maybe later
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Onboarding Overlay */}
      <AnimatePresence>
        {showOnboarding && (
          <FirstTimeQuest onSkip={skipOnboarding} />
        )}
      </AnimatePresence>
      
      {/* Tooltip Tour Overlay */}
      <AnimatePresence>
        {showTooltipTour && (
          <TooltipTourOverlay
            step={tooltipStep}
            steps={tooltipTourSteps}
            onNext={nextTooltipStep}
            onSkip={skipTooltipTour}
          />
        )}
      </AnimatePresence>
      


      {/* Confirmation Dialog for Disabling Reminders */}
      <AlertDialog open={showDisableReminderConfirm} onOpenChange={setShowDisableReminderConfirm}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-lg">
              <Bell className="w-5 h-5 text-orange-500" />
              Turn Off Reminders?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              If you turn off reminders, you won't receive any email notifications. You might miss out on new features and updates!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="rounded-xl border-2 font-bold">
              Keep Reminders On
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setReminderEnabled(false);
                toast.info("Reminders turned off");
              }}
              className="bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-bold"
            >
              Turn Off Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Passport Onboarding Modal */}
      
      {/* End of Day Recap */}
      <EndOfDayRecap 
        open={showRecap} 
        onClose={closeRecap}
        onPlayAgain={() => {
          closeRecap();
          navigate('/play');
        }}
        onGeoAdventures={() => {
          closeRecap();
          setInternalNavToAdventures();
          navigate('/geoadventures');
        }}
      />

      {/* Early Explorer Offer Modal — shows once when triggers are met */}
      <EarlyExplorerOfferModal
        open={showEarlyExplorerModal}
        onClose={() => {
          setShowEarlyExplorerModal(false);
          markEarlyExplorerShown();
        }}
      />
      
    </div>
  );
}
