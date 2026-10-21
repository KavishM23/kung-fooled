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
      KF.Render.detail(c, world);
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
        }
      }
    },

    door(ctx, stage, cam, t, open = 0, theme = {}) {
      const d = stage.world.door;
      if (!d) return;
      (theme.door || KF.Art.door)(ctx, d.x - cam.x, d.y - cam.y, { lantern: true, open, t, legs: d.moving ? d.runT : 0, flipped: d.flipped });
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
      for (const g of opts.trail || []) {
        ctx.globalAlpha = g.a;
        KF.Sprites.draw(ctx, g.frame, g.x - cam.x, g.y - cam.y, g.facing, g.flip, g.which);
      }
      ctx.globalAlpha = 1;
      KF.Sprites.draw(ctx, frame, cx, feet, p.facing, flip);
      if (opts.flash) { ctx.globalAlpha = opts.flash; KF.Sprites.draw(ctx, frame, cx, feet, p.facing, flip, 'flash'); ctx.globalAlpha = 1; }
      return frame;
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
