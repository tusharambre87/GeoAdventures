---
name: Book Now ticket booking link bug
description: "Book now" button in trip day view (tripId.tsx ~1846) is a plain Text with no onPress — tapping it does nothing. Full fix spec.
---

## The Bug
In `artifacts/roamus-mobile/app/trip/[tripId].tsx` ~line 1846, the "Before you go" section shows:
```tsx
<Text style={dd.bfgAct}>Book now</Text>
```
This is a plain `<Text>` — no `onPress`, no `Pressable` wrapper. It should:
1. Show a **sheet/modal listing all stops on that day that need tickets** (`bookingRequired === true || ticketSignal === true`)
2. Each stop in that list should be tappable and open its booking URL via `Linking.openURL`

## Reference Implementation (atstop.tsx)
The pattern already exists in `app/(tabs)/atstop.tsx`:
- `ticketUrl(name, bookingUrl)` at line 417 — returns bookingUrl or falls back to a Google search URL
- `bookingHref = pRef.bookingUrl ?? enrichment.bookingUrl`
- `Linking.openURL(ticketUrl(currentStop.name, bookingHref))` at line 1271

Ticket detection: `pRef.bookingRequired === true || meta.ticketSignal === true`

## Fix Plan
1. In `tripId.tsx`, find all dayStops where `meta?.ticketSignal === true || stop.selectionReason === 'ticket_required'` or similar
2. Collect the stops' bookingUrl from their metadata JSONB
3. Wrap "Book now" in a `Pressable` that opens a bottom sheet with per-stop rows
4. Each row: stop name + "Buy ticket →" that calls `Linking.openURL(ticketUrl(name, url))`
5. Alternatively (simpler first pass): if only 1 ticket stop on the day, go directly to that stop's booking URL

**Why:**
User sees "1 ticket needed" but clicking "Book now" does nothing — friction right before starting the day.
