export interface Buddy {
  id: string;
  name: string;
  country: string;
  funFact: string;
  storyHook: string;
  options: string[]; // Two options: correct country + one distractor
  imagePrompt?: string; // For reference
  voiceLine: string; // Text for the voice line
}

export const FIND_MY_HOME_DATA: Buddy[] = [
  {
    id: "panda",
    name: "Panda Buddy",
    country: "China",
    funFact: "Eats bamboo all day.",
    storyHook: "Loves hosting bamboo picnics for anyone who visits.",
    options: ["China", "United States"],
    voiceLine: "Visit me in China!"
  },
  {
    id: "ninja-cat",
    name: "Ninja Cat",
    country: "Japan",
    funFact: "Moves quietly like a whisper.",
    storyHook: "Sneaks around cherry blossom trees collecting pink petals.",
    options: ["Japan", "Brazil"],
    voiceLine: "Come see the cherry blossoms in Japan!"
  },
  {
    id: "koala",
    name: "Koala Cuddles",
    country: "Australia",
    funFact: "Sleeps up to 20 hours.",
    storyHook: "Falls asleep mid-hug while hanging on a eucalyptus tree.",
    options: ["Australia", "Canada"],
    voiceLine: "G'day from Australia!"
  },
  {
    id: "penguin",
    name: "Penguin Slider",
    country: "Antarctica",
    funFact: "Belly-slides to travel faster.",
    storyHook: "Races other penguins on “Ice Track Tuesdays.”",
    options: ["Antarctica", "Egypt"],
    voiceLine: "Brrr! It's cold in Antarctica!"
  },
  {
    id: "cowboy-pup",
    name: "Cowboy Pup",
    country: "United States",
    funFact: "Rides tiny toy horses.",
    storyHook: "Practices rope tricks to lasso falling marshmallows.",
    options: ["United States", "France"],
    voiceLine: "Howdy from the USA!"
  },
  {
    id: "eiffel-mouse",
    name: "Eiffel Mouse",
    country: "France",
    funFact: "Smells every baguette before eating it.",
    storyHook: "Bakes “mouse-sized croissants” every morning.",
    options: ["France", "Italy"],
    voiceLine: "Bonjour from France!"
  },
  {
    id: "safari-lion",
    name: "Safari Lion",
    country: "Kenya",
    funFact: "Can roar really loud.",
    storyHook: "Roars goodnight to all his jungle friends at bedtime.",
    options: ["Kenya", "Russia"],
    voiceLine: "Jambo! Welcome to Kenya!"
  },
  {
    id: "pharaoh-camel",
    name: "Pharaoh Camel",
    country: "Egypt",
    funFact: "Can walk on hot sand.",
    storyHook: "Guards a golden treasure inside the Great Pyramid.",
    options: ["Egypt", "Norway"],
    voiceLine: "Greetings from ancient Egypt!"
  },
  {
    id: "samba-parrot",
    name: "Samba Parrot",
    country: "Brazil",
    funFact: "Dances whenever it hears music.",
    storyHook: "Hosts jungle dance parties under the Amazon moon.",
    options: ["Brazil", "India"],
    voiceLine: "Let's dance in Brazil!"
  },
  {
    id: "snowy-bear",
    name: "Snowy Bear",
    country: "Canada",
    funFact: "Loves sliding in fresh snow.",
    storyHook: "Builds giant snow forts to invite friends to play.",
    options: ["Canada", "Mexico"],
    voiceLine: "Hello from snowy Canada!"
  },
  {
    id: "taj-tiger",
    name: "Taj Tiger",
    country: "India",
    funFact: "Runs super fast.",
    storyHook: "Likes racing birds near the Taj Mahal at sunrise.",
    options: ["India", "Thailand"],
    voiceLine: "Namaste from India!"
  },
  {
    id: "viking-puffin",
    name: "Viking Puffin",
    country: "Iceland",
    funFact: "Has colorful beak feathers.",
    storyHook: "Sails tiny wooden boats through chilly waters.",
    options: ["Iceland", "Spain"],
    voiceLine: "Ahoy from Iceland!"
  },
  {
    id: "kiwi-bird",
    name: "Kiwi Bird",
    country: "New Zealand",
    funFact: "Can’t fly but runs fast.",
    storyHook: "Loves nighttime treasure hunts in the forest.",
    options: ["New Zealand", "Peru"],
    voiceLine: "Kia Ora from New Zealand!"
  },
  {
    id: "fiesta-llama",
    name: "Fiesta Llama",
    country: "Peru",
    funFact: "Carries colorful blankets everywhere.",
    storyHook: "Leads mountain parades near Machu Picchu.",
    options: ["Peru", "Germany"],
    voiceLine: "Hola form the mountains of Peru!"
  },
  {
    id: "tango-fox",
    name: "Tango Fox",
    country: "Argentina",
    funFact: "Dances with a rose.",
    storyHook: "Performs tango steps for all the friends in the plaza.",
    options: ["Argentina", "South Korea"],
    voiceLine: "Vamos to Argentina!"
  }
];
