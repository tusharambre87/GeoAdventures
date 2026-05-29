export interface CompassDirection {
  label: string;
  degrees: number;
}

export interface CityCoords {
  lat: number;
  lng: number;
}

export type ClueType = "text" | "landmark" | "flag";

export interface LandmarkClue {
  name: string;
  description: string;
  svg: string;
}

export interface FlagClue {
  countryCode: string;
  countryName: string;
  hint: string;
}

export interface QuestStep {
  stepIndex: number;
  clueType?: ClueType;
  cityClue: string;
  landmarkClue?: LandmarkClue;
  flagClue?: FlagClue;
  cityOptions: string[];
  correctCity: string;
  compassClue: string;
  compassDirection: CompassDirection;
  compassWrongOptions?: CompassDirection[];
  transportMode?: "plane" | "car" | "train" | "ship";
  fragmentName: string;
  fragmentEmoji: string;
  travelFact: string;
  cityCoords: CityCoords;
  storyBeat?: string;
}

export interface Adventure {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  description: string;
  storyIntro?: string;
  startCityFunFact?: string;
  steps: QuestStep[];
  reward: {
    title: string;
    emoji: string;
    description: string;
  };
  startCity: string;
  startCityEmoji: string;
  startCityCoords: CityCoords;
  locked?: boolean;
  nextAdventure?: {
    country: string;
    city: string;
    cityOptions: string[];
    adventureId: string;
  };
}

export interface AdventureProgress {
  adventureId: string;
  currentStep: number;
  fragmentsCollected: string[];
  totalXpEarned: number;
  wrongGuesses: number;
  completed: boolean;
  completedAt?: string;
  bestTimeMs?: number;
  startedAt: string;
}

export interface AdventureRecord {
  adventureId: string;
  completions: number;
  bestTimeMs: number;
  bestXp: number;
  lastCompletedAt: string;
}

const COMPASS_DIRS = {
  N:  { label: "North", degrees: 0 },
  NE: { label: "Northeast", degrees: 45 },
  E:  { label: "East", degrees: 90 },
  SE: { label: "Southeast", degrees: 135 },
  S:  { label: "South", degrees: 180 },
  SW: { label: "Southwest", degrees: 225 },
  W:  { label: "West", degrees: 270 },
  NW: { label: "Northwest", degrees: 315 },
};

const DIRECTION_COMPONENTS: Record<string, string[]> = {
  "Northeast": ["North", "East"],
  "Southeast": ["South", "East"],
  "Southwest": ["South", "West"],
  "Northwest": ["North", "West"],
};

export function makeCompassOptions(correct: CompassDirection): CompassDirection[] {
  const forbidden = new Set([correct.label, ...(DIRECTION_COMPONENTS[correct.label] ?? [])]);
  const pool = Object.values(COMPASS_DIRS).filter(d => !forbidden.has(d.label));
  const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
  const options = [...shuffled, correct].sort(() => Math.random() - 0.5);
  return options;
}

export const GREECE_REGIONS = [
  {
    name: "Central Macedonia",
    color: "#E8847C",
    path: "M28,8 L38,5 L48,3 L55,6 L58,12 L52,16 L42,18 L35,20 L28,17 L24,12Z",
  },
  {
    name: "Eastern Macedonia & Thrace",
    color: "#8DAA7E",
    path: "M55,6 L65,2 L78,4 L82,8 L76,14 L68,16 L58,12Z",
  },
  {
    name: "Epirus & Western Macedonia",
    color: "#B490C0",
    path: "M8,14 L18,10 L28,8 L24,12 L28,17 L35,20 L30,28 L22,32 L14,28 L8,22Z",
  },
  {
    name: "Thessaly",
    color: "#7CC5D6",
    path: "M35,20 L42,18 L52,16 L55,22 L50,28 L42,30 L35,28 L30,28Z",
  },
  {
    name: "Central Greece & Attica",
    color: "#E89898",
    path: "M30,28 L35,28 L42,30 L50,28 L52,34 L48,40 L38,42 L30,38 L22,34 L22,32Z",
  },
  {
    name: "Peloponnese",
    color: "#C4A882",
    path: "M22,34 L30,38 L38,42 L42,48 L38,56 L32,60 L24,58 L18,52 L14,44 L16,38Z",
  },
  {
    name: "Crete",
    color: "#88B88C",
    path: "M30,72 L40,70 L55,68 L65,70 L68,74 L62,78 L48,80 L35,78 L28,76Z",
  },
];

export const ADVENTURES: Adventure[] = [
  {
    id: "lost-crown",
    title: "The Lost Crown",
    subtitle: "A Royal Mystery Across 3 Continents & 9 Cities",
    icon: "👑",
    description: "Long ago, a powerful crown was broken into pieces to keep it from falling into the wrong hands. Each fragment was hidden in a different city across the world.",
    storyIntro: "An old explorer's map has resurfaced… and it points to one starting place:",
    startCity: "San Francisco",
    startCityEmoji: "🌉",
    startCityCoords: { lat: 37.77, lng: -122.42 },
    reward: {
      title: "The Lost Crown Restored",
      emoji: "👑",
      description: "You recovered all 7 fragments… but they don't form a crown.\n\nThey align into something else.\n\nA map.",
    },
    nextAdventure: {
      country: "Turkey",
      city: "Istanbul, Turkey",
      cityOptions: ["Athens, Greece", "Rome, Italy", "Istanbul, Turkey", "Madrid, Spain"],
      adventureId: "sunken-compass",
    },
    steps: [
      {
        stepIndex: 0,
        storyBeat: "The map is incomplete.\n\nLarge sections are missing — torn away.\n\nOnly faint lines remain.\n\nAn inscription sits at the bottom:\n\n\"Rebuild the map… and the path will reveal itself.\"\n\nYou look up.\n\nThe Golden Gate Bridge stands in front of you.\n\n—\n\nWait.\n\nDo you see that?\n\nNear the base… faint markings in the metal.\n\nNot random.\n\nEtched.\n\nYou hold the map closer.\n\nThe lines begin to align.\n\n—\n\nLook…\n\nThe map just changed.\n\nSomething is appearing.\n\nWhat does it say?",
        cityClue: "Your next destination sparkles in the middle of a desert. A place where bright lights never sleep.",
        cityOptions: ["Las Vegas", "Phoenix", "Salt Lake City", "Albuquerque"],
        correctCity: "Las Vegas",
        compassClue: "The fragment is hidden deep in the Nevada desert, where slot machines ring all night long.",
        compassDirection: COMPASS_DIRS.E,
        compassWrongOptions: [COMPASS_DIRS.SW, COMPASS_DIRS.NW, COMPASS_DIRS.N],
        transportMode: "car",
        fragmentName: "Map Piece 1",
        fragmentEmoji: "🗺️",
        travelFact: "Las Vegas gets less than 5 inches of rain per year!",
        cityCoords: { lat: 36.17, lng: -115.14 },
      },
      {
        stepIndex: 1,
        storyBeat: "Vegas. Lights everywhere. Noise. Movement.\n\nBut something feels… off.\n\nAway from the main strip, inside a quieter corridor, something catches your eye.\n\nA carved panel.\n\nSharp lines. Jagged shapes.\n\nNot decoration.\n\nYou place the Las Vegas piece into the map.\n\n—\n\nWait…\n\nLook at this.\n\nThe map just reacted.\n\nThose shapes… they're clearer now.\n\nMassive peaks.\n\nWhat place could this be?",
        clueType: "landmark",
        cityClue: "This city sits near the Rocky Mountains and is known as the Mile High City.",
        landmarkClue: {
          name: "Rocky Mountain Range",
          description: "Where 14,000 ft peaks make you feel closer to the sky",
          svg: "mountains",
        },
        cityOptions: ["Denver", "Asheville", "Salt Lake City", "Santa Fe"],
        correctCity: "Denver",
        compassClue: "Beyond the desert, past the red rocks, the Rocky Mountains hold the next piece.",
        compassDirection: COMPASS_DIRS.NE,
        transportMode: "car",
        fragmentName: "Map Piece 2",
        fragmentEmoji: "🗺️",
        travelFact: "Denver is exactly one mile above sea level!",
        cityCoords: { lat: 39.74, lng: -104.99 },
      },
      {
        stepIndex: 2,
        storyBeat: "Here in Denver, the air feels thinner.\n\nColder.\n\nFrom a higher point in the city, something unusual stands out.\n\nA metal plaque.\n\nWorn, but deliberate.\n\nBehind it… an outline.\n\nA figure.\n\nHolding something high.\n\nYou place the Denver piece into the map.\n\n—\n\nLook…\n\nDid you notice that?\n\nThe map is extending outward.\n\nThere's something forming along a coastline.\n\nWhat could that be?",
        clueType: "landmark",
        cityClue: "A giant statue holding a torch welcomes visitors to this famous harbor city.",
        landmarkClue: {
          name: "Statue of Liberty",
          description: "A gift from France, she holds her torch 305 ft above the harbor",
          svg: "statue-of-liberty",
        },
        cityOptions: ["New York", "Boston", "Philadelphia", "Washington D.C."],
        correctCity: "New York",
        compassClue: "Leave the mountains behind and ride all the way to the Atlantic coast, where a famous statue awaits.",
        compassDirection: COMPASS_DIRS.E,
        transportMode: "train",
        fragmentName: "Map Piece 3",
        fragmentEmoji: "🗺️",
        travelFact: "More than 800 languages are spoken in New York City!",
        cityCoords: { lat: 40.71, lng: -74.01 },
      },
      {
        stepIndex: 3,
        storyBeat: "As you arrive in New York, everything is moving.\n\nCrowds. Traffic. Sound.\n\nBut near the harbor, something quieter stands out.\n\nA symbol carved into stone.\n\nClean lines. Symmetrical.\n\nDoesn't belong here.\n\nYou place the New York piece into the map.\n\n—\n\nWait…\n\nLook closely.\n\nThe map just stabilized.\n\nSomething new appeared.\n\nA flag.\n\nCentered.\n\nClear.\n\nDo you recognize it?",
        clueType: "flag",
        cityClue: "This island nation is known for volcanoes, glaciers, and sits between North America and Europe.",
        flagClue: {
          countryCode: "is",
          countryName: "Iceland",
          hint: "This Nordic island sits on fire and ice — volcanoes beneath glaciers",
        },
        cityOptions: ["Reykjavík", "Québec City", "Dublin", "Boston"],
        correctCity: "Reykjavík",
        compassClue: "Follow the cold northern route across the Atlantic, toward a land of fire and ice.",
        compassDirection: COMPASS_DIRS.NE,
        fragmentName: "Map Piece 4",
        fragmentEmoji: "🗺️",
        travelFact: "Iceland has volcanoes, glaciers, AND geysers!",
        cityCoords: { lat: 64.15, lng: -21.94 },
      },
      {
        stepIndex: 4,
        storyBeat: "Open land. Wind. Silence. That's Reykjavík for you.\n\nNear the geothermal fields, patterns form in the ground.\n\nNot random.\n\nStructured.\n\nAlmost like markings.\n\nYou place the Reykjavík piece into the map.\n\n—\n\nLook…\n\nNo image this time.\n\nJust words.\n\nThe map is giving you something different.\n\nWhat does it say?",
        cityClue: "This historic capital sits along the River Thames and is home to Big Ben.",
        cityOptions: ["London", "Dublin", "Edinburgh", "Manchester"],
        correctCity: "London",
        compassClue: "Cross the remaining ocean to reach the land of the King and Big Ben.",
        compassDirection: COMPASS_DIRS.SE,
        fragmentName: "Map Piece 5",
        fragmentEmoji: "🗺️",
        travelFact: "The London Underground is the oldest metro system in the world!",
        cityCoords: { lat: 51.51, lng: -0.13 },
      },
      {
        stepIndex: 5,
        storyBeat: "Stone streets. Old buildings. London is all about history everywhere.\n\nNear the river, something catches your attention.\n\nA metallic engraving.\n\nPrecise. Symmetrical.\n\nToo intentional.\n\nYou place the London piece into the map.\n\n—\n\nWait…\n\nLook at this.\n\nThe map just lit up.\n\nSomething is forming.\n\nTall. Geometric.\n\nAlmost like a structure made of iron.\n\nWhat do you think this is?",
        clueType: "landmark",
        cityClue: "A city of art and romance with a famous iron tower.",
        landmarkClue: {
          name: "Eiffel Tower",
          description: "Built in 1889, this 1,083 ft iron lattice tower was meant to be temporary",
          svg: "eiffel-tower",
        },
        cityOptions: ["Paris", "Brussels", "Lyon", "Geneva"],
        correctCity: "Paris",
        compassClue: "Cross the English Channel to find the city of croissants and an iron tower that sparkles.",
        compassDirection: COMPASS_DIRS.SE,
        fragmentName: "Map Piece 6",
        fragmentEmoji: "🗺️",
        travelFact: "The Eiffel Tower was supposed to be torn down after 20 years!",
        cityCoords: { lat: 48.86, lng: 2.35 },
      },
      {
        stepIndex: 6,
        storyBeat: "You arrive in Paris.\n\nOpen spaces. Movement. Color.\n\nNear a public square, patterns appear beneath your feet.\n\nTiles arranged in bold horizontal lines.\n\nRed. Yellow.\n\nYou place the Paris piece into the map.\n\n—\n\nLook…\n\nThat's not random.\n\nThe map just filled another section.\n\nA flag is appearing.\n\nDo you recognize it?",
        clueType: "flag",
        cityClue: "This lively capital is famous for flamenco, tapas, and a royal palace in the heart of the city.",
        flagClue: {
          countryCode: "es",
          countryName: "Spain",
          hint: "Red and yellow stripes — the flag of bulls, flamenco, and sunny coasts",
        },
        cityOptions: ["Madrid", "Barcelona", "Lisbon", "Marseille"],
        correctCity: "Madrid",
        compassClue: "Head southwest past the Pyrenees mountains into a sun-soaked peninsula of fiestas and siestas.",
        compassDirection: COMPASS_DIRS.SW,
        transportMode: "train",
        fragmentName: "Map Piece 7",
        fragmentEmoji: "🗺️",
        travelFact: "Madrid's Royal Palace has over 3,400 rooms — more than Buckingham Palace!",
        cityCoords: { lat: 40.42, lng: -3.70 },
      },
      {
        stepIndex: 7,
        storyBeat: "Madrid. Wow, the map is almost complete.\n\nOnly one section remains.\n\nThe final piece is found and placed.\n\n—\n\nWait…\n\nEverything just stopped.\n\nNo flicker. No movement.\n\nJust… clarity.\n\nThe map is complete.\n\nAnd now—\n\nit's giving you the final clue.",
        cityClue: "Ancient pyramids rise from the desert sands near this historic city on the Nile River.",
        cityOptions: ["Cairo", "Marrakech", "Istanbul", "Nairobi"],
        correctCity: "Cairo",
        compassClue: "Cross the Mediterranean Sea to the land of pharaohs, pyramids, and the great Nile river.",
        compassDirection: COMPASS_DIRS.SE,
        fragmentName: "Map Piece 8",
        fragmentEmoji: "🗺️",
        travelFact: "The Great Pyramid was the tallest building in the world for 3,800 years!",
        cityCoords: { lat: 30.04, lng: 31.24 },
      },
    ],
  },
  {
    id: "broken-trail",
    title: "The Broken Trail",
    subtitle: "Follow the scattered path the crown once chased",
    icon: "🧭",
    description: "The map you rebuilt wasn't the destination. It was a trail — scattered across distant lands. Each place you visit reveals where the crown once searched… and what it was trying to find.",
    storyIntro: "The map you uncovered is no longer still.\n\nThe outline of the country fades.\n\nLines begin to shift.\n\nRearranging.\n\nBreaking apart.\n\n—\n\nWait…\n\nDo you see this?\n\nThe map isn't showing a place anymore.\n\nIt's forming a trail.\n\nScattered points. Not connected.\n\nAn inscription appears:\n\n\"Not where it rests…\"\n\"…but where it searched.\"\n\nAnd near the first mark, something is uncovered.",
    startCity: "Istanbul",
    startCityEmoji: "🇹🇷",
    startCityCoords: { lat: 41.01, lng: 28.98 },
    reward: {
      title: "The Broken Trail",
      emoji: "🧭",
      description: "You assembled the ancient Wayfinder Compass!",
    },
    locked: true,
    nextAdventure: {
      country: "Kenya",
      city: "Nairobi, Kenya",
      cityOptions: ["Nairobi, Kenya", "Delhi, India", "Beijing, China", "Casablanca, Morocco"],
      adventureId: "wild-signal",
    },
    steps: [
      {
        stepIndex: 0,
        storyBeat: "The fragment hums...\n\nNot warmer…. Colder. The trail isn't straight. It was scattered.\n\nAs you bring it close to the map, look — it's doing something.\n\nIs it forming an image?",
        clueType: "landmark",
        cityClue: "A city known for colorful domes shaped like flames rising above a grand square.",
        landmarkClue: {
          name: "Saint Basil's Cathedral",
          description: "Colorful domes shaped like flames, standing since 1561",
          svg: "st-basils",
        },
        cityOptions: ["Moscow", "Helsinki", "Warsaw", "Kyiv"],
        correctCity: "Moscow",
        compassClue: "Away from warmth… into the cold.",
        compassDirection: COMPASS_DIRS.NE,
        fragmentName: "Compass Fragment 2",
        fragmentEmoji: "🧭",
        travelFact: "Moscow can get extremely cold in winter — far below freezing!",
        cityCoords: { lat: 55.76, lng: 37.62 },
      },
      {
        stepIndex: 1,
        storyBeat: "The air here is sharp. Cold. Still.\n\nAs you set the fragment against the map, the lines connect a little further.\n\nDid you notice that?\n\nThe shape doesn't look complete.\n\nAnd it doesn't quite look like the crown either.\n\nBut before there's time to study it, the map shifts again.\n\nNo image appears this time.\n\nOnly words.\n\nWhat does that mean?",
        cityClue: "A city where the tallest structure rises from the desert.",
        cityOptions: ["Dubai", "Riyadh", "Doha", "Kuwait City"],
        correctCity: "Dubai",
        compassClue: "From cold lands… to burning ground.",
        compassDirection: COMPASS_DIRS.SE,
        fragmentName: "Compass Fragment 3",
        fragmentEmoji: "🧭",
        travelFact: "Dubai has the tallest building in the world!",
        cityCoords: { lat: 25.20, lng: 55.27 },
      },
      {
        stepIndex: 2,
        storyBeat: "Here in Dubai, it's hot.\n\nHeat rises from the ground.\n\nGlass towers reflect the sun.\n\nThis new fragment fits beside the first two perfectly.\n\nLook…\n\nDo you see the curve now?\n\nIt still could be crown-work.\n\nOr could it?\n\nJust then, the map stretches outward across water.\n\nAnd then—\n\na flag appears.\n\nDo you recognize it?",
        clueType: "flag",
        cityClue: "One of the busiest port cities in a country of over a billion people.",
        flagClue: {
          countryCode: "in",
          countryName: "India",
          hint: "Three colors with a blue wheel in the center",
        },
        cityOptions: ["Mumbai", "Karachi", "Bangkok", "Singapore"],
        correctCity: "Mumbai",
        compassClue: "Across water… where movement never stops.",
        compassDirection: COMPASS_DIRS.E,
        fragmentName: "Compass Fragment 4",
        fragmentEmoji: "🧭",
        travelFact: "Mumbai is one of the busiest cities in the world!",
        cityCoords: { lat: 19.08, lng: 72.88 },
      },
      {
        stepIndex: 3,
        storyBeat: "The city never slows — this is Mumbai for you.\n\nMovement everywhere.\n\nAs the next fragment is placed into the trail, the metal edges begin to line up more clearly.\n\nWait…\n\nDid you see that?\n\nThose pieces aren't shaping into a crown top.\n\nThey're forming something round.\n\nThe map flashes.\n\nIs it an inscription?\n\nA structure. Red. Massive. Historic.\n\nDo you know what landmark this is?",
        clueType: "landmark",
        cityClue: "A capital city where massive red walls were built for emperors centuries ago.",
        landmarkClue: {
          name: "Red Fort",
          description: "Massive red walls built for emperors, over 350 years old",
          svg: "red-fort",
        },
        cityOptions: ["Delhi", "Kuwait", "Moscow", "Lucknow"],
        correctCity: "Delhi",
        compassClue: "Closer… but further into the past.",
        compassDirection: COMPASS_DIRS.N,
        transportMode: "car",
        fragmentName: "Compass Fragment 5",
        fragmentEmoji: "🧭",
        travelFact: "The Red Fort is over 350 years old!",
        cityCoords: { lat: 28.61, lng: 77.21 },
      },
      {
        stepIndex: 4,
        storyBeat: "The trail feels tighter now.\n\nMore precise.\n\nLess scattered.\n\nThe next fragment slides into place with a click.\n\nLook closely.\n\nThat edge… and that curve…\n\nWhat does that mean?\n\nAnd just then, the map responds again.\n\nNo image this time.\n\nOnly a clue.",
        cityClue: "A city famous for its grand Mughal gate, food streets, and gardens — once the heart of old Punjab.",
        cityOptions: ["Lahore", "Kabul", "Tehran", "Tashkent"],
        correctCity: "Lahore",
        compassClue: "Same story… different land.",
        compassDirection: COMPASS_DIRS.NW,
        transportMode: "train",
        fragmentName: "Compass Fragment 6",
        fragmentEmoji: "🧭",
        travelFact: "Lahore is one of the oldest cities in South Asia!",
        cityCoords: { lat: 31.55, lng: 74.35 },
      },
      {
        stepIndex: 5,
        storyBeat: "The trail slows.\n\nThe markings are no longer jumping wildly.\n\nAs the last fragment is uncovered, everything seems to pause.\n\nYou place it beside the others.\n\nAnd now it's obvious.\n\nWait…\n\nDo you see it?\n\nThese are not crown pieces.\n\nNot at all.\n\nThey belong to something older.\n\nSomething built to point.\n\nThe map steadies.\n\nA final flag appears.\n\nDo you know it?",
        clueType: "flag",
        cityClue: "A modern capital that grew from a small desert town into a huge metropolis.",
        flagClue: {
          countryCode: "sa",
          countryName: "Saudi Arabia",
          hint: "Green flag with Arabic script and a sword",
        },
        cityOptions: ["Riyadh", "Doha", "Muscat", "Amman"],
        correctCity: "Riyadh",
        compassClue: "Back to the desert… where the trail slows.",
        compassDirection: COMPASS_DIRS.W,
        fragmentName: "Compass Fragment 7",
        fragmentEmoji: "🧭",
        travelFact: "Riyadh grew from a small town into a huge modern city!",
        cityCoords: { lat: 24.71, lng: 46.68 },
      },
    ],
  },
  {
    id: "wild-signal",
    title: "The Wayfinder's Path",
    subtitle: "The compass doesn't show the path. It reveals it.",
    icon: "👑",
    description: "The compass reacts only when you arrive. Each place reveals something hidden in the world itself. The pieces you collect begin to form something… but what exactly, you're not sure yet.",
    storyIntro: "Here you are, Nairobi - the safari capital of the world.\n\nThe land that stretches endlessly.\n\nTall grass that moves with the wind.\n\nIn the distance… something shifts.\n\nWildlife. Quiet. Powerful.\n\n—\n\nJust then—\n\nthe compass reacts.\n\nThe needle spins wildly.\n\n—\n\nIt pulls forward. Not toward the map.\n\nToward something real.\n\n—\n\nAs you walk closer.\n\nA large rock sits ahead.\n\nIts surface is scratched.\n\nCarved.\n\nNot random.\n\n—\n\nAs the compass steadies—\n\nsomething reveals itself.\n\nA small metallic piece.\n\nHidden in the carving.",
    startCity: "Nairobi",
    startCityEmoji: "🦁",
    startCityCoords: { lat: -1.29, lng: 36.82 },
    locked: true,
    reward: {
      title: "The Wayfinder's Path",
      emoji: "👑",
      description: "You assembled the ancient crown!",
    },
    nextAdventure: {
      country: "United States",
      city: "Seattle",
      cityOptions: ["Seattle", "Vancouver", "New York", "San Diego"],
      adventureId: "royal-journal",
    },
    steps: [
      {
        stepIndex: 0,
        storyBeat: "This artifact looks like something ancient and lost in time.\n\nCan it be the actual crown we have been looking for?\n\nJust then…. the rock surface glows faintly as you pick the artifact up.\n\nAn image begins to appear.\n\nWhat does it show?",
        clueType: "landmark",
        cityClue: "A flat-topped mountain overlooking the southern coast of Africa",
        landmarkClue: {
          name: "Table Mountain",
          description: "A flat-topped mountain overlooking the southern coast of Africa",
          svg: "table-mountain",
        },
        cityOptions: ["Cape Town", "Durban", "Nairobi", "Casablanca"],
        correctCity: "Cape Town",
        compassClue: "Across the land… far away from the equator.",
        compassDirection: COMPASS_DIRS.S,
        compassWrongOptions: [COMPASS_DIRS.NE, COMPASS_DIRS.E, COMPASS_DIRS.NW],
        transportMode: "car",
        fragmentName: "Artifact 2",
        fragmentEmoji: "👑",
        travelFact: "Table Mountain is over 600 million years old!",
        cityCoords: { lat: -33.92, lng: 18.42 },
      },
      {
        stepIndex: 1,
        storyBeat: "As you arrive in South Africa, the air feels different here.\n\nCool. Sharp.\n\nOcean waves crash against the cliffs.\n\nWind rushes past you.\n\n—\n\nThe moment you bring the second artifact closer -\n\nThe compass begins to spin again.\n\nFaster.\n\nStronger.\n\nDid you notice that?\n\nLight spreads across it.\n\nWater. Falling endlessly.\n\nMist rising.\n\n—\n\nThe shape keeps growing.\n\nBut still unclear.\n\n—\n\nThe image sharpens.\n\nWhat place is this?",
        clueType: "flag",
        cityClue: "Home to one of the largest waterfalls in the world, known as 'The Smoke That Thunders'",
        flagClue: {
          countryCode: "zw",
          countryName: "Zimbabwe",
          hint: "Home to one of the largest waterfalls in the world",
        },
        cityOptions: ["Victoria Falls", "Nairobi", "Accra", "Addis Ababa"],
        correctCity: "Victoria Falls",
        compassClue: "Inland… toward thunder and falling water.",
        compassDirection: COMPASS_DIRS.N,
        transportMode: "car",
        fragmentName: "Artifact 3",
        fragmentEmoji: "👑",
        travelFact: "The spray from Victoria Falls can be seen from miles away!",
        cityCoords: { lat: -17.92, lng: 25.86 },
      },
      {
        stepIndex: 2,
        storyBeat: "The sound is overwhelming here at the falls.\n\nWater crashing endlessly below.\n\nMist rising into the air.\n\nRainbows forming in the sunlight.\n\n—\n\nThe compass vibrates.\n\nThen pulses.\n\n—\n\nAs you align the third artifact with the other two, a nearby stone wall glows faintly.\n\nAn image forms.\n\nA towering figure.\n\nArms stretched wide.\n\nAbove a coastal city.\n\n—\n\nLook closely.\n\nDo you see the pattern now?\n\nWhat is this becoming?\n\n—\n\nThe image sharpens.\n\nDo you recognize it?",
        clueType: "landmark",
        cityClue: "A towering statue overlooking a vibrant coastal city",
        landmarkClue: {
          name: "Christ the Redeemer",
          description: "A towering statue overlooking a vibrant coastal city",
          svg: "christ-redeemer",
        },
        cityOptions: ["Lima", "Miami", "Barcelona", "Rio de Janeiro"],
        correctCity: "Rio de Janeiro",
        compassClue: "Across the ocean… toward rhythm and coastlines.",
        compassDirection: COMPASS_DIRS.SW,
        fragmentName: "Artifact 4",
        fragmentEmoji: "👑",
        travelFact: "Rio is home to one of the world's largest urban forests!",
        cityCoords: { lat: -22.90, lng: -43.17 },
      },
      {
        stepIndex: 3,
        storyBeat: "Samba music announces your arrival in Rio de Janeiro!\n\nThe city moves with energy. Music fills the air.\n\nWaves roll onto the shore.\n\nBright colors everywhere.\n\n—\n\nThe compass doesn't spin.\n\nIt pulses.\n\nSlow. Controlled. Pointing to a painted wall.\n\nFaded. Old.\n\n—\n\nAnd then — as you get the 4 artifacts closer to the wall,\n\na flag appears.\n\nSharp. Centered.\n\nWhat does this flag mean?",
        clueType: "flag",
        cityClue: "Red and white with a historic emblem at its center",
        flagClue: {
          countryCode: "pe",
          countryName: "Peru",
          hint: "Red and white with a historic emblem at its center",
        },
        cityOptions: ["Bogotá", "Quito", "Cusco", "Santiago"],
        correctCity: "Cusco",
        compassClue: "Leave the coast… climb into the mountains.",
        compassDirection: COMPASS_DIRS.W,
        transportMode: "train",
        fragmentName: "Artifact 5",
        fragmentEmoji: "👑",
        travelFact: "Machu Picchu was hidden from the world until 1911!",
        cityCoords: { lat: -13.16, lng: -72.55 },
      },
      {
        stepIndex: 4,
        storyBeat: "Mist drifts through the ruins as you see the tall mountains of Machu Picchu staring at you.\n\nStone paths stretch in every direction.\n\nSilence surrounds you.\n\n—\n\nThe compass steadies as you bring all 5 pieces together.\n\nThen shifts.\n\nThis certainly looks like the crown we were seeking.\n\n—\n\nYou step forward.\n\nThe ground beneath you glows faintly.\n\nLines begin forming.\n\nWords.\n\n—\n\nThe words sharpen.\n\nWhat do they say?",
        cityClue: "A massive capital built over ancient ruins, where history lies beneath modern streets.",
        cityOptions: ["Lima", "Mexico City", "Havana", "Bogotá"],
        correctCity: "Mexico City",
        compassClue: "Beyond the mountains… toward a land of ancient legends.",
        compassDirection: COMPASS_DIRS.NW,
        compassWrongOptions: [COMPASS_DIRS.NE, COMPASS_DIRS.S, COMPASS_DIRS.E],
        fragmentName: "Artifact 6",
        fragmentEmoji: "👑",
        travelFact: "Mexico City was built on the ruins of the Aztec capital!",
        cityCoords: { lat: 19.43, lng: -99.13 },
      },
      {
        stepIndex: 5,
        storyBeat: "Wow - busy streets here in Mexico City.\n\nThe city is alive.\n\nNoise. Motion. Energy.\n\n—\n\nYou bring the 6 artifact pieces together.\n\nWait….look at all the pieces.\n\n—\n\nDo you see it now?\n\nWhat is this forming? Is that really it….\n\nJust then… the compass reacts instantly.\n\nPrecise.\n\nFocused.\n\n—\n\nIt pulls you toward a structure.\n\nYou touch it.\n\n—\n\nAn image forms.\n\nWater.\n\nMountains.\n\nDense forests.\n\n—\n\nThe image sharpens.\n\nDo you recognize this place?",
        clueType: "landmark",
        cityClue: "A coastal city where mountains, forests, and ocean meet",
        landmarkClue: {
          name: "Vancouver Skyline",
          description: "A coastal city where mountains, forests, and ocean meet",
          svg: "vancouver-skyline",
        },
        cityOptions: ["Anchorage", "Vancouver", "Seattle", "San Francisco"],
        correctCity: "Vancouver",
        compassClue: "Further … where land meets ocean and mountains.",
        compassDirection: COMPASS_DIRS.N,
        fragmentName: "Artifact 7",
        fragmentEmoji: "👑",
        travelFact: "Vancouver is surrounded by mountains on three sides and ocean on the fourth!",
        cityCoords: { lat: 49.28, lng: -123.12 },
      },
    ],
  },
  {
    id: "royal-journal",
    title: "The Royal Journal",
    subtitle: "The crown is complete… but it remembers nothing.",
    icon: "📖",
    description: "The compass now guides with precision. Each destination reveals a missing page of the Royal Journal — restoring what the crown has forgotten.",
    storyIntro: "Seattle feels quiet under the clouds.\n\nCool air. Light rain. A stillness in the skyline.\n\n—\n\nThen — the crown gives off a faint hum.\n\nDid you feel that?\n\n—\n\nThe compass moves too, steady and precise, pointing toward something nearby.\n\n—\n\nA worn parchment page is discovered, half-hidden and weathered by time.\n\n—\n\nCould this be a page from the Royal Journal?",
    startCityFunFact: "Seattle is known for its coffee culture and constant light rain!",
    startCity: "Seattle",
    startCityEmoji: "🌧️",
    startCityCoords: { lat: 47.61, lng: -122.33 },
    locked: true,
    reward: {
      title: "The Royal Journal Recovered",
      emoji: "📖",
      description: "All 7 pages of the Royal Journal have been restored.\n\nThe crown remembers.\n\nBut the final piece… is still missing.",
    },
    nextAdventure: {
      country: "Australia",
      city: "Sydney",
      cityOptions: ["Beijing", "Colombo", "Sydney", "Las Vegas"],
      adventureId: "sunken-compass",
    },
    steps: [
      {
        stepIndex: 0,
        storyBeat: "You hold the page near the crown.\n\nThe markings begin to shift.\n\nWait… did you see that?\n\n—\n\nThe compass steadies, and something forms across the surface.\n\nMist. Motion. Falling water.\n\n—\n\nWhat place could this be?",
        clueType: "landmark",
        cityClue: "A natural wonder where massive waterfalls send mist rising endlessly into the sky.",
        landmarkClue: {
          name: "Niagara Falls",
          description: "Massive waterfalls where mist rises endlessly into the sky",
          svg: "niagara-falls",
        },
        cityOptions: ["Niagara Falls", "Chicago", "Boston", "Montreal"],
        correctCity: "Niagara Falls",
        compassClue: "Across land… toward roaring water.",
        compassDirection: COMPASS_DIRS.E,
        fragmentName: "Journal Page 2",
        fragmentEmoji: "📖",
        travelFact: "Niagara Falls moves backward about 1 foot every year due to erosion!",
        cityCoords: { lat: 43.10, lng: -79.07 },
      },
      {
        stepIndex: 1,
        storyBeat: "Niagara hits you all at once.\n\nThe roar is constant. The mist is cool against your face.\n\n—\n\nYou bring the two pages together.\n\nThe edges align a little more.\n\n—\n\nThen, through the mist, something begins to appear.\n\nTall. Reflective. A skyline rising beside the water.",
        clueType: "landmark",
        cityClue: "A city of towering buildings reflected across a lake, home to a famous silver bean sculpture.",
        landmarkClue: {
          name: "Chicago Skyline",
          description: "A city of towering buildings reflected across the water and showing the famous bean",
          svg: "chicago-skyline",
        },
        cityOptions: ["Chicago", "Toronto", "Detroit", "Philadelphia"],
        correctCity: "Chicago",
        compassClue: "Toward the heart of the land… where the skyline rises.",
        compassDirection: COMPASS_DIRS.SW,
        compassWrongOptions: [COMPASS_DIRS.N, COMPASS_DIRS.NE, COMPASS_DIRS.W],
        fragmentName: "Journal Page 3",
        fragmentEmoji: "📖",
        travelFact: "Chicago reversed the flow of its river in 1900 to protect the city's water supply!",
        cityCoords: { lat: 41.88, lng: -87.63 },
      },
      {
        stepIndex: 2,
        storyBeat: "Chicago rises around you in glass and steel.\n\nThe river, the reflections, the movement — everything feels sharp.\n\n—\n\nYou bring the pages together again.\n\nWait… do you hear that?\n\nA faint rhythm is building.\n\n—\n\nThe pages react, and words begin forming.",
        clueType: "text",
        cityClue: "A vibrant city known for live music, creativity, and a culture that keeps things weird.",
        cityOptions: ["Austin", "San Diego", "Cancun", "Lima"],
        correctCity: "Austin",
        compassClue: "Southwest… toward rhythm and sound.",
        compassDirection: COMPASS_DIRS.SW,
        compassWrongOptions: [COMPASS_DIRS.NW, COMPASS_DIRS.NE, COMPASS_DIRS.W],
        fragmentName: "Journal Page 4",
        fragmentEmoji: "📖",
        travelFact: "Austin is the 'Live Music Capital of the World' with over 250 live music venues!",
        cityCoords: { lat: 30.27, lng: -97.74 },
      },
      {
        stepIndex: 3,
        storyBeat: "Austin feels alive the moment you arrive.\n\nMusic spills out into the streets. The city has energy everywhere.\n\n—\n\nYou bring the pages together.\n\nThe crown hums a little stronger this time.\n\n—\n\nThen an image appears.\n\nStone. Columns. A great white building of power and history.",
        clueType: "landmark",
        cityClue: "A city of monuments and history, home to the building where the President of the United States lives.",
        landmarkClue: {
          name: "White House",
          description: "A historic structure where the President lives, surrounded by the nation's capital",
          svg: "white-house",
        },
        cityOptions: ["Washington D.C.", "Boston", "Philadelphia", "Atlanta"],
        correctCity: "Washington D.C.",
        compassClue: "Toward history and power… where the nation was built.",
        compassDirection: COMPASS_DIRS.NE,
        fragmentName: "Journal Page 5",
        fragmentEmoji: "📖",
        travelFact: "The White House has 132 rooms, 35 bathrooms, and its own movie theater!",
        cityCoords: { lat: 38.91, lng: -77.04 },
      },
      {
        stepIndex: 4,
        storyBeat: "Washington feels structured and deliberate.\n\nMonuments, museums, and history surround you.\n\n—\n\nYou align the pages again.\n\nColors begin spreading across them.\n\nWait… do you see that?\n\n—\n\nA flag is beginning to form.",
        clueType: "text",
        cityClue: "The southernmost large U.S. city — warm, tropical, surrounded by ocean and famous for beaches and nightlife.",
        cityOptions: ["Miami", "Lagos", "Buenos Aires", "Maui"],
        correctCity: "Miami",
        compassClue: "South… toward warmth and ocean breeze.",
        compassDirection: COMPASS_DIRS.S,
        fragmentName: "Journal Page 6",
        fragmentEmoji: "📖",
        travelFact: "Miami is the only major U.S. city founded by a woman — Julia Tuttle in 1896!",
        cityCoords: { lat: 25.77, lng: -80.19 },
      },
      {
        stepIndex: 5,
        storyBeat: "Miami is all color, heat, and ocean breeze.\n\nPalm trees sway, waves roll in, and the city feels full of motion.\n\n—\n\nYou hold all six pages together.\n\nThe crown hums more deeply now.\n\nThe compass slows, then points beyond the mainland.\n\n—\n\nWords begin to form across the pages.",
        clueType: "landmark",
        cityClue: "A tropical island city surrounded by ocean, known for volcanoes, beaches, and Pacific island culture.",
        landmarkClue: {
          name: "Honolulu",
          description: "Diamond Head volcano and ocean coastline of Honolulu Hawaii with lush green mountains and blue sea",
          svg: "honolulu-landscape",
        },
        cityOptions: ["Honolulu", "Orlando", "Bali", "Phuket"],
        correctCity: "Honolulu",
        compassClue: "Out into the Pacific… far from the mainland.",
        compassDirection: COMPASS_DIRS.W,
        fragmentName: "Journal Page 7",
        fragmentEmoji: "📖",
        travelFact: "Honolulu means 'sheltered harbor' in Hawaiian — it became the 50th U.S. state capital in 1959!",
        cityCoords: { lat: 21.31, lng: -157.86 },
      },
    ],
  },
  {
    id: "final-ring",
    title: "The Final Ring",
    subtitle: "The Ring the Crown Could Never Forget",
    icon: "💍",
    description: "The journal is complete. The crown is awake. The compass now guides with purpose. Across oceans and ancient lands, fragments of a lost ring wait to be found.",
    storyIntro: "Sydney stretches out before you.\n\nWaves move across the harbor. Light reflects off the water.\n\nYou bring the crown and journal together.\n\n—\n\nThe reaction is instant.\n\nA deep hum.\n\nStronger than ever before.\n\n—\n\nThe compass locks.\n\nNot searching.\n\nGuiding.\n\n—\n\nThe journal opens.\n\nBut not pages this time.\n\n—\n\nFragments.\n\nCurved. Metallic.\n\nIncomplete.\n\n—\n\nThis is what the crown was waiting for.",
    startCity: "Sydney",
    startCityEmoji: "🇦🇺",
    startCityCoords: { lat: -33.87, lng: 151.21 },
    startCityFunFact: "Sydney Harbour is one of the largest natural harbors in the world!",
    reward: {
      title: "The Ring Complete",
      emoji: "💍",
      description: "The ring settles into place.\n\nThe crown is whole.\n\nThe compass spins once… then stops.",
    },
    steps: [
      {
        stepIndex: 0,
        storyBeat: "The compass shifts away from the city.\n\nYou follow it.\n\nGreen hills begin to rise.\n\nWide. Quiet. Endless.\n\n—\n\nSmall homes appear.\n\nRound doors built into the earth.\n\n—\n\nThe crown hums.\n\nSoft… then steady.\n\n—\n\nYou open the journal.\n\nShapes form.\n\nLow. Hidden. Curved.\n\n—\n\nWhat place is this?",
        clueType: "landmark",
        cityClue: "A magical village with round doors built into gentle green hills — made famous by a legendary film.",
        landmarkClue: {
          name: "Hobbiton",
          description: "A village of small homes built into green hills",
          svg: "hobbiton-shire",
        },
        cityOptions: ["Hobbiton", "Wellington", "Cairo", "Lima"],
        correctCity: "Hobbiton",
        compassClue: "Across the sea… to quiet green land.",
        compassDirection: COMPASS_DIRS.SE,
        compassWrongOptions: [COMPASS_DIRS.E, COMPASS_DIRS.W, COMPASS_DIRS.N],
        transportMode: "plane",
        fragmentName: "Ring Fragment 1",
        fragmentEmoji: "💍",
        travelFact: "Hobbiton was built for The Lord of the Rings movies and is located in Matamata, New Zealand!",
        cityCoords: { lat: -37.86, lng: 175.68 },
      },
      {
        stepIndex: 1,
        storyBeat: "Hobbiton feels calm.\n\nSoft hills. Bright green grass.\n\n—\n\nThe compass shifts again.\n\nPulling you deeper into the fields.\n\n—\n\nYou stop.\n\nSomething feels different here.\n\n—\n\nThe crown reacts.\n\nA gentle hum.\n\nThen stronger.\n\n—\n\nYou open the journal.\n\nColor spreads across the page.\n\nBright. Clear.\n\n—\n\nWhat does it show?",
        clueType: "flag",
        cityClue: "A Pacific island nation made up of more than 300 islands.",
        flagClue: {
          countryCode: "fj",
          countryName: "Fiji",
          hint: "Light blue with a Union Jack and a shield",
        },
        cityOptions: ["Fiji", "Australia", "Miami", "Peru"],
        correctCity: "Fiji",
        compassClue: "Across the ocean… toward scattered islands.",
        compassDirection: COMPASS_DIRS.N,
        compassWrongOptions: [COMPASS_DIRS.E, COMPASS_DIRS.S, COMPASS_DIRS.W],
        transportMode: "ship" as const,
        fragmentName: "Ring Fragment 2",
        fragmentEmoji: "💍",
        travelFact: "Fiji is made up of more than 300 islands!",
        cityCoords: { lat: -18.14, lng: 178.44 },
      },
      {
        stepIndex: 2,
        storyBeat: "Fiji is quiet.\n\nWaves roll in slowly. The air feels warm.\n\n—\n\nThe compass shifts.\n\nPrecise.\n\nPulling you along the shoreline.\n\n—\n\nYou step closer.\n\nWater moves at your feet.\n\n—\n\nThe crown reacts.\n\nStronger now.\n\nNot calm anymore.\n\n—\n\nYou open the journal.\n\nInk spreads.\n\nNot shapes.\n\nWords.\n\n—\n\nWhat do they say?",
        clueType: "text",
        cityClue: "A massive city spread across islands, known for its busy streets and tropical heat in Southeast Asia.",
        cityOptions: ["Jakarta", "Manila", "Toronto", "Cairo"],
        correctCity: "Jakarta",
        compassClue: "West… toward dense cities and island nations.",
        compassDirection: COMPASS_DIRS.W,
        compassWrongOptions: [COMPASS_DIRS.S, COMPASS_DIRS.E, COMPASS_DIRS.N],
        transportMode: "plane",
        fragmentName: "Ring Fragment 3",
        fragmentEmoji: "💍",
        travelFact: "Jakarta is one of Southeast Asia's largest cities, spread across 13 rivers!",
        cityCoords: { lat: -6.21, lng: 106.85 },
      },
      {
        stepIndex: 3,
        storyBeat: "Jakarta is loud.\n\nTraffic. Movement. Energy everywhere.\n\n—\n\nThe compass reacts instantly.\n\nSharp.\n\n—\n\nIt pulls you through crowded streets.\n\nYou stop.\n\n—\n\nThe crown vibrates.\n\nStrong. Certain.\n\n—\n\nYou open the journal.\n\nColor spreads.\n\nLines cross.\n\nA symbol forms.\n\n—\n\nWhat does it show?",
        clueType: "flag",
        cityClue: "A Southeast Asian capital known for golden temples and vibrant street life.",
        flagClue: {
          countryCode: "th",
          countryName: "Thailand",
          hint: "Red, white, and blue stripes with a central emblem",
        },
        cityOptions: ["Bangkok, Thailand", "Manila, Philippines", "Lima, Peru", "Nairobi, Kenya"],
        correctCity: "Bangkok, Thailand",
        compassClue: "Northwest… toward warmth and energy.",
        compassDirection: COMPASS_DIRS.NW,
        compassWrongOptions: [COMPASS_DIRS.S, COMPASS_DIRS.E, COMPASS_DIRS.W],
        transportMode: "plane",
        fragmentName: "Ring Fragment 4",
        fragmentEmoji: "💍",
        travelFact: "Bangkok's full ceremonial name is one of the longest city names in the world!",
        cityCoords: { lat: 13.76, lng: 100.50 },
      },
      {
        stepIndex: 4,
        storyBeat: "Bangkok glows.\n\nTemples shine. The air feels alive.\n\n—\n\nThe compass slows.\n\nThen pulls again.\n\nMore precise now.\n\n—\n\nYou move through the city.\n\nThen beyond it.\n\n—\n\nThe crown hums.\n\nSteady. Focused.\n\n—\n\nYou open the journal.\n\nLines rise sharply.\n\nTall. Narrow. Built upward.\n\n—\n\nWhat could this be?",
        clueType: "landmark",
        cityClue: "A historic tower rising in the heart of a bustling Southeast Asian capital.",
        landmarkClue: {
          name: "Hanoi Flag Tower",
          description: "A historic tower rising above the ancient capital",
          svg: "hanoi-flag-tower",
        },
        cityOptions: ["Hanoi", "Ho Chi Minh City", "Madrid", "Nairobi"],
        correctCity: "Hanoi",
        compassClue: "North… toward history and movement.",
        compassDirection: COMPASS_DIRS.N,
        compassWrongOptions: [COMPASS_DIRS.E, COMPASS_DIRS.W, COMPASS_DIRS.S],
        transportMode: "car",
        fragmentName: "Ring Fragment 5",
        fragmentEmoji: "💍",
        travelFact: "Hanoi is one of the oldest capitals in Southeast Asia — over 1,000 years old!",
        cityCoords: { lat: 21.03, lng: 105.85 },
      },
      {
        stepIndex: 5,
        storyBeat: "Hanoi moves fast.\n\nScooters. Streets. Constant motion.\n\n—\n\nThe compass shifts again.\n\nSlower.\n\nHeavier.\n\n—\n\nYou travel north.\n\nThe world opens up.\n\nMountains rise.\n\n—\n\nThe crown hums.\n\nDeep. Ancient.\n\n—\n\nYou open the journal.\n\nLines stretch across the page.\n\nLong. Endless.\n\n—\n\nWhat is this?",
        clueType: "landmark",
        cityClue: "An ancient stone structure stretching endlessly over mountains — the longest wall ever built.",
        landmarkClue: {
          name: "Great Wall",
          description: "A massive wall stretching across mountains",
          svg: "great-wall-china",
        },
        cityOptions: ["Beijing", "Seoul", "Lima", "Cairo"],
        correctCity: "Beijing",
        compassClue: "North… toward something ancient.",
        compassDirection: COMPASS_DIRS.N,
        compassWrongOptions: [COMPASS_DIRS.E, COMPASS_DIRS.W, COMPASS_DIRS.S],
        transportMode: "train",
        fragmentName: "Ring Fragment 6",
        fragmentEmoji: "💍",
        travelFact: "The Great Wall stretches over 13,000 miles — the longest structure ever built!",
        cityCoords: { lat: 39.91, lng: 116.39 },
      },
      {
        stepIndex: 6,
        storyBeat: "Beijing feels vast.\n\nStone. Silence. History everywhere.\n\n—\n\nYou hold all fragments together.\n\nThey align.\n\nAlmost complete.\n\n—\n\nThe compass steadies.\n\nThen points across the sea.\n\n—\n\nThe crown reacts.\n\nStrong. Certain.\n\n—\n\nYou open the journal.\n\nThe page clears.\n\nWords form.\n\nDo you feel it?\n\nCan this be it?\n\nThe final clue.\n\n—\n\nWhat do they say?",
        clueType: "text",
        cityClue: "A powerful modern city built alongside deep tradition, known for technology, culture, and history in Japan.",
        cityOptions: ["Tokyo", "Osaka", "Miami", "Cairo"],
        correctCity: "Tokyo",
        compassClue: "East… across the sea.",
        compassDirection: COMPASS_DIRS.E,
        compassWrongOptions: [COMPASS_DIRS.W, COMPASS_DIRS.S, COMPASS_DIRS.N],
        transportMode: "plane",
        fragmentName: "Ring Fragment 7",
        fragmentEmoji: "💍",
        travelFact: "Tokyo is the most populous metropolitan area in the world!",
        cityCoords: { lat: 35.68, lng: 139.69 },
      },
    ],
  },
  {
    id: "sunken-compass",
    title: "The Sunken Compass",
    subtitle: "A Deep-Sea Mystery Across the Pacific",
    icon: "🧭",
    description: "A legendary compass has been lost at sea! Dive into coastal cities to recover its pieces.",
    startCity: "Sydney",
    startCityEmoji: "🦘",
    startCityCoords: { lat: -33.87, lng: 151.21 },
    steps: [],
    reward: { title: "The Sunken Compass Restored", emoji: "🧭", description: "You recovered the legendary compass!" },
    locked: true,
  },
  {
    id: "frozen-star",
    title: "The Frozen Star",
    subtitle: "An Arctic Expedition",
    icon: "⭐",
    description: "A magical star has frozen over the northern lands. Travel through icy cities to thaw its light!",
    startCity: "Helsinki",
    startCityEmoji: "❄️",
    startCityCoords: { lat: 60.17, lng: 24.94 },
    steps: [],
    reward: { title: "The Frozen Star Thawed", emoji: "⭐", description: "You restored the star's warm glow!" },
    locked: true,
  },
  {
    id: "golden-feather",
    title: "The Golden Feather",
    subtitle: "A Journey Through South America",
    icon: "🪶",
    description: "A rare golden feather was scattered across South American capitals. Can you find all the pieces?",
    startCity: "Lima",
    startCityEmoji: "🦙",
    startCityCoords: { lat: -12.05, lng: -77.04 },
    steps: [],
    reward: { title: "The Golden Feather Complete", emoji: "🪶", description: "You reunited the golden feather!" },
    locked: true,
  },
  {
    id: "jade-dragon",
    title: "The Jade Dragon",
    subtitle: "An East Asian Odyssey",
    icon: "🐉",
    description: "A jade dragon statue was shattered across the cities of East Asia. Piece it back together!",
    startCity: "Tokyo",
    startCityEmoji: "🗼",
    startCityCoords: { lat: 35.68, lng: 139.69 },
    steps: [],
    reward: { title: "The Jade Dragon Restored", emoji: "🐉", description: "You restored the ancient jade dragon!" },
    locked: true,
  },
  {
    id: "desert-rose",
    title: "The Desert Rose",
    subtitle: "Mysteries of the Middle East",
    icon: "🌹",
    description: "A crystal desert rose has been hidden across ancient desert cities. Can you find its petals?",
    startCity: "Dubai",
    startCityEmoji: "🏙️",
    startCityCoords: { lat: 25.20, lng: 55.27 },
    steps: [],
    reward: { title: "The Desert Rose Bloomed", emoji: "🌹", description: "You reassembled the crystal desert rose!" },
    locked: true,
  },
  {
    id: "rainbow-bridge",
    title: "The Rainbow Bridge",
    subtitle: "A Colorful Scandinavian Quest",
    icon: "🌈",
    description: "The legendary Rainbow Bridge has broken! Travel through Nordic capitals to restore its colors.",
    startCity: "Stockholm",
    startCityEmoji: "🇸🇪",
    startCityCoords: { lat: 59.33, lng: 18.07 },
    steps: [],
    reward: { title: "The Rainbow Bridge Rebuilt", emoji: "🌈", description: "You rebuilt the rainbow bridge!" },
    locked: true,
  },
  {
    id: "thunder-drum",
    title: "The Thunder Drum",
    subtitle: "An African Safari Quest",
    icon: "🥁",
    description: "A powerful thunder drum was scattered across African cities. Gather the pieces to hear its beat!",
    startCity: "Nairobi",
    startCityEmoji: "🦁",
    startCityCoords: { lat: -1.29, lng: 36.82 },
    steps: [],
    reward: { title: "The Thunder Drum Beats Again", emoji: "🥁", description: "You restored the thunder drum's power!" },
    locked: true,
  },
  {
    id: "crystal-ship",
    title: "The Crystal Ship",
    subtitle: "A Caribbean Voyage",
    icon: "🚢",
    description: "A crystal ship sank near Caribbean islands. Sail between tropical cities to find its parts!",
    startCity: "Havana",
    startCityEmoji: "🌴",
    startCityCoords: { lat: 23.11, lng: -82.37 },
    steps: [],
    reward: { title: "The Crystal Ship Sails Again", emoji: "🚢", description: "You rebuilt the crystal ship!" },
    locked: true,
  },
  {
    id: "moon-lantern",
    title: "The Moon Lantern",
    subtitle: "A Southeast Asian Journey",
    icon: "🏮",
    description: "An ancient moon lantern was broken into pieces across Southeast Asia. Light it up again!",
    startCity: "Bangkok",
    startCityEmoji: "🛕",
    startCityCoords: { lat: 13.76, lng: 100.50 },
    steps: [],
    reward: { title: "The Moon Lantern Glows", emoji: "🏮", description: "You restored the moon lantern's glow!" },
    locked: true,
  },
];

const STORAGE_KEY_PROGRESS = "compass_quest_progress";
const STORAGE_KEY_RECORDS = "compass_quest_records";
const STORAGE_KEY_CUSTOM_ADVENTURE = "compass_quest_custom_adventure";

function getExplorerKey(explorerId?: string): string {
  return explorerId ? `_${explorerId}` : "";
}

const STORAGE_KEY_CUSTOM_HISTORY = "compass_quest_custom_history";

export function saveCustomAdventure(adventure: Adventure, explorerId?: string): void {
  try {
    const key = `${STORAGE_KEY_CUSTOM_ADVENTURE}${getExplorerKey(explorerId)}`;
    localStorage.setItem(key, JSON.stringify(adventure));
    const histKey = `${STORAGE_KEY_CUSTOM_HISTORY}${getExplorerKey(explorerId)}`;
    const existing: Adventure[] = (() => {
      try { return JSON.parse(localStorage.getItem(histKey) || "[]"); } catch { return []; }
    })();
    const deduped = [adventure, ...existing.filter(a => a.id !== adventure.id)].slice(0, 20);
    localStorage.setItem(histKey, JSON.stringify(deduped));
  } catch {
    console.error("Failed to save custom adventure");
  }
}

export function loadAllCustomAdventures(explorerId?: string): Adventure[] {
  try {
    const histKey = `${STORAGE_KEY_CUSTOM_HISTORY}${getExplorerKey(explorerId)}`;
    const data = localStorage.getItem(histKey);
    if (!data) return [];
    return JSON.parse(data) as Adventure[];
  } catch {
    return [];
  }
}

export function loadCustomAdventure(explorerId?: string): Adventure | null {
  try {
    const key = `${STORAGE_KEY_CUSTOM_ADVENTURE}${getExplorerKey(explorerId)}`;
    const data = localStorage.getItem(key);
    if (!data) return null;
    return JSON.parse(data) as Adventure;
  } catch {
    return null;
  }
}

export function clearCustomAdventure(explorerId?: string): void {
  try {
    const key = `${STORAGE_KEY_CUSTOM_ADVENTURE}${getExplorerKey(explorerId)}`;
    localStorage.removeItem(key);
  } catch {}
}

export function loadProgress(adventureId: string, explorerId?: string): AdventureProgress | null {
  try {
    const key = `${STORAGE_KEY_PROGRESS}${getExplorerKey(explorerId)}`;
    const data = localStorage.getItem(key);
    if (!data) return null;
    const all: Record<string, AdventureProgress> = JSON.parse(data);
    return all[adventureId] || null;
  } catch {
    return null;
  }
}

export function saveProgress(progress: AdventureProgress, explorerId?: string): void {
  try {
    const key = `${STORAGE_KEY_PROGRESS}${getExplorerKey(explorerId)}`;
    const data = localStorage.getItem(key);
    const all: Record<string, AdventureProgress> = data ? JSON.parse(data) : {};
    all[progress.adventureId] = progress;
    localStorage.setItem(key, JSON.stringify(all));
  } catch {
    console.error("Failed to save compass quest progress");
  }
}

export function clearProgress(adventureId: string, explorerId?: string): void {
  try {
    const key = `${STORAGE_KEY_PROGRESS}${getExplorerKey(explorerId)}`;
    const data = localStorage.getItem(key);
    if (!data) return;
    const all: Record<string, AdventureProgress> = JSON.parse(data);
    delete all[adventureId];
    localStorage.setItem(key, JSON.stringify(all));
  } catch {
    console.error("Failed to clear compass quest progress");
  }
}

export function loadRecords(explorerId?: string): Record<string, AdventureRecord> {
  try {
    const key = `${STORAGE_KEY_RECORDS}${getExplorerKey(explorerId)}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

export function saveRecord(adventureId: string, timeMs: number, xp: number, explorerId?: string): void {
  try {
    const key = `${STORAGE_KEY_RECORDS}${getExplorerKey(explorerId)}`;
    const records = loadRecords(explorerId);
    const existing = records[adventureId];
    if (existing) {
      records[adventureId] = {
        ...existing,
        completions: existing.completions + 1,
        bestTimeMs: Math.min(existing.bestTimeMs, timeMs),
        bestXp: Math.max(existing.bestXp, xp),
        lastCompletedAt: new Date().toISOString(),
      };
    } else {
      records[adventureId] = {
        adventureId,
        completions: 1,
        bestTimeMs: timeMs,
        bestXp: xp,
        lastCompletedAt: new Date().toISOString(),
      };
    }
    localStorage.setItem(key, JSON.stringify(records));
  } catch {
    console.error("Failed to save compass quest record");
  }
}

export function calculateXP(wrongGuesses: number, totalSteps: number): number {
  const baseXp = totalSteps * 10;
  const penalty = wrongGuesses * 2;
  return Math.max(baseXp - penalty, totalSteps);
}

export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
}

// ─── Compass Stats ───────────────────────────────────────────────────────────

export interface CompassStats {
  totalQuestsCompleted: number;
  totalXp: number;
  totalCorrectAnswers: number;
  totalWrongAnswers: number;
  continentsVisited: string[];
  challengesWon: number;
  challengesPlayed: number;
  currentStreak: number;
  bestTimeMs?: number;
  perfectQuestsCompleted: number;
  customQuestsCompleted: number;
}

const STORAGE_KEY_STATS = "compass_quest_stats";

export function loadCompassStats(explorerId?: string): CompassStats {
  try {
    const key = `${STORAGE_KEY_STATS}${getExplorerKey(explorerId)}`;
    const data = localStorage.getItem(key);
    if (!data) return defaultStats();
    return { ...defaultStats(), ...JSON.parse(data) };
  } catch {
    return defaultStats();
  }
}

function defaultStats(): CompassStats {
  return {
    totalQuestsCompleted: 0,
    totalXp: 0,
    totalCorrectAnswers: 0,
    totalWrongAnswers: 0,
    continentsVisited: [],
    challengesWon: 0,
    challengesPlayed: 0,
    currentStreak: 0,
    perfectQuestsCompleted: 0,
    customQuestsCompleted: 0,
  };
}

export function saveCompassStats(stats: CompassStats, explorerId?: string): void {
  try {
    const key = `${STORAGE_KEY_STATS}${getExplorerKey(explorerId)}`;
    localStorage.setItem(key, JSON.stringify(stats));
  } catch {
    console.error("Failed to save compass stats");
  }
}

// ─── Achievements ─────────────────────────────────────────────────────────────

export type AchievementCategory =
  | "Explorer Progress"
  | "Skills"
  | "World Exploration"
  | "Challenges"
  | "Special";

export interface AchievementDef {
  key: string;
  label: string;
  description: string;
  category: AchievementCategory;
  icon: string;
  check: (stats: CompassStats) => boolean;
  /** Returns numeric progress toward this achievement (for "Almost There" section) */
  progress?: (stats: CompassStats) => { value: number; max: number };
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // Explorer Progress (4)
  {
    key: "first_quest",
    label: "First Steps",
    description: "Complete your first quest",
    category: "Explorer Progress",
    icon: "🧭",
    check: s => s.totalQuestsCompleted >= 1,
    progress: s => ({ value: Math.min(s.totalQuestsCompleted, 1), max: 1 }),
  },
  {
    key: "quest_5",
    label: "Trail Blazer",
    description: "Complete 5 quests",
    category: "Explorer Progress",
    icon: "🥾",
    check: s => s.totalQuestsCompleted >= 5,
    progress: s => ({ value: Math.min(s.totalQuestsCompleted, 5), max: 5 }),
  },
  {
    key: "quest_10",
    label: "Quest Veteran",
    description: "Complete 10 quests",
    category: "Explorer Progress",
    icon: "🗺️",
    check: s => s.totalQuestsCompleted >= 10,
    progress: s => ({ value: Math.min(s.totalQuestsCompleted, 10), max: 10 }),
  },
  {
    key: "quest_25",
    label: "Quest Legend",
    description: "Complete 25 quests",
    category: "Explorer Progress",
    icon: "🏆",
    check: s => s.totalQuestsCompleted >= 25,
    progress: s => ({ value: Math.min(s.totalQuestsCompleted, 25), max: 25 }),
  },
  // Skills (5)
  {
    key: "xp_100",
    label: "XP Collector",
    description: "Earn 100 total XP",
    category: "Skills",
    icon: "⭐",
    check: s => s.totalXp >= 100,
    progress: s => ({ value: Math.min(s.totalXp, 100), max: 100 }),
  },
  {
    key: "xp_500",
    label: "XP Hunter",
    description: "Earn 500 total XP",
    category: "Skills",
    icon: "💫",
    check: s => s.totalXp >= 500,
    progress: s => ({ value: Math.min(s.totalXp, 500), max: 500 }),
  },
  {
    key: "xp_1000",
    label: "XP Master",
    description: "Earn 1000 total XP",
    category: "Skills",
    icon: "🌟",
    check: s => s.totalXp >= 1000,
    progress: s => ({ value: Math.min(s.totalXp, 1000), max: 1000 }),
  },
  {
    key: "perfect_quest",
    label: "Sharpshooter",
    description: "Complete a quest with no wrong answers",
    category: "Skills",
    icon: "🎯",
    check: s => s.perfectQuestsCompleted >= 1,
  },
  {
    key: "answers_50",
    label: "Answer Machine",
    description: "Give 50 correct answers in total",
    category: "Skills",
    icon: "✅",
    check: s => s.totalCorrectAnswers >= 50,
    progress: s => ({ value: Math.min(s.totalCorrectAnswers, 50), max: 50 }),
  },
  // World Exploration (5)
  {
    key: "continent_1",
    label: "World Wanderer",
    description: "Visit cities on 1 continent",
    category: "World Exploration",
    icon: "🌍",
    check: s => s.continentsVisited.length >= 1,
    progress: s => ({ value: Math.min(s.continentsVisited.length, 1), max: 1 }),
  },
  {
    key: "continent_3",
    label: "Continental Drifter",
    description: "Visit cities on 3 continents",
    category: "World Exploration",
    icon: "🌎",
    check: s => s.continentsVisited.length >= 3,
    progress: s => ({ value: Math.min(s.continentsVisited.length, 3), max: 3 }),
  },
  {
    key: "continent_5",
    label: "Globe Trotter",
    description: "Visit cities on 5 continents",
    category: "World Exploration",
    icon: "🌏",
    check: s => s.continentsVisited.length >= 5,
    progress: s => ({ value: Math.min(s.continentsVisited.length, 5), max: 5 }),
  },
  {
    key: "continent_7",
    label: "World Conqueror",
    description: "Visit cities on all 7 continents",
    category: "World Exploration",
    icon: "🗺️",
    check: s => s.continentsVisited.length >= 7,
    progress: s => ({ value: Math.min(s.continentsVisited.length, 7), max: 7 }),
  },
  {
    key: "quests_3_continents",
    label: "Cross-Continental",
    description: "Complete quests on 3 different continents",
    category: "World Exploration",
    icon: "✈️",
    check: s => s.continentsVisited.length >= 3,
    progress: s => ({ value: Math.min(s.continentsVisited.length, 3), max: 3 }),
  },
  // Challenges (3)
  {
    key: "first_challenge",
    label: "Challenger",
    description: "Play your first challenge",
    category: "Challenges",
    icon: "⚔️",
    check: s => s.challengesPlayed >= 1,
    progress: s => ({ value: Math.min(s.challengesPlayed, 1), max: 1 }),
  },
  {
    key: "challenge_win",
    label: "Champion",
    description: "Win a challenge against a friend",
    category: "Challenges",
    icon: "🥇",
    check: s => s.challengesWon >= 1,
    progress: s => ({ value: Math.min(s.challengesWon, 1), max: 1 }),
  },
  {
    key: "challenge_wins_5",
    label: "Undefeated",
    description: "Win 5 challenges",
    category: "Challenges",
    icon: "🏅",
    check: s => s.challengesWon >= 5,
    progress: s => ({ value: Math.min(s.challengesWon, 5), max: 5 }),
  },
  // Special (3)
  {
    key: "streak_3",
    label: "On a Roll",
    description: "Complete 3 quests in a row without quitting",
    category: "Special",
    icon: "🔥",
    check: s => s.currentStreak >= 3,
    progress: s => ({ value: Math.min(s.currentStreak, 3), max: 3 }),
  },
  {
    key: "custom_quest",
    label: "Quest Creator",
    description: "Create and complete your own custom quest",
    category: "Special",
    icon: "✨",
    check: s => s.customQuestsCompleted >= 1,
  },
  {
    key: "speed_runner",
    label: "Speed Runner",
    description: "Complete a quest in under 3 minutes",
    category: "Special",
    icon: "⚡",
    check: s => s.bestTimeMs !== undefined && s.bestTimeMs > 0 && s.bestTimeMs < 3 * 60 * 1000,
  },
];

export interface AchievementUnlock {
  unlockedAt: string;
}

export type AchievementsRecord = Record<string, AchievementUnlock>;

const STORAGE_KEY_ACHIEVEMENTS = "compass_quest_achievements";

export function loadCompassAchievements(explorerId?: string): AchievementsRecord {
  try {
    const key = `${STORAGE_KEY_ACHIEVEMENTS}${getExplorerKey(explorerId)}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

export function saveCompassAchievements(achievements: AchievementsRecord, explorerId?: string): void {
  try {
    const key = `${STORAGE_KEY_ACHIEVEMENTS}${getExplorerKey(explorerId)}`;
    localStorage.setItem(key, JSON.stringify(achievements));
  } catch {
    console.error("Failed to save compass achievements");
  }
}

export function checkAndUnlockAchievements(
  stats: CompassStats,
  existing: AchievementsRecord,
): AchievementDef[] {
  const newlyUnlocked: AchievementDef[] = [];
  for (const ach of ACHIEVEMENTS) {
    if (!existing[ach.key] && ach.check(stats)) {
      newlyUnlocked.push(ach);
    }
  }
  return newlyUnlocked;
}

// Map city/adventure to continent for tracking
const CITY_CONTINENT_MAP: Record<string, string> = {
  // North America
  "San Francisco": "North America",
  "Las Vegas": "North America",
  "Denver": "North America",
  "New York": "North America",
  "Seattle": "North America",
  "Vancouver": "North America",
  "Chicago": "North America",
  "Washington D.C.": "North America",
  "Honolulu": "North America",
  "Mexico City": "North America",
  // South America
  "Rio de Janeiro": "South America",
  "Buenos Aires": "South America",
  "Lima": "South America",
  "Bogotá": "South America",
  // Europe
  "London": "Europe",
  "Paris": "Europe",
  "Madrid": "Europe",
  "Berlin": "Europe",
  "Rome": "Europe",
  "Amsterdam": "Europe",
  "Reykjavík": "Europe",
  "Istanbul": "Europe",
  "Moscow": "Europe",
  "Athens": "Europe",
  "Lisbon": "Europe",
  // Africa
  "Cairo": "Africa",
  "Nairobi": "Africa",
  "Cape Town": "Africa",
  "Casablanca": "Africa",
  "Lagos": "Africa",
  "Riyadh": "Asia",
  // Asia
  "Dubai": "Asia",
  "Delhi": "Asia",
  "Mumbai": "Asia",
  "Bangkok": "Asia",
  "Tokyo": "Asia",
  "Beijing": "Asia",
  "Seoul": "Asia",
  "Singapore": "Asia",
  "Lahore": "Asia",
  "Tashkent": "Asia",
  "Amman": "Asia",
  "Doha": "Asia",
  "Muscat": "Asia",
  // Oceania
  "Sydney": "Oceania",
  "Melbourne": "Oceania",
  "Auckland": "Oceania",
  "Wellington": "Oceania",
  // Antarctica (edge case)
};

export function getContinentForCity(city: string): string | null {
  return CITY_CONTINENT_MAP[city] || null;
}
