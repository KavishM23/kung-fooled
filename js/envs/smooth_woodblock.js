'use strict';
// Smooth (non-pixel) places for the WOODBLOCK realm: four ukiyo-e prints in the manner of
// Hokusai and Hiroshige. Flat fields of a limited print palette, tapering sumi key-block lines,
// bokashi (graded) skies and water, kasumi mist bands for depth. Everything is paths and
// gradients, so it stays crisp at any resolution.
(function (KF) {
  const VW = KF.VIEW_W, VH = KF.VIEW_H, U = KF.util, T = KF.TILE;
  const TAU = Math.PI * 2;

  // ---------- print palette ----------
  const P = {
    paper: '#efe3c8', paper2: '#e4d3ad', paperDark: '#cdb88c',
    navy: '#1b2340', prussian: '#1f4e79', blue: '#3b6fa0', pale: '#9dbdd0', foam: '#f4efe2',
    red: '#c8402a', redDark: '#8e2a1c', ochre: '#d9a04a', ochreDark: '#a8742e',
    green: '#4a6a3a', greenLight: '#7a9a5a', sumi: '#1a1614', grey: '#6f7680', greyLight: '#a9adb0',
    pink: '#eab8b0', pinkDeep: '#d8848a', brown: '#7a4a2a', snow: '#f7f4ec', night: '#2a3550',
  };

  // ---------- drawing helpers ----------
  const hi = (w, h) => { const c = KF.makeHi(w, h, KF.HI_MAX), x = c.getContext('2d'); x.imageSmoothingEnabled = true; return c; };
  function poly(ctx, pts, fill, stroke, lw = 0.8) {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.stroke(); }
  }
  // Smooth closed shape through points (quadratic midpoints).
  function blob(ctx, pts, fill, stroke, lw = 0.8) {
    const n = pts.length;
    ctx.beginPath();
    const m0 = [(pts[0][0] + pts[n - 1][0]) / 2, (pts[0][1] + pts[n - 1][1]) / 2];
    ctx.moveTo(m0[0], m0[1]);
    for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.stroke(); }
  }
  // Tapering brush stroke along a polyline: thick in the middle, fine at both ends.
  function brush(ctx, pts, w, color = P.sumi) {
    const n = pts.length; if (n < 2) return;
    const L = [], Rr = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      const t = i / (n - 1), k = w * (0.25 + 0.75 * Math.sin(Math.PI * t));
      L.push([pts[i][0] - dy * k / 2, pts[i][1] + dx * k / 2]); Rr.push([pts[i][0] + dy * k / 2, pts[i][1] - dx * k / 2]);
    }
    ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1]);
    for (let i = 1; i < n; i++) ctx.lineTo(L[i][0], L[i][1]);
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(Rr[i][0], Rr[i][1]);
    ctx.closePath(); ctx.fillStyle = color; ctx.fill();
  }
  // Bokashi: a graded band from `a` to `b` (the printer's wiped-ink gradient).
  function bokashi(ctx, x, y, w, h, stops) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    stops.forEach(([p, c]) => g.addColorStop(p, c));
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  }
  // Kasumi mist band: a long rounded cloud strip, flat colour with a fine key line under it.
  function kasumi(ctx, x, y, w, h, fill, line = null) {
    ctx.beginPath(); ctx.moveTo(x + h / 2, y);
    ctx.lineTo(x + w - h / 2, y); ctx.arc(x + w - h / 2, y + h / 2, h / 2, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(x + h / 2, y + h); ctx.arc(x + h / 2, y + h / 2, h / 2, Math.PI / 2, Math.PI * 1.5);
    ctx.fillStyle = fill; ctx.fill();
    if (line) { ctx.strokeStyle = line; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(x + h * 0.6, y + h - 0.3); ctx.lineTo(x + w - h * 0.6, y + h - 0.3); ctx.stroke(); }
  }
  // A baked parallax layer covering only rows y0..y0+h (drawn in screen coordinates).
  function layer(w, y0, h, draw) { const c = hi(w, h), x = c.getContext('2d'); x.translate(0, -y0); draw(x); c.y0 = y0; return c; }
  // Repeat a baked layer horizontally with parallax.
  function strip(ctx, img, camX, par, y = 0) {
    const w = img.lw; let ox = -((camX * par) % w); if (ox > 0) ox -= w;
    for (let x = ox; x < VW; x += w) KF.blit(ctx, img, x, y + (img.y0 || 0));
  }
  // Pits must read as drops, not floor: the bottom of every print fades into deep indigo.
  // Tiles cover it wherever there is ground.
  function abyss(ctx, col = '27,35,64') {
    const g = ctx.createLinearGradient(0, 172, 0, VH);
    g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(0.45, `rgba(${col},0.85)`); g.addColorStop(1, `rgba(${col},1)`);
    ctx.fillStyle = g; ctx.fillRect(0, 172, VW, VH - 172);
  }
  const wrapX = (wx, camX, par, span, m = 40) => ((((wx - camX * par + m) % span) + span) % span) - m;

  // Shared: paper fibres, baked once at full resolution and multiplied over the print.
  let washi = null;
  function paper() {
    if (washi) return washi;
    washi = hi(VW, VH); const x = washi.getContext('2d'), rnd = U.rng(1771);
    x.fillStyle = '#fbf6ea'; x.fillRect(0, 0, VW, VH);
    for (let k = 0; k < 2600; k++) { // kozo fibres: short pale and dark curls
      const px = rnd() * VW, py = rnd() * VH, a = rnd() * TAU, l = 1.5 + rnd() * 5;
      x.strokeStyle = rnd() < 0.5 ? 'rgba(170,140,95,0.22)' : 'rgba(255,255,255,0.5)'; x.lineWidth = 0.15 + rnd() * 0.25;
      x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a + 1) * l / 2, py + Math.sin(a + 1) * l / 2, px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
    }
    for (let k = 0; k < 900; k++) { x.fillStyle = `rgba(150,120,80,${0.05 + rnd() * 0.12})`; x.beginPath(); x.arc(rnd() * VW, rnd() * VH, 0.2 + rnd() * 0.6, 0, TAU); x.fill(); }
    return washi;
  }

  // ---------- shared props ----------
  function spikesFor(fillA, fillB) {
    return function (ctx, x, y, dir) {
      ctx.save(); ctx.translate(x + 8, y + 8);
      ctx.rotate({ up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 }[dir] || 0);
      for (const ox of [-4, 4]) { // two bamboo stakes per tile, vermilion-lacquered, white tips
        poly(ctx, [[ox - 3.4, 8], [ox, -2.5], [ox + 3.4, 8]], fillA, P.sumi, 0.9);
        poly(ctx, [[ox, -2.5], [ox + 3.4, 8], [ox + 0.6, 8]], fillB);
        poly(ctx, [[ox - 1.2, 1.2], [ox, -2.5], [ox + 1.2, 1.2]], P.foam);
      }
      ctx.fillStyle = P.sumi; ctx.fillRect(-8, 6.6, 16, 1.4);
      ctx.restore();
    };
  }
  function toriiDoor(ctx, x, y, o = {}) {
    ctx.save();
    if (o.flipped) { ctx.translate(0, y * 2 + 32); ctx.scale(1, -1); }
    if (o.legs) { const k = Math.floor(o.legs * 12) % 2; ctx.fillStyle = P.sumi; ctx.fillRect(x + 3 + k, y + 31, 3, 4); ctx.fillRect(x + 10 - k, y + 31, 3, 4); }
    const open = o.open || 0;
    // doorway: dark interior, lantern glow when opening
    ctx.fillStyle = P.navy; ctx.fillRect(x + 2, y + 7, 12, 25);
    if (open > 0) { const g = ctx.createLinearGradient(0, y + 7, 0, y + 32); g.addColorStop(0, '#fff2c8'); g.addColorStop(1, '#f0b860'); ctx.globalAlpha = open; ctx.fillStyle = g; ctx.fillRect(x + 3, y + 8, 10, 24); ctx.globalAlpha = 1; }
    else { ctx.fillStyle = P.paper; ctx.fillRect(x + 3.5, y + 9, 9, 22); ctx.strokeStyle = P.brown; ctx.lineWidth = 0.5; for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x + 3.5, y + 9 + k * 5.5); ctx.lineTo(x + 12.5, y + 9 + k * 5.5); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(x + 8, y + 9); ctx.lineTo(x + 8, y + 31); ctx.stroke(); }
    // vermilion torii posts and lintels, sumi key line
    poly(ctx, [[x, y + 6], [x + 2.4, y + 6], [x + 2.2, y + 32], [x + 0.2, y + 32]], P.red, P.sumi, 0.7);
    poly(ctx, [[x + 13.6, y + 6], [x + 16, y + 6], [x + 15.8, y + 32], [x + 13.8, y + 32]], P.red, P.sumi, 0.7);
    poly(ctx, [[x - 2, y + 5], [x + 18, y + 5], [x + 18, y + 7.2], [x - 2, y + 7.2]], P.red, P.sumi, 0.7);
    ctx.beginPath(); ctx.moveTo(x - 4, y + 1.6); ctx.quadraticCurveTo(x + 8, y + 3.6, x + 20, y + 1.6); ctx.lineTo(x + 19, y + 3.6); ctx.quadraticCurveTo(x + 8, y + 5.4, x - 3, y + 3.6); ctx.closePath();
    ctx.fillStyle = P.sumi; ctx.fill();
    if (o.lantern) {
      const sw = Math.sin((o.t || 0) * 1.7) * 1.2;
      ctx.strokeStyle = P.sumi; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.moveTo(x + 8, y + 1); ctx.lineTo(x + 8 + sw, y - 3); ctx.stroke();
      ctx.globalAlpha = 0.3 + 0.08 * Math.sin((o.t || 0) * 4); ctx.fillStyle = '#ffd890'; ctx.beginPath(); ctx.arc(x + 8 + sw, y - 9, 9, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.ellipse(x + 8 + sw, y - 9, 3.6, 5, 0, 0, TAU); ctx.fillStyle = '#e85a3a'; ctx.fill(); ctx.strokeStyle = P.sumi; ctx.lineWidth = 0.6; ctx.stroke();
      ctx.fillStyle = P.sumi; ctx.fillRect(x + 5.6 + sw, y - 14.4, 4.8, 1.2); ctx.fillRect(x + 5.6 + sw, y - 4.8, 4.8, 1.2);
      ctx.fillStyle = 'rgba(255,240,200,0.7)'; ctx.fillRect(x + 7.2 + sw, y - 12.5, 1.2, 7);
    }
    ctx.restore();
  }
  function springFor(cap) {
    return function (ctx, x, y, squash) { // a sprung wooden geta board on a black coil
      const h = 6 - squash * 4, top = y + 16 - h - 3;
      ctx.strokeStyle = P.sumi; ctx.lineWidth = 1.1; ctx.beginPath();
      for (let i = 0; i <= 6; i++) { const yy = y + 16 - (i / 6) * h; ctx.lineTo(x + (i % 2 ? 4 : 12), yy); }
      ctx.stroke();
      poly(ctx, [[x + 1, top], [x + 15, top], [x + 14.4, top + 3], [x + 1.6, top + 3]], cap, P.sumi, 0.7);
      ctx.fillStyle = P.foam; ctx.fillRect(x + 2.5, top + 0.6, 7, 0.8);
    };
  }
  function signFor(board, inkCol) {
    return function (ctx, x, y, text) { // hanging wooden plaque with brushed lettering
      ctx.font = 'bold 7px Georgia, "Times New Roman", serif';
      const w = Math.ceil(ctx.measureText(text).width) + 10, bx = x - w / 2, by = y - 1;
      ctx.fillStyle = P.sumi; ctx.fillRect(x - 0.8, by + 10, 1.6, 9);
      poly(ctx, [[bx, by], [bx + w, by], [bx + w - 1, by + 11], [bx + 1, by + 11]], board, P.sumi, 0.8);
      ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(bx + 1, by + 8.5, w - 2, 2.5);
      ctx.fillStyle = inkCol; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, by + 5.8); ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
    };
  }
  // Outline only the exposed sides of a tile with a tapering key-block line.
  function keyEdges(ctx, x, y, e, col = P.sumi) {
    ctx.fillStyle = col;
    if (e.l) ctx.fillRect(x, y, 0.9, 16);
    if (e.r) ctx.fillRect(x + 15.1, y, 0.9, 16);
    if (e.b) ctx.fillRect(x, y + 15.1, 16, 0.9);
  }
  // A grassy / mossy top: wavy flat band with a dark key line on its upper edge.
  function grassTop(ctx, x, y, seed, base, light) {
    const ph = seed * 9;
    ctx.beginPath(); ctx.moveTo(x, y + 5);
    for (let i = 0; i <= 16; i += 2) ctx.lineTo(x + i, y + 4.2 + Math.sin(ph + i * 0.9) * 0.9);
    ctx.lineTo(x + 16, y); ctx.lineTo(x, y); ctx.closePath(); ctx.fillStyle = base; ctx.fill();
    ctx.fillStyle = light; ctx.fillRect(x, y + 0.9, 16, 1.4);
    ctx.fillStyle = P.sumi; ctx.fillRect(x, y, 16, 0.9);
    ctx.strokeStyle = P.sumi; ctx.lineWidth = 0.5; ctx.beginPath();
    for (let i = 0; i <= 16; i += 2) ctx.lineTo(x + i, y + 4.2 + Math.sin(ph + i * 0.9) * 0.9);
    ctx.stroke();
  }
  // Carved strata in a rock face.
  function strata(ctx, x, y, seed, col) {
    ctx.strokeStyle = col; ctx.lineWidth = 0.55;
    for (let k = 0; k < 2; k++) {
      const yy = y + 8 + k * 4 + ((seed * 7 + k) % 1) * 2;
      ctx.beginPath(); ctx.moveTo(x + 1 + seed * 3, yy); ctx.quadraticCurveTo(x + 8, yy - 1.6 + k, x + 15 - seed * 2, yy + 0.4); ctx.stroke();
    }
  }
  function plank(ctx, x, y) { // one-way: a lacquered wooden bridge plank
    poly(ctx, [[x, y], [x + 16, y], [x + 16, y + 3.4], [x, y + 3.4]], P.ochre, P.sumi, 0.7);
    ctx.fillStyle = P.ochreDark; ctx.fillRect(x, y + 2.2, 16, 1.1);
    ctx.fillStyle = P.sumi; ctx.fillRect(x + 3, y + 3.4, 1, 2.6); ctx.fillRect(x + 12, y + 3.4, 1, 2.6);
  }
  function iceTile(ctx, x, y, e) {
    const g = ctx.createLinearGradient(0, y, 0, y + 16); g.addColorStop(0, '#dcecf2'); g.addColorStop(1, P.pale);
    ctx.fillStyle = g; ctx.fillRect(x, y, 16, 16);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(x + 2, y + 12); ctx.lineTo(x + 8, y + 4); ctx.moveTo(x + 8, y + 14); ctx.lineTo(x + 13, y + 7); ctx.stroke();
    if (e.t) { ctx.fillStyle = P.sumi; ctx.fillRect(x, y, 16, 0.9); ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y + 0.9, 16, 1.2); }
    keyEdges(ctx, x, y, e);
  }
  // Lacquered chest with a seigaiha (wave) pattern: the "alt" prop block.
  function chest(ctx, x, y, e, body, pattern) {
    poly(ctx, [[x + 0.5, y + 0.5], [x + 15.5, y + 0.5], [x + 15.5, y + 15.5], [x + 0.5, y + 15.5]], body, P.sumi, 0.9);
    ctx.save(); ctx.beginPath(); ctx.rect(x + 2, y + 3, 12, 10); ctx.clip();
    ctx.strokeStyle = pattern; ctx.lineWidth = 0.6;
    for (let r = 0; r < 4; r++) for (let c = -1; c < 4; c++) {
      const cx = x + 2 + c * 4 + (r % 2) * 2, cy = y + 4 + r * 3;
      for (const rr of [2.4, 1.4]) { ctx.beginPath(); ctx.arc(cx, cy + 2, rr, Math.PI, 0); ctx.stroke(); }
    }
    ctx.restore();
    ctx.strokeStyle = P.sumi; ctx.lineWidth = 0.6; ctx.strokeRect(x + 2, y + 3, 12, 10);
    ctx.fillStyle = P.ochre; ctx.fillRect(x + 6.5, y + 7, 3, 2);
  }

  // ---------- the style ----------
  // Paper texture multiplied over the world, a fine print border and the publisher's red seal
  // (the HUD already names the place, so no title cartouche). Drawn GPU-side: nothing here touches pixels.
  const style = KF.Styles.all.ukiyo;
  Object.assign(style, {
    smooth: true, vecLook: 'woodblock',
    under(ctx, i) {
      // printer's border: paper margin, then a sumi key line
      ctx.fillStyle = P.paper; ctx.fillRect(0, 0, VW, 3); ctx.fillRect(0, VH - 3, VW, 3); ctx.fillRect(0, 0, 3, VH); ctx.fillRect(VW - 3, 0, 3, VH);
      ctx.strokeStyle = P.sumi; ctx.lineWidth = 0.8; ctx.strokeRect(3.4, 3.4, VW - 6.8, VH - 6.8);
      // red publisher's seal
      if (i.fight) return;
      const sx = VW - 15, sy = VH - 15;
      poly(ctx, [[sx, sy], [sx + 9, sy], [sx + 9, sy + 9], [sx, sy + 9]], P.red);
      ctx.strokeStyle = P.paper; ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(sx + 2.2, sy + 2.2); ctx.lineTo(sx + 6.8, sy + 2.2); ctx.moveTo(sx + 4.5, sy + 2.2); ctx.lineTo(sx + 4.5, sy + 7); ctx.moveTo(sx + 2.2, sy + 7); ctx.lineTo(sx + 6.8, sy + 7); ctx.moveTo(sx + 2.6, sy + 4.6); ctx.lineTo(sx + 6.4, sy + 4.6); ctx.stroke();
    },
    overlay(ctx) {
      // washi fibres multiplied over everything, plus a soft darkening at the print's edges
      ctx.save();
      ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.55; KF.blit(ctx, paper(), 0, 0);
      ctx.globalAlpha = 1;
      const g = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.45, VW / 2, VH / 2, VW * 0.62);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(176,146,96,0.28)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
      ctx.restore();
    },
  });

  // ======================================================================
  // 1. THE GREAT WAVE: Hokusai's coast. A clawed wave curls over boats, Fuji sits small and
  //    calm under it, the near sea is a band of scalloped swell. Platforms: indigo sea rock.
  // ======================================================================
  function greatWave(ctx, ox, base, sc) {
    const p = (x, y) => [ox + x * sc, base - (base - y) * sc];
    // body: Prussian blue sweeping up into the curl
    ctx.beginPath(); ctx.moveTo(...p(-40, base));
    ctx.bezierCurveTo(...p(20, base - 10), ...p(60, base - 60), ...p(110, base - 100));
    ctx.bezierCurveTo(...p(140, base - 128), ...p(190, base - 136), ...p(214, base - 112));
    ctx.bezierCurveTo(...p(226, base - 100), ...p(222, base - 82), ...p(206, base - 80));
    ctx.bezierCurveTo(...p(190, base - 80), ...p(186, base - 96), ...p(196, base - 100));
    ctx.bezierCurveTo(...p(176, base - 106), ...p(150, base - 82), ...p(160, base - 40));
    ctx.bezierCurveTo(...p(166, base - 18), ...p(190, base - 4), ...p(220, base));
    ctx.closePath();
    const g = ctx.createLinearGradient(0, base - 136 * sc, 0, base);
    g.addColorStop(0, P.blue); g.addColorStop(0.55, P.prussian); g.addColorStop(1, P.navy);
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = P.sumi; ctx.lineWidth = 1.1 * sc; ctx.stroke();
    // inner flow lines
    ctx.strokeStyle = 'rgba(244,239,226,0.75)'; ctx.lineWidth = 0.7 * sc;
    for (let k = 0; k < 5; k++) {
      ctx.beginPath(); ctx.moveTo(...p(10 + k * 18, base - 6));
      ctx.bezierCurveTo(...p(50 + k * 16, base - 40 - k * 8), ...p(90 + k * 14, base - 80 - k * 6), ...p(130 + k * 12, base - 104 - k * 3)); ctx.stroke();
    }
    // foam lip with claws
    ctx.fillStyle = P.foam; ctx.strokeStyle = P.sumi; ctx.lineWidth = 0.6 * sc;
    for (let k = 0; k < 9; k++) {
      const a = k / 8, cx = 128 + a * 92, cy = base - 112 - Math.sin(a * Math.PI) * 22 + a * 10;
      ctx.beginPath(); ctx.moveTo(...p(cx - 5, cy + 4)); ctx.quadraticCurveTo(...p(cx, cy - 8), ...p(cx + 8, cy - 2));
      ctx.quadraticCurveTo(...p(cx + 4, cy - 1), ...p(cx + 3, cy + 4)); ctx.closePath(); ctx.fill(); ctx.stroke();
      for (const d of [-1, 1]) { ctx.beginPath(); ctx.arc(...p(cx + 8 + d, cy - 3 + d), 1.1 * sc, 0, TAU); ctx.fill(); }
    }
    // spray dots falling from the curl
    ctx.fillStyle = P.foam;
    for (let k = 0; k < 16; k++) { const a = (k * 0.618) % 1; ctx.beginPath(); ctx.arc(...p(190 + a * 30, base - 92 + ((k * 37) % 40)), (0.8 + (k % 3) * 0.4) * sc, 0, TAU); ctx.fill(); }
  }
  function fuji(ctx, cx, base, w, h) {
    poly(ctx, [[cx - w, base], [cx - w * 0.18, base - h], [cx + w * 0.18, base - h], [cx + w, base]], P.prussian, P.sumi, 0.8);
    blob(ctx, [[cx - w * 0.18, base - h], [cx + w * 0.18, base - h], [cx + w * 0.42, base - h * 0.5], [cx + w * 0.2, base - h * 0.6], [cx, base - h * 0.45], [cx - w * 0.22, base - h * 0.62], [cx - w * 0.42, base - h * 0.48]], P.snow, P.sumi, 0.6);
  }
  function boat(ctx, x, y, rock) { // oshiokuri-bune: long low boat, rowers huddled
    ctx.save(); ctx.translate(x, y); ctx.rotate(rock);
    ctx.beginPath(); ctx.moveTo(-26, -2); ctx.quadraticCurveTo(0, 6, 28, -5); ctx.lineTo(24, 1); ctx.quadraticCurveTo(0, 8, -22, 2); ctx.closePath();
    ctx.fillStyle = P.ochre; ctx.fill(); ctx.strokeStyle = P.sumi; ctx.lineWidth = 0.7; ctx.stroke();
    ctx.fillStyle = P.navy;
    for (let k = 0; k < 7; k++) { ctx.beginPath(); ctx.ellipse(-16 + k * 5.4, -2.4 + Math.sin(k) * 0.4, 1.9, 2.4, 0, Math.PI, 0); ctx.fill(); }
    ctx.strokeStyle = P.sumi; ctx.lineWidth = 0.5;
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(-12 + k * 9, -1); ctx.lineTo(-18 + k * 9, 6); ctx.stroke(); }
    ctx.restore();
  }
  KF.Themes.add('woodblock_wave', {
    id: 'woodblock_wave', title: 'THE GREAT WAVE', bg: P.paper,
    signBoard: P.paper, signInk: P.navy, signPost: P.sumi, zone: { gravity: P.blue, reverse: P.red },
    build() {
      // far: paper sky with a Prussian bokashi, Fuji, kasumi bands
      const far = (this.far = hi(VW, VH)), f = far.getContext('2d');
      bokashi(f, 0, 0, VW, VH, [[0, P.navy], [0.12, P.prussian], [0.36, '#c9d6d2'], [0.5, P.paper], [1, P.paper2]]);
      fuji(f, 252, 150, 46, 40);
      kasumi(f, 18, 74, 120, 7, '#e9c9a8', P.red); kasumi(f, 190, 60, 150, 6, '#e9c9a8', P.red); kasumi(f, 290, 96, 80, 6, '#efd6b8');
      // mid: the great waves, repeating
      this.mid = layer(768, 40, 140, (m) => { greatWave(m, 20, 176, 0.95); greatWave(m, 430, 176, 0.6); });
      // near swell band: seigaiha scallops
      const near = (this.near = hi(256, 60)), n = near.getContext('2d');
      bokashi(n, 0, 0, 256, 60, [[0, P.blue], [1, P.navy]]);
      n.strokeStyle = 'rgba(244,239,226,0.8)'; n.lineWidth = 0.7;
      for (let r = 0; r < 9; r++) for (let c = -1; c < 34; c++) {
        const cx = c * 8 + (r % 2) * 4, cy = 6 + r * 6;
        for (const rr of [3.8, 2.4, 1.1]) { n.beginPath(); n.arc(cx, cy + 4, rr, Math.PI, 0); n.stroke(); }
      }
      n.fillStyle = P.sumi; n.fillRect(0, 0, 256, 0.9);
    },
    background(ctx, cam, t, mood) {
      KF.blit(ctx, this.far, 0, 0);
      strip(ctx, this.mid, cam.x, 0.22, -6);
      const rock = 0.06 + mood.cheer * 0.12;
      for (let k = 0; k < 2; k++) {
        const x = wrapX(140 + k * 380, cam.x, 0.32, 768);
        if (x > -40 && x < VW + 40) boat(ctx, x, 156 + Math.sin(t * 1.3 + k * 2) * 2.5, Math.sin(t * 1.1 + k) * rock);
      }
      strip(ctx, this.near, cam.x, 0.5, 168);
      abyss(ctx, '18,24,48');
      // spray that bursts higher when you die
      ctx.fillStyle = P.foam;
      for (let k = 0; k < 14; k++) {
        const ph = (t * 0.7 + k * 0.37) % 1, x = wrapX(k * 57, cam.x, 0.5, VW + 60), up = (10 + mood.cheer * 24) * Math.sin(ph * Math.PI);
        ctx.globalAlpha = 1 - ph; ctx.beginPath(); ctx.arc(x, 170 - up, 1 + (k % 3) * 0.5, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid') { // dark basalt sea rock (warm grey, so it never reads as water), mossy top
        const g = ctx.createLinearGradient(0, y, 0, y + 16); g.addColorStop(0, '#6a6058'); g.addColorStop(1, '#3e3732');
        ctx.fillStyle = g; ctx.fillRect(x, y, 16, 16);
        strata(ctx, x, y, seed, 'rgba(217,160,74,0.55)');
        if (e.t) grassTop(ctx, x, y, seed, P.green, P.greenLight);
        keyEdges(ctx, x, y, e);
      } else if (art === 'alt') chest(ctx, x, y, e, P.red, P.ochre);
      else if (art === 'ice') iceTile(ctx, x, y, e);
      else plank(ctx, x, y);
    },
    spike: spikesFor(P.red, P.redDark), door: toriiDoor, spring: springFor(P.ochre), sign: signFor(P.paper, P.navy),
  });

  // ======================================================================
  // 2. MISTY MOUNTAINS: Hiroshige's Kiso road. Ridges recede in graded blue-greens with mist
  //    between them, pines on the crags, a waterfall, cranes. Platforms: grey granite.
  // ======================================================================
  function ridge(ctx, y, amp, seed, fill, line, w = 768) {
    const rnd = U.rng(seed); ctx.beginPath(); ctx.moveTo(0, VH);
    let x = 0; ctx.lineTo(0, y);
    const pts = [];
    while (x <= w) { pts.push([x, y - rnd() * amp]); x += 18 + rnd() * 26; }
    pts.push([w, pts[0][1]]);
    for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; const mx = (a[0] + b[0]) / 2, my = Math.min(a[1], b[1]) - amp * 0.35 * rnd(); ctx.quadraticCurveTo(mx, my, b[0], b[1]); }
    ctx.lineTo(w, VH); ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
    if (line) { ctx.strokeStyle = line; ctx.lineWidth = 0.7; ctx.stroke(); }
  }
  function pine(ctx, x, y, s) {
    ctx.strokeStyle = P.sumi; ctx.lineWidth = 1 * s; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 3 * s, y - 10 * s, x - 1 * s, y - 20 * s); ctx.stroke();
    ctx.fillStyle = '#2f4a32';
    for (let k = 0; k < 4; k++) { const yy = y - 6 * s - k * 4.5 * s, w = (9 - k * 1.6) * s; ctx.beginPath(); ctx.ellipse(x + (k % 2 ? 2 : -2) * s, yy, w, 2.2 * s, 0, 0, TAU); ctx.fill(); }
  }
  KF.Themes.add('woodblock_mountains', {
    id: 'woodblock_mountains', title: 'MISTY MOUNTAINS', bg: P.paper,
    signBoard: P.paper2, signInk: P.sumi, signPost: P.sumi, zone: { gravity: P.blue, reverse: P.red },
    build() {
      const far = (this.far = hi(VW, VH)), f = far.getContext('2d');
      bokashi(f, 0, 0, VW, VH, [[0, '#d98a5a'], [0.14, '#eab890'], [0.4, P.paper], [1, P.paper2]]);
      f.fillStyle = P.red; f.beginPath(); f.arc(300, 44, 13, 0, TAU); f.fill(); // setting sun
      this.back = layer(768, 40, 150, (b) => { ridge(b, 92, 34, 11, '#a9c0bd', null); kasumi(b, 40, 98, 220, 8, P.paper); kasumi(b, 400, 92, 260, 8, P.paper); });
      this.mid = layer(768, 60, 140, (m) => {
      ridge(m, 124, 40, 23, '#6f948a', P.sumi);
      // waterfall in a cleft
      m.fillStyle = P.foam; m.fillRect(512, 96, 5, 60); m.strokeStyle = P.pale; m.lineWidth = 0.6;
      for (let k = 0; k < 4; k++) { m.beginPath(); m.moveTo(513 + k, 98); m.lineTo(513 + k, 154); m.stroke(); }
      kasumi(m, 100, 132, 200, 9, 'rgba(239,227,200,0.92)'); kasumi(m, 480, 138, 180, 9, 'rgba(239,227,200,0.92)');
      });
      this.near = layer(768, 100, 116, (n) => {
        ridge(n, 158, 26, 41, '#3f5f4a', P.sumi);
        for (let k = 0; k < 9; k++) pine(n, 30 + k * 86 + (k % 3) * 9, 156 - (k % 2) * 8, 0.9 + (k % 3) * 0.2);
      });
    },
    background(ctx, cam, t, mood) {
      KF.blit(ctx, this.far, 0, 0);
      strip(ctx, this.back, cam.x, 0.12, 0);
      strip(ctx, this.mid, cam.x, 0.26, 0);
      // cranes: drift, flap; scatter faster after a death
      const sp = 14 + mood.cheer * 40;
      for (let k = 0; k < 4; k++) {
        const x = ((t * sp + k * 101) % (VW + 60)) - 30, y = 40 + k * 9 + Math.sin(t * 1.3 + k) * 4, fl = Math.sin(t * 6 + k * 2) * 3;
        ctx.strokeStyle = P.sumi; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(x - 6, y - fl); ctx.quadraticCurveTo(x - 2, y - 1, x, y); ctx.quadraticCurveTo(x + 2, y - 1, x + 6, y - fl); ctx.stroke();
        ctx.fillStyle = P.red; ctx.beginPath(); ctx.arc(x + 0.6, y - 0.6, 0.7, 0, TAU); ctx.fill();
      }
      strip(ctx, this.near, cam.x, 0.45, 0);
      // drifting mist band in front
      ctx.globalAlpha = 0.55; kasumi(ctx, wrapX(60, cam.x, 0.6, VW + 220, 110), 150, 200, 10, P.paper); ctx.globalAlpha = 1;
      abyss(ctx, '30,40,52');
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid') { // granite with brushed cracks
        const g = ctx.createLinearGradient(0, y, 0, y + 16); g.addColorStop(0, '#8f9a9e'); g.addColorStop(1, '#5f6a72');
        ctx.fillStyle = g; ctx.fillRect(x, y, 16, 16);
        brush(ctx, [[x + 2 + seed * 4, y + 6], [x + 6, y + 9], [x + 9 + seed * 3, y + 13]], 1.1, 'rgba(26,22,20,0.55)');
        if (e.t) grassTop(ctx, x, y, seed, '#5a7a48', '#8aa86a');
        keyEdges(ctx, x, y, e);
      } else if (art === 'alt') { // stone lantern block
        poly(ctx, [[x + 0.5, y + 0.5], [x + 15.5, y + 0.5], [x + 15.5, y + 15.5], [x + 0.5, y + 15.5]], P.greyLight, P.sumi, 0.9);
        poly(ctx, [[x + 4, y + 4], [x + 12, y + 4], [x + 12, y + 11], [x + 4, y + 11]], '#f3d27a', P.sumi, 0.6);
        ctx.fillStyle = P.sumi; ctx.fillRect(x + 7.5, y + 4, 1, 7); ctx.fillRect(x + 1, y + 13, 14, 1);
      } else if (art === 'ice') iceTile(ctx, x, y, e);
      else plank(ctx, x, y);
    },
    spike: spikesFor(P.red, P.redDark), door: toriiDoor, spring: springFor(P.ochre), sign: signFor(P.paper2, P.sumi),
  });

  // ======================================================================
  // 3. SAKURA TEMPLE: blossom season at a hillside temple. A pagoda and a vermilion bridge,
  //    flat pink blossom clouds, petals falling. Platforms: earthen walls with tiled caps.
  // ======================================================================
  function blossomTree(ctx, x, y, s, rnd) {
    ctx.strokeStyle = P.brown; ctx.lineCap = 'round';
    brush(ctx, [[x, y], [x + 3 * s, y - 14 * s], [x - 2 * s, y - 28 * s]], 3.4 * s, P.brown);
    brush(ctx, [[x + 2 * s, y - 14 * s], [x + 14 * s, y - 24 * s]], 2 * s, P.brown);
    for (let k = 0; k < 9; k++) {
      const a = rnd() * TAU, r = (6 + rnd() * 10) * s;
      ctx.fillStyle = k % 3 ? P.pink : P.pinkDeep;
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * r, y - 26 * s + Math.sin(a) * r * 0.6, (6 + rnd() * 5) * s, 0, TAU); ctx.fill();
    }
  }
  function pagoda(ctx, x, base) {
    for (let k = 0; k < 5; k++) {
      const y = base - 12 - k * 14, w = 30 - k * 4;
      poly(ctx, [[x - w * 0.4, y + 12], [x + w * 0.4, y + 12], [x + w * 0.36, y + 2], [x - w * 0.36, y + 2]], P.red, P.sumi, 0.6);
      ctx.beginPath(); ctx.moveTo(x - w, y + 2); ctx.quadraticCurveTo(x, y - 6, x + w, y + 2); ctx.quadraticCurveTo(x, y - 1, x - w, y + 2); ctx.fillStyle = P.sumi; ctx.fill();
    }
    ctx.fillStyle = P.ochre; ctx.fillRect(x - 0.8, base - 96, 1.6, 16);
  }
  KF.Themes.add('woodblock_sakura', {
    id: 'woodblock_sakura', title: 'SAKURA TEMPLE', bg: P.paper,
    signBoard: P.paper, signInk: P.redDark, signPost: P.sumi, zone: { gravity: P.blue, reverse: P.red },
    build() {
      const far = (this.far = hi(VW, VH)), f = far.getContext('2d');
      bokashi(f, 0, 0, VW, VH, [[0, '#d8848a'], [0.16, '#f0c8bc'], [0.42, P.paper], [1, P.paper2]]);
      ridge(f, 120, 18, 7, '#b8c7b8', null, VW);
      kasumi(f, 30, 66, 140, 7, P.paper, P.red); kasumi(f, 220, 80, 130, 7, P.paper, P.red);
      const mid = (this.mid = layer(768, 40, 140, () => {})), m = mid.getContext('2d'), rnd = U.rng(303);
      pagoda(m, 150, 150); pagoda(m, 560, 150);
      // vermilion arched bridge
      m.strokeStyle = P.red; m.lineWidth = 3; m.beginPath(); m.moveTo(330, 150); m.quadraticCurveTo(380, 120, 430, 150); m.stroke();
      m.strokeStyle = P.sumi; m.lineWidth = 0.7; m.beginPath(); m.moveTo(330, 148); m.quadraticCurveTo(380, 118, 430, 148); m.stroke();
      for (let k = 0; k < 6; k++) { const xx = 340 + k * 16, yy = 150 - Math.sin(((xx - 330) / 100) * Math.PI) * 26; m.fillStyle = P.red; m.fillRect(xx, yy - 8, 1.6, 8); }
      for (let k = 0; k < 6; k++) blossomTree(m, 40 + k * 128 + rnd() * 30, 160, 0.9 + rnd() * 0.3, rnd);
      kasumi(m, 200, 136, 160, 9, 'rgba(239,227,200,0.9)'); kasumi(m, 620, 130, 120, 9, 'rgba(239,227,200,0.9)');
      // temple pond: indigo water with ripples and floating petals (a drop, not a floor)
      const near = (this.near = hi(768, 60)), n = near.getContext('2d');
      bokashi(n, 0, 0, 768, 60, [[0, P.blue], [1, P.navy]]); n.fillStyle = P.sumi; n.fillRect(0, 0, 768, 0.9);
      n.strokeStyle = 'rgba(244,239,226,0.55)'; n.lineWidth = 0.6;
      for (let k = 0; k < 40; k++) { const x = (k * 71) % 768, y = 6 + (k * 13) % 36; n.beginPath(); n.moveTo(x, y); n.quadraticCurveTo(x + 6, y - 2, x + 12, y); n.stroke(); }
      for (let k = 0; k < 50; k++) { n.fillStyle = k % 2 ? P.pink : P.pinkDeep; n.beginPath(); n.ellipse((k * 53) % 768, 5 + (k * 17) % 40, 1.4, 0.8, k, 0, TAU); n.fill(); }
    },
    background(ctx, cam, t, mood) {
      KF.blit(ctx, this.far, 0, 0);
      strip(ctx, this.mid, cam.x, 0.25, 0);
      strip(ctx, this.near, cam.x, 0.45, 166);
      abyss(ctx);
      // falling petals; a burst when you die
      const n = 26 + Math.round(mood.cheer * 30);
      for (let k = 0; k < n; k++) {
        const sp = 10 + (k % 5) * 3, x = wrapX(k * 41 + t * sp * 1.6, cam.x, 0.6, VW + 40, 20), y = ((t * sp + k * 29) % (VH + 20)) - 10, r = Math.sin(t * 2 + k);
        ctx.fillStyle = k % 3 ? P.pink : P.pinkDeep;
        ctx.beginPath(); ctx.ellipse(x + r * 3, y, 1.6, 0.9, t + k, 0, TAU); ctx.fill();
      }
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid') { // plastered earthen wall on a stone footing, grey tiled cap
        ctx.fillStyle = '#e7d2a6'; ctx.fillRect(x, y, 16, 16);
        ctx.fillStyle = '#c8a87a'; ctx.fillRect(x, y + 11, 16, 5);
        ctx.strokeStyle = 'rgba(122,74,42,0.6)'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(x, y + 11); ctx.lineTo(x + 16, y + 11); ctx.moveTo(x + 5 + seed * 6, y + 11); ctx.lineTo(x + 5 + seed * 6, y + 16); ctx.stroke();
        if (e.t) {
          ctx.fillStyle = '#4a4f5a'; ctx.fillRect(x, y, 16, 4.2);
          ctx.fillStyle = '#7a808c'; for (let i = 0; i < 16; i += 4) { ctx.beginPath(); ctx.arc(x + i + 2, y + 4, 2, Math.PI, 0); ctx.fill(); }
          ctx.fillStyle = P.sumi; ctx.fillRect(x, y, 16, 0.9);
        }
        keyEdges(ctx, x, y, e);
      } else if (art === 'alt') chest(ctx, x, y, e, P.red, P.pink);
      else if (art === 'ice') iceTile(ctx, x, y, e);
      else { // one-way: a bamboo pole
        const g = ctx.createLinearGradient(0, y, 0, y + 4); g.addColorStop(0, '#b8c86a'); g.addColorStop(1, '#6a8a3a');
        ctx.fillStyle = g; ctx.fillRect(x, y, 16, 3.6); ctx.strokeStyle = P.sumi; ctx.lineWidth = 0.6; ctx.strokeRect(x, y, 16, 3.6);
        ctx.fillStyle = P.sumi; ctx.fillRect(x + 7.5, y, 0.8, 3.6);
      }
    },
    spike: spikesFor(P.red, P.redDark), door: toriiDoor, spring: springFor(P.red), sign: signFor(P.paper, P.redDark),
  });

  // ======================================================================
  // 4. SNOW FJORD: Hiroshige's night snow, carried north. A grey-indigo sky, snow falling on
  //    a fjord village, a longship moored under white mountains. Platforms: snow on dark rock.
  // ======================================================================
  function snowHouse(ctx, x, base, w) {
    poly(ctx, [[x, base], [x, base - 10], [x + w, base - 10], [x + w, base]], '#5a4a40', P.sumi, 0.6);
    ctx.fillStyle = '#f3c86a'; ctx.fillRect(x + w * 0.3, base - 7, 3, 3); // lit window
    ctx.beginPath(); ctx.moveTo(x - 3, base - 9); ctx.lineTo(x + w / 2, base - 18); ctx.lineTo(x + w + 3, base - 9); ctx.quadraticCurveTo(x + w / 2, base - 7, x - 3, base - 9);
    ctx.fillStyle = P.snow; ctx.fill(); ctx.strokeStyle = P.sumi; ctx.lineWidth = 0.6; ctx.stroke();
  }
  function longship(ctx, x, y, rock) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rock);
    ctx.beginPath(); ctx.moveTo(-30, -8); ctx.quadraticCurveTo(-26, 2, 0, 3); ctx.quadraticCurveTo(26, 2, 30, -8); ctx.lineTo(24, -3); ctx.lineTo(-24, -3); ctx.closePath();
    ctx.fillStyle = P.brown; ctx.fill(); ctx.strokeStyle = P.sumi; ctx.lineWidth = 0.7; ctx.stroke();
    for (let k = 0; k < 6; k++) { ctx.fillStyle = k % 2 ? P.red : P.ochre; ctx.beginPath(); ctx.arc(-15 + k * 6, -3.5, 2.2, Math.PI, 0); ctx.fill(); }
    ctx.fillStyle = P.sumi; ctx.fillRect(-0.6, -26, 1.2, 23);
    for (let k = 0; k < 4; k++) { ctx.fillStyle = k % 2 ? P.red : P.snow; ctx.fillRect(-10, -24 + k * 4.5, 20, 4.5); }
    ctx.strokeStyle = P.sumi; ctx.strokeRect(-10, -24, 20, 18);
    ctx.restore();
  }
  KF.Themes.add('woodblock_fjord', {
    id: 'woodblock_fjord', title: 'SNOW FJORD', bg: P.night,
    signBoard: P.snow, signInk: P.navy, signPost: P.sumi, zone: { gravity: '#7a9aff', reverse: P.red },
    build() {
      const far = (this.far = hi(VW, VH)), f = far.getContext('2d');
      bokashi(f, 0, 0, VW, VH, [[0, '#262c40'], [0.3, '#4a5470'], [0.6, '#8a92a0'], [1, '#b8bcc0']]);
      const back = (this.back = layer(768, 40, 176, () => {})), b = back.getContext('2d');
      ridge(b, 104, 46, 91, P.snow, P.sumi); // white mountains
      b.fillStyle = 'rgba(42,53,80,0.25)'; // shadow sides
      for (let k = 0; k < 10; k++) { const x = k * 80 + 20; b.beginPath(); b.moveTo(x, 104); b.lineTo(x + 26, 70 + (k % 3) * 6); b.lineTo(x + 34, 104); b.closePath(); b.fill(); }
      // dark fjord water
      bokashi(b, 0, 120, 768, 96, [[0, '#2a3550'], [1, '#141a30']]);
      b.strokeStyle = 'rgba(200,210,230,0.35)'; b.lineWidth = 0.5;
      for (let k = 0; k < 30; k++) { b.beginPath(); b.moveTo((k * 37) % 768, 126 + (k % 6) * 5); b.lineTo((k * 37) % 768 + 10, 126 + (k % 6) * 5); b.stroke(); }
      // the far shore: a village on a thin snowbank, the dark fjord below it
      // (it sits well above the playfield's floor line so it never looks like ground to stand on)
      this.mid = layer(768, 100, 50, (m) => {
        for (let k = 0; k < 8; k++) snowHouse(m, 30 + k * 96 + (k % 2) * 20, 138 - (k % 3) * 2, 14 + (k % 3) * 4);
        m.fillStyle = P.snow; m.beginPath(); m.moveTo(0, 138); for (let x = 0; x <= 768; x += 24) m.quadraticCurveTo(x + 12, 133, x + 24, 138); m.lineTo(768, 142); m.quadraticCurveTo(384, 145, 0, 142); m.fill();
        m.fillStyle = P.sumi; m.fillRect(0, 137.5, 768, 0.7);
      });
    },
    background(ctx, cam, t, mood) {
      KF.blit(ctx, this.far, 0, 0);
      strip(ctx, this.back, cam.x, 0.14, 0);
      strip(ctx, this.mid, cam.x, 0.32, 0);
      const x = wrapX(300, cam.x, 0.36, 768);
      if (x > -40 && x < VW + 40) longship(ctx, x, 158 + Math.sin(t) * 1.2, Math.sin(t * 0.8) * 0.03);
      abyss(ctx, '14,18,36');
      // snow: drifting flakes in two depths; a gust after a death
      const gust = 20 + mood.cheer * 80;
      for (let k = 0; k < 44; k++) {
        const near = k % 3 === 0, sp = near ? 26 : 14, x2 = wrapX(k * 23 + t * gust * (near ? 1 : 0.5), cam.x, near ? 0.7 : 0.4, VW + 20, 10);
        const y = ((t * sp + k * 41) % (VH + 10)) - 5;
        ctx.fillStyle = near ? '#ffffff' : 'rgba(255,255,255,0.7)';
        ctx.beginPath(); ctx.arc(x2 + Math.sin(t + k) * 2, y, near ? 1.2 : 0.7, 0, TAU); ctx.fill();
      }
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid') { // dark rock with a thick snow cap that droops at the edges
        const g = ctx.createLinearGradient(0, y, 0, y + 16); g.addColorStop(0, '#3a4258'); g.addColorStop(1, '#22283a');
        ctx.fillStyle = g; ctx.fillRect(x, y, 16, 16);
        strata(ctx, x, y, seed, 'rgba(169,173,176,0.5)');
        if (e.t) {
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 16, y); ctx.lineTo(x + 16, y + 4 + (e.r ? 2.5 : 0));
          for (let i = 16; i >= 0; i -= 4) ctx.quadraticCurveTo(x + i - 2, y + 6.5 + Math.sin(seed * 9 + i) * 0.8, x + i - 4, y + 4.4);
          ctx.closePath(); ctx.fillStyle = P.snow; ctx.fill();
          ctx.fillStyle = '#c8d4e4'; ctx.fillRect(x, y + 3, 16, 0.9);
          ctx.fillStyle = P.sumi; ctx.fillRect(x, y, 16, 0.9);
        }
        keyEdges(ctx, x, y, e);
      } else if (art === 'alt') { // snow-capped crate
        poly(ctx, [[x + 0.5, y + 0.5], [x + 15.5, y + 0.5], [x + 15.5, y + 15.5], [x + 0.5, y + 15.5]], P.brown, P.sumi, 0.9);
        ctx.strokeStyle = P.sumi; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(x + 1, y + 1); ctx.lineTo(x + 15, y + 15); ctx.moveTo(x + 15, y + 1); ctx.lineTo(x + 1, y + 15); ctx.stroke();
        if (e.t) { ctx.fillStyle = P.snow; ctx.beginPath(); ctx.moveTo(x, y + 0.5); ctx.lineTo(x + 16, y + 0.5); ctx.quadraticCurveTo(x + 8, y + 5, x, y + 3); ctx.fill(); }
      } else if (art === 'ice') iceTile(ctx, x, y, e);
      else plank(ctx, x, y);
    },
    spike: spikesFor(P.red, P.redDark), door: toriiDoor, spring: springFor(P.red), sign: signFor(P.snow, P.navy),
  });
})(window.KF);
