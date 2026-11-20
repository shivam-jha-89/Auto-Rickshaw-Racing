// Every texture in the game is painted at startup on a <canvas>. No image files.
import * as THREE from 'three';
import { POSTERS } from '../config.js';

export const TEX = {};

export const SHOPS = [
  'Chacha Chai Point', 'Bun Kabab Corner', 'Saddar Tailors', 'Sitara Mobile Zone',
  'Garma Garam Nihari', 'Seekh Kabab House', 'Noor Cloth Mart', 'Baba Jalebi House',
  'Fauji Hardware', 'Lucky Paan Corner', 'Rabri Wala', 'Rehmat Shoe Store',
  'Chand Bakers', 'Doodh Patti Dhaba', 'Biryani Centre', 'Saeed Photo Studio',
];
export const NEON = ['CHAI', 'BURGER', 'MALL', 'OPEN 24/7', 'CAFE', 'GAMING', 'FASHION', 'SHAWARMA'];
const SIGN_BG = ['#c62828', '#1565c0', '#2e7d32', '#f9a825', '#6a1b9a', '#00838f', '#ef6c00', '#283593'];

const rnd = (a, b) => a + Math.random() * (b - a);

function paint(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  return c;
}
function tex(c, { repeat = true, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}
function speckle(g, w, h, n, dark = 0.12, light = 0.08) {
  for (let i = 0; i < n; i++) {
    const l = Math.random() < 0.5;
    g.fillStyle = l ? `rgba(255,255,255,${Math.random() * light})` : `rgba(0,0,0,${Math.random() * dark})`;
    const s = rnd(1, 3.5);
    g.fillRect(rnd(0, w), rnd(0, h), s, s);
  }
}
function fitText(g, text, maxW, size, font) {
  let s = size;
  do { g.font = `${font} ${s}px "Trebuchet MS", "Segoe UI", sans-serif`; s -= 2; } while (g.measureText(text).width > maxW && s > 10);
}

// ---------- atlas UV helpers (CanvasTexture flipY: canvas top row is v=1) ----------
const row = (i, rows) => [0, 1 - (i + 1) / rows, 1, 1 - i / rows];
export const signUV = i => row(i % SHOPS.length, 16);
export const neonUV = i => row(i % NEON.length, 8);
let gateRows = 3;
export const gateUV = i => row(i, gateRows);
export const posterUV = i => { i %= 12; const c = i % 4, r = Math.floor(i / 4); return [c / 4, 1 - (r + 1) / 3, (c + 1) / 4, 1 - r / 3]; };
export const letterUV = ch => { const i = 'KARCHI'.indexOf(ch); return [i / 6, 0, (i + 1) / 6, 1]; };
export const iconUV = i => [i / 5, 0, (i + 1) / 5, 1];
export const artUV = { band: [0, 0.75, 1, 1], flowers: [0, 0.25, 1, 0.75], small: [0, 0, 1, 0.25], all: [0, 0, 1, 1] };

export function buildTextures(districts) {
  // ---- road: u across 9.6 m, v repeats every 12 m ----
  TEX.road = tex(paint(256, 512, (g, w, h) => {
    g.fillStyle = '#45454b'; g.fillRect(0, 0, w, h);
    speckle(g, w, h, 5000, 0.25, 0.1);
    for (let i = 0; i < 6; i++) { // tar patches
      g.fillStyle = `rgba(20,20,24,${rnd(0.15, 0.3)})`;
      g.beginPath(); g.ellipse(rnd(0, w), rnd(0, h), rnd(8, 30), rnd(10, 50), rnd(0, 3), 0, 7); g.fill();
    }
    const ux = u => u * w;
    g.fillStyle = '#d9bd3c'; // edge lines
    g.fillRect(ux(0.03) - 3, 0, 6, h); g.fillRect(ux(0.97) - 3, 0, 6, h);
    g.fillStyle = '#cfcfcf'; // dashed lane lines
    for (const u of [0.34375, 0.65625]) g.fillRect(ux(u) - 3, 0, 6, h * 0.45);
  }));

  TEX.walk = tex(paint(128, 128, (g, w, h) => {
    g.fillStyle = '#e8e4dc'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = 3;
    for (let i = 0; i <= 2; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); }
    speckle(g, w, h, 800, 0.15, 0.1);
  }));

  TEX.ground = tex(paint(256, 256, (g, w, h) => {
    g.fillStyle = '#d0d0d0'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      g.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${rnd(0.03, 0.1)})`;
      g.beginPath(); g.arc(rnd(0, w), rnd(0, h), rnd(6, 26), 0, 7); g.fill();
    }
    speckle(g, w, h, 4000, 0.2, 0.15);
  }));

  // ---- facade: 2x2 windows, tinted by vertex colour ----
  const lit = [];
  TEX.facade = tex(paint(256, 256, (g, w, h) => {
    g.fillStyle = '#f4f0ea'; g.fillRect(0, 0, w, h);
    speckle(g, w, h, 2500, 0.1, 0.05);
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
      const X = x * 128, Y = y * 128;
      g.fillStyle = '#c9bfb0'; g.fillRect(X + 30, Y + 26, 68, 80);         // frame
      g.fillStyle = '#26323e'; g.fillRect(X + 36, Y + 32, 56, 68);         // glass
      g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(X + 36, Y + 32, 20, 68);
      g.fillStyle = '#9d9284'; g.fillRect(X + 26, Y + 104, 76, 8);          // sill
      g.fillStyle = '#c9bfb0'; g.fillRect(X + 62, Y + 32, 4, 68);
      lit.push([X, Y]);
    }
    g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, 0, w, 6); g.fillRect(0, 128, w, 6); // floor bands
  }));
  TEX.facadeLit = tex(paint(256, 256, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    const cols = ['#ffcf7a', '#ffe7b0', '#ffb45e', '#a8d8ff'];
    lit.forEach(([X, Y], i) => {
      if (i === 2) return; // one dark window per tile
      g.fillStyle = cols[i % cols.length];
      g.fillRect(X + 36, Y + 32, 56, 68);
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(X + 62, Y + 32, 4, 68);
    });
  }));

  // ---- truck art (original pattern): band / flowers / small strip ----
  TEX.art = tex(paint(512, 512, (g, w, h) => {
    const C = ['#d62828', '#ffd60a', '#0b8f3a', '#1565c0', '#e91e63', '#ff7f11', '#ffffff', '#00acc1'];
    // band (top quarter): zig-zags
    g.fillStyle = '#1b1024'; g.fillRect(0, 0, w, 128);
    for (let r = 0; r < 4; r++) {
      g.fillStyle = C[r % C.length];
      g.beginPath();
      for (let x = 0; x <= w; x += 16) g.lineTo(x, 8 + r * 30 + (x / 16) % 2 * 14);
      for (let x = w; x >= 0; x -= 16) g.lineTo(x, 18 + r * 30 + (x / 16) % 2 * 14);
      g.fill();
    }
    // flowers panel (middle half)
    const grd = g.createLinearGradient(0, 128, 0, 384);
    grd.addColorStop(0, '#0d47a1'); grd.addColorStop(1, '#00897b');
    g.fillStyle = grd; g.fillRect(0, 128, w, 256);
    g.strokeStyle = '#ffd60a'; g.lineWidth = 8; g.strokeRect(8, 136, w - 16, 240);
    for (let i = 0; i < 7; i++) {
      const cx = 40 + i * 72, cy = 256 + (i % 2 ? -36 : 36), col = C[i % 6];
      for (let p = 0; p < 8; p++) {
        const a = (p / 8) * Math.PI * 2;
        g.fillStyle = p % 2 ? col : '#fff';
        g.beginPath(); g.ellipse(cx + Math.cos(a) * 18, cy + Math.sin(a) * 18, 14, 7, a, 0, 7); g.fill();
      }
      g.fillStyle = '#ffd60a'; g.beginPath(); g.arc(cx, cy, 10, 0, 7); g.fill();
      g.fillStyle = '#d62828'; g.beginPath(); g.arc(cx, cy, 5, 0, 7); g.fill();
      // leaves
      g.fillStyle = '#2bbf5a';
      g.beginPath(); g.ellipse(cx + 26, cy + 26, 12, 5, 0.8, 0, 7); g.fill();
      g.beginPath(); g.ellipse(cx - 26, cy - 26, 12, 5, 0.8, 0, 7); g.fill();
    }
    // small strip (bottom quarter): dots + chevrons
    g.fillStyle = '#ffd60a'; g.fillRect(0, 384, w, 128);
    for (let x = 0; x < w; x += 32) {
      g.fillStyle = C[(x / 32) % 4];
      g.beginPath(); g.moveTo(x, 400); g.lineTo(x + 16, 448); g.lineTo(x + 32, 400); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(x + 16, 480, 8, 0, 7); g.fill();
    }
  }));

  // ---- shop sign atlas: 16 rows ----
  TEX.signs = tex(paint(512, 1024, (g, w, h) => {
    SHOPS.forEach((name, i) => {
      const y = i * 64;
      g.fillStyle = SIGN_BG[i % SIGN_BG.length]; g.fillRect(0, y, w, 64);
      g.strokeStyle = '#ffd60a'; g.lineWidth = 5; g.strokeRect(4, y + 4, w - 8, 56);
      g.fillStyle = i % 3 === 0 ? '#ffd60a' : '#ffffff';
      fitText(g, name, w - 40, 40, '900');
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(name, w / 2, y + 34);
    });
  }), { repeat: false });

  // ---- neon atlas: white glowing text on transparent ----
  TEX.neon = tex(paint(512, 512, (g, w) => {
    NEON.forEach((t, i) => {
      const y = i * 64 + 34;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      fitText(g, t, w - 60, 46, 'italic 900');
      g.shadowColor = '#fff'; g.shadowBlur = 14;
      g.strokeStyle = '#fff'; g.lineWidth = 4; g.strokeText(t, w / 2, y);
      g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,.85)'; g.fillText(t, w / 2, y);
    });
  }), { repeat: false });

  // ---- district gate banners ----
  gateRows = districts.length;
  TEX.gate = tex(paint(1024, 256 * districts.length, (g, w) => {
    districts.forEach((d, i) => {
      const y = i * 256;
      const grd = g.createLinearGradient(0, y, 0, y + 256);
      grd.addColorStop(0, '#7b1fa2'); grd.addColorStop(1, '#c62828');
      g.fillStyle = grd; g.fillRect(0, y, w, 256);
      g.strokeStyle = '#ffd60a'; g.lineWidth = 12; g.strokeRect(10, y + 10, w - 20, 236);
      for (let x = 30; x < w - 20; x += 40) { g.fillStyle = ['#ffd60a', '#2bbf5a', '#00acc1'][(x / 40) % 3 | 0]; g.beginPath(); g.arc(x, y + 28, 7, 0, 7); g.fill(); g.beginPath(); g.arc(x, y + 228, 7, 0, 7); g.fill(); }
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#fff'; g.font = '900 86px "Trebuchet MS", sans-serif';
      g.fillText(d.name.toUpperCase(), w / 2, y + 100);
      g.fillStyle = '#ffd60a'; g.font = '500 54px "Noto Nastaliq Urdu", serif';
      g.fillText(d.urdu, w / 2, y + 185);
    });
  }), { repeat: false });

  // ---- radial blob (shadows, light pools, glows) ----
  // ---- paan ki peek (red-brown splatter decals) ----
  TEX.stain = tex(paint(128, 128, (g) => {
    for (let i = 0; i < 26; i++) {
      const r = rnd(4, i < 4 ? 30 : 10), a = rnd(0, 6.28), d = i < 4 ? rnd(0, 12) : rnd(18, 56);
      g.fillStyle = `rgba(${130 + Math.random() * 40 | 0}, ${20 + Math.random() * 15 | 0}, ${20 + Math.random() * 10 | 0}, ${rnd(0.55, 0.9)})`;
      g.beginPath(); g.ellipse(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, r, r * rnd(0.5, 1), a, 0, 7); g.fill();
    }
    g.strokeStyle = 'rgba(140,25,22,.6)'; g.lineWidth = 3;
    for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(64, 70); g.lineTo(64 + rnd(-20, 20), 70 + rnd(25, 55)); g.stroke(); } // drips
  }), { repeat: false });

  TEX.blob = tex(paint(64, 64, (g) => {
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.5, 'rgba(255,255,255,.6)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  }), { repeat: false, srgb: false });

  // ---- power-up icons (magnet, shield, 2x, bolt) ----
  TEX.icons = tex(paint(640, 128, (g) => {
    const cell = (i, f) => { g.save(); g.translate(i * 128 + 64, 64); f(); g.restore(); };
    g.lineCap = 'round'; g.lineJoin = 'round';
    cell(0, () => { // magnet
      g.lineWidth = 26; g.strokeStyle = '#ff3b3b'; g.beginPath(); g.arc(0, -4, 30, Math.PI, 0); g.lineTo(30, 34); g.moveTo(-30, -4); g.lineTo(-30, 34); g.stroke();
      g.strokeStyle = '#fff'; g.beginPath(); g.moveTo(-30, 30); g.lineTo(-30, 44); g.moveTo(30, 30); g.lineTo(30, 44); g.stroke();
    });
    cell(1, () => { // shield
      g.fillStyle = '#4fc3f7'; g.beginPath(); g.moveTo(0, -48); g.lineTo(40, -32); g.quadraticCurveTo(40, 26, 0, 50); g.quadraticCurveTo(-40, 26, -40, -32); g.closePath(); g.fill();
      g.fillStyle = '#e1f5fe'; g.beginPath(); g.moveTo(0, -34); g.lineTo(26, -23); g.quadraticCurveTo(26, 16, 0, 34); g.closePath(); g.fill();
    });
    cell(2, () => { // 2x coin
      g.fillStyle = '#ffd60a'; g.beginPath(); g.arc(0, 0, 48, 0, 7); g.fill();
      g.strokeStyle = '#b8860b'; g.lineWidth = 6; g.stroke();
      g.fillStyle = '#7a4b00'; g.font = '900 48px "Trebuchet MS", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('2x', 0, 3);
    });
    cell(3, () => { // bolt
      g.fillStyle = '#00e5ff'; g.beginPath(); g.moveTo(10, -52); g.lineTo(-30, 8); g.lineTo(-2, 8); g.lineTo(-12, 52); g.lineTo(30, -10); g.lineTo(2, -10); g.closePath(); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 4; g.stroke();
    });
    cell(4, () => { // folded paan leaf with a clove
      g.fillStyle = '#2f9e44'; g.beginPath(); g.moveTo(0, -50); g.quadraticCurveTo(48, -10, 0, 50); g.quadraticCurveTo(-48, -10, 0, -50); g.fill();
      g.strokeStyle = '#1b5e20'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, -44); g.lineTo(0, 44); g.stroke();
      for (const y of [-20, 0, 20]) { g.beginPath(); g.moveTo(0, y); g.lineTo(20, y - 12); g.moveTo(0, y); g.lineTo(-20, y - 12); g.stroke(); }
      g.fillStyle = '#6d3b1f'; g.fillRect(-4, -8, 8, 22); g.beginPath(); g.arc(0, -10, 7, 0, 7); g.fill();
    });
  }), { repeat: false });
  // ---- wall posters (4 x 3 atlas, each 256 x 320) ----
  TEX.posters = tex(paint(1024, 960, (g) => {
    POSTERS.forEach(([head, sub, bg, fg], i) => {
      const X = (i % 4) * 256, Y = Math.floor(i / 4) * 320;
      g.save(); g.translate(X, Y);
      g.fillStyle = bg; g.fillRect(6, 6, 244, 308);
      // decorative style per poster
      const style = i % 3;
      if (style === 0) { g.fillStyle = 'rgba(255,255,255,.18)'; for (let k = 0; k < 8; k++) { g.beginPath(); g.moveTo(128, 150); g.arc(128, 150, 220, k * 0.785, k * 0.785 + 0.39); g.fill(); } }
      if (style === 1) { g.fillStyle = 'rgba(0,0,0,.15)'; for (let k = 0; k < 12; k++) g.fillRect(6, 6 + k * 26, 244, 12); }
      if (style === 2) { for (let k = 0; k < 9; k++) { g.fillStyle = ['#d62828', '#ffd60a', '#0b8f3a', '#1565c0'][k % 4]; g.beginPath(); g.moveTo(6 + k * 28, 300); g.lineTo(20 + k * 28, 272); g.lineTo(34 + k * 28, 300); g.fill(); } }
      g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(14, 14, 228, 292);
      g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
      const words = head.split(' ');
      const lines = words.length > 2 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : words.length === 2 ? words : [head];
      lines.forEach((ln, k) => { fitText(g, ln, 210, 54, '900'); g.fillText(ln, 128, 110 + k * 58 - (lines.length - 1) * 20); });
      fitText(g, sub, 210, 22, '700');
      g.fillText(sub, 128, 250);
      // torn corner + tape
      g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(100, 0, 56, 18);
      g.restore();
    });
  }), { repeat: false });
  // ---- K A R C H I letter pickups ----
  TEX.letters = tex(paint(768, 128, (g) => {
    'KARCHI'.split('').forEach((ch, i) => {
      const x = i * 128 + 64;
      g.fillStyle = '#ffd60a'; g.beginPath(); g.arc(x, 64, 58, 0, 7); g.fill();
      g.lineWidth = 8; g.strokeStyle = '#d62828'; g.stroke();
      g.fillStyle = '#1b1024'; g.font = '900 84px "Trebuchet MS", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(ch, x, 70);
    });
  }), { repeat: false });

  // ---- animated water normal map (tileable value noise) ----
  TEX.waterNormal = tex(paint(256, 256, (g, w, h) => {
    const img = g.createImageData(w, h);
    const H = new Float32Array(w * h);
    for (let o = 0; o < 4; o++) {
      const f = 4 << o, amp = 1 / (o + 1);
      const ph = [Math.random() * 6, Math.random() * 6, Math.random() * 6];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const u = (x / w) * Math.PI * 2, v = (y / h) * Math.PI * 2;
        H[y * w + x] += amp * (Math.sin(u * f / 4 + ph[0] + Math.sin(v * 2 + ph[1])) + Math.sin(v * f / 4 + ph[2] + Math.cos(u * 3)));
      }
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const dx = H[y * w + (x + 1) % w] - H[y * w + (x - 1 + w) % w];
      const dy = H[((y + 1) % h) * w + x] - H[((y - 1 + h) % h) * w + x];
      img.data[i * 4] = 128 + dx * 40; img.data[i * 4 + 1] = 128 + dy * 40; img.data[i * 4 + 2] = 255; img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }), { srgb: false });

  // ---- distant skyline silhouettes (day colour + night windows) ----
  const sky = paint(2048, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    let x = 0;
    while (x < w) {
      const bw = 20 + Math.random() * 70, bh = 40 + Math.random() * 170;
      const shade = 70 + Math.random() * 40;
      g.fillStyle = `rgb(${shade},${shade + 8},${shade + 22})`;
      g.fillRect(x, h - bh, bw, bh);
      if (Math.random() < 0.15) { g.fillRect(x + bw / 2 - 2, h - bh - 30, 4, 30); }
      if (Math.random() < 0.08) { g.beginPath(); g.arc(x + bw / 2, h - bh, bw / 2, Math.PI, 0); g.fill(); }
      x += bw + Math.random() * 6;
    }
  });
  TEX.skyline = tex(sky, { repeat: true });
  TEX.skylineLit = tex(paint(2048, 256, (g, w, h) => {
    g.drawImage(sky, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = Math.random() < 0.8 ? '#ffd88a' : '#9fd3ff';
      g.fillRect(Math.random() * w, 40 + Math.random() * (h - 40), 2, 3);
    }
  }), { repeat: true });
}

