'use strict';
// World-space set dressing. Each shipped course chooses its own pair of landmarks and
// surface material. The shapes sit behind collision geometry; the small wear marks are
// baked onto the tiles, so scenery never changes a jump or hides a trap hitbox.
(function (KF) {
  const T = KF.TILE, VW = KF.VIEW_W, VH = KF.VIEW_H;
  const rect = (ctx, color, x, y, w, h) => {
    ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };
  const line = (ctx, color, x1, y1, x2, y2, width = 1) => {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath();
    ctx.moveTo(Math.round(x1) + .5, Math.round(y1) + .5);
    ctx.lineTo(Math.round(x2) + .5, Math.round(y2) + .5); ctx.stroke();
  };
  const hash = (a, b, seed = 0) => KF.util.hash2(a * 31 + seed * 17, b * 47 + seed * 29);

  // A row per level, rather than a realm-wide backdrop repeated four times.
  // landmark A, landmark B, material: masonry / metal / nature / print / circuit.
  const SCENES = {
    arcade: [
      ['roof', 'tank', 'metal'], ['dock', 'ship', 'metal'],
      ['ruin', 'cave', 'masonry'], ['pagoda', 'grove', 'nature'],
    ],
    oldtv: [
      ['studio', 'roof', 'masonry'], ['roof', 'tank', 'metal'],
      ['rail', 'signal', 'metal'], ['dock', 'ship', 'masonry'],
    ],
    pocket: [
      ['arcade', 'circuit', 'circuit'], ['pagoda', 'ruin', 'masonry'],
      ['cave', 'machine', 'masonry'], ['cliff', 'grove', 'nature'],
    ],
    comic: [
      ['city', 'billboard', 'masonry'], ['market', 'city', 'metal'],
      ['ruin', 'cave', 'masonry'], ['rail', 'signal', 'metal'],
    ],
    argo: [
      ['market', 'grove', 'nature'], ['grove', 'pagoda', 'nature'],
      ['dock', 'bridge', 'metal'], ['pagoda', 'ruin', 'masonry'],
    ],
    eightbit: [
      ['arcade', 'circuit', 'circuit'], ['cliff', 'ship', 'nature'],
      ['machine', 'cave', 'metal'], ['dock', 'rail', 'metal'],
    ],
    woodblock: [
      ['wave', 'ship', 'print'], ['cliff', 'grove', 'nature'],
      ['pagoda', 'grove', 'print'], ['cliff', 'bridge', 'print'],
    ],
    vhs: [
      ['roof', 'grove', 'metal'], ['city', 'billboard', 'masonry'],
      ['market', 'machine', 'metal'], ['rail', 'signal', 'metal'],
    ],
    vapor: [
      ['cliff', 'ship', 'nature'], ['machine', 'ruin', 'metal'],
      ['cave', 'wave', 'nature'], ['market', 'arcade', 'metal'],
    ],
    cyber: [
      ['city', 'circuit', 'circuit'], ['machine', 'signal', 'metal'],
      ['cave', 'circuit', 'circuit'], ['atrium', 'machine', 'masonry'],
    ],
  };
  const PALETTE = {
    arcade: ['#252d43', '#465774', '#788999', '#bb9a73', '#617a68', '#f6cf8e'],
    oldtv: ['#292929', '#505050', '#898989', '#b3afa0', '#676767', '#f0e7c8'],
    pocket: ['#183b24', '#35664a', '#638a52', '#9cbd70', '#426d36', '#c9dd80'],
    comic: ['#283450', '#475576', '#8d90ab', '#e8a871', '#4c7b83', '#ffdf9a'],
    argo: ['#183934', '#35695d', '#72a18d', '#c9ad80', '#55916c', '#ffdfa4'],
    eightbit: ['#202c48', '#45577b', '#8496a6', '#b38a5c', '#557b6a', '#f4c76d'],
    woodblock: ['#34495d', '#557287', '#96a7a3', '#c49b79', '#547e6c', '#e9cfab'],
    vhs: ['#282c46', '#586079', '#9d93a0', '#c38776', '#678b79', '#f5c58f'],
    vapor: ['#30264d', '#665582', '#a589a4', '#d49ab2', '#738bb2', '#ffd1ad'],
    cyber: ['#182536', '#375366', '#7297a5', '#749da2', '#437e86', '#b0ebec'],
  };
  const profile = (def) => def && SCENES[def.realm] && SCENES[def.realm][def.index];

  function motif(ctx, kind, x, base, scale, p, seed) {
    ctx.save(); ctx.translate(Math.round(x), Math.round(base)); ctx.scale(scale, scale);
    const [dark, mid, light, warm, leaf, lamp] = p;
    const R = (c, x, y, w, h) => rect(ctx, c, x, y, w, h);
    const L = (c, x1, y1, x2, y2, width) => line(ctx, c, x1, y1, x2, y2, width);
    const window = (x, y, w = 3, h = 4) => { R(dark, x - 1, y - 1, w + 2, h + 2); R(seed % 3 ? warm : lamp, x, y, w, h); R(light, x, y, w, 1); };
    if (kind === 'roof' || kind === 'city' || kind === 'billboard') {
      const h = kind === 'city' ? 97 : 68, w = kind === 'billboard' ? 76 : 62;
      R(dark, -w / 2 - 3, -h - 3, w + 6, h + 3);
      R(mid, -w / 2, -h, w, h);
      R(light, -w / 2, -h, w, 3); R(dark, -w / 2 + 4, -h + 4, w - 8, 2);
      for (let yy = -h + 11; yy < -9; yy += 14)
        for (let xx = -w / 2 + 7; xx < w / 2 - 4; xx += 12)
          if (hash(xx, yy, seed) > .24) window(xx, yy, 5, 6);
      R(dark, -w / 2 - 8, -h - 7, w + 16, 4);
      R(light, -w / 2 - 7, -h - 7, w + 14, 1);
      if (kind === 'billboard') {
        R(dark, -29, -h - 42, 58, 30); R(warm, -27, -h - 40, 54, 25);
        R(mid, -23, -h - 35, 46, 2); R(lamp, -23, -h - 29, 36, 3);
        R(dark, -23, -h - 20, 42, 2); R(light, -19, -h - 16, 28, 2);
        for (const s of [-22, 22]) { R(dark, s, -h - 12, 2, 12); R(light, s, -h - 40, 2, 3); }
      } else {
        R(dark, 17, -h - 24, 3, 24); R(light, 18, -h - 23, 1, 18);
        L(mid, 18, -h - 22, -8, -h - 15); L(mid, 18, -h - 22, 35, -h - 10);
        for (let i = 0; i < 3; i++) R(warm, -w / 2 + 9 + i * 17, -h - 9, 6, 3);
      }
    } else if (kind === 'tank') {
      for (const leg of [-19, 16]) { R(dark, leg, -42, 3, 42); R(light, leg + 1, -39, 1, 34); }
      R(dark, -25, -68, 51, 27); R(mid, -22, -66, 45, 24);
      for (let i = 0; i < 6; i++) R(light, -20 + i * 8, -63, 1, 19);
      R(dark, -28, -70, 56, 5); R(warm, -26, -69, 52, 1);
      R(dark, -30, -44, 60, 3); R(dark, 23, -39, 10, 3);
      for (let i = 0; i < 4; i++) R(dark, 26, -39 + i * 9, 6, 1);
    } else if (kind === 'dock' || kind === 'bridge') {
      const top = kind === 'bridge' ? -55 : -30;
      R(dark, -51, top, 102, 6); R(warm, -50, top, 100, 2);
      for (const x of [-42, -6, 34]) { R(dark, x, top + 6, 5, -top - 6); R(mid, x + 1, top + 7, 2, -top - 10); }
      if (kind === 'bridge') {
        for (let i = 0; i < 5; i++) { const x = -41 + i * 21; R(mid, x, top - 16, 3, 16); L(light, x + 2, top - 16, x + 21, top - 3); }
      } else {
        R(dark, -30, top - 71, 5, 72); L(light, -28, top - 68, 40, top - 68, 3);
        L(dark, -28, top - 65, 35, top - 9, 2); L(dark, 31, top - 68, 31, top - 38);
        R(warm, 24, top - 38, 14, 8); R(light, 27, top - 36, 8, 2);
      }
    } else if (kind === 'ship' || kind === 'wave') {
      if (kind === 'wave') {
        for (let i = 0; i < 6; i++) {
          const x = -56 + i * 20, h = 11 + hash(i, seed) * 16;
          R(mid, x, -h, 24, h); R(light, x + 2, -h, 15, 2);
          R(lamp, x + 10, -h - 3, 5, 2);
        }
      } else {
        R(dark, -51, -23, 102, 16); R(mid, -45, -20, 90, 10);
        R(warm, -28, -26, 54, 4); R(dark, -4, -88, 3, 64);
        L(light, -2, -85, 37, -43); L(light, -2, -85, -32, -44);
        R(light, 0, -80, 34, 32); R(mid, 1, -78, 30, 28);
        for (let i = 0; i < 5; i++) R(lamp, -34 + i * 15, -14, 4, 3);
      }
    } else if (kind === 'pagoda' || kind === 'ruin') {
      for (const x of [-33, 25]) { R(dark, x, -70, 8, 70); R(mid, x + 2, -68, 3, 65); }
      for (const yy of [-72, -44]) {
        R(dark, -49, yy, 98, 6); R(warm, -43, yy + 1, 86, 2);
        R(mid, -39, yy + 6, 78, 3);
        if (kind === 'pagoda') {
          R(dark, -55, yy - 6, 9, 8); R(dark, 46, yy - 6, 9, 8);
          for (let i = 0; i < 4; i++) R(lamp, -30 + i * 19, yy + 7, 4, 4);
        } else {
          R(light, -36, yy + 2, 17, 1); R(dark, 9, yy + 5, 9, 3);
        }
      }
      if (kind === 'ruin') { R(dark, 6, -111, 16, 41); R(light, 8, -108, 3, 19); }
      else { R(dark, -22, -103, 44, 29); R(mid, -18, -100, 36, 24); R(light, -12, -96, 24, 2); }
    } else if (kind === 'grove' || kind === 'cliff') {
      if (kind === 'grove') {
        R(dark, -4, -79, 9, 80); R(warm, -1, -77, 2, 70);
        for (let i = 0; i < 18; i++) {
          const xx = -37 + hash(i, seed, 7) * 74, yy = -108 + hash(i, seed, 8) * 49;
          ctx.fillStyle = i % 4 ? leaf : light;
          ctx.beginPath(); ctx.ellipse(xx, yy, 11 + i % 4, 6 + i % 3, 0, 0, Math.PI * 2); ctx.fill();
          if (i % 3 === 0) R(lamp, xx + 5, yy + 2, 3, 2);
        }
        L(dark, -1, -61, -29, -89, 2); L(dark, 2, -70, 31, -98, 2);
      } else {
        ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(-55, 0);
        ctx.lineTo(-34, -76); ctx.lineTo(-18, -56); ctx.lineTo(2, -113);
        ctx.lineTo(20, -74); ctx.lineTo(39, -92); ctx.lineTo(55, 0); ctx.fill();
        L(light, 2, -112, -7, -91, 2); L(mid, 21, -74, 36, -41, 3);
        for (let i = 0; i < 5; i++) {
          const xx = -39 + i * 19, yy = -18 - hash(i, seed) * 42;
          R(leaf, xx, yy - 12, 7, 12); R(dark, xx + 3, yy - 15, 1, 15);
        }
      }
    } else if (kind === 'rail' || kind === 'signal') {
      if (kind === 'rail') {
        R(dark, -54, -60, 108, 50); R(mid, -50, -57, 100, 42);
        R(warm, -53, -30, 106, 5); R(light, -50, -55, 100, 2);
        for (let i = 0; i < 6; i++) window(-42 + i * 16, -50, 11, 12);
        for (const xx of [-41, 34]) { R(dark, xx, -8, 9, 8); R(light, xx + 2, -7, 4, 2); }
        L(dark, -60, -4, 60, -4, 3);
      } else {
        R(dark, -3, -94, 6, 94); R(light, -2, -93, 1, 90);
        R(dark, -17, -96, 34, 28); R(mid, -14, -93, 28, 22);
        for (let i = 0; i < 3; i++) R(i === seed % 3 ? lamp : dark, -9 + i * 8, -85, 5, 7);
        R(dark, -27, -12, 54, 3); R(warm, -26, -11, 52, 1);
      }
    } else if (kind === 'market' || kind === 'studio') {
      R(dark, -47, -57, 94, 58); R(mid, -44, -52, 88, 50);
      R(dark, -53, -66, 106, 15);
      for (let i = 0; i < 8; i++) R(i % 2 ? warm : light, -50 + i * 13, -64, 12, 12);
      for (let i = 0; i < 4; i++) { R(dark, -32 + i * 17, -36, 13, 21); R(lamp, -29 + i * 17, -31, 6, 4); }
      if (kind === 'studio') {
        R(dark, -50, -99, 100, 6); R(light, -48, -98, 96, 1);
        for (const xx of [-34, 22]) { L(dark, xx, -98, xx, -72); R(lamp, xx - 5, -75, 10, 8); }
      } else { R(dark, -45, -13, 90, 3); R(warm, -40, -15, 80, 3); }
    } else if (kind === 'machine' || kind === 'circuit' || kind === 'arcade') {
      R(dark, -47, -84, 94, 84); R(mid, -44, -81, 88, 77);
      for (let yy = -74; yy < -9; yy += 17) {
        R(dark, -38, yy, 76, 12); R(light, -35, yy + 2, 70, 1);
        for (let i = 0; i < 5; i++) R(i % 4 ? leaf : lamp, -28 + i * 14, yy + 6, 4, 2);
      }
      if (kind === 'arcade') {
        R(dark, -25, -95, 50, 20); R(warm, -22, -93, 44, 15);
        R(lamp, -16, -90, 32, 3); R(light, -13, -84, 26, 1);
      } else if (kind === 'circuit') {
        for (let i = 0; i < 6; i++) {
          const xx = -54 + i * 21; L(light, xx, -88, xx, -100 - i % 3 * 4);
          R(lamp, xx - 2, -106 - i % 3 * 4, 5, 5);
        }
      } else {
        R(dark, -61, -70, 14, 13); L(warm, -47, -64, 47, -64, 3);
        R(dark, 44, -68, 17, 28); R(lamp, 47, -61, 8, 5);
      }
    } else if (kind === 'cave' || kind === 'atrium') {
      if (kind === 'cave') {
        for (let i = 0; i < 8; i++) {
          const xx = -51 + i * 14, h = 31 + hash(i, seed) * 70;
          ctx.fillStyle = i % 3 ? mid : dark; ctx.beginPath();
          ctx.moveTo(xx - 6, 0); ctx.lineTo(xx + 1, -h); ctx.lineTo(xx + 8, 0); ctx.fill();
          L(light, xx + 1, -h, xx + 2, -h + 13, 1);
          if (i % 3 === 0) R(lamp, xx + 2, -h + 3, 2, 4);
        }
      } else {
        for (const xx of [-46, 37]) { R(dark, xx - 3, -105, 12, 105); R(mid, xx, -102, 6, 99); }
        for (const yy of [-108, -16]) { R(light, -53, yy, 106, 4); R(dark, -50, yy + 4, 100, 2); }
        R(warm, -24, -99, 48, 72); R(light, -21, -96, 42, 66);
        R(dark, -17, -92, 34, 57); R(lamp, -13, -89, 26, 3);
      }
    }
    ctx.restore();
  }

  // The compact door acts have four playable heights. Continue those heights
  // into the nearby world: rooms, windows and service frames in built places;
  // ledges, trees and cave mouths in natural ones. This stays behind collisions
  // and uses slight parallax so it reads as depth rather than extra platforms.
  function verticalWorld(ctx, def, cam, p, material) {
    for (const route of def.baits || []) {
      const bands = route.bands;
      for (let i = 0; i < 4; i++) {
        const x = (route.x0 + bands[i]) * T - cam.x * .91;
        const y = route.profile[i] * T - cam.y * .94;
        const w = (bands[i + 1] - bands[i]) * T;
        if (x > VW + 20 || x + w < -20 || y < -130 || y > VH + 90) continue;
        if (material === 'nature' || material === 'print') {
          ctx.globalAlpha = .31;
          ctx.fillStyle = p[0];
          ctx.beginPath(); ctx.moveTo(x - 5, y + 112);
          ctx.lineTo(x - 3, y + 9); ctx.lineTo(x + 7, y - 5);
          ctx.lineTo(x + w - 9, y - 3); ctx.lineTo(x + w + 4, y + 10);
          ctx.lineTo(x + w + 8, y + 112); ctx.closePath(); ctx.fill();
          ctx.globalAlpha = .38;
          for (let j = 0; j < 3; j++) {
            const xx = x + 8 + j * (w - 15) / 3;
            line(ctx, p[2], xx, y + 8, xx - 4, y + 26, 2);
            rect(ctx, p[4], xx - 4, y - 10 - (j % 2) * 7, 14, 5);
            rect(ctx, p[4], xx + 1, y - 16 - (j % 2) * 7, 4, 11);
          }
          // An opening under the ledge hints at another environmental layer.
          rect(ctx, p[0], x + w / 2 - 9, y + 42, 18, 24);
          rect(ctx, p[2], x + w / 2 - 9, y + 42, 18, 2);
        } else {
          ctx.globalAlpha = .2;
          rect(ctx, p[0], x - 4, y - 72, w + 8, 160);
          rect(ctx, p[1], x, y - 68, w, 153);
          ctx.globalAlpha = .43;
          for (const row of [-59, -23, 16, 54]) {
            rect(ctx, p[0], x + 2, y + row, w - 4, 3);
            for (let j = 0; j < Math.floor((w - 8) / 16); j++) {
              const wx = x + 7 + j * 16;
              rect(ctx, p[0], wx, y + row + 7, 9, 14);
              rect(ctx, p[2], wx + 1, y + row + 8, 7, 9);
              rect(ctx, p[5], wx + 2, y + row + 9, 2, 4);
            }
          }
          for (const post of [x + 1, x + w - 3]) {
            rect(ctx, p[0], post, y - 73, 3, 160);
            rect(ctx, p[2], post + 1, y - 69, 1, 148);
          }
          // Visible framing above and below the traversed floor makes a
          // rooftop, balcony or interior feel connected to the next height.
          rect(ctx, p[3], x + 3, y - 72, w - 6, 2);
          rect(ctx, p[0], x + 2, y + 80, w - 4, 3);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  function draw(ctx, stage, cam, t) {
    const def = stage.def, scene = profile(def);
    if (!scene) return;
    const pal = PALETTE[def.realm], world = stage.world;
    const anchors = [world.spawn, ...world.partDoors, world.door].filter(Boolean);
    const points = [];
    anchors.forEach((a, i) => {
      const x = Math.max(45, Math.min(world.pixelW - 45, a.x + (i % 2 ? -54 : 71)));
      const y = Math.max(111, Math.min(world.pixelH - 13, a.y + 28));
      points.push([x, y, i % 2 ? scene[1] : scene[0], i]);
      if (i < anchors.length - 1) {
        const b = anchors[i + 1];
        points.push([(a.x + b.x) / 2, Math.max(104, (a.y + b.y) / 2 + 30), scene[(i + 1) % 2], i + 4]);
      }
    });
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, VW, VH); ctx.clip();
    // Far haze follows the camera more slowly than the tiles. Landscapes get
    // layered ridges; built places get architecture and small window lights.
    for (let i = 0; i < 3; i++) {
      const par = .28 + i * .16, yy = 38 + i * 58 - cam.y * (.12 + i * .12);
      ctx.globalAlpha = def.realm === 'cyber' && def.index === 3 ? .08 : .12;
      if (scene[2] === 'nature' || scene[2] === 'print') {
        ctx.fillStyle = pal[1 + i % 2]; ctx.beginPath(); ctx.moveTo(0, VH);
        for (let x = -12; x <= VW + 15; x += 12) {
          const wx = x + cam.x * par;
          const slope = Math.abs(Math.sin(wx * .012 + i * 1.9) * (25 + i * 8));
          const grain = (hash(Math.floor(wx / 12), i, def.index) - .5) * 8;
          ctx.lineTo(x, yy + 20 - slope + grain);
        }
        ctx.lineTo(VW, VH); ctx.closePath(); ctx.fill();
        for (let k = -2; k < 12; k++) {
          const x = k * 47 - ((cam.x * par) % 47), y = yy + 9 - hash(k, i, def.index) * 11;
          rect(ctx, pal[4], x, y - 10 - (k & 1) * 4, 2, 15);
          for (let j = 0; j < 3; j++) rect(ctx, pal[4], x - 3 - j, y - 10 + j * 4, 8 + j * 2, 2);
        }
      } else {
        rect(ctx, pal[1 + i % 2], 0, yy, VW, 13 + i * 8);
        for (let k = -2; k < 8; k++) {
          const x = k * 78 - ((cam.x * par) % 78), h = 15 + hash(k, i, def.index) * 37;
          rect(ctx, pal[i % 2], x, yy - h, 45 + (k & 1) * 11, h);
          for (let j = 0; j < 3; j++) rect(ctx, pal[2], x + 5 + j * 10, yy - h + 8, 3, 5);
        }
      }
    }
    verticalWorld(ctx, def, cam, pal, scene[2]);
    ctx.globalAlpha = def.realm === 'cyber' && def.index === 3 ? .25 : .58;
    points.forEach(([wx, wy, kind, i]) => {
      const x = wx - cam.x * .82, y = wy - cam.y * .88;
      if (x < -115 || x > VW + 115 || y < -30 || y > VH + 130) return;
      motif(ctx, kind, x, y, .78 + ((i + def.index) % 3) * .12, pal, def.index * 13 + i);
    });
    // Fine support wires, hanging bulbs and long shadow strokes tie the objects
    // to the elevated part of the route without reading as solid platforms.
    ctx.globalAlpha = .34;
    for (let i = 0; i < points.length - 1; i += 2) {
      const a = points[i], b = points[i + 1];
      const x1 = a[0] - cam.x * .82, x2 = b[0] - cam.x * .82;
      const y1 = a[1] - 76 - cam.y * .88, y2 = b[1] - 76 - cam.y * .88;
      if (x2 < -30 || x1 > VW + 30) continue;
      line(ctx, pal[2], x1, y1, x2, y2 + 12);
      for (let k = 1; k < 4; k++) {
        const x = x1 + (x2 - x1) * k / 4, y = y1 + (y2 + 12 - y1) * k / 4 + 4;
        line(ctx, pal[0], x, y, x, y + 9);
        rect(ctx, pal[5], x - 2, y + 8, 4, 4);
      }
    }
    ctx.restore();
    void t;
  }

  function bake(ctx, world, def) {
    const scene = profile(def);
    if (!scene) return;
    const p = PALETTE[def.realm], material = scene[2], W = world.cols, H = world.rows;
    const forbidden = [world.spawn, ...world.partDoors, world.door].filter(Boolean);
    const nearDoor = (x, y) => forbidden.some((d) => Math.abs(x - d.x) < 27 && Math.abs(y - d.y - 24) < 32);
    ctx.save();
    for (let r = 1; r < H; r++) for (let c = 1; c < W - 1; c++) {
      const id = world.tiles[r * W + c], td = KF.TileById[id];
      if (!td || !(td.solid || td.oneWay)) continue;
      const x = c * T, y = r * T, h = hash(c, r, def.index + 9);
      const above = KF.TileById[world.tileId(c, r - 1)];
      const exposed = !above || !(above.solid || above.oneWay);
      if (td.solid) {
        ctx.globalAlpha = material === 'print' ? .36 : .28;
        if (h > .28) {
          rect(ctx, p[0], x + 2 + Math.floor(h * 5), y + 6, 3, 1);
          rect(ctx, p[2], x + 9, y + 10 + Math.floor(h * 2), 2, 1);
        }
        if (h > .72) {
          line(ctx, p[0], x + 4, y + 2, x + 7, y + 7);
          line(ctx, p[2], x + 7, y + 7, x + 6, y + 12);
        }
      }
      if (exposed) {
        ctx.globalAlpha = material === 'circuit' ? .65 : .48;
        rect(ctx, p[2], x + 1, y, 14, 1);
        rect(ctx, p[0], x + 2, y + 3, 11, 1);
        if (material === 'metal' || material === 'circuit') {
          rect(ctx, p[0], x + 1, y + 1, 2, 2); rect(ctx, p[0], x + 13, y + 1, 2, 2);
          if (c % 3 === 0) { rect(ctx, p[3], x + 6, y + 1, 3, 1); rect(ctx, p[2], x + 7, y + 2, 1, 2); }
        } else if (c % 2 === 0) {
          rect(ctx, p[2], x + 3, y + 2, 4, 1); rect(ctx, p[0], x + 11, y + 3, 2, 1);
        }
        if (td.oneWay && c % 3 === (def.index + 1) % 3) {
          ctx.globalAlpha = .5;
          rect(ctx, p[0], x + 3, y + 4, 2, 8);
          line(ctx, p[2], x + 4, y + 11, x + 12, y + 5);
          rect(ctx, p[3], x + 11, y + 5, 2, 2);
        }
        if (h > .57 && !nearDoor(x, y) && world.tileId(c, r - 1) === 0) {
          ctx.globalAlpha = .68;
          if (material === 'nature' || material === 'print') {
            rect(ctx, p[4], x + 5, y - 4, 1, 4);
            rect(ctx, p[4], x + 4, y - 5, 2, 2);
            rect(ctx, p[5], x + 10, y - 3, 2, 2);
          } else if (material === 'masonry') {
            rect(ctx, p[0], x + 4, y - 3, 7, 3);
            rect(ctx, p[2], x + 5, y - 3, 4, 1);
          } else if (material === 'circuit') {
            rect(ctx, p[0], x + 6, y - 5, 4, 5);
            rect(ctx, p[5], x + 7, y - 4, 2, 2);
          } else {
            rect(ctx, p[0], x + 4, y - 3, 9, 3);
            for (let k = 0; k < 3; k++) rect(ctx, p[2], x + 5 + k * 3, y - 2, 1, 1);
          }
        }
        if (c % 11 === (def.index * 3 + 2) % 11 && !nearDoor(x, y) && world.tileId(c, r - 1) === 0) {
          ctx.globalAlpha = .62;
          if (material === 'metal' || material === 'circuit') {
            rect(ctx, p[0], x + 3, y - 10, 11, 10);
            rect(ctx, p[2], x + 4, y - 9, 9, 2);
            rect(ctx, material === 'circuit' ? p[5] : p[3], x + 6, y - 5, 5, 3);
            rect(ctx, p[0], x + 1, y - 1, 15, 1);
          } else if (material === 'masonry') {
            rect(ctx, p[0], x + 5, y - 12, 2, 12);
            rect(ctx, p[3], x + 7, y - 11, 8, 7);
            rect(ctx, p[2], x + 8, y - 10, 6, 1);
          } else {
            rect(ctx, p[0], x + 7, y - 10, 1, 10);
            rect(ctx, p[4], x + 2, y - 11, 12, 6);
            rect(ctx, p[2], x + 4, y - 10, 8, 2);
            rect(ctx, p[5], x + 11, y - 8, 2, 2);
          }
        }
      }
      if (td.solid && c % 4 === def.index && h > .38 && !world.visualSolid(c - 1, r)) {
        ctx.globalAlpha = .47;
        rect(ctx, p[0], x + 1, y + 2, 2, 11);
        rect(ctx, p[2], x + 2, y + 3, 1, 8);
      }
    }
    ctx.restore();
  }

  KF.Scenery = { draw, bake, profile };
})(window.KF);
