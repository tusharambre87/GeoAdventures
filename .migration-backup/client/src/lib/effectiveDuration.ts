export function computeEffectiveDuration(baseMins: number, youngestAge: number): number {
  if (youngestAge <= 2) return Math.min(baseMins, 45);
  if (youngestAge <= 4) return Math.min(baseMins, 75);
  if (youngestAge <= 7) return Math.round(baseMins * 0.8);
  return baseMins;
}
