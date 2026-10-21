'use strict';
// Computer opponent. Difficulty d (0..1) controls reaction time, how often it blocks, how hard it
// presses, how long its combos are and how cleverly it uses its special. It produces the same
// input object a player does, so it plays by exactly the same rules.
(function (KF) {
  const U = KF.util;

  class AI {
    constructor(d, rng = Math.random) {
      this.d = U.clamp(d, 0, 1);
      this.rnd = rng;
      this.react = U.lerp(0.42, 0.09, this.d); // seconds between decisions
      this.wait = 0.5;                          // a beat before the first move
      this.plan = null;                         // { kind, t, ... }
      this.comboLeft = 0;
      this.inp = {};
    }
    chance(p) { return this.rnd() < p; }

    think(me, opp, scene) {
      const d = this.d, dist = Math.abs(opp.x - me.x), toward = opp.x > me.x ? 1 : -1;
      const oppAttacking = opp.state === 'attack' && opp.move && opp.phase() !== 'rec';
      const proj = scene.projectiles.find((p) => p.owner !== me && Math.sign(me.x - p.x) === Math.sign(p.vx) && Math.abs(me.x - p.x) < 120);
      // Defend: projectiles and incoming attacks.
      if (proj && this.chance(0.2 + 0.7 * d)) return this.chance(0.5) ? { kind: 'jump', dir: 0, t: 0.1 } : { kind: 'block', t: 0.45 };
      if (oppAttacking && dist < 70 && this.chance(0.12 + 0.68 * d)) return { kind: 'block', t: 0.32 };
      // Anti-air: uppercut an opponent jumping in.
      if (!opp.grounded && dist < 50 && opp.vy > -100 && this.chance(0.6 * d)) return { kind: 'punch', chain: 2 };
      // Special.
      const sp = me.stats.special, ready = me.meter >= 50;
      if (ready && this.chance(0.18 + 0.4 * d)) {
        if (sp === 'wave' || sp === 'stomp') { if (dist > 90) return { kind: 'special' }; }
        else if (dist < (sp === 'rush' ? 120 : 52)) return { kind: 'special' };
      }
      // Footsies.
      if (dist > 46) {
        if (dist < 110 && this.chance(0.06 + 0.14 * d)) return { kind: 'jump', dir: toward, t: 0.1, airKick: true };
        if (this.chance(0.25 + 0.55 * d) || dist > 150) return { kind: 'walk', dir: toward, t: U.lerp(0.25, 0.5, this.rnd()) };
        return { kind: 'wait', t: 0.3 };
      }
      if (this.chance(0.35 + 0.5 * d)) {
        if (this.chance(0.62)) return { kind: 'punch', chain: Math.round(this.rnd() * (0.6 + 2 * d)) };
        return { kind: 'kick' };
      }
      if (this.chance(0.4)) return { kind: 'walk', dir: -toward, t: 0.25 };
      return { kind: 'block', t: 0.3 };
    }

    // One physics step: returns this step's input.
    update(dt, me, opp, scene) {
      const inp = { left: false, right: false, block: false, jump: false, punch: false, kick: false, special: false };
      if (me.state === 'ko' || me.state === 'win' || opp.state === 'ko') return inp;
      this.wait -= dt;
      if (this.plan && this.plan.t !== undefined) this.plan.t -= dt;
      const planDone = !this.plan || (this.plan.t !== undefined && this.plan.t <= 0) || this.plan.fired;
      if (planDone && this.wait <= 0 && !me.busy) {
        this.plan = this.think(me, opp, scene);
        this.wait = this.react * U.lerp(0.7, 1.3, this.rnd());
        if (this.plan.kind === 'punch') this.comboLeft = this.plan.chain;
      }
      const p = this.plan;
      if (!p) return inp;
      switch (p.kind) {
        case 'walk': if (p.dir > 0) inp.right = true; else inp.left = true; break;
        case 'block': inp.block = true; break;
        case 'jump':
          if (!p.fired) { inp.jump = true; if (p.dir > 0) inp.right = true; if (p.dir < 0) inp.left = true; p.fired = true; p.t = 0.6; }
          break;
        case 'punch': inp.punch = !p.fired; p.fired = true; break;
        case 'kick': inp.kick = !p.fired; p.fired = true; break;
        case 'special': inp.special = !p.fired; p.fired = true; break;
      }
      // Jump-in air kick when close enough; keep holding toward while airborne.
      if (p.kind === 'jump' && p.airKick && !me.grounded && Math.abs(opp.x - me.x) < 46 && me.vy > -120) inp.kick = true;
      // Continue a planned punch chain once the previous hit has connected.
      if (me.state === 'attack' && me.move && me.move.chain && me.hitDone && this.comboLeft > 0) { inp.punch = true; this.comboLeft--; }
      return inp;
    }
  }
  KF.Fight.AI = AI;
})(window.KF);
