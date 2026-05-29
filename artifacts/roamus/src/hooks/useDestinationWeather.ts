import { useState, useEffect } from "react";
import { getDestinationCoordinates } from "@/lib/travelAvatars";

export interface WeatherData {
  temperature: number;
  temperatureUnit: string;
  weatherCode: number;
  weatherDescription: string;
  weatherEmoji: string;
  localTime: string;
  timezone: string;
}

interface UseDestinationWeatherOptions {
  city?: string | null;
  country?: string | null;
  destination?: string | null;
}

const WEATHER_CODE_MAP: Record<number, { description: string; emoji: string }> = {
  0: { description: "Clear sky", emoji: "☀️" },
  1: { description: "Mainly clear", emoji: "🌤️" },
  2: { description: "Partly cloudy", emoji: "⛅" },
  3: { description: "Overcast", emoji: "☁️" },
  45: { description: "Foggy", emoji: "🌫️" },
  48: { description: "Icy fog", emoji: "🌫️" },
  51: { description: "Light drizzle", emoji: "🌧️" },
  53: { description: "Drizzle", emoji: "🌧️" },
  55: { description: "Heavy drizzle", emoji: "🌧️" },
  61: { description: "Light rain", emoji: "🌧️" },
  63: { description: "Rain", emoji: "🌧️" },
  65: { description: "Heavy rain", emoji: "🌧️" },
  71: { description: "Light snow", emoji: "🌨️" },
  73: { description: "Snow", emoji: "🌨️" },
  75: { description: "Heavy snow", emoji: "🌨️" },
  77: { description: "Snow grains", emoji: "🌨️" },
  80: { description: "Light showers", emoji: "🌦️" },
  81: { description: "Showers", emoji: "🌦️" },
  82: { description: "Heavy showers", emoji: "🌦️" },
  85: { description: "Light snow showers", emoji: "🌨️" },
  86: { description: "Heavy snow showers", emoji: "🌨️" },
  95: { description: "Thunderstorm", emoji: "⛈️" },
  96: { description: "Thunderstorm with hail", emoji: "⛈️" },
  99: { description: "Severe thunderstorm", emoji: "⛈️" },
};

function getWeatherInfo(code: number): { description: string; emoji: string } {
  return WEATHER_CODE_MAP[code] || { description: "Unknown", emoji: "🌡️" };
}

const weatherCache = new Map<string, { data: WeatherData; timestamp: number }>();
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

export function useDestinationWeather(
  city?: string | null, 
  country?: string | null,
  destination?: string | null
): {
  weather: WeatherData | null;
  loading: boolean;
  error: string | null;
} {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const coords = getDestinationCoordinates(city, country, destination);
    if (!coords) {
      setWeather(null);
      return;
    }

    const cacheKey = `${coords.lat},${coords.lon}`;
    const cached = weatherCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setWeather(cached.data);
      return;
    }

    const fetchWeather = async () => {
      setLoading(true);
      setError(null);
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,weather_code&timezone=auto&temperature_unit=fahrenheit`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Weather fetch failed");
        
        const data = await response.json();
        const current = data.current;
        const weatherInfo = getWeatherInfo(current.weather_code);
        
        const now = new Date();
        const localTime = new Intl.DateTimeFormat('en-US', {
          timeZone: data.timezone,
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }).format(now);

        const weatherData: WeatherData = {
          temperature: Math.round(current.temperature_2m),
          temperatureUnit: "°F",
          weatherCode: current.weather_code,
          weatherDescription: weatherInfo.description,
          weatherEmoji: weatherInfo.emoji,
          localTime,
          timezone: data.timezone,
        };

        weatherCache.set(cacheKey, { data: weatherData, timestamp: Date.now() });
        setWeather(weatherData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [city, country, destination]);

  return { weather, loading, error };
}
