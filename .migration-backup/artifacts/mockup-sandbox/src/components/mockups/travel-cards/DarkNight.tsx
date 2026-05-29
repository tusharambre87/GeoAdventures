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
  visited: "bg-emerald-500/20 text-emerald-400",
  next: "bg-teal-500/20 text-teal-400",
  upcoming: "bg-slate-800 text-slate-400",
};

const statusLabel: Record<string, string> = {
  visited: "Done",
  next: "Now",
  upcoming: "Later",
};

const parkingBg: Record<string, string> = {
  easy: "bg-emerald-500/20 text-emerald-400",
  risky: "bg-amber-500/20 text-amber-400",
  none: "bg-red-500/20 text-red-400",
};

export function DarkNight() {
  return (
    <div className="min-h-screen bg-[#111318] p-4 text-slate-200">
      <div className="flex items-center justify-between mb-4 px-0.5">
        <div>
          <p className="text-[11px] text-slate-500 uppercase tracking-widest font-medium">
            Paris · Day 2
          </p>
          <p className="text-sm font-bold text-slate-100 mt-0.5">Today's Stops</p>
        </div>
        <span className="text-xs bg-teal-500/20 text-teal-400 font-semibold px-2.5 py-1 rounded-full">
          1 / 4 done
        </span>
      </div>

      <div className="space-y-2">
        {stops.map((stop) => (
          <div
            key={stop.id}
            className={`rounded-2xl border transition-all ${
              stop.status === "next"
                ? "border-teal-500/50 bg-[#1c1f26] shadow-[0_0_15px_rgba(20,184,166,0.1)]"
                : stop.status === "visited"
                ? "border-slate-800 bg-[#14161b]"
                : "border-slate-800/60 bg-[#181a20]"
            }`}
          >
            <div className="flex items-center gap-3 px-3.5 py-3">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0 ${
                  stop.status === "visited" ? "opacity-40 grayscale" : ""
                }`}
              >
                {stop.emoji}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <p
                    className={`text-[13px] font-semibold truncate ${
                      stop.status === "visited"
                        ? "text-slate-500 line-through"
                        : "text-slate-200"
                    }`}
                  >
                    {stop.name}
                  </p>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide shrink-0 ${statusChip[stop.status]}`}
                  >
                    {statusLabel[stop.status]}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="flex items-center gap-0.5 text-[10px] text-slate-400 bg-slate-800/80 rounded-full px-1.5 py-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    {stop.duration}
                  </span>
                  <span className="flex items-center gap-0.5 text-[10px] text-slate-400 bg-slate-800/80 rounded-full px-1.5 py-0.5">
                    <Car className="w-2.5 h-2.5" />
                    {stop.travel}
                  </span>
                  <span
                    className={`text-[10px] font-medium rounded-full px-1.5 py-0.5 ${parkingBg[stop.parking]}`}
                  >
                    {stop.parkingEmoji} Parking
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {stop.status === "visited" && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                )}
                {stop.status === "next" && (
                  <button className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-900/20">
                    <Navigation className="w-4 h-4" />
                  </button>
                )}
                <button className="p-1.5 text-slate-600 hover:text-slate-400">
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {stop.status === "next" && (
              <div className="px-3.5 pb-3 flex gap-2">
                <button className="flex-1 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-900/20 transition-colors">
                  We're here! 📍
                </button>
                <button className="flex-1 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium transition-colors">
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
