// Keyboard + touch (swipe / tap / double-tap) mapped onto abstract actions.
const KEYS = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'jump', KeyW: 'jump', Space: 'jump',
  ArrowDown: 'down', KeyS: 'down',
  ShiftLeft: 'nitro', ShiftRight: 'nitro', KeyN: 'nitro', KeyE: 'nitro',
  KeyH: 'horn', KeyP: 'pause', Escape: 'pause', KeyM: 'mute',
  KeyR: 'radio', KeyB: 'boostA', KeyV: 'boostB',
  Backquote: 'debug',
};
const SWIPE = 28;

export function initInput(canvas, emit) {
  addEventListener('keydown', e => {
    emit('any');
    const a = KEYS[e.code];
    if (!a || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === 'Space' && document.activeElement?.tagName === 'BUTTON') return;
    e.preventDefault();
    emit(a);
  });

  let p = null, lastTap = 0;
  canvas.addEventListener('pointerdown', e => {
    p = { x: e.clientX, y: e.clientY, t: performance.now(), swiped: false };
  });
  canvas.addEventListener('pointermove', e => {
    if (!p || p.swiped) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE) return;
    p.swiped = true;
    if (Math.abs(dx) > Math.abs(dy)) emit(dx < 0 ? 'left' : 'right');
    else emit(dy < 0 ? 'jump' : 'down');
  });
  canvas.addEventListener('pointerup', () => {
    if (p && !p.swiped && performance.now() - p.t < 300) {
      const now = performance.now();
      if (now - lastTap < 280) { emit('nitro'); lastTap = 0; }
      else { emit('horn'); lastTap = now; }
    }
    p = null;
  });
  canvas.addEventListener('pointercancel', () => (p = null));
  document.addEventListener('pointerdown', () => emit('any'), { capture: true });
}
