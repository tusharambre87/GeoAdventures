import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, X, Check } from "lucide-react";

export interface TripSettings {
  adventureStyles: string[];
  gettingAround: "walking" | "car" | "transit" | null;
  kidsEnergy: "charged" | "normal" | "low" | null;
  indoorOutdoor: "outdoor" | "mix" | "indoor" | null;
  interests: string[];
  foodPlanEnabled: boolean;
  meals: "lunch-stop" | "snacks-only" | "flexible";
  mealTypes: string[];
  diningStyle: "quick" | "sitdown" | "mix" | null;
  cuisines: string[];
  pace: "relaxed" | "balanced" | "packed";
}

export type ChangeImpact = "small" | "medium" | "big";

const DEFAULT_SETTINGS: TripSettings = {
  adventureStyles: [],
  gettingAround: null,
  kidsEnergy: null,
  indoorOutdoor: null,
  interests: [],
  foodPlanEnabled: false,
  meals: "flexible",
  mealTypes: ["lunch"],
  diningStyle: null,
  cuisines: [],
  pace: "balanced",
};

const ADVENTURE_STYLES = [
  { id: "explore_sights",  emoji: "🌍", title: "Explore & sights",   description: "Top landmarks + iconic spots" },
  { id: "food_local",      emoji: "🍜", title: "Food & local spots", description: "Markets, eats + local gems" },
  { id: "kids_activities", emoji: "🎡", title: "Kids activities",    description: "Playgrounds, fun + interactive" },
  { id: "culture_history", emoji: "🏛️", title: "Culture & history",  description: "Museums, temples + palaces" },
  { id: "nature_outdoors", emoji: "🌿", title: "Nature & outdoors",  description: "Parks, beaches + wildlife" },
];

const KID_INTERESTS = [
  { id: "animals",    emoji: "🦁", label: "Animals" },
  { id: "science",    emoji: "🔬", label: "Science" },
  { id: "outdoors",   emoji: "🌿", label: "Outdoors" },
  { id: "rides_play", emoji: "🎢", label: "Rides & Play" },
  { id: "art_culture",emoji: "🎨", label: "Art & Culture" },
  { id: "food",       emoji: "🍕", label: "Food" },
  { id: "history",    emoji: "🏛️", label: "History" },
  { id: "water",      emoji: "💧", label: "Water" },
];

function loadSettings(tripId: string): TripSettings {
  try {
    const raw = localStorage.getItem(`trip-settings-v2:${tripId}`);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(tripId: string, s: TripSettings) {
  try {
    localStorage.setItem(`trip-settings-v2:${tripId}`, JSON.stringify(s));
  } catch {}
}

export type { };

interface Props {
  tripId: string;
  tripName: string;
  onClose: () => void;
  onSave: (settings: TripSettings, impact: ChangeImpact) => void;
  onMakeLighter: () => void;
  todayStops?: any[];
  onOptimizeNow?: (...args: any[]) => void;
  onApplyProposal?: (...args: any[]) => void;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{children}</p>
  );
}

export function TripSettingsModal({ tripId, tripName, onClose, onSave, onMakeLighter }: Props) {
  const [settings, setSettings] = useState<TripSettings>(() => loadSettings(tripId));
  const [originalSettings] = useState<TripSettings>(() => loadSettings(tripId));
  const [isSaving, setIsSaving] = useState(false);
  const [appliedChanges, setAppliedChanges] = useState<string[] | null>(null);

  const isDirty = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  function toggleStyle(id: string) {
    setSettings(s => ({
      ...s,
      adventureStyles: s.adventureStyles.includes(id)
        ? s.adventureStyles.filter(x => x !== id)
        : [...s.adventureStyles, id],
    }));
  }

  function toggleInterest(id: string) {
    setSettings(s => ({
      ...s,
      interests: s.interests.includes(id)
        ? s.interests.filter(i => i !== id)
        : [...s.interests, id],
    }));
  }

  function toggleMealType(id: string) {
    setSettings(s => ({
      ...s,
      mealTypes: s.mealTypes.includes(id)
        ? s.mealTypes.filter(x => x !== id)
        : [...s.mealTypes, id],
    }));
  }

  function toggleCuisine(id: string) {
    setSettings(s => ({
      ...s,
      cuisines: s.cuisines.includes(id)
        ? s.cuisines.filter(x => x !== id)
        : [...s.cuisines, id],
    }));
  }

  function set<K extends keyof TripSettings>(key: K, val: TripSettings[K]) {
    setSettings(s => ({ ...s, [key]: val }));
  }

  async function handleSave() {
    if (!isDirty) { onClose(); return; }
    setIsSaving(true);
    try {
      saveSettings(tripId, settings);

      const paceChanged = settings.pace !== originalSettings.pace;
      const mealsChanged = settings.meals !== originalSettings.meals;

      if (paceChanged || mealsChanged) {
        const res = await fetch(`/api/travel/trips/${tripId}/apply-preferences`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pace: paceChanged ? settings.pace : undefined,
            meals: mealsChanged ? settings.meals : undefined,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setAppliedChanges(data.applied?.length > 0 ? data.applied : ["✅ Preferences saved"]);
        } else {
          toast.error("Couldn't apply changes — please try again");
        }
      } else {
        onSave(settings, "small");
        toast.success("Preferences saved");
        onClose();
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsSaving(false);
    }
  }

  if (appliedChanges !== null) {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col bg-white" data-testid="trip-settings-modal">
        <div className="flex items-center justify-between px-5 pt-12 pb-4 border-b border-slate-100">
          <div className="w-9" />
          <h2 className="text-[17px] font-bold text-slate-900 text-center flex-1">Plan Updated</h2>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-black/5">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-5">
            <span className="text-3xl">✅</span>
          </div>
          <p className="text-[20px] font-bold text-slate-900 mb-2 text-center">Your preferences are saved</p>
          <p className="text-[14px] text-slate-500 mb-8 text-center leading-relaxed">Here's what changed:</p>
          <div className="w-full space-y-3 mb-8">
            {appliedChanges.map((item, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-slate-50">
                <span className="text-[15px] shrink-0 mt-0.5">{item.slice(0, 2)}</span>
                <span className="text-[13px] text-slate-700 leading-snug flex-1">{item.slice(2).trim() || item}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => { onSave(settings, "big"); onClose(); }}
            className="w-full h-[52px] rounded-2xl text-[15px] font-bold text-white transition-all active:scale-[0.98]"
            style={{ background: "#E8742B" }}
            data-testid="button-settings-done"
          >
            See updated plan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-white"
      data-testid="trip-settings-modal"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4 border-b border-slate-100">
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
          data-testid="button-trip-settings-back"
        >
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </button>
        <div className="text-center flex-1 px-2">
          <h2 className="text-[17px] font-bold text-slate-900">Edit Preferences</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">{tripName}</p>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
          data-testid="button-trip-settings-close"
        >
          <X className="w-5 h-5 text-slate-500" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 pb-8 pt-5 space-y-6">

        {/* 1. What do you want more of? */}
        <div>
          <SectionLabel>What do you want more of?</SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            {ADVENTURE_STYLES.map(style => {
              const sel = settings.adventureStyles.includes(style.id);
              return (
                <button
                  key={style.id}
                  onClick={() => toggleStyle(style.id)}
                  className={`relative p-3 rounded-2xl text-left transition-all border-2 ${
                    sel
                      ? "border-orange-500 bg-orange-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-orange-300"
                  }`}
                  data-testid={`pref-style-${style.id}`}
                >
                  {sel && (
                    <span className="absolute top-2 right-2 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </span>
                  )}
                  <span className="text-lg block mb-1">{style.emoji}</span>
                  <p className={`font-bold text-xs leading-tight ${sel ? "text-orange-700" : "text-slate-800"}`}>{style.title}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{style.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Getting Around */}
        <div>
          <SectionLabel>Getting Around</SectionLabel>
          <div className="grid grid-cols-3 gap-2">
            {([
              { id: "walking", emoji: "🚶", label: "Mostly walking" },
              { id: "car",     emoji: "🚗", label: "Driving / car" },
              { id: "transit", emoji: "🚌", label: "Public transit" },
            ] as const).map(opt => (
              <button
                key={opt.id}
                onClick={() => set("gettingAround", settings.gettingAround === opt.id ? null : opt.id)}
                className={`py-3 px-2 rounded-xl text-center border-2 flex flex-col items-center gap-1 transition-all ${
                  settings.gettingAround === opt.id
                    ? "bg-orange-50 border-orange-500"
                    : "bg-white border-slate-200 hover:border-orange-300"
                }`}
                data-testid={`pref-transport-${opt.id}`}
              >
                <span className="text-xl">{opt.emoji}</span>
                <span className={`text-[11px] font-semibold leading-tight ${settings.gettingAround === opt.id ? "text-orange-700" : "text-slate-600"}`}>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 3. Kids' Energy Today */}
        <div>
          <SectionLabel>Kids' Energy Today</SectionLabel>
          <div className="grid grid-cols-3 gap-2">
            {([
              { id: "charged", emoji: "⚡", label: "Fully charged", hint: "Ready for anything" },
              { id: "normal",  emoji: "😊", label: "About right",   hint: "Normal day" },
              { id: "low",     emoji: "😴", label: "Running low",   hint: "Easy does it" },
            ] as const).map(opt => (
              <button
                key={opt.id}
                onClick={() => set("kidsEnergy", settings.kidsEnergy === opt.id ? null : opt.id)}
                className={`py-3 px-2 rounded-xl text-center border-2 flex flex-col items-center gap-0.5 transition-all ${
                  settings.kidsEnergy === opt.id
                    ? "bg-orange-50 border-orange-500"
                    : "bg-white border-slate-200 hover:border-orange-300"
                }`}
                data-testid={`pref-energy-${opt.id}`}
              >
                <span className="text-xl">{opt.emoji}</span>
                <span className={`text-[11px] font-bold leading-tight ${settings.kidsEnergy === opt.id ? "text-orange-700" : "text-slate-600"}`}>{opt.label}</span>
                <span className={`text-[9px] leading-tight ${settings.kidsEnergy === opt.id ? "text-orange-500" : "text-slate-400"}`}>{opt.hint}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 4. Indoor or Outdoor? */}
        <div>
          <SectionLabel>Indoor or Outdoor?</SectionLabel>
          <div className="grid grid-cols-3 gap-2">
            {([
              { id: "outdoor", emoji: "☀️",  label: "Outdoors!" },
              { id: "mix",     emoji: "🌤️", label: "Mix it up" },
              { id: "indoor",  emoji: "🏠",  label: "Prefer indoors" },
            ] as const).map(opt => (
              <button
                key={opt.id}
                onClick={() => set("indoorOutdoor", settings.indoorOutdoor === opt.id ? null : opt.id)}
                className={`py-3 px-2 rounded-xl text-center border-2 flex flex-col items-center gap-1 transition-all ${
                  settings.indoorOutdoor === opt.id
                    ? "bg-orange-50 border-orange-500"
                    : "bg-white border-slate-200 hover:border-orange-300"
                }`}
                data-testid={`pref-indoor-${opt.id}`}
              >
                <span className="text-xl">{opt.emoji}</span>
                <span className={`text-[11px] font-semibold leading-tight ${settings.indoorOutdoor === opt.id ? "text-orange-700" : "text-slate-600"}`}>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 5. What Do Your Kids Love? */}
        <div>
          <SectionLabel>What Do Your Kids Love?</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {KID_INTERESTS.map(opt => {
              const sel = settings.interests.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  onClick={() => toggleInterest(opt.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-sm font-semibold transition-all ${
                    sel
                      ? "bg-orange-50 border-orange-500 text-orange-700"
                      : "bg-white border-slate-200 text-slate-600 hover:border-orange-300"
                  }`}
                  data-testid={`pref-interest-${opt.id}`}
                >
                  <span>{opt.emoji}</span>
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 6. Meal Planning */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <SectionLabel>Meal Planning</SectionLabel>
            <button
              onClick={() => set("foodPlanEnabled", !settings.foodPlanEnabled)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${settings.foodPlanEnabled ? "bg-orange-500" : "bg-slate-200"}`}
              data-testid="pref-meal-toggle"
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${settings.foodPlanEnabled ? "translate-x-4" : "translate-x-0.5"}`} />
            </button>
          </div>
          {!settings.foodPlanEnabled && (
            <p className="text-[11px] text-slate-400">Turn on to add dedicated meal stops to your plan</p>
          )}
          {settings.foodPlanEnabled && (
            <div className="space-y-4">
              {/* Meal types multi-select */}
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">Which meals?</p>
                <div className="flex gap-2 flex-wrap">
                  {([
                    { id: "breakfast", label: "🍳 Breakfast" },
                    { id: "lunch",     label: "🍔 Lunch" },
                    { id: "snacks",    label: "🍎 Snacks" },
                    { id: "dinner",    label: "🍽 Dinner" },
                  ]).map(opt => {
                    const sel = (settings.mealTypes || []).includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        onClick={() => toggleMealType(opt.id)}
                        className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-all active:scale-[0.96] border-2 ${
                          sel
                            ? "bg-orange-50 border-orange-500 text-orange-700"
                            : "bg-white border-slate-200 text-slate-600 hover:border-orange-300"
                        }`}
                        data-testid={`pref-meal-type-${opt.id}`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dining style */}
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">Dining style</p>
                <div className="flex gap-2 flex-wrap">
                  {([
                    { id: "quick",   label: "⚡ Quick service" },
                    { id: "sitdown", label: "🪑 Sit-down" },
                    { id: "mix",     label: "🔀 Mix it up" },
                  ] as const).map(opt => {
                    const sel = settings.diningStyle === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => set("diningStyle", sel ? null : opt.id)}
                        className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-all active:scale-[0.96] border-2 ${
                          sel
                            ? "bg-orange-50 border-orange-500 text-orange-700"
                            : "bg-white border-slate-200 text-slate-600 hover:border-orange-300"
                        }`}
                        data-testid={`pref-dining-style-${opt.id}`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cuisine multi-select */}
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">Cuisine preference</p>
                <div className="flex gap-2 flex-wrap">
                  {([
                    { id: "local",        label: "🌍 Local cuisine" },
                    { id: "italian",      label: "🍕 Italian" },
                    { id: "asian",        label: "🍜 Asian" },
                    { id: "american",     label: "🍔 American" },
                    { id: "mexican",      label: "🌮 Mexican" },
                    { id: "mediterranean",label: "🫒 Mediterranean" },
                  ]).map(opt => {
                    const sel = (settings.cuisines || []).includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        onClick={() => toggleCuisine(opt.id)}
                        className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-all active:scale-[0.96] border-2 ${
                          sel
                            ? "bg-orange-50 border-orange-500 text-orange-700"
                            : "bg-white border-slate-200 text-slate-600 hover:border-orange-300"
                        }`}
                        data-testid={`pref-cuisine-${opt.id}`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Bottom CTA */}
      <div className="shrink-0 px-5 pb-8 pt-4 border-t border-slate-100 bg-white">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full h-[56px] rounded-2xl text-[16px] font-bold text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          style={{
            background: isDirty && !isSaving ? "#E8742B" : "#CBD5E1",
            cursor: isDirty && !isSaving ? "pointer" : "default",
          }}
          data-testid="button-save-trip-settings"
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              <span>Updating plan…</span>
            </>
          ) : (
            <span>Update my plan →</span>
          )}
        </button>
        <button
          onClick={() => { onClose(); onMakeLighter(); }}
          className="w-full text-center mt-3 text-[13px] font-medium text-slate-400 hover:text-orange-500 transition-colors"
          data-testid="button-make-lighter-settings"
        >
          Make this trip lighter
        </button>
      </div>
    </div>
  );
}
