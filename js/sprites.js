'use strict';
// Fighters drawn entirely in code. A pose (joint targets) is rasterised part by part into a pixel
// buffer with cel shading (a few flat tones per material) and a dark outline. A "look" (outfit, hair,
// headgear, colours) picks the materials and extra parts, so every customisation and every
// opponent comes from the same skeleton. Scale S > 1 builds larger, more detailed sprites for fights.
(function (KF) {
  const BASE = 40, BAX = 20, BAY = 38; // design units: 40x40 frame, feet anchor at (20, 38)

  function rgba(hex) {
    const n = parseInt(hex.slice(1), 16);
    return ((255 << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | (n >> 16)) >>> 0;
  }
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
    return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
  }
  // shadow, base, highlight, core shadow. Highlights on already-light materials are pulled back
  // toward the base so cream wraps and white gis don't sparkle with near-white pixels.
  const lum = (hex) => { const n = parseInt(hex.slice(1), 16); return (0.3 * (n >> 16) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) / 255; };
  const mix = (a, b, t) => {
    const p = parseInt(a.slice(1), 16), q = parseInt(b.slice(1), 16);
    return '#' + [16, 8, 0].map((k) => Math.round(((p >> k) & 255) * (1 - t) + ((q >> k) & 255) * t).toString(16).padStart(2, '0')).join('');
  };
  const ramp = (a, b, c) => [rgba(a), rgba(b), rgba(lum(c) > 0.8 ? mix(b, c, 0.55) : c), rgba(shade(a, 0.62))];
  const darkRamp = (r, f = 0.75) => r.map((h) => shade(h, f));

  // ---- palettes (hex ramps: shadow, base, highlight) ----
  const COLORS = {
    teal: ['#0b4650', '#168a88', '#52cdb8'], crimson: ['#5a0c18', '#a8202c', '#e85a5a'],
    indigo: ['#1c1440', '#3a2e74', '#6056aa'], black: ['#0c0a12', '#26222e', '#4a4258'],
    white: ['#8e8a96', '#d6d2d8', '#ffffff'], pink: ['#a04a6a', '#e88aa8', '#ffc8d8'],
    gold: ['#8a5a10', '#d8a028', '#ffe070'], hide: ['#3a2414', '#6a4426', '#9a6a40'],
    purple: ['#2a1440', '#5a2a8a', '#9a5ad0'], green: ['#123a1a', '#2a7a34', '#6ac060'],
    gray: ['#34343e', '#626270', '#9a9aaa'], blue: ['#0c2050', '#2050a0', '#5a90e0'],
    orange: ['#a83a10', '#f07a1a', '#ffc848'], red: ['#6a0a10', '#c8202a', '#ff6a5a'],
    steel: ['#3a4250', '#7a8698', '#c8d4e4'], straw: ['#8a6a2a', '#d8b058', '#f8e098'],
    ivory: ['#9a8e70', '#e0d6b8', '#fffbe8'], cream: ['#948a7c', '#d6cebe', '#fff6e4'],
    navy: ['#080c24', '#18204a', '#34407a'], lime: ['#3a6a10', '#7ac028', '#c8f070'],
    charcoal: ['#101014', '#2a2a32', '#4e4e58'], silver: ['#55555c', '#9a9aa2', '#d4d4da'],
    chrome: ['#3e4858', '#8e9cb0', '#e2eaf4'], coral: ['#8a2410', '#e05a30', '#ff9a6a'],
    slate: ['#1a3448', '#3a6a8a', '#70a0c0'], denim: ['#142438', '#2e5278', '#5a84b0'],
    olive: ['#2a3210', '#56622a', '#8a9650'], maroon: ['#30080e', '#6a1622', '#a83a48'],
    sky: ['#3a6a9a', '#78b0e0', '#c0e4ff'], mint: ['#2a6a5a', '#5ac0a0', '#a8f0d8'],
    khaki: ['#5a4a28', '#a08a58', '#d8c490'], hivis: ['#8a5a00', '#ffa010', '#ffe070'],
    yellow: ['#8a7010', '#e8c020', '#fff080'], magenta: ['#6a0a50', '#d02aa0', '#ff80e0'],
    cyan: ['#0a6a80', '#2ad8f0', '#c0ffff'],
  };
  const SKIN = {
    tan: ['#9a4e34', '#dc8c5c', '#f6c08e'], light: ['#a8624a', '#eaa880', '#ffd8b4'],
    dark: ['#3e1e12', '#7a4630', '#aa6c4c'], pale: ['#b08070', '#f0c8b0', '#fff0e4'], green: ['#1e4a20', '#4a8a3a', '#8ac870'],
    deep: ['#24100a', '#583020', '#8a5436'], olive: ['#7a5a2a', '#c09058', '#e8c088'],
    grey: ['#5c5c5c', '#a8a8a8', '#dadada'], frost: ['#4a6a8a', '#9ac0e0', '#e0f4ff'],
  };
  const HAIR = {
    black: ['#0c0812', '#241c32', '#3e3452'], brown: ['#2a1408', '#5a3418', '#8a5a30'],
    blond: ['#8a6418', '#d8b048', '#fff0a0'], red: ['#5a120a', '#b8361a', '#f07a40'],
    white: ['#7a7a88', '#c8c8d4', '#ffffff'], pink: ['#8a2a5a', '#e070a8', '#ffb8d8'], blue: ['#0c1a4a', '#2a50b0', '#70a0f0'],
    grey: ['#5a5a62', '#9a9aa4', '#d0d0d8'], magenta: ['#7a0a50', '#e02aa8', '#ff90e0'], green: ['#0c3a1a', '#1a8a3a', '#60e080'],
  };
  const CRYSTAL = ['#8a0c14', '#d81e28', '#ff6a5a', '#5a0610', '#ffe4dc']; // shadow, base, light, deep, glint
  const OUT = rgba('#1b1022');

  // Default look: BAO as he appears in the platform stages.
  // Look fields (all optional):
  //   skin, build ('slim' | 'heavy'), material ('crystal': a faceted red glass figure)
  //   style   vest | tank | gi | robe | fur | armor | suit | tang | cyber | track | coat | hero
  //   top, pants, trim, wraps (fists), shoes, belt (gi belt / sash colour), legs ('shorts'), shins
  //   hair    spiky | topknot | long | braid | mohawk | bald | bun | afro | short | slick
  //   head    none | straw | hood | horned | kabuto | bowler | tophat | cap | fedora | cowboy |
  //           tricorn | hardhat | helmet | peaked ; hat (its colour)
  //   face    visor, shades, mask (colours), bandana (colour), beard, moustache, tie ('tie' | 'bow'), tieColor
  //   band (headband colour), arm ('cyber' front arm), glow (seam colour), cape, scarf (colours), prop ('cane' | 'mic' | 'phone')
  const DEFAULT_LOOK = {
    skin: 'tan', hair: 'spiky', hairColor: 'black', band: 'orange', head: 'none', beard: false,
    top: 'teal', style: 'vest', pants: 'indigo', wraps: 'cream', shoes: 'hide', trim: null, weapon: null,
  };

  // ---- rasteriser ----
  const SUB = [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]];
  function makeMask(W, H, S) {
    const m = new Uint8Array(W * H);
    const M = {
      m, x0: W, y0: H, x1: -1, y1: -1, // bounding box of what's been drawn
      get(x, y) { return x >= 0 && y >= 0 && x < W && y < H ? m[y * W + x] : 0; },
      set(x, y) {
        if (x >= 0 && y >= 0 && x < W && y < H) {
          m[y * W + x] = 1;
          if (x < M.x0) M.x0 = x; if (x > M.x1) M.x1 = x; if (y < M.y0) M.y0 = y; if (y > M.y1) M.y1 = y;
        }
      },
      // All shape coords are design units; S converts to pixels.
      // Shapes are sampled 4 times per pixel and a pixel is filled when at least half its samples
      // are inside, so edges follow the true shape instead of growing single-pixel bumps.
      disc(cx, cy, r) {
        cx *= S; cy *= S; r *= S;
        const r2 = r * r;
        for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
          let n = 0;
          for (const [sx, sy] of SUB) { const dx = x + sx - cx, dy = y + sy - cy; if (dx * dx + dy * dy <= r2) n++; }
          if (n >= 2) M.set(x, y);
        }
        return M;
      },
      // Tapered capsule from a (radius r0) to b (radius r1).
      line(a, b, r0, r1 = r0) {
        const ax = a.x * S, ay = a.y * S, bx = b.x * S, by = b.y * S, R0 = r0 * S, R1 = r1 * S, rm = Math.max(R0, R1);
        const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1e-6;
        const X0 = Math.floor(Math.min(ax, bx) - rm), X1 = Math.ceil(Math.max(ax, bx) + rm);
        const Y0 = Math.floor(Math.min(ay, by) - rm), Y1 = Math.ceil(Math.max(ay, by) + rm);
        for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) {
          let n = 0;
          for (const [sx, sy] of SUB) {
            const px = x + sx - ax, py = y + sy - ay;
            const t = Math.max(0, Math.min(1, (px * dx + py * dy) / l2)), qx = px - dx * t, qy = py - dy * t, r = R0 + (R1 - R0) * t;
            if (qx * qx + qy * qy <= r * r) n++;
          }
          if (n >= 2) M.set(x, y);
        }
        return M;
      },
      poly(pts) {
        const p = pts.map((q) => ({ x: q.x * S, y: q.y * S }));
        let x0 = W, x1 = 0, y0 = H, y1 = 0;
        for (const q of p) { x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); }
        for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
          let n = 0;
          for (const [sx, sy] of SUB) {
            const px = x + sx, py = y + sy;
            let inside = false;
            for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
              const a = p[i], b = p[j];
              if ((a.y > py) !== (b.y > py) && px < ((b.x - a.x) * (py - a.y)) / (b.y - a.y) + a.x) inside = !inside;
            }
            if (inside) n++;
          }
          if (n >= 2) M.set(x, y);
        }
        return M;
      },
    };
    return M;
  }

  // Cel shading with light from the top-left. For each pixel we measure how far the part extends
  // up/down and left/right; across the part's thin direction (a limb's width, a blob's diagonal)
  // the first ~30% is lit, the last ~30% is in shadow with a darker core at the very edge. So every
  // limb reads as a solid, rounded form in a few flat tones, like hand-shaded pixel art.
  // rp.oneTone paints one tone (glowing seams); rp.crystal paints faceted glass.
  // `sep` outlines the part where it overlaps parts painted earlier.
  function paint(buf, W, H, mask, rp, sep = false, S = 1) {
    const deepW = Math.max(1, Math.round(S * 0.35)), CAP = Math.ceil(S * 14);
    const deep = rp[3] || rp[0];
    const inside = (x, y) => mask.get(x, y);
    // Run lengths (how many filled pixels continue up / down / left / right), in four linear passes
    // over the part's bounding box.
    if (mask.x1 < 0) return;
    const bx = mask.x0, by = mask.y0, bw = mask.x1 - bx + 1, bh = mask.y1 - by + 1, n = bw * bh, mm = mask.m;
    const U_ = new Uint16Array(n), D_ = new Uint16Array(n), L_ = new Uint16Array(n), R_ = new Uint16Array(n);
    const at = (x, y) => mm[(y + by) * W + x + bx];
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) { const k = y * bw + x; if (at(x, y)) { U_[k] = y && at(x, y - 1) ? U_[k - bw] + 1 : 0; L_[k] = x && at(x - 1, y) ? L_[k - 1] + 1 : 0; } }
    for (let y = bh - 1; y >= 0; y--) for (let x = bw - 1; x >= 0; x--) { const k = y * bw + x; if (at(x, y)) { D_[k] = y < bh - 1 && at(x, y + 1) ? D_[k + bw] + 1 : 0; R_[k] = x < bw - 1 && at(x + 1, y) ? R_[k + 1] + 1 : 0; } }
    void CAP;
    const fs = 4.4 * S; // crystal facet size
    const facet = (x, y) => { // triangular lattice, like a low-poly mesh
      const u = (x * 0.9 + y * 0.3) / fs, v = (-x * 0.4 + y * 0.95) / fs, fu = Math.floor(u), fv = Math.floor(v);
      return fu * 262 + fv * 2 + (u - fu + v - fv > 1 ? 1 : 0);
    };
    for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) {
      if (!inside(x, y)) continue;
      let c;
      if (rp.oneTone) c = rp[1];
      else {
        const k = (y - by) * bw + x - bx, u = U_[k], d = D_[k], l = L_[k], r = R_[k];
        const tv = u + d + 1, th = l + r + 1, ratio = Math.min(tv, th) / Math.max(tv, th);
        let t, edge;
        if (ratio > 0.6) { t = (u + l) / (tv + th - 2 || 1); edge = Math.min(d, r); }
        else if (tv < th) { t = u / (tv - 1 || 1); edge = d; }
        else { t = l / (th - 1 || 1); edge = r; }
        if (rp.crystal) {
          const h = KF.util.hash2(facet(x, y), 7);
          let k = h < 0.34 ? 0 : h < 0.72 ? 1 : 2;
          if (t < 0.25) k = Math.min(2, k + 1); else if (t > 0.75) k = Math.max(0, k - 1);
          c = rp[k];
          if (t < 0.4 && (facet(x, y) !== facet(x - 1, y) || facet(x, y) !== facet(x, y - 1)) && h > 0.55) c = rp[4]; // glints along facet edges
          else if (edge < deepW && S >= 2) c = deep;
        } else if (t < 0.3 && tv > 2 && th > 2) c = rp[2];
        else if (t > 0.7 || edge === 0) c = edge < deepW && S >= 2 ? deep : rp[0];
        else c = rp[1];
      }
      if (sep) {
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (!inside(nx, ny) && nx >= 0 && ny >= 0 && nx < W && ny < H && buf[ny * W + nx]) { c = OUT; break; }
        }
      }
      buf[y * W + x] = c;
    }
  }
  // Coloured outline: each outline pixel is a very dark tint of the colour it touches, which reads
  // softer and richer than pure black (a classic pixel-art trick).
  function outline(buf, W, H, colored) {
    const src = buf.slice();
    const tintOf = (c) => {
      const r = c & 255, g = (c >> 8) & 255, b = (c >> 16) & 255;
      const k = 0.2, base = [0x1b, 0x10, 0x22];
      return ((255 << 24) | (Math.round(base[2] * 0.6 + b * k) << 16) | (Math.round(base[1] * 0.6 + g * k) << 8) | Math.round(base[0] * 0.6 + r * k)) >>> 0;
    };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (src[y * W + x]) continue;
      const n = (x > 0 && src[y * W + x - 1]) || (x < W - 1 && src[y * W + x + 1]) || (y > 0 && src[(y - 1) * W + x]) || (y < H - 1 && src[(y + 1) * W + x]);
      if (n) buf[y * W + x] = colored && n !== OUT ? tintOf(n) : OUT;
    }
  }
  // Pixel-art cleanup: a lone pixel whose four neighbours all share one other colour is a stray
  // left by overlapping parts, so it takes that colour. Outline and eye pixels are left alone.
  function cleanup(buf, W, H) {
    const src = buf.slice();
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const k = y * W + x, c = src[k];
      if (!c || c === OUT) continue;
      const a = src[k - 1], b = src[k + 1], u = src[k - W], d = src[k + W];
      if (a && a === b && a === u && a === d && a !== c && a !== OUT) buf[k] = a;
    }
  }
  function ik(a, b, l1, l2, pref) {
    let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    const max = l1 + l2 - 0.05;
    if (d > max) { b = { x: a.x + dx / d * max, y: a.y + dy / d * max }; dx = b.x - a.x; dy = b.y - a.y; d = max; }
    d = Math.max(d, 0.5);
    const ang = Math.atan2(dy, dx);
    const A = Math.acos(KF.util.clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
    const c1 = { x: a.x + Math.cos(ang + A) * l1, y: a.y + Math.sin(ang + A) * l1 };
    const c2 = { x: a.x + Math.cos(ang - A) * l1, y: a.y + Math.sin(ang - A) * l1 };
    const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const s1 = (c1.x - m.x) * pref.x + (c1.y - m.y) * pref.y, s2 = (c2.x - m.x) * pref.x + (c2.y - m.y) * pref.y;
    return { joint: s1 >= s2 ? c1 : c2, end: b };
  }

  function materials(look) {
    const L = Object.assign({}, DEFAULT_LOOK, look);
    const col = (k, d) => COLORS[k] || SKIN[k] || COLORS[d] || SKIN[d] || COLORS.gray;
    const R = (c) => ramp(...c), RB = (c, f = 0.75) => ramp(...darkRamp(c, f));
    const skin = SKIN[L.skin] || SKIN.tan, top = col(L.top, 'teal'), pants = col(L.pants, 'indigo');
    const wraps = COLORS[L.wraps] || SKIN[L.wraps] || COLORS.cream, shoes = COLORS[L.shoes] || SKIN[L.shoes] || COLORS.hide; // skin names = bare fists / feet
    const m = {
      L,
      skin: R(skin), skinB: RB(skin),
      hair: R(HAIR[L.hairColor] || HAIR.black),
      band: L.band && L.band !== 'none' ? R(col(L.band, 'orange')) : null,
      top: R(top), topB: RB(top),
      pants: R(pants), pantsB: RB(pants, 0.7),
      wraps: R(wraps), wrapsB: RB(wraps, 0.72),
      shoe: R(shoes), shoeB: RB(shoes, 0.8),
      trim: L.trim ? R(col(L.trim, 'ivory')) : null,
      belt: R(col(L.belt, L.style === 'armor' ? 'hide' : L.wraps || 'cream')),
      hat: R(col(L.hat, L.head === 'hardhat' ? 'yellow' : L.head === 'helmet' ? 'chrome' : L.head === 'cowboy' ? 'hide' : 'charcoal')),
      shins: L.shins ? R(col(L.shins, 'cream')) : null, shinsB: L.shins ? RB(col(L.shins, 'cream'), 0.8) : null,
      steel: R(COLORS.steel), ivory: R(COLORS.ivory), straw: R(COLORS.straw), gold: R(COLORS.gold), wood: R(COLORS.hide),
      chrome: R(COLORS.chrome), chromeB: RB(COLORS.chrome, 0.8), white: R(COLORS.white), black: R(COLORS.black),
      glow: Object.assign(R(col(L.glow, 'cyan')), { oneTone: true }),
      tie: R(col(L.tieColor, 'red')),
      cape: L.cape ? R(col(L.cape, 'red')) : null, capeB: L.cape ? RB(col(L.cape, 'red'), 0.7) : null,
      scarf: L.scarf ? R(col(L.scarf, 'red')) : null,
    };
    if (L.material === 'crystal') { // everything is the same faceted red glass
      const glass = Object.assign(CRYSTAL.map(rgba), { crystal: true }), glassB = Object.assign(CRYSTAL.map((h) => rgba(shade(h, 0.78))), { crystal: true });
      for (const k of Object.keys(m)) if (k !== 'L' && m[k]) m[k] = /B$/.test(k) ? glassB : glass;
      m.glow = glass;
    }
    return m;
  }

  // pose: hx/hy hip offset, lean (rad, + = forward), tilt (head), fF/fB feet (rel. ground anchor),
  //       hF/hB fists (rel. neck), tail (headband phase), blink, mouth, dizzy.
  // Proportions are deliberately heavy: big fists and boots, thick limbs, broad shoulders and a
  // smallish head, so silhouettes read at a glance like classic arcade fighters.
  function drawPose(pose, mat, S) {
    const W = Math.round(BASE * S), H = Math.round(BASE * S);
    const buf = new Uint32Array(W * H);
    const L = mat.L, crystal = L.material === 'crystal';
    const B = L.build === 'heavy' ? 1.14 : L.build === 'slim' ? 0.86 : 1;
    const mask = () => makeMask(W, H, S);
    const put = (m, rp, sep) => { if (rp) paint(buf, W, H, m, rp, sep, S); };
    const P = (x, y) => ({ x, y });
    const st = L.style;
    const hip = P(BAX + (pose.hx || 0), BAY - 13.6 + (pose.hy || 0));
    const lean = pose.lean || 0, tilt = pose.tilt || 0;
    const sl = Math.sin(lean), cl = Math.cos(lean);
    const neck = P(hip.x + sl * 9.4, hip.y - cl * 9.4);
    const hd = P(neck.x + Math.sin(lean + tilt) * 3.7, neck.y - Math.cos(lean + tilt) * 3.7);
    const shF = P(neck.x + 1.5 * B, neck.y + 1.9), shB = P(neck.x - 2.1 * B, neck.y + 1.5);
    const hipF = P(hip.x + 1.4 * B, hip.y), hipB = P(hip.x - 1.6 * B, hip.y);
    const foot = (f) => P(BAX + f[0], BAY + f[1]);
    const hand = (h) => P(neck.x + h[0], neck.y + h[1]);
    const legF = ik(hipF, foot(pose.fF), 7.0, 6.8, P(1, 0.15));
    const legB = ik(hipB, foot(pose.fB), 7.0, 6.8, P(1, 0.15));
    const armF = ik(shF, hand(pose.hF), 5.0, 4.8, P(-0.35, 1));
    const armB = ik(shB, hand(pose.hB), 5.0, 4.8, P(-0.35, 1));
    const sleeves = ['gi', 'armor', 'robe', 'suit', 'tang', 'cyber', 'track', 'coat', 'hero'].includes(st);
    const wide = st === 'robe' ? 1.22 : 1;
    const shorts = L.legs === 'shorts';
    const dir = (a, b) => { const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1; return P(dx / d, dy / d); };
    const along = (a, b, k) => P(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k);

    // ---- behind the body: cape, tails, long hair ----
    if (mat.cape) {
      const sway = Math.sin(pose.tail || 0) * 0.8;
      put(mask().poly([P(shB.x - 0.5, shB.y - 1.2), P(shF.x - 0.5, shF.y - 1.4), P(hip.x - 2 - sl * 4, hip.y + 8.5), P(hip.x - 8 - sway - sl * 6, hip.y + 7.5)]), mat.capeB);
    }
    const tails = (root, rp, len, n = 4) => {
      const tm = mask();
      for (const off of [0, 1.4]) {
        let prev = P(root.x, root.y + off * 0.5);
        for (let k = 1; k <= n; k++) {
          const pt = P(root.x - k * 2.1 * len, root.y + off + k * 0.55 + Math.sin((pose.tail || 0) + k * 1.2 + off) * 0.35 * k);
          tm.line(prev, pt, 0.8, 0.65); prev = pt;
        }
      }
      put(tm, rp);
    };
    if (!crystal && mat.band && !['horned', 'kabuto', 'helmet', 'hardhat'].includes(L.head)) tails(P(hd.x - 3 * Math.cos(tilt), hd.y - 1.4), mat.band, pose.tailLen || 1);
    if (!crystal && mat.scarf) tails(P(neck.x - 1.5, neck.y + 0.6), mat.scarf, (pose.tailLen || 1) * 1.1, 3);
    if (!crystal && (L.hair === 'long' || L.hair === 'braid')) {
      const sway = Math.sin(pose.tail || 0) * 0.8;
      put(mask().line(P(hd.x - 2.4, hd.y), P(hd.x - 3.8 - sway, hd.y + 7), 1.6, L.hair === 'braid' ? 0.9 : 1.3), mat.hair);
    }

    // ---- limbs ----
    // The lower segment stops short of a fist/boot (`tuck`) so the fist or boot fully covers it.
    const seg = (a, b, r0, r1, rp, tuck = 0) => {
      const dv = dir(a, b), end = P(b.x - dv.x * tuck, b.y - dv.y * tuck);
      put(mask().line(a, end, r0, r1), rp);
    };
    const fist = (l, rp, big, sep) => { // a chunky, slightly squared fist
      const dv = dir(l.joint, l.end), r = (big ? 2.45 : 2.2) * (0.85 + 0.15 * B);
      const c = P(l.end.x + dv.x * 0.5, l.end.y + dv.y * 0.5);
      put(mask().line(P(l.end.x - dv.x * 1.4, l.end.y - dv.y * 1.4), c, 1.5 * B).disc(c.x, c.y, r).disc(c.x + dv.x * 0.6 - 0.3, c.y - 0.5, r * 0.85), rp, sep);
    };
    const boot = (l, rp) => { // long boxy boot with a flat sole
      const e = l.end;
      put(mask().poly([P(e.x - 1.9, e.y - 2.6), P(e.x + 1.4, e.y - 2.4), P(e.x + 3.6, e.y - 1.2), P(e.x + 3.7, e.y + 0.2), P(e.x - 2.1, e.y + 0.2)]), rp);
    };
    const leg = (l, root, k, back) => {
      const r0 = (back ? 2.55 : 2.7) * B * wide, rk = (back ? 2.1 : 2.25) * B * wide;
      const pantsRp = back ? mat.pantsB : mat.pants;
      if (shorts) { // shorts end above the knee; bare or wrapped shins below
        const mid = along(root, l.joint, 0.7);
        put(mask().line(root, mid, r0 * 1.05, rk * 1.05), pantsRp);
        put(mask().line(mid, l.joint, rk * 0.92, rk * 0.88), back ? mat.skinB : mat.skin);
        seg(l.joint, l.end, rk * 0.88, rk * 0.75, mat.shins ? (back ? mat.shinsB : mat.shins) : (back ? mat.skinB : mat.skin), 1.4);
      } else {
        put(mask().line(root, l.joint, r0, rk), pantsRp);
        seg(l.joint, l.end, rk, rk * 0.82, pantsRp, 1.4);
      }
      boot(l, back ? mat.shoeB : mat.shoe);
      void k;
    };
    const cyberArm = L.arm === 'cyber' && !crystal;
    const arm = (l, sh, back, sep) => {
      const ru = (back ? 1.85 : 2.0) * B, rf = (back ? 1.7 : 1.85) * B;
      const skinRp = back ? mat.skinB : mat.skin, sleeveRp = back ? mat.topB : mat.top;
      const metal = cyberArm && !back;
      const upperRp = metal ? mat.chrome : sleeves ? sleeveRp : skinRp;
      const lowerRp = metal ? mat.chrome : st === 'armor' || st === 'hero' || st === 'cyber' ? sleeveRp : sleeves && st !== 'gi' && st !== 'tang' ? sleeveRp : skinRp;
      put(mask().line(sh, l.joint, ru, ru * 0.92), upperRp, sep);
      const dv = dir(l.joint, l.end);
      put(mask().line(l.joint, P(l.end.x - dv.x * 1.2, l.end.y - dv.y * 1.2), rf, rf * 0.9), lowerRp, sep);
      if (sleeves && !metal && (st === 'gi' || st === 'tang')) { // wide sleeve cuff past the elbow
        put(mask().line(l.joint, along(l.joint, l.end, 0.35), rf * 1.18, rf * 1.12), sleeveRp, sep);
      }
      if (metal) { // glowing seams down the chrome arm
        const n = P(-dv.y, dv.x);
        put(mask().line(P(sh.x + n.x * 0.5, sh.y + n.y * 0.5), P(l.joint.x + n.x * 0.5, l.joint.y + n.y * 0.5), 0.32), mat.glow);
        put(mask().line(P(l.joint.x + n.x * 0.4, l.joint.y + n.y * 0.4), P(l.end.x - dv.x * 1.5 + n.x * 0.4, l.end.y - dv.y * 1.5 + n.y * 0.4), 0.32), mat.glow);
        put(mask().disc(l.joint.x, l.joint.y, 0.55), mat.glow);
      }
      if (st === 'track' && mat.trim) put(mask().line(sh, l.joint, 0.35).line(l.joint, along(l.joint, l.end, 0.8), 0.35), mat.trim);
      fist(l, metal ? mat.chrome : back ? mat.wrapsB : mat.wraps, !back, sep);
    };

    // Back arm (and anything it holds), back leg.
    arm(armB, shB, true, false);
    if (!crystal && L.prop === 'mic') { const e = armB.end; put(mask().line(P(e.x + 0.6, e.y - 0.6), P(e.x + 2.4, e.y - 3.2), 0.5), mat.black); put(mask().disc(e.x + 2.7, e.y - 3.6, 1.0), mat.steel); }
    if (!crystal && L.prop === 'phone') { const e = armB.end; put(mask().poly([P(e.x + 0.4, e.y - 3.6), P(e.x + 2.4, e.y - 3.9), P(e.x + 2.6, e.y - 0.2), P(e.x + 0.6, e.y + 0.1)]), mat.black); put(mask().poly([P(e.x + 0.9, e.y - 3.1), P(e.x + 2.0, e.y - 3.3), P(e.x + 2.1, e.y - 0.8), P(e.x + 1.0, e.y - 0.6)]), mat.glow); }
    leg(legB, hipB, 0, true);
    // Pelvis + front leg.
    put(mask().disc(hip.x, hip.y, 2.9 * B * wide), shorts ? mat.pants : mat.pants);
    leg(legF, hipF, 0, false);

    // Jacket hems below the belt (gi, robes, coats, suits).
    const hem = { gi: 3.6, robe: 6, tang: 4.2, suit: 3.2, coat: 8, cyber: 2.6, track: 1.2, hero: 0 }[st] || 0;
    if (hem) {
      const bx = cl * 3.6 * B, by = sl * 3.6 * B;
      put(mask().poly([P(hip.x - bx - 0.6, hip.y - 1.6 - by), P(hip.x + bx + 0.8, hip.y - 1.6 + by), P(hip.x + bx + 1.2 + sl * hem * 0.4, hip.y + hem), P(hip.x - bx - 1.4 + sl * hem * 0.4, hip.y + hem)]), st === 'coat' || st === 'robe' ? mat.top : mat.topB);
    }

    // Torso: waist up to a broad chest, with shoulder caps.
    const chestR = 4.3 * B, waistR = 3.4 * B;
    const torso = mask().line(P(hip.x - sl, hip.y - 1.2), P(neck.x - sl * 0.6, neck.y + 2.2), waistR, chestR)
      .disc(shF.x, shF.y - 0.2, 2.7 * B).disc(shB.x, shB.y - 0.2, 2.5 * B);
    const torsoRp = mat.top;
    if (st === 'tank') { // bare shoulders, the top starts at the chest
      put(mask().disc(shF.x, shF.y - 0.2, 2.6 * B).disc(shB.x, shB.y - 0.2, 2.4 * B).line(P(neck.x, neck.y), P(neck.x, neck.y + 2), 2.6 * B), mat.skin);
      put(mask().line(P(hip.x - sl, hip.y - 1.2), P(neck.x - sl * 0.6 + 0.4, neck.y + 2.6), waistR, chestR * 0.92), torsoRp);
    } else put(torso, torsoRp);
    // Outfit details on the chest.
    const chest = P(neck.x + 0.6 - sl * 2, neck.y + 3.6);
    if (!crystal) {
      if (st === 'vest' || st === 'fur') {
        put(mask().poly([P(neck.x + 0.4, neck.y + 0.4), P(neck.x + 3.6, neck.y + 0.6), P(neck.x + 1.4 - sl * 3, neck.y + 5.4)]), mat.skin);
      } else if (st === 'gi' || st === 'robe') { // crossed lapel
        put(mask().line(P(neck.x + 2.4, neck.y + 0.6), P(neck.x + 0.2 - sl * 3, neck.y + 6.4), 0.6), mat.trim || mat.wraps);
        put(mask().poly([P(neck.x + 0.8, neck.y + 0.3), P(neck.x + 3.2, neck.y + 0.5), P(neck.x + 1.6, neck.y + 3.0)]), mat.skin);
      } else if (st === 'suit') { // shirt, tie and lapels
        put(mask().poly([P(neck.x + 0.2, neck.y + 0.2), P(neck.x + 3.4, neck.y + 0.4), P(neck.x + 1.4 - sl * 2, neck.y + 5.6)]), mat.white);
        if (L.tie === 'bow') put(mask().poly([P(neck.x + 0.6, neck.y + 0.6), P(neck.x + 1.8, neck.y + 1.3), P(neck.x + 3.0, neck.y + 0.6), P(neck.x + 3.0, neck.y + 2.2), P(neck.x + 1.8, neck.y + 1.5), P(neck.x + 0.6, neck.y + 2.2)]), mat.tie);
        else put(mask().line(P(neck.x + 1.8, neck.y + 0.8), P(neck.x + 1.3 - sl * 2, neck.y + 5.2), 0.55, 0.75), mat.tie);
        put(mask().line(P(neck.x + 0.1, neck.y + 0.4), P(neck.x + 1.1 - sl * 2, neck.y + 5.8), 0.4).line(P(neck.x + 3.5, neck.y + 0.5), P(neck.x + 1.7 - sl * 2, neck.y + 5.8), 0.4), mat.topB);
      } else if (st === 'tang') { // mandarin collar and frog buttons
        put(mask().line(P(neck.x - 0.8, neck.y + 0.2), P(neck.x + 2.6, neck.y + 0.4), 0.7), mat.trim || mat.topB);
        for (let i = 0; i < 4; i++) { const by = neck.y + 1.9 + i * 1.5, bx = neck.x + 1.6 - sl * (1.5 + i * 0.45); put(mask().line(P(bx - 0.9, by), P(bx + 0.9, by), 0.28), mat.trim || mat.ivory); }
      } else if (st === 'cyber') { // high collar and glowing seams
        put(mask().line(P(neck.x - 1.4, neck.y + 0.2), P(neck.x + 2.4, neck.y + 0.1), 0.9), mat.topB);
        put(mask().line(P(neck.x + 1.0, neck.y + 1.4), P(hip.x + 1.0 - sl, hip.y - 1.6), 0.3), mat.glow);
        put(mask().line(P(shB.x + 0.5, shB.y + 1.6), P(neck.x + 1.0, neck.y + 2.2), 0.3), mat.glow);
      } else if (st === 'track') {
        put(mask().line(P(neck.x + 1.6, neck.y + 0.4), P(hip.x + 1.2 - sl, hip.y - 1.6), 0.3), mat.trim || mat.white);
        put(mask().line(P(neck.x - 1.2, neck.y + 0.2), P(neck.x + 2.4, neck.y + 0.2), 0.7), mat.trim || mat.topB);
      } else if (st === 'coat') { // trench coat lapels and buttons
        put(mask().line(P(neck.x + 0.4, neck.y + 0.2), P(neck.x + 1.6 - sl * 2, neck.y + 5.4), 0.55).line(P(neck.x + 3.4, neck.y + 0.4), P(neck.x + 1.6 - sl * 2, neck.y + 5.4), 0.55), mat.topB);
        put(mask().disc(neck.x + 1.2 - sl * 2.5, neck.y + 6.4, 0.4).disc(neck.x + 1.0 - sl * 3, neck.y + 7.8, 0.4), mat.trim || mat.black);
      } else if (st === 'hero') { // chest emblem
        put(mask().poly([P(chest.x - 1.4, chest.y - 1.0), P(chest.x + 1.6, chest.y - 1.0), P(chest.x + 0.1, chest.y + 1.4)]), mat.trim || mat.gold);
      } else if (st === 'armor') {
        put(mask().disc(chest.x, chest.y - 0.2, 2.5 * B), mat.steel);
      }
      if (mat.trim && (st === 'fur' || st === 'robe')) { // fur collar / trim on the shoulders
        put(mask().disc(shF.x - 0.2, shF.y - 0.9, 1.8 * B).disc(shB.x + 0.4, shB.y - 0.8, 1.7 * B).disc(neck.x - 0.3, neck.y + 0.3, 1.7), mat.trim);
      }
      if (mat.cape) put(mask().disc(shF.x - 0.4, shF.y - 1.1, 1.3).disc(shB.x + 0.3, shB.y - 1.0, 1.3), mat.cape);
    }
    // Belt or sash with knot tails.
    if (st !== 'suit' && st !== 'coat' && st !== 'track' && st !== 'cyber' && st !== 'tank' || L.belt) {
      const bx = cl * 3.8 * B, by = sl * 3.8 * B;
      const belt = mask().line(P(hip.x - bx, hip.y - 1.5 - by), P(hip.x + bx, hip.y - 1.5 + by), st === 'tang' ? 1.25 : 1.0);
      belt.line(P(hip.x - bx * 0.7, hip.y - 1), P(hip.x - bx * 0.7 - 1.4, hip.y + 2.6 + (pose.knot || 0)), 0.65);
      if (st === 'tang' || st === 'gi') belt.line(P(hip.x - bx * 0.55, hip.y - 1), P(hip.x - bx * 0.55 - 0.4, hip.y + 3.2 + (pose.knot || 0)), 0.6);
      put(belt, mat.belt);
    }

    // ---- head ----
    const HR = 3.3; // head size: a bit small for the body, which makes the figure read as powerful
    const hairOn = !crystal && L.hair !== 'bald';
    const covered = ['hood', 'straw', 'bowler', 'tophat', 'fedora', 'cowboy', 'tricorn', 'hardhat', 'helmet', 'peaked', 'cap', 'horned', 'kabuto'].includes(L.head);
    if (hairOn) {
      if (L.hair === 'afro') put(mask().disc(hd.x - 0.8, hd.y - 1.4, 4.5), mat.hair);
      put(mask().disc(hd.x - 0.7, hd.y - 0.5, HR + 0.1), mat.hair);
    } else put(mask().disc(hd.x - 0.3, hd.y - 0.3, HR - 0.2), mat.skin);
    put(mask().disc(hd.x + 0.8, hd.y + 0.6, HR - 0.55).disc(hd.x + 1.9, hd.y + 2.0, 1.55 * (L.build === 'heavy' ? 1.12 : 1)), mat.skin);
    if (hairOn && !covered) {
      const hm = mask();
      if (L.hair === 'spiky') {
        hm.line(P(hd.x - 1, hd.y - 2.6), P(hd.x - 0.5, hd.y - 5.8), 0.95).line(P(hd.x - 2.5, hd.y - 2.2), P(hd.x - 4.4, hd.y - 4.6), 0.9)
          .line(P(hd.x + 1.0, hd.y - 2.6), P(hd.x + 2.6, hd.y - 5.0), 0.85).line(P(hd.x - 3.2, hd.y - 0.8), P(hd.x - 6.0, hd.y - 1.8), 0.85);
      } else if (L.hair === 'topknot') hm.disc(hd.x - 1.2, hd.y - 4.4, 1.6).line(P(hd.x - 1.2, hd.y - 3.6), P(hd.x - 3.2, hd.y - 5.2), 0.7);
      else if (L.hair === 'mohawk') { // tall crest of spikes
        for (let i = 0; i < 4; i++) hm.line(P(hd.x + 1.4 - i * 1.4, hd.y - 2.8 + i * 0.3), P(hd.x + 1.8 - i * 1.6, hd.y - 6.4 + i * 0.5), 0.8, 0.35);
        hm.line(P(hd.x + 1.5, hd.y - 3.2), P(hd.x - 3.2, hd.y - 2.8), 1.1);
      } else if (L.hair === 'bun') hm.disc(hd.x - 1.4, hd.y - 4.0, 2.0);
      else if (L.hair === 'long' || L.hair === 'braid') hm.disc(hd.x - 0.5, hd.y - 2.4, 3.0);
      else if (L.hair === 'slick') hm.disc(hd.x - 0.2, hd.y - 2.2, 2.9).line(P(hd.x + 2, hd.y - 2.6), P(hd.x - 3.6, hd.y - 1.6), 0.9);
      else if (L.hair === 'short') hm.disc(hd.x - 0.2, hd.y - 1.9, 2.9);
      put(hm, mat.hair);
    }
    if (!crystal && L.beard) put(mask().disc(hd.x + 2.2, hd.y + 3.4, 1.3).line(P(hd.x + 0.3, hd.y + 2.7), P(hd.x + 2.2, hd.y + 3.8), 0.75), mat.hair); // chin beard along the jaw
    if (!crystal && L.moustache) put(mask().line(P(hd.x + 1.6, hd.y + 2.3), P(hd.x + 3.6, hd.y + 2.1), 0.5), mat.hair);
    if (!crystal && L.bandana) put(mask().poly([P(hd.x + 0.2, hd.y + 1.4), P(hd.x + 3.8, hd.y + 1.0), P(hd.x + 3.4, hd.y + 3.6), P(hd.x + 0.8, hd.y + 4.2)]), ramp(...(COLORS[L.bandana] || COLORS.red)));
    if (!crystal && mat.band && L.head === 'none') put(mask().line(P(hd.x - 3.4, hd.y - 1.4), P(hd.x + 3.4, hd.y - 1.8 + tilt * 2), 0.9), mat.band);
    // Headgear.
    const brim = (y, x0, x1, r, rp) => put(mask().line(P(hd.x + x0, hd.y + y), P(hd.x + x1, hd.y + y - 0.2), r), rp);
    if (!crystal) {
      if (L.head === 'straw') put(mask().poly([P(hd.x - 7.2, hd.y - 1.0), P(hd.x + 7.2, hd.y - 1.4), P(hd.x - 0.2, hd.y - 6.4)]), mat.straw);
      else if (L.head === 'horned') {
        put(mask().poly([P(hd.x - 3.6, hd.y - 1.1), P(hd.x + 3.4, hd.y - 1.4), P(hd.x + 2.4, hd.y - 4.0), P(hd.x - 0.4, hd.y - 5.1), P(hd.x - 3.2, hd.y - 3.8)]), mat.steel);
        put(mask().line(P(hd.x - 3.0, hd.y - 3.0), P(hd.x - 5.2, hd.y - 6.4), 1.0, 0.45).line(P(hd.x + 2.2, hd.y - 3.4), P(hd.x + 4.0, hd.y - 6.8), 1.0, 0.45), mat.ivory);
        brim(-1.3, -3.6, 3.4, 0.55, mat.gold);
      } else if (L.head === 'hood') {
        put(mask().disc(hd.x - 0.6, hd.y - 0.8, 3.9).line(P(hd.x - 3, hd.y), P(hd.x - 5.2, hd.y + 4), 1.2), mat.band || mat.topB);
        put(mask().disc(hd.x + 1.2, hd.y + 0.9, 2.3), mat.skin);
      } else if (L.head === 'kabuto') {
        put(mask().disc(hd.x - 0.3, hd.y - 1.6, 3.6).line(P(hd.x - 4.0, hd.y - 0.5), P(hd.x - 5.4, hd.y + 1.2), 0.9), mat.top);
        put(mask().line(P(hd.x + 0.4, hd.y - 4.2), P(hd.x - 2.6, hd.y - 7.4), 0.55).line(P(hd.x + 0.4, hd.y - 4.2), P(hd.x + 3.4, hd.y - 7.4), 0.55), mat.gold);
      } else if (L.head === 'bowler') {
        put(mask().disc(hd.x - 0.2, hd.y - 2.2, 2.9), mat.hat); brim(-1.6, -3.8, 3.6, 0.6, mat.hat);
      } else if (L.head === 'tophat') {
        put(mask().poly([P(hd.x - 2.6, hd.y - 1.6), P(hd.x + 2.4, hd.y - 1.8), P(hd.x + 2.2, hd.y - 8.0), P(hd.x - 2.4, hd.y - 7.8)]), mat.hat);
        put(mask().line(P(hd.x - 2.5, hd.y - 2.6), P(hd.x + 2.3, hd.y - 2.8), 0.4), mat.tie); brim(-1.6, -3.8, 3.6, 0.55, mat.hat);
      } else if (L.head === 'fedora') {
        put(mask().poly([P(hd.x - 2.8, hd.y - 1.8), P(hd.x + 2.8, hd.y - 2.0), P(hd.x + 2.2, hd.y - 5.0), P(hd.x, hd.y - 4.4), P(hd.x - 2.4, hd.y - 5.0)]), mat.hat);
        put(mask().line(P(hd.x - 2.7, hd.y - 2.4), P(hd.x + 2.7, hd.y - 2.6), 0.4), mat.black); brim(-1.7, -4.6, 4.4, 0.55, mat.hat);
      } else if (L.head === 'cowboy') {
        put(mask().poly([P(hd.x - 2.6, hd.y - 1.8), P(hd.x + 2.8, hd.y - 2.0), P(hd.x + 2.0, hd.y - 5.2), P(hd.x, hd.y - 4.6), P(hd.x - 2.0, hd.y - 5.2)]), mat.hat);
        put(mask().line(P(hd.x - 5.6, hd.y - 2.6), P(hd.x - 3, hd.y - 1.6), 0.55).line(P(hd.x - 3, hd.y - 1.6), P(hd.x + 3.2, hd.y - 1.8), 0.6).line(P(hd.x + 3.2, hd.y - 1.8), P(hd.x + 5.6, hd.y - 2.9), 0.55), mat.hat);
      } else if (L.head === 'tricorn') {
        put(mask().poly([P(hd.x - 5.0, hd.y - 2.4), P(hd.x + 4.8, hd.y - 2.6), P(hd.x + 3.6, hd.y - 1.2), P(hd.x + 1.6, hd.y - 5.2), P(hd.x - 1.6, hd.y - 5.4), P(hd.x - 3.8, hd.y - 1.0)]), mat.hat);
        put(mask().line(P(hd.x - 4.4, hd.y - 2.4), P(hd.x - 1.4, hd.y - 5.0), 0.3).line(P(hd.x + 1.4, hd.y - 5.0), P(hd.x + 4.2, hd.y - 2.6), 0.3), mat.gold);
      } else if (L.head === 'hardhat') {
        put(mask().disc(hd.x - 0.1, hd.y - 2.0, 3.1), mat.hat); brim(-1.4, -3.6, 4.6, 0.55, mat.hat);
        put(mask().line(P(hd.x - 0.2, hd.y - 4.8), P(hd.x - 0.2, hd.y - 1.8), 0.4), ramp(...darkRamp(COLORS[L.hat] || COLORS.yellow, 0.8)));
      } else if (L.head === 'helmet') { // full-face motorcycle helmet with a visor slot
        put(mask().disc(hd.x - 0.1, hd.y - 0.2, 3.7).disc(hd.x + 1.2, hd.y + 1.4, 2.6), mat.hat);
        put(mask().line(P(hd.x + 0.6, hd.y + 0.2), P(hd.x + 3.9, hd.y), 0.8), mat.glow);
      } else if (L.head === 'cap' || L.head === 'peaked') {
        put(mask().disc(hd.x - 0.2, hd.y - 1.8, 3.0), mat.hat);
        if (L.head === 'peaked') { put(mask().poly([P(hd.x - 3.2, hd.y - 2.4), P(hd.x + 3.2, hd.y - 2.6), P(hd.x + 3.4, hd.y - 4.6), P(hd.x - 3.4, hd.y - 4.4)]), mat.hat); put(mask().line(P(hd.x - 3, hd.y - 2.5), P(hd.x + 3, hd.y - 2.7), 0.35), mat.gold); }
        put(mask().line(P(hd.x + 1.0, hd.y - 1.6), P(hd.x + 4.8, hd.y - 1.2), 0.55), mat.hat);
      }
    }
    // Face: eye, mouth, visor or shades, brow and nose shading on the bigger sprites.
    const px = (x, y, c) => {
      const s = Math.max(1, Math.round(S * 0.8));
      const X = Math.round(x * S), Y = Math.round(y * S);
      for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) if (X + i < W && Y + j < H) buf[(Y + j) * W + X + i] = c;
    };
    const ex = hd.x + 2.0, ey = hd.y + 0.3;
    if (!crystal && L.head !== 'helmet') {
      if (L.visor) {
        put(mask().line(P(hd.x - 0.6, ey - 0.1), P(hd.x + 3.4, ey - 0.3), 0.85), Object.assign(ramp(...(COLORS[L.visor] || COLORS.cyan)), {}));
        put(mask().line(P(hd.x + 0.6, ey - 0.5), P(hd.x + 2.4, ey - 0.6), 0.22), mat.white);
      } else if (L.shades) put(mask().line(P(hd.x + 0.2, ey), P(hd.x + 3.3, ey - 0.2), 0.7), ramp(...(COLORS[L.shades] || COLORS.black)));
      else {
        if (L.mask) put(mask().line(P(hd.x - 0.2, ey), P(hd.x + 3.4, ey - 0.2), 0.95), ramp(...(COLORS[L.mask] || COLORS.black)));
        if (pose.dizzy) { px(ex, ey, rgba('#ffffff')); px(ex - 1, ey - 1, OUT); }
        else if (pose.blink) { px(ex, ey, OUT); px(ex - 1, ey, OUT); }
        else { px(ex, ey, OUT); px(ex, ey - 1, OUT); }
      }
      if (pose.mouth === 'open' && !L.bandana) { px(hd.x + 2.9, hd.y + 2.8, OUT); px(hd.x + 2.9, hd.y + 3.6, OUT); }
      if (S >= 2) {
        const one = (x, y, c) => { const X = Math.round(x * S), Y = Math.round(y * S); if (X >= 0 && Y >= 0 && X < W && Y < H && buf[Y * W + X]) buf[Y * W + X] = c; };
        if (!L.visor && !L.shades) for (let i = 0; i < 3; i++) one(ex - 1 + i * 0.4, hd.y - 1.1 - (pose.mouth === 'open' && i === 0 ? 0.3 : 0), mat.hair[0]);
        if (!covered && L.head !== 'hood') put(mask().disc(hd.x - 0.6, hd.y + 0.9, 0.8), mat.skin); // ear
        one(hd.x + 3.2, hd.y + 1.6, mat.skin[0]); one(hd.x + 2.9, hd.y + 1.9, mat.skin[0]);
      }
    }
    // A cane held in the front hand, drawn before the arm so the fist grips it.
    if (!crystal && L.prop === 'cane') {
      const e = armF.end;
      put(mask().line(P(e.x + 0.6, e.y - 1.2), P(e.x + 2.6, BAY - 0.2), 0.5), mat.black);
      put(mask().line(P(e.x + 0.6, e.y - 1.2), P(e.x - 1.0, e.y - 2.4), 0.5), mat.black);
    }
    // Front arm last, outlined against the body.
    arm(armF, shF, false, true);

    outline(buf, W, H, S >= 2);
    cleanup(buf, W, H);
    return { buf, W, H };
  }

  function toCanvas({ buf, W, H }) {
    const c = KF.makeCanvas(W, H), x = c.getContext('2d');
    const img = x.createImageData(W, H);
    new Uint32Array(img.data.buffer).set(buf);
    x.putImageData(img, 0, 0);
    return c;
  }
  function tint(src, color) {
    const c = KF.makeCanvas(src.width, src.height), x = c.getContext('2d');
    x.drawImage(src, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = color; x.fillRect(0, 0, src.width, src.height);
    return c;
  }

  // ---- animation poses ----
  const TAU = Math.PI * 2;
  const POSES = {
    idle: [0, 1, 2, 3].map((i) => {
      const b = [0, 0.6, 1, 0.6][i];
      return { hy: 2.4 + b, lean: 0.1, tilt: -0.04, fF: [6.6, 0], fB: [-6.6, 0], hF: [7.6, 1.4 + b * 0.5], hB: [4.2, 3.0 + b * 0.5], tail: i * 1.6, tailLen: 0.8, knot: b * 0.5, blink: i === 3 };
    }),
    run: [0, 1, 2, 3, 4, 5].map((i) => {
      const p = (i / 6) * TAU, s = Math.sin(p), c = Math.cos(p);
      return { hy: 1.2 - Math.abs(c) * 1.6, hx: 1, lean: 0.32, tilt: -0.12, fF: [6.5 * s, -Math.max(0, c) * 4.5], fB: [-6.5 * s, -Math.max(0, -c) * 4.5], hF: [1.5 - 4 * s, 3.2 + c * 1.2], hB: [1.5 + 4 * s, 3.2 - c * 1.2], tail: p * 2, tailLen: 1.2 };
    }),
    rise: [0, 1].map((i) => ({ hy: -1, lean: 0.08, tilt: -0.15, fF: [4.5, -6], fB: [-2.5, -1.5], hF: [3.5, -7.5], hB: [-3.5, 2.5], tail: i * 2.5, tailLen: 1.1, mouth: 'open' })),
    fall: [0, 1].map((i) => ({ hy: 0, lean: -0.04, tilt: 0.05, fF: [4, -1.2], fB: [-4, -3.5], hF: [6.5, -2 - i], hB: [-5.5, -3.5 + i], tail: 1 + i * 2.5, tailLen: 1.2 })),
    land: [{ hy: 4.2, lean: 0.3, tilt: -0.05, fF: [6.5, 0], fB: [-6.5, 0], hF: [5.5, 2.5], hB: [1, 4.5], tail: 0.5, tailLen: 0.7 }],
    skid: [{ hy: 2.5, lean: -0.28, tilt: 0.12, fF: [7, 0], fB: [-3, 0], hF: [-2, 1], hB: [-6, -1], tail: 2, tailLen: 1.3, mouth: 'open' }],
    victory: [0, 1, 2, 3].map((i) => {
      const up = [0.4, 1, 0.9, 1][i];
      return { hy: 1 - up, lean: -0.1, tilt: -0.25 * up, fF: [3.5, 0], fB: [-3.5, 0], hF: [1.5, -4 - 8 * up], hB: [-4, 4.5], tail: i * 1.8, tailLen: 1, mouth: up > 0.8 ? 'open' : null };
    }),
    hurt: [{ hy: -1, lean: -0.55, tilt: -0.45, fF: [5, -4], fB: [-1.5, -1.5], hF: [-7, -6], hB: [-7.5, -2], tail: 3, tailLen: 1.3, mouth: 'open', dizzy: true }],
    // ---- fighting moves ----
    walk: [0, 1, 2, 3].map((i) => {
      const p = (i / 4) * TAU, s = Math.sin(p);
      return { hy: 2.4 + Math.abs(Math.cos(p)) * 0.6, lean: 0.1, tilt: -0.04, fF: [6.4 + s * 2.5, -Math.max(0, Math.cos(p)) * 1.5], fB: [-6.4 + s * 2.5, -Math.max(0, -Math.cos(p)) * 1.5], hF: [7.6, 1.4], hB: [4.2, 3.0], tail: i * 1.6, tailLen: 0.9 };
    }),
    jab: [{ hy: 2, lean: 0.3, tilt: -0.1, fF: [6, 0], fB: [-5, 0], hF: [10.5, -1], hB: [2, 2], tail: 1, tailLen: 1.1 }],
    cross: [{ hy: 2, hx: 1, lean: 0.42, tilt: -0.12, fF: [7, 0], fB: [-4.5, 0], hF: [1, 2.5], hB: [10.5, -1.5], tail: 2, tailLen: 1.2, mouth: 'open' }],
    upper: [{ hy: -0.5, lean: 0.1, tilt: -0.3, fF: [5, 0], fB: [-4, 0], hF: [4.5, -10], hB: [-1.5, 3], tail: 3, tailLen: 1.3, mouth: 'open' }],
    kick: [{ hy: -0.5, hx: -1, lean: -0.32, tilt: 0.1, fF: [13, -9.5], fB: [-3, 0], hF: [3, -2], hB: [-5, 1], tail: 1.5, tailLen: 1.2 }],
    windup: [{ hy: 2.5, hx: -1, lean: 0.0, tilt: 0, fF: [4, 0], fB: [-6, 0], hF: [3, 1], hB: [-2, 1], tail: 0.5, tailLen: 0.9 }],
    airkick: [{ hy: -2, lean: 0.2, tilt: -0.1, fF: [10, -3], fB: [-2, -6], hF: [3, -3], hB: [-4, -1], tail: 2, tailLen: 1.4, mouth: 'open' }],
    block: [{ hy: 3, hx: -0.5, lean: -0.08, tilt: 0.12, fF: [5, 0], fB: [-6.6, 0], hF: [5.6, -2.6], hB: [5.0, 0.4], tail: 0.5, tailLen: 0.7 }],
    palm: [{ hy: 2.5, hx: 1, lean: 0.35, tilt: -0.1, fF: [7, 0], fB: [-6, 0], hF: [10, -0.5], hB: [9.5, 1], tail: 2.5, tailLen: 1.4, mouth: 'open' }],
    spin: [0, 1].map((i) => ({ hy: -3, lean: i ? -0.4 : 0.2, tilt: 0, fF: i ? [-11, -8] : [12, -8], fB: [i ? 3 : -3, -2], hF: [i ? -4 : 5, -4], hB: [i ? 4 : -5, -4], tail: i * 3, tailLen: 1.5 })),
    stomp: [{ hy: -2, lean: 0.05, tilt: -0.2, fF: [4, -9], fB: [-4, -1], hF: [5, -9], hB: [-4, -8], tail: 2, tailLen: 1.2, mouth: 'open' }],
    stagger: [{ hy: 1, hx: -2, lean: -0.35, tilt: 0.3, fF: [4, 0], fB: [-6, 0], hF: [-1, 3], hB: [-5, 2], tail: 3, tailLen: 1.2, mouth: 'open' }],
    down: [{ hy: -1, lean: -0.55, tilt: -0.45, fF: [5, -4], fB: [-1.5, -1.5], hF: [-7, -6], hB: [-7.5, -2], tail: 3, tailLen: 1.3, mouth: 'open', dizzy: true }],
  };

  const PLATFORM_POSES = ['idle', 'run', 'rise', 'fall', 'land', 'skid', 'victory', 'hurt'];
  const cache = new Map();

  // Build every frame for a look at a scale. Cached, since customisation screens rebuild often.
  // scale = logical size (1 = 40x40 logical units). Pixels are rasterised at scale * RES.
  function buildSet(look = {}, scale = 1, names = null) {
    const S = scale * KF.RES;
    const key = JSON.stringify([look, S, names]);
    if (cache.has(key)) return cache.get(key);
    const mat = materials(look);
    const frames = {};
    for (const name of names || Object.keys(POSES)) {
      frames[name] = POSES[name].map((pose) => {
        const c = toCanvas(drawPose(pose, mat, S));
        return { img: c, ghostA: tint(c, '#38e8ff'), ghostB: tint(c, '#ff4fb8'), flash: tint(c, '#ffffff') };
      });
    }
    const set = { frames, S, W: BASE * scale, H: BASE * scale, AX: BAX * scale, AY: BAY * scale, look };
    cache.set(key, set);
    return set;
  }

  function pick(frames, state, t) {
    switch (state) {
      case 'idle': return frames.idle[Math.floor(t * 4) % 4];
      case 'run': return frames.run[Math.floor(t * 14) % 6];
      case 'rise': return frames.rise[Math.floor(t * 10) % 2];
      case 'fall': return frames.fall[Math.floor(t * 10) % 2];
      case 'land': return frames.land[0];
      case 'skid': return frames.skid[0];
      case 'victory': return frames.victory[t < 0.5 ? Math.min(3, Math.floor(t * 8)) : 2 + (Math.floor(t * 3) % 2)];
      default: return frames.hurt[0];
    }
  }

  // KF.Sprites is the player's current platforming set; setLook() swaps it after customisation.
  const Sprites = {
    COLORS, SKIN, HAIR, DEFAULT_LOOK, POSES, buildSet,
    W: BASE, H: BASE, AX: BAX, AY: BAY,
    set: null,
    get frames() { return this.set.frames; },
    setLook(look) { this.set = buildSet(look, 1, PLATFORM_POSES); },
    pick(state, t) { return pick(this.set.frames, state, t); },
    pickIn: pick,
    // Draw a frame with feet at (x, y). flipY: upside-down (gravity flipped).
    draw(ctx, frame, x, y, facing, flipY = false, which = 'img', set = this.set) {
      ctx.save();
      ctx.translate(Math.round(x), Math.round(y));
      ctx.scale(facing < 0 ? -1 : 1, flipY ? -1 : 1);
      ctx.drawImage(frame[which], -set.AX, -set.AY, set.W, set.H);
      ctx.restore();
    },
    // Draw a frame at its logical size with its feet anchor at the current origin.
    blit(ctx, frame, set, which = 'img', dx = 0, dy = 0) { ctx.drawImage(frame[which], -set.AX + dx, -set.AY + dy, set.W, set.H); },
  };
  Sprites.setLook(DEFAULT_LOOK);
  KF.Sprites = Sprites;
})(window.KF);
