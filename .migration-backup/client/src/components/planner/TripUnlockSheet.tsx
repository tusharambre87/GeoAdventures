import { useState, useEffect, useCallback, useRef } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useLocation } from "wouter";
import { useUser } from "@/lib/userContext";
import { useFreeLimits } from "@/hooks/useFreeLimits";
import { toast } from "sonner";
import { X, ArrowLeft, Shield, Lock, Tag, ChevronDown } from "lucide-react";

const PENDING_CODE_KEY = "pending_promo_code";

type Band = "A" | "B" | "C";
type SheetScreen = "confirm" | "payment" | "success";
type PromoStatus = "idle" | "validating" | "valid" | "invalid" | "applying";

const TRIP_PRICES: Record<Band, { label: string; founding: string; amount: number; foundingAmount: number; currency: string }> = {
  A: { label: "$9.99", founding: "$5.99", amount: 999,   foundingAmount: 599,   currency: "usd" },
  B: { label: "€7.99", founding: "€5.99", amount: 799,   foundingAmount: 599,   currency: "eur" },
  C: { label: "₹199",  founding: "₹149",  amount: 19900, foundingAmount: 14900, currency: "inr" },
};

const BUNDLE_PRICES: Record<Band, { label: string }> = {
  A: { label: "$14.99" },
  B: { label: "€10.99" },
  C: { label: "₹299" },
};

let stripePromise: ReturnType<typeof loadStripe> | null = null;

async function getStripePromise() {
  if (!stripePromise) {
    const resp = await fetch("/api/stripe/publishable-key");
    const { publishableKey } = await resp.json();
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
}

interface TripUnlockSheetProps {
  open: boolean;
  onClose: () => void;
  onOpenFullDetails: () => void;
  onPaymentSuccess?: () => void;
  destination: string;
  country?: string;
  days?: number;
  stops?: number;
  tripId?: string;
  returnUrl: string;
  useFoundingPrice?: boolean;
}

function PaymentForm({
  onSuccess,
  onBack,
  destination,
  days,
  stops,
  priceLabel,
}: {
  onSuccess: () => void;
  onBack: () => void;
  destination: string;
  days?: number;
  stops?: number;
  priceLabel: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setError(null);

    const result = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        return_url: `${window.location.origin}${window.location.pathname}?tripUnlocked=true`,
      },
    });

    if (result.error) {
      setError(result.error.message || "Payment failed. Please try again.");
      setIsProcessing(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <button
          type="button"
          onClick={onBack}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0, marginBottom: 16 }}
        >
          <ArrowLeft size={14} /> Back
        </button>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: "#fff", marginBottom: 4, lineHeight: 1.1 }}>
          Complete your unlock
        </h2>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.4 }}>
          You'll return straight back to your trip after payment.
        </p>
      </div>

      {/* Trip summary chip */}
      <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: "10px 14px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 2 }}>{destination}</p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
            {[days && `${days} day${days !== 1 ? "s" : ""}`, stops && `${stops} stop${stops !== 1 ? "s" : ""}`].filter(Boolean).join(" · ")} · One-time unlock
          </p>
        </div>
        <p style={{ fontSize: 18, fontWeight: 900, color: "#fff" }}>{priceLabel}</p>
      </div>

      {/* Stripe Payment Element */}
      <div style={{ marginBottom: 16 }}>
        <PaymentElement
          options={{
            layout: "tabs",
            paymentMethodOrder: ["apple_pay", "google_pay", "card"],
          }}
        />
      </div>

      {error && (
        <p style={{ color: "#f87171", fontSize: 13, marginBottom: 12, lineHeight: 1.4 }}>{error}</p>
      )}

      {/* Trust lines */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center", marginBottom: 16 }}>
        <Lock size={12} color="rgba(255,255,255,0.28)" />
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", fontWeight: 500 }}>
          Secure payment powered by Stripe · No subscription. No recurring charge.
        </p>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isProcessing || !stripe}
        style={{
          width: "100%",
          height: 52,
          borderRadius: 16,
          background: isProcessing ? "rgba(232,150,47,0.5)" : "linear-gradient(135deg, #E8962F 0%, #D4872B 100%)",
          color: "#fff",
          fontSize: 17,
          fontWeight: 900,
          border: "none",
          cursor: isProcessing || !stripe ? "not-allowed" : "pointer",
          boxShadow: "0 8px 24px rgba(212,135,43,0.4)",
          letterSpacing: 0.2,
          marginTop: "auto",
        }}
        data-testid="button-pay-unlock"
      >
        {isProcessing ? "Processing payment…" : `Pay & unlock trip`}
      </button>
    </form>
  );
}

export function TripUnlockSheet({
  open,
  onClose,
  onOpenFullDetails,
  onPaymentSuccess,
  destination,
  country,
  days,
  stops,
  tripId,
  returnUrl,
  useFoundingPrice = false,
}: TripUnlockSheetProps) {
  const { user, isLoading: userLoading } = useUser();
  const [, setLocation] = useLocation();
  const { recordPaidTripUnlocked } = useFreeLimits();

  const [screen, setScreen] = useState<SheetScreen>("confirm");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isCreatingIntent, setIsCreatingIntent] = useState(false);
  const [stripeReady, setStripeReady] = useState<ReturnType<typeof loadStripe> | null>(null);
  const [foundingApplied, setFoundingApplied] = useState(false);
  const [bundleOption, setBundleOption] = useState<"trip_only" | "trip_geopass">("trip_only");
  const [geoPassDismissed, setGeoPassDismissed] = useState(false);

  // Promo code state
  const [promoExpanded, setPromoExpanded] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promoStatus, setPromoStatus] = useState<PromoStatus>("idle");
  const [promoError, setPromoError] = useState("");
  const [promoData, setPromoData] = useState<{
    accessType: "full_free" | "discounted";
    discountType?: string;
    discountValue?: number;
    discountedAmount?: number;
    originalAmount?: number;
    label?: string;
    code: string;
  } | null>(null);

  const autoAppliedRef = useRef(false);
  const [showLaunchBanner, setShowLaunchBanner] = useState(false);
  const launchBannerCheckedRef = useRef(false);

  // Called only when Stripe payment succeeds (real money paid)
  const handleStripePaymentSuccess = useCallback(() => {
    recordPaidTripUnlocked();
    setScreen("success");
  }, [recordPaidTripUnlocked]);

  // Called for free promo / full-free code unlocks (no real payment)
  const handlePromoSuccess = useCallback(() => {
    setScreen("success");
  }, []);

  const band: Band = ((user?.pricingBand as Band) || "A");
  const pricing = TRIP_PRICES[band];
  // Show founding price toggle to all users during early launch
  const isEligibleForFounding = true;
  const priceLabel = promoData?.discountedAmount
    ? (band === "A" ? `$${(promoData.discountedAmount / 100).toFixed(2)}` : band === "B" ? `€${(promoData.discountedAmount / 100).toFixed(2)}` : `₹${promoData.discountedAmount / 100}`)
    : foundingApplied && bundleOption === "trip_only" ? pricing.founding
    : bundleOption === "trip_geopass" ? BUNDLE_PRICES[band].label
    : pricing.label;

  const FOUNDING_SPOTS = 163;

  useEffect(() => {
    if (!open) {
      setScreen("confirm");
      setClientSecret(null);
      setFoundingApplied(false);
      setBundleOption("trip_only");
      setGeoPassDismissed(false);
      setPromoExpanded(false);
      setPromoInput("");
      setPromoStatus("idle");
      setPromoError("");
      setPromoData(null);
      setShowLaunchBanner(false);
      autoAppliedRef.current = false;
      launchBannerCheckedRef.current = false;
    }
  }, [open]);

  // Auto-apply promo code from localStorage
  useEffect(() => {
    if (!open || autoAppliedRef.current) return;
    const pending = localStorage.getItem(PENDING_CODE_KEY);
    if (!pending) return;
    autoAppliedRef.current = true;
    setPromoInput(pending);
    setPromoExpanded(true);
    validatePromoCode(pending);
  }, [open]);

  // Show launch banner if TESTLAUNCH26 still has spots
  useEffect(() => {
    if (!open || launchBannerCheckedRef.current) return;
    const dismissed = sessionStorage.getItem("geo_launch_checkout_banner_dismissed");
    if (dismissed) return;
    launchBannerCheckedRef.current = true;
    fetch("/api/promo/launch-info")
      .then(r => r.json())
      .then(d => { if (d.available) setShowLaunchBanner(true); })
      .catch(() => {});
  }, [open]);

  const handleLaunchBannerUnlock = () => {
    setShowLaunchBanner(false);
    setPromoInput("TESTLAUNCH26");
    setPromoExpanded(true);
    validatePromoCode("TESTLAUNCH26");
  };

  const handleLaunchBannerDismiss = () => {
    setShowLaunchBanner(false);
    try { sessionStorage.setItem("geo_launch_checkout_banner_dismissed", "1"); } catch {}
  };

  const validatePromoCode = useCallback(async (code: string) => {
    const upper = code.trim().toUpperCase();
    if (!upper) return;
    setPromoStatus("validating");
    setPromoError("");
    try {
      const res = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: upper, tripId: tripId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPromoStatus("invalid");
        setPromoError(data.error || "Invalid code.");
        setPromoData(null);
        return;
      }

      // Full-free code: skip the payment sheet entirely — redeem immediately on Apply
      if (data.accessType === "full_free") {
        setPromoStatus("applying");
        setPromoData({
          accessType: data.accessType,
          discountType: data.discountType,
          discountValue: data.discountValue,
          discountedAmount: data.discountedAmount,
          originalAmount: data.originalAmount,
          label: data.label,
          code: upper,
        });
        try {
          const redeemRes = await fetch("/api/promo/redeem", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ code: upper, destination, tripId: tripId || null }),
          });
          const redeemData = await redeemRes.json();
          if (!redeemRes.ok) {
            setPromoStatus("invalid");
            setPromoError(redeemData.error || "Could not apply promo code.");
            setPromoData(null);
            return;
          }
          localStorage.removeItem(PENDING_CODE_KEY);
          handlePromoSuccess();
        } catch {
          setPromoStatus("invalid");
          setPromoError("Something went wrong. Please try again.");
          setPromoData(null);
        }
        return;
      }

      // Discounted code: show updated price on the confirm screen
      setPromoStatus("valid");
      setPromoData({
        accessType: data.accessType,
        discountType: data.discountType,
        discountValue: data.discountValue,
        discountedAmount: data.discountedAmount,
        originalAmount: data.originalAmount,
        label: data.label,
        code: upper,
      });
    } catch {
      setPromoStatus("invalid");
      setPromoError("Could not validate code. Please try again.");
      setPromoData(null);
    }
  }, [tripId, destination]);

  const handleContinueToPayment = useCallback(async () => {
    if (userLoading) return;
    if (!user) {
      // Not logged in — redirect to auth then return
      onClose();
      setLocation(`/sign-in?return=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }

    // Full-free promo: skip Stripe entirely
    if (promoData?.accessType === "full_free") {
      setIsCreatingIntent(true);
      setPromoStatus("applying");
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
          setPromoStatus("valid");
          return;
        }
        localStorage.removeItem(PENDING_CODE_KEY);
        handlePromoSuccess();
      } catch {
        toast.error("Something went wrong. Please try again.");
        setPromoStatus("valid");
      } finally {
        setIsCreatingIntent(false);
      }
      return;
    }

    setIsCreatingIntent(true);
    try {
      const stripe = await getStripePromise();
      setStripeReady(stripe);

      const resp = await fetch("/api/stripe/payment-intent/trip-unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          useFoundingPrice: foundingApplied && isEligibleForFounding && bundleOption === "trip_only",
          bundleOption,
          tripId: tripId || null,
          destination,
          promoCode: promoData?.accessType === "discounted" && bundleOption === "trip_only" ? promoData.code : undefined,
        }),
      });
      const data = await resp.json();
      if (data.clientSecret) {
        if (promoData?.accessType === "discounted") {
          localStorage.removeItem(PENDING_CODE_KEY);
        }
        setClientSecret(data.clientSecret);
        setScreen("payment");
      } else {
        toast.error(data.error || "Unable to start payment. Please try again.");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsCreatingIntent(false);
    }
  }, [user, userLoading, tripId, destination, onClose, promoData, foundingApplied, bundleOption, setLocation]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(4px)",
          zIndex: 200,
          animation: "sheetFadeIn 0.25s ease forwards",
        }}
        data-testid="trip-unlock-sheet-backdrop"
      />

      {/* Sheet */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 201,
          background: "#0f172a",
          borderRadius: "20px 20px 0 0",
          maxWidth: 480,
          margin: "0 auto",
          padding: "20px 20px 40px",
          animation: "sheetSlideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1) forwards",
          display: "flex",
          flexDirection: "column",
          maxHeight: "90dvh",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
        }}
        data-testid="trip-unlock-sheet"
      >
        {/* Drag handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)", margin: "0 auto 20px", flexShrink: 0 }} />

        {/* Close button */}
        {screen !== "success" && (
          <button
            onClick={onClose}
            style={{ position: "absolute", top: 20, right: 20, background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 20, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            data-testid="button-close-sheet"
          >
            <X size={16} color="rgba(255,255,255,0.6)" />
          </button>
        )}

        {/* ── LAUNCH PROMO BANNER (overlay on confirm screen) ── */}
        {showLaunchBanner && screen === "confirm" && (
          <div
            style={{
              position: "absolute", inset: 0, zIndex: 10,
              background: "linear-gradient(165deg, #0f0a00 0%, #1e1200 50%, #0f0800 100%)",
              borderRadius: "20px 20px 0 0",
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", padding: "32px 24px 40px",
              textAlign: "center",
            }}
            data-testid="launch-checkout-banner"
          >
            <button
              onClick={handleLaunchBannerDismiss}
              style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 20, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.5)", fontSize: 16 }}
              data-testid="button-launch-checkout-dismiss"
            >
              ✕
            </button>

            <div style={{ fontSize: 40, marginBottom: 12 }}>🎁</div>

            <div style={{ display: "inline-block", padding: "4px 14px", borderRadius: 20, fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", marginBottom: 14, background: "rgba(232,150,47,0.15)", border: "1px solid rgba(232,150,47,0.3)", color: "#E8962F" }}>
              Early family offer
            </div>

            <h2 style={{ fontSize: 24, fontWeight: 900, color: "#fff", marginBottom: 12, lineHeight: 1.15 }}>
              Your first trip is on us
            </h2>

            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, marginBottom: 20, maxWidth: 280 }}>
              Because you're one of our first families, your first GeoAdventure is free.
            </p>

            <div style={{ background: "rgba(232,150,47,0.1)", border: "1px solid rgba(232,150,47,0.25)", borderRadius: 14, padding: "14px 20px", marginBottom: 6, width: "100%" }}>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>Use code at checkout</p>
              <p
                style={{ fontSize: 26, fontWeight: 900, letterSpacing: 4, color: "#E8962F", userSelect: "all" }}
                data-testid="text-checkout-promo-code"
              >
                TESTLAUNCH26
              </p>
            </div>

            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 24 }}>
              Only valid for the first 100 families.
            </p>

            <button
              onClick={handleLaunchBannerUnlock}
              style={{
                width: "100%", height: 52, borderRadius: 16,
                background: "linear-gradient(135deg, #E8962F 0%, #D4872B 100%)",
                color: "#fff", fontSize: 16, fontWeight: 900, border: "none",
                cursor: "pointer", boxShadow: "0 8px 24px rgba(212,135,43,0.4)",
                marginBottom: 12,
              }}
              data-testid="button-launch-checkout-unlock"
            >
              Unlock My Free Trip
            </button>

            <button
              onClick={handleLaunchBannerDismiss}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "rgba(255,255,255,0.3)", textDecoration: "underline" }}
              data-testid="button-launch-checkout-continue-without"
            >
              Continue Without Code
            </button>

            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 16 }}>
              One-time trip unlock. Yours forever once claimed.
            </p>
          </div>
        )}

        {/* ── SCREEN 1: QUICK CONFIRM ── */}
        {screen === "confirm" && (
          <>
            <h2 style={{ fontSize: 24, fontWeight: 900, color: "#fff", marginBottom: 4, lineHeight: 1.1, paddingRight: 36 }}>
              Unlock your trip
            </h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", marginBottom: 20, lineHeight: 1.4 }}>
              Pay once. Use it for your entire trip.
            </p>

            {/* Trip snapshot */}
            <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 14, padding: "14px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: 26, flexShrink: 0 }}>✈️</span>
              <div>
                <p style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 2 }}>
                  {destination}{country ? `, ${country}` : ""}
                </p>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                  {[days && `${days} day${days !== 1 ? "s" : ""}`, stops && `${stops} stop${stops !== 1 ? "s" : ""}`].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>

            {/* 3 benefits */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>
              {[
                "Step-by-step day guidance",
                "Kid stories and mini-missions",
                "Food, break, and weather help",
              ].map((line, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 20, height: 20, borderRadius: 10, background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ color: "#4ade80", fontSize: 11 }}>✓</span>
                  </div>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.78)", fontWeight: 500 }}>{line}</p>
                </div>
              ))}
            </div>

            {/* Bundle selector */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {/* Option A: Trip only */}
              <button
                onClick={() => setBundleOption("trip_only")}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 12,
                  background: bundleOption === "trip_only" ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
                  border: bundleOption === "trip_only" ? "2px solid rgba(232,150,47,0.7)" : "2px solid rgba(255,255,255,0.1)",
                  borderRadius: 14, padding: "12px 14px", cursor: "pointer", textAlign: "left",
                }}
                data-testid="button-bundle-trip-only"
              >
                <div style={{ width: 18, height: 18, borderRadius: 9, border: `2px solid ${bundleOption === "trip_only" ? "#E8962F" : "rgba(255,255,255,0.3)"}`, background: bundleOption === "trip_only" ? "#E8962F" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                  {bundleOption === "trip_only" && <div style={{ width: 6, height: 6, borderRadius: 3, background: "#fff" }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 3 }}>Unlock this trip — {pricing.label}</p>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.4 }}>Full itinerary · Stories + games for kids · Works during your trip</p>
                </div>
              </button>

              {/* Option B: Trip + GeoPass */}
              <button
                onClick={() => setBundleOption("trip_geopass")}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 12,
                  background: bundleOption === "trip_geopass" ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.03)",
                  border: bundleOption === "trip_geopass" ? "2px solid rgba(99,102,241,0.7)" : "2px solid rgba(255,255,255,0.1)",
                  borderRadius: 14, padding: "12px 14px", cursor: "pointer", textAlign: "left", position: "relative",
                }}
                data-testid="button-bundle-trip-geopass"
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
                <p style={{ fontSize: 11, color: "rgba(99,102,241,0.8)", textAlign: "center", fontStyle: "italic" }}>
                  Most families choose this to keep the experience going after the trip.
                </p>
              )}
            </div>

            {/* Price block */}
            <div style={{
              background: "rgba(255,255,255,0.05)",
              borderRadius: 16,
              padding: "16px 16px 14px",
              marginBottom: 14,
              border: `1px solid ${foundingApplied && isEligibleForFounding ? "rgba(232,150,47,0.25)" : "rgba(255,255,255,0.08)"}`,
            }}>
              {/* Founding unlocked label when active */}
              {foundingApplied && isEligibleForFounding && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 14 }}>🔥</span>
                  <p style={{ fontSize: 12, fontWeight: 800, color: "#E8962F" }}>Founding price unlocked</p>
                </div>
              )}

              {/* Price — full-free shows replacement message */}
              {promoData?.accessType === "full_free" ? (
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 36, fontWeight: 900, color: "#4ade80", lineHeight: 1 }}>$0.00</span>
                  <span style={{ fontSize: 15, color: "rgba(255,255,255,0.3)", fontWeight: 600, textDecoration: "line-through" }}>{pricing.label}</span>
                </div>
              ) : promoData?.accessType === "discounted" && promoData.discountedAmount ? (
                <div style={{ marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: 36, fontWeight: 900, color: "#fff", lineHeight: 1 }}>{priceLabel}</span>
                    <span style={{ fontSize: 15, color: "rgba(255,255,255,0.3)", fontWeight: 600, textDecoration: "line-through" }}>{pricing.label}</span>
                  </div>
                  <p style={{ fontSize: 11, color: "rgba(74,222,128,0.7)", fontWeight: 600, marginTop: 2 }}>Discount applied</p>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: foundingApplied ? 2 : 4 }}>
                  <span style={{ fontSize: 36, fontWeight: 900, color: "#fff", lineHeight: 1 }}>{priceLabel}</span>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>per trip</span>
                </div>
              )}
              {foundingApplied && !promoData && (
                <p style={{ fontSize: 11, color: "rgba(232,150,47,0.6)", fontWeight: 600, marginBottom: 2 }}>
                  Early supporter pricing — limited spots
                </p>
              )}
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>
                No subscription · Secure checkout
              </p>
            </div>

            {/* Founding member toggle — only for trip-only option during early launch */}
            {isEligibleForFounding && bundleOption === "trip_only" && (
              <div style={{
                borderRadius: 14,
                padding: "12px 14px",
                marginBottom: 14,
                background: foundingApplied && !promoData ? "rgba(232,150,47,0.1)" : "rgba(255,255,255,0.04)",
                border: foundingApplied && !promoData ? "1px solid rgba(232,150,47,0.35)" : "1px solid rgba(255,255,255,0.08)",
                opacity: promoData ? 0.55 : 1,
              }}>
                {!foundingApplied ? (
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                        <span style={{ fontSize: 12 }}>🔥</span>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#E8962F" }}>
                          Founding member price: {pricing.founding}
                        </p>
                      </div>
                      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                        {promoData ? "Remove promo code to use founding price" : `${FOUNDING_SPOTS} spots remaining · Limited early access`}
                      </p>
                    </div>
                    <button
                      onClick={() => { if (!promoData) setFoundingApplied(true); }}
                      disabled={!!promoData}
                      style={{
                        background: promoData ? "rgba(255,255,255,0.06)" : "rgba(232,150,47,0.14)",
                        border: `1px solid ${promoData ? "rgba(255,255,255,0.1)" : "rgba(232,150,47,0.35)"}`,
                        borderRadius: 8,
                        padding: "6px 14px",
                        color: promoData ? "rgba(255,255,255,0.3)" : "#E8962F",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: promoData ? "not-allowed" : "pointer",
                        flexShrink: 0,
                      }}
                      data-testid="button-apply-founding-sheet"
                    >
                      Apply
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <p style={{ fontSize: 12, color: promoData ? "rgba(255,255,255,0.4)" : "#E8962F", fontWeight: 700 }}>
                      {promoData ? "⚠️ Promo overrides founding price" : "🔥 Founding price applied — you're saving!"}
                    </p>
                    <button
                      onClick={() => setFoundingApplied(false)}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "rgba(255,255,255,0.3)", textDecoration: "underline" }}
                      data-testid="button-remove-founding-sheet"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Promo code section — only for trip-only option */}
            <div style={{ marginBottom: 20, display: bundleOption === "trip_geopass" ? "none" : undefined }}>
              {!promoData ? (
                <>
                  <button
                    onClick={() => setPromoExpanded(v => !v)}
                    style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.4)", fontSize: 13, padding: 0 }}
                    data-testid="button-toggle-promo"
                  >
                    <Tag size={14} color="rgba(255,255,255,0.35)" />
                    I have a promo code
                    <ChevronDown size={14} color="rgba(255,255,255,0.35)" style={{ transform: promoExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
                  </button>

                  {promoExpanded && (
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <input
                        value={promoInput}
                        onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoStatus("idle"); setPromoError(""); }}
                        placeholder="PROMO CODE"
                        style={{
                          flex: 1,
                          height: 40,
                          borderRadius: 10,
                          background: "rgba(255,255,255,0.06)",
                          border: `1px solid ${promoStatus === "invalid" ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.12)"}`,
                          color: "#fff",
                          fontSize: 14,
                          fontWeight: 700,
                          letterSpacing: 2,
                          padding: "0 12px",
                          outline: "none",
                        }}
                        data-testid="input-promo-code"
                      />
                      <button
                        onClick={() => validatePromoCode(promoInput)}
                        disabled={promoStatus === "validating" || promoStatus === "applying" || !promoInput.trim()}
                        style={{
                          height: 40,
                          padding: "0 14px",
                          borderRadius: 10,
                          background: "rgba(232,150,47,0.15)",
                          border: "1px solid rgba(232,150,47,0.3)",
                          color: "#E8962F",
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: promoStatus === "validating" || promoStatus === "applying" || !promoInput.trim() ? "not-allowed" : "pointer",
                          opacity: promoStatus === "validating" || promoStatus === "applying" || !promoInput.trim() ? 0.5 : 1,
                          whiteSpace: "nowrap",
                        }}
                        data-testid="button-apply-promo"
                      >
                        {promoStatus === "validating" ? "…" : promoStatus === "applying" ? "Unlocking…" : "Apply"}
                      </button>
                    </div>
                  )}

                  {promoStatus === "invalid" && promoError && (
                    <p style={{ fontSize: 12, color: "#f87171", marginTop: 6 }}>{promoError}</p>
                  )}
                </>
              ) : (
                /* Applied badge */
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 10, padding: "10px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16 }}>🎟️</span>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 800, color: "#4ade80", margin: 0 }}>
                        {promoData.accessType === "full_free" ? "Free access!" : `Discount applied`}
                      </p>
                      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: 0 }}>
                        {promoData.label || promoData.code}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setPromoData(null); setPromoStatus("idle"); setPromoInput(""); setPromoError(""); }}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "rgba(255,255,255,0.3)", textDecoration: "underline" }}
                    data-testid="button-remove-promo"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {/* CTA */}
            <button
              onClick={handleContinueToPayment}
              disabled={isCreatingIntent || promoStatus === "validating" || promoStatus === "applying"}
              style={{
                width: "100%",
                height: 52,
                borderRadius: 16,
                background: isCreatingIntent || promoStatus === "applying" ? "rgba(232,150,47,0.5)" : "linear-gradient(135deg, #E8962F 0%, #D4872B 100%)",
                color: "#fff",
                fontSize: 17,
                fontWeight: 900,
                border: "none",
                cursor: isCreatingIntent || promoStatus === "validating" || promoStatus === "applying" ? "not-allowed" : "pointer",
                boxShadow: "0 8px 24px rgba(212,135,43,0.4)",
                letterSpacing: 0.2,
                marginBottom: 16,
              }}
              data-testid="button-continue-to-payment"
            >
              {promoStatus === "applying" || (isCreatingIntent && promoData?.accessType === "full_free")
                ? "Unlocking your trip…"
                : isCreatingIntent
                  ? "Preparing payment…"
                  : "Continue to payment"
              }
            </button>

            {/* See full details */}
            <button
              onClick={() => { onClose(); onOpenFullDetails(); }}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "rgba(255,255,255,0.3)", textDecoration: "underline", textAlign: "center", width: "100%" }}
              data-testid="button-see-full-details"
            >
              See full details
            </button>
          </>
        )}

        {/* ── SCREEN 2: PAYMENT ── */}
        {screen === "payment" && clientSecret && stripeReady && (
          <Elements
            stripe={stripeReady}
            options={{
              clientSecret,
              appearance: {
                theme: "night",
                variables: {
                  colorPrimary: "#E8962F",
                  colorBackground: "#1e293b",
                  colorText: "#ffffff",
                  colorTextSecondary: "rgba(255,255,255,0.5)",
                  borderRadius: "12px",
                  fontFamily: "system-ui, sans-serif",
                },
              },
            }}
          >
            <PaymentForm
              onSuccess={handleStripePaymentSuccess}
              onBack={() => setScreen("confirm")}
              destination={destination}
              days={days}
              stops={stops}
              priceLabel={priceLabel}
            />
          </Elements>
        )}

        {/* Loading state while setting up payment */}
        {screen === "payment" && (!clientSecret || !stripeReady) && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 }}>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Setting up payment…</p>
          </div>
        )}

        {/* ── SCREEN 3: SUCCESS ── */}
        {screen === "success" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "20px 0 10px" }}>
            <div style={{ fontSize: 56, marginBottom: 20 }}>✨</div>
            <h2 style={{ fontSize: 26, fontWeight: 900, color: "#fff", marginBottom: 10, lineHeight: 1.1 }}>
              Your adventure is ready
            </h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.55, marginBottom: 6, maxWidth: 280 }}>
              Everything is ready — your day-by-day guidance, stories, and smart trip help are now live.
            </p>
            <p style={{ fontSize: 13, color: "#E8962F", fontWeight: 700, marginBottom: 32 }}>
              {destination} ·  {[days && `${days} day${days !== 1 ? "s" : ""}`, stops && `${stops} stop${stops !== 1 ? "s" : ""}`].filter(Boolean).join(" · ")}
            </p>

            <button
              onClick={() => {
                if (onPaymentSuccess) {
                  onClose();
                  onPaymentSuccess();
                } else {
                  onClose();
                  setLocation(returnUrl + (returnUrl.includes("?") ? "&" : "?") + "tripUnlocked=true");
                }
              }}
              style={{
                width: "100%",
                height: 52,
                borderRadius: 16,
                background: "linear-gradient(135deg, #E8962F 0%, #D4872B 100%)",
                color: "#fff",
                fontSize: 17,
                fontWeight: 900,
                border: "none",
                cursor: "pointer",
                boxShadow: "0 8px 24px rgba(212,135,43,0.4)",
                marginBottom: 14,
              }}
              data-testid="button-continue-to-trip"
            >
              Continue to my trip
            </button>

            <button
              onClick={() => { onClose(); setLocation(`${returnUrl}${returnUrl.includes("?") ? "&" : "?"}tripUnlocked=true&day=1`); }}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "rgba(255,255,255,0.4)", textDecoration: "underline" }}
              data-testid="button-open-day1"
            >
              Open Day 1
            </button>

          </div>
        )}
      </div>

      <style>{`
        @keyframes sheetFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes sheetSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
