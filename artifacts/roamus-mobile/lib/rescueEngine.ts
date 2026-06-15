export interface StopLike {
  id: string;
  name: string;
  stopType?: string | null;
  durationMinutes?: number | null;
  travelMinsFromPrevious?: number | null;
  metadata?: Record<string, unknown> | null;
  importanceLevel?: number | null;
  timeLock?: boolean | null;
}

export interface TrimmedStop {
  stop: StopLike;
  trimBy: number;
  newDuration: number;
  note: string;
  protected: boolean;
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
  trimmedStops?: TrimmedStop[];
  totalRecovered?: number;
}

export function getOptions(
  context: 'morning' | 'en_route' | 'stop_complete' | 'stop',
): { primary: RescueOption[]; secondary: RescueOption[] } {
  if (context === 'stop') {
    return {
      primary: [
        { id: 'tired',   icon: '\uD83D\uDE34', title: 'Kids are tired',      subtitle: 'Find a break spot near this stop', zone: 'primary' },
        { id: 'late',    icon: '\u23F0',        title: 'Running late',        subtitle: 'Behind schedule',                  zone: 'primary' },
        { id: 'fun',     icon: '\uD83C\uDF89',  title: 'Something more fun',  subtitle: 'Swap this stop',                   zone: 'primary' },
        { id: 'food',    icon: '\uD83C\uDF54',  title: 'Need food now',       subtitle: 'Find something close',             zone: 'primary' },
      ],
      secondary: [
        { id: 'weather', icon: '\uD83C\uDF27\uFE0F', title: 'Weather changed',         subtitle: 'Find indoor options nearby', zone: 'secondary' },
        { id: 'sick',    icon: '\uD83E\uDD12',       title: 'Someone feeling sick',    subtitle: 'Get help fast',             zone: 'secondary' },
        { id: 'done',    icon: '\u2705',              title: "We're done for the day",  subtitle: 'Wrap up early',             zone: 'secondary' },
      ],
    };
  }
  if (context === 'morning') {
    return {
      primary: [
        { id: 'tired',   icon: '\uD83D\uDE34', title: 'Kids are tired',      subtitle: 'Adjust before we start',        zone: 'primary' },
        { id: 'late',    icon: '\u23F0',        title: 'Running late',        subtitle: 'Start behind, need to tighten', zone: 'primary' },
        { id: 'fun',     icon: '\uD83C\uDF89',  title: 'Swap a stop',         subtitle: 'Something more fun instead',    zone: 'primary' },
        { id: 'food',    icon: '\uD83C\uDF54',  title: 'Need food first',     subtitle: 'Grab something before we go',   zone: 'primary' },
      ],
      secondary: [
        { id: 'weather', icon: '\uD83C\uDF27\uFE0F', title: 'Weather changed',         subtitle: 'Find indoor options',       zone: 'secondary' },
        { id: 'sick',    icon: '\uD83E\uDD12',       title: 'Someone is sick',         subtitle: 'Get help & safety info',    zone: 'secondary' },
        { id: 'skip',    icon: '\u2705',              title: 'Skipping today entirely', subtitle: 'Save stops for tomorrow',   zone: 'secondary' },
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
      { id: 'weather', icon: '\uD83C\uDF27\uFE0F', title: 'Weather changed',        subtitle: 'Find indoor options nearby', zone: 'secondary' },
      { id: 'done',    icon: '\u2705',              title: "We're done for the day", subtitle: 'Wrap up early',             zone: 'secondary' },
    ],
  };
}

function getImportanceLevel(s: StopLike): number {
  if (s.importanceLevel != null) return s.importanceLevel;
  const meta = s.metadata ?? {};
  if (typeof meta.importanceLevel === 'number') return meta.importanceLevel;
  return 3;
}

function isTimeLocked(s: StopLike): boolean {
  if (s.timeLock != null) return s.timeLock;
  const meta = s.metadata ?? {};
  return meta.timeLock === true;
}

// ─── Pure compute functions ───────────────────────────────────────────────────

const OUTDOOR_TYPES = new Set([
  'park', 'nature', 'landmark', 'zoo', 'theme_park', 'beach', 'hike', 'outdoor',
  'playground', 'outdoor_attraction', 'garden',
]);

function getTrimNote(stopType: string): string {
  const notes: Record<string, string> = {
    aquarium:   'Focus on the main tank — skip the gift shop.',
    museum:     'Top 2 galleries only.',
    zoo:        'Main loop — big animals only.',
    park:       'Quick walk, skip the playground.',
    landmark:   'Photos + 10 min — then move.',
    theme_park: 'Pick your 2 must-dos.',
    beach:      '20 min on the sand — then keep moving.',
    nature:     'Viewpoint stop only — skip the trail.',
  };
  return notes[stopType] ?? 'Hit the highlights, keep moving.';
}

export function computeTiredDay(stops: StopLike[], currentIdx: number): RescuePlan {
  const unvisited = stops.slice(currentIdx).filter(s => !(s as any).isSkipped && !(s as any).isVisited);

  if (unvisited.length <= 1) {
    return {
      type: 'tired',
      headline: 'No stops to drop',
      body: "You only have one stop left — tough it out!",
    };
  }

  const droppable = unvisited.filter(s => !isTimeLocked(s));

  if (droppable.length === 0) {
    return {
      type: 'tired',
      headline: "All stops are locked in",
      body: "Your remaining stops have reservations or tickets — none can be dropped.",
      keptStops: unvisited,
    };
  }

  const sorted = [...droppable].sort(
    (a, b) => getImportanceLevel(a) - getImportanceLevel(b),
  );
  const toDrop = sorted[0];
  const toKeep = unvisited.filter(s => s.id !== toDrop.id);
  const minutesSaved = toDrop.durationMinutes ?? 60;

  return {
    type: 'tired',
    dropStop: toDrop,
    keptStops: toKeep,
    timeSavedMins: minutesSaved,
    headline: 'Lightened your day',
    body: `Dropping "${toDrop.name}" saves about ${minutesSaved} min.`,
  };
}

export function computeLateDay(stops: StopLike[], currentIdx: number): RescuePlan {
  const unvisited = stops.slice(currentIdx).filter(s => !(s as any).isSkipped && !(s as any).isVisited);

  if (unvisited.length === 0) {
    return { type: 'late', headline: 'No stops left', body: "You've covered all your stops today." };
  }

  const trimmed: TrimmedStop[] = unvisited.map(stop => {
    if (isTimeLocked(stop)) {
      return {
        stop,
        trimBy: 0,
        newDuration: stop.durationMinutes ?? 60,
        note: 'Protected — has reservation or ticket',
        protected: true,
      };
    }
    const original = stop.durationMinutes ?? 60;
    const minimum = 30;
    const maxTrim = Math.max(0, original - minimum);
    const trimBy = Math.min(maxTrim, Math.round(original * 0.33));
    return {
      stop,
      trimBy,
      newDuration: original - trimBy,
      note: getTrimNote(stop.stopType ?? ''),
      protected: false,
    };
  });

  const totalRecovered = trimmed.reduce((acc, t) => acc + t.trimBy, 0);

  return {
    type: 'late',
    trimmedStops: trimmed,
    totalRecovered,
    headline: 'Tightened your schedule',
    body: `Trim each stop to recover ~${totalRecovered} min.`,
  };
}

export function computeWeatherDay(stops: StopLike[], currentIdx: number): RescuePlan {
  const remaining = stops.slice(currentIdx);
  const outdoorStops = remaining.filter(s => OUTDOOR_TYPES.has(s.stopType ?? ''));
  const swaps = outdoorStops.map(s => ({ from: s, toLabel: '' }));
  if (swaps.length === 0) {
    return {
      type: 'weather', swaps: [],
      headline: 'Already mostly indoors',
      body: "Good news — your remaining stops are indoor-friendly.",
    };
  }
  return {
    type: 'weather', swaps,
    headline: `${swaps.length} outdoor stop${swaps.length !== 1 ? 's' : ''} to move indoors`,
    body: "Loading indoor alternatives from your city…",
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
      ? `Looking for alternatives near "${swapStop.name}"…`
      : 'No upcoming stops to swap right now.',
  };
}

export function computeFoodStop(): RescuePlan {
  return {
    type: 'food',
    headline: 'Find food nearby',
    body: "Loading family-friendly options in your area…",
  };
}
