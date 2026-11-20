// The player's auto-rickshaw. Faces -z. Origin = ground under the middle of the vehicle.
import * as THREE from 'three';
import { Builder, MATS } from '../render/kit.js';
import { artUV } from '../render/textures.js';
import { addSeated } from './person.js';
import { customModel } from '../render/gltf.js';

const DARK = 0x1a1a1a, CHROME = 0xdedede, SEAT = 0x8b1a1a;

export function createRickshaw(skin) {
  const root = new THREE.Group();
  const tilt = new THREE.Group();     // roll / pitch / trick spin
  root.add(tilt);
  const b = new Builder();

  // chassis + rear tub
  b.box(1.3, 0.14, 2.7, DARK, 0, 0.42, 0.05);
  b.box(1.52, 0.62, 1.35, skin.body, 0, 0.8, 0.62);
  b.box(1.58, 0.07, 1.4, skin.trim, 0, 1.13, 0.62, { kind: 'shiny' });
  b.box(1.58, 0.05, 1.4, skin.trim, 0, 0.5, 0.62, { kind: 'shiny' });
  // truck-art panels on the sides and back
  b.plane(1.22, 0.46, 'art', 0xffffff, [0.77, 0.8, 0.62], [0, Math.PI / 2, 0], { uv: artUV.flowers });
  b.plane(1.22, 0.46, 'art', 0xffffff, [-0.77, 0.8, 0.62], [0, -Math.PI / 2, 0], { uv: artUV.flowers });
  b.plane(1.3, 0.5, 'art', 0xffffff, [0, 0.8, 1.3], [0, 0, 0], { uv: artUV.band });
  b.plane(1.3, 0.16, 'art', 0xffffff, [0, 2.04, 1.38], [0, 0, 0], { uv: artUV.small });
  // tail lights + plate
  for (const s of [-1, 1]) b.box(0.2, 0.12, 0.05, 0xff2a2a, s * 0.58, 1.0, 1.31, { kind: 'glow' });
  b.box(0.42, 0.14, 0.03, 0xf5f5f5, 0, 0.6, 1.32);
  // driver section
  b.box(1.05, 0.08, 1.0, DARK, 0, 0.52, -0.52);
  b.box(1.02, 0.86, 0.16, skin.body, 0, 0.96, -1.02, { r: [-0.18, 0, 0] });
  b.box(0.92, 0.12, 0.5, skin.body, 0, 0.56, -0.9);
  b.plane(0.7, 0.3, 'art', 0xffffff, [0, 0.82, -1.13], [-0.18 + Math.PI, 0, Math.PI], { uv: artUV.small });
  // headlight + indicators
  b.cyl(0.14, 0.14, 0.08, CHROME, 0, 1.16, -1.14, { r: [Math.PI / 2, 0, 0], kind: 'shiny', seg: 14 });
  b.cyl(0.11, 0.11, 0.02, 0xfff3c4, 0, 1.16, -1.19, { r: [Math.PI / 2, 0, 0], kind: 'glow', seg: 14 });
  for (const s of [-1, 1]) b.box(0.1, 0.07, 0.05, 0xffa000, s * 0.42, 0.7, -1.13, { kind: 'glow' });
  // windscreen + frame
  b.box(1.08, 0.62, 0.03, 0x2a3b4c, 0, 1.7, -1.0, { kind: 'glass', r: [-0.12, 0, 0] });
  b.box(1.14, 0.05, 0.07, CHROME, 0, 1.39, -1.03, { kind: 'shiny' });
  // pillars
  for (const [x, z] of [[-0.74, -0.98], [0.74, -0.98], [-0.74, 1.27], [0.74, 1.27], [-0.74, 0.0], [0.74, 0.0]]) {
    b.cyl(0.032, 0.032, 1.0, CHROME, x, 1.6, z, { kind: 'shiny', seg: 6 });
  }
  // canopy roof
  b.box(1.6, 0.1, 2.55, skin.canopy, 0, 2.12, 0.14);
  b.cyl(0.8, 0.8, 2.55, skin.canopy, 0, 2.15, 0.14, { r: [Math.PI / 2, 0, 0], s: [1, 1, 0.28], seg: 14 });
  b.box(1.65, 0.05, 2.62, skin.trim, 0, 2.06, 0.14, { kind: 'shiny' });
  // jhalar fringe
  const fr = skin.stripe;
  for (let i = 0; i < 15; i++) {
    const z = -1.1 + i * 0.17;
    for (const s of [-1, 1]) b.box(0.02, 0.17, 0.085, fr[i % fr.length], s * 0.83, 1.96, z);
  }
  for (let i = 0; i < 9; i++) b.box(0.085, 0.17, 0.02, fr[i % fr.length], -0.72 + i * 0.18, 1.96, -1.17);
  // side canvas flaps (rolled)
  for (const s of [-1, 1]) b.cyl(0.07, 0.07, 1.25, skin.canopy, s * 0.8, 2.0, 0.6, { r: [Math.PI / 2, 0, 0], seg: 6 });
  // seats
  b.box(1.3, 0.18, 0.62, SEAT, 0, 1.18, 0.84);
  b.box(1.3, 0.62, 0.12, SEAT, 0, 1.55, 1.2);
  b.box(0.56, 0.14, 0.45, DARK, 0, 1.08, -0.22);
  // handlebar, column, mirrors
  b.cyl(0.03, 0.03, 0.92, CHROME, 0, 1.33, -0.78, { r: [0, 0, Math.PI / 2], kind: 'shiny', seg: 6 });
  b.cyl(0.035, 0.035, 0.7, CHROME, 0, 0.98, -0.94, { r: [0.3, 0, 0], kind: 'shiny', seg: 6 });
  for (const s of [-1, 1]) {
    b.cyl(0.015, 0.015, 0.38, CHROME, s * 0.52, 1.5, -0.8, { r: [0, 0, s * 0.55], kind: 'shiny', seg: 4 });
    b.sphere(0.08, CHROME, s * 0.62, 1.67, -0.8, { kind: 'shiny', s: [1, 0.7, 0.35], seg: 8 });
    b.box(0.26, 0.06, 0.78, skin.body, s * 0.68, 0.7, 0.92);     // rear mudguards
    b.box(0.05, 0.5, 0.05, CHROME, s * 0.13, 0.55, -1.16, { kind: 'shiny' }); // front fork
  }
  b.box(0.28, 0.06, 0.6, skin.trim, 0, 0.67, -1.17, { kind: 'shiny' });
  b.cyl(0.055, 0.055, 0.6, CHROME, 0.45, 0.36, 1.3, { r: [Math.PI / 2, 0, 0], kind: 'shiny', seg: 8 });
  if (skin.glow) b.box(1.2, 0.03, 2.4, skin.glow, 0, 0.33, 0.05, { kind: 'glow' });
  addSeated(b, 0, 1.12, -0.22, { skin: 0xb07a52, shirt: 0xd9d2bf, pants: 0x55524a, hat: 0x2b2b2b, scarf: 0xb33a3a });
  b.plane(3.2, 12, 'beamSoft', 0xffffff, [0, 0.07, -7.2], [-Math.PI / 2, 0, 0]);
  b.plane(2.1, 3.7, 'shadow', 0xffffff, [0, 0.03, 0.1], [-Math.PI / 2, 0, 0]);
  const custom = customModel('rickshaw');
  if (custom) { b.parts = { beamSoft: b.parts.beamSoft }; tilt.add(b.build(), custom.group); } // Blender body + keep the night headlight pool
  else tilt.add(b.build());

  // wheels (separate so they can spin)
  const wheels = [];
  const wheel = (x, y, z) => {
    const w = new Builder();
    w.cyl(0.3, 0.3, 0.2, 0x151515, 0, 0, 0, { r: [0, 0, Math.PI / 2], seg: 14 });
    w.cyl(0.17, 0.17, 0.22, CHROME, 0, 0, 0, { r: [0, 0, Math.PI / 2], kind: 'shiny', seg: 8 });
    w.box(0.23, 0.05, 0.3, 0x444444, 0, 0, 0);
    const g = w.build();
    g.position.set(x, y, z);
    g.children.forEach(m => (m.matrixAutoUpdate = true));
    tilt.add(g);
    wheels.push(g);
  };
  if (!custom) { wheel(-0.7, 0.3, 0.92); wheel(0.7, 0.3, 0.92); wheel(0, 0.3, -1.18); }
  else wheels.push(...custom.wheels);

  // passenger (toggled)
  const pb = new Builder();
  addSeated(pb, 0, 0, 0, { skin: 0xc68a5e, shirt: 0x3f6fb5, pants: 0x2a3550, hat: null, scarf: 0xf2c14e }, 'down');
  const passenger = pb.build();
  passenger.position.set(0.28, 1.27, 0.86);
  passenger.visible = false;
  tilt.add(passenger);

  // nitro flames
  const flameMat = new THREE.MeshBasicMaterial({ color: 0x5ee7ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.9, 8), flameMat);
  flame.rotation.x = Math.PI / 2;
  flame.position.set(0.45, 0.36, 1.95);
  flame.visible = false;
  tilt.add(flame);

  // shield bubble
  const shieldMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { t: { value: 0 }, col: { value: new THREE.Color(0x4fc3f7) }, a: { value: 1 } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main(){ vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.0); vV = -mv.xyz; vP = position; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform float t; uniform vec3 col; uniform float a; varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.5);
        float hex = 0.5 + 0.5*sin(vP.y*14.0 - t*4.0)*sin(vP.x*14.0);
        gl_FragColor = vec4(col, (f*0.9 + hex*0.08) * a); }`,
  });
  const shield = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 3), shieldMat);
  shield.scale.set(1.25, 1.35, 2.0);
  shield.position.set(0, 1.15, 0.1);
  shield.visible = false;
  tilt.add(shield);

  // headlight spot
  const head = new THREE.SpotLight(0xfff1c8, 0, 60, 0.5, 0.6, 1.2);
  head.position.set(0, 1.2, -1.2);
  head.target.position.set(0, 0, -20);
  root.add(head, head.target);

  return { root, tilt, wheels, passenger, flame, shield, head };
}

export { MATS };
