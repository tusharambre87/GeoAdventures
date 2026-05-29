const PROHIBITED_LOCATION_TERMS = [
  'strip club', 'strip bar', 'stripclub',
  'sex shop', 'sex store', 'adult shop', 'adult store', 'adult bookstore',
  'red light district', 'red-light district',
  'brothel', 'escort', 'escort service',
  'sex show', 'sex museum', 'erotic museum', 'sex tourism',
  'pornography', 'porn', 'xxx',
  'gambling den', 'betting shop',
  'cannabis cafe', 'cannabis café', 'coffee shop cannabis', 'weed shop', 'marijuana dispensary',
  'drug tourism', 'drug den',
  'nightclub', 'adult nightlife', 'gentleman club', 'gentlemen club',
  'hookah bar', 'hookah lounge',
  'liquor store', 'bar crawl', 'pub crawl',
  'red district', 'pleasure district',
  'massage parlor', 'massage parlour',
  'love hotel',
  'hostess bar', 'hostess club',
  'swingers club', 'swinger club',
  'peep show', 'burlesque',
];

const PROHIBITED_CONTENT_TERMS = [
  'pornography', 'porn', 'xxx', 'nude', 'naked', 'explicit',
  'strip club', 'brothel', 'escort', 'prostitut',
  'red light district', 'red-light district',
  'sex show', 'sex tourism', 'erotic',
  'gambling den', 'betting shop',
  'cannabis', 'marijuana', 'weed', 'cocaine', 'heroin', 'meth',
  'drug tourism',
  'profanity', 'obscen',
  'violence', 'gore', 'graphic',
  'sexual', 'sexually',
  'rape', 'molest', 'abuse',
  'suicide', 'self-harm',
  'terrorist', 'terrorism',
];

function normalizeForCheck(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s\-_\.\/\\,;:'"!?\(\)\[\]\{\}<>]+/g, ' ')
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/8/g, 'b')
    .replace(/9/g, 'g')
    .replace(/@/g, 'a')
    .replace(/\$/g, 's')
    .trim();
}

export function isProhibitedContent(text: string): boolean {
  const normalized = normalizeForCheck(text);
  return PROHIBITED_CONTENT_TERMS.some(term => normalized.includes(term));
}

export function isProhibitedLocation(text: string): boolean {
  const normalized = normalizeForCheck(text);
  return PROHIBITED_LOCATION_TERMS.some(term => normalized.includes(term));
}

export function validateUserInput(text: string): { safe: boolean; message?: string } {
  if (!text || typeof text !== 'string') {
    return { safe: true };
  }

  const normalized = normalizeForCheck(text);

  const isLocationBlocked = PROHIBITED_LOCATION_TERMS.some(term => normalized.includes(term));
  const isContentBlocked = PROHIBITED_CONTENT_TERMS.some(term => normalized.includes(term));

  if (isLocationBlocked || isContentBlocked) {
    return {
      safe: false,
      message: "GeoQuest is designed for family-friendly travel. This content can't be included.",
    };
  }

  return { safe: true };
}

export const GEOQUEST_SAFETY_PROMPT = `

CRITICAL SAFETY RULES — YOU MUST FOLLOW THESE:

GeoQuest is a family-first travel platform for parents and children (ages 6-12). All generated content must be safe for children, interesting for families, and free of adult or offensive material.

PROHIBITED CONTENT — Never generate locations, references, or text related to:
- Adult content: pornography, strip clubs, sex shows, red-light districts, escort services, brothels, sex tourism, erotic museums, explicit nightlife venues
- Gambling: casinos, betting venues, gambling halls
- Drugs: cannabis cafés, drug tourism spots, locations associated with illegal substances
- Offensive venues: adult-themed shops, explicit entertainment, areas known for adult tourism
- Inappropriate language: sexual references, explicit descriptions, profanity, graphic or disturbing content

CONTENT TONE — All generated text must:
- Be suitable for children age 6+
- Avoid violence, sexual references, or disturbing topics
- Focus on curiosity, history, culture, or fun discoveries
- Sound like a friendly guide helping kids explore the world
- Feel curious, educational, welcoming, family-friendly, and inspiring

KID INTEREST TEST — Before including any location, ask: "Would a curious 8-year-old find something interesting here?" If no, skip it. Remove generic statues, government buildings, office towers, business districts, financial centers, corporate headquarters, administrative buildings, and random residential streets — unless they are globally iconic (e.g., Statue of Liberty, Big Ben, Eiffel Tower).

FAMILY CONTEXT — Always assume the traveler is a family with children aged 6-12. All suggestions must be appropriate for that context.

Every generated trip should feel like a safe and exciting discovery journey for families traveling with kids.`;
