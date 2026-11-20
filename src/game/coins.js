// Rupee coins drawn with a single InstancedMesh (one draw call for all of them).
import * as THREE from 'three';
import { createCoinMesh } from '../models/props.js';

const CAP = 220;
const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1);

export class Coins {
  constructor(scene) {
    this.mesh = createCoinMesh(CAP);
    scene.add(this.mesh);
    this.list = [];
    this.spin = 0;
  }
  clear() { this.list.length = 0; this.mesh.count = 0; }
  add(s, x, y) { if (this.list.length < CAP) this.list.push({ s, x, y, pulled: false, px: 0, py: 0, pz: 0 }); }

  /** Returns number of coins collected this frame. */
  update(dt, D, player, magnet) {
    this.spin += dt * 4;
    let got = 0, n = 0;
    const L = this.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const c = L[i];
      let x, y, z;
      if (c.pulled) {
        const k = Math.min(1, dt * 14);
        c.px += (player.x - c.px) * k; c.py += (player.y + 0.9 - c.py) * k; c.pz += (0 - c.pz) * k;
        x = c.px; y = c.py; z = c.pz;
      } else {
        x = c.x; y = c.y; z = D - c.s;
        if (magnet && z > -16 && z < 2) { c.pulled = true; c.px = x; c.py = y; c.pz = z; }
      }
      if (Math.abs(z) < 1.3 && Math.abs(x - player.x) < 1.2 && Math.abs(y - (player.y + 0.9)) < 1.4) {
        got++; L[i] = L[L.length - 1]; L.pop(); continue;
      }
      if (z > 12) { L[i] = L[L.length - 1]; L.pop(); continue; }
    }
    for (const c of L) {
      const z = c.pulled ? c.pz : D - c.s;
      if (z < -260) continue;
      p.set(c.pulled ? c.px : c.x, c.pulled ? c.py : c.y, z);
      q.setFromEuler(e.set(0, this.spin + c.s * 0.3, 0));
      m4.compose(p, q, sc);
      this.mesh.setMatrixAt(n++, m4);
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    return got;
  }
}
