export const NotifContent = {
  MORNING_BRIEF: (dayNum: number, firstStop: string, weather: string) => ({
    title: `Day ${dayNum} starts in ${firstStop} \uD83D\uDDFA\uFE0F`,
    body: `First stop ready. ${weather}`,
  }),

  DEPARTURE_REMINDER: (stopName: string, driveMin: number) => ({
    title: `Leave for ${stopName} in 30 min`,
    body: `${driveMin} min drive from your current location.`,
  }),

  KIDS_ZONE_ENROUTE: (driveMin: number, nextStop: string) => ({
    title: `${driveMin} min to ${nextStop} \uD83C\uDFAE`,
    body: `Travel games loaded \u2014 keep the kids busy.`,
  }),

  WEATHER_ALERT: (condition: string) => ({
    title: `${condition} expected this afternoon`,
    body: `3 indoor stops ready. Tap to adjust your plan.`,
  }),

  AT_STOP_ARRIVAL: (stopName: string) => ({
    title: `You\u2019re at ${stopName}`,
    body: `Story mode ready for the kids. Tap to start.`,
  }),

  DAY_COMPLETE: (stops: string[]) => ({
    title: `Day complete \uD83D\uDE4C`,
    body: `${stops.join(', ')}. Tomorrow starts at 9am.`,
  }),

  MEMORY_RECAP: (dayNum: number, photoCount: number) => ({
    title: `Day ${dayNum} recap is ready \u2728`,
    body: `${photoCount} photo${photoCount !== 1 ? 's' : ''} captured. Tap to relive it.`,
  }),

  TRIP_SUMMARY: (tripName: string, dayCount: number) => ({
    title: `Your ${tripName} trip is wrapped`,
    body: `${dayCount} days of memories ready to share.`,
  }),
}
