/**
 * AddAnchorSheet — shared between AdventureBuilder and ParentPlanView
 *
 * 2-step bottom sheet:
 *   Step 1: What is it? (type selection)
 *   Step 2: Name (with city + landmark validation), day/day-range, time, duration, address
 */

import { useState, useMemo, useEffect, useRef } from "react";
import { X, Lock, Clock, AlertTriangle, MapPin, Search } from "lucide-react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

export interface AnchorInput {
  name: string;
  anchorType: "ticket" | "food" | "event" | "hotel" | "other";
  day: number;
  endDay?: number;
  time: string;
  durationMinutes: number | null;
  address?: string;
  flexibility: "hard" | "soft";
}

interface AddAnchorSheetProps {
  isOpen: boolean;
  onClose: () => void;
  totalDays?: number;
  tripCity?: string;
  ctaLabel?: string;
  onAdd: (anchor: AnchorInput) => void | Promise<void>;
}

const ANCHOR_TYPES = [
  { id: "ticket" as const, emoji: "🎟", label: "Ticket / attraction", hint: "Museum, tower, park entry" },
  { id: "food"   as const, emoji: "🍽", label: "Food reservation",    hint: "Restaurant, café booking" },
  { id: "event"  as const, emoji: "🎭", label: "Event / show",        hint: "Performance, sports, concert" },
  { id: "hotel"  as const, emoji: "🏨", label: "Hotel / accommodation", hint: "Check-in, check-out dates" },
  { id: "other"  as const, emoji: "📌", label: "Something else",      hint: "Transport, other plans" },
];

// Known major city names used for cross-city detection
const KNOWN_CITIES = [
  "amsterdam","athens","bangkok","barcelona","beijing","berlin","brussels","budapest",
  "cairo","chicago","copenhagen","dubai","dublin","florence","hong kong","istanbul",
  "jakarta","kyoto","lima","lisbon","london","los angeles","madrid","marrakech",
  "melbourne","mexico city","miami","milan","montreal","moscow","mumbai","munich",
  "nairobi","new york","oslo","paris","prague","rio de janeiro","rome","san francisco",
  "santiago","seoul","shanghai","singapore","stockholm","sydney","taipei","tokyo",
  "toronto","venice","vienna","warsaw","washington","zurich",
];

// Famous landmarks mapped to their city — used to catch cross-city errors early
const LANDMARK_CITY_MAP: Record<string, string> = {
  "sagrada família": "barcelona", "sagrada familia": "barcelona",
  "la sagrada": "barcelona",
  "eiffel tower": "paris", "tour eiffel": "paris", "louvre": "paris",
  "big ben": "london", "tower of london": "london", "buckingham palace": "london",
  "colosseum": "rome", "roman forum": "rome",
  "statue of liberty": "new york", "central park": "new york", "empire state": "new york",
  "golden gate": "san francisco", "alcatraz": "san francisco",
  "burj khalifa": "dubai", "palm jumeirah": "dubai",
  "angkor wat": "siem reap",
  "machu picchu": "cusco",
  "taj mahal": "agra",
  "sydney opera house": "sydney", "bondi beach": "sydney",
  "christ the redeemer": "rio de janeiro",
  "mount fuji": "tokyo", "senso-ji": "tokyo", "tokyo tower": "tokyo",
  "acropolis": "athens",
  "la rambla": "barcelona", "park güell": "barcelona", "camp nou": "barcelona",
  "musée d'orsay": "paris", "notre dame": "paris",
  "Brandenburg gate": "berlin", "berlin wall": "berlin",
  "sagrada": "barcelona",
  "disneyland paris": "paris",
  "tokyo disneyland": "tokyo", "tokyo disney": "tokyo",
};

function detectMismatchedCity(name: string, tripCity: string): string | null {
  const nameLower = name.toLowerCase();
  const tripLower = tripCity.toLowerCase();

  // Check known landmark → city map first
  for (const [landmark, landmarkCity] of Object.entries(LANDMARK_CITY_MAP)) {
    if (nameLower.includes(landmark)) {
      if (!tripLower.includes(landmarkCity) && !landmarkCity.includes(tripLower.split(",")[0].trim())) {
        return landmarkCity.charAt(0).toUpperCase() + landmarkCity.slice(1);
      }
      return null;
    }
  }

  // Check if name contains a known city that doesn't match trip city
  for (const city of KNOWN_CITIES) {
    if (city === tripLower || tripLower.includes(city) || city.includes(tripLower.split(",")[0].trim())) continue;
    if (nameLower.includes(city)) {
      return city.charAt(0).toUpperCase() + city.slice(1);
    }
  }
  return null;
}

async function searchAddress(query: string, city: string): Promise<string | null> {
  if (query.trim().length < 3) return null;
  try {
    const fullQuery = city ? `${query}, ${city}` : query;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fullQuery)}&format=json&limit=1&accept-language=en`;
    const res = await fetch(url, { headers: { "Accept-Language": "en" } });
    if (!res.ok) return null;
    const data = await res.json();
    if (data[0]?.display_name) {
      const parts = data[0].display_name.split(", ").slice(0, 3);
      return parts.join(", ");
    }
    return null;
  } catch {
    return null;
  }
}

export function AddAnchorSheet({ isOpen, onClose, totalDays = 7, tripCity, ctaLabel, onAdd }: AddAnchorSheetProps) {
  const [sheetStep, setSheetStep] = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState<AnchorInput["anchorType"] | null>(null);
  const [name, setName] = useState("");
  const [day, setDay] = useState(1);
  const [endDay, setEndDay] = useState(1);
  const [time, setTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [address, setAddress] = useState("");
  const [addressSearching, setAddressSearching] = useState(false);
  const [addressSuggestion, setAddressSuggestion] = useState<string | null>(null);
  const [flexibility, setFlexibility] = useState<"hard" | "soft">("hard");
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isHotel = selectedType === "hotel";

  // Detect cross-city mismatch from the typed name
  const cityMismatch = useMemo(() => {
    if (!tripCity || name.trim().length < 3) return null;
    return detectMismatchedCity(name.trim(), tripCity);
  }, [name, tripCity]);

  // Auto-search address when name changes (debounced)
  useEffect(() => {
    if (name.trim().length < 4 || !isOpen) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setAddressSearching(true);
      const found = await searchAddress(name.trim(), tripCity || "");
      setAddressSearching(false);
      if (found && !address) setAddressSuggestion(found);
    }, 800);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [name, tripCity, isOpen]);

  // Sync endDay to be at least startDay
  useEffect(() => {
    if (endDay < day) setEndDay(day);
  }, [day]);

  function reset() {
    setSheetStep(1);
    setSelectedType(null);
    setName("");
    setDay(1);
    setEndDay(1);
    setTime("");
    setDurationMinutes("");
    setAddress("");
    setAddressSuggestion(null);
    setFlexibility("hard");
    setSaving(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleTypeSelect(type: AnchorInput["anchorType"]) {
    setSelectedType(type);
    setSheetStep(2);
  }

  async function handleSave() {
    if (!name.trim() || !selectedType) return;
    setSaving(true);
    try {
      const finalAddress = address || addressSuggestion || undefined;
      await onAdd({
        name: name.trim(),
        anchorType: selectedType,
        day,
        endDay: isHotel ? endDay : undefined,
        time: time || "",
        durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : null,
        address: finalAddress,
        flexibility,
      });
      handleClose();
    } catch {
      toast.error("Couldn't save this plan — please try again");
      setSaving(false);
    }
  }

  const canSave = name.trim().length > 0 && selectedType !== null;

  if (!isOpen) return null;

  const dayOptions = Array.from({ length: Math.max(totalDays, 1) }, (_, i) => i + 1);
  const displayCta = ctaLabel || "Lock into my plan";
  const cityLabel = tripCity ? tripCity.split(",")[0].trim() : null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-[300]"
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[301] bg-white rounded-t-3xl overflow-hidden"
        style={{ maxHeight: "90vh", overflowY: "auto" }}
        data-testid="add-anchor-sheet"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3">
          <div>
            {sheetStep === 1 && (
              <>
                <h3 className="text-[17px] font-bold text-slate-900">Anything already planned?</h3>
                <p className="text-xs text-slate-400 mt-0.5">We'll build your day around it</p>
              </>
            )}
            {sheetStep === 2 && (
              <>
                <button
                  onClick={() => setSheetStep(1)}
                  className="text-xs font-semibold text-orange-500 mb-1 flex items-center gap-1"
                  data-testid="anchor-back-step1"
                >
                  ← Back
                </button>
                <h3 className="text-[17px] font-bold text-slate-900">Tell us the details</h3>
                {cityLabel && (
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-orange-400" />
                    For your {cityLabel} trip
                  </p>
                )}
              </>
            )}
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
            data-testid="anchor-sheet-close"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="px-5 pb-10">

          {/* STEP 1 — Type */}
          {sheetStep === 1 && (
            <div className="space-y-2 mt-1">
              {cityLabel && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-50 border border-orange-200 mb-3">
                  <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
                  <p className="text-xs text-orange-700 font-semibold">Only add plans that are in <span className="font-bold">{cityLabel}</span></p>
                </div>
              )}
              {ANCHOR_TYPES.map(type => (
                <button
                  key={type.id}
                  onClick={() => handleTypeSelect(type.id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-slate-50 border-2 border-slate-200 hover:border-orange-400 hover:bg-orange-50 transition-all text-left active:scale-[0.98]"
                  data-testid={`anchor-type-${type.id}`}
                >
                  <span className="text-2xl shrink-0">{type.emoji}</span>
                  <div>
                    <p className="font-bold text-[14px] text-slate-800">{type.label}</p>
                    <p className="text-[11px] text-slate-400">{type.hint}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* STEP 2 — Details */}
          {sheetStep === 2 && (
            <div className="space-y-4 mt-2">

              {/* Name */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">
                  {isHotel ? "Hotel name" : "Name"}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => { setName(e.target.value); setAddressSuggestion(null); setAddress(""); }}
                  placeholder={
                    selectedType === "ticket" ? "e.g. Willis Tower" :
                    selectedType === "food"   ? "e.g. Dinner at Alinea" :
                    selectedType === "event"  ? "e.g. FC Chicago match" :
                    selectedType === "hotel"  ? "e.g. Marriott Chicago" :
                    "e.g. Airport transfer"
                  }
                  className="w-full h-12 rounded-2xl border-2 border-slate-200 px-4 text-sm font-semibold text-slate-800 focus:border-orange-400 focus:outline-none transition-colors"
                  autoFocus
                  data-testid="anchor-name-input"
                />

                {/* Cross-city warning */}
                {cityMismatch && (
                  <div className="flex items-start gap-2 mt-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-amber-800">Heads up — {cityMismatch} isn't in your {cityLabel} trip</p>
                      <p className="text-[11px] text-amber-600 mt-0.5">Only add places that are actually in {cityLabel || "your destination"}</p>
                    </div>
                  </div>
                )}

                {/* Positive city confirmation */}
                {!cityMismatch && cityLabel && name.trim().length >= 2 && (
                  <p className="text-[11px] text-emerald-600 font-semibold mt-1.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    Adding for {cityLabel}
                  </p>
                )}
              </div>

              {/* Address (auto-populated + editable) */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5 flex items-center gap-1">
                  Address <span className="text-slate-300 font-normal">(optional)</span>
                  {addressSearching && <span className="text-orange-400 text-[10px] font-normal ml-1 animate-pulse">Finding…</span>}
                </label>
                {addressSuggestion && !address && (
                  <button
                    onClick={() => setAddress(addressSuggestion)}
                    className="w-full text-left px-3 py-2.5 rounded-xl bg-orange-50 border border-orange-200 mb-2 flex items-start gap-2"
                    data-testid="anchor-address-suggestion"
                  >
                    <Search className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] text-orange-700 font-semibold">Tap to use this address:</p>
                      <p className="text-[11px] text-orange-600">{addressSuggestion}</p>
                    </div>
                  </button>
                )}
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder={isHotel ? "Enter hotel address (helps with directions)" : "Full address (optional)"}
                  className="w-full h-12 rounded-2xl border-2 border-slate-200 px-4 text-sm text-slate-700 focus:border-orange-400 focus:outline-none transition-colors"
                  data-testid="anchor-address-input"
                />
              </div>

              {/* Day selection — hotel shows start + end, others show single pill */}
              {isHotel ? (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Check-in day</label>
                  <div className="flex gap-2 flex-wrap mb-3">
                    {dayOptions.map(d => (
                      <button
                        key={d}
                        onClick={() => setDay(d)}
                        className={`px-4 py-2 rounded-full text-sm font-bold border-2 transition-all ${
                          day === d
                            ? "bg-orange-50 border-orange-500 text-orange-700"
                            : "bg-white border-slate-200 text-slate-600 hover:border-orange-300"
                        }`}
                        data-testid={`anchor-start-day-${d}`}
                      >
                        Day {d}
                      </button>
                    ))}
                  </div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Check-out day</label>
                  <div className="flex gap-2 flex-wrap">
                    {dayOptions.filter(d => d >= day).map(d => (
                      <button
                        key={d}
                        onClick={() => setEndDay(d)}
                        className={`px-4 py-2 rounded-full text-sm font-bold border-2 transition-all ${
                          endDay === d
                            ? "bg-blue-50 border-blue-500 text-blue-700"
                            : "bg-white border-slate-200 text-slate-600 hover:border-blue-300"
                        }`}
                        data-testid={`anchor-end-day-${d}`}
                      >
                        Day {d}
                      </button>
                    ))}
                  </div>
                  {day !== endDay && (
                    <p className="text-[11px] text-slate-400 mt-1.5">Staying Days {day}–{endDay} ({endDay - day + 1} nights)</p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Day</label>
                  <div className="flex gap-2 flex-wrap">
                    {dayOptions.map(d => (
                      <button
                        key={d}
                        onClick={() => setDay(d)}
                        className={`px-4 py-2 rounded-full text-sm font-bold border-2 transition-all ${
                          day === d
                            ? "bg-orange-50 border-orange-500 text-orange-700"
                            : "bg-white border-slate-200 text-slate-600 hover:border-orange-300"
                        }`}
                        data-testid={`anchor-day-${d}`}
                      >
                        Day {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Time — not shown for hotel */}
              {!isHotel && (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Time <span className="text-slate-300 font-normal">(optional)</span></label>
                  <input
                    type="time"
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    className="w-full h-12 rounded-2xl border-2 border-slate-200 px-4 text-sm font-semibold text-slate-800 focus:border-orange-400 focus:outline-none transition-colors"
                    data-testid="anchor-time-input"
                  />
                  {time && (
                    <p className="text-[11px] text-orange-600 font-semibold mt-1 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Locked at {formatDisplayTime(time)}
                    </p>
                  )}
                </div>
              )}

              {/* Duration — not shown for hotel */}
              {!isHotel && (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Duration <span className="text-slate-300 font-normal">(optional)</span></label>
                  <div className="flex gap-2 flex-wrap">
                    {[60, 90, 120, 180].map(mins => (
                      <button
                        key={mins}
                        onClick={() => setDurationMinutes(durationMinutes === String(mins) ? "" : String(mins))}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
                          durationMinutes === String(mins)
                            ? "bg-orange-50 border-orange-500 text-orange-700"
                            : "bg-white border-slate-200 text-slate-600 hover:border-orange-300"
                        }`}
                        data-testid={`anchor-duration-${mins}`}
                      >
                        ~{mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Flexibility toggle — only shown for non-hotel types */}
              {!isHotel && (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">How fixed is this?</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setFlexibility("hard")}
                      className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-2xl border-2 transition-all text-left ${
                        flexibility === "hard"
                          ? "bg-orange-50 border-orange-500 text-orange-900"
                          : "bg-white border-slate-200 text-slate-600 hover:border-orange-300"
                      }`}
                      data-testid="anchor-flexibility-hard"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${flexibility === "hard" ? "bg-orange-100" : "bg-slate-100"}`}>
                        <Lock className={`w-4 h-4 ${flexibility === "hard" ? "text-orange-600" : "text-slate-400"}`} />
                      </div>
                      <div>
                        <p className={`text-[12px] font-bold ${flexibility === "hard" ? "text-orange-800" : "text-slate-600"}`}>Fixed</p>
                        <p className={`text-[10px] leading-tight ${flexibility === "hard" ? "text-orange-600" : "text-slate-400"}`}>Non-negotiable time</p>
                      </div>
                    </button>
                    <button
                      onClick={() => setFlexibility("soft")}
                      className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-2xl border-2 transition-all text-left ${
                        flexibility === "soft"
                          ? "bg-blue-50 border-blue-500 text-blue-900"
                          : "bg-white border-slate-200 text-slate-600 hover:border-blue-300"
                      }`}
                      data-testid="anchor-flexibility-soft"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${flexibility === "soft" ? "bg-blue-100" : "bg-slate-100"}`}>
                        <Clock className={`w-4 h-4 ${flexibility === "soft" ? "text-blue-600" : "text-slate-400"}`} />
                      </div>
                      <div>
                        <p className={`text-[12px] font-bold ${flexibility === "soft" ? "text-blue-800" : "text-slate-600"}`}>Flexible</p>
                        <p className={`text-[10px] leading-tight ${flexibility === "soft" ? "text-blue-600" : "text-slate-400"}`}>Aim for this, can shift</p>
                      </div>
                    </button>
                  </div>
                  <p className={`text-[11px] mt-2 px-1 ${flexibility === "hard" ? "text-orange-600" : "text-blue-500"}`}>
                    {flexibility === "hard"
                      ? "🔒 We'll keep everything else away from this time slot"
                      : "🕐 We'll try this time — but may nudge it ±30 min if the day flows better"}
                  </p>
                </div>
              )}

              {/* CTA */}
              <button
                onClick={handleSave}
                disabled={!canSave || saving || !!cityMismatch}
                className="w-full h-[54px] rounded-2xl text-[16px] font-bold text-white mt-2 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                style={{
                  background: canSave && !saving && !cityMismatch ? "#E8742B" : "#CBD5E1",
                }}
                data-testid="anchor-save-button"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Updating your plan…
                  </>
                ) : cityMismatch ? (
                  <>
                    <AlertTriangle className="w-4 h-4" />
                    Fix the city mismatch first
                  </>
                ) : flexibility === "soft" ? (
                  <>
                    <Clock className="w-4 h-4" />
                    {isHotel ? displayCta : "Add as flexible plan"}
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    {displayCta}
                  </>
                )}
              </button>

              {!cityMismatch && (
                <p className="text-[11px] text-center text-slate-400">
                  {flexibility === "soft"
                    ? "We'll fit this in — the exact time may shift slightly"
                    : "We'll add this to your plan and build around it"}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}

export function formatDisplayTime(time: string): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}
