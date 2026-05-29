import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Search, X, ChevronRight, Plus, Navigation, MapPin, Minus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { usePlanner, type PlannerRouteStop } from "@/lib/plannerContext";
import { POPULAR_CITIES, getCoordsForName, CONTINENTS, COUNTRIES_BY_CONTINENT } from "@/lib/travelDestinations";

type TripMode = "single" | "multi";

interface SearchableCity {
  name: string;
  countryName: string;
}

declare global { interface Window { L?: any; } }

function buildCityIndex(): SearchableCity[] {
  const items: SearchableCity[] = [];
  for (const pop of POPULAR_CITIES) {
    items.push({ name: pop.name, countryName: pop.country });
  }
  for (const continent of CONTINENTS) {
    const countries = (COUNTRIES_BY_CONTINENT as any)[continent.id] || [];
    for (const country of countries) {
      if (!items.find((i) => i.name === country.name)) {
        items.push({ name: country.name, countryName: country.name });
      }
    }
  }
  return items;
}

const CITY_INDEX = buildCityIndex();

function PlannerMap({ leafletReady, routeStops }: { leafletReady: boolean; routeStops: PlannerRouteStop[] }) {
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
      const zoom = coords.length === 1 ? 5 : 3;
      const center: [number, number] = [
        coords.reduce((s, c) => s + c[0], 0) / coords.length,
        coords.reduce((s, c) => s + c[1], 0) / coords.length,
      ];
      mapRef.current.flyTo(center, zoom);
    } else {
      mapRef.current.setView([20, 0], 2);
    }
  }, [routeStops, mapReady]);

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 mb-3" style={{ height: 160 }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

export default function PlannerEntry() {
  const [, navigate] = useLocation();
  const { plannerInput, setPlannerInput, plannerRouteStops, setPlannerRouteStops } = usePlanner();

  const [tripMode, setTripMode] = useState<TripMode>("single");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDestination, setSelectedDestination] = useState<SearchableCity | null>(null);
  const [showAddStop, setShowAddStop] = useState(false);
  const [addStopQuery, setAddStopQuery] = useState("");
  const [leafletReady, setLeafletReady] = useState(false);
  const [tripDays, setTripDays] = useState(plannerInput.tripDays || 3);

  // Read ?tripId= from URL and store in planner input so anchors can be fetched at generation time
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tripId = params.get("tripId");
    if (tripId && !plannerInput.experienceTripId) {
      setPlannerInput({ ...plannerInput, experienceTripId: tripId });
    }
  }, []);

  useEffect(() => {
    if (window.L) { setLeafletReady(true); return; }
    const check = setInterval(() => { if (window.L) { setLeafletReady(true); clearInterval(check); } }, 200);
    return () => clearInterval(check);
  }, []);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return CITY_INDEX.filter((c) => c.name.toLowerCase().includes(q) || c.countryName.toLowerCase().includes(q)).slice(0, 8);
  }, [searchQuery]);

  const addStopResults = useMemo(() => {
    const q = addStopQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return CITY_INDEX.filter((c) => c.name.toLowerCase().includes(q) || c.countryName.toLowerCase().includes(q)).slice(0, 6);
  }, [addStopQuery]);

  const handleSelectDestination = (city: SearchableCity) => {
    setSelectedDestination(city);
    setSearchQuery("");
    const stop: PlannerRouteStop = { id: `stop-${Date.now()}`, name: city.name, countryName: city.countryName, nights: tripDays };
    setPlannerRouteStops([stop]);
    setPlannerInput({ ...plannerInput, destination: city.name });
  };

  const handleAddRouteStop = (city: SearchableCity) => {
    if (plannerRouteStops.find((s) => s.name.toLowerCase() === city.name.toLowerCase())) return;
    const newStop: PlannerRouteStop = { id: `stop-${Date.now()}`, name: city.name, countryName: city.countryName, nights: 1 };
    // When adding the 2nd city (first multi-city moment), sync existing city's nights to the current tripDays total
    const syncedExisting = plannerRouteStops.length === 1
      ? plannerRouteStops.map((s) => ({ ...s, nights: tripDays }))
      : plannerRouteStops;
    const newStops = [...syncedExisting, newStop];
    setPlannerRouteStops(newStops);
    if (!selectedDestination) setSelectedDestination(city);
    setPlannerInput({ ...plannerInput, destination: newStops.map((s) => s.name).join(", ") });
    setShowAddStop(false);
    setAddStopQuery("");
  };

  const handleUpdateNights = (id: string, delta: number) => {
    setPlannerRouteStops((prev) =>
      prev.map((s) => s.id === id ? { ...s, nights: Math.max(1, Math.min(21, (s.nights ?? 1) + delta)) } : s)
    );
  };

  const handleRemoveStop = (id: string) => {
    const newStops = plannerRouteStops.filter((s) => s.id !== id);
    setPlannerRouteStops(newStops);
    if (newStops.length === 0) { setSelectedDestination(null); setPlannerInput({ ...plannerInput, destination: "" }); }
    else {
      if (newStops.length === 1 && !selectedDestination) setSelectedDestination({ name: newStops[0].name, countryName: newStops[0].countryName || "" });
      setPlannerInput({ ...plannerInput, destination: newStops.map((s) => s.name).join(", ") });
    }
  };

  const handleClearDestination = () => {
    setSelectedDestination(null);
    setPlannerRouteStops([]);
    setPlannerInput({ ...plannerInput, destination: "" });
    setSearchQuery("");
  };

  const isMultiCity = plannerRouteStops.length > 1;
  const totalMultiCityDays = isMultiCity
    ? plannerRouteStops.reduce((sum, s) => sum + (s.nights ?? 1), 0)
    : tripDays;

  const canProceed = selectedDestination !== null && plannerRouteStops.length > 0;

  const handleContinue = () => {
    if (!canProceed) return;
    const effectiveDays = isMultiCity ? totalMultiCityDays : tripDays;
    setPlannerInput({
      ...plannerInput,
      tripDays: effectiveDays,
      destination: plannerRouteStops.map((s) => s.name).join(", "),
      routeStops: plannerRouteStops.map((s) => ({ name: s.name, countryName: s.countryName, nights: s.nights ?? (isMultiCity ? 1 : effectiveDays) })),
    });
    navigate("/style");
  };

  const popularCities = POPULAR_CITIES.slice(0, 8);

  return (
    <div className="min-h-screen bg-[#FFFAF5] flex flex-col">
      <div className="max-w-lg mx-auto w-full px-4 pt-4 pb-32">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate("~/")}
            className="flex items-center gap-1 text-slate-600 text-sm font-medium hover:text-slate-800 transition-colors"
            data-testid="button-back-planner"
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
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${s.num === 1 ? "bg-orange-500 text-white shadow-md" : "bg-slate-100 text-slate-400"}`}>
                {s.label}
              </div>
              {i < 2 && <ChevronRight className="w-3 h-3 text-slate-300 mx-1" />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key="step1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}>
            <h2 className="text-xl font-extrabold text-slate-800 mb-1">Where are you taking the kids? ✨</h2>
            <p className="text-sm text-slate-400 mb-4">We'll turn it into a plan in seconds</p>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => { setTripMode("single"); if (plannerRouteStops.length > 1) { const first = plannerRouteStops[0]; setPlannerRouteStops([first]); setPlannerInput({ ...plannerInput, destination: first.name }); } }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${tripMode === "single" ? "border-orange-500 bg-orange-50 text-orange-700" : "border-slate-200 bg-white text-slate-500 hover:border-orange-200"}`}
                data-testid="toggle-single-city"
              >
                📍 One City
              </button>
              <button
                onClick={() => setTripMode("multi")}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${tripMode === "multi" ? "border-orange-500 bg-orange-50 text-orange-700" : "border-slate-200 bg-white text-slate-500 hover:border-orange-200"}`}
                data-testid="toggle-multi-city"
              >
                🗺️ Multi-City
              </button>
            </div>

            <p className="text-sm text-slate-500 mb-1">{tripMode === "single" ? "Pick your destination city" : "Build a multi-city route"}</p>
            {!selectedDestination && tripMode === "single" && <p className="text-[11px] text-slate-400 mb-2">Or pick one to get started quickly</p>}

            {tripMode === "multi" && plannerRouteStops.length >= 1 ? (
              <div className="mb-3 px-3 py-2.5 bg-gray-100 rounded-xl flex items-center gap-2 text-sm text-gray-400 border border-dashed border-gray-200">
                <Search className="w-4 h-4 shrink-0" />
                <span>Use <span className="font-semibold text-gray-500">+ Add Another City</span> to add more cities</span>
              </div>
            ) : (
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search city or country…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 text-base rounded-xl"
                  data-testid="input-destination-search"
                />
              </div>
            )}

            {searchQuery.trim().length >= 2 && (
              <Card className="mb-3 divide-y divide-slate-100 overflow-hidden max-h-56 overflow-y-auto">
                {searchResults.length > 0 ? searchResults.map((city, i) => (
                  <button key={`sr-${i}`} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50 transition-colors text-left" onClick={() => handleSelectDestination(city)} data-testid={`search-result-${i}`}>
                    <span className="text-base">📍</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 text-sm truncate">{city.name}</p>
                      <p className="text-xs text-slate-400 truncate">{city.countryName}</p>
                    </div>
                  </button>
                )) : (
                  <button className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50 transition-colors text-left" onClick={() => handleSelectDestination({ name: searchQuery.trim(), countryName: "" })}>
                    <span className="text-base">🌍</span>
                    <p className="font-medium text-orange-600 text-sm">Add "{searchQuery.trim()}"</p>
                  </button>
                )}
              </Card>
            )}

            {!searchQuery && !selectedDestination && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Popular Destinations</p>
                <div className="grid grid-cols-2 gap-2">
                  {popularCities.map((city, i) => (
                    <button key={`pop-${i}`} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-orange-300 hover:bg-orange-50 transition-all text-left" onClick={() => handleSelectDestination({ name: city.name, countryName: city.country })} data-testid={`popular-dest-${i}`}>
                      <span className="text-base">📍</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{city.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{city.country}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {leafletReady && plannerRouteStops.length > 0 && (
              <PlannerMap leafletReady={leafletReady} routeStops={plannerRouteStops} />
            )}

            {selectedDestination && plannerRouteStops.length === 1 && tripMode === "single" && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-white border-2 border-orange-300 mb-3 overflow-hidden shadow-md" data-testid="selected-destination">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="font-extrabold text-slate-800 text-xl leading-tight">{selectedDestination.name}</p>
                      {selectedDestination.countryName && <p className="text-sm text-slate-400 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{selectedDestination.countryName}</p>}
                    </div>
                    <button onClick={handleClearDestination} className="text-slate-300 hover:text-red-400 p-1 rounded-full transition-colors" data-testid="button-clear-destination"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center gap-2"><span className="text-green-500 text-sm">✅</span><span className="text-sm font-bold text-orange-600">Perfect for kids</span></div>
                    <div className="flex items-center gap-2"><span className="text-sm">🌳</span><span className="text-sm text-slate-600">Parks, museums, easy walking</span></div>
                    <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-orange-500" /><span className="text-sm text-slate-600">~8–12 family-friendly stops planned</span></div>
                    <div className="flex items-center gap-2"><span className="text-sm">⏱️</span><span className="text-sm text-slate-500">Typical plan: 2–4 hrs/day</span></div>
                  </div>

                  <div className="mb-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Trip length</p>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setTripDays((d) => Math.max(1, d - 1))} className="w-9 h-9 rounded-full border-2 border-orange-200 flex items-center justify-center text-orange-600 hover:border-orange-400 transition-all" data-testid="button-days-minus"><Minus className="w-4 h-4" /></button>
                      <span className="text-2xl font-bold text-slate-800 w-10 text-center" data-testid="text-trip-days">{tripDays}</span>
                      <button onClick={() => setTripDays((d) => Math.min(14, d + 1))} className="w-9 h-9 rounded-full border-2 border-orange-200 flex items-center justify-center text-orange-600 hover:border-orange-400 transition-all" data-testid="button-days-plus"><Plus className="w-4 h-4" /></button>
                      <span className="text-sm text-slate-400">days</span>
                    </div>
                  </div>

                  <button onClick={handleContinue} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl py-2.5 text-sm flex items-center justify-center gap-1 transition-all" data-testid="button-city-build-plan">
                    Build my plan <ChevronRight className="w-4 h-4" />
                  </button>
                  <p className="text-[11px] text-slate-400 text-center mt-2">We'll handle the rest</p>
                </div>
              </motion.div>
            )}

            {selectedDestination && plannerRouteStops.length > 1 && (
              <motion.div key={`multi-${plannerRouteStops.length}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-white border-2 border-blue-300 mb-3 overflow-hidden shadow-md" data-testid="selected-destination-multi">
                <div className="px-4 pt-4 pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-extrabold text-slate-800 text-xl leading-tight">{plannerRouteStops.length}-City Adventure</p>
                      <p className="text-sm text-slate-400 flex items-center gap-1 mt-0.5"><Navigation className="w-3 h-3" />{plannerRouteStops.map((s) => s.name).join(" → ")}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-bold text-orange-500">{totalMultiCityDays}</p>
                      <p className="text-xs text-slate-400">days total</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 mb-1">Set days per city below ↓</p>
                </div>
              </motion.div>
            )}

            {selectedDestination && plannerRouteStops.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1"><MapPin className="w-3 h-3" /> Your Route</p>
                <div className="space-y-2">
                  {plannerRouteStops.map((stop, idx) => (
                    <div key={stop.id} className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                      <div className="flex items-center gap-3 px-3 py-2.5">
                        <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center shrink-0">{idx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{stop.name}</p>
                          {stop.countryName && <p className="text-[10px] text-slate-400">{stop.countryName}</p>}
                        </div>
                        {isMultiCity ? (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleUpdateNights(stop.id, -1)}
                              className="w-7 h-7 rounded-full border border-orange-200 flex items-center justify-center text-orange-500 hover:border-orange-400 transition-all"
                              data-testid={`button-nights-dec-${stop.id}`}
                            ><Minus className="w-3 h-3" /></button>
                            <span className="text-sm font-bold text-slate-800 w-5 text-center">{stop.nights ?? 1}</span>
                            <button
                              onClick={() => handleUpdateNights(stop.id, 1)}
                              className="w-7 h-7 rounded-full border border-orange-200 flex items-center justify-center text-orange-500 hover:border-orange-400 transition-all"
                              data-testid={`button-nights-inc-${stop.id}`}
                            ><Plus className="w-3 h-3" /></button>
                            <span className="text-[10px] text-slate-400 ml-0.5">days</span>
                          </div>
                        ) : null}
                        <button onClick={() => handleRemoveStop(stop.id)} className="text-slate-300 hover:text-red-400 p-1 transition-colors ml-1"><X className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tripMode === "multi" && selectedDestination && (
              showAddStop ? (
                <div className="mb-3">
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input placeholder="Search city to add…" value={addStopQuery} onChange={(e) => setAddStopQuery(e.target.value)} className="pl-10 h-11 text-sm rounded-xl" autoFocus data-testid="input-add-stop" />
                  </div>
                  {addStopQuery.trim().length >= 2 && (
                    <Card className="mb-2 divide-y divide-slate-100 overflow-hidden max-h-48 overflow-y-auto">
                      <button className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50 transition-colors text-left bg-orange-50/50" onClick={() => handleAddRouteStop({ name: addStopQuery.trim(), countryName: "" })}>
                        <span className="text-sm">🌍</span>
                        <p className="font-medium text-orange-600 text-sm truncate">Add "{addStopQuery.trim()}"</p>
                        <Navigation className="w-3.5 h-3.5 text-orange-500 ml-auto" />
                      </button>
                      {addStopResults.map((city, i) => (
                        <button key={`ar-${i}`} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50 transition-colors text-left" onClick={() => handleAddRouteStop(city)} data-testid={`add-stop-result-${i}`}>
                          <span className="text-sm">📍</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-800 text-sm truncate">{city.name}</p>
                            <p className="text-xs text-slate-400 truncate">{city.countryName}</p>
                          </div>
                        </button>
                      ))}
                    </Card>
                  )}
                  <div className="flex justify-end">
                    <button onClick={() => { setShowAddStop(false); setAddStopQuery(""); }} className="text-sm text-slate-500 hover:text-slate-700 px-3 py-1.5">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowAddStop(true)} className="w-full h-11 border-dashed border-2 border-orange-300 text-orange-600 hover:bg-orange-50 rounded-xl gap-2 mb-3 flex items-center justify-center text-sm font-medium transition-all" data-testid="button-add-stop">
                  <Plus className="w-4 h-4" /> Add Another City
                </button>
              )
            )}

            {canProceed && (plannerRouteStops.length > 1 || tripMode === "multi") && (
              <div className="mt-4">
                <button onClick={handleContinue} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold h-14 py-4 rounded-2xl text-base shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98]" data-testid="button-next-step1">
                  Continue →
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
