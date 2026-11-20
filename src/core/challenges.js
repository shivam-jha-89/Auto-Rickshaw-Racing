// Daily challenges (3 per day, seeded by date) + permanent achievements.
import { save, persist } from './save.js';

// per: 'run' → best single run counts. 'total' → accumulates over the day.
const POOL = [
  { id: 'coins', text: 'Collect {n} coins in one run', stat: 'coins', per: 'run', n: [120, 250, 450] },
  { id: 'dist', text: 'Drive {n} m in one run', stat: 'distance', per: 'run', n: [1200, 2500, 4500] },
  { id: 'near', text: 'Pull off {n} near misses in one run', stat: 'nearMiss', per: 'run', n: [6, 14, 25] },
  { id: 'fares', text: 'Deliver {n} passengers on time', stat: 'fares', per: 'total', n: [2, 4, 7] },
  { id: 'smash', text: 'Smash {n} vehicles with Nitro', stat: 'smash', per: 'total', n: [4, 10, 20] },
  { id: 'tricks', text: 'Land {n} air tricks', stat: 'tricks', per: 'total', n: [2, 5, 10] },
  { id: 'powerups', text: 'Grab {n} power-ups', stat: 'powerups', per: 'total', n: [4, 8, 14] },
  { id: 'gates', text: 'Cross {n} district gates in one run', stat: 'gates', per: 'run', n: [1, 2, 3] },
  { id: 'rain', text: 'Drive {n} m in the rain', stat: 'rainDistance', per: 'total', n: [300, 800, 1500] },
  { id: 'night', text: 'Drive {n} m at night', stat: 'nightDistance', per: 'total', n: [500, 1200, 2500] },
  { id: 'horn', text: 'Clear the way with your horn {n} times', stat: 'hornClears', per: 'total', n: [3, 8, 15] },
];
const REWARD = [150, 300, 600];

export const ACHIEVEMENTS = [
  { id: 'first', name: 'Pehli Sawari', desc: 'Deliver your first passenger', test: s => s.fares >= 1 },
  { id: 'km', name: 'Kilometre Club', desc: 'Drive 1 km in one run', test: s => s.bestDistance >= 1000 },
  { id: 'km5', name: 'Lambi Race', desc: 'Drive 5 km in one run', test: s => s.bestDistance >= 5000 },
  { id: 'marathon', name: 'Shehr ka Chakkar', desc: 'Drive 25 km in total', test: s => s.distance >= 25000 },
  { id: 'rich', name: 'Lakhpati', desc: 'Earn 10,000 coins in total', test: s => s.coins >= 10000 },
  { id: 'wreck', name: 'Bulldozer', desc: 'Smash 50 vehicles with Nitro', test: s => s.smash >= 50 },
  { id: 'acro', name: 'Hawai Jahaz', desc: 'Land 25 air tricks', test: s => s.tricks >= 25 },
  { id: 'near', name: 'Baal Baal Bache', desc: '100 near misses in total', test: s => s.nearMiss >= 100 },
  { id: 'speed', name: 'Toofan Mail', desc: 'Reach top speed', test: s => s.maxSpeed >= 45 },
  { id: 'tour', name: 'Shehr ki Sair', desc: 'Cross 10 district gates', test: s => s.gates >= 10 },
];

function dayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
function seeded(str) {
  let h = 2166136261;
  for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; };
}

export function ensureDaily() {
  const key = dayKey();
  if (save.daily && save.daily.date === key) return save.daily;
  const r = seeded(key);
  const ids = POOL.map(p => p.id);
  const list = [];
  for (let i = 0; i < 3; i++) {
    const id = ids.splice(Math.floor(r() * ids.length), 1)[0];
    list.push({ id, tier: i, progress: 0, done: false, claimed: false });
  }
  save.daily = { date: key, list };
  persist();
  return save.daily;
}

export function describe(c) {
  const def = POOL.find(p => p.id === c.id);
  const n = def.n[c.tier];
  return { text: def.text.replace('{n}', n.toLocaleString()), target: n, reward: REWARD[c.tier], per: def.per, stat: def.stat };
}

/** Called during a run with live stats; returns challenges that just completed. */
export function checkLive(runStats) {
  const daily = ensureDaily();
  const done = [];
  for (const c of daily.list) {
    if (c.done) continue;
    const d = describe(c);
    const v = d.per === 'run' ? runStats[d.stat] || 0 : c.progress + (runStats[d.stat] || 0);
    if (v >= d.target) { c.done = true; c.progress = d.target; done.push(d); }
  }
  if (done.length) persist();
  return done;
}

/** At end of run, fold stats into daily progress. */
export function applyRun(runStats, delta = runStats) {
  const daily = ensureDaily();
  for (const c of daily.list) {
    if (c.done) continue;
    const d = describe(c);
    c.progress = d.per === 'run' ? Math.max(c.progress, runStats[d.stat] || 0) : c.progress + (delta[d.stat] || 0);
    if (c.progress >= d.target) { c.progress = d.target; c.done = true; }
  }
  persist();
}

export function claim(i) {
  const c = ensureDaily().list[i];
  if (!c || !c.done || c.claimed) return 0;
  c.claimed = true;
  const r = describe(c).reward;
  save.coins += r;
  persist();
  return r;
}

export function checkAchievements() {
  const got = [];
  for (const a of ACHIEVEMENTS) {
    if (save.achievements.includes(a.id)) continue;
    if (a.test(save.stats)) { save.achievements.push(a.id); got.push(a); }
  }
  if (got.length) persist();
  return got;
}
