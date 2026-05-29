import { MapPin, Clock, Navigation, MoreVertical, CheckCircle2, Car } from "lucide-react";

const stops = [
  {
    id: 1,
    num: 1,
    name: "Eiffel Tower",
    status: "visited",
    duration: "90 min",
    travel: "12 min",
    parking: "easy",
    parkingLabel: "🅿️ Easy",
    city: "Paris",
  },
  {
    id: 2,
    num: 2,
    name: "Louvre Museum",
    status: "next",
    duration: "120 min",
    travel: "8 min",
    parking: "risky",
    parkingLabel: "⚠️ Risky",
    city: "Paris",
  },
  {
    id: 3,
    num: 3,
    name: "Notre-Dame Cathedral",
    status: "upcoming",
    duration: "60 min",
    travel: "15 min",
    parking: "none",
    parkingLabel: "🚫 No parking",
    city: "Paris",
  },
  {
    id: 4,
    num: 4,
    name: "Montmartre",
    status: "upcoming",
    duration: "75 min",
    travel: "20 min",
    parking: "easy",
    parkingLabel: "🅿️ Easy",
    city: "Paris",
  },
];

const parkingColor: Record<string, string> = {
  easy: "text-green-600",
  risky: "text-amber-600",
  none: "text-red-500",
};

export function FlatRow() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-3 px-1">
        Today's Plan · Paris
      </p>
      <div className="divide-y divide-gray-100 bg-white rounded-2xl overflow-hidden shadow-sm">
        {stops.map((stop) => (
          <div
            key={stop.id}
            className={`flex items-start gap-3 px-4 py-4 ${
              stop.status === "visited" ? "bg-gray-50/60" : "bg-white"
            }`}
          >
            <div className="flex flex-col items-center pt-0.5 shrink-0">
              {stop.status === "visited" ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                    stop.status === "next"
                      ? "border-orange-400 text-orange-500"
                      : "border-gray-200 text-gray-300"
                  }`}
                >
                  {stop.num}
                </div>
              )}
              {stop.id < stops.length && (
                <div className="w-px flex-1 min-h-[28px] bg-gray-100 mt-1" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p
                    className={`text-sm font-semibold leading-tight ${
                      stop.status === "visited"
                        ? "line-through text-gray-400"
                        : "text-gray-900"
                    }`}
                  >
                    {stop.name}
                  </p>
                  <div className="flex items-center gap-2.5 mt-1">
                    <span className="flex items-center gap-1 text-[11px] text-gray-400">
                      <Clock className="w-3 h-3" />
                      {stop.duration}
                    </span>
                    <span className="text-gray-200">·</span>
                    <span className="flex items-center gap-1 text-[11px] text-gray-400">
                      <Car className="w-3 h-3" />
                      {stop.travel}
                    </span>
                    <span className="text-gray-200">·</span>
                    <span
                      className={`text-[11px] font-medium ${parkingColor[stop.parking]}`}
                    >
                      {stop.parkingLabel}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {stop.status === "next" && (
                    <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-orange-500 text-white text-[11px] font-semibold">
                      <Navigation className="w-3 h-3" />
                      Go
                    </button>
                  )}
                  <button className="p-1.5 rounded-lg text-gray-300 hover:text-gray-500">
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
