'use strict';
// Smooth (vector) fighters: the same skeleton poses as js/sprites.js, drawn with canvas paths
// instead of pixels, for realms whose style is not pixel art (style.smooth). Each style picks a
// look (style.vecLook) that decides how the same parts are painted:
//   rubberhose  1930s cartoon: black and white, noodle limbs, white gloves, pie-cut eyes
//   inked       comic book: flat colours, heavy black ink line, hatching on the shadow side
//   toy         glossy vinyl toy (AR phone game): soft gradients, specular shine
//   woodblock   ukiyo-e print: flat fields, brush outline, patterned cloth
//   video       soft painted shading, like footage
//   gloss       vaporwave: chrome / plastic gradients with pastel rim light
//   neon        cyber: dark body, glowing edge lines
//   lowpoly     SUPERHOT: flat-shaded triangle facets (crystal = red glass, others pale grey)
//
// Geometry is built once per (pose, look) in design units (a 40 x 40 frame, feet at 20, 38, the
// same as the pixel sprites) and cached as Path2D objects, so a frame is just fills and strokes.
//
// API
//   KF.Vec.draw(ctx, pose, look, opts)  feet at the current origin, facing right, 1 unit = 1 px.
//       opts: { vlook, scale (units -> px, default 1), flash 0..1, tint (silhouette colour),
//               alpha, crystal (force red glass), t (seconds, for squash & stretch) }
//   KF.Vec.active()  the vecLook of the current scene's style if it is smooth, else null.
(function (KF) {
  const SP = KF.Sprites, P = (x, y) => ({ x, y });
  const BAX = SP.BAX, BAY = SP.BAY;

  // ---------- colour helpers ----------
  const hexRGB = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const toHex = (r, g, b) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const shade = (h, f) => { const [r, g, b] = hexRGB(h); return toHex(r * f, g * f, b * f); };
  const mix = (a, b, t) => { const p = hexRGB(a), q = hexRGB(b); return toHex(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t); };
  const lum = (h) => { const [r, g, b] = hexRGB(h); return (0.3 * r + 0.59 * g + 0.11 * b) / 255; };
  const rgbaStr = (h, a) => { const [r, g, b] = hexRGB(h); return `rgba(${r},${g},${b},${a})`; };

  // ---------- materials: hex ramps [shadow, base, light] ----------
  function mats(look, vlook) {
    const L = Object.assign({}, SP.DEFAULT_LOOK, look);
    const C = SP.COLORS, S = SP.SKIN, H = SP.HAIR;
    const col = (k, d) => C[k] || S[k] || C[d] || S[d] || C.gray;
    const dark = (r, f = 0.75) => r.map((h) => shade(h, f));
    const m = {
      L,
      skin: S[L.skin] || S.tan, hair: H[L.hairColor] || H.black,
      band: L.band && L.band !== 'none' ? col(L.band, 'orange') : null,
      top: col(L.top, 'teal'), pants: col(L.pants, 'indigo'),
      wraps: C[L.wraps] || S[L.wraps] || C.cream, shoe: C[L.shoes] || S[L.shoes] || C.hide,
      trim: L.trim ? col(L.trim, 'ivory') : null,
      belt: col(L.belt, L.style === 'armor' ? 'hide' : L.wraps || 'cream'),
      hat: col(L.hat, L.head === 'hardhat' ? 'yellow' : L.head === 'helmet' ? 'chrome' : L.head === 'cowboy' ? 'hide' : 'charcoal'),
      shins: L.shins ? col(L.shins, 'cream') : null,
      steel: C.steel, ivory: C.ivory, straw: C.straw, gold: C.gold, wood: C.hide, chrome: C.chrome,
      white: C.white, black: C.black, glow: col(L.glow, 'cyan'), tie: col(L.tieColor, 'red'),
      cape: L.cape ? col(L.cape, 'red') : null, scarf: L.scarf ? col(L.scarf, 'red') : null,
      visor: C[L.visor] || C.cyan, shades: C[L.shades] || C.black, mask: C[L.mask] || C.black, bandana: C[L.bandana] || C.red,
    };
    const crystal = L.material === 'crystal';
    for (const k of Object.keys(m)) if (k !== 'L' && m[k]) {
      let r = m[k];
      if (crystal) r = [SP.CRYSTAL[0], SP.CRYSTAL[1], SP.CRYSTAL[2]];
      else if (vlook === 'rubberhose') r = greyRamp(r, k);
      else if (vlook === 'lowpoly') r = paleRamp(r);
      else if (vlook === 'woodblock') r = r.map((h) => mix(h, '#d8c8a0', 0.12)); // a little paper in every ink
      m[k] = r; m[k + 'B'] = dark(r, k === 'pants' ? 0.7 : 0.75); // back limbs sit in shade
    }
    if (crystal) m.glow = [SP.CRYSTAL[3], SP.CRYSTAL[2], SP.CRYSTAL[4]];
    m.crystal = crystal;
    return m;
  }
  // 1930s cartoon: everything goes black, white or one grey, by brightness. Skin is pale, gloves
  // and the face are white, clothes are mostly black.
  function greyRamp(r, k) {
    if (k === 'skin') return ['#b8b4ac', '#ece8dc', '#ffffff'];
    if (k === 'wraps') return ['#bcb8b0', '#f4f2ea', '#ffffff'];
    const l = lum(r[1]);
    if (l > 0.62) return ['#a8a49c', '#e2ded4', '#ffffff'];
    if (l > 0.34) return ['#4a4844', '#7a7872', '#a8a6a0'];
    return ['#050505', '#141414', '#3a3a3a'];
  }
  // SUPERHOT player: pale grey facets, a touch darker for darker clothes.
  function paleRamp(r) { const l = lum(r[1]); const b = Math.round(95 + l * 85); const base = toHex(b, b, b + 4); return [shade(base, 0.72), base, mix(base, '#ffffff', 0.6)]; }

  // ---------- geometry ----------
  // Prims: { g: group ('back' | 'body' | 'front'), shapes: [...], m: material key, cloth, detail }
  // Shapes (design units): ['cap', ax, ay, bx, by, r0, r1] | ['disc', x, y, r] | ['poly', [x, y, ...]]
  function build(pose, look, vlook) {
    const m = mats(look, vlook), L = m.L, crystal = m.crystal, prims = [];
    const noodle = vlook === 'rubberhose';
    const B = L.build === 'heavy' ? 1.14 : L.build === 'slim' ? 0.86 : 1;
    let group = 'back';
    const put = (shapes, mk, o = {}) => { if (mk && m[mk]) prims.push(Object.assign({ g: group, shapes, m: mk }, o)); };
    const cap = (a, b, r0, r1 = r0) => ['cap', a.x, a.y, b.x, b.y, r0, r1];
    const disc = (x, y, r) => ['disc', x, y, r];
    const poly = (pts) => ['poly', pts.flatMap((q) => [q.x, q.y])];
    const st = L.style;
    const hip = P(BAX + (pose.hx || 0), BAY - 13.6 + (pose.hy || 0));
    const lean = pose.lean || 0, tilt = pose.tilt || 0, sl = Math.sin(lean), cl = Math.cos(lean);
    const neck = P(hip.x + sl * 9.4, hip.y - cl * 9.4);
    const hd = P(neck.x + Math.sin(lean + tilt) * 3.7, neck.y - Math.cos(lean + tilt) * 3.7);
    const shF = P(neck.x + 1.5 * B, neck.y + 1.9), shB = P(neck.x - 2.1 * B, neck.y + 1.5);
    const hipF = P(hip.x + 1.4 * B, hip.y), hipB = P(hip.x - 1.6 * B, hip.y);
    const foot = (f) => P(BAX + f[0], BAY + f[1]), hand = (h) => P(neck.x + h[0], neck.y + h[1]);
    const legF = SP.ik(hipF, foot(pose.fF), 7.0, 6.8, P(1, 0.15)), legB = SP.ik(hipB, foot(pose.fB), 7.0, 6.8, P(1, 0.15));
    const armF = SP.ik(shF, hand(pose.hF), 5.0, 4.8, P(-0.35, 1)), armB = SP.ik(shB, hand(pose.hB), 5.0, 4.8, P(-0.35, 1));
    const sleeves = ['gi', 'armor', 'robe', 'suit', 'tang', 'cyber', 'track', 'coat', 'hero'].includes(st);
    const wide = st === 'robe' ? 1.22 : 1, shorts = L.legs === 'shorts';
    const dir = (a, b) => { const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1; return P(dx / d, dy / d); };
    const along = (a, b, k) => P(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k);
    const limbK = noodle ? 0.55 : 1; // rubber-hose noodle limbs

    // behind the body
    if (m.cape) {
      const sway = Math.sin(pose.tail || 0) * 0.8;
      put([poly([P(shB.x - 0.5, shB.y - 1.2), P(shF.x - 0.5, shF.y - 1.4), P(hip.x - 2 - sl * 4, hip.y + 8.5), P(hip.x - 8 - sway - sl * 6, hip.y + 7.5)])], 'capeB', { cloth: true });
    }
    const tails = (root, mk, len, n = 4) => {
      const sh = [];
      for (const off of [0, 1.4]) {
        let prev = P(root.x, root.y + off * 0.5);
        for (let k = 1; k <= n; k++) {
          const pt = P(root.x - k * 2.1 * len, root.y + off + k * 0.55 + Math.sin((pose.tail || 0) + k * 1.2 + off) * 0.35 * k);
          sh.push(cap(prev, pt, 0.8 - k * 0.04, 0.65 - k * 0.04)); prev = pt;
        }
      }
      put(sh, mk, { cloth: true });
    };
    if (!crystal && m.band && !['horned', 'kabuto', 'helmet', 'hardhat'].includes(L.head)) tails(P(hd.x - 3 * Math.cos(tilt), hd.y - 1.4), 'band', pose.tailLen || 1);
    if (!crystal && m.scarf) tails(P(neck.x - 1.5, neck.y + 0.6), 'scarf', (pose.tailLen || 1) * 1.1, 3);
    if (!crystal && (L.hair === 'long' || L.hair === 'braid')) {
      const sway = Math.sin(pose.tail || 0) * 0.8;
      put([cap(P(hd.x - 2.4, hd.y), P(hd.x - 3.8 - sway, hd.y + 7), 1.6, L.hair === 'braid' ? 0.9 : 1.3)], 'hair', { hair: true });
    }

    // limbs
    const fist = (l, mk, big) => {
      const dv = dir(l.joint, l.end), r = (big ? 2.45 : 2.2) * (0.85 + 0.15 * B) * (noodle ? 1.15 : 1);
      const c = P(l.end.x + dv.x * 0.5, l.end.y + dv.y * 0.5);
      put([cap(P(l.end.x - dv.x * 1.4, l.end.y - dv.y * 1.4), c, 1.5 * B * limbK), disc(c.x, c.y, r), disc(c.x + dv.x * 0.6 - 0.3, c.y - 0.5, r * 0.85)], mk, { fist: true, round: true });
    };
    const boot = (l, mk) => {
      const e = l.end;
      if (noodle) put([['disc', e.x + 0.8, e.y - 1.3, 2.3], cap(P(e.x - 1.2, e.y - 0.6), P(e.x + 3.2, e.y - 0.6), 1.25)], mk, { round: true }); // big cartoon shoe
      else put([poly([P(e.x - 1.9, e.y - 2.6), P(e.x + 1.4, e.y - 2.4), P(e.x + 3.6, e.y - 1.2), P(e.x + 3.7, e.y + 0.2), P(e.x - 2.1, e.y + 0.2)])], mk);
    };
    const leg = (l, root, back) => {
      const r0 = (back ? 2.55 : 2.7) * B * wide * (noodle ? 0.6 : 1), rk = (back ? 2.1 : 2.25) * B * wide * (noodle ? 0.6 : 1);
      const pk = back ? 'pantsB' : 'pants';
      if (shorts) {
        const mid = along(root, l.joint, 0.7);
        put([cap(root, mid, r0 * 1.05, rk * 1.05)], pk, { cloth: true });
        put([cap(mid, l.joint, rk * 0.92, rk * 0.88)], back ? 'skinB' : 'skin');
        const dv = dir(l.joint, l.end);
        put([cap(l.joint, P(l.end.x - dv.x * 1.4, l.end.y - dv.y * 1.4), rk * 0.88, rk * 0.75)], m.shins ? (back ? 'shinsB' : 'shins') : (back ? 'skinB' : 'skin'));
      } else {
        const dv = dir(l.joint, l.end);
        put([cap(root, l.joint, r0, rk), cap(l.joint, P(l.end.x - dv.x * 1.4, l.end.y - dv.y * 1.4), rk, rk * 0.82)], pk, { cloth: true });
      }
      boot(l, back ? 'shoeB' : 'shoe');
    };
    const cyberArm = L.arm === 'cyber' && !crystal;
    const arm = (l, sh, back) => {
      const ru = (back ? 1.85 : 2.0) * B * limbK, rf = (back ? 1.7 : 1.85) * B * limbK;
      const skinK = back ? 'skinB' : 'skin', sleeveK = back ? 'topB' : 'top', metal = cyberArm && !back;
      const upperK = metal ? 'chrome' : sleeves ? sleeveK : skinK;
      const lowerK = metal ? 'chrome' : st === 'armor' || st === 'hero' || st === 'cyber' ? sleeveK : sleeves && st !== 'gi' && st !== 'tang' ? sleeveK : skinK;
      const dv = dir(l.joint, l.end);
      put([cap(sh, l.joint, ru, ru * 0.92)], upperK, { cloth: upperK !== skinK, metal });
      put([cap(l.joint, P(l.end.x - dv.x * 1.2, l.end.y - dv.y * 1.2), rf, rf * 0.9)], lowerK, { cloth: lowerK !== skinK, metal });
      if (sleeves && !metal && !noodle && (st === 'gi' || st === 'tang')) put([cap(l.joint, along(l.joint, l.end, 0.35), rf * 1.18, rf * 1.12)], sleeveK, { cloth: true });
      if (metal) {
        const n = P(-dv.y, dv.x);
        put([cap(P(sh.x + n.x * 0.5, sh.y + n.y * 0.5), P(l.joint.x + n.x * 0.5, l.joint.y + n.y * 0.5), 0.32),
          cap(P(l.joint.x + n.x * 0.4, l.joint.y + n.y * 0.4), P(l.end.x - dv.x * 1.5 + n.x * 0.4, l.end.y - dv.y * 1.5 + n.y * 0.4), 0.32), disc(l.joint.x, l.joint.y, 0.55)], 'glow', { glow: true, detail: true });
      }
      if (st === 'track' && m.trim) put([cap(sh, l.joint, 0.35), cap(l.joint, along(l.joint, l.end, 0.8), 0.35)], 'trim', { detail: true });
      fist(l, metal ? 'chrome' : back ? 'wrapsB' : 'wraps', !back);
    };

    arm(armB, shB, true);
    if (!crystal && L.prop === 'mic') { const e = armB.end; put([cap(P(e.x + 0.6, e.y - 0.6), P(e.x + 2.4, e.y - 3.2), 0.5)], 'black'); put([disc(e.x + 2.7, e.y - 3.6, 1.0)], 'steel', { round: true }); }
    if (!crystal && L.prop === 'phone') { const e = armB.end; put([poly([P(e.x + 0.4, e.y - 3.6), P(e.x + 2.4, e.y - 3.9), P(e.x + 2.6, e.y - 0.2), P(e.x + 0.6, e.y + 0.1)])], 'black'); put([poly([P(e.x + 0.9, e.y - 3.1), P(e.x + 2.0, e.y - 3.3), P(e.x + 2.1, e.y - 0.8), P(e.x + 1.0, e.y - 0.6)])], 'glow', { glow: true, detail: true }); }
    leg(legB, hipB, true);

    group = 'body';
    put([disc(hip.x, hip.y, 2.9 * B * wide)], 'pants', { cloth: true });
    leg(legF, hipF, false);
    const hem = { gi: 3.6, robe: 6, tang: 4.2, suit: 3.2, coat: 8, cyber: 2.6, track: 1.2, hero: 0 }[st] || 0;
    if (hem) {
      const bx = cl * 3.6 * B, by = sl * 3.6 * B;
      put([poly([P(hip.x - bx - 0.6, hip.y - 1.6 - by), P(hip.x + bx + 0.8, hip.y - 1.6 + by), P(hip.x + bx + 1.2 + sl * hem * 0.4, hip.y + hem), P(hip.x - bx - 1.4 + sl * hem * 0.4, hip.y + hem)])], st === 'coat' || st === 'robe' ? 'top' : 'topB', { cloth: true });
    }
    const chestR = 4.3 * B, waistR = 3.4 * B;
    if (st === 'tank') {
      put([disc(shF.x, shF.y - 0.2, 2.6 * B), disc(shB.x, shB.y - 0.2, 2.4 * B), cap(P(neck.x, neck.y), P(neck.x, neck.y + 2), 2.6 * B)], 'skin');
      put([cap(P(hip.x - sl, hip.y - 1.2), P(neck.x - sl * 0.6 + 0.4, neck.y + 2.6), waistR, chestR * 0.92)], 'top', { cloth: true, torso: true });
    } else put([cap(P(hip.x - sl, hip.y - 1.2), P(neck.x - sl * 0.6, neck.y + 2.2), waistR, chestR), disc(shF.x, shF.y - 0.2, 2.7 * B), disc(shB.x, shB.y - 0.2, 2.5 * B)], 'top', { cloth: true, torso: true });
    const chest = P(neck.x + 0.6 - sl * 2, neck.y + 3.6);
    const D = { detail: true };
    if (!crystal) {
      if (st === 'vest' || st === 'fur') put([poly([P(neck.x + 0.4, neck.y + 0.4), P(neck.x + 3.6, neck.y + 0.6), P(neck.x + 1.4 - sl * 3, neck.y + 5.4)])], 'skin', D);
      else if (st === 'gi' || st === 'robe') {
        put([poly([P(neck.x + 0.8, neck.y + 0.3), P(neck.x + 3.2, neck.y + 0.5), P(neck.x + 1.6, neck.y + 3.0)])], 'skin', D);
        put([cap(P(neck.x + 2.4, neck.y + 0.6), P(neck.x + 0.2 - sl * 3, neck.y + 6.4), 0.6)], m.trim ? 'trim' : 'wraps', D);
      } else if (st === 'suit') {
        put([poly([P(neck.x + 0.2, neck.y + 0.2), P(neck.x + 3.4, neck.y + 0.4), P(neck.x + 1.4 - sl * 2, neck.y + 5.6)])], 'white', D);
        if (L.tie === 'bow') put([poly([P(neck.x + 0.6, neck.y + 0.6), P(neck.x + 1.8, neck.y + 1.3), P(neck.x + 3.0, neck.y + 0.6), P(neck.x + 3.0, neck.y + 2.2), P(neck.x + 1.8, neck.y + 1.5), P(neck.x + 0.6, neck.y + 2.2)])], 'tie', D);
        else put([cap(P(neck.x + 1.8, neck.y + 0.8), P(neck.x + 1.3 - sl * 2, neck.y + 5.2), 0.55, 0.75)], 'tie', D);
        put([cap(P(neck.x + 0.1, neck.y + 0.4), P(neck.x + 1.1 - sl * 2, neck.y + 5.8), 0.4), cap(P(neck.x + 3.5, neck.y + 0.5), P(neck.x + 1.7 - sl * 2, neck.y + 5.8), 0.4)], 'topB', D);
      } else if (st === 'tang') {
        put([cap(P(neck.x - 0.8, neck.y + 0.2), P(neck.x + 2.6, neck.y + 0.4), 0.7)], m.trim ? 'trim' : 'topB', D);
        const bs = [];
        for (let i = 0; i < 4; i++) { const by = neck.y + 1.9 + i * 1.5, bx = neck.x + 1.6 - sl * (1.5 + i * 0.45); bs.push(cap(P(bx - 0.9, by), P(bx + 0.9, by), 0.28)); }
        put(bs, m.trim ? 'trim' : 'ivory', D);
      } else if (st === 'cyber') {
        put([cap(P(neck.x - 1.4, neck.y + 0.2), P(neck.x + 2.4, neck.y + 0.1), 0.9)], 'topB', D);
        put([cap(P(neck.x + 1.0, neck.y + 1.4), P(hip.x + 1.0 - sl, hip.y - 1.6), 0.3), cap(P(shB.x + 0.5, shB.y + 1.6), P(neck.x + 1.0, neck.y + 2.2), 0.3)], 'glow', { detail: true, glow: true });
      } else if (st === 'track') {
        put([cap(P(neck.x + 1.6, neck.y + 0.4), P(hip.x + 1.2 - sl, hip.y - 1.6), 0.3)], m.trim ? 'trim' : 'white', D);
        put([cap(P(neck.x - 1.2, neck.y + 0.2), P(neck.x + 2.4, neck.y + 0.2), 0.7)], m.trim ? 'trim' : 'topB', D);
      } else if (st === 'coat') {
        put([cap(P(neck.x + 0.4, neck.y + 0.2), P(neck.x + 1.6 - sl * 2, neck.y + 5.4), 0.55), cap(P(neck.x + 3.4, neck.y + 0.4), P(neck.x + 1.6 - sl * 2, neck.y + 5.4), 0.55)], 'topB', D);
        put([disc(neck.x + 1.2 - sl * 2.5, neck.y + 6.4, 0.4), disc(neck.x + 1.0 - sl * 3, neck.y + 7.8, 0.4)], m.trim ? 'trim' : 'black', D);
      } else if (st === 'hero') put([poly([P(chest.x - 1.4, chest.y - 1.0), P(chest.x + 1.6, chest.y - 1.0), P(chest.x + 0.1, chest.y + 1.4)])], m.trim ? 'trim' : 'gold', D);
      else if (st === 'armor') put([disc(chest.x, chest.y - 0.2, 2.5 * B)], 'steel', { detail: true, metal: true, round: true });
      if (m.trim && (st === 'fur' || st === 'robe')) put([disc(shF.x - 0.2, shF.y - 0.9, 1.8 * B), disc(shB.x + 0.4, shB.y - 0.8, 1.7 * B), disc(neck.x - 0.3, neck.y + 0.3, 1.7)], 'trim', { round: true });
      if (m.cape) put([disc(shF.x - 0.4, shF.y - 1.1, 1.3), disc(shB.x + 0.3, shB.y - 1.0, 1.3)], 'cape', D);
    }
    if (st !== 'suit' && st !== 'coat' && st !== 'track' && st !== 'cyber' && st !== 'tank' || L.belt) {
      const bx = cl * 3.8 * B, by = sl * 3.8 * B, sh = [cap(P(hip.x - bx, hip.y - 1.5 - by), P(hip.x + bx, hip.y - 1.5 + by), st === 'tang' ? 1.25 : 1.0),
        cap(P(hip.x - bx * 0.7, hip.y - 1), P(hip.x - bx * 0.7 - 1.4, hip.y + 2.6 + (pose.knot || 0)), 0.65)];
      if (st === 'tang' || st === 'gi') sh.push(cap(P(hip.x - bx * 0.55, hip.y - 1), P(hip.x - bx * 0.55 - 0.4, hip.y + 3.2 + (pose.knot || 0)), 0.6));
      put(sh, 'belt', { detail: true, cloth: true });
    }

    // head
    const HR = noodle ? 3.7 : 3.3; // cartoons get a bigger head
    const hairOn = !crystal && L.hair !== 'bald';
    const covered = ['hood', 'straw', 'bowler', 'tophat', 'fedora', 'cowboy', 'tricorn', 'hardhat', 'helmet', 'peaked', 'cap', 'horned', 'kabuto'].includes(L.head);
    if (hairOn) {
      const sh = [disc(hd.x - 0.7, hd.y - 0.5, HR + 0.1)];
      if (L.hair === 'afro') sh.push(disc(hd.x - 0.8, hd.y - 1.4, 4.5));
      put(sh, 'hair', { hair: true, round: true });
    } else put([disc(hd.x - 0.3, hd.y - 0.3, HR - 0.2)], 'skin', { round: true });
    put([disc(hd.x + 0.8, hd.y + 0.6, HR - 0.55), disc(hd.x + 1.9, hd.y + 2.0, 1.55 * (L.build === 'heavy' ? 1.12 : 1))], 'skin', { round: true, face: true });
    if (hairOn && !covered) {
      const sh = [];
      if (L.hair === 'spiky') sh.push(cap(P(hd.x - 1, hd.y - 2.6), P(hd.x - 0.5, hd.y - 5.8), 0.95, 0.2), cap(P(hd.x - 2.5, hd.y - 2.2), P(hd.x - 4.4, hd.y - 4.6), 0.9, 0.2), cap(P(hd.x + 1.0, hd.y - 2.6), P(hd.x + 2.6, hd.y - 5.0), 0.85, 0.2), cap(P(hd.x - 3.2, hd.y - 0.8), P(hd.x - 6.0, hd.y - 1.8), 0.85, 0.2));
      else if (L.hair === 'topknot') sh.push(disc(hd.x - 1.2, hd.y - 4.4, 1.6), cap(P(hd.x - 1.2, hd.y - 3.6), P(hd.x - 3.2, hd.y - 5.2), 0.7));
      else if (L.hair === 'mohawk') { for (let i = 0; i < 4; i++) sh.push(cap(P(hd.x + 1.4 - i * 1.4, hd.y - 2.8 + i * 0.3), P(hd.x + 1.8 - i * 1.6, hd.y - 6.4 + i * 0.5), 0.8, 0.2)); sh.push(cap(P(hd.x + 1.5, hd.y - 3.2), P(hd.x - 3.2, hd.y - 2.8), 1.1)); }
      else if (L.hair === 'bun') sh.push(disc(hd.x - 1.4, hd.y - 4.0, 2.0));
      else if (L.hair === 'long' || L.hair === 'braid') sh.push(disc(hd.x - 0.5, hd.y - 2.4, 3.0));
      else if (L.hair === 'slick') sh.push(disc(hd.x - 0.2, hd.y - 2.2, 2.9), cap(P(hd.x + 2, hd.y - 2.6), P(hd.x - 3.6, hd.y - 1.6), 0.9));
      else if (L.hair === 'short') sh.push(disc(hd.x - 0.2, hd.y - 1.9, 2.9));
      if (sh.length) put(sh, 'hair', { hair: true });
    }
    if (!crystal && L.beard) put([disc(hd.x + 2.2, hd.y + 3.4, 1.3), cap(P(hd.x + 0.3, hd.y + 2.7), P(hd.x + 2.2, hd.y + 3.8), 0.75)], 'hair', { hair: true, detail: true });
    if (!crystal && L.moustache) put([cap(P(hd.x + 1.6, hd.y + 2.3), P(hd.x + 3.6, hd.y + 2.1), 0.5)], 'hair', { detail: true });
    if (!crystal && L.bandana) put([poly([P(hd.x + 0.2, hd.y + 1.4), P(hd.x + 3.8, hd.y + 1.0), P(hd.x + 3.4, hd.y + 3.6), P(hd.x + 0.8, hd.y + 4.2)])], 'bandana', { detail: true, cloth: true });
    if (!crystal && m.band && L.head === 'none') put([cap(P(hd.x - 3.4, hd.y - 1.4), P(hd.x + 3.4, hd.y - 1.8 + tilt * 2), 0.9)], 'band', { detail: true, cloth: true });
    const brim = (y, x0, x1, r, mk) => put([cap(P(hd.x + x0, hd.y + y), P(hd.x + x1, hd.y + y - 0.2), r)], mk, D);
    if (!crystal) {
      const hh = L.head;
      if (hh === 'straw') put([poly([P(hd.x - 7.2, hd.y - 1.0), P(hd.x + 7.2, hd.y - 1.4), P(hd.x - 0.2, hd.y - 6.4)])], 'straw', D);
      else if (hh === 'horned') {
        put([poly([P(hd.x - 3.6, hd.y - 1.1), P(hd.x + 3.4, hd.y - 1.4), P(hd.x + 2.4, hd.y - 4.0), P(hd.x - 0.4, hd.y - 5.1), P(hd.x - 3.2, hd.y - 3.8)])], 'steel', { detail: true, metal: true });
        put([cap(P(hd.x - 3.0, hd.y - 3.0), P(hd.x - 5.2, hd.y - 6.4), 1.0, 0.25), cap(P(hd.x + 2.2, hd.y - 3.4), P(hd.x + 4.0, hd.y - 6.8), 1.0, 0.25)], 'ivory', D);
        brim(-1.3, -3.6, 3.4, 0.55, 'gold');
      } else if (hh === 'hood') {
        put([disc(hd.x - 0.6, hd.y - 0.8, 3.9), cap(P(hd.x - 3, hd.y), P(hd.x - 5.2, hd.y + 4), 1.2)], m.band ? 'band' : 'topB', { detail: true, cloth: true });
        put([disc(hd.x + 1.2, hd.y + 0.9, 2.3)], 'skin', { round: true, face: true });
      } else if (hh === 'kabuto') {
        put([disc(hd.x - 0.3, hd.y - 1.6, 3.6), cap(P(hd.x - 4.0, hd.y - 0.5), P(hd.x - 5.4, hd.y + 1.2), 0.9)], 'top', { detail: true, metal: true });
        put([cap(P(hd.x + 0.4, hd.y - 4.2), P(hd.x - 2.6, hd.y - 7.4), 0.55, 0.2), cap(P(hd.x + 0.4, hd.y - 4.2), P(hd.x + 3.4, hd.y - 7.4), 0.55, 0.2)], 'gold', D);
      } else if (hh === 'bowler') { put([disc(hd.x - 0.2, hd.y - 2.2, 2.9)], 'hat', { detail: true, round: true }); brim(-1.6, -3.8, 3.6, 0.6, 'hat'); }
      else if (hh === 'tophat') {
        put([poly([P(hd.x - 2.6, hd.y - 1.6), P(hd.x + 2.4, hd.y - 1.8), P(hd.x + 2.2, hd.y - 8.0), P(hd.x - 2.4, hd.y - 7.8)])], 'hat', D);
        put([cap(P(hd.x - 2.5, hd.y - 2.6), P(hd.x + 2.3, hd.y - 2.8), 0.4)], 'tie', D); brim(-1.6, -3.8, 3.6, 0.55, 'hat');
      } else if (hh === 'fedora') {
        put([poly([P(hd.x - 2.8, hd.y - 1.8), P(hd.x + 2.8, hd.y - 2.0), P(hd.x + 2.2, hd.y - 5.0), P(hd.x, hd.y - 4.4), P(hd.x - 2.4, hd.y - 5.0)])], 'hat', D);
        put([cap(P(hd.x - 2.7, hd.y - 2.4), P(hd.x + 2.7, hd.y - 2.6), 0.4)], 'black', D); brim(-1.7, -4.6, 4.4, 0.55, 'hat');
      } else if (hh === 'cowboy') {
        put([poly([P(hd.x - 2.6, hd.y - 1.8), P(hd.x + 2.8, hd.y - 2.0), P(hd.x + 2.0, hd.y - 5.2), P(hd.x, hd.y - 4.6), P(hd.x - 2.0, hd.y - 5.2)])], 'hat', D);
        put([cap(P(hd.x - 5.6, hd.y - 2.6), P(hd.x - 3, hd.y - 1.6), 0.55), cap(P(hd.x - 3, hd.y - 1.6), P(hd.x + 3.2, hd.y - 1.8), 0.6), cap(P(hd.x + 3.2, hd.y - 1.8), P(hd.x + 5.6, hd.y - 2.9), 0.55)], 'hat', D);
      } else if (hh === 'tricorn') {
        put([poly([P(hd.x - 5.0, hd.y - 2.4), P(hd.x + 4.8, hd.y - 2.6), P(hd.x + 3.6, hd.y - 1.2), P(hd.x + 1.6, hd.y - 5.2), P(hd.x - 1.6, hd.y - 5.4), P(hd.x - 3.8, hd.y - 1.0)])], 'hat', D);
        put([cap(P(hd.x - 4.4, hd.y - 2.4), P(hd.x - 1.4, hd.y - 5.0), 0.3), cap(P(hd.x + 1.4, hd.y - 5.0), P(hd.x + 4.2, hd.y - 2.6), 0.3)], 'gold', D);
      } else if (hh === 'hardhat') { put([disc(hd.x - 0.1, hd.y - 2.0, 3.1)], 'hat', { detail: true, round: true }); brim(-1.4, -3.6, 4.6, 0.55, 'hat'); }
      else if (hh === 'helmet') {
        put([disc(hd.x - 0.1, hd.y - 0.2, 3.7), disc(hd.x + 1.2, hd.y + 1.4, 2.6)], 'hat', { detail: true, metal: true, round: true });
        put([cap(P(hd.x + 0.6, hd.y + 0.2), P(hd.x + 3.9, hd.y), 0.8)], 'glow', { detail: true, glow: true });
      } else if (hh === 'cap' || hh === 'peaked') {
        put([disc(hd.x - 0.2, hd.y - 1.8, 3.0)], 'hat', { detail: true, round: true });
        if (hh === 'peaked') { put([poly([P(hd.x - 3.2, hd.y - 2.4), P(hd.x + 3.2, hd.y - 2.6), P(hd.x + 3.4, hd.y - 4.6), P(hd.x - 3.4, hd.y - 4.4)])], 'hat', D); put([cap(P(hd.x - 3, hd.y - 2.5), P(hd.x + 3, hd.y - 2.7), 0.35)], 'gold', D); }
        put([cap(P(hd.x + 1.0, hd.y - 1.6), P(hd.x + 4.8, hd.y - 1.2), 0.55)], 'hat', D);
      }
    }
    // face (drawn as features by the painter)
    const face = { ex: hd.x + 2.0, ey: hd.y + 0.3, hx: hd.x, hy: hd.y, dizzy: pose.dizzy, blink: pose.blink, mouth: pose.mouth };
    if (!crystal && L.head !== 'helmet') {
      if (L.visor) prims.push({ g: 'body', shapes: [cap(P(hd.x - 0.6, face.ey - 0.1), P(hd.x + 3.4, face.ey - 0.3), 0.85)], m: 'visor', glow: true, detail: true });
      else if (L.shades) prims.push({ g: 'body', shapes: [cap(P(hd.x + 0.2, face.ey), P(hd.x + 3.3, face.ey - 0.2), 0.7)], m: 'shades', detail: true, gloss: true });
      else {
        if (L.mask) prims.push({ g: 'body', shapes: [cap(P(hd.x - 0.2, face.ey), P(hd.x + 3.4, face.ey - 0.2), 0.95)], m: 'mask', detail: true });
        face.eye = true;
      }
      face.mouthOn = pose.mouth === 'open' && !L.bandana;
      face.brow = !L.visor && !L.shades;
    }
    group = 'front';
    if (!crystal && L.prop === 'cane') {
      const e = armF.end;
      put([cap(P(e.x + 0.6, e.y - 1.2), P(e.x + 2.6, BAY - 0.2), 0.5), cap(P(e.x + 0.6, e.y - 1.2), P(e.x - 1.0, e.y - 2.4), 0.5)], 'black');
    }
    arm(armF, shF, false);

    // Path2D + bounds per prim, and facets for the low-poly look.
    for (const pr of prims) {
      pr.path = new Path2D();
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      const grow = (x, y, r = 0) => { x0 = Math.min(x0, x - r); y0 = Math.min(y0, y - r); x1 = Math.max(x1, x + r); y1 = Math.max(y1, y + r); };
      for (const s of pr.shapes) {
        if (s[0] === 'cap') { capPath(pr.path, s); grow(s[1], s[2], s[5]); grow(s[3], s[4], s[6]); }
        else if (s[0] === 'disc') { pr.path.moveTo(s[1] + s[3], s[2]); pr.path.arc(s[1], s[2], s[3], 0, Math.PI * 2); grow(s[1], s[2], s[3]); }
        else { const q = s[1]; pr.path.moveTo(q[0], q[1]); for (let i = 2; i < q.length; i += 2) pr.path.lineTo(q[i], q[i + 1]); pr.path.closePath(); for (let i = 0; i < q.length; i += 2) grow(q[i], q[i + 1]); }
      }
      pr.box = [x0, y0, x1, y1];
      if (vlook === 'lowpoly') pr.facets = facets(pr);
    }
    return { prims, face, m, hip, hd };
  }

  // A tapered capsule (two circles joined by their tangents).
  function capPath(p, s) {
    const [, ax, ay, bx, by, r0, r1] = s;
    const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy);
    if (d < 0.01) { p.moveTo(ax + r0, ay); p.arc(ax, ay, Math.max(r0, r1), 0, Math.PI * 2); return; }
    const ang = Math.atan2(dy, dx), k = Math.max(-0.99, Math.min(0.99, (r0 - r1) / d)), off = Math.acos(k);
    p.moveTo(ax + Math.cos(ang + off) * r0, ay + Math.sin(ang + off) * r0);
    p.arc(ax, ay, r0, ang + off, ang - off + Math.PI * 2);
    p.arc(bx, by, r1, ang - off, ang + off);
    p.closePath();
  }

  // Low-poly facets: each shape as a ring of points fanned to its centre, one flat tone per
  // triangle by how much it faces the light (top-left).
  function facets(pr) {
    const out = [], LX = -0.6, LY = -0.8;
    const tri = (pts, nx, ny) => out.push({ pts, k: nx * LX + ny * LY });
    for (const s of pr.shapes) {
      if (s[0] === 'disc') {
        const [, cx, cy, r] = s, n = 6;
        for (let i = 0; i < n; i++) {
          const a0 = (i / n) * Math.PI * 2 + 0.3, a1 = ((i + 1) / n) * Math.PI * 2 + 0.3, am = (a0 + a1) / 2;
          tri([cx, cy, cx + Math.cos(a0) * r, cy + Math.sin(a0) * r, cx + Math.cos(a1) * r, cy + Math.sin(a1) * r], Math.cos(am), Math.sin(am));
        }
      } else if (s[0] === 'cap') { // a prism seen side-on: one lit face, one shaded face, pointed ends
        const [, ax, ay, bx, by, r0, r1] = s, d = Math.hypot(bx - ax, by - ay) || 1, ux = (bx - ax) / d, uy = (by - ay) / d, nx = -uy, ny = ux;
        const A1 = [ax + nx * r0, ay + ny * r0], A2 = [ax - nx * r0, ay - ny * r0], B1 = [bx + nx * r1, by + ny * r1], B2 = [bx - nx * r1, by - ny * r1];
        tri([ax, ay, ...A1, ...B1], nx, ny); tri([ax, ay, bx, by, ...B1], nx, ny);
        tri([ax, ay, ...A2, ...B2], -nx, -ny); tri([ax, ay, bx, by, ...B2], -nx, -ny);
        tri([...A1, ...A2, ax - ux * r0, ay - uy * r0], -ux, -uy); tri([...B1, ...B2, bx + ux * r1, by + uy * r1], ux, uy);
      } else {
        const q = s[1]; let cx = 0, cy = 0; const n = q.length / 2;
        for (let i = 0; i < q.length; i += 2) { cx += q[i] / n; cy += q[i + 1] / n; }
        for (let i = 0; i < n; i++) {
          const a = [q[i * 2], q[i * 2 + 1]], b = [q[((i + 1) % n) * 2], q[((i + 1) % n) * 2 + 1]];
          const mx = (a[0] + b[0]) / 2 - cx, my = (a[1] + b[1]) / 2 - cy, dd = Math.hypot(mx, my) || 1;
          tri([cx, cy, ...a, ...b], mx / dd, my / dd);
        }
      }
    }
    return out;
  }

  const cache = new Map();
  function get(pose, look, vlook) {
    const key = vlook + '|' + JSON.stringify(look);
    let byPose = cache.get(key);
    if (!byPose) { byPose = new Map(); cache.set(key, byPose); if (cache.size > 80) cache.delete(cache.keys().next().value); }
    let g = byPose.get(pose);
    if (!g) { g = build(pose, look, vlook); byPose.set(pose, g); }
    return g;
  }

  // ---------- painters ----------
  const LOOKS = {
    video: { ow: 0.55, out: '#14101a', shadeFill: 'linear' },
    rubberhose: { ow: 0.75, out: '#000000', shadeFill: 'flat-band', eyes: 'pie' },
    inked: { ow: 0.85, out: '#0a0608', shadeFill: 'flat', hatch: true, ink: true },
    toy: { ow: 0.35, out: '#2a2238', shadeFill: 'radial', shine: true, contact: true },
    woodblock: { ow: 0.6, out: '#1a120c', shadeFill: 'flat', pattern: true, ink: true },
    gloss: { ow: 0.3, out: '#3a2050', shadeFill: 'chrome', rim: true, contact: true },
    neon: { ow: 0, out: '#000000', shadeFill: 'dark', neon: true },
    lowpoly: { ow: 0, out: '#000000', shadeFill: 'facets', contact: true },
  };
  LOOKS.default = LOOKS.video;
  const grads = new WeakMap(); // prim -> { key, fill }

  function fillFor(ctx, pr, ramp, L) {
    const [x0, y0, x1, y1] = pr.box, kind = L.shadeFill;
    if (kind === 'flat' || kind === 'facets') return ramp[1];
    if (kind === 'dark') return mix(ramp[1], '#06060c', 0.78);
    const key = kind + ramp.join();
    const cached = grads.get(pr);
    if (cached && cached.key === key) return cached.fill;
    let g;
    if (kind === 'radial') {
      const r = Math.max(x1 - x0, y1 - y0);
      g = ctx.createRadialGradient(x0 + (x1 - x0) * 0.3, y0 + (y1 - y0) * 0.25, r * 0.05, x0 + (x1 - x0) * 0.45, y0 + (y1 - y0) * 0.45, r * 0.85);
      g.addColorStop(0, mix(ramp[2], '#ffffff', 0.35)); g.addColorStop(0.45, ramp[1]); g.addColorStop(1, ramp[0]);
    } else if (kind === 'chrome') {
      g = ctx.createLinearGradient(x0, y0, x0 + (x1 - x0) * 0.4, y1);
      g.addColorStop(0, mix(ramp[2], '#ffffff', 0.5)); g.addColorStop(0.38, ramp[1]); g.addColorStop(0.5, ramp[0]);
      g.addColorStop(0.62, mix(ramp[2], '#ffd0f0', 0.3)); g.addColorStop(1, ramp[1]);
    } else if (kind === 'flat-band') {
      g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, ramp[2]); g.addColorStop(0.3, ramp[1]); g.addColorStop(1, ramp[1]);
    } else { // soft painted light from the top-left
      g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, ramp[2]); g.addColorStop(0.45, ramp[1]); g.addColorStop(1, ramp[0]);
    }
    grads.set(pr, { key, fill: g });
    return g;
  }

  function hatch(ctx, pr, color) { // diagonal lines over the shadow (bottom-right) side
    const [x0, y0, x1, y1] = pr.box, w = x1 - x0, h = y1 - y0;
    if (w < 1.6 && h < 1.6) return;
    ctx.save(); ctx.clip(pr.path, 'nonzero');
    ctx.strokeStyle = color; ctx.lineWidth = 0.22; ctx.beginPath();
    const cx = x0 + w * 0.55, cy = y0 + h * 0.55;
    for (let k = -w - h; k < w + h; k += 0.75) { ctx.moveTo(cx + k, y1 + 1); ctx.lineTo(cx + k + h + 2, cy - 1); }
    ctx.stroke(); ctx.restore();
  }
  function pattern(ctx, pr, color) { // woodblock cloth: small dots in rows
    const [x0, y0, x1, y1] = pr.box;
    if (x1 - x0 < 2 || y1 - y0 < 2) return;
    ctx.save(); ctx.clip(pr.path, 'nonzero'); ctx.fillStyle = color;
    for (let y = y0 + 0.6, r = 0; y < y1; y += 1.3, r++) for (let x = x0 + (r % 2) * 0.65; x < x1; x += 1.3) { ctx.beginPath(); ctx.arc(x, y, 0.22, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }

  function paintGroup(ctx, prims, m, L, vlook, o) {
    if (!prims.length) return;
    const tint = o.tint;
    // 1) silhouette outline: every part stroked wide underneath, so only the outer edge shows.
    if (!tint && L.neon) { // glowing edge: a soft wide stroke, then a bright thin one, all under the fills
      for (const [w, a] of [[1.5, 0.18], [0.75, 0.55], [0.4, 1]]) {
        ctx.globalAlpha *= a; ctx.lineWidth = w;
        for (const pr of prims) { const r = m[pr.m]; if (!r) continue; ctx.strokeStyle = pr.m === 'skin' || pr.m === 'skinB' ? '#ff5ad0' : mix(r[2], '#ffffff', 0.2); ctx.stroke(pr.path); }
        ctx.globalAlpha /= a;
      }
    } else if (!tint && L.rim) { // pastel rim: pink up-left, cyan down-right, under the fills
      ctx.lineWidth = 0.9;
      for (const [dx, dy, c] of [[-0.3, -0.3, '#ff9ae0'], [0.3, 0.3, '#7af0ff']]) {
        ctx.translate(dx, dy); ctx.strokeStyle = c; for (const pr of prims) ctx.stroke(pr.path); ctx.translate(-dx, -dy);
      }
      ctx.lineWidth = L.ow * 2; ctx.strokeStyle = L.out; for (const pr of prims) ctx.stroke(pr.path);
    } else if (L.ow > 0 && !tint) {
      ctx.strokeStyle = L.out; ctx.fillStyle = L.out; ctx.lineJoin = 'round'; ctx.lineWidth = L.ow * 2;
      for (const pr of prims) { ctx.fill(pr.path); ctx.stroke(pr.path); }
    }
    // 2) fills
    for (const pr of prims) {
      const ramp = m[pr.m];
      if (!ramp) continue;
      if (tint) { ctx.fillStyle = tint; ctx.fill(pr.path); continue; }
      if (pr.glow && vlook !== 'rubberhose' && vlook !== 'lowpoly') { // emissive bits
        ctx.fillStyle = ramp[2]; ctx.fill(pr.path);
        if (vlook === 'neon' || vlook === 'gloss' || vlook === 'video') { ctx.globalAlpha *= 0.35; ctx.lineWidth = 0.9; ctx.strokeStyle = ramp[2]; ctx.stroke(pr.path); ctx.globalAlpha /= 0.35; }
        continue;
      }
      if (L.shadeFill === 'facets') {
        for (const f of pr.facets) {
          const k = f.k, c = k > 0.35 ? ramp[2] : k > -0.35 ? ramp[1] : ramp[0];
          ctx.fillStyle = c; ctx.strokeStyle = c; ctx.lineWidth = 0.08;
          const q = f.pts; ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(q[2], q[3]); ctx.lineTo(q[4], q[5]); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        if (m.crystal && (pr.round || pr.torso)) { // a glint on the glass
          const [x0, y0, x1] = pr.box; ctx.fillStyle = 'rgba(255,240,235,0.75)';
          ctx.beginPath(); ctx.moveTo(x0 + (x1 - x0) * 0.3, y0 + 0.5); ctx.lineTo(x0 + (x1 - x0) * 0.45, y0 + 0.6); ctx.lineTo(x0 + (x1 - x0) * 0.28, y0 + 1.6); ctx.closePath(); ctx.fill();
        }
        continue;
      }
      ctx.fillStyle = fillFor(ctx, pr, ramp, L); ctx.fill(pr.path);
      if (L.hatch && !pr.glow && (pr.cloth || pr.hair || pr.torso)) hatch(ctx, pr, rgbaStr(ramp[0], 0.85));
      if (L.pattern && pr.cloth && pr.m !== 'belt') pattern(ctx, pr, rgbaStr(ramp[2], 0.55));
      if (L.shine && (pr.round || pr.torso || pr.fist)) { // vinyl-toy specular spot
        const [x0, y0, x1, y1] = pr.box, w = x1 - x0, h = y1 - y0;
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.beginPath(); ctx.ellipse(x0 + w * 0.32, y0 + h * 0.26, Math.max(0.3, w * 0.16), Math.max(0.2, h * 0.09), -0.5, 0, Math.PI * 2); ctx.fill();
      }
      if (L.ink && pr.detail) { ctx.strokeStyle = L.out; ctx.lineWidth = L.ow * 0.45; ctx.stroke(pr.path); }
      if (L.rim && (pr.round || pr.torso)) { // gloss: a hard white streak, like a plastic or chrome shine
        const [x0, y0, x1, y1] = pr.box, w = x1 - x0, h = y1 - y0;
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath(); ctx.ellipse(x0 + w * 0.34, y0 + h * 0.24, Math.max(0.25, w * 0.2), Math.max(0.18, h * 0.07), -0.6, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  function paintFace(ctx, G, L, vlook, o) {
    const f = G.face, m = G.m;
    if (o.tint || m.crystal || !f) return;
    const ink = vlook === 'rubberhose' ? '#000000' : vlook === 'neon' ? '#8affff' : vlook === 'lowpoly' ? '#5a5a64' : '#140c14';
    ctx.fillStyle = ink; ctx.strokeStyle = ink; ctx.lineCap = 'round';
    if (f.eye) {
      if (L.eyes === 'pie' && !f.blink && !f.dizzy) { // big oval eye with a pie-cut pupil
        ctx.fillStyle = '#ffffff'; ctx.lineWidth = 0.25;
        ctx.beginPath(); ctx.ellipse(f.ex - 0.1, f.ey - 0.6, 0.9, 1.35, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#000000';
        ctx.beginPath(); ctx.moveTo(f.ex + 0.25, f.ey - 0.5); ctx.ellipse(f.ex + 0.25, f.ey - 0.5, 0.55, 0.85, 0, -1.2, Math.PI * 2 - 1.75); ctx.closePath(); ctx.fill();
      } else if (f.dizzy) {
        ctx.lineWidth = 0.28; ctx.beginPath(); ctx.moveTo(f.ex - 0.6, f.ey - 0.6); ctx.lineTo(f.ex + 0.5, f.ey + 0.4); ctx.moveTo(f.ex + 0.5, f.ey - 0.6); ctx.lineTo(f.ex - 0.6, f.ey + 0.4); ctx.stroke();
      } else if (f.blink) {
        ctx.lineWidth = 0.3; ctx.beginPath(); ctx.moveTo(f.ex - 0.7, f.ey); ctx.lineTo(f.ex + 0.5, f.ey); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.ellipse(f.ex, f.ey - 0.25, 0.42, 0.62, 0, 0, Math.PI * 2); ctx.fill();
        if (vlook === 'toy' || vlook === 'gloss') { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(f.ex + 0.12, f.ey - 0.45, 0.16, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = ink; }
      }
      if (f.brow) { ctx.lineWidth = 0.32; ctx.beginPath(); ctx.moveTo(f.ex - 0.9, f.hy - 1.0); ctx.lineTo(f.ex + 0.6, f.hy - 1.25 - (f.mouth === 'open' ? 0.3 : 0)); ctx.stroke(); }
    }
    if (f.mouthOn) { ctx.beginPath(); ctx.ellipse(f.hx + 2.9, f.hy + 3.1, 0.38, 0.6, 0, 0, Math.PI * 2); ctx.fill(); }
    else if (vlook === 'rubberhose' && f.eye) { ctx.lineWidth = 0.3; ctx.beginPath(); ctx.arc(f.hx + 2.4, f.hy + 2.0, 1.0, 0.3, 1.5); ctx.stroke(); } // the cartoon grin
  }

  const Vec = {
    LOOKS,
    // The current scene's vector look, if its style is smooth.
    active() {
      const sc = KF.engine && KF.engine.scene, st = sc && sc.style;
      return st && st.smooth ? (st.vecLook || 'video') : null;
    },
    draw(ctx, pose, look, o = {}) {
      if (!pose) return;
      const vlook = LOOKS[o.vlook] ? o.vlook : 'default';
      const L = LOOKS[vlook];
      if (o.crystal) look = Object.assign({}, look, { material: 'crystal' });
      const G = get(pose, look, vlook), k = o.scale || 1;
      ctx.save();
      if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
      if (L.contact && !o.tint && !o.noShadow) { // soft contact shadow under the feet
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.beginPath(); ctx.ellipse(0, 0, 8 * k, 1.6 * k, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.scale(k, k);
      if (vlook === 'rubberhose' && o.t !== undefined) { const s = Math.sin(o.t * 9) * 0.035; ctx.scale(1 - s, 1 + s); } // bouncy rubber
      ctx.translate(-BAX, -BAY);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      const by = { back: [], body: [], front: [] };
      for (const pr of G.prims) by[pr.g].push(pr);
      paintGroup(ctx, by.back, G.m, L, vlook, o);
      paintGroup(ctx, by.body, G.m, L, vlook, o);
      paintFace(ctx, G, L, vlook, o);
      paintGroup(ctx, by.front, G.m, L, vlook, o);
      if (o.flash > 0 && !o.tint) { // hit flash: the whole figure washes to white
        ctx.globalAlpha *= Math.min(1, o.flash); ctx.fillStyle = '#ffffff';
        for (const pr of G.prims) ctx.fill(pr.path);
      }
      ctx.restore();
    },
  };
  KF.Vec = Vec;
})(window.KF);
