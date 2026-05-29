import { Ticket, ExternalLink } from "lucide-react";

interface PassesBannerProps {
  stopName: string;
  bookingUrl?: string | null;
  onOpenWallet?: () => void;
}

export function PassesBanner({ stopName, bookingUrl, onOpenWallet }: PassesBannerProps) {
  const handleOpen = () => {
    if (bookingUrl) {
      window.open(bookingUrl, "_blank", "noopener,noreferrer");
    } else if (onOpenWallet) {
      onOpenWallet();
    } else {
      window.open(
        `https://www.google.com/search?q=buy+tickets+${encodeURIComponent(stopName)}`,
        "_blank",
        "noopener,noreferrer"
      );
    }
  };

  return (
    <div
      className="flex items-center gap-3 rounded-2xl border border-amber-200 px-4 py-3"
      style={{ background: "#FFFBEB" }}
      data-testid="passes-banner"
    >
      <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
        <Ticket className="w-4 h-4 text-amber-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-900 leading-tight">
          You'll need tickets for this stop
        </p>
        <p className="text-xs text-amber-700 mt-0.5 truncate">{stopName}</p>
      </div>
      <button
        onClick={handleOpen}
        className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-amber-800 border border-amber-300 bg-white hover:bg-amber-50 transition-colors active:scale-95"
        data-testid="button-passes-open-tickets"
      >
        Open tickets
        <ExternalLink className="w-3 h-3" />
      </button>
    </div>
  );
}
