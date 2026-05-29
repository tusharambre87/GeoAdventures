// ─── Verified image URL helpers ─────────────────────────────────────────────
// Short Unsplash IDs (all verified 200 in images.unsplash.com)
const BASE = "https://images.unsplash.com/photo-";
const Q    = "?w=800&h=480&q=80&auto=format&fit=crop";

function u(id: string): string { return `${BASE}${id}${Q}`; }

// Wikipedia Commons thumbnails — already verified in adventureImages.ts
function wiki(path: string): string {
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${path}`;
}

// ─── Verified building-block Unsplash IDs ────────────────────────────────────
// Every ID below comes from adventureImages.ts or the existing CITY_BANKS —
// all confirmed 200. Assigned descriptive names so city banks stay readable.
const IMG = {
  // India – heritage / forts
  INDIA_GATE:      u("1524492412937-b28074a5d7da"),   // India Gate archway
  RED_FORT:        u("1578662996442-48f60103fc96"),   // Red Fort / Rajasthan fort
  PALACE_UDAIPUR:  u("1617516975781-13b06c12e5fc"),   // Udaipur lake palace
  PALACE_MYSORE:   u("1616426062647-25e9f12c74c2"),   // Mysore palace interior
  TAJ_MAHAL:       u("1564507592333-c60657eea523"),   // Taj Mahal reflection pool
  VIDHANA_SOUDHA:  u("1580480055273-228ff5388ef8"),   // Bangalore Vidhana Soudha
  PALACE_BLR:      u("1593693397690-362cb9666fc2"),   // Bangalore Palace

  // India – temples / sacred
  TEMPLE_INTERIOR: u("1528360983277-13d401cdc186"),   // ornate temple / mosque interior
  VARANASI_GHATS:  u("1561361513-2d000a50f0dc"),      // Varanasi dawn ghats
  VARANASI_2:      u("1561036770-2e01f5f0e41b"),      // Varanasi V2 / boats

  // India – nature / landscape
  TEA_ESTATE:      u("1504208434309-cb69f4fe52b0"),   // tea plantation rolling hills
  MOUNTAIN_VIEW:   u("1464822759023-fed622ff2c3b"),   // mountain viewpoint / forest
  LAKE_CALM:       u("1439405326854-014607f694d7"),   // serene lake (Ulsoor / Karanji)
  BEACH:           u("1507525428034-b723cf961d3e"),   // tropical beach
  RIVER_BACKWATER: u("1602216056096-3b40cc0c9944"),   // Kerala backwaters / fishing nets

  // India – urban / activity
  MARKET_INDIA:    u("1555396273-367ea4eb4db5"),      // colourful Indian bazaar
  NIGHT_CITY:      u("1529253355930-ddbe423a2ac7"),   // Marine Drive / city lights
  GARDEN:          u("1585320806297-9794b3e4eeae"),   // botanical garden / park
  WILDLIFE:        u("1474511320723-9a56873867b5"),   // wildlife / zoo animals
  MUSEUM:          u("1518998053901-5348d3961a04"),   // museum gallery
  TOY_TRAIN:       u("1544620347-c4fd4a3d5957"),      // mountain railway / toy train
  OOTY_LAKE:       u("1558981852-426c373d4324"),      // Ooty Lake / boathouse

  // Jaipur extra
  AMBER_FORT:      u("1477587458883-47145ed31769"),   // Amber Fort / palace

  // Udaipur extra
  UDAIPUR_2:       u("1524396309943-e03f5249f002"),   // Udaipur city palace lake view
};

// ─── Real family photos (user-provided, served from /family-photos/) ─────────
// Each photo shows a real family at a specific, recognisable landmark.
// These are the primary images — always preferred over stock Unsplash.
const LOCAL = {
  BEACH_SUNSET:    "/family-photos/beach-sunset.png",    // mom+daughter piggyback, ocean waves at dusk  → all beach destinations
  MYSORE_PALACE_1: "/family-photos/mysore-palace-1.png", // Indian family of 5, Mysore Palace teal hall  → Mysore hero, Indian palaces
  HAWAII_BEACH:    "/family-photos/hawaii-beach.png",    // western family of 4, turquoise water         → Honolulu, Florida, Hawaii
  INDIA_RED_FORT:  "/family-photos/india-red-fort.png",  // family at red-sandstone Mughal fort          → Jaisalmer, Delhi, Agra fort
  HILL_STATION:    "/family-photos/india-hill-station.png", // Indian family, rolling Ooty hillside      → all Indian hill stations
  MYSORE_PALACE_2: "/family-photos/mysore-palace-2.png", // Indian family of 5, same palace hall        → Mysore alt, broader India heritage
  MUMBAI_GATEWAY:  "/family-photos/mumbai-gateway.png",  // family at Gateway of India arch             → Mumbai
  SF_GOLDEN_GATE:  "/family-photos/sf-golden-gate.png",  // diverse family at Golden Gate Bridge        → San Francisco
  YELLOWSTONE:     "/family-photos/yellowstone.png",     // family at Grand Prismatic Spring            → Yellowstone + all US national parks
  LONDON_BIGBEN:   "/family-photos/london-bigben.png",   // Asian family on Westminster Bridge           → London (+ UK cities)
  PARIS_EIFFEL:    "/family-photos/paris-eiffel.png",    // family holding hands, Eiffel Tower          → Paris
};

// Wikipedia Commons hero images (verified in adventureImages.ts)
const WIKI = {
  AGRA:      wiki("1/1d/Taj_Mahal_%28Edited%29.jpeg/800px-Taj_Mahal_%28Edited%29.jpeg"),
  JAIPUR:    wiki("9/93/Hawa_Mahal_Jaipur.jpg/800px-Hawa_Mahal_Jaipur.jpg"),
  MUMBAI:    wiki("3/3a/Mumbai_03-2016_30_Gateway_of_India.jpg/800px-Mumbai_03-2016_30_Gateway_of_India.jpg"),
  GOA:       wiki("d/de/Baga_Beach_Goa_India.jpg/800px-Baga_Beach_Goa_India.jpg"),
  BANGALORE: wiki("9/99/Vidhana_Soudha_%28India%29.jpg/800px-Vidhana_Soudha_%28India%29.jpg"),
  MYSORE:    wiki("b/bd/Mysore_palace_illuminated.jpg/800px-Mysore_palace_illuminated.jpg"),
  OOTY:      wiki("a/af/Ooty_Botanical_gardens.jpg/800px-Ooty_Botanical_gardens.jpg"),
};

// ─── CityBank type ───────────────────────────────────────────────────────────
type CityBank = {
  hero:   string;
  photos: string[];  // [0]=landmark, [1]=water/indoor, [2]=park/nature, [3]=food/street
  kid:    string;
  parent: string;
};

// ─── Curated city banks — one per destination ────────────────────────────────
// LOCAL.* photos = real user-provided family photos (highest priority)
// WIKI.*  photos = verified Wikipedia Commons landmark shots
// IMG.*   photos = verified Unsplash IDs from adventureImages.ts
const CITY_BANKS: Record<string, CityBank> = {

  // ── Western cities ───────────────────────────────────────────────────────

  paris: {
    hero:   LOCAL.PARIS_EIFFEL,
    photos: [LOCAL.PARIS_EIFFEL, u("1487958449943-2429e8be8625"), u("1520939817895-060bdaf4fe1b"), u("1520939817895-060bdaf4fe1b")],
    kid:    LOCAL.PARIS_EIFFEL,
    parent: u("1487958449943-2429e8be8625"),
  },
  london: {
    hero:   LOCAL.LONDON_BIGBEN,
    photos: [LOCAL.LONDON_BIGBEN, u("1533929736458-ca588d08c8be"), u("1513635269975-59663e0ac1ad"), u("1533929736458-ca588d08c8be")],
    kid:    LOCAL.LONDON_BIGBEN,
    parent: u("1513635269975-59663e0ac1ad"),
  },
  "san francisco": {
    hero:   LOCAL.SF_GOLDEN_GATE,
    photos: [LOCAL.SF_GOLDEN_GATE, u("1501594907352-04cda38ebc29"), u("1506905925346-21bda4d32df4"), u("1449034446853-66c86144b0ad")],
    kid:    LOCAL.SF_GOLDEN_GATE,
    parent: u("1501594907352-04cda38ebc29"),
  },
  sydney: {
    hero:   u("1506973035872-a4ec16b8e8d9"),
    photos: [u("1587474260584-136574528ed5"), LOCAL.BEACH_SUNSET, u("1526129318478-62ed807ebdf9"), u("1555993539-1732b0258235")],
    kid:    LOCAL.BEACH_SUNSET,
    parent: u("1526129318478-62ed807ebdf9"),
  },
  chicago: {
    hero:   u("1477959858617-67f85cf4f1df"),
    photos: [u("1477959858617-67f85cf4f1df"), u("1494522855154-9297ac14b55f"), u("1477959858617-67f85cf4f1df"), u("1494522855154-9297ac14b55f")],
    kid:    u("1494522855154-9297ac14b55f"),
    parent: u("1477959858617-67f85cf4f1df"),
  },
  "new york": {
    hero:   u("1491555103944-7c647fd857e6"),
    photos: [u("1491555103944-7c647fd857e6"), u("1534430480872-3498386e7856"), u("1522083165195-3424ed129620"), u("1491555103944-7c647fd857e6")],
    kid:    u("1534430480872-3498386e7856"),
    parent: u("1522083165195-3424ed129620"),
  },
  "cape town": {
    hero:   u("1580060839134-75a5edca2e99"),
    photos: [u("1580060839134-75a5edca2e99"), u("1547471080-7cc2caa01a7e"), u("1521336575822-6da63fb45455"), u("1580060839134-75a5edca2e99")],
    kid:    u("1547471080-7cc2caa01a7e"),
    parent: u("1521336575822-6da63fb45455"),
  },

  // ── USA — national parks / outdoors ────────────────────────────────────

  yellowstone: {
    hero:   LOCAL.YELLOWSTONE,
    photos: [LOCAL.YELLOWSTONE, u("1506973035872-a4ec16b8e8d9"), LOCAL.YELLOWSTONE, u("1449034446853-66c86144b0ad")],
    kid:    LOCAL.YELLOWSTONE,
    parent: LOCAL.YELLOWSTONE,
  },
  "grand canyon": {
    hero:   LOCAL.YELLOWSTONE,
    photos: [LOCAL.YELLOWSTONE, u("1506973035872-a4ec16b8e8d9"), LOCAL.YELLOWSTONE, u("1534430480872-3498386e7856")],
    kid:    LOCAL.YELLOWSTONE,
    parent: LOCAL.YELLOWSTONE,
  },
  sedona: {
    hero:   LOCAL.YELLOWSTONE,
    photos: [LOCAL.YELLOWSTONE, u("1506973035872-a4ec16b8e8d9"), LOCAL.YELLOWSTONE, u("1534430480872-3498386e7856")],
    kid:    LOCAL.YELLOWSTONE,
    parent: LOCAL.YELLOWSTONE,
  },
  "jackson hole": {
    hero:   LOCAL.YELLOWSTONE,
    photos: [LOCAL.YELLOWSTONE, u("1506973035872-a4ec16b8e8d9"), LOCAL.YELLOWSTONE, u("1534430480872-3498386e7856")],
    kid:    LOCAL.YELLOWSTONE,
    parent: LOCAL.YELLOWSTONE,
  },
  anchorage: {
    hero:   LOCAL.YELLOWSTONE,
    photos: [LOCAL.YELLOWSTONE, u("1506973035872-a4ec16b8e8d9"), LOCAL.YELLOWSTONE, u("1534430480872-3498386e7856")],
    kid:    LOCAL.YELLOWSTONE,
    parent: LOCAL.YELLOWSTONE,
  },

  // ── USA — beach / tropical ───────────────────────────────────────────────

  honolulu: {
    hero:   LOCAL.HAWAII_BEACH,
    photos: [LOCAL.HAWAII_BEACH, LOCAL.BEACH_SUNSET, LOCAL.HAWAII_BEACH, u("1555396273-367ea4eb4db5")],
    kid:    LOCAL.HAWAII_BEACH,
    parent: LOCAL.BEACH_SUNSET,
  },
  miami: {
    hero:   LOCAL.HAWAII_BEACH,
    photos: [LOCAL.HAWAII_BEACH, LOCAL.BEACH_SUNSET, LOCAL.HAWAII_BEACH, u("1555396273-367ea4eb4db5")],
    kid:    LOCAL.BEACH_SUNSET,
    parent: LOCAL.HAWAII_BEACH,
  },
  "myrtle beach": {
    hero:   LOCAL.BEACH_SUNSET,
    photos: [LOCAL.BEACH_SUNSET, LOCAL.HAWAII_BEACH, LOCAL.BEACH_SUNSET, u("1555396273-367ea4eb4db5")],
    kid:    LOCAL.BEACH_SUNSET,
    parent: LOCAL.BEACH_SUNSET,
  },
  "big island": {
    hero:   LOCAL.HAWAII_BEACH,
    photos: [LOCAL.HAWAII_BEACH, LOCAL.YELLOWSTONE, LOCAL.BEACH_SUNSET, u("1555396273-367ea4eb4db5")],
    kid:    LOCAL.HAWAII_BEACH,
    parent: LOCAL.YELLOWSTONE,
  },

  // ── India – Rajasthan ───────────────────────────────────────────────────

  agra: {
    // Taj Mahal — most photographed monument in India
    hero:   WIKI.AGRA,
    photos: [IMG.TAJ_MAHAL, LOCAL.INDIA_RED_FORT, IMG.GARDEN, IMG.MARKET_INDIA],
    kid:    LOCAL.INDIA_RED_FORT,   // family at Agra Fort (red sandstone archways)
    parent: IMG.TAJ_MAHAL,
  },

  jaipur: {
    // Hawa Mahal + Amber Fort + ornate palace interiors
    hero:   WIKI.JAIPUR,
    photos: [IMG.AMBER_FORT, LOCAL.MYSORE_PALACE_2, IMG.GARDEN, IMG.MARKET_INDIA],
    kid:    LOCAL.MYSORE_PALACE_2,  // palace interior (Amber Fort is equally ornate)
    parent: IMG.RED_FORT,
  },

  jodhpur: {
    // Blue City — Mehrangarh Fort sandstone ramparts
    hero:   LOCAL.INDIA_RED_FORT,
    photos: [LOCAL.INDIA_RED_FORT, IMG.PALACE_MYSORE, IMG.MOUNTAIN_VIEW, IMG.MARKET_INDIA],
    kid:    LOCAL.INDIA_RED_FORT,
    parent: IMG.MOUNTAIN_VIEW,
  },

  jaisalmer: {
    // Golden Fort — desert sandstone, identical material to image 4
    hero:   LOCAL.INDIA_RED_FORT,
    photos: [LOCAL.INDIA_RED_FORT, IMG.PALACE_UDAIPUR, IMG.MOUNTAIN_VIEW, IMG.MARKET_INDIA],
    kid:    LOCAL.INDIA_RED_FORT,
    parent: IMG.RED_FORT,
  },

  bikaner: {
    // Junagarh Fort + camel country
    hero:   LOCAL.INDIA_RED_FORT,
    photos: [LOCAL.INDIA_RED_FORT, IMG.INDIA_GATE, IMG.GARDEN, IMG.MARKET_INDIA],
    kid:    LOCAL.INDIA_RED_FORT,
    parent: IMG.RED_FORT,
  },

  udaipur: {
    // Lake City — Lake Pichola + City Palace
    hero:   IMG.PALACE_UDAIPUR,
    photos: [IMG.PALACE_UDAIPUR, LOCAL.MYSORE_PALACE_1, IMG.LAKE_CALM, IMG.MARKET_INDIA],
    kid:    LOCAL.MYSORE_PALACE_1,  // ornate palace interior
    parent: IMG.PALACE_UDAIPUR,
  },

  pushkar: {
    // Brahma Temple + sacred lake + camel fair
    hero:   IMG.INDIA_GATE,
    photos: [IMG.TEMPLE_INTERIOR, IMG.LAKE_CALM, IMG.GARDEN, IMG.MARKET_INDIA],
    kid:    IMG.INDIA_GATE,
    parent: IMG.LAKE_CALM,
  },

  // ── India – NCR / North ─────────────────────────────────────────────────

  delhi: {
    hero:   IMG.INDIA_GATE,
    photos: [LOCAL.INDIA_RED_FORT, IMG.TEMPLE_INTERIOR, IMG.GARDEN, IMG.MARKET_INDIA],
    kid:    LOCAL.INDIA_RED_FORT,   // family at Red Fort (same Mughal red sandstone)
    parent: u("1587474260584-136574528ed5"),
  },

  amritsar: {
    // Golden Temple — the defining image of Amritsar
    hero:   IMG.TEMPLE_INTERIOR,
    photos: [IMG.TEMPLE_INTERIOR, IMG.INDIA_GATE, IMG.LAKE_CALM, IMG.MARKET_INDIA],
    kid:    IMG.TEMPLE_INTERIOR,
    parent: IMG.LAKE_CALM,
  },

  // ── India – Himachal Pradesh / Uttarakhand ──────────────────────────────

  manali: {
    // Rohtang Pass + Hidimba Temple + Solang Valley
    hero:   LOCAL.HILL_STATION,
    photos: [LOCAL.HILL_STATION, IMG.TEMPLE_INTERIOR, IMG.TEA_ESTATE, IMG.MARKET_INDIA],
    kid:    IMG.TOY_TRAIN,
    parent: LOCAL.HILL_STATION,
  },

  shimla: {
    // Colonial hill station — The Ridge + Mall Road + Christ Church
    hero:   LOCAL.HILL_STATION,
    photos: [LOCAL.HILL_STATION, IMG.TOY_TRAIN, IMG.GARDEN, IMG.MARKET_INDIA],
    kid:    IMG.TOY_TRAIN,
    parent: LOCAL.HILL_STATION,
  },

  rishikesh: {
    // Laxman Jhula + Ganges + yoga capital
    hero:   IMG.VARANASI_GHATS,
    photos: [IMG.VARANASI_GHATS, IMG.TEMPLE_INTERIOR, LOCAL.HILL_STATION, IMG.MARKET_INDIA],
    kid:    IMG.VARANASI_GHATS,
    parent: LOCAL.HILL_STATION,
  },

  // ── India – West Bengal / Northeast ────────────────────────────────────

  darjeeling: {
    // Tea gardens + Tiger Hill sunrise + toy train UNESCO
    hero:   LOCAL.HILL_STATION,
    photos: [LOCAL.HILL_STATION, IMG.TOY_TRAIN, IMG.MOUNTAIN_VIEW, IMG.MARKET_INDIA],
    kid:    IMG.TOY_TRAIN,
    parent: LOCAL.HILL_STATION,
  },

  kolkata: {
    // Howrah Bridge + Victoria Memorial + Durga Puja
    hero:   IMG.INDIA_GATE,
    photos: [IMG.INDIA_GATE, IMG.MUSEUM, IMG.GARDEN, IMG.MARKET_INDIA],
    kid:    LOCAL.MYSORE_PALACE_2,  // Victoria Memorial has ornate palace interiors too
    parent: IMG.MUSEUM,
  },

  // ── India – Varanasi / UP ───────────────────────────────────────────────

  varanasi: {
    // Ghats on the Ganges — boats, dawn light, Aarti
    hero:   IMG.VARANASI_GHATS,
    photos: [IMG.VARANASI_GHATS, IMG.TEMPLE_INTERIOR, IMG.LAKE_CALM, IMG.MARKET_INDIA],
    kid:    IMG.VARANASI_2,
    parent: IMG.VARANASI_GHATS,
  },

  // ── India – Maharashtra ─────────────────────────────────────────────────

  mumbai: {
    // Gateway of India — iconic arch on the waterfront
    hero:   LOCAL.MUMBAI_GATEWAY,
    photos: [LOCAL.MUMBAI_GATEWAY, IMG.NIGHT_CITY, IMG.GARDEN, IMG.MARKET_INDIA],
    kid:    LOCAL.MUMBAI_GATEWAY,
    parent: IMG.GARDEN,
  },

  pune: {
    // Shaniwar Wada + Aga Khan Palace + hill forts
    hero:   LOCAL.INDIA_RED_FORT,
    photos: [LOCAL.INDIA_RED_FORT, IMG.MUSEUM, IMG.GARDEN, IMG.MARKET_INDIA],
    kid:    LOCAL.INDIA_RED_FORT,
    parent: IMG.GARDEN,
  },

  lonavala: {
    // Bhushi Dam + Karla Caves + Western Ghats valleys
    hero:   LOCAL.HILL_STATION,
    photos: [LOCAL.HILL_STATION, IMG.LAKE_CALM, IMG.GARDEN, IMG.MARKET_INDIA],
    kid:    LOCAL.HILL_STATION,
    parent: IMG.LAKE_CALM,
  },

  // ── India – Goa ─────────────────────────────────────────────────────────

  goa: {
    hero:   WIKI.GOA,
    photos: [LOCAL.BEACH_SUNSET, IMG.TEMPLE_INTERIOR, IMG.MOUNTAIN_VIEW, IMG.MARKET_INDIA],
    kid:    LOCAL.BEACH_SUNSET,
    parent: IMG.MOUNTAIN_VIEW,
  },

  // ── India – Gujarat ─────────────────────────────────────────────────────

  ahmedabad: {
    // Sabarmati Ashram + Old City Pols + Adalaj Stepwell
    hero:   IMG.INDIA_GATE,
    photos: [IMG.INDIA_GATE, IMG.TEMPLE_INTERIOR, IMG.GARDEN, IMG.MARKET_INDIA],
    kid:    LOCAL.MYSORE_PALACE_2,
    parent: IMG.GARDEN,
  },

  // ── India – Karnataka ───────────────────────────────────────────────────

  bangalore: {
    hero:   WIKI.BANGALORE,
    photos: [IMG.VIDHANA_SOUDHA, LOCAL.MYSORE_PALACE_2, IMG.GARDEN, IMG.MARKET_INDIA],
    kid:    IMG.WILDLIFE,
    parent: IMG.LAKE_CALM,
  },

  mysore: {
    // Mysore Palace — the ornate teal-and-gold interior is image 2 + 6
    hero:   LOCAL.MYSORE_PALACE_1,
    photos: [LOCAL.MYSORE_PALACE_1, LOCAL.MYSORE_PALACE_2, IMG.GARDEN, IMG.MARKET_INDIA],
    kid:    LOCAL.MYSORE_PALACE_2,
    parent: IMG.LAKE_CALM,
  },

  coorg: {
    // Madikeri Fort + Raja's Seat + coffee & spice estates
    hero:   LOCAL.HILL_STATION,
    photos: [LOCAL.HILL_STATION, IMG.MOUNTAIN_VIEW, IMG.GARDEN, IMG.MARKET_INDIA],
    kid:    IMG.MOUNTAIN_VIEW,
    parent: LOCAL.HILL_STATION,
  },

  hampi: {
    // Virupaksha Temple + boulder landscape ruins
    hero:   LOCAL.INDIA_RED_FORT,
    photos: [LOCAL.INDIA_RED_FORT, IMG.INDIA_GATE, IMG.MOUNTAIN_VIEW, IMG.MARKET_INDIA],
    kid:    LOCAL.INDIA_RED_FORT,
    parent: IMG.MOUNTAIN_VIEW,
  },

  // ── India – Tamil Nadu ──────────────────────────────────────────────────

  ooty: {
    // Botanical garden + toy train + tea estates + lake
    hero:   LOCAL.HILL_STATION,
    photos: [IMG.TOY_TRAIN, IMG.GARDEN, IMG.TEA_ESTATE, IMG.OOTY_LAKE],
    kid:    IMG.TOY_TRAIN,
    parent: LOCAL.HILL_STATION,
  },

  madurai: {
    // Meenakshi Amman Temple — one of India's grandest
    hero:   IMG.TEMPLE_INTERIOR,
    photos: [IMG.TEMPLE_INTERIOR, IMG.INDIA_GATE, IMG.GARDEN, IMG.MARKET_INDIA],
    kid:    IMG.TEMPLE_INTERIOR,
    parent: IMG.GARDEN,
  },

  mahabalipuram: {
    // Shore Temple + Arjuna's Penance + sculptures
    hero:   IMG.INDIA_GATE,
    photos: [IMG.INDIA_GATE, LOCAL.INDIA_RED_FORT, LOCAL.BEACH_SUNSET, IMG.MARKET_INDIA],
    kid:    LOCAL.BEACH_SUNSET,
    parent: LOCAL.INDIA_RED_FORT,
  },

  chennai: {
    // Marina Beach + Kapaleeshwarar Temple + Fort St. George
    hero:   IMG.INDIA_GATE,
    photos: [LOCAL.BEACH_SUNSET, IMG.TEMPLE_INTERIOR, IMG.MUSEUM, IMG.MARKET_INDIA],
    kid:    LOCAL.BEACH_SUNSET,
    parent: IMG.MUSEUM,
  },

  // ── India – Telangana / Andhra ──────────────────────────────────────────

  hyderabad: {
    // Charminar + Golconda Fort + Hussain Sagar
    hero:   LOCAL.INDIA_RED_FORT,
    photos: [LOCAL.INDIA_RED_FORT, LOCAL.MYSORE_PALACE_2, IMG.LAKE_CALM, IMG.MARKET_INDIA],
    kid:    LOCAL.MYSORE_PALACE_2,
    parent: IMG.LAKE_CALM,
  },

  tirupati: {
    // Tirumala hills + Venkateswara Temple (most visited religious site)
    hero:   LOCAL.HILL_STATION,
    photos: [IMG.TEMPLE_INTERIOR, LOCAL.HILL_STATION, IMG.GARDEN, IMG.MARKET_INDIA],
    kid:    IMG.TEMPLE_INTERIOR,
    parent: LOCAL.HILL_STATION,
  },

  // ── India – Odisha ──────────────────────────────────────────────────────

  bhubaneswar: {
    // Lingaraja Temple + Dhauli Peace Pagoda + Udayagiri caves
    hero:   IMG.TEMPLE_INTERIOR,
    photos: [IMG.TEMPLE_INTERIOR, LOCAL.INDIA_RED_FORT, IMG.GARDEN, IMG.MARKET_INDIA],
    kid:    LOCAL.INDIA_RED_FORT,
    parent: IMG.TEMPLE_INTERIOR,
  },

  // ── India – Kerala ──────────────────────────────────────────────────────

  kochi: {
    // Chinese fishing nets + Fort Kochi + Jewish Quarter
    hero:   IMG.RIVER_BACKWATER,
    photos: [IMG.RIVER_BACKWATER, IMG.TEMPLE_INTERIOR, LOCAL.BEACH_SUNSET, IMG.MARKET_INDIA],
    kid:    IMG.RIVER_BACKWATER,
    parent: LOCAL.BEACH_SUNSET,
  },

  kerala: {
    hero:   IMG.RIVER_BACKWATER,
    photos: [IMG.RIVER_BACKWATER, IMG.TEMPLE_INTERIOR, LOCAL.BEACH_SUNSET, IMG.MARKET_INDIA],
    kid:    IMG.RIVER_BACKWATER,
    parent: LOCAL.BEACH_SUNSET,
  },

  munnar: {
    // Tea estates + Top Station + Eravikulam National Park
    hero:   LOCAL.HILL_STATION,
    photos: [LOCAL.HILL_STATION, IMG.MOUNTAIN_VIEW, IMG.LAKE_CALM, IMG.MARKET_INDIA],
    kid:    IMG.MOUNTAIN_VIEW,
    parent: LOCAL.HILL_STATION,
  },

  alleppey: {
    // Backwaters + houseboats + Vembanad Lake
    hero:   IMG.RIVER_BACKWATER,
    photos: [IMG.RIVER_BACKWATER, IMG.LAKE_CALM, LOCAL.BEACH_SUNSET, IMG.MARKET_INDIA],
    kid:    IMG.RIVER_BACKWATER,
    parent: IMG.LAKE_CALM,
  },

  varkala: {
    // Cliff beach + Janardhana Swami Temple
    hero:   LOCAL.BEACH_SUNSET,
    photos: [LOCAL.BEACH_SUNSET, IMG.TEMPLE_INTERIOR, IMG.MOUNTAIN_VIEW, IMG.MARKET_INDIA],
    kid:    LOCAL.BEACH_SUNSET,
    parent: IMG.MOUNTAIN_VIEW,
  },

  pondicherry: {
    // French Quarter + Promenade Beach + Aurobindo Ashram
    hero:   IMG.INDIA_GATE,
    photos: [IMG.INDIA_GATE, IMG.TEMPLE_INTERIOR, LOCAL.BEACH_SUNSET, IMG.MARKET_INDIA],
    kid:    LOCAL.BEACH_SUNSET,
    parent: IMG.GARDEN,
  },

  // ── India – Jammu & Ladakh ──────────────────────────────────────────────

  "leh ladakh": {
    // Pangong Lake + Thiksey Monastery + Nubra Valley
    hero:   LOCAL.HILL_STATION,
    photos: [LOCAL.HILL_STATION, IMG.TEMPLE_INTERIOR, IMG.LAKE_CALM, IMG.MARKET_INDIA],
    kid:    LOCAL.HILL_STATION,
    parent: IMG.LAKE_CALM,
  },

  // ── India – Rajasthan (wildlife) ────────────────────────────────────────

  ranthambore: {
    // Tiger reserve + Ranthambore Fort
    hero:   IMG.WILDLIFE,
    photos: [LOCAL.INDIA_RED_FORT, IMG.WILDLIFE, IMG.GARDEN, IMG.MARKET_INDIA],
    kid:    IMG.WILDLIFE,
    parent: IMG.MOUNTAIN_VIEW,
  },

  // ── India – Andaman & Nicobar ───────────────────────────────────────────

  "andaman islands": {
    // Radhanagar Beach — one of Asia's best beaches
    hero:   LOCAL.BEACH_SUNSET,
    photos: [LOCAL.BEACH_SUNSET, IMG.INDIA_GATE, LOCAL.HAWAII_BEACH, LOCAL.BEACH_SUNSET],
    kid:    LOCAL.BEACH_SUNSET,
    parent: IMG.LAKE_CALM,
  },

  // ── India – Rajasthan (hill) ────────────────────────────────────────────

  "mount abu": {
    // Dilwara Jain Temples + Lake Nakki
    hero:   LOCAL.HILL_STATION,
    photos: [IMG.TEMPLE_INTERIOR, IMG.LAKE_CALM, IMG.GARDEN, LOCAL.HILL_STATION],
    kid:    IMG.LAKE_CALM,
    parent: LOCAL.HILL_STATION,
  },
};

// ─── Fallback pool ───────────────────────────────────────────────────────────
// Used only for destinations with no entry in CITY_BANKS.
// LOCAL.* photos are preferred as fallbacks over stock Unsplash.
const FALLBACK_POOL_GLOBAL = [
  LOCAL.PARIS_EIFFEL,                // real family at Eiffel Tower
  LOCAL.LONDON_BIGBEN,               // real family at Big Ben
  LOCAL.SF_GOLDEN_GATE,              // real family at Golden Gate
  LOCAL.YELLOWSTONE,                 // real family at national park
  LOCAL.BEACH_SUNSET,                // real family at beach
  u("1506973035872-a4ec16b8e8d9"),   // Sydney Opera House
  u("1477959858617-67f85cf4f1df"),   // Chicago Bean
  u("1491555103944-7c647fd857e6"),   // NYC skyline
  u("1580060839134-75a5edca2e99"),   // Cape Town Table Mountain
  u("1547471080-7cc2caa01a7e"),      // Safari / Africa
];

// India-appropriate fallback — used when we detect India destination but city not mapped
const FALLBACK_POOL_INDIA = [
  LOCAL.MYSORE_PALACE_2,    // real family at Indian palace (broadest India coverage)
  LOCAL.HILL_STATION,       // real Indian family at hills
  LOCAL.INDIA_RED_FORT,     // real family at Mughal fort
  LOCAL.MUMBAI_GATEWAY,     // real family at Gateway of India
  IMG.INDIA_GATE,
  IMG.RED_FORT,
  IMG.TAJ_MAHAL,
  IMG.TEMPLE_INTERIOR,
  IMG.MARKET_INDIA,
  IMG.TEA_ESTATE,
];

// ─── City key resolution ─────────────────────────────────────────────────────

export function isIndiaDestination(destination: string): boolean {
  const d = destination.toLowerCase();
  const indiaKeywords = [
    "india", "mumbai", "delhi", "bangalore", "bengaluru", "chennai",
    "kolkata", "hyderabad", "jaipur", "agra", "goa", "kerala", "rajasthan",
    "punjab", "gujarat", "maharashtra", "karnataka", "tamilnadu", "tamil nadu",
    "andhra", "telangana", "odisha", "himachal", "uttarakhand", "ladakh",
    "andaman", "pondicherry", "puducherry",
  ];
  return indiaKeywords.some(k => d.includes(k));
}

function resolveCityKey(destination: string): string | null {
  const d = destination.toLowerCase().trim();

  // Exact or alias matches — ordered longest-first to avoid partial collisions
  if (d.includes("new york") || d.includes("nyc") || d.includes("manhattan")) return "new york";
  if (d.includes("san francisco") || d.includes("golden gate")) return "san francisco";
  if (d.includes("cape town")) return "cape town";
  if (d.includes("leh") || d.includes("ladakh")) return "leh ladakh";
  if (d.includes("andaman")) return "andaman islands";
  if (d.includes("mount abu") || d.includes("mt abu")) return "mount abu";
  if (d.includes("mahabalipuram") || d.includes("mamallapuram")) return "mahabalipuram";
  if (d.includes("pondicherry") || d.includes("puducherry")) return "pondicherry";
  if (d.includes("agra") || d.includes("taj mahal")) return "agra";
  if (d.includes("jaipur") || d.includes("pink city") || d.includes("hawa mahal")) return "jaipur";
  if (d.includes("jodhpur") || d.includes("blue city")) return "jodhpur";
  if (d.includes("jaisalmer") || d.includes("golden city")) return "jaisalmer";
  if (d.includes("udaipur") || d.includes("lake city")) return "udaipur";
  if (d.includes("pushkar")) return "pushkar";
  if (d.includes("ranthambore")) return "ranthambore";
  if (d.includes("bikaner")) return "bikaner";
  if (d.includes("mount abu")) return "mount abu";
  if (d.includes("delhi") || d.includes("new delhi")) return "delhi";
  if (d.includes("amritsar") || d.includes("golden temple")) return "amritsar";
  if (d.includes("varanasi") || d.includes("benares") || d.includes("kashi")) return "varanasi";
  if (d.includes("rishikesh")) return "rishikesh";
  if (d.includes("manali")) return "manali";
  if (d.includes("shimla")) return "shimla";
  if (d.includes("darjeeling")) return "darjeeling";
  if (d.includes("kolkata") || d.includes("calcutta")) return "kolkata";
  if (d.includes("mumbai") || d.includes("bombay")) return "mumbai";
  if (d.includes("pune") || d.includes("poona")) return "pune";
  if (d.includes("lonavala") || d.includes("khandala")) return "lonavala";
  if (d.includes("goa")) return "goa";
  if (d.includes("ahmedabad")) return "ahmedabad";
  if (d.includes("bangalore") || d.includes("bengaluru")) return "bangalore";
  if (d.includes("mysore") || d.includes("mysuru")) return "mysore";
  if (d.includes("coorg") || d.includes("kodagu") || d.includes("madikeri")) return "coorg";
  if (d.includes("hampi")) return "hampi";
  if (d.includes("ooty") || d.includes("ootacamund") || d.includes("udhagamandalam")) return "ooty";
  if (d.includes("madurai")) return "madurai";
  if (d.includes("chennai") || d.includes("madras")) return "chennai";
  if (d.includes("tirupati") || d.includes("tirumala")) return "tirupati";
  if (d.includes("bhubaneswar") || d.includes("bhubaneshwar")) return "bhubaneswar";
  if (d.includes("hyderabad")) return "hyderabad";
  if (d.includes("munnar")) return "munnar";
  if (d.includes("alleppey") || d.includes("alappuzha")) return "alleppey";
  if (d.includes("varkala")) return "varkala";
  if (d.includes("kochi") || d.includes("cochin") || d.includes("ernakulam")) return "kochi";
  if (d.includes("kerala") || d.includes("trivandrum") || d.includes("thiruvananthapuram")) return "kerala";

  // ── USA city aliases ────────────────────────────────────────────────────
  if (d.includes("yellowstone")) return "yellowstone";
  if (d.includes("grand canyon")) return "grand canyon";
  if (d.includes("sedona")) return "sedona";
  if (d.includes("jackson hole") || d.includes("jackson, wy") || d.includes("teton")) return "jackson hole";
  if (d.includes("anchorage") || d.includes("alaska")) return "anchorage";
  if (d.includes("honolulu") || d.includes("oahu") || d.includes("waikiki")) return "honolulu";
  if (d.includes("big island") || d.includes("kona") || d.includes("hilo")) return "big island";
  if (d.includes("miami") || d.includes("south beach") || d.includes("brickell")) return "miami";
  if (d.includes("myrtle beach")) return "myrtle beach";

  // Direct key match (handles sydney, paris, london, chicago, rome, etc.)
  const firstCity = d.split(",")[0].trim();
  if (CITY_BANKS[firstCity]) return firstCity;

  return null;
}

// ─── Moment-type → photo-pool index (0–3) ───────────────────────────────────
const MOMENT_INDEX: Record<string, number> = {
  // 0 — landmark / discovery / historic
  discovery: 0, landmark: 0, historic_site: 0, architecture: 0, monument: 0,
  // 1 — water / museum / indoor
  wonder: 1, museum: 1, water: 1, boat: 1, aquarium: 1, indoor: 1, ride: 1,
  // 2 — outdoor / park / nature / viewpoint
  quiet: 2, quiet_break: 2, park: 2, viewpoint: 2, walk: 2, nature: 2, garden: 2, hike: 2,
  // 3 — food / market / street / fun
  fun: 3, food: 3, beach: 3, market: 3, street: 3, shopping: 3, entertainment: 3, playground: 3,
};

function momentIdx(type: string, photos: string[]): string {
  const explicit = MOMENT_INDEX[type];
  if (explicit !== undefined) return photos[explicit % photos.length];
  const h = type.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return photos[h % photos.length];
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Returns a stable, city-specific travel photo URL for a given destination + card type.
 *
 * Priority:
 *   1. Curated bank for the destination city (city-matched images)
 *   2. India-appropriate fallback pool (if India detected, no Western city photos)
 *   3. Global fallback pool (world cities mix)
 */
export function resolveUnsplashUrl(
  momentType: string,
  destination: string,
  _familyType: "indian" | "western"
): string {
  const key = resolveCityKey(destination);

  // ── Curated city bank ──
  if (key && CITY_BANKS[key]) {
    const bank = CITY_BANKS[key];
    if (momentType === "hero")                              return bank.hero;
    if (momentType === "kid" || momentType === "kid_memory") return bank.kid;
    if (momentType === "parent" || momentType === "parent_relief") return bank.parent;
    return momentIdx(momentType, bank.photos);
  }

  // ── India destination without a specific bank ──
  if (isIndiaDestination(destination)) {
    const seed = destination.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const offset = MOMENT_INDEX[momentType] ?? 1;
    return FALLBACK_POOL_INDIA[(seed + offset) % FALLBACK_POOL_INDIA.length];
  }

  // ── Unknown non-India destination ──
  const seed = destination.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  if (momentType === "hero")  return FALLBACK_POOL_GLOBAL[seed % FALLBACK_POOL_GLOBAL.length];
  if (momentType === "kid")   return FALLBACK_POOL_GLOBAL[(seed + 3) % FALLBACK_POOL_GLOBAL.length];
  if (momentType === "parent" || momentType === "parent_relief") {
    return FALLBACK_POOL_GLOBAL[(seed + 5) % FALLBACK_POOL_GLOBAL.length];
  }
  const offset = MOMENT_INDEX[momentType] ?? 1;
  return FALLBACK_POOL_GLOBAL[(seed + offset) % FALLBACK_POOL_GLOBAL.length];
}
