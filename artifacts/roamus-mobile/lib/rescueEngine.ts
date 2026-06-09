export interface StopLike {
  id: string;
  name: string;
  stopType?: string | null;
  durationMinutes?: number | null;
  travelMinsFromPrevious?: number | null;
  metadata?: Record<string, unknown> | null;
}

export type RescueOptionId = 'tired' | 'late' | 'weather' | 'sick' | 'skip' | 'done';

export interface RescueOption {
  id: RescueOptionId;
  emoji: string;
  label: string;
  sub: string;
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
): RescueOption[] {
  const base: RescueOption[] = [
    {
      id: 'tired',
      emoji: '\uD83D\uDE34',
      label: 'Everyone\u2019s tired',
      sub: 'Drop a stop, lighten the day',
    },
    {
      id: 'late',
      emoji: '\u23F0',
      label: 'We\u2019re running behind',
      sub: 'Recover time, keep what matters most',
    },
    {
      id: 'weather',
      emoji: '\uD83C\uDF27\uFE0F',
      label: 'Weather looks rough',
      sub: 'Swap outdoor stops for indoor ones',
    },
  ];

  if (context === 'morning') {
    base.push(
      {
        id: 'sick',
        emoji: '\uD83E\uDD12',
        label: 'Someone is sick',
        sub: 'Rest today and adjust the plan',
      },
      {
        id: 'skip',
        emoji: '\uD83D\uDEAB',
        label: 'Skipping today entirely',
        sub: 'Mark the day and move on',
      },
    );
  } else {
    base.push({
      id: 'done',
      emoji: '\uD83C\uDFC1',
      label: 'We\u2019re done for the day',
      sub: 'Wrap up here, save the rest',
    });
  }

  return base;
}

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
    return {
      type: 'tired',
      headline: 'No stops left to drop',
      body: 'You\u2019ve already covered all your stops today.',
    };
  }
  const dropStop = remaining[remaining.length - 1];
  const keptStops = remaining.slice(0, remaining.length - 1);
  const timeSaved = (dropStop.durationMinutes ?? 60) + (dropStop.travelMinsFromPrevious ?? 15);
  return {
    type: 'tired',
    dropStop,
    keptStops,
    timeSavedMins: timeSaved,
    headline: 'Drop your last stop',
    body: `Dropping \u201C${dropStop.name}\u201D saves about ${timeSaved} min of travel and visiting.`,
  };
}

export function computeLateDay(stops: StopLike[], currentIdx: number): RescuePlan {
  const remaining = stops.slice(currentIdx);
  if (remaining.length === 0) {
    return {
      type: 'late',
      headline: 'No stops left',
      body: 'You\u2019ve already covered all your stops today.',
    };
  }
  const sorted = [...remaining].sort(
    (a, b) => (b.travelMinsFromPrevious ?? 0) - (a.travelMinsFromPrevious ?? 0),
  );
  const dropStop = sorted[0];
  const keptStops = remaining.filter(s => s.id !== dropStop.id);
  const timeSaved = (dropStop.travelMinsFromPrevious ?? 15) + (dropStop.durationMinutes ?? 60);
  return {
    type: 'late',
    dropStop,
    keptStops,
    timeSavedMins: timeSaved,
    headline: 'Cut the farthest stop',
    body: `Cutting \u201C${dropStop.name}\u201D recovers the most time \u2014 about ${timeSaved} min.`,
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
    return {
      type: 'weather',
      swaps: [],
      headline: 'Already mostly indoors',
      body: 'Good news \u2014 your remaining stops are mostly indoor-friendly.',
    };
  }

  return {
    type: 'weather',
    swaps,
    headline: `${swaps.length} outdoor stop${swaps.length !== 1 ? 's' : ''} to swap`,
    body: 'We\u2019ll suggest indoor alternatives for your outdoor stops.',
  };
}

export function computeSickDay(): RescuePlan {
  return {
    type: 'sick',
    headline: 'Take a rest day',
    body: 'Mark today as a rest day. Your itinerary is saved and ready for when you feel better.',
  };
}

export function computeSkipDay(stops: StopLike[], currentIdx: number): RescuePlan {
  const remaining = stops.slice(currentIdx);
  return {
    type: 'skip',
    keptStops: remaining,
    headline: 'Skip the whole day',
    body: `${remaining.length} stop${remaining.length !== 1 ? 's' : ''} will be marked as skipped.`,
  };
}

export function computeDoneForDay(stops: StopLike[], currentIdx: number): RescuePlan {
  const remaining = stops.slice(currentIdx);
  return {
    type: 'done',
    keptStops: remaining,
    headline: 'Calling it here',
    body:
      remaining.length > 0
        ? `${remaining.length} remaining stop${remaining.length !== 1 ? 's' : ''} saved for next time.`
        : 'You\u2019ve covered everything \u2014 great day!',
  };
}
