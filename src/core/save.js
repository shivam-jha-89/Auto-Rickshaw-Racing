// Persistent player profile in localStorage (always wrapped in try/catch).
const KEY = 'rikshaw-rush-save-v1';

const DEFAULTS = () => ({
  coins: 0,
  high: 0,
  leaderboard: [], // {score, distance, date}
  upgrades: { nitro: 0, magnet: 0, shield: 0, double: 0, coinValue: 0, armor: 0 },
  skins: ['classic'],
  skin: 'classic',
  horn: 0,
  horns: [0],
  settings: { volume: 0.8, music: true, quality: 'auto', shake: true, muted: false },
  stats: { runs: 0, distance: 0, coins: 0, fares: 0, smash: 0, tricks: 0, nearMiss: 0, powerups: 0, gates: 0, bestDistance: 0, maxSpeed: 0 },
  achievements: [],
  items: { headstart: 0, shieldStart: 0 },
  unlocked: ['old'],
  startDistrict: 'old',
  letters: { date: '', got: 0 },
  spinDate: '',
  radio: 0,
  trail: 'none',
  trails: ['none'],
  rivalsBeaten: 0,
  daily: null,
  tutorialDone: false,
  updatedAt: 0,
});

function merge(base, src) {
  if (!src || typeof src !== 'object') return base;
  for (const k of Object.keys(base)) {
    if (!(k in src)) continue;
    const b = base[k], v = src[k];
    if (b && typeof b === 'object' && !Array.isArray(b)) base[k] = merge(b, v);
    else if (Array.isArray(b)) base[k] = Array.isArray(v) ? v : b;
    else if (typeof v === typeof b || b === null) base[k] = v;
  }
  return base;
}

function load() {
  try {
    return merge(DEFAULTS(), JSON.parse(localStorage.getItem(KEY) || '{}'));
  } catch {
    return DEFAULTS();
  }
}

export const save = load();

let hook = null;
/** Called after every save (used for cloud sync when signed in). */
export function setPersistHook(fn) { hook = fn; }

export function persist() {
  save.updatedAt = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { /* storage unavailable */ }
  hook?.();
}

/** Replace the whole profile (e.g. with the cloud copy after login). */
export function replaceSave(data) {
  const fresh = merge(DEFAULTS(), data);
  for (const k of Object.keys(save)) delete save[k];
  Object.assign(save, fresh);
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { /* ignore */ }
}

export function resetSave() {
  const fresh = DEFAULTS();
  for (const k of Object.keys(save)) delete save[k];
  Object.assign(save, fresh);
  persist();
}
