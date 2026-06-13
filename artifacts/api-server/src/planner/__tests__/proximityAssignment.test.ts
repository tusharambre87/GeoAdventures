import { describe, it, expect } from 'vitest';
import { haversineDist, assignSuggestionsByProximity } from '../proximityAssignment.js';
import type { GeneratedStop } from '../plannerService.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal GeneratedStop with just the fields the proximity logic
 * touches.  All other required fields are filled with sentinel values so the
 * type checker is satisfied without coupling the test to the full interface.
 */
function makeStop(
  overrides: Partial<GeneratedStop> & { dayNumber: number },
): GeneratedStop {
  return {
    dayNumber: overrides.dayNumber,
    displayOrder: overrides.displayOrder ?? 0,
    name: overrides.name ?? 'Test Stop',
    type: overrides.type ?? 'attraction',
    durationMinutes: 60,
    effortLevel: 'low',
    indoorOutdoor: 'both',
    sensoryLoad: 'low',
    familyAnchorType: 'anchor',
    minAge: 0,
    whyNow: '',
    latitude: overrides.latitude,
    longitude: overrides.longitude,
    parentSupportData: {
      breakSuggestion: '',
      foodSuggestion: '',
      keepGoingSuggestion: '',
      moreFunSuggestion: '',
      shortenSuggestion: '',
    },
    placeReferenceData: {
      directionsNote: '',
      openingHours: '',
      priceRange: '',
      bookingRequired: false,
    },
    placeProfileData: {
      whyItWorks: '',
      bathroomNotes: '',
      foodOptions: '',
      parkingNotes: '',
      bestTimeOfDay: '',
      weatherSensitive: false,
      strollerFriendly: true,
      nearbyStops: [],
      practicalTips: [],
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// haversineDist
// ---------------------------------------------------------------------------

describe('haversineDist', () => {
  it('returns 0 for identical points', () => {
    expect(haversineDist(40.7128, -74.006, 40.7128, -74.006)).toBe(0);
  });

  it('returns roughly the correct distance between NYC and London (~5571 km)', () => {
    const dist = haversineDist(40.7128, -74.006, 51.5074, -0.1278);
    expect(dist).toBeCloseTo(5571, -2); // within ±100 km
  });

  it('is symmetric', () => {
    const ab = haversineDist(37.7749, -122.4194, 34.0522, -118.2437);
    const ba = haversineDist(34.0522, -118.2437, 37.7749, -122.4194);
    expect(ab).toBeCloseTo(ba, 6);
  });
});

// ---------------------------------------------------------------------------
// assignSuggestionsByProximity — happy path (3 days, known city clusters)
// ---------------------------------------------------------------------------

describe('assignSuggestionsByProximity', () => {
  // Day 1 — NYC area (~40.75, -73.98)
  // Day 2 — Los Angeles area (~34.05, -118.25)
  // Day 3 — Chicago area (~41.88, -87.63)

  const selectedStops = [
    // Day 1 — NYC
    makeStop({ dayNumber: 1, name: 'Central Park', latitude: '40.7851', longitude: '-73.9683' }),
    makeStop({ dayNumber: 1, name: 'Times Square', latitude: '40.7580', longitude: '-73.9855', displayOrder: 1 }),
    // Day 2 — Los Angeles
    makeStop({ dayNumber: 2, name: 'Griffith Observatory', latitude: '34.1184', longitude: '-118.3004' }),
    makeStop({ dayNumber: 2, name: 'Santa Monica Pier', latitude: '34.0095', longitude: '-118.4975', displayOrder: 1 }),
    // Day 3 — Chicago
    makeStop({ dayNumber: 3, name: 'Millennium Park', latitude: '41.8827', longitude: '-87.6233' }),
    makeStop({ dayNumber: 3, name: 'Navy Pier', latitude: '41.8917', longitude: '-87.6086', displayOrder: 1 }),
  ];

  // Parent suggestions — each geographically pinned to a clear city
  const suggestionNYC = makeStop({
    dayNumber: 1,
    name: 'The High Line',
    latitude: '40.7480',
    longitude: '-74.0048',
  });
  const suggestionLA = makeStop({
    dayNumber: 1, // wrong day — the assignment logic should override this
    name: 'Getty Center',
    latitude: '34.0780',
    longitude: '-118.4741',
  });
  const suggestionChicago = makeStop({
    dayNumber: 1,
    name: 'Art Institute of Chicago',
    latitude: '41.8796',
    longitude: '-87.6237',
  });

  it('assigns each suggestion to the day matching its city', () => {
    const result = assignSuggestionsByProximity(selectedStops, [suggestionNYC, suggestionLA, suggestionChicago], 3);

    // Day keys are 0-based strings
    const day0 = result['0'].map(s => s.name);
    const day1 = result['1'].map(s => s.name);
    const day2 = result['2'].map(s => s.name);

    expect(day0).toContain('The High Line');     // NYC → day 0 (dayNumber 1 − 1)
    expect(day1).toContain('Getty Center');      // LA  → day 1 (dayNumber 2 − 1)
    expect(day2).toContain('Art Institute of Chicago'); // Chicago → day 2
  });

  it('initialises an empty array for every day, even days with no suggestions', () => {
    const result = assignSuggestionsByProximity(selectedStops, [suggestionNYC], 3);

    expect(result).toHaveProperty('0');
    expect(result).toHaveProperty('1');
    expect(result).toHaveProperty('2');
    expect(result['1']).toEqual([]);
    expect(result['2']).toEqual([]);
  });

  it('no suggestion appears on more than one day', () => {
    const result = assignSuggestionsByProximity(selectedStops, [suggestionNYC, suggestionLA, suggestionChicago], 3);

    const allAssigned = Object.values(result).flat().map(s => s.name);
    const unique = new Set(allAssigned);
    expect(unique.size).toBe(allAssigned.length);
  });

  // ---------------------------------------------------------------------------
  // Fallback: no coordinates → day 0
  // ---------------------------------------------------------------------------

  it('falls back to day 0 when latitude is missing', () => {
    const noLatSuggestion = makeStop({ dayNumber: 2, name: 'Mystery Spot' });
    const result = assignSuggestionsByProximity(selectedStops, [noLatSuggestion], 3);
    expect(result['0'].map(s => s.name)).toContain('Mystery Spot');
    expect(result['1']).toEqual([]);
    expect(result['2']).toEqual([]);
  });

  it('falls back to day 0 when coordinates are empty strings', () => {
    const emptyCoordSuggestion = makeStop({
      dayNumber: 2,
      name: 'Ghost Stop',
      latitude: '',
      longitude: '',
    });
    const result = assignSuggestionsByProximity(selectedStops, [emptyCoordSuggestion], 3);
    expect(result['0'].map(s => s.name)).toContain('Ghost Stop');
  });

  it('falls back to day 0 when latitude is a non-numeric string', () => {
    const badCoordSuggestion = makeStop({
      dayNumber: 2,
      name: 'Bad Coord Stop',
      latitude: 'not-a-number',
      longitude: '-87.6',
    });
    const result = assignSuggestionsByProximity(selectedStops, [badCoordSuggestion], 3);
    expect(result['0'].map(s => s.name)).toContain('Bad Coord Stop');
  });

  // ---------------------------------------------------------------------------
  // Edge: selectedStops has no parseable coordinates → all suggestions day 0
  // ---------------------------------------------------------------------------

  it('assigns all suggestions to day 0 when no planned stops have coordinates', () => {
    const noCoordPlanned = [
      makeStop({ dayNumber: 1, name: 'Coordless Stop A' }),
      makeStop({ dayNumber: 2, name: 'Coordless Stop B' }),
    ];
    const result = assignSuggestionsByProximity(
      noCoordPlanned,
      [suggestionNYC, suggestionLA],
      2,
    );
    expect(result['0'].length).toBe(2);
    expect(result['1']).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // Edge: empty suggestions array → all day buckets are empty
  // ---------------------------------------------------------------------------

  it('returns all empty day buckets when suggestions array is empty', () => {
    const result = assignSuggestionsByProximity(selectedStops, [], 3);
    expect(result['0']).toEqual([]);
    expect(result['1']).toEqual([]);
    expect(result['2']).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // Multi-suggestion same city — all should land on the same day
  // ---------------------------------------------------------------------------

  it('assigns multiple close-by suggestions to the same day', () => {
    const suggNYC2 = makeStop({
      dayNumber: 1,
      name: 'Brooklyn Bridge',
      latitude: '40.7061',
      longitude: '-73.9969',
    });
    const result = assignSuggestionsByProximity(selectedStops, [suggestionNYC, suggNYC2], 3);
    expect(result['0'].length).toBe(2);
    expect(result['1']).toEqual([]);
    expect(result['2']).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// assignSuggestionsByProximity — multi-city trips (4 days, 2 cities)
//
// Scenario: days 1–2 are in Paris, days 3–4 are in Tokyo.
// Suggestions near Paris must land only on days 0–1 (0-based);
// suggestions near Tokyo must land only on days 2–3.
// This guards against city-bleed: stops from one city must not migrate onto
// days that belong to a different city.
// ---------------------------------------------------------------------------

describe('assignSuggestionsByProximity — multi-city trips', () => {
  // Paris cluster (~48.86, 2.35)
  const parisStops = [
    makeStop({ dayNumber: 1, name: 'Notre-Dame',  latitude: '48.8530', longitude: '2.3499' }),
    makeStop({ dayNumber: 1, name: 'Champs-Elysees', latitude: '48.8698', longitude: '2.3078', displayOrder: 1 }),
    makeStop({ dayNumber: 2, name: 'Musee d Orsay', latitude: '48.8600', longitude: '2.3266' }),
    makeStop({ dayNumber: 2, name: 'Montmartre',    latitude: '48.8867', longitude: '2.3431', displayOrder: 1 }),
  ];

  // Tokyo cluster (~35.68, 139.69)
  const tokyoStops = [
    makeStop({ dayNumber: 3, name: 'Shinjuku Gyoen',  latitude: '35.6852', longitude: '139.7100' }),
    makeStop({ dayNumber: 3, name: 'Meiji Shrine',    latitude: '35.6763', longitude: '139.6993', displayOrder: 1 }),
    makeStop({ dayNumber: 4, name: 'Ueno Park',       latitude: '35.7146', longitude: '139.7713' }),
    makeStop({ dayNumber: 4, name: 'Asakusa Temple',  latitude: '35.7148', longitude: '139.7967', displayOrder: 1 }),
  ];

  const selectedStops = [...parisStops, ...tokyoStops];
  const totalDays = 4;

  // Suggestions — intentionally given wrong dayNumber to confirm proximity overrides it
  const eiffelTower = makeStop({
    dayNumber: 3, // wrong city day
    name: 'Eiffel Tower',
    latitude: '48.8584',
    longitude: '2.2945',
  });
  const louvre = makeStop({
    dayNumber: 4, // wrong city day
    name: 'Louvre Museum',
    latitude: '48.8606',
    longitude: '2.3376',
  });
  const shibuyaCrossing = makeStop({
    dayNumber: 1, // wrong city day
    name: 'Shibuya Crossing',
    latitude: '35.6595',
    longitude: '139.7004',
  });
  const sensojitemple = makeStop({
    dayNumber: 2, // wrong city day
    name: 'Senso-ji Temple',
    latitude: '35.7147',
    longitude: '139.7967',
  });

  it('Paris suggestions land on Paris days (0 or 1), not Tokyo days', () => {
    const result = assignSuggestionsByProximity(
      selectedStops,
      [eiffelTower, louvre],
      totalDays,
    );

    const parisNames = [...result['0'], ...result['1']].map(s => s.name);
    const tokyoNames = [...result['2'], ...result['3']].map(s => s.name);

    expect(parisNames).toContain('Eiffel Tower');
    expect(parisNames).toContain('Louvre Museum');
    expect(tokyoNames).not.toContain('Eiffel Tower');
    expect(tokyoNames).not.toContain('Louvre Museum');
  });

  it('Tokyo suggestions land on Tokyo days (2 or 3), not Paris days', () => {
    const result = assignSuggestionsByProximity(
      selectedStops,
      [shibuyaCrossing, sensojitemple],
      totalDays,
    );

    const parisNames = [...result['0'], ...result['1']].map(s => s.name);
    const tokyoNames = [...result['2'], ...result['3']].map(s => s.name);

    expect(tokyoNames).toContain('Shibuya Crossing');
    expect(tokyoNames).toContain('Senso-ji Temple');
    expect(parisNames).not.toContain('Shibuya Crossing');
    expect(parisNames).not.toContain('Senso-ji Temple');
  });

  it('mixed suggestions each land in their own city with no cross-contamination', () => {
    const result = assignSuggestionsByProximity(
      selectedStops,
      [eiffelTower, louvre, shibuyaCrossing, sensojitemple],
      totalDays,
    );

    const parisNames = [...result['0'], ...result['1']].map(s => s.name);
    const tokyoNames = [...result['2'], ...result['3']].map(s => s.name);

    // Paris suggestions stay in Paris days
    expect(parisNames).toContain('Eiffel Tower');
    expect(parisNames).toContain('Louvre Museum');

    // Tokyo suggestions stay in Tokyo days
    expect(tokyoNames).toContain('Shibuya Crossing');
    expect(tokyoNames).toContain('Senso-ji Temple');

    // No cross-contamination
    expect(tokyoNames).not.toContain('Eiffel Tower');
    expect(tokyoNames).not.toContain('Louvre Museum');
    expect(parisNames).not.toContain('Shibuya Crossing');
    expect(parisNames).not.toContain('Senso-ji Temple');
  });

  it('all 4 day buckets are initialised even when only one city has suggestions', () => {
    const result = assignSuggestionsByProximity(
      selectedStops,
      [eiffelTower],
      totalDays,
    );

    expect(result).toHaveProperty('0');
    expect(result).toHaveProperty('1');
    expect(result).toHaveProperty('2');
    expect(result).toHaveProperty('3');
    expect(result['2']).toEqual([]);
    expect(result['3']).toEqual([]);
  });

  it('no suggestion appears in more than one day bucket across a 4-day trip', () => {
    const result = assignSuggestionsByProximity(
      selectedStops,
      [eiffelTower, louvre, shibuyaCrossing, sensojitemple],
      totalDays,
    );

    const allAssigned = Object.values(result).flat().map(s => s.name);
    const unique = new Set(allAssigned);
    expect(unique.size).toBe(allAssigned.length);
  });
});
