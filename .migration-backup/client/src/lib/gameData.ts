export const EXPLORER_AVATARS = [
  { key: 'panda', emoji: '🐼', name: 'Panda' },
  { key: 'lion', emoji: '🦁', name: 'Lion' },
  { key: 'elephant', emoji: '🐘', name: 'Elephant' },
  { key: 'penguin', emoji: '🐧', name: 'Penguin' },
  { key: 'koala', emoji: '🐨', name: 'Koala' },
  { key: 'fox', emoji: '🦊', name: 'Fox' },
  { key: 'owl', emoji: '🦉', name: 'Owl' },
  { key: 'turtle', emoji: '🐢', name: 'Turtle' },
  { key: 'butterfly', emoji: '🦋', name: 'Butterfly' },
  { key: 'dolphin', emoji: '🐬', name: 'Dolphin' },
  { key: 'rocket', emoji: '🚀', name: 'Rocket' },
  { key: 'globe', emoji: '🌍', name: 'Globe' },
];

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  conditionType: "STARS" | "COLLECTION" | "MISSIONS" | "SPEED" | "STREAK";
  threshold: number;
}

export interface StreakBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  daysRequired: number;
  reward?: {
    type: "bonus_hint" | "special_title" | "celebration";
    value?: number;
  };
}

export const STREAK_BADGES: StreakBadge[] = [
  {
    id: "streak_3",
    name: "Star Explorer",
    description: "3 days of exploring the world!",
    icon: "⭐",
    daysRequired: 3,
    reward: { type: "celebration" }
  },
  {
    id: "streak_5",
    name: "Superstar Explorer",
    description: "5 days of exploring the world!",
    icon: "🌟",
    daysRequired: 5,
    reward: { type: "celebration" }
  },
  {
    id: "streak_week",
    name: "Champion Explorer",
    description: "7 days of exploring the world!",
    icon: "🏆",
    daysRequired: 7,
    reward: { type: "celebration" }
  },
  {
    id: "streak_month",
    name: "Icon Explorer",
    description: "31 days of exploring the world!",
    icon: "🎖️",
    daysRequired: 31,
    reward: { type: "bonus_hint", value: 1 }
  },
  {
    id: "streak_50",
    name: "Hall of Fame",
    description: "50 days of exploring the world!",
    icon: "🏛️",
    daysRequired: 50,
    reward: { type: "celebration" }
  },
  {
    id: "streak_100",
    name: "Invincible",
    description: "100 days of exploring the world!",
    icon: "🛡️",
    daysRequired: 100,
    reward: { type: "bonus_hint", value: 2 }
  },
  {
    id: "streak_150",
    name: "Legend",
    description: "150 days of exploring the world!",
    icon: "⚔️",
    daysRequired: 150,
    reward: { type: "celebration" }
  },
  {
    id: "streak_200",
    name: "Golden",
    description: "200 days of exploring the world!",
    icon: "🏅",
    daysRequired: 200,
    reward: { type: "bonus_hint", value: 3 }
  },
  {
    id: "streak_250",
    name: "Visionary",
    description: "250 days of exploring the world!",
    icon: "🔭",
    daysRequired: 250,
    reward: { type: "celebration" }
  },
  {
    id: "streak_300",
    name: "Supreme",
    description: "300 days of exploring the world!",
    icon: "💎",
    daysRequired: 300,
    reward: { type: "bonus_hint", value: 4 }
  },
  {
    id: "streak_365",
    name: "Interstellar",
    description: "365 days - a full year of exploring!",
    icon: "☀️",
    daysRequired: 365,
    reward: { type: "bonus_hint", value: 5 }
  },
  {
    id: "streak_500",
    name: "Galactic",
    description: "500 days of exploring the world!",
    icon: "🪐",
    daysRequired: 500,
    reward: { type: "bonus_hint", value: 6 }
  }
];

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "ach_first_steps",
    name: "First Steps",
    description: "Earn your first Star!",
    icon: "⭐",
    conditionType: "STARS",
    threshold: 1
  },
  {
    id: "ach_globetrotter",
    name: "Globetrotter",
    description: "Visit 3 different countries.",
    icon: "🌍",
    conditionType: "COLLECTION",
    threshold: 3
  },
  {
    id: "ach_star_collector",
    name: "Star Collector",
    description: "Collect 10 Stars in total.",
    icon: "✨",
    conditionType: "STARS",
    threshold: 10
  },
  {
    id: "ach_mission_master",
    name: "Mission Master",
    description: "Complete your first Mission.",
    icon: "🏆",
    conditionType: "MISSIONS",
    threshold: 1
  },
  {
    id: "ach_expert_explorer",
    name: "Expert Explorer",
    description: "Visit 5 different countries.",
    icon: "🚀",
    conditionType: "COLLECTION",
    threshold: 5
  }
];

export const LOCATION_CARDS = [
  {
    "id": "loc_paris",
    "type": "Location",
    "city": "Paris",
    "country": "France",
    "continent": "Europe",
    "flagUrl": "https://flagcdn.com/w320/fr.png",
    "bandColor": "Purple",
    "clues": [
      "I am on the continent shaped like a squished triangle with many countries close together.",
      "I am famous for a big bicycle race and eating yummy cheese.",
      "I am the 'City of Light' with a tall iron tower that sparkles at night."
    ],
    "cluesAlt": [
      "I am on a continent where many countries can be crossed in a single day.",
      "My country is famous for fashion, art museums, and fine food.",
      "I am known for a glowing iron tower and romantic river views."
    ],
    "cluesAlt2": [
      "I'm a river city known for romance and art.",
      "An iron tower rises above my skyline.",
      "It sparkles beside the Seine at night."
    ],
    "didYouKnow": "The Eiffel Tower was meant to be temporary!",
    "badge": "🗼 Wonders Hunter",
    "missionLinked": "🗼 Wonders Hunter",
    "missionReward": "+2⭐",
    "population": "2.1 Million",
    "currency": "Euro (€)",
    "language": "French",
    "mapCoordinates": { "x": 35, "y": 55 },
    "countryMapCoordinates": { "x": 52, "y": 28 },
    "greetingAudio": "Bonjour!",
    "landmarkIcon": "🗼"
  },
  {
    "id": "loc_rome",
    "type": "Location",
    "city": "Rome",
    "country": "Italy",
    "continent": "Europe",
    "flagUrl": "https://flagcdn.com/w320/it.png",
    "bandColor": "Purple",
    "clues": [
      "I am the continent that touches the Mediterranean Sea and has the Alps mountains.",
      "If you look at a map my country looks exactly like a high-heeled boot!",
      "I have a giant ancient stadium called the Colosseum where gladiators fought."
    ],
    "cluesAlt": [
      "I am on a continent that grew powerful empires thousands of years ago.",
      "My country stretches into the sea and looks like a boot.",
      "I have ancient ruins where gladiators once fought."
    ],
    "cluesAlt2": [
      "I'm an ancient city layered with ruins.",
      "A tiny independent city-state exists fully inside me.",
      "St. Peter's dome marks the center of that inner enclave."
    ],
    "didYouKnow": "Rome has over 900 churches!",
    "badge": "🧭 Time Traveler",
    "missionLinked": "🧭 Time Traveler",
    "missionReward": "+2⭐",
    "population": "2.8 Million",
    "currency": "Euro (€)",
    "language": "Italian",
    "mapCoordinates": { "x": 55, "y": 75 },
    "greetingAudio": "Ciao!",
    "landmarkIcon": "🏟️"
  },
  {
    "id": "loc_london",
    "type": "Location",
    "city": "London",
    "country": "United Kingdom",
    "continent": "Europe",
    "flagUrl": "https://flagcdn.com/w320/gb.png",
    "bandColor": "Purple",
    "clues": [
      "I am on an island nation that is part of Europe with an iconic ferris wheel.",
      "I am an island nation that loves tea and has a King.",
      "I am famous for bright red double-decker buses and a giant clock tower."
    ],
    "cluesAlt": [
      "I am on a continent with long history and royal families.",
      "My country is an island nation ruled by a king.",
      "I have a famous clock tower and red buses."
    ],
    "cluesAlt2": [
      "I'm a global city built along a famous river.",
      "A clock tower stands beside a grand parliament building.",
      "Red buses and black cabs are everyday sights here."
    ],
    "didYouKnow": "The London Underground is the oldest metro in the world!",
    "badge": "🎭 Cultural Voyager",
    "missionLinked": "🎭 Cultural Voyager",
    "missionReward": "+2⭐",
    "population": "8.9 Million",
    "currency": "Pound Sterling (£)",
    "language": "English",
    "mapCoordinates": { "x": 28, "y": 45 },
    "greetingAudio": "Hello!",
    "landmarkIcon": "🎡"
  },
  {
    "id": "loc_athens",
    "type": "Location",
    "city": "Athens",
    "country": "Greece",
    "continent": "Europe",
    "flagUrl": "https://flagcdn.com/w320/gr.png",
    "bandColor": "Purple",
    "clues": [
      "I am on the continent where ancient Greece and Rome shaped history.",
      "My country has thousands of islands and is famous for white buildings near blue seas.",
      "I have a famous white temple called the Parthenon sitting high on a hill."
    ],
    "cluesAlt": [
      "I am on a continent where democracy was first created.",
      "My country began the Olympic Games.",
      "I have a marble temple on a rocky hill."
    ],
    "cluesAlt2": [
      "I'm one of the world's oldest cities.",
      "Ancient marble ruins stand high above my streets.",
      "The Parthenon crowns my hilltop citadel."
    ],
    "didYouKnow": "Athens is one of the oldest cities in the world!",
    "badge": "🧭 Time Traveler",
    "missionLinked": "🧭 Time Traveler",
    "missionReward": "+2⭐",
    "population": "664,000",
    "currency": "Euro (€)",
    "language": "Greek",
    "mapCoordinates": { "x": 75, "y": 85 },
    "greetingAudio": "Yiasou!",
    "landmarkIcon": "🏛️"
  },
  {
    "id": "loc_berlin",
    "type": "Location",
    "city": "Berlin",
    "country": "Germany",
    "continent": "Europe",
    "flagUrl": "https://flagcdn.com/w320/de.png",
    "bandColor": "Purple",
    "clues": [
      "I am on the continent where many countries are close together and winters can be cold.",
      "I am famous for making fast cars and baking soft salty pretzels.",
      "A long time ago a wall divided me in half but now I am one big happy city!"
    ],
    "cluesAlt": [
      "I am on a continent where borders connect many cultures.",
      "My country is known for engineering and efficiency.",
      "I was once divided by a wall."
    ],
    "cluesAlt2": [
      "I'm a capital shaped by division and reunion.",
      "A grand gate symbolizes my modern unity.",
      "Pieces of a once-famous wall still stand in public view."
    ],
    "didYouKnow": "Berlin has more bridges than Venice!",
    "badge": "🎭 Cultural Voyager",
    "missionLinked": "🎭 Cultural Voyager",
    "missionReward": "+2⭐",
    "population": "3.6 Million",
    "currency": "Euro (€)",
    "language": "German",
    "mapCoordinates": { "x": 50, "y": 50 },
    "greetingAudio": "Guten Tag!",
    "landmarkIcon": "🌭"
  },
  {
    "id": "loc_madrid",
    "type": "Location",
    "city": "Madrid",
    "country": "Spain",
    "continent": "Europe",
    "flagUrl": "https://flagcdn.com/w320/es.png",
    "bandColor": "Purple",
    "clues": [
      "I am the continent where beautiful olive trees grow in the warm south.",
      "People here love to dance Flamenco and eat dinner very late at night.",
      "I am the capital city with a super famous soccer team and a Royal Palace."
    ],
    "cluesAlt": [
      "I am on a continent with warm southern coastlines.",
      "My country is famous for flamenco dancing and tapas.",
      "I have a royal palace at my center."
    ],
    "cluesAlt2": [
      "I'm a major inland capital with wide boulevards.",
      "An enormous royal palace sits near my historic core.",
      "A giant art museum triangle is one of my city's signatures."
    ],
    "didYouKnow": "Madrid’s symbol is a bear eating berries!",
    "badge": "🎭 Cultural Voyager",
    "missionLinked": "🎭 Cultural Voyager",
    "missionReward": "+2⭐",
    "population": "3.2 Million",
    "currency": "Euro (€)",
    "language": "Spanish",
    "mapCoordinates": { "x": 15, "y": 75 },
    "greetingAudio": "Hola!",
    "landmarkIcon": "💃"
  },
  {
    "id": "loc_amsterdam",
    "type": "Location",
    "city": "Amsterdam",
    "country": "Netherlands",
    "continent": "Europe",
    "flagUrl": "https://flagcdn.com/w320/nl.png",
    "bandColor": "Purple",
    "clues": [
      "I am on the continent where people use Euros and travel between borders easily.",
      "I am the country of colorful tulips and old-fashioned windmills.",
      "I have more bicycles than people and water canals instead of streets!"
    ],
    "cluesAlt": [
      "I am on a continent with many rivers and ports.",
      "My country is low-lying and protected by dikes.",
      "I have canals and bicycles everywhere."
    ],
    "cluesAlt2": [
      "I'm a city designed around canals.",
      "A hidden house here protected a famous wartime diary.",
      "Bicycles outnumber cars in daily life."
    ],
    "didYouKnow": "There are more bikes than people in Amsterdam!",
    "badge": "🌿 Eco Explorer",
    "missionLinked": "🌿 Eco Explorer",
    "missionReward": "+2⭐",
    "population": "821,000",
    "currency": "Euro (€)",
    "language": "Dutch",
    "mapCoordinates": { "x": 40, "y": 45 },
    "greetingAudio": "Hallo!",
    "landmarkIcon": "🚲"
  },
  {
    "id": "loc_new_york",
    "type": "Location",
    "city": "New York",
    "country": "United States",
    "continent": "North America",
    "flagUrl": "https://flagcdn.com/w320/us.png",
    "bandColor": "Red",
    "clues": [
      "I am the continent home to the Grand Canyon a giant hole in the ground.",
      "My flag has 50 stars and 13 stripes.",
      "I have a green statue of a lady holding a torch and yellow taxis everywhere."
    ],
    "cluesAlt": [
      "I am on a continent bordered by two great oceans.",
      "My country has 50 states.",
      "I have a giant statue holding a torch."
    ],
    "cluesAlt2": [
      "I'm a megacity of skyscrapers and nonstop motion.",
      "A torch-holding statue guards my harbor.",
      "A neon-lit square of giant screens is one of my best-known places."
    ],
    "didYouKnow": "More than 800 languages are spoken in New York!",
    "badge": "🗼 Wonders Hunter",
    "missionLinked": "🗼 Wonders Hunter",
    "missionReward": "+2⭐",
    "secondaryBadge": "🌋 Thrill Trekker",
    "secondaryMissionLinked": "🌋 Thrill Trekker",
    "population": "8.4 Million",
    "currency": "US Dollar ($)",
    "language": "English",
    "mapCoordinates": { "x": 85, "y": 50 },
    "greetingAudio": "Hello!",
    "landmarkIcon": "🗽"
  },
  {
    "id": "loc_toronto",
    "type": "Location",
    "city": "Toronto",
    "country": "Canada",
    "continent": "North America",
    "flagUrl": "https://flagcdn.com/w320/ca.png",
    "bandColor": "Red",
    "clues": [
      "I am the continent where the Great Lakes hold lots of fresh water.",
      "My flag has a red maple leaf and we love playing ice hockey.",
      "I have a huge tower called the CN Tower and I sit on a Great Lake."
    ],
    "cluesAlt": [
      "I am on a continent with massive freshwater lakes.",
      "My country's flag has a maple leaf symbol.",
      "I have a needle-shaped tower by water."
    ],
    "cluesAlt2": [
      "I'm a large city beside a Great Lake.",
      "A needle-like tower dominates my skyline.",
      "That tower is one of the tallest free-standing structures in the world."
    ],
    "didYouKnow": "Toronto means ‘meeting place’ in a native language!",
    "badge": "🌿 Eco Explorer",
    "missionLinked": "🌿 Eco Explorer",
    "missionReward": "+2⭐",
    "population": "2.9 Million",
    "currency": "Canadian Dollar (C$)",
    "language": "English/French",
    "mapCoordinates": { "x": 75, "y": 45 },
    "greetingAudio": "Hello!",
    "landmarkIcon": "🍁"
  },
  {
    "id": "loc_los_angeles",
    "type": "Location",
    "city": "Los Angeles",
    "country": "United States",
    "continent": "North America",
    "flagUrl": "https://flagcdn.com/w320/us.png",
    "bandColor": "Red",
    "clues": [
      "I am the continent where giant Bison and Grizzly Bears roam.",
      "The Bald Eagle is my national bird.",
      "I am the home of Hollywood movies and the Walk of Fame."
    ],
    "cluesAlt": [
      "I am on a continent with deserts, mountains, and beaches.",
      "My country's flag has stars and stripes.",
      "I am the heart of the film industry."
    ],
    "cluesAlt2": [
      "I'm a sprawling city tied to entertainment worldwide.",
      "A huge hillside sign names the movie industry's most famous district.",
      "Stars' names are set into sidewalks along my Walk of Fame."
    ],
    "didYouKnow": "LA has more cars than people!",
    "badge": "🎭 Cultural Voyager",
    "missionLinked": "🎭 Cultural Voyager",
    "missionReward": "+2⭐",
    "population": "3.9 Million",
    "currency": "US Dollar ($)",
    "language": "English",
    "mapCoordinates": { "x": 15, "y": 65 },
    "greetingAudio": "Hi!",
    "landmarkIcon": "🎬"
  },
  {
    "id": "loc_chicago",
    "type": "Location",
    "city": "Chicago",
    "country": "United States",
    "continent": "North America",
    "flagUrl": "https://flagcdn.com/w320/us.png",
    "bandColor": "Red",
    "clues": [
      "I am the continent where the mighty Mississippi River flows.",
      "We call our baseball championship the 'World Series'.",
      "They call me the 'Windy City' and I have delicious deep-dish pizza."
    ],
    "cluesAlt": [
      "I am on a continent with powerful inland waterways.",
      "My country has major professional sports.",
      "I have strong winds and deep-dish pizza."
    ],
    "cluesAlt2": [
      "I'm a major city on the edge of a Great Lake.",
      "A river runs through my downtown canyon of tall buildings.",
      "A shiny bean-shaped sculpture is one of my signature photo spots."
    ],
    "didYouKnow": "The Ferris wheel was invented here!",
    "badge": "🍜 Taste Trailblazer",
    "missionLinked": "🍜 Taste Trailblazer",
    "missionReward": "+2⭐",
    "population": "2.7 Million",
    "currency": "US Dollar ($)",
    "language": "English",
    "mapCoordinates": { "x": 68, "y": 55 },
    "greetingAudio": "Hey!",
    "landmarkIcon": "🍕"
  },
  {
    "id": "loc_mexico_city",
    "type": "Location",
    "city": "Mexico City",
    "country": "Mexico",
    "continent": "North America",
    "flagUrl": "https://flagcdn.com/w320/mx.png",
    "bandColor": "Red",
    "clues": [
      "I am the continent where corn and pumpkins were first grown by farmers.",
      "I am famous for spicy tacos deserts and mariachi music.",
      "I was built on a lake so I am slowly sinking into the ground!"
    ],
    "cluesAlt": [
      "I am on a continent where ancient civilizations thrived.",
      "My country has Indigenous and Spanish roots.",
      "I was built on a lake."
    ],
    "cluesAlt2": [
      "I'm a giant city set in a high mountain basin.",
      "My historic center was built over a famous ancient city.",
      "A vast main square called the Zócalo anchors my core."
    ],
    "didYouKnow": "Mexico City is slowly sinking every year!",
    "badge": "🧭 Time Traveler",
    "missionLinked": "🧭 Time Traveler",
    "missionReward": "+2⭐",
    "population": "9.2 Million",
    "currency": "Mexican Peso ($)",
    "language": "Spanish",
    "mapCoordinates": { "x": 45, "y": 85 },
    "greetingAudio": "Hola!",
    "landmarkIcon": "🌮"
  },
  {
    "id": "loc_vancouver",
    "type": "Location",
    "city": "Vancouver",
    "country": "Canada",
    "continent": "North America",
    "flagUrl": "https://flagcdn.com/w320/ca.png",
    "bandColor": "Red",
    "clues": [
      "I am the continent where the Rocky Mountains stretch far into the sky.",
      "I am the second largest country in the world and have lots of moose.",
      "You can ski on a mountain and swim in the ocean on the same day here!"
    ],
    "cluesAlt": [
      "I am on a continent with tall coastal mountains.",
      "My country stretches across six time zones.",
      "Mountains and ocean meet near me."
    ],
    "cluesAlt2": [
      "I'm a coastal city where mountains meet the sea.",
      "A massive urban park sits right beside downtown.",
      "Harbor seaplanes and a seawall are common sights here."
    ],
    "didYouKnow": "Stanley Park is larger than Central Park!",
    "badge": "🌿 Eco Explorer",
    "missionLinked": "🌿 Eco Explorer",
    "missionReward": "+2⭐",
    "population": "675,000",
    "currency": "Canadian Dollar (C$)",
    "language": "English",
    "mapCoordinates": { "x": 15, "y": 35 },
    "greetingAudio": "Hello!",
    "landmarkIcon": "🏔️"
  },
  {
    "id": "loc_san_francisco",
    "type": "Location",
    "city": "San Francisco",
    "country": "United States",
    "continent": "North America",
    "flagUrl": "https://flagcdn.com/w320/us.png",
    "bandColor": "Red",
    "clues": [
      "I am the continent where the tallest trees on Earth the Redwoods grow.",
      "Our money is called the Dollar.",
      "I have a giant orange bridge called the Golden Gate and very steep streets."
    ],
    "cluesAlt": [
      "I am on a continent with dramatic coastlines.",
      "My country helped create modern technology.",
      "I have an orange bridge and steep streets."
    ],
    "cluesAlt2": [
      "I'm a hilly city often wrapped in fog.",
      "A giant red-orange bridge spans the mouth of my bay.",
      "Historic cable cars climb my steep streets."
    ],
    "didYouKnow": "Fog in San Francisco has its own name — Karl!",
    "badge": "🗼 Wonders Hunter",
    "missionLinked": "🗼 Wonders Hunter",
    "missionReward": "+2⭐",
    "population": "873,000",
    "currency": "US Dollar ($)",
    "language": "English",
    "mapCoordinates": { "x": 12, "y": 60 },
    "greetingAudio": "Hi!",
    "landmarkIcon": "🌉"
  },
  {
    "id": "loc_tokyo",
    "type": "Location",
    "city": "Tokyo",
    "country": "Japan",
    "continent": "Asia",
    "flagUrl": "https://flagcdn.com/w320/jp.png",
    "bandColor": "Yellow",
    "clues": [
      "I am the biggest continent in the world.",
      "My flag is white with a red circle and we invented sushi.",
      "I have the busiest street crossing in the world full of neon lights."
    ],
    "cluesAlt": [
      "I am on the world's largest continent.",
      "My country is an island nation with a rising sun flag.",
      "I have the busiest pedestrian crossing."
    ],
    "cluesAlt2": [
      "I'm a megacity mixing neon with tradition.",
      "A famous crossing fills with waves of pedestrians at once.",
      "Trains run with such precision they shape my daily rhythm."
    ],
    "didYouKnow": "Tokyo has the busiest train station in the world!",
    "badge": "🍜 Taste Trailblazer",
    "missionLinked": "🍜 Taste Trailblazer",
    "missionReward": "+2⭐",
    "secondaryBadge": "🎭 Cultural Voyager",
    "secondaryMissionLinked": "🎭 Cultural Voyager",
    "population": "14 Million",
    "currency": "Yen (¥)",
    "language": "Japanese",
    "mapCoordinates": { "x": 90, "y": 40 },
    "greetingAudio": "Konnichiwa!",
    "landmarkIcon": "🍣"
  },
  {
    "id": "loc_beijing",
    "type": "Location",
    "city": "Beijing",
    "country": "China",
    "continent": "Asia",
    "flagUrl": "https://flagcdn.com/w320/cn.png",
    "bandColor": "Yellow",
    "clues": [
      "I am the continent where Giant Pandas and Bengal Tigers live.",
      "I have a stone wall so long it stretches for thousands of miles.",
      "I am the capital city with the 'Forbidden City' palace inside me."
    ],
    "cluesAlt": [
      "I'm on the biggest continent, home to deserts, mountains, and ancient civilizations.",
      "My country built a famous wall that runs across mountains for thousands of miles.",
      "I'm the capital with an enormous royal palace complex called the Forbidden City."
    ],
    "cluesAlt2": [
      "I'm an ancient capital of imperial history.",
      "A vast palace complex sits in my center behind grand gates.",
      "A massive wall stretches across mountains not far from me."
    ],
    "didYouKnow": "Beijing means ‘Northern Capital’!",
    "badge": "🧭 Time Traveler",
    "missionLinked": "🧭 Time Traveler",
    "missionReward": "+2⭐",
    "population": "21.5 Million",
    "currency": "Renminbi (¥)",
    "language": "Mandarin",
    "mapCoordinates": { "x": 75, "y": 40 },
    "greetingAudio": "Ni Hao!",
    "landmarkIcon": "🏯"
  },
  {
    "id": "loc_bangkok",
    "type": "Location",
    "city": "Bangkok",
    "country": "Thailand",
    "continent": "Asia",
    "flagUrl": "https://flagcdn.com/w320/th.png",
    "bandColor": "Yellow",
    "clues": [
      "I am the continent where rice grows in watery fields called paddies.",
      "I am the capital of the 'Land of Smiles' and we love elephants.",
      "I have floating markets on boats and three-wheeled taxis called Tuk-Tuks."
    ],
    "cluesAlt": [
      "I am on a continent shaped by monsoons.",
      "My country is called the Land of Smiles.",
      "I have boats and tuk-tuks everywhere."
    ],
    "cluesAlt2": [
      "I'm a warm river city with ornate temples.",
      "Markets spill onto canals and boats become shops.",
      "A riverside temple with a tall spire glows at sunset."
    ],
    "didYouKnow": "Bangkok’s full name has 21 words!",
    "badge": "🍜 Taste Trailblazer",
    "missionLinked": "🍜 Taste Trailblazer",
    "missionReward": "+2⭐",
    "secondaryBadge": "🎭 Cultural Voyager",
    "secondaryMissionLinked": "🎭 Cultural Voyager",
    "population": "10.7 Million",
    "currency": "Baht (฿)",
    "language": "Thai",
    "mapCoordinates": { "x": 65, "y": 70 },
    "greetingAudio": "Sawasdee!",
    "landmarkIcon": "🐘"
  },
  {
    "id": "loc_mumbai",
    "type": "Location",
    "city": "Mumbai",
    "country": "India",
    "continent": "Asia",
    "flagUrl": "https://flagcdn.com/w320/in.png",
    "bandColor": "Yellow",
    "clues": [
      "I am on the continent where the Himalayas stretch across many countries.",
      "My country is famous for cricket, spicy food, and many different languages.",
      "I make more movies than Hollywood—we call it Bollywood!"
    ],
    "cluesAlt": [
      "I am on a continent with the highest mountains.",
      "My country is the most populous on Earth.",
      "I have the busiest film industry."
    ],
    "cluesAlt2": [
      "I'm a coastal megacity that never slows down.",
      "A glowing seaside boulevard curves like a necklace at night.",
      "A monumental stone arch faces the harbor as a landmark arrival point."
    ],
    "didYouKnow": "Mumbai’s trains carry over 7 million passengers daily!",
    "badge": "🎭 Cultural Voyager",
    "missionLinked": "🎭 Cultural Voyager",
    "missionReward": "+2⭐",
    "population": "20.4 Million",
    "currency": "Indian Rupee (₹)",
    "language": "Marathi/Hindi",
    "mapCoordinates": { "x": 30, "y": 65 },
    "greetingAudio": "Namaste!",
    "landmarkIcon": "🍛"
  },
  {
    "id": "loc_seoul",
    "type": "Location",
    "city": "Seoul",
    "country": "South Korea",
    "continent": "Asia",
    "flagUrl": "https://flagcdn.com/w320/kr.png",
    "bandColor": "Yellow",
    "clues": [
      "I am the continent where the ancient Silk Road connected trade routes.",
      "We are famous for a martial art called Taekwondo and spicy cabbage.",
      "I am a high-tech city where lots of K-Pop stars perform."
    ],
    "cluesAlt": [
      "I am on a continent with ancient trade routes.",
      "My country is famous for taekwondo and kimchi.",
      "I have futuristic buildings mixed with royal palaces."
    ],
    "cluesAlt2": [
      "I'm a fast-moving city balancing old and new.",
      "A wide river runs through my center.",
      "A royal palace sits beneath a mountain that frames my skyline."
    ],
    "didYouKnow": "Seoul means ‘capital city’!",
    "badge": "🎭 Cultural Voyager",
    "missionLinked": "🎭 Cultural Voyager",
    "missionReward": "+2⭐",
    "population": "9.7 Million",
    "currency": "Won (₩)",
    "language": "Korean",
    "mapCoordinates": { "x": 85, "y": 40 },
    "greetingAudio": "Annyeonghaseyo!",
    "landmarkIcon": "🥋"
  },
  {
    "id": "loc_singapore",
    "type": "Location",
    "city": "Singapore",
    "country": "Singapore",
    "continent": "Asia",
    "flagUrl": "https://flagcdn.com/w320/sg.png",
    "bandColor": "Yellow",
    "clues": [
      "I am the continent where Orangutans swing in the jungle trees.",
      "My country is a tiny island nation in Southeast Asia with four official languages.",
      "I am famous for giant metal 'Supertrees' that light up at night."
    ],
    "cluesAlt": [
      "I am on a continent near the equator.",
      "My country is both a city and a nation.",
      "I have glowing metal trees and a lion-fish statue."
    ],
    "cluesAlt2": [
      "I'm a dense island city known for order and innovation.",
      "Giant metal \"trees\" light up in a futuristic garden.",
      "A rooftop infinity pool sits atop a three-tower waterfront landmark."
    ],
    "didYouKnow": "Singapore has no natural lakes!",
    "badge": "🌿 Eco Explorer",
    "missionLinked": "🌿 Eco Explorer",
    "missionReward": "+2⭐",
    "population": "5.6 Million",
    "currency": "Singapore Dollar (S$)",
    "language": "English/Malay",
    "mapCoordinates": { "x": 68, "y": 85 },
    "greetingAudio": "Hello!",
    "landmarkIcon": "🦁"
  },
  {
    "id": "loc_dubai",
    "type": "Location",
    "city": "Dubai",
    "country": "UAE",
    "continent": "Asia",
    "flagUrl": "https://flagcdn.com/w320/ae.png",
    "bandColor": "Yellow",
    "clues": [
      "I am the continent with the vast Arabian Desert sands.",
      "I am a land of hot deserts camels and lots of sand.",
      "I have the Burj Khalifa the tallest building on the entire planet."
    ],
    "cluesAlt": [
      "I am on a continent dominated by deserts.",
      "My country became wealthy from oil.",
      "I have the tallest building ever built."
    ],
    "cluesAlt2": [
      "I'm a desert city built for the future.",
      "The tallest building on Earth rises from my skyline.",
      "A giant mall here even has an indoor ski slope."
    ],
    "didYouKnow": "Dubai has more foreign residents than locals!",
    "badge": "🌋 Thrill Trekker",
    "missionLinked": "🌋 Thrill Trekker",
    "missionReward": "+2⭐",
    "secondaryBadge": "🗼 Wonders Hunter",
    "secondaryMissionLinked": "🗼 Wonders Hunter",
    "population": "3.3 Million",
    "currency": "Dirham (AED)",
    "language": "Arabic",
    "mapCoordinates": { "x": 20, "y": 60 },
    "greetingAudio": "Marhaba!",
    "landmarkIcon": "🐫"
  },
  {
    "id": "loc_rio_de_janeiro",
    "type": "Location",
    "city": "Rio de Janeiro",
    "country": "Brazil",
    "continent": "South America",
    "flagUrl": "https://flagcdn.com/w320/br.png",
    "bandColor": "Green",
    "clues": [
      "I am the continent home to the Amazon Rainforest the lungs of the Earth.",
      "My country speaks Portuguese and is famous for the Amazon Rainforest.",
      "I have a giant statue of Jesus on a hill and a huge party called Carnival."
    ],
    "cluesAlt": [
      "I am on a continent covered in rainforests.",
      "My country speaks Portuguese.",
      "A giant statue watches over my beaches."
    ],
    "cluesAlt2": [
      "I'm a coastal city where mountains rise beside beaches.",
      "A giant Christ statue stands high above my skyline.",
      "Sugarloaf Mountain frames my famous harbor view."
    ],
    "didYouKnow": "‘Rio de Janeiro’ means River of January!",
    "badge": "🎭 Cultural Voyager",
    "missionLinked": "🎭 Cultural Voyager",
    "missionReward": "+2⭐",
    "secondaryBadge": "🌋 Thrill Trekker",
    "secondaryMissionLinked": "🌋 Thrill Trekker",
    "population": "6.7 Million",
    "currency": "Brazilian Real (R$)",
    "language": "Portuguese",
    "mapCoordinates": { "x": 80, "y": 60 },
    "greetingAudio": "Olá!",
    "landmarkIcon": "⚽"
  },
  {
    "id": "loc_buenos_aires",
    "type": "Location",
    "city": "Buenos Aires",
    "country": "Argentina",
    "continent": "South America",
    "flagUrl": "https://flagcdn.com/w320/ar.png",
    "bandColor": "Green",
    "clues": [
      "I am on the continent where the Andes mountains run along one side.",
      "Our soccer jersey has light blue and white stripes.",
      "I am the city where the Tango dance was invented."
    ],
    "cluesAlt": [
      "I am on a continent in the southern half of the world.",
      "My country loves tango and beef.",
      "Tango dancing was born here."
    ],
    "cluesAlt2": [
      "I'm a grand city of cafés and wide avenues.",
      "I'm the birthplace of tango dance and music.",
      "A colorful portside neighborhood called La Boca is a classic hint."
    ],
    "didYouKnow": "Buenos Aires means ‘good air’!",
    "badge": "🎭 Cultural Voyager",
    "missionLinked": "🎭 Cultural Voyager",
    "missionReward": "+2⭐",
    "population": "3.1 Million",
    "currency": "Argentine Peso ($)",
    "language": "Spanish",
    "mapCoordinates": { "x": 60, "y": 80 },
    "greetingAudio": "Hola!",
    "landmarkIcon": "💃"
  },
  {
    "id": "loc_lima",
    "type": "Location",
    "city": "Lima",
    "country": "Peru",
    "continent": "South America",
    "flagUrl": "https://flagcdn.com/w320/pe.png",
    "bandColor": "Green",
    "clues": [
      "I am the continent with the longest mountain range the Andes.",
      "I am the home of the ancient Inca ruins called Machu Picchu.",
      "I am a city on the cliffs by the ocean but it almost never rains here!"
    ],
    "cluesAlt": [
      "I am on a continent with the longest mountain chains.",
      "My country was home to the Incas.",
      "I sit above the ocean on high cliffs."
    ],
    "cluesAlt2": [
      "I'm a huge city on the Pacific coast with desert air.",
      "Neighborhoods perch on cliffs above the ocean.",
      "A seaside district called Miraflores is one of my best-known areas."
    ],
    "didYouKnow": "Lima’s desert gets almost no rain!",
    "badge": "🍜 Taste Trailblazer",
    "missionLinked": "🍜 Taste Trailblazer",
    "missionReward": "+2⭐",
    "population": "9.7 Million",
    "currency": "Sol (S/)",
    "language": "Spanish",
    "mapCoordinates": { "x": 15, "y": 45 },
    "greetingAudio": "Hola!",
    "landmarkIcon": "🦙"
  },
  {
    "id": "loc_santiago",
    "type": "Location",
    "city": "Santiago",
    "country": "Chile",
    "continent": "South America",
    "flagUrl": "https://flagcdn.com/w320/cl.png",
    "bandColor": "Green",
    "clues": [
      "I am on the continent with a very long skinny country along the ocean.",
      "I am the longest skinniest country in the world—like a chili pepper!",
      "I am a city surrounded by snow-capped mountains on all sides."
    ],
    "cluesAlt": [
      "I am on a continent squeezed between mountains and ocean.",
      "My country is long and narrow.",
      "Snowy peaks surround me."
    ],
    "cluesAlt2": [
      "I'm a major city set beside towering mountains.",
      "Snowy Andes peaks often appear behind my skyline.",
      "A hill called San Cristóbal offers a panoramic view over me."
    ],
    "didYouKnow": "Santiago sits on a huge valley plain!",
    "badge": "🌿 Eco Explorer",
    "missionLinked": "🌿 Eco Explorer",
    "missionReward": "+2⭐",
    "population": "5.6 Million",
    "currency": "Chilean Peso ($)",
    "language": "Spanish",
    "mapCoordinates": { "x": 20, "y": 80 },
    "greetingAudio": "Hola!",
    "landmarkIcon": "🌶️"
  },
  {
    "id": "loc_bogotá",
    "type": "Location",
    "city": "Bogotá",
    "country": "Colombia",
    "continent": "South America",
    "flagUrl": "https://flagcdn.com/w320/co.png",
    "bandColor": "Green",
    "clues": [
      "I am the continent where pink dolphins swim in the rivers.",
      "I produce some of the best coffee beans in the world.",
      "I have a museum full of gold and I am very high up in the sky."
    ],
    "cluesAlt": [
      "I am on a continent crossed by the equator.",
      "My country is famous for coffee.",
      "I am one of the highest capital cities."
    ],
    "cluesAlt2": [
      "I'm a high-altitude capital near the equator.",
      "A famous museum here is filled with gold artifacts.",
      "A mountaintop viewpoint called Monserrate overlooks my city."
    ],
    "didYouKnow": "Bogotá is over 2,600 meters above sea level!",
    "badge": "🧭 Time Traveler",
    "missionLinked": "🧭 Time Traveler",
    "missionReward": "+2⭐",
    "population": "7.4 Million",
    "currency": "Colombian Peso ($)",
    "language": "Spanish",
    "mapCoordinates": { "x": 25, "y": 20 },
    "greetingAudio": "Hola!",
    "landmarkIcon": "☕"
  },
  {
    "id": "loc_caracas",
    "type": "Location",
    "city": "Caracas",
    "country": "Venezuela",
    "continent": "South America",
    "flagUrl": "https://flagcdn.com/w320/ve.png",
    "bandColor": "Green",
    "clues": [
      "I am the continent where Llamas and Alpacas walk the hills.",
      "I have the tallest waterfall in the world—it's miles high!",
      "I am a busy capital city located in a valley near the Caribbean Sea."
    ],
    "cluesAlt": [
      "I am on a continent with jungles and waterfalls.",
      "My country has the tallest waterfall.",
      "I sit in a valley near the Caribbean."
    ],
    "cluesAlt2": [
      "I'm a large city close to the Caribbean.",
      "A steep green mountain rises immediately behind my skyline.",
      "That mountain wall is one of my most defining features."
    ],
    "didYouKnow": "Caracas means ‘valley of the Caracas tribe’!",
    "badge": "🌿 Eco Explorer",
    "missionLinked": "🌿 Eco Explorer",
    "missionReward": "+2⭐",
    "population": "2.1 Million",
    "currency": "Bolivar (Bs.)",
    "language": "Spanish",
    "mapCoordinates": { "x": 35, "y": 10 },
    "greetingAudio": "Hola!",
    "landmarkIcon": "🦜"
  },
  {
    "id": "loc_moscow",
    "type": "Location",
    "city": "Moscow",
    "country": "Russia",
    "continent": "Europe",
    "flagUrl": "https://flagcdn.com/w320/ru.png",
    "bandColor": "Purple",
    "clues": [
      "I am on the continent that connects to both Europe and Asia.",
      "I am the biggest country in the world!",
      "I have a famous building with colorful tops that look like swirly ice cream!"
    ],
    "cluesAlt": [
      "I am on a continent that stretches far from west to east.",
      "My country is the largest on Earth.",
      "I have colorful onion-shaped domes."
    ],
    "cluesAlt2": [
      "I'm a vast capital with dramatic public squares.",
      "My central square hosts huge national celebrations.",
      "Colorful onion domes rise beside Red Square."
    ],
    "didYouKnow": "Moscow has a subway station that looks like a palace!",
    "badge": "🗼 Wonders Hunter",
    "missionLinked": "🗼 Wonders Hunter",
    "missionReward": "+2⭐",
    "population": "13 Million",
    "currency": "Ruble (₽)",
    "language": "Russian",
    "mapCoordinates": { "x": 85, "y": 30 },
    "greetingAudio": "Privet!",
    "landmarkIcon": "🏰"
  },
  {
    "id": "loc_cairo",
    "type": "Location",
    "city": "Cairo",
    "country": "Egypt",
    "continent": "Africa",
    "flagUrl": "https://flagcdn.com/w320/eg.png",
    "bandColor": "Orange",
    "clues": [
      "I am the continent with the largest hot desert the Sahara.",
      "I am famous for mummies and huge triangle Pyramids.",
      "I am a dusty busy city beside one of the world's longest rivers—the Nile."
    ],
    "cluesAlt": [
      "I am on the continent with the largest hot desert.",
      "My country had powerful ancient kingdoms.",
      "I sit by a river that flows north."
    ],
    "cluesAlt2": [
      "I'm a vast city built along a mighty river.",
      "Museums here hold world-famous ancient treasures.",
      "A bustling central square became globally known in modern history."
    ],
    "didYouKnow": "Cairo means ‘the victorious’!",
    "badge": "🧭 Time Traveler",
    "missionLinked": "🧭 Time Traveler",
    "missionReward": "+2⭐",
    "secondaryBadge": "🗼 Wonders Hunter",
    "secondaryMissionLinked": "🗼 Wonders Hunter",
    "population": "9.5 Million",
    "currency": "Egyptian Pound (E£)",
    "language": "Arabic",
    "mapCoordinates": { "x": 62, "y": 18 },
    "greetingAudio": "Marhaba!",
    "landmarkIcon": "🔺"
  },
  {
    "id": "loc_nairobi",
    "type": "Location",
    "city": "Nairobi",
    "country": "Kenya",
    "continent": "Africa",
    "flagUrl": "https://flagcdn.com/w320/ke.png",
    "bandColor": "Orange",
    "clues": [
      "I am the continent where Lions Giraffes and Zebras run wild.",
      "My long-distance runners are the fastest in the world.",
      "I am the only city with a National Park full of lions right inside me!"
    ],
    "cluesAlt": [
      "I am on a continent with vast wildlife migrations.",
      "My country has famous marathon runners.",
      "Wild animals roam in my city park."
    ],
    "cluesAlt2": [
      "I'm a highland city known as a gateway to safari life.",
      "Wild animals roam in a protected park right beside my skyline.",
      "Giraffes and lions can be seen with city buildings in the background."
    ],
    "didYouKnow": "Nairobi means ‘cool waters’ in Maasai!",
    "badge": "🐾 Safari Master",
    "missionLinked": "🐾 Safari Master",
    "missionReward": "+2⭐",
    "population": "4.4 Million",
    "currency": "Kenyan Shilling (KSh)",
    "language": "Swahili/English",
    "mapCoordinates": { "x": 68, "y": 62 },
    "greetingAudio": "Jambo!",
    "landmarkIcon": "🦁"
  },
  {
    "id": "loc_cape_town",
    "type": "Location",
    "city": "Cape Town",
    "country": "South Africa",
    "continent": "Africa",
    "flagUrl": "https://flagcdn.com/w320/za.png",
    "bandColor": "Orange",
    "clues": [
      "I am the continent where the Atlantic and Indian Oceans meet.",
      "I am the country at the very bottom tip of the continent.",
      "I have a mountain that looks flat on top like a table."
    ],
    "cluesAlt": [
      "I'm on a continent with huge deserts, wild safaris, and thousands of languages.",
      "My country is famous for the 'Rainbow Nation' and wildlife like lions and rhinos.",
      "I have a flat-topped mountain that looks like a table above the ocean."
    ],
    "cluesAlt2": [
      "I'm a coastal city known for dramatic scenery.",
      "A flat-topped mountain rises above my harbor.",
      "Two oceans meet in the broader region around my coastline."
    ],
    "didYouKnow": "Cape Town was once called the ‘Tavern of the Seas’!",
    "badge": "🌿 Eco Explorer",
    "missionLinked": "🌿 Eco Explorer",
    "missionReward": "+2⭐",
    "secondaryBadge": "🐾 Safari Master",
    "secondaryMissionLinked": "🐾 Safari Master",
    "population": "4.6 Million",
    "currency": "Rand (R)",
    "language": "English/Xhosa",
    "mapCoordinates": { "x": 52, "y": 92 },
    "greetingAudio": "Hello!",
    "landmarkIcon": "⛰️"
  },
  {
    "id": "loc_johannesburg",
    "type": "Location",
    "city": "Johannesburg",
    "country": "South Africa",
    "continent": "Africa",
    "flagUrl": "https://flagcdn.com/w320/za.png",
    "bandColor": "Orange",
    "clues": [
      "I am the continent where the Great Rift Valley splits the earth.",
      "We are called the 'Rainbow Nation' because we have so many cultures.",
      "I was built because people found huge amounts of gold here!"
    ],
    "cluesAlt": [
      "I'm on a continent where you can find savannas, rainforests, and some of the world's biggest wildlife.",
      "My country has 11 official languages and is known for big cities and famous national parks.",
      "People call me the 'City of Gold' because I grew fast after gold was found nearby."
    ],
    "cluesAlt2": [
      "I'm a major inland city built on mineral wealth.",
      "My growth exploded after gold was discovered beneath me.",
      "A museum here powerfully tells the story of apartheid-era history."
    ],
    "didYouKnow": "Johannesburg is not near any river or coast!",
    "badge": "🧭 Time Traveler",
    "missionLinked": "🧭 Time Traveler",
    "missionReward": "+2⭐",
    "secondaryBadge": "🎭 Cultural Voyager",
    "secondaryMissionLinked": "🎭 Cultural Voyager",
    "population": "5.6 Million",
    "currency": "Rand (R)",
    "language": "English/Zulu",
    "mapCoordinates": { "x": 58, "y": 82 },
    "greetingAudio": "Sawubona!",
    "landmarkIcon": "💎"
  },
  {
    "id": "loc_marrakesh",
    "type": "Location",
    "city": "Marrakesh",
    "country": "Morocco",
    "continent": "Africa",
    "flagUrl": "https://flagcdn.com/w320/ma.png",
    "bandColor": "Orange",
    "clues": [
      "I am the continent where the weird Baobab trees grow upside down.",
      "I have bustling markets called Souks and the Atlas Mountains.",
      "My walls are made of red clay so they call me the 'Red City'."
    ],
    "cluesAlt": [
      "I am on a continent linking Europe and the Middle East.",
      "My country has deserts and mountains.",
      "My buildings glow red."
    ],
    "cluesAlt2": [
      "I'm a city known for markets, spices, and courtyards.",
      "My old walls glow red in the sun.",
      "A famous square fills with performers, food stalls, and music at night."
    ],
    "didYouKnow": "Marrakesh’s walls are pink!",
    "badge": "🎭 Cultural Voyager",
    "missionLinked": "🎭 Cultural Voyager",
    "missionReward": "+2⭐",
    "population": "928,000",
    "currency": "Dirham (MAD)",
    "language": "Arabic",
    "mapCoordinates": { "x": 18, "y": 18 },
    "greetingAudio": "As-salamu alaykum!",
    "landmarkIcon": "🕌"
  },
  {
    "id": "loc_lagos",
    "type": "Location",
    "city": "Lagos",
    "country": "Nigeria",
    "continent": "Africa",
    "flagUrl": "https://flagcdn.com/w320/ng.png",
    "bandColor": "Orange",
    "clues": [
      "I am the continent with the vast grasslands called the Savanna.",
      "My flag is green and white and I have the most people in Africa.",
      "I am one of Africa's biggest and busiest cities, famous for music!"
    ],
    "cluesAlt": [
      "I am on a continent with rapidly growing cities.",
      "My country has the largest population in Africa.",
      "I am famous for music and traffic."
    ],
    "cluesAlt2": [
      "I'm a giant coastal city buzzing with energy.",
      "Traffic and bridges are part of my daily identity.",
      "I sit beside a lagoon and a wide stretch of Atlantic shoreline."
    ],
    "didYouKnow": "Lagos has over 20 million people!",
    "badge": "🎭 Cultural Voyager",
    "missionLinked": "🎭 Cultural Voyager",
    "missionReward": "+2⭐",
    "population": "15 Million",
    "currency": "Naira (₦)",
    "language": "English",
    "mapCoordinates": { "x": 38, "y": 52 },
    "greetingAudio": "Hello!",
    "landmarkIcon": "🥁"
  },
  {
    "id": "loc_addis_ababa",
    "type": "Location",
    "city": "Addis Ababa",
    "country": "Ethiopia",
    "continent": "Africa",
    "flagUrl": "https://flagcdn.com/w320/et.png",
    "bandColor": "Orange",
    "clues": [
      "I am the continent where human beings first lived long long ago.",
      "My country is where coffee beans were first discovered!",
      "My name means 'New Flower' and I am high in the mountains."
    ],
    "cluesAlt": [
      "I am on a continent where early humans lived.",
      "My country is the birthplace of coffee.",
      "My name means New Flower."
    ],
    "cluesAlt2": [
      "I'm a high-altitude capital in the Horn of Africa.",
      "My name means \"New Flower.\"",
      "A major continental organization has its headquarters here."
    ],
    "didYouKnow": "Addis Ababa means ‘new flower’!",
    "badge": "🍜 Taste Trailblazer",
    "missionLinked": "🍜 Taste Trailblazer",
    "missionReward": "+2⭐",
    "population": "3.4 Million",
    "currency": "Birr (ETB)",
    "language": "Amharic",
    "mapCoordinates": { "x": 72, "y": 48 },
    "greetingAudio": "Selam!",
    "landmarkIcon": "☕"
  },
  {
    "id": "loc_sydney",
    "type": "Location",
    "city": "Sydney",
    "country": "Australia",
    "continent": "Oceania",
    "flagUrl": "https://flagcdn.com/w320/au.png",
    "bandColor": "Teal",
    "clues": [
      "I am on a continent that is also a country, surrounded by ocean.",
      "I am the land of Kangaroos and Koalas.",
      "I have a famous building that looks like white sailing ship shells."
    ],
    "cluesAlt": [
      "I am on the smallest continent.",
      "My country is home to marsupials.",
      "I have a white sail-shaped opera house."
    ],
    "cluesAlt2": [
      "I'm a harbor city with world-famous waterfront architecture.",
      "A white sail-shaped opera house sits on the edge of the water.",
      "A giant steel arch bridge spans the same harbor."
    ],
    "didYouKnow": "Sydney Opera House roof has over 1 million tiles!",
    "badge": "🗼 Wonders Hunter",
    "missionLinked": "🗼 Wonders Hunter",
    "missionReward": "+2⭐",
    "secondaryBadge": "🌋 Thrill Trekker",
    "secondaryMissionLinked": "🌋 Thrill Trekker",
    "population": "5.3 Million",
    "currency": "Australian Dollar (A$)",
    "language": "English",
    "mapCoordinates": { "x": 82, "y": 78 },
    "greetingAudio": "G'day!",
    "landmarkIcon": "🦘"
  },
  {
    "id": "loc_melbourne",
    "type": "Location",
    "city": "Melbourne",
    "country": "Australia",
    "continent": "Oceania",
    "flagUrl": "https://flagcdn.com/w320/au.png",
    "bandColor": "Teal",
    "clues": [
      "I am on a continent that is also a country, famous for kangaroos.",
      "My country is known for the Outback and beaches.",
      "I have green and yellow trams and a giant cricket stadium."
    ],
    "cluesAlt": [
      "I am on a continent surrounded by ocean.",
      "My country loves cricket and rugby.",
      "Trams crisscross my downtown."
    ],
    "cluesAlt2": [
      "I'm a major city known for sports and cafés.",
      "Trams crisscross my streets and laneways.",
      "A huge cricket ground is one of my defining venues."
    ],
    "didYouKnow": "Melbourne’s weather can change 4 times a day!",
    "badge": "🎭 Cultural Voyager",
    "missionLinked": "🎭 Cultural Voyager",
    "missionReward": "+2⭐",
    "population": "5 Million",
    "currency": "Australian Dollar (A$)",
    "language": "English",
    "mapCoordinates": { "x": 78, "y": 82 },
    "greetingAudio": "G'day!",
    "landmarkIcon": "🏏"
  },
  {
    "id": "loc_auckland",
    "type": "Location",
    "city": "Auckland",
    "country": "New Zealand",
    "continent": "Oceania",
    "flagUrl": "https://flagcdn.com/w320/nz.png",
    "bandColor": "Teal",
    "clues": [
      "I am the continent made up of thousands of islands.",
      "My national bird is the Kiwi which cannot fly.",
      "I am known as the 'City of Sails' and I sit on 50 volcanoes!"
    ],
    "cluesAlt": [
      "I am on a continent made of islands.",
      "My country has a flightless bird as a symbol.",
      "I sit between two harbors on volcanoes."
    ],
    "cluesAlt2": [
      "I'm a harbor city known for sailing culture.",
      "I'm built across volcanic hills and waterfront bays.",
      "I'm often called the \"City of Sails.\""
    ],
    "didYouKnow": "Auckland sits on 50 volcanoes!",
    "badge": "🌋 Thrill Trekker",
    "missionLinked": "🌋 Thrill Trekker",
    "missionReward": "+2⭐",
    "population": "1.6 Million",
    "currency": "NZ Dollar (NZ$)",
    "language": "English",
    "mapCoordinates": { "x": 92, "y": 82 },
    "greetingAudio": "Kia Ora!",
    "landmarkIcon": "🥝"
  },
  {
    "id": "loc_brisbane",
    "type": "Location",
    "city": "Brisbane",
    "country": "Australia",
    "continent": "Oceania",
    "flagUrl": "https://flagcdn.com/w320/au.png",
    "bandColor": "Teal",
    "clues": [
      "I am on a continent that is also a country, in the southern part of the world.",
      "Most of my land is a red desert called the Outback.",
      "I am a sunny city with a winding river and a man-made beach."
    ],
    "cluesAlt": [
      "I am on a continent with tropical regions.",
      "My country has the Outback.",
      "A winding river runs through my sunny center."
    ],
    "cluesAlt2": [
      "I'm a sunny river city with an outdoorsy vibe.",
      "A winding river cuts through my center beside a lively promenade.",
      "A man-made beach sits right in the city."
    ],
    "didYouKnow": "Brisbane River is home to wild dolphins!",
    "badge": "🐾 Safari Master",
    "missionLinked": "🐾 Safari Master",
    "missionReward": "+2⭐",
    "population": "2.4 Million",
    "currency": "Australian Dollar (A$)",
    "language": "English",
    "mapCoordinates": { "x": 85, "y": 68 },
    "greetingAudio": "G'day!",
    "landmarkIcon": "🐬"
  },
  {
    "id": "loc_perth",
    "type": "Location",
    "city": "Perth",
    "country": "Australia",
    "continent": "Oceania",
    "flagUrl": "https://flagcdn.com/w320/au.png",
    "bandColor": "Teal",
    "clues": [
      "I am on the continent that is also a country.",
      "The boomerang was invented by the people of my land.",
      "I am very far from other cities and smiling Quokkas live nearby."
    ],
    "cluesAlt": [
      "I am on one of the most isolated continents.",
      "My country has ancient Indigenous cultures.",
      "I am one of the most remote major cities."
    ],
    "cluesAlt2": [
      "I'm a major city on the Indian Ocean far from other large cities.",
      "Sunsets over the water are a local obsession.",
      "A nearby island is famous for smiling quokkas."
    ],
    "didYouKnow": "Perth gets more sunshine than any other capital in Australia!",
    "badge": "🌿 Eco Explorer",
    "missionLinked": "🌿 Eco Explorer",
    "missionReward": "+2⭐",
    "population": "2.1 Million",
    "currency": "Australian Dollar (A$)",
    "language": "English",
    "mapCoordinates": { "x": 15, "y": 72 },
    "greetingAudio": "G'day!",
    "landmarkIcon": "🦢"
  },
  {
    "id": "loc_delhi",
    "type": "Location",
    "city": "Delhi",
    "country": "India",
    "continent": "Asia",
    "flagUrl": "https://flagcdn.com/w320/in.png",
    "bandColor": "Yellow",
    "clues": [
      "I am the continent where the King Cobra snake lives.",
      "I am famous for the 'Festival of Colors' where people throw bright powder.",
      "I have a giant fort made entirely of red stone."
    ],
    "cluesAlt": [
      "I am on a continent with very old religions.",
      "My country has many colorful festivals.",
      "I have a massive fort built from red stone."
    ],
    "cluesAlt2": [
      "I'm a historic city built across many eras.",
      "A massive red sandstone fort anchors my old quarter.",
      "A giant arch-shaped war memorial stands along my ceremonial boulevard."
    ],
    "didYouKnow": "Delhi is one of the oldest cities in the world!",
    "badge": "🧭 Time Traveler",
    "missionLinked": "🧭 Time Traveler",
    "missionReward": "+2⭐",
    "population": "32 Million",
    "currency": "Indian Rupee (₹)",
    "language": "Hindi/English",
    "mapCoordinates": { "x": 35, "y": 55 },
    "greetingAudio": "Namaste!",
    "landmarkIcon": "🕌"
  },
  {
    "id": "loc_suva",
    "type": "Location",
    "city": "Suva",
    "country": "Fiji",
    "continent": "Oceania",
    "flagUrl": "https://flagcdn.com/w320/fj.png",
    "bandColor": "Teal",
    "clues": [
      "I am in a part of the world made up of many islands in the Pacific Ocean.",
      "I am the capital of a country with over 300 islands and rugby-loving people.",
      "I am a tropical paradise with soft sand and colorful coral reefs."
    ],
    "cluesAlt": [
      "I am in a vast ocean region.",
      "My country has hundreds of islands.",
      "Coral reefs surround me."
    ],
    "cluesAlt2": [
      "I'm a Pacific capital surrounded by coral-rich waters.",
      "Rainforest hills rise behind my harbor.",
      "A bustling waterfront and cultural festivals are signature clues here."
    ],
    "didYouKnow": "Fiji has over 300 islands!",
    "badge": "🌿 Eco Explorer",
    "missionLinked": "🌿 Eco Explorer",
    "missionReward": "+2⭐",
    "population": "900,000",
    "currency": "Fijian Dollar (F$)",
    "language": "Fijian/English",
    "mapCoordinates": { "x": 95, "y": 45 },
    "greetingAudio": "Bula!",
    "landmarkIcon": "🏝️"
  }
];

export const EVENT_CARDS = [
  {
    id: "evt_flight_upgrade",
    type: "Event",
    eventType: "Positive",
    name: "✈️ Flight Upgrade",
    effect: "Draw 1 extra Location Card this turn.",
    description: "You get bumped to first class — comfy ride!"
  },
  {
    id: "evt_lucky_find",
    type: "Event",
    eventType: "Positive",
    name: "🍀 Lucky Find",
    effect: "Gain +1⭐ instantly.",
    description: "You discover a hidden souvenir shop — what luck!"
  },
  {
    id: "evt_smooth_sailing",
    type: "Event",
    eventType: "Positive",
    name: "⛵ Smooth Sailing",
    effect: "Auto-win Bonus Round next time.",
    description: "The winds are in your favor skip the hassle!"
  },
  {
    id: "evt_friendly_local",
    type: "Event",
    eventType: "Positive",
    name: "👋 Friendly Local",
    effect: "Steal 1⭐ from another player.",
    description: "A local guide shares a secret treasure with you!"
  },
  {
    id: "evt_lost_luggage",
    type: "Event",
    eventType: "Negative",
    name: "🧳 Lost Luggage",
    effect: "Lose 1⭐ (minimum 0⭐).",
    description: "Oh no! Your luggage went missing at the airport."
  },
  {
    id: "evt_flight_delay",
    type: "Event",
    eventType: "Negative",
    name: "🕒 Flight Delay",
    effect: "Skip your next action.",
    description: "Your flight is delayed — time for an airport nap."
  },
  {
    id: "evt_wrong_turn",
    type: "Event",
    eventType: "Negative",
    name: "↩️ Wrong Turn",
    effect: "Discard 1 Location Card of your choice.",
    description: "You took a wrong route and ended up off-track."
  },
  {
    id: "evt_rainy_day",
    type: "Event",
    eventType: "Negative",
    name: "☔ Rainy Day",
    effect: "Everyone except you gains 1⭐.",
    description: "The rain clouds follow only you today!"
  }
];

export const MISSION_CARDS = [
  {
    id: "mis_wonder",
    type: "Mission",
    name: "🗼 Wonders Hunter",
    description: "Collect 2 cities featuring iconic world landmarks like towers statues or ancient structures.",
    reward: "+2⭐"
  },
  {
    id: "mis_time",
    type: "Mission",
    name: "🧭 Time Traveler",
    description: "Collect 2 cities known for deep historical roots ancient sites or famous timelines.",
    reward: "+2⭐"
  },
  {
    id: "mis_culture",
    type: "Mission",
    name: "🎭 Cultural Voyager",
    description: "Collect 2 cities celebrated for art music museums and rich cultural traditions.",
    reward: "+2⭐"
  },
  {
    id: "mis_nature",
    type: "Mission",
    name: "🌿 Eco Explorer",
    description: "Collect 2 cities famous for nature wildlife parks or eco-friendly experiences.",
    reward: "+2⭐"
  },
  {
    id: "mis_taste",
    type: "Mission",
    name: "🍜 Taste Trailblazer",
    description: "Collect 2 cities known for delicious local foods famous dishes or culinary heritage.",
    reward: "+2⭐"
  },
  {
    id: "mis_thrill",
    type: "Mission",
    name: "🌋 Thrill Trekker",
    description: "Collect 2 cities known for adventure speed height or exciting activities.",
    reward: "+2⭐"
  },
  {
    id: "mis_safari",
    type: "Mission",
    name: "🐾 Safari Master",
    description: "Collect 2 cities or regions known for wildlife safaris and animal encounters.",
    reward: "+2⭐"
  }
];

export type LocationCard = typeof LOCATION_CARDS[number];
export type EventCard = typeof EVENT_CARDS[number];
export type MissionCard = typeof MISSION_CARDS[number];
