// Sky dome, stars, sun/moon, fog and lighting driven by a time-of-day value (0..1, 0 = midnight).
import * as THREE from 'three';
import { MATS } from './kit.js';
import { TEX } from './textures.js';

const KEYS = [
  { t: 0.00, top: 0x050a1f, hor: 0x1a2142, sun: 0x7d8fd0, sunI: 0.25, hemi: 0.35, night: 1 },
  { t: 0.20, top: 0x0f1a40, hor: 0x3b3366, sun: 0x8090c0, sunI: 0.3, hemi: 0.4, night: 0.9 },
  { t: 0.26, top: 0x2d4a8a, hor: 0xf7a072, sun: 0xffa66b, sunI: 0.9, hemi: 0.6, night: 0.35 },
  { t: 0.34, top: 0x3f86d8, hor: 0xffdcb4, sun: 0xffe2bd, sunI: 1.8, hemi: 0.95, night: 0 },
  { t: 0.50, top: 0x2f7bd6, hor: 0xcfe7ff, sun: 0xffffff, sunI: 2.3, hemi: 1.1, night: 0 },
  { t: 0.66, top: 0x3b78c9, hor: 0xffe0b0, sun: 0xffe0b0, sunI: 1.9, hemi: 0.95, night: 0 },
  { t: 0.74, top: 0x2b2f72, hor: 0xff7e4f, sun: 0xff8f52, sunI: 1.0, hemi: 0.65, night: 0.35 },
  { t: 0.80, top: 0x10153a, hor: 0x5b2f5e, sun: 0x9a7ab8, sunI: 0.35, hemi: 0.45, night: 0.85 },
  { t: 1.00, top: 0x050a1f, hor: 0x1a2142, sun: 0x7d8fd0, sunI: 0.25, hemi: 0.35, night: 1 },
];
const RAIN_TOP = new THREE.Color(0x3a4250), RAIN_HOR = new THREE.Color(0x6b7380);

const ca = new THREE.Color(), cb = new THREE.Color();
function lerpKey(t) {
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1].t <= t) i++;
  const a = KEYS[i], b = KEYS[i + 1];
  const f = (t - a.t) / (b.t - a.t);
  const col = k => ca.set(a[k]).lerp(cb.set(b[k]), f).clone();
  return {
    top: col('top'), hor: col('hor'), sun: col('sun'),
    sunI: a.sunI + (b.sunI - a.sunI) * f, hemi: a.hemi + (b.hemi - a.hemi) * f, night: a.night + (b.night - a.night) * f,
  };
}

export class Environment {
  constructor(scene) {
    this.scene = scene;
    this.tod = 0.72;
    this.night = 0;

    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: {
        top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, bottom: { value: new THREE.Color(0x222222) },
        sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color() }, night: { value: 0 }, cloud: { value: 0 }, time: { value: 0 },
      },
      vertexShader: /* glsl */`
        varying vec3 vDir;
        void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
      fragmentShader: /* glsl */`
        uniform vec3 top, hor, bottom, sunCol, sunDir; uniform float night, cloud, time;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
          return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
        float fbm(vec2 p){ float v = 0.0, a = 0.5; for(int i=0;i<5;i++){ v += a*noise(p); p *= 2.03; a *= 0.5; } return v; }
        varying vec3 vDir;
        void main(){
          vec3 d = normalize(vDir);
          float h = d.y;
          vec3 c = mix(hor, top, smoothstep(-0.02, 0.55, h));
          c = mix(c, bottom, smoothstep(0.0, -0.3, h));
          float s = max(dot(d, sunDir), 0.0);
          float disc = smoothstep(0.9985, 0.9993, s);
          c += sunCol * (disc * 4.0 * (1.0 - cloud) + pow(s, 12.0) * 0.35 + pow(s, 3.0) * 0.08);
          // moon opposite the sun
          float m = max(dot(d, -sunDir), 0.0);
          c += vec3(0.85, 0.9,1.0) * smoothstep(0.9988, 0.9993, m) * night * 1.6 * (1.0 - cloud);
          c += vec3(0.4, 0.45, 0.6) * pow(m, 30.0) * night * 0.25;
          // drifting clouds (projected on a flat sky plane)
          if (h > 0.0) {
            vec2 cp = d.xz / (h + 0.12) * 1.6 + vec2(time * 0.012, time * 0.004);
            float cl = smoothstep(0.48 - cloud * 0.25, 0.85, fbm(cp));
            vec3 cloudCol = mix(hor * 1.15 + sunCol * 0.25, vec3(0.08, 0.09, 0.14), night * 0.85);
            cloudCol = mix(cloudCol, vec3(0.42, 0.45, 0.5) * (1.0 - night * 0.7), cloud * 0.8);
            c = mix(c, cloudCol, cl * smoothstep(0.0, 0.12, h) * (0.75 + cloud * 0.25));
          }
          gl_FragColor = vec4(c, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), this.skyMat);
    this.sky.renderOrder = -10;
    this.sky.frustumCulled = false;
    scene.add(this.sky);

    // stars
    const N = 900, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const v = new THREE.Vector3().randomDirection();
      v.y = Math.abs(v.y) * 0.9 + 0.05;
      v.normalize().multiplyScalar(560);
      pos.set([v.x, v.y, v.z], i * 3);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
    this.stars = new THREE.Points(sg, this.starMat);
    this.stars.frustumCulled = false;
    scene.add(this.stars);

    // distant city skyline ring (follows the camera, sits on the horizon)
    this.skylineMat = new THREE.MeshBasicMaterial({ map: TEX.skyline, transparent: true, fog: false, depthWrite: false, color: 0xffffff });
    this.skylineLitMat = new THREE.MeshBasicMaterial({ map: TEX.skylineLit, transparent: true, fog: false, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, toneMapped: false });
    TEX.skyline.repeat.set(4, 1); TEX.skylineLit.repeat.set(4, 1);
    const ringGeo = new THREE.CylinderGeometry(520, 520, 70, 64, 1, true);
    this.skyline = new THREE.Group();
    for (const m of [this.skylineMat, this.skylineLitMat]) {
      m.side = THREE.BackSide;
      const r = new THREE.Mesh(ringGeo, m);
      r.renderOrder = -9; r.frustumCulled = false;
      this.skyline.add(r);
    }
    scene.add(this.skyline);

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x554433, 1);
    this.sun = new THREE.DirectionalLight(0xffffff, 2);
    scene.add(this.hemi, this.sun, this.sun.target);

    scene.fog = new THREE.Fog(0xffffff, 40, 190);
    this.sunDir = new THREE.Vector3();
  }

  update(camera, rain = 0, dt = 0, dust = 0) {
    const k = lerpKey(((this.tod % 1) + 1) % 1);
    this.night = k.night;
    const a = (this.tod - 0.25) * Math.PI * 2; // sunrise at 0.25
    this.sunDir.set(Math.cos(a) * 0.55, Math.sin(a), -0.75).normalize();
    // keep sun low-ish & in front for nice sunsets
    const u = this.skyMat.uniforms;
    u.top.value.copy(k.top).lerp(RAIN_TOP, rain * 0.75).multiplyScalar(1 - rain * 0.3 * (1 - k.night));
    u.hor.value.copy(k.hor).lerp(RAIN_HOR, rain * 0.7).multiplyScalar(1 - rain * 0.35 * k.night);
    u.bottom.value.copy(u.hor.value).multiplyScalar(0.5);
    u.sunDir.value.copy(this.sunDir);
    u.sunCol.value.copy(k.sun);
    u.night.value = k.night;
    u.cloud.value = rain;

    this.sky.position.copy(camera.position);
    u.time.value += dt;
    this.skyline.position.set(camera.position.x, 2, camera.position.z);
    this.skylineMat.color.copy(u.hor.value).lerp(new THREE.Color(0x10131c), 0.55 + k.night * 0.3);
    this.skylineMat.opacity = 0.85 - rain * 0.5;
    this.skylineLitMat.opacity = Math.max(0, k.night - 0.2) * (1 - rain * 0.6);
    TEX.waterNormal.offset.x += dt * 0.02; TEX.waterNormal.offset.y += dt * 0.035;
    this.stars.position.copy(camera.position);
    this.stars.rotation.y += dt * 0.004;
    this.starMat.opacity = Math.max(0, k.night - 0.2) * (1 - rain);

    if (dust > 0) {
      const sand = new THREE.Color(0xc98a4a).multiplyScalar(1 - k.night * 0.7);
      u.hor.value.lerp(sand, dust * 0.85); u.top.value.lerp(sand.clone().multiplyScalar(0.8), dust * 0.7);
      u.cloud.value = Math.max(u.cloud.value, dust);
    }
    this.scene.fog.color.copy(u.hor.value);
    this.scene.fog.near = 30 - rain * 12 - dust * 18;
    this.scene.fog.far = 200 - rain * 70 - dust * 95;

    this.sun.color.copy(k.sun);
    this.sun.intensity = k.sunI * (1 - rain * 0.55);
    const sd = this.sunDir.y < 0 ? this.sunDir.clone().negate() : this.sunDir; // moonlight at night
    this.sun.position.set(camera.position.x + sd.x * 50, Math.max(15, sd.y * 50), camera.position.z + sd.z * 50);
    this.sun.target.position.set(camera.position.x, 0, camera.position.z - 20);
    this.hemi.color.copy(u.top.value).lerp(new THREE.Color(0xffffff), 0.5);
    this.hemi.groundColor.copy(u.hor.value).multiplyScalar(0.5);
    this.hemi.intensity = k.hemi * (1 - rain * 0.3);

    // night-driven material glows
    const n = k.night;
    MATS.facade.emissiveIntensity = Math.max(0, n - 0.15) * 1.25;
    MATS.sign.emissiveIntensity = n * 0.55;
    MATS.poster.emissiveIntensity = n * 0.25;
    MATS.gate.emissiveIntensity = 0.12 + n * 0.5;
    MATS.pool.opacity = n * 0.55;
    MATS.beamSoft.opacity = Math.max(0, n - 0.2) * 0.5;
    MATS.water.color.copy(u.hor.value).lerp(new THREE.Color(0xbfe6f2), 0.55);
    MATS.glass.emissiveIntensity = 1 + n * 2;
    this.scene.environmentIntensity = (0.35 + (1 - n) * 0.65) * (1 - rain * 0.3);
    return k;
  }
}
