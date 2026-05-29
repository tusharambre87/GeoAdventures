export interface GeographyFact {
  topic: string;
  keywords: string[];
  response: string;
  ageAppropriate: 'all' | 'young' | 'older';
}

export const geographyFacts: GeographyFact[] = [
  {
    topic: "Paris",
    keywords: ["paris", "france", "eiffel tower", "french"],
    response: "Paris is the capital of France! It's famous for the Eiffel Tower, which is a giant iron tower that sparkles at night. People in Paris eat delicious croissants for breakfast and speak French. The city is also known as the 'City of Light' because it was one of the first cities to have street lights!",
    ageAppropriate: "all"
  },
  {
    topic: "Tokyo",
    keywords: ["tokyo", "japan", "japanese"],
    response: "Tokyo is the capital of Japan! It's one of the biggest cities in the world with lots of people, tall buildings, and super fast trains called bullet trains. Kids in Tokyo love anime and manga, and they eat yummy sushi and ramen. Cherry blossom trees make the city pink and beautiful in spring!",
    ageAppropriate: "all"
  },
  {
    topic: "London",
    keywords: ["london", "england", "uk", "united kingdom", "british", "big ben"],
    response: "London is the capital of the United Kingdom! It has a famous clock tower called Big Ben that goes 'bong' every hour. The Queen used to live in Buckingham Palace there. People in London drink lots of tea and ride red double-decker buses. You can also see the Tower of London where the Crown Jewels are kept!",
    ageAppropriate: "all"
  },
  {
    topic: "Australia",
    keywords: ["australia", "australian", "sydney", "kangaroo", "koala"],
    response: "Australia is a huge country that's also a continent! It has amazing animals you can't find anywhere else - like kangaroos that hop and carry babies in their pouches, and cuddly koalas that sleep in eucalyptus trees. The Great Barrier Reef near Australia is the world's biggest coral reef with colorful fish!",
    ageAppropriate: "all"
  },
  {
    topic: "Africa Animals",
    keywords: ["africa", "african animals", "safari", "lion", "elephant", "giraffe", "zebra"],
    response: "Africa is home to some of the most amazing animals on Earth! Lions are called the 'King of the Jungle' and live in groups called prides. Elephants are the biggest land animals and have long trunks for drinking water. Giraffes have super long necks to eat leaves from tall trees. Zebras look like horses wearing stripy pajamas!",
    ageAppropriate: "all"
  },
  {
    topic: "Antarctica",
    keywords: ["antarctica", "penguin", "south pole", "ice"],
    response: "Antarctica is the coldest place on Earth - it's covered in ice and snow all year! Penguins live there and waddle around on the ice. Even though it's freezing, scientists from all around the world live in special research stations there. No country owns Antarctica - it belongs to everyone!",
    ageAppropriate: "all"
  },
  {
    topic: "Egypt",
    keywords: ["egypt", "pyramids", "pharaoh", "nile", "sphinx"],
    response: "Egypt is a country in Africa famous for its ancient pyramids! The pyramids were built thousands of years ago as tombs for kings called Pharaohs. The Great Sphinx has the body of a lion and the head of a human. The Nile River flows through Egypt - it's one of the longest rivers in the world and helped ancient Egyptians grow food!",
    ageAppropriate: "all"
  },
  {
    topic: "China",
    keywords: ["china", "chinese", "great wall", "panda", "beijing"],
    response: "China is one of the biggest countries in the world! It has the Great Wall of China, which is so long you can see it from space. Giant pandas live in China and love eating bamboo all day. People in China invented paper, fireworks, and noodles! They celebrate Chinese New Year with dragon dances and red lanterns.",
    ageAppropriate: "all"
  },
  {
    topic: "Brazil",
    keywords: ["brazil", "brazilian", "amazon", "rio", "rainforest"],
    response: "Brazil is the biggest country in South America! The Amazon Rainforest is there - it's the largest rainforest on Earth and home to colorful parrots, monkeys, and jaguars. Brazilians love playing soccer and dancing to samba music. The city of Rio de Janeiro has a giant statue called Christ the Redeemer on top of a mountain!",
    ageAppropriate: "all"
  },
  {
    topic: "India",
    keywords: ["india", "indian", "taj mahal", "elephant", "tiger"],
    response: "India is a colorful country with over a billion people! The Taj Mahal is a beautiful white marble building that looks like a palace from a fairy tale. India is home to Bengal tigers and Asian elephants. People in India celebrate Holi, a fun festival where everyone throws colorful powder at each other!",
    ageAppropriate: "all"
  },
  {
    topic: "Oceans",
    keywords: ["ocean", "sea", "pacific", "atlantic", "water"],
    response: "Earth has five oceans! The Pacific Ocean is the biggest - it covers more space than all the land on Earth combined! The Atlantic Ocean is between the Americas and Europe/Africa. Oceans are home to whales, dolphins, sharks, and millions of fish. More than 70% of our planet is covered by water!",
    ageAppropriate: "all"
  },
  {
    topic: "Mountains",
    keywords: ["mountain", "everest", "himalaya", "alps"],
    response: "Mountains are the tallest places on Earth! Mount Everest is the highest mountain - it's so tall that the top has snow all year and it's hard to breathe up there. The Himalayas are a huge mountain range in Asia. Mountains are formed when the Earth's crust pushes up over millions of years!",
    ageAppropriate: "all"
  },
  {
    topic: "Continents",
    keywords: ["continent", "continents", "how many continents"],
    response: "There are 7 continents on Earth! They are: Africa, Antarctica, Asia, Australia, Europe, North America, and South America. Asia is the biggest continent, and Australia is the smallest. Antarctica is the only continent with no countries - just ice, penguins, and scientists!",
    ageAppropriate: "all"
  },
  {
    topic: "Flags",
    keywords: ["flag", "flags", "country flag"],
    response: "Every country has its own special flag! Flags use colors and symbols that mean something important to that country. Japan's flag has a red circle for the sun. The USA flag has 50 stars for its 50 states. Nepal is the only country with a flag that isn't rectangular - it has two triangles!",
    ageAppropriate: "all"
  },
  {
    topic: "Volcanoes",
    keywords: ["volcano", "lava", "eruption"],
    response: "Volcanoes are mountains that can erupt with hot lava! Inside the Earth, it's so hot that rock melts. When pressure builds up, the volcano erupts and lava flows out. Hawaii was made by volcanoes erupting under the ocean! Some volcanoes are 'sleeping' and haven't erupted in a long time.",
    ageAppropriate: "all"
  },
  {
    topic: "Mexico",
    keywords: ["mexico", "mexican", "tacos"],
    response: "Mexico is a country in North America, just south of the USA! It's famous for delicious food like tacos, burritos, and guacamole. Ancient Mayans and Aztecs built amazing pyramids there long ago. Mexicans celebrate Día de los Muertos (Day of the Dead) with colorful decorations and music!",
    ageAppropriate: "all"
  },
  {
    topic: "Canada",
    keywords: ["canada", "canadian", "maple", "hockey"],
    response: "Canada is the second biggest country in the world! It has beautiful mountains, forests, and lots of lakes. The maple leaf on the Canadian flag represents the maple trees that make yummy maple syrup. Canadians love hockey and are known for being very friendly and polite!",
    ageAppropriate: "all"
  },
  {
    topic: "Italy",
    keywords: ["italy", "italian", "pizza", "rome", "pasta"],
    response: "Italy is shaped like a boot! It's famous for inventing pizza and pasta - yum! Rome, the capital, has ancient buildings like the Colosseum where gladiators used to fight. Venice is a special Italian city with canals instead of streets - people travel by boats called gondolas!",
    ageAppropriate: "all"
  },
  {
    topic: "Greece",
    keywords: ["greece", "greek", "athens", "olympics"],
    response: "Greece is where the Olympic Games were invented thousands of years ago! Ancient Greeks built beautiful temples and told stories about gods like Zeus. Athens is the capital city and has the Parthenon, an ancient temple on top of a hill. Greece has lots of sunny islands with blue water!",
    ageAppropriate: "all"
  },
  {
    topic: "Russia",
    keywords: ["russia", "russian", "moscow", "kremlin"],
    response: "Russia is the biggest country in the world! It's so big that it has 11 different time zones. Moscow is the capital and has the colorful Saint Basil's Cathedral with onion-shaped domes. Russia has cold, snowy winters and is home to Siberian tigers and brown bears!",
    ageAppropriate: "all"
  },
  {
    topic: "How to Play Guess & Go",
    keywords: ["how to play", "guess and go", "main game", "how does", "what is guess"],
    response: "Guess & Go is our main geography game! 🎮 You'll see clues about a mystery city or country - things like landmarks, food, or animals from that place. Use the C.L.U.E. steps to figure it out: Look & Learn at the hints, Use Your Thinking to guess, and Explore & Evolve to learn more! You earn stars for correct guesses!",
    ageAppropriate: "all"
  },
  {
    topic: "How to Play Daily Quest",
    keywords: ["daily quest", "how daily", "what is daily"],
    response: "Daily Quest is a special game you can play once every day! 🌟 You get clues about a mystery city, and you have to guess which city it is. If you guess correctly, you earn a city sticker! Collect 5 stickers from the same country to trade for a special coloring sheet reward. Come back every day to build your streak!",
    ageAppropriate: "all"
  },
  {
    topic: "How to Play Crossworld",
    keywords: ["crossworld", "word search", "how crossworld", "what is crossworld"],
    response: "Crossworld is like a word search puzzle! 🧩 Hidden in a grid of letters are the names of capital cities. Swipe across letters to find the hidden capitals. You can play on Easy mode (7x7 grid) or Hard mode (8x8 grid). Use hints if you get stuck! Try to find all the capitals as fast as you can!",
    ageAppropriate: "all"
  },
  {
    topic: "How to Play Find My Home",
    keywords: ["find my home", "animal game", "how find my", "what is find my home"],
    response: "Find My Home is perfect for young explorers! 🦁🌍 Animals need your help finding where they live! You'll see an animal and need to pick the right continent or country where it lives. Lions live in Africa, pandas in China, kangaroos in Australia! It's a fun way to learn where animals come from!",
    ageAppropriate: "all"
  },
  {
    topic: "How to Play Spell Geo",
    keywords: ["spell geo", "spelling game", "how spell", "what is spell geo"],
    response: "Spell Geo helps you learn geography by spelling! ✍️ You'll see a hint about a US state, and some letters are missing. Fill in the blanks to spell the state name correctly! It helps you learn state names and builds your spelling skills. The more you play, the better you'll remember!",
    ageAppropriate: "all"
  },
  {
    topic: "What is GeoQuest",
    keywords: ["what is geoquest", "about geoquest", "this app", "this game"],
    response: "GeoQuest is a fun geography learning app for kids! 🌍 We have lots of mini-games to help you learn about countries, cities, animals, and landmarks around the world. You can play Guess & Go, Daily Quest, Crossworld, Find My Home, and Spell Geo! Each game teaches you something new about our amazing planet!",
    ageAppropriate: "all"
  },
  {
    topic: "Stickers and Rewards",
    keywords: ["sticker", "reward", "coloring", "prizes", "what can i win"],
    response: "You can earn awesome rewards! 🎁 Win city stickers in Daily Quest - collect 5 stickers from the same country to trade for a special coloring sheet! You also earn stars in all games that count toward achievements. Check your Sticker Book to see your collection and the Passport for cities you've mastered!",
    ageAppropriate: "all"
  },
  {
    topic: "What are Stars",
    keywords: ["stars", "how earn stars", "what are stars"],
    response: "Stars are points you earn for playing well! ⭐ You get stars for correct answers in games. The more stars you collect, the more achievements you unlock! Stars show how much you've learned. Try to earn 3 stars in each game for the best score!",
    ageAppropriate: "all"
  },
  {
    topic: "Treasure Vault",
    keywords: ["treasure vault", "mini games", "bonus games"],
    response: "The Treasure Vault has extra fun mini-games! 🏆 Play Memory Match to test your memory with flag cards, take the Flag Quiz to identify country flags, or Spin the Globe for random geography challenges! You can unlock these games with stickers you've earned!",
    ageAppropriate: "all"
  }
];

export function findFactByKeyword(query: string): GeographyFact | null {
  const lowerQuery = query.toLowerCase();
  
  for (const fact of geographyFacts) {
    for (const keyword of fact.keywords) {
      if (lowerQuery.includes(keyword)) {
        return fact;
      }
    }
  }
  
  return null;
}

export const suggestedTopics = [
  { emoji: "🗼", text: "Tell me about Paris" },
  { emoji: "🇯🇵", text: "What's Tokyo like?" },
  { emoji: "🦁", text: "African animals" },
  { emoji: "🐼", text: "Tell me about China" },
  { emoji: "🌋", text: "How do volcanoes work?" },
  { emoji: "🗻", text: "What's the tallest mountain?" },
  { emoji: "🌊", text: "Tell me about the oceans" },
  { emoji: "🐧", text: "What lives in Antarctica?" },
  { emoji: "🦘", text: "Animals in Australia" },
  { emoji: "🏛️", text: "Ancient Egypt" },
  { emoji: "🎮", text: "How to play Guess & Go" },
  { emoji: "🌟", text: "How does Daily Quest work?" },
  { emoji: "🧩", text: "How to play Crossworld" },
];

export const winCelebrations = [
  "Amazing job! You're becoming a geography expert! 🌟",
  "Woohoo! You did it! Your brain is growing bigger! 🧠✨",
  "Incredible! You know so much about the world! 🌍🎉",
  "Way to go, explorer! You're on fire! 🔥⭐",
  "Fantastic! Keep exploring and learning! 🚀",
];

export const hintSuggestions = [
  "Need a hint? Think about what continent this might be in! 🗺️",
  "Stuck? Look for clues about the weather or food! 🍕☀️",
  "Hint: The flag colors might give you a clue! 🏳️",
  "Try thinking about famous landmarks from this place! 🏛️",
  "Here's a tip: What language might people speak there? 🗣️",
];

export function getRandomCelebration(): string {
  return winCelebrations[Math.floor(Math.random() * winCelebrations.length)];
}

export function getRandomHint(): string {
  return hintSuggestions[Math.floor(Math.random() * hintSuggestions.length)];
}
