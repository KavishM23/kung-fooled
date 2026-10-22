'use strict';
// Drawing the stage: baked tile layer, traps, door, signs, the fighter, and the F1 hitbox overlay.
(function (KF) {
  const T = KF.TILE, U = KF.util;
  const R = (ctx, c, x, y, w = 1, h = 1) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  const thumbs = {};
  // Marching dashed outline: how the blueprint world shows things that are not built yet.
  function dashed(ctx, x, y, w, h, c, t) {
    const o = Math.floor(t * 8) % 4;
    for (let i = -o; i < w; i += 4) { const a = Math.max(0, i), b = Math.min(w, i + 2); if (b > a) { R(ctx, c, x + a, y, b - a, 1); R(ctx, c, x + a, y + h - 1, b - a, 1); } }
    for (let i = -o; i < h; i += 4) { const a = Math.max(0, i), b = Math.min(h, i + 2); if (b > a) { R(ctx, c, x, y + a, 1, b - a); R(ctx, c, x + w - 1, y + a, 1, b - a); } }
  }

  function edgesAt(world, c, r) {
    // depth: tiles of the same kind stacked above this one (lets themes draw e.g. train livery bands)
    let d = 0;
    const id = world.visualId(c, r);
    while (d < 8 && r - d - 1 >= 0 && world.visualId(c, r - d - 1) === id) d++;
    return { t: !world.visualSolid(c, r - 1), b: !world.visualSolid(c, r + 1), l: !world.visualSolid(c - 1, r), r: !world.visualSolid(c + 1, r), d };
  }
  function drawTile(ctx, world, theme, c, r, id, x, y) {
    const td = KF.TileById[id];
    if (!td) return;
    if (td.spike) { if (theme.spike) theme.spike(ctx, x, y, td.spike); else KF.blit(ctx, KF.Art.spikes[td.spike], x, y); }
    else theme.tile(ctx, x, y, td.art, edgesAt(world, c, r), U.hash2(c, r));
  }

  KF.Render = {
    drawTile,

    // Static tiles baked into one canvas per attempt (trap-owned tiles are drawn live instead).
    bakeStage(world, theme, res = KF.RES) {
      const c = KF.makeHi(world.pixelW, world.pixelH, res), ctx = c.getContext('2d');
      if (res > KF.RES) ctx.imageSmoothingEnabled = true;
      for (let r = 0; r < world.rows; r++) for (let col = 0; col < world.cols; col++) {
        const id = world.tiles[r * world.cols + col];
        if (id) drawTile(ctx, world, theme, col, r, id, col * T, r * T);
      }
      if (theme.id !== 'superhot_atrium') KF.Render.detail(c, world);
      return c;
    },

    // Hi-res detail pass: a fine, deterministic grain over solid tiles (one real pixel at a time),
    // so materials read as stone, brick and wood instead of flat blocks. Hazards stay clean.
    detail(c, world) {
      const x = c.getContext('2d'), W = c.width, H = c.height, res = c.res || 1;
      const img = x.getImageData(0, 0, W, H), d = img.data;
      for (let py = 0; py < H; py++) {
        const r = Math.floor(py / res / T);
        for (let px = 0; px < W; px++) {
          const o = (py * W + px) * 4;
          if (!d[o + 3]) continue;
          const td = KF.TileById[world.visualId(Math.floor(px / res / T), r)];
          if (!td || !td.solid) continue;
          let h = (px * 374761393 + py * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177);
          const k = 1 + (((h >>> 8) & 255) / 255 - 0.5) * 0.14;
          d[o] = Math.min(255, d[o] * k); d[o + 1] = Math.min(255, d[o + 1] * k); d[o + 2] = Math.min(255, d[o + 2] * k);
        }
      }
      x.putImageData(img, 0, 0);
    },

    // 3D mode: give every solid tile (and moving block) visible depth toward a vanishing point.
    extrude(ctx, stage, theme, cam) {
      const w = stage.world, col = theme.cube || { top: '#c8c0b0', side: '#5a5450', under: '#34302c', edge: '#1a1614' };
      const VX = KF.VIEW_W / 2, VY = KF.VIEW_H * 0.42, K = 0.13;
      const back = (x, y) => [x + (VX - x) * K, y + (VY - y) * K];
      const faces = [];
      const box = (x0, y0, x1, y1, open) => {
        const [bx0, by0] = back(x0, y0), [bx1, by1] = back(x1, y1);
        if (open.t && y0 > VY) faces.push([col.top, [[x0, y0], [x1, y0], [bx1, by0], [bx0, by0]], y0]);
        if (open.b && y1 < VY) faces.push([col.under, [[x0, y1], [x1, y1], [bx1, by1], [bx0, by1]], -y1]);
        if (open.l && x0 > VX) faces.push([col.side, [[x0, y0], [x0, y1], [bx0, by1], [bx0, by0]], x0]);
        if (open.r && x1 < VX) faces.push([col.side, [[x1, y0], [x1, y1], [bx1, by1], [bx1, by0]], -x1]);
      };
      const c0 = Math.max(0, Math.floor(cam.x / T) - 2), c1 = Math.min(w.cols - 1, Math.floor((cam.x + KF.VIEW_W) / T) + 2);
      const solid = (c, r) => { const td = KF.TileById[w.tileId(c, r)]; return !!(td && td.solid); };
      for (let r = 0; r < w.rows; r++) for (let c = c0; c <= c1; c++) {
        if (!solid(c, r)) continue;
        const x0 = c * T - cam.x, y0 = r * T - cam.y;
        box(x0, y0, x0 + T, y0 + T, { t: !solid(c, r - 1), b: !solid(c, r + 1), l: !solid(c - 1, r), r: !solid(c + 1, r) });
      }
      for (const s of w.dynamicSolids) if (s.active !== false) box(s.x - cam.x, s.y - cam.y, s.x + s.w - cam.x, s.y + s.h - cam.y, { t: 1, b: 1, l: 1, r: 1 });
      faces.sort((a, b) => Math.abs(b[2]) - Math.abs(a[2]));
      ctx.lineWidth = 0.5; ctx.strokeStyle = col.edge;
      for (const [fill, pts] of faces) {
        ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < 4; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    },

    zones(ctx, stage, theme, cam, t) {
      for (const tr of stage.traps) {
        if (tr instanceof KF.Traps.types.wind) {
          const r = tr.rect, x = r.x - cam.x, y = r.y - cam.y, dir = Math.sign(tr.def.force);
          ctx.globalAlpha = 0.08; R(ctx, '#d8f0ff', x, y, r.w, r.h);
          if (tr.blowing) {
            ctx.globalAlpha = 0.55;
            for (let i = 0; i < r.h / 5; i++) {
              const sx = ((i * 37 + t * 260 * dir) % r.w + r.w) % r.w;
              R(ctx, '#ffffff', Math.round(x + sx), Math.round(y + 3 + i * 5), 7 + (i % 3) * 3, 1);
            }
          }
          ctx.globalAlpha = 1;
          continue;
        }
        if (!(tr instanceof KF.Traps.types.gravity || tr instanceof KF.Traps.types.reverse) || !tr.fired) continue;
        if (!tr.seen) { if (stage.rule && stage.rule.reveal) dashed(ctx, tr.rect.x - cam.x, tr.rect.y - cam.y, tr.rect.w, tr.rect.h, '#ffd0ff', t); continue; }
        const r = tr.rect, x = r.x - cam.x, y = r.y - cam.y;
        const grav = tr instanceof KF.Traps.types.gravity;
        const col = grav ? theme.zone.gravity : theme.zone.reverse;
        ctx.globalAlpha = 0.13 + 0.04 * Math.sin(t * 4);
        R(ctx, col, x, y, r.w, r.h);
        ctx.globalAlpha = 0.6;
        for (let i = 0; i < r.w; i += 4) { if ((i / 4 + Math.floor(t * 8)) % 2) { R(ctx, col, x + i, y, 2, 1); R(ctx, col, x + i, y + r.h - 1, 2, 1); } }
        for (let i = 0; i < r.h; i += 4) { if ((i / 4 + Math.floor(t * 8)) % 2) { R(ctx, col, x, y + i, 1, 2); R(ctx, col, x + r.w - 1, y + i, 1, 2); } }
        ctx.globalAlpha = 0.45;
        if (grav) { // chevrons drifting in the gravity direction
          const dir = tr.g;
          for (let cx = 4; cx < r.w - 4; cx += 12) for (let k = 0; k < r.h; k += 18) {
            const yy = y + ((k + (dir < 0 ? -1 : 1) * t * 30) % r.h + r.h) % r.h;
            for (let j = 0; j < 4; j++) { const dy = dir < 0 ? 3 - j : j; R(ctx, '#ffffff', x + cx + j, yy + dy); R(ctx, '#ffffff', x + cx + 7 - j, yy + dy); }
          }
        } else {
          for (let k = 6; k < r.h - 6; k += 20) KF.Font.draw(ctx, Math.floor(t * 2) % 2 ? '<>' : '><', x + r.w / 2, y + k, '#ffffff', 1, 'center');
        }
        ctx.globalAlpha = 1;
      }
    },

    // A small still of a theme (and optionally the style's pixel pass), for menus. Cached.
    thumb(themeId, w, h, styleId) {
      const key = themeId + '|' + w + 'x' + h + '|' + (styleId || '');
      thumbs[key] = thumbs[key] || (() => {
        const VW = KF.VIEW_W, VH = KF.VIEW_H, big = KF.makeHi(VW, VH, KF.RES, true), bx = big.getContext('2d');
        const th = KF.Themes.get(themeId);
        bx.fillStyle = th.bg; bx.fillRect(0, 0, VW, VH);
        th.background(bx, { x: 120, y: 0 }, 3.3, { cheer: 0 });
        for (let x = 0; x < VW; x += 16) for (let r = 0; r < 3; r++) th.tile(bx, x, 168 + r * 16, 'solid', { t: r === 0 }, U.hash2(x, r + 3));
        const style = styleId && KF.Styles.get(styleId);
        if (style && style.post) KF.Styles.post(style, big, KF.Styles.info(3.3, 1, KF.RES, VW / 2, 150, 200));
        const c = KF.makeHi(w, h), x = c.getContext('2d');
        x.imageSmoothingEnabled = true; x.drawImage(big, 0, 0, w, h);
        return c;
      })();
      return thumbs[key];
    },

    traps(ctx, stage, theme, cam, t) {
      const world = stage.world, types = KF.Traps.types;
      const reveal = stage.rule && stage.rule.reveal;
      for (const tr of stage.traps) {
        const shake = tr.warning ? (Math.floor(t * 60) % 2 ? 1 : -1) : 0;
        if (reveal && !tr.fired && tr.rect && (tr instanceof types.collapse || tr instanceof types.spikes || tr instanceof types.fakeFloor)) {
          dashed(ctx, tr.rect.x - cam.x, tr.rect.y - cam.y, tr.rect.w, tr.rect.h, '#ff8a8a', t);
        }
        if (tr instanceof types.collapse) {
          if (tr.drop > 260) continue;
          for (const [c, r, id] of tr.tiles) drawTile(ctx, world, theme, c, r, id, c * T - cam.x + shake, Math.round(r * T + tr.drop - cam.y));
        } else if (tr instanceof types.crusher || tr instanceof types.mover) {
          const b = tr instanceof types.crusher ? tr.body : tr.solid;
          const ox = b.x - tr.home.x, oy = b.y - tr.home.y;
          for (const [c, r, id] of tr.tiles) drawTile(ctx, world, theme, c, r, id, Math.round(c * T + ox - cam.x + shake), Math.round(r * T + oy - cam.y));
          if (tr instanceof types.crusher && (tr.falling || tr.landed)) { // angry eyebrows on the block
            const ex = Math.round(b.x - cam.x + b.w / 2), ey = Math.round(b.y - cam.y + b.h - 10);
            R(ctx, '#1a1020', ex - 7, ey, 4, 3); R(ctx, '#1a1020', ex + 3, ey, 4, 3);
            R(ctx, '#ffffff', ex - 6, ey + 1, 2, 1); R(ctx, '#ffffff', ex + 4, ey + 1, 2, 1);
            R(ctx, '#1a1020', ex - 8, ey - 2, 5, 1); R(ctx, '#1a1020', ex + 3, ey - 2, 5, 1);
          }
        } else if (tr instanceof types.movingSpikes) {
          const x0 = tr.home.x - cam.x, y0 = tr.home.y - cam.y;
          const x1 = x0 + tr.travel[0] * T, y1 = y0 + tr.travel[1] * T;
          ctx.strokeStyle = 'rgba(230,235,238,0.45)'; ctx.lineWidth = 0.6;
          ctx.setLineDash([2, 2]); ctx.beginPath(); ctx.moveTo(x0 + 8, y0 + 14); ctx.lineTo(x1 + 8, y1 + 14); ctx.stroke(); ctx.setLineDash([]);
          for (let i = 0; i < tr.home.w; i += T) {
            const x = Math.round(tr.x + i - cam.x), y = Math.round(tr.y - cam.y);
            if (theme.spike) theme.spike(ctx, x, y, 'up');
            else KF.blit(ctx, KF.Art.spikes.up, x, y);
            R(ctx, '#444950', x + 2, y + 15, 12, 1);
          }
        } else if (tr instanceof types.pulseBeam) {
          const b = tr.rect, x = b.x - cam.x, y = b.y - cam.y;
          const id = theme.id;
          const color = id.startsWith('oldtv') ? '#efe4c8' : id.startsWith('comic') ? '#ffe66b'
            : id.includes('gameboy') ? '#9bbc0f' : id.includes('nes8bit') ? '#f83800'
              : id.startsWith('woodblock') ? '#c44830' : id.startsWith('vhs') ? '#ff9a79'
                : id.startsWith('vapor') ? '#f982df' : id.startsWith('cyber') || id.startsWith('superhot') ? '#8decf4'
                  : id.startsWith('argo') ? '#91e9b7' : '#fb4e78';
          ctx.save();
          ctx.globalAlpha = tr.active ? 0.2 : tr.warn ? 0.3 : 0.09;
          R(ctx, color, x - 4, y, b.w + 8, b.h);
          ctx.globalAlpha = tr.active ? 0.92 : tr.warn && Math.floor(t * 12) % 2 ? 0.6 : 0.2;
          R(ctx, color, x, y, b.w, b.h);
          R(ctx, '#ffffff', x + b.w / 2 - 0.35, y, 0.7, b.h);
          ctx.globalAlpha = 1;
          R(ctx, '#55565a', x - 2, y - 2, b.w + 4, 2);
          R(ctx, '#55565a', x - 2, y + b.h, b.w + 4, 2);
          ctx.restore();
        } else if (tr instanceof types.conveyor) {
          const b = tr.rect, x = Math.round(b.x - cam.x), y = Math.round(b.y - cam.y);
          const dir = Math.sign(tr.def.speed || 75);
          const accent = theme.id.includes('woodblock') ? '#d37a48' : theme.id.includes('vapor') ? '#fa66db' : '#79dce5';
          R(ctx, '#172026', x, y, b.w, 5);
          R(ctx, accent, x, y, b.w, 1);
          const shift = ((t * Math.abs(tr.def.speed || 75) / 12) % 8 + 8) % 8;
          ctx.save(); ctx.beginPath(); ctx.rect(x, y + 1, b.w, 3); ctx.clip();
          ctx.strokeStyle = accent; ctx.lineWidth = 0.8;
          for (let i = -8; i < b.w + 8; i += 8) {
            const xx = x + i + (dir > 0 ? shift : -shift);
            ctx.beginPath(); ctx.moveTo(xx - dir * 2, y + 1.4); ctx.lineTo(xx + dir * 2, y + 2.5);
            ctx.lineTo(xx - dir * 2, y + 3.6); ctx.stroke();
          }
          ctx.restore();
        } else if (tr instanceof types.dartLauncher) {
          const b = tr.rect, x = Math.round(b.x - cam.x), y = Math.round(b.y - cam.y);
          const accent = theme.id.includes('comic') ? '#ffe66b' : theme.id.includes('vhs') ? '#ff805d' : '#9becff';
          ctx.save(); ctx.globalAlpha = 0.38;
          for (let i = 12; i < tr.range; i += 12) R(ctx, accent, x + 8 + tr.dir * i, y + 2, 3, 1);
          ctx.restore();
          R(ctx, accent, x + 1, y - 1, 14, 10);
          R(ctx, '#10151a', x + 2, y, 12, 8);
          R(ctx, '#7d888e', x + 3, y + 1, 10, 1);
          R(ctx, accent, x + (tr.warn ? 4 : 6), y + 3, tr.warn ? 7 : 3, 3);
          R(ctx, '#b3c1c5', x + (tr.dir < 0 ? 0 : 12), y + 2, 4, 3);
          const dart = tr.dart;
          if (dart) {
            const dx = dart.x - cam.x, dy = dart.y - cam.y;
            R(ctx, '#1c2327', dx, dy, dart.w, dart.h);
            R(ctx, accent, dx + (tr.dir < 0 ? 4 : 0), dy, 2, 1);
            R(ctx, '#dce7e8', dx + (tr.dir < 0 ? 0 : 4), dy + 1, 2, 1);
          }
        } else if (tr instanceof types.spikes) {
          if (!tr.fired) continue;
          const off = Math.round((1 - tr.raise) * 16);
          const d = { up: [0, off], down: [0, -off], left: [off, 0], right: [-off, 0] }[tr.dir];
          for (const [c, r] of tr.cells) {
            ctx.save(); ctx.beginPath(); ctx.rect(c * T - cam.x, r * T - cam.y, T, T); ctx.clip();
            if (theme.spike) theme.spike(ctx, c * T - cam.x + d[0], r * T - cam.y + d[1], tr.dir);
            else KF.blit(ctx, KF.Art.spikes[tr.dir], c * T - cam.x + d[0], r * T - cam.y + d[1]);
            ctx.restore();
          }
        } else if (tr instanceof types.spring) {
          (theme.spring || KF.Art.spring)(ctx, tr.rect.x - 2 - cam.x, tr.rect.y - 9 - cam.y, tr.squash);
        } else if (tr instanceof types.shy) {
          const s = tr.solid, x = Math.round(s.x - cam.x), y = Math.round(s.y - cam.y);
          for (let i = 0; i < s.w; i += T) theme.tile(ctx, x + i, y, 'oneway', {}, 0.3);
          R(ctx, '#1a1020', x, y + 4, s.w, 4); R(ctx, '#4a3a30', x + 1, y + 4, s.w - 2, 3);
          if (tr.fired) { // once it has fled, it gets nervous little eyes
            const px = stage.player.centerX > s.x + s.w / 2 ? 1 : -1;
            const ex = x + s.w / 2 - 4;
            R(ctx, '#ffffff', ex, y + 4, 3, 3); R(ctx, '#ffffff', ex + 6, y + 4, 3, 3);
            R(ctx, '#1a1020', ex + 1 + px, y + 5, 1, 2); R(ctx, '#1a1020', ex + 7 + px, y + 5, 1, 2);
            if (tr.moving) { R(ctx, '#ff8ab0', ex - 3, y + 6, 2, 1); R(ctx, '#ff8ab0', ex + 10, y + 6, 2, 1); }
          }
        } else if (tr instanceof types.fakeDoor) {
          const r = tr.rect;
          (theme.door || KF.Art.door)(ctx, r.x - cam.x, r.y - cam.y, { lantern: false, open: tr.fired ? 1 : 0, t });
          if (tr.fired) KF.Art.glove(ctx, r.x - cam.x + (tr.dirX > 0 ? 12 : 4), r.y - cam.y + 16, tr.dirX, Math.min(1, tr.fireT * 12));
        } else if (tr instanceof types.lureFloor) {
          const r = tr.rect, x = r.x - cam.x, y = r.y - cam.y;
          if (tr.mode !== 'gone') {
            const shakeX = tr.mode === 'warning' && Math.floor(t * 18) % 2 ? 0.5 : 0;
            for (const [c, row, id] of tr.tiles) drawTile(ctx, world, theme, c, row, id, c * T - cam.x + shakeX, row * T - cam.y);
            if (tr.mode === 'warning') {
              ctx.save(); ctx.globalAlpha = 0.7;
              for (let i = 4; i < r.w; i += 11) {
                R(ctx, '#ffe292', x + i, y + 1, 4, 1);
                R(ctx, '#19151b', x + i + 3, y + 2, 1, 3);
              }
              ctx.restore();
            }
          } else {
            ctx.save(); ctx.globalAlpha = 0.35;
            for (let i = 0; i < r.w; i += 5) R(ctx, '#ffe292', x + i, y, 3, 1);
            ctx.restore();
          }
        } else if (tr instanceof types.fakeFloor) {
          // Drawn exactly like real floor until you've found it; then a ghost outline.
          if (tr.seen) ctx.globalAlpha = 0.3;
          for (const [c, r, id] of tr.tiles) drawTile(ctx, world, theme, c, r, id, c * T - cam.x, r * T - cam.y);
          ctx.globalAlpha = 1;
          if (tr.seen) {
            const r = tr.rect, x = r.x - cam.x, y = r.y - cam.y;
            for (let i = 0; i < r.w; i += 4) { R(ctx, '#ffffff', x + i, y, 2, 1); }
            KF.Font.draw(ctx, '?', x + r.w / 2, y + 4, '#ffffff', 1, 'center');
          }
        } else if (tr instanceof types.blink) {
          const s = tr.solid, x = Math.round(s.x - cam.x), y = Math.round(s.y - cam.y);
          if (s.active && !(tr.warn && Math.floor(t * 20) % 2)) {
            for (let i = 0; i < s.w; i += T) theme.tile(ctx, x + i, y, 'oneway', {}, 0.7);
            R(ctx, '#7cf0ff', x, y + 4, s.w, 1);
            ctx.globalAlpha = 0.25; R(ctx, '#7cf0ff', x, y - 2, s.w, 2); ctx.globalAlpha = 1;
          } else {
            ctx.globalAlpha = 0.5;
            for (let i = 0; i < s.w; i += 3) R(ctx, '#7cf0ff', x + i, y, 1, 1);
            ctx.globalAlpha = 1;
          }
        } else if (tr instanceof types.swingHammer) {
          const pv = tr.pivot, b = tr.blade(), a = tr.angle;
          const px = pv.x - cam.x, py = pv.y - cam.y, bx = b.x - cam.x + 9, by = b.y - cam.y + 9;
          ctx.strokeStyle = '#9ba4a8'; ctx.lineWidth = 1.8;
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(bx, by); ctx.stroke();
          R(ctx, '#171b20', px - 3, py - 3, 6, 6);
          ctx.save(); ctx.translate(bx, by); ctx.rotate(a);
          ctx.fillStyle = '#151a20';
          for (let i = 0; i < 8; i++) {
            ctx.rotate(Math.PI / 4);
            ctx.beginPath(); ctx.moveTo(-3, -6); ctx.lineTo(0, -13); ctx.lineTo(3, -6); ctx.fill();
          }
          ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#aab6ba'; ctx.beginPath(); ctx.arc(-2, -2, 4, 0, Math.PI * 2); ctx.fill();
          R(ctx, '#ffe292', -4, -4, 2, 2);
          ctx.restore();
        } else if (tr instanceof types.lookSaw) {
          const b = tr.body, x = b.x - cam.x + 6, y = b.y - cam.y + 6;
          ctx.save(); ctx.translate(x, y); ctx.rotate(t * (tr.awake ? 9 : 2));
          ctx.fillStyle = '#252a31';
          for (let i = 0; i < 8; i++) {
            ctx.rotate(Math.PI / 4);
            ctx.beginPath(); ctx.moveTo(-2, -4); ctx.lineTo(0, -8); ctx.lineTo(2, -4); ctx.fill();
          }
          ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = tr.awake ? '#ff674d' : '#e4d4ac';
          ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        } else if (tr instanceof types.axe) {
          const pv = tr.pivot, b = tr.blade(), a = tr.angle;
          const px = pv.x - cam.x, py = pv.y - cam.y;
          for (let k = 0; k < tr.len; k += 4) R(ctx, k % 8 ? '#5a5e6a' : '#9aa0ae', Math.round(px + Math.sin(a) * k) - 1, Math.round(py + Math.cos(a) * k) - 1, 2, 2);
          R(ctx, '#1a1020', px - 3, py - 3, 6, 6); R(ctx, '#7a7f8a', px - 2, py - 2, 4, 4);
          const bx = Math.round(b.x - cam.x), by = Math.round(b.y - cam.y);
          ctx.fillStyle = '#1a1020'; ctx.beginPath(); ctx.arc(bx + 7, by + 6, 8, 0, 7); ctx.fill();
          ctx.fillStyle = '#d8e0ec'; ctx.beginPath(); ctx.arc(bx + 7, by + 6, 7, 0, 7); ctx.fill();
          ctx.fillStyle = '#8a94a8'; ctx.beginPath(); ctx.arc(bx + 7, by + 6, 4, 0, 7); ctx.fill();
          R(ctx, '#ff4a3a', bx + 6, by + 5, 3, 3);
        } else if (tr instanceof types.hidden) {
          if (!tr.fired) { if (stage.rule && stage.rule.reveal) dashed(ctx, tr.rect.x - cam.x, tr.rect.y - cam.y, tr.rect.w, tr.rect.h, '#ffffff', t); continue; }
          for (let i = 0; i < tr.rect.w; i += T) theme.tile(ctx, tr.rect.x + i - cam.x, tr.rect.y - cam.y - Math.round(tr.popT * 4), 'alt', { t: true, b: true, l: i === 0, r: i + T >= tr.rect.w }, 0.5);
        } else if (tr instanceof types.ambushFlame && tr.fired && tr.col !== null) {
          const x = tr.col * T - cam.x, fy = tr.floorY - cam.y;
          if (tr.t < tr.warnT) { // the vent glows where it thinks you'll land
            ctx.globalAlpha = 0.5 + 0.5 * (Math.floor(t * 24) % 2); R(ctx, '#ff7a20', x + 2, fy - 3, T - 4, 3); ctx.globalAlpha = 1;
            R(ctx, '#2a1408', x + 1, fy - 1, T - 2, 1);
          } else if (tr.burning) {
            const f = tr.flameRect(), h = f.h * Math.min(1, (tr.t - tr.warnT) / 0.08);
            const g = ctx.createLinearGradient(0, fy - h, 0, fy);
            g.addColorStop(0, 'rgba(255,240,140,0)'); g.addColorStop(0.35, '#ffd040'); g.addColorStop(1, '#ff4a10');
            ctx.fillStyle = g;
            for (let k = 0; k < 3; k++) {
              const wob = Math.sin(t * 30 + k * 2) * 2;
              ctx.beginPath(); ctx.moveTo(x + 2 + k * 4, fy); ctx.quadraticCurveTo(x + 4 + k * 4 + wob, fy - h * 0.6, x + 6 + k * 3 + wob, fy - h * (0.75 + 0.25 * ((k + 1) % 2)));
              ctx.quadraticCurveTo(x + 8 + k * 4 - wob, fy - h * 0.4, x + 10 + k * 3, fy); ctx.closePath(); ctx.fill();
            }
          }
        }
      }
    },

    // Water, drawn over the world (and you): a tinted body, a moving surface line, bubbles.
    water(ctx, stage, cam, t) {
      for (const tr of stage.traps) {
        if (!(tr instanceof KF.Traps.types.water)) continue;
        const r = tr.rect, x = r.x - cam.x, y = r.y - cam.y;
        if (x > KF.VIEW_W || x + r.w < 0 || y > KF.VIEW_H || y + r.h < 0) continue;
        const g = ctx.createLinearGradient(0, y, 0, y + r.h);
        g.addColorStop(0, 'rgba(60,170,230,0.30)'); g.addColorStop(1, 'rgba(10,40,110,0.55)');
        ctx.fillStyle = g; ctx.fillRect(x, y + 3, r.w, r.h - 3);
        ctx.strokeStyle = 'rgba(200,240,255,0.85)'; ctx.lineWidth = 1; ctx.beginPath();
        for (let i = 0; i <= r.w; i += 4) { const yy = y + 3 + Math.sin(t * 3 + (r.x + i) * 0.15) * 1.2; i ? ctx.lineTo(x + i, yy) : ctx.moveTo(x + i, yy); }
        ctx.stroke();
        ctx.fillStyle = 'rgba(220,250,255,0.6)';
        for (let k = 0; k < r.w / 24; k++) { // bubbles drift up
          const bx = x + ((k * 53) % r.w), by = y + r.h - ((t * 18 + k * 37) % (r.h - 6));
          ctx.beginPath(); ctx.arc(bx + Math.sin(t * 2 + k) * 2, by, 1 + (k % 2), 0, 7); ctx.fill();
        }
      }
    },

    // Backdrops for the parts of a level below or inside things, in world space, drawn over the
    // sky so going down feels like going somewhere. def.depths: [{ r0, r1, c0, c1, kind }],
    // kind: 'underground' | 'interior' | 'sea' | 'catacomb' | 'mine' | 'subway' | 'cave' | 'backstage'.
    depths(ctx, stage, cam, t) {
      for (const d of stage.def.depths || []) {
        const x0 = (d.c0 || 0) * T - cam.x, x1 = (d.c1 !== undefined ? d.c1 * T : stage.world.pixelW) - cam.x;
        const y0 = d.r0 * T - cam.y, y1 = (d.r1 !== undefined ? d.r1 * T : stage.world.pixelH) - cam.y;
        if (x1 < 0 || x0 > KF.VIEW_W || y1 < 0 || y0 > KF.VIEW_H) continue;
        const w = x1 - x0, h = y1 - y0;
        ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
        if (d.kind === 'sea') {
          const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, '#0e4a78'); g.addColorStop(1, '#020c22');
          ctx.fillStyle = g; ctx.fillRect(x0, y0, w, h);
          ctx.globalAlpha = 0.12; ctx.fillStyle = '#bfefff';
          for (let k = 0; k < 6; k++) { const rx = x0 + ((k * 97 - cam.x * 0.3) % (w + 60) + w + 60) % (w + 60) - 30; ctx.beginPath(); ctx.moveTo(rx, y0); ctx.lineTo(rx + 14, y0); ctx.lineTo(rx + 40, y1); ctx.lineTo(rx + 20, y1); ctx.fill(); }
          ctx.globalAlpha = 0.5; ctx.fillStyle = '#04182e';
          for (let k = 0; k < w / 22; k++) { const sx = x0 + k * 22 + ((k * 7) % 9), sh = 18 + (k * 13) % 26; ctx.beginPath(); ctx.moveTo(sx, y1); ctx.quadraticCurveTo(sx + 6 + Math.sin(t * 1.5 + k) * 4, y1 - sh / 2, sx + 2, y1 - sh); ctx.lineTo(sx + 5, y1); ctx.fill(); }
          ctx.globalAlpha = 1;
        } else if (d.kind === 'interior') {
          ctx.fillStyle = '#1a1630'; ctx.fillRect(x0, y0, w, h);
          ctx.fillStyle = '#231e3e';
          for (let px = x0 - ((cam.x * 0.5) % 48) - 48; px < x1; px += 48) ctx.fillRect(px + 4, y0, 40, h);
          for (let py = y0 + 18; py < y1; py += 48) { // lit office windows / ceiling strips
            ctx.fillStyle = 'rgba(120,240,255,0.18)'; ctx.fillRect(x0, py, w, 2);
            ctx.fillStyle = 'rgba(255,90,200,0.10)'; ctx.fillRect(x0, py + 24, w, 10);
          }
        } else if (d.kind === 'catacomb') { // stone blocks, skull niches, torches
          ctx.fillStyle = '#231c18'; ctx.fillRect(x0, y0, w, h);
          const ox = -((cam.x * 0.6) % 32);
          for (let py = y0 - ((cam.y * 0.6) % 16), k = 0; py < y1; py += 16, k++) for (let px = x0 + ox - 32 + (k % 2) * 16; px < x1; px += 32) {
            ctx.fillStyle = (Math.floor(px * 7 + py * 3) & 3) ? '#3a2f28' : '#33291f'; ctx.fillRect(px + 1, py + 1, 30, 14);
          }
          for (let px = x0 + 40 - ((cam.x * 0.6) % 128); px < x1; px += 128) {
            ctx.fillStyle = '#120d0a'; ctx.fillRect(px, y0 + 30, 22, 16);
            ctx.fillStyle = '#d8ccb0'; ctx.beginPath(); ctx.arc(px + 11, y0 + 38, 5, 0, 7); ctx.fill();
            ctx.fillStyle = '#120d0a'; ctx.fillRect(px + 8, y0 + 36, 2, 2); ctx.fillRect(px + 12, y0 + 36, 2, 2);
            const fl = 0.6 + 0.4 * Math.sin(t * 9 + px);
            ctx.fillStyle = `rgba(255,150,60,${0.18 * fl})`; ctx.beginPath(); ctx.arc(px + 64, y0 + 30, 20, 0, 7); ctx.fill();
            ctx.fillStyle = '#ffb040'; ctx.fillRect(px + 62, y0 + 24 - fl * 3, 4, 6 + fl * 3); ctx.fillStyle = '#5a4030'; ctx.fillRect(px + 63, y0 + 30, 2, 8);
          }
        } else if (d.kind === 'mine') { // rock, timber frames, lanterns, a rail
          const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, '#2c1e14'); g.addColorStop(1, '#120b07');
          ctx.fillStyle = g; ctx.fillRect(x0, y0, w, h);
          ctx.fillStyle = 'rgba(80,58,40,0.5)';
          for (let k = 0; k < w * h / 1800; k++) { const rx = x0 + ((k * 97 - cam.x * 0.5) % w + w) % w, ry = y0 + ((k * 61) % h); ctx.fillRect(rx, ry, 6 + (k % 3) * 3, 3); }
          for (let px = x0 + 20 - ((cam.x * 0.7) % 96); px < x1; px += 96) for (let py = y0 + 8 - ((cam.y * 0.7) % 64); py < y1; py += 64) {
            ctx.fillStyle = '#5a3a1e'; ctx.fillRect(px, py, 5, 50); ctx.fillRect(px + 40, py, 5, 50); ctx.fillRect(px - 4, py, 53, 6);
            ctx.fillStyle = '#7a5230'; ctx.fillRect(px, py, 2, 50); ctx.fillRect(px - 4, py, 53, 2);
            ctx.fillStyle = 'rgba(255,190,90,0.22)'; ctx.beginPath(); ctx.arc(px + 22, py + 14, 12, 0, 7); ctx.fill();
            ctx.fillStyle = '#ffd070'; ctx.fillRect(px + 20, py + 10, 4, 6);
          }
        } else if (d.kind === 'subway') { // tiled walls, a colour band, posters, strip lights
          ctx.fillStyle = '#d8dccc'; ctx.fillRect(x0, y0, w, h);
          ctx.fillStyle = 'rgba(60,70,60,0.18)';
          for (let px = x0 - ((cam.x * 0.8) % 8); px < x1; px += 8) ctx.fillRect(px, y0, 1, h);
          for (let py = y0; py < y1; py += 6) ctx.fillRect(x0, py, w, 1);
          ctx.fillStyle = '#c83a2a'; ctx.fillRect(x0, y0 + h * 0.45, w, 6);
          for (let px = x0 + 30 - ((cam.x * 0.8) % 140); px < x1; px += 140) {
            ctx.fillStyle = '#1a1a22'; ctx.fillRect(px - 1, y0 + h * 0.15 - 1, 32, 42);
            ctx.fillStyle = ['#ffd040', '#40a0e0', '#e04880'][Math.abs(Math.floor(px / 140)) % 3]; ctx.fillRect(px, y0 + h * 0.15, 30, 40);
          }
          ctx.fillStyle = 'rgba(255,255,230,0.9)'; for (let px = x0 + 10 - ((cam.x * 0.8) % 64); px < x1; px += 64) ctx.fillRect(px, y0 + 2, 28, 2);
        } else if (d.kind === 'cave') { // rock, stalactites, glowing crystals
          const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, '#1e2230'); g.addColorStop(1, '#0a0c14');
          ctx.fillStyle = g; ctx.fillRect(x0, y0, w, h);
          ctx.fillStyle = '#2c3244';
          for (let px = x0 - ((cam.x * 0.5) % 24); px < x1; px += 24) { const sh = 10 + (Math.abs(Math.floor(px)) * 7) % 18; ctx.beginPath(); ctx.moveTo(px, y0); ctx.lineTo(px + 12, y0); ctx.lineTo(px + 6, y0 + sh); ctx.fill(); }
          for (let px = x0 + 50 - ((cam.x * 0.6) % 110); px < x1; px += 110) for (let py = y0 + 60; py < y1; py += 90) {
            const glow = 0.5 + 0.5 * Math.sin(t * 2 + px * 0.1);
            ctx.fillStyle = `rgba(120,220,255,${0.12 + 0.1 * glow})`; ctx.beginPath(); ctx.arc(px, py, 14, 0, 7); ctx.fill();
            ctx.fillStyle = '#9af0ff'; ctx.beginPath(); ctx.moveTo(px - 4, py + 6); ctx.lineTo(px, py - 8); ctx.lineTo(px + 4, py + 6); ctx.fill();
          }
        } else if (d.kind === 'backstage') { // greys only: brick, ropes, sandbags, a work light
          ctx.fillStyle = '#2a2a2a'; ctx.fillRect(x0, y0, w, h);
          for (let py = y0 - ((cam.y * 0.6) % 12), k = 0; py < y1; py += 12, k++) for (let px = x0 - ((cam.x * 0.6) % 24) - 24 + (k % 2) * 12; px < x1; px += 24) {
            ctx.fillStyle = (Math.floor(px + py) & 2) ? '#363636' : '#313131'; ctx.fillRect(px + 1, py + 1, 22, 10);
          }
          ctx.strokeStyle = '#8a8a8a'; ctx.lineWidth = 1;
          for (let px = x0 + 24 - ((cam.x * 0.7) % 72); px < x1; px += 72) {
            ctx.beginPath(); ctx.moveTo(px, y0); ctx.lineTo(px, y0 + 70 + (Math.abs(Math.floor(px)) % 40)); ctx.stroke();
            ctx.fillStyle = '#5a5a5a'; ctx.fillRect(px - 5, y0 + 70 + (Math.abs(Math.floor(px)) % 40), 10, 12);
          }
          ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.beginPath(); ctx.moveTo(x0 + w * 0.6, y0); ctx.lineTo(x0 + w * 0.5, y1); ctx.lineTo(x0 + w * 0.8, y1); ctx.fill();
        } else { // underground: rock, pipes and the odd service light
          const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, '#18121c'); g.addColorStop(1, '#07050a');
          ctx.fillStyle = g; ctx.fillRect(x0, y0, w, h);
          ctx.strokeStyle = 'rgba(90,70,110,0.6)'; ctx.lineWidth = 3;
          for (let py = y0 + 24; py < y1; py += 52) { ctx.beginPath(); ctx.moveTo(x0, py); ctx.lineTo(x1, py); ctx.stroke(); }
          for (let px = x0 + 30 - ((cam.x * 0.6) % 120); px < x1; px += 120) {
            ctx.fillStyle = Math.floor(t * 2 + px) % 7 ? 'rgba(255,170,60,0.55)' : 'rgba(255,170,60,0.15)';
            ctx.beginPath(); ctx.arc(px, y0 + 10, 2.5, 0, 7); ctx.fill();
          }
        }
        ctx.restore();
      }
    },

    door(ctx, stage, cam, t, open = 0, theme = {}) {
      const d = stage.world.door;
      if (!d) return;
      const art = theme.door || KF.Art.door;
      stage.world.partDoors.forEach((partDoor, i) => {
        if (!partDoor) return;
        ctx.save();
        ctx.globalAlpha = i < stage.part - 1 ? 0.35 : i === stage.part - 1 ? 1 : 0.55;
        art(ctx, partDoor.x - cam.x, partDoor.y - cam.y, { lantern: true, open: i < stage.part - 1 ? 1 : 0, t });
        ctx.restore();
      });
      ctx.save();
      ctx.globalAlpha = stage.part === 3 ? 1 : 0.45;
      art(ctx, d.x - cam.x, d.y - cam.y, { lantern: true, open, t, legs: d.moving ? d.runT : 0, flipped: d.flipped });
      ctx.restore();
    },

    labels(ctx, def, theme, cam) {
      // A sign at [c, r] stands on the tile below r.
      for (const l of def.labels || []) (theme.sign || KF.Art.sign)(ctx, l.at[0] * T + 8 - cam.x, (l.at[1] + 1) * T - 18 - cam.y, l.text, theme);
    },

    // The fighter. pos = interpolated hitbox top-left in world space.
    player(ctx, p, pos, cam, opts = {}) {
      const cx = pos.x + p.w / 2 - cam.x;
      const flip = p.gravDir < 0;
      const feet = (flip ? pos.y : pos.y + p.h) - cam.y;
      const state = opts.state || (p.skidding && p.grounded ? 'skid' : p.state);
      if (opts.theme && opts.theme.drawPlayer) return opts.theme.drawPlayer(ctx, p, cx, feet, state, opts);
      const frame = KF.Sprites.pick(state, opts.t ?? p.stateT);
      const vl = KF.Vec.active();
      if (vl) { // smooth style: the same pose drawn as vector shapes
        const look = KF.Sprites.set.look, t = KF.engine.time;
        for (const g of opts.trail || []) {
          ctx.save(); ctx.translate(g.x - cam.x, g.y - cam.y); ctx.scale(g.facing < 0 ? -1 : 1, g.flip ? -1 : 1);
          KF.Vec.draw(ctx, g.frame.pose, look, { vlook: vl, tint: g.which === 'ghostA' ? '#38e8ff' : '#ff4fb8', alpha: g.a, noShadow: true });
          ctx.restore();
        }
        ctx.save(); ctx.translate(cx, feet); ctx.scale(p.facing < 0 ? -1 : 1, flip ? -1 : 1);
        KF.Vec.draw(ctx, frame.pose, look, { vlook: vl, flash: opts.flash, t, noShadow: flip || !p.grounded });
        ctx.restore();
        return frame;
      }
      for (const g of opts.trail || []) {
        ctx.globalAlpha = g.a;
        KF.Sprites.draw(ctx, g.frame, g.x - cam.x, g.y - cam.y, g.facing, g.flip, g.which);
      }
      ctx.globalAlpha = 1;
      KF.Sprites.draw(ctx, frame, cx, feet, p.facing, flip);
      if (opts.flash) { ctx.globalAlpha = opts.flash; KF.Sprites.draw(ctx, frame, cx, feet, p.facing, flip, 'flash'); ctx.globalAlpha = 1; }
      return frame;
    },

    // One figure (a sprite frame) with its feet at the current origin, pixel or vector to suit the
    // scene. opts: { set (default: the player's), dx, dy, flash, crystal }. Used for the K.O. tumble.
    figure(ctx, frame, opts = {}) {
      const set = opts.set || KF.Sprites.set, vl = KF.Vec.active();
      if (vl && frame.pose) {
        ctx.save(); ctx.translate(opts.dx || 0, opts.dy || 0);
        KF.Vec.draw(ctx, frame.pose, set.look, { vlook: vl, scale: set.W / KF.Sprites.BASE, flash: opts.flash, crystal: opts.crystal || set.crystal, noShadow: true });
        ctx.restore();
      } else {
        KF.Sprites.blit(ctx, frame, set, 'img', opts.dx || 0, opts.dy || 0);
        if (opts.flash > 0) { ctx.globalAlpha = Math.min(1, opts.flash); KF.Sprites.blit(ctx, frame, set, 'flash', opts.dx || 0, opts.dy || 0); ctx.globalAlpha = 1; }
      }
    },

    debug(ctx, scene, cam) {
      const { stage } = scene, world = stage.world, p = stage.player;
      const box = (r, col) => { ctx.strokeStyle = col; ctx.strokeRect(Math.round(r.x - cam.x) + 0.5, Math.round(r.y - cam.y) + 0.5, Math.max(0, r.w - 1), Math.max(0, r.h - 1)); };
      ctx.lineWidth = 1;
      const c0 = Math.max(0, Math.floor(cam.x / T)), c1 = Math.min(world.cols - 1, Math.floor((cam.x + KF.VIEW_W) / T));
      for (let r = 0; r < world.rows; r++) for (let c = c0; c <= c1; c++) {
        const td = world.tileDef(c, r);
        if (!td) continue;
        if (td.spike) box(KF.spikeRect(td.spike, c * T, r * T), 'rgba(255,0,255,0.95)');
        else box({ x: c * T, y: r * T, w: T, h: td.oneWay ? 3 : T }, td.oneWay ? 'rgba(255,220,0,0.9)' : 'rgba(255,60,60,0.6)');
      }
      for (const s of world.dynamicSolids) if (s.active !== false) box(s, 'rgba(255,140,0,0.95)');
      for (const tr of stage.traps) {
        if (tr.cells && tr.raise > 0.5) for (const [c, r] of tr.cells) box(KF.spikeRect(tr.dir, c * T, r * T), 'rgba(255,0,255,0.95)');
        if (tr.rect && (tr instanceof KF.Traps.types.gravity || tr instanceof KF.Traps.types.reverse)) box(tr.rect, 'rgba(160,120,255,0.9)');
        if (tr instanceof KF.Traps.types.spring || tr instanceof KF.Traps.types.fakeDoor) box(tr.rect, 'rgba(0,200,255,0.9)');
      }
      if (world.door) box(world.door, 'rgba(0,255,255,0.9)');
      box(p, '#00ff66');
      const lines = [
        `VX ${p.vx.toFixed(0)} VY ${p.vy.toFixed(0)} G ${p.gravDir}`,
        `${p.state} ${p.grounded ? 'GROUND' : 'AIR'}${p.reversed ? ' REV' : ''}`,
        `COYOTE ${Math.max(0, p.coyoteT * 1000).toFixed(0)}MS BUF ${Math.max(0, p.bufferT * 1000).toFixed(0)}MS`,
        `ATTEMPT ${stage.deaths + 1}  FPS ${scene.engine.fps.toFixed(0)}`,
      ];
      const by = KF.VIEW_H - 12 - lines.length * 9;
      ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(2, by - 3, 150, lines.length * 9 + 4);
      lines.forEach((l, i) => KF.Font.draw(ctx, l, 5, by + i * 9, '#7fff9f'));
    },
  };
})(window.KF);
