export interface TravelAvatar {
  id: string;
  name: string;
  emoji: string;
  theme: "beach" | "mountain" | "volcano" | "city" | "tropical" | "nature" | "landmark";
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export const TRAVEL_AVATARS: TravelAvatar[] = [
  {
    id: "honu",
    name: "Honu the Sea Turtle",
    emoji: "🐢",
    theme: "beach",
    colors: {
      primary: "#0EA5E9",
      secondary: "#38BDF8",
      accent: "#22D3EE",
    },
  },
  {
    id: "pele",
    name: "Pele the Fire Spirit",
    emoji: "🌋",
    theme: "volcano",
    colors: {
      primary: "#EF4444",
      secondary: "#F97316",
      accent: "#FBBF24",
    },
  },
  {
    id: "nalu",
    name: "Nalu the Dolphin",
    emoji: "🐬",
    theme: "tropical",
    colors: {
      primary: "#06B6D4",
      secondary: "#14B8A6",
      accent: "#10B981",
    },
  },
  {
    id: "manu",
    name: "Manu the Explorer Bird",
    emoji: "🦜",
    theme: "nature",
    colors: {
      primary: "#22C55E",
      secondary: "#84CC16",
      accent: "#EAB308",
    },
  },
  {
    id: "kona",
    name: "Kona the Mountain Goat",
    emoji: "🐐",
    theme: "mountain",
    colors: {
      primary: "#6366F1",
      secondary: "#8B5CF6",
      accent: "#A78BFA",
    },
  },
  {
    id: "luna",
    name: "Luna the Star Guide",
    emoji: "⭐",
    theme: "landmark",
    colors: {
      primary: "#F59E0B",
      secondary: "#FBBF24",
      accent: "#FCD34D",
    },
  },
  {
    id: "kai",
    name: "Kai the City Cat",
    emoji: "🐱",
    theme: "city",
    colors: {
      primary: "#EC4899",
      secondary: "#F472B6",
      accent: "#FB7185",
    },
  },
];

export function getTravelAvatarForStopType(stopType: string): TravelAvatar {
  const typeMap: Record<string, TravelAvatar["theme"]> = {
    beach: "beach",
    nature: "nature",
    volcano: "volcano",
    city: "city",
    landmark: "landmark",
    museum: "city",
    attraction: "landmark",
    other: "tropical",
  };
  
  const theme = typeMap[stopType.toLowerCase()] || "tropical";
  return TRAVEL_AVATARS.find(a => a.theme === theme) || TRAVEL_AVATARS[0];
}

export function getTravelAvatarForTrip(city?: string, country?: string): TravelAvatar {
  const location = `${city || ""} ${country || ""}`.toLowerCase();
  
  if (location.includes("hawaii") || location.includes("big island") || location.includes("maui") || location.includes("oahu")) {
    return TRAVEL_AVATARS.find(a => a.id === "honu")!;
  }
  if (location.includes("volcano") || location.includes("kilauea")) {
    return TRAVEL_AVATARS.find(a => a.id === "pele")!;
  }
  if (location.includes("beach") || location.includes("coast") || location.includes("fiji") || location.includes("caribbean")) {
    return TRAVEL_AVATARS.find(a => a.id === "nalu")!;
  }
  if (location.includes("mountain") || location.includes("alps") || location.includes("himalaya") || location.includes("rocky")) {
    return TRAVEL_AVATARS.find(a => a.id === "kona")!;
  }
  if (location.includes("forest") || location.includes("jungle") || location.includes("rainforest") || location.includes("amazon")) {
    return TRAVEL_AVATARS.find(a => a.id === "manu")!;
  }
  if (location.includes("new york") || location.includes("tokyo") || location.includes("paris") || location.includes("london")) {
    return TRAVEL_AVATARS.find(a => a.id === "kai")!;
  }
  
  return TRAVEL_AVATARS.find(a => a.id === "luna")!;
}

export function getStopTypeEmoji(stopType?: string | null): string {
  const emojiMap: Record<string, string> = {
    beach: "🏖️",
    nature: "🌿",
    volcano: "🌋",
    city: "🏙️",
    landmark: "🏛️",
    museum: "🎨",
    attraction: "🎡",
    park: "🌳",
    temple: "⛩️",
    market: "🛍️",
    restaurant: "🍽️",
    viewpoint: "🔭",
    zoo: "🦁",
    aquarium: "🐠",
    garden: "🌺",
    plaza: "⛲",
    palace: "🏰",
    bridge: "🌉",
    waterfall: "💧",
    mountain: "⛰️",
    neighborhood: "🏘️",
    street_food: "🍜",
    street: "🛤️",
    food: "🍽️",
    culture: "🎭",
    adventure: "🎢",
    other: "📍",
  };
  return (stopType ? emojiMap[stopType.toLowerCase()] : undefined) || "📍";
}

// Destination icons for trip cards/headers - dynamic place representation
export interface DestinationIcon {
  emoji: string;
  label: string;
  animation?: "bounce" | "pulse" | "wiggle";
}

export function getDestinationIcon(city?: string | null, country?: string | null, destination?: string | null): DestinationIcon {
  const location = `${city || ""} ${country || ""} ${destination || ""}`.toLowerCase();
  
  // Hawaii - Volcano
  if (location.includes("hawaii") || location.includes("big island") || location.includes("maui") || location.includes("oahu") || location.includes("kona")) {
    return { emoji: "🌋", label: "Volcano", animation: "pulse" };
  }
  // Japan - Mount Fuji
  if (location.includes("japan") || location.includes("tokyo") || location.includes("kyoto") || location.includes("osaka")) {
    return { emoji: "🗻", label: "Mount Fuji", animation: "bounce" };
  }
  // Paris/France - Eiffel Tower
  if (location.includes("paris") || location.includes("france")) {
    return { emoji: "🗼", label: "Eiffel Tower", animation: "wiggle" };
  }
  // NYC - Statue of Liberty
  if (location.includes("new york") || location.includes("nyc") || location.includes("manhattan")) {
    return { emoji: "🗽", label: "Statue of Liberty", animation: "bounce" };
  }
  // London - Big Ben
  if (location.includes("london") || location.includes("england") || location.includes("uk")) {
    return { emoji: "🎡", label: "London Eye", animation: "wiggle" };
  }
  // Egypt - Pyramids
  if (location.includes("egypt") || location.includes("cairo") || location.includes("giza")) {
    return { emoji: "🏛️", label: "Pyramids", animation: "pulse" };
  }
  // Australia - Kangaroo
  if (location.includes("australia") || location.includes("sydney") || location.includes("melbourne")) {
    return { emoji: "🦘", label: "Kangaroo", animation: "bounce" };
  }
  // Mexico - Cactus
  if (location.includes("mexico") || location.includes("cancun") || location.includes("cabo")) {
    return { emoji: "🌵", label: "Cactus", animation: "wiggle" };
  }
  // Caribbean/Tropical Islands
  if (location.includes("caribbean") || location.includes("bahamas") || location.includes("jamaica") || location.includes("fiji") || location.includes("maldives")) {
    return { emoji: "🏝️", label: "Island", animation: "bounce" };
  }
  // Beach destinations
  if (location.includes("beach") || location.includes("coast") || location.includes("sea") || location.includes("ocean")) {
    return { emoji: "🏖️", label: "Beach", animation: "wiggle" };
  }
  // Mountain destinations
  if (location.includes("mountain") || location.includes("alps") || location.includes("rocky") || location.includes("himalaya") || location.includes("colorado")) {
    return { emoji: "⛰️", label: "Mountain", animation: "bounce" };
  }
  // Safari/Africa
  if (location.includes("africa") || location.includes("kenya") || location.includes("safari") || location.includes("tanzania")) {
    return { emoji: "🦁", label: "Safari", animation: "pulse" };
  }
  // China
  if (location.includes("china") || location.includes("beijing") || location.includes("shanghai")) {
    return { emoji: "🐼", label: "Panda", animation: "bounce" };
  }
  // Italy
  if (location.includes("italy") || location.includes("rome") || location.includes("venice") || location.includes("milan")) {
    return { emoji: "🏛️", label: "Colosseum", animation: "pulse" };
  }
  // Spain
  if (location.includes("spain") || location.includes("barcelona") || location.includes("madrid")) {
    return { emoji: "💃", label: "Flamenco", animation: "wiggle" };
  }
  // Greece
  if (location.includes("greece") || location.includes("athens") || location.includes("santorini")) {
    return { emoji: "🏛️", label: "Parthenon", animation: "pulse" };
  }
  // India
  if (location.includes("india") || location.includes("delhi") || location.includes("mumbai") || location.includes("taj mahal")) {
    return { emoji: "🕌", label: "Taj Mahal", animation: "pulse" };
  }
  // Brazil
  if (location.includes("brazil") || location.includes("rio") || location.includes("sao paulo")) {
    return { emoji: "🦜", label: "Toucan", animation: "bounce" };
  }
  // Default - Globe
  return { emoji: "🌍", label: "World", animation: "pulse" };
}

// Coordinates for major destinations (for weather API)
// Accepts city, country, or full destination string
export function getDestinationCoordinates(city?: string | null, country?: string | null, destination?: string | null): { lat: number; lon: number } | null {
  // Combine all available location info
  const location = `${city || ""} ${country || ""} ${destination || ""}`.toLowerCase();
  
  // Hawaii Big Island - most specific matches first
  if (location.includes("big island") || location.includes("hilo") || 
      (location.includes("hawaii") && !location.includes("maui") && !location.includes("oahu") && !location.includes("kauai"))) {
    return { lat: 19.7074, lon: -155.0885 }; // Hilo, Big Island
  }
  if (location.includes("kona")) return { lat: 19.6400, lon: -155.9969 };
  if (location.includes("maui")) return { lat: 20.7984, lon: -156.3319 };
  if (location.includes("oahu") || location.includes("honolulu") || location.includes("waikiki")) return { lat: 21.3069, lon: -157.8583 };
  if (location.includes("kauai")) return { lat: 22.0964, lon: -159.5261 };
  // General Hawaii fallback
  if (location.includes("hawaii")) return { lat: 19.7074, lon: -155.0885 };
  
  // Major world cities
  if (location.includes("tokyo") || location.includes("japan")) return { lat: 35.6762, lon: 139.6503 };
  if (location.includes("paris") || location.includes("france")) return { lat: 48.8566, lon: 2.3522 };
  if (location.includes("new york") || location.includes("nyc") || location.includes("manhattan")) return { lat: 40.7128, lon: -74.0060 };
  if (location.includes("london") || location.includes("england") || location.includes("uk")) return { lat: 51.5074, lon: -0.1278 };
  if (location.includes("sydney") || location.includes("australia")) return { lat: -33.8688, lon: 151.2093 };
  if (location.includes("rome") || location.includes("italy")) return { lat: 41.9028, lon: 12.4964 };
  if (location.includes("barcelona") || location.includes("spain") || location.includes("madrid")) return { lat: 41.3851, lon: 2.1734 };
  if (location.includes("los angeles") || location.includes("la") || location.includes("california")) return { lat: 34.0522, lon: -118.2437 };
  if (location.includes("miami") || location.includes("florida")) return { lat: 25.7617, lon: -80.1918 };
  if (location.includes("cancun") || location.includes("mexico")) return { lat: 21.1619, lon: -86.8515 };
  if (location.includes("caribbean") || location.includes("bahamas")) return { lat: 25.0343, lon: -77.3963 };
  if (location.includes("fiji")) return { lat: -17.7134, lon: 178.0650 };
  if (location.includes("bali") || location.includes("indonesia")) return { lat: -8.3405, lon: 115.0920 };
  if (location.includes("maldives")) return { lat: 3.2028, lon: 73.2207 };
  if (location.includes("dubai") || location.includes("uae")) return { lat: 25.2048, lon: 55.2708 };
  if (location.includes("singapore")) return { lat: 1.3521, lon: 103.8198 };
  if (location.includes("hong kong")) return { lat: 22.3193, lon: 114.1694 };
  if (location.includes("beijing") || location.includes("china")) return { lat: 39.9042, lon: 116.4074 };
  if (location.includes("seoul") || location.includes("korea")) return { lat: 37.5665, lon: 126.9780 };
  if (location.includes("amsterdam") || location.includes("netherlands")) return { lat: 52.3676, lon: 4.9041 };
  if (location.includes("berlin") || location.includes("germany")) return { lat: 52.5200, lon: 13.4050 };
  if (location.includes("athens") || location.includes("greece")) return { lat: 37.9838, lon: 23.7275 };
  if (location.includes("cairo") || location.includes("egypt")) return { lat: 30.0444, lon: 31.2357 };
  if (location.includes("cape town") || location.includes("south africa")) return { lat: -33.9249, lon: 18.4241 };
  if (location.includes("rio") || location.includes("brazil")) return { lat: -22.9068, lon: -43.1729 };
  if (location.includes("vancouver") || location.includes("canada")) return { lat: 49.2827, lon: -123.1207 };
  
  return null;
}
