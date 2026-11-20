// Fully synthesised audio: engine, SFX, rain, thunder and a procedural dhol/tumbi soundtrack.
// No audio files — everything is built from oscillators, filters and a noise buffer.

const SCALE = [0, 2, 4, 5, 7, 9, 10, 12, 14, 16]; // Khamaj-like
const ROOT = 146.83; // D3
const hz = semi => ROOT * Math.pow(2, semi / 12);

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.volume = 0.8;
    this.musicOn = true;
    this.muted = false;
    this.mode = 'calm'; // calm | drive | off
    this.step = 0;
    this.nextNote = 0;
    this.phrase = [];
    this.intensity = 0;
    this.style = 'dhol';
  }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const c = (this.ctx = new AC());
    this.master = c.createGain();
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    this.master.connect(comp).connect(c.destination);
    this.sfx = c.createGain(); this.sfx.connect(this.master);
    this.music = c.createGain(); this.music.gain.value = 0.55; this.music.connect(this.master);
    this.applyVolume();

    // shared white-noise buffer
    const len = c.sampleRate * 2;
    this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    this.buildEngine();
    this.buildRain();
    this.newPhrase();
    this.nextNote = c.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 25);
  }

  applyVolume() {
    if (!this.master) return;
    const v = this.muted ? 0 : this.volume;
    this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
    this.music.gain.setTargetAtTime(this.musicOn ? 0.5 : 0, this.ctx.currentTime, 0.1);
  }
  setVolume(v) { this.volume = v; this.applyVolume(); }
  setMusic(on) { this.musicOn = on; this.applyVolume(); }
  setMuted(m) { this.muted = m; this.applyVolume(); }
  setMode(m) { this.mode = m; }

  // ---------- primitives ----------
  tone(freq, dur, { type = 'sine', vol = 0.2, to = 0, when = 0, attack = 0.008, dest } = {}) {
    if (!this.ctx) return;
    const c = this.ctx, t = when || c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest || this.sfx);
    o.start(t); o.stop(t + dur + 0.05);
  }
  noise(dur, { vol = 0.3, type = 'lowpass', freq = 1000, to = 0, q = 1, when = 0, dest, attack = 0.005 } = {}) {
    if (!this.ctx) return;
    const c = this.ctx, t = when || c.currentTime;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf;
    s.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = c.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(freq, t);
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(dest || this.sfx);
    s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }

  // ---------- engine ----------
  buildEngine() {
    const c = this.ctx;
    this.gear = 1; this.lastSpeed = 0; this.shiftT = 0;
    // rasp: soft-clip distortion for the two-stroke buzz
    this.shaper = c.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; curve[i] = Math.tanh(x * 3.2); }
    this.shaper.curve = curve;
    // chassis rattle: filtered noise loop
    const rs = c.createBufferSource(); rs.buffer = this.noiseBuf; rs.loop = true;
    const rf = c.createBiquadFilter(); rf.type = 'bandpass'; rf.frequency.value = 900; rf.Q.value = 3;
    this.rattle = c.createGain(); this.rattle.gain.value = 0;
    rs.connect(rf).connect(this.rattle).connect(this.sfx); rs.start();
    this.eo1 = c.createOscillator(); this.eo1.type = 'sawtooth'; this.eo1.frequency.value = 50;
    this.eo2 = c.createOscillator(); this.eo2.type = 'square'; this.eo2.frequency.value = 75;
    this.ef = c.createBiquadFilter(); this.ef.type = 'lowpass'; this.ef.frequency.value = 500; this.ef.Q.value = 3;
    this.eamp = c.createGain(); this.eamp.gain.value = 0.5;
    // two-stroke "putt-putt": a square LFO modulating amplitude
    this.lfo = c.createOscillator(); this.lfo.type = 'square'; this.lfo.frequency.value = 16;
    const depth = c.createGain(); depth.gain.value = 0.35;
    this.lfo.connect(depth).connect(this.eamp.gain);
    this.eout = c.createGain(); this.eout.gain.value = 0;
    const g2 = c.createGain(); g2.gain.value = 0.5;
    this.eo1.connect(this.ef); this.eo2.connect(g2).connect(this.ef);
    this.ef.connect(this.shaper).connect(this.eamp).connect(this.eout).connect(this.sfx);
    this.eo1.start(); this.eo2.start(); this.lfo.start();
  }
  engine(speed, nitro, on) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // 4-speed gearbox: rpm climbs within a band then drops on the shift (with a clunk)
    const bands = [0, 13, 22, 31, 40, 99];
    let g = 1; while (g < 5 && speed > bands[g]) g++;
    if (on && g !== this.gear && speed > 3) {
      if (g > this.gear) { this.tone(70, 0.08, { type: 'square', vol: 0.06, to: 45 }); this.shiftT = 0.18; }
      this.gear = g;
    }
    const rpm = Math.min(1, (speed - bands[g - 1]) / (bands[g] - bands[g - 1] || 10));
    this.shiftT = Math.max(0, this.shiftT - 1 / 60);
    const f = 38 + rpm * 46 + g * 4 - this.shiftT * 60 + nitro * 30;
    this.rattle.gain.setTargetAtTime(on ? 0.012 + Math.min(speed, 45) * 0.0007 : 0, t, 0.2);
    // occasional backfire when easing off
    if (on && speed < this.lastSpeed - 0.35 && Math.random() < 0.02) this.backfire();
    this.lastSpeed = speed;
    this.eo1.frequency.setTargetAtTime(f, t, 0.08);
    this.eo2.frequency.setTargetAtTime(f * 1.49, t, 0.08);
    this.lfo.frequency.setTargetAtTime(12 + speed * 0.55 + nitro * 10, t, 0.1);
    this.ef.frequency.setTargetAtTime(350 + speed * 22 + nitro * 900, t, 0.1);
    this.eout.gain.setTargetAtTime(on ? 0.075 + nitro * 0.04 : 0, t, 0.15);
  }

  // ---------- rain ----------
  buildRain() {
    const c = this.ctx;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2800; f.Q.value = 0.4;
    this.rainGain = c.createGain(); this.rainGain.gain.value = 0;
    s.connect(f).connect(this.rainGain).connect(this.sfx); s.start();
  }
  rain(level) {
    if (!this.ctx) return;
    this.rainGain.gain.setTargetAtTime(level * 0.16, this.ctx.currentTime, 0.4);
  }
  thunder() {
    this.noise(2.8, { vol: 0.5, freq: 380, to: 60, attack: 0.05 });
    this.tone(48, 1.6, { type: 'sine', vol: 0.3, to: 30 });
  }

  // ---------- SFX ----------
  click() { this.tone(660, 0.06, { type: 'triangle', vol: 0.12 }); }
  coin(combo = 0) {
    const t = this.ctx?.currentTime; if (!t) return;
    const p = Math.min(combo, 12) * 35;
    this.tone(1180 + p, 0.07, { type: 'square', vol: 0.05, when: t });
    this.tone(1580 + p, 0.12, { type: 'square', vol: 0.045, when: t + 0.05 });
  }
  jump() { this.tone(260, 0.22, { type: 'triangle', vol: 0.16, to: 620 }); }
  launch() { this.tone(180, 0.5, { type: 'sawtooth', vol: 0.12, to: 900 }); this.noise(0.4, { vol: 0.15, freq: 900, to: 3000 }); }
  land() { this.tone(110, 0.15, { type: 'sine', vol: 0.3, to: 50 }); this.noise(0.12, { vol: 0.12, freq: 500 }); }
  trick() { [0, 4, 7, 12].forEach((s, i) => this.tone(hz(s + 24), 0.14, { type: 'square', vol: 0.06, when: this.ctx.currentTime + i * 0.06 })); }
  near() { this.noise(0.35, { vol: 0.25, type: 'bandpass', freq: 600, to: 2600, q: 2 }); }
  crash() {
    this.noise(0.6, { vol: 0.6, freq: 1800, to: 120 });
    this.tone(90, 0.45, { type: 'square', vol: 0.25, to: 35 });
    this.noise(0.25, { vol: 0.25, type: 'highpass', freq: 3500, when: this.ctx?.currentTime + 0.05 });
  }
  smash() {
    this.noise(0.45, { vol: 0.45, freq: 2500, to: 200 });
    this.tone(140, 0.3, { type: 'square', vol: 0.15, to: 60 });
    this.tone(880, 0.2, { type: 'triangle', vol: 0.06, to: 1760 });
  }
  bump(k = 1) {
    this.tone(65, 0.22, { type: 'sine', vol: 0.45 * k, to: 35 });
    this.noise(0.25, { vol: 0.25 * k, type: 'bandpass', freq: 1400, q: 2 });           // metal rattle
    this.noise(0.12, { vol: 0.15 * k, type: 'highpass', freq: 4000, when: this.ctx?.currentTime + 0.08 });
  }
  backfire() {
    if (!this.ctx) return;
    this.noise(0.09, { vol: 0.5, type: 'lowpass', freq: 700, to: 200 });
    this.tone(55, 0.1, { type: 'square', vol: 0.15, to: 30 });
  }
  splash() { this.noise(0.5, { vol: 0.3, type: 'bandpass', freq: 1200, to: 400, q: 0.7 }); }
  powerup() { [0, 4, 7, 12, 16].forEach((s, i) => this.tone(hz(s + 12), 0.18, { type: 'triangle', vol: 0.1, when: this.ctx.currentTime + i * 0.055 })); }
  shieldBreak() { this.tone(1200, 0.4, { type: 'sawtooth', vol: 0.1, to: 200 }); this.noise(0.3, { vol: 0.2, type: 'highpass', freq: 2000 }); }
  nitro() { this.noise(1.2, { vol: 0.35, type: 'bandpass', freq: 400, to: 3000, q: 1.5 }); this.tone(110, 0.9, { type: 'sawtooth', vol: 0.12, to: 330 }); }
  fare() { [0, 4, 7, 12, 7, 12, 16].forEach((s, i) => this.tone(hz(s + 12), 0.2, { type: 'square', vol: 0.06, when: this.ctx.currentTime + i * 0.08 })); }
  fail() { [7, 5, 2, 0].forEach((s, i) => this.tone(hz(s), 0.3, { type: 'triangle', vol: 0.12, when: this.ctx.currentTime + i * 0.14 })); }
  gate() { [0, 7, 12, 16, 19, 24].forEach((s, i) => this.tone(hz(s + 12), 0.4, { type: 'sawtooth', vol: 0.05, when: this.ctx.currentTime + i * 0.07 })); }
  gameover() { [12, 10, 7, 5, 0].forEach((s, i) => this.tone(hz(s), 0.45, { type: 'triangle', vol: 0.14, when: this.ctx.currentTime + i * 0.18 })); }
  buy() { this.tone(988, 0.1, { type: 'square', vol: 0.06 }); this.tone(1319, 0.25, { type: 'square', vol: 0.06, when: this.ctx.currentTime + 0.08 }); }

  horn(kind = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const hornVoice = (f, start, dur, type = 'sawtooth', vol = 0.12) => {
      const c = this.ctx, o = c.createOscillator(), o2 = c.createOscillator(), fl = c.createBiquadFilter(), g = c.createGain();
      o.type = type; o2.type = type; o.frequency.value = f; o2.frequency.value = f * 1.26;
      fl.type = 'lowpass'; fl.frequency.value = 2200;
      g.gain.setValueAtTime(0.0001, start); g.gain.exponentialRampToValueAtTime(vol, start + 0.02);
      g.gain.setValueAtTime(vol, start + dur - 0.04); g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      o.connect(fl); o2.connect(fl); fl.connect(g).connect(this.sfx);
      o.start(start); o2.start(start); o.stop(start + dur + 0.05); o2.stop(start + dur + 0.05);
    };
    if (kind === 0) { hornVoice(420, t, 0.14); hornVoice(420, t + 0.2, 0.22); }
    else if (kind === 1) { [0, 4, 7, 4, 9, 7].forEach((s, i) => hornVoice(hz(s + 12) * 1.5, t + i * 0.11, 0.1, 'square', 0.07)); }
    else if (kind === 2) { hornVoice(150, t, 0.7, 'sawtooth', 0.16); hornVoice(190, t, 0.7, 'sawtooth', 0.1); }
    else { for (let i = 0; i < 2; i++) { this.tone(2400, 0.25, { type: 'sine', vol: 0.08, when: t + i * 0.16 }); this.tone(3150, 0.25, { type: 'sine', vol: 0.05, when: t + i * 0.16 }); } }
  }

  // ---------- music ----------
  newPhrase() {
    // 32-step melodic phrase built from short motifs — repeated with variation
    const motif = () => {
      const m = []; let n = Math.floor(Math.random() * 5);
      for (let i = 0; i < 8; i++) {
        if (Math.random() < 0.3) { m.push(null); continue; }
        n = Math.max(0, Math.min(SCALE.length - 1, n + Math.floor(Math.random() * 5) - 2));
        m.push(n);
      }
      return m;
    };
    const a = motif(), b = motif();
    this.phrase = [...a, ...a, ...b, ...a.map((x, i) => (i > 5 ? 0 : x))];
    this.bassRoots = [0, 0, 5, 3].map(i => SCALE[i]);
  }
  // style: 'dhol' | 'qawwali' | 'lofi' | 'off' (playlist uses an <audio> element instead)
  setStyle(style) { this.style = style; this.step = 0; this.newPhrase(); }

  schedule() {
    if (!this.ctx || this.mode === 'off' || this.style === 'off') return;
    const st = this.style || 'dhol';
    const drive = this.mode === 'drive';
    const bpm = st === 'lofi' ? 84 : st === 'qawwali' ? (drive ? 104 + this.intensity * 20 : 88) : (drive ? 118 + this.intensity * 14 : 96);
    const stepDur = 60 / bpm / 4;
    if (this.nextNote < this.ctx.currentTime - 0.2) this.nextNote = this.ctx.currentTime + 0.05;
    while (this.nextNote < this.ctx.currentTime + 0.12) {
      if (st === 'qawwali') this.playQawwali(this.step, this.nextNote, stepDur);
      else if (st === 'lofi') this.playLofi(this.step, this.nextNote, stepDur);
      else this.playStep(this.step, this.nextNote, stepDur);
      this.nextNote += stepDur;
      this.step = (this.step + 1) % 64;
      if (this.step === 0 && Math.random() < 0.4) this.newPhrase();
    }
  }

  /** Dhol FM — bhangra-style dhol, tumbi plucks, drone. */
  playStep(step, t, sd) {
    const drive = this.mode === 'drive';
    const s16 = step % 16;
    const bar = Math.floor(step / 16);
    const dest = this.music;
    if (drive) {
      if ([0, 3, 6, 8, 11, 14].includes(s16)) this.tone(105, 0.22, { type: 'sine', vol: 0.5, to: 48, when: t, dest });
      if ([2, 4, 7, 10, 12, 15].includes(s16)) this.noise(0.06, { vol: 0.16, type: 'highpass', freq: 3200, when: t, dest });
      if (this.intensity > 0.5 && s16 % 2 === 1) this.noise(0.03, { vol: 0.06, type: 'highpass', freq: 7000, when: t, dest });
    } else if (s16 === 0 || s16 === 8) {
      this.tone(90, 0.3, { type: 'sine', vol: 0.25, to: 50, when: t, dest });
    }
    const root = this.bassRoots[bar % 4];
    if (s16 === 0 || (drive && (s16 === 6 || s16 === 10))) this.tone(hz(root - 12), sd * 3, { type: 'triangle', vol: drive ? 0.22 : 0.14, when: t, dest });
    if (s16 === 0) {
      this.tone(hz(root), sd * 15, { type: 'sawtooth', vol: 0.025, when: t, attack: 0.3, dest });
      this.tone(hz(root + 7), sd * 15, { type: 'sawtooth', vol: 0.018, when: t, attack: 0.3, dest });
    }
    if (step % 2 === 0) {
      const n = this.phrase[(step / 2) % this.phrase.length];
      if (n !== null && n !== undefined) {
        const f = hz(SCALE[n] + 12);
        this.tone(f, sd * 1.6, { type: 'square', vol: drive ? 0.05 : 0.035, when: t, dest, attack: 0.003 });
        this.tone(f * 2, sd * 0.8, { type: 'triangle', vol: 0.02, when: t, dest, attack: 0.002 });
      }
    }
  }

  /** Qawwali Night — harmonium chords, tabla, hand claps. */
  playQawwali(step, t, sd) {
    const drive = this.mode === 'drive';
    const s16 = step % 16, bar = Math.floor(step / 16);
    const dest = this.music;
    // tabla: "dha" (low bend) and "na/ti" (high ring)
    if ([0, 6, 8, 14].includes(s16)) this.tone(130, 0.28, { type: 'sine', vol: 0.4, to: 95, when: t, dest });
    if ([2, 4, 10, 12].includes(s16) || (drive && s16 % 2 === 1 && this.intensity > 0.4)) this.tone(520, 0.09, { type: 'triangle', vol: 0.12, to: 480, when: t, dest });
    // claps on 4 & 12 (and a double at the end of each bar when driving)
    if (s16 === 4 || s16 === 12 || (drive && s16 === 15)) {
      this.noise(0.08, { vol: 0.28, type: 'bandpass', freq: 1400, q: 0.8, when: t, dest });
      this.noise(0.06, { vol: 0.18, type: 'bandpass', freq: 1100, q: 0.8, when: t + 0.012, dest });
    }
    // harmonium: reedy chord, re-pumped every half bar
    const roots = [0, 5, 3, 0];
    const r = SCALE[roots[bar % 4]];
    if (s16 === 0 || s16 === 8) {
      for (const iv of [0, 4, 7]) {
        this.tone(hz(r + iv), sd * 8, { type: 'sawtooth', vol: 0.03, when: t, attack: 0.06, dest });
        this.tone(hz(r + iv) * 1.004, sd * 8, { type: 'square', vol: 0.014, when: t, attack: 0.06, dest });
      }
      this.tone(hz(r - 12), sd * 8, { type: 'triangle', vol: 0.14, when: t, attack: 0.02, dest });
    }
    // sung-like lead with slides
    if (step % 2 === 0) {
      const n = this.phrase[(step / 2) % this.phrase.length];
      if (n !== null && n !== undefined) {
        const f = hz(SCALE[n] + 12);
        this.tone(f * 0.97, sd * 2.2, { type: 'triangle', vol: 0.06, to: f, when: t, attack: 0.03, dest });
      }
    }
  }

  /** Sea Breeze Lo-fi — lazy beat, mellow 7th chords, vinyl crackle. */
  playLofi(step, t, sd) {
    const s16 = step % 16, bar = Math.floor(step / 16);
    const dest = this.music;
    if (s16 === 0 || s16 === 10) this.tone(80, 0.3, { type: 'sine', vol: 0.45, to: 42, when: t, dest });
    if (s16 === 4 || s16 === 12) this.noise(0.18, { vol: 0.14, type: 'bandpass', freq: 1800, q: 0.6, when: t, dest });
    if (s16 % 2 === 0) this.noise(0.04, { vol: 0.04, type: 'highpass', freq: 6000, when: t + (s16 % 4 === 2 ? sd * 0.2 : 0), dest });
    if (Math.random() < 0.3) this.noise(0.02, { vol: 0.015, type: 'highpass', freq: 2500, when: t, dest }); // crackle
    const prog = [[0, 4, 7, 11], [5, 9, 12, 16], [2, 5, 9, 12], [7, 11, 14, 17]];
    if (s16 === 0) for (const iv of prog[bar % 4]) this.tone(hz(iv), sd * 15, { type: 'triangle', vol: 0.035, when: t + Math.random() * 0.03, attack: 0.08, dest });
    if (s16 === 0 || s16 === 7) this.tone(hz(prog[bar % 4][0] - 12), sd * 5, { type: 'sine', vol: 0.2, when: t, dest });
    if (step % 4 === 2 && Math.random() < 0.55) {
      const n = this.phrase[(step / 2) % this.phrase.length];
      if (n !== null && n !== undefined) this.tone(hz(SCALE[n] + 12), sd * 3, { type: 'sine', vol: 0.05, when: t, attack: 0.01, dest });
    }
  }
}

export const audio = new AudioEngine();
