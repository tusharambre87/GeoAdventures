import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MapPin, Star, Camera, Map, BookOpen, MoreVertical, Trash2, Edit, Clock, Brain, Video, Image, FileText, Compass, Check, Lock, Home, X, ScanEye, Sparkles } from "lucide-react";
import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import type { TravelTrip, TravelStop } from "@shared/schema";
import { getTravelAvatarForTrip, getDestinationIcon } from "@/lib/travelAvatars";
import { useDestinationWeather } from "@/hooks/useDestinationWeather";
import { getAdventureMode, isHomeAdventure } from "@/lib/adventureModeUtils";
import { getAdventureCityImage } from "@/lib/adventureImages";
import { useOnDemandCityImage } from "@/hooks/useOnDemandAdventureImage";
import { useStopImages } from "@/hooks/useStopImages";

interface TravelTripCardProps {
  trip: TravelTrip;
  stops?: TravelStop[];
  keepsakeEmojis?: string[];
  onSelect: (tripId: string) => void;
  onJourneyPacks: (tripId: string) => void;
  onSaveMoment: (tripId: string) => void;
  onViewMap: (tripId: string) => void;
  onDelete: (trip: { id: string; name: string }) => void;
  onEdit?: (tripId: string) => void;
  onTrailTales?: (tripId: string) => void;
  onViewStory?: (tripId: string) => void;
  onViewVideo?: (tripId: string) => void;
  onViewCollage?: (tripId: string) => void;
  onAdventureRecap?: (tripId: string) => void;
  trailTalesAvailable?: boolean;
  hasStory?: boolean;
  hasVideo?: boolean;
  hasCollage?: boolean;
  lastMomentText?: string;
  firstMomentPhotoUrl?: string | null;
  index?: number;
  isSelected?: boolean;
  isActiveAdventure?: boolean;
}

const DESTINATION_STOCK_IMAGES: Record<string, string> = {
  hawaii: "https://images.unsplash.com/photo-1507876466758-bc54f384809c?w=800&h=400&fit=crop",
  sydney: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&h=400&fit=crop",
  paris: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&h=400&fit=crop",
  london: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&h=400&fit=crop",
  tokyo: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&h=400&fit=crop",
  newyork: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&h=400&fit=crop",
  rome: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&h=400&fit=crop",
  dubai: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&h=400&fit=crop",
  beach: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=400&fit=crop",
  mountain: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=400&fit=crop",
  nature: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=400&fit=crop",
  city: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800&h=400&fit=crop",
  florida: "https://images.unsplash.com/photo-1605723517503-3cadb5818a0c?w=800&h=400&fit=crop",
  disney: "https://images.unsplash.com/photo-1597466599360-3b9775841aec?w=800&h=400&fit=crop",
  orlando: "https://images.unsplash.com/photo-1597466599360-3b9775841aec?w=800&h=400&fit=crop",
  seattle: "https://images.unsplash.com/photo-1502175353174-a7a70e73b362?w=800&h=400&fit=crop",
  singapore: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800&h=400&fit=crop",
  barcelona: "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800&h=400&fit=crop",
  amsterdam: "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=800&h=400&fit=crop",
  losangeles: "https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=800&h=400&fit=crop",
  sanfrancisco: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&h=400&fit=crop",
  chicago: "https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=800&h=400&fit=crop",
  vegas: "https://images.unsplash.com/photo-1605833556294-ea5c7a74f57d?w=800&h=400&fit=crop",
  miami: "https://images.unsplash.com/photo-1535498730771-e735b998cd64?w=800&h=400&fit=crop",
  boston: "https://images.unsplash.com/photo-1501979376754-2ff867a4f659?w=800&h=400&fit=crop",
  washington: "https://images.unsplash.com/photo-1617581629397-a72507c3de9e?w=800&h=400&fit=crop",
  denver: "https://images.unsplash.com/photo-1619856699906-09e1f58c98b1?w=800&h=400&fit=crop",
  cancun: "https://images.unsplash.com/photo-1510097467424-192d713fd8b2?w=800&h=400&fit=crop",
  mexico: "https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?w=800&h=400&fit=crop",
  canada: "https://images.unsplash.com/photo-1517935706615-2717063c2225?w=800&h=400&fit=crop",
  india: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&h=400&fit=crop",
  australia: "https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=800&h=400&fit=crop",
  china: "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=800&h=400&fit=crop",
  japan: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&h=400&fit=crop",
  korea: "https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=800&h=400&fit=crop",
  thailand: "https://images.unsplash.com/photo-1528181304800-259b08848526?w=800&h=400&fit=crop",
  bali: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&h=400&fit=crop",
  greece: "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=800&h=400&fit=crop",
  spain: "https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=800&h=400&fit=crop",
  italy: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=800&h=400&fit=crop",
  germany: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=800&h=400&fit=crop",
  france: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800&h=400&fit=crop",
  uk: "https://images.unsplash.com/photo-1486299267070-83823f5448dd?w=800&h=400&fit=crop",
  brazil: "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&h=400&fit=crop",
  argentina: "https://images.unsplash.com/photo-1612294037637-ec328d0e075e?w=800&h=400&fit=crop",
  egypt: "https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=800&h=400&fit=crop",
  safari: "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&h=400&fit=crop",
  africa: "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800&h=400&fit=crop",
  cruise: "https://images.unsplash.com/photo-1548574505-5e239809ee19?w=800&h=400&fit=crop",
  omaha: "https://images.unsplash.com/photo-1506953823976-52e1fdc0149a?w=800&h=400&fit=crop",
  nashville: "https://images.unsplash.com/photo-1549451371-64aa98a6f660?w=800&h=400&fit=crop",
  portland: "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=800&h=400&fit=crop",
  phoenix: "https://images.unsplash.com/photo-1558645836-e44122a743ee?w=800&h=400&fit=crop",
  dallas: "https://images.unsplash.com/photo-1545194445-dddb8f4487c6?w=800&h=400&fit=crop",
  atlanta: "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=800&h=400&fit=crop",
  minneapolis: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&h=400&fit=crop",
  sanantonio: "https://images.unsplash.com/photo-1531218150217-54595bc2b934?w=800&h=400&fit=crop",
  austin: "https://images.unsplash.com/photo-1531218150217-54595bc2b934?w=800&h=400&fit=crop",
  houston: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800&h=400&fit=crop",
  philadelphia: "https://images.unsplash.com/photo-1569761316261-9a8696fa2ca3?w=800&h=400&fit=crop",
  pittsburgh: "https://images.unsplash.com/photo-1555424681-b0ecf4fe19a5?w=800&h=400&fit=crop",
  newOrleans: "https://images.unsplash.com/photo-1568402102990-bc541580b59f?w=800&h=400&fit=crop",
  stLouis: "/city-images/st-louis.jpg",
  default: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&h=400&fit=crop",
};

export function getStockImageForDestination(city?: string | null, country?: string, destination?: string): string {
  const illustratedCity = getAdventureCityImage(city, destination);
  if (illustratedCity) return illustratedCity;

  const searchText = `${city || ''} ${country || ''} ${destination || ''}`.toLowerCase();
  
  if (searchText.includes('disney') || searchText.includes('magic kingdom') || searchText.includes('epcot')) return DESTINATION_STOCK_IMAGES.disney;
  if (searchText.includes('orlando')) return DESTINATION_STOCK_IMAGES.orlando;
  if (searchText.includes('florida') || searchText.includes('miami')) return DESTINATION_STOCK_IMAGES.florida;
  if (searchText.includes('seattle') || searchText.includes('washington') && searchText.includes('state')) return DESTINATION_STOCK_IMAGES.seattle;
  if (searchText.includes('singapore')) return DESTINATION_STOCK_IMAGES.singapore;
  if (searchText.includes('hawaii') || searchText.includes('big island') || searchText.includes('maui') || searchText.includes('oahu')) return DESTINATION_STOCK_IMAGES.hawaii;
  if (searchText.includes('sydney') || searchText.includes('melbourne')) return DESTINATION_STOCK_IMAGES.sydney;
  if (searchText.includes('paris')) return DESTINATION_STOCK_IMAGES.paris;
  if (searchText.includes('london') || searchText.includes('uk') || searchText.includes('united kingdom') || searchText.includes('england')) return DESTINATION_STOCK_IMAGES.london;
  if (searchText.includes('tokyo') || searchText.includes('osaka') || searchText.includes('kyoto')) return DESTINATION_STOCK_IMAGES.tokyo;
  if (searchText.includes('new york') || searchText.includes('nyc') || searchText.includes('manhattan')) return DESTINATION_STOCK_IMAGES.newyork;
  if (searchText.includes('rome') || searchText.includes('venice') || searchText.includes('florence') || searchText.includes('italy')) return DESTINATION_STOCK_IMAGES.rome;
  if (searchText.includes('dubai') || searchText.includes('abu dhabi') || searchText.includes('uae')) return DESTINATION_STOCK_IMAGES.dubai;
  if (searchText.includes('barcelona') || searchText.includes('madrid') || searchText.includes('spain')) return DESTINATION_STOCK_IMAGES.barcelona;
  if (searchText.includes('amsterdam') || searchText.includes('netherlands') || searchText.includes('holland')) return DESTINATION_STOCK_IMAGES.amsterdam;
  if (searchText.includes('los angeles') || searchText.includes('la') || searchText.includes('hollywood')) return DESTINATION_STOCK_IMAGES.losangeles;
  if (searchText.includes('san francisco') || searchText.includes('sf') || searchText.includes('golden gate')) return DESTINATION_STOCK_IMAGES.sanfrancisco;
  if (searchText.includes('chicago')) return DESTINATION_STOCK_IMAGES.chicago;
  if (searchText.includes('vegas') || searchText.includes('las vegas')) return DESTINATION_STOCK_IMAGES.vegas;
  if (searchText.includes('miami')) return DESTINATION_STOCK_IMAGES.miami;
  if (searchText.includes('boston')) return DESTINATION_STOCK_IMAGES.boston;
  if (searchText.includes('washington') || searchText.includes('dc') || searchText.includes('capitol')) return DESTINATION_STOCK_IMAGES.washington;
  if (searchText.includes('denver') || searchText.includes('colorado')) return DESTINATION_STOCK_IMAGES.denver;
  if (searchText.includes('cancun') || searchText.includes('riviera maya')) return DESTINATION_STOCK_IMAGES.cancun;
  if (searchText.includes('mexico')) return DESTINATION_STOCK_IMAGES.mexico;
  if (searchText.includes('canada') || searchText.includes('toronto') || searchText.includes('vancouver')) return DESTINATION_STOCK_IMAGES.canada;
  if (searchText.includes('india') || searchText.includes('mumbai') || searchText.includes('delhi') || searchText.includes('bangalore')) return DESTINATION_STOCK_IMAGES.india;
  if (searchText.includes('australia')) return DESTINATION_STOCK_IMAGES.australia;
  if (searchText.includes('china') || searchText.includes('beijing') || searchText.includes('shanghai')) return DESTINATION_STOCK_IMAGES.china;
  if (searchText.includes('japan')) return DESTINATION_STOCK_IMAGES.japan;
  if (searchText.includes('korea') || searchText.includes('seoul')) return DESTINATION_STOCK_IMAGES.korea;
  if (searchText.includes('thailand') || searchText.includes('bangkok') || searchText.includes('phuket')) return DESTINATION_STOCK_IMAGES.thailand;
  if (searchText.includes('bali') || searchText.includes('indonesia')) return DESTINATION_STOCK_IMAGES.bali;
  if (searchText.includes('greece') || searchText.includes('santorini') || searchText.includes('athens')) return DESTINATION_STOCK_IMAGES.greece;
  if (searchText.includes('germany') || searchText.includes('berlin') || searchText.includes('munich')) return DESTINATION_STOCK_IMAGES.germany;
  if (searchText.includes('france')) return DESTINATION_STOCK_IMAGES.france;
  if (searchText.includes('brazil') || searchText.includes('rio')) return DESTINATION_STOCK_IMAGES.brazil;
  if (searchText.includes('argentina') || searchText.includes('buenos aires')) return DESTINATION_STOCK_IMAGES.argentina;
  if (searchText.includes('egypt') || searchText.includes('cairo') || searchText.includes('pyramid')) return DESTINATION_STOCK_IMAGES.egypt;
  if (searchText.includes('safari') || searchText.includes('kenya') || searchText.includes('tanzania')) return DESTINATION_STOCK_IMAGES.safari;
  if (searchText.includes('africa')) return DESTINATION_STOCK_IMAGES.africa;
  if (searchText.includes('cruise') || searchText.includes('caribbean')) return DESTINATION_STOCK_IMAGES.cruise;
  if (searchText.includes('omaha') || searchText.includes('nebraska')) return DESTINATION_STOCK_IMAGES.omaha;
  if (searchText.includes('nashville') || searchText.includes('tennessee')) return DESTINATION_STOCK_IMAGES.nashville;
  if (searchText.includes('portland') || searchText.includes('oregon')) return DESTINATION_STOCK_IMAGES.portland;
  if (searchText.includes('phoenix') || searchText.includes('arizona')) return DESTINATION_STOCK_IMAGES.phoenix;
  if (searchText.includes('dallas') || searchText.includes('fort worth')) return DESTINATION_STOCK_IMAGES.dallas;
  if (searchText.includes('atlanta') || searchText.includes('georgia')) return DESTINATION_STOCK_IMAGES.atlanta;
  if (searchText.includes('minneapolis') || searchText.includes('minnesota')) return DESTINATION_STOCK_IMAGES.minneapolis;
  if (searchText.includes('san antonio')) return DESTINATION_STOCK_IMAGES.sanantonio;
  if (searchText.includes('austin') || searchText.includes('texas')) return DESTINATION_STOCK_IMAGES.austin;
  if (searchText.includes('houston')) return DESTINATION_STOCK_IMAGES.houston;
  if (searchText.includes('philadelphia') || searchText.includes('philly')) return DESTINATION_STOCK_IMAGES.philadelphia;
  if (searchText.includes('pittsburgh') || searchText.includes('pennsylvania')) return DESTINATION_STOCK_IMAGES.pittsburgh;
  if (searchText.includes('new orleans') || searchText.includes('nola') || searchText.includes('louisiana')) return DESTINATION_STOCK_IMAGES.newOrleans;
  if (searchText.includes('st louis') || searchText.includes('st. louis') || searchText.includes('saint louis') || searchText.includes('missouri')) return DESTINATION_STOCK_IMAGES.stLouis;
  if (searchText.includes('beach') || searchText.includes('island') || searchText.includes('resort')) return DESTINATION_STOCK_IMAGES.beach;
  if (searchText.includes('mountain') || searchText.includes('alps') || searchText.includes('ski')) return DESTINATION_STOCK_IMAGES.mountain;
  if (searchText.includes('park') || searchText.includes('forest') || searchText.includes('nature') || searchText.includes('camping')) return DESTINATION_STOCK_IMAGES.nature;
  
  const genericCityImages = [
    "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&h=400&fit=crop",
    "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&h=400&fit=crop",
    "https://images.unsplash.com/photo-1514924013411-cbf25faa35bb?w=800&h=400&fit=crop",
    "https://images.unsplash.com/photo-1444723121867-7a241cacace9?w=800&h=400&fit=crop",
    "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=800&h=400&fit=crop",
    "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&h=400&fit=crop",
    "https://images.unsplash.com/photo-1517935706615-2717063c2225?w=800&h=400&fit=crop",
    "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&h=400&fit=crop",
  ];
  const cityName = (city || destination || '').trim();
  if (cityName) {
    let hash = 0;
    for (let i = 0; i < cityName.length; i++) {
      hash = ((hash << 5) - hash) + cityName.charCodeAt(i);
      hash |= 0;
    }
    return genericCityImages[Math.abs(hash) % genericCityImages.length];
  }
  
  return DESTINATION_STOCK_IMAGES.default;
}

function getMonthName(month?: number | null): string {
  if (!month || month < 1 || month > 12) return '';
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return months[month - 1];
}

export function TripPreviewModal({
  trip,
  stops,
  onClose,
  loading = false,
}: {
  trip: TravelTrip;
  stops: TravelStop[];
  onClose: () => void;
  loading?: boolean;
}) {
  const cityName = trip.city || trip.destination;
  const aiImages = useStopImages(stops, cityName);
  const [imgLoadedMap, setImgLoadedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const generatingCount = stops.filter(s => aiImages[s.id]?.status === "loading").length;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="preview-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex flex-col justify-end"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 26, stiffness: 280 }}
          className="relative bg-white rounded-t-3xl overflow-hidden"
          style={{ maxHeight: "92dvh" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">{trip.name || trip.destination}</h2>
              {loading && stops.length === 0 ? (
                <p className="text-sm text-gray-500">Loading stops…</p>
              ) : generatingCount > 0 ? (
                <p className="text-sm text-orange-500 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  Creating illustrated scenes…
                </p>
              ) : (
                <p className="text-sm text-gray-500">{stops.length} stop{stops.length !== 1 ? "s" : ""} on this adventure</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
              data-testid="button-close-trip-preview"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: "calc(92dvh - 80px)" }}>
            <div className="px-4 py-4 space-y-4 pb-8">
              {stops.map((stop, idx) => {
                const entry = aiImages[stop.id];
                const isLoading = !entry || entry.status === "loading";
                const imagePath = entry?.imagePath ?? null;
                const imgLoaded = imgLoadedMap[stop.id] ?? false;

                return (
                  <motion.div
                    key={stop.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="rounded-2xl overflow-hidden shadow-md bg-gray-100"
                  >
                    <div className="relative" style={{ height: 220 }}>
                      {/* Shimmer skeleton shown while AI image is generating or loading */}
                      {(isLoading || (!imgLoaded && imagePath)) && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 via-orange-100 to-amber-200 animate-pulse">
                          {isLoading && (
                            <>
                              <Sparkles className="w-8 h-8 text-orange-400 mb-2" />
                              <p className="text-xs text-orange-500 font-medium px-4 text-center">Creating illustration for {stop.name}…</p>
                            </>
                          )}
                        </div>
                      )}

                      {/* AI-generated illustrated image — fades in when loaded */}
                      {imagePath && (
                        <img
                          src={imagePath}
                          alt={stop.name}
                          className="w-full h-full object-cover"
                          style={{
                            opacity: imgLoaded ? 1 : 0,
                            transition: "opacity 0.6s ease",
                          }}
                          onLoad={() => setImgLoadedMap(prev => ({ ...prev, [stop.id]: true }))}
                          onError={() => setImgLoadedMap(prev => ({ ...prev, [stop.id]: true }))}
                        />
                      )}

                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                            {idx + 1}
                          </span>
                          <p className="text-white font-semibold text-base leading-snug drop-shadow">{stop.name}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              {stops.length === 0 && (
                <div className="py-16 text-center text-gray-400">
                  {loading ? (
                    <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto" />
                  ) : (
                    <>
                      <p className="text-4xl mb-2">🗺️</p>
                      <p className="text-sm">No stops added yet</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

export function TravelTripCard({
  trip,
  stops = [],
  keepsakeEmojis = [],
  onSelect,
  onJourneyPacks,
  onSaveMoment,
  onViewMap,
  onDelete,
  onEdit,
  onTrailTales,
  onViewStory,
  onViewVideo,
  onViewCollage,
  onAdventureRecap,
  trailTalesAvailable = false,
  hasStory = false,
  hasVideo = false,
  hasCollage = false,
  lastMomentText,
  firstMomentPhotoUrl,
  index = 0,
  isSelected = false,
  isActiveAdventure = false,
}: TravelTripCardProps) {
  const menuActionRef = useRef(false);
  const [showPreview, setShowPreview] = useState(false);
  const { weather } = useDestinationWeather(trip.city, trip.country, trip.destination);
  
  const totalStops = stops.length;
  const exploredStops = stops.filter(s => s.isVisited).length;
  const isCompleted = trip.status === "completed" || trip.isLocked;
  const hasRecapAvailable = trip.isLocked === true;
  
  // Adventure mode and capabilities
  const adventureMode = getAdventureMode(trip);
  const { isHome, capabilities, theme, language } = adventureMode;
  
  const { image: onDemandCityImg } = useOnDemandCityImage(trip.city, trip.country);
  const stockImage = getStockImageForDestination(trip.city, trip.country, trip.destination);
  const heroImage = firstMomentPhotoUrl || onDemandCityImg || stockImage;
  const monthDisplay = getMonthName(trip.travelMonth);
  
  const displayKeepsakes = keepsakeEmojis.length > 0 
    ? keepsakeEmojis.slice(0, 3) 
    : ['🏝️', '🐚', '🌺'].slice(0, Math.min(exploredStops, 3));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.25 }}
    >
      <Card 
        className={`shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer ${
          isHome 
            ? 'bg-teal-50 dark:bg-teal-950/30 border-2 border-teal-200 dark:border-teal-800' 
            : 'bg-white dark:bg-slate-800'
        } ${isSelected ? (isHome ? 'ring-2 ring-teal-400' : 'ring-2 ring-orange-400') : ''}`}
        onClick={(e) => {
          if (menuActionRef.current) {
            menuActionRef.current = false;
            return;
          }
          onSelect(trip.id);
        }}
        data-testid={`card-adventure-${trip.id}`}
      >
        <div className="relative h-40 overflow-hidden">
          <img 
            src={heroImage} 
            alt={trip.destination}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src !== DESTINATION_STOCK_IMAGES.default) {
                target.src = DESTINATION_STOCK_IMAGES.default;
              }
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          
          <div className="absolute bottom-3 left-3 right-12">
            <h4 className="font-bold text-lg text-white drop-shadow-lg truncate" data-testid={`text-adventure-name-${trip.id}`}>
              {trip.name}
            </h4>
            <div className="flex items-center gap-2 text-white/90 text-sm">
              <MapPin className="w-3.5 h-3.5" />
              <span className="truncate">{trip.destination}</span>
              {monthDisplay && (
                <>
                  <span className="text-white/60">•</span>
                  <span>{monthDisplay}</span>
                </>
              )}
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-8 w-8 text-white bg-black/20 hover:bg-black/40">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && !trip.isLocked && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(trip.id); }}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Adventure
                </DropdownMenuItem>
              )}
              {/* Story/Video/Collage - only for Travel adventures */}
              {!isHome && onViewStory && (
                <DropdownMenuItem onSelect={(e) => { 
                  e.preventDefault();
                  menuActionRef.current = true;
                  onViewStory(trip.id); 
                }}>
                  <FileText className="w-4 h-4 mr-2" />
                  {hasStory ? "View Our Story" : "Create Story"}
                </DropdownMenuItem>
              )}
              {!isHome && onViewVideo && (
                <DropdownMenuItem onSelect={(e) => { 
                  e.preventDefault();
                  menuActionRef.current = true;
                  onViewVideo(trip.id); 
                }}>
                  <Video className="w-4 h-4 mr-2" />
                  {hasVideo ? "View Video" : "Make Video"}
                </DropdownMenuItem>
              )}
              {!isHome && onViewCollage && (
                <DropdownMenuItem onSelect={(e) => { 
                  e.preventDefault();
                  menuActionRef.current = true;
                  onViewCollage(trip.id); 
                }}>
                  <Image className="w-4 h-4 mr-2" />
                  {hasCollage ? "View Collage" : "Make Collage"}
                </DropdownMenuItem>
              )}
              {stops.length > 0 && (
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    menuActionRef.current = true;
                    setShowPreview(true);
                  }}
                  data-testid="button-preview-trip"
                >
                  <ScanEye className="w-4 h-4 mr-2" />
                  Preview My Trip
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onDelete({ id: trip.id, name: trip.name || trip.destination }); }}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Adventure
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {trip.isLocked && (
            <div className="absolute top-2 left-2 bg-amber-500 text-white px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Archived
            </div>
          )}
          
          {/* Active Adventure badge - shows for currently active adventure */}
          {isActiveAdventure && !trip.isLocked && (
            <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 shadow-md">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              Active
            </div>
          )}
          
          {/* At-Home badge - only show if not active and not locked */}
          {isHome && !trip.isLocked && !isActiveAdventure && (
            <div className="absolute top-2 left-2 bg-teal-500 text-white px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
              <Home className="w-3 h-3" />
              At-Home
            </div>
          )}
        </div>

        <CardContent className="p-4 space-y-3">
          {weather && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {trip.destination.split(',')[0]}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {weather.localTime}
              </span>
              <span className="flex items-center gap-1">
                {weather.weatherEmoji} {weather.temperature}{weather.temperatureUnit}
              </span>
            </div>
          )}

          {!isCompleted ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Compass className={`w-4 h-4 ${isHome ? 'text-teal-500' : 'text-orange-500'}`} />
                <span className="text-slate-700 dark:text-slate-300">
                  {totalStops > 0 
                    ? `${exploredStops} of ${totalStops} places ${language.stopsProgress}`
                    : isHome ? "Start exploring!" : "Start your adventure!"}
                </span>
              </div>
              
              {/* Travel Keepsakes - only for Travel adventures */}
              {!isHome && exploredStops > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Travel Keepsakes:</span>
                  <div className="flex items-center gap-1">
                    {displayKeepsakes.map((emoji, i) => (
                      <span key={i} className="text-lg" title="Keepsake collected">{emoji}</span>
                    ))}
                  </div>
                </div>
              )}
              
              {!isHome && exploredStops > 0 && (
                <p className="text-xs text-muted-foreground italic">
                  These moments are saved in your child's travel collection.
                </p>
              )}
              
              {/* At-Home encouragement text */}
              {isHome && exploredStops > 0 && (
                <p className="text-xs text-teal-600 dark:text-teal-400 italic">
                  Great exploring! Keep learning about this place.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500" />
                <span className="font-medium text-green-600 dark:text-green-400">Adventure completed</span>
              </div>
              
              {/* Travel Keepsakes - only for Travel adventures */}
              {!isHome && displayKeepsakes.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Travel Keepsakes:</span>
                  <div className="flex items-center gap-1">
                    {displayKeepsakes.map((emoji, i) => (
                      <span key={i} className="text-lg">{emoji}</span>
                    ))}
                  </div>
                </div>
              )}
              
              <p className="text-xs text-muted-foreground italic">
                {isHome ? "A learning journey your child can revisit." : "A travel story your child can revisit anytime."}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            {!isCompleted ? (
              <>
                <Button
                  size="sm"
                  className={`flex-1 h-9 text-sm font-medium text-white rounded-full ${
                    isHome ? 'bg-teal-500 hover:bg-teal-600' : 'bg-orange-500 hover:bg-orange-600'
                  }`}
                  onClick={(e) => { e.stopPropagation(); onJourneyPacks(trip.id); }}
                  data-testid={`button-continue-journey-${trip.id}`}
                >
                  <Compass className="w-4 h-4 mr-1.5" />
                  {isHome ? "Continue Exploring" : "Continue Journey"}
                </Button>
                {/* Maps button - only for Travel adventures */}
                {!isHome && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 text-sm font-medium border-2 border-green-500 text-green-600 hover:bg-green-50 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-950 rounded-full"
                    onClick={(e) => { e.stopPropagation(); onViewMap(trip.id); }}
                    data-testid={`button-maps-${trip.id}`}
                  >
                    <Map className="w-4 h-4 mr-1" />
                    Maps
                  </Button>
                )}
                {onTrailTales && trailTalesAvailable && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 text-sm font-medium border-2 border-purple-500 text-purple-600 hover:bg-purple-50 dark:border-purple-400 dark:text-purple-400 dark:hover:bg-purple-950 rounded-full"
                    onClick={(e) => { e.stopPropagation(); onTrailTales(trip.id); }}
                    data-testid={`button-trail-tales-${trip.id}`}
                  >
                    <Brain className="w-4 h-4 mr-1" />
                    Trail Tales
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  className={`flex-1 h-9 text-sm font-medium text-white rounded-full ${
                    isHome ? 'bg-teal-500 hover:bg-teal-600' : 'bg-teal-500 hover:bg-teal-600'
                  }`}
                  onClick={(e) => { e.stopPropagation(); onJourneyPacks(trip.id); }}
                  data-testid={`button-view-memories-${trip.id}`}
                >
                  <BookOpen className="w-4 h-4 mr-1.5" />
                  {isHome ? "View Learnings" : "View Memories"}
                </Button>
                {/* Maps button - only for Travel adventures */}
                {!isHome && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 text-sm font-medium border-2 border-green-500 text-green-600 hover:bg-green-50 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-950 rounded-full"
                    onClick={(e) => { e.stopPropagation(); onViewMap(trip.id); }}
                    data-testid={`button-maps-${trip.id}`}
                  >
                    <Map className="w-4 h-4 mr-1" />
                    Maps
                  </Button>
                )}
                {onTrailTales && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 text-sm font-medium border-2 border-purple-500 text-purple-600 hover:bg-purple-50 dark:border-purple-400 dark:text-purple-400 dark:hover:bg-purple-950 rounded-full"
                    onClick={(e) => { e.stopPropagation(); onTrailTales(trip.id); }}
                    data-testid={`button-trail-tales-${trip.id}`}
                  >
                    <Brain className="w-4 h-4 mr-1" />
                    Trail Tales
                  </Button>
                )}
              </>
            )}
          </div>
          
          {hasRecapAvailable && onAdventureRecap && (
            <Button
              size="sm"
              variant="outline"
              className="w-full h-9 text-sm font-medium border-2 border-amber-500 text-amber-600 hover:bg-amber-50 dark:border-amber-400 dark:text-amber-400 dark:hover:bg-amber-950 rounded-full"
              onClick={(e) => { e.stopPropagation(); onAdventureRecap(trip.id); }}
              data-testid={`button-adventure-recap-${trip.id}`}
            >
              <Star className="w-4 h-4 mr-1.5" />
              {trip.recapCompleted ? "View Adventure Recap" : "Adventure Recap"}
            </Button>
          )}
        </CardContent>
      </Card>
      {showPreview && (
        <TripPreviewModal
          trip={trip}
          stops={stops}
          onClose={() => setShowPreview(false)}
        />
      )}
    </motion.div>
  );
}
