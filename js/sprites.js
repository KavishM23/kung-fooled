'use strict';
// The fighter "BAO", drawn entirely in code. Each frame is a pose (joint targets) rasterised into
// a 40x40 pixel buffer, part by part, with a 3-step shading ramp per material and a dark outline.
(function (KF) {
  const W = 40, H = 40, AX = 20, AY = 38; // AX, AY: anchor at the feet

  function rgba(hex) {
    const n = parseInt(hex.slice(1), 16);
    return ((255 << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | (n >> 16)) >>> 0;
  }
  const ramp = (a, b, c) => [rgba(a), rgba(b), rgba(c)]; // shadow, base, highlight

  // Original palette: teal sleeveless jacket, orange headband, indigo trousers, wrapped fists.
  const PAL = {
    out: rgba('#1b1022'),
    skin: ramp('#9a4e34', '#dc8c5c', '#f6c08e'),
    skinB: ramp('#6e3424', '#a86444', '#cc8a62'),
    hair: ramp('#0c0812', '#241c32', '#3e3452'),
    band: ramp('#a83a10', '#f07a1a', '#ffc848'),
    jacket: ramp('#0b4650', '#168a88', '#52cdb8'),
    pants: ramp('#1c1440', '#3a2e74', '#6056aa'),
    pantsB: ramp('#120c2c', '#272054', '#3e3680'),
    wrap: ramp('#948a7c', '#d6cebe', '#fff6e4'),
    wrapB: ramp('#6a6258', '#a09888', '#c4bcac'),
    shoe: ramp('#24140c', '#563420', '#86582e'),
    eye: rgba('#1b1022'),
    white: rgba('#ffffff'),
  };

  class Mask {
    constructor() { this.m = new Uint8Array(W * H); }
    get(x, y) { return x >= 0 && y >= 0 && x < W && y < H ? this.m[y * W + x] : 0; }
    set(x, y) { if (x >= 0 && y >= 0 && x < W && y < H) this.m[y * W + x] = 1; }
    disc(cx, cy, r) {
      for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
        for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
          const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
          if (dx * dx + dy * dy <= r * r) this.set(x, y);
        }
      }
      return this;
    }
    line(a, b, r0, r1 = r0) {
      const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 2));
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        this.disc(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, r0 + (r1 - r0) * t);
      }
      return this;
    }
    poly(pts) {
      let x0 = W, x1 = 0, y0 = H, y1 = 0;
      for (const p of pts) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
      for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
        for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
          const px = x + 0.5, py = y + 0.5;
          let inside = false;
          for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
            const a = pts[i], b = pts[j];
            if ((a.y > py) !== (b.y > py) && px < ((b.x - a.x) * (py - a.y)) / (b.y - a.y) + a.x) inside = !inside;
          }
          if (inside) this.set(x, y);
        }
      }
      return this;
    }
  }

  // Paint a mask with a shading ramp: highlight on top/left edges, shadow on bottom/right.
  // `sep` draws a dark line where this part overlaps already-painted parts (keeps limbs readable).
  function paint(buf, mask, rp, sep = false) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!mask.get(x, y)) continue;
        let c = rp[1];
        if (!mask.get(x, y - 1) || !mask.get(x - 1, y)) c = rp[2];
        else if (!mask.get(x, y + 1) || !mask.get(x + 1, y) || !mask.get(x + 1, y + 1)) c = rp[0];
        if (sep) {
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx, ny = y + dy;
            if (!mask.get(nx, ny) && nx >= 0 && ny >= 0 && nx < W && ny < H && buf[ny * W + nx]) { c = PAL.out; break; }
          }
        }
        buf[y * W + x] = c;
      }
    }
  }

  function outline(buf) {
    const src = buf.slice();
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (src[y * W + x]) continue;
        if ((x > 0 && src[y * W + x - 1]) || (x < W - 1 && src[y * W + x + 1]) ||
            (y > 0 && src[(y - 1) * W + x]) || (y < H - 1 && src[(y + 1) * W + x])) buf[y * W + x] = PAL.out;
      }
    }
  }

  // Two-bone IK: joint position between root a and target b, bending toward `pref`.
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

  // pose: hx/hy hip offset, lean (rad, + = forward), tilt (head), fF/fB feet (rel. ground anchor),
  //       hF/hB fists (rel. neck), tail (headband phase), blink, mouth ('open' for shouting).
  function drawPose(pose) {
    const buf = new Uint32Array(W * H);
    const P = (x, y) => ({ x, y });
    const hip = P(AX + (pose.hx || 0), AY - 13 + (pose.hy || 0));
    const L = pose.lean || 0, tilt = pose.tilt || 0;
    const neck = P(hip.x + Math.sin(L) * 9, hip.y - Math.cos(L) * 9);
    const hd = P(neck.x + Math.sin(L + tilt) * 4.2, neck.y - Math.cos(L + tilt) * 4.2);
    const shF = P(neck.x + 1, neck.y + 1.6), shB = P(neck.x - 1.6, neck.y + 1.3);
    const hipF = P(hip.x + 1.2, hip.y), hipB = P(hip.x - 1.4, hip.y);
    const foot = (f) => P(AX + f[0], AY + f[1]);
    const hand = (h) => P(neck.x + h[0], neck.y + h[1]);
    const legF = ik(hipF, foot(pose.fF), 6.6, 6.6, P(1, 0.15));
    const legB = ik(hipB, foot(pose.fB), 6.6, 6.6, P(1, 0.15));
    const armF = ik(shF, hand(pose.hF), 4.8, 4.6, P(-0.35, 1));
    const armB = ik(shB, hand(pose.hB), 4.8, 4.6, P(-0.35, 1));

    // Headband tails streaming behind the head.
    const tailRoot = P(hd.x - 3.2 * Math.cos(tilt), hd.y - 1.6);
    const tm = new Mask();
    for (const off of [0, 1.4]) {
      let prev = P(tailRoot.x, tailRoot.y + off * 0.5);
      for (let k = 1; k <= 4; k++) {
        const pt = P(tailRoot.x - k * 2.1 * (pose.tailLen || 1), tailRoot.y + off + k * 0.55 + Math.sin((pose.tail || 0) + k * 1.2 + off) * 0.35 * k);
        tm.line(prev, pt, 0.75, 0.6);
        prev = pt;
      }
    }
    paint(buf, tm, PAL.band);

    const limb = (l, root, r0, r1, rp) => { const m = new Mask(); m.line(root, l.joint, r0, r1).line(l.joint, l.end, r1, r1 * 0.9); paint(buf, m, rp); };
    const fist = (l, rp, sep) => {
      const m = new Mask();
      const dx = l.end.x - l.joint.x, dy = l.end.y - l.joint.y, d = Math.hypot(dx, dy) || 1;
      m.line(P(l.end.x - dx / d * 1.6, l.end.y - dy / d * 1.6), l.end, 1.35).disc(l.end.x + dx / d * 0.6, l.end.y + dy / d * 0.6, 1.9);
      paint(buf, m, rp, sep);
    };
    const shoe = (l, rp) => {
      const m = new Mask();
      m.line(P(l.end.x - 0.5, l.end.y - 0.6), P(l.end.x + 2.2, l.end.y - 0.4), 1.15);
      paint(buf, m, rp);
    };

    // Back arm, back leg.
    limb(armB, shB, 1.35, 1.25, PAL.skinB); fist(armB, PAL.wrapB);
    limb(legB, hipB, 2.0, 1.6, PAL.pantsB); shoe(legB, PAL.shoe);
    // Pelvis + front leg.
    paint(buf, new Mask().disc(hip.x, hip.y, 2.7), PAL.pants);
    limb(legF, hipF, 2.15, 1.7, PAL.pants); shoe(legF, PAL.shoe);
    // Torso: sleeveless jacket, open at the chest.
    const tor = new Mask().line(P(hip.x - Math.sin(L), hip.y - 1), neck, 3.3, 3.7).disc(shF.x, shF.y - 0.4, 2.1).disc(shB.x, shB.y - 0.3, 2.0);
    paint(buf, tor, PAL.jacket);
    const chest = new Mask().poly([P(neck.x + 0.6, neck.y + 0.4), P(neck.x + 3.4, neck.y + 0.6), P(neck.x + 1.4 + Math.sin(L) * -3, neck.y + 4.8)]);
    paint(buf, chest, PAL.skin);
    // Belt with knot tails.
    const bx = Math.cos(L) * 3.6, by = Math.sin(L) * 3.6;
    const belt = new Mask().line(P(hip.x - bx, hip.y - 1.4 - by), P(hip.x + bx, hip.y - 1.4 + by), 0.95);
    belt.line(P(hip.x - bx * 0.7, hip.y - 1), P(hip.x - bx * 0.7 - 1.5, hip.y + 2.2 + (pose.knot || 0)), 0.6);
    paint(buf, belt, PAL.wrap);
    // Head: hair mass, face, spiky crown, headband, eye.
    const hair = new Mask().disc(hd.x - 0.8, hd.y - 0.6, 3.9)
      .line(P(hd.x - 1, hd.y - 3), P(hd.x - 0.5, hd.y - 6.2), 0.9)
      .line(P(hd.x - 2.5, hd.y - 2.5), P(hd.x - 4.4, hd.y - 5.0), 0.85)
      .line(P(hd.x + 1.0, hd.y - 3), P(hd.x + 2.6, hd.y - 5.4), 0.8)
      .line(P(hd.x - 3.4, hd.y - 1), P(hd.x - 6.2, hd.y - 2.0), 0.8);
    paint(buf, hair, PAL.hair);
    const face = new Mask().disc(hd.x + 0.9, hd.y + 0.7, 3.05).disc(hd.x + 2.2, hd.y + 2.2, 1.6);
    paint(buf, face, PAL.skin);
    const band = new Mask().line(P(hd.x - 3.6, hd.y - 1.5), P(hd.x + 3.6, hd.y - 1.9 + tilt * 2), 0.85);
    paint(buf, band, PAL.band);
    const ex = Math.round(hd.x + 2.2), ey = Math.round(hd.y + 0.2);
    if (!pose.blink) { buf[ey * W + ex] = PAL.eye; buf[(ey - 1) * W + ex] = PAL.eye; buf[(ey - 1) * W + ex - 1] = PAL.eye; }
    else { buf[ey * W + ex] = PAL.eye; buf[ey * W + ex - 1] = PAL.eye; }
    if (pose.mouth === 'open') { const mx = Math.round(hd.x + 3), my = Math.round(hd.y + 3); buf[my * W + mx] = PAL.eye; buf[(my + 1) * W + mx] = PAL.eye; }
    if (pose.dizzy) { buf[ey * W + ex] = PAL.white; buf[(ey - 1) * W + ex - 1] = PAL.eye; buf[(ey + 1) * W + ex + 1] = PAL.eye; }
    // Front arm last, outlined against the body.
    const am = new Mask().line(shF, armF.joint, 1.45, 1.3).line(armF.joint, armF.end, 1.3, 1.25);
    paint(buf, am, PAL.skin, true);
    fist(armF, PAL.wrap, true);

    outline(buf);
    return buf;
  }

  function toCanvas(buf) {
    const c = KF.makeCanvas(W, H);
    const x = c.getContext('2d');
    const img = x.createImageData(W, H);
    new Uint32Array(img.data.buffer).set(buf);
    x.putImageData(img, 0, 0);
    return c;
  }
  // Solid-colour copy of a frame for afterimages and hit flashes.
  function tint(src, color) {
    const c = KF.makeCanvas(W, H), x = c.getContext('2d');
    x.drawImage(src, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = color; x.fillRect(0, 0, W, H);
    return c;
  }

  // ---- Animation poses ----
  const TAU = Math.PI * 2;
  const POSES = {
    // Fighting stance with a breathing bob.
    idle: [0, 1, 2, 3].map((i) => {
      const b = [0, 0.6, 1, 0.6][i];
      return { hy: 2 + b, lean: 0.14, tilt: -0.05, fF: [5, 0], fB: [-5, 0], hF: [5.5, -0.5 + b * 0.6], hB: [2.5, 2.2 + b * 0.6], tail: i * 1.6, tailLen: 0.8, knot: b * 0.5, blink: i === 3 };
    }),
    run: [0, 1, 2, 3, 4, 5].map((i) => {
      const p = (i / 6) * TAU, s = Math.sin(p), c = Math.cos(p);
      return {
        hy: 1.2 - Math.abs(c) * 1.6, hx: 1, lean: 0.32, tilt: -0.12,
        fF: [6.5 * s, -Math.max(0, c) * 4.5], fB: [-6.5 * s, -Math.max(0, -c) * 4.5],
        hF: [1.5 - 4 * s, 3.2 + c * 1.2], hB: [1.5 + 4 * s, 3.2 - c * 1.2], tail: p * 2, tailLen: 1.2,
      };
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
  };

  const frames = {};
  for (const name in POSES) {
    frames[name] = POSES[name].map((pose) => {
      const c = toCanvas(drawPose(pose));
      return { img: c, ghostA: tint(c, '#38e8ff'), ghostB: tint(c, '#ff4fb8'), flash: tint(c, '#ffffff') };
    });
  }

  KF.Sprites = {
    W, H, AX, AY, frames, POSES,
    // Which frame a player state shows at time t.
    pick(state, t) {
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
    },
    // Draw a frame with feet at (x, y). flipY: upside-down (gravity flipped; y is then the head side).
    draw(ctx, frame, x, y, facing, flipY = false, which = 'img') {
      ctx.save();
      ctx.translate(Math.round(x), Math.round(y));
      ctx.scale(facing < 0 ? -1 : 1, flipY ? -1 : 1);
      ctx.drawImage(frame[which], -AX, -AY);
      ctx.restore();
    },
  };
})(window.KF);
