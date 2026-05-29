import { Suspense, lazy, useState, useEffect, useRef } from 'react';
import { Compass, CheckCircle, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearch, useLocation } from 'wouter';
import { useUser } from '@/lib/userContext';
import { AuthGateSheet } from '@/components/planner/AuthGateSheet';

const TravelMode = lazy(() => import('@/pages/TravelMode'));

const LOADING_TIPS = [
  { icon: '🗺️', title: 'What is GeoAdventures?', text: 'A family travel journaling experience that turns trips into lasting memories.' },
  { icon: '📍', title: 'Before Your Stop', text: 'Listen to Journey Packs to learn about your destination on the way there.' },
  { icon: '📸', title: 'During Your Stop', text: 'Capture Moments - photos and notes that become part of your travel story.' },
  { icon: '✨', title: 'After Your Stop', text: 'Reflect on your experiences and unlock special Memory Anchors.' },
  { icon: '🎒', title: 'Journey Packs', text: 'Audio stories and fun facts about each place - perfect for car rides!' },
  { icon: '🏆', title: 'Travel Keepsakes', text: 'Complete activities at each stop to collect unique digital souvenirs.' },
];

const PENDING_CODE_KEY = 'pending_promo_code';

function LoadingFallback() {
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex(prev => (prev + 1) % LOADING_TIPS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const currentTip = LOADING_TIPS[tipIndex];

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-amber-50 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-lg">
          <Compass className="w-10 h-10 text-white animate-[spin_8s_linear_infinite]" />
        </div>
        <h2 className="text-xl font-bold text-orange-800 mb-2">GeoAdventures</h2>
        <p className="text-orange-600 font-medium mb-6">Loading your travel journal...</p>

        <AnimatePresence mode="wait">
          <motion.div
            key={tipIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-xl p-4 shadow-md border border-orange-200"
          >
            <div className="text-3xl mb-2">{currentTip.icon}</div>
            <h3 className="font-bold text-orange-700 text-sm mb-1">{currentTip.title}</h3>
            <p className="text-gray-600 text-sm">{currentTip.text}</p>
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-center gap-1.5 mt-4">
          {LOADING_TIPS.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${i === tipIndex ? 'bg-orange-500' : 'bg-orange-200'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

type BannerState =
  | { type: 'hidden' }
  | { type: 'applying' }
  | { type: 'success'; message: string }
  | { type: 'error'; message: string };

function CodeBanner({ state, onDismiss }: { state: BannerState; onDismiss: () => void }) {
  if (state.type === 'hidden') return null;

  const isApplying = state.type === 'applying';
  const isSuccess = state.type === 'success';
  const isError = state.type === 'error';

  return (
    <AnimatePresence>
      <motion.div
        key="code-banner"
        initial={{ opacity: 0, y: -60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -60 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className={`fixed top-0 left-0 right-0 z-50 flex items-center gap-3 px-4 py-3 shadow-lg
          ${isSuccess ? 'bg-green-600' : isError ? 'bg-red-600' : 'bg-orange-500'}`}
        role="status"
        aria-live="polite"
      >
        {isApplying && (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0" />
        )}
        {isSuccess && <CheckCircle className="w-5 h-5 text-white flex-shrink-0" />}
        {isError && <AlertCircle className="w-5 h-5 text-white flex-shrink-0" />}

        <p className="text-white text-sm font-semibold flex-1">
          {isApplying && 'Applying your exclusive offer…'}
          {isSuccess && state.message}
          {isError && state.message}
        </p>

        {!isApplying && (
          <button onClick={onDismiss} className="text-white/70 hover:text-white" aria-label="Dismiss">
            <X className="w-4 h-4" />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export function setInternalNavToAdventures() {}
export function setInternalNavToAdventureTrip(_tripId: string) {}

export function GatedTravelMode() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const { user } = useUser();

  const [banner, setBanner] = useState<BannerState>({ type: 'hidden' });
  const [authGateOpen, setAuthGateOpen] = useState(false);
  // The code we are currently trying to apply.
  // Cleared only after apply completes (success or definitive error) — NOT on auth-gate close.
  const [pendingCode, setPendingCode] = useState<string>('');
  // Guards against double-applying when user becomes available
  const applyingRef = useRef(false);

  // On mount: extract ?code= from URL, then fall back to localStorage.
  // Strip the param from the URL immediately so refreshes don't re-trigger.
  useEffect(() => {
    const params = new URLSearchParams(search);
    const urlCode = params.get('code')?.toUpperCase().trim();

    if (urlCode) {
      localStorage.setItem(PENDING_CODE_KEY, urlCode);
      setLocation('/geoadventures', { replace: true });
      setPendingCode(urlCode);
      return;
    }

    // Fallback: a previous visit stored the code (e.g. auth-gate was shown, user came back later)
    const stored = localStorage.getItem(PENDING_CODE_KEY)?.toUpperCase().trim();
    if (stored) setPendingCode(stored);
  }, []); // run once on mount

  // Whenever pendingCode and user are both ready, apply the code.
  useEffect(() => {
    if (!pendingCode || applyingRef.current) return;

    if (!user) {
      // Not logged in — show auth gate; code stays in localStorage until apply succeeds
      setAuthGateOpen(true);
    } else {
      // Logged in — apply immediately
      applyingRef.current = true;
      applyCode(pendingCode, user.id);
    }
  }, [pendingCode, user?.id]);

  const applyCode = async (code: string, _userId: string) => {
    setBanner({ type: 'applying' });
    // Whether this code should stay in localStorage after we finish (discount codes do)
    let keepInStorage = false;

    try {
      const valRes = await fetch('/api/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code }),
      });
      const valData = await valRes.json();

      if (!valRes.ok) {
        // Branch on errorType so exhausted AND expired both show the right custom message
        const errorType: string = valData.errorType || '';
        const customMsg =
          errorType === 'exhausted'
            ? valData.error || 'Sorry, this offer has already been used on another account. Contact us at hello@geoadventures.app if you think this is a mistake.'
            : errorType === 'expired'
            ? valData.error || 'This offer code has expired. Contact us at hello@geoadventures.app if you need help.'
            : valData.error || 'This offer code is no longer valid.';
        setBanner({ type: 'error', message: customMsg });
        return; // cleanup in finally
      }

      if (valData.accessType === 'full_free') {
        const redeemRes = await fetch('/api/promo/redeem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            code,
            destination: valData.label || 'GeoAdventures',
            tripId: valData.appliesToTripId || null,
          }),
        });
        const redeemData = await redeemRes.json();

        if (!redeemRes.ok) {
          const errorType: string = redeemData.errorType || '';
          const customMsg =
            errorType === 'exhausted'
              ? redeemData.error || 'Sorry, this offer has already been used on another account. Contact us at hello@geoadventures.app if you think this is a mistake.'
              : redeemData.error || 'Could not apply your offer code.';
          setBanner({ type: 'error', message: customMsg });
        } else {
          // Silent success — access is now unlocked, no banner noise needed
          setBanner({ type: 'hidden' });
        }
      } else {
        // Discount code — keep in localStorage for TripUnlockSheet to pick up at checkout
        keepInStorage = true;
        setBanner({ type: 'hidden' });
      }
    } catch {
      setBanner({ type: 'error', message: 'Something went wrong applying your code. Please try again.' });
    } finally {
      if (!keepInStorage) localStorage.removeItem(PENDING_CODE_KEY);
      setPendingCode('');
      applyingRef.current = false;
    }
  };

  // Called when auth sheet is dismissed by the user (backdrop/X click).
  // AuthGateSheet also calls onClose() on successful login (before onSuccess),
  // so we must NOT clear the code here — only close the sheet.
  const handleAuthClose = () => {
    setAuthGateOpen(false);
    // Code intentionally NOT cleared: if user cancelled, the code stays in
    // localStorage so it applies next time they open GeoAdventures while logged in.
  };

  // Called after successful login inside AuthGateSheet.
  // pendingCode is still set → the useEffect re-runs with the now-populated user.
  const handleAuthSuccess = () => {
    setAuthGateOpen(false);
  };

  return (
    <>
      <CodeBanner state={banner} onDismiss={() => setBanner({ type: 'hidden' })} />

      <AuthGateSheet
        open={authGateOpen}
        onClose={handleAuthClose}
        destination="GeoAdventures"
        onSuccess={handleAuthSuccess}
      />

      <Suspense fallback={<LoadingFallback />}>
        <TravelMode />
      </Suspense>
    </>
  );
}
