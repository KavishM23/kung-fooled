'use strict';
// Data-driven traps. Each entry in a level's `traps` list becomes one of these.
//
// Common fields on every trap definition:
//   type    which class below
//   id      optional name, so other traps can chain with when: { after: 'id' }
//   when    trigger condition (all listed keys must hold):
//             x: 12        player centre is right of tile column 12 (fractions allowed)
//             xl: 12       player centre is left of column 12
//             zone: [c, r, w, h]   player overlaps this tile rectangle
//             leave: [c, r, w, h]  player was inside this rectangle and has just left it
//             near: 3      player within 3 tiles of the trap
//             above: 8 / below: 8  player's feet above / below tile row 8 (a height reached)
//             time: 1.5    seconds since (re)spawn
//             after: 'id'  another trap has fired;  done: 'id'  another trap has finished moving
//             touch: true  player touches the trap
//             airborne / grounded / rising / falling: true
//             land: true   the player has just landed (with zone/x: landed there)
//             back: [c1, c0]  the player went past column c1 and then retreated left of c0
//             stay: 0.4    everything else has held for 0.4 s without a break (waiting, loitering)
//           Without `when`, each type has a sensible default (collapse = stood on, etc).
//   delay   seconds between trigger and firing. Nothing shows before the trigger: a trap looks
//           exactly like the level around it until then (see js/render.js and PlayScene's unbake).
//   deaths  which attempts the trap exists on: 0, [0, 2], ['1+'], [1, '3+'] ... Only levels marked
//           `changing: true` use this: everywhere else each retry is the same level (its last
//           variant), so what you learned by dying stays true.
//   say     taunt text that pops up when it fires
(function (KF) {
  const T = KF.TILE;
  const U = KF.util;

  function matchDeaths(spec, d) {
    if (spec === undefined || spec === null) return true;
    const list = Array.isArray(spec) ? spec : [spec];
    return list.some((s) => (typeof s === 'number' ? s === d : d >= parseInt(s, 10)));
  }
  const tileRect = ([c, r, w = 1, h = 1]) => ({ x: c * T, y: r * T, w: w * T, h: h * T });
  const center = (r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

  class Trap {
    constructor(def, stage) {
      this.def = def;
      this.stage = stage;
      this.id = def.id || null;
      this.fired = false;
      this.pending = -1; // >= 0 while counting down `delay`
      this.fireT = 0;
    }
    get player() { return this.stage.player; }
    bounds() { return this.rect; }
    distanceTo(p) {
      const r = this.bounds();
      const dx = Math.max(r.x - (p.x + p.w), p.x - (r.x + r.w), 0);
      const dy = Math.max(r.y - (p.y + p.h), p.y - (r.y + r.h), 0);
      return Math.hypot(dx, dy);
    }
    touching() {
      const r = this.bounds();
      return U.overlap(this.player, { x: r.x - 1, y: r.y - 1, w: r.w + 2, h: r.h + 2 });
    }
    test(w) {
      const s = this.stage, p = s.player, g = p.gravDir || 1, tr = this.trig || (this.trig = {});
      // Edge-style triggers keep a little memory on the trap (it is rebuilt each attempt).
      const wasAir = tr.air; tr.air = !p.grounded;
      if (w.back) {
        if (p.centerX >= w.back[0] * T) tr.past = true;
        if (!tr.past || p.centerX > w.back[1] * T) return this.held(w, false);
      }
      if (w.leave) {
        const inside = U.overlap(p, tileRect(w.leave));
        const left = tr.inside && !inside; tr.inside = inside;
        if (!left) return this.held(w, false);
      }
      let ok = true;
      if (w.x !== undefined && p.centerX < w.x * T) ok = false;
      else if (w.xl !== undefined && p.centerX > w.xl * T) ok = false;
      else if (w.zone && !U.overlap(p, tileRect(w.zone))) ok = false;
      else if (w.near !== undefined && this.distanceTo(p) > w.near * T) ok = false;
      else if (w.above !== undefined && p.y + p.h > w.above * T) ok = false;
      else if (w.below !== undefined && p.y < w.below * T) ok = false;
      else if (w.time !== undefined && s.t < w.time) ok = false;
      else if (w.after !== undefined && !s.hasFired(w.after)) ok = false;
      else if (w.done !== undefined && !s.isDone(w.done)) ok = false;
      else if (w.touch && !this.touching()) ok = false;
      else if (w.airborne && p.grounded) ok = false;
      else if (w.grounded && !p.grounded) ok = false;
      else if (w.rising && (p.grounded || p.vy * g >= 0)) ok = false;
      else if (w.falling && (p.grounded || p.vy * g <= 0)) ok = false;
      else if (w.land && !(p.grounded && wasAir)) ok = false;
      return this.held(w, ok);
    }
    // stay: the rest of the condition has to hold continuously for that long.
    held(w, ok) {
      if (w.stay === undefined) return ok;
      const tr = this.trig;
      tr.stayT = ok ? (tr.stayT || 0) + (this.stage.dt || KF.STEP) : 0;
      return tr.stayT >= w.stay;
    }
    condition() { return this.def.when ? this.test(this.def.when) : this.defaultCondition(); }
    defaultCondition() { return false; }
    get warning() { return !this.fired && this.pending >= 0; }
    // Set once the trap has been triggered or has moved: from then on it is drawn live, and the
    // stage's baked picture no longer shows it (until the next attempt bakes a fresh one).
    get disturbed() { return this.fired || this.pending >= 0; }

    update(dt) {
      if (!this.fired) {
        if (this.pending < 0 && this.condition()) this.pending = this.def.delay ?? this.defaultDelay;
        if (this.pending >= 0) {
          this.pending -= dt;
          if (this.pending <= 0) this.fire();
        }
      } else this.fireT += dt;
      this.tick(dt);
    }
    fire() {
      this.fired = true;
      this.fireT = 0;
      this.stage.markFired(this.id);
      if (!this.ownDone) this.stage.markDone(this.id); // moving traps say when they've finished
      if (this.def.say) {
        const c = center(this.bounds());
        this.stage.emit('say', { text: this.def.say, x: c.x, y: c.y - 20 });
      }
      this.onFire();
    }
    onFire() {}
    tick() {}
    prePlayer() {}
    afterPlayer() {}
    kills() { return false; }
  }
  Trap.prototype.defaultDelay = 0;

  // Floor that drops away. at: [c, r, w, h] (tiles drawn in the map with # are taken over).
  class Collapse extends Trap {
    constructor(def, stage, index) {
      super(def, stage);
      this.rect = tileRect(def.at);
      this.key = 'c' + index;
      this.seen = !!stage.memory.seen[this.key];
      this.tiles = stage.claimTiles(def.at);
      this.solid = { ...this.rect, active: true };
      stage.world.dynamicSolids.push(this.solid);
      this.drop = 0; this.vy = 0;
    }
    defaultCondition() { return this.stage.standingOn(this.solid); }
    onFire() {
      this.seen = true; this.stage.memory.seen[this.key] = true;
      this.solid.active = false;
      this.stage.emit('crumble', { x: this.rect.x + this.rect.w / 2, y: this.rect.y, w: this.rect.w });
    }
    tick(dt) {
      if (this.fired) { this.vy = Math.min(this.vy + 1400 * dt, 700); this.drop += this.vy * dt; }
    }
  }
  Collapse.prototype.defaultDelay = 0.05;

  // Spikes hidden in a floor/ceiling/wall that shoot out. at: [c, r, w], dir: up|down|left|right.
  // retract: seconds after springing before they sink back into the floor (and stay down).
  class PopSpikes extends Trap {
    constructor(def, stage, index) {
      super(def, stage);
      const [c, r, w = 1] = def.at;
      this.dir = def.dir || 'up';
      const vertical = this.dir === 'up' || this.dir === 'down';
      this.rect = vertical ? tileRect([c, r, w, 1]) : tileRect([c, r, 1, w]);
      this.cells = [];
      for (let i = 0; i < w; i++) this.cells.push(vertical ? [c + i, r] : [c, r + i]);
      this.raise = 0;
      this.key = 's' + index;
      this.seen = !!stage.memory.seen[this.key];
    }
    defaultCondition() { return this.distanceTo(this.player) < T * 1.5; }
    onFire() {
      this.seen = true; this.stage.memory.seen[this.key] = true;
      this.stage.emit('spikes', center(this.rect));
    }
    tick(dt) {
      if (!this.fired) return;
      if (this.def.retract !== undefined && this.fireT > this.def.retract) this.raise = Math.max(0, this.raise - dt / 0.18);
      else this.raise = Math.min(1, this.raise + dt / (this.def.rise || 0.06));
    }
    kills(p) {
      if (this.raise < 0.5) return false;
      return this.cells.some(([c, r]) => U.overlap(p, KF.spikeRect(this.dir, c * T, r * T)));
    }
  }

  // A visible rack of spikes patrols between two positions. at: [c,r,w], travel: [dx,dy]
  // in tiles, period: seconds for a full out-and-back trip. Its track is part of the tell.
  class MovingSpikes extends Trap {
    constructor(def, stage) {
      super(def, stage);
      this.home = tileRect(def.at);
      this.home.h = T;
      this.travel = def.travel || [3, 0];
      this.period = def.period || 3;
      this.fired = true;
      this.x = this.home.x;
      this.y = this.home.y;
      this.rect = {
        x: Math.min(this.home.x, this.home.x + this.travel[0] * T),
        y: Math.min(this.home.y, this.home.y + this.travel[1] * T),
        w: this.home.w + Math.abs(this.travel[0] * T),
        h: T + Math.abs(this.travel[1] * T),
      };
    }
    tick() {
      const phase = ((this.stage.t + (this.def.offset || 0)) % this.period) / this.period;
      const k = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
      this.x = this.home.x + this.travel[0] * T * k;
      this.y = this.home.y + this.travel[1] * T * k;
    }
    kills(p) {
      for (let i = 0; i < this.home.w; i += T) {
        if (U.overlap(p, KF.spikeRect('up', this.x + i, this.y))) return true;
      }
      return false;
    }
  }

  // A floor-to-ceiling energy gate with a readable off window. at: [c,r,w,h].
  class PulseBeam extends Trap {
    constructor(def, stage) {
      super(def, stage);
      this.rect = tileRect(def.at);
      this.on = def.on || 1;
      this.period = this.on + (def.off || 1.4);
      this.fired = true;
    }
    get phase() { return (this.stage.t + (this.def.offset || 0)) % this.period; }
    get active() { return this.phase < this.on; }
    get warn() { return !this.active && this.phase > this.period - 0.32; }
    kills(p) { return this.active && U.overlap(p, this.rect); }
  }

  // A floor belt changes the player's ground speed only while their feet are on it.
  // at: [c,r,w] on the walkable row, speed: signed pixels/second.
  class Conveyor extends Trap {
    constructor(def, stage) {
      super(def, stage);
      const [c, r, w = 3] = def.at;
      this.rect = { x: c * T, y: (r + 1) * T - 4, w: w * T, h: 4 };
      this.fired = true;
    }
    // reverseWhen: a trigger that flips the belt (once) while you're on it.
    update(dt) {
      if (this.def.reverseWhen && !this.flipped && this.test(this.def.reverseWhen)) {
        this.flipped = true;
        this.stage.emit('whoosh', center(this.rect));
        if (this.def.say) this.stage.emit('say', { text: this.def.say, x: this.rect.x + this.rect.w / 2, y: this.rect.y - 20 });
      }
    }
    get speed() { return (this.def.speed || 75) * (this.flipped ? -1 : 1); }
    stateKey() { return this.flipped ? 'b1' : ''; }
    push(p) {
      if (!p.grounded || p.gravDir < 0 || Math.abs(p.y + p.h - (this.rect.y + 4)) > 2) return 0;
      return p.x + p.w > this.rect.x && p.x < this.rect.x + this.rect.w ? this.speed : 0;
    }
  }

  // A fixed launcher sends one small projectile along a visible line each cycle.
  // at: [c,r] is the barrel tile; dir: left|right; range is in tiles.
  class DartLauncher extends Trap {
    constructor(def, stage) {
      super(def, stage);
      const [c, r] = def.at;
      this.rect = { x: c * T, y: r * T + 8, w: T, h: 8 };
      this.dir = def.dir === 'right' ? 1 : -1;
      this.speed = def.speed || 180;
      this.range = (def.range || 8) * T;
      this.period = def.period || 2.2;
      this.fired = true;
    }
    get phase() { return (this.stage.t + (this.def.offset || 0)) % this.period; }
    get warn() { return this.phase > this.period - 0.35; }
    get dart() {
      const distance = this.phase * this.speed;
      if (distance > this.range) return null;
      return { x: this.rect.x + T / 2 + this.dir * distance - 3, y: this.rect.y + 1, w: 6, h: 3 };
    }
    kills(p) {
      const dart = this.dart;
      return !!dart && U.overlap(p, dart);
    }
  }

  // Block in the ceiling that drops. at: [c, r, w, h]. Default trigger: player passes underneath.
  class Crusher extends Trap {
    constructor(def, stage) {
      super(def, stage);
      const r = tileRect(def.at);
      this.tiles = stage.claimTiles(def.at);
      this.body = { ...r, gravDir: 1, active: true, dx: 0, dy: 0 };
      this.home = { x: r.x, y: r.y };
      stage.world.dynamicSolids.push(this.body);
      this.falling = false; this.landed = false; this.vy = 0;
    }
    bounds() { return this.body; }
    defaultCondition() {
      const p = this.player, b = this.body;
      return p.x < b.x + b.w && p.x + p.w > b.x && p.y > b.y;
    }
    onFire() { this.falling = true; this.stage.emit('rumble', center(this.body)); }
    tick(dt) {
      const b = this.body, world = this.stage.world;
      // A landed block whose support vanished (e.g. it sat on a collapsing floor) falls again.
      if (this.landed && b.y < world.pixelH + 64 && !world.overlapsSolid(b.x, b.y + 1, b.w, b.h, b)) {
        this.landed = false; this.falling = true;
      }
      if (!this.falling) return;
      this.vy = Math.min(this.vy + (this.def.gravity || 1800) * dt, 650);
      const before = this.body.y;
      const hit = KF.Physics.moveY(this.body, this.stage.world, this.vy * dt);
      this.body.dy = this.body.y - before;
      if (hit || this.body.y > this.stage.world.pixelH + 64) {
        this.falling = false; this.landed = true; this.vy = 0;
        this.stage.markDone(this.id);
        this.stage.emit('slam', { x: this.body.x + this.body.w / 2, y: this.body.y + this.body.h, w: this.body.w });
      }
    }
    kills(p) { return this.falling && U.overlap(p, this.body); }
  }

  // Launch pad. at: [c, r] (sits on the floor tile below), power: upward speed, vx: sideways kick.
  class Spring extends Trap {
    constructor(def, stage) {
      super(def, stage);
      const [c, r] = def.at;
      this.rect = { x: c * T + 2, y: r * T + 9, w: 12, h: 7 };
      this.squash = 0;
    }
    afterPlayer(p) {
      if (p.dead || p.vy * p.gravDir < 0 || !U.overlap(p, this.rect)) return;
      p.launch(this.def.vx || 0, this.def.power || 560, this.def.control ?? 0.8);
      this.squash = 1;
      this.stage.emit('spring', { x: this.rect.x + 6, y: this.rect.y });
      if (!this.fired) this.fire();
    }
    tick(dt) { this.squash = Math.max(0, this.squash - dt * 5); }
  }

  // Platform that slides away when you get close. at: [c, r, w], path: [[dx, dy], ...] in tiles,
  // each leg triggered by the player coming within `near` tiles again.
  class Shy extends Trap {
    constructor(def, stage) {
      super(def, stage);
      const [c, r, w = 2] = def.at;
      this.solid = { x: c * T, y: r * T, w: w * T, h: 8, active: true, dx: 0, dy: 0, shy: true };
      stage.world.dynamicSolids.push(this.solid);
      this.leg = 0; this.moving = false; this.target = null;
    }
    bounds() { return this.solid; }
    update(dt) {
      const path = this.def.path || [];
      if (!this.moving && this.leg < path.length) {
        const go = this.leg === 0 && this.def.when ? this.test(this.def.when)
          : this.distanceTo(this.player) < (this.def.near ?? 2.5) * T;
        if (go) {
          const [dx, dy] = path[this.leg];
          this.target = { x: this.solid.x + dx * T, y: this.solid.y + dy * T };
          this.moving = true;
          if (!this.fired) this.fire();
          this.stage.emit('whoosh', center(this.solid));
        }
      }
      if (this.moving) {
        const s = this.solid, sp = (this.def.speed || 150) * dt;
        const nx = U.approach(s.x, this.target.x, sp * Math.abs(this.target.x - s.x) / (Math.hypot(this.target.x - s.x, this.target.y - s.y) || 1));
        const ny = U.approach(s.y, this.target.y, sp * Math.abs(this.target.y - s.y) / (Math.hypot(this.target.x - s.x, this.target.y - s.y) || 1));
        s.dx = nx - s.x; s.dy = ny - s.y; s.x = nx; s.y = ny;
        if (s.x === this.target.x && s.y === this.target.y) { this.moving = false; this.leg++; }
      }
    }
  }

  // The exit door runs away. path: [{ to: [c, r], near: 3, speed: 260 }, ...] (r = door's bottom tile).
  class DoorRun extends Trap {
    constructor(def, stage) {
      super(def, stage);
      this.leg = 0; this.moving = false;
    }
    bounds() { return this.stage.world.door; }
    update(dt) {
      const door = this.stage.world.door, path = this.def.path || [];
      if (!door) return;
      if (!this.moving && this.leg < path.length) {
        const step = path[this.leg];
        const go = step.when ? this.test(step.when) : this.distanceTo(this.player) < (step.near ?? 3) * T;
        if (go) {
          this.moving = true;
          this.target = { x: step.to[0] * T, y: (step.to[1] - 1) * T };
          door.moving = true;
          if (!this.fired) this.fire();
          this.stage.emit('doorrun', center(door));
          if (step.say) this.stage.emit('say', { text: step.say, x: door.x + 8, y: door.y - 16 });
        }
      }
      if (this.moving) {
        const sp = (path[this.leg].speed || 260) * dt;
        const dx = this.target.x - door.x, dy = this.target.y - door.y, d = Math.hypot(dx, dy);
        if (d <= sp) {
          door.x = this.target.x; door.y = this.target.y; this.moving = false; door.moving = false; this.leg++;
          if (this.leg >= path.length) this.stage.markDone(this.id);
        }
        else { door.x += dx / d * sp; door.y += dy / d * sp; }
        door.runT = (door.runT || 0) + dt;
      }
    }
  }

  // Looks exactly like the exit (minus the lantern). Touch it and it punches you. at: [c, r].
  class FakeDoor extends Trap {
    constructor(def, stage, index) {
      super(def, stage);
      const [c, r] = def.at;
      this.rect = { x: c * T, y: (r - 1) * T, w: T, h: 2 * T };
      this.dirX = 1;
      this.key = 'd' + index;
      this.seen = !!stage.memory.seen[this.key];
    }
    defaultCondition() {
      const r = this.rect;
      return U.overlap(this.player, { x: r.x + 3, y: r.y + 4, w: r.w - 6, h: r.h - 4 });
    }
    onFire() {
      this.seen = true; this.stage.memory.seen[this.key] = true;
      this.dirX = this.player.centerX < this.rect.x + 8 ? -1 : 1;
      this.stage.emit('punch', center(this.rect));
      this.stage.kill('fakedoor');
    }
  }

  // Zones. zone: [c, r, w, h]. hidden: invisible until it first affects you. `when` = zone switches on later.
  class GravityZone extends Trap {
    constructor(def, stage, index) {
      super(def, stage);
      this.rect = tileRect(def.zone);
      this.g = def.g ?? -1;
      this.key = 'z' + index;
      this.seen = !def.hidden || !!stage.memory.seen[this.key];
      if (!def.when) this.fired = true;
    }
    reveal() { this.seen = true; this.stage.memory.seen[this.key] = true; }
    prePlayer(p) {
      if (!this.fired) return;
      const cx = p.x + p.w / 2, cy = p.y + p.h / 2, r = this.rect;
      if (cx > r.x && cx < r.x + r.w && cy > r.y && cy < r.y + r.h && p.gravDir !== this.g) {
        p.flipGravity(this.g);
        this.reveal();
        this.stage.emit('gravity', { g: this.g, x: cx, y: cy });
      }
    }
  }

  class ReverseZone extends Trap {
    constructor(def, stage, index) {
      super(def, stage);
      this.rect = tileRect(def.zone);
      this.key = 'z' + index;
      this.seen = !def.hidden || !!stage.memory.seen[this.key];
      if (!def.when) this.fired = true;
    }
    reverses(p) {
      if (!this.fired || !U.overlap(p, this.rect)) return false;
      if (!this.seen) { this.seen = true; this.stage.memory.seen[this.key] = true; }
      return true;
    }
  }

  // Invisible block that appears when you jump into it from below. at: [c, r, width].
  class HiddenBlock extends Trap {
    constructor(def, stage, index) {
      super(def, stage);
      const [c, r, w = 1] = def.at;
      this.rect = tileRect([c, r, w, 1]);
      this.key = 'h' + index;
      this.solid = { ...this.rect, active: false };
      stage.world.dynamicSolids.push(this.solid);
      this.popT = 0;
      if (stage.memory.seen[this.key]) { this.fired = true; this.solid.active = true; } // found it before
    }
    defaultCondition() { return false; }
    onFire() {
      this.solid.active = true; this.popT = 1;
      this.stage.memory.seen[this.key] = true;
      this.stage.emit('bonk', center(this.rect));
    }
    afterPlayer(p) {
      if (this.fired || !U.overlap(p, this.solid)) return;
      const s = this.solid, g = p.gravDir;
      const fromBelow = g > 0 ? p.prevY >= s.y + s.h - 0.5 : p.prevY + p.h <= s.y + 0.5;
      if (!fromBelow) return;
      if (g > 0) p.y = s.y + s.h; else p.y = s.y - p.h;
      p.vy = 0; p.jumping = false;
      this.fire();
    }
    tick(dt) { this.popT = Math.max(0, this.popT - dt * 4); }
  }

  // Just a taunt bubble. at: [c, r], text.
  class Taunt extends Trap {
    constructor(def, stage) {
      super(def, stage);
      this.rect = tileRect(def.at || [0, 0]);
    }
    onFire() { this.stage.emit('say', { text: this.def.text, x: this.rect.x + 8, y: this.rect.y }); }
  }

  // Generic moving chunk of level. at: [c, r, w, h], path: [[dx, dy], ...] tiles, speed. Crushes.
  class Mover extends Trap {
    constructor(def, stage) {
      super(def, stage);
      const r = tileRect(def.at);
      this.tiles = stage.claimTiles(def.at);
      this.home = { x: r.x, y: r.y };
      this.solid = { ...r, active: true, dx: 0, dy: 0 };
      stage.world.dynamicSolids.push(this.solid);
      this.leg = 0;
    }
    bounds() { return this.solid; }
    onFire() { this.stage.emit('rumble', center(this.solid)); }
    tick(dt) {
      const path = this.def.path || [];
      if (!this.fired || this.leg >= path.length) return;
      if (!this.target) {
        const [dx, dy] = path[this.leg];
        this.target = { x: this.solid.x + dx * T, y: this.solid.y + dy * T };
      }
      const s = this.solid, sp = (this.def.speed || 120) * dt;
      const dx = this.target.x - s.x, dy = this.target.y - s.y, d = Math.hypot(dx, dy);
      const nx = d <= sp ? this.target.x : s.x + dx / d * sp, ny = d <= sp ? this.target.y : s.y + dy / d * sp;
      s.dx = nx - s.x; s.dy = ny - s.y; s.x = nx; s.y = ny;
      if (d <= sp) { this.leg++; this.target = null; }
    }
  }

  // Looks exactly like floor, isn't. at: [c, r, w, h]. Once you've fallen through it, it stays
  // see-through on later attempts.
  class FakeFloor extends Trap {
    constructor(def, stage, index) {
      super(def, stage);
      this.rect = tileRect(def.at);
      this.tiles = stage.claimTiles(def.at);
      this.key = 'f' + index;
      this.seen = !!stage.memory.seen[this.key];
    }
    defaultCondition() { return U.overlap(this.player, this.rect); }
    onFire() { this.seen = true; this.stage.memory.seen[this.key] = true; this.stage.emit('poof', center(this.rect)); }
  }

  // A real floor that starts to give way when approached. It reforms after a short
  // absence, baiting a rushed step or a return trip. at: [c,r,w,h] over solid tiles.
  class LureFloor extends Trap {
    get disturbed() { return this.mode !== 'ready' || this.wobbled; }
    constructor(def, stage, index) {
      super(def, stage);
      this.rect = tileRect(def.at);
      this.key = 'l' + index;
      this.seen = !!stage.memory.seen[this.key];
      this.tiles = stage.claimTiles(def.at);
      this.solid = { ...this.rect, active: true };
      stage.world.dynamicSolids.push(this.solid);
      this.mode = 'ready';
      this.timer = 0;
    }
    update(dt) {
      if (this.mode === 'ready' && this.distanceTo(this.player) < (this.def.near || 2.8) * T) {
        this.mode = 'warning'; this.timer = this.def.delay ?? 0.55;
        this.seen = true; this.stage.memory.seen[this.key] = true;
        this.stage.emit('rumble', center(this.rect));
      } else if (this.mode === 'warning') {
        this.timer -= dt;
        if (this.timer <= 0) {
          this.mode = 'gone'; this.solid.active = false; this.timer = this.def.reform || 1.5;
          this.stage.emit('crumble', { x: this.rect.x + this.rect.w / 2, y: this.rect.y, w: this.rect.w });
        }
      } else if (this.mode === 'gone') {
        this.timer -= dt;
        if (this.timer <= 0 && !U.overlap(this.player, this.rect)) {
          this.mode = 'ready'; this.solid.active = true; this.wobbled = true;
        }
      }
    }
  }

  // Wind that pushes you sideways while you're inside. zone, force (px/s, + = right),
  // gust: [onSeconds, offSeconds] to blow in bursts (streaks show when it's blowing).
  class Wind extends Trap {
    constructor(def, stage) {
      super(def, stage);
      this.rect = tileRect(def.zone);
      this.fired = !def.when;
      if (def.gust) this.period = def.gust[0] + def.gust[1];
    }
    get blowing() {
      if (!this.fired) return false;
      if (!this.def.gust) return true;
      return ((this.stage.t + (this.def.offset || 0)) % this.period) < this.def.gust[0];
    }
    push(p) { return this.blowing && U.overlap(p, this.rect) ? this.def.force : 0; }
  }

  // Platform that blinks in and out on a timer. at: [c, r, w], on/off seconds, offset.
  // It flickers for the last 0.4 s before vanishing, so the rhythm is readable.
  class Blink extends Trap {
    constructor(def, stage) {
      super(def, stage);
      const [c, r, w = 2] = def.at;
      this.solid = { x: c * T, y: r * T, w: w * T, h: 8, active: true, oneWay: true };
      stage.world.dynamicSolids.push(this.solid);
      this.period = (def.on || 1.4) + (def.off || 1);
    }
    bounds() { return this.solid; }
    get phase() { return (this.stage.t + (this.def.offset || 0)) % this.period; }
    get warn() { const on = this.def.on || 1.4, ph = this.phase; return ph < on && ph > on - 0.4; }
    tick() { this.solid.active = this.phase < (this.def.on || 1.4); }
  }

  // Swinging axe on a chain. at: [c, r] = pivot tile, len (tiles), amp (radians), speed, offset.
  // The blade is the only deadly part; the chain is harmless.
  class Axe extends Trap {
    constructor(def, stage) {
      super(def, stage);
      const [c, r] = def.at;
      this.pivot = { x: c * T + 8, y: r * T + 8 };
      this.len = (def.len || 4) * T;
      this.period = (Math.PI * 2) / (def.speed || 2.2);
      this.rect = { x: this.pivot.x - this.len, y: this.pivot.y, w: this.len * 2, h: this.len + 8 };
    }
    get angle() { return (this.def.amp || 1.1) * Math.sin((this.stage.t + (this.def.offset || 0)) * (this.def.speed || 2.2)); }
    blade() {
      const a = this.angle;
      return { x: this.pivot.x + Math.sin(a) * this.len - 7, y: this.pivot.y + Math.cos(a) * this.len - 6, w: 14, h: 12 };
    }
    kills(p) { return U.overlap(p, this.blade()); }
  }

  // A heavier pendulum uses the axe's readable arc but a broad, spiked head.
  class SwingHammer extends Axe {
    blade() {
      const a = this.angle;
      return { x: this.pivot.x + Math.sin(a) * this.len - 9, y: this.pivot.y + Math.cos(a) * this.len - 9, w: 18, h: 18 };
    }
  }

  // The saw only creeps toward you while you face away from it. Looking back freezes it.
  // at: [c,r] is its left/top tile, range: maximum travel from home, in tiles.
  class LookSaw extends Trap {
    constructor(def, stage) {
      super(def, stage);
      const [c, r] = def.at;
      this.home = c * T;
      this.x = this.home;
      this.y = r * T + 3;
      this.rect = { x: this.home - (def.range || 3) * T, y: this.y, w: ((def.range || 3) * 2 + 1) * T, h: 12 };
      this.fired = true;
    }
    get body() { return { x: this.x + 2, y: this.y, w: 12, h: 12 }; }
    get awake() {
      const p = this.player;
      return Math.abs(p.centerX - this.x - 8) < (this.def.sight || 6) * T &&
        p.facing * (this.x + 8 - p.centerX) < 0;
    }
    tick(dt) {
      if (!this.awake) return;
      const p = this.player, range = (this.def.range || 3) * T;
      const target = U.clamp(p.centerX - 8, this.home - range, this.home + range);
      this.x = U.approach(this.x, target, (this.def.speed || 55) * dt);
    }
    kills(p) { return U.overlap(p, this.body); }
  }

  // ---- Trap Adventure 2-style surprises, and water ----

  // A block that leaps at you. Like a crusher it takes over its tiles, but when it fires it hops
  // toward the player (vx toward you, an upward kick) and falls where it lands; deadly while it
  // flies. at: [c, r, w, h], speed: sideways px/s, hop: upward px/s.
  class Lunger extends Crusher {
    defaultCondition() { return this.distanceTo(this.player) < T * (this.def.range || 3); }
    onFire() {
      const p = this.player, b = this.body;
      this.vx = Math.sign(p.centerX - (b.x + b.w / 2)) * (this.def.speed || 150) || this.def.speed || 150;
      this.vy = -(this.def.hop || 330);
      this.falling = true;
      this.stage.emit('whoosh', center(b));
    }
    tick(dt) {
      if (this.falling && this.vx) {
        const before = this.body.x;
        if (KF.Physics.moveX(this.body, this.stage.world, this.vx * dt)) this.vx = 0;
        this.body.dx = this.body.x - before;
      }
      super.tick(dt);
      if (this.landed) this.vx = 0;
    }
  }

  // Predicts where you'll land and puts a flame there. When it fires (e.g. you jump past x), it
  // runs your current arc forward to the floor row and marks the landing column with a glowing
  // vent; after `warn` s a flame column erupts there for `burn` s. at: [c0, floorRow, width]
  // limits where it can appear. Fair: the vent shows first and you can still steer in the air.
  class AmbushFlame extends Trap {
    constructor(def, stage) {
      super(def, stage);
      const [c, r, w = 8] = def.at;
      this.rect = tileRect([c, r - (def.h || 3), w, def.h || 3]);
      this.floorY = r * T; this.c0 = c; this.c1 = c + w - 1;
      this.col = null; this.t = 0;
    }
    defaultCondition() { return !this.player.grounded && this.distanceTo(this.player) < T * 6; }
    onFire() {
      const p = this.player, P = p.T, g = P.gravity * P.fallMul;
      let x = p.centerX, y = p.y + p.h, vx = p.vx, vy = p.vy;
      for (let i = 0; i < 240 && y < this.floorY; i++) { // 2 s of flight at 120 Hz
        vy = Math.min(vy + (vy > 0 ? g : P.gravity) / 120, P.maxFall);
        x += vx / 120; y += vy / 120;
      }
      this.col = U.clamp(Math.floor(x / T), this.c0, this.c1);
      this.t = 0;
      this.stage.emit('rumble', { x: this.col * T + 8, y: this.floorY });
    }
    tick(dt) { if (this.fired) this.t += dt; }
    get warnT() { return this.def.warn ?? 0.32; }
    get burning() { return this.fired && this.t >= this.warnT && this.t < this.warnT + (this.def.burn ?? 0.9); }
    flameRect() { const h = (this.def.h || 3) * T; return { x: this.col * T + 2, y: this.floorY - h, w: T - 4, h }; }
    kills(p) { return this.burning && U.overlap(p, this.flameRect()); }
  }

  // Water. at: [c, r, w, h]. Inside it you sink slowly and can swim up with jump.
  class Water extends Trap {
    constructor(def, stage) { super(def, stage); this.rect = tileRect(def.at); this.fired = true; }
    wets(p) { return U.overlap(p, { x: this.rect.x, y: this.rect.y + 4, w: this.rect.w, h: this.rect.h - 4 }); }
  }

  // ---- Moving platforms, lifts and pipes ----

  // A platform that travels back and forth for ever. at: [c, r, w], path: [dx, dy] in tiles,
  // period: seconds for the round trip (it pauses briefly at each end), offset: seconds.
  // when: it waits at home until triggered. reverseWhen: a trigger that turns it round mid-trip
  // (once) - the platform you were jumping for heads back the way it came. oneWay: a plank
  // you can jump up through. h: height in px (16 for a block, 8 for a plank).
  class Platform extends Trap {
    constructor(def, stage) {
      super(def, stage);
      const [c, r, w = 2] = def.at;
      const h = def.h || (def.oneWay ? 8 : T);
      this.home = { x: c * T, y: r * T };
      this.solid = { x: c * T, y: r * T, w: w * T, h, active: true, oneWay: !!def.oneWay, dx: 0, dy: 0 };
      stage.world.dynamicSolids.push(this.solid);
      this.path = def.path || [3, 0];
      this.period = def.period || 3;
      this.u = (def.offset || 0) % this.period;
      if (!def.when) this.fired = true;
      this.place();
    }
    bounds() { return this.solid; }
    // 0..1 along the path: ease out of each end, a short rest at each end.
    get k() {
      const ph = ((this.u % this.period) + this.period) % this.period / this.period;
      const tri = ph < 0.5 ? ph * 2 : (1 - ph) * 2, rest = 0.12;
      const v = U.clamp((tri - rest) / (1 - 2 * rest), 0, 1);
      return v * v * (3 - 2 * v);
    }
    place() {
      const s = this.solid, k = this.k;
      const nx = this.home.x + this.path[0] * T * k, ny = this.home.y + this.path[1] * T * k;
      s.dx = nx - s.x; s.dy = ny - s.y; s.x = nx; s.y = ny;
    }
    onFire() { this.stage.emit('rumble', center(this.solid)); }
    tick(dt) {
      if (this.def.reverseWhen && !this.turned && this.fired && this.test(this.def.reverseWhen)) {
        // The mirrored phase is the same position heading the other way.
        this.turned = true;
        this.u = this.period - (((this.u % this.period) + this.period) % this.period);
        this.stage.emit('whoosh', center(this.solid));
        if (this.def.say) this.stage.emit('say', { text: this.def.say, x: this.solid.x + this.solid.w / 2, y: this.solid.y - 20 });
      }
      if (this.fired) { this.u += dt; this.place(); }
    }
    stateKey() { return `P${Math.floor(((this.u % this.period) + this.period) % this.period / 0.05)}${this.turned ? 't' : ''}`; }
  }

  // A lift: stand on it and it carries you along `legs` ([[dx, dy], ...] in tiles) at `speed`.
  // After `wait` seconds at the end (and once you've stepped off) it goes back home, so a lift
  // never strands you. The tricks are in the legs: a cargo lift that overshoots the floor
  // ([[0, -9], [0, 2]]), or one that changes its mind halfway ([[0, -4], [0, 4]]).
  class Lift extends Trap {
    constructor(def, stage) {
      super(def, stage);
      const [c, r, w = 3] = def.at;
      this.home = { x: c * T, y: r * T };
      this.solid = { x: c * T, y: r * T, w: w * T, h: def.h || 8, active: true, oneWay: def.oneWay !== false, dx: 0, dy: 0 };
      stage.world.dynamicSolids.push(this.solid);
      this.legs = def.legs || [[0, -6]];
      this.mode = 'idle'; this.leg = 0; this.timer = 0; this.target = null;
    }
    bounds() { return this.solid; }
    defaultCondition() { return this.stage.standingOn(this.solid); }
    update(dt) {
      if (this.mode === 'idle' && (this.def.when ? this.test(this.def.when) : this.defaultCondition())) {
        this.timer = this.def.delay ?? 0.25; this.mode = 'starting';
      }
      if (this.mode === 'starting' && (this.timer -= dt) <= 0) {
        this.mode = 'going'; this.leg = 0; this.target = null;
        if (!this.fired) this.fire(); else this.stage.emit('rumble', center(this.solid));
      }
      const s = this.solid;
      s.dx = 0; s.dy = 0;
      if (this.mode === 'going' || this.mode === 'returning') {
        if (!this.target) {
          if (this.mode === 'going') {
            const [dx, dy] = this.legs[this.leg];
            this.target = { x: s.x + dx * T, y: s.y + dy * T };
          } else this.target = { x: this.home.x, y: this.home.y };
        }
        const dx = this.target.x - s.x, dy = this.target.y - s.y, d = Math.hypot(dx, dy);
        const sp = (this.def.speed || 70) * dt;
        const nx = d <= sp ? this.target.x : s.x + dx / d * sp, ny = d <= sp ? this.target.y : s.y + dy / d * sp;
        s.dx = nx - s.x; s.dy = ny - s.y; s.x = nx; s.y = ny;
        if (d <= sp) {
          this.target = null;
          if (this.mode === 'going' && ++this.leg < this.legs.length) this.stage.emit('rumble', center(s));
          else if (this.mode === 'going') { this.mode = 'waiting'; this.timer = this.def.wait ?? 1.2; this.stage.emit('bonk', center(s)); }
          else this.mode = 'idle';
        }
      } else if (this.mode === 'waiting') {
        if (this.def.wait === null) return;
        if (!this.stage.standingOn(s)) this.timer -= dt;
        if (this.timer <= 0) this.mode = 'returning';
      }
    }
    get moving() { return this.mode === 'going' || this.mode === 'returning'; }
    stateKey() { return `L${this.mode[0]}${this.leg}${Math.round(Math.max(0, this.timer) * 5)}`; }
  }

  // A pipe. at: [c, r] = left tile of the 2-wide mouth (the mouth is the top of solid tiles in
  // the map for an upward pipe; dir 'up' is entered by standing on it for `hold` s). dir
  // 'left'/'right' pipes face sideways: walk into the mouth (the opening tile row r, r+1 must be
  // open). to: [c, r] = the tile the player comes out standing above (on another pipe's mouth
  // or any floor). len: how many tiles of pipe body to draw below/behind the mouth.
  class Pipe extends Trap {
    constructor(def, stage) {
      super(def, stage);
      const [c, r] = def.at;
      this.dir = def.dir || 'up';
      this.rect = this.dir === 'up' ? { x: c * T, y: r * T, w: 2 * T, h: T }
        : { x: c * T, y: r * T, w: T, h: 2 * T };
      this.hold = 0; this.armed = true; this.warpT = 0;
    }
    defaultCondition() { return false; }
    inMouth(p) {
      const r = this.rect;
      if (this.dir === 'up') return p.grounded && Math.abs(p.y + p.h - r.y) < 1.5 &&
        p.centerX > r.x + 5 && p.centerX < r.x + r.w - 5;
      const into = this.dir === 'left' ? p.x + p.w >= r.x - 1 && p.x < r.x + 4 && p.vx >= 0
        : p.x <= r.x + r.w + 1 && p.x + p.w > r.x + r.w - 4 && p.vx <= 0;
      return into && p.y + p.h > r.y + 4 && p.y < r.y + r.h - 4;
    }
    afterPlayer(p) {
      if (p.dead) return;
      if (!this.armed) { if (!this.inMouth(p)) this.armed = true; return; }
      if (this.inMouth(p)) this.hold += KF.STEP; else this.hold = 0;
      if (this.hold < (this.def.hold ?? (this.dir === 'up' ? 0.3 : 0.08))) return;
      const [tc, tr] = this.def.to;
      p.x = tc * T + T - p.w / 2; p.y = tr * T - p.h;
      if (this.def.toSide) p.x = tc * T + (this.def.toSide > 0 ? 2 * T + 1 : -p.w - 1);
      p.prevX = p.x; p.prevY = p.y; p.vx = this.def.pushX || 0; p.vy = -(this.def.pop ?? 150);
      p.grounded = false; p.jumping = false;
      this.hold = 0; this.warpT = 0.35;
      for (const other of this.stage.traps) if (other instanceof Pipe) other.armed = false;
      if (!this.fired) this.fire();
      this.stage.emit('pipe', { x: p.centerX, y: p.y + p.h });
    }
    tick(dt) { this.warpT = Math.max(0, this.warpT - dt); }
    stateKey() { return `p${this.armed ? 1 : 0}${Math.round(this.hold * 20)}`; }
  }

  // ---- Disguised architecture ----

  // A piece of the level that moves: a wall that slides out, a floor that rises into a pillar or
  // sinks away, a ledge that drops while you're in the air, a ceiling that comes down. Until it
  // is triggered it is drawn exactly like the tiles around it (it is baked with them).
  //   at: [c, r, w, h]   the tiles it takes over (they must be in the map)
  //   legs: [[dx, dy, speed?, pause?], ...]  tiles; speed in px/s (default def.speed or 160);
  //         pause: seconds it waits after that leg before the next
  //   home: true         after the last leg it waits `hold` s (default 1) and glides back
  //   ease: 0.15         seconds to reach full speed (a heavy thing starts slowly; 0 = instant)
  //   Default trigger: the player within `near` tiles (default 2). It pushes and crushes like any
  //   moving solid (js/stage.js); riding on it carries you.
  class Slab extends Trap {
    constructor(def, stage) {
      super(def, stage);
      const r = tileRect(def.at);
      this.tiles = stage.claimTiles(def.at);
      this.home = { x: r.x, y: r.y };
      this.solid = { ...r, active: true, dx: 0, dy: 0, oneWay: !!def.oneWay };
      stage.world.dynamicSolids.push(this.solid);
      this.legs = def.legs || [[0, -2]];
      this.leg = 0; this.target = null; this.timer = 0; this.mode = 'idle'; this.legT = 0;
    }
    bounds() { return this.solid; }
    defaultCondition() { return this.distanceTo(this.player) < (this.def.near ?? 2) * T; }
    onFire() { this.mode = 'moving'; this.stage.emit('rumble', center(this.solid)); }
    get moving() { return this.mode === 'moving' || this.mode === 'returning'; }
    tick(dt) {
      const s = this.solid;
      if (this.mode === 'pause' || this.mode === 'hold') {
        if ((this.timer -= dt) > 0) return;
        this.mode = this.mode === 'hold' ? 'returning' : 'moving';
        this.legT = 0;
        if (this.mode === 'returning') this.stage.emit('rumble', center(s));
      }
      if (!this.moving) return;
      if (!this.target) {
        if (this.mode === 'returning') this.target = { x: this.home.x, y: this.home.y, speed: this.def.returnSpeed || 90 };
        else {
          const [dx, dy, speed] = this.legs[this.leg];
          this.target = { x: s.x + dx * T, y: s.y + dy * T, speed: speed || this.def.speed || 160 };
        }
      }
      this.legT += dt;
      const ease = this.def.ease ?? 0.12, k = ease > 0 ? Math.min(1, 0.25 + this.legT / ease) : 1;
      const sp = this.target.speed * k * dt;
      const dx = this.target.x - s.x, dy = this.target.y - s.y, d = Math.hypot(dx, dy);
      const nx = d <= sp ? this.target.x : s.x + dx / d * sp, ny = d <= sp ? this.target.y : s.y + dy / d * sp;
      s.dx = nx - s.x; s.dy = ny - s.y; s.x = nx; s.y = ny;
      if (d > sp) return;
      const wasDown = dy > 0;
      this.target = null;
      if (this.mode === 'returning') { this.mode = 'idle'; this.stage.markDone(this.id); return; }
      if (wasDown && Math.abs(dy) >= T) this.stage.emit('slam', { x: s.x + s.w / 2, y: s.y + s.h, w: s.w });
      const pause = this.legs[this.leg][3];
      this.leg++;
      if (this.leg < this.legs.length) { if (pause) { this.mode = 'pause'; this.timer = pause; } return; }
      this.stage.markDone(this.id);
      if (this.def.home) { this.mode = 'hold'; this.timer = this.def.hold ?? 1; this.leg = 0; }
      else this.mode = 'done';
    }
    stateKey() { return this.mode === 'idle' || this.mode === 'done' ? '' : `S${this.mode[0]}${this.leg}${Math.round(this.timer * 10)}`; }
  }

  // Floor you can't see. It is there all along (a safe way across a gap that looks deadly) and
  // shows itself once you stand on it, for the rest of that attempt only. at: [c, r, w].
  class GhostFloor extends Trap {
    constructor(def, stage) {
      super(def, stage);
      const [c, r, w = 2] = def.at;
      this.rect = tileRect([c, r, w, 1]);
      this.solid = { ...this.rect, active: true, oneWay: !!def.oneWay };
      stage.world.dynamicSolids.push(this.solid);
      this.showT = 0;
    }
    defaultCondition() { return this.stage.standingOn(this.solid) || this.touching(); }
    onFire() { this.stage.emit('bonk', center(this.rect)); }
    tick(dt) { if (this.fired) this.showT = Math.min(1, this.showT + dt * 6); }
  }

  // An exit that isn't one: it looks exactly like the real door, and stepping into it sends you
  // somewhere else (back down the hill, into the cellar...). at: [c, r] (bottom tile of the
  // door), to: [c, r] the tile you land standing above. It's gone for the rest of that attempt.
  class WarpDoor extends Trap {
    constructor(def, stage) {
      super(def, stage);
      const [c, r] = def.at;
      this.rect = { x: c * T, y: (r - 1) * T, w: T, h: 2 * T };
    }
    defaultCondition() {
      const r = this.rect;
      return U.overlap(this.player, { x: r.x + 3, y: r.y + 4, w: r.w - 6, h: r.h - 4 });
    }
    onFire() {
      const p = this.player, [tc, tr] = this.def.to;
      this.stage.emit('warp', { x: p.centerX, y: p.y + p.h / 2 });
      p.x = tc * T + T / 2 - p.w / 2; p.y = tr * T - p.h;
      p.prevX = p.x; p.prevY = p.y; p.vx = 0; p.vy = 0; p.grounded = false; p.jumping = false;
      this.stage.emit('warp', { x: p.centerX, y: p.y + p.h / 2, arrive: true });
    }
  }

  // A coin floating in the way. Most are just coins: you pick them up and they're paid out when you
  // finish the level. One with `boom` looks exactly the same and goes off when you touch it.
  // at: [c, r] the tile it floats in.
  class Coin extends Trap {
    constructor(def, stage) {
      super(def, stage);
      const [c, r] = def.at;
      this.rect = { x: c * T + 4, y: r * T + 4, w: 8, h: 8 };
    }
    defaultCondition() { return U.overlap(this.player, this.rect); }
    onFire() {
      if (this.def.boom) this.stage.emit('boom', center(this.rect));
      else { this.stage.coins = (this.stage.coins || 0) + 1; this.stage.emit('coin', center(this.rect)); }
    }
    kills(p) {
      return !!this.def.boom && this.fired && this.fireT < 0.2 &&
        U.overlap(p, { x: this.rect.x - 12, y: this.rect.y - 12, w: 32, h: 32 });
    }
  }

  for (const C of [Crusher, DoorRun, Slab]) C.prototype.ownDone = true;

  KF.Traps = {
    types: {
      collapse: Collapse, spikes: PopSpikes, movingSpikes: MovingSpikes, pulseBeam: PulseBeam,
      conveyor: Conveyor, dartLauncher: DartLauncher, crusher: Crusher, spring: Spring, shy: Shy,
      doorRun: DoorRun, fakeDoor: FakeDoor, gravity: GravityZone, reverse: ReverseZone,
      hidden: HiddenBlock, taunt: Taunt, mover: Mover, fakeFloor: FakeFloor, lureFloor: LureFloor,
      wind: Wind, blink: Blink, axe: Axe, swingHammer: SwingHammer, lookSaw: LookSaw,
      lunger: Lunger, ambushFlame: AmbushFlame, water: Water,
      platform: Platform, lift: Lift, pipe: Pipe,
      slab: Slab, ghostFloor: GhostFloor, warpDoor: WarpDoor, coin: Coin,
    },
    matchDeaths,
    // The attempt variant every retry uses on a level that isn't `changing`: the last one,
    // which has every trap the level was designed with (deaths 0 .. largest named + 1).
    lastVariant(def) {
      let max = -1;
      for (const t of def.traps || []) {
        const list = t.deaths === undefined ? [] : Array.isArray(t.deaths) ? t.deaths : [t.deaths];
        for (const s of list) max = Math.max(max, parseInt(s, 10));
      }
      return max + 1;
    },
    build(stage) {
      const out = [];
      for (const def of stage.def.traps || []) {
        const index = stage.def.traps.indexOf(def);
        if (!matchDeaths(def.deaths, stage.variant ?? stage.deaths)) continue;
        const C = this.types[def.type];
        if (!C) { console.warn('Unknown trap type:', def.type); continue; }
        const trap = new C(def, stage, index);
        out.push(trap);
      }
      return out;
    },
  };
})(window.KF);
