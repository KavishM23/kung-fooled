'use strict';
// Drawing the stage: baked tile layer, traps, door, signs, the fighter, and the F1 hitbox overlay.
(function (KF) {
  const T = KF.TILE, U = KF.util;
  const R = (ctx, c, x, y, w = 1, h = 1) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

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
    if (td.spike) ctx.drawImage(KF.Art.spikes[td.spike], x, y);
    else theme.tile(ctx, x, y, td.art, edgesAt(world, c, r), U.hash2(c, r));
  }

  KF.Render = {
    drawTile,

    // Static tiles baked into one canvas per attempt (trap-owned tiles are drawn live instead).
    bakeStage(world, theme) {
      const c = KF.makeCanvas(world.pixelW, world.pixelH), ctx = c.getContext('2d');
      for (let r = 0; r < world.rows; r++) for (let col = 0; col < world.cols; col++) {
        const id = world.tiles[r * world.cols + col];
        if (id) drawTile(ctx, world, theme, col, r, id, col * T, r * T);
      }
      return c;
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
        if (!(tr instanceof KF.Traps.types.gravity || tr instanceof KF.Traps.types.reverse) || !tr.fired || !tr.seen) continue;
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

    traps(ctx, stage, theme, cam, t) {
      const world = stage.world, types = KF.Traps.types;
      for (const tr of stage.traps) {
        const shake = tr.warning ? (Math.floor(t * 60) % 2 ? 1 : -1) : 0;
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
            ctx.drawImage(KF.Art.spikes[tr.dir], c * T - cam.x + d[0], r * T - cam.y + d[1]);
            ctx.restore();
          }
        } else if (tr instanceof types.spring) {
          KF.Art.spring(ctx, tr.rect.x - 2 - cam.x, tr.rect.y - 9 - cam.y, tr.squash);
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
          KF.Art.door(ctx, r.x - cam.x, r.y - cam.y, { lantern: false, open: tr.fired ? 1 : 0, t });
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
        } else if (tr instanceof types.hidden) {
          if (!tr.fired) continue;
          for (let i = 0; i < tr.rect.w; i += T) theme.tile(ctx, tr.rect.x + i - cam.x, tr.rect.y - cam.y - Math.round(tr.popT * 4), 'alt', { t: true, b: true, l: i === 0, r: i + T >= tr.rect.w }, 0.5);
        }
      }
    },

    door(ctx, stage, cam, t, open = 0) {
      const d = stage.world.door;
      if (!d) return;
      KF.Art.door(ctx, d.x - cam.x, d.y - cam.y, { lantern: true, open, t, legs: d.moving ? d.runT : 0, flipped: d.flipped });
    },

    labels(ctx, def, theme, cam) {
      // A sign at [c, r] stands on the tile below r.
      for (const l of def.labels || []) KF.Art.sign(ctx, l.at[0] * T + 8 - cam.x, (l.at[1] + 1) * T - 18 - cam.y, l.text, theme);
    },

    // The fighter. pos = interpolated hitbox top-left in world space.
    player(ctx, p, pos, cam, opts = {}) {
      const cx = pos.x + p.w / 2 - cam.x;
      const flip = p.gravDir < 0;
      const feet = (flip ? pos.y : pos.y + p.h) - cam.y;
      const state = opts.state || (p.skidding && p.grounded ? 'skid' : p.state);
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
