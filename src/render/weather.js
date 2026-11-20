// Rain streaks around the camera, wet-road look, and lightning flashes.
import * as THREE from 'three';
import { MATS } from './kit.js';
import { audio } from '../core/audio.js';

const N = 1400, BOX = { x: 30, y: 22, z: 70 };

export class Weather {
  constructor(scene) {
    this.level = 0;      // 0..1 current
    this.kind = 'rain';  // 'rain' | 'dust'
    this.target = 0;
    this.flash = 0;
    this.nextBolt = 6;
    const pos = new Float32Array(N * 6);
    this.drops = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      this.drops[i * 3] = (Math.random() - 0.5) * BOX.x * 2;
      this.drops[i * 3 + 1] = Math.random() * BOX.y;
      this.drops[i * 3 + 2] = -Math.random() * BOX.z + 10;
    }
    const g = new THREE.BufferGeometry();
    this.attr = new THREE.BufferAttribute(pos, 3);
    this.attr.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.attr);
    this.mat = new THREE.LineBasicMaterial({ color: 0xaecbe8, transparent: true, opacity: 0, depthWrite: false, fog: true });
    this.lines = new THREE.LineSegments(g, this.mat);
    this.lines.frustumCulled = false;
    scene.add(this.lines);
    this.boltLight = new THREE.AmbientLight(0xcfd8ff, 0);
    scene.add(this.boltLight);
  }

  set(on, kind) { if (on && kind) this.kind = kind; this.target = on ? 1 : 0; }
  get rain() { return this.kind === 'rain' ? this.level : 0; }
  get dust() { return this.kind === 'dust' ? this.level : 0; }
  clear() { this.level = this.target = 0; this.apply(); }

  apply() {
    const l = this.level;
    const wet = this.rain;
    this.mat.opacity = (this.kind === 'dust' ? 0.3 : 0.45) * l;
    this.mat.color.set(this.kind === 'dust' ? 0xd9a066 : 0xaecbe8);
    this.lines.visible = l > 0.01;
    MATS.road.roughness = 0.92 - wet * 0.6;
    MATS.road.metalness = wet * 0.35;
    MATS.walk.roughness = 0.9 - wet * 0.45;
    audio.rain(l * (this.kind === 'dust' ? 0.7 : 1));
  }

  update(dt, speed, camX, night) {
    this.level += (this.target - this.level) * Math.min(1, dt * 0.35);
    this.apply();
    if (this.level > 0.01) {
      const p = this.attr.array, d = this.drops;
      const dust = this.kind === 'dust';
      const fall = (dust ? 3 : 26) * dt, drift = speed * dt, wind = dust ? 18 * dt : 0;
      for (let i = 0; i < N; i++) {
        let x = d[i * 3] - wind, y = d[i * 3 + 1] - fall, z = d[i * 3 + 2] + drift;
        if (x < -BOX.x) x += BOX.x * 2;
        if (y < 0 || z > 12) { y = BOX.y * (0.6 + Math.random() * 0.4); z = -Math.random() * BOX.z + 8; x = (Math.random() - 0.5) * BOX.x * 2; }
        d[i * 3] = x; d[i * 3 + 1] = y; d[i * 3 + 2] = z;
        const sx = x + camX;
        const len = 0.5 + speed * 0.02;
        p[i * 6] = sx; p[i * 6 + 1] = y; p[i * 6 + 2] = z;
        if (dust) { p[i * 6 + 3] = sx + 1.2; p[i * 6 + 4] = y + 0.05; p[i * 6 + 5] = z - 0.3; }
        else { p[i * 6 + 3] = sx + 0.05; p[i * 6 + 4] = y + 1.0; p[i * 6 + 5] = z - len; }
      }
      this.attr.needsUpdate = true;
      // lightning, mostly at night
      this.nextBolt -= dt;
      if (this.nextBolt <= 0 && this.rain > 0.7) {
        this.nextBolt = 7 + Math.random() * 10;
        this.flash = 1;
        setTimeout(() => audio.thunder(), 500 + Math.random() * 900);
      }
    }
    this.flash = Math.max(0, this.flash - dt * 2.5);
    const f = this.flash > 0.6 ? 1 : this.flash > 0.4 ? 0.2 : this.flash > 0.2 ? 0.8 : this.flash;
    this.boltLight.intensity = f * (1.5 + night * 2.5);
  }
}
