import { db } from "./db";
import { geoatlasCountries, geoatlasLearningPacks } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const COUNTRIES_DATA = [
  { countryName: "United States", continent: "North America", capital: "Washington D.C.", flagEmoji: "🇺🇸", isoCode: "US", lat: 39.8283, lng: -98.5795, capitalLat: 38.9072, capitalLng: -77.0369, memoryHook: "White House sits in Washington D.C.", landmarkAnchor: "White House", relatedExplorerCityId: "new-york" },
  { countryName: "Canada", continent: "North America", capital: "Ottawa", flagEmoji: "🇨🇦", isoCode: "CA", lat: 56.1304, lng: -106.3468, capitalLat: 45.4215, capitalLng: -75.6972, memoryHook: "Maple leaf flag flies over Ottawa", landmarkAnchor: "Parliament Hill", relatedExplorerCityId: "toronto" },
  { countryName: "Mexico", continent: "North America", capital: "Mexico City", flagEmoji: "🇲🇽", isoCode: "MX", lat: 23.6345, lng: -102.5528, capitalLat: 19.4326, capitalLng: -99.1332, memoryHook: "Ancient Aztec temple hides under Mexico City", landmarkAnchor: "Zócalo", relatedExplorerCityId: "mexico-city" },
  { countryName: "Costa Rica", continent: "North America", capital: "San José", flagEmoji: "🇨🇷", isoCode: "CR", lat: 9.7489, lng: -83.7534, capitalLat: 9.9281, capitalLng: -84.0907, memoryHook: "Sloths hang around in Costa Rica's capital", landmarkAnchor: "National Theater", relatedExplorerCityId: null },
  { countryName: "Panama", continent: "North America", capital: "Panama City", flagEmoji: "🇵🇦", isoCode: "PA", lat: 8.538, lng: -80.7821, capitalLat: 8.9824, capitalLng: -79.5199, memoryHook: "Ships pass through the famous Panama Canal", landmarkAnchor: "Panama Canal", relatedExplorerCityId: null },
  { countryName: "Jamaica", continent: "North America", capital: "Kingston", flagEmoji: "🇯🇲", isoCode: "JM", lat: 18.1096, lng: -77.2975, capitalLat: 18.0179, capitalLng: -76.8099, memoryHook: "Reggae music beats in Kingston", landmarkAnchor: "Bob Marley Museum", relatedExplorerCityId: null },
  { countryName: "Cuba", continent: "North America", capital: "Havana", flagEmoji: "🇨🇺", isoCode: "CU", lat: 21.5218, lng: -77.7812, capitalLat: 23.1136, capitalLng: -82.3666, memoryHook: "Colorful old cars cruise through Havana", landmarkAnchor: "Old Havana", relatedExplorerCityId: null },

  { countryName: "Brazil", continent: "South America", capital: "Brasília", flagEmoji: "🇧🇷", isoCode: "BR", lat: -14.235, lng: -51.9253, capitalLat: -15.7975, capitalLng: -47.8919, memoryHook: "Brasília was built to look like an airplane from above", landmarkAnchor: "Cathedral of Brasília", relatedExplorerCityId: "rio-de-janeiro" },
  { countryName: "Argentina", continent: "South America", capital: "Buenos Aires", flagEmoji: "🇦🇷", isoCode: "AR", lat: -38.4161, lng: -63.6167, capitalLat: -34.6037, capitalLng: -58.3816, memoryHook: "Tango dancers spin in Buenos Aires", landmarkAnchor: "Obelisco", relatedExplorerCityId: "buenos-aires" },
  { countryName: "Chile", continent: "South America", capital: "Santiago", flagEmoji: "🇨🇱", isoCode: "CL", lat: -35.6751, lng: -71.543, capitalLat: -33.4489, capitalLng: -70.6693, memoryHook: "Andes mountains tower over Santiago", landmarkAnchor: "Andes Mountains", relatedExplorerCityId: null },
  { countryName: "Peru", continent: "South America", capital: "Lima", flagEmoji: "🇵🇪", isoCode: "PE", lat: -9.19, lng: -75.0152, capitalLat: -12.0464, capitalLng: -77.0428, memoryHook: "Lima sits on Pacific cliffs near Machu Picchu", landmarkAnchor: "Machu Picchu", relatedExplorerCityId: "cusco" },
  { countryName: "Colombia", continent: "South America", capital: "Bogotá", flagEmoji: "🇨🇴", isoCode: "CO", lat: 4.5709, lng: -74.2973, capitalLat: 4.711, capitalLng: -74.0721, memoryHook: "Bogotá is one of the highest capitals in the world", landmarkAnchor: "Monserrate", relatedExplorerCityId: null },
  { countryName: "Ecuador", continent: "South America", capital: "Quito", flagEmoji: "🇪🇨", isoCode: "EC", lat: -1.8312, lng: -78.1834, capitalLat: -0.1807, capitalLng: -78.4678, memoryHook: "Quito sits right on the equator line", landmarkAnchor: "Middle of the World Monument", relatedExplorerCityId: null },
  { countryName: "Venezuela", continent: "South America", capital: "Caracas", flagEmoji: "🇻🇪", isoCode: "VE", lat: 6.4238, lng: -66.5897, capitalLat: 10.4806, capitalLng: -66.9036, memoryHook: "Angel Falls, the tallest waterfall, is near Caracas", landmarkAnchor: "Angel Falls", relatedExplorerCityId: null },

  { countryName: "United Kingdom", continent: "Europe", capital: "London", flagEmoji: "🇬🇧", isoCode: "GB", lat: 55.3781, lng: -3.436, capitalLat: 51.5074, capitalLng: -0.1278, memoryHook: "Big Ben chimes in London", landmarkAnchor: "Big Ben", relatedExplorerCityId: "london" },
  { countryName: "France", continent: "Europe", capital: "Paris", flagEmoji: "🇫🇷", isoCode: "FR", lat: 46.2276, lng: 2.2137, capitalLat: 48.8566, capitalLng: 2.3522, memoryHook: "Eiffel Tower sparkles over Paris", landmarkAnchor: "Eiffel Tower", relatedExplorerCityId: "paris" },
  { countryName: "Germany", continent: "Europe", capital: "Berlin", flagEmoji: "🇩🇪", isoCode: "DE", lat: 51.1657, lng: 10.4515, capitalLat: 52.52, capitalLng: 13.405, memoryHook: "Berlin Wall once split this city in two", landmarkAnchor: "Brandenburg Gate", relatedExplorerCityId: "berlin" },
  { countryName: "Italy", continent: "Europe", capital: "Rome", flagEmoji: "🇮🇹", isoCode: "IT", lat: 41.8719, lng: 12.5674, capitalLat: 41.9028, capitalLng: 12.4964, memoryHook: "Gladiators fought in Rome's Colosseum", landmarkAnchor: "Colosseum", relatedExplorerCityId: "rome" },
  { countryName: "Spain", continent: "Europe", capital: "Madrid", flagEmoji: "🇪🇸", isoCode: "ES", lat: 40.4637, lng: -3.7492, capitalLat: 40.4168, capitalLng: -3.7038, memoryHook: "Flamenco dancers stomp in Madrid", landmarkAnchor: "Royal Palace", relatedExplorerCityId: "barcelona" },
  { countryName: "Netherlands", continent: "Europe", capital: "Amsterdam", flagEmoji: "🇳🇱", isoCode: "NL", lat: 52.1326, lng: 5.2913, capitalLat: 52.3676, capitalLng: 4.9041, memoryHook: "Bikes and canals fill Amsterdam", landmarkAnchor: "Canal Belt", relatedExplorerCityId: "amsterdam" },
  { countryName: "Portugal", continent: "Europe", capital: "Lisbon", flagEmoji: "🇵🇹", isoCode: "PT", lat: 39.3999, lng: -8.2245, capitalLat: 38.7223, capitalLng: -9.1393, memoryHook: "Yellow trams climb Lisbon's steep hills", landmarkAnchor: "Belém Tower", relatedExplorerCityId: "lisbon" },
  { countryName: "Greece", continent: "Europe", capital: "Athens", flagEmoji: "🇬🇷", isoCode: "GR", lat: 39.0742, lng: 21.8243, capitalLat: 37.9838, capitalLng: 23.7275, memoryHook: "Ancient Parthenon watches over Athens", landmarkAnchor: "Parthenon", relatedExplorerCityId: "athens" },
  { countryName: "Switzerland", continent: "Europe", capital: "Bern", flagEmoji: "🇨🇭", isoCode: "CH", lat: 46.8182, lng: 8.2275, capitalLat: 46.948, capitalLng: 7.4474, memoryHook: "Bears and clocks are Bern's symbols", landmarkAnchor: "Zytglogge Clock Tower", relatedExplorerCityId: null },
  { countryName: "Austria", continent: "Europe", capital: "Vienna", flagEmoji: "🇦🇹", isoCode: "AT", lat: 47.5162, lng: 14.5501, capitalLat: 48.2082, capitalLng: 16.3738, memoryHook: "Mozart played piano in Vienna", landmarkAnchor: "Schönbrunn Palace", relatedExplorerCityId: "vienna" },
  { countryName: "Sweden", continent: "Europe", capital: "Stockholm", flagEmoji: "🇸🇪", isoCode: "SE", lat: 60.1282, lng: 18.6435, capitalLat: 59.3293, capitalLng: 18.0686, memoryHook: "Stockholm floats on 14 islands", landmarkAnchor: "Gamla Stan", relatedExplorerCityId: null },
  { countryName: "Norway", continent: "Europe", capital: "Oslo", flagEmoji: "🇳🇴", isoCode: "NO", lat: 60.472, lng: 8.4689, capitalLat: 59.9139, capitalLng: 10.7522, memoryHook: "Vikings sailed from Oslo's fjords", landmarkAnchor: "Viking Ship Museum", relatedExplorerCityId: null },
  { countryName: "Denmark", continent: "Europe", capital: "Copenhagen", flagEmoji: "🇩🇰", isoCode: "DK", lat: 56.2639, lng: 9.5018, capitalLat: 55.6761, capitalLng: 12.5683, memoryHook: "Little Mermaid sits in Copenhagen's harbor", landmarkAnchor: "Little Mermaid Statue", relatedExplorerCityId: "copenhagen" },
  { countryName: "Finland", continent: "Europe", capital: "Helsinki", flagEmoji: "🇫🇮", isoCode: "FI", lat: 61.9241, lng: 25.7482, capitalLat: 60.1699, capitalLng: 24.9384, memoryHook: "Santa lives near Helsinki in Finland", landmarkAnchor: "Helsinki Cathedral", relatedExplorerCityId: null },
  { countryName: "Ireland", continent: "Europe", capital: "Dublin", flagEmoji: "🇮🇪", isoCode: "IE", lat: 53.1424, lng: -7.6921, capitalLat: 53.3498, capitalLng: -6.2603, memoryHook: "Lucky clovers grow in Dublin's parks", landmarkAnchor: "Trinity College", relatedExplorerCityId: "dublin" },
  { countryName: "Belgium", continent: "Europe", capital: "Brussels", flagEmoji: "🇧🇪", isoCode: "BE", lat: 50.5039, lng: 4.4699, capitalLat: 50.8503, capitalLng: 4.3517, memoryHook: "Chocolate and waffles fill Brussels", landmarkAnchor: "Grand Place", relatedExplorerCityId: null },
  { countryName: "Poland", continent: "Europe", capital: "Warsaw", flagEmoji: "🇵🇱", isoCode: "PL", lat: 51.9194, lng: 19.1451, capitalLat: 52.2297, capitalLng: 21.0122, memoryHook: "Warsaw's Old Town was rebuilt from rubble", landmarkAnchor: "Old Town Square", relatedExplorerCityId: null },
  { countryName: "Czech Republic", continent: "Europe", capital: "Prague", flagEmoji: "🇨🇿", isoCode: "CZ", lat: 49.8175, lng: 15.473, capitalLat: 50.0755, capitalLng: 14.4378, memoryHook: "Prague's clock has been ticking for 600 years", landmarkAnchor: "Astronomical Clock", relatedExplorerCityId: "prague" },
  { countryName: "Hungary", continent: "Europe", capital: "Budapest", flagEmoji: "🇭🇺", isoCode: "HU", lat: 47.1625, lng: 19.5033, capitalLat: 47.4979, capitalLng: 19.0402, memoryHook: "Budapest is actually two cities: Buda and Pest", landmarkAnchor: "Chain Bridge", relatedExplorerCityId: "budapest" },
  { countryName: "Iceland", continent: "Europe", capital: "Reykjavik", flagEmoji: "🇮🇸", isoCode: "IS", lat: 64.9631, lng: -19.0208, capitalLat: 64.1466, capitalLng: -21.9426, memoryHook: "Geysers shoot hot water in Reykjavik", landmarkAnchor: "Hallgrímskirkja", relatedExplorerCityId: "reykjavik" },
  { countryName: "Russia", continent: "Europe", capital: "Moscow", flagEmoji: "🇷🇺", isoCode: "RU", lat: 61.524, lng: 105.3188, capitalLat: 55.7558, capitalLng: 37.6173, memoryHook: "Colorful onion domes top Moscow's buildings", landmarkAnchor: "Saint Basil's Cathedral", relatedExplorerCityId: null },

  { countryName: "Japan", continent: "Asia", capital: "Tokyo", flagEmoji: "🇯🇵", isoCode: "JP", lat: 36.2048, lng: 138.2529, capitalLat: 35.6762, capitalLng: 139.6503, memoryHook: "Tokyo Tower glows red over Japan's capital", landmarkAnchor: "Tokyo Tower", relatedExplorerCityId: "tokyo" },
  { countryName: "China", continent: "Asia", capital: "Beijing", flagEmoji: "🇨🇳", isoCode: "CN", lat: 35.8617, lng: 104.1954, capitalLat: 39.9042, capitalLng: 116.4074, memoryHook: "Forbidden City guards Beijing's secrets", landmarkAnchor: "Forbidden City", relatedExplorerCityId: "beijing" },
  { countryName: "India", continent: "Asia", capital: "New Delhi", flagEmoji: "🇮🇳", isoCode: "IN", lat: 20.5937, lng: 78.9629, capitalLat: 28.6139, capitalLng: 77.209, memoryHook: "Taj Mahal shines near New Delhi", landmarkAnchor: "Taj Mahal", relatedExplorerCityId: "mumbai" },
  { countryName: "Thailand", continent: "Asia", capital: "Bangkok", flagEmoji: "🇹🇭", isoCode: "TH", lat: 15.87, lng: 100.9925, capitalLat: 13.7563, capitalLng: 100.5018, memoryHook: "Golden temples glow in Bangkok", landmarkAnchor: "Grand Palace", relatedExplorerCityId: "bangkok" },
  { countryName: "South Korea", continent: "Asia", capital: "Seoul", flagEmoji: "🇰🇷", isoCode: "KR", lat: 35.9078, lng: 127.7669, capitalLat: 37.5665, capitalLng: 126.978, memoryHook: "K-pop stars perform in Seoul", landmarkAnchor: "Gyeongbokgung Palace", relatedExplorerCityId: "seoul" },
  { countryName: "Singapore", continent: "Asia", capital: "Singapore", flagEmoji: "🇸🇬", isoCode: "SG", lat: 1.3521, lng: 103.8198, capitalLat: 1.3521, capitalLng: 103.8198, memoryHook: "Marina Bay Sands looks like a surfboard on stilts", landmarkAnchor: "Marina Bay Sands", relatedExplorerCityId: "singapore" },
  { countryName: "Malaysia", continent: "Asia", capital: "Kuala Lumpur", flagEmoji: "🇲🇾", isoCode: "MY", lat: 4.2105, lng: 101.9758, capitalLat: 3.139, capitalLng: 101.6869, memoryHook: "Twin towers stand tall in Kuala Lumpur", landmarkAnchor: "Petronas Towers", relatedExplorerCityId: null },
  { countryName: "Indonesia", continent: "Asia", capital: "Jakarta", flagEmoji: "🇮🇩", isoCode: "ID", lat: -0.7893, lng: 113.9213, capitalLat: -6.2088, capitalLng: 106.8456, memoryHook: "Komodo dragons live near Jakarta", landmarkAnchor: "National Monument", relatedExplorerCityId: null },
  { countryName: "Philippines", continent: "Asia", capital: "Manila", flagEmoji: "🇵🇭", isoCode: "PH", lat: 12.8797, lng: 121.774, capitalLat: 14.5995, capitalLng: 120.9842, memoryHook: "Jeepneys zoom through Manila's streets", landmarkAnchor: "Intramuros", relatedExplorerCityId: null },
  { countryName: "Vietnam", continent: "Asia", capital: "Hanoi", flagEmoji: "🇻🇳", isoCode: "VN", lat: 14.0583, lng: 108.2772, capitalLat: 21.0278, capitalLng: 105.8342, memoryHook: "Water puppets dance in Hanoi", landmarkAnchor: "Hoan Kiem Lake", relatedExplorerCityId: null },
  { countryName: "Turkey", continent: "Asia", capital: "Ankara", flagEmoji: "🇹🇷", isoCode: "TR", lat: 38.9637, lng: 35.2433, capitalLat: 39.9334, capitalLng: 32.8597, memoryHook: "Ankara has fluffy angora cats and goats", landmarkAnchor: "Ataturk Mausoleum", relatedExplorerCityId: "istanbul" },
  { countryName: "United Arab Emirates", continent: "Asia", capital: "Abu Dhabi", flagEmoji: "🇦🇪", isoCode: "AE", lat: 23.4241, lng: 53.8478, capitalLat: 24.4539, capitalLng: 54.3773, memoryHook: "Abu Dhabi has the world's fastest roller coaster", landmarkAnchor: "Sheikh Zayed Mosque", relatedExplorerCityId: "dubai" },
  { countryName: "Israel", continent: "Asia", capital: "Jerusalem", flagEmoji: "🇮🇱", isoCode: "IL", lat: 31.0461, lng: 34.8516, capitalLat: 31.7683, capitalLng: 35.2137, memoryHook: "Ancient Western Wall stands in Jerusalem", landmarkAnchor: "Western Wall", relatedExplorerCityId: null },
  { countryName: "Saudi Arabia", continent: "Asia", capital: "Riyadh", flagEmoji: "🇸🇦", isoCode: "SA", lat: 23.8859, lng: 45.0792, capitalLat: 24.7136, capitalLng: 46.6753, memoryHook: "Desert camels roam near Riyadh", landmarkAnchor: "Kingdom Centre Tower", relatedExplorerCityId: null },
  { countryName: "Qatar", continent: "Asia", capital: "Doha", flagEmoji: "🇶🇦", isoCode: "QA", lat: 25.3548, lng: 51.1839, capitalLat: 25.2854, capitalLng: 51.531, memoryHook: "Doha hosted the FIFA World Cup 2022", landmarkAnchor: "The Pearl", relatedExplorerCityId: null },
  { countryName: "Nepal", continent: "Asia", capital: "Kathmandu", flagEmoji: "🇳🇵", isoCode: "NP", lat: 28.3949, lng: 84.124, capitalLat: 27.7172, capitalLng: 85.324, memoryHook: "Mount Everest towers above Kathmandu", landmarkAnchor: "Mount Everest", relatedExplorerCityId: null },
  { countryName: "Pakistan", continent: "Asia", capital: "Islamabad", flagEmoji: "🇵🇰", isoCode: "PK", lat: 30.3753, lng: 69.3451, capitalLat: 33.6844, capitalLng: 73.0479, memoryHook: "Islamabad was built from scratch as a brand-new capital", landmarkAnchor: "Faisal Mosque", relatedExplorerCityId: null },
  { countryName: "Bangladesh", continent: "Asia", capital: "Dhaka", flagEmoji: "🇧🇩", isoCode: "BD", lat: 23.685, lng: 90.3563, capitalLat: 23.8103, capitalLng: 90.4125, memoryHook: "Dhaka is called the City of Mosques", landmarkAnchor: "Lalbagh Fort", relatedExplorerCityId: null },
  { countryName: "Sri Lanka", continent: "Asia", capital: "Colombo", flagEmoji: "🇱🇰", isoCode: "LK", lat: 7.8731, lng: 80.7718, capitalLat: 6.9271, capitalLng: 79.8612, memoryHook: "Tea and elephants fill Sri Lanka around Colombo", landmarkAnchor: "Sigiriya Rock", relatedExplorerCityId: null },

  { countryName: "South Africa", continent: "Africa", capital: "Pretoria", flagEmoji: "🇿🇦", isoCode: "ZA", lat: -30.5595, lng: 22.9375, capitalLat: -25.7479, capitalLng: 28.2293, memoryHook: "Purple jacaranda trees bloom in Pretoria", landmarkAnchor: "Union Buildings", relatedExplorerCityId: "cape-town" },
  { countryName: "Egypt", continent: "Africa", capital: "Cairo", flagEmoji: "🇪🇬", isoCode: "EG", lat: 26.8206, lng: 30.8025, capitalLat: 30.0444, capitalLng: 31.2357, memoryHook: "Pyramids and Sphinx guard Cairo", landmarkAnchor: "Pyramids of Giza", relatedExplorerCityId: "cairo" },
  { countryName: "Kenya", continent: "Africa", capital: "Nairobi", flagEmoji: "🇰🇪", isoCode: "KE", lat: -0.0236, lng: 37.9062, capitalLat: -1.2921, capitalLng: 36.8219, memoryHook: "Lions roam near Nairobi's city limits", landmarkAnchor: "Nairobi National Park", relatedExplorerCityId: "nairobi" },
  { countryName: "Morocco", continent: "Africa", capital: "Rabat", flagEmoji: "🇲🇦", isoCode: "MA", lat: 31.7917, lng: -7.0926, capitalLat: 34.0209, capitalLng: -6.8416, memoryHook: "Blue doors and spice markets color Rabat", landmarkAnchor: "Hassan Tower", relatedExplorerCityId: "marrakesh" },
  { countryName: "Nigeria", continent: "Africa", capital: "Abuja", flagEmoji: "🇳🇬", isoCode: "NG", lat: 9.082, lng: 8.6753, capitalLat: 9.0765, capitalLng: 7.3986, memoryHook: "Abuja looks like an eagle from above", landmarkAnchor: "Aso Rock", relatedExplorerCityId: null },
  { countryName: "Tanzania", continent: "Africa", capital: "Dodoma", flagEmoji: "🇹🇿", isoCode: "TZ", lat: -6.369, lng: 34.8888, capitalLat: -6.1630, capitalLng: 35.7516, memoryHook: "Mount Kilimanjaro rises near Tanzania's plains", landmarkAnchor: "Mount Kilimanjaro", relatedExplorerCityId: null },
  { countryName: "Ethiopia", continent: "Africa", capital: "Addis Ababa", flagEmoji: "🇪🇹", isoCode: "ET", lat: 9.145, lng: 40.4897, capitalLat: 9.0222, capitalLng: 38.7469, memoryHook: "Coffee was born in Ethiopia near Addis Ababa", landmarkAnchor: "Holy Trinity Cathedral", relatedExplorerCityId: null },
  { countryName: "Ghana", continent: "Africa", capital: "Accra", flagEmoji: "🇬🇭", isoCode: "GH", lat: 7.9465, lng: -1.0232, capitalLat: 5.6037, capitalLng: -0.187, memoryHook: "Colorful kente cloth is woven in Accra", landmarkAnchor: "Independence Square", relatedExplorerCityId: null },
  { countryName: "Uganda", continent: "Africa", capital: "Kampala", flagEmoji: "🇺🇬", isoCode: "UG", lat: 1.3733, lng: 32.2903, capitalLat: 0.3476, capitalLng: 32.5825, memoryHook: "Mountain gorillas live near Kampala", landmarkAnchor: "Kasubi Tombs", relatedExplorerCityId: null },

  { countryName: "Australia", continent: "Oceania", capital: "Canberra", flagEmoji: "🇦🇺", isoCode: "AU", lat: -25.2744, lng: 133.7751, capitalLat: -35.2809, capitalLng: 149.13, memoryHook: "Kangaroos hop around Canberra's parks", landmarkAnchor: "Parliament House", relatedExplorerCityId: "sydney" },
  { countryName: "New Zealand", continent: "Oceania", capital: "Wellington", flagEmoji: "🇳🇿", isoCode: "NZ", lat: -40.9006, lng: 174.886, capitalLat: -41.2865, capitalLng: 174.7762, memoryHook: "Lord of the Rings was filmed near Wellington", landmarkAnchor: "Te Papa Museum", relatedExplorerCityId: null },
  { countryName: "Fiji", continent: "Oceania", capital: "Suva", flagEmoji: "🇫🇯", isoCode: "FJ", lat: -17.7134, lng: 178.065, capitalLat: -18.1416, capitalLng: 178.4419, memoryHook: "Crystal clear water surrounds Suva", landmarkAnchor: "Fiji Museum", relatedExplorerCityId: null },
  { countryName: "Papua New Guinea", continent: "Oceania", capital: "Port Moresby", flagEmoji: "🇵🇬", isoCode: "PG", lat: -6.315, lng: 143.9555, capitalLat: -9.4438, capitalLng: 147.1803, memoryHook: "Over 800 languages are spoken around Port Moresby", landmarkAnchor: "National Parliament", relatedExplorerCityId: null },
];

export async function seedGeoAtlasCountries() {
  try {
    const existing = await db.select({ id: geoatlasCountries.id }).from(geoatlasCountries).limit(1);
    if (existing.length > 0) {
      console.log("[GeoAtlas] Countries already seeded, skipping");
      return;
    }

    console.log(`[GeoAtlas] Seeding ${COUNTRIES_DATA.length} countries...`);
    
    const insertedCountries: { id: string; countryName: string; continent: string }[] = [];
    
    for (const country of COUNTRIES_DATA) {
      const [inserted] = await db.insert(geoatlasCountries).values(country).returning({ id: geoatlasCountries.id, countryName: geoatlasCountries.countryName, continent: geoatlasCountries.continent });
      insertedCountries.push(inserted);
    }

    console.log(`[GeoAtlas] Seeded ${insertedCountries.length} countries`);

    const continents = [...new Set(COUNTRIES_DATA.map(c => c.continent))];
    let totalPacks = 0;
    
    for (const continent of continents) {
      const continentCountries = insertedCountries.filter(c => c.continent === continent);
      const packSize = continentCountries.length <= 7 ? continentCountries.length : Math.min(6, Math.ceil(continentCountries.length / Math.ceil(continentCountries.length / 6)));
      
      for (let i = 0; i < continentCountries.length; i += packSize) {
        const packCountries = continentCountries.slice(i, i + packSize);
        const packNumber = Math.floor(i / packSize) + 1;
        
        await db.insert(geoatlasLearningPacks).values({
          continent,
          title: `${continent} Pack ${packNumber}`,
          packOrder: packNumber,
          countryIds: packCountries.map(c => c.id),
        });
        totalPacks++;
      }
    }

    console.log(`[GeoAtlas] Created ${totalPacks} learning packs across ${continents.length} continents`);
  } catch (error) {
    console.error("[GeoAtlas] Seed error:", error);
  }
}
