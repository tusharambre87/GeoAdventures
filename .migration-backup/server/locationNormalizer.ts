export const PREDEFINED_CITY_NAMES = [
  'addis ababa', 'amsterdam', 'athens', 'auckland', 'bangkok', 'beijing', 'berlin',
  'bogotá', 'bogota', 'brisbane', 'buenos aires', 'cairo', 'cape town', 'caracas',
  'chicago', 'delhi', 'dubai', 'fiji', 'johannesburg', 'lagos', 'lima', 'london',
  'los angeles', 'madrid', 'marrakesh', 'marrakech', 'melbourne', 'mexico city',
  'moscow', 'mumbai', 'nairobi', 'new york', 'new york city', 'paris', 'perth',
  'rio de janeiro', 'rome', 'san francisco', 'santiago', 'seoul', 'singapore',
  'sydney', 'tokyo', 'toronto', 'vancouver'
];

const US_STATE_ISLANDS: Record<string, string> = {
  'maui': 'Hawaii',
  'oahu': 'Hawaii',
  'kauai': 'Hawaii',
  'big island': 'Hawaii',
  'hawaii island': 'Hawaii',
  'lanai': 'Hawaii',
  'molokai': 'Hawaii',
  'honolulu': 'Hawaii',
  'waikiki': 'Hawaii',
  'hilo': 'Hawaii',
  'kona': 'Hawaii',
  'lahaina': 'Hawaii',
  'staten island': 'New York',
  'manhattan': 'New York',
  'brooklyn': 'New York',
  'queens': 'New York',
  'bronx': 'New York',
  'long island': 'New York',
  'key west': 'Florida',
  'miami beach': 'Florida',
  'martha\'s vineyard': 'Massachusetts',
  'nantucket': 'Massachusetts',
  'cape cod': 'Massachusetts',
  'catalina': 'California',
  'catalina island': 'California',
  'san juan island': 'Washington',
  'whidbey island': 'Washington',
  'mackinac island': 'Michigan',
  'block island': 'Rhode Island',
  'hilton head': 'South Carolina',
  'outer banks': 'North Carolina',
};

const US_MAJOR_CITIES: Record<string, string> = {
  'new york': 'New York',
  'new york city': 'New York',
  'nyc': 'New York',
  'los angeles': 'California',
  'la': 'California',
  'chicago': 'Illinois',
  'houston': 'Texas',
  'phoenix': 'Arizona',
  'philadelphia': 'Pennsylvania',
  'san antonio': 'Texas',
  'san diego': 'California',
  'dallas': 'Texas',
  'san jose': 'California',
  'austin': 'Texas',
  'san francisco': 'California',
  'seattle': 'Washington',
  'denver': 'Colorado',
  'boston': 'Massachusetts',
  'las vegas': 'Nevada',
  'portland': 'Oregon',
  'miami': 'Florida',
  'orlando': 'Florida',
  'atlanta': 'Georgia',
  'nashville': 'Tennessee',
  'new orleans': 'Louisiana',
  'washington dc': 'Washington D.C.',
  'washington d.c.': 'Washington D.C.',
  'dc': 'Washington D.C.',
};

const COUNTRY_CAPITALS: Record<string, { city: string; country: string }> = {
  'paris': { city: 'Paris', country: 'France' },
  'london': { city: 'London', country: 'United Kingdom' },
  'tokyo': { city: 'Tokyo', country: 'Japan' },
  'rome': { city: 'Rome', country: 'Italy' },
  'berlin': { city: 'Berlin', country: 'Germany' },
  'madrid': { city: 'Madrid', country: 'Spain' },
  'amsterdam': { city: 'Amsterdam', country: 'Netherlands' },
  'vienna': { city: 'Vienna', country: 'Austria' },
  'prague': { city: 'Prague', country: 'Czech Republic' },
  'dublin': { city: 'Dublin', country: 'Ireland' },
  'lisbon': { city: 'Lisbon', country: 'Portugal' },
  'brussels': { city: 'Brussels', country: 'Belgium' },
  'bangkok': { city: 'Bangkok', country: 'Thailand' },
  'singapore': { city: 'Singapore', country: 'Singapore' },
  'sydney': { city: 'Sydney', country: 'Australia' },
  'melbourne': { city: 'Melbourne', country: 'Australia' },
  'toronto': { city: 'Toronto', country: 'Canada' },
  'vancouver': { city: 'Vancouver', country: 'Canada' },
  'montreal': { city: 'Montreal', country: 'Canada' },
  'mexico city': { city: 'Mexico City', country: 'Mexico' },
  'cancun': { city: 'Cancun', country: 'Mexico' },
  'buenos aires': { city: 'Buenos Aires', country: 'Argentina' },
  'rio de janeiro': { city: 'Rio de Janeiro', country: 'Brazil' },
  'sao paulo': { city: 'São Paulo', country: 'Brazil' },
  'cairo': { city: 'Cairo', country: 'Egypt' },
  'dubai': { city: 'Dubai', country: 'UAE' },
  'mumbai': { city: 'Mumbai', country: 'India' },
  'delhi': { city: 'Delhi', country: 'India' },
  'beijing': { city: 'Beijing', country: 'China' },
  'shanghai': { city: 'Shanghai', country: 'China' },
  'hong kong': { city: 'Hong Kong', country: 'China' },
  'seoul': { city: 'Seoul', country: 'South Korea' },
};

export interface NormalizedLocation {
  stampName: string;
  stampId: string;
  displayName: string;
  city: string;
  state?: string;
  country: string;
  isUS: boolean;
}

function normalizeString(str: string): string {
  return str.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
}

function generateStampId(stampName: string, country: string): string {
  const cleanName = stampName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const cleanCountry = country.toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `custom_${cleanName}_${cleanCountry}`;
}

export function normalizeLocation(
  tripName: string,
  city: string | null | undefined,
  country: string,
  destination: string
): NormalizedLocation {
  const isUS = country === 'USA' || country === 'United States' || country === 'US';
  
  const cityLower = normalizeString(city || '');
  const destinationLower = normalizeString(destination);
  
  if (isUS) {
    for (const [place, state] of Object.entries(US_STATE_ISLANDS)) {
      if (cityLower.includes(place) || destinationLower.includes(place)) {
        return {
          stampName: state,
          stampId: generateStampId(state, 'USA'),
          displayName: state,
          city: state,
          state: state,
          country: 'USA',
          isUS: true,
        };
      }
    }
    
    for (const [place, state] of Object.entries(US_MAJOR_CITIES)) {
      if (cityLower.includes(place) || destinationLower.includes(place)) {
        const cityName = place.charAt(0).toUpperCase() + place.slice(1);
        const displayName = state === 'New York' && place.includes('new york') 
          ? 'New York' 
          : cityName;
        return {
          stampName: state,
          stampId: generateStampId(state, 'USA'),
          displayName: `${displayName}, ${state}`,
          city: displayName,
          state: state,
          country: 'USA',
          isUS: true,
        };
      }
    }
    
    if (city) {
      const cityName = city.split(',')[0].trim();
      const stateMatch = destination.match(/,\s*([A-Z]{2}|[A-Za-z\s]+)$/);
      const state = stateMatch ? stateMatch[1].trim() : city;
      
      return {
        stampName: state,
        stampId: generateStampId(state, 'USA'),
        displayName: state,
        city: cityName,
        state: state,
        country: 'USA',
        isUS: true,
      };
    }
    
    return {
      stampName: 'USA',
      stampId: generateStampId('USA', 'USA'),
      displayName: destination,
      city: destination,
      country: 'USA',
      isUS: true,
    };
  }
  
  for (const [place, info] of Object.entries(COUNTRY_CAPITALS)) {
    if (cityLower.includes(place) || destinationLower.includes(place)) {
      return {
        stampName: info.city,
        stampId: generateStampId(info.city, info.country),
        displayName: `${info.city}, ${info.country}`,
        city: info.city,
        country: info.country,
        isUS: false,
      };
    }
  }
  
  const cityName = city?.split(',')[0].trim() || destination.split(',')[0].trim();
  
  return {
    stampName: cityName,
    stampId: generateStampId(cityName, country),
    displayName: `${cityName}, ${country}`,
    city: cityName,
    country: country,
    isUS: false,
  };
}

export function shouldCreateCustomStamp(
  normalizedLocation: NormalizedLocation,
  existingCityIds: string[]
): boolean {
  const existingLower = existingCityIds.map(id => normalizeString(id));
  const stampLower = normalizeString(normalizedLocation.stampName);
  const cityLower = normalizeString(normalizedLocation.city);
  
  for (const existing of existingLower) {
    if (existing.includes(stampLower) || stampLower.includes(existing)) {
      return false;
    }
    if (existing.includes(cityLower) || cityLower.includes(existing)) {
      return false;
    }
  }
  
  return true;
}
