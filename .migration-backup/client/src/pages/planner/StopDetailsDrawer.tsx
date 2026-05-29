import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  X, MapPin, Clock, Zap, Home, Sun, Users, BookOpen, UtensilsCrossed,
  ParkingCircle, Droplets, Lightbulb, RefreshCw, ExternalLink, Volume2,
  CloudRain, Baby, Coffee, Scissors, ChevronDown, ChevronUp, Sunrise, Sunset, Star
} from "lucide-react";
import type { PlannerTripPlanStop, PlaceProfileJsonb, PlaceReferenceJsonb, ParentSupportJsonb, PlannerStopIntelligence } from "@shared/schema";
import { computeEffectiveDuration } from "@/lib/effectiveDuration";

interface Props {
  stop: PlannerTripPlanStop;
  intelligence?: PlannerStopIntelligence | null;
  onClose: () => void;
  onReplace: () => void;
  onLiveSupport: () => void;
  youngestChildAge?: number;
}

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? "#10b981" : score >= 65 ? "#f59e0b" : "#ef4444";
  const radius = 24;
  const circ = 2 * Math.PI * radius;
  const dash = (score / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1" data-testid="score-ring">
      <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="6" />
        <circle
          cx="32" cy="32" r={radius} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        />
      </svg>
      <span className="text-xl font-bold" style={{ color, marginTop: -52 }}>{score}</span>
      <span className="text-[10px] text-slate-400 font-medium mt-7">/ 100</span>
    </div>
  );
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px]">
        <span className="text-slate-500">{label}</span>
        <span className="font-semibold text-slate-700">{value}</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function QueueRiskBar({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? "#ef4444" : value >= 40 ? "#f59e0b" : "#10b981";
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-slate-400 w-16 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value ?? 0}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] font-medium text-slate-600 w-6 text-right">{value ?? 0}</span>
    </div>
  );
}

function IntelligencePanel({ intelligence }: { intelligence: PlannerStopIntelligence }) {
  const [expanded, setExpanded] = useState(false);

  const hasQueueData = intelligence.queueRiskMorning != null || intelligence.queueRiskMidday != null || intelligence.queueRiskAfternoon != null;
  const hasComponentScores = intelligence.kidFitScore != null && intelligence.flowFitScore != null;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 overflow-hidden" data-testid="section-intelligence">
      <button
        className="w-full flex items-center justify-between px-4 py-3"
        onClick={() => setExpanded(e => !e)}
        data-testid="button-toggle-intelligence"
      >
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-blue-500" fill="currentColor" />
          <span className="text-sm font-semibold text-blue-700">Family Intelligence</span>
          {intelligence.finalScore != null && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${
              intelligence.finalScore >= 80 ? "bg-emerald-500" : intelligence.finalScore >= 65 ? "bg-amber-400" : "bg-red-400"
            }`}>
              {intelligence.finalScore}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-blue-400" /> : <ChevronDown className="w-4 h-4 text-blue-400" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              {intelligence.rationaleShort && (
                <div className="bg-white/70 rounded-lg px-3 py-2 border border-blue-100">
                  <p className="text-[11px] font-semibold text-blue-600 mb-1">AI insight</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{intelligence.rationaleShort}</p>
                </div>
              )}

              <div className="flex items-start gap-4">
                {intelligence.finalScore != null && (
                  <ScoreRing score={intelligence.finalScore} />
                )}
                <div className="flex-1 space-y-1 pt-1">
                  {intelligence.roleAssigned && (
                    <div className="text-[11px] text-blue-700 font-semibold mb-2">
                      Role: <span className="text-slate-700">{intelligence.roleAssigned}</span>
                    </div>
                  )}
                  {hasComponentScores && (
                    <div className="space-y-1.5">
                      {intelligence.kidFitScore != null && <ScoreBar label="Kid fit" value={intelligence.kidFitScore} color="#f97316" />}
                      {intelligence.flowFitScore != null && <ScoreBar label="Flow fit" value={intelligence.flowFitScore} color="#6366f1" />}
                      {intelligence.practicalityScore != null && <ScoreBar label="Practicality" value={intelligence.practicalityScore} color="#10b981" />}
                      {intelligence.flexibilityScore != null && <ScoreBar label="Flexibility" value={intelligence.flexibilityScore} color="#8b5cf6" />}
                    </div>
                  )}
                </div>
              </div>

              {(intelligence.bestArrivalWindow || intelligence.worstArrivalWindow) && (
                <div className="flex gap-3">
                  {intelligence.bestArrivalWindow && intelligence.bestArrivalWindow !== "anytime" && (
                    <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full">
                      <Sunrise className="w-3 h-3 text-emerald-600" />
                      <span className="text-[10px] font-semibold text-emerald-700 capitalize">Best: {intelligence.bestArrivalWindow}</span>
                    </div>
                  )}
                  {intelligence.worstArrivalWindow && intelligence.worstArrivalWindow !== "anytime" && (
                    <div className="flex items-center gap-1.5 bg-red-50 border border-red-100 px-3 py-1.5 rounded-full">
                      <Sunset className="w-3 h-3 text-red-500" />
                      <span className="text-[10px] font-semibold text-red-600 capitalize">Avoid: {intelligence.worstArrivalWindow}</span>
                    </div>
                  )}
                </div>
              )}

              {hasQueueData && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold text-slate-500">Queue risk</p>
                  <QueueRiskBar label="Morning" value={intelligence.queueRiskMorning ?? 0} />
                  <QueueRiskBar label="Midday" value={intelligence.queueRiskMidday ?? 0} />
                  <QueueRiskBar label="Afternoon" value={intelligence.queueRiskAfternoon ?? 0} />
                </div>
              )}

              {(intelligence.discoveryLabel || intelligence.socialLabel) && (
                <div className="flex gap-2 flex-wrap">
                  {intelligence.discoveryLabel && (
                    <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-100 px-2.5 py-1 rounded-full font-medium">
                      ✨ {intelligence.discoveryLabel}
                    </span>
                  )}
                  {intelligence.socialLabel && (
                    <span className="text-[10px] bg-pink-50 text-pink-700 border border-pink-100 px-2.5 py-1 rounded-full font-medium">
                      👨‍👩‍👧 {intelligence.socialLabel}
                    </span>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function StopDetailsDrawer({ stop, intelligence, onClose, onReplace, onLiveSupport, youngestChildAge }: Props) {
  const profile = stop.placeProfileData as PlaceProfileJsonb | null;
  const reference = stop.placeReferenceData as PlaceReferenceJsonb | null;
  const support = stop.parentSupportData as ParentSupportJsonb | null;

  const baseDuration = stop.durationMinutes ?? 0;
  const displayDuration = (youngestChildAge != null && youngestChildAge < 8 && stop.type !== "rest")
    ? computeEffectiveDuration(baseDuration, youngestChildAge)
    : baseDuration;
  const durationAdjusted = displayDuration !== baseDuration;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[85vh] overflow-hidden flex flex-col"
        data-testid="drawer-stop-details"
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${stop.type === "rest" ? "bg-indigo-100" : "bg-orange-100"}`}>
              {stop.type === "rest" ? "💤" : "📍"}
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-base leading-tight">{stop.name}</h2>
              <p className="text-xs text-slate-500 mt-0.5 capitalize">{stop.type}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-500" data-testid="button-close-drawer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <div className="flex gap-3 flex-wrap">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${durationAdjusted ? "bg-orange-50 border border-orange-100" : "bg-slate-100"}`} data-testid="chip-duration">
              <Clock className={`w-3.5 h-3.5 ${durationAdjusted ? "text-orange-500" : "text-slate-500"}`} />
              <span className={`text-xs font-medium ${durationAdjusted ? "text-orange-700" : "text-slate-600"}`}>
                {youngestChildAge != null && youngestChildAge < 8
                  ? <>{formatDuration(displayDuration)}<span className="text-[10px] text-orange-400 ml-1">for your family</span></>
                  : intelligence?.timeNeededLabel ?? formatDuration(displayDuration)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full">
              <Zap className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs font-medium text-slate-600 capitalize">{stop.effortLevel} effort</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full">
              {stop.indoorOutdoor === "indoor" ? <Home className="w-3.5 h-3.5 text-slate-500" /> : <Sun className="w-3.5 h-3.5 text-slate-500" />}
              <span className="text-xs font-medium text-slate-600 capitalize">{stop.indoorOutdoor}</span>
            </div>
            {stop.minAge != null && stop.minAge > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-medium text-slate-600">Ages {stop.minAge}+</span>
              </div>
            )}
            {stop.sensoryLoad && (
              <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full">
                <Volume2 className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-medium text-slate-600 capitalize">{stop.sensoryLoad} sensory</span>
              </div>
            )}
            {stop.familyAnchorType && (
              <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full">
                <span className="text-xs font-medium text-slate-600 capitalize">{stop.familyAnchorType}</span>
              </div>
            )}
          </div>

          {profile && (profile.weatherSensitive || profile.strollerFriendly === false || profile.bestTimeOfDay !== "anytime") && (
            <div className="flex gap-2 flex-wrap">
              {profile.bestTimeOfDay && profile.bestTimeOfDay !== "anytime" && (
                <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs font-medium text-amber-700 capitalize">Best {profile.bestTimeOfDay}</span>
                </div>
              )}
              {profile.weatherSensitive && (
                <div className="flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
                  <CloudRain className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-xs font-medium text-blue-700">Weather dependent</span>
                </div>
              )}
              {profile.strollerFriendly === false && (
                <div className="flex items-center gap-1.5 bg-red-50 px-3 py-1.5 rounded-full border border-red-100">
                  <Baby className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-xs font-medium text-red-700">Not stroller-friendly</span>
                </div>
              )}
            </div>
          )}

          {intelligence && <IntelligencePanel intelligence={intelligence} />}

          {stop.whyNow && (
            <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
              <p className="text-xs font-semibold text-orange-700 mb-1">Why this stop, why now</p>
              <p className="text-sm text-slate-700 leading-relaxed">{stop.whyNow}</p>
            </div>
          )}

          {profile?.whyItWorks && (
            <Section icon={<BookOpen className="w-4 h-4" />} title="Why it works for your family">
              <p className="text-sm text-slate-600 leading-relaxed">{profile.whyItWorks}</p>
            </Section>
          )}

          {profile?.bathroomNotes && (
            <Section icon={<Droplets className="w-4 h-4" />} title="Bathrooms & facilities">
              <p className="text-sm text-slate-600">{profile.bathroomNotes}</p>
            </Section>
          )}

          {profile?.foodOptions && (
            <Section icon={<UtensilsCrossed className="w-4 h-4" />} title="Food options">
              <p className="text-sm text-slate-600">{profile.foodOptions}</p>
            </Section>
          )}

          {profile?.parkingNotes && (
            <Section icon={<ParkingCircle className="w-4 h-4" />} title="Parking & arrival">
              <p className="text-sm text-slate-600">{profile.parkingNotes}</p>
            </Section>
          )}

          {reference && (
            <Section icon={<MapPin className="w-4 h-4" />} title="Visit info">
              <div className="space-y-2">
                {reference.openingHours && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Hours</span>
                    <span className="text-slate-700 font-medium">{reference.openingHours}</span>
                  </div>
                )}
                {reference.priceRange && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Price</span>
                    <span className="text-slate-700 font-medium">{reference.priceRange === "free" ? "Free entry" : reference.priceRange}</span>
                  </div>
                )}
                {reference.bookingRequired && (
                  <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                    <span>⚠️</span> Booking recommended
                    {reference.bookingUrl && (
                      <a href={reference.bookingUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-orange-500 font-medium ml-auto">
                        Book <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}
                {reference.directionsNote && (
                  <p className="text-xs text-slate-500 leading-relaxed">{reference.directionsNote}</p>
                )}
              </div>
            </Section>
          )}

          {profile?.nearbyStops && profile.nearbyStops.length > 0 && (
            <Section icon={<MapPin className="w-4 h-4" />} title="Nearby">
              <div className="flex flex-wrap gap-2">
                {profile.nearbyStops.map((nb, i) => (
                  <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">{nb}</span>
                ))}
              </div>
            </Section>
          )}

          {profile?.practicalTips && profile.practicalTips.length > 0 && (
            <Section icon={<Lightbulb className="w-4 h-4" />} title="Practical tips">
              <ul className="space-y-2">
                {profile.practicalTips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="text-orange-400 mt-0.5 flex-shrink-0">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {support && (support.breakSuggestion || support.foodSuggestion || support.keepGoingSuggestion || support.moreFunSuggestion) ? (
            <Section icon={<Coffee className="w-4 h-4" />} title="Parent support">
              <div className="space-y-3" data-testid="section-parent-support">
                {support.breakSuggestion && (
                  <div className="flex items-start gap-2">
                    <span className="text-lg flex-shrink-0">☕</span>
                    <div>
                      <p className="text-xs font-medium text-slate-500">Need a break?</p>
                      <p className="text-sm text-slate-600">{support.breakSuggestion}</p>
                    </div>
                  </div>
                )}
                {support.foodSuggestion && (
                  <div className="flex items-start gap-2">
                    <span className="text-lg flex-shrink-0">🍕</span>
                    <div>
                      <p className="text-xs font-medium text-slate-500">Hungry?</p>
                      <p className="text-sm text-slate-600">{support.foodSuggestion}</p>
                    </div>
                  </div>
                )}
                {support.keepGoingSuggestion && (
                  <div className="flex items-start gap-2">
                    <span className="text-lg flex-shrink-0">⚡</span>
                    <div>
                      <p className="text-xs font-medium text-slate-500">Energy to spare?</p>
                      <p className="text-sm text-slate-600">{support.keepGoingSuggestion}</p>
                    </div>
                  </div>
                )}
                {support.moreFunSuggestion && (
                  <div className="flex items-start gap-2">
                    <span className="text-lg flex-shrink-0">🎉</span>
                    <div>
                      <p className="text-xs font-medium text-slate-500">Want more fun?</p>
                      <p className="text-sm text-slate-600">{support.moreFunSuggestion}</p>
                    </div>
                  </div>
                )}
                {support.shortenSuggestion && (
                  <div className="flex items-start gap-2">
                    <Scissors className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-slate-500">Short on time?</p>
                      <p className="text-sm text-slate-600">{support.shortenSuggestion}</p>
                    </div>
                  </div>
                )}
              </div>
            </Section>
          ) : null}
        </div>

        <div className="px-5 py-4 border-t border-slate-100 space-y-2">
          <button
            onClick={onLiveSupport}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-500 text-white font-semibold text-sm hover:bg-orange-600 transition"
            data-testid="button-drawer-live-support"
          >
            What do you need?
          </button>
          <div className="flex gap-3">
            <button
              onClick={onReplace}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-orange-200 text-orange-600 font-semibold text-sm hover:bg-orange-50 transition"
              data-testid="button-drawer-replace"
            >
              <RefreshCw className="w-4 h-4" /> Replace
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition"
              data-testid="button-drawer-done"
            >
              Done
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
        <span className="text-orange-400">{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}
