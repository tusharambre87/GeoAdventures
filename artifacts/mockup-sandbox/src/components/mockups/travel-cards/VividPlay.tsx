import { Navigation, MoreVertical, CheckCircle2, Car, Clock, MapPin } from "lucide-react";

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

const statusStyles: Record<string, { card: string; strip: string; label: string; bg: string }> = {
  visited: {
    card: "opacity-70 border-green-200 bg-green-50",
    strip: "bg-green-400",
    label: "bg-green-400 text-white -rotate-3",
    bg: "bg-green-400",
  },
  next: {
    card: "border-orange-300 bg-white shadow-[0_8px_0_0_#fdba74] -translate-y-1 relative z-10",
    strip: "bg-orange-500",
    label: "bg-orange-500 text-white rotate-2 scale-110 shadow-sm",
    bg: "bg-orange-500",
  },
  upcoming: {
    card: "border-sky-200 bg-white",
    strip: "bg-sky-400",
    label: "bg-sky-100 text-sky-600 rotate-1",
    bg: "bg-sky-400",
  },
};

const statusText: Record<string, string> = {
  visited: "DONE!",
  next: "NOW!",
  upcoming: "LATER",
};

export function VividPlay() {
  return (
    <div className="min-h-screen bg-[#f0f9ff] p-4 font-sans selection:bg-orange-200">
      <div className="flex items-center justify-between mb-6 px-1">
        <div>
          <p className="text-xs text-sky-600 font-bold uppercase tracking-wider mb-1">
            🗺️ Adventure Day 2
          </p>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            Paris Explorer
          </h1>
        </div>
        <div className="bg-white border-2 border-slate-200 shadow-[0_4px_0_0_#e2e8f0] px-3 py-1.5 rounded-2xl flex items-center gap-2">
          <span className="text-green-500 font-black">⭐</span>
          <span className="text-sm font-black text-slate-700">1 / 4</span>
        </div>
      </div>

      <div className="space-y-5">
        {stops.map((stop) => {
          const style = statusStyles[stop.status];
          return (
            <div
              key={stop.id}
              className={`rounded-3xl border-2 transition-all overflow-hidden flex flex-col ${style.card}`}
            >
              {/* Top color strip for pop */}
              <div className={`h-3 w-full ${style.strip}`} />
              
              <div className="p-4 flex gap-3">
                {/* Big Emoji */}
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 ${
                    stop.status === "next"
                      ? "bg-orange-100 shadow-inner"
                      : stop.status === "visited"
                      ? "bg-green-100 opacity-50"
                      : "bg-sky-50"
                  }`}
                >
                  {stop.emoji}
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h2
                      className={`text-lg font-black truncate tracking-tight ${
                        stop.status === "visited" ? "text-green-800 line-through" : "text-slate-800"
                      }`}
                    >
                      {stop.name}
                    </h2>
                    
                    {/* Bubbly Status Sticker */}
                    <span
                      className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider shrink-0 transform transition-transform ${style.label}`}
                    >
                      {statusText[stop.status]}
                    </span>
                  </div>

                  {/* Colorful Info Chips */}
                  <div className="flex items-center gap-2 flex-wrap mt-1">
                    <span className="flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-100 border border-blue-200 rounded-xl px-2 py-0.5">
                      <Clock className="w-3 h-3" />
                      {stop.duration}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-100 border border-purple-200 rounded-xl px-2 py-0.5">
                      <Car className="w-3 h-3" />
                      {stop.travel}
                    </span>
                    <span className={`text-[11px] font-bold border rounded-xl px-2 py-0.5 ${
                        stop.parking === 'easy' ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 
                        stop.parking === 'risky' ? 'bg-amber-100 border-amber-200 text-amber-700' : 
                        'bg-red-100 border-red-200 text-red-700'
                    }`}>
                      {stop.parkingEmoji} Parking
                    </span>
                  </div>
                </div>

                {/* Right Action/Check icon */}
                <div className="flex flex-col items-center justify-center gap-2 shrink-0 ml-1">
                  {stop.status === "visited" && (
                    <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    </div>
                  )}
                  {stop.status === "next" && (
                    <button className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-[0_4px_0_0_#c2410c] active:translate-y-[4px] active:shadow-none transition-all">
                      <Navigation className="w-5 h-5 ml-[-2px]" strokeWidth={3} />
                    </button>
                  )}
                  {stop.status === "upcoming" && (
                    <button className="w-8 h-8 rounded-xl bg-sky-100 text-sky-400 flex items-center justify-center">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Big bold "We're here!" button for the active stop */}
              {stop.status === "next" && (
                <div className="px-4 pb-4 pt-1 flex gap-3">
                  <button className="flex-1 py-3 rounded-2xl bg-orange-500 text-white text-sm font-black shadow-[0_4px_0_0_#c2410c] active:translate-y-[4px] active:shadow-none transition-all flex items-center justify-center gap-2">
                    <MapPin className="w-4 h-4" strokeWidth={3} />
                    WE'RE HERE!
                  </button>
                  <button className="flex-1 py-3 rounded-2xl bg-sky-100 border-2 border-sky-200 text-sky-700 text-sm font-black active:translate-y-[2px] transition-transform">
                    Find Parking
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
