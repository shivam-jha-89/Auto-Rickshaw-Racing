// Streams the scenery: road tiles, buildings, street furniture and district gates.
// Everything is positioned by its route distance `s`; on screen z = D - s (player at z = 0).
import * as THREE from 'three';
import { TILE, VIEW_AHEAD, DISTRICTS, DISTRICT_LENGTH, districtIndexAt } from '../config.js';
import { Builder, pick, rand, randi } from '../render/kit.js';
import { curveUniforms } from '../render/curve.js';
import { customModel } from '../render/gltf.js';
import { createBuilding } from '../models/buildings.js';
import { createLamp, createTree, createStall, createBillboard, createElectricPole, createGate, createCamel, createUmbrella, createLighthouse, createPosterWall, createPaanCabin, createGroundStain } from '../models/props.js';
import { createShip, createCrane, createBollard, createMausoleum, createFlagLamp } from '../models/landmarks.js';

const BEHIND = 34;

function createTile(d) {
  const b = new Builder();
  b.plane(9.6, TILE, 'road', 0xffffff, [0, 0, 0], [-Math.PI / 2, 0, 0], { uv: [0, 0, 1, TILE / 12], segH: 12 });
  // real-road wear: patched asphalt, cracks, manhole covers, oil stains
  for (let i = 0, n = randi(1, 3); i < n; i++) b.plane(rand(1.2, 3), rand(2, 6), 'solid', pick([0x353539, 0x2c2c30, 0x4a4a4e]), [rand(-3.5, 3.5), 0.012, rand(-TILE / 2 + 3, TILE / 2 - 3)], [-Math.PI / 2, 0, 0]);
  for (let i = 0, n = randi(2, 5); i < n; i++) b.box(0.05, 0.01, rand(1, 3.5), 0x1d1d20, rand(-4, 4), 0.016, rand(-TILE / 2 + 2, TILE / 2 - 2), { r: [0, rand(-0.8, 0.8), 0] });
  if (Math.random() < 0.5) b.cyl(0.45, 0.45, 0.02, 0x5a5a5e, pick([-1.5, 1.5]), 0.014, rand(-10, 10), { seg: 14, kind: 'shiny' });
  if (Math.random() < 0.6) b.plane(rand(1, 2), rand(1, 2.5), 'shadow', 0xffffff, [pick([-3, 0, 3]), 0.013, rand(-14, 14)], [-Math.PI / 2, 0, 0]);
  for (const s of [-1, 1]) {
    b.plane(2.9, TILE, 'walk', d.walk, [s * 6.25, 0.22, 0], [-Math.PI / 2, 0, 0], { uv: [0, 0, 1.45, TILE / 2], segH: 8 });
    b.box(0.25, 0.24, TILE, 0x9a9a92, s * 4.88, 0.11, 0);
    if ((d.id === 'sea' || d.id === 'port') && s < 0) continue;
    b.plane(44, TILE, 'ground', d.ground, [s * 29.7, 0.05, 0], [-Math.PI / 2, 0, 0], { uv: [0, 0, 8, TILE / 6], segH: 6 });
  }
  if (d.id === 'sea') {
    // Clifton: promenade wall, sandy beach sloping into the Arabian Sea
    b.box(0.5, 0.7, TILE, 0xe8e2d4, -7.95, 0.35, 0);
    b.plane(14, TILE, 'ground', d.ground, [-15.2, 0.02, 0], [-Math.PI / 2, 0, 0], { uv: [0, 0, 3, TILE / 6], segH: 6 });
    b.plane(6, TILE, 'ground', 0xb59a62, [-25, -0.12, 0], [-Math.PI / 2, 0, 0], { uv: [0, 0, 1, TILE / 6], segH: 6 });
    b.box(0.6, 0.04, TILE, 0xffffff, -27.8, -0.16, 0, { kind: 'glow' });
    b.plane(400, TILE, 'water', 0x1d6f8c, [-228, -0.2, 0], [-Math.PI / 2, 0, 0], { segH: 8 });
  }
  if (d.id === 'port') {
    // Kemari: concrete quay with a yellow safety line, harbour water beyond
    b.plane(8, TILE, 'ground', d.ground, [-11.7, 0.05, 0], [-Math.PI / 2, 0, 0], { uv: [0, 0, 2, TILE / 6], segH: 6 });
    b.box(0.3, 0.02, TILE, 0xffd60a, -14.6, 0.07, 0);
    b.box(0.8, 2.6, TILE, 0x6f6f6a, -16.1, -1.2, 0);
    b.plane(400, TILE, 'water', 0x16526a, [-216, -1.6, 0], [-Math.PI / 2, 0, 0], { segH: 8 });
  }
  if (d.id === 'mazar') {
    for (const s of [-1, 1]) b.box(0.6, 0.3, TILE, 0x3f8f2f, s * 7.4, 0.3, 0);
  }
  return b.build();
}

export class World {
  constructor(scene) {
    this.root = new THREE.Group();
    scene.add(this.root);
    this.items = [];
    this.pools = new Map();
    this.D = 0;
    this.reset(0);
  }

  get district() { return DISTRICTS[districtIndexAt(this.D)]; }

  take(key, make) {
    const list = this.pools.get(key);
    const obj = list && list.length ? list.pop() : make();
    obj.userData.poolKey = key;
    this.root.add(obj);
    return obj;
  }
  give(obj) {
    this.root.remove(obj);
    const key = obj.userData.poolKey;
    if (!this.pools.has(key)) this.pools.set(key, []);
    this.pools.get(key).push(obj);
  }
  place(obj, s, x, y = 0, ry = 0, behind = BEHIND) {
    obj.position.set(x, y, this.D - s);
    obj.rotation.y = ry;
    this.items.push({ obj, s, behind });
  }

  reset(D) {
    for (const it of this.items) this.give(it.obj);
    this.items.length = 0;
    this.D = D;
    this.tileNext = D - BEHIND - TILE;
    this.sideNext = { L: D - BEHIND, R: D - BEHIND, CL: D - BEHIND };
    this.lampNext = D - BEHIND;
    this.propNext = D - BEHIND;
    this.gateNext = (Math.floor(D / DISTRICT_LENGTH) + 1) * DISTRICT_LENGTH;
    this.bigNext = D - BEHIND;
    this.fill();
  }

  fill() {
    const limit = this.D + VIEW_AHEAD;
    while (this.tileNext < limit) {
      const s = this.tileNext + TILE / 2;
      const di = districtIndexAt(s);
      this.place(this.take(`tile${di}_${Math.floor(Math.random() * 4)}`, () => createTile(DISTRICTS[di])), s, 0);
      this.tileNext += TILE;
    }
    // buildings on both sides (Sea View: the left side is the beach)
    for (const side of ['L', 'R']) {
      while (this.sideNext[side] < limit) {
        const s0 = this.sideNext[side];
        const di = districtIndexAt(s0);
        const d = DISTRICTS[di];
        const sg = side === 'L' ? -1 : 1;
        if (d.id === 'sea' && side === 'L') {
          const r = Math.random();
          if (r < 0.4) this.place(this.take(`palm${di}${Math.floor(Math.random() * 3)}`, () => createTree('palm')), s0 + 3, -9.5 - rand(0, 4));
          else if (r < 0.7) this.place(this.take(`umb${di}${Math.floor(Math.random() * 4)}`, createUmbrella), s0 + 3, -12 - rand(0, 9));
          else if (r < 0.92) this.place(this.take(`camel${di}${Math.floor(Math.random() * 3)}`, () => customModel('camel')?.group || createCamel()), s0 + 3, -14 - rand(0, 9), 0, rand(-0.6, 0.6));
          else this.place(this.take(`lh${di}`, createLighthouse), s0 + 6, -40, 0);
          this.sideNext[side] += rand(9, 15);
          continue;
        }
        if (d.id === 'port' && side === 'L') {
          if (Math.random() < 0.6) this.place(this.take(`crane${di}${Math.floor(Math.random() * 3)}`, createCrane), s0 + 4, -11.5, 0, 0, 60);
          if (Math.random() < 0.5) this.place(this.take(`bol${di}`, createBollard), s0 + 9, -14.2);
          this.sideNext[side] += rand(18, 30);
          continue;
        }
        const key = `bld${di}_${Math.floor(Math.random() * 14)}`;
        const obj = this.take(key, () => { const r = createBuilding(d); r.group.userData.w = r.w; return r.group; });
        const w = obj.userData.w;
        this.place(obj, s0 + w / 2, sg * 7.9, 0, side === 'L' ? 0 : Math.PI);
        const gap = d.id === 'old' ? 0.15 : rand(1.5, 4.5);
        this.sideNext[side] += w + gap;
      }
    }
    // lamps
    while (this.lampNext < limit) {
      const di = districtIndexAt(this.lampNext);
      const d = DISTRICTS[di];
      for (const sg of [-1, 1]) {
        if (d.id === 'sea' && sg < 0) {
          this.place(this.take(`lamp${di}L`, () => createLamp('sea', -1)), this.lampNext + 15, -5.2);
          continue;
        }
        const offset = sg > 0 ? 0 : 15;
        this.place(this.take(`lamp${di}${sg}`, () => createLamp(d.id, sg)), this.lampNext + offset, sg * 5.2);
      }
      this.lampNext += 30;
    }
    // misc props
    while (this.propNext < limit) {
      const s = this.propNext;
      const di = districtIndexAt(s);
      const d = DISTRICTS[di];
      const sg = Math.random() < 0.5 ? -1 : 1;
      // paan cabins + peek stains everywhere except the Mazar gardens
      if (d.id !== 'mazar' && Math.random() < (d.id === 'old' ? 0.45 : 0.25)) this.place(this.take(`paan${di}${sg}${Math.floor(Math.random() * 3)}`, () => createPaanCabin(sg)), s + 4, sg * 6.9);
      if (d.id !== 'mazar' && Math.random() < 0.6) this.place(this.take(`stain${Math.floor(Math.random() * 4)}`, createGroundStain), s + rand(0, 10), sg * rand(5.3, 7.2), 0.2);
      if (d.id === 'old') {
        if (Math.random() < 0.55) this.place(this.take(`stall${di}${sg}${Math.floor(Math.random() * 4)}`, () => createStall(sg)), s, sg * 6.6);
        if (Math.random() < 0.5) this.place(this.take(`pole${di}`, createElectricPole), s + 6, 7.3);
        if (Math.random() < 0.25) this.place(this.take(`pw${di}${sg}${Math.floor(Math.random() * 3)}`, () => createPosterWall(sg)), s + 12, sg * 7.5);
      } else if (d.id === 'port') {
        if (Math.random() < 0.5) this.place(this.take(`pw${di}1${Math.floor(Math.random() * 3)}`, () => createPosterWall(1)), s, 6.9);
      } else if (d.id === 'mazar') {
        if (Math.random() < 0.6) this.place(this.take(`flag${di}`, createFlagLamp), s, sg * 6.8);
        if (Math.random() < 0.4) this.place(this.take(`stall${di}${sg}${Math.floor(Math.random() * 3)}`, () => createStall(sg)), s + 9, sg * 6.5);
      } else if (d.id === 'sea') {
        this.place(this.take(`palmR${di}${Math.floor(Math.random() * 3)}`, () => createTree('palm')), s, 6.9);
        if (Math.random() < 0.45) this.place(this.take(`stall${di}${Math.floor(Math.random() * 3)}`, () => createStall(1)), s + 8, 6.4);
      } else {
        if (Math.random() < 0.6) this.place(this.take(`palm${di}${sg}${Math.floor(Math.random() * 3)}`, () => createTree('palm')), s, sg * 6.9);
        if (Math.random() < 0.35) this.place(this.take(`bb${di}${sg}${Math.floor(Math.random() * 4)}`, () => createBillboard(sg, d.neon)), s + 10, sg * 9.5);
      }
      this.propNext += rand(14, 24);
    }
    // big landmarks: ships in the harbour, the mausoleum across the gardens
    while (this.bigNext < limit) {
      const s = this.bigNext;
      const di = districtIndexAt(s);
      const d = DISTRICTS[di];
      const local = ((s % DISTRICT_LENGTH) + DISTRICT_LENGTH) % DISTRICT_LENGTH;
      if (d.id === 'port') { this.place(this.take(`ship${di}${Math.floor(Math.random() * 3)}`, createShip), s + 30, -27, -0.2, 0, 70); this.bigNext += rand(75, 110); }
      else if (d.id === 'mazar' && local > 150 && local < 1000) { this.place(this.take(`mazar${di}`, createMausoleum), s + 120, -95, 0, 0, 120); this.bigNext += 800; }
      else this.bigNext += 60;
    }
    // district gates
    while (this.gateNext < limit) {
      const di = districtIndexAt(this.gateNext + 1);
      this.place(this.take(`gate${di}`, () => createGate(di)), this.gateNext, 0);
      this.gateNext += DISTRICT_LENGTH;
    }
  }

  update(D) {
    this.D = D;
    this.fill();
    const items = this.items;
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      const z = D - it.s;
      if (z > it.behind) { this.give(it.obj); items[i] = items[items.length - 1]; items.pop(); continue; }
      it.obj.position.z = z;
    }
    curveUniforms.uCurveX.value = Math.sin(D * 0.0021) * 0.0011 + Math.sin(D * 0.0057 + 1.3) * 0.0005;
  }
}
