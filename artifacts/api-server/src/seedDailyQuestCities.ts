import { storage } from "./storage";
import type { InsertDailyQuestCity } from "@workspace/db";

const dailyQuestCitiesData: InsertDailyQuestCity[] = [
  // ========== EUROPE (21 cities) ==========
  { region: "Europe", city: "Paris", country: "France", isCapital: true, population: "2.1 Million", currency: "Euro (€)", languages: "French", flag: "🇫🇷", funFact: "The Eiffel Tower was meant to be temporary!", bandColor: "Purple", lat: 48.8566, lng: 2.3522 },
  { region: "Europe", city: "Rome", country: "Italy", isCapital: true, population: "2.8 Million", currency: "Euro (€)", languages: "Italian", flag: "🇮🇹", funFact: "Rome has over 900 churches!", bandColor: "Purple", lat: 41.8931, lng: 12.4828 },
  { region: "Europe", city: "London", country: "United Kingdom", isCapital: true, population: "8.9 Million", currency: "Pound Sterling (£)", languages: "English", flag: "🇬🇧", funFact: "The London Underground is the oldest metro in the world!", bandColor: "Purple", lat: 51.5072, lng: -0.1275 },
  { region: "Europe", city: "Athens", country: "Greece", isCapital: true, population: "664,000", currency: "Euro (€)", languages: "Greek", flag: "🇬🇷", funFact: "Athens is one of the oldest cities in the world!", bandColor: "Purple", lat: 37.9842, lng: 23.7281 },
  { region: "Europe", city: "Berlin", country: "Germany", isCapital: true, population: "3.6 Million", currency: "Euro (€)", languages: "German", flag: "🇩🇪", funFact: "Berlin has more bridges than Venice!", bandColor: "Purple", lat: 52.5167, lng: 13.3833 },
  { region: "Europe", city: "Madrid", country: "Spain", isCapital: true, population: "3.2 Million", currency: "Euro (€)", languages: "Spanish", flag: "🇪🇸", funFact: "Madrid's symbol is a bear eating berries!", bandColor: "Purple", lat: 40.4167, lng: -3.7167 },
  { region: "Europe", city: "Amsterdam", country: "Netherlands", isCapital: true, population: "821,000", currency: "Euro (€)", languages: "Dutch", flag: "🇳🇱", funFact: "There are more bikes than people in Amsterdam!", bandColor: "Purple", lat: 52.3667, lng: 4.8833 },
  { region: "Europe", city: "Moscow", country: "Russia", isCapital: true, population: "13 Million", currency: "Ruble (₽)", languages: "Russian", flag: "🇷🇺", funFact: "Moscow has a subway station that looks like a palace!", bandColor: "Purple", lat: 55.7558, lng: 37.6178 },
  { region: "Europe", city: "Venice", country: "Italy", isCapital: false, population: "261,000", currency: "Euro (€)", languages: "Italian", flag: "🇮🇹", funFact: "Venice is built on 118 small islands held together by bridges!", bandColor: "Purple", lat: 45.4397, lng: 12.3319 },
  { region: "Europe", city: "Barcelona", country: "Spain", isCapital: false, population: "1.6 Million", currency: "Euro (€)", languages: "Spanish/Catalan", flag: "🇪🇸", funFact: "There are no corners on the street blocks in this city!", bandColor: "Purple", lat: 41.3825, lng: 2.1769 },
  { region: "Europe", city: "Reykjavik", country: "Iceland", isCapital: true, population: "130,000", currency: "Krona (ISK)", languages: "Icelandic", flag: "🇮🇸", funFact: "There are no mosquitoes in this entire country!", bandColor: "Purple", lat: 64.1475, lng: -21.935 },
  { region: "Europe", city: "Prague", country: "Czech Republic", isCapital: true, population: "1.3 Million", currency: "Czech Koruna (Kč)", languages: "Czech", flag: "🇨🇿", funFact: "Prague Castle is one of the largest castle complexes in the world!", bandColor: "Purple", lat: 50.0833, lng: 14.4167 },
  { region: "Europe", city: "Vienna", country: "Austria", isCapital: true, population: "1.9 Million", currency: "Euro (€)", languages: "German", flag: "🇦🇹", funFact: "Vienna invented the croissant!", bandColor: "Purple", lat: 48.2083, lng: 16.3725 },
  { region: "Europe", city: "Edinburgh", country: "United Kingdom", isCapital: false, population: "530,000", currency: "Pound Sterling (£)", languages: "English/Scots Gaelic", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", funFact: "JK Rowling wrote Harry Potter in cafes here!", bandColor: "Purple", lat: 55.953, lng: -3.189 },
  { region: "Europe", city: "Lisbon", country: "Portugal", isCapital: true, population: "545,000", currency: "Euro (€)", languages: "Portuguese", flag: "🇵🇹", funFact: "Lisbon is older than Rome by 400 years!", bandColor: "Purple", lat: 38.708, lng: -9.139 },
  { region: "Europe", city: "Budapest", country: "Hungary", isCapital: true, population: "1.8 Million", currency: "Forint (Ft)", languages: "Hungarian", flag: "🇭🇺", funFact: "Budapest has the second oldest metro line in the world!", bandColor: "Purple", lat: 47.4983, lng: 19.0408 },
  { region: "Europe", city: "Stockholm", country: "Sweden", isCapital: true, population: "980,000", currency: "Swedish Krona (kr)", languages: "Swedish", flag: "🇸🇪", funFact: "Stockholm's old town has buildings from the 1200s!", bandColor: "Purple", lat: 59.3294, lng: 18.0686 },
  { region: "Europe", city: "Copenhagen", country: "Denmark", isCapital: true, population: "650,000", currency: "Danish Krone (kr)", languages: "Danish", flag: "🇩🇰", funFact: "Copenhagen has more bikes than people!", bandColor: "Purple", lat: 55.6805, lng: 12.5615 },
  { region: "Europe", city: "Dublin", country: "Ireland", isCapital: true, population: "550,000", currency: "Euro (€)", languages: "English/Irish", flag: "🇮🇪", funFact: "Dublin was founded by Vikings over 1,000 years ago!", bandColor: "Purple", lat: 53.3497, lng: -6.2603 },
  { region: "Europe", city: "Florence", country: "Italy", isCapital: false, population: "380,000", currency: "Euro (€)", languages: "Italian", flag: "🇮🇹", funFact: "Florence has more art per square mile than any other city in the world!", bandColor: "Purple", lat: 43.7714, lng: 11.2542 },
  { region: "Europe", city: "Oslo", country: "Norway", isCapital: true, population: "700,000", currency: "Norwegian Krone (kr)", languages: "Norwegian", flag: "🇳🇴", funFact: "Oslo gives a giant Christmas tree to London every year as a thank you gift!", bandColor: "Purple", lat: 59.9111, lng: 10.7528 },

  // ========== NORTH AMERICA (18 cities) ==========
  { region: "North America", city: "New York", country: "USA", isCapital: false, population: "8.4 Million", currency: "USD ($)", languages: "English", flag: "🇺🇸", funFact: "More than 800 languages are spoken in New York!", bandColor: "Red", lat: 40.6943, lng: -73.9249 },
  { region: "North America", city: "Los Angeles", country: "USA", isCapital: false, population: "3.9 Million", currency: "USD ($)", languages: "English", flag: "🇺🇸", funFact: "LA has more cars than people!", bandColor: "Red", lat: 34.1139, lng: -118.4068 },
  { region: "North America", city: "Mexico City", country: "Mexico", isCapital: true, population: "9.2 Million", currency: "Mexican Peso ($)", languages: "Spanish", flag: "🇲🇽", funFact: "Mexico City is slowly sinking every year!", bandColor: "Red", lat: 19.4333, lng: -99.1333 },
  { region: "North America", city: "San Francisco", country: "USA", isCapital: false, population: "873,000", currency: "USD ($)", languages: "English", flag: "🇺🇸", funFact: "Fog in San Francisco has its own name — Karl!", bandColor: "Red", lat: 37.7562, lng: -122.443 },
  { region: "North America", city: "Toronto", country: "Canada", isCapital: false, population: "2.9 Million", currency: "Canadian Dollar ($)", languages: "English", flag: "🇨🇦", funFact: "Toronto is one of the most multicultural cities on Earth!", bandColor: "Red", lat: 43.7417, lng: -79.3733 },
  { region: "North America", city: "Chicago", country: "USA", isCapital: false, population: "2.7 Million", currency: "USD ($)", languages: "English", flag: "🇺🇸", funFact: "Chicago invented deep-dish pizza!", bandColor: "Red", lat: 41.8373, lng: -87.6862 },
  { region: "North America", city: "Vancouver", country: "Canada", isCapital: false, population: "675,000", currency: "Canadian Dollar ($)", languages: "English", flag: "🇨🇦", funFact: "One of the world's most livable cities!", bandColor: "Red", lat: 49.25, lng: -123.1 },
  { region: "North America", city: "Honolulu", country: "USA", isCapital: false, population: "350,000", currency: "USD ($)", languages: "English", flag: "🇺🇸", funFact: "Honolulu is the only US city with a royal palace!", bandColor: "Red", lat: 21.3294, lng: -157.846 },
  { region: "North America", city: "Washington D.C.", country: "USA", isCapital: true, population: "700,000", currency: "USD ($)", languages: "English", flag: "🇺🇸", funFact: "The White House has 132 rooms and 35 bathrooms!", bandColor: "Red", lat: 38.9047, lng: -77.0163 },
  { region: "North America", city: "Miami", country: "USA", isCapital: false, population: "450,000", currency: "USD ($)", languages: "English/Spanish", flag: "🇺🇸", funFact: "Miami is the only US city founded by a woman!", bandColor: "Red", lat: 25.7839, lng: -80.2102 },
  { region: "North America", city: "Boston", country: "USA", isCapital: false, population: "675,000", currency: "USD ($)", languages: "English", flag: "🇺🇸", funFact: "Boston has the oldest public park in America!", bandColor: "Red", lat: 42.3188, lng: -71.0846 },
  { region: "North America", city: "Seattle", country: "USA", isCapital: false, population: "750,000", currency: "USD ($)", languages: "English", flag: "🇺🇸", funFact: "Seattle throws fish at a famous market!", bandColor: "Red", lat: 47.6211, lng: -122.3244 },
  { region: "North America", city: "Montreal", country: "Canada", isCapital: false, population: "1.8 Million", currency: "Canadian Dollar ($)", languages: "French", flag: "🇨🇦", funFact: "Montreal hosts the largest jazz festival in the world!", bandColor: "Red", lat: 45.5089, lng: -73.5617 },
  { region: "North America", city: "Havana", country: "Cuba", isCapital: true, population: "2.1 Million", currency: "Cuban Peso (₱)", languages: "Spanish", flag: "🇨🇺", funFact: "Havana has one of the oldest cathedrals in the Americas!", bandColor: "Red", lat: 23.1367, lng: -82.3589 },
  { region: "North America", city: "Panama City", country: "Panama", isCapital: true, population: "880,000", currency: "USD/Balboa", languages: "Spanish", flag: "🇵🇦", funFact: "The Panama Canal saves ships a 7,000-mile journey!", bandColor: "Red", lat: 9.0, lng: -79.5 },
  { region: "North America", city: "Guadalajara", country: "Mexico", isCapital: false, population: "1.5 Million", currency: "Mexican Peso ($)", languages: "Spanish", flag: "🇲🇽", funFact: "Guadalajara means 'river that runs between rocks'!", bandColor: "Red", lat: 20.6767, lng: -103.3475 },
  { region: "North America", city: "San Diego", country: "USA", isCapital: false, population: "1.4 Million", currency: "USD ($)", languages: "English/Spanish", flag: "🇺🇸", funFact: "San Diego has the best weather in America with 266 sunny days a year!", bandColor: "Red", lat: 32.8312, lng: -117.1225 },
  { region: "North America", city: "Kingston", country: "Jamaica", isCapital: true, population: "670,000", currency: "Jamaican Dollar ($)", languages: "English/Patois", flag: "🇯🇲", funFact: "Jamaica is where the fastest person ever, Usain Bolt, comes from!", bandColor: "Red", lat: 17.9714, lng: -76.7931 },

  // ========== ASIA (18 cities) ==========
  { region: "Asia", city: "Tokyo", country: "Japan", isCapital: true, population: "14 Million", currency: "Yen (¥)", languages: "Japanese", flag: "🇯🇵", funFact: "Tokyo has the busiest train station in the world!", bandColor: "Yellow", lat: 35.6839, lng: 139.7744 },
  { region: "Asia", city: "Beijing", country: "China", isCapital: true, population: "21.5 Million", currency: "Renminbi (¥)", languages: "Mandarin", flag: "🇨🇳", funFact: "Beijing means 'Northern Capital'!", bandColor: "Yellow", lat: 39.904, lng: 116.4075 },
  { region: "Asia", city: "Mumbai", country: "India", isCapital: false, population: "20.4 Million", currency: "Indian Rupee (₹)", languages: "Marathi/Hindi", flag: "🇮🇳", funFact: "Mumbai's trains carry over 7 million passengers daily!", bandColor: "Yellow", lat: 19.0758, lng: 72.8775 },
  { region: "Asia", city: "Seoul", country: "South Korea", isCapital: true, population: "9.7 Million", currency: "Won (₩)", languages: "Korean", flag: "🇰🇷", funFact: "Seoul means 'capital city'!", bandColor: "Yellow", lat: 37.56, lng: 126.99 },
  { region: "Asia", city: "Singapore", country: "Singapore", isCapital: true, population: "5.6 Million", currency: "Singapore Dollar (S$)", languages: "English/Malay", flag: "🇸🇬", funFact: "Singapore has no natural lakes!", bandColor: "Yellow", lat: 1.3, lng: 103.8 },
  { region: "Asia", city: "Bangkok", country: "Thailand", isCapital: true, population: "11 Million", currency: "Baht (THB)", languages: "Thai", flag: "🇹🇭", funFact: "Its ceremonial name is 168 characters long!", bandColor: "Yellow", lat: 13.75, lng: 100.5167 },
  { region: "Asia", city: "Dubai", country: "UAE", isCapital: false, population: "3.6 Million", currency: "AED", languages: "Arabic/English", flag: "🇦🇪", funFact: "Home to the world's tallest building!", bandColor: "Yellow", lat: 25.2697, lng: 55.3094 },
  { region: "Asia", city: "Delhi", country: "India", isCapital: true, population: "32 Million", currency: "Indian Rupee (₹)", languages: "Hindi", flag: "🇮🇳", funFact: "Delhi has one of the oldest metro systems in India!", bandColor: "Yellow", lat: 28.6667, lng: 77.2167 },
  { region: "Asia", city: "Istanbul", country: "Turkey", isCapital: false, population: "15.4 Million", currency: "Lira (₺)", languages: "Turkish", flag: "🇹🇷", funFact: "Istanbul is the only city in the world that spans two continents!", bandColor: "Yellow", lat: 41.01, lng: 28.9603 },
  { region: "Asia", city: "Kyoto", country: "Japan", isCapital: false, population: "1.5 Million", currency: "Yen (¥)", languages: "Japanese", flag: "🇯🇵", funFact: "Kyoto has over 1,600 temples!", bandColor: "Yellow", lat: 35.0117, lng: 135.7683 },
  { region: "Asia", city: "Hong Kong", country: "China", isCapital: false, population: "7.5 Million", currency: "Hong Kong Dollar ($)", languages: "Cantonese/English", flag: "🇭🇰", funFact: "Hong Kong means 'fragrant harbor'!", bandColor: "Yellow", lat: 22.3069, lng: 114.1831 },
  { region: "Asia", city: "Taipei", country: "Taiwan", isCapital: true, population: "2.6 Million", currency: "Taiwan Dollar (NT$)", languages: "Mandarin", flag: "🇹🇼", funFact: "Taipei has vending machines that sell hot soup!", bandColor: "Yellow", lat: 25.0478, lng: 121.5319 },
  { region: "Asia", city: "Hanoi", country: "Vietnam", isCapital: true, population: "8 Million", currency: "Vietnamese Dong (₫)", languages: "Vietnamese", flag: "🇻🇳", funFact: "Hanoi is over 1,000 years old!", bandColor: "Yellow", lat: 21.0245, lng: 105.8412 },
  { region: "Asia", city: "Osaka", country: "Japan", isCapital: false, population: "2.7 Million", currency: "Yen (¥)", languages: "Japanese", flag: "🇯🇵", funFact: "Osaka invented instant ramen noodles!", bandColor: "Yellow", lat: 34.752, lng: 135.4582 },
  { region: "Asia", city: "Kuala Lumpur", country: "Malaysia", isCapital: true, population: "1.8 Million", currency: "Ringgit (RM)", languages: "Malay", flag: "🇲🇾", funFact: "The Petronas Towers were the world's tallest for 6 years!", bandColor: "Yellow", lat: 3.1478, lng: 101.6953 },
  { region: "Asia", city: "Manila", country: "Philippines", isCapital: true, population: "1.8 Million", currency: "Philippine Peso (₱)", languages: "Filipino/English", flag: "🇵🇭", funFact: "Manila is one of the most densely populated cities on Earth!", bandColor: "Yellow", lat: 14.6, lng: 120.9833 },
  { region: "Asia", city: "Kathmandu", country: "Nepal", isCapital: true, population: "1.4 Million", currency: "Nepalese Rupee (Rs)", languages: "Nepali", flag: "🇳🇵", funFact: "Nepal's flag is the only non-rectangular flag in the world!", bandColor: "Yellow", lat: 27.7167, lng: 85.3667 },
  { region: "Asia", city: "Jerusalem", country: "Israel", isCapital: true, population: "950,000", currency: "Shekel (₪)", languages: "Hebrew/Arabic", flag: "🇮🇱", funFact: "Jerusalem is over 5,000 years old!", bandColor: "Yellow", lat: 31.7833, lng: 35.2167 },

  // ========== SOUTH AMERICA (13 cities) ==========
  { region: "South America", city: "Rio de Janeiro", country: "Brazil", isCapital: false, population: "6.7 Million", currency: "Brazilian Real (R$)", languages: "Portuguese", flag: "🇧🇷", funFact: "'Rio de Janeiro' means River of January!", bandColor: "Green", lat: -22.9083, lng: -43.1964 },
  { region: "South America", city: "Buenos Aires", country: "Argentina", isCapital: true, population: "3.1 Million", currency: "Argentine Peso ($)", languages: "Spanish", flag: "🇦🇷", funFact: "Buenos Aires means 'good air'!", bandColor: "Green", lat: -34.5997, lng: -58.3819 },
  { region: "South America", city: "Lima", country: "Peru", isCapital: true, population: "9.7 Million", currency: "Sol (S/)", languages: "Spanish", flag: "🇵🇪", funFact: "Lima's desert gets almost no rain!", bandColor: "Green", lat: -12.06, lng: -77.0375 },
  { region: "South America", city: "Santiago", country: "Chile", isCapital: true, population: "5.6 Million", currency: "Chilean Peso ($)", languages: "Spanish", flag: "🇨🇱", funFact: "You can see the Andes mountains from anywhere in Santiago!", bandColor: "Green", lat: -33.45, lng: -70.6667 },
  { region: "South America", city: "Bogotá", country: "Colombia", isCapital: true, population: "7.4 Million", currency: "Colombian Peso ($)", languages: "Spanish", flag: "🇨🇴", funFact: "Bogotá is over 2,600 meters above sea level!", bandColor: "Green", lat: 4.6126, lng: -74.0705 },
  { region: "South America", city: "Caracas", country: "Venezuela", isCapital: true, population: "2.1 Million", currency: "Bolivar (Bs.)", languages: "Spanish", flag: "🇻🇪", funFact: "Caracas means 'valley of the Caracas tribe'!", bandColor: "Green", lat: 10.5, lng: -66.9333 },
  { region: "South America", city: "Cusco", country: "Peru", isCapital: false, population: "428,000", currency: "Sol (S/)", languages: "Spanish", flag: "🇵🇪", funFact: "The stone walls here are built without any cement!", bandColor: "Green", lat: -13.5222, lng: -71.9833 },
  { region: "South America", city: "Quito", country: "Ecuador", isCapital: true, population: "2.8 Million", currency: "USD ($)", languages: "Spanish", flag: "🇪🇨", funFact: "Quito has the largest historic center in the Americas!", bandColor: "Green", lat: -0.22, lng: -78.5125 },
  { region: "South America", city: "Cartagena", country: "Colombia", isCapital: false, population: "1 Million", currency: "Colombian Peso ($)", languages: "Spanish", flag: "🇨🇴", funFact: "Cartagena's walls took 200 years to build!", bandColor: "Green", lat: 10.4236, lng: -75.5253 },
  { region: "South America", city: "Montevideo", country: "Uruguay", isCapital: true, population: "1.8 Million", currency: "Uruguayan Peso ($)", languages: "Spanish", flag: "🇺🇾", funFact: "Montevideo hosted the first ever World Cup in 1930!", bandColor: "Green", lat: -34.8667, lng: -56.1667 },
  { region: "South America", city: "La Paz", country: "Bolivia", isCapital: true, population: "2.3 Million", currency: "Boliviano (Bs)", languages: "Spanish", flag: "🇧🇴", funFact: "Water boils at a lower temperature here because we're so high up!", bandColor: "Green", lat: -16.4942, lng: -68.1475 },
  { region: "South America", city: "Medellín", country: "Colombia", isCapital: false, population: "2.5 Million", currency: "Colombian Peso ($)", languages: "Spanish", flag: "🇨🇴", funFact: "Medellín has a river that runs through the middle of the city!", bandColor: "Green", lat: 6.2447, lng: -75.5748 },
  { region: "South America", city: "São Paulo", country: "Brazil", isCapital: false, population: "12.3 Million", currency: "Brazilian Real (R$)", languages: "Portuguese", flag: "🇧🇷", funFact: "São Paulo has more Japanese people than any city outside Japan!", bandColor: "Green", lat: -23.5504, lng: -46.6339 },
  { region: "North America", city: "Punta Cana", country: "Dominican Republic", isCapital: false, population: "100,000", currency: "Dominican Peso (RD$)", languages: "Spanish", flag: "🇩🇴", funFact: "Punta Cana means 'tip of the white cane reeds' in Spanish!", bandColor: "Red", lat: 18.58182, lng: -68.40431 },

  // ========== AFRICA (16 cities) ==========
  { region: "Africa", city: "Cairo", country: "Egypt", isCapital: true, population: "9.5 Million", currency: "Egyptian Pound (E£)", languages: "Arabic", flag: "🇪🇬", funFact: "Cairo means 'the victorious'!", bandColor: "Orange", lat: 30.0444, lng: 31.2358 },
  { region: "Africa", city: "Cape Town", country: "South Africa", isCapital: false, population: "4.6 Million", currency: "Rand (R)", languages: "English/Xhosa", flag: "🇿🇦", funFact: "Cape Town was once called the 'Tavern of the Seas'!", bandColor: "Orange", lat: -33.925, lng: 18.425 },
  { region: "Africa", city: "Johannesburg", country: "South Africa", isCapital: false, population: "5.6 Million", currency: "Rand (R)", languages: "English/Zulu", flag: "🇿🇦", funFact: "Johannesburg is not near any river or coast!", bandColor: "Orange", lat: -26.2044, lng: 28.0416 },
  { region: "Africa", city: "Marrakesh", country: "Morocco", isCapital: false, population: "1 Million", currency: "Moroccan Dirham (DH)", languages: "Arabic/French", flag: "🇲🇦", funFact: "Famous for its red sandstone walls!", bandColor: "Orange", lat: 31.6295, lng: -7.9811 },
  { region: "Africa", city: "Lagos", country: "Nigeria", isCapital: false, population: "21 Million", currency: "Nigerian Naira (₦)", languages: "English/Yoruba", flag: "🇳🇬", funFact: "One of the world's biggest tech hubs!", bandColor: "Orange", lat: 6.45, lng: 3.4 },
  { region: "Africa", city: "Addis Ababa", country: "Ethiopia", isCapital: true, population: "3.4 Million", currency: "Birr (ETB)", languages: "Amharic", flag: "🇪🇹", funFact: "Addis Ababa means 'new flower'!", bandColor: "Orange", lat: 9.0272, lng: 38.7369 },
  { region: "Africa", city: "Nairobi", country: "Kenya", isCapital: true, population: "5.2 Million", currency: "Kenyan Shilling (KES)", languages: "Swahili/English", flag: "🇰🇪", funFact: "A national park sits inside the city!", bandColor: "Orange", lat: -1.2864, lng: 36.8172 },
  { region: "Africa", city: "Casablanca", country: "Morocco", isCapital: false, population: "3.7 Million", currency: "Moroccan Dirham (DH)", languages: "Arabic/French", flag: "🇲🇦", funFact: "Casablanca is Morocco's largest city and economic capital!", bandColor: "Orange", lat: 33.5992, lng: -7.62 },
  { region: "Africa", city: "Accra", country: "Ghana", isCapital: true, population: "2.5 Million", currency: "Ghanaian Cedi (₵)", languages: "English", flag: "🇬🇭", funFact: "Accra means 'ants' because there used to be many anthills here!", bandColor: "Orange", lat: 5.6037, lng: -0.187 },
  { region: "Africa", city: "Dar es Salaam", country: "Tanzania", isCapital: false, population: "7.4 Million", currency: "Tanzanian Shilling (TSh)", languages: "Swahili/English", flag: "🇹🇿", funFact: "Dar es Salaam is the starting point for safaris to see lions and elephants!", bandColor: "Orange", lat: -6.8, lng: 39.2833 },
  { region: "Africa", city: "Tunis", country: "Tunisia", isCapital: true, population: "2.4 Million", currency: "Tunisian Dinar (DT)", languages: "Arabic/French", flag: "🇹🇳", funFact: "Ancient Carthage nearby was once Rome's biggest rival!", bandColor: "Orange", lat: 36.8008, lng: 10.18 },
  { region: "Africa", city: "Algiers", country: "Algeria", isCapital: true, population: "3.4 Million", currency: "Algerian Dinar (DA)", languages: "Arabic/French", flag: "🇩🇿", funFact: "Algiers is called 'Algiers the White' because of its white buildings!", bandColor: "Orange", lat: 36.7764, lng: 3.0586 },
  { region: "Africa", city: "Kigali", country: "Rwanda", isCapital: true, population: "1.2 Million", currency: "Rwandan Franc (FRw)", languages: "Kinyarwanda/English/French", flag: "🇷🇼", funFact: "Rwanda is called 'the land of a thousand hills'!", bandColor: "Orange", lat: -1.9536, lng: 30.0606 },
  { region: "Africa", city: "Freetown", country: "Sierra Leone", isCapital: true, population: "1.1 Million", currency: "Sierra Leonean Leone (Le)", languages: "English/Krio", flag: "🇸🇱", funFact: "Freetown was founded as a home for freed slaves from America and Britain!", bandColor: "Orange", lat: 8.4833, lng: -13.2331 },
  { region: "Africa", city: "Mombasa", country: "Kenya", isCapital: false, population: "1.2 Million", currency: "Kenyan Shilling (KSh)", languages: "Swahili/English", flag: "🇰🇪", funFact: "Mombasa has giant elephant tusks arching over its main road!", bandColor: "Orange", lat: -4.05, lng: 39.6667 },
  { region: "Africa", city: "Giza", country: "Egypt", isCapital: false, population: "4 Million", currency: "Egyptian Pound (E£)", languages: "Arabic", flag: "🇪🇬", funFact: "The Great Pyramid was the tallest building in the world for 3,800 years!", bandColor: "Orange", lat: 29.987, lng: 31.2118 },

  // ========== OCEANIA (13 cities) ==========
  { region: "Oceania", city: "Sydney", country: "Australia", isCapital: false, population: "5.3 Million", currency: "AUD ($)", languages: "English", flag: "🇦🇺", funFact: "Sydney Opera House roof has over 1 million tiles!", bandColor: "Teal", lat: -33.865, lng: 151.2094 },
  { region: "Oceania", city: "Melbourne", country: "Australia", isCapital: false, population: "5 Million", currency: "AUD ($)", languages: "English", flag: "🇦🇺", funFact: "Voted 'Most Livable City' multiple times!", bandColor: "Teal", lat: -37.8136, lng: 144.9631 },
  { region: "Oceania", city: "Auckland", country: "New Zealand", isCapital: false, population: "1.6 Million", currency: "NZD ($)", languages: "English/Māori", flag: "🇳🇿", funFact: "Built on 50+ volcanoes!", bandColor: "Teal", lat: -36.85, lng: 174.7833 },
  { region: "Oceania", city: "Brisbane", country: "Australia", isCapital: false, population: "2.6 Million", currency: "AUD ($)", languages: "English", flag: "🇦🇺", funFact: "Home to the world's largest koala sanctuary!", bandColor: "Teal", lat: -27.4678, lng: 153.0281 },
  { region: "Oceania", city: "Perth", country: "Australia", isCapital: false, population: "2.1 Million", currency: "AUD ($)", languages: "English", flag: "🇦🇺", funFact: "One of the most isolated major cities!", bandColor: "Teal", lat: -31.9522, lng: 115.8589 },
  { region: "Oceania", city: "Wellington", country: "New Zealand", isCapital: true, population: "215,000", currency: "NZD ($)", languages: "English/Māori", flag: "🇳🇿", funFact: "Wellington has a cable car that climbs up a steep hill!", bandColor: "Teal", lat: -41.2889, lng: 174.7772 },
  { region: "Oceania", city: "Suva", country: "Fiji", isCapital: true, population: "94,000", currency: "Fiji Dollar ($)", languages: "English/Fijian", flag: "🇫🇯", funFact: "Fiji has over 300 islands but only about 100 are inhabited!", bandColor: "Teal", lat: -18.1333, lng: 178.4333 },
  { region: "Oceania", city: "Papeete", country: "French Polynesia", isCapital: true, population: "26,000", currency: "CFP Franc (₣)", languages: "French/Tahitian", flag: "🇵🇫", funFact: "Tahitian pearls grown nearby are black instead of white!", bandColor: "Teal", lat: -17.5334, lng: -149.5667 },
  { region: "Oceania", city: "Apia", country: "Samoa", isCapital: true, population: "40,000", currency: "Samoan Tala (T)", languages: "Samoan/English", flag: "🇼🇸", funFact: "The famous author Robert Louis Stevenson lived here!", bandColor: "Teal", lat: -13.8333, lng: -171.8333 },
  { region: "Oceania", city: "Nuku'alofa", country: "Tonga", isCapital: true, population: "25,000", currency: "Tongan Pa'anga (T$)", languages: "Tongan/English", flag: "🇹🇴", funFact: "Tonga is the only Pacific nation never colonized by Europeans!", bandColor: "Teal", lat: -21.1347, lng: -175.2083 },
  { region: "Oceania", city: "Queenstown", country: "New Zealand", isCapital: false, population: "15,000", currency: "NZD ($)", languages: "English/Māori", flag: "🇳🇿", funFact: "Bungee jumping was invented here in New Zealand!", bandColor: "Teal", lat: -45.031162, lng: 168.662643 },
  { region: "Oceania", city: "Adelaide", country: "Australia", isCapital: false, population: "1.4 Million", currency: "AUD ($)", languages: "English", flag: "🇦🇺", funFact: "Adelaide is one of the best cities in the world for seeing koalas!", bandColor: "Teal", lat: -34.9275, lng: 138.6 },
  { region: "Oceania", city: "Christchurch", country: "New Zealand", isCapital: false, population: "390,000", currency: "NZD ($)", languages: "English/Māori", flag: "🇳🇿", funFact: "Christchurch is the gateway to exploring Antarctica!", bandColor: "Teal", lat: -43.5309, lng: 172.6365 },
  { region: "North America", city: "Nassau", country: "Bahamas", isCapital: true, population: "275,000", currency: "Bahamian Dollar (B$)", languages: "English", flag: "🇧🇸", funFact: "Pirates of the Caribbean was partly filmed in the Bahamas!", bandColor: "Red", lat: 25.0667, lng: -77.3333 },
];

export async function seedDailyQuestCities(): Promise<{ success: boolean; count: number; message: string }> {
  try {
    const count = await storage.seedDailyQuestCities(dailyQuestCitiesData);
    console.log(`✅ Seeded ${count} Daily Quest cities`);
    return { 
      success: true, 
      count, 
      message: count > 0 ? `Successfully seeded ${count} new cities` : "All cities already exist in database" 
    };
  } catch (error) {
    console.error("❌ Failed to seed Daily Quest cities:", error);
    return { success: false, count: 0, message: `Failed to seed cities: ${error}` };
  }
}

export async function updateCityCoordinates(): Promise<{ updated: number }> {
  try {
    const allCities = await storage.getAllDailyQuestCities();
    let updated = 0;
    for (const dbCity of allCities) {
      if (dbCity.lat && dbCity.lng) continue;
      const match = dailyQuestCitiesData.find(d => d.city === dbCity.city && d.country === dbCity.country);
      if (match?.lat && match?.lng) {
        await storage.updateDailyQuestCity(dbCity.id, { lat: match.lat, lng: match.lng });
        updated++;
      }
    }
    if (updated > 0) console.log(`✅ Updated ${updated} cities with lat/lng coordinates`);
    return { updated };
  } catch (error) {
    console.error("❌ Failed to update city coordinates:", error);
    return { updated: 0 };
  }
}

export { dailyQuestCitiesData };
