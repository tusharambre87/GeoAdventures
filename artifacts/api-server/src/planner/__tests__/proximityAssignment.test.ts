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
