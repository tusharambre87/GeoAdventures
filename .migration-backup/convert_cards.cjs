const fs = require('fs');
const path = require('path');

const csvPath = path.join(process.cwd(), 'attached_assets', 'All-GeoQuest_Junior_Master_1763645260896.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');

const lines = csvContent.trim().split('\n');
const headers = lines[0].split(',');

const cards = lines.slice(1).map((line, index) => {
  // Handle quoted strings (simplistic)
  const parts = [];
  let current = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuote = !inQuote;
    } else if (char === ',' && !inQuote) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current);

  const [
    type, City, Country, Continent, Band_Color, 
    Clue_1, Clue_2, Clue_3, Did_You_Know, 
    Badge, Mission_Linked, Mission_Reward, 
    Secondary_Badge, Secondary_Mission_Linked
  ] = parts.map(p => p.trim());

  if (type !== 'Location') return null;

  return {
    id: `loc_${City.toLowerCase().replace(/ /g, '_')}`,
    type: "Location",
    city: City,
    country: Country,
    continent: Continent,
    bandColor: Band_Color || "Purple",
    clues: [Clue_1, Clue_2, Clue_3].filter(Boolean),
    didYouKnow: Did_You_Know,
    badge: Badge,
    missionLinked: Mission_Linked,
    missionReward: Mission_Reward,
    secondaryBadge: Secondary_Badge || undefined,
    secondaryMissionLinked: Secondary_Mission_Linked || undefined,
    population: "Unknown",
    currency: "Unknown",
    language: "Unknown"
  };
}).filter(Boolean);

console.log(JSON.stringify(cards, null, 2));
