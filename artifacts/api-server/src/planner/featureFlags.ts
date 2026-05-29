export function isStopIntelligenceEnabled(): boolean {
  return process.env.STOP_INTELLIGENCE_ENABLED === "true";
}
