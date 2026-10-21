'use strict';
// Smooth (non-pixel) places for the OLD TV realm: a 1930s rubber-hose cartoon broadcast in black
// and white. Everything is drawn with ink-line paths and soft tonal gradients, so it stays crisp at
// any resolution: a sitcom studio, cartoon rooftops with bobbing water towers, a grinning steam
// train, and the docks with a tugboat. The film look (grain, flicker, gate weave, scratches,
// vignette, the rounded TV glass) is done GPU-side in compose / overlay.
(function (KF) {
  const VW = KF.VIEW_W, VH = KF.VIEW_H, U = KF.util, T = KF.TILE;
  const INK = '#151515';
  const G = ['#151515', '#353535', '#575757', '#7c7c7c', '#a0a0a0', '#c3c3c1', '#e2e1dc', '#f5f4ee'];
  const SERIF = 'Georgia, "Times New Roman", serif';

  // ---------- drawing helpers ----------
  const hi = (w, h) => { const c = KF.makeHi(w, h, KF.HI_MAX); c.getContext('2d').imageSmoothingEnabled = true; return c; };
  function ink(ctx, w = 1) { ctx.strokeStyle = INK; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; }
  function vgrad(ctx, y0, y1, stops) {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
    return g;
  }
  function hgrad(ctx, x0, x1, stops) {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
    return g;
  }
  // A soft, hand-drawn closed shape through the points (quadratic curves between midpoints).
  function blob(ctx, pts) {
    ctx.beginPath();
    const n = pts.length, m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const s = m(pts[n - 1], pts[0]);
    ctx.moveTo(s[0], s[1]);
    for (let i = 0; i < n; i++) { const p = pts[i], q = m(p, pts[(i + 1) % n]); ctx.quadraticCurveTo(p[0], p[1], q[0], q[1]); }
    ctx.closePath();
  }
  function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
  function fillInk(ctx, fill, lw = 1) { ctx.fillStyle = fill; ctx.fill(); ink(ctx, lw); ctx.stroke(); }
  // Rubber-hose pie-cut eyes and a grin, centred at (cx, cy), size s. blink 0..1 closes them.
  function face(ctx, cx, cy, s, blink = 0, smile = 1) {
    for (const dx of [-0.55, 0.55]) {
      const ex = cx + dx * s, ey = cy;
      ctx.beginPath(); ctx.ellipse(ex, ey, 0.42 * s, 0.6 * s * (1 - blink * 0.9), 0, 0, Math.PI * 2);
      ctx.fillStyle = G[7]; ctx.fill(); ink(ctx, Math.max(0.6, s * 0.14)); ctx.stroke();
      if (blink < 0.5) { // black pupil with the classic pie-slice cut
        ctx.beginPath(); ctx.moveTo(ex + 0.08 * s, ey + 0.1 * s);
        ctx.ellipse(ex + 0.08 * s, ey + 0.1 * s, 0.26 * s, 0.4 * s, 0, -0.9, Math.PI * 1.55);
        ctx.closePath(); ctx.fillStyle = INK; ctx.fill();
      }
    }
    ctx.beginPath(); ctx.arc(cx, cy + 0.55 * s, 0.75 * s, 0.15 * Math.PI, (0.85 - 0.0 * smile) * Math.PI);
    ink(ctx, Math.max(0.6, s * 0.16)); ctx.stroke();
  }
  function cloud(ctx, x, y, w, faceOn) {
    const h = w * 0.45;
    blob(ctx, [[x, y + h], [x + w * 0.05, y + h * 0.45], [x + w * 0.25, y + h * 0.1], [x + w * 0.45, y - h * 0.15], [x + w * 0.7, y], [x + w * 0.95, y + h * 0.4], [x + w, y + h]]);
    ctx.fillStyle = vgrad(ctx, y - h * 0.2, y + h, [G[7], G[6]]); ctx.fill(); ink(ctx, 0.9); ctx.stroke();
    if (faceOn) face(ctx, x + w * 0.5, y + h * 0.45, w * 0.09, 0);
  }
  function puff(ctx, x, y, r, a) { // smoke / steam puff
    ctx.globalAlpha = a;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.arc(x + r * 0.8, y + r * 0.2, r * 0.7, 0, Math.PI * 2); ctx.arc(x - r * 0.7, y + r * 0.3, r * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = G[6]; ctx.fill(); ink(ctx, 0.7); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  const tiled = (ctx, img, camX, par, y = 0) => KF.ThemeKit.tiled(ctx, img, camX, par, y);
  const wrapX = (wx, camX, par, span) => ((((wx - camX * par) % span) + span) % span) - 40;
  function skyGrad(top, bottom) {
    const c = hi(VW, VH), x = c.getContext('2d');
    x.fillStyle = vgrad(x, 0, VH, [top, bottom]); x.fillRect(0, 0, VW, VH);
    return c;
  }

  // ---------- shared stage pieces ----------
  // A slab tile: tonal gradient body, ink outline on the exposed sides, a light rounded cap on top.
  function slab(ctx, x, y, e, body, cap, texture) {
    ctx.fillStyle = vgrad(ctx, y, y + 16, body); ctx.fillRect(x, y, 16, 16);
    if (texture) texture(ctx, x, y);
    ink(ctx, 1.1);
    ctx.beginPath();
    if (e.l) { ctx.moveTo(x + 0.55, y); ctx.lineTo(x + 0.55, y + 16); }
    if (e.r) { ctx.moveTo(x + 15.45, y); ctx.lineTo(x + 15.45, y + 16); }
    if (e.b) { ctx.moveTo(x, y + 15.45); ctx.lineTo(x + 16, y + 15.45); }
    ctx.stroke();
    if (e.t) {
      const l = e.l ? 1.5 : 0, r = e.r ? 1.5 : 0;
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x, y + 5, 16, 1.6); // cap shadow
      rrect(ctx, x - (e.l ? 0.6 : 0) + l * 0, y + 0.6, 16 + (e.l ? 0.6 : 0) + (e.r ? 0.6 : 0), 4.6, [e.l ? 2.2 : 0, e.r ? 2.2 : 0, e.r ? 1 : 0, e.l ? 1 : 0]);
      ctx.fillStyle = vgrad(ctx, y, y + 5, cap); ctx.fill();
      ink(ctx, 1.1); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(x + 1.5 + l, y + 1.9); ctx.lineTo(x + 14.5 - r, y + 1.9); ctx.stroke();
    }
  }
  function box(ctx, x, y, fill, inner) { // a prop block, fully outlined
    rrect(ctx, x + 0.6, y + 0.6, 14.8, 14.8, 2);
    ctx.fillStyle = vgrad(ctx, y, y + 16, fill); ctx.fill(); ink(ctx, 1.1); ctx.stroke();
    if (inner) inner(ctx, x, y);
  }
  function plank(ctx, x, y, top, bot) { // one-way ledge
    rrect(ctx, x + 0.3, y + 0.5, 15.4, 4, 1.5);
    ctx.fillStyle = vgrad(ctx, y, y + 5, [top, bot]); ctx.fill(); ink(ctx, 1); ctx.stroke();
    ink(ctx, 0.8);
    ctx.beginPath(); ctx.moveTo(x + 3, y + 4.5); ctx.lineTo(x + 5, y + 8); ctx.moveTo(x + 13, y + 4.5); ctx.lineTo(x + 11, y + 8); ctx.stroke();
  }
  function iceSlab(ctx, x, y, e) {
    slab(ctx, x, y, e, [G[7], G[5]], ['#ffffff', G[6]]);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x + 3, y + 13); ctx.lineTo(x + 9, y + 7); ctx.moveTo(x + 8, y + 14); ctx.lineTo(x + 12, y + 10); ctx.stroke();
  }
  // Cartoon spikes: two fat white fangs per tile with heavy ink, shaded on their right side.
  function spike(ctx, x, y, dir) {
    ctx.save();
    ctx.translate(x + 8, y + 8);
    ctx.rotate({ up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 }[dir] || 0);
    ctx.fillStyle = G[1]; rrect(ctx, -8, 5, 16, 3, 1); ctx.fill();
    for (const ox of [-4, 4]) {
      ctx.beginPath(); ctx.moveTo(ox - 3.6, 6); ctx.quadraticCurveTo(ox - 1.2, 0, ox, -6.5); ctx.quadraticCurveTo(ox + 1.2, 0, ox + 3.6, 6); ctx.closePath();
      ctx.fillStyle = hgrad(ctx, ox - 3.6, ox + 3.6, [G[7], G[7], G[4]]); ctx.fill(); ink(ctx, 1.1); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(ox - 1.6, 4); ctx.quadraticCurveTo(ox - 0.7, 0, ox - 0.2, -3.5); ctx.stroke();
    }
    ctx.restore();
  }
  function spring(ctx, x, y, squash) {
    const h = 7 - squash * 4.5, base = y + 16;
    ink(ctx, 1.3);
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) { const yy = base - 1 - (h * i) / 6; ctx[i ? 'lineTo' : 'moveTo'](x + (i % 2 ? 13 : 3), yy); }
    ctx.stroke();
    ctx.strokeStyle = G[6]; ctx.lineWidth = 0.5; ctx.stroke();
    rrect(ctx, x + 1, base - h - 4, 14, 3.4, 1.5); ctx.fillStyle = vgrad(ctx, base - h - 4, base - h, [G[7], G[4]]); ctx.fill(); ink(ctx, 1); ctx.stroke();
    rrect(ctx, x + 1, base - 2, 14, 2, 1); ctx.fillStyle = G[2]; ctx.fill();
  }
  // The exit: a cartoon door with a rounded top and a bulb-lit EXIT marquee on the real one.
  function door(ctx, x, y, o = {}) {
    ctx.save();
    if (o.flipped) { ctx.translate(0, y * 2 + 32); ctx.scale(1, -1); }
    const t = o.t || 0;
    if (o.legs) { // running door: rubber-hose legs and big shoes
      const k = Math.sin(o.legs * 18);
      ink(ctx, 1.6);
      ctx.beginPath(); ctx.moveTo(x + 5, y + 30); ctx.quadraticCurveTo(x + 3 + k * 3, y + 33, x + 4 + k * 4, y + 35); ctx.moveTo(x + 11, y + 30); ctx.quadraticCurveTo(x + 13 - k * 3, y + 33, x + 12 - k * 4, y + 35); ctx.stroke();
      for (const fx of [x + 4 + k * 4, x + 12 - k * 4]) { ctx.beginPath(); ctx.ellipse(fx + 1.5, y + 35.5, 3, 1.6, 0, 0, Math.PI * 2); ctx.fillStyle = INK; ctx.fill(); }
    }
    ctx.beginPath(); ctx.moveTo(x - 1, y + 32); ctx.lineTo(x - 1, y + 7); ctx.quadraticCurveTo(x - 1, y - 1, x + 8, y - 1); ctx.quadraticCurveTo(x + 17, y - 1, x + 17, y + 7); ctx.lineTo(x + 17, y + 32); ctx.closePath();
    ctx.fillStyle = G[2]; ctx.fill(); ink(ctx, 1.3); ctx.stroke();
    const open = o.open || 0;
    ctx.beginPath(); ctx.moveTo(x + 1.5, y + 32); ctx.lineTo(x + 1.5, y + 8); ctx.quadraticCurveTo(x + 1.5, y + 1.5, x + 8, y + 1.5); ctx.quadraticCurveTo(x + 14.5, y + 1.5, x + 14.5, y + 8); ctx.lineTo(x + 14.5, y + 32); ctx.closePath();
    if (open > 0) {
      ctx.fillStyle = INK; ctx.fill();
      ctx.save(); ctx.clip();
      ctx.globalAlpha = 0.5 + 0.5 * open;
      ctx.fillStyle = vgrad(ctx, y, y + 32, ['#ffffff', G[6]]);
      ctx.beginPath(); ctx.moveTo(x + 8, y + 6); ctx.lineTo(x - 2, y + 34); ctx.lineTo(x + 18, y + 34); ctx.closePath(); ctx.fill();
      ctx.restore(); ctx.globalAlpha = 1;
      const pw = 13 * (1 - open);
      if (pw > 0.5) { rrect(ctx, x + 1.5, y + 3, pw, 29, 1); ctx.fillStyle = G[5]; ctx.fill(); ink(ctx, 1); ctx.stroke(); }
    } else {
      ctx.fillStyle = hgrad(ctx, x, x + 16, [G[6], G[5], G[4]]); ctx.fill(); ink(ctx, 1); ctx.stroke();
      ink(ctx, 0.8);
      rrect(ctx, x + 4, y + 7, 8, 9, 1.5); ctx.stroke();
      rrect(ctx, x + 4, y + 19, 8, 9, 1.5); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + 12.5, y + 18, 1.3, 0, Math.PI * 2); ctx.fillStyle = INK; ctx.fill();
    }
    if (o.lantern) { // marquee with chasing bulbs
      rrect(ctx, x - 3, y - 12, 22, 9, 3); ctx.fillStyle = G[1]; ctx.fill(); ink(ctx, 1.1); ctx.stroke();
      ctx.font = `bold 6.5px ${SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = G[7];
      ctx.fillText('EXIT', x + 8, y - 7.3);
      for (let i = 0; i < 6; i++) {
        const on = (Math.floor(t * 6) + i) % 2 === 0, bx = x - 1.5 + i * 3.8;
        ctx.beginPath(); ctx.arc(bx, y - 13.2, 1.1, 0, Math.PI * 2); ctx.fillStyle = on ? '#ffffff' : G[3]; ctx.fill();
        if (on) { ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.arc(bx, y - 13.2, 2.6, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
      }
    }
    ctx.restore();
  }
  function sign(ctx, x, y, text, theme) {
    ctx.font = `bold 8px ${SERIF}`;
    const w = Math.ceil(ctx.measureText(text).width) + 10, bx = Math.round(x - w / 2), by = Math.round(y);
    ink(ctx, 1.4); ctx.beginPath(); ctx.moveTo(x, by + 10); ctx.lineTo(x, by + 18); ctx.stroke();
    ctx.strokeStyle = G[3]; ctx.lineWidth = 0.6; ctx.stroke();
    rrect(ctx, bx, by, w, 11, 3); ctx.fillStyle = vgrad(ctx, by, by + 11, [theme.signBoard || G[7], G[5]]); ctx.fill(); ink(ctx, 1.1); ctx.stroke();
    ctx.fillStyle = theme.signInk || INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x, by + 6);
  }
  const shared = { spike, spring, door, sign, signBoard: G[7], signInk: INK, zone: { gravity: '#d0d0d0', reverse: '#8a8a8a' } };

  // ======================================================================
  // 1. THE 1950S STUDIO: a sitcom living-room set, lights, boom mic, APPLAUSE.
  // ======================================================================
  KF.Themes.add('oldtv_studio', Object.assign({}, shared, {
    id: 'oldtv_studio', title: 'THE 1950S STUDIO', bg: G[1],
    build() {
      this.back = skyGrad(G[1], G[0]);
      // The set: painted flats with wallpaper stripes, a window, a picture, a door and a fireplace.
      const W = 768, c = hi(W, VH), s = c.getContext('2d');
      for (let fx = 0; fx < W; fx += 192) {
        s.fillStyle = vgrad(s, 40, 176, [G[5], G[4]]); s.fillRect(fx + 2, 40, 188, 136);
        s.globalAlpha = 0.18; s.fillStyle = G[7];
        for (let k = 8; k < 188; k += 16) s.fillRect(fx + 2 + k, 40, 6, 96);
        s.globalAlpha = 1;
        s.fillStyle = vgrad(s, 136, 176, [G[3], G[2]]); s.fillRect(fx + 2, 136, 188, 40); // wainscot
        ink(s, 0.8); for (let k = 10; k < 180; k += 30) { s.beginPath(); s.roundRect(fx + 2 + k, 142, 24, 28, 2); s.stroke(); }
        ink(s, 1.2); s.beginPath(); s.moveTo(fx + 2, 136); s.lineTo(fx + 190, 136); s.stroke();
        s.beginPath(); s.roundRect(fx + 2, 40, 188, 136, 3); s.stroke();
      }
      // Window with a painted moon-faced night skyline.
      rrect(s, 40, 62, 76, 56, 6); s.fillStyle = vgrad(s, 62, 118, [G[1], G[2]]); s.fill();
      s.save(); s.clip();
      s.beginPath(); s.arc(96, 80, 9, 0, Math.PI * 2); s.fillStyle = G[6]; s.fill(); ink(s, 0.8); s.stroke(); face(s, 96, 79, 3.2);
      s.fillStyle = G[0]; for (let k = 0; k < 6; k++) { const bw = 10 + (k * 7) % 9, bh = 14 + (k * 13) % 20; s.fillRect(42 + k * 13, 118 - bh, bw, bh); }
      s.restore();
      ink(s, 1.6); rrect(s, 40, 62, 76, 56, 6); s.stroke();
      s.beginPath(); s.moveTo(78, 62); s.lineTo(78, 118); s.moveTo(40, 90); s.lineTo(116, 90); s.stroke();
      for (const side of [-1, 1]) { // draped curtains with a tie-back
        const ox = side < 0 ? 36 : 120;
        s.beginPath(); s.moveTo(ox, 56); s.lineTo(ox - side * 22, 56); s.quadraticCurveTo(ox - side * 6, 92, ox - side * 14, 126); s.lineTo(ox + side * 2, 128); s.quadraticCurveTo(ox + side * 4, 90, ox, 56); s.closePath();
        s.fillStyle = hgrad(s, ox - 22, ox + 22, [G[6], G[5], G[6]]); s.fill(); ink(s, 1); s.stroke();
        s.beginPath(); s.ellipse(ox - side * 9, 100, 4, 2, 0, 0, Math.PI * 2); fillInk(s, G[2], 0.8);
      }
      rrect(s, 30, 52, 96, 6, 3); fillInk(s, G[2], 1); // rail
      // Picture frame: a grinning sun.
      rrect(s, 244, 66, 50, 38, 3); fillInk(s, G[2], 1.6);
      rrect(s, 248, 70, 42, 30, 2); s.fillStyle = G[6]; s.fill();
      s.beginPath(); s.arc(269, 85, 9, 0, Math.PI * 2); fillInk(s, G[7], 1); face(s, 269, 84, 3.2);
      // Painted door flat and a fireplace.
      rrect(s, 420, 78, 40, 98, [16, 16, 0, 0]); fillInk(s, G[3], 1.4);
      s.beginPath(); s.arc(452, 128, 2, 0, Math.PI * 2); s.fillStyle = INK; s.fill();
      rrect(s, 560, 104, 90, 72, 4); fillInk(s, G[3], 1.4);
      s.beginPath(); s.moveTo(578, 176); s.lineTo(578, 136); s.quadraticCurveTo(605, 112, 632, 136); s.lineTo(632, 176); s.closePath(); fillInk(s, G[0], 1.2);
      rrect(s, 552, 98, 106, 9, 3); fillInk(s, G[5], 1.2); // mantel
      // Floor lamp and an armchair.
      ink(s, 1.6); s.beginPath(); s.moveTo(700, 176); s.lineTo(700, 108); s.stroke();
      blob(s, [[686, 112], [714, 112], [708, 96], [692, 96]]); fillInk(s, G[7], 1);
      // A plump sofa with a cushion that has a face.
      rrect(s, 140, 136, 76, 26, 9); fillInk(s, G[3], 1.3);                       // back
      rrect(s, 134, 150, 88, 22, 7); fillInk(s, G[4], 1.3);                       // seat
      rrect(s, 130, 144, 14, 28, 6); fillInk(s, G[3], 1.2); rrect(s, 212, 144, 14, 28, 6); fillInk(s, G[3], 1.2); // arms
      rrect(s, 152, 140, 22, 14, 6); fillInk(s, G[6], 1); face(s, 163, 146, 2.4);
      ink(s, 1.2); s.beginPath(); s.moveTo(142, 172); s.lineTo(140, 176); s.moveTo(214, 172); s.lineTo(216, 176); s.stroke();
      this.set = c;
      // Lighting grid across the top.
      const r = hi(W, 40), g = r.getContext('2d');
      g.fillStyle = G[1]; g.fillRect(0, 8, W, 3); g.fillRect(0, 15, W, 3); ink(g, 0.7);
      for (let k = 0; k < W; k += 8) { g.beginPath(); g.moveTo(k, 11); g.lineTo(k + 4, 15); g.stroke(); }
      this.lamps = [];
      for (let k = 40; k < W; k += 128) {
        rrect(g, k - 6, 18, 12, 11, 3); fillInk(g, G[2], 1);
        g.beginPath(); g.ellipse(k, 29, 5, 1.6, 0, 0, Math.PI * 2); g.fillStyle = G[7]; g.fill();
        this.lamps.push(k);
      }
      this.rig = r;
    },
    background(ctx, cam, t, mood) {
      KF.blit(ctx, this.back, 0, 0);
      tiled(ctx, this.set, cam.x, 0.35, 0);
      // Soft light cones from the rig.
      ctx.globalAlpha = 0.07;
      ctx.fillStyle = '#ffffff';
      for (const lx of this.lamps) {
        const x = wrapX(lx, cam.x, 0.55, 768) + 40;
        if (x < -60 || x > VW + 60) continue;
        ctx.beginPath(); ctx.moveTo(x - 4, 30); ctx.lineTo(x + 4, 30); ctx.lineTo(x + 46, 180); ctx.lineTo(x - 46, 180); ctx.fill();
      }
      ctx.globalAlpha = 1;
      tiled(ctx, this.rig, cam.x, 0.55, 0);
      // Boom mic swaying into shot.
      const mx = 250 - ((cam.x * 0.5) % 500), sw = Math.sin(t * 0.9) * 5;
      ink(ctx, 1.4); ctx.beginPath(); ctx.moveTo(mx - 80, 6); ctx.lineTo(mx + sw, 40); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(mx + sw, 44, 4, 6, 0.2, 0, Math.PI * 2); fillInk(ctx, G[2], 1);
      // APPLAUSE sign, lit when the crowd reacts.
      const lit = mood.cheer > 0.2 && Math.floor(t * 8) % 2 === 0 || mood.cheer > 0.9;
      const ax = VW / 2 + 80 - ((cam.x * 0.4) % 40);
      rrect(ctx, ax - 38, 50, 76, 15, 4); ctx.fillStyle = lit ? G[1] : G[0]; ctx.fill(); ink(ctx, 1.2); ctx.stroke(); // below the fight HUD
      ctx.font = `bold 9px ${SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (lit) { ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 8; }
      ctx.fillStyle = lit ? '#ffffff' : G[2]; ctx.fillText('APPLAUSE', ax, 58);
      ctx.shadowBlur = 0;
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid') { // stage risers: painted plank fronts with a polished lip
        slab(ctx, x, y, e, [G[4], G[2]], [G[7], G[5]], (c, x0, y0) => {
          c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 0.6;
          c.beginPath(); for (let k = 5; k < 16; k += 5) { c.moveTo(x0, y0 + k + 1); c.lineTo(x0 + 16, y0 + k + 1); } c.stroke();
          c.beginPath(); c.moveTo(x0 + 4 + seed * 8, y0 + 6); c.lineTo(x0 + 4 + seed * 8, y0 + 11); c.stroke();
        });
      } else if (art === 'alt') { // a prop TV set
        box(ctx, x, y, [G[3], G[1]], (c, x0, y0) => {
          rrect(c, x0 + 3, y0 + 3, 10, 8, 2.5); c.fillStyle = vgrad(c, y0 + 3, y0 + 11, [G[6], G[4]]); c.fill(); ink(c, 0.8); c.stroke();
          ink(c, 0.7); c.beginPath(); c.moveTo(x0 + 6, y0 + 0.5); c.lineTo(x0 + 4, y0 - 3); c.moveTo(x0 + 10, y0 + 0.5); c.lineTo(x0 + 12, y0 - 3); c.stroke();
          c.fillStyle = INK; c.beginPath(); c.arc(x0 + 5, y0 + 13, 0.9, 0, 7); c.arc(x0 + 11, y0 + 13, 0.9, 0, 7); c.fill();
        });
      } else if (art === 'ice') iceSlab(ctx, x, y, e);
      else plank(ctx, x, y, G[6], G[4]);
    },
  }));

  // ======================================================================
  // 2. ROOFTOPS: wobbly cartoon buildings with window eyes and bobbing water towers.
  // ======================================================================
  KF.Themes.add('oldtv_rooftop', Object.assign({}, shared, {
    id: 'oldtv_rooftop', title: 'ROOFTOPS', bg: G[6],
    build() {
      this.back = skyGrad(G[5], G[7]);
      const rnd = U.rng(71);
      const cl = hi(768, 90), c = cl.getContext('2d');
      for (let k = 0; k < 6; k++) cloud(c, 20 + k * 128 + rnd() * 30, 14 + rnd() * 40, 54 + rnd() * 30, k % 2 === 0);
      this.clouds = cl;
      const far = hi(640, VH), f = far.getContext('2d');
      for (let x = 0; x < 640;) { const w = 22 + rnd() * 30, h = 50 + rnd() * 60; blob(f, [[x, VH], [x + 1, VH - h], [x + w * 0.5, VH - h - 4 - rnd() * 6], [x + w - 1, VH - h], [x + w, VH]]); f.fillStyle = G[5]; f.fill(); x += w + 2; }
      this.far = far;
      // Mid buildings with lean, ink lines and window "eyes".
      const mid = hi(768, VH), m = mid.getContext('2d');
      this.eyes = [];
      for (let x = 0; x < 768;) {
        const w = 44 + rnd() * 40, top = 92 + rnd() * 40, lean = (rnd() - 0.5) * 6;
        blob(m, [[x, VH], [x + lean * 0.3, top + 10], [x + 2 + lean, top], [x + w * 0.5 + lean, top - 5], [x + w - 2 + lean, top], [x + w + lean * 0.3, top + 10], [x + w, VH]]);
        m.fillStyle = hgrad(m, x, x + w, [G[4], G[3], G[2]]); m.fill(); ink(m, 1.1); m.stroke();
        for (let wy = top + 12; wy < VH - 30; wy += 18) for (let wx = x + 8; wx < x + w - 12; wx += 16) {
          if (rnd() < 0.55) { m.beginPath(); m.ellipse(wx + 3, wy, 3, 4.5, 0, 0, Math.PI * 2); m.fillStyle = G[6]; m.fill(); ink(m, 0.7); m.stroke(); m.beginPath(); m.ellipse(wx + 9, wy, 3, 4.5, 0, 0, Math.PI * 2); m.fill(); m.stroke(); this.eyes.push({ x: wx + 6, y: wy, ph: rnd() * 9 }); }
        }
        x += w + 6 + rnd() * 14;
      }
      this.mid = mid;
      this.towers = [70, 260, 430, 610].map((x) => ({ x, ph: rnd() * 6 }));
    },
    background(ctx, cam, t, mood) {
      KF.blit(ctx, this.back, 0, 0);
      const cx = ((t * 4 + cam.x * 0.05) % 768);
      KF.blit(ctx, this.clouds, -cx, 0); KF.blit(ctx, this.clouds, 768 - cx, 0);
      tiled(ctx, this.far, cam.x, 0.12, 10);
      tiled(ctx, this.mid, cam.x, 0.3, 8);
      // Window eyes blink (and all squint when the crowd laughs).
      for (const e of this.eyes) {
        const x = wrapX(e.x, cam.x, 0.3, 768) + 40, b = mood.cheer > 0.5 ? 1 : (Math.sin(t * 1.3 + e.ph * 3) > 0.97 ? 1 : 0);
        if (x < -10 || x > VW + 10) continue;
        ctx.fillStyle = INK;
        if (b) { ctx.fillRect(x - 6, e.y + 7, 12, 1.2); continue; }
        ctx.beginPath(); ctx.arc(x - 3 + Math.sin(t + e.ph) * 0.8, e.y + 9.5, 1.3, 0, 7); ctx.arc(x + 3 + Math.sin(t + e.ph) * 0.8, e.y + 9.5, 1.3, 0, 7); ctx.fill();
      }
      // Water towers bounce to the music.
      for (const w of this.towers) {
        const x = wrapX(w.x, cam.x, 0.45, 768) + 40;
        if (x < -40 || x > VW + 40) continue;
        const bounce = Math.abs(Math.sin(t * 3 + w.ph)) * (2 + mood.cheer * 4), sq = 1 + Math.sin(t * 6 + w.ph) * 0.04;
        const by = 128 - bounce;
        ink(ctx, 1.2); ctx.beginPath(); ctx.moveTo(x - 9, 164); ctx.lineTo(x - 7, by + 14); ctx.moveTo(x + 9, 164); ctx.lineTo(x + 7, by + 14); ctx.moveTo(x - 8, 150); ctx.lineTo(x + 8, 140); ctx.stroke();
        ctx.save(); ctx.translate(x, by); ctx.scale(sq, 2 - sq);
        blob(ctx, [[-12, 14], [-13, -4], [-8, -10], [0, -15], [8, -10], [13, -4], [12, 14]]);
        ctx.fillStyle = hgrad(ctx, -12, 12, [G[6], G[4], G[3]]); ctx.fill(); ink(ctx, 1.2); ctx.stroke();
        face(ctx, 0, 0, 4, 0);
        ctx.restore();
      }
      // Chimney smoke.
      for (let k = 0; k < 3; k++) {
        const x = wrapX(150 + k * 250, cam.x, 0.3, 768) + 40, p = (t * 0.5 + k * 0.33) % 1;
        if (x > -30 && x < VW + 30) puff(ctx, x + p * 14, 104 - p * 40, 3 + p * 5, 0.8 * (1 - p));
      }
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid') { // soft bricks with a stone coping
        slab(ctx, x, y, e, [G[4], G[2]], [G[7], G[5]], (c, x0, y0) => {
          c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 0.6;
          c.beginPath();
          for (let k = 0; k < 4; k++) {
            const yy = y0 + 4 + k * 4; c.moveTo(x0, yy); c.lineTo(x0 + 16, yy);
            const off = (k + Math.floor(seed * 2)) % 2 ? 4 : 12; c.moveTo(x0 + off, yy - 4); c.lineTo(x0 + off, yy);
          }
          c.stroke();
        });
      } else if (art === 'alt') { // rooftop AC unit with a fan
        box(ctx, x, y, [G[5], G[3]], (c, x0, y0) => {
          c.beginPath(); c.arc(x0 + 8, y0 + 8, 4.5, 0, Math.PI * 2); c.fillStyle = G[2]; c.fill(); ink(c, 0.8); c.stroke();
          c.strokeStyle = G[5]; c.lineWidth = 0.8; c.beginPath(); c.moveTo(x0 + 4.5, y0 + 8); c.lineTo(x0 + 11.5, y0 + 8); c.moveTo(x0 + 8, y0 + 4.5); c.lineTo(x0 + 8, y0 + 11.5); c.stroke();
        });
      } else if (art === 'ice') iceSlab(ctx, x, y, e);
      else plank(ctx, x, y, G[6], G[4]);
    },
  }));

  // ======================================================================
  // 3. THE SKY EXPRESS: a grinning steam train racing across rolling hills.
  // ======================================================================
  KF.Themes.add('oldtv_train', Object.assign({}, shared, {
    id: 'oldtv_train', title: 'THE SKY EXPRESS', bg: G[6],
    build() {
      this.back = skyGrad(G[6], G[7]);
      const rnd = U.rng(19);
      const cl = hi(768, 80), c = cl.getContext('2d');
      for (let k = 0; k < 5; k++) cloud(c, 30 + k * 150 + rnd() * 30, 10 + rnd() * 36, 50 + rnd() * 30, k === 2);
      this.clouds = cl;
      const hills = hi(768, VH), h = hills.getContext('2d');
      h.beginPath(); h.moveTo(0, VH);
      for (let x = 0; x <= 768; x += 8) h.lineTo(x, 132 + Math.sin(x / 768 * Math.PI * 6) * 12 + Math.sin(x / 768 * Math.PI * 14) * 4);
      h.lineTo(768, VH); h.closePath(); h.fillStyle = vgrad(h, 110, VH, [G[5], G[4]]); h.fill(); ink(h, 1); h.stroke();
      for (let k = 0; k < 14; k++) { // round cartoon trees
        const x = 20 + k * 55 + rnd() * 20, yy = 132 + Math.sin(x / 768 * Math.PI * 6) * 12;
        ink(h, 1.2); h.beginPath(); h.moveTo(x, yy + 4); h.lineTo(x, yy - 6); h.stroke();
        h.beginPath(); h.arc(x, yy - 11, 6 + rnd() * 3, 0, Math.PI * 2); fillInk(h, G[3], 1);
      }
      this.hills = hills;
    },
    background(ctx, cam, t, mood) {
      KF.blit(ctx, this.back, 0, 0);
      const cx = ((t * 10 + cam.x * 0.05) % 768);
      KF.blit(ctx, this.clouds, -cx, 0); KF.blit(ctx, this.clouds, 768 - cx, 0);
      tiled(ctx, this.hills, cam.x + t * 40, 0.15, 0);
      // The locomotive with its grin, chugging along the hilltop track.
      const lx = ((t * 26 - cam.x * 0.25 + 260) % 640 + 640) % 640 - 100, ly = 120 + Math.sin(t * 9) * 0.8;
      ink(ctx, 1); ctx.beginPath(); ctx.moveTo(0, 141); ctx.lineTo(VW, 141); ctx.stroke();
      for (let k = 0; k < 3; k++) { // carriages
        const x = lx - 34 - k * 30;
        rrect(ctx, x, ly + 4, 27, 14, 3); fillInk(ctx, G[4], 1);
        rrect(ctx, x + 4, ly + 7, 8, 5, 1.5); fillInk(ctx, G[6], 0.7); rrect(ctx, x + 15, ly + 7, 8, 5, 1.5); fillInk(ctx, G[6], 0.7);
        for (const wx of [x + 6, x + 21]) { ctx.beginPath(); ctx.arc(wx, ly + 19, 3, 0, 7); fillInk(ctx, G[2], 0.8); }
      }
      rrect(ctx, lx - 4, ly - 6, 12, 22, 2); fillInk(ctx, G[3], 1.1);          // cab
      rrect(ctx, lx + 6, ly + 2, 26, 14, 7); fillInk(ctx, G[4], 1.1);          // boiler
      rrect(ctx, lx + 14, ly - 8, 6, 11, 2); fillInk(ctx, G[2], 1);            // funnel
      ctx.beginPath(); ctx.arc(lx + 31, ly + 9, 7, 0, 7); fillInk(ctx, G[6], 1.1);
      face(ctx, lx + 31, ly + 7, 2.8, mood.cheer > 0.6 ? 1 : 0);
      for (let k = 0; k < 3; k++) { // spinning wheels
        const wx = lx + 2 + k * 10, wy = ly + 19, a = t * 10;
        ctx.beginPath(); ctx.arc(wx, wy, 4, 0, 7); fillInk(ctx, G[5], 1);
        ink(ctx, 0.7); ctx.beginPath(); ctx.moveTo(wx + Math.cos(a) * 3.5, wy + Math.sin(a) * 3.5); ctx.lineTo(wx - Math.cos(a) * 3.5, wy - Math.sin(a) * 3.5); ctx.stroke();
      }
      for (let k = 0; k < 4; k++) { const p = (t * 1.4 + k / 4) % 1; puff(ctx, lx + 17 - p * 40, ly - 12 - p * 22, 3 + p * 6, 0.9 * (1 - p)); }
      // Telegraph poles whip past up close.
      const span = 150, off = ((cam.x * 0.9 + t * 160) % span + span) % span;
      for (let x = -off; x < VW + span; x += span) {
        ink(ctx, 2); ctx.beginPath(); ctx.moveTo(x, 176); ctx.lineTo(x, 70); ctx.moveTo(x - 9, 78); ctx.lineTo(x + 9, 78); ctx.stroke();
        ink(ctx, 0.7); ctx.beginPath(); ctx.moveTo(x - 8, 78); ctx.quadraticCurveTo(x + span / 2, 92, x + span - 8, 78); ctx.stroke();
      }
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid') { // carriage roof: riveted steel with a rounded roof lip
        slab(ctx, x, y, e, [G[4], G[2]], [G[6], G[4]], (c, x0, y0) => {
          c.fillStyle = 'rgba(0,0,0,0.35)';
          for (let k = 3; k < 16; k += 5) { c.beginPath(); c.arc(x0 + k, y0 + 9, 0.7, 0, 7); c.arc(x0 + k, y0 + 14, 0.7, 0, 7); c.fill(); }
          if (e.d === 1) { c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(x0, y0 + 4, 16, 3); }
        });
      } else if (art === 'alt') { // a strapped steamer trunk
        box(ctx, x, y, [G[3], G[1]], (c, x0, y0) => {
          c.fillStyle = G[5]; c.fillRect(x0 + 4, y0 + 1, 2, 14); c.fillRect(x0 + 10, y0 + 1, 2, 14);
          rrect(c, x0 + 6.5, y0 + 6, 3, 4, 1); c.fillStyle = G[6]; c.fill(); ink(c, 0.6); c.stroke();
        });
      } else if (art === 'ice') iceSlab(ctx, x, y, e);
      else plank(ctx, x, y, G[5], G[3]);
    },
  }));

  // ======================================================================
  // 4. THE DOCKS: rolling sea, a bobbing tugboat with a face, gulls, a lighthouse.
  // ======================================================================
  KF.Themes.add('oldtv_harbour', Object.assign({}, shared, {
    id: 'oldtv_harbour', title: 'THE DOCKS', bg: G[6],
    build() {
      this.back = skyGrad(G[5], G[7]);
      const rnd = U.rng(33);
      const cl = hi(768, 80), c = cl.getContext('2d');
      for (let k = 0; k < 5; k++) cloud(c, 40 + k * 150 + rnd() * 30, 12 + rnd() * 30, 46 + rnd() * 30, k === 1);
      this.clouds = cl;
      const far = hi(640, VH), f = far.getContext('2d'); // far shore with a lighthouse
      f.beginPath(); f.moveTo(0, 124); for (let x = 0; x <= 640; x += 16) f.lineTo(x, 120 - Math.sin(x / 640 * Math.PI * 4) * 6); f.lineTo(640, 130); f.lineTo(0, 130); f.closePath(); f.fillStyle = G[4]; f.fill();
      blob(f, [[300, 122], [303, 76], [311, 76], [314, 122]]); fillInk(f, G[6], 1);
      for (let k = 0; k < 3; k++) { f.fillStyle = G[2]; f.fillRect(302 + k * 0.3, 84 + k * 12, 11 - k * 0.6, 4); }
      rrect(f, 299, 68, 16, 9, 2); fillInk(f, G[2], 1);
      this.far = far;
      this.gulls = [0, 1, 2, 3].map((k) => ({ x: rnd() * 600, y: 30 + rnd() * 50, ph: rnd() * 6, sp: 10 + rnd() * 12 }));
    },
    background(ctx, cam, t, mood) {
      KF.blit(ctx, this.back, 0, 0);
      const cx = ((t * 5 + cam.x * 0.05) % 768);
      KF.blit(ctx, this.clouds, -cx, 0); KF.blit(ctx, this.clouds, 768 - cx, 0);
      tiled(ctx, this.far, cam.x, 0.1, 0);
      // Lighthouse beam sweeps.
      const lhx = wrapX(307, cam.x, 0.1, 640) + 40, ang = Math.sin(t * 0.8) * 0.9;
      if (lhx > -100 && lhx < VW + 100) {
        ctx.globalAlpha = 0.18; ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.moveTo(lhx, 72); ctx.lineTo(lhx + Math.cos(ang) * 200, 60 + Math.sin(ang) * 30); ctx.lineTo(lhx + Math.cos(ang) * 200, 90 + Math.sin(ang) * 30); ctx.fill();
        ctx.globalAlpha = 1;
      }
      // Sea: three rolling bands of cartoon waves.
      for (let b = 0; b < 3; b++) {
        const y0 = 128 + b * 18, par = 0.2 + b * 0.2, ph = t * (1 + b * 0.4);
        ctx.beginPath(); ctx.moveTo(0, VH);
        for (let x = -12; x <= VW + 12; x += 12) {
          const wx = x - ((cam.x * par) % 24);
          ctx.quadraticCurveTo(wx + 6, y0 - 4 + Math.sin(ph + x * 0.05) * 1.5, wx + 12, y0 + Math.sin(ph + (x + 12) * 0.05) * 1.5);
        }
        ctx.lineTo(VW, VH); ctx.closePath();
        ctx.fillStyle = vgrad(ctx, y0, VH, [G[5 - b], G[3 - b]]); ctx.fill(); ink(ctx, 0.9); ctx.stroke();
        if (b === 0) { // the tugboat rides the first band
          const tx = wrapX(200, cam.x, 0.3, 700) + 40, ty = y0 - 8 + Math.sin(t * 2) * 1.5, rock = Math.sin(t * 1.6) * 0.08;
          if (tx > -60 && tx < VW + 60) {
            ctx.save(); ctx.translate(tx, ty); ctx.rotate(rock);
            blob(ctx, [[-22, -2], [22, -2], [18, 8], [-18, 8]]); fillInk(ctx, G[2], 1.1);
            rrect(ctx, -10, -14, 18, 12, 3); fillInk(ctx, G[6], 1);
            rrect(ctx, 2, -24, 6, 11, 2); fillInk(ctx, G[1], 1);
            face(ctx, -1, -8, 2.6, mood.cheer > 0.6 ? 1 : 0);
            ctx.restore();
            for (let k = 0; k < 3; k++) { const p = (t * 0.9 + k / 3) % 1; puff(ctx, tx + 5 - p * 26, ty - 28 - p * 20, 2.5 + p * 5, 0.85 * (1 - p)); }
          }
        }
      }
      // Gulls (they flap faster when you die).
      for (const g of this.gulls) {
        const x = ((g.x + t * g.sp - cam.x * 0.2) % (VW + 80) + VW + 80) % (VW + 80) - 40, y = g.y + Math.sin(t + g.ph) * 4;
        const f = Math.sin(t * (6 + mood.cheer * 10) + g.ph) * 3;
        ink(ctx, 1.1); ctx.beginPath(); ctx.moveTo(x - 6, y - f); ctx.quadraticCurveTo(x - 3, y - 3 - f * 0.4, x, y); ctx.quadraticCurveTo(x + 3, y - 3 - f * 0.4, x + 6, y - f); ctx.stroke();
      }
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid') { // pier: plank deck on stout pilings
        slab(ctx, x, y, e, [G[4], G[2]], [G[6], G[4]], (c, x0, y0) => {
          c.strokeStyle = 'rgba(0,0,0,0.32)'; c.lineWidth = 0.6;
          c.beginPath(); c.moveTo(x0 + 5.5, y0); c.lineTo(x0 + 5.5, y0 + 16); c.moveTo(x0 + 11, y0); c.lineTo(x0 + 11, y0 + 16); c.stroke();
          c.fillStyle = 'rgba(0,0,0,0.28)'; c.beginPath(); c.arc(x0 + 3 + seed * 10, y0 + 10, 1, 0, 7); c.fill();
        });
      } else if (art === 'alt') { // a fat barrel
        box(ctx, x, y, [G[4], G[2]], (c, x0, y0) => {
          ink(c, 0.8); c.beginPath(); c.moveTo(x0 + 1, y0 + 4.5); c.quadraticCurveTo(x0 + 8, y0 + 6, x0 + 15, y0 + 4.5); c.moveTo(x0 + 1, y0 + 11.5); c.quadraticCurveTo(x0 + 8, y0 + 13, x0 + 15, y0 + 11.5); c.stroke();
        });
      } else if (art === 'ice') iceSlab(ctx, x, y, e);
      else plank(ctx, x, y, G[5], G[3]);
    },
  }));

  // ---------- the film look ----------
  // Four frames of film grain, each with the vignette baked in, so the whole film surface is one
  // full-screen draw per frame (full-screen filters cost far more).
  let film = null;
  function bakeFilm() {
    film = [];
    for (let k = 0; k < 4; k++) {
      const c = KF.makeHi(VW, VH, KF.HI_MAX), x = c.getContext('2d'), w = c.width, h = c.height;
      const img = x.createImageData(w, h), d = img.data, rnd = U.rng(91 + k);
      for (let i = 0; i < w * h; i++) {
        const r = rnd();
        if (r < 0.05) { const o = i * 4, v = r < 0.025 ? 0 : 255; d[o] = d[o + 1] = d[o + 2] = v; d[o + 3] = 35 + rnd() * 40; }
      }
      x.putImageData(img, 0, 0);
      const g = x.createRadialGradient(VW / 2, VH / 2, VH * 0.35, VW / 2, VH / 2, VW * 0.62);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.75)');
      x.fillStyle = g; x.fillRect(0, 0, VW, VH);
      film.push(c);
    }
  }

  Object.assign(KF.Styles.all.oldtv, {
    smooth: true, vecLook: 'rubberhose',
    theme: 'oldtv_studio', // the fallback place (fights with no level before them) is the smooth studio
    post: null, postOther: null, hiResPost: null, // all of it is done on the GPU below
    // The picture with gate weave (the places are drawn in greys, so no colour filter is needed:
    // full-screen filters are the most expensive thing a frame can do). The realm's "picture
    // rolls" rule (js/rules.js) is drawn here too.
    compose(ctx, wc, i) {
      const scene = KF.engine && KF.engine.scene, rule = scene && scene.rule;
      const dx = (i.rnd() - 0.5) * 0.5, dy = (i.rnd() - 0.5) * 0.4;
      ctx.save();
      const roll = rule && rule.roll, tm = scene && scene.time || 0;
      const rollT = roll && tm > roll.dur ? tm % roll.every : 1e9;
      if (roll && rollT < roll.dur && scene.phase === 'play') {
        const off = Math.round((rollT / roll.dur) * VH);
        KF.blit(ctx, wc, dx, off); KF.blit(ctx, wc, dx, off - VH);
        ctx.fillStyle = '#000'; ctx.fillRect(0, off - 3, VW, 5);
      } else KF.blit(ctx, wc, dx, dy);
      ctx.restore();
    },
    overlay(ctx, i) {
      if (!film) bakeFilm();
      ctx.save();
      KF.blit(ctx, film[i.frame % 4], 0, 0);
      // Scratches and dust on the film.
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 0.4;
      for (let k = 0; k < 2; k++) if (i.rnd() < 0.5) { const x = i.rnd() * VW; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + (i.rnd() - 0.5) * 3, VH); ctx.stroke(); }
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(i.rnd() * VW, i.rnd() * VH, 0.3 + i.rnd() * 0.8, 0, 7); ctx.fill(); }
      if (i.rnd() < 0.06) { ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(0, 0, VW, VH); } // flicker
      // The rounded glass of the TV.
      ctx.strokeStyle = '#000'; ctx.lineWidth = 10; ctx.beginPath(); ctx.roundRect(-4, -4, VW + 8, VH + 8, 26); ctx.stroke();
      ctx.font = `bold 9px ${SERIF}`; ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillText('CH 3', VW - 16, i.fight ? 62 : 22);
      ctx.restore();
    },
  });
})(window.KF);
