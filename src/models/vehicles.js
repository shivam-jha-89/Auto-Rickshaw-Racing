// Traffic + animals. All face -z (same direction as the player), so you mostly see their backs.
// Each factory returns { group, hw, hl, h } — half width, half length, height (for collisions).
import { Builder, pick, rand } from '../render/kit.js';
import { artUV } from '../render/textures.js';
import { addSeated, randomLook } from './person.js';

const GLASS = 0x1e2a36, DARK = 0x151515, CHROME = 0xcfcfcf;
const CAR_COLORS = [0xf5f5f5, 0xc0c4c8, 0x1d1d1f, 0xb3202a, 0x1f4e9c, 0x2e6b3a, 0xd9b45a, 0x6d4c8f, 0xe07a2c];

function wheels(b, xs, zs, r = 0.34, w = 0.26) {
  for (const x of xs) for (const z of zs) {
    b.cyl(r, r, w, DARK, x, r, z, { r: [0, 0, Math.PI / 2], seg: 12 });
    b.cyl(r * 0.5, r * 0.5, w + 0.02, 0x9a9a9a, x, r, z, { r: [0, 0, Math.PI / 2], seg: 8, kind: 'shiny' });
  }
}
function rearLights(b, hw, y, z, front) {
  for (const s of [-1, 1]) {
    b.box(0.3, 0.14, 0.05, 0xff2020, s * (hw - 0.22), y, z, { kind: 'glow' });
    b.box(0.26, 0.12, 0.05, 0xfffbe6, s * (hw - 0.22), y, front, { kind: 'glow' });
  }
  b.plane(hw * 2.6, 9, 'beamSoft', 0xffffff, [0, 0.06, front - 4.6], [-Math.PI / 2, 0, 0]); // headlight pool (night)
}
const shadow = (b, w, l) => b.plane(w, l, 'shadow', 0xffffff, [0, 0.03, 0], [-Math.PI / 2, 0, 0]);

export function createCar() {
  const b = new Builder(), c = pick(CAR_COLORS);
  const hatch = Math.random() < 0.5;
  const L = hatch ? 3.5 : 4.3;
  b.box(1.75, 0.62, L, c, 0, 0.62, 0, { kind: 'shiny' });
  b.box(1.5, 0.58, L * 0.5, GLASS, 0, 1.2, hatch ? 0.25 : 0.1, { kind: 'glass' });
  b.box(1.56, 0.07, L * 0.48, c, 0, 1.5, hatch ? 0.25 : 0.1, { kind: 'shiny' });
  for (const s of [-1, 1]) b.box(0.06, 0.58, 0.08, c, s * 0.76, 1.2, (hatch ? 0.25 : 0.1) - L * 0.12);
  b.box(1.8, 0.16, 0.12, DARK, 0, 0.42, L / 2);
  b.box(0.5, 0.15, 0.02, 0xf2f2f2, 0, 0.66, L / 2 + 0.01);
  rearLights(b, 0.875, 0.82, L / 2 + 0.01, -L / 2 - 0.01);
  wheels(b, [-0.8, 0.8], [-L * 0.32, L * 0.32]);
  shadow(b, 2.3, L + 0.8);
  return { group: b.build(), hw: 0.95, hl: L / 2, h: 1.55 };
}

export function createVan() {
  const b = new Builder(), c = pick([0xf5f5f5, 0xe6d8a8, 0x9fb7c9, 0xffffff]);
  b.box(1.85, 1.65, 4.4, c, 0, 1.12, 0);
  b.box(1.87, 0.5, 2.8, GLASS, 0, 1.55, 0.5, { kind: 'glass' });
  b.box(1.6, 0.5, 0.05, GLASS, 0, 1.55, 2.21, { kind: 'glass' });
  b.box(1.9, 0.18, 4.45, 0x2266aa, 0, 0.75, 0);
  b.box(1.4, 0.2, 2.6, 0x333333, 0, 2.05, 0.3); // roof rack
  for (let i = 0; i < 3; i++) b.box(rand(0.4, 0.7), rand(0.25, 0.45), 0.6, pick([0x8b5a2b, 0x2e6b8a, 0xb33a3a, 0xd9c08a]), rand(-0.4, 0.4), 2.3, -0.4 + i * 0.7);
  rearLights(b, 0.92, 0.8, 2.21, -2.21);
  wheels(b, [-0.85, 0.85], [-1.5, 1.4]);
  shadow(b, 2.4, 5);
  return { group: b.build(), hw: 1.0, hl: 2.2, h: 2.4 };
}

/** Decorated cargo truck with a painted "crown" over the cab. */
export function createTruck() {
  const b = new Builder();
  const body = pick([0xd62828, 0x1565c0, 0x0b8f3a, 0xff8f00]);
  // cargo bed (at back, +z)
  b.box(2.35, 1.6, 4.8, 0x6b4a2b, 0, 1.75, 1.0);
  for (const s of [-1, 1]) b.plane(4.6, 1.4, 'art', 0xffffff, [s * 1.18, 1.75, 1.0], [0, s * Math.PI / 2, 0], { uv: artUV.flowers });
  b.plane(2.2, 1.45, 'art', 0xffffff, [0, 1.75, 3.41], [0, 0, 0], { uv: artUV.flowers });
  b.plane(2.3, 0.35, 'art', 0xffffff, [0, 0.82, 3.42], [0, 0, 0], { uv: artUV.small });
  b.box(2.4, 0.25, 5.0, body, 0, 0.85, 1.0);
  // chain fringe at the back
  for (let i = 0; i < 11; i++) b.box(0.05, 0.3, 0.03, i % 2 ? 0xd9d9d9 : 0xffd60a, -1.0 + i * 0.2, 0.55, 3.43, { kind: 'shiny' });
  // cab
  b.box(2.3, 1.7, 1.9, body, 0, 1.6, -2.5);
  b.box(2.0, 0.65, 0.05, GLASS, 0, 1.95, -3.46, { kind: 'glass' });
  // crown (taj) over the cab, painted
  b.box(2.3, 1.1, 0.4, body, 0, 3.0, -2.2);
  b.plane(2.2, 1.0, 'art', 0xffffff, [0, 3.0, -2.41], [0, Math.PI, 0], { uv: artUV.band });
  b.plane(2.2, 1.0, 'art', 0xffffff, [0, 3.0, -1.99], [0, 0, 0], { uv: artUV.flowers });
  for (let i = 0; i < 6; i++) b.sphere(0.07, pick([0xff2a2a, 0xffd60a, 0x2bff88, 0x00e5ff]), -0.9 + i * 0.36, 3.6, -2.2, { kind: 'glow', seg: 6 });
  rearLights(b, 1.15, 1.0, 3.43, -3.46);
  wheels(b, [-1.0, 1.0], [-2.6, 1.6, 2.6], 0.48, 0.34);
  shadow(b, 2.9, 7.8);
  return { group: b.build(), hw: 1.2, hl: 3.5, h: 3.7 };
}

/** Colourful city bus. */
export function createBus() {
  const b = new Builder();
  const c = pick([0xffd60a, 0x1fa2d6, 0xe84a8a, 0x2e9e5a]);
  b.box(2.45, 2.4, 8.6, c, 0, 1.6, 0);
  for (const s of [-1, 1]) {
    b.box(0.05, 0.7, 7.6, GLASS, s * 1.23, 2.15, -0.2, { kind: 'glass' });
    b.plane(8.4, 0.55, 'art', 0xffffff, [s * 1.235, 1.0, 0], [0, s * Math.PI / 2, 0], { uv: artUV.band });
  }
  b.box(2.2, 0.8, 0.05, GLASS, 0, 2.2, 4.31, { kind: 'glass' });
  b.plane(2.3, 0.5, 'art', 0xffffff, [0, 1.25, 4.32], [0, 0, 0], { uv: artUV.small });
  b.box(2.0, 0.35, 6.5, 0x444444, 0, 2.97, -0.5);
  for (let i = 0; i < 5; i++) b.box(rand(0.5, 0.9), rand(0.3, 0.6), rand(0.6, 1), pick([0x8b5a2b, 0x2e6b8a, 0xb33a3a, 0xd9c08a, 0x5a7d2a]), rand(-0.6, 0.6), 3.35, -3.2 + i * 1.3);
  rearLights(b, 1.2, 0.9, 4.31, -4.31);
  wheels(b, [-1.05, 1.05], [-3, 2.8], 0.5, 0.34);
  shadow(b, 3, 9.6);
  return { group: b.build(), hw: 1.25, hl: 4.3, h: 3.6 };
}

export function createBike() {
  const b = new Builder();
  const c = pick([0xb3202a, 0x1d1d1f, 0x1f4e9c, 0xd9d9d9]);
  b.cyl(0.32, 0.32, 0.1, DARK, 0, 0.32, -0.65, { r: [0, 0, Math.PI / 2], seg: 12 });
  b.cyl(0.32, 0.32, 0.1, DARK, 0, 0.32, 0.65, { r: [0, 0, Math.PI / 2], seg: 12 });
  b.box(0.3, 0.35, 1.0, c, 0, 0.62, 0, { kind: 'shiny' });
  b.box(0.26, 0.12, 0.7, DARK, 0, 0.86, 0.2);
  b.cyl(0.025, 0.025, 0.7, CHROME, 0, 1.05, -0.55, { r: [0, 0, Math.PI / 2], kind: 'shiny', seg: 5 });
  b.box(0.2, 0.1, 0.04, 0xff2020, 0, 0.8, 0.72, { kind: 'glow' });
  b.cyl(0.04, 0.04, 0.6, CHROME, 0.15, 0.45, 0.5, { r: [Math.PI / 2, 0, 0], kind: 'shiny', seg: 5 });
  addSeated(b, 0, 0.9, 0.05, randomLook(), 'forward');
  if (Math.random() < 0.5) addSeated(b, 0, 0.95, 0.45, randomLook(), 'down');
  shadow(b, 1.0, 2.0);
  return { group: b.build(), hw: 0.45, hl: 1.0, h: 1.9 };
}

export function createDonkeyCart() {
  const b = new Builder();
  // donkey in front
  const g = 0x8a8178;
  b.box(0.45, 0.55, 1.1, g, 0, 1.0, -1.9);
  b.box(0.28, 0.3, 0.55, g, 0, 1.35, -2.55, { r: [0.6, 0, 0] });
  b.box(0.22, 0.2, 0.3, 0x5a534c, 0, 1.25, -2.8);
  for (const s of [-1, 1]) {
    b.box(0.06, 0.3, 0.06, g, s * 0.1, 1.68, -2.45, { r: [-0.3, 0, s * 0.3] });
    for (const z of [-2.3, -1.5]) b.box(0.12, 0.75, 0.12, g, s * 0.15, 0.38, z);
  }
  // cart
  b.box(1.5, 0.15, 2.2, 0x8b5a2b, 0, 0.85, 0.2);
  for (const s of [-1, 1]) b.box(0.08, 0.35, 2.2, 0x6b4a2b, s * 0.72, 1.1, 0.2);
  for (const s of [-1, 1]) b.cyl(0.5, 0.5, 0.08, 0x5a3a1a, s * 0.82, 0.5, 0.4, { r: [0, 0, Math.PI / 2], seg: 12 });
  for (let i = 0; i < 5; i++) b.sphere(0.25, pick([0x3f8f2f, 0xd9a52a, 0xc23b22, 0x7aa83a]), rand(-0.45, 0.45), 1.15, rand(-0.5, 0.9), { seg: 6 });
  b.box(0.04, 0.04, 1.6, 0x6b4a2b, 0.3, 0.95, -1.2);
  b.box(0.04, 0.04, 1.6, 0x6b4a2b, -0.3, 0.95, -1.2);
  addSeated(b, 0, 1.0, -0.6, randomLook(), 'forward');
  shadow(b, 1.8, 4.2);
  return { group: b.build(), hw: 0.8, hl: 1.9, h: 2.0 };
}

/** Cow — built facing +x so it can wander across the road. */
export function createCow() {
  const b = new Builder();
  const c = pick([0xf2efe6, 0x8a5a3a, 0x3a2a22, 0xd9c7a8]);
  b.box(1.5, 0.75, 0.7, c, 0, 1.15, 0);
  if (Math.random() < 0.6) b.box(0.5, 0.5, 0.72, pick([0x3a2a22, 0x8a5a3a, 0xffffff]), rand(-0.3, 0.3), 1.25, 0);
  b.box(0.45, 0.45, 0.42, c, 0.92, 1.4, 0);
  b.box(0.22, 0.22, 0.34, 0xd9a0a0, 1.15, 1.3, 0);
  for (const s of [-1, 1]) {
    b.cone(0.05, 0.3, 0xe8e0c8, 0.95, 1.72, s * 0.17, { r: [s * -0.5, 0, 0] });
    b.box(0.08, 0.14, 0.2, c, 0.85, 1.55, s * 0.28);
    for (const x of [-0.55, 0.55]) b.box(0.15, 0.8, 0.15, c, x, 0.4, s * 0.22);
  }
  b.box(0.05, 0.6, 0.05, c, -0.8, 1.0, 0, { r: [0, 0, 0.3] });
  b.sphere(0.12, 0xffd60a, 0.7, 1.15, 0, { seg: 6 });  // bell
  b.box(0.07, 0.07, 0.48, 0xd62828, 0.72, 1.3, 0);      // collar
  b.plane(2.0, 1.2, 'shadow', 0xffffff, [0, 0.03, 0], [-Math.PI / 2, 0, 0]);
  return { group: b.build(), hw: 0.8, hl: 0.45, h: 1.75 };
}

/** Wedding baraat: decorated ghori with the dulha, dancers and a dhol wala. Slow, takes one lane. */
export function createBaraat() {
  const b = new Builder();
  const horse = 0xf2efe6;
  // ghori
  b.box(0.55, 0.7, 1.6, horse, 0, 1.35, -1.2);
  b.box(0.3, 0.8, 0.35, horse, 0, 1.95, -2.0, { r: [0.5, 0, 0] });
  b.box(0.28, 0.3, 0.6, horse, 0, 2.3, -2.35);
  for (const s of [-1, 1]) for (const z of [-1.8, -0.6]) b.box(0.14, 1.0, 0.14, horse, s * 0.18, 0.5, z);
  b.box(0.6, 0.12, 1.2, 0xd62828, 0, 1.75, -1.1);                              // saddle cloth
  for (let i = 0; i < 6; i++) b.sphere(0.05, 0xffd60a, 0.3, 1.6, -1.6 + i * 0.2, { seg: 4, kind: 'shiny' });
  // dulha on the ghori (gold sherwani + sehra)
  addSeated(b, 0, 1.85, -1.1, { skin: 0xc68a5e, shirt: 0xe6c36a, pants: 0xf5f0e6, hat: 0xd4af37, scarf: 0xd62828 }, 'down');
  for (let i = 0; i < 8; i++) b.box(0.02, 0.35, 0.02, 0xfff3b0, -0.12 + (i % 4) * 0.08, 2.75, -1.25 + Math.floor(i / 4) * 0.25, { kind: 'shiny' });
  // dancers + dhol wala walking behind
  const looks = [0xe84a8a, 0x1fa2d6, 0xffd60a, 0x2e9e5a, 0xff7a1a];
  for (let i = 0; i < 4; i++) {
    const x = (i % 2 ? 0.5 : -0.5), z = 0.4 + Math.floor(i / 2) * 1.0;
    b.box(0.16, 0.8, 0.18, 0x3a3a3a, x - 0.1, 0.4, z); b.box(0.16, 0.8, 0.18, 0x3a3a3a, x + 0.1, 0.4, z);
    b.box(0.42, 0.7, 0.26, looks[i], x, 1.15, z);
    b.sphere(0.14, 0xc68a5e, x, 1.66, z, { seg: 6 });
    b.box(0.1, 0.55, 0.1, looks[i], x - 0.3, 1.6, z, { r: [0, 0, -0.5] });   // arms up — bhangra!
    b.box(0.1, 0.55, 0.1, looks[i], x + 0.3, 1.6, z, { r: [0, 0, 0.5] });
  }
  b.cyl(0.28, 0.28, 0.6, 0xd62828, 0, 1.05, 2.6, { r: [0, 0, Math.PI / 2], seg: 10 });   // dhol
  b.box(0.42, 0.7, 0.26, 0xffffff, 0, 1.15, 2.95); b.sphere(0.14, 0xa86d45, 0, 1.66, 2.95, { seg: 6 });
  b.box(0.36, 0.8, 0.2, 0x3a3a3a, 0, 0.4, 2.95);
  // light-carrying helpers (chandelier poles)
  for (const s of [-1, 1]) {
    b.cyl(0.03, 0.03, 2.4, 0x888888, s * 0.9, 1.2, 1.6, { seg: 4 });
    for (let k = 0; k < 4; k++) b.sphere(0.08, [0xfff3b0, 0xff2e88, 0x2bff88, 0x00e5ff][k], s * 0.9 + Math.cos(k * 1.57) * 0.25, 2.4, 1.6 + Math.sin(k * 1.57) * 0.25, { kind: 'glow', seg: 5 });
  }
  b.plane(2.4, 6.4, 'shadow', 0xffffff, [0, 0.03, 0.4], [-Math.PI / 2, 0, 0]);
  return { group: b.build(), hw: 1.1, hl: 3.0, h: 2.9 };
}
