import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useUser } from "@/lib/userContext";
import { AuthGateSheet } from "@/components/planner/AuthGateSheet";

const PENDING_CODE_KEY = "pending_promo_code";

export default function UnlockPage() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const { user } = useUser();

  const params = new URLSearchParams(search);
  const code = params.get("code")?.toUpperCase().trim() || "";

  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "validating" | "applying" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [destination, setDestination] = useState("your trip");

  useEffect(() => {
    if (!code) {
      setStatus("error");
      setMessage("No code found in the link. Please check the link and try again.");
      return;
    }

    if (!user) {
      // Store code and show auth gate
      localStorage.setItem(PENDING_CODE_KEY, code);
      setAuthGateOpen(true);
    } else {
      // Already logged in — validate and apply immediately
      applyCode(code, user.id);
    }
  }, [code, user]);

  const applyCode = async (theCode: string, _userId: string) => {
    setStatus("validating");
    try {
      const valRes = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: theCode }),
      });
      const valData = await valRes.json();

      if (!valRes.ok) {
        setStatus("error");
        setMessage(valData.error || "Invalid code.");
        return;
      }

      // Determine where to send the user after the code is applied.
      // If the code is trip-scoped, route to that trip's context; otherwise go to builder.
      const targetTripId: string | null = valData.appliesToTripId || null;
      const tripRoute = targetTripId ? `/adventure/${targetTripId}/context` : "/build-adventure";

      if (valData.accessType === "full_free") {
        // Redeem immediately — pass tripId if code is scoped to a trip
        setStatus("applying");
        const redeemRes = await fetch("/api/promo/redeem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            code: theCode,
            destination: valData.label || "Your Trip",
            tripId: targetTripId,
          }),
        });
        const redeemData = await redeemRes.json();

        if (!redeemRes.ok) {
          setStatus("error");
          setMessage(redeemData.error || "Could not apply code.");
          return;
        }

        localStorage.removeItem(PENDING_CODE_KEY);
        setStatus("success");
        setMessage("Your trip is unlocked! 🎉");
        setTimeout(() => setLocation(tripRoute), 2000);
      } else if (valData.accessType === "discounted") {
        // Store code for TripUnlockSheet to pick up, route to trip context or builder
        localStorage.setItem(PENDING_CODE_KEY, theCode);
        setStatus("success");
        setDestination(valData.label || "Your trip");
        setMessage(`Code applied! You'll see your discount on the payment screen.`);
        setTimeout(() => setLocation(tripRoute), 2200);
      }
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  };

  const handleAuthSuccess = () => {
    setAuthGateOpen(false);
    // The useEffect will re-run when user state updates and apply the code
  };

  if (!code) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
          <h1 style={titleStyle}>Invalid link</h1>
          <p style={subStyle}>This invite link doesn't contain a code. Please check the link and try again.</p>
          <button onClick={() => setLocation("/")} style={ctaStyle}>Go Home</button>
        </div>
      </div>
    );
  }

  if (status === "idle" || status === "validating" || status === "applying") {
    return (
      <>
        <div style={pageStyle}>
          <div style={cardStyle}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✨</div>
            <h1 style={titleStyle}>Applying your code…</h1>
            <p style={subStyle}>{code}</p>
            <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 20 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#E8962F", animation: `dotPulse 1.2s ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        </div>

        <AuthGateSheet
          open={authGateOpen}
          onClose={() => { setAuthGateOpen(false); setLocation("/"); }}
          destination={destination}
          onSuccess={handleAuthSuccess}
        />

        <style>{`
          @keyframes dotPulse {
            0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
            40% { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </>
    );
  }

  if (status === "success") {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
          <h1 style={titleStyle}>Code applied!</h1>
          <p style={subStyle}>{message}</p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginTop: 8 }}>Taking you to your trip…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h1 style={titleStyle}>Code issue</h1>
          <p style={subStyle}>{message}</p>
          <button onClick={() => setLocation("/")} style={ctaStyle}>Go Home</button>
        </div>
      </div>

      <AuthGateSheet
        open={authGateOpen}
        onClose={() => { setAuthGateOpen(false); setLocation("/"); }}
        destination={destination}
        onSuccess={handleAuthSuccess}
      />
    </>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100dvh",
  background: "#0f172a",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
};

const cardStyle: React.CSSProperties = {
  background: "#1e293b",
  borderRadius: 24,
  padding: "40px 32px",
  textAlign: "center",
  maxWidth: 360,
  width: "100%",
};

const titleStyle: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 900,
  color: "#fff",
  marginBottom: 10,
  lineHeight: 1.1,
};

const subStyle: React.CSSProperties = {
  fontSize: 15,
  color: "rgba(255,255,255,0.55)",
  lineHeight: 1.5,
};

const ctaStyle: React.CSSProperties = {
  marginTop: 24,
  width: "100%",
  height: 48,
  borderRadius: 14,
  background: "linear-gradient(135deg, #E8962F 0%, #D4872B 100%)",
  color: "#fff",
  fontSize: 16,
  fontWeight: 800,
  border: "none",
  cursor: "pointer",
};
