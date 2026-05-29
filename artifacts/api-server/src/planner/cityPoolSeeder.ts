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

  { city: "Orlando", country: "USA" },
  { city: "Washington DC", country: "USA" },
  { city: "New York City", country: "USA" },
  { city: "San Diego", country: "USA" },
  { city: "Los Angeles", country: "USA" },
  { city: "Chicago", country: "USA" },
  { city: "Honolulu", country: "USA" },
  { city: "San Francisco", country: "USA" },
  { city: "Nashville", country: "USA" },
  { city: "Denver", country: "USA" },
  { city: "Miami", country: "USA" },
  { city: "Boston", country: "USA" },
  { city: "Seattle", country: "USA" },
  { city: "New Orleans", country: "USA" },
  { city: "Philadelphia", country: "USA" },
  { city: "Austin", country: "USA" },
  { city: "Las Vegas", country: "USA" },
  { city: "Portland", country: "USA" },
  { city: "Charleston", country: "USA" },
  { city: "Jackson Hole", country: "USA" },
  { city: "St. Louis", country: "USA" },           // Gateway Arch, City Museum
  { city: "Big Island", country: "USA" },           // Hawaii: volcanoes, lava, Mauna Kea
  { city: "Omaha", country: "USA" },                // Henry Doorly Zoo (world-class)
  { city: "San Antonio", country: "USA" },          // River Walk, Alamo, Natural Bridge Caverns
  { city: "Atlanta", country: "USA" },              // Georgia Aquarium, World of Coke
  { city: "Dallas", country: "USA" },               // Perot Museum, Dallas Zoo
  { city: "Phoenix", country: "USA" },              // Desert Botanical Garden, Zoo
  { city: "Salt Lake City", country: "USA" },       // Great Salt Lake, Natural History Museum
  { city: "Minneapolis", country: "USA" },          // Mall of America, Science Museum of MN
  { city: "Kansas City", country: "USA" },          // Union Station, Science City
  { city: "Memphis", country: "USA" },              // National Civil Rights Museum, zoo
  { city: "Baltimore", country: "USA" },            // National Aquarium, Maryland Science Center
  { city: "Pittsburgh", country: "USA" },           // Carnegie Museums, Phipps Conservatory
  { city: "Indianapolis", country: "USA" },         // Children's Museum (world's largest)
  { city: "Cincinnati", country: "USA" },           // Newport Aquarium, Cincinnati Zoo
  { city: "Columbus", country: "USA" },             // COSI Science Center, Columbus Zoo
  { city: "Houston", country: "USA" },              // Space Center Houston, Houston Zoo
  { city: "Albuquerque", country: "USA" },          // Balloon Fiesta, BioPark, Old Town
  { city: "Santa Fe", country: "USA" },             // History, pueblo architecture, museums
  { city: "Savannah", country: "USA" },             // Historic squares, river street
  { city: "Asheville", country: "USA" },            // Biltmore Estate, Blue Ridge Parkway
  { city: "Williamsburg", country: "USA" },         // Colonial history, Busch Gardens
  { city: "Yellowstone", country: "USA" },          // Geysers, wildlife, geothermal
  { city: "Grand Canyon", country: "USA" },         // South Rim, ranger programs
  { city: "Sedona", country: "USA" },               // Red rocks, vortex hikes, jeep tours
  { city: "Monterey", country: "USA" },             // Aquarium, Cannery Row, Big Sur
  { city: "Santa Barbara", country: "USA" },        // Mission, beaches, Channel Islands
  { city: "Napa Valley", country: "USA" },          // Mud Baths, hot air balloons, train
  { city: "Park City", country: "USA" },            // Olympic Park, Utah Olympic legacy
  { city: "Anchorage", country: "USA" },            // Alaska wildlife, glacier treks
  { city: "Louisville", country: "USA" },           // Louisville Slugger Museum, zoo
  { city: "Charlotte", country: "USA" },            // Discovery Place Science, Carowinds
  { city: "Raleigh", country: "USA" },              // NC Museum of Natural Sciences
  { city: "Richmond", country: "USA" },             // Children's Museum of Richmond, history
  { city: "Tucson", country: "USA" },               // Biosphere 2, Sonoran Desert Museum
  { city: "Boise", country: "USA" },                // Discovery Center, Boise Zoo
  { city: "Burlington", country: "USA" },           // ECHO Science Center, Vermont nature
  { city: "Bar Harbor", country: "USA" },           // Acadia National Park, whale watch
  { city: "Gatlinburg", country: "USA" },           // Smoky Mountains, Ripley's, Dollywood
  { city: "Myrtle Beach", country: "USA" },         // Beaches, Family Kingdom, Myrtle Waves
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
