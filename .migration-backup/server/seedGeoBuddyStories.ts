import { db } from "./db";
import { geoBuddyStories, dailyQuestCities } from "@shared/schema";
import { eq } from "drizzle-orm";

interface StoryChapter {
  title: string;
  narrator: "geobuddy" | "ari" | "both";
  content: string;
}

interface StorySeed {
  cityName: string;
  countryName: string;
  title: string;
  subtitle: string;
  episodeNumber: number;
  durationSeconds: number;
  summary: string;
  storyScript: StoryChapter[];
}

const SEASON_1_EPISODES: StorySeed[] = [
  {
    cityName: "Cusco",
    countryName: "Peru",
    title: "The City in the Clouds",
    subtitle: "Where a compass needle spins toward a forgotten mountain city",
    episodeNumber: 1,
    durationSeconds: 720,
    summary: "GeoBuddy's compass needle won't stop spinning. Something is pulling it toward a mysterious city high in the mountains, where the clouds float below your feet and ancient stone walls fit together like puzzle pieces. Can you help GeoBuddy and Ari figure out where they are?",
    storyScript: [
      {
        title: "The Compass That Forgot",
        narrator: "both",
        content: "[GEOBUDDY] Explorer… listen for a moment. [pause] That wind you hear? [sfx:mountain-wind] [pause] That's mountain wind. [pause] Thin air… cool air… the kind of wind that only happens very high above the valleys. [pause] Which means we're somewhere interesting. [pause] But today something unusual is happening with my compass. [sfx:broken-compass] [pause] Hmm. [pause] Did you hear that? [pause] Normally my needle points explorers toward remarkable places across the world. [pause] Cities filled with history… stories… discoveries. [pause] But lately my compass remembers the stories… [pause] and forgets the names of the cities. [pause] Almost like the map itself forgot them. [pause] Which means we need your help, Explorer. [pause] Because if we follow the clues… [pause] we can rediscover the city together. [pause] Fortunately, I'm not traveling alone. [pause] I'm here with a very curious explorer named Ari. [pause] [ARI] Hi Explorer! [pause] Geo… quick question. [pause] Are clouds supposed to be under our feet? [pause] [GEOBUDDY] Usually they are above us. [pause] [ARI] Good. [pause] Because those clouds are definitely floating way down there. [pause] Which means we climbed really high. [pause] [GEOBUDDY] Correct. [pause] We are standing about 11,000 feet above sea level. [pause] [ARI] That explains why my legs feel like spaghetti noodles. [pause] [GEOBUDDY] That is a common mountain condition. [pause] Explorer… imagine what we're seeing. [pause] Tall green mountains stretching in every direction. [pause] Deep valleys below. [pause] Clouds drifting between the peaks. [pause] Places this high usually belong to a very famous mountain range. [pause] [ARI] Wait… [pause] Geo… I think I've seen mountains like this before. [pause] In a geography book. [pause] Long mountains running down the side of South America. [pause] Are these the Andes Mountains? [pause] [GEOBUDDY] Excellent observation, Ari. [pause] The Andes are one of the longest mountain ranges on Earth. [pause] Explorer… if we're high in the Andes Mountains… [pause] what countries could we be in? [pause] Take a guess in your head. [long pause] [GEOBUDDY] Let's continue exploring. [pause] I think the next clue might be nearby."
      },
      {
        title: "The Market in the Mountains",
        narrator: "both",
        content: "[sfx:footsteps] [ARI] Whoa! [pause] Geo… look at this place! [pause] There are colorful blankets everywhere. [pause] Red… orange… yellow… [pause] It looks like someone turned a sunset into fabric. [pause] [GEOBUDDY] Those textiles are made by the Quechua people who live throughout the Andes. [pause] [ARI] Quechua… that's a people and a language, right? [sfx:market-ambience] [pause] I think I heard an explorer talk about that once. [pause] [GEOBUDDY] Correct. [pause] Quechua has been spoken in these mountains for hundreds of years. [pause] [ARI] Also… [pause] smell check. [pause] Something smells amazing. [pause] Warm and kind of… bready. [pause] [GEOBUDDY] I can confirm the colors. [pause] But not the smell. [pause] [ARI] Right. [pause] Because you're a compass. [pause] [GEOBUDDY] Correct. [pause] Navigation device. [pause] No nose included. [pause] [ARI] Buddy… that feels like a design flaw. [pause] [GEOBUDDY] Possibly. [pause] However the smell might be roasted corn… potatoes… or quinoa. [pause] Fun fact, Explorer: [pause] The Andes are one of the original homes of the potato. [pause] [ARI] So fries are basically mountain history. [pause] [GEOBUDDY] That is one interpretation."
      },
      {
        title: "The Stones That Don't Fall",
        narrator: "both",
        content: "[sfx:footsteps] [ARI] Geo… look at this wall. [pause] [GEOBUDDY] Yes… I see it. [pause] Large stones. [pause] But notice their shapes. [pause] [ARI] They fit together like puzzle pieces! [pause] And there's no cement. [pause] How is that not falling down? [pause] [GEOBUDDY] Those stones were carved extremely carefully so they fit together perfectly. [pause] This style of stonework was built by one of the most remarkable civilizations in South America. [pause] [ARI] Wait… [pause] Geo… I remember this! [pause] I saw pictures like this in a museum book. [pause] The Inca! [pause] [GEOBUDDY] Exactly. [pause] The Inca Empire built cities, roads, and farming terraces across the Andes Mountains. [pause] Many of their stone structures are still standing today. [pause] Explorer… [pause] let's think about what we've discovered. [pause] High Andes mountains. [pause] Quechua markets. [pause] Inca stonework. [pause] Do you recognize this place? [pause] Take a guess. [long pause]"
      },
      {
        title: "The Hidden City in the Clouds",
        narrator: "both",
        content: "[ARI] Geo… [pause] something just clicked in my brain. [pause] [GEOBUDDY] What did you remember, Ari? [pause] [ARI] If we're near the old Inca capital… [pause] then one of the most famous places in the world must be nearby. [pause] A mountain city hidden in the clouds. [pause] [GEOBUDDY] Which place are you thinking of? [pause] [ARI] Machu Picchu. [pause] [sfx:reveal-sting] [GEOBUDDY] My needle just locked. [pause] That means the story connected. [pause] Machu Picchu lies high in the mountains of Peru. [pause] And explorers who visit it usually begin in a nearby city. [pause] A city that was once the capital of the Inca Empire. [pause] [ARI] Wait… [pause] the capital… [pause] the Andes… [pause] the Inca… [pause] Explorer… I know it! [pause] It's Cusco! [sfx:compass-lock] [pause] Cusco, Peru!"
      },
      {
        title: "The Map Lights Up",
        narrator: "both",
        content: "[sfx:map-sparkle] [GEOBUDDY] Correct. [pause] Cusco. [pause] The ancient heart of the Inca Empire. [pause] And the gateway to Machu Picchu. [pause] [ARI] Explorer… we rediscovered the city! [pause] [GEOBUDDY] Look at the Explorer Map. [pause] A new star has appeared. [pause] And my compass is getting stronger. [pause] [ARI] Geo… [pause] your needle just twitched again. [sfx:compass-spinning] [pause] [GEOBUDDY] Yes. [pause] And this time the compass is pointing somewhere very different. [pause] [ARI] Hot desert maybe? [pause] [GEOBUDDY] Yes. [pause] A place of endless sand. [pause] Ancient rulers. [pause] And enormous pyramids rising into the sky. [pause] Explorer… do you know where we're going next? [pause] We'll discover it together. [pause] [ARI] Until then— [pause] [GEOBUDDY] Keep exploring. [pause] [ARI] And keep noticing the world. [pause] [CHORUS] Because every place has a story. [sfx:outro]"
      }
    ]
  },
  {
    cityName: "Giza",
    countryName: "Egypt",
    title: "The Pyramid Builders",
    subtitle: "Where giant triangles guard the edge of the desert",
    episodeNumber: 2,
    durationSeconds: 600,
    summary: "GeoBuddy and Ari stand at the edge of a vast desert where enormous stone triangles have watched over the sand for over four thousand years.",
    storyScript: [
      { title: "The Journey Begins", narrator: "both", content: "[GEOBUDDY] Explorer, get ready for something incredible. Ari and I are standing at the edge of a vast desert. The sand stretches as far as we can see, golden and shimmering in the heat. But right behind us is a bustling city full of markets, mosques, and millions of people. And ahead of us… something truly ancient. [ARI] GeoBuddy, look at those! They're enormous! Three giant triangles made of stone, rising out of the desert like mountains that someone built on purpose. Each stone block is bigger than me! How did people build these without cranes or trucks? [GEOBUDDY] Great question, Ari! These structures have been here for over four thousand years. And right through this city flows one of the longest rivers in the world. People have depended on this river for everything — farming, drinking water, transportation. Without this river, there would be nothing here but desert. Explorer, do you have a guess where we might be? Giant stone triangles and one of the world's longest rivers…" },
      { title: "Clues", narrator: "both", content: "[ARI] We just visited a market called a bazaar! People are selling spices that smell like cinnamon and cardamom, beautiful glowing lanterns, and golden jewelry. Everyone is so friendly — they offered us sweet mint tea. And I can hear the sound of prayer calls echoing across the rooftops. It's beautiful. [GEOBUDDY] Here's a history clue, explorer. There's a creature nearby with the body of a lion and the head of a human. It's been guarding these giant structures since ancient times. The rulers who built them were called pharaohs, and they believed these structures would help them reach the afterlife. Each one took thousands of workers and many years to build." },
      { title: "The Reveal", narrator: "both", content: "[GEOBUDDY] Explorer… we're standing in the shadow of the Great Pyramids of Giza, just outside Cairo, Egypt! That creature is the Great Sphinx, and the river is the Nile — the longest river in Africa. Cairo is one of the oldest and largest cities in the world, home to over twenty million people! [ARI] Cairo! Wow! The pyramids are even more amazing up close than I ever imagined!" },
      { title: "Explorer Map Moment", narrator: "both", content: "[GEOBUDDY] Congratulations, explorer! Look at the map — a new star is glowing again! You've just discovered Giza and the great city of Cairo! [ARI] In Egypt, people speak Arabic and say marhaba for hello. [GEOBUDDY] The pyramids have stood here for over forty-five centuries — longer than almost any human structure on Earth. Another city rediscovered. Where should we travel next? [ARI] Keep exploring!" }
    ]
  },
  {
    cityName: "Kyoto",
    countryName: "Japan",
    title: "The Samurai's Secret",
    subtitle: "Where bamboo forests whisper ancient warrior tales",
    episodeNumber: 3,
    durationSeconds: 600,
    summary: "GeoBuddy and Ari wander through bamboo forests and ancient temples, uncovering the secrets of noble warriors and cherry blossoms.",
    storyScript: [
      { title: "The Journey Begins", narrator: "both", content: "[GEOBUDDY] Explorer, Ari and I just walked into the most magical forest. The trees here aren't like normal trees — they're bamboo, growing straight up like green pillars, so tall they disappear into the sky. When the wind blows, they creak and sway and make the most peaceful sound you've ever heard. [ARI] GeoBuddy, it feels like we stepped into another world! The path is lined with bamboo on both sides and the light filtering through is green and golden. I can hear a stream somewhere and birds singing. This place feels so peaceful and ancient. [GEOBUDDY] This city is on a group of islands in East Asia, Ari. It's surrounded by mountains on three sides, which protected it from invaders for centuries. The country has four distinct seasons — and in spring, the trees burst into the most incredible pink and white blossoms. Explorer, do you know what those famous blossoms are called?" },
      { title: "Clues", narrator: "both", content: "[ARI] We just visited the most beautiful temple! It's covered entirely in gold leaf and sits at the edge of a mirror-like pond. The reflection makes it look like there are two golden temples! And the gardens here are so carefully arranged — every rock, every tree, every patch of moss is placed with purpose. [GEOBUDDY] Here's a history clue, explorer. This city was once home to fearsome warriors called samurai. They followed a strict code of honor and were masters of the sword. For over a thousand years, this city was the imperial capital — the home of emperors. It has over two thousand temples and shrines!" },
      { title: "The Reveal", narrator: "both", content: "[GEOBUDDY] Explorer, we're in the ancient city of Kyoto, Japan! This was Japan's capital for over a thousand years. The golden temple is Kinkaku-ji, the bamboo forest is Arashiyama, and those blossoms are the famous cherry blossoms — sakura — that people celebrate every spring. [ARI] Kyoto! I love it here! The cherry blossoms must be so magical in spring!" },
      { title: "Explorer Map Moment", narrator: "both", content: "[ARI] Look at the map — another star is glowing! [GEOBUDDY] You've discovered Kyoto! This city of temples, samurai, and cherry blossoms is now on your map. In Japan, people say konnichiwa for hello and use the Yen as currency. Kyoto holds more UNESCO World Heritage sites than almost any city on Earth. [ARI] Keep exploring!" }
    ]
  },
  {
    cityName: "Venice",
    countryName: "Italy",
    title: "The City of Canals",
    subtitle: "Where streets are made of water and boats replace cars",
    episodeNumber: 4,
    durationSeconds: 600,
    summary: "GeoBuddy and Ari discover a city where the streets are water, people travel by boat, and ancient bridges connect islands full of art and mystery.",
    storyScript: [
      { title: "The Journey Begins", narrator: "both", content: "[GEOBUDDY] Explorer, Ari and I just arrived in a city where there are no cars, no buses, no trucks — because the streets are made of water! Everywhere we look, boats are gliding past beautiful old buildings. Some boats are long and narrow with a person standing at the back, rowing with a single oar. [ARI] GeoBuddy, this is wild! I'm standing on a bridge and below me is a canal instead of a road! People are hopping on and off boats like they're buses. Even the delivery trucks here are boats! How does a whole city work on water? [GEOBUDDY] This city is built on over a hundred tiny islands in a lagoon, Ari. The islands are connected by more than four hundred bridges! The city is slowly sinking — a little bit each year — and sometimes the water rises and floods the squares. But people have lived here for over a thousand years. Explorer, a city of islands connected by bridges where boats are the only transport — any guesses?" },
      { title: "Clues", narrator: "both", content: "[ARI] We just saw the most incredible masks in a shop window! They're decorated with gold, feathers, jewels, and glitter. A shopkeeper told me that once a year, everyone in the city dresses up in elaborate costumes and masks for a giant celebration called Carnival. People come from all over the world to see it! [GEOBUDDY] History clue, explorer! This city was once one of the most powerful trading centers in the world. Merchants sailed from here to the Far East and back, trading spices, silk, and jewels. The most famous was a man named Marco Polo, who traveled all the way to China and wrote a book about his adventures that changed how Europeans saw the world." },
      { title: "The Reveal", narrator: "both", content: "[GEOBUDDY] Explorer, we're in Venice, Italy! Those boats are gondolas, the celebration is the Venice Carnival, and this lagoon city has been enchanting visitors for centuries. Venice is built on wooden posts driven deep into the mud beneath the water — an engineering marvel! [ARI] Venice! A whole city on water! This is the coolest place ever!" },
      { title: "Explorer Map Moment", narrator: "both", content: "[GEOBUDDY] Another star on the map! You've discovered Venice! This floating city is now glowing on your map. [ARI] In Italy, people say ciao for hello and use the Euro. Venice has no roads — only canals, bridges, and walkways. [GEOBUDDY] It's one of the most unique cities ever built by humans. Keep exploring!" }
    ]
  },
  {
    cityName: "Reykjavik",
    countryName: "Iceland",
    title: "The Viking Island",
    subtitle: "Where fire meets ice and the sky dances with color",
    episodeNumber: 5,
    durationSeconds: 600,
    summary: "GeoBuddy and Ari explore a land of volcanoes, geysers, and shimmering northern lights, following the trail of ancient Viking explorers.",
    storyScript: [
      { title: "The Journey Begins", narrator: "both", content: "[GEOBUDDY] Explorer, bundle up! Ari and I are in one of the most extreme places on Earth. We're on an island in the middle of the North Atlantic Ocean, and all around us the landscape looks like another planet — steaming hot springs, black lava fields, and glaciers that stretch to the horizon. [ARI] GeoBuddy, the ground is actually warm! There's steam coming out of cracks in the rocks, and over there — whoa — a huge column of boiling water just shot up into the air like a fountain! It must be twenty meters tall! What IS that?! [GEOBUDDY] That's called a geyser, Ari! The word geyser actually comes from this country. This island sits on top of a crack in the Earth's surface where two tectonic plates are slowly pulling apart. That means there are active volcanoes, hot springs, and geysers everywhere. It's a land of fire and ice! Explorer, an island of volcanoes and geysers in the North Atlantic — any guesses?" },
      { title: "Clues", narrator: "both", content: "[ARI] It's nighttime now and GeoBuddy, LOOK AT THE SKY! There are curtains of green and purple light dancing across the darkness! It's the most beautiful thing I've ever seen! They're moving and shimmering like magic! What are those?! [GEOBUDDY] Those are the Northern Lights — the aurora borealis! And here's a history clue. This island was first settled by fierce seafaring warriors over a thousand years ago. They sailed here in longships across the open ocean. They're called Vikings, and they were some of the greatest explorers in history. Their parliament, founded here in the year 930, is one of the oldest in the world." },
      { title: "The Reveal", narrator: "both", content: "[GEOBUDDY] Explorer, we're in Reykjavik, Iceland! This small but mighty capital city is the northernmost capital in the world. The Vikings settled here over eleven hundred years ago, and today it's a city powered almost entirely by geothermal energy — heat from the Earth itself! [ARI] Reykjavik! I want to see the Northern Lights every single night!" },
      { title: "Explorer Map Moment", narrator: "both", content: "[ARI] The map is glowing again! [GEOBUDDY] You've discovered Reykjavik! This land of fire and ice is now on your map. In Iceland, people speak Icelandic — one of the oldest languages in Europe — and use the Icelandic Króna. Despite its name, Iceland is actually green and beautiful in summer! [ARI] Keep exploring!" }
    ]
  },
  {
    cityName: "Singapore",
    countryName: "Singapore",
    title: "The Lion City",
    subtitle: "Where futuristic gardens rise above a tropical island",
    episodeNumber: 6,
    durationSeconds: 600,
    summary: "GeoBuddy and Ari explore a tropical island city where giant mechanical trees glow at night and the world's best food is found in humble markets.",
    storyScript: [
      { title: "The Journey Begins", narrator: "both", content: "[GEOBUDDY] Explorer, Ari and I are in a tropical city where the future feels like it's already arrived. We're standing in a garden — but not just any garden. Giant tree-like structures tower above us, fifty meters tall, wrapped in plants and connected by sky bridges. And the heat! It's warm and humid, like being inside a greenhouse. [ARI] GeoBuddy, those trees aren't real, are they? They're made of metal and concrete but they're covered in real plants! And at night, they light up in the most amazing colors! This city looks like something from a science fiction movie! [GEOBUDDY] This is actually a city AND a country, Ari — one of the smallest in the world! It's a tropical island right near the equator, which means it's summer all year round. Despite being tiny, it's one of the busiest ports on Earth. Ships from all over the world stop here. Explorer, a tiny tropical island nation that's also a futuristic city — any guesses?" },
      { title: "Clues", narrator: "both", content: "[ARI] We just went to a food market called a hawker center, and oh my goodness, the food! There are hundreds of stalls serving food from every culture — noodles, rice dishes, curries, grilled meats, tropical fruits I've never even seen before. People say this is the best street food in the entire world! [GEOBUDDY] Legend says this city got its name when a prince from a neighboring kingdom spotted a mysterious animal on the shore — he thought it was a lion! The name literally means 'Lion City' in an ancient language. From a small fishing village, it grew into one of the most modern and prosperous cities on Earth in just a few decades." },
      { title: "The Reveal", narrator: "both", content: "[GEOBUDDY] Explorer, we're in Singapore — the Lion City! Those giant trees are the famous Supertrees at Gardens by the Bay. Singapore is one of the cleanest, greenest, and most modern cities in the world, sitting right at the tip of Southeast Asia! [ARI] Singapore! A city named after a lion! I love that story!" },
      { title: "Explorer Map Moment", narrator: "both", content: "[ARI] Another star lights up! [GEOBUDDY] You've discovered Singapore! This amazing city-state is now on your map. Singapore has four official languages — English, Mandarin, Malay, and Tamil — and uses the Singapore Dollar. [ARI] It proves that even a tiny island can become one of the greatest cities in the world! [GEOBUDDY] Keep exploring!" }
    ]
  },
  {
    cityName: "Marrakesh",
    countryName: "Morocco",
    title: "The City of Kings",
    subtitle: "Where desert caravans meet colorful markets and ancient palaces",
    episodeNumber: 7,
    durationSeconds: 600,
    summary: "GeoBuddy and Ari wander through a maze of colorful markets, fragrant spice stalls, and ancient palaces in a city at the edge of the desert.",
    storyScript: [
      { title: "The Journey Begins", narrator: "both", content: "[GEOBUDDY] Explorer, the smells here are unbelievable! Cinnamon, saffron, mint, orange blossoms — the air is filled with the most incredible fragrances. Ari and I are walking through a maze of narrow streets called a medina, and everywhere we look there are stalls selling spices, leather goods, lanterns, and carpets. [ARI] GeoBuddy, this market is like a labyrinth! Every corner leads to something new — a courtyard with a fountain, a shop filled with hundreds of colorful lanterns, a man pouring mint tea from way up high into tiny glasses. I could get lost in here for days! [GEOBUDDY] This city sits at the foot of a snow-capped mountain range in North Africa, just north of the Sahara Desert. For centuries, it was the last stop for caravans crossing the desert — traders would load up camels with gold, salt, and spices. Explorer, a North African city at the edge of the Sahara, known for its incredible markets — can you guess?" },
      { title: "Clues", narrator: "both", content: "[ARI] I just saw the most beautiful tiles! Every surface is covered in geometric patterns — stars, flowers, interlocking shapes — all made from tiny pieces of colored tile. The designs are so intricate and symmetrical, like mathematical art. And the buildings are all a warm reddish-pink color! [GEOBUDDY] Great observation, Ari! Those tiles are called zellige, and the reddish color is why this place is known as the 'Red City.' It was founded almost a thousand years ago and became a capital for several powerful dynasties. Kings and sultans built magnificent palaces, gardens, and mosques here that still stand today." },
      { title: "The Reveal", narrator: "both", content: "[GEOBUDDY] Explorer, we're in Marrakesh, Morocco — the City of Kings! This ancient Red City has been a center of trade, art, and culture for nearly a thousand years. The main square, called Jemaa el-Fnaa, comes alive at night with storytellers, musicians, and food stalls! [ARI] Marrakesh! The colors and smells here are unforgettable!" },
      { title: "Explorer Map Moment", narrator: "both", content: "[ARI] The map glows again! [GEOBUDDY] You've discovered Marrakesh! This vibrant city is now on your map. In Morocco, people speak Arabic and French, and use the Moroccan Dirham. Marrakesh sits where the Sahara Desert meets the Atlas Mountains — a crossroads of cultures for centuries. [ARI] Keep exploring!" }
    ]
  },
  {
    cityName: "Sydney",
    countryName: "Australia",
    title: "The Harbor of Dreams",
    subtitle: "Where white sails sparkle on the world's most famous harbor",
    episodeNumber: 8,
    durationSeconds: 600,
    summary: "GeoBuddy and Ari discover a sunny harbor city where a building shaped like sails sits next to one of the world's most famous bridges.",
    storyScript: [
      { title: "The Journey Begins", narrator: "both", content: "[GEOBUDDY] G'day explorer! Ari and I are in a place where the sun is shining, the ocean is sparkling blue, and we can see the most unusual building ever. It looks like giant white sails catching the wind on the edge of a beautiful harbor! [ARI] GeoBuddy, there's a massive bridge over the harbor and people are actually climbing on top of it! They're wearing safety gear and walking all the way to the peak. From up there you can see the whole city, the ocean, and beaches that go on forever! [GEOBUDDY] This city is on a continent where many animals exist nowhere else on Earth, Ari. There are animals that hop on two legs and carry their babies in pouches, and others that sleep in eucalyptus trees all day. This continent is also the flattest and driest inhabited continent. Explorer, hopping animals with pouches and sleepy tree-dwellers — where could we be?" },
      { title: "Clues", narrator: "both", content: "[ARI] The beach here has golden sand and the biggest waves I've ever seen! Surfers are riding them all day long. There are people in yellow and red caps swimming between flags to keep everyone safe. They're called lifeguards and they're real heroes. Beach culture here is a way of life! [GEOBUDDY] The first people to live on this land arrived over sixty-five thousand years ago — making their culture the oldest continuous culture on Earth. They're called Aboriginal Australians, and they have incredible art, stories, and knowledge of the land. This city's harbor has been an important meeting place for thousands of years." },
      { title: "The Reveal", narrator: "both", content: "[GEOBUDDY] We're in Sydney, Australia! The sail building is the Sydney Opera House, the bridge is the Sydney Harbour Bridge, and those animals are kangaroos and koalas! Sydney is the largest city in Australia with over five million people. [ARI] Sydney! I want to learn to surf here!" },
      { title: "Explorer Map Moment", narrator: "both", content: "[ARI] Another star shines on the map! [GEOBUDDY] You've discovered Sydney! This beautiful harbor city is now glowing on your map. Australians speak English and use the Australian Dollar. Did you know Sydney is in the Southern Hemisphere, so when it's winter where you are, it might be summer here! [ARI] Keep exploring!" }
    ]
  },
  {
    cityName: "Athens",
    countryName: "Greece",
    title: "The Ancient Olympic City",
    subtitle: "Where marble temples stand guard over the birthplace of ideas",
    episodeNumber: 9,
    durationSeconds: 600,
    summary: "GeoBuddy and Ari climb a hill crowned with marble temples to discover the city where democracy, philosophy, and the Olympic Games were born.",
    storyScript: [
      { title: "The Journey Begins", narrator: "both", content: "[GEOBUDDY] Explorer, Ari and I are climbing a rocky hill in the middle of a busy modern city. But at the top of this hill stands something incredible — enormous marble columns holding up what's left of an ancient temple. It's been here for almost two thousand five hundred years! [ARI] GeoBuddy, the view from up here is amazing! I can see the whole city spread out below us, with white buildings stretching to the sea. And this temple — even though parts of it are broken, it's still the most beautiful building I've ever seen. The columns are so tall and perfectly shaped! [GEOBUDDY] This city is in southern Europe, on a peninsula surrounded by the Mediterranean Sea. The land here is rocky and hilly, with olive trees everywhere and islands dotting the blue waters. This country has thousands of islands — more than six thousand! Explorer, a Mediterranean country with thousands of islands and ancient marble temples — any guesses?" },
      { title: "Clues", narrator: "both", content: "[ARI] We just visited a little restaurant and the food is incredible! There's a salad with tomatoes, cucumbers, olives, and white cheese, and these flaky pastries filled with spinach. The olive oil here tastes like nothing I've ever had. People sit outside at cafe tables, talking and laughing late into the evening. [GEOBUDDY] Here's a big clue, explorer. This city is where some of the most important ideas in human history were born. People here invented democracy — the idea that citizens should vote on their own laws. They also created the Olympic Games almost three thousand years ago! Philosophers like Socrates and Plato walked these very streets, asking big questions about life and the universe." },
      { title: "The Reveal", narrator: "both", content: "[GEOBUDDY] Explorer, we're in Athens, Greece! That temple on the hill is the Parthenon, sitting atop the Acropolis. Athens is often called the birthplace of Western civilization — democracy, theater, philosophy, and the Olympics all started here! [ARI] Athens! The place where the Olympics began! That's so cool!" },
      { title: "Explorer Map Moment", narrator: "both", content: "[ARI] The map is glowing brighter! [GEOBUDDY] You've discovered Athens! This legendary city is now on your map. In Greece, people say yia sou for hello and use the Euro. Athens has been continuously inhabited for over three thousand years, making it one of the oldest cities in the world. [ARI] Keep exploring!" }
    ]
  },
  {
    cityName: "New York",
    countryName: "USA",
    title: "The City That Never Sleeps",
    subtitle: "Where the whole world lives on one incredible island",
    episodeNumber: 10,
    durationSeconds: 600,
    summary: "GeoBuddy and Ari explore a city of towering skyscrapers, yellow taxis, and a green statue holding a torch high above the harbor.",
    storyScript: [
      { title: "The Journey Begins", narrator: "both", content: "[GEOBUDDY] Explorer, Ari and I are standing in the middle of the most famous park in the world. It's right in the center of a giant island, surrounded by skyscrapers on every side. Squirrels are running around, horse carriages are clip-clopping past, and you can hear about ten different languages being spoken around us. [ARI] GeoBuddy, I've never seen so many yellow cars! They're everywhere! And the streets have numbers instead of names. We're on something called Broadway, and there are bright lights and theaters showing musicals. I can hear singing coming from inside! [GEOBUDDY] This city sits where a river meets the Atlantic Ocean. The main part of the city is actually on an island! But the city also spreads across four other areas connected by famous bridges and tunnels. Over eight million people live here, speaking more than eight hundred different languages. Explorer, an island city with eight hundred languages — where could this be?" },
      { title: "Clues", narrator: "both", content: "[ARI] I just had the biggest slice of pizza I've ever seen — you have to fold it in half to eat it! The person next to me was eating a bagel with cream cheese. Food here comes from every country in the world because people from everywhere live here. It's like the whole planet in one city! [GEOBUDDY] Here's a big clue. There's a green statue in the harbor holding a torch up high. She was a gift from France over a hundred years ago, and she welcomes everyone who arrives. She represents freedom and hope. For millions of immigrants, she was the first thing they saw when they arrived by ship to start a new life." },
      { title: "The Reveal", narrator: "both", content: "[GEOBUDDY] It's New York City, United States! That statue is the Statue of Liberty, the park is Central Park, and we're on the island of Manhattan. New York is one of the most diverse and exciting cities in the entire world! [ARI] New York City! The Big Apple! I want to eat pizza here every day!" },
      { title: "Explorer Map Moment", narrator: "both", content: "[ARI] Another star on the map! [GEOBUDDY] You've discovered New York City! The Big Apple is now glowing on your map. New York is home to the United Nations, where countries from around the world work together for peace. People here say hello in hundreds of languages every single day. [ARI] Keep exploring!" }
    ]
  },
  {
    cityName: "Rio de Janeiro",
    countryName: "Brazil",
    title: "The Jungle Giant",
    subtitle: "Where rainforest mountains meet golden beaches and samba rhythms",
    episodeNumber: 11,
    durationSeconds: 600,
    summary: "GeoBuddy and Ari discover a city of samba rhythms, golden beaches, and a giant statue watching over everything from a mountaintop.",
    storyScript: [
      { title: "The Journey Begins", narrator: "both", content: "[GEOBUDDY] Explorer! GeoBuddy and Ari here, and we can hear drums! Everywhere around us, people are dancing to a rhythm called samba. The beat makes you want to move your feet! We're in a city surrounded by mountains covered in tropical jungle, with golden beaches curving along the coast. [ARI] GeoBuddy, the beach here is shaped like a crescent moon and the sand is the softest I've ever felt! People are playing with a small ball using only their feet and heads — no hands allowed! The waves are perfect and the water is warm and blue. [GEOBUDDY] This city is in South America, Ari, on the coast of the Atlantic Ocean. What makes it special is that tropical rainforest grows right inside the city — on the mountains that rise up between the neighborhoods. It's one of the only cities in the world where you can go from the beach to the jungle in minutes. Explorer, a South American coastal city with jungle-covered mountains — any ideas?" },
      { title: "Clues", narrator: "both", content: "[ARI] We just saw the most incredible parade! People are wearing costumes covered in feathers and sparkles. It's called Carnival, and it's the biggest party in the world! Millions of people come to dance, sing, and celebrate together for days! [GEOBUDDY] Here's the biggest clue yet. On top of the tallest mountain, there's a huge statue of a figure with arms wide open, like it's giving the whole city a hug. The statue is so tall you can see it from almost anywhere in the city. It was built almost a hundred years ago and has become one of the most recognized landmarks on Earth." },
      { title: "The Reveal", narrator: "both", content: "[GEOBUDDY] It's Rio de Janeiro, Brazil! The statue is Christ the Redeemer standing on Corcovado Mountain, the beach is the famous Copacabana, and that sport they're playing is called footvolley. Rio is home to over six million people! [ARI] Rio! I want to dance samba on the beach!" },
      { title: "Explorer Map Moment", narrator: "both", content: "[ARI] The map lights up again! [GEOBUDDY] You've discovered Rio de Janeiro! This vibrant city is now on your map. In Brazil, people speak Portuguese and say olá for hello. The currency is the Brazilian Real. Rio is a city where the rainforest, mountains, and ocean all meet in one beautiful place. [ARI] Almost there, explorer — one more mystery awaits! [GEOBUDDY] Keep exploring!" }
    ]
  },
  {
    cityName: "Istanbul",
    countryName: "Turkey",
    title: "The Bridge Between Worlds",
    subtitle: "Where two continents meet and empires left their mark",
    episodeNumber: 12,
    durationSeconds: 600,
    summary: "GeoBuddy and Ari discover the only city in the world that sits on two continents, where spice markets and ancient mosques tell the story of empires.",
    storyScript: [
      { title: "The Journey Begins", narrator: "both", content: "[GEOBUDDY] Explorer, Ari and I are in a city like no other. We're standing on a bridge, and here's what makes it incredible — one end of this bridge is in Europe, and the other end is in Asia! This is the only city in the world that sits on two continents at once. [ARI] GeoBuddy, that's mind-blowing! I can literally walk from one continent to another! The water below is busy with ferries and fishing boats, and on both sides I can see domes and towers rising above the rooftops. This city feels like it belongs to the whole world. [GEOBUDDY] A narrow strait of water called the Bosphorus runs right through this city, separating Europe from Asia. The city sits on hills, and from the top you can see both continents, the sea, and the entrance to a body of water that connects to the Mediterranean. Explorer, a city on two continents divided by a strait — any guesses?" },
      { title: "Clues", narrator: "both", content: "[ARI] We just went to the most amazing covered market! It's one of the oldest and largest in the world — over four thousand shops under one roof! There are mountains of colorful spices, hand-painted ceramics, silk scarves, and Turkish delight — these sweet, powdery candy cubes that melt in your mouth! [GEOBUDDY] This city has been the capital of three different empires — Roman, Byzantine, and Ottoman. It's changed names several times throughout history. One of its most famous buildings was built over fifteen hundred years ago as the largest cathedral in the world, then became a mosque, and is now a museum. Its massive dome was an engineering wonder of the ancient world." },
      { title: "The Reveal", narrator: "both", content: "[GEOBUDDY] Explorer, we're in Istanbul, Turkey! That incredible building is the Hagia Sophia, the market is the Grand Bazaar, and the strait is the Bosphorus. Istanbul has been one of the most important cities in human history for over two thousand years! [ARI] Istanbul! A city on two continents! That's the most amazing thing I've ever heard!" },
      { title: "Explorer Map Moment", narrator: "both", content: "[ARI] The final star lights up! [GEOBUDDY] You've discovered Istanbul! This bridge between worlds is now on your map. In Turkey, people say merhaba for hello and use the Turkish Lira. Istanbul is the only city on Earth that spans two continents — a perfect place to end our first season of adventures. [ARI] But don't worry, explorer — there's a whole world still waiting to be discovered. Season two is coming. [GEOBUDDY] Keep exploring!" }
    ]
  }
];

const SEASON_START_DATE = new Date("2026-03-01T00:00:00Z");

export async function seedGeoBuddyStories() {
  const existing = await db.select({ id: geoBuddyStories.id, title: geoBuddyStories.title }).from(geoBuddyStories);

  const expectedTitles = SEASON_1_EPISODES.map(e => e.title);
  const existingTitles = existing.map(e => e.title);
  const needsReseed = existing.length !== SEASON_1_EPISODES.length ||
    !expectedTitles.every(t => existingTitles.includes(t));

  if (needsReseed && existing.length > 0) {
    console.log(`🔄 Re-seeding GeoBuddy Stories (found ${existing.length}, expected ${SEASON_1_EPISODES.length})`);
    await db.delete(geoBuddyStories);
  } else if (!needsReseed) {
    const allCities = await db.select().from(dailyQuestCities);
    let updated = 0;
    for (const episode of SEASON_1_EPISODES) {
      const city = allCities.find(
        c => c.city.toLowerCase() === episode.cityName.toLowerCase() &&
             c.country.toLowerCase() === episode.countryName.toLowerCase()
      );
      if (!city) continue;
      const existingStory = await db.select().from(geoBuddyStories)
        .where(eq(geoBuddyStories.title, episode.title)).limit(1);
      if (existingStory.length > 0) {
        const current = existingStory[0];
        const currentScript = JSON.stringify(current.storyScript);
        const newScript = JSON.stringify(episode.storyScript);
        if (currentScript !== newScript) {
          await db.update(geoBuddyStories)
            .set({ storyScript: episode.storyScript })
            .where(eq(geoBuddyStories.id, current.id));
          updated++;
        }
      }
    }
    if (updated > 0) {
      console.log(`🔄 Updated ${updated} GeoBuddy Story scripts (inline SFX)`);
    } else {
      console.log("✅ GeoBuddy Stories already seeded (Season 1)");
    }
    return;
  }

  const allCities = await db.select().from(dailyQuestCities);

  let seeded = 0;
  for (const episode of SEASON_1_EPISODES) {
    const city = allCities.find(
      c => c.city.toLowerCase() === episode.cityName.toLowerCase() &&
           c.country.toLowerCase() === episode.countryName.toLowerCase()
    );

    if (!city) {
      console.warn(`⚠️ City not found for story: ${episode.cityName}, ${episode.countryName}`);
      continue;
    }

    const releaseDate = new Date(SEASON_START_DATE);
    releaseDate.setDate(releaseDate.getDate() + (episode.episodeNumber - 1) * 7);

    const now = new Date();
    const isReleased = releaseDate <= now;

    await db.insert(geoBuddyStories).values({
      cityId: city.id,
      title: episode.title,
      subtitle: episode.subtitle,
      seasonNumber: 1,
      episodeNumber: episode.episodeNumber,
      durationSeconds: episode.durationSeconds,
      summary: episode.summary,
      storyScript: episode.storyScript,
      releaseDate: releaseDate,
      isReleased: isReleased,
      coverImageUrl: city.imageUrl,
    });
    seeded++;
  }

  console.log(`✅ Seeded ${seeded} GeoBuddy Stories (Season 1)`);
}
