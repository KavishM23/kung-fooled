'use strict';
// Gameplay simulation for one attempt at a stage: world + player + traps + win/lose rules.
// No drawing or audio here; it reports what happened through `events` for the scene to present.
(function (KF) {
  const U = KF.util;

  class Stage {
    // memory: survives between attempts of one visit: only the checkpoint you've reached. What
    // the traps showed you is wiped every attempt (memory.seen starts empty), so a retry looks
    // exactly like the first try and the only record of a trap is the player's own memory.
    constructor(def, deaths = 0, memory = { seen: {} }) {
      this.def = def;
      this.deaths = deaths; // deaths so far on this stage
      // Which trap variant this attempt uses. Ordinary levels are the same on every retry; a level
      // marked `changing` deliberately rearranges itself after each death (js/traps.js).
      this.variant = def.changing ? deaths : KF.Traps.lastVariant(def);
      memory.seen = {};
      this.memory = memory;
      this.doneIds = {};
      this.dt = 0;
      // Loitering (see loiter() below): how long the player has stood on one spot.
      this.loiterT = 0; this.loiterX = null; this.moved = false; this.loiterFired = 0;
      this.events = [];
      this.world = new KF.World(def);
      const sp = this.world.spawn;
      this.rule = KF.Rules ? KF.Rules.get(def) : {};
      this.player = new KF.Player(sp.x, sp.y, KF.Rules ? KF.Rules.tuning(this.rule) : KF.PlayerTuning);
      this.player.iceAll = !!this.rule.ice;
      this.t = 0;
      this.part = Math.min((def.doorLinks || []).length + 1, Math.max(1, memory.checkpoint || 1));
      this.guide = 0;
      this.state = 'play'; // play | dead | won
      this.cause = null;
      this.firedIds = {};
      this.claimed = [];
      this.traps = KF.Traps.build(this);
      const d = this.world.door;
      this.doorStart = d ? { x: d.x, y: d.y } : null;
      this.combat = def.combat ? new KF.StageCombat(this, def.combat) : null;
      if (this.part > 2 && this.combat) for (const enemy of this.combat.enemies) enemy.hp = 0;
      if (this.part > 1 && def.doorLinks) {
        const link = def.doorLinks[this.part - 2];
        if (link) {
          this.player.x = link.x - this.player.w / 2;
          this.player.y = link.y - this.player.h;
          this.player.prevX = this.player.x; this.player.prevY = this.player.y;
        }
      }
      this.timePulse = 0;
    }

    emit(type, data) { this.events.push(Object.assign({ type }, data)); }
    hasFired(id) { return !!this.firedIds[id]; }
    markFired(id) { if (id) this.firedIds[id] = true; }
    // A moving trap has finished its motion (chains: when: { done: 'id' }).
    markDone(id) { if (id) this.doneIds[id] = true; }
    isDone(id) { return !!this.doneIds[id]; }

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
      this.t += dt; this.dt = dt;

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
      for (const tr of this.traps) tr.afterPlayer(p);
      this.loiter(dt, input);
      for (const e of p.events) this.emit(e.type, { ...e, x: p.centerX, y: p.gravDir > 0 ? p.y + p.h : p.y, g: p.gravDir });
      p.events.length = 0;
      if (this.checkKills()) return;

      if (w.spikeHit(p)) return this.kill('spikes');
      if (w.overlapsSolid(p.x + 1, p.y + 1, p.w - 2, p.h - 2, null)) return this.kill('crush');
      if (p.y > w.pixelH + 16 || (p.gravDir < 0 && p.y + p.h < -32)) return this.kill('pit');

      if (this.combat) this.combat.update(dt, input);
      if (this.state !== 'play') return;
      const guide = this.def.guides && this.def.guides[this.guide];
      if (this.part === 2 && guide && U.overlap(p,
        { x: guide.x - 12, y: guide.y - 10, w: 40, h: 52 })) this.guide++;
      const d = w.door;
      const partDoor = w.partDoors[this.part - 1];
      const partUnlocked = this.part !== 2 || !this.combat || this.combat.cleared;
      if (partDoor && partUnlocked && U.overlap(p, { x: partDoor.x - 12, y: partDoor.y - 10, w: partDoor.w + 24, h: partDoor.h + 20 })) {
        if (!this.def.noGates) {
          // Entering a doorway settles the player onto its shelf. This makes the
          // next climb or descent start at the door instead of mid-fall.
          p.x = partDoor.x + (partDoor.w - p.w) / 2;
          p.y = partDoor.y + partDoor.h - p.h;
          p.prevX = p.x; p.prevY = p.y;
          p.vx = p.vy = 0; p.grounded = true;
        }
        this.part++;
        this.memory.checkpoint = Math.max(this.memory.checkpoint || 1, this.part);
        const link = this.def.doorLinks && this.def.doorLinks[this.part - 2];
        if (link) {
          p.x = link.x - p.w / 2; p.y = link.y - p.h;
          p.prevX = p.x; p.prevY = p.y;
          p.vx = p.vy = 0; p.grounded = false;
          p.gravDir = 1; p.jumping = false; p.launchT = 0;
        }
        this.emit('part', { part: this.part, x: p.centerX, y: p.y });
      }
      // A running door can't be caught mid-sprint; it has to stop first.
      if ((this.part > w.partDoors.length || !w.partDoors[0]) && d && !d.moving && (!this.combat || this.combat.cleared) && U.overlap(p, { x: d.x + 3, y: d.y + (d.flipped ? 0 : 4), w: d.w - 6, h: d.h - 4 })) this.win();
    }

    // Don't stand still. Once you've started moving, staying on one spot (within a few pixels) for
    // LOITER.wait seconds sets the floor under your feet going: it shakes, then drops away down to
    // the bottom of the map (you fall to whatever is below, or out of the level) and comes back a
    // moment later once you've gone. Riding a platform or lift doesn't count, and nor does time
    // that isn't passing (SUPERHOT). A level can switch it off with `noLoiter: true`.
    loiter(dt, input) {
      const p = this.player, w = this.world, L = Stage.LOITER;
      if (this.def.noLoiter) return;
      if (!this.moved) { if (input.left || input.right || input.jumpPressed) this.moved = true; else return; }
      const T = KF.TILE, feet = p.gravDir > 0 ? p.y + p.h + 1 : p.y - 1, r = Math.floor(feet / T);
      const cols = [Math.floor((p.x + 1) / T), Math.floor((p.x + p.w - 1) / T)];
      // Standing on ordinary ground: a solid tile of the map (not a trap's, not a moving solid).
      const onGround = p.grounded && p.gravDir > 0 && cols.some((c) => { const td = w.tileDef(c, r); return td && td.solid && !td.spike; }) &&
        !w.dynamicSolids.some((d) => this.standingOn(d));
      if (!onGround || this.loiterX === null || Math.abs(p.x - this.loiterX) > L.reach) {
        this.loiterX = p.x; this.loiterT = 0; return;
      }
      this.loiterT += dt;
      if (this.loiterT < L.wait - L.warn) return;
      // Time's up: the floor under you gives way (a lure floor with no lure: it shakes for
      // L.warn seconds, drops, and reforms once you're clear of it).
      const take = [...new Set(cols)].filter((c) => { const td = w.tileDef(c, r); return td && td.solid && !td.spike; });
      if (!take.length) return;
      const c0 = Math.min(...take), c1 = Math.max(...take);
      let depth = 0;
      while (r + depth < w.rows && take.every((c) => { const td = w.tileDef(c, r + depth); return td && td.solid; })) depth++;
      // The same spot again: set its old floor going rather than making a second one.
      const again = this.traps.find((t) => t.def.loiter && t.mode === 'ready' && t.def.at[1] === r && t.def.at[0] <= c0 && t.def.at[0] + t.def.at[2] > c1);
      if (again) again.rearm(L.warn);
      else {
        const def = { type: 'lureFloor', at: [c0, r, c1 - c0 + 1, depth], near: 0, delay: L.warn, reform: 1.6, loiter: true };
        const tr = new KF.Traps.types.lureFloor(def, this, -1);
        tr.mode = 'warning'; tr.timer = L.warn;
        this.traps.push(tr);
      }
      this.loiterFired++; this.loiterT = 0; this.loiterX = null;
      this.emit('rumble', { x: (c0 + (c1 - c0 + 1) / 2) * T, y: r * T });
      this.emit('say', { text: L.say[(this.loiterFired - 1) % L.say.length], x: p.centerX, y: p.y - 18 });
    }

    // 1 = the full distance from spawn to the door remains, 0 = at the door. The HUD's "enemy" bar.
    get remaining() {
      const d = this.world.partDoors[this.part - 1] || this.world.door;
      if (!d) return 1;
      const start = this.part > 1 ?
        (this.def.doorLinks && this.def.doorLinks[this.part - 2]) || this.world.partDoors[this.part - 2] :
        this.world.spawn;
      const total = Math.max(32, Math.hypot(d.x + 8 - start.x, d.y + 16 - start.y));
      return U.clamp(Math.hypot(d.x + 8 - this.player.centerX, d.y + 16 - (this.player.y + this.player.h / 2)) / total, 0, 1);
    }
  }
  // wait: seconds on one spot before the floor goes (the last `warn` of them it shakes);
  // reach: px you can shuffle about and still count as standing on the same spot.
  Stage.LOITER = { wait: 3.5, warn: 0.9, reach: 6, say: ['TOO SLOW!', 'NO LOITERING', 'KEEP MOVING', 'WAKE UP!'] };
  KF.Stage = Stage;
})(window.KF);
