import React, { useState, useEffect, useRef, createContext, useContext, ReactNode } from "react";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gift, Star, Trophy, Mail, Printer, Check, Award, Globe, Sparkles, ShieldCheck, X, ChevronRight, Lock, PartyPopper } from "lucide-react";
import { useParentalGate } from "./ParentalGate";

interface RewardTier {
  id: string;
  name: string;
  description: string;
  triggerType: string;
  triggerValue: number;
  rewardType: string;
  rewardDescription: string;
  displayOrder: number;
}

interface RewardUnlock {
  id: string;
  explorerId: string;
  tierId: string;
  status: string;
  unlockedAt: string;
  claimedAt: string | null;
  parentEmail: string | null;
  tier: RewardTier;
}

interface RewardUnlockPopupProps {
  isOpen: boolean;
  onClose: () => void;
  unlock: RewardUnlock | null;
  explorerName: string;
  onClaimReward: () => void;
}

export function RewardUnlockPopup({
  isOpen,
  onClose,
  unlock,
  explorerName,
  onClaimReward,
}: RewardUnlockPopupProps) {
  const hasTriggeredConfetti = useRef(false);

  useEffect(() => {
    if (isOpen && !hasTriggeredConfetti.current) {
      hasTriggeredConfetti.current = true;

      const duration = 4000;
      const animationEnd = Date.now() + duration;
      const colors = ["#FFD700", "#FFA500", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#A855F7"];

      const frame = () => {
        if (Date.now() > animationEnd) return;

        confetti({
          particleCount: 4,
          angle: 60,
          spread: 80,
          origin: { x: 0, y: 0.5 },
          colors: colors,
          startVelocity: 50,
          gravity: 0.7,
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 80,
          origin: { x: 1, y: 0.5 },
          colors: colors,
          startVelocity: 50,
          gravity: 0.7,
        });

        requestAnimationFrame(frame);
      };

      frame();

      setTimeout(() => {
        confetti({
          particleCount: 150,
          spread: 120,
          origin: { x: 0.5, y: 0.3 },
          colors: colors,
          startVelocity: 60,
          gravity: 0.5,
        });
      }, 500);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      hasTriggeredConfetti.current = false;
    }
  }, [isOpen]);

  if (!unlock) return null;

  const getRewardIcon = () => {
    switch (unlock.tier.rewardType) {
      case 'certificate':
        return <Award className="w-12 h-12 text-amber-500" />;
      case 'sticker_pack':
        return <Star className="w-12 h-12 text-purple-500" />;
      case 'world_map_puzzle':
        return <Globe className="w-12 h-12 text-blue-500" />;
      case 'magazine_subscription':
        return <Gift className="w-12 h-12 text-green-500" />;
      default:
        return <Trophy className="w-12 h-12 text-amber-500" />;
    }
  };

  const getRewardEmoji = () => {
    switch (unlock.tier.rewardType) {
      case 'certificate': return '📜';
      case 'sticker_pack': return '🌟';
      case 'world_map_puzzle': return '🧩';
      case 'magazine_subscription': return '📚';
      default: return '🎁';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-md overflow-hidden bg-gradient-to-b from-purple-50 via-pink-50 to-amber-50 dark:from-purple-950 dark:via-pink-950 dark:to-amber-950 border-4 border-purple-400 dark:border-purple-600 rounded-3xl"
        data-testid="modal-reward-unlock"
      >
        <DialogTitle className="sr-only">Reward Unlocked!</DialogTitle>

        <div className="flex flex-col items-center text-center py-4">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
            className="relative mb-4"
          >
            <div className="absolute inset-0 bg-purple-400/30 dark:bg-purple-500/30 rounded-full blur-xl scale-150" />
            <div className="relative bg-gradient-to-br from-purple-400 via-pink-400 to-amber-400 dark:from-purple-500 dark:via-pink-500 dark:to-amber-500 p-6 rounded-full shadow-lg">
              {getRewardIcon()}
            </div>
          </motion.div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
            className="mb-3"
          >
            <PartyPopper className="w-10 h-10 text-amber-500 dark:text-amber-400" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-heading font-black text-purple-700 dark:text-purple-300 mb-2"
          >
            Reward Unlocked!
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-lg text-gray-700 dark:text-gray-300 mb-2"
          >
            Amazing work, {explorerName}!
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-white/70 dark:bg-black/30 rounded-2xl p-4 mb-4 w-full"
          >
            <div className="text-4xl mb-2">{getRewardEmoji()}</div>
            <h3 className="text-xl font-bold text-purple-800 dark:text-purple-200 mb-1">
              {unlock.tier.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {unlock.tier.description}
            </p>
            <div className="bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900 dark:to-orange-900 rounded-xl p-3">
              <p className="text-amber-800 dark:text-amber-200 font-semibold">
                {unlock.tier.rewardDescription}
              </p>
            </div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-sm text-gray-600 dark:text-gray-400 mb-4"
          >
            Ask a grown-up to help you claim your prize!
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex gap-3 w-full"
          >
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-2 border-gray-300"
              data-testid="button-later-reward"
            >
              Later
            </Button>
            <Button
              onClick={onClaimReward}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold shadow-lg"
              data-testid="button-claim-reward"
            >
              <Gift className="w-4 h-4 mr-2" />
              Claim Prize!
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ParentClaimScreenProps {
  isOpen: boolean;
  onClose: () => void;
  unlock: RewardUnlock | null;
  explorerName: string;
  onSubmit: (email: string, address?: string) => Promise<void>;
}

export function ParentClaimScreen({
  isOpen,
  onClose,
  unlock,
  explorerName,
  onSubmit,
}: ParentClaimScreenProps) {
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const needsShipping = unlock?.tier.rewardType === 'sticker_pack' || 
                        unlock?.tier.rewardType === 'world_map_puzzle' ||
                        unlock?.tier.rewardType === 'magazine_subscription';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Please enter your email address");
      return;
    }

    if (needsShipping && !address) {
      setError("Please enter your shipping address");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(email, needsShipping ? address : undefined);
      setIsSuccess(true);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setAddress("");
    setError("");
    setIsSuccess(false);
    onClose();
  };

  if (!unlock) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className="sm:max-w-lg bg-gradient-to-b from-blue-50 to-white dark:from-blue-950 dark:to-gray-900 border-2 border-blue-200 dark:border-blue-800 rounded-2xl"
        data-testid="modal-parent-claim"
      >
        <DialogTitle className="sr-only">Claim Reward</DialogTitle>

        {isSuccess ? (
          <div className="flex flex-col items-center text-center py-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4"
            >
              <Check className="w-10 h-10 text-green-600 dark:text-green-400" />
            </motion.div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
              Reward Claimed!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {unlock.tier.rewardType === 'certificate' 
                ? "You can now print the certificate!"
                : "We'll send confirmation to your email shortly."}
            </p>
            <Button
              onClick={handleClose}
              className="bg-green-500 hover:bg-green-600 text-white"
              data-testid="button-done-claim"
            >
              Done
            </Button>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="mx-auto mb-4 w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">
                Parent Verification
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {explorerName} earned a reward! Please confirm to claim it.
              </p>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-200 dark:bg-purple-800 rounded-full flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-purple-600 dark:text-purple-300" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-purple-800 dark:text-purple-200">
                    {unlock.tier.name}
                  </p>
                  <p className="text-sm text-purple-600 dark:text-purple-400">
                    {unlock.tier.rewardDescription}
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">
                  Parent's Email
                </Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="parent@email.com"
                    className="pl-10"
                    data-testid="input-parent-email"
                  />
                </div>
              </div>

              {needsShipping && (
                <div>
                  <Label htmlFor="address" className="text-gray-700 dark:text-gray-300">
                    Shipping Address
                  </Label>
                  <textarea
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street address, city, state, zip code"
                    className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none h-24"
                    data-testid="input-shipping-address"
                  />
                </div>
              )}

              {error && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3 text-center">
                  <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                  data-testid="button-cancel-claim"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-purple-500 hover:bg-purple-600 text-white"
                  data-testid="button-submit-claim"
                >
                  {isSubmitting ? "Submitting..." : "Claim Reward"}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface CertificateData {
  explorerName: string;
  avatarKey: string;
  tierName: string;
  rewardDescription: string;
  masteredCities: { city: string; country: string }[];
  unlockedAt: string;
}

interface PrintableCertificateProps {
  isOpen: boolean;
  onClose: () => void;
  data: CertificateData | null;
}

export function PrintableCertificate({
  isOpen,
  onClose,
  data,
}: PrintableCertificateProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (printRef.current) {
      const printContent = printRef.current.innerHTML;
      const printWindow = window.open('', '', 'height=600,width=800');
      if (printWindow) {
        printWindow.document.write('<html><head><title>Geography Explorer Certificate</title>');
        printWindow.document.write('<style>');
        printWindow.document.write(`
          @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Fredoka:wght@600&display=swap');
          body { margin: 0; padding: 20px; font-family: 'Fredoka', sans-serif; }
          .certificate { 
            width: 100%; 
            max-width: 700px; 
            margin: 0 auto; 
            padding: 40px; 
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fef3c7 100%);
            border: 8px double #92400e;
            border-radius: 20px;
            text-align: center;
          }
          .title { 
            font-family: 'Dancing Script', cursive;
            font-size: 48px; 
            color: #92400e;
            margin-bottom: 10px;
          }
          .name { 
            font-size: 36px; 
            color: #1e40af;
            margin: 20px 0;
          }
          .achievement { 
            font-size: 20px; 
            color: #374151;
            margin: 15px 0;
          }
          .cities { 
            font-size: 16px; 
            color: #4b5563;
            margin: 15px 0;
          }
          .date { 
            font-size: 14px; 
            color: #6b7280;
            margin-top: 30px;
          }
          .stars { 
            font-size: 30px;
            margin: 15px 0;
          }
        `);
        printWindow.document.write('</style></head><body>');
        printWindow.document.write(printContent);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }
    }
  };

  if (!data) return null;

  const formattedDate = new Date(data.unlockedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-2xl bg-white dark:bg-gray-900 rounded-2xl max-h-[90vh] overflow-auto"
        data-testid="modal-certificate"
      >
        <DialogTitle className="sr-only">Geography Explorer Certificate</DialogTitle>

        <div className="p-4">
          <div
            ref={printRef}
            className="certificate bg-gradient-to-br from-amber-100 via-amber-50 to-amber-100 p-8 rounded-2xl border-8 border-double border-amber-700"
          >
            <div className="stars">⭐⭐⭐⭐⭐</div>
            <h1 className="title text-4xl font-script text-amber-800 mb-2" style={{ fontFamily: "'Dancing Script', cursive" }}>
              Certificate of Achievement
            </h1>
            <p className="text-gray-600 text-sm mb-4">GeoQuest Geography Explorer</p>
            
            <div className="my-6">
              <p className="text-gray-600">This certifies that</p>
              <h2 className="name text-3xl font-bold text-blue-700 my-2">{data.explorerName}</h2>
              <p className="text-gray-600">has successfully achieved</p>
            </div>

            <div className="bg-white/60 rounded-xl p-4 my-4">
              <h3 className="achievement text-xl font-bold text-amber-800">
                {data.tierName}
              </h3>
              <p className="text-gray-600">{data.rewardDescription}</p>
            </div>

            {data.masteredCities.length > 0 && (
              <div className="cities my-4">
                <p className="text-gray-500 mb-2">Cities Remembered:</p>
                <p className="text-gray-700 font-semibold">
                  {data.masteredCities.map(c => `${c.city}, ${c.country}`).join(' • ')}
                </p>
              </div>
            )}

            <div className="date text-gray-500 mt-6">
              Awarded on {formattedDate}
            </div>

            <div className="mt-4 text-2xl">🌍 🗺️ 🌎</div>
          </div>

          <div className="flex gap-3 mt-6 justify-center">
            <Button
              variant="outline"
              onClick={onClose}
              data-testid="button-close-certificate"
            >
              Close
            </Button>
            <Button
              onClick={handlePrint}
              className="bg-amber-500 hover:bg-amber-600 text-white"
              data-testid="button-print-certificate"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print Certificate
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface RewardProgressCardProps {
  tier: RewardTier;
  unlock?: RewardUnlock;
  currentProgress: number;
  onClaim?: () => void;
  onViewCertificate?: () => void;
}

export function RewardProgressCard({
  tier,
  unlock,
  currentProgress,
  onClaim,
  onViewCertificate,
}: RewardProgressCardProps) {
  const isUnlocked = !!unlock;
  const isClaimed = unlock?.status === 'claimed' || unlock?.status === 'fulfilled';
  const progress = Math.min((currentProgress / tier.triggerValue) * 100, 100);

  const getRewardEmoji = () => {
    switch (tier.rewardType) {
      case 'certificate': return '📜';
      case 'sticker_pack': return '🌟';
      case 'world_map_puzzle': return '🧩';
      case 'magazine_subscription': return '📚';
      default: return '🎁';
    }
  };

  return (
    <div
      className={`relative rounded-2xl border-2 p-4 transition-all ${
        isUnlocked
          ? 'bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-purple-300 dark:border-purple-700'
          : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
      }`}
      data-testid={`reward-card-${tier.id}`}
    >
      {!isUnlocked && (
        <div className="absolute top-3 right-3">
          <Lock className="w-5 h-5 text-gray-400" />
        </div>
      )}
      {isClaimed && (
        <div className="absolute top-3 right-3">
          <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <Check className="w-3 h-3" />
            Claimed
          </div>
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className={`text-3xl ${!isUnlocked ? 'opacity-40 grayscale' : ''}`}>
          {getRewardEmoji()}
        </div>
        <div className="flex-1">
          <h3 className={`font-bold ${isUnlocked ? 'text-purple-800 dark:text-purple-200' : 'text-gray-600 dark:text-gray-400'}`}>
            {tier.name}
          </h3>
          <p className={`text-sm ${isUnlocked ? 'text-gray-600 dark:text-gray-400' : 'text-gray-500 dark:text-gray-500'}`}>
            {tier.description}
          </p>
        </div>
      </div>

      {!isUnlocked && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progress</span>
            <span>{currentProgress}/{tier.triggerValue}</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {isUnlocked && !isClaimed && onClaim && (
        <Button
          onClick={onClaim}
          size="sm"
          className="mt-3 w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
          data-testid={`button-claim-${tier.id}`}
        >
          <Gift className="w-4 h-4 mr-2" />
          Claim Reward
        </Button>
      )}

      {isClaimed && tier.rewardType === 'certificate' && onViewCertificate && (
        <Button
          onClick={onViewCertificate}
          size="sm"
          variant="outline"
          className="mt-3 w-full border-purple-300 text-purple-700 hover:bg-purple-50"
          data-testid={`button-view-certificate-${tier.id}`}
        >
          <Printer className="w-4 h-4 mr-2" />
          View Certificate
        </Button>
      )}
    </div>
  );
}

interface RewardContextType {
  showRewardUnlock: (unlock: RewardUnlock, explorerName: string, onDismiss?: () => void) => void;
  evaluateRewards: (explorerId: string) => Promise<RewardUnlock[]>;
}

const RewardContext = createContext<RewardContextType | null>(null);

export function useRewards() {
  const context = useContext(RewardContext);
  if (!context) {
    throw new Error("useRewards must be used within a RewardProvider");
  }
  return context;
}

interface RewardProviderProps {
  children: ReactNode;
}

export function RewardProvider({ children }: RewardProviderProps) {
  const [unlockPopupOpen, setUnlockPopupOpen] = useState(false);
  const [claimScreenOpen, setClaimScreenOpen] = useState(false);
  const [certificateOpen, setCertificateOpen] = useState(false);
  const [currentUnlock, setCurrentUnlock] = useState<RewardUnlock | null>(null);
  const [currentExplorerName, setCurrentExplorerName] = useState("");
  const [certificateData, setCertificateData] = useState<CertificateData | null>(null);
  const onDismissCallbackRef = useRef<(() => void) | null>(null);
  const { requestAccess } = useParentalGate();

  const showRewardUnlock = (unlock: RewardUnlock, explorerName: string, onDismiss?: () => void) => {
    setCurrentUnlock(unlock);
    setCurrentExplorerName(explorerName);
    onDismissCallbackRef.current = onDismiss || null;
    setUnlockPopupOpen(true);
  };

  const handlePopupClose = () => {
    setUnlockPopupOpen(false);
    if (onDismissCallbackRef.current) {
      onDismissCallbackRef.current();
      onDismissCallbackRef.current = null;
    }
  };

  const evaluateRewards = async (explorerId: string): Promise<RewardUnlock[]> => {
    try {
      const response = await fetch(`/api/rewards/evaluate/${explorerId}`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to evaluate rewards');
      const data = await response.json();
      return data.newUnlocks || [];
    } catch (error) {
      console.error('Error evaluating rewards:', error);
      return [];
    }
  };

  const handleClaimReward = () => {
    setUnlockPopupOpen(false);
    const dismissCallback = onDismissCallbackRef.current;
    onDismissCallbackRef.current = null;
    requestAccess(() => {
      setClaimScreenOpen(true);
    });
    if (dismissCallback) {
      dismissCallback();
    }
  };

  const handleSubmitClaim = async (email: string, address?: string) => {
    if (!currentUnlock) return;

    const response = await fetch(`/api/rewards/claim/${currentUnlock.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentEmail: email, shippingAddress: address }),
    });

    if (!response.ok) {
      throw new Error('Failed to claim reward');
    }

    if (currentUnlock.tier.rewardType === 'certificate') {
      const certResponse = await fetch(`/api/rewards/certificate/${currentUnlock.id}`);
      if (certResponse.ok) {
        const certData = await certResponse.json();
        setCertificateData(certData);
        setClaimScreenOpen(false);
        setCertificateOpen(true);
      }
    }
  };

  return (
    <RewardContext.Provider value={{ showRewardUnlock, evaluateRewards }}>
      {children}
      <RewardUnlockPopup
        isOpen={unlockPopupOpen}
        onClose={handlePopupClose}
        unlock={currentUnlock}
        explorerName={currentExplorerName}
        onClaimReward={handleClaimReward}
      />
      <ParentClaimScreen
        isOpen={claimScreenOpen}
        onClose={() => setClaimScreenOpen(false)}
        unlock={currentUnlock}
        explorerName={currentExplorerName}
        onSubmit={handleSubmitClaim}
      />
      <PrintableCertificate
        isOpen={certificateOpen}
        onClose={() => setCertificateOpen(false)}
        data={certificateData}
      />
    </RewardContext.Provider>
  );
}
