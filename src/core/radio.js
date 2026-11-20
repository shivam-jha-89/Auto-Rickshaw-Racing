// Rikshaw Radio: built-in procedural stations + "Meri Playlist" (the player's own songs).
// Songs a player adds are stored in their browser (IndexedDB) and never uploaded anywhere.
import { audio } from './audio.js';
import { save, persist } from './save.js';

export const STATIONS = [
  { id: 'dhol', name: 'Dhol FM 102', desc: 'Bhangra dhol aur tumbi' },
  { id: 'qawwali', name: 'Qawwali Night', desc: 'Harmonium, tabla, taaliyan' },
  { id: 'lofi', name: 'Sea Breeze Lo-fi', desc: 'Clifton ki thandi hawa' },
  { id: 'playlist', name: 'Meri Playlist', desc: 'Apne gaane — apne device se' },
  { id: 'off', name: 'Radio Band', desc: 'Sirf engine ki awaaz' },
];

// ---------------- IndexedDB (tiny wrapper) ----------------
const DB = 'rikshaw-radio', STORE = 'songs';
function db() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function tx(mode, fn) {
  const d = await db();
  return new Promise((res, rej) => {
    const t = d.transaction(STORE, mode);
    const out = fn(t.objectStore(STORE));
    t.oncomplete = () => res(out?.result ?? out);
    t.onerror = () => rej(t.error);
  });
}

class Radio {
  constructor() {
    this.songs = [];      // {id, name}
    this.index = 0;
    this.el = null;
    this.url = null;
    this.listeners = new Set();
  }

  get station() { return STATIONS[save.radio] || STATIONS[0]; }
  onChange(fn) { this.listeners.add(fn); }
  emit() { for (const f of this.listeners) f(this); }

  async init() {
    try {
      const all = await tx('readonly', s => s.getAll());
      this.songs = (all || []).map(x => ({ id: x.id, name: x.name }));
    } catch { this.songs = []; }
    this.apply();
  }

  ensureElement() {
    if (this.el || !audio.ctx) return;
    this.el = new Audio();
    this.el.crossOrigin = 'anonymous';
    this.el.addEventListener('ended', () => this.next(1));
    try {
      const src = audio.ctx.createMediaElementSource(this.el);
      src.connect(audio.music); // obeys the game's music volume + mute
    } catch { /* fall back to element volume */ }
  }

  set(i) {
    save.radio = (i + STATIONS.length) % STATIONS.length;
    persist();
    this.apply();
  }
  cycle() { this.set(save.radio + 1); }

  apply() {
    const st = this.station.id;
    if (st === 'playlist') {
      audio.setStyle('off');
      if (!this.songs.length) { this.stopSong(); this.emit(); return; }
      this.playSong(this.index);
    } else {
      this.stopSong();
      audio.setStyle(st);
    }
    this.emit();
  }

  async playSong(i) {
    if (!this.songs.length) return;
    this.ensureElement();
    if (!this.el) return;
    this.index = (i + this.songs.length) % this.songs.length;
    const rec = await tx('readonly', s => s.get(this.songs[this.index].id));
    if (!rec) return;
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = URL.createObjectURL(rec.blob);
    this.el.src = this.url;
    this.el.play().catch(() => {});
    this.emit();
  }
  stopSong() { if (this.el) { this.el.pause(); } }
  next(dir = 1) {
    if (this.station.id === 'playlist') this.playSong(this.index + dir);
    else this.cycle();
  }
  pause(on) {
    if (this.station.id !== 'playlist' || !this.el) return;
    if (on) this.el.pause(); else this.el.play().catch(() => {});
  }

  get nowPlaying() {
    if (this.station.id === 'playlist') return this.songs.length ? `🎵 ${this.songs[this.index]?.name}` : '🎵 Playlist khaali hai';
    return `📻 ${this.station.name}`;
  }

  async addFiles(files) {
    for (const f of files) {
      if (!f.type.startsWith('audio/')) continue;
      const name = f.name.replace(/\.[^.]+$/, '');
      await tx('readwrite', s => s.add({ name, blob: f }));
    }
    await this.init();
  }
  async remove(id) {
    await tx('readwrite', s => s.delete(id));
    await this.init();
  }
}

export const radio = new Radio();
