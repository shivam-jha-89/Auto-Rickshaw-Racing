// Optional Blender models: drop .glb files into /public/models and list them in models.json.
// Anything listed replaces the procedural model of the same name. Export from Blender as glTF Binary,
// +Y up; in Blender point the front toward +Y (exported as -Z forward); 1 unit = 1 metre; origin on the ground at the centre.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { curvify } from './curve.js';
import { Builder } from './kit.js';

export const CUSTOM = {};

export async function loadCustomModels() {
  let list = [];
  try {
    const res = await fetch('/models/models.json', { cache: 'no-cache' });
    if (res.ok && (res.headers.get('content-type') || '').includes('json')) list = (await res.json()).models || [];
  } catch { return; }
  const loader = new GLTFLoader();
  await Promise.all(list.map(async name => {
    try {
      const gltf = await loader.loadAsync(`/models/${name}.glb`);
      const root = gltf.scene;
      root.traverse(o => {
        if (!o.isMesh) return;
        o.frustumCulled = false;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach(m => curvify(m));
      });
      const box = new THREE.Box3().setFromObject(root);
      const size = box.getSize(new THREE.Vector3());
      CUSTOM[name] = { root, hw: size.x / 2, hl: size.z / 2, h: size.y };
      console.info(`[models] loaded custom ${name}.glb`, size);
    } catch (e) { console.warn(`[models] could not load ${name}.glb`, e); }
  }));
}

/** Returns a fresh clone wrapped like the procedural factories ({group, hw, hl, h}) or null. */
export function customModel(name) {
  const c = CUSTOM[name];
  if (!c) return null;
  const group = new THREE.Group();
  const root = c.root.clone(true);
  group.add(root);
  // soft blob shadow under every Blender model
  const b = new Builder();
  b.plane(c.hw * 2 + 0.6, c.hl * 2 + 0.8, 'shadow', 0xffffff, [0, 0.03, 0], [-Math.PI / 2, 0, 0]);
  group.add(b.build());
  // nodes named Wheel_* spin in the game
  const wheels = [];
  root.traverse(o => { if (/^Wheel/i.test(o.name)) wheels.push(o); });
  return { group, hw: c.hw, hl: c.hl, h: c.h, wheels };
}
