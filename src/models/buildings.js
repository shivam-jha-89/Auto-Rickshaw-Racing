// Procedural buildings per district. Local frame: the facade is at x = 0 facing +x,
// the body extends toward -x, and the building is centred on z (width along z).
// Returns { group, w } — w is the frontage width along the road.
import { Builder, pick, rand, randi } from '../render/kit.js';
import { signUV, neonUV, SHOPS, NEON } from '../render/textures.js';
import { posters } from './posters.js';
import { portBlock, parkSegment } from './landmarks.js';

const FACE = Math.PI / 2; // rotate a +z plane to face +x

function shopFront(b, w, d, district) {
  const shutterCol = pick([0x8a8f96, 0x6b7078, 0x9aa0a8]);
  const n = Math.max(1, Math.floor(w / 3.6));
  const sw = w / n;
  for (let i = 0; i < n; i++) {
    const z = -w / 2 + sw * (i + 0.5);
    const open = Math.random() < 0.7;
    if (open) {
      b.box(0.1, 2.4, sw - 0.5, 0x2a2018, 0.02, 1.3, z);                     // dark interior
      b.box(0.5, 0.8, sw - 0.8, pick([0xd9a52a, 0xc23b22, 0x3f8f2f, 0xe8e2d0]), 0.25, 0.4, z); // goods
      b.box(0.08, 0.12, sw - 0.6, 0xfff0c8, 0.05, 2.45, z, { kind: 'glow' });  // tube light
    } else {
      for (let k = 0; k < 8; k++) b.box(0.06, 0.28, sw - 0.5, shutterCol, 0.04, 0.3 + k * 0.3, z, { kind: 'shiny' });
    }
    // striped awning
    const ac = pick(district.wood);
    for (let k = 0; k < 4; k++) b.box(0.32, 0.05, sw - 0.2, k % 2 ? ac : 0xf5f0e6, 0.25 + k * 0.3, 2.95 - k * 0.07, z);
    // shop sign
    b.plane(sw - 0.4, 0.62, 'sign', 0xffffff, [0.07, 3.45, z], [0, FACE, 0], { uv: signUV(randi(0, SHOPS.length - 1)) });
  }
}

function oldCity(district) {
  const b = new Builder();
  const w = rand(7, 12), floors = randi(2, 4), fh = 3.2, d = rand(7, 10);
  const h = 3.8 + floors * fh;
  const wall = pick(district.walls);
  b.box(d, 3.8, w, wall, -d / 2, 1.9, 0);
  b.box(d, floors * fh, w, wall, -d / 2, 3.8 + (floors * fh) / 2, 0, { kind: 'facade' });
  shopFront(b, w, d, district);
  if (Math.random() < 0.7) posters(b, w, 4.6);
  // paan ki peek in the corners — every Karachi wall has it
  for (let i = 0, n = randi(1, 3); i < n; i++) { const z = Math.random() < 0.5 ? -w / 2 + 0.4 : w / 2 - 0.4; b.plane(rand(0.6, 1.1), rand(0.6, 1.1), 'stain', 0xffffff, [0.09 + i * 0.002, rand(0.3, 0.9), z + rand(-0.2, 0.2)], [0, FACE, rand(0, 6)]); }
  b.box(0.3, 0.2, w + 0.1, 0xf5f0e6, 0.1, 3.8, 0);
  // jharokas (wooden balconies)
  const wood = pick(district.wood);
  const nb = Math.max(1, Math.floor(w / 4.5));
  for (let f = 0; f < floors; f++) {
    if (Math.random() < 0.35) continue;
    for (let i = 0; i < nb; i++) {
      const z = -w / 2 + (w / nb) * (i + 0.5);
      const y = 3.8 + f * fh + 1.2;
      b.box(0.9, 0.15, 2.0, wood, 0.45, y - 0.9, z);
      b.box(0.85, 1.4, 1.9, wood, 0.42, y, z);
      b.box(0.05, 0.9, 1.4, 0x26323e, 0.86, y + 0.1, z, { kind: 'glass' });
      b.box(1.1, 0.12, 2.3, wood, 0.48, y + 0.82, z, { r: [0, 0, -0.25] });
      for (let k = 0; k < 4; k++) b.box(0.06, 0.06, 0.06, 0xffd60a, 0.9, y - 0.75, z - 0.75 + k * 0.5, { kind: 'shiny' });
    }
  }
  // parapet + roof clutter
  b.box(d, 0.6, w, wall, -d / 2, h + 0.3, 0);
  b.box(0.3, 0.12, w + 0.2, 0xf5f0e6, 0.05, h + 0.62, 0);
  if (Math.random() < 0.6) b.cyl(0.6, 0.6, 1.1, pick([0x111111, 0x1565c0, 0xf2f2f2]), -d * 0.6, h + 1.15, rand(-w / 3, w / 3), { seg: 10 });
  if (Math.random() < 0.35) {
    // small chhatri (domed kiosk)
    const z = rand(-w / 4, w / 4);
    for (const dx of [-0.8, 0.8]) for (const dz of [-0.8, 0.8]) b.box(0.15, 1.4, 0.15, 0xf5f0e6, -2 + dx, h + 1.3, z + dz);
    b.box(2, 0.2, 2, 0xf5f0e6, -2, h + 2.05, z);
    b.sphere(1.0, 0xf5f0e6, -2, h + 2.1, z, { seg: 10, half: true });
    b.cone(0.1, 0.5, 0xffc93c, -2, h + 3.3, z, { kind: 'shiny' });
  }
  if (Math.random() < 0.5) b.box(0.05, 0.05, rand(1, 2), 0x777777, -d * 0.3, h + 1.8, 0, { r: [0.4, 0, 0] }); // antenna
  // laundry line across the front
  if (Math.random() < 0.4) {
    const y = 3.8 + randi(0, floors - 1) * fh + 2.6;
    b.box(0.02, 0.02, w * 0.8, 0x333333, 0.6, y, 0);
    for (let i = 0; i < 6; i++) b.box(0.04, rand(0.4, 0.7), rand(0.3, 0.6), pick([0xe84a8a, 0x1fa2d6, 0xffd60a, 0xffffff, 0x2e9e5a]), 0.6, y - 0.35, -w * 0.35 + i * w * 0.14);
  }
  return { group: b.build(), w };
}

/** Pastel sea-facing apartment blocks with balconies and a cafe at street level. */
function seaFront(district) {
  const b = new Builder();
  const w = rand(10, 15), d = rand(9, 12);
  const floors = randi(3, 6), fh = 3.1, h = 3.6 + floors * fh;
  const wall = pick(district.walls);
  const accent = pick(district.wood);
  b.box(d, 3.6, w, 0xf5f5f0, -d / 2, 1.8, 0);
  b.box(0.08, 2.6, w - 1.2, 0x9fd8ff, 0.03, 1.5, 0, { kind: 'glass' });
  for (let k = 0; k < 5; k++) b.box(0.3, 0.05, w - 0.4, k % 2 ? accent : 0xffffff, 0.2 + k * 0.28, 3.3 - k * 0.07, 0);
  b.plane(Math.min(w - 2, 6), 0.6, 'sign', 0xffffff, [0.06, 3.85, 0], [0, FACE, 0], { uv: signUV(randi(0, SHOPS.length - 1)) });
  b.box(d, floors * fh, w, wall, -d / 2, 3.6 + (floors * fh) / 2, 0, { kind: 'facade' });
  for (let f = 0; f < floors; f++) {
    const y = 3.6 + f * fh + 0.2;
    b.box(1.1, 0.14, w - 1.2, 0xf0f0f0, 0.55, y, 0);
    b.box(0.05, 0.85, w - 1.2, accent, 1.08, y + 0.45, 0);
    if (Math.random() < 0.35) b.box(0.05, 0.6, rand(0.6, 1.2), pick([0xe84a8a, 0x1fa2d6, 0xffd60a, 0xffffff]), 1.0, y + 0.55, rand(-w / 3, w / 3));
  }
  b.box(d + 0.3, 0.4, w + 0.3, 0xf5f5f5, -d / 2, h + 0.2, 0);
  b.cyl(0.6, 0.6, 1.1, 0x1565c0, -d * 0.6, h + 0.95, rand(-w / 4, w / 4), { seg: 10 });
  if (Math.random() < 0.5) b.box(0.15, 0.15, 2.2, 0x777777, -d * 0.3, h + 1.3, 0, { r: [0.5, 0, 0] });
  return { group: b.build(), w };
}

function neonTower(district) {
  const b = new Builder();
  const w = rand(10, 16), d = rand(10, 16);
  const h = rand(14, 42);
  const wall = pick(district.walls);
  const glassy = Math.random() < 0.6;
  // podium with shop windows
  b.box(d, 4.5, w, 0x2a2e36, -d / 2, 2.25, 0);
  b.box(0.08, 3, w - 1, 0x9fd8ff, 0.02, 2, 0, { kind: 'glass' });
  const col = pick(district.neon);
  b.box(0.1, 0.12, w, col, 0.08, 4.4, 0, { kind: 'glow' });
  if (Math.random() < 0.5) posters(b, w, 1.4, 2);
  b.plane(Math.min(w - 2, 7), 1.4, 'neon', col, [0.12, 5.4, 0], [0, FACE, 0], { uv: neonUV(randi(0, NEON.length - 1)) });
  // tower
  const tw = w - rand(0, 3), td = d - rand(0, 3);
  b.box(td, h, tw, glassy ? 0x6f8fb0 : wall, -td / 2 - 0.5, 4.5 + h / 2, 0, { kind: 'facade' });
  // vertical neon strips on corners
  const strip = pick(district.neon);
  for (const s of [-1, 1]) b.box(0.12, h, 0.12, strip, -0.45, 4.5 + h / 2, s * (tw / 2 + 0.02), { kind: 'glow' });
  b.box(td + 0.4, 0.4, tw + 0.4, 0x2a2e36, -td / 2 - 0.5, 4.5 + h + 0.2, 0);
  b.box(0.1, 0.12, tw + 0.4, strip, -0.25, 4.5 + h + 0.2, 0, { kind: 'glow' });
  if (Math.random() < 0.6) {
    b.box(0.2, 5, 0.2, 0x888888, -td / 2, 4.5 + h + 2.5, 0);
    b.sphere(0.2, 0xff2020, -td / 2, 4.5 + h + 5.1, 0, { kind: 'glow', seg: 6 });
  }
  return { group: b.build(), w };
}

export function createBuilding(district) {
  if (district.id === 'port') return portBlock(district);
  if (district.id === 'mazar') return parkSegment(district);
  if (district.id === 'old') return oldCity(district);
  if (district.id === 'sea') return seaFront(district);
  return neonTower(district);
}
