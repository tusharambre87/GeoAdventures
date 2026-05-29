import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useUser } from '@/lib/userContext';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  ArrowLeft, Star, Heart, Crown, Check, Loader2, 
  Users, Sparkles, Shield, Clock, Gift, Map, Plane, Globe, Compass, X, Camera, BookOpen, Headphones
} from 'lucide-react';
import { toast } from 'sonner';
import { TrialConfirmationModal } from '@/components/TrialConfirmationModal';
import { SignUpPrompt } from '@/components/SignUpPrompt';
import { motion } from 'framer-motion';
import { usePricing, DEFAULT_PRICING } from '@/hooks/usePricing';

export default function FoundingFamilies() {
  const [, setLocation] = useLocation();
  const { user } = useUser();
  const { isFoundingFamily, foundingFamilyNumber, isTrialActive } = useSubscription();
  const { data: pricing } = usePricing();
  const p = pricing || DEFAULT_PRICING;
  const [isLoading, setIsLoading] = useState(false);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [showSignUpPrompt, setShowSignUpPrompt] = useState(false);
  const [showGeoAdventuresInfo, setShowGeoAdventuresInfo] = useState(false);
  const [availability, setAvailability] = useState<{
    available: boolean;
    spotsRemaining: number;
    totalCap: number;
    enrolled: number;
  } | null>(null);

  useEffect(() => {
    fetch('/api/founding-families/availability')
      .then(res => res.json())
      .then(data => setAvailability(data))
      .catch(err => console.error('Error fetching availability:', err));
  }, []);

  const handleJoinFoundingFamilies = async () => {
    if (!user) {
      setShowSignUpPrompt(true);
      return;
    }

    if (isTrialActive) {
      toast.info('Your trial is already active!');
      setLocation('/');
      return;
    }

    setShowTrialModal(true);
  };
  
  const handleLoginSuccess = () => {
    setShowSignUpPrompt(false);
    window.location.reload(); // Refresh to pick up authenticated user
  };

  const benefits = [
    { icon: <Gift className="w-5 h-5" />, text: `Locked-in price of ${p.foundingMonthly}/mo for 12 months`, highlight: true },
    { icon: <Crown className="w-5 h-5" />, text: 'Founding Family badge displayed forever' },
    { icon: <Star className="w-5 h-5" />, text: 'All GeoQuest Explorer features included' },
    { icon: <Shield className="w-5 h-5" />, text: 'Priority support and early access' },
    { 
      icon: <Plane className="w-5 h-5" />, 
      text: 'GeoAdventure trips with offline access included',
      description: 'Plan and journal your family travels'
    },
    { icon: <Users className="w-5 h-5" />, text: 'Up to 7 explorer profiles' },
  ];

  const floatingIcons = [
    { Icon: Globe, delay: 0, x: -20, y: -30 },
    { Icon: Compass, delay: 0.5, x: 30, y: -15 },
    { Icon: Map, delay: 1, x: -25, y: 20 },
    { Icon: Plane, delay: 1.5, x: 25, y: 35 },
  ];

  if (isFoundingFamily) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-white p-4">
        <div className="max-w-lg mx-auto pt-8">
          <button 
            onClick={() => setLocation('/')}
            className="flex items-center gap-2 text-amber-600 mb-6 hover:text-amber-800"
            data-testid="back-from-founding"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>

          <div className="text-center mb-8">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", duration: 0.6 }}
              className="w-24 h-24 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl relative"
            >
              <Crown className="w-12 h-12 text-white" />
              <motion.div 
                className="absolute -top-1 -right-1 bg-yellow-300 rounded-full p-1"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Sparkles className="w-4 h-4 text-amber-700" />
              </motion.div>
            </motion.div>
            <h1 className="text-3xl font-bold text-amber-900 mb-2">
              Founding Family #{foundingFamilyNumber}
            </h1>
            <p className="text-amber-700">Thank you for believing in GeoQuest!</p>
          </div>

          <Card className="bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0 shadow-xl">
            <CardContent className="p-6">
              <h3 className="font-bold text-lg mb-4">Your Founding Benefits</h3>
              <ul className="space-y-3">
                {benefits.map((benefit, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="text-amber-100">{benefit.icon}</div>
                    <span>{benefit.text}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-white p-4 overflow-hidden">
      <div className="max-w-lg mx-auto pt-8 relative">
        <button 
          onClick={() => setLocation('/')}
          className="flex items-center gap-2 text-amber-600 mb-6 hover:text-amber-800 transition-colors"
          data-testid="back-from-founding"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </button>

        {/* Hero Section with Animation */}
        <div className="text-center mb-8 relative">
          {/* Floating background icons */}
          <div className="absolute inset-0 -top-10 -bottom-10 overflow-visible pointer-events-none">
            {floatingIcons.map(({ Icon, delay, x, y }, i) => (
              <motion.div
                key={i}
                className="absolute text-amber-200/40"
                initial={{ opacity: 0, y: 20 }}
                animate={{ 
                  opacity: [0.3, 0.6, 0.3],
                  y: [y, y - 10, y],
                  x: [x, x + 5, x]
                }}
                transition={{
                  delay,
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                style={{ 
                  left: `${50 + x}%`, 
                  top: `${50 + y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <Icon className="w-8 h-8" />
              </motion.div>
            ))}
          </div>

          <motion.div 
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", duration: 0.8, bounce: 0.4 }}
            className="w-24 h-24 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full animate-ping opacity-30" />
            <Crown className="w-12 h-12 text-white drop-shadow-lg relative z-10" />
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl font-bold bg-gradient-to-r from-amber-700 via-orange-600 to-amber-700 bg-clip-text text-transparent mb-2"
          >
            Founding Families
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-amber-700 text-lg"
          >
            Be one of our first 100 families
          </motion.p>
        </div>

        {/* Availability Counter */}
        {availability && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-2xl shadow-xl p-6 mb-6 border-2 border-amber-200 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-100 to-transparent rounded-bl-full opacity-50" />
            <div className="flex items-center justify-between mb-4 relative">
              <span className="text-amber-800 font-semibold text-lg">Spots Available</span>
              <motion.span 
                key={availability.spotsRemaining}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent"
              >
                {availability.spotsRemaining} / {availability.totalCap}
              </motion.span>
            </div>
            <div className="w-full bg-amber-100 rounded-full h-4 overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(availability.enrolled / availability.totalCap) * 100}%` }}
                transition={{ delay: 0.7, duration: 1, ease: "easeOut" }}
                className="bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 h-4 rounded-full relative"
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              </motion.div>
            </div>
            {availability.spotsRemaining <= 20 && availability.spotsRemaining > 0 && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-orange-600 text-sm mt-3 font-semibold flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Only {availability.spotsRemaining} spots left - Join now!
              </motion.p>
            )}
          </motion.div>
        )}

        {/* Main Offer Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="border-2 border-amber-200 mb-6 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400" />
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-amber-100 rounded-full p-2">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <span className="font-bold text-amber-900 text-lg">Limited Time Offer</span>
              </div>
              
              {/* Free Trial Highlight */}
              <div className="mb-4 text-center py-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                <div className="flex items-center justify-center gap-2 text-green-700">
                  <Gift className="w-5 h-5" />
                  <span className="font-bold text-lg">Try 14 Days Free!</span>
                </div>
                <p className="text-green-600 text-sm mt-1">
                  Full access to GeoGames + GeoAdventures, on us
                </p>
              </div>
              
              <div className="mb-6 text-center py-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl">
                <p className="text-amber-600 text-sm mb-2 font-medium">Then only</p>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-5xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">{p.foundingMonthly}</span>
                  <span className="text-gray-500 text-lg">/month</span>
                  <span className="line-through text-gray-400 ml-2 text-lg">{p.monthly}</span>
                </div>
                <p className="text-amber-700 mt-2 font-medium">
                  Price locked for 12 months (then {p.monthly}/mo)
                </p>
              </div>

              <ul className="space-y-4 mb-6">
                {benefits.map((benefit, i) => (
                  <motion.li 
                    key={i} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + i * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <div className={`${benefit.highlight ? 'text-amber-500 bg-amber-100' : 'text-green-500 bg-green-100'} rounded-full p-1.5 mt-0.5 flex-shrink-0`}>
                      {benefit.highlight ? benefit.icon : <Check className="w-4 h-4" />}
                    </div>
                    <div>
                      <span className={`${benefit.highlight ? 'font-semibold text-amber-800' : 'text-gray-700'}`}>
                        {benefit.text}
                      </span>
                      {benefit.description && (
                        <p className="text-sm text-gray-500 mt-0.5">
                          {benefit.description}{' '}
                          <button 
                            onClick={() => setShowGeoAdventuresInfo(true)}
                            className="text-amber-600 hover:text-amber-700 underline"
                          >
                            Learn more
                          </button>
                        </p>
                      )}
                    </div>
                  </motion.li>
                ))}
              </ul>

              {availability?.available ? (
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    onClick={handleJoinFoundingFamilies}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-600 hover:via-orange-600 hover:to-amber-600 text-white shadow-lg hover:shadow-xl transition-all h-14 text-lg font-semibold"
                    size="lg"
                    data-testid="join-founding-families"
                  >
                    {isLoading ? (
                      <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-6 h-6 mr-2" />
                    )}
                    Start My Free Trial
                  </Button>
                  <p className="text-xs text-center text-gray-500 mt-2">
                    No credit card required to start
                  </p>
                </motion.div>
              ) : (
                <div className="text-center py-4 bg-gray-50 rounded-xl">
                  <p className="text-gray-600 font-medium">
                    All 100 Founding Family spots have been claimed!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Testimonial/Trust Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="bg-white rounded-2xl p-5 shadow-lg border border-amber-100 mb-6"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 border-2 border-white flex items-center justify-center text-white text-xs font-bold">A</div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-400 to-pink-600 border-2 border-white flex items-center justify-center text-white text-xs font-bold">M</div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-400 to-green-600 border-2 border-white flex items-center justify-center text-white text-xs font-bold">J</div>
            </div>
            <span className="text-sm text-gray-600">Families are loving GeoQuest!</span>
          </div>
          <p className="text-gray-700 italic text-sm">
            "My kids ask to play every day! They're learning so much about the world while having fun."
          </p>
        </motion.div>

        <p className="text-center text-sm text-gray-500 pb-8">
          Questions?{' '}
          <a 
            href="mailto:support@geoquestgame.com" 
            className="text-amber-600 hover:text-amber-700 underline font-medium"
          >
            Contact us
          </a>
        </p>
      </div>
      
      <TrialConfirmationModal
        open={showTrialModal}
        onClose={() => setShowTrialModal(false)}
        onStartTrial={() => {
          setShowTrialModal(false);
        }}
      />
      
      {/* Sign Up/Login Prompt */}
      <SignUpPrompt
        isOpen={showSignUpPrompt}
        onClose={() => setShowSignUpPrompt(false)}
        onLogin={handleLoginSuccess}
        variant="game"
      />
      
      {/* GeoAdventures Info Dialog */}
      <Dialog open={showGeoAdventuresInfo} onOpenChange={setShowGeoAdventuresInfo}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Plane className="w-6 h-6 text-amber-600" />
              GeoAdventures
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              Your family's travel companion! GeoAdventures helps you plan, experience, and remember your trips together.
            </p>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
                <Map className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-amber-900">Plan Your Journey</h4>
                  <p className="text-sm text-gray-600">Discover destinations and download content for offline use</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <Camera className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-blue-900">Capture Moments</h4>
                  <p className="text-sm text-gray-600">Photo journaling to remember your adventures</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                <Headphones className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-purple-900">Experience the Place</h4>
                  <p className="text-sm text-gray-600">Listen to stories, discover culture, and play family games</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <BookOpen className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-green-900">Create Your Travel Scrapbook</h4>
                  <p className="text-sm text-gray-600">Build lasting memories with your family travel journal</p>
                </div>
              </div>
            </div>
            
            <p className="text-sm text-gray-500 text-center pt-2">
              Founding Families get full offline access for all trips!
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
