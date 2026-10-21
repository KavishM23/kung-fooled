'use strict';
// Fighters drawn entirely in code. A pose (joint targets) is rasterised part by part into a pixel
// buffer with a 3-step shading ramp per material and a dark outline. A "look" (outfit, hair,
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
  const ramp = (a, b, c) => [rgba(a), rgba(b), rgba(c)]; // shadow, base, highlight
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
  };
  const SKIN = {
    tan: ['#9a4e34', '#dc8c5c', '#f6c08e'], light: ['#a8624a', '#eaa880', '#ffd8b4'],
    dark: ['#3e1e12', '#7a4630', '#aa6c4c'], pale: ['#b08070', '#f0c8b0', '#fff0e4'], green: ['#1e4a20', '#4a8a3a', '#8ac870'],
  };
  const HAIR = {
    black: ['#0c0812', '#241c32', '#3e3452'], brown: ['#2a1408', '#5a3418', '#8a5a30'],
    blond: ['#8a6418', '#d8b048', '#fff0a0'], red: ['#5a120a', '#b8361a', '#f07a40'],
    white: ['#7a7a88', '#c8c8d4', '#ffffff'], pink: ['#8a2a5a', '#e070a8', '#ffb8d8'], blue: ['#0c1a4a', '#2a50b0', '#70a0f0'],
  };
  const OUT = rgba('#1b1022');

  // Default look: BAO as he appears in the platform stages.
  const DEFAULT_LOOK = {
    skin: 'tan', hair: 'spiky', hairColor: 'black', band: 'orange', head: 'none', beard: false,
    top: 'teal', style: 'vest', pants: 'indigo', wraps: 'cream', shoes: 'hide', trim: null, weapon: null,
  };

  // ---- rasteriser ----
  function makeMask(W, H, S) {
    const m = new Uint8Array(W * H);
    const M = {
      get(x, y) { return x >= 0 && y >= 0 && x < W && y < H ? m[y * W + x] : 0; },
      set(x, y) { if (x >= 0 && y >= 0 && x < W && y < H) m[y * W + x] = 1; },
      // All shape coords are design units; S converts to pixels.
      disc(cx, cy, r) {
        cx *= S; cy *= S; r *= S;
        for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
          const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
          if (dx * dx + dy * dy <= r * r) M.set(x, y);
        }
        return M;
      },
      line(a, b, r0, r1 = r0) {
        const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 2 * S));
        for (let i = 0; i <= n; i++) { const t = i / n; M.disc(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, r0 + (r1 - r0) * t); }
        return M;
      },
      poly(pts) {
        const p = pts.map((q) => ({ x: q.x * S, y: q.y * S }));
        let x0 = W, x1 = 0, y0 = H, y1 = 0;
        for (const q of p) { x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); }
        for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
          const px = x + 0.5, py = y + 0.5;
          let inside = false;
          for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
            const a = p[i], b = p[j];
            if ((a.y > py) !== (b.y > py) && px < ((b.x - a.x) * (py - a.y)) / (b.y - a.y) + a.x) inside = !inside;
          }
          if (inside) M.set(x, y);
        }
        return M;
      },
    };
    return M;
  }

  // Paint a mask: highlight on top/left edges, shadow on bottom/right; `sep` outlines it against
  // parts already painted (keeps a front arm readable over the torso).
  function paint(buf, W, H, mask, rp, sep = false) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!mask.get(x, y)) continue;
      let c = rp[1];
      if (!mask.get(x, y - 1) || !mask.get(x - 1, y)) c = rp[2];
      else if (!mask.get(x, y + 1) || !mask.get(x + 1, y) || !mask.get(x + 1, y + 1)) c = rp[0];
      if (sep) {
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (!mask.get(nx, ny) && nx >= 0 && ny >= 0 && nx < W && ny < H && buf[ny * W + nx]) { c = OUT; break; }
        }
      }
      buf[y * W + x] = c;
    }
  }
  function outline(buf, W, H) {
    const src = buf.slice();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (src[y * W + x]) continue;
      if ((x > 0 && src[y * W + x - 1]) || (x < W - 1 && src[y * W + x + 1]) || (y > 0 && src[(y - 1) * W + x]) || (y < H - 1 && src[(y + 1) * W + x])) buf[y * W + x] = OUT;
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
    const skin = SKIN[L.skin] || SKIN.tan;
    const top = COLORS[L.top] || COLORS.teal, pants = COLORS[L.pants] || COLORS.indigo;
    const wraps = COLORS[L.wraps] || COLORS.cream;
    return {
      L,
      skin: ramp(...skin), skinB: ramp(...darkRamp(skin)),
      hair: ramp(...(HAIR[L.hairColor] || HAIR.black)),
      band: L.band && L.band !== 'none' ? ramp(...(COLORS[L.band] || COLORS.orange)) : null,
      top: ramp(...top), topB: ramp(...darkRamp(top)),
      pants: ramp(...pants), pantsB: ramp(...darkRamp(pants, 0.7)),
      wraps: ramp(...wraps), wrapsB: ramp(...darkRamp(wraps, 0.72)),
      shoe: ramp(...(COLORS[L.shoes] || COLORS.hide)),
      trim: L.trim ? ramp(...(COLORS[L.trim] || COLORS.ivory)) : null,
      steel: ramp(...COLORS.steel), ivory: ramp(...COLORS.ivory), straw: ramp(...COLORS.straw),
      gold: ramp(...COLORS.gold), wood: ramp(...COLORS.hide),
    };
  }

  // pose: hx/hy hip offset, lean (rad, + = forward), tilt (head), fF/fB feet (rel. ground anchor),
  //       hF/hB fists (rel. neck), tail (headband phase), blink, mouth, dizzy.
  function drawPose(pose, mat, S) {
    const W = Math.round(BASE * S), H = Math.round(BASE * S);
    const buf = new Uint32Array(W * H);
    const L = mat.L;
    const mask = () => makeMask(W, H, S);
    const put = (m, rp, sep) => paint(buf, W, H, m, rp, sep);
    const P = (x, y) => ({ x, y });
    const hip = P(BAX + (pose.hx || 0), BAY - 13 + (pose.hy || 0));
    const lean = pose.lean || 0, tilt = pose.tilt || 0;
    const neck = P(hip.x + Math.sin(lean) * 9, hip.y - Math.cos(lean) * 9);
    const hd = P(neck.x + Math.sin(lean + tilt) * 4.2, neck.y - Math.cos(lean + tilt) * 4.2);
    const shF = P(neck.x + 1, neck.y + 1.6), shB = P(neck.x - 1.6, neck.y + 1.3);
    const hipF = P(hip.x + 1.2, hip.y), hipB = P(hip.x - 1.4, hip.y);
    const foot = (f) => P(BAX + f[0], BAY + f[1]);
    const hand = (h) => P(neck.x + h[0], neck.y + h[1]);
    const legF = ik(hipF, foot(pose.fF), 6.6, 6.6, P(1, 0.15));
    const legB = ik(hipB, foot(pose.fB), 6.6, 6.6, P(1, 0.15));
    const armF = ik(shF, hand(pose.hF), 4.8, 4.6, P(-0.35, 1));
    const armB = ik(shB, hand(pose.hB), 4.8, 4.6, P(-0.35, 1));
    const sleeves = L.style === 'gi' || L.style === 'armor' || L.style === 'robe';
    const wide = L.style === 'robe' ? 1.25 : 1; // hakama-style wide trousers

    // Headband tails / hood tail streaming behind the head.
    if (mat.band && L.head !== 'horned' && L.head !== 'kabuto') {
      const tailRoot = P(hd.x - 3.2 * Math.cos(tilt), hd.y - 1.6);
      const tm = mask();
      for (const off of [0, 1.4]) {
        let prev = P(tailRoot.x, tailRoot.y + off * 0.5);
        for (let k = 1; k <= 4; k++) {
          const pt = P(tailRoot.x - k * 2.1 * (pose.tailLen || 1), tailRoot.y + off + k * 0.55 + Math.sin((pose.tail || 0) + k * 1.2 + off) * 0.35 * k);
          tm.line(prev, pt, 0.75, 0.6);
          prev = pt;
        }
      }
      put(tm, mat.band);
    }
    if (L.hair === 'long' || L.hair === 'braid') { // long hair down the back
      const hm = mask();
      const sway = Math.sin(pose.tail || 0) * 0.8;
      hm.line(P(hd.x - 2.6, hd.y), P(hd.x - 4 - sway, hd.y + 7), 1.6, L.hair === 'braid' ? 0.9 : 1.3);
      put(hm, mat.hair);
    }

    const limb = (l, root, r0, r1, rpUpper, rpLower) => {
      const a = mask().line(root, l.joint, r0, r1); put(a, rpUpper);
      const b = mask().line(l.joint, l.end, r1, r1 * 0.9); put(b, rpLower || rpUpper);
    };
    const fist = (l, rp, sep) => {
      const dx = l.end.x - l.joint.x, dy = l.end.y - l.joint.y, d = Math.hypot(dx, dy) || 1;
      put(mask().line(P(l.end.x - dx / d * 1.6, l.end.y - dy / d * 1.6), l.end, 1.35).disc(l.end.x + dx / d * 0.6, l.end.y + dy / d * 0.6, 1.9), rp, sep);
    };
    const shoe = (l, rp) => put(mask().line(P(l.end.x - 0.5, l.end.y - 0.6), P(l.end.x + 2.2, l.end.y - 0.4), 1.15), rp);

    // Back arm, back leg.
    limb(armB, shB, 1.35, 1.25, sleeves ? mat.topB : mat.skinB, L.style === 'armor' ? mat.topB : mat.skinB); fist(armB, mat.wrapsB);
    limb(legB, hipB, 2.0 * wide, 1.6 * wide, mat.pantsB); shoe(legB, mat.shoe);
    // Pelvis + front leg.
    put(mask().disc(hip.x, hip.y, 2.7 * wide), mat.pants);
    limb(legF, hipF, 2.15 * wide, 1.7 * wide, mat.pants); shoe(legF, mat.shoe);
    // Torso.
    put(mask().line(P(hip.x - Math.sin(lean), hip.y - 1), neck, 3.3, 3.7).disc(shF.x, shF.y - 0.4, 2.1).disc(shB.x, shB.y - 0.3, 2.0), mat.top);
    if (L.style === 'vest' || L.style === 'fur') {
      put(mask().poly([P(neck.x + 0.6, neck.y + 0.4), P(neck.x + 3.4, neck.y + 0.6), P(neck.x + 1.4 + Math.sin(lean) * -3, neck.y + 4.8)]), mat.skin);
    } else if (L.style === 'gi' || L.style === 'robe') { // crossed lapel
      put(mask().line(P(neck.x + 2.2, neck.y + 0.6), P(neck.x + 0.2 - Math.sin(lean) * 3, neck.y + 6), 0.55), mat.trim || mat.wraps);
    } else if (L.style === 'armor') { // chest plate
      put(mask().disc(neck.x + 0.6 - Math.sin(lean) * 2, neck.y + 3.4, 2.4), mat.steel);
    }
    if (L.style === 'fur' || mat.trim) { // fur collar / trim on the shoulders
      put(mask().disc(shF.x - 0.2, shF.y - 0.8, 1.7).disc(shB.x + 0.4, shB.y - 0.7, 1.6).disc(neck.x - 0.3, neck.y + 0.3, 1.6), mat.trim || mat.ivory);
    }
    // Belt with knot tails.
    const bx = Math.cos(lean) * 3.6, by = Math.sin(lean) * 3.6;
    const belt = mask().line(P(hip.x - bx, hip.y - 1.4 - by), P(hip.x + bx, hip.y - 1.4 + by), 0.95);
    belt.line(P(hip.x - bx * 0.7, hip.y - 1), P(hip.x - bx * 0.7 - 1.5, hip.y + 2.2 + (pose.knot || 0)), 0.6);
    put(belt, L.style === 'armor' ? mat.wood : mat.wraps);

    // Head: hair mass, face, hairstyle, beard, headgear, eye.
    if (L.hair !== 'bald') put(mask().disc(hd.x - 0.8, hd.y - 0.6, 3.9), mat.hair);
    else put(mask().disc(hd.x - 0.4, hd.y - 0.3, 3.6), mat.skin);
    put(mask().disc(hd.x + 0.9, hd.y + 0.7, 3.05).disc(hd.x + 2.2, hd.y + 2.2, 1.6), mat.skin);
    const hm = mask();
    if (L.hair === 'spiky') {
      hm.line(P(hd.x - 1, hd.y - 3), P(hd.x - 0.5, hd.y - 6.2), 0.9).line(P(hd.x - 2.5, hd.y - 2.5), P(hd.x - 4.4, hd.y - 5.0), 0.85)
        .line(P(hd.x + 1.0, hd.y - 3), P(hd.x + 2.6, hd.y - 5.4), 0.8).line(P(hd.x - 3.4, hd.y - 1), P(hd.x - 6.2, hd.y - 2.0), 0.8);
    } else if (L.hair === 'topknot') {
      hm.disc(hd.x - 1.2, hd.y - 4.8, 1.6).line(P(hd.x - 1.2, hd.y - 4), P(hd.x - 3.2, hd.y - 5.6), 0.7);
    } else if (L.hair === 'mohawk') {
      hm.line(P(hd.x + 1.5, hd.y - 3.6), P(hd.x - 3, hd.y - 4.2), 1.3).line(P(hd.x - 0.5, hd.y - 4.4), P(hd.x - 0.5, hd.y - 6.4), 0.9);
    } else if (L.hair === 'long' || L.hair === 'braid') {
      hm.disc(hd.x - 0.5, hd.y - 2.6, 3.2);
    }
    if (L.hair !== 'bald') put(hm, mat.hair);
    if (L.beard) put(mask().disc(hd.x + 2.0, hd.y + 3.0, 2.0).line(P(hd.x + 0.4, hd.y + 2), P(hd.x + 2.4, hd.y + 4.8), 1.2), mat.hair);
    if (mat.band && L.head === 'none') put(mask().line(P(hd.x - 3.6, hd.y - 1.5), P(hd.x + 3.6, hd.y - 1.9 + tilt * 2), 0.85), mat.band);
    if (L.head === 'straw') { // wide conical hat
      put(mask().poly([P(hd.x - 7.5, hd.y - 1.2), P(hd.x + 7.5, hd.y - 1.6), P(hd.x - 0.2, hd.y - 6.8)]), mat.straw);
    } else if (L.head === 'horned') { // round helm + horns
      put(mask().poly([P(hd.x - 3.9, hd.y - 1.3), P(hd.x + 3.6, hd.y - 1.6), P(hd.x + 2.6, hd.y - 4.4), P(hd.x - 0.4, hd.y - 5.6), P(hd.x - 3.4, hd.y - 4.2)]), mat.steel);
      put(mask().line(P(hd.x - 3.2, hd.y - 3.2), P(hd.x - 5.4, hd.y - 6.8), 1.0, 0.45).line(P(hd.x + 2.4, hd.y - 3.6), P(hd.x + 4.2, hd.y - 7.2), 1.0, 0.45), mat.ivory);
      put(mask().line(P(hd.x - 3.9, hd.y - 1.4), P(hd.x + 3.6, hd.y - 1.7), 0.55), mat.gold);
    } else if (L.head === 'hood') {
      put(mask().disc(hd.x - 0.6, hd.y - 0.9, 4.2).line(P(hd.x - 3, hd.y), P(hd.x - 5.5, hd.y + 4), 1.2), mat.band || mat.topB);
      put(mask().disc(hd.x + 1.2, hd.y + 0.9, 2.5), mat.skin);
    } else if (L.head === 'kabuto') { // samurai helm with a gold crest
      put(mask().disc(hd.x - 0.3, hd.y - 1.8, 3.9).line(P(hd.x - 4.2, hd.y - 0.6), P(hd.x - 5.6, hd.y + 1.2), 0.9), mat.top);
      put(mask().line(P(hd.x + 0.4, hd.y - 4.6), P(hd.x - 2.6, hd.y - 8), 0.55).line(P(hd.x + 0.4, hd.y - 4.6), P(hd.x + 3.4, hd.y - 8), 0.55), mat.gold);
    }
    // Eye and mouth, sized to the scale.
    const px = (x, y, c) => {
      const s = Math.max(1, Math.round(S * 0.8));
      const X = Math.round(x * S), Y = Math.round(y * S);
      for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) if (X + i < W && Y + j < H) buf[(Y + j) * W + X + i] = c;
    };
    const ex = hd.x + 2.2, ey = hd.y + 0.2;
    if (pose.dizzy) { px(ex, ey, rgba('#ffffff')); px(ex - 1, ey - 1, OUT); }
    else if (pose.blink) { px(ex, ey, OUT); px(ex - 1, ey, OUT); }
    else { px(ex, ey, OUT); px(ex, ey - 1, OUT); px(ex - 1, ey - 1, OUT); }
    if (pose.mouth === 'open') { px(hd.x + 3, hd.y + 3, OUT); px(hd.x + 3, hd.y + 4, OUT); }
    // Front arm last, outlined against the body.
    const upper = mask().line(shF, armF.joint, 1.45, 1.3);
    put(upper, sleeves ? mat.top : mat.skin, true);
    put(mask().line(armF.joint, armF.end, 1.3, 1.25), L.style === 'armor' ? mat.top : mat.skin, true);
    fist(armF, mat.wraps, true);

    outline(buf, W, H);
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
      return { hy: 2 + b, lean: 0.14, tilt: -0.05, fF: [5, 0], fB: [-5, 0], hF: [5.5, -0.5 + b * 0.6], hB: [2.5, 2.2 + b * 0.6], tail: i * 1.6, tailLen: 0.8, knot: b * 0.5, blink: i === 3 };
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
      return { hy: 2 + Math.abs(Math.cos(p)) * 0.6, lean: 0.14, tilt: -0.05, fF: [5 + s * 2.5, -Math.max(0, Math.cos(p)) * 1.5], fB: [-5 + s * 2.5, -Math.max(0, -Math.cos(p)) * 1.5], hF: [5.5, -0.5], hB: [2.5, 2.2], tail: i * 1.6, tailLen: 0.9 };
    }),
    jab: [{ hy: 2, lean: 0.3, tilt: -0.1, fF: [6, 0], fB: [-5, 0], hF: [10.5, -1], hB: [2, 2], tail: 1, tailLen: 1.1 }],
    cross: [{ hy: 2, hx: 1, lean: 0.42, tilt: -0.12, fF: [7, 0], fB: [-4.5, 0], hF: [1, 2.5], hB: [10.5, -1.5], tail: 2, tailLen: 1.2, mouth: 'open' }],
    upper: [{ hy: -0.5, lean: 0.1, tilt: -0.3, fF: [5, 0], fB: [-4, 0], hF: [4.5, -10], hB: [-1.5, 3], tail: 3, tailLen: 1.3, mouth: 'open' }],
    kick: [{ hy: -0.5, hx: -1, lean: -0.32, tilt: 0.1, fF: [13, -9.5], fB: [-3, 0], hF: [3, -2], hB: [-5, 1], tail: 1.5, tailLen: 1.2 }],
    windup: [{ hy: 2.5, hx: -1, lean: 0.0, tilt: 0, fF: [4, 0], fB: [-6, 0], hF: [3, 1], hB: [-2, 1], tail: 0.5, tailLen: 0.9 }],
    airkick: [{ hy: -2, lean: 0.2, tilt: -0.1, fF: [10, -3], fB: [-2, -6], hF: [3, -3], hB: [-4, -1], tail: 2, tailLen: 1.4, mouth: 'open' }],
    block: [{ hy: 3, hx: -0.5, lean: -0.08, tilt: 0.12, fF: [4, 0], fB: [-6, 0], hF: [4.5, -3.5], hB: [3.5, -1.5], tail: 0.5, tailLen: 0.7 }],
    palm: [{ hy: 2.5, hx: 1, lean: 0.35, tilt: -0.1, fF: [7, 0], fB: [-6, 0], hF: [10, -0.5], hB: [9.5, 1], tail: 2.5, tailLen: 1.4, mouth: 'open' }],
    spin: [0, 1].map((i) => ({ hy: -3, lean: i ? -0.4 : 0.2, tilt: 0, fF: i ? [-11, -8] : [12, -8], fB: [i ? 3 : -3, -2], hF: [i ? -4 : 5, -4], hB: [i ? 4 : -5, -4], tail: i * 3, tailLen: 1.5 })),
    stomp: [{ hy: -2, lean: 0.05, tilt: -0.2, fF: [4, -9], fB: [-4, -1], hF: [5, -9], hB: [-4, -8], tail: 2, tailLen: 1.2, mouth: 'open' }],
    stagger: [{ hy: 1, hx: -2, lean: -0.35, tilt: 0.3, fF: [4, 0], fB: [-6, 0], hF: [-1, 3], hB: [-5, 2], tail: 3, tailLen: 1.2, mouth: 'open' }],
    down: [{ hy: -1, lean: -0.55, tilt: -0.45, fF: [5, -4], fB: [-1.5, -1.5], hF: [-7, -6], hB: [-7.5, -2], tail: 3, tailLen: 1.3, mouth: 'open', dizzy: true }],
  };

  const PLATFORM_POSES = ['idle', 'run', 'rise', 'fall', 'land', 'skid', 'victory', 'hurt'];
  const cache = new Map();

  // Build every frame for a look at a scale. Cached, since customisation screens rebuild often.
  function buildSet(look = {}, S = 1, names = null) {
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
    const set = { frames, S, W: Math.round(BASE * S), H: Math.round(BASE * S), AX: Math.round(BAX * S), AY: Math.round(BAY * S), look };
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
      ctx.drawImage(frame[which], -set.AX, -set.AY);
      ctx.restore();
    },
  };
  Sprites.setLook(DEFAULT_LOOK);
  KF.Sprites = Sprites;
})(window.KF);
