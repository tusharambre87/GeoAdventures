import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, Thermometer, Loader2 } from "lucide-react";

interface CityLiveInfoProps {
  city: string;
  compact?: boolean;
}

interface LiveInfo {
  city: string;
  temperature: number;
  temperatureUnit: string;
  weatherEmoji: string;
  localTime: string;
  activity: string;
  timezone: string;
}

function toCelsius(f: number): number {
  return Math.round((f - 32) * 5 / 9);
}

export function CityLiveInfo({ city, compact = false }: CityLiveInfoProps) {
  const [useCelsius, setUseCelsius] = useState(false);

  const { data, isLoading, error } = useQuery<LiveInfo>({
    queryKey: ['/api/city-live-info', city],
    queryFn: async () => {
      const res = await fetch(`/api/city-live-info/${encodeURIComponent(city)}`);
      if (!res.ok) throw new Error("Failed to fetch live info");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className={`flex items-center gap-1 ${compact ? 'text-xs' : 'text-sm'} text-gray-400`}>
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Loading...</span>
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  const displayTemp = useCelsius ? toCelsius(data.temperature) : data.temperature;
  const unit = useCelsius ? "C" : "F";

  const tempDisplay = (
    <span
      className="font-bold text-lg text-blue-800 dark:text-blue-300 cursor-pointer select-none hover:underline decoration-dotted"
      onClick={() => setUseCelsius(!useCelsius)}
      title={`Tap to switch to °${useCelsius ? "F" : "C"}`}
      data-testid={`toggle-temp-unit-${city}`}
    >
      {displayTemp}°{unit}
    </span>
  );

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs" data-testid={`city-live-info-compact-${city}`}>
        <span className="flex items-center gap-1">
          <span className="text-base">{data.weatherEmoji}</span>
          <span
            className="font-semibold cursor-pointer select-none hover:underline decoration-dotted"
            onClick={() => setUseCelsius(!useCelsius)}
            title={`Tap to switch to °${useCelsius ? "F" : "C"}`}
            data-testid={`toggle-temp-unit-compact-${city}`}
          >
            {displayTemp}°{unit}
          </span>
        </span>
        <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
          <Clock className="w-3 h-3" />
          {data.localTime}
        </span>
      </div>
    );
  }

  return (
    <div 
      className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/50 dark:to-purple-900/50 rounded-xl p-3 border border-blue-100 dark:border-blue-700"
      data-testid={`city-live-info-${city}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{data.weatherEmoji}</span>
          <div>
            <div className="flex items-center gap-1">
              <Thermometer className="w-4 h-4 text-orange-500" />
              {tempDisplay}
            </div>
            <span className="text-xs text-gray-700 dark:text-white">Right now in {city}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 justify-end">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="font-bold text-lg text-blue-800 dark:text-blue-300">{data.localTime}</span>
          </div>
          <span className="text-xs text-gray-700 dark:text-white">Local time</span>
        </div>
      </div>
      <p className="text-sm text-center text-gray-600 dark:text-white bg-white/50 dark:bg-white/10 rounded-lg py-1 px-2">
        {data.activity}
      </p>
    </div>
  );
}
