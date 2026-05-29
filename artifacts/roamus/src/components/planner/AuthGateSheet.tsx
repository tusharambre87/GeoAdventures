import { useState } from "react";
import { SignUpPrompt } from "@/components/SignUpPrompt";

interface AuthGateSheetProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  destination?: string;
}

export function AuthGateSheet({ open, onClose, onSuccess, destination }: AuthGateSheetProps) {
  const [showSignup, setShowSignup] = useState(false);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(4px)",
          zIndex: 200,
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 201,
          background: "#fff",
          borderRadius: "24px 24px 0 0",
          padding: "28px 24px 40px",
          animation: "authSheetSlideUp 0.28s cubic-bezier(0.32,0.72,0,1) forwards",
        }}
      >
        {/* Drag handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "#E2E8F0", margin: "0 auto 24px" }} />

        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "#F1F5F9",
            border: "none",
            cursor: "pointer",
            fontSize: 16,
            color: "#64748B",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          data-testid="button-auth-gate-close"
        >
          ✕
        </button>

        {/* Lock icon */}
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔐</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0F172A", marginBottom: 6, lineHeight: 1.2 }}>
            Save your trip before unlocking
          </h2>
          <p style={{ fontSize: 14, color: "#64748B", lineHeight: 1.5 }}>
            So you can access it anytime — from any device.
          </p>
        </div>

        {/* Benefits */}
        <div style={{ background: "#F8FAFC", borderRadius: 14, padding: "14px 16px", marginBottom: 24 }}>
          {[
            { icon: "📍", text: "Your trip plan stays saved" },
            { icon: "📸", text: "Capture moments as you go" },
            { icon: "♾️", text: "Come back anytime" },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: i < 2 ? 10 : 0 }}>
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <span style={{ fontSize: 14, color: "#334155", fontWeight: 500 }}>{item.text}</span>
            </div>
          ))}
        </div>

        {/* Google — hidden until OAuth is ready */}
        <button
          disabled
          style={{ display: "none" }}
          data-testid="button-continue-google"
        >
          Continue with Google
        </button>

        {/* Email CTA */}
        <button
          onClick={() => setShowSignup(true)}
          style={{
            width: "100%",
            height: 52,
            borderRadius: 16,
            background: "linear-gradient(135deg, #E8962F 0%, #D4872B 100%)",
            color: "#fff",
            fontSize: 16,
            fontWeight: 800,
            border: "none",
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(212,135,43,0.40)",
            marginBottom: 10,
          }}
          data-testid="button-continue-email"
        >
          Continue with Email →
        </button>

        <p style={{ textAlign: "center", fontSize: 12, color: "#94A3B8" }}>
          Free account · Takes less than 10 seconds
        </p>
      </div>

      <style>{`
        @keyframes authSheetSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>

      {/* SignUpPrompt wired to call onSuccess after login */}
      <SignUpPrompt
        isOpen={showSignup}
        onClose={() => setShowSignup(false)}
        variant="travel"
        source="gate"
        onLogin={() => {
          setShowSignup(false);
          onClose();
          onSuccess();
        }}
      />
    </>
  );
}
