const SPIN_KEY_PREFIX = 'geoquest_spins_';
const SPIN_LAST_LOGIN_KEY = 'geoquest_spin_last_login_';
const DEFAULT_DAILY_SPINS = 3;
const CHAMPION_DAILY_SPINS = 5;
const MAX_SPINS = 3;
const GUEST_KEY = 'guest';

export const DEFAULT_SPIN_GAME_XP = 2;
export const CHAMPION_SPIN_GAME_XP = 3;

export type SpinEarnReason = 
  | 'daily_quest_completed'
  | 'city_discovered'
  | 'adventure_stop_completed'
  | 'rank_up'
  | 'daily_login';

const SPIN_REWARDS: Record<SpinEarnReason, number> = {
  daily_quest_completed: 1,
  city_discovered: 1,
  adventure_stop_completed: 1,
  rank_up: 2,
  daily_login: 1,
};

function resolveId(explorerId: string | undefined): string {
  return explorerId || GUEST_KEY;
}

function getSpinKey(id: string) {
  return `${SPIN_KEY_PREFIX}${id}`;
}

function getLoginKey(id: string) {
  return `${SPIN_LAST_LOGIN_KEY}${id}`;
}

export function getSpins(explorerId: string | undefined, isChampion = false): number {
  const id = resolveId(explorerId);
  const stored = localStorage.getItem(getSpinKey(id));
  if (stored === null) {
    const defaultSpins = isChampion ? CHAMPION_DAILY_SPINS : DEFAULT_DAILY_SPINS;
    localStorage.setItem(getSpinKey(id), String(defaultSpins));
    localStorage.setItem(getLoginKey(id), new Date().toDateString());
    return defaultSpins;
  }
  return parseInt(stored, 10) || 0;
}

export function spendSpin(explorerId: string | undefined): boolean {
  const id = resolveId(explorerId);
  const current = getSpins(explorerId);
  if (current <= 0) return false;
  localStorage.setItem(getSpinKey(id), String(current - 1));
  return true;
}

export function earnSpins(explorerId: string | undefined, reason: SpinEarnReason): number {
  const id = resolveId(explorerId);
  const amount = SPIN_REWARDS[reason];
  const current = getSpins(explorerId);
  const newTotal = Math.min(current + amount, MAX_SPINS);
  localStorage.setItem(getSpinKey(id), String(newTotal));
  return amount;
}

export function checkDailyLoginSpin(explorerId: string | undefined, isChampion = false): boolean {
  const id = resolveId(explorerId);
  const today = new Date().toDateString();
  const lastLogin = localStorage.getItem(getLoginKey(id));
  if (lastLogin === today) return false;
  localStorage.setItem(getLoginKey(id), today);

  if (isChampion) {
    const current = getSpins(explorerId, true);
    const newTotal = Math.min(Math.max(current, CHAMPION_DAILY_SPINS), CHAMPION_DAILY_SPINS);
    localStorage.setItem(getSpinKey(id), String(newTotal));
  } else {
    earnSpins(explorerId, 'daily_login');
  }
  return true;
}

export function getSpinRewardAmount(reason: SpinEarnReason): number {
  return SPIN_REWARDS[reason];
}

export function getSpinGameXp(isChampion = false): number {
  return isChampion ? CHAMPION_SPIN_GAME_XP : DEFAULT_SPIN_GAME_XP;
}
