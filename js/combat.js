'use strict';
// Combat shares the platformer's world, clock and collisions. No arena transition or DOM needed.
(function (KF) {
  const U = KF.util, T = KF.TILE;
  class StageCombat {
    constructor(stage, def) {
      this.stage = stage;
      this.health = 4; this.ammo = 6; this.reload = 0; this.cool = 0; this.invul = 0;
      this.meleeT = 0; this.attackPose = 0; this.shotT = 0;
      this.bullets = []; this.shards = []; this.kills = 0;
      this.enemies = def.enemies.map((e, i) => ({
        x: e.at[0] * T, y: (e.at[1] + 1) * T - (e.boss ? 42 : 26),
        w: e.boss ? 18 : 12, h: e.boss ? 42 : 26, vx: 0, vy: 0, gravDir: 1,
        hp: e.hp || (e.boss ? 10 : 2), maxHp: e.hp || (e.boss ? 10 : 2),
        boss: !!e.boss, name: e.name || 'SENTINEL', facing: -1,
        cool: 1.4 + i * 0.2, warn: 0, hit: 0, t: 0,
      }));
    }
    get remaining() { return this.enemies.filter((e) => e.hp > 0).length; }
    get cleared() { return this.remaining === 0; }
    emit(type, x, y) { this.stage.emit(type, { x, y }); }
    hurtEnemy(e, damage) {
      if (e.hp <= 0) return;
      e.hp = Math.max(0, e.hp - damage); e.hit = 0.15;
      this.emit('impact', e.x + e.w / 2, e.y + e.h / 2);
      if (e.hp) return;
      this.kills++;
      this.emit('shatter', e.x + 6, e.y + 12);
      // Deterministic pieces: identical gameplay replays produce identical shards.
      for (let i = 0; i < 24; i++) {
        const r = U.hash2(i, this.kills);
        this.shards.push({ x: e.x + 6, y: e.y + i % 24, vx: (r - 0.5) * 170,
          vy: -50 - U.hash2(i + 31, this.kills) * 140, rot: r * 6, life: 1.5, size: 1 + r * 3 });
      }
    }
    hurtPlayer(bullet, input) {
      const p = this.stage.player;
      if (this.invul > 0) return;
      if (input.block && Math.sign(bullet.vx) === -p.facing) {
        this.emit('blocked', p.centerX, p.y + 10); return;
      }
      this.health--; this.invul = 0.8;
      this.emit('damage', p.centerX, p.y + 10);
      if (this.health <= 0) this.stage.kill('crystal bullet');
    }
    fire(x, y, dx, dy, enemy = false) {
      const length = Math.hypot(dx, dy) || 1, speed = enemy ? 105 : 440;
      this.bullets.push({ x, y, vx: dx / length * speed, vy: dy / length * speed, enemy, life: 4 });
      this.emit('shot', x, y);
    }
    update(dt, input) {
      const st = this.stage, p = st.player, w = st.world;
      this.cool -= dt; this.invul = Math.max(0, this.invul - dt);
      this.meleeT -= dt; this.attackPose = Math.max(0, this.attackPose - dt); this.shotT = Math.max(0, this.shotT - dt);
      if (this.reload > 0) { this.reload = Math.max(0, this.reload - dt); if (!this.reload) this.ammo = 6; }
      if (input.shoot && this.cool <= 0 && this.ammo > 0) {
        const x = p.centerX, y = p.y + 8;
        const dx = Number.isFinite(input.aimX) ? input.aimX - x : p.facing;
        const dy = Number.isFinite(input.aimY) ? input.aimY - y : 0;
        if (dx) p.facing = Math.sign(dx);
        this.fire(x + p.facing * 7, y, dx, dy);
        this.cool = 0.2; this.shotT = 0.12; this.ammo--;
        if (!this.ammo) this.reload = 1.2;
      }
      if (input.melee && this.meleeT <= 0) {
        this.meleeT = 0.32; this.attackPose = 0.18;
        this.emit('swing', p.centerX, p.y + 8);
        for (const e of this.enemies) if (e.hp > 0 &&
          Math.abs(e.x + 6 - p.centerX) < 34 && Math.abs(e.y + 13 - p.y - 11) < 28 &&
          (e.x + 6 - p.centerX) * p.facing >= -6) this.hurtEnemy(e, 2);
      }
      for (const e of this.enemies) {
        if (e.hp <= 0) continue;
        e.t += dt; e.hit = Math.max(0, e.hit - dt);
        e.vy = Math.min(400, e.vy + 1300 * dt);
        if (KF.Physics.moveY(e, w, e.vy * dt)) e.vy = 0;
        if (e.y > w.pixelH + 16) { this.hurtEnemy(e, e.hp); continue; }
        e.facing = p.centerX < e.x + 6 ? -1 : 1;
        const dx = p.centerX - e.x - 6, dy = p.y + 9 - e.y - 10;
        const visible = Math.abs(dx) < 290 && !this.wallBetween(e.x + 6, e.y + 10, p.centerX, p.y + 9);
        if (!visible) { e.warn = 0; continue; }
        e.cool -= dt;
        // The red aim line is visible for 650 ms of world time before every shot.
        if (e.cool <= 0.65) e.warn = Math.max(0, 0.65 - e.cool);
        if (e.cool <= 0) {
          this.fire(e.x + 6 + e.facing * 9, e.y + 10, dx, dy, true);
          e.cool = e.boss ? 1.05 : 1.9; e.warn = 0;
        }
        if (Math.abs(dx) < 17 && Math.abs(dy) < 20) this.hurtPlayer({ vx: -p.facing }, input);
      }
      for (const b of this.bullets) {
        b.life -= dt;
        // Swept substeps prevent fast shots tunnelling through cover or narrow hurtboxes.
        const steps = Math.max(1, Math.ceil(Math.hypot(b.vx, b.vy) * dt / 3));
        for (let n = 0; n < steps && b.life > 0; n++) {
          b.x += b.vx * dt / steps; b.y += b.vy * dt / steps;
          if (w.overlapsSolid(b.x - 1, b.y - 1, 2, 2, null)) { b.life = 0; break; }
          const box = { x: b.x - 2, y: b.y - 2, w: 4, h: 4 };
          if (b.enemy) { if (U.overlap(box, p)) { this.hurtPlayer(b, input); b.life = 0; } }
          else for (const e of this.enemies) if (e.hp > 0 && U.overlap(box, e)) { this.hurtEnemy(e, 1); b.life = 0; break; }
        }
      }
      this.bullets = this.bullets.filter((b) => b.life > 0);
      for (const s of this.shards) { s.life -= dt; s.vy += 360 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.rot += dt * 6; }
      this.shards = this.shards.filter((s) => s.life > 0);
    }
    wallBetween(x, y, tx, ty) {
      const w = this.stage.world, n = Math.ceil(Math.hypot(tx - x, ty - y) / 6);
      for (let i = 1; i < n; i++) if (w.overlapsSolid(x + (tx - x) * i / n, y + (ty - y) * i / n, 1, 1, null)) return true;
      return false;
    }
  }
  KF.StageCombat = StageCombat;
})(window.KF);
