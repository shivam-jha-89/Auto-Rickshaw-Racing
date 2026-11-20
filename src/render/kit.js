// Shared materials + a "Builder" that composes primitive parts and bakes them into
// one mesh per material kind (vertex-coloured) — so a whole building is 2-4 draw calls.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { curvify } from './curve.js';
import { TEX } from './textures.js';

export const MATS = {};
export const rand = (a, b) => a + Math.random() * (b - a);
export const randi = (a, b) => Math.floor(rand(a, b + 1));
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];

export function initMaterials() {
  const std = o => curvify(new THREE.MeshStandardMaterial({ vertexColors: true, ...o }));
  const basic = o => curvify(new THREE.MeshBasicMaterial({ vertexColors: true, ...o }));
  MATS.solid = std({ roughness: 0.82 });
  MATS.shiny = std({ roughness: 0.25, metalness: 0.6 });
  MATS.glass = std({ roughness: 0.08, metalness: 0.2, emissive: 0x0a1a2a, emissiveIntensity: 1 });
  MATS.facade = std({ map: TEX.facade, emissiveMap: TEX.facadeLit, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.85 });
  MATS.art = std({ map: TEX.art, roughness: 0.5 });
  MATS.sign = std({ map: TEX.signs, emissiveMap: TEX.signs, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.6 });
  MATS.gate = std({ map: TEX.gate, emissiveMap: TEX.gate, emissive: 0xffffff, emissiveIntensity: 0.15, roughness: 0.6 });
  MATS.road = std({ map: TEX.road, roughness: 0.92, metalness: 0 });
  MATS.walk = std({ map: TEX.walk, roughness: 0.9 });
  MATS.ground = std({ map: TEX.ground, roughness: 1 });
  MATS.water = std({ roughness: 0.12, metalness: 0.35, transparent: true, opacity: 0.94, normalMap: TEX.waterNormal, normalScale: new THREE.Vector2(0.6, 0.6) });
  TEX.waterNormal.repeat.set(6, 3);
  MATS.stain = std({ map: TEX.stain, transparent: true, depthWrite: false, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -3 });
  MATS.poster = std({ map: TEX.posters, emissiveMap: TEX.posters, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.75 });
  MATS.letter = basic({ map: TEX.letters, transparent: true, alphaTest: 0.1, toneMapped: false });
  MATS.beamSoft = basic({ map: TEX.blob, transparent: true, depthWrite: false, opacity: 0, blending: THREE.AdditiveBlending, color: 0xfff2c8, toneMapped: false, side: THREE.DoubleSide });
  MATS.beamSoft.vertexColors = false;
  MATS.glow = basic({ toneMapped: false });
  MATS.neon = basic({ map: TEX.neon, toneMapped: false, transparent: true, depthWrite: false });
  MATS.icon = basic({ map: TEX.icons, transparent: true, alphaTest: 0.1, toneMapped: false });
  MATS.shadow = basic({ map: TEX.blob, transparent: true, depthWrite: false, opacity: 0.5, color: 0x000000 });
  MATS.pool = basic({ map: TEX.blob, transparent: true, depthWrite: false, opacity: 0, blending: THREE.AdditiveBlending, color: 0xffcf8a, toneMapped: false });
  MATS.beam = basic({ transparent: true, depthWrite: false, opacity: 0.35, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide });
  // shadow/pool/beam/neon ignore vertex colour tint where it would double-darken
  MATS.shadow.vertexColors = false;
  MATS.pool.vertexColors = false;
  for (const m of ['shadow', 'pool', 'neon', 'beam', 'beamSoft']) MATS[m].polygonOffset = true, MATS[m].polygonOffsetFactor = -2;
}

// ---- geometry caches ----
const geoCache = new Map();
function cached(key, make) {
  let g = geoCache.get(key);
  if (!g) { g = make(); geoCache.set(key, g); }
  return g;
}
const BOX = new THREE.BoxGeometry(1, 1, 1);

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _c = new THREE.Color();

export class Builder {
  constructor() { this.parts = {}; }

  add(geo, kind, color, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) {
    const g = geo.clone();
    _m.compose(_p.set(p[0], p[1], p[2]), _q.setFromEuler(_e.set(r[0], r[1], r[2])), _s.set(s[0], s[1], s[2]));
    g.applyMatrix4(_m);
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    _c.set(color);
    for (let i = 0; i < n; i++) { col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    (this.parts[kind] ||= []).push(g);
    return g;
  }

  box(w, h, d, color, x, y, z, { kind = 'solid', r, uvScale } = {}) {
    let geo = BOX;
    if (kind === 'facade' || uvScale) {
      geo = BOX.clone();
      const uv = geo.attributes.uv;
      const S = uvScale || [6, 6.4];
      for (let i = 0; i < 24; i++) {
        const f = Math.floor(i / 4);
        if (f === 2 || f === 3) { uv.setXY(i, 0.02, 0.98); continue; } // top/bottom: plain wall
        const across = f < 2 ? d : w;
        uv.setXY(i, uv.getX(i) * across / S[0], uv.getY(i) * h / S[1]);
      }
    }
    return this.add(geo, kind, color, [x, y, z], r, [w, h, d]);
  }

  cyl(rt, rb, h, color, x, y, z, { kind = 'solid', r, seg = 10, s, open = false } = {}) {
    const geo = cached(`c${rt}|${rb}|${seg}|${open}`, () => new THREE.CylinderGeometry(rt, rb, 1, seg, 1, open));
    return this.add(geo, kind, color, [x, y, z], r, s ? [s[0], h * s[1], s[2]] : [1, h, 1]);
  }

  sphere(rad, color, x, y, z, { kind = 'solid', r, s = [1, 1, 1], seg = 10, half = false } = {}) {
    const geo = cached(`s${seg}|${half}`, () => new THREE.SphereGeometry(1, seg, Math.max(4, seg * 0.7 | 0), 0, Math.PI * 2, 0, half ? Math.PI / 2 : Math.PI));
    return this.add(geo, kind, color, [x, y, z], r, [rad * s[0], rad * s[1], rad * s[2]]);
  }

  cone(rad, h, color, x, y, z, { kind = 'solid', r, seg = 8 } = {}) {
    const geo = cached(`k${seg}`, () => new THREE.ConeGeometry(1, 1, seg));
    return this.add(geo, kind, color, [x, y, z], r, [rad, h, rad]);
  }

  torus(rad, tube, color, x, y, z, { kind = 'solid', r, arc = Math.PI * 2 } = {}) {
    const geo = cached(`t${rad}|${tube}|${arc}`, () => new THREE.TorusGeometry(rad, tube, 6, 16, arc));
    return this.add(geo, kind, color, [x, y, z], r);
  }

  /** Plane facing +z (rotate to orient). uv = [u0, v0, u1, v1] sub-rect of the material's map. */
  plane(w, h, kind, color, p, r = [0, 0, 0], { uv, segW = 1, segH = 1 } = {}) {
    const geo = new THREE.PlaneGeometry(w, h, segW, segH);
    if (uv) {
      const a = geo.attributes.uv;
      for (let i = 0; i < a.count; i++) a.setXY(i, uv[0] + a.getX(i) * (uv[2] - uv[0]), uv[1] + a.getY(i) * (uv[3] - uv[1]));
    }
    return this.add(geo, kind, color, p, r);
  }

  build() {
    const group = new THREE.Group();
    for (const kind of Object.keys(this.parts)) {
      const list = this.parts[kind];
      const merged = mergeGeometries(list, false);
      list.forEach(g => g.dispose());
      if (!merged) { console.warn('merge failed', kind); continue; }
      const mesh = new THREE.Mesh(merged, MATS[kind]);
      mesh.frustumCulled = false; // curved world displaces vertices; skip CPU culling
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      if (['shadow', 'pool', 'beam', 'neon', 'beamSoft', 'stain'].includes(kind)) mesh.renderOrder = 2;
      group.add(mesh);
    }
    this.parts = {};
    return group;
  }
}
