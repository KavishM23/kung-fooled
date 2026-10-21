'use strict';
// Arena themes: tiles, parallax backgrounds and animated details, all drawn in code.
// Rule: backgrounds stay dark and desaturated; anything you can stand on or die to is bright and outlined.
(function (KF) {
  const T = KF.TILE, U = KF.util, VW = KF.VIEW_W, VH = KF.VIEW_H;
  const R = (ctx, c, x, y, w = 1, h = 1) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  const OUT = '#1a1020';

  // ---------- shared pixel helpers ----------
  function hexRGB(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  // Vertical gradient with 2x2 ordered dithering between bands, written straight into ImageData.
  function ditherSky(colors, lw = VW, lh = VH) {
    const c = KF.makeHi(lw, lh), x = c.getContext('2d'), w = c.width, h = c.height;
    const img = x.createImageData(w, h), d = img.data;
    const cols = colors.map(hexRGB), bayer = [0.125, 0.625, 0.875, 0.375];
    for (let y = 0; y < h; y++) {
      const f = (y / (h - 1)) * (cols.length - 1), i = Math.min(cols.length - 2, Math.floor(f)), fr = f - i;
      for (let xx = 0; xx < w; xx++) {
        const col = fr > bayer[(y & 1) * 2 + (xx & 1)] ? cols[i + 1] : cols[i];
        const o = (y * w + xx) * 4;
        d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
      }
    }
    x.putImageData(img, 0, 0);
    return c;
  }
  function tiled(ctx, img, camX, par, y = 0) {
    const w = img.lw ?? img.width;
    let ox = -Math.round(camX * par * KF.RES) / KF.RES % w;
    if (ox > 0) ox -= w;
    for (let x = ox; x < VW; x += w) KF.blit(ctx, img, x, y);
  }
  // Screen x of a world-space background feature that repeats every `span` px.
  const wrapX = (wx, camX, par, span) => ((((wx - camX * par) % span) + span) % span) - 24;

  // ---------- shared props ----------
  const Art = (KF.Art = {});

  // Spikes: 2 per tile, light left face, dark right face, red base, dark outline.
  Art.spikes = {};
  (function buildSpikes() {
    const grid = [];
    for (let y = 0; y < 16; y++) {
      grid.push([]);
      for (let x = 0; x < 16; x++) {
        let c = null;
        const ox = x < 8 ? 0 : 8, lx = x - ox;
        if (y >= 6) {
          const hw = Math.min(4, 1 + Math.floor((y - 6) / 2));
          if (lx >= 4 - hw && lx < 4 + hw) c = y === 6 ? '#ffffff' : lx < 4 ? '#eef0f6' : '#9da2b8';
        }
        if (y >= 14) c = y === 14 ? '#d6344a' : '#7c1426';
        grid[y].push(c);
      }
    }
    const lined = grid.map((row, y) => row.map((c, x) => {
      if (c) return c;
      const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => grid[y + dy] && grid[y + dy][x + dx]);
      return n ? OUT : null;
    }));
    const map = { up: (x, y) => [x, y], down: (x, y) => [x, 15 - y], left: (x, y) => [y, x], right: (x, y) => [15 - y, x] };
    for (const dir in map) {
      const c = KF.makeHi(16, 16), ctx = c.getContext('2d');
      lined.forEach((row, y) => row.forEach((col, x) => { if (col) { const [nx, ny] = map[dir](x, y); R(ctx, col, nx, ny); } }));
      Art.spikes[dir] = c;
    }
  })();

  // Exit door: red lacquer gate with gold studs and a little roof. The real one has a lantern.
  Art.door = function (ctx, x, y, o = {}) {
    x = Math.round(x); y = Math.round(y);
    ctx.save();
    if (o.flipped) { ctx.translate(0, y * 2 + 32); ctx.scale(1, -1); }
    if (o.legs) {
      const k = Math.floor(o.legs * 12) % 2;
      R(ctx, OUT, x + 3 + k, y + 31, 3, 4); R(ctx, OUT, x + 10 - k, y + 31, 3, 4);
      R(ctx, '#f0c060', x + 2 + k, y + 34, 4, 1); R(ctx, '#f0c060', x + 9 - k, y + 34, 4, 1);
    }
    R(ctx, OUT, x - 1, y + 3, 18, 29);
    R(ctx, '#4a1e16', x, y + 4, 16, 28);
    const open = o.open || 0;
    if (open > 0) {
      R(ctx, '#1a0a08', x + 2, y + 6, 12, 26);
      const glow = 0.5 + 0.5 * open;
      ctx.globalAlpha = glow; R(ctx, '#ffd58a', x + 4, y + 8, 8, 24); R(ctx, '#fff4d0', x + 6, y + 10, 4, 22); ctx.globalAlpha = 1;
      const pw = Math.max(1, Math.round(6 * (1 - open)));
      R(ctx, '#c0382c', x + 2, y + 6, pw, 26); R(ctx, '#c0382c', x + 14 - pw, y + 6, pw, 26);
    } else {
      R(ctx, '#c0382c', x + 2, y + 6, 12, 26);
      R(ctx, '#e8604a', x + 2, y + 6, 1, 26); R(ctx, '#7a1c18', x + 13, y + 6, 1, 26);
      R(ctx, '#5a1612', x + 7, y + 6, 2, 26);
      for (let i = 0; i < 4; i++) { R(ctx, '#ffd060', x + 4, y + 10 + i * 5); R(ctx, '#ffd060', x + 11, y + 10 + i * 5); }
      R(ctx, '#ffd060', x + 6, y + 19, 1, 2); R(ctx, '#ffd060', x + 9, y + 19, 1, 2);
    }
    // little curved roof
    R(ctx, OUT, x - 3, y, 22, 5);
    R(ctx, '#3a2a48', x - 2, y + 1, 20, 3);
    R(ctx, '#5a4a6e', x - 2, y + 1, 20, 1);
    R(ctx, '#3a2a48', x - 3, y - 1, 2, 2); R(ctx, '#3a2a48', x + 17, y - 1, 2, 2);
    if (o.lantern) {
      const pulse = 0.25 + 0.1 * Math.sin((o.t || 0) * 4);
      ctx.globalAlpha = pulse; ctx.fillStyle = '#ffb050';
      ctx.beginPath(); ctx.arc(x + 8, y - 6, 9, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      R(ctx, OUT, x + 7, y - 2, 2, 2);
      R(ctx, OUT, x + 4, y - 10, 8, 8);
      R(ctx, '#ff8a30', x + 5, y - 9, 6, 6);
      R(ctx, '#ffe090', x + 6, y - 8, 3, 4);
      R(ctx, OUT, x + 5, y - 11, 6, 1);
    }
    ctx.restore();
  };

  // Spring-loaded boxing glove that pops out of a fake door.
  Art.glove = function (ctx, x, y, dir, ext) {
    const len = Math.round(4 + ext * 16);
    for (let i = 0; i < len; i += 2) R(ctx, i % 4 ? '#c8ccd8' : '#7a7f90', dir > 0 ? x + i : x - i - 2, y - 2 + ((i / 2) % 2) * 3, 2, 2);
    const gx = dir > 0 ? x + len : x - len - 10;
    R(ctx, OUT, gx - 1, y - 6, 12, 12);
    R(ctx, '#e02828', gx, y - 5, 10, 10);
    R(ctx, '#ff6a5a', gx + 1, y - 4, 4, 3);
    R(ctx, '#8a1010', gx + 1, y + 3, 8, 1);
    R(ctx, '#f4f0e8', dir > 0 ? gx - 2 : gx + 10, y - 4, 2, 8);
  };

  Art.spring = function (ctx, x, y, squash) {
    const h = Math.round(6 - squash * 4);
    R(ctx, OUT, x + 1, y + 16 - h - 4, 14, h + 4);
    for (let i = 0; i < h; i++) R(ctx, i % 2 ? '#7a8090' : '#d0d6e0', x + 3, y + 16 - 1 - i, 10, 1);
    R(ctx, '#ffd040', x + 2, y + 16 - h - 3, 12, 2);
    R(ctx, '#fff4a0', x + 2, y + 16 - h - 3, 12, 1);
    R(ctx, '#e02838', x + 1, y + 15, 14, 1);
  };

  // Signboard for level labels: tells jokes, never lies about geometry.
  Art.sign = function (ctx, x, y, text, theme) {
    const w = KF.Font.measure(text) + 8;
    const bx = Math.round(x - w / 2), by = Math.round(y);
    R(ctx, OUT, bx + w / 2 - 1, by + 10, 3, 8);
    R(ctx, theme.signPost || '#5a3a24', bx + w / 2, by + 10, 1, 8);
    R(ctx, OUT, bx - 1, by - 1, w + 2, 12);
    R(ctx, theme.signBoard || '#e8d8b0', bx, by, w, 10);
    R(ctx, theme.signShade || '#b8a47c', bx, by + 9, w, 1);
    KF.Font.draw(ctx, text, bx + 4, by + 2, theme.signInk || '#3a2418');
  };

  // Silhouetted crowd that bobs, and jumps with arms up when `cheer` > 0.
  Art.crowd = function (ctx, camX, t, cfg) {
    const span = VW + 48, rnd = U.rng(cfg.seed || 7);
    for (let i = 0, wx = 0; wx < span; i++) {
      const w = 6 + Math.floor(rnd() * 3), h = 9 + Math.floor(rnd() * 6), ph = rnd() * 6.28, hat = rnd() < (cfg.hats || 0);
      wx += w + (cfg.gap ?? 1) + Math.floor(rnd() * 3);
      const sx = Math.round(wrapX(wx, camX, cfg.par, span));
      const cheer = cfg.cheer || 0;
      const bob = Math.round(Math.sin(t * (3 + (i % 3)) + ph) * 0.8 + (cheer > 0 ? -Math.abs(Math.sin(t * 11 + ph)) * 4 * cheer : 0));
      const by = cfg.y - h + bob;
      R(ctx, cfg.color, sx, by + 4, w, h);
      R(ctx, cfg.color, sx + 1, by, w - 2, 5);
      R(ctx, cfg.rim, sx + 1, by, w - 2, 1);
      if (hat) { R(ctx, cfg.color, sx - 1, by, w + 2, 1); R(ctx, cfg.color, sx + 1, by - 2, w - 2, 2); }
      if (cfg.horns && i % 3 !== 1) { R(ctx, cfg.color, sx - 1, by - 2, 1, 3); R(ctx, cfg.color, sx + w, by - 2, 1, 3); R(ctx, cfg.color, sx - 2, by - 3, 1, 1); R(ctx, cfg.color, sx + w + 1, by - 3, 1, 1); }
      if (cheer > 0.2 && (i % 2 === 0 || cheer > 0.7)) {
        R(ctx, cfg.color, sx - 1, by - 3 + bob, 1, 6); R(ctx, cfg.color, sx + w, by - 3 + bob, 1, 6);
      }
    }
  };

  function lantern(ctx, x, y, t, ph, col, glow) {
    const sw = Math.sin(t * 1.6 + ph) * 2.2;
    const lx = Math.round(x + sw), ly = Math.round(y);
    ctx.globalAlpha = 0.16 + 0.05 * Math.sin(t * 3 + ph);
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(lx + 3, ly + 5, 9, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#120a14'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 3.5, y - 6); ctx.lineTo(lx + 3.5, ly); ctx.stroke();
    R(ctx, '#120a14', lx + 1, ly, 5, 1);
    R(ctx, col, lx, ly + 1, 7, 8);
    R(ctx, glow, lx + 2, ly + 2, 3, 6);
    R(ctx, '#120a14', lx + 1, ly + 9, 5, 1);
  }

  // ---------- tile painters ----------
  function bricks(ctx, x, y, y0, rows, seed, pal) {
    for (let k = 0; k * 4 < rows; k++) {
      const by = y0 + k * 4, off = ((k + Math.floor(seed * 2)) % 2) * 4;
      for (let bx = off - 8; bx < 16; bx += 8) {
        const a = Math.max(0, bx + 1), b = Math.min(16, bx + 8);
        if (b <= a) continue;
        const h = U.hash2(Math.floor(seed * 999) + bx, by);
        R(ctx, pal.base[Math.floor(h * pal.base.length)], x + a, y + by, b - a, Math.min(3, rows - k * 4));
        if (bx + 1 >= 0) R(ctx, pal.hi, x + bx + 1, y + by);
        if (bx >= 0) R(ctx, pal.mortar, x + bx, y + by, 1, 3);
      }
      if (k * 4 + 3 < rows) R(ctx, pal.mortar, x, y + by + 3, 16, 1);
    }
  }
  function stone(ctx, x, y, y0, rows, seed, pal) {
    for (let k = 0; k * 6 < rows; k++) {
      const by = y0 + k * 6, off = ((k + Math.floor(seed * 2)) % 2) * 5;
      R(ctx, pal.base, x, y + by, 16, Math.min(5, rows - k * 6));
      for (let bx = off - 10; bx < 16; bx += 10) {
        if (bx >= 0) R(ctx, pal.mortar, x + bx, y + by, 1, 5);
        if (bx + 1 >= 0 && bx + 1 < 16) R(ctx, pal.hi, x + bx + 1, y + by, Math.min(4, 15 - bx), 1);
      }
      if (k * 6 + 5 < rows) R(ctx, pal.mortar, x, y + by + 5, 16, 1);
      const h = U.hash2(Math.floor(seed * 777), by);
      R(ctx, pal.chip || pal.mortar, x + 2 + Math.floor(h * 12), y + by + 2 + Math.floor(h * 3) % 3);
    }
  }
  function edges(ctx, x, y, e, c = OUT) {
    if (e.l) R(ctx, c, x, y, 1, 16);
    if (e.r) R(ctx, c, x + 15, y, 1, 16);
    if (e.b) R(ctx, c, x, y + 15, 16, 1);
  }

  const themes = {};

  // ========== ROOFTOP AT DUSK ==========
  themes.rooftop = {
    id: 'rooftop', name: 'ROOFTOP', bg: '#241a3a',
    signBoard: '#e8d8b8', signInk: '#4a1e24',
    zone: { gravity: '#9a6aff', reverse: '#ff4fd0' },
    build() {
      this.sky = ditherSky(['#1e1634', '#2c1f48', '#432a56', '#5e3459', '#7a4058', '#965052', '#a8634c', '#b0704a']);
      const sx = this.sky.getContext('2d');
      // Striped setting sun.
      for (let y = -40; y <= 40; y++) {
        const w = Math.floor(Math.sqrt(1600 - y * y));
        if (y > 6 && (y % 5 === 0 || (y > 22 && y % 5 === 1))) continue;
        R(sx, y < 0 ? '#d8885c' : '#c97752', 262 - w, 140 + y, w * 2, 1);
      }
      R(sx, '#5a3456', 0, 60, 120, 1); R(sx, '#5a3456', 40, 64, 160, 1); R(sx, '#6e3c58', 200, 92, 140, 1); R(sx, '#6e3c58', 250, 96, 90, 1);
      const rnd = U.rng(11);
      this.far = KF.makeHi(640, VH);
      const f = this.far.getContext('2d');
      this.windows = [];
      for (let x = 0; x < 640;) {
        const w = 18 + Math.floor(rnd() * 30), h = 50 + Math.floor(rnd() * 80);
        R(f, '#3a2a4c', x, VH - h, w, h);
        for (let wy = VH - h + 4; wy < VH - 4; wy += 5) for (let wx = x + 3; wx < x + w - 3; wx += 4) {
          const lit = rnd() < 0.22;
          R(f, lit ? '#7a5662' : '#33253f', wx, wy, 2, 2);
          if (lit && rnd() < 0.15) this.windows.push({ x: wx, y: wy, ph: rnd() * 10 });
        }
        if (rnd() < 0.3) R(f, '#3a2a4c', x + Math.floor(w / 2), VH - h - 10, 1, 10);
        x += w + Math.floor(rnd() * 4);
      }
      this.mid = KF.makeHi(768, VH);
      const m = this.mid.getContext('2d');
      this.lights = []; this.boards = [];
      for (let x = 0; x < 768;) {
        const w = 36 + Math.floor(rnd() * 50), top = 96 + Math.floor(rnd() * 50);
        R(m, '#2a1e3a', x, top, w, VH - top);
        R(m, '#352648', x, top, w, 1);
        for (let wy = top + 6; wy < VH; wy += 8) for (let wx = x + 4; wx < x + w - 4; wx += 7) if (rnd() < 0.18) R(m, '#5a4050', wx, wy, 3, 3);
        const r = rnd();
        if (r < 0.35) { // water tower
          const tx = x + 6 + Math.floor(rnd() * (w - 20));
          R(m, '#2a1e3a', tx, top - 18, 14, 11); R(m, '#2a1e3a', tx + 1, top - 7, 1, 7); R(m, '#2a1e3a', tx + 12, top - 7, 1, 7);
          R(m, '#2a1e3a', tx + 2, top - 21, 10, 3); R(m, '#352648', tx, top - 18, 14, 1);
        } else if (r < 0.65) { // antenna with a blinking light
          const ax = x + 8 + Math.floor(rnd() * (w - 16));
          R(m, '#2a1e3a', ax, top - 26, 1, 26); R(m, '#2a1e3a', ax - 3, top - 18, 7, 1);
          this.lights.push({ x: ax, y: top - 27, ph: rnd() * 6 });
        } else { // billboard frame
          const bw = Math.min(w - 6, 44), bx = x + 3;
          R(m, '#2a1e3a', bx + 4, top - 8, 2, 8); R(m, '#2a1e3a', bx + bw - 6, top - 8, 2, 8);
          R(m, '#1f1630', bx, top - 26, bw, 18);
          this.boards.push({ x: bx, y: top - 26, w: bw, ph: rnd() * 9, text: ['RAMEN', 'GYM', 'HOTEL', 'DOJO'][Math.floor(rnd() * 4)] });
        }
        x += w + 6 + Math.floor(rnd() * 20);
      }
    },
    background(ctx, cam, t, mood) {
      KF.blit(ctx, this.sky, 0, 0);
      tiled(ctx, this.far, cam.x, 0.1, -6);
      for (const wv of this.windows) {
        if (Math.sin(t * 2 + wv.ph * 3) > 0.6 && U.hash2(Math.floor(t * 3), wv.x) > 0.5) continue;
        const x = Math.round(wrapX(wv.x, cam.x, 0.1, 640));
        if (x > -4 && x < VW) R(ctx, '#a07058', x + 24, wv.y - 6, 2, 2);
      }
      tiled(ctx, this.mid, cam.x, 0.28);
      for (const l of this.lights) {
        if ((t + l.ph) % 1.6 > 0.8) continue;
        const x = Math.round(wrapX(l.x, cam.x, 0.28, 768)) + 24;
        if (x < -2 || x > VW) continue;
        ctx.globalAlpha = 0.3; R(ctx, '#ff4040', x - 1, l.y - 1, 3, 3); ctx.globalAlpha = 1; R(ctx, '#ff5a4a', x, l.y);
      }
      for (const b of this.boards) {
        const x = Math.round(wrapX(b.x, cam.x, 0.28, 768)) + 24;
        if (x < -b.w || x > VW) continue;
        const on = !(Math.sin(t * 13 + b.ph) > 0.92 || (Math.sin(t * 0.7 + b.ph) > 0.97));
        KF.Font.draw(ctx, b.text, x + b.w / 2, b.y + 6, on ? '#b0507a' : '#4a2a44', 1, 'center');
        if (on) { ctx.globalAlpha = 0.12; R(ctx, '#ff6ab0', x, b.y, b.w, 18); ctx.globalAlpha = 1; }
      }
      R(ctx, '#1d1428', 0, 150, VW, VH - 150);
      R(ctx, '#2a1f38', 0, 150, VW, 1);
      Art.crowd(ctx, cam.x, t, { y: 152, par: 0.5, color: '#251a33', rim: '#4a3550', seed: 3, cheer: mood.cheer });
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid') {
        bricks(ctx, x, y, 0, 16, seed, { base: ['#8e4436', '#9a4c3a', '#843e34'], mortar: '#5c2a2c', hi: '#b2604a' });
        if (e.t) {
          R(ctx, '#f2dfc2', x, y, 16, 1); R(ctx, '#d5bd9c', x, y + 1, 16, 2); R(ctx, '#9c8468', x, y + 3, 16, 1); R(ctx, '#3a1a1e', x, y + 4, 16, 1);
          R(ctx, '#b8a080', x + Math.floor(seed * 13) + 1, y + 2);
        }
        edges(ctx, x, y, e, '#3a1a1e');
      } else if (art === 'alt') {
        R(ctx, '#6f7a8c', x, y, 16, 16);
        R(ctx, '#4a5262', x + 1, y + 1, 14, 14); R(ctx, '#7f8a9c', x + 2, y + 2, 12, 12);
        for (let k = 0; k < 3; k++) R(ctx, '#3a4150', x + 4, y + 5 + k * 3, 8, 1);
        R(ctx, '#c4ccd8', x + 2, y + 2); R(ctx, '#c4ccd8', x + 13, y + 2); R(ctx, '#c4ccd8', x + 2, y + 13); R(ctx, '#c4ccd8', x + 13, y + 13);
        if (e.t) R(ctx, '#a8b2c2', x, y, 16, 1);
        edges(ctx, x, y, e, '#1c2028');
      } else {
        R(ctx, '#e6eaf0', x, y, 16, 1); R(ctx, '#aab2be', x, y + 1, 16, 2); R(ctx, '#5a6070', x, y + 3, 16, 1);
        R(ctx, '#e6eaf0', x + 3, y + 2); R(ctx, '#e6eaf0', x + 11, y + 2);
        R(ctx, '#4a5060', x + 3, y + 4, 1, 4); R(ctx, '#4a5060', x + 12, y + 4, 1, 4);
      }
    },
  };

  // ========== HARBOUR, NIGHT ==========
  themes.harbour = {
    id: 'harbour', name: 'HARBOUR', bg: '#0e1424',
    signBoard: '#d8c8a0', signInk: '#20283a', signPost: '#4a3420',
    zone: { gravity: '#8a7aff', reverse: '#ff58c8' },
    build() {
      this.sky = ditherSky(['#0a0f1e', '#10182c', '#172138', '#1e2a44', '#26324e', '#2c3854']);
      const s = this.sky.getContext('2d'), rnd = U.rng(21);
      this.stars = [];
      for (let i = 0; i < 70; i++) { const x = Math.floor(rnd() * VW), y = Math.floor(rnd() * 110); R(s, '#4a5878', x, y); if (rnd() < 0.3) this.stars.push({ x, y, ph: rnd() * 9 }); }
      s.globalAlpha = 0.08; s.fillStyle = '#c8c8b0'; s.beginPath(); s.arc(300, 44, 26, 0, 7); s.fill(); s.globalAlpha = 1;
      s.fillStyle = '#b4b6a2'; s.beginPath(); s.arc(300, 44, 13, 0, 7); s.fill();
      R(s, '#9a9c8a', 294, 40, 3, 2); R(s, '#9a9c8a', 302, 48, 4, 2);
      this.far = KF.makeHi(640, VH);
      const f = this.far.getContext('2d');
      for (let x = 0; x < 640;) {
        const w = 10 + Math.floor(rnd() * 24), h = 14 + Math.floor(rnd() * 34);
        R(f, '#1a2440', x, 150 - h, w, h + 10);
        for (let k = 0; k < w * h / 40; k++) if (rnd() < 0.5) R(f, '#5e5a44', x + 1 + Math.floor(rnd() * (w - 2)), 152 - h + Math.floor(rnd() * h));
        x += w + Math.floor(rnd() * 6);
      }
      this.mid = KF.makeHi(768, VH);
      const m = this.mid.getContext('2d');
      this.portholes = [];
      for (let x = 20; x < 768; x += 190 + Math.floor(rnd() * 80)) {
        // gantry crane
        R(m, '#172036', x, 40, 4, 120); R(m, '#172036', x + 30, 40, 4, 120);
        for (let y = 50; y < 160; y += 14) { for (let i = 0; i < 30; i++) R(m, '#172036', x + 4 + i, y + Math.floor(i * 0.45)); }
        R(m, '#172036', x - 30, 36, 110, 5); R(m, '#172036', x + 60, 41, 1, 40); R(m, '#172036', x + 56, 80, 9, 6);
        // ship hull
        const sx = x + 90;
        R(m, '#131a2e', sx, 128, 92, 30); R(m, '#131a2e', sx + 6, 158, 80, 4); R(m, '#131a2e', sx + 50, 108, 30, 20); R(m, '#131a2e', sx + 60, 92, 6, 16);
        for (let i = 0; i < 6; i++) { this.portholes.push({ x: sx + 8 + i * 13, y: 138, ph: rnd() * 9 }); R(m, '#1e2742', sx + 8 + i * 13, 138, 3, 3); }
      }
      this.posts = [];
      for (let x = 30; x < 1000; x += 120 + Math.floor(rnd() * 60)) this.posts.push({ x, ph: rnd() * 6 });
    },
    background(ctx, cam, t, mood) {
      KF.blit(ctx, this.sky, 0, 0);
      for (const s of this.stars) if (Math.sin(t * 2.5 + s.ph) > 0.3) R(ctx, '#8a98b8', s.x, s.y);
      tiled(ctx, this.far, cam.x, 0.08);
      // Water with drifting shimmer and the moon's reflection.
      R(ctx, '#0f1828', 0, 156, VW, VH - 156);
      for (let i = 0; i < 40; i++) {
        const y = 158 + (i * 7) % 56, x = Math.round(((i * 53 + t * (8 + (i % 4) * 3) - cam.x * 0.2) % (VW + 40) + VW + 40) % (VW + 40)) - 20;
        R(ctx, i % 3 ? '#1e2c46' : '#2a3a5c', x, y, 6 + (i % 5) * 3, 1);
      }
      for (let y = 158; y < 200; y += 3) R(ctx, '#3e4660', 296 + Math.round(Math.sin(t * 2 + y) * 3) - Math.round(cam.x * 0.02), y, 8 - (y - 158) / 8, 1);
      tiled(ctx, this.mid, cam.x, 0.25);
      for (const p of this.portholes) {
        const x = Math.round(wrapX(p.x, cam.x, 0.25, 768)) + 24;
        if (x > -4 && x < VW && Math.sin(t * 0.8 + p.ph) > -0.6) R(ctx, '#7a7048', x, p.y, 3, 3);
      }
      // Pier deck + crowd of sailors + swaying lamps.
      R(ctx, '#121a2c', 0, 152, VW, 6);
      Art.crowd(ctx, cam.x, t, { y: 153, par: 0.45, color: '#151d31', rim: '#34405c', seed: 9, hats: 0.5, gap: 3, cheer: mood.cheer });
      for (const p of this.posts) {
        const x = Math.round(wrapX(p.x, cam.x, 0.45, 1000)) + 24;
        if (x < -20 || x > VW + 20) continue;
        R(ctx, '#0c1222', x, 96, 2, 58); R(ctx, '#0c1222', x - 6, 96, 9, 2);
        lantern(ctx, x - 7, 102, t, p.ph, '#8a6a30', '#d8b060');
      }
    },
    tile(ctx, x, y, art, e, seed) {
      const stonePal = { base: '#5f6b7a', mortar: '#3a4452', hi: '#7a8696', chip: '#4e5866' };
      if (art === 'solid') {
        if (e.t) {
          R(ctx, '#f0b878', x, y, 16, 1); R(ctx, '#c58a50', x, y + 1, 16, 3); R(ctx, '#7a4c26', x, y + 4, 16, 1);
          const sx = 4 + Math.floor(seed * 8);
          R(ctx, '#5a3418', x + sx, y + 1, 1, 3); R(ctx, '#2a1a10', x + sx - 2, y + 2); R(ctx, '#2a1a10', x + sx + 2, y + 2);
          stone(ctx, x, y, 5, 11, seed, stonePal);
          R(ctx, '#4f7a45', x + Math.floor(seed * 11), y + 5, 3, 1); R(ctx, '#3e6236', x + Math.floor(seed * 11) + 1, y + 6);
        } else stone(ctx, x, y, 0, 16, seed, stonePal);
        edges(ctx, x, y, e, '#1a2030');
      } else if (art === 'alt') {
        R(ctx, '#b07838', x, y, 16, 16);
        R(ctx, '#6a4220', x, y, 16, 2); R(ctx, '#6a4220', x, y + 14, 16, 2); R(ctx, '#6a4220', x, y, 2, 16); R(ctx, '#6a4220', x + 14, y, 2, 16);
        for (let i = 2; i < 14; i++) R(ctx, '#8a5a2c', x + i, y + i);
        R(ctx, '#d89a58', x + 2, y + 2, 12, 1);
        if (e.t) R(ctx, '#e8b070', x, y, 16, 1);
        edges(ctx, x, y, e, '#2a1608');
      } else {
        R(ctx, '#eab474', x, y, 16, 1); R(ctx, '#b87c42', x, y + 1, 16, 2); R(ctx, '#5a3418', x, y + 3, 16, 1);
        R(ctx, '#4a2c14', x + 7, y + 4, 2, 6);
      }
    },
  };

  // ========== NEON NIGHT MARKET ==========
  themes.neon = {
    id: 'neon', name: 'NEON', bg: '#0a0814',
    signBoard: '#f0e6d0', signInk: '#5a1238', signPost: '#3a2a48',
    zone: { gravity: '#7a9aff', reverse: '#ff50c0' },
    build() {
      this.sky = ditherSky(['#07050d', '#0e0918', '#170c26', '#1e1030', '#241434']);
      const rnd = U.rng(31);
      this.far = KF.makeHi(640, VH);
      const f = this.far.getContext('2d');
      this.strips = [];
      for (let x = 0; x < 640;) {
        const w = 16 + Math.floor(rnd() * 26), h = 70 + Math.floor(rnd() * 90);
        R(f, '#1a1228', x, VH - h, w, h);
        if (rnd() < 0.6) this.strips.push({ x: x + Math.floor(w / 2), y: VH - h + 6, h: Math.floor(h * 0.4), c: rnd() < 0.5 ? '#5a2a66' : '#244a5e', ph: rnd() * 9 });
        x += w + Math.floor(rnd() * 5);
      }
      this.mid = KF.makeHi(768, VH);
      const m = this.mid.getContext('2d');
      this.signs = [];
      const cols = ['#a03a78', '#2e8a8a', '#a08a2e', '#5a4ab0'];
      for (let x = 0; x < 768;) {
        const w = 44 + Math.floor(rnd() * 30), top = 100 + Math.floor(rnd() * 20);
        R(m, '#1b1229', x, top, w, VH - top);
        R(m, '#24183a', x - 3, top - 6, w + 6, 6);
        for (let i = 0; i < w + 6; i += 4) R(m, '#2c1e44', x - 3 + i, top, 2, 2);
        this.signs.push({ x: x + 4, y: top - 26, w: Math.min(w - 8, 30), h: 16, c: cols[Math.floor(rnd() * cols.length)], ph: rnd() * 9, seed: Math.floor(rnd() * 1e6) });
        x += w + 10 + Math.floor(rnd() * 16);
      }
    },
    background(ctx, cam, t, mood) {
      KF.blit(ctx, this.sky, 0, 0);
      tiled(ctx, this.far, cam.x, 0.08);
      for (const s of this.strips) {
        const x = Math.round(wrapX(s.x, cam.x, 0.08, 640)) + 24;
        if (x < -2 || x > VW) continue;
        const on = Math.sin(t * 9 + s.ph) < 0.95;
        R(ctx, on ? s.c : '#1e1430', x, s.y, 1, s.h);
      }
      tiled(ctx, this.mid, cam.x, 0.25);
      for (const s of this.signs) {
        const x = Math.round(wrapX(s.x, cam.x, 0.25, 768)) + 24;
        if (x < -40 || x > VW) continue;
        const flick = Math.sin(t * 17 + s.ph) > 0.9 || Math.sin(t * 0.5 + s.ph) > 0.96;
        const c = flick ? '#2a1a38' : s.c;
        ctx.strokeStyle = c; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, s.y + 0.5, s.w, s.h);
        const rnd = U.rng(s.seed);
        for (let k = 0; k < 3; k++) { // made-up glyph strokes
          const gx = x + 4 + k * Math.floor((s.w - 6) / 3);
          R(ctx, c, gx, s.y + 4 + Math.floor(rnd() * 3), 1 + Math.floor(rnd() * 4), 1);
          R(ctx, c, gx + Math.floor(rnd() * 3), s.y + 4, 1, 8);
          R(ctx, c, gx, s.y + 9 + Math.floor(rnd() * 3), 4, 1);
        }
        if (!flick) { ctx.globalAlpha = 0.1; R(ctx, s.c, x - 2, s.y - 2, s.w + 5, s.h + 5); ctx.globalAlpha = 1; }
      }
      // Lantern strings.
      const span = 520;
      for (let i = 0; i < 26; i++) {
        const wx = i * 20, x = Math.round(wrapX(wx, cam.x, 0.42, span)) + 24;
        if (x < -10 || x > VW + 10) continue;
        const sag = Math.sin(((wx % 130) / 130) * Math.PI) * 10;
        R(ctx, '#2a1a30', x, 62 + Math.round(sag), 20, 1);
        if (i % 2 === 0) lantern(ctx, x + 6, 66 + sag, t, i, '#9a2a24', '#d0603a');
      }
      R(ctx, '#140c20', 0, 150, VW, VH - 150);
      Art.crowd(ctx, cam.x, t, { y: 154, par: 0.55, color: '#1c1230', rim: '#4a2a5a', seed: 17, gap: 0, cheer: mood.cheer });
      // Steam drifting up from food stalls.
      for (let i = 0; i < 6; i++) {
        const age = (t * 0.4 + i / 6) % 1, x = Math.round(wrapX(i * 70 + 30, cam.x, 0.55, 420)) + 24 + Math.sin(t * 2 + i) * 3;
        ctx.globalAlpha = 0.12 * (1 - age); R(ctx, '#c8b8d8', x, 150 - age * 50, 6 + age * 8, 4); ctx.globalAlpha = 1;
      }
    },
    tile(ctx, x, y, art, e, seed) {
      const cer = (y0, rows) => {
        R(ctx, '#3a7a74', x, y + y0, 16, rows);
        for (let k = y0; k < y0 + rows; k += 5) { R(ctx, '#24504c', x, y + k + 4, 16, 1); R(ctx, '#5aa098', x + 1, y + k, 3, 1); R(ctx, '#5aa098', x + 9, y + k, 3, 1); }
        R(ctx, '#24504c', x + 7, y + y0, 1, rows);
      };
      if (art === 'solid') {
        if (e.t) {
          R(ctx, '#ff5aa8', x, y, 16, 1); R(ctx, '#d8c8aa', x, y + 1, 16, 1); R(ctx, '#b7a586', x, y + 2, 16, 3);
          R(ctx, '#7a6a58', x + (seed > 0.5 ? 4 : 11), y + 2, 1, 3); R(ctx, '#2a2030', x, y + 5, 16, 1);
          cer(6, 10);
        } else cer(0, 16);
        edges(ctx, x, y, e, '#101828');
      } else if (art === 'alt') {
        R(ctx, '#b33a3a', x, y, 16, 16); R(ctx, '#5a1616', x, y + 15, 16, 1); R(ctx, '#5a1616', x + 15, y, 1, 16);
        R(ctx, '#e8b850', x, y + 3, 16, 1); R(ctx, '#e8b850', x, y + 12, 16, 1);
        R(ctx, '#f0e0c0', x + 4, y + 5, 8, 6); R(ctx, '#5a1616', x + 6, y + 6, 1, 4); R(ctx, '#5a1616', x + 8, y + 7, 3, 1);
        if (e.t) R(ctx, '#ff7a6a', x, y, 16, 1);
        edges(ctx, x, y, e, '#2a0a0a');
      } else {
        for (let i = 0; i < 4; i++) {
          R(ctx, i % 2 ? '#f2eadb' : '#e84a4a', x + i * 4, y, 4, 3);
          R(ctx, i % 2 ? '#c8c0b0' : '#a02a2a', x + i * 4, y + 3, 4, 1);
          R(ctx, i % 2 ? '#c8c0b0' : '#a02a2a', x + i * 4 + 1, y + 4, 2, 1);
        }
      }
    },
  };

  // ========== TEMPLE COURTYARD (title, door select, training) ==========
  themes.temple = {
    id: 'temple', name: 'TEMPLE', bg: '#1a2236',
    cube: { top: '#e0d4b8', side: '#6c604e', under: '#3e3428', edge: '#2a1e18' },
    signBoard: '#e8d8b0', signInk: '#3a1a10',
    zone: { gravity: '#8a7aff', reverse: '#ff58c8' },
    build() {
      this.sky = ditherSky(['#161c30', '#202640', '#2e2e4c', '#3e3652', '#563e58', '#6a4a5a']);
      const rnd = U.rng(41);
      this.far = KF.makeHi(640, VH);
      const f = this.far.getContext('2d');
      let h = 70;
      for (let x = 0; x < 640; x++) { h += (rnd() - 0.5) * 3; h = U.clamp(h, 40, 100); R(f, '#2a2a42', x, VH - h - 30, 1, h + 30); }
      this.mid = KF.makeHi(768, VH);
      const m = this.mid.getContext('2d');
      const roof = (cx, y, w) => {
        for (let i = 0; i < w; i++) { const d = Math.abs(i - w / 2) / (w / 2); R(m, '#1c1a2e', cx - w / 2 + i, y - Math.round(d * d * 5), 1, 6); }
      };
      for (let x = 60; x < 768; x += 300) { // pagoda
        R(m, '#1c1a2e', x - 22, 120, 44, 100);
        roof(x, 118, 70); R(m, '#1c1a2e', x - 16, 96, 32, 22); roof(x, 94, 54); R(m, '#1c1a2e', x - 10, 76, 20, 18); roof(x, 74, 40);
        R(m, '#1c1a2e', x - 1, 56, 2, 14);
        R(m, '#3a2a3a', x - 6, 130, 4, 6); R(m, '#3a2a3a', x + 2, 130, 4, 6);
      }
      this.blossoms = [];
      for (let x = 170; x < 768; x += 300) { // cherry tree
        R(m, '#221a2c', x, 110, 4, 100); R(m, '#221a2c', x - 12, 112, 14, 2); R(m, '#221a2c', x + 3, 104, 16, 2);
        for (let k = 0; k < 60; k++) {
          const a = rnd() * 6.28, r = rnd() * 26;
          R(m, k % 3 ? '#4e2e46' : '#64385a', x + Math.round(Math.cos(a) * r * 1.4), 100 + Math.round(Math.sin(a) * r * 0.7), 3, 2);
        }
      }
    },
    background(ctx, cam, t, mood) {
      KF.blit(ctx, this.sky, 0, 0);
      tiled(ctx, this.far, cam.x, 0.06);
      tiled(ctx, this.mid, cam.x, 0.22);
      for (let i = 0; i < 6; i++) {
        const x = Math.round(wrapX(i * 80 + 20, cam.x, 0.35, 480)) + 24;
        if (x > -10 && x < VW + 10) { R(ctx, '#151422', x + 3, 40, 1, 36); lantern(ctx, x, 82, t, i * 1.7, '#9a3a24', '#e08040'); }
      }
      R(ctx, '#17141f', 0, 152, VW, VH - 152);
      Art.crowd(ctx, cam.x, t, { y: 154, par: 0.5, color: '#1e1a2a', rim: '#3a3448', seed: 27, gap: 2, cheer: mood.cheer });
      for (let i = 0; i < 14; i++) { // drifting petals
        const ph = i * 0.73, age = (t * 0.12 + ph) % 1;
        const x = Math.round(((i * 47 + age * 120 + Math.sin(t + i) * 8 - cam.x * 0.6) % (VW + 20) + VW + 20) % (VW + 20)) - 10;
        R(ctx, i % 2 ? '#a0607a' : '#c07890', x, Math.round(age * VH), 2, 1);
      }
    },
    tile(ctx, x, y, art, e, seed) {
      const pal = { base: '#a89c84', mortar: '#6c604e', hi: '#c8bca0', chip: '#8c806a' };
      if (art === 'solid') {
        if (e.t) {
          R(ctx, '#f2704a', x, y, 16, 1); R(ctx, '#bf3228', x, y + 1, 16, 3); R(ctx, '#5a1418', x, y + 4, 16, 1);
          R(ctx, '#f0c060', x + 4, y + 2); R(ctx, '#f0c060', x + 12, y + 2);
          stone(ctx, x, y, 5, 11, seed, pal);
        } else stone(ctx, x, y, 0, 16, seed, pal);
        edges(ctx, x, y, e, '#2a1e18');
      } else if (art === 'alt') {
        R(ctx, '#7a4a2a', x, y, 16, 16); R(ctx, '#4a2a14', x, y + 7, 16, 2); R(ctx, '#4a2a14', x + 7, y, 2, 16);
        R(ctx, '#9a6a3a', x + 1, y + 1, 5, 1); R(ctx, '#f0c060', x + 2, y + 2); R(ctx, '#f0c060', x + 13, y + 13);
        if (e.t) R(ctx, '#b88050', x, y, 16, 1);
        edges(ctx, x, y, e, '#2a1608');
      } else {
        R(ctx, '#c8d47a', x, y, 16, 1); R(ctx, '#93a24c', x, y + 1, 16, 2); R(ctx, '#5a6a2a', x, y + 3, 16, 1);
        R(ctx, '#5a6a2a', x + 5, y, 1, 3); R(ctx, '#5a6a2a', x + 12, y, 1, 3);
      }
    },
  };

  // ========== SKY EXPRESS (bullet-train roof at sunset) ==========
  // The train is always moving: every background layer also scrolls with time, not just the camera.
  themes.train = {
    id: 'train', name: 'TRAIN', bg: '#1c1834',
    signBoard: '#e8e4d8', signInk: '#1a2a4a', signPost: '#3a3e4a',
    zone: { gravity: '#8a8aff', reverse: '#ff58c8' },
    build() {
      this.sky = ditherSky(['#18162e', '#24203e', '#382a4e', '#563456', '#7a4458', '#985a56', '#a86c54']);
      const sx = this.sky.getContext('2d');
      sx.fillStyle = '#b8805a'; sx.beginPath(); sx.arc(90, 150, 22, 0, 7); sx.fill();
      for (let y = 140; y < 172; y += 4) R(sx, '#a86c54', 60, y, 60, 1);
      const rnd = U.rng(51);
      this.far = KF.makeHi(640, VH);
      const f = this.far.getContext('2d');
      let h = 60;
      for (let x = 0; x < 640; x++) { h += (rnd() - 0.5) * 4; h = U.clamp(h, 30, 90); R(f, '#2e2648', x, VH - h - 40, 1, h + 40); }
      for (let x = 0; x < 640; x += 3) if (rnd() < 0.2) R(f, '#5a4a5a', x, VH - 50 - Math.floor(rnd() * 8), 1, 1);
      this.mid = KF.makeHi(768, VH);
      const m = this.mid.getContext('2d');
      for (let x = 0; x < 768;) { // tree line + pylons
        const w = 6 + Math.floor(rnd() * 14), th = 10 + Math.floor(rnd() * 22);
        R(m, '#211c36', x, 150 - th, w, th + 70);
        x += w;
        if (rnd() < 0.05) { R(m, '#211c36', x, 70, 2, 80); R(m, '#211c36', x - 10, 76, 22, 2); R(m, '#211c36', x - 6, 88, 14, 2); }
      }
    },
    background(ctx, cam, t, mood) {
      KF.blit(ctx, this.sky, 0, 0);
      const run = t * 240; // the train's speed
      tiled(ctx, this.far, cam.x + run, 0.05);   // offset = (camera + distance travelled) * parallax
      tiled(ctx, this.mid, cam.x + run, 0.35);
      // Passing train on the next track, full of cheering silhouettes in its windows.
      const span = 600, ox = -((cam.x * 0.45 + run * 0.6) % span);
      for (let base = ox - span; base < VW + span; base += span) {
        R(ctx, '#2a2840', base, 128, span - 30, 30);
        R(ctx, '#34324e', base, 128, span - 30, 2);
        R(ctx, '#5a2a3a', base, 146, span - 30, 2);
        for (let wx = 10; wx < span - 50; wx += 22) {
          const x = Math.round(base + wx);
          if (x < -20 || x > VW + 20) continue;
          R(ctx, '#3e3a50', x, 133, 16, 10);
          const ph = (wx * 0.37) % 6.28;
          const bob = Math.round(Math.sin(t * 6 + ph) * 0.8 - (mood.cheer > 0 ? Math.abs(Math.sin(t * 12 + ph)) * 2 * mood.cheer : 0));
          R(ctx, '#1c1a2c', x + 4, 136 + bob, 4, 7); R(ctx, '#1c1a2c', x + 9, 137 + bob, 4, 6);
          if (mood.cheer > 0.3) { R(ctx, '#1c1a2c', x + 3, 133 + bob, 1, 4); R(ctx, '#1c1a2c', x + 13, 134 + bob, 1, 4); }
        }
      }
      // Overhead line poles whipping past + speed streaks.
      for (let i = 0; i < 3; i++) {
        const x = Math.round(VW + 40 - (((run * 2.2 + cam.x * 0.8 + i * 170) % (VW + 120))));
        R(ctx, '#120f22', x, 20, 4, 150); R(ctx, '#120f22', x - 14, 30, 32, 3);
      }
      R(ctx, '#120f22', 0, 34, VW, 1);
      ctx.globalAlpha = 0.18;
      for (let i = 0; i < 10; i++) R(ctx, '#e8d8e8', Math.round(VW - ((run * 3 + i * 97) % (VW + 60))), 60 + (i * 23) % 90, 18 + (i % 3) * 10, 1);
      ctx.globalAlpha = 1;
      R(ctx, '#151226', 0, 158, VW, VH - 158);
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid') {
        const d = e.d || 0;
        if (e.t || d === 0) { // roof
          R(ctx, '#f4f6fa', x, y, 16, 1); R(ctx, '#b8c0cc', x, y + 1, 16, 3); R(ctx, '#5a6272', x, y + 4, 16, 1);
          R(ctx, '#f4f6fa', x + 3, y + 2); R(ctx, '#f4f6fa', x + 11, y + 2);
          R(ctx, '#dfe2ea', x, y + 5, 16, 11); R(ctx, '#c8ccd6', x, y + 15, 16, 1);
        } else if (d === 1) { // window band
          R(ctx, '#dfe2ea', x, y, 16, 16);
          R(ctx, '#2a3450', x + 2, y + 3, 12, 7); R(ctx, '#8ab0d8', x + 3, y + 3, 4, 1); R(ctx, '#4a5a7a', x + 2, y + 9, 12, 1);
          R(ctx, '#d83a3a', x, y + 12, 16, 2); R(ctx, '#2a3a8a', x, y + 14, 16, 1);
        } else if (d === 2) { // lower body
          R(ctx, '#d4d8e2', x, y, 16, 16); R(ctx, '#aeb4c2', x, y + 13, 16, 3);
          if (seed > 0.6) R(ctx, '#aeb4c2', x + 7, y + 2, 1, 9);
        } else { // undercarriage with wheels
          R(ctx, '#2a2c38', x, y, 16, 16); R(ctx, '#3e4252', x, y, 16, 2);
          R(ctx, '#15161e', x + 3, y + 4, 10, 10); R(ctx, '#5a5e6e', x + 5, y + 6, 6, 6); R(ctx, '#15161e', x + 7, y + 8, 2, 2);
        }
        edges(ctx, x, y, e, '#1a1c2a');
      } else if (art === 'alt') {
        R(ctx, '#3a6a8a', x, y, 16, 16);
        for (let i = 1; i < 16; i += 3) R(ctx, '#2a4e68', x + i, y, 1, 16);
        R(ctx, '#6a9aba', x, y, 16, 1); R(ctx, '#f0c040', x + 6, y + 6, 4, 3);
        edges(ctx, x, y, e, '#101a24');
      } else {
        R(ctx, '#c8ccd6', x, y, 16, 1); R(ctx, '#8a909c', x, y + 1, 16, 2); R(ctx, '#3a3e4a', x, y + 3, 16, 1);
        for (let i = 2; i < 16; i += 4) R(ctx, '#3a3e4a', x + i, y + 1, 2, 1);
      }
    },
  };

  // ========== SAKURA SPRING (cherry-blossom valley at twilight) ==========
  themes.sakura = {
    id: 'sakura', name: 'SAKURA', bg: '#2e2c48',
    signBoard: '#f4e8e0', signInk: '#7a2040', signPost: '#5a2a24',
    zone: { gravity: '#8a7aff', reverse: '#ff58c8' },
    build() {
      this.sky = ditherSky(['#2a2a46', '#3a3656', '#544462', '#70546a', '#8c6272', '#9c7078']);
      const sx = this.sky.getContext('2d'), rnd = U.rng(61);
      // Snow-capped peak in the distance.
      for (let y = 70; y < 170; y++) {
        const half = (y - 70) * 1.5;
        R(sx, y < 92 ? '#b8aab8' : '#4e4462', 250 - half, y, half * 2, 1);
        if (y >= 88 && y < 96) for (let x = -half; x < half; x += 5) R(sx, '#b8aab8', 250 + x + ((y * 3) % 5), y, 2, 1);
      }
      sx.fillStyle = '#d8c0c0'; sx.beginPath(); sx.arc(80, 48, 9, 0, 7); sx.fill();
      this.far = KF.makeHi(640, VH);
      const f = this.far.getContext('2d');
      let h = 50;
      for (let x = 0; x < 640; x++) { h += (rnd() - 0.5) * 3; h = U.clamp(h, 30, 70); R(f, '#3c3452', x, VH - h - 44, 1, h + 44); }
      this.mid = KF.makeHi(768, VH);
      const m = this.mid.getContext('2d');
      this.trees = [];
      for (let x = 30; x < 768; x += 150 + Math.floor(rnd() * 60)) { // cherry trees
        R(m, '#2c2032', x, 100, 5, 120); R(m, '#2c2032', x - 18, 104, 22, 3); R(m, '#2c2032', x + 4, 96, 24, 3);
        for (let k = 0; k < 90; k++) {
          const a = rnd() * 6.28, r = Math.sqrt(rnd()) * 34;
          R(m, ['#6a3a5a', '#7e4866', '#94587a'][k % 3], x + Math.round(Math.cos(a) * r * 1.5), 92 + Math.round(Math.sin(a) * r * 0.7), 3, 2);
        }
        this.trees.push(x);
      }
      for (let x = 110; x < 768; x += 300) { // torii gate
        R(m, '#4a1e24', x, 110, 4, 60); R(m, '#4a1e24', x + 36, 110, 4, 60);
        R(m, '#4a1e24', x - 6, 106, 52, 5); R(m, '#4a1e24', x - 2, 118, 44, 3); R(m, '#5a2a2a', x - 8, 104, 56, 2);
      }
      // River with an arched bridge.
      for (let x = 0; x < 768; x++) R(m, '#30304e', x, 158, 1, 6);
      for (let x = 400; x < 470; x++) { const y = 150 - Math.round(Math.sin(((x - 400) / 70) * Math.PI) * 10); R(m, '#5a2228', x, y, 1, 3); if (x % 10 === 0) R(m, '#5a2228', x, y - 6, 1, 6); }
    },
    background(ctx, cam, t, mood) {
      KF.blit(ctx, this.sky, 0, 0);
      tiled(ctx, this.far, cam.x, 0.08);
      tiled(ctx, this.mid, cam.x, 0.25);
      for (let i = 0; i < 5; i++) { // floating lanterns drifting up
        const age = (t * 0.05 + i * 0.21) % 1, x = Math.round(wrapX(i * 90 + 40, cam.x, 0.3, 450)) + 24 + Math.sin(t + i) * 4;
        ctx.globalAlpha = 0.5 * Math.sin(age * Math.PI); R(ctx, '#c0705a', x, Math.round(150 - age * 120), 3, 4); R(ctx, '#e0a070', x + 1, Math.round(151 - age * 120), 1, 2); ctx.globalAlpha = 1;
      }
      R(ctx, '#1e1a30', 0, 152, VW, VH - 152);
      Art.crowd(ctx, cam.x, t, { y: 154, par: 0.5, color: '#251f38', rim: '#5a4460', seed: 33, gap: 2, hats: 0.35, cheer: mood.cheer });
      for (let i = 0; i < 40; i++) { // lots of petals
        const ph = i * 0.37, age = (t * (0.08 + (i % 5) * 0.015) + ph) % 1;
        const x = Math.round(((i * 41 + age * 160 + Math.sin(t * 1.3 + i) * 10 - cam.x * (0.4 + (i % 3) * 0.2)) % (VW + 20) + VW + 20) % (VW + 20)) - 10;
        R(ctx, i % 3 ? '#c07890' : '#e0a0b8', x, Math.round(age * VH), i % 4 ? 2 : 1, 1);
      }
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid') {
        R(ctx, '#8a5a3a', x, y, 16, 16);
        for (let k = 0; k < 4; k++) { const h = U.hash2(Math.floor(seed * 99) + k, y); R(ctx, k % 2 ? '#6e4430' : '#a87050', x + Math.floor(h * 13), y + 3 + k * 3 + Math.floor(h * 2), 3, 2); }
        if (e.t) {
          R(ctx, '#9ad070', x, y, 16, 1); R(ctx, '#6aa84a', x, y + 1, 16, 3); R(ctx, '#3e6a2e', x, y + 4, 16, 1);
          for (let i = 0; i < 16; i += 3) R(ctx, '#6aa84a', x + i, y + 5, 1, 1 + ((i + Math.floor(seed * 7)) % 2));
          R(ctx, '#ffb0c8', x + Math.floor(seed * 12) + 1, y + 1); R(ctx, '#ff90b0', x + ((Math.floor(seed * 37) % 14) + 1), y + 2);
        }
        edges(ctx, x, y, e, '#2a160e');
      } else if (art === 'alt') { // stone lantern block
        R(ctx, '#9a9494', x, y, 16, 16); R(ctx, '#b8b2b0', x, y, 16, 2); R(ctx, '#6a6466', x, y + 14, 16, 2);
        R(ctx, '#3a2a2a', x + 5, y + 5, 6, 5); R(ctx, '#ffb070', x + 6, y + 6, 4, 3);
        edges(ctx, x, y, e, '#2a2426');
      } else if (art === 'ice') {
        themes.viking.tile(ctx, x, y, 'ice', e, seed);
      } else { // red bridge plank
        R(ctx, '#ff6a5a', x, y, 16, 1); R(ctx, '#c8302a', x, y + 1, 16, 2); R(ctx, '#5a1418', x, y + 3, 16, 1);
        R(ctx, '#5a1418', x + 7, y + 4, 2, 4);
      }
    },
  };

  // ========== VIKING FJORD (frozen north under the aurora) ==========
  themes.viking = {
    id: 'viking', name: 'FJORD', bg: '#121826',
    signBoard: '#d8c8a8', signInk: '#2a1a10', signPost: '#4a3420',
    zone: { gravity: '#8a8aff', reverse: '#ff58c8' },
    build() {
      this.sky = ditherSky(['#0c101e', '#121a2c', '#1a243a', '#24304a', '#2e3c56', '#384860']);
      const sx = this.sky.getContext('2d'), rnd = U.rng(71);
      for (let i = 0; i < 60; i++) R(sx, '#5a6a88', Math.floor(rnd() * VW), Math.floor(rnd() * 100));
      this.far = KF.makeHi(640, VH);
      const f = this.far.getContext('2d');
      for (let x = 0; x < 640;) { // jagged snowy peaks
        const w = 50 + Math.floor(rnd() * 70), hgt = 50 + Math.floor(rnd() * 50), top = 150 - hgt;
        for (let i = 0; i < w; i++) {
          const yy = top + Math.abs(i - w / 2) * (hgt / (w / 2));
          R(f, '#26304a', x + i, yy, 1, 216 - yy);
          if (yy < top + 14) R(f, '#7a8aa8', x + i, yy, 1, 3);
        }
        x += Math.floor(w * 0.7);
      }
      this.mid = KF.makeHi(768, VH);
      const m = this.mid.getContext('2d');
      for (let x = 0; x < 768; x++) R(m, '#16203a', x, 150, 1, 8); // fjord water line
      this.halls = [];
      for (let x = 20; x < 768; x += 240 + Math.floor(rnd() * 60)) {
        // longship with a striped sail
        R(m, '#1a1420', x, 140, 70, 6); R(m, '#1a1420', x + 4, 146, 62, 3); R(m, '#1a1420', x - 4, 132, 6, 10); R(m, '#1a1420', x + 68, 132, 6, 10);
        R(m, '#1a1420', x + 33, 96, 2, 44);
        for (let k = 0; k < 7; k++) R(m, k % 2 ? '#4a2228' : '#5e5a5a', x + 18, 100 + k * 5, 32, 5);
        for (let k = 0; k < 6; k++) { m.fillStyle = k % 2 ? '#4a3a2a' : '#3a4a5a'; m.beginPath(); m.arc(x + 8 + k * 11, 140, 4, 0, 7); m.fill(); }
        // mead hall
        const hx = x + 120;
        R(m, '#1c1824', hx, 118, 60, 40); for (let i = 0; i < 40; i++) R(m, '#1c1824', hx - 6 + i * 1.8, 118 - Math.min(i, 40 - i) * 0.9, 2, 2);
        R(m, '#4a3420', hx + 26, 140, 8, 18);
        this.halls.push(hx);
      }
    },
    background(ctx, cam, t, mood) {
      KF.blit(ctx, this.sky, 0, 0);
      // Aurora: slow waving ribbons.
      for (let band = 0; band < 3; band++) {
        ctx.globalAlpha = 0.16 - band * 0.03;
        ctx.fillStyle = band === 1 ? '#5ad8b0' : '#4aa0c8';
        for (let x = 0; x < VW; x += 2) {
          const y = 28 + band * 14 + Math.sin(x * 0.02 + t * 0.6 + band) * 10 + Math.sin(x * 0.051 - t * 0.4) * 5;
          ctx.fillRect(x, Math.round(y), 2, 10 + Math.round(Math.sin(x * 0.03 + t + band) * 4 + 4));
        }
      }
      ctx.globalAlpha = 1;
      tiled(ctx, this.far, cam.x, 0.08);
      tiled(ctx, this.mid, cam.x, 0.25);
      for (const hx of this.halls) { // chimney smoke
        const x = Math.round(wrapX(hx + 30, cam.x, 0.25, 768)) + 24;
        if (x < -10 || x > VW + 10) continue;
        for (let k = 0; k < 4; k++) { const a = (t * 0.3 + k / 4) % 1; ctx.globalAlpha = 0.2 * (1 - a); R(ctx, '#8a90a0', x + Math.round(Math.sin(t + k) * 3 + a * 8), Math.round(100 - a * 40), 4 + a * 6, 3); }
        ctx.globalAlpha = 1;
      }
      R(ctx, '#10141f', 0, 152, VW, VH - 152);
      Art.crowd(ctx, cam.x, t, { y: 154, par: 0.5, color: '#181d2c', rim: '#4a5470', seed: 77, gap: 2, horns: true, cheer: mood.cheer });
      for (let i = 0; i < 45; i++) { // snowfall
        const age = (t * (0.06 + (i % 4) * 0.02) + i * 0.13) % 1;
        const x = Math.round(((i * 53 + Math.sin(t + i) * 8 - cam.x * (0.5 + (i % 3) * 0.2)) % (VW + 10) + VW + 10) % (VW + 10)) - 5;
        R(ctx, i % 3 ? '#a8b4c8' : '#e0e8f4', x, Math.round(age * VH), i % 5 ? 1 : 2, i % 5 ? 1 : 2);
      }
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid') {
        stone(ctx, x, y, 0, 16, seed, { base: '#6a7484', mortar: '#3e4656', hi: '#8a94a4', chip: '#555e6e' });
        if (seed > 0.85) { R(ctx, '#9aa8c0', x + 5, y + 7, 1, 6); R(ctx, '#9aa8c0', x + 5, y + 7, 4, 1); R(ctx, '#9aa8c0', x + 8, y + 10, 1, 3); } // rune
        if (e.t) {
          R(ctx, '#f4f8ff', x, y, 16, 2); R(ctx, '#c8d4e8', x, y + 2, 16, 2); R(ctx, '#8a9ab8', x, y + 4, 16, 1);
          R(ctx, '#c8d4e8', x + Math.floor(seed * 10) + 2, y + 5, 3, 1);
        }
        edges(ctx, x, y, e, '#1a1e2a');
      } else if (art === 'alt') { // shield wall: round shield on planks
        R(ctx, '#6a4426', x, y, 16, 16); R(ctx, '#4a2e18', x, y + 5, 16, 1); R(ctx, '#4a2e18', x, y + 10, 16, 1);
        ctx.fillStyle = '#1a1020'; ctx.beginPath(); ctx.arc(x + 8, y + 8, 7, 0, 7); ctx.fill();
        ctx.fillStyle = seed > 0.5 ? '#b83a2a' : '#2a5a9a'; ctx.beginPath(); ctx.arc(x + 8, y + 8, 6, 0, 7); ctx.fill();
        R(ctx, '#e8e0d0', x + 7, y + 2, 2, 12); R(ctx, '#e8e0d0', x + 2, y + 7, 12, 2); R(ctx, '#c8ccd6', x + 7, y + 7, 2, 2);
        edges(ctx, x, y, e, '#1a1020');
      } else if (art === 'ice') { // slippery ice: shiny pale blue with glints
        R(ctx, '#8ac8f0', x, y, 16, 16); R(ctx, '#b8e4ff', x, y, 16, 3); R(ctx, '#5a9ad0', x, y + 13, 16, 3);
        R(ctx, '#ffffff', x + 3 + Math.floor(seed * 6), y + 1, 4, 1); R(ctx, '#ffffff', x + 10, y + 6, 1, 3); R(ctx, '#d8f0ff', x + 4, y + 9, 2, 1);
        edges(ctx, x, y, e, '#1a2a4a');
      } else { // log plank
        R(ctx, '#b88050', x, y, 16, 1); R(ctx, '#8a5a30', x, y + 1, 16, 2); R(ctx, '#4a2e18', x, y + 3, 16, 1);
        R(ctx, '#e8eef8', x + 2, y, 5, 1);
      }
    },
  };

  KF.Themes = {
    add(id, theme) { themes[id] = theme; },
    get(id) {
      const th = themes[id] || themes.temple;
      if (!th.built) { th.build(); th.built = true; }
      return th;
    },
  };
})(window.KF);
