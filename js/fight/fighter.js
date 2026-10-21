'use strict';
// One-on-one fighter: movement, a small original moveset, blocking, hitstun, knockdowns and
// specials. Both the player and the AI drive a Fighter through the same input object:
//   { left, right, block, jump, punch, kick, special }  (jump/punch/kick/special = pressed this step)
(function (KF) {
  const U = KF.util;
  const FLOOR = 184;               // feet y in the arena
  const BOUNDS = [22, KF.VIEW_W - 22];
  const GRAV = 1250;

  // Hitbox [x0, x1, y0, y1] is relative to the feet, in the facing direction (px, at fight scale).
  const MOVES = {
    jab:   { pose: 'jab', start: 0.06, active: 0.07, rec: 0.13, dmg: 6, box: [8, 32, -48, -34], stun: 0.32, push: 70, chain: 'cross', sfx: 'punch' },
    cross: { pose: 'cross', start: 0.07, active: 0.07, rec: 0.17, dmg: 8, box: [8, 34, -48, -34], stun: 0.34, push: 90, chain: 'upper', sfx: 'punch' },
    upper: { pose: 'upper', start: 0.09, active: 0.09, rec: 0.3, dmg: 11, box: [2, 28, -66, -36], stun: 0.5, push: 130, down: true, sfx: 'heavy' },
    kick:  { pose: 'kick', startPose: 'windup', start: 0.13, active: 0.09, rec: 0.26, dmg: 12, box: [12, 46, -42, -22], stun: 0.4, push: 180, sfx: 'heavy' },
    air:   { pose: 'airkick', start: 0.04, active: 0.6, rec: 0.06, dmg: 9, box: [4, 32, -32, -6], stun: 0.34, push: 110, air: true, sfx: 'punch' },
    // specials (cost 50 meter)
    wave:  { pose: 'palm', start: 0.2, active: 0.08, rec: 0.32, cost: 50, shoot: 'wave', sfx: 'special' },
    rush:  { pose: 'cross', startPose: 'windup', start: 0.14, active: 0.3, rec: 0.32, dmg: 15, box: [2, 30, -48, -30], stun: 0.5, push: 190, down: true, dash: 340, cost: 50, sfx: 'special' },
    spin:  { pose: 'spin', start: 0.1, active: 0.5, rec: 0.3, dmg: 5, multi: 0.12, box: [-30, 34, -46, -24], stun: 0.26, push: 50, drift: 100, cost: 50, sfx: 'special' },
    stomp: { pose: 'stomp', start: 0.24, active: 0.08, rec: 0.32, cost: 50, shoot: 'quake', sfx: 'special' },
  };

  class Fighter {
    // def: { name, look, stats: { power, guard, health, speed, special }, color }
    constructor(def, x, facing) {
      this.def = def;
      this.name = def.name;
      this.stats = Object.assign({ power: 1, guard: 1, health: 100, speed: 1, special: 'wave' }, def.stats);
      this.sprites = KF.Sprites.buildSet(def.look, 1.8);
      this.color = def.color || '#7cf0ff';
      this.reset(x, facing);
    }
    reset(x, facing) {
      this.x = x; this.y = FLOOR; this.vx = 0; this.vy = 0;
      this.facing = facing;
      this.maxHp = this.stats.health; this.hp = this.maxHp;
      this.meter = this.meter || 0;
      this.state = 'idle'; this.t = 0;      // state timer
      this.move = null; this.moveT = 0; this.hitDone = false; this.lastMulti = -1; this.queued = null;
      this.stun = 0; this.airAttacked = false;
      this.combo = 0;                       // hits landed in the current combo (shown on the HUD)
      this.flash = 0;
    }
    get grounded() { return this.y >= FLOOR - 0.01; }
    get busy() { return ['attack', 'hit', 'block', 'blockstun', 'down', 'getup', 'ko', 'win'].includes(this.state); }
    get invulnerable() { return ['down', 'getup', 'ko'].includes(this.state); }
    hurtbox() { return { x: this.x - 9, y: this.y - 54, w: 18, h: 54 }; }
    setState(s) { if (this.state !== s) { this.state = s; this.t = 0; } }

    startMove(name) {
      const m = MOVES[name];
      if (m.cost) { if (this.meter < m.cost) return false; this.meter -= m.cost; }
      this.move = m; this.moveName = name; this.moveT = 0; this.hitDone = false; this.lastMulti = -1; this.queued = null;
      this.setState('attack');
      if (!m.air) this.vx = 0;
      return true;
    }

    // Seconds scale: speed upgrades make every phase of an attack quicker.
    phase() {
      const m = this.move, k = 1 / this.stats.speed, t = this.moveT;
      if (t < m.start * k) return 'start';
      if (t < (m.start + m.active) * k) return 'active';
      if (t < (m.start + m.active + m.rec) * k) return 'rec';
      return 'done';
    }

    update(dt, inp, opp, scene) {
      this.t += dt;
      if (this.flash > 0) this.flash -= dt * 5;
      const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);

      switch (this.state) {
        case 'ko': case 'win': break;
        case 'hit': case 'blockstun':
          this.stun -= dt;
          if (this.stun <= 0) this.setState('idle');
          break;
        case 'down':
          if (this.t > 0.75 && this.grounded) this.setState('getup');
          break;
        case 'getup':
          if (this.t > 0.3) this.setState('idle');
          break;
        case 'attack': {
          const m = this.move;
          this.moveT += dt;
          const ph = this.phase();
          if (m.dash && ph === 'active') this.vx = m.dash * this.facing;
          else if (m.drift && ph === 'active') this.vx = m.drift * this.facing;
          else if (!m.air && this.grounded) this.vx = 0;
          if (m.shoot && ph === 'active' && !this.hitDone) { this.hitDone = true; scene.spawnProjectile(this, m.shoot); }
          // Chains: press punch again during a punch to roll into the next hit.
          if (m.chain && inp.punch && ph !== 'start') this.queued = m.chain;
          if (this.queued && (ph === 'rec' || ph === 'done') && this.hitDone) { this.startMove(this.queued); break; }
          if (m.air && this.grounded && this.moveT > 0.05) { this.setState('idle'); this.move = null; break; }
          if (ph === 'done') { this.move = null; this.setState(this.grounded ? 'idle' : 'air'); }
          break;
        }
        default: { // idle / walk / block / air
          if (!this.grounded) {
            this.setState('air');
            if ((inp.kick || inp.punch) && !this.airAttacked) { this.airAttacked = true; this.startMove('air'); }
            break;
          }
          this.airAttacked = false;
          this.facing = opp.x > this.x ? 1 : -1;
          if (inp.block) { this.setState('block'); this.vx = 0; break; }
          if (inp.special && this.meter >= MOVES[this.stats.special].cost && this.startMove(this.stats.special)) break;
          if (inp.punch) { this.startMove('jab'); break; }
          if (inp.kick) { this.startMove('kick'); break; }
          if (inp.jump) { this.vy = -360; this.vx = dir * 105 * this.stats.speed; this.setState('air'); scene.fx.dust(this.x, FLOOR, 4); KF.Audio.sfx('jump'); break; }
          this.vx = dir * 74 * this.stats.speed * (dir === this.facing ? 1 : 0.8);
          this.setState(dir ? 'walk' : 'idle');
        }
      }

      // Physics.
      if (!this.grounded || this.vy < 0) {
        this.vy += GRAV * dt;
        this.y += this.vy * dt;
        if (this.y >= FLOOR) {
          this.y = FLOOR; this.vy = 0;
          if (this.state === 'air') { this.setState('idle'); scene.fx.dust(this.x, FLOOR, 3); }
          if (this.state === 'down' || this.state === 'ko') { scene.fx.dust(this.x, FLOOR, 8); scene.fx.shake(2, 0.15); }
        }
      }
      if (['hit', 'blockstun', 'down', 'ko'].includes(this.state) && this.grounded) this.vx = U.approach(this.vx, 0, 900 * dt);
      this.x = U.clamp(this.x + this.vx * dt, BOUNDS[0], BOUNDS[1]);
    }

    // Current attack hitbox in world space, or null.
    hitbox() {
      if (this.state !== 'attack' || !this.move || !this.move.box || this.phase() !== 'active') return null;
      const [a, b, y0, y1] = this.move.box;
      const x0 = this.facing > 0 ? this.x + a : this.x - b;
      return { x: x0, y: this.y + y0, w: b - a, h: y1 - y0 };
    }

    // Take a hit. Returns 'hit', 'block' or 'miss'.
    receive(m, attacker, scene) {
      if (this.invulnerable || this.state === 'win') return 'miss';
      const fromFront = Math.sign(attacker.x - this.x) === this.facing || attacker.x === this.x;
      const dmg = m.dmg * attacker.stats.power * this.stats.guard;
      if ((this.state === 'block' || this.state === 'blockstun') && fromFront && this.grounded) {
        this.hp = Math.max(1, this.hp - dmg * 0.12);
        this.setState('blockstun'); this.stun = 0.16;
        this.vx = -this.facing * m.push * 0.8;
        this.meter = Math.min(100, this.meter + 3);
        return 'block';
      }
      this.hp -= dmg;
      this.flash = 0.55;
      this.meter = Math.min(100, this.meter + 5);
      attacker.meter = Math.min(100, attacker.meter + 9);
      this.move = null;
      const away = Math.sign(this.x - attacker.x) || -this.facing;
      if (this.hp <= 0) {
        this.hp = 0; this.setState('ko');
        this.vy = -300; this.vx = away * 160; this.y -= 1;
      } else if (m.down || !this.grounded) {
        this.setState('down'); this.vy = -240; this.vx = away * m.push * 0.9; this.y -= 1;
      } else {
        this.setState('hit'); this.stun = m.stun; this.vx = away * m.push;
      }
      return 'hit';
    }

    // Which frame to draw.
    frame() {
      const F = this.sprites.frames, t = this.t;
      switch (this.state) {
        case 'walk': return F.walk[Math.floor(t * 8) % 4];
        case 'air': return this.vy < 0 ? F.rise[0] : F.fall[0];
        case 'block': case 'blockstun': return F.block[0];
        case 'hit': return F.stagger[0];
        case 'down': case 'ko': case 'getup': return F.down[0];
        case 'win': return F.victory[t < 0.5 ? Math.min(3, Math.floor(t * 8)) : 2 + (Math.floor(t * 3) % 2)];
        case 'attack': {
          const m = this.move, ph = this.phase();
          if (m.pose === 'spin') return F.spin[Math.floor(this.moveT * 14) % 2];
          if (ph === 'start' && m.startPose) return F[m.startPose][0];
          return F[m.pose][0];
        }
        default: return F.idle[Math.floor(t * 4) % 4];
      }
    }

    draw(ctx, cam = { x: 0, y: 0 }) {
      const fr = this.frame(), set = this.sprites, vl = KF.Vec.active();
      const x = vl ? this.x - cam.x : Math.round(this.x - cam.x), y = vl ? this.y - cam.y : Math.round(this.y - cam.y);
      // Shadow on the floor.
      ctx.globalAlpha = 0.35; ctx.fillStyle = '#000';
      const sw = Math.max(10, 26 - (FLOOR - this.y) * 0.1);
      ctx.fillRect(x - sw / 2, FLOOR - cam.y - 1, sw, 3);
      ctx.globalAlpha = 1;
      const lying = this.state === 'down' || this.state === 'ko' || (this.state === 'getup' && this.t < 0.15);
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(this.facing, 1);
      if (vl) { // smooth style: draw the pose as vector shapes (KF.Vec), same anchor and scale
        const fig = (dx, dy) => KF.Render.figure(ctx, fr, { set, dx, dy, flash: this.flash, crystal: set.crystal });
        if (lying && this.grounded) { ctx.rotate(-Math.PI / 2); fig(-10, 30); }
        else if (lying) { ctx.rotate(-0.6); fig(0, 0); }
        else fig(0, 0);
        ctx.restore();
        return;
      }
      const B = KF.Sprites.blit;
      if (lying && this.grounded) { ctx.rotate(-Math.PI / 2); B(ctx, fr, set, 'img', -10, 30); }
      else if (lying) { ctx.rotate(-0.6); B(ctx, fr, set); }
      else B(ctx, fr, set);
      if (this.flash > 0) {
        ctx.globalAlpha = Math.min(1, this.flash);
        if (lying && this.grounded) B(ctx, fr, set, 'flash', -10, 30); else if (!lying) B(ctx, fr, set, 'flash');
      }
      ctx.restore();
    }
  }

  KF.Fight = { Fighter, MOVES, FLOOR, BOUNDS };
})(window.KF);
