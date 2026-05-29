import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";

const LAUNCH_PROMO_SEEN_KEY = "geo_launch_promo_seen";

interface LaunchPromoDialogProps {
  open: boolean;
  onCreateAccount: () => void;
  onMaybeLater: () => void;
}

export function LaunchPromoDialog({ open, onCreateAccount, onMaybeLater }: LaunchPromoDialogProps) {
  const [remainingSpots, setRemainingSpots] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch("/api/promo/launch-info")
      .then(r => r.json())
      .then(d => setRemainingSpots(d.remainingSpots ?? 100))
      .catch(() => setRemainingSpots(100));
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onMaybeLater(); }}>
      <DialogContent
        className="max-w-sm mx-auto rounded-2xl border-0 p-0 overflow-hidden shadow-2xl"
        style={{ background: "linear-gradient(145deg, #1a1200 0%, #2d1f00 60%, #1a0f00 100%)" }}
        data-testid="launch-promo-dialog"
      >
        <button
          onClick={onMaybeLater}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors z-10"
          data-testid="button-launch-promo-dismiss"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-6 pt-8 pb-6 flex flex-col items-center text-center">
          <div className="text-4xl mb-3">🎉</div>

          <div className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4"
            style={{ background: "rgba(232,150,47,0.15)", color: "#E8962F", border: "1px solid rgba(232,150,47,0.3)" }}
          >
            {remainingSpots !== null
              ? `${remainingSpots} of 100 spots left`
              : "Limited spots"}
          </div>

          <h2 className="text-2xl font-extrabold leading-tight mb-3" style={{ color: "#fff" }}>
            You're early — that's a good thing
          </h2>

          <p className="text-sm leading-relaxed mb-4" style={{ color: "rgba(255,255,255,0.65)" }}>
            We're opening GeoAdventures to our first families.
          </p>

          <div className="w-full rounded-xl px-4 py-3 mb-4 text-sm font-medium text-left"
            style={{ background: "rgba(232,150,47,0.1)", border: "1px solid rgba(232,150,47,0.25)", color: "rgba(255,255,255,0.85)" }}
          >
            Create your account today and you'll unlock a free trip on us{" "}
            <span style={{ color: "rgba(255,255,255,0.5)" }}>(first 100 families only)</span>.<br /><br />
            Use code at checkout:{" "}
            <span
              className="font-extrabold tracking-widest text-base select-all cursor-pointer"
              style={{ color: "#E8962F" }}
              data-testid="text-launch-promo-code"
            >
              TESTLAUNCH26
            </span>
          </div>

          <p className="text-xs mb-5" style={{ color: "rgba(255,255,255,0.45)" }}>
            You'll also help shape what we build next for families.
          </p>

          <button
            onClick={onCreateAccount}
            className="w-full h-12 rounded-xl font-extrabold text-sm transition-all hover:-translate-y-0.5"
            style={{
              background: "linear-gradient(135deg, #E8962F 0%, #D4872B 100%)",
              color: "#fff",
              border: "none",
              boxShadow: "0 6px 20px rgba(212,135,43,0.4)",
              letterSpacing: 0.3,
            }}
            data-testid="button-launch-promo-create-account"
          >
            Create My Account
          </button>

          <button
            onClick={onMaybeLater}
            className="mt-3 text-xs font-medium transition-colors"
            style={{ color: "rgba(255,255,255,0.35)", background: "none", border: "none", cursor: "pointer" }}
            data-testid="button-launch-promo-maybe-later"
          >
            Maybe Later
          </button>

          <p className="mt-4 text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
            Your trip stays yours forever. No subscription required.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function shouldShowLaunchPromo(): boolean {
  try {
    return !localStorage.getItem(LAUNCH_PROMO_SEEN_KEY);
  } catch {
    return false;
  }
}

export function markLaunchPromoSeen() {
  try {
    localStorage.setItem(LAUNCH_PROMO_SEEN_KEY, "1");
  } catch {}
}
