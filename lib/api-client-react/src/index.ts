export * from "./generated/api";
export * from "./generated/api.schemas";
export { setBaseUrl, setAuthTokenGetter } from "./custom-fetch";
export type { AuthTokenGetter } from "./custom-fetch";
export { ROAMUS_XP_RANKS, ROAMUS_ELITE_THRESHOLD, getRoamusRank } from "./rank";
export type { RoamusXpRank } from "./rank";
