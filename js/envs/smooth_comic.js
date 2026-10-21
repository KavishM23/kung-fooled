'use strict';
// Smooth (non-pixel) places for the COMIC realm: a modern inked superhero comic. Confident
// variable-width black ink, flat bold colour with hard cel shadows, Ben-Day halftone in skies and
// shadow sides, panel gutters, painted sound effects, speed lines. Everything is drawn with paths
// at the screen's resolution; seen side-on with depth layers (sky, far skyline, mid buildings).
(function (KF) {
  const U = KF.util, VW = KF.VIEW_W, VH = KF.VIEW_H;
  const INK = '#15101c', PAPER = '#fbf4e2';
  const HI = () => KF.HI_MAX;
  const FONT = '"Arial Black", Impact, "Helvetica Neue", Arial, sans-serif';

  // ---------- drawing helpers (logical units; the context is already scaled) ----------
  function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
  // Fill a path, then ink it: a heavy outer line and a thinner inner one reads as a brush stroke.
  function ink(c, fill, lw = 1.4) {
    if (fill) { c.fillStyle = fill; c.fill(); }
    c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = INK; c.lineWidth = lw; c.stroke();
  }
  function poly(c, pts) { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); }
  // Ben-Day dots over a rectangle: radius from f(x, y) in 0..1 (times the max radius).
  function dots(c, x0, y0, w, h, col, step, f, rmax = step * 0.42) {
    c.fillStyle = col;
    c.beginPath();
    for (let y = y0, row = 0; y < y0 + h; y += step * 0.866, row++) {
      for (let x = x0 + (row & 1) * step / 2; x < x0 + w; x += step) {
        const r = f(x, y) * rmax;
        if (r < 0.12) continue;
        c.moveTo(x + r, y); c.arc(x, y, r, 0, Math.PI * 2);
      }
    }
    c.fill();
  }
  // Diagonal hatching inside the current clip.
  function hatch(c, x, y, w, h, gap = 2.6, lw = 0.45, col = INK) {
    c.strokeStyle = col; c.lineWidth = lw; c.beginPath();
    for (let k = -h; k < w; k += gap) { c.moveTo(x + k, y + h); c.lineTo(x + k + h, y); }
    c.stroke();
  }
  function burst(c, cx, cy, r0, r1, n, fill, rot = 0, lw = 1.4) { // comic starburst
    c.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = rot + (i / (n * 2)) * Math.PI * 2, r = i % 2 ? r0 : r1 * (0.82 + 0.18 * Math.sin(i * 2.7 + rot));
      c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.78);
    }
    c.closePath(); ink(c, fill, lw);
  }
  // Big comic lettering: heavy ink outline, colour fill, a little offset shadow.
  function letters(c, text, x, y, size, fill, opts = {}) {
    c.save();
    c.translate(x, y); c.rotate(opts.rot || 0);
    c.font = `${opts.italic === false ? '' : 'italic '}900 ${size}px ${FONT}`;
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    if (opts.shadow) { c.fillStyle = opts.shadow; c.fillText(text, size * 0.08, size * 0.1); }
    c.strokeStyle = INK; c.lineWidth = size * 0.22; c.strokeText(text, 0, 0);
    c.fillStyle = fill; c.fillText(text, 0, 0);
    c.restore();
  }
  function layer(w, h = VH) { const c = KF.makeHi(w, h, HI()), x = c.getContext('2d'); x.imageSmoothingEnabled = true; return [c, x]; }
  // Repeat a baked layer horizontally with parallax (sub-pixel smooth at any resolution).
  function tiled(ctx, img, camX, par, y = 0) {
    const w = img.lw;
    let ox = -((camX * par) % w);
    if (ox > 0) ox -= w;
    ox = Math.round(ox * 6) / 6;
    for (let x = ox; x < VW; x += w) KF.blit(ctx, img, x, y);
  }
  function at(lx, camX, par, span, w = 40) { // screen x of a feature on a repeating layer, or null
    let s = (((lx - camX * par) % span) + span) % span;
    if (s > VW + w) s -= span;
    return s < -w || s > VW + w ? null : s;
  }
  const shade = (hex, f) => {
    const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
    return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
  };

  // A building, side-on: flat wall, cel-shadow side with halftone, ink windows, roof ledge.
  function building(c, x, top, w, base, col, rnd, opts = {}) {
    const h = base - top, dark = shade(col, 0.68);
    rr(c, x, top, w, h + 4, 0.8); ink(c, col, 1.3);
    // cel shadow down the right third, Ben-Day dots in it
    c.save(); rr(c, x, top, w, h + 4, 0.8); c.clip();
    c.fillStyle = dark; c.fillRect(x + w * 0.7, top, w * 0.3 + 1, h + 4);
    dots(c, x + w * 0.7, top, w * 0.3 + 1, h + 4, shade(col, 0.5), 2.6, () => 0.55);
    c.restore();
    c.strokeStyle = INK; c.lineWidth = 0.9; c.beginPath(); c.moveTo(x + w * 0.7, top + 1); c.lineTo(x + w * 0.7, base + 3); c.stroke();
    // roof ledge
    rr(c, x - 1.5, top - 3, w + 3, 4, 0.8); ink(c, opts.ledge || PAPER, 1.1);
    // windows: lit ones get a glint stroke
    const wc = opts.win || '#3a3a8a', lit = opts.lit || '#fff2a8';
    for (let wy = top + 8; wy < base - 8; wy += 11) for (let wx = x + 4; wx < x + w - 7; wx += 9) {
      const on = rnd() < (opts.litChance ?? 0.35);
      rr(c, wx, wy, 5, 6.5, 0.6); ink(c, on ? lit : wc, 0.8);
      if (on) { c.strokeStyle = '#ffffff'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(wx + 1.2, wy + 5); c.lineTo(wx + 3.6, wy + 1.4); c.stroke(); }
    }
  }
  function waterTower(c, x, base, col = '#c87a3a') {
    for (const lx of [x + 2, x + 13]) { c.beginPath(); c.moveTo(lx, base); c.lineTo(lx + (lx > x + 8 ? -1 : 1), base - 9); ink(c, null, 1.3); }
    rr(c, x, base - 23, 16, 14, 1.5); ink(c, col, 1.3);
    c.save(); rr(c, x, base - 23, 16, 14, 1.5); c.clip(); c.fillStyle = shade(col, 0.7); c.fillRect(x + 11, base - 23, 6, 14); c.restore();
    c.strokeStyle = INK; c.lineWidth = 0.6; c.beginPath(); for (let k = 1; k < 3; k++) { c.moveTo(x, base - 23 + k * 4.6); c.lineTo(x + 16, base - 23 + k * 4.6); } c.stroke();
    poly(c, [x - 2, base - 23, x + 8, base - 31, x + 18, base - 23]); ink(c, shade(col, 0.6), 1.3);
  }

  // ---------- shared platform pieces in the comic look ----------
  // Every place supplies its palette; the shapes (ink outline, cel shadow, highlight lip) are shared.
  function slab(ctx, x, y, e, seed, p) {
    const top = e.t ? 0 : -0.6;
    ctx.fillStyle = p.body; ctx.fillRect(x - 0.05, y + top, 16.1, 16 - top + 0.05);
    // cel shadow band low on the block and halftone fading up into it
    ctx.fillStyle = p.shadow; ctx.fillRect(x - 0.05, y + 10, 16.1, 6.05);
    dots(ctx, x + 1, y + 6.5, 15, 4, p.shadow, 2.4, (px, py) => (py - (y + 6)) / 5);
    if (p.pattern) p.pattern(ctx, x, y, seed, e);
    if (e.t) { // the lip you stand on: bright, inked hard underneath
      ctx.fillStyle = p.lip; ctx.fillRect(x - 0.05, y, 16.1, 3.6);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 1.5 + seed * 6, y + 0.8, 4, 0.9);
      ctx.fillStyle = INK; ctx.fillRect(x - 0.05, y + 3.4, 16.1, 1.1); ctx.fillRect(x - 0.05, y - 0.4, 16.1, 0.9);
    }
    ctx.fillStyle = INK;
    if (e.l) ctx.fillRect(x - 0.4, y, 1.4, 16);
    if (e.r) ctx.fillRect(x + 15, y, 1.4, 16);
    if (e.b) ctx.fillRect(x, y + 15, 16, 1.4);
  }
  function crate(ctx, x, y, p) {
    rr(ctx, x + 0.6, y + 0.6, 14.8, 14.8, 1.2); ink(ctx, p.crate, 1.3);
    ctx.save(); rr(ctx, x + 0.6, y + 0.6, 14.8, 14.8, 1.2); ctx.clip();
    ctx.fillStyle = shade(p.crate, 0.7); ctx.fillRect(x + 11, y, 6, 16); ctx.fillRect(x, y + 12, 16, 4);
    ctx.restore();
    ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 2.5, y + 2.5); ctx.lineTo(x + 13.5, y + 13.5); ctx.moveTo(x + 13.5, y + 2.5); ctx.lineTo(x + 2.5, y + 13.5); ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(x + 2.6, y + 2); ctx.lineTo(x + 7, y + 2); ctx.stroke();
  }
  function iceBlock(ctx, x, y, e) {
    rr(ctx, x + 0.3, y + 0.3, 15.4, 15.4, 1.5); ink(ctx, '#cff4ff', 1.1);
    ctx.save(); rr(ctx, x + 0.3, y + 0.3, 15.4, 15.4, 1.5); ctx.clip();
    ctx.fillStyle = '#7fd0f0'; ctx.fillRect(x, y + 10, 16, 6);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x + 3, y + 8); ctx.lineTo(x + 7, y + 3); ctx.moveTo(x + 8, y + 10); ctx.lineTo(x + 11, y + 6); ctx.stroke();
    ctx.restore();
    if (e.t) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 1, y + 0.4, 14, 1.4); }
  }
  function plank(ctx, x, y, p) { // one-way platform: a beam with ink
    rr(ctx, x - 0.3, y, 16.6, 4.4, 1); ink(ctx, p.plank, 1.1);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 1, y + 0.8, 14, 0.8);
    ctx.fillStyle = shade(p.plank, 0.65); ctx.fillRect(x + 0.5, y + 2.8, 15, 1);
    ctx.fillStyle = INK; ctx.fillRect(x + 7.2, y + 4.4, 1.6, 3.5);
  }
  // Spikes: tall inked red-and-white teeth, impossible to miss.
  function spike(ctx, x, y, dir) {
    ctx.save();
    ctx.translate(x + 8, y + 8);
    ctx.rotate({ up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 }[dir] || 0);
    for (const ox of [-4, 4]) {
      poly(ctx, [ox - 3.6, 6, ox, -3.2, ox + 3.6, 6]); ink(ctx, '#ffffff', 1.2);
      poly(ctx, [ox, -3.2, ox + 3.6, 6, ox + 0.6, 6]); ctx.fillStyle = '#c9cde0'; ctx.fill();
    }
    rr(ctx, -8, 5.2, 16, 2.8, 0.6); ink(ctx, '#e8242c', 1);
    ctx.restore();
  }
  function spring(ctx, x, y, squash) {
    const h = 6 - squash * 4, top = y + 16 - h - 3;
    ctx.strokeStyle = INK; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.beginPath();
    for (let i = 0; i <= 4; i++) ctx.lineTo(x + (i % 2 ? 12.5 : 3.5), y + 16 - (i / 4) * h);
    ctx.stroke();
    ctx.strokeStyle = '#c8d0e0'; ctx.lineWidth = 1.2; ctx.stroke();
    rr(ctx, x + 1.5, top, 13, 3, 1); ink(ctx, '#ffd23a', 1.1);
    rr(ctx, x + 0.5, y + 14.6, 15, 1.8, 0.6); ink(ctx, '#e8242c', 0.9);
  }
  // Signs are speech balloons on a post.
  function sign(ctx, x, y, text) {
    ctx.font = `900 7px ${FONT}`;
    const w = Math.max(24, ctx.measureText(text).width + 10), bx = x - w / 2, by = y - 2;
    ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, by + 12); ctx.lineTo(x, y + 18); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x, by + 6, w / 2, 7.5, 0, 0, Math.PI * 2); ctx.moveTo(x - 3, by + 12.5); ctx.lineTo(x + 1, by + 17); ctx.lineTo(x + 3, by + 12);
    ink(ctx, '#ffffff', 1.2);
    ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, by + 6.4);
  }
  // Exit door: an inked steel door with a glowing EXIT sign and a yellow light spilling out.
  function door(ctx, x, y, o = {}) {
    ctx.save();
    if (o.flipped) { ctx.translate(0, y * 2 + 32); ctx.scale(1, -1); }
    if (o.legs) {
      const k = Math.sin(o.legs * 18) * 2;
      ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath();
      ctx.moveTo(x + 5, y + 30); ctx.lineTo(x + 4 + k, y + 35); ctx.moveTo(x + 11, y + 30); ctx.lineTo(x + 12 - k, y + 35); ctx.stroke();
    }
    rr(ctx, x - 1.5, y + 1, 19, 31.5, 1.5); ink(ctx, '#2a2a5a', 1.4);
    const open = o.open || 0;
    if (open > 0) {
      ctx.fillStyle = '#ffe680'; ctx.fillRect(x + 1.5, y + 4, 13, 28);
      ctx.save(); ctx.globalAlpha = 0.5 * open; ctx.fillStyle = '#fff6c0';
      ctx.beginPath(); ctx.moveTo(x + 1.5, y + 32); ctx.lineTo(x - 14, y + 40); ctx.lineTo(x + 30, y + 40); ctx.lineTo(x + 14.5, y + 32); ctx.fill(); ctx.restore();
      rr(ctx, x + 1.5, y + 4, 13 * (1 - open) + 0.5, 28, 0.6); ink(ctx, '#e8242c', 1);
    } else {
      rr(ctx, x + 1.5, y + 4, 13, 28, 0.8); ink(ctx, '#e8242c', 1.1);
      ctx.fillStyle = '#a8141c'; ctx.fillRect(x + 10.5, y + 4.5, 3.5, 27);
      dots(ctx, x + 10.5, y + 5, 3.5, 26, '#7a0c12', 2, () => 0.5);
      ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.arc(x + 4.5, y + 19, 1.3, 0, 7); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 0.7; ctx.stroke();
      ctx.strokeStyle = '#ff8a8a'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x + 3, y + 6); ctx.lineTo(x + 3, y + 15); ctx.stroke();
    }
    if (o.lantern) { // glowing EXIT box
      const p = 0.7 + 0.3 * Math.sin((o.t || 0) * 5);
      ctx.save(); ctx.globalAlpha = 0.25 * p; ctx.fillStyle = '#7cff8a'; ctx.beginPath(); ctx.ellipse(x + 8, y - 4, 16, 8, 0, 0, 7); ctx.fill(); ctx.restore();
      rr(ctx, x - 1, y - 8, 18, 8, 1.2); ink(ctx, '#1e8a3a', 1.1);
      ctx.font = `900 5.5px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#dcffd8'; ctx.fillText('EXIT', x + 8, y - 3.8);
    }
    ctx.restore();
  }

  // Death and win splash: speed lines rushing to the centre, and a big painted sound effect.
  function splash(ctx, th, t, mood) {
    if (mood.cheer <= 0.12) return;
    const k = Math.min(1, mood.cheer), cx = VW / 2, cy = 104;
    ctx.save(); ctx.globalAlpha = 0.55 * k; ctx.strokeStyle = INK; ctx.lineCap = 'round';
    for (const s of th.speed) {
      const r = s.r - k * 30;
      ctx.lineWidth = s.w;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(s.a) * r, cy + Math.sin(s.a) * r * 0.62);
      ctx.lineTo(cx + Math.cos(s.a) * (r + s.l), cy + Math.sin(s.a) * (r + s.l) * 0.62); ctx.stroke();
    }
    ctx.restore();
    if (mood.cheer > 0.7) {
      const z = 1 + (1.6 - Math.min(1.6, mood.cheer)) * 0.3, word = th.sfx[Math.floor(t * 0.7) % th.sfx.length];
      ctx.save(); ctx.globalAlpha = Math.min(1, (mood.cheer - 0.7) * 3);
      burst(ctx, cx, 64, 18 * z, 34 * z, 13, '#ffd23a', t * 0.3, 1.6);
      letters(ctx, word, cx, 63, 15 * z, '#e8242c', { rot: -0.12, shadow: '#7a0c12' });
      ctx.restore();
    }
  }
  function speedLines(rnd) { const out = []; for (let k = 0; k < 46; k++) out.push({ a: rnd() * Math.PI * 2, r: 150 + rnd() * 70, l: 30 + rnd() * 60, w: 0.6 + rnd() * 1.4 }); return out; }
  // The caption box every comic page needs, pinned top-left below the HUD strip.
  // Fights put their health bars and names up there, so fights get no caption.
  const inFight = () => KF.FightScene && KF.engine && KF.engine.scene instanceof KF.FightScene;
  function caption(ctx, text, col = '#ffe14a') {
    if (inFight()) return;
    ctx.font = `italic 900 6.5px ${FONT}`;
    const w = ctx.measureText(text).width + 10;
    ctx.save(); ctx.translate(10, 22); ctx.rotate(-0.015);
    rr(ctx, 0, 0, w, 11, 0.8); ink(ctx, col, 1.2);
    ctx.fillStyle = INK; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(text, 5, 5.8);
    ctx.restore();
  }
  // Sky: a vertical gradient with Ben-Day dots getting bigger toward the horizon, plus inked clouds.
  function sky(w, top, bottom, dot, clouds, rnd, horizon = 150) {
    const [c, x] = layer(w);
    const g = x.createLinearGradient(0, 0, 0, horizon); g.addColorStop(0, top); g.addColorStop(1, bottom);
    x.fillStyle = g; x.fillRect(0, 0, w, VH);
    dots(x, 0, 14, w, horizon, dot, 4.2, (px, py) => Math.max(0, (py - 14) / horizon) * 0.9);
    for (let k = 0; k < clouds; k++) { // puffs: an ink silhouette, white on top, a cel-shadow belly
      const cx = 20 + rnd() * (w - 40), cy = 30 + rnd() * 46, s = 0.7 + rnd() * 0.8;
      const puffs = (grow) => { x.beginPath(); for (let j = 0; j < 4; j++) { const px = cx + (j - 1.5) * 9 * s, py = cy - (j % 2) * 4 * s; x.moveTo(px + 8 * s + grow, py); x.ellipse(px, py, 8 * s + grow, 6 * s + grow, 0, 0, Math.PI * 2); } };
      puffs(1.1); x.fillStyle = INK; x.fill();
      puffs(0); x.fillStyle = '#ffffff'; x.fill();
      x.save(); puffs(0); x.clip(); x.fillStyle = 'rgba(150,190,240,0.7)'; x.fillRect(cx - 40 * s, cy + 2 * s, 80 * s, 10 * s); x.restore();
    }
    return c;
  }
  function skyline(x, w, base, col, rnd, hmin = 30, hmax = 70) {
    for (let px = -4; px < w;) {
      const bw = 14 + rnd() * 22, bh = hmin + rnd() * (hmax - hmin);
      rr(x, px, base - bh, bw, bh + 20, 0.6); ink(x, col, 1);
      if (rnd() < 0.3) { x.beginPath(); x.moveTo(px + bw / 2, base - bh); x.lineTo(px + bw / 2, base - bh - 10); ink(x, null, 1); }
      px += bw + 1 + rnd() * 3;
    }
  }
  const common = (extra) => Object.assign({ spike, spring, sign, door, signBoard: '#ffffff', signInk: INK, signPost: INK, zone: { gravity: '#8a4cff', reverse: '#ff3cc8' } }, extra);

  // ======================================================================
  // 1. COMIC CITY: a bright afternoon page, skyscrapers and a hero streaking past.
  // ======================================================================
  const CITY = { body: '#e0453c', shadow: '#a12a2a', lip: '#ffe9b8', crate: '#ffb43a', plank: '#ff8a3a',
    pattern(ctx, x, y, seed, e) { // bricks in ink
      ctx.strokeStyle = 'rgba(21,16,28,0.75)'; ctx.lineWidth = 0.55; ctx.beginPath();
      for (let r = 0; r < 4; r++) {
        const by = y + (e.t ? 5 : 1) + r * 3.6; if (by > y + 15.5) break;
        ctx.moveTo(x, by); ctx.lineTo(x + 16, by);
        for (let bx = (r & 1) * 4 + 2; bx < 16; bx += 8) { ctx.moveTo(x + bx, by); ctx.lineTo(x + bx, by + 3.6); }
      }
      ctx.stroke();
    } };
  KF.Themes.add('comic_city', common({
    id: 'comic_city', title: 'COMIC CITY', bg: '#ffd34a',
    build() {
      const rnd = U.rng(901);
      this.sky = sky(VW, '#ffe673', '#ff9a3c', '#ff7a2a', 7, rnd);
      const [far, fx] = layer(640); skyline(fx, 640, 160, '#5aa0e8', rnd, 30, 80); this.far = far;
      const [mid, mx] = layer(768);
      const walls = ['#a85ad8', '#3ab0a0', '#ff7aa8', '#4a7ae0', '#ffb43a'];
      this.sfx = ['KRAK!', 'WHAM!', 'POW!', 'ZOK!', 'BLAM!'];
      for (let x = 0, k = 0; x < 768; k++) {
        const w = 50 + rnd() * 46, top = 78 + rnd() * 46, col = walls[Math.floor(rnd() * walls.length)];
        building(mx, x, top, w, VH, col, rnd);
        if (rnd() < 0.35) waterTower(mx, x + 8, top - 3);
        else if (rnd() < 0.5) { mx.beginPath(); mx.moveTo(x + w - 10, top - 3); mx.lineTo(x + w - 10, top - 26); ink(mx, null, 1.2); mx.beginPath(); mx.arc(x + w - 10, top - 27, 1.6, 0, 7); ink(mx, '#ff3c3c', 0.8); }
        if (k % 2 === 0) { const bx = x + w * 0.4, by = top + 34 + rnd() * 26; burst(mx, bx, by, 9, 16, 9, '#ffe14a', rnd() * 3, 1.1); letters(mx, this.sfx[k % 5], bx, by, 7, '#e8242c', { rot: -0.15 }); }
        x += w + 6 + rnd() * 14;
      }
      this.mid = mid;
      this.speed = speedLines(rnd);
    },
    background(ctx, cam, t, mood) {
      KF.blit(ctx, this.sky, 0, 0);
      tiled(ctx, this.far, cam.x, 0.12, -4);
      // A hero streaks across the sky every few seconds, speed lines trailing.
      const ht = (t % 9) / 9, hx = -60 + ht * (VW + 160), hy = 46 + Math.sin(ht * 6) * 6;
      if (ht < 0.9 && !inFight()) {
        ctx.save(); ctx.strokeStyle = INK; ctx.lineCap = 'round';
        for (let k = 0; k < 5; k++) { ctx.lineWidth = 0.8 + (k % 2) * 0.5; ctx.beginPath(); ctx.moveTo(hx - 12 - k * 3, hy - 4 + k * 2); ctx.lineTo(hx - 50 - k * 6, hy - 4 + k * 2); ctx.stroke(); }
        ctx.translate(hx, hy); ctx.rotate(-0.08);
        poly(ctx, [-11, -4, 0, -6, 2, 2, -12, 6]); ink(ctx, '#e8242c', 1); // cape
        rr(ctx, -6, -3.5, 14, 5, 2.5); ink(ctx, '#2a5ad8', 1); // body
        ctx.beginPath(); ctx.arc(9.5, -2.5, 2.6, 0, 7); ink(ctx, '#ffd0a8', 1); // head
        rr(ctx, 11, -5, 6, 2.4, 1.2); ink(ctx, '#ffd0a8', 0.8); // fist forward
        ctx.restore();
      }
      tiled(ctx, this.mid, cam.x, 0.36, 6);
      caption(ctx, 'MEANWHILE, DOWNTOWN...');
      splash(ctx, this, t, mood);
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid') slab(ctx, x, y, e, seed, CITY);
      else if (art === 'alt') crate(ctx, x, y, CITY);
      else if (art === 'ice') iceBlock(ctx, x, y, e);
      else plank(ctx, x, y, CITY);
    },
  }));

  // ======================================================================
  // 2. NEON STREET: night, rain in ink strokes, neon signs, wet street reflections.
  // ======================================================================
  const NEON = { body: '#3a3a70', shadow: '#232350', lip: '#7af0ff', crate: '#ff4ab0', plank: '#ffd23a',
    pattern(ctx, x, y, seed) { // pavement slabs with a cracked line
      ctx.strokeStyle = 'rgba(21,16,28,0.8)'; ctx.lineWidth = 0.6; ctx.beginPath();
      ctx.moveTo(x + 8, y + 4.5); ctx.lineTo(x + 8, y + 16);
      if (seed > 0.6) { ctx.moveTo(x + 2, y + 8); ctx.lineTo(x + 5, y + 10); ctx.lineTo(x + 4, y + 13); }
      ctx.stroke();
    } };
  KF.Themes.add('comic_neon', common({
    id: 'comic_neon', title: 'NEON STREET', bg: '#1c1440',
    build() {
      const rnd = U.rng(902);
      const [s, sx] = layer(VW);
      const g = sx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#120a34'); g.addColorStop(1, '#4a1a70');
      sx.fillStyle = g; sx.fillRect(0, 0, VW, VH);
      dots(sx, 0, 14, VW, 140, '#6a2a9a', 4.2, (px, py) => py / 150 * 0.8);
      sx.beginPath(); sx.arc(300, 44, 17, 0, 7); ink(sx, '#fff4c8', 1.4); // moon
      dots(sx, 288, 30, 30, 30, '#e8d890', 2.4, (px, py) => Math.max(0, 1 - Math.hypot(px - 306, py - 50) / 16) * 0.6);
      this.sky = s;
      const [far, fx] = layer(640); skyline(fx, 640, 150, '#2a2460', rnd, 40, 100); this.far = far;
      const [mid, mx] = layer(768);
      this.signs = [];
      const neons = [['RAMEN', '#ff4ab0'], ['HOTEL', '#7af0ff'], ['24H', '#ffd23a'], ['ARCADE', '#7aff8a'], ['NOODLES', '#ff7a3a']];
      for (let x = 0, k = 0; x < 768; k++) {
        const w = 56 + rnd() * 44, top = 70 + rnd() * 40, col = ['#4a3a8a', '#3a4a8a', '#5a3a70'][k % 3];
        building(mx, x, top, w, VH, col, rnd, { win: '#20184a', lit: '#ffd27a', litChance: 0.3, ledge: '#8a7ad8' });
        if (k % 2 === 0) this.signs.push({ x: x + w / 2, y: top + 26 + rnd() * 20, text: neons[k % 5][0], col: neons[k % 5][1], ph: rnd() * 9 });
        x += w + 8 + rnd() * 10;
      }
      // fire escapes in ink
      for (let x = 30; x < 768; x += 150 + rnd() * 60) {
        mx.strokeStyle = INK; mx.lineWidth = 1;
        for (let y = 100; y < 170; y += 22) { mx.strokeRect(x, y, 26, 2); mx.beginPath(); mx.moveTo(x + 2, y + 2); mx.lineTo(x + 22, y + 20); mx.stroke(); }
      }
      this.mid = mid;
      this.rain = []; for (let k = 0; k < 70; k++) this.rain.push({ x: rnd() * (VW + 60), y: rnd() * VH, s: 160 + rnd() * 120, l: 5 + rnd() * 6 });
      this.speed = speedLines(rnd);
      this.sfx = ['ZZAP!', 'KRAK!', 'BZZT!'];
    },
    background(ctx, cam, t, mood) {
      KF.blit(ctx, this.sky, 0, 0);
      tiled(ctx, this.far, cam.x, 0.12, -2);
      tiled(ctx, this.mid, cam.x, 0.36, 8);
      for (const s of this.signs) { // neon tubes: glow + bright core, flickering now and then
        const x = at(s.x, cam.x, 0.36, 768, 50); if (x === null) continue;
        const on = !(Math.sin(t * 11 + s.ph) > 0.94 || (mood.cheer > 0.5 && Math.sin(t * 40 + s.ph) > 0));
        ctx.font = `900 9px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const w = ctx.measureText(s.text).width + 10;
        rr(ctx, x - w / 2, s.y + 8 - 7, w, 14, 2); ink(ctx, '#140c2a', 1.2);
        if (on) { ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = s.col; ctx.beginPath(); ctx.ellipse(x, s.y + 8, w * 0.8, 13, 0, 0, 7); ctx.fill(); ctx.restore(); }
        ctx.lineWidth = 2.2; ctx.strokeStyle = on ? s.col : '#3a2a4a'; ctx.strokeText(s.text, x, s.y + 8.4);
        ctx.fillStyle = on ? '#ffffff' : '#4a3a5a'; ctx.fillText(s.text, x, s.y + 8.4);
      }
      ctx.save(); ctx.strokeStyle = 'rgba(200,220,255,0.55)'; ctx.lineWidth = 0.7; ctx.lineCap = 'round'; ctx.beginPath();
      for (const r of this.rain) { const y = (r.y + t * r.s) % (VH + 20) - 10, x = ((r.x - t * r.s * 0.25 - cam.x * 0.5) % (VW + 60) + VW + 60) % (VW + 60) - 30; ctx.moveTo(x, y); ctx.lineTo(x - r.l * 0.3, y + r.l); }
      ctx.stroke(); ctx.restore();
      caption(ctx, 'LATER THAT NIGHT...', '#7af0ff');
      splash(ctx, this, t, mood);
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid') slab(ctx, x, y, e, seed, NEON);
      else if (art === 'alt') crate(ctx, x, y, NEON);
      else if (art === 'ice') iceBlock(ctx, x, y, e);
      else plank(ctx, x, y, NEON);
    },
  }));

  // ======================================================================
  // 3. THE EL TRAIN: sunset, a steel trestle and an elevated train thundering past.
  // ======================================================================
  const TRAIN = { body: '#2f8a8e', shadow: '#1d5a62', lip: '#ffe14a', crate: '#e8242c', plank: '#c8a070',
    pattern(ctx, x, y, seed, e) { // riveted steel
      ctx.fillStyle = INK;
      for (const [rx, ry] of [[2.5, 6.5], [13.5, 6.5], [2.5, 13.2], [13.5, 13.2]]) { if (!e.t && ry < 8) continue; ctx.beginPath(); ctx.arc(x + rx, y + ry, 0.8, 0, 7); ctx.fill(); }
      ctx.strokeStyle = 'rgba(21,16,28,0.7)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(x + 16, y + 4.5); ctx.lineTo(x + 16, y + 16); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(x + 1, y + 5.5); ctx.lineTo(x + 1, y + 10); ctx.stroke();
    } };
  KF.Themes.add('comic_train', common({
    id: 'comic_train', title: 'THE EL TRAIN', bg: '#ff8a6a',
    build() {
      const rnd = U.rng(903);
      this.sky = sky(VW, '#ffb0d0', '#ff7a4a', '#ff5a6a', 5, rnd, 160);
      const [sx] = [this.sky.getContext('2d')]; // a big setting sun with halftone bands
      sx.beginPath(); sx.arc(260, 128, 36, 0, 7); ink(sx, '#ffe14a', 1.4);
      sx.save(); sx.beginPath(); sx.arc(260, 128, 36, 0, 7); sx.clip(); dots(sx, 220, 90, 80, 80, '#ff9a3a', 3.2, (px, py) => (py - 92) / 80); sx.restore();
      const [far, fx] = layer(640); skyline(fx, 640, 165, '#8a3a7a', rnd, 25, 60); this.far = far;
      // the trestle: black steel lattice the train runs along
      const [mid, mx] = layer(768);
      mx.fillStyle = '#2a2440'; mx.fillRect(0, 112, 768, 7);
      mx.strokeStyle = INK; mx.lineWidth = 1.4; mx.strokeRect(-2, 112, 772, 7);
      for (let x = 0; x < 768; x += 32) {
        mx.lineWidth = 1.6; mx.beginPath(); mx.moveTo(x, 119); mx.lineTo(x + 16, VH); mx.moveTo(x + 32, 119); mx.lineTo(x + 16, VH); mx.stroke();
        mx.fillStyle = '#3a3460'; mx.fillRect(x + 13, 119, 6, VH - 119); mx.lineWidth = 1; mx.strokeRect(x + 13, 119, 6, VH - 119);
      }
      this.mid = mid;
      this.speed = speedLines(rnd);
      this.sfx = ['CLANG!', 'WHOOSH!', 'KRAK!'];
    },
    background(ctx, cam, t, mood) {
      KF.blit(ctx, this.sky, 0, 0);
      tiled(ctx, this.far, cam.x, 0.1, 0);
      tiled(ctx, this.mid, cam.x, 0.3, 0);
      // The El thunders past every 7 seconds: cars with lit windows, speed lines behind.
      const tt = (t % 7) / 7, tx = VW + 40 - tt * (VW + 520);
      if (tt < 0.8) {
        for (let k = 0; k < 4; k++) {
          const x = tx + k * 104; if (x > VW + 10 || x < -110) continue;
          rr(ctx, x, 86, 100, 26, 3); ink(ctx, '#d8d8e8', 1.4);
          ctx.fillStyle = '#9a9ab8'; ctx.fillRect(x + 1, 104, 98, 7);
          ctx.fillStyle = '#e8242c'; ctx.fillRect(x + 1, 100, 98, 3);
          for (let w = 0; w < 6; w++) { rr(ctx, x + 6 + w * 15.5, 90, 11, 8, 1); ink(ctx, '#fff2a8', 0.9); }
          for (const wx of [x + 18, x + 82]) { ctx.beginPath(); ctx.arc(wx, 113, 3.5, 0, 7); ink(ctx, '#3a3460', 1.1); }
        }
        ctx.save(); ctx.strokeStyle = INK; ctx.lineCap = 'round';
        for (let k = 0; k < 6; k++) { ctx.lineWidth = 0.7 + (k % 2) * 0.6; const y = 88 + k * 4.5, x0 = tx + 4 * 104 + 6; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + 30 + k * 9, y); ctx.stroke(); }
        ctx.restore();
      }
      caption(ctx, 'THE 5:15 NEVER WAITS...', '#ffe14a');
      splash(ctx, this, t, mood);
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid') slab(ctx, x, y, e, seed, TRAIN);
      else if (art === 'alt') crate(ctx, x, y, TRAIN);
      else if (art === 'ice') iceBlock(ctx, x, y, e);
      else plank(ctx, x, y, TRAIN);
    },
  }));

  // ======================================================================
  // 4. ROOFTOPS: a midnight page, a big halftone moon, water towers and a searchlight.
  // ======================================================================
  const ROOF = { body: '#4a4258', shadow: '#2e2840', lip: '#d8d0c0', crate: '#ffb43a', plank: '#b07a4a',
    pattern(ctx, x, y, seed) { // tar roof gravel: a few ink specks
      ctx.fillStyle = 'rgba(21,16,28,0.7)';
      for (let k = 0; k < 4; k++) { const h = U.hash2(Math.floor(seed * 999), k); ctx.beginPath(); ctx.arc(x + 2 + h * 12, y + 6 + ((h * 7) % 1) * 8, 0.55, 0, 7); ctx.fill(); }
    } };
  KF.Themes.add('comic_rooftop', common({
    id: 'comic_rooftop', title: 'ROOFTOPS', bg: '#141634',
    build() {
      const rnd = U.rng(904);
      const [s, sx] = layer(VW);
      const g = sx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#0a0c2a'); g.addColorStop(1, '#2a3a7a');
      sx.fillStyle = g; sx.fillRect(0, 0, VW, VH);
      dots(sx, 0, 14, VW, 150, '#3a4a9a', 4.2, (px, py) => py / 160 * 0.85);
      sx.beginPath(); sx.arc(96, 70, 40, 0, 7); ink(sx, '#fff0b8', 1.6);
      sx.save(); sx.beginPath(); sx.arc(96, 70, 40, 0, 7); sx.clip();
      dots(sx, 56, 30, 80, 80, '#e8c870', 3, (px, py) => Math.max(0, (px - 80) / 60 + (py - 50) / 120));
      for (const [cx, cy, r] of [[84, 58, 6], [108, 82, 9], [76, 88, 4]]) { sx.beginPath(); sx.arc(cx, cy, r, 0, 7); sx.strokeStyle = 'rgba(21,16,28,0.35)'; sx.lineWidth = 0.8; sx.stroke(); }
      sx.restore();
      for (let k = 0; k < 40; k++) { const x = rnd() * VW, y = 14 + rnd() * 90, r = 0.4 + rnd() * 0.8; sx.fillStyle = '#ffffff'; sx.beginPath(); sx.arc(x, y, r, 0, 7); sx.fill(); }
      this.sky = s;
      const [far, fx] = layer(640); skyline(fx, 640, 160, '#1c2050', rnd, 35, 90); this.far = far;
      const [mid, mx] = layer(768);
      for (let x = 0, k = 0; x < 768; k++) {
        const w = 60 + rnd() * 50, top = 104 + rnd() * 34, col = ['#5a4a7a', '#4a5a8a', '#6a4a6a'][k % 3];
        building(mx, x, top, w, VH, col, rnd, { win: '#1c1a3a', lit: '#ffd27a', litChance: 0.22, ledge: '#9a8ab8' });
        if (rnd() < 0.5) waterTower(mx, x + 10 + rnd() * (w - 30), top - 3, '#8a5a3a');
        if (rnd() < 0.4) { const cx = x + w - 18; rr(mx, cx, top - 12, 7, 10, 0.6); ink(mx, '#8a4a3a', 1.1); }
        if (k % 3 === 1) { // laundry line between this roof and the next
          mx.strokeStyle = INK; mx.lineWidth = 0.6; mx.beginPath(); mx.moveTo(x + w - 4, top - 14); mx.quadraticCurveTo(x + w + 20, top - 6, x + w + 44, top - 14); mx.stroke();
          for (let j = 0; j < 3; j++) { const lx = x + w + 6 + j * 12; rr(mx, lx, top - 12 + Math.sin(j) * 1.5, 7, 9, 0.8); ink(mx, ['#ff7aa8', '#7ad8ff', '#ffe14a'][j], 0.8); }
        }
        x += w + 10 + rnd() * 16;
      }
      this.mid = mid;
      this.speed = speedLines(rnd);
      this.sfx = ['THWIP!', 'KRAK!', 'WHAM!'];
    },
    background(ctx, cam, t, mood) {
      KF.blit(ctx, this.sky, 0, 0);
      // A searchlight sweeps the clouds, a fist emblem in its beam.
      const a = -1.2 + Math.sin(t * 0.4) * 0.35, ox = 330, oy = 200, bx = ox + Math.cos(a) * 190, by = oy + Math.sin(a) * 190;
      ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = '#fff4c8';
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(bx - 22, by); ctx.lineTo(bx + 22, by); ctx.fill();
      ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.ellipse(bx, by, 24, 12, 0, 0, 7); ctx.fill();
      ctx.globalAlpha = 0.8; ctx.fillStyle = INK; rr(ctx, bx - 7, by - 4, 14, 8, 2.5); ctx.fill(); rr(ctx, bx - 3, by - 7, 6, 4, 1.5); ctx.fill();
      ctx.restore();
      tiled(ctx, this.far, cam.x, 0.12, 0);
      tiled(ctx, this.mid, cam.x, 0.36, 0);
      caption(ctx, 'MEANWHILE, ON A ROOF...');
      splash(ctx, this, t, mood);
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid') slab(ctx, x, y, e, seed, ROOF);
      else if (art === 'alt') crate(ctx, x, y, ROOF);
      else if (art === 'ice') iceBlock(ctx, x, y, e);
      else plank(ctx, x, y, ROOF);
    },
  }));

  // ---------- the style: smooth, inked, a paper page with a panel border ----------
  // Pixel passes are skipped at screen resolution, so the comic look lives in the art itself;
  // on top goes a warm paper tint and the panel border (keeps clear of the HUD strip).
  let paper = null;
  function paperTex() {
    if (paper) return paper;
    const [c, x] = layer(VW);
    const rnd = U.rng(915);
    x.fillStyle = 'rgba(120,90,40,0.05)';
    for (let k = 0; k < 900; k++) { x.beginPath(); x.arc(rnd() * VW, rnd() * VH, 0.3 + rnd() * 0.9, 0, 7); x.fill(); }
    const g = x.createRadialGradient(VW / 2, VH / 2, VH * 0.35, VW / 2, VH / 2, VW * 0.7);
    g.addColorStop(0, 'rgba(255,240,200,0)'); g.addColorStop(1, 'rgba(90,50,20,0.16)');
    x.fillStyle = g; x.fillRect(0, 0, VW, VH);
    paper = c; return c;
  }
  const S = KF.Styles.all.comic;
  Object.assign(S, {
    smooth: true, vecLook: 'inked', theme: 'comic_city', // fights without a place of their own use the city
    under(ctx) {
      ctx.save();
      KF.blit(ctx, paperTex(), 0, 0);
      ctx.fillStyle = PAPER; // page margin and panel border
      ctx.fillRect(0, 0, VW, 4); ctx.fillRect(0, VH - 4, VW, 4); ctx.fillRect(0, 0, 4, VH); ctx.fillRect(VW - 4, 0, 4, VH);
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.strokeRect(5, 5, VW - 10, VH - 10);
      ctx.restore();
    },
  });
})(window.KF);
