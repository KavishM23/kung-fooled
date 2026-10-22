'use strict';
// Gameplay simulation for one attempt at a stage: world + player + traps + win/lose rules.
// No drawing or audio here; it reports what happened through `events` for the scene to present.
(function (KF) {
  const U = KF.util;

  class Stage {
    // memory: survives between attempts of one visit (e.g. hidden zones you've already found).
    constructor(def, deaths = 0, memory = { seen: {} }) {
      this.def = def;
      this.deaths = deaths; // deaths so far on this stage: selects trap variants
      this.memory = memory;
      this.events = [];
      this.world = new KF.World(def);
      const sp = this.world.spawn;
      this.rule = KF.Rules ? KF.Rules.get(def) : {};
      this.player = new KF.Player(sp.x, sp.y, KF.Rules ? KF.Rules.tuning(this.rule) : KF.PlayerTuning);
      this.player.iceAll = !!this.rule.ice;
      this.t = 0;
      this.state = 'play'; // play | dead | won
      this.cause = null;
      this.firedIds = {};
      this.claimed = [];
      this.traps = KF.Traps.build(this);
      // SUPERHOT fights inside the level: enemies, your gun, your shots.
      this.enemies = this.traps.filter((tr) => tr instanceof KF.Traps.types.enemy);
      this.boss = this.enemies.find((e) => e.boss) || null;
      this.gun = null; this.shots = [];
      this.attackCool = 0; this.burst = 0; this.timeK = 1;
      const d = this.world.door;
      this.doorStart = d ? { x: d.x, y: d.y } : null;
    }

    emit(type, data) { this.events.push(Object.assign({ type }, data)); }
    hasFired(id) { return !!this.firedIds[id]; }
    markFired(id) { if (id) this.firedIds[id] = true; }

    // Remove tiles from the grid for a trap, remembering how they looked.
    claimTiles(at) {
      const [c, r, w = 1, h = 1] = at, out = [];
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) out.push([c + i, r + j, this.world.visualId(c + i, r + j)]);
      this.world.claim(at);
      return out;
    }

    standingOn(s) {
      const p = this.player;
      if (!p.grounded || s.active === false) return false;
      const feet = p.gravDir > 0 ? p.y + p.h : p.y;
      const edge = p.gravDir > 0 ? s.y : s.y + s.h;
      return Math.abs(feet - edge) < 1 && p.x < s.x + s.w && p.x + p.w > s.x;
    }

    kill(cause) {
      if (this.state !== 'play') return;
      this.state = 'dead';
      this.cause = cause;
      this.player.dead = true;
      this.emit('death', { cause, x: this.player.centerX, y: this.player.y + this.player.h / 2 });
    }

    win() {
      if (this.state !== 'play') return;
      this.state = 'won';
      this.emit('win', { x: this.player.centerX, y: this.player.y });
    }

    checkKills() {
      for (const tr of this.traps) if (tr.kills(this.player)) { this.kill(tr.def.type); return true; }
      return this.state !== 'play';
    }

    step(dt, input) {
      const p = this.player, w = this.world;
      dt *= this.rule.timeScale || 1;
      // SUPERHOT: with no input the whole world (you included) crawls; any input runs it at speed.
      // A punch or a shot keeps time moving for a moment, so the blow lands.
      if (this.rule.superhot) {
        if (input.punch || input.shoot) this.burst = 0.22;
        this.timeK = input.left || input.right || input.jumpHeld || input.jumpPressed || this.burst > 0 ? 1 : 0.06;
        this.burst -= dt;
        dt *= this.timeK;
      }
      if (this.state !== 'play') { p.prevX = p.x; p.prevY = p.y; return; }
      this.t += dt;

      // Moving solids: remember what the player rides, move everything, then carry / push.
      const riding = w.dynamicSolids.filter((s) => this.standingOn(s));
      for (const s of w.dynamicSolids) { s.dx = 0; s.dy = 0; }
      for (const tr of this.traps) tr.update(dt);
      if (this.checkKills()) return;
      for (const s of riding) {
        if (s.dx) KF.Physics.moveX(p, w, s.dx);
        if (s.dy) p.y += s.dy;
      }
      for (const s of w.dynamicSolids) {
        if (!(s.dx || s.dy) || s.active === false || s.oneWay || riding.includes(s) || !U.overlap(p, s)) continue;
        if (s.dx > 0) p.x = s.x + s.w; else if (s.dx < 0) p.x = s.x - p.w;
        else if (s.dy > 0) p.y = s.y + s.h; else p.y = s.y - p.h;
      }

      p.reversed = this.traps.some((tr) => tr.reverses && tr.reverses(p)) !== !!this.rule.reverse;
      p.windX = this.rule.wind || 0;
      for (const tr of this.traps) if (tr.push) p.windX += tr.push(p);
      for (const tr of this.traps) tr.prePlayer(p);
      p.update(dt, input, w);
      for (const tr of this.traps) tr.afterPlayer(p);
      for (const e of p.events) this.emit(e.type, { ...e, x: p.centerX, y: p.gravDir > 0 ? p.y + p.h : p.y, g: p.gravDir });
      p.events.length = 0;
      if (this.enemies.length) this.fight(dt, input);
      if (this.checkKills()) return;

      if (w.spikeHit(p)) return this.kill('spikes');
      if (w.overlapsSolid(p.x + 1, p.y + 1, p.w - 2, p.h - 2, null)) return this.kill('crush');
      if (p.y > w.pixelH + 16 || (p.gravDir < 0 && p.y + p.h < -32)) return this.kill('pit');

      const d = w.door;
      // A running door can't be caught mid-sprint; it has to stop first.
      if (d && !d.moving && !this.locked && U.overlap(p, { x: d.x + 3, y: d.y + (d.flipped ? 0 : 4), w: d.w - 6, h: d.h - 4 })) this.win();
    }

    // While THE SYSTEM stands, the exit is locked.
    get locked() { return !!(this.boss && this.boss.alive); }

    // Your punches and shots against the level's enemies (see Enemy in traps.js).
    //   input.punch / input.shoot  pressed this step;  input.aim {x, y} in world px (optional)
    fight(dt, input) {
      const p = this.player;
      this.attackCool -= dt;
      p.punchT = Math.max(0, (p.punchT || 0) - dt);
      if (input.punch && this.attackCool <= 0) {
        this.attackCool = 0.24; p.punchT = 0.16;
        const box = { x: p.facing > 0 ? p.x + p.w - 2 : p.x - 22, y: p.y, w: 24, h: p.h };
        let hit = false;
        for (const e of this.enemies) if (e.alive && U.overlap(box, e.bounds())) hit = e.hurt(1, p.facing, this) || hit;
        if (!hit) this.emit('swing', { x: p.centerX, y: p.y + 8 });
      }
      if (input.shoot && this.gun && this.attackCool <= 0) {
        const hx = p.centerX + p.facing * 8, hy = p.y + 7;
        let ax = p.facing, ay = 0;
        if (input.aim) { const tx = input.aim.x - hx, ty = input.aim.y - hy, d = Math.hypot(tx, ty) || 1; ax = tx / d; ay = ty / d; if (ax) p.facing = Math.sign(ax); }
        if (this.gun.ammo > 0) { // fire
          this.gun.ammo--; this.attackCool = 0.2;
          this.shots.push({ x: hx, y: hy, vx: ax * 420, vy: ay * 420, dmg: 2, t: 0, kind: 'bullet' });
          this.emit('gunshot', { x: hx, y: hy });
        } else { // empty: throw it
          this.gun = null; this.attackCool = 0.25;
          this.shots.push({ x: hx, y: hy, vx: ax * 300, vy: ay * 300 - 40, dmg: 1, t: 0, kind: 'gun' });
          this.emit('throw', { x: hx, y: hy });
        }
      }
      for (const b of this.shots) {
        b.t += dt; b.x += b.vx * dt; b.y += b.vy * dt; if (b.kind === 'gun') b.vy += 500 * dt;
        if (this.world.overlapsSolid(b.x - 1, b.y - 1, 2, 2, null) || b.t > 3) { b.dead = true; continue; }
        const box = { x: b.x - 3, y: b.y - 3, w: 6, h: 6 };
        for (const e of this.enemies) {
          if (!b.dead && e.alive && U.overlap(box, e.bounds())) { e.hurt(b.dmg, Math.sign(b.vx) || 1, this); b.dead = true; }
          for (const eb of e.bullets) if (!b.dead && !eb.dead && Math.abs(eb.x - b.x) < 5 && Math.abs(eb.y - b.y) < 5) { eb.dead = true; b.dead = true; this.emit('clink', { x: b.x, y: b.y }); }
        }
      }
      this.shots = this.shots.filter((b) => !b.dead);
    }

    // 1 = the full distance from spawn to the door remains, 0 = at the door. The HUD's "enemy" bar.
    get remaining() {
      const d = this.world.door;
      if (!d) return 1;
      const sx = this.world.spawn.x;
      const total = Math.max(32, Math.abs(this.doorStart.x + 8 - sx));
      return U.clamp(Math.abs(d.x + 8 - this.player.centerX) / total, 0, 1);
    }
  }
  KF.Stage = Stage;
})(window.KF);
