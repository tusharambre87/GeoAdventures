import { useLocation } from "wouter";

type TabId = "trips" | "now" | "kids" | "me";

interface GeoAdventuresNavProps {
  activeTab?: TabId;
}

export function GeoAdventuresNav({ activeTab = "me" }: GeoAdventuresNavProps) {
  const [, navigate] = useLocation();

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: "trips", label: "Trips", icon: "✈️" },
    { id: "now",   label: "Now",   icon: "📍" },
    { id: "kids",  label: "Kids",  icon: "🎮" },
    { id: "me",    label: "Me",    icon: "🧭" },
  ];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      data-testid="geoadventures-nav-bar"
    >
      <div className="flex items-stretch max-w-2xl mx-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => navigate(`/geoadventures?tab=${tab.id}`)}
              className={`relative flex-1 flex flex-col items-center justify-center py-4 gap-1 transition-colors ${
                isActive
                  ? "text-orange-500"
                  : "text-slate-400 hover:text-slate-600"
              }`}
              data-testid={`geoadventures-nav-${tab.id}`}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-orange-500 rounded-full" />
              )}
              <span className="text-2xl leading-none">{tab.icon}</span>
              <span className={`text-xs font-semibold leading-none ${isActive ? "text-orange-500" : "text-slate-400"}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
