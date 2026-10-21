'use strict';
// Per-world presentation: the K.O. card, the start text, the win text, and the sounds that go
// with them. Every world speaks its own visual language: a 1950s studio gets an art-deco APPLAUSE
// sign and a laugh track, a Game Boy gets a GAME OVER box and a pulse-wave jingle, a woodblock
// print gets a red seal and a shamisen.
//
// API (logical 384x216 coordinates, ctx already scaled):
//   KF.Present.ko(ctx, styleId, t, o)     death / K.O. card. t = seconds since it appeared.
//   KF.Present.intro(ctx, styleId, t, o)  start text (replaces GO! / FIGHT!). t = seconds since start.
//   KF.Present.win(ctx, styleId, t, o)    win text (o.lose: the losing version, for fights).
//   KF.Present.sfx(styleId, event, opt)   event: 'death' | 'go' | 'win' | 'lose' | 'jump' | 'land'
//   KF.Present.onTop(styleId)             true if the card should be drawn after the style's pixel
//                                         pass (otherwise draw it into the world canvas before it)
//   KF.Present.add(styleId, spec)         register a new world: { ko, go, win, lose, snd } where
//                                         ko/go/win/lose = [painterName, text, extra] and
//                                         snd = { death, go, win, jump, land } (KF.Audio.fx names)
// o: { deaths, perfect, fight, lose, text (overrides the card's wording, e.g. 'TIME') }
(function (KF) {
  const VW = KF.VIEW_W, VH = KF.VIEW_H, U = KF.util, F = KF.Font;
  const CX = VW / 2, CY = 88; // cards sit centre-screen, clear of the top HUD strip
  const R = (ctx, c, x, y, w = 1, h = 1) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const outBack = (x) => { const c = 1.9; x = clamp01(x) - 1; return 1 + (c + 1) * x * x * x + c * x * x; };
  const outCubic = (x) => 1 - Math.pow(1 - clamp01(x), 3);
  const hash = (a, b) => U.hash2(a, b);

  // ---------- stroke font ----------
  // Capitals as polylines on a 4 x 10 grid (x right, y down). Drawn with canvas strokes, so the
  // same letters can be tall and thin (art deco), fat (comic), wobbly (pencil), dashed (thread)...
  const O_ = [[1, 0], [3, 0], [4, 1], [4, 9], [3, 10], [1, 10], [0, 9], [0, 1], [1, 0]];
  const G = {
    A: [[[0, 10], [2, 0], [4, 10]], [[0.8, 6.4], [3.2, 6.4]]],
    B: [[[0, 10], [0, 0], [2.8, 0], [3.7, 0.9], [3.7, 3.7], [2.8, 4.6], [0, 4.6]], [[2.8, 4.6], [4, 5.6], [4, 9], [3, 10], [0, 10]]],
    C: [[[4, 1.2], [3, 0], [1, 0], [0, 1], [0, 9], [1, 10], [3, 10], [4, 8.8]]],
    D: [[[0, 0], [0, 10], [2.4, 10], [4, 8.4], [4, 1.6], [2.4, 0], [0, 0]]],
    E: [[[4, 0], [0, 0], [0, 10], [4, 10]], [[0, 4.8], [3, 4.8]]],
    F: [[[4, 0], [0, 0], [0, 10]], [[0, 4.8], [3, 4.8]]],
    G: [[[4, 1.2], [3, 0], [1, 0], [0, 1], [0, 9], [1, 10], [3, 10], [4, 9], [4, 5.6], [2.2, 5.6]]],
    H: [[[0, 0], [0, 10]], [[4, 0], [4, 10]], [[0, 5], [4, 5]]],
    I: [[[2, 0], [2, 10]]],
    J: [[[4, 0], [4, 9], [3, 10], [1, 10], [0, 9]]],
    K: [[[0, 0], [0, 10]], [[4, 0], [0, 6]], [[1.4, 4.4], [4, 10]]],
    L: [[[0, 0], [0, 10], [4, 10]]],
    M: [[[0, 10], [0, 0], [2, 6], [4, 0], [4, 10]]],
    N: [[[0, 10], [0, 0], [4, 10], [4, 0]]],
    O: [O_],
    P: [[[0, 10], [0, 0], [3, 0], [4, 1], [4, 3.8], [3, 4.8], [0, 4.8]]],
    Q: [O_, [[2.4, 7.6], [4.3, 10.6]]],
    R: [[[0, 10], [0, 0], [3, 0], [4, 1], [4, 3.8], [3, 4.8], [0, 4.8]], [[2, 4.8], [4, 10]]],
    S: [[[4, 1.2], [3, 0], [1, 0], [0, 1], [0, 3.8], [1, 4.8], [3, 5.2], [4, 6.2], [4, 9], [3, 10], [1, 10], [0, 8.8]]],
    T: [[[0, 0], [4, 0]], [[2, 0], [2, 10]]],
    U: [[[0, 0], [0, 9], [1, 10], [3, 10], [4, 9], [4, 0]]],
    V: [[[0, 0], [2, 10], [4, 0]]],
    W: [[[0, 0], [1, 10], [2, 4], [3, 10], [4, 0]]],
    X: [[[0, 0], [4, 10]], [[4, 0], [0, 10]]],
    Y: [[[0, 0], [2, 5], [4, 0]], [[2, 5], [2, 10]]],
    Z: [[[0, 0], [4, 0], [0, 10], [4, 10]]],
    0: [O_, [[3.4, 1.6], [0.6, 8.4]]],
    1: [[[0.8, 1.8], [2, 0], [2, 10]], [[0.8, 10], [3.2, 10]]],
    2: [[[0, 1.2], [1, 0], [3, 0], [4, 1], [4, 3.8], [0, 10], [4, 10]]],
    3: [[[0, 1], [1, 0], [3, 0], [4, 1], [4, 3.8], [3, 4.8], [1.4, 4.8]], [[3, 4.8], [4, 5.8], [4, 9], [3, 10], [1, 10], [0, 9]]],
    4: [[[3, 10], [3, 0], [0, 7], [4, 7]]],
    5: [[[4, 0], [0, 0], [0, 4.4], [3, 4.4], [4, 5.4], [4, 9], [3, 10], [1, 10], [0, 9]]],
    6: [[[4, 1], [3, 0], [1, 0], [0, 1], [0, 9], [1, 10], [3, 10], [4, 9], [4, 6], [3, 5], [0, 5]]],
    7: [[[0, 0], [4, 0], [1.4, 10]]],
    8: [[[1, 0], [3, 0], [4, 1], [4, 3.8], [3, 4.8], [1, 4.8], [0, 3.8], [0, 1], [1, 0]], [[1, 4.8], [0, 5.8], [0, 9], [1, 10], [3, 10], [4, 9], [4, 5.8], [3, 4.8]]],
    9: [[[4, 5], [1, 5], [0, 4], [0, 1], [1, 0], [3, 0], [4, 1], [4, 9], [3, 10], [1, 10], [0, 9]]],
    '!': [[[2, 0], [2, 7]], [[2, 9.3], [2, 10]]],
    '?': [[[0, 1.4], [1, 0], [3, 0], [4, 1], [4, 3.4], [2, 5.4], [2, 7]], [[2, 9.3], [2, 10]]],
    '.': [[[2, 9.3], [2, 10]]], ',': [[[2, 9.3], [1.4, 11.2]]], "'": [[[2, 0], [2, 2.6]]],
    ':': [[[2, 3], [2, 3.7]], [[2, 9.3], [2, 10]]], '-': [[[0.6, 5.4], [3.4, 5.4]]],
    '/': [[[4, 0], [0, 10]]], '+': [[[2, 3], [2, 8]], [[-0.4, 5.5], [4.4, 5.5]]],
    '(': [[[3, 0], [1.4, 2], [1.4, 8], [3, 10]]], ')': [[[1, 0], [2.6, 2], [2.6, 8], [1, 10]]],
    '_': [[[0, 10], [4, 10]]], '"': [[[1.2, 0], [1.2, 2.6]], [[2.8, 0], [2.8, 2.6]]],
    '*': [[[2, 2], [2, 8]], [[-0.4, 3.5], [4.4, 6.5]], [[-0.4, 6.5], [4.4, 3.5]]],
    '&': [[[4, 10], [0.6, 4.4], [0.6, 1], [1.6, 0], [2.6, 0], [3.4, 1], [3.4, 2.8], [0, 6.4], [0, 9], [1, 10], [2.4, 10], [4, 7]]],
  };
  const NARROW = { I: 0.45, '!': 0.4, '.': 0.4, ',': 0.4, "'": 0.4, ':': 0.4, ' ': 0.7, '1': 0.8, '(': 0.6, ')': 0.6 };

  // Lay out a string: returns [{ch, x (advance start), adv}] and the total width.
  function layout(text, w, gap) {
    let x = 0; const out = [];
    for (const ch of String(text).toUpperCase()) { const adv = w * (NARROW[ch] || 1); out.push({ ch, x, adv }); x += adv + gap; }
    return { items: out, width: Math.max(0, x - gap) };
  }
  function measure(text, o) { const w = o.w ?? o.h * 0.42; return layout(text, w, o.gap ?? w * 0.42).width; }

  // o: { h (cap height), w (glyph width), lw, color, gap, align, slant, jitter, seed, progress (0..1
  //      of the strokes drawn), outline: [lw, color], shadow: [dx, dy, color], dash, serif, glow: [lw, color, alpha] }
  function strokeText(ctx, text, x, y, o) {
    const h = o.h, w = o.w ?? h * 0.42, gap = o.gap ?? w * 0.42, slant = o.slant || 0;
    const { items, width } = layout(text, w, gap);
    const x0 = o.align === 'left' ? x : o.align === 'right' ? x - width : x - width / 2, top = y - h / 2;
    const paths = [];
    items.forEach((it, gi) => {
      const g = G[it.ch]; if (!g) return;
      const nx = NARROW[it.ch] ? (it.adv - w) / 2 : 0;
      g.forEach((line, li) => paths.push(line.map(([gx, gy], pi) => {
        let px = x0 + it.x + nx + (gx / 4) * w + (1 - gy / 10) * h * slant, py = top + (gy / 10) * h;
        if (o.jitter) { px += (hash(gi * 31 + li * 7 + pi, o.seed || 1) - 0.5) * o.jitter * 2; py += (hash(gi * 17 + pi, li + (o.seed || 1) * 3) - 0.5) * o.jitter * 2; }
        return [px, py];
      })));
    });
    let segs = 0; for (const p of paths) segs += p.length - 1;
    const limit = o.progress === undefined ? Infinity : Math.floor(clamp01(o.progress) * segs + 0.999);
    const pass = (lw, color, dx = 0, dy = 0, alpha = 1) => {
      ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = color; ctx.lineWidth = lw;
      ctx.lineCap = o.cap || 'round'; ctx.lineJoin = o.join || 'round';
      if (o.dash) ctx.setLineDash(o.dash);
      ctx.beginPath();
      let n = 0;
      for (const p of paths) {
        if (n >= limit) break;
        ctx.moveTo(p[0][0] + dx, p[0][1] + dy);
        for (let i = 1; i < p.length && n < limit; i++, n++) ctx.lineTo(p[i][0] + dx, p[i][1] + dy);
      }
      ctx.stroke();
      if (o.serif) { // little feet on the open ends of strokes, for a printed, old-fashioned look
        const s = w * 0.28;
        for (const p of paths) for (const e of [p[0], p[p.length - 1]]) {
          const vert = Math.abs(p[0][0] - p[p.length - 1][0]) < Math.abs(p[0][1] - p[p.length - 1][1]);
          if (p.length > 2 || !vert) continue;
          ctx.beginPath(); ctx.moveTo(e[0] - s + dx, e[1] + dy); ctx.lineTo(e[0] + s + dx, e[1] + dy); ctx.stroke();
        }
      }
      ctx.restore();
    };
    const lw = o.lw ?? 1.5;
    if (o.glow) pass(o.glow[0], o.glow[1], 0, 0, o.glow[2] ?? 0.3);
    if (o.shadow) pass(lw + (o.outline ? o.outline[0] * 2 : 0), o.shadow[2], o.shadow[0], o.shadow[1]);
    if (o.outline) pass(lw + o.outline[0] * 2, o.outline[1]);
    pass(lw, o.color || '#fff');
    return width;
  }

  // ---------- shapes ----------
  function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
  function burst(ctx, cx, cy, r0, r1, n, rot, fill, stroke, lw = 2, seed = 1) {
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = rot + (i / (n * 2)) * Math.PI * 2, r = i % 2 ? r0 * (0.85 + hash(i, seed) * 0.3) : r1 * (0.8 + hash(seed, i) * 0.4);
      const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r * 0.72;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.lineJoin = 'miter'; ctx.stroke(); }
  }
  function diamond(ctx, x, y, s, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s, y); ctx.closePath(); ctx.fill(); }
  // Little scroll curl, used in deco and intertitle borders. dir: +1 / -1 mirrors it.
  function curl(ctx, x, y, dx, dy, s, c) {
    ctx.strokeStyle = c; ctx.lineWidth = 0.7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, s, 0, Math.PI * 2 * 0.8); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + dx * s * 2.6, y + dy * s * 0.6, s * 0.55, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx * s * 5, y); ctx.moveTo(x, y); ctx.lineTo(x, y + dy * s * 5); ctx.stroke();
  }
  function grunge(ctx, x, y, w, h, seed, c, n = 60, a = 0.18) {
    ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = c;
    for (let i = 0; i < n; i++) ctx.fillRect(x + hash(i, seed) * w, y + hash(seed, i) * h, 0.5 + hash(i * 3, seed) * 2.5, 0.5 + hash(seed, i * 5) * 1.2);
    ctx.restore();
  }
  function bevel(ctx, x, y, w, h, face, hi, lo) { R(ctx, lo, x, y, w, h); R(ctx, hi, x, y, w - 1, h - 1); R(ctx, face, x + 1, y + 1, w - 2, h - 2); }
  // Scale everything drawn in fn about (cx, cy).
  function scaled(ctx, cx, cy, s, fn, rot = 0) { ctx.save(); ctx.translate(cx, cy); if (rot) ctx.rotate(rot); ctx.scale(s, s); ctx.translate(-cx, -cy); fn(); ctx.restore(); }
  const alphaIn = (t, d = 0.12) => clamp01(t / d);

  // ---------- painters: (ctx, t, text, o, x) ----------
  // x = painter-specific extras from the spec (sub-line, colours...).
  const P = {};

  // Classic arcade lettering (the default).
  P.arcade = (ctx, t, text, o, x = {}) => {
    const sc = x.scale || (text.length > 6 ? 4 : 7), z = t < 0.1 ? 4 - 3 * (t / 0.1) : 1;
    KF.BigText.draw(ctx, text, CX, CY + 4, sc, x.style || 'blood', z, x.fade ? clamp01(1 - (t - 0.5) * 3) : 1);
  };

  // 1950s studio sign: art-deco thin capitals on a grungy board with filigree, lit up with a flicker.
  P.deco = (ctx, t, text, o, x = {}) => {
    const h = 26, tw = measure(text, { h, w: 8.5, gap: 5 }), W = Math.max(150, tw + 64), H = 62;
    const bx = Math.round(CX - W / 2), by = Math.round(CY - H / 2);
    const on = t > 0.28 || [0, 1, 0, 1, 1, 0, 1][Math.floor(t * 25)] === 1; // the bulb behind it catches
    R(ctx, '#050404', bx - 2, by - 2, W + 4, H + 4);
    R(ctx, x.board || '#191513', bx, by, W, H);
    grunge(ctx, bx, by, W, H, 7, '#8a8070', 120, 0.22);
    grunge(ctx, bx, by, W, H, 3, '#000', 60, 0.35);
    const ink = x.ink || '#e6dac2';
    ctx.strokeStyle = ink; ctx.lineWidth = 0.6;
    ctx.strokeRect(bx + 4.5, by + 4.5, W - 9, H - 9); ctx.strokeRect(bx + 6.5, by + 6.5, W - 13, H - 13);
    curl(ctx, bx + 6.5, by + 6.5, 1, 1, 2.2, ink); curl(ctx, bx + W - 6.5, by + 6.5, -1, 1, 2.2, ink);
    curl(ctx, bx + 6.5, by + H - 6.5, 1, -1, 2.2, ink); curl(ctx, bx + W - 6.5, by + H - 6.5, -1, -1, 2.2, ink);
    for (const yy of [by + 4.5, by + H - 4.5]) { // the little crests top and bottom
      R(ctx, x.board || '#191513', CX - 12, yy - 2, 24, 4);
      curl(ctx, CX - 2, yy, -1, yy < CY ? 1 : -1, 1.6, ink); curl(ctx, CX + 2, yy, 1, yy < CY ? 1 : -1, 1.6, ink); diamond(ctx, CX, yy, 1.6, ink);
    }
    diamond(ctx, bx + 16, CY, 3, ink); diamond(ctx, bx + W - 16, CY, 3, ink);
    const lit = on ? 1 : 0.35;
    ctx.save(); ctx.globalAlpha *= lit;
    if (on) { const g = ctx.createRadialGradient(CX, CY, 4, CX, CY, W * 0.55); g.addColorStop(0, 'rgba(255,240,210,0.16)'); g.addColorStop(1, 'rgba(255,240,210,0)'); ctx.fillStyle = g; ctx.fillRect(bx, by, W, H); }
    strokeText(ctx, text, CX, CY, { h, w: 8.5, gap: 5, lw: 1.1, color: ink, cap: 'butt', join: 'miter', glow: on ? [3.2, ink, 0.18] : null });
    ctx.restore();
    if (x.sub) F.draw(ctx, x.sub, CX, by + H + 6, '#e6dac2', 1, 'center', '#000');
  };

  // Silent-film intertitle: black card, ornate double border, printed serif capitals, flicker.
  P.intertitle = (ctx, t, text, o, x = {}) => {
    const W = 236, H = 88, bx = CX - W / 2, by = CY - H / 2 + 2;
    const flick = 0.9 + hash(Math.floor(t * 18), 5) * 0.1;
    ctx.save(); ctx.globalAlpha *= alphaIn(t, 0.08) * flick;
    R(ctx, '#0b0907', bx, by, W, H);
    grunge(ctx, bx, by, W, H, Math.floor(t * 12), '#e8dcc0', 40, 0.25);
    const ink = '#efe5cf';
    ctx.strokeStyle = ink; ctx.lineWidth = 1; ctx.strokeRect(bx + 5.5, by + 5.5, W - 11, H - 11); ctx.lineWidth = 0.5; ctx.strokeRect(bx + 8.5, by + 8.5, W - 17, H - 17);
    for (const [cx, cy, dx, dy] of [[bx + 8.5, by + 8.5, 1, 1], [bx + W - 8.5, by + 8.5, -1, 1], [bx + 8.5, by + H - 8.5, 1, -1], [bx + W - 8.5, by + H - 8.5, -1, -1]]) {
      ctx.beginPath(); ctx.arc(cx, cy, 6, dx > 0 ? (dy > 0 ? 0 : -Math.PI / 2) : (dy > 0 ? Math.PI / 2 : Math.PI), dx > 0 ? (dy > 0 ? Math.PI / 2 : 0) : (dy > 0 ? Math.PI : Math.PI * 1.5)); ctx.stroke();
      diamond(ctx, cx + dx * 9, cy + dy * 9, 1.4, ink);
    }
    strokeText(ctx, text, CX, by + 32, { h: 20, w: 9, lw: 1.6, color: ink, serif: true, cap: 'butt' });
    if (x.sub) strokeText(ctx, x.sub, CX, by + 62, { h: 7, w: 3.6, gap: 1.6, lw: 0.8, color: ink, serif: true, cap: 'butt' });
    ctx.restore();
    // scratches running down the film
    ctx.save(); ctx.globalAlpha *= 0.6;
    for (let k = 0; k < 3; k++) R(ctx, '#efe5cf', bx + hash(Math.floor(t * 24), k) * W, by, 0.5, H);
    ctx.restore();
  };

  // Comic burst: a jagged star with speed lines, fat outlined lettering popping in.
  P.pow = (ctx, t, text, o, x = {}) => {
    const s = outBack(t / 0.16), seed = (o.deaths || 0) + 3;
    scaled(ctx, CX, CY, s, () => {
      ctx.strokeStyle = '#111'; ctx.lineWidth = 1.2;
      for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(CX + Math.cos(a) * 70, CY + Math.sin(a) * 46); ctx.lineTo(CX + Math.cos(a) * 96, CY + Math.sin(a) * 64); ctx.stroke(); }
      burst(ctx, CX, CY, 46, 74, 13, 0.2, x.outer || '#e8262a', '#111', 2.5, seed);
      burst(ctx, CX, CY, 34, 54, 11, 0.5, x.inner || '#ffe23a', '#111', 1.5, seed + 9);
      strokeText(ctx, text, CX + 2, CY, { h: 24, w: 13, gap: 3, lw: 4.2, slant: 0.22, color: x.ink || '#fff', outline: [1.6, '#111'], shadow: [3, 3, x.shadow || '#c01818'], cap: 'square', join: 'miter' });
    }, -0.06);
  };

  // Comic speech balloon with a tail.
  P.balloon = (ctx, t, text, o, x = {}) => {
    const s = outBack(t / 0.18), w = measure(text, { h: 12, w: 6.5, gap: 2.4 }) + 30, h = 34;
    scaled(ctx, CX, CY, s, () => {
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(CX, CY, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.moveTo(CX - 18, CY + 12); ctx.lineTo(CX - 34, CY + 34); ctx.lineTo(CX - 4, CY + 15); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(CX, CY, w / 2 - 1, h / 2 - 1, 0, 0, Math.PI * 2); ctx.fill();
      if (x.dots) { ctx.save(); ctx.clip(); ctx.fillStyle = 'rgba(255,120,160,0.35)'; for (let yy = CY - h; yy < CY + h; yy += 4) for (let xx = CX - w; xx < CX + w; xx += 4) { ctx.beginPath(); ctx.arc(xx + ((yy / 4) % 2) * 2, yy, 0.9, 0, 7); ctx.fill(); } ctx.restore(); }
      strokeText(ctx, text, CX, CY, { h: 12, w: 6.5, gap: 2.4, lw: 2.2, color: '#111', cap: 'square', join: 'miter', slant: 0.12 });
    });
  };

  // Game Boy: a bordered message box in the pixel font (the palette pass turns it four-green).
  P.gbBox = (ctx, t, text, o, x = {}) => {
    const W = 156, H = x.sub ? 52 : 38, bx = Math.round(CX - W / 2), by = Math.round(CY - H / 2);
    R(ctx, '#000', bx, by, W, H); R(ctx, '#fff', bx + 2, by + 2, W - 4, H - 4); R(ctx, '#000', bx + 4, by + 4, W - 8, H - 8); R(ctx, '#e8f0d8', bx + 5, by + 5, W - 10, H - 10);
    F.draw(ctx, text, CX, by + 11, '#000', 2, 'center');
    if (x.sub) { F.draw(ctx, x.sub, CX, by + 34, '#000', 1, 'center'); if (Math.floor(t * 4) % 2) R(ctx, '#000', CX - F.measure(x.sub) / 2 - 8, by + 35, 4, 5); }
  };

  // VHS on-screen display: chunky white OSD with a hard shadow, plus a tracking glitch band.
  P.osd = (ctx, t, text, o, x = {}) => {
    const sx = 18, sy = 24, big = x.big ? 3 : 2;
    const icon = x.icon || 'stop';
    const draw = (dx, c) => {
      ctx.fillStyle = c;
      const s = big * 7;
      if (icon === 'stop') ctx.fillRect(sx + dx, sy + dx, s, s);
      else if (icon === 'play') { ctx.beginPath(); ctx.moveTo(sx + dx, sy + dx); ctx.lineTo(sx + s + dx, sy + s / 2 + dx); ctx.lineTo(sx + dx, sy + s + dx); ctx.fill(); }
      else { for (const ox of [0, s * 0.65]) { ctx.beginPath(); ctx.moveTo(sx + s * 0.65 + ox + dx, sy + dx); ctx.lineTo(sx + ox + dx, sy + s / 2 + dx); ctx.lineTo(sx + s * 0.65 + ox + dx, sy + s + dx); ctx.fill(); } }
      F.draw(ctx, text, sx + (icon === 'rew' ? s * 1.6 : s * 1.4) + dx, sy + dx, c, big);
    };
    draw(1, '#000'); draw(0, '#fff');
    if (x.sub) { F.draw(ctx, x.sub, CX, CY + 10, '#000', 2, 'center'); F.draw(ctx, x.sub, CX - 1, CY + 9, '#fff', 2, 'center'); }
    const band = ((t * 160) % 120) + 40;
    ctx.save(); ctx.globalAlpha *= 0.5; for (let k = 0; k < 6; k++) R(ctx, k % 2 ? '#fff' : '#9ab', 0, band + k * 1.5, VW, 0.5); ctx.restore();
  };

  // Rubber stamp: thick double frame, slammed down at an angle.
  P.stamp = (ctx, t, text, o, x = {}) => {
    const s = t < 0.09 ? 2.2 - 1.2 * (t / 0.09) : 1, c = x.color || '#d8302a';
    const tw = measure(text, { h: 18, w: 10, gap: 3 }) + 24;
    scaled(ctx, CX, CY, s, () => {
      ctx.save(); ctx.globalAlpha *= t < 0.09 ? 0.5 : 0.92;
      ctx.strokeStyle = c; ctx.lineWidth = 3; rrect(ctx, CX - tw / 2, CY - 19, tw, 38, 3); ctx.stroke();
      ctx.lineWidth = 1; rrect(ctx, CX - tw / 2 + 4, CY - 15, tw - 8, 30, 2); ctx.stroke();
      strokeText(ctx, text, CX, CY, { h: 18, w: 10, gap: 3, lw: 3, color: c, cap: 'butt', join: 'miter' });
      if (x.sub) F.draw(ctx, x.sub, CX, CY + 24, c, 1, 'center');
      ctx.restore();
    }, -0.18);
  };

  // AR phone popup card.
  P.popup = (ctx, t, text, o, x = {}) => {
    const s = outBack(t / 0.2), W = 176, H = 76, bx = CX - W / 2, by = CY - H / 2;
    scaled(ctx, CX, CY, s, () => {
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; rrect(ctx, bx + 2, by + 3, W, H, 10); ctx.fill();
      ctx.fillStyle = '#ffffff'; rrect(ctx, bx, by, W, H, 10); ctx.fill();
      ctx.fillStyle = x.band || '#ff5a4a'; rrect(ctx, bx, by, W, 18, [10, 10, 0, 0]); ctx.fill();
      F.draw(ctx, x.app || 'POCKET FIGHTERS AR', CX, by + 6, '#fff', 1, 'center');
      ctx.fillStyle = x.band || '#ff5a4a'; ctx.beginPath(); ctx.arc(bx + 24, by + 42, 10, 0, 7); ctx.fill();
      F.draw(ctx, x.icon || '!', bx + 24, by + 38, '#fff', 1, 'center');
      strokeText(ctx, text, bx + 42, by + 38, { h: 13, w: 7, gap: 2.2, lw: 2.2, color: '#1a1a2a', align: 'left', cap: 'round' });
      if (x.sub) { ctx.fillStyle = x.button || '#2a9aff'; rrect(ctx, bx + 42, by + 52, 100, 14, 7); ctx.fill(); F.draw(ctx, x.sub, bx + 92, by + 56, '#fff', 1, 'center'); }
    });
  };

  // Film-noir end title: slanted script on a black band with fine rules.
  P.script = (ctx, t, text, o, x = {}) => {
    const a = alphaIn(t, 0.25);
    ctx.save(); ctx.globalAlpha *= a;
    R(ctx, 'rgba(0,0,0,0.88)', 0, CY - 34, VW, 68);
    R(ctx, '#fff', CX - 120, CY - 26, 240, 0.5); R(ctx, '#fff', CX - 120, CY + 26, 240, 0.5);
    strokeText(ctx, text, CX, CY - 3, { h: 24, w: 10, gap: 3.4, lw: 1.5, slant: 0.38, color: '#ffffff', glow: [4, '#fff', 0.12] });
    if (x.sub) F.draw(ctx, x.sub, CX, CY + 15, '#e8e8e8', 1, 'center');
    ctx.restore();
  };

  // DOS adventure message box.
  P.dosBox = (ctx, t, text, o, x = {}) => {
    const W = 228, H = x.opts ? 66 : 52, bx = Math.round(CX - W / 2), by = Math.round(CY - H / 2);
    R(ctx, '#000', bx, by, W, H);
    for (const k of [2, 4]) { ctx.strokeStyle = '#ff55ff'; ctx.lineWidth = 1; ctx.strokeRect(bx + k + 0.5, by + k + 0.5, W - k * 2 - 1, H - k * 2 - 1); }
    R(ctx, '#55ffff', bx + 6, by + 6, W - 12, 10); F.draw(ctx, x.title || 'MESSAGE', CX, by + 8, '#000', 1, 'center');
    F.draw(ctx, text, bx + 14, by + 24, '#fff', 1);
    if (x.sub) F.draw(ctx, x.sub, bx + 14, by + 36, '#55ffff', 1);
    if (x.opts) {
      let ox = bx + 14;
      x.opts.forEach((op, i) => { const sel = i === 1, w = F.measure(op) + 6; if (sel) R(ctx, '#55ffff', ox - 3, by + 47, w, 11); F.draw(ctx, op, ox, by + 49, sel ? '#000' : '#fff', 1); ox += w + 12; });
    } else if (Math.floor(t * 3) % 2) R(ctx, '#fff', bx + 14 + F.measure(text) + 2, by + 24, 5, 7);
  };

  // Corrupted text: RGB split, sliced bands shoved sideways, characters swapping.
  P.glitch = (ctx, t, text, o, x = {}) => {
    const fr = Math.floor(t * 20), junk = '#%&$0X/_';
    const shown = [...text].map((ch, i) => (ch !== ' ' && hash(fr, i) < 0.08 ? junk[Math.floor(hash(i, fr) * junk.length)] : ch)).join('');
    const opt = { h: 22, w: 11, gap: 3, lw: 3, cap: 'butt', join: 'miter' };
    R(ctx, 'rgba(0,0,0,0.6)', 0, CY - 22, VW, 44);
    for (let b = 0; b < 6; b++) {
      const y0 = CY - 14 + b * 5, off = hash(fr, b + 40) < 0.35 ? (hash(b, fr) - 0.5) * 14 : 0;
      ctx.save(); ctx.beginPath(); ctx.rect(0, y0, VW, 5); ctx.clip();
      strokeText(ctx, shown, CX + off - 2, CY, { ...opt, color: '#ff2a6a' });
      strokeText(ctx, shown, CX + off + 2, CY, { ...opt, color: '#2affe6' });
      strokeText(ctx, shown, CX + off, CY, { ...opt, color: '#ffffff' });
      ctx.restore();
    }
    const hex = Array.from({ length: 10 }, (_, i) => Math.floor(hash(fr + i, 3) * 256).toString(16).toUpperCase().padStart(2, '0')).join(' ');
    F.draw(ctx, x.sub || hex, CX, CY + 20, '#2affe6', 1, 'center');
  };

  // Vaporwave: an old OS error window with pastel spaced lettering.
  P.vapor = (ctx, t, text, o, x = {}) => {
    const s = outCubic(t / 0.25), W = 212, H = 78, bx = Math.round(CX - W / 2), by = Math.round(CY - H / 2 + (1 - s) * 30);
    ctx.save(); ctx.globalAlpha *= s;
    bevel(ctx, bx, by, W, H, '#c8c0d0', '#ffffff', '#4a4458');
    const g = ctx.createLinearGradient(bx, 0, bx + W, 0); g.addColorStop(0, '#ff6ac8'); g.addColorStop(1, '#4ae0ff');
    ctx.fillStyle = g; ctx.fillRect(bx + 3, by + 3, W - 6, 11);
    F.draw(ctx, x.title || 'ERROR.EXE', bx + 6, by + 5, '#fff', 1);
    bevel(ctx, bx + W - 13, by + 4, 9, 9, '#c8c0d0', '#fff', '#4a4458'); F.draw(ctx, 'X', bx + W - 11, by + 5, '#000', 1);
    strokeText(ctx, text, CX, by + 38, { h: 14, w: 7, gap: 7, lw: 1.6, color: '#ff4ab8', shadow: [1.5, 1.5, '#2ac8ff'] });
    bevel(ctx, CX - 20, by + H - 20, 40, 14, '#c8c0d0', '#fff', '#4a4458'); F.draw(ctx, x.button || 'OK', CX, by + H - 16, '#000', 1, 'center');
    ctx.restore();
  };

  // Carnival marquee with chasing bulbs. mirror: the text is drawn back to front.
  P.marquee = (ctx, t, text, o, x = {}) => {
    const s = outBack(t / 0.2), W = Math.max(150, measure(text, { h: 20, w: 11, gap: 3 }) + 50), H = 56, bx = CX - W / 2, by = CY - H / 2;
    scaled(ctx, CX, CY, s, () => {
      R(ctx, '#3a0810', bx - 3, by - 3, W + 6, H + 6); R(ctx, '#d8a020', bx - 1, by - 1, W + 2, H + 2); R(ctx, '#a01828', bx + 3, by + 3, W - 6, H - 6);
      const per = [];
      for (let i = 0; i < W; i += 9) { per.push([bx + i, by]); per.push([bx + i, by + H]); }
      for (let j = 9; j < H; j += 9) { per.push([bx, by + j]); per.push([bx + W, by + j]); }
      per.forEach(([px, py], i) => { const on = (i + Math.floor(t * 12)) % 3 !== 0; ctx.fillStyle = on ? '#fff6c0' : '#6a4a20'; ctx.beginPath(); ctx.arc(px, py, 1.8, 0, 7); ctx.fill(); });
      ctx.save();
      if (x.mirror) { ctx.translate(CX * 2, 0); ctx.scale(-1, 1); }
      strokeText(ctx, text, CX, CY - (x.sub ? 4 : 0), { h: 20, w: 11, gap: 3, lw: 3, color: '#ffe27a', outline: [1, '#3a0810'], shadow: [2, 2, '#3a0810'] });
      if (x.sub) F.draw(ctx, x.sub, CX, CY + 12, '#fff6c0', 1, 'center', '#3a0810');
      ctx.restore();
    });
  };

  // Surveillance / night-vision HUD: corner brackets, flat-line, block capitals.
  P.hud = (ctx, t, text, o, x = {}) => {
    const c = x.color || '#ffffff', W = 210, H = 64, bx = CX - W / 2, by = CY - H / 2;
    R(ctx, 'rgba(0,0,0,0.55)', bx, by, W, H);
    ctx.strokeStyle = c; ctx.lineWidth = 1.2;
    for (const [px, py, dx, dy] of [[bx, by, 1, 1], [bx + W, by, -1, 1], [bx, by + H, 1, -1], [bx + W, by + H, -1, -1]]) { ctx.beginPath(); ctx.moveTo(px + dx * 12, py); ctx.lineTo(px, py); ctx.lineTo(px, py + dy * 12); ctx.stroke(); }
    if (Math.floor(t * 4) % 2 || t > 0.6) strokeText(ctx, text, CX, by + 20, { h: 16, w: 9, gap: 3, lw: 2.2, color: c, cap: 'butt', join: 'miter' });
    ctx.lineWidth = 1; ctx.beginPath(); // the line goes flat
    const lx = bx + 20, len = W - 40, k = clamp01(t / 0.5);
    ctx.moveTo(lx, by + 44);
    for (let i = 0; i <= 40 * k; i++) { const px = lx + (i / 40) * len, beat = i > 6 && i < 12 ? Math.sin((i - 6) * 1.1) * (i < 9 ? 10 : -6) : 0; ctx.lineTo(px, by + 44 - beat); }
    ctx.stroke();
    if (x.sub) F.draw(ctx, x.sub, CX, by + H - 10, c, 1, 'center');
  };

  // A crashed program's error dialog.
  P.dialog = (ctx, t, text, o, x = {}) => {
    const W = 232, H = 84, bx = Math.round(CX - W / 2), by = Math.round(CY - H / 2);
    bevel(ctx, bx, by, W, H, '#c0c0c0', '#ffffff', '#404040');
    R(ctx, '#0a2a8a', bx + 3, by + 3, W - 6, 11); F.draw(ctx, x.title || 'KUNGFOOLED.EXE', bx + 6, by + 5, '#fff', 1);
    ctx.fillStyle = x.ok ? '#2a6ad8' : '#d82020'; ctx.beginPath(); ctx.arc(bx + 20, by + 32, 9, 0, 7); ctx.fill();
    F.draw(ctx, x.ok ? 'I' : 'X', bx + 20, by + 29, '#fff', 1, 'center');
    const lines = text.split('|');
    lines.forEach((l, i) => F.draw(ctx, l, bx + 36, by + 22 + i * 10, '#000', 1));
    const btns = x.buttons || ['CLOSE', 'DETAILS >>'];
    let ox = bx + W - 10;
    for (let i = btns.length - 1; i >= 0; i--) { const w = F.measure(btns[i]) + 12; ox -= w; bevel(ctx, ox, by + H - 19, w, 14, '#c0c0c0', '#fff', '#404040'); F.draw(ctx, btns[i], ox + w / 2, by + H - 15, '#000', 1, 'center'); ox -= 6; }
  };

  // Pencil lettering being scribbled on, with a circle around it.
  P.pencil = (ctx, t, text, o, x = {}) => {
    const k = clamp01(t / 0.32), c = x.color || '#34343c';
    const opt = { h: 26, w: 12, gap: 4, lw: 1.3, color: c, jitter: 0.9, seed: 4, progress: k };
    strokeText(ctx, text, CX, CY, opt); strokeText(ctx, text, CX + 0.7, CY + 0.5, { ...opt, seed: 9, lw: 0.8 });
    if (t > 0.3) { // circled (in red pen for the win)
      ctx.strokeStyle = x.ring || c; ctx.lineWidth = 1; ctx.beginPath();
      const rr = clamp01((t - 0.3) / 0.25);
      for (let i = 0; i <= 60 * rr; i++) { const a = -0.8 + (i / 52) * Math.PI * 2, j = 1 + (hash(i, 2) - 0.5) * 0.06; const px = CX + Math.cos(a) * (measure(text, opt) / 2 + 18) * j, py = CY + Math.sin(a) * 24 * j; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke();
    }
    if (x.sub) strokeText(ctx, x.sub, CX, CY + 36, { h: 8, w: 4, gap: 2, lw: 0.9, color: c, jitter: 0.5, seed: 2 });
  };

  // Ink brush lettering with a red seal stamped beside it.
  P.brush = (ctx, t, text, o, x = {}) => {
    const k = clamp01(t / 0.3), ink = x.ink || '#16120e';
    const opt = { h: 28, w: 13, gap: 5, lw: 4, color: ink, jitter: 0.7, seed: 6, progress: k, cap: 'round' };
    const tw = measure(text, opt);
    for (let i = 0; i < 3; i++) strokeText(ctx, text, CX - 14 + i * 0.6, CY + (i - 1) * 0.5, { ...opt, lw: opt.lw - i * 1.2, seed: 6 + i });
    ctx.save(); ctx.globalAlpha *= 0.25; strokeText(ctx, text, CX - 14, CY, { ...opt, lw: 7, seed: 12 }); ctx.restore(); // wet bleed
    if (t > 0.25) seal(ctx, CX - 14 + tw / 2 + 20, CY + 8, 15, x.seal || 'KO', t - 0.25);
  };
  function seal(ctx, cx, cy, s, text, t) {
    const z = t < 0.08 ? 1.6 - 0.6 * (t / 0.08) : 1;
    scaled(ctx, cx, cy, z, () => {
      ctx.fillStyle = '#c8281e'; rrect(ctx, cx - s, cy - s, s * 2, s * 2, 2); ctx.fill();
      ctx.strokeStyle = '#f4e8d0'; ctx.lineWidth = 1; ctx.strokeRect(cx - s + 3, cy - s + 3, s * 2 - 6, s * 2 - 6);
      const two = text.length <= 2;
      strokeText(ctx, text, cx, cy, { h: two ? s * 0.95 : s * 0.55, w: two ? s * 0.5 : s * 0.3, gap: 1.5, lw: 1.8, color: '#f4e8d0', cap: 'butt' });
    }, 0.05);
  }

  // Green terminal box drawn with ASCII characters.
  P.ascii = (ctx, t, text, o, x = {}) => {
    const lines = [text].concat(x.sub ? [x.sub] : []), w = Math.max(...lines.map((l) => l.length)) + 4;
    const rows = ['+' + '-'.repeat(w) + '+', ...lines.map((l) => '|' + l.padStart(Math.floor((w + l.length) / 2)).padEnd(w) + '|'), '+' + '-'.repeat(w) + '+'];
    const bw = F.measure(rows[0]) + 8, bh = rows.length * 10 + 6;
    R(ctx, '#030603', CX - bw / 2, CY - bh / 2, bw, bh);
    rows.forEach((r, i) => F.draw(ctx, r, CX, CY - bh / 2 + 4 + i * 10, i === 1 ? '#b8ffc8' : '#3acc5a', 1, 'center'));
    if (Math.floor(t * 3) % 2) R(ctx, '#b8ffc8', CX + bw / 2 - 2, CY + bh / 2 - 9, 5, 7);
  };

  // Wooden toy blocks, one letter each, dropping in with a bounce.
  P.blocks = (ctx, t, text, o, x = {}) => {
    const cols = ['#e8463a', '#2a7ad8', '#f2c230', '#3aa858', '#e87ab8', '#8a5ad8'];
    const S = 28, gap = 6, letters = [...text], total = letters.length * (S + gap) - gap;
    letters.forEach((ch, i) => {
      const lt = t - i * 0.07, fall = lt < 0 ? 1 : lt < 0.16 ? 1 - (lt / 0.16) ** 2 : 0, bounce = lt > 0.16 && lt < 0.28 ? Math.sin(((lt - 0.16) / 0.12) * Math.PI) * 4 : 0;
      if (lt < 0) return;
      const bx = CX - total / 2 + i * (S + gap), by = CY - S / 2 - fall * 120 - bounce, c = cols[(i + (x.shift || 0)) % cols.length];
      const d = 7;
      ctx.fillStyle = shade(c, 1.25); ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + d, by - d); ctx.lineTo(bx + S + d, by - d); ctx.lineTo(bx + S, by); ctx.fill();
      ctx.fillStyle = shade(c, 0.7); ctx.beginPath(); ctx.moveTo(bx + S, by); ctx.lineTo(bx + S + d, by - d); ctx.lineTo(bx + S + d, by + S - d); ctx.lineTo(bx + S, by + S); ctx.fill();
      R(ctx, c, bx, by, S, S); ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 1; ctx.strokeRect(bx + 0.5, by + 0.5, S - 1, S - 1);
      ctx.strokeStyle = '#fff6e0'; ctx.lineWidth = 0.8; ctx.strokeRect(bx + 3.5, by + 3.5, S - 7, S - 7);
      strokeText(ctx, ch, bx + S / 2, by + S / 2, { h: 15, w: 9, lw: 3, color: '#fff6e0', outline: [1, '#2a1a10'], cap: 'butt' });
    });
  };
  function shade(hex, f) { const n = parseInt(hex.slice(1), 16); return '#' + [16, 8, 0].map((k) => Math.min(255, Math.round(((n >> k) & 255) * f)).toString(16).padStart(2, '0')).join(''); }

  // NES: plain black band, white pixel capitals.
  P.nes = (ctx, t, text, o, x = {}) => {
    R(ctx, '#000', 0, CY - 24, VW, 48);
    F.draw(ctx, text, CX, CY - 12, '#fcfcfc', 2, 'center');
    if (x.sub) F.draw(ctx, x.sub, CX, CY + 8, '#f8b800', 1, 'center');
  };

  // A frame of film negative with sprocket holes (designed in positive: the style inverts it).
  P.film = (ctx, t, text, o, x = {}) => {
    const W = 260, H = 76, bx = CX - W / 2, by = CY - H / 2;
    const slide = (1 - outCubic(t / 0.22)) * -60;
    ctx.save(); ctx.translate(slide, 0);
    R(ctx, '#141414', bx, by, W, H);
    for (let i = 6; i < W - 6; i += 12) { R(ctx, '#e8e8e8', bx + i, by + 4, 6, 6); R(ctx, '#e8e8e8', bx + i, by + H - 10, 6, 6); }
    R(ctx, '#d8d4cc', bx + 10, by + 15, W - 20, H - 30);
    strokeText(ctx, text, CX, CY, { h: 18, w: 9.5, gap: 3, lw: 2.6, color: '#101010', cap: 'butt' });
    F.draw(ctx, x.sub || `KF 400   ${(o.deaths || 0) + 12}A`, bx + 14, by + H - 9, '#3a6aa0', 1);
    ctx.restore();
  };

  // Clapperboard: chalk board, striped sticks that clack shut.
  P.clapper = (ctx, t, text, o, x = {}) => {
    const W = 150, H = 92, bx = CX - W / 2, by = CY - H / 2 + 8;
    const open = t < 0.12 ? 0.5 * (1 - t / 0.12) : 0;
    R(ctx, '#151515', bx, by, W, H);
    ctx.strokeStyle = '#e8e8e8'; ctx.lineWidth = 0.8; ctx.strokeRect(bx + 4.5, by + 4.5, W - 9, H - 9);
    R(ctx, '#e8e8e8', bx + 5, by + 30, W - 10, 0.8); R(ctx, '#e8e8e8', bx + W / 2, by + 5, 0.8, 25);
    F.draw(ctx, x.scene || 'SCENE 3', bx + 10, by + 12, '#e8e8e8', 1); F.draw(ctx, `TAKE ${(o.deaths || 0) + 1}`, bx + W / 2 + 6, by + 12, '#e8e8e8', 1);
    strokeText(ctx, text, CX, by + 52, { h: 18, w: 10, gap: 3, lw: 2.2, color: '#f4f4f4', jitter: 0.4, seed: 3, cap: 'butt' });
    F.draw(ctx, 'DIR: BAO   CAM: A', CX, by + H - 14, '#c8c8c8', 1, 'center');
    const stick = (ang) => {
      ctx.save(); ctx.translate(bx, by); ctx.rotate(-ang);
      R(ctx, '#151515', 0, -12, W, 12);
      for (let i = 0; i < W; i += 16) { ctx.fillStyle = '#f0f0f0'; ctx.beginPath(); ctx.moveTo(i, -12); ctx.lineTo(i + 8, -12); ctx.lineTo(i + 2, 0); ctx.lineTo(i - 6, 0); ctx.fill(); }
      ctx.restore();
    };
    stick(open); // top stick swings shut
  };

  // Pop-art explosion: ben-day dotted burst, bold yellow lettering.
  P.whaam = (ctx, t, text, o, x = {}) => {
    const s = outBack(t / 0.16);
    scaled(ctx, CX, CY, s, () => {
      burst(ctx, CX, CY, 52, 86, 15, 0, '#ff3a1a', '#111', 3, 11);
      ctx.save(); burst(ctx, CX, CY, 40, 64, 13, 0.3, '#ffb81a', '#111', 2, 17); ctx.clip();
      ctx.fillStyle = '#ff3a1a'; for (let yy = CY - 70; yy < CY + 70; yy += 5) for (let xx = CX - 90; xx < CX + 90; xx += 5) { ctx.beginPath(); ctx.arc(xx + ((yy / 5) % 2) * 2.5, yy, 1.3, 0, 7); ctx.fill(); }
      ctx.restore();
      strokeText(ctx, text, CX, CY, { h: 26, w: 14, gap: 3, lw: 5, color: x.ink || '#fff23a', outline: [2, '#111'], shadow: [3, 3, '#111'], cap: 'square', join: 'miter', slant: 0.1 });
    });
  };

  // Vector arcade: glowing wireframe capitals with a starburst of lines.
  P.vector = (ctx, t, text, o, x = {}) => {
    const c = x.color || '#6affb0', k = outCubic(t / 0.3);
    ctx.save(); ctx.strokeStyle = c; ctx.globalAlpha *= 0.6 * (1 - k * 0.6); ctx.lineWidth = 0.7;
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(CX + Math.cos(a) * 30 * k, CY + Math.sin(a) * 20 * k); ctx.lineTo(CX + Math.cos(a) * 160 * k, CY + Math.sin(a) * 100 * k); ctx.stroke(); }
    ctx.restore();
    strokeText(ctx, text, CX, CY, { h: 22, w: 12, gap: 4, lw: 1.2, color: '#eafff2', glow: [5, c, 0.35], cap: 'round' });
    if (x.sub) strokeText(ctx, x.sub, CX, CY + 24, { h: 7, w: 4, gap: 2, lw: 0.8, color: c, glow: [3, c, 0.3] });
  };

  // Storybook ribbon banner with folded tails.
  P.ribbon = (ctx, t, text, o, x = {}) => {
    const k = outCubic(t / 0.25), tw = measure(text, { h: 14, w: 7.5, gap: 2.6 }), W = (tw + 40) * k, H = 28, bx = CX - W / 2, by = CY - H / 2;
    if (W < 4) return;
    const red = x.color || '#c8443a';
    ctx.fillStyle = shade(red, 0.65);
    for (const s of [-1, 1]) { const ex = s < 0 ? bx : bx + W; ctx.beginPath(); ctx.moveTo(ex, by + 6); ctx.lineTo(ex + s * 22, by + 6); ctx.lineTo(ex + s * 14, by + H / 2 + 6); ctx.lineTo(ex + s * 22, by + H + 6); ctx.lineTo(ex, by + H + 6); ctx.fill(); }
    R(ctx, red, bx, by, W, H); R(ctx, shade(red, 1.25), bx, by, W, 2); R(ctx, shade(red, 0.75), bx, by + H - 2, W, 2);
    ctx.save(); ctx.beginPath(); ctx.rect(bx, by, W, H); ctx.clip();
    strokeText(ctx, text, CX, CY, { h: 14, w: 7.5, gap: 2.6, lw: 1.6, color: '#fff4dc', serif: true, cap: 'butt' });
    ctx.restore();
    for (let i = 0; i < 5; i++) { const a = t * 2 + i * 1.3; diamond(ctx, CX + Math.cos(a) * (W / 2 + 30), CY - 22 + Math.sin(a * 1.7) * 8, 1.5 + (i % 2), '#ffe28a'); }
    if (x.sub) F.draw(ctx, x.sub, CX, by + H + 10, '#3a2a20', 1, 'center', '#fff4dc');
  };

  // Woodblock-print cartouche: tall paper label with stacked letters and a seal.
  P.cartouche = (ctx, t, text, o, x = {}) => {
    const letters = [...text.replace(/ /g, '')], W = 30, H = letters.length * 15 + 16, bx = CX - W / 2, by = CY - H / 2;
    const k = outCubic(t / 0.22);
    ctx.save(); ctx.beginPath(); ctx.rect(bx - 4, by - 4, W + 8, (H + 8) * k); ctx.clip();
    R(ctx, '#1c2a4a', bx - 2, by - 2, W + 4, H + 4); R(ctx, '#f2e6c8', bx, by, W, H);
    ctx.strokeStyle = '#1c2a4a'; ctx.lineWidth = 0.6; ctx.strokeRect(bx + 2.5, by + 2.5, W - 5, H - 5);
    letters.forEach((ch, i) => strokeText(ctx, ch, CX, by + 14 + i * 15, { h: 11, w: 8, lw: 2, color: '#1c2a4a', cap: 'butt' }));
    ctx.restore();
    if (t > 0.22) seal(ctx, CX + W / 2 + 14, by + H - 12, 9, x.seal || 'KF', t - 0.22);
  };

  // Dream: soft glowing letters floating, with twinkling stars.
  P.dream = (ctx, t, text, o, x = {}) => {
    const a = alphaIn(t, 0.3), bob = Math.sin(t * 3) * 2;
    ctx.save(); ctx.globalAlpha *= a;
    for (let i = 0; i < 10; i++) { const tw = 0.5 + 0.5 * Math.sin(t * 5 + i * 2); diamond(ctx, CX + (hash(i, 7) - 0.5) * 260, CY + (hash(7, i) - 0.5) * 80, 1 + tw * 1.5, '#fff8d0'); }
    strokeText(ctx, text, CX, CY + bob, { h: 22, w: 11, gap: 4, lw: 1.8, color: '#f6eaff', glow: [9, '#c8a0ff', 0.28] });
    if (x.sub) F.draw(ctx, x.sub, CX, CY + 22 + bob, '#e8d8ff', 1, 'center');
    ctx.restore();
  };

  // Hanging scroll unrolling, brush letters down it.
  P.scroll = (ctx, t, text, o, x = {}) => {
    const letters = [...text.replace(/ /g, '')], W = 40, H = letters.length * 18 + 20, bx = CX - W / 2, by = CY - H / 2;
    const k = outCubic(t / 0.3), hh = H * k;
    R(ctx, '#3a2414', bx - 6, by - 6, W + 12, 5); R(ctx, '#7a5a3a', bx - 8, by - 5, 3, 3); R(ctx, '#7a5a3a', bx + W + 5, by - 5, 3, 3);
    R(ctx, '#f6ecd6', bx, by, W, hh); R(ctx, '#c8b890', bx, by, 3, hh); R(ctx, '#c8b890', bx + W - 3, by, 3, hh);
    ctx.save(); ctx.beginPath(); ctx.rect(bx, by, W, hh); ctx.clip();
    letters.forEach((ch, i) => strokeText(ctx, ch, CX, by + 18 + i * 18, { h: 13, w: 9, lw: 3, color: '#1a1410', jitter: 0.5, seed: i + 2 }));
    ctx.restore();
    R(ctx, '#3a2414', bx - 6, by + hh, W + 12, 5);
  };

  // A Polaroid sliding up, photo developing from black, handwritten caption. Camera flash first.
  P.polaroid = (ctx, t, text, o, x = {}) => {
    if (t < 0.1) { ctx.save(); ctx.globalAlpha *= 1 - t / 0.1; R(ctx, '#fff', 0, 0, VW, VH); ctx.restore(); }
    const k = outCubic((t - 0.05) / 0.3), W = 100, H = 116, bx = CX - W / 2, by = CY - H / 2 + (1 - k) * 140;
    scaled(ctx, CX, by + H / 2, 1, () => {
      R(ctx, 'rgba(0,0,0,0.3)', bx + 3, by + 3, W, H); R(ctx, '#fbfaf4', bx, by, W, H);
      const dev = clamp01((t - 0.2) / 0.6);
      R(ctx, '#0c0a0a', bx + 7, by + 7, W - 14, 80);
      ctx.save(); ctx.globalAlpha *= dev;
      const g = ctx.createLinearGradient(0, by + 7, 0, by + 87); g.addColorStop(0, '#f4b8c8'); g.addColorStop(1, '#7a9a5a'); ctx.fillStyle = g; ctx.fillRect(bx + 7, by + 7, W - 14, 80);
      ctx.globalAlpha *= 0.55; ctx.fillStyle = '#2a2a3a'; // a blurry, motion-smeared hero
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(CX - 10 + i * 5, by + 48, 7, 18, 0.3, 0, 7); ctx.fill(); }
      ctx.restore();
      strokeText(ctx, text, CX, by + 100, { h: 9, w: 5, gap: 2, lw: 1.2, color: '#1a3aa0', jitter: 0.5, seed: 5 });
    }, -0.08);
  };

  // Runestone: arched grey slab, letters chiselled in (dark groove + light lip), rune border.
  P.carved = (ctx, t, text, o, x = {}) => {
    const W = 176, H = 90, bx = CX - W / 2, by = CY - H / 2;
    ctx.fillStyle = '#6a6a6e'; ctx.beginPath(); ctx.moveTo(bx, by + H); ctx.lineTo(bx, by + 22); ctx.quadraticCurveTo(bx, by, bx + 22, by); ctx.lineTo(bx + W - 22, by); ctx.quadraticCurveTo(bx + W, by, bx + W, by + 22); ctx.lineTo(bx + W, by + H); ctx.fill();
    ctx.strokeStyle = '#9a9aa0'; ctx.lineWidth = 1; ctx.stroke();
    grunge(ctx, bx, by, W, H, 13, '#2a2a2e', 90, 0.3);
    ctx.strokeStyle = '#3a3a3e'; ctx.lineWidth = 0.8; ctx.beginPath(); // rune band
    for (let i = 0; i < 30; i++) { const rx = bx + 10 + i * 5.3; ctx.moveTo(rx, by + H - 12); ctx.lineTo(rx + (i % 3 - 1) * 2, by + H - 6); if (i % 2) { ctx.moveTo(rx - 1, by + H - 10); ctx.lineTo(rx + 2, by + H - 8); } }
    ctx.stroke();
    const k = clamp01(t / 0.35), lines = text.split('|');
    lines.forEach((l, i) => {
      const yy = by + 30 + i * 24 - (lines.length === 1 ? -10 : 0);
      strokeText(ctx, l, CX + 0.8, yy + 0.8, { h: 16, w: 9, gap: 3, lw: 2.4, color: '#b8b8be', progress: k, cap: 'butt' });
      strokeText(ctx, l, CX, yy, { h: 16, w: 9, gap: 3, lw: 2.4, color: '#1c1c20', progress: k, cap: 'butt' });
    });
  };

  // Tapestry caption: linen band, stitched border, embroidered thread letters.
  P.stitch = (ctx, t, text, o, x = {}) => {
    const W = 250, H = 56, bx = CX - W / 2, by = CY - H / 2;
    R(ctx, '#e8dcbc', bx, by, W, H);
    ctx.save(); ctx.setLineDash([2, 1.5]); ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#3a4a8a'; ctx.strokeRect(bx + 3.5, by + 3.5, W - 7, H - 7);
    ctx.strokeStyle = '#b8402a'; ctx.strokeRect(bx + 6.5, by + 6.5, W - 13, H - 13);
    ctx.restore();
    const k = clamp01(t / 0.4);
    strokeText(ctx, text, CX + 0.8, CY - 4 + 0.8, { h: 18, w: 9, gap: 3, lw: 2, color: '#b8402a', dash: [1.6, 0.8], progress: k, cap: 'butt' });
    strokeText(ctx, text, CX, CY - 4, { h: 18, w: 9, gap: 3, lw: 2, color: '#2a3a7a', dash: [1.6, 0.8], progress: k, cap: 'butt' });
    if (x.sub) F.draw(ctx, x.sub, CX, by + H - 15, '#5a4a2a', 1, 'center');
  };

  // Candle snuffed out: flame shrinking, smoke curling up, warm lettering.
  P.candle = (ctx, t, text, o, x = {}) => {
    const lit = x.lit, cx = CX, cy = CY + 6;
    const glow = ctx.createRadialGradient(cx, cy - 10, 4, cx, cy - 10, 110);
    glow.addColorStop(0, 'rgba(255,190,110,0.35)'); glow.addColorStop(1, 'rgba(255,190,110,0)');
    if (lit || t < 0.25) { ctx.fillStyle = glow; ctx.fillRect(cx - 120, cy - 120, 240, 240); }
    strokeText(ctx, text, cx, cy - 40, { h: 20, w: 10, gap: 3.4, lw: 2, color: '#ffe0a8', glow: [6, '#ff9a3a', 0.25], serif: true, cap: 'butt' });
    R(ctx, '#f2e4c4', cx - 6, cy, 12, 26); R(ctx, '#c8b48a', cx + 3, cy, 3, 26); R(ctx, '#2a1a10', cx - 0.5, cy - 4, 1, 4);
    const fl = lit ? 1 : clamp01(1 - t / 0.25);
    if (fl > 0) { ctx.fillStyle = '#ffb030'; ctx.beginPath(); ctx.ellipse(cx, cy - 8, 3 * fl, 6 * fl, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#fff2c0'; ctx.beginPath(); ctx.ellipse(cx, cy - 7, 1.4 * fl, 3 * fl, 0, 0, 7); ctx.fill(); }
    if (!lit && t > 0.2) {
      ctx.save(); ctx.strokeStyle = 'rgba(200,200,210,0.6)'; ctx.lineWidth = 1.4;
      for (let s = 0; s < 2; s++) { ctx.beginPath(); for (let i = 0; i < 20; i++) { const yy = cy - 6 - i * 3 * clamp01((t - 0.2) / 0.5), xx = cx + Math.sin(i * 0.5 + t * 4 + s * 2) * (i * 0.5); i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); }
      ctx.restore();
    }
  };

  // Ice lettering with icicles and a crack.
  P.ice = (ctx, t, text, o, x = {}) => {
    const flash = clamp01(1 - t / 0.2), opt = { h: 24, w: 12, gap: 4, lw: 5, cap: 'butt', join: 'miter' };
    const tw = measure(text, opt);
    strokeText(ctx, text, CX, CY, { ...opt, color: '#1a4a8a', lw: 7.5 });
    strokeText(ctx, text, CX, CY, { ...opt, color: flash > 0 ? '#ffffff' : '#bfe8ff' });
    strokeText(ctx, text, CX - 0.8, CY - 0.8, { ...opt, lw: 1.2, color: '#ffffff' });
    for (let i = 0; i < 9; i++) { const ix = CX - tw / 2 + hash(i, 4) * tw, len = 4 + hash(4, i) * 9 * clamp01(t / 0.4); ctx.fillStyle = '#dff4ff'; ctx.beginPath(); ctx.moveTo(ix - 1.6, CY + 13); ctx.lineTo(ix + 1.6, CY + 13); ctx.lineTo(ix, CY + 13 + len); ctx.fill(); }
    if (x.crack !== false && t > 0.15) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(CX - tw / 2 - 6, CY - 4); for (let i = 1; i <= 8; i++) ctx.lineTo(CX - tw / 2 - 6 + (tw + 12) * (i / 8), CY - 4 + (hash(i, 9) - 0.5) * 10); ctx.stroke(); }
    if (x.sub) F.draw(ctx, x.sub, CX, CY + 30, '#e8f6ff', 1, 'center', '#1a4a8a');
  };

  // Valhalla: a round gold-rimmed shield with a banner across it.
  P.shield = (ctx, t, text, o, x = {}) => {
    const s = outBack(t / 0.22), cy = CY - 6;
    scaled(ctx, CX, cy, s, () => {
      ctx.fillStyle = '#5a1a10'; ctx.beginPath(); ctx.arc(CX, cy, 34, 0, 7); ctx.fill();
      ctx.strokeStyle = '#ffd860'; ctx.lineWidth = 4; ctx.stroke();
      ctx.strokeStyle = '#a87a20'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(CX, cy, 30, 0, 7); ctx.stroke();
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(CX + Math.cos(a) * 8, cy + Math.sin(a) * 8); ctx.lineTo(CX + Math.cos(a) * 30, cy + Math.sin(a) * 30); ctx.stroke(); }
      ctx.fillStyle = '#ffd860'; ctx.beginPath(); ctx.arc(CX, cy, 7, 0, 7); ctx.fill(); ctx.fillStyle = '#fff4b0'; ctx.beginPath(); ctx.arc(CX - 2, cy - 2, 2.5, 0, 7); ctx.fill();
      const tw = measure(text, { h: 12, w: 6.6, gap: 2.4 }) + 28, by = cy + 14;
      ctx.fillStyle = '#7a1414'; for (const sd of [-1, 1]) { const ex = CX + sd * tw / 2; ctx.beginPath(); ctx.moveTo(ex, by); ctx.lineTo(ex + sd * 16, by); ctx.lineTo(ex + sd * 10, by + 9); ctx.lineTo(ex + sd * 16, by + 18); ctx.lineTo(ex, by + 18); ctx.fill(); }
      R(ctx, '#b02018', CX - tw / 2, by - 2, tw, 22); R(ctx, '#ffd860', CX - tw / 2, by - 2, tw, 1.5); R(ctx, '#ffd860', CX - tw / 2, by + 18.5, tw, 1.5);
      strokeText(ctx, text, CX, by + 9, { h: 12, w: 6.6, gap: 2.4, lw: 1.8, color: '#ffe89a', serif: true, cap: 'butt' });
    });
  };

  // SUPERHOT-style: red lettering that splits into shards.
  P.shatter = (ctx, t, text, o, x = {}) => {
    const opt = { h: 26, w: 13, gap: 4, lw: 4.5, color: x.color || '#ff2a1a', cap: 'butt', join: 'miter' };
    const k = clamp01((t - 0.15) / 0.5);
    for (let b = 0; b < 4; b++) {
      ctx.save(); ctx.beginPath(); ctx.rect(0, CY - 14 + b * 7, VW, 7); ctx.clip();
      strokeText(ctx, text, CX + (b - 1.5) * 6 * k, CY + (b - 1.5) * 3 * k, opt);
      ctx.restore();
    }
    ctx.fillStyle = x.color || '#ff2a1a';
    for (let i = 0; i < 18; i++) {
      const a = hash(i, 3) * Math.PI * 2, d = 20 + k * 90 * hash(3, i), px = CX + Math.cos(a) * d, py = CY + Math.sin(a) * d * 0.6, s = 2 + hash(i, 8) * 4;
      ctx.beginPath(); ctx.moveTo(px, py - s); ctx.lineTo(px + s * 0.8, py + s * 0.6); ctx.lineTo(px - s * 0.7, py + s * 0.4); ctx.fill();
    }
    if (x.sub) F.draw(ctx, x.sub, CX, CY + 26, '#ffffff', 1, 'center', '#000');
  };

  // ---------- the worlds ----------
  // [painter, text, extras]. ko/go/win/lose; snd names are KF.Audio.fx sounds.
  const W = {};
  const film = { jump: 'jumpSoft', land: 'landWood' };
  W.hd = { ko: ['arcade', 'K.O.'], go: ['arcade', 'GO!', { style: 'fire', fade: true }], win: ['arcade', 'YOU WIN', { style: 'fire', scale: 5 }], snd: {} };
  W.oldtv = { ko: ['deco', 'APPLAUSE'], go: ['deco', 'ON AIR'], win: ['deco', 'CURTAIN CALL'], lose: ['deco', 'BOO!'], snd: { death: 'deathSitcom', go: 'goBell', win: 'winSitcom', ...film } };
  W.comic = { ko: ['pow', ['POW!', 'KAPOW!', 'SPLAT!', 'BONK!']], go: ['balloon', "LET'S GO!"], win: ['pow', 'HOORAY!', { outer: '#2a6ad8', inner: '#7ad8ff', shadow: '#1a3a8a' }], snd: { death: 'deathCartoon', go: 'goWhistle', win: 'winBrass', jump: 'jumpCartoon' } };
  W.gameboy = { ko: ['gbBox', 'GAME OVER', { sub: 'CONTINUE?  YES' }], go: ['gbBox', 'START!'], win: ['gbBox', 'STAGE CLEAR!', { sub: 'SAVING...' }], snd: { death: 'deathGB', go: 'goChip', win: 'winChip', jump: 'jumpPulse' } };
  W.vhs = { ko: ['osd', 'STOP', { icon: 'stop', big: true }], go: ['osd', 'PLAY', { icon: 'play', big: true }], win: ['osd', 'STOP', { icon: 'stop', sub: 'END OF TAPE' }], rewind: ['osd', 'REW', { icon: 'rew', big: true, sub: 'REWINDING...' }], snd: { death: 'deathVHS', go: 'goVHS', win: 'winSitcom' } };
  W.silent = { ko: ['intertitle', 'ALAS!', { sub: 'OUR HERO HAS PERISHED.' }], go: ['intertitle', 'ACT ONE', { sub: 'IN WHICH OUR HERO SETS OUT' }], win: ['intertitle', 'THE END', { sub: 'OR IS IT? ON TO THE NEXT REEL!' }], lose: ['intertitle', 'DEFEAT!', { sub: 'OUR HERO IS BESTED.' }], snd: { death: 'deathSilent', go: 'goClapper', win: 'winPiano', ...film } };
  W.blueprint = { ko: ['stamp', 'REJECTED', { sub: 'SEE NOTE 4: DO NOT DIE' }], go: ['stamp', 'APPROVED', { color: '#2a8a3a' }], win: ['stamp', 'BUILT!', { color: '#2a8a3a', sub: 'SIGNED OFF' }], snd: { death: 'deathStamp', go: 'goWood', win: 'winBrass', jump: 'jumpSoft' } };
  W.pocket = { ko: ['popup', 'IT FLED!', { sub: 'TRY AGAIN' }], go: ['popup', 'AR READY', { sub: 'TAP TO START', band: '#2a9aff', icon: '>' }], win: ['popup', 'CAUGHT!', { sub: '+500 XP', band: '#3ac85a', icon: '*' }], snd: { death: 'deathPhone', go: 'goPhone', win: 'winBrass' } };
  W.noir = { ko: ['script', 'THE END', { sub: 'A KUNG FOOLED PICTURE' }], go: ['script', 'NIGHT FALLS', { sub: 'IT WAS RAINING. IT ALWAYS IS.' }], win: ['script', 'CASE CLOSED', { sub: 'FOR NOW.' }], snd: { death: 'deathSax', go: 'goSax', win: 'winSax', jump: 'jumpSoft', land: 'landSoft' } };
  W.cga = { ko: ['dosBox', 'YOU HAVE DIED.', { opts: ['RESTORE', 'RESTART', 'QUIT'] }], go: ['dosBox', '> START GAME', { title: 'PIRATE DISK' }], win: ['dosBox', 'WELL DONE!', { sub: 'YOUR SCORE GOES UP.', title: 'VICTORY' }], snd: { death: 'deathPC', go: 'goPC', win: 'winPC', jump: 'jumpPC', land: 'landPC' } };
  W.glitch = { ko: ['glitch', 'FATAL_DEATH'], go: ['glitch', 'BOOT OK'], win: ['glitch', 'YOU WIN?', { sub: 'SAVE FILE INTACT. PROBABLY.' }], snd: { death: 'deathGlitch', go: 'goGlitch', win: 'winGlitch' } };
  W.vaporwave = { ko: ['vapor', 'YOU DIED', { title: 'DEATH.EXE' }], go: ['vapor', 'WELCOME', { title: 'PLAZA.EXE', button: 'ENTER' }], win: ['vapor', 'AESTHETIC', { title: 'WIN.EXE', button: 'NICE' }], snd: { death: 'deathVapor', go: 'goVapor', win: 'winVapor' } };
  W.mirror = { ko: ['marquee', 'OOPS!', { sub: 'NIAGA YRT' }], go: ['marquee', 'STEP RIGHT UP!'], win: ['marquee', 'WINNER!', { sub: 'EVERYONE WINS A PRIZE' }], snd: { death: 'deathCarnival', go: 'goWhistle', win: 'winBrass', jump: 'jumpCartoon' } };
  W.thermal = { ko: ['hud', 'SIGNAL LOST', { sub: 'TARGET: COLD' }], go: ['hud', 'TRACKING', { sub: 'TARGET ACQUIRED' }], win: ['hud', 'EXTRACTED', { sub: 'GOOD WORK, AGENT' }], snd: { death: 'deathMonitor', go: 'goPC', win: 'winPC' } };
  W.bsod = { ko: ['dialog', 'THIS FIGHTER HAS PERFORMED AN|ILLEGAL OPERATION AND WILL|BE SHUT DOWN.'], go: ['dialog', 'SYSTEM RESTORE COMPLETE.|NOTHING WAS RESTORED.|GOOD LUCK.', { title: 'SYSTEM RESTORE', ok: true, buttons: ['OK'] }], win: ['dialog', 'TASK COMPLETED|SUCCESSFULLY. SOMEHOW.', { title: 'KUNGFOOLED.EXE', ok: true, buttons: ['YAY'] }], snd: { death: 'deathError', go: 'goChime', win: 'goChime', jump: 'jumpPC' } };
  W.sketch = { ko: ['pencil', 'OOPS!', { sub: 'ERASE AND TRY AGAIN' }], go: ['pencil', 'READY?'], win: ['pencil', 'A+', { color: '#c8282a', ring: '#c8282a', sub: 'GOLD STAR' }], snd: { death: 'deathPencil', go: 'goWood', win: 'winMusicBox', jump: 'jumpSoft' } };
  W.ink = { ko: ['brush', 'DEFEAT', { seal: 'KO' }], go: ['brush', 'BEGIN', { seal: 'GO' }], win: ['brush', 'VICTORY', { seal: 'OK' }], snd: { death: 'deathGong', go: 'goWood', win: 'winKoto', ...film } };
  W.nightvision = { ko: ['hud', 'K.I.A.', { color: '#9aff7a', sub: 'MISSION FAILED' }], go: ['hud', 'OBJECTIVE', { color: '#9aff7a', sub: 'REACH THE EXIT' }], win: ['hud', 'EXTRACTED', { color: '#9aff7a', sub: 'MISSION COMPLETE' }], snd: { death: 'deathRadio', go: 'goPC', win: 'winPC' } };
  W.ascii = { ko: ['ascii', 'YOU DIED', { sub: 'PRESS ANY KEY' }], go: ['ascii', 'RUN KUNGFOOL.EXE'], win: ['ascii', 'LEVEL COMPLETE', { sub: 'CREDITS: 1' }], snd: { death: 'deathPC', go: 'goPC', win: 'winPC', jump: 'jumpPC', land: 'landPC' } };
  W.cube3d = { ko: ['blocks', 'OOPS'], go: ['blocks', 'GO!'], win: ['blocks', 'YAY!', { shift: 2 }], lose: ['blocks', 'LOSE'], snd: { death: 'deathBlocks', go: 'goWood', win: 'winBlocks', land: 'landWood' } };
  W.nes8bit = { ko: ['nes', 'MISS!', { sub: 'PLAYER 1' }], go: ['nes', 'WORLD 5-1', { sub: 'PLAYER 1  READY' }], win: ['nes', 'COURSE CLEAR!'], snd: { death: 'deathNES', go: 'goChip', win: 'winChip', jump: 'jumpPulse' } };
  W.negative = { ko: ['film', 'OVEREXPOSED'], go: ['film', 'DEVELOPING'], win: ['film', 'PRINT IT!'], snd: { death: 'deathShutter', go: 'goShutter', win: 'winBrass', ...film } };
  W.cinema = { ko: ['clapper', 'CUT!'], go: ['clapper', 'ACTION!'], win: ['clapper', "IT'S A WRAP!"], snd: { death: 'deathClapper', go: 'goClapper', win: 'winBrass', ...film } };
  W.popart = { ko: ['whaam', 'WHAAM!'], go: ['balloon', 'OKAY, HOT-SHOT!', { dots: true }], win: ['whaam', 'BRAVO!', { ink: '#ffffff' }], snd: { death: 'deathBoom', go: 'goWhistle', win: 'winBrass', jump: 'jumpCartoon' } };
  W.vector = { ko: ['vector', 'GAME OVER', { sub: 'INSERT COIN' }], go: ['vector', 'PLAYER 1'], win: ['vector', 'HIGH SCORE!', { color: '#6ad8ff' }], snd: { death: 'deathVector', go: 'goChip', win: 'winChip' } };
  W.storybook = { ko: ['ribbon', 'THE END?', { sub: '...TURN THE PAGE AND TRY AGAIN' }], go: ['ribbon', 'ONCE UPON A TIME', { color: '#3a7ac8' }], win: ['ribbon', 'HAPPILY EVER AFTER', { color: '#3a9a5a' }], snd: { death: 'deathMusicBox', go: 'goChime', win: 'winMusicBox', jump: 'jumpSoft' } };
  W.ukiyo = { ko: ['cartouche', 'FALLEN'], go: ['cartouche', 'RISE'], win: ['cartouche', 'SERENE'], snd: { death: 'deathShamisen', go: 'goWood', win: 'winKoto', ...film } };
  W.dream = { ko: ['dream', 'WAKE UP', { sub: 'IT WAS ONLY A DREAM' }], go: ['dream', 'FALL ASLEEP...'], win: ['dream', 'SWEET DREAMS'], snd: { death: 'deathDream', go: 'goVapor', win: 'winVapor', jump: 'jumpSoft' } };
  W.duotone = { ko: ['scroll', 'SPILT'], go: ['scroll', 'BOW'], win: ['scroll', 'BREWED'], snd: { death: 'deathTea', go: 'goWood', win: 'winKoto', ...film } };
  W.polaroid = { ko: ['polaroid', 'BLURRY :('], go: ['polaroid', 'SAY CHEESE!'], win: ['polaroid', 'PERFECT SHOT'], snd: { death: 'deathFlash', go: 'goShutter', win: 'winMusicBox', jump: 'jumpSoft' } };
  W.emboss = { ko: ['carved', 'HERE FELL|BAO'], go: ['carved', 'THE SAGA|BEGINS'], win: ['carved', 'THE SAGA|GOES ON'], lose: ['carved', 'HERE FELL|BAO'], snd: { death: 'deathStone', go: 'goHorn', win: 'winHorn', ...film } };
  W.stitch = { ko: ['stitch', 'HIC CADIT', { sub: 'HERE HE FALLS' }], go: ['stitch', 'HIC INCIPIT', { sub: 'HERE IT BEGINS' }], win: ['stitch', 'HIC VINCIT', { sub: 'HERE HE WINS' }], snd: { death: 'deathCloth', go: 'goHorn', win: 'winHorn', ...film } };
  W.candle = { ko: ['candle', 'SNUFFED'], go: ['candle', 'LIGHT THE WAY', { lit: true }], win: ['candle', 'MEAD FOR ALL!', { lit: true }], top: true, snd: { death: 'deathCandle', go: 'goHorn', win: 'winHorn', ...film } };
  W.frost = { ko: ['ice', 'FROZEN'], go: ['ice', 'BRRR!', { crack: false }], win: ['ice', 'THAWED!', { crack: false }], snd: { death: 'deathIce', go: 'goChime', win: 'winHorn', jump: 'jumpSoft', land: 'landSoft' } };
  W.golden = { ko: ['shield', 'FALLEN IN GLORY'], go: ['shield', 'FOR ODIN!'], win: ['shield', 'VALHALLA!'], snd: { death: 'deathHorn', go: 'goHorn', win: 'winHorn', ...film } };
  W.superhot = { ko: ['shatter', 'SHATTERED'], go: ['shatter', 'MOVE.', { color: '#ff2a1a' }], win: ['shatter', 'MORE.'], snd: { death: 'deathShatter', go: 'goGlitch', win: 'winShatter', jump: 'jumpGlass' } };
  // The cyber realm.
  W.cyberpunk = { ko: ['glitch', 'FLATLINED', { sub: 'NEURAL LINK SEVERED' }], go: ['glitch', 'JACK IN'], win: ['glitch', 'UPLOADED', { sub: 'TRANSFER COMPLETE' }], snd: { death: 'deathMonitor', go: 'goGlitch', win: 'winGlitch' } };
  W.hologram = { ko: ['vector', 'SIGNAL DROPPED', { color: '#6ae8ff', sub: 'RE-PROJECTING...' }], go: ['vector', 'PROJECTING', { color: '#6ae8ff' }], win: ['vector', 'TRANSMITTED', { color: '#6ae8ff' }], snd: { death: 'deathVector', go: 'goChime', win: 'winChip' } };
  W.ps1 = { ko: ['dialog', 'YOU DIED.|SAVE ANYWAY?', { title: 'MEMORY CARD SLOT 1', buttons: ['YES', 'NO'] }], go: ['dialog', 'LOADING... PLEASE DO NOT|REMOVE THE MEMORY CARD.', { title: 'MEMORY CARD SLOT 1', ok: true, buttons: ['OK'] }], win: ['dialog', 'STAGE CLEAR!|SAVING... DONE.', { title: 'MEMORY CARD SLOT 1', ok: true, buttons: ['CONTINUE'] }], snd: { death: 'deathError', go: 'goChime', win: 'winVapor' } };
  W.chrome = { ko: ['vapor', 'GAME OVER', { title: 'CHROME.EXE' }], go: ['vapor', 'LOG ON', { title: 'CHROME.EXE', button: 'GO' }], win: ['vapor', 'CONGRATS!!', { title: 'CHROME.EXE', button: 'YAY' }], snd: { death: 'deathVapor', go: 'goVapor', win: 'winVapor' } };
  // Unknown worlds borrow a close relative's presentation.
  const ALIAS = { neon: 'glitch' };

  function spec(id) { return W[id] || W[ALIAS[id]] || W.hd; }
  function pick(entry, o) {
    let [painter, text, extra] = entry;
    if (Array.isArray(text)) text = text[(o.deaths || 0) % text.length];
    if (o.text) text = o.text;
    return [P[painter] || P.arcade, text, extra || {}];
  }
  function draw(entry, ctx, t, o) { const [fn, text, x] = pick(entry, o); ctx.save(); fn(ctx, t, text, o, x); ctx.restore(); }

  KF.Present = {
    worlds: W, painters: P, strokeText, measure,
    add(id, s) { W[id] = s; },
    onTop(id) { return !!spec(id).top; },
    has(id, event) { return !!(spec(id).snd || {})[event]; },
    ko(ctx, id, t, o = {}) { const s = spec(id); draw((o.rewind && s.rewind) || s.ko, ctx, t, o); },
    intro(ctx, id, t, o = {}) { draw(spec(id).go, ctx, t, o); },
    win(ctx, id, t, o = {}) {
      const s = spec(id);
      if (o.lose) draw(s.lose || [s.ko[0], o.text || 'YOU LOSE', s.ko[2]], ctx, t, { ...o, text: o.text || (s.lose ? null : 'YOU LOSE') });
      else draw(s.win, ctx, t, o.perfect && s.win[0] === 'arcade' ? { ...o, text: 'PERFECT' } : o);
    },
    // Play the world's sound for an event; falls back to the classic arcade sounds.
    sfx(id, event, opt = {}) {
      const A = KF.Audio, name = (spec(id).snd || {})[event];
      if (name) return A.fx(name, opt);
      const classic = { death: 'hit', go: 'go', win: 'confirm', lose: 'lose', jump: 'jump', land: 'land' }[event];
      if (event === 'death') { A.sfx('hit'); A.sfx('ko'); return; }
      if (event === 'win' && opt.perfect) return A.sfx('perfect');
      if (classic) A.sfx(classic, opt);
    },
  };
})(window.KF);
