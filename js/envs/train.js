'use strict';
// Per-stage environments for the train realm. Every stage is a different place and medium:
// an 8-bit western railroad, a darkroom negative of a subway, a western on the big screen,
// a pop-art metro poster and a vector arcade cabinet.
(function (KF) {
  const { R, OUT, ditherSky, tiled, wrapX, edges } = KF.ThemeKit;
  const U = KF.util, VW = KF.VIEW_W, VH = KF.VIEW_H, F = () => KF.Font;

  // ---------- shared helpers ----------
  // Spike set in custom colours, same shape and lethal footprint as the default spikes.
  function makeSpikes(c) {
    const grid = [];
    for (let y = 0; y < 16; y++) {
      grid.push([]);
      for (let x = 0; x < 16; x++) {
        let col = null;
        const lx = x - (x < 8 ? 0 : 8);
        if (y >= 6) {
          const hw = Math.min(4, 1 + Math.floor((y - 6) / 2));
          if (lx >= 4 - hw && lx < 4 + hw) col = y === 6 ? c.tip : lx < 4 ? c.hi : c.lo;
        }
        if (y >= 14) col = y === 14 ? c.base : c.base2;
        grid[y].push(col);
      }
    }
    const map = { up: (x, y) => [x, y], down: (x, y) => [x, 15 - y], left: (x, y) => [y, x], right: (x, y) => [15 - y, x] };
    const out = {};
    for (const dir in map) {
      const cv = KF.makeHi(16, 16, c.res), ctx = cv.getContext('2d');
      grid.forEach((row, y) => row.forEach((col, x) => {
        const near = !col && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => grid[y + dy] && grid[y + dy][x + dx]);
        if (col || (near && c.out)) { const [nx, ny] = map[dir](x, y); R(ctx, col || c.out, nx, ny); }
      }));
      out[dir] = cv;
    }
    return out;
  }
  const lum = (d, o) => (d[o] * 77 + d[o + 1] * 150 + d[o + 2] * 29) >> 8;
  function sobel(d, W, H) {
    const n = W * H, L = new Uint8Array(n), E = new Uint8Array(n);
    for (let i = 0; i < n; i++) L[i] = lum(d, i * 4);
    for (let y = 1; y < H - 1; y++) for (let x = 1, i = y * W + 1; x < W - 1; x++, i++) {
      const a = L[i - W - 1], b = L[i - W], c = L[i - W + 1], l = L[i - 1], r = L[i + 1], e = L[i + W - 1], f = L[i + W], g = L[i + W + 1];
      const gx = c + 2 * r + g - a - 2 * l - e, gy = e + 2 * f + g - a - 2 * b - c;
      E[i] = Math.min(255, ((gx < 0 ? -gx : gx) + (gy < 0 ? -gy : gy)) >> 2);
    }
    return E;
  }
  // A hand-drawn-ish polygon: list of [x, y] points, filled.
  function poly(ctx, pts, fill) { ctx.fillStyle = fill; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill(); }
  // Text with a thick outline (comic lettering, title cards).
  function bold(ctx, text, x, y, col, out, s, align = 'center') {
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (dx || dy) F().draw(ctx, text, x + dx * Math.max(1, s / 2), y + dy * Math.max(1, s / 2), out, s, align);
    F().draw(ctx, text, x, y, col, s, align);
  }

  // =====================================================================
  // 1. 8-BIT: a wild-west railroad on a home console. Drawn on a 2px grid because the style
  //    mosaics everything to 2x2 blocks in the NES palette.
  // =====================================================================
  const NS = {
    blk: '#000000', wht: '#fcfcfc', lg: '#bcbcbc', dg: '#7c7c7c', sky: '#3cbcfc', sky2: '#a4e4fc',
    sand: '#fce0a8', dune: '#f0d0b0', org: '#fca044', rust: '#e45c10', brn: '#ac7c00', red: '#e40058',
    yel: '#f8b800', yel2: '#f8d878', grn: '#00a800', grn2: '#58d854', lav: '#d8b8f8', mesa: '#f87858',
  };
  function nesCactus(m, x, base, h, arms) {
    R(m, NS.blk, x - 2, base - h - 2, 8, h + 2);
    R(m, NS.grn, x, base - h, 4, h); R(m, NS.grn2, x, base - h, 2, h);
    for (const [side, ay, ah] of arms) {
      const ax = side < 0 ? x - 6 : x + 4;
      R(m, NS.blk, ax - 2, base - ay - 2, 8, 6); R(m, NS.grn, ax, base - ay, 6, 2);
      const ux = side < 0 ? ax : ax + 2;
      R(m, NS.blk, ux - 2, base - ay - ah - 2, 8, ah + 2); R(m, NS.grn, ux, base - ay - ah, 4, ah + 2); R(m, NS.grn2, ux, base - ay - ah, 2, ah);
    }
  }
  KF.Env.add('nes8bit', {
    name: 'WILD WEST 8-BIT', bg: NS.sky2,
    signBoard: NS.yel2, signShade: NS.org, signInk: NS.blk, signPost: NS.brn,
    zone: { gravity: '#9878f8', reverse: '#f878f8' },
    build() {
      const sky = (this.sky = KF.makeHi(VW, VH, 1)), s = sky.getContext('2d');
      R(s, NS.sky, 0, 0, VW, 56);
      for (let x = 0; x < VW; x += 4) { R(s, NS.sky2, x, 52, 2, 2); R(s, NS.sky2, x + 2, 54, 2, 2); R(s, NS.sky, x + 2, 58, 2, 2); }
      R(s, NS.sky2, 0, 56, VW, VH - 56);
      // Blocky sun with a ring.
      s.fillStyle = NS.yel2; s.beginPath(); s.arc(302, 40, 15, 0, 7); s.fill();
      s.fillStyle = NS.sand; s.beginPath(); s.arc(302, 40, 11, 0, 7); s.fill();
      // Clouds
      this.clouds = KF.makeHi(640, 80, 1);
      const c = this.clouds.getContext('2d'), rnd = U.rng(77);
      for (let k = 0; k < 6; k++) {
        const cx = k * 108 + Math.floor(rnd() * 40) * 2, cy = 10 + Math.floor(rnd() * 14) * 2;
        R(c, NS.wht, cx, cy + 4, 36, 8); R(c, NS.wht, cx + 6, cy, 16, 6); R(c, NS.wht, cx + 18, cy - 2, 10, 6); R(c, NS.lg, cx, cy + 10, 36, 2);
      }
      // Far lavender mesas.
      this.far = KF.makeHi(640, VH, 1);
      const f = this.far.getContext('2d');
      for (let x = 0; x < 640;) {
        const w = 40 + Math.floor(rnd() * 25) * 2, h = 18 + Math.floor(rnd() * 12) * 2;
        for (let k = 0; k < 6; k += 2) R(f, NS.lav, x + k, 150 - h + k, w - k * 2, h - k + 70);
        R(f, NS.lav, x + 6, 150 - h, w - 12, 2);
        x += w + Math.floor(rnd() * 10) * 2;
      }
      // Mid: red mesas and buttes with strata, plus the far railway line and its little train.
      this.mid = KF.makeHi(768, VH, 1);
      const m = this.mid.getContext('2d');
      for (let x = 0; x < 768;) {
        const butte = rnd() < 0.3, w = butte ? 16 + Math.floor(rnd() * 6) * 2 : 50 + Math.floor(rnd() * 30) * 2, h = butte ? 54 + Math.floor(rnd() * 12) * 2 : 26 + Math.floor(rnd() * 14) * 2;
        const top = 158 - h;
        R(m, NS.mesa, x, top, w, h + 60);
        R(m, NS.mesa, x - 4, top + 8, w + 8, h); R(m, NS.mesa, x - 8, top + 20, w + 16, h);
        for (let y = top + 6; y < 158; y += 10) R(m, NS.rust, x - (y > top + 20 ? 8 : y > top + 8 ? 4 : 0), y, w + (y > top + 20 ? 16 : y > top + 8 ? 8 : 0), 2);
        R(m, NS.org, x, top, w, 2);
        R(m, NS.rust, x + w - 4, top + 2, 4, h); // shadow side
        x += w + 18 + Math.floor(rnd() * 20) * 2;
      }
      R(m, NS.dune, 0, 156, 768, VH - 156);
      for (let x = 0; x < 768; x += 4) R(m, NS.brn, x, 158, 2, 2);
      R(m, NS.dg, 0, 156, 768, 2);
      // Near: desert floor, track, telegraph line, cacti, water tower.
      this.near = KF.makeHi(960, VH, 1);
      const n = this.near.getContext('2d');
      R(n, NS.sand, 0, 166, 960, VH - 166);
      for (let k = 0; k < 220; k++) R(n, rnd() < 0.5 ? NS.org : NS.dune, Math.floor(rnd() * 480) * 2, 170 + Math.floor(rnd() * 22) * 2, 2, 2);
      for (let x = 0; x < 960; x += 8) R(n, NS.brn, x, 176, 6, 4);
      R(n, NS.dg, 0, 174, 960, 2); R(n, NS.lg, 0, 174, 960, 1);
      for (let p = 40; p < 960; p += 160) {
        R(n, NS.brn, p, 104, 2, 72); R(n, NS.brn, p - 8, 108, 18, 2);
        R(n, NS.wht, p - 8, 106, 2, 2); R(n, NS.wht, p + 8, 106, 2, 2);
      }
      for (let x = 0; x < 960; x += 2) { const ph = ((x - 40 + 960) % 160) / 160; R(n, NS.blk, x, 108 + Math.round(Math.sin(ph * Math.PI) * 5) * 2 / 2, 2, 1); }
      // Water tower
      const wx = 520;
      for (const lx of [wx + 2, wx + 10, wx + 18, wx + 26]) R(n, NS.brn, lx, 130, 2, 46);
      R(n, NS.brn, wx, 150, 30, 2); R(n, NS.blk, wx - 2, 104, 34, 28);
      R(n, NS.brn, wx, 106, 30, 24); for (let y = 110; y < 130; y += 6) R(n, NS.rust, wx, y, 30, 2);
      R(n, NS.yel, wx + 2, 106, 4, 24);
      poly(n, [[wx - 4, 106], [wx + 15, 92], [wx + 34, 106]], NS.dg); R(n, NS.lg, wx + 12, 94, 6, 2);
      R(n, NS.dg, wx + 28, 118, 10, 2); R(n, NS.dg, wx + 36, 118, 2, 8);
      nesCactus(n, 130, 172, 30, [[-1, 12, 10], [1, 18, 8]]);
      nesCactus(n, 330, 170, 22, [[1, 8, 8]]);
      nesCactus(n, 700, 172, 36, [[-1, 16, 12], [1, 10, 10]]);
      nesCactus(n, 860, 170, 18, [[-1, 6, 6]]);
      for (const [rx, rw] of [[240, 14], [430, 10], [790, 18]]) { R(n, NS.blk, rx - 2, 166, rw + 4, 8); R(n, NS.dg, rx, 166, rw, 6); R(n, NS.lg, rx + 2, 166, rw - 6, 2); }
      // cow skull
      R(n, NS.wht, 620, 170, 6, 4); R(n, NS.wht, 616, 168, 4, 2); R(n, NS.wht, 626, 168, 4, 2); R(n, NS.blk, 622, 172, 2, 2);
      this.spikes = makeSpikes({ tip: NS.wht, hi: NS.wht, lo: NS.lg, base: NS.red, base2: NS.red, out: NS.blk, res: 1 });
    },
    background(ctx, cam, t, mood) {
      KF.blit(ctx, this.sky, 0, 0);
      tiled(ctx, this.clouds, cam.x + t * 6, 0.04, 6);
      tiled(ctx, this.far, cam.x, 0.08);
      tiled(ctx, this.mid, cam.x, 0.22);
      // The far train chugging along the horizon line.
      const tx = Math.round(wrapX(t * 18, cam.x, 0.22, 640) / 2) * 2, by = 156;
      if (tx > -80 && tx < VW + 40) {
        for (let k = 1; k <= 3; k++) { const cx = tx - k * 14; R(ctx, NS.blk, cx, by - 8, 12, 6); R(ctx, NS.brn, cx + 2, by - 8, 8, 2); }
        R(ctx, NS.blk, tx, by - 12, 18, 10); R(ctx, NS.red, tx + 2, by - 12, 6, 4); R(ctx, NS.blk, tx + 12, by - 16, 4, 4); R(ctx, NS.dg, tx + 16, by - 4, 4, 2);
        const big = mood.cheer > 0.3 ? 2 : 1;
        for (let k = 0; k < 5; k++) {
          const a = (t * 1.2 + k / 5) % 1, sz = Math.round((2 + a * 6 * big) / 2) * 2;
          R(ctx, a < 0.6 ? NS.wht : NS.lg, Math.round((tx + 12 - a * 26) / 2) * 2, Math.round((by - 18 - a * 22 * big) / 2) * 2, sz, sz);
        }
      }
      tiled(ctx, this.near, cam.x, 0.45);
      // Vultures circling, faster when the crowd (you dying) gets lively.
      for (let k = 0; k < 2; k++) {
        const sp = 0.6 + mood.cheer * 1.5, a = t * sp + k * 3, x = Math.round((120 + k * 150 + Math.cos(a) * 30) / 2) * 2, y = Math.round((40 + k * 10 + Math.sin(a) * 8) / 2) * 2;
        const up = Math.floor(t * 4 + k) % 2;
        R(ctx, NS.blk, x - 6, y + (up ? -2 : 0), 4, 2); R(ctx, NS.blk, x - 2, y, 4, 2); R(ctx, NS.blk, x + 2, y + (up ? -2 : 0), 4, 2);
      }
      // Tumbleweed bouncing past.
      const tw = (t % 9) / 9, twx = Math.round((VW + 20 - tw * (VW + 60)) / 2) * 2, twy = 160 - Math.round(Math.abs(Math.sin(tw * 30)) * 5) * 2;
      const rot = Math.floor(t * 8) % 2;
      R(ctx, NS.brn, twx + 2, twy, 6, 2); R(ctx, NS.brn, twx + 2, twy + 8, 6, 2); R(ctx, NS.brn, twx, twy + 2, 2, 6); R(ctx, NS.brn, twx + 8, twy + 2, 2, 6);
      R(ctx, NS.yel, rot ? twx + 2 : twx + 4, twy + 4, 4, 2); R(ctx, NS.brn, rot ? twx + 4 : twx + 2, twy + 2, 2, 6);
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid') { // sandstone blocks
        const deep = (e.d || 0) >= 2;
        R(ctx, deep ? NS.brn : NS.rust, x, y, 16, 16);
        const off = (e.d || 0) % 2 ? 4 : 0;
        R(ctx, deep ? NS.blk : NS.brn, x, y + 6, 16, 2); R(ctx, deep ? NS.blk : NS.brn, x, y + 14, 16, 2);
        R(ctx, deep ? NS.blk : NS.brn, x + ((off + 6) % 16), y, 2, 6); R(ctx, deep ? NS.blk : NS.brn, x + ((off + 12) % 16), y + 8, 2, 6);
        if (!deep) { R(ctx, NS.org, x, y, 6, 2); R(ctx, NS.org, x + 8, y + 8, 4, 2); }
        if (e.t) { R(ctx, NS.yel2, x, y, 16, 2); R(ctx, NS.org, x, y + 2, 16, 2); if (seed > 0.7) { R(ctx, NS.grn, x + 4, y - 2, 2, 2); R(ctx, NS.grn2, x + 6, y - 4, 2, 4); } }
        if (e.l) R(ctx, NS.blk, x, y, 2, 16);
        if (e.r) R(ctx, NS.blk, x + 14, y, 2, 16);
        if (e.b) R(ctx, NS.blk, x, y + 14, 16, 2);
      } else if (art === 'alt') { // red boxcar
        R(ctx, NS.red, x, y, 16, 16);
        R(ctx, NS.blk, x + 4, y + 2, 2, 12); R(ctx, NS.blk, x + 10, y + 2, 2, 12);
        R(ctx, NS.wht, x + 6, y + 8, 4, 2);
        if (e.t) { R(ctx, NS.dg, x, y, 16, 4); R(ctx, NS.lg, x, y, 16, 2); }
        if (e.b) { R(ctx, NS.blk, x, y + 12, 16, 4); R(ctx, NS.dg, x + 2, y + 12, 4, 4); R(ctx, NS.dg, x + 10, y + 12, 4, 4); }
        if (e.l) R(ctx, NS.blk, x, y, 2, 16);
        if (e.r) R(ctx, NS.blk, x + 14, y, 2, 16);
      } else if (art === 'ice') {
        R(ctx, NS.sky, x, y, 16, 16); R(ctx, NS.sky2, x, y, 16, 4); R(ctx, NS.wht, x + 2, y + 6, 4, 2); R(ctx, NS.wht, x + 2, y + 8, 2, 2);
        edges(ctx, x, y, e, NS.blk);
      } else { // plank
        R(ctx, NS.blk, x, y, 16, 6); R(ctx, NS.yel, x, y, 16, 2); R(ctx, NS.brn, x, y + 2, 16, 2);
        R(ctx, NS.blk, x + 2, y + 2, 2, 2); R(ctx, NS.blk, x + 12, y + 2, 2, 2);
      }
    },
    spike(ctx, x, y, dir) { KF.blit(ctx, this.spikes[dir], x, y); },
  });

  // =====================================================================
  // 2. NEGATIVE: a photo of a busy subway platform, seen as a strip of film negative.
  //    Everything is drawn as a normal positive photo; the style inverts it. So dark here
  //    becomes bright on screen, and the tiled wall goes dark behind bright platforms.
  // =====================================================================
  const NG = { tile: '#e6e4da', grout: '#a8a69c', ceil: '#2a2c30', tube: '#fffff4', band: '#1a3a7a', pit: '#b4b2aa', person: '#26262c' };
  KF.Env.add('negative', {
    name: 'SUBWAY NEGATIVE', bg: NG.tile,
    signBoard: '#f4f0e0', signShade: '#c8c0a8', signInk: '#101018', signPost: '#202024',
    zone: { gravity: '#65951a', reverse: '#00b043' }, // inverted: purple / pink on screen
    build() {
      const rnd = U.rng(303);
      this.wall = KF.makeHi(512, VH);
      const w = this.wall.getContext('2d');
      R(w, NG.grout, 0, 0, 512, VH);
      for (let y = 24, k = 0; y < 158; y += 4, k++) for (let x = (k % 2) * 4 - 4; x < 512; x += 8) {
        R(w, rnd() < 0.04 ? '#d0cec4' : NG.tile, x + 0.5, y + 0.5, 7, 3); R(w, '#f8f6ee', x + 0.5, y + 0.5, 7, 0.5);
      }
      R(w, NG.band, 0, 62, 512, 8); R(w, '#0a1a3a', 0, 70, 512, 1); R(w, '#4a6aaa', 0, 62, 512, 1);
      R(w, NG.band, 0, 150, 512, 4);
      // Ceiling with fluorescent tubes.
      R(w, NG.ceil, 0, 0, 512, 22); R(w, '#14161a', 0, 22, 512, 2);
      for (let x = 20; x < 512; x += 64) { R(w, '#5a5c60', x - 2, 12, 44, 5); R(w, NG.tube, x, 13, 40, 3); }
      // Station name panels and posters.
      for (const px of [40, 296]) {
        R(w, '#101012', px, 34, 104, 20); R(w, '#f4f4f0', px + 1, 35, 102, 0.5);
        F().draw(w, 'SKY EXPRESS', px + 52, 41, '#f4f4f0', 1, 'center');
      }
      for (const [px, col] of [[170, '#a03030'], [430, '#306a40']]) {
        R(w, '#18181a', px - 1, 80, 46, 58); R(w, col, px, 81, 44, 56); R(w, '#f0e8d0', px + 4, 85, 36, 24);
        R(w, '#18181a', px + 10, 90, 16, 14); F().draw(w, 'RIDE', px + 22, 114, '#f0e8d0', 1, 'center'); F().draw(w, 'NOW', px + 22, 124, '#f0e8d0', 1, 'center');
      }
      // Track pit below the platform line.
      this.pit = KF.makeHi(256, VH - 154);
      const p = this.pit.getContext('2d');
      R(p, NG.pit, 0, 0, 256, VH); R(p, '#8a8882', 0, 0, 256, 3);
      for (let x = 0; x < 256; x += 12) R(p, '#9a988f', x, 30, 8, 4);
      R(p, '#5a5a60', 0, 26, 256, 2); R(p, '#5a5a60', 0, 40, 256, 2);
      // Commuters waiting on the far platform: hats, papers, briefcases.
      this.people = [];
      for (let k = 0; k < 22; k++) this.people.push({ x: k * 34 + Math.floor(rnd() * 20), h: 20 + Math.floor(rnd() * 6), hat: rnd() < 0.4, paper: rnd() < 0.25, bag: rnd() < 0.3, ph: rnd() * 6 });
      this.spikes = makeSpikes({ tip: '#000010', hi: '#1a2440', lo: '#3a4a70', base: '#00c0c8', base2: '#00a0a8', out: '#e8f0ff' });
    },
    background(ctx, cam, t, mood) {
      tiled(ctx, this.wall, cam.x, 0.35);
      // A train rushing through behind the commuters every few seconds.
      const cyc = t % 8;
      if (cyc < 2.2) {
        const x0 = Math.round(VW + 40 - cyc * 900);
        for (let k = 0; k < 6; k++) {
          const cx = x0 + k * 130;
          if (cx > VW || cx < -130) continue;
          R(ctx, '#0c0c0e', cx, 96, 126, 56); R(ctx, '#c4c8cc', cx + 1, 97, 124, 54);
          R(ctx, '#e8ecf0', cx + 1, 97, 124, 3); R(ctx, NG.band, cx + 1, 130, 124, 4);
          for (let wx = 8; wx < 116; wx += 20) { R(ctx, '#1a1c20', cx + wx, 104, 14, 20); R(ctx, '#3a3c40', cx + wx + 2, 116, 4, 8); }
        }
      }
      const span = 760;
      for (const pp of this.people) {
        const x = Math.round(wrapX(pp.x, cam.x, 0.5, span));
        if (x < -12 || x > VW + 12) continue;
        const jump = mood.cheer > 0 ? Math.abs(Math.sin(t * 10 + pp.ph)) * 3 * Math.min(1, mood.cheer) : 0;
        const by = 152 - jump, top = by - pp.h, sway = Math.round(Math.sin(t * 1.3 + pp.ph) * 0.6);
        R(ctx, NG.person, x + sway + 1, top, 5, 5); // head
        R(ctx, NG.person, x, top + 5, 7, pp.h - 12); // coat
        R(ctx, NG.person, x + 1, by - 7, 2, 7); R(ctx, NG.person, x + 4, by - 7, 2, 7);
        if (pp.hat) { R(ctx, NG.person, x - 1 + sway, top - 1, 9, 1); R(ctx, NG.person, x + 1 + sway, top - 3, 5, 2); }
        if (pp.paper) { R(ctx, '#d8d4c4', x + 5, top + 6, 6, 7); R(ctx, '#8a8678', x + 6, top + 8, 4, 0.5); }
        if (pp.bag) R(ctx, NG.person, x + 7, by - 10, 4, 4);
        if (mood.cheer > 0.5) { R(ctx, NG.person, x - 2, top + 1, 1, 5); R(ctx, NG.person, x + 8, top + 1, 1, 5); }
      }
      R(ctx, '#3a3a3e', 0, 152, VW, 2); // far platform edge
      tiled(ctx, this.pit, cam.x, 0.6, 154);
      // The station clock, hands keep real-ish time.
      const ccx = Math.round(wrapX(236, cam.x, 0.35, 512)) + 24, CY = 96;
      if (ccx > -20 && ccx < VW + 20) {
        R(ctx, '#18181a', ccx - 1, 70, 2, CY - 82);
        ctx.fillStyle = '#18181a'; ctx.beginPath(); ctx.arc(ccx, CY, 13, 0, 7); ctx.fill();
        ctx.fillStyle = '#f8f8f4'; ctx.beginPath(); ctx.arc(ccx, CY, 11, 0, 7); ctx.fill();
        for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283; R(ctx, '#18181a', ccx + Math.cos(a) * 9 - 0.5, CY + Math.sin(a) * 9 - 0.5, 1, 1); }
        ctx.strokeStyle = '#18181a'; ctx.lineWidth = 1; ctx.beginPath();
        const mA = t * 0.5 - 1.57, hA = t * 0.04 - 1.57;
        ctx.moveTo(ccx, CY); ctx.lineTo(ccx + Math.cos(mA) * 8, CY + Math.sin(mA) * 8);
        ctx.moveTo(ccx, CY); ctx.lineTo(ccx + Math.cos(hA) * 5, CY + Math.sin(hA) * 5); ctx.stroke();
        ctx.strokeStyle = '#c02020'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(ccx, CY); const sA = Math.floor(t) / 60 * 6.283 - 1.57; ctx.lineTo(ccx + Math.cos(sA) * 9, CY + Math.sin(sA) * 9); ctx.stroke();
      }
      // Steel pillars in front of the wall.
      for (let k = 0; k < 4; k++) {
        const x = Math.round(wrapX(k * 160, cam.x, 0.55, 640));
        if (x < -10 || x > VW) continue;
        R(ctx, '#3a3e44', x, 22, 8, 130); R(ctx, '#6a6e74', x + 1, 22, 1, 130); R(ctx, '#2a2c30', x - 2, 22, 12, 3); R(ctx, '#2a2c30', x - 2, 148, 12, 4);
      }
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid') { // concrete platform with the yellow tactile strip on top
        const d = e.d || 0;
        R(ctx, d >= 2 ? '#2e3034' : '#505256', x, y, 16, 16);
        if (d < 2) { R(ctx, '#45474b', x, y + 8, 16, 1); if (seed > 0.5) R(ctx, '#3c3e42', x + Math.floor(seed * 12), y + 11, 2, 1); R(ctx, '#5c5e62', x + Math.floor(seed * 9) + 3, y + 5, 1, 1); }
        else { R(ctx, '#3a3c40', x + 3, y + 4, 2, 2); R(ctx, '#3a3c40', x + 11, y + 10, 2, 2); }
        if (e.t) {
          R(ctx, '#e8c820', x, y, 16, 3); R(ctx, '#f8e070', x, y, 16, 1);
          for (let i = 1; i < 16; i += 3) R(ctx, '#a88c10', x + i, y + 1, 1, 1);
          R(ctx, '#18181a', x, y + 3, 16, 1);
        }
        edges(ctx, x, y, e, '#101012');
      } else if (art === 'alt') { // red vending machine
        R(ctx, '#a82424', x, y, 16, 16); R(ctx, '#d04040', x + 1, y + 1, 1, 14);
        R(ctx, '#1a1a1e', x + 3, y + 3, 7, 8); R(ctx, '#e8e8d8', x + 4, y + 4, 2, 2); R(ctx, '#e8d840', x + 7, y + 4, 2, 2); R(ctx, '#e8e8d8', x + 4, y + 7, 2, 2);
        R(ctx, '#e8e8d8', x + 12, y + 4, 2, 4); R(ctx, '#1a1a1e', x + 3, y + 12, 10, 2);
        edges(ctx, x, y, { ...e, t: true }, '#101012'); if (e.t) R(ctx, '#101012', x, y, 16, 1);
      } else if (art === 'ice') { // wet floor
        R(ctx, '#7aa0c4', x, y, 16, 16); R(ctx, '#c0d8f0', x, y, 16, 2); R(ctx, '#e8f0ff', x + 3, y + 5, 5, 1);
        edges(ctx, x, y, e, '#101012');
      } else { // steel grating
        R(ctx, '#18181a', x, y, 16, 4); R(ctx, '#6a6c70', x, y, 16, 1);
        for (let i = 1; i < 16; i += 3) R(ctx, '#4a4c50', x + i, y + 1, 2, 2);
      }
    },
    spike(ctx, x, y, dir) { KF.blit(ctx, this.spikes[dir], x, y); },
  }, {
    // Invert with an orange film-base cast, like a real colour negative.
    post(d, W, H) {
      for (let k = 0, n = W * H * 4; k < n; k += 4) {
        d[k] = (255 - d[k]) * 0.94 + 14; d[k + 1] = (255 - d[k + 1]) * 0.8 + 10; d[k + 2] = (255 - d[k + 2]) * 0.66 + 6;
      }
    },
    // Film strip edges: sprocket holes down both sides, edge print at the bottom.
    under(ctx, i) {
      const off = (i.t * 24) % 12;
      for (const sx of [0, VW - 9]) {
        R(ctx, '#2a1406', sx, 0, 9, VH); R(ctx, '#4a2810', sx + (sx ? 0 : 8), 0, 1, VH);
        for (let y = -12 + off; y < VH; y += 12) { R(ctx, '#f0c890', sx + 2, y, 5, 6); R(ctx, '#ffe8c0', sx + 2, y, 5, 1); }
      }
      F().draw(ctx, `SKY 400  ${String(12 + Math.floor(i.t / 4) % 24).padStart(2, '0')}A >`, 14, VH - 9, 'rgba(255,150,60,0.85)');
    },
  });

  // =====================================================================
  // 3. CINEMASCOPE: a western train robbery on the big screen. You are on top of the carriages;
  //    the cinema audience's heads sit along the bottom and react when you die.
  // =====================================================================
  KF.Env.add('cinema', {
    name: 'WESTERN', bg: '#2a1a2a',
    signBoard: '#e8d0a0', signShade: '#b89868', signInk: '#3a1a10', signPost: '#4a2a18',
    zone: { gravity: '#9a7aff', reverse: '#ff58c8' },
    build() {
      const rnd = U.rng(909);
      this.sky = ditherSky(['#2a1830', '#4a2240', '#7a3044', '#b0443c', '#d86a3a', '#f09a48', '#f8c068', '#f8d890']);
      const s = this.sky.getContext('2d');
      s.globalAlpha = 0.25; s.fillStyle = '#fff0c0'; s.beginPath(); s.arc(250, 132, 44, 0, 7); s.fill(); s.globalAlpha = 1;
      s.fillStyle = '#fff4c8'; s.beginPath(); s.arc(250, 132, 26, 0, 7); s.fill();
      for (let k = 0; k < 5; k++) { s.globalAlpha = 0.5; R(s, '#c05048', 120 + k * 40, 70 + k * 9, 120 + rnd() * 80, 1); } s.globalAlpha = 1;
      // Far mesas
      this.far = KF.makeHi(640, VH);
      const f = this.far.getContext('2d');
      for (let x = 0; x < 640;) {
        const w = 50 + rnd() * 70, h = 24 + rnd() * 34;
        poly(f, [[x, 160], [x + 6, 150 - h], [x + w - 6, 150 - h], [x + w, 160]], '#6a2a3c');
        R(f, '#7a3444', x + 6, 150 - h, w - 12, 1);
        x += w + 10 + rnd() * 30;
      }
      R(f, '#6a2a3c', 0, 158, 640, VH);
      // Canyon walls + trestle bridge.
      this.mid = KF.makeHi(900, VH);
      const m = this.mid.getContext('2d');
      const wall = (x0, w, top, dir) => {
        const pts = [[x0, VH]];
        for (let k = 0; k <= 8; k++) pts.push([x0 + (dir > 0 ? k / 8 * w : (1 - k / 8) * w) + rnd() * 6, top + (k % 2) * 6 + k * 4 * (dir > 0 ? 1 : 1)]);
        pts.push([x0 + (dir > 0 ? w : 0), VH]);
        poly(m, pts, '#7a2e28');
        for (let y = top + 8; y < VH; y += 9) { m.globalAlpha = 0.6; R(m, y % 2 ? '#963a2e' : '#5a2020', x0, y, w, 2); }
        m.globalAlpha = 1;
      };
      poly(m, [[0, VH], [0, 70], [30, 66], [60, 76], [90, 74], [118, 96], [130, 130], [140, VH]], '#7a2e28');
      poly(m, [[620, VH], [636, 120], [650, 90], [690, 72], [740, 74], [800, 64], [860, 70], [900, 68], [900, VH]], '#7a2e28');
      for (let y = 72; y < VH; y += 8) {
        m.globalAlpha = 0.55; m.fillStyle = (y / 8) % 2 ? '#9a4232' : '#5a1e1e';
        m.fillRect(0, y, 140 - Math.max(0, 130 - y) * 0.5, 2); m.fillRect(640 + Math.max(0, 120 - y) * 0.3, y, 260, 2);
      }
      m.globalAlpha = 1;
      wall; // (helper kept for symmetry)
      // Trestle bridge across the gorge.
      R(m, '#2a1418', 110, 108, 560, 4); R(m, '#4a2420', 110, 108, 560, 1);
      m.strokeStyle = '#2a1418'; m.lineWidth = 1;
      m.beginPath();
      for (let x = 120; x < 660; x += 20) {
        m.moveTo(x, 112); m.lineTo(x + 20, 172); m.moveTo(x + 20, 112); m.lineTo(x, 172);
        m.moveTo(x, 112); m.lineTo(x, 172);
      }
      for (let y = 130; y < 175; y += 20) { m.moveTo(120, y); m.lineTo(660, y); }
      m.stroke();
      // Canyon floor
      this.floor = KF.makeHi(700, VH);
      const fl = this.floor.getContext('2d');
      R(fl, '#4a2024', 0, 168, 700, VH); R(fl, '#6a2e2a', 0, 168, 700, 1);
      for (let k = 0; k < 40; k++) { const x = rnd() * 700, y = 172 + rnd() * 30; R(fl, '#3a2a1e', x, y, 3, 2); R(fl, '#5a5a2e', x + 1, y - 1, 1, 1); }
      for (const cx of [80, 360, 560]) { R(fl, '#2a1818', cx, 140, 4, 30); R(fl, '#2a1818', cx - 6, 150, 6, 3); R(fl, '#2a1818', cx - 6, 142, 3, 9); R(fl, '#2a1818', cx + 4, 146, 6, 3); R(fl, '#2a1818', cx + 8, 138, 3, 10); }
    },
    background(ctx, cam, t, mood) {
      KF.blit(ctx, this.sky, 0, 0);
      tiled(ctx, this.far, cam.x, 0.06);
      tiled(ctx, this.mid, cam.x, 0.18);
      // The train crossing the trestle, smoke trailing.
      const lx = 110 + ((t * 22) % 620), sx = Math.round(wrapX(lx, cam.x, 0.18, 900)) + 24;
      for (let k = 0; k < 7; k++) {
        const cx = sx - 14 - k * 16;
        if (cx < -20 || cx > VW + 20) continue;
        R(ctx, '#1e0e12', cx, 98, 14, 10); R(ctx, '#3a1c1c', cx + 1, 97, 12, 1);
        for (let w = 2; w < 12; w += 4) R(ctx, '#f8b860', cx + w, 101, 2, 2);
      }
      R(ctx, '#1e0e12', sx, 96, 18, 12); R(ctx, '#1e0e12', sx + 12, 88, 4, 8); R(ctx, '#1e0e12', sx + 2, 92, 7, 4); poly(ctx, [[sx + 18, 108], [sx + 24, 108], [sx + 18, 101]], '#1e0e12');
      for (let k = 0; k < 8; k++) {
        const a = (t * 0.7 + k / 8) % 1;
        ctx.globalAlpha = 0.5 * (1 - a); ctx.fillStyle = '#e8c8b0';
        ctx.beginPath(); ctx.arc(sx + 14 - a * 50, 86 - a * 30, 2 + a * 9, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;
      tiled(ctx, this.floor, cam.x, 0.32);
      // Riders galloping along the canyon floor after the train, kicking up dust.
      for (let k = 0; k < 3; k++) {
        const rx = Math.round(wrapX(200 + k * 46 + Math.sin(t * 0.8 + k) * 16 + t * 30, cam.x, 0.32, 700)) + 24, ry = 178 + k * 3;
        if (rx < -30 || rx > VW + 30) continue;
        for (let p = 0; p < 4; p++) { const a = (t * 2 + p / 4 + k * 0.3) % 1; ctx.globalAlpha = 0.35 * (1 - a); ctx.fillStyle = '#c89878'; ctx.beginPath(); ctx.arc(rx - 6 - a * 24, ry - 2 - a * 6, 2 + a * 6, 0, 7); ctx.fill(); }
        ctx.globalAlpha = 1;
        const g = Math.floor(t * 10 + k) % 2, c = '#1a0c10';
        R(ctx, c, rx, ry - 8, 14, 5); R(ctx, c, rx + 12, ry - 12, 4, 6); R(ctx, c, rx + 15, ry - 11, 3, 3); // horse
        R(ctx, c, rx + (g ? 0 : 2), ry - 3, 1, 4); R(ctx, c, rx + (g ? 3 : 1), ry - 3, 1, 4); R(ctx, c, rx + (g ? 10 : 12), ry - 3, 1, 4); R(ctx, c, rx + (g ? 13 : 11), ry - 3, 1, 4);
        R(ctx, c, rx - 2, ry - 9, 3, 2); // tail
        R(ctx, c, rx + 5, ry - 15, 3, 7); R(ctx, c, rx + 5, ry - 18, 3, 3); R(ctx, c, rx + 3, ry - 18, 7, 1); R(ctx, c, rx + 5, ry - 19, 3, 1); // rider + hat
        if (mood.cheer > 0.4) R(ctx, c, rx + 8, ry - 20, 1, 5); // waving
      }
      // Drifting dust haze in the foreground.
      ctx.globalAlpha = 0.12; ctx.fillStyle = '#f0c090';
      for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(((k * 140 - t * 12 - cam.x * 0.4) % (VW + 140) + VW + 140) % (VW + 140) - 70, 150 + k * 9, 40, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1;
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid') { // the robbed train: plank roof, red carriage, iron undercarriage
        const d = e.d || 0;
        if (e.t || d === 0) {
          R(ctx, '#e8b878', x, y, 16, 1); R(ctx, '#b07a48', x, y + 1, 16, 3); R(ctx, '#5a3418', x, y + 4, 16, 1);
          for (let i = 3; i < 16; i += 5) R(ctx, '#7a4a28', x + i, y + 1, 1, 3);
          R(ctx, '#7a2420', x, y + 5, 16, 11); R(ctx, '#d8a040', x, y + 6, 16, 1); R(ctx, '#5a1814', x, y + 15, 16, 1);
        } else if (d === 1) {
          R(ctx, '#7a2420', x, y, 16, 16);
          R(ctx, '#2a0e0a', x + 3, y + 2, 10, 8); R(ctx, seed > 0.4 ? '#f8c070' : '#a86838', x + 4, y + 3, 8, 6); R(ctx, '#2a0e0a', x + 7, y + 3, 1, 6);
          R(ctx, '#d8a040', x, y + 12, 16, 1); R(ctx, '#5a1814', x, y + 13, 16, 3);
        } else if (d === 2) {
          R(ctx, '#5a1814', x, y, 16, 16); R(ctx, '#7a2420', x, y, 16, 2);
          if (seed > 0.5) { R(ctx, '#d8a040', x + 6, y + 5, 4, 4); R(ctx, '#5a1814', x + 7, y + 6, 2, 2); }
        } else {
          R(ctx, '#1e1418', x, y, 16, 16); R(ctx, '#3a2a28', x, y, 16, 2);
          R(ctx, '#0c0808', x + 3, y + 4, 10, 10); R(ctx, '#6a5a50', x + 5, y + 6, 6, 6); R(ctx, '#0c0808', x + 7, y + 8, 2, 2);
        }
        edges(ctx, x, y, e, '#1a0a08');
      } else if (art === 'alt') { // strongbox
        R(ctx, '#8a5a2a', x, y, 16, 16); R(ctx, '#a87038', x + 1, y + 1, 14, 2);
        R(ctx, '#3a3438', x + 3, y, 2, 16); R(ctx, '#3a3438', x + 11, y, 2, 16); R(ctx, '#3a3438', x, y + 6, 16, 2);
        R(ctx, '#f0c040', x + 7, y + 8, 2, 3); R(ctx, '#5a3418', x + 7, y + 10, 2, 1);
        edges(ctx, x, y, { ...e, t: true }, '#1a0a08');
      } else if (art === 'ice') { // water tank tin
        R(ctx, '#7a9ab0', x, y, 16, 16); R(ctx, '#b8d0e0', x, y, 16, 2); R(ctx, '#e8f4ff', x + 3, y + 5, 4, 1);
        edges(ctx, x, y, e, '#1a1418');
      } else { // catwalk plank
        R(ctx, '#e0b070', x, y, 16, 1); R(ctx, '#a06a3a', x, y + 1, 16, 2); R(ctx, '#3a1c0e', x, y + 3, 16, 1);
        R(ctx, '#3a1c0e', x + 2, y + 4, 1, 3); R(ctx, '#3a1c0e', x + 13, y + 4, 1, 3);
      }
    },
  }, {
    // Letterbox bars, with the audience in the bottom one. They bounce when you die.
    under(ctx, i) {
      R(ctx, '#000', 0, 0, VW, 20); R(ctx, '#000', 0, VH - 20, VW, 20);
      const sc = KF.engine && KF.engine.scene, cheer = Math.min(1, (sc && sc.mood && sc.mood.cheer) || 0);
      for (let k = 0; k < 30; k++) {
        const hx = k * 13.5 + ((k * 7) % 5) - 2, tall = (k * 5) % 7 === 0;
        const jump = cheer > 0.05 ? Math.abs(Math.sin(i.t * 9 + k * 1.7)) * 6 * cheer : 0;
        const hy = VH - 12 - (tall ? 4 : (k % 3)) - jump;
        ctx.fillStyle = '#120e10';
        ctx.beginPath(); ctx.arc(hx, hy, 5, 0, 7); ctx.fill();
        ctx.fillRect(hx - 8, hy + 4, 16, 12);
        if (k % 6 === 2) { ctx.fillRect(hx - 8, hy - 5, 16, 2); ctx.fillRect(hx - 4, hy - 9, 8, 5); } // cowboy hat
        if (k % 9 === 4) { ctx.beginPath(); ctx.arc(hx, hy - 4, 5, 0, 7); ctx.fill(); } // big hair
        ctx.fillStyle = 'rgba(255,200,140,0.18)'; ctx.fillRect(hx - 3, hy - 5 - (k % 6 === 2 ? 4 : 0), 6, 1); // screen light on the head
        if (cheer > 0.5 && k % 4 === 1) { ctx.fillStyle = '#120e10'; ctx.fillRect(hx - 9, hy - 8, 2, 10); ctx.fillRect(hx + 7, hy - 8, 2, 10); }
      }
      if (i.rnd() < 0.05) { ctx.fillStyle = 'rgba(255,240,200,0.04)'; ctx.fillRect(0, 20, VW, VH - 40); }
    },
  });

  // =====================================================================
  // 4. POP ART: a giant comic-poster on the metro wall. Flat bold colour, black ink and Ben-Day
  //    dots. Light pink and light blue turn into dot screens in the style's pass.
  // =====================================================================
  const PA = { ink: '#0a0a0e', white: '#f8f6ec', red: '#e61e28', yel: '#ffd600', blue: '#005ac8', pink: '#ff96aa', sky: '#78bef0' };
  let popLUT = null;
  function popPalette() {
    const pal = [[10, 10, 14], [248, 246, 236], [230, 30, 40], [255, 214, 0], [0, 90, 200], [255, 150, 170], [120, 190, 240]];
    popLUT = new Uint8Array(32768);
    for (let i = 0; i < 32768; i++) {
      const r = (i >> 10) << 3, g = ((i >> 5) & 31) << 3, b = (i & 31) << 3;
      let best = 0, bd = 1e9;
      pal.forEach((c, k) => { const dd = (c[0] - r) ** 2 * 0.35 + (c[1] - g) ** 2 * 0.5 + (c[2] - b) ** 2 * 0.25; if (dd < bd) { bd = dd; best = k; } });
      popLUT[i] = best;
    }
    return pal;
  }
  let POP = null;
  KF.Env.add('popart', {
    name: 'POP ART METRO', bg: PA.white,
    signBoard: PA.white, signShade: PA.yel, signInk: PA.ink, signPost: PA.ink,
    zone: { gravity: PA.blue, reverse: PA.red },
    build() {
      const P = (this.panels = KF.makeHi(780, VH)), c = P.getContext('2d');
      R(c, PA.white, 0, 0, 780, VH); R(c, PA.blue, 0, 0, 780, 34); R(c, PA.ink, 0, 34, 780, 2);
      const panel = (x, y, w, h, fill) => { R(c, PA.ink, x - 2, y - 2, w + 4, h + 4); R(c, fill, x, y, w, h); };
      // Panel A: the crying commuter.
      panel(8, 42, 240, 112, PA.sky);
      c.save(); c.beginPath(); c.rect(8, 42, 240, 112); c.clip();
      c.translate(128, 98); c.scale(0.8, 0.8); c.translate(-128, -84);
      poly(c, [[40, 170], [50, 120], [90, 104], [150, 108], [196, 130], [210, 170]], PA.blue); // shoulders
      c.fillStyle = PA.yel; c.beginPath(); c.ellipse(124, 78, 56, 52, 0, 0, 7); c.fill(); // hair
      c.fillStyle = PA.pink; c.beginPath(); c.ellipse(130, 84, 34, 40, 0.1, 0, 7); c.fill(); // face
      c.strokeStyle = PA.ink; c.lineWidth = 2; c.stroke();
      c.fillStyle = PA.yel; c.beginPath(); c.ellipse(118, 50, 44, 18, -0.2, 0, 7); c.fill(); // fringe
      c.lineWidth = 1.5; c.beginPath(); c.moveTo(80, 46); c.quadraticCurveTo(120, 30, 160, 50); c.stroke();
      for (const ex of [114, 146]) { // eyes, brows
        c.fillStyle = PA.white; c.beginPath(); c.ellipse(ex, 80, 7, 4, 0, 0, 7); c.fill(); c.lineWidth = 1.5; c.stroke();
        c.fillStyle = PA.blue; c.beginPath(); c.arc(ex + 1, 81, 2.5, 0, 7); c.fill();
        c.beginPath(); c.moveTo(ex - 8, 70); c.quadraticCurveTo(ex, ex < 130 ? 66 : 64, ex + 8, 72); c.stroke();
      }
      c.fillStyle = PA.red; c.beginPath(); c.ellipse(132, 108, 9, 4, 0, 0, 7); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(128, 88); c.lineTo(124, 98); c.lineTo(130, 99); c.stroke();
      c.restore();
      // Speech bubble
      c.fillStyle = PA.white; c.strokeStyle = PA.ink; c.lineWidth = 1.5;
      c.beginPath(); c.ellipse(196, 62, 46, 16, 0, 0, 7); c.fill(); c.stroke();
      poly(c, [[170, 74], [158, 90], [186, 76]], PA.white); c.beginPath(); c.moveTo(170, 75); c.lineTo(158, 90); c.lineTo(186, 77); c.stroke();
      F().draw(c, 'I MISSED', 196, 54, PA.ink, 1, 'center'); F().draw(c, 'THE TRAIN!', 196, 64, PA.ink, 1, 'center');
      // Panel B: the train bursting through, speed lines.
      panel(262, 42, 250, 112, PA.sky);
      c.save(); c.beginPath(); c.rect(262, 42, 250, 112); c.clip();
      c.fillStyle = PA.white;
      for (let a = 0; a < 6.283; a += 0.26) { c.beginPath(); c.moveTo(400, 92); c.lineTo(400 + Math.cos(a) * 220, 92 + Math.sin(a) * 220); c.lineTo(400 + Math.cos(a + 0.1) * 220, 92 + Math.sin(a + 0.1) * 220); c.fill(); }
      R(c, PA.ink, 342, 60, 116, 96); R(c, PA.blue, 346, 64, 108, 92); // train front
      R(c, PA.ink, 356, 72, 88, 34); R(c, PA.sky, 360, 76, 80, 26); R(c, PA.white, 364, 78, 22, 4);
      for (const hx of [366, 434]) { c.fillStyle = PA.ink; c.beginPath(); c.arc(hx, 124, 9, 0, 7); c.fill(); c.fillStyle = PA.yel; c.beginPath(); c.arc(hx, 124, 6, 0, 7); c.fill(); }
      R(c, PA.red, 346, 136, 108, 8); R(c, PA.ink, 346, 144, 108, 2);
      c.restore();
      // Panel C: the line map, with a strap-hanging hand.
      panel(526, 42, 246, 112, PA.white);
      c.save(); c.beginPath(); c.rect(526, 42, 246, 112); c.clip();
      R(c, PA.pink, 526, 42, 246, 26);
      bold(c, 'SKY EXPRESS LINE', 649, 51, PA.white, PA.ink, 1);
      c.lineWidth = 4; c.lineCap = 'round';
      for (const [col, pts] of [[PA.red, [[540, 80], [600, 80], [640, 110], [760, 110]]], [PA.blue, [[540, 130], [620, 130], [660, 80], [760, 80]]], [PA.yel, [[560, 64], [600, 100], [600, 146]]]]) {
        c.strokeStyle = PA.ink; c.lineWidth = 6; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
        c.strokeStyle = col; c.lineWidth = 4; c.stroke();
      }
      for (const [sx, sy] of [[600, 80], [640, 110], [700, 110], [620, 130], [700, 80], [600, 100], [560, 64]]) { c.fillStyle = PA.ink; c.beginPath(); c.arc(sx, sy, 4.5, 0, 7); c.fill(); c.fillStyle = PA.white; c.beginPath(); c.arc(sx, sy, 3, 0, 7); c.fill(); }
      c.restore();
      // Caption box under the panels.
      R(c, PA.ink, 18, 160, 300, 18); R(c, PA.yel, 20, 162, 296, 14);
      F().draw(c, 'MEANWHILE, ON THE 5:15...', 168, 166, PA.ink, 1, 'center');
      R(c, PA.ink, 0, 182, 780, VH); R(c, PA.blue, 0, 184, 780, VH);
      POP = POP || popPalette();
      this.spikes = makeSpikes({ tip: PA.white, hi: PA.white, lo: PA.white, base: PA.red, base2: PA.red, out: PA.ink });
    },
    background(ctx, cam, t, mood) {
      R(ctx, PA.white, 0, 0, VW, VH);
      tiled(ctx, this.panels, cam.x, 0.3);
      // WHOOSH! jiggles over the train panel.
      const wx = Math.round(wrapX(400, cam.x, 0.3, 780)) + 24, j = Math.round(Math.sin(t * 9));
      if (wx > -120 && wx < VW + 120) { bold(ctx, 'WHOOSH!', wx + j, 46 - j, PA.red, PA.ink, 3); }
      // A tear rolls down the commuter's cheek every few seconds.
      const fx = Math.round(wrapX(108, cam.x, 0.3, 780)) + 24, ft = (t % 3) / 3;
      if (fx > -20 && fx < VW + 20) { ctx.fillStyle = PA.ink; ctx.beginPath(); ctx.ellipse(fx, 88 + ft * 40, 4, 5, 0, 0, 7); ctx.fill(); ctx.fillStyle = PA.sky; ctx.beginPath(); ctx.ellipse(fx, 88 + ft * 40, 3, 4, 0, 0, 7); ctx.fill(); R(ctx, PA.white, fx - 1, 86 + ft * 40, 1, 2); }
      // POW! burst when the crowd gets loud (deaths, wins).
      if (mood.cheer > 0.1) {
        const k = Math.min(1, mood.cheer), cx = VW - 70, cy = 118, r = 14 + 16 * k;
        const star = [];
        for (let a = 0; a < 24; a++) { const rr = a % 2 ? r * 0.6 : r; star.push([cx + Math.cos(a / 24 * 6.283) * rr * 1.3, cy + Math.sin(a / 24 * 6.283) * rr]); }
        poly(ctx, star.map(([x, y]) => [cx + (x - cx) * 1.12, cy + (y - cy) * 1.12]), PA.ink); poly(ctx, star, PA.yel);
        bold(ctx, 'POW!', cx, cy - 6, PA.red, PA.ink, k > 0.5 ? 2 : 1);
      }
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid') {
        const d = e.d || 0;
        R(ctx, d >= 2 ? PA.blue : PA.red, x, y, 16, 16);
        if (d < 2 && seed > 0.6) R(ctx, PA.white, x + 3, y + 8, 2, 2);
        if (e.t) { R(ctx, PA.yel, x, y, 16, 4); R(ctx, PA.white, x + 2, y + 1, 4, 1); R(ctx, PA.ink, x, y + 4, 16, 1.5); R(ctx, PA.ink, x, y, 16, 0.5); }
        if (e.l) R(ctx, PA.ink, x, y, 1.5, 16);
        if (e.r) R(ctx, PA.ink, x + 14.5, y, 1.5, 16);
        if (e.b) R(ctx, PA.ink, x, y + 14.5, 16, 1.5);
      } else if (art === 'alt') {
        R(ctx, PA.ink, x, y, 16, 16); R(ctx, PA.white, x + 1.5, y + 1.5, 13, 13); R(ctx, PA.sky, x + 3, y + 3, 10, 10);
        F().draw(ctx, '!', x + 8, y + 5, PA.red, 1, 'center');
      } else if (art === 'ice') {
        R(ctx, PA.ink, x, y, 16, 16); R(ctx, PA.sky, x + 1, y + 1, 14, 14); R(ctx, PA.white, x + 3, y + 3, 5, 2);
      } else {
        R(ctx, PA.ink, x, y, 16, 5);
        for (let i = 0; i < 16; i += 4) R(ctx, (i / 4 + Math.floor(x / 16)) % 2 ? PA.yel : PA.white, x + i, y + 1, 4, 3);
      }
    },
    spike(ctx, x, y, dir) { KF.blit(ctx, this.spikes[dir], x, y); },
  }, {
    // Snap to the poster palette; the pale tones become Ben-Day dot screens.
    post(d, W, H) {
      if (!POP) POP = popPalette();
      const P = POP;
      for (let y = 0, o = 0; y < H; y++) {
        const ry = (y % 6) - 2.5;
        for (let x = 0; x < W; x++, o += 4) {
          let k = popLUT[((d[o] >> 3) << 10) | ((d[o + 1] >> 3) << 5) | (d[o + 2] >> 3)];
          if (k >= 5) { const rx = ((x + (((y / 6) | 0) % 2) * 3) % 6) - 2.5; k = rx * rx + ry * ry < 4.6 ? (k === 5 ? 2 : 4) : 1; }
          const c = P[k]; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2];
        }
      }
    },
  });

  // =====================================================================
  // 5. VECTOR DISPLAY: an 80s vector arcade cabinet. Everything is drawn as flat shapes; the pass
  //    keeps only their outlines, glowing in each shape's own colour.
  // =====================================================================
  KF.Env.add('vector', {
    name: 'VECTOR ARCADE', bg: '#000',
    signBoard: '#ffd040', signShade: '#806010', signInk: '#000', signPost: '#ffd040',
    zone: { gravity: '#8a6aff', reverse: '#ff40c0' },
    build() {
      const rnd = U.rng(4242);
      this.stars = [];
      for (let k = 0; k < 60; k++) this.stars.push({ x: rnd() * 640, y: 22 + rnd() * 80, ph: rnd() * 9, b: rnd() < 0.2 });
      this.far = KF.makeHi(640, VH);
      const f = this.far.getContext('2d');
      const ridge = (ctx, w, base, amp, seed, fill, line) => {
        const r = U.rng(seed), pts = [];
        for (let x = 0; x <= w; x += 20 + r() * 30) pts.push([x, base - r() * amp]);
        pts.push([w, pts[0][1]]);
        poly(ctx, [[0, VH], ...pts, [w, VH]], fill);
        if (line) { // inner ridge lines, the classic wireframe look
          ctx.strokeStyle = '#000'; ctx.lineWidth = 0.5; ctx.beginPath();
          for (let i = 1; i < pts.length - 1; i++) { ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[i][0] + (r() - 0.5) * 30, base + 6); }
          ctx.stroke();
        }
      };
      ridge(f, 640, 118, 40, 3, '#5a1a6a', true);
      this.mid = KF.makeHi(768, VH);
      ridge(this.mid.getContext('2d'), 768, 122, 22, 9, '#0a5a3a', true);
    },
    background(ctx, cam, t, mood) {
      R(ctx, '#000', 0, 0, VW, VH);
      for (const s of this.stars) {
        const x = Math.round(wrapX(s.x, cam.x, 0.03, 640)) + 24;
        if (x < 0 || x > VW) continue;
        R(ctx, s.b ? '#ffffff' : '#6a8aff', x, s.y, s.b && Math.sin(t * 3 + s.ph) > 0.5 ? 1.5 : 1, 1);
      }
      // Wireframe sun on the horizon.
      const sx = 300 - cam.x * 0.02;
      ctx.fillStyle = '#a02060'; ctx.beginPath(); ctx.arc(sx, 122, 34, Math.PI, 0); ctx.fill();
      for (let k = 0; k < 6; k++) R(ctx, '#000', sx - 40, 92 + k * 5 + k * k * 0.4, 80, 0.5 + k * 0.3);
      tiled(ctx, this.far, cam.x, 0.06);
      tiled(ctx, this.mid, cam.x, 0.12);
      // Perspective floor grid rushing toward you.
      const hz = 124, vx = VW / 2;
      R(ctx, '#000', 0, hz, VW, VH - hz);
      ctx.strokeStyle = '#0090c0'; ctx.lineWidth = 0.5; ctx.beginPath();
      const run = (t * 0.9) % 1;
      for (let k = 0; k < 12; k++) { const z = (k + 1 - run) / 12, y = hz + (VH - hz) * z * z; ctx.moveTo(0, y); ctx.lineTo(VW, y); }
      const shift = -(cam.x * 0.6) % 48;
      for (let k = -14; k <= 14; k++) { const bx = vx + k * 48 + shift; ctx.moveTo(vx + (bx - vx) * 0.02, hz); ctx.lineTo(vx + (bx - vx) * 3, VH + 100); }
      ctx.stroke();
      // Rails to the horizon, with a wireframe train pulling away down them.
      ctx.strokeStyle = '#d0c000'; ctx.lineWidth = 1; ctx.beginPath();
      ctx.moveTo(vx - 2, hz); ctx.lineTo(vx - 90, VH); ctx.moveTo(vx + 2, hz); ctx.lineTo(vx + 90, VH); ctx.stroke();
      const tz = 1 - ((t * 0.18) % 1), ts = tz * tz, ty = hz + (VH - hz) * ts;
      if (ts > 0.02) {
        const w = 70 * ts, h = 52 * ts, x = vx - w / 2;
        ctx.strokeStyle = '#ff8a20'; ctx.lineWidth = Math.max(0.5, 1.2 * ts);
        ctx.strokeRect(x, ty - h, w, h); ctx.strokeRect(x + w * 0.15, ty - h * 0.85, w * 0.7, h * 0.35);
        ctx.beginPath(); ctx.moveTo(x, ty - h); ctx.lineTo(vx - w * 0.3, ty - h - 12 * ts); ctx.lineTo(vx + w * 0.3, ty - h - 12 * ts); ctx.lineTo(x + w, ty - h); ctx.stroke();
        ctx.beginPath(); ctx.arc(vx - w * 0.3, ty - 4 * ts, 5 * ts, 0, 7); ctx.moveTo(vx + w * 0.3 + 5 * ts, ty - 4 * ts); ctx.arc(vx + w * 0.3, ty - 4 * ts, 5 * ts, 0, 7); ctx.stroke();
      }
      // A UFO-ish saucer streaks past when you die, as arcade backgrounds do.
      if (mood.cheer > 0.2) {
        const ux = (VW + 40) - ((t * 260) % (VW + 80)), uy = 50 + Math.sin(t * 5) * 6;
        ctx.strokeStyle = '#ff3a3a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(ux, uy, 14, 4, 0, 0, 7); ctx.moveTo(ux + 6, uy - 3); ctx.ellipse(ux, uy - 3, 6, 4, 0, Math.PI, 0); ctx.stroke();
      }
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid') { // glowing green boxes with cross bracing
        const d = e.d || 0;
        R(ctx, d ? '#00b050' : '#30ff80', x, y, 16, 16);
        R(ctx, '#000', x + 1, y + 1, 14, 14);
        R(ctx, d ? '#00381a' : '#004a22', x + 2, y + 2, 12, 12);
        if (d === 0 || (d + Math.floor(seed * 4)) % 3 === 0) { ctx.strokeStyle = '#000'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(x + 2, y + 2); ctx.lineTo(x + 14, y + 14); ctx.moveTo(x + 14, y + 2); ctx.lineTo(x + 2, y + 14); ctx.stroke(); }
        if (e.t) R(ctx, '#d0ffe0', x, y, 16, 1);
      } else if (art === 'alt') {
        R(ctx, '#20e0ff', x, y, 16, 16); R(ctx, '#000', x + 1, y + 1, 14, 14); R(ctx, '#003a48', x + 3, y + 3, 10, 10); R(ctx, '#000', x + 5, y + 5, 6, 6);
      } else if (art === 'ice') {
        R(ctx, '#c0e8ff', x, y, 16, 16); R(ctx, '#000', x + 1, y + 1, 14, 14); R(ctx, '#2a4a6a', x + 3, y + 3, 4, 1);
      } else {
        R(ctx, '#f0e040', x, y, 16, 3); R(ctx, '#000', x + 1, y + 1, 14, 1);
      }
    },
    spike(ctx, x, y, dir) {
      const pts = {
        up: [[[0, 16], [4, 5], [8, 16]], [[8, 16], [12, 5], [16, 16]]], down: [[[0, 0], [4, 11], [8, 0]], [[8, 0], [12, 11], [16, 0]]],
        left: [[[16, 0], [5, 4], [16, 8]], [[16, 8], [5, 12], [16, 16]]], right: [[[0, 0], [11, 4], [0, 8]], [[0, 8], [11, 12], [0, 16]]],
      }[dir];
      for (const tri of pts) poly(ctx, tri.map(([a, b]) => [x + a, y + b]), '#ff3030');
    },
  }, {
    // Edge-detect and keep each edge's own hue (red stays red, so danger still reads), plus a faint fill.
    post(d, W, H) {
      const E = sobel(d, W, H);
      for (let k = 0, o = 0, n = W * H; k < n; k++, o += 4) {
        const r = d[o], g = d[o + 1], b = d[o + 2], e = E[k] > 70 ? 1 : E[k] / 70;
        const mx = Math.max(r, g, b, 1), f = (e * 255) / mx;
        d[o] = Math.min(255, r * f + r * 0.14); d[o + 1] = Math.min(255, g * f + g * 0.14 + 3); d[o + 2] = Math.min(255, b * f + b * 0.14 + 5);
      }
    },
  });
})(window.KF);
