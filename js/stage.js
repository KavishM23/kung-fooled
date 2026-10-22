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
      this.part = 1;
      this.state = 'play'; // play | dead | won
      this.cause = null;
      this.firedIds = {};
      this.claimed = [];
      this.traps = KF.Traps.build(this);
      const d = this.world.door;
      this.doorStart = d ? { x: d.x, y: d.y } : null;
      this.combat = def.combat ? new KF.StageCombat(this, def.combat) : null;
      this.timePulse = 0;
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
      if (this.rule.superhot) {
        this.timePulse = Math.max(0, this.timePulse - dt);
        if (input.shoot || input.melee) this.timePulse = 0.18;
        this.timeK = input.left || input.right || input.jumpHeld || input.jumpPressed || this.timePulse > 0 ? 1 : 0.06;
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
      p.inWater = this.traps.some((tr) => tr.wets && tr.wets(p));
      for (const tr of this.traps) tr.prePlayer(p);
      p.update(dt, input, w);
      if (this.def.parts) {
        const part = 1 + this.def.parts.filter((x) => p.centerX >= x).length;
        if (part > this.part) { this.part = part; this.emit('part', { part }); }
      }
      for (const tr of this.traps) tr.afterPlayer(p);
      for (const e of p.events) this.emit(e.type, { ...e, x: p.centerX, y: p.gravDir > 0 ? p.y + p.h : p.y, g: p.gravDir });
      p.events.length = 0;
      if (this.checkKills()) return;

      if (w.spikeHit(p)) return this.kill('spikes');
      if (w.overlapsSolid(p.x + 1, p.y + 1, p.w - 2, p.h - 2, null)) return this.kill('crush');
      if (p.y > w.pixelH + 16 || (p.gravDir < 0 && p.y + p.h < -32)) return this.kill('pit');

      if (this.combat) this.combat.update(dt, input);
      if (this.state !== 'play') return;
      const d = w.door;
      // A running door can't be caught mid-sprint; it has to stop first.
      if (d && !d.moving && (!this.combat || this.combat.cleared) && U.overlap(p, { x: d.x + 3, y: d.y + (d.flipped ? 0 : 4), w: d.w - 6, h: d.h - 4 })) this.win();
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
