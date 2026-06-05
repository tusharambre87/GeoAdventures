export interface AiPickStop {
  name: string;
  type: string;
  isKidFriendly?: boolean;
  isOptional?: boolean;
}

export interface AiPickDayDetail {
  label: string;
  stops: AiPickStop[];
}

export interface AiPickDetail {
  title: string;
  destination: string;
  durationDays: number;
  description: string;
  ageRange: string;
  days: AiPickDayDetail[];
}

export const AI_PICKS_DETAIL: Record<string, AiPickDetail> = {
  "ai-dc": {
    title: "Washington DC Explorer", destination: "Washington DC",
    durationDays: 3, ageRange: "6-9", description: "Free-entry museums + monuments",
    days: [
      { label: "Day 1 \u2014 The Mall", stops: [
        { name: "National Air and Space Museum", type: "Museum", isKidFriendly: true },
        { name: "National Museum of Natural History", type: "Museum", isKidFriendly: true },
        { name: "Lincoln Memorial", type: "Monument" },
        { name: "Washington Monument", type: "Monument", isOptional: true },
      ]},
      { label: "Day 2 \u2014 Zoo & Gardens", stops: [
        { name: "National Zoo", type: "Zoo", isKidFriendly: true },
        { name: "National Botanic Garden", type: "Garden", isOptional: true },
        { name: "National Archives", type: "Museum", isKidFriendly: true },
      ]},
      { label: "Day 3 \u2014 Capitol Hill", stops: [
        { name: "US Capitol Visitor Center", type: "Landmark", isKidFriendly: true },
        { name: "Library of Congress", type: "Landmark", isOptional: true },
      ]},
    ],
  },
  "ai-nashville": {
    title: "Nashville Family Intro", destination: "Nashville",
    durationDays: 2, ageRange: "5-12", description: "Music & outdoors",
    days: [
      { label: "Day 1 \u2014 Music Row", stops: [
        { name: "Country Music Hall of Fame", type: "Museum", isKidFriendly: true },
        { name: "Ryman Auditorium", type: "Music Venue" },
        { name: "Printers Alley", type: "Neighborhood", isOptional: true },
      ]},
      { label: "Day 2 \u2014 Outdoors", stops: [
        { name: "Centennial Park & Parthenon", type: "Park", isKidFriendly: true },
        { name: "Adventure Science Center", type: "Science Center", isKidFriendly: true },
        { name: "Nashville Zoo", type: "Zoo", isKidFriendly: true, isOptional: true },
      ]},
    ],
  },
  "ai-denver": {
    title: "Denver Outdoors + Science", destination: "Denver",
    durationDays: 3, ageRange: "6-10", description: "Science & nature",
    days: [
      { label: "Day 1 \u2014 Denver Downtown", stops: [
        { name: "Denver Museum of Nature & Science", type: "Museum", isKidFriendly: true },
        { name: "Denver Art Museum", type: "Museum", isOptional: true },
        { name: "16th Street Mall", type: "Neighborhood" },
      ]},
      { label: "Day 2 \u2014 Mountains", stops: [
        { name: "Red Rocks Amphitheatre", type: "Landmark", isKidFriendly: true },
        { name: "Denver Botanic Gardens", type: "Garden", isKidFriendly: true, isOptional: true },
      ]},
      { label: "Day 3 \u2014 Zoo & Park", stops: [
        { name: "Denver Zoo", type: "Zoo", isKidFriendly: true },
        { name: "City Park", type: "Park", isKidFriendly: true },
        { name: "Meow Wolf Denver", type: "Experience", isKidFriendly: true, isOptional: true },
      ]},
    ],
  },
  "ai-austin": {
    title: "Austin Explorer Kids", destination: "Austin",
    durationDays: 2, ageRange: "5-10", description: "Culture & food",
    days: [
      { label: "Day 1 \u2014 Downtown & Culture", stops: [
        { name: "Texas State Capitol", type: "Landmark", isKidFriendly: true },
        { name: "Blanton Museum of Art", type: "Museum", isOptional: true },
        { name: "South Congress Avenue", type: "Neighborhood" },
      ]},
      { label: "Day 2 \u2014 Parks & Nature", stops: [
        { name: "Barton Springs Pool", type: "Park", isKidFriendly: true },
        { name: "Zilker Park", type: "Park", isKidFriendly: true },
        { name: "Natural Bridge Caverns", type: "Nature", isKidFriendly: true, isOptional: true },
      ]},
    ],
  },
  "ai-seattle": {
    title: "Seattle Science + Nature", destination: "Seattle",
    durationDays: 3, ageRange: "6+", description: "Museums & outdoors",
    days: [
      { label: "Day 1 \u2014 Pike Place & Downtown", stops: [
        { name: "Pike Place Market", type: "Market", isKidFriendly: true },
        { name: "Seattle Great Wheel", type: "Attraction", isKidFriendly: true },
        { name: "Seattle Aquarium", type: "Aquarium", isKidFriendly: true },
      ]},
      { label: "Day 2 \u2014 Space Needle Area", stops: [
        { name: "Space Needle", type: "Landmark", isKidFriendly: true },
        { name: "Museum of Pop Culture", type: "Museum", isKidFriendly: true },
        { name: "Pacific Science Center", type: "Science Center", isKidFriendly: true },
      ]},
      { label: "Day 3 \u2014 Waterfront & Parks", stops: [
        { name: "Chihuly Garden and Glass", type: "Art", isOptional: true },
        { name: "Woodland Park Zoo", type: "Zoo", isKidFriendly: true },
        { name: "Discovery Park", type: "Park", isKidFriendly: true, isOptional: true },
      ]},
    ],
  },
  "ai-sandiego": {
    title: "San Diego Family Beach + Zoo", destination: "San Diego",
    durationDays: 3, ageRange: "All ages", description: "Beach & wildlife",
    days: [
      { label: "Day 1 \u2014 Balboa Park", stops: [
        { name: "San Diego Zoo", type: "Zoo", isKidFriendly: true },
        { name: "Fleet Science Center", type: "Science Center", isKidFriendly: true },
        { name: "Balboa Park Gardens", type: "Park", isOptional: true },
      ]},
      { label: "Day 2 \u2014 Beach Day", stops: [
        { name: "Mission Beach", type: "Beach", isKidFriendly: true },
        { name: "Pacific Beach Boardwalk", type: "Boardwalk", isKidFriendly: true },
        { name: "Ocean Beach Pier", type: "Landmark", isOptional: true },
      ]},
      { label: "Day 3 \u2014 Old Town & Harbor", stops: [
        { name: "Old Town San Diego", type: "Historic Site", isKidFriendly: true },
        { name: "USS Midway Museum", type: "Museum", isKidFriendly: true },
        { name: "Seaport Village", type: "Shopping", isOptional: true },
      ]},
    ],
  },
};

export interface TemplateStop {
  name: string;
  stopType: string;
  isOptional: boolean;
}

export function getAiPickTemplateStops(slug: string): TemplateStop[] | null {
  const detail = AI_PICKS_DETAIL[slug];
  if (!detail) return null;
  return detail.days.flatMap(day =>
    day.stops.map(s => ({
      name: s.name,
      stopType: s.type,
      isOptional: s.isOptional ?? false,
    }))
  );
}
