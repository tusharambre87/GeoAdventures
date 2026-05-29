import { useState, useMemo, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useUser } from "@/lib/userContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useFreeLimits } from "@/hooks/useFreeLimits";
import { ArrowLeft, Shield } from "lucide-react";
import { toast } from "sonner";
import { SignUpPrompt } from "@/components/SignUpPrompt";

type Band = "A" | "B" | "C";

const TRIP_PRICES: Record<Band, { amount: string; founding: string; currency: string }> = {
  A: { amount: "$9.99", founding: "$5.99", currency: "USD" },
  B: { amount: "€7.99", founding: "€5.99", currency: "EUR" },
  C: { amount: "₹199",  founding: "₹149",  currency: "INR" },
};

const BUNDLE_PRICES: Record<Band, { label: string }> = {
  A: { label: "$14.99" },
  B: { label: "€10.99" },
  C: { label: "₹299" },
};

const KID_QUOTES = [
  { quote: "The ledge was so cool, it made cars look like ants.", name: "Travis", trip: "Chicago Trip" },
  { quote: "The tram to the arch made me feel like an astronaut.", name: "Avir", trip: "Saint Louis Trip" },
  { quote: "I'm in love with the Taj Mahal.", name: "Myra", trip: "Agra Trip" },
  { quote: "This bridge literally disappeared into the clouds.", name: "Bradley", trip: "San Francisco Trip" },
  { quote: "I didn't want to leave. Ever.", name: "Cleo", trip: "Kyoto Trip" },
  { quote: "The castle smelled like real history.", name: "Finn", trip: "Edinburgh Trip" },
  { quote: "We saw a real street performer and he looked at ME.", name: "Zara", trip: "Barcelona Trip" },
];

const WHAT_YOU_GET = [
  "Follow your day step-by-step — no guessing",
  "Know exactly what to do at each stop",
  "Keep kids engaged with stories and mini-missions",
  "Adjust instantly for food, breaks, and weather",
  "Capture memories after the trip",
];

const FOUNDING_SPOTS_REMAINING = 41;

export default function TripUnlock() {
  const [, setLocation] = useLocation();
  const searchStr = useSearch();
  const { user, isLoading: userLoading } = useUser();
  const { isPaidTier } = useSubscription();
  const { recordPaidTripUnlocked } = useFreeLimits();
  const [isLoading, setIsLoading] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [useFoundingPrice, setUseFoundingPrice] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [pendingUnlock, setPendingUnlock] = useState(false);
  const [bundleOption, setBundleOption] = useState<"trip_only" | "trip_geopass">("trip_only");

  // Promo code state
  const [promoExpanded, setPromoExpanded] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promoValidating, setPromoValidating] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [promoData, setPromoData] = useState<{
    accessType: "full_free" | "discounted";
    discountedAmount?: number;
    label?: string;
    code: string;
  } | null>(null);

  const params = useMemo(() => new URLSearchParams(searchStr), [searchStr]);
  const destination = params.get("destination") || "Your Destination";
  const country = params.get("country") || "";
  const days = params.get("days");
  const stops = params.get("stops");
  const tripId = params.get("tripId");
  const returnUrl = params.get("returnUrl")
    ? decodeURIComponent(params.get("returnUrl")!)
    : tripId
      ? `/adventure/${tripId}/parent-plan`
      : "/build-adventure";

  const band: Band = (user?.pricingBand as Band | undefined) ?? "A";
  const pricing = TRIP_PRICES[band];
  const isFoundingMember = !!user?.isFoundingFamily;
  const kidEntry = useMemo(() => KID_QUOTES[Math.floor(Math.random() * KID_QUOTES.length)], []);

  const promoDisplayPrice = promoData?.discountedAmount
    ? (band === "A" ? `$${(promoData.discountedAmount / 100).toFixed(2)}` : band === "B" ? `€${(promoData.discountedAmount / 100).toFixed(2)}` : `₹${promoData.discountedAmount / 100}`)
    : null;

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoValidating(true);
    setPromoError("");
    try {
      const res = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: promoInput.trim().toUpperCase(), destination, tripId: tripId || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPromoError(data.error || "Invalid code");
      } else {
        setPromoData({ ...data, code: promoInput.trim().toUpperCase() });
        setUseFoundingPrice(false);
        setPromoError("");
      }
    } catch {
      setPromoError("Could not validate code. Try again.");
    } finally {
      setPromoValidating(false);
    }
  };

  useEffect(() => {
    if (params.get("tripUnlocked") === "true") {
      recordPaidTripUnlocked();
      setShowSuccess(true);
    }
  }, [params, recordPaidTripUnlocked]);

  const handleUnlock = async () => {
    if (userLoading) return;
    if (!user) {
      setPendingUnlock(true);
      setShowSignup(true);
      return;
    }

    if (isPaidTier) {
      setLocation(returnUrl);
      return;
    }

    // Bundle with GeoPass — retired, route to home
    if (bundleOption === "trip_geopass") {
      setLocation("/");
      return;
    }

    // Full-free promo: skip Stripe
    if (promoData?.accessType === "full_free") {
      setIsLoading(true);
      try {
        const res = await fetch("/api/promo/redeem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ code: promoData.code, destination, tripId: tripId || null }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "Could not apply promo code.");
          return;
        }
        setShowSuccess(true);
      } catch {
        toast.error("Something went wrong. Please try again.");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    try {
      const resp = await fetch("/api/stripe/checkout/trip-unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          useFoundingPrice,
          tripId,
          returnUrl,
          destination,
          promoCode: promoData?.accessType === "discounted" ? promoData.code : undefined,
        }),
        credentials: "include",
      });
      const data = await resp.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // After signup, once user is hydrated and pendingUnlock is set, auto-proceed
  useEffect(() => {
    if (pendingUnlock && user) {
      setPendingUnlock(false);
      handleUnlock();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, pendingUnlock]);

  if (showSuccess) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          background: "linear-gradient(160deg, #0f172a 0%, #0d2a0d 60%, #0f172a 100%)",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 24px",
          textAlign: "center",
        }}
        data-testid="trip-unlock-success"
      >
        <div style={{ fontSize: 64, marginBottom: 24 }}>✨</div>
        <h1 style={{ fontSize: 30, fontWeight: 900, marginBottom: 12, lineHeight: 1.1 }}>
          Your trip is unlocked
        </h1>
        <p style={{ fontSize: 16, color: "rgba(255,255,255,0.6)", marginBottom: 8, lineHeight: 1.5 }}>
          {destination} is ready to go.
        </p>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 40, lineHeight: 1.5 }}>
          Everything is set up for your family. Have an amazing trip.
        </p>
        <button
          onClick={() => setLocation(returnUrl)}
          style={{
            background: "linear-gradient(135deg, #E8962F 0%, #D4872B 100%)",
            color: "#fff",
            fontSize: 17,
            fontWeight: 800,
            border: "none",
            borderRadius: 16,
            padding: "16px 40px",
            cursor: "pointer",
            boxShadow: "0 8px 24px rgba(212,135,43,0.4)",
          }}
          data-testid="button-go-to-trip"
        >
          Go to my trip →
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#0f172a",
        color: "#fff",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      }}
      data-testid="trip-unlock-page"
    >
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 0 48px 0" }}>

        {/* Nav */}
        <div style={{ padding: "20px 20px 0" }}>
          <button
            onClick={() => setLocation(returnUrl)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "rgba(255,255,255,0.5)",
              fontSize: 14,
              fontWeight: 600,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
            data-testid="button-back-trip-unlock"
          >
            <ArrowLeft size={16} />
            Back
          </button>
        </div>

        {/* Section 1: Header */}
        <div style={{ padding: "24px 20px 0" }}>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>
            Your trip
          </p>
          <h1 style={{ fontSize: 30, fontWeight: 900, lineHeight: 1.1, marginBottom: 8, color: "#fff" }}>
            Unlock your trip
          </h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
            Everything you need to make this trip actually work
          </p>
        </div>

        {/* Section 2: Trip snapshot */}
        <div style={{ margin: "20px 20px 0", background: "rgba(255,255,255,0.06)", borderRadius: 16, padding: "16px 18px", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(232,150,47,0.18)", border: "1.5px solid rgba(232,150,47,0.35)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 18 }}>✈️</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 800, fontSize: 16, color: "#fff", marginBottom: 3, lineHeight: 1.2 }}>
                {destination}{country ? `, ${country}` : ""}
              </p>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 8 }}>
                {[days && `${days} day${Number(days) !== 1 ? "s" : ""}`, stops && `${stops} stop${Number(stops) !== 1 ? "s" : ""}`].filter(Boolean).join(" · ")}
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["Built for your family", "Kid-friendly pacing"].map((tag, i) => (
                  <span key={i} style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.07)", borderRadius: 20, padding: "3px 10px" }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: What you get */}
        <div style={{ margin: "20px 20px 0" }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>
            What's included
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {WHAT_YOU_GET.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ width: 22, height: 22, borderRadius: 11, background: "rgba(34,197,94,0.18)", border: "1px solid rgba(34,197,94,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                  <span style={{ color: "#4ade80", fontSize: 12 }}>✓</span>
                </div>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.78)", lineHeight: 1.4, fontWeight: 500 }}>{item}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Section 4: Named kid quote */}
        <div style={{ margin: "20px 20px 0", borderLeft: "3px solid #E8962F", paddingLeft: 16 }}>
          <p style={{ fontSize: 16, color: "#fff", fontWeight: 700, fontStyle: "italic", lineHeight: 1.45, marginBottom: 7 }}>
            "{kidEntry.quote}"
          </p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 600, letterSpacing: 0.3 }}>
            — {kidEntry.name}, {kidEntry.trip}
          </p>
        </div>

        {/* Section 5: Price */}
        <div style={{ margin: "20px 20px 0", background: "rgba(255,255,255,0.05)", borderRadius: 20, padding: "22px 20px 18px", border: `1px solid ${useFoundingPrice ? "rgba(232,150,47,0.25)" : "rgba(255,255,255,0.1)"}` }}>

          {/* Header — changes when founding is active */}
          {useFoundingPrice ? (
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
              <span style={{ fontSize: 15 }}>🔥</span>
              <p style={{ fontSize: 13, fontWeight: 800, color: "#E8962F", letterSpacing: 0.2 }}>
                Founding price unlocked
              </p>
            </div>
          ) : (
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 10 }}>
              One-time payment
            </p>
          )}

          {/* Main price */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: useFoundingPrice || promoData ? 4 : 16 }}>
            <span style={{ fontSize: 44, fontWeight: 900, color: "#fff", lineHeight: 1 }}>
              {promoDisplayPrice || (useFoundingPrice ? pricing.founding : pricing.amount)}
            </span>
            <span style={{ fontSize: 16, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>
              per trip
            </span>
          </div>

          {/* Founding status line — only when active */}
          {useFoundingPrice && !promoData && (
            <p style={{ fontSize: 12, color: "rgba(232,150,47,0.7)", fontWeight: 600, marginBottom: 16, letterSpacing: 0.1 }}>
              Early supporter pricing — limited spots
            </p>
          )}

          {/* Promo applied line */}
          {promoData && (
            <p style={{ fontSize: 12, color: "#4ade80", fontWeight: 600, marginBottom: 16 }}>
              {promoData.accessType === "full_free" ? "🎉 Promo applied — trip unlocks for free!" : `🏷️ Promo applied — ${promoData.label || "discount"}`}
            </p>
          )}

          {/* Reassurances */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {[
              "No subscription",
              "No hidden fees",
              "Unlocks your full trip",
              "Valid for your entire trip duration",
            ].map((line, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 16, height: 16, borderRadius: 8, background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 10 }}>✓</span>
                </span>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>{line}</p>
              </div>
            ))}
          </div>

          {/* Bundle selector */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Choose your option</p>

            <button
              onClick={() => setBundleOption("trip_only")}
              style={{
                display: "flex", alignItems: "flex-start", gap: 12,
                background: bundleOption === "trip_only" ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
                border: bundleOption === "trip_only" ? "2px solid rgba(232,150,47,0.7)" : "2px solid rgba(255,255,255,0.08)",
                borderRadius: 14, padding: "12px 14px", cursor: "pointer", textAlign: "left",
              }}
              data-testid="button-bundle-trip-only-unlock"
            >
              <div style={{ width: 18, height: 18, borderRadius: 9, border: `2px solid ${bundleOption === "trip_only" ? "#E8962F" : "rgba(255,255,255,0.3)"}`, background: bundleOption === "trip_only" ? "#E8962F" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                {bundleOption === "trip_only" && <div style={{ width: 6, height: 6, borderRadius: 3, background: "#fff" }} />}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 3 }}>Unlock this trip — {pricing.amount}</p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.4 }}>Full itinerary · Stories + games for kids · Works during your trip</p>
              </div>
            </button>

            <button
              onClick={() => setBundleOption("trip_geopass")}
              style={{
                display: "flex", alignItems: "flex-start", gap: 12,
                background: bundleOption === "trip_geopass" ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.03)",
                border: bundleOption === "trip_geopass" ? "2px solid rgba(99,102,241,0.7)" : "2px solid rgba(255,255,255,0.08)",
                borderRadius: 14, padding: "12px 14px", cursor: "pointer", textAlign: "left", position: "relative",
              }}
              data-testid="button-bundle-trip-geopass-unlock"
            >
              <div style={{ position: "absolute", top: -10, right: 12, background: "#6366f1", color: "#fff", fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 20, letterSpacing: 0.5 }}>BEST VALUE</div>
              <div style={{ width: 18, height: 18, borderRadius: 9, border: `2px solid ${bundleOption === "trip_geopass" ? "#6366f1" : "rgba(255,255,255,0.3)"}`, background: bundleOption === "trip_geopass" ? "#6366f1" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                {bundleOption === "trip_geopass" && <div style={{ width: 6, height: 6, borderRadius: 3, background: "#fff" }} />}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 3 }}>Best experience for your child — {BUNDLE_PRICES[band].label}</p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.4 }}>Everything in this trip · Unlimited travel games for 3 months · Keeps them engaged after the trip</p>
              </div>
            </button>

            {bundleOption === "trip_geopass" && (
              <p style={{ fontSize: 11, color: "rgba(99,102,241,0.7)", textAlign: "center", fontStyle: "italic" }}>
                Most families choose this to keep the experience going after the trip.
              </p>
            )}
          </div>

          {/* Founding member section — always visible */}
          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,0.08)",
              paddingTop: 16,
            }}
          >
            {!useFoundingPrice ? (
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 13 }}>🔥</span>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#E8962F" }}>
                      Founding member price: {pricing.founding}
                    </p>
                  </div>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.4 }}>
                    {FOUNDING_SPOTS_REMAINING} spots remaining · Limited early access
                  </p>
                </div>
                <button
                  onClick={() => setUseFoundingPrice(true)}
                  style={{
                    background: "rgba(232,150,47,0.12)",
                    border: "1px solid rgba(232,150,47,0.3)",
                    borderRadius: 10,
                    padding: "6px 12px",
                    color: "#E8962F",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                  }}
                  data-testid="button-use-founding-price"
                >
                  Apply
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <p style={{ fontSize: 12, color: "rgba(232,150,47,0.55)", fontWeight: 600 }}>
                  Only available for early families
                </p>
                <button
                  onClick={() => setUseFoundingPrice(false)}
                  style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", flexShrink: 0 }}
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Promo code section */}
        <div style={{ margin: "12px 20px 0" }}>
          {!promoData ? (
            <>
              <button
                onClick={() => setPromoExpanded(!promoExpanded)}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: promoExpanded ? 10 : 0 }}
                data-testid="button-toggle-promo"
              >
                <span style={{ fontSize: 13 }}>🏷️</span>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>I have a promo code</span>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", transform: promoExpanded ? "rotate(180deg)" : "rotate(0deg)", display: "inline-block", transition: "transform 0.2s" }}>▼</span>
              </button>
              {promoExpanded && (
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={promoInput}
                    onChange={e => setPromoInput(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === "Enter" && handleApplyPromo()}
                    placeholder="PROMO CODE"
                    style={{
                      flex: 1,
                      height: 44,
                      borderRadius: 10,
                      border: promoError ? "1.5px solid rgba(248,113,113,0.5)" : "1.5px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.06)",
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: 700,
                      letterSpacing: 1.5,
                      padding: "0 14px",
                    }}
                    data-testid="input-promo-code-unlock"
                  />
                  <button
                    onClick={handleApplyPromo}
                    disabled={promoValidating || !promoInput.trim()}
                    style={{
                      height: 44,
                      padding: "0 16px",
                      borderRadius: 10,
                      background: "rgba(232,150,47,0.14)",
                      border: "1px solid rgba(232,150,47,0.35)",
                      color: "#E8962F",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: promoValidating ? "not-allowed" : "pointer",
                    }}
                    data-testid="button-apply-promo-unlock"
                  >
                    {promoValidating ? "…" : "Apply"}
                  </button>
                </div>
              )}
              {promoError && <p style={{ fontSize: 12, color: "rgba(248,113,113,0.8)", marginTop: 6, fontWeight: 600 }}>{promoError}</p>}
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 10, background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)" }}>
              <p style={{ fontSize: 13, color: "#4ade80", fontWeight: 700 }}>
                {promoData.accessType === "full_free" ? "🎉 Free unlock applied!" : `🏷️ ${promoData.code} applied`}
              </p>
              <button
                onClick={() => { setPromoData(null); setPromoInput(""); setPromoExpanded(false); }}
                style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                data-testid="button-remove-promo-unlock"
              >
                Remove
              </button>
            </div>
          )}
        </div>

        {/* Meaning line — only when founding is active */}
        {useFoundingPrice && (
          <p style={{ margin: "12px 20px 0", fontSize: 13, color: "rgba(255,255,255,0.45)", fontWeight: 500, textAlign: "center", lineHeight: 1.5 }}>
            You're one of the first families shaping this
          </p>
        )}

        {/* Trust line */}
        <div style={{ margin: "14px 20px 0", display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
          <Shield size={13} color="rgba(255,255,255,0.28)" />
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.28)", fontWeight: 500 }}>
            Secure payment · Takes less than 10 seconds
          </p>
        </div>

        {/* CTA */}
        <div style={{ margin: "20px 20px 0" }}>
          <button
            onClick={handleUnlock}
            disabled={isLoading}
            style={{
              width: "100%",
              height: 56,
              borderRadius: 18,
              background: isLoading
                ? "rgba(232,150,47,0.5)"
                : "linear-gradient(135deg, #E8962F 0%, #D4872B 100%)",
              color: "#fff",
              fontSize: 18,
              fontWeight: 900,
              border: "none",
              cursor: isLoading ? "not-allowed" : "pointer",
              boxShadow: "0 8px 24px rgba(212,135,43,0.45)",
              letterSpacing: 0.3,
            }}
            data-testid="button-unlock-trip"
          >
            {isLoading ? (promoData?.accessType === "full_free" ? "Unlocking…" : "Opening checkout…") : isPaidTier ? "Continue to Your Trip →" : promoData?.accessType === "full_free" ? "Unlock My Trip (Free) →" : useFoundingPrice ? "Unlock My Trip (Founding Price) →" : "Unlock My Trip →"}
          </button>

          <p style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.25)", marginTop: 8, lineHeight: 1.4 }}>
            You'll return right back to your trip after payment
          </p>
        </div>

        {/* Escape hatch */}
        <div style={{ margin: "6px 20px 0", textAlign: "center" }}>
          <button
            onClick={() => setLocation(returnUrl)}
            style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
            data-testid="button-continue-preview"
          >
            Continue previewing without unlocking
          </button>
        </div>

      </div>

      <SignUpPrompt
        isOpen={showSignup}
        onClose={() => { setShowSignup(false); setPendingUnlock(false); }}
        onLogin={async () => {
          setShowSignup(false);
          // Claim the guest trip so the new account owns it
          try {
            const pending = localStorage.getItem("geoadventures-pending-trip");
            if (pending) {
              const { tripId: pendingTripId, guestToken } = JSON.parse(pending);
              if (pendingTripId && guestToken) {
                await fetch(`/api/travel/trips/${pendingTripId}/claim-guest`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({ guestToken }),
                });
                localStorage.removeItem("geoadventures-pending-trip");
                localStorage.removeItem(`guest-trip-${pendingTripId}`);
              }
            }
          } catch { /* silent */ }
          // pendingUnlock=true is already set — the useEffect will auto-call handleUnlock
          // once the user context hydrates with the newly created account
        }}
        variant="travel"
      />
    </div>
  );
}
