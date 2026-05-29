import { Navigation, MoreVertical, CheckCircle2, Car, Clock, Zap } from "lucide-react";

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
  visited: "bg-green-50 text-green-600",
  next: "bg-orange-50 text-orange-600",
  upcoming: "bg-gray-100 text-gray-500",
};

const statusLabel: Record<string, string> = {
  visited: "Done",
  next: "Now",
  upcoming: "Later",
};

const parkingBg: Record<string, string> = {
  easy: "bg-green-50 text-green-600",
  risky: "bg-amber-50 text-amber-600",
  none: "bg-red-50 text-red-500",
};

export function PillChip() {
  return (
    <div className="min-h-screen bg-white p-4">
      <div className="flex items-center justify-between mb-4 px-0.5">
        <div>
          <p className="text-[11px] text-gray-400 uppercase tracking-widest font-medium">
            Paris · Day 2
          </p>
          <p className="text-sm font-bold text-gray-900 mt-0.5">Today's Stops</p>
        </div>
        <span className="text-xs bg-orange-100 text-orange-600 font-semibold px-2.5 py-1 rounded-full">
          1 / 4 done
        </span>
      </div>

      <div className="space-y-2">
        {stops.map((stop) => (
          <div
            key={stop.id}
            className={`rounded-2xl border transition-all ${
              stop.status === "next"
                ? "border-orange-200 bg-orange-50/30 shadow-sm"
                : stop.status === "visited"
                ? "border-gray-100 bg-gray-50/40"
                : "border-gray-100 bg-white"
            }`}
          >
            <div className="flex items-center gap-3 px-3.5 py-3">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0 ${
                  stop.status === "visited" ? "opacity-40" : ""
                }`}
              >
                {stop.emoji}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <p
                    className={`text-[13px] font-semibold truncate ${
                      stop.status === "visited"
                        ? "text-gray-400 line-through"
                        : "text-gray-900"
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
                  <span className="flex items-center gap-0.5 text-[10px] text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    {stop.duration}
                  </span>
                  <span className="flex items-center gap-0.5 text-[10px] text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5">
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
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                )}
                {stop.status === "next" && (
                  <button className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-sm">
                    <Navigation className="w-4 h-4" />
                  </button>
                )}
                <button className="p-1.5 text-gray-300 hover:text-gray-500">
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {stop.status === "next" && (
              <div className="px-3.5 pb-3 flex gap-2">
                <button className="flex-1 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold shadow-sm">
                  We're here! 📍
                </button>
                <button className="flex-1 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 text-xs font-medium">
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
