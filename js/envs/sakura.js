'use strict';
// Per-stage environments for the sakura realm: a pop-up picture book, a woodblock print,
// a dream, a tea house and a holiday snapshot. Same stages, five different places.
(function (KF) {
  const VW = KF.VIEW_W, VH = KF.VIEW_H, U = KF.util, K = KF.ThemeKit;
  const { R, ditherSky, tiled } = K;
  const F = () => KF.Font;
  const h2 = U.hash2;
  // Crisp shapes: filled row by row at half-pixel steps so edges stay pixel art, not anti-aliased.
  function rows(ctx, y0, y1, span, color) {
    ctx.fillStyle = color;
    for (let y = Math.round(y0 * 2) / 2; y < y1; y += 0.5) { const s = span(y); if (s && s[1] > s[0]) ctx.fillRect(Math.round(s[0] * 2) / 2, y, Math.round((s[1] - s[0]) * 2) / 2, 0.5); }
  }
  function disc(ctx, cx, cy, r, color, sy = 1) {
    rows(ctx, cy - r * sy, cy + r * sy, (y) => { const d = (y + 0.25 - cy) / sy, w = Math.sqrt(Math.max(0, r * r - d * d)); return w > 0 ? [cx - w, cx + w] : null; }, color);
  }
  // Wrapped screen x for an animated thing at world x `wx` repeating every `span`.
  const wrap = (wx, camX, par, span, m = 30) => ((((wx - camX * par + m) % span) + span) % span) - m;
  const rd = (v) => Math.round(v * 2) / 2;
  // Small noise table for the cheaper post passes.
  const NZ = new Float32Array(4096); { const r = U.rng(77); for (let i = 0; i < 4096; i++) NZ[i] = r(); }

  // =====================================================================
  // 1. STORYBOOK: a pop-up picture book. Paper-cut hills on fold tabs, a watercolour sky,
  //    hanging card clouds, a cottage, a fox and some rabbits. Platforms are layered card.
  // =====================================================================
  const STQ = new Uint8ClampedArray(256); for (let c = 0; c < 256; c++) STQ[c] = c * 0.45 + ((c / 51 + 0.5) | 0) * 28;
  KF.Env.add('storybook', {
    name: 'PICTURE BOOK', bg: '#eef0e0',
    signBoard: '#fff8e8', signShade: '#d8c8a0', signInk: '#7a3020', signPost: '#8a6a40',
    zone: { gravity: '#8a7aff', reverse: '#ff58c8' },
    build() {
      this.sky = ditherSky(['#a8d4ec', '#bcdeee', '#d4e8ec', '#e8f0e4', '#f4eed8']);
      const s = this.sky.getContext('2d'), rnd = U.rng(601);
      for (let k = 0; k < 26; k++) { // watercolour washes: soft fill, darker pooled rim
        const x = rnd() * VW, y = 20 + rnd() * 110, r = 14 + rnd() * 30, col = ['#7ab4e0', '#a0c8f0', '#f0b8c8', '#f8e0a0'][k % 4];
        s.globalAlpha = 0.12; disc(s, x, y, r, col, 0.55); s.globalAlpha = 0.1; disc(s, x + 2, y + 1, r * 0.7, col, 0.55);
      }
      s.globalAlpha = 1;
      // Paper sun with cut rays and a drop shadow.
      const sun = (c, ox, oy) => {
        for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; s.fillStyle = c; s.beginPath(); s.moveTo(318 + ox + Math.cos(a - 0.14) * 16, 52 + oy + Math.sin(a - 0.14) * 16); s.lineTo(318 + ox + Math.cos(a) * 26, 52 + oy + Math.sin(a) * 26); s.lineTo(318 + ox + Math.cos(a + 0.14) * 16, 52 + oy + Math.sin(a + 0.14) * 16); s.fill(); }
        disc(s, 318 + ox, 52 + oy, 17, c);
      };
      s.globalAlpha = 0.25; sun('#6a5030', 2, 2); s.globalAlpha = 1; sun('#f8c840', 0, 0); disc(s, 314, 48, 8, '#ffe890');
      R(s, '#c08a30', 311, 54, 2, 1); R(s, '#c08a30', 322, 54, 2, 1); R(s, '#c06a40', 314, 58, 6, 1); // sleepy face
      // Storybook text on the left page, with a red drop cap.
      R(s, '#b83a2a', 22, 55, 14, 14); R(s, '#f8e8c8', 23, 56, 12, 12); F().draw(s, 'O', 29, 58, '#b83a2a', 1, 'center');
      ['NCE UPON A TIME, A SMALL', 'FIGHTER SET OFF TO FIND', 'THE RED DOOR. THE DOOR', 'DID NOT WANT TO BE FOUND.'].forEach((l, k) => F().draw(s, l, k < 2 ? 40 : 22, 56 + k * 9, '#6a5438'));
      // Distant paper hills, two layers, each with a drop shadow and fold tabs at the base.
      this.far = KF.makeHi(640, VH);
      const f = this.far.getContext('2d');
      const hill = (ctx, base, amp, ph, col, dark, w, tabs) => {
        const hy = (x) => base - amp * (0.6 + 0.4 * Math.sin(x / 60 + ph)) * Math.abs(Math.sin(x / 110 + ph * 2));
        ctx.globalAlpha = 0.22; for (let x = 0; x < w; x += 0.5) R(ctx, '#3a2a10', x + 2, hy(x) + 2, 0.5, VH);
        ctx.globalAlpha = 1; for (let x = 0; x < w; x += 0.5) { const y = hy(x); R(ctx, col, x, y, 0.5, VH); R(ctx, dark, x, y, 0.5, 0.5); }
        for (let x = 20; x < w; x += tabs) { R(ctx, dark, x, base + 6, 10, 3); R(ctx, '#f8f0d8', x + 1, base + 6, 8, 1); }
      };
      hill(f, 118, 34, 0.3, '#b8d8a0', '#7aa868', 640, 90);
      for (let x = 14; x < 640; x += 46 + Math.floor(rnd() * 40)) { // lollipop paper trees
        const y = 112 + rnd() * 12;
        f.globalAlpha = 0.25; disc(f, x + 2, y + 2, 8, '#3a2a10'); f.globalAlpha = 1;
        R(f, '#8a5a30', x - 1, y, 2, 16); disc(f, x, y, 8, ['#5aa04a', '#e88aa8', '#7ab858'][Math.floor(rnd() * 3)]); disc(f, x - 2, y - 3, 3, 'rgba(255,255,255,0.35)');
      }
      hill(f, 138, 22, 1.7, '#8cc078', '#5a8c4a', 640, 70);
      // Near layer: cottage, fence, flowers.
      this.mid = KF.makeHi(768, VH);
      const m = this.mid.getContext('2d');
      for (let x = 60; x < 768; x += 384) {
        m.globalAlpha = 0.25; R(m, '#3a2a10', x + 3, 120, 40, 34); m.globalAlpha = 1;
        R(m, '#f4e4c0', x, 118, 40, 34); R(m, '#c8a880', x, 151, 40, 1);
        rows(m, 98, 119, (y) => [x - 6 + (119 - y) * 0.9, x + 46 - (119 - y) * 0.9], '#d04a3a'); R(m, '#8a2a20', x - 6, 118, 52, 1);
        R(m, '#7a4a2a', x + 26, 132, 9, 20); R(m, '#ffd060', x + 33, 141, 1, 1);
        R(m, '#6a4a2a', x + 6, 126, 12, 10); R(m, '#ffe8a0', x + 7, 127, 10, 8); R(m, '#6a4a2a', x + 11.5, 127, 1, 8); R(m, '#6a4a2a', x + 7, 130.5, 10, 1);
        R(m, '#8a6a5a', x + 30, 96, 5, 10);
        for (let k = 0; k < 7; k++) { R(m, '#f8f0e0', x + 56 + k * 7, 140, 3, 12); R(m, '#c8b8a0', x + 58 + k * 7, 140, 1, 12); }
        R(m, '#f8f0e0', x + 54, 144, 50, 2);
      }
      for (let k = 0; k < 60; k++) { const x = rnd() * 768, y = 150 + rnd() * 6; R(m, '#5a8c4a', x, y, 0.5, 3); disc(m, x, y, 1.5, ['#e84a6a', '#f8d040', '#ffffff', '#a070e0'][k % 4]); }
      // Foreground grass strip with a pinked (zigzag) cut edge.
      this.near = KF.makeHi(256, 64);
      const n = this.near.getContext('2d');
      // Below the strip the scene stops: blank lined page, so a pit reads as 'off the picture'.
      R(n, '#f2e8cc', 0, 14, 256, 50); for (let y = 22; y < 64; y += 8) R(n, '#d8caa8', 0, y, 256, 0.5);
      for (let x = 0; x < 256; x += 0.5) { const z = 2 - Math.abs(((x % 6) / 3) - 1) * 2; R(n, '#3a2a10', x + 1.5, z + 1.5, 0.5, 13); }
      for (let x = 0; x < 256; x += 0.5) { const z = 2 - Math.abs(((x % 6) / 3) - 1) * 2, b = 12 + Math.abs(((x % 8) / 4) - 1) * 2; R(n, '#78b860', x, z, 0.5, b - z); R(n, '#a8d888', x, z, 0.5, 0.5); R(n, '#4a7a3a', x, b, 0.5, 0.5); }
      for (let k = 0; k < 30; k++) R(n, '#5a9a48', rnd() * 256, 5 + rnd() * 6, 3, 0.5);
      this.cloud = KF.makeHi(44, 22);
      const c = this.cloud.getContext('2d');
      c.globalAlpha = 0.25; [[14, 13, 9], [24, 10, 11], [33, 14, 8]].forEach(([x, y, r]) => disc(c, x + 2, y + 2, r, '#3a2a10'));
      c.globalAlpha = 1; [[14, 13, 9], [24, 10, 11], [33, 14, 8]].forEach(([x, y, r]) => disc(c, x, y, r, '#ffffff'));
      R(c, '#d8e4ec', 6, 19, 34, 1);
    },
    background(ctx, cam, t, mood) {
      KF.blit(ctx, this.sky, 0, 0);
      for (let i = 0; i < 3; i++) { // card clouds hanging from strings
        const x = wrap(i * 150 + t * 4, cam.x, 0.06, 470, 50), y = 12 + (i % 2) * 8 + Math.sin(t * 0.8 + i) * 1.5;
        R(ctx, '#8a8070', rd(x + 22), 0, 0.5, y + 4); KF.blit(ctx, this.cloud, rd(x), rd(y));
      }
      tiled(ctx, this.far, cam.x, 0.12);
      tiled(ctx, this.mid, cam.x, 0.3);
      // The fox trots back and forth on its paper tab; the rabbits hop (higher when something happens).
      const fx = wrap(240 + Math.sin(t * 0.25) * 60, cam.x, 0.3, 768, 40), face = Math.cos(t * 0.25) > 0 ? 1 : -1, st = Math.floor(t * 6) % 2;
      ctx.save(); ctx.translate(rd(fx), 146); ctx.scale(face, 1);
      R(ctx, '#e0702a', -6, -5, 11, 4); R(ctx, '#e0702a', 4, -8, 4, 4); R(ctx, '#3a2010', 7.5, -7, 1, 1); R(ctx, '#e0702a', 4, -10, 1.5, 2); R(ctx, '#e0702a', 6.5, -10, 1.5, 2);
      R(ctx, '#f8f0e0', 6, -5.5, 2.5, 1.5); R(ctx, '#e0702a', -11, -6, 5, 2.5); R(ctx, '#f8f0e0', -12, -6, 2, 2);
      R(ctx, '#7a3a1a', -5 + st, -1, 1, 3); R(ctx, '#7a3a1a', 2 - st, -1, 1, 3); ctx.restore();
      for (let i = 0; i < 4; i++) {
        const x = wrap(i * 97 + 30, cam.x, 0.3, 400, 20), hop = Math.abs(Math.sin(t * (3 + i * 0.4) + i)) * (3 + mood.cheer * 8), y = rd(150 - hop);
        R(ctx, '#ffffff', rd(x), y - 4, 6, 4); R(ctx, '#ffffff', rd(x) + 4, y - 7, 3, 3); R(ctx, '#ffffff', rd(x) + 4.5, y - 11, 1, 4); R(ctx, '#ffffff', rd(x) + 6, y - 10, 1, 3);
        R(ctx, '#f0a0b0', rd(x) + 5, y - 10, 0.5, 2); R(ctx, '#3a2a2a', rd(x) + 6, y - 6, 0.5, 0.5); R(ctx, '#e8e0d8', rd(x) - 1, y - 4, 1.5, 1.5);
      }
      tiled(ctx, this.near, cam.x, 0.5, 156);
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid') { // corrugated card with a pinked green paper top
        R(ctx, '#dcc090', x, y, 16, 16);
        for (let k = 1; k < 16; k += 3) R(ctx, '#caa874', x, y + k, 16, 0.5);
        R(ctx, '#ead4a8', x + 1, y + 1, 0.5, 14);
        if (e.t) {
          R(ctx, '#9a7a4a', x, y + 6, 16, 1.5);
          for (let i = 0; i < 16; i += 0.5) { const z = 5 + (1 - Math.abs(((i % 4) / 2) - 1)) * 2; R(ctx, '#6aac52', x + i, y, 0.5, z); }
          R(ctx, '#b0e090', x, y, 16, 0.5); R(ctx, '#4a7a3a', x, y - 0.5, 16, 0.5);
          if (seed > 0.6) { disc(ctx, x + 4 + seed * 8, y + 2, 1.5, seed > 0.8 ? '#e84a6a' : '#f8d040'); }
        }
        if (e.b) { R(ctx, '#8a6a3a', x, y + 14.5, 16, 1.5); }
        if (e.r) R(ctx, '#9a7a4a', x + 14.5, y, 1.5, 16);
        if (e.l) R(ctx, '#7a5a32', x, y, 0.5, 16);
      } else if (art === 'alt') { // a stack of three little books
        const cols = [['#c8402a', '#e86a4a'], ['#3a6ab8', '#6a9ae0'], ['#3a8a4a', '#6ab87a']];
        for (let b = 0; b < 3; b++) {
          const by = y + b * 5.33, o = (h2(seed * 99, b) - 0.5) * 2, [c, hi] = cols[(b + Math.floor(seed * 3)) % 3];
          R(ctx, '#3a2010', x + o, by, 16, 5.33); R(ctx, c, x + o + 0.5, by + 0.5, 15, 4.33); R(ctx, hi, x + o + 0.5, by + 0.5, 15, 0.5);
          R(ctx, '#f8f0d8', x + o + 11, by + 1, 4, 3.33); for (let k = 0; k < 3; k++) R(ctx, '#d8c8a8', x + o + 11, by + 1.5 + k, 4, 0.5);
          R(ctx, '#f8d040', x + o + 3, by + 2, 5, 0.5);
        }
      } else if (art === 'ice') { // glossy blue tissue paper
        R(ctx, '#88c4ec', x, y, 16, 16); R(ctx, '#b8e0f8', x, y, 16, 1);
        for (let k = -16; k < 16; k += 6) for (let i = 0; i < 4; i++) R(ctx, '#e0f4ff', x + U.clamp(k + i + (y % 16), 0, 15), y + 3 + i, 1, 0.5);
        if (e.b) R(ctx, '#4a7aa8', x, y + 15, 16, 1);
      } else { // folded paper strip on a little tab
        R(ctx, '#7a5a32', x, y + 4, 16, 0.5); R(ctx, '#fff4dc', x, y, 16, 2); R(ctx, '#e0c898', x, y + 2, 16, 2); R(ctx, '#b89a68', x, y + 2, 16, 0.5);
        R(ctx, '#c8b080', x + 7, y + 4, 2, 4);
      }
    },
  }, {
    // Cheaper than the base pass (no edge detection): posterised colour on grainy paper.
    post(d, W, H) {
      for (let y = 0; y < H; y++) {
        const ry = (y >> 2) * 977;
        for (let x = 0, o = y * W * 4; x < W; x++, o += 4) {
          const paper = 0.9 + NZ[(ry + (x >> 2)) & 4095] * 0.1;
          d[o] = STQ[d[o]] * paper + 22; d[o + 1] = STQ[d[o + 1]] * paper + 14; d[o + 2] = STQ[d[o + 2]] * paper;
        }
      }
    },
    under(ctx) { // page edges stacked at both sides, a soft gutter down the middle
      for (let k = 0; k < 4; k++) { R(ctx, k % 2 ? '#e8dcc0' : '#d8ccb0', k * 1.5, 0, 1.5, VH); R(ctx, k % 2 ? '#e8dcc0' : '#d8ccb0', VW - 1.5 - k * 1.5, 0, 1.5, VH); }
      R(ctx, '#7a6a50', 6, 0, 0.5, VH); R(ctx, '#7a6a50', VW - 6.5, 0, 0.5, VH);
      const g = ctx.createLinearGradient(VW / 2 - 14, 0, VW / 2 + 14, 0);
      g.addColorStop(0, 'rgba(58,42,16,0)'); g.addColorStop(0.5, 'rgba(58,42,16,0.28)'); g.addColorStop(1, 'rgba(58,42,16,0)');
      ctx.fillStyle = g; ctx.fillRect(VW / 2 - 14, 0, 28, VH);
    },
    overlay(ctx) { F().draw(ctx, '- 6 -', 60, VH - 9, '#6a5a40', 1, 'center'); F().draw(ctx, '- 7 -', VW - 60, VH - 9, '#6a5a40', 1, 'center'); },
  });

  // =====================================================================
  // 2. UKIYO-E: a woodblock print. A great wave curls behind you, Fuji sits small in the gap,
  //    boats ride the swell and mist bands cross the sky. Drawn in the print's own eight inks.
  // =====================================================================
  const INK = { navy: '#1b1f3a', blue: '#2f5d8a', red: '#c8402a', ochre: '#e0a84a', paper: '#efe3c8', green: '#4a6a3a', black: '#121212', pink: '#e8b8a8' };
  let UKLUT = null;
  KF.Env.add('ukiyo', {
    name: 'WOODBLOCK', bg: INK.paper,
    signBoard: INK.paper, signShade: INK.ochre, signInk: INK.navy, signPost: INK.black,
    zone: { gravity: INK.blue, reverse: INK.red },
    build() {
      const sky = (this.sky = KF.makeHi(VW, VH)), s = sky.getContext('2d'), rnd = U.rng(602);
      R(s, INK.paper, 0, 0, VW, VH);
      for (let y = 0; y < 56; y += 0.5) { // bokashi: indigo graded into the paper at the top, dithered
        const f = 1 - y / 56;
        for (let x = 0; x < VW; x += 0.5) if (NZ[((y * 2) * 131 + x * 2) & 4095] < f * f * 1.1) R(s, y < 14 ? INK.navy : INK.blue, x, y, 0.5, 0.5);
      }
      for (let k = 0; k < 220; k++) R(s, INK.ochre, rnd() * VW, 60 + rnd() * 100, 4 + rnd() * 10, 0.5); // wood grain
      // Fuji, small and calm, framed by the wave.
      rows(s, 100, 150, (y) => { const w = (y - 100) * 1.6 + 4; return [250 - w, 250 + w]; }, INK.navy);
      rows(s, 100.5, 150, (y) => { const w = (y - 100) * 1.6 + 3; return [250 - w, 250 + w]; }, INK.blue);
      rows(s, 100, 114, (y) => { const w = (y - 100) * 1.6 + 3, j = (y > 108) ? 0 : 0; return [250 - w + j, 250 + w]; }, INK.paper);
      for (let x = -22; x < 22; x += 3) R(s, INK.paper, 250 + x, 114, 1.5, 1 + ((x + 30) % 4));
      // Mist bands (kasumi) with rounded ends.
      [[20, 72, 120], [180, 64, 150], [300, 84, 90], [60, 92, 70]].forEach(([x, y, w]) => { rows(s, y, y + 6, (yy) => { const r = 3, d = yy + 0.25 - (y + 3), c = Math.sqrt(Math.max(0, r * r - d * d)); return [x + r - c, x + w - r + c]; }, INK.pink); R(s, INK.red, x + 3, y + 6, w - 6, 0.5); });
      // Wave layer: the great curling wave and a smaller one, foam claws along the lip.
      this.mid = KF.makeHi(768, VH);
      const m = this.mid.getContext('2d');
      const bigWave = (ox, sc) => {
        const P = (x, y) => [ox + x * sc, 170 - (170 - y) * sc];
        m.fillStyle = INK.blue; m.beginPath();
        let p = P(-20, 170); m.moveTo(...p);
        [[40, 150], [100, 110], [140, 70], [170, 48], [205, 44], [232, 58], [244, 80], [236, 96]].forEach((q) => m.lineTo(...P(...q)));
        [[226, 82], [212, 74], [196, 78], [188, 96], [196, 130], [230, 170]].forEach((q) => m.lineTo(...P(...q)));
        m.closePath(); m.fill();
        m.strokeStyle = INK.navy; m.lineWidth = 1.2 * sc; m.stroke();
        for (let k = 1; k <= 4; k++) { // ribs of the swell
          m.strokeStyle = k % 2 ? INK.paper : INK.navy; m.lineWidth = 0.6 * sc; m.beginPath();
          m.moveTo(...P(20 + k * 18, 170)); m.quadraticCurveTo(...P(110 + k * 8, 120 - k * 4), ...P(172 + k * 6, 64 + k * 8)); m.stroke();
        }
        for (let k = 0; k < 16; k++) { // foam claws curling down off the lip
          const a = k / 15, cx = 150 + a * 94, cy = 62 - Math.sin(a * Math.PI) * 18 + a * 28;
          const [x, y] = P(cx, cy);
          m.fillStyle = INK.paper; m.beginPath(); m.moveTo(x - 3 * sc, y); m.lineTo(x + 3 * sc, y); m.lineTo(x + (1 + a * 4) * sc, y + (6 + a * 5) * sc); m.fill();
          disc(m, x, y, 2.6 * sc, INK.paper);
        }
      };
      bigWave(-30, 1); bigWave(400, 0.55); bigWave(560, 0.4);
      this.boats = [];
      for (let k = 0; k < 3; k++) this.boats.push({ x: 120 + k * 230, ph: k * 2 });
      // Foreground sea: seigaiha scallops.
      this.sea = KF.makeHi(64, 64);
      const z = this.sea.getContext('2d');
      R(z, INK.blue, 0, 0, 64, 64);
      for (let ry = 0; ry < 8; ry++) for (let cx = -8; cx < 72; cx += 16) {
        const x0 = cx + (ry % 2) * 8, y0 = ry * 8 + 8;
        for (let r = 7; r > 0; r -= 2.5) rows(z, y0 - r, y0, (y) => { const d = y + 0.25 - y0, w = Math.sqrt(Math.max(0, r * r - d * d)); return [x0 - w, x0 + w]; }, r > 6 ? INK.paper : (r > 4 ? INK.blue : INK.paper));
      }
      R(z, INK.navy, 0, 0, 64, 1);
    },
    background(ctx, cam, t, mood) {
      KF.blit(ctx, this.sky, 0, 0);
      tiled(ctx, this.mid, cam.x, 0.22, 4);
      for (const b of this.boats) { // long oshiokuri boats riding the swell, rowers bent to their oars
        const x = wrap(b.x, cam.x, 0.22, 768, 60), y = 150 + Math.sin(t * 1.2 + b.ph) * (2 + mood.cheer * 2), tilt = Math.cos(t * 1.2 + b.ph) * 1.2;
        for (let i = 0; i < 52; i += 1) R(ctx, i % 13 ? INK.paper : INK.ochre, rd(x + i), rd(y + (i - 26) / 26 * tilt), 1, 2);
        R(ctx, INK.black, rd(x), rd(y + 2), 52, 0.5);
        for (let i = 0; i < 6; i++) { const px = x + 6 + i * 7, py = y - 3 + (i - 3) / 3 * tilt; R(ctx, INK.navy, rd(px), rd(py), 2, 3); R(ctx, INK.navy, rd(px + 1), rd(py - 1.5), 1.5, 1.5); }
      }
      if (mood.cheer > 0.2) for (let k = 0; k < 18; k++) { const a = (t * 0.7 + k * 0.13) % 1; disc(ctx, rd(60 + k * 19 + Math.sin(k) * 9), rd(150 - Math.sin(a * Math.PI) * 30 * mood.cheer), 1.2, INK.paper); }
      tiled(ctx, this.sea, cam.x + t * 6, 0.5, 158);
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid') { // carved rock: indigo body, cut strata lines, moss and foam on top
        R(ctx, INK.navy, x, y, 16, 16);
        for (let k = 0; k < 3; k++) { const yy = y + 4 + k * 4 + h2(seed * 50, k) * 2; R(ctx, INK.blue, x + h2(seed * 9, k) * 6, yy, 6 + h2(k, seed * 31) * 8, 0.5); }
        if (h2(seed * 77, y) > 0.7) R(ctx, INK.blue, x + 3, y + 9, 1, 3);
        if (e.t) { R(ctx, INK.black, x, y, 16, 0.5); R(ctx, INK.green, x, y + 0.5, 16, 2.5); R(ctx, INK.paper, x, y + 0.5, 16, 0.5); for (let i = 1; i < 16; i += 4) R(ctx, INK.green, x + i, y + 3, 1.5, 1); }
        if (e.l) R(ctx, INK.black, x, y, 0.5, 16); if (e.r) R(ctx, INK.black, x + 15.5, y, 0.5, 16); if (e.b) R(ctx, INK.black, x, y + 15.5, 16, 0.5);
      } else if (art === 'alt') { // red lacquer chest printed with the wave pattern
        R(ctx, INK.black, x, y, 16, 16); R(ctx, INK.red, x + 0.5, y + 0.5, 15, 15);
        for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) { const cx = x + 4 + c * 8, cy = y + 7 + r * 7; for (let rr = 3.5; rr > 0; rr -= 1.5) rows(ctx, cy - rr, cy, (yy) => { const d = yy + 0.25 - cy, w = Math.sqrt(Math.max(0, rr * rr - d * d)); return [cx - w, cx + w]; }, rr > 3 ? INK.paper : (rr > 1.5 ? INK.red : INK.paper)); }
        R(ctx, INK.ochre, x + 0.5, y + 0.5, 15, 0.5);
      } else if (art === 'ice') {
        R(ctx, INK.blue, x, y, 16, 16); R(ctx, INK.paper, x, y, 16, 1);
        for (let k = 0; k < 3; k++) R(ctx, INK.paper, x + 2 + k * 5, y + 4 + (k % 2) * 4, 3, 0.5);
        if (e.b) R(ctx, INK.navy, x, y + 15, 16, 1);
      } else { // boat plank
        R(ctx, INK.black, x, y, 16, 4.5); R(ctx, INK.ochre, x, y + 0.5, 16, 3); R(ctx, INK.paper, x, y + 0.5, 16, 0.5);
        R(ctx, INK.black, x + 4, y + 0.5, 0.5, 3); R(ctx, INK.black, x + 12, y + 0.5, 0.5, 3); R(ctx, INK.black, x + 7, y + 4.5, 2, 3);
      }
    },
  }, {
    // Cheaper than the base pass: snap to the eight inks through a 15-bit lookup, add grain.
    post(d, W, H) {
      if (!UKLUT) {
        const pal = Object.values(INK).map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
        UKLUT = new Uint8Array(32768 * 3);
        for (let i = 0; i < 32768; i++) {
          const r = (i >> 10) * 8.2, g = ((i >> 5) & 31) * 8.2, b = (i & 31) * 8.2; let best = 0, bd = 1e9;
          pal.forEach((p, k) => { const dd = (p[0] - r) ** 2 * 0.3 + (p[1] - g) ** 2 * 0.59 + (p[2] - b) ** 2 * 0.11; if (dd < bd) { bd = dd; best = k; } });
          UKLUT[i * 3] = pal[best][0]; UKLUT[i * 3 + 1] = pal[best][1]; UKLUT[i * 3 + 2] = pal[best][2];
        }
      }
      for (let y = 0; y < H; y++) {
        const ry = (y >> 1) * 131;
        for (let x = 0, o = y * W * 4; x < W; x++, o += 4) {
          const q = ((d[o] >> 3) << 10 | (d[o + 1] >> 3) << 5 | d[o + 2] >> 3) * 3, g = (NZ[(ry + x) & 4095] - 0.5) * 16;
          d[o] = UKLUT[q] + g; d[o + 1] = UKLUT[q + 1] + g; d[o + 2] = UKLUT[q + 2] + g;
        }
      }
    },
    overlay(ctx) { // title cartouche and the artist's seal
      R(ctx, INK.black, VW - 27, 37, 16, 66); R(ctx, INK.ochre, VW - 26, 38, 14, 64); R(ctx, INK.paper, VW - 24.5, 39.5, 11, 61);
      ['K', 'U', 'N', 'G', '-', 'F', 'U'].forEach((c, k) => F().draw(ctx, c, VW - 19, 42 + k * 8.4, INK.navy, 1, 'center'));
      R(ctx, INK.red, 12, VH - 24, 12, 12); R(ctx, INK.paper, 13.5, VH - 22.5, 9, 9); R(ctx, INK.red, 15, VH - 21, 6, 1); R(ctx, INK.red, 17.5, VH - 21, 1, 6); R(ctx, INK.red, 15, VH - 16, 6, 1);
    },
  });

  // =====================================================================
  // 3. DREAM: floating islands with waterfalls running up, a moon that is a clock with no
  //    numbers, stairs to nowhere, lone doors and koi swimming through the sky.
  // =====================================================================
  KF.Env.add('dream', {
    name: 'DREAM', bg: '#4a3a7a',
    signBoard: '#fff0fa', signShade: '#e0b8e0', signInk: '#6a3a9a', signPost: '#9a7ac8',
    zone: { gravity: '#ffffff', reverse: '#ff8ad8' },
    build() {
      this.sky = ditherSky(['#1e1648', '#2e2466', '#4a3684', '#704a98', '#9a5aa0', '#c0709e', '#d88a9a']);
      const s = this.sky.getContext('2d'), rnd = U.rng(603);
      this.stars = [];
      for (let k = 0; k < 60; k++) { const x = rnd() * VW, y = rnd() * 90; R(s, '#c8b8f0', x, y, 0.5, 0.5); if (k % 3 === 0) this.stars.push({ x, y, ph: rnd() * 9 }); }
      // The moon: soft halo, pale disc, tick marks around the rim but no numbers.
      s.globalAlpha = 0.08; disc(s, 300, 74, 54, '#ffe0f0'); s.globalAlpha = 0.12; disc(s, 300, 74, 42, '#ffe0f0'); s.globalAlpha = 1;
      disc(s, 300, 74, 34, '#f0dcd8'); disc(s, 304, 70, 28, '#f8ecdc');
      for (let k = 0; k < 4; k++) disc(s, 290 + k * 9 - (k % 2) * 12, 62 + k * 7, 2 + (k % 3), '#f0e0d0');
      for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2, r0 = k % 3 ? 29 : 26; for (let r = r0; r < 31; r += 0.5) R(s, '#b8a0c8', rd(300 + Math.cos(a) * r), rd(74 + Math.sin(a) * r), 0.5, 0.5); }
      // Floating islands: grass on top, an upside-down cone of rock below.
      this.far = KF.makeHi(640, VH);
      const f = this.far.getContext('2d');
      this.falls = [];
      const island = (cx, cy, w, fall) => {
        rows(f, cy, cy + w * 0.8, (y) => { const k = 1 - (y - cy) / (w * 0.8); const hw = w / 2 * Math.pow(k, 0.7); return [cx - hw + Math.sin(y * 1.3) * 1.5, cx + hw]; }, '#6a4a8a');
        rows(f, cy, cy + w * 0.5, (y) => { const k = 1 - (y - cy) / (w * 0.8); const hw = w / 2 * Math.pow(k, 0.7); return [cx - hw * 0.2, cx + hw]; }, '#8a64a4');
        rows(f, cy - 3, cy + 1, (y) => [cx - w / 2 - 1, cx + w / 2 + 1], '#8ae0b0'); R(f, '#c8ffe0', cx - w / 2, cy - 3, w, 0.5);
        if (w > 30) { R(f, '#6a4a8a', cx - 4, cy - 14, 1.5, 11); disc(f, cx - 3.5, cy - 16, 6, '#ffb0d8'); disc(f, cx - 5, cy - 18, 2.5, '#ffd8ec'); }
        if (fall) this.falls.push({ x: cx + w * 0.2, top: cy - 60, bot: cy - 3 });
      };
      island(60, 120, 46, true); island(180, 96, 26, false); island(300, 140, 34, true); island(420, 110, 52, true); island(560, 130, 30, false);
      // Mid: staircases going nowhere (one upside down) and doors standing in mid-air.
      this.mid = KF.makeHi(768, VH);
      const m = this.mid.getContext('2d');
      const stairs = (x, y, n, dir, flip) => {
        for (let k = 0; k < n; k++) {
          const sx = x + k * 8 * dir, sy = flip ? y + k * 6 : y - k * 6;
          R(m, '#c8b0e8', sx, sy, 9, 3); R(m, '#f8ecff', sx, sy, 9, 0.5); R(m, '#8a70b8', sx, sy + 3, 9, 3);
        }
      };
      stairs(40, 140, 7, 1, false); stairs(300, 60, 5, -1, true); stairs(500, 136, 6, 1, false); stairs(700, 96, 4, -1, false);
      const door = (x, y) => { R(m, '#5a3a7a', x - 1, y - 1, 14, 24); R(m, '#e0a0c8', x, y, 12, 22); R(m, '#ffe8a0', x + 9, y + 11, 1.5, 1.5); R(m, '#b878a8', x + 2, y + 2, 8, 8); R(m, '#b878a8', x + 2, y + 12, 8, 8); R(m, '#5a3a7a', x - 3, y + 23, 18, 1); };
      door(200, 112); door(610, 70);
      // Sea of cloud below.
      this.clouds = KF.makeHi(320, 72);
      const c = this.clouds.getContext('2d');
      for (let k = 0; k < 24; k++) disc(c, k * 14 + 6, 18 + (k % 3) * 3, 12 + (k % 4) * 2, '#a878b0');
      for (let k = 0; k < 24; k++) disc(c, k * 14 + 2, 24 + (k % 2) * 4, 11 + (k % 3) * 2, '#c898c4');
      R(c, '#c898c4', 0, 30, 320, 42);
      for (let k = 0; k < 20; k++) disc(c, k * 17 + 9, 40, 9, '#b080b4');
      R(c, '#6a4a8a', 0, 50, 320, 22); for (let k = 0; k < 20; k++) disc(c, k * 17, 50, 7, '#8a64a4');
      this.fish = []; for (let k = 0; k < 6; k++) this.fish.push({ y: 40 + k * 17, sp: 10 + rnd() * 8, ph: rnd() * 9, c: k % 3 });
    },
    background(ctx, cam, t, mood) {
      KF.blit(ctx, this.sky, 0, 0);
      for (const st of this.stars) if (Math.sin(t * 2 + st.ph) > 0.3) R(ctx, '#ffffff', st.x, st.y, 0.5, 0.5);
      // Clock hands on the moon: one runs backwards, one runs too fast (faster still when you die).
      const hand = (a, len, w, col) => { for (let r = 0; r < len; r += 0.5) R(ctx, col, rd(300 + Math.cos(a) * r), rd(74 + Math.sin(a) * r), w, w); };
      hand(-t * 0.4 - mood.cheer * 3, 15, 1, '#8a70a8'); hand(t * 2.2 + mood.cheer * 8, 22, 0.5, '#a088b8'); disc(ctx, 300, 74, 1.5, '#8a70a8');
      tiled(ctx, this.far, cam.x, 0.1);
      for (const fl of this.falls) { // waterfalls pouring upward off the islands
        const x = wrap(fl.x, cam.x, 0.1, 640, 10);
        if (x < -10 || x > VW + 10) continue;
        ctx.globalAlpha = 0.55; R(ctx, '#bfe8ff', rd(x), fl.top, 4, fl.bot - fl.top); ctx.globalAlpha = 1;
        for (let k = 0; k < 6; k++) { const yy = fl.bot - ((t * 30 + k * 11) % (fl.bot - fl.top)); R(ctx, '#ffffff', rd(x + (k % 3)), rd(yy), 1, 3); }
        disc(ctx, x + 2, fl.top, 3 + Math.sin(t * 3) * 0.5, '#e8f8ff');
      }
      tiled(ctx, this.mid, cam.x, 0.25);
      for (const fi of this.fish) { // koi drifting through the sky
        const sp = fi.sp * (1 + mood.cheer * 2), x = wrap(fi.ph * 60 + t * sp, cam.x, 0.18, VW + 80, 40), y = fi.y + Math.sin(t * 0.9 + fi.ph) * 6, wag = Math.sin(t * 6 + fi.ph) * 1.5;
        const body = ['#ff8a3a', '#ffffff', '#ff5a5a'][fi.c], spot = ['#ffffff', '#ff6a2a', '#1a1a2a'][fi.c];
        disc(ctx, rd(x), rd(y), 4, body, 0.5); R(ctx, spot, rd(x - 1), rd(y - 1.5), 2, 1.5);
        R(ctx, body, rd(x - 6), rd(y - 2 + wag), 2, 1.5); R(ctx, body, rd(x - 6), rd(y + 0.5 + wag), 2, 1.5); R(ctx, '#1a1a2a', rd(x + 2.5), rd(y - 0.5), 0.5, 0.5);
      }
      tiled(ctx, this.clouds, cam.x + t * 5, 0.45, 150);
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid') { // soft cloud-stone: lavender rock with a puffy cloud top
        R(ctx, '#8c78c0', x, y, 16, 16);
        for (let k = 0; k < 3; k++) disc(ctx, x + 2 + h2(seed * 40, k) * 12, y + 6 + h2(k, seed * 19) * 8, 1.5 + h2(seed, k), '#a08cd4');
        if (h2(seed * 13, y) > 0.75) R(ctx, '#ffffff', x + seed * 14, y + 10, 0.5, 0.5);
        if (e.t) {
          R(ctx, '#d8b8e8', x, y + 2, 16, 3);
          for (let i = 0; i < 4; i++) disc(ctx, x + 2 + i * 4, y + 2, 2.6, '#fff4fc');
          R(ctx, '#fff4fc', x, y + 2, 16, 1.5); R(ctx, '#ffffff', x + 1, y, 3, 0.5); R(ctx, '#ffffff', x + 9, y, 3, 0.5);
        }
        if (e.b) R(ctx, '#5a4890', x, y + 15, 16, 1);
        if (e.l) R(ctx, '#6a58a0', x, y, 0.5, 16); if (e.r) R(ctx, '#6a58a0', x + 15.5, y, 0.5, 16);
      } else if (art === 'alt') { // a big buttoned pillow
        R(ctx, '#6a4a9a', x, y, 16, 16); R(ctx, '#f8c8e0', x + 0.5, y + 0.5, 15, 15); R(ctx, '#ffe8f4', x + 1, y + 1, 14, 2); R(ctx, '#e0a0c8', x + 1, y + 13, 14, 2);
        disc(ctx, x + 8, y + 8, 1.5, '#b878a8'); R(ctx, '#e0a0c8', x + 8, y + 2, 0.5, 4); R(ctx, '#e0a0c8', x + 8, y + 10, 0.5, 4);
      } else if (art === 'ice') { // candy glass
        R(ctx, '#a8e8f8', x, y, 16, 16); R(ctx, '#e8ffff', x, y, 16, 1);
        for (let k = 0; k < 16; k += 4) R(ctx, '#f8b8e8', x + k, y + 3, 2, 12);
        if (e.b) R(ctx, '#6ab0d0', x, y + 15, 16, 1);
      } else { // a thin wisp of cloud you can stand on
        for (let i = 0; i < 4; i++) disc(ctx, x + 2 + i * 4, y + 2, 2.2, '#fff4fc');
        R(ctx, '#d8b8e8', x, y + 3, 16, 1.5);
      }
    },
  }, {
    // A soft pastel haze (cheaper and less washed-out than the base bloom).
    post(d, W, H) { for (let o = 0, n = W * H * 4; o < n; o += 4) { d[o] = d[o] * 0.86 + 34; d[o + 1] = d[o + 1] * 0.82 + 22; d[o + 2] = d[o + 2] * 0.86 + 36; } },
  });

  // =====================================================================
  // 4. TEA HOUSE (duotone): inside a tea room. Shoji screens with people passing behind,
  //    a scroll in the alcove, a kettle steaming on the brazier. Drawn in values, not hues.
  // =====================================================================
  KF.Env.add('duotone', {
    name: 'TEA HOUSE', bg: '#303030',
    signBoard: '#f0f0ea', signShade: '#b0b0a8', signInk: '#202020', signPost: '#404040',
    zone: { gravity: '#ffffff', reverse: '#d0d0d0' },
    build() {
      const W = 640, rnd = U.rng(604);
      this.wall = KF.makeHi(W, VH);
      const w = this.wall.getContext('2d');
      R(w, '#1c1a18', 0, 0, W, VH);
      for (let k = 0; k < 4; k++) R(w, k % 2 ? '#2a2622' : '#34302a', 0, k * 9, W, 9); // ceiling boards
      R(w, '#4a443c', 0, 36, W, 4); R(w, '#605850', 0, 36, W, 0.5);
      this.panes = [];
      for (let x = 0; x < W; x += 52) {
        if ((x / 52) % 6 === 3) { // tokonoma alcove: scroll and a flower vase
          R(w, '#3a3632', x, 40, 52, 112); R(w, '#2a2622', x, 40, 52, 3);
          R(w, '#e8e8e2', x + 18, 50, 16, 70); R(w, '#706860', x + 17, 48, 18, 2); R(w, '#706860', x + 17, 120, 18, 2); R(w, '#605850', x + 25.5, 44, 1, 4);
          w.fillStyle = '#181818'; // a bold brush stroke character
          [[24, 58, 6, 2], [26, 56, 2, 22], [21, 66, 10, 1.5], [22, 74, 3, 8], [28, 74, 3, 9], [24, 88, 4, 3], [25, 94, 2, 14], [22, 100, 8, 1.5]].forEach(([a, b, c, d]) => w.fillRect(x + a, b, c, d));
          R(w, '#c02020', x + 28, 112, 3, 3);
          R(w, '#605850', x, 140, 52, 12); R(w, '#7a7068', x, 140, 52, 1);
          R(w, '#504840', x + 6, 128, 7, 12); R(w, '#706860', x + 7, 128, 5, 1);
          for (let k = 0; k < 6; k++) R(w, '#e8e8e8', x + 6 + k * 2 - 4, 118 + (k % 3) * 3, 1.5, 1.5);
          R(w, '#2a2622', x + 9, 116, 0.5, 12);
        } else {
          R(w, '#e4e2da', x + 3, 42, 46, 106);
          this.panes.push(x + 3);
        }
        R(w, '#262220', x, 40, 3, 112); R(w, '#3a3430', x + 0.5, 40, 1, 112);
      }
      R(w, '#262220', 0, 148, W, 4);
      // The shoji lattice, kept on its own layer so the silhouettes pass between paper and frame.
      this.grid = KF.makeHi(W, VH);
      const g = this.grid.getContext('2d');
      for (const px of this.panes) {
        for (let gx = 0; gx <= 46; gx += 11.5) R(g, '#5a524a', px + gx - 0.5, 42, 1, 106);
        for (let gy = 0; gy <= 106; gy += 13.25) R(g, '#5a524a', px, 42 + gy - 0.5, 46, 1);
        R(g, '#7a7068', px, 42, 46, 0.5);
      }
      // Background tatami floor seen in perspective.
      this.floor = KF.makeHi(320, 64);
      const fl = this.floor.getContext('2d');
      R(fl, '#a8a498', 0, 0, 320, 64);
      for (let y = 0; y < 64; y += 1.5) R(fl, '#9a968a', 0, y, 320, 0.5);
      for (let x = 0; x < 320; x += 80) { R(fl, '#383430', x, 0, 3, 64); R(fl, '#383430', x + 40, 0, 1.5, 64); }
      R(fl, '#383430', 0, 0, 320, 1.5);
      this.walkers = []; for (let k = 0; k < 3; k++) this.walkers.push({ x: rnd() * W, sp: (k % 2 ? -1 : 1) * (8 + rnd() * 6), tray: k === 1, ph: rnd() * 9 });
    },
    background(ctx, cam, t, mood) {
      R(ctx, '#1c1a18', 0, 0, VW, VH);
      tiled(ctx, this.wall, cam.x, 0.3);
      // Silhouettes walking behind the paper screens (they jump when you die).
      ctx.save(); ctx.beginPath(); ctx.rect(0, 42, VW, 106); ctx.clip();
      for (const wk of this.walkers) {
        const x = wrap(wk.x + t * wk.sp, cam.x, 0.3, 640, 20), bob = Math.abs(Math.sin(t * 4 + wk.ph)) * 1 + Math.abs(Math.sin(t * 9 + wk.ph)) * mood.cheer * 7, y = rd(146 - bob);
        if (x < -20 || x > VW + 20) continue;
        const c = '#9a968e';
        disc(ctx, x, y - 52, 5, c); R(ctx, c, rd(x - 2), y - 60, 4, 3);           // head and topknot
        rows(ctx, y - 47, y - 12, (yy) => { const k = (yy - (y - 47)) / 35; return [x - 5 - k * 4, x + 5 + k * 4]; }, c); // kimono
        R(ctx, c, rd(x - 5), y - 12, 3, 12); R(ctx, c, rd(x + 2), y - 12, 3, 12);
        if (wk.tray) { R(ctx, c, rd(x + wk.sp / Math.abs(wk.sp) * 6), y - 38, 12, 1.5); R(ctx, c, rd(x + wk.sp / Math.abs(wk.sp) * 6 + 4), y - 41, 3, 3); }
      }
      ctx.restore();
      tiled(ctx, this.grid, cam.x, 0.3);
      // Iron kettle on its brazier, steam curling up.
      const kx = wrap(470, cam.x, 0.4, 560, 40);
      if (kx > -40 && kx < VW + 40) {
        R(ctx, '#605850', rd(kx - 12), 140, 24, 12); R(ctx, '#80786e', rd(kx - 12), 140, 24, 1); R(ctx, '#3a3430', rd(kx - 10), 145, 20, 1);
        disc(ctx, kx, 133, 9, '#1a1816', 0.8); R(ctx, '#3a3632', rd(kx - 6), 128, 5, 1);
        R(ctx, '#1a1816', rd(kx - 2), 124, 4, 2); R(ctx, '#1a1816', rd(kx + 8), 129, 5, 2);
        for (let k = 0; k < 7; k++) { const a = (t * 0.35 + k / 7) % 1; ctx.globalAlpha = 0.6 * (1 - a); disc(ctx, kx + 13 + Math.sin(a * 9 + k) * 3 + a * 6, 128 - a * 40, 1.5 + a * 3, '#f4f4f0'); }
        ctx.globalAlpha = 1;
      }
      tiled(ctx, this.floor, cam.x, 0.45, 152);
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid') { // tatami top with a dark cloth border, cypress beam underneath
        R(ctx, '#4a443e', x, y, 16, 16);
        for (let k = 0; k < 4; k++) R(ctx, '#3a3530', x, y + 7 + k * 2.5 + h2(seed * 9, k), 16, 0.5);
        R(ctx, '#5a544c', x, y + 6, 16, 0.5);
        if (e.t) {
          R(ctx, '#e8e4d4', x, y, 16, 5); for (let i = 0.5; i < 16; i += 1.5) R(ctx, '#ccc8b8', x + i, y + 0.5, 0.5, 4.5);
          R(ctx, '#f8f8f0', x, y, 16, 0.5); R(ctx, '#1a1816', x, y + 5, 16, 1.5);
          if (Math.floor(x / 16) % 3 === 0) R(ctx, '#1a1816', x, y, 1.5, 5);
        }
        if (e.b) R(ctx, '#1a1816', x, y + 15, 16, 1);
        if (e.l) R(ctx, '#1a1816', x, y, 0.5, 16); if (e.r) R(ctx, '#1a1816', x + 15.5, y, 0.5, 16);
      } else if (art === 'alt') { // tansu chest with iron handles
        R(ctx, '#141210', x, y, 16, 16); R(ctx, '#8a7e70', x + 0.5, y + 0.5, 15, 15); R(ctx, '#a89c8c', x + 0.5, y + 0.5, 15, 0.5);
        R(ctx, '#141210', x + 0.5, y + 5.5, 15, 0.5); R(ctx, '#141210', x + 0.5, y + 10.5, 15, 0.5); R(ctx, '#141210', x + 8, y + 5.5, 0.5, 10);
        [[7, 3], [4, 8], [12, 8], [4, 13], [12, 13]].forEach(([a, b]) => { R(ctx, '#1a1816', x + a - 1, y + b - 0.5, 2.5, 1.5); R(ctx, '#f0f0e8', x + a - 0.5, y + b - 0.5, 1.5, 0.5); });
      } else if (art === 'ice') { // polished lacquer floor
        R(ctx, '#101010', x, y, 16, 16); R(ctx, '#f8f8f8', x, y, 16, 0.5);
        R(ctx, '#e0e0e0', x + 3, y + 2, 6, 0.5); R(ctx, '#8a8a8a', x + 9, y + 5, 4, 0.5);
        if (e.b) R(ctx, '#505050', x, y + 15, 16, 1);
      } else { // a light wooden beam
        R(ctx, '#141210', x, y, 16, 5); R(ctx, '#c8c0aa', x, y + 0.5, 16, 3); R(ctx, '#ece6d2', x, y + 0.5, 16, 0.5); R(ctx, '#6a6258', x, y + 3.5, 16, 1);
        R(ctx, '#141210', x + 7, y + 5, 2, 3);
      }
    },
  });

  // =====================================================================
  // 5. POLAROID: a hanami picnic snapshot. Blue tarps under blossom trees, families sitting,
  //    swan boats on the lake, a kite in the sky. Platforms are park paths and hedges.
  // =====================================================================
  KF.Env.add('polaroid', {
    name: 'HANAMI', bg: '#a8d8f0',
    signBoard: '#ffffff', signShade: '#c8d0d8', signInk: '#2a4a8a', signPost: '#5a4a3a',
    zone: { gravity: '#6a5aff', reverse: '#ff3aa8' },
    build() {
      this.sky = ditherSky(['#7ab8e8', '#90c8ee', '#a8d8f2', '#c4e4f4', '#dceef4']);
      const s = this.sky.getContext('2d'), rnd = U.rng(605);
      [[60, 40], [200, 26], [330, 52]].forEach(([x, y]) => { for (let k = 0; k < 4; k++) disc(s, x + k * 9, y - (k % 2) * 4, 8 + (k % 2) * 3, '#ffffff', 0.7); R(s, '#e8f0f8', x - 6, y + 4, 40, 1); });
      // Far shore: hills, a pagoda roof, and the lake.
      for (let x = 0; x < VW; x += 0.5) { const y = 104 + Math.sin(x / 40) * 4 + Math.sin(x / 13) * 1.5; R(s, '#8ab8a0', x, y, 0.5, 20); }
      for (let k = 0; k < 4; k++) { const y = 92 + k * 4, w = 14 - k * 2; R(s, '#7a4a4a', 290 - w, y, w * 2, 1.5); R(s, '#c89a8a', 290 - w + 2, y + 1.5, w * 2 - 4, 2.5); }
      R(s, '#7a4a4a', 289.5, 86, 1, 6);
      for (let k = 0; k < 40; k++) disc(s, rnd() * VW, 108 + rnd() * 6, 3 + rnd() * 3, rnd() < 0.5 ? '#f4c0d0' : '#7aa888');
      R(s, '#6aa8d8', 0, 118, VW, 30);
      for (let k = 0; k < 50; k++) R(s, '#a8d8f8', rnd() * VW, 120 + rnd() * 26, 4 + rnd() * 10, 0.5);
      // Mid: big blossom trees over blue picnic tarps.
      this.mid = KF.makeHi(768, VH);
      const m = this.mid.getContext('2d');
      R(m, '#78b858', 0, 146, 768, 70); R(m, '#98d070', 0, 146, 768, 0.5);
      this.people = [];
      for (let x = 40; x < 768; x += 128 + Math.floor(rnd() * 40)) {
        R(m, '#5a3a2a', x - 2, 100, 5, 48); R(m, '#5a3a2a', x - 14, 104, 14, 2); R(m, '#5a3a2a', x + 2, 96, 16, 2);
        for (let k = 0; k < 140; k++) { const a = rnd() * 6.28, r = Math.sqrt(rnd()) * 30; disc(m, x + Math.cos(a) * r * 1.6, 88 + Math.sin(a) * r * 0.7, 1.5 + rnd() * 1.5, ['#f8c8d8', '#f4a8c0', '#ffe0ea', '#e890b0'][k % 4]); }
        const tx = x + 14 + Math.floor(rnd() * 20);
        R(m, '#2a5ab0', tx, 148, 44, 6); R(m, '#4a7ad8', tx, 148, 44, 1); R(m, '#1a3a80', tx, 153.5, 44, 0.5);
        R(m, '#c83a2a', tx + 18, 146, 6, 3); R(m, '#202020', tx + 18, 148, 6, 1);
        for (let k = 0; k < 3; k++) this.people.push({ x: tx + 6 + k * 13, ph: rnd() * 9, c: ['#e85a5a', '#f8d050', '#5a8ae8', '#ffffff', '#6ab86a'][Math.floor(rnd() * 5)], hair: rnd() < 0.3 ? '#a8a8a8' : '#2a2020' });
      }
      this.canal = KF.makeHi(128, 64);
      const cn = this.canal.getContext('2d');
      R(cn, '#9a9286', 0, 0, 128, 3); R(cn, '#c8c0b4', 0, 0, 128, 1); for (let x = 0; x < 128; x += 9) R(cn, '#6a645a', x, 0, 0.5, 3);
      R(cn, '#3a78b0', 0, 3, 128, 61); R(cn, '#2a5a8a', 0, 3, 128, 2);
      for (let k = 0; k < 30; k++) R(cn, '#6aa8d8', rnd() * 128, 8 + rnd() * 54, 3 + rnd() * 6, 0.5);
      this.boats = [{ x: 60 }, { x: 250 }];
    },
    background(ctx, cam, t, mood) {
      KF.blit(ctx, this.sky, 0, 0);
      const kx = 120 + Math.sin(t * 0.5) * 20 - cam.x * 0.03, ky = 54 + Math.sin(t * 0.8) * 6; // a kite
      R(ctx, '#ffffff', rd(kx), rd(ky + 8), 0.5, 120);
      ctx.save(); ctx.translate(rd(kx), rd(ky)); ctx.rotate(Math.sin(t * 1.3) * 0.15);
      rows(ctx, -9, 9, (y) => { const w = 7 * (1 - Math.abs(y) / 9); return [-w, w]; }, '#e8302a'); rows(ctx, -9, 0, (y) => { const w = 7 * (1 - Math.abs(y) / 9); return [0, w]; }, '#f8d040');
      for (let k = 0; k < 5; k++) R(ctx, k % 2 ? '#3a6ae8' : '#e8302a', rd(Math.sin(t * 4 + k) * 2), 9 + k * 3, 2, 2);
      ctx.restore();
      for (const b of this.boats) { // swan pedal boats bobbing
        const x = wrap(b.x + t * 3, cam.x, 0.08, 420, 30), y = 134 + Math.sin(t * 1.5 + b.x) * 0.8;
        R(ctx, '#ffffff', rd(x), rd(y), 16, 5); R(ctx, '#d8dce8', rd(x), rd(y + 4), 16, 1); R(ctx, '#ffffff', rd(x + 13), rd(y - 9), 2.5, 10);
        R(ctx, '#ffffff', rd(x + 13), rd(y - 10), 5, 2.5); R(ctx, '#f8a020', rd(x + 18), rd(y - 9.5), 2, 1.5); R(ctx, '#202020', rd(x + 15.5), rd(y - 9.5), 0.5, 0.5);
        R(ctx, '#e85a8a', rd(x + 3), rd(y - 5), 8, 1.5); R(ctx, '#a8b0c8', rd(x + 3), rd(y - 3.5), 0.5, 3.5); R(ctx, '#a8b0c8', rd(x + 10.5), rd(y - 3.5), 0.5, 3.5);
        R(ctx, '#88c0e8', rd(x - 2), rd(y + 5.5), 20, 0.5);
      }
      tiled(ctx, this.mid, cam.x, 0.25);
      for (const p of this.people) { // families sitting on the tarps; arms up when something happens
        const x = wrap(p.x, cam.x, 0.25, 768, 20), y = 149;
        if (x < -10 || x > VW + 10) continue;
        const arm = mood.cheer > 0.3 && Math.sin(t * 10 + p.ph) > -0.5;
        R(ctx, p.c, rd(x - 2.5), y - 6, 5, 6); disc(ctx, x, y - 8.5, 2.2, '#f4c8a0'); R(ctx, p.hair, rd(x - 2), y - 11, 4, 1.5);
        if (arm) { R(ctx, p.c, rd(x - 4), y - 11, 1, 5); R(ctx, p.c, rd(x + 3), y - 11, 1, 5); } else R(ctx, p.c, rd(x + 2), y - 4 + Math.sin(t * 2 + p.ph), 3, 1);
      }
      for (let i = 0; i < 24; i++) { // drifting petals
        const ph = i * 0.41, a = (t * (0.06 + (i % 4) * 0.012) + ph) % 1;
        const x = ((i * 53 + a * 140 + Math.sin(t + i) * 8 - cam.x * 0.5) % (VW + 20) + VW + 20) % (VW + 20) - 10;
        R(ctx, i % 2 ? '#ffd0dc' : '#f8a8c0', rd(x), rd(a * VH), 1.5, 1);
      }
      tiled(ctx, this.canal, cam.x + Math.sin(t) * 2, 0.5, 168);
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid') { // park soil under a flagstone path edged with grass
        R(ctx, '#8a6a4a', x, y, 16, 16);
        for (let k = 0; k < 3; k++) disc(ctx, x + 2 + h2(seed * 31, k) * 12, y + 8 + h2(k, seed * 7) * 6, 1.2, '#a8886a');
        if (e.t) {
          R(ctx, '#4a3a30', x, y, 16, 5.5);
          const off = Math.floor(seed * 4) * 2;
          for (let s = -1; s < 3; s++) { const sx = x + off + s * 7; const a = Math.max(x, sx + 0.5), b = Math.min(x + 16, sx + 7); if (b > a) { R(ctx, '#c8c0b4', a, y + 0.5, b - a, 4.5); R(ctx, '#e4ded2', a, y + 0.5, b - a, 0.5); R(ctx, '#9a9286', a, y + 4.5, b - a, 0.5); } }
          for (let i = 0; i < 16; i += 2.5) R(ctx, '#5aa040', x + i, y + 5.5, 1, 1 + (i % 2));
          R(ctx, '#5aa040', x, y + 5.5, 16, 0.5);
          if (seed > 0.7) R(ctx, '#ffc0d0', x + seed * 12, y + 2, 1.5, 1);
        }
        if (e.b) R(ctx, '#4a3424', x, y + 15, 16, 1);
        if (e.l) R(ctx, '#5a4430', x, y, 0.5, 16); if (e.r) R(ctx, '#5a4430', x + 15.5, y, 0.5, 16);
      } else if (art === 'alt') { // trimmed hedge with blossom in it
        R(ctx, '#2a5a2a', x, y, 16, 16); R(ctx, '#4a8a3a', x + 0.5, y + 0.5, 15, 15);
        for (let k = 0; k < 10; k++) disc(ctx, x + 2 + h2(seed * 99, k) * 12, y + 2 + h2(k, seed * 41) * 12, 1.3, k % 2 ? '#6aaa4a' : '#3a7a30');
        R(ctx, '#88c868', x + 0.5, y + 0.5, 15, 1); R(ctx, '#ffd0dc', x + 4, y + 5, 1.5, 1.5); R(ctx, '#ffd0dc', x + 11, y + 10, 1.5, 1.5);
      } else if (art === 'ice') { // pond water, glassy
        R(ctx, '#5aa0d8', x, y, 16, 16); R(ctx, '#c8ecff', x, y, 16, 1);
        R(ctx, '#a8dcf8', x + 2 + seed * 6, y + 5, 6, 0.5); R(ctx, '#a8dcf8', x + 6, y + 10, 5, 0.5);
        if (e.b) R(ctx, '#2a6a9a', x, y + 15, 16, 1);
      } else { // park bench slat on iron legs
        R(ctx, '#3a2a20', x, y, 16, 4.5); R(ctx, '#c88a50', x, y + 0.5, 16, 1.5); R(ctx, '#a86a38', x, y + 2.5, 16, 1.5); R(ctx, '#e8a868', x, y + 0.5, 16, 0.5);
        R(ctx, '#303038', x + 2, y + 4.5, 1.5, 4); R(ctx, '#303038', x + 12.5, y + 4.5, 1.5, 4);
      }
    },
  }, {
    under(ctx) {
      ctx.globalAlpha = 0.18; const g = ctx.createLinearGradient(VW - 90, 0, VW, 0); g.addColorStop(0, 'rgba(255,120,40,0)'); g.addColorStop(1, 'rgba(255,120,40,1)'); ctx.fillStyle = g; ctx.fillRect(VW - 90, 0, 90, VH); ctx.globalAlpha = 1;
      R(ctx, '#f6f2ea', 0, 0, VW, 6); R(ctx, '#f6f2ea', 0, 0, 6, VH); R(ctx, '#f6f2ea', VW - 6, 0, 6, VH); R(ctx, '#f6f2ea', 0, VH - 20, VW, 20);
      R(ctx, '#e0dcd2', 6, 6, VW - 12, 0.5);
      F().draw(ctx, "HANAMI '98", VW - 18, VH - 14, '#2a3ab0', 1, 'right');
      R(ctx, '#2a3ab0', VW - 76, VH - 5, 58, 0.5);
    },
  });
})(window.KF);
