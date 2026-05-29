import { useState, useMemo, useEffect, useRef, Component, type ReactNode, type ErrorInfo } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  X, Map, Clock, Camera, Share2, Download, Video, Image,
  GripVertical, Trash2, CheckCircle, Plus, Heart,
  MapPin, Package, Flag, ChevronRight, Loader2, ArrowLeft,
  Car, Lightbulb, UtensilsCrossed, Navigation, BookOpen, Lock,
  Globe, Compass, Sparkles, Wallet
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { MathLockModal } from "./MathLockModal";
import { useAdventureShell } from "./AdventureShell";
import { useTravel } from "@/lib/travelContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useFreeLimits } from "@/hooks/useFreeLimits";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { getStopTypeEmoji } from "@/lib/travelAvatars";
import { FinishAdventureModal } from "@/components/FinishAdventureModal";
import { MomentCapture } from "@/components/MomentCapture";
import { ShareItineraryModal } from "@/components/ShareItineraryModal";
import { TravelOfflineDownload } from "@/components/TravelOfflineDownload";
import { TripVideoGenerator } from "@/components/TripVideoGenerator";
import { TripCollageGenerator } from "@/components/TripCollageGenerator";
import { FamilyTravelMap } from "@/components/FamilyTravelMap";
import type { TravelMoment, TravelStop, TripWalletItem } from "@shared/schema";

const TABS = [
  { id: "plan" as const, label: "Plan", icon: Map },
  { id: "during" as const, label: "During", icon: Clock },
  { id: "memories" as const, label: "Memories", icon: Camera },
  { id: "share" as const, label: "Share", icon: Share2 },
  { id: "wallet" as const, label: "Wallet", icon: Wallet },
];

type TabId = (typeof TABS)[number]["id"];

interface ParentHubModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getMomentPhotoUrl(moment: TravelMoment): string | null {
  if (moment.photoUrl) return moment.photoUrl;
  const urls = moment.photoUrls;
  if (Array.isArray(urls) && urls.length > 0 && typeof urls[0] === 'string') {
    return urls[0];
  }
  if (typeof urls === 'string') {
    try {
      const parsed = JSON.parse(urls);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
    } catch {}
  }
  return null;
}

function getAttractionEmoji(type?: string): string {
  const map: Record<string, string> = {
    beach: '🏖️', nature: '🌿', landmark: '🏛️', museum: '🏛️',
    park: '🌳', viewpoint: '👀', activity: '🎯',
  };
  return map[type || ''] || '📍';
}

function getKidPlaceEmoji(type?: string): string {
  const map: Record<string, string> = {
    playground: '🛝', ice_cream: '🍦', toy_store: '🧸', arcade: '🕹️',
    splash_pad: '💦', zoo: '🦁', aquarium: '🐠', trampoline: '🤸',
    mini_golf: '⛳', candy_shop: '🍬',
  };
  return map[type || ''] || '🧒';
}

class ParentHubErrorBoundary extends Component<{ children: ReactNode; onClose: () => void }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ParentHub] Crash:", error, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="p-6 text-center">
          <p className="text-lg font-bold text-gray-800 mb-2">Something went wrong</p>
          <p className="text-sm text-gray-500 mb-1">Parent Hub encountered an error.</p>
          <p className="text-xs text-red-400 mb-4 font-mono break-all max-h-20 overflow-auto">{this.state.error.message}</p>
          <Button onClick={this.props.onClose} className="bg-orange-500 hover:bg-orange-600 text-white rounded-full">Close</Button>
        </div>
      );
    }
    return this.props.children;
  }
}

const VIRTUAL_TAB_MESSAGES: Record<TabId, string> = {
  plan: "Trip planning unlocks when you start a real trip.",
  during: "Mark stops as visited when you're exploring the city in person.",
  memories: "Capture photos and notes when you're visiting this city.",
  share: "Share your itinerary with family during a real trip.",
  wallet: "Store tickets and bookings when you're planning a real trip.",
};

function VirtualTabGate({ tab, cityName, onOkay }: { tab: TabId; cityName: string; onOkay: () => void }) {
  const icons: Record<TabId, typeof Map> = { plan: Map, during: Compass, memories: Camera, share: Share2, wallet: Wallet };
  const Icon = icons[tab];
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center" data-testid={`virtual-gate-${tab}`}>
      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-gray-400" />
      </div>
      <p className="text-sm text-gray-600 leading-relaxed mb-6 max-w-[260px]">
        {VIRTUAL_TAB_MESSAGES[tab]}
      </p>
      <Button
        onClick={onOkay}
        className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-8 h-10 font-semibold text-sm"
        data-testid={`button-virtual-gate-okay-${tab}`}
      >
        Okay
      </Button>
    </div>
  );
}

function TravelToolsUnlockMessage({ cityName, isPaid, onPlanTrip, onKeepExploring }: {
  cityName: string; isPaid: boolean; onPlanTrip: () => void; onKeepExploring: () => void;
}) {
  return (
    <div className="flex flex-col items-center px-5 py-8 text-center" data-testid="travel-tools-unlock-message">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-teal-100 flex items-center justify-center mb-4">
        <Globe className="w-8 h-8 text-teal-600" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-3">Travel Tools Unlock When You Visit</h3>
      <p className="text-sm text-gray-600 leading-relaxed mb-4">
        You're currently exploring <span className="font-semibold text-gray-800">{cityName}</span> in virtual mode.
      </p>
      <p className="text-sm text-gray-500 leading-relaxed mb-2">
        When your family visits this city, GeoAdventures unlocks special travel tools like:
      </p>
      <ul className="text-sm text-gray-600 text-left space-y-1.5 mb-6 w-full max-w-[260px]">
        <li className="flex items-center gap-2"><Map className="w-4 h-4 text-orange-500 shrink-0" /> Trip planner</li>
        <li className="flex items-center gap-2"><Package className="w-4 h-4 text-green-500 shrink-0" /> Packing list</li>
        <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-blue-500 shrink-0" /> Mark places as visited</li>
        <li className="flex items-center gap-2"><Camera className="w-4 h-4 text-purple-500 shrink-0" /> Capture family memories</li>
        <li className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-rose-500 shrink-0" /> Create a travel story</li>
      </ul>
      <p className="text-xs text-gray-400 mb-5">Turn this adventure into a real-world trip to activate them.</p>
      <Button
        onClick={onPlanTrip}
        className="w-full max-w-[280px] bg-orange-500 hover:bg-orange-600 text-white rounded-full h-11 font-semibold text-sm mb-3"
        data-testid="button-plan-real-trip"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        Plan a Real Trip
      </Button>
      <button
        onClick={onKeepExploring}
        className="text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
        data-testid="button-keep-exploring"
      >
        Keep Exploring
      </button>
    </div>
  );
}

export function ParentHubModal({ open, onOpenChange }: ParentHubModalProps) {
  const { parentVerified, verifyParent } = useAdventureShell();
  const { currentTrip } = useTravel();
  const { isPaidUser } = useFreeLimits();
  const [, navigate] = useLocation();
  const [showMathLock, setShowMathLock] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("plan");
  const [showTravelUnlock, setShowTravelUnlock] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const isVirtual = currentTrip?.adventureContext === 'home';
  const cityName = currentTrip?.city || currentTrip?.name || "this city";

  useEffect(() => {
    if (open && !parentVerified && !showMathLock) {
      setShowMathLock(true);
    }
  }, [open, parentVerified, showMathLock]);

  useEffect(() => {
    if (!open) {
      setShowTravelUnlock(false);
      setShowUpgradePrompt(false);
    }
  }, [open]);

  const handleMathSuccess = () => {
    verifyParent();
    setShowMathLock(false);
  };

  const handleMathCancel = () => {
    setShowMathLock(false);
    onOpenChange(false);
  };

  const handlePlanRealTrip = () => {
    if (isPaidUser) {
      onOpenChange(false);
      navigate("/geoadventures");
    } else {
      setShowUpgradePrompt(true);
    }
  };

  const handleKeepExploring = () => {
    onOpenChange(false);
  };

  return (
    <>
      <ParentHubErrorBoundary onClose={() => onOpenChange(false)}>
        <MathLockModal
          open={showMathLock}
          onSuccess={handleMathSuccess}
          onCancel={handleMathCancel}
        />
      </ParentHubErrorBoundary>

      <Dialog open={open && parentVerified} onOpenChange={onOpenChange}>
        <DialogContent hideCloseButton className="max-w-lg h-[85vh] flex flex-col p-0 rounded-2xl overflow-hidden" data-testid="parent-hub-modal">
          <VisuallyHidden><DialogTitle>Parent Hub</DialogTitle></VisuallyHidden>

          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-lg">🧭</span>
              <h2 className="font-bold text-gray-900 text-lg">Parent Hub</h2>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
              data-testid="button-close-parent-hub"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {isVirtual && (
            <div className="flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-blue-50 to-teal-50 border-b border-blue-100 shrink-0" data-testid="virtual-mode-banner">
              <Globe className="w-4 h-4 text-teal-600" />
              <span className="text-xs font-semibold text-teal-700">Virtual Adventure Mode</span>
            </div>
          )}

          <div className="flex border-b border-gray-100 bg-white shrink-0">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setShowTravelUnlock(false); }}
                  className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
                    isActive
                      ? "text-orange-600 border-b-2 border-orange-500"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                  data-testid={`tab-parent-hub-${tab.id}`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto bg-gray-50">
            <ParentHubErrorBoundary onClose={() => onOpenChange(false)}>
              {isVirtual ? (
                showTravelUnlock ? (
                  <TravelToolsUnlockMessage
                    cityName={cityName}
                    isPaid={isPaidUser}
                    onPlanTrip={handlePlanRealTrip}
                    onKeepExploring={handleKeepExploring}
                  />
                ) : (
                  <VirtualTabGate tab={activeTab} cityName={cityName} onOkay={() => setShowTravelUnlock(true)} />
                )
              ) : (
                <>
                  {activeTab === "plan" && <PlanTab />}
                  {activeTab === "during" && <DuringTab />}
                  {activeTab === "memories" && <MemoriesTab />}
                  {activeTab === "share" && <ShareTab />}
                  {activeTab === "wallet" && <WalletTab />}
                </>
              )}
            </ParentHubErrorBoundary>
          </div>
        </DialogContent>
      </Dialog>

      <UpgradePrompt
        isOpen={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        feature="build_adventure"
      />
    </>
  );
}

function PlanTab() {
  const { tripId } = useAdventureShell();
  const { currentTrip, currentTripStops, currentTripMoments, trips, updateStop, deleteStop, addStop, fetchTrip } = useTravel();
  const [, navigate] = useLocation();
  const sub = useSubscription();
  const isAdmin = sub.isAdmin;
  const videoEnabled = sub.isPaidTier || isAdmin;
  const [stopToDelete, setStopToDelete] = useState<string | null>(null);
  const [showFinishAdventure, setShowFinishAdventure] = useState(false);
  const [selectedStopDetail, setSelectedStopDetail] = useState<TravelStop | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [showVideoMaker, setShowVideoMaker] = useState(false);
  const [showCollageMaker, setShowCollageMaker] = useState(false);
  const [showAddStop, setShowAddStop] = useState(false);
  const [newStopName, setNewStopName] = useState("");
  const [newStopType, setNewStopType] = useState("landmark");
  const [newStopAddress, setNewStopAddress] = useState("");
  const [addingStop, setAddingStop] = useState(false);
  const [shareInfo, setShareInfo] = useState<{ id: string; slug: string; status: string; totalViews: number; totalUpvotes: number; publishedAt?: Date | null } | undefined>();
  const [showShare, setShowShare] = useState(false);

  const sortedStops = useMemo(
    () => [...currentTripStops].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)),
    [currentTripStops]
  );

  const visitedCount = sortedStops.filter(s => s.isVisited).length;
  const adventureStarted = !!currentTrip?.adventureStartedAt;
  const isCompleted = currentTrip?.status === 'completed';

  // Drag-and-drop state (touch-based for mobile)
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const touchDragFrom = useRef<number | null>(null);

  const handleDragReorder = async (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    const reordered = [...sortedStops];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    try {
      await Promise.all(
        reordered.map((stop, idx) => updateStop(stop.id, { displayOrder: idx } as any))
      );
    } catch (e) {
      console.error("Failed to reorder stops:", e);
      toast.error("Couldn't reorder stops — please try again");
    }
  };

  const handleGripTouchStart = (e: React.TouchEvent, idx: number) => {
    e.stopPropagation();
    touchDragFrom.current = idx;
    setDraggedIdx(idx);
    setDropTargetIdx(idx);
  };

  const handleGripTouchMove = (e: React.TouchEvent) => {
    if (touchDragFrom.current === null) return;
    e.preventDefault();
    e.stopPropagation();
    const touch = e.touches[0];
    const y = touch.clientY;
    // Find which item the touch is currently over
    let closestIdx = touchDragFrom.current;
    let closestDist = Infinity;
    itemRefs.current.forEach((el, idx) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const centerY = rect.top + rect.height / 2;
      const dist = Math.abs(y - centerY);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = idx;
      }
    });
    setDropTargetIdx(closestIdx);
  };

  const handleGripTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (touchDragFrom.current !== null && dropTargetIdx !== null) {
      handleDragReorder(touchDragFrom.current, dropTargetIdx);
    }
    touchDragFrom.current = null;
    setDraggedIdx(null);
    setDropTargetIdx(null);
  };

  // Attach a non-passive touchmove listener so preventDefault() can block scroll during drag
  useEffect(() => {
    if (draggedIdx === null) return;
    const onMove = (e: TouchEvent) => {
      if (touchDragFrom.current === null) return;
      e.preventDefault();
      const touch = e.touches[0];
      const y = touch.clientY;
      let closestIdx = touchDragFrom.current;
      let closestDist = Infinity;
      itemRefs.current.forEach((el, idx) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const centerY = rect.top + rect.height / 2;
        const dist = Math.abs(y - centerY);
        if (dist < closestDist) { closestDist = dist; closestIdx = idx; }
      });
      setDropTargetIdx(closestIdx);
    };
    window.addEventListener("touchmove", onMove, { passive: false });
    return () => window.removeEventListener("touchmove", onMove);
  }, [draggedIdx]);

  const handleDeleteStop = async () => {
    if (!stopToDelete) return;
    try { await deleteStop(stopToDelete); } catch (e) {
      console.error("Failed to delete stop:", e);
      toast.error("Couldn't remove stop — please try again");
    }
    setStopToDelete(null);
  };

  const handleAddStop = async () => {
    if (!newStopName.trim() || !tripId) return;
    setAddingStop(true);
    try {
      await addStop(tripId, {
        name: newStopName.trim(),
        stopType: newStopType,
        address: newStopAddress.trim() || undefined,
        displayOrder: sortedStops.length,
      });
      setNewStopName("");
      setNewStopType("landmark");
      setNewStopAddress("");
      setShowAddStop(false);
      toast.success("Stop added!");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "SESSION_EXPIRED") {
        toast.error("Session expired — please sign in again.");
        navigate("/?login=true");
      } else {
        toast.error("Couldn't add stop, please try again.");
      }
    }
    setAddingStop(false);
  };

  const handleOpenMap = () => setShowMap(true);

  const handleOpenShare = async () => {
    if (!currentTrip) return;
    try {
      const res = await fetch(`/api/travel/trips/${currentTrip.id}/share-status`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.shared) setShareInfo(data);
      }
    } catch {}
    setShowShare(true);
  };

  const handleOpenVideo = () => {
    setShowVideoMaker(true);
  };

  const handleOpenCollage = () => {
    setShowCollageMaker(true);
  };

  if (selectedStopDetail) {
    return (
      <StopDetailView
        stop={selectedStopDetail}
        onBack={() => setSelectedStopDetail(null)}
      />
    );
  }

  return (
    <div className="p-4 space-y-4" data-testid="parent-hub-plan-tab">
      <div className="flex flex-wrap gap-2">
        <ActionButton icon={MapPin} label="Map" color="orange" onClick={handleOpenMap} />
        <ActionButton icon={Download} label="Download" color="green" render={
          currentTrip ? <TravelOfflineDownload trip={currentTrip} stops={currentTripStops} /> : undefined
        } />
        <ActionButton icon={Share2} label="Share" color="blue" onClick={handleOpenShare} />
      </div>
      <div className="flex flex-wrap gap-2">
        <ActionButton icon={Video} label="Make Video" color="purple" onClick={handleOpenVideo} />
        <ActionButton icon={Image} label="Make Collage" color="pink" onClick={handleOpenCollage} />
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-800 text-sm">Exploration Spots</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-orange-500 font-medium">{visitedCount} / {sortedStops.length} visited</span>
            <button
              onClick={() => setShowAddStop(true)}
              className="w-7 h-7 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center shadow-sm transition-colors"
              data-testid="button-add-stop"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {sortedStops.map((stop, index) => (
            <div key={stop.id}>
              {/* Drop indicator line above target */}
              {draggedIdx !== null && dropTargetIdx === index && index !== draggedIdx && dropTargetIdx < draggedIdx && (
                <div className="h-0.5 bg-orange-400 rounded-full mx-2 mb-1" />
              )}
              <div
                ref={(el) => { itemRefs.current[index] = el; }}
                data-testid={`parent-hub-stop-${stop.id}`}
                className={`transition-all ${draggedIdx === index ? "opacity-40 scale-[0.98]" : dropTargetIdx === index && draggedIdx !== null && draggedIdx !== index ? "scale-[1.01]" : ""}`}
              >
                <div
                  className={`bg-white rounded-xl border p-3 shadow-sm transition-colors ${
                    draggedIdx === index ? "border-orange-400 shadow-md" :
                    dropTargetIdx === index && draggedIdx !== null && draggedIdx !== index ? "border-orange-300 bg-orange-50" :
                    "border-gray-100 hover:border-orange-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {/* 6-dot drag handle — touch events for mobile */}
                    <GripVertical
                      className="w-4 h-4 text-gray-300 cursor-grab active:cursor-grabbing shrink-0 touch-none"
                      onClick={(e) => e.stopPropagation()}
                      onTouchStart={(e) => handleGripTouchStart(e, index)}
                      onTouchEnd={handleGripTouchEnd}
                    />
                  <span
                    className="text-sm font-bold text-orange-400 w-5 text-center shrink-0 cursor-pointer"
                    onClick={() => setSelectedStopDetail(stop)}
                  >{index + 1}</span>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedStopDetail(stop)}>
                    <p className={`text-sm font-semibold ${stop.isVisited ? "text-gray-400 line-through" : "text-gray-800"}`}>
                      {stop.name}
                    </p>
                    <p className="text-xs text-gray-400 capitalize">{stop.stopType || "adventure"}</p>
                    {stop.address && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 flex items-center gap-1 mt-0.5 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                        data-testid={`link-stop-address-${stop.id}`}
                      >
                        <Navigation className="w-3 h-3 shrink-0" />
                        <span className="truncate max-w-[160px]">{stop.address}</span>
                      </a>
                    )}
                  </div>
                  {stop.isVisited ? (
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  ) : (
                    <span className="text-lg shrink-0 cursor-pointer" onClick={() => setSelectedStopDetail(stop)}>{getStopTypeEmoji(stop.stopType || "other")}</span>
                  )}
                  <Trash2
                    className="w-4 h-4 text-gray-300 hover:text-red-500 cursor-pointer shrink-0"
                    onClick={(e) => { e.stopPropagation(); setStopToDelete(stop.id); }}
                  />
                  <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 cursor-pointer" onClick={() => setSelectedStopDetail(stop)} />
                </div>
              </div>
              </div>
              {/* Drop indicator line below target */}
              {draggedIdx !== null && dropTargetIdx === index && index !== draggedIdx && dropTargetIdx >= draggedIdx && (
                <div className="h-0.5 bg-orange-400 rounded-full mx-2 mt-1" />
              )}
            </div>
          ))}
        </div>
      </div>

      {adventureStarted && !isCompleted && (
        <div className="pt-4 border-t border-gray-200">
          <Button
            onClick={() => setShowFinishAdventure(true)}
            className="w-full bg-red-500 hover:bg-red-600 text-white rounded-full h-11 font-semibold"
            data-testid="button-finish-adventure"
          >
            <Flag className="w-4 h-4 mr-2" />
            Finish Adventure
          </Button>
          <p className="text-xs text-gray-400 text-center mt-2">This will lock the trip as a permanent memory</p>
        </div>
      )}

      {isCompleted && (
        <div className="bg-green-50 rounded-xl p-4 border border-green-100 text-center">
          <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-green-700">Adventure Complete!</p>
          <p className="text-xs text-green-600 mt-1">This adventure is saved as a permanent memory</p>
        </div>
      )}

      {showFinishAdventure && currentTrip && (
        <FinishAdventureModal
          trip={currentTrip}
          stops={currentTripStops}
          moments={currentTripMoments || []}
          onClose={() => setShowFinishAdventure(false)}
          onFinished={async () => {
            setShowFinishAdventure(false);
            await fetchTrip(tripId);
          }}
        />
      )}

      {showMap && currentTrip && (
        <div className="fixed inset-0 z-[260] bg-white">
          <FamilyTravelMap
            trips={trips}
            currentTrip={currentTrip}
            stops={currentTripStops}
            moments={currentTripMoments || []}
            memoryStars={0}
            onClose={() => setShowMap(false)}
            onStopClick={() => {}}
            onTripSelect={() => {}}
            initialView="trip"
          />
        </div>
      )}

      {showShare && currentTrip && (
        <ShareItineraryModal
          open={showShare}
          onOpenChange={setShowShare}
          trip={currentTrip}
          stopCount={currentTripStops.length}
          existingShare={shareInfo ? { ...shareInfo, publishedAt: shareInfo.publishedAt || null } : undefined}
          onShare={async (data) => {
            const res = await fetch(`/api/travel/trips/${currentTrip.id}/share`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), credentials: 'include' });
            const result = await res.json();
            setShareInfo(result);
            return result;
          }}
          onUnshare={async () => {
            await fetch(`/api/travel/trips/${currentTrip.id}/unshare`, { method: 'POST', credentials: 'include' });
            setShareInfo(undefined);
          }}
        />
      )}

      {showVideoMaker && currentTrip && (
        <div className="fixed inset-0 z-[260] flex items-end justify-center bg-black/40" onClick={() => setShowVideoMaker(false)}>
          <div className="bg-white rounded-t-2xl w-full max-w-lg max-h-[80vh] overflow-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-purple-500" />
                <h3 className="font-bold text-gray-900">Create Family Video</h3>
              </div>
              <button onClick={() => setShowVideoMaker(false)} className="p-1.5 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-500 mb-4">Turn your adventure moments into a keepsake video</p>
              <TripVideoGenerator
                trip={currentTrip}
                moments={currentTripMoments || []}
                stops={currentTripStops}
                onClose={() => setShowVideoMaker(false)}
              />
            </div>
          </div>
        </div>
      )}

      {showCollageMaker && currentTrip && (
        <div className="fixed inset-0 z-[260] flex items-end justify-center bg-black/40" onClick={() => setShowCollageMaker(false)}>
          <div className="bg-white rounded-t-2xl w-full max-w-lg max-h-[80vh] overflow-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <Image className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-gray-900">Create Photo Collage</h3>
              </div>
              <button onClick={() => setShowCollageMaker(false)} className="p-1.5 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-500 mb-4">Create a beautiful collage from your adventure photos</p>
              <TripCollageGenerator
                trip={currentTrip}
                moments={currentTripMoments || []}
                stops={currentTripStops}
                onClose={() => setShowCollageMaker(false)}
              />
            </div>
          </div>
        </div>
      )}

      {stopToDelete && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-xl">
            <h3 className="font-bold text-gray-900 mb-2">Remove Stop?</h3>
            <p className="text-sm text-gray-600 mb-4">This will remove this stop from your trip.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStopToDelete(null)}>Cancel</Button>
              <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white" onClick={handleDeleteStop}>Remove</Button>
            </div>
          </div>
        </div>
      )}

      {showAddStop && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/40" onClick={() => setShowAddStop(false)}>
          <div className="bg-white rounded-2xl p-5 max-w-sm mx-4 shadow-xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 text-base">Add Exploration Spot</h3>
              <button onClick={() => setShowAddStop(false)} className="p-1 rounded-full hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Name</label>
                <input
                  type="text"
                  value={newStopName}
                  onChange={(e) => setNewStopName(e.target.value)}
                  placeholder="e.g. Millennium Park"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400"
                  data-testid="input-new-stop-name"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Type</label>
                <select
                  value={newStopType}
                  onChange={(e) => setNewStopType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 bg-white"
                  data-testid="select-new-stop-type"
                >
                  <option value="landmark">Landmark</option>
                  <option value="museum">Museum</option>
                  <option value="park">Park</option>
                  <option value="beach">Beach</option>
                  <option value="temple">Temple</option>
                  <option value="market">Market</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="nature">Nature</option>
                  <option value="viewpoint">Viewpoint</option>
                  <option value="zoo">Zoo</option>
                  <option value="aquarium">Aquarium</option>
                  <option value="garden">Garden</option>
                  <option value="plaza">Plaza</option>
                  <option value="palace">Palace</option>
                  <option value="bridge">Bridge</option>
                  <option value="waterfall">Waterfall</option>
                  <option value="volcano">Volcano</option>
                  <option value="mountain">Mountain</option>
                  <option value="neighborhood">Neighborhood</option>
                  <option value="street_food">Street Food</option>
                  <option value="street">Street</option>
                  <option value="food">Food</option>
                  <option value="culture">Culture</option>
                  <option value="adventure">Adventure</option>
                  <option value="city">City</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Address (optional)</label>
                <input
                  type="text"
                  value={newStopAddress}
                  onChange={(e) => setNewStopAddress(e.target.value)}
                  placeholder="e.g. 201 E Randolph St, Chicago"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400"
                  data-testid="input-new-stop-address"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <Button variant="outline" className="flex-1 rounded-full" onClick={() => setShowAddStop(false)}>Cancel</Button>
                <Button
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-full"
                  onClick={handleAddStop}
                  disabled={!newStopName.trim() || addingStop}
                  data-testid="button-confirm-add-stop"
                >
                  {addingStop ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                  {addingStop ? "Adding..." : "Add Spot"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StopDetailView({ stop, onBack }: { stop: TravelStop; onBack: () => void }) {
  const [exploreData, setExploreData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadExplore = async () => {
      try {
        const res = await fetch(`/api/travel/stops/${stop.id}/explore`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setExploreData(data);
        }
      } catch (err) {
        console.error("[StopDetail] Failed to load explore data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadExplore();
  }, [stop.id]);

  return (
    <div className="p-4" data-testid={`stop-detail-${stop.id}`}>
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
        data-testid="button-back-to-stops"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Stops
      </button>

      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-2xl">
          {getStopTypeEmoji(stop.stopType || "other")}
        </div>
        <div>
          <h3 className="font-bold text-gray-900 text-lg">{stop.name}</h3>
          <p className="text-xs text-gray-500 capitalize">{stop.stopType || "adventure"}</p>
        </div>
      </div>

      {stop.address && (
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.address)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-blue-50 rounded-xl p-3 mb-4 border border-blue-100 hover:bg-blue-100 transition-colors"
          data-testid={`link-stop-directions-${stop.id}`}
        >
          <Navigation className="w-5 h-5 text-blue-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-blue-700">Get Directions</p>
            <p className="text-xs text-blue-500 truncate">{stop.address}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-blue-400 shrink-0" />
        </a>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
          <span className="ml-2 text-sm text-orange-600">Loading area info...</span>
        </div>
      ) : exploreData ? (
        <div className="space-y-5">
          {exploreData.aboutArea && (
            <div className="bg-sky-50 rounded-xl p-4 border border-sky-100">
              <h4 className="font-bold text-sky-800 text-sm flex items-center gap-2 mb-2">
                <Map className="w-4 h-4" />
                About the Area
              </h4>
              <p className="text-sm text-sky-700 leading-relaxed">{exploreData.aboutArea}</p>
            </div>
          )}

          {exploreData.nearbyAttractions?.length > 0 && (
            <div>
              <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-orange-500" />
                What's Nearby
              </h4>
              <div className="space-y-2">
                {exploreData.nearbyAttractions.map((place: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-gray-100">
                    <span className="text-xl">{getAttractionEmoji(place.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{place.name}</p>
                      <p className="text-xs text-orange-500">{place.distance}</p>
                      {place.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{place.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {exploreData.restaurants?.length > 0 && (
            <div>
              <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2 mb-3">
                <UtensilsCrossed className="w-4 h-4 text-rose-500" />
                Places to Eat
              </h4>
              <div className="space-y-2">
                {exploreData.restaurants.map((rest: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-gray-100">
                    <span className="text-xl">🍽️</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{rest.name}</p>
                      <p className="text-xs text-rose-500">
                        {rest.cuisine} {rest.distance ? `· ${rest.distance}` : ''} {rest.priceRange ? `· ${rest.priceRange}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {exploreData.kidFriendlyPlaces?.length > 0 && (
            <div>
              <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2 mb-3">
                🧒 For Kids
              </h4>
              <div className="space-y-2">
                {exploreData.kidFriendlyPlaces.map((place: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-gray-100">
                    <span className="text-xl">{getKidPlaceEmoji(place.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{place.name}</p>
                      <p className="text-xs text-purple-500">
                        {place.distance} {place.ageRange ? `· ${place.ageRange}` : ''}
                      </p>
                      {place.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{place.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {exploreData.gettingAround && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <h4 className="font-bold text-gray-700 text-sm flex items-center gap-2 mb-2">
                <Car className="w-4 h-4" />
                Getting Around
              </h4>
              <p className="text-sm text-gray-600 leading-relaxed">{exploreData.gettingAround}</p>
            </div>
          )}

          {exploreData.tips?.length > 0 && (
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
              <h4 className="font-bold text-amber-800 text-sm flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4" />
                Tips
              </h4>
              <ul className="space-y-1.5">
                {exploreData.tips.map((tip: string, i: number) => (
                  <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <MapPin className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Area information will appear after you listen to the story for this stop</p>
        </div>
      )}
    </div>
  );
}

const INTENT_CHIPS = [
  { id: "take_a_break", emoji: "☕", label: "Take a break", tip: "Find a nearby café or rest spot" },
  { id: "find_food", emoji: "🍽️", label: "Find food", tip: "Look for family-friendly restaurants nearby" },
  { id: "keep_exploring", emoji: "🗺️", label: "Keep exploring", tip: "Check your next stop on the map" },
  { id: "do_something_fun", emoji: "🎡", label: "Something fun", tip: "Search for nearby parks or activities" },
];

const INTENT_RECOMMENDATIONS: Record<string, Array<{ emoji: string; title: string; desc: string; action?: string }>> = {
  take_a_break: [
    { emoji: "☕", title: "Find a café nearby", desc: "Great for a quick recharge before the next stop" },
    { emoji: "🌳", title: "Look for a park", desc: "Kids can run around while parents relax" },
    { emoji: "🧃", title: "Grab a snack", desc: "Convenience stores or kiosks are usually close" },
  ],
  find_food: [
    { emoji: "🍽️", title: "Local restaurants", desc: "Try something regional — great for picky eaters too" },
    { emoji: "🥪", title: "Grab something quick", desc: "Sandwiches or street food if time is short" },
    { emoji: "🍦", title: "Dessert stop", desc: "Ice cream or local sweets are always a win with kids" },
  ],
  keep_exploring: [
    { emoji: "🏛️", title: "Next stop on your route", desc: "Check your plan to keep the adventure moving" },
    { emoji: "🗺️", title: "Explore the area", desc: "Walk around and see what you discover nearby" },
    { emoji: "📸", title: "Capture a memory", desc: "Take a photo at this spot before moving on" },
  ],
  do_something_fun: [
    { emoji: "🎡", title: "Look for attractions", desc: "Amusement parks, zoos, or playgrounds near you" },
    { emoji: "🎨", title: "Creative activity", desc: "Museums or craft workshops the whole family enjoys" },
    { emoji: "🎮", title: "Arcade or games", desc: "A quick game break can re-energize everyone" },
  ],
};

function DuringTab() {
  const { currentTrip, currentTripStops, markStopVisited, saveMoment } = useTravel();
  const [, navigate] = useLocation();
  const [activeIntent, setActiveIntent] = useState<string | null>(null);
  const [showCapture, setShowCapture] = useState(false);
  const [activeRec, setActiveRec] = useState<{ emoji: string; title: string; desc: string } | null>(null);
  const [stopExploreData, setStopExploreData] = useState<any>(null);
  const [stopExploreLoading, setStopExploreLoading] = useState(false);

  const sortedStops = useMemo(
    () => [...currentTripStops].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)),
    [currentTripStops]
  );

  const currentStop = useMemo(
    () => sortedStops.find((s) => !s.isVisited) || sortedStops[sortedStops.length - 1] || null,
    [sortedStops]
  );

  const visitedCount = sortedStops.filter((s) => s.isVisited).length;

  useEffect(() => {
    if (!currentStop) return;
    setStopExploreLoading(true);
    fetch(`/api/travel/stops/${currentStop.id}/explore`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setStopExploreData(d))
      .catch(() => setStopExploreData(null))
      .finally(() => setStopExploreLoading(false));
  }, [currentStop?.id]);

  const handleGetDirections = () => {
    if (!currentStop) return;
    const query = currentStop.address || currentStop.name;
    window.open(`https://maps.google.com/?q=${encodeURIComponent(query)}`, "_blank");
    toast.info("Opening directions in Maps...");
  };

  const handleHandToKid = () => {
    if (!currentTrip) return;
    navigate(`/adventure/${currentTrip.id}/kid`);
  };

  const recommendations = activeIntent ? (INTENT_RECOMMENDATIONS[activeIntent] || []) : [];

  return (
    <div className="p-4 space-y-4 pb-4" data-testid="parent-hub-during-tab">
      <div>
        {currentStop && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" data-testid="during-current-stop-card">
            <div className="flex">
              <div className="flex-1 p-4">
                <p className="text-[10px] font-bold text-orange-500 uppercase tracking-wider mb-1">
                  {currentStop.isVisited ? "Last visited" : "Next up"}
                </p>
                <h3 className="font-bold text-base text-gray-900 leading-tight">{currentStop.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="w-3 h-3" /> 45–60 min
                  </span>
                  <span className="text-gray-300">·</span>
                  <span className="text-xs text-gray-400 capitalize">{currentStop.stopType || "landmark"}</span>
                </div>
                <span className="text-[10px] text-gray-300 mt-0.5 block">
                  {visitedCount}/{sortedStops.length} stops done
                </span>
              </div>
              <div className="w-20 bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center shrink-0">
                <span className="text-4xl">{getStopTypeEmoji(currentStop.stopType || "other")}</span>
              </div>
            </div>
            <div className="border-t border-gray-50 p-3 flex gap-2">
              <button
                onClick={handleGetDirections}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
                data-testid="button-during-get-directions"
              >
                <Navigation className="w-3.5 h-3.5" />
                Start Directions
              </button>
              <button
                onClick={() => navigate(`/adventure/${currentTrip?.id}/parent-plan`)}
                className="flex-1 border border-gray-200 text-gray-600 text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center transition-colors hover:bg-gray-50"
              >
                View details →
              </button>
            </div>
          </div>
        )}

        <div>
          <p className="text-sm font-bold text-gray-800 mb-2">What do you need right now?</p>
          <div className="space-y-2">
            {INTENT_CHIPS.map((chip) => (
              <button
                key={chip.id}
                onClick={() => setActiveIntent(activeIntent === chip.id ? null : chip.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                  activeIntent === chip.id
                    ? "border-orange-400 bg-orange-50 shadow-sm"
                    : "border-gray-100 bg-white hover:border-orange-200"
                }`}
                data-testid={`intent-chip-${chip.id}`}
              >
                <span className="text-xl shrink-0">{chip.emoji}</span>
                <span className="flex-1 text-sm font-semibold text-gray-700">{chip.label}</span>
                <span className="text-gray-300 text-sm">›</span>
              </button>
            ))}
          </div>
        </div>

        {activeIntent && recommendations.length > 0 && (
          <div className="space-y-2" data-testid="intent-recommendations">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ideas for you</p>
            {recommendations.map((rec, i) => (
              <button
                key={i}
                onClick={() => setActiveRec(rec)}
                className="w-full bg-white rounded-xl border border-gray-100 p-3.5 shadow-sm flex items-center gap-3 text-left hover:border-orange-200 hover:bg-orange-50/50 transition-colors"
                data-testid={`rec-card-${i}`}
              >
                <span className="text-2xl shrink-0">{rec.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{rec.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{rec.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
              </button>
            ))}
          </div>
        )}

        {activeRec && (
          <div className="fixed inset-0 z-[350] bg-black/40 flex items-end justify-center" onClick={() => setActiveRec(null)}>
            <div
              className="bg-white w-full max-w-lg rounded-t-2xl shadow-xl max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              data-testid="rec-bottom-sheet"
            >
              <div className="px-5 pt-5 pb-3">
                <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-3xl">{activeRec.emoji}</span>
                  <div>
                    <h3 className="font-bold text-gray-900">{activeRec.title}</h3>
                    <p className="text-sm text-gray-500">{activeRec.desc}</p>
                  </div>
                </div>
              </div>

              {/* Rich stop data */}
              {currentStop && (
                <div className="px-5 pb-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                    Around {currentStop.name}
                  </p>
                  {stopExploreLoading && (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-5 h-5 animate-spin text-orange-500 mr-2" />
                      <span className="text-sm text-gray-400">Loading area info…</span>
                    </div>
                  )}
                  {!stopExploreLoading && stopExploreData && (
                    <div className="space-y-4">
                      {stopExploreData.aboutArea && (
                        <div className="bg-sky-50 rounded-xl p-3 border border-sky-100">
                          <h4 className="font-bold text-sky-800 text-xs flex items-center gap-1.5 mb-1.5">
                            <Map className="w-3.5 h-3.5" /> About the Area
                          </h4>
                          <p className="text-xs text-sky-700 leading-relaxed">{stopExploreData.aboutArea}</p>
                        </div>
                      )}

                      {stopExploreData.nearbyAttractions?.length > 0 && (
                        <div>
                          <h4 className="font-bold text-gray-700 text-xs flex items-center gap-1.5 mb-2">
                            <MapPin className="w-3.5 h-3.5 text-orange-500" /> What's Nearby
                          </h4>
                          <div className="space-y-1.5">
                            {stopExploreData.nearbyAttractions.slice(0, 4).map((place: any, i: number) => (
                              <div key={i} className="flex items-start gap-2.5 bg-gray-50 rounded-xl p-2.5 border border-gray-100">
                                <span className="text-base shrink-0">{place.type === "park" ? "🌳" : place.type === "museum" ? "🏛️" : "📍"}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-gray-800">{place.name}</p>
                                  <p className="text-[11px] text-orange-500">{place.distance}</p>
                                  {place.description && <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{place.description}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {stopExploreData.restaurants?.length > 0 && (
                        <div>
                          <h4 className="font-bold text-gray-700 text-xs flex items-center gap-1.5 mb-2">
                            🍽️ Places to Eat
                          </h4>
                          <div className="space-y-1.5">
                            {stopExploreData.restaurants.slice(0, 4).map((rest: any, i: number) => (
                              <div key={i} className="flex items-start gap-2.5 bg-gray-50 rounded-xl p-2.5 border border-gray-100">
                                <span className="text-base shrink-0">🍴</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-gray-800">{rest.name}</p>
                                  <p className="text-[11px] text-rose-500">
                                    {[rest.cuisine, rest.distance, rest.priceRange].filter(Boolean).join(" · ")}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {stopExploreData.kidFriendlyPlaces?.length > 0 && (
                        <div>
                          <h4 className="font-bold text-gray-700 text-xs flex items-center gap-1.5 mb-2">
                            🧒 For Kids
                          </h4>
                          <div className="space-y-1.5">
                            {stopExploreData.kidFriendlyPlaces.slice(0, 3).map((place: any, i: number) => (
                              <div key={i} className="flex items-start gap-2.5 bg-gray-50 rounded-xl p-2.5 border border-gray-100">
                                <span className="text-base shrink-0">🎠</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-gray-800">{place.name}</p>
                                  <p className="text-[11px] text-purple-500">
                                    {[place.distance, place.ageRange].filter(Boolean).join(" · ")}
                                  </p>
                                  {place.description && <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{place.description}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {stopExploreData.tips?.length > 0 && (
                        <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                          <h4 className="font-bold text-amber-800 text-xs mb-1.5">💡 Tips</h4>
                          <ul className="space-y-1">
                            {stopExploreData.tips.slice(0, 3).map((tip: string, i: number) => (
                              <li key={i} className="text-xs text-amber-700 flex items-start gap-1.5">
                                <span className="text-orange-400 shrink-0 mt-0.5">·</span>
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="px-5 py-4">
                <Button
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl"
                  onClick={() => setActiveRec(null)}
                >
                  Got it
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => setShowCapture(true)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:border-orange-300 hover:bg-orange-50 transition-all"
            data-testid="button-capture-moment"
          >
            <Camera className="w-4 h-4 text-orange-500" />
            Capture moment
          </button>
          <button
            onClick={() => markStopVisited(currentStop?.id || "")}
            disabled={!currentStop || !!currentStop?.isVisited}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:border-green-300 hover:bg-green-50 transition-all disabled:opacity-40"
            data-testid="button-mark-visited-quick"
          >
            <CheckCircle className="w-4 h-4 text-green-500" />
            Mark visited
          </button>
        </div>

        <div>
          <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wider mb-2 text-gray-400">All Stops</h3>
          <div className="space-y-1.5">
            {sortedStops.map((stop) => (
              <div
                key={stop.id}
                className={`flex items-center gap-3 rounded-xl border p-2.5 ${
                  stop.isVisited ? "bg-green-50 border-green-100" : "bg-white border-gray-100"
                }`}
                data-testid={`during-stop-${stop.id}`}
              >
                <span className="text-base">{getStopTypeEmoji(stop.stopType || "other")}</span>
                <p className={`text-sm font-semibold flex-1 min-w-0 truncate ${stop.isVisited ? "text-gray-400 line-through" : "text-gray-800"}`}>
                  {stop.name}
                </p>
                {stop.isVisited ? (
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                ) : (
                  <button
                    className="text-xs border border-orange-200 text-orange-600 hover:bg-orange-50 rounded-full px-2.5 py-1 font-medium shrink-0"
                    onClick={() => markStopVisited(stop.id)}
                    data-testid={`button-mark-visited-${stop.id}`}
                  >
                    Done
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <Button
        onClick={handleHandToKid}
        className="w-full bg-teal-500 hover:bg-teal-600 text-white rounded-xl h-12 font-bold text-sm shadow-sm gap-2 sticky bottom-0"
        data-testid="button-hand-to-kid"
      >
        <Compass className="w-4 h-4" />
        Hand to Kid →
      </Button>

      {showCapture && currentTrip && (
        <div className="fixed inset-0 z-[300] bg-black/50 flex items-end justify-center">
          <MomentCapture
            trip={currentTrip}
            stops={currentTripStops}
            isParentMode={true}
            onSave={async (data) => {
              await saveMoment({ tripId: currentTrip.id, ...data });
              setShowCapture(false);
              toast.success("Moment saved ✨");
            }}
            onClose={() => setShowCapture(false)}
          />
        </div>
      )}
    </div>
  );
}

function MemoriesTab() {
  const { currentTrip, currentTripStops, currentTripMoments, toggleFavorite, deleteMoment, saveMoment } = useTravel();
  const moments = currentTripMoments || [];
  const [showCapture, setShowCapture] = useState(false);
  const [showStoryLocked, setShowStoryLocked] = useState(false);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [generatedStory, setGeneratedStory] = useState<any>(null);

  const visitedStops = currentTripStops.filter(s => s.isVisited).length;
  const totalStops = currentTripStops.length;
  const isCompleted = currentTrip?.status === 'completed';
  const storyUnlocked = visitedStops >= 5 || isCompleted;

  const handleCreateStory = async () => {
    if (!storyUnlocked) {
      setShowStoryLocked(true);
      setTimeout(() => setShowStoryLocked(false), 3000);
      return;
    }
    if (!currentTrip) return;
    setIsGeneratingStory(true);
    try {
      const existingRes = await fetch(`/api/travel/trips/${currentTrip.id}/story`, {
        credentials: 'include',
      });
      
      if (existingRes.ok) {
        const story = await existingRes.json();
        setGeneratedStory(story);
      } else {
        const genRes = await fetch(`/api/travel/trips/${currentTrip.id}/story/regenerate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        if (genRes.ok) {
          const story = await genRes.json();
          setGeneratedStory(story);
        }
      }
    } catch (err) {
      console.error('Failed to generate story:', err);
      toast.error("Couldn't generate story — please try again");
    } finally {
      setIsGeneratingStory(false);
    }
  };

  return (
    <div className="p-4 space-y-4" data-testid="parent-hub-memories-tab">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-800 text-sm">Moments ({moments.length})</h3>
        <Button
          size="sm"
          onClick={() => setShowCapture(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white rounded-full text-xs h-8 px-4"
          data-testid="button-capture-moment"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Capture
        </Button>
      </div>

      {moments.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {moments.map((moment) => {
            const photoUrl = getMomentPhotoUrl(moment);
            return (
              <div
                key={moment.id}
                className="aspect-square rounded-xl bg-gray-200 overflow-hidden relative group"
                data-testid={`memory-${moment.id}`}
              >
                {photoUrl ? (
                  <img src={photoUrl} alt={(moment as any).title || 'Moment'} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-orange-50">
                    <Camera className="w-5 h-5 text-orange-300" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                  <p className="text-[10px] text-white font-medium truncate">{(moment as any).title || 'Moment'}</p>
                  <div className="flex items-center justify-between mt-1">
                    <button onClick={() => toggleFavorite(moment.id)} className="text-white">
                      <Heart className={`w-3 h-3 ${moment.isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                    </button>
                    <button onClick={() => deleteMoment(moment.id)} className="text-white hover:text-red-400">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 bg-white rounded-xl border border-gray-100">
          <Camera className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No moments captured yet</p>
          <p className="text-xs text-gray-300 mt-1">Tap "Capture" to add photos and notes</p>
        </div>
      )}

      <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-5 border border-orange-100" data-testid="create-our-story-section">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-5 h-5 text-orange-500" />
          <h3 className="font-bold text-gray-900">Create Our Story</h3>
        </div>
        <p className="text-sm text-gray-500 mb-3">Your adventure story awaits!</p>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          When you're done with your adventure, create your family's story! We'll weave together your moments, reflections, and discoveries into a keepsake you can read together.
        </p>
        <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
          <span className="flex items-center gap-1">
            <Camera className="w-3.5 h-3.5" />
            {moments.length} moments
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {visitedStops}/{totalStops} stops visited
          </span>
        </div>

        <div className="relative">
          <Button
            onClick={handleCreateStory}
            disabled={isGeneratingStory}
            className={`w-full rounded-full h-11 font-semibold text-sm ${
              storyUnlocked
                ? 'bg-orange-500 hover:bg-orange-600 text-white'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed hover:bg-gray-200'
            }`}
            data-testid="button-create-adventure-story"
          >
            {!storyUnlocked && <Lock className="w-4 h-4 mr-2" />}
            {isGeneratingStory ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <BookOpen className="w-4 h-4 mr-2" />
                Create Adventure Story
              </>
            )}
          </Button>

          {showStoryLocked && (
            <div className="absolute -top-16 left-0 right-0 bg-gray-800 text-white text-xs rounded-xl p-3 text-center shadow-lg animate-in fade-in slide-in-from-bottom-2">
              Adventure story will be available once you have completed at least 5 stops or finished your adventure.
            </div>
          )}
        </div>
      </div>

      {generatedStory && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm" data-testid="generated-story-view">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-orange-500" />
              <h3 className="font-bold text-gray-900">Your Adventure Story</h3>
            </div>
            <button
              onClick={() => setGeneratedStory(null)}
              className="p-1 rounded-full hover:bg-gray-100"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          {generatedStory.title && (
            <h4 className="font-bold text-gray-800 text-lg mb-2">{generatedStory.title}</h4>
          )}
          <div
            className="text-sm text-gray-700 leading-relaxed max-h-[40vh] overflow-y-auto prose prose-sm"
            dangerouslySetInnerHTML={{ __html: generatedStory.storyHtml || generatedStory.content || '' }}
          />
          <div className="mt-4 flex gap-2">
            <Button
              size="sm"
              onClick={async () => {
                if (!currentTrip) return;
                setIsGeneratingStory(true);
                try {
                  const res = await fetch(`/api/travel/trips/${currentTrip.id}/story/regenerate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                  });
                  if (res.ok) {
                    const story = await res.json();
                    setGeneratedStory(story);
                  }
                } catch (err) {
                  console.error('Failed to regenerate story:', err);
                } finally {
                  setIsGeneratingStory(false);
                }
              }}
              disabled={isGeneratingStory}
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-full text-xs h-8 px-4"
            >
              {isGeneratingStory ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}
              Regenerate
            </Button>
          </div>
        </div>
      )}

      {showCapture && currentTrip && (
        <div className="fixed inset-0 z-[260] bg-white">
          <MomentCapture
            trip={currentTrip}
            stops={currentTripStops}
            isParentMode={true}
            onSave={async (data) => {
              await saveMoment({ tripId: currentTrip.id, ...data });
              setShowCapture(false);
            }}
            onClose={() => setShowCapture(false)}
          />
        </div>
      )}
    </div>
  );
}

function ShareTab() {
  const { currentTrip, currentTripStops, currentTripMoments, trips } = useTravel();
  const sub2 = useSubscription();
  const videoEnabled2 = sub2.isPaidTier || sub2.isAdmin;
  const [shareInfo, setShareInfo] = useState<any>(undefined);
  const [showShare, setShowShare] = useState(false);
  const [showVideoMaker, setShowVideoMaker] = useState(false);

  const handleOpenShare = async () => {
    if (!currentTrip) return;
    try {
      const res = await fetch(`/api/travel/trips/${currentTrip.id}/share-status`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.shared) setShareInfo(data);
      }
    } catch {}
    setShowShare(true);
  };

  return (
    <div className="p-4 space-y-4" data-testid="parent-hub-share-tab">
      <div className="bg-white rounded-xl border border-gray-100 p-5 text-center">
        <Share2 className="w-8 h-8 text-orange-400 mx-auto mb-3" />
        <h3 className="font-bold text-gray-800 mb-1">Share Your Adventure</h3>
        <p className="text-sm text-gray-500 mb-4">Share your itinerary with family and friends</p>
        <Button
          className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-6"
          onClick={handleOpenShare}
          data-testid="button-share-itinerary"
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share Itinerary
        </Button>
      </div>

      {videoEnabled2 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 text-center">
          <Video className="w-8 h-8 text-purple-400 mx-auto mb-3" />
          <h3 className="font-bold text-gray-800 mb-1">Trip Video</h3>
          <p className="text-sm text-gray-500 mb-4">Create a video recap of your adventure</p>
          <Button
            className="rounded-full px-6 bg-purple-500 hover:bg-purple-600 text-white"
            onClick={() => setShowVideoMaker(true)}
            data-testid="button-make-video"
          >
            <Video className="w-4 h-4 mr-2" />
            Make Video
          </Button>
        </div>
      )}

      {showShare && currentTrip && (
        <ShareItineraryModal
          open={showShare}
          onOpenChange={setShowShare}
          trip={currentTrip}
          stopCount={currentTripStops.length}
          existingShare={shareInfo ? { ...shareInfo, publishedAt: shareInfo.publishedAt || null } : undefined}
          onShare={async (data) => {
            const res = await fetch(`/api/travel/trips/${currentTrip.id}/share`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), credentials: 'include' });
            const result = await res.json();
            setShareInfo(result);
            return result;
          }}
          onUnshare={async () => {
            await fetch(`/api/travel/trips/${currentTrip.id}/unshare`, { method: 'POST', credentials: 'include' });
            setShareInfo(undefined);
          }}
        />
      )}

      {showVideoMaker && currentTrip && (
        <div className="fixed inset-0 z-[260] bg-white overflow-auto">
          <TripVideoGenerator
            trip={currentTrip}
            moments={currentTripMoments || []}
            stops={currentTripStops}
            onClose={() => setShowVideoMaker(false)}
          />
        </div>
      )}
    </div>
  );
}

const HUB_WALLET_TYPES = [
  { id: "ticket", label: "Ticket", emoji: "🎟️" },
  { id: "receipt", label: "Receipt", emoji: "🧾" },
  { id: "confirmation", label: "Booking", emoji: "📋" },
  { id: "note", label: "Note", emoji: "📝" },
  { id: "other", label: "Other", emoji: "📌" },
];

function WalletTab() {
  const { currentTrip } = useTravel();
  const [walletItems, setWalletItems] = useState<TripWalletItem[]>([]);
  const [walletLoading, setWalletLoading] = useState(false);
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [addingWallet, setAddingWallet] = useState(false);
  const [walletForm, setWalletForm] = useState({
    label: "",
    type: "ticket",
    confirmationNumber: "",
    notes: "",
  });

  const loadWallet = async (trip: typeof currentTrip) => {
    if (!trip) return;
    setWalletLoading(true);
    try {
      const res = await fetch(`/api/travel/trips/${trip.id}/wallet`, { credentials: "include" });
      if (res.ok) {
        const data: TripWalletItem[] = await res.json();
        setWalletItems(data);
      }
    } catch (e) {
      console.error("Failed to load wallet:", e);
      toast.error("Couldn't load wallet — please refresh");
    } finally {
      setWalletLoading(false);
    }
  };

  useEffect(() => {
    if (currentTrip) loadWallet(currentTrip);
  }, [currentTrip?.id]);

  const handleAddWalletItem = async () => {
    if (!walletForm.label.trim() || !currentTrip) return;
    setAddingWallet(true);
    try {
      const res = await fetch(`/api/travel/trips/${currentTrip.id}/wallet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          label: walletForm.label.trim(),
          type: walletForm.type,
          confirmationNumber: walletForm.confirmationNumber.trim() || undefined,
          notes: walletForm.notes.trim() || undefined,
        }),
      });
      if (res.ok) {
        const item: TripWalletItem = await res.json();
        setWalletItems((prev) => [item, ...prev]);
        setWalletForm({ label: "", type: "ticket", confirmationNumber: "", notes: "" });
        setShowAddWallet(false);
      }
    } finally {
      setAddingWallet(false);
    }
  };

  const handleDeleteWalletItem = async (itemId: string) => {
    try {
      await fetch(`/api/travel/wallet/${itemId}`, { method: "DELETE", credentials: "include" });
      setWalletItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (e) {
      console.error("Failed to remove item:", e);
      toast.error("Couldn't remove item — please try again");
    }
  };

  return (
    <div className="p-4 space-y-4" data-testid="parent-hub-wallet-tab">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900 text-sm">Trip Wallet</h3>
          <p className="text-xs text-gray-400">Tickets, bookings & notes</p>
        </div>
        <Button
          size="sm"
          className="bg-orange-500 hover:bg-orange-600 text-white rounded-full h-8 px-3 text-xs"
          onClick={() => setShowAddWallet(true)}
          data-testid="button-add-wallet-item-hub"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add
        </Button>
      </div>

      {walletLoading ? (
        <div className="py-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-orange-400 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Loading wallet...</p>
        </div>
      ) : walletItems.length === 0 ? (
        <div className="text-center py-10">
          <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-3">
            <Wallet className="w-7 h-7 text-orange-300" />
          </div>
          <p className="text-sm font-semibold text-gray-600 mb-1">No items yet</p>
          <p className="text-xs text-gray-400 mb-4">Add tickets, bookings, and receipts</p>
          <Button
            size="sm"
            variant="outline"
            className="rounded-full"
            onClick={() => setShowAddWallet(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add First Item
          </Button>
        </div>
      ) : (
        <div className="space-y-2" data-testid="hub-wallet-items-list">
          {walletItems.map((item) => {
            const typeInfo = HUB_WALLET_TYPES.find((t) => t.id === item.type) || HUB_WALLET_TYPES[4];
            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-gray-100 p-3.5 shadow-sm"
                data-testid={`hub-wallet-item-${item.id}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl shrink-0">{typeInfo.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{item.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5 capitalize">{typeInfo.label}</p>
                    {item.confirmationNumber && (
                      <p className="text-xs font-mono text-orange-600 bg-orange-50 px-2 py-0.5 rounded mt-1 inline-block">
                        #{item.confirmationNumber}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-xs text-gray-500 mt-1">{item.notes}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteWalletItem(item.id)}
                    className="p-1 text-gray-300 hover:text-red-500 transition-colors shrink-0"
                    data-testid={`button-delete-hub-wallet-${item.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAddWallet && (
        <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/40">
          <div className="bg-white w-full max-w-lg rounded-t-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Add to Wallet</h3>
              <button onClick={() => setShowAddWallet(false)} className="p-1 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Type</label>
                <div className="flex gap-2 flex-wrap">
                  {HUB_WALLET_TYPES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setWalletForm((f) => ({ ...f, type: t.id }))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                        walletForm.type === t.id
                          ? "bg-orange-500 text-white border-orange-500"
                          : "bg-gray-50 text-gray-600 border-gray-200 hover:border-orange-300"
                      }`}
                      data-testid={`hub-wallet-type-${t.id}`}
                    >
                      {t.emoji} {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Label *</label>
                <input
                  type="text"
                  value={walletForm.label}
                  onChange={(e) => setWalletForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="e.g., Museum Entry Ticket"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  autoFocus
                  data-testid="input-hub-wallet-label"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Confirmation / Booking # (optional)</label>
                <input
                  type="text"
                  value={walletForm.confirmationNumber}
                  onChange={(e) => setWalletForm((f) => ({ ...f, confirmationNumber: e.target.value }))}
                  placeholder="e.g., ABC123"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  data-testid="input-hub-wallet-confirmation"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Notes (optional)</label>
                <textarea
                  value={walletForm.notes}
                  onChange={(e) => setWalletForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Any extra details..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
                  data-testid="input-hub-wallet-notes"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <Button variant="outline" className="flex-1 rounded-full" onClick={() => setShowAddWallet(false)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-full"
                  onClick={handleAddWalletItem}
                  disabled={!walletForm.label.trim() || addingWallet}
                  data-testid="button-confirm-hub-wallet-item"
                >
                  {addingWallet ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                  {addingWallet ? "Adding..." : "Add to Wallet"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionButton({ icon: Icon, label, color, onClick, render }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  onClick?: () => void;
  render?: React.ReactNode;
}) {
  const colorMap: Record<string, string> = {
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    green: "bg-green-50 text-green-600 border-green-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
    pink: "bg-pink-50 text-pink-600 border-pink-100",
  };

  if (render) {
    return <div data-testid={`action-${label.toLowerCase().replace(/\s/g, '-')}`}>{render}</div>;
  }

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold border transition-colors hover:opacity-80 ${colorMap[color] || colorMap.orange}`}
      data-testid={`action-${label.toLowerCase().replace(/\s/g, '-')}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}
