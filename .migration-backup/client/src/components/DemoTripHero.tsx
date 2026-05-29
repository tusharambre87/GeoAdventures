import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, ChevronRight, Plane, Sparkles } from "lucide-react";

interface DemoTripHeroProps {
  onTrySample: () => void;
  onCreateTrip: () => void;
  onCreateVirtual?: () => void;
  buildLocked?: boolean;
  onSignUp?: () => void;
}

const LANDMARK_IMAGES = [
  { name: "Eiffel Tower", url: "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=120&h=80&fit=crop", emoji: "🗼" },
  { name: "Taj Mahal", url: "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=120&h=80&fit=crop", emoji: "🕌" },
  { name: "Big Ben", url: "https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=120&h=80&fit=crop", emoji: "🇬🇧" },
  { name: "Sydney Opera", url: "https://images.unsplash.com/photo-1524293581917-878a6d017c71?w=120&h=80&fit=crop", emoji: "🎭" },
  { name: "Statue of Liberty", url: "https://images.unsplash.com/photo-1503174971373-b1f69850bded?w=120&h=80&fit=crop", emoji: "🗽" },
  { name: "Pyramids", url: "https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?w=120&h=80&fit=crop", emoji: "🏛️" },
  { name: "Hawaii Beach", url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=120&h=80&fit=crop", emoji: "🏖️" },
  { name: "Volcano", url: "https://images.unsplash.com/photo-1462332420958-a05d1e002413?w=120&h=80&fit=crop", emoji: "🌋" },
];

export function DemoTripHero({ onTrySample, onCreateTrip, onCreateVirtual, buildLocked, onSignUp }: DemoTripHeroProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="bg-gradient-to-br from-violet-100 via-purple-50 to-orange-50 dark:from-violet-900/30 dark:via-purple-900/20 dark:to-orange-900/20 border-violet-200 dark:border-violet-700 shadow-lg overflow-hidden">
        <CardContent className="p-6 space-y-5">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 leading-tight">
              Turn trips into memories your kids actually remember.
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Stories, games, and moments that help your child notice, explore, and talk about every place you visit.
            </p>
          </div>

          <div className="bg-white/60 dark:bg-slate-800/40 rounded-xl p-4 space-y-3" data-testid="pain-hook-section">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 text-center">
              Sound familiar?
            </h3>
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <span className="text-lg flex-shrink-0">🚗</span>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  <span className="italic">"Are we there yet?"</span> five minutes into the drive.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-lg flex-shrink-0">📱</span>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Phones come out at every stop.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-lg flex-shrink-0">🏛️</span>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  You visit amazing places… but kids barely remember them.
                </p>
              </div>
            </div>
            <p className="text-xs text-violet-600 dark:text-violet-300 font-medium text-center">
              GeoAdventures turns every stop into something kids notice, explore, and remember.
            </p>
          </div>

          <div className="bg-white/60 dark:bg-slate-800/40 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 text-center">
              How it works
            </h3>
            <div className="flex flex-col gap-2 text-sm text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-700 dark:text-violet-300 text-xs font-bold flex-shrink-0">1</span>
                <span>Visit a place</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-700 dark:text-violet-300 text-xs font-bold flex-shrink-0">2</span>
                <span>Your child listens, notices, and plays</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-700 dark:text-violet-300 text-xs font-bold flex-shrink-0">3</span>
                <span>You capture a memory together</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="space-y-1">
              <Button
                onClick={onTrySample}
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-md rounded-xl justify-center"
                data-testid="button-try-sample-adventure"
              >
                <MapPin className="w-5 h-5 mr-2" />
                Try a 3-minute adventure
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
              <p className="text-xs text-center text-slate-500 dark:text-slate-400">
                No signup. Takes 3 minutes.
              </p>
            </div>

            <div className="space-y-1">
              <Button
                onClick={onCreateTrip}
                className="w-full h-11 text-base font-semibold bg-violet-100 hover:bg-violet-200 text-violet-700 dark:bg-violet-900/40 dark:hover:bg-violet-900/60 dark:text-violet-300 rounded-xl shadow-none border-0"
                data-testid="button-create-trip-secondary"
              >
                <Plane className="w-5 h-5 mr-2" />
                Plan a trip for your family
              </Button>
              <p className="text-xs text-center text-slate-500 dark:text-slate-400">
                Takes 10 seconds · Kid-friendly
              </p>
            </div>

            {/* Sign-up nudge */}
            {onSignUp && (
              <p className="text-center text-xs text-slate-400 dark:text-slate-500 pt-1">
                Want to save your trips?{" "}
                <button
                  onClick={onSignUp}
                  className="text-violet-600 dark:text-violet-400 font-semibold hover:underline"
                  data-testid="link-signup-from-hero"
                >
                  Sign up free →
                </button>
              </p>
            )}
          </div>

          <div className="overflow-hidden rounded-xl -mx-2">
            <div className="flex animate-scroll-landmarks">
              {[...LANDMARK_IMAGES, ...LANDMARK_IMAGES].map((landmark, i) => (
                <div
                  key={`${landmark.name}-${i}`}
                  className="flex-shrink-0 w-24 mx-1"
                >
                  <div className="relative rounded-lg overflow-hidden shadow-sm">
                    <img
                      src={landmark.url}
                      alt={landmark.name}
                      className="w-24 h-16 object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    <span className="absolute bottom-1 left-1 text-white text-xs font-medium drop-shadow-md">
                      {landmark.emoji}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/50 dark:bg-slate-700/30 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Built for curious kids ages 5–12
            </p>
            <div className="flex justify-center gap-1 my-1">
              <span className="text-amber-400">⭐️⭐️⭐️⭐️⭐️</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              Loved by families who explore together
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface PreTripInterstitialProps {
  open: boolean;
  onContinueCreating: () => void;
  onTrySample: () => void;
}

export function PreTripInterstitial({ open, onContinueCreating, onTrySample }: PreTripInterstitialProps) {
  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onContinueCreating}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-violet-600 dark:text-violet-400" />
          </div>

          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Most family adventures become photos parents remember — not kids.
          </h3>

          <ul className="text-left space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400 text-xs">✓</span>
              Kids notice more
            </li>
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400 text-xs">✓</span>
              Ask better questions
            </li>
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400 text-xs">✓</span>
              Retell the experience later
            </li>
          </ul>

          <div className="flex flex-col gap-2 pt-2">
            <Button
              onClick={onContinueCreating}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white"
              data-testid="button-continue-creating"
            >
              Continue Building Adventure
            </Button>
            <Button
              onClick={onTrySample}
              variant="ghost"
              className="w-full text-sm text-slate-500"
              data-testid="button-try-sample-first"
            >
              Try Sample Adventure First
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
