export interface StopLike {
  id: string;
  name: string;
  stopType?: string | null;
  durationMinutes?: number | null;
  travelMinsFromPrevious?: number | null;
  metadata?: Record<string, unknown> | null;
}

export type RescueOptionId =
  | 'tired' | 'late' | 'fun' | 'food'
  | 'weather' | 'sick' | 'skip' | 'done';

export type RescueOptionZone = 'primary' | 'secondary';

export interface RescueOption {
  id: RescueOptionId;
  icon: string;
  title: string;
  subtitle: string;
  zone: RescueOptionZone;
}

export interface RescuePlan {
  type: RescueOptionId;
  dropStop?: StopLike;
  keptStops?: StopLike[];
  swaps?: Array<{ from: StopLike; toLabel: string }>;
  headline: string;
  body: string;
  timeSavedMins?: number;
}

export function getOptions(
  context: 'morning' | 'en_route' | 'stop_complete',
): { primary: RescueOption[]; secondary: RescueOption[] } {
  if (context === 'morning') {
    return {
      primary: [
        { id: 'tired',   icon: '\uD83D\uDE34', title: 'Kids are tired',      subtitle: 'Adjust before we start',        zone: 'primary' },
        { id: 'late',    icon: '\u23F0',        title: 'Running late',        subtitle: 'Start behind, need to tighten', zone: 'primary' },
        { id: 'fun',     icon: '\uD83C\uDF89',  title: 'Swap a stop',         subtitle: 'Something more fun instead',    zone: 'primary' },
        { id: 'food',    icon: '\uD83C\uDF54',  title: 'Need food first',     subtitle: 'Grab something before we go',   zone: 'primary' },
      ],
      secondary: [
        { id: 'weather', icon: '\uD83C\uDF27\uFE0F', title: 'Weather changed',        subtitle: 'Find indoor options',         zone: 'secondary' },
        { id: 'sick',    icon: '\uD83E\uDD12',       title: 'Someone is sick',        subtitle: 'Dial back the day',           zone: 'secondary' },
        { id: 'skip',    icon: '\u2705',              title: 'Skipping today entirely', subtitle: 'Save stops for tomorrow',    zone: 'secondary' },
      ],
    };
  }
  return {
    primary: [
      { id: 'tired', icon: '\uD83D\uDE34', title: 'Kids are tired',      subtitle: 'Need to slow down',         zone: 'primary' },
      { id: 'late',  icon: '\u23F0',        title: 'Running late',        subtitle: 'Behind schedule',           zone: 'primary' },
      { id: 'fun',   icon: '\uD83C\uDF89',  title: 'Something more fun',  subtitle: 'Swap this stop',            zone: 'primary' },
      { id: 'food',  icon: '\uD83C\uDF54',  title: 'Need food now',       subtitle: 'Find something close',      zone: 'primary' },
    ],
    secondary: [
      { id: 'weather', icon: '\uD83C\uDF27\uFE0F', title: 'Weather changed',       subtitle: 'Find indoor options nearby', zone: 'secondary' },
      { id: 'done',    icon: '\u2705',              title: "We're done for the day", subtitle: 'Wrap up early',             zone: 'secondary' },
    ],
  };
}

// ─── Pure compute functions ───────────────────────────────────────────────────

const OUTDOOR_TYPES = new Set([
  'park', 'nature', 'landmark', 'zoo', 'theme_park', 'beach', 'hike', 'outdoor',
]);

const INDOOR_SUBS: Record<string, string> = {
  park: 'Indoor play area or arcade',
  nature: 'Natural history museum',
  landmark: 'Visitor center or indoor exhibit',
  zoo: 'Aquarium or indoor wildlife center',
  theme_park: 'Indoor entertainment center',
  beach: 'Aquarium or waterpark',
  hike: 'Museum or indoor climbing',
  outdoor: 'Indoor attraction nearby',
};

export function computeTiredDay(stops: StopLike[], currentIdx: number): RescuePlan {
  const remaining = stops.slice(currentIdx);
  if (remaining.length === 0) {
    return { type: 'tired', headline: 'No stops left to drop', body: "You've already covered all your stops today." };
  }
  const dropStop = remaining[remaining.length - 1];
  const keptStops = remaining.slice(0, remaining.length - 1);
  const timeSaved = (dropStop.durationMinutes ?? 60) + (dropStop.travelMinsFromPrevious ?? 15);
  return {
    type: 'tired', dropStop, keptStops, timeSavedMins: timeSaved,
    headline: 'Drop your last stop',
    body: `Dropping "${dropStop.name}" saves about ${timeSaved} min of travel and visiting.`,
  };
}

export function computeLateDay(stops: StopLike[], currentIdx: number): RescuePlan {
  const remaining = stops.slice(currentIdx);
  if (remaining.length === 0) {
    return { type: 'late', headline: 'No stops left', body: "You've already covered all your stops today." };
  }
  const sorted = [...remaining].sort(
    (a, b) => (b.travelMinsFromPrevious ?? 0) - (a.travelMinsFromPrevious ?? 0),
  );
  const dropStop = sorted[0];
  const keptStops = remaining.filter(s => s.id !== dropStop.id);
  const timeSaved = (dropStop.travelMinsFromPrevious ?? 15) + (dropStop.durationMinutes ?? 60);
  return {
    type: 'late', dropStop, keptStops, timeSavedMins: timeSaved,
    headline: 'Cut the farthest stop',
    body: `Cutting "${dropStop.name}" recovers the most time — about ${timeSaved} min.`,
  };
}

export function computeWeatherDay(stops: StopLike[], currentIdx: number): RescuePlan {
  const remaining = stops.slice(currentIdx);
  const outdoorStops = remaining.filter(s => OUTDOOR_TYPES.has(s.stopType ?? ''));
  const swaps = outdoorStops.map(s => ({
    from: s,
    toLabel: INDOOR_SUBS[s.stopType ?? ''] ?? 'Indoor alternative nearby',
  }));
  if (swaps.length === 0) {
    return { type: 'weather', swaps: [], headline: 'Already mostly indoors', body: "Good news — your remaining stops are mostly indoor-friendly." };
  }
  return {
    type: 'weather', swaps,
    headline: `${swaps.length} outdoor stop${swaps.length !== 1 ? 's' : ''} to swap`,
    body: "We'll suggest indoor alternatives for your outdoor stops.",
  };
}

export function computeSickDay(): RescuePlan {
  return {
    type: 'sick',
    headline: 'Take a rest day',
    body: "Mark today as a rest day. Your itinerary is saved and ready for when you feel better.",
  };
}

export function computeSkipDay(stops: StopLike[], currentIdx: number): RescuePlan {
  const remaining = stops.slice(currentIdx);
  return {
    type: 'skip', keptStops: remaining,
    headline: 'Skip the whole day',
    body: `${remaining.length} stop${remaining.length !== 1 ? 's' : ''} will be marked as skipped.`,
  };
}

export function computeDoneForDay(stops: StopLike[], currentIdx: number): RescuePlan {
  const remaining = stops.slice(currentIdx);
  return {
    type: 'done', keptStops: remaining,
    headline: 'Calling it here',
    body: remaining.length > 0
      ? `${remaining.length} remaining stop${remaining.length !== 1 ? 's' : ''} saved for next time.`
      : "You've covered everything — great day!",
  };
}

export function computeFunDay(stops: StopLike[], currentIdx: number): RescuePlan {
  const remaining = stops.slice(currentIdx);
  const swapStop = remaining[0];
  return {
    type: 'fun',
    headline: 'Swap a stop',
    body: swapStop
      ? `We'll find something more fun near "${swapStop.name}".`
      : 'No upcoming stops to swap right now.',
  };
}

export function computeFoodStop(): RescuePlan {
  return {
    type: 'food',
    headline: 'Find food nearby',
    body: "We'll look for family-friendly restaurants near your current location.",
  };
}
