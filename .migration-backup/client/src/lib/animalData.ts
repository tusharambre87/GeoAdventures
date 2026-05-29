
export interface AnimalCard {
  id: string;
  name: string;
  clue: string;
  continent: string;
  country?: string; // Optional, as some (like Antarctica) are just continent
  imageEmoji: string; // Using emojis for prototype visuals
}

export const ANIMAL_CARDS: AnimalCard[] = [
  // Africa
  {
    id: "anim_lion",
    name: "Lion",
    clue: "I am known as the King of the Jungle with a big mane. I roar loudly!",
    continent: "Africa",
    country: "Tanzania",
    imageEmoji: "🦁"
  },
  {
    id: "anim_elephant",
    name: "Elephant",
    clue: "I have a very long nose called a trunk and big floppy ears.",
    continent: "Africa",
    country: "Kenya",
    imageEmoji: "🐘"
  },
  // Asia
  {
    id: "anim_panda",
    name: "Giant Panda",
    clue: "I am a black and white bear who loves eating bamboo all day.",
    continent: "Asia",
    country: "China",
    imageEmoji: "🐼"
  },
  {
    id: "anim_tiger",
    name: "Tiger",
    clue: "I am a big orange cat with black stripes. I am very strong!",
    continent: "Asia",
    country: "India",
    imageEmoji: "🐯"
  },
  // Europe
  {
    id: "anim_reindeer",
    name: "Reindeer",
    clue: "I live in the cold north and have big antlers. Some say I pull a sleigh!",
    continent: "Europe",
    country: "Finland",
    imageEmoji: "🦌"
  },
  {
    id: "anim_puffin",
    name: "Puffin",
    clue: "I am a small bird with a colorful beak. I love to dive into the sea.",
    continent: "Europe",
    country: "Iceland",
    imageEmoji: "🐧" // Close enough emoji
  },
  // North America
  {
    id: "anim_eagle",
    name: "Bald Eagle",
    clue: "I am a large bird with a white head. I fly high in the sky!",
    continent: "North America",
    country: "USA",
    imageEmoji: "🦅"
  },
  {
    id: "anim_bison",
    name: "Bison",
    clue: "I am huge and shaggy with horns. I roam the grassy plains.",
    continent: "North America",
    country: "USA",
    imageEmoji: "🦬"
  },
  // South America
  {
    id: "anim_jaguar",
    name: "Jaguar",
    clue: "I am a spotted cat who loves to swim in the rainforest rivers.",
    continent: "South America",
    country: "Brazil",
    imageEmoji: "🐆"
  },
  {
    id: "anim_llama",
    name: "Llama",
    clue: "I have soft wool and a long neck. I live high in the Andes mountains.",
    continent: "South America",
    country: "Peru",
    imageEmoji: "🦙"
  },
  // Oceania
  {
    id: "anim_kangaroo",
    name: "Kangaroo",
    clue: "I hop on two powerful legs and carry my baby in a pouch.",
    continent: "Oceania",
    country: "Australia",
    imageEmoji: "🦘"
  },
  {
    id: "anim_koala",
    name: "Koala",
    clue: "I sleep in eucalyptus trees and look like a cuddly teddy bear.",
    continent: "Oceania",
    country: "Australia",
    imageEmoji: "🐨"
  },
  // Antarctica
  {
    id: "anim_penguin",
    name: "Emperor Penguin",
    clue: "I cannot fly, but I swim very well in icy waters. I wear a tuxedo!",
    continent: "Antarctica",
    imageEmoji: "🐧"
  }
];
