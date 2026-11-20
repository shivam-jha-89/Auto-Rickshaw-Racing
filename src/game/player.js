// Player rickshaw: lane switching, jumping, ramp launches, air tricks, braking and visual juice.
import { LANES } from '../config.js';
import { createRickshaw } from '../models/rickshaw.js';

const G = 28, JUMP_V = 9, RAMP_V = 13.5;

export class Player {
  constructor(scene, skin) {
    this.scene = scene;
    this.setSkin(skin);
    this.reset();
  }

  setSkin(skin) {
    const prev = this.model;
    this.model = createRickshaw(skin);
    if (prev) {
      this.model.root.position.copy(prev.root.position);
      this.model.passenger.visible = prev.passenger.visible;
      this.scene.remove(prev.root);
    }
    this.scene.add(this.model.root);
  }

  reset() {
    this.lane = 1;
    this.x = 0; this.y = 0; this.vy = 0;
    this.grounded = true;
    this.lastLaneChange = -10;
    this.time = 0;
    this.spin = 0; this.spinning = false; this.trickDone = false; this.tricksThisAir = 0;
    this.airTime = 0; this.launched = false;
    this.brake = 0;
    this.roll = 0;
    this.wheelSpin = 0;
    this.blink = 0;
    this.events = [];
  }

  move(dir) {
    const n = Math.max(0, Math.min(2, this.lane + dir));
    if (n === this.lane) { this.events.push('bump'); return false; }
    this.lane = n;
    this.lastLaneChange = this.time;
    return true;
  }

  jump() {
    if (this.grounded) {
      this.vy = JUMP_V; this.grounded = false; this.launched = false; this.airTime = 0; this.tricksThisAir = 0;
      this.events.push('jump');
      return;
    }
    // second press in the air → 360° trick (needs some height)
    if (!this.spinning && this.vy > -6 && this.y > 0.9) {
      this.spinning = true; this.spin = 0;
      this.events.push('trickStart');
    }
  }

  launch() {
    if (!this.grounded && this.vy > 0) return;
    this.vy = RAMP_V; this.grounded = false; this.launched = true; this.airTime = 0; this.tricksThisAir = 0;
    this.events.push('launch');
  }

  /** Small involuntary hop from a speed breaker / rough road. */
  bump(v) {
    if (!this.grounded) return;
    this.vy = v; this.grounded = false; this.launched = false; this.airTime = 0; this.bumped = true;
  }

  down() {
    if (!this.grounded) { this.vy = Math.min(this.vy, -16); return; }  // slam down
    this.brake = 0.8;
  }

  update(dt, speed, nitro) {
    this.time += dt;
    const tx = LANES[this.lane];
    const dx = tx - this.x;
    this.x += dx * Math.min(1, dt * 13);
    if (!this.grounded) {
      this.airTime += dt;
      this.vy -= G * dt;
      this.y += this.vy * dt;
      if (this.spinning) {
        this.spin += dt * Math.PI * 2 * 2.2;
        if (this.spin >= Math.PI * 2) { this.spin = 0; this.spinning = false; this.tricksThisAir++; this.events.push('trick'); }
      }
      if (this.y <= 0) {
        this.y = 0; this.vy = 0; this.grounded = true;
        if (this.spinning) { this.spinning = false; this.spin = 0; this.events.push('sloppy'); }
        if (this.bumped) { this.bumped = false; } else this.events.push(this.airTime > 0.5 ? 'landHard' : 'land');
      }
    }
    this.brake = Math.max(0, this.brake - dt);
    this.blink = Math.max(0, this.blink - dt);

    // ---- visuals ----
    const m = this.model;
    this.roll += (-dx * 0.09 - this.roll) * Math.min(1, dt * 10);
    m.root.position.set(this.x, this.y, 0);
    m.tilt.rotation.z = this.roll;
    m.tilt.rotation.y = -dx * 0.06 + (this.spinning ? this.spin : 0);
    m.tilt.rotation.x = this.grounded ? Math.sin(this.time * 30) * 0.004 * speed * 0.05 + (this.brake > 0 ? -0.04 : 0) : Math.max(-0.25, Math.min(0.25, this.vy * 0.02));
    m.tilt.position.y = this.grounded ? Math.abs(Math.sin(this.time * 17)) * 0.02 : 0;
    this.wheelSpin += speed * dt / 0.3;
    for (const w of m.wheels) w.rotation.x = -this.wheelSpin;
    m.flame.visible = nitro > 0;
    if (nitro > 0) {
      const f = 0.8 + Math.random() * 0.6;
      m.flame.scale.set(f, 1 + Math.random() * 0.8, f);
    }
    m.root.visible = this.blink <= 0 || Math.floor(this.blink * 14) % 2 === 0;
  }

  get box() { return { x: this.x, y: this.y, hw: 0.72, hl: 1.35 }; }
}
