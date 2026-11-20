// Kemari Harbour + Mazar-e-Quaid gardens scenery.
import { Builder, pick, rand, randi } from '../render/kit.js';
import { posters } from './posters.js';

const CONTAINER = [0xd62828, 0x1565c0, 0x0b8f3a, 0xff8f00, 0x00838f, 0x6a1b9a, 0xf2f2f2, 0x8d6e63];

/** Container ship lying along the road (length on z), hull towards +x (quay side). */
export function createShip() {
  const b = new Builder();
  const L = 56, W = 11;
  const hull = pick([0x1b2a49, 0x7a1f1f, 0x1f4d3a, 0x2b2b2b]);
  b.box(W, 6, L, hull, 0, 1.5, 0);
  b.box(W + 0.2, 0.6, L, 0xd62828, 0, -1.2, 0);                  // waterline stripe
  b.box(W * 0.7, 3, 6, hull, 0, 1.5, -L / 2 - 2.5, { r: [0, 0, 0] }); // bow taper
  b.box(W - 1, 0.3, L - 2, 0x6b6b6b, 0, 4.6, 0);                 // deck
  // container stacks
  for (let z = -L / 2 + 6; z < L / 2 - 14; z += 2.7) {
    const tiers = randi(2, 5);
    for (let t = 0; t < tiers; t++) for (let x = -3.6; x <= 3.6; x += 2.45) {
      if (Math.random() < 0.12) continue;
      b.box(2.35, 2.5, 2.55, pick(CONTAINER), x, 6.05 + t * 2.55, z);
    }
  }
  // bridge tower at the stern
  b.box(W - 2, 9, 7, 0xf2f2f2, 0, 9, L / 2 - 7);
  b.box(W - 1.6, 1.2, 7.4, 0x1e2a36, 0, 12.2, L / 2 - 7, { kind: 'glass' });
  b.box(1.4, 5, 1.4, 0xd62828, 0, 16, L / 2 - 5);
  for (let i = 0; i < 6; i++) b.sphere(0.25, 0xfff3c4, -4 + i * 1.6, 13.6, L / 2 - 10.6, { kind: 'glow', seg: 5 });
  b.sphere(0.35, 0xff2020, 0, 18.7, L / 2 - 5, { kind: 'glow', seg: 6 });
  return b.build();
}

/** Ship-to-shore gantry crane standing on the quay; boom reaches out over the water (-x). */
export function createCrane() {
  const b = new Builder();
  const col = pick([0xd62828, 0xf2b705, 0x1565c0]);
  for (const x of [-3, 3]) for (const z of [-4, 4]) b.box(0.6, 22, 0.6, col, x, 11, z);
  for (const y of [8, 21]) for (const z of [-4, 4]) b.box(6.6, 0.6, 0.6, col, 0, y, z);
  for (const x of [-3, 3]) b.box(0.6, 0.6, 8.6, col, x, 21, 0);
  b.box(36, 1.2, 1.4, col, -12, 23, 0);                    // boom
  b.box(1.2, 6, 1.2, col, 3, 26, 0);
  b.box(0.15, 0.15, 18, 0x333333, -5, 25, 0, { r: [0, Math.PI / 2, 0.15] });
  b.box(3, 2, 3, 0x333333, -18, 21.6, 0);                  // trolley
  b.box(0.08, 12, 0.08, 0x222222, -18, 15, 0);
  b.box(2.4, 2.6, 6, pick(CONTAINER), -18, 8.2, 0);        // container on the hook
  b.sphere(0.3, 0xff2020, -29, 23.9, 0, { kind: 'glow', seg: 5 });
  b.sphere(0.3, 0xff2020, 3, 29.2, 0, { kind: 'glow', seg: 5 });
  return b.build();
}

export function createBollard() {
  const b = new Builder();
  b.cyl(0.25, 0.3, 0.7, 0x2b2b2b, 0, 0.35, 0, { seg: 8 });
  b.cyl(0.38, 0.38, 0.12, 0x2b2b2b, 0, 0.72, 0, { seg: 8 });
  return b.build();
}

/** Port side buildings: warehouses or stacked containers behind a fence. */
export function portBlock(district) {
  const b = new Builder();
  if (Math.random() < 0.5) {
    const w = rand(14, 22), d = rand(12, 18), h = rand(7, 10);
    const wall = pick(district.walls);
    b.box(d, h, w, wall, -d / 2, h / 2, 0);
    for (let i = 0; i < 3; i++) b.box(d + 0.6, 0.6, w / 3 + 0.3, 0x5f6b72, -d / 2, h + 0.3 + (i % 2) * 0.4, -w / 3 + i * (w / 3), { kind: 'shiny' }); // sawtooth roof
    for (let z = -w / 2 + 3; z < w / 2 - 2; z += 6) {
      for (let k = 0; k < 10; k++) b.box(0.08, 0.38, 4.2, 0x8a8f96, 0.04, 0.3 + k * 0.4, z, { kind: 'shiny' }); // roller doors
      b.box(0.1, 0.12, 4.4, 0xfff0c8, 0.08, 4.4, z, { kind: 'glow' });
    }
    b.box(0.2, 1.4, w, pick(district.wood), 0.15, h - 1.2, 0);
    posters(b, w, 5.6, randi(2, 4));
    return { group: b.build(), w };
  }
  const w = rand(12, 18);
  // chain-link fence
  b.box(0.08, 2.2, w, 0x9a9a9a, 0, 1.1, 0, { kind: 'shiny' });
  for (let z = -w / 2; z <= w / 2; z += 3) b.box(0.12, 2.4, 0.12, 0x777777, 0, 1.2, z);
  for (let z = -w / 2 + 1.5; z < w / 2 - 1; z += 2.7) {
    const tiers = randi(1, 4);
    for (let t = 0; t < tiers; t++) for (let x = -2; x >= -12; x -= 6.2) b.box(6, 2.5, 2.5, pick(CONTAINER), x, 1.25 + t * 2.55, z);
  }
  return { group: b.build(), w };
}

// ---------------- Mazar-e-Quaid / Numaish ----------------
const GREEN = 0x0b6e3a;

function flagPole(b, x, z) {
  b.cyl(0.06, 0.08, 9, 0xdddddd, x, 4.5, z, { seg: 6, kind: 'shiny' });
  b.box(0.05, 1.6, 0.8, 0xffffff, x, 8.2, z + 0.45);                 // white band
  b.box(0.05, 1.6, 1.9, GREEN, x, 8.2, z + 1.8);                     // green field
  b.torus(0.42, 0.09, 0xffffff, x + 0.04, 8.25, z + 1.8, { r: [0, Math.PI / 2, 0], arc: Math.PI * 1.35 });
  b.sphere(0.12, 0xffffff, x + 0.04, 8.6, z + 2.15, { seg: 5 });
}

/** Garden strip: hedges, fountains, flags, trees. Faces +x like the buildings. */
export function parkSegment() {
  const b = new Builder();
  const w = rand(16, 24);
  b.box(0.8, 0.9, w, 0x2f6b2a, -0.6, 0.45, 0);                         // hedge
  for (let z = -w / 2; z <= w / 2; z += 4) b.box(0.18, 1.2, 0.18, 0xf5f5f0, -0.2, 0.6, z); // white posts
  b.box(4, 0.06, w, 0xd8d2c4, -6, 0.08, 0);                            // walkway
  if (Math.random() < 0.55) {
    // fountain
    b.cyl(2.6, 2.8, 0.6, 0xf2efe6, -12, 0.3, 0, { seg: 16 });
    b.cyl(2.3, 2.3, 0.05, 0x4fc3f7, -12, 0.58, 0, { seg: 16, kind: 'water' });
    b.cyl(0.4, 0.5, 1.6, 0xf2efe6, -12, 1.0, 0, { seg: 10 });
    b.cone(0.9, 2.2, 0xbfe9ff, -12, 2.9, 0, { seg: 10, kind: 'glow' });
  } else {
    for (let i = 0; i < 3; i++) b.sphere(rand(1.2, 1.8), pick([0x3f7f2f, 0x4f8f35, 0x2f6b2a]), -10 - rand(0, 6), rand(2.4, 3.4), -w / 3 + i * (w / 3), { seg: 7 });
    for (let i = 0; i < 3; i++) b.cyl(0.15, 0.2, 2.4, 0x5a4030, -10 - rand(0, 6), 1.2, -w / 3 + i * (w / 3), { seg: 5 });
  }
  if (Math.random() < 0.5) flagPole(b, -3, rand(-w / 3, w / 3));
  // flower beds
  for (let i = 0; i < 4; i++) b.box(1.6, 0.25, 1.6, pick([0xe84a8a, 0xffd60a, 0xff7a1a, 0xffffff]), -3.5 - rand(0, 2), 0.15, -w / 2 + 2 + i * (w / 4));
  return { group: b.build(), w };
}

/** A grand white domed mausoleum, seen across the gardens. */
export function createMausoleum() {
  const b = new Builder();
  const white = 0xf7f7f2, shade = 0xd9d9d0;
  // terraced platform
  b.box(70, 2, 70, shade, 0, 1, 0);
  b.box(54, 2, 54, white, 0, 3, 0);
  for (let i = 0; i < 6; i++) b.box(10, 0.33, 4 - i * 0.6, white, 30, 0.33 + i * 0.33, 0); // steps toward the road
  // cube body
  b.box(34, 22, 34, white, 0, 15, 0);
  for (const r of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    // tall pointed arch openings (dark recesses) on each face
    const cx = Math.cos(r) * 17.05, cz = -Math.sin(r) * 17.05;
    b.box(r % Math.PI === 0 ? 0.3 : 10, 15, r % Math.PI === 0 ? 10 : 0.3, 0x3a3f46, cx, 12.5, cz);
    b.box(r % Math.PI === 0 ? 0.32 : 4, 3, r % Math.PI === 0 ? 4 : 0.32, 0x3a3f46, cx, 21, cz, { r: [0, 0, 0] });
  }
  b.box(36, 1.2, 36, shade, 0, 26.6, 0);
  // drum + dome + finial
  b.cyl(14, 15, 5, white, 0, 29.6, 0, { seg: 24 });
  b.sphere(15, white, 0, 32, 0, { seg: 24, half: true, s: [1, 1.15, 1] });
  b.cyl(0.6, 0.9, 2.5, 0xd4af37, 0, 50.3, 0, { seg: 8, kind: 'shiny' });
  b.torus(1.2, 0.25, 0xd4af37, 0, 52.4, 0, { kind: 'shiny', arc: Math.PI * 1.4, r: [0, 0, 1.2] });
  // night floodlights
  for (const x of [-26, 26]) for (const z of [-26, 26]) b.sphere(0.8, 0xfff3c4, x, 4.6, z, { kind: 'glow', seg: 6 });
  return b.build();
}

export function createFlagLamp() {
  const b = new Builder();
  flagPole(b, 0, 0);
  return b.build();
}
