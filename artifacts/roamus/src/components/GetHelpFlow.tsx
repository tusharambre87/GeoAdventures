import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowLeft, Navigation, Phone, MapPin, Plus, Trash2, User } from "lucide-react";

type HelpScreen = "home" | "unwell" | "emergency" | "lost";

interface NearbyPlace {
  name: string;
  type: "urgent_care" | "pharmacy" | "hospital";
  distanceMeters: number;
  lat: number;
  lng: number;
  phone?: string;
  isOpen?: boolean;
}

interface StayLocation {
  cityName?: string;
  name: string;
  address: string;
}

interface EmergencyContact {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface GetHelpFlowProps {
  open: boolean;
  onClose: () => void;
  cityName?: string;
  tripDestination?: string;
  stayLocations?: StayLocation[] | null;
  fallbackLat?: number | null;
  fallbackLng?: number | null;
}

const CONTACTS_KEY = "geoquest_emergency_contacts_v1";

function loadContacts(): EmergencyContact[] {
  try {
    const raw = localStorage.getItem(CONTACTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveContacts(contacts: EmergencyContact[]): void {
  try { localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts)); } catch { /* ignore */ }
}

function isUSCoordinates(lat: number, lng: number): boolean {
  if (lat >= 24 && lat <= 50 && lng >= -125 && lng <= -66) return true;
  if (lat >= 18 && lat <= 23 && lng >= -162 && lng <= -154) return true;
  if (lat >= 54 && lat <= 72 && lng >= -170 && lng <= -130) return true;
  return false;
}

function isUSByName(destination?: string, cityName?: string): boolean {
  const text = `${destination ?? ""} ${cityName ?? ""}`.toLowerCase();
  return /\b(usa|us |u\.s\.|united states|chicago|new york|los angeles|houston|phoenix|dallas|san francisco|seattle|denver|boston|miami|atlanta|las vegas|nashville|washington)\b/.test(text);
}

function distanceLabel(meters: number, useMiles: boolean): string {
  if (useMiles) {
    const miles = meters / 1609.34;
    if (miles < 0.2) return "nearby";
    return `${miles.toFixed(1)} mi away`;
  }
  const km = meters / 1000;
  if (km < 0.5) return "nearby";
  return `${km.toFixed(1)} km away`;
}

function detectEmergencyNumber(destination?: string, cityName?: string): string {
  const text = `${destination ?? ""} ${cityName ?? ""}`.toLowerCase();
  if (/\b(usa|us |u\.s\.|united states|canada|chicago|new york|los angeles|houston|phoenix|dallas|san francisco|seattle|denver|boston|miami|atlanta|las vegas|nashville|toronto|vancouver|montreal|calgary|ottawa|edmonton|winnipeg)\b/.test(text)) return "911";
  if (/\b(uk|united kingdom|england|scotland|wales|britain|london|manchester|birmingham|glasgow|liverpool|bristol|edinburgh|cardiff|belfast|sheffield|leeds)\b/.test(text)) return "999";
  if (/\b(australia|new zealand|sydney|melbourne|brisbane|perth|adelaide|canberra|auckland|wellington|christchurch)\b/.test(text)) return "000";
  return "112";
}

function mapsDirectionsUrl(address: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

function mapsPlaceUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

function mapsCurrentLocationUrl(lat?: number, lng?: number): string {
  if (lat != null && lng != null) return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  return "https://maps.google.com/?q=my+location";
}

const PLACE_META: Record<NearbyPlace["type"], { icon: string; label: string }> = {
  urgent_care: { icon: "🏥", label: "Urgent Care" },
  pharmacy:    { icon: "💊", label: "Pharmacy" },
  hospital:    { icon: "🏥", label: "Hospital" },
};

function PlaceCard({ place, useMiles }: { place: NearbyPlace; useMiles: boolean }) {
  const meta = PLACE_META[place.type];
  return (
    <div
      className="rounded-2xl bg-white px-4 py-4"
      style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.07)", border: "1px solid #F0F0F0" }}
      data-testid={`help-place-card-${place.type}`}
    >
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl leading-none shrink-0">{meta.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{meta.label}</p>
          <p className="text-base font-bold text-slate-900 leading-tight truncate">{place.name}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-slate-500 font-medium">{distanceLabel(place.distanceMeters, useMiles)}</span>
            {place.isOpen != null && (
              <>
                <span className="text-slate-300">·</span>
                <span className={`text-sm font-semibold flex items-center gap-1 ${place.isOpen ? "text-emerald-600" : "text-slate-400"}`}>
                  {place.isOpen ? (
                    <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Open now</>
                  ) : "Closed"}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <a
          href={mapsPlaceUrl(place.lat, place.lng)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity active:opacity-80"
          style={{ background: "#D4872B" }}
          data-testid={`help-directions-${place.type}`}
        >
          <Navigation className="w-3.5 h-3.5" />
          Get directions
        </a>
        {place.phone && (
          <a
            href={`tel:${place.phone}`}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-700 transition-colors hover:bg-slate-50 active:opacity-80"
            data-testid={`help-call-${place.type}`}
          >
            <Phone className="w-3.5 h-3.5" />
            Call
          </a>
        )}
      </div>
    </div>
  );
}

function ScreenHome({ onSelect }: { onSelect: (s: HelpScreen) => void }) {
  const OPTIONS: { screen: HelpScreen; emoji: string; label: string; sub: string }[] = [
    { screen: "unwell",    emoji: "🤕", label: "Not feeling well",  sub: "Find urgent care or a pharmacy nearby" },
    { screen: "emergency", emoji: "😰", label: "Need urgent help",  sub: "Call emergency services or a contact" },
    { screen: "lost",      emoji: "📍", label: "We're lost",        sub: "Get back to your hotel or a safe place" },
  ];
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-2 pb-5">
        <h2 className="text-2xl font-black text-slate-900 mb-1">What's going on?</h2>
        <p className="text-sm text-slate-500 font-medium">We'll help you figure this out quickly</p>
      </div>
      <div className="px-5 space-y-3 pb-6">
        {OPTIONS.map(opt => (
          <button
            key={opt.screen}
            onClick={() => onSelect(opt.screen)}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl bg-white text-left transition-all active:scale-[0.98]"
            style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.07)", border: "1px solid #F0F0F0" }}
            data-testid={`help-option-${opt.screen}`}
          >
            <span className="text-3xl leading-none shrink-0">{opt.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-slate-900 leading-tight">{opt.label}</p>
              <p className="text-sm text-slate-500 mt-0.5 leading-snug">{opt.sub}</p>
            </div>
            <span className="text-slate-300 text-lg shrink-0">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ScreenUnwell({
  fallbackLat,
  fallbackLng,
  tripDestination,
  cityName,
}: {
  fallbackLat?: number | null;
  fallbackLng?: number | null;
  tripDestination?: string;
  cityName?: string;
}) {
  const [places, setPlaces] = useState<NearbyPlace[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [gpsError, setGpsError] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [useMiles, setUseMiles] = useState(() => isUSByName(tripDestination, cityName));

  const fetchPlaces = useCallback((lat: number, lng: number) => {
    setUseMiles(isUSCoordinates(lat, lng));
    fetch(`/api/help/nearby?lat=${lat}&lng=${lng}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => setPlaces(d.places || []))
      .catch(() => setPlaces([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      if (fallbackLat != null && fallbackLng != null) {
        setUsingFallback(true);
        fetchPlaces(fallbackLat, fallbackLng);
      } else {
        setGpsError(true);
        setLoading(false);
      }
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => fetchPlaces(pos.coords.latitude, pos.coords.longitude),
      () => {
        if (fallbackLat != null && fallbackLng != null) {
          setUsingFallback(true);
          fetchPlaces(fallbackLat, fallbackLng);
        } else {
          setGpsError(true);
          setLoading(false);
        }
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  }, [fetchPlaces, fallbackLat, fallbackLng]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 px-8 text-center gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-slate-200 border-t-slate-600 animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Finding care near you…</p>
      </div>
    );
  }

  const radiusText = useMiles ? "6 miles" : "10km";

  if (gpsError || !places || places.length === 0) {
    const destination = gpsError ? "urgent+care+near+me" : "hospital+urgent+care+near+me";
    return (
      <div className="px-5 space-y-4">
        <p className="text-sm text-slate-500 leading-relaxed">
          {gpsError
            ? "Turn on location to find care nearby."
            : `No results found within ${radiusText}. Search in Maps for more options.`}
        </p>
        <a
          href={`https://maps.google.com/?q=${destination}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white text-sm font-bold"
          style={{ background: "#D4872B" }}
          data-testid="help-maps-search-fallback"
        >
          <MapPin className="w-4 h-4" />
          Search urgent care in Maps
        </a>
        <a
          href="https://maps.google.com/?q=pharmacy+near+me"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold border border-slate-200 text-slate-700"
          data-testid="help-maps-pharmacy-fallback"
        >
          <MapPin className="w-4 h-4" />
          Find a pharmacy in Maps
        </a>
      </div>
    );
  }

  return (
    <div className="px-5 space-y-3 pb-6">
      {usingFallback && (
        <p className="text-xs text-slate-400 font-medium mb-1">
          📍 Showing care near your current stop
        </p>
      )}
      {places.map((p, i) => <PlaceCard key={`${p.type}-${i}`} place={p} useMiles={useMiles} />)}
    </div>
  );
}

function ContactRow({
  contact,
  onDelete,
}: {
  contact: EmergencyContact;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
        <User className="w-4 h-4 text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-800 truncate">{contact.name}</p>
        {contact.email && <p className="text-xs text-slate-400 truncate">{contact.email}</p>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {contact.phone && (
          <a
            href={`tel:${contact.phone}`}
            className="flex items-center justify-center w-9 h-9 rounded-xl text-white transition-opacity active:opacity-80"
            style={{ background: "#D4872B" }}
            data-testid={`help-contact-call-${contact.id}`}
            title={`Call ${contact.name}`}
          >
            <Phone className="w-4 h-4" />
          </a>
        )}
        <button
          onClick={() => onDelete(contact.id)}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-50 transition-colors"
          data-testid={`help-contact-delete-${contact.id}`}
          title="Remove contact"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function ScreenEmergency({
  tripDestination,
  cityName,
  stayLocations,
}: {
  tripDestination?: string;
  cityName?: string;
  stayLocations?: StayLocation[] | null;
}) {
  const number = detectEmergencyNumber(tripDestination, cityName);
  const hotel = stayLocations?.[0];

  const [contacts, setContacts] = useState<EmergencyContact[]>(() => loadContacts());
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    if (!formName.trim()) return;
    const newContact: EmergencyContact = {
      id: Date.now().toString(),
      name: formName.trim(),
      email: formEmail.trim(),
      phone: formPhone.trim(),
    };
    const updated = [...contacts, newContact];
    setContacts(updated);
    saveContacts(updated);
    setFormName("");
    setFormEmail("");
    setFormPhone("");
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    const updated = contacts.filter(c => c.id !== id);
    setContacts(updated);
    saveContacts(updated);
  };

  useEffect(() => {
    if (showForm) setTimeout(() => nameRef.current?.focus(), 50);
  }, [showForm]);

  return (
    <div className="px-5 space-y-5 pb-6">
      {/* Emergency services card */}
      <div
        className="rounded-2xl px-4 py-5 text-center"
        style={{ background: "#EFF6FF", border: "1.5px solid #BFDBFE" }}
      >
        <p className="text-4xl mb-2">📞</p>
        <p className="text-lg font-black text-slate-900 mb-1">Call emergency services</p>
        <p className="text-sm text-slate-500 mb-4">Local emergency number: <strong className="text-slate-700">{number}</strong></p>
        <a
          href={`tel:${number}`}
          className="block w-full py-4 rounded-2xl text-white text-base font-black transition-opacity active:opacity-80"
          style={{ background: "#D4872B" }}
          data-testid="help-call-emergency"
        >
          📞 Call emergency services
        </a>
      </div>

      {hotel && (
        <p className="text-sm text-slate-400 text-center font-medium">
          You can also contact your hotel for help
        </p>
      )}

      {/* Emergency contacts section */}
      <div
        className="rounded-2xl bg-white px-4 py-4"
        style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.07)", border: "1px solid #F0F0F0" }}
        data-testid="help-emergency-contacts"
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Emergency Contacts</p>
            <p className="text-xs text-slate-400 mt-0.5">Family or friends to call in an emergency</p>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white transition-opacity active:opacity-80"
              style={{ background: "#D4872B" }}
              data-testid="help-add-contact-btn"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          )}
        </div>

        {contacts.length > 0 && (
          <div className="mb-3">
            {contacts.map(c => (
              <ContactRow key={c.id} contact={c} onDelete={handleDelete} />
            ))}
          </div>
        )}

        {contacts.length === 0 && !showForm && (
          <p className="text-sm text-slate-400 italic text-center py-2">No contacts saved yet</p>
        )}

        {showForm && (
          <div className="space-y-2 pt-1" data-testid="help-contact-form">
            <input
              ref={nameRef}
              type="text"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              placeholder="Name *"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 outline-none focus:border-slate-400 transition-colors"
              data-testid="help-contact-name"
            />
            <input
              type="email"
              value={formEmail}
              onChange={e => setFormEmail(e.target.value)}
              placeholder="Email (optional)"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 outline-none focus:border-slate-400 transition-colors"
              data-testid="help-contact-email"
            />
            <div className="flex items-center gap-2">
              <input
                type="tel"
                value={formPhone}
                onChange={e => setFormPhone(e.target.value)}
                placeholder="Phone number"
                className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 outline-none focus:border-slate-400 transition-colors"
                data-testid="help-contact-phone"
              />
              {formPhone.trim() && (
                <a
                  href={`tel:${formPhone.trim()}`}
                  className="flex items-center justify-center w-10 h-10 rounded-xl text-white shrink-0 transition-opacity active:opacity-80"
                  style={{ background: "#D4872B" }}
                  data-testid="help-contact-phone-call-preview"
                  title="Call this number"
                >
                  <Phone className="w-4 h-4" />
                </a>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { setShowForm(false); setFormName(""); setFormEmail(""); setFormPhone(""); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50"
                data-testid="help-contact-cancel"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!formName.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity active:opacity-80 disabled:opacity-40"
                style={{ background: "#D4872B" }}
                data-testid="help-contact-save"
              >
                Save contact
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ScreenLost({
  tripDestination,
  stayLocations,
}: {
  tripDestination?: string;
  stayLocations?: StayLocation[] | null;
}) {
  const [currentLat, setCurrentLat] = useState<number | undefined>();
  const [currentLng, setCurrentLng] = useState<number | undefined>();
  const [hotelInput, setHotelInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      pos => { setCurrentLat(pos.coords.latitude); setCurrentLng(pos.coords.longitude); },
      () => {},
      { timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  const hotel = stayLocations?.[0];

  return (
    <div className="px-5 space-y-3 pb-6">
      {hotel ? (
        <div
          className="rounded-2xl bg-white px-4 py-4"
          style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.07)", border: "1px solid #F0F0F0" }}
          data-testid="help-lost-hotel-card"
        >
          <div className="flex items-start gap-3 mb-3">
            <span className="text-2xl leading-none shrink-0">🏨</span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Your hotel</p>
              <p className="text-base font-bold text-slate-900 leading-tight truncate">{hotel.name}</p>
              {hotel.address && (
                <p className="text-xs text-slate-400 mt-0.5 truncate">{hotel.address}</p>
              )}
            </div>
          </div>
          <a
            href={mapsDirectionsUrl(hotel.address || hotel.name)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity active:opacity-80"
            style={{ background: "#D4872B" }}
            data-testid="help-lost-navigate-hotel"
          >
            <Navigation className="w-3.5 h-3.5" />
            Navigate back
          </a>
        </div>
      ) : (
        <div
          className="rounded-2xl bg-white px-4 py-4"
          style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.07)", border: "1px solid #F0F0F0" }}
          data-testid="help-lost-hotel-entry"
        >
          <div className="flex items-start gap-3 mb-3">
            <span className="text-2xl leading-none shrink-0">🏨</span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Your hotel</p>
              <p className="text-sm text-slate-500 leading-snug">Enter your hotel name or address to navigate back</p>
            </div>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={hotelInput}
            onChange={e => setHotelInput(e.target.value)}
            placeholder="Hotel name or address…"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 mb-3 outline-none focus:border-slate-400 transition-colors"
            data-testid="help-lost-hotel-input"
          />
          {hotelInput.trim() ? (
            <a
              href={mapsDirectionsUrl(hotelInput.trim())}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity active:opacity-80"
              style={{ background: "#D4872B" }}
              data-testid="help-lost-navigate-typed"
            >
              <Navigation className="w-3.5 h-3.5" />
              Navigate there
            </a>
          ) : (
            <div
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-slate-400"
              style={{ background: "#F5F5F5" }}
            >
              <Navigation className="w-3.5 h-3.5" />
              Navigate there
            </div>
          )}
        </div>
      )}

      <div
        className="rounded-2xl bg-white px-4 py-4"
        style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.07)", border: "1px solid #F0F0F0" }}
        data-testid="help-lost-location-card"
      >
        <div className="flex items-start gap-3 mb-3">
          <span className="text-2xl leading-none shrink-0">📍</span>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Your location</p>
            <p className="text-base font-bold text-slate-900 leading-tight">Current position</p>
          </div>
        </div>
        <a
          href={mapsCurrentLocationUrl(currentLat, currentLng)}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-700 transition-colors hover:bg-slate-50 active:opacity-80"
          data-testid="help-lost-open-maps"
        >
          <MapPin className="w-3.5 h-3.5" />
          Open in Maps
        </a>
      </div>
    </div>
  );
}

const SCREEN_TITLES: Record<HelpScreen, string> = {
  home:      "Help near you",
  unwell:    "Care near you",
  emergency: "Emergency",
  lost:      "Get back safely",
};

export function GetHelpFlow({ open, onClose, cityName, tripDestination, stayLocations, fallbackLat, fallbackLng }: GetHelpFlowProps) {
  const [screen, setScreen] = useState<HelpScreen>("home");

  useEffect(() => {
    if (open) {
      setScreen("home");
      try { navigator.vibrate?.(10); } catch { /* ignore */ }
    }
  }, [open]);

  const handleClose = () => {
    onClose();
    setTimeout(() => setScreen("home"), 300);
  };

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="get-help-overlay"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="fixed inset-0 flex flex-col"
          style={{ zIndex: 10100, background: "#F8F9FA" }}
          data-testid="get-help-flow"
        >
          {/* Header */}
          <div
            className="flex items-center px-4 pt-12 pb-4"
            style={{ background: "white", borderBottom: "1px solid #F0F0F0" }}
          >
            {screen !== "home" ? (
              <button
                onClick={() => setScreen("home")}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors mr-2"
                data-testid="help-back"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
            ) : (
              <div className="w-9 mr-2" />
            )}
            <h1 className="text-base font-bold text-slate-900 flex-1">{SCREEN_TITLES[screen]}</h1>
            <button
              onClick={handleClose}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
              data-testid="help-close"
            >
              <X className="w-4 h-4 text-slate-600" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto pt-5">
            <AnimatePresence mode="wait">
              {screen === "home" && (
                <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  <ScreenHome onSelect={setScreen} />
                </motion.div>
              )}
              {screen === "unwell" && (
                <motion.div key="unwell" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  <ScreenUnwell
                    fallbackLat={fallbackLat}
                    fallbackLng={fallbackLng}
                    tripDestination={tripDestination}
                    cityName={cityName}
                  />
                </motion.div>
              )}
              {screen === "emergency" && (
                <motion.div key="emergency" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  <ScreenEmergency tripDestination={tripDestination} cityName={cityName} stayLocations={stayLocations} />
                </motion.div>
              )}
              {screen === "lost" && (
                <motion.div key="lost" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  <ScreenLost tripDestination={tripDestination} stayLocations={stayLocations} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
