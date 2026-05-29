import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useExplorer } from '@/lib/explorerContext';
import { useUser } from '@/lib/userContext';
import { useSubscription } from '@/lib/subscriptionContext';
import { UpgradePrompt } from '@/components/UpgradePrompt';

const AVATAR_OPTIONS = [
  { key: 'panda', emoji: '🐼', name: 'Panda' },
  { key: 'lion', emoji: '🦁', name: 'Lion' },
  { key: 'elephant', emoji: '🐘', name: 'Elephant' },
  { key: 'penguin', emoji: '🐧', name: 'Penguin' },
  { key: 'koala', emoji: '🐨', name: 'Koala' },
  { key: 'fox', emoji: '🦊', name: 'Fox' },
  { key: 'owl', emoji: '🦉', name: 'Owl' },
  { key: 'turtle', emoji: '🐢', name: 'Turtle' },
  { key: 'butterfly', emoji: '🦋', name: 'Butterfly' },
  { key: 'dolphin', emoji: '🐬', name: 'Dolphin' },
  { key: 'rocket', emoji: '🚀', name: 'Rocket' },
  { key: 'globe', emoji: '🌍', name: 'Globe' },
];

const AGE_RANGES = [
  { value: '3-5', label: '3-5 years', emoji: '👶' },
  { value: '6-9', label: '6-9 years', emoji: '🧒' },
  { value: '9+', label: '9+ years', emoji: '👦' },
  { value: 'adult', label: 'Adult', emoji: '👨' },
];

const DIFFICULTY_LEVELS = [
  { value: 'easy', label: 'Easy', description: 'Perfect for beginners', color: 'bg-green-100 border-green-400' },
  { value: 'medium', label: 'Medium', description: 'Some challenge', color: 'bg-yellow-100 border-yellow-400' },
  { value: 'hard', label: 'Hard', description: 'For geography experts', color: 'bg-red-100 border-red-400' },
];

export default function AddExplorer() {
  const [, navigate] = useLocation();
  const { user } = useUser();
  const { createExplorer, createGuestExplorer, explorers } = useExplorer();
  const subscription = useSubscription();
  const limits = subscription?.limits ?? { maxExplorers: 3 };
  const isPro = subscription?.isPro ?? false;
  
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('panda');
  const [selectedAgeRange, setSelectedAgeRange] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState('medium');
  const [isCreating, setIsCreating] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const maxExplorers = limits.maxExplorers;
  const canAddMore = explorers.length < maxExplorers;
  const hasAdultExplorer = explorers.some(e => e.profileType === 'adult' || e.ageRange === 'adult');

  const handleCreate = async () => {
    if (!name.trim()) return;
    
    setIsCreating(true);
    try {
      const explorerData = {
        name: name.trim(),
        userId: user?.id || '',
        email: user?.email,
        avatarKey: selectedAvatar,
        ageRange: selectedAgeRange as any,
        difficultyLevel: selectedDifficulty as any,
        profileType: selectedAgeRange === 'adult' ? 'adult' : 'kid',
      };
      
      let explorer;
      if (user?.id) {
        explorer = await createExplorer(explorerData);
      } else {
        explorer = await createGuestExplorer(explorerData);
      }
      
      if (explorer) {
        navigate('/whos-playing');
      }
    } catch (error) {
      console.error('Failed to create explorer:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigate('/whos-playing');
    }
  };

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      handleCreate();
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return name.trim().length > 0;
      case 2: return selectedAvatar !== null;
      case 3: return selectedAgeRange !== null;
      case 4: return selectedDifficulty !== null;
      default: return false;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-400 via-blue-300 to-green-300 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-white text-xl font-fredoka">Please sign in to add explorers</p>
          <Button 
            className="mt-4"
            onClick={() => window.location.href = '/api/login'}
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  if (!canAddMore) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-400 via-blue-300 to-green-300 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-2xl p-8 shadow-xl max-w-md">
          <div className="text-6xl mb-4">{isPro ? '😅' : '👑'}</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2 font-fredoka" data-testid="text-explorer-limit-title">
            {isPro ? 'Team is Full!' : 'Explorer Limit Reached'}
          </h2>
          <p className="text-gray-600 mb-6" data-testid="text-explorer-limit-description">
            {isPro 
              ? `You've reached the maximum of ${maxExplorers} explorers.`
              : `Free accounts include ${maxExplorers} explorers. Upgrade to add up to 7!`
            }
          </p>
          <div className="flex flex-col gap-3">
            <Button onClick={() => navigate('/whos-playing')} data-testid="button-back-explorers">
              Back to Explorers
            </Button>
            {!isPro && (
              <Button 
                onClick={() => setShowUpgradePrompt(true)}
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                data-testid="button-upgrade-explorers"
              >
                <Crown className="w-4 h-4 mr-2" />
                Unlock More Explorers
              </Button>
            )}
          </div>
          <UpgradePrompt
            isOpen={showUpgradePrompt}
            onClose={() => setShowUpgradePrompt(false)}
            feature="extra_explorers"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-400 via-blue-300 to-green-300 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="text-white hover:bg-white/20 mb-4"
          data-testid="back-button"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </Button>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-white font-fredoka drop-shadow-lg mb-2">
            Add New Explorer
          </h1>
          <div className="flex justify-center gap-2 mt-4">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`w-3 h-3 rounded-full ${
                  s === step ? 'bg-yellow-400' : s < step ? 'bg-green-400' : 'bg-white/40'
                }`}
              />
            ))}
          </div>
        </motion.div>

        <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
          <CardContent className="p-6 md:p-8">
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <h2 className="text-2xl font-bold text-gray-800 mb-4 font-fredoka text-center">
                  What's their name?
                </h2>
                <Input
                  type="text"
                  placeholder="Enter name..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-lg py-6 text-center"
                  maxLength={20}
                  autoFocus
                  data-testid="name-input"
                />
                <p className="text-sm text-gray-500 text-center mt-2">
                  This is how they'll appear in the game
                </p>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <h2 className="text-2xl font-bold text-gray-800 mb-4 font-fredoka text-center">
                  Choose an avatar for {name}
                </h2>
                <div className="grid grid-cols-4 gap-3">
                  {AVATAR_OPTIONS.map((avatar) => (
                    <button
                      key={avatar.key}
                      onClick={() => setSelectedAvatar(avatar.key)}
                      className={`p-3 rounded-xl text-4xl transition-all ${
                        selectedAvatar === avatar.key
                          ? 'bg-yellow-100 ring-4 ring-yellow-400 scale-110'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                      data-testid={`avatar-${avatar.key}`}
                    >
                      {avatar.emoji}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <h2 className="text-2xl font-bold text-gray-800 mb-4 font-fredoka text-center">
                  How old is {name}?
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {AGE_RANGES.map((age) => {
                    const isAdultOption = age.value === 'adult';
                    const isDisabled = isAdultOption && hasAdultExplorer;
                    
                    return (
                      <button
                        key={age.value}
                        onClick={() => !isDisabled && setSelectedAgeRange(age.value)}
                        disabled={isDisabled}
                        className={`p-4 rounded-xl transition-all flex flex-col items-center ${
                          isDisabled
                            ? 'bg-gray-200 opacity-50 cursor-not-allowed'
                            : selectedAgeRange === age.value
                              ? 'bg-yellow-100 ring-4 ring-yellow-400'
                              : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                        data-testid={`age-${age.value}`}
                      >
                        <span className="text-3xl mb-1">{age.emoji}</span>
                        <span className="font-medium">{age.label}</span>
                        {isDisabled && (
                          <span className="text-xs text-gray-500 mt-1">Already exists</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <h2 className="text-2xl font-bold text-gray-800 mb-4 font-fredoka text-center">
                  Choose difficulty level
                </h2>
                <div className="space-y-3">
                  {DIFFICULTY_LEVELS.map((level) => (
                    <button
                      key={level.value}
                      onClick={() => setSelectedDifficulty(level.value)}
                      className={`w-full p-4 rounded-xl transition-all text-left border-2 ${
                        selectedDifficulty === level.value
                          ? `${level.color} ring-2 ring-offset-2`
                          : 'bg-gray-50 border-transparent hover:bg-gray-100'
                      }`}
                      data-testid={`difficulty-${level.value}`}
                    >
                      <div className="font-bold text-lg">{level.label}</div>
                      <div className="text-sm text-gray-600">{level.description}</div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            <div className="mt-8 flex justify-end">
              <Button
                size="lg"
                onClick={handleNext}
                disabled={!canProceed() || isCreating}
                className="bg-green-500 hover:bg-green-600 text-white font-bold gap-2 min-w-32"
                data-testid="next-button"
              >
                {isCreating ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                ) : step === 4 ? (
                  <>
                    <Check className="w-5 h-5" />
                    Create
                  </>
                ) : (
                  'Next'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
