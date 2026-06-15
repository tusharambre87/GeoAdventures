/** Age-band helpers — shared by runtime callers and the backfill. */

export function getAgeBand(youngestChildAge: number): string {
  if (youngestChildAge <= 6) return 'young';
  if (youngestChildAge <= 9) return 'middle';
  return 'older';
}

export function getRepresentativeAge(ageBand: string): number {
  if (ageBand === 'young')  return 5;
  if (ageBand === 'older')  return 12;
  return 8;
}
