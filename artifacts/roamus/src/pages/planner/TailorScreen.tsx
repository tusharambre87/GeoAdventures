import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ChevronRight, SkipForward, Hotel, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { usePlanner, type PlannerInput, type PlannerStayLocation } from "@/lib/plannerContext";
import { toast } from "sonner";

const INTEREST_OPTIONS = [
  { id: "animals",  emoji: "🦁", label: "Animals" },
  { id: "science",  emoji: "🔬", label: "Science" },
  { id: "outdoors", emoji: "🌳", label: "Outdoors" },
  { id: "rides",    emoji: "🎡", label: "Rides & Play" },
  { id: "culture",  emoji: "🎨", label: "Art & Culture" },
  { id: "food",     emoji: "🍕", label: "Food" },
  { id: "history",  emoji: "🏛️", label: "History" },
  { id: "water",    emoji: "🌊", label: "Water" },
];

const TRANSPORT_OPTIONS: { value: NonNullable<PlannerInput["transportMode"]>; emoji: string; label: string }[] = [
  { value: "walking", emoji: "🚶", label: "Mostly walking" },
  { value: "driving", emoji: "🚗", label: "Driving / car" },
  { value: "transit", emoji: "🚌", label: "Public transit" },
];

const ENERGY_OPTIONS: { value: NonNullable<PlannerInput["kidEnergyLevel"]>; emoji: string; label: string; sub: string }[] = [
  { value: "full",  emoji: "🔋", label: "Fully charged",    sub: "Ready for anything" },
  { value: "mixed", emoji: "⚡", label: "About right",      sub: "Normal day" },
  { value: "low",   emoji: "😴", label: "Running low",      sub: "Easy does it" },
];

const INDOOR_OPTIONS: { value: NonNullable<PlannerInput["indoorLean"]>; emoji: string; label: string }[] = [
  { value: "outdoor", emoji: "☀️", label: "Outdoors!" },
  { value: "mix",     emoji: "🌤️", label: "Mix it up" },
  { value: "indoor",  emoji: "🏠", label: "Prefer indoors" },
];

const BUDGET_OPTIONS: { value: NonNullable<PlannerInput["budgetSensitivity"]>; emoji: string; label: string; sub: string }[] = [
  { value: "budget",   emoji: "💚", label: "Free & cheap",  sub: "Low-cost stops" },
  { value: "moderate", emoji: "💛", label: "Mid-range",     sub: "Mix of paid & free" },
  { value: "premium",  emoji: "✨", label: "Best of best",  sub: "Top experiences" },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{children}</p>;
}

export default function TailorScreen() {
  const [, navigate] = useLocation();
  const { plannerInput, setPlannerInput } = usePlanner();

  const [transport, setTransport] = useState<NonNullable<PlannerInput["transportMode"]>>(
    plannerInput.transportMode ?? "walking"
  );
  const [energy, setEnergy] = useState<NonNullable<PlannerInput["kidEnergyLevel"]>>(
    plannerInput.kidEnergyLevel ?? "mixed"
  );
  const [indoorLean, setIndoorLean] = useState<NonNullable<PlannerInput["indoorLean"]>>(
    plannerInput.indoorLean ?? "mix"
  );
  const [budget, setBudget] = useState<NonNullable<PlannerInput["budgetSensitivity"]>>(
    plannerInput.budgetSensitivity ?? "moderate"
  );
  const [interests, setInterests] = useState<string[]>(plannerInput.interests ?? []);
  const [strollerNeeded, setStrollerNeeded] = useState<boolean>(plannerInput.strollerNeeded ?? false);
  const [stayLocations, setStayLocations] = useState<PlannerStayLocation[]>(plannerInput.stayLocations ?? []);
  const [stayOpen, setStayOpen] = useState(false);
  const [stopIntelligenceEnabled, setStopIntelligenceEnabled] = useState<boolean>(
    plannerInput.stopIntelligenceEnabled !== false
  );

  const addStayLocation = () => {
    setStayLocations(prev => [...prev, { name: "", address: "", checkIn: "", checkOut: "" }]);
    setStayOpen(true);
  };

  const updateStayField = (idx: number, field: keyof PlannerStayLocation, value: string) => {
    setStayLocations(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const removeStayLocation = (idx: number) => {
    setStayLocations(prev => prev.filter((_, i) => i !== idx));
  };

  const toggleInterest = (id: string) => {
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const applyAndBuild = () => {
    const cleanedStays = stayLocations.filter(s => s.name.trim());
    setPlannerInput({
      ...plannerInput,
      transportMode: transport,
      kidEnergyLevel: energy,
      indoorLean,
      budgetSensitivity: budget,
      interests,
      strollerNeeded,
      stayLocations: cleanedStays.length > 0 ? cleanedStays : undefined,
      stopIntelligenceEnabled,
    });
    navigate("/generating");
  };

  const skipAndBuild = () => {
    const cleanedStays = stayLocations.filter(s => s.name.trim());
    setPlannerInput({
      ...plannerInput,
      transportMode: plannerInput.transportMode ?? "walking",
      budgetSensitivity: plannerInput.budgetSensitivity ?? "moderate",
      stopIntelligenceEnabled: plannerInput.stopIntelligenceEnabled !== false,
      stayLocations: cleanedStays.length > 0 ? cleanedStays : plannerInput.stayLocations,
    });
    navigate("/generating");
  };

  return (
    <div className="min-h-screen bg-[#FFFAF5] flex flex-col">
      <div className="flex items-center px-5 pt-safe-top pt-4 pb-3 sticky top-0 z-10 bg-[#FFFAF5] border-b border-orange-100">
        <button
          onClick={() => navigate("/style")}
          className="p-2 -ml-2 rounded-full hover:bg-orange-50 text-gray-500"
          data-testid="button-tailor-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="ml-2 flex-1">
          <h1 className="text-base font-bold text-slate-800">Help us tailor this</h1>
          <p className="text-xs text-slate-400">Step 3 of 3 — completely optional</p>
        </div>
        <div className="flex gap-1">
          <div className="w-6 h-1.5 rounded-full bg-orange-400" />
          <div className="w-6 h-1.5 rounded-full bg-orange-400" />
          <div className="w-6 h-1.5 rounded-full bg-orange-400" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-7 pb-36">
        <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">✨</span>
          <div>
            <p className="text-xs font-semibold text-orange-700">All fields below are optional</p>
            <p className="text-[11px] text-orange-600 mt-0.5 leading-relaxed">
              The more you share, the smarter your stops. Every answer helps us pick the right place at the right moment for your kids.
            </p>
          </div>
        </div>

        <div>
          <SectionLabel>Getting around</SectionLabel>
          <div className="grid grid-cols-3 gap-2">
            {TRANSPORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTransport(opt.value)}
                className={`p-3 rounded-xl border-2 text-center transition-all ${
                  transport === opt.value
                    ? "border-orange-400 bg-orange-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-orange-200"
                }`}
                data-testid={`button-transport-${opt.value}`}
              >
                <div className="text-2xl mb-1">{opt.emoji}</div>
                <div className="text-[11px] font-semibold text-slate-700 leading-tight">{opt.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <SectionLabel>Kids' energy today</SectionLabel>
          <div className="grid grid-cols-3 gap-2">
            {ENERGY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setEnergy(opt.value)}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  energy === opt.value
                    ? "border-orange-400 bg-orange-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-orange-200"
                }`}
                data-testid={`button-energy-${opt.value}`}
              >
                <div className="text-xl mb-1">{opt.emoji}</div>
                <div className="text-[11px] font-bold text-slate-700 leading-tight">{opt.label}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{opt.sub}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <SectionLabel>Indoor or outdoor today?</SectionLabel>
          <div className="grid grid-cols-3 gap-2">
            {INDOOR_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setIndoorLean(opt.value)}
                className={`p-3 rounded-xl border-2 text-center transition-all ${
                  indoorLean === opt.value
                    ? "border-orange-400 bg-orange-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-orange-200"
                }`}
                data-testid={`button-indoor-${opt.value}`}
              >
                <div className="text-2xl mb-1">{opt.emoji}</div>
                <div className="text-[11px] font-semibold text-slate-700">{opt.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <SectionLabel>What do your kids love?</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {INTEREST_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => toggleInterest(opt.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full border-2 text-sm font-semibold transition-all ${
                  interests.includes(opt.id)
                    ? "border-orange-400 bg-orange-100 text-orange-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-orange-200"
                }`}
                data-testid={`chip-interest-${opt.id}`}
              >
                <span>{opt.emoji}</span>
                <span className="text-xs">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <SectionLabel>Budget</SectionLabel>
          <div className="grid grid-cols-3 gap-2">
            {BUDGET_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setBudget(opt.value)}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  budget === opt.value
                    ? "border-orange-400 bg-orange-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-orange-200"
                }`}
                data-testid={`button-budget-${opt.value}`}
              >
                <div className="text-xl mb-1">{opt.emoji}</div>
                <div className="text-[11px] font-bold text-slate-700">{opt.label}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{opt.sub}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <SectionLabel>Accessibility</SectionLabel>
          <button
            onClick={() => setStrollerNeeded((v) => !v)}
            className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
              strollerNeeded
                ? "border-orange-400 bg-orange-50"
                : "border-slate-200 bg-white hover:border-orange-200"
            }`}
            data-testid="button-stroller"
          >
            <span className="text-2xl">🚼</span>
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-slate-800">We're bringing a stroller</p>
              <p className="text-[11px] text-slate-400">We'll prioritise stroller-friendly stops and avoid cobblestones/stairs</p>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
              strollerNeeded ? "bg-orange-400 border-orange-400" : "border-slate-300"
            }`}>
              {strollerNeeded && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
            </div>
          </button>
        </div>

        <div>
          <SectionLabel>Stop Intelligence</SectionLabel>
          <button
            onClick={() => setStopIntelligenceEnabled(v => !v)}
            className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
              stopIntelligenceEnabled
                ? "border-orange-400 bg-orange-50"
                : "border-slate-200 bg-white hover:border-orange-200"
            }`}
            data-testid="button-stop-intelligence"
          >
            <span className="text-2xl">🧠</span>
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-slate-800">Smart stop details</p>
              <p className="text-[11px] text-slate-400">Live hours, booking links, and cost info for each stop</p>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
              stopIntelligenceEnabled ? "bg-orange-400 border-orange-400" : "border-slate-300"
            }`}>
              {stopIntelligenceEnabled && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
            </div>
          </button>
        </div>

        <div>
          <button
            onClick={() => setStayOpen(v => !v)}
            className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-slate-200 bg-white hover:border-orange-200 transition-all"
            data-testid="button-stay-toggle"
          >
            <Hotel className="w-5 h-5 text-orange-400 shrink-0" />
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-slate-800">Where are you staying?</p>
              <p className="text-[11px] text-slate-400">
                {stayLocations.filter(s => s.name.trim()).length > 0
                  ? `${stayLocations.filter(s => s.name.trim()).length} accommodation${stayLocations.filter(s => s.name.trim()).length > 1 ? "s" : ""} added`
                  : "Optional — helps us plan start/end points"}
              </p>
            </div>
            {stayOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {stayOpen && (
            <div className="mt-2 space-y-3">
              {stayLocations.map((stay, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[12px] font-semibold text-slate-600">Hotel / Airbnb {idx + 1}</p>
                    <button onClick={() => removeStayLocation(idx)} className="text-red-400 p-1" data-testid={`button-remove-stay-${idx}`}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Hotel name *"
                    value={stay.name}
                    onChange={e => updateStayField(idx, "name", e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-200"
                    data-testid={`input-stay-name-${idx}`}
                  />
                  <input
                    type="text"
                    placeholder="Address (optional)"
                    value={stay.address}
                    onChange={e => updateStayField(idx, "address", e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-200"
                    data-testid={`input-stay-address-${idx}`}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] text-slate-400 mb-1">Check-in</p>
                      <input
                        type="date"
                        value={stay.checkIn}
                        onChange={e => updateStayField(idx, "checkIn", e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-200"
                        data-testid={`input-stay-checkin-${idx}`}
                      />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 mb-1">Check-out</p>
                      <input
                        type="date"
                        value={stay.checkOut}
                        onChange={e => updateStayField(idx, "checkOut", e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-200"
                        data-testid={`input-stay-checkout-${idx}`}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={addStayLocation}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-orange-200 rounded-xl text-orange-500 text-sm font-semibold hover:bg-orange-50 transition-colors"
                data-testid="button-add-stay"
              >
                <Plus className="w-4 h-4" /> Add accommodation
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-[#FFFAF5] border-t border-orange-100 px-5 py-4 flex gap-3">
        <button
          onClick={skipAndBuild}
          className="flex-1 py-4 rounded-2xl border-2 border-orange-200 text-orange-600 font-bold text-sm flex items-center justify-center gap-2 hover:bg-orange-50 transition-all"
          data-testid="button-skip-build"
        >
          <SkipForward className="w-4 h-4" /> Skip & Build
        </button>
        <button
          onClick={applyAndBuild}
          className="flex-[2] bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl text-base shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          data-testid="button-build-plan"
        >
          Build My Plan <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
