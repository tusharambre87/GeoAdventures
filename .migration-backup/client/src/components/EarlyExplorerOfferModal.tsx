import { useLocation } from "wouter";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface EarlyExplorerOfferModalProps {
  open: boolean;
  onClose: () => void;
}

export function EarlyExplorerOfferModal({ open, onClose }: EarlyExplorerOfferModalProps) {
  const [, setLocation] = useLocation();

  const handleClaim = () => {
    onClose();
    setLocation("/founding-families");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm p-0 overflow-hidden rounded-2xl">
        <div
          className="px-6 pt-8 pb-6 text-white relative"
          style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)" }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full"
            style={{ background: "rgba(255,255,255,0.12)" }}
            data-testid="button-close-early-explorer"
          >
            <X className="w-4 h-4 text-white" />
          </button>

          <div className="text-4xl mb-3">🌍</div>

          <h2 className="text-xl font-black text-white leading-tight mb-1">
            You're one of our early explorers
          </h2>
          <p className="text-blue-200 text-sm leading-snug">
            One time only offer for our first supporters.
          </p>
        </div>

        <div className="px-6 py-5 bg-white">
          <div
            className="rounded-xl px-5 py-4 mb-5 text-center"
            style={{ background: "#EFF6FF", border: "2px solid #2563eb" }}
          >
            <p className="text-3xl font-black text-blue-700">$1<span className="text-lg font-semibold text-blue-500">/month</span></p>
            <p className="text-xs font-semibold text-blue-600 mt-1">Lifetime price lock — never goes up</p>
          </div>

          <ul className="space-y-2 mb-5">
            {[
              "All GeoQuest games, unlimited",
              "GeoAdventures — any trip or city",
              "Offline play for travel",
              "Up to 7 explorer profiles",
              "Founding family badge forever",
            ].map((line, i) => (
              <li key={i} className="flex items-center gap-2.5 text-sm text-slate-700">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">✓</span>
                {line}
              </li>
            ))}
          </ul>

          <Button
            onClick={handleClaim}
            className="w-full font-bold text-white py-6"
            style={{ background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)" }}
            data-testid="button-claim-early-explorer"
          >
            Claim my spot
          </Button>

          <button
            onClick={onClose}
            className="w-full mt-3 text-sm text-slate-400 hover:text-slate-600 transition-colors"
            data-testid="button-dismiss-early-explorer"
          >
            Maybe later
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
