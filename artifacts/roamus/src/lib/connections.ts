export interface TravelConnection {
  tripId: string;
  tripName: string;
  stopName: string;
  fact: string;
  timestamp: number;
}

const CONNECTION_KEYWORDS: Record<string, string[]> = {
  "Volcanoes create islands like Hawaii": ["hawaii", "volcano", "island", "pacific", "honolulu", "lava"],
  "Mountain observatories help us explore space": ["mountain", "observatory", "telescope", "space", "stars", "summit", "peak"],
  "Every place has unique geography to explore": ["geography", "explore", "travel", "adventure"],
};

export function getStoredConnections(): TravelConnection[] {
  try {
    return JSON.parse(localStorage.getItem("geoquest-connections") || "[]");
  } catch {
    return [];
  }
}

export function findConnection(cityName: string, country: string, facts: string[] = []): TravelConnection | null {
  const connections = getStoredConnections();
  if (connections.length === 0) return null;

  const searchText = `${cityName} ${country} ${facts.join(" ")}`.toLowerCase();

  for (const connection of connections) {
    const keywords = CONNECTION_KEYWORDS[connection.fact];
    if (keywords) {
      const matchCount = keywords.filter(keyword => searchText.includes(keyword)).length;
      if (matchCount >= 1) {
        return connection;
      }
    }
  }

  return null;
}

export function formatConnectionMessage(connection: TravelConnection): string {
  return `You saw something like this on your ${connection.tripName} trip!`;
}

export function markConnectionShown(connectionId: string): void {
  try {
    const shown = JSON.parse(localStorage.getItem("geoquest-connections-shown") || "[]");
    if (!shown.includes(connectionId)) {
      shown.push(connectionId);
      localStorage.setItem("geoquest-connections-shown", JSON.stringify(shown));
    }
  } catch {
  }
}

export function hasConnectionBeenShown(connectionId: string): boolean {
  try {
    const shown = JSON.parse(localStorage.getItem("geoquest-connections-shown") || "[]");
    return shown.includes(connectionId);
  } catch {
    return false;
  }
}
