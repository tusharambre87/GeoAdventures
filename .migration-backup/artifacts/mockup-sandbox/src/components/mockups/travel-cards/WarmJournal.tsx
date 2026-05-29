import { Navigation, MoreVertical, CheckCircle2, Car, Clock } from "lucide-react";

const stops = [
  {
    id: 1,
    num: 1,
    name: "Eiffel Tower",
    emoji: "🗼",
    status: "visited",
    duration: "90 min",
    travel: "12 min",
    parking: "easy",
    parkingEmoji: "🅿️",
    tag: "Landmark",
  },
  {
    id: 2,
    num: 2,
    name: "Louvre Museum",
    emoji: "🏛️",
    status: "next",
    duration: "120 min",
    travel: "8 min",
    parking: "risky",
    parkingEmoji: "⚠️",
    tag: "Museum",
  },
  {
    id: 3,
    num: 3,
    name: "Notre-Dame",
    emoji: "⛪",
    status: "upcoming",
    duration: "60 min",
    travel: "15 min",
    parking: "none",
    parkingEmoji: "🚫",
    tag: "Cathedral",
  },
  {
    id: 4,
    num: 4,
    name: "Montmartre",
    emoji: "🎨",
    status: "upcoming",
    duration: "75 min",
    travel: "20 min",
    parking: "easy",
    parkingEmoji: "🅿️",
    tag: "District",
  },
];

const statusChip: Record<string, string> = {
  visited: "bg-[#e3e8de] text-[#4f6b4e]", // Sage green
  next: "bg-amber-100 text-amber-800",
  upcoming: "bg-stone-200 text-stone-600",
};

const statusLabel: Record<string, string> = {
  visited: "Done",
  next: "Now",
  upcoming: "Later",
};

const parkingBg: Record<string, string> = {
  easy: "bg-[#e3e8de] text-[#4f6b4e]",
  risky: "bg-amber-100 text-amber-800",
  none: "bg-[#f5e6e6] text-[#8a4d4d]",
};

export function WarmJournal() {
  return (
    <div className="min-h-screen bg-[#fdf6ed] p-4 font-sans text-stone-800">
      <div className="flex items-center justify-between mb-6 px-1 pt-2">
        <div>
          <p className="text-[11px] text-stone-500 uppercase tracking-[0.2em] font-semibold font-serif italic">
            Paris · Day 2
          </p>
          <p className="text-xl font-bold text-stone-800 mt-1 font-serif">Today's Route</p>
        </div>
        <span className="text-[11px] bg-[#f5eeda] text-amber-800 font-bold px-3 py-1.5 rounded-sm shadow-sm border border-[#e8dfc8]">
          1 / 4 done
        </span>
      </div>

      <div className="space-y-4">
        {stops.map((stop) => (
          <div
            key={stop.id}
            className={`rounded-xl border transition-all ${
              stop.status === "next"
                ? "border-amber-300/60 bg-[#fdfaf5] shadow-md"
                : stop.status === "visited"
                ? "border-[#ebdcc3]/40 bg-[#f5f2eb]"
                : "border-[#ebdcc3]/60 bg-[#fcf9f2] shadow-sm"
            }`}
          >
            <div className="flex items-center gap-3 px-4 py-4">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0 ${
                  stop.status === "visited" 
                    ? "opacity-50 grayscale mix-blend-multiply" 
                    : "bg-white shadow-sm border border-stone-100"
                }`}
              >
                {stop.emoji}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <p
                    className={`text-[15px] font-bold truncate font-serif ${
                      stop.status === "visited"
                        ? "text-stone-400 line-through decoration-stone-300"
                        : "text-stone-800"
                    }`}
                  >
                    {stop.name}
                  </p>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-[4px] uppercase tracking-wider shrink-0 border border-black/5 ${statusChip[stop.status]}`}
                  >
                    {statusLabel[stop.status]}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="flex items-center gap-1 text-[10px] text-stone-600 bg-white border border-stone-200/80 rounded-[4px] px-1.5 py-0.5 shadow-sm font-medium">
                    <Clock className="w-3 h-3 text-stone-400" />
                    {stop.duration}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-stone-600 bg-white border border-stone-200/80 rounded-[4px] px-1.5 py-0.5 shadow-sm font-medium">
                    <Car className="w-3 h-3 text-stone-400" />
                    {stop.travel}
                  </span>
                  <span
                    className={`text-[10px] font-medium rounded-[4px] px-1.5 py-0.5 shadow-sm border border-black/5 ${parkingBg[stop.parking]}`}
                  >
                    {stop.parkingEmoji} Parking
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 pl-1">
                {stop.status === "visited" && (
                  <CheckCircle2 className="w-5 h-5 text-[#4f6b4e] opacity-80" />
                )}
                {stop.status === "next" && (
                  <button className="w-10 h-10 rounded-lg bg-[#d97706] text-white flex items-center justify-center shadow-md hover:bg-amber-700 transition-colors border border-[#b45309]">
                    <Navigation className="w-4 h-4" />
                  </button>
                )}
                <button className="p-1.5 text-stone-400 hover:text-stone-600 transition-colors">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>

            {stop.status === "next" && (
              <div className="px-4 pb-4 flex gap-3">
                <button className="flex-1 py-2.5 rounded-lg bg-[#b45309] text-white text-[13px] font-bold shadow-md hover:bg-amber-800 transition-colors tracking-wide border border-amber-900/20">
                  We're here! 📍
                </button>
                <button className="flex-1 py-2.5 rounded-lg bg-[#fdf6ed] border border-amber-200 text-amber-900 text-[13px] font-bold shadow-sm hover:bg-amber-50 transition-colors">
                  Find parking
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
