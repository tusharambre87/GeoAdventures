import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, 
  Globe, 
  CheckCircle2, 
  Star, 
  MapPin, 
  ArrowRight, 
  Volume2, 
  Search,
  BookOpen,
  Trophy,
  History,
  LayoutGrid
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useExplorer } from "@/lib/explorerContext";
import { toast } from "sonner";
import GeoAtlasCapitalQuest from "@/components/GeoAtlasCapitalQuest";
import GeoAtlasFlagQuest from "@/components/GeoAtlasFlagQuest";

type View = 'home' | 'continent' | 'country' | 'capital-quest' | 'flag-quest' | 'review' | 'locate-map';

interface Country {
  id: string;
  countryName: string;
  capital: string;
  continent: string;
  flagEmoji: string;
  isoCode: string;
  lat: number;
  lng: number;
  capitalLat: number;
  capitalLng: number;
  memoryHook: string;
  landmarkAnchor: string;
  relatedExplorerCityId?: string;
}

interface ContinentInfo {
  name: string;
  total: number;
  flagPreviews: string[];
}

interface ProgressItem {
  countryId: string;
  status: 'new' | 'learning' | 'remembering' | 'mastered';
  timesSeen: number;
  timesCorrect: number;
  timesIncorrect: number;
  streakCount: number;
  capitalLearned: boolean;
  flagLearned: boolean;
  mapLearned: boolean;
  lastReviewedAt?: string;
  nextReviewAt?: string;
}

interface GeoAtlasProgress {
  totalCountries: number;
  learned: number;
  mastered: number;
  capitalsLearned: number;
  flagsLearned: number;
  mapsLearned: number;
  reviewDue: number;
  progressByCountry: ProgressItem[];
}

interface LearningPack {
  id: string;
  title: string;
  continent: string;
  countryIds: string[];
  packOrder: number;
}

export default function GeoAtlas() {
  const [view, setView] = useState<View>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('continent') ? 'continent' : 'home';
  });
  const [selectedContinent, setSelectedContinent] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('continent') || null;
  });
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);
  const [questCountries, setQuestCountries] = useState<Country[]>([]);
  const [, navigate] = useLocation();
  const geoAtlasReturnTo = new URLSearchParams(window.location.search).get('returnTo');
  const geoAtlasReturnCityId = new URLSearchParams(window.location.search).get('cityId');
  const { activeExplorer } = useExplorer();
  const playerId = activeExplorer?.id;
  const queryClient = useQueryClient();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  // API Queries
  const { data: globalProgress } = useQuery<GeoAtlasProgress>({
    queryKey: ['/api/geoatlas/progress', playerId],
    enabled: !!playerId,
  });

  const { data: continents } = useQuery<ContinentInfo[]>({
    queryKey: ['/api/geoatlas/continents'],
  });

  const { data: continentData } = useQuery<{ countries: Country[], packs: LearningPack[] }>({
    queryKey: ['/api/geoatlas/continents', selectedContinent],
    enabled: !!selectedContinent && ['continent', 'country', 'capital-quest', 'flag-quest'].includes(view),
  });

  const { data: continentProgress } = useQuery<{
    total: number,
    learned: number,
    mastered: number,
    capitalsLearned: number,
    flagsLearned: number,
    progressMap: Record<string, ProgressItem>
  }>({
    queryKey: ['/api/geoatlas/progress', playerId, 'continent', selectedContinent],
    enabled: !!playerId && !!selectedContinent && view === 'continent',
  });

  const { data: selectedCountry } = useQuery<Country>({
    queryKey: ['/api/geoatlas/countries', selectedCountryId],
    enabled: !!selectedCountryId && ['country', 'capital-quest', 'flag-quest', 'locate-map'].includes(view),
  });

  const { data: memorySprint } = useQuery<any[]>({
    queryKey: ['/api/geoatlas/memory-sprint', playerId],
    enabled: !!playerId && view === 'home',
  });

  const { data: reviewQueue } = useQuery<any[]>({
    queryKey: ['/api/geoatlas/review-queue', playerId],
    enabled: !!playerId && view === 'home',
  });

  const { data: recentlyLearned } = useQuery<any[]>({
    queryKey: ['/api/geoatlas/recently-learned', playerId],
    enabled: !!playerId && view === 'home',
  });

  // Mutations
  const learnMutation = useMutation({
    mutationFn: async (countryId: string) => {
      const res = await fetch(`/api/geoatlas/progress/${playerId}/learn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countryId }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/geoatlas/progress', playerId] });
    }
  });

  // TTS helper
  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  };

  const initMapInContainer = useCallback((container: HTMLDivElement | null) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    mapContainerRef.current = container;

    if (!container || view !== 'locate-map' || !selectedCountry) return;

    const L = (window as any).L;
    if (!L) return;

    const capitalLat = selectedCountry.capitalLat || selectedCountry.lat;
    const capitalLng = selectedCountry.capitalLng || selectedCountry.lng;

    container.style.width = '100%';
    container.style.height = '400px';
    container.style.minHeight = '400px';

    const map = L.map(container, {
      center: [capitalLat, capitalLng],
      zoom: 6,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);

    const capitalIcon = L.divIcon({
      className: 'geoatlas-capital-marker',
      html: `<div style="background: #ef4444; border: 3px solid white; border-radius: 50%; width: 20px; height: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    L.marker([capitalLat, capitalLng], { icon: capitalIcon })
      .addTo(map)
      .bindPopup(`<div style="text-align:center;font-family:system-ui;"><b style="font-size:14px;">${selectedCountry.capital}</b><br/><span style="color:#666;font-size:12px;">Capital of ${selectedCountry.countryName} ${selectedCountry.flagEmoji}</span></div>`)
      .openPopup();

    mapInstanceRef.current = map;

    setTimeout(() => map.invalidateSize(), 100);
    setTimeout(() => map.invalidateSize(), 300);
    setTimeout(() => map.invalidateSize(), 600);
  }, [view, selectedCountry?.id]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const handleBack = () => {
    if (view === 'home') {
      if (geoAtlasReturnTo === 'city-hub' && geoAtlasReturnCityId) {
        window.location.href = `/city/${geoAtlasReturnCityId}`;
      } else {
        navigate('/');
      }
    } else if (view === 'continent') {
      if (geoAtlasReturnTo === 'city-hub' && geoAtlasReturnCityId) {
        window.location.href = `/city/${geoAtlasReturnCityId}`;
      } else {
        setView('home');
      }
    }
    else if (view === 'country') setView('continent');
    else if (view === 'locate-map') setView('country');
    else if (['capital-quest', 'flag-quest', 'review'].includes(view)) setView('country');
  };

  const continentBgColors: Record<string, string> = {
    'Africa': 'bg-orange-500',
    'Asia': 'bg-red-500',
    'Europe': 'bg-blue-500',
    'North America': 'bg-green-500',
    'South America': 'bg-yellow-500',
    'Oceania': 'bg-purple-500',
  };

  const continentStrokeColors: Record<string, string> = {
    'Africa': 'stroke-orange-500',
    'Asia': 'stroke-red-500',
    'Europe': 'stroke-blue-500',
    'North America': 'stroke-green-500',
    'South America': 'stroke-yellow-500',
    'Oceania': 'stroke-purple-500',
  };


  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 to-blue-50 p-4 pb-28 md:p-8">
      <div className="max-w-6xl mx-auto">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-2 bg-white rounded-xl shadow-sm">
                      <Globe className="w-8 h-8 text-sky-500" />
                    </div>
                    <h1 className="text-4xl font-black text-slate-800 tracking-tight" data-testid="text-title">GeoAtlas</h1>
                  </div>
                  <p className="text-slate-500 font-medium ml-12">Master the World</p>
                </div>

                {/* Stat Circles */}
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {[
                    { label: "Learned", value: globalProgress?.learned || 0, icon: <BookOpen className="w-4 h-4" /> },
                    { label: "Capitals", value: globalProgress?.capitalsLearned || 0, icon: <Star className="w-4 h-4" /> },
                    { label: "Flags", value: globalProgress?.flagsLearned || 0, icon: <CheckCircle2 className="w-4 h-4" /> },
                  ].map((stat, i) => (
                    <div key={i} className="flex flex-col items-center bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white min-w-[100px]">
                      <div className="text-sky-500 mb-1">{stat.icon}</div>
                      <div className="text-2xl font-bold text-slate-800" data-testid={`stat-${stat.label.toLowerCase()}`}>{stat.value}</div>
                      <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Continue / Start Learning */}
              <section>
                {(() => {
                  const hasProgress = globalProgress && (globalProgress.learned > 0 || globalProgress.mastered > 0);
                  return (
                    <Card className="bg-white/80 backdrop-blur-md border-none shadow-lg overflow-hidden rounded-3xl group">
                      <CardContent className="p-0 flex flex-col md:flex-row">
                        <div className="p-8 flex-1">
                          <Badge className="mb-4 bg-sky-100 text-sky-600 hover:bg-sky-100 border-none font-bold">
                            {hasProgress ? 'RECOMMENDED' : 'GET STARTED'}
                          </Badge>
                          <h2 className="text-3xl font-bold text-slate-800 mb-2">
                            {hasProgress ? 'Continue Learning' : 'Start Learning'}
                          </h2>
                          <p className="text-slate-600 mb-6">
                            {hasProgress 
                              ? "You're making great progress! Jump back into your last pack."
                              : "Pick a continent and start discovering countries, capitals, and flags!"}
                          </p>
                          <Button 
                            onClick={() => {
                              setSelectedContinent('Europe');
                              setView('continent');
                            }}
                            className="bg-sky-500 hover:bg-sky-600 text-white rounded-2xl px-8 h-12 font-bold shadow-lg shadow-sky-200 transition-all group-hover:scale-105"
                            data-testid="button-continue-learning"
                          >
                            {hasProgress ? 'Continue' : 'Start Exploring'} <ArrowRight className="ml-2 w-5 h-5" />
                          </Button>
                        </div>
                        <div className="bg-sky-50 p-8 flex items-center justify-center gap-4 border-l border-white/50">
                          {['🇪🇺', '🇫🇷', '🇩🇪', '🇮🇹'].map((flag, i) => (
                            <div key={i} className="text-4xl shadow-sm bg-white p-3 rounded-2xl transform rotate-3 hover:rotate-0 transition-transform cursor-default">
                              {flag}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}
              </section>

              {/* Memory Sprint */}
              <section>
                 <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  Today's Memory Sprint
                </h3>
                <Card className="bg-gradient-to-r from-amber-400 to-orange-400 border-none shadow-xl rounded-3xl text-white">
                  <CardContent className="p-6 flex items-center justify-between">
                    <div>
                      <h4 className="text-2xl font-bold mb-1">Quick Challenge!</h4>
                      <p className="opacity-90 font-medium">Learn 5 new countries in 7 minutes</p>
                    </div>
                    <Button 
                      variant="secondary" 
                      className="rounded-2xl font-bold bg-white text-orange-500 hover:bg-orange-50"
                      data-testid="button-start-sprint"
                      onClick={() => {
                        if (memorySprint && memorySprint.length > 0) {
                          const countries = memorySprint.map((item: any) => item.country || item);
                          setQuestCountries(countries);
                          setView('capital-quest');
                        } else {
                          toast("No countries available for sprint yet. Explore a continent first!");
                        }
                      }}
                    >
                      Start Sprint
                    </Button>
                  </CardContent>
                </Card>
              </section>

              {/* Continents Grid */}
              <section>
                <h3 className="text-xl font-bold text-slate-800 mb-4">Explore Continents</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {continents?.map((continent) => (
                    <Card 
                      key={continent.name}
                      className="bg-white/80 backdrop-blur-md border-none shadow-md hover:shadow-xl transition-all cursor-pointer rounded-3xl overflow-hidden group"
                      onClick={() => {
                        setSelectedContinent(continent.name);
                        setView('continent');
                      }}
                      data-testid={`card-continent-${continent.name.toLowerCase()}`}
                    >
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className={`w-12 h-12 rounded-2xl ${continentBgColors[continent.name] || 'bg-slate-400'} flex items-center justify-center text-white shadow-lg`}>
                            <Globe className="w-6 h-6" />
                          </div>
                          <div className="flex -space-x-2">
                            {continent.flagPreviews.map((flag, i) => (
                              <div key={i} className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center border-2 border-white text-lg">
                                {flag}
                              </div>
                            ))}
                          </div>
                        </div>
                        <h4 className="text-2xl font-bold text-slate-800 mb-1">{continent.name}</h4>
                        <p className="text-slate-500 text-sm font-medium mb-4">
                          {globalProgress?.progressByCountry.filter(p => p.status === 'mastered').length || 0} / {continent.total} Mastered
                        </p>
                        <Progress value={20} className="h-2 bg-slate-100 rounded-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>

              {/* Bottom Sections */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Review Queue */}
                <section>
                  <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <History className="w-5 h-5 text-sky-500" />
                    Review Queue
                  </h3>
                  <div className="space-y-3">
                    {reviewQueue?.length ? reviewQueue.map((item, i) => (
                      <Card 
                        key={i} 
                        className="bg-white/60 backdrop-blur-sm border-none shadow-sm rounded-2xl hover:bg-white/80 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedContinent(item.country.continent);
                          setSelectedCountryId(item.country.id);
                          setView('country');
                        }}
                        data-testid={`review-item-${item.country.id}`}
                      >
                        <CardContent className="p-4 flex items-center gap-4">
                          <span className="text-3xl">{item.country.flagEmoji}</span>
                          <div className="flex-1">
                            <h5 className="font-bold text-slate-800">{item.country.countryName}</h5>
                            <p className="text-xs text-slate-500 font-medium">Due for review</p>
                          </div>
                          <Button size="sm" variant="ghost" className="rounded-xl">Review</Button>
                        </CardContent>
                      </Card>
                    )) : (
                      <p className="text-slate-400 text-center py-8 font-medium">Your review queue is clear! 🌟</p>
                    )}
                  </div>
                </section>

                {/* Recently Learned */}
                <section>
                  <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    Recently Learned
                  </h3>
                  <div className="space-y-3">
                    {recentlyLearned?.length ? recentlyLearned.map((item, i) => (
                      <Card key={i} className="bg-white/60 backdrop-blur-sm border-none shadow-sm rounded-2xl">
                        <CardContent className="p-4 flex items-center gap-4">
                          <span className="text-3xl">{item.country.flagEmoji}</span>
                          <div className="flex-1">
                            <h5 className="font-bold text-slate-800">{item.country.countryName}</h5>
                            <p className="text-xs text-slate-500 font-medium">Learned {new Date(item.updatedAt).toLocaleDateString()}</p>
                          </div>
                          <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200 uppercase text-[10px] font-bold">
                            {item.status}
                          </Badge>
                        </CardContent>
                      </Card>
                    )) : (
                      <p className="text-slate-400 text-center py-8 font-medium">Start learning to see your progress here!</p>
                    )}
                  </div>
                </section>
              </div>
            </motion.div>
          )}

          {view === 'continent' && (
            <motion.div 
              key="continent"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <Button 
                variant="ghost" 
                onClick={handleBack} 
                className="mb-4 text-slate-600 hover:text-sky-500 font-bold -ml-2"
                data-testid="button-back-home"
              >
                <ChevronLeft className="mr-1 w-5 h-5" /> {geoAtlasReturnTo === 'city-hub' ? '🏙️ Back to City' : 'Back to Home'}
              </Button>

              {/* Continent Header */}
              <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 border border-white shadow-xl flex flex-col md:flex-row items-center gap-8">
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="64" cy="64" r="58" className="stroke-slate-100 fill-none stroke-[12]" />
                    <circle 
                      cx="64" cy="64" r="58" 
                      className={`fill-none stroke-[12] transition-all duration-1000 ${selectedContinent ? continentStrokeColors[selectedContinent] : 'stroke-sky-500'}`}
                      style={{ 
                        strokeDasharray: 364.4, 
                        strokeDashoffset: 364.4 * (1 - (continentProgress?.mastered || 0) / (continentProgress?.total || 1)) 
                      }}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-slate-800">{Math.round(((continentProgress?.mastered || 0) / (continentProgress?.total || 1)) * 100)}%</span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Mastery</span>
                  </div>
                </div>

                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-4xl font-black text-slate-800 mb-2">{selectedContinent}</h2>
                  <div className="flex flex-wrap justify-center md:justify-start gap-4">
                    <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl">
                      <Globe className="w-4 h-4 text-slate-400" />
                      <span className="font-bold text-slate-700">{continentProgress?.total} Countries</span>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl">
                      <Star className="w-4 h-4 text-amber-500" />
                      <span className="font-bold text-slate-700">{continentProgress?.capitalsLearned} Capitals</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Learning Packs */}
              <section>
                <h3 className="text-xl font-bold text-slate-800 mb-4">Learning Packs</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {continentData?.packs.map((pack) => (
                    <Card key={pack.id} className="bg-white/80 border-none shadow-md rounded-2xl overflow-hidden hover:shadow-lg transition-all">
                      <CardContent className="p-6 flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-slate-800 text-lg">{pack.title}</h4>
                          <p className="text-sm text-slate-500 font-medium">{pack.countryIds.length} Countries • 0% Complete</p>
                        </div>
                        <Button 
                          className="rounded-xl bg-sky-500 hover:bg-sky-600 font-bold shadow-lg shadow-sky-100"
                          data-testid={`button-start-pack-${pack.packOrder}`}
                          onClick={() => {
                            const packCountries = continentData?.countries.filter(c => pack.countryIds.includes(c.id)) || [];
                            if (packCountries.length > 0) {
                              setQuestCountries(packCountries);
                              setView('capital-quest');
                            }
                          }}
                        >Start</Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>

              {/* Country Grid */}
              <section>
                <h3 className="text-xl font-bold text-slate-800 mb-4">Country Gallery</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {continentData?.countries.map((country) => {
                    const prog = continentProgress?.progressMap[country.id];
                    const statusColors = {
                      'new': 'bg-slate-100 text-slate-400',
                      'learning': 'bg-blue-100 text-blue-600',
                      'remembering': 'bg-amber-100 text-amber-600',
                      'mastered': 'bg-green-100 text-green-600'
                    };

                    return (
                      <Card 
                        key={country.id}
                        className="bg-white/80 border-none shadow-sm rounded-2xl hover:shadow-md cursor-pointer group transition-all"
                        onClick={() => {
                          setSelectedCountryId(country.id);
                          setView('country');
                          if (!prog) learnMutation.mutate(country.id);
                        }}
                        data-testid={`card-country-${country.id}`}
                      >
                        <CardContent className="p-4 flex flex-col items-center text-center">
                          <div className="relative mb-3">
                            <span className="text-5xl group-hover:scale-110 transition-transform inline-block">{country.flagEmoji}</span>
                            {prog?.status === 'mastered' && (
                              <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-1 border-2 border-white">
                                <CheckCircle2 className="w-3 h-3" />
                              </div>
                            )}
                          </div>
                          <h5 className="font-bold text-slate-800 text-sm line-clamp-1">{country.countryName}</h5>
                          <Badge variant="outline" className={`mt-2 uppercase text-[8px] font-black border-none ${statusColors[prog?.status || 'new']}`}>
                            {prog?.status || 'New'}
                          </Badge>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            </motion.div>
          )}

          {view === 'country' && selectedCountry && (
            <motion.div 
              key="country"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-3xl mx-auto space-y-6"
            >
              <Button 
                variant="ghost" 
                onClick={handleBack} 
                className="mb-2 text-slate-600 hover:text-sky-500 font-bold -ml-2"
                data-testid="button-back-continent"
              >
                <ChevronLeft className="mr-1 w-5 h-5" /> Back to {selectedContinent}
              </Button>

              <div className="bg-white/80 backdrop-blur-md rounded-[2.5rem] border border-white shadow-2xl p-8 text-center space-y-6">
                <div className="space-y-2">
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="text-[8rem] leading-none mb-4 drop-shadow-xl"
                  >
                    {selectedCountry.flagEmoji}
                  </motion.div>
                  <div className="flex items-center justify-center gap-3">
                    <h2 className="text-4xl font-black text-slate-800 tracking-tight">{selectedCountry.countryName}</h2>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="rounded-full h-8 w-8 text-sky-400"
                      onClick={() => speak(selectedCountry.countryName)}
                    >
                      <Volume2 className="w-5 h-5" />
                    </Button>
                  </div>
                  <Badge className="bg-sky-100 text-sky-600 hover:bg-sky-100 border-none font-bold uppercase tracking-wider text-[10px] px-4 py-1">
                    {selectedCountry.continent}
                  </Badge>
                </div>

                {/* Core Learning Block */}
                <Card className="bg-sky-50 border-none rounded-3xl overflow-hidden">
                  <CardContent className="p-8">
                    <div className="flex items-center justify-center gap-3 mb-2">
                      <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
                      <h3 className="text-3xl font-black text-slate-700 tracking-tight">{selectedCountry.capital}</h3>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="rounded-full h-8 w-8 text-slate-400"
                        onClick={() => speak(selectedCountry.capital)}
                      >
                        <Volume2 className="w-5 h-5" />
                      </Button>
                    </div>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mb-6">Capital City</p>
                    
                    <div className="bg-white/60 p-6 rounded-2xl italic text-slate-600 font-medium leading-relaxed border border-white/50 shadow-inner">
                      "{selectedCountry.memoryHook}"
                    </div>
                  </CardContent>
                </Card>

                {/* Practice Buttons */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button 
                    variant="outline" 
                    className="h-16 rounded-2xl border-2 border-slate-100 bg-white hover:bg-slate-50 hover:border-sky-200 text-slate-700 font-bold transition-all shadow-sm"
                    onClick={() => setView('capital-quest')}
                    data-testid="button-practice-capital"
                  >
                    <Star className="mr-2 w-5 h-5 text-amber-500" /> Practice Capital
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-16 rounded-2xl border-2 border-slate-100 bg-white hover:bg-slate-50 hover:border-sky-200 text-slate-700 font-bold transition-all shadow-sm"
                    onClick={() => setView('flag-quest')}
                    data-testid="button-practice-flag"
                  >
                    <LayoutGrid className="mr-2 w-5 h-5 text-sky-500" /> Practice Flag
                  </Button>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <Button 
                    variant="ghost" 
                    className="w-full text-sky-500 font-bold gap-2 hover:bg-sky-50 rounded-2xl h-12"
                    onClick={() => setView('locate-map')}
                    data-testid="button-locate-map"
                  >
                    <MapPin className="w-5 h-5" /> Locate on Map
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full text-slate-400 font-bold text-xs mt-2"
                    onClick={() => navigate(`/explorer-map?continent=${encodeURIComponent(selectedCountry.continent)}`)}
                    data-testid="button-explore-map"
                  >
                    Explore on Explorer Map
                  </Button>
                </div>
              </div>

              {/* Stats Card */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Continent", value: selectedCountry.continent },
                  { label: "Capital", value: selectedCountry.capital },
                  { label: "ISO Code", value: selectedCountry.isoCode },
                ].filter(s => s.value).map((stat, i) => (
                  <Card key={i} className="bg-white/60 backdrop-blur-md border-none rounded-2xl shadow-sm p-4 text-center">
                    <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">{stat.label}</div>
                    <div className="font-bold text-slate-700 text-sm truncate">{stat.value}</div>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {view === 'capital-quest' && playerId && (
            <motion.div key="capital-quest" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <GeoAtlasCapitalQuest
                countries={questCountries.length > 0 ? questCountries : (continentData?.countries?.slice(0, 5) || (selectedCountry ? [selectedCountry] : []))}
                playerId={playerId}
                onComplete={() => { 
                  const returnTo = questCountries.length > 0 && !selectedCountryId ? 'home' : 'country';
                  setQuestCountries([]);
                  setView(returnTo); 
                  queryClient.invalidateQueries({ queryKey: ['/api/geoatlas/progress'] }); 
                }}
                onBack={() => { 
                  const returnTo = questCountries.length > 0 && !selectedCountryId ? 'home' : 'country';
                  setQuestCountries([]);
                  setView(returnTo); 
                }}
              />
            </motion.div>
          )}

          {view === 'flag-quest' && selectedCountry && playerId && (
            <motion.div key="flag-quest" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <GeoAtlasFlagQuest
                countries={continentData?.countries?.slice(0, 5) || [selectedCountry]}
                playerId={playerId}
                onComplete={() => { setView('country'); queryClient.invalidateQueries({ queryKey: ['/api/geoatlas/progress'] }); }}
                onBack={() => setView('country')}
              />
            </motion.div>
          )}

          {view === 'locate-map' && selectedCountry && (
            <motion.div key="locate-map" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto space-y-4">
              <Button 
                variant="ghost" 
                onClick={handleBack} 
                className="mb-2 text-slate-600 hover:text-sky-500 font-bold -ml-2"
                data-testid="button-back-from-map"
              >
                <ChevronLeft className="mr-1 w-5 h-5" /> Back to {selectedCountry.countryName}
              </Button>

              <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-white shadow-xl">
                <div className="p-4 flex items-center gap-3 border-b border-slate-100">
                  <span className="text-4xl">{selectedCountry.flagEmoji}</span>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">{selectedCountry.countryName}</h2>
                    <p className="text-sm text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {selectedCountry.capital}
                    </p>
                  </div>
                </div>
                <div 
                  ref={initMapInContainer} 
                  style={{ width: '100%', height: '400px', minHeight: '400px', borderRadius: '0 0 1.5rem 1.5rem' }}
                  data-testid="locate-map-container"
                />
              </div>

              <Card className="bg-white/60 backdrop-blur-md border-none rounded-2xl shadow-sm">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-slate-600 italic">"{selectedCountry.memoryHook}"</p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {view === 'review' && playerId && (
            <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto py-8 text-center space-y-6">
              <div className="bg-white p-12 rounded-[2.5rem] shadow-xl border border-white">
                <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Trophy className="w-10 h-10 text-amber-500" />
                </div>
                <h2 className="text-3xl font-black text-slate-800 mb-2">Review Queue</h2>
                <p className="text-slate-600 mb-8 font-medium">Practice countries due for review</p>
                <Button variant="ghost" className="font-bold text-slate-400" onClick={handleBack} data-testid="button-review-back">Go Back</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
