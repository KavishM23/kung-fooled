'use strict';
// Smooth (non-pixel) places for the VAPORWAVE realm: a glossy late-90s 3D-render look. Marble,
// chrome and glass with gradients and reflections, drawn with paths so they stay crisp at any
// resolution. Four places: a sunset plaza, a neon mall, a sunset marina and a dream express.
(function (KF) {
  const { tiled, wrapX } = KF.ThemeKit;
  const U = KF.util, VW = KF.VIEW_W, VH = KF.VIEW_H, F = KF.Font;
  const HI = () => KF.HI_MAX;

  // ---------- drawing helpers ----------
  const lin = (ctx, x0, y0, x1, y1, stops) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
  const rad = (ctx, x, y, r0, r1, stops) => { const g = ctx.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
  const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
  const fillRR = (ctx, x, y, w, h, r, fill) => { rr(ctx, x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); };
  const INK = '#3a1450';

  // Striped setting sun: gradient disc with horizontal gaps that widen toward the bottom.
  function sun(ctx, cx, cy, r) {
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = lin(ctx, 0, cy - r, 0, cy + r, [[0, '#fff3a0'], [0.45, '#ffb36a'], [1, '#ff4f9a']]);
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.globalCompositeOperation = 'destination-out';
    for (let k = 0; k < 7; k++) { const y = cy + r * (0.05 + k * 0.14), h = 0.8 + k * 0.7; ctx.fillRect(cx - r, y, r * 2, h); }
    ctx.restore();
    ctx.globalAlpha = 0.35; ctx.fillStyle = rad(ctx, cx, cy, r * 0.8, r * 1.9, [[0, 'rgba(255,160,200,0.9)'], [1, 'rgba(255,120,200,0)']]);
    ctx.beginPath(); ctx.arc(cx, cy, r * 1.9, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  }
  // Fluted marble column with a soft cylinder shade.
  function column(ctx, cx, top, h, w = 14) {
    ctx.fillStyle = lin(ctx, cx - w / 2, 0, cx + w / 2, 0, [[0, '#b98ccd'], [0.3, '#fff4ff'], [0.55, '#f1d9f2'], [1, '#9a6ab8']]);
    ctx.fillRect(cx - w / 2 + 1.5, top + 4, w - 3, h - 8);
    ctx.strokeStyle = 'rgba(120,70,150,0.35)'; ctx.lineWidth = 0.4;
    for (let i = 1; i < 5; i++) { const x = cx - w / 2 + 1.5 + (w - 3) * i / 5; ctx.beginPath(); ctx.moveTo(x, top + 5); ctx.lineTo(x, top + h - 5); ctx.stroke(); }
    for (const [y, hh] of [[top, 4], [top + h - 4, 4]]) {
      fillRR(ctx, cx - w / 2 - 1, y, w + 2, hh, 1, lin(ctx, 0, y, 0, y + hh, [[0, '#fff8ff'], [1, '#b48ac8']]));
    }
  }
  // Classical marble bust on a plinth: head, shoulders, nose profile, soft light from the left.
  function bust(ctx, cx, by, s = 1) {
    ctx.save(); ctx.translate(cx, by); ctx.scale(s, s);
    fillRR(ctx, -8, -12, 16, 12, 1.5, lin(ctx, -8, 0, 8, 0, [[0, '#f4e4ff'], [1, '#a580c4']]));
    const m = lin(ctx, -9, -40, 9, -12, [[0, '#ffffff'], [0.55, '#ead8f4'], [1, '#a986c6']]);
    ctx.fillStyle = m;
    ctx.beginPath(); ctx.moveTo(-9, -12); ctx.quadraticCurveTo(-9, -20, -3, -21); ctx.lineTo(3, -21); ctx.quadraticCurveTo(9, -20, 9, -12); ctx.fill();
    ctx.fillRect(-2.5, -25, 5, 5);
    ctx.beginPath(); ctx.ellipse(0, -30, 5.5, 6.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(5, -32); ctx.lineTo(7.4, -28.5); ctx.lineTo(5, -27.5); ctx.fill(); // nose
    ctx.fillStyle = 'rgba(110,60,150,0.35)'; ctx.beginPath(); ctx.ellipse(1.5, -30, 1.2, 0.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = lin(ctx, 0, -38, 0, -32, [[0, '#ffffff'], [1, '#dcc6ec']]);
    ctx.beginPath(); ctx.ellipse(-0.5, -34.5, 6, 3.5, 0, Math.PI, 0); ctx.fill(); // hair curls
    ctx.restore();
  }
  // Palm tree: curved trunk with ring marks, fronds as tapered bezier leaves.
  function palm(ctx, px, by, h, col = '#2a1650', leaf = '#1d3d5a') {
    ctx.strokeStyle = col; ctx.lineCap = 'round';
    const tx = px + h * 0.18, ty = by - h;
    ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(px, by); ctx.quadraticCurveTo(px - h * 0.08, by - h * 0.55, tx, ty); ctx.stroke();
    ctx.fillStyle = leaf;
    for (const a of [-2.6, -2.1, -1.55, -1.0, -0.45, 0.15, 0.6]) {
      const l = h * 0.42, ex = tx + Math.cos(a) * l, ey = ty + Math.sin(a) * l * 0.7 + l * 0.25;
      ctx.beginPath(); ctx.moveTo(tx, ty);
      ctx.quadraticCurveTo((tx + ex) / 2 + Math.sin(a) * 4, (ty + ey) / 2 - 6, ex, ey);
      ctx.quadraticCurveTo((tx + ex) / 2 - Math.sin(a) * 2, (ty + ey) / 2 - 2, tx, ty + 1.5);
      ctx.fill();
    }
  }
  // Chrome sphere: radial gradient with a sky reflection band and a hot highlight.
  function chromeBall(ctx, x, y, r) {
    ctx.fillStyle = rad(ctx, x - r * 0.35, y - r * 0.4, r * 0.05, r * 1.1, [[0, '#ffffff'], [0.25, '#e4d6ff'], [0.55, '#7a5ab0'], [0.8, '#2a1448'], [1, '#ff9ad8']]);
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,170,220,0.55)'; ctx.beginPath(); ctx.ellipse(x, y + r * 0.35, r * 0.85, r * 0.18, 0, 0, Math.PI * 2); ctx.fill();
  }
  // A glossy "old OS" window: gradient title bar, close box, a little pastel picture inside.
  function osWindow(ctx, x, y, w, h, title) {
    fillRR(ctx, x + 2, y + 2, w, h, 2, 'rgba(40,10,60,0.35)');
    fillRR(ctx, x, y, w, h, 2, lin(ctx, 0, y, 0, y + h, [[0, '#f2ecff'], [1, '#c8bce4']]));
    fillRR(ctx, x + 2, y + 2, w - 4, 9, 1.5, lin(ctx, x, 0, x + w, 0, [[0, '#3a2ab8'], [1, '#c86ad8']]));
    F.draw(ctx, title, x + 5, y + 3, '#ffffff');
    fillRR(ctx, x + w - 10, y + 3, 7, 7, 1, '#e8e0f8'); F.draw(ctx, 'X', x + w - 9, y + 3, '#3a2a6a');
    ctx.fillStyle = lin(ctx, 0, y + 13, 0, y + h - 4, [[0, '#ff9ad8'], [0.55, '#ffd0e8'], [0.56, '#7ae8e8'], [1, '#3ab8d0']]);
    ctx.fillRect(x + 4, y + 13, w - 8, h - 17);
    sun(ctx, x + w / 2, y + 13 + (h - 17) * 0.55, Math.min(w, h) * 0.18);
  }
  // Perspective grid floor from the horizon down. Lines drift with the camera; cheap enough per frame.
  function grid(ctx, hy, camX, t, col, glow) {
    ctx.fillStyle = lin(ctx, 0, hy, 0, VH, [[0, '#2a0c4a'], [1, '#12042a']]);
    ctx.fillRect(0, hy, VW, VH - hy);
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 0.6; ctx.globalAlpha = 0.9; ctx.beginPath();
    const vx = VW / 2, ofs = (camX * 0.6) % 24;
    for (let k = -22; k <= 22; k++) { const bx = vx + (k * 24 - ofs) * 6; ctx.moveTo(vx + (bx - vx) * 0.04, hy); ctx.lineTo(bx, VH + 40); }
    for (let k = 0; k < 12; k++) { const z = (k + ((t * 0.6) % 1)) / 12, y = hy + Math.pow(z, 2.2) * (VH - hy + 20); ctx.moveTo(0, y); ctx.lineTo(VW, y); }
    ctx.stroke(); ctx.restore();
    ctx.fillStyle = lin(ctx, 0, hy - 3, 0, hy + 3, [[0, 'rgba(255,180,230,0)'], [0.5, glow], [1, 'rgba(255,180,230,0)']]);
    ctx.fillRect(0, hy - 3, VW, 6);
  }
  function sky(stops, h = VH) {
    const c = KF.makeHi(VW, h, HI()), x = c.getContext('2d');
    x.fillStyle = lin(x, 0, 0, 0, h, stops); x.fillRect(0, 0, VW, h);
    return c;
  }
  function stars(ctx, n, seed, h, col = '#ffe8ff') {
    const rnd = U.rng(seed); ctx.fillStyle = col;
    for (let i = 0; i < n; i++) { const r = rnd() * 0.7 + 0.2; ctx.globalAlpha = 0.3 + rnd() * 0.7; ctx.beginPath(); ctx.arc(rnd() * VW, rnd() * h, r, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
  }

  // ---------- shared props: spikes, door, spring, sign ----------
  // Spikes: glossy hot-pink crystal points with a white glint: read as danger on any pastel.
  function spike(ctx, x, y, dir) {
    ctx.save(); ctx.translate(x + 8, y + 8);
    ctx.rotate({ up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 }[dir] || 0);
    for (const ox of [-4, 4]) {
      ctx.beginPath(); ctx.moveTo(ox - 3.8, 8); ctx.lineTo(ox, -3); ctx.lineTo(ox + 3.8, 8); ctx.closePath();
      ctx.fillStyle = lin(ctx, ox - 4, 0, ox + 4, 0, [[0, '#ffd0ec'], [0.45, '#ff2a8a'], [1, '#8a0a4a']]); ctx.fill();
      ctx.strokeStyle = '#4a0628'; ctx.lineWidth = 0.6; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.moveTo(ox - 0.4, -1.5); ctx.lineTo(ox - 2.2, 6); ctx.lineTo(ox - 1, 6); ctx.fill();
    }
    ctx.fillStyle = lin(ctx, 0, 6, 0, 8, [[0, '#ff6ab0'], [1, '#6a0a3a']]); ctx.fillRect(-8, 6.5, 16, 1.5);
    ctx.restore();
  }
  // Exit: a marble arch with a glowing pastel portal; the real one has a floating chrome orb.
  function door(ctx, x, y, o = {}) {
    ctx.save();
    if (o.flipped) { ctx.translate(0, y * 2 + 32); ctx.scale(1, -1); }
    if (o.legs) { // running door: chrome legs
      const k = Math.sin(o.legs * 18) * 2;
      ctx.strokeStyle = '#b8a8d8'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x + 5, y + 30); ctx.lineTo(x + 4 + k, y + 35); ctx.moveTo(x + 11, y + 30); ctx.lineTo(x + 12 - k, y + 35); ctx.stroke();
    }
    const open = o.open || 0;
    fillRR(ctx, x - 2, y + 1, 20, 31, [9, 9, 1, 1], lin(ctx, x - 2, 0, x + 18, 0, [[0, '#fff4ff'], [0.5, '#e6cdef'], [1, '#9c70bc']]));
    rr(ctx, x + 1.5, y + 4.5, 13, 27.5, [6.5, 6.5, 0, 0]);
    ctx.fillStyle = open > 0 ? rad(ctx, x + 8, y + 18, 1, 16, [[0, '#ffffff'], [0.5, '#fff0b0'], [1, '#ff9ad8']])
      : lin(ctx, 0, y + 4, 0, y + 32, [[0, '#5af0ff'], [0.5, '#a86ae8'], [1, '#ff5ab8']]);
    ctx.fill();
    if (!open) { // glass sheen
      ctx.save(); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.moveTo(x + 2, y + 18); ctx.lineTo(x + 9, y + 4); ctx.lineTo(x + 12, y + 4); ctx.lineTo(x + 2, y + 24); ctx.fill(); ctx.restore();
    }
    ctx.strokeStyle = INK; ctx.lineWidth = 0.6; rr(ctx, x - 2, y + 1, 20, 31, [9, 9, 1, 1]); ctx.stroke();
    if (o.lantern) {
      const b = Math.sin((o.t || 0) * 3) * 1.5;
      ctx.globalAlpha = 0.35; ctx.fillStyle = rad(ctx, x + 8, y - 8 + b, 1, 11, [[0, '#fff0ff'], [1, 'rgba(255,150,220,0)']]); ctx.beginPath(); ctx.arc(x + 8, y - 8 + b, 11, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
      chromeBall(ctx, x + 8, y - 8 + b, 4.2);
    }
    ctx.restore();
  }
  function spring(ctx, x, y, squash) {
    const h = 6 - squash * 4, top = y + 16 - h - 3;
    ctx.strokeStyle = lin(ctx, x, 0, x + 16, 0, [[0, '#ffffff'], [0.5, '#a8a0c8'], [1, '#5a4a8a']]); ctx.lineWidth = 1.4;
    ctx.beginPath(); for (let i = 0; i <= 4; i++) { const yy = y + 15 - i * (h / 4); ctx.moveTo(x + 3, yy); ctx.lineTo(x + 13, yy - h / 8); } ctx.stroke();
    fillRR(ctx, x + 1, top, 14, 3, 1.5, lin(ctx, 0, top, 0, top + 3, [[0, '#fff0fa'], [1, '#ff5ab8']]));
    fillRR(ctx, x, y + 14.5, 16, 1.5, 0.7, '#5ad8e0');
  }
  function sign(ctx, x, y, text, theme) {
    const w = F.measure(text) + 10, bx = Math.round(x - w / 2), by = Math.round(y);
    fillRR(ctx, bx + w / 2 - 1, by + 10, 2, 8, 0.5, theme.signPost);
    fillRR(ctx, bx + 1, by + 1, w, 11, 2.5, 'rgba(40,10,60,0.35)');
    fillRR(ctx, bx, by, w, 11, 2.5, lin(ctx, 0, by, 0, by + 11, [[0, 'rgba(255,255,255,0.92)'], [1, theme.signShade]]));
    ctx.strokeStyle = theme.signPost; ctx.lineWidth = 0.6; rr(ctx, bx, by, w, 11, 2.5); ctx.stroke();
    F.draw(ctx, text, bx + 5, by + 2, theme.signInk);
  }

  // ---------- surfaces ----------
  // Marble block: soft gradient body, wandering veins, glossy cap on top with a reflection band.
  function marble(ctx, x, y, e, seed, base, vein, cap, capHi) {
    ctx.fillStyle = lin(ctx, 0, y, 0, y + 16, base); ctx.fillRect(x, y, 16, 16);
    const h = seed * 1000;
    ctx.strokeStyle = vein; ctx.lineWidth = 0.45; ctx.beginPath();
    const y0 = y + 3 + (h % 10), y1 = y + 4 + ((h * 7) % 10);
    ctx.moveTo(x, y0); ctx.bezierCurveTo(x + 5, y0 + 4, x + 10, y1 - 4, x + 16, y1);
    if (h % 3 < 1.5) { ctx.moveTo(x + 4, y + 16); ctx.quadraticCurveTo(x + 8, y + 9, x + 13, y + 10); }
    ctx.stroke();
    if (e.t) {
      ctx.fillStyle = lin(ctx, 0, y, 0, y + 4.5, [[0, '#ffffff'], [0.35, capHi], [1, cap]]); ctx.fillRect(x, y, 16, 4.5);
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(x, y + 0.4, 16, 0.6);
      ctx.fillStyle = 'rgba(40,10,60,0.35)'; ctx.fillRect(x, y + 4.5, 16, 0.7);
    }
    ctx.fillStyle = 'rgba(40,10,60,0.45)';
    if (e.l) ctx.fillRect(x, y, 0.7, 16);
    if (e.r) ctx.fillRect(x + 15.3, y, 0.7, 16);
    if (e.b) ctx.fillRect(x, y + 15.3, 16, 0.7);
    if (e.l) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x + 0.7, y + (e.t ? 4.5 : 0), 0.8, 16); }
  }
  // Glass shelf (one-way): thin translucent slab with a bright top edge.
  function glass(ctx, x, y, a = '#7af0e8', b = '#2a9ab0') {
    ctx.fillStyle = lin(ctx, 0, y, 0, y + 4, [[0, 'rgba(255,255,255,0.95)'], [0.3, a], [1, b]]); ctx.fillRect(x, y, 16, 3.5);
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(x + 2, y + 0.8, 5, 0.5);
    fillRR(ctx, x + 3, y + 3.5, 1.2, 3, 0.5, '#ff8ad0'); fillRR(ctx, x + 11.8, y + 3.5, 1.2, 3, 0.5, '#ff8ad0');
  }
  // Ice: polished glass block, cool and very shiny.
  function ice(ctx, x, y, e) {
    ctx.fillStyle = lin(ctx, x, y, x + 16, y + 16, [[0, '#e8fbff'], [0.5, '#9fdcff'], [1, '#6a8ae8']]); ctx.fillRect(x, y, 16, 16);
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.moveTo(x + 2, y + 13); ctx.lineTo(x + 9, y + 2); ctx.lineTo(x + 11, y + 2); ctx.lineTo(x + 4, y + 13); ctx.fill();
    if (e.t) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, 16, 1.5); }
    ctx.fillStyle = 'rgba(40,30,120,0.4)'; if (e.b) ctx.fillRect(x, y + 15.3, 16, 0.7); if (e.l) ctx.fillRect(x, y, 0.7, 16); if (e.r) ctx.fillRect(x + 15.3, y, 0.7, 16);
  }

  const base = {
    signBoard: '#fff4ff', signInk: '#6a2a9a', signPost: '#5ad8d0', signShade: '#e8c8f4',
    zone: { gravity: '#5af0ff', reverse: '#ffe05a' },
    spike, door, spring, sign,
  };

  // =====================================================================================
  // 1. VAPOR PLAZA: sunset over a grid sea, marble columns, busts, palms and chrome orbs.
  // =====================================================================================
  KF.Themes.add('vapor_plaza', Object.assign({}, base, {
    id: 'vapor_plaza', title: 'VAPOR PLAZA', name: 'VAPOR PLAZA', bg: '#1a0a3a',
    build() {
      this.sky = sky([[0, '#140838'], [0.35, '#4a1466'], [0.62, '#c0347c'], [0.82, '#ff7a6a'], [1, '#ffc07a']], 132);
      const s = this.sky.getContext('2d');
      stars(s, 40, 4, 60);
      sun(s, VW / 2, 112, 38);
      // Far: mountain ridge, filled gradient with glowing cyan wire edges.
      this.far = KF.makeHi(640, VH, HI()); const f = this.far.getContext('2d'), rnd = U.rng(31);
      const pk = []; for (let x = 0; x <= 640; x += 32) pk.push([x, 131 - 8 - rnd() * 30]); pk[pk.length - 1][1] = pk[0][1];
      f.beginPath(); f.moveTo(0, 132); pk.forEach(([x, y]) => f.lineTo(x, y)); f.lineTo(640, 132); f.closePath();
      f.fillStyle = lin(f, 0, 95, 0, 132, [[0, '#4a1a6a'], [1, '#1a0634']]); f.fill();
      f.strokeStyle = 'rgba(90,240,255,0.8)'; f.lineWidth = 0.6; f.beginPath();
      for (let i = 0; i < pk.length - 1; i++) { const [a, b] = pk[i], [c, d] = pk[i + 1]; f.moveTo(a, b); f.lineTo(c, d); f.moveTo(a, b); f.lineTo((a + c) / 2, 132); f.lineTo(c, d); }
      f.stroke();
      // Mid: plinths, columns, busts and palms on a marble terrace.
      this.mid = KF.makeHi(768, VH, HI()); const m = this.mid.getContext('2d');
      m.fillStyle = lin(m, 0, 148, 0, 158, [[0, '#f2d4ee'], [1, '#a676c0']]); m.fillRect(0, 150, 768, 8);
      for (let x = 24; x < 768; x += 72) {
        const r = rnd();
        if (r < 0.35) column(m, x, 88 + rnd() * 10, 62);
        else if (r < 0.65) { fillRR(m, x - 10, 136, 20, 14, 1, lin(m, x - 10, 0, x + 10, 0, [[0, '#fff0ff'], [1, '#a47ac4']])); bust(m, x, 136, 1); }
        else palm(m, x, 150, 52);
      }
    },
    background(ctx, cam, t, mood) {
      KF.blit(ctx, this.sky, 0, 0);
      if (mood.cheer > 0.05) { ctx.globalAlpha = Math.min(0.3, mood.cheer * 0.2); ctx.fillStyle = '#ffe86a'; ctx.fillRect(0, 0, VW, 132); ctx.globalAlpha = 1; }
      tiled(ctx, this.far, cam.x, 0.06);
      // Floating chrome orbs and an old-OS window drifting across the sky.
      for (let i = 0; i < 3; i++) chromeBall(ctx, wrapX(80 + i * 190, cam.x, 0.1, 560) + 24, 38 + i * 14 + Math.sin(t * 0.9 + i * 2) * 4, 5 + i * 1.5);
      osWindow(ctx, Math.round(wrapX(330, cam.x, 0.12, 620)) + 24, 22 + Math.sin(t * 0.7) * 3, 74, 46, 'PARADISE.EXE');
      grid(ctx, 131, cam.x, t, mood.cheer > 0.5 ? '#ffe86a' : '#ff3ad0', 'rgba(255,190,235,0.9)');
      tiled(ctx, this.mid, cam.x, 0.3, 4);
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid') marble(ctx, x, y, e, seed, [[0, '#ffd8ec'], [1, '#e8a6d2']], 'rgba(170,80,160,0.45)', '#7af0e8', '#d8fffb');
      else if (art === 'alt') marble(ctx, x, y, e, seed, [[0, '#8ef0ea'], [1, '#3ab0b8']], 'rgba(20,110,120,0.5)', '#ffb0e0', '#fff0fa');
      else if (art === 'ice') ice(ctx, x, y, e);
      else glass(ctx, x, y);
    },
  }));

  // =====================================================================================
  // 2. NEON MALL: a closed shopping mall at night. Skylights, neon tubes, a fountain, palms.
  // =====================================================================================
  const STORES = ['FOOD COURT', 'MUSIC', 'CYBER CAFE', 'VIDEO', 'PERFUME', 'ARCADE'];
  KF.Themes.add('vapor_neon', Object.assign({}, base, {
    id: 'vapor_neon', title: 'NEON MALL', name: 'NEON MALL', bg: '#120626', signShade: '#c8e8f4',
    build() {
      this.sky = sky([[0, '#0c0420'], [0.5, '#2a0c4e'], [1, '#4a1a6a']]);
      const s = this.sky.getContext('2d');
      // Skylight: a glass barrel vault with ribs and a moon behind it.
      s.fillStyle = rad(s, 250, 30, 2, 26, [[0, '#fff4ff'], [0.4, 'rgba(255,220,255,0.6)'], [1, 'rgba(255,200,255,0)']]); s.beginPath(); s.arc(250, 30, 26, 0, 7); s.fill();
      s.fillStyle = '#fbeeff'; s.beginPath(); s.arc(250, 30, 7, 0, 7); s.fill();
      s.strokeStyle = 'rgba(160,120,220,0.55)'; s.lineWidth = 1;
      for (let x = -10; x < VW + 20; x += 24) { s.beginPath(); s.moveTo(x, 0); s.quadraticCurveTo(x + 12, 34, x + 6, 56); s.stroke(); }
      s.lineWidth = 2; s.beginPath(); s.moveTo(0, 56); s.lineTo(VW, 56); s.stroke();
      // Far: two storeys of shopfronts with glowing neon names (baked glow).
      this.far = KF.makeHi(720, VH, HI()); const f = this.far.getContext('2d');
      const neon = (x, y, text, col) => {
        f.save(); f.shadowColor = col; f.shadowBlur = 6; F.draw(f, text, x, y, col, 1, 'center'); f.restore();
        F.draw(f, text, x, y, '#ffffff', 1, 'center');
      };
      for (let st = 0; st < 2; st++) {
        const y = 62 + st * 46;
        f.fillStyle = lin(f, 0, y, 0, y + 40, [[0, '#2c1048'], [1, '#1a0832']]); f.fillRect(0, y, 720, 40);
        for (let i = 0; i < 6; i++) {
          const x = i * 120 + 10;
          f.fillStyle = lin(f, 0, y + 10, 0, y + 38, [[0, 'rgba(120,220,255,0.35)'], [1, 'rgba(255,120,220,0.2)']]); f.fillRect(x, y + 12, 100, 26);
          f.strokeStyle = 'rgba(200,170,255,0.6)'; f.lineWidth = 0.6; for (let k = 1; k < 4; k++) { f.beginPath(); f.moveTo(x + k * 25, y + 12); f.lineTo(x + k * 25, y + 38); f.stroke(); }
          neon(x + 50, y + 2, STORES[(i + st * 3) % STORES.length], ['#ff5ad8', '#5af0ff', '#ffe86a'][(i + st) % 3]);
        }
        f.fillStyle = lin(f, 0, y + 38, 0, y + 42, [[0, '#f0d8ff'], [1, '#8a5ab0']]); f.fillRect(0, y + 38, 720, 4); // balcony rail
      }
      // Mid: fountain, escalator and potted palms on the ground floor.
      this.mid = KF.makeHi(800, VH, HI()); const m = this.mid.getContext('2d');
      for (let x = 40; x < 800; x += 200) {
        // escalator
        m.fillStyle = lin(m, x, 0, x + 60, 0, [[0, '#c8b8e8'], [1, '#6a5a9a']]); m.beginPath(); m.moveTo(x, 156); m.lineTo(x + 56, 112); m.lineTo(x + 64, 112); m.lineTo(x + 8, 156); m.fill();
        m.strokeStyle = '#ffffff'; m.lineWidth = 0.5; m.beginPath(); m.moveTo(x, 152); m.lineTo(x + 56, 108); m.stroke();
        // potted palm
        fillRR(m, x + 100, 144, 16, 12, 2, lin(m, x + 100, 0, x + 116, 0, [[0, '#fff4ff'], [1, '#b080c8']]));
        palm(m, x + 108, 145, 34, '#3a1a5a', '#1a5a6a');
      }
    },
    background(ctx, cam, t, mood) {
      KF.blit(ctx, this.sky, 0, 0);
      tiled(ctx, this.far, cam.x, 0.15, -4);
      // Glossy floor with blurred neon reflections.
      ctx.fillStyle = lin(ctx, 0, 150, 0, VH, [[0, '#3a1460'], [1, '#12042a']]); ctx.fillRect(0, 150, VW, VH - 150);
      for (let i = 0; i < 7; i++) {
        const x = wrapX(i * 110, cam.x, 0.15, 720) + 24;
        ctx.fillStyle = lin(ctx, 0, 152, 0, 200, [[0, ['rgba(255,90,216,0.35)', 'rgba(90,240,255,0.35)', 'rgba(255,232,106,0.3)'][i % 3]], [1, 'rgba(0,0,0,0)']]);
        ctx.fillRect(x - 20, 152, 40, 48);
      }
      tiled(ctx, this.mid, cam.x, 0.4, 0);
      // Fountain jets in front of the mid layer (cheer makes them leap).
      const jx = wrapX(330, cam.x, 0.4, 800) + 24, hh = 18 + mood.cheer * 16 + Math.sin(t * 6) * 2;
      fillRR(ctx, jx - 22, 148, 44, 8, 3, lin(ctx, 0, 148, 0, 156, [[0, '#f4e4ff'], [1, '#9a6ab8']]));
      ctx.strokeStyle = 'rgba(190,250,255,0.75)'; ctx.lineWidth = 1.2; ctx.beginPath();
      for (const d of [-1, 0, 1]) { ctx.moveTo(jx, 148); ctx.quadraticCurveTo(jx + d * 8, 148 - hh * 1.4, jx + d * 16, 148); }
      ctx.stroke();
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid') { // black and teal checker tile with a polished top
        ctx.fillStyle = lin(ctx, 0, y, 0, y + 16, [[0, '#2a1a4a'], [1, '#160a2c']]); ctx.fillRect(x, y, 16, 16);
        ctx.fillStyle = 'rgba(90,240,255,0.25)'; ctx.fillRect(x + ((x / 16 + y / 16) % 2 ? 0 : 8), y + 4, 8, 6); ctx.fillRect(x + ((x / 16 + y / 16) % 2 ? 8 : 0), y + 10, 8, 6);
        if (e.t) { ctx.fillStyle = lin(ctx, 0, y, 0, y + 4, [[0, '#ffffff'], [0.3, '#ff8ad8'], [1, '#8a2a9a']]); ctx.fillRect(x, y, 16, 4); }
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; if (e.l) ctx.fillRect(x, y, 0.7, 16); if (e.r) ctx.fillRect(x + 15.3, y, 0.7, 16); if (e.b) ctx.fillRect(x, y + 15.3, 16, 0.7);
      } else if (art === 'alt') { // neon-lit kiosk block
        fillRR(ctx, x + 0.3, y + 0.3, 15.4, 15.4, 1.5, lin(ctx, x, y, x + 16, y + 16, [[0, '#5af0ff'], [1, '#6a2ab8']]));
        ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 0.6; rr(ctx, x + 2, y + 2, 12, 12, 1); ctx.stroke();
        if (e.t) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, 16, 1); }
      } else if (art === 'ice') ice(ctx, x, y, e);
      else glass(ctx, x, y, '#ff9ad8', '#8a2a9a');
    },
  }));

  // =====================================================================================
  // 3. SUNSET MARINA: a pastel bay, dolphins leaping through the sun's reflection, yachts.
  // =====================================================================================
  KF.Themes.add('vapor_harbour', Object.assign({}, base, {
    id: 'vapor_harbour', title: 'SUNSET MARINA', name: 'SUNSET MARINA', bg: '#2a0c4a',
    build() {
      this.sky = sky([[0, '#2a1a6a'], [0.4, '#8a3a9a'], [0.75, '#ff8a9a'], [1, '#ffd29a']], 120);
      const s = this.sky.getContext('2d');
      sun(s, 270, 104, 30);
      // Soft clouds: overlapping ellipses with a pink underside.
      const rnd = U.rng(77);
      for (let i = 0; i < 6; i++) {
        const cx = rnd() * VW, cy = 18 + rnd() * 50, w = 30 + rnd() * 40;
        s.fillStyle = lin(s, 0, cy - 8, 0, cy + 6, [[0, 'rgba(255,240,255,0.9)'], [1, 'rgba(255,150,200,0.7)']]);
        for (let k = 0; k < 4; k++) { s.beginPath(); s.ellipse(cx + (k - 1.5) * w * 0.22, cy - (k % 2) * 3, w * 0.22, 6, 0, 0, 7); s.fill(); }
      }
      // Far: pastel towers across the bay.
      this.far = KF.makeHi(640, 124, HI()); const f = this.far.getContext('2d');
      for (let x = 0; x < 640;) {
        const w = 14 + rnd() * 18, h = 20 + rnd() * 50;
        f.fillStyle = lin(f, x, 0, x + w, 0, [[0, '#f0c8f0'], [1, '#9a6ac0']]); f.fillRect(x, 120 - h, w, h);
        f.fillStyle = 'rgba(90,230,240,0.55)'; for (let wy = 124 - h; wy < 116; wy += 4) f.fillRect(x + 2, wy, w - 4, 1.2);
        x += w + 2 + rnd() * 10;
      }
    },
    background(ctx, cam, t, mood) {
      KF.blit(ctx, this.sky, 0, 0);
      tiled(ctx, this.far, cam.x, 0.08, 0);
      // Sea: gradient with the sun's reflection broken into drifting bars.
      ctx.fillStyle = lin(ctx, 0, 120, 0, VH, [[0, '#ff9ab8'], [0.25, '#9a5ac8'], [1, '#2a1a6a']]); ctx.fillRect(0, 120, VW, VH - 120);
      for (let k = 0; k < 12; k++) {
        const y = 123 + k * 7 + k * k * 0.3, w = 10 + k * 5 + Math.sin(t * 2 + k) * 4;
        ctx.fillStyle = `rgba(255,236,160,${0.75 - k * 0.05})`;
        fillRR(ctx, 270 - w / 2 + Math.sin(t * 1.3 + k * 1.7) * 3, y, w, 1.4, 0.7, ctx.fillStyle);
      }
      // Yachts drifting on the far water.
      for (let i = 0; i < 2; i++) {
        const x = wrapX(140 + i * 260, cam.x + t * 6, 0.2, 520) + 24, y = 128 + i * 4;
        ctx.fillStyle = '#fff4ff'; ctx.beginPath(); ctx.moveTo(x - 14, y); ctx.lineTo(x + 14, y); ctx.lineTo(x + 10, y + 4); ctx.lineTo(x - 11, y + 4); ctx.fill();
        ctx.fillStyle = lin(ctx, x, y - 20, x + 10, y, [[0, '#ffffff'], [1, '#ffb0e0']]); ctx.beginPath(); ctx.moveTo(x, y - 1); ctx.lineTo(x, y - 22); ctx.lineTo(x + 10, y - 1); ctx.fill();
      }
      // Dolphins leaping in arcs (higher when the crowd cheers).
      for (let i = 0; i < 3; i++) {
        const p = ((t * 0.45 + i * 0.37) % 1), x0 = wrapX(60 + i * 150, cam.x, 0.3, 480) + 24;
        if (p > 0.6) continue;
        const q = p / 0.6, x = x0 + q * 40, y = 150 - Math.sin(q * Math.PI) * (22 + mood.cheer * 14), ang = Math.cos(q * Math.PI) * -0.9;
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
        ctx.fillStyle = lin(ctx, 0, -4, 0, 4, [[0, '#9ad8ff'], [1, '#4a6ab8']]);
        ctx.beginPath(); ctx.moveTo(-9, 0); ctx.quadraticCurveTo(0, -6, 9, -1); ctx.quadraticCurveTo(0, 3, -9, 0); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-1, -3.5); ctx.lineTo(1, -7); ctx.lineTo(2.5, -3); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-12, -3); ctx.lineTo(-11, 2.5); ctx.fill();
        ctx.restore();
      }
      // Palm silhouettes on the near shore.
      for (let i = 0; i < 3; i++) palm(ctx, wrapX(30 + i * 170, cam.x, 0.5, 510) + 24, 170, 60, '#3a1450', '#2a1a5a');
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid') { // pastel stucco pier with a white deck and teal glass rail
        ctx.fillStyle = lin(ctx, 0, y, 0, y + 16, [[0, '#ffe0ec'], [1, '#f0a8c8']]); ctx.fillRect(x, y, 16, 16);
        ctx.fillStyle = 'rgba(190,100,150,0.25)'; ctx.fillRect(x, y + 10 + (seed * 4 | 0), 16, 0.6);
        if (e.t) {
          ctx.fillStyle = lin(ctx, 0, y, 0, y + 4, [[0, '#ffffff'], [1, '#d8d0f0']]); ctx.fillRect(x, y, 16, 4);
          ctx.fillStyle = 'rgba(122,240,232,0.85)'; ctx.fillRect(x, y + 4, 16, 1);
        }
        ctx.fillStyle = 'rgba(60,20,80,0.4)'; if (e.l) ctx.fillRect(x, y, 0.7, 16); if (e.r) ctx.fillRect(x + 15.3, y, 0.7, 16); if (e.b) ctx.fillRect(x, y + 15.3, 16, 0.7);
      } else if (art === 'alt') { // life-buoy crate
        fillRR(ctx, x + 0.3, y + 0.3, 15.4, 15.4, 1.2, lin(ctx, x, y, x + 16, y + 16, [[0, '#fff4ff'], [1, '#a8b8e8']]));
        ctx.lineWidth = 2.6; ctx.strokeStyle = '#ff5a9a'; ctx.beginPath(); ctx.arc(x + 8, y + 8, 4.5, 0, 7); ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.setLineDash([2.3, 2.4]); ctx.beginPath(); ctx.arc(x + 8, y + 8, 4.5, 0, 7); ctx.stroke(); ctx.setLineDash([]);
        if (e.t) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, 16, 1); }
      } else if (art === 'ice') ice(ctx, x, y, e);
      else glass(ctx, x, y);
    },
  }));

  // =====================================================================================
  // 4. DREAM EXPRESS: night run on a pastel bullet train under a big moon and OS clouds.
  // =====================================================================================
  KF.Themes.add('vapor_train', Object.assign({}, base, {
    id: 'vapor_train', title: 'DREAM EXPRESS', name: 'DREAM EXPRESS', bg: '#0e0626', signShade: '#d8d0f8',
    build() {
      this.sky = sky([[0, '#06021a'], [0.5, '#2a0c52'], [0.85, '#7a2a7a'], [1, '#c0508a']], 150);
      const s = this.sky.getContext('2d');
      stars(s, 90, 9, 110);
      s.fillStyle = rad(s, 300, 46, 10, 40, [[0, 'rgba(255,240,255,0.6)'], [1, 'rgba(255,200,255,0)']]); s.beginPath(); s.arc(300, 46, 40, 0, 7); s.fill();
      s.fillStyle = lin(s, 285, 30, 315, 62, [[0, '#ffffff'], [1, '#e0c8ff']]); s.beginPath(); s.arc(300, 46, 15, 0, 7); s.fill();
      // Far: a skyline of glowing pastel towers.
      this.far = KF.makeHi(640, VH, HI()); const f = this.far.getContext('2d'), rnd = U.rng(5);
      for (let x = 0; x < 640;) {
        const w = 16 + rnd() * 24, h = 30 + rnd() * 70, top = 150 - h;
        f.fillStyle = lin(f, 0, top, 0, 150, [[0, '#4a2a7a'], [1, '#1a0a3a']]); f.fillRect(x, top, w, h);
        f.fillStyle = 'rgba(255,170,230,0.6)'; for (let wy = top + 4; wy < 146; wy += 5) for (let wx = x + 3; wx < x + w - 3; wx += 5) if (rnd() < 0.3) f.fillRect(wx, wy, 2, 2);
        if (rnd() < 0.4) { f.fillStyle = '#5af0ff'; f.fillRect(x + w / 2 - 0.5, top - 8, 1, 8); }
        x += w + rnd() * 6;
      }
      // Mid: the elevated track's pillars, baked once.
      this.mid = KF.makeHi(240, VH, HI()); const m = this.mid.getContext('2d');
      for (let x = 10; x < 240; x += 80) { m.fillStyle = lin(m, x, 0, x + 12, 0, [[0, '#e8d8ff'], [1, '#6a4a9a']]); m.fillRect(x, 160, 12, 60); }
      m.fillStyle = lin(m, 0, 154, 0, 162, [[0, '#ffffff'], [1, '#8a6ab8']]); m.fillRect(0, 154, 240, 6);
    },
    background(ctx, cam, t, mood) {
      KF.blit(ctx, this.sky, 0, 0);
      // OS-style clouds sliding by.
      for (let i = 0; i < 2; i++) osWindow(ctx, Math.round(wrapX(60 + i * 300, cam.x + t * 10, 0.1, 600)) + 24, 30 + i * 22, 56, 34, i ? 'DREAM.EXE' : 'SLEEP.EXE');
      tiled(ctx, this.far, cam.x, 0.12, 0);
      ctx.fillStyle = lin(ctx, 0, 150, 0, VH, [[0, '#2a0c4a'], [1, '#0c0420']]); ctx.fillRect(0, 150, VW, VH - 150);
      // A second train racing past on the far track, faster when the crowd cheers.
      const tx = ((t * (90 + mood.cheer * 120) - cam.x * 0.25) % 900 + 900) % 900 - 300;
      for (let c = 0; c < 3; c++) {
        const x = tx + c * 92;
        fillRR(ctx, x, 140, 88, 12, c === 0 ? [8, 2, 2, 8] : 2, lin(ctx, 0, 140, 0, 152, [[0, '#ffffff'], [0.5, '#e8d0f4'], [1, '#a07ac8']]));
        ctx.fillStyle = 'rgba(90,230,240,0.85)'; ctx.fillRect(x + 8, 143, 74, 3);
        ctx.fillStyle = '#ff7ac8'; ctx.fillRect(x + 4, 148, 80, 1.2);
      }
      tiled(ctx, this.mid, cam.x, 0.45, 0);
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid') { // glossy pastel train roof with a window strip on the side
        ctx.fillStyle = lin(ctx, 0, y, 0, y + 16, [[0, '#f4e8ff'], [1, '#b49ad8']]); ctx.fillRect(x, y, 16, 16);
        if (!e.t) { ctx.fillStyle = 'rgba(90,220,240,0.55)'; fillRR(ctx, x + 2, y + 5, 12, 5, 1.2, ctx.fillStyle); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(x + 3, y + 5.6, 4, 0.6); }
        if (e.t) {
          ctx.fillStyle = lin(ctx, 0, y, 0, y + 5, [[0, '#ffffff'], [0.4, '#ffd0ec'], [1, '#c87ab8']]); ctx.fillRect(x, y, 16, 5);
          ctx.fillStyle = '#ff6ac0'; ctx.fillRect(x, y + 5, 16, 0.9);
        }
        ctx.fillStyle = 'rgba(50,20,90,0.45)'; if (e.l) ctx.fillRect(x, y, 0.7, 16); if (e.r) ctx.fillRect(x + 15.3, y, 0.7, 16); if (e.b) ctx.fillRect(x, y + 15.3, 16, 0.7);
      } else if (art === 'alt') { // chrome luggage case
        fillRR(ctx, x + 0.5, y + 2, 15, 14, 2, lin(ctx, x, y, x + 16, y + 16, [[0, '#ffffff'], [0.45, '#b8a8e0'], [1, '#5a4a8a']]));
        fillRR(ctx, x + 5, y + 0.3, 6, 2.5, 1, '#8a7ab8');
        ctx.fillStyle = '#ff8ad0'; ctx.fillRect(x + 0.5, y + 8, 15, 1.2);
      } else if (art === 'ice') ice(ctx, x, y, e);
      else glass(ctx, x, y, '#c8b0ff', '#6a4ab8');
    },
  }));

  // ---------- the style, smooth ----------
  // Glow is baked into the places (sun halos, neon shadows) rather than done as a full-screen bloom
  // pass each frame, which costs more than the whole scene in software rendering. On top: fine
  // scanlines and a soft magenta vignette.
  let lines = null;
  const vapor = KF.Styles.all.vaporwave;
  Object.assign(vapor, {
    smooth: true, vecLook: 'gloss', compose: null, under: null,
    overlay(ctx) {
      if (!lines) { lines = KF.makeHi(4, 4, KF.HI_MAX); const l = lines.getContext('2d'); l.fillStyle = 'rgba(40,0,60,0.18)'; l.fillRect(0, 0, 4, 0.7); l.fillRect(0, 2, 4, 0.7); }
      ctx.save(); ctx.fillStyle = ctx.createPattern(lines, 'repeat'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height); ctx.restore();
      ctx.save();
      ctx.fillStyle = rad(ctx, VW / 2, VH / 2, VH * 0.45, VW * 0.65, [[0, 'rgba(255,90,200,0)'], [1, 'rgba(120,30,140,0.35)']]); ctx.fillRect(0, 0, VW, VH);
      ctx.restore();
    },
  });
})(window.KF);
