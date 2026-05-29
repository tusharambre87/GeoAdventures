import { LocationCard, LOCATION_CARDS } from "./gameData";

// Expanded Daily Quest: 101 cities total
// Distribution: Europe (21), Asia (18), Africa (16), North America (18), South America (14), Oceania (14)
// Sources:
// 1. All 42 Guess & Go cities from LOCATION_CARDS (includes Fiji)
// 2. 7 original Daily Quest cities (Istanbul, Venice, Kyoto, Barcelona, Honolulu, Reykjavik, Cusco)
// 3. 52 additional cities for balanced distribution

// New cities for Daily Quest (not in Guess & Go main deck)
const NEW_DAILY_QUEST_CITIES: LocationCard[] = [
  // ========== PARIS (Free onboarding city) ==========
  {
    id: "dq_paris",
    type: "Location",
    city: "Paris",
    country: "France",
    continent: "Europe",
    flagUrl: "https://flagcdn.com/w320/fr.png",
    bandColor: "Purple",
    clues: [
      "This city has the Eiffel Tower.",
      "It's the capital of France."
    ],
    cluesAlt: [
      "I am on the continent famous for art, castles, and croissants.",
      "My country's flag is blue, white, and red.",
      "I have a glowing iron tower that sparkles every night!"
    ],
    cluesAlt2: [
      "This city has the Eiffel Tower.",
      "It's the capital of France.",
      "People call it the City of Light."
    ],
    didYouKnow: "The Eiffel Tower was meant to be temporary — it was built for the 1889 World's Fair and almost torn down!",
    badge: "🗼 Landmark Legend",
    missionLinked: "🗼 Landmark Legend",
    secondaryBadge: "🎭 Cultural Voyager",
    secondaryMissionLinked: "🎭 Cultural Voyager",
    missionReward: "+2⭐",
    population: "2.1 Million",
    currency: "Euro (€)",
    language: "French",
    mapCoordinates: { x: 48, y: 42 },
    greetingAudio: "Bonjour",
    landmarkIcon: "🗼"
  },
  // ========== ORIGINAL DAILY QUEST CITIES (7) ==========
  {
    id: "dq_istanbul",
    type: "Location",
    city: "Istanbul",
    country: "Turkey",
    continent: "Asia",
    flagUrl: "https://flagcdn.com/w320/tr.png",
    bandColor: "Yellow",
    clues: [
      "I sit on two different continents at the same time!",
      "I have a giant market with over 4,000 shops."
    ],
    cluesAlt: [
      "I am on the continent that connects Europe and Asia through ancient trade routes.",
      "My country has a flag with a white crescent moon and star on red.",
      "I sit on two different continents at the same time with a giant bazaar!"
    ],
    cluesAlt2: [
      "I'm a historic city split by a narrow strait.",
      "Ships pass between two seas through my waters.",
      "The Bosphorus divides me between Europe and Asia."
    ],
    didYouKnow: "Istanbul is the only city in the world that spans two continents!",
    badge: "🧭 Time Traveler",
    missionLinked: "🧭 Time Traveler",
    secondaryBadge: "🎭 Cultural Voyager",
    secondaryMissionLinked: "🎭 Cultural Voyager",
    missionReward: "+2⭐",
    population: "15.4 Million",
    currency: "Lira (₺)",
    language: "Turkish",
    mapCoordinates: { x: 55, y: 40 },
    greetingAudio: "Merhaba",
    landmarkIcon: "🕌"
  },
  {
    id: "dq_venice",
    type: "Location",
    city: "Venice",
    country: "Italy",
    continent: "Europe",
    flagUrl: "https://flagcdn.com/w320/it.png",
    bandColor: "Purple",
    clues: [
      "I am built entirely on water with no cars allowed.",
      "People travel around me in long black boats called gondolas."
    ],
    cluesAlt: [
      "I am on the continent where many countries are close together and share the Euro.",
      "My country looks like a boot and is famous for pasta and pizza.",
      "I am built entirely on water with no cars—only gondola boats!"
    ],
    cluesAlt2: [
      "I'm a city where water replaces roads.",
      "I'm built across many small islands in a lagoon.",
      "Gondolas glide beneath the Rialto Bridge."
    ],
    didYouKnow: "Venice is built on 118 small islands held together by bridges!",
    badge: "🗼 Wonders Hunter",
    missionLinked: "🗼 Wonders Hunter",
    secondaryBadge: "🎭 Cultural Voyager",
    secondaryMissionLinked: "🎭 Cultural Voyager",
    missionReward: "+2⭐",
    population: "261,000",
    currency: "Euro (€)",
    language: "Italian",
    mapCoordinates: { x: 50, y: 45 },
    greetingAudio: "Ciao",
    landmarkIcon: "🚣"
  },
  {
    id: "dq_kyoto",
    type: "Location",
    city: "Kyoto",
    country: "Japan",
    continent: "Asia",
    flagUrl: "https://flagcdn.com/w320/jp.png",
    bandColor: "Yellow",
    clues: [
      "I was an imperial capital for more than 1000 years.",
      "I am famous for thousands of red gates leading up a mountain."
    ],
    cluesAlt: [
      "I am on the biggest continent in the world with ancient temples.",
      "My country has a flag with a red circle and invented sushi and origami.",
      "I have thousands of red gates at Fushimi Inari Shrine!"
    ],
    cluesAlt2: [
      "I'm an old city known for tradition and temples.",
      "Thousands of red gates form a path up a wooded hillside.",
      "This torii tunnel is one of the most photographed sights in Asia."
    ],
    didYouKnow: "Kyoto has over 1,600 temples!",
    badge: "🧭 Time Traveler",
    missionLinked: "🧭 Time Traveler",
    secondaryBadge: "🎭 Cultural Voyager",
    secondaryMissionLinked: "🎭 Cultural Voyager",
    missionReward: "+2⭐",
    population: "1.5 Million",
    currency: "Yen (¥)",
    language: "Japanese",
    mapCoordinates: { x: 85, y: 45 },
    greetingAudio: "Konnichiwa",
    landmarkIcon: "⛩️"
  },
  {
    id: "dq_barcelona",
    type: "Location",
    city: "Barcelona",
    country: "Spain",
    continent: "Europe",
    flagUrl: "https://flagcdn.com/w320/es.png",
    bandColor: "Purple",
    clues: [
      "I am a sunny city on the coast of the Mediterranean Sea.",
      "I have a giant church that is still unfinished after 100 years!"
    ],
    cluesAlt: [
      "I am on the continent where olive trees grow and people love soccer.",
      "My country is famous for flamenco dancing and bullfighting.",
      "I have a giant unfinished church called the Sagrada Familia!"
    ],
    cluesAlt2: [
      "I'm a lively Mediterranean city known for bold design.",
      "A towering basilica is still being built after more than a century.",
      "The Sagrada Família is my unmistakable symbol."
    ],
    didYouKnow: "There are no corners on the street blocks in this city!",
    badge: "🎭 Cultural Voyager",
    missionLinked: "🎭 Cultural Voyager",
    missionReward: "+2⭐",
    population: "1.6 Million",
    currency: "Euro (€)",
    language: "Spanish/Catalan",
    mapCoordinates: { x: 45, y: 50 },
    greetingAudio: "Hola",
    landmarkIcon: "🦎"
  },
  {
    id: "dq_honolulu",
    type: "Location",
    city: "Honolulu",
    country: "USA",
    continent: "North America",
    flagUrl: "https://flagcdn.com/w320/us.png",
    bandColor: "Red",
    clues: [
      "I am located on a tropical island in the Pacific Ocean.",
      "I am famous for surfing, hula dancing, and flower necklaces."
    ],
    cluesAlt: [
      "I am on the continent where the Grand Canyon and Great Lakes are found.",
      "My country has 50 states and a flag with stars and stripes.",
      "I am on a volcanic island famous for surfing and hula dancing!"
    ],
    cluesAlt2: [
      "I'm a major city on remote Pacific islands.",
      "A famous beach neighborhood is a global vacation symbol.",
      "A volcanic crater called Diamond Head rises nearby."
    ],
    didYouKnow: "I am the only US city with a royal palace!",
    badge: "🌋 Thrill Trekker",
    missionLinked: "🌋 Thrill Trekker",
    secondaryBadge: "🌿 Eco Explorer",
    secondaryMissionLinked: "🌿 Eco Explorer",
    missionReward: "+2⭐",
    population: "350,000",
    currency: "US Dollar ($)",
    language: "English",
    mapCoordinates: { x: 5, y: 55 },
    greetingAudio: "Aloha",
    landmarkIcon: "🌺"
  },
  {
    id: "dq_reykjavik",
    type: "Location",
    city: "Reykjavik",
    country: "Iceland",
    continent: "Europe",
    flagUrl: "https://flagcdn.com/w320/is.png",
    bandColor: "Purple",
    clues: [
      "I am the most northern capital city in the world.",
      "I am in a land of 'Fire and Ice' with volcanoes and glaciers."
    ],
    cluesAlt: [
      "I am on a continent with many different countries and languages.",
      "My country is called the Land of Fire and Ice with geysers and glaciers.",
      "I am the world's most northern capital city!"
    ],
    cluesAlt2: [
      "I'm a small northern capital surrounded by dramatic nature.",
      "Warm water and steam rise from the ground around me.",
      "A tall church with a stepped façade watches over my skyline."
    ],
    didYouKnow: "There are no mosquitoes in this entire country!",
    badge: "🌿 Eco Explorer",
    missionLinked: "🌿 Eco Explorer",
    missionReward: "+2⭐",
    population: "130,000",
    currency: "Krona (ISK)",
    language: "Icelandic",
    mapCoordinates: { x: 30, y: 20 },
    greetingAudio: "Halló",
    landmarkIcon: "🌋"
  },
  {
    id: "dq_cusco",
    type: "Location",
    city: "Cusco",
    country: "Peru",
    continent: "South America",
    flagUrl: "https://flagcdn.com/w320/pe.png",
    bandColor: "Green",
    clues: [
      "I was the capital of the ancient Inca Empire.",
      "I am the gateway to a famous lost city in the clouds."
    ],
    cluesAlt: [
      "I am on the continent with the Amazon Rainforest and Andes Mountains.",
      "My country is home to Machu Picchu and llamas in the highlands.",
      "I was the ancient capital of the Inca Empire high in the mountains!"
    ],
    cluesAlt2: [
      "I'm a mountain city with ancient stone streets.",
      "Perfectly fitted stone walls from a powerful empire remain here.",
      "Many travelers pass through me on the way to Machu Picchu."
    ],
    didYouKnow: "The stone walls here are built without any cement!",
    badge: "🧭 Time Traveler",
    missionLinked: "🧭 Time Traveler",
    secondaryBadge: "🗼 Wonders Hunter",
    secondaryMissionLinked: "🗼 Wonders Hunter",
    missionReward: "+2⭐",
    population: "428,000",
    currency: "Sol (S/)",
    language: "Spanish",
    mapCoordinates: { x: 30, y: 70 },
    greetingAudio: "Hola",
    landmarkIcon: "🦙"
  },

  // ========== NEW EUROPE CITIES ==========
  {
    id: "dq_prague",
    type: "Location",
    city: "Prague",
    country: "Czech Republic",
    continent: "Europe",
    flagUrl: "https://flagcdn.com/w320/cz.png",
    bandColor: "Purple",
    clues: [
      "I have a famous bridge with 30 statues standing guard on it.",
      "I am called the 'City of a Hundred Spires' because of all my towers."
    ],
    cluesAlt: [
      "I am on the continent where castles and cathedrals dot the landscape.",
      "My country is in Central Europe and famous for its crystal glass.",
      "I am called the 'City of a Hundred Spires' with a famous statue bridge!"
    ],
    cluesAlt2: [
      "I'm a medieval city of bridges and spires.",
      "A clock show has been performed here for centuries in the main square.",
      "My Astronomical Clock draws crowds every hour."
    ],
    didYouKnow: "Prague Castle is one of the largest castle complexes in the world!",
    badge: "🧭 Time Traveler",
    missionLinked: "🧭 Time Traveler",
    missionReward: "+2⭐",
    population: "1.3 Million",
    currency: "Czech Koruna (Kč)",
    language: "Czech",
    mapCoordinates: { x: 52, y: 38 },
    greetingAudio: "Ahoj",
    landmarkIcon: "🏰"
  },
  {
    id: "dq_vienna",
    type: "Location",
    city: "Vienna",
    country: "Austria",
    continent: "Europe",
    flagUrl: "https://flagcdn.com/w320/at.png",
    bandColor: "Purple",
    clues: [
      "Mozart and Beethoven both lived and made music here.",
      "I am famous for beautiful palaces and yummy chocolate cake."
    ],
    cluesAlt: [
      "I am on the continent where classical music was born.",
      "My country is in the Alps and famous for skiing and waltzing.",
      "Mozart and Beethoven made music here—home of the famous Sachertorte cake!"
    ],
    cluesAlt2: [
      "I'm an elegant city long tied to classical music.",
      "Grand ballrooms and waltzes are part of my identity.",
      "A famous New Year's classical concert is broadcast from my main hall."
    ],
    didYouKnow: "Vienna invented the croissant!",
    badge: "🎭 Cultural Voyager",
    missionLinked: "🎭 Cultural Voyager",
    secondaryBadge: "🍜 Taste Trailblazer",
    secondaryMissionLinked: "🍜 Taste Trailblazer",
    missionReward: "+2⭐",
    population: "1.9 Million",
    currency: "Euro (€)",
    language: "German",
    mapCoordinates: { x: 54, y: 42 },
    greetingAudio: "Grüß Gott",
    landmarkIcon: "🎻"
  },
  {
    id: "dq_edinburgh",
    type: "Location",
    city: "Edinburgh",
    country: "United Kingdom",
    continent: "Europe",
    flagUrl: "https://flagcdn.com/w320/gb-sct.png",
    bandColor: "Purple",
    clues: [
      "I am built on seven volcanic hills in Scotland.",
      "I have a giant castle sitting on a rock in the middle of the city."
    ],
    cluesAlt: [
      "I am on an island nation that is part of Europe.",
      "My country has bagpipes, kilts, and the Loch Ness Monster legend.",
      "I have a castle on a volcanic rock where Harry Potter was partly inspired!"
    ],
    cluesAlt2: [
      "I'm a historic city shaped by volcanic land.",
      "A fortress dominates my skyline above an ancient main street.",
      "My castle sits on an extinct volcano above the Royal Mile."
    ],
    didYouKnow: "JK Rowling wrote Harry Potter in cafes here!",
    badge: "🧭 Time Traveler",
    missionLinked: "🧭 Time Traveler",
    missionReward: "+2⭐",
    population: "530,000",
    currency: "Pound Sterling (£)",
    language: "English/Scots Gaelic",
    mapCoordinates: { x: 26, y: 35 },
    greetingAudio: "Hello",
    landmarkIcon: "🏴󠁧󠁢󠁳󠁣󠁴󠁿"
  },
  {
    id: "dq_lisbon",
    type: "Location",
    city: "Lisbon",
    country: "Portugal",
    continent: "Europe",
    flagUrl: "https://flagcdn.com/w320/pt.png",
    bandColor: "Purple",
    clues: [
      "I am the westernmost capital city in mainland Europe.",
      "I have colorful trams that climb steep hills near the ocean."
    ],
    cluesAlt: [
      "I am on the continent where explorers set sail to discover new lands.",
      "My country once had a huge empire and speaks Portuguese.",
      "I am the westernmost capital in mainland Europe with vintage yellow trams!"
    ],
    cluesAlt2: [
      "I'm a coastal capital built on steep hills.",
      "Old trams climb my narrow streets with rattling charm.",
      "A riverside tower in Belém guards my historic waterfront."
    ],
    didYouKnow: "Lisbon is older than Rome by 400 years!",
    badge: "🧭 Time Traveler",
    missionLinked: "🧭 Time Traveler",
    missionReward: "+2⭐",
    population: "545,000",
    currency: "Euro (€)",
    language: "Portuguese",
    mapCoordinates: { x: 20, y: 58 },
    greetingAudio: "Olá",
    landmarkIcon: "🚃"
  },
  {
    id: "dq_budapest",
    type: "Location",
    city: "Budapest",
    country: "Hungary",
    continent: "Europe",
    flagUrl: "https://flagcdn.com/w320/hu.png",
    bandColor: "Purple",
    clues: [
      "A big river splits me into two cities: Buda and Pest.",
      "I have giant thermal baths where people swim outdoors all year."
    ],
    cluesAlt: [
      "I am on the continent crossed by the Danube River.",
      "My country is famous for paprika spice and goulash stew.",
      "I am actually two cities—Buda and Pest—joined by beautiful bridges!"
    ],
    cluesAlt2: [
      "I'm a European city split by a major river.",
      "Two old halves joined to form one city.",
      "Thermal baths and a chain bridge are classic clues to me."
    ],
    didYouKnow: "Budapest has the second oldest metro line in the world!",
    badge: "🧭 Time Traveler",
    missionLinked: "🧭 Time Traveler",
    missionReward: "+2⭐",
    population: "1.8 Million",
    currency: "Forint (Ft)",
    language: "Hungarian",
    mapCoordinates: { x: 58, y: 43 },
    greetingAudio: "Szia",
    landmarkIcon: "🏊"
  },
  {
    id: "dq_stockholm",
    type: "Location",
    city: "Stockholm",
    country: "Sweden",
    continent: "Europe",
    flagUrl: "https://flagcdn.com/w320/se.png",
    bandColor: "Purple",
    clues: [
      "I am built on 14 different islands connected by bridges.",
      "I am where the Nobel Prize is given out every year."
    ],
    cluesAlt: [
      "I am on the continent where the Northern Lights dance in the sky.",
      "My country is home to IKEA furniture and Swedish meatballs.",
      "I am built on 14 islands and host the Nobel Prize ceremony!"
    ],
    cluesAlt2: [
      "I'm a northern capital where water is everywhere.",
      "My city stretches across many islands connected by bridges.",
      "My old town is a postcard of narrow lanes and waterfront squares."
    ],
    didYouKnow: "Stockholm's old town has buildings from the 1200s!",
    badge: "🎭 Cultural Voyager",
    missionLinked: "🎭 Cultural Voyager",
    missionReward: "+2⭐",
    population: "980,000",
    currency: "Swedish Krona (kr)",
    language: "Swedish",
    mapCoordinates: { x: 56, y: 28 },
    greetingAudio: "Hej",
    landmarkIcon: "🌊"
  },
  {
    id: "dq_copenhagen",
    type: "Location",
    city: "Copenhagen",
    country: "Denmark",
    continent: "Europe",
    flagUrl: "https://flagcdn.com/w320/dk.png",
    bandColor: "Purple",
    clues: [
      "I am a bike-friendly capital in the country where LEGO was invented!",
      "I have a famous statue of a little mermaid sitting by the sea."
    ],
    cluesAlt: [
      "I'm on a continent of old castles, fairy tales, and cozy winters.",
      "My country is known for bikes, fairy tales, and a famous toy brick loved worldwide.",
      "I have a Little Mermaid statue sitting by the harbor."
    ],
    cluesAlt2: [
      "I'm a harbor city with fairy-tale energy.",
      "A small mermaid statue sits by the water.",
      "Colorful Nyhavn buildings line my canal-front."
    ],
    didYouKnow: "Copenhagen has more bikes than people!",
    badge: "🎭 Cultural Voyager",
    missionLinked: "🎭 Cultural Voyager",
    missionReward: "+2⭐",
    population: "650,000",
    currency: "Danish Krone (kr)",
    language: "Danish",
    mapCoordinates: { x: 50, y: 32 },
    greetingAudio: "Hej",
    landmarkIcon: "🧜‍♀️"
  },
  {
    id: "dq_dublin",
    type: "Location",
    city: "Dublin",
    country: "Ireland",
    continent: "Europe",
    flagUrl: "https://flagcdn.com/w320/ie.png",
    bandColor: "Purple",
    clues: [
      "I am on a green island famous for leprechauns and four-leaf clovers.",
      "My country celebrates St. Patrick's Day with a big parade."
    ],
    cluesAlt: [
      "I am on a green island in the Atlantic Ocean near Britain.",
      "My country is famous for shamrocks, leprechauns, and St. Patrick's Day.",
      "I was founded by Vikings and have a famous Book of Kells!"
    ],
    cluesAlt2: [
      "I'm a lively capital where storytelling runs deep.",
      "A river divides my center into two sides.",
      "A famous dark stout brewery experience is one of my top stops."
    ],
    didYouKnow: "Dublin was founded by Vikings over 1,000 years ago!",
    badge: "🎭 Cultural Voyager",
    missionLinked: "🎭 Cultural Voyager",
    missionReward: "+2⭐",
    population: "550,000",
    currency: "Euro (€)",
    language: "English/Irish",
    mapCoordinates: { x: 22, y: 40 },
    greetingAudio: "Dia duit",
    landmarkIcon: "☘️"
  },
  {
    id: "dq_florence",
    type: "Location",
    city: "Florence",
    country: "Italy",
    continent: "Europe",
    flagUrl: "https://flagcdn.com/w320/it.png",
    bandColor: "Purple",
    clues: [
      "I am where the Renaissance began with famous artists like Michelangelo.",
      "I have a huge dome on my cathedral that was built 600 years ago."
    ],
    cluesAlt: [
      "I am on the continent where the Renaissance art movement began.",
      "My country is shaped like a boot and gave the world gelato ice cream.",
      "I am the birthplace of the Renaissance with Michelangelo's David statue!"
    ],
    cluesAlt2: [
      "I'm a city where art and ideas changed history.",
      "A massive dome crowns my skyline.",
      "A statue of David is one of my best-known treasures."
    ],
    didYouKnow: "Florence has more art per square mile than any other city in the world!",
    badge: "🎭 Cultural Voyager",
    missionLinked: "🎭 Cultural Voyager",
    missionReward: "+2⭐",
    population: "380,000",
    currency: "Euro (€)",
    language: "Italian",
    mapCoordinates: { x: 48, y: 45 },
    greetingAudio: "Ciao",
    landmarkIcon: "🎨"
  },
  {
    id: "dq_oslo",
    type: "Location",
    city: "Oslo",
    country: "Norway",
    continent: "Europe",
    flagUrl: "https://flagcdn.com/w320/no.png",
    bandColor: "Purple",
    clues: [
      "I am the capital where Vikings used to live long ago.",
      "I have a famous museum with old Viking ships you can see."
    ],
    cluesAlt: [
      "I am on the continent with stunning fjords carved by glaciers.",
      "My country has beautiful fjords and gives out the Nobel Peace Prize.",
      "I have a museum with real Viking ships that are over 1,000 years old!"
    ],
    cluesAlt2: [
      "I'm a northern capital surrounded by forests and fjords.",
      "A global peace ceremony is held here every year.",
      "A modern opera house with a walkable roof sits by my waterfront."
    ],
    didYouKnow: "Oslo gives a giant Christmas tree to London every year as a thank you gift!",
    badge: "🌿 Eco Explorer",
    missionLinked: "🌿 Eco Explorer",
    missionReward: "+2⭐",
    population: "700,000",
    currency: "Norwegian Krone (kr)",
    language: "Norwegian",
    mapCoordinates: { x: 48, y: 32 },
    greetingAudio: "Hei",
    landmarkIcon: "⛵"
  },

  // ========== NEW NORTH AMERICA CITIES ==========
  {
    id: "dq_washington_dc",
    type: "Location",
    city: "Washington D.C.",
    country: "USA",
    continent: "North America",
    flagUrl: "https://flagcdn.com/w320/us.png",
    bandColor: "Red",
    clues: [
      "I am the capital of the United States where the President lives.",
      "I have a tall white monument that looks like a giant pencil."
    ],
    cluesAlt: [
      "I am on the continent between the Atlantic and Pacific Oceans.",
      "My country has 50 states and the most powerful elected leader.",
      "I am where the White House and a tall monument like a pencil stand!"
    ],
    cluesAlt2: [
      "I'm a planned capital with grand monuments and wide avenues.",
      "A long grassy corridor forms the heart of my landmark district.",
      "The White House and Lincoln Memorial anchor that central stretch."
    ],
    didYouKnow: "The White House has 132 rooms and 35 bathrooms!",
    badge: "🗼 Wonders Hunter",
    missionLinked: "🗼 Wonders Hunter",
    secondaryBadge: "🧭 Time Traveler",
    secondaryMissionLinked: "🧭 Time Traveler",
    missionReward: "+2⭐",
    population: "700,000",
    currency: "US Dollar ($)",
    language: "English",
    mapCoordinates: { x: 25, y: 48 },
    greetingAudio: "Hello",
    landmarkIcon: "🏛️"
  },
  {
    id: "dq_miami",
    type: "Location",
    city: "Miami",
    country: "USA",
    continent: "North America",
    flagUrl: "https://flagcdn.com/w320/us.png",
    bandColor: "Red",
    clues: [
      "I am a sunny beach city where many people speak Spanish.",
      "I am famous for palm trees, colorful art deco buildings, and alligators nearby."
    ],
    cluesAlt: [
      "I am on the continent with the Everglades swamps and Caribbean beaches.",
      "My country stretches from sea to shining sea with 50 states.",
      "I have colorful art deco buildings and alligators in nearby swamps!"
    ],
    cluesAlt2: [
      "I'm a warm oceanfront city built for sun and nightlife.",
      "Pastel Art Deco buildings line my most famous beachfront area.",
      "South Beach is the postcard view."
    ],
    didYouKnow: "Miami is the only US city founded by a woman!",
    badge: "🎭 Cultural Voyager",
    missionLinked: "🎭 Cultural Voyager",
    secondaryBadge: "🌿 Eco Explorer",
    secondaryMissionLinked: "🌿 Eco Explorer",
    missionReward: "+2⭐",
    population: "450,000",
    currency: "US Dollar ($)",
    language: "English/Spanish",
    mapCoordinates: { x: 22, y: 62 },
    greetingAudio: "Hello",
    landmarkIcon: "🌴"
  },
  {
    id: "dq_boston",
    type: "Location",
    city: "Boston",
    country: "USA",
    continent: "North America",
    flagUrl: "https://flagcdn.com/w320/us.png",
    bandColor: "Red",
    clues: [
      "I am where the famous Tea Party happened before America became a country.",
      "I have one of the oldest universities in the United States—Harvard."
    ],
    cluesAlt: [
      "I am on the continent where the American Revolution began.",
      "My country declared independence on July 4th, 1776.",
      "I hosted the famous Tea Party and am home to Harvard University!"
    ],
    cluesAlt2: [
      "I'm an old coastal city with early-history roots.",
      "A marked walking route connects key revolutionary-era sites.",
      "That path is known as the Freedom Trail."
    ],
    didYouKnow: "Boston has the oldest public park in America!",
    badge: "🧭 Time Traveler",
    missionLinked: "🧭 Time Traveler",
    missionReward: "+2⭐",
    population: "675,000",
    currency: "US Dollar ($)",
    language: "English",
    mapCoordinates: { x: 28, y: 44 },
    greetingAudio: "Hello",
    landmarkIcon: "🍵"
  },
  {
    id: "dq_seattle",
    type: "Location",
    city: "Seattle",
    country: "USA",
    continent: "North America",
    flagUrl: "https://flagcdn.com/w320/us.png",
    bandColor: "Red",
    clues: [
      "I am known as the rainy city near snowy mountains.",
      "I have a pointy tower called the Space Needle and invented Starbucks coffee."
    ],
    cluesAlt: [
      "I am on the continent with the Rocky Mountains and Pacific Northwest forests.",
      "My country is home to tech giants and coffee culture.",
      "I have the Space Needle tower and the very first Starbucks!"
    ],
    cluesAlt2: [
      "I'm a coastal city known for drizzle and evergreens.",
      "Water and mountains frame my views from many neighborhoods.",
      "A futuristic tower called the Space Needle defines my skyline."
    ],
    didYouKnow: "Seattle throws fish at a famous market!",
    badge: "🎭 Cultural Voyager",
    missionLinked: "🎭 Cultural Voyager",
    missionReward: "+2⭐",
    population: "750,000",
    currency: "US Dollar ($)",
    language: "English",
    mapCoordinates: { x: 8, y: 42 },
    greetingAudio: "Hello",
    landmarkIcon: "🗼"
  },
  {
    id: "dq_montreal",
    type: "Location",
    city: "Montreal",
    country: "Canada",
    continent: "North America",
    flagUrl: "https://flagcdn.com/w320/ca.png",
    bandColor: "Red",
    clues: [
      "I am a Canadian city where most people speak French.",
      "I have the world's largest underground city to escape cold winters."
    ],
    cluesAlt: [
      "I am on the continent with the maple leaf nation and frozen winters.",
      "My country has two official languages: English and French.",
      "I am a French-speaking city with the world's largest underground network!"
    ],
    cluesAlt2: [
      "I'm a big city where French is heard everywhere.",
      "I'm built around a hill called Mount Royal.",
      "Stone streets and a grand old basilica define my historic district."
    ],
    didYouKnow: "Montreal hosts the largest jazz festival in the world!",
    badge: "🎭 Cultural Voyager",
    missionLinked: "🎭 Cultural Voyager",
    missionReward: "+2⭐",
    population: "1.8 Million",
    currency: "Canadian Dollar ($)",
    language: "French",
    mapCoordinates: { x: 26, y: 38 },
    greetingAudio: "Bonjour",
    landmarkIcon: "🎷"
  },
  {
    id: "dq_havana",
    type: "Location",
    city: "Havana",
    country: "Cuba",
    continent: "North America",
    flagUrl: "https://flagcdn.com/w320/cu.png",
    bandColor: "Red",
    clues: [
      "I am a colorful Caribbean city with old vintage cars everywhere.",
      "My streets are filled with salsa music and beautiful Spanish buildings."
    ],
    cluesAlt: [
      "I am on an island in the Caribbean Sea with tropical beaches.",
      "My country is famous for cigars, salsa dancing, and classic cars.",
      "I have colorful streets full of 1950s vintage cars and salsa music!"
    ],
    cluesAlt2: ["I'm a colorful Caribbean capital known for music and seaside views.", "Vintage American cars from the 1950s are still common on my streets.", "My Malecón seawall stretches along the coast beside pastel colonial buildings."],
    didYouKnow: "Havana has one of the oldest cathedrals in the Americas!",
    badge: "🎭 Cultural Voyager",
    missionLinked: "🎭 Cultural Voyager",
    missionReward: "+2⭐",
    population: "2.1 Million",
    currency: "Cuban Peso (₱)",
    language: "Spanish",
    mapCoordinates: { x: 20, y: 58 },
    greetingAudio: "Hola",
    landmarkIcon: "🚗"
  },
  {
    id: "dq_panama_city",
    type: "Location",
    city: "Panama City",
    country: "Panama",
    continent: "North America",
    flagUrl: "https://flagcdn.com/w320/pa.png",
    bandColor: "Red",
    clues: [
      "I have a famous canal where ships go between two oceans.",
      "My famous canal connects the Atlantic and Pacific oceans!"
    ],
    cluesAlt: [
      "I am on the skinny land bridge connecting North and South America.",
      "My country has a famous canal that saves ships a 7,000-mile journey.",
      "I am next to the canal that lets ships sail between two oceans!"
    ],
    cluesAlt2: ["I'm a coastal capital positioned between two great oceans.", "A massive canal connecting the Atlantic and Pacific begins near me.", "Ships pass through giant locks that made global trade faster."],
    didYouKnow: "The Panama Canal saves ships a 7,000-mile journey!",
    badge: "🗼 Wonders Hunter",
    missionLinked: "🗼 Wonders Hunter",
    missionReward: "+2⭐",
    population: "880,000",
    currency: "US Dollar/Balboa",
    language: "Spanish",
    mapCoordinates: { x: 22, y: 70 },
    greetingAudio: "Hola",
    landmarkIcon: "🚢"
  },
  {
    id: "dq_guadalajara",
    type: "Location",
    city: "Guadalajara",
    country: "Mexico",
    continent: "North America",
    flagUrl: "https://flagcdn.com/w320/mx.png",
    bandColor: "Red",
    clues: [
      "I am the birthplace of mariachi music with guitars and trumpets.",
      "I am one of Mexico's biggest cities, famous for making tequila nearby."
    ],
    cluesAlt: [
      "I am on the continent where ancient Aztec and Mayan empires thrived.",
      "My country has a flag with an eagle eating a snake on a cactus.",
      "I am the birthplace of mariachi music and tequila is made nearby!"
    ],
    cluesAlt2: ["I'm a large inland city known for tradition and celebration.", "Mariachi music and tequila culture are strongly tied to me.", "A twin-spired cathedral rises in my historic center."],
    didYouKnow: "Guadalajara means 'river that runs between rocks'!",
    badge: "🍜 Taste Trailblazer",
    missionLinked: "🍜 Taste Trailblazer",
    secondaryBadge: "🎭 Cultural Voyager",
    secondaryMissionLinked: "🎭 Cultural Voyager",
    missionReward: "+2⭐",
    population: "1.5 Million",
    currency: "Mexican Peso ($)",
    language: "Spanish",
    mapCoordinates: { x: 12, y: 56 },
    greetingAudio: "Hola",
    landmarkIcon: "🎺"
  },
  {
    id: "dq_san_diego",
    type: "Location",
    city: "San Diego",
    country: "USA",
    continent: "North America",
    flagUrl: "https://flagcdn.com/w320/us.png",
    bandColor: "Red",
    clues: [
      "I am a sunny California city right next to Mexico.",
      "I have a famous zoo with pandas and a huge aircraft carrier museum."
    ],
    cluesAlt: [
      "I am on the continent with sunny California beaches.",
      "My country borders both Canada and Mexico.",
      "I have a world-famous zoo with pandas right next to the Mexican border!"
    ],
    cluesAlt2: ["I'm a sunny coastal city near an international border.", "A massive park filled with museums and a famous zoo sits in my heart.", "The USS Midway aircraft carrier museum rests in my harbor."],
    didYouKnow: "San Diego has the best weather in America with 266 sunny days a year!",
    badge: "🌿 Eco Explorer",
    missionLinked: "🌿 Eco Explorer",
    missionReward: "+2⭐",
    population: "1.4 Million",
    currency: "US Dollar ($)",
    language: "English/Spanish",
    mapCoordinates: { x: 10, y: 48 },
    greetingAudio: "Hello",
    landmarkIcon: "🦁"
  },
  {
    id: "dq_kingston",
    type: "Location",
    city: "Kingston",
    country: "Jamaica",
    continent: "North America",
    flagUrl: "https://flagcdn.com/w320/jm.png",
    bandColor: "Red",
    clues: [
      "I am the capital of a Caribbean island famous for reggae music.",
      "Bob Marley, the most famous reggae singer ever, lived here."
    ],
    cluesAlt: [
      "I am on a tropical island in the Caribbean Sea.",
      "My country gave the world reggae music and the fastest sprinters.",
      "I am where Bob Marley lived and reggae music was born!"
    ],
    cluesAlt2: ["I'm a Caribbean capital city set against a backdrop of mountains.", "Reggae music is deeply connected to my identity.", "The Blue Mountains rise just beyond my skyline."],
    didYouKnow: "Jamaica is where the fastest person ever, Usain Bolt, comes from!",
    badge: "🎭 Cultural Voyager",
    missionLinked: "🎭 Cultural Voyager",
    missionReward: "+2⭐",
    population: "670,000",
    currency: "Jamaican Dollar ($)",
    language: "English/Patois",
    mapCoordinates: { x: 24, y: 58 },
    greetingAudio: "Wah gwaan",
    landmarkIcon: "🎸"
  },

  // ========== NEW ASIA CITIES ==========
  {
    id: "dq_hong_kong",
    type: "Location",
    city: "Hong Kong",
    country: "China",
    continent: "Asia",
    flagUrl: "https://flagcdn.com/w320/hk.png",
    bandColor: "Yellow",
    clues: [
      "I am one of the world's skyscraper capitals with a stunning skyline!",
      "I am famous for dim sum dumplings and a giant Buddha statue."
    ],
    cluesAlt: [
      "I am on the continent with the Great Wall and pandas.",
      "My region was once British and now part of China.",
      "I have one of the world's most stunning skyscraper skylines and dim sum!"
    ],
    cluesAlt2: ["I'm a dense harbor city filled with towering skyscrapers.", "I operate under a \"one country, two systems\" principle.", "Victoria Harbour separates my skyline from a famous island peak."],
    didYouKnow: "Hong Kong means 'fragrant harbor'!",
    badge: "🎭 Cultural Voyager",
    missionLinked: "🎭 Cultural Voyager",
    secondaryBadge: "🗼 Wonders Hunter",
    secondaryMissionLinked: "🗼 Wonders Hunter",
    missionReward: "+2⭐",
    population: "7.5 Million",
    currency: "Hong Kong Dollar ($)",
    language: "Cantonese/English",
    mapCoordinates: { x: 82, y: 58 },
    greetingAudio: "你好",
    landmarkIcon: "🏙️"
  },
  {
    id: "dq_taipei",
    type: "Location",
    city: "Taipei",
    country: "Taiwan",
    continent: "Asia",
    flagUrl: "https://flagcdn.com/w320/tw.png",
    bandColor: "Yellow",
    clues: [
      "Bubble tea was invented in Taiwan—and you can find it everywhere here!",
      "I have a super tall tower that used to be the world's tallest."
    ],
    cluesAlt: [
      "I am on an island in the Pacific near China.",
      "My island invented bubble tea and makes computer chips.",
      "I have the Taipei 101 tower that was once the world's tallest!"
    ],
    cluesAlt2: ["I'm a bustling East Asian capital surrounded by mountains.", "A tall green skyscraper once held the title of the world's tallest building.", "Taipei 101 defines my modern skyline."],
    didYouKnow: "Taipei has vending machines that sell hot soup!",
    badge: "🍜 Taste Trailblazer",
    missionLinked: "🍜 Taste Trailblazer",
    missionReward: "+2⭐",
    population: "2.6 Million",
    currency: "Taiwan Dollar (NT$)",
    language: "Mandarin",
    mapCoordinates: { x: 84, y: 54 },
    greetingAudio: "你好",
    landmarkIcon: "🧋"
  },
  {
    id: "dq_hanoi",
    type: "Location",
    city: "Hanoi",
    country: "Vietnam",
    continent: "Asia",
    flagUrl: "https://flagcdn.com/w320/vn.png",
    bandColor: "Yellow",
    clues: [
      "I have a lake in my center with a turtle tower rising from it.",
      "Millions of motorbikes zoom through my busy streets."
    ],
    cluesAlt: [
      "I am on the continent where rice paddies cover the hillsides.",
      "My country is shaped like an 'S' and famous for pho noodle soup.",
      "I have a lake with a turtle tower and millions of motorbikes zooming by!"
    ],
    cluesAlt2: ["I'm a historic Southeast Asian capital with tree-lined boulevards.", "A large lake sits at the center of my old quarter.", "Hoàn Kiếm Lake and its red bridge are iconic here."],
    didYouKnow: "Hanoi is over 1,000 years old!",
    badge: "🧭 Time Traveler",
    missionLinked: "🧭 Time Traveler",
    missionReward: "+2⭐",
    population: "8 Million",
    currency: "Vietnamese Dong (₫)",
    language: "Vietnamese",
    mapCoordinates: { x: 78, y: 56 },
    greetingAudio: "Xin chào",
    landmarkIcon: "🛵"
  },
  {
    id: "dq_osaka",
    type: "Location",
    city: "Osaka",
    country: "Japan",
    continent: "Asia",
    flagUrl: "https://flagcdn.com/w320/jp.png",
    bandColor: "Yellow",
    clues: [
      "I am called 'The Kitchen of the Nation' because of my amazing street food.",
      "I have a castle surrounded by cherry blossom trees."
    ],
    cluesAlt: [
      "I am on the continent where cherry blossoms bloom every spring.",
      "My country has bullet trains and invented instant ramen noodles.",
      "I am called 'The Kitchen of the Nation' with a castle and cherry blossoms!"
    ],
    cluesAlt2: ["I'm a major port city known for bold street food culture.", "A reconstructed castle with white walls and green roofs stands in my center.", "I'm famous for dishes like takoyaki and okonomiyaki."],
    didYouKnow: "Osaka invented instant ramen noodles!",
    badge: "🍜 Taste Trailblazer",
    missionLinked: "🍜 Taste Trailblazer",
    missionReward: "+2⭐",
    population: "2.7 Million",
    currency: "Yen (¥)",
    language: "Japanese",
    mapCoordinates: { x: 86, y: 48 },
    greetingAudio: "Konnichiwa",
    landmarkIcon: "🍜"
  },
  {
    id: "dq_kuala_lumpur",
    type: "Location",
    city: "Kuala Lumpur",
    country: "Malaysia",
    continent: "Asia",
    flagUrl: "https://flagcdn.com/w320/my.png",
    bandColor: "Yellow",
    clues: [
      "I have famous twin towers connected by a sky bridge.",
      "My name means 'muddy confluence' in Malay."
    ],
    cluesAlt: [
      "I am on the continent with tropical rainforests and orangutans.",
      "My country has amazing food mixing Malay, Chinese, and Indian flavors.",
      "I have the Petronas Twin Towers connected by a sky bridge!"
    ],
    cluesAlt2: ["I'm a tropical capital city known for dramatic skyscrapers.", "Two identical towers connected by a skybridge dominate my skyline.", "The Petronas Twin Towers are my most famous landmark."],
    didYouKnow: "The Petronas Towers were the world's tallest for 6 years!",
    badge: "🗼 Wonders Hunter",
    missionLinked: "🗼 Wonders Hunter",
    missionReward: "+2⭐",
    population: "1.8 Million",
    currency: "Ringgit (RM)",
    language: "Malay",
    mapCoordinates: { x: 76, y: 68 },
    greetingAudio: "Selamat",
    landmarkIcon: "🏢"
  },
  {
    id: "dq_manila",
    type: "Location",
    city: "Manila",
    country: "Philippines",
    continent: "Asia",
    flagUrl: "https://flagcdn.com/w320/ph.png",
    bandColor: "Yellow",
    clues: [
      "I am on a group of over 7,000 tropical islands!",
      "I have colorful jeepneys that are decorated like art."
    ],
    cluesAlt: [
      "I am on the continent with over 7,000 tropical islands.",
      "My country loves basketball and has colorful jeepney buses.",
      "I have jeepneys decorated like art rolling through my busy streets!"
    ],
    cluesAlt2: ["I'm a sprawling coastal capital in Southeast Asia.", "A historic walled district from colonial times remains within me.", "Intramuros and Rizal Park are central to my identity."],
    didYouKnow: "Manila is one of the most densely populated cities on Earth!",
    badge: "🎭 Cultural Voyager",
    missionLinked: "🎭 Cultural Voyager",
    missionReward: "+2⭐",
    population: "1.8 Million",
    currency: "Philippine Peso (₱)",
    language: "Filipino/English",
    mapCoordinates: { x: 84, y: 62 },
    greetingAudio: "Kamusta",
    landmarkIcon: "🚐"
  },
  {
    id: "dq_kathmandu",
    type: "Location",
    city: "Kathmandu",
    country: "Nepal",
    continent: "Asia",
    flagUrl: "https://flagcdn.com/w320/np.png",
    bandColor: "Yellow",
    clues: [
      "I am the gateway to climbing Mount Everest, the world's tallest mountain.",
      "My valley has ancient temples with eyes painted on them."
    ],
    cluesAlt: [
      "I am on the continent with the Himalayas, the tallest mountains on Earth.",
      "My country has the only non-rectangular flag in the world.",
      "I am the gateway to Mount Everest with temples that have painted eyes!"
    ],
    cluesAlt2: [
      "I'm a city in a mountain valley near the Himalayas.",
      "A hilltop shrine is nicknamed the \"Monkey Temple.\"",
      "Prayer flags and stupas are part of my everyday skyline."
    ],
    didYouKnow: "Nepal's flag is the only non-rectangular flag in the world!",
    badge: "🧭 Time Traveler",
    missionLinked: "🧭 Time Traveler",
    secondaryBadge: "🌋 Thrill Trekker",
    secondaryMissionLinked: "🌋 Thrill Trekker",
    missionReward: "+2⭐",
    population: "1.4 Million",
    currency: "Nepalese Rupee (Rs)",
    language: "Nepali",
    mapCoordinates: { x: 70, y: 52 },
    greetingAudio: "Namaste",
    landmarkIcon: "🏔️"
  },
  {
    id: "dq_jerusalem",
    type: "Location",
    city: "Jerusalem",
    country: "Israel",
    continent: "Asia",
    flagUrl: "https://flagcdn.com/w320/il.png",
    bandColor: "Yellow",
    clues: [
      "I am a holy city for three different religions.",
      "I have an ancient golden dome that shines in the sun."
    ],
    cluesAlt: [
      "I am on the continent where three major world religions began.",
      "My country has the Dead Sea, the lowest point on Earth.",
      "I am a holy city for three religions with a golden dome!"
    ],
    cluesAlt2: [
      "I'm a sacred city for multiple religions.",
      "Ancient stone walls surround my historic center.",
      "A famous golden dome and an ancient prayer wall stand close together."
    ],
    didYouKnow: "Jerusalem is over 5,000 years old!",
    badge: "🧭 Time Traveler",
    missionLinked: "🧭 Time Traveler",
    missionReward: "+2⭐",
    population: "950,000",
    currency: "Shekel (₪)",
    language: "Hebrew/Arabic",
    mapCoordinates: { x: 58, y: 52 },
    greetingAudio: "Shalom",
    landmarkIcon: "🕍"
  },

  // ========== NEW SOUTH AMERICA CITIES ==========
  {
    id: "dq_quito",
    type: "Location",
    city: "Quito",
    country: "Ecuador",
    continent: "South America",
    flagUrl: "https://flagcdn.com/w320/ec.png",
    bandColor: "Green",
    clues: [
      "I am built in the mountains right on the equator line.",
      "I have a monument where you can stand in two hemispheres at once!"
    ],
    cluesAlt: [
      "I am on the continent crossed by the equator line.",
      "My country is named after the equator and has the Galapagos Islands.",
      "I sit on the equator where you can stand in two hemispheres at once!"
    ],
    cluesAlt2: [
      "I'm a high mountain capital with cool weather year-round.",
      "I sit almost exactly on the equator line.",
      "A nearby monument marks the \"middle of the world.\""
    ],
    didYouKnow: "Quito has the largest historic center in the Americas!",
    badge: "🗼 Wonders Hunter",
    missionLinked: "🗼 Wonders Hunter",
    secondaryBadge: "🌿 Eco Explorer",
    secondaryMissionLinked: "🌿 Eco Explorer",
    missionReward: "+2⭐",
    population: "2.8 Million",
    currency: "US Dollar ($)",
    language: "Spanish",
    mapCoordinates: { x: 22, y: 65 },
    greetingAudio: "Hola",
    landmarkIcon: "🌎"
  },
  {
    id: "dq_cartagena",
    type: "Location",
    city: "Cartagena",
    country: "Colombia",
    continent: "South America",
    flagUrl: "https://flagcdn.com/w320/co.png",
    bandColor: "Green",
    clues: [
      "I am a colorful walled city on the Caribbean coast.",
      "Pirates used to attack me, so I built huge stone walls for protection."
    ],
    cluesAlt: [
      "I am on the continent with Caribbean beaches and coffee farms.",
      "My country produces some of the best coffee in the world.",
      "I am a walled city built to protect against pirates on the Caribbean coast!"
    ],
    cluesAlt2: [
      "I'm a colorful Caribbean coastal city.",
      "My historic center is protected by thick stone walls.",
      "Fortresses and bright balconies are classic clues to me."
    ],
    didYouKnow: "Cartagena's walls took 200 years to build!",
    badge: "🧭 Time Traveler",
    missionLinked: "🧭 Time Traveler",
    missionReward: "+2⭐",
    population: "1 Million",
    currency: "Colombian Peso ($)",
    language: "Spanish",
    mapCoordinates: { x: 24, y: 62 },
    greetingAudio: "Hola",
    landmarkIcon: "🏴‍☠️"
  },
  {
    id: "dq_montevideo",
    type: "Location",
    city: "Montevideo",
    country: "Uruguay",
    continent: "South America",
    flagUrl: "https://flagcdn.com/w320/uy.png",
    bandColor: "Green",
    clues: [
      "I am a capital city where people drink tea from gourds called mate.",
      "I have the longest carnival celebration in the world - 40 days!"
    ],
    cluesAlt: [
      "I am on the continent between Brazil and Argentina.",
      "My country hosted the first ever World Cup in 1930.",
      "I have a 40-day carnival and everyone drinks mate tea from gourds!"
    ],
    cluesAlt2: [
      "I'm a capital by a wide river that looks like the ocean.",
      "A long seaside promenade stretches for miles.",
      "Sunset along the Río de la Plata is a signature scene here."
    ],
    didYouKnow: "Montevideo hosted the first ever World Cup in 1930!",
    badge: "🎭 Cultural Voyager",
    missionLinked: "🎭 Cultural Voyager",
    missionReward: "+2⭐",
    population: "1.8 Million",
    currency: "Uruguayan Peso ($)",
    language: "Spanish",
    mapCoordinates: { x: 34, y: 78 },
    greetingAudio: "Hola",
    landmarkIcon: "🧉"
  },
  {
    id: "dq_la_paz",
    type: "Location",
    city: "La Paz",
    country: "Bolivia",
    continent: "South America",
    flagUrl: "https://flagcdn.com/w320/bo.png",
    bandColor: "Green",
    clues: [
      "I am the highest capital city in the world, way up in the mountains.",
      "I have cable cars that fly over the city like a sky train."
    ],
    cluesAlt: [
      "I am on the continent with the Andes Mountains stretching along it.",
      "My country is landlocked and has the world's largest salt flat.",
      "I am the highest capital in the world with cable cars flying over me!"
    ],
    cluesAlt2: [
      "I'm one of the highest major cities on Earth.",
      "Neighborhoods climb steeply up a bowl-shaped valley.",
      "Cable cars glide above my streets as everyday transit."
    ],
    didYouKnow: "Water boils at a lower temperature here because we're so high up!",
    badge: "🌋 Thrill Trekker",
    missionLinked: "🌋 Thrill Trekker",
    missionReward: "+2⭐",
    population: "2.3 Million",
    currency: "Boliviano (Bs)",
    language: "Spanish",
    mapCoordinates: { x: 28, y: 72 },
    greetingAudio: "Hola",
    landmarkIcon: "🚡"
  },
  {
    id: "dq_medellin",
    type: "Location",
    city: "Medellín",
    country: "Colombia",
    continent: "South America",
    flagUrl: "https://flagcdn.com/w320/co.png",
    bandColor: "Green",
    clues: [
      "I am called the 'City of Eternal Spring' because my weather is always nice.",
      "I have colorful hillside neighborhoods with amazing street art."
    ],
    cluesAlt: [
      "I am on the continent known for eternal spring weather in the mountains.",
      "My country has the Andes, Amazon, and Caribbean all in one.",
      "I am the 'City of Eternal Spring' with colorful hillside street art!"
    ],
    cluesAlt2: [
      "I'm known for spring-like weather in a mountain valley.",
      "Hillside communities connect to the city by modern transit.",
      "Cable cars and outdoor escalators are famous local features."
    ],
    didYouKnow: "Medellín has a river that runs through the middle of the city!",
    badge: "🎭 Cultural Voyager",
    missionLinked: "🎭 Cultural Voyager",
    missionReward: "+2⭐",
    population: "2.5 Million",
    currency: "Colombian Peso ($)",
    language: "Spanish",
    mapCoordinates: { x: 24, y: 64 },
    greetingAudio: "Hola",
    landmarkIcon: "🌸"
  },
  {
    id: "dq_sao_paulo",
    type: "Location",
    city: "São Paulo",
    country: "Brazil",
    continent: "South America",
    flagUrl: "https://flagcdn.com/w320/br.png",
    bandColor: "Green",
    clues: [
      "I am the biggest city in South America with over 12 million people!",
      "I have more helicopters flying around than almost any other city."
    ],
    cluesAlt: [
      "I am on the continent with the Amazon River, the largest river by volume.",
      "My country speaks Portuguese and loves soccer passionately.",
      "I am South America's biggest city with helicopters flying everywhere!"
    ],
    cluesAlt2: [
      "I'm a massive inland megacity with endless neighborhoods.",
      "I'm the largest metro area in South America by population.",
      "Avenida Paulista is my most iconic boulevard."
    ],
    didYouKnow: "São Paulo has more Japanese people than any city outside Japan!",
    badge: "🎭 Cultural Voyager",
    missionLinked: "🎭 Cultural Voyager",
    missionReward: "+2⭐",
    population: "12.3 Million",
    currency: "Brazilian Real (R$)",
    language: "Portuguese",
    mapCoordinates: { x: 36, y: 74 },
    greetingAudio: "Olá",
    landmarkIcon: "🚁"
  },
  {
    id: "dq_punta_cana",
    type: "Location",
    city: "Punta Cana",
    country: "Dominican Republic",
    continent: "North America",
    flagUrl: "https://flagcdn.com/w320/do.png",
    bandColor: "Red",
    clues: [
      "I am a tropical beach paradise in the Caribbean Sea.",
      "I have white sand beaches and palm trees everywhere you look."
    ],
    cluesAlt: [
      "I am on a tropical island in the Caribbean with clear blue waters.",
      "My country shares an island with Haiti and loves baseball.",
      "I am a beach paradise with white sand and palm trees everywhere!"
    ],
    cluesAlt2: [
      "I'm a beach destination known for palm-lined resorts.",
      "Long white-sand coastlines define my shoreline.",
      "Bávaro Beach is the name travelers associate with me."
    ],
    didYouKnow: "Punta Cana means 'tip of the white cane reeds' in Spanish!",
    badge: "🌿 Eco Explorer",
    missionLinked: "🌿 Eco Explorer",
    missionReward: "+2⭐",
    population: "100,000",
    currency: "Dominican Peso (RD$)",
    language: "Spanish",
    mapCoordinates: { x: 28, y: 58 },
    greetingAudio: "Hola",
    landmarkIcon: "🏖️"
  },

  // ========== NEW AFRICA CITIES ==========
  {
    id: "dq_casablanca",
    type: "Location",
    city: "Casablanca",
    country: "Morocco",
    continent: "Africa",
    flagUrl: "https://flagcdn.com/w320/ma.png",
    bandColor: "Orange",
    clues: [
      "My name means 'white house' in Spanish!",
      "I have one of the biggest mosques in Africa, right by the ocean."
    ],
    cluesAlt: [
      "I am on the continent closest to Europe across a strait.",
      "My country has the Sahara Desert and colorful souks.",
      "My name means 'white house' and I have a giant seaside mosque!"
    ],
    cluesAlt2: [
      "I'm a major Atlantic coastal city.",
      "A massive mosque stands partly over the ocean.",
      "Its towering minaret is one of the tallest on Earth."
    ],
    didYouKnow: "Casablanca is Morocco's largest city and economic capital!",
    badge: "🎭 Cultural Voyager",
    missionLinked: "🎭 Cultural Voyager",
    missionReward: "+2⭐",
    population: "3.7 Million",
    currency: "Moroccan Dirham (DH)",
    language: "Arabic/French",
    mapCoordinates: { x: 32, y: 52 },
    greetingAudio: "Salam",
    landmarkIcon: "🕌"
  },
  {
    id: "dq_accra",
    type: "Location",
    city: "Accra",
    country: "Ghana",
    continent: "Africa",
    flagUrl: "https://flagcdn.com/w320/gh.png",
    bandColor: "Orange",
    clues: [
      "I am a busy city on the Gold Coast of West Africa.",
      "I am famous for colorful kente cloth woven by hand."
    ],
    cluesAlt: [
      "I'm on a continent with big drums, bright markets, and sunny coasts.",
      "My country was the first in sub-Saharan Africa to gain independence (1957).",
      "I'm a coastal capital where you'll see colorful kente cloth and lively street life."
    ],
    cluesAlt2: [
      "I'm a coastal capital with lively markets and music.",
      "A monumental arch marks independence in my center.",
      "A black star is an iconic national symbol seen here."
    ],
    didYouKnow: "Accra means 'ants' because there used to be many anthills here!",
    badge: "🎭 Cultural Voyager",
    missionLinked: "🎭 Cultural Voyager",
    missionReward: "+2⭐",
    population: "2.5 Million",
    currency: "Ghanaian Cedi (₵)",
    language: "English",
    mapCoordinates: { x: 38, y: 66 },
    greetingAudio: "Akwaaba",
    landmarkIcon: "🎨"
  },
  {
    id: "dq_dar_es_salaam",
    type: "Location",
    city: "Dar es Salaam",
    country: "Tanzania",
    continent: "Africa",
    flagUrl: "https://flagcdn.com/w320/tz.png",
    bandColor: "Orange",
    clues: [
      "My name means 'Haven of Peace' in Arabic.",
      "I am a port city where you can catch a boat to see wild animals on islands."
    ],
    cluesAlt: [
      "I am on the continent with Mount Kilimanjaro, Africa's tallest peak.",
      "My country has the Serengeti and shares Lake Victoria.",
      "My name means 'Haven of Peace' and I am a gateway to safari adventures!"
    ],
    cluesAlt2: [
      "I'm a hot coastal city on the Indian Ocean.",
      "I'm the main jumping-off point to a famous spice island by ferry.",
      "My harbor is one of the busiest on this coast."
    ],
    didYouKnow: "Dar es Salaam is the starting point for safaris to see lions and elephants!",
    badge: "🐾 Safari Master",
    missionLinked: "🐾 Safari Master",
    secondaryBadge: "🌿 Eco Explorer",
    secondaryMissionLinked: "🌿 Eco Explorer",
    missionReward: "+2⭐",
    population: "7.4 Million",
    currency: "Tanzanian Shilling (TSh)",
    language: "Swahili/English",
    mapCoordinates: { x: 56, y: 72 },
    greetingAudio: "Jambo",
    landmarkIcon: "⛵"
  },
  {
    id: "dq_tunis",
    type: "Location",
    city: "Tunis",
    country: "Tunisia",
    continent: "Africa",
    flagUrl: "https://flagcdn.com/w320/tn.png",
    bandColor: "Orange",
    clues: [
      "I am very close to the ancient ruins of Carthage.",
      "I am a North African capital with blue and white painted buildings."
    ],
    cluesAlt: [
      "I am on the continent across the Mediterranean from Europe.",
      "My country has Sahara desert oases and ancient Roman ruins.",
      "I am near ancient Carthage with blue and white painted buildings!"
    ],
    cluesAlt2: [
      "I'm a Mediterranean city with layers of history.",
      "Ancient ruins of a legendary rival of Rome lie nearby.",
      "My old medina is a maze of gates and markets."
    ],
    didYouKnow: "Ancient Carthage nearby was once Rome's biggest rival!",
    badge: "🧭 Time Traveler",
    missionLinked: "🧭 Time Traveler",
    missionReward: "+2⭐",
    population: "2.4 Million",
    currency: "Tunisian Dinar (DT)",
    language: "Arabic/French",
    mapCoordinates: { x: 48, y: 52 },
    greetingAudio: "Salam",
    landmarkIcon: "🏛️"
  },
  {
    id: "dq_algiers",
    type: "Location",
    city: "Algiers",
    country: "Algeria",
    continent: "Africa",
    flagUrl: "https://flagcdn.com/w320/dz.png",
    bandColor: "Orange",
    clues: [
      "I am the capital of the largest country in Africa.",
      "My white buildings climb up a hillside overlooking the blue sea."
    ],
    cluesAlt: [
      "I am on the continent with the world's largest hot desert.",
      "My country is the biggest in Africa by land area.",
      "I am called 'The White' because white buildings climb my hillside!"
    ],
    cluesAlt2: [
      "I'm a Mediterranean capital built on hills.",
      "White buildings cascade toward the sea.",
      "My old quarter climbs steep lanes above the waterfront."
    ],
    didYouKnow: "Algiers is called 'Algiers the White' because of its white buildings!",
    badge: "🎭 Cultural Voyager",
    missionLinked: "🎭 Cultural Voyager",
    missionReward: "+2⭐",
    population: "3.4 Million",
    currency: "Algerian Dinar (DA)",
    language: "Arabic/French",
    mapCoordinates: { x: 40, y: 52 },
    greetingAudio: "Salam",
    landmarkIcon: "🏘️"
  },
  {
    id: "dq_kigali",
    type: "Location",
    city: "Kigali",
    country: "Rwanda",
    continent: "Africa",
    flagUrl: "https://flagcdn.com/w320/rw.png",
    bandColor: "Orange",
    clues: [
      "I am one of the cleanest cities in Africa with no plastic bags allowed.",
      "I am in the land of a thousand hills where mountain gorillas live."
    ],
    cluesAlt: [
      "I am on the continent where endangered mountain gorillas live.",
      "My country is called 'the land of a thousand hills' and bans plastic bags.",
      "I am Africa's cleanest city in the land of mountain gorillas!"
    ],
    cluesAlt2: [
      "I'm a highland capital known for cleanliness and order.",
      "A powerful memorial site is central to my modern identity.",
      "Hills roll through my neighborhoods in every direction."
    ],
    didYouKnow: "Rwanda is called 'the land of a thousand hills'!",
    badge: "🐾 Safari Master",
    missionLinked: "🐾 Safari Master",
    secondaryBadge: "🌿 Eco Explorer",
    secondaryMissionLinked: "🌿 Eco Explorer",
    missionReward: "+2⭐",
    population: "1.2 Million",
    currency: "Rwandan Franc (FRw)",
    language: "Kinyarwanda/English/French",
    mapCoordinates: { x: 52, y: 68 },
    greetingAudio: "Muraho",
    landmarkIcon: "🦍"
  },
  {
    id: "dq_freetown",
    type: "Location",
    city: "Freetown",
    country: "Sierra Leone",
    continent: "Africa",
    flagUrl: "https://flagcdn.com/w320/sl.png",
    bandColor: "Orange",
    clues: [
      "My name tells you what I was built to be - a town for freed people!",
      "I am on the coast of West Africa with beautiful beaches and mountains."
    ],
    cluesAlt: [
      "I am on the coast of West Africa with tropical beaches.",
      "My country's name means 'Lion Mountains' in Portuguese.",
      "My name tells my story—I was built as a home for freed people!"
    ],
    cluesAlt2: [
      "I'm a coastal capital shaped by a deep natural harbor.",
      "I was founded as a home for freed people.",
      "A famous cotton tree is a well-known historic symbol here."
    ],
    didYouKnow: "Freetown was founded as a home for freed slaves from America and Britain!",
    badge: "🧭 Time Traveler",
    missionLinked: "🧭 Time Traveler",
    missionReward: "+2⭐",
    population: "1.1 Million",
    currency: "Sierra Leonean Leone (Le)",
    language: "English/Krio",
    mapCoordinates: { x: 30, y: 64 },
    greetingAudio: "Kusheh",
    landmarkIcon: "⛰️"
  },
  {
    id: "dq_mombasa",
    type: "Location",
    city: "Mombasa",
    country: "Kenya",
    continent: "Africa",
    flagUrl: "https://flagcdn.com/w320/ke.png",
    bandColor: "Orange",
    clues: [
      "I am Kenya's oldest city with an old Portuguese fort by the sea.",
      "I have beautiful white sand beaches on the Indian Ocean coast."
    ],
    cluesAlt: [
      "I am on the continent with white sand beaches on the Indian Ocean.",
      "My country is famous for safaris and world-class runners.",
      "I am Kenya's oldest city with giant elephant tusk arches over my road!"
    ],
    cluesAlt2: [
      "I'm a warm Indian Ocean city with Swahili roots.",
      "An old stone fort guards my historic waterfront.",
      "A giant pair of tusk-shaped arches marks a famous city avenue."
    ],
    didYouKnow: "Mombasa has giant elephant tusks arching over its main road!",
    badge: "🌿 Eco Explorer",
    missionLinked: "🌿 Eco Explorer",
    missionReward: "+2⭐",
    population: "1.2 Million",
    currency: "Kenyan Shilling (KSh)",
    language: "Swahili/English",
    mapCoordinates: { x: 58, y: 68 },
    greetingAudio: "Jambo",
    landmarkIcon: "🏰"
  },
  {
    id: "dq_giza",
    type: "Location",
    city: "Giza",
    country: "Egypt",
    continent: "Africa",
    flagUrl: "https://flagcdn.com/w320/eg.png",
    bandColor: "Orange",
    clues: [
      "I am home to the only surviving wonder of the ancient world!",
      "I have three famous pyramids and a giant sphinx guarding them."
    ],
    cluesAlt: [
      "I am on the continent where ancient civilizations built giant tombs.",
      "My country has the Nile River and ancient hieroglyphic writing.",
      "I have the only surviving wonder of the ancient world—the Great Pyramid!"
    ],
    cluesAlt2: [
      "I'm a desert city beside one of the greatest ancient wonders.",
      "A giant limestone pyramid rises near me.",
      "A sphinx with a human face and lion body sits close by."
    ],
    didYouKnow: "The Great Pyramid was the tallest building in the world for 3,800 years!",
    badge: "🗼 Wonders Hunter",
    missionLinked: "🗼 Wonders Hunter",
    secondaryBadge: "🧭 Time Traveler",
    secondaryMissionLinked: "🧭 Time Traveler",
    missionReward: "+2⭐",
    population: "4 Million",
    currency: "Egyptian Pound (E£)",
    language: "Arabic",
    mapCoordinates: { x: 52, y: 54 },
    greetingAudio: "Marhaba",
    landmarkIcon: "🔺"
  },

  // ========== NEW OCEANIA CITIES ==========
  {
    id: "dq_wellington",
    type: "Location",
    city: "Wellington",
    country: "New Zealand",
    continent: "Oceania",
    flagUrl: "https://flagcdn.com/w320/nz.png",
    bandColor: "Teal",
    clues: [
      "I am the windiest capital city in the world!",
      "I am home to Weta Workshop where Lord of the Rings special effects were made."
    ],
    cluesAlt: [
      "I am on islands in the Pacific near Australia.",
      "My country has more sheep than people and the Maori culture.",
      "I am the world's windiest capital where Lord of the Rings was made!"
    ],
    cluesAlt2: [
      "I'm a capital famous for strong winds.",
      "I sit by a narrow strait between two large islands.",
      "A national museum called Te Papa is a key landmark here."
    ],
    didYouKnow: "Wellington has a cable car that climbs up a steep hill!",
    badge: "🎭 Cultural Voyager",
    missionLinked: "🎭 Cultural Voyager",
    missionReward: "+2⭐",
    population: "215,000",
    currency: "New Zealand Dollar ($)",
    language: "English/Māori",
    mapCoordinates: { x: 96, y: 82 },
    greetingAudio: "Kia ora",
    landmarkIcon: "💨"
  },
  {
    id: "dq_papeete",
    type: "Location",
    city: "Papeete",
    country: "French Polynesia",
    continent: "Oceania",
    flagUrl: "https://flagcdn.com/w320/pf.png",
    bandColor: "Teal",
    clues: [
      "I am on a French island in the middle of the Pacific Ocean.",
      "I am famous for beautiful lagoons and overwater bungalows."
    ],
    cluesAlt: [
      "I am on tropical islands scattered across the Pacific Ocean.",
      "My islands belong to France and grow rare black pearls.",
      "I have turquoise lagoons and overwater bungalows in paradise!"
    ],
    cluesAlt2: [
      "I'm a tropical harbor city deep in the Pacific.",
      "I sit on the island of Tahiti surrounded by lagoons.",
      "My waterfront market is known for black pearls and bright crafts."
    ],
    didYouKnow: "Tahitian pearls grown nearby are black instead of white!",
    badge: "🌿 Eco Explorer",
    missionLinked: "🌿 Eco Explorer",
    missionReward: "+2⭐",
    population: "26,000",
    currency: "CFP Franc (₣)",
    language: "French/Tahitian",
    mapCoordinates: { x: 5, y: 72 },
    greetingAudio: "Ia orana",
    landmarkIcon: "🏝️"
  },
  {
    id: "dq_apia",
    type: "Location",
    city: "Apia",
    country: "Samoa",
    continent: "Oceania",
    flagUrl: "https://flagcdn.com/w320/ws.png",
    bandColor: "Teal",
    clues: [
      "I am the capital of a Pacific island nation where rugby is very popular.",
      "I am among the first places in the world to see the sunrise each day!"
    ],
    cluesAlt: [
      "I am on islands in the vast Pacific Ocean.",
      "My country loves rugby and has traditional Polynesian culture.",
      "I am among the first places on Earth to see each new sunrise!"
    ],
    cluesAlt2: [
      "I'm a small Pacific capital with a relaxed harbor.",
      "I sit on the island of Upolu.",
      "A famous author's home and memorial lies nearby in the hills."
    ],
    didYouKnow: "The famous author Robert Louis Stevenson lived here!",
    badge: "🎭 Cultural Voyager",
    missionLinked: "🎭 Cultural Voyager",
    missionReward: "+2⭐",
    population: "40,000",
    currency: "Samoan Tala (T)",
    language: "Samoan/English",
    mapCoordinates: { x: 2, y: 70 },
    greetingAudio: "Talofa",
    landmarkIcon: "🌅"
  },
  {
    id: "dq_nuku_alofa",
    type: "Location",
    city: "Nuku'alofa",
    country: "Tonga",
    continent: "Oceania",
    flagUrl: "https://flagcdn.com/w320/to.png",
    bandColor: "Teal",
    clues: [
      "I am the capital of a kingdom ruled by an actual king!",
      "I am on a Pacific island where humpback whales come to have babies."
    ],
    cluesAlt: [
      "I'm on islands far out in the Pacific Ocean.",
      "My country is a real kingdom with a king and strong Polynesian traditions.",
      "I'm the capital where humpback whales visit nearby waters each year."
    ],
    cluesAlt2: [
      "I'm a Pacific capital in a Polynesian kingdom.",
      "Royal buildings sit near my town center.",
      "Traditional ceremonies and royal tombs are part of my identity."
    ],
    didYouKnow: "Tonga is the only Pacific nation never colonized by Europeans!",
    badge: "🎭 Cultural Voyager",
    missionLinked: "🎭 Cultural Voyager",
    missionReward: "+2⭐",
    population: "25,000",
    currency: "Tongan Pa'anga (T$)",
    language: "Tongan/English",
    mapCoordinates: { x: 0, y: 74 },
    greetingAudio: "Mālō e lelei",
    landmarkIcon: "🐋"
  },
  {
    id: "dq_queenstown",
    type: "Location",
    city: "Queenstown",
    country: "New Zealand",
    continent: "Oceania",
    flagUrl: "https://flagcdn.com/w320/nz.png",
    bandColor: "Teal",
    clues: [
      "I am the adventure capital of the world with bungee jumping and skiing!",
      "I am surrounded by beautiful mountains and a crystal blue lake."
    ],
    cluesAlt: [
      "I'm on a continent of islands scattered across a huge ocean.",
      "My country is famous for epic mountains, movie landscapes, and adventure sports.",
      "I'm the 'adventure capital' where bungee jumping and skiing are big deals by a blue lake."
    ],
    cluesAlt2: [
      "I'm a lakeside town surrounded by sharp peaks.",
      "I'm known worldwide for adrenaline sports.",
      "Bungee jumping is one of my most famous claims."
    ],
    didYouKnow: "Bungee jumping was invented here in New Zealand!",
    badge: "🌋 Thrill Trekker",
    missionLinked: "🌋 Thrill Trekker",
    secondaryBadge: "🌿 Eco Explorer",
    secondaryMissionLinked: "🌿 Eco Explorer",
    missionReward: "+2⭐",
    population: "15,000",
    currency: "New Zealand Dollar ($)",
    language: "English/Māori",
    mapCoordinates: { x: 94, y: 84 },
    greetingAudio: "Kia ora",
    landmarkIcon: "🏔️"
  },
  {
    id: "dq_adelaide",
    type: "Location",
    city: "Adelaide",
    country: "Australia",
    continent: "Oceania",
    flagUrl: "https://flagcdn.com/w320/au.png",
    bandColor: "Teal",
    clues: [
      "I am surrounded by famous wine regions and wildlife parks.",
      "I am known as the 'City of Churches' because I have so many."
    ],
    cluesAlt: [
      "I am on the continent that is also a country with unique wildlife.",
      "My country has koalas, kangaroos, and the Great Barrier Reef.",
      "I am the 'City of Churches' surrounded by wine country and koalas!"
    ],
    cluesAlt2: [
      "I'm a city known for arts and food.",
      "Wine valleys lie close beyond my outskirts.",
      "I'm often nicknamed the \"Festival City.\""
    ],
    didYouKnow: "Adelaide is one of the best cities in the world for seeing koalas!",
    badge: "🍜 Taste Trailblazer",
    missionLinked: "🍜 Taste Trailblazer",
    missionReward: "+2⭐",
    population: "1.4 Million",
    currency: "Australian Dollar ($)",
    language: "English",
    mapCoordinates: { x: 90, y: 78 },
    greetingAudio: "G'day",
    landmarkIcon: "🐨"
  },
  {
    id: "dq_christchurch",
    type: "Location",
    city: "Christchurch",
    country: "New Zealand",
    continent: "Oceania",
    flagUrl: "https://flagcdn.com/w320/nz.png",
    bandColor: "Teal",
    clues: [
      "I am the biggest city on New Zealand's South Island.",
      "I am called the 'Garden City' because of all my beautiful parks."
    ],
    cluesAlt: [
      "I am on the South Island of a country with stunning mountains.",
      "My country is the gateway to Antarctica expeditions.",
      "I am the 'Garden City' and gateway to exploring Antarctica!"
    ],
    cluesAlt2: [
      "I'm known for parks, gardens, and wide green spaces.",
      "I became globally known after powerful earthquakes reshaped my center.",
      "A gentle river and botanic gardens are signature local anchors."
    ],
    didYouKnow: "Christchurch is the gateway to exploring Antarctica!",
    badge: "🌿 Eco Explorer",
    missionLinked: "🌿 Eco Explorer",
    missionReward: "+2⭐",
    population: "390,000",
    currency: "New Zealand Dollar ($)",
    language: "English/Māori",
    mapCoordinates: { x: 96, y: 84 },
    greetingAudio: "Kia ora",
    landmarkIcon: "🌳"
  },
  {
    id: "dq_nassau",
    type: "Location",
    city: "Nassau",
    country: "Bahamas",
    continent: "North America",
    flagUrl: "https://flagcdn.com/w320/bs.png",
    bandColor: "Red",
    clues: [
      "I was once home to famous pirates like Blackbeard!",
      "I am a tropical island capital with pink sand beaches and crystal clear water."
    ],
    cluesAlt: [
      "I'm on a continent with warm islands and seas full of coral.",
      "My country is made of hundreds of islands and is famous for turquoise water and pirates.",
      "I'm the capital that used to be a pirate hotspot—now cruise ships visit my colorful harbor."
    ],
    cluesAlt2: [
      "I'm a tropical capital city surrounded by turquoise seas.",
      "A famous bridge links my center to an island packed with resorts.",
      "A giant pink resort complex is a well-known clue."
    ],
    didYouKnow: "Pirates of the Caribbean was partly filmed in the Bahamas!",
    badge: "🎭 Cultural Voyager",
    missionLinked: "🎭 Cultural Voyager",
    missionReward: "+2⭐",
    population: "275,000",
    currency: "Bahamian Dollar (B$)",
    language: "English",
    mapCoordinates: { x: 24, y: 56 },
    greetingAudio: "Hello",
    landmarkIcon: "🏴‍☠️"
  }
];

// Combine LOCATION_CARDS from Guess & Go with new Daily Quest cities
// This creates a pool of 101 cities total (42 from LOCATION_CARDS + 59 new)
const ALL_CITIES_RAW: LocationCard[] = [
  // Include all 42 Guess & Go cities
  ...LOCATION_CARDS.filter(card => card.type === "Location"),
  // Add new Daily Quest cities (7 original + 52 additional = 59)
  ...NEW_DAILY_QUEST_CITIES
];

// Seeded random number generator for consistent shuffling
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

// Hash function to create seed from string
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Shuffle array with seeded randomness using Fisher-Yates
function seededShuffle<T>(arr: T[], random: () => number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Interleave cities by continent to ensure variety in consecutive daily quests
// Uses balanced distribution: ensures no more than 2 consecutive cities from same continent
function interleaveCitiesByContinent(cities: LocationCard[]): LocationCard[] {
  // Group cities by continent
  const continents: Record<string, LocationCard[]> = {};
  const continentOrder = ['Europe', 'Asia', 'Africa', 'North America', 'South America', 'Oceania', 'Other'];
  
  for (const city of cities) {
    const cont = city.continent || 'Other';
    if (!continents[cont]) continents[cont] = [];
    continents[cont].push(city);
  }
  
  // Shuffle each continent's cities with a seeded random
  const globalSeed = hashString('geoquest_daily_v2_2026');
  for (const cont of Object.keys(continents)) {
    const seed = hashString(cont + 'geoquest_daily_v2');
    const random = seededRandom(seed);
    continents[cont] = seededShuffle(continents[cont], random);
  }
  
  // Build result with balanced continent distribution
  // Strategy: Fill slots using weighted selection based on remaining cities per continent
  const result: LocationCard[] = [];
  const indices: Record<string, number> = {};
  const remaining: Record<string, number> = {};
  
  for (const cont of continentOrder) {
    indices[cont] = 0;
    remaining[cont] = continents[cont]?.length || 0;
  }
  
  const totalCities = cities.length;
  const random = seededRandom(globalSeed);
  
  while (result.length < totalCities) {
    // Get last 2 continents in result to avoid clustering
    const lastCont = result.length > 0 ? result[result.length - 1].continent : null;
    const secondLastCont = result.length > 1 ? result[result.length - 2].continent : null;
    
    // Filter to continents that still have cities and aren't clustering
    const availableContinents = continentOrder.filter(cont => {
      if (remaining[cont] <= 0) return false;
      // Prevent 3+ in a row from same continent
      if (cont === lastCont && cont === secondLastCont) return false;
      return true;
    });
    
    // If no valid options (all remaining are same continent), allow the duplicate
    const choosableContinents = availableContinents.length > 0 
      ? availableContinents 
      : continentOrder.filter(cont => remaining[cont] > 0);
    
    if (choosableContinents.length === 0) break;
    
    // Weight by remaining cities to ensure even distribution across cycle
    const totalRemaining = choosableContinents.reduce((sum, c) => sum + remaining[c], 0);
    const r = random() * totalRemaining;
    let cumulative = 0;
    let selectedContinent = choosableContinents[0];
    
    for (const cont of choosableContinents) {
      cumulative += remaining[cont];
      if (r < cumulative) {
        selectedContinent = cont;
        break;
      }
    }
    
    // Add city from selected continent
    const arr = continents[selectedContinent];
    const idx = indices[selectedContinent];
    if (idx < arr.length) {
      result.push(arr[idx]);
      indices[selectedContinent]++;
      remaining[selectedContinent]--;
    }
  }
  
  return result;
}

export const DAILY_QUEST_CITIES: LocationCard[] = interleaveCitiesByContinent(ALL_CITIES_RAW);

export const ALL_PASSPORT_CITIES = DAILY_QUEST_CITIES;
export const ALL_GUESS_AND_GO_CITIES = DAILY_QUEST_CITIES;
export const HARD_MODE_CITIES = NEW_DAILY_QUEST_CITIES;

export type DailyQuestDifficulty = 'easy' | 'hard';

function splitCitiesForDay(dateString: string): { easy: LocationCard; hard: LocationCard } {
  const seed = hashString('dailysplit_' + dateString);
  const rng = seededRandom(seed);
  const shuffled = seededShuffle([...DAILY_QUEST_CITIES], rng);
  const half = Math.ceil(shuffled.length / 2);
  const easyPool = shuffled.slice(0, half);
  const hardPool = shuffled.slice(half);

  const daySeed = hashString(dateString);
  const easyIndex = Math.abs(daySeed) % easyPool.length;
  const hardIndex = Math.abs(daySeed + 7919) % hardPool.length;

  return { easy: easyPool[easyIndex], hard: hardPool[hardIndex] };
}

export function getDailyQuestCityByMode(dateString: string, difficulty: DailyQuestDifficulty): LocationCard {
  const { easy, hard } = splitCitiesForDay(dateString);
  return difficulty === 'easy' ? easy : hard;
}

export function getDailyQuestCityForToday(dateString: string): LocationCard {
  const seed = hashString('dailyquest_' + dateString);
  const rng = seededRandom(seed);
  const shuffled = seededShuffle([...DAILY_QUEST_CITIES], rng);
  const index = Math.abs(seed) % shuffled.length;
  return shuffled[index];
}

export function getDailyQuestCity(dayOffset: number = 0): LocationCard {
  const anchorDate = new Date('2025-01-01');
  const today = new Date();
  today.setDate(today.getDate() + dayOffset);
  const diffTime = today.getTime() - anchorDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const index = Math.abs(diffDays) % DAILY_QUEST_CITIES.length;
  return DAILY_QUEST_CITIES[index];
}

const CITY_ALIASES: Record<string, string[]> = {
  'São Paulo': ['Sao Paulo', 'San Paulo'],
  'Cusco': ['Cuzco'],
  'Reykjavik': ['Reykjavík'],
  'Zürich': ['Zurich'],
  'Medellín': ['Medellin'],
  'Bogotá': ['Bogota'],
  'Montréal': ['Montreal'],
  'Kraków': ['Krakow'],
  'Nairobi': [],
  'Washington D.C.': ['Washington DC', 'Washington', 'DC'],
  'Ho Chi Minh City': ['Saigon', 'Ho Chi Minh'],
  'Mexico City': ['Ciudad de Mexico', 'CDMX'],
  'New York City': ['New York', 'NYC'],
  'Kuala Lumpur': ['KL'],
  'Rio de Janeiro': ['Rio'],
  'Buenos Aires': [],
  'Chiang Mai': ['Chiangmai'],
};

function normalizeForMatch(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

export function fuzzyMatchCity(input: string, correctCity: string): boolean {
  const normInput = normalizeForMatch(input);
  const normCorrect = normalizeForMatch(correctCity);

  if (normInput === normCorrect) return true;

  if (normCorrect.includes(normInput) && normInput.length >= 4) return true;
  if (normInput.includes(normCorrect)) return true;

  const aliases = CITY_ALIASES[correctCity] || [];
  for (const alias of aliases) {
    if (normalizeForMatch(alias) === normInput) return true;
  }

  if (normInput.length >= 4 && normCorrect.length >= 4) {
    const distance = levenshtein(normInput, normCorrect);
    if (distance <= 2) return true;
  }

  return false;
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}
