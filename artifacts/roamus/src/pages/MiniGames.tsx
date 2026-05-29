import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Sparkles, Trophy, Star, Timer, Gamepad2, Brain, Flag, Globe, Zap, Map, Puzzle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { MINI_GAMES } from "@shared/schema";
import LearningSummary, { getGameLearningPoints } from "@/components/LearningSummary";
import { useExplorer } from "@/lib/explorerContext";
import { useUser } from "@/lib/userContext";
import { LOCATION_CARDS } from "@/lib/gameData";
import { ALL_GUESS_AND_GO_CITIES } from "@/lib/dailyQuestData";
import { useFreeLimits } from "@/hooks/useFreeLimits";
import { GeoPassModal } from "@/components/GeoPassModal";
import { Lock } from "lucide-react";

const CONTINENT_BY_COUNTRY: Record<string, string> = {
  "Netherlands": "Europe",
  "Belgium": "Europe",
  "France": "Europe",
  "Germany": "Europe",
  "United Kingdom": "Europe",
  "Spain": "Europe",
  "Italy": "Europe",
  "Portugal": "Europe",
  "Ireland": "Europe",
  "Sweden": "Europe",
  "Norway": "Europe",
  "Denmark": "Europe",
  "Finland": "Europe",
  "Austria": "Europe",
  "Poland": "Europe",
  "Greece": "Europe",
  "Australia": "Australia",
  "New Zealand": "Australia",
  "Japan": "Asia",
  "China": "Asia",
  "India": "Asia",
  "South Korea": "Asia",
  "Thailand": "Asia",
  "Vietnam": "Asia",
  "Indonesia": "Asia",
  "Malaysia": "Asia",
  "Singapore": "Asia",
  "Philippines": "Asia",
  "United Arab Emirates": "Asia",
  "Saudi Arabia": "Asia",
  "Qatar": "Asia",
};

interface UserMiniGame {
  id: string;
  visitorId: string;
  gameId: string;
  isUnlocked: boolean;
  unlockedAt: string | null;
  timesPlayed: number;
  highScore: number;
  lastPlayedAt: string | null;
  stickersSpent: number;
}

const GAME_ICONS: Record<string, React.ReactNode> = {
  memory_match: <Brain className="w-8 h-8" />,
  flag_quiz: <Flag className="w-8 h-8" />,
  capital_dash: <Zap className="w-8 h-8" />,
  globe_spinner: <Globe className="w-8 h-8" />,
  map_me: <Map className="w-8 h-8" />,
  city_vibe: <Sparkles className="w-8 h-8" />,
};

const GAME_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  memory_match: { bg: "from-purple-400 to-indigo-500", border: "border-purple-300", text: "text-purple-700" },
  flag_quiz: { bg: "from-green-400 to-emerald-500", border: "border-green-300", text: "text-green-700" },
  capital_dash: { bg: "from-orange-400 to-red-500", border: "border-orange-300", text: "text-orange-700" },
  globe_spinner: { bg: "from-blue-400 to-cyan-500", border: "border-blue-300", text: "text-blue-700" },
  map_me: { bg: "from-sky-400 to-blue-500", border: "border-sky-300", text: "text-sky-700" },
  city_vibe: { bg: "from-pink-400 to-rose-500", border: "border-pink-300", text: "text-pink-700" },
};

// Landmark names for Memory Match game - all 101 cities covered
const CITY_LANDMARKS: Record<string, string> = {
  // Major world cities
  "Paris": "Eiffel Tower", "Tokyo": "Tokyo Tower", "London": "Big Ben", "Rome": "Colosseum",
  "New York": "Statue of Liberty", "Sydney": "Opera House", "Cairo": "Pyramids", "Rio de Janeiro": "Christ the Redeemer",
  "Moscow": "Kremlin", "Beijing": "Great Wall", "Dubai": "Burj Khalifa", "Barcelona": "Sagrada Familia",
  "Berlin": "Brandenburg Gate", "Toronto": "CN Tower", "Mexico City": "Angel of Independence",
  "Mumbai": "Gateway of India", "Seoul": "Gyeongbokgung Palace", "Buenos Aires": "Obelisco",
  "Cape Town": "Table Mountain", "Istanbul": "Hagia Sophia", "Athens": "Parthenon",
  "Stockholm": "Gamla Stan", "Oslo": "Viking Ship Museum", "Copenhagen": "Little Mermaid",
  "Helsinki": "Helsinki Cathedral", "Dublin": "Temple Bar", "Warsaw": "Old Town",
  "Amsterdam": "Canal Houses", "Brussels": "Atomium", "Zurich": "Lake Zurich",
  "Vienna": "Schönbrunn Palace", "Lisbon": "Belém Tower", "Bangkok": "Grand Palace",
  "Ho Chi Minh City": "War Remnants Museum", "Jakarta": "Monas", "Kuala Lumpur": "Petronas Towers",
  "Manila": "Intramuros", "Singapore": "Marina Bay Sands", "Auckland": "Sky Tower",
  "Nairobi": "Nairobi National Park", "Casablanca": "Hassan II Mosque", "Lagos": "Lekki Bridge",
  "Santiago": "San Cristóbal Hill", "Lima": "Plaza Mayor", "Bogota": "Monserrate",
  "Prague": "Charles Bridge", "Budapest": "Parliament", "Bucharest": "Palace of Parliament",
  "Kyiv": "St. Sophia's Cathedral", "Tel Aviv": "Old Jaffa", "Riyadh": "Kingdom Centre",
  "Doha": "Museum of Islamic Art", "Karachi": "Quaid-e-Azam Mausoleum", "Dhaka": "Lalbagh Fort",
  "Kathmandu": "Swayambhunath", "Colombo": "Gangaramaya Temple", "Kingston": "Bob Marley Museum",
  "Havana": "El Capitolio", "Reykjavik": "Hallgrímskirkja", "Zagreb": "St. Mark's Church",
  "Addis Ababa": "Holy Trinity Cathedral", "Caracas": "El Ávila", "Suva": "Fiji Museum",
  "Quito": "Basilica del Voto Nacional", "Venice": "St. Mark's Basilica", "Kyoto": "Fushimi Inari",
  "Honolulu": "Diamond Head", "Cusco": "Machu Picchu", "Edinburgh": "Edinburgh Castle",
  "Los Angeles": "Hollywood Sign", "San Francisco": "Golden Gate Bridge", "Chicago": "Willis Tower",
  "Miami": "South Beach", "Las Vegas": "The Strip", "Delhi": "Red Fort", "Shanghai": "Oriental Pearl Tower",
  "Hong Kong": "Victoria Peak", "Taipei": "Taipei 101", "Hanoi": "Hoan Kiem Lake",
  "Bali": "Uluwatu Temple", "Fiji": "Coral Reefs", "Marrakech": "Jemaa el-Fnaa",
  "Accra": "Independence Square", "Dar es Salaam": "National Museum", "Tunis": "Bardo Museum",
  "Algiers": "Casbah", "Kigali": "Genocide Memorial", "Freetown": "Cotton Tree",
  "La Paz": "Witches Market", "Santo Domingo": "Colonial Zone", "Papeete": "Tahiti Beach",
  "Apia": "To Sua Trench", "Nuku'alofa": "Royal Palace", "Panama City": "Panama Canal",
  "Nassau": "Atlantis Resort", "New Orleans": "French Quarter", "Vancouver": "Stanley Park",
  "Montreal": "Mont Royal", "Queenstown": "Bungee Jumping", "Melbourne": "Flinders Station",
  "Perth": "Kings Park",
  // Additional cities from expanded list
  "Florence": "Duomo Cathedral", "Madrid": "Royal Palace", "Washington D.C.": "White House",
  "Boston": "Freedom Trail", "Seattle": "Space Needle", "Guadalajara": "Hospicio Cabañas",
  "San Diego": "Balboa Park", "Osaka": "Osaka Castle", "Jerusalem": "Western Wall",
  "Cartagena": "Walled City", "Montevideo": "Palacio Salvo", "Medellín": "Plaza Botero",
  "São Paulo": "Paulista Avenue", "Punta Cana": "Bavaro Beach", "Mombasa": "Fort Jesus",
  "Giza": "Great Sphinx", "Wellington": "Te Papa Museum", "Adelaide": "Adelaide Oval",
  "Christchurch": "Botanic Gardens", "Bogotá": "Monserrate",
};

// Country code to flag emoji mapping
const COUNTRY_FLAG_MAP: Record<string, string> = {
  "France": "🇫🇷", "Japan": "🇯🇵", "United Kingdom": "🇬🇧", "Italy": "🇮🇹", "United States": "🇺🇸",
  "Australia": "🇦🇺", "Egypt": "🇪🇬", "Brazil": "🇧🇷", "Russia": "🇷🇺", "China": "🇨🇳",
  "UAE": "🇦🇪", "Spain": "🇪🇸", "Germany": "🇩🇪", "Canada": "🇨🇦", "Mexico": "🇲🇽",
  "India": "🇮🇳", "South Korea": "🇰🇷", "Argentina": "🇦🇷", "South Africa": "🇿🇦", "Turkey": "🇹🇷",
  "Greece": "🇬🇷", "Sweden": "🇸🇪", "Norway": "🇳🇴", "Denmark": "🇩🇰", "Finland": "🇫🇮",
  "Ireland": "🇮🇪", "Poland": "🇵🇱", "Netherlands": "🇳🇱", "Belgium": "🇧🇪", "Switzerland": "🇨🇭",
  "Austria": "🇦🇹", "Portugal": "🇵🇹", "Thailand": "🇹🇭", "Vietnam": "🇻🇳", "Indonesia": "🇮🇩",
  "Malaysia": "🇲🇾", "Philippines": "🇵🇭", "Singapore": "🇸🇬", "New Zealand": "🇳🇿", "Kenya": "🇰🇪",
  "Morocco": "🇲🇦", "Nigeria": "🇳🇬", "Chile": "🇨🇱", "Peru": "🇵🇪", "Colombia": "🇨🇴",
  "Czech Republic": "🇨🇿", "Hungary": "🇭🇺", "Romania": "🇷🇴", "Ukraine": "🇺🇦", "Israel": "🇮🇱",
  "Saudi Arabia": "🇸🇦", "Qatar": "🇶🇦", "Pakistan": "🇵🇰", "Bangladesh": "🇧🇩", "Nepal": "🇳🇵",
  "Sri Lanka": "🇱🇰", "Jamaica": "🇯🇲", "Cuba": "🇨🇺", "Iceland": "🇮🇸", "Croatia": "🇭🇷",
  "Ethiopia": "🇪🇹", "Venezuela": "🇻🇪", "Fiji": "🇫🇯", "Ecuador": "🇪🇨", "USA": "🇺🇸",
  "Taiwan": "🇹🇼", "Ghana": "🇬🇭", "Tanzania": "🇹🇿", "Tunisia": "🇹🇳", "Algeria": "🇩🇿",
  "Rwanda": "🇷🇼", "Sierra Leone": "🇸🇱", "Bolivia": "🇧🇴", "Dominican Republic": "🇩🇴",
  "French Polynesia": "🇵🇫", "Samoa": "🇼🇸", "Tonga": "🇹🇴", "Panama": "🇵🇦", "Bahamas": "🇧🇸",
  "Hong Kong": "🇭🇰",
};

// Derive CITIES_FOR_GAMES from ALL_GUESS_AND_GO_CITIES (101 cities)
const CITIES_FOR_GAMES = ALL_GUESS_AND_GO_CITIES.map(card => ({
  city: card.city,
  country: card.country,
  flag: COUNTRY_FLAG_MAP[card.country] || "🏳️",
  landmark: CITY_LANDMARKS[card.city] || `${card.city} Landmark`, // Use proper landmark name
  landmarkIcon: card.landmarkIcon || "🏛️",
  funFact: card.didYouKnow || `${card.city} is a wonderful city in ${card.country}!`,
}));

const FLAG_QUIZ_COUNTRIES = [
  { country: "France", flag: "🇫🇷", tip: "Blue, white, red stripes - like the French Revolution motto: Liberty, Equality, Brotherhood!" },
  { country: "Japan", flag: "🇯🇵", tip: "A big red circle on white - it's the 'Land of the Rising Sun' so there's a sun!" },
  { country: "United Kingdom", flag: "🇬🇧", tip: "Red, white and blue X marks the spot - it's called the Union Jack!" },
  { country: "Italy", flag: "🇮🇹", tip: "Green, white, red - think of Italian pizza: basil, cheese, tomato!" },
  { country: "United States", flag: "🇺🇸", tip: "Stars and stripes! 50 stars for 50 states, red and white stripes." },
  { country: "Australia", flag: "🇦🇺", tip: "Blue with the Southern Cross stars - you can only see these stars from 'down under'!" },
  { country: "Egypt", flag: "🇪🇬", tip: "Red, white, black with a golden eagle - the eagle is like a pharaoh's symbol!" },
  { country: "Brazil", flag: "🇧🇷", tip: "Green with a yellow diamond and blue circle - like the Amazon jungle with golden sun!" },
  { country: "Russia", flag: "🇷🇺", tip: "White, blue, red horizontal stripes - Russia is really big and cold (white snow on top)!" },
  { country: "China", flag: "🇨🇳", tip: "Red with yellow stars - one big star with 4 little ones, like a family!" },
  { country: "UAE", flag: "🇦🇪", tip: "Red stripe on the side, green, white, black - the colors of Arab unity!" },
  { country: "Spain", flag: "🇪🇸", tip: "Red, yellow, red with a coat of arms - yellow is for Spanish sunshine!" },
  { country: "Germany", flag: "🇩🇪", tip: "Black, red, gold horizontal stripes - Germany loves their gold medals!" },
  { country: "Canada", flag: "🇨🇦", tip: "Red and white with a maple leaf - Canada has lots of maple trees for syrup!" },
  { country: "Mexico", flag: "🇲🇽", tip: "Green, white, red with an eagle eating a snake - from an ancient legend!" },
  { country: "India", flag: "🇮🇳", tip: "Orange, white, green with a blue wheel - the wheel is called Ashoka Chakra!" },
  { country: "South Korea", flag: "🇰🇷", tip: "White with a red and blue swirl (Yin-Yang) and black symbols!" },
  { country: "Argentina", flag: "🇦🇷", tip: "Light blue and white with a sun face - the sun has a happy face!" },
  { country: "South Africa", flag: "🇿🇦", tip: "Rainbow nation! Has 6 colors including a Y-shape in green!" },
  { country: "Turkey", flag: "🇹🇷", tip: "Red with a white crescent moon and star - like a nighttime sky!" },
  { country: "Greece", flag: "🇬🇷", tip: "Blue and white stripes with a cross - blue like the beautiful Greek sea!" },
  { country: "Sweden", flag: "🇸🇪", tip: "Blue with a yellow cross - Swedish yellow like IKEA!" },
  { country: "Norway", flag: "🇳🇴", tip: "Red with a blue cross outlined in white - the cross goes all the way to the edges!" },
  { country: "Denmark", flag: "🇩🇰", tip: "Red with a white cross - the oldest flag design in the world still in use!" },
  { country: "Finland", flag: "🇫🇮", tip: "White with a blue cross - white for snow, blue for thousands of lakes!" },
  { country: "Ireland", flag: "🇮🇪", tip: "Green, white, orange - green is for Irish luck and shamrocks!" },
  { country: "Poland", flag: "🇵🇱", tip: "White on top, red on bottom - just two simple colors!" },
  { country: "Netherlands", flag: "🇳🇱", tip: "Red, white, blue horizontal - looks like the French flag turned sideways!" },
  { country: "Belgium", flag: "🇧🇪", tip: "Black, yellow, red vertical stripes - famous for Belgian chocolate!" },
  { country: "Switzerland", flag: "🇨🇭", tip: "Red square with a white plus sign - like a first aid kit!" },
  { country: "Austria", flag: "🇦🇹", tip: "Red, white, red horizontal stripes - red stripes are like a sandwich!" },
  { country: "Portugal", flag: "🇵🇹", tip: "Green and red with a fancy shield - Portuguese explorers sailed the seas!" },
  { country: "Thailand", flag: "🇹🇭", tip: "Red, white, blue, white, red stripes - blue in the middle like royal color!" },
  { country: "Vietnam", flag: "🇻🇳", tip: "Red with a big yellow star - the star has 5 points!" },
  { country: "Indonesia", flag: "🇮🇩", tip: "Red on top, white on bottom - looks like Poland upside down!" },
  { country: "Malaysia", flag: "🇲🇾", tip: "Red and white stripes with a blue corner, moon and star - like the US but different!" },
  { country: "Philippines", flag: "🇵🇭", tip: "Blue, red, white with a sun and 3 stars - the sun has 8 rays!" },
  { country: "Singapore", flag: "🇸🇬", tip: "Red on top, white on bottom with moon and 5 stars!" },
  { country: "New Zealand", flag: "🇳🇿", tip: "Blue with red stars - like Australia's cousin but with red stars!" },
  { country: "Kenya", flag: "🇰🇪", tip: "Black, red, green with shields and spears - African warrior colors!" },
  { country: "Morocco", flag: "🇲🇦", tip: "Red with a green star - the star has 5 points like a starfish!" },
  { country: "Nigeria", flag: "🇳🇬", tip: "Green, white, green vertical - green stripes like palm trees!" },
  { country: "Chile", flag: "🇨🇱", tip: "White and red with a blue square and white star - looks like Texas flag!" },
  { country: "Peru", flag: "🇵🇪", tip: "Red, white, red vertical stripes - simple and bold!" },
  { country: "Colombia", flag: "🇨🇴", tip: "Yellow, blue, red - yellow takes up half the flag for Colombian gold!" },
  { country: "Czech Republic", flag: "🇨🇿", tip: "White, red with a blue triangle - the triangle points to the right!" },
  { country: "Hungary", flag: "🇭🇺", tip: "Red, white, green horizontal - like Italy but horizontal!" },
  { country: "Romania", flag: "🇷🇴", tip: "Blue, yellow, red vertical - like Chad's flag, they're flag twins!" },
  { country: "Ukraine", flag: "🇺🇦", tip: "Blue sky on top, yellow wheat field on bottom - like a sunny day!" },
  { country: "Israel", flag: "🇮🇱", tip: "White with blue stripes and Star of David - the star has 6 points!" },
  { country: "Saudi Arabia", flag: "🇸🇦", tip: "Green with white Arabic writing and a sword - the only flag with a sword!" },
  { country: "Qatar", flag: "🇶🇦", tip: "Maroon and white with zigzag pattern - maroon is a brownish-red color!" },
  { country: "Pakistan", flag: "🇵🇰", tip: "Green with a white stripe, crescent moon and star - green is for Islam!" },
  { country: "Bangladesh", flag: "🇧🇩", tip: "Green with a red circle - like Japan but green and red is off-center!" },
  { country: "Nepal", flag: "🇳🇵", tip: "Two triangles stacked - the only non-rectangular country flag in the world!" },
  { country: "Sri Lanka", flag: "🇱🇰", tip: "Golden lion holding a sword on maroon - the lion looks fierce!" },
  { country: "Jamaica", flag: "🇯🇲", tip: "Black, green, gold with an X pattern - reggae colors, mon!" },
  { country: "Cuba", flag: "🇨🇺", tip: "Blue and white stripes with a red triangle and white star!" },
  { country: "Iceland", flag: "🇮🇸", tip: "Blue with a red cross outlined in white - like a fire and ice cross!" },
  { country: "Croatia", flag: "🇭🇷", tip: "Red, white, blue stripes with a checkered shield - like a chess board!" },
  { country: "Ethiopia", flag: "🇪🇹", tip: "Green, yellow, red horizontal stripes with a blue circle and star - the colors of Africa!" },
  { country: "Venezuela", flag: "🇻🇪", tip: "Yellow, blue, red horizontal with stars in the middle - yellow for gold!" },
  { country: "Fiji", flag: "🇫🇯", tip: "Blue with the Union Jack and a shield - tropical island nation!" },
  { country: "Ecuador", flag: "🇪🇨", tip: "Yellow, blue, red with a coat of arms - yellow takes up half!" },
  { country: "Taiwan", flag: "🇹🇼", tip: "Red with a blue corner and white sun - the sun has 12 rays!" },
  { country: "Ghana", flag: "🇬🇭", tip: "Red, gold, green with a black star - the star of Africa!" },
  { country: "Tanzania", flag: "🇹🇿", tip: "Green and blue with a diagonal black stripe - Mount Kilimanjaro country!" },
  { country: "Tunisia", flag: "🇹🇳", tip: "Red with a white circle, red crescent and star - ancient Carthage!" },
  { country: "Algeria", flag: "🇩🇿", tip: "Green and white with a red crescent and star - Africa's biggest country!" },
  { country: "Rwanda", flag: "🇷🇼", tip: "Blue, yellow, green with a sun - land of a thousand hills!" },
  { country: "Sierra Leone", flag: "🇸🇱", tip: "Green, white, blue horizontal stripes - Lion Mountain!" },
  { country: "Bolivia", flag: "🇧🇴", tip: "Red, yellow, green horizontal stripes - high in the Andes!" },
  { country: "Dominican Republic", flag: "🇩🇴", tip: "Blue and red with a white cross and coat of arms!" },
  { country: "French Polynesia", flag: "🇵🇫", tip: "Red and white with an outrigger canoe - Tahiti paradise!" },
  { country: "Samoa", flag: "🇼🇸", tip: "Red with a blue corner and white stars - Pacific island!" },
  { country: "Tonga", flag: "🇹🇴", tip: "Red with a white corner and red cross - Pacific kingdom!" },
  { country: "Panama", flag: "🇵🇦", tip: "White with red and blue squares and stars - the canal country!" },
  { country: "Bahamas", flag: "🇧🇸", tip: "Aqua and gold with a black triangle - Caribbean paradise!" },
  { country: "Hong Kong", flag: "🇭🇰", tip: "Red with a white bauhinia flower - China's special region!" },
  { country: "Afghanistan", flag: "🇦🇫", tip: "Black, red, green with a mosque emblem - the colors have deep national meaning!" },
  { country: "Albania", flag: "🇦🇱", tip: "Red with a black two-headed eagle - the eagle looks in two directions!" },
  { country: "Andorra", flag: "🇦🇩", tip: "Blue, yellow, red vertical with a coat of arms - a tiny mountain country!" },
  { country: "Angola", flag: "🇦🇴", tip: "Red and black with a yellow machete and star - like a half cogwheel!" },
  { country: "Armenia", flag: "🇦🇲", tip: "Red, blue, orange horizontal stripes - orange for hard-working Armenians!" },
  { country: "Azerbaijan", flag: "🇦🇿", tip: "Blue, red, green with a white crescent and star - blue for the Caspian Sea!" },
  { country: "Bahrain", flag: "🇧🇭", tip: "Red with a white serrated edge - the zigzag has five points!" },
  { country: "Barbados", flag: "🇧🇧", tip: "Blue, yellow, blue with a black trident - it's the Trident of Neptune!" },
  { country: "Belarus", flag: "🇧🇾", tip: "Red and green with a red-and-white pattern strip - traditional embroidery design!" },
  { country: "Belize", flag: "🇧🇿", tip: "Blue with red stripes and a coat of arms - the coat has two woodcutters!" },
  { country: "Benin", flag: "🇧🇯", tip: "Green on the left, yellow and red horizontal - simple African colors!" },
  { country: "Bhutan", flag: "🇧🇹", tip: "Orange and red split diagonally with a white dragon - the Dragon Kingdom!" },
  { country: "Bosnia", flag: "🇧🇦", tip: "Blue with a yellow triangle and white stars - shaped like the country on a map!" },
  { country: "Botswana", flag: "🇧🇼", tip: "Blue, white, black, white, blue horizontal - the black and white is the zebra!" },
  { country: "Brunei", flag: "🇧🇳", tip: "Yellow with black and white diagonal stripes and a royal emblem - a sultanate flag!" },
  { country: "Burkina Faso", flag: "🇧🇫", tip: "Red and green with a yellow star in the middle - land of honest people!" },
  { country: "Burundi", flag: "🇧🇮", tip: "Red, white, green with a white circle and three red stars - each star represents ethnic groups!" },
  { country: "Cambodia", flag: "🇰🇭", tip: "Blue, red, blue with Angkor Wat temple in white - the famous ancient temple!" },
  { country: "Cameroon", flag: "🇨🇲", tip: "Green, red, yellow vertical with a yellow star - Pan-African colors!" },
  { country: "Cape Verde", flag: "🇨🇻", tip: "Blue with a red stripe and ten yellow stars in a circle - ten islands!" },
  { country: "Central African Republic", flag: "🇨🇫", tip: "Four horizontal bands crossed by a red vertical stripe and yellow star!" },
  { country: "Chad", flag: "🇹🇩", tip: "Blue, yellow, red vertical - almost identical to Romania's flag!" },
  { country: "Comoros", flag: "🇰🇲", tip: "Green triangle with a white crescent and four white stars - four islands!" },
  { country: "Congo", flag: "🇨🇬", tip: "Green, yellow, red diagonal - Pan-African colors with a diagonal!" },
  { country: "Ivory Coast", flag: "🇨🇮", tip: "Orange, white, green vertical - France's flag reversed!" },
  { country: "Cyprus", flag: "🇨🇾", tip: "White with a copper-colored island map and two olive branches - copper country!" },
  { country: "Djibouti", flag: "🇩🇯", tip: "Blue and green with a white triangle and red star - colors of the land!" },
  { country: "Dominica", flag: "🇩🇲", tip: "Green with a Sisserou parrot in the center - the rare purple parrot!" },
  { country: "East Timor", flag: "🇹🇱", tip: "Red, black, yellow triangles with a white star - Southeast Asia's newest country!" },
  { country: "El Salvador", flag: "🇸🇻", tip: "Blue, white, blue horizontal with a coat of arms - the blue is for the ocean!" },
  { country: "Eritrea", flag: "🇪🇷", tip: "Red, green, blue with a golden olive wreath - the olive wreath means peace!" },
  { country: "Eswatini", flag: "🇸🇿", tip: "Blue, red, yellow with a traditional Swazi shield and spears!" },
  { country: "Gabon", flag: "🇬🇦", tip: "Green, yellow, blue horizontal - green for forests, blue for sea!" },
  { country: "Gambia", flag: "🇬🇲", tip: "Red, blue, green horizontal with thin white stripes - the Gambia River runs through it!" },
  { country: "Georgia", flag: "🇬🇪", tip: "White with a big red cross and four smaller red crosses - the Five Cross Flag!" },
  { country: "Guatemala", flag: "🇬🇹", tip: "Blue, white, blue vertical with a quetzal bird - the quetzal is priceless!" },
  { country: "Guinea", flag: "🇬🇳", tip: "Red, yellow, green vertical - Pan-African colors, France's flag reversed!" },
  { country: "Guinea-Bissau", flag: "🇬🇼", tip: "Red, yellow, green with a black star - similar to Ghana's flag!" },
  { country: "Guyana", flag: "🇬🇾", tip: "Green with a red and white arrowhead and yellow triangle - the Golden Arrowhead!" },
  { country: "Haiti", flag: "🇭🇹", tip: "Blue and red horizontal with a coat of arms - the coat has a palm tree!" },
  { country: "Honduras", flag: "🇭🇳", tip: "Blue, white, blue with five blue stars - each star is for a Central American country!" },
  { country: "Iran", flag: "🇮🇷", tip: "Green, white, red with a red emblem and Arabic writing - Allahu Akbar inscribed 22 times!" },
  { country: "Iraq", flag: "🇮🇶", tip: "Red, white, black with green Arabic writing - 'Allahu Akbar' in the middle!" },
  { country: "Jordan", flag: "🇯🇴", tip: "Black, white, green horizontal with a red triangle and white star - seven-pointed star!" },
  { country: "Kazakhstan", flag: "🇰🇿", tip: "Light blue with a yellow sun and eagle - the steppe eagle and sun!" },
  { country: "Kiribati", flag: "🇰🇮", tip: "Red with yellow rays of a rising sun over ocean waves and a frigatebird!" },
  { country: "Kuwait", flag: "🇰🇼", tip: "Green, white, red horizontal with a black trapezoid - the black is for oil!" },
  { country: "Kyrgyzstan", flag: "🇰🇬", tip: "Red with a yellow sun symbol - the sun represents a yurt opening from above!" },
  { country: "Laos", flag: "🇱🇦", tip: "Red, blue, red horizontal with a white circle - the circle is the full moon!" },
  { country: "Latvia", flag: "🇱🇻", tip: "Dark red, white, dark red horizontal - one of the oldest flag designs!" },
  { country: "Lebanon", flag: "🇱🇧", tip: "Red, white, red with a green cedar tree - the cedar is the symbol of Lebanon!" },
  { country: "Lesotho", flag: "🇱🇸", tip: "Blue, white, green with a black Basotho hat - the Mokorotlo hat!" },
  { country: "Liberia", flag: "🇱🇷", tip: "Red and white stripes with a blue corner and white star - like the US flag but one star!" },
  { country: "Libya", flag: "🇱🇾", tip: "Red, black, green with a white crescent and star - Pan-Arab colors!" },
  { country: "Liechtenstein", flag: "🇱🇮", tip: "Blue and red horizontal with a gold crown - added the crown after confusion with Haiti!" },
  { country: "Lithuania", flag: "🇱🇹", tip: "Yellow, green, red horizontal - yellow for amber, green for forests, red for bravery!" },
  { country: "Luxembourg", flag: "🇱🇺", tip: "Red, white, light blue horizontal - similar to Netherlands but with a lighter blue!" },
  { country: "Madagascar", flag: "🇲🇬", tip: "White and red vertical, then green on the left - home of the lemur!" },
  { country: "Malawi", flag: "🇲🇼", tip: "Black, red, green horizontal with a red rising sun - the sun has 31 rays!" },
  { country: "Maldives", flag: "🇲🇻", tip: "Red with a green rectangle and white crescent - the crescent means Islam!" },
  { country: "Mali", flag: "🇲🇱", tip: "Green, yellow, red vertical - Pan-African colors without any symbol!" },
  { country: "Malta", flag: "🇲🇹", tip: "White and red vertical with the George Cross medal in the corner!" },
  { country: "Marshall Islands", flag: "🇲🇭", tip: "Blue with an orange and white diagonal stripe and a white star - 24-point star!" },
  { country: "Mauritania", flag: "🇲🇷", tip: "Dark green with a yellow crescent, star, and two red stripes - Islamic green!" },
  { country: "Mauritius", flag: "🇲🇺", tip: "Red, blue, yellow, green horizontal - four stripes for four communities!" },
  { country: "Micronesia", flag: "🇫🇲", tip: "Blue with four white stars - each star is one of the main island groups!" },
  { country: "Moldova", flag: "🇲🇩", tip: "Blue, yellow, red with a coat of arms featuring an eagle and ox head!" },
  { country: "Monaco", flag: "🇲🇨", tip: "Red on top, white on bottom - looks just like Indonesia but much smaller country!" },
  { country: "Mongolia", flag: "🇲🇳", tip: "Red, blue, red with a golden Soyombo symbol - the symbol is very detailed!" },
  { country: "Montenegro", flag: "🇲🇪", tip: "Red with a golden border and a coat of arms with a double-headed eagle!" },
  { country: "Mozambique", flag: "🇲🇿", tip: "Green, black, yellow with a red triangle and a book, hoe and gun!" },
  { country: "Myanmar", flag: "🇲🇲", tip: "Yellow, green, red with a white star - three bands of gold, green and red!" },
  { country: "Namibia", flag: "🇳🇦", tip: "Blue, red, green diagonal stripes with a yellow sun - sunshine country!" },
  { country: "Nauru", flag: "🇳🇷", tip: "Blue with a yellow stripe and white star - the star's position shows where Nauru is!" },
  { country: "Nicaragua", flag: "🇳🇮", tip: "Blue, white, blue with a triangle, volcano and rainbow in the center!" },
  { country: "Niger", flag: "🇳🇪", tip: "Orange, white, green horizontal with an orange circle - the circle is the sun!" },
  { country: "North Korea", flag: "🇰🇵", tip: "Blue, red, blue horizontal with a red star on a white circle!" },
  { country: "North Macedonia", flag: "🇲🇰", tip: "Red with a yellow sun and eight yellow rays extending to the edges!" },
  { country: "Oman", flag: "🇴🇲", tip: "White, red, green horizontal with a red stripe and Omani emblem in corner!" },
  { country: "Palau", flag: "🇵🇼", tip: "Blue with a yellow circle off-center - the moon is the guide for fishermen!" },
  { country: "Papua New Guinea", flag: "🇵🇬", tip: "Red and black diagonal with a Bird of Paradise and Southern Cross stars!" },
  { country: "Paraguay", flag: "🇵🇾", tip: "Red, white, blue horizontal with different emblems on front and back sides!" },
  { country: "Senegal", flag: "🇸🇳", tip: "Green, yellow, red vertical with a green star - Pan-African colors with a star!" },
  { country: "Serbia", flag: "🇷🇸", tip: "Red, blue, white horizontal with a coat of arms and a two-headed eagle!" },
  { country: "Seychelles", flag: "🇸🇨", tip: "Five colored rays from the bottom-left corner - like a rising sun with five colors!" },
  { country: "Slovakia", flag: "🇸🇰", tip: "White, blue, red horizontal with a double cross on a mountain shield!" },
  { country: "Slovenia", flag: "🇸🇮", tip: "White, blue, red horizontal with the coat of arms featuring Mount Triglav!" },
  { country: "Solomon Islands", flag: "🇸🇧", tip: "Blue and green diagonal with yellow stripe and five white stars!" },
  { country: "Somalia", flag: "🇸🇴", tip: "Blue with a white five-pointed star - each point represents Somali regions!" },
  { country: "South Sudan", flag: "🇸🇸", tip: "Black, red, green horizontal with blue triangle and gold star - newest country!" },
  { country: "Sudan", flag: "🇸🇩", tip: "Red, white, black with a green triangle - Pan-Arab colors!" },
  { country: "Suriname", flag: "🇸🇷", tip: "Green, white, red, white, green horizontal with a yellow star!" },
  { country: "Syria", flag: "🇸🇾", tip: "Red, white, black with two green stars - Pan-Arab colors!" },
  { country: "Tajikistan", flag: "🇹🇯", tip: "Red, white, green horizontal with a golden crown and seven stars!" },
  { country: "Togo", flag: "🇹🇬", tip: "Green and red stripes with a white star on a red square - five stripes!" },
  { country: "Trinidad and Tobago", flag: "🇹🇹", tip: "Red with a black diagonal stripe bordered by white - fire and water!" },
  { country: "Turkmenistan", flag: "🇹🇲", tip: "Green with a red stripe covered in five carpet patterns and a crescent!" },
  { country: "Tuvalu", flag: "🇹🇻", tip: "Blue with the Union Jack and nine yellow stars matching its nine islands!" },
  { country: "Uganda", flag: "🇺🇬", tip: "Black, yellow, red stripes with a grey crowned crane in the center!" },
  { country: "Uruguay", flag: "🇺🇾", tip: "White with blue stripes and a sun face in the corner - the Sun of May!" },
  { country: "Uzbekistan", flag: "🇺🇿", tip: "Blue, white, green with a white crescent and twelve stars!" },
  { country: "Vanuatu", flag: "🇻🇺", tip: "Red, green, black with a boar's tusk and fern fronds - island spirit!" },
  { country: "Vatican City", flag: "🇻🇦", tip: "Yellow and white vertical with the papal keys and tiara - the Pope's flag!" },
  { country: "Yemen", flag: "🇾🇪", tip: "Red, white, black horizontal - Pan-Arab colors, very simple design!" },
  { country: "Zambia", flag: "🇿🇲", tip: "Green with orange, black, red stripes and an eagle in the corner!" },
  { country: "Zimbabwe", flag: "🇿🇼", tip: "Green, yellow, red, black, white stripes with a Zimbabwe bird and red star!" },
  { country: "Antigua and Barbuda", flag: "🇦🇬", tip: "Black with red, blue, white, and a yellow sun rising - Sunshine country!" },
  { country: "Saint Lucia", flag: "🇱🇨", tip: "Blue with a black and white triangle on yellow - island of the Pitons!" },
  { country: "Grenada", flag: "🇬🇩", tip: "Red and green with a yellow border, stars, and a nutmeg inside!" },
  { country: "Kosovo", flag: "🇽🇰", tip: "Blue with a gold map of Kosovo and six white stars - Europe's newest country!" },
];

const GAME_MOTIVATIONAL_TEXT: Record<string, string> = {
  memory_match: "Match cities with their famous landmarks!",
  flag_quiz: "Test your knowledge of world flags!",
  globe_spinner: "Spin the globe and discover new places!",
  map_me: "Find which continent each city belongs to!",
  capital_dash: "Race to name the capitals!",
  city_vibe: "Match cities with their personality badge!",
};

export default function MiniGamesPage() {
  const [, navigate] = useLocation();
  const miniGamesReturnTo = new URLSearchParams(window.location.search).get('from');
  const queryClient = useQueryClient();
  const { activeExplorer } = useExplorer();
  const { awardPassportStar, addStars, recordMasteryAttempt } = useUser();
  const [selectedGame, setSelectedGame] = useState<typeof MINI_GAMES[number] | null>(null);
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [showReadyConfirm, setShowReadyConfirm] = useState(false);
  const [pendingGameId, setPendingGameId] = useState<string | null>(null);
  const [masteryCity, setMasteryCity] = useState<{ id: string; country: string; city: string } | null>(null);
  const [returnTo, setReturnTo] = useState<string | null>(null);
  const [showUpgradeGate, setShowUpgradeGate] = useState(false);
  const { isPremiumGame, canPlayGame, recordMiniGame, isPaidUser } = useFreeLimits();
  
  const visitorId = typeof window !== 'undefined' ? localStorage.getItem('geoquest_visitor_id') : null;
  const playerId = activeExplorer?.id || null;
  
  const MINIGAMES_CACHE_KEY = `geoquest_minigames_cache_${playerId || visitorId}`;
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gameParam = params.get('game');
    const masteryCityId = params.get('masteryCity');
    
    if (masteryCityId) {
      const cityCard = ALL_GUESS_AND_GO_CITIES.find(c => c.id === masteryCityId);
      if (cityCard) {
        setMasteryCity({ id: cityCard.id, country: cityCard.country, city: cityCard.city });
      }
    }
    const returnToParam = params.get('returnTo');
    if (returnToParam) setReturnTo(returnToParam);
    
    if (gameParam) {
      const gameIdMap: Record<string, string> = {
        'memory-match': 'memory_match',
        'flag-quiz': 'flag_quiz',
        'capital-dash': 'capital_dash',
        'globe-spinner': 'globe_spinner',
      };
      const gameId = gameIdMap[gameParam] || gameParam.replace(/-/g, '_');
      const game = MINI_GAMES.find(g => g.id === gameId);
      if (game) {
        setSelectedGame(game);
        setPendingGameId(gameId);
      }
    }
  }, []);

  const { data: miniGamesData, isLoading } = useQuery<{ games: UserMiniGame[]; availableStickers: number }>({
    queryKey: ['/api/mini-games/user', visitorId, playerId],
    queryFn: async () => {
      if (!navigator.onLine) {
        const cached = localStorage.getItem(MINIGAMES_CACHE_KEY);
        if (cached) {
          try {
            return JSON.parse(cached);
          } catch (e) {
            console.error('Failed to parse cached mini-games:', e);
          }
        }
        throw new Error('Offline - no cached mini-games');
      }
      
      const url = playerId 
        ? `/api/mini-games/user/${visitorId}?playerId=${playerId}`
        : `/api/mini-games/user/${visitorId}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch mini-games');
      const data = await res.json();
      
      try {
        localStorage.setItem(MINIGAMES_CACHE_KEY, JSON.stringify(data));
      } catch (e) {
        console.error('Failed to cache mini-games:', e);
      }
      
      return data;
    },
    enabled: !!visitorId,
    retry: (failureCount, error) => {
      if (!navigator.onLine) return false;
      return failureCount < 3;
    },
  });


  const updateScoreMutation = useMutation({
    mutationFn: async ({ gameId, score }: { gameId: string; score: number }) => {
      const res = await fetch('/api/mini-games/update-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId, gameId, score, playerId }),
      });
      if (!res.ok) throw new Error('Failed to update score');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mini-games/user'] });
    },
  });

  const userGames = miniGamesData?.games || [];
  const availableStickers = miniGamesData?.availableStickers || 0;

  const isGameUnlocked = (gameId: string) => {
    // All mini-games are now free to play
    return true;
  };

  const getGameProgress = (gameId: string) => {
    return userGames.find(g => g.gameId === gameId);
  };
  
  useEffect(() => {
    // MASTERY MODE: Start game immediately without waiting for userGames API
    // Mastery challenges are free to play, no unlock check needed
    // NOTE: Mastery attempt is recorded AFTER game completion (in onMasteryComplete), not at start
    if (pendingGameId && masteryCity && !activeGame) {
        if (pendingGameId === 'globe_spinner') {
          const params = new URLSearchParams();
          params.set('masteryCity', masteryCity.id);
          const continent = CONTINENT_BY_COUNTRY[masteryCity.country] || "Europe";
          params.set('continent', continent);
        if (returnTo) params.set('returnTo', returnTo);
        navigate(`/spin-the-world?${params.toString()}`);
      } else if (pendingGameId === 'map_me') {
        navigate('/map-me');
      } else {
        setActiveGame(pendingGameId);
      }
      setPendingGameId(null);
      return;
    }
    
    // NON-MASTERY MODE: All games are free, start directly
    if (pendingGameId && !activeGame && !masteryCity) {
      if (activeExplorer) {
        setShowReadyConfirm(true);
      } else {
        if (pendingGameId === 'globe_spinner') {
          navigate('/spin-the-world');
        } else if (pendingGameId === 'map_me') {
          navigate('/map-me');
        } else {
          setActiveGame(pendingGameId);
        }
        setPendingGameId(null);
      }
    }
  }, [pendingGameId, userGames, activeGame, activeExplorer, navigate, masteryCity, recordMasteryAttempt]);

  const handleGameClick = (game: typeof MINI_GAMES[number]) => {
    if (isPremiumGame(game.id) && !isPaidUser) {
      setShowUpgradeGate(true);
      return;
    }
    if (!canPlayGame(game.id)) {
      setShowUpgradeGate(true);
      return;
    }
    setSelectedGame(game);
    if (activeExplorer) {
      setPendingGameId(game.id);
      setShowReadyConfirm(true);
    } else {
      if (game.id === 'globe_spinner') {
        navigate(`/spin-the-world?continent=Europe`);
        return;
      }
      if (game.id === 'map_me') {
        navigate('/map-me');
        return;
      }
      setActiveGame(game.id);
    }
  };

  const handleConfirmStart = () => {
    if (!pendingGameId) return;
    setShowReadyConfirm(false);
    if (pendingGameId === 'globe_spinner') {
      const continent = masteryCity?.country ? (CONTINENT_BY_COUNTRY[masteryCity.country] || "Europe") : "Europe";
      const params = new URLSearchParams();
      params.set('continent', continent);
      if (masteryCity?.id) params.set('masteryCity', masteryCity.id);
      if (returnTo) params.set('returnTo', returnTo);
      navigate(`/spin-the-world?${params.toString()}`);
    } else if (pendingGameId === 'map_me') {
      navigate('/map-me');
    } else {
      setActiveGame(pendingGameId);
    }
    setPendingGameId(null);
  };


  const MINI_GAME_XP: Record<string, number> = {
    memory_match: 10,
    flag_quiz: 10,
    globe_spinner: 5,
    map_me: 15,
    city_vibe: 10,
  };

  const handleGameComplete = (score: number) => {
    if (activeGame) {
      updateScoreMutation.mutate({ gameId: activeGame, score });
      recordMiniGame();
      
      const starsToAward = Math.min(3, Math.floor(score / 200));
      if (starsToAward > 0) {
        addStars(starsToAward);
      }

      const xpAmount = MINI_GAME_XP[activeGame];
      if (xpAmount && playerId) {
        fetch(`/api/players/${playerId}/award-xp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: xpAmount, source: "MINI_GAME" }),
        }).catch(() => {});
      }
    }
  };

  const exitGame = () => {
    if (returnTo === "explorer-map") {
      const cityParam = masteryCity?.id ? `?openCity=${masteryCity.id}` : '';
      window.location.href = `/explorer-map${cityParam}`;
      return;
    }
    if (returnTo === "city-hub" && masteryCity?.id) {
      window.location.href = `/city/${masteryCity.id}`;
      return;
    }
    if (miniGamesReturnTo) {
      navigate(miniGamesReturnTo);
      return;
    }
    setActiveGame(null);
    setSelectedGame(null);
  };

  const getGameName = (gameId: string) => {
    return MINI_GAMES.find(g => g.id === gameId)?.name || 'Game';
  };

  if (showReadyConfirm && activeExplorer && pendingGameId) {
    const colors = GAME_COLORS[pendingGameId] || GAME_COLORS.memory_match;
    const gameName = getGameName(pendingGameId);
    const motivationalText = GAME_MOTIVATIONAL_TEXT[pendingGameId] || "Let's have some fun!";
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center border-4 border-purple-300 dark:border-purple-600"
        >
          <div className={cn(
            "w-32 h-32 rounded-full mx-auto mb-6 flex items-center justify-center border-4",
            `bg-gradient-to-br ${colors.bg}`,
            colors.border
          )}>
            <Trophy className="w-16 h-16 text-white" />
          </div>
          <h3 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">
            Ready, {activeExplorer.name}?
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-8 text-lg">
            {motivationalText}
          </p>
          <Button 
            onClick={handleConfirmStart}
            size="lg" 
            className={cn(
              "w-full text-white text-xl py-6 rounded-xl shadow-lg border-b-4 active:border-b-0 active:translate-y-1",
              `bg-gradient-to-r ${colors.bg}`,
              pendingGameId === 'memory_match' && "border-purple-700",
              pendingGameId === 'flag_quiz' && "border-green-700",
              pendingGameId === 'globe_spinner' && "border-blue-700",
              pendingGameId === 'capital_dash' && "border-orange-700"
            )}
            data-testid="button-start-game-confirm"
          >
            Start {gameName}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setShowReadyConfirm(false);
              setPendingGameId(null);
            }}
            className="mt-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            data-testid="button-cancel-confirm"
          >
            Cancel
          </Button>
        </motion.div>
      </div>
    );
  }

  if (activeGame === 'memory_match') {
    return <MemoryMatchGame onComplete={handleGameComplete} onExit={exitGame} highScore={getGameProgress('memory_match')?.highScore || 0} />;
  }

  if (activeGame === 'flag_quiz') {
    return (
      <FlagQuizGame 
        onComplete={handleGameComplete} 
        onExit={exitGame} 
        highScore={getGameProgress('flag_quiz')?.highScore || 0}
        masteryCity={masteryCity}
        returnTo={returnTo}
        onMasteryComplete={(cityId: string) => {
          awardPassportStar(cityId, 3);
        }}
        onMasteryFailed={(cityId: string) => {
          recordMasteryAttempt(cityId, 3);
        }}
      />
    );
  }

  if (activeGame === 'city_vibe') {
    return (
      <CityVibeGame 
        onComplete={handleGameComplete} 
        onExit={exitGame} 
        highScore={getGameProgress('city_vibe')?.highScore || 0}
        masteryCity={masteryCity}
        returnTo={returnTo}
        onMasteryComplete={(cityId: string) => {
          awardPassportStar(cityId, 4);
        }}
        onMasteryFailed={(cityId: string) => {
          recordMasteryAttempt(cityId, 4);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-900 via-purple-900 to-pink-900">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-40 h-40 bg-yellow-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-60 h-60 bg-pink-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(miniGamesReturnTo || "/play-games")}
            className="flex items-center gap-2 text-white/80 hover:text-white hover:bg-white/10"
            data-testid="button-back-home"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-bold">Back to Games</span>
          </Button>

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-500/30 to-orange-500/30 px-4 py-2 rounded-full border border-amber-400/50 backdrop-blur-sm"
          >
            <Star className="w-5 h-5 text-amber-300" />
            <span className="font-bold text-amber-200">{availableStickers} Souvenirs</span>
          </motion.div>
        </div>

        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <span className="text-5xl">🎮</span>
            Treasure Vault
            <span className="text-5xl">🏆</span>
          </h1>
          <p className="text-lg text-purple-200 font-medium">
            Play fun mini-games and learn about the world!
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {MINI_GAMES.filter(game => game.id !== 'capital_dash' && game.id !== 'geo_maze').map((game, index) => {
            const unlocked = isGameUnlocked(game.id);
            const progress = getGameProgress(game.id);
            const colors = GAME_COLORS[game.id] || GAME_COLORS.memory_match;
            const isImplemented = game.id === 'memory_match' || game.id === 'flag_quiz' || game.id === 'globe_spinner' || game.id === 'map_me' || game.id === 'city_vibe';

            return (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (index + 1) * 0.1 }}
                  className={cn(
                    "relative rounded-3xl overflow-hidden cursor-pointer transition-all duration-300",
                    "hover:scale-105 hover:shadow-2xl",
                    !isImplemented && "opacity-50 cursor-not-allowed"
                  )}
                  onClick={() => isImplemented && handleGameClick(game)}
                  data-testid={`game-card-${game.id}`}
                >
                  <div className={cn(
                    "absolute inset-0 bg-gradient-to-br",
                    colors.bg,
                    "opacity-90"
                  )} />
                  
                  <div className="relative p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-white/30">
                        <span className="text-white">{GAME_ICONS[game.id]}</span>
                      </div>
                      
                      {progress && (
                        <div className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full">
                          <Trophy className="w-4 h-4 text-yellow-300" />
                          <span className="text-white font-bold text-sm">{progress.highScore}</span>
                        </div>
                      )}
                    </div>

                    <h3 className="text-2xl font-bold text-white mb-2">{game.name}</h3>
                    <p className="text-white/80 text-sm mb-4">{game.description}</p>

                    {!isImplemented && (
                      <div className="absolute top-2 right-2 bg-yellow-500 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full">
                        Coming Soon
                      </div>
                    )}

                    {isImplemented && !isPaidUser && isPremiumGame(game.id) && (
                      <div className="absolute top-2 right-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1" data-testid={`lock-badge-${game.id}`}>
                        <Lock className="w-3 h-3" />
                        GeoQuest Explorer
                      </div>
                    )}

                    {unlocked && progress && (
                      <div className="flex items-center gap-4 text-white/70 text-sm">
                        <span className="flex items-center gap-1">
                          <Gamepad2 className="w-4 h-4" />
                          Played {progress.timesPlayed}x
                        </span>
                      </div>
                    )}

                    {isImplemented && !isPaidUser && isPremiumGame(game.id) ? (
                      <Button
                        className="w-full bg-purple-600/80 hover:bg-purple-700/80 text-white font-bold"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGameClick(game);
                        }}
                        data-testid={`button-unlock-${game.id}`}
                      >
                        <Lock className="w-4 h-4 mr-2" />
                        Unlock Game
                      </Button>
                    ) : isImplemented ? (
                      <Button
                        className="w-full bg-white/30 hover:bg-white/40 text-white font-bold"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGameClick(game);
                        }}
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Play Now!
                      </Button>
                    ) : null}
                  </div>
                </motion.div>
            );
          })}

          {/* GeoMaze - appears after City Vibe */}
          <motion.div
            key="geo-maze"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="relative rounded-3xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl"
            onClick={() => navigate('/geo-maze')}
            data-testid="game-card-geo-maze"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-500 opacity-90" />
            
            <div className="relative p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-white/30">
                  <span className="text-3xl">🧭</span>
                </div>
              </div>

              <h3 className="text-2xl font-bold text-white mb-2">GeoMaze</h3>
              <p className="text-white/80 text-sm mb-4">Navigate mazes to find the right flag!</p>

              <Button
                className="w-full bg-white/30 hover:bg-white/40 text-white font-bold"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/geo-maze');
                }}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Play Now!
              </Button>
            </div>
          </motion.div>

          </div>

      </div>

      <GeoPassModal
        isOpen={showUpgradeGate}
        onClose={() => setShowUpgradeGate(false)}
      />
    </div>
  );
}

interface MemoryCard {
  id: number;
  type: 'city' | 'landmark';
  value: string;
  matchId: number;
  cityData: typeof CITIES_FOR_GAMES[number];
  isFlipped: boolean;
  isMatched: boolean;
}

interface UnlockedFact {
  city: string;
  landmark: string;
  landmarkIcon: string;
  flag: string;
  funFact: string;
}

// Easy mode uses 42 cities from LOCATION_CARDS, Hard mode uses all 101
const EASY_MODE_CITIES = LOCATION_CARDS.filter(card => card.type === "Location").map(card => ({
  city: card.city,
  country: card.country,
  flag: COUNTRY_FLAG_MAP[card.country] || "🏳️",
  landmark: CITY_LANDMARKS[card.city] || `${card.city} Landmark`,
  landmarkIcon: card.landmarkIcon || "🏛️",
  funFact: card.didYouKnow || `${card.city} is a wonderful city in ${card.country}!`,
}));

type MemoryDifficulty = "EASY" | "HARD" | null;

function MemoryMatchGame({ onComplete, onExit, highScore }: { onComplete: (score: number) => void; onExit: () => void; highScore: number }) {
  const [difficulty, setDifficulty] = useState<MemoryDifficulty>(null);
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [matches, setMatches] = useState(0);
  const [moves, setMoves] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [unlockedFacts, setUnlockedFacts] = useState<UnlockedFact[]>([]);
  const [showFactsReview, setShowFactsReview] = useState(false);
  const [latestFact, setLatestFact] = useState<UnlockedFact | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const speakFact = (fact: UnlockedFact) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const text = `${fact.city}, ${fact.landmark}. ${fact.funFact}`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const speakAllFacts = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const allText = unlockedFacts.map(f => `${f.city}, ${f.landmark}. ${f.funFact}`).join(' Next city: ');
      const utterance = new SpeechSynthesisUtterance(allText);
      utterance.rate = 0.9;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const handleExit = () => {
    stopSpeaking();
    if (unlockedFacts.length > 0 && !gameOver) {
      setShowExitConfirm(true);
    } else {
      onExit();
    }
  };

  const confirmExit = (viewFacts: boolean) => {
    setShowExitConfirm(false);
    if (viewFacts) {
      setShowFactsReview(true);
    } else {
      onExit();
    }
  };

  const initializeGame = useCallback((mode: MemoryDifficulty) => {
    if (!mode) return;
    
    const cityPool = mode === "EASY" ? EASY_MODE_CITIES : CITIES_FOR_GAMES;
    const selectedCities = [...cityPool].sort(() => Math.random() - 0.5).slice(0, 6);
    const newCards: MemoryCard[] = [];
    
    selectedCities.forEach((city, index) => {
      newCards.push({
        id: index * 2,
        type: 'city',
        value: city.city,
        matchId: index,
        cityData: city,
        isFlipped: false,
        isMatched: false,
      });
      newCards.push({
        id: index * 2 + 1,
        type: 'landmark',
        value: city.landmark,
        matchId: index,
        cityData: city,
        isFlipped: false,
        isMatched: false,
      });
    });
    
    setCards(newCards.sort(() => Math.random() - 0.5));
    setFlippedCards([]);
    setMatches(0);
    setMoves(0);
    setGameOver(false);
    setTimer(0);
    setIsActive(true);
    setUnlockedFacts([]);
    setShowFactsReview(false);
    setLatestFact(null);
  }, []);

  // Start game when difficulty is selected
  useEffect(() => {
    if (difficulty) {
      initializeGame(difficulty);
    }
  }, [difficulty, initializeGame]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && !gameOver) {
      interval = setInterval(() => {
        setTimer(t => t + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, gameOver]);

  useEffect(() => {
    if (flippedCards.length === 2) {
      const [first, second] = flippedCards;
      const firstCard = cards.find(c => c.id === first);
      const secondCard = cards.find(c => c.id === second);
      
      if (firstCard && secondCard && firstCard.matchId === secondCard.matchId) {
        const cityData = firstCard.cityData;
        const newFact: UnlockedFact = {
          city: cityData.city,
          landmark: cityData.landmark,
          landmarkIcon: cityData.landmarkIcon,
          flag: cityData.flag,
          funFact: cityData.funFact,
        };
        
        setTimeout(() => {
          setCards(prev => prev.map(c => 
            c.matchId === firstCard.matchId ? { ...c, isMatched: true } : c
          ));
          setMatches(m => m + 1);
          setUnlockedFacts(prev => [...prev, newFact]);
          setLatestFact(newFact);
          setTimeout(() => setLatestFact(null), 2000);
          setFlippedCards([]);
        }, 500);
      } else {
        setTimeout(() => {
          setCards(prev => prev.map(c => 
            flippedCards.includes(c.id) ? { ...c, isFlipped: false } : c
          ));
          setFlippedCards([]);
        }, 1000);
      }
      setMoves(m => m + 1);
    }
  }, [flippedCards, cards]);

  useEffect(() => {
    if (matches === 6 && !gameOver) {
      setGameOver(true);
      setIsActive(false);
      const score = Math.max(1000 - (moves * 10) - (timer * 2), 100);
      onComplete(score);
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 }
      });
    }
  }, [matches, gameOver, moves, timer, onComplete]);

  const handleCardClick = (cardId: number) => {
    if (flippedCards.length >= 2) return;
    const card = cards.find(c => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched) return;
    
    setCards(prev => prev.map(c => 
      c.id === cardId ? { ...c, isFlipped: true } : c
    ));
    setFlippedCards(prev => [...prev, cardId]);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Show difficulty selection first
  if (!difficulty) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 via-indigo-900 to-blue-900 p-4 flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">🧠 Memory Match</h1>
            <p className="text-purple-200">Match cities with their famous landmarks!</p>
          </div>
          
          <div className="space-y-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setDifficulty("EASY")}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl p-6 text-left shadow-lg border-b-4 border-green-700 hover:border-b-2 transition-all"
              data-testid="button-memory-easy"
            >
              <div className="flex items-center gap-4">
                <span className="text-4xl">🌍</span>
                <div>
                  <h4 className="text-xl font-bold">Easy Mode</h4>
                  <p className="text-green-100 text-sm">42 popular cities</p>
                  <p className="text-green-200 text-xs mt-1">Perfect for beginners!</p>
                </div>
              </div>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setDifficulty("HARD")}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl p-6 text-left shadow-lg border-b-4 border-purple-700 hover:border-b-2 transition-all"
              data-testid="button-memory-hard"
            >
              <div className="flex items-center gap-4">
                <span className="text-4xl">🏆</span>
                <div>
                  <h4 className="text-xl font-bold">Hard Mode</h4>
                  <p className="text-purple-100 text-sm">101 cities from around the world</p>
                  <p className="text-purple-200 text-xs mt-1">For geography experts!</p>
                </div>
              </div>
            </motion.button>
          </div>
          
          <div className="mt-6 text-center">
            <Button
              variant="ghost"
              onClick={onExit}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Treasure Vault
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (showFactsReview) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 via-indigo-900 to-blue-900 p-4">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">📚 Facts You Learned!</h1>
            <p className="text-purple-200">Amazing discoveries from your adventure</p>
            <Button
              onClick={isSpeaking ? stopSpeaking : speakAllFacts}
              className={cn(
                "mt-3",
                isSpeaking 
                  ? "bg-red-500 hover:bg-red-600" 
                  : "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              )}
            >
              {isSpeaking ? (
                <>🔇 Stop</>
              ) : (
                <>🔊 Listen to All Facts</>
              )}
            </Button>
          </div>
          
          <div className="space-y-4 mb-6">
            {unlockedFacts.map((fact, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.15 }}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{fact.flag}</span>
                    <div>
                      <h3 className="font-bold text-white">{fact.city}</h3>
                      <p className="text-purple-300 text-sm flex items-center gap-1">
                        <span>{fact.landmarkIcon}</span> {fact.landmark}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => speakFact(fact)}
                    className="text-white/70 hover:text-white hover:bg-white/10"
                  >
                    🔊
                  </Button>
                </div>
                <p className="text-yellow-200 text-sm leading-relaxed">
                  💡 {fact.funFact}
                </p>
              </motion.div>
            ))}
          </div>
          
          <div className="flex gap-3 justify-center">
            <Button onClick={() => { stopSpeaking(); initializeGame(difficulty); }} className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-bold">
              Play Again
            </Button>
            <Button onClick={() => { stopSpeaking(); onExit(); }} variant="outline" className="border-white/30 text-white hover:bg-white/10">
              Treasure Vault
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-indigo-900 to-blue-900 p-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            onClick={handleExit}
            className="text-white/80 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Treasure Vault
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full">
              <Timer className="w-4 h-4 text-blue-300" />
              <span className="text-white font-mono text-sm">{formatTime(timer)}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full">
              <Trophy className="w-4 h-4 text-yellow-300" />
              <span className="text-white font-mono text-sm">{highScore}</span>
            </div>
          </div>
        </div>

        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold text-white mb-2">🧠 Memory Match</h1>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 mb-3 mx-auto max-w-sm">
            <p className="text-yellow-200 font-medium text-sm">
              👆 Match each city with its famous landmark!
            </p>
            <p className="text-purple-200 text-xs mt-1">
              <span className="inline-block w-3 h-3 bg-blue-300 rounded mr-1"></span>Blue = City
              <span className="mx-2">|</span>
              <span className="inline-block w-3 h-3 bg-amber-300 rounded mr-1"></span>Orange = Landmark
            </p>
          </div>
          <div className="flex items-center justify-center gap-6">
            <span className="text-white/80 text-sm">Moves: <span className="font-bold text-white">{moves}</span></span>
            <span className="text-white/80 text-sm">Matches: <span className="font-bold text-green-400">{matches}/6</span></span>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <div className="grid grid-cols-3 gap-2">
              {cards.map(card => (
                <motion.div
                  key={card.id}
                  className={cn(
                    "aspect-square rounded-xl cursor-pointer transition-all duration-300",
                    card.isMatched && "opacity-40 pointer-events-none scale-95"
                  )}
                  onClick={() => handleCardClick(card.id)}
                  whileTap={{ scale: 0.95 }}
                  layout
                >
                  <div className={cn(
                    "w-full h-full rounded-xl flex items-center justify-center text-center p-1",
                    card.isFlipped || card.isMatched
                      ? card.type === 'city' 
                        ? "bg-gradient-to-br from-blue-100 to-blue-200 shadow-lg border-2 border-blue-400" 
                        : "bg-gradient-to-br from-amber-100 to-orange-200 shadow-lg border-2 border-amber-400"
                      : "bg-gradient-to-br from-purple-500 to-indigo-600 border-2 border-purple-300"
                  )}>
                    {card.isFlipped || card.isMatched ? (
                      <div className="flex flex-col items-center">
                        {card.type === 'city' ? (
                          <>
                            <span className="text-lg">{card.cityData.flag}</span>
                            <span className="text-[10px] font-bold text-blue-800 leading-tight">{card.value}</span>
                          </>
                        ) : (
                          <>
                            <span className="text-lg">{card.cityData.landmarkIcon}</span>
                            <span className="text-[10px] font-bold text-amber-800 leading-tight">{card.value}</span>
                          </>
                        )}
                      </div>
                    ) : (
                      <span className="text-xl">❓</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="w-28 shrink-0">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-2 border border-white/10 h-full">
              <p className="text-[10px] text-purple-300 text-center mb-2 font-medium">Facts Unlocked</p>
              <div className="space-y-1">
                {unlockedFacts.map((fact, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white/10 rounded-lg p-1.5 flex items-center gap-1"
                  >
                    <span className="text-sm">{fact.landmarkIcon}</span>
                    <span className="text-[9px] text-white font-medium truncate">{fact.city}</span>
                  </motion.div>
                ))}
                {Array.from({ length: 6 - unlockedFacts.length }).map((_, i) => (
                  <div key={`empty-${i}`} className="bg-white/5 rounded-lg p-1.5 flex items-center justify-center">
                    <span className="text-[9px] text-white/30">???</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {latestFact && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 backdrop-blur-sm rounded-xl p-3 border border-yellow-400/30"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{latestFact.landmarkIcon}</span>
                <span className="font-bold text-white text-sm">{latestFact.city} - {latestFact.landmark}</span>
                <span className="text-green-400 text-xs ml-auto">✓ Matched!</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {showExitConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl p-6 max-w-sm w-full border border-purple-500/50"
            >
              <h3 className="text-xl font-bold text-white mb-2">Wait! You found {unlockedFacts.length} facts!</h3>
              <p className="text-purple-200 mb-4 text-sm">
                Would you like to review the fun facts you unlocked before leaving?
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => confirmExit(true)}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold"
                >
                  📚 Read Facts
                </Button>
                <Button
                  onClick={() => confirmExit(false)}
                  variant="outline"
                  className="flex-1 border-white/30 text-white hover:bg-white/10"
                >
                  Skip Facts
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {gameOver && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-center"
          >
            <h2 className="text-2xl font-bold text-white mb-2">🎉 Great Job!</h2>
            <p className="text-green-100 mb-2 text-sm">
              Completed in {moves} moves and {formatTime(timer)}!
            </p>
            <div className="text-xl font-bold text-yellow-300 mb-2">
              Score: {Math.max(1000 - (moves * 10) - (timer * 2), 100)}
            </div>
            <p className="text-green-100 text-sm mb-4">
              You unlocked {unlockedFacts.length} fun facts about cities!
            </p>
            
            <div className="mb-4">
              <LearningSummary points={getGameLearningPoints("memory-match")} variant="dark" />
            </div>
            
            <div className="flex gap-3 justify-center flex-wrap">
              <Button 
                onClick={() => setShowFactsReview(true)} 
                className="bg-white/20 hover:bg-white/30 text-white font-bold"
              >
                📚 Read Facts
              </Button>
              <Button onClick={() => initializeGame(difficulty)} className="bg-white/20 hover:bg-white/30 text-white">
                Play Again
              </Button>
              <Button onClick={onExit} variant="outline" className="border-white/30 text-white hover:bg-white/10">
                Treasure Vault
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

interface FlagQuizGameProps {
  onComplete: (score: number) => void;
  onExit: () => void;
  highScore: number;
  masteryCity?: { id: string; country: string; city: string } | null;
  onMasteryComplete?: (cityId: string) => void;
  returnTo?: string | null;
  onMasteryFailed?: (cityId: string) => void;
}

function FlagQuizGame({ onComplete, onExit, highScore, masteryCity, onMasteryComplete, onMasteryFailed, returnTo }: FlagQuizGameProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [masteryAttempts, setMasteryAttempts] = useState(0);
  const [masteryFailed, setMasteryFailed] = useState(false);
  const [masterySuccess, setMasterySuccess] = useState(false);
  const [questions, setQuestions] = useState<Array<{
    correctFlag: string;
    country: string;
    flagOptions: string[];
    tip: string;
  }>>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [finalTime, setFinalTime] = useState(0);
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isMasteryMode = !!masteryCity;

  const initializeGame = useCallback(() => {
    if (isMasteryMode && masteryCity) {
      const countryData = FLAG_QUIZ_COUNTRIES.find(c => c.country === masteryCity.country);
      if (countryData) {
        const wrongFlags = FLAG_QUIZ_COUNTRIES
          .filter(c => c.country !== masteryCity.country)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3)
          .map(c => c.flag);
        
        const flagOptions = [countryData.flag, ...wrongFlags].sort(() => Math.random() - 0.5);
        
        setQuestions([{
          correctFlag: countryData.flag,
          country: masteryCity.country,
          flagOptions,
          tip: countryData.tip,
        }]);
      } else {
        const fallback = FLAG_QUIZ_COUNTRIES[0];
        const wrongFlags = FLAG_QUIZ_COUNTRIES.slice(1, 4).map(c => c.flag);
        setQuestions([{
          correctFlag: fallback.flag,
          country: fallback.country,
          flagOptions: [fallback.flag, ...wrongFlags].sort(() => Math.random() - 0.5),
          tip: fallback.tip,
        }]);
      }
      setMasteryAttempts(0);
      setMasteryFailed(false);
      setMasterySuccess(false);
    } else {
      const shuffled = [...FLAG_QUIZ_COUNTRIES].sort(() => Math.random() - 0.5);
      const quizQuestions = shuffled.slice(0, 10).map(correctCountry => {
        const wrongFlags = FLAG_QUIZ_COUNTRIES
          .filter(c => c.country !== correctCountry.country)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3)
          .map(c => c.flag);
        
        const flagOptions = [correctCountry.flag, ...wrongFlags].sort(() => Math.random() - 0.5);
        
        return {
          correctFlag: correctCountry.flag,
          country: correctCountry.country,
          flagOptions,
          tip: correctCountry.tip,
        };
      });
      
      setQuestions(quizQuestions);
    }
    setCurrentQuestion(0);
    setScore(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setGameOver(false);
    setElapsedSeconds(0);
    setFinalTime(0);
    startTimeRef.current = Date.now();
  }, [isMasteryMode, masteryCity]);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  useEffect(() => {
    if (gameOver) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameOver]);

  const handleAnswer = (selectedFlag: string) => {
    if (showResult) return;
    
    setSelectedAnswer(selectedFlag);
    setShowResult(true);
    
    const isCorrect = selectedFlag === questions[currentQuestion].correctFlag;
    
    if (isMasteryMode) {
      if (isCorrect) {
        setMasterySuccess(true);
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        if (onMasteryComplete && masteryCity) {
          onMasteryComplete(masteryCity.id);
        }
      } else {
        const newAttempts = masteryAttempts + 1;
        setMasteryAttempts(newAttempts);
        if (newAttempts >= 2) {
          setMasteryFailed(true);
          // Record the failed attempt for daily limit tracking
          if (onMasteryFailed && masteryCity) {
            onMasteryFailed(masteryCity.id);
          }
        }
      }
    } else {
      if (isCorrect) {
        setScore(s => s + 100);
      }
    }
  };

  const handleMasteryRetry = () => {
    setSelectedAnswer(null);
    setShowResult(false);
  };

  const goToNextQuestion = (wasCorrect: boolean) => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(q => q + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      const finalScore = score + (wasCorrect ? 100 : 0);
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setFinalTime(elapsed);
      setGameOver(true);
      onComplete(finalScore);
      if (finalScore >= 600) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const currentQ = questions[currentQuestion];

  if (!currentQ) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 via-emerald-900 to-teal-900 p-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={onExit}
            className="text-white/80 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            {returnTo === "explorer-map" ? "🗺️ Explorer Map" : "Treasure Vault"}
          </Button>
          <div className="flex items-center gap-2">
            {!isMasteryMode && (
              <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full">
                <Timer className="w-4 h-4 text-cyan-300" />
                <span className="text-white font-mono text-sm">{formatTime(elapsedSeconds)}</span>
              </div>
            )}
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full">
              <Star className="w-4 h-4 text-yellow-300" />
              <span className="text-white font-mono">{score}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full">
              <Trophy className="w-4 h-4 text-yellow-300" />
              <span className="text-white font-mono">{highScore}</span>
            </div>
          </div>
        </div>

        {isMasteryMode && masterySuccess ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-center"
          >
            <div className="text-6xl mb-4">⭐</div>
            <h2 className="text-3xl font-bold text-white mb-2">Star Earned!</h2>
            <p className="text-white/90 mb-4">
              You correctly identified {masteryCity?.country}'s flag! {currentQ.correctFlag}
            </p>
            <p className="text-yellow-200 text-sm mb-6">
              Want to continue mastering {masteryCity?.city}?
            </p>
            <div className="flex flex-col gap-3">
              {returnTo === "explorer-map" ? (
                <Button
                  onClick={() => window.location.href = `/explorer-map${masteryCity?.id ? `?openCity=${masteryCity.id}` : ''}`}
                  className="w-full bg-cyan-500/80 hover:bg-cyan-500 text-white font-bold"
                >
                  🗺️ Return to Explorer Map
                </Button>
              ) : returnTo === "city-hub" && masteryCity?.id ? (
                <Button
                  onClick={() => window.location.href = `/city/${masteryCity.id}`}
                  className="w-full bg-white/20 hover:bg-white/30 text-white font-bold"
                >
                  🏙️ Back to City
                </Button>
              ) : (
                <Button
                  onClick={() => window.location.href = `/?openPassport=true&openCity=${masteryCity?.id}`}
                  className="w-full bg-white/20 hover:bg-white/30 text-white font-bold"
                >
                  🛂 Open Passport
                </Button>
              )}
              <Button
                onClick={() => window.location.href = "/"}
                variant="outline"
                className="w-full border-white/30 text-white hover:bg-white/10"
              >
                🏠 Home
              </Button>
            </div>
          </motion.div>
        ) : isMasteryMode && masteryFailed ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl p-6 text-center"
          >
            <div className="text-6xl mb-4">💡</div>
            <h2 className="text-2xl font-bold text-white mb-2">Not quite!</h2>
            <p className="text-white/90 mb-4">
              The flag of {currentQ.country} is {currentQ.correctFlag}.
            </p>
            <div className="bg-white/20 rounded-xl p-4 mb-4 text-left">
              <p className="text-amber-200 font-bold text-sm mb-1">💡 Remember:</p>
              <p className="text-white text-sm leading-relaxed">{currentQ.tip}</p>
            </div>
            <p className="text-yellow-200 text-sm mb-6">
              Now you know the answer — try again!
            </p>
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => {
                  setMasteryAttempts(0);
                  setMasteryFailed(false);
                  setMasterySuccess(false);
                  setSelectedAnswer(null);
                  setShowResult(false);
                  initializeGame();
                }}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold ring-2 ring-yellow-300"
              >
                🔄 Try Again
              </Button>
              <Button
                onClick={() => window.location.href = "/"}
                variant="outline"
                className="w-full border-white/30 text-white hover:bg-white/10"
              >
                🏠 Home
              </Button>
            </div>
          </motion.div>
        ) : !gameOver ? (
          <>
            <div className="text-center mb-6">
              {isMasteryMode ? (
                <>
                  <h1 className="text-3xl font-bold text-white mb-2">🏁 Flag Challenge</h1>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 mb-4 mx-auto max-w-sm">
                    <p className="text-yellow-200 font-medium text-sm">
                      🌟 Passport Mastery for {masteryCity?.city}
                    </p>
                    <p className="text-green-200 text-sm mt-1">
                      Find the flag of {masteryCity?.country}!
                    </p>
                  </div>
                  <p className="text-green-200 text-sm">Attempts: {masteryAttempts}/2</p>
                </>
              ) : (
                <>
                  <h1 className="text-3xl font-bold text-white mb-2">🏁 Flag Quiz</h1>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 mb-4 mx-auto max-w-sm">
                    <p className="text-yellow-200 font-medium text-sm">
                      🌍 Find the correct flag!
                    </p>
                    <p className="text-green-200 text-sm mt-1">
                      Tap the flag that belongs to the country shown!
                    </p>
                  </div>
                  <p className="text-green-200 text-sm">Question {currentQuestion + 1} of {questions.length}</p>
                  <div className="w-full bg-white/20 rounded-full h-2 mt-3">
                    <div 
                      className="bg-gradient-to-r from-green-400 to-emerald-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                    />
                  </div>
                </>
              )}
            </div>

            <motion.div
              key={currentQuestion}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 mb-6"
            >
              <p className="text-white/80 text-center mb-2 font-medium">Which flag belongs to:</p>
              <div className="text-3xl font-bold text-center text-white mb-6">{currentQ.country}</div>
              
              <div className="grid grid-cols-2 gap-4">
                {currentQ.flagOptions.map((flagOption, index) => {
                  const isCorrect = flagOption === currentQ.correctFlag;
                  const isSelected = flagOption === selectedAnswer;
                  const showCorrectHighlight = isMasteryMode ? (masterySuccess || masteryFailed) : showResult;
                  
                  return (
                    <Button
                      key={index}
                      onClick={() => handleAnswer(flagOption)}
                      disabled={showResult}
                      className={cn(
                        "py-6 text-5xl transition-all h-auto",
                        showCorrectHighlight && isCorrect && "bg-green-500 hover:bg-green-500 ring-4 ring-green-300",
                        showResult && isSelected && !isCorrect && "bg-red-500 hover:bg-red-500 ring-4 ring-red-300",
                        !showResult && "bg-white/20 hover:bg-white/30 hover:scale-105"
                      )}
                      data-testid={`flag-option-${index}`}
                    >
                      {flagOption}
                    </Button>
                  );
                })}
              </div>

              <AnimatePresence>
                {showResult && !masteryFailed && !isMasteryMode && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -10, height: 0 }}
                    className={`mt-4 rounded-xl p-4 border ${
                      selectedAnswer === currentQ.correctFlag 
                        ? "bg-gradient-to-r from-green-500/30 to-emerald-500/30 border-green-400/50" 
                        : "bg-gradient-to-r from-amber-500/30 to-yellow-500/30 border-amber-400/50"
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <span className="text-2xl">{selectedAnswer === currentQ.correctFlag ? "🎉" : "💡"}</span>
                      <div>
                        <p className={`font-bold text-sm mb-1 ${selectedAnswer === currentQ.correctFlag ? "text-green-200" : "text-amber-200"}`}>
                          {selectedAnswer === currentQ.correctFlag ? "Correct! " : ""}Fun Fact about {currentQ.country} {currentQ.correctFlag}:
                        </p>
                        <p className="text-white text-sm leading-relaxed">{currentQ.tip}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => goToNextQuestion(selectedAnswer === currentQ.correctFlag)}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-3"
                    >
                      {selectedAnswer === currentQ.correctFlag ? "🌟 Great! Next Question" : "✅ Got it! Next Question"}
                    </Button>
                  </motion.div>
                )}
                {showResult && selectedAnswer !== currentQ.correctFlag && !masteryFailed && isMasteryMode && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto', pointerEvents: 'auto' }}
                    exit={{ opacity: 0, y: -10, height: 0, pointerEvents: 'none' }}
                    className="mt-4 bg-gradient-to-r from-amber-500/30 to-yellow-500/30 rounded-xl p-4 border border-amber-400/50"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <span className="text-2xl">🤔</span>
                      <div>
                        <p className="text-amber-200 font-bold text-sm mb-1">Not quite!</p>
                        <p className="text-white text-sm leading-relaxed">Look carefully at the colors and symbols on each flag. You have 1 more try!</p>
                      </div>
                    </div>
                    <Button
                      onClick={handleMasteryRetry}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-3"
                    >
                      🔄 Try Again (1 attempt left)
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "rounded-2xl p-6 text-center",
              score >= 600 
                ? "bg-gradient-to-br from-green-500 to-emerald-600" 
                : "bg-gradient-to-br from-orange-500 to-amber-600"
            )}
          >
            <h2 className="text-3xl font-bold text-white mb-2">
              {score >= 600 ? "🎉 Amazing!" : score >= 400 ? "👍 Good job!" : "Keep practicing!"}
            </h2>
            <p className="text-white/90 mb-4">
              You got {score / 100} out of {questions.length} correct!
            </p>
            <div className="text-4xl font-bold text-yellow-300 mb-3">
              Score: {score}
            </div>
            <div className="flex items-center justify-center gap-2 bg-white/15 rounded-xl px-4 py-2 mb-4 mx-auto w-fit">
              <Timer className="w-4 h-4 text-cyan-300" />
              <span className="text-white font-semibold text-sm">Completed in {formatTime(finalTime)}</span>
            </div>
            
            <div className="mb-4">
              <LearningSummary points={getGameLearningPoints("flag-quiz")} variant="dark" />
            </div>
            
            <div className="flex gap-3 justify-center">
              <Button onClick={initializeGame} className="bg-white/20 hover:bg-white/30 text-white">
                Play Again
              </Button>
              <Button onClick={onExit} variant="outline" className="border-white/30 text-white hover:bg-white/10">
                {returnTo === "explorer-map" ? "🗺️ Explorer Map" : "Treasure Vault"}
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

const BADGE_TYPES = [
  { id: 'wonders', emoji: '🗼', name: 'Wonders Hunter', description: 'Cities with amazing buildings and monuments!' },
  { id: 'time', emoji: '🧭', name: 'Time Traveler', description: 'Cities with ancient history and old places!' },
  { id: 'cultural', emoji: '🎭', name: 'Cultural Voyager', description: 'Cities famous for art, music, and traditions!' },
  { id: 'eco', emoji: '🌿', name: 'Eco Explorer', description: 'Cities with beautiful nature and green spaces!' },
  { id: 'taste', emoji: '🍜', name: 'Taste Trailblazer', description: 'Cities famous for yummy food!' },
  { id: 'thrill', emoji: '🌋', name: 'Thrill Trekker', description: 'Cities with exciting adventures!' },
  { id: 'safari', emoji: '🐾', name: 'Safari Master', description: 'Cities near amazing wildlife!' },
];

interface CityVibeGameProps {
  onComplete: (score: number) => void;
  onExit: () => void;
  highScore: number;
  masteryCity?: { id: string; country: string; city: string } | null;
  onMasteryComplete?: (cityId: string) => void;
  onMasteryFailed?: (cityId: string) => void;
  returnTo?: string | null;
}

function CityVibeGame({ onComplete, onExit, highScore, masteryCity, onMasteryComplete, onMasteryFailed, returnTo }: CityVibeGameProps) {
  const { isPaidUser } = useFreeLimits();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [masteryAttempts, setMasteryAttempts] = useState(0);
  const [masteryFailed, setMasteryFailed] = useState(false);
  const [masterySuccess, setMasterySuccess] = useState(false);
  const [questions, setQuestions] = useState<Array<{
    city: string;
    country: string;
    badge: string;
    imageUrl?: string;
    options: typeof BADGE_TYPES;
  }>>([]);

  const isMasteryMode = !!masteryCity;

  const getBadgeFromString = (badgeStr: string) => {
    if (badgeStr.includes('Wonders')) return BADGE_TYPES[0];
    if (badgeStr.includes('Time')) return BADGE_TYPES[1];
    if (badgeStr.includes('Cultural')) return BADGE_TYPES[2];
    if (badgeStr.includes('Eco')) return BADGE_TYPES[3];
    if (badgeStr.includes('Taste')) return BADGE_TYPES[4];
    if (badgeStr.includes('Thrill')) return BADGE_TYPES[5];
    if (badgeStr.includes('Safari')) return BADGE_TYPES[6];
    return BADGE_TYPES[0];
  };

  const initializeGame = useCallback(() => {
    if (isMasteryMode && masteryCity) {
      const cityCard = ALL_GUESS_AND_GO_CITIES.find(c => c.id === masteryCity.id);
      if (cityCard && cityCard.badge) {
        const correctBadge = getBadgeFromString(cityCard.badge);
        const wrongOptions = BADGE_TYPES
          .filter(b => b.id !== correctBadge.id)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);
        
        const options = [correctBadge, ...wrongOptions].sort(() => Math.random() - 0.5);
        
        setQuestions([{
          city: cityCard.city,
          country: cityCard.country,
          badge: cityCard.badge,
          imageUrl: cityCard.flagUrl,
          options,
        }]);
      }
      setMasteryAttempts(0);
      setMasteryFailed(false);
      setMasterySuccess(false);
    } else {
      const citiesWithBadges = ALL_GUESS_AND_GO_CITIES.filter(c => c.badge);
      const shuffled = [...citiesWithBadges].sort(() => Math.random() - 0.5);
      const quizQuestions = shuffled.slice(0, 10).map(cityCard => {
        const correctBadge = getBadgeFromString(cityCard.badge);
        const wrongOptions = BADGE_TYPES
          .filter(b => b.id !== correctBadge.id)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);
        
        const options = [correctBadge, ...wrongOptions].sort(() => Math.random() - 0.5);
        
        return {
          city: cityCard.city,
          country: cityCard.country,
          badge: cityCard.badge,
          imageUrl: cityCard.flagUrl,
          options,
        };
      });
      
      setQuestions(quizQuestions);
    }
    setCurrentQuestion(0);
    setScore(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setGameOver(false);
  }, [isMasteryMode, masteryCity]);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  const handleAnswer = (badgeId: string) => {
    if (showResult) return;
    
    setSelectedAnswer(badgeId);
    setShowResult(true);
    
    const correctBadge = getBadgeFromString(questions[currentQuestion].badge);
    const isCorrect = badgeId === correctBadge.id;
    
    if (isMasteryMode) {
      if (isCorrect) {
        setMasterySuccess(true);
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        if (onMasteryComplete && masteryCity) {
          onMasteryComplete(masteryCity.id);
        }
      } else {
        const newAttempts = masteryAttempts + 1;
        setMasteryAttempts(newAttempts);
        if (!isPaidUser && newAttempts >= 2) {
          setMasteryFailed(true);
          if (onMasteryFailed && masteryCity) {
            onMasteryFailed(masteryCity.id);
          }
        }
      }
    } else {
      if (isCorrect) {
        setScore(s => s + 100);
      }
    }
  };

  const handleMasteryRetry = () => {
    setSelectedAnswer(null);
    setShowResult(false);
  };

  const goToNextQuestion = (wasCorrect: boolean) => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(q => q + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      const finalScore = score + (wasCorrect ? 100 : 0);
      setGameOver(true);
      onComplete(finalScore);
      if (finalScore >= 600) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    }
  };

  const currentQ = questions[currentQuestion];
  if (!currentQ) return null;

  const correctBadge = getBadgeFromString(currentQ.badge);

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-900 via-rose-900 to-purple-900 p-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={onExit}
            className="text-white/80 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            {returnTo === "explorer-map" ? "🗺️ Explorer Map" : "Treasure Vault"}
          </Button>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full">
              <Star className="w-4 h-4 text-yellow-300" />
              <span className="text-white font-mono">{score}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full">
              <Trophy className="w-4 h-4 text-yellow-300" />
              <span className="text-white font-mono">{highScore}</span>
            </div>
          </div>
        </div>

        {isMasteryMode && masterySuccess ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-center"
          >
            <div className="text-6xl mb-4">⭐</div>
            <h2 className="text-3xl font-bold text-white mb-2">Star Earned!</h2>
            <p className="text-white/90 mb-4">
              You matched {masteryCity?.city}'s vibe perfectly!
            </p>
            <p className="text-yellow-200 text-sm mb-6">
              Want to continue mastering {masteryCity?.city}?
            </p>
            <div className="flex flex-col gap-3">
              {returnTo === "explorer-map" ? (
                <Button
                  onClick={() => window.location.href = `/explorer-map${masteryCity?.id ? `?openCity=${masteryCity.id}` : ''}`}
                  className="w-full bg-cyan-500/80 hover:bg-cyan-500 text-white font-bold"
                >
                  🗺️ Return to Explorer Map
                </Button>
              ) : returnTo === "city-hub" && masteryCity?.id ? (
                <Button
                  onClick={() => window.location.href = `/city/${masteryCity.id}`}
                  className="w-full bg-white/20 hover:bg-white/30 text-white font-bold"
                >
                  🏙️ Back to City
                </Button>
              ) : (
                <Button
                  onClick={() => window.location.href = `/?openPassport=true&openCity=${masteryCity?.id}`}
                  className="w-full bg-white/20 hover:bg-white/30 text-white font-bold"
                >
                  🛂 Open Passport
                </Button>
              )}
              <Button
                onClick={() => window.location.href = "/"}
                variant="outline"
                className="w-full border-white/30 text-white hover:bg-white/10"
              >
                🏠 Home
              </Button>
            </div>
          </motion.div>
        ) : isMasteryMode && masteryFailed ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl p-6 text-center"
          >
            <div className="text-6xl mb-4">💡</div>
            <h2 className="text-2xl font-bold text-white mb-2">Not quite!</h2>
            <p className="text-white/90 mb-4">
              {currentQ.city}'s vibe is {correctBadge.emoji} {correctBadge.name}.
            </p>
            <div className="bg-white/20 rounded-xl p-4 mb-4 text-left">
              <p className="text-amber-200 font-bold text-sm mb-1">💡 Remember:</p>
              <p className="text-white text-sm leading-relaxed">{correctBadge.description}</p>
            </div>
            <p className="text-yellow-200 text-sm mb-6">
              Now you know the answer — try again!
            </p>
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => {
                  setMasteryAttempts(0);
                  setMasteryFailed(false);
                  setMasterySuccess(false);
                  setSelectedAnswer(null);
                  setShowResult(false);
                  initializeGame();
                }}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold ring-2 ring-yellow-300"
              >
                🔄 Try Again
              </Button>
              <Button
                onClick={() => window.location.href = "/"}
                variant="outline"
                className="w-full border-white/30 text-white hover:bg-white/10"
              >
                🏠 Home
              </Button>
            </div>
          </motion.div>
        ) : !gameOver ? (
          <>
            <div className="text-center mb-6">
              {isMasteryMode ? (
                <>
                  <h1 className="text-3xl font-bold text-white mb-2">✨ City Vibe</h1>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 mb-4 mx-auto max-w-sm">
                    <p className="text-yellow-200 font-medium text-sm">
                      🌟 Passport Mastery for {masteryCity?.city}
                    </p>
                    <p className="text-pink-200 text-sm mt-1">
                      What's the vibe of {masteryCity?.city}?
                    </p>
                  </div>
                  {!isPaidUser && <p className="text-pink-200 text-sm">Attempts: {masteryAttempts}/2</p>}
                </>
              ) : (
                <>
                  <h1 className="text-3xl font-bold text-white mb-2">✨ City Vibe</h1>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 mb-4 mx-auto max-w-sm">
                    <p className="text-yellow-200 font-medium text-sm">
                      🎯 Match each city with its personality!
                    </p>
                    <p className="text-pink-200 text-sm mt-1">
                      What makes this city special?
                    </p>
                  </div>
                  <p className="text-pink-200 text-sm">Question {currentQuestion + 1} of {questions.length}</p>
                  <div className="w-full bg-white/20 rounded-full h-2 mt-3">
                    <div 
                      className="bg-gradient-to-r from-pink-400 to-rose-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                    />
                  </div>
                </>
              )}
            </div>

            <motion.div
              key={currentQuestion}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 mb-6"
            >
              <div className="text-center mb-4">
                <div className="text-5xl mb-2">
                  {currentQ.imageUrl ? (
                    <img 
                      src={currentQ.imageUrl} 
                      alt={currentQ.country}
                      className="w-16 h-12 mx-auto rounded shadow-lg object-cover"
                    />
                  ) : "🌍"}
                </div>
                <h2 className="text-2xl font-bold text-white">{currentQ.city}</h2>
                <p className="text-pink-200">{currentQ.country}</p>
              </div>
              
              <p className="text-white/80 text-center mb-4 font-medium">What's this city's vibe?</p>
              
              <div className="grid grid-cols-2 gap-3">
                {currentQ.options.map(badge => {
                  const isCorrect = badge.id === correctBadge.id;
                  const isSelected = badge.id === selectedAnswer;
                  const showCorrectHighlight = isMasteryMode ? (masterySuccess || masteryFailed) : showResult;
                  
                  return (
                    <Button
                      key={badge.id}
                      onClick={() => handleAnswer(badge.id)}
                      disabled={showResult}
                      className={cn(
                        "py-4 h-auto flex flex-col items-center gap-1 transition-all",
                        showCorrectHighlight && isCorrect && "bg-green-500 hover:bg-green-500 text-white",
                        showResult && isSelected && !isCorrect && "bg-red-500 hover:bg-red-500 text-white",
                        !showResult && "bg-white/20 hover:bg-white/30 text-white"
                      )}
                    >
                      <span className="text-2xl">{badge.emoji}</span>
                      <span className="text-xs font-medium text-center leading-tight">{badge.name}</span>
                    </Button>
                  );
                })}
              </div>

              <AnimatePresence>
                {showResult && !masteryFailed && !isMasteryMode && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -10, height: 0 }}
                    className={`mt-4 rounded-xl p-4 border ${
                      selectedAnswer === correctBadge.id 
                        ? "bg-gradient-to-r from-green-500/30 to-emerald-500/30 border-green-400/50" 
                        : "bg-gradient-to-r from-amber-500/30 to-yellow-500/30 border-amber-400/50"
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <span className="text-2xl">{selectedAnswer === correctBadge.id ? "🎉" : "💡"}</span>
                      <div>
                        <p className={`font-bold text-sm mb-1 ${selectedAnswer === correctBadge.id ? "text-green-200" : "text-amber-200"}`}>
                          {selectedAnswer === correctBadge.id ? "Correct! " : ""}{currentQ.city} is {correctBadge.emoji} {correctBadge.name}!
                        </p>
                        <p className="text-white text-sm leading-relaxed">{correctBadge.description}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => goToNextQuestion(selectedAnswer === correctBadge.id)}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-3"
                    >
                      {selectedAnswer === correctBadge.id ? "🌟 Great! Next City" : "✅ Got it! Next City"}
                    </Button>
                  </motion.div>
                )}
                {showResult && selectedAnswer !== correctBadge.id && !masteryFailed && isMasteryMode && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto', pointerEvents: 'auto' }}
                    exit={{ opacity: 0, y: -10, height: 0, pointerEvents: 'none' }}
                    className="mt-4 bg-gradient-to-r from-amber-500/30 to-yellow-500/30 rounded-xl p-4 border border-amber-400/50"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <span className="text-2xl">🤔</span>
                      <div>
                        <p className="text-amber-200 font-bold text-sm mb-1">Not quite!</p>
                        <p className="text-white text-sm leading-relaxed">Think about what makes {currentQ.city} special.{!isPaidUser ? ` You have ${2 - masteryAttempts} more ${2 - masteryAttempts === 1 ? 'try' : 'tries'}!` : ' Try again!'}</p>
                      </div>
                    </div>
                    <Button
                      onClick={handleMasteryRetry}
                      className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold py-3"
                    >
                      {isPaidUser ? '🔄 Try Again' : `🔄 Try Again (${2 - masteryAttempts} ${2 - masteryAttempts === 1 ? 'attempt' : 'attempts'} left)`}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "rounded-2xl p-6 text-center",
              score >= 600 
                ? "bg-gradient-to-br from-green-500 to-emerald-600" 
                : "bg-gradient-to-br from-orange-500 to-amber-600"
            )}
          >
            <h2 className="text-3xl font-bold text-white mb-2">
              {score >= 600 ? "🎉 Amazing!" : score >= 400 ? "👍 Good job!" : "Keep practicing!"}
            </h2>
            <p className="text-white/90 mb-4">
              You matched {score / 100} out of {questions.length} cities!
            </p>
            <div className="text-4xl font-bold text-yellow-300 mb-4">
              Score: {score}
            </div>
            
            <div className="mb-4">
              <LearningSummary points={getGameLearningPoints("city-vibe")} variant="dark" />
            </div>
            
            <div className="flex gap-3 justify-center">
              <Button onClick={initializeGame} className="bg-white/20 hover:bg-white/30 text-white">
                Play Again
              </Button>
              <Button onClick={onExit} variant="outline" className="border-white/30 text-white hover:bg-white/10">
                {returnTo === "explorer-map" ? "🗺️ Explorer Map" : "Treasure Vault"}
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
