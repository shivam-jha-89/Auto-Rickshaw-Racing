// Low-poly people: baked into vehicles (drivers/riders) or standalone with a waving arm.
import * as THREE from 'three';
import { Builder, pick } from '../render/kit.js';

const SKIN = [0xc68a5e, 0xa86d45, 0xd9a07a, 0x8d5a3b];
const SHIRT = [0xe8e2d0, 0x3f6fb5, 0xb33a3a, 0x2f7d4f, 0xf2c14e, 0x7a4fa3, 0xffffff, 0xe07b39];
const PANTS = [0x3a3a3a, 0x5a4a3a, 0xe8e2d0, 0x2a3550];

export const randomLook = () => ({ skin: pick(SKIN), shirt: pick(SHIRT), pants: pick(PANTS), hat: Math.random() < 0.35 ? pick([0x2b2b2b, 0xffffff, 0x7a2a2a]) : null, scarf: Math.random() < 0.4 ? pick(SHIRT) : null });

/** Seated person; (x,y,z) = hip point on the seat. Faces -z. */
export function addSeated(b, x, y, z, look = randomLook(), arms = 'forward') {
  b.box(0.42, 0.56, 0.26, look.shirt, x, y + 0.33, z);                     // torso (kurta)
  b.box(0.46, 0.2, 0.3, look.shirt, x, y + 0.08, z);                       // kurta hem
  if (look.scarf) b.box(0.44, 0.1, 0.28, look.scarf, x, y + 0.56, z);
  b.sphere(0.14, look.skin, x, y + 0.78, z, { seg: 8 });
  b.box(0.2, 0.08, 0.12, 0x1a1a1a, x, y + 0.76, z - 0.12);                 // moustache/face hint
  if (look.hat) b.cyl(0.13, 0.15, 0.12, look.hat, x, y + 0.92, z, { seg: 8 });
  else b.sphere(0.145, 0x1a1a1a, x, y + 0.82, z + 0.02, { seg: 8, half: true });
  b.box(0.4, 0.14, 0.46, look.pants, x, y + 0.02, z - 0.2);                // thighs
  b.box(0.36, 0.42, 0.13, look.pants, x, y - 0.2, z - 0.42);               // shins
  if (arms === 'forward') {
    for (const s of [-1, 1]) b.box(0.1, 0.1, 0.42, look.shirt, x + s * 0.26, y + 0.42, z - 0.2, { r: [0.35, 0, 0] });
  } else {
    for (const s of [-1, 1]) b.box(0.1, 0.42, 0.1, look.shirt, x + s * 0.27, y + 0.32, z);
  }
}

/** Standing person group (origin at feet, faces +z by default). Returns {group, arm}. */
export function createStanding(look = randomLook()) {
  const b = new Builder();
  b.box(0.16, 0.8, 0.18, look.pants, -0.12, 0.4, 0);
  b.box(0.16, 0.8, 0.18, look.pants, 0.12, 0.4, 0);
  b.box(0.46, 0.7, 0.28, look.shirt, 0, 1.15, 0);
  b.box(0.5, 0.25, 0.3, look.shirt, 0, 0.82, 0);
  if (look.scarf) b.box(0.48, 0.1, 0.3, look.scarf, 0, 1.45, 0);
  b.sphere(0.15, look.skin, 0, 1.68, 0, { seg: 8 });
  if (look.hat) b.cyl(0.14, 0.16, 0.13, look.hat, 0, 1.83, 0, { seg: 8 });
  else b.sphere(0.155, 0x1a1a1a, 0, 1.72, -0.02, { seg: 8, half: true });
  b.box(0.1, 0.62, 0.1, look.shirt, -0.3, 1.12, 0);                        // left arm
  b.plane(0.9, 0.9, 'shadow', 0xffffff, [0, 0.02, 0], [-Math.PI / 2, 0, 0]);
  const group = b.build();
  const ab = new Builder();
  ab.box(0.1, 0.62, 0.1, look.shirt, 0, 0.28, 0);
  ab.sphere(0.07, look.skin, 0, 0.62, 0, { seg: 6 });
  const arm = ab.build();
  arm.position.set(0.3, 1.42, 0);
  group.add(arm);
  return { group, arm };
}

export const tmpV = new THREE.Vector3();
