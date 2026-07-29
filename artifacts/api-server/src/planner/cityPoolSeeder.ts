/**
 * City Stop Pool Pre-Seeder
 *
 * Idempotent seed function that runs on server startup.
 * For each of the 100 known popular family-travel cities not yet in the
 * cache, it generates a stop pool via AI and persists it.
 * Cities are processed sequentially to avoid API rate limits.
 *
 * Target: 60 USA + 40 India = 100 cities
 */

import { storage } from "../storage";
import { generateCityStopPool } from "./plannerService";

interface CityEntry {
  city: string;
  country: string;
}

const CITIES_TO_SEED: CityEntry[] = [
  // ── India — 40 cities FIRST (highest priority — seeded before USA so restarts never block India) ──

  { city: "Delhi", country: "India" },
  { city: "Agra", country: "India" },
  { city: "Jaipur", country: "India" },
  { city: "Goa", country: "India" },
  { city: "Mumbai", country: "India" },
  { city: "Kochi", country: "India" },
  { city: "Manali", country: "India" },
  { city: "Shimla", country: "India" },
  { city: "Darjeeling", country: "India" },
  { city: "Udaipur", country: "India" },
  { city: "Varanasi", country: "India" },
  { city: "Ooty", country: "India" },
  { city: "Munnar", country: "India" },
  { city: "Mysore", country: "India" },
  { city: "Rishikesh", country: "India" },
  { city: "Ranthambore", country: "India" },
  { city: "Bangalore", country: "India" },
  { city: "Andaman Islands", country: "India" },
  { city: "Chennai", country: "India" },            // Marina Beach, museums, Kapaleeshwarar
  { city: "Hyderabad", country: "India" },          // Golconda Fort, Ramoji Film City
  { city: "Kolkata", country: "India" },            // Victoria Memorial, Howrah Bridge
  { city: "Pune", country: "India" },               // Shaniwar Wada, Aga Khan Palace
  { city: "Ahmedabad", country: "India" },          // Sabarmati Ashram, Science City
  { city: "Jodhpur", country: "India" },            // Blue City, Mehrangarh Fort
  { city: "Pushkar", country: "India" },            // Sacred lake, Brahma temple, camel fair
  { city: "Hampi", country: "India" },              // Vijayanagara ruins, boulder landscape
  { city: "Coorg", country: "India" },              // Coffee estates, Abbey Falls, trekking
  { city: "Alleppey", country: "India" },           // Backwaters, houseboat stays
  { city: "Leh Ladakh", country: "India" },         // Buddhist monasteries, dramatic landscape
  { city: "Amritsar", country: "India" },           // Golden Temple, Wagah Border ceremony
  { city: "Pondicherry", country: "India" },        // French Quarter, Auroville, beaches
  { city: "Madurai", country: "India" },            // Meenakshi Temple, South India culture
  { city: "Mahabalipuram", country: "India" },      // Shore Temple, rock carvings, beach
  { city: "Mount Abu", country: "India" },          // Only hill station in Rajasthan
  { city: "Varkala", country: "India" },            // Cliffside beaches, papanasam
  { city: "Bhubaneswar", country: "India" },        // Temple city, Odisha tribal culture
  { city: "Tirupati", country: "India" },           // Sacred pilgrimage, Venkateswara Temple
  { city: "Lonavala", country: "India" },           // Monsoon waterfalls, hill station near Mumbai
  { city: "Jaisalmer", country: "India" },          // Golden Fort, desert dunes, camel safari
  { city: "Bikaner", country: "India" },            // Junagarh Fort, camel research centre

  // ── USA — 60 cities ──────────────────────────────────────────────────────

  { city: "Orlando", country: "US" },
  { city: "Washington DC", country: "US" },
  { city: "New York", country: "US" },
  { city: "San Diego", country: "US" },
  { city: "Los Angeles", country: "US" },
  { city: "Chicago", country: "US" },
  { city: "Honolulu", country: "US" },
  { city: "San Francisco", country: "US" },
  { city: "Nashville", country: "US" },
  { city: "Denver", country: "US" },
  { city: "Miami", country: "US" },
  { city: "Boston", country: "US" },
  { city: "Seattle", country: "US" },
  { city: "New Orleans", country: "US" },
  { city: "Philadelphia", country: "US" },
  { city: "Austin", country: "US" },
  { city: "Las Vegas", country: "US" },
  { city: "Portland", country: "US" },
  { city: "Charleston", country: "US" },
  { city: "Jackson Hole", country: "US" },
  { city: "St. Louis", country: "US" },           // Gateway Arch, City Museum
  { city: "Big Island", country: "US" },           // Hawaii: volcanoes, lava, Mauna Kea
  { city: "Omaha", country: "US" },                // Henry Doorly Zoo (world-class)
  { city: "San Antonio", country: "US" },          // River Walk, Alamo, Natural Bridge Caverns
  { city: "Atlanta", country: "US" },              // Georgia Aquarium, World of Coke
  { city: "Dallas", country: "US" },               // Perot Museum, Dallas Zoo
  { city: "Phoenix", country: "US" },              // Desert Botanical Garden, Zoo
  { city: "Salt Lake City", country: "US" },       // Great Salt Lake, Natural History Museum
  { city: "Minneapolis", country: "US" },          // Mall of America, Science Museum of MN
  { city: "Kansas City", country: "US" },          // Union Station, Science City
  { city: "Memphis", country: "US" },              // National Civil Rights Museum, zoo
  { city: "Baltimore", country: "US" },            // National Aquarium, Maryland Science Center
  { city: "Pittsburgh", country: "US" },           // Carnegie Museums, Phipps Conservatory
  { city: "Indianapolis", country: "US" },         // Children's Museum (world's largest)
  { city: "Cincinnati", country: "US" },           // Newport Aquarium, Cincinnati Zoo
  { city: "Columbus", country: "US" },             // COSI Science Center, Columbus Zoo
  { city: "Houston", country: "US" },              // Space Center Houston, Houston Zoo
  { city: "Albuquerque", country: "US" },          // Balloon Fiesta, BioPark, Old Town
  { city: "Santa Fe", country: "US" },             // History, pueblo architecture, museums
  { city: "Savannah", country: "US" },             // Historic squares, river street
  { city: "Asheville", country: "US" },            // Biltmore Estate, Blue Ridge Parkway
  { city: "Williamsburg", country: "US" },         // Colonial history, Busch Gardens
  { city: "Yellowstone", country: "US" },          // Geysers, wildlife, geothermal
  { city: "Grand Canyon", country: "US" },         // South Rim, ranger programs
  { city: "Sedona", country: "US" },               // Red rocks, vortex hikes, jeep tours
  { city: "Monterey", country: "US" },             // Aquarium, Cannery Row, Big Sur
  { city: "Santa Barbara", country: "US" },        // Mission, beaches, Channel Islands
  { city: "Napa Valley", country: "US" },          // Mud Baths, hot air balloons, train
  { city: "Park City", country: "US" },            // Olympic Park, Utah Olympic legacy
  { city: "Anchorage", country: "US" },            // Alaska wildlife, glacier treks
  { city: "Louisville", country: "US" },           // Louisville Slugger Museum, zoo
  { city: "Charlotte", country: "US" },            // Discovery Place Science, Carowinds
  { city: "Raleigh", country: "US" },              // NC Museum of Natural Sciences
  { city: "Richmond", country: "US" },             // Children's Museum of Richmond, history
  { city: "Tucson", country: "US" },               // Biosphere 2, Sonoran Desert Museum
  { city: "Boise", country: "US" },                // Discovery Center, Boise Zoo
  { city: "Burlington", country: "US" },           // ECHO Science Center, Vermont nature
  { city: "Bar Harbor", country: "US" },           // Acadia National Park, whale watch
  { city: "Gatlinburg", country: "US" },           // Smoky Mountains, Ripley's, Dollywood
  { city: "Myrtle Beach", country: "US" },         // Beaches, Family Kingdom, Myrtle Waves
];

/**
 * Pre-seed stop pools for all 100 popular family-travel cities.
 * Idempotent: skips cities already cached.
 * Sequential to avoid rate limits.
 */
export async function seedCityStopPools(): Promise<void> {
  console.log(`[CityPoolSeeder] Starting city stop pool pre-seeding (${CITIES_TO_SEED.length} cities)...`);
  let seeded = 0;
  let skipped = 0;
  let failed = 0;

  for (const { city, country } of CITIES_TO_SEED) {
    try {
      const existing = await storage.getCityStopPool(city, country);
      if (existing && existing.stopPool && existing.stopPool.length > 0) {
        skipped++;
        continue;
      }

      console.log(`[CityPoolSeeder] Generating pool for: ${city}, ${country}`);
      const pool = await generateCityStopPool(city, country);

      if (pool.length === 0) {
        console.warn(`[CityPoolSeeder] No stops generated for ${city}, ${country} — skipping save`);
        failed++;
        continue;
      }

      await storage.saveCityStopPool({
        city,
        country,
        normalizedKey: `${city.toLowerCase().trim()}:${country.toLowerCase().trim()}`,
        stopPool: pool,
      });

      console.log(`[CityPoolSeeder] ✅ Cached ${pool.length} stops for ${city}, ${country}`);
      seeded++;

      // Small delay between cities to be kind to the API
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (err) {
      console.error(`[CityPoolSeeder] ❌ Failed to seed ${city}, ${country}:`, err);
      failed++;
      // Continue with next city
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log(`[CityPoolSeeder] Complete — seeded: ${seeded}, skipped: ${skipped}, failed: ${failed} (of ${CITIES_TO_SEED.length} total)`);
}
