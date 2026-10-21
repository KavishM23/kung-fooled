'use strict';
// Per-stage environments for the rooftop realm: a live 1950s TV studio, an inked comic page,
// a handheld RPG town and a 90s backyard home video. Stage 1 keeps the plain rooftop.
(function (KF) {
  const { R, OUT, ditherSky, tiled, edges, bricks, stone } = KF.ThemeKit;
  const U = KF.util, VW = KF.VIEW_W, VH = KF.VIEW_H, F = () => KF.Font;

  // Screen x of a feature at layer x `lx` on a layer that repeats every `span` px; null if off screen.
  function at(lx, camX, par, span, w = 40) {
    let s = (((lx - camX * par) % span) + span) % span;
    if (s > VW + w) s -= span;
    return s < -w || s > VW + w ? null : Math.round(s * 2) / 2;
  }
  function burst(c, cx, cy, r0, r1, n, fill, ink, rot = 0) { // comic starburst
    c.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = rot + (i / (n * 2)) * Math.PI * 2, r = i % 2 ? r0 : r1 * (0.85 + 0.15 * Math.sin(i * 2.7));
      c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8);
    }
    c.closePath(); c.fillStyle = fill; c.fill(); c.strokeStyle = ink; c.lineWidth = 1.5; c.stroke();
  }

  // Wrap a style overlay so one of its text labels is dropped (it clashes with a HUD) and redrawn elsewhere.
  function withoutLabel(overlay, label, redraw) {
    return function (ctx, i) {
      const font = F(), draw = font.draw;
      font.draw = function (c, text, ...rest) { if (text !== label) return draw.call(this, c, text, ...rest); };
      try { overlay.call(this, ctx, i); } finally { font.draw = draw; }
      redraw(ctx, i);
    };
  }

  // ===================== OLD TV: a live sitcom stage, 1953 =====================
  KF.Env.add('oldtv', {
    name: 'STUDIO 3', bg: '#0a0a0c',
    signBoard: '#f0ece0', signInk: '#1a1a1a', signPost: '#6a5a48',
    zone: { gravity: '#a0a0ff', reverse: '#ffffff' },
    build() {
      const rnd = U.rng(53);
      this.back = ditherSky(['#060608', '#0e0e12', '#16161c', '#1c1c22']);
      // Lighting grid with hanging fresnels and their soft cones.
      this.rig = KF.makeHi(640, VH);
      const g = this.rig.getContext('2d');
      this.lamps = [];
      for (let x = 0; x < 640; x += 80) {
        const lx = x + 30, tilt = (rnd() - 0.5) * 0.5;
        g.globalAlpha = 0.1; g.fillStyle = '#fff6e0';
        g.beginPath(); g.moveTo(lx + 2, 26); g.lineTo(lx + 8, 26); g.lineTo(lx + 40 + tilt * 120, 176); g.lineTo(lx - 30 + tilt * 120, 176); g.fill();
        g.globalAlpha = 1;
        R(g, '#2a2a30', lx + 4, 13, 2, 6);                          // clamp
        R(g, '#1a1a20', lx - 1, 18, 12, 9); R(g, '#3a3a44', lx, 19, 10, 7); // body
        R(g, '#5a5a66', lx, 19, 10, 1); R(g, '#1a1a20', lx - 3, 17, 3, 10); R(g, '#1a1a20', lx + 10, 17, 3, 10); // barn doors
        R(g, '#d8d0b8', lx + 2, 26, 6, 1);
        this.lamps.push(lx);
      }
      R(g, '#22222a', 0, 8, 640, 2); R(g, '#22222a', 0, 14, 640, 2); R(g, '#3a3a44', 0, 8, 640, 1);
      for (let x = 0; x < 640; x += 8) for (let k = 0; k < 4; k++) R(g, '#22222a', x + k * 2, 10 + k, 2, 1);
      // The set: painted flats of a living room, with gaps and braces that give the game away.
      this.set = KF.makeHi(768, VH);
      const s = this.set.getContext('2d');
      const top = 60, base = 164;
      for (let fx = 0; fx < 768; fx += 128) {
        const kind = (fx / 128) % 6, gap = kind === 2 || kind === 5;
        const w = gap ? 112 : 128;
        // wallpaper: stripes with little diamonds
        R(s, '#9a9284', fx, top, w, base - top);
        for (let x = fx + 3; x < fx + w; x += 8) { R(s, '#878072', x, top, 2, base - top); for (let y = top + 6; y < base; y += 12) R(s, '#b2aa9a', x + 5, y, 1, 1); }
        R(s, '#c8c0ae', fx, top, w, 2); R(s, '#5a5448', fx + w - 1, top, 1, base - top); // flat edge
        R(s, '#6a5a44', fx, base - 10, w, 10); R(s, '#8a785c', fx, base - 10, w, 1); // baseboard
        if (kind === 0 || kind === 3) { // big window with a painted skyline
          const wx = fx + 30, wy = top + 14, ww = 68, wh = 58;
          R(s, '#4a4036', wx - 3, wy - 3, ww + 6, wh + 6);
          R(s, '#2a2e3a', wx, wy, ww, wh);
          s.fillStyle = '#d8d4c4'; s.beginPath(); s.arc(wx + 50, wy + 14, 7, 0, 7); s.fill(); // painted moon, a bit lopsided
          R(s, '#2a2e3a', wx + 53, wy + 9, 3, 3);
          for (let k = 0; k < 9; k++) { const bh = 12 + Math.floor(rnd() * 26), bw = 6 + Math.floor(rnd() * 6); R(s, '#16181e', wx + k * 8, wy + wh - bh, bw, bh); if (rnd() < 0.6) R(s, '#8a8670', wx + k * 8 + 2, wy + wh - bh + 4, 1, 1); }
          for (let k = 0; k < 6; k++) R(s, '#b0ac98', wx + Math.floor(rnd() * ww), wy + Math.floor(rnd() * 20));
          R(s, '#4a4036', wx + ww / 2 - 1, wy, 2, wh); R(s, '#4a4036', wx, wy + wh / 2 - 1, ww, 2); // muntins
          R(s, '#6a6050', wx - 6, wy + wh + 3, ww + 12, 3); // sill
          for (const side of [-1, 1]) { // curtains
            const cx = side < 0 ? wx - 14 : wx + ww + 2;
            R(s, '#5a4a52', cx, wy - 8, 12, wh + 14);
            for (let k = 0; k < 4; k++) R(s, '#463a40', cx + 1 + k * 3, wy - 8, 1, wh + 14);
            R(s, '#7a6a70', cx, wy - 8, 12, 1);
          }
          R(s, '#3a3026', wx - 18, wy - 10, ww + 36, 2); // rod
        } else if (kind === 1 || kind === 4) { // fireplace, mantel clock, painting
          const mx = fx + 30;
          R(s, '#5a5046', mx, base - 52, 68, 42); R(s, '#7a6c5c', mx - 4, base - 56, 76, 5); R(s, '#9a8a76', mx - 4, base - 56, 76, 1);
          R(s, '#141210', mx + 16, base - 42, 36, 32); R(s, '#2a2420', mx + 16, base - 42, 36, 2);
          for (let k = 0; k < 4; k++) R(s, '#6a4a30', mx + 20 + k * 7, base - 16, 6, 3); // painted logs
          R(s, '#3a3026', mx + 26, base - 68, 14, 12); R(s, '#c8c0a8', mx + 28, base - 66, 10, 8); R(s, '#3a3026', mx + 32, base - 64, 1, 4); R(s, '#3a3026', mx + 33, base - 62, 3, 1);
          R(s, '#4a3a2a', mx + 10, top + 12, 48, 30); R(s, '#8a8a7a', mx + 13, top + 15, 42, 24); // painting: hills
          s.fillStyle = '#5a5e50'; s.beginPath(); s.moveTo(mx + 13, top + 39); s.lineTo(mx + 28, top + 24); s.lineTo(mx + 40, top + 32); s.lineTo(mx + 55, top + 22); s.lineTo(mx + 55, top + 39); s.fill();
        } else { // painted door with coat rack; the flat ends early and shows its brace
          R(s, '#5a4a3a', fx + 20, base - 74, 34, 64); R(s, '#6e5c48', fx + 23, base - 71, 28, 61);
          R(s, '#5a4a3a', fx + 26, base - 66, 22, 22); R(s, '#5a4a3a', fx + 26, base - 38, 22, 22); R(s, '#c8b070', fx + 46, base - 42, 2, 2);
          R(s, '#3a3026', fx + 70, base - 66, 2, 56); R(s, '#3a3026', fx + 64, base - 66, 14, 2); R(s, '#3a3026', fx + 64, base - 12, 14, 2);
          R(s, '#4a4450', fx + 62, base - 64, 6, 14); R(s, '#2a2a2a', fx + 73, base - 66, 8, 4); R(s, '#2a2a2a', fx + 71, base - 63, 12, 2); // coat, hat
          // gap behind the flat: raw plywood back, brace and a sandbag
          const gx = fx + w;
          R(s, '#0c0c0e', gx, top, 16, base - top);
          s.strokeStyle = '#3a3226'; s.lineWidth = 2; s.beginPath(); s.moveTo(gx + 2, top + 4); s.lineTo(gx + 14, base - 4); s.stroke();
          R(s, '#3a3226', gx + 1, top, 2, base - top);
          R(s, '#4a4438', gx + 5, base - 7, 10, 7); R(s, '#5e5646', gx + 6, base - 7, 8, 1);
        }
      }
      // Furniture in front of the flats.
      for (let x = 60; x < 768; x += 256) {
        R(s, '#3a3438', x, base - 22, 64, 18); R(s, '#4a4248', x + 2, base - 30, 60, 10); R(s, '#5a5258', x + 2, base - 30, 60, 1); // sofa
        R(s, '#3a3438', x - 4, base - 26, 8, 22); R(s, '#3a3438', x + 60, base - 26, 8, 22);
        for (let k = 0; k < 3; k++) R(s, '#2a2428', x + 4 + k * 20, base - 22, 1, 10);
        R(s, '#2a2420', x + 96, base - 60, 2, 56); R(s, '#c8c0a0', x + 88, base - 72, 18, 12); R(s, '#a8a084', x + 88, base - 62, 18, 2); // lamp
        R(s, '#2a2420', x + 116, base - 20, 16, 2); R(s, '#2a2420', x + 118, base - 18, 2, 14); R(s, '#2a2420', x + 128, base - 18, 2, 14);
        R(s, '#141414', x + 118, base - 26, 10, 6); R(s, '#141414', x + 117, base - 28, 12, 2); // rotary phone
      }
      R(s, '#18161a', 0, base, 768, VH - base); // studio floor
      for (let x = 0; x < 768; x += 96) { R(s, '#d8d4c0', x + 40, base + 6, 6, 1); R(s, '#d8d4c0', x + 42, base + 4, 1, 5); } // tape marks
      this.booms = [{ x: 140, ph: 0 }, { x: 520, ph: 2.1 }];
    },
    background(ctx, cam, t, mood) {
      KF.blit(ctx, this.back, 0, 0);
      tiled(ctx, this.set, cam.x, 0.35);
      tiled(ctx, this.rig, cam.x, 0.15);
      // Boom mics drifting into shot.
      for (const b of this.booms) {
        const x = at(b.x, cam.x, 0.5, 768, 80); if (x === null) continue;
        const sw = Math.sin(t * 0.7 + b.ph) * 6, mx = Math.round(x + sw), my = 52 + Math.round(Math.sin(t * 0.5 + b.ph) * 3);
        ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx - 90, 0); ctx.lineTo(mx, my - 6); ctx.stroke();
        R(ctx, '#1a1a1e', mx - 1, my - 7, 2, 4);
        R(ctx, '#3a3a40', mx - 6, my - 3, 12, 8); R(ctx, '#4e4e56', mx - 5, my - 3, 10, 2);
        for (let k = 0; k < 5; k++) R(ctx, '#2a2a30', mx - 5 + k * 2 + 1, my + 1, 1, 3);
      }
      // APPLAUSE sign hanging from the grid: lights up when something funny happens.
      const ax = at(250, cam.x, 0.15, 640, 70);
      if (ax !== null) {
        const lit = mood.cheer > 0.25 && Math.floor(t * 8) % 4 !== 0;
        R(ctx, '#22222a', ax + 14, 16, 1, 22); R(ctx, '#22222a', ax + 54, 16, 1, 22);
        if (lit) { ctx.globalAlpha = 0.25; R(ctx, '#ffffff', ax - 6, 32, 80, 24); ctx.globalAlpha = 1; }
        R(ctx, '#08080a', ax - 1, 37, 70, 14);
        R(ctx, lit ? '#fff8e8' : '#26262c', ax, 38, 68, 12);
        F().draw(ctx, 'APPLAUSE', ax + 34, 41, lit ? '#000000' : '#4a4a52', 1, 'center');
      }
      const ox = at(500, cam.x, 0.15, 640, 40); // ON AIR light
      if (ox !== null) {
        R(ctx, '#22222a', ox + 12, 16, 1, 12); R(ctx, '#08080a', ox - 1, 27, 28, 10);
        R(ctx, '#e8e4d8', ox, 28, 26, 8); F().draw(ctx, 'ON AIR', ox + 13, 29, '#101010', 1, 'center');
      }
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid') { // stage riser: planked plywood, painted top, the odd strip of gaffer tape
        for (let r = 0; r < 4; r++) { // long horizontal boards, one butt joint per board row
          const h = U.hash2(Math.floor(seed * 997), r), by = y + r * 4;
          R(ctx, ['#8a6c4c', '#80644a', '#927456'][Math.floor(h * 3)], x, by, 16, 3); R(ctx, '#4a3a28', x, by + 3, 16, 1);
          R(ctx, '#a08262', x, by, 16, 1);
          if (h > 0.45) { const sx = x + Math.floor(h * 37) % 15; R(ctx, '#4a3a28', sx, by, 1, 3); }
          R(ctx, '#6e543a', x + Math.floor(h * 53) % 13, by + 1 + (r & 1), 3, 1);
        }
        if (e.t) {
          R(ctx, '#f0e4c8', x, y, 16, 1); R(ctx, '#c8b08a', x, y + 1, 16, 2); R(ctx, '#2a2018', x, y + 3, 16, 1);
          if (seed > 0.7) R(ctx, '#1c1c1c', x + 3, y + 1, 9, 2);
        }
        if (seed < 0.04) { R(ctx, '#d8d0b8', x + 4, y + 9, 6, 1); R(ctx, '#d8d0b8', x + 6, y + 7, 1, 5); } // spike mark X
        edges(ctx, x, y, e, '#1a140e');
      } else if (art === 'alt') { // prop TV set
        R(ctx, '#3a2a1c', x, y, 16, 16); R(ctx, '#6a4c30', x + 1, y + 1, 14, 14); R(ctx, '#8a6a46', x + 1, y + 1, 14, 1);
        R(ctx, '#1a1a1a', x + 2, y + 3, 9, 8); R(ctx, '#a8acac', x + 3, y + 4, 7, 6); R(ctx, '#e0e4e4', x + 4, y + 5, 2, 2);
        R(ctx, '#1a1a1a', x + 12, y + 4, 2, 2); R(ctx, '#1a1a1a', x + 12, y + 8, 2, 2);
        for (let k = 0; k < 3; k++) R(ctx, '#3a2a1c', x + 3 + k * 3, y + 12, 2, 1);
        if (e.t) R(ctx, '#b89a70', x, y, 16, 1);
        edges(ctx, x, y, e, '#140e08');
      } else if (art === 'ice') { // freshly waxed floor
        R(ctx, '#d8d8d4', x, y, 16, 16); R(ctx, '#ffffff', x, y, 16, 1);
        for (let k = 0; k < 3; k++) R(ctx, '#f8f8f4', x + ((k * 5 + seed * 9) | 0) % 14, y + 3 + k * 4, 3, 1);
        edges(ctx, x, y, e, '#3a3a3a');
      } else { // scaffold plank with clamps
        R(ctx, '#f0e0c0', x, y, 16, 1); R(ctx, '#b09068', x, y + 1, 16, 2); R(ctx, '#3a2a1a', x, y + 3, 16, 1);
        R(ctx, '#6a6a72', x + 2, y + 1, 2, 4); R(ctx, '#6a6a72', x + 12, y + 1, 2, 4);
      }
    },
  }, { overlay: withoutLabel(KF.Styles.all.oldtv.overlay, 'CH 3', (ctx) => F().draw(ctx, 'CH 3', VW - 16, 58, 'rgba(255,255,255,0.55)', 1, 'right')) });


  // ===================== COMIC: an inked city page =====================
  // Posterize + ink lines, done with lookup tables and two neighbour differences (the generic
  // version used a full Sobel pass and was the slowest style in the game).
  const POST = new Uint8Array(256); for (let v = 0; v < 256; v++) POST[v] = Math.min(255, Math.round(v / 64) * 72);
  let LUM = null;
  function comicPost(d, W, H) {
    const n = W * H;
    if (!LUM || LUM.length !== n) LUM = new Uint8Array(n);
    const L = LUM;
    for (let k = 0, o = 0; k < n; k++, o += 4) L[k] = (d[o] * 77 + d[o + 1] * 150 + d[o + 2] * 29) >> 8;
    for (let k = 0, o = 0; k < n - W - 1; k++, o += 4) {
      const l = L[k], a = l - L[k + 1], b = l - L[k + W];
      if ((a < 0 ? -a : a) + (b < 0 ? -b : b) > 74) { d[o] = 12; d[o + 1] = 8; d[o + 2] = 16; continue; }
      d[o] = POST[d[o]]; d[o + 1] = POST[d[o + 1]]; d[o + 2] = POST[d[o + 2]];
    }
  }
  const INK = '#0c0810';
  function inkRect(c, col, x, y, w, h, lw = 1.5) { R(c, INK, x - lw, y - lw, w + lw * 2, h + lw * 2); R(c, col, x, y, w, h); }
  function dots(c, x0, y0, w, h, col, step, rOf) { // Ben-Day halftone
    c.fillStyle = col;
    for (let y = y0; y < y0 + h; y += step) for (let x = x0 + ((y / step) & 1) * step / 2; x < x0 + w; x += step) {
      const r = rOf(x, y); if (r <= 0.15) continue;
      c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
    }
  }
  KF.Env.add('comic', {
    name: 'COMIC', bg: '#90d8ff',
    signBoard: '#ffffd8', signInk: INK, signPost: INK,
    zone: { gravity: '#9048ff', reverse: '#ff48d8' },
    build() {
      const rnd = U.rng(77);
      // Far: the page itself, a strip of panels, each its own colour of sky with a skyline.
      this.page = KF.makeHi(640, VH);
      const p = this.page.getContext('2d');
      const skies = [['#ffd848', '#ff9048', '#d84848'], ['#90d8ff', '#48b0ff', '#4848d8'], ['#ff90d8', '#d848b0', '#904890'], ['#d8ff90', '#90d848', '#489048']];
      for (let k = 0; k < 4; k++) {
        const px = k * 160, [c0, c1, c2] = skies[k];
        R(p, c0, px, 0, 160, VH);
        dots(p, px + 2, 2, 156, 150, c1, 5, (x, y) => (y / 150) * 1.9);
        for (let x = px + 4; x < px + 156;) { // distant skyline
          const w = 10 + Math.floor(rnd() * 16), h = 26 + Math.floor(rnd() * 50);
          inkRect(p, c2, x, 150 - h, w, h + 40, 1);
          for (let wy = 150 - h + 4; wy < 146; wy += 6) for (let wx = x + 2; wx < x + w - 2; wx += 4) if (rnd() < 0.35) R(p, c0, wx, wy, 2, 2);
          x += w + 1 + Math.floor(rnd() * 4);
        }
        R(p, '#ffffff', px + 154, 0, 6, VH); R(p, INK, px + 153, 0, 1.5, VH); R(p, INK, px + 159, 0, 1, VH); // gutter
      }
      // Mid: inked buildings in flat colour, hatched shadows, sound-effect decals painted on.
      this.mid = KF.makeHi(768, VH);
      const m = this.mid.getContext('2d');
      const walls = ['#d890d8', '#9048d8', '#ffb048', '#48b090', '#4890d8'], sfx = ['KRAK!', 'WHAM!', 'ZOK!', 'THWIP', 'BLAM!'];
      let sk = 0;
      for (let x = 0; x < 768;) {
        const w = 52 + Math.floor(rnd() * 50), top = 86 + Math.floor(rnd() * 40), col = walls[Math.floor(rnd() * walls.length)];
        inkRect(m, col, x, top, w, VH - top, 2);
        m.strokeStyle = INK; m.lineWidth = 0.75; m.beginPath(); // hatched shadow down the right side
        for (let y = top + 2; y < VH; y += 4) { m.moveTo(x + w - 12, y + 8); m.lineTo(x + w - 2, y); }
        m.stroke();
        R(m, '#ffffd8', x, top, w, 3); R(m, INK, x, top + 3, w, 1.5); // roof ledge
        for (let wy = top + 12; wy < 176; wy += 14) for (let wx = x + 6; wx < x + w - 16; wx += 13) {
          const lit = rnd() < 0.4;
          inkRect(m, lit ? '#ffffd8' : '#4848a0', wx, wy, 7, 8, 1);
          if (lit) { m.strokeStyle = '#ffd848'; m.lineWidth = 1; m.beginPath(); m.moveTo(wx + 1, wy + 6); m.lineTo(wx + 5, wy + 1); m.stroke(); }
        }
        const r = rnd();
        if (r < 0.3) { // water tower
          const tx = x + 10;
          inkRect(m, '#d89048', tx, top - 20, 18, 14, 1.5);
          m.fillStyle = INK; m.beginPath(); m.moveTo(tx - 2, top - 20); m.lineTo(tx + 9, top - 28); m.lineTo(tx + 20, top - 20); m.fill();
          R(m, INK, tx + 2, top - 6, 1.5, 6); R(m, INK, tx + 14, top - 6, 1.5, 6);
          for (let k = 0; k < 3; k++) R(m, '#904848', tx + 1, top - 16 + k * 4, 16, 1);
        } else if (r < 0.55) { R(m, INK, x + w - 14, top - 24, 1.5, 24); R(m, INK, x + w - 19, top - 18, 11, 1.5); } // antenna
        if (rnd() < 0.55) { // a sound effect painted on the wall
          const bx = x + w / 2, by = top + 30 + rnd() * 30;
          burst(m, bx, by, 12, 21, 9, '#ffd848', INK, rnd());
          F().draw(m, sfx[sk++ % sfx.length], bx, by - 3, '#d84848', 1, 'center', INK);
        }
        x += w + 4 + Math.floor(rnd() * 12);
      }
      this.speed = []; for (let k = 0; k < 40; k++) this.speed.push({ a: rnd() * Math.PI * 2, r: 140 + rnd() * 60, l: 30 + rnd() * 50 });
    },
    background(ctx, cam, t, mood) {
      tiled(ctx, this.page, cam.x, 0.1);
      tiled(ctx, this.mid, cam.x, 0.35);
      // Caption box: every comic page needs one.
      R(ctx, INK, 11, 53, 132, 14); R(ctx, '#ffd848', 12, 54, 130, 12);
      F().draw(ctx, 'MEANWHILE, ON A ROOF...', 77, 57, INK, 1, 'center');
      if (mood.cheer > 0.15) { // deaths get the full splash treatment
        const k = Math.min(1, mood.cheer), cx = VW / 2, cy = 110;
        ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.globalAlpha = k; ctx.beginPath();
        for (const s of this.speed) {
          const r = s.r - k * 20;
          ctx.moveTo(cx + Math.cos(s.a) * r, cy + Math.sin(s.a) * r * 0.6);
          ctx.lineTo(cx + Math.cos(s.a) * (r + s.l), cy + Math.sin(s.a) * (r + s.l) * 0.6);
        }
        ctx.stroke(); ctx.globalAlpha = 1;
        if (mood.cheer > 0.6) {
          const z = 1 + (1.6 - Math.min(1.6, mood.cheer)) * 0.4;
          burst(ctx, cx, 96, 22 * z, 40 * z, 12, '#ff4848', INK, t);
          F().draw(ctx, 'BOOM!', cx, 90, '#ffd848', 2, 'center', INK);
        }
      }
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid') { // flat red brick, black mortar, a little hatching
        R(ctx, '#d84848', x, y, 16, 16);
        for (let r = 0; r < 4; r++) {
          const by = y + r * 4, off = (r & 1) * 4;
          R(ctx, INK, x, by + 3, 16, 1);
          for (let bx = off; bx < 16; bx += 8) R(ctx, INK, x + bx, by, 1, 3);
        }
        if (seed > 0.5) { ctx.strokeStyle = INK; ctx.lineWidth = 0.5; ctx.beginPath(); for (let k = 0; k < 3; k++) { ctx.moveTo(x + 9 + k * 2, y + 15); ctx.lineTo(x + 15, y + 9 + k * 2); } ctx.stroke(); }
        if (e.t) { R(ctx, '#ffffd8', x, y, 16, 3); R(ctx, '#d8d890', x, y + 3, 16, 1); R(ctx, INK, x, y + 4, 16, 1.5); R(ctx, INK, x, y, 16, 0.5); }
        if (e.l) R(ctx, INK, x, y, 1.5, 16);
        if (e.r) R(ctx, INK, x + 14.5, y, 1.5, 16);
        if (e.b) R(ctx, INK, x, y + 14.5, 16, 1.5);
      } else if (art === 'alt') { // AC unit, inked
        R(ctx, INK, x, y, 16, 16); R(ctx, '#d8d8d8', x + 1.5, y + 1.5, 13, 13);
        ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x + 8, y + 8, 5, 0, 7); ctx.fill();
        ctx.fillStyle = '#90d8ff'; ctx.beginPath(); ctx.arc(x + 8, y + 8, 4, 0, 7); ctx.fill();
        R(ctx, INK, x + 4, y + 7.5, 8, 1); R(ctx, INK, x + 7.5, y + 4, 1, 8);
        R(ctx, '#ffffff', x + 2.5, y + 2.5, 4, 1);
      } else if (art === 'ice') {
        R(ctx, INK, x, y, 16, 16); R(ctx, '#d8ffff', x + 1, y + 1.5, 14, 13);
        R(ctx, '#ffffff', x + 3, y + 4, 6, 1); R(ctx, '#ffffff', x + 8, y + 8, 4, 1); R(ctx, '#90d8ff', x + 1, y + 11, 14, 3);
      } else { // plank
        R(ctx, INK, x, y - 0.5, 16, 5.5); R(ctx, '#ff9048', x, y + 0.5, 16, 3); R(ctx, '#ffd848', x, y + 0.5, 16, 1);
        R(ctx, INK, x + 7, y + 5, 2, 4);
      }
    },
  }, { post: comicPost });

  // ===================== GAME BOY: a handheld monster-catching town =====================
  // Drawn straight in four greys that land in the middle of the style's four dither bands, so the
  // scenery comes out as clean flat shades and only the fighter gets dithered.
  const G0 = '#202020', G1 = '#606060', G2 = '#a0a0a0', G3 = '#e0e0e0', GM = '#808080';
  function tree(c, x, y, r) { // round pixel tree: outline, body, highlight
    c.fillStyle = G0; c.beginPath(); c.arc(x, y, r + 1, 0, 7); c.fill();
    c.fillStyle = G1; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
    c.fillStyle = G2; c.beginPath(); c.arc(x - r * 0.35, y - r * 0.35, r * 0.4, 0, 7); c.fill();
    R(c, G0, x - 1, y + r, 3, 5);
  }
  function house(c, x, y, w, big) {
    const h = big ? 34 : 26;
    R(c, G0, x - 1, y - 1, w + 2, h + 2); R(c, G3, x, y, w, h);
    for (let k = 0; k < 4; k++) { R(c, G0, x - 4 + k, y - 16 + k * 4, w + 8 - k * 2, 1); R(c, k % 2 ? G1 : G2, x - 3 + k, y - 15 + k * 4, w + 6 - k * 2, 3); }
    R(c, G0, x - 4, y - 1, w + 8, 1);
    R(c, G0, x + w / 2 - 4, y + h - 12, 8, 12); R(c, G1, x + w / 2 - 3, y + h - 11, 6, 11);
    for (const wx of [x + 4, x + w - 12]) { R(c, G0, wx, y + 6, 8, 7); R(c, G2, wx + 1, y + 7, 6, 5); R(c, G3, wx + 1, y + 7, 2, 2); }
    if (big) { R(c, G0, x + w / 2 - 12, y - 24, 24, 10); R(c, G3, x + w / 2 - 11, y - 23, 22, 8); F().draw(c, 'HEAL', x + w / 2, y - 22, G0, 1, 'center'); }
  }
  KF.Env.add('gameboy', {
    name: 'TOWN', bg: G3,
    signBoard: G3, signInk: G0, signPost: G0,
    zone: { gravity: G1, reverse: G2 },
    build() {
      const rnd = U.rng(4);
      this.hills = KF.makeHi(640, VH);
      const h = this.hills.getContext('2d');
      h.fillStyle = G2; h.beginPath(); h.moveTo(0, 130); // far hill line
      for (let x = 0; x <= 640; x += 16) h.lineTo(x, 112 + Math.sin(x / 640 * Math.PI * 6) * 10);
      h.lineTo(640, VH); h.lineTo(0, VH); h.fill();
      for (let y = 112; y < VH; y += 2) for (let x = (y / 2) & 1; x < 640; x += 4) R(h, GM, x, y, 1, 1);
      for (let x = 6; x < 650; x += 13) tree(h, x % 640, 126 + Math.sin(x) * 3, 7);
      this.town = KF.makeHi(768, VH);
      const m = this.town.getContext('2d');
      R(m, G2, 0, 150, 768, VH - 150); R(m, G0, 0, 150, 768, 1);
      R(m, G3, 0, 153, 768, 7); R(m, G0, 0, 152, 768, 1); R(m, G0, 0, 160, 768, 1); // sandy path
      for (let x = 0; x < 768; x += 6) R(m, G2, x + (x % 12 ? 0 : 3), 156, 1, 1);
      for (let y = 163; y < VH; y += 5) for (let x = ((y / 5) & 1) * 4; x < 768; x += 8) { // tall grass, where the monsters live
        R(m, G1, x, y, 7, 4); R(m, G0, x, y, 1, 3); R(m, G0, x + 3, y - 1, 1, 3); R(m, G0, x + 6, y, 1, 3); R(m, G0, x, y + 3, 7, 1);
      }
      this.flowers = []; this.npcs = [];
      for (let x = 10, k = 0; x < 768; k++) {
        const kind = k % 4;
        if (kind === 0 || kind === 2) { house(m, x, 124, 40 + (kind ? 8 : 0), false); x += 64; }
        else if (kind === 1) { house(m, x, 116, 64, true); x += 84; }
        else { // fence run with a signpost and flowers
          for (let fx = x; fx < x + 60; fx += 6) { R(m, G0, fx, 136, 3, 14); R(m, G3, fx + 1, 137, 1, 12); }
          R(m, G0, x, 140, 60, 2); R(m, G0, x, 146, 60, 1);
          R(m, G0, x + 66, 128, 16, 12); R(m, G3, x + 67, 129, 14, 10); R(m, G0, x + 72, 140, 4, 10); R(m, G0, x + 70, 132, 10, 1); R(m, G0, x + 70, 135, 8, 1);
          for (let k2 = 0; k2 < 4; k2++) this.flowers.push({ x: x + 90 + k2 * 8, y: 146 });
          this.npcs.push({ x: x + 20, range: 40, ph: rnd() * 6 });
          x += 130;
        }
        tree(m, x - 6, 132, 8);
      }
      this.clouds = [{ x: 30, y: 70 }, { x: 170, y: 86 }, { x: 290, y: 64 }];
    },
    background(ctx, cam, t, mood) {
      R(ctx, G3, 0, 0, VW, VH);
      for (const c of this.clouds) { // chunky outlined clouds
        const x = Math.round(((((c.x - cam.x * 0.04 - t * 3) % 420) + 420) % 420) - 30), y = c.y;
        R(ctx, G0, x - 1, y - 1, 34, 10); R(ctx, G0, x + 7, y - 6, 16, 6);
        R(ctx, G3, x, y, 32, 8); R(ctx, G3, x + 8, y - 5, 14, 6); R(ctx, G2, x, y + 6, 32, 2);
      }
      tiled(ctx, this.hills, cam.x, 0.12);
      tiled(ctx, this.town, cam.x, 0.32);
      const fr = Math.floor(t * 2) % 2; // two-frame flowers, as tradition demands
      for (const f of this.flowers) {
        const x = at(f.x, cam.x, 0.32, 768, 8); if (x === null) continue;
        R(ctx, G0, x + (fr ? 0 : 1), f.y, 3, 3); R(ctx, G3, x + 1 + (fr ? 0 : 1) - 0, f.y + 1, 1, 1);
      }
      for (const n of this.npcs) { // a trainer pacing by the fence, startled by deaths
        const off = Math.round((Math.sin(t * 0.6 + n.ph) * 0.5 + 0.5) * n.range), x = at(n.x + off, cam.x, 0.32, 768, 12); if (x === null) continue;
        const step = Math.floor(t * 4) % 2, y = 152 - (mood.cheer > 0.3 ? 3 : 0);
        R(ctx, G0, x, y - 14, 8, 15); R(ctx, G3, x + 1, y - 10, 6, 4); R(ctx, G1, x + 1, y - 13, 6, 3); R(ctx, G2, x + 1, y - 6, 6, 4);
        R(ctx, G0, x + 2, y - 9, 1, 1); R(ctx, G0, x + 5, y - 9, 1, 1);
        R(ctx, G3, x + 1 + step * 3, y - 2, 2, 2);
        if (mood.cheer > 0.3) { R(ctx, G0, x - 1, y - 28, 10, 12); R(ctx, G3, x, y - 27, 8, 10); R(ctx, G0, x + 3, y - 25, 2, 5); R(ctx, G0, x + 3, y - 19, 2, 2); }
      }
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid') { // grassy ledge over a rocky cliff face
        R(ctx, G1, x, y, 16, 16);
        for (let r = 0; r < 16; r += 5) { const off = ((r / 5) & 1) * 4; for (let bx = -off; bx < 16; bx += 8) { R(ctx, G0, x + Math.max(0, bx), y + r + 4, Math.min(7, 16 - Math.max(0, bx)), 1); R(ctx, G2, x + Math.max(0, bx + 1), y + r, 2, 1); } }
        if (e.t) {
          R(ctx, G0, x, y, 16, 1); R(ctx, G3, x, y + 1, 16, 4); R(ctx, G0, x, y + 5, 16, 1); R(ctx, G2, x, y + 6, 16, 1);
          for (let k = 1; k < 16; k += 5) { R(ctx, G1, x + k, y + 2, 1, 2); R(ctx, G1, x + k + 2, y + 2, 1, 2); R(ctx, G1, x + k + 1, y + 3, 1, 1); }
        }
        edges(ctx, x, y, e, G0);
      } else if (art === 'alt') { // a cuttable shrub
        R(ctx, G2, x, y, 16, 16);
        ctx.fillStyle = G0; ctx.beginPath(); ctx.arc(x + 8, y + 8, 8, 0, 7); ctx.fill();
        ctx.fillStyle = G1; ctx.beginPath(); ctx.arc(x + 8, y + 8, 6.5, 0, 7); ctx.fill();
        R(ctx, G2, x + 4, y + 4, 3, 2); R(ctx, G2, x + 9, y + 7, 2, 2); R(ctx, G0, x + 6, y + 10, 4, 1);
      } else if (art === 'ice') { // frozen pond
        R(ctx, G3, x, y, 16, 16); R(ctx, G2, x + 2 + ((seed * 8) | 0), y + 5, 5, 1); R(ctx, G2, x + 4, y + 10, 7, 1);
        if (e.t) R(ctx, G0, x, y, 16, 1);
        edges(ctx, x, y, e, G0);
      } else { // wooden bridge
        R(ctx, G0, x, y, 16, 5); R(ctx, G2, x, y + 1, 16, 3);
        for (let k = 0; k < 16; k += 4) R(ctx, G0, x + k, y + 1, 1, 3);
        R(ctx, G0, x + 3, y + 5, 1, 3); R(ctx, G0, x + 12, y + 5, 1, 3);
      }
    },
  });

  // Same tape look as the generic VHS pass (tracking band, row jitter, chroma bleed), with the
  // per-pixel helper calls inlined and the source copy reused.
  let TAPE = null;
  const rowNoise = (y, s) => { const v = Math.sin(y * 12.9898 + s * 78.233) * 43758.5453; return v - Math.floor(v); };
  function vhsPost(d, W, H, i) {
    if (!TAPE || TAPE.length !== d.length) TAPE = new Uint8ClampedArray(d.length);
    TAPE.set(d);
    const src = TAPE, seed = Math.floor(i.t * 6), band = ((i.t * 50) % (H + 60)) - 30, W1 = W - 1;
    for (let y = 0; y < H; y++) {
      const db = y - band, inBand = db > -14 && db < 14;
      const jit = inBand ? Math.round((rowNoise(y, seed) - 0.5) * 14) : (rowNoise(y, seed + 99) < 0.02 ? 4 : 0);
      const glow = db > -2 && db < 2 ? 60 : 0, row = y * W;
      for (let x = 0, o = row * 4; x < W; x++, o += 4) {
        let sx = x + jit; sx = sx < 0 ? 0 : sx > W1 ? W1 : sx;
        const rx = sx - 3 < 0 ? 0 : sx - 3, bx = sx + 2 > W1 ? W1 : sx + 2;
        const g = (row + sx) * 4, l = ((src[g] * 77 + src[g + 1] * 150 + src[g + 2] * 29) >> 8) * 0.2 + glow;
        d[o] = src[(row + rx) * 4] * 0.8 + l; d[o + 1] = src[g + 1] * 0.8 + l; d[o + 2] = src[(row + bx) * 4 + 2] * 0.8 + l;
      }
    }
  }

  // ===================== VHS: Dad's camcorder, the backyard, summer '96 =====================
  KF.Env.add('vhs', {
    name: 'BACKYARD', bg: '#8ad0ff',
    signBoard: '#fff4d8', signInk: '#3a2a1a', signPost: '#8a6038',
    zone: { gravity: '#8a7aff', reverse: '#ff5ac8' },
    build() {
      const rnd = U.rng(96);
      this.sky = ditherSky(['#5aa8f0', '#72b8f4', '#8ac8f8', '#a8d8fa', '#c8e8fa', '#e0f0f4']);
      const sk = this.sky.getContext('2d');
      for (let k = 0; k < 5; k++) { // puffy clouds
        const cx = 30 + k * 80 + rnd() * 30, cy = 40 + rnd() * 30;
        for (let j = 0; j < 5; j++) { sk.fillStyle = j < 3 ? '#ffffff' : '#e4eef8'; sk.beginPath(); sk.arc(cx + j * 7 - 14, cy + (j % 2) * 3 + (j >= 3 ? 3 : 0), 7 + (j % 3) * 2, 0, 7); sk.fill(); }
      }
      // Far: the neighbours' roofs, trees and the telephone line.
      this.far = KF.makeHi(640, VH);
      const f = this.far.getContext('2d');
      for (let x = 0; x < 640;) {
        const w = 50 + Math.floor(rnd() * 40), h = 26 + Math.floor(rnd() * 12), roof = ['#8a5a4a', '#6a6a7a', '#7a4a3a'][Math.floor(rnd() * 3)];
        R(f, '#e8dcc4', x, 128 - h, w, h + 20); R(f, '#c8bca4', x + w - 6, 128 - h, 6, h + 20);
        f.fillStyle = roof; f.beginPath(); f.moveTo(x - 4, 128 - h); f.lineTo(x + w / 2, 128 - h - 18); f.lineTo(x + w + 4, 128 - h); f.fill();
        R(f, '#5a6a7a', x + 8, 134 - h, 10, 8); R(f, '#5a6a7a', x + w - 20, 134 - h, 10, 8);
        x += w + 10 + Math.floor(rnd() * 30);
        f.fillStyle = '#4a8a3a'; f.beginPath(); f.arc(x - 6, 100, 16 + rnd() * 8, 0, 7); f.fill();
        f.fillStyle = '#5a9a44'; f.beginPath(); f.arc(x - 10, 95, 9, 0, 7); f.fill();
      }
      for (let x = 60; x < 640; x += 200) R(f, '#5a4030', x, 40, 3, 100);
      f.strokeStyle = '#3a3030'; f.lineWidth = 0.5; f.beginPath(); for (let x = 60; x < 640; x += 200) { f.moveTo(x, 44); f.quadraticCurveTo(x + 100, 58, x + 200, 44); } f.stroke();
      // Mid: the backyard. Fence, BBQ, trampoline, paddling pool, gnome, flamingo, washing line.
      this.yard = KF.makeHi(768, VH);
      const y = this.yard.getContext('2d');
      R(y, '#c89a62', 0, 100, 768, 52); // fence
      for (let x = 0; x < 768; x += 9) { R(y, '#d8aa70', x, 98, 8, 54); R(y, '#a87a48', x + 7, 100, 1, 52); R(y, '#e8c088', x, 98, 8, 1); R(y, '#8a6038', x + 3, 108, 1, 1); R(y, '#8a6038', x + 3, 138, 1, 1); }
      R(y, '#a87a48', 0, 110, 768, 3); R(y, '#a87a48', 0, 136, 768, 3);
      R(y, '#5aa83e', 0, 150, 768, VH - 150); // lawn
      for (let k = 0; k < 900; k++) R(y, rnd() < 0.5 ? '#4a9632' : '#6ab84a', rnd() * 768, 150 + rnd() * 66, 1, 2);
      const items = ['bbq', 'tramp', 'pool', 'gnome', 'line', 'flamingo'];
      this.smoke = []; this.sprinklers = []; this.shirts = [];
      for (let x = 20, k = 0; x < 740; k++) {
        const it = items[k % items.length];
        if (it === 'bbq') { // kettle grill
          y.fillStyle = '#1a1a1e'; y.beginPath(); y.arc(x + 12, 132, 11, Math.PI, 0); y.fill(); R(y, '#1a1a1e', x + 1, 132, 22, 5);
          R(y, '#3a3a44', x + 4, 124, 6, 2); R(y, '#5a5a60', x + 11, 119, 2, 3);
          R(y, '#2a2a30', x + 4, 137, 2, 14); R(y, '#2a2a30', x + 18, 137, 2, 14); R(y, '#2a2a30', x + 11, 137, 2, 12);
          this.smoke.push(x + 12); x += 60;
        } else if (it === 'tramp') { // trampoline with safety net
          y.strokeStyle = '#2a2a38'; y.lineWidth = 1;
          for (let k2 = 0; k2 < 6; k2++) R(y, '#2a2a38', x + k2 * 12, 112, 1.5, 34);
          y.globalAlpha = 0.35; R(y, '#1a1a2a', x, 112, 62, 24); y.globalAlpha = 1;
          R(y, '#3a3a5a', x - 2, 134, 66, 4); R(y, '#2060c0', x - 2, 133, 66, 2);
          for (let k2 = 0; k2 < 4; k2++) { R(y, '#6a6a78', x + k2 * 20, 138, 2, 12); }
          x += 90;
        } else if (it === 'pool') { // inflatable paddling pool
          y.fillStyle = '#3a9aff'; y.beginPath(); y.ellipse(x + 28, 146, 30, 7, 0, 0, 7); y.fill();
          y.strokeStyle = '#ff5a7a'; y.lineWidth = 2.5; y.beginPath(); y.ellipse(x + 28, 146, 30, 7, 0, 0, 7); y.stroke();
          y.strokeStyle = '#ffe05a'; y.lineWidth = 1; y.beginPath(); y.ellipse(x + 28, 143.5, 30, 7, 0, Math.PI, 0); y.stroke();
          R(y, '#c8eaff', x + 14, 145, 10, 1); this.sprinklers.push(x + 76); x += 110;
        } else if (it === 'gnome') {
          R(y, '#3a4a9a', x + 3, 138, 8, 10); R(y, '#f4c8a0', x + 4, 133, 6, 5); R(y, '#ffffff', x + 3, 136, 8, 5);
          y.fillStyle = '#e03030'; y.beginPath(); y.moveTo(x + 2, 134); y.lineTo(x + 7, 122); y.lineTo(x + 12, 134); y.fill();
          R(y, '#2a2a2a', x + 2, 147, 10, 2); x += 40;
        } else if (it === 'line') { // washing line, the shirts flap in the wind
          R(y, '#8a8a8a', x, 76, 2, 76); R(y, '#8a8a8a', x + 100, 76, 2, 76);
          for (let k2 = 0; k2 < 4; k2++) this.shirts.push({ x: x + 10 + k2 * 23, col: ['#ff6a6a', '#ffffff', '#6aa0ff', '#ffd84a'][k2] });
          this.lineX = this.lineX || []; this.lineX.push(x);
          x += 124;
        } else { // plastic flamingo
          y.fillStyle = '#ff6aa8'; y.beginPath(); y.ellipse(x + 8, 128, 7, 4, 0, 0, 7); y.fill();
          R(y, '#ff6aa8', x + 13, 116, 2, 12); R(y, '#ff6aa8', x + 12, 114, 5, 3); R(y, '#2a2a2a', x + 16, 115, 2, 2);
          R(y, '#2a2a2a', x + 7, 132, 1, 18); R(y, '#2a2a2a', x + 10, 132, 1, 18); x += 40;
        }
      }
      this.heads = []; for (let k = 0; k < 8; k++) this.heads.push({ x: 40 + k * 90 + rnd() * 30, col: ['#f4c8a0', '#c08a60', '#8a5a3a'][k % 3], hair: ['#3a2a1a', '#d8b050', '#2a1a10', '#8a3a20'][k % 4] });
    },
    background(ctx, cam, t, mood) {
      KF.blit(ctx, this.sky, 0, 0);
      tiled(ctx, this.far, cam.x, 0.12);
      // Nosy neighbours pop up over the fence whenever something happens.
      const up = Math.min(1, mood.cheer) * 12;
      if (up > 0.5) for (const h of this.heads) {
        const x = at(h.x, cam.x, 0.3, 768, 12); if (x === null) continue;
        const yy = 104 - up + Math.round(Math.sin(t * 9 + h.x) * 1);
        R(ctx, h.col, x, yy, 10, 11); R(ctx, h.hair, x - 1, yy - 2, 12, 4); R(ctx, '#1a1a1a', x + 2, yy + 4, 1.5, 1.5); R(ctx, '#1a1a1a', x + 6.5, yy + 4, 1.5, 1.5);
        R(ctx, '#8a3a3a', x + 3, yy + 8, 4, 1.5);
      }
      tiled(ctx, this.yard, cam.x, 0.3);
      for (const lx of this.lineX || []) { // washing line
        const x = at(lx, cam.x, 0.3, 768, 110); if (x === null) continue;
        ctx.strokeStyle = '#6a6a6a'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(x + 1, 78); ctx.quadraticCurveTo(x + 51, 86, x + 101, 78); ctx.stroke();
      }
      for (const sh of this.shirts) {
        const x = at(sh.x, cam.x, 0.3, 768, 30); if (x === null) continue;
        const flap = Math.sin(t * 3 + sh.x) * 2;
        R(ctx, sh.col, x, 81, 14, 4); R(ctx, sh.col, x + 3 + flap * 0.3, 85, 8, 10 + flap * 0.5);
        R(ctx, 'rgba(0,0,0,0.15)', x + 3 + flap * 0.3, 85, 2, 10);
      }
      for (const sx of this.smoke) { // BBQ smoke
        const x = at(sx, cam.x, 0.3, 768, 30); if (x === null) continue;
        for (let k = 0; k < 6; k++) {
          const ph = (t * 0.6 + k / 6) % 1;
          ctx.globalAlpha = 0.35 * (1 - ph); ctx.fillStyle = '#e8e8e8';
          ctx.beginPath(); ctx.arc(x + Math.sin(ph * 6 + k) * 4 + ph * 10, 116 - ph * 60, 3 + ph * 6, 0, 7); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      for (const px of this.sprinklers) { // sweeping sprinkler
        const x = at(px, cam.x, 0.3, 768, 50); if (x === null) continue;
        const a = Math.sin(t * 1.4) * 0.9;
        R(ctx, '#3a3a3a', x - 2, 146, 4, 3);
        for (let k = 0; k < 10; k++) {
          const ph = ((t * 1.6 + k / 10) % 1), dx = Math.sin(a) * 40 * ph, dy = -Math.sin(ph * Math.PI) * 26;
          R(ctx, '#d8f0ff', x + dx, 146 + dy, 1.5, 1.5);
        }
      }
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid') { // raised garden bed: lawn on top, stacked sandstone below
        stone(ctx, x, y, 0, 16, seed, { base: '#c8a878', mortar: '#8a6a48', hi: '#e8cca0', chip: '#a88a60' });
        if (e.t) {
          R(ctx, '#7ad85a', x, y, 16, 1); R(ctx, '#5ab83e', x, y + 1, 16, 3); R(ctx, '#3a8a2a', x, y + 4, 16, 1); R(ctx, '#2a4a1a', x, y + 5, 16, 1);
          for (let k = 0; k < 16; k += 3) R(ctx, '#8ae86a', x + k + ((seed * 3) | 0) % 2, y - 1, 1, 2);
          if (seed > 0.8) { R(ctx, '#ffffff', x + 5, y - 2, 2, 2); R(ctx, '#ffe040', x + 5.5, y - 1.5, 1, 1); } // daisy
        }
        edges(ctx, x, y, e, '#4a3420');
      } else if (art === 'alt') { // picnic cooler
        R(ctx, '#2a1a1a', x, y + 1, 16, 15); R(ctx, '#e03a3a', x + 1, y + 6, 14, 9); R(ctx, '#ff6a5a', x + 1, y + 6, 14, 1);
        R(ctx, '#f4f4f0', x + 1, y + 2, 14, 4); R(ctx, '#ffffff', x + 1, y + 2, 14, 1); R(ctx, '#c8c8c0', x + 1, y + 5, 14, 1);
        R(ctx, '#2a2a2a', x + 5, y, 6, 2); R(ctx, '#ffffff', x + 3, y + 9, 3, 1);
        if (e.t) R(ctx, '#ffffff', x + 1, y + 1, 14, 1);
      } else if (art === 'ice') { // slip 'n slide, wet
        R(ctx, '#ffe040', x, y, 16, 16); R(ctx, '#fff4a0', x, y, 16, 1); R(ctx, '#3a9aff', x, y + 6, 16, 2);
        R(ctx, '#ffffff', x + ((seed * 10) | 0), y + 2, 4, 1); R(ctx, '#e8b020', x, y + 13, 16, 3);
        edges(ctx, x, y, e, '#6a4a10');
      } else { // deck boards
        R(ctx, '#e8c088', x, y, 16, 1); R(ctx, '#b88a58', x, y + 1, 16, 2); R(ctx, '#6a4a28', x, y + 3, 16, 1);
        R(ctx, '#5a3a20', x + 2, y + 2, 1, 1); R(ctx, '#5a3a20', x + 13, y + 2, 1, 1); R(ctx, '#6a4a28', x + 7, y + 4, 2, 5);
      }
    },
  }, {
    post: vhsPost,
    overlay(ctx, i) { // camcorder viewfinder: REC, battery, timecode, date stamp
      for (let yy = 0; yy < VH; yy++) { ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(0, yy + 0.5, VW, 0.5); }
      const f = F();
      if (Math.floor(i.t * 1.5) % 2 === 0) { ctx.fillStyle = '#ff2a2a'; ctx.beginPath(); ctx.arc(VW - 78, 61, 3, 0, 7); ctx.fill(); }
      f.draw(ctx, 'REC', VW - 71, 58, '#ffffff', 1, 'left', '#000');
      const s = Math.floor(i.t);
      f.draw(ctx, `SP 0:${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`, VW - 14, 69, '#ffffff', 1, 'right', '#000');
      R(ctx, '#000', VW - 34, 57, 18, 9); R(ctx, '#ffffff', VW - 33, 58, 16, 7); R(ctx, '#000', VW - 32, 59, 14, 5);
      R(ctx, '#ffffff', VW - 16, 59, 2, 5); R(ctx, '#ffffff', VW - 31, 60, 7, 3);
      f.draw(ctx, 'JUL 14 1996', VW - 14, VH - 36, '#ffb040', 1, 'right', '#000');
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 0.5; // corner brackets
      for (const [cx, cy, dx, dy] of [[10, 50, 1, 1], [VW - 10, 50, -1, 1], [10, VH - 8, 1, -1], [VW - 10, VH - 8, -1, -1]]) {
        ctx.beginPath(); ctx.moveTo(cx + dx * 10, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + dy * 8); ctx.stroke();
      }
    },
  });
})(window.KF);
