'use strict';
// Shared high-resolution materials. Geometry remains in the game's side-on logical coordinates.
(function (KF) {
  const A = KF.SceneArt = {
    hi(w, h) { return KF.makeHi(w, h, Math.min(4, KF.HI_MAX)); },
    gradient(ctx, x0, y0, x1, y1, colors) {
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      colors.forEach((c, i) => g.addColorStop(i / (colors.length - 1), c)); return g;
    },
    poly(ctx, pts, color) {
      ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(...pts[0]);
      for (const p of pts.slice(1)) ctx.lineTo(...p);
      ctx.closePath(); ctx.fill();
    },
    glow(ctx, x, y, r, color) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    },
    tiled(ctx, img, camera, parallax = 1, y = 0) {
      const w = img.lw, off = ((camera * parallax) % w + w) % w;
      for (let x = -off; x < KF.VIEW_W; x += w) KF.blit(ctx, img, x, y);
    },
    // Mortar and differently shaded bricks, baked once with deterministic wear and wet highlights.
    brick(ctx, x, y, w, h, seed = 1, light = false) {
      const rnd = KF.util.rng(seed >>> 0);
      ctx.fillStyle = light ? '#333537' : '#111416'; ctx.fillRect(x, y, w, h);
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      for (let by = 0, row = 0; by < h; by += 3.2, row++) for (let bx = row % 2 ? -4 : 0; bx < w; bx += 8) {
        const v = Math.floor((light ? 43 : 24) + rnd() * 16);
        ctx.fillStyle = `rgb(${v},${v + 1},${v + 2})`; ctx.fillRect(x + bx + 0.25, y + by + 0.25, 7.5, 2.65);
        ctx.fillStyle = `rgba(180,185,190,${rnd() * 0.11})`; ctx.fillRect(x + bx + 0.3, y + by + 0.3, 7.2, 0.22);
        ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(x + bx + 0.2, y + by + 2.5, 7.4, 0.4);
      }
      ctx.restore();
    },
    sign(ctx, x, y, text) {
      ctx.fillStyle = '#24272b'; ctx.fillRect(x - 0.6, y + 5, 1.2, 14);
      const w = KF.Font.measure(text) + 10;
      ctx.fillStyle = '#0d1013'; ctx.fillRect(x - w / 2, y - 1, w, 11);
      ctx.strokeStyle = '#8c8d85'; ctx.lineWidth = 0.45; ctx.strokeRect(x - w / 2, y - 1, w, 11);
      KF.Font.draw(ctx, text, x, y + 1, '#ede5ce', 1, 'center');
    },
    spike(ctx, x, y, dir) {
      ctx.save(); ctx.translate(x + 8, y + 8);
      ctx.rotate(({ up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 })[dir]);
      for (let i = -7; i < 8; i += 5) {
        A.poly(ctx, [[i, 8], [i + 2.5, -6], [i + 5, 8]], '#a51e25');
        A.poly(ctx, [[i, 8], [i + 2.5, -6], [i + 2.5, 8]], '#fb746b');
      }
      ctx.restore();
    },
    door(ctx, x, y, o = {}) {
      ctx.save(); if (o.flipped) { ctx.translate(0, y * 2 + 32); ctx.scale(1, -1); }
      ctx.fillStyle = A.gradient(ctx, x, y, x + 16, y, ['#1a1c20', '#666864', '#26282a']); ctx.fillRect(x - 2, y - 2, 20, 34);
      ctx.fillStyle = '#080b0d'; ctx.fillRect(x, y, 16, 32);
      ctx.fillStyle = A.gradient(ctx, x, y, x + 14, y, ['#343a3b', '#192022']);
      ctx.fillRect(x, y, 16 * (1 - (o.open || 0)), 32);
      ctx.strokeStyle = '#7d8075'; ctx.lineWidth = 0.45; ctx.strokeRect(x + 2, y + 3, 12, 22);
      ctx.fillStyle = '#e5d8a3'; ctx.beginPath(); ctx.arc(x + 12, y + 17, 0.8, 0, 7); ctx.fill();
      A.glow(ctx, x + 8, y - 4, 16, 'rgba(255,222,165,0.27)');
      ctx.fillStyle = '#f5dfb3'; ctx.fillRect(x + 3, y - 5, 10, 2);
      ctx.restore();
    },
    style(id, look, extra = {}) {
      Object.assign(KF.Styles.all[id], { smooth: true, vecLook: look, res: null,
        post: null, postOther: null, hiResPost: null, compose: null, under: null, overlay: null, light: null, ...extra });
    },
  };
})(window.KF);
