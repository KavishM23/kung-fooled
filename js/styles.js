'use strict';
// Visual styles: every stage has its own look. A style can
//   post(d, W, H, info)   rework the rendered world's pixels (d = RGBA bytes, W x H real pixels)
//   under(ctx, info)      draw over the world but below the HUD (letterbox bars, frames)
//   overlay(ctx, info)    draw over everything, HUD included (scanlines, grain, vignettes)
//   compose(ctx, canvas, info)  present the world canvas itself differently (mirror, AR warp)
//   theme                 swap the stage's tile/background art (text mode, crash screen)
//   res                   1 = render the world chunky (retro palettes), 2 = full detail
//   extrude               draw solid tiles as 3D blocks
//   light                 darkness with a light radius around the player { r, color, min }
//   ko / koCard           what a death says;  audio: { lowpass }  muffles the sound
// info: { t, frame, res, player: {x, y} (logical screen px), rnd() (per-frame random), fight (true in fights: keep clear of the meters) }
(function (KF) {
  const VW = KF.VIEW_W, VH = KF.VIEW_H, U = KF.util;
  const F = () => KF.Font;
  const R = (ctx, c, x, y, w = 1, h = 1) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

  // ---------- pixel helpers ----------
  const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.5);
  const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];
  function gradient(stops) { // [[pos, '#hex'], ...] -> 256 x RGB lookup
    const lut = new Uint8Array(768), s = stops.map(([p, h]) => [p, rgb(h)]);
    for (let i = 0; i < 256; i++) {
      const f = i / 255;
      let k = 0;
      while (k < s.length - 2 && f > s[k + 1][0]) k++;
      const [p0, c0] = s[k], [p1, c1] = s[k + 1], u = U.clamp((f - p0) / ((p1 - p0) || 1), 0, 1);
      for (let j = 0; j < 3; j++) lut[i * 3 + j] = Math.round(c0[j] + (c1[j] - c0[j]) * u);
    }
    return lut;
  }
  const lum = (d, o) => (d[o] * 77 + d[o + 1] * 150 + d[o + 2] * 29) >> 8;
  function lumArray(d, n) { const L = new Uint8Array(n); for (let i = 0; i < n; i++) L[i] = lum(d, i * 4); return L; }
  function sobel(L, W, H) {
    const E = new Uint8Array(W * H);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      const gx = -L[i - W - 1] - 2 * L[i - 1] - L[i + W - 1] + L[i - W + 1] + 2 * L[i + 1] + L[i + W + 1];
      const gy = -L[i - W - 1] - 2 * L[i - W] - L[i - W + 1] + L[i + W - 1] + 2 * L[i + W] + L[i + W + 1];
      E[i] = Math.min(255, (Math.abs(gx) + Math.abs(gy)) >> 2);
    }
    return E;
  }
  // Precomputed noise: per-pixel hashing is too slow for full-resolution grain every frame.
  const NOISE = new Float32Array(1 << 18), NM = (1 << 18) - 1;
  { const r = U.rng(1234); for (let i = 0; i < NOISE.length; i++) NOISE[i] = r(); }
  const hashNoise = (x, y, s) => NOISE[(x * 7 + y * 977 + s * 7919) & NM];
  function mapLum(d, n, lut, contrast = 1, grain = 0, seed = 0, W = 1) {
    for (let i = 0; i < n; i++) {
      const o = i * 4;
      let l = lum(d, o);
      if (contrast !== 1) l = (l - 128) * contrast + 128;
      if (grain) l += (NOISE[(i + seed * 7919) & NM] - 0.5) * grain;
      l = l < 0 ? 0 : l > 255 ? 255 : l | 0;
      d[o] = lut[l * 3]; d[o + 1] = lut[l * 3 + 1]; d[o + 2] = lut[l * 3 + 2];
    }
  }
  function paletteDither(d, W, H, pal, spread) { // ordered-dither luminance into a small palette
    const P = pal.map(rgb), n = P.length;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4;
      const v = U.clamp(lum(d, o) / 255 + bayer(x, y) * spread, 0, 0.999);
      const c = P[Math.floor(v * n)];
      d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2];
    }
  }
  function nearestPalette(pal) { // 15-bit RGB -> nearest palette colour
    const P = pal.map(rgb), lut = new Uint32Array(32768);
    for (let i = 0; i < 32768; i++) {
      const r = (i >> 10) << 3, g = ((i >> 5) & 31) << 3, b = (i & 31) << 3;
      let best = 0, bd = 1e9;
      P.forEach((c, k) => { const dd = (c[0] - r) ** 2 * 0.3 + (c[1] - g) ** 2 * 0.59 + (c[2] - b) ** 2 * 0.11; if (dd < bd) { bd = dd; best = k; } });
      const c = P[best]; lut[i] = (c[0] << 16) | (c[1] << 8) | c[2];
    }
    return (d, o) => { const c = lut[((d[o] >> 3) << 10) | ((d[o + 1] >> 3) << 5) | (d[o + 2] >> 3)]; d[o] = c >> 16; d[o + 1] = (c >> 8) & 255; d[o + 2] = c & 255; };
  }
  function lightRadius(d, W, H, info, r0, r1, min, tint) {
    const res = info.res, px = info.player.x * res, py = info.player.y * res, a = r0 * res, b = r1 * res, far = (a + b) * (a + b), near = a * a;
    const m0 = min * tint[0], m1 = min * tint[1], m2 = min * tint[2];
    for (let y = 0; y < H; y++) {
      const dy2 = (y - py) * (y - py);
      for (let x = 0, o = y * W * 4; x < W; x++, o += 4) {
        const d2 = (x - px) * (x - px) + dy2;
        if (d2 >= far) { d[o] *= m0; d[o + 1] *= m1; d[o + 2] *= m2; continue; }
        const k = d2 <= near ? 1 : Math.max(min, 1 - (Math.sqrt(d2) - a) / b);
        d[o] *= k * tint[0]; d[o + 1] *= k * tint[1]; d[o + 2] *= k * tint[2];
      }
    }
  }

  // ---------- reusable overlays ----------
  function scanlines(ctx, alpha = 0.2) { ctx.fillStyle = `rgba(0,0,0,${alpha})`; for (let y = 0; y < VH; y += 1) ctx.fillRect(0, y + 0.5, VW, 0.5); }
  const vignettes = {};
  function vignette(ctx, color = '0,0,0', strength = 0.65, inner = 0.45) {
    const key = color + strength + inner;
    if (!vignettes[key]) {
      const c = KF.makeHi(VW, VH, 1), x = c.getContext('2d');
      const g = x.createRadialGradient(VW / 2, VH / 2, VH * inner, VW / 2, VH / 2, VW * 0.62);
      g.addColorStop(0, `rgba(${color},0)`); g.addColorStop(1, `rgba(${color},${strength})`);
      x.fillStyle = g; x.fillRect(0, 0, VW, VH);
      vignettes[key] = c;
    }
    ctx.imageSmoothingEnabled = true; KF.blit(ctx, vignettes[key], 0, 0); ctx.imageSmoothingEnabled = false;
  }
  function grainDots(ctx, info, n, color) { for (let i = 0; i < n; i++) R(ctx, color, info.rnd() * VW, info.rnd() * VH, 0.5, 0.5); }
  function frame(ctx, w, color, inner) { R(ctx, color, 0, 0, VW, w); R(ctx, color, 0, VH - w, VW, w); R(ctx, color, 0, 0, w, VH); R(ctx, color, VW - w, 0, w, VH); if (inner) { ctx.strokeStyle = inner; ctx.lineWidth = 0.5; ctx.strokeRect(w + 0.5, w + 0.5, VW - w * 2 - 1, VH - w * 2 - 1); } }

  const LUT = {
    gray: gradient([[0, '#000000'], [1, '#ffffff']]),
    sepia: gradient([[0, '#160c06'], [0.45, '#6e4e30'], [0.8, '#d0b48a'], [1, '#f6e8c8']]),
    thermal: gradient([[0, '#000010'], [0.22, '#2a0a7a'], [0.42, '#a0207a'], [0.6, '#f04a1a'], [0.8, '#ffd02a'], [1, '#ffffff']]),
    night: gradient([[0, '#000800'], [0.35, '#0a3a0a'], [0.7, '#3aff5a'], [1, '#e8ffe8']]),
    vapor: gradient([[0, '#1a0a3a'], [0.35, '#7a2a9a'], [0.6, '#ff5ab0'], [0.82, '#5af0ff'], [1, '#ffffff']]),
    duo: gradient([[0, '#2a1050'], [1, '#ffb07a']]),
    gold: gradient([[0, '#120a02'], [0.4, '#6a4a10'], [0.75, '#e0b040'], [1, '#fff8d8']]),
    candle: gradient([[0, '#0a0402'], [0.5, '#8a4a1a'], [0.85, '#ffc070'], [1, '#fff0c8']]),
  };
  let NES = null, UKIYO = null;

  const S = {};

  S.hd = { name: 'HIGH DEFINITION' };

  S.oldtv = {
    name: 'OLD TV', ko: 'CUT!', audio: { lowpass: 2600 },
    post(d, W, H, i) { mapLum(d, W * H, LUT.gray, 1.25, 38, i.frame, W); },
    overlay(ctx, i) {
      scanlines(ctx, 0.25);
      const y = (i.t * 30) % (VH + 40) - 20; ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(0, y, VW, 14);
      if (i.rnd() < 0.08) { ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(0, 0, VW, VH); }
      vignette(ctx, '0,0,0', 0.8, 0.35);
      ctx.strokeStyle = '#000'; ctx.lineWidth = 10; ctx.beginPath(); ctx.roundRect(-4, -4, VW + 8, VH + 8, 26); ctx.stroke();
      F().draw(ctx, 'CH 3', 12, VH - 20, 'rgba(255,255,255,0.6)');
    },
  };

  S.silent = {
    name: 'SILENT FILM', koCard: ['ALAS!', 'OUR HERO HAS PERISHED.'], audio: { lowpass: 1700 },
    post(d, W, H, i) { mapLum(d, W * H, LUT.sepia, 1.2 + (i.rnd() - 0.5) * 0.08, 34, i.frame, W); },
    overlay(ctx, i) {
      for (let k = 0; k < 2; k++) if (i.rnd() < 0.7) R(ctx, i.rnd() < 0.5 ? 'rgba(30,20,10,0.45)' : 'rgba(255,245,220,0.35)', i.rnd() * VW, 0, 0.5, VH);
      for (let k = 0; k < 8; k++) R(ctx, 'rgba(20,12,6,0.7)', i.rnd() * VW, i.rnd() * VH, 0.5 + i.rnd(), 0.5 + i.rnd());
      vignette(ctx, '20,10,4', 0.95, 0.25);
    },
  };

  S.comic = {
    name: 'COMIC', ko: 'POW!',
    post(d, W, H, i) {
      const n = W * H, L = lumArray(d, n), E = sobel(L, W, H);
      for (let k = 0; k < n; k++) {
        const o = k * 4, x = k % W, y = (k / W) | 0;
        for (let j = 0; j < 3; j++) d[o + j] = Math.min(255, Math.round(d[o + j] / 64) * 72);
        const l = L[k];
        if (l < 120) { const cx = (x % 6) - 2.5, cy = (y % 6) - 2.5; if (cx * cx + cy * cy < (1 - l / 120) * 9) { d[o] *= 0.5; d[o + 1] *= 0.5; d[o + 2] *= 0.55; } }
        if (E[k] > 52) { d[o] = 12; d[o + 1] = 8; d[o + 2] = 16; }
      }
    },
    under(ctx) { frame(ctx, 4, '#f8f4e8'); ctx.strokeStyle = '#0c0810'; ctx.lineWidth = 2; ctx.strokeRect(5, 5, VW - 10, VH - 10); },
  };

  S.gameboy = {
    name: 'POCKET MONOCHROME', res: 1,
    post(d, W, H) { paletteDither(d, W, H, ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'], 0.22); },
    overlay(ctx) { ctx.fillStyle = 'rgba(15,56,15,0.16)'; for (let x = 0; x < VW; x++) ctx.fillRect(x + 0.75, 0, 0.25, VH); for (let y = 0; y < VH; y++) ctx.fillRect(0, y + 0.75, VW, 0.25); },
  };

  S.vhs = {
    name: 'VHS', ko: 'STOP', audio: { lowpass: 5200 },
    post(d, W, H, i) {
      const src = d.slice(), seed = Math.floor(i.t * 6);
      const band = ((i.t * 50) % (H + 60)) - 30;
      for (let y = 0; y < H; y++) {
        const jitter = Math.abs(y - band) < 14 ? Math.round((hashNoise(y, seed, 3) - 0.5) * 14) : (hashNoise(y, seed, 1) < 0.02 ? 4 : 0);
        for (let x = 0; x < W; x++) {
          const o = (y * W + x) * 4, sx = U.clamp(x + jitter, 0, W - 1);
          const r = (y * W + U.clamp(sx - 3, 0, W - 1)) * 4, b = (y * W + U.clamp(sx + 2, 0, W - 1)) * 4, g = (y * W + sx) * 4;
          const l = lum(src, g);
          d[o] = src[r] * 0.8 + l * 0.2; d[o + 1] = src[g + 1] * 0.8 + l * 0.2; d[o + 2] = src[b + 2] * 0.8 + l * 0.2;
          if (Math.abs(y - band) < 2) { d[o] += 60; d[o + 1] += 60; d[o + 2] += 60; }
        }
      }
    },
    overlay(ctx, i) {
      scanlines(ctx, 0.12);
      F().draw(ctx, 'PLAY >', 14, 40, '#ffffff', 1, 'left', '#000');
      const s = Math.floor(i.t), ts = `SP ${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
      F().draw(ctx, ts, VW - 14, VH - 22, '#ffffff', 1, 'right', '#000');
    },
  };

  S.blueprint = {
    name: 'BLUEPRINT',
    post(d, W, H) {
      const n = W * H, L = lumArray(d, n), E = sobel(L, W, H);
      for (let k = 0; k < n; k++) {
        const o = k * 4, e = Math.min(1, E[k] / 70), f = L[k] * 0.1;
        d[o] = 22 + f + (236 - 22) * e; d[o + 1] = 70 + f + (244 - 70) * e; d[o + 2] = 150 + f * 0.6 + (255 - 150) * e;
      }
    },
    under(ctx) {
      ctx.fillStyle = 'rgba(220,235,255,0.07)';
      for (let x = 0; x < VW; x += 4) ctx.fillRect(x, 0, 0.5, VH);
      for (let y = 0; y < VH; y += 4) ctx.fillRect(0, y, VW, 0.5);
      ctx.fillStyle = 'rgba(220,235,255,0.16)';
      for (let x = 0; x < VW; x += 16) ctx.fillRect(x, 0, 0.5, VH);
      for (let y = 0; y < VH; y += 16) ctx.fillRect(0, y, VW, 0.5);
      ctx.strokeStyle = 'rgba(230,240,255,0.7)'; ctx.lineWidth = 0.5; ctx.strokeRect(VW - 92.5, VH - 30.5, 86, 24);
      F().draw(ctx, 'DWG NO. 2-2', VW - 88, VH - 27, '#dfeaff'); F().draw(ctx, 'NOT TO SCALE', VW - 88, VH - 17, '#dfeaff');
    },
  };

  // Phone-camera AR parody: the stage is a tilted plane over a "camera feed", with a phone UI.
  let feed = null;
  S.pocket = {
    name: 'AR MODE', ko: 'IT FLED!',
    compose(ctx, wc, i) {
      if (!feed) {
        feed = KF.makeHi(VW, VH); const x = feed.getContext('2d');
        const g = x.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#8aa4b8'); g.addColorStop(0.45, '#c8d0d0'); g.addColorStop(1, '#7a8478');
        x.fillStyle = g; x.fillRect(0, 0, VW, VH);
        const rnd = U.rng(5);
        for (let k = 0; k < 14; k++) { x.fillStyle = `rgba(${90 + rnd() * 60},${90 + rnd() * 50},${100 + rnd() * 40},0.8)`; const w = 30 + rnd() * 60, h = 30 + rnd() * 70; x.fillRect(rnd() * VW, 70 - h, w, h + 6); }
        x.fillStyle = '#6a6e66'; x.fillRect(0, 70, VW, VH);
        x.fillStyle = 'rgba(255,255,255,0.25)'; for (let k = 0; k < 9; k++) x.fillRect(VW / 2 - 2 + (k - 4) * 2, 80 + k * 15, 4 + k, 8);
      }
      KF.blit(ctx, feed, 0, 0);
      const top = 46, res = wc.width / VW;
      for (let y = top; y < VH; y += 0.5) { // tilted plane, drawn one real pixel row at a time
        const tt = (y - top) / (VH - top), sy = VH * (1 - Math.pow(1 - tt, 1.7)), s = U.lerp(0.58, 1.1, tt);
        ctx.drawImage(wc, 0, Math.floor(sy * res), wc.width, 1, VW / 2 - VW * s / 2, y, VW * s, 0.5);
      }
      ctx.globalAlpha = 0.35; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, top, VW, 0.5); ctx.globalAlpha = 1;
    },
    overlay(ctx, i) {
      ctx.strokeStyle = '#111'; ctx.lineWidth = 7; ctx.beginPath(); ctx.roundRect(1, 1, VW - 2, VH - 2, 18); ctx.stroke();
      R(ctx, 'rgba(0,0,0,0.55)', 0, VH - 16, VW, 16);
      F().draw(ctx, `STEPS ${Math.floor(i.player.worldX / 8)}`, 14, VH - 11, '#ffffff');
      F().draw(ctx, 'AR ON', VW - 14, VH - 11, '#7cff6a', 1, 'right');
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(VW / 2, VH - 20, 9, 0, 7); ctx.fill();
      ctx.fillStyle = '#e02828'; ctx.beginPath(); ctx.arc(VW / 2, VH - 20, 8, Math.PI, 0); ctx.fill();
      R(ctx, '#111', VW / 2 - 8, VH - 21, 16, 1.5); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(VW / 2, VH - 20, 2.5, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 0.5; ctx.strokeRect(VW / 2 - 12, VH / 2 - 12, 24, 24);
    },
  };

  S.noir = {
    name: 'NOIR', ko: 'THE END',
    post(d, W, H, i) {
      mapLum(d, W * H, LUT.gray, 1.6, 20, i.frame, W);
      if (!(i.t % 6 < 0.12)) lightRadius(d, W, H, i, 46, 70, 0.1, [1, 1, 1]); // lightning lights it all briefly
    },
    overlay(ctx, i) {
      ctx.strokeStyle = 'rgba(200,210,230,0.35)'; ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let k = 0; k < 70; k++) { const x = (k * 37 + i.t * 90) % (VW + 40) - 20, y = (k * 53 + i.t * 260) % VH; ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 9); }
      ctx.stroke();
    },
  };

  S.cga = { name: 'CGA', res: 1, post(d, W, H) { paletteDither(d, W, H, ['#000000', '#00aaaa', '#aa00aa', '#55ffff', '#ff55ff', '#ffffff'], 0.16); } };

  S.glitch = {
    name: 'GLITCH', ko: 'ERR 0xDEAD',
    post(d, W, H, i) {
      const src = d.slice(), seed = Math.floor(i.t * 9);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const o = (y * W + x) * 4;
        d[o] = src[(y * W + U.clamp(x - 3, 0, W - 1)) * 4];
        d[o + 2] = src[(y * W + U.clamp(x + 3, 0, W - 1)) * 4 + 2];
      }
      for (let k = 0; k < 5; k++) { // displaced slices
        const y0 = Math.floor(hashNoise(k, seed, 7) * H), h = 2 + Math.floor(hashNoise(k, seed, 8) * 14), dx = Math.round((hashNoise(k, seed, 9) - 0.5) * 40);
        const inv = hashNoise(k, seed, 10) < 0.15;
        for (let y = y0; y < Math.min(H, y0 + h); y++) for (let x = 0; x < W; x++) {
          const o = (y * W + x) * 4, s = (y * W + U.clamp(x - dx, 0, W - 1)) * 4;
          d[o] = inv ? 255 - src[s] : src[s]; d[o + 1] = inv ? 255 - src[s + 1] : src[s + 1]; d[o + 2] = inv ? 255 - src[s + 2] : src[s + 2];
        }
      }
    },
    overlay(ctx, i) { if (i.rnd() < 0.05) F().draw(ctx, 'SIGNAL LOST', VW / 2, VH / 2 - 40, '#ff2a6a', 2, 'center'); },
  };

  S.vaporwave = {
    name: 'VAPORWAVE',
    post(d, W, H) { mapLum(d, W * H, LUT.vapor, 1.05); },
    overlay(ctx) { vignette(ctx, '255,90,200', 0.35, 0.4); scanlines(ctx, 0.06); },
  };

  S.mirror = {
    name: 'MIRROR WORLD',
    compose(ctx, wc) { ctx.save(); ctx.translate(VW, 0); ctx.scale(-1, 1); KF.blit(ctx, wc, 0, 0, VW, VH); ctx.restore(); },
    overlay(ctx) { vignette(ctx, '180,200,255', 0.3, 0.45); },
  };

  S.thermal = {
    name: 'THERMAL', playerGlow: 0.75, ko: 'COLD',
    post(d, W, H) { mapLum(d, W * H, LUT.thermal, 1.15); },
    overlay(ctx, i) {
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(VW / 2 - 10, VH / 2); ctx.lineTo(VW / 2 + 10, VH / 2); ctx.moveTo(VW / 2, VH / 2 - 10); ctx.lineTo(VW / 2, VH / 2 + 10); ctx.stroke();
      F().draw(ctx, `${(36.6 + Math.sin(i.t * 3) * 0.4).toFixed(1)}C`, VW - 14, i.fight ? VH - 40 : VH - 22, '#ffffff', 1, 'right', '#000');
    },
  };

  S.sketch = {
    name: 'SKETCHBOOK',
    post(d, W, H, i) {
      const n = W * H, L = lumArray(d, n), E = sobel(L, W, H), res = i.res;
      for (let k = 0; k < n; k++) {
        const o = k * 4, x = k % W, y = (k / W) | 0;
        let pr = 243, pg = 239, pb = 228;
        if (y % (12 * res) === 0) { pr = 170; pg = 196; pb = 230; }
        if (x === 22 * res || x === 22 * res + 1) { pr = 230; pg = 150; pb = 150; }
        const l = L[k], wash = 0.32;
        let r = pr + (d[o] - pr) * wash, g = pg + (d[o + 1] - pg) * wash, b = pb + (d[o + 2] - pb) * wash;
        if (l < 95 && (x + y) % 5 === 0) { r *= 0.7; g *= 0.7; b *= 0.72; }
        const e = Math.min(1, E[k] / 55);
        r += (58 - r) * e; g += (58 - g) * e; b += (68 - b) * e;
        d[o] = r; d[o + 1] = g; d[o + 2] = b;
      }
    },
  };

  S.ink = {
    name: 'INK WASH', ko: 'FALLEN',
    post(d, W, H, i) {
      const n = W * H, L = lumArray(d, n), E = sobel(L, W, H), tones = [[26, 24, 26], [80, 78, 80], [158, 152, 140]];
      for (let k = 0; k < n; k++) {
        const o = k * 4, x = k % W, y = (k / W) | 0;
        const fiber = (NOISE[(y * 977 + (x >> 1)) & NM] - 0.5) * 14;
        const l = L[k] + bayer(x, y) * 30;
        let c = l < 60 ? tones[0] : l < 110 ? tones[1] : l < 165 ? tones[2] : [239 + fiber, 230 + fiber, 210 + fiber];
        if (E[k] > 45) c = [16, 14, 16];
        d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2];
      }
    },
    overlay(ctx) { R(ctx, '#b8281e', VW - 30, VH - 34, 18, 18); F().draw(ctx, 'KF', VW - 26.5, VH - 28, '#f6e8d8'); },
  };

  S.nightvision = {
    name: 'NIGHT VISION',
    post(d, W, H, i) { mapLum(d, W * H, LUT.night, 1.7, 46, i.frame, W); },
    overlay(ctx, i) {
      if (!this.mask) { // binocular mask: black with two overlapping round eyepieces cut out
        this.mask = KF.makeHi(VW, VH); const m = this.mask.getContext('2d');
        m.fillStyle = '#000'; m.fillRect(0, 0, VW, VH);
        m.globalCompositeOperation = 'destination-out';
        m.beginPath(); m.arc(VW / 2 - 70, VH / 2 + 6, 100, 0, 7); m.arc(VW / 2 + 70, VH / 2 + 6, 100, 0, 7); m.fill();
      }
      KF.blit(ctx, this.mask, 0, 0);
      if (Math.floor(i.t * 2) % 2) { ctx.fillStyle = '#ff2020'; ctx.beginPath(); ctx.arc(30, VH - 22, 3, 0, 7); ctx.fill(); F().draw(ctx, 'REC', 38, VH - 25, '#ff4040'); }
      scanlines(ctx, 0.12);
    },
  };

  S.nes8bit = {
    name: '8-BIT', res: 1,
    post(d, W, H) {
      if (!NES) NES = nearestPalette(['#000000', '#fcfcfc', '#bcbcbc', '#7c7c7c', '#a4e4fc', '#3cbcfc', '#0078f8', '#0000fc', '#b8b8f8', '#6888fc', '#0058f8', '#d8b8f8', '#9878f8', '#6844fc', '#f8b8f8', '#f878f8', '#d800cc', '#f8a4c0', '#f85898', '#e40058', '#f0d0b0', '#f87858', '#f83800', '#fce0a8', '#fca044', '#e45c10', '#f8d878', '#f8b800', '#ac7c00', '#d8f878', '#b8f818', '#00b800', '#b8f8b8', '#58d854', '#00a800', '#58f898', '#00a844', '#00fcfc', '#00e8d8', '#008888']);
      for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) { // 2x2 mosaic
        const o = (y * W + x) * 4;
        NES(d, o);
        for (const [dx, dy] of [[1, 0], [0, 1], [1, 1]]) if (x + dx < W && y + dy < H) { const q = ((y + dy) * W + x + dx) * 4; d[q] = d[o]; d[q + 1] = d[o + 1]; d[q + 2] = d[o + 2]; }
      }
    },
  };

  S.negative = { name: 'NEGATIVE', ko: 'O.K.', post(d, W, H) { for (let k = 0; k < W * H; k++) { const o = k * 4; d[o] = 255 - d[o]; d[o + 1] = 255 - d[o + 1]; d[o + 2] = Math.min(255, 275 - d[o + 2]); } } };

  S.cinema = {
    name: 'CINEMASCOPE', ko: 'FIN',
    post(d, W, H, i) {
      for (let k = 0; k < W * H; k++) {
        const o = k * 4, l = lum(d, o) / 255;
        const tr = U.lerp(14, 255, l), tg = U.lerp(46, 176, l), tb = U.lerp(52, 112, l);
        d[o] = d[o] * 0.6 + tr * 0.4; d[o + 1] = d[o + 1] * 0.6 + tg * 0.4; d[o + 2] = d[o + 2] * 0.6 + tb * 0.4;
        const g = (NOISE[(k + i.frame * 7919) & NM] - 0.5) * 14; d[o] += g; d[o + 1] += g; d[o + 2] += g;
      }
    },
    under(ctx) { R(ctx, '#000', 0, 0, VW, 20); R(ctx, '#000', 0, VH - 20, VW, 20); },
  };

  S.popart = {
    name: 'POP ART', ko: 'WHAAM',
    post(d, W, H) {
      const n = W * H, L = lumArray(d, n), E = sobel(L, W, H), pal = [[26, 26, 106], [255, 42, 138], [255, 208, 42], [248, 248, 240]];
      for (let k = 0; k < n; k++) {
        const o = k * 4, x = k % W, y = (k / W) | 0, l = L[k];
        let band = l < 60 ? 0 : l < 120 ? 1 : l < 185 ? 2 : 3;
        if (band === 2) { const cx = (x % 5) - 2, cy = (y % 5) - 2; if (cx * cx + cy * cy < 2.2) band = 1; }
        const c = E[k] > 50 ? [10, 10, 14] : pal[band];
        d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2];
      }
    },
    under(ctx) { frame(ctx, 3, '#0a0a0e'); },
  };

  S.vector = {
    name: 'VECTOR DISPLAY',
    post(d, W, H) {
      const n = W * H, L = lumArray(d, n), E = sobel(L, W, H);
      for (let k = 0; k < n; k++) {
        const o = k * 4, e = Math.min(1, E[k] / 60) + L[k] / 2400;
        d[o] = 4 + 120 * e * e; d[o + 1] = 10 + 245 * e; d[o + 2] = 6 + 150 * e;
      }
    },
    overlay(ctx) { scanlines(ctx, 0.15); vignette(ctx, '0,0,0', 0.6, 0.4); },
  };

  S.storybook = {
    name: 'STORYBOOK',
    post(d, W, H) {
      const n = W * H, L = lumArray(d, n), E = sobel(L, W, H);
      for (let k = 0; k < n; k++) {
        const o = k * 4, x = k % W, y = (k / W) | 0;
        const paper = 0.9 + NOISE[((y >> 2) * 977 + (x >> 2)) & NM] * 0.1;
        const r = d[o], g = d[o + 1], b = d[o + 2];
        d[o] = (r * 0.45 + ((r / 51 + 0.5) | 0) * 28) * paper + 22; d[o + 1] = (g * 0.45 + ((g / 51 + 0.5) | 0) * 28) * paper + 14; d[o + 2] = (b * 0.45 + ((b / 51 + 0.5) | 0) * 28) * paper;
        if (E[k] > 30) { const f = 1 - Math.min(0.35, E[k] / 400); d[o] *= f; d[o + 1] *= f; d[o + 2] *= f; }
      }
    },
    under(ctx) {
      R(ctx, '#e8dcc0', 0, 0, 6, VH); R(ctx, '#e8dcc0', VW - 6, 0, 6, VH);
      ctx.globalAlpha = 0.22; R(ctx, '#3a2a10', VW / 2 - 1, 0, 2, VH); R(ctx, '#3a2a10', 6, 0, 1, VH); R(ctx, '#3a2a10', VW - 7, 0, 1, VH); ctx.globalAlpha = 1;
    },
    overlay(ctx) { F().draw(ctx, '- 6 -', VW / 2, VH - 9, '#5a4a30', 1, 'center'); },
  };

  S.ukiyo = {
    name: 'WOODBLOCK PRINT',
    post(d, W, H) {
      if (!UKIYO) UKIYO = nearestPalette(['#1b1f3a', '#2f5d8a', '#c8402a', '#e0a84a', '#efe3c8', '#4a6a3a', '#121212', '#e8b8a8']);
      const n = W * H, L = lumArray(d, n), E = sobel(L, W, H);
      for (let k = 0; k < n; k++) {
        const o = k * 4, x = k % W, y = (k / W) | 0;
        UKIYO(d, o);
        const g = (NOISE[((y >> 1) * 977 + x) & NM] - 0.5) * 18; d[o] += g; d[o + 1] += g; d[o + 2] += g;
        if (E[k] > 48) { d[o] = 26; d[o + 1] = 20; d[o + 2] = 20; }
      }
    },
    overlay(ctx) { R(ctx, '#c8402a', VW - 26, 38, 14, 58); R(ctx, '#efe3c8', VW - 24, 40, 10, 54); ['S', 'A', 'K', 'U', 'R', 'A'].forEach((c, k) => F().draw(ctx, c, VW - 19, 42 + k * 8.5, '#1b1f3a', 1, 'center')); },
  };

  S.dream = {
    name: 'DREAM', ko: 'WAKE UP',
    post(d, W, H) {
      const bw = Math.ceil(W / 8), bh = Math.ceil(H / 8), B = new Float32Array(bw * bh * 3);
      for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) { // bright-pass, box-downsampled
        const o = (y * W + x) * 4, b = ((y >> 3) * bw + (x >> 3)) * 3, l = lum(d, o);
        if (l > 140) { B[b] += d[o] / 16; B[b + 1] += d[o + 1] / 16; B[b + 2] += d[o + 2] / 16; }
      }
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const o = (y * W + x) * 4, b = ((y >> 3) * bw + (x >> 3)) * 3;
        d[o] = d[o] * 0.75 + 255 * 0.18 + B[b] * 0.7; d[o + 1] = d[o + 1] * 0.75 + 220 * 0.18 + B[b + 1] * 0.7; d[o + 2] = d[o + 2] * 0.75 + 240 * 0.18 + B[b + 2] * 0.7;
      }
    },
    overlay(ctx, i) {
      for (let k = 0; k < 18; k++) {
        const x = (k * 71 + Math.sin(i.t * 0.7 + k) * 12) % VW, y = VH - ((i.t * (8 + k % 5 * 3) + k * 37) % (VH + 10));
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(i.t * 3 + k); R(ctx, '#ffffff', x, y, 0.5, 2.5); R(ctx, '#ffffff', x - 1, y + 1, 2.5, 0.5);
      }
      ctx.globalAlpha = 1; vignette(ctx, '255,240,250', 0.55, 0.4);
    },
  };

  S.duotone = { name: 'DUOTONE', post(d, W, H) { mapLum(d, W * H, LUT.duo, 1.1); } };

  S.polaroid = {
    name: 'POLAROID',
    post(d, W, H) { for (let k = 0; k < W * H; k++) { const o = k * 4, l = lum(d, o); for (let j = 0; j < 3; j++) d[o + j] = 26 + (d[o + j] * 0.62 + l * 0.18) + [16, 6, -8][j]; } },
    under(ctx) {
      ctx.globalAlpha = 0.18; const g = ctx.createLinearGradient(VW - 90, 0, VW, 0); g.addColorStop(0, 'rgba(255,120,40,0)'); g.addColorStop(1, 'rgba(255,120,40,1)'); ctx.fillStyle = g; ctx.fillRect(VW - 90, 0, 90, VH); ctx.globalAlpha = 1;
      R(ctx, '#f6f2ea', 0, 0, VW, 6); R(ctx, '#f6f2ea', 0, 0, 6, VH); R(ctx, '#f6f2ea', VW - 6, 0, 6, VH); R(ctx, '#f6f2ea', 0, VH - 20, VW, 20);
      F().draw(ctx, "SPRING '98", VW - 16, VH - 13, '#3a3ab0', 1, 'right');
    },
  };

  S.emboss = {
    name: 'RUNESTONE', ko: 'CARVED',
    post(d, W, H, i) {
      const n = W * H, L = lumArray(d, n), r = i.res;
      for (let k = 0; k < n; k++) {
        const o = k * 4, x = k % W, y = (k / W) | 0;
        const a = L[Math.max(0, k - r * W - r)], b = L[Math.min(n - 1, k + r * W + r)];
        const v = 128 + (a - b) * 1.4 + (NOISE[((y >> 1) * 977 + (x >> 1)) & NM] - 0.5) * 22 + (L[k] - 128) * 0.25;
        d[o] = v * 0.98; d[o + 1] = v * 0.95; d[o + 2] = v * 0.88;
      }
    },
    under(ctx) { frame(ctx, 4, '#3a3630', '#8a8478'); },
  };

  S.stitch = {
    name: 'TAPESTRY', res: 1,
    post(d, W, H) {
      const C = 3;
      for (let cy = 0; cy < H; cy += C) for (let cx = 0; cx < W; cx += C) {
        let r = 0, g = 0, b = 0, n = 0;
        for (let y = cy; y < Math.min(H, cy + C); y++) for (let x = cx; x < Math.min(W, cx + C); x++) { const o = (y * W + x) * 4; r += d[o]; g += d[o + 1]; b += d[o + 2]; n++; }
        r /= n; g /= n; b /= n;
        for (let y = cy; y < Math.min(H, cy + C); y++) for (let x = cx; x < Math.min(W, cx + C); x++) {
          const o = (y * W + x) * 4, lx = x - cx, ly = y - cy, onX = lx === ly || lx === C - 1 - ly;
          if (onX) { d[o] = r; d[o + 1] = g; d[o + 2] = b; } else { const w = (x + y) % 2 ? 214 : 226; d[o] = w * 0.55 + r * 0.45; d[o + 1] = (w - 10) * 0.55 + g * 0.45; d[o + 2] = (w - 34) * 0.55 + b * 0.45; }
        }
      }
    },
    under(ctx) { frame(ctx, 3, '#7a2a1a', '#e0b040'); },
  };

  S.candle = {
    name: 'CANDLELIGHT', ko: 'SNUFFED',
    post(d, W, H, i) { mapLum(d, W * H, LUT.candle, 1.2); lightRadius(d, W, H, i, 40 + Math.sin(i.t * 13) * 2 + Math.sin(i.t * 7) * 2, 80, 0.13, [1, 0.95, 0.85]); },
  };

  let frostCanvas = null;
  S.frost = {
    name: 'FROSTBITE', ko: 'FROZEN',
    post(d, W, H) { for (let k = 0; k < W * H; k++) { const o = k * 4, l = lum(d, o); d[o] = d[o] * 0.45 + l * 0.4 + 10; d[o + 1] = d[o + 1] * 0.45 + l * 0.45 + 26; d[o + 2] = d[o + 2] * 0.45 + l * 0.45 + 60; } },
    overlay(ctx) {
      if (!frostCanvas) {
        frostCanvas = KF.makeHi(VW, VH); const x = frostCanvas.getContext('2d'), rnd = U.rng(91);
        x.strokeStyle = 'rgba(235,245,255,0.55)'; x.lineWidth = 0.5;
        const branch = (px, py, a, len, depth) => {
          const ex = px + Math.cos(a) * len, ey = py + Math.sin(a) * len;
          x.beginPath(); x.moveTo(px, py); x.lineTo(ex, ey); x.stroke();
          if (depth > 0) { branch(ex, ey, a + 0.6, len * 0.6, depth - 1); branch(ex, ey, a - 0.6, len * 0.6, depth - 1); branch(ex, ey, a, len * 0.7, depth - 1); }
        };
        for (let k = 0; k < 26; k++) {
          const side = k % 4, t = rnd();
          const [px, py, a] = side === 0 ? [t * VW, 0, Math.PI / 2] : side === 1 ? [t * VW, VH, -Math.PI / 2] : side === 2 ? [0, t * VH, 0] : [VW, t * VH, Math.PI];
          branch(px, py, a + (rnd() - 0.5) * 0.8, 10 + rnd() * 12, 3);
        }
      }
      KF.blit(ctx, frostCanvas, 0, 0);
      vignette(ctx, '220,240,255', 0.5, 0.42);
    },
  };

  S.golden = {
    name: 'GILDED', ko: 'GLORY',
    post(d, W, H, i) {
      mapLum(d, W * H, LUT.gold, 1.1);
      for (let k = 0; k < W * H; k += 7) { const o = k * 4; if (d[o] > 248 && hashNoise(k, i.frame >> 3, 2) < 0.08) { d[o] = d[o + 1] = d[o + 2] = 255; } }
    },
    under(ctx) { frame(ctx, 4, '#8a5a10', '#ffe070'); },
    overlay(ctx) { vignette(ctx, '40,20,0', 0.55, 0.42); },
  };

  // Text-mode stage: everything is a character. You are the @.
  S.ascii = { name: 'TEXT MODE', theme: 'ascii', ko: 'YOU DIED', post: null };
  // Fake crash: the stage is drawn on an error screen, platforms are error text.
  S.bsod = { name: 'FATAL ERROR', theme: 'bsod', ko: 'FATAL', crashIntro: true };
  // 3D: solid tiles are extruded into blocks toward a vanishing point.
  S.cube3d = { name: '3D', extrude: true, ko: '3D K.O.' };

  // ---------- themes used by styles ----------
  const glyph = (ctx, ch, x, y, color, s = 2) => F().draw(ctx, ch, x, y, color, s, 'center');
  KF.Themes.add('ascii', {
    id: 'ascii', name: 'TEXT', bg: '#030603', zone: { gravity: '#3a8aff', reverse: '#ff3aa0' },
    build() {},
    background(ctx, cam, t) {
      R(ctx, '#030603', 0, 0, VW, VH);
      const set = '01#$%&*+<>=';
      for (let c = 0; c < 48; c++) { // dim falling code
        const speed = 18 + (c * 37) % 23, head = ((t * speed + c * 61) % (VH + 80)) - 40, x = c * 8 + 2 - ((cam.x * 0.2) % 8);
        for (let k = 0; k < 8; k++) {
          const y = head - k * 8;
          if (y < -8 || y > VH) continue;
          ctx.globalAlpha = (1 - k / 8) * 0.35;
          F().draw(ctx, set[(c * 7 + k * 3 + Math.floor(t * 4)) % set.length], x, y, k === 0 ? '#9affb0' : '#1a8a3a');
        }
      }
      ctx.globalAlpha = 1;
    },
    tile(ctx, x, y, art, e) {
      R(ctx, art === 'oneway' ? 'rgba(0,0,0,0)' : '#07210c', x, y, 16, 16);
      const ch = art === 'alt' ? '=' : art === 'oneway' ? '-' : art === 'ice' ? '~' : '#';
      glyph(ctx, ch, x + 8, art === 'oneway' ? y - 4 : y + 1, e.t ? '#b8ffc8' : '#3acc5a');
    },
    spike(ctx, x, y, dir) { glyph(ctx, { up: '^', down: 'v', left: '<', right: '>' }[dir], x + 8, y + 2, '#ff4a4a'); },
    door(ctx, x, y, o = {}) {
      ctx.strokeStyle = o.open ? '#fff6a0' : '#e8c040'; ctx.lineWidth = 0.5; ctx.strokeRect(x + 0.5, y + 0.5, 15, 31);
      glyph(ctx, o.open ? ' ' : 'D', x + 8, y + 9, '#ffd040');
      if (o.lantern) glyph(ctx, '*', x + 8, y - 13, Math.floor((o.t || 0) * 4) % 2 ? '#ffffff' : '#ffe070');
    },
    spring(ctx, x, y, sq) { glyph(ctx, 'S', x + 8, y + 2 + sq * 3, '#ff6aff'); },
    sign(ctx, x, y, text) { F().draw(ctx, `[${text}]`, x, y + 2, '#5aaa6a', 1, 'center'); },
    drawPlayer(ctx, p, cx, feet, state) {
      const up = p.gravDir < 0, y = up ? feet : feet - 22;
      ctx.globalAlpha = 0.25; R(ctx, '#6af0ff', cx - 9, y - 1, 18, 24); ctx.globalAlpha = 1;
      F().draw(ctx, state === 'hurt' || p.dead ? 'X' : '@', cx, y + 1, '#8af4ff', 3, 'center');
    },
  });
  KF.Themes.add('bsod', {
    id: 'bsod', name: 'ERROR', bg: '#0c2a8a', zone: { gravity: '#ffffff', reverse: '#ff8ad0' },
    build() {},
    background(ctx, cam) {
      R(ctx, '#0c2a8a', 0, 0, VW, VH);
      const ox = -((cam.x * 0.15) % 400);
      ctx.globalAlpha = 0.18; F().draw(ctx, 'X_X', 40 + ox, 44, '#ffffff', 7); F().draw(ctx, 'X_X', 440 + ox, 44, '#ffffff', 7); ctx.globalAlpha = 1;
      const lines = ['KUNG FOOLED RAN INTO A PROBLEM AND NEEDS TO PANIC.', 'WE ARE COLLECTING SOME EXCUSES FOR YOU.', 'STOP CODE: TOO_MANY_DEATHS (0x0000002A)', 'IF YOU CALL SUPPORT, NOBODY WILL PICK UP.'];
      lines.forEach((l, k) => F().draw(ctx, l, 24 + ox * 0.5, 104 + k * 11, '#9ab0ff'));
    },
    tile(ctx, x, y, art, e, seed) {
      const hex = Math.floor(seed * 255).toString(16).toUpperCase().padStart(2, '0');
      if (art === 'oneway') { R(ctx, '#dfe6ff', x, y, 16, 3); return; }
      R(ctx, art === 'alt' ? '#ffd040' : art === 'ice' ? '#8af0ff' : '#dfe6ff', x, y, 16, 16);
      if (e.t) R(ctx, '#ffffff', x, y, 16, 1);
      F().draw(ctx, art === 'alt' ? '!!' : hex, x + 8, y + 5, '#0c2a8a', 1, 'center');
      if (e.b) R(ctx, '#7a8ad0', x, y + 15, 16, 1);
    },
  });

  // A stage environment: its own scenery, tiles and props, tied to a style (see js/envs/).
  // `extra` is merged onto the style itself (frames, overlays, a different post pass).
  KF.Env = {
    add(styleId, theme, extra) {
      KF.Themes.add('env_' + styleId, Object.assign({ id: 'env_' + styleId }, theme));
      S[styleId].theme = 'env_' + styleId;
      if (extra) Object.assign(S[styleId], extra);
    },
  };

  KF.Styles = {
    all: S,
    get(id) { const s = S[id] || S.hd; s.id = S[id] ? id : 'hd'; return s; },
    forStage(realmId, index, def) { return this.get((def && def.style) || (KF.StylePlan[realmId] || [])[index] || 'hd'); }, // KF.StylePlan: js/rules.js
    // Run a style's pixel pass over a canvas (in place).
    post(style, canvas, info) {
      if (!style.post && !style.light) return;
      const x = canvas.getContext('2d'), img = x.getImageData(0, 0, canvas.width, canvas.height);
      if (style.post) style.post(img.data, canvas.width, canvas.height, info);
      x.putImageData(img, 0, 0);
    },
    info(t, frame, res, px, py, worldX, fight = false) {
      const rnd = U.rng((frame * 2654435761) >>> 0);
      return { t, frame, res, player: { x: px, y: py, worldX }, rnd, fight };
    },
  };
})(window.KF);
