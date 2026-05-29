export const GEOGRAPHY_FACTS = [
  { fact: "Russia is so big that it spans 11 time zones!", icon: "🌍", category: "Countries" },
  { fact: "The Amazon River has more water than any other river in the world!", icon: "🌊", category: "Rivers" },
  { fact: "Mount Everest grows about 4 millimeters taller every year!", icon: "🏔️", category: "Mountains" },
  { fact: "Canada has more lakes than all other countries combined!", icon: "🇨🇦", category: "Countries" },
  { fact: "The Sahara Desert is almost as big as the entire United States!", icon: "🏜️", category: "Deserts" },
  { fact: "Tokyo, Japan has more people than the entire country of Canada!", icon: "🗼", category: "Cities" },
  { fact: "There's a town in Norway where the sun doesn't set for 76 days!", icon: "☀️", category: "Places" },
  { fact: "Australia is wider than the moon!", icon: "🌙", category: "Countries" },
  { fact: "The Great Wall of China is longer than the distance from New York to Los Angeles!", icon: "🏯", category: "Landmarks" },
  { fact: "Iceland has no mosquitoes at all!", icon: "🇮🇸", category: "Countries" },
  { fact: "Vatican City is the smallest country - you can walk across it in 20 minutes!", icon: "⛪", category: "Countries" },
  { fact: "The Nile River flows through 11 different countries!", icon: "🌍", category: "Rivers" },
  { fact: "Antarctica is the only continent with no permanent human residents!", icon: "🐧", category: "Continents" },
  { fact: "Brazil borders every South American country except Chile and Ecuador!", icon: "🇧🇷", category: "Countries" },
  { fact: "Mount Chimborazo in Ecuador is the closest point on Earth to space!", icon: "🚀", category: "Mountains" },
  { fact: "There's a lake in Australia that's naturally pink!", icon: "💗", category: "Lakes" },
  { fact: "The Pacific Ocean is bigger than all the land on Earth combined!", icon: "🌊", category: "Oceans" },
  { fact: "Greenland is the world's largest island, but only 56,000 people live there!", icon: "❄️", category: "Islands" },
  { fact: "Singapore has the world's first night zoo!", icon: "🦁", category: "Cities" },
  { fact: "There are more pyramids in Sudan than in Egypt!", icon: "🔺", category: "Landmarks" },
  { fact: "The Dead Sea is so salty you can float without trying!", icon: "🏊", category: "Lakes" },
  { fact: "Africa is home to 54 different countries!", icon: "🌍", category: "Continents" },
  { fact: "Venice, Italy is built on 118 small islands connected by bridges!", icon: "🌉", category: "Cities" },
  { fact: "The longest place name has 85 letters - it's a hill in New Zealand!", icon: "📝", category: "Places" },
  { fact: "There's a forest in Poland where all the trees are mysteriously curved!", icon: "🌲", category: "Nature" },
  { fact: "Mongolia has the fewest people per square mile of any country!", icon: "🐴", category: "Countries" },
  { fact: "The Grand Canyon is so deep, a stack of 5 Empire State Buildings would fit inside!", icon: "🏜️", category: "Landmarks" },
  { fact: "Finland has about 188,000 lakes - it's called the Land of a Thousand Lakes!", icon: "🇫🇮", category: "Countries" },
  { fact: "Dolphins sleep with one eye open!", icon: "🐬", category: "Animals" },
  { fact: "The Eiffel Tower can grow 6 inches taller in summer due to heat expansion!", icon: "🗼", category: "Landmarks" },
];

export function getFactOfTheDay(): { fact: string; icon: string; category: string } {
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  return GEOGRAPHY_FACTS[dayOfYear % GEOGRAPHY_FACTS.length];
}

export function getRandomFact(): { fact: string; icon: string; category: string } {
  return GEOGRAPHY_FACTS[Math.floor(Math.random() * GEOGRAPHY_FACTS.length)];
}

export function getRandomFactExcluding(currentFact: string): { fact: string; icon: string; category: string } {
  const otherFacts = GEOGRAPHY_FACTS.filter(f => f.fact !== currentFact);
  if (otherFacts.length === 0) return GEOGRAPHY_FACTS[0];
  return otherFacts[Math.floor(Math.random() * otherFacts.length)];
}
