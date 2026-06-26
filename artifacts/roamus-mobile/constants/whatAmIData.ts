import AsyncStorage from "@react-native-async-storage/async-storage";

export type WhatAmIPuzzle = {
  id: string;
  answer: string;
  category: 'travel' | 'general';
  clues: [string, string, string];
  hardClues: [string, string, string, string, string];
  easyOptions: [string, string, string, string];
  funFact: string;
  pronunciation?: string;
};

export const CLUE_POINTS = [3, 2, 1] as const;

export const WHAT_AM_I_PUZZLES: WhatAmIPuzzle[] = [

// ── ANIMALS (20) ──────────────────────────────

{ id: 'wa-001', answer: 'BISON', category: 'travel',
  clues: [
    "I am one of the largest animals in North America.",
    "I once roamed the plains in herds of millions.",
    "Cowboys called me a buffalo but that is not my real name."
  ],
  hardClues: [
    "I am one of the largest animals in North America.",
    "I have a massive shoulder hump and a thick shaggy brown coat.",
    "I once roamed the plains in herds of millions.",
    "I nearly went extinct in the 1800s when hunters killed tens of millions of us in just decades.",
    "Cowboys called me a buffalo but that is not my real name."
  ],
  easyOptions: ['BISON', 'MOOSE', 'ELK', 'CARIBOU'],
  funFact: "Bison can run up to 35 mph — faster than most horses over short distances.",
  pronunciation: 'BY-sun'
},

{ id: 'wa-002', answer: 'DOLPHIN', category: 'travel',
  clues: [
    "I live in the water but I breathe air.",
    "I communicate using clicks and whistles.",
    "I am grey and love to swim alongside people."
  ],
  hardClues: [
    "I live in the water but I breathe air.",
    "I am one of the most intelligent animals on Earth.",
    "I communicate using clicks and whistles.",
    "I am known for leaping out of the water and riding the waves of boats.",
    "I am grey and love to swim alongside people."
  ],
  easyOptions: ['DOLPHIN', 'SHARK', 'SEAL', 'PORPOISE'],
  funFact: "Dolphins sleep with one eye open — half their brain stays awake to keep watch."
},

{ id: 'wa-003', answer: 'BEAR', category: 'travel',
  clues: [
    "I am a large wild animal that loves to eat.",
    "I can smell food from 20 miles away.",
    "I love salmon and honey."
  ],
  hardClues: [
    "I am a large wild animal that loves to eat.",
    "I sleep through the entire winter in a den.",
    "I can smell food from 20 miles away.",
    "I spend the fall eating as much as possible to fatten up for winter.",
    "I love salmon and honey."
  ],
  easyOptions: ['BEAR', 'WOLF', 'MOUNTAIN LION', 'WOLVERINE'],
  funFact: "A bear's sense of smell is 7 times stronger than a bloodhound's.",
  pronunciation: 'BAYR'
},

{ id: 'wa-004', answer: 'EAGLE', category: 'travel',
  clues: [
    "I am a powerful bird that soars high in the sky.",
    "I build the largest nest of any bird in North America.",
    "My white head and tail make me easy to spot near rivers and coasts."
  ],
  hardClues: [
    "I am a powerful bird that soars high in the sky.",
    "I am the national symbol of the United States.",
    "I build the largest nest of any bird in North America.",
    "I can spot a rabbit from two miles away and dive at 100 miles per hour.",
    "My white head and tail make me easy to spot near rivers and coasts."
  ],
  easyOptions: ['EAGLE', 'HAWK', 'OSPREY', 'VULTURE'],
  funFact: "A bald eagle's nest can weigh over a ton after years of adding sticks and branches."
},

{ id: 'wa-005', answer: 'WHALE', category: 'travel',
  clues: [
    "I am the largest creature on Earth.",
    "I sing songs that can travel hundreds of miles underwater.",
    "When I surface I shoot a tall spray of water into the air."
  ],
  hardClues: [
    "I am the largest creature on Earth.",
    "I migrate thousands of miles between feeding and breeding grounds each year.",
    "I sing songs that can travel hundreds of miles underwater.",
    "Despite my enormous size I eat tiny shrimp-like creatures called krill by the ton.",
    "When I surface I shoot a tall spray of water into the air."
  ],
  easyOptions: ['WHALE', 'DOLPHIN', 'GIANT SQUID', 'MANATEE'],
  funFact: "A blue whale's heart is the size of a small car and beats only 8 times per minute."
},

{ id: 'wa-006', answer: 'MOOSE', category: 'travel',
  clues: [
    "I am the tallest animal in North America.",
    "The males grow giant antlers that fall off every winter.",
    "You might spot me wading in a lake in Maine or Canada."
  ],
  hardClues: [
    "I am the tallest animal in North America.",
    "I have a drooping nose and a flap of skin called a bell hanging under my throat.",
    "The males grow giant antlers that fall off every winter.",
    "I am surprisingly comfortable in deep water and can swim several miles.",
    "You might spot me wading in a lake in Maine or Canada."
  ],
  easyOptions: ['MOOSE', 'ELK', 'REINDEER', 'CARIBOU'],
  funFact: "Moose antlers can grow an inch per day — the fastest-growing tissue of any mammal."
},

{ id: 'wa-007', answer: 'SEA TURTLE', category: 'travel',
  clues: [
    "I have existed on Earth for over 100 million years.",
    "I breathe air but spend almost my entire life in the ocean.",
    "I am a gentle slow swimmer often spotted by snorkelers on coral reefs."
  ],
  hardClues: [
    "I have existed on Earth for over 100 million years.",
    "My shell is made of over 60 bones fused together and covered in plates.",
    "I breathe air but spend almost my entire life in the ocean.",
    "Females return to the exact beach where they were born to lay their eggs.",
    "I am a gentle slow swimmer often spotted by snorkelers on coral reefs."
  ],
  easyOptions: ['SEA TURTLE', 'STINGRAY', 'CRAB', 'MANATEE'],
  funFact: "Sea turtles navigate using the Earth's magnetic field like a living compass."
},

{ id: 'wa-008', answer: 'WOLF', category: 'travel',
  clues: [
    "I am a wild animal that lives and hunts in a family group.",
    "I was reintroduced to Yellowstone in 1995 and changed the entire ecosystem.",
    "I look like a large dog but I am completely wild."
  ],
  hardClues: [
    "I am a wild animal that lives and hunts in a family group.",
    "I howl to communicate with my pack across long distances.",
    "I was reintroduced to Yellowstone in 1995 and changed the entire ecosystem.",
    "My howl can be heard up to 10 miles away on a still night.",
    "I look like a large dog but I am completely wild."
  ],
  easyOptions: ['WOLF', 'COYOTE', 'FOX', 'DINGO'],
  funFact: "When wolves returned to Yellowstone the rivers actually changed course — wolves kept deer moving which let riverbanks regrow."
},

{ id: 'wa-009', answer: 'FLAMINGO', category: 'travel',
  clues: [
    "I am a bird known for standing on one leg.",
    "My color comes entirely from what I eat.",
    "I am bright pink and famous for living in warm tropical lagoons."
  ],
  hardClues: [
    "I am a bird known for standing on one leg.",
    "I am born with grey feathers that change color as I grow.",
    "My color comes entirely from what I eat.",
    "I eat with my head upside down filtering tiny creatures from shallow water.",
    "I am bright pink and famous for living in warm tropical lagoons."
  ],
  easyOptions: ['FLAMINGO', 'PELICAN', 'IBIS', 'SPOONBILL'],
  funFact: "Flamingos are pink because of pigments in the shrimp and algae they eat. Zoo flamingos turn white without the right diet."
},

{ id: 'wa-010', answer: 'OCTOPUS', category: 'travel',
  clues: [
    "I have eight arms and no bones at all.",
    "I squirt ink to confuse predators trying to catch me.",
    "I am found on coral reefs and rocky ocean floors around the world."
  ],
  hardClues: [
    "I have eight arms and no bones at all.",
    "I can change color and texture in less than a second to hide from predators.",
    "I squirt ink to confuse predators trying to catch me.",
    "I am considered one of the most intelligent creatures in the ocean.",
    "I am found on coral reefs and rocky ocean floors around the world."
  ],
  easyOptions: ['OCTOPUS', 'SQUID', 'JELLYFISH', 'SEA CUCUMBER'],
  funFact: "Octopuses have three hearts and blue blood. Two hearts pump blood to the gills, one pumps it to the body."
},

{ id: 'wa-011', answer: 'PENGUIN', category: 'travel',
  clues: [
    "I am a bird but I cannot fly.",
    "I live in large colonies and recognize my partner by their voice.",
    "I am black and white and waddle when I walk."
  ],
  hardClues: [
    "I am a bird but I cannot fly.",
    "I am perfectly designed for swimming and can reach speeds of 25 miles per hour underwater.",
    "I live in large colonies and recognize my partner by their voice.",
    "I carry my egg on my feet to keep it warm in freezing temperatures.",
    "I am black and white and waddle when I walk."
  ],
  easyOptions: ['PENGUIN', 'PUFFIN', 'SEAL', 'SKUA'],
  funFact: "Emperor penguins can dive deeper than 1,800 feet and hold their breath for over 20 minutes."
},

{ id: 'wa-012', answer: 'CROCODILE', category: 'travel',
  clues: [
    "I am one of the oldest reptiles on Earth — older than the dinosaurs.",
    "I have the strongest bite of any animal alive.",
    "Tourists spot me on river safaris in Florida and the Everglades."
  ],
  hardClues: [
    "I am one of the oldest reptiles on Earth — older than the dinosaurs.",
    "I spend most of my day lying completely still in or near the water.",
    "I have the strongest bite of any animal alive.",
    "I look exactly like a log floating in the river but I am definitely not a log.",
    "Tourists spot me on river safaris in Florida and the Everglades."
  ],
  easyOptions: ['CROCODILE', 'ALLIGATOR', 'LIZARD', 'CAIMAN'],
  funFact: "Crocodiles cannot chew — they swallow rocks to help grind up food in their stomachs."
},

{ id: 'wa-013', answer: 'HUMMINGBIRD', category: 'travel',
  clues: [
    "I am the smallest bird in the world.",
    "I am the only bird that can fly backwards.",
    "I am a tiny jewel-colored bird that hovers perfectly still in the air."
  ],
  hardClues: [
    "I am the smallest bird in the world.",
    "My wings beat up to 80 times per second making a loud humming sound.",
    "I am the only bird that can fly backwards.",
    "I drink nectar from flowers and my heart beats over 1,000 times per minute.",
    "I am a tiny jewel-colored bird that hovers perfectly still in the air."
  ],
  easyOptions: ['HUMMINGBIRD', 'SPARROW', 'DRAGONFLY', 'SWIFT'],
  funFact: "A hummingbird eats twice its body weight in nectar every day to fuel its rapid wingbeats."
},

{ id: 'wa-014', answer: 'COYOTE', category: 'travel',
  clues: [
    "I am a wild animal found from Alaska to Central America.",
    "I have adapted to live in cities as well as wilderness.",
    "I look like a scruffy medium-sized dog with pointed ears and a bushy tail."
  ],
  hardClues: [
    "I am a wild animal found from Alaska to Central America.",
    "I am a clever and adaptable hunter who eats almost anything.",
    "I have adapted to live in cities as well as wilderness.",
    "My yipping howl is one of the most recognizable sounds of the American West.",
    "I look like a scruffy medium-sized dog with pointed ears and a bushy tail."
  ],
  easyOptions: ['COYOTE', 'FOX', 'WOLF', 'DINGO'],
  funFact: "Coyotes are so adaptable they now live in every US state including Hawaii."
},

{ id: 'wa-015', answer: 'FIREFLY', category: 'travel',
  clues: [
    "I am an insect with a surprising superpower.",
    "I flash my light to find a partner on summer nights.",
    "I am a tiny beetle that glows in the dark in meadows and forests."
  ],
  hardClues: [
    "I am an insect with a surprising superpower.",
    "I produce my own light without any heat — it is completely cold light.",
    "I flash my light to find a partner on summer nights.",
    "Children love to catch me in jars on warm summer evenings.",
    "I am a tiny beetle that glows in the dark in meadows and forests."
  ],
  easyOptions: ['FIREFLY', 'MOTH', 'DRAGONFLY', 'GLOWWORM'],
  funFact: "Firefly light is the most efficient light in the world — nearly 100% of the energy becomes light with no wasted heat."
},

{ id: 'wa-016', answer: 'MANATEE', category: 'travel',
  clues: [
    "I am a gentle giant of the sea sometimes called a sea cow.",
    "I breathe air and come to the surface every few minutes.",
    "Sailors long ago mistook me for a mermaid — which is hard to believe if you see me."
  ],
  hardClues: [
    "I am a gentle giant of the sea sometimes called a sea cow.",
    "I have no natural predators but boat propellers are a serious danger to me.",
    "I breathe air and come to the surface every few minutes.",
    "I love warm water and often gather near power plant warm water outlets in winter.",
    "Sailors long ago mistook me for a mermaid — which is hard to believe if you see me."
  ],
  easyOptions: ['MANATEE', 'WALRUS', 'DUGONG', 'SEAL'],
  funFact: "Manatees are more closely related to elephants than to any sea creature."
},

{ id: 'wa-017', answer: 'PUFFIN', category: 'travel',
  clues: [
    "I am a seabird with a colorful beak.",
    "I can carry dozens of fish in my beak at once.",
    "I look like a tiny penguin in a tuxedo with an orange clown nose."
  ],
  hardClues: [
    "I am a seabird with a colorful beak.",
    "I am an excellent swimmer and diver despite being a bird.",
    "I can carry dozens of fish in my beak at once.",
    "I come ashore only to breed and spend the rest of my life out at sea.",
    "I look like a tiny penguin in a tuxedo with an orange clown nose."
  ],
  easyOptions: ['PUFFIN', 'PENGUIN', 'TOUCAN', 'CORMORANT'],
  funFact: "Puffins can carry up to 62 fish in their beak at once thanks to a special hinge in their jaw."
},

{ id: 'wa-018', answer: 'RATTLESNAKE', category: 'travel',
  clues: [
    "I am a reptile found in deserts and rocky areas of the American West.",
    "I warn you before I strike — if you listen.",
    "I am a venomous snake with a rattle that you can hear from several feet away."
  ],
  hardClues: [
    "I am a reptile found in deserts and rocky areas of the American West.",
    "I sense the heat of nearby prey using special pits near my nose.",
    "I warn you before I strike — if you listen.",
    "My tail makes a sound like dried seeds shaking in a small can.",
    "I am a venomous snake with a rattle that you can hear from several feet away."
  ],
  easyOptions: ['RATTLESNAKE', 'GILA MONSTER', 'SCORPION', 'COPPERHEAD'],
  funFact: "A rattlesnake adds a new rattle segment each time it sheds its skin — which can happen several times a year."
},

{ id: 'wa-019', answer: 'STARFISH', category: 'travel',
  clues: [
    "I am found in tide pools along rocky coastlines.",
    "I can regrow a lost arm — and sometimes the arm grows a whole new me.",
    "I am shaped like a five-pointed star and cling to rocks in the ocean."
  ],
  hardClues: [
    "I am found in tide pools along rocky coastlines.",
    "I have no brain and no blood — I use seawater as my circulatory system.",
    "I can regrow a lost arm — and sometimes the arm grows a whole new me.",
    "I eat by pushing my stomach outside my body to digest food on rocks.",
    "I am shaped like a five-pointed star and cling to rocks in the ocean."
  ],
  easyOptions: ['STARFISH', 'SAND DOLLAR', 'SEA URCHIN', 'SEA CUCUMBER'],
  funFact: "Scientists now call them sea stars because they are not fish at all."
},

{ id: 'wa-020', answer: 'MONARCH BUTTERFLY', category: 'travel',
  clues: [
    "I am an insect known for one of nature's greatest journeys.",
    "My orange and black wings warn predators that I taste terrible.",
    "I am a butterfly that migrates farther than any other insect on Earth."
  ],
  hardClues: [
    "I am an insect known for one of nature's greatest journeys.",
    "I travel up to 3,000 miles without ever having made the trip before.",
    "My orange and black wings warn predators that I taste terrible.",
    "Millions of us gather together in forests in Mexico each winter.",
    "I am a butterfly that migrates farther than any other insect on Earth."
  ],
  easyOptions: ['MONARCH BUTTERFLY', 'DRAGONFLY', 'MOTH', 'VICEROY BUTTERFLY'],
  funFact: "No single monarch completes the full migration — it takes up to 4 generations to make the round trip."
},

// ── LANDMARKS & PLACES (20) ───────────────────

{ id: 'wa-021', answer: 'GRAND CANYON', category: 'travel',
  clues: [
    "I am one of the seven natural wonders of the world.",
    "I am a mile deep and 277 miles long.",
    "I am a massive red rock gorge in Arizona that takes your breath away."
  ],
  hardClues: [
    "I am one of the seven natural wonders of the world.",
    "I took six million years to form.",
    "I am a mile deep and 277 miles long.",
    "A river carved me slowly over millions of years.",
    "I am a massive red rock gorge in Arizona that takes your breath away."
  ],
  easyOptions: ['GRAND CANYON', 'ZION CANYON', 'BRYCE CANYON', 'ANTELOPE CANYON'],
  funFact: "The rock at the bottom of the Grand Canyon is nearly 2 billion years old — almost half the age of Earth."
},

{ id: 'wa-022', answer: 'GOLDEN GATE BRIDGE', category: 'travel',
  clues: [
    "I am one of the most photographed structures on Earth.",
    "I took four years to build and opened in 1937.",
    "I am a famous red-orange suspension bridge in San Francisco."
  ],
  hardClues: [
    "I am one of the most photographed structures on Earth.",
    "My color is called International Orange — not gold at all.",
    "I took four years to build and opened in 1937.",
    "I span the entrance to one of the world's great natural harbors on the US west coast.",
    "I am a famous red-orange suspension bridge in San Francisco."
  ],
  easyOptions: ['GOLDEN GATE BRIDGE', 'BROOKLYN BRIDGE', 'BAY BRIDGE', 'GEORGE WASHINGTON BRIDGE'],
  funFact: "The Golden Gate Bridge was once considered impossible to build because of the strong currents, deep water, and frequent fog."
},

{ id: 'wa-023', answer: 'OLD FAITHFUL', category: 'travel',
  clues: [
    "I have been doing the same thing for hundreds of years.",
    "Thousands of people sit on benches just to watch me perform.",
    "I am the most famous geyser in Yellowstone National Park."
  ],
  hardClues: [
    "I have been doing the same thing for hundreds of years.",
    "I shoot boiling water high into the air on a reliable schedule.",
    "Thousands of people sit on benches just to watch me perform.",
    "I erupt roughly every 90 minutes without fail.",
    "I am the most famous geyser in Yellowstone National Park."
  ],
  easyOptions: ['OLD FAITHFUL', 'HOT SPRING', 'VOLCANO', 'STEAMBOAT GEYSER'],
  funFact: "Old Faithful shoots between 3,700 and 8,400 gallons of boiling water up to 185 feet into the air each eruption."
},

{ id: 'wa-024', answer: 'STATUE OF LIBERTY', category: 'travel',
  clues: [
    "I was a gift from one country to another.",
    "My torch has been lit for over a century.",
    "I am a giant green copper lady holding a torch in New York Harbor."
  ],
  hardClues: [
    "I was a gift from one country to another.",
    "I stand on an island in a busy harbor.",
    "My torch has been lit for over a century.",
    "I welcome people arriving by boat to a new country.",
    "I am a giant green copper lady holding a torch in New York Harbor."
  ],
  easyOptions: ['STATUE OF LIBERTY', 'EIFFEL TOWER', 'LINCOLN MEMORIAL', 'COLOSSUS OF RHODES'],
  funFact: "The Statue of Liberty was originally a shiny copper color — like a new penny. It turned green over 30 years due to weather."
},

{ id: 'wa-025', answer: 'MOUNT RUSHMORE', category: 'travel',
  clues: [
    "I took 14 years and 400 workers to create.",
    "I show four famous Americans from history.",
    "I am a giant mountain carved with the faces of four US presidents."
  ],
  hardClues: [
    "I took 14 years and 400 workers to create.",
    "I am carved into a mountain in the Black Hills of South Dakota.",
    "I show four famous Americans from history.",
    "I draw millions of visitors to the middle of the American plains every year.",
    "I am a giant mountain carved with the faces of four US presidents."
  ],
  easyOptions: ['MOUNT RUSHMORE', 'LINCOLN MEMORIAL', 'WASHINGTON MONUMENT', 'CRAZY HORSE MEMORIAL'],
  funFact: "Each face on Mount Rushmore is 60 feet tall — about the height of a six-story building."
},

{ id: 'wa-026', answer: 'NIAGARA FALLS', category: 'travel',
  clues: [
    "I am one of the most powerful waterfalls on Earth.",
    "More than 3,000 tons of water flow over me every second.",
    "I am a thundering waterfall on the US-Canada border in New York."
  ],
  hardClues: [
    "I am one of the most powerful waterfalls on Earth.",
    "I sit exactly on the border between two countries.",
    "More than 3,000 tons of water flow over me every second.",
    "Tourists ride boats right up to my base and get completely soaked.",
    "I am a thundering waterfall on the US-Canada border in New York."
  ],
  easyOptions: ['NIAGARA FALLS', 'YOSEMITE FALLS', 'ANGEL FALLS', 'VICTORIA FALLS'],
  funFact: "Niagara Falls moves backward about a foot every year as the rushing water slowly erodes the rock."
},

{ id: 'wa-027', answer: 'YELLOWSTONE', category: 'travel',
  clues: [
    "I was the world's first national park.",
    "I have more geysers than anywhere else on Earth.",
    "I am a vast wilderness park in Wyoming famous for geysers and wildlife."
  ],
  hardClues: [
    "I was the world's first national park.",
    "I sit on top of one of the largest supervolcanoes on Earth.",
    "I have more geysers than anywhere else on Earth.",
    "Bison wolves bears and elk all roam freely inside me.",
    "I am a vast wilderness park in Wyoming famous for geysers and wildlife."
  ],
  easyOptions: ['YELLOWSTONE', 'YOSEMITE', 'GLACIER NATIONAL PARK', 'GRAND TETON'],
  funFact: "Yellowstone sits on a magma chamber so large that if it erupted it would affect the entire planet's climate."
},

{ id: 'wa-028', answer: 'ALCATRAZ', category: 'travel',
  clues: [
    "I sit on an island in a bay.",
    "I was once home to America's most dangerous criminals.",
    "I am a famous former prison on an island in San Francisco Bay."
  ],
  hardClues: [
    "I sit on an island in a bay.",
    "No one ever officially escaped from me successfully.",
    "I was once home to America's most dangerous criminals.",
    "Today tourists ride a ferry to walk my cold dark corridors.",
    "I am a famous former prison on an island in San Francisco Bay."
  ],
  easyOptions: ['ALCATRAZ', 'ELLIS ISLAND', 'ANGEL ISLAND', 'RIKERS ISLAND'],
  funFact: "Alcatraz had the best food of any federal prison — authorities believed well-fed prisoners were less likely to riot or attempt escape."
},

{ id: 'wa-029', answer: 'LINCOLN MEMORIAL', category: 'travel',
  clues: [
    "I honor one of America's most beloved presidents.",
    "My statue is 19 feet tall and would be 28 feet tall if it stood up.",
    "I am a giant marble monument in Washington DC with Abraham Lincoln sitting inside."
  ],
  hardClues: [
    "I honor one of America's most beloved presidents.",
    "I sit at the end of a long reflecting pool on the National Mall.",
    "My statue is 19 feet tall and would be 28 feet tall if it stood up.",
    "Martin Luther King Jr gave his most famous speech standing on my steps.",
    "I am a giant marble monument in Washington DC with Abraham Lincoln sitting inside."
  ],
  easyOptions: ['LINCOLN MEMORIAL', 'JEFFERSON MEMORIAL', 'WASHINGTON MONUMENT', 'VIETNAM VETERANS MEMORIAL'],
  funFact: "The Lincoln Memorial's statue has Lincoln's hands forming the letters A and L in American Sign Language — though this may be a coincidence."
},

{ id: 'wa-030', answer: 'SPACE NEEDLE', category: 'travel',
  clues: [
    "I was built for a World's Fair.",
    "My restaurant at the top makes one full rotation every 47 minutes.",
    "I am a futuristic tower shaped like a flying saucer on a stick in Seattle."
  ],
  hardClues: [
    "I was built for a World's Fair.",
    "I look like something straight out of a science fiction movie.",
    "My restaurant at the top makes one full rotation every 47 minutes.",
    "On a clear day you can see four mountain ranges from my observation deck.",
    "I am a futuristic tower shaped like a flying saucer on a stick in Seattle."
  ],
  easyOptions: ['SPACE NEEDLE', 'CN TOWER', 'EIFFEL TOWER', 'REUNION TOWER'],
  funFact: "The Space Needle was designed to withstand winds of 200 mph and earthquakes measuring 9.1 on the Richter scale."
},

{ id: 'wa-031', answer: 'EVERGLADES', category: 'travel',
  clues: [
    "I am the largest subtropical wilderness in the United States.",
    "Alligators manatees and panthers all call me home.",
    "I am a vast slow-moving wetland that is actually a very wide shallow river."
  ],
  hardClues: [
    "I am the largest subtropical wilderness in the United States.",
    "I am sometimes described as a river of grass.",
    "Alligators manatees and panthers all call me home.",
    "I cover the entire southern tip of Florida.",
    "I am a vast slow-moving wetland that is actually a very wide shallow river."
  ],
  easyOptions: ['EVERGLADES', 'OKEFENOKEE SWAMP', 'BIG CYPRESS', 'ATCHAFALAYA BASIN'],
  funFact: "The Everglades river is 60 miles wide but only about six inches deep in most places."
},

{ id: 'wa-032', answer: 'MONUMENT VALLEY', category: 'travel',
  clues: [
    "I am on the border between Arizona and Utah.",
    "My towering red rock formations have appeared in hundreds of movies.",
    "I am a dramatic desert landscape of giant red sandstone towers rising from a flat plain."
  ],
  hardClues: [
    "I am on the border between Arizona and Utah.",
    "I am sacred land that has been home to the Navajo Nation for centuries.",
    "My towering red rock formations have appeared in hundreds of movies.",
    "Cowboys Native Americans and filmmakers have all called this landscape iconic.",
    "I am a dramatic desert landscape of giant red sandstone towers rising from a flat plain."
  ],
  easyOptions: ['MONUMENT VALLEY', 'BRYCE CANYON', 'SEDONA', 'CATHEDRAL ROCK'],
  funFact: "The sandstone formations in Monument Valley are up to 1,000 feet tall and took 50 million years to form."
},

{ id: 'wa-033', answer: 'HAWAII VOLCANOES', category: 'travel',
  clues: [
    "I am one of the most active volcanic systems on Earth.",
    "Lava flows from me directly into the ocean making the island bigger.",
    "I am a national park on the Big Island of Hawaii where volcanoes are constantly erupting."
  ],
  hardClues: [
    "I am one of the most active volcanic systems on Earth.",
    "I am creating brand new land right now as you read this.",
    "Lava flows from me directly into the ocean making the island bigger.",
    "You can walk on lava fields here that cooled just a few years ago.",
    "I am a national park on the Big Island of Hawaii where volcanoes are constantly erupting."
  ],
  easyOptions: ['HAWAII VOLCANOES', 'MOUNT ST HELENS', 'CRATER LAKE', 'MOUNT KILAUEA'],
  funFact: "Hawaii's Big Island grows by about 42 acres every year as new lava flows into the ocean and hardens."
},

{ id: 'wa-034', answer: 'CENTRAL PARK', category: 'travel',
  clues: [
    "I am in the middle of one of the world's most famous cities.",
    "I have a zoo a lake an ice rink and a carousel all inside me.",
    "I am an 843-acre park in the middle of Manhattan in New York City."
  ],
  hardClues: [
    "I am in the middle of one of the world's most famous cities.",
    "I was entirely designed and built by humans — nothing in me grew naturally.",
    "I have a zoo a lake an ice rink and a carousel all inside me.",
    "I appear in more movies and TV shows than almost any other outdoor location on Earth.",
    "I am an 843-acre park in the middle of Manhattan in New York City."
  ],
  easyOptions: ['CENTRAL PARK', 'GOLDEN GATE PARK', 'MILLENNIUM PARK', 'PROSPECT PARK'],
  funFact: "More than 200 bird species stop in Central Park during migration — making it one of the best birdwatching spots in North America."
},

{ id: 'wa-035', answer: 'HOOVER DAM', category: 'travel',
  clues: [
    "I was built during the Great Depression.",
    "It took 21,000 workers and five years to build me.",
    "I am a massive concrete dam on the Nevada-Arizona border holding back Lake Mead."
  ],
  hardClues: [
    "I was built during the Great Depression.",
    "I hold back an entire lake that stretches for 112 miles behind me.",
    "It took 21,000 workers and five years to build me.",
    "I generate enough electricity to power over a million homes.",
    "I am a massive concrete dam on the Nevada-Arizona border holding back Lake Mead."
  ],
  easyOptions: ['HOOVER DAM', 'GRAND COULEE DAM', 'GLEN CANYON DAM', 'BONNEVILLE DAM'],
  funFact: "If you pour a cup of water at the Nevada side of Hoover Dam it takes two years to reach the bottom and flow into the Colorado River."
},

{ id: 'wa-036', answer: 'TIMES SQUARE', category: 'travel',
  clues: [
    "I am one of the busiest places on Earth.",
    "On New Year's Eve millions watch a ball drop here at midnight.",
    "I am a dazzling intersection of bright lights billboards and crowds in Manhattan."
  ],
  hardClues: [
    "I am one of the busiest places on Earth.",
    "I am covered in giant glowing screens and advertisements that light up the night.",
    "On New Year's Eve millions watch a ball drop here at midnight.",
    "I am in the heart of New York City's famous theater district.",
    "I am a dazzling intersection of bright lights billboards and crowds in Manhattan."
  ],
  easyOptions: ['TIMES SQUARE', 'LAS VEGAS STRIP', 'SUNSET BOULEVARD', 'PICCADILLY CIRCUS'],
  funFact: "Times Square got its name from the New York Times newspaper which moved its headquarters there in 1904."
},

{ id: 'wa-037', answer: 'ARCHES NATIONAL PARK', category: 'travel',
  clues: [
    "I have more natural stone arches than anywhere else on Earth.",
    "Wind and water carved my shapes over millions of years.",
    "I am a park full of giant red sandstone arches rising out of the desert."
  ],
  hardClues: [
    "I have more natural stone arches than anywhere else on Earth.",
    "I am in the red rock desert of Utah.",
    "Wind and water carved my shapes over millions of years.",
    "My most famous arch has a span of over 300 feet.",
    "I am a park full of giant red sandstone arches rising out of the desert."
  ],
  easyOptions: ['ARCHES NATIONAL PARK', 'CANYONLANDS', 'ZION NATIONAL PARK', 'NATURAL BRIDGES'],
  funFact: "Arches National Park contains more than 2,000 natural stone arches — and new ones form as old ones collapse."
},

{ id: 'wa-038', answer: 'MISSISSIPPI RIVER', category: 'travel',
  clues: [
    "I am the longest river system in North America.",
    "Mark Twain wrote famous novels set along my banks.",
    "I am the great river that flows from Minnesota to the Gulf of Mexico splitting America in two."
  ],
  hardClues: [
    "I am the longest river system in North America.",
    "I drain water from 31 of the 50 United States.",
    "Mark Twain wrote famous novels set along my banks.",
    "Paddle steamboats once carried passengers and cargo up and down my entire length.",
    "I am the great river that flows from Minnesota to the Gulf of Mexico splitting America in two."
  ],
  easyOptions: ['MISSISSIPPI RIVER', 'COLORADO RIVER', 'OHIO RIVER', 'MISSOURI RIVER'],
  funFact: "A drop of water entering the Mississippi River at its source in Minnesota takes about 90 days to reach the Gulf of Mexico."
},

{ id: 'wa-039', answer: 'DEATH VALLEY', category: 'travel',
  clues: [
    "I hold the record for the hottest temperature ever recorded on Earth.",
    "Despite my name flowers bloom here every few years in spectacular numbers.",
    "I am a scorching desert valley in California where temperatures can reach 134 degrees."
  ],
  hardClues: [
    "I hold the record for the hottest temperature ever recorded on Earth.",
    "I am below sea level in many places — the lowest point in North America.",
    "Despite my name flowers bloom here every few years in spectacular numbers.",
    "I am also the driest place in North America.",
    "I am a scorching desert valley in California where temperatures can reach 134 degrees."
  ],
  easyOptions: ['DEATH VALLEY', 'MOJAVE DESERT', 'SONORAN DESERT', 'BADWATER BASIN'],
  funFact: "Death Valley holds the world record hottest air temperature ever recorded: 134 degrees F in 1913."
},

{ id: 'wa-040', answer: 'LIBERTY BELL', category: 'travel',
  clues: [
    "I am one of the most important symbols of American freedom.",
    "I rang to announce important events in early American history.",
    "I am a cracked historic bell in Philadelphia that symbolizes American independence."
  ],
  hardClues: [
    "I am one of the most important symbols of American freedom.",
    "I have a famous crack that no one has ever been able to repair.",
    "I rang to announce important events in early American history.",
    "I am on display in Philadelphia where millions of visitors come to see me every year.",
    "I am a cracked historic bell in Philadelphia that symbolizes American independence."
  ],
  easyOptions: ['LIBERTY BELL', 'INDEPENDENCE HALL', 'WASHINGTON MONUMENT', 'FREEDOM BELL'],
  funFact: "Nobody knows exactly how the Liberty Bell cracked — and every attempt to repair it made the crack worse."
},

// ── TRAVEL & TRANSPORT (15) ───────────────────

{ id: 'wa-041', answer: 'LIGHTHOUSE', category: 'travel',
  clues: [
    "I stand tall near the water.",
    "My light rotates so sailors can count the flashes and know where they are.",
    "I am a tall tower with a flashing light that guides ships safely past dangerous coastlines."
  ],
  hardClues: [
    "I stand tall near the water.",
    "I work through the night so others can find their way safely.",
    "My light rotates so sailors can count the flashes and know where they are.",
    "Before GPS I was the only way ships knew where the hidden rocks were.",
    "I am a tall tower with a flashing light that guides ships safely past dangerous coastlines."
  ],
  easyOptions: ['LIGHTHOUSE', 'WATCHTOWER', 'RADIO TOWER', 'BEACON TOWER'],
  funFact: "The oldest working lighthouse in the US is Boston Light, built in 1716. It still has a keeper who lives there."
},

{ id: 'wa-042', answer: 'HOT AIR BALLOON', category: 'travel',
  clues: [
    "I am the oldest form of human flight.",
    "I go wherever the wind takes me.",
    "I am a giant colorful bag filled with hot air that floats people into the sky."
  ],
  hardClues: [
    "I am the oldest form of human flight.",
    "I have no engine and no steering wheel.",
    "I go wherever the wind takes me.",
    "People ride in a wicker basket underneath me to see landscapes from high above.",
    "I am a giant colorful bag filled with hot air that floats people into the sky."
  ],
  easyOptions: ['HOT AIR BALLOON', 'BLIMP', 'PARAGLIDER', 'AIRSHIP'],
  funFact: "The first hot air balloon passengers in 1783 were a sheep, a duck, and a rooster — to test if living creatures could survive flight."
},

{ id: 'wa-043', answer: 'FERRY', category: 'travel',
  clues: [
    "I carry passengers and sometimes cars across water.",
    "I am much slower than a speedboat but much bigger.",
    "I am a large flat boat that shuttles people across short stretches of water."
  ],
  hardClues: [
    "I carry passengers and sometimes cars across water.",
    "I follow the exact same route back and forth all day long.",
    "I am much slower than a speedboat but much bigger.",
    "Commuters use me every day to get to work across bays and harbors.",
    "I am a large flat boat that shuttles people across short stretches of water."
  ],
  easyOptions: ['FERRY', 'CRUISE SHIP', 'TUGBOAT', 'WATER TAXI'],
  funFact: "The Staten Island Ferry in New York City carries 70,000 passengers a day and has been free since 1997."
},

{ id: 'wa-044', answer: 'CABLE CAR', category: 'travel',
  clues: [
    "I am pulled by a moving cable hidden under the street.",
    "I am famous in a hilly city on the west coast of America.",
    "I am a historic streetcar in San Francisco that climbs steep hills with a clang of my bell."
  ],
  hardClues: [
    "I am pulled by a moving cable hidden under the street.",
    "I have no engine of my own — I grip a moving cable to travel.",
    "I am famous in a hilly city on the west coast of America.",
    "A gripman controls my speed by clutching and releasing a continuously moving cable.",
    "I am a historic streetcar in San Francisco that climbs steep hills with a clang of my bell."
  ],
  easyOptions: ['CABLE CAR', 'TRAM', 'FUNICULAR', 'TROLLEYBUS'],
  funFact: "San Francisco's cable cars are the only moving National Historic Landmark in the United States."
},

{ id: 'wa-045', answer: 'CANOE', category: 'travel',
  clues: [
    "I am one of the oldest forms of water transport.",
    "Native Americans used me to travel rivers and lakes for thousands of years.",
    "I am a lightweight boat you paddle while sitting inside on lakes and rivers."
  ],
  hardClues: [
    "I am one of the oldest forms of water transport.",
    "I am narrow and pointed at both ends.",
    "Native Americans used me to travel rivers and lakes for thousands of years.",
    "You sit inside me and propel yourself with a single-bladed paddle.",
    "I am a lightweight boat you paddle while sitting inside on lakes and rivers."
  ],
  easyOptions: ['CANOE', 'KAYAK', 'ROWBOAT', 'DUGOUT'],
  funFact: "The oldest canoe ever found is 10,000 years old and was discovered in the Netherlands."
},

{ id: 'wa-046', answer: 'HELICOPTER', category: 'travel',
  clues: [
    "I can take off and land straight up and down.",
    "My spinning blades keep me in the air.",
    "I am a flying machine with spinning blades on top that can hover and move in any direction."
  ],
  hardClues: [
    "I can take off and land straight up and down.",
    "I can hover perfectly still in one spot in the air.",
    "My spinning blades keep me in the air.",
    "Tourists ride me for scenic tours over the Grand Canyon and city skylines.",
    "I am a flying machine with spinning blades on top that can hover and move in any direction."
  ],
  easyOptions: ['HELICOPTER', 'DRONE', 'SMALL PLANE', 'AUTOGYRO'],
  funFact: "Helicopters can fly sideways backwards and upside down — though upside down flying is only done by stunt pilots."
},

{ id: 'wa-047', answer: 'SUBWAY', category: 'travel',
  clues: [
    "I run underground beneath a city.",
    "I have my own map that looks nothing like the city above.",
    "I am an underground train system beneath a big city that whisks people across town."
  ],
  hardClues: [
    "I run underground beneath a city.",
    "I carry millions of people every single day.",
    "I have my own map that looks nothing like the city above.",
    "You pay with a card or token and pass through a turnstile to reach me.",
    "I am an underground train system beneath a big city that whisks people across town."
  ],
  easyOptions: ['SUBWAY', 'TRAM', 'MONORAIL', 'LIGHT RAIL'],
  funFact: "New York City's subway never fully closes — it runs 24 hours a day every single day of the year."
},

{ id: 'wa-048', answer: 'GONDOLA', category: 'travel',
  clues: [
    "I am a long narrow black boat.",
    "I carry passengers through the waterways of a famous floating city.",
    "I am a traditional boat in Venice Italy that glides silently through canals."
  ],
  hardClues: [
    "I am a long narrow black boat.",
    "I am steered by a person standing at the back using a single long oar.",
    "I carry passengers through the waterways of a famous floating city.",
    "Couples ride me on romantic trips under ancient stone bridges.",
    "I am a traditional boat in Venice Italy that glides silently through canals."
  ],
  easyOptions: ['GONDOLA', 'CANOE', 'ROWBOAT', 'VAPORETTO'],
  funFact: "All gondolas in Venice are painted black by law — a rule dating back to the 1600s to reduce competition between gondoliers."
},

{ id: 'wa-049', answer: 'PASSPORT', category: 'travel',
  clues: [
    "I am a small booklet that belongs to only one person.",
    "Each page gets stamped when you cross a border.",
    "I am the official document that proves who you are when traveling to another country."
  ],
  hardClues: [
    "I am a small booklet that belongs to only one person.",
    "Without me you cannot enter most foreign countries.",
    "Each page gets stamped when you cross a border.",
    "I have a photo of you and details about where you were born.",
    "I am the official document that proves who you are when traveling to another country."
  ],
  easyOptions: ['PASSPORT', 'BOARDING PASS', 'VISA', 'TRAVEL PERMIT'],
  funFact: "The most powerful passport in the world allows entry to over 190 countries without a visa in advance."
},

{ id: 'wa-050', answer: 'TENT', category: 'travel',
  clues: [
    "I am your home when there is no home around.",
    "I protect you from rain wind and bugs.",
    "I am a portable shelter made of fabric and poles that campers set up in the wilderness."
  ],
  hardClues: [
    "I am your home when there is no home around.",
    "I can be packed into a bag small enough to carry on your back.",
    "I protect you from rain wind and bugs.",
    "You sleep inside me on a mat or a sleeping bag under the stars.",
    "I am a portable shelter made of fabric and poles that campers set up in the wilderness."
  ],
  easyOptions: ['TENT', 'SLEEPING BAG', 'HAMMOCK', 'BIVOUAC'],
  funFact: "Modern tents can be set up in under 60 seconds — some ultralight models weigh less than a pound."
},

{ id: 'wa-051', answer: 'COMPASS', category: 'travel',
  clues: [
    "I have been helping travelers find their way for over 1,000 years.",
    "I work with no batteries and no signal.",
    "I am a small device with a magnetized needle that always points north."
  ],
  hardClues: [
    "I have been helping travelers find their way for over 1,000 years.",
    "I always point the same direction no matter where you are on Earth.",
    "I work with no batteries and no signal.",
    "Hikers and sailors rely on me when all technology fails.",
    "I am a small device with a magnetized needle that always points north."
  ],
  easyOptions: ['COMPASS', 'GPS', 'MAP', 'SEXTANT'],
  funFact: "A compass needle points to magnetic north not true north — there is a small difference that navigators have to calculate."
},

{ id: 'wa-052', answer: 'BACKPACK', category: 'travel',
  clues: [
    "I am carried on your shoulders not in your hands.",
    "Hikers fill me with water snacks maps and first aid kits.",
    "I am a bag worn on your back that holds everything you need for a day of adventure."
  ],
  hardClues: [
    "I am carried on your shoulders not in your hands.",
    "I keep your hands completely free while you explore.",
    "Hikers fill me with water snacks maps and first aid kits.",
    "Some adventurers carry everything they own for months at a time inside just one of me.",
    "I am a bag worn on your back that holds everything you need for a day of adventure."
  ],
  easyOptions: ['BACKPACK', 'SUITCASE', 'DUFFEL BAG', 'FANNY PACK'],
  funFact: "The world record for the heaviest backpack ever carried was 341 pounds — carried by a soldier in training."
},

{ id: 'wa-053', answer: 'BINOCULARS', category: 'travel',
  clues: [
    "I make faraway things look close.",
    "Birdwatchers never leave home without me.",
    "I am an optical tool you hold up to both eyes to see distant animals or scenery up close."
  ],
  hardClues: [
    "I make faraway things look close.",
    "I have two eyepieces side by side — one for each eye.",
    "Birdwatchers never leave home without me.",
    "You use me to watch wildlife from a safe distance without disturbing the animals.",
    "I am an optical tool you hold up to both eyes to see distant animals or scenery up close."
  ],
  easyOptions: ['BINOCULARS', 'TELESCOPE', 'MAGNIFYING GLASS', 'MONOCULAR'],
  funFact: "The most powerful handheld binoculars can magnify objects 100 times — enough to read a sign a mile away."
},

{ id: 'wa-054', answer: 'CAMPFIRE', category: 'travel',
  clues: [
    "I bring people together in the dark.",
    "Stories told around me feel more magical than anywhere else.",
    "I am a fire built outdoors that campers gather around for warmth light and s'mores."
  ],
  hardClues: [
    "I bring people together in the dark.",
    "I keep wild animals away from a campsite at night.",
    "Stories told around me feel more magical than anywhere else.",
    "Marshmallows taste completely different cooked over me — roasted dark and gooey.",
    "I am a fire built outdoors that campers gather around for warmth light and s'mores."
  ],
  easyOptions: ['CAMPFIRE', 'BONFIRE', 'LANTERN', 'FIRE PIT'],
  funFact: "The smell of campfire smoke sticks to clothes because the particles are so tiny they bond directly to fabric fibers."
},

{ id: 'wa-055', answer: 'SOUVENIR', category: 'travel',
  clues: [
    "I am something you bring home from a trip.",
    "I help you remember somewhere you visited.",
    "I am a small object purchased on vacation to remind you of where you went."
  ],
  hardClues: [
    "I am something you bring home from a trip.",
    "I am bought in a gift shop near a famous landmark or attraction.",
    "I help you remember somewhere you visited.",
    "I could be a magnet a keychain a t-shirt or a snow globe.",
    "I am a small object purchased on vacation to remind you of where you went."
  ],
  easyOptions: ['SOUVENIR', 'GIFT', 'POSTCARD', 'MEMENTO'],
  funFact: "The word souvenir comes from the French word meaning 'to remember' — and the tradition of buying them dates back to ancient Rome."
},

// ── NATURE & GEOGRAPHY (15) ───────────────────

{ id: 'wa-056', answer: 'VOLCANO', category: 'travel',
  clues: [
    "I have been shaping the Earth for billions of years.",
    "When I am angry the ground shakes and the sky fills with ash.",
    "I am a mountain that can erupt and shoot lava rock and ash into the sky."
  ],
  hardClues: [
    "I have been shaping the Earth for billions of years.",
    "I am a mountain with a dangerous secret hidden deep inside.",
    "When I am angry the ground shakes and the sky fills with ash.",
    "I can create new islands by building up rock from the ocean floor.",
    "I am a mountain that can erupt and shoot lava rock and ash into the sky."
  ],
  easyOptions: ['VOLCANO', 'EARTHQUAKE', 'GEYSER', 'CALDERA'],
  funFact: "Hawaii was entirely created by underwater volcanoes — the entire island chain built up from the ocean floor over millions of years."
},

{ id: 'wa-057', answer: 'GLACIER', category: 'travel',
  clues: [
    "I move but you cannot see me moving.",
    "I hold 69% of all the world's fresh water.",
    "I am a massive slow-moving river of ice that reshapes the landscape over thousands of years."
  ],
  hardClues: [
    "I move but you cannot see me moving.",
    "I carve valleys mountains and lakes as I travel slowly downhill.",
    "I hold 69% of all the world's fresh water.",
    "I am melting faster now than at any point in recorded history.",
    "I am a massive slow-moving river of ice that reshapes the landscape over thousands of years."
  ],
  easyOptions: ['GLACIER', 'ICEBERG', 'FROZEN LAKE', 'ICE SHELF'],
  funFact: "If all the world's glaciers melted sea levels would rise by about 230 feet — enough to flood most coastal cities."
},

{ id: 'wa-058', answer: 'RAINBOW', category: 'travel',
  clues: [
    "I appear after rain when the sun comes out.",
    "I am actually a full circle but you usually only see half.",
    "I am an arc of color in the sky made when sunlight passes through water droplets."
  ],
  hardClues: [
    "I appear after rain when the sun comes out.",
    "I always have seven colors in exactly the same order.",
    "I am actually a full circle but you usually only see half.",
    "You can never reach my end no matter how far you walk toward it.",
    "I am an arc of color in the sky made when sunlight passes through water droplets."
  ],
  easyOptions: ['RAINBOW', 'AURORA', 'SUNSET', 'FOG BOW'],
  funFact: "You can only see a rainbow if the sun is behind you — which is why they always appear opposite the sun."
},

{ id: 'wa-059', answer: 'TIDE POOL', category: 'travel',
  clues: [
    "I am a small world hidden in plain sight.",
    "Starfish sea anemones crabs and tiny fish all live inside me.",
    "I am a rocky pool along the coastline that gets filled with seawater at high tide."
  ],
  hardClues: [
    "I am a small world hidden in plain sight.",
    "The ocean fills me up twice a day and empties me twice a day.",
    "Starfish sea anemones crabs and tiny fish all live inside me.",
    "Children love crouching down to look at all the tiny creatures living in me.",
    "I am a rocky pool along the coastline that gets filled with seawater at high tide."
  ],
  easyOptions: ['TIDE POOL', 'CORAL REEF', 'MANGROVE', 'ROCK POOL'],
  funFact: "A single tide pool can contain hundreds of species all living in a space smaller than a bathtub."
},

{ id: 'wa-060', answer: 'AURORA', category: 'travel',
  clues: [
    "I only appear at night in certain parts of the world.",
    "I dance and ripple across the sky in curtains of color.",
    "I am the Northern Lights — a natural light show of green pink and purple in the night sky."
  ],
  hardClues: [
    "I only appear at night in certain parts of the world.",
    "I am caused by particles from the sun colliding with Earth's atmosphere.",
    "I dance and ripple across the sky in curtains of color.",
    "People travel to Alaska Canada and Scandinavia just to see me.",
    "I am the Northern Lights — a natural light show of green pink and purple in the night sky."
  ],
  easyOptions: ['AURORA', 'METEOR SHOWER', 'LIGHTNING STORM', 'NOCTILUCENT CLOUD'],
  funFact: "The aurora can also be seen from space — astronauts on the International Space Station watch it from above."
},

{ id: 'wa-061', answer: 'DESERT', category: 'travel',
  clues: [
    "I cover about one third of Earth's land surface.",
    "Despite looking empty I am full of life perfectly adapted to survive here.",
    "I am a vast dry landscape with little water and extreme temperatures where few plants grow."
  ],
  hardClues: [
    "I cover about one third of Earth's land surface.",
    "I get less than 10 inches of rain per year.",
    "Despite looking empty I am full of life perfectly adapted to survive here.",
    "I can be scorching hot by day and freezing cold at night.",
    "I am a vast dry landscape with little water and extreme temperatures where few plants grow."
  ],
  easyOptions: ['DESERT', 'SAVANNA', 'TUNDRA', 'BADLANDS'],
  funFact: "Antarctica is technically the world's largest desert — it gets almost no precipitation despite being covered in ice."
},

{ id: 'wa-062', answer: 'WATERFALL', category: 'travel',
  clues: [
    "I am created when a river runs out of ground beneath it.",
    "The mist I create makes rainbows on sunny days.",
    "I am a cascade of water falling from a great height over a cliff edge."
  ],
  hardClues: [
    "I am created when a river runs out of ground beneath it.",
    "The sound of me can be heard from miles away.",
    "The mist I create makes rainbows on sunny days.",
    "People hike for hours through wilderness just to stand near me.",
    "I am a cascade of water falling from a great height over a cliff edge."
  ],
  easyOptions: ['WATERFALL', 'RAPID', 'DAM', 'CASCADE'],
  funFact: "Angel Falls in Venezuela is the world's highest waterfall at 3,212 feet — so tall the water turns to mist before it reaches the bottom."
},

{ id: 'wa-063', answer: 'CAVE', category: 'travel',
  clues: [
    "I have been sheltering living things for millions of years.",
    "I have my own weather system — constant temperature and dripping water.",
    "I am a natural underground chamber in rock that you explore with a headlamp."
  ],
  hardClues: [
    "I have been sheltering living things for millions of years.",
    "Prehistoric humans painted pictures on my walls.",
    "I have my own weather system — constant temperature and dripping water.",
    "Rock formations inside me grow just one inch every hundred years.",
    "I am a natural underground chamber in rock that you explore with a headlamp."
  ],
  easyOptions: ['CAVE', 'MINE', 'TUNNEL', 'GROTTO'],
  funFact: "The largest cave chamber in the world — Miao Room in China — is so big it has its own clouds and weather system inside."
},

{ id: 'wa-064', answer: 'ISLAND', category: 'travel',
  clues: [
    "I am surrounded by water on every side.",
    "I can be home to plants and animals found nowhere else on Earth.",
    "I am a piece of land completely surrounded by water."
  ],
  hardClues: [
    "I am surrounded by water on every side.",
    "I can be formed by volcanoes coral reefs or continental breakup.",
    "I can be home to plants and animals found nowhere else on Earth.",
    "Some of me are just large rocks with a lighthouse on top.",
    "I am a piece of land completely surrounded by water."
  ],
  easyOptions: ['ISLAND', 'PENINSULA', 'ATOLL', 'ISLET'],
  funFact: "Indonesia is made up of over 17,000 islands — more than any other country on Earth."
},

{ id: 'wa-065', answer: 'CANYON', category: 'travel',
  clues: [
    "I was carved by water over millions of years.",
    "I can be so deep that the temperature at my bottom is much warmer than at my top.",
    "I am a deep narrow valley with steep rocky walls carved by a river over millions of years."
  ],
  hardClues: [
    "I was carved by water over millions of years.",
    "My walls tell the story of Earth's history in layers of color.",
    "I can be so deep that the temperature at my bottom is much warmer than at my top.",
    "Hikers who descend into me must remember the hard part is always climbing back out.",
    "I am a deep narrow valley with steep rocky walls carved by a river over millions of years."
  ],
  easyOptions: ['CANYON', 'VALLEY', 'GORGE', 'RAVINE'],
  funFact: "The walls of the Grand Canyon are like a history book — each layer of rock represents a different era of Earth's past."
},

{ id: 'wa-066', answer: 'SAND DUNE', category: 'travel',
  clues: [
    "I am never in the same place twice.",
    "I can move several feet in a single year.",
    "I am a hill of sand shaped entirely by the wind that slowly migrates across the desert."
  ],
  hardClues: [
    "I am never in the same place twice.",
    "Wind builds me up and then tears me down constantly.",
    "I can move several feet in a single year.",
    "Some of me make a low humming sound when wind blows over me at just the right angle.",
    "I am a hill of sand shaped entirely by the wind that slowly migrates across the desert."
  ],
  easyOptions: ['SAND DUNE', 'BEACH', 'SANDBAR', 'BARCHAN'],
  funFact: "Some sand dunes boom or hum when sand slides down their surface — a phenomenon scientists still do not fully understand."
},

{ id: 'wa-067', answer: 'TUNDRA', category: 'travel',
  clues: [
    "I cover about 10% of Earth's surface.",
    "I have no trees at all but I bloom with wildflowers for a few weeks each summer.",
    "I am a vast treeless frozen landscape near the Arctic where only low plants survive."
  ],
  hardClues: [
    "I cover about 10% of Earth's surface.",
    "Below my surface the ground is permanently frozen year-round.",
    "I have no trees at all but I bloom with wildflowers for a few weeks each summer.",
    "Caribou wolves and arctic foxes roam freely across me.",
    "I am a vast treeless frozen landscape near the Arctic where only low plants survive."
  ],
  easyOptions: ['TUNDRA', 'TAIGA', 'STEPPE', 'PERMAFROST'],
  funFact: "The permanently frozen ground under the tundra — called permafrost — can be over 1,000 feet deep in some places."
},

{ id: 'wa-068', answer: 'CORAL REEF', category: 'travel',
  clues: [
    "I am sometimes called the rainforest of the sea.",
    "I cover less than 1% of the ocean floor but support 25% of all marine life.",
    "I am an underwater structure built by coral polyps that is home to thousands of sea creatures."
  ],
  hardClues: [
    "I am sometimes called the rainforest of the sea.",
    "I am built by tiny living creatures over thousands of years.",
    "I cover less than 1% of the ocean floor but support 25% of all marine life.",
    "I am bleaching and dying due to warming ocean temperatures.",
    "I am an underwater structure built by coral polyps that is home to thousands of sea creatures."
  ],
  easyOptions: ['CORAL REEF', 'KELP FOREST', 'SEA GRASS BED', 'OYSTER BED'],
  funFact: "The Great Barrier Reef in Australia is so large it can be seen from space — it is the largest living structure on Earth."
},

{ id: 'wa-069', answer: 'HOT SPRING', category: 'travel',
  clues: [
    "I am heated by the Earth itself.",
    "People travel from all over the world to soak in me.",
    "I am a natural pool of geothermally heated water that bubbles up from underground."
  ],
  hardClues: [
    "I am heated by the Earth itself.",
    "My water comes from deep underground where rock is almost molten.",
    "People travel from all over the world to soak in me.",
    "In some places my water is so hot it would scald you — only some of me are safe to enter.",
    "I am a natural pool of geothermally heated water that bubbles up from underground."
  ],
  easyOptions: ['HOT SPRING', 'GEYSER', 'MUD POT', 'FUMAROLE'],
  funFact: "The hot springs in Yellowstone are home to extremophile bacteria that can only survive in near-boiling water — and they were the key to developing PCR tests used in medicine."
},

{ id: 'wa-070', answer: 'MANGROVE', category: 'travel',
  clues: [
    "I grow in salt water which almost no other tree can survive.",
    "Baby fish use my roots as a nursery to hide from predators.",
    "I am a coastal tree with tangled roots that grows in tropical saltwater shallows."
  ],
  hardClues: [
    "I grow in salt water which almost no other tree can survive.",
    "My roots grow above the ground like tangled wooden stilts.",
    "Baby fish use my roots as a nursery to hide from predators.",
    "I protect coastlines from storms and erosion better than any sea wall.",
    "I am a coastal tree with tangled roots that grows in tropical saltwater shallows."
  ],
  easyOptions: ['MANGROVE', 'CYPRESS', 'PALM TREE', 'SALT CEDAR'],
  funFact: "Mangrove forests store carbon up to 10 times more efficiently than land forests — making them critical in fighting climate change."
},

// ── GENERAL KNOWLEDGE (30) ───────────────────

{ id: 'wa-071', answer: 'RAINBOW', category: 'general',
  clues: [
    "I appear without warning.",
    "I form an arc in the sky.",
    "I am a colorful arc in the sky that appears after a rainstorm."
  ],
  hardClues: [
    "I appear without warning.",
    "I have seven colors always in the same order.",
    "I form an arc in the sky.",
    "I appear when sunlight shines through falling raindrops.",
    "I am a colorful arc in the sky that appears after a rainstorm."
  ],
  easyOptions: ['RAINBOW', 'SUNRISE', 'NORTHERN LIGHTS', 'HALO'],
  funFact: "Red orange yellow green blue indigo violet — Roy G. Biv helps people remember the colors of a rainbow in order."
},

{ id: 'wa-072', answer: 'SHADOW', category: 'general',
  clues: [
    "I follow you everywhere but I have no weight.",
    "At noon I am short. At sunset I am very long.",
    "I am the dark shape you cast on the ground when you stand in sunlight."
  ],
  hardClues: [
    "I follow you everywhere but I have no weight.",
    "I disappear completely when you are in the dark.",
    "At noon I am short. At sunset I am very long.",
    "I am made when you block the light from reaching the ground.",
    "I am the dark shape you cast on the ground when you stand in sunlight."
  ],
  easyOptions: ['SHADOW', 'REFLECTION', 'SILHOUETTE', 'PENUMBRA'],
  funFact: "On the Moon your shadow would be much darker than on Earth because there is no atmosphere to scatter light around you."
},

{ id: 'wa-073', answer: 'ECHO', category: 'general',
  clues: [
    "I repeat what you say but I am not copying you.",
    "Canyons and caves are the best places to find me.",
    "I am the repetition of a sound caused by sound waves bouncing off a distant surface."
  ],
  hardClues: [
    "I repeat what you say but I am not copying you.",
    "I happen when sound waves bounce off a hard distant surface and return to your ears.",
    "Canyons and caves are the best places to find me.",
    "Bats use me to navigate and hunt in complete darkness.",
    "I am the repetition of a sound caused by sound waves bouncing off a distant surface."
  ],
  easyOptions: ['ECHO', 'THUNDER', 'WHISPER', 'REVERBERATION'],
  funFact: "Bats produce up to 200 ultrasonic pulses per second and use the echoes to build a complete 3D map of their surroundings."
},

{ id: 'wa-074', answer: 'MIRROR', category: 'general',
  clues: [
    "I show you yourself but everything is backwards.",
    "Vampires and werewolves supposedly have no reflection in me.",
    "I am a smooth reflective surface that shows you your own image in reverse."
  ],
  hardClues: [
    "I show you yourself but everything is backwards.",
    "I am made of glass with a thin metallic coating on the back.",
    "Vampires and werewolves supposedly have no reflection in me.",
    "Dentists use a tiny version of me on a stick to see inside your mouth.",
    "I am a smooth reflective surface that shows you your own image in reverse."
  ],
  easyOptions: ['MIRROR', 'WINDOW', 'GLASS', 'LENS'],
  funFact: "The image you see in a mirror is not how others see you — it is horizontally flipped. Photos show how you really look to the world."
},

{ id: 'wa-075', answer: 'LIGHTNING', category: 'general',
  clues: [
    "I am faster than anything you can see.",
    "I am always followed by my partner a few seconds later.",
    "I am a giant spark of electricity that leaps from a storm cloud to the ground."
  ],
  hardClues: [
    "I am faster than anything you can see.",
    "I happen when electrical charge builds up inside a storm cloud.",
    "I am always followed by my partner — thunder — a few seconds later.",
    "I strike the Earth about 100 times every single second.",
    "I am a giant spark of electricity that leaps from a storm cloud to the ground."
  ],
  easyOptions: ['LIGHTNING', 'THUNDER', 'TORNADO', 'BALL LIGHTNING'],
  funFact: "A lightning bolt is five times hotter than the surface of the sun — reaching 30,000 Kelvin in a fraction of a second."
},

{ id: 'wa-076', answer: 'CLOCK', category: 'general',
  clues: [
    "I have been keeping track of something for thousands of years.",
    "I have a face but no eyes.",
    "I am a device that measures and displays the time."
  ],
  hardClues: [
    "I have been keeping track of something for thousands of years.",
    "I have hands but I cannot hold anything.",
    "I have a face but no eyes.",
    "Without me everyone would be late for everything.",
    "I am a device that measures and displays the time."
  ],
  easyOptions: ['CLOCK', 'CALENDAR', 'SUNDIAL', 'HOURGLASS'],
  funFact: "Before standardized time zones in the 1800s every town set its own local time based on the position of the sun."
},

{ id: 'wa-077', answer: 'MAGNET', category: 'general',
  clues: [
    "I attract certain metals without touching them.",
    "Two of me push each other away if you try to join the wrong ends.",
    "I am an object that creates an invisible force field that attracts iron and steel."
  ],
  hardClues: [
    "I attract certain metals without touching them.",
    "I have a north and a south pole.",
    "Two of me push each other away if you try to join the wrong ends.",
    "The Earth itself is one giant version of me.",
    "I am an object that creates an invisible force field that attracts iron and steel."
  ],
  easyOptions: ['MAGNET', 'BATTERY', 'COMPASS', 'ELECTROMAGNET'],
  funFact: "Magnetic forces were used by ancient Chinese sailors for navigation over 2,000 years ago."
},

{ id: 'wa-078', answer: 'KITE', category: 'general',
  clues: [
    "I need wind to do my job.",
    "Benjamin Franklin famously flew me in a thunderstorm.",
    "I am a light frame covered in fabric or paper that flies in the wind on a string."
  ],
  hardClues: [
    "I need wind to do my job.",
    "I am connected to the person flying me by a long string.",
    "Benjamin Franklin famously flew me in a thunderstorm.",
    "I come in hundreds of shapes from simple diamonds to elaborate dragons.",
    "I am a light frame covered in fabric or paper that flies in the wind on a string."
  ],
  easyOptions: ['KITE', 'FRISBEE', 'BOOMERANG', 'WINDSOCK'],
  funFact: "Kites were invented in China about 2,500 years ago and were originally used by the military to measure distances to enemy camps."
},

{ id: 'wa-079', answer: 'TELESCOPE', category: 'general',
  clues: [
    "I make distant things appear much closer.",
    "Galileo used me to discover that the Earth moves around the sun.",
    "I am an instrument that uses lenses or mirrors to make stars and planets appear larger."
  ],
  hardClues: [
    "I make distant things appear much closer.",
    "I was invented in 1608 and changed our understanding of the universe.",
    "Galileo used me to discover that the Earth moves around the sun.",
    "Some versions of me orbit in space to get a clearer view without Earth's blurry atmosphere.",
    "I am an instrument that uses lenses or mirrors to make stars and planets appear larger."
  ],
  easyOptions: ['TELESCOPE', 'MICROSCOPE', 'PERISCOPE', 'SPYGLASS'],
  funFact: "The Hubble Space Telescope has taken images of galaxies so far away the light left them before Earth even existed."
},

{ id: 'wa-080', answer: 'UMBRELLA', category: 'general',
  clues: [
    "I am most useful when the sky is grey.",
    "Opening one indoors is considered bad luck in many cultures.",
    "I am a collapsible canopy on a stick that you hold over your head in the rain."
  ],
  hardClues: [
    "I am most useful when the sky is grey.",
    "I can be folded small enough to fit inside a bag.",
    "Opening one indoors is considered bad luck in many cultures.",
    "In some hot countries I am used to block the sun instead of the rain.",
    "I am a collapsible canopy on a stick that you hold over your head in the rain."
  ],
  easyOptions: ['UMBRELLA', 'RAINCOAT', 'WATERPROOF HAT', 'PARASOL'],
  funFact: "The word umbrella comes from the Latin word umbra meaning shade — because they were originally invented to block the sun, not rain."
},

{ id: 'wa-081', answer: 'LADDER', category: 'general',
  clues: [
    "I help you reach places you cannot reach on your own.",
    "Firefighters use me to rescue people from tall buildings.",
    "I am a portable climbing frame with steps used to reach heights."
  ],
  hardClues: [
    "I help you reach places you cannot reach on your own.",
    "Walking under me is considered bad luck in many countries.",
    "Firefighters use me to rescue people from tall buildings.",
    "I have two long parallel sides with many rungs running between them.",
    "I am a portable climbing frame with steps used to reach heights."
  ],
  easyOptions: ['LADDER', 'SCAFFOLDING', 'STAIRS', 'STEPLADDER'],
  funFact: "The superstition about walking under a ladder comes from medieval times when a leaning ladder formed a triangle — considered a sacred shape."
},

{ id: 'wa-082', answer: 'CANDLE', category: 'general',
  clues: [
    "I have been lighting homes for thousands of years.",
    "My flame flickers in a breeze.",
    "I am a wax cylinder with a wick that you light to produce a soft warm glow."
  ],
  hardClues: [
    "I have been lighting homes for thousands of years.",
    "I get shorter the longer I burn.",
    "My flame flickers in a breeze.",
    "I am made of wax with a thin wick running through my center.",
    "I am a wax cylinder with a wick that you light to produce a soft warm glow."
  ],
  easyOptions: ['CANDLE', 'TORCH', 'LAMP', 'LANTERN'],
  funFact: "The oldest candles ever found were made in China around 200 BC from whale fat."
},

{ id: 'wa-083', answer: 'BOOMERANG', category: 'general',
  clues: [
    "I was invented by Australian Aboriginal people thousands of years ago.",
    "I am used for sport hunting and play.",
    "I am a curved throwing stick that returns to the thrower when launched correctly."
  ],
  hardClues: [
    "I was invented by Australian Aboriginal people thousands of years ago.",
    "If thrown correctly I come back to the person who threw me.",
    "I am used for sport hunting and play.",
    "I am shaped like a curved V or a bent banana.",
    "I am a curved throwing stick that returns to the thrower when launched correctly."
  ],
  easyOptions: ['BOOMERANG', 'FRISBEE', 'JAVELIN', 'THROWING DISC'],
  funFact: "Only about 10% of boomerangs are designed to return — hunting boomerangs are designed to fly straight and hit hard."
},

{ id: 'wa-084', answer: 'SANDCASTLE', category: 'general',
  clues: [
    "I only exist for a short time before my enemy destroys me.",
    "I am built from the most available material on a beach.",
    "I am a structure built from wet sand on a beach that the waves eventually wash away."
  ],
  hardClues: [
    "I only exist for a short time before my enemy destroys me.",
    "My enemy is the tide — it always wins.",
    "I am built from the most available material on a beach.",
    "Children spend hours carefully building me and minutes watching me collapse.",
    "I am a structure built from wet sand on a beach that the waves eventually wash away."
  ],
  easyOptions: ['SANDCASTLE', 'SNOWMAN', 'ICE SCULPTURE', 'SNOW FORT'],
  funFact: "Professional sand sculptors use carving tools and can build structures 50 feet tall that last for months with a special hardening spray."
},

{ id: 'wa-085', answer: 'BUBBLE', category: 'general',
  clues: [
    "I am filled with air but I am not a balloon.",
    "I last only seconds before I pop.",
    "I am a thin sphere of soapy liquid filled with air that floats and pops when touched."
  ],
  hardClues: [
    "I am filled with air but I am not a balloon.",
    "I am always perfectly round because that shape uses the least surface area.",
    "I last only seconds before I pop.",
    "Children chase me across lawns on warm summer afternoons.",
    "I am a thin sphere of soapy liquid filled with air that floats and pops when touched."
  ],
  easyOptions: ['BUBBLE', 'BALLOON', 'SOAP', 'FOAM'],
  funFact: "Bubbles are always round because the sphere is the shape that uses the least surface area to enclose the most air."
},

{ id: 'wa-086', answer: 'BRIDGE', category: 'general',
  clues: [
    "I span a gap to connect two places.",
    "The oldest ones were just logs placed across streams.",
    "I am a structure built over a river or valley to allow people and vehicles to cross."
  ],
  hardClues: [
    "I span a gap to connect two places.",
    "I can cross rivers canyons or even roads.",
    "The oldest ones were just logs placed across streams.",
    "Engineers spend years designing me to safely carry thousands of cars every day.",
    "I am a structure built over a river or valley to allow people and vehicles to cross."
  ],
  easyOptions: ['BRIDGE', 'TUNNEL', 'OVERPASS', 'VIADUCT'],
  funFact: "The longest bridge in the world is the Danyang-Kunshan Grand Bridge in China — it is 102 miles long."
},

{ id: 'wa-087', answer: 'TREASURE MAP', category: 'general',
  clues: [
    "X marks my most important feature.",
    "I am drawn on aged paper with careful clues.",
    "I am a hand-drawn map with clues and an X marking the location of buried treasure."
  ],
  hardClues: [
    "X marks my most important feature.",
    "Pirates are said to have hidden their riches using me.",
    "I am drawn on aged paper with careful clues.",
    "Following me carefully leads to a reward at the end.",
    "I am a hand-drawn map with clues and an X marking the location of buried treasure."
  ],
  easyOptions: ['TREASURE MAP', 'COMPASS', 'SCROLL', 'STAR CHART'],
  funFact: "No authenticated pirate treasure map has ever been found — historians believe they were mostly invented in adventure stories."
},

{ id: 'wa-088', answer: 'SNOWFLAKE', category: 'general',
  clues: [
    "I fall from the sky in winter.",
    "I am made entirely of frozen water.",
    "I am a tiny crystal of ice that forms in clouds and falls to the ground in winter."
  ],
  hardClues: [
    "I fall from the sky in winter.",
    "No two of me are exactly alike — ever.",
    "I am made entirely of frozen water.",
    "Under a magnifying glass I have a perfect six-sided symmetrical pattern.",
    "I am a tiny crystal of ice that forms in clouds and falls to the ground in winter."
  ],
  easyOptions: ['SNOWFLAKE', 'RAINDROP', 'HAILSTONE', 'SLEET'],
  funFact: "A snowflake starts as a single ice crystal around a tiny dust particle and can take up to an hour to fall from cloud to ground."
},

{ id: 'wa-089', answer: 'FOSSIL', category: 'general',
  clues: [
    "I am millions of years old.",
    "Scientists use me to understand life before humans existed.",
    "I am the preserved remains or impression of a prehistoric organism found in rock."
  ],
  hardClues: [
    "I am millions of years old.",
    "I am the remains or impression of something that once lived.",
    "Scientists use me to understand life before humans existed.",
    "Children find me in rocks along riverbeds and cliff faces.",
    "I am the preserved remains or impression of a prehistoric organism found in rock."
  ],
  easyOptions: ['FOSSIL', 'ARTIFACT', 'CRYSTAL', 'MINERAL'],
  funFact: "The oldest fossils ever found are 3.5 billion years old — single-celled bacteria preserved in ancient Australian rocks."
},

{ id: 'wa-090', answer: 'GALAXY', category: 'general',
  clues: [
    "I contain billions of stars.",
    "It takes light 100,000 years to cross me from one side to the other.",
    "I am a massive system of billions of stars gas and dust held together by gravity."
  ],
  hardClues: [
    "I contain billions of stars.",
    "Our sun is just one tiny star among the billions inside me.",
    "It takes light 100,000 years to cross me from one side to the other.",
    "There are more of me in the universe than grains of sand on all of Earth's beaches.",
    "I am a massive system of billions of stars gas and dust held together by gravity."
  ],
  easyOptions: ['GALAXY', 'SOLAR SYSTEM', 'NEBULA', 'QUASAR'],
  funFact: "The Milky Way — our galaxy — is on a collision course with the Andromeda Galaxy. The crash will happen in about 4.5 billion years."
},

{ id: 'wa-091', answer: 'PIANO', category: 'general',
  clues: [
    "I have 88 keys but no locks.",
    "Each of my keys causes a small hammer to strike a string inside me.",
    "I am a large keyboard instrument where pressing keys causes hammers to strike strings."
  ],
  hardClues: [
    "I have 88 keys but no locks.",
    "I am one of the heaviest musical instruments ever made.",
    "Each of my keys causes a small hammer to strike a string inside me.",
    "Some versions of me have three legs and a large curved body.",
    "I am a large keyboard instrument where pressing keys causes hammers to strike strings."
  ],
  easyOptions: ['PIANO', 'ORGAN', 'HARPSICHORD', 'CLAVICHORD'],
  funFact: "A piano has over 12,000 parts and takes an experienced craftsperson over a year to build by hand."
},

{ id: 'wa-092', answer: 'LIBRARY', category: 'general',
  clues: [
    "I am full of knowledge but very quiet.",
    "The ancient one in Alexandria Egypt was considered one of the wonders of the world.",
    "I am a building full of books that anyone can borrow and read for free."
  ],
  hardClues: [
    "I am full of knowledge but very quiet.",
    "You can borrow things from me for free and return them later.",
    "The ancient one in Alexandria Egypt was considered one of the wonders of the world.",
    "I organize everything using a special numbering system.",
    "I am a building full of books that anyone can borrow and read for free."
  ],
  easyOptions: ['LIBRARY', 'BOOKSHOP', 'MUSEUM', 'ARCHIVE'],
  funFact: "The Library of Congress in Washington DC is the largest library in the world with over 170 million items."
},

{ id: 'wa-093', answer: 'VOLCANO', category: 'general',
  clues: [
    "I look like a mountain but I have a dangerous secret.",
    "My eruption in 79 AD buried an entire Roman city.",
    "I am a mountain with an opening at the top through which molten rock and ash can erupt."
  ],
  hardClues: [
    "I look like a mountain but I have a dangerous secret.",
    "Pressure builds inside me for years before I finally act.",
    "My eruption in 79 AD buried an entire Roman city.",
    "I can lie dormant for centuries then suddenly wake up without much warning.",
    "I am a mountain with an opening at the top through which molten rock and ash can erupt."
  ],
  easyOptions: ['VOLCANO', 'GEYSER', 'HOT SPRING', 'CINDER CONE'],
  funFact: "Mount Vesuvius buried Pompeii so suddenly in 79 AD that people were preserved mid-action — eating talking running."
},

{ id: 'wa-094', answer: 'RAINBOW', category: 'general',
  clues: [
    "I require both sun and rain to appear.",
    "I appear in the opposite direction from the sun.",
    "I am an arc of seven colors that appears in the sky when sunlight passes through rain."
  ],
  hardClues: [
    "I require both sun and rain to appear.",
    "Ancient peoples believed I was a bridge between the human world and the sky above.",
    "I appear in the opposite direction from the sun.",
    "My colors are always in exactly the same order from outside edge to inside.",
    "I am an arc of seven colors that appears in the sky when sunlight passes through rain."
  ],
  easyOptions: ['RAINBOW', 'AURORA', 'HALO', 'MOONBOW'],
  funFact: "A double rainbow occurs when light reflects twice inside water droplets — and the colors of the outer rainbow are always reversed."
},

{ id: 'wa-095', answer: 'SEED', category: 'general',
  clues: [
    "I am tiny but I contain an entire future.",
    "Some of me can survive for thousands of years before sprouting.",
    "I am a small object produced by a plant that can grow into a new plant when conditions are right."
  ],
  hardClues: [
    "I am tiny but I contain an entire future.",
    "I need water warmth and soil to begin my work.",
    "Some of me can survive for thousands of years before sprouting.",
    "I am dispersed by wind water animals and people.",
    "I am a small object produced by a plant that can grow into a new plant when conditions are right."
  ],
  easyOptions: ['SEED', 'EGG', 'SPORE', 'BULB'],
  funFact: "A 2,000-year-old date palm seed found near the Dead Sea was successfully grown into a living tree."
},

{ id: 'wa-096', answer: 'MOON', category: 'general',
  clues: [
    "I am Earth's only natural companion.",
    "Only 12 humans have ever stood on my surface.",
    "I am the large rocky sphere that orbits Earth and lights up the night sky."
  ],
  hardClues: [
    "I am Earth's only natural companion.",
    "I control the tides of every ocean on Earth.",
    "Only 12 humans have ever stood on my surface.",
    "I have no atmosphere weather or wind — just ancient silent craters.",
    "I am the large rocky sphere that orbits Earth and lights up the night sky."
  ],
  easyOptions: ['MOON', 'PLANET', 'COMET', 'ASTEROID'],
  funFact: "The Moon is slowly drifting away from Earth at about 1.5 inches per year — the same rate your fingernails grow."
},

{ id: 'wa-097', answer: 'PIZZA', category: 'general',
  clues: [
    "I originated in Naples Italy in the 18th century.",
    "My base is dough my sauce is tomato and then anything goes.",
    "I am a baked flatbread topped with tomato sauce cheese and various toppings."
  ],
  hardClues: [
    "I originated in Naples Italy in the 18th century.",
    "Americans eat over 3 billion of me every year.",
    "My base is dough my sauce is tomato and then anything goes.",
    "I am round when I am made but often served in triangular slices.",
    "I am a baked flatbread topped with tomato sauce cheese and various toppings."
  ],
  easyOptions: ['PIZZA', 'FLATBREAD', 'CALZONE', 'FOCACCIA'],
  funFact: "The world's largest pizza was made in California in 2012 and measured 13,580 square feet — about the size of three basketball courts."
},

{ id: 'wa-098', answer: 'BICYCLE', category: 'general',
  clues: [
    "I have two wheels and no engine.",
    "I require balance and practice to master.",
    "I am a two-wheeled vehicle powered entirely by pedaling with your legs."
  ],
  hardClues: [
    "I have two wheels and no engine.",
    "I was invented in the 1800s and transformed how people could travel.",
    "I require balance and practice to master.",
    "I am the most energy-efficient form of transportation ever invented.",
    "I am a two-wheeled vehicle powered entirely by pedaling with your legs."
  ],
  easyOptions: ['BICYCLE', 'SCOOTER', 'SKATEBOARD', 'UNICYCLE'],
  funFact: "Riding a bicycle is 50 times more energy efficient per mile than driving a car."
},

{ id: 'wa-099', answer: 'CAMERA', category: 'general',
  clues: [
    "I freeze time.",
    "Early versions of me required people to sit completely still for several minutes.",
    "I am a device that captures light to create a permanent image of a moment in time."
  ],
  hardClues: [
    "I freeze time.",
    "I have been carried on every family vacation for over 150 years.",
    "Early versions of me required people to sit completely still for several minutes.",
    "Today most people carry one in their pocket everywhere they go.",
    "I am a device that captures light to create a permanent image of a moment in time."
  ],
  easyOptions: ['CAMERA', 'TELESCOPE', 'MICROSCOPE', 'PROJECTOR'],
  funFact: "The first photograph ever taken required an 8-hour exposure time — meaning the photographer had to hold perfectly still all day."
},

{ id: 'wa-100', answer: 'DREAM', category: 'general',
  clues: [
    "Everyone experiences me but scientists still do not fully understand me.",
    "I can feel completely real while it is happening.",
    "I am a sequence of images thoughts and feelings that occur in your mind while you sleep."
  ],
  hardClues: [
    "Everyone experiences me but scientists still do not fully understand me.",
    "I happen while you sleep.",
    "I can feel completely real while it is happening.",
    "You forget 90% of me within 10 minutes of waking up.",
    "I am a sequence of images thoughts and feelings that occur in your mind while you sleep."
  ],
  easyOptions: ['DREAM', 'MEMORY', 'IMAGINATION', 'DAYDREAM'],
  funFact: "People who are blind from birth still have dreams — but they experience them through sound touch smell and emotion rather than images."
},

];

const STORAGE_PREFIX = 'whatami_seen_';

export async function getSeenIds(tripId: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(`${STORAGE_PREFIX}${tripId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function markSeen(tripId: string, puzzleId: string): Promise<void> {
  try {
    const seen = await getSeenIds(tripId);
    if (!seen.includes(puzzleId)) {
      await AsyncStorage.setItem(`${STORAGE_PREFIX}${tripId}`, JSON.stringify([...seen, puzzleId]));
    }
  } catch {}
}

export async function pickPuzzle(tripId: string): Promise<WhatAmIPuzzle> {
  let seen = await getSeenIds(tripId);
  let unseen = WHAT_AM_I_PUZZLES.filter(p => !seen.includes(p.id));
  if (unseen.length === 0) {
    seen = [];
    await AsyncStorage.setItem(`${STORAGE_PREFIX}${tripId}`, JSON.stringify([]));
    unseen = WHAT_AM_I_PUZZLES;
  }
  const pick = unseen[Math.floor(Math.random() * unseen.length)];
  await markSeen(tripId, pick.id);
  return pick;
}
