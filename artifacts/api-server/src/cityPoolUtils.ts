/**
 * Canonical city pool key construction — single source of truth for all
 * city_stop_pool_cache reads and writes.
 *
 * Normalizes city name (strips commas, collapses spaces, removes country
 * suffix) and country (collapses US/UK/UAE variants) so that pools seeded with
 * "Washington DC" / "USA" are found when a trip passes "Washington, DC" / "US".
 */
export function buildCityPoolKey(city: string, country: string): string {
  const normalizedCity = (city ?? '')
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/,/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*(usa|us|united states)$/i, '')
    .trim();

  const lower = (country ?? '').toLowerCase().trim();
  let normalizedCountry: string;
  if (!lower) {
    normalizedCountry = '';
  } else if (lower === 'united states' || lower === 'us' || lower === 'united states of america' || lower === 'usa') {
    normalizedCountry = 'usa';
  } else if (lower === 'united kingdom' || lower === 'great britain' || lower === 'uk') {
    normalizedCountry = 'uk';
  } else if (lower === 'united arab emirates' || lower === 'uae') {
    normalizedCountry = 'uae';
  } else {
    normalizedCountry = lower;
  }

  return `${normalizedCity}:${normalizedCountry}`;
}
