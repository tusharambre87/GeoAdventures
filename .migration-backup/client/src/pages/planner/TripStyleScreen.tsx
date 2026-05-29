import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, ChevronRight, Sparkles, UserPlus, X, Calendar, MapPin, ChevronDown, Settings2 } from "lucide-react";
import { usePlanner, type PlannerInput } from "@/lib/plannerContext";
import { useExplorer } from "@/lib/explorerContext";
import { getCoordsForName } from "@/lib/travelDestinations";

declare global { interface Window { L?: any; } }

const AVATAR_EMOJIS: Record<string, string> = {
  panda: "🐼", lion: "🦁", elephant: "🐘", penguin: "🐧", koala: "🐨",
  fox: "🦊", owl: "🦉", turtle: "🐢", butterfly: "🦋", dolphin: "🐬",
  rocket: "🚀", globe: "🌍",
};
function getAvatarEmoji(key?: string | null) { return key ? AVATAR_EMOJIS[key] || "🐼" : "🐼"; }

function ageRangeToYears(ageRange?: string | null): number | null {
  if (!ageRange || ageRange === "adult") return null;
  if (ageRange === "3-5") return 4;
  if (ageRange === "6-9") return 7;
  if (ageRange === "9+") return 11;
  return null;
}

type AdventureInterest = "explore_sights" | "food_local" | "kids_activities" | "culture_history" | "nature_outdoors";

const ADVENTURE_STYLES: { id: AdventureInterest; emoji: string; title: string; description: string }[] = [
  { id: "explore_sights",   emoji: "🌍", title: "Explore & sights",   description: "Top landmarks + iconic spots" },
  { id: "food_local",       emoji: "🍜", title: "Food & local spots",  description: "Markets, eats + local gems" },
  { id: "kids_activities",  emoji: "🎡", title: "Kids activities",     description: "Playgrounds, fun + interactive" },
  { id: "culture_history",  emoji: "🏛️", title: "Culture & history",  description: "Museums, temples + palaces" },
  { id: "nature_outdoors",  emoji: "🌿", title: "Nature & outdoors",   description: "Parks, beaches + wildlife" },
];

const INTEREST_MAP: Record<AdventureInterest, string> = {
  explore_sights:   "Explore & Sights",
  food_local:       "Food",
  kids_activities:  "Rides & Play",
  culture_history:  "History",
  nature_outdoors:  "Outdoors",
};

interface CustomTraveler { id: string; name: string; }

function MiniMap({ routeStops, leafletReady }: { routeStops: Array<{ name: string }>; leafletReady: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any>(null);
  const mountedRef = useRef(true);
  const [mapReady, setMapReady] = useState(0);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  useEffect(() => {
    if (!leafletReady || !containerRef.current || mapRef.current) return;
    const L = window.L!;
    const map = L.map(containerRef.current, { center: [20, 0], zoom: 2, zoomControl: false, attributionControl: false });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", { maxZoom: 18 }).addTo(map);
    mapRef.current = map;
    markersRef.current = L.layerGroup().addTo(map);
    setTimeout(() => { if (mountedRef.current && mapRef.current) { mapRef.current.invalidateSize(); setMapReady(1); } }, 100);
    return () => { mountedRef.current = false; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, [leafletReady]);

  useEffect(() => {
    if (!mapRef.current || !markersRef.current || mapReady === 0) return;
    const L = window.L!;
    markersRef.current.clearLayers();
    const coords: [number, number][] = [];
    routeStops.forEach((stop, idx) => {
      const c = getCoordsForName(stop.name);
      if (!c) return;
      coords.push([c.lat, c.lon]);
      const label = routeStops.length > 1 ? `${idx + 1}` : "📍";
      const icon = L.divIcon({
        html: `<div class="builder-city-pin"><div class="builder-city-pin-inner ${routeStops.length > 1 ? "numbered" : ""}">${label}</div><div class="builder-city-pin-label">${stop.name}</div></div>`,
        className: "", iconSize: [0, 0], iconAnchor: [0, 0],
      });
      L.marker([c.lat, c.lon], { icon }).addTo(markersRef.current);
    });
    if (coords.length > 0) {
      const center: [number, number] = [coords.reduce((s, c) => s + c[0], 0) / coords.length, coords.reduce((s, c) => s + c[1], 0) / coords.length];
      mapRef.current.flyTo(center, coords.length === 1 ? 5 : 3);
    }
  }, [routeStops, mapReady]);

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 mb-4" style={{ height: 140 }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

export default function TripStyleScreen() {
  const [, navigate] = useLocation();
  const { plannerInput, setPlannerInput, plannerRouteStops } = usePlanner();
  const { explorers } = useExplorer();

  const [leafletReady, setLeafletReady] = useState(false);
  const [selectedExplorerIds, setSelectedExplorerIds] = useState<string[]>([]);
  const [customTravelers, setCustomTravelers] = useState<CustomTraveler[]>([]);
  const [addTravelerName, setAddTravelerName] = useState("");
  const [showAddTraveler, setShowAddTraveler] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedStyles, setSelectedStyles] = useState<AdventureInterest[]>(["explore_sights", "kids_activities"]);
  const [tripStyle, setTripStyle] = useState<NonNullable<PlannerInput["tripStyle"]>>(plannerInput.tripStyle ?? "balanced");
  const [pace, setPace] = useState<PlannerInput["pace"]>(plannerInput.pace ?? "moderate");

  const [showFineTuneSheet, setShowFineTuneSheet] = useState(false);
  const [gettingAround, setGettingAround] = useState<"walking" | "car" | "transit" | null>(null);
  const [kidsEnergy, setKidsEnergy] = useState<"full" | "mixed" | "low" | null>(null);
  const [indoorOutdoor, setIndoorOutdoor] = useState<"outdoor" | "mix" | "indoor" | null>(null);
  const [kidInterests, setKidInterests] = useState<string[]>([]);

  useEffect(() => {
    if (window.L) { setLeafletReady(true); return; }
    const check = setInterval(() => { if (window.L) { setLeafletReady(true); clearInterval(check); } }, 200);
    return () => clearInterval(check);
  }, []);

  const parentExplorer = explorers.find((e) => e.ageRange === "adult");
  const kidExplorers = explorers.filter((e) => e.ageRange !== "adult");

  const toggleExplorer = (id: string) => {
    setSelectedExplorerIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const addCustomTraveler = () => {
    const name = addTravelerName.trim();
    if (!name) return;
    setCustomTravelers((prev) => [...prev, { id: `custom-${Date.now()}`, name }]);
    setAddTravelerName("");
    setShowAddTraveler(false);
  };

  const toggleStyle = (id: AdventureInterest) => {
    setSelectedStyles((prev) =>
      prev.includes(id)
        ? prev.filter((s) => s !== id).length === 0 ? prev : prev.filter((s) => s !== id)
        : [...prev, id]
    );
  };

  const computedTripDays = (() => {
    if (startDate && endDate) {
      const diff = Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000);
      return Math.max(1, diff + 1);
    }
    return plannerInput.tripDays || 3;
  })();

  const childrenAges = (() => {
    const ages: number[] = [];
    for (const id of selectedExplorerIds) {
      const exp = explorers.find((e) => e.id === id);
      if (!exp) continue;
      const age = ageRangeToYears(exp.ageRange);
      if (age !== null) ages.push(age);
    }
    return ages;
  })();

  const interests = selectedStyles.map((id) => INTEREST_MAP[id]).filter(Boolean);

  const canProceed = selectedExplorerIds.length > 0 || customTravelers.length > 0;

  const buildAndGo = () => {
    setPlannerInput({
      ...plannerInput,
      tripDays: computedTripDays,
      childrenAges,
      tripStyle,
      pace,
      interests,
      transportMode: gettingAround || undefined,
      kidEnergyLevel: kidsEnergy || undefined,
      indoorLean: indoorOutdoor || undefined,
    });
    navigate("/generating");
  };

  const TRIP_STYLE_OPTIONS: { value: NonNullable<PlannerInput["tripStyle"]>; emoji: string; label: string; sub: string }[] = [
    { value: "highlights", emoji: "🏛️", label: "Highlights & Must-Sees", sub: "The classics every family loves" },
    { value: "balanced",   emoji: "⚖️", label: "Balanced Family Day",    sub: "Mix of iconic and relaxed" },
    { value: "offbeat",    emoji: "🔭", label: "Off the Beaten Path",    sub: "Local gems & hidden spots" },
    { value: "easy",       emoji: "🌿", label: "Easy & Low-Key",         sub: "Gentle pace, no pressure" },
  ];

  const PACE_OPTIONS = [
    { value: "relaxed" as const, emoji: "🌿", label: "Relaxed", hint: "2 stops · lots of downtime" },
    { value: "moderate" as const, emoji: "☀️", label: "Moderate", hint: "3 stops · balanced" },
    { value: "busy" as const, emoji: "⚡", label: "Busy", hint: "4 stops · pack it in" },
  ];

  const KID_INTEREST_OPTIONS = [
    { id: "Animals", emoji: "🦁" }, { id: "Science", emoji: "🔬" }, { id: "Outdoors", emoji: "🌿" },
    { id: "Rides & Play", emoji: "🎢" }, { id: "Art & Culture", emoji: "🎨" }, { id: "Food", emoji: "🍕" },
  ];

  return (
    <div className="min-h-screen bg-[#FFFAF5] flex flex-col">
      <div className="max-w-lg mx-auto w-full px-4 pt-4 pb-32">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1 text-slate-600 text-sm font-medium hover:text-slate-800 transition-colors"
            data-testid="button-tripstyle-back"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>

        <div className="text-center mb-5">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-xl">✈️</span>
            <h1 className="text-2xl font-bold text-slate-800">Build Your Adventure</h1>
          </div>
          <p className="text-sm text-slate-500">Turn your family trip into an interactive journey</p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-6">
          {[{ num: 1, label: "Where & Route" }, { num: 2, label: "Who & When" }, { num: 3, label: "Fine-tune" }].map((s, i) => (
            <div key={s.num} className="flex items-center">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                s.num === 2 ? "bg-orange-500 text-white shadow-md" :
                s.num < 2 ? "bg-orange-100 text-orange-700 cursor-pointer hover:bg-orange-200" : "bg-slate-100 text-slate-400"
              }`}
              onClick={() => s.num < 2 && navigate("/")}
              >
                {s.num < 2 && <Check className="w-3 h-3" />}
                {s.label}
              </div>
              {i < 2 && <ChevronRight className="w-3 h-3 text-slate-300 mx-1" />}
            </div>
          ))}
        </div>

        <motion.div key="step2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}>
          <h2 className="text-xl font-extrabold text-slate-800 mb-1">We'll customise your plan</h2>
          <p className="text-sm text-slate-400 mb-4">Your answers shape the plan instantly</p>

          {leafletReady && plannerRouteStops.length > 0 && (
            <MiniMap routeStops={plannerRouteStops} leafletReady={leafletReady} />
          )}
          {!leafletReady && plannerRouteStops.length > 0 && (
            <div className="rounded-2xl bg-slate-100 border border-slate-200 mb-4 flex items-center justify-center" style={{ height: 140 }}>
              <div className="text-center">
                <MapPin className="w-6 h-6 text-orange-400 mx-auto mb-1" />
                <p className="text-xs text-slate-500">{plannerRouteStops.map((s) => s.name).join(" → ")}</p>
              </div>
            </div>
          )}

          <div className="mb-5">
            <h3 className="text-sm font-bold text-slate-700 mb-0.5">Who's coming along?</h3>
            <p className="text-xs text-slate-400 mb-3">We'll adjust activities for their age</p>
            <div className="grid grid-cols-3 gap-2 mb-2" data-testid="explorer-grid">
              {parentExplorer && (
                <button
                  onClick={() => toggleExplorer(parentExplorer.id)}
                  className={`relative p-3 rounded-xl border-2 transition-all text-center ${selectedExplorerIds.includes(parentExplorer.id) ? "border-orange-400 bg-orange-50 shadow-md" : "border-slate-200 bg-white hover:border-orange-200"}`}
                  data-testid={`explorer-card-${parentExplorer.id}`}
                >
                  {selectedExplorerIds.includes(parentExplorer.id) && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center"><Check className="w-2.5 h-2.5 text-white" /></div>
                  )}
                  <span className="text-2xl block mb-0.5">{getAvatarEmoji(parentExplorer.avatarKey)}</span>
                  <p className="font-medium text-slate-800 text-xs truncate">{parentExplorer.name}</p>
                  <span className="text-[9px] text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-full mt-0.5 inline-block">Parent</span>
                </button>
              )}
              {kidExplorers.map((explorer) => (
                <button
                  key={explorer.id}
                  onClick={() => toggleExplorer(explorer.id)}
                  className={`relative p-3 rounded-xl border-2 transition-all text-center ${selectedExplorerIds.includes(explorer.id) ? "border-orange-400 bg-orange-50 shadow-md" : "border-slate-200 bg-white hover:border-orange-200"}`}
                  data-testid={`explorer-card-${explorer.id}`}
                >
                  {selectedExplorerIds.includes(explorer.id) && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center"><Check className="w-2.5 h-2.5 text-white" /></div>
                  )}
                  <span className="text-2xl block mb-0.5">{getAvatarEmoji(explorer.avatarKey)}</span>
                  <p className="font-medium text-slate-800 text-xs truncate">{explorer.name}</p>
                </button>
              ))}
              {customTravelers.map((t) => (
                <div key={t.id} className="relative p-3 rounded-xl border-2 border-blue-300 bg-blue-50 text-center">
                  <button onClick={() => setCustomTravelers((prev) => prev.filter((x) => x.id !== t.id))} className="absolute top-1 right-1 text-slate-300 hover:text-red-400 transition-colors"><X className="w-3 h-3" /></button>
                  <span className="text-2xl block mb-0.5">👤</span>
                  <p className="font-medium text-slate-800 text-xs truncate">{t.name}</p>
                </div>
              ))}
            </div>

            {showAddTraveler ? (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="text"
                  placeholder="Traveler name"
                  value={addTravelerName}
                  onChange={(e) => setAddTravelerName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCustomTraveler()}
                  className="flex-1 h-10 px-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
                  autoFocus
                  data-testid="input-add-traveler"
                />
                <button onClick={addCustomTraveler} className="bg-blue-500 text-white text-sm font-semibold px-4 h-10 rounded-xl hover:bg-blue-600 transition-colors" data-testid="button-add-traveler-confirm">Add</button>
                <button onClick={() => { setShowAddTraveler(false); setAddTravelerName(""); }} className="text-sm text-slate-500 hover:text-slate-700 px-2 h-10">Cancel</button>
              </div>
            ) : (
              <button
                onClick={() => setShowAddTraveler(true)}
                className="w-full h-11 border-dashed border-2 border-slate-200 text-slate-500 hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50 rounded-xl gap-2 flex items-center justify-center text-sm font-medium transition-all mt-1"
                data-testid="button-add-traveler"
              >
                <UserPlus className="w-4 h-4" /> Add Traveler
              </button>
            )}
            {!canProceed && (
              <p className="text-xs text-red-500 mt-2">Please select at least one explorer</p>
            )}
          </div>

          {(selectedExplorerIds.length > 0 || customTravelers.length > 0) && (
            <AnimatePresence>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>

                {/* When are you traveling? */}
                <div className="border-t border-slate-100 pt-5 mb-5">
                  <h3 className="text-sm font-bold text-slate-700 mb-0.5 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-orange-500" /> When are you traveling?
                  </h3>
                  <p className="text-xs text-slate-400 mb-3">Select dates — we'll plan the right number of stops</p>
                  <div className="flex gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-slate-400 font-medium mb-1">From</p>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full h-11 px-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
                        data-testid="input-start-date"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-slate-400 font-medium mb-1">To</p>
                      <input
                        type="date"
                        value={endDate}
                        min={startDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full h-11 px-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
                        data-testid="input-end-date"
                      />
                    </div>
                  </div>
                  {startDate && endDate && (
                    <p className="text-[11px] text-orange-600 font-semibold mt-1.5">
                      {computedTripDays} day{computedTripDays !== 1 ? "s" : ""} · AI will plan each day
                    </p>
                  )}
                  {(!startDate || !endDate) && (
                    <p className="text-[11px] text-slate-400 mt-1.5">Using {plannerInput.tripDays || 3} days from Step 1 (dates optional)</p>
                  )}
                </div>

                {/* Trip style */}
                <div className="border-t border-slate-100 pt-5 mb-5">
                  <p className="text-xs font-semibold text-orange-500 uppercase tracking-wide mb-1">Trip style</p>
                  <p className="text-sm font-bold text-slate-800 mb-3">What kind of adventure fits your family?</p>
                  <div className="grid grid-cols-2 gap-3">
                    {TRIP_STYLE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setTripStyle(opt.value)}
                        className={`p-4 rounded-2xl border-2 text-left transition-all ${tripStyle === opt.value ? "border-orange-400 bg-orange-50 shadow-sm" : "border-slate-200 bg-white hover:border-orange-200"}`}
                        data-testid={`button-tripstyle-${opt.value}`}
                      >
                        <div className="text-3xl mb-2">{opt.emoji}</div>
                        <div className={`text-sm font-bold leading-tight ${tripStyle === opt.value ? "text-orange-700" : "text-slate-800"}`}>{opt.label}</div>
                        <div className="text-[11px] text-slate-400 mt-1 leading-snug">{opt.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Day pace */}
                <div className="border-t border-slate-100 pt-5 mb-5">
                  <p className="text-xs font-semibold text-orange-500 uppercase tracking-wide mb-1">Day pace</p>
                  <p className="text-sm font-bold text-slate-800 mb-3">How much do you want to fit in each day?</p>
                  <div className="grid grid-cols-3 gap-2">
                    {PACE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setPace(opt.value)}
                        className={`py-2.5 px-2 rounded-xl text-center transition-all border-2 flex flex-col items-center gap-0.5 ${
                          pace === opt.value
                            ? "bg-orange-50 border-orange-500 shadow-sm"
                            : "bg-white text-slate-600 border-slate-200 hover:border-orange-300"
                        }`}
                        data-testid={`button-pace-${opt.value}`}
                      >
                        <span className="text-lg">{opt.emoji}</span>
                        <span className={`text-[11px] font-bold leading-tight ${pace === opt.value ? "text-orange-700" : "text-slate-700"}`}>{opt.label}</span>
                        <span className={`text-[9px] leading-tight ${pace === opt.value ? "text-orange-500" : "text-slate-400"}`}>{opt.hint}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fine-tune button */}
                <button
                  type="button"
                  onClick={() => setShowFineTuneSheet(true)}
                  className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border-2 border-dashed border-orange-200 text-orange-600 font-medium text-sm hover:bg-orange-50 transition-colors mb-4"
                  data-testid="button-finetune"
                >
                  <Settings2 className="w-4 h-4" />
                  <span>Fine-tune your plan</span>
                  <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full ml-1">Optional</span>
                </button>

                <p className="text-[11px] text-slate-400 text-center mb-2">Your plan will be ready instantly</p>
                <button
                  onClick={buildAndGo}
                  disabled={!canProceed}
                  className={`w-full font-bold h-14 rounded-2xl text-base shadow-md mb-2 flex items-center justify-center gap-2 transition-all ${canProceed ? "bg-orange-500 hover:bg-orange-600 text-white active:scale-[0.98]" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
                  data-testid="button-next-step2"
                >
                  Build My Plan <ChevronRight className="w-5 h-5" />
                </button>
                <p className="text-xs text-slate-400 text-center mb-4">We'll build a day-by-day plan for your family</p>
              </motion.div>
            </AnimatePresence>
          )}
        </motion.div>
      </div>

      {/* Fine-tune bottom sheet */}
      <AnimatePresence>
        {showFineTuneSheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setShowFineTuneSheet(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[#FFFAF5] rounded-t-3xl max-h-[92vh] overflow-y-auto"
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1.5 bg-slate-200 rounded-full" />
              </div>
              <div className="px-5 pt-2 pb-8">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-lg font-bold text-slate-800">Help us tailor this</h2>
                  <button onClick={() => setShowFineTuneSheet(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
                <p className="text-xs text-slate-400 mb-4">Step 3 of 3 — completely optional</p>

                <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-6 flex gap-3">
                  <span className="text-lg shrink-0">✨</span>
                  <div>
                    <p className="text-sm font-semibold text-amber-700">All fields below are optional</p>
                    <p className="text-xs text-amber-600 mt-0.5">The more you share, the smarter your stops. Every answer helps us pick the right place at the right moment for your kids.</p>
                  </div>
                </div>

                {/* What do you want more of */}
                <div className="mb-6">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">What do you want more of?</p>
                  <p className="text-xs text-slate-400 mb-3">Pick a few — we'll mix it into your plan</p>
                  <div className="grid grid-cols-2 gap-2">
                    {ADVENTURE_STYLES.map((style) => {
                      const isSelected = selectedStyles.includes(style.id);
                      return (
                        <button
                          key={style.id}
                          onClick={() => toggleStyle(style.id)}
                          className={`relative p-3 rounded-2xl text-left transition-all border-2 ${isSelected ? "border-orange-500 bg-orange-50 shadow-sm" : "border-slate-200 hover:border-orange-300 bg-white"}`}
                          data-testid={`button-style-${style.id}`}
                        >
                          {isSelected && (
                            <span className="absolute top-2 right-2 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center"><Check className="w-2.5 h-2.5 text-white" /></span>
                          )}
                          <span className="text-lg block mb-1">{style.emoji}</span>
                          <p className={`font-bold text-xs leading-tight ${isSelected ? "text-orange-700" : "text-slate-800"}`}>{style.title}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{style.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Getting Around */}
                <div className="mb-6">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Getting Around</p>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { id: "walking" as const, emoji: "🚶", label: "Mostly walking" },
                      { id: "car" as const, emoji: "🚗", label: "Driving / car" },
                      { id: "transit" as const, emoji: "🚌", label: "Public transit" },
                    ]).map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setGettingAround(gettingAround === opt.id ? null : opt.id)}
                        className={`py-3 px-2 rounded-xl text-center border-2 flex flex-col items-center gap-1 transition-all ${
                          gettingAround === opt.id
                            ? "bg-orange-50 border-orange-500"
                            : "bg-white border-slate-200 hover:border-orange-300"
                        }`}
                        data-testid={`tailor-transport-${opt.id}`}
                      >
                        <span className="text-xl">{opt.emoji}</span>
                        <span className={`text-[11px] font-semibold leading-tight ${gettingAround === opt.id ? "text-orange-700" : "text-slate-600"}`}>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Kids' Energy Today */}
                <div className="mb-6">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Kids' Energy Today</p>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { id: "full" as const, emoji: "⚡", label: "Fully charged", hint: "Ready for anything" },
                      { id: "mixed" as const, emoji: "😊", label: "About right", hint: "Normal day" },
                      { id: "low" as const, emoji: "😴", label: "Running low", hint: "Easy does it" },
                    ]).map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setKidsEnergy(kidsEnergy === opt.id ? null : opt.id)}
                        className={`py-3 px-2 rounded-xl text-center border-2 flex flex-col items-center gap-0.5 transition-all ${
                          kidsEnergy === opt.id
                            ? "bg-orange-50 border-orange-500"
                            : "bg-white border-slate-200 hover:border-orange-300"
                        }`}
                        data-testid={`tailor-energy-${opt.id}`}
                      >
                        <span className="text-xl">{opt.emoji}</span>
                        <span className={`text-[11px] font-bold leading-tight ${kidsEnergy === opt.id ? "text-orange-700" : "text-slate-600"}`}>{opt.label}</span>
                        <span className={`text-[9px] leading-tight ${kidsEnergy === opt.id ? "text-orange-500" : "text-slate-400"}`}>{opt.hint}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Indoor or Outdoor Today? */}
                <div className="mb-6">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Indoor or Outdoor Today?</p>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { id: "outdoor" as const, emoji: "☀️", label: "Outdoors!" },
                      { id: "mix" as const, emoji: "🌤️", label: "Mix it up" },
                      { id: "indoor" as const, emoji: "🏠", label: "Prefer indoors" },
                    ]).map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setIndoorOutdoor(indoorOutdoor === opt.id ? null : opt.id)}
                        className={`py-3 px-2 rounded-xl text-center border-2 flex flex-col items-center gap-1 transition-all ${
                          indoorOutdoor === opt.id
                            ? "bg-orange-50 border-orange-500"
                            : "bg-white border-slate-200 hover:border-orange-300"
                        }`}
                        data-testid={`tailor-indoor-${opt.id}`}
                      >
                        <span className="text-xl">{opt.emoji}</span>
                        <span className={`text-[11px] font-semibold leading-tight ${indoorOutdoor === opt.id ? "text-orange-700" : "text-slate-600"}`}>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* What Do Your Kids Love? */}
                <div className="mb-8">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">What Do Your Kids Love?</p>
                  <div className="flex flex-wrap gap-2">
                    {KID_INTEREST_OPTIONS.map((opt) => {
                      const sel = kidInterests.includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          onClick={() => setKidInterests(prev => sel ? prev.filter(i => i !== opt.id) : [...prev, opt.id])}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-sm font-semibold transition-all ${
                            sel
                              ? "bg-orange-50 border-orange-500 text-orange-700"
                              : "bg-white border-slate-200 text-slate-600 hover:border-orange-300"
                          }`}
                          data-testid={`tailor-interest-${opt.id}`}
                        >
                          <span>{opt.emoji}</span>
                          <span>{opt.id}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sheet actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowFineTuneSheet(false); buildAndGo(); }}
                    className="flex-1 h-12 rounded-2xl border-2 border-orange-400 text-orange-600 font-bold text-sm flex items-center justify-center gap-2 hover:bg-orange-50 transition-colors"
                    data-testid="button-skip-build"
                  >
                    <span>▶</span> Skip & Build
                  </button>
                  <button
                    onClick={() => { setShowFineTuneSheet(false); buildAndGo(); }}
                    className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.97] transition-all"
                    data-testid="button-build-plan"
                  >
                    Build My Plan <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
