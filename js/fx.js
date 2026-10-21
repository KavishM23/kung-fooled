'use strict';
// Particles and camera juice: hit sparks, dust puffs, debris, screen shake, speech bubbles.
(function (KF) {
  const U = KF.util;

  class FX {
    constructor() { this.parts = []; this.bubbles = []; this.shakeMag = 0; this.shakeT = 0; this.flash = 0; }

    shake(mag, time = 0.25) { if (mag >= this.shakeMag || this.shakeT <= 0) { this.shakeMag = mag; this.shakeT = time; this.shakeDur = time; } }
    offset() {
      if (this.shakeT <= 0) return { x: 0, y: 0 };
      const k = this.shakeMag * (this.shakeT / this.shakeDur);
      return { x: Math.round(U.rand(-k, k)), y: Math.round(U.rand(-k, k)) };
    }

    // Fighting-game impact: radial rays, a ring and flying sparks.
    spark(x, y, size = 1) {
      const rays = 10;
      for (let i = 0; i < rays; i++) {
        const a = (i / rays) * Math.PI * 2 + U.rand(-0.15, 0.15);
        this.parts.push({ k: 'ray', x, y, a, len: (i % 2 ? 16 : 26) * size, life: 0.24, t: 0 });
      }
      this.parts.push({ k: 'ring', x, y, r: 4, life: 0.22, t: 0, size });
      for (let i = 0; i < 14 * size; i++) {
        const a = U.rand(0, Math.PI * 2), s = U.rand(80, 260) * size;
        this.parts.push({ k: 'px', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, g: 500, life: U.rand(0.25, 0.5), t: 0, c: Math.random() < 0.5 ? '#ffe060' : '#ff8a20' });
      }
    }
    // Small spark for blocking-style hits (bonks).
    tick(x, y) {
      for (let i = 0; i < 6; i++) this.parts.push({ k: 'ray', x, y, a: (i / 6) * Math.PI * 2, len: 9, life: 0.14, t: 0 });
    }
    dust(x, y, n = 4, dir = 0, g = 1) {
      for (let i = 0; i < n; i++) {
        this.parts.push({ k: 'puff', x: x + U.rand(-4, 4), y: y - g * U.rand(0, 3), vx: (dir || U.rand(-1, 1)) * U.rand(15, 55), vy: -g * U.rand(5, 25), r: U.rand(1.5, 3), life: U.rand(0.25, 0.45), t: 0 });
      }
    }
    debris(x, y, w, colors) {
      for (let i = 0; i < w / 3; i++) {
        this.parts.push({ k: 'px', x: x + U.rand(-w / 2, w / 2), y, vx: U.rand(-40, 40), vy: U.rand(-80, 0), g: 700, life: U.rand(0.5, 0.9), t: 0, c: colors[i % colors.length], s: 2 });
      }
    }
    confetti(x, y) {
      const cols = ['#ffd040', '#ff4fa0', '#4fe8ff', '#7cff6a', '#ffffff'];
      for (let i = 0; i < 40; i++) {
        const a = U.rand(-Math.PI, 0), s = U.rand(60, 200);
        this.parts.push({ k: 'px', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 220, life: U.rand(0.8, 1.6), t: 0, c: cols[i % cols.length], s: 2 });
      }
    }
    say(text, x, y) { this.bubbles.push({ text, x, y, t: 0, life: 1.3 }); }

    update(dt) {
      if (this.shakeT > 0) this.shakeT -= dt;
      if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 6);
      for (const p of this.parts) {
        p.t += dt;
        if (p.vx !== undefined) { p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 1 - dt * 2; }
      }
      this.parts = this.parts.filter((p) => p.t < p.life);
      for (const b of this.bubbles) b.t += dt;
      this.bubbles = this.bubbles.filter((b) => b.t < b.life);
    }

    render(ctx, cam) {
      for (const p of this.parts) {
        const f = p.t / p.life, x = Math.round(p.x - cam.x), y = Math.round(p.y - cam.y);
        if (p.k === 'ray') {
          const grow = Math.min(1, f * 4), len = p.len * grow * (1 - f * 0.5), w = 3 * (1 - f);
          const ex = x + Math.cos(p.a) * len, ey = y + Math.sin(p.a) * len;
          const nx = -Math.sin(p.a) * w, ny = Math.cos(p.a) * w;
          ctx.fillStyle = f < 0.4 ? '#ffffff' : '#ffd040';
          ctx.beginPath(); ctx.moveTo(x + nx, y + ny); ctx.lineTo(ex, ey); ctx.lineTo(x - nx, y - ny); ctx.closePath(); ctx.fill();
        } else if (p.k === 'ring') {
          ctx.strokeStyle = f < 0.5 ? '#ffffff' : '#ffb040'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(x, y, p.r + f * 22 * p.size, 0, Math.PI * 2); ctx.stroke();
        } else if (p.k === 'px') {
          ctx.fillStyle = p.c; const s = p.s || (f < 0.5 ? 2 : 1); ctx.fillRect(x, y, s, s);
        } else if (p.k === 'puff') {
          ctx.globalAlpha = 0.7 * (1 - f); ctx.fillStyle = '#e8e0d0';
          const r = Math.round(p.r + f * 3); ctx.fillRect(x - r, y - r, r * 2, r * 2);
          ctx.globalAlpha = 1;
        }
      }
      for (const b of this.bubbles) {
        const f = b.t / b.life, w = KF.Font.measure(b.text) + 8, x = Math.round(b.x - cam.x - w / 2);
        const y = Math.round(b.y - cam.y - 12 - Math.min(1, b.t * 8) * 6);
        const pop = b.t < 0.08 ? 1 : 0;
        ctx.globalAlpha = f > 0.8 ? (1 - f) * 5 : 1;
        ctx.fillStyle = '#1a1020'; ctx.fillRect(x - 1 - pop, y - 1 - pop, w + 2 + pop * 2, 11 + pop * 2);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, w, 9);
        ctx.fillRect(x + w / 2 - 1, y + 9, 3, 2); ctx.fillStyle = '#1a1020'; ctx.fillRect(x + w / 2 - 2, y + 11, 5, 1);
        KF.Font.draw(ctx, b.text, x + 4, y + 1, '#c01830');
        ctx.globalAlpha = 1;
      }
    }
  }
  KF.FX = FX;
})(window.KF);
