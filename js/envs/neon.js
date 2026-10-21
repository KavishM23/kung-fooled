'use strict';
// Per-stage environments for the neon realm: corrupted memory, a vaporwave sunset, a funhouse
// hall of mirrors and a warehouse seen through a thermal security camera. (Stage 5 keeps the
// crash screen from styles.js.)
(function (KF) {
  const { R, OUT, ditherSky, tiled, wrapX, edges, Art } = KF.ThemeKit;
  const U = KF.util, VW = KF.VIEW_W, VH = KF.VIEW_H, F = KF.Font;
  const checker = (ctx, x, y, w, h, s, a, b) => {
    for (let yy = 0; yy < h; yy += s) for (let xx = 0; xx < w; xx += s) R(ctx, ((xx + yy) / s) % 2 ? a : b, x + xx, y + yy, Math.min(s, w - xx), Math.min(s, h - yy));
  };
  const flippedText = (ctx, text, x, y, color, s = 1) => { // reads correctly once the mirror stage flips it
    ctx.save(); ctx.translate(x, 0); ctx.scale(-1, 1); F.draw(ctx, text, 0, y, color, s, 'center'); ctx.restore();
  };

  // ================= 1. CORRUPTED MEMORY =================
  // A night market that never finished loading: missing textures, duplicated stalls, wireframe
  // placeholders and hex dumps leaking into the sky.
  KF.Env.add('glitch', {
    name: 'CORRUPTED MEMORY', bg: '#06040c',
    signBoard: '#1a1030', signInk: '#5af0ff', signPost: '#ff3ad0', signShade: '#ff3ad0',
    zone: { gravity: '#5adcff', reverse: '#ff3ad0' },
    build() {
      this.sky = ditherSky(['#05030a', '#0a0616', '#120a24', '#1a0e30', '#22103a']);
      const rnd = U.rng(404);
      // Far: building silhouettes; some are wireframe stand-ins, some are missing textures.
      this.far = KF.makeHi(640, VH);
      const f = this.far.getContext('2d');
      for (let x = 0; x < 640;) {
        const w = 18 + Math.floor(rnd() * 30), h = 60 + Math.floor(rnd() * 90), top = VH - h, r = rnd();
        if (r < 0.18) { // wireframe placeholder
          f.strokeStyle = '#2a5a7a'; f.lineWidth = 0.5;
          f.strokeRect(x + 0.25, top + 0.25, w, h); f.beginPath(); f.moveTo(x, top); f.lineTo(x + w, VH); f.moveTo(x + w, top); f.lineTo(x, VH); f.stroke();
        } else if (r < 0.3) { // missing texture
          checker(f, x, top, w, h, 4, '#3a0a3a', '#100410');
        } else {
          R(f, '#160e26', x, top, w, h);
          for (let wy = top + 5; wy < VH - 4; wy += 6) for (let wx = x + 3; wx < x + w - 3; wx += 5) if (rnd() < 0.2) R(f, rnd() < 0.5 ? '#2a2050' : '#3a1a4a', wx, wy, 2, 2);
          if (rnd() < 0.4) { // torn: a slice of the building slipped sideways
            const ty = top + Math.floor(rnd() * h * 0.6), th = 3 + Math.floor(rnd() * 6);
            R(f, '#06040c', x, ty, w, th); R(f, '#1c1232', x + 4 + Math.floor(rnd() * 6), ty, w, th);
          }
        }
        x += w + Math.floor(rnd() * 5);
      }
      // Mid: market stalls, loaded twice, half-loaded or floating where they shouldn't be.
      this.mid = KF.makeHi(768, VH);
      const m = this.mid.getContext('2d');
      this.labels = [];
      const stall = (sx, sy, w, col) => {
        R(m, '#1a1028', sx, sy, w, VH - sy);
        R(m, col, sx - 3, sy - 7, w + 6, 6);
        for (let i = 0; i < w + 6; i += 6) R(m, '#3a3048', sx - 3 + i, sy - 7, 3, 6);
        R(m, '#0c0814', sx - 3, sy - 1, w + 6, 1);
        R(m, '#241838', sx + 3, sy + 4, w - 6, 10);
      };
      for (let x = 10; x < 768;) {
        const w = 40 + Math.floor(rnd() * 26), top = 112 + Math.floor(rnd() * 16), r = rnd();
        const col = ['#2e1028', '#10283a', '#2a2214'][Math.floor(rnd() * 3)];
        if (r < 0.25) { // duplicated: two copies, offset
          stall(x, top, w, col);
          m.globalAlpha = 0.55; stall(x + 9, top - 5, w, col); m.globalAlpha = 1;
        } else if (r < 0.45) { // only the top half loaded
          stall(x, top, w, col);
          checker(m, x - 3, top + 16, w + 6, VH - top - 16, 4, '#5a1450', '#0a0410');
          this.labels.push({ x: x + w / 2, y: top + 24, text: 'NULL' });
        } else if (r < 0.6) { // wireframe placeholder stall
          m.strokeStyle = '#24506a'; m.lineWidth = 0.5;
          m.strokeRect(x + 0.25, top - 7.75, w, VH - top + 8);
          m.beginPath(); m.moveTo(x, top - 8); m.lineTo(x + w, VH); m.moveTo(x + w, top - 8); m.lineTo(x, VH); m.stroke();
          this.labels.push({ x: x + w / 2, y: top + 2, text: 'STALL_04' });
        } else stall(x, top, w, col);
        x += w + 14 + Math.floor(rnd() * 18);
      }
      this.hex = []; // drifting hex dump columns
      for (let i = 0; i < 9; i++) {
        const rows = [];
        for (let k = 0; k < 6; k++) rows.push([0, 1, 2].map(() => Math.floor(rnd() * 256).toString(16).toUpperCase().padStart(2, '0')).join(' '));
        this.hex.push({ x: i * 90 + Math.floor(rnd() * 30), y: 62 + Math.floor(rnd() * 30), rows, sp: 3 + rnd() * 4 });
      }
    },
    background(ctx, cam, t, mood) {
      KF.blit(ctx, this.sky, 0, 0);
      // Loading bar stuck at 99%.
      R(ctx, '#1a1230', 120, 48, 144, 5); R(ctx, '#0a0614', 121, 49, 142, 3); R(ctx, '#2a7a9a', 121, 49, 140, 3);
      F.draw(ctx, 'LOADING WORLD... 99%', VW / 2, 56, Math.floor(t * 2) % 2 ? '#3aa0c0' : '#1a5a7a', 1, 'center');
      for (const h of this.hex) {
        const x = Math.round(wrapX(h.x, cam.x, 0.05, 810)) + 24, y = h.y - ((t * h.sp) % 30);
        if (x < -60 || x > VW) continue;
        h.rows.forEach((row, k) => { ctx.globalAlpha = 0.16 * (1 - Math.abs(k - 2.5) / 3.5); F.draw(ctx, row, x, y + k * 8, '#3aff8a'); });
      }
      ctx.globalAlpha = 1;
      tiled(ctx, this.far, cam.x, 0.1, -10);
      // A rotating wireframe cube: the model that never loaded.
      const cx = 300 - ((cam.x * 0.15) % 520), cy = 86, a = t * 0.8, s = 13;
      if (cx > -30 && cx < VW + 30) {
        const P = [];
        for (const [x, y, z] of [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]]) {
          const rx = x * Math.cos(a) - z * Math.sin(a), rz = x * Math.sin(a) + z * Math.cos(a), ry = y * Math.cos(a * 0.6) - rz * Math.sin(a * 0.6);
          P.push([cx + rx * s, cy + ry * s]);
        }
        ctx.strokeStyle = '#8a2a7a'; ctx.lineWidth = 0.5; ctx.beginPath();
        for (const [i, j] of [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]) { ctx.moveTo(P[i][0], P[i][1]); ctx.lineTo(P[j][0], P[j][1]); }
        ctx.stroke();
        F.draw(ctx, 'MISSING_MODEL', cx, cy + 20, '#8a2a7a', 1, 'center');
      }
      tiled(ctx, this.mid, cam.x, 0.28);
      for (const l of this.labels) {
        const x = Math.round(wrapX(l.x, cam.x, 0.28, 768)) + 24;
        if (x > -30 && x < VW + 30) F.draw(ctx, l.text, x, l.y, '#6a3a7a', 1, 'center');
      }
      R(ctx, '#0c0818', 0, 150, VW, VH - 150);
      // Ground that's half texture, half grid.
      ctx.fillStyle = '#1a2a4a';
      for (let x = -((cam.x * 0.55) % 12); x < VW; x += 12) ctx.fillRect(x, 150, 0.5, VH - 150);
      R(ctx, '#2a3a6a', 0, 150, VW, 1);
      Art.crowd(ctx, cam.x, t, { y: 154, par: 0.55, color: '#160e28', rim: '#3a5a8a', seed: 404, gap: 2, cheer: mood.cheer });
      // Corruption flares: worse right after you die.
      const n = 1 + Math.floor(mood.cheer * 6);
      for (let k = 0; k < n; k++) {
        const h = U.hash2(Math.floor(t * 5) + k * 31, k);
        if (h > 0.35 + mood.cheer * 0.3) continue;
        const x = Math.floor(U.hash2(k, Math.floor(t * 5)) * VW), y = Math.floor(U.hash2(Math.floor(t * 5), k + 9) * 150), w = 8 + Math.floor(h * 40);
        ctx.globalAlpha = 0.6; checker(ctx, x, Math.max(44, y), w, 6 + Math.floor(h * 14), 2, '#ff2ad0', '#000000'); ctx.globalAlpha = 1;
      }
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid' || art === 'ice') {
        const ice = art === 'ice', corrupt = !ice && !e.t && seed < 0.14;
        if (corrupt) checker(ctx, x, y, 16, 16, 4, '#5a1a58', '#10061a');
        else {
          R(ctx, ice ? '#1a4a6a' : '#0e1430', x, y, 16, 16);
          for (let by = 2; by < 16; by += 3) for (let bx = 1; bx < 16; bx += 3) { // stored bits
            const h = U.hash2(Math.floor(seed * 4096) + bx, by);
            R(ctx, h < 0.07 ? (ice ? '#bff4ff' : '#3a8ab0') : h < 0.45 ? (ice ? '#3a7aa0' : '#1c2858') : (ice ? '#24587a' : '#141c40'), x + bx, y + by, 2, 2);
          }
          R(ctx, '#0a0e22', x, y, 1, 16);
        }
        if (e.t) {
          R(ctx, '#f0fcff', x, y, 16, 1); R(ctx, ice ? '#9af4ff' : '#5adcff', x, y + 1, 16, 2); R(ctx, '#1a5a8a', x, y + 3, 16, 1);
          if (seed < 0.3) F.draw(ctx, Math.floor(seed * 999).toString(16).toUpperCase().padStart(2, '0').slice(-2), x + 8, y + 6, '#7ae0ff', 1, 'center');
        }
        edges(ctx, x, y, e, '#000008');
      } else if (art === 'alt') { // missing-texture crate
        checker(ctx, x, y, 16, 16, 8, '#ff2ad0', '#100010');
        R(ctx, '#ffffff', x, y, 16, 1); R(ctx, '#ffffff', x, y, 1, 16); R(ctx, '#ffffff', x + 15, y, 1, 16); R(ctx, '#ffffff', x, y + 15, 16, 1);
        F.draw(ctx, '?', x + 8, y + 5, '#ffffff', 1, 'center');
      } else { // wireframe beam
        R(ctx, '#f0fcff', x, y, 16, 1); R(ctx, '#5adcff', x, y + 1, 16, 1);
        for (let i = 0; i < 16; i += 4) { R(ctx, '#2a7aaa', x + i, y + 2, 2, 1); R(ctx, '#1a4a7a', x + i + 1, y + 3, 1, 2); }
      }
    },
  });

  // ================= 2. VAPORWAVE SUNSET =================
  KF.Env.add('vaporwave', {
    name: 'A E S T H E T I C', bg: '#1a0a3a',
    signBoard: '#f6e8ff', signInk: '#7a2a9a', signPost: '#4ad8d0', signShade: '#d8b0f0',
    zone: { gravity: '#5af0ff', reverse: '#ffe05a' },
    cube: { top: '#ffd0e8', side: '#b86aa8', under: '#5a2a6a', edge: '#2a0a3a' },
    build() {
      this.sky = ditherSky(['#1a0a3a', '#2e0e52', '#4a1466', '#7a1e78', '#b02a7a', '#e04a78', '#ff7a6a', '#ffb070'], VW, 132);
      const s = this.sky.getContext('2d'), rnd = U.rng(88);
      for (let i = 0; i < 40; i++) R(s, '#e8b0ff', Math.floor(rnd() * VW), Math.floor(rnd() * 60), 1, 1);
      // The striped sun, fixed on the horizon.
      for (let y = -46; y <= 0; y++) {
        const w = Math.floor(Math.sqrt(46 * 46 - y * y)), fy = (y + 46) / 46;
        if (y > -26 && ((y + 46) % 6) < 1 + fy * 3) continue;
        const c = fy < 0.33 ? '#ffe86a' : fy < 0.66 ? '#ffb05a' : '#ff6a8a';
        R(s, c, VW / 2 - w, 130 + y, w * 2, 1);
      }
      // Wireframe mountains on the horizon.
      this.far = KF.makeHi(640, VH);
      const f = this.far.getContext('2d');
      const peaks = [];
      for (let x = 0; x <= 640; x += 20) peaks.push([x, 130 - (x % 640 === 0 ? 10 : 6 + Math.floor(rnd() * 34))]);
      peaks[peaks.length - 1][1] = peaks[0][1];
      f.fillStyle = '#2a0a4a'; f.beginPath(); f.moveTo(0, 131); for (const [x, y] of peaks) f.lineTo(x, y); f.lineTo(640, 131); f.fill();
      f.strokeStyle = '#5af0ff'; f.lineWidth = 0.5; f.beginPath();
      for (let i = 0; i < peaks.length - 1; i++) {
        const [x0, y0] = peaks[i], [x1, y1] = peaks[i + 1];
        f.moveTo(x0, y0); f.lineTo(x1, y1);
        f.moveTo(x0, y0); f.lineTo((x0 + x1) / 2, 131); f.lineTo(x1, y1);
      }
      f.stroke();
      // Mid: greek columns, marble busts on plinths and palms.
      this.mid = KF.makeHi(768, VH);
      const m = this.mid.getContext('2d');
      const column = (cx, top, h) => {
        R(m, '#e8c8e8', cx - 7, top, 14, 3); R(m, '#fff0ff', cx - 7, top, 14, 1);
        for (let i = 0; i < 10; i++) R(m, i % 3 === 2 ? '#b890c8' : i % 3 === 0 ? '#fff0ff' : '#e0c0e0', cx - 5 + i, top + 3, 1, h - 6);
        R(m, '#d0b0d8', cx - 7, top + h - 3, 14, 3); R(m, '#8a5aa0', cx - 7, top + h - 1, 14, 1);
      };
      const bust = (cx, by) => {
        R(m, '#c8a8d8', cx - 6, by - 10, 12, 10); R(m, '#f0e0f8', cx - 6, by - 10, 12, 1); R(m, '#8a6aa0', cx - 6, by - 1, 12, 1);
        const b = by - 10;
        R(m, '#e8d8f0', cx - 7, b - 6, 14, 6); R(m, '#e8d8f0', cx - 3, b - 9, 6, 3); // shoulders + neck
        R(m, '#f4ecfa', cx - 4, b - 19, 8, 10); R(m, '#e8d8f0', cx - 4, b - 21, 8, 2); // head
        R(m, '#c0a8d0', cx + 3, b - 16, 2, 4); R(m, '#a888c0', cx - 2, b - 15, 2, 1); R(m, '#d0b8e0', cx + 1, b - 12, 2, 1);
        R(m, '#b090c8', cx - 4, b - 21, 8, 1); R(m, '#c8b0d8', cx - 7, b - 6, 1, 6);
      };
      const palm = (px, by) => {
        for (let i = 0; i < 40; i++) R(m, i % 4 === 0 ? '#1a0a2a' : '#2a1240', px + Math.round(Math.sin(i / 14) * 4), by - i, 3, 1);
        const tx = px + Math.round(Math.sin(40 / 14) * 4) + 1, ty = by - 40;
        m.strokeStyle = '#1e3a4a'; m.lineWidth = 2;
        for (const [dx, dy] of [[-16, 6], [-12, -6], [0, -10], [12, -6], [16, 7], [-7, 10], [8, 11]]) { m.beginPath(); m.moveTo(tx, ty); m.quadraticCurveTo(tx + dx * 0.6, ty + dy - 6, tx + dx, ty + dy); m.stroke(); }
      };
      for (let x = 20; x < 768; x += 64) {
        const r = rnd();
        if (r < 0.4) column(x, 92 + Math.floor(rnd() * 10), 58);
        else if (r < 0.7) bust(x, 150);
        else palm(x, 150);
      }
      // Glass window: the floating old-OS dialog.
      this.win = KF.makeHi(96, 58);
      const w = this.win.getContext('2d');
      R(w, '#000000', 0, 0, 96, 58); R(w, '#c8c8d0', 1, 1, 94, 56); R(w, '#ffffff', 1, 1, 94, 1); R(w, '#ffffff', 1, 1, 1, 56);
      R(w, '#3a3aa8', 3, 3, 90, 9); F.draw(w, 'PARADISE.EXE', 5, 4, '#ffffff');
      R(w, '#c8c8d0', 85, 4, 7, 7); R(w, '#000', 86, 10, 6, 1); F.draw(w, 'X', 86, 4, '#000');
      for (let yy = 0; yy < 30; yy++) R(w, yy < 15 ? '#ff8ad0' : '#5ad8e0', 5, 14 + yy, 86, 1);
      checker(w, 5, 29, 86, 15, 3, '#ff8ad0', '#5ad8e0');
      R(w, '#ffe86a', 44, 18, 10, 8);
      R(w, '#e0e0e8', 33, 47, 30, 8); R(w, '#ffffff', 33, 47, 30, 1); F.draw(w, 'OK', 48, 48, '#000', 1, 'center');
    },
    background(ctx, cam, t, mood) {
      KF.blit(ctx, this.sky, 0, 0);
      if (mood.cheer > 0.05) { ctx.globalAlpha = Math.min(0.35, mood.cheer * 0.25); R(ctx, '#ffe86a', 0, 0, VW, 132); ctx.globalAlpha = 1; }
      tiled(ctx, this.far, cam.x, 0.06);
      KF.blit(ctx, this.win, Math.round(250 - ((cam.x * 0.12) % 560) + 140), Math.round(26 + Math.sin(t * 0.8) * 3));
      // Perspective grid floor.
      R(ctx, '#1a0634', 0, 131, VW, VH - 131);
      const hy = 131, vx = VW / 2;
      ctx.strokeStyle = mood.cheer > 0.5 ? '#ffe86a' : '#ff3ad0'; ctx.lineWidth = 0.5; ctx.beginPath();
      const ofs = (cam.x * 0.6) % 24;
      for (let k = -24; k <= 24; k++) { const bx = vx + (k * 24 - ofs) * 6; ctx.moveTo(vx + (bx - vx) * 0.04, hy); ctx.lineTo(bx, VH + 40); }
      for (let k = 0; k < 14; k++) { const z = (k + ((t * 0.6) % 1)) / 14, y = hy + Math.pow(z, 2.2) * (VH - hy + 20); ctx.moveTo(0, y); ctx.lineTo(VW, y); }
      ctx.stroke();
      R(ctx, '#ffb0e0', 0, hy, VW, 0.5);
      tiled(ctx, this.mid, cam.x, 0.3, 4);
      F.draw(ctx, 'V A P O R', Math.round(wrapX(90, cam.x, 0.12, 560)) + 24, 72, '#5af0ff', 1, 'center');
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid' || art === 'alt') {
        const teal = art === 'alt';
        R(ctx, teal ? '#5ad8d0' : '#f4c8e0', x, y, 16, 16);
        if (!teal && !e.t && seed < 0.35) { // fluted column core
          for (let i = 0; i < 16; i++) R(ctx, i % 4 === 0 ? '#c890b8' : i % 4 === 1 ? '#fff0fa' : '#ecc0dc', x + i, y, 1, 16);
        } else {
          const h = Math.floor(seed * 1000);
          ctx.fillStyle = teal ? '#2a9a9a' : '#d088b8';
          for (let i = 0; i < 16; i++) { const vy = Math.round(4 + Math.sin(i * 0.5 + h) * 3 + (h % 7)) % 16; ctx.fillRect(x + i, y + vy, 1, 1); if (h % 3 === 0) ctx.fillRect(x + i, y + (vy + 7) % 16, 1, 1); }
          R(ctx, teal ? '#bff8f4' : '#fff0fa', x + 1 + (h % 11), y + 2 + (h % 9), 2, 1);
        }
        if (e.t) {
          R(ctx, '#ffffff', x, y, 16, 1); R(ctx, teal ? '#ffd0f0' : '#7af0e8', x, y + 1, 16, 2); R(ctx, teal ? '#c06aa8' : '#2a9a9a', x, y + 3, 16, 1);
        }
        edges(ctx, x, y, e, '#5a1a6a');
      } else if (art === 'ice') {
        R(ctx, '#bfe8ff', x, y, 16, 16); R(ctx, '#ffffff', x, y, 16, 2); R(ctx, '#8ab8f0', x, y + 15, 16, 1);
        for (let i = 0; i < 16; i += 5) R(ctx, '#ffffff', x + i, y + 4 + (i % 3), 3, 1);
        edges(ctx, x, y, e, '#3a3a8a');
      } else { // glass shelf
        R(ctx, '#ffffff', x, y, 16, 1); R(ctx, '#7af0e8', x, y + 1, 16, 2); R(ctx, '#2a9a9a', x, y + 3, 16, 1);
        R(ctx, '#ff8ad0', x + 3, y + 4, 1, 3); R(ctx, '#ff8ad0', x + 12, y + 4, 1, 3);
      }
    },
  }, { post: null }); // the world is already pastel; the old luminance remap flattened it

  // ================= 3. HALL OF MIRRORS =================
  KF.Env.add('mirror', {
    name: 'HALL OF MIRRORS', bg: '#140810',
    signBoard: '#ffe8a0', signInk: '#6a1020', signPost: '#8a5a10', signShade: '#c89a30',
    zone: { gravity: '#8ac8ff', reverse: '#ff6ad0' },
    cube: { top: '#ffd860', side: '#8a1a2a', under: '#4a0a14', edge: '#1a0408' },
    build() {
      // Tent wall: red and cream stripes, darkened, with a scalloped valance.
      this.tent = KF.makeHi(VW, VH);
      const tc = this.tent.getContext('2d');
      for (let x = 0; x < VW; x += 12) {
        R(tc, '#4a1420', x, 0, 6, VH); R(tc, '#3a2a2a', x + 6, 0, 6, VH);
        R(tc, '#5a1a28', x + 1, 0, 1, VH); R(tc, '#2a1a1c', x + 11, 0, 1, VH);
      }
      for (let y = 0; y < VH; y++) { tc.globalAlpha = Math.min(0.75, Math.abs(y - 90) / 150); R(tc, '#0a0408', 0, y, VW, 1); }
      tc.globalAlpha = 1;
      for (let x = 0; x < VW; x += 24) {
        tc.fillStyle = (x / 24) % 2 ? '#7a1a2a' : '#c8a868';
        tc.beginPath(); tc.moveTo(x, 0); tc.lineTo(x + 24, 0); tc.lineTo(x + 24, 10); tc.quadraticCurveTo(x + 12, 24, x, 10); tc.fill();
        R(tc, '#ffd860', x, 10, 1, 2);
      }
      // Mirrors: ornate gold frames, each with a warped reflection.
      this.mirrors = KF.makeHi(560, VH);
      const m = this.mirrors.getContext('2d');
      this.glass = [];
      for (let i = 0; i < 5; i++) {
        const cx = 56 + i * 112, top = 70, w = 50, h = 78;
        m.fillStyle = '#5a3a10'; m.beginPath(); m.ellipse(cx, top + h / 2, w / 2 + 6, h / 2 + 6, 0, 0, 7); m.fill();
        m.fillStyle = '#e8b030'; m.beginPath(); m.ellipse(cx, top + h / 2, w / 2 + 4, h / 2 + 4, 0, 0, 7); m.fill();
        m.fillStyle = '#8a5a10'; m.beginPath(); m.ellipse(cx, top + h / 2, w / 2 + 1, h / 2 + 1, 0, 0, 7); m.fill();
        for (let k = 0; k < 16; k++) { // beading on the frame
          const a = (k / 16) * Math.PI * 2;
          R(m, '#ffe8a0', cx + Math.cos(a) * (w / 2 + 3) - 1, top + h / 2 + Math.sin(a) * (h / 2 + 3) - 1, 2, 2);
        }
        R(m, '#e8b030', cx - 8, top - 12, 16, 8); R(m, '#ffe8a0', cx - 6, top - 11, 12, 2); R(m, '#8a5a10', cx - 8, top - 5, 16, 1); // crest
        R(m, '#e8b030', cx - 2, top - 16, 4, 4);
        m.globalCompositeOperation = 'destination-out'; m.beginPath(); m.ellipse(cx, top + h / 2, w / 2, h / 2, 0, 0, 7); m.fill(); m.globalCompositeOperation = 'source-over';
        this.glass.push({ cx, top, w, h, kind: i });
      }
    },
    background(ctx, cam, t, mood) {
      KF.blit(ctx, this.tent, 0, 0);
      const off = Math.round(-((cam.x * 0.3) % 560));
      for (const ox of [off, off + 560]) {
        if (ox > VW || ox < -560) continue;
        for (const g of this.glass) {
          const gx = g.cx + ox;
          if (gx < -40 || gx > VW + 40) continue;
          ctx.save();
          ctx.beginPath(); ctx.ellipse(gx, g.top + g.h / 2, g.w / 2, g.h / 2, 0, 0, 7); ctx.clip();
          const gr = ctx.createLinearGradient(gx - g.w / 2, 0, gx + g.w / 2, 0);
          gr.addColorStop(0, '#3a4a5a'); gr.addColorStop(0.5, '#8a9ab0'); gr.addColorStop(1, '#2a3444');
          ctx.fillStyle = gr; ctx.fillRect(gx - g.w / 2, g.top, g.w, g.h);
          // A warped silhouette: tall and thin, short and wide, or wobbling.
          const wob = Math.sin(t * 1.5 + g.kind), sx = [0.6, 1.7, 1 + wob * 0.3, 0.8, 1.3][g.kind], sy = [1.5, 0.6, 1 - wob * 0.2, 1.2, 0.8][g.kind];
          ctx.fillStyle = '#1a2230';
          const fy = g.top + g.h - 10, bw = 10 * sx, bh = 30 * sy;
          ctx.beginPath(); ctx.ellipse(gx, fy - bh - 7 * sy, 6 * sx, 7 * sy, 0, 0, 7); ctx.fill();
          ctx.fillRect(gx - bw / 2, fy - bh, bw, bh);
          ctx.fillRect(gx - bw / 2 - 3 * sx, fy - bh + 2, 3 * sx, bh * 0.6); ctx.fillRect(gx + bw / 2, fy - bh + 2, 3 * sx, bh * 0.6);
          // Moving glint.
          const gl = ((t * 30 + g.kind * 37) % 120) - 30;
          ctx.globalAlpha = 0.35; ctx.fillStyle = '#ffffff';
          ctx.beginPath(); ctx.moveTo(gx - g.w / 2 + gl, g.top); ctx.lineTo(gx - g.w / 2 + gl + 8, g.top); ctx.lineTo(gx - g.w / 2 + gl - 12, g.top + g.h); ctx.lineTo(gx - g.w / 2 + gl - 20, g.top + g.h); ctx.fill();
          ctx.globalAlpha = 1;
          ctx.restore();
        }
        KF.blit(ctx, this.mirrors, ox, 0);
      }
      // Marquee: bulbs chase faster when the crowd reacts. Text pre-flipped so it reads right.
      R(ctx, '#2a0a10', VW / 2 - 80, 42, 160, 18); R(ctx, '#e8b030', VW / 2 - 80, 42, 160, 1); R(ctx, '#e8b030', VW / 2 - 80, 59, 160, 1);
      flippedText(ctx, 'HALL OF MIRRORS', VW / 2, 48, '#ffe8a0');
      const speed = 6 + mood.cheer * 20;
      for (let k = 0; k < 40; k++) {
        const x = VW / 2 - 78 + (k % 20) * 8.2, y = k < 20 ? 44 : 58;
        const on = (k + Math.floor(t * speed)) % 3 === 0;
        R(ctx, on ? '#fff6c0' : '#7a5a20', x, y - 1, 2, 2);
      }
      // String of bulbs along the tent.
      for (let i = 0; i < 32; i++) {
        const x = Math.round(wrapX(i * 14, cam.x, 0.45, 448)) + 24, sag = Math.sin(((i * 14) % 112) / 112 * Math.PI) * 6;
        if (x < -4 || x > VW + 4) continue;
        R(ctx, '#1a0a0a', x, 14 + sag, 14, 0.5);
        const on = (i + Math.floor(t * speed * 0.6)) % 4 !== 0;
        if (on) { ctx.globalAlpha = 0.25; R(ctx, '#ffd860', x - 2, 13 + sag, 5, 5); ctx.globalAlpha = 1; }
        R(ctx, on ? '#ffe890' : '#6a4a20', x - 1, 15 + sag, 2, 2);
      }
      // Checkered carnival floor.
      R(ctx, '#140810', 0, 152, VW, VH - 152);
      const fo = (cam.x * 0.6) % 16;
      for (let y = 152, r = 0; y < VH; y += 8, r++) for (let x = -fo - 16; x < VW; x += 16) R(ctx, '#2a1a20', x + (r % 2) * 8, y, 8, 8);
      R(ctx, '#c89a30', 0, 152, VW, 1);
      Art.crowd(ctx, cam.x, t, { y: 160, par: 0.6, color: '#1e0e16', rim: '#6a3a2a', seed: 77, hats: 0.3, cheer: mood.cheer });
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid') { // red velvet with gold trim
        R(ctx, '#7a1424', x, y, 16, 16);
        for (let k = 0; k < 2; k++) for (let j = 0; j < 2; j++) { // quilted diamonds
          const cx = x + 4 + j * 8, cy = y + 4 + k * 8;
          R(ctx, '#9a2032', cx - 2, cy - 1, 4, 2); R(ctx, '#9a2032', cx - 1, cy - 2, 2, 4); R(ctx, '#e8b030', cx, cy, 1, 1);
        }
        R(ctx, '#4a0a16', x, y + 15, 16, 1);
        if (e.t) { R(ctx, '#fff0a0', x, y, 16, 1); R(ctx, '#e8b030', x, y + 1, 16, 2); R(ctx, '#8a5a10', x, y + 3, 16, 1); for (let i = 2; i < 16; i += 6) R(ctx, '#fff0a0', x + i, y + 1, 1, 1); }
        edges(ctx, x, y, e, '#2a0408');
      } else if (art === 'alt') { // circus drum
        for (let i = 0; i < 16; i += 4) { R(ctx, '#2a4aa8', x + i, y, 2, 16); R(ctx, '#f0e8d8', x + i + 2, y, 2, 16); }
        R(ctx, '#e8b030', x, y, 16, 2); R(ctx, '#e8b030', x, y + 14, 16, 2); R(ctx, '#fff0a0', x, y, 16, 1);
        R(ctx, '#ffe860', x + 7, y + 6, 2, 4); R(ctx, '#ffe860', x + 6, y + 7, 4, 2);
        edges(ctx, x, y, e, '#1a0a20');
      } else if (art === 'ice') { // polished mirror glass
        R(ctx, '#7a8aa0', x, y, 16, 16); R(ctx, '#aab8c8', x, y, 8, 16); R(ctx, '#d8e4f0', x + 2, y + 2, 2, 12);
        R(ctx, '#ffffff', x, y, 16, 1); R(ctx, '#e8b030', x, y + 1, 16, 1); edges(ctx, x, y, e, '#2a2a3a');
      } else { // gold rail with bulbs
        R(ctx, '#fff0a0', x, y, 16, 1); R(ctx, '#e8b030', x, y + 1, 16, 2); R(ctx, '#8a5a10', x, y + 3, 16, 1);
        R(ctx, '#ffe890', x + 3, y + 4, 2, 2); R(ctx, '#ffe890', x + 11, y + 4, 2, 2);
      }
    },
  });

  // ================= 4. THERMAL SECURITY CAMERA =================
  // Drawn in greys: the thermal pass maps brightness to heat, so luminance here IS temperature.
  // Cold walls are near black, racks are cool, vents/engines/guards are hot.
  const heat = (v) => { const h = Math.round(U.clamp(v, 0, 255)).toString(16).padStart(2, '0'); return '#' + h + h + h; };
  KF.Env.add('thermal', {
    name: 'CAMERA 04', bg: heat(14),
    signBoard: heat(150), signInk: heat(20), signPost: heat(70), signShade: heat(110),
    zone: { gravity: heat(140), reverse: heat(200) },
    cube: { top: heat(150), side: heat(80), under: heat(40), edge: heat(10) },
    build() {
      const rnd = U.rng(4);
      this.back = KF.makeHi(640, VH);
      const b = this.back.getContext('2d');
      R(b, heat(14), 0, 0, 640, VH);
      for (let x = 0; x < 640; x += 80) { R(b, heat(30), x, 0, 6, 150); R(b, heat(22), x + 6, 0, 1, 150); } // wall pillars
      for (let x = 0; x < 640; x += 4) R(b, heat(20), x, 8, 2, 1); // roof truss
      b.strokeStyle = heat(26); b.lineWidth = 0.5; b.beginPath();
      for (let x = 0; x < 640; x += 40) { b.moveTo(x, 8); b.lineTo(x + 20, 22); b.lineTo(x + 40, 8); }
      b.moveTo(0, 22); b.lineTo(640, 22); b.stroke();
      // Pallet racking with boxes.
      this.vents = []; this.lamps = [];
      for (let x = 10; x < 640; x += 104) {
        for (const px of [0, 70]) R(b, heat(48), x + px, 50, 3, 100);
        for (let sy = 62; sy < 150; sy += 28) {
          R(b, heat(56), x, sy, 73, 2);
          for (let bx = x + 4; bx < x + 66;) {
            const bw = 8 + Math.floor(rnd() * 10), bh = 8 + Math.floor(rnd() * 14);
            if (rnd() < 0.8) R(b, heat(34 + Math.floor(rnd() * 14)), bx, sy - bh, bw, bh);
            bx += bw + 2;
          }
        }
        this.vents.push({ x: x + 86, y: 34 });
        this.lamps.push({ x: x + 36 });
      }
    },
    background(ctx, cam, t, mood) {
      tiled(ctx, this.back, cam.x, 0.3);
      // Ceiling lamps (warm) and wall vents breathing warm air.
      for (const l of this.lamps) {
        const x = Math.round(wrapX(l.x, cam.x, 0.3, 640)) + 24;
        if (x < -20 || x > VW + 20) continue;
        R(ctx, heat(60), x - 0.25, 22, 0.5, 10); R(ctx, heat(210), x - 4, 32, 8, 2);
        ctx.globalAlpha = 0.12; ctx.fillStyle = heat(255); ctx.beginPath(); ctx.moveTo(x - 4, 34); ctx.lineTo(x + 4, 34); ctx.lineTo(x + 22, 150); ctx.lineTo(x - 22, 150); ctx.fill(); ctx.globalAlpha = 1;
      }
      for (const v of this.vents) {
        const x = Math.round(wrapX(v.x, cam.x, 0.3, 640)) + 24;
        if (x < -20 || x > VW + 20) continue;
        R(ctx, heat(160), x, v.y, 12, 8); for (let k = 0; k < 4; k++) R(ctx, heat(110), x + 1, v.y + 1 + k * 2, 10, 1);
        for (let k = 0; k < 4; k++) {
          const age = (t * 0.5 + k / 4) % 1;
          ctx.globalAlpha = 0.25 * (1 - age); R(ctx, heat(190), x + 2 + Math.sin(t + k) * 3, v.y - age * 26, 8 + age * 6, 5); ctx.globalAlpha = 1;
        }
      }
      // Forklift parked between the racks: engine block runs hot.
      const fx = Math.round(wrapX(300, cam.x, 0.45, 700)) + 24;
      if (fx > -60 && fx < VW + 20) {
        R(ctx, heat(70), fx, 120, 34, 22); R(ctx, heat(60), fx + 4, 104, 2, 16); R(ctx, heat(60), fx + 22, 104, 2, 16); R(ctx, heat(60), fx + 4, 104, 20, 2);
        R(ctx, heat(205 + Math.sin(t * 5) * 10), fx + 20, 124, 12, 12); // engine
        R(ctx, heat(80), fx - 14, 98, 2, 46); R(ctx, heat(80), fx - 16, 140, 16, 2); // mast + forks
        R(ctx, heat(40), fx + 2, 140, 10, 10); R(ctx, heat(40), fx + 22, 140, 10, 10);
        R(ctx, heat(150), fx + 30, 116, 3, 4); // exhaust
      }
      // Guards on patrol: warm bodies. They stop and look when something happens.
      for (let g = 0; g < 2; g++) {
        const span = 260, walk = mood.cheer > 0.3 ? 0 : t * 12;
        const wx = g * 340 + Math.abs(((walk + g * 90) % (span * 2)) - span);
        const x = Math.round(wrapX(wx, cam.x, 0.45, 700)) + 24;
        if (x < -10 || x > VW + 10) continue;
        const bob = mood.cheer > 0.3 ? 0 : Math.abs(Math.sin(t * 6 + g)) * 1;
        R(ctx, heat(185), x - 3, 120 - bob, 6, 7); // head
        R(ctx, heat(165), x - 5, 127 - bob, 10, 14); // torso
        R(ctx, heat(150), x - 4, 141, 3, 9); R(ctx, heat(150), x + 1, 141, 3, 9);
        if (mood.cheer > 0.3) { ctx.globalAlpha = 0.25; ctx.fillStyle = heat(240); ctx.beginPath(); ctx.moveTo(x + 4, 125); ctx.lineTo(x + 70, 110); ctx.lineTo(x + 70, 140); ctx.fill(); ctx.globalAlpha = 1; }
      }
      R(ctx, heat(26), 0, 150, VW, VH - 150);
      const fo = (cam.x * 0.6) % 32;
      for (let x = -fo; x < VW; x += 32) R(ctx, heat(36), x, 150, 1, VH - 150);
      R(ctx, heat(44), 0, 150, VW, 1);
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid' || art === 'ice') { // concrete slab, cool; top edge reads warm
        const base = art === 'ice' ? 70 : 96;
        R(ctx, heat(base), x, y, 16, 16);
        for (let k = 0; k < 6; k++) { const h = U.hash2(Math.floor(seed * 999), k); R(ctx, heat(base + (h < 0.5 ? -14 : 12)), x + Math.floor(h * 14), y + 3 + k * 2, 2, 1); }
        R(ctx, heat(base - 30), x, y + 15, 16, 1); R(ctx, heat(base - 20), x + 15, y, 1, 16);
        if (e.t) { R(ctx, heat(art === 'ice' ? 255 : 225), x, y, 16, 1); R(ctx, heat(170), x, y + 1, 16, 2); R(ctx, heat(60), x, y + 3, 16, 1); }
        edges(ctx, x, y, e, heat(8));
      } else if (art === 'alt') { // steel rack shelf with a crate
        R(ctx, heat(40), x, y, 16, 16);
        R(ctx, heat(120), x, y, 2, 16); R(ctx, heat(120), x + 14, y, 2, 16); R(ctx, heat(130), x, y + 7, 16, 2);
        R(ctx, heat(78), x + 3, y + 10, 10, 5); R(ctx, heat(64), x + 4, y + 2, 8, 5);
        if (e.t) R(ctx, heat(225), x, y, 16, 1);
        edges(ctx, x, y, e, heat(8));
      } else { // steel grate catwalk
        R(ctx, heat(225), x, y, 16, 1); R(ctx, heat(150), x, y + 1, 16, 1);
        for (let i = 0; i < 16; i += 3) R(ctx, heat(110), x + i, y + 2, 1, 2);
        R(ctx, heat(90), x, y + 4, 16, 1);
      }
    },
  });
  // Security-camera framing on top of the thermal HUD.
  const thermalHUD = KF.Styles.all.thermal.overlay;
  KF.Styles.all.thermal.overlay = function (ctx, i) {
    thermalHUD(ctx, i);
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 0.5; ctx.beginPath();
    for (const [x, y, dx, dy] of [[8, 46, 1, 1], [VW - 8, 46, -1, 1], [8, VH - 8, 1, -1], [VW - 8, VH - 8, -1, -1]]) {
      ctx.moveTo(x, y + dy * 12); ctx.lineTo(x, y); ctx.lineTo(x + dx * 12, y);
    }
    ctx.stroke();
    const tx = VW / 2 - F.measure('REC  CAM 04 - WAREHOUSE B') / 2; // bottom centre stays clear in stages and fights
    if (Math.floor(i.t * 1.5) % 2) { ctx.fillStyle = '#ff3030'; ctx.beginPath(); ctx.arc(tx - 6, VH - 18, 2.5, 0, 7); ctx.fill(); }
    F.draw(ctx, 'REC  CAM 04 - WAREHOUSE B', tx, VH - 21, '#ffffff', 1, 'left', '#000');
  };
})(window.KF);
