'use strict';
// Per-stage environments for the temple realm. Each stage is a different place and medium:
// a doodle in a school notebook, a sumi-e ink painting, jungle ruins through night vision,
// (text mode, defined in styles.js), and a toy-block playroom in 3D.
(function (KF) {
  const K = KF.ThemeKit, R = K.R, U = KF.util, VW = KF.VIEW_W, VH = KF.VIEW_H;
  const F = () => KF.Font;
  const NOISE = new Float32Array(1 << 16), NM = (1 << 16) - 1;
  { const r = U.rng(77); for (let i = 0; i < NOISE.length; i++) NOISE[i] = r(); }
  const lum = (d, o) => (d[o] * 77 + d[o + 1] * 150 + d[o + 2] * 29) >> 8;
  const ROT = { up: 0, down: Math.PI, left: -Math.PI / 2, right: Math.PI / 2 };

  // Hand-drawn polyline: each segment is split into short steps with a little jitter.
  function wobble(ctx, pts, rnd, amp = 0.4, close = false) {
    ctx.beginPath();
    const P = close ? pts.concat([pts[0]]) : pts;
    ctx.moveTo(P[0][0], P[0][1]);
    for (let i = 1; i < P.length; i++) {
      const [x0, y0] = P[i - 1], [x1, y1] = P[i], n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / 3));
      for (let k = 1; k <= n; k++) {
        const f = k / n, j = k === n ? 0 : amp;
        ctx.lineTo(x0 + (x1 - x0) * f + (rnd() - 0.5) * j * 2, y0 + (y1 - y0) * f + (rnd() - 0.5) * j * 2);
      }
    }
  }
  function pencil(ctx, pts, rnd, o = {}) {
    ctx.strokeStyle = o.color || '#55555f'; ctx.lineWidth = o.w || 0.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.globalAlpha = o.a ?? 0.6;
    wobble(ctx, pts, rnd, o.amp ?? 0.45, o.close); ctx.stroke();
    if (o.twice !== false) { ctx.globalAlpha *= 0.55; wobble(ctx, pts, rnd, (o.amp ?? 0.45) * 1.4, o.close); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  const circlePts = (cx, cy, rx, ry, n = 18, a0 = 0, a1 = Math.PI * 2) => {
    const out = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return out;
  };
  function shade(hex, k) {
    const [r, g, b] = K.hexRGB(hex);
    const f = (v) => Math.max(0, Math.min(255, Math.round(v * k))).toString(16).padStart(2, '0');
    return '#' + f(r) + f(g) + f(b);
  }
  // Doors share the flip/legs logic; `body(ctx, x, y, o)` draws the 16x32 door itself.
  function doorWith(body) {
    return function (ctx, x, y, o = {}) {
      x = Math.round(x); y = Math.round(y);
      ctx.save();
      if (o.flipped) { ctx.translate(0, y * 2 + 32); ctx.scale(1, -1); }
      if (o.legs) {
        const k = Math.floor(o.legs * 12) % 2;
        R(ctx, this.legColor || '#2a2a30', x + 3 + k, y + 31, 2, 4); R(ctx, this.legColor || '#2a2a30', x + 11 - k, y + 31, 2, 4);
        R(ctx, this.legColor || '#2a2a30', x + 2 + k, y + 34, 4, 1); R(ctx, this.legColor || '#2a2a30', x + 10 - k, y + 34, 4, 1);
      }
      body.call(this, ctx, x, y, o);
      ctx.restore();
    };
  }
  function rotated(ctx, x, y, dir, fn) {
    ctx.save(); ctx.translate(x + 8, y + 8); ctx.rotate(ROT[dir] || 0); ctx.translate(-8, -8); fn(); ctx.restore();
  }

  // =====================================================================
  // 1. SKETCHBOOK: the stage is a doodle in a school exercise book.
  // The page scrolls with the stage (it is drawn on it), so everything sits at parallax 1.
  // =====================================================================
  const GRAPH = '#34343e';
  KF.Env.add('sketch', {
    name: 'NOTEBOOK', bg: '#f4f0e4',
    signBoard: '#fffdf4', signInk: '#2e2e3a',
    zone: { gravity: '#6a5aff', reverse: '#ff3aa0' },
    legColor: GRAPH,
    build() {
      const PW = 768, rnd = U.rng(901);
      this.page = KF.makeHi(PW, VH);
      const p = this.page.getContext('2d');
      R(p, '#f4f0e4', 0, 0, PW, VH);
      for (let i = 0; i < 2600; i++) R(p, rnd() < 0.5 ? '#e8e2d2' : '#faf7ee', rnd() * PW, rnd() * VH, 0.5, 0.5);
      for (let y = 34; y < VH; y += 12) R(p, '#aac2e6', 0, y, PW, 0.5);
      R(p, '#e09a9a', 30, 0, 0.5, VH); R(p, '#e8b0b0', 31.5, 0, 0.5, VH);
      for (const hy of [52, 108, 164]) { // punched holes show the desk underneath
        p.fillStyle = '#b8a888'; p.beginPath(); p.arc(12, hy, 4.5, 0, 7); p.fill();
        p.fillStyle = '#9a8a6a'; p.beginPath(); p.arc(12, hy - 1, 4.5, Math.PI, 0); p.fill();
      }
      // eraser smudges, with a ghost of what was rubbed out
      for (const [sx, sy] of [[150, 70], [610, 130], [420, 150]]) {
        const g = p.createRadialGradient(sx, sy, 2, sx, sy, 24);
        g.addColorStop(0, 'rgba(140,136,130,0.13)'); g.addColorStop(1, 'rgba(140,136,130,0)');
        p.fillStyle = g; p.fillRect(sx - 30, sy - 20, 60, 40);
      }
      p.globalAlpha = 0.18; F().draw(p, 'LEVEL 1?', 132, 66, GRAPH, 1); F().draw(p, 'BOSS HERE', 596, 126, GRAPH, 1); p.globalAlpha = 1;
      // coffee ring
      p.strokeStyle = 'rgba(140,90,40,0.28)'; p.lineWidth = 2.2;
      p.beginPath(); p.arc(330, 112, 22, 0.3, 5.6); p.stroke();
      p.strokeStyle = 'rgba(140,90,40,0.16)'; p.lineWidth = 0.8; p.beginPath(); p.arc(331, 113, 19, 0, 7); p.stroke();
      p.fillStyle = 'rgba(160,110,50,0.06)'; p.beginPath(); p.arc(330, 112, 21, 0, 7); p.fill();
      // --- doodles ---
      const pen = (pts, o) => pencil(p, pts, rnd, o);
      // pagoda
      const pg = (cx, base) => {
        pen([[cx - 26, base], [cx + 26, base]], { w: 0.8 });
        const tiers = [[base, 20, 16], [base - 22, 15, 13], [base - 40, 10, 11]];
        for (const [b, hw, h] of tiers) {
          pen([[cx - hw, b], [cx - hw, b - h + 4], [cx + hw, b - h + 4], [cx + hw, b]]);
          pen([[cx - hw - 9, b - h + 6], [cx - hw + 2, b - h], [cx + hw - 2, b - h], [cx + hw + 9, b - h + 6]], { w: 0.8 });
          for (let k = -hw + 3; k < hw - 2; k += 2) pen([[cx + k, b - h + 1], [cx + k + 2, b - h + 4]], { a: 0.35, twice: false });
        }
        pen([[cx, base - 52], [cx, base - 64]]); pen(circlePts(cx, base - 66, 2, 2, 8), { close: true });
        pen([[cx - 4, base], [cx - 4, base - 9], [cx + 4, base - 9], [cx + 4, base]]);
      };
      pg(110, 150);
      // dragon: a wavy two-line body with scales, back spikes and a horned head
      const dx0 = 400, dy0 = 76, body = [], belly = [];
      for (let i = 0; i <= 40; i++) { const x = dx0 + i * 4, y = dy0 + Math.sin(i * 0.38) * 10; body.push([x, y]); belly.push([x, y + 7 - i * 0.1]); }
      pen(body, { w: 0.8 }); pen(belly, { w: 0.7 });
      for (let i = 2; i < 40; i += 3) { const [x, y] = body[i]; pen([[x - 1.5, y], [x, y - 4], [x + 1.5, y]], { a: 0.55, twice: false }); }
      for (let i = 1; i < 40; i += 2) { const [x, y] = body[i]; pen(circlePts(x + 1, y + 3.5, 1.6, 1.4, 6, 0, Math.PI), { a: 0.3, twice: false }); }
      const [hx, hy] = body[40];
      pen([[hx, hy], [hx + 8, hy - 3], [hx + 14, hy + 1], [hx + 12, hy + 5], [hx + 4, hy + 6], [hx, belly[40][1]]], { w: 0.8 });
      pen([[hx + 6, hy - 2], [hx + 4, hy - 9]]); pen([[hx + 9, hy - 2], [hx + 10, hy - 9]]);
      R(p, GRAPH, hx + 8, hy + 0.5, 1, 1);
      pen([[hx + 14, hy + 2], [hx + 20, hy - 1], [hx + 24, hy + 3]], { color: '#c04030', a: 0.5 }); // fire!
      pen([[hx + 14, hy + 3], [hx + 22, hy + 4]], { color: '#c04030', a: 0.45 });
      pen([[dx0, dy0], [dx0 - 8, dy0 + 6], [dx0 - 4, dy0 - 2]]);
      // mountains, sun with a face, birds
      pen([[200, 150], [228, 104], [244, 124], [266, 92], [300, 150]], { a: 0.45 });
      pen([[262, 98], [266, 92], [271, 99]], { a: 0.4 });
      pen(circlePts(690, 66, 11, 11, 18), { close: true });
      for (let k = 0; k < 10; k++) { const a = k * 0.628; pen([[690 + Math.cos(a) * 14, 66 + Math.sin(a) * 14], [690 + Math.cos(a) * 19, 66 + Math.sin(a) * 19]], { twice: false }); }
      R(p, GRAPH, 686, 63, 1, 1.5); R(p, GRAPH, 693, 63, 1, 1.5); pen(circlePts(690, 67, 5, 3.5, 8, 0.3, Math.PI - 0.3), { twice: false });
      for (const [bx, by] of [[560, 60], [574, 52], [586, 64]]) pen([[bx - 4, by - 2], [bx, by], [bx + 4, by - 2]], { twice: false, a: 0.5 });
      // stick-figure duel
      const stick = (x, y, kick) => {
        pen(circlePts(x, y - 16, 2.5, 2.5, 8), { close: true, twice: false });
        pen([[x, y - 13], [x, y - 6]], { twice: false });
        pen(kick ? [[x, y - 6], [x + 8, y - 9]] : [[x, y - 6], [x - 3, y]], { twice: false });
        pen([[x, y - 6], [x + 2, y]], { twice: false });
        pen([[x - 4, y - 11], [x, y - 11], [x + 4, y - 13]], { twice: false });
      };
      stick(520, 150, true); stick(536, 150, false);
      pen([[527, 136], [530, 132]], { color: '#c04030', twice: false }); pen([[531, 137], [535, 134]], { color: '#c04030', twice: false });
      // scribbled title, arrow, tic-tac-toe, hearts, stars
      p.save(); p.translate(172, 46); p.rotate(-0.06); p.globalAlpha = 0.45; F().draw(p, 'KUNG FU!!!', 0, 0, GRAPH, 2); p.restore(); p.globalAlpha = 1;
      pen([[172, 64], [260, 62]], { w: 0.7, a: 0.5 }); pen([[174, 66], [250, 65]], { w: 0.5, a: 0.4 });
      pen([[630, 150], [668, 150]], { w: 0.8 }); pen([[662, 146], [668, 150], [662, 154]], { w: 0.8 });
      p.globalAlpha = 0.5; F().draw(p, 'THIS WAY', 630, 138, GRAPH); p.globalAlpha = 1;
      const tx = 740, ty = 90;
      pen([[tx + 6, ty], [tx + 6, ty + 18]], { twice: false }); pen([[tx + 12, ty], [tx + 12, ty + 18]], { twice: false });
      pen([[tx, ty + 6], [tx + 18, ty + 6]], { twice: false }); pen([[tx, ty + 12], [tx + 18, ty + 12]], { twice: false });
      pen([[tx + 1, ty + 1], [tx + 5, ty + 5]], { twice: false }); pen([[tx + 5, ty + 1], [tx + 1, ty + 5]], { twice: false });
      pen(circlePts(tx + 9, ty + 9, 2, 2, 8), { close: true, twice: false });
      pen([[tx + 13, ty + 13], [tx + 17, ty + 17]], { twice: false }); pen([[tx + 17, ty + 13], [tx + 13, ty + 17]], { twice: false });
      const heart = (x, y) => pen([[x, y + 4], [x - 4, y], [x - 3, y - 2], [x, y - 1], [x + 3, y - 2], [x + 4, y], [x, y + 4]], { color: '#c04060', a: 0.55 });
      heart(370, 140); heart(380, 146);
      const star = (x, y, r) => { const pts = []; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r; pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); } pen(pts, { close: true, twice: false }); };
      star(300, 50, 5); star(480, 128, 4); star(60, 80, 4);
      // sticky note
      p.save(); p.translate(456, 96); p.rotate(0.05);
      R(p, 'rgba(0,0,0,0.08)', 2, 2, 44, 36); R(p, '#fbe77a', 0, 0, 44, 36); R(p, '#f4d860', 0, 0, 44, 4);
      F().draw(p, "DON'T", 5, 9, '#3a3a70'); F().draw(p, 'DIE', 5, 18, '#3a3a70'); F().draw(p, '- ME', 18, 27, '#3a3a70');
      p.restore();
      this.page.lw = PW;
    },
    background(ctx, cam, t, mood) {
      K.tiled(ctx, this.page, cam.x, 1);
      // a row of stick-figure spectators doodled along the bottom: they cheer when you die
      const rnd = U.rng(5), span = 520;
      ctx.strokeStyle = GRAPH; ctx.lineWidth = 0.55; ctx.globalAlpha = 0.5; ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < 9; i++) {
        const wx = i * 58 + rnd() * 20, x = Math.round(K.wrapX(wx, cam.x, 1, span)) + 24;
        if (x < -10 || x > VW + 10) { rnd(); continue; }
        const ph = rnd() * 6, jump = mood.cheer > 0 ? Math.abs(Math.sin(t * 10 + ph)) * 4 * Math.min(1, mood.cheer) : 0;
        const y = 165 - jump, up = mood.cheer > 0.25;
        ctx.moveTo(x + 2, y - 12); ctx.arc(x, y - 12, 2, 0, 7);
        ctx.moveTo(x, y - 10); ctx.lineTo(x, y - 4); ctx.lineTo(x - 2, y); ctx.moveTo(x, y - 4); ctx.lineTo(x + 2, y);
        if (up) { ctx.moveTo(x - 3, y - 13); ctx.lineTo(x, y - 8); ctx.lineTo(x + 3, y - 13); }
        else { ctx.moveTo(x - 3, y - 6); ctx.lineTo(x, y - 8); ctx.lineTo(x + 3, y - 6); }
      }
      ctx.stroke(); ctx.globalAlpha = 1;
      if (mood.cheer > 0.3) { // scribbled laughter
        ctx.globalAlpha = Math.min(1, mood.cheer - 0.3);
        for (let k = 0; k < 3; k++) {
          const x = 70 + k * 110 + Math.sin(t * 3 + k) * 4, y = 86 + (k % 2) * 18;
          F().draw(ctx, k === 1 ? 'LOL' : 'HA!', x, y, '#c04030', 2);
        }
        ctx.globalAlpha = 1;
      }
    },
    tile(ctx, x, y, art, e, seed) {
      const rnd = U.rng(Math.floor(seed * 1e6) + 3);
      if (art === 'oneway') { // a wooden ruler laid on the page
        R(ctx, '#d8bc62', x, y, 16, 4); R(ctx, '#ecd88e', x, y, 16, 1); R(ctx, '#a88a34', x, y + 4, 16, 0.5);
        for (let i = 0; i < 16; i += 2) R(ctx, '#5a4a1a', x + i, y + 1, 0.5, (x + i) % 8 === 0 ? 2.5 : 1.2);
        return;
      }
      const ice = art === 'ice', alt = art === 'alt';
      const ink = alt ? '#2a4a9a' : ice ? '#3a6ab0' : GRAPH;
      R(ctx, alt ? '#efe3c4' : ice ? '#e2ecf8' : '#f8f5ec', x, y, 16, 16);
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, 16, 16); ctx.clip();
      ctx.lineWidth = 0.5; ctx.strokeStyle = alt ? '#8a7a5a' : ice ? '#7aa4dc' : '#7c7c88'; ctx.globalAlpha = 0.55;
      ctx.beginPath();
      const top = e.t ? 4 : 0, dense = !alt && (e.d || 0) >= 2;
      for (let k = -16; k < 16; k += 3) { ctx.moveTo(x + k, y + 16); ctx.lineTo(x + k + 16 - top, y + top); }
      if (dense) for (let k = 0; k < 32; k += 6) { ctx.moveTo(x + k - 16, y); ctx.lineTo(x + k, y + 16); }
      ctx.stroke(); ctx.restore(); ctx.globalAlpha = 1;
      if (alt) { // a doodled crate: plank lines and a cross brace
        pencil(ctx, [[x + 2, y + 2], [x + 14, y + 14]], rnd, { color: ink, a: 0.7 });
        pencil(ctx, [[x + 14, y + 2], [x + 2, y + 14]], rnd, { color: ink, a: 0.7 });
        pencil(ctx, [[x + 1.5, y + 1.5], [x + 14.5, y + 1.5], [x + 14.5, y + 14.5], [x + 1.5, y + 14.5]], rnd, { color: ink, close: true, a: 0.8 });
      }
      if (ice) { pencil(ctx, [[x + 3, y + 10], [x + 7, y + 6]], rnd, { color: '#ffffff', w: 1, a: 0.9, twice: false }); }
      const line = (pts, w) => pencil(ctx, pts, rnd, { color: ink, w, a: 0.9, amp: 0.3 });
      if (e.t) { line([[x, y + 0.5], [x + 16, y + 0.5]], 1.1); line([[x, y + 2], [x + 16, y + 2]], 0.5); }
      if (e.b) line([[x, y + 15.5], [x + 16, y + 15.5]], 0.8);
      if (e.l) line([[x + 0.5, y], [x + 0.5, y + 16]], 0.9);
      if (e.r) line([[x + 15.5, y], [x + 15.5, y + 16]], 0.9);
      if (e.t && seed < 0.35) for (let k = 0; k < 3; k++) { const gx = x + 2 + rnd() * 12; pencil(ctx, [[gx, y], [gx + 1, y - 2.5]], rnd, { color: GRAPH, twice: false, a: 0.6 }); }
    },
    spike(ctx, x, y, dir) {
      rotated(ctx, x, y, dir, () => {
        const rnd = U.rng(x * 31 + y);
        for (const ox of [0, 8]) {
          const pts = [[ox + 0.5, 16], [ox + 4, 5], [ox + 7.5, 16]];
          ctx.fillStyle = '#f0b0aa'; ctx.beginPath(); ctx.moveTo(...pts[0]); ctx.lineTo(...pts[1]); ctx.lineTo(...pts[2]); ctx.fill();
          ctx.save(); ctx.clip(); ctx.strokeStyle = '#d03828'; ctx.lineWidth = 0.5; ctx.beginPath();
          for (let k = 0; k < 10; k += 1.5) { ctx.moveTo(ox + k - 3, 16); ctx.lineTo(ox + k + 2, 5); }
          ctx.stroke(); ctx.restore();
          pencil(ctx, pts, rnd, { color: '#22222a', w: 0.9, a: 1, amp: 0.25 });
        }
        R(ctx, '#d03828', 0, 15, 16, 1);
      });
    },
    door: doorWith(function (ctx, x, y, o) {
      const rnd = U.rng(77), open = o.open || 0;
      R(ctx, '#f8f5ec', x, y + 4, 16, 28);
      if (open > 0) { ctx.globalAlpha = 0.5 + 0.5 * open; R(ctx, '#fff070', x + 2, y + 6, 12, 26); ctx.globalAlpha = 1; }
      else {
        ctx.save(); ctx.beginPath(); ctx.rect(x + 2, y + 6, 12, 26); ctx.clip();
        ctx.strokeStyle = '#8a8a96'; ctx.lineWidth = 0.5; ctx.beginPath();
        for (let k = -30; k < 16; k += 3) { ctx.moveTo(x + k, y + 32); ctx.lineTo(x + k + 28, y + 4); }
        ctx.stroke(); ctx.restore();
        pencil(ctx, circlePts(x + 11, y + 20, 1.3, 1.3, 6), rnd, { close: true, color: GRAPH, a: 1, twice: false });
      }
      pencil(ctx, [[x, y + 32], [x, y + 6], [x + 8, y + 1], [x + 16, y + 6], [x + 16, y + 32]], rnd, { color: GRAPH, w: 1.1, a: 1, amp: 0.3 });
      pencil(ctx, [[x + 2, y + 32], [x + 2, y + 7], [x + 14, y + 7], [x + 14, y + 32]], rnd, { color: GRAPH, w: 0.6, a: 0.9 });
      if (o.lantern) { // the real exit gets circled in red pen
        F().draw(ctx, 'EXIT', x + 8, y - 12, '#c02a20', 1, 'center');
        const wob = Math.sin((o.t || 0) * 5) * 0.6;
        pencil(ctx, circlePts(x + 8, y - 9, 14 + wob, 6, 16, -0.4, Math.PI * 2 + 0.2), U.rng(3), { color: '#c02a20', w: 0.8, a: 0.9, twice: false });
      }
    }),
    spring(ctx, x, y, squash) {
      const h = 6 - squash * 4, rnd = U.rng(9), pts = [];
      for (let i = 0; i <= 6; i++) pts.push([x + (i % 2 ? 12 : 4), y + 16 - (i / 6) * h]);
      pencil(ctx, pts, rnd, { color: GRAPH, w: 0.8, a: 1, twice: false });
      R(ctx, '#f6d040', x + 2, y + 16 - h - 3, 12, 2.5);
      pencil(ctx, [[x + 2, y + 16 - h - 3], [x + 14, y + 16 - h - 3], [x + 14, y + 16 - h - 0.5], [x + 2, y + 16 - h - 0.5]], rnd, { close: true, color: GRAPH, a: 1, twice: false });
    },
    sign(ctx, x, y, text) { // a scrap of paper taped to the page
      const w = F().measure(text) + 8, bx = Math.round(x - w / 2), by = Math.round(y);
      R(ctx, 'rgba(0,0,0,0.07)', bx + 1, by + 1, w, 11);
      R(ctx, '#fffdf6', bx, by, w, 11);
      ctx.strokeStyle = '#9a9aa6'; ctx.lineWidth = 0.5; ctx.strokeRect(bx + 0.25, by + 0.25, w - 0.5, 10.5);
      ctx.globalAlpha = 0.6; R(ctx, '#e8e0b0', bx - 3, by - 2, 7, 4); R(ctx, '#e8e0b0', bx + w - 4, by - 2, 7, 4); ctx.globalAlpha = 1;
      F().draw(ctx, text, bx + 4, by + 2, '#2e2e3a');
    },
  }, {
    // The page is already drawn in pencil; this just turns the colour pencils down a bit.
    post(d, W, H) {
      for (let k = 0, n = W * H * 4; k < n; k += 4) {
        const l = lum(d, k);
        d[k] = d[k] + (l - d[k]) * 0.4; d[k + 1] = d[k + 1] + (l - d[k + 1]) * 0.4; d[k + 2] = d[k + 2] + (l - d[k + 2]) * 0.4;
      }
    },
  });

  // =====================================================================
  // 2. INK WASH: a sumi-e landscape on rice paper. Black ink, grey washes, one red.
  // =====================================================================
  const INK = '#18161a';
  function peaks(c, w, seed, col, alpha, base, minH, maxH, n) {
    const x = c.getContext('2d'), rnd = U.rng(seed);
    for (let i = 0; i < n; i++) {
      const cx = rnd() * w, h = minH + rnd() * (maxH - minH), hw = 14 + rnd() * 34, top = base - h;
      for (const off of [0, w, -w]) { // wrap so the strip tiles seamlessly
        const px = cx + off;
        if (px < -hw * 2 || px > w + hw * 2) continue;
        const g = x.createLinearGradient(0, top, 0, base + 10);
        g.addColorStop(0, `rgba(${col},${alpha})`); g.addColorStop(0.55, `rgba(${col},${alpha * 0.45})`); g.addColorStop(1, `rgba(${col},0)`);
        x.fillStyle = g;
        x.beginPath(); x.moveTo(px - hw * 2.2, base + 10);
        for (let k = 0; k <= 20; k++) {
          const f = k / 20 * 2 - 1, yy = top + h * Math.pow(Math.abs(f), 0.7) + Math.sin(k * 1.7 + seed) * 1.5;
          x.lineTo(px + f * hw * 2.2, yy);
        }
        x.lineTo(px + hw * 2.2, base + 10); x.closePath(); x.fill();
        // dark ridge stroke
        x.strokeStyle = `rgba(${col},${Math.min(1, alpha * 1.4)})`; x.lineWidth = 0.6;
        x.beginPath();
        for (let k = 4; k <= 16; k++) { const f = k / 20 * 2 - 1; const yy = top + h * Math.pow(Math.abs(f), 0.7); k === 4 ? x.moveTo(px + f * hw * 2.2, yy) : x.lineTo(px + f * hw * 2.2, yy); }
        x.stroke();
      }
    }
  }
  KF.Env.add('ink', {
    name: 'INK WASH', bg: '#efe6d2',
    signBoard: '#f6efdc', signInk: INK, signPost: '#3a3632', signShade: '#cfc4a8',
    zone: { gravity: '#6a6a9a', reverse: '#b8281e' },
    legColor: INK,
    build() {
      const rnd = U.rng(311);
      this.paper = KF.makeHi(VW, VH);
      const p = this.paper.getContext('2d');
      R(p, '#efe6d2', 0, 0, VW, VH);
      for (let i = 0; i < 40; i++) { // mottled paper
        const g = p.createRadialGradient(0, 0, 0, 0, 0, 1), cx = rnd() * VW, cy = rnd() * VH, r = 20 + rnd() * 50;
        p.save(); p.translate(cx, cy); p.scale(r, r * 0.7);
        g.addColorStop(0, rnd() < 0.5 ? 'rgba(200,184,150,0.10)' : 'rgba(255,250,236,0.18)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        p.fillStyle = g; p.fillRect(-1, -1, 2, 2); p.restore();
      }
      p.strokeStyle = 'rgba(150,130,100,0.16)'; p.lineWidth = 0.4; p.beginPath();
      for (let i = 0; i < 500; i++) { const x = rnd() * VW, y = rnd() * VH, a = rnd() * 6.28, l = 1 + rnd() * 4; p.moveTo(x, y); p.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); }
      p.stroke();
      // a column of brushed "calligraphy" top-left, under the HUD
      p.strokeStyle = 'rgba(24,22,26,0.5)'; p.lineCap = 'round';
      for (let k = 0; k < 6; k++) { // each glyph: a few random brush strokes inside a 9px cell
        const cx = 24, cy = 80 + k * 12;
        for (let j = 0; j < 3 + (k % 2); j++) {
          const kind = rnd(), x0 = cx - 4 + rnd() * 3, y0 = cy - 4 + rnd() * 6;
          p.lineWidth = 0.6 + rnd() * 0.7; p.beginPath();
          if (kind < 0.35) { p.moveTo(x0, y0); p.lineTo(x0 + 5 + rnd() * 3, y0 + (rnd() - 0.5)); }
          else if (kind < 0.65) { p.moveTo(x0 + 3, y0 - 1); p.lineTo(x0 + 3 + (rnd() - 0.5) * 2, y0 + 6); }
          else { p.moveTo(x0 + 4, y0); p.quadraticCurveTo(x0 + 2, y0 + 3, x0 - 1, y0 + 5); }
          p.stroke();
        }
        if (rnd() < 0.5) { p.fillStyle = 'rgba(24,22,26,0.5)'; p.beginPath(); p.arc(cx + 3, cy - 3, 0.7, 0, 7); p.fill(); }
      }
      this.far = KF.makeHi(640, VH); this.far.lw = 640;
      peaks(this.far, 640, 5, '120,114,104', 0.32, 150, 50, 100, 9);
      this.mid = KF.makeHi(768, VH); this.mid.lw = 768;
      peaks(this.mid, 768, 9, '70,66,60', 0.5, 158, 26, 64, 7);
      const m = this.mid.getContext('2d');
      // lake: horizontal ripple strokes; a pine leaning out from a cliff
      m.strokeStyle = 'rgba(70,66,60,0.3)'; m.lineWidth = 0.5; m.beginPath();
      for (let i = 0; i < 90; i++) { const x = rnd() * 768, y = 150 + rnd() * 20, l = 4 + rnd() * 16; m.moveTo(x, y); m.lineTo(x + l, y); }
      m.stroke();
      const pine = (px, py) => {
        m.strokeStyle = INK; m.lineCap = 'round'; m.lineWidth = 2;
        m.beginPath(); m.moveTo(px, py); m.bezierCurveTo(px + 6, py - 14, px - 4, py - 22, px + 14, py - 36); m.stroke();
        m.lineWidth = 1; m.beginPath(); m.moveTo(px + 4, py - 18); m.lineTo(px + 18, py - 24); m.stroke();
        for (const [cx, cy, r] of [[px + 14, py - 38, 9], [px + 20, py - 26, 7], [px + 4, py - 30, 6]]) {
          m.fillStyle = 'rgba(24,22,26,0.75)';
          for (let k = 0; k < 9; k++) { m.beginPath(); m.ellipse(cx + (k - 4) * r * 0.22, cy + Math.sin(k) * 1.4, r * 0.35, 1.3, 0, 0, 7); m.fill(); }
        }
      };
      pine(120, 132); pine(520, 140);
      this.bamboo = KF.makeHi(768, VH); this.bamboo.lw = 768;
      const b = this.bamboo.getContext('2d');
      for (let i = 0; i < 9; i++) {
        const bx = 30 + i * 84 + rnd() * 30, a = 0.16 + rnd() * 0.24, w = 2.5 + rnd() * 1.5, lean = (rnd() - 0.5) * 6;
        b.globalAlpha = a;
        for (let y = -4; y < 176; y += 17) {
          const x0 = bx + lean * (y / 176);
          R(b, '#2a2824', x0, y, w, 15.5);
          R(b, '#5a564e', x0 + 0.5, y + 1, 0.5, 13);
          R(b, INK, x0 - 0.5, y + 15.5, w + 1, 1.2);
        }
        b.fillStyle = INK;
        for (let k = 0; k < 7; k++) { // leaves: tapered brush strokes
          const ly = 10 + rnd() * 130, dir = rnd() < 0.5 ? -1 : 1, lx = bx + lean * (ly / 176) + (dir > 0 ? w : 0);
          for (let j = 0; j < 3; j++) {
            b.save(); b.translate(lx, ly + j * 3); b.rotate(dir * (0.3 + j * 0.25) + (dir < 0 ? Math.PI : 0));
            b.beginPath(); b.moveTo(0, 0); b.quadraticCurveTo(7, -2, 15, 0); b.quadraticCurveTo(7, 1.6, 0, 0); b.fill(); b.restore();
          }
        }
      }
      b.globalAlpha = 1;
    },
    background(ctx, cam, t, mood) {
      KF.blit(ctx, this.paper, 0, 0);
      K.tiled(ctx, this.far, cam.x, 0.06, -8);
      K.tiled(ctx, this.mid, cam.x, 0.16);
      // the lone fisherman, bobbing on the lake
      const bx = Math.round(K.wrapX(300, cam.x, 0.16, 768)) + 24, by = 156 + Math.sin(t * 1.4) * 0.8;
      if (bx > -30 && bx < VW + 30) {
        ctx.fillStyle = INK;
        ctx.beginPath(); ctx.moveTo(bx - 12, by); ctx.quadraticCurveTo(bx, by + 4, bx + 12, by - 1); ctx.lineTo(bx + 9, by + 1); ctx.quadraticCurveTo(bx, by + 2.5, bx - 10, by + 0.5); ctx.fill();
        R(ctx, INK, bx - 1, by - 6, 2, 6);
        ctx.beginPath(); ctx.moveTo(bx - 4, by - 6); ctx.lineTo(bx, by - 9); ctx.lineTo(bx + 4, by - 6); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(bx + 1, by - 4); ctx.lineTo(bx + 16, by - 14); ctx.stroke();
        ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(bx + 16, by - 14); ctx.lineTo(bx + 17, by + 3 + Math.sin(t * 2)); ctx.stroke(); ctx.globalAlpha = 1;
      }
      // cranes / birds: flap, and scatter higher when the crowd... the mountains... laugh
      const flock = 5 + Math.round(mood.cheer * 4);
      ctx.strokeStyle = INK; ctx.lineWidth = 0.7;
      for (let i = 0; i < flock; i++) {
        const sp = 9 + i * 2 + mood.cheer * 30, x = ((VW + 40) - ((t * sp + i * 97 + cam.x * 0.1) % (VW + 60))), y = 84 + (i * 23) % 40 - mood.cheer * 14 + Math.sin(t + i) * 3;
        const f = Math.sin(t * (6 + mood.cheer * 8) + i) * 2.2;
        ctx.beginPath(); ctx.moveTo(x - 4, y - f); ctx.quadraticCurveTo(x - 2, y - 1, x, y); ctx.quadraticCurveTo(x + 2, y - 1, x + 4, y - f); ctx.stroke();
      }
      K.tiled(ctx, this.bamboo, cam.x, 0.42);
      // low mist over the water
      const g = ctx.createLinearGradient(0, 150, 0, 176);
      g.addColorStop(0, 'rgba(239,230,210,0)'); g.addColorStop(1, 'rgba(239,230,210,0.9)');
      ctx.fillStyle = g; ctx.fillRect(0, 150, VW, 26); R(ctx, 'rgba(239,230,210,0.9)', 0, 176, VW, VH - 176);
    },
    tile(ctx, x, y, art, e, seed) {
      const rnd = U.rng(Math.floor(seed * 1e6) + 11), d = e.d || 0;
      if (art === 'oneway') { // a bamboo pole
        R(ctx, '#3a3832', x, y, 16, 3); R(ctx, '#7a766a', x, y + 0.5, 16, 0.5); R(ctx, INK, x, y + 3, 16, 0.7);
        R(ctx, INK, x + ((Math.floor(seed * 4) * 4) % 16), y - 0.5, 1, 4);
        return;
      }
      if (art === 'alt') { // bundle of bamboo tied with rope
        R(ctx, '#d6ccb2', x, y, 16, 16);
        for (let k = 0; k < 4; k++) { R(ctx, '#4a463e', x + 1 + k * 4, y + 1, 2.5, 14); R(ctx, '#8a8476', x + 1.5 + k * 4, y + 1, 0.5, 14); R(ctx, INK, x + 1 + k * 4, y + 5 + (k % 2) * 4, 2.5, 0.8); }
        R(ctx, INK, x, y + 7, 16, 2); R(ctx, '#6a6050', x, y + 7.5, 16, 0.5);
        if (e.t) R(ctx, INK, x, y, 16, 1.2);
        if (e.l) R(ctx, INK, x, y, 1, 16); if (e.r) R(ctx, INK, x + 15, y, 1, 16); if (e.b) R(ctx, INK, x, y + 15, 16, 1);
        return;
      }
      const ice = art === 'ice';
      // rock: grey wash that pales with depth, dry-brush texture strokes, heavy ink edges
      const wash = ice ? ['#b8c4c8', '#cdd6d8', '#dfe4e2'] : ['#8e897e', '#aaa496', '#c4bdac'];
      R(ctx, wash[Math.min(2, d)], x, y, 16, 16);
      if (d < 2) { const g = ctx.createLinearGradient(0, y, 0, y + 16); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(239,230,210,${d ? 0.4 : 0.25})`); ctx.fillStyle = g; ctx.fillRect(x, y, 16, 16); }
      ctx.strokeStyle = 'rgba(24,22,26,0.55)'; ctx.lineCap = 'round';
      for (let k = 0; k < 3; k++) { // cun strokes: short dry-brush hooks at varied angles, and dots
        const sx = x + 1 + rnd() * 13, sy = y + 4 + rnd() * 10, l = 1.5 + rnd() * 3.5, a = -0.4 - rnd() * 2.4;
        if (rnd() < 0.3) { ctx.fillStyle = 'rgba(24,22,26,0.45)'; ctx.beginPath(); ctx.ellipse(sx, sy, 0.8, 0.5, 0, 0, 7); ctx.fill(); continue; }
        ctx.lineWidth = 0.4 + rnd() * 0.6; ctx.beginPath(); ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(sx + Math.cos(a) * l * 0.6 + 0.8, sy + Math.sin(a) * l * 0.6, sx + Math.cos(a) * l, sy + Math.sin(a) * l); ctx.stroke();
      }
      if (ice) { R(ctx, '#ffffff', x + 3, y + 6, 6, 0.6); R(ctx, '#ffffff', x + 9, y + 10, 4, 0.6); }
      ctx.fillStyle = INK;
      if (e.t) { // the main brush stroke: thick, uneven, with moss dots
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let k = 0; k <= 16; k += 2) ctx.lineTo(x + k, y - 0.3 + Math.sin((x + k) * 0.37) * 0.3);
        for (let k = 16; k >= 0; k -= 2) ctx.lineTo(x + k, y + 2.2 + Math.sin((x + k) * 0.21 + 1) * 0.9);
        ctx.fill();
        for (let k = 0; k < 2; k++) if (rnd() < 0.6) { ctx.beginPath(); ctx.ellipse(x + 2 + rnd() * 12, y - 0.6, 1.1, 0.7, 0, 0, 7); ctx.fill(); }
      }
      if (e.l) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 1.6 + Math.sin(y) * 0.4, y); ctx.lineTo(x + 1.2, y + 16); ctx.lineTo(x, y + 16); ctx.fill(); }
      if (e.r) { ctx.beginPath(); ctx.moveTo(x + 16, y); ctx.lineTo(x + 14.4 - Math.sin(y) * 0.4, y); ctx.lineTo(x + 14.8, y + 16); ctx.lineTo(x + 16, y + 16); ctx.fill(); }
      if (e.b) R(ctx, INK, x, y + 15, 16, 1);
    },
    spike(ctx, x, y, dir) {
      rotated(ctx, x, y, dir, () => {
        for (const ox of [0, 8]) {
          ctx.fillStyle = '#b8281e'; ctx.beginPath(); ctx.moveTo(ox + 0.5, 16); ctx.quadraticCurveTo(ox + 3, 10, ox + 4, 4.5); ctx.quadraticCurveTo(ox + 5, 10, ox + 7.5, 16); ctx.fill();
          ctx.strokeStyle = INK; ctx.lineWidth = 0.9; ctx.stroke();
          R(ctx, '#f0a090', ox + 3.5, 8, 0.5, 4);
        }
        R(ctx, INK, 0, 15, 16, 1);
      });
    },
    door: doorWith(function (ctx, x, y, o) {
      const open = o.open || 0;
      R(ctx, INK, x - 1, y + 4, 2.5, 28); R(ctx, INK, x + 14.5, y + 4, 2.5, 28);
      if (open > 0) { R(ctx, '#2a2620', x + 1.5, y + 6, 13, 26); ctx.globalAlpha = 0.4 + 0.6 * open; R(ctx, '#fff8e6', x + 3, y + 7, 10, 25); ctx.globalAlpha = 1; }
      else { R(ctx, '#b8281e', x + 1.5, y + 6, 13, 26); R(ctx, '#8a1c14', x + 7.5, y + 6, 1, 26); R(ctx, '#d8483a', x + 2, y + 6, 0.5, 26); R(ctx, '#f0d080', x + 6, y + 19, 0.8, 2); R(ctx, '#f0d080', x + 9.2, y + 19, 0.8, 2); }
      // a curved brush-stroke roof
      ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(x - 5, y + 2); ctx.quadraticCurveTo(x + 8, y + 5, x + 21, y + 2); ctx.lineTo(x + 18, y + 5.5); ctx.quadraticCurveTo(x + 8, y + 7, x - 2, y + 5.5); ctx.fill();
      R(ctx, INK, x - 2, y + 6, 20, 1);
      if (o.lantern) {
        const sw = Math.sin((o.t || 0) * 1.6) * 1.2;
        ctx.globalAlpha = 0.2 + 0.08 * Math.sin((o.t || 0) * 4); ctx.fillStyle = '#e8603a'; ctx.beginPath(); ctx.arc(x + 8 + sw, y - 7, 9, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
        ctx.strokeStyle = INK; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(x + 8, y + 2); ctx.lineTo(x + 8 + sw, y - 2); ctx.stroke();
        ctx.fillStyle = '#c8301e'; ctx.beginPath(); ctx.ellipse(x + 8 + sw, y - 7, 4, 5, 0, 0, 7); ctx.fill();
        R(ctx, INK, x + 5 + sw, y - 12.5, 6, 1.2); R(ctx, INK, x + 5 + sw, y - 2.5, 6, 1.2); R(ctx, '#ffd0a0', x + 7 + sw, y - 10, 1.5, 6);
      }
    }),
    spring(ctx, x, y, squash) {
      const h = 6 - squash * 4;
      ctx.strokeStyle = INK; ctx.lineWidth = 0.9; ctx.beginPath();
      for (let i = 0; i <= 6; i++) { const px = x + (i % 2 ? 12 : 4), py = y + 16 - (i / 6) * h; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke();
      R(ctx, '#b8281e', x + 2, y + 16 - h - 3, 12, 2.5); R(ctx, INK, x + 2, y + 16 - h - 0.5, 12, 0.6);
    },
  }, {
    // Cheap ink pass: luminance through a dithered ink ramp, reds kept as vermilion. No edge detection.
    post(d, W, H) {
      if (!this.lut) {
        this.lut = new Uint8Array(768);
        const stops = [[0, [22, 20, 24]], [0.3, [70, 66, 64]], [0.62, [150, 144, 132]], [0.85, [226, 216, 196]], [1, [242, 234, 216]]];
        for (let i = 0; i < 256; i++) {
          const f = i / 255; let k = 0; while (k < stops.length - 2 && f > stops[k + 1][0]) k++;
          const [p0, c0] = stops[k], [p1, c1] = stops[k + 1], u = (f - p0) / (p1 - p0);
          for (let j = 0; j < 3; j++) this.lut[i * 3 + j] = c0[j] + (c1[j] - c0[j]) * u;
        }
      }
      const L = this.lut;
      for (let k = 0, i = 0, n = W * H * 4; k < n; k += 4, i++) {
        const r = d[k], g = d[k + 1], b = d[k + 2];
        if (r > 110 && r > g * 1.7 && r > b * 1.7) { d[k] = 184 * r / 255 + 30; d[k + 1] = 40; d[k + 2] = 30; continue; }
        let l = lum(d, k) + (NOISE[i & NM] - 0.5) * 10;
        l = l < 0 ? 0 : l > 255 ? 255 : l | 0;
        d[k] = L[l * 3]; d[k + 1] = L[l * 3 + 1]; d[k + 2] = L[l * 3 + 2];
      }
    },
  });

  // =====================================================================
  // 3. NIGHT VISION: overgrown jungle temple ruins, seen through a camera at night.
  // The style maps luminance to green with high contrast, so this is designed in luminance:
  // background ~60-110, playfield ~150-230, fireflies and eyes at 255.
  // =====================================================================
  KF.Env.add('nightvision', {
    name: 'JUNGLE RUINS', bg: '#18201a',
    signBoard: '#d8dcc8', signInk: '#1a2018', signPost: '#6a6a5a',
    zone: { gravity: '#c0c0ff', reverse: '#ffffff' },
    legColor: '#e0e8d8',
    build() {
      const rnd = U.rng(611);
      this.sky = K.ditherSky(['#161e18', '#1a241c', '#202c22', '#26342a', '#2c3a2e']);
      const s = this.sky.getContext('2d');
      for (let i = 0; i < 60; i++) R(s, '#8a9a88', rnd() * VW, rnd() * 90, 0.5, 0.5);
      const g = s.createRadialGradient(286, 48, 10, 286, 48, 56); g.addColorStop(0, 'rgba(200,220,190,0.35)'); g.addColorStop(1, 'rgba(200,220,190,0)');
      s.fillStyle = g; s.fillRect(220, 0, 140, 110);
      s.fillStyle = '#e8f0de'; s.beginPath(); s.arc(286, 48, 16, 0, 7); s.fill();
      s.fillStyle = '#c4ccb8'; for (const [cx, cy, r] of [[280, 44, 3], [292, 54, 2.5], [289, 40, 1.5]]) { s.beginPath(); s.arc(cx, cy, r, 0, 7); s.fill(); }
      // far canopy: lumpy tree crowns
      this.far = KF.makeHi(640, VH); this.far.lw = 640;
      const f = this.far.getContext('2d');
      f.fillStyle = '#4a5a4c';
      for (let x = -20; x < 660; x += 14 + rnd() * 16) { const r = 14 + rnd() * 18, cy = 86 + rnd() * 26; f.beginPath(); f.arc(x, cy, r, 0, 7); f.fill(); f.fillRect(x - r, cy, r * 2, VH); }
      f.fillStyle = '#56685a'; for (let i = 0; i < 160; i++) { f.beginPath(); f.arc(rnd() * 640, 80 + rnd() * 60, 1 + rnd() * 2, 0, 7); f.fill(); }
      // mid: the ruins — giant stone faces and a stepped pyramid, strangled by roots
      this.mid = KF.makeHi(768, VH); this.mid.lw = 768;
      const m = this.mid.getContext('2d');
      const stoneC = '#7a8476', dark = '#4e584c', lite = '#929c8c';
      const face = (cx, top) => {
        R(m, stoneC, cx - 26, top + 22, 52, VH - top);
        for (let k = 0; k < 4; k++) R(m, stoneC, cx - 22 + k * 5, top + 4 - k * 6, 44 - k * 10, 20); // tiered crown
        R(m, lite, cx - 26, top + 22, 2, VH - top);
        for (let y = top + 30; y < VH; y += 9) R(m, dark, cx - 26, y, 52, 0.6);
        R(m, dark, cx - 16, top + 40, 11, 2); R(m, dark, cx + 5, top + 40, 11, 2);        // closed eyes
        R(m, dark, cx - 14, top + 37, 8, 0.8); R(m, dark, cx + 6, top + 37, 8, 0.8);        // brows
        R(m, dark, cx - 3, top + 44, 6, 12); R(m, lite, cx - 3, top + 44, 1, 12);          // nose
        R(m, dark, cx - 10, top + 61, 20, 2); R(m, dark, cx - 7, top + 64, 14, 1.5);        // lips
        m.strokeStyle = '#3a4638'; m.lineWidth = 2.2; m.lineCap = 'round';
        for (let k = 0; k < 3; k++) { // roots
          const rx = cx - 24 + rnd() * 48;
          m.beginPath(); m.moveTo(rx, top + 10); m.bezierCurveTo(rx + (rnd() - 0.5) * 40, top + 40, rx + (rnd() - 0.5) * 40, top + 70, rx + (rnd() - 0.5) * 30, VH);
          m.stroke(); m.lineWidth = 1.2;
        }
      };
      face(120, 76); face(520, 90);
      const pyr = (cx) => {
        for (let k = 0; k < 6; k++) { R(m, k % 2 ? stoneC : '#727c6e', cx - 60 + k * 9, 160 - k * 13, 120 - k * 18, 13); R(m, lite, cx - 60 + k * 9, 160 - k * 13, 120 - k * 18, 0.8); }
        R(m, dark, cx - 7, 82, 14, 92); for (let y = 84; y < 172; y += 3) R(m, '#5e685a', cx - 7, y, 14, 0.8);
        R(m, stoneC, cx - 9, 70, 18, 14); R(m, '#262e26', cx - 3, 75, 6, 9);
      };
      pyr(330);
      // near: hanging vines and leaves
      this.near = KF.makeHi(768, VH); this.near.lw = 768;
      const n = this.near.getContext('2d');
      for (let i = 0; i < 14; i++) {
        const vx = rnd() * 768, len = 30 + rnd() * 90;
        n.strokeStyle = '#4a5e46'; n.lineWidth = 0.8; n.beginPath(); n.moveTo(vx, -2);
        for (let y = 0; y < len; y += 4) n.lineTo(vx + Math.sin(y * 0.08 + i) * 3, y);
        n.stroke();
        n.fillStyle = '#56704e';
        for (let y = 6; y < len; y += 6 + rnd() * 5) { const lx = vx + Math.sin(y * 0.08 + i) * 3; n.beginPath(); n.ellipse(lx + (y % 12 < 6 ? 2.5 : -2.5), y, 2.5, 1.2, y % 12 < 6 ? 0.5 : -0.5, 0, 7); n.fill(); }
      }
      n.fillStyle = '#2a362a';
      for (let i = 0; i < 26; i++) { // fern fronds along the bottom
        const fx = rnd() * 768, fy = 168, a0 = -Math.PI / 2 + (rnd() - 0.5) * 1.4;
        for (let k = 0; k < 5; k++) { const a = a0 + (k - 2) * 0.35; n.beginPath(); n.ellipse(fx + Math.cos(a) * 9, fy + Math.sin(a) * 12, 10, 2, a, 0, 7); n.fill(); }
      }
      this.flies = Array.from({ length: 22 }, () => ({ x: rnd() * VW, y: 60 + rnd() * 110, ph: rnd() * 9, sp: 0.4 + rnd() * 0.8 }));
      this.eyes = [[60, 150], [240, 142], [410, 156], [600, 148], [700, 138], [170, 160]];
    },
    background(ctx, cam, t, mood) {
      KF.blit(ctx, this.sky, 0, 0);
      K.tiled(ctx, this.far, cam.x, 0.08);
      K.tiled(ctx, this.mid, cam.x, 0.22);
      // eyes in the dark: blink now and then; more of them watch you after a death
      const show = 2 + Math.round(mood.cheer * 4);
      for (let i = 0; i < Math.min(show, this.eyes.length); i++) {
        const [ex, ey] = this.eyes[i], x = Math.round(K.wrapX(ex, cam.x, 0.35, 768)) + 24;
        if (x < -6 || x > VW + 6 || Math.sin(t * 0.9 + i * 2.1) > 0.93) continue;
        R(ctx, '#ffffff', x, ey, 1.5, 1); R(ctx, '#ffffff', x + 4, ey, 1.5, 1);
      }
      K.tiled(ctx, this.near, cam.x, 0.5);
      for (const f of this.flies) {
        const b = Math.sin(t * 2.2 + f.ph);
        if (b < -0.2) continue;
        const x = ((f.x + Math.sin(t * f.sp + f.ph) * 16 - cam.x * 0.4) % VW + VW) % VW, y = f.y + Math.cos(t * f.sp * 1.3 + f.ph) * 8;
        ctx.globalAlpha = 0.3 * b; ctx.fillStyle = '#f0ffd0'; ctx.beginPath(); ctx.arc(x, y, 2.5, 0, 7); ctx.fill();
        ctx.globalAlpha = 1; R(ctx, '#ffffff', x - 0.5, y - 0.5, 1, 1);
      }
    },
    tile(ctx, x, y, art, e, seed) {
      const rnd = U.rng(Math.floor(seed * 1e6) + 23);
      if (art === 'oneway') { // fallen log
        R(ctx, '#6a5a44', x, y, 16, 4); R(ctx, '#c8c0a8', x, y, 16, 1); R(ctx, '#3a3226', x, y + 4, 16, 0.8);
        for (let k = 0; k < 16; k += 5) R(ctx, '#4a3e2e', x + k + seed * 3, y + 1.5, 2, 0.6);
        return;
      }
      const ice = art === 'ice', alt = art === 'alt';
      const base = ice ? '#a8b8bc' : alt ? '#8e988a' : '#b0b8a6', mortar = '#58625a', hi = '#d2dac8';
      R(ctx, base, x, y, 16, 16);
      if (!alt) { // big carved blocks, 8px courses, staggered
        for (let row = 0; row < 2; row++) {
          const by = y + row * 8, off = ((Math.floor(y / 8) + row) % 2) * 8;
          R(ctx, mortar, x, by + 7.5, 16, 0.5); R(ctx, hi, x, by, 16, 0.5);
          R(ctx, mortar, x + off, by, 0.5, 8);
        }
        if (seed < 0.25) { ctx.strokeStyle = '#5a645a'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(x + 3 + seed * 30, y + 3); ctx.lineTo(x + 6 + seed * 20, y + 9); ctx.lineTo(x + 4 + seed * 25, y + 14); ctx.stroke(); }
        if (seed > 0.86 && !e.t) { ctx.strokeStyle = '#6a7466'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.arc(x + 8, y + 8, 4, 0, 5); ctx.arc(x + 8, y + 8, 2, 5, 0, true); ctx.stroke(); }
      } else { // idol block: a small carved face
        R(ctx, hi, x, y, 16, 0.6); R(ctx, '#58625a', x + 3, y + 5, 3, 1.2); R(ctx, '#58625a', x + 10, y + 5, 3, 1.2);
        R(ctx, '#58625a', x + 7, y + 7, 2, 4); R(ctx, '#58625a', x + 5, y + 12, 6, 1);
        R(ctx, '#3a423a', x, y + 15.5, 16, 0.5);
      }
      if (ice) { R(ctx, '#f0f8ff', x + 2, y + 3, 7, 0.6); R(ctx, '#f0f8ff', x + 9, y + 9, 5, 0.6); }
      if (e.t) { // moss rim with a bright edge, hanging strands
        R(ctx, '#6e8a5c', x, y, 16, 3); R(ctx, '#e6f6d4', x, y, 16, 1); R(ctx, '#9aba84', x, y + 1, 16, 0.6);
        for (let k = 0; k < 3; k++) { const mx = x + rnd() * 15; R(ctx, '#6e8a5c', mx, y + 3, 1, 1 + rnd() * 4); }
        if (rnd() < 0.4) { const gx = x + rnd() * 13; R(ctx, '#c8e4b0', gx, y - 1.5, 0.5, 1.5); R(ctx, '#c8e4b0', gx + 1.5, y - 2, 0.5, 2); }
      }
      if (e.l) R(ctx, '#2a322a', x, y, 0.8, 16);
      if (e.r) R(ctx, '#2a322a', x + 15.2, y, 0.8, 16);
      if (e.b) R(ctx, '#2a322a', x, y + 15.2, 16, 0.8);
    },
    door: doorWith(function (ctx, x, y, o) {
      const open = o.open || 0;
      R(ctx, '#1a1e1a', x - 2, y + 3, 20, 29);
      R(ctx, '#c0c8b4', x - 1, y + 4, 3, 28); R(ctx, '#c0c8b4', x + 14, y + 4, 3, 28); R(ctx, '#c0c8b4', x - 3, y + 1, 22, 4);
      R(ctx, '#eef4e4', x - 3, y + 1, 22, 0.8);
      R(ctx, '#4a5448', x + 6, y + 2.5, 4, 1.2); // carved eye on the lintel
      if (open > 0) { ctx.globalAlpha = 0.4 + 0.6 * open; R(ctx, '#ffffff', x + 3, y + 6, 10, 26); ctx.globalAlpha = 1; }
      else {
        R(ctx, '#6e786a', x + 2, y + 5, 12, 27); R(ctx, '#8a9486', x + 2, y + 5, 12, 0.6);
        ctx.strokeStyle = '#e8f0dc'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.arc(x + 8, y + 16, 3, 0, 5.4); ctx.moveTo(x + 8, y + 22); ctx.lineTo(x + 8, y + 28); ctx.stroke();
      }
      if (o.lantern) { // a torch: flickering, the hottest thing on screen
        const fl = Math.sin((o.t || 0) * 17) * 0.6 + Math.sin((o.t || 0) * 7) * 0.4;
        R(ctx, '#5a4a34', x + 7, y - 6, 2, 7);
        ctx.globalAlpha = 0.25; ctx.fillStyle = '#ffffe0'; ctx.beginPath(); ctx.arc(x + 8, y - 9, 8 + fl, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x + 5.5, y - 6); ctx.quadraticCurveTo(x + 8 + fl, y - 16, x + 10.5, y - 6); ctx.fill();
      }
    }),
  });

  // =====================================================================
  // 5. 3D: a toy-block playroom. Solids are painted alphabet blocks, extruded by render.js.
  // =====================================================================
  const TOYS = ['#e84a4a', '#3a7ae0', '#f2c23a', '#3aae5a', '#ee7a2a', '#9a5ad0'];
  const WOOD = '#5a3a1c';
  KF.Env.add('cube3d', {
    name: 'TOY BOX', bg: '#cfe6dc',
    cube: { top: '#f6dcaa', side: '#d4a464', under: '#9a6a36', edge: WOOD },
    signBoard: '#fff6d8', signInk: '#3a2a8a', signPost: '#c8954e', signShade: '#e8d4a0',
    zone: { gravity: '#7a5aff', reverse: '#ff4ab0' },
    legColor: WOOD,
    build() {
      const rnd = U.rng(733);
      // wall: striped wallpaper with stars, a window, a shelf of toys, a crayon drawing
      this.wall = KF.makeHi(768, VH); this.wall.lw = 768;
      const w = this.wall.getContext('2d');
      R(w, '#cfe6dc', 0, 0, 768, VH);
      for (let x = 0; x < 768; x += 16) R(w, '#c2ded2', x, 0, 8, VH);
      w.fillStyle = '#f2f8e8';
      for (let y = 10; y < 150; y += 24) for (let x = (y / 24 % 2) * 16 + 4; x < 768; x += 32) { w.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 1.2 : 2.6; w.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } w.fill(); }
      // window
      R(w, '#f8f4ea', 150, 50, 74, 64); R(w, '#9ad0f4', 154, 54, 66, 56);
      const sky = w.createLinearGradient(0, 54, 0, 110); sky.addColorStop(0, '#7ac0f0'); sky.addColorStop(1, '#c4e6fa'); w.fillStyle = sky; w.fillRect(154, 54, 66, 56);
      w.fillStyle = '#ffffff'; for (const [cx, cy] of [[172, 74], [180, 70], [188, 75], [204, 92], [211, 89]]) { w.beginPath(); w.arc(cx, cy, 5, 0, 7); w.fill(); }
      R(w, '#f8f4ea', 186, 54, 2, 56); R(w, '#f8f4ea', 154, 81, 66, 2);
      for (const sx of [142, 216]) { R(w, '#f08aa0', sx, 46, 16, 72); for (let k = 0; k < 16; k += 4) R(w, '#e0708a', sx + k, 46, 1, 72); }
      R(w, '#c8954e', 138, 44, 98, 3);
      // shelf with a toy pagoda, a teddy, a rocket and a crayon cup
      R(w, '#b07a40', 420, 96, 150, 5); R(w, '#d4a464', 420, 96, 150, 1.5); R(w, '#8a5a2a', 430, 101, 4, 8); R(w, '#8a5a2a', 556, 101, 4, 8);
      const blk = (x, y, ww, hh, c) => { R(w, shade(c, 0.7), x, y, ww, hh); R(w, c, x + 0.5, y + 0.5, ww - 1, hh - 1); R(w, shade(c, 1.25), x + 0.5, y + 0.5, ww - 1, 1); };
      blk(430, 82, 26, 14, '#e84a4a'); blk(434, 72, 18, 10, '#f2c23a'); blk(437, 64, 12, 8, '#3a7ae0');
      for (const [ty, tw] of [[82, 34], [72, 26], [64, 20]]) { w.fillStyle = '#3aae5a'; w.beginPath(); w.moveTo(443 - tw / 2, ty); w.lineTo(443, ty - 5); w.lineTo(443 + tw / 2, ty); w.fill(); }
      R(w, '#f2c23a', 442, 52, 2, 8);
      w.fillStyle = '#a06a3a'; w.beginPath(); w.arc(482, 80, 9, 0, 7); w.arc(482, 66, 7, 0, 7); w.fill();
      w.beginPath(); w.arc(476, 60, 3, 0, 7); w.arc(488, 60, 3, 0, 7); w.fill();
      w.fillStyle = '#e8c090'; w.beginPath(); w.arc(482, 82, 5, 0, 7); w.arc(482, 68, 3, 0, 7); w.fill();
      R(w, '#2a1a10', 479, 65, 1.5, 1.5); R(w, '#2a1a10', 484, 65, 1.5, 1.5); R(w, '#2a1a10', 481.5, 68, 1.5, 1);
      R(w, '#e8e8f0', 506, 66, 10, 30); w.fillStyle = '#e84a4a'; w.beginPath(); w.moveTo(506, 66); w.lineTo(511, 54); w.lineTo(516, 66); w.fill();
      R(w, '#3a7ae0', 509, 74, 4, 4); w.fillStyle = '#e84a4a'; w.beginPath(); w.moveTo(506, 86); w.lineTo(501, 96); w.lineTo(506, 96); w.fill(); w.beginPath(); w.moveTo(516, 86); w.lineTo(521, 96); w.lineTo(516, 96); w.fill();
      R(w, '#3a7ae0', 532, 78, 22, 18); R(w, '#5a94f0', 532, 78, 22, 2);
      TOYS.forEach((c, k) => { const cx = 534 + k * 3.4, ch = 12 + (k % 3) * 3; R(w, c, cx, 78 - ch + 6, 3, ch); w.fillStyle = c; w.beginPath(); w.moveTo(cx, 84 - ch); w.lineTo(cx + 1.5, 80 - ch); w.lineTo(cx + 3, 84 - ch); w.fill(); });
      // pinned crayon drawing of our hero
      w.save(); w.translate(640, 60); w.rotate(-0.06);
      R(w, '#fffdf6', 0, 0, 50, 40); R(w, 'rgba(240,230,160,0.8)', 18, -3, 14, 5);
      w.strokeStyle = '#e84a4a'; w.lineWidth = 1.2; w.lineCap = 'round';
      w.beginPath(); w.arc(22, 14, 4, 0, 7); w.moveTo(22, 18); w.lineTo(22, 28); w.lineTo(17, 35); w.moveTo(22, 28); w.lineTo(28, 34); w.moveTo(14, 20); w.lineTo(30, 20); w.stroke();
      w.strokeStyle = '#3a7ae0'; w.beginPath(); w.moveTo(17, 11); w.lineTo(27, 11); w.lineTo(32, 8); w.stroke();
      w.fillStyle = '#f2c23a'; w.beginPath(); w.arc(42, 9, 5, 0, 7); w.fill();
      w.strokeStyle = '#3aae5a'; w.beginPath(); w.moveTo(2, 38); for (let k = 0; k < 48; k += 4) w.lineTo(2 + k, 36 + (k % 8 ? 0 : -3)); w.stroke();
      w.restore();
      // skirting board + floorboards
      R(w, '#f6f2e6', 0, 150, 768, 7); R(w, '#d8d0bc', 0, 156, 768, 1);
      R(w, '#c89a64', 0, 157, 768, VH); for (let y = 160; y < VH; y += 6) R(w, '#b08250', 0, y, 768, 0.6);
      for (let x = 0; x < 768; x += 46) R(w, '#b08250', x + (Math.floor(x / 46) % 2) * 20, 157, 0.6, VH);
      // rug
      for (const [rx, ry, c] of [[60, 5, '#e88a7a'], [52, 4, '#f6d070'], [42, 3, '#7ab8e0'], [30, 2, '#e88a7a']]) { w.fillStyle = c; w.beginPath(); w.ellipse(330, 168, rx, ry * 2.4, 0, 0, 7); w.fill(); }
      this.toys = KF.makeHi(768, VH); this.toys.lw = 768;
      const ty = this.toys.getContext('2d');
      // giant crayons lying on the floor in front of the wall
      [[40, '#e84a4a'], [260, '#3aae5a'], [560, '#3a7ae0']].forEach(([cx, c]) => {
        R(ty, shade(c, 0.75), cx, 162, 46, 7); R(ty, c, cx, 162, 46, 5.5); R(ty, shade(c, 1.3), cx, 162.5, 46, 1);
        R(ty, '#f4ecd8', cx + 8, 162, 22, 7); R(ty, shade(c, 0.7), cx + 8, 163, 22, 0.6); R(ty, shade(c, 0.7), cx + 8, 167, 22, 0.6);
        ty.fillStyle = c; ty.beginPath(); ty.moveTo(cx + 46, 162); ty.lineTo(cx + 54, 165.5); ty.lineTo(cx + 46, 169); ty.fill();
      });
      // jack-in-the-box (pops out live)
      R(ty, '#e84a4a', 420, 148, 20, 20); R(ty, '#f2c23a', 420, 148, 20, 3); R(ty, '#3a7ae0', 424, 154, 12, 10); R(ty, '#f6f2e6', 427, 157, 6, 4);
      R(ty, '#c8c8d0', 440, 156, 4, 1.5); R(ty, '#c8c8d0', 443, 153, 1.5, 6);
    },
    background(ctx, cam, t, mood) {
      K.tiled(ctx, this.wall, cam.x, 0.3);
      // the ceiling mobile turns slowly
      const mx = Math.round(K.wrapX(300, cam.x, 0.3, 768)) + 24;
      if (mx > -60 && mx < VW + 60) {
        R(ctx, '#8a6a4a', mx - 26, 18, 52, 1);
        R(ctx, '#8a6a4a', mx, 0, 0.5, 18);
        [['#f2c23a', -24, 30], ['#e84a4a', -8, 40], ['#3a7ae0', 10, 34], ['#f2c23a', 24, 44]].forEach(([c, off, len], k) => {
          const s = Math.cos(t * 0.8 + k * 1.3), x = mx + off * s;
          R(ctx, '#8a6a4a', mx + off * s, 18, 0.5, len - 18);
          ctx.fillStyle = c; ctx.beginPath();
          if (k % 2) { ctx.ellipse(x, len + 3, 4 * Math.abs(s) + 0.6, 4, 0, 0, 7); }
          else for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 2 : 4.5; ctx.lineTo(x + Math.cos(a) * r * Math.abs(s), len + 3 + Math.sin(a) * r); }
          ctx.fill();
        });
      }
      K.tiled(ctx, this.toys, cam.x, 0.5);
      // jack pops up when you die
      const jx = Math.round(K.wrapX(420, cam.x, 0.5, 768)) + 24, pop = Math.min(1, mood.cheer) * 22;
      if (pop > 1 && jx > -30 && jx < VW + 30) {
        const bob = Math.sin(t * 14) * 2 * Math.min(1, mood.cheer);
        for (let k = 0; k < pop; k += 3) R(ctx, '#9a9aa6', jx + 7 + (k % 6 ? 0 : 4), 148 - k, 4, 1.5);
        const hy = 148 - pop - 8 + bob;
        ctx.fillStyle = '#f6e0c8'; ctx.beginPath(); ctx.arc(jx + 10, hy, 6, 0, 7); ctx.fill();
        R(ctx, '#e84a4a', jx + 9, hy - 0.5, 2, 2); R(ctx, '#2a1a10', jx + 7, hy - 3, 1, 1); R(ctx, '#2a1a10', jx + 12, hy - 3, 1, 1);
        ctx.fillStyle = '#9a5ad0'; ctx.beginPath(); ctx.moveTo(jx + 4, hy - 4); ctx.lineTo(jx + 10, hy - 14); ctx.lineTo(jx + 16, hy - 4); ctx.fill();
        R(ctx, '#f2c23a', jx + 9, hy - 16, 2, 2);
      }
      // a wind-up train circling the room along the skirting board
      const span = VW + 120, tx = ((t * 34 - cam.x * 0.5) % span + span) % span - 60;
      for (let k = 0; k < 3; k++) {
        const cx = tx - k * 19, c = TOYS[(k * 2 + 1) % TOYS.length];
        R(ctx, shade(c, 0.7), cx, 147, 16, 8); R(ctx, c, cx + 0.5, 147.5, 15, 6.5); R(ctx, shade(c, 1.3), cx + 0.5, 147.5, 15, 1);
        if (k === 0) { R(ctx, '#2a2a30', cx + 11, 141, 3, 6); R(ctx, '#3a7ae0', cx + 1, 142, 8, 5); R(ctx, '#bfe4ff', cx + 3, 143, 4, 2.5); }
        for (const wx of [3, 12]) { ctx.fillStyle = '#2a2a30'; ctx.beginPath(); ctx.arc(cx + wx, 155.5, 2, 0, 7); ctx.fill(); R(ctx, '#c8c8d0', cx + wx - 0.5, 155, 1, 1); }
      }
      if (Math.floor(t * 3) % 2 === 0) { ctx.globalAlpha = 0.6; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(tx + 12.5, 137 - (t * 6 % 4), 2, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'oneway') { // popsicle stick
        R(ctx, '#e8cc90', x, y, 16, 3); R(ctx, '#f6e2b4', x, y, 16, 0.8); R(ctx, '#b8945a', x, y + 3, 16, 0.6);
        R(ctx, '#d4b478', x + 3 + seed * 6, y + 1.5, 5, 0.4);
        return;
      }
      if (art === 'ice') { // clear plastic block
        R(ctx, '#7ac8e8', x, y, 16, 16); R(ctx, '#b8e6f8', x + 1, y + 1, 14, 14);
        ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.moveTo(x + 2, y + 9); ctx.lineTo(x + 9, y + 2); ctx.lineTo(x + 11, y + 2); ctx.lineTo(x + 2, y + 11); ctx.fill();
        if (e.t) R(ctx, '#ffffff', x, y, 16, 1);
        ctx.strokeStyle = '#3a8ab0'; ctx.lineWidth = 0.5; ctx.strokeRect(x + 0.25, y + 0.25, 15.5, 15.5);
        return;
      }
      const deep = (e.d || 0) >= 1, k = deep ? 0.78 : 1;
      if (art === 'alt') { // plastic brick with studs
        const c = shade(seed < 0.5 ? '#e84a4a' : '#f2c23a', k);
        R(ctx, shade(c, 0.7), x, y, 16, 16); R(ctx, c, x + 0.5, e.t ? y + 3 : y + 0.5, 15, e.t ? 12.5 : 15); R(ctx, shade(c, 1.2), x + 0.5, e.t ? y + 3 : y + 0.5, 15, 1);
        if (e.t) for (const sx of [4, 12]) { ctx.fillStyle = shade(c, 0.75); ctx.beginPath(); ctx.ellipse(x + sx, y + 2.6, 3, 1.4, 0, 0, 7); ctx.fill(); R(ctx, c, x + sx - 3, y + 0.8, 6, 1.8); ctx.fillStyle = shade(c, 1.3); ctx.beginPath(); ctx.ellipse(x + sx, y + 0.8, 3, 1.2, 0, 0, 7); ctx.fill(); }
        R(ctx, shade(c, 0.85), x + 0.5, y + 15, 15, 0.6);
        return;
      }
      // alphabet block: wood rim, painted face, raised letter
      const ci = Math.floor(U.hash2(Math.floor(x / 16) * 3 + 1, Math.floor(y / 16)) * TOYS.length);
      const c = shade(TOYS[ci], k), letter = String.fromCharCode(65 + Math.floor(seed * 26));
      R(ctx, shade('#e8c088', k), x, y, 16, 16);
      R(ctx, shade(c, 0.8), x + 1.5, y + 1.5, 13, 13); R(ctx, c, x + 2, y + 2, 12, 12);
      R(ctx, shade(c, 1.25), x + 2, y + 2, 12, 0.6); R(ctx, shade(c, 1.15), x + 2, y + 2, 0.6, 12);
      F().draw(ctx, letter, x + 8.5, y + 5.5, shade(c, 0.55), 1, 'center');
      F().draw(ctx, letter, x + 8, y + 5, deep ? '#e8e0d0' : '#ffffff', 1, 'center');
      if (e.t) R(ctx, '#fff2d0', x, y, 16, 0.8);
      ctx.strokeStyle = WOOD; ctx.lineWidth = 0.5; ctx.strokeRect(x + 0.25, y + 0.25, 15.5, 15.5);
    },
    door: doorWith(function (ctx, x, y, o) { // a doll's-house front door
      const open = o.open || 0;
      R(ctx, WOOD, x - 2, y + 7, 20, 25); R(ctx, '#f6b8c8', x - 1.5, y + 7.5, 19, 24.5);
      ctx.fillStyle = WOOD; ctx.beginPath(); ctx.moveTo(x - 5, y + 9); ctx.lineTo(x + 8, y - 1); ctx.lineTo(x + 21, y + 9); ctx.fill();
      ctx.fillStyle = '#e84a4a'; ctx.beginPath(); ctx.moveTo(x - 3.5, y + 8.2); ctx.lineTo(x + 8, y + 0.4); ctx.lineTo(x + 19.5, y + 8.2); ctx.fill();
      R(ctx, '#ff7a6a', x + 4, y + 4, 8, 0.6);
      if (open > 0) { R(ctx, '#5a3a1c', x + 2, y + 11, 12, 21); ctx.globalAlpha = 0.5 + 0.5 * open; R(ctx, '#fff2a0', x + 3, y + 12, 10, 20); ctx.globalAlpha = 1; }
      else {
        R(ctx, WOOD, x + 2, y + 11, 12, 21); R(ctx, '#f2c23a', x + 2.5, y + 11.5, 11, 20.5); R(ctx, '#ffe07a', x + 2.5, y + 11.5, 11, 0.8);
        R(ctx, '#9ad0f4', x + 5, y + 14, 6, 4); R(ctx, '#ffffff', x + 7.75, y + 14, 0.5, 4);
        ctx.fillStyle = '#3a7ae0'; ctx.beginPath(); ctx.arc(x + 11, y + 23, 1.2, 0, 7); ctx.fill();
      }
      if (o.lantern) { // a gold star on the roof, twinkling
        const s = 1 + Math.sin((o.t || 0) * 5) * 0.15;
        ctx.globalAlpha = 0.3; ctx.fillStyle = '#fff2a0'; ctx.beginPath(); ctx.arc(x + 8, y - 6, 8, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
        ctx.fillStyle = '#f2c23a'; ctx.beginPath();
        for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = (i % 2 ? 2.2 : 5) * s; ctx.lineTo(x + 8 + Math.cos(a) * r, y - 6 + Math.sin(a) * r); }
        ctx.fill(); ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 0.5; ctx.stroke();
      }
    }),
  });
})(window.KF);
