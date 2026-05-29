/**
 * City name → canonical svgKey mapping for landmark art.
 * Keys must match entries in LANDMARK_PROMPTS inside compassLandmarkImageService.ts.
 * Used by:
 *   - internationalLandmarkPhotoSeeder.ts  (pre-seeding)
 *   - routes.ts  GET /api/travel/city-landmark-image/:city  (serving cached art)
 */

export interface CityLandmark {
  city: string;
  country: string;
  svgKey: string;
}

/**
 * Full list of cities with their landmark svgKeys and country metadata.
 * The seeder iterates this to pre-generate artwork; the route uses CITY_SVG_KEY
 * (derived below) for O(1) lookup.
 */
export const CITY_LANDMARKS: CityLandmark[] = [
  // ── USA ───────────────────────────────────────────────────────────────────
  { city: "Chicago",        country: "USA",              svgKey: "chicago-skyline"           },
  { city: "New York",       country: "USA",              svgKey: "statue-of-liberty"         },
  { city: "Seattle",        country: "USA",              svgKey: "space-needle"              },
  { city: "Washington DC",  country: "USA",              svgKey: "white-house"               },
  { city: "Honolulu",       country: "USA",              svgKey: "honolulu-landscape"        },
  { city: "Maui",           country: "USA",              svgKey: "honolulu-landscape"        },

  // ── Europe ────────────────────────────────────────────────────────────────
  { city: "London",         country: "United Kingdom",   svgKey: "big-ben"                   },
  { city: "Paris",          country: "France",           svgKey: "eiffel-tower"              },
  { city: "Rome",           country: "Italy",            svgKey: "colosseum"                 },
  { city: "Barcelona",      country: "Spain",            svgKey: "sagrada-familia"           },
  { city: "Amsterdam",      country: "Netherlands",      svgKey: "amsterdam-canals"          },
  { city: "Vienna",         country: "Austria",          svgKey: "vienna-st-stephens"        },
  { city: "Prague",         country: "Czech Republic",   svgKey: "prague-castle"             },
  { city: "Budapest",       country: "Hungary",          svgKey: "budapest-parliament"       },
  { city: "Lisbon",         country: "Portugal",         svgKey: "lisbon-belem-tower"        },
  { city: "Edinburgh",      country: "United Kingdom",   svgKey: "edinburgh-castle"          },
  { city: "Florence",       country: "Italy",            svgKey: "florence-duomo"            },
  { city: "Venice",         country: "Italy",            svgKey: "venice-canals"             },
  { city: "Santorini",      country: "Greece",           svgKey: "santorini-caldera"         },
  { city: "Dubrovnik",      country: "Croatia",          svgKey: "dubrovnik-old-town"        },
  { city: "Reykjavik",      country: "Iceland",          svgKey: "reykjavik-hallgrimskirkja" },
  { city: "Athens",         country: "Greece",           svgKey: "acropolis"                 },

  // ── Asia ──────────────────────────────────────────────────────────────────
  { city: "Tokyo",          country: "Japan",            svgKey: "mount-fuji"                },
  { city: "Kyoto",          country: "Japan",            svgKey: "kyoto-golden-pavilion"     },
  { city: "Seoul",          country: "South Korea",      svgKey: "gyeongbokgung-palace"      },
  { city: "Bangkok",        country: "Thailand",         svgKey: "bangkok-grand-palace"      },
  { city: "Singapore",      country: "Singapore",        svgKey: "singapore-marina-bay"      },
  { city: "Bali",           country: "Indonesia",        svgKey: "bali-rice-terraces"        },
  { city: "Siem Reap",      country: "Cambodia",         svgKey: "angkor-wat"                },
  { city: "Beijing",        country: "China",            svgKey: "great-wall"                },
  { city: "Istanbul",       country: "Turkey",           svgKey: "istanbul-blue-mosque"      },
  { city: "Cappadocia",     country: "Turkey",           svgKey: "cappadocia-balloons"       },

  // ── Middle East ───────────────────────────────────────────────────────────
  { city: "Dubai",          country: "UAE",              svgKey: "burj-khalifa"              },

  // ── Australia & New Zealand ───────────────────────────────────────────────
  { city: "Sydney",         country: "Australia",        svgKey: "sydney-opera"              },
  { city: "Auckland",       country: "New Zealand",      svgKey: "auckland-sky-tower"        },
  { city: "Queenstown",     country: "New Zealand",      svgKey: "queenstown-remarkables"    },

  // ── South America ─────────────────────────────────────────────────────────
  { city: "Rio de Janeiro", country: "Brazil",           svgKey: "christ-redeemer"           },
  { city: "Machu Picchu",   country: "Peru",             svgKey: "machu-picchu"              },
  { city: "Cusco",          country: "Peru",             svgKey: "cusco-cathedral"           },
  { city: "Buenos Aires",   country: "Argentina",        svgKey: "buenos-aires-obelisk"      },
  { city: "Cartagena",      country: "Colombia",         svgKey: "cartagena-walls"           },

  // ── Africa ────────────────────────────────────────────────────────────────
  { city: "Cape Town",      country: "South Africa",     svgKey: "table-mountain"            },
  { city: "Cairo",          country: "Egypt",            svgKey: "pyramids"                  },
  { city: "Marrakech",      country: "Morocco",          svgKey: "marrakech-djemaa"          },

  // ── Canada ────────────────────────────────────────────────────────────────
  { city: "Vancouver",      country: "Canada",           svgKey: "vancouver-skyline"         },
  { city: "Toronto",        country: "Canada",           svgKey: "toronto-cn-tower"          },
  { city: "Banff",          country: "Canada",           svgKey: "banff-lake-louise"         },
  { city: "Quebec City",    country: "Canada",           svgKey: "quebec-city-chateau"       },

  // ── Mexico & Caribbean ────────────────────────────────────────────────────
  { city: "Mexico City",    country: "Mexico",           svgKey: "mexico-city-zocalo"        },
  { city: "Cancun",         country: "Mexico",           svgKey: "cancun-turquoise-coast"    },
];

/**
 * O(1) city-name → svgKey lookup derived from CITY_LANDMARKS.
 * Used by the API route to map a request param to a DB key.
 */
export const CITY_SVG_KEY: Record<string, string> = Object.fromEntries(
  CITY_LANDMARKS.map(({ city, svgKey }) => [city, svgKey])
);
