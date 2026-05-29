// Geo-Logical Pricing Configuration
// Pricing bands based on purchasing power, not discounts

export type PricingBand = 'A' | 'B' | 'C';

export interface PricingTier {
  band: PricingBand;
  currency: string;
  currencySymbol: string;
  annual: number;
  monthly: number;
  foundingAnnual: number;
  foundingMonthly: number;
  foundingCap: number;
  locale: string;
}

// Band A: US & Americas (USD)
const BAND_A_COUNTRIES = [
  'US', // United States
  'CA', // Canada
  'AU', // Australia
  'NZ', // New Zealand
  'SG', // Singapore
  'AE', // UAE
  'JP', // Japan
  'KR', // South Korea
  'HK', // Hong Kong
  'TW', // Taiwan
  'IL', // Israel
];

// Band B: Europe (EUR)
const BAND_B_COUNTRIES = [
  'GB', // United Kingdom
  'IE', // Ireland
  'DE', // Germany
  'FR', // France
  'NL', // Netherlands
  'BE', // Belgium
  'CH', // Switzerland
  'AT', // Austria
  'SE', // Sweden
  'NO', // Norway
  'DK', // Denmark
  'FI', // Finland
  'PL', // Poland
  'RO', // Romania
  'HU', // Hungary
  'BG', // Bulgaria
];

// Band C: India & Emerging Markets (INR)
const BAND_C_COUNTRIES = [
  // South Asia
  'IN', // India
  'PK', // Pakistan
  'BD', // Bangladesh
  'LK', // Sri Lanka
  'NP', // Nepal
  // Southeast Asia
  'ID', // Indonesia
  'PH', // Philippines
  'VN', // Vietnam
  'TH', // Thailand
  'MY', // Malaysia
  // Latin America
  'BR', // Brazil
  'MX', // Mexico
  'CO', // Colombia
  'CL', // Chile
  'AR', // Argentina
  'PE', // Peru
  // Africa
  'ZA', // South Africa
  'KE', // Kenya
  'NG', // Nigeria
  'GH', // Ghana
];

// Pricing tiers per band
export const PRICING_TIERS: Record<PricingBand, PricingTier> = {
  A: {
    band: 'A',
    currency: 'USD',
    currencySymbol: '$',
    annual: 69.99,
    monthly: 7.99,
    foundingAnnual: 39.99,
    foundingMonthly: 4.99,
    foundingCap: 200,
    locale: 'en-US',
  },
  B: {
    band: 'B',
    currency: 'EUR',
    currencySymbol: '€',
    annual: 49.99,
    monthly: 6.99,
    foundingAnnual: 34.99,
    foundingMonthly: 4.49,
    foundingCap: 200,
    locale: 'de-DE',
  },
  C: {
    band: 'C',
    currency: 'INR',
    currencySymbol: '₹',
    annual: 1299,
    monthly: 149,
    foundingAnnual: 699,
    foundingMonthly: 79,
    foundingCap: 500,
    locale: 'en-IN',
  },
};

// Get pricing band from country code
export function getPricingBandFromCountry(countryCode: string): PricingBand {
  const code = countryCode?.toUpperCase();
  if (BAND_A_COUNTRIES.includes(code)) return 'A';
  if (BAND_B_COUNTRIES.includes(code)) return 'B';
  if (BAND_C_COUNTRIES.includes(code)) return 'C';
  // Default to Band A for unknown countries
  return 'A';
}

// Get currency for a country
export function getCurrencyFromCountry(countryCode: string): string {
  const band = getPricingBandFromCountry(countryCode);
  return PRICING_TIERS[band].currency;
}

// Get the pricing tier for a band
export function getPricingTier(band: PricingBand): PricingTier {
  return PRICING_TIERS[band];
}

// Format price with currency symbol
export function formatPrice(amount: number, band: PricingBand): string {
  const tier = PRICING_TIERS[band];
  const hasDecimals = amount % 1 !== 0;
  return new Intl.NumberFormat(tier.locale, {
    style: 'currency',
    currency: tier.currency,
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  }).format(amount);
}

// Get all pricing info for a user's band
export function getUserPricing(band: PricingBand): {
  annual: string;
  monthly: string;
  foundingAnnual: string;
  foundingMonthly: string;
  currency: string;
  currencySymbol: string;
  foundingCap: number;
  rawPrices: {
    annual: number;
    monthly: number;
    foundingAnnual: number;
    foundingMonthly: number;
  };
} {
  const tier = PRICING_TIERS[band];
  return {
    annual: formatPrice(tier.annual, band),
    monthly: formatPrice(tier.monthly, band),
    foundingAnnual: formatPrice(tier.foundingAnnual, band),
    foundingMonthly: formatPrice(tier.foundingMonthly, band),
    currency: tier.currency,
    currencySymbol: tier.currencySymbol,
    foundingCap: tier.foundingCap,
    rawPrices: {
      annual: tier.annual,
      monthly: tier.monthly,
      foundingAnnual: tier.foundingAnnual,
      foundingMonthly: tier.foundingMonthly,
    },
  };
}

// Country code to full country name (for display)
export const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States',
  CA: 'Canada',
  GB: 'United Kingdom',
  IE: 'Ireland',
  DE: 'Germany',
  FR: 'France',
  NL: 'Netherlands',
  BE: 'Belgium',
  CH: 'Switzerland',
  AT: 'Austria',
  SE: 'Sweden',
  NO: 'Norway',
  DK: 'Denmark',
  FI: 'Finland',
  AU: 'Australia',
  NZ: 'New Zealand',
  SG: 'Singapore',
  AE: 'United Arab Emirates',
  JP: 'Japan',
  KR: 'South Korea',
  HK: 'Hong Kong',
  TW: 'Taiwan',
  IL: 'Israel',
  IN: 'India',
  PK: 'Pakistan',
  BD: 'Bangladesh',
  LK: 'Sri Lanka',
  NP: 'Nepal',
  ID: 'Indonesia',
  PH: 'Philippines',
  VN: 'Vietnam',
  TH: 'Thailand',
  MY: 'Malaysia',
  BR: 'Brazil',
  MX: 'Mexico',
  CO: 'Colombia',
  CL: 'Chile',
  AR: 'Argentina',
  PE: 'Peru',
  ZA: 'South Africa',
  KE: 'Kenya',
  NG: 'Nigeria',
  GH: 'Ghana',
  PL: 'Poland',
  RO: 'Romania',
  HU: 'Hungary',
  BG: 'Bulgaria',
};

// Check if a country is in our supported list
export function isKnownCountry(countryCode: string): boolean {
  const code = countryCode?.toUpperCase();
  return (
    BAND_A_COUNTRIES.includes(code) ||
    BAND_B_COUNTRIES.includes(code) ||
    BAND_C_COUNTRIES.includes(code)
  );
}

// Get the Stripe price ID for a band and billing period
// These will be set up in Stripe and stored here
export const STRIPE_PRICE_IDS: Record<PricingBand, { annual: string; monthly: string; foundingAnnual: string }> = {
  A: {
    annual: process.env.STRIPE_PRICE_BAND_A_ANNUAL || '',
    monthly: process.env.STRIPE_PRICE_BAND_A_MONTHLY || '',
    foundingAnnual: process.env.STRIPE_PRICE_BAND_A_FOUNDING || '',
  },
  B: {
    annual: process.env.STRIPE_PRICE_BAND_B_ANNUAL || '',
    monthly: process.env.STRIPE_PRICE_BAND_B_MONTHLY || '',
    foundingAnnual: process.env.STRIPE_PRICE_BAND_B_FOUNDING || '',
  },
  C: {
    annual: process.env.STRIPE_PRICE_BAND_C_ANNUAL || '',
    monthly: process.env.STRIPE_PRICE_BAND_C_MONTHLY || '',
    foundingAnnual: process.env.STRIPE_PRICE_BAND_C_FOUNDING || '',
  },
};
