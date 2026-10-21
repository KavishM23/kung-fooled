'use strict';
// Per-stage environments for the viking realm. Each stage is a different place and medium:
// a carved runestone, a stitched tapestry, a mead hall at night, a glacier cave, and Valhalla.
(function (KF) {
  const VW = KF.VIEW_W, VH = KF.VIEW_H, U = KF.util;
  const { R, ditherSky, tiled, wrapX, edges, Art } = KF.ThemeKit;
  const layer = (w, h, seed, fn) => { const c = KF.makeHi(w, h); fn(c.getContext('2d'), U.rng(seed)); return c; };
  const disc = (ctx, c, x, y, r) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
  const NOISE = new Float32Array(1 << 16), NM = (1 << 16) - 1;
  { const r = U.rng(4242); for (let i = 0; i < NOISE.length; i++) NOISE[i] = r(); }
  const lum = (d, o) => (d[o] * 77 + d[o + 1] * 150 + d[o + 2] * 29) >> 8;

  // Tiny 3x5 runes, one bit string per rune (rows top to bottom).
  const RUNES = ['010011010010010', '110101110101101', '100110101100100', '010111010010010', '101101010101101', '111010010010010', '100100110101110', '010101010010010'];
  function rune(ctx, k, x, y, c, s = 1) {
    const b = RUNES[k % RUNES.length];
    for (let i = 0; i < 15; i++) if (b[i] === '1') R(ctx, c, x + (i % 3) * s, y + Math.floor(i / 3) * s, s, s);
  }

  // A longship: dragon prow, curled stern, striped sail and a row of shields.
  function longship(ctx, x, y, s, p) {
    const w = 70 * s;
    for (let i = 0; i <= w; i++) {
      const u = i / w, dip = Math.sin(u * Math.PI) * 7 * s;
      R(ctx, p.hull, x + i, y - 6 * s + dip * 0.2, 1, 6 * s + dip * 0.5);
    }
    R(ctx, p.trim, x, y - 6 * s, w, Math.max(1, s));
    // Prow and stern curls.
    for (let k = 0; k < 10; k++) { R(ctx, p.hull, x - k * 0.6 * s, y - 6 * s - k * 1.6 * s, 2 * s, 2 * s); R(ctx, p.hull, x + w + k * 0.6 * s - 2 * s, y - 6 * s - k * 1.6 * s, 2 * s, 2 * s); }
    R(ctx, p.hull, x - 8 * s, y - 22 * s, 5 * s, 3 * s); R(ctx, p.eye || p.trim, x - 7 * s, y - 22 * s, s, s); // dragon head
    R(ctx, p.hull, x + w + 4 * s, y - 20 * s, 3 * s, 4 * s);
    R(ctx, p.mast, x + w / 2 - s, y - 44 * s, 2 * s, 38 * s);
    for (let k = 0; k < 6; k++) R(ctx, k % 2 ? p.sailA : p.sailB, x + w / 2 - 16 * s, y - 42 * s + k * 5 * s, 32 * s, 5 * s);
    R(ctx, p.mast, x + w / 2 - 18 * s, y - 43 * s, 36 * s, s);
    for (let k = 0; k < 7; k++) { disc(ctx, p.shieldRim || p.hull, x + 6 * s + k * 9.5 * s, y - 7 * s, 4 * s); disc(ctx, k % 2 ? p.shA : p.shB, x + 6 * s + k * 9.5 * s, y - 7 * s, 3 * s); }
  }
  // A warrior figure with spear and round shield (side view, s = scale).
  function warrior(ctx, x, y, s, c, sh) {
    R(ctx, c, x, y - 14 * s, 4 * s, 9 * s);          // body
    R(ctx, c, x + s, y - 18 * s, 3 * s, 3 * s);      // head
    R(ctx, c, x, y - 19 * s, 4 * s, s);              // helmet
    R(ctx, c, x, y - 5 * s, s, 5 * s); R(ctx, c, x + 3 * s, y - 5 * s, s, 5 * s); // legs
    R(ctx, c, x + 5 * s, y - 24 * s, s, 22 * s);     // spear
    R(ctx, c, x + 4 * s, y - 26 * s, 3 * s, 2 * s);
    disc(ctx, sh || c, x - s, y - 10 * s, 3 * s);
  }
  // Four-legged beast for borders and scenes (horse when big, hound/wolf when small).
  function beast(ctx, x, y, s, c, ph = 0, rider) {
    const step = Math.sin(ph) * s;
    R(ctx, c, x, y - 9 * s, 12 * s, 4 * s);                                 // body
    R(ctx, c, x + 11 * s, y - 12 * s, 2 * s, 4 * s); R(ctx, c, x + 12 * s, y - 13 * s, 4 * s, 2 * s); // neck + head
    R(ctx, c, x + 12 * s, y - 14 * s, s, s);                                // ear
    R(ctx, c, x + s + step, y - 5 * s, s, 5 * s); R(ctx, c, x + 3 * s - step, y - 5 * s, s, 5 * s);
    R(ctx, c, x + 8 * s - step, y - 5 * s, s, 5 * s); R(ctx, c, x + 10 * s + step, y - 5 * s, s, 5 * s);
    R(ctx, c, x - 2 * s, y - 10 * s, 2 * s, s); R(ctx, c, x - 3 * s, y - 9 * s, s, 3 * s); // tail
    if (rider) warrior(ctx, x + 4 * s, y - 8 * s, s * 0.8, rider);
  }
  // Viking timber door: iron bands, ring handle, a torch that marks the real exit.
  function timberDoor(p) {
    return function (ctx, x, y, o = {}) {
      x = Math.round(x); y = Math.round(y);
      ctx.save();
      if (o.flipped) { ctx.translate(0, y * 2 + 32); ctx.scale(1, -1); }
      if (o.legs) {
        const k = Math.floor(o.legs * 12) % 2;
        R(ctx, p.out, x + 3 + k, y + 31, 3, 4); R(ctx, p.out, x + 10 - k, y + 31, 3, 4);
      }
      R(ctx, p.out, x - 2, y + 1, 20, 31); R(ctx, p.out, x, y - 1, 16, 2);
      R(ctx, p.frame, x - 1, y + 2, 18, 30); R(ctx, p.frame, x + 1, y, 14, 2);
      const open = o.open || 0;
      if (open > 0) {
        R(ctx, '#140a04', x + 1, y + 3, 14, 29);
        ctx.globalAlpha = 0.5 + 0.5 * open; R(ctx, p.glow, x + 3, y + 5, 10, 27); R(ctx, '#fff6dc', x + 5, y + 8, 6, 24); ctx.globalAlpha = 1;
        const pw = Math.max(1, Math.round(7 * (1 - open)));
        R(ctx, p.wood, x + 1, y + 3, pw, 29); R(ctx, p.wood, x + 15 - pw, y + 3, pw, 29);
      } else {
        R(ctx, p.wood, x + 1, y + 3, 14, 29);
        for (let i = 1; i < 4; i++) R(ctx, p.grain, x + 1 + i * 3.5, y + 3, 1, 29);
        R(ctx, p.hi, x + 1, y + 3, 14, 1);
        R(ctx, p.iron, x + 1, y + 9, 14, 2); R(ctx, p.iron, x + 1, y + 23, 14, 2);
        R(ctx, p.ironHi, x + 1, y + 9, 14, 1); R(ctx, p.ironHi, x + 1, y + 23, 14, 1);
        ctx.strokeStyle = p.iron; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x + 11.5, y + 17.5, 2, 0, 7); ctx.stroke();
      }
      if (o.lantern) { // torch on a bracket above the door
        const fl = Math.sin((o.t || 0) * 17) * 0.5 + Math.sin((o.t || 0) * 11) * 0.5;
        ctx.globalAlpha = 0.22 + 0.06 * fl; disc(ctx, p.glow, x + 8, y - 8, 11); ctx.globalAlpha = 1;
        R(ctx, p.out, x + 7, y - 6, 2, 6); R(ctx, '#6a4426', x + 7, y - 6, 2, 5);
        R(ctx, '#ff7a20', x + 5, y - 12 + Math.round(fl), 6, 6); R(ctx, '#ffd050', x + 6, y - 11 + Math.round(fl), 4, 4); R(ctx, '#fff8d0', x + 7, y - 9, 2, 2);
      }
      ctx.restore();
    };
  }

  // ======================================================================
  // 1. RUNESTONE: the stage is carved into a painted granite runestone.
  // ======================================================================
  const OCHRE = '#a8482c', OCHRE_D = '#6e2c1c';
  KF.Env.add('emboss', {
    name: 'RUNESTONE', bg: '#77736a',
    signBoard: '#c8c0b0', signShade: '#8a8478', signInk: OCHRE_D, signPost: '#5a564e',
    zone: { gravity: '#7a8aff', reverse: '#ff5ac0' },
    build() {
      this.sky = layer(VW, VH, 1, (x, rnd) => { // granite face with speckle
        R(x, '#7a766c', 0, 0, VW, VH);
        for (let i = 0; i < 2600; i++) R(x, rnd() < 0.5 ? '#6c685f' : '#87837a', rnd() * VW, rnd() * VH, rnd() < 0.2 ? 1 : 0.5, 0.5);
        for (let i = 0; i < 12; i++) { const y = rnd() * VH; for (let k = 0; k < 80; k++) R(x, '#6a665d', rnd() * VW, y + (rnd() - 0.5) * 6, 2, 0.5); } // natural strata
      });
      // Serpent band: the runestone's great snake, a ribbon full of runes winding across.
      this.far = layer(640, VH, 2, (x, rnd) => {
        const path = (u) => 66 + Math.sin(u * 0.0196) * 30 + Math.sin(u * 0.049) * 8;
        for (let u = 0; u < 640; u++) {
          const y = path(u);
          R(x, '#5c584f', u, y - 8, 1, 16);
          R(x, OCHRE, u, y - 6, 1, 12);
          R(x, '#c4683e', u, y - 6, 1, 1);
          R(x, '#4c483f', u, y + 6, 1, 2);
        }
        for (let u = 6, k = 0; u < 634; u += 7, k++) rune(x, k * 3 + 1, u, Math.round(path(u + 1)) - 3, '#3a2014');
        // Crossing loops of knotwork where the serpent bites its tail.
        for (const cx of [120, 440]) {
          x.lineWidth = 5; x.strokeStyle = '#5c584f'; x.beginPath(); x.ellipse(cx, path(cx), 26, 22, 0, 0, 7); x.stroke();
          x.lineWidth = 3; x.strokeStyle = OCHRE; x.beginPath(); x.ellipse(cx, path(cx), 26, 22, 0, 0, 7); x.stroke();
          x.lineWidth = 5; x.strokeStyle = '#5c584f'; x.beginPath(); x.ellipse(cx, path(cx), 14, 26, 0.8, 0, 7); x.stroke();
          x.lineWidth = 3; x.strokeStyle = '#2f5a7a'; x.beginPath(); x.ellipse(cx, path(cx), 14, 26, 0.8, 0, 7); x.stroke();
        }
        // Serpent head with an eye.
        const hx = 300, hy = path(300);
        R(x, '#5c584f', hx - 2, hy - 11, 20, 22); R(x, OCHRE, hx, hy - 9, 16, 18); R(x, '#f0e8d8', hx + 9, hy - 5, 3, 3); R(x, '#1a1a1a', hx + 10, hy - 4, 1, 1);
        R(x, '#5c584f', hx + 16, hy + 2, 8, 2);
      });
      // Carved scenes: ships, riders, a shield wall. Each is cut darker into the stone.
      this.mid = layer(768, VH, 3, (x, rnd) => {
        const cut = { hull: '#55514a', trim: '#8a8478', mast: '#55514a', sailA: OCHRE, sailB: '#8e8a80', shA: '#2f5a7a', shB: OCHRE, shieldRim: '#4a463f', eye: '#d8d0c0' };
        longship(x, 40, 156, 1, cut);
        longship(x, 420, 152, 0.8, cut);
        beast(x, 240, 150, 1.6, '#57534b', 0, '#57534b');
        for (let k = 0; k < 4; k++) warrior(x, 600 + k * 14, 154, 1, '#57534b', k % 2 ? OCHRE : '#2f5a7a');
        beast(x, 330, 152, 0.9, '#57534b', 1.5);
        // Rune bands framing the panel.
        for (let u = 0; u < 768; u += 5) { rune(x, Math.floor(rnd() * 8), u, 112, '#5a564d'); }
        R(x, '#625e55', 0, 110, 768, 1); R(x, '#8c887e', 0, 119, 768, 1);
      });
    },
    background(ctx, cam, t, mood) {
      KF.blit(ctx, this.sky, 0, 0);
      tiled(ctx, this.far, cam.x, 0.1);
      tiled(ctx, this.mid, cam.x, 0.3);
      R(ctx, '#6a665e', 0, 158, VW, VH - 158); R(ctx, '#8a867c', 0, 158, VW, 1);
      // Carved onlookers: a frieze of horned figures that leaps when you die.
      Art.crowd(ctx, cam.x, t, { y: 172, par: 0.5, color: '#5c584f', rim: '#a09a8e', seed: 70, gap: 2, horns: true, cheer: mood.cheer });
      for (let i = 0; i < 14; i++) { // drifting stone dust
        const age = (t * 0.05 + i * 0.071) % 1, x = ((i * 67 - cam.x * 0.6) % VW + VW) % VW;
        ctx.globalAlpha = 0.5 * Math.sin(age * Math.PI); R(ctx, '#d8d0c0', x, age * VH, 1, 1); ctx.globalAlpha = 1;
      }
      if (mood.cheer > 0.4) for (let i = 0; i < 8; i++) R(ctx, '#d0c8b8', (i * 53 + t * 40) % VW, ((t * 120 + i * 29) % 60) + 40, 1, 1); // chips flying off
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid' || art === 'alt') {
        const base = art === 'alt' ? '#8e8a80' : '#9a958a';
        R(ctx, base, x, y, 16, 16);
        // Chiselled bevel: light upper-left, dark lower-right.
        R(ctx, '#a8a296', x + 1, y + 1, 14, 1); R(ctx, '#a8a296', x + 1, y + 1, 1, 13);
        R(ctx, '#7e7a70', x + 1, y + 14, 14, 1); R(ctx, '#7e7a70', x + 14, y + 1, 1, 14);
        if (seed < 0.5) R(ctx, '#7e7a70', x + 1, y + 8, 14, 1); // chisel line splitting the block
        for (let k = 0; k < 6; k++) { const h = U.hash2(Math.floor(seed * 911) + k, y); R(ctx, h < 0.5 ? '#86827a' : '#aca69a', x + 2 + Math.floor(h * 11), y + 3 + Math.floor((h * 7 % 1) * 10), 2, 1); }
        if (art === 'alt') { // carved shield boss
          disc(ctx, '#6a665e', x + 8, y + 8, 6); disc(ctx, OCHRE, x + 8, y + 8, 5); disc(ctx, '#c2bcae', x + 8, y + 8, 1.5);
        } else if (seed > 0.7) rune(ctx, Math.floor(seed * 80), x + 6, y + 6, OCHRE_D);
        if (e.t) { R(ctx, '#e4ded0', x, y, 16, 2); R(ctx, OCHRE, x, y + 2, 16, 1); R(ctx, '#5e5a52', x, y + 3, 16, 1); }
        edges(ctx, x, y, e, '#2a2824');
      } else if (art === 'ice') { // polished soapstone: glassy and slick
        R(ctx, '#c8d4dc', x, y, 16, 16); R(ctx, '#f4fbff', x, y, 16, 2); R(ctx, '#7a8a96', x, y + 14, 16, 2);
        for (let k = 0; k < 3; k++) R(ctx, '#ffffff', x + 2 + k * 5 + Math.floor(seed * 3), y + 4 + k * 3, 3, 1);
        edges(ctx, x, y, e, '#2a3036');
      } else {
        R(ctx, '#dcd6c8', x, y, 16, 1); R(ctx, '#9a958a', x, y + 1, 16, 2); R(ctx, '#4a463f', x, y + 3, 16, 1);
        R(ctx, OCHRE, x + 3, y + 1, 10, 1);
      }
    },
    door: timberDoor({ out: '#2a2824', frame: '#5e5a52', wood: '#8a6a4a', grain: '#6a4e34', hi: '#b08a62', iron: '#3a3a3e', ironHi: '#7a7a82', glow: '#ffc070' }),
  }, {
    // Emboss, but painted grooves and hazards keep some of their colour (runestones were painted).
    post(d, W, H, i) {
      const n = W * H, r = i.res, L = this.L && this.L.length === n ? this.L : (this.L = new Uint8Array(n));
      for (let k = 0; k < n; k++) L[k] = lum(d, k * 4);
      for (let k = 0, o = 0; k < n; k++, o += 4) {
        const x = k % W, y = (k / W) | 0;
        const a = L[k - r * W - r] ?? L[k], b = L[k + r * W + r] ?? L[k];
        const v = 128 + (a - b) * 1.3 + (NOISE[(((y >> 1) * 977 + (x >> 1)) & NM)] - 0.5) * 20 + (L[k] - 128) * 0.3;
        const mx = Math.max(d[o], d[o + 1], d[o + 2]), mn = Math.min(d[o], d[o + 1], d[o + 2]);
        const m = U.clamp((mx - mn - 40) / 110, 0, 0.8), f = v / 150;
        d[o] = v * 0.98 * (1 - m) + d[o] * f * m; d[o + 1] = v * 0.95 * (1 - m) + d[o + 1] * f * m; d[o + 2] = v * 0.88 * (1 - m) + d[o + 2] * f * m;
      }
    },
  });

  // ======================================================================
  // 2. TAPESTRY: an embroidered strip of linen telling the hero's story.
  // ======================================================================
  const TP = { linen: '#e2d6b4', blue: '#2c3a6a', red: '#a8402a', ochre: '#d0982c', green: '#5a7038', sage: '#8a9a5a', brown: '#6a4426' };
  KF.Env.add('stitch', {
    name: 'TAPESTRY', bg: TP.linen,
    signBoard: '#f2e8cc', signShade: TP.ochre, signInk: TP.blue, signPost: TP.brown,
    zone: { gravity: '#4a5ad0', reverse: '#d04a9a' },
    build() {
      this.sky = layer(VW, VH, 11, (x, rnd) => {
        R(x, TP.linen, 0, 0, VW, VH);
        for (let i = 0; i < 1800; i++) R(x, rnd() < 0.5 ? '#d6c9a4' : '#ece2c4', rnd() * VW, rnd() * VH, 2, 0.5); // weave slubs
      });
      // Upper story band: ships, riders and stitched captions.
      this.far = layer(768, VH, 12, (x) => {
        const sh = { hull: TP.brown, trim: TP.ochre, mast: TP.brown, sailA: TP.red, sailB: TP.ochre, shA: TP.blue, shB: TP.red, shieldRim: TP.brown, eye: TP.ochre };
        longship(x, 30, 138, 1.1, sh);
        longship(x, 420, 132, 0.9, { ...sh, sailA: TP.green, sailB: TP.ochre });
        for (let k = 0; k < 3; k++) beast(x, 240 + k * 34, 136, 1.4, [TP.blue, TP.red, TP.green][k], k * 2, TP.brown);
        // Stitched waves under the ships.
        for (let u = 0; u < 768; u += 10) for (let k = 0; k < 8; k++) R(x, TP.blue, u + k, 142 + Math.round(Math.sin(k / 8 * Math.PI) * -3), 2, 1);
        // Stylised trees that separate scenes.
        for (const tx of [200, 380, 700]) {
          R(x, TP.brown, tx, 98, 3, 44);
          for (let k = 0; k < 4; k++) { x.strokeStyle = k % 2 ? TP.green : TP.sage; x.lineWidth = 2; x.beginPath(); x.arc(tx + 1.5, 96 - k * 5, 6 + k * 3, Math.PI * 1.1, Math.PI * 1.9); x.stroke(); }
        }
        KF.Font.draw(x, 'HIC NAVIGAT', 40, 72, TP.blue, 2);
        KF.Font.draw(x, 'ET HIC CADIT', 286, 80, TP.red, 2);
        KF.Font.draw(x, 'ET SALTAT', 470, 68, TP.blue, 2);
        KF.Font.draw(x, 'ITERUM', 650, 84, TP.red, 2);
      });
      // Border bands of beasts and birds, top and bottom (the tapestry's margins).
      this.border = layer(384, 22, 13, (x) => {
        R(x, '#d8cba6', 0, 0, 384, 22); R(x, TP.blue, 0, 0, 384, 1); R(x, TP.blue, 0, 21, 384, 1);
        for (let u = 0; u < 384; u += 32) {
          x.strokeStyle = TP.ochre; x.lineWidth = 1; x.beginPath(); x.moveTo(u, 1); x.lineTo(u + 16, 21); x.lineTo(u + 32, 1); x.stroke();
          beast(x, u + 2, 17, 0.6, (u / 32) % 2 ? TP.red : TP.green);
          // bird
          R(x, TP.blue, u + 22, 8, 4, 2); R(x, TP.blue, u + 20, 6, 2, 2); R(x, TP.blue, u + 26, 6, 2, 2); R(x, TP.blue, u + 25, 9, 2, 3);
        }
      });
    },
    background(ctx, cam, t, mood) {
      KF.blit(ctx, this.sky, 0, 0);
      tiled(ctx, this.border, cam.x, 0.15, 48);
      ctx.save(); ctx.translate(0, Math.round(Math.sin(t * 0.8) * 1)); tiled(ctx, this.far, cam.x, 0.25); ctx.restore();
      tiled(ctx, this.border, cam.x, 0.15, 150);
      // Stitched army marching along the lower margin; they wave spears when you die.
      Art.crowd(ctx, cam.x, t, { y: 196, par: 0.5, color: TP.brown, rim: TP.ochre, seed: 72, gap: 3, horns: true, cheer: mood.cheer });
      // Loose threads drifting about.
      for (let i = 0; i < 6; i++) {
        const x = ((i * 71 + t * 6 - cam.x * 0.4) % VW + VW) % VW, y = 60 + i * 20 + Math.sin(t + i) * 4;
        ctx.strokeStyle = [TP.red, TP.blue, TP.ochre][i % 3]; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 4, y + 4 + Math.sin(t * 2 + i) * 2, x + 9, y + 1); ctx.stroke();
      }
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid' || art === 'alt') {
        const a = art === 'alt' ? TP.red : '#46602a', b = art === 'alt' ? '#c8604a' : '#6e8240';
        R(ctx, a, x, y, 16, 16);
        for (let k = 0; k < 16; k += 3) R(ctx, b, x, y + k + ((Math.floor(seed * 3) + k) % 2), 16, 1); // satin-stitch rows
        for (let k = 0; k < 4; k++) R(ctx, '#3a4a24', x + ((k * 5 + Math.floor(seed * 9)) % 15), y + 5 + k * 3, 1, 2);
        if (art === 'alt') { R(ctx, TP.ochre, x + 4, y + 4, 8, 8); R(ctx, TP.blue, x + 6, y + 6, 4, 4); }
        else { R(ctx, TP.ochre, x + 6, y + 8, 4, 4); R(ctx, TP.red, x + 7, y + 9, 2, 2); } // a diamond chain motif
        if (e.t) { R(ctx, TP.blue, x, y, 16, 2); R(ctx, TP.ochre, x, y + 2, 16, 3); R(ctx, TP.red, x + ((Math.floor(seed * 4) * 4) % 16), y + 2, 4, 3); R(ctx, TP.blue, x, y + 5, 16, 1); }
        if (e.b) R(ctx, TP.blue, x, y + 15, 16, 1);
        if (e.l) R(ctx, TP.blue, x, y, 1, 16);
        if (e.r) R(ctx, TP.blue, x + 15, y, 1, 16);
      } else if (art === 'ice') { // pale silk: glossy and slippery
        R(ctx, '#a8d0e8', x, y, 16, 16);
        for (let k = 0; k < 16; k += 2) R(ctx, '#d8f0ff', x + ((k * 3) % 8), y + k, 8, 1);
        if (e.t) { R(ctx, TP.blue, x, y, 16, 1); R(ctx, '#ffffff', x, y + 1, 16, 2); R(ctx, TP.blue, x, y + 3, 16, 1); }
        edges(ctx, x, y, e, TP.blue);
      } else {
        R(ctx, TP.blue, x, y, 16, 1); R(ctx, TP.ochre, x, y + 1, 16, 2); R(ctx, TP.blue, x, y + 3, 16, 1);
      }
    },
    door: timberDoor({ out: TP.blue, frame: TP.brown, wood: TP.ochre, grain: '#a87020', hi: '#f0c060', iron: TP.blue, ironHi: '#5a6aa0', glow: '#ffd060' }),
  }, {
    // Cross-stitch: each 3x3 cell is an X of thread over linen. Less linen shows through than the
    // generic stitch pass so platforms keep their colour.
    post(d, W, H) {
      const C = 3;
      for (let cy = 0; cy < H; cy += C) for (let cx = 0; cx < W; cx += C) {
        let r = 0, g = 0, b = 0, n = 0;
        const ey = Math.min(H, cy + C), ex = Math.min(W, cx + C);
        for (let y = cy; y < ey; y++) for (let x = cx; x < ex; x++) { const o = (y * W + x) * 4; r += d[o]; g += d[o + 1]; b += d[o + 2]; n++; }
        r /= n; g /= n; b /= n;
        for (let y = cy; y < ey; y++) for (let x = cx; x < ex; x++) {
          const o = (y * W + x) * 4, lx = x - cx, ly = y - cy;
          if (lx === ly || lx === C - 1 - ly) { d[o] = r; d[o + 1] = g; d[o + 2] = b; } else { const w = (x + y) % 2 ? 206 : 222; d[o] = w * 0.3 + r * 0.7; d[o + 1] = (w - 10) * 0.3 + g * 0.7; d[o + 2] = (w - 34) * 0.3 + b * 0.7; }
        }
      }
    },
  });

  // ======================================================================
  // 3. MEAD HALL at night: lit by a hearth and antler chandeliers.
  // ======================================================================
  const hallLights = []; // screen-space lights, refreshed by the background each frame
  KF.Env.add('candle', {
    name: 'MEAD HALL', bg: '#1a0e08',
    signBoard: '#e0c090', signShade: '#a07040', signInk: '#3a1a08', signPost: '#4a2a14',
    zone: { gravity: '#8a7aff', reverse: '#ff5ab0' },
    build() {
      this.sky = layer(VW, VH, 21, (x, rnd) => { // back wall of vertical planks
        R(x, '#2a160c', 0, 0, VW, VH);
        for (let u = 0; u < VW; u += 9) { R(x, rnd() < 0.5 ? '#321a0e' : '#2c180c', u, 0, 8, VH); R(x, '#1a0c06', u + 8, 0, 1, VH); for (let k = 0; k < 6; k++) R(x, '#3a2012', u + 2 + rnd() * 5, rnd() * VH, 1, 6 + rnd() * 10); }
      });
      this.far = layer(640, VH, 22, (x, rnd) => {
        // Roof: crossing rafters and a ridge beam.
        R(x, '#140a04', 0, 0, 640, 26);
        for (let u = 0; u < 640; u += 80) { x.strokeStyle = '#1e1008'; x.lineWidth = 6; x.beginPath(); x.moveTo(u, 0); x.lineTo(u + 80, 46); x.moveTo(u + 80, 0); x.lineTo(u, 46); x.stroke(); }
        R(x, '#3a2010', 0, 26, 640, 5); R(x, '#5a3418', 0, 26, 640, 1);
        // Carved posts and a row of hanging shields.
        for (let u = 20; u < 640; u += 80) { R(x, '#3a2010', u, 31, 8, VH); R(x, '#4a2a16', u, 31, 2, VH); for (let k = 0; k < 6; k++) R(x, '#24120a', u + 2, 40 + k * 18, 4, 2); }
        for (let u = 50, k = 0; u < 640; u += 26, k++) {
          if ((u - 20) % 80 < 14) continue;
          disc(x, '#120804', u, 62, 9); disc(x, ['#8a2a1a', '#2a4a7a', '#c08a2a', '#3a5a2a'][k % 4], u, 62, 8);
          if (k % 2) { R(x, '#d8c8a0', u - 1, 54, 2, 16); R(x, '#d8c8a0', u - 8, 61, 16, 2); } else { x.strokeStyle = '#d8c8a0'; x.lineWidth = 1; x.beginPath(); x.arc(u, 62, 5, 0, 7); x.stroke(); }
          disc(x, '#a0a0a8', u, 62, 2);
        }
        // Crossed axes and a pair of antlers between shields.
        for (let u = 180; u < 640; u += 240) {
          x.strokeStyle = '#5a3418'; x.lineWidth = 2; x.beginPath(); x.moveTo(u - 10, 100); x.lineTo(u + 10, 80); x.moveTo(u + 10, 100); x.lineTo(u - 10, 80); x.stroke();
          R(x, '#9a9aa2', u - 13, 78, 6, 5); R(x, '#9a9aa2', u + 7, 78, 6, 5);
        }
      });
      // Long tables, benches and a stone hearth in the middle distance.
      this.mid = layer(768, VH, 23, (x, rnd) => {
        for (let u = 0; u < 768; u += 384) {
          const hx = u + 180; // hearth
          R(x, '#3a3430', hx - 30, 140, 60, 14); R(x, '#4e4842', hx - 30, 140, 60, 2);
          for (let k = 0; k < 8; k++) R(x, '#2a2420', hx - 28 + k * 7, 144, 1, 10);
          R(x, '#4a2a14', hx - 14, 136, 28, 4); R(x, '#3a1e0c', hx - 10, 133, 20, 3); // logs
          // sleeping dog by the fire (body drawn here, breathing added live)
          R(x, '#5a4030', hx + 36, 146, 18, 6); R(x, '#5a4030', hx + 52, 145, 6, 5); R(x, '#3a2818', hx + 56, 144, 2, 2); R(x, '#5a4030', hx + 30, 149, 6, 2);
          // tables either side
          for (const tx of [u + 20, u + 260]) {
            R(x, '#4a2a14', tx, 134, 90, 4); R(x, '#6a4020', tx, 134, 90, 1);
            R(x, '#3a2010', tx + 4, 138, 3, 16); R(x, '#3a2010', tx + 83, 138, 3, 16);
            R(x, '#3a2010', tx - 4, 146, 98, 3);
            for (let k = 0; k < 6; k++) { // cups, plates and a roast
              const cx = tx + 8 + k * 14;
              if (k === 3) { R(x, '#8a5a2a', cx - 3, 129, 10, 5); R(x, '#d8c8a0', cx + 6, 130, 3, 1); } else { R(x, '#8a6a3a', cx, 130, 3, 4); R(x, '#c0a060', cx, 130, 3, 1); }
            }
          }
        }
      });
    },
    background(ctx, cam, t, mood) {
      KF.blit(ctx, this.sky, 0, 0);
      tiled(ctx, this.far, cam.x, 0.15);
      tiled(ctx, this.mid, cam.x, 0.35);
      hallLights.length = 0;
      // Hearth fires.
      for (let u = 0; u < 768; u += 384) {
        const x = wrapX(u + 180, cam.x, 0.35, 768) + 24;
        if (x < -80 || x > VW + 80) continue;
        hallLights.push({ x, y: 128, r0: 34, r1: 80 });
        for (let k = 0; k < 7; k++) {
          const ph = t * (6 + k) + k * 1.7, h = 10 + Math.sin(ph) * 3 + (k % 3) * 2;
          R(ctx, k % 2 ? '#ff8a20' : '#ff5a10', x - 12 + k * 4, 134 - h, 3, h);
          R(ctx, '#ffd050', x - 11 + k * 4, 134 - h * 0.6, 1, h * 0.6);
        }
        for (let k = 0; k < 5; k++) { const a = (t * 0.6 + k / 5) % 1; ctx.globalAlpha = 1 - a; R(ctx, '#ffc040', x + Math.sin(t * 3 + k) * 8, 120 - a * 60, 1, 1); } // embers
        ctx.globalAlpha = 1;
        const br = Math.sin(t * 1.4) > 0 ? 1 : 0; R(ctx, '#5a4030', x + 36, 145 - br, 14, 1); // dog breathing
      }
      // Antler chandeliers with candles, swaying a little.
      for (let u = 60; u < 640; u += 160) {
        const x = Math.round(wrapX(u, cam.x, 0.15, 640) + 24 + Math.sin(t * 0.9 + u) * 1.5);
        if (x < -40 || x > VW + 40) continue;
        hallLights.push({ x, y: 46, r0: 18, r1: 46 });
        R(ctx, '#140a04', x, 26, 1, 14);
        R(ctx, '#c8b090', x - 16, 42, 32, 2);
        for (let k = -2; k <= 2; k++) { R(ctx, '#c8b090', x + k * 7, 38, 1, 4); R(ctx, '#c8b090', x + k * 7 - 2, 36, 1, 3); }
        for (let k = -2; k <= 2; k++) { R(ctx, '#e8e0c8', x + k * 7, 33, 1, 3); R(ctx, Math.sin(t * 15 + k) > 0 ? '#ffe070' : '#ffb040', x + k * 7, 31, 1, 2); }
      }
      // Feasting warriors in the foreground, toasting when you die.
      Art.crowd(ctx, cam.x, t, { y: 172, par: 0.55, color: '#1e100a', rim: '#7a4a24', seed: 73, gap: 2, horns: true, cheer: mood.cheer });
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid') { // timber floor beams
        R(ctx, '#7a4a26', x, y, 16, 16);
        for (let k = 0; k < 4; k++) { R(ctx, k % 2 ? '#6a3e1e' : '#84522a', x, y + k * 4, 16, 3); R(ctx, '#3a2010', x, y + k * 4 + 3, 16, 1); }
        R(ctx, '#3a2010', x + ((Math.floor(seed * 7) * 5) % 16), y, 1, 16);
        R(ctx, '#2a2a2e', x + 3, y + 5, 1, 1); R(ctx, '#2a2a2e', x + 12, y + 9, 1, 1);
        if (e.t) { R(ctx, '#f0c890', x, y, 16, 1); R(ctx, '#c08a52', x, y + 1, 16, 2); R(ctx, '#3a1e0c', x, y + 3, 16, 1); }
        edges(ctx, x, y, e, '#1a0c04');
      } else if (art === 'alt') { // mead barrel
        R(ctx, '#8a5a2e', x, y, 16, 16); for (let k = 2; k < 16; k += 4) R(ctx, '#6a4020', x + k, y, 1, 16);
        R(ctx, '#4a4a52', x, y + 3, 16, 2); R(ctx, '#4a4a52', x, y + 11, 16, 2); R(ctx, '#9a9aa6', x, y + 3, 16, 1);
        if (e.t) R(ctx, '#e0b070', x, y, 16, 1);
        edges(ctx, x, y, e, '#1a0c04');
      } else if (art === 'ice') { // spilled mead on polished boards: bright and glossy
        R(ctx, '#e8b860', x, y, 16, 16); R(ctx, '#fff0c0', x, y, 16, 2); R(ctx, '#a06a2a', x, y + 13, 16, 3);
        R(ctx, '#ffffff', x + 2 + Math.floor(seed * 6), y + 1, 5, 1); R(ctx, '#fff4d0', x + 10, y + 6, 3, 1); R(ctx, '#fff4d0', x + 4, y + 9, 2, 1);
        edges(ctx, x, y, e, '#3a1e0c');
      } else { // bench plank
        R(ctx, '#f0c890', x, y, 16, 1); R(ctx, '#9a6232', x, y + 1, 16, 2); R(ctx, '#3a1e0c', x, y + 3, 16, 1);
        R(ctx, '#3a1e0c', x + 2, y + 4, 2, 4); R(ctx, '#3a1e0c', x + 12, y + 4, 2, 4);
      }
    },
    door: timberDoor({ out: '#120804', frame: '#4a2a14', wood: '#7a4a26', grain: '#5a3418', hi: '#a06a3a', iron: '#2a2a30', ironHi: '#6a6a76', glow: '#ffc060' }),
  }, {
    // Candle LUT plus a pool of light around the player, the hearths and the chandeliers.
    post(d, W, H, i) {
      const res = i.res, lights = [{ x: i.player.x, y: i.player.y, r0: 40 + Math.sin(i.t * 13) * 2 + Math.sin(i.t * 7) * 2, r1: 80 }, ...hallLights];
      const sc = KF.engine && KF.engine.scene;
      if (sc && sc.opp) lights.push({ x: sc.opp.x, y: sc.opp.y - 30, r0: 40, r1: 80 });
      const Ls = lights.map((l) => ({ x: l.x * res, y: l.y * res, a: l.r0 * res, b: l.r1 * res, far: ((l.r0 + l.r1) * res) ** 2, near: (l.r0 * res) ** 2 }));
      const min = 0.15, rowK = new Float32Array(W);
      for (let y = 0; y < H; y++) {
        rowK.fill(min);
        for (const l of Ls) {
          const dy2 = (y - l.y) * (y - l.y);
          if (dy2 >= l.far) continue;
          const span = Math.sqrt(l.far - dy2), x0 = Math.max(0, Math.floor(l.x - span)), x1 = Math.min(W - 1, Math.ceil(l.x + span));
          for (let x = x0; x <= x1; x++) {
            const d2 = (x - l.x) * (x - l.x) + dy2;
            const k = d2 <= l.near ? 1 : 1 - (Math.sqrt(d2) - l.a) / l.b;
            if (k > rowK[x]) rowK[x] = k;
          }
        }
        for (let x = 0, o = y * W * 4; x < W; x++, o += 4) {
          let l = lum(d, o); l = (l - 128) * 1.2 + 128; l = l < 0 ? 0 : l > 255 ? 255 : l | 0;
          const k = rowK[x], c = CANDLE;
          d[o] = c[l * 3] * k; d[o + 1] = c[l * 3 + 1] * k * 0.95; d[o + 2] = c[l * 3 + 2] * k * 0.85;
        }
      }
    },
  });
  const CANDLE = (function () { // same ramp as the base candle style
    const st = [[0, [10, 4, 2]], [0.5, [138, 74, 26]], [0.85, [255, 192, 112]], [1, [255, 240, 200]]], lut = new Uint8Array(768);
    for (let i = 0; i < 256; i++) {
      const f = i / 255; let k = 0; while (k < st.length - 2 && f > st[k + 1][0]) k++;
      const u = U.clamp((f - st[k][0]) / (st[k + 1][0] - st[k][0]), 0, 1);
      for (let j = 0; j < 3; j++) lut[i * 3 + j] = Math.round(st[k][1][j] + (st[k + 1][1][j] - st[k][1][j]) * u);
    }
    return lut;
  })();

  // ======================================================================
  // 4. GLACIER CAVE: inside the ice, a frozen mammoth, aurora through a crack.
  // ======================================================================
  KF.Env.add('frost', {
    name: 'GLACIER', bg: '#0a1628',
    signBoard: '#e0f0ff', signShade: '#8ab0d0', signInk: '#1a3050', signPost: '#4a6a8a',
    zone: { gravity: '#8a7aff', reverse: '#ff5ac8' },
    build() {
      this.sky = ditherSky(['#06101e', '#0a1a30', '#10243e', '#163050', '#1c3a5e', '#22466c']);
      const sx = this.sky.getContext('2d'), rnd = U.rng(31);
      // The crack in the cave roof where the aurora shows through.
      this.crack = [];
      for (let u = 0; u <= VW; u += 4) this.crack.push([u, 62 + Math.sin(u * 0.03) * 5 + rnd() * 4, 76 + Math.sin(u * 0.021 + 1) * 6 + rnd() * 4]);
      for (const [u, a, b] of this.crack) R(sx, '#02060e', u, a, 4, b - a);
      // Cave ceiling mass above and below the crack.
      for (const [u, a, b] of this.crack) { R(sx, '#2a4a6e', u, 0, 4, a); R(sx, '#3a5e86', u, a - 1, 4, 1); R(sx, '#2a4a6e', u, b, 4, 18); R(sx, '#6a9ac8', u, b, 4, 1); }
      this.far = layer(640, VH, 32, (x, rnd) => { // ice wall with strata and a frozen mammoth
        for (let y = 60; y < VH; y += 6) R(x, y % 12 ? '#16304e' : '#1a3658', 0, y, 640, 6);
        for (let i = 0; i < 40; i++) R(x, '#2a5080', rnd() * 640, 60 + rnd() * 100, 10 + rnd() * 30, 0.5);
        for (let i = 0; i < 60; i++) disc(x, 'rgba(160,210,255,0.25)', rnd() * 640, 70 + rnd() * 90, 0.5 + rnd()); // trapped bubbles
        // Mammoth, ghostly inside the ice.
        const mx = 200, my = 120;
        x.globalAlpha = 0.55;
        disc(x, '#3a5a7a', mx, my, 24); disc(x, '#3a5a7a', mx + 26, my - 6, 14); R(x, '#3a5a7a', mx - 18, my + 10, 8, 22); R(x, '#3a5a7a', mx + 10, my + 10, 8, 22);
        R(x, '#3a5a7a', mx + 34, my - 2, 5, 26); // trunk
        x.strokeStyle = '#d8e8f4'; x.lineWidth = 2; x.beginPath(); x.arc(mx + 30, my + 8, 12, 0.2, 1.8); x.stroke(); // tusk
        disc(x, '#0a1628', mx + 28, my - 10, 1.5);
        for (let i = 0; i < 18; i++) R(x, '#4a6a8a', mx - 22 + i * 3, my - 22 + Math.abs(i - 9) * 0.6, 1, 4); // shaggy fur
        x.globalAlpha = 1;
        // A frozen axe and a lost helmet.
        x.globalAlpha = 0.6; R(x, '#5a3a24', 470, 110, 2, 26); R(x, '#8a9aaa', 466, 108, 8, 6);
        disc(x, '#7a8a9a', 560, 132, 7); R(x, '#7a8a9a', 553, 132, 14, 3); R(x, '#d8d0b0', 551, 124, 2, 6); R(x, '#d8d0b0', 567, 124, 2, 6); x.globalAlpha = 1;
      });
      this.mid = layer(768, VH, 33, (x, rnd) => { // crystal clusters on the cave floor
        for (let u = 10; u < 768; u += 50 + rnd() * 60) {
          for (let k = 0; k < 5; k++) {
            const h = 14 + rnd() * 30, w = 5 + rnd() * 4, cx = u + k * 6 - 12, lean = (rnd() - 0.5) * 8;
            x.fillStyle = '#4a86c0'; x.beginPath(); x.moveTo(cx, 160); x.lineTo(cx + lean, 160 - h); x.lineTo(cx + w + lean, 160 - h - 3); x.lineTo(cx + w, 160); x.fill();
            x.fillStyle = '#8ac4f0'; x.beginPath(); x.moveTo(cx, 160); x.lineTo(cx + lean, 160 - h); x.lineTo(cx + w * 0.4 + lean, 160 - h - 1); x.lineTo(cx + w * 0.4, 160); x.fill();
          }
        }
        R(x, '#122a48', 0, 160, 768, VH - 160); R(x, '#5a8ab8', 0, 160, 768, 1);
      });
      this.icicles = layer(640, 40, 34, (x, rnd) => {
        for (let u = 0; u < 640; u += 3 + rnd() * 6) {
          const h = 4 + rnd() * rnd() * 34;
          x.fillStyle = '#a8d4f4'; x.beginPath(); x.moveTo(u, 0); x.lineTo(u + 2.5, h); x.lineTo(u + 5, 0); x.fill();
          R(x, '#e8f6ff', u + 1, 0, 1, h * 0.6);
        }
      });
    },
    background(ctx, cam, t, mood) {
      KF.blit(ctx, this.sky, 0, 0);
      // Aurora glimpsed through the crack.
      ctx.save(); ctx.beginPath();
      for (const [u, a, b] of this.crack) ctx.rect(u, a, 4, b - a);
      ctx.clip();
      for (let band = 0; band < 3; band++) {
        ctx.fillStyle = ['#3affa0', '#5ad8ff', '#c07aff'][band];
        for (let u = 0; u < VW; u += 2) {
          const y = 62 + band * 4 + Math.sin(u * 0.02 + t * 0.8 + band) * 5;
          ctx.globalAlpha = 0.35 + 0.25 * Math.sin(u * 0.05 + t + band);
          ctx.fillRect(u, y, 2, 6);
        }
      }
      ctx.restore(); ctx.globalAlpha = 1;
      tiled(ctx, this.far, cam.x, 0.12);
      // Shafts of aurora light falling through the crack.
      ctx.globalAlpha = 0.05 + 0.02 * Math.sin(t);
      for (let k = 0; k < 4; k++) { const x = ((k * 110 - cam.x * 0.12) % (VW + 100) + VW + 100) % (VW + 100) - 50; ctx.fillStyle = '#7affd0'; ctx.beginPath(); ctx.moveTo(x, 76); ctx.lineTo(x + 14, 76); ctx.lineTo(x + 50, 170); ctx.lineTo(x + 10, 170); ctx.fill(); }
      ctx.globalAlpha = 1;
      tiled(ctx, this.mid, cam.x, 0.3);
      tiled(ctx, this.icicles, cam.x, 0.5, 86);
      // Glinting drips; on deaths the cave shakes loose some snow.
      for (let i = 0; i < 10; i++) {
        const age = (t * 0.4 + i * 0.13) % 1, x = ((i * 61 - cam.x * 0.5) % VW + VW) % VW;
        R(ctx, '#d8f0ff', x, 60 + age * 110, 0.5, 2);
      }
      const n = 20 + Math.round(mood.cheer * 40);
      for (let i = 0; i < n; i++) {
        const age = (t * (0.05 + (i % 4) * 0.02) + i * 0.13) % 1;
        const x = ((i * 47 + Math.sin(t + i) * 6 - cam.x * 0.6) % VW + VW) % VW;
        R(ctx, '#e8f4ff', x, age * VH, i % 5 ? 0.5 : 1, i % 5 ? 0.5 : 1);
      }
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid' || art === 'alt') {
        const dark = art === 'alt';
        R(ctx, dark ? '#3a5a7e' : '#4a88c0', x, y, 16, 16);
        R(ctx, dark ? '#4e6e92' : '#6aa8dc', x + 1, y + 1, 7, 6); R(ctx, dark ? '#2e4a6a' : '#3a6ea0', x + 8, y + 8, 7, 7);
        // internal fracture lines
        const h = Math.floor(seed * 13);
        for (let k = 0; k < 4; k++) R(ctx, '#bfe2ff', x + 3 + (h % 8) + k, y + 5 + k * 2, 1, 2);
        if (dark) { disc(ctx, '#7a8a9a', x + 8, y + 9, 3); R(ctx, '#a8b8c8', x + 7, y + 7, 2, 1); } // a stone frozen inside
        if (e.t) { // frosty snow cap
          R(ctx, '#ffffff', x, y, 16, 2); R(ctx, '#d8ecff', x, y + 2, 16, 1);
          for (let i = 0; i < 16; i += 4) R(ctx, '#d8ecff', x + i + (h % 3), y + 3, 2, 1);
          R(ctx, '#1a3a5e', x, y + 4, 16, 0.5);
        }
        edges(ctx, x, y, e, '#0c1e34');
      } else if (art === 'ice') { // clear glare ice: slick and shiny
        R(ctx, '#bfe6ff', x, y, 16, 16); R(ctx, '#ffffff', x, y, 16, 2); R(ctx, '#7ab8e8', x, y + 13, 16, 3);
        for (let k = 0; k < 2; k++) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 3 + k * 7 + Math.floor(seed * 3), y + 3, 2, 1); ctx.fillRect(x + 2 + k * 7 + Math.floor(seed * 3), y + 4, 2, 1); ctx.fillRect(x + 1 + k * 7 + Math.floor(seed * 3), y + 5, 2, 1); }
        edges(ctx, x, y, e, '#1a3a5e');
      } else {
        R(ctx, '#ffffff', x, y, 16, 1); R(ctx, '#9ad0f4', x, y + 1, 16, 2); R(ctx, '#2a5a8a', x, y + 3, 16, 1);
        for (let i = 2; i < 16; i += 5) { ctx.fillStyle = '#a8d4f4'; ctx.beginPath(); ctx.moveTo(x + i, y + 4); ctx.lineTo(x + i + 1, y + 8); ctx.lineTo(x + i + 2, y + 4); ctx.fill(); }
      }
    },
    door: timberDoor({ out: '#0c1e34', frame: '#6aa8dc', wood: '#5a4a3a', grain: '#3a2e24', hi: '#d8ecff', iron: '#2a3a4a', ironHi: '#8ab0d0', glow: '#ffd890' }),
  });

  // ======================================================================
  // 5. VALHALLA: the golden hall above the clouds.
  // ======================================================================
  KF.Env.add('golden', {
    name: 'VALHALLA', bg: '#2a1c08',
    signBoard: '#fff0c0', signShade: '#c09040', signInk: '#4a2a08', signPost: '#6a4a18',
    zone: { gravity: '#8a8aff', reverse: '#ff5ac8' },
    build() {
      this.sky = ditherSky(['#3a2a10', '#5a4218', '#7a5a22', '#9a7430', '#b88e42', '#d0a858']);
      // Yggdrasil: the world tree behind everything.
      this.far = layer(640, VH, 41, (x, rnd) => {
        const tx = 320;
        x.fillStyle = '#5a3e14';
        x.beginPath(); x.moveTo(tx - 22, VH); x.lineTo(tx - 10, 40); x.lineTo(tx + 10, 40); x.lineTo(tx + 22, VH); x.fill();
        const branch = (px, py, a, len, w, depth) => {
          const ex = px + Math.cos(a) * len, ey = py + Math.sin(a) * len;
          x.strokeStyle = '#5a3e14'; x.lineWidth = w; x.beginPath(); x.moveTo(px, py); x.lineTo(ex, ey); x.stroke();
          if (depth > 0) { branch(ex, ey, a - 0.45 - rnd() * 0.2, len * 0.72, w * 0.65, depth - 1); branch(ex, ey, a + 0.45 + rnd() * 0.2, len * 0.72, w * 0.65, depth - 1); }
          else for (let k = 0; k < 5; k++) disc(x, rnd() < 0.5 ? '#7a6a24' : '#8a7a30', ex + (rnd() - 0.5) * 18, ey + (rnd() - 0.5) * 12, 4 + rnd() * 5);
        };
        branch(tx, 60, -Math.PI / 2 - 0.9, 90, 10, 4); branch(tx, 60, -Math.PI / 2 + 0.9, 90, 10, 4); branch(tx, 50, -Math.PI / 2, 40, 8, 3);
        // Roots across the bottom.
        for (let k = 0; k < 6; k++) { x.strokeStyle = '#4a3010'; x.lineWidth = 4; x.beginPath(); x.moveTo(tx, 190); x.quadraticCurveTo(tx + (k - 2.5) * 50, 180, tx + (k - 2.5) * 110, 210); x.stroke(); }
      });
      // The hall: roof thatched with shields, rafters of spears, gilded pillars.
      this.mid = layer(768, VH, 42, (x, rnd) => {
        for (let u = 0; u < 768; u += 384) {
          const hx = u + 30, w = 320;
          for (let k = 0; k < 7; k++) for (let i = 0, n = 4 + k * 4; i < n; i++) { // gabled roof thatched with shields
            const sx = hx + w / 2 - (n - 1) * 6 + i * 12, sy = 62 + k * 9;
            disc(x, '#5a3a0a', sx, sy, 6); disc(x, k % 2 ? '#c89430' : '#a87420', sx, sy, 5); disc(x, '#f0d070', sx, sy, 1.5);
          }
          for (let k = 0; k < 9; k++) { // spear rafters
            const px = hx + 10 + k * 37; R(x, '#7a5418', px, 128, 4, 44); R(x, '#f0d070', px, 128, 1, 44);
            x.fillStyle = '#e0e0d0'; x.beginPath(); x.moveTo(px - 2, 128); x.lineTo(px + 2, 116); x.lineTo(px + 6, 128); x.fill();
          }
          R(x, '#8a6018', hx, 126, w, 4); R(x, '#f0d070', hx, 126, w, 1);
          // Long feasting table glow inside.
          R(x, '#4a2e0a', hx + 20, 148, w - 40, 3); R(x, '#ffd860', hx + 20, 148, w - 40, 1);
        }
      });
      this.clouds = layer(768, 60, 43, (x, rnd) => {
        for (let i = 0; i < 60; i++) { const cx = rnd() * 768, cy = 20 + rnd() * 30, r = 6 + rnd() * 14; disc(x, '#f8e8c0', cx, cy, r); disc(x, '#fff8e8', cx - r * 0.3, cy - r * 0.3, r * 0.6); }
        R(x, '#f0dcb0', 0, 44, 768, 16);
      });
    },
    background(ctx, cam, t, mood) {
      KF.blit(ctx, this.sky, 0, 0);
      // Sun rays.
      ctx.globalAlpha = 0.07; ctx.fillStyle = '#fff4c8';
      for (let k = 0; k < 8; k++) { const a = -Math.PI / 2 + (k - 3.5) * 0.28 + Math.sin(t * 0.2) * 0.03; ctx.beginPath(); ctx.moveTo(VW / 2, -20); ctx.lineTo(VW / 2 + Math.cos(a - 0.06) * 400, -20 + Math.sin(a - 0.06) * -400); ctx.lineTo(VW / 2 + Math.cos(a + 0.06) * 400, -20 + Math.sin(a + 0.06) * -400); ctx.fill(); }
      ctx.globalAlpha = 1;
      tiled(ctx, this.far, cam.x, 0.06);
      // Valkyries riding winged horses across the sky.
      for (let k = 0; k < 3; k++) {
        const x = ((t * (18 + k * 6) + k * 170 - cam.x * 0.15) % (VW + 80) + VW + 80) % (VW + 80) - 40, y = 60 + k * 16 + Math.sin(t * 1.5 + k) * 4;
        const flap = Math.sin(t * 8 + k) * 3;
        beast(ctx, x, y, 1.3, '#4a2e08', t * 6 + k, '#4a2e08');
        ctx.fillStyle = '#fff4d0'; ctx.beginPath(); ctx.moveTo(x + 5, y - 11); ctx.lineTo(x - 4, y - 22 - flap * 2); ctx.lineTo(x + 12, y - 12); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x + 8, y - 11); ctx.lineTo(x + 2, y - 26 - flap * 2.5); ctx.lineTo(x + 15, y - 12); ctx.fill();
      }
      tiled(ctx, this.mid, cam.x, 0.25);
      tiled(ctx, this.clouds, cam.x + t * 6, 0.4, 150);
      // Einherjar feasting on the clouds; they roar when you die.
      Art.crowd(ctx, cam.x, t, { y: 178, par: 0.55, color: '#4a2e0a', rim: '#ffe080', seed: 75, gap: 2, horns: true, cheer: mood.cheer });
      for (let i = 0; i < 16; i++) { // gold motes
        const age = (t * 0.07 + i * 0.061) % 1, x = ((i * 59 + Math.sin(t + i) * 10 - cam.x * 0.5) % VW + VW) % VW;
        ctx.globalAlpha = Math.sin(age * Math.PI); R(ctx, '#fff4b0', x, VH - age * VH, 1, 1);
      }
      ctx.globalAlpha = 1;
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid' || art === 'alt') {
        R(ctx, art === 'alt' ? '#b07a20' : '#c8922c', x, y, 16, 16);
        R(ctx, '#e8b850', x + 1, y + 1, 14, 1); R(ctx, '#8a5a14', x + 1, y + 14, 14, 1);
        // Engraved knot pattern.
        ctx.strokeStyle = '#8a5a14'; ctx.lineWidth = 1; ctx.beginPath();
        if (seed > 0.5) { ctx.moveTo(x + 3, y + 5); ctx.lineTo(x + 13, y + 12); ctx.moveTo(x + 13, y + 5); ctx.lineTo(x + 3, y + 12); } else { ctx.arc(x + 8, y + 9, 4, 0, 7); }
        ctx.stroke();
        if (art === 'alt') { disc(ctx, '#6a3e0a', x + 8, y + 8, 6); disc(ctx, '#e0a838', x + 8, y + 8, 5); disc(ctx, '#fff0b0', x + 8, y + 8, 1.5); }
        if (e.t) { R(ctx, '#fff8d8', x, y, 16, 1); R(ctx, '#ffe080', x, y + 1, 16, 2); R(ctx, '#7a4a10', x, y + 3, 16, 1); }
        edges(ctx, x, y, e, '#3a2004');
      } else if (art === 'ice') { // polished white gold: mirror-slick
        R(ctx, '#fff0c0', x, y, 16, 16); R(ctx, '#ffffff', x, y, 16, 2); R(ctx, '#c8a050', x, y + 13, 16, 3);
        R(ctx, '#ffffff', x + 2 + Math.floor(seed * 6), y + 5, 6, 1); R(ctx, '#ffffff', x + 9, y + 9, 3, 1);
        edges(ctx, x, y, e, '#5a3a08');
      } else {
        R(ctx, '#fff8d8', x, y, 16, 1); R(ctx, '#e0a838', x, y + 1, 16, 2); R(ctx, '#6a3e0a', x, y + 3, 16, 1);
      }
    },
    door: timberDoor({ out: '#3a2004', frame: '#e0a838', wood: '#8a5a20', grain: '#6a4214', hi: '#fff0b0', iron: '#c08a20', ironHi: '#fff4c0', glow: '#fff4c0' }),
  }, {
    // Gilded, but anything strongly red (spikes, blood-red hazards) keeps its colour.
    post(d, W, H, i) {
      const lut = GOLD;
      for (let k = 0, o = 0; k < W * H; k++, o += 4) {
        const r = d[o], g = d[o + 1], b = d[o + 2];
        let l = lum(d, o); l = (l - 128) * 1.1 + 128; l = l < 0 ? 0 : l > 255 ? 255 : l | 0;
        const red = r - Math.max(g, b);
        if (red > 70) { d[o] = Math.min(255, r * 1.1); d[o + 1] = g * 0.5; d[o + 2] = b * 0.5; continue; }
        d[o] = lut[l * 3]; d[o + 1] = lut[l * 3 + 1]; d[o + 2] = lut[l * 3 + 2];
        if (l > 248 && NOISE[(k + (i.frame >> 3) * 131) & NM] < 0.01) d[o] = d[o + 1] = d[o + 2] = 255;
      }
    },
  });
  const GOLD = (function () {
    const st = [[0, [18, 10, 2]], [0.4, [106, 74, 16]], [0.75, [224, 176, 64]], [1, [255, 248, 216]]], lut = new Uint8Array(768);
    for (let i = 0; i < 256; i++) {
      const f = i / 255; let k = 0; while (k < st.length - 2 && f > st[k + 1][0]) k++;
      const u = U.clamp((f - st[k][0]) / (st[k + 1][0] - st[k][0]), 0, 1);
      for (let j = 0; j < 3; j++) lut[i * 3 + j] = Math.round(st[k][1][j] + (st[k + 1][1][j] - st[k][1][j]) * u);
    }
    return lut;
  })();
})(window.KF);
