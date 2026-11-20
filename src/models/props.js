// Road obstacles, pickups and street furniture.
import * as THREE from 'three';
import { Builder, MATS, pick, rand, randi } from '../render/kit.js';
import { curvify } from '../render/curve.js';
import { gateUV, iconUV, signUV, neonUV, posterUV, letterUV, SHOPS, NEON } from '../render/textures.js';

// ---------- road obstacles ----------
export function createPothole() {
  const b = new Builder();
  b.cyl(1.0, 0.8, 0.04, 0x17130f, 0, 0.025, 0, { seg: 14, s: [1, 1, 0.75] });
  b.cyl(1.12, 1.12, 0.02, 0x2b2620, 0, 0.012, 0, { seg: 14, s: [1, 1, 0.8] });
  for (let i = 0; i < 7; i++) {
    const a = rand(0, 6.28);
    b.box(rand(0.1, 0.22), 0.08, rand(0.1, 0.2), 0x6b6258, Math.cos(a) * 1.15, 0.04, Math.sin(a) * 0.9, { r: [0, a, 0] });
  }
  b.box(0.5, 0.02, 0.04, 0x2b2620, 0.9, 0.02, 0.5, { r: [0, 0.6, 0] });
  return { group: b.build(), hw: 0.95, hl: 0.75, h: 0.28 };
}

export function createBarrier() {
  const b = new Builder();
  for (const s of [-1, 1]) {
    b.box(0.08, 0.95, 0.08, 0x777777, s * 1.15, 0.48, 0);
    b.box(0.5, 0.06, 0.08, 0x777777, s * 1.15, 0.03, 0, { r: [0, Math.PI / 2, 0] });
    b.sphere(0.09, 0xff8a00, s * 1.15, 1.02, 0, { kind: 'glow', seg: 6 });
  }
  for (let i = 0; i < 6; i++) {
    b.box(0.4, 0.26, 0.05, i % 2 ? 0xffffff : 0xd62828, -1.0 + i * 0.4, 0.78, 0);
    b.box(0.4, 0.2, 0.05, i % 2 ? 0xd62828 : 0xffffff, -1.0 + i * 0.4, 0.45, 0);
  }
  b.plane(2.8, 0.8, 'shadow', 0xffffff, [0, 0.03, 0], [-Math.PI / 2, 0, 0]);
  return { group: b.build(), hw: 1.3, hl: 0.2, h: 1.05 };
}

/** Wooden ramp: entry at +z (player side), top at -z. */
export function createRamp() {
  const b = new Builder();
  const L = 3.4, H = 1.0, ang = Math.atan2(H, L);
  const len = Math.hypot(L, H);
  b.box(2.2, 0.12, len, 0x9b6a3a, 0, H / 2, 0, { r: [ang, 0, 0] });
  for (let i = 0; i < 7; i++) b.box(2.25, 0.03, 0.06, 0x5a3a1a, 0, H / 2 + 0.07 + (i - 3) * 0.48 * Math.sin(ang), (3 - i) * 0.48 * Math.cos(ang), { r: [ang, 0, 0] });
  for (const s of [-1, 1]) {
    b.box(0.1, H, 0.1, 0x5a3a1a, s * 1.0, H / 2, -L / 2 + 0.1);
    b.box(0.1, H / 2, 0.1, 0x5a3a1a, s * 1.0, H / 4, 0);
  }
  // glowing chevrons
  for (let i = 0; i < 3; i++) for (const s of [-1, 1]) {
    b.box(0.5, 0.04, 0.1, 0xffd60a, s * 0.2, H / 2 + 0.09 + (i - 1) * 0.3, (1 - i) * 0.9, { kind: 'glow', r: [ang, s * 0.6, 0] });
  }
  b.plane(2.6, 4, 'shadow', 0xffffff, [0, 0.03, 0], [-Math.PI / 2, 0, 0]);
  return { group: b.build(), hw: 1.1, hl: 1.7, h: 0.3 };
}

/** Speed breaker hump covering one lane: yellow/black stripes. */
export function createBreaker() {
  const b = new Builder();
  b.cyl(0.45, 0.45, 3.1, 0x3a3a3a, 0, -0.27, 0, { r: [0, 0, Math.PI / 2], seg: 14, s: [1, 1, 1] });
  for (let i = 0; i < 6; i++) b.box(0.5, 0.06, 0.62, i % 2 ? 0x111111 : 0xffd60a, -1.25 + i * 0.5, 0.16, 0, { r: [0, 0, 0] });
  return { group: b.build(), hw: 1.5, hl: 0.4, h: 0.2 };
}

/** Open manhole with its cover lying beside it — fall in and you lose a heart. */
export function createManhole() {
  const b = new Builder();
  b.cyl(0.62, 0.62, 0.05, 0x050505, 0, 0.03, 0, { seg: 16 });
  b.torus(0.66, 0.07, 0x6b6b6b, 0, 0.04, 0, { r: [Math.PI / 2, 0, 0] });
  b.cyl(0.62, 0.62, 0.06, 0x4a4a4a, 1.0, 0.05, 0.6, { seg: 16, r: [0, 0, 0.12], kind: 'shiny' });
  for (let i = 0; i < 3; i++) b.box(0.08, 0.6, 0.08, 0xd62828, -0.9 + i * 0.05, 0.3, -0.7 + i * 0.6, { r: [0, 0, 0.2] }); // someone's warning sticks
  b.box(0.6, 0.04, 0.4, 0xffd60a, -0.95, 0.62, -0.1, { r: [0, 0, 0.2] });
  return { group: b.build(), hw: 0.7, hl: 0.65, h: 0.28 };
}

/** Broken, cratered stretch of road — rattles you and slows you down. */
export function createRoughPatch() {
  const b = new Builder();
  b.plane(2.8, 8, 'solid', 0x2c2b2a, [0, 0.015, 0], [-Math.PI / 2, 0, 0]);
  for (let i = 0; i < 9; i++) {
    const r = rand(0.25, 0.6), x = rand(-1.1, 1.1), z = rand(-3.6, 3.6);
    b.cyl(r, r * 0.8, 0.03, 0x161411, x, 0.025, z, { seg: 10 });
  }
  for (let i = 0; i < 14; i++) b.box(rand(0.08, 0.2), 0.06, rand(0.08, 0.2), 0x6b6258, rand(-1.3, 1.3), 0.03, rand(-3.9, 3.9), { r: [0, rand(0, 3), 0] });
  return { group: b.build(), hw: 1.3, hl: 4, h: 0.1 };
}

export function createPuddle() {
  const b = new Builder();
  b.cyl(1.2, 1.2, 0.02, 0x6c8aa8, 0, 0.02, 0, { kind: 'water', seg: 16, s: [1, 1, 1.6] });
  b.cyl(0.6, 0.6, 0.02, 0x6c8aa8, 0.7, 0.021, 0.8, { kind: 'water', seg: 12 });
  return { group: b.build(), hw: 1.1, hl: 1.6, h: 0.1 };
}

// ---------- pickups ----------
export function createPowerup(type, color, icon) {
  const g = new THREE.Group();
  const b = new Builder();
  b.torus(0.62, 0.07, color, 0, 0, 0, { kind: 'glow' });
  const ring = b.build();
  const ib = new Builder();
  ib.plane(0.95, 0.95, 'icon', 0xffffff, [0, 0, 0.02], [0, 0, 0], { uv: iconUV(icon) });
  ib.plane(1.4, 1.4, 'pool', 0xffffff, [0, -1.2, 0], [-Math.PI / 2, 0, 0]);
  const face = ib.build();
  // pool mesh uses the additive "pool" material — keep it visible in daylight too
  g.add(ring, face);
  g.userData = { ring, type };
  return { group: g, hw: 0.8, hl: 0.8, h: 3 };
}

export function createCoinMesh(capacity) {
  const geo = new THREE.CylinderGeometry(0.42, 0.42, 0.09, 18);
  geo.rotateX(Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffc928, metalness: 0.85, roughness: 0.25, emissive: 0x7a4a00, emissiveIntensity: 0.6 });
  curvify(mat);
  const mesh = new THREE.InstancedMesh(geo, mat, capacity);
  mesh.frustumCulled = false;
  mesh.count = 0;
  return mesh;
}

// ---------- passenger / destination ----------
export function createBeacon(color = 0x2bff88) {
  const b = new Builder();
  b.cyl(0.9, 0.9, 30, color, 0, 15, 0, { kind: 'beam', seg: 16, open: true });
  b.torus(1.2, 0.08, color, 0, 0.1, 0, { kind: 'glow', r: [Math.PI / 2, 0, 0] });
  b.plane(3, 3, 'pool', 0xffffff, [0, 0.05, 0], [-Math.PI / 2, 0, 0]);
  return b.build();
}

// ---------- street furniture ----------
export function createLamp(style, side) {
  const b = new Builder();
  const s = side; // +1 right side (arm reaches toward road = -x), -1 left
  if (style === 'neon') {
    b.box(0.16, 7, 0.16, 0x30343c, 0, 3.5, 0, { kind: 'shiny' });
    b.box(2.4, 0.12, 0.25, 0x30343c, -s * 1.1, 7, 0, { kind: 'shiny' });
    b.box(1.6, 0.06, 0.3, 0xe8f6ff, -s * 1.5, 6.92, 0, { kind: 'glow' });
    b.box(0.06, 2.2, 0.06, pick([0x00e5ff, 0xff2e88]), 0.1 * s, 2, 0.1, { kind: 'glow' });
  } else {
    b.cyl(0.08, 0.12, 6, style === 'old' ? 0x2b2b2b : 0x6a6a6a, 0, 3, 0, { seg: 6 });
    b.box(1.8, 0.08, 0.08, 0x2b2b2b, -s * 0.85, 5.9, 0);
    b.box(0.5, 0.18, 0.3, 0x2b2b2b, -s * 1.7, 5.85, 0);
    b.box(0.4, 0.05, 0.22, 0xfff0c8, -s * 1.7, 5.74, 0, { kind: 'glow' });
    if (style === 'old') b.cyl(0.2, 0.2, 0.3, 0x2b2b2b, 0, 0.15, 0, { seg: 6 });
  }
  b.plane(6, 6, 'pool', 0xffffff, [-s * (style === 'neon' ? 1.8 : 2.2), 0.06, 0], [-Math.PI / 2, 0, 0]);
  return b.build();
}

export function createTree(kind = 'round') {
  const b = new Builder();
  const h = rand(2.2, 3.5);
  b.cyl(0.14, 0.22, h, 0x5a4030, 0, h / 2, 0, { seg: 6 });
  const greens = [0x3f7f2f, 0x4f8f35, 0x2f6b2a, 0x5a9a3a];
  if (kind === 'palm') {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      b.box(0.25, 0.05, 2.0, pick(greens), Math.cos(a) * 0.8, h + 4.2, Math.sin(a) * 0.8, { r: [0, -a + Math.PI / 2, 0.5] });
    }
    b.cyl(0.12, 0.16, 4.5, 0x7a6040, 0, h + 2, 0, { seg: 6 });
  } else {
    const n = randi(2, 4);
    for (let i = 0; i < n; i++) b.sphere(rand(1.1, 1.8), pick(greens), rand(-0.6, 0.6), h + rand(0.4, 1.6), rand(-0.6, 0.6), { seg: 7, s: [1, 0.85, 1] });
  }
  b.plane(3, 3, 'shadow', 0xffffff, [0, 0.03, 0], [-Math.PI / 2, 0, 0]);
  return b.build();
}

/** Food stall / cart on the sidewalk, faces the road (+x local → toward road after placement). */
export function createStall(side) {
  const b = new Builder();
  const c = pick([0xd62828, 0x1565c0, 0x2e7d32, 0xf9a825, 0x6a1b9a]);
  b.box(1.6, 0.9, 1.2, 0x8b5a2b, 0, 0.6, 0);
  b.box(1.65, 0.08, 1.25, 0xd9d0c0, 0, 1.08, 0);
  for (let i = 0; i < 4; i++) b.cyl(0.18, 0.2, 0.25, pick([0xb8860b, 0xc0c0c0, 0xd2691e]), -0.5 + i * 0.33, 1.25, 0, { seg: 8, kind: 'shiny' });
  for (const x of [-0.75, 0.75]) b.cyl(0.03, 0.03, 1.4, 0x444444, x, 1.8, 0, { seg: 4 });
  for (let i = 0; i < 6; i++) b.box(0.32, 0.06, 1.7, i % 2 ? c : 0xffffff, -0.8 + i * 0.32, 2.5, 0, { r: [0.15, 0, 0] });
  b.sphere(0.1, 0xfff0c8, 0, 2.3, 0.2, { kind: 'glow', seg: 6 });
  b.plane(2.4, 2, 'shadow', 0xffffff, [0, 0.03, 0], [-Math.PI / 2, 0, 0]);
  const g = b.build();
  g.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
  return g;
}

export function createBillboard(side, colors) {
  const b = new Builder();
  const col = pick(colors);
  const H = rand(6, 9);
  b.box(0.35, H, 0.35, 0x30343c, 0, H / 2, 0, { kind: 'shiny' });
  b.box(0.3, 3.0, 7.2, 0x15171c, 0, H + 1.2, 0);
  b.box(0.08, 0.1, 7.3, col, side * -0.17, H + 2.75, 0, { kind: 'glow' });
  b.box(0.08, 0.1, 7.3, col, side * -0.17, H - 0.35, 0, { kind: 'glow' });
  const ry = side > 0 ? -Math.PI / 2 : Math.PI / 2;
  b.plane(6.8, 1.6, 'neon', col, [side * -0.18, H + 1.2, 0], [0, ry, 0], { uv: neonUV(randi(0, NEON.length - 1)) });
  return b.build();
}

export function createElectricPole() {
  const b = new Builder();
  b.box(0.22, 8, 0.22, 0x8a8a80, 0, 4, 0);
  b.box(0.12, 0.12, 2.2, 0x5a5a50, 0, 7.4, 0, { r: [0, Math.PI / 2, 0] });
  b.cyl(0.35, 0.35, 0.9, 0x6a6a6a, 0.3, 6.2, 0, { seg: 8 });
  for (let i = 0; i < 4; i++) b.cyl(0.04, 0.04, 0.2, 0xd9d9d9, -0.9 + i * 0.6, 7.55, 0, { seg: 4 });
  // a tangle of wires drooping toward the next pole
  for (let i = 0; i < 4; i++) b.box(0.03, 0.03, 18, 0x111111, -0.9 + i * 0.6, 7.2 - i * 0.12, 9, { r: [0.04 + i * 0.01, 0, 0] });
  return b.build();
}

/** Mughal-style arch across the road at a district boundary. */
export function createGate(districtIdx) {
  const b = new Builder();
  const stone = 0xb5563a, cream = 0xf2e2c4;
  for (const s of [-1, 1]) {
    b.cyl(0.9, 1.0, 9, stone, s * 6.4, 4.5, 0, { seg: 8 });
    for (let i = 0; i < 5; i++) b.cyl(1.02, 1.02, 0.15, cream, s * 6.4, 1.2 + i * 1.8, 0, { seg: 8 });
    b.cyl(1.1, 1.1, 0.4, cream, s * 6.4, 9.2, 0, { seg: 8 });
    b.sphere(0.95, cream, s * 6.4, 9.4, 0, { seg: 10, half: true });
    b.cone(0.18, 0.9, 0xffc93c, s * 6.4, 10.75, 0, { kind: 'shiny' });
  }
  b.box(13.6, 1.0, 1.4, stone, 0, 8.6, 0);
  b.box(13.8, 0.25, 1.6, cream, 0, 9.2, 0);
  for (let i = 0; i < 13; i++) b.cone(0.3, 0.6, cream, -6 + i, 9.6, 0, { seg: 4 });
  b.plane(9.6, 2.4, 'gate', 0xffffff, [0, 6.9, 0.36], [0, 0, 0], { uv: gateUV(districtIdx) });
  b.box(10, 2.7, 0.6, stone, 0, 6.9, 0);
  // string lights
  for (let i = 0; i < 20; i++) b.sphere(0.09, pick([0xffd60a, 0xff2e88, 0x2bff88, 0x00e5ff]), -6 + i * 0.63, 5.4 + Math.sin((i / 19) * Math.PI) * 0.15 - 0.3 * Math.sin((i / 19) * Math.PI) * 2, 0.75, { kind: 'glow', seg: 5 });
  return b.build();
}

// ---------- Sea View beach ----------
/** Decorated beach camel with a colourful saddle and tassels. */
export function createCamel() {
  const b = new Builder();
  const fur = pick([0xc8a26b, 0xb88c55, 0xd9b77e]);
  b.box(0.8, 0.8, 1.9, fur, 0, 1.75, 0);                                   // body
  b.sphere(0.55, fur, 0, 2.25, 0.1, { seg: 8, s: [0.9, 0.8, 1.1] });       // hump
  b.box(0.3, 1.0, 0.3, fur, 0, 2.35, -1.05, { r: [-0.5, 0, 0] });          // neck
  b.box(0.32, 0.3, 0.6, fur, 0, 2.85, -1.45);                              // head
  for (const sx of [-1, 1]) for (const z of [-0.7, 0.7]) b.box(0.16, 1.4, 0.16, fur, sx * 0.25, 0.7, z);
  // saddle cloth + tassels
  const cols = [0xd62828, 0xffd60a, 0x0b8f3a, 0x1565c0, 0xe91e63];
  b.box(0.95, 0.12, 1.2, pick(cols), 0, 2.55, 0.1);
  for (const s of [-1, 1]) {
    b.box(0.04, 0.6, 1.1, pick(cols), s * 0.46, 2.2, 0.1);
    for (let i = 0; i < 5; i++) b.sphere(0.06, cols[i], s * 0.48, 1.85, -0.35 + i * 0.22, { seg: 5 });
  }
  b.box(0.4, 0.06, 0.06, 0xffd60a, 0, 2.7, -1.45);                         // bridle
  b.plane(1.6, 2.6, 'shadow', 0xffffff, [0, 0.03, 0], [-Math.PI / 2, 0, 0]);
  return b.build();
}

export function createUmbrella() {
  const b = new Builder();
  const c = pick([0xd62828, 0x1fa2d6, 0xf2b705, 0xe84a8a, 0x0b8f3a]);
  b.cyl(0.04, 0.04, 2.4, 0xdddddd, 0, 1.2, 0, { seg: 5 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    b.box(0.9, 0.04, 1.3, i % 2 ? c : 0xffffff, Math.cos(a) * 0.62, 2.35, Math.sin(a) * 0.62, { r: [0, -a, -0.32] });
  }
  for (const s of [-1, 1]) {
    b.box(0.55, 0.06, 1.3, pick([0xffffff, c]), s * 0.8, 0.35, 0.3, { r: [0.25, 0, 0] });
    b.box(0.55, 0.06, 0.5, pick([0xffffff, c]), s * 0.8, 0.6, 1.0, { r: [-0.9, 0, 0] });
  }
  b.plane(3, 3, 'shadow', 0xffffff, [0.3, 0.03, 0.3], [-Math.PI / 2, 0, 0]);
  return b.build();
}

export function createLighthouse() {
  const b = new Builder();
  for (let i = 0; i < 6; i++) b.cyl(1.5 - i * 0.12, 1.62 - i * 0.12, 3, i % 2 ? 0xd62828 : 0xffffff, 0, 1.5 + i * 3, 0, { seg: 12 });
  b.cyl(1.2, 1.2, 0.3, 0x333333, 0, 18.1, 0, { seg: 12 });
  b.cyl(0.75, 0.75, 1.4, 0xfff2b0, 0, 18.9, 0, { seg: 10, kind: 'glow' });
  b.cone(0.95, 1.0, 0xd62828, 0, 20.1, 0, { seg: 10 });
  b.box(5, 1.2, 5, 0x7a7a72, 0, 0.3, 0);
  return b.build();
}

/** Low boundary wall plastered with posters + painted chalking stripes. Faces the road. */
export function createPosterWall(side) {
  const b = new Builder();
  const w = rand(6, 10);
  b.box(0.35, 2.4, w, pick([0xe8dcc4, 0xd9cdb5, 0xf2eadb]), -0.2, 1.2, 0);
  b.box(0.4, 0.15, w + 0.1, 0xb5563a, -0.2, 2.45, 0);
  for (let k = 0; k < 3; k++) b.box(0.02, 0.18, w * rand(0.4, 0.8), pick([0xd62828, 0x0b8f3a, 0x1565c0, 0x1b1024]), 0.0, 0.35 + k * 0.25, rand(-0.5, 0.5));
  const n = Math.floor(w / 1.15);
  for (let i = 0; i < 2; i++) b.plane(rand(0.6, 1), rand(0.6, 1), 'stain', 0xffffff, [0.02, rand(0.3, 0.7), rand(-w / 2, w / 2)], [0, Math.PI / 2, rand(0, 6)]);
  for (let i = 0; i < n; i++) b.plane(0.95, 1.2, 'poster', 0xffffff, [0.01 + i * 0.0015, 1.45 + rand(-0.15, 0.15), -w / 2 + 0.6 + i * 1.12], [0, Math.PI / 2, rand(-0.07, 0.07)], { uv: posterUV(randi(0, 11)) });
  const g = b.build();
  g.rotation.y = side > 0 ? Math.PI : 0;
  return g;
}

/** Floating K/A/R/C/H/I letter pickup. */
export function createLetter(ch) {
  const b = new Builder();
  b.plane(1.3, 1.3, 'letter', 0xffffff, [0, 0, 0], [0, 0, 0], { uv: letterUV(ch) });
  b.torus(0.78, 0.06, 0xffd60a, 0, 0, -0.02, { kind: 'glow' });
  b.plane(1.6, 1.6, 'pool', 0xffffff, [0, -1.3, 0], [-Math.PI / 2, 0, 0]);
  return b.build();
}

/** Paan cabin (khokha): leaves, hanging supari/chhaliya strips, a board, and a regular customer. Faces the road. */
export function createPaanCabin(side) {
  const b = new Builder();
  const body = pick([0x2e7d32, 0x1565c0, 0xc62828, 0xf2b705]);
  b.box(1.4, 2.2, 1.6, body, -0.7, 1.1, 0);
  b.box(1.6, 0.12, 1.9, 0x3a3a3a, -0.6, 2.28, 0);
  b.box(0.6, 0.9, 1.5, 0xe8e2d0, 0.25, 0.95, 0);                         // counter
  for (let i = 0; i < 5; i++) b.box(0.4, 0.05, 0.5, 0x2f9e44, 0.25, 1.43 + i * 0.03, -0.35 + (i % 2) * 0.05, { r: [0, i * 0.3, 0] }); // leaf stack
  for (let i = 0; i < 4; i++) b.cyl(0.08, 0.08, 0.14, pick([0xb33a3a, 0xf5f0e6, 0xd9a52a, 0x6d3b1f]), 0.25, 1.48, 0.15 + i * 0.16, { seg: 8, kind: 'shiny' }); // katha/chuna tins
  // hanging sachet strips
  for (let i = 0; i < 9; i++) b.box(0.02, rand(0.6, 1.0), 0.09, pick([0xff2e88, 0xffd60a, 0x00acc1, 0xff7a1a, 0x9d4dff, 0xffffff]), 0.05, 1.75, -0.7 + i * 0.17);
  b.box(0.06, 0.08, 1.2, 0xfff0c8, 0.06, 2.12, 0, { kind: 'glow' });
  b.plane(1.8, 0.42, 'sign', 0xffffff, [0.05, 2.55, 0], [0, Math.PI / 2, 0], { uv: signUV(SHOPS.indexOf('Lucky Paan Corner')) });
  b.box(0.06, 0.5, 0.06, 0x555555, -0.05, 2.35, 0);
  // the regular: standing customer chewing paan
  b.box(0.16, 0.8, 0.18, 0x3a3a3a, 1.0, 0.4, 0.55); b.box(0.16, 0.8, 0.18, 0x3a3a3a, 1.0, 0.4, 0.8);
  b.box(0.3, 0.7, 0.46, pick([0xe8e2d0, 0x3f6fb5, 0xffffff]), 1.0, 1.15, 0.68);
  b.sphere(0.15, 0xc68a5e, 1.0, 1.68, 0.68, { seg: 8 });
  b.box(0.06, 0.04, 0.14, 0x9b1b1b, 0.86, 1.6, 0.68);                      // paan-red mouth
  b.plane(0.9, 0.9, 'stain', 0xffffff, [0.6, 0.04, -0.9], [-Math.PI / 2, 0, 0]);
  b.plane(2.4, 2.4, 'shadow', 0xffffff, [-0.3, 0.03, 0], [-Math.PI / 2, 0, 0]);
  const g = b.build();
  g.rotation.y = side > 0 ? Math.PI : 0;
  return g;
}

/** A paan-peek splat on the ground. */
export function createGroundStain() {
  const b = new Builder();
  const s = rand(0.6, 1.2);
  b.plane(s, s, 'stain', 0xffffff, [0, 0.03, 0], [-Math.PI / 2, 0, rand(0, 6)]);
  return b.build();
}

export { SHOPS, signUV, MATS };
