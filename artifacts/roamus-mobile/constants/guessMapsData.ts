export type CountryEntry = {
  /** ISO 3166-1 numeric code — matches world-atlas feature IDs */
  numericId: number;
  name: string;
  funFact: string;
};

export type GuessMapsQuestion = {
  correct: CountryEntry;
  distractors: [string, string, string];
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Pick `count` questions from the full pool with runtime-generated distractors. */
export function shuffleAndPickQuestions(count: number): GuessMapsQuestion[] {
  const shuffled = shuffle(GUESS_MAPS_COUNTRIES);
  const selected = shuffled.slice(0, count);
  return selected.map((correct) => {
    const others = GUESS_MAPS_COUNTRIES.filter((c) => c.numericId !== correct.numericId);
    const pool = shuffle(others).slice(0, 3);
    return {
      correct,
      distractors: [pool[0].name, pool[1].name, pool[2].name] as [string, string, string],
    };
  });
}

export const GUESS_MAPS_COUNTRIES: CountryEntry[] = [
  // ── Americas ─────────────────────────────────────────────────────────────
  {
    numericId: 840,
    name: "United States",
    funFact: "The US spans six time zones and is the third largest country in the world by total area.",
  },
  {
    numericId: 124,
    name: "Canada",
    funFact: "Canada has the longest coastline of any country on Earth, stretching over 202,000 km.",
  },
  {
    numericId: 76,
    name: "Brazil",
    funFact: "Brazil is the largest country in South America and home to more than 60% of the Amazon rainforest.",
  },
  {
    numericId: 484,
    name: "Mexico",
    funFact: "Mexico City is one of the largest cities in the world and was built on an ancient Aztec island.",
  },
  {
    numericId: 32,
    name: "Argentina",
    funFact: "Argentina is the eighth largest country in the world and stretches from the tropics to near Antarctica.",
  },
  {
    numericId: 152,
    name: "Chile",
    funFact: "Chile is the longest country in the world from north to south, stretching over 4,300 km.",
  },
  {
    numericId: 170,
    name: "Colombia",
    funFact: "Colombia is the only country in South America with coastlines on both the Pacific Ocean and Caribbean Sea.",
  },
  {
    numericId: 604,
    name: "Peru",
    funFact: "Peru is home to Machu Picchu, the ancient Inca citadel built high in the Andes Mountains.",
  },
  {
    numericId: 862,
    name: "Venezuela",
    funFact: "Venezuela has the world's highest waterfall, Angel Falls, which drops 979 metres.",
  },
  {
    numericId: 858,
    name: "Uruguay",
    funFact: "Uruguay was the first country in Latin America to fully legalise marijuana nationwide.",
  },
  {
    numericId: 600,
    name: "Paraguay",
    funFact: "Paraguay is one of only two landlocked countries in South America, the other being Bolivia.",
  },
  {
    numericId: 68,
    name: "Bolivia",
    funFact: "Bolivia has two capitals — Sucre is the constitutional capital and La Paz is the seat of government.",
  },
  {
    numericId: 218,
    name: "Ecuador",
    funFact: "Ecuador sits right on the equator — its name literally means 'equator' in Spanish.",
  },
  {
    numericId: 328,
    name: "Guyana",
    funFact: "Guyana is the only English-speaking country in South America.",
  },
  {
    numericId: 740,
    name: "Suriname",
    funFact: "Suriname is the smallest sovereign state in South America and is largely covered by tropical rainforest.",
  },
  {
    numericId: 320,
    name: "Guatemala",
    funFact: "Guatemala is home to Tikal, one of the largest ancient Maya cities, now a UNESCO World Heritage Site.",
  },
  {
    numericId: 340,
    name: "Honduras",
    funFact: "Honduras has the largest coral reef system in the Atlantic Ocean — the Mesoamerican Barrier Reef.",
  },
  {
    numericId: 222,
    name: "El Salvador",
    funFact: "El Salvador is the smallest and most densely populated country in Central America.",
  },
  {
    numericId: 558,
    name: "Nicaragua",
    funFact: "Nicaragua is the largest country in Central America and has more than 40 volcanoes.",
  },
  {
    numericId: 188,
    name: "Costa Rica",
    funFact: "Costa Rica has no standing army — it abolished its military in 1948 and now invests in education.",
  },
  {
    numericId: 591,
    name: "Panama",
    funFact: "The Panama Canal connects the Atlantic and Pacific Oceans and saves ships over 12,000 km of sailing.",
  },
  {
    numericId: 84,
    name: "Belize",
    funFact: "Belize is the only Central American country where English is the official language.",
  },
  {
    numericId: 192,
    name: "Cuba",
    funFact: "Cuba is the largest island in the Caribbean Sea and is known for its vintage cars and cigars.",
  },
  {
    numericId: 332,
    name: "Haiti",
    funFact: "Haiti was the first Black republic in history, gaining independence from France in 1804.",
  },
  {
    numericId: 214,
    name: "Dominican Republic",
    funFact: "The Dominican Republic shares the island of Hispaniola with Haiti — the only island shared by two countries in the Caribbean.",
  },
  // ── Europe ────────────────────────────────────────────────────────────────
  {
    numericId: 250,
    name: "France",
    funFact: "France is the most visited country in the world, welcoming around 90 million tourists every year.",
  },
  {
    numericId: 276,
    name: "Germany",
    funFact: "Germany has over 1,500 different types of beer brewed in more than 1,300 breweries.",
  },
  {
    numericId: 380,
    name: "Italy",
    funFact: "Italy has more UNESCO World Heritage Sites than any other country in the world.",
  },
  {
    numericId: 724,
    name: "Spain",
    funFact: "Spain's La Tomatina festival involves thousands of people throwing tomatoes at each other every August.",
  },
  {
    numericId: 826,
    name: "United Kingdom",
    funFact: "The United Kingdom invented many of the world's most popular sports including football, cricket, and rugby.",
  },
  {
    numericId: 620,
    name: "Portugal",
    funFact: "Portugal is the oldest country in Europe with its borders essentially unchanged since 1139.",
  },
  {
    numericId: 528,
    name: "Netherlands",
    funFact: "The Netherlands has more bicycles than people — there are about 23 million bikes for 17 million citizens.",
  },
  {
    numericId: 56,
    name: "Belgium",
    funFact: "Belgium has more castles per square kilometre than any other country in the world.",
  },
  {
    numericId: 756,
    name: "Switzerland",
    funFact: "Switzerland has four official languages — German, French, Italian, and Romansh.",
  },
  {
    numericId: 40,
    name: "Austria",
    funFact: "Austria was the birthplace of Mozart, Beethoven's greatest rival Schubert, and the waltz.",
  },
  {
    numericId: 752,
    name: "Sweden",
    funFact: "Sweden invented the safety match, the refrigerator, and the pacemaker, among many other inventions.",
  },
  {
    numericId: 578,
    name: "Norway",
    funFact: "Norway has the world's longest road tunnel — the Laerdal Tunnel stretches 24.5 km through a mountain.",
  },
  {
    numericId: 208,
    name: "Denmark",
    funFact: "Denmark is made up of the Jutland Peninsula and 443 named islands, 74 of which are inhabited.",
  },
  {
    numericId: 246,
    name: "Finland",
    funFact: "Finland has more saunas than cars — roughly 3.3 million saunas for a population of 5.5 million.",
  },
  {
    numericId: 300,
    name: "Greece",
    funFact: "Greece has the longest coastline in the Mediterranean and the eleventh longest in the world.",
  },
  {
    numericId: 616,
    name: "Poland",
    funFact: "Poland is where Marie Curie was born — she was the first person to win the Nobel Prize twice.",
  },
  {
    numericId: 372,
    name: "Ireland",
    funFact: "Ireland is the only country in the world where the national symbol is a musical instrument — the Celtic harp.",
  },
  {
    numericId: 352,
    name: "Iceland",
    funFact: "Iceland runs on almost 100% renewable energy and has no mosquitoes anywhere on the island.",
  },
  {
    numericId: 643,
    name: "Russia",
    funFact: "Russia is the largest country in the world, spanning 11 time zones and two continents.",
  },
  {
    numericId: 804,
    name: "Ukraine",
    funFact: "Ukraine is the largest country located entirely within Europe and is known as the breadbasket of Europe.",
  },
  {
    numericId: 203,
    name: "Czech Republic",
    funFact: "The Czech Republic drinks more beer per person than any other country in the world.",
  },
  {
    numericId: 348,
    name: "Hungary",
    funFact: "Hungary invented the Rubik's Cube — the best-selling puzzle toy in history.",
  },
  {
    numericId: 642,
    name: "Romania",
    funFact: "Romania is home to Bran Castle, the inspiration for Bram Stoker's Dracula story.",
  },
  {
    numericId: 100,
    name: "Bulgaria",
    funFact: "Bulgaria is one of the oldest countries in Europe and the Cyrillic alphabet was invented here.",
  },
  {
    numericId: 191,
    name: "Croatia",
    funFact: "The tie (cravat) was invented in Croatia — Croatian soldiers wore them in the 17th century.",
  },
  {
    numericId: 688,
    name: "Serbia",
    funFact: "Nikola Tesla, who pioneered alternating current electricity, was born in Serbia.",
  },
  {
    numericId: 8,
    name: "Albania",
    funFact: "Albania is one of the few countries whose name comes from an ancient people — the Albanoi tribe.",
  },
  {
    numericId: 807,
    name: "North Macedonia",
    funFact: "North Macedonia is home to Lake Ohrid, one of the oldest and deepest lakes in Europe.",
  },
  {
    numericId: 705,
    name: "Slovenia",
    funFact: "Slovenia was the first former Yugoslav republic to join both the EU and NATO.",
  },
  {
    numericId: 703,
    name: "Slovakia",
    funFact: "Slovakia has the highest density of castles and chateaux per square kilometre in the world.",
  },
  {
    numericId: 233,
    name: "Estonia",
    funFact: "Estonia was the first country in the world to hold a legally binding national election over the internet.",
  },
  {
    numericId: 428,
    name: "Latvia",
    funFact: "Latvia was the first country to use a Christmas tree — the tradition started in Riga in 1510.",
  },
  {
    numericId: 440,
    name: "Lithuania",
    funFact: "Lithuania was the last pagan state in Europe, only converting to Christianity in 1387.",
  },
  {
    numericId: 112,
    name: "Belarus",
    funFact: "Belarus is one of the few countries in Europe without access to the sea.",
  },
  {
    numericId: 498,
    name: "Moldova",
    funFact: "Moldova has one of the largest wine cellars in the world — the Milestii Mici winery has 200 km of tunnels.",
  },
  {
    numericId: 70,
    name: "Bosnia and Herzegovina",
    funFact: "Sarajevo, Bosnia's capital, hosted the 1984 Winter Olympics and is known as the Jerusalem of Europe.",
  },
  {
    numericId: 499,
    name: "Montenegro",
    funFact: "Montenegro means 'Black Mountain' and is one of the world's newest countries, independent since 2006.",
  },
  {
    numericId: 442,
    name: "Luxembourg",
    funFact: "Luxembourg is the only Grand Duchy in the world and has the highest GDP per capita in the EU.",
  },
  // ── Africa ────────────────────────────────────────────────────────────────
  {
    numericId: 818,
    name: "Egypt",
    funFact: "Egypt is home to the only remaining ancient wonder of the world — the Great Pyramid of Giza.",
  },
  {
    numericId: 710,
    name: "South Africa",
    funFact: "South Africa has three capital cities — Pretoria (executive), Cape Town (legislative), and Bloemfontein (judicial).",
  },
  {
    numericId: 566,
    name: "Nigeria",
    funFact: "Nigeria is Africa's most populous country with over 220 million people and more than 500 languages.",
  },
  {
    numericId: 404,
    name: "Kenya",
    funFact: "Kenya is home to the Maasai Mara, where the Great Wildebeest Migration — one of nature's greatest spectacles — takes place.",
  },
  {
    numericId: 231,
    name: "Ethiopia",
    funFact: "Ethiopia is the only African country never to have been colonised and has its own unique calendar.",
  },
  {
    numericId: 12,
    name: "Algeria",
    funFact: "Algeria is the largest country in Africa and the Arab world by total area.",
  },
  {
    numericId: 504,
    name: "Morocco",
    funFact: "Morocco is home to the world's oldest university — the University of al-Qarawiyyin, founded in 859 AD.",
  },
  {
    numericId: 788,
    name: "Tunisia",
    funFact: "Tunisia is where the Sahara Desert begins — and also where parts of Star Wars were filmed.",
  },
  {
    numericId: 434,
    name: "Libya",
    funFact: "Libya has the largest proven oil reserves in Africa and over 90% of its land is desert.",
  },
  {
    numericId: 729,
    name: "Sudan",
    funFact: "Sudan has more ancient pyramids than Egypt — over 200 pyramids dot its northern desert.",
  },
  {
    numericId: 728,
    name: "South Sudan",
    funFact: "South Sudan is the world's newest country, gaining independence from Sudan in 2011.",
  },
  {
    numericId: 180,
    name: "DR Congo",
    funFact: "The Democratic Republic of Congo has the second largest tropical rainforest in the world after the Amazon.",
  },
  {
    numericId: 178,
    name: "Republic of the Congo",
    funFact: "The Republic of Congo is one of the most urbanised countries in Africa, with 70% of people living in cities.",
  },
  {
    numericId: 266,
    name: "Gabon",
    funFact: "Gabon is one of the most forested countries on Earth — 80% of its land is covered by rainforest.",
  },
  {
    numericId: 120,
    name: "Cameroon",
    funFact: "Cameroon is sometimes called 'Africa in miniature' because it has every major climate and landscape of the continent.",
  },
  {
    numericId: 288,
    name: "Ghana",
    funFact: "Ghana became the first sub-Saharan African country to gain independence from European colonial rule in 1957.",
  },
  {
    numericId: 384,
    name: "Ivory Coast",
    funFact: "Ivory Coast is the world's leading producer of cocoa — responsible for about 40% of global supply.",
  },
  {
    numericId: 466,
    name: "Mali",
    funFact: "Mali is home to Timbuktu, the legendary city once called the city of gold and a great centre of Islamic learning.",
  },
  {
    numericId: 562,
    name: "Niger",
    funFact: "Niger is the largest country in West Africa and has one of the world's largest uranium deposits.",
  },
  {
    numericId: 148,
    name: "Chad",
    funFact: "Chad is home to Lake Chad, which was once the size of a sea but has shrunk by 90% due to climate change.",
  },
  {
    numericId: 678,
    name: "Sao Tome and Principe",
    funFact: "This tiny island nation sits almost exactly on the equator and the Prime Meridian — the centre of the world.",
  },
  {
    numericId: 800,
    name: "Uganda",
    funFact: "Uganda is home to more than half the world's remaining mountain gorillas.",
  },
  {
    numericId: 646,
    name: "Rwanda",
    funFact: "Rwanda has the highest percentage of women in parliament of any country in the world.",
  },
  {
    numericId: 108,
    name: "Burundi",
    funFact: "Burundi is one of the smallest and most densely populated countries in Africa.",
  },
  {
    numericId: 834,
    name: "Tanzania",
    funFact: "Tanzania is home to Mount Kilimanjaro — the highest peak in Africa at 5,895 metres.",
  },
  {
    numericId: 508,
    name: "Mozambique",
    funFact: "Mozambique has one of the longest coastlines in Africa, stretching 2,700 km along the Indian Ocean.",
  },
  {
    numericId: 716,
    name: "Zimbabwe",
    funFact: "Zimbabwe is home to Victoria Falls, one of the Seven Natural Wonders of the World.",
  },
  {
    numericId: 894,
    name: "Zambia",
    funFact: "Zambia gets its name from the Zambezi River, which runs along its southern border.",
  },
  {
    numericId: 454,
    name: "Malawi",
    funFact: "Lake Malawi is the ninth largest lake in the world and contains more fish species than any other lake on Earth.",
  },
  {
    numericId: 72,
    name: "Botswana",
    funFact: "Botswana has transformed from one of Africa's poorest nations to one of its most prosperous thanks to diamond mining.",
  },
  {
    numericId: 516,
    name: "Namibia",
    funFact: "Namibia's Namib Desert is the world's oldest desert, estimated to be 55 to 80 million years old.",
  },
  {
    numericId: 426,
    name: "Lesotho",
    funFact: "Lesotho is one of only three countries in the world entirely surrounded by another country — South Africa.",
  },
  {
    numericId: 748,
    name: "Eswatini",
    funFact: "Eswatini (formerly Swaziland) is one of the world's last absolute monarchies.",
  },
  {
    numericId: 450,
    name: "Madagascar",
    funFact: "Madagascar is an island of unique wildlife — about 90% of its species are found nowhere else on Earth.",
  },
  {
    numericId: 706,
    name: "Somalia",
    funFact: "Somalia has the longest coastline of any African mainland country, stretching over 3,300 km.",
  },
  {
    numericId: 232,
    name: "Eritrea",
    funFact: "Eritrea is one of the newest countries in the world, gaining independence from Ethiopia in 1993.",
  },
  {
    numericId: 262,
    name: "Djibouti",
    funFact: "Djibouti is home to Lake Assal, the lowest point in Africa at 155 metres below sea level.",
  },
  {
    numericId: 686,
    name: "Senegal",
    funFact: "Senegal's 'Lac Rose' (Pink Lake) gets its distinctive colour from algae and a high salt content.",
  },
  {
    numericId: 430,
    name: "Liberia",
    funFact: "Liberia was founded in 1822 by formerly enslaved Americans and is one of Africa's oldest republics.",
  },
  {
    numericId: 694,
    name: "Sierra Leone",
    funFact: "Sierra Leone's name means 'Lion Mountains' — named by Portuguese explorers who heard thunderstorms on its coast.",
  },
  {
    numericId: 324,
    name: "Guinea",
    funFact: "Guinea is one of the world's largest producers of bauxite, the ore used to make aluminium.",
  },
  {
    numericId: 624,
    name: "Guinea-Bissau",
    funFact: "Guinea-Bissau consists of a mainland and 88 islands, many of which are uninhabited.",
  },
  {
    numericId: 478,
    name: "Mauritania",
    funFact: "Mauritania is home to the ancient city of Chinguetti, one of Islam's seven holy cities.",
  },
  {
    numericId: 854,
    name: "Burkina Faso",
    funFact: "Burkina Faso means 'Land of the Honest People' in the country's two main languages.",
  },
  {
    numericId: 204,
    name: "Benin",
    funFact: "Benin is considered the birthplace of Voodoo, which is still practised by about 17% of the population.",
  },
  {
    numericId: 768,
    name: "Togo",
    funFact: "Togo is one of the narrowest countries in the world, stretching just 56 km at its widest point.",
  },
  {
    numericId: 140,
    name: "Central African Republic",
    funFact: "The Central African Republic sits at the heart of the African continent and is rich in diamonds and gold.",
  },
  {
    numericId: 24,
    name: "Angola",
    funFact: "Angola was a Portuguese colony for nearly 500 years and is one of Africa's top oil producers.",
  },
  // ── Asia ─────────────────────────────────────────────────────────────────
  {
    numericId: 156,
    name: "China",
    funFact: "China has the world's largest population and the Great Wall is the longest structure ever built by humans.",
  },
  {
    numericId: 356,
    name: "India",
    funFact: "India is home to more vegetarians than the rest of the world combined.",
  },
  {
    numericId: 392,
    name: "Japan",
    funFact: "Japan consists of 6,852 islands and has the world's oldest company — Kongo Gumi, founded in 578 AD.",
  },
  {
    numericId: 410,
    name: "South Korea",
    funFact: "South Korea has the fastest average internet speed in the world and invented the popular K-beauty trend.",
  },
  {
    numericId: 408,
    name: "North Korea",
    funFact: "North Korea has its own calendar system, starting from the birth year of its founder Kim Il-sung.",
  },
  {
    numericId: 704,
    name: "Vietnam",
    funFact: "Vietnam has one of the world's largest cave systems — Son Doong is large enough to contain a skyscraper.",
  },
  {
    numericId: 764,
    name: "Thailand",
    funFact: "Thailand is the only country in Southeast Asia that was never colonised by a European power.",
  },
  {
    numericId: 116,
    name: "Cambodia",
    funFact: "Cambodia is home to Angkor Wat — the largest religious monument in the world.",
  },
  {
    numericId: 418,
    name: "Laos",
    funFact: "Laos is the most bombed country per capita in history, after the Vietnam War era bombings.",
  },
  {
    numericId: 104,
    name: "Myanmar",
    funFact: "Myanmar has the world's largest book — the Tipitaka is inscribed on 730 marble slabs in Mandalay.",
  },
  {
    numericId: 458,
    name: "Malaysia",
    funFact: "Malaysia's Petronas Towers were the world's tallest buildings from 1998 to 2004.",
  },
  {
    numericId: 360,
    name: "Indonesia",
    funFact: "Indonesia is the world's largest archipelago nation, consisting of over 17,000 islands.",
  },
  {
    numericId: 608,
    name: "Philippines",
    funFact: "The Philippines is an archipelago of more than 7,600 islands and is the world's second largest archipelago.",
  },
  {
    numericId: 50,
    name: "Bangladesh",
    funFact: "Bangladesh is one of the most densely populated countries on Earth, with 170 million people.",
  },
  {
    numericId: 144,
    name: "Sri Lanka",
    funFact: "Sri Lanka is the world's leading exporter of Ceylon tea and is known as the Pearl of the Indian Ocean.",
  },
  {
    numericId: 524,
    name: "Nepal",
    funFact: "Nepal is home to 8 of the world's 10 tallest mountains, including Mount Everest.",
  },
  {
    numericId: 64,
    name: "Bhutan",
    funFact: "Bhutan measures its success with Gross National Happiness rather than GDP.",
  },
  {
    numericId: 586,
    name: "Pakistan",
    funFact: "Pakistan has the largest number of glaciers outside the polar regions — over 7,000 glaciers.",
  },
  {
    numericId: 4,
    name: "Afghanistan",
    funFact: "Afghanistan has been called the 'Graveyard of Empires' because so many powerful armies have failed to conquer it.",
  },
  {
    numericId: 364,
    name: "Iran",
    funFact: "Iran is home to one of the world's oldest continuous civilisations, dating back over 7,000 years.",
  },
  {
    numericId: 368,
    name: "Iraq",
    funFact: "Iraq is home to Mesopotamia, considered the cradle of civilisation where writing was first invented.",
  },
  {
    numericId: 760,
    name: "Syria",
    funFact: "Damascus, Syria's capital, is considered one of the oldest continuously inhabited cities in the world.",
  },
  {
    numericId: 792,
    name: "Turkey",
    funFact: "Turkey is the only country in the world that straddles two continents — Europe and Asia.",
  },
  {
    numericId: 376,
    name: "Israel",
    funFact: "Israel has more museums per capita than any other country in the world.",
  },
  {
    numericId: 400,
    name: "Jordan",
    funFact: "Jordan is home to Petra, the ancient rose-red city carved into cliff faces, one of the New Seven Wonders.",
  },
  {
    numericId: 682,
    name: "Saudi Arabia",
    funFact: "Saudi Arabia is the largest country in the world without a river.",
  },
  {
    numericId: 784,
    name: "United Arab Emirates",
    funFact: "The UAE went from having no paved roads in 1960 to building the world's tallest skyscraper by 2010.",
  },
  {
    numericId: 887,
    name: "Yemen",
    funFact: "Yemen is home to Socotra Island, which has such unique plant life that it is called the Galapagos of the Indian Ocean.",
  },
  {
    numericId: 512,
    name: "Oman",
    funFact: "Oman is one of the oldest civilisations in the world and had a trading empire that stretched to East Africa.",
  },
  {
    numericId: 422,
    name: "Lebanon",
    funFact: "Lebanon has the highest literacy rate in the Arab world and is known as the Paris of the Middle East.",
  },
  {
    numericId: 268,
    name: "Georgia",
    funFact: "Georgia is home to one of the world's oldest wine-making traditions, dating back 8,000 years.",
  },
  {
    numericId: 51,
    name: "Armenia",
    funFact: "Armenia was the first country in the world to adopt Christianity as its state religion, in 301 AD.",
  },
  {
    numericId: 31,
    name: "Azerbaijan",
    funFact: "Azerbaijan means 'Land of Fire' — it was once a major Zoroastrian pilgrimage site with eternal natural flames.",
  },
  {
    numericId: 398,
    name: "Kazakhstan",
    funFact: "Kazakhstan is the world's largest landlocked country and was where humans first domesticated horses.",
  },
  {
    numericId: 417,
    name: "Kyrgyzstan",
    funFact: "Kyrgyzstan has no traffic lights in its capital — Bishkek relies entirely on traffic police.",
  },
  {
    numericId: 762,
    name: "Tajikistan",
    funFact: "Tajikistan is the poorest country in Central Asia but has some of the world's highest mountains.",
  },
  {
    numericId: 795,
    name: "Turkmenistan",
    funFact: "Turkmenistan has a burning gas crater called the Door to Hell that has been on fire since 1971.",
  },
  {
    numericId: 860,
    name: "Uzbekistan",
    funFact: "Uzbekistan is a doubly landlocked country — surrounded by countries that also have no sea access.",
  },
  {
    numericId: 496,
    name: "Mongolia",
    funFact: "Mongolia has one of the lowest population densities in the world — about 2 people per square kilometre.",
  },
  // ── Oceania ────────────────────────────────────────────────────────────────
  {
    numericId: 36,
    name: "Australia",
    funFact: "Australia is the only country that is also a continent, and has more kangaroos than people.",
  },
  {
    numericId: 554,
    name: "New Zealand",
    funFact: "New Zealand was the first country to give women the right to vote in national elections, in 1893.",
  },
  {
    numericId: 598,
    name: "Papua New Guinea",
    funFact: "Papua New Guinea is one of the world's most linguistically diverse countries with over 800 languages.",
  },
];
