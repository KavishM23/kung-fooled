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
//             near: 3      player within 3 tiles of the trap
//             time: 1.5    seconds since (re)spawn
//             after: 'id'  another trap has fired
//             touch: true  player touches the trap
//             airborne / grounded: true
//           Without `when`, each type has a sensible default (collapse = stood on, etc).
//   delay   seconds between trigger and firing (traps visibly shake/warn during it)
//   deaths  which attempts the trap exists on: 0, [0, 2], ['1+'], [1, '3+'] ...
//           (deaths so far on this stage; lets a trap fire on attempt 1, sleep, then move)
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
      const s = this.stage, p = s.player;
      if (w.x !== undefined && p.centerX < w.x * T) return false;
      if (w.xl !== undefined && p.centerX > w.xl * T) return false;
      if (w.zone && !U.overlap(p, tileRect(w.zone))) return false;
      if (w.near !== undefined && this.distanceTo(p) > w.near * T) return false;
      if (w.time !== undefined && s.t < w.time) return false;
      if (w.after !== undefined && !s.hasFired(w.after)) return false;
      if (w.touch && !this.touching()) return false;
      if (w.airborne && p.grounded) return false;
      if (w.grounded && !p.grounded) return false;
      return true;
    }
    condition() { return this.def.when ? this.test(this.def.when) : this.defaultCondition(); }
    defaultCondition() { return false; }
    get warning() { return !this.fired && this.pending >= 0; }

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
    constructor(def, stage) {
      super(def, stage);
      this.rect = tileRect(def.at);
      this.tiles = stage.claimTiles(def.at);
      this.solid = { ...this.rect, active: true };
      stage.world.dynamicSolids.push(this.solid);
      this.drop = 0; this.vy = 0;
    }
    defaultCondition() { return this.stage.standingOn(this.solid); }
    onFire() {
      this.solid.active = false;
      this.stage.emit('crumble', { x: this.rect.x + this.rect.w / 2, y: this.rect.y, w: this.rect.w });
    }
    tick(dt) {
      if (this.fired) { this.vy = Math.min(this.vy + 1400 * dt, 700); this.drop += this.vy * dt; }
    }
  }
  Collapse.prototype.defaultDelay = 0.05;

  // Spikes hidden in a floor/ceiling/wall that shoot out. at: [c, r, w], dir: up|down|left|right.
  class PopSpikes extends Trap {
    constructor(def, stage) {
      super(def, stage);
      const [c, r, w = 1] = def.at;
      this.dir = def.dir || 'up';
      const vertical = this.dir === 'up' || this.dir === 'down';
      this.rect = vertical ? tileRect([c, r, w, 1]) : tileRect([c, r, 1, w]);
      this.cells = [];
      for (let i = 0; i < w; i++) this.cells.push(vertical ? [c + i, r] : [c, r + i]);
      this.raise = 0;
    }
    defaultCondition() { return this.distanceTo(this.player) < T * 1.5; }
    onFire() { this.stage.emit('spikes', center(this.rect)); }
    tick(dt) { if (this.fired) this.raise = Math.min(1, this.raise + dt / 0.06); }
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
    push(p) {
      if (!p.grounded || p.gravDir < 0 || Math.abs(p.y + p.h - (this.rect.y + 4)) > 2) return 0;
      return p.x + p.w > this.rect.x && p.x < this.rect.x + this.rect.w ? this.def.speed || 75 : 0;
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
        if (d <= sp) { door.x = this.target.x; door.y = this.target.y; this.moving = false; door.moving = false; this.leg++; }
        else { door.x += dx / d * sp; door.y += dy / d * sp; }
        door.runT = (door.runT || 0) + dt;
      }
    }
  }

  // Looks exactly like the exit (minus the lantern). Touch it and it punches you. at: [c, r].
  class FakeDoor extends Trap {
    constructor(def, stage) {
      super(def, stage);
      const [c, r] = def.at;
      this.rect = { x: c * T, y: (r - 1) * T, w: T, h: 2 * T };
      this.dirX = 1;
    }
    defaultCondition() {
      const r = this.rect;
      return U.overlap(this.player, { x: r.x + 3, y: r.y + 4, w: r.w - 6, h: r.h - 4 });
    }
    onFire() {
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

  KF.Traps = {
    types: {
      collapse: Collapse, spikes: PopSpikes, movingSpikes: MovingSpikes, pulseBeam: PulseBeam,
      conveyor: Conveyor, dartLauncher: DartLauncher, crusher: Crusher, spring: Spring, shy: Shy,
      doorRun: DoorRun, fakeDoor: FakeDoor, gravity: GravityZone, reverse: ReverseZone,
      hidden: HiddenBlock, taunt: Taunt, mover: Mover, fakeFloor: FakeFloor, wind: Wind, blink: Blink, axe: Axe,
    },
    matchDeaths,
    build(stage) {
      const out = [];
      for (const def of stage.def.traps || []) {
        const index = stage.def.traps.indexOf(def);
        if (!matchDeaths(def.deaths, stage.deaths)) continue;
        const C = this.types[def.type];
        if (!C) { console.warn('Unknown trap type:', def.type); continue; }
        const trap = new C(def, stage, index);
        out.push(trap);
      }
      return out;
    },
  };
})(window.KF);
