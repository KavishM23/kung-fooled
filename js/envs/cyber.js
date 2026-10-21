'use strict';
// Per-stage environments for the cyber realm (NEO-TOKYO 2099): a neon megacity in the rain, a
// district made of holograms, a 1997 low-poly VR sim, Y2K liquid chrome, and SUPERHOT: a white
// void where red means danger and time only moves when you do.
(function (KF) {
  const { R, OUT, ditherSky, tiled, wrapX, edges, Art } = KF.ThemeKit;
  const U = KF.util, VW = KF.VIEW_W, VH = KF.VIEW_H, F = KF.Font;
  const lum = (d, o) => (d[o] * 77 + d[o + 1] * 150 + d[o + 2] * 29) >> 8;

  // =====================================================================================
  // 1. NEON MEGACITY: rain, holo-ads, flying cars, towers that never end.
  // =====================================================================================
  const ADS = ['SYNTH RAMEN', 'BUY.EXE', 'CHROME ARMS 50% OFF', 'SLEEP IS OPTIONAL', 'NEURAL LINK 2099', 'KUNG FU.DLL'];
  KF.Env.add('cyberpunk', {
    name: 'NEON MEGACITY', bg: '#07030f',
    signBoard: '#10081e', signInk: '#ff4ad8', signPost: '#2a1a40', signShade: '#4af0ff',
    zone: { gravity: '#4af0ff', reverse: '#ff4ad8' },
    build() {
      this.sky = ditherSky(['#05020c', '#0c0420', '#1a0634', '#2a0a40', '#3a0c44', '#4a1040']);
      const rnd = U.rng(2099);
      // Far: megastructures with neon strips running up them.
      this.far = KF.makeHi(720, VH);
      const f = this.far.getContext('2d');
      this.strips = [];
      for (let x = 0; x < 720;) {
        const w = 22 + Math.floor(rnd() * 34), top = 10 + Math.floor(rnd() * 80);
        R(f, '#120a26', x, top, w, VH - top);
        R(f, '#1c1036', x, top, 1, VH - top);
        for (let wy = top + 4; wy < VH; wy += 4) for (let wx = x + 3; wx < x + w - 2; wx += 3) {
          const r = rnd(); if (r < 0.16) R(f, r < 0.04 ? '#5a3a8a' : '#2a1a4c', wx, wy, 1, 2);
        }
        if (rnd() < 0.6) this.strips.push({ x: x + 2 + Math.floor(rnd() * (w - 4)), top, col: rnd() < 0.5 ? '#ff3ad0' : '#3af0ff', ph: rnd() * 9 });
        if (rnd() < 0.3) { R(f, '#120a26', x + Math.floor(w / 2), top - 18, 1, 18); R(f, '#ff3a5a', x + Math.floor(w / 2), top - 19, 1, 1); }
        x += w + Math.floor(rnd() * 8);
      }
      // Mid: closer blocks carrying holo billboards.
      this.mid = KF.makeHi(800, VH);
      const m = this.mid.getContext('2d');
      this.boards = [];
      for (let x = 0; x < 800;) {
        const w = 44 + Math.floor(rnd() * 50), top = 88 + Math.floor(rnd() * 40);
        R(m, '#0c0618', x, top, w, VH - top);
        R(m, '#24123c', x, top, w, 1);
        for (let wy = top + 5; wy < VH; wy += 7) for (let wx = x + 4; wx < x + w - 4; wx += 6) if (rnd() < 0.22) R(m, rnd() < 0.3 ? '#4a2a6a' : '#1c1030', wx, wy, 3, 2);
        if (rnd() < 0.7) {
          const bw = Math.min(w - 8, 30 + Math.floor(rnd() * 30)), bh = 16 + Math.floor(rnd() * 14);
          this.boards.push({ x: x + 4, y: top - bh - 10, w: bw, h: bh, ad: Math.floor(rnd() * ADS.length), col: ['#ff3ad0', '#3af0ff', '#ffd040', '#7aff5a'][Math.floor(rnd() * 4)], ph: rnd() * 9 });
          R(m, '#0c0618', x + 4 + Math.floor(bw / 2), top - 10, 2, 10);
        }
        x += w + 10 + Math.floor(rnd() * 16);
      }
      this.cars = [];
      for (let i = 0; i < 6; i++) this.cars.push({ y: 30 + rnd() * 70, sp: (rnd() < 0.5 ? -1 : 1) * (40 + rnd() * 60), ph: rnd() * 1000, par: 0.2 + rnd() * 0.25 });
    },
    background(ctx, cam, t, mood) {
      KF.blit(ctx, this.sky, 0, 0);
      tiled(ctx, this.far, cam.x, 0.08, -4);
      for (const s of this.strips) { // neon strips pulse up the towers
        const x = Math.round(wrapX(s.x, cam.x, 0.08, 720)) + 24;
        if (x < -2 || x > VW) continue;
        ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 2 + s.ph);
        R(ctx, s.col, x, s.top - 4, 1, VH - s.top);
        const py = s.top - 4 + ((t * 40 + s.ph * 20) % (VH - s.top));
        ctx.globalAlpha = 0.9; R(ctx, '#ffffff', x, py, 1, 4);
      }
      ctx.globalAlpha = 1;
      for (const c of this.cars) { // flying cars with tail lights
        const span = VW + 80, x = ((((c.ph + t * c.sp) - cam.x * c.par) % span) + span) % span - 40;
        R(ctx, '#1a1030', x, c.y, 10, 3); R(ctx, '#2a1a48', x + 2, c.y - 1, 6, 1);
        R(ctx, c.sp > 0 ? '#ff3040' : '#fff2c0', x, c.y + 1, 1, 1); R(ctx, c.sp > 0 ? '#fff2c0' : '#ff3040', x + 9, c.y + 1, 1, 1);
      }
      tiled(ctx, this.mid, cam.x, 0.25);
      for (const b of this.boards) {
        const x = Math.round(wrapX(b.x, cam.x, 0.25, 800)) + 24;
        if (x < -b.w || x > VW) continue;
        const glitch = Math.sin(t * 9 + b.ph) > 0.96 || mood.cheer > 0.6 && Math.sin(t * 30 + b.ph) > 0;
        const ad = ADS[(b.ad + Math.floor((t + b.ph) / 4)) % ADS.length];
        ctx.globalAlpha = 0.18; R(ctx, b.col, x - 2, b.y - 2, b.w + 4, b.h + 4);
        ctx.globalAlpha = 0.85; R(ctx, '#0a0616', x, b.y, b.w, b.h);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = b.col; ctx.lineWidth = 0.5; ctx.strokeRect(x + 0.25, b.y + 0.25, b.w - 0.5, b.h - 0.5);
        const words = ad.split(' '), ox = glitch ? 2 : 0;
        words.slice(0, 2).forEach((wd, k) => F.draw(ctx, wd.slice(0, Math.floor(b.w / 6)), x + b.w / 2 + ox, b.y + 3 + k * 8, glitch ? '#ffffff' : b.col, 1, 'center'));
      }
      // Wet street far below, catching the neon.
      R(ctx, '#05020a', 0, 150, VW, VH - 150);
      for (let i = 0; i < 18; i++) {
        const x = ((i * 53 - cam.x * 0.5) % (VW + 40) + VW + 40) % (VW + 40) - 20;
        ctx.globalAlpha = 0.25 + 0.15 * Math.sin(t * 3 + i); R(ctx, i % 2 ? '#ff3ad0' : '#3af0ff', x, 156 + (i % 5) * 9, 12 + (i % 4) * 6, 1);
      }
      ctx.globalAlpha = 1;
      // Steam from vents.
      for (let i = 0; i < 4; i++) {
        const x = ((i * 113 - cam.x * 0.6) % (VW + 60) + VW + 60) % (VW + 60) - 30;
        for (let k = 0; k < 5; k++) {
          const p = (t * 0.4 + k / 5 + i * 0.3) % 1;
          ctx.globalAlpha = 0.12 * (1 - p); ctx.fillStyle = '#c8b0ff';
          ctx.beginPath(); ctx.arc(x + Math.sin(p * 6 + i) * 4, 170 - p * 50, 4 + p * 10, 0, 7); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'oneway') { // holo-grate
        R(ctx, '#3af0ff', x, y, 16, 1); R(ctx, '#1a5a7a', x, y + 1, 16, 2);
        for (let i = 1; i < 16; i += 3) R(ctx, '#2ab0d0', x + i, y + 1, 1, 2);
        R(ctx, '#0a1a2a', x, y + 3, 16, 1);
        return;
      }
      if (art === 'alt') { // cargo container with warning stripes
        R(ctx, '#2a1440', x, y, 16, 16); R(ctx, '#3a1e58', x + 1, y + 1, 14, 14);
        for (let i = 0; i < 16; i += 4) R(ctx, '#24103a', x + 1 + i, y + 2, 2, 12);
        for (let i = 0; i < 14; i += 4) { R(ctx, '#ffd040', x + 1 + i, y + 12, 2, 2); R(ctx, '#1a1020', x + 3 + i, y + 12, 2, 2); }
        R(ctx, '#ff3ad0', x + 2, y + 3, 3, 1);
        if (e.t) R(ctx, '#8a5ab0', x, y, 16, 1);
        edges(ctx, x, y, e, '#0a0412');
        return;
      }
      const ice = art === 'ice';
      R(ctx, ice ? '#10304a' : '#120c1e', x, y, 16, 16);
      // panel seams, bolts, a cable
      R(ctx, '#1c1430', x, y + 7, 16, 1); R(ctx, '#0a0612', x + 7, y + 8, 1, 8);
      if (seed < 0.5) { R(ctx, '#2a2040', x + 2, y + 10, 1, 1); R(ctx, '#2a2040', x + 12, y + 12, 1, 1); }
      if (seed > 0.8) for (let i = 0; i < 16; i += 2) R(ctx, '#0a0814', x + i, y + 4 + ((i >> 1) % 2), 2, 1);
      if (e.t) { // neon edge strip: the bit you stand on glows
        const c = seed < 0.5 ? '#ff3ad0' : '#3af0ff';
        R(ctx, '#ffffff', x, y, 16, 1); R(ctx, c, x, y + 1, 16, 1); R(ctx, ice ? '#3a8ab0' : '#4a2a6a', x, y + 2, 16, 1);
        ctx.globalAlpha = 0.25; R(ctx, c, x, y - 2, 16, 2); ctx.globalAlpha = 1;
        if (ice) for (let i = 2; i < 16; i += 5) R(ctx, '#bff4ff', x + i, y + 3, 2, 1);
      }
      edges(ctx, x, y, e, '#030108');
    },
  }, {
    name: 'NEON MEGACITY',
    overlay(ctx, i) { // rain in front of everything
      ctx.strokeStyle = 'rgba(170,200,255,0.28)'; ctx.lineWidth = 0.5; ctx.beginPath();
      for (let k = 0; k < 90; k++) {
        const x = (k * 41 + i.t * 70) % (VW + 30) - 15, y = (k * 67 + i.t * 330) % (VH + 20) - 10;
        ctx.moveTo(x, y); ctx.lineTo(x - 2, y + 8);
      }
      ctx.stroke();
    },
  });

  // =====================================================================================
  // 2. HOLO DISTRICT: a city that is only light. Wireframe towers, scan beams, projected floors.
  // =====================================================================================
  KF.Env.add('hologram', {
    name: 'HOLO DISTRICT', bg: '#020814',
    signBoard: '#061a2a', signInk: '#7af6ff', signPost: '#1a5a7a', signShade: '#7af6ff',
    zone: { gravity: '#ffffff', reverse: '#ff7ad8' },
    build() {
      this.sky = ditherSky(['#01040a', '#020a18', '#041426', '#061c32', '#082236']);
      const rnd = U.rng(77);
      this.far = KF.makeHi(700, VH);
      const f = this.far.getContext('2d');
      f.strokeStyle = 'rgba(80,200,255,0.35)'; f.lineWidth = 0.5;
      for (let x = 0; x < 700;) { // wireframe towers
        const w = 26 + Math.floor(rnd() * 40), top = 30 + Math.floor(rnd() * 70);
        f.strokeRect(x + 0.25, top + 0.25, w, 160 - top);
        for (let yy = top + 8; yy < 160; yy += 8) { f.beginPath(); f.moveTo(x, yy + 0.25); f.lineTo(x + w, yy + 0.25); f.stroke(); }
        f.beginPath(); f.moveTo(x + w / 2 + 0.25, top); f.lineTo(x + w / 2 + 0.25, 160); f.stroke();
        x += w + 6 + Math.floor(rnd() * 14);
      }
      this.floaters = [];
      for (let i = 0; i < 7; i++) this.floaters.push({ x: rnd() * 900, y: 40 + rnd() * 70, kind: i % 3, ph: rnd() * 9, s: 8 + rnd() * 10 });
    },
    background(ctx, cam, t, mood) {
      KF.blit(ctx, this.sky, 0, 0);
      // Perspective grid floor of the projection stage.
      R(ctx, '#020a16', 0, 150, VW, VH - 150);
      ctx.strokeStyle = 'rgba(60,180,255,0.35)'; ctx.lineWidth = 0.5; ctx.beginPath();
      for (let k = 0; k < 9; k++) { const y = 150 + k * k * 1.1; ctx.moveTo(0, y + 0.25); ctx.lineTo(VW, y + 0.25); }
      const ox = (cam.x * 0.5) % 24;
      for (let k = -12; k <= 12; k++) { const x0 = VW / 2 + k * 24 - ox; ctx.moveTo(VW / 2 + (x0 - VW / 2) * 0.2, 150); ctx.lineTo(x0 + (x0 - VW / 2) * 1.5, VH); }
      ctx.stroke();
      // Towers flicker in and out of existence.
      ctx.globalAlpha = 0.65 + 0.35 * Math.sin(t * 13) * Math.sin(t * 3.1) - mood.cheer * 0.3;
      tiled(ctx, this.far, cam.x, 0.15, 0);
      ctx.globalAlpha = 1;
      // Floating projections: a koi, a rotating diamond, a face-less bust.
      for (const fl of this.floaters) {
        const x = Math.round(wrapX(fl.x, cam.x, 0.3, 900)) + 24, y = fl.y + Math.sin(t + fl.ph) * 4;
        if (x < -30 || x > VW + 30) continue;
        ctx.strokeStyle = fl.kind === 1 ? '#ff7ad8' : '#7af6ff'; ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 7 + fl.ph); ctx.beginPath();
        if (fl.kind === 0) { // koi
          const s = fl.s, w = Math.sin(t * 4 + fl.ph) * 2;
          ctx.moveTo(x - s, y); ctx.quadraticCurveTo(x, y - s * 0.5, x + s, y + w); ctx.quadraticCurveTo(x, y + s * 0.5, x - s, y);
          ctx.moveTo(x - s, y); ctx.lineTo(x - s * 1.5, y - s * 0.4 + w); ctx.lineTo(x - s * 1.5, y + s * 0.4 + w); ctx.closePath();
        } else if (fl.kind === 1) { // diamond
          const a = t * 1.5 + fl.ph, s = fl.s, c = Math.cos(a) * s;
          ctx.moveTo(x, y - s); ctx.lineTo(x + c, y); ctx.lineTo(x, y + s); ctx.lineTo(x - c, y); ctx.closePath(); ctx.moveTo(x - c, y); ctx.lineTo(x + c, y);
        } else { // bust
          const s = fl.s;
          ctx.arc(x, y - s * 0.4, s * 0.5, 0, 7); ctx.moveTo(x - s, y + s); ctx.quadraticCurveTo(x, y - s * 0.1, x + s, y + s);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // A scan beam sweeps across the district.
      const sx = ((t * 60) % (VW + 80)) - 40;
      ctx.globalAlpha = 0.08; R(ctx, '#7af6ff', sx - 10, 0, 20, VH); ctx.globalAlpha = 0.35; R(ctx, '#bffcff', sx, 0, 1, VH); ctx.globalAlpha = 1;
    },
    tile(ctx, x, y, art, e, seed, ) {
      const flick = 0.75 + 0.25 * Math.sin((KF.engine ? KF.engine.time : 0) * 20 + seed * 30);
      if (art === 'oneway') { // projected platform: translucent, with scanlines
        ctx.globalAlpha = 0.45 * flick; R(ctx, '#7af6ff', x, y, 16, 4); ctx.globalAlpha = 1;
        R(ctx, '#e8feff', x, y, 16, 1);
        for (let i = 0; i < 16; i += 2) R(ctx, '#3ab0e0', x + i, y + 2, 1, 1);
        return;
      }
      if (art === 'alt') { // projector unit
        R(ctx, '#0c1a28', x, y, 16, 16); R(ctx, '#18324a', x + 1, y + 1, 14, 14);
        R(ctx, '#7af6ff', x + 5, y + 5, 6, 6); R(ctx, '#e8feff', x + 7, y + 7, 2, 2);
        if (e.t) R(ctx, '#3a7aa0', x, y, 16, 1);
        edges(ctx, x, y, e, '#01060c');
        return;
      }
      // Solid = a projection over a dark emitter: translucent cyan fill with scanlines.
      R(ctx, '#03101c', x, y, 16, 16);
      ctx.globalAlpha = 0.28 * flick; R(ctx, art === 'ice' ? '#bffcff' : '#3ac0ff', x, y, 16, 16); ctx.globalAlpha = 1;
      for (let k = 1; k < 16; k += 3) R(ctx, 'rgba(160,240,255,0.18)', x, y + k, 16, 1);
      R(ctx, '#2a8ac0', x, y, 1, 16); R(ctx, '#0a2a40', x + 15, y, 1, 16);
      if (e.t) { R(ctx, '#ffffff', x, y, 16, 1); R(ctx, '#7af6ff', x, y + 1, 16, 1); }
      if (e.b) R(ctx, '#7af6ff', x, y + 15, 16, 1);
    },
  }, {
    name: 'HOLOGRAM',
    overlay(ctx, i) {
      if (i.rnd() < 0.05) { const y = i.rnd() * VH; ctx.globalAlpha = 0.25; R(ctx, '#7af6ff', 0, y, VW, 1 + i.rnd() * 3); ctx.globalAlpha = 1; }
      ctx.fillStyle = 'rgba(0,20,40,0.12)'; for (let y = 0; y < VH; y += 2) ctx.fillRect(0, y, VW, 0.5);
    },
  });

  // =====================================================================================
  // 3. VR 1997: a PlayStation-era virtual reality sim. Flat-shaded polygons that wobble,
  //    warped textures, chunky dithered colour, and fog where the world hasn't loaded yet.
  // =====================================================================================
  const tri = (ctx, a, b, c, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.closePath(); ctx.fill(); };
  KF.Env.add('ps1', {
    name: 'VR 1997', bg: '#6a7a98',
    signBoard: '#d8c080', signInk: '#2a1a40', signPost: '#5a4a6a',
    zone: { gravity: '#4af0ff', reverse: '#ff4ad8' },
    build() {
      this.sky = ditherSky(['#2a3a6a', '#4a5a8a', '#6a7aa0', '#8a96b0', '#a8b0c0']);
      const rnd = U.rng(1997);
      this.peaks = [];
      for (let x = -40; x < 900; x += 40 + rnd() * 40) this.peaks.push({ x, h: 40 + rnd() * 60, w: 50 + rnd() * 50, c: rnd() });
      this.cubes = [];
      for (let i = 0; i < 5; i++) this.cubes.push({ x: rnd() * 800, y: 40 + rnd() * 50, s: 7 + rnd() * 6, ph: rnd() * 9 });
    },
    background(ctx, cam, t, mood) {
      KF.blit(ctx, this.sky, 0, 0);
      const jit = (v, k) => v + Math.round(Math.sin(t * 11 + k * 7.3) * 0.8); // PS1 vertex wobble
      // Flat-shaded polygon mountains.
      for (const [i, p] of this.peaks.entries()) {
        const x = ((p.x - cam.x * 0.12) % 900 + 900) % 900 - 60, b = 152, top = b - p.h;
        const L = [jit(x, i), b], T = [jit(x + p.w / 2, i + 1), jit(top, i + 2)], Rr = [jit(x + p.w, i + 3), b], M = [jit(x + p.w * 0.55, i + 4), jit(b - p.h * 0.4, i + 5)];
        tri(ctx, L, T, M, p.c < 0.5 ? '#4a5a7a' : '#55607e');
        tri(ctx, T, Rr, M, p.c < 0.5 ? '#36405a' : '#3c4660');
        tri(ctx, L, M, Rr, '#2e364c');
        if (p.h > 70) tri(ctx, [T[0] - 6, T[1] + 8], T, [T[0] + 6, T[1] + 8], '#d8dce8'); // snow cap
      }
      // Rotating untextured cubes hanging in the sky: debug geometry somebody left in.
      for (const [k, c] of this.cubes.entries()) {
        const x = ((c.x - cam.x * 0.3) % 860 + 860) % 860 - 30, y = c.y + Math.sin(t + c.ph) * 3, a = t * 0.9 + c.ph, s = c.s;
        const P = [];
        for (const [vx, vy, vz] of [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]]) {
          const rx = vx * Math.cos(a) - vz * Math.sin(a), rz = vx * Math.sin(a) + vz * Math.cos(a), ry = vy * Math.cos(a * 0.7) - rz * Math.sin(a * 0.7);
          P.push([jit(Math.round(x + rx * s), k), jit(Math.round(y + ry * s), k + 1)]);
        }
        const faces = [[0, 1, 2, 3, '#c04a4a'], [4, 5, 6, 7, '#4ac04a'], [0, 1, 5, 4, '#4a6ac0'], [3, 2, 6, 7, '#c0c04a'], [1, 2, 6, 5, '#a04ac0'], [0, 3, 7, 4, '#4ac0c0']];
        for (const fc of faces) {
          const [p0, p1, p2] = [P[fc[0]], P[fc[1]], P[fc[2]]];
          if ((p1[0] - p0[0]) * (p2[1] - p0[1]) - (p1[1] - p0[1]) * (p2[0] - p0[0]) <= 0) continue; // back-face cull
          tri(ctx, P[fc[0]], P[fc[1]], P[fc[2]], fc[4]); tri(ctx, P[fc[0]], P[fc[2]], P[fc[3]], fc[4]);
        }
      }
      // Ground plane with an affine-warped checker texture that swims as you move.
      for (let y = 152; y < VH; y += 2) {
        const z = (y - 148) / 70, row = Math.floor((1 / z) * 10 + t * 0);
        for (let x = 0; x < VW; x += 8) {
          const u = Math.floor((x - VW / 2) * z * 0.25 + cam.x * 0.06 + Math.sin(y * 0.2 + t) * 0.5);
          R(ctx, (u + row) & 1 ? '#3a5a3a' : '#4a6a40', x, y, 8, 2);
        }
      }
      // Distance fog: everything beyond the draw distance fades to the fog colour.
      const g = ctx.createLinearGradient(0, 80, 0, 160);
      g.addColorStop(0, 'rgba(168,176,192,0)'); g.addColorStop(1, 'rgba(168,176,192,0.55)');
      ctx.fillStyle = g; ctx.fillRect(0, 80, VW, 80);
      if (mood.cheer > 0.4) F.draw(ctx, 'LOADING...', VW - 50, 40, '#ffffff', 1, 'center');
    },
    tile(ctx, x, y, art, e, seed) {
      // Low-res textures stretched across each tile with a little affine skew.
      const sk = Math.round((seed - 0.5) * 2);
      if (art === 'oneway') {
        R(ctx, '#c8a060', x, y, 16, 3); R(ctx, '#8a6030', x, y + 3, 16, 1);
        for (let i = 0; i < 16; i += 4) R(ctx, '#a07a40', x + i + sk, y + 1, 2, 1);
        return;
      }
      if (art === 'alt') { // textured crate
        R(ctx, '#8a5a2a', x, y, 16, 16);
        for (let k = 0; k < 16; k += 4) R(ctx, '#6a4220', x, y + k + (sk & 1), 16, 1);
        R(ctx, '#b07a3a', x + 2 + sk, y + 2, 12, 2); R(ctx, '#5a3818', x, y, 1, 16); R(ctx, '#5a3818', x + 15, y, 1, 16);
        R(ctx, '#d8d8d8', x + 6, y + 7, 4, 2); // the obligatory '?' sticker
        return;
      }
      const ice = art === 'ice';
      // Brick texture at quarter resolution: 4px texels.
      for (let ty = 0; ty < 16; ty += 4) for (let tx = 0; tx < 16; tx += 4) {
        const h = U.hash2(Math.floor(seed * 999) + tx, ty);
        R(ctx, ice ? (h < 0.5 ? '#8ab0d0' : '#a0c4e0') : h < 0.33 ? '#7a6a5a' : h < 0.66 ? '#8a7a66' : '#6a5a4c', x + tx, y + ty, 4, 4);
      }
      for (let k = 0; k < 16; k += 8) R(ctx, ice ? '#6a90b0' : '#4a3e34', x, y + k + 3, 16, 1);
      if (e.t) { R(ctx, ice ? '#e0f4ff' : '#6ab04a', x, y, 16, 3); R(ctx, ice ? '#a0d0f0' : '#4a8a30', x, y + 3, 16, 1); R(ctx, '#8ad06a', x + sk + 4, y, 3, 1); }
      edges(ctx, x, y, e, '#2a2030');
    },
  }, {
    name: 'VR 1997', res: 1,
    // 15-bit colour with the PlayStation's ordered dither.
    post(d, W, H) {
      const B = [0, 4, 1, 5, 6, 2, 7, 3, 1, 5, 0, 4, 7, 3, 6, 2];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const o = (y * W + x) * 4, k = B[(y & 3) * 4 + (x & 3)] - 3.5;
        for (let j = 0; j < 3; j++) { const v = d[o + j] + k * 2.2; d[o + j] = Math.max(0, Math.min(255, Math.round(v / 8) * 8)); }
      }
    },
    overlay(ctx) {
      F.draw(ctx, 'VR SIM V0.97', VW - 8, VH - 11, 'rgba(255,255,255,0.55)', 1, 'right');
    },
  });

  // =====================================================================================
  // 4. CHROME Y2K: liquid metal, bubble plastics and lens flares at the turn of the millennium.
  // =====================================================================================
  const chromeBand = (ctx, x, y, w, h) => { // environment-mapped chrome: sky above the horizon line, ground below
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, '#b8c8e0'); g.addColorStop(0.48, '#506078');
    g.addColorStop(0.5, '#202838'); g.addColorStop(0.62, '#8a96a8'); g.addColorStop(1, '#e0e8f4');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  };
  KF.Env.add('chrome', {
    name: 'CHROME Y2K', bg: '#c8d8f0',
    signBoard: '#e8f0ff', signInk: '#2040a0', signPost: '#8090a8', signShade: '#a0b0d0',
    zone: { gravity: '#4a7aff', reverse: '#ff4ad8' },
    build() {
      this.sky = ditherSky(['#9ab8e8', '#b4cbf0', '#cddcf6', '#e2ecfa', '#f2f6fe']);
      const rnd = U.rng(2000);
      this.blobs = [];
      for (let i = 0; i < 8; i++) this.blobs.push({ x: rnd() * 900, y: 30 + rnd() * 90, r: 8 + rnd() * 18, ph: rnd() * 9, par: 0.1 + rnd() * 0.3 });
      this.bubbles = [];
      for (let i = 0; i < 5; i++) this.bubbles.push({ x: rnd() * 800, y: 60 + rnd() * 70, w: 24 + rnd() * 20, h: 20 + rnd() * 20, col: ['#2a8aff', '#ff5ab0', '#5ad060', '#ffa020', '#a05aff'][i] });
    },
    background(ctx, cam, t, mood) {
      KF.blit(ctx, this.sky, 0, 0);
      // A giant chrome "2000" floating behind everything.
      const tx = 200 - ((cam.x * 0.05) % 600);
      ctx.save(); ctx.globalAlpha = 0.55;
      for (let k = 0; k < 3; k++) F.draw(ctx, '2000', tx + k * 1, 58 + k * 1, k === 2 ? '#ffffff' : k ? '#8a9ab8' : '#3a4a68', 5, 'center');
      ctx.restore();
      // Translucent candy-plastic shapes (think see-through computers).
      for (const b of this.bubbles) {
        const x = Math.round(wrapX(b.x, cam.x, 0.18, 800)) + 24;
        if (x < -b.w || x > VW + b.w) continue;
        ctx.globalAlpha = 0.35; ctx.fillStyle = b.col; ctx.beginPath(); ctx.roundRect(x, b.y, b.w, b.h, 8); ctx.fill();
        ctx.globalAlpha = 0.7; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.roundRect(x + 3, b.y + 2, b.w * 0.5, 3, 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Liquid-metal blobs that wobble and reflect the sky.
      for (const b of this.blobs) {
        const x = Math.round(wrapX(b.x, cam.x, b.par, 900)) + 24, y = b.y + Math.sin(t * 1.3 + b.ph) * 5;
        if (x < -40 || x > VW + 40) continue;
        const r = b.r * (1 + 0.08 * Math.sin(t * 3 + b.ph)), ry = r * (1 - 0.1 * Math.sin(t * 3 + b.ph));
        const g = ctx.createRadialGradient(x - r * 0.35, y - ry * 0.4, 1, x, y, r);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, '#c8d4e8'); g.addColorStop(0.62, '#4a5870'); g.addColorStop(0.8, '#a8b4c8'); g.addColorStop(1, '#5a6880');
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, r, ry, 0, 0, 7); ctx.fill();
      }
      // Chrome horizon floor.
      chromeBand(ctx, 0, 140, VW, VH - 140);
      // Lens flare that drifts with the camera.
      const fx = 300 - cam.x * 0.02, fy = 40;
      ctx.globalAlpha = 0.5 + mood.cheer * 0.3;
      for (const [k, r, c] of [[0, 10, '#ffffff'], [0.4, 5, '#ffd0f0'], [0.8, 8, '#b0d0ff'], [1.3, 3, '#ffffff']]) {
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(fx + (VW / 2 - fx) * k, fy + (110 - fy) * k, r, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'oneway') {
        chromeBand(ctx, x, y, 16, 4);
        R(ctx, '#ffffff', x, y, 16, 1); R(ctx, '#3a4a60', x, y + 4, 16, 1);
        return;
      }
      if (art === 'alt') { // blueberry candy plastic block
        R(ctx, '#1a5ad0', x, y, 16, 16); R(ctx, '#3a8aff', x + 1, y + 1, 14, 14);
        R(ctx, '#8ac0ff', x + 2, y + 2, 8, 2); R(ctx, '#ffffff', x + 2, y + 2, 3, 1);
        R(ctx, '#123c90', x + 1, y + 13, 14, 2);
        edges(ctx, x, y, e, '#0a2060');
        return;
      }
      // Chrome slab: a mirror of the sky, horizon line across the middle.
      chromeBand(ctx, x, y, 16, 16);
      if (seed > 0.7) R(ctx, 'rgba(255,255,255,0.55)', x + Math.floor(seed * 10), y + 2, 2, 12); // a streak
      if (art === 'ice') { ctx.globalAlpha = 0.35; R(ctx, '#7ad0ff', x, y, 16, 16); ctx.globalAlpha = 1; }
      if (e.t) { R(ctx, '#ffffff', x, y, 16, 1); R(ctx, '#e8f0ff', x, y + 1, 16, 1); R(ctx, '#9aa8c0', x, y + 2, 16, 1); }
      edges(ctx, x, y, e, '#2a3448');
    },
  }, { name: 'CHROME' });

  // =====================================================================================
  // 5. SUPERHOT: a white geometric void. Black is solid, red is danger. Nothing else.
  //    The style's pass turns everything to white and grey except strong reds, so the player
  //    reads as a pale figure and every hazard (and the crystal boss) reads instantly.
  // =====================================================================================
  KF.Env.add('superhot', {
    name: 'SUPERHOT', bg: '#e4e6ea',
    signBoard: '#ffffff', signInk: '#20242c', signPost: '#9aa0aa', signShade: '#c0c4cc',
    zone: { gravity: '#20242c', reverse: '#ff2a1a' },
    build() {
      const rnd = U.rng(51);
      this.blocks = []; // white pillars and slabs receding into the void
      for (let x = 0; x < 900; x += 30 + rnd() * 50) this.blocks.push({ x, w: 14 + rnd() * 40, h: 40 + rnd() * 110, depth: 0.1 + rnd() * 0.35 });
      this.blocks.sort((a, b) => a.depth - b.depth);
      this.obs = []; // black obsidian objects hanging in the air
      for (let i = 0; i < 5; i++) this.obs.push({ x: rnd() * 900, y: 30 + rnd() * 70, s: 4 + rnd() * 5, ph: rnd() * 9 });
    },
    background(ctx, cam, t, mood) {
      const g = ctx.createLinearGradient(0, 0, 0, VH);
      g.addColorStop(0, '#f6f7f9'); g.addColorStop(0.7, '#dfe2e7'); g.addColorStop(1, '#cfd3d9');
      ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
      for (const b of this.blocks) { // flat white geometry: lit face + shadow side, no texture
        const x = Math.round(((b.x - cam.x * b.depth) % 900 + 900) % 900 - 60), top = 160 - b.h;
        const side = Math.max(3, Math.round(b.w * 0.25));
        R(ctx, '#ffffff', x, top, b.w, b.h);
        R(ctx, '#c4c8d0', x + b.w, top + 2, side, b.h - 2);
        R(ctx, '#d6d9df', x, top + b.h - 3, b.w, 3);
      }
      R(ctx, '#d2d5db', 0, 160, VW, VH - 160);
      R(ctx, '#bfc3ca', 0, 160, VW, 1);
      for (const o of this.obs) { // slowly turning obsidian cubes
        const x = Math.round(wrapX(o.x, cam.x, 0.35, 900)) + 24, y = o.y + Math.sin(t * 0.7 + o.ph) * 3, a = t * 0.5 + o.ph, s = o.s;
        ctx.fillStyle = '#16181c'; ctx.beginPath();
        for (let k = 0; k < 4; k++) { const ang = a + k * Math.PI / 2; ctx.lineTo(x + Math.cos(ang) * s, y + Math.sin(ang) * s * 0.8); }
        ctx.closePath(); ctx.fill();
        R(ctx, '#4a4e56', Math.round(x - 1), Math.round(y - s * 0.6), 2, 1);
      }
      if (mood.cheer > 0.5) { // a death: a red flash in the void
        ctx.globalAlpha = Math.min(0.25, (mood.cheer - 0.5) * 0.4); R(ctx, '#ff2a1a', 0, 0, VW, VH); ctx.globalAlpha = 1;
      }
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'oneway') { R(ctx, '#16181c', x, y, 16, 3); R(ctx, '#4a4e56', x, y, 16, 1); return; }
      if (art === 'alt') { // obsidian block
        R(ctx, '#16181c', x, y, 16, 16); R(ctx, '#24272d', x + 1, y + 1, 7, 7); R(ctx, '#5a5e66', x + 1, y + 1, 4, 1);
        return;
      }
      // White geometry with a crisp grey underside. Standing surfaces get a dark top line.
      R(ctx, art === 'ice' ? '#eef4ff' : '#fbfbfc', x, y, 16, 16);
      R(ctx, '#e6e8ec', x, y + 8, 16, 8);
      if (e.t) { R(ctx, '#2a2e36', x, y, 16, 1); R(ctx, '#ffffff', x, y + 1, 16, 1); }
      if (e.r) R(ctx, '#c4c8d0', x + 14, y, 2, 16);
      if (e.l) R(ctx, '#d0d3d9', x, y, 1, 16);
      if (e.b) R(ctx, '#aeb2ba', x, y + 15, 16, 1);
    },
    spike(ctx, x, y, dir) { // red crystal shards
      ctx.save(); ctx.translate(x + 8, y + 8);
      ctx.rotate({ up: 0, down: Math.PI, left: -Math.PI / 2, right: Math.PI / 2 }[dir]);
      for (const ox of [-4, 4]) {
        ctx.fillStyle = '#c8100a'; ctx.beginPath(); ctx.moveTo(ox - 4, 8); ctx.lineTo(ox, -3); ctx.lineTo(ox + 4, 8); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ff4a30'; ctx.beginPath(); ctx.moveTo(ox - 4, 8); ctx.lineTo(ox, -3); ctx.lineTo(ox, 8); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    },
    door(ctx, x, y, o = {}) { // an obsidian slab: the exit
      x = Math.round(x); y = Math.round(y);
      ctx.save();
      if (o.flipped) { ctx.translate(0, y * 2 + 32); ctx.scale(1, -1); }
      R(ctx, '#0c0d10', x - 1, y + 1, 18, 31);
      R(ctx, '#2a2d34', x, y + 2, 16, 29);
      R(ctx, '#5a5e66', x + 1, y + 3, 2, 26);
      if (o.open) { ctx.globalAlpha = o.open; R(ctx, '#ffffff', x + 3, y + 5, 10, 26); ctx.globalAlpha = 1; }
      if (o.lantern) { const p = 0.5 + 0.5 * Math.sin((o.t || 0) * 3); R(ctx, p > 0.5 ? '#16181c' : '#5a5e66', x + 6, y - 6, 4, 4); }
      if (o.legs) { const k = Math.floor(o.legs * 12) % 2; R(ctx, '#0c0d10', x + 3 + k, y + 31, 3, 4); R(ctx, '#0c0d10', x + 10 - k, y + 31, 3, 4); }
      ctx.restore();
    },
  }, {
    name: 'SUPERHOT', ko: 'SHATTERED',
    post(d, W, H) {
      for (let k = 0, o = 0; k < W * H; k++, o += 4) {
        const r = d[o], g = d[o + 1], b = d[o + 2];
        if (r > 110 && r > g * 1.7 && r > b * 1.7) { d[o] = Math.min(255, r * 1.1 + 20); d[o + 1] = g * 0.35; d[o + 2] = b * 0.3; continue; } // red stays red
        const l = lum(d, o), v = 40 + l * 0.85; // everything else: white-to-graphite
        d[o] = v; d[o + 1] = v + 1; d[o + 2] = v + 4;
      }
    },
    overlay(ctx, i) {
      // When time is crawling, the edges of the picture cool to white.
      const sc = KF.engine && KF.engine.scene, k = sc && (sc.stage ? sc.stage.timeK : sc.timeK);
      if (k !== undefined && k < 0.5) {
        const a = (0.5 - k) * 0.5, g = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.35, VW / 2, VH / 2, VW * 0.62);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, `rgba(255,255,255,${a})`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
      }
    },
  });

  // Plain white lettering for the SUPER / HOT chant.
  if (KF.BigText && KF.BigText.STYLES) KF.BigText.STYLES.superhot = { ramp: ['#ffffff', '#ffffff', '#f4f5f7', '#e4e6ea', '#d0d3d9'], out: '#8a8e96', out2: '#ffffff' };
})(window.KF);
