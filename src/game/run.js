// One play session: spawning, collisions, scoring, combos, nitro, power-ups, passengers, weather & time.
//
// Spawning model: every obstacle has an "arrival distance" A (the route distance D at which it reaches
// the player) and a closing fraction f (1 = static, <1 = traffic moving with you). Its on-screen
// z = (D - A) * f. Because traffic speed is a fraction of the player's, arrivals never drift when the
// player speeds up, slows down or uses nitro — which lets the spawner guarantee a free lane.
import * as THREE from 'three';
import { LANES, SPEED, DISTRICTS, DISTRICT_LENGTH, districtIndexAt, POWERUPS, LINES, SHOUTS, LETTERS, RIVAL } from '../config.js';
import { save, persist } from '../core/save.js';
import { audio } from '../core/audio.js';
import { checkLive } from '../core/challenges.js';
import { pick, rand, randi } from '../render/kit.js';
import { createCar, createVan, createTruck, createBus, createBike, createDonkeyCart, createCow, createBaraat } from '../models/vehicles.js';
import { Rival } from './rival.js';
import { customModel } from '../render/gltf.js';
import { createPothole, createBarrier, createRamp, createPuddle, createPowerup, createBeacon, createLetter, createBreaker, createManhole, createRoughPatch } from '../models/props.js';
import { createStanding, randomLook } from '../models/person.js';

const TYPES = {
  car: { make: createCar, f: 0.62, hard: true, variants: 8, vehicle: true },
  van: { make: createVan, f: 0.66, hard: true, variants: 4, vehicle: true },
  truck: { make: createTruck, f: 0.74, hard: true, variants: 4, vehicle: true, heavy: true },
  bus: { make: createBus, f: 0.74, hard: true, variants: 4, vehicle: true, heavy: true },
  bike: { make: createBike, f: 0.55, hard: true, variants: 5, vehicle: true },
  cart: { make: createDonkeyCart, f: 0.86, hard: true, variants: 3, vehicle: true },
  cow: { make: createCow, f: 1, hard: true, variants: 4, animal: true, noSmash: true },
  baraat: { make: createBaraat, f: 0.88, hard: true, variants: 3, noSmash: true },
  pothole: { make: createPothole, f: 1, jump: true, variants: 3, flat: true },
  barrier: { make: createBarrier, f: 1, jump: true, variants: 2 },
  ramp: { make: createRamp, f: 1, ramp: true, variants: 1, flat: true },
  puddle: { make: createPuddle, f: 1, puddle: true, variants: 2, flat: true },
  breaker: { make: createBreaker, f: 1, bump: true, variants: 1, flat: true },
  manhole: { make: createManhole, f: 1, jump: true, variants: 2, flat: true },
  rough: { make: createRoughPatch, f: 1, rough: true, variants: 3, flat: true },
};
// Blender overrides: if /models/<type>.glb was loaded, use it instead of the procedural model
for (const [type, T] of Object.entries(TYPES)) { const make = T.make; T.make = () => customModel(type) || make(); }
const HORIZON = 360;      // spawn rows this far ahead (route metres)
const P_HL = 1.35, P_HW = 0.72;
const lerp = (a, b, t) => a + (b - a) * t;
const _v = new THREE.Vector3();

export class Run {
  constructor(ctx) {
    Object.assign(this, ctx); // scene, world, player, coins, fx, weather, env, ui, onEnd, camera
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.pools = new Map();
    this.obs = [];
    this.pickups = [];
    this.letters = [];
    this.active = false;
    this.rival = new Rival(this.scene);
  }

  // ---------------- pooling ----------------
  take(key, make) {
    const l = this.pools.get(key);
    const o = l && l.length ? l.pop() : make();
    (o.group || o).userData.poolKey = key;
    this.root.add(o.group || o);
    return o;
  }
  give(o) {
    const g = o.group || o;
    this.root.remove(g);
    const k = g.userData.poolKey;
    if (!this.pools.has(k)) this.pools.set(k, []);
    this.pools.get(k).push(o);
  }

  clearAll() {
    for (const o of this.obs) this.give(o.model);
    for (const p of this.pickups) this.give(p.model);
    for (const l of this.letters) this.give(l.model);
    this.obs.length = 0; this.pickups.length = 0; this.letters.length = 0;
    this.rival.reset(0);
    if (this.mission) this.endMission(false, true);
    this.coins.clear();
  }

  // ---------------- lifecycle ----------------
  start() {
    this.clearAll();
    this.world.reset(0);
    this.D = 0;
    this.player.reset();
    this.player.model.passenger.visible = false;
    this.speed = SPEED.start;
    this.time = 0;
    this.score = 0;
    this.coinsRun = 0;
    this.combo = 0; this.comboT = 0; this.mult = 1;
    this.nitro = 0.35; this.nitroOn = false;
    this.power = { magnet: 0, shield: 0, double: 0 };
    this.lives = 3 + save.upgrades.armor;
    this.maxLives = this.lives;
    this.invuln = 0; this.slow = 0; this.shake = 0;
    this.rowA = 120;
    this.nextPowerA = 320;
    this.missionTimer = 8;
    this.mission = null;
    this.hornCD = 0;
    this.puddleT = 0;
    this.gateIdx = 0;
    this.revived = false;
    this.weatherT = rand(35, 60);
    this.weather.clear();
    this.env.tod = 0.56;
    this.stats = { coins: 0, distance: 0, nearMiss: 0, fares: 0, smash: 0, tricks: 0, powerups: 0, gates: 0, rainDistance: 0, nightDistance: 0, hornClears: 0, maxSpeed: 0, faresRs: 0, rivals: 0, letters: 0 };
    this.fever = 0; this.feverCD = 0;
    this.headstart = 0;
    this.boostWindow = 7;
    this.baseSpeed = SPEED.start;
    this.rival.reset(0);
    this.nextLetterA = 450;
    this.ensureLetters();
    this.liveCheckT = 1;
    this.chatterT = 0;
    this.active = true;
    this.ui.district(DISTRICTS[districtIndexAt(0)]);
    this.ui.letters(save.letters.got);
    audio.setMode('drive');
  }

  revive() {
    this.revived = true;
    this.lives = 1;
    this.invuln = 3; this.player.blink = 3;
    for (const o of this.obs) if (o.z > -70 && !o.dead) this.smash(o, true);
    this.active = true;
    audio.setMode('drive');
  }

  get distance() { return this.D; }

  // ---------------- spawning ----------------
  zOf(o, D = this.D) { return (D - o.A) * o.f; }

  conflict(a, b) {
    const sep = a.hl + b.hl + 2;
    const d0 = this.D, d1 = Math.max(a.A, b.A) + 10;
    const dz = D => (D - a.A) * a.f - (D - b.A) * b.f;
    const z0 = dz(d0), z1 = dz(d1);
    return Math.sign(z0) !== Math.sign(z1) || Math.abs(z0) < sep || Math.abs(z1) < sep;
  }

  canPlace(c, ignore = null) {
    for (const o of this.obs) {
      if (o === ignore || o.dead) continue;
      const shares = o.lanes.some(l => c.lanes.includes(l));
      if (shares && this.conflict(o, c)) return false;
    }
    if (c.hard) {
      const m = 9; // reaction margin (route metres)
      const a0 = c.A - (c.hl + P_HL) / c.f - m, a1 = c.A + (c.hl + P_HL) / c.f + m;
      const blocked = new Set([c.lane]);
      for (const o of this.obs) {
        if (o === ignore || o.dead || !o.hard) continue;
        const b0 = o.A - (o.hl + P_HL) / o.f, b1 = o.A + (o.hl + P_HL) / o.f;
        if (b1 >= a0 && b0 <= a1) blocked.add(o.lane);
      }
      if (blocked.size >= 3) return false;
    }
    return true;
  }

  spawn(type, lane, A, extra = {}) {
    const T = TYPES[type];
    const variant = randi(0, T.variants - 1);
    const key = `${type}${variant}`;
    const probe = this.pools.get(key)?.at(-1);
    const dims = probe || T.dimsCache?.[variant];
    const hl = dims ? dims.hl : 4.5, hw = dims ? dims.hw : 1.3, h = dims ? dims.h : 2;
    const cand = {
      type, T, lane, A, f: T.f, hl, hw, h, hard: !!T.hard,
      lanes: type === 'cow' ? [0, 1, 2] : [lane], ...extra,
    };
    if (!this.canPlace(cand)) return null;
    const model = this.take(key, () => T.make());
    T.dimsCache ||= {}; T.dimsCache[variant] = { hl: model.hl, hw: model.hw, h: model.h };
    Object.assign(cand, { model, hl: model.hl, hw: model.hw, h: model.h, x: LANES[lane], y: 0, dead: false, done: false, minDx: 99, over: false, fly: null, wob: rand(0, 6) });
    if (type === 'cow') {
      cand.dir = Math.random() < 0.5 ? -1 : 1;
      cand.hw = 1.1; cand.hl = 0.5;
      model.group.rotation.y = cand.dir > 0 ? 0 : Math.PI;
    } else model.group.rotation.set(0, 0, 0);
    model.group.position.set(cand.x, 0, this.zOf(cand));
    this.obs.push(cand);
    return cand;
  }

  hardNear(lane, A, r = 4) {
    return this.obs.some(o => !o.dead && (o.hard || o.T.jump) && o.lane === lane && Math.abs(o.A - A) < r + o.hl / o.f);
  }
  coinLine(lane, A0, n, gap = 3.2) {
    for (let i = 0; i < n; i++) {
      const A = A0 + i * gap;
      if (!this.hardNear(lane, A)) this.coins.add(A, LANES[lane], 0.9);
    }
  }
  coinArc(lane, Aplayer, vy, n, gap = 2.8) {
    // coins along a jump arc that starts at Aplayer with vertical speed vy
    const v = Math.max(this.speed, 18);
    for (let i = 0; i < n; i++) {
      const A = Aplayer + 2 + i * gap;
      const t = (A - Aplayer) / v;
      const y = vy * t - 14 * t * t;
      if (y > 0.2) this.coins.add(A, LANES[lane], 0.9 + y);
    }
  }

  spawnRow() {
    const A = this.rowA;
    const diff = Math.min(1, A / 7000);
    const lanes = [0, 1, 2].sort(() => Math.random() - 0.5);
    const vehicle = () => pick(diff < 0.2 ? ['car', 'car', 'car', 'van', 'bike'] : ['car', 'car', 'van', 'truck', 'bus', 'bike']);
    const w = [
      ['one', 3], ['two', 1.5 + diff * 2.5], ['jump', 1.4], ['ramp', 0.8], ['cow', 0.6],
      ['bikes', 0.9], ['cart', 0.5], ['puddle', 0.6], ['coins', 1.4 - diff], ['baraat', 0.35], ['breaker', 0.7], ['rough', 0.6], ['manhole', 0.5],
    ];
    let r = Math.random() * w.reduce((s, x) => s + x[1], 0), pat = 'one';
    for (const [k, v] of w) { if ((r -= v) < 0) { pat = k; break; } }

    switch (pat) {
      case 'one': {
        this.spawn(vehicle(), lanes[0], A);
        if (Math.random() < 0.7) this.coinLine(lanes[1], A - 10, randi(4, 7));
        break;
      }
      case 'two': {
        this.spawn(vehicle(), lanes[0], A);
        this.spawn(vehicle(), lanes[1], A + rand(0, 12));
        if (Math.random() < 0.6) this.coinLine(lanes[2], A - 8, 5);
        break;
      }
      case 'jump': {
        const t = Math.random() < 0.5 ? 'pothole' : 'barrier';
        const n = Math.random() < 0.35 + diff * 0.3 ? 3 : randi(1, 2);
        for (let i = 0; i < n; i++) this.spawn(t, lanes[i], A);
        if (n < 3 && Math.random() < 0.5) this.spawn(vehicle(), lanes[2], A + rand(-4, 8));
        if (Math.random() < 0.8) this.coinArc(lanes[0], A - Math.max(this.speed, 18) * 0.32, 9, 7, 1.8);
        break;
      }
      case 'ramp': {
        const L = lanes[0];
        if (this.spawn('ramp', L, A)) {
          this.coinArc(L, A, 13.5, 10, 3);
          if (Math.random() < 0.6) this.spawn('car', L, A + 16);
          if (Math.random() < 0.7) this.spawn(vehicle(), lanes[1], A + rand(-3, 6));
        }
        break;
      }
      case 'cow': {
        this.spawn('cow', lanes[0], A);
        this.coinLine(lanes[1], A - 6, 4);
        break;
      }
      case 'bikes': {
        this.spawn('bike', lanes[0], A);
        if (Math.random() < 0.6) this.spawn('bike', lanes[1], A + rand(6, 14));
        break;
      }
      case 'breaker': {
        // speed breakers span the full road — jump it or take the jolt
        for (const l of [0, 1, 2]) this.spawn('breaker', l, A);
        if (Math.random() < 0.6) this.coinArc(lanes[0], A - Math.max(this.speed, 18) * 0.32, 9, 7, 1.8);
        break;
      }
      case 'rough': {
        this.spawn('rough', lanes[0], A);
        if (Math.random() < 0.5) this.spawn('rough', lanes[1], A + rand(-4, 4));
        this.coinLine(lanes[2], A - 8, 6);
        break;
      }
      case 'manhole': {
        this.spawn('manhole', lanes[0], A);
        if (Math.random() < 0.5) this.spawn(vehicle(), lanes[1], A + rand(-3, 6));
        this.coinArc(lanes[0], A - Math.max(this.speed, 18) * 0.32, 9, 6, 1.8);
        break;
      }
      case 'baraat': {
        if (this.spawn('baraat', lanes[0], A)) this.coinLine(lanes[1], A - 8, 6);
        break;
      }
      case 'cart': {
        this.spawn('cart', lanes[0], A);
        this.coinLine(lanes[0], A + 8, 5);
        break;
      }
      case 'puddle': {
        this.spawn('puddle', lanes[0], A);
        if (Math.random() < 0.5) this.spawn('puddle', lanes[1], A + rand(-5, 5));
        this.coinLine(lanes[2], A - 6, 5);
        break;
      }
      default: {
        // zig-zag coin trail
        let L = lanes[0];
        for (let i = 0; i < 4; i++) { this.coinLine(L, A + i * 13, 4); L = Math.max(0, Math.min(2, L + (Math.random() < 0.5 ? -1 : 1))); }
      }
    }

    // K-A-R-A-C-H-I letter (one at a time, in order)
    if (A >= this.nextLetterA && save.letters.got < LETTERS.length) {
      const free = [0, 1, 2].filter(l => !this.hardNear(l, A + 30, 12));
      if (free.length) {
        const ch = LETTERS[save.letters.got];
        const model = this.take(`letter${ch}`, () => createLetter(ch));
        this.letters.push({ ch, model, A: A + 30, x: LANES[pick(free)] });
        this.nextLetterA = A + rand(650, 1000);
      }
    }
    // power-up on a free lane
    if (A >= this.nextPowerA) {
      const free = [0, 1, 2].filter(l => !this.hardNear(l, A + 20, 10));
      if (free.length) {
        const type = pick(['magnet', 'magnet', 'shield', 'shield', 'double', 'double', 'nitro', 'nitro', 'nitro', 'paan', 'paan']);
        const def = POWERUPS[type];
        const model = this.take(`pu${type}`, () => createPowerup(type, def.color, def.icon).group);
        this.pickups.push({ type, model, A: A + 20, x: LANES[pick(free)] });
        this.nextPowerA = A + rand(280, 450);
      }
    }
    const v = Math.max(this.speed, SPEED.start);
    this.rowA += Math.max(22, v * lerp(1.55, 0.78, diff));
  }

  // ---------------- input ----------------
  input(a) {
    if (!this.active) return;
    const p = this.player;
    if (a === 'left' && p.move(-1)) audio.tone(300, 0.06, { type: 'triangle', vol: 0.05 });
    else if (a === 'right' && p.move(1)) audio.tone(300, 0.06, { type: 'triangle', vol: 0.05 });
    else if (a === 'jump') p.jump();
    else if (a === 'down') p.down();
    else if (a === 'nitro') this.fireNitro();
    else if (a === 'horn') this.horn();
    else if (a === 'boostA') this.useBoost('headstart');
    else if (a === 'boostB') this.useBoost('shieldStart');
  }

  useBoost(id) {
    if (this.boostWindow <= 0 || !(save.items[id] > 0)) return false;
    save.items[id]--; persist();
    if (id === 'headstart') { this.headstart = 5.5; audio.nitro(); this.ui.popup('HEADSTART! ⏩', 'nitro'); this.shake = 0.6; }
    else { this.power.shield = 20; audio.powerup(); this.ui.popup('SHIELD ON! 🛡️', 'good'); }
    this.ui.boosts(this.boostWindow, save.items);
    return true;
  }

  ensureLetters() {
    const d = new Date(); const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (save.letters.date !== key) { save.letters = { date: key, got: 0 }; persist(); }
  }

  fireNitro() {
    if (this.nitroOn) return;
    if (this.nitro < 0.3) { this.ui.toast('Nitro charging…', 900); return; }
    this.nitroOn = true;
    audio.nitro();
    this.shake = Math.max(this.shake, 0.4);
    this.ui.popup('NITRO!', 'nitro');
  }

  horn() {
    audio.horn(save.horn);
    if (this.hornCD > 0) return;
    this.hornCD = 1.2;
    const p = this.player;
    let target = null, best = -999;
    for (const o of this.obs) {
      if (o.dead || !o.hard || o.lane !== p.lane) continue;
      const z = o.z;
      if (z < -55 || z > -9) continue;
      if (z > best) { best = z; target = o; }
    }
    if (!target) return;
    if (target.type === 'cow' || target.type === 'baraat') {
      if (target.type === 'baraat') { this.ui.speech('Baraat hai bawa, ruk ja! Mubarak ho! 🎉', 1800); return; } this.ui.speech(pick(LINES.hornCow), 1800); return; }
    if (target.T.heavy) { setTimeout(() => audio.horn(2), 350); this.ui.popup('Truck waala nai hatega bawa!', 'warn'); return; }
    const opts = [target.lane - 1, target.lane + 1].filter(l => l >= 0 && l <= 2).sort(() => Math.random() - 0.5);
    for (const l of opts) {
      const c = { ...target, lane: l, lanes: [l] };
      if (this.canPlace(c, target)) {
        target.lane = l; target.lanes = [l];
        this.stats.hornClears++;
        this.ui.popup(pick(SHOUTS.horn), 'good');
        this.addCombo(1);
        return;
      }
    }
  }

  // ---------------- scoring helpers ----------------
  addCombo(n) {
    this.combo += n; this.comboT = 6;
    this.mult = Math.min(6, 1 + Math.floor(this.combo / 3) * 0.5);
    if (this.mult >= 6 && this.fever <= 0 && this.feverCD <= 0) {
      this.fever = 8; this.feverCD = 20;
      this.ui.fever(true);
      this.ui.popup('🔥 FEVER MODE! 🔥', 'trick');
      audio.gate();
    }
  }
  get fx2() { return this.fever > 0 ? 2 : 1; }
  screenPos(x, y, z) {
    _v.set(x, y, z).project(this.camera);
    return { x: (_v.x * 0.5 + 0.5) * innerWidth, y: (-_v.y * 0.5 + 0.5) * innerHeight };
  }

  smash(o, quiet = false) {
    if (o.dead) return;
    o.dead = true;
    if (o.T.flat) return;
    if (o.T.noSmash) {
      if (!quiet) { this.ui.popup(o.type === 'baraat' ? 'MUBARAK HO! 🎉' : 'MOOO! 🐄', 'good'); this.coinsRun += 10; this.fx.emit(o.x, 2, o.z, 30, { colors: [0xff2e88, 0xffd60a, 0x2bff88], speed: 6, up: 6, life: 1.2, size: 0.3, grav: 6 }); }
      return;
    }
    const side = o.x - this.player.x || (Math.random() - 0.5);
    o.fly = { vx: Math.sign(side) * rand(5, 9), vy: rand(7, 11), vz: rand(-14, -6), rx: rand(-6, 6), rz: rand(-8, 8), t: 0, oz: 0 };
    this.fx.emit(o.x, 1, o.z + o.hl, 26, { colors: [0xffd60a, 0xff7a1a, 0xffffff], speed: 8, up: 4, life: 0.7, size: 0.35 });
    if (!quiet) {
      if (o.T.vehicle) this.stats.smash++;
      this.score += Math.round(250 * this.mult);
      this.ui.popup(`${pick(SHOUTS.smash)} +${Math.round(250 * this.mult)}`, 'nitro');
      audio.smash();
      this.shake = Math.max(this.shake, 0.5);
    }
  }

  damage(o) {
    this.lives--;
    this.invuln = 2.2; this.player.blink = 2.2;
    this.slow = 1;
    this.combo = 0; this.mult = 1; this.comboT = 0;
    if (this.fever > 0) { this.fever = 0; this.ui.fever(false); }
    this.shake = 1;
    this.ui.flash();
    this.ui.popup(pick(SHOUTS.ouch), 'bad');
    audio.crash();
    try { navigator.vibrate?.(180); } catch { /* not supported */ }
    this.fx.emit(this.player.x, 1, -1.2, 30, { colors: [0xffffff, 0xaaaaaa, 0xffd60a], speed: 6, up: 3, life: 0.8, size: 0.4 });
    this.smash(o, true);
    if (this.mission?.state === 'ride') { this.mission.timeLeft -= 5; this.ui.speech(pick(LINES.hit), 2000); }
    if (this.lives <= 0) this.end();
  }

  end() {
    this.active = false;
    this.nitroOn = false;
    audio.engine(0, 0, false);
    audio.gameover();
    audio.setMode('calm');
    this.onEnd();
  }

  // ---------------- missions (passengers) ----------------
  startWaiting() {
    const side = Math.random() < 0.5 ? -1 : 1;
    const p = this.take(`person${randi(0, 5)}`, () => createStanding(randomLook()));
    p.group.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    const beacon = this.take('beaconW', () => createBeacon(0xffd60a));
    this.mission = { state: 'wait', side, A: this.D + 200, person: p, beacon };
    this.ui.toast(`Sawari waiting on the ${side < 0 ? 'LEFT' : 'RIGHT'} — use the ${side < 0 ? 'left' : 'right'} lane!`, 2600);
  }
  pickup() {
    const m = this.mission;
    this.give(m.person); this.give(m.beacon);
    const dist = Math.round(rand(500, 900) / 10) * 10;
    const t = Math.round(dist / Math.max(this.speed, 20) * 1.45 + 5);
    const beacon = this.take('beaconD', () => createBeacon(0x2bff88));
    this.mission = { state: 'ride', side: m.side, destA: this.D + dist, timeLeft: t, total: t, dist, beacon };
    this.player.model.passenger.visible = true;
    this.ui.speech(pick(LINES.request).replace('{d}', dist).replace('{t}', t), 3200);
    this.chatterT = rand(7, 10);
    audio.powerup();
  }
  endMission(success, silent = false) {
    const m = this.mission;
    if (!m) return;
    if (m.person) this.give(m.person);
    if (m.beacon) this.give(m.beacon);
    this.player.model.passenger.visible = false;
    this.mission = null;
    this.missionTimer = rand(9, 15);
    this.ui.mission(null);
    if (silent) return;
    if (success) {
      const fare = 40 + Math.round(m.timeLeft * 6);
      const mul = this.power.double > 0 ? 2 : 1;
      this.coinsRun += fare * mul;
      this.stats.faresRs += fare * mul;
      this.stats.fares++;
      this.score += Math.round(fare * 20 * this.mult);
      this.addCombo(3);
      this.ui.speech(`${pick(LINES.success)}  +Rs.${fare * mul}`, 3200);
      this.ui.popup(`FARE +Rs.${fare * mul}`, 'good');
      this.fx.emit(this.player.x + m.side * 2, 2, -2, 60, { colors: [0xff2e88, 0xffd60a, 0x2bff88, 0x00e5ff, 0xffffff], speed: 7, up: 7, life: 1.4, size: 0.3, grav: 6 });
      audio.fare();
    } else {
      this.ui.speech(pick(LINES.fail), 2600);
      audio.fail();
    }
  }
  updateMission(dt) {
    const m = this.mission;
    if (!m) {
      this.missionTimer -= dt;
      if (this.missionTimer <= 0 && this.D > 200) this.startWaiting();
      return;
    }
    if (m.state === 'wait') {
      const z = this.D - m.A;
      const x = m.side * 6.2;
      m.person.group.position.set(x, 0.22, z);
      m.person.arm.rotation.z = (m.side > 0 ? 1 : -1) * (2.6 + Math.sin(this.time * 9) * 0.5);
      m.beacon.position.set(m.side * 4.4, 0, z);
      m.beacon.scale.y = 0.15;
      const edge = m.side < 0 ? 0 : 2;
      if (Math.abs(z) < 3 && this.player.lane === edge && this.player.y < 1.2) this.pickup();
      else if (z > 4) { this.endMission(false, true); this.ui.toast('Sawari missed!', 1400); }
      else this.ui.mission({ text: `Sawari ahead (${m.side < 0 ? '◀ left' : 'right ▶'})`, time: Math.max(0, Math.round(-z)) + 'm', frac: 1 });
      return;
    }
    // riding
    m.timeLeft -= dt;
    const left = m.destA - this.D;
    m.beacon.position.set(m.side * 6.2, 0, -left);
    m.beacon.scale.y = 1;
    this.ui.mission({ text: `Drop-off in ${Math.max(0, Math.round(left))}m`, time: `${Math.max(0, Math.ceil(m.timeLeft))}s`, frac: m.timeLeft / m.total, urgent: m.timeLeft < 6 });
    this.chatterT -= dt;
    if (this.chatterT <= 0) { this.ui.speech(pick(LINES.chatter), 2800); this.chatterT = rand(9, 14); }
    if (left <= 0) this.endMission(true);
    else if (m.timeLeft <= 0) this.endMission(false);
  }

  // ---------------- main update ----------------
  update(dt) {
    if (!this.active) return;
    const p = this.player;
    this.time += dt;

    // speed
    const base = Math.min(SPEED.max, SPEED.start + this.time * SPEED.accel);
    this.baseSpeed = base;
    this.slow = Math.max(0, this.slow - dt * 0.7);
    let target = base * (1 - this.slow * 0.5);
    if (this.nitroOn) target *= 1.5;
    if (this.headstart > 0) target = Math.max(target, base * 2.6);
    if (p.brake > 0) target *= 0.7;
    if (this.puddleT > 0) { target *= 0.85; this.puddleT -= dt; }
    this.speed += (target - this.speed) * Math.min(1, dt * (this.nitroOn ? 4 : 2.5));
    this.D += this.speed * dt;
    this.stats.distance = Math.floor(this.D);
    this.stats.maxSpeed = Math.max(this.stats.maxSpeed, Math.round(this.speed));

    // timers
    this.invuln = Math.max(0, this.invuln - dt);
    this.hornCD = Math.max(0, this.hornCD - dt);
    for (const k in this.power) this.power[k] = Math.max(0, this.power[k] - dt);
    this.comboT -= dt;
    this.feverCD = Math.max(0, this.feverCD - dt);
    if (this.fever > 0) { this.fever -= dt; if (this.fever <= 0) this.ui.fever(false); }
    if (this.headstart > 0) { this.headstart -= dt; if (Math.random() < 0.8) this.fx.emit(p.x, 0.6, 2, 2, { color: 0xffd60a, speed: 2, up: 1, life: 0.4, size: 0.4, grav: -1 }); }
    if (this.boostWindow > 0) { this.boostWindow -= dt; this.ui.boosts(this.boostWindow, save.items); }
    if (this.comboT <= 0 && this.combo) { this.combo = 0; this.mult = 1; }
    if (this.nitroOn) {
      this.nitro -= dt / (3 + save.upgrades.nitro * 0.6);
      if (this.nitro <= 0) { this.nitro = 0; this.nitroOn = false; audio.backfire(); }
      if (Math.random() < 0.6) this.fx.emit(p.x + 0.45, p.y + 0.4, 2, 1, { color: 0x5ee7ff, speed: 1, up: 0.5, life: 0.35, size: 0.35, grav: -1 });
    }

    // score from distance
    this.score += this.speed * dt * this.mult * 0.5 * this.fx2;

    // player
    p.update(dt, this.speed, this.nitroOn || this.headstart > 0 ? 1 : 0);
    for (const ev of p.events) this.playerEvent(ev);
    p.events.length = 0;
    const m = p.model;
    m.shield.visible = this.power.shield > 0;
    if (m.shield.visible) { m.shield.material.uniforms.t.value = this.time; m.shield.material.uniforms.a.value = this.power.shield < 2 ? (Math.sin(this.time * 20) > 0 ? 1 : 0.3) : 1; }

    // spawning
    while (this.rowA - this.D < HORIZON) this.spawnRow();

    // obstacles
    const pb = p.box;
    for (let i = this.obs.length - 1; i >= 0; i--) {
      const o = this.obs[i];
      let z = this.zOf(o);
      // lateral motion
      const tx = LANES[o.lane];
      if (o.type === 'cow') {
        o.x = Math.max(-6.5, Math.min(6.5, tx + o.dir * 0.06 * (this.D - o.A)));
        o.model.group.position.y = Math.abs(Math.sin(this.time * 5 + o.wob)) * 0.06;
      } else if (o.type === 'bike') {
        o.x += (tx + Math.sin(this.time * 1.7 + o.wob) * 0.35 - o.x) * Math.min(1, dt * 3);
        o.model.group.rotation.z = Math.sin(this.time * 1.7 + o.wob) * 0.08;
      } else {
        const dx = tx - o.x;
        o.x += dx * Math.min(1, dt * 2.2);
        if (!o.fly) o.model.group.rotation.y = -dx * 0.08;
      }
      if (o.fly) {
        const f = o.fly;
        f.t += dt; f.vy -= 22 * dt; f.oz += f.vz * dt;
        o.y = Math.max(-3, o.y + f.vy * dt);
        o.x += f.vx * dt;
        o.model.group.rotation.x += f.rx * dt; o.model.group.rotation.z += f.rz * dt;
        z += f.oz;
      }
      o.z = z;
      o.model.group.position.set(o.x, o.y, z);
      if (z > 30 || (o.fly && o.fly.t > 3)) { this.give(o.model); this.obs.splice(i, 1); continue; }
      if (o.dead) continue;

      // collision
      const dz = Math.abs(z), dx = Math.abs(o.x - pb.x);
      const zOverlap = dz < o.hl + pb.hl;
      if (zOverlap) {
        o.minDx = Math.min(o.minDx, dx);
        if (dx < o.hw + pb.hw) {
          if (o.T.ramp) { if (pb.y < 0.5) p.launch(); continue; }
          if (o.T.bump || o.T.rough) {
            if (pb.y >= 0.3 && o.T.bump && !o.splashed) { o.splashed = true; this.score += 50 * this.mult; this.ui.popup('CLEAN JUMP! +50', 'good'); continue; }
            if (pb.y < 0.3 && !o.splashed) {
              o.splashed = true;
              if (this.nitroOn || this.headstart > 0) { this.ui.popup('UDA DIYA! 💨', 'nitro'); continue; }
              this.slow = Math.max(this.slow, o.T.bump ? 0.45 : 0.3);
              this.shake = Math.max(this.shake, o.T.bump ? 0.7 : 0.5);
              p.bump(o.T.bump ? 5 : 2.5);
              audio.bump(o.T.bump ? 1 : 0.6);
              this.fx.emit(p.x, 0.2, 0.5, 14, { color: 0x9a8a72, speed: 3, up: 2, life: 0.5, size: 0.35, grav: 6 });
              if (o.T.bump) { this.ui.popup(pick(['SPEED BREAKER! 😵', 'ABEY BREAKER!', 'DHAKKA! 🫨']), 'warn'); if (this.mission?.state === 'ride') this.ui.speech(pick(['Abey kamar toot gayi meri!', 'Bawa breaker dekh ke!', 'Meri chai phir gir gayi!']), 1800); }
              else this.ui.popup(pick(['KHADDE HI KHADDE!', 'SADAK HAI YA CHAND? 🌑']), 'warn');
            }
            continue;
          }
          if (o.T.puddle) {
            if (pb.y < 0.3 && !o.splashed) {
              o.splashed = true; this.puddleT = 0.6; audio.splash();
              this.fx.emit(p.x, 0.3, 0.5, 40, { color: 0xbfe3ff, speed: 5, up: 5, life: 0.7, size: 0.25, grav: 14 });
            }
            continue;
          }
          if (pb.y < o.h) {
            if (this.nitroOn || this.headstart > 0) this.smash(o);
            else if (this.power.shield > 0) { this.power.shield = 0; audio.shieldBreak(); this.ui.popup('SHIELD SAVED YOU', 'good'); this.smash(o, true); }
            else if (this.invuln > 0) { /* ghosting */ }
            else this.damage(o);
            continue;
          } else if (!o.T.flat) o.over = true;
        }
      } else if (!o.done && z > o.hl + pb.hl) {
        o.done = true;
        if (o.over) { this.stats.nearMiss++; this.addCombo(1); this.nitro = Math.min(1, this.nitro + 0.08); this.ui.popup(`AIR OVER! x${this.mult}`, 'good'); this.score += 100 * this.mult; }
        else if (o.hard && (o.minDx < 2.4 || (o.minDx < 3.3 && this.time - p.lastLaneChange < 0.6))) {
          this.stats.nearMiss++;
          this.addCombo(1);
          this.nitro = Math.min(1, this.nitro + 0.1);
          this.score += 50 * this.mult;
          this.ui.popup(`${pick(SHOUTS.near)} x${this.mult}`, 'near');
          audio.near();
        }
      }
    }

    // coins
    const got = this.coins.update(dt, this.D, p, this.power.magnet > 0);
    if (got) {
      const value = (1 + save.upgrades.coinValue) * (this.power.double > 0 ? 2 : 1) * this.fx2;
      this.coinsRun += got * value;
      this.stats.coins += got;
      this.score += got * 10 * this.mult;
      this.nitro = Math.min(1, this.nitro + got * 0.01);
      audio.coin(this.combo);
      this.fx.emit(p.x, p.y + 1, -0.6, 6 * got, { color: 0xffd60a, speed: 3, up: 2, life: 0.4, size: 0.2 });
    }

    // power-up pickups
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const u = this.pickups[i];
      const z = this.D - u.A;
      u.model.position.set(u.x, 1.3 + Math.sin(this.time * 3 + u.A) * 0.15, z);
      u.model.userData.ring.rotation.y = this.time * 2.5;
      if (Math.abs(z) < 1.6 && Math.abs(u.x - p.x) < 1.4 && p.y < 3) {
        this.collectPower(u.type);
        this.give(u.model); this.pickups.splice(i, 1);
      } else if (z > 20) { this.give(u.model); this.pickups.splice(i, 1); }
    }

    // letters
    for (let i = this.letters.length - 1; i >= 0; i--) {
      const L = this.letters[i];
      const z = this.D - L.A;
      L.model.position.set(L.x, 1.5 + Math.sin(this.time * 3) * 0.2, z);
      L.model.rotation.y = Math.sin(this.time * 2) * 0.4;
      if (Math.abs(z) < 1.6 && Math.abs(L.x - p.x) < 1.4 && p.y < 3.2) {
        this.give(L.model); this.letters.splice(i, 1);
        this.collectLetter(L.ch);
      } else if (z > 20) { this.give(L.model); this.letters.splice(i, 1); }
    }
    // rival race
    if (!this.rival.active && this.D > this.rival.next && this.headstart <= 0) {
      this.rival.start(randi(0, 2));
      this.ui.speech(pick(LINES.rivalStart), 2800);
      this.ui.race(true);
      audio.horn(2);
    }
    const rr = this.rival.update(dt, this);
    if (this.rival.active) this.ui.raceGap(Math.round(-this.rival.z));
    if (rr) {
      this.ui.race(false);
      this.rival.next = this.D + rand(RIVAL.every[0], RIVAL.every[1]);
      if (rr === 'win') {
        this.stats.rivals++;
        this.coinsRun += RIVAL.reward; this.score += 1500 * this.mult; this.addCombo(3);
        this.ui.popup(`RACE JEETI! +Rs ${RIVAL.reward}`, 'trick');
        this.ui.speech(pick(LINES.rivalWin), 2600);
        audio.fare();
      } else if (rr === 'lose') { this.ui.speech(pick(LINES.rivalLose), 2400); audio.fail(); }
      else this.ui.toast('Chotu Ustad ne race chhor di!', 1600);
    }

    this.updateMission(dt);

    // district gates
    const gi = Math.floor(this.D / DISTRICT_LENGTH);
    if (gi > this.gateIdx) {
      this.gateIdx = gi;
      this.stats.gates++;
      const d = DISTRICTS[districtIndexAt(this.D)];
      this.score += 1000 * this.mult;
      this.ui.district(d, '+1000 Explorer bonus');
      if (!save.unlocked.includes(d.id)) { save.unlocked.push(d.id); persist(); setTimeout(() => this.ui.toast(`📍 ${d.name} unlocked — ab yahan se bhi start kar sakte ho!`, 2600), 2000); }
      audio.gate();
      this.fx.emit(p.x, 4, -6, 80, { colors: [0xffd60a, 0xff2e88, 0x2bff88, 0x00e5ff], speed: 9, up: 6, life: 1.6, size: 0.3, grav: 5 });
    }

    // weather + time of day
    this.env.tod = (this.env.tod + dt / 300) % 1;
    this.weatherT -= dt;
    if (this.weatherT <= 0) {
      if (this.weather.target > 0) { this.weather.set(false); this.weatherT = rand(50, 90); this.ui.toast('Mausam saaf ho gaya ☀️', 1600); }
      else if (Math.random() < 0.6) {
        const dust = Math.random() < 0.4;
        this.weather.set(true, dust ? 'dust' : 'rain');
        this.weatherT = rand(25, 45);
        this.ui.toast(dust ? 'Andhi aa gayi bawa! Dhool hi dhool 🌪️' : 'Baarish! Road phisalni hai, dhyan se 🌧️', 2000);
      }
      else this.weatherT = rand(30, 60);
    }
    if (this.weather.level > 0.5 && this.weather.kind === 'rain') this.stats.rainDistance += this.speed * dt;
    if (this.env.night > 0.6) this.stats.nightDistance += this.speed * dt;

    // live challenge completion
    this.liveCheckT -= dt;
    if (this.liveCheckT <= 0) {
      this.liveCheckT = 1;
      for (const c of checkLive(this.stats)) this.ui.toast(`✅ Challenge done: ${c.text}`, 2600);
    }

    audio.intensity = Math.min(1, (this.speed - SPEED.start) / (SPEED.max - SPEED.start));
    audio.engine(this.speed, this.nitroOn || this.headstart > 0 ? 1 : 0, true);
    audio.intensity = this.fever > 0 ? 1 : audio.intensity;
    this.shake = Math.max(0, this.shake - dt * 2.5);
  }

  collectLetter(ch) {
    save.letters.got++;
    this.stats.letters++;
    persist();
    audio.powerup();
    this.ui.letters(save.letters.got, true);
    if (save.letters.got >= LETTERS.length) {
      this.coinsRun += 2500; this.score += 5000 * this.mult;
      this.ui.district({ tag: 'JACKPOT', name: 'K A R A C H I', urdu: 'کراچی' }, '+Rs 2500!');
      this.fx.emit(this.player.x, 3, -4, 120, { colors: [0xffd60a, 0xd62828, 0x2bff88, 0x00e5ff, 0xffffff], speed: 10, up: 8, life: 1.8, size: 0.35, grav: 5 });
      audio.fare();
    } else this.ui.popup(`Letter ${ch}! ${save.letters.got}/7`, 'good');
  }

  collectPower(type) {
    const def = POWERUPS[type];
    this.stats.powerups++;
    audio.powerup();
    if (type === 'paan') {
      this.power.magnet = Math.max(this.power.magnet, 7);
      this.power.shield = Math.max(this.power.shield, 5);
      this.nitro = Math.min(1, this.nitro + 0.15);
      this.ui.popup('MEETHA PAAN! 🍃', 'good');
      this.ui.speech(pick(['Wah bawa, gulkand wala! Ab dekh mera kamaal!', 'Paan kha liya — ab dimaag fresh, rasta clear!', 'Ekdum meetha! Chal ab udaate hain!']), 2200);
      return;
    }
    if (type === 'nitro') { this.nitro = Math.min(1, this.nitro + 0.5); this.ui.popup('NITRO +50%', 'nitro'); return; }
    const lvl = save.upgrades[type] || 0;
    this.power[type] = def.base + def.per * lvl;
    this.ui.popup(def.label.toUpperCase() + '!', 'good');
  }

  playerEvent(ev) {
    const p = this.player;
    if (ev === 'jump') audio.jump();
    else if (ev === 'launch') { audio.launch(); this.ui.popup('RAMP!', 'good'); }
    else if (ev === 'land') audio.land();
    else if (ev === 'landHard') { audio.land(); this.shake = Math.max(this.shake, 0.25); this.fx.emit(p.x, 0.2, 0.3, 18, { color: 0xc9b08a, speed: 4, up: 1.5, life: 0.6, size: 0.4, grav: 3 }); }
    else if (ev === 'trickStart') audio.tone(500, 0.3, { type: 'triangle', vol: 0.08, to: 1200 });
    else if (ev === 'trick') {
      this.stats.tricks++;
      this.addCombo(2);
      this.nitro = Math.min(1, this.nitro + 0.2);
      const pts = Math.round(400 * this.mult);
      this.score += pts;
      this.ui.popup(`${pick(SHOUTS.trick)} 360° +${pts}`, 'trick');
      audio.trick();
    } else if (ev === 'sloppy') this.ui.popup('Sloppy landing!', 'warn');
    else if (ev === 'bump') audio.tone(120, 0.08, { type: 'square', vol: 0.05 });
  }
}
