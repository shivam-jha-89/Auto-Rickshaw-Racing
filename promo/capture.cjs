// Scripted trailer capture for Rikshaw Rush.
// Usage: node promo/capture.cjs <puppeteer-core dir> <url> <frames dir> [width height]
// Virtualises time (rAF, performance.now, timers, CSS animations) so every frame is exactly 1/30 s apart.
const path = require('path');
const fs = require('fs');
const puppeteer = require(path.join(process.argv[2], 'node_modules', 'puppeteer-core'));
const URL = process.argv[3];
const OUT = process.argv[4];
const W = +(process.argv[5] || 1920), H = +(process.argv[6] || 1080);
const FPS = 30, DT = 1000 / FPS;
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) fs.unlinkSync(path.join(OUT, f));

const CLOCK = `(() => {
  const T = window.__T = { t: 0, raf: [], timers: [], id: 1 };
  performance.now = () => T.t;
  Date.now = (n => () => n + T.t)(Date.now());
  window.requestAnimationFrame = cb => { T.raf.push(cb); return T.id++; };
  window.cancelAnimationFrame = () => {};
  const add = (fn, ms, rep, args) => { const id = T.id++; T.timers.push({ id, fn, at: T.t + Math.max(0, ms || 0), rep: rep ? Math.max(1, ms || 0) : 0, args }); return id; };
  window.setTimeout = (fn, ms, ...a) => add(fn, ms, false, a);
  window.setInterval = (fn, ms, ...a) => add(fn, ms, true, a);
  window.clearTimeout = window.clearInterval = id => { T.timers = T.timers.filter(x => x.id !== id); };
  window.__step = ms => {
    const end = T.t + ms;
    for (let guard = 0; guard < 500; guard++) {
      T.timers.sort((a, b) => a.at - b.at);
      const n = T.timers[0];
      if (!n || n.at > end) break;
      T.t = Math.max(T.t, n.at);
      if (n.rep) n.at += n.rep; else T.timers.shift();
      try { typeof n.fn === 'function' ? n.fn(...(n.args || [])) : 0; } catch (e) { console.error(e); }
    }
    T.t = end;
    const list = T.raf.splice(0);
    for (const cb of list) { try { cb(T.t); } catch (e) { console.error(e); } }
    for (const a of document.getAnimations()) { try { a.pause(); a.currentTime = (a.currentTime || 0) + ms; } catch {} }
  };
})();`;

const SAVE = JSON.stringify({
  coins: 4200, high: 18450, tutorialDone: true, unlocked: ['old', 'sea', 'port', 'neon', 'mazar'], startDistrict: 'old',
  items: { headstart: 0, shieldStart: 0 }, radio: 0, spinDate: 'x',
  settings: { volume: 0, music: false, quality: 'high', shake: true, muted: true },
});

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: 'new',
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
  });
  const p = await browser.newPage();
  await p.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.evaluateOnNewDocument(CLOCK);
  await p.evaluateOnNewDocument(`try { localStorage.setItem('rikshaw-rush-save-v1', ${JSON.stringify(SAVE)}); } catch {}`);
  await p.goto(URL, { waitUntil: 'domcontentloaded' });

  // boot: step virtual time until the menu is up
  for (let i = 0; i < 600; i++) {
    await p.evaluate(ms => window.__step(ms), DT);
    const ok = await p.evaluate(() => !!window.__rr && window.__rr.state === 'menu');
    if (ok) break;
    await new Promise(r => setTimeout(r, 20));
  }
  // overlay layer for titles & captions
  await p.evaluate(() => {
    const st = document.createElement('style');
    st.textContent = `
      #promo { position: fixed; inset: 0; pointer-events: none; z-index: 50; font-family: "Baloo 2", system-ui, sans-serif; }
      #promo .cap { position: absolute; left: 64px; bottom: 150px; padding: 18px 28px 16px; border-radius: 22px; color: #fff;
        background: linear-gradient(180deg, rgba(255,255,255,.1), transparent 60%), rgba(14,10,24,.62); backdrop-filter: blur(14px);
        border: 1px solid rgba(255,255,255,.18); box-shadow: 0 18px 50px rgba(0,0,0,.35); opacity: 0; transform: translateY(16px); transition: all .45s cubic-bezier(.2,1,.3,1); }
      #promo .cap.on { opacity: 1; transform: none; }
      #promo .cap::before { content: ""; position: absolute; left: 0; top: 18px; bottom: 18px; width: 5px; border-radius: 5px; background: linear-gradient(#ffcf4a, #ff7a1a); }
      #promo .cap b { display: block; font-size: 46px; line-height: 1.05; font-weight: 800; }
      #promo .cap small { display: block; font: 600 22px Inter, system-ui, sans-serif; opacity: .82; margin-top: 6px; }
      #promo .card { position: absolute; inset: 0; display: grid; place-items: center; text-align: center; color: #fff; opacity: 0; transition: opacity .6s;
        background: radial-gradient(ellipse at center, rgba(14,10,24,.55), rgba(14,10,24,.9)); }
      #promo .card.on { opacity: 1; }
      #promo .card h1 { font-size: 150px; line-height: .9; font-weight: 800; margin: 0; letter-spacing: 1px; }
      #promo .card h1 span { color: #ffcf4a; }
      #promo .card p { font: 600 34px Inter, system-ui, sans-serif; opacity: .9; margin: 22px 0 0; }
      #promo .card .ur { font: 500 46px "Noto Nastaliq Urdu", serif; color: #7dffb0; margin-top: 10px; }
      #promo .chips { display: flex; gap: 12px; justify-content: center; margin-top: 30px; flex-wrap: wrap; }
      #promo .chips i { font: 700 20px Inter, sans-serif; font-style: normal; padding: 8px 18px; border-radius: 999px; background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.25); }
      #promo .url { display: inline-block; margin-top: 34px; font: 800 44px Inter, sans-serif; padding: 16px 34px; border-radius: 18px; background: linear-gradient(135deg, #0b8f3a, #16c45a); box-shadow: 0 12px 40px rgba(22,196,90,.45); }
      #promo .by { font: 600 24px Inter, sans-serif; opacity: .8; margin-top: 22px; }
      #promo .flash { position: absolute; inset: 0; background: #fff; opacity: 0; transition: opacity .25s; }
      #promo .flash.on { opacity: .85; transition: none; }`;
    document.head.appendChild(st);
    const d = document.createElement('div'); d.id = 'promo';
    d.innerHTML = `<div class="flash"></div>
      <div class="card" id="pc-title"><div><h1>RIKSHAW <span>RUSH</span></h1><div class="ur">رکشہ رش · کراچی</div><p>A 3D Karachi street racer that runs right in your browser</p></div></div>
      <div class="cap" id="pc-cap"><b></b><small></small></div>
      <div class="card" id="pc-end"><div><h1 style="font-size:110px">PLAY FREE <span>→</span></h1>
        <div class="url">rikshaw-rush.vercel.app</div>
        <div class="chips"><i>Three.js</i><i>GLSL</i><i>Web Audio</i><i>Blender</i><i>Clerk</i><i>PWA</i></div>
        <div class="by">Made in Pakistan 🇵🇰 · Muhammad Talha Khan</div></div></div>`;
    document.body.appendChild(d);
    document.getElementById('credits-bar')?.remove();
    window.__promo = {
      cap(t, s) { const c = document.getElementById('pc-cap'); c.querySelector('b').textContent = t; c.querySelector('small').textContent = s; c.classList.add('on'); },
      capOff() { document.getElementById('pc-cap').classList.remove('on'); },
      card(id, on) { document.getElementById(id).classList.toggle('on', on); },
      flash() { const f = document.querySelector('#promo .flash'); f.classList.add('on'); setTimeout(() => f.classList.remove('on'), 60); },
    };
    // autopilot: dodge hard obstacles, hop jumpables/breakers, drift toward coins
    window.__auto = { cd: 0, on: false };
    window.__drive = () => {
      const A = window.__auto, R = window.__rr.run, P = window.__rr.player;
      if (!A.on || !R.active) return;
      R.invuln = 99; R.lives = R.maxLives;
      A.cd = Math.max(0, A.cd - 1);
      const hard = l => R.obs.some(o => !o.dead && o.lane === l && o.hard && o.z > -30 && o.z < 3);
      const jumpy = l => R.obs.find(o => !o.dead && o.lane === l && (o.T.jump || o.T.bump || o.T.rough) && o.z > -8 && o.z < -2.5);
      if (A.cd === 0 && hard(P.lane)) {
        const opts = [P.lane - 1, P.lane + 1].filter(l => l >= 0 && l <= 2 && !hard(l));
        if (opts.length) { R.input(opts[0] > P.lane ? 'right' : 'left'); A.cd = 12; }
      }
      if (P.grounded && jumpy(P.lane)) R.input('jump');
    };
  });

  let frame = 0;
  const shot = async () => {
    await p.evaluate(ms => { window.__drive && window.__drive(); window.__step(ms); }, DT);
    await p.screenshot({ path: path.join(OUT, `f${String(frame++).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92 });
  };
  const hold = async sec => { for (let i = 0; i < Math.round(sec * FPS); i++) await shot(); };
  const js = (fn, ...a) => p.evaluate(fn, ...a);
  const startIn = async (district, tod, extra) => {
    await js((d, tod, extra) => {
      const R = window.__rr;
      R.save.startDistrict = d;
      R.applyStartDistrict();
      R.startRun();
      R.run.time = extra.time || 55;          // cruise at a lively speed
      R.run.speed = 18 + R.run.time * 0.2;
      R.env.tod = tod;
      R.run.weatherT = 9999;
      if (extra.rain) { R.weather.set(true, extra.rain); R.weather.level = 1; } else R.weather.clear();
      window.__auto.on = true;
      window.__promo.flash();
    }, district, tod, extra || {});
  };
  const press = a => js(a => window.__rr.run.input(a), a);
  const keepTod = tod => js(t => { window.__rr.env.tod = t; }, tod);

  // ---- 0: title over the menu ----
  await js(() => window.__promo.card('pc-title', true));
  await hold(2.6);
  await js(() => window.__promo.card('pc-title', false));
  await hold(0.9);

  // ---- 1: Burns Road, daytime ----
  await startIn('old', 0.45);
  await hold(0.6);
  await js(() => window.__promo.cap('Burns Road, Karachi', 'Procedural streets · zero asset files · built in code'));
  for (let i = 0; i < 6; i++) { await keepTod(0.45); await hold(0.5); if (i === 2) await press('jump'); if (i === 3) await press('jump'); }
  await press('nitro'); await js(() => { window.__rr.run.nitro = 1; window.__rr.run.input('nitro'); });
  await hold(2.2);
  await js(() => window.__promo.capOff());

  // ---- 2: Sea View at sunset ----
  await startIn('sea', 0.735);
  await hold(0.5);
  await js(() => window.__promo.cap('Sea View at sunset', 'Day/night cycle · animated sea · Blender-built models'));
  for (let i = 0; i < 10; i++) { await keepTod(0.735); await hold(0.5); }
  await js(() => window.__promo.capOff());

  // ---- 3: Kemari Harbour in the rain ----
  await startIn('port', 0.55, { rain: 'rain' });
  await hold(0.5);
  await js(() => window.__promo.cap('Kemari Harbour in the rain', 'Live weather · lightning · wet-road reflections'));
  for (let i = 0; i < 10; i++) { await keepTod(0.55); await hold(0.5); }
  await js(() => window.__promo.capOff());

  // ---- 4: Shahrah-e-Faisal, neon night + nitro ----
  await startIn('neon', 0.02, { time: 80 });
  await hold(0.5);
  await js(() => window.__promo.cap('Shahrah-e-Faisal by night', 'Neon + bloom · nitro smash · synthesized two-stroke engine'));
  await js(() => { window.__rr.run.nitro = 1; window.__rr.run.input('nitro'); });
  for (let i = 0; i < 12; i++) { await keepTod(0.02); await hold(0.5); if (i === 6) await js(() => { window.__rr.run.nitro = 1; window.__rr.run.nitroOn = false; window.__rr.run.input('nitro'); }); }
  await js(() => window.__promo.capOff());

  // ---- 5: end card ----
  await js(() => window.__promo.card('pc-end', true));
  await hold(3.6);

  console.log('frames', frame);
  await browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
