import { Navigation } from "lucide-react";

export type NeedRec = {
  id?: string; name: string; type: string; description?: string;
  walkTime?: string; isFree?: boolean; kidNote?: string;
  travelTimeMinutes?: number; whyThisWorks?: string; chips?: string[];
  goNowMapsUrl?: string; canAddToToday?: boolean;
};

type NeedType = "break" | "food" | "fun";

function getColors(needType: NeedType | null) {
  if (needType === "break") return {
    cardBg: "bg-green-50 border-green-200",
    textColor: "text-green-700",
    btnColor: "bg-green-500 hover:bg-green-600",
    btnOutline: "border-green-200 text-green-600 hover:bg-green-50",
  };
  if (needType === "fun") return {
    cardBg: "bg-purple-50 border-purple-200",
    textColor: "text-purple-700",
    btnColor: "bg-purple-500 hover:bg-purple-600",
    btnOutline: "border-purple-200 text-purple-600 hover:bg-purple-50",
  };
  return {
    cardBg: "bg-orange-50 border-orange-200",
    textColor: "text-orange-700",
    btnColor: "bg-orange-500 hover:bg-orange-600",
    btnOutline: "border-orange-200 text-orange-600 hover:bg-orange-50",
  };
}

interface ReliefResultCardProps {
  rec: NeedRec;
  needType: NeedType | null;
  testIdSuffix: string;
  onGoNow: () => void;
  onAddToday?: () => void;
  onCollapse?: () => void;
}

export function ReliefResultCard({
  rec,
  needType,
  testIdSuffix,
  onGoNow,
  onAddToday,
  onCollapse,
}: ReliefResultCardProps) {
  const { cardBg, textColor, btnColor, btnOutline } = getColors(needType);
  const travelLabel = rec.travelTimeMinutes != null
    ? `~${rec.travelTimeMinutes} min away (est.)`
    : rec.walkTime ? `~${rec.walkTime}` : "";

  return (
    <div className={`${cardBg} border rounded-2xl p-3.5`} data-testid={`need-rec-${testIdSuffix}`}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="font-bold text-gray-900 text-sm leading-tight">{rec.name}</p>
        {rec.isFree && (
          <span className="shrink-0 text-[9px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">Free</span>
        )}
      </div>
      {travelLabel && (
        <p className={`text-[11px] ${textColor} font-semibold mb-1`}>📍 {travelLabel}</p>
      )}
      {rec.whyThisWorks && (
        <p className={`text-[11px] ${textColor} font-medium mb-1.5`}>{rec.whyThisWorks}</p>
      )}
      {!rec.whyThisWorks && rec.description && (
        <p className="text-[11px] text-gray-600 mb-1.5">{rec.description}</p>
      )}
      {rec.chips && rec.chips.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mb-2">
          {rec.chips.slice(0, 2).map((chip, ci) => (
            <span
              key={ci}
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${textColor} border-current bg-white`}
            >
              {chip}
            </span>
          ))}
        </div>
      )}
      {rec.kidNote && !rec.whyThisWorks && (
        <p className={`text-[10px] ${textColor} italic mb-2`}>⭐ {rec.kidNote}</p>
      )}

      {onAddToday ? (
        <div className="grid grid-cols-2 gap-2 mt-2">
          <button
            onClick={onGoNow}
            className={`flex items-center justify-center gap-1 py-2 ${btnColor} text-white text-[11px] font-bold rounded-xl transition-colors`}
            data-testid={`button-need-rec-go-now-${testIdSuffix}`}
          >
            <Navigation className="w-3 h-3" /> Go here now
          </button>
          <button
            onClick={onAddToday}
            className={`flex items-center justify-center gap-1 py-2 bg-white border ${btnOutline} text-[11px] font-bold rounded-xl transition-colors`}
            data-testid={`button-need-rec-add-${testIdSuffix}`}
          >
            + Add to today
          </button>
        </div>
      ) : (
        <button
          onClick={onGoNow}
          className={`w-full flex items-center justify-center gap-1.5 py-2.5 mt-2 ${btnColor} text-white text-[12px] font-bold rounded-xl transition-colors`}
          data-testid={`button-need-rec-go-now-${testIdSuffix}`}
        >
          <Navigation className="w-3.5 h-3.5" /> Go here now
        </button>
      )}

      {onCollapse && (
        <button
          onClick={onCollapse}
          className="w-full text-center text-[10px] text-gray-400 mt-2 py-0.5 hover:text-gray-600"
        >
          Collapse
        </button>
      )}
    </div>
  );
}
