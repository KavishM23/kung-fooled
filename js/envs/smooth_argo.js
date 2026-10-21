'use strict';
// Smooth (non-pixel) places for the AR GO realm (style 'pocket'): a phone-camera AR game.
// Each place is a soft, photo-like camera feed (baked once, with depth-of-field blur) and the
// stage itself is a set of glossy, rounded game pieces standing on a tilted plane in that feed,
// seen side-on: flat profile, but shaded to look like little 3D toys.
(function (KF) {
  const VW = KF.VIEW_W, VH = KF.VIEW_H, U = KF.util;
  const F = () => KF.Font;
  const TOP = 46; // where the AR plane meets the horizon

  // ---------- small drawing helpers ----------
  const lin = (ctx, x0, y0, x1, y1, stops) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([p, c]) => g.addColorStop(p, c)); return g; };
  const rad = (ctx, x, y, r0, r1, stops) => { const g = ctx.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([p, c]) => g.addColorStop(p, c)); return g; };
  const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
  const disc = (ctx, x, y, r, fill) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
  const ellipse = (ctx, x, y, rx, ry, fill) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); };

  // ---------- camera feeds ----------
  // A wide, soft "photo" of each real place, panned as you walk. Built from gradients and shapes,
  // then blurred a little (the phone focuses on the AR pieces, not the street behind them).
  const FEED_W = VW * 2.5;
  const feeds = {};
  function bakeFeed(id, paint) {
    if (feeds[id]) return feeds[id];
    const res = KF.HI_MAX;
    const sharp = KF.makeHi(FEED_W, VH, res), sx = sharp.getContext('2d');
    sx.imageSmoothingEnabled = true;
    paint(sx, U.rng(id.length * 97 + 13));
    const out = KF.makeHi(FEED_W, VH, res), ox = out.getContext('2d');
    ox.setTransform(1, 0, 0, 1, 0, 0);
    ox.filter = `blur(${(1.1 * res).toFixed(1)}px) saturate(1.08)`;
    ox.drawImage(sharp, 0, 0);
    ox.filter = 'none';
    ox.setTransform(res, 0, 0, res, 0, 0);
    // soft vignette of a phone lens
    ox.fillStyle = rad(ox, FEED_W / 2, VH * 0.45, VH * 0.4, FEED_W * 0.6, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.22)']]);
    ox.fillRect(0, 0, FEED_W, VH);
    feeds[id] = out;
    return out;
  }
  // Ground in perspective: a gradient floor with converging joints, like paving seen from eye level.
  function floor(x, top, c0, c1, joint, every = 26) {
    x.fillStyle = lin(x, 0, top, 0, VH, [[0, c0], [1, c1]]); x.fillRect(0, top, FEED_W, VH - top);
    x.strokeStyle = joint; x.lineWidth = 0.6; x.beginPath();
    for (let k = 1; k < 10; k++) { const y = top + Math.pow(k / 9, 1.7) * (VH - top); x.moveTo(0, y); x.lineTo(FEED_W, y); }
    for (let k = -40; k < 60; k++) { x.moveTo(FEED_W / 2 + k * every * 0.25, top); x.lineTo(FEED_W / 2 + k * every * 1.6, VH); }
    x.stroke();
  }
  function sky(x, top, a, b, c) { x.fillStyle = lin(x, 0, 0, 0, top, [[0, a], [0.7, b], [1, c]]); x.fillRect(0, 0, FEED_W, top + 1); }
  function clouds(x, rnd, n, y0, y1) {
    for (let k = 0; k < n; k++) {
      const cx = rnd() * FEED_W, cy = y0 + rnd() * (y1 - y0), w = 30 + rnd() * 50;
      for (let j = 0; j < 4; j++) ellipse(x, cx + (j - 1.5) * w * 0.25, cy - (j % 2) * 3, w * 0.28, 6 + rnd() * 3, 'rgba(255,255,255,0.75)');
    }
  }

  const FEEDS = {
    argo_promenade(x, rnd) {
      sky(x, TOP, '#7fb4e0', '#bcd8ec', '#e8eef0');
      clouds(x, rnd, 10, 6, 26);
      // the sea, a far shore and a pier with a ferris wheel
      x.fillStyle = lin(x, 0, 30, 0, TOP, [[0, '#4a8ab8'], [1, '#6aa8c8']]); x.fillRect(0, 30, FEED_W, TOP - 30);
      for (let k = 0; k < 60; k++) { x.fillStyle = 'rgba(255,255,255,0.45)'; x.fillRect(rnd() * FEED_W, 31 + rnd() * 14, 4 + rnd() * 8, 0.6); }
      x.fillStyle = 'rgba(90,110,130,0.55)'; x.beginPath(); x.moveTo(0, 31); for (let k = 0; k <= 20; k++) x.lineTo(k * FEED_W / 20, 30 - Math.sin(k * 1.3) * 2 - 2); x.lineTo(FEED_W, 31); x.fill();
      const wx = 620, wy = 18;
      x.strokeStyle = 'rgba(240,240,250,0.85)'; x.lineWidth = 1; x.beginPath(); x.arc(wx, wy, 13, 0, Math.PI * 2); x.stroke();
      for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; x.beginPath(); x.moveTo(wx, wy); x.lineTo(wx + Math.cos(a) * 13, wy + Math.sin(a) * 13); x.stroke(); disc(x, wx + Math.cos(a) * 13, wy + Math.sin(a) * 13, 1.4, ['#ff6a7a', '#ffd04a', '#5ac8ff'][k % 3]); }
      x.fillStyle = '#c8ccd4'; x.fillRect(560, 32, 120, 2); for (let k = 0; k < 7; k++) x.fillRect(566 + k * 18, 34, 1.5, 8);
      // railing along the promenade
      x.fillStyle = '#e8ecf0'; x.fillRect(0, TOP - 6, FEED_W, 1.5); x.fillRect(0, TOP - 1.5, FEED_W, 1.5);
      for (let px = 0; px < FEED_W; px += 9) x.fillRect(px, TOP - 6, 1, 5);
      floor(x, TOP, '#d8ccb8', '#a8987e', 'rgba(90,70,50,0.25)');
      // lamp posts and a bench, far away
      for (let px = 40; px < FEED_W; px += 150) { x.fillStyle = '#3a4048'; x.fillRect(px, 8, 1.6, TOP - 8); disc(x, px + 0.8, 8, 2.4, '#fff8dc'); }
      x.fillStyle = '#7a5a3a'; rr(x, 210, TOP + 2, 30, 3, 1); x.fill(); rr(x, 210, TOP - 2, 30, 2, 1); x.fill();
    },
    argo_sakura(x, rnd) {
      sky(x, TOP, '#9cc8ec', '#d8e6f2', '#f4eef2');
      clouds(x, rnd, 8, 5, 22);
      // distant city haze and a hill
      for (let k = 0; k < 30; k++) { const w = 14 + rnd() * 26, h = 6 + rnd() * 16; x.fillStyle = `rgba(150,160,185,${0.35 + rnd() * 0.2})`; x.fillRect(k * FEED_W / 30, 30 - h, w, h + 4); }
      x.fillStyle = '#9ab88a'; x.beginPath(); x.moveTo(0, 34); for (let k = 0; k <= 30; k++) x.lineTo(k * FEED_W / 30, 30 + Math.sin(k * 0.7) * 3); x.lineTo(FEED_W, TOP); x.lineTo(0, TOP); x.fill();
      // rows of cherry trees: round blossom clouds on dark trunks
      for (let row = 0; row < 2; row++) for (let k = 0; k < 18; k++) {
        const tx = k * 54 + row * 27 + rnd() * 12, ty = 26 + row * 8, s = 1 - row * 0.25;
        x.fillStyle = '#5a3a30'; x.fillRect(tx - 1, ty, 2 * s + 0.5, 14 * s);
        for (let j = 0; j < 6; j++) {
          const bx = tx + (rnd() - 0.5) * 22 * s, by = ty - 2 + (rnd() - 0.5) * 10 * s, r = (7 + rnd() * 5) * s;
          disc(x, bx, by, r, rad(x, bx - r * 0.3, by - r * 0.3, 0, r, [[0, '#ffeef4'], [0.6, '#ffc0d4'], [1, '#f090b0']]));
        }
      }
      floor(x, TOP, '#a8c88a', '#6a9a5a', 'rgba(40,70,30,0.12)', 40);
      // a gravel path and petals drifting on the lawn
      x.fillStyle = 'rgba(230,214,180,0.7)'; x.beginPath(); x.moveTo(FEED_W / 2 - 20, TOP); x.lineTo(FEED_W / 2 + 20, TOP); x.lineTo(FEED_W / 2 + 160, VH); x.lineTo(FEED_W / 2 - 160, VH); x.fill();
      for (let k = 0; k < 120; k++) ellipse(x, rnd() * FEED_W, TOP + rnd() * (VH - TOP), 1.2, 0.7, 'rgba(255,200,220,0.8)');
    },
    argo_harbour(x, rnd) {
      sky(x, TOP, '#f0b480', '#f4cca0', '#f8e0c0'); // golden hour
      disc(x, 480, 26, 10, rad(x, 480, 26, 0, 22, [[0, '#fff6d8'], [0.5, '#ffe0a0'], [1, 'rgba(255,200,120,0)']]));
      // cranes and stacked containers, far away
      const cols = ['#c84a3a', '#2a6aa8', '#e0a030', '#3a8a5a', '#8a4a9a', '#d8d8d8'];
      for (let k = 0; k < 26; k++) {
        const bx = k * 38 + rnd() * 10, stack = 1 + Math.floor(rnd() * 3);
        for (let j = 0; j < stack; j++) { x.fillStyle = cols[Math.floor(rnd() * cols.length)]; rr(x, bx, 34 - j * 5, 28, 4.6, 0.6); x.fill(); }
      }
      x.strokeStyle = '#4a3a3a'; x.lineWidth = 1.4;
      for (const cx of [140, 420, 760]) { x.beginPath(); x.moveTo(cx, 34); x.lineTo(cx, 4); x.lineTo(cx + 40, 6); x.moveTo(cx, 8); x.lineTo(cx - 14, 10); x.stroke(); x.beginPath(); x.moveTo(cx + 30, 6); x.lineTo(cx + 30, 20); x.stroke(); }
      // water with glints, then the concrete quay
      x.fillStyle = lin(x, 0, 36, 0, TOP, [[0, '#4a6a8a'], [1, '#6a8aa0']]); x.fillRect(0, 36, FEED_W, TOP - 36);
      for (let k = 0; k < 70; k++) { x.fillStyle = 'rgba(255,230,180,0.6)'; x.fillRect(rnd() * FEED_W, 37 + rnd() * 8, 3 + rnd() * 7, 0.6); }
      floor(x, TOP, '#b8b4ac', '#86827a', 'rgba(50,50,50,0.2)', 34);
      for (let px = 30; px < FEED_W; px += 120) { ellipse(x, px, TOP + 4, 4, 1.4, '#2a2a30'); x.fillStyle = '#3a3a42'; rr(x, px - 2.5, TOP - 2, 5, 6, 2); x.fill(); }
      x.fillStyle = 'rgba(230,200,60,0.8)'; x.fillRect(0, TOP + 1, FEED_W, 1.2);
    },
    argo_temple(x, rnd) {
      sky(x, TOP, '#a8c0d8', '#d8dccc', '#ece6d0');
      // misty mountains
      for (let L = 0; L < 3; L++) {
        x.fillStyle = ['rgba(150,165,180,0.55)', 'rgba(120,140,140,0.6)', 'rgba(90,115,100,0.75)'][L];
        x.beginPath(); x.moveTo(0, TOP);
        for (let k = 0; k <= 40; k++) x.lineTo(k * FEED_W / 40, 14 + L * 7 + Math.sin(k * (0.6 + L * 0.3) + L) * (8 - L * 2) + rnd() * 2);
        x.lineTo(FEED_W, TOP); x.fill();
      }
      // a pagoda and a torii among trees
      const px = 300, py = 36;
      for (let k = 0; k < 4; k++) { const w = 30 - k * 6, y = py - k * 6; x.fillStyle = '#5a3a2a'; x.fillRect(px - w / 2 + 3, y - 3, w - 6, 4); x.fillStyle = '#2a2a30'; x.beginPath(); x.moveTo(px - w / 2 - 3, y - 2); x.quadraticCurveTo(px, y - 6, px + w / 2 + 3, y - 2); x.lineTo(px + w / 2 - 2, y - 4); x.lineTo(px - w / 2 + 2, y - 4); x.fill(); }
      x.fillStyle = '#2a2a30'; x.fillRect(px - 0.5, py - 32, 1, 8);
      x.fillStyle = '#d03a2a'; x.fillRect(560, 22, 2, 22); x.fillRect(582, 22, 2, 22); x.fillRect(554, 22, 36, 2.5); x.fillRect(557, 27, 30, 1.6);
      for (let k = 0; k < 40; k++) { const tx = rnd() * FEED_W, r = 5 + rnd() * 6; disc(x, tx, 40 - rnd() * 4, r, `rgba(${50 + rnd() * 30},${90 + rnd() * 30},${60 + rnd() * 20},0.85)`); }
      floor(x, TOP, '#c8bca4', '#988c74', 'rgba(70,60,40,0.22)', 30);
      // stone lanterns along the approach
      for (let lx = 70; lx < FEED_W; lx += 170) { x.fillStyle = '#8a8478'; rr(x, lx - 2, TOP - 8, 4, 8, 1); x.fill(); rr(x, lx - 4, TOP - 11, 8, 3, 1); x.fill(); disc(x, lx, TOP - 6, 1, '#ffe8a0'); }
    },
  };

  // ---------- glossy game pieces ----------
  // Palettes per place: top (the walkable face), body, prop blocks, plank, and a hint colour.
  const PAL = {
    argo_promenade: { top: ['#7ae8ff', '#2ab4e8'], body: ['#3a8ad0', '#22508a'], alt: ['#ff8ad0', '#d0408a'], plank: ['#ffe6a8', '#d8a450'], mark: '#ffffff' },
    argo_sakura: { top: ['#9af07a', '#4ac04a'], body: ['#ffb4cc', '#d06a90'], alt: ['#ffe070', '#e0a020'], plank: ['#fff0f4', '#e8a8c0'], mark: '#ffffff' },
    argo_harbour: { top: ['#ffd27a', '#e89a2a'], body: ['#4a7ab8', '#2a4478'], alt: ['#ff7a6a', '#c8382a'], plank: ['#d8b088', '#9a6a40'], mark: '#fff4d8' },
    argo_temple: { top: ['#b8e88a', '#6aa84a'], body: ['#b8aca0', '#7a6e62'], alt: ['#ff7a5a', '#c83a2a'], plank: ['#e8c890', '#a87848'], mark: '#fffbe8' },
  };

  // One 16x16 tile of a rounded, glossy block. Only exposed corners are rounded, so neighbouring
  // tiles join into one smooth slab.
  function block(ctx, x, y, e, P, seed) {
    const r = 4.5, radii = [e.t && e.l ? r : 0, e.t && e.r ? r : 0, e.b && e.r ? r : 0, e.b && e.l ? r : 0];
    ctx.save();
    ctx.beginPath(); ctx.roundRect(x, y, 16, 16, radii); ctx.clip();
    // body: lighter just under the cap, one even tone further down (no banding between rows)
    ctx.fillStyle = e.t ? lin(ctx, 0, y, 0, y + 16, [[0, P.body[0]], [1, P.body[1]]]) : P.body[1];
    ctx.fillRect(x - 1, y - 1, 18, 18);
    // low-poly facets: two soft triangles per tile so big slabs don't look flat
    ctx.fillStyle = seed > 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
    ctx.beginPath(); ctx.moveTo(x, y + 16); ctx.lineTo(x + 16, y); ctx.lineTo(x + 16, y + 16); ctx.fill();
    // side shading: light from the upper left
    if (e.l) { ctx.fillStyle = lin(ctx, x, 0, x + 6, 0, [[0, 'rgba(255,255,255,0.35)'], [1, 'rgba(255,255,255,0)']]); ctx.fillRect(x, y, 6, 16); }
    if (e.r) { ctx.fillStyle = lin(ctx, x + 16, 0, x + 9, 0, [[0, 'rgba(0,0,30,0.35)'], [1, 'rgba(0,0,30,0)']]); ctx.fillRect(x + 9, y, 7, 16); }
    if (e.b) { ctx.fillStyle = lin(ctx, 0, y + 16, 0, y + 9, [[0, 'rgba(0,0,30,0.4)'], [1, 'rgba(0,0,30,0)']]); ctx.fillRect(x, y + 9, 16, 7); }
    if (e.t) { // the walkable cap: a bright rounded band with a specular streak
      ctx.fillStyle = lin(ctx, 0, y, 0, y + 6, [[0, P.top[0]], [1, P.top[1]]]); ctx.fillRect(x, y, 16, 6);
      ctx.fillStyle = 'rgba(0,0,40,0.25)'; ctx.fillRect(x, y + 6, 16, 1);
      ctx.fillStyle = 'rgba(255,255,255,0.75)'; rr(ctx, x + (e.l ? 3 : 0), y + 1.2, e.l || e.r ? 10 : 16, 1.3, 0.65); ctx.fill();
    }
    ctx.restore();
  }
  function propBox(ctx, x, y, e, P) { // a floating "?" item cube
    ctx.fillStyle = lin(ctx, x, y, x + 12, y + 16, [[0, P.alt[0]], [1, P.alt[1]]]);
    rr(ctx, x + 0.6, y + 0.6, 14.8, 14.8, 3.5); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; rr(ctx, x + 2.5, y + 2, 8, 2.2, 1.1); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; rr(ctx, x + 1, y + 12, 14, 3.2, 1.6); ctx.fill();
    ctx.fillStyle = P.mark; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('?', x + 8, y + 8.5);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }
  function plank(ctx, x, y, P) { // one-way: a thin glossy board
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; rr(ctx, x + 0.5, y + 2.5, 15, 3, 1.5); ctx.fill();
    ctx.fillStyle = lin(ctx, 0, y, 0, y + 4, [[0, P.plank[0]], [1, P.plank[1]]]); rr(ctx, x + 0.3, y, 15.4, 4, 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; rr(ctx, x + 2, y + 0.6, 12, 0.9, 0.45); ctx.fill();
  }
  function iceBlock(ctx, x, y, e) {
    const radii = [e.t && e.l ? 4 : 0, e.t && e.r ? 4 : 0, e.b && e.r ? 4 : 0, e.b && e.l ? 4 : 0];
    ctx.fillStyle = lin(ctx, x, y, x + 16, y + 16, [[0, 'rgba(220,250,255,0.95)'], [1, 'rgba(120,200,240,0.9)']]);
    ctx.beginPath(); ctx.roundRect(x, y, 16, 16, radii); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(x + 3, y + 12); ctx.lineTo(x + 9, y + 4); ctx.moveTo(x + 8, y + 13); ctx.lineTo(x + 13, y + 7); ctx.stroke();
    if (e.t) { ctx.fillStyle = 'rgba(255,255,255,0.9)'; rr(ctx, x + 1, y + 1, 14, 1.4, 0.7); ctx.fill(); }
  }

  // Spikes: glossy red cones, two per tile.
  function spike(ctx, x, y, dir) {
    ctx.save();
    ctx.translate(x + 8, y + 8);
    ctx.rotate({ up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 }[dir] || 0);
    for (const cx of [-4, 4]) {
      ctx.fillStyle = 'rgba(0,0,0,0.22)'; ellipse(ctx, cx, 7.5, 4, 1, 'rgba(0,0,0,0.22)');
      ctx.fillStyle = lin(ctx, cx - 4, 0, cx + 4, 0, [[0, '#ff8a7a'], [0.45, '#f0302a'], [1, '#9a1010']]);
      ctx.beginPath(); ctx.moveTo(cx - 3.8, 7.5); ctx.quadraticCurveTo(cx - 1, 0, cx, -6.5); ctx.quadraticCurveTo(cx + 1, 0, cx + 3.8, 7.5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ellipse(ctx, cx - 1.2, 1.5, 0.7, 3, 'rgba(255,255,255,0.7)');
    }
    ctx.restore();
  }
  // The exit: a glowing portal arch on a round pedestal (the real one has a beacon above it).
  function door(ctx, x, y, o = {}) {
    ctx.save();
    if (o.flipped) { ctx.translate(0, y * 2 + 32); ctx.scale(1, -1); }
    const t = o.t || 0, cx = x + 8;
    if (o.legs) { const k = Math.sin(o.legs * 12) * 2; ellipse(ctx, cx - 3 + k, y + 33, 2.5, 1.4, '#2a2a40'); ellipse(ctx, cx + 3 - k, y + 33, 2.5, 1.4, '#2a2a40'); }
    ellipse(ctx, cx, y + 31.5, 11, 2.6, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = lin(ctx, 0, y + 27, 0, y + 32, [[0, '#ffffff'], [1, '#a8b4c8']]); rr(ctx, x - 3, y + 27, 22, 4.5, 2.2); ctx.fill();
    // arch frame
    ctx.fillStyle = lin(ctx, x - 2, 0, x + 18, 0, [[0, '#6ad0ff'], [0.5, '#2a7ae0'], [1, '#1a3a90']]);
    ctx.beginPath(); ctx.moveTo(x - 2, y + 28); ctx.lineTo(x - 2, y + 8); ctx.arc(cx, y + 8, 10, Math.PI, 0); ctx.lineTo(x + 18, y + 28); ctx.closePath(); ctx.fill();
    // portal surface
    const open = o.open || 0, pulse = 0.5 + 0.5 * Math.sin(t * 4);
    ctx.fillStyle = rad(ctx, cx, y + 16, 1, 12, [[0, open ? '#ffffff' : '#e8faff'], [0.6, open ? '#fff0a0' : `rgba(120,220,255,${0.75 + pulse * 0.2})`], [1, 'rgba(40,120,220,0.9)']]);
    ctx.beginPath(); ctx.moveTo(x + 1.5, y + 28); ctx.lineTo(x + 1.5, y + 9); ctx.arc(cx, y + 9, 6.5, Math.PI, 0); ctx.lineTo(x + 14.5, y + 28); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; rr(ctx, x - 0.5, y + 6, 2, 16, 1); ctx.fill();
    if (o.lantern) { // floating beacon: a spinning gem
      const by = y - 8 + Math.sin(t * 3) * 1.5, w = 3.5 * Math.abs(Math.cos(t * 2.4)) + 0.6;
      ellipse(ctx, cx, y - 0.5, 4, 1, 'rgba(0,0,0,0.18)');
      ctx.fillStyle = rad(ctx, cx, by, 0, 10, [[0, 'rgba(255,240,120,0.55)'], [1, 'rgba(255,240,120,0)']]); ctx.fillRect(cx - 10, by - 10, 20, 20);
      ctx.fillStyle = lin(ctx, cx - w, 0, cx + w, 0, [[0, '#ffe060'], [1, '#e08a10']]);
      ctx.beginPath(); ctx.moveTo(cx, by - 5); ctx.lineTo(cx + w, by); ctx.lineTo(cx, by + 5); ctx.lineTo(cx - w, by); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  function spring(ctx, x, y, squash) { // a squishy jump pad
    const h = 6 - squash * 3.5, top = y + 16 - h;
    ellipse(ctx, x + 8, y + 16, 7.5, 1.6, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = lin(ctx, 0, top, 0, y + 16, [[0, '#7affc0'], [1, '#1aa070']]); rr(ctx, x + 1.5, top, 13, h, Math.min(3, h / 2)); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; rr(ctx, x + 3.5, top + 0.8, 7, 1.2, 0.6); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x + 8, top + 1.2); ctx.lineTo(x + 10.5, top + h * 0.6); ctx.lineTo(x + 5.5, top + h * 0.6); ctx.fill();
  }
  // Signs: a rounded white card on a stick, like an in-game tooltip.
  function sign(ctx, x, y, text) {
    const w = F().measure(text) + 10, bx = Math.round(x - w / 2), by = Math.round(y);
    ctx.fillStyle = '#c8d0e0'; rr(ctx, bx + w / 2 - 1, by + 10, 2, 8, 1); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,40,0.2)'; rr(ctx, bx + 0.5, by + 1.5, w, 11, 4); ctx.fill();
    ctx.fillStyle = lin(ctx, 0, by, 0, by + 11, [[0, '#ffffff'], [1, '#e6ecf6']]); rr(ctx, bx, by, w, 11, 4); ctx.fill();
    F().draw(ctx, text, bx + 5, by + 2, '#1a5ab0');
  }

  // ---------- the four places ----------
  const PLACES = { argo_promenade: 'SEASIDE PROMENADE', argo_sakura: 'SAKURA PARK', argo_harbour: 'THE HARBOUR', argo_temple: 'THE OLD TEMPLE' };
  for (const id in PLACES) {
    const P = PAL[id];
    KF.Themes.add(id, {
      id, title: PLACES[id], name: 'AR', bg: '#000000',
      signBoard: '#ffffff', signInk: '#1a5ab0', signPost: '#c8d0e0',
      zone: { gravity: '#7a6aff', reverse: '#ff5ac8' },
      feed: () => bakeFeed(id, FEEDS[id]),
      build() {},
      // The real place is the camera feed (drawn by the style's compose); the world canvas stays
      // transparent around the game pieces. Fights call this too, so it clears, never paints.
      background(ctx) { ctx.clearRect(0, 0, VW, VH); },
      tile(ctx, x, y, art, e, seed) {
        if (art === 'oneway') return plank(ctx, x, y, P);
        if (art === 'alt') return propBox(ctx, x, y, e, P);
        if (art === 'ice') return iceBlock(ctx, x, y, e);
        block(ctx, x, y, e, P, seed);
      },
      spike, door, spring, sign,
    });
  }

  // ---------- the style: smooth AR over a camera feed ----------
  const S = KF.Styles.all.pocket;
  const oldCompose = S.compose, oldOverlay = S.overlay;
  // AR critters bobbing in the air above the pieces, anchored to the world.
  function critters(ctx, camX, t, cheer) {
    for (let k = 0; k < 7; k++) {
      const wx = 150 + k * 260, x = wx - camX * 0.95, y = 58 + (k % 3) * 16;
      if (x < -30 || x > VW + 30) continue;
      const bob = Math.sin(t * 2.6 + k) * 3 - Math.abs(Math.sin(t * 12 + k)) * cheer * 8;
      ellipse(ctx, x, y + 26, 7, 1.8, 'rgba(0,0,40,0.18)');
      const c = ['#ffd040', '#ff8ab8', '#7af0a0', '#8ac8ff'][k % 4];
      if (k % 2) { // a round, smug critter with ears
        for (const s of [-1, 1]) { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x + s * 4.5, y - 7 + bob, 2.2, 4.2, s * 0.4, 0, Math.PI * 2); ctx.fill(); }
        disc(ctx, x, y + bob, 8, rad(ctx, x - 3, y - 3 + bob, 1, 9, [[0, '#ffffff'], [0.25, c], [1, 'rgba(0,0,0,0.15)']]));
        disc(ctx, x, y + bob, 8, 'rgba(0,0,0,0)');
        disc(ctx, x - 2.8, y - 1 + bob, 1.3, '#1a2030'); disc(ctx, x + 2.8, y - 1 + bob, 1.3, '#1a2030');
        ctx.strokeStyle = '#1a2030'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(x, y + 1.5 + bob, 2, 0.2, Math.PI - 0.2); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.9)'; rr(ctx, x - 13, y - 22 + bob, 26, 8, 4); ctx.fill();
        F().draw(ctx, 'CP ' + (100 + k * 37), x, y - 21 + bob, '#1a5ab0', 1, 'center');
      } else { // a map pin
        const py = y + bob;
        ctx.fillStyle = lin(ctx, x - 6, 0, x + 6, 0, [[0, '#7ae0ff'], [1, '#1a7ae0']]);
        ctx.beginPath(); ctx.arc(x, py, 6, Math.PI * 0.85, Math.PI * 2.15); ctx.lineTo(x, py + 12); ctx.closePath(); ctx.fill();
        disc(ctx, x, py, 2.4, '#ffffff');
      }
    }
  }
  Object.assign(S, {
    smooth: true, vecLook: 'toy',
    compose(ctx, wc, i) {
      const th = KF.Themes.has(i.themeId) && KF.Themes.get(i.themeId);
      if (!th || !th.feed) return oldCompose.call(this, ctx, wc, i); // the realm's own old AR place
      const res = wc.width / VW, feed = th.feed();
      // hand-held: the feed sways a little and pans as you walk
      const sway = Math.sin(i.t * 1.1) * 1.4, bobY = Math.sin(i.t * 1.7) * 0.7;
      const pan = U.clamp((i.player.worldX || 0) * 0.18, 0, FEED_W - VW - 8);
      ctx.save(); ctx.imageSmoothingEnabled = true; ctx.translate(sway - 4, bobY - 2);
      ctx.drawImage(feed, pan * feed.res, 0, (VW + 8) * feed.res, (VH + 4) * feed.res, 0, 0, VW + 8, VH + 4);
      ctx.restore();
      // critters live in the world canvas, so they tilt with the plane
      const w = wc.getContext('2d'), camX = (i.player.worldX || 0) + 5 - i.player.x;
      w.save(); w.setTransform(res, 0, 0, res, 0, 0); w.imageSmoothingEnabled = true;
      critters(w, camX, i.t, (KF.engine.scene && KF.engine.scene.mood && KF.engine.scene.mood.cheer) || 0);
      w.restore();
      // a soft shadow where the AR plane meets the real ground
      ctx.fillStyle = lin(ctx, 0, TOP, 0, TOP + 14, [[0, 'rgba(0,10,30,0.18)'], [1, 'rgba(0,10,30,0)']]); ctx.fillRect(0, TOP, VW, 14);
      // the stage as a tilted plane, drawn one real pixel row at a time
      ctx.save(); ctx.imageSmoothingEnabled = true;
      const step = 1 / res;
      for (let y = TOP; y < VH; y += step) {
        const tt = (y - TOP) / (VH - TOP), sy = VH * (1 - Math.pow(1 - tt, 1.7)), s = U.lerp(0.6, 1.1, tt);
        ctx.drawImage(wc, 0, Math.floor(sy * res), wc.width, 1, VW / 2 - VW * s / 2 + sway * 0.6, y, VW * s, step + 0.02);
      }
      ctx.restore();
    },
    overlay(ctx, i) {
      const th = KF.Themes.has(i.themeId) && KF.Themes.get(i.themeId);
      if (!th || !th.feed) return oldOverlay.call(this, ctx, i);
      // phone bezel: thin, rounded, with a soft inner shadow
      ctx.save();
      ctx.strokeStyle = '#0c0e14'; ctx.lineWidth = 6; rr(ctx, 0, 0, VW, VH, 16); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 0.6; rr(ctx, 3.2, 3.2, VW - 6.4, VH - 6.4, 13); ctx.stroke();
      if (i.fight) { // fights have their own meters along the bottom: keep the phone frame only
        ctx.restore();
        return;
      }
      // bottom bar: a frosted pill with steps, the throw ball and AR status
      const by = VH - 22;
      ctx.fillStyle = 'rgba(255,255,255,0.72)'; rr(ctx, 12, by, 96, 14, 7); ctx.fill();
      F().draw(ctx, `STEPS ${Math.max(0, Math.floor((i.player.worldX || 0) / 8))}`, 20, by + 4, '#1a3a6a');
      ctx.fillStyle = 'rgba(255,255,255,0.72)'; rr(ctx, VW - 70, by, 58, 14, 7); ctx.fill();
      disc(ctx, VW - 61, by + 7, 2.6, '#2ac85a');
      F().draw(ctx, 'AR ON', VW - 20, by + 4, '#1a3a6a', 1, 'right');
      // the ball button
      // the ball button: small and see-through, since pits and spikes live down here too
      const bx = VW / 2, bcy = VH - 14, br = 7;
      ctx.globalAlpha = 0.7;
      disc(ctx, bx, bcy + 1, br, 'rgba(0,0,30,0.25)');
      ctx.fillStyle = lin(ctx, 0, bcy - br, 0, bcy, [[0, '#ff7a6a'], [1, '#d82828']]); ctx.beginPath(); ctx.arc(bx, bcy, br, Math.PI, 0); ctx.fill();
      ctx.fillStyle = lin(ctx, 0, bcy, 0, bcy + br, [[0, '#ffffff'], [1, '#d8dce6']]); ctx.beginPath(); ctx.arc(bx, bcy, br, 0, Math.PI); ctx.fill();
      ctx.fillStyle = '#1a1e2a'; ctx.fillRect(bx - br, bcy - 0.7, br * 2, 1.4);
      disc(ctx, bx, bcy, 2.4, '#1a1e2a'); disc(ctx, bx, bcy, 1.5, '#ffffff');
      ctx.globalAlpha = 1;
      // focus brackets in the middle of the screen
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 0.8; ctx.lineCap = 'round';
      const fx = VW / 2, fy = VH / 2 + 6, q = 12, l = 4;
      ctx.beginPath();
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { ctx.moveTo(fx + sx * q, fy + sy * (q - l)); ctx.lineTo(fx + sx * q, fy + sy * q); ctx.lineTo(fx + sx * (q - l), fy + sy * q); }
      ctx.stroke();
      ctx.restore();
    },
  });
})(window.KF);
