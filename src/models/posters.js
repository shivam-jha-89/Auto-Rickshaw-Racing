// Shared helper: slap a few posters on a facade (x = 0 plane, facing +x).
import { rand, randi } from '../render/kit.js';
import { posterUV } from '../render/textures.js';

export function posters(b, w, y, n = randi(1, 3)) {
  for (let i = 0; i < n; i++) {
    const z = rand(-w / 2 + 1, w / 2 - 1);
    b.plane(0.95, 1.2, 'poster', 0xffffff, [0.08 + i * 0.002, y + rand(-0.2, 0.3), z], [0, Math.PI / 2, rand(-0.06, 0.06)], { uv: posterUV(randi(0, 11)) });
  }
}
