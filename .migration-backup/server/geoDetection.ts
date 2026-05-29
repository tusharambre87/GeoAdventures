// Geo Detection Service
// Detects user's country using IP + locale + timezone for maximum accuracy

import { PricingBand, getPricingBandFromCountry, getCurrencyFromCountry } from '../shared/geoPricing';

interface GeoDetectionResult {
  countryCode: string;
  pricingBand: PricingBand;
  billingCurrency: string;
  confidence: 'high' | 'medium' | 'low';
  source: 'ip' | 'timezone' | 'locale' | 'default';
}

interface IpInfoResponse {
  ip: string;
  city: string;
  region: string;
  country: string;
  loc: string;
  org: string;
  postal: string;
  timezone: string;
}

// Timezone to country mapping (common timezones)
const TIMEZONE_TO_COUNTRY: Record<string, string> = {
  // Americas
  'America/New_York': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Los_Angeles': 'US',
  'America/Toronto': 'CA',
  'America/Vancouver': 'CA',
  'America/Sao_Paulo': 'BR',
  'America/Mexico_City': 'MX',
  'America/Buenos_Aires': 'AR',
  'America/Lima': 'PE',
  'America/Bogota': 'CO',
  'America/Santiago': 'CL',
  // Europe
  'Europe/London': 'GB',
  'Europe/Dublin': 'IE',
  'Europe/Paris': 'FR',
  'Europe/Berlin': 'DE',
  'Europe/Amsterdam': 'NL',
  'Europe/Brussels': 'BE',
  'Europe/Zurich': 'CH',
  'Europe/Vienna': 'AT',
  'Europe/Stockholm': 'SE',
  'Europe/Oslo': 'NO',
  'Europe/Copenhagen': 'DK',
  'Europe/Helsinki': 'FI',
  'Europe/Warsaw': 'PL',
  'Europe/Bucharest': 'RO',
  'Europe/Budapest': 'HU',
  'Europe/Sofia': 'BG',
  // Asia
  'Asia/Tokyo': 'JP',
  'Asia/Seoul': 'KR',
  'Asia/Singapore': 'SG',
  'Asia/Hong_Kong': 'HK',
  'Asia/Taipei': 'TW',
  'Asia/Dubai': 'AE',
  'Asia/Jerusalem': 'IL',
  'Asia/Kolkata': 'IN',
  'Asia/Mumbai': 'IN',
  'Asia/Karachi': 'PK',
  'Asia/Dhaka': 'BD',
  'Asia/Colombo': 'LK',
  'Asia/Kathmandu': 'NP',
  'Asia/Jakarta': 'ID',
  'Asia/Manila': 'PH',
  'Asia/Ho_Chi_Minh': 'VN',
  'Asia/Bangkok': 'TH',
  'Asia/Kuala_Lumpur': 'MY',
  // Oceania
  'Australia/Sydney': 'AU',
  'Australia/Melbourne': 'AU',
  'Australia/Perth': 'AU',
  'Pacific/Auckland': 'NZ',
  // Africa
  'Africa/Johannesburg': 'ZA',
  'Africa/Nairobi': 'KE',
  'Africa/Lagos': 'NG',
  'Africa/Accra': 'GH',
};

// Locale to country mapping (from browser locale)
const LOCALE_TO_COUNTRY: Record<string, string> = {
  'en-US': 'US',
  'en-CA': 'CA',
  'en-GB': 'GB',
  'en-IE': 'IE',
  'en-AU': 'AU',
  'en-NZ': 'NZ',
  'en-IN': 'IN',
  'en-SG': 'SG',
  'en-ZA': 'ZA',
  'en-PH': 'PH',
  'de-DE': 'DE',
  'de-AT': 'AT',
  'de-CH': 'CH',
  'fr-FR': 'FR',
  'fr-CA': 'CA',
  'fr-BE': 'BE',
  'fr-CH': 'CH',
  'nl-NL': 'NL',
  'nl-BE': 'BE',
  'sv-SE': 'SE',
  'nb-NO': 'NO',
  'nn-NO': 'NO',
  'da-DK': 'DK',
  'fi-FI': 'FI',
  'ja-JP': 'JP',
  'ko-KR': 'KR',
  'zh-TW': 'TW',
  'zh-HK': 'HK',
  'zh-SG': 'SG',
  'he-IL': 'IL',
  'ar-AE': 'AE',
  'hi-IN': 'IN',
  'ur-PK': 'PK',
  'bn-BD': 'BD',
  'si-LK': 'LK',
  'ne-NP': 'NP',
  'id-ID': 'ID',
  'tl-PH': 'PH',
  'vi-VN': 'VN',
  'th-TH': 'TH',
  'ms-MY': 'MY',
  'pt-BR': 'BR',
  'es-MX': 'MX',
  'es-CO': 'CO',
  'es-CL': 'CL',
  'es-AR': 'AR',
  'es-PE': 'PE',
  'pl-PL': 'PL',
  'ro-RO': 'RO',
  'hu-HU': 'HU',
  'bg-BG': 'BG',
  'sw-KE': 'KE',
  'yo-NG': 'NG',
};

// Extract client IP from request headers (handles proxies)
export function extractClientIp(req: { headers: Record<string, string | string[] | undefined>; ip?: string; connection?: { remoteAddress?: string } }): string | null {
  // Check common proxy headers
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor).split(',');
    return ips[0].trim();
  }
  
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }
  
  // Fallback to connection IP
  if (req.ip) return req.ip;
  if (req.connection?.remoteAddress) return req.connection.remoteAddress;
  
  return null;
}

// Get country from IP using ipinfo.io (free tier: 50k requests/month)
async function getCountryFromIp(ip: string): Promise<string | null> {
  // Skip local/private IPs
  if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    return null;
  }
  
  try {
    const response = await fetch(`https://ipinfo.io/${ip}/json`, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error(`ipinfo.io error: ${response.status}`);
      return null;
    }
    
    const data = await response.json() as IpInfoResponse;
    return data.country || null;
  } catch (error) {
    console.error('Failed to fetch IP info:', error);
    return null;
  }
}

// Get country from timezone
function getCountryFromTimezone(timezone: string | null | undefined): string | null {
  if (!timezone) return null;
  return TIMEZONE_TO_COUNTRY[timezone] || null;
}

// Get country from locale
function getCountryFromLocale(locale: string | null | undefined): string | null {
  if (!locale) return null;
  
  // Try exact match first
  if (LOCALE_TO_COUNTRY[locale]) {
    return LOCALE_TO_COUNTRY[locale];
  }
  
  // Try with normalized format (e.g., en_US -> en-US)
  const normalized = locale.replace('_', '-');
  if (LOCALE_TO_COUNTRY[normalized]) {
    return LOCALE_TO_COUNTRY[normalized];
  }
  
  // Try to extract country code from locale (e.g., en-US -> US)
  const parts = normalized.split('-');
  if (parts.length >= 2) {
    const countryCode = parts[parts.length - 1].toUpperCase();
    if (countryCode.length === 2) {
      return countryCode;
    }
  }
  
  return null;
}

// Main detection function - combines IP, timezone, and locale
export async function detectUserGeo(options: {
  ip?: string | null;
  timezone?: string | null;
  locale?: string | null;
}): Promise<GeoDetectionResult> {
  const { ip, timezone, locale } = options;
  
  // Try IP-based detection first (highest accuracy)
  if (ip) {
    const ipCountry = await getCountryFromIp(ip);
    if (ipCountry) {
      return {
        countryCode: ipCountry,
        pricingBand: getPricingBandFromCountry(ipCountry),
        billingCurrency: getCurrencyFromCountry(ipCountry),
        confidence: 'high',
        source: 'ip',
      };
    }
  }
  
  // Fallback to timezone
  const tzCountry = getCountryFromTimezone(timezone);
  if (tzCountry) {
    // If locale also matches, increase confidence
    const localeCountry = getCountryFromLocale(locale);
    const confidence = localeCountry === tzCountry ? 'high' : 'medium';
    
    return {
      countryCode: tzCountry,
      pricingBand: getPricingBandFromCountry(tzCountry),
      billingCurrency: getCurrencyFromCountry(tzCountry),
      confidence,
      source: 'timezone',
    };
  }
  
  // Fallback to locale
  const localeCountry = getCountryFromLocale(locale);
  if (localeCountry) {
    return {
      countryCode: localeCountry,
      pricingBand: getPricingBandFromCountry(localeCountry),
      billingCurrency: getCurrencyFromCountry(localeCountry),
      confidence: 'medium',
      source: 'locale',
    };
  }
  
  // Default to Band A (US) if all detection fails
  return {
    countryCode: 'US',
    pricingBand: 'A',
    billingCurrency: 'USD',
    confidence: 'low',
    source: 'default',
  };
}

// Quick sync detection (no IP lookup, faster)
export function detectUserGeoSync(options: {
  timezone?: string | null;
  locale?: string | null;
}): GeoDetectionResult {
  const { timezone, locale } = options;
  
  // Try timezone first
  const tzCountry = getCountryFromTimezone(timezone);
  if (tzCountry) {
    const localeCountry = getCountryFromLocale(locale);
    const confidence = localeCountry === tzCountry ? 'high' : 'medium';
    
    return {
      countryCode: tzCountry,
      pricingBand: getPricingBandFromCountry(tzCountry),
      billingCurrency: getCurrencyFromCountry(tzCountry),
      confidence,
      source: 'timezone',
    };
  }
  
  // Fallback to locale
  const localeCountry = getCountryFromLocale(locale);
  if (localeCountry) {
    return {
      countryCode: localeCountry,
      pricingBand: getPricingBandFromCountry(localeCountry),
      billingCurrency: getCurrencyFromCountry(localeCountry),
      confidence: 'medium',
      source: 'locale',
    };
  }
  
  // Default to Band A
  return {
    countryCode: 'US',
    pricingBand: 'A',
    billingCurrency: 'USD',
    confidence: 'low',
    source: 'default',
  };
}
