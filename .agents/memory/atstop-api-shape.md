---
name: atstop API data shape
description: Real field names returned by /api/travel/trips/:id for stops, and the fallback chain used in atstop.tsx.
---

# Stop data shape from /api/travel/trips/:tripId

The API returns stops with these top-level fields:
- `id`, `name`, `stopType`, `dayIndex`, `displayOrder`, `durationMinutes`
- `isVisited`, `visited` (both may appear)
- `address`, `cityGroup`, `openingHours`
- `latitude`, `longitude` (strings, e.g. `"41.8668"`)
- `minAge` (number or null)
- `enrichment` — flat JSON blob from `stop_library.enrichment`
- `metadata` — flat JSON blob with `ticketSignal`, `sessionFit`, `restroomConfidence`
- `placeProfileData` — may be set as a JSON column directly on the stop
- `placeReferenceData` — may be set as a JSON column (`bookingRequired`, `bookingUrl`, `priceRange`, `openingHours`)
- `parentSupportData` — may be set as a JSON column (`keepGoingSuggestion`, etc.)

## enrichment flat fields
`whyNow`, `whyItWorks`, `parkingNotes`, `bathroomNotes`, `bestTimeOfDay`, `strollerFriendly`, `practicalTips` (string OR string[]), `foodOptions`, `priceRange`, `bookingRequired`, `bookingUrl`, `keepGoingSuggestion`

## Fallback chains used in atstop.tsx

```typescript
// "Do this first" card
const doThisFirst = enrichment.whyItWorks ?? pProf.whyItWorks
  ?? currentStop.parentSupportData?.keepGoingSuggestion ?? enrichment.whyNow;

// Open status pill
const openStatus = formatOpenStatus(pRef.openingHours ?? currentStop.openingHours);

// Ticket visibility
const hasTicket = pRef.bookingRequired === true || meta.ticketSignal === true;

// Booking URL
const bookingHref = pRef.bookingUrl ?? enrichment.bookingUrl;

// Directions (Platform.select)
// iOS:  maps://app?daddr={lat},{lon}&dirflg=d
// Android: google.navigation:q={lat},{lon}
// Fallback: mapsUrl(address)
```

## TripData fields
`id`, `name`, `status`, `destination`, `city`, `country`, `startDate`, `plannerTripDays`, `tripDays`, `currentDayIndex`, `accommodationAddress`, `stops[]`, `travelers[]` (with `name`, `type`, `id`)
