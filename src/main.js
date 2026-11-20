import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { DISTRICTS, SKINS, UPGRADES, HORNS, POWERUPS, TIPS, BOOSTS, TRAILS, SPIN, SPIN_COST, LINES, route, upgradeCost } from './config.js';
import { save, persist, resetSave } from './core/save.js';
import { audio } from './core/audio.js';
import { ui } from './core/ui.js';
import { radio, STATIONS } from './core/radio.js';
import { auth } from './core/auth.js';
import { initInput } from './core/input.js';
import { ensureDaily, describe, claim, applyRun, checkAchievements, ACHIEVEMENTS } from './core/challenges.js';
import { buildTextures } from './render/textures.js';
import { initMaterials, pick } from './render/kit.js';
import { loadCustomModels } from './render/gltf.js';
import { Environment } from './render/sky.js';
import { Weather } from './render/weather.js';
import { Particles } from './render/fx.js';
import { Post } from './render/post.js';
import { World } from './game/world.js';
import { Player } from './game/player.js';
import { Coins } from './game/coins.js';
import { Run } from './game/run.js';

const $ = id => document.getElementById(id);
const HORN_COST = [0, 300, 700, 1200];
const REVIVE_COST = 500;
const isTouch = matchMedia('(pointer: coarse)').matches;

let state = 'loading';
let returnTo = 'menu';
let renderer, scene, camera, env, weather, fx, post, world, player, coins, run;
let menuD = 0, orbit = 0, previewSkin = null, audioPrimed = false;
const committed = { coins: 0, stats: {}, entry: null };
const camPos = new THREE.Vector3(0, 4, 9), camLook = new THREE.Vector3(0, 1.3, -10);

boot();

async function boot() {
  ui.init();
  ui.initJuice();
  ui.show('loading');
  try { await Promise.race([document.fonts.load('500 40px "Noto Nastaliq Urdu"'), new Promise(r => setTimeout(r, 1800))]); } catch { /* offline */ }

  buildTextures(DISTRICTS);
  initMaterials();
  await loadCustomModels(); // optional Blender .glb overrides

  renderer = new THREE.WebGLRenderer({ canvas: $('game'), antialias: true, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, 1, 0.3, 700);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  env = new Environment(scene);
  weather = new Weather(scene);
  fx = new Particles(scene);
  post = new Post(renderer, scene, camera);
  applyStartDistrict();
  world = new World(scene);
  player = new Player(scene, skinById(save.skin));
  coins = new Coins(scene);
  run = new Run({ scene, world, player, coins, fx, weather, env, ui, camera, onEnd: onGameOver });

  applySettings();
  addEventListener('resize', resize);
  addEventListener('orientationchange', () => setTimeout(resize, 200));
  resize();

  initInput($('game'), onAction);
  bindUI();
  initInstall();
  ensureDaily();
  radio.onChange(() => ui.radio(radio.nowPlaying));
  radio.init();


  // ?demo — expose internals for the scripted trailer capture (no effect otherwise)
  if (new URLSearchParams(location.search).has('demo')) {
    window.__rr = { run, env, player, world, weather, save, startRun, goMenu, applyStartDistrict, ui, get state() { return state; } };
  }
  goMenu();
  renderer.compile(scene, camera);
  requestAnimationFrame(loop);

  // Clerk login (non-blocking — the game is playable as a guest immediately)
  $('userbar').classList.remove('hidden');
  if (auth.enabled) auth.init(onAuth).then(() => onAuth(auth.user));
  else onAuth(null);
}

/** True while a run is suspended behind a screen (pause, game over, or a sub-screen opened from those). */
const frozen = () => state === 'paused' || state === 'gameover' || (['settings', 'howto', 'garage', 'radio'].includes(state) && returnTo !== 'menu');
const skinById = id => SKINS.find(s => s.id === id) || SKINS[0];
const trailById = id => TRAILS.find(t => t.id === id) || TRAILS[0];

function applyStartDistrict() {
  const i = DISTRICTS.findIndex(d => d.id === save.startDistrict);
  route.offset = Math.max(0, i);
}

// ---------------------------------------------------------------- auth
function onAuth(user) {
  const name = auth.name;
  $('user-hello').textContent = !auth.enabled ? '' : user ? `Salam, ${name}! ☁️ Cloud save on` : 'Guest mode';
  $('btn-login').classList.toggle('hidden', !auth.enabled || !!user);
  $('btn-signup').classList.toggle('hidden', !auth.enabled || !!user);
  $('btn-profile').classList.toggle('hidden', !user);
  $('btn-logout').classList.toggle('hidden', !user);
  $('account-state').textContent = !auth.enabled ? 'Login unavailable' : user ? `${name} (cloud save)` : 'Guest — login to save online';
  if (state === 'menu') refreshMenu();
  player?.setSkin(skinById(save.skin));
}

// ---------------------------------------------------------------- settings
function applySettings() {
  const s = save.settings;
  audio.setVolume(s.volume);
  audio.setMusic(s.music);
  audio.setMuted(s.muted);
  const high = s.quality === 'high' || (s.quality === 'auto' && !isTouch);
  renderer.setPixelRatio(Math.min(devicePixelRatio, high ? 2 : 1.25));
  post.setEnabled(high);
  resize();
}

function resize() {
  if (!renderer) return;
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  framing();
  post.resize();
  fx.setScale(innerHeight * renderer.getPixelRatio());
  document.body.classList.toggle('portrait', innerHeight > innerWidth);
}

/** Shift the 3D view so the rickshaw isn't hidden behind side panels on menu screens. */
function framing() {
  const w = innerWidth, h = innerHeight;
  const wide = camera.aspect > 1.2;
  if (state === 'menu' && wide) camera.setViewOffset(w, h, -w * 0.18, 0, w, h);
  else if (state === 'garage' && wide) camera.setViewOffset(w, h, w * 0.2, 0, w, h);
  else if ((state === 'menu' || state === 'garage') && !wide) camera.setViewOffset(w, h, 0, h * 0.3, w, h);
  else camera.clearViewOffset();
  camera.updateProjectionMatrix();
}

// ---------------------------------------------------------------- states
function setState(s) { state = s; framing(); document.body.classList.toggle('on-menu', s === 'menu'); }

// ---------------------------------------------------------------- install (PWA)
const isStandalone = () => matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches || navigator.standalone === true;
function detectPlatform() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  if (/Firefox\//.test(ua) || (/Safari\//.test(ua) && !/Chrome|Chromium|Edg\//.test(ua))) return 'unsupported';
  return 'desktop';
}
const INSTALL_STEPS = {
  ios: 'Safari mein <b>Share ⬆️</b> dabao, phir <b>Add to Home Screen ➕</b>.',
  android: 'Browser menu <b>⋮</b> kholo aur <b>Install app</b> (ya <b>Add to Home screen</b>) dabao.',
  desktop: 'Address bar ke right mein <b>install icon 🖥️⬇</b> dabao, ya menu <b>⋯ → Apps → Install Rikshaw Rush</b>. (InPrivate/Incognito window mein install nahi hota.)',
  unsupported: 'Is browser mein install nahi hota. Computer pe <b>Chrome</b> ya <b>Edge</b>, ya iPhone pe <b>Safari</b> use karo.',
};
function initInstall() {
  const card = $('install-card'), btn = $('btn-install'), sub = $('install-sub');
  const platform = detectPlatform();
  const DEFAULT_SUB = 'Home screen ya desktop pe — khulta foran hai, app jaisa chalta hai, offline bhi. Bilkul free.';
  card.classList.remove('hidden');
  const render = () => {
    if (isStandalone() || card.dataset.installed) {
      card.classList.add('done'); btn.textContent = 'Installed ✓'; btn.disabled = true;
      sub.textContent = 'Shabash bawa! Home screen se seedha khelo — offline bhi.';
    } else {
      card.classList.remove('done'); btn.textContent = 'Install'; btn.disabled = false;
      if (!card.dataset.steps) sub.textContent = DEFAULT_SUB;
    }
  };
  addEventListener('install-available', render);
  addEventListener('appinstalled', () => { window.__installPrompt = null; card.dataset.installed = '1'; render(); ui.confetti(90); audio.fare(); });
  btn.addEventListener('click', async () => {
    const p = window.__installPrompt;
    if (!p) { card.dataset.steps = '1'; sub.innerHTML = INSTALL_STEPS[platform]; return; } // no native prompt — show how instead
    p.prompt();
    const { outcome } = await p.userChoice;
    window.__installPrompt = null;
    if (outcome === 'accepted') { card.dataset.installed = '1'; render(); }
  });
  render();
}

function refreshMenu() {
  $('menu-high').textContent = save.high.toLocaleString();
  $('menu-coins').textContent = save.coins.toLocaleString();
  const d = ensureDaily();
  $('badge-ch').classList.toggle('hidden', !d.list.some(c => c.done && !c.claimed));
  $('badge-spin').classList.toggle('hidden', save.spinDate === today());
  if (!save.unlocked.includes(save.startDistrict)) save.startDistrict = 'old';
  const di = DISTRICTS.find(x => x.id === save.startDistrict);
  $('start-name').textContent = di.name;
}

function goMenu() {
  if (previewSkin) revertPreview();
  setState('menu');
  returnTo = 'menu';
  run.clearAll();
  run.active = false;
  weather.clear();
  ui.hud(false);
  ui.fever(false);
  ui.race(false);
  ui.clearTransient();
  ui.show('menu');
  $('menu-tip').textContent = pick(TIPS);
  refreshMenu();
  player.reset();
  player.model.passenger.visible = false;
  applyStartDistrict();
  world.reset(menuD);
  env.tod = 0.735;
  audio.setMode('calm');
  audio.engine(6, 0, !!audio.ctx);
  radio.pause(false);
}

function startRun() {
  if (previewSkin) revertPreview();
  primeAudio();
  applyStartDistrict();
  committed.coins = 0; committed.stats = {}; committed.entry = null;
  setState('playing');
  ui.hideScreens();
  ui.clearTransient();
  ui.hud(true);
  ui.touch(isTouch);
  ui.race(false);
  ui.fever(false);
  run.start();
  ui.boosts(7, save.items);
  if (!save.tutorialDone) {
    setTimeout(() => ui.toast(isTouch ? 'Swipe ← → lane · swipe ↑ jump · ⚡ nitro · tap horn' : '← → lane badlo · ↑ jump · Shift nitro · H horn', 4000), 600);
    save.tutorialDone = true; persist();
  }
}

function primeAudio() {
  audio.init();
  if (!audioPrimed && audio.ctx) { audioPrimed = true; radio.apply(); }
}

function pause() {
  if (state !== 'playing') return;
  setState('paused');
  ui.show('pause');
  audio.engine(0, 0, false);
  audio.setMode('calm');
}
function resume() {
  if (state !== 'paused') return;
  setState('playing');
  ui.hideScreens();
  audio.setMode('drive');
}

function commitRun() {
  const st = run.stats;
  const delta = {};
  for (const k of Object.keys(st)) delta[k] = (st[k] || 0) - (committed.stats[k] || 0);
  const coinsDelta = run.coinsRun - committed.coins;
  save.coins += coinsDelta;
  const score = Math.floor(run.score);
  const isHigh = score > save.high;
  save.high = Math.max(save.high, score);
  if (committed.entry) { committed.entry.score = score; committed.entry.distance = Math.floor(run.D); }
  else {
    committed.entry = { score, distance: Math.floor(run.D), date: new Date().toLocaleDateString(), name: auth.name || 'Guest' };
    save.leaderboard.push(committed.entry);
    save.stats.runs++;
  }
  save.leaderboard.sort((a, b) => b.score - a.score);
  save.leaderboard = save.leaderboard.slice(0, 5);
  const S = save.stats;
  S.distance += delta.distance; S.coins += coinsDelta; S.fares += delta.fares; S.smash += delta.smash;
  S.tricks += delta.tricks; S.nearMiss += delta.nearMiss; S.powerups += delta.powerups; S.gates += delta.gates;
  S.bestDistance = Math.max(S.bestDistance, st.distance);
  S.maxSpeed = Math.max(S.maxSpeed, st.maxSpeed);
  save.rivalsBeaten += delta.rivals || 0;
  applyRun(st, delta);
  committed.coins = run.coinsRun;
  committed.stats = { ...st };
  persist();
  return { isHigh, achievements: checkAchievements() };
}

function onGameOver() {
  setState('gameover');
  const { isHigh, achievements } = commitRun();
  ui.hud(false);
  ui.mission(null);
  ui.fever(false);
  ui.race(false);
  ui.show('gameover');
  const st = run.stats;
  ui.countUp($('go-score'), Math.floor(run.score));
  $('go-new').classList.toggle('hidden', !isHigh);
  if (isHigh) setTimeout(() => ui.confetti(120), 400);
  $('go-distance').textContent = `${Math.floor(run.D).toLocaleString()} m`;
  $('go-coins').textContent = `Rs ${run.coinsRun.toLocaleString()}`;
  $('go-fares').textContent = `${st.fares} (Rs ${st.faresRs})`;
  $('go-near').textContent = st.nearMiss;
  $('go-tricks').textContent = st.tricks;
  $('go-smash').textContent = st.smash;
  $('go-rivals').textContent = st.rivals;
  $('go-letters').textContent = `${save.letters.got}/7`;
  $('go-speed').textContent = `${Math.round(st.maxSpeed * 3.6)} km/h`;
  $('go-line').textContent = pick(LINES.gameOver);
  $('go-unlocks').innerHTML = achievements.map(a => `<div class="unlock">🏅 ${a.name} <small>${a.desc}</small></div>`).join('');
  $('btn-revive').classList.toggle('hidden', run.revived || save.coins < REVIVE_COST);
  $('revive-cost').textContent = REVIVE_COST;
}

function revive() {
  if (run.revived || save.coins < REVIVE_COST) return;
  save.coins -= REVIVE_COST; persist();
  setState('playing');
  ui.hideScreens();
  ui.hud(true);
  run.revive();
  audio.powerup();
}

async function shareScore() {
  const text = `🛺 Rikshaw Rush — Karachi! Mera score ${Math.floor(run.score).toLocaleString()} aur ${Math.floor(run.D).toLocaleString()} m. Tum beat kar sakte ho? 😎`;
  const url = location.origin;
  try {
    if (navigator.share) await navigator.share({ title: 'Rikshaw Rush', text, url });
    else { await navigator.clipboard.writeText(`${text} ${url}`); ui.toast('Score copy ho gaya — share karo! 📋', 1800); }
  } catch { /* cancelled */ }
}

// ---------------------------------------------------------------- input
function onAction(a) {
  if (a === 'any') { primeAudio(); return; }
  if (a === 'mute') {
    save.settings.muted = !save.settings.muted; persist(); audio.setMuted(save.settings.muted);
    ui.toast(save.settings.muted ? '🔇 Muted' : '🔊 Sound on', 900);
    return;
  }
  if (a === 'radio') { radio.next(1); ui.toast(radio.nowPlaying, 1300); return; }
  if (a === 'debug') { $('debug').classList.toggle('hidden'); return; }
  if (a === 'pause') {
    if (state === 'playing') pause();
    else if (state === 'paused') resume();
    return;
  }
  if (state === 'playing') run.input(a);
  else if (state === 'menu' && a === 'jump') startRun();
  else if (state === 'menu' && a === 'horn') audio.horn(save.horn);
}

function bindUI() {
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    primeAudio(); audio.click();
    const act = b.dataset.act;
    if (act === 'play') startRun();
    else if (act === 'menu' || act === 'quit') {
      if (state === 'paused') { run.active = false; commitRun(); }
      goMenu();
    }
    else if (act === 'resume') resume();
    else if (act === 'garage') openGarage();
    else if (act === 'challenges') openChallenges();
    else if (act === 'settings') openSettings();
    else if (act === 'spin') openSpin();
    else if (act === 'radio') openRadio();
    else if (act === 'about') { returnTo = state; setState('about'); ui.show('about'); }
    else if (act === 'howto') { returnTo = state; setState('howto'); ui.show('howto'); }
    else if (act === 'share') shareScore();
    else if (act === 'back') back();
  });
  $('btn-pause').addEventListener('click', e => { e.stopPropagation(); pause(); });
  $('btn-revive').addEventListener('click', revive);
  $('btn-horn').addEventListener('pointerdown', e => { e.preventDefault(); run.input('horn'); });
  $('btn-nitro').addEventListener('pointerdown', e => { e.preventDefault(); run.input('nitro'); });
  $('hud-radio').addEventListener('click', e => { e.stopPropagation(); primeAudio(); radio.next(1); });
  $('hud-boosts').addEventListener('pointerdown', e => {
    const b = e.target.closest('[data-boost]');
    if (!b) return;
    e.preventDefault();
    run.useBoost(b.dataset.boost);
  });

  // start location picker
  const stepStart = dir => {
    const list = DISTRICTS.filter(d => save.unlocked.includes(d.id));
    let i = list.findIndex(d => d.id === save.startDistrict);
    i = (i + dir + list.length) % list.length;
    save.startDistrict = list[i].id; persist();
    applyStartDistrict();
    world.reset(menuD);
    refreshMenu();
    if (list.length === 1) ui.toast('Naye districts gate cross kar ke unlock karo! 🔒', 1600);
  };
  $('start-prev').addEventListener('click', () => stepStart(-1));
  $('start-next').addEventListener('click', () => stepStart(1));

  // auth
  $('btn-login').addEventListener('click', () => auth.openSignIn());
  $('btn-signup').addEventListener('click', () => auth.openSignUp());
  $('btn-profile').addEventListener('click', () => auth.openProfile());
  $('btn-logout').addEventListener('click', async () => { await auth.signOut(); ui.toast('Logout ho gaye — Allah hafiz!', 1400); });

  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x === t));
    renderGarage(t.dataset.tab);
  }));

  // settings
  const s = save.settings;
  $('set-volume').addEventListener('input', e => { s.volume = +e.target.value; audio.setVolume(s.volume); persist(); });
  $('set-music').addEventListener('change', e => { s.music = e.target.checked; audio.setMusic(s.music); persist(); });
  $('set-shake').addEventListener('change', e => { s.shake = e.target.checked; persist(); });
  $('set-quality').addEventListener('change', e => { s.quality = e.target.value; persist(); applySettings(); });
  $('btn-reset').addEventListener('click', () => {
    if (!confirm('Saari progress, coins aur upgrades delete ho jayein ge. Pakka?')) return;
    resetSave(); ensureDaily(); applySettings();
    player.setSkin(skinById(save.skin));
    ui.toast('Progress reset', 1500);
    openSettings();
  });

  // radio
  $('song-input').addEventListener('change', async e => {
    const files = [...e.target.files];
    e.target.value = '';
    if (!files.length) return;
    ui.toast('Gaane save ho rahe hain…', 1200);
    await radio.addFiles(files);
    renderRadio();
    ui.toast(`${files.length} gaane add ho gaye 🎶`, 1600);
  });

  $('btn-spin').addEventListener('click', doSpin);

  document.addEventListener('visibilitychange', () => { if (document.hidden) { pause(); radio.pause(true); } else if (state !== 'paused') radio.pause(false); });
}

function back() {
  if (state === 'garage' && previewSkin) revertPreview();
  if (returnTo === 'paused') { setState('paused'); ui.show('pause'); return; }
  if (returnTo === 'gameover') { setState('gameover'); ui.show('gameover'); $('btn-revive').classList.toggle('hidden', run.revived || save.coins < REVIVE_COST); return; }
  goMenu();
}

// ---------------------------------------------------------------- garage
function openGarage() {
  returnTo = state === 'gameover' ? 'gameover' : 'menu';
  setState('garage');
  ui.show('garage');
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x.dataset.tab === 'upgrades'));
  renderGarage('upgrades');
}

function revertPreview() {
  previewSkin = null;
  player.setSkin(skinById(save.skin));
}

const money = n => `Rs ${n.toLocaleString()}`;
function buyBtn(attr, cost, owned, equipped) {
  if (equipped) return '<button class="btn sm done" disabled>✓ Equipped</button>';
  if (owned) return `<button class="btn sm" ${attr}>Equip</button>`;
  return `<button class="btn sm ${save.coins >= cost ? 'gold' : 'locked'}" ${attr}>${money(cost)}</button>`;
}
function spend(cost) {
  if (save.coins < cost) { ui.toast('Paise kam hain bawa! Aur sawariyan utha 💸', 1500); return false; }
  save.coins -= cost; audio.buy(); return true;
}

function renderGarage(tab) {
  ui.countUp($('garage-coins'), save.coins, 400);
  const list = $('garage-list');
  const hex = n => '#' + n.toString(16).padStart(6, '0');
  let html = '';
  if (tab === 'upgrades') {
    html = UPGRADES.map(u => {
      const lvl = save.upgrades[u.id] || 0, max = lvl >= u.max, cost = upgradeCost(u, lvl);
      const pips = Array.from({ length: u.max }, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('');
      return `<div class="card"><div class="ic">${u.icon}</div><div class="info"><b>${u.name}</b><small>${u.desc}</small><div class="pips">${pips}</div></div>
        <button class="btn sm ${max ? 'done' : save.coins >= cost ? 'gold' : 'locked'}" data-up="${u.id}" ${max ? 'disabled' : ''}>${max ? 'MAX' : money(cost)}</button></div>`;
    }).join('');
  } else if (tab === 'paint') {
    html = SKINS.map(s => {
      const sw = `<div class="swatch" style="background:linear-gradient(135deg, ${hex(s.body)} 0 55%, ${hex(s.trim)} 55% 70%, ${hex(s.canopy)} 70%)"></div>`;
      return `<div class="card ${previewSkin === s.id ? 'sel' : ''}" data-preview="${s.id}">${sw}<div class="info"><b>${s.name}</b><small>${s.glow ? '✨ Neon underglow' : save.skins.includes(s.id) ? 'Owned' : 'Tap to preview'}</small></div>${buyBtn(`data-skin="${s.id}"`, s.cost, save.skins.includes(s.id), save.skin === s.id)}</div>`;
    }).join('');
  } else if (tab === 'horn') {
    html = HORNS.map((h, i) => `<div class="card"><div class="ic">📯</div><div class="info"><b>${h.name}</b><small><a href="#" data-try="${i}">▶ Suno</a></small></div>${buyBtn(`data-horn="${i}"`, HORN_COST[i], save.horns.includes(i), save.horn === i)}</div>`).join('');
  } else if (tab === 'trail') {
    html = TRAILS.map(t => {
      const sw = t.colors.length ? `<div class="swatch trail-sw" style="background:linear-gradient(90deg, ${t.colors.map(hex).join(',')})"></div>` : '<div class="ic">🚫</div>';
      return `<div class="card" data-trail-try="${t.id}">${sw}<div class="info"><b>${t.name}</b><small>${t.id === 'none' ? 'Simple aur saaf' : 'Animated trail — tap to preview'}</small></div>${buyBtn(`data-trail="${t.id}"`, t.cost, save.trails.includes(t.id), save.trail === t.id)}</div>`;
    }).join('');
  } else {
    html = BOOSTS.map(b => `<div class="card"><div class="ic">${b.icon}</div><div class="info"><b>${b.name} <small>(x${save.items[b.id] || 0})</small></b><small>${b.desc} · key ${b.key}</small></div><button class="btn sm ${save.coins >= b.cost ? 'gold' : 'locked'}" data-boost-buy="${b.id}">${money(b.cost)}</button></div>`).join('');
  }
  list.innerHTML = html;
  list.querySelectorAll('.card').forEach((c, i) => c.style.setProperty('--i', i));

  list.querySelectorAll('[data-up]').forEach(b => b.addEventListener('click', () => {
    const u = UPGRADES.find(x => x.id === b.dataset.up);
    const lvl = save.upgrades[u.id] || 0;
    if (lvl >= u.max || !spend(upgradeCost(u, lvl))) return;
    save.upgrades[u.id] = lvl + 1; persist();
    renderGarage('upgrades');
  }));
  list.querySelectorAll('[data-preview]').forEach(c => c.addEventListener('click', e => {
    if (e.target.closest('button')) return;
    previewSkin = c.dataset.preview;
    player.setSkin(skinById(previewSkin));
    renderGarage('paint');
  }));
  list.querySelectorAll('[data-skin]').forEach(b => b.addEventListener('click', () => {
    const s = skinById(b.dataset.skin);
    if (!save.skins.includes(s.id)) { if (!spend(s.cost)) return; save.skins.push(s.id); }
    save.skin = s.id; persist();
    previewSkin = null;
    player.setSkin(s);
    renderGarage('paint');
  }));
  list.querySelectorAll('[data-try]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); primeAudio(); audio.horn(+a.dataset.try); }));
  list.querySelectorAll('[data-horn]').forEach(b => b.addEventListener('click', () => {
    const i = +b.dataset.horn;
    if (!save.horns.includes(i)) { if (!spend(HORN_COST[i])) return; save.horns.push(i); }
    save.horn = i; persist(); audio.horn(i);
    renderGarage('horn');
  }));
  list.querySelectorAll('[data-trail-try]').forEach(c => c.addEventListener('click', e => {
    if (e.target.closest('button')) return;
    trailPreview = 2.5; trailPreviewId = c.dataset.trailTry;
  }));
  list.querySelectorAll('[data-trail]').forEach(b => b.addEventListener('click', () => {
    const t = trailById(b.dataset.trail);
    if (!save.trails.includes(t.id)) { if (!spend(t.cost)) return; save.trails.push(t.id); }
    save.trail = t.id; persist();
    trailPreview = 2.5; trailPreviewId = t.id;
    renderGarage('trail');
  }));
  list.querySelectorAll('[data-boost-buy]').forEach(b => b.addEventListener('click', () => {
    const def = BOOSTS.find(x => x.id === b.dataset.boostBuy);
    if (!spend(def.cost)) return;
    save.items[def.id] = (save.items[def.id] || 0) + 1; persist();
    renderGarage('boosts');
  }));
}

// ---------------------------------------------------------------- spin wheel
const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
let wheelAngle = 0, spinning = false;
function openSpin() {
  returnTo = 'menu';
  setState('spin');
  ui.show('spin');
  const n = SPIN.length, seg = 360 / n;
  const wheel = $('wheel');
  wheel.style.background = `conic-gradient(${SPIN.map((p, i) => `${p.color} ${i * seg}deg ${(i + 1) * seg}deg`).join(',')})`;
  wheel.innerHTML = SPIN.map((p, i) => `<span style="transform:rotate(${i * seg + seg / 2}deg)"><b>${p.label}</b></span>`).join('') + '<div class="hub">🛺</div>';
  updateSpinButton();
  $('spin-result').textContent = '';
}
function updateSpinButton() {
  const free = save.spinDate !== today();
  $('btn-spin').textContent = free ? '🎡 FREE Spin karo!' : `🎡 Ek aur — Rs ${SPIN_COST}`;
  $('spin-note').textContent = free ? 'Roz ek spin free — kismat aazma bawa!' : 'Aaj ka free spin ho gaya. Kal phir aana — ya coins se spin karo!';
}
function doSpin() {
  if (spinning) return;
  const free = save.spinDate !== today();
  if (!free && !spend(SPIN_COST)) return;
  if (free) save.spinDate = today();
  persist();
  spinning = true;
  const total = SPIN.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total, idx = 0;
  for (let i = 0; i < SPIN.length; i++) { if ((r -= SPIN[i].weight) < 0) { idx = i; break; } }
  const seg = 360 / SPIN.length;
  const target = 360 - (idx * seg + seg / 2);
  wheelAngle += 360 * 6 + ((target - (wheelAngle % 360)) + 360) % 360;
  const wheel = $('wheel');
  wheel.style.transform = `rotate(${wheelAngle}deg)`;
  // tick sounds while spinning
  let ticks = 0;
  const tick = setInterval(() => { audio.tone(900 + Math.random() * 200, 0.03, { type: 'square', vol: 0.04 }); if (++ticks > 30) clearInterval(tick); }, 120);
  setTimeout(() => {
    clearInterval(tick);
    const p = SPIN[idx];
    if (p.type === 'coins') save.coins += p.amount;
    else save.items[p.item] = (save.items[p.item] || 0) + p.amount;
    persist();
    $('spin-result').innerHTML = `🎉 Mubarak ho! <b>${p.label}${p.type === 'item' ? ` x${p.amount}` : ''}</b>`;
    ui.confetti(p.amount >= 1000 ? 140 : 70);
    audio.fare();
    spinning = false;
    updateSpinButton();
  }, 4200);
}

// ---------------------------------------------------------------- radio screen
function openRadio() {
  returnTo = state === 'paused' ? 'paused' : 'menu';
  setState('radio');
  ui.show('radio');
  renderRadio();
}
function renderRadio() {
  $('station-list').innerHTML = STATIONS.map((st, i) => `<div class="card station ${save.radio === i ? 'sel' : ''}" data-station="${i}"><div class="ic">${['🥁', '🎤', '🌊', '🎵', '🔇'][i]}</div><div class="info"><b>${st.name}</b><small>${st.desc}</small></div>${save.radio === i ? '<span class="eq"><i></i><i></i><i></i><i></i></span>' : ''}</div>`).join('');
  $('station-list').querySelectorAll('[data-station]').forEach(c => c.addEventListener('click', () => { primeAudio(); radio.set(+c.dataset.station); renderRadio(); }));
  $('song-list').innerHTML = radio.songs.length
    ? radio.songs.map((sg, i) => `<div class="card"><div class="ic">${radio.station.id === 'playlist' && radio.index === i ? '▶' : '🎶'}</div><div class="info"><b>${sg.name}</b></div><button class="btn sm" data-play="${i}">Play</button><button class="btn sm danger" data-del="${sg.id}">✕</button></div>`).join('')
    : '<div class="card empty"><div class="info"><small>Abhi koi gaana nahi. Apne device se MP3 / M4A add karo — sirf aap ke browser mein rehte hain.</small></div></div>';
  $('song-list').querySelectorAll('[data-play]').forEach(b => b.addEventListener('click', () => { primeAudio(); save.radio = STATIONS.findIndex(s => s.id === 'playlist'); persist(); radio.apply(); radio.playSong(+b.dataset.play); setTimeout(renderRadio, 100); }));
  $('song-list').querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => { await radio.remove(+b.dataset.del); renderRadio(); }));
}

// ---------------------------------------------------------------- challenges
function openChallenges() {
  returnTo = 'menu';
  setState('challenges');
  ui.show('challenges');
  renderChallenges();
}
function renderChallenges() {
  const d = ensureDaily();
  const now = new Date(), mid = new Date(now); mid.setHours(24, 0, 0, 0);
  const hrs = Math.floor((mid - now) / 3600000), mins = Math.floor(((mid - now) % 3600000) / 60000);
  $('ch-reset').textContent = `— naye challenges ${hrs}h ${mins}m mein`;
  $('daily-list').innerHTML = d.list.map((c, i) => {
    const info = describe(c);
    const frac = Math.min(1, c.progress / info.target);
    const btn = c.claimed ? '<button class="btn sm done" disabled>✓ Claimed</button>'
      : c.done ? `<button class="btn sm gold" data-claim="${i}">Claim Rs ${info.reward}</button>`
        : `<button class="btn sm locked" disabled>Rs ${info.reward}</button>`;
    return `<div class="card" style="--i:${i}"><div class="ic">${['🥉', '🥈', '🥇'][c.tier]}</div><div class="info"><b>${info.text}</b>
      <div class="prog"><i style="width:${frac * 100}%"></i></div><small>${Math.floor(c.progress).toLocaleString()} / ${info.target.toLocaleString()}${info.per === 'run' ? ' (best run)' : ''}</small></div>${btn}</div>`;
  }).join('');
  $('daily-list').querySelectorAll('[data-claim]').forEach(b => b.addEventListener('click', () => {
    const r = claim(+b.dataset.claim);
    if (r) { audio.buy(); ui.toast(`+Rs ${r} 🎉`, 1400); ui.confetti(50); }
    renderChallenges();
  }));
  $('ach-list').innerHTML = ACHIEVEMENTS.map(a => {
    const got = save.achievements.includes(a.id);
    return `<div class="ach ${got ? 'got' : ''}" title="${a.desc}"><span>${got ? '🏅' : '🔒'}</span><b>${a.name}</b><small>${a.desc}</small></div>`;
  }).join('');
  $('leaderboard').innerHTML = save.leaderboard.length
    ? save.leaderboard.map(e => `<li><b>${e.score.toLocaleString()}</b><span>${e.name ? e.name + ' · ' : ''}${e.distance.toLocaleString()} m · ${e.date}</span></li>`).join('')
    : '<li class="empty">Abhi koi run nahi — chalo shuru karo bawa!</li>';
}

// ---------------------------------------------------------------- settings screen
function openSettings() {
  returnTo = state === 'paused' ? 'paused' : 'menu';
  setState('settings');
  ui.show('settings');
  const s = save.settings;
  $('set-volume').value = s.volume;
  $('set-music').checked = s.music;
  $('set-shake').checked = s.shake;
  $('set-quality').value = s.quality;
}

// ---------------------------------------------------------------- trails
let trailPreview = 0, trailPreviewId = null;
function emitTrail(dt) {
  const id = trailPreview > 0 ? trailPreviewId : save.trail;
  const t = trailById(id);
  if (!t.colors.length) return;
  const playing = state === 'playing';
  if (!playing && trailPreview <= 0) return;
  const p = player;
  const n = playing ? 2 : 3;
  for (let i = 0; i < n; i++) {
    fx.emit(p.x + (Math.random() - 0.5) * 1.2, p.y + 0.35 + Math.random() * 0.3, 1.6, 1, {
      colors: t.colors, speed: 0.6, up: id === 'neon' ? 1.2 : 0.4, life: id === 'neon' ? 0.9 : 0.55,
      size: id === 'gold' ? 0.22 : 0.32, grav: id === 'sparks' ? 6 : -0.5, drag: 2,
    });
  }
}

// ---------------------------------------------------------------- loop
let last = performance.now(), fpsT = 0, frames = 0, fps = 0;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  frames++; fpsT += dt;
  if (fpsT >= 0.5) { fps = Math.round(frames / fpsT); frames = 0; fpsT = 0; }

  let worldSpeed = 0;
  if (state === 'playing') {
    run.update(dt);
    world.update(run.D);
    worldSpeed = run.speed;
    const powers = ['magnet', 'shield', 'double'].filter(k => run.power[k] > 0).map(k => {
      const def = POWERUPS[k];
      const total = def.base + def.per * (save.upgrades[k] || 0);
      return { id: k, icon: { magnet: '🧲', shield: '🛡️', double: '2x' }[k], frac: run.power[k] / total };
    });
    ui.update(run, powers);
  } else if (frozen()) {
    // frozen world
  } else {
    // attract mode behind menus: rickshaw idles along an endless evening road
    const sp = state === 'garage' || state === 'spin' ? 0 : 7;
    menuD += sp * dt;
    world.update(menuD);
    player.lane = 1;
    player.update(dt, sp, 0);
    worldSpeed = sp;
    env.tod = 0.735 + Math.sin(now * 0.00005) * 0.02;
  }
  trailPreview = Math.max(0, trailPreview - dt);
  if (!frozen()) emitTrail(dt);

  env.update(camera, weather.rain, dt, weather.dust);
  weather.update(frozen() ? 0 : dt, worldSpeed, camera.position.x, env.night);
  fx.update(state === 'paused' ? 0 : dt, frozen() ? 0 : worldSpeed);
  player.model.head.intensity = env.night * 40 + weather.level * 10;
  updateCamera(dt);
  post.render(env.night, (run.nitroOn || run.headstart > 0 || run.fever > 0) && state === 'playing' ? 1 : 0);

  if (!$('debug').classList.contains('hidden')) {
    const info = renderer.info.render;
    $('debug').textContent = `fps ${fps}\ncalls ${info.calls}\ntris ${info.triangles}\nobs ${run.obs.length}\nD ${Math.floor(run.D || menuD)}\ntod ${env.tod.toFixed(2)}`;
  }
}

function updateCamera(dt) {
  const p = player;
  let fov = 60;
  if (state === 'playing' || frozen()) {
    const sf = Math.max(0, (run.speed - 18) / 28);
    const portrait = innerHeight > innerWidth;
    fov = (portrait ? 72 : 60) + sf * 9 + (run.nitroOn || run.headstart > 0 ? 8 : 0);
    camPos.set(p.x * 0.55, (portrait ? 5.2 : 4.2) + p.y * 0.45, (portrait ? 9.4 : 8.4) - sf * 0.6);
    camLook.set(p.x * 0.8, 1.3 + p.y * 0.55, -14);
    camera.position.lerp(camPos, Math.min(1, dt * 6));
    const sh = save.settings.shake ? run.shake : 0;
    if (sh > 0 && state === 'playing') {
      camera.position.x += (Math.random() - 0.5) * sh * 0.5;
      camera.position.y += (Math.random() - 0.5) * sh * 0.4;
    }
    camera.lookAt(camLook);
  } else {
    // garage: slow turntable orbit; menus: cinematic 3/4 view from behind so the street opens up ahead
    orbit += dt * (state === 'garage' ? 0.35 : 0.1);
    if (state === 'garage') {
      camPos.set(Math.sin(orbit) * 6.2, 2.6, Math.cos(orbit) * 6.2);
      camLook.set(0, 1.1, 0);
    } else {
      // stay above the road (|x| < 3.6) so the camera never clips into shop fronts
      camPos.set(2.4 + Math.sin(orbit) * 1.1, 3.3 + Math.sin(orbit * 0.7) * 0.3, 8.5 + Math.cos(orbit * 0.8) * 0.8);
      camLook.set(-0.6, 1.3, -7);
    }
    camera.position.lerp(camPos, Math.min(1, dt * 3));
    camera.lookAt(camLook);
  }
  if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 4); camera.updateProjectionMatrix(); }
}
