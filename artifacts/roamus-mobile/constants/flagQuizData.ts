export type FlagQuizCountry = {
  name: string;
  flagEmoji: string;
  countryCode: string;
  funFact: string;
};

export type FlagQuizQuestion = {
  correct: FlagQuizCountry;
  distractors: [FlagQuizCountry, FlagQuizCountry, FlagQuizCountry];
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function shuffleAndPickQuestions(count: number): FlagQuizQuestion[] {
  const shuffled = shuffle(FLAG_QUIZ_COUNTRIES);
  const selected = shuffled.slice(0, count);
  return selected.map((correct) => {
    const others = FLAG_QUIZ_COUNTRIES.filter((c) => c.countryCode !== correct.countryCode);
    const distractorPool = shuffle(others).slice(0, 3);
    return {
      correct,
      distractors: [distractorPool[0], distractorPool[1], distractorPool[2]] as [FlagQuizCountry, FlagQuizCountry, FlagQuizCountry],
    };
  });
}

export const FLAG_QUIZ_COUNTRIES: FlagQuizCountry[] = [
  // ── Americas ────────────────────────────────────────────────
  {
    name: "United States",
    flagEmoji: "\uD83C\uDDFA\uD83C\uDDF8",
    countryCode: "US",
    funFact: "The 50 stars on the US flag represent the 50 states, and the 13 stripes represent the original colonies.",
  },
  {
    name: "Canada",
    flagEmoji: "\uD83C\uDDE8\uD83C\uDDE6",
    countryCode: "CA",
    funFact: "Canada's maple leaf flag was adopted in 1965 — before that, Canada used a flag with the British Union Jack on it.",
  },
  {
    name: "Brazil",
    flagEmoji: "\uD83C\uDDE7\uD83C\uDDF7",
    countryCode: "BR",
    funFact: "Brazil's green and yellow flag has a blue globe with stars showing the night sky over Rio de Janeiro on November 15, 1889.",
  },
  {
    name: "Mexico",
    flagEmoji: "\uD83C\uDDF2\uD83C\uDDFD",
    countryCode: "MX",
    funFact: "Mexico's flag shows an eagle eating a snake on a cactus — this comes from an ancient Aztec legend about founding their city.",
  },
  {
    name: "Argentina",
    flagEmoji: "\uD83C\uDDE6\uD83C\uDDF7",
    countryCode: "AR",
    funFact: "Argentina's flag has a golden Sun of May in the center, representing the May Revolution of 1810.",
  },
  {
    name: "Jamaica",
    flagEmoji: "\uD83C\uDDEF\uD83C\uDDF2",
    countryCode: "JM",
    funFact: "Jamaica's flag is the only national flag that contains neither red, white, nor blue — it uses black, gold, and green.",
  },
  {
    name: "Peru",
    flagEmoji: "\uD83C\uDDF5\uD83C\uDDEA",
    countryCode: "PE",
    funFact: "Peru's red and white flag was designed by General Jose de San Martin, who was inspired by a flock of flamingos he saw flying.",
  },
  {
    name: "Colombia",
    flagEmoji: "\uD83C\uDDE8\uD83C\uDDF4",
    countryCode: "CO",
    funFact: "Colombia's yellow stripe is the widest because it represents gold — Colombia was known as El Dorado, the land of gold.",
  },
  // ── Europe ──────────────────────────────────────────────────
  {
    name: "France",
    flagEmoji: "\uD83C\uDDEB\uD83C\uDDF7",
    countryCode: "FR",
    funFact: "France's blue, white, and red tricolor became famous during the French Revolution and inspired flags of many other countries.",
  },
  {
    name: "Germany",
    flagEmoji: "\uD83C\uDDE9\uD83C\uDDEA",
    countryCode: "DE",
    funFact: "Germany's black, red, and gold colors were worn by soldiers fighting Napoleon in the early 1800s.",
  },
  {
    name: "Italy",
    flagEmoji: "\uD83C\uDDEE\uD83C\uDDF9",
    countryCode: "IT",
    funFact: "Italy's green, white, and red tricolor was inspired by the French flag. Napoleon introduced it when he conquered northern Italy.",
  },
  {
    name: "Spain",
    flagEmoji: "\uD83C\uDDEA\uD83C\uDDF8",
    countryCode: "ES",
    funFact: "Spain's red and yellow flag features a coat of arms showing the castles and lions of the kingdoms that united to form Spain.",
  },
  {
    name: "United Kingdom",
    flagEmoji: "\uD83C\uDDEC\uD83C\uDDE7",
    countryCode: "GB",
    funFact: "The UK's Union Jack combines three crosses: St George's cross for England, St Andrew's for Scotland, and St Patrick's for Ireland.",
  },
  {
    name: "Portugal",
    flagEmoji: "\uD83C\uDDF5\uD83C\uDDF9",
    countryCode: "PT",
    funFact: "Portugal's flag has an armillary sphere — a navigation tool — because Portugal was a great seafaring nation.",
  },
  {
    name: "Netherlands",
    flagEmoji: "\uD83C\uDDF3\uD83C\uDDF1",
    countryCode: "NL",
    funFact: "The Dutch flag was the first tricolor flag in the world and inspired many other national flags, including France's.",
  },
  {
    name: "Switzerland",
    flagEmoji: "\uD83C\uDDE8\uD83C\uDDED",
    countryCode: "CH",
    funFact: "Switzerland has one of only two square national flags in the world. The other is Vatican City.",
  },
  {
    name: "Sweden",
    flagEmoji: "\uD83C\uDDF8\uD83C\uDDEA",
    countryCode: "SE",
    funFact: "Sweden's blue and gold flag is one of the oldest in the world, with designs going back to at least the 1500s.",
  },
  {
    name: "Norway",
    flagEmoji: "\uD83C\uDDF3\uD83C\uDDF4",
    countryCode: "NO",
    funFact: "Norway's flag contains the flags of Iceland, Denmark, Finland, and Sweden hidden within its cross design.",
  },
  {
    name: "Denmark",
    flagEmoji: "\uD83C\uDDE9\uD83C\uDDF0",
    countryCode: "DK",
    funFact: "Denmark's Dannebrog is the oldest national flag still in use — it has been flown since the 13th century.",
  },
  {
    name: "Greece",
    flagEmoji: "\uD83C\uDDEC\uD83C\uDDF7",
    countryCode: "GR",
    funFact: "Greece's nine blue and white stripes represent the nine syllables of the phrase 'Freedom or Death' from the Greek revolution.",
  },
  {
    name: "Poland",
    flagEmoji: "\uD83C\uDDF5\uD83C\uDDF1",
    countryCode: "PL",
    funFact: "Poland's white and red colors come from the white eagle on a red background that has been Poland's symbol for over 700 years.",
  },
  {
    name: "Ireland",
    flagEmoji: "\uD83C\uDDEE\uD83C\uDDEA",
    countryCode: "IE",
    funFact: "Ireland's green represents the Gaelic tradition, white represents peace, and orange represents the Protestant minority.",
  },
  // ── Africa ──────────────────────────────────────────────────
  {
    name: "South Africa",
    flagEmoji: "\uD83C\uDDFF\uD83C\uDDE6",
    countryCode: "ZA",
    funFact: "South Africa's colorful flag adopted in 1994 represents the coming together of its many peoples after apartheid ended.",
  },
  {
    name: "Kenya",
    flagEmoji: "\uD83C\uDDF0\uD83C\uDDEA",
    countryCode: "KE",
    funFact: "Kenya's flag features a Maasai warrior's shield and two crossed spears, representing the defense of freedom.",
  },
  {
    name: "Ghana",
    flagEmoji: "\uD83C\uDDEC\uD83C\uDDED",
    countryCode: "GH",
    funFact: "Ghana's flag has a black star at the center — it is called the Lodestar of African Freedom and inspired many African flags.",
  },
  {
    name: "Ethiopia",
    flagEmoji: "\uD83C\uDDEA\uD83C\uDDF9",
    countryCode: "ET",
    funFact: "Ethiopia's green, yellow, and red colors inspired Pan-Africanism and were adopted by dozens of African nations.",
  },
  {
    name: "Morocco",
    flagEmoji: "\uD83C\uDDF2\uD83C\uDDE6",
    countryCode: "MA",
    funFact: "Morocco's red flag with a green pentagram star is one of the oldest flags in the world, with roots going back to the 1600s.",
  },
  {
    name: "Nigeria",
    flagEmoji: "\uD83C\uDDF3\uD83C\uDDEC",
    countryCode: "NG",
    funFact: "Nigeria's simple green and white flag was designed by a student, Michael Taiwo Akinkunmi, in a competition in 1959.",
  },
  {
    name: "Egypt",
    flagEmoji: "\uD83C\uDDEA\uD83C\uDDEC",
    countryCode: "EG",
    funFact: "Egypt's flag features the Eagle of Saladin — a golden eagle used as a symbol by the great 12th-century Muslim leader.",
  },
  // ── Asia ────────────────────────────────────────────────────
  {
    name: "Japan",
    flagEmoji: "\uD83C\uDDEF\uD83C\uDDF5",
    countryCode: "JP",
    funFact: "Japan's Hinomaru, meaning 'circle of the sun,' is one of the simplest national flags and has been used for over 1,000 years.",
  },
  {
    name: "China",
    flagEmoji: "\uD83C\uDDE8\uD83C\uDDF3",
    countryCode: "CN",
    funFact: "China's flag has one large star and four small ones. The large star represents the Communist Party and the four small ones the Chinese people.",
  },
  {
    name: "India",
    flagEmoji: "\uD83C\uDDEE\uD83C\uDDF3",
    countryCode: "IN",
    funFact: "India's flag has a navy blue wheel called the Ashoka Chakra with 24 spokes, representing the cycle of time and progress.",
  },
  {
    name: "South Korea",
    flagEmoji: "\uD83C\uDDF0\uD83C\uDDF7",
    countryCode: "KR",
    funFact: "South Korea's Taegukgi flag features symbols from ancient Korean philosophy representing heaven, earth, water, and fire.",
  },
  {
    name: "Thailand",
    flagEmoji: "\uD83C\uDDF9\uD83C\uDDED",
    countryCode: "TH",
    funFact: "Thailand's red, white, and blue flag was designed in 1917 when King Vajiravudh wanted to show solidarity with the Allied powers in WWI.",
  },
  {
    name: "Vietnam",
    flagEmoji: "\uD83C\uDDFB\uD83C\uDDF3",
    countryCode: "VN",
    funFact: "Vietnam's red flag with a yellow star has been used since 1945. The star's five points represent workers, farmers, soldiers, intellectuals, and youth.",
  },
  {
    name: "Indonesia",
    flagEmoji: "\uD83C\uDDEE\uD83C\uDDE9",
    countryCode: "ID",
    funFact: "Indonesia's red and white flag is known as Sang Saka Merah-Putih. Red symbolizes courage and white symbolizes purity.",
  },
  {
    name: "Malaysia",
    flagEmoji: "\uD83C\uDDF2\uD83C\uDDFE",
    countryCode: "MY",
    funFact: "Malaysia's 14 stripes and 14-pointed star represent its 13 states plus the federal government.",
  },
  {
    name: "Singapore",
    flagEmoji: "\uD83C\uDDF8\uD83C\uDDEC",
    countryCode: "SG",
    funFact: "Singapore's crescent moon and five stars represent a new nation on the rise, with the stars standing for democracy, peace, progress, justice, and equality.",
  },
  {
    name: "Pakistan",
    flagEmoji: "\uD83C\uDDF5\uD83C\uDDF0",
    countryCode: "PK",
    funFact: "Pakistan's green and white flag features a crescent and star. The white stripe represents the non-Muslim minorities of Pakistan.",
  },
  {
    name: "Turkey",
    flagEmoji: "\uD83C\uDDF9\uD83C\uDDF7",
    countryCode: "TR",
    funFact: "Turkey's red flag with a crescent and star is one of the oldest flag designs in the world — similar designs date back to the Ottoman Empire.",
  },
  {
    name: "Saudi Arabia",
    flagEmoji: "\uD83C\uDDF8\uD83C\uDDE6",
    countryCode: "SA",
    funFact: "Saudi Arabia's flag has Arabic writing that says the Islamic declaration of faith, making it one of the few flags with a religious text.",
  },
  {
    name: "Israel",
    flagEmoji: "\uD83C\uDDEE\uD83C\uDDF1",
    countryCode: "IL",
    funFact: "Israel's flag features the Star of David and is based on the design of the Jewish prayer shawl called the tallit.",
  },
  {
    name: "Philippines",
    flagEmoji: "\uD83C\uDDF5\uD83C\uDDED",
    countryCode: "PH",
    funFact: "The Philippines' flag is the only one that is flipped upside down during wartime — when at war, the red stripe goes on top.",
  },
  // ── Oceania ────────────────────────────────────────────────
  {
    name: "Australia",
    flagEmoji: "\uD83C\uDDE6\uD83C\uDDFA",
    countryCode: "AU",
    funFact: "Australia's flag features the Southern Cross constellation, which can only be seen in the Southern Hemisphere.",
  },
  {
    name: "New Zealand",
    flagEmoji: "\uD83C\uDDF3\uD83C\uDDFF",
    countryCode: "NZ",
    funFact: "New Zealand's flag has four red stars making up the Southern Cross — one fewer star than Australia's version of the constellation.",
  },
  {
    name: "Fiji",
    flagEmoji: "\uD83C\uDDEB\uD83C\uDDEF",
    countryCode: "FJ",
    funFact: "Fiji's light blue flag reflects the Pacific Ocean that surrounds the islands, and features a British coat of arms with sugarcane and a lion.",
  },
  // ── More Europe ─────────────────────────────────────────────
  {
    name: "Austria",
    flagEmoji: "\uD83C\uDDE6\uD83C\uDDF9",
    countryCode: "AT",
    funFact: "Austria's red-white-red flag is one of the oldest in the world. Legend says a duke's white coat turned red from battle blood except under his belt.",
  },
  {
    name: "Belgium",
    flagEmoji: "\uD83C\uDDE7\uD83C\uDDEA",
    countryCode: "BE",
    funFact: "Belgium's black, yellow, and red flag was inspired by the 1789 French Revolution and taken from the colors of the Duchy of Brabant.",
  },
  {
    name: "Finland",
    flagEmoji: "\uD83C\uDDEB\uD83C\uDDEE",
    countryCode: "FI",
    funFact: "Finland's blue cross on white represents the country's thousands of lakes (blue) and winter snow (white).",
  },
  {
    name: "Iceland",
    flagEmoji: "\uD83C\uDDEE\uD83C\uDDF8",
    countryCode: "IS",
    funFact: "Iceland's flag red cross represents fire from its many volcanoes, the white stands for the glaciers, and blue for the sea.",
  },
  {
    name: "Czech Republic",
    flagEmoji: "\uD83C\uDDE8\uD83C\uDDFF",
    countryCode: "CZ",
    funFact: "The Czech Republic added a blue triangle to its flag to tell it apart from Poland's similar red-and-white design.",
  },
  {
    name: "Hungary",
    flagEmoji: "\uD83C\uDDED\uD83C\uDDFA",
    countryCode: "HU",
    funFact: "Hungary's red, white, and green horizontal tricolor was adopted during the 1848 revolution inspired by the French tricolor.",
  },
  {
    name: "Ukraine",
    flagEmoji: "\uD83C\uDDFA\uD83C\uDDE6",
    countryCode: "UA",
    funFact: "Ukraine's blue over yellow flag represents a blue sky over golden wheat fields — the country is one of the world's biggest wheat producers.",
  },
  // ── Middle East & Central Asia ──────────────────────────────
  {
    name: "United Arab Emirates",
    flagEmoji: "\uD83C\uDDE6\uD83C\uDDEA",
    countryCode: "AE",
    funFact: "The UAE's flag colors represent Arab unity — green for prosperity, white for peace, black for oil wealth, and red for strength.",
  },
  {
    name: "Jordan",
    flagEmoji: "\uD83C\uDDEF\uD83C\uDDF4",
    countryCode: "JO",
    funFact: "Jordan's flag has a small white seven-pointed star on a red triangle — the seven points represent the seven verses of the opening of the Quran.",
  },
  // ── More Americas ──────────────────────────────────────────
  {
    name: "Cuba",
    flagEmoji: "\uD83C\uDDE8\uD83C\uDDFA",
    countryCode: "CU",
    funFact: "Cuba's flag has a white star in a red triangle representing independence. The design was created in 1849 by a Cuban poet.",
  },
  {
    name: "Chile",
    flagEmoji: "\uD83C\uDDE8\uD83C\uDDF1",
    countryCode: "CL",
    funFact: "Chile's flag star is called the Lone Star and represents a guide for progress and honor. Its layout inspired the Texas state flag.",
  },
  {
    name: "Panama",
    flagEmoji: "\uD83C\uDDF5\uD83C\uDDE6",
    countryCode: "PA",
    funFact: "Panama's flag has four squares — the blue and red represent the two political parties, and the white represents the peace between them.",
  },
  {
    name: "Ecuador",
    flagEmoji: "\uD83C\uDDEA\uD83C\uDDE8",
    countryCode: "EC",
    funFact: "Ecuador's flag features the condor — the largest flying bird in the world — on its coat of arms.",
  },
  // ── Asia continued ─────────────────────────────────────────
  {
    name: "Nepal",
    flagEmoji: "\uD83C\uDDF3\uD83C\uDDF5",
    countryCode: "NP",
    funFact: "Nepal is the only country in the world with a non-rectangular national flag — it is made of two stacked triangles.",
  },
  {
    name: "Sri Lanka",
    flagEmoji: "\uD83C\uDDF1\uD83C\uDDF0",
    countryCode: "LK",
    funFact: "Sri Lanka's flag features a golden lion holding a sword — this lion has been a royal symbol on the island for over 2,500 years.",
  },
  {
    name: "Bangladesh",
    flagEmoji: "\uD83C\uDDE7\uD83C\uDDE9",
    countryCode: "BD",
    funFact: "Bangladesh's red disc on green is placed slightly left of center — so when the flag waves, the disc appears centered.",
  },
  // ── Africa continued ────────────────────────────────────────
  {
    name: "Tanzania",
    flagEmoji: "\uD83C\uDDF9\uD83C\uDDFF",
    countryCode: "TZ",
    funFact: "Tanzania's diagonal black stripe with gold edges represents the country's mineral wealth, including gold and diamonds.",
  },
  {
    name: "Rwanda",
    flagEmoji: "\uD83C\uDDF7\uD83C\uDDFC",
    countryCode: "RW",
    funFact: "Rwanda redesigned its flag in 2001 to move away from symbols of the 1994 genocide toward hope — shown by the sun in the top right.",
  },
];
