import { MapPin, Clock, Navigation, MoreVertical, CheckCircle2, Car, ChevronRight } from "lucide-react";

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
    parkingLabel: "🅿️ Easy",
    accentColor: "bg-green-400",
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
    parkingLabel: "⚠️ Risky",
    accentColor: "bg-orange-400",
  },
  {
    id: 3,
    num: 3,
    name: "Notre-Dame Cathedral",
    emoji: "⛪",
    status: "upcoming",
    duration: "60 min",
    travel: "15 min",
    parking: "none",
    parkingLabel: "🚫 No parking",
    accentColor: "bg-gray-200",
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
    parkingLabel: "🅿️ Easy",
    accentColor: "bg-gray-200",
  },
];

const parkingColor: Record<string, string> = {
  easy: "text-green-600",
  risky: "text-amber-600",
  none: "text-red-500",
};

export function AccentStrip() {
  return (
    <div className="min-h-screen bg-[#f5f5f7] p-4">
      <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-3 px-1">
        Today's Plan · Paris
      </p>
      <div className="space-y-2">
        {stops.map((stop) => (
          <div
            key={stop.id}
            className={`flex rounded-xl overflow-hidden shadow-sm ${
              stop.status === "visited" ? "opacity-60" : ""
            }`}
          >
            <div className={`w-1 shrink-0 ${stop.accentColor}`} />
            <div className="flex-1 bg-white px-3.5 py-3.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center text-lg shrink-0">
                  {stop.emoji}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p
                        className={`text-[13px] font-semibold leading-tight ${
                          stop.status === "visited"
                            ? "line-through text-gray-400"
                            : "text-gray-900"
                        }`}
                      >
                        {stop.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="flex items-center gap-0.5 text-[11px] text-gray-400">
                          <Clock className="w-2.5 h-2.5" />
                          {stop.duration}
                        </span>
                        <span className="text-gray-200 text-[10px]">·</span>
                        <span className="flex items-center gap-0.5 text-[11px] text-gray-400">
                          <Car className="w-2.5 h-2.5" />
                          {stop.travel}
                        </span>
                        <span className="text-gray-200 text-[10px]">·</span>
                        <span
                          className={`text-[11px] font-medium ${parkingColor[stop.parking]}`}
                        >
                          {stop.parkingLabel}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {stop.status === "visited" && (
                        <CheckCircle2 className="w-4.5 h-4.5 text-green-400" />
                      )}
                      {stop.status === "next" && (
                        <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-orange-500 text-white text-[11px] font-semibold">
                          <Navigation className="w-3 h-3" />
                          Go
                        </button>
                      )}
                      <button className="p-1 rounded-md text-gray-300 hover:text-gray-500">
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {stop.status === "next" && (
                <div className="mt-2.5 pt-2.5 border-t border-gray-50 flex gap-2">
                  <button className="flex-1 py-1.5 rounded-lg bg-orange-50 text-orange-600 text-[11px] font-semibold">
                    We're here!
                  </button>
                  <button className="flex-1 py-1.5 rounded-lg bg-gray-50 text-gray-500 text-[11px] font-medium">
                    Find parking
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
