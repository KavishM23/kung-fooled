'use strict';
// A small construction kit for the non-NES realms. A part is still an authored
// sequence of actual places: each entry sets its floor, scenery and the way to
// reach the next elevation. The kit only fills the rock/building under it and
// adds repeatable tile detail; it does not choose a realm's route or trick.
(function (KF) {
  const T = KF.TILE, H = 38;
  const FLOOR = new Set(['fakeFloor', 'collapse', 'lureFloor']);
  const R = (ctx, color, x, y, w, h) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };
  const L = (ctx, color, x, y, xx, yy, width = 1) => {
    ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.beginPath(); ctx.moveTo(Math.round(x) + .5, Math.round(y) + .5);
    ctx.lineTo(Math.round(xx) + .5, Math.round(yy) + .5); ctx.stroke();
  };

  function part(cfg, role, variant) {
    const widths = cfg.widths || [18, 18, 18, 18];
    if (widths.length !== cfg.floors.length || widths.length !== cfg.places.length)
      throw new Error(`${cfg.name}: floors, widths and places must have equal length`);
    const W = widths.reduce((a, b) => a + b, 0), m = Array.from({ length: H }, () => Array(W).fill('.'));
    const fill = (a, b, top, bottom, tile) => {
      for (let r = Math.max(0, top); r < Math.min(H, bottom); r++)
        for (let c = Math.max(0, a); c < Math.min(W, b); c++) m[r][c] = tile;
    };
    const bounds = [0]; for (const w of widths) bounds.push(bounds[bounds.length - 1] + w);
    const props = [], depths = [], traps = [];
    cfg.places.forEach((place, i) => {
      const a = bounds[i], b = bounds[i + 1], floor = cfg.floors[i];
      fill(a, b, floor, H, '#');
      const kind = typeof place === 'string' ? place : place.kind;
      depths.push({ kind: cfg.depthKind, mode: kind, c0: a, c1: b, r0: 0, r1: floor });
      props.push({ k: kind, c: a + Math.floor((b - a) / 2), r: floor, scale: i % 2 ? 1.1 : 1 });
      // Small details make each stretch a place rather than a repeated facade.
      if (b - a >= 15) props.push({ k: kind, c: a + 4, r: floor, scale: .55, detail: true });
      if (i) {
        const before = cfg.floors[i - 1], transition = (cfg.transitions || [])[i - 1] || 'stairs';
        if (floor < before) {
          const rise = before - floor;
          if (transition === 'stairs' || transition === 'escalator') {
            // Each tread has collision. The ascent occupies actual terrain
            // instead of a ladder drawn over unrelated floating ledges.
            for (let j = 1; j <= rise; j++) fill(a - rise + j - 1, a - rise + j, before - j, H, '#');
          } else {
            for (let r = before - 2; r >= floor; r -= 2) fill(a - 5, a - 1, r, r + 1, '-');
            if (transition === 'lift') traps.push({ type: 'lift', at: [a - 5, before - 1, 3],
              legs: [[0, floor - before]], speed: 70, wait: 1.5 });
          }
          props.push({ k: 'transition', mode: transition,
            c: transition === 'stairs' || transition === 'escalator' ? a - rise : a - 5,
            r: floor, r1: before, steps: rise, direction: 'up' });
        } else if (floor > before) {
          const drop = floor - before;
          if (transition === 'stairs' || transition === 'escalator') {
            for (let j = 1; j <= drop; j++) fill(a + j - 1, a + j, before + j, H, '#');
          } else if (drop >= 7) fill(a, a + 4, before + Math.floor(drop / 2),
            before + Math.floor(drop / 2) + 1, '-');
          props.push({ k: 'transition', mode: transition, c: a, r: before,
            r1: floor, steps: drop, direction: 'down' });
        } else if (transition === 'bridge') {
          const bridge = a - 2;
          fill(bridge, bridge + 4, floor + 2, H, '.');
          props.push({ k: 'transition', mode: 'bridge', c: bridge, r: floor, r1: floor + 5 });
        }
      }
    });
    const baitArea = cfg.baitArea ?? 1;
    const bx = bounds[baitArea] + (cfg.baitOffset ?? Math.floor(widths[baitArea] / 2));
    const fy = cfg.floors[baitArea], kind = cfg.trick;
    // A floor trick takes its whole column to the bottom: the ground under it looks like ground.
    let depth = 0;
    while (fy + depth < H && [0, 1, 2].every((i) => m[fy + depth][bx + i] === '#')) depth++;
    const at = FLOOR.has(kind) ? [bx, fy, 3, Math.max(2, depth)] : [bx, fy, 3, 2];
    if (kind === 'fakeFloor') traps.push({ type: kind, at, say: 'POOF!' });
    if (kind === 'collapse') traps.push({ type: kind, at, delay: .24, say: 'GONE!' });
    if (kind === 'lureFloor') traps.push({ type: kind, at, delay: .44, near: 1.8, reform: 1.7 });
    if (kind === 'spikes') traps.push({ type: kind, at: [bx, fy - 1, 2],
      when: { x: bx - 2.5 }, delay: .16, say: 'SURPRISE!' });
    if (kind === 'crusher') {
      // It waits high above the top of the screen, so there's no floating block over the path
      // to give it away; it is timed to arrive as a runner gets under it.
      const top = Math.max(0, fy - 15);
      fill(bx, bx + 2, top, top + 2, '=');
      traps.push({ type: kind, at: [bx, top, 2, 2], when: { x: bx - 2.7 },
        delay: .03, say: 'LOOK UP!' });
    }
    if (kind === 'fakeDoor') traps.push({ type: kind, at: [bx, fy - 1], say: 'WRONG WAY!' });
    if (!traps.some((t) => t.type === kind)) throw new Error(`${cfg.name}: unknown trick ${kind}`);
    const trick = traps.findIndex((t) => t.type === kind);
    // Further surprises along the rest of the part (js/families/01-devil.js).
    const exitCol = W - (role === 'finale' ? 7 : 4);
    if (KF.Devil) KF.Devil.layer({ cfg, role, variant, m, H, W, bounds, floors: cfg.floors, traps, bx, exitCol });
    m[cfg.floors[0] - 1][2] = 'S';
    // Leave room for a running exit to flee without leaving the map.
    m[cfg.floors.at(-1) - 1][W - (role === 'finale' ? 7 : 4)] = 'E';
    return {
      name: cfg.name, entrance: cfg.entrance, shape: `${cfg.shape}-${role}-${variant}`,
      map: m.map((row) => row.join('')), traps, trick,
      trickFrom: [bx - 2, fy], props, depths,
    };
  }

  // These silhouettes are deliberately tied to objects players expect in each
  // world. They sit behind the floor and door art, never hiding a trap hitbox.
  function motif(ctx, kind, x, y, scale, p, t, art) {
    ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(scale, scale);
    const [dark, mid, light, accent, leaf, glow] = p;
    const box = (color, xx, yy, w, h) => R(ctx, color, xx, yy, w, h);
    const line = (color, x1, y1, x2, y2, width) => L(ctx, color, x1, y1, x2, y2, width);
    if (/forest|grove|garden|orchard|trees|canopy|trail|meadow/.test(kind)) {
      box(dark, -3, -51, 7, 51); box(mid, -1, -49, 3, 46);
      for (let i = 0; i < 7; i++) {
        const xx = -30 + i * 10, yy = -69 + Math.abs(3 - i) * 4;
        box(dark, xx - 1, yy - 1, 14, 16); box(leaf, xx, yy, 12, 13);
        box(light, xx + 2, yy + 2, 4, 2);
      }
      if (art === 'ukiyo' || art === 'handheld') for (let i = 0; i < 4; i++) box(accent, -23 + i * 14, -56 + i % 2 * 7, 3, 2);
    } else if (/cave|mine|tunnel|underground|cellar|crypt/.test(kind)) {
      box(dark, -42, -60, 84, 60); box(mid, -38, -57, 76, 56);
      box(dark, -25, -40, 50, 40); box(light, -29, -59, 58, 4);
      for (let i = 0; i < 8; i++) {
        const xx = -37 + i * 10; box(light, xx, -55, 2, 3 + i % 3 * 5);
        box(accent, xx + 2, -6 - i % 2 * 5, 5, 2);
      }
      box(glow, -3, -21, 6, 3);
    } else if (/temple|shrine|sanctuary|pagoda|gate|hall|court|terrace/.test(kind)) {
      for (const xx of [-34, 26]) { box(dark, xx, -66, 8, 66); box(light, xx + 2, -60, 2, 54); }
      box(dark, -43, -73, 86, 10); box(accent, -39, -70, 78, 3);
      box(mid, -37, -63, 74, 7); box(dark, -20, -42, 40, 42);
      box(glow, -28, -25, 5, 7); box(glow, 23, -25, 5, 7);
      for (let i = 0; i < 3; i++) box(light, -40 + i * 32, -76 - i % 2 * 3, 17, 2);
    } else if (/factory|machine|furnace|loading|warehouse|processing|control|dock|crane|gantry|train/.test(kind)) {
      box(dark, -46, -62, 92, 62); box(mid, -42, -58, 84, 56);
      for (let i = 0; i < 5; i++) { box(dark, -36 + i * 17, -47, 13, 23); box(glow, -33 + i * 17, -43, 7, 4); }
      box(accent, -49, -64, 98, 5); box(light, -49, -64, 98, 1);
      box(dark, -34, -12, 68, 5); box(light, -33, -11, 65, 1);
      for (let i = 0; i < 4; i++) { box(accent, -25 + i * 15, -5, 7, 3); box(dark, -23 + i * 15, -2, 2, 3); }
      if (art === 'works') { box(dark, 20, -80, 4, 20); box(glow, 18, -83, 8, 4); }
    } else if (/glass|atrium|observation|lab|white|suspended|gallery|complex/.test(kind)) {
      box(mid, -43, -78, 86, 78); box(light, -40, -75, 80, 72);
      for (const xx of [-39, 32]) box(dark, xx, -72, 7, 69);
      for (let yy = -65; yy < -4; yy += 16) { box(mid, -35, yy, 70, 3); box(glow, -27, yy + 4, 9, 4); }
      box(accent, -12, -47, 24, 38); box(dark, -8, -42, 16, 32);
    } else if (art === 'dream' && /plaza|court|terrace|mirror|portal/.test(kind)) {
      // Open geometric monuments leave the vapor horizon visible between them.
      for (const xx of [-36, 26]) {
        box(dark, xx - 3, -65, 14, 65);
        box(mid, xx, -62, 8, 59);
        box(glow, xx, -61, 2, 53);
        box(accent, xx - 7, -68, 22, 3);
      }
      box(dark, -46, -74, 93, 6); box(accent, -42, -72, 85, 2);
      box(glow, -18, -54, 36, 4);
      box(mid, -15, -49, 30, 46); box(dark, -11, -45, 22, 42);
      box(accent, -8, -40, 16, 32);
      for (let i = 0; i < 4; i++) {
        const yy = -53 + i * 13 + Math.sin(t + i) * 2;
        box(glow, -48 - i * 3, yy, 9, 2);
        box(glow, 40 + i * 3, yy - 5, 9, 2);
      }
    } else if (art === 'ar' && /plaza|terrace|promenade/.test(kind)) {
      // Stone square first, then the overlay's light markers above it.
      for (const xx of [-39, 30]) {
        box(dark, xx, -43, 9, 43); box(light, xx + 2, -40, 5, 35);
        box(accent, xx - 4, -47, 17, 4);
      }
      box(mid, -45, -8, 90, 8);
      for (let i = 0; i < 5; i++) box(light, -35 + i * 16, -6, 9, 2);
      box(glow, -11, -65, 22, 3); box(glow, -1, -67, 2, 20);
    } else if (/roof|tower|balcony|office|street|building|city|plaza|arcade|mall|studio/.test(kind)) {
      box(dark, -43, -80, 86, 80); box(mid, -40, -77, 80, 76);
      for (let yy = -68; yy < -7; yy += 15) for (let xx = -32; xx < 34; xx += 16) {
        box(dark, xx - 1, yy - 1, 10, 10); box(glow, xx, yy, 8, 8);
        box(light, xx, yy, 8, 1); box(mid, xx + 4, yy + 4, 2, 3);
      }
      box(dark, -49, -82, 98, 5); box(light, -46, -82, 92, 1);
      if (art === 'comic') { box(accent, -29, -103, 58, 21); box(dark, -25, -100, 50, 3); box(glow, -25, -94, 40, 4); }
      if (art === 'silent') { box(dark, 28, -102, 3, 20); line(dark, 29, -101, -9, -90, 2); }
    } else if (/shore|wave|fjord|river|bridge|harbour|beach/.test(kind)) {
      for (let i = 0; i < 6; i++) {
        const yy = -7 - i * 6;
        box(mid, -44 + i % 2 * 2, yy, 85, 2); box(light, -25 + i % 2 * 17, yy - 2, 27, 1);
      }
      for (const xx of [-32, 30]) { box(dark, xx, -49, 4, 48); box(accent, xx - 3, -50, 10, 4); }
      line(dark, -29, -45, 32, -45, 2);
    } else if (/neon|dream|mirror|hologram|chrom|void|portal/.test(kind)) {
      box(dark, -35, -80, 70, 80); box(mid, -31, -76, 62, 72);
      box(glow, -29, -72, 58, 2); box(accent, -26, -66, 3, 58);
      for (let i = 0; i < 5; i++) {
        const yy = -59 + i * 12; box(dark, -24 + i, yy, 47 - 2 * i, 7);
        box(glow, -21 + i, yy + 2, 8, 2);
      }
    } else { // grassland, ruins, skyline and other open places
      box(dark, -39, -43, 78, 43); box(mid, -35, -40, 70, 37);
      for (let i = 0; i < 8; i++) { box(light, -29 + i * 8, -32 + i % 3 * 5, 4, 2); box(accent, -31 + i * 8, -8, 3, 2); }
    }
    if (art === 'handheld') {
      for (let i = 0; i < 8; i++) box(i % 2 ? dark : light,
        -40 + i * 11, -5 - i % 3 * 3, 3, 2);
    } else if (art === 'silent') {
      // Projector spill from the edge of an old painted set.
      ctx.globalAlpha = .17;
      ctx.fillStyle = light; ctx.beginPath(); ctx.moveTo(-60, -80);
      ctx.lineTo(16 + Math.sin(t) * 3, -35); ctx.lineTo(35, 0); ctx.closePath(); ctx.fill();
    } else if (art === 'comic') {
      // Sparse Ben-Day dots, ink gutters and an emphatic colour block.
      for (let yy = -68; yy < -5; yy += 9)
        for (let xx = -34 + ((yy / 9) & 1) * 4; xx < 36; xx += 9)
          box(dark, xx, yy, 2, 2);
      box(accent, -39, -3, 78, 3);
    } else if (art === 'ar') {
      const pulse = Math.floor(Math.sin(t * 3) * 2);
      for (const s of [-1, 1]) {
        box(glow, s * 38 - 1, -55, 2, 11 + pulse);
        box(glow, s * 38 - 1, -12 - pulse, 2, 10);
      }
      box(glow, -5, -38, 10, 1);
    } else if (art === 'ukiyo') {
      for (let i = 0; i < 4; i++) {
        const yy = -20 + i * 5;
        line(light, -40, yy, -12, yy + 2, 1);
        line(light, 10, yy + 2, 39, yy, 1);
      }
    } else if (art === 'suburb') {
      // Tape tracking catches the bright edges, behind collision art.
      const scan = Math.round(20 + Math.sin(t * .8) * 8);
      box(light, -42, -58 + scan, 84, 1);
      box(accent, -33, -56 + scan, 17, 1);
    } else if (art === 'dream') {
      for (let i = 0; i < 4; i++) {
        const yy = -54 + i * 12 + Math.sin(t * .9 + i) * 2;
        box(i % 2 ? accent : glow, -30 + i * 14, yy, 9, 2);
      }
    } else if (art === 'cyber') {
      for (let i = 0; i < 3; i++) {
        const on = Math.floor(t * 3 + i * 2) % 3;
        box(on ? glow : mid, -20 + i * 19, -73, 7, 3);
      }
    } else if (art === 'superhot') {
      // One precise red indicator is enough for the restrained palette.
      box(Math.floor(t * 2) % 2 ? accent : glow, 29, -65, 3, 3);
    }
    ctx.restore();
  }

  function transition(ctx, pr, x, y, p, art, t) {
    const [dark, mid, light, accent, leaf, glow] = p;
    const lower = (pr.r1 - pr.r) * T, top = Math.min(0, lower), height = Math.abs(lower);
    if (pr.mode === 'bridge') {
      R(ctx, dark, x, y - 15, 65, 4); R(ctx, accent, x + 2, y - 15, 61, 2);
      for (let i = 0; i < 5; i++) { R(ctx, dark, x + i * 15, y - 29, 2, 15); L(ctx, light, x, y - 28, x + 60, y - 28, 1); }
    } else if (pr.mode === 'vines' || pr.mode === 'roots') {
      for (let i = 0; i < 3; i++) {
        const xx = x + 7 + i * 16;
        for (let yy = y + top; yy < y + top + height; yy += 5) {
          R(ctx, leaf, xx + Math.round(Math.sin(yy * .15 + i) * 2), yy, 2, 5);
          if ((yy / 5 + i) % 3 < 1) R(ctx, light, xx + 2, yy + 1, 4, 2);
        }
      }
    } else if (pr.mode === 'stairs' || pr.mode === 'escalator') {
      const n = pr.steps || Math.max(1, Math.round(height / T));
      for (let i = 0; i < n; i++) {
        const xx = x + i * T;
        const yy = y + (pr.direction === 'up' ? n - i - 1 : i + 1) * T;
        R(ctx, accent, xx, yy - 3, T, 2);
        R(ctx, dark, xx, yy - 1, T, 1);
      }
      if (pr.mode === 'escalator') {
        const first = pr.direction === 'up' ? y + (n - 1) * T : y + T;
        const last = pr.direction === 'up' ? y : y + n * T;
        L(ctx, light, x, first - 12, x + n * T, last - 12, 2);
      }
    } else if (pr.mode === 'ladder') {
      // The route is a series of jumpable landings. Show the supporting wall
      // and those landings rather than rungs that imply a climb control.
      for (const xx of [x + 5, x + 51]) {
        R(ctx, dark, xx, y + top, 4, height);
        R(ctx, mid, xx + 1, y + top + 3, 1, height - 6);
      }
      for (let yy = y + top + 4; yy < y + top + height; yy += 2 * T) {
        R(ctx, dark, x, yy, 57, 6);
        R(ctx, accent, x + 1, yy, 55, 3);
        R(ctx, light, x + 3, yy, 49, 1);
        L(ctx, mid, x + 8, yy + 6, x + 49, Math.min(yy + 30, y + top + height), 2);
        L(ctx, mid, x + 49, yy + 6, x + 8, Math.min(yy + 30, y + top + height), 2);
      }
    } else if (pr.mode === 'fire escape') {
      // Steel landings and a diagonal stair make the exterior route legible.
      for (const xx of [x + 2, x + 47]) R(ctx, dark, xx, y + top, 3, height);
      for (let yy = y + top + 4; yy < y + top + height; yy += 27) {
        R(ctx, mid, x - 1, yy, 55, 4); R(ctx, light, x - 1, yy, 55, 1);
        L(ctx, accent, x + 5, yy + 4, x + 46, Math.min(yy + 25, y + top + height), 2);
        for (let k = 0; k < 4; k++) R(ctx, light, x + 7 + k * 11, yy + 5 + k * 5, 7, 1);
      }
    } else if (pr.mode === 'shaft' || pr.mode === 'lift') {
      R(ctx, dark, x + 2, y + top, 48, height);
      R(ctx, mid, x + 5, y + top, 42, height);
      for (const xx of [x + 5, x + 45]) R(ctx, dark, xx, y + top, 3, height);
      L(ctx, light, x + 26, y + top, x + 26, y + top + height, 1);
      for (let yy = y + top + 10; yy < y + top + height; yy += 24) R(ctx, accent, x + 42, yy, 3, 4);
      if (pr.mode === 'lift') {
        R(ctx, dark, x + 4, y + top + height - 9, 46, 6);
        R(ctx, light, x + 7, y + top + height - 9, 40, 2);
      }
    } else if (pr.mode === 'ledge') {
      // Inset footholds suggest a descent without promising a climbable ladder.
      for (let i = 0; i < Math.floor(height / 20); i++) {
        const yy = y + top + 13 + i * 20;
        R(ctx, mid, x + (i % 2 ? 19 : 5), yy, 22, 5);
        R(ctx, light, x + (i % 2 ? 19 : 5), yy, 22, 1);
      }
    }
    void art; void t;
  }

  function indoorPlace(art, mode) {
    return /^(city|silent|comic|suburb|works|cyber)$/.test(art) &&
      /office|hall|lab|studio|backstage|garage|apartment|bedroom|mall|storage|control|warehouse|server|carriage/.test(mode);
  }

  // Rooms are built around the actual floor of a named indoor place. Furniture
  // is kept behind the player and collision tiles, with fixed world positions
  // so scrolling never rearranges a desk, window or plant.
  function interior(ctx, x, y, w, h, p, art, mode, cam) {
    const [dark, mid, light, accent, leaf, glow] = p;
    const windowView = (wx, wy, ww, wh) => {
      ctx.save(); ctx.beginPath(); ctx.rect(wx, wy, ww, wh); ctx.clip();
      ctx.globalAlpha = .95;
      R(ctx, art === 'silent' ? '#858585' : art === 'cyber' ? '#4b7a83' : '#70869a', wx, wy, ww, wh);
      const distant = .18, span = 25;
      const first = Math.floor((wx + cam.x * distant) / span) - 1;
      for (let k = first; k * span - cam.x * distant < wx + ww + span; k++) {
        const bx = k * span - cam.x * distant;
        const height = 12 + (k * 13 % 9 + 9) % 9;
        R(ctx, mid, bx, wy + wh - height, 18 + k % 3 * 2, height);
        R(ctx, glow, bx + 4, wy + wh - height + 4, 2, 2);
      }
      ctx.restore();
    };
    const bottom = y + h, ceiling = Math.max(y + 4, bottom - 126);
    const home = art === 'suburb' && /bedroom|apartment|garage/.test(mode);
    const work = /machine|control|server|storage|warehouse|lab/.test(mode);
    const shop = /mall/.test(mode);
    const carriage = /carriage/.test(mode);
    const theatre = art === 'silent' && /studio|backstage/.test(mode);
    ctx.globalAlpha = .95;
    R(ctx, home ? '#c79383' : work ? dark : mid, x, ceiling, w, bottom - ceiling);
    ctx.globalAlpha = .58;
    R(ctx, home ? '#ebc5aa' : light, x, ceiling + 3, w, 3);
    R(ctx, dark, x, bottom - 23, w, 23);
    R(ctx, accent, x, bottom - 24, w, 2);
    for (let xx = x + 20; xx < x + w; xx += 54) {
      ctx.globalAlpha = .18;
      R(ctx, light, xx, ceiling + 8, 1, bottom - ceiling - 34);
    }
    if (home) {
      // A warm lived-in room: window, framed art, bed, desk and houseplant.
      const wx = x + w - 89, wy = ceiling + 18;
      ctx.globalAlpha = 1;
      R(ctx, dark, wx - 3, wy - 3, 61, 48); windowView(wx, wy, 55, 42);
      R(ctx, glow, wx + 4, wy + 5, 30, 10);
      R(ctx, light, wx + 26, wy, 3, 42); R(ctx, light, wx, wy + 21, 55, 2);
      R(ctx, accent, wx - 7, wy - 3, 8, 47); R(ctx, accent, wx + 54, wy - 3, 8, 47);
      R(ctx, dark, x + 24, ceiling + 24, 36, 30); R(ctx, '#dfc47a', x + 27, ceiling + 27, 30, 24);
      R(ctx, light, x + 32, ceiling + 34, 19, 3);
      R(ctx, dark, x + 18, bottom - 39, 8, 38);
      R(ctx, dark, x + 20, bottom - 26, 86, 25);
      R(ctx, accent, x + 24, bottom - 23, 79, 18);
      R(ctx, '#efd6b3', x + 27, bottom - 22, 25, 7);
      R(ctx, '#537f82', x + 55, bottom - 22, 44, 15);
      for (let i = 0; i < 4; i++) R(ctx, light, x + 58 + i * 10, bottom - 12, 4, 2);
      R(ctx, dark, x + 22, bottom - 7, 82, 5);
      R(ctx, dark, x + 123, bottom - 38, 64, 5); R(ctx, light, x + 126, bottom - 36, 58, 3);
      R(ctx, dark, x + 129, bottom - 33, 3, 33); R(ctx, dark, x + 177, bottom - 33, 3, 33);
      R(ctx, mid, x + 143, bottom - 55, 26, 17); R(ctx, dark, x + 146, bottom - 52, 20, 11);
      R(ctx, glow, x + 149, bottom - 49, 13, 5); R(ctx, dark, x + 154, bottom - 38, 5, 3);
    } else if (carriage) {
      ctx.globalAlpha = .94;
      for (let xx = x + 20; xx < x + w - 34; xx += 75) {
        R(ctx, dark, xx, ceiling + 16, 56, 52);
        windowView(xx + 4, ceiling + 20, 48, 44);
        R(ctx, light, xx + 28, ceiling + 20, 2, 44);
        R(ctx, dark, xx - 2, bottom - 56, 55, 39);
        R(ctx, accent, xx + 2, bottom - 52, 48, 29);
        R(ctx, light, xx + 4, bottom - 51, 44, 3);
        R(ctx, dark, xx + 3, bottom - 18, 4, 18);
        R(ctx, dark, xx + 46, bottom - 18, 4, 18);
      }
    } else if (shop) {
      ctx.globalAlpha = .9;
      for (let xx = x + 18; xx < x + w - 28; xx += 77) {
        R(ctx, dark, xx, ceiling + 17, 58, 73);
        R(ctx, light, xx + 3, ceiling + 20, 52, 67);
        for (let row = 0; row < 3; row++) {
          const yy = ceiling + 30 + row * 18;
          R(ctx, dark, xx + 4, yy + 11, 50, 3);
          for (let k = 0; k < 4; k++) R(ctx, k % 2 ? accent : leaf, xx + 8 + k * 11, yy, 7, 10);
        }
        R(ctx, dark, xx - 3, bottom - 31, 65, 7);
        R(ctx, accent, xx, bottom - 29, 59, 3);
      }
    } else if (work) {
      // Machinery is arranged as a room, with a control bench and lit screens.
      ctx.globalAlpha = .88;
      R(ctx, light, x + 19, ceiling + 18, Math.max(40, w - 38), 4);
      for (let xx = x + 32; xx < x + w - 25; xx += 69) {
        R(ctx, dark, xx, bottom - 76, 52, 30);
        R(ctx, mid, xx + 3, bottom - 73, 46, 23);
        R(ctx, glow, xx + 8, bottom - 69, 25, 8);
        R(ctx, accent, xx + 36, bottom - 68, 5, 5);
        R(ctx, dark, xx - 5, bottom - 45, 62, 6);
        R(ctx, light, xx + 4, bottom - 42, 2, 18);
        R(ctx, light, xx + 45, bottom - 42, 2, 18);
        for (let i = 0; i < 3; i++) R(ctx, glow, xx + 11 + i * 10, bottom - 40, 4, 2);
      }
    } else {
      // Office and studio interiors have windows, desks, computers and plants.
      ctx.globalAlpha = .9;
      for (let xx = x + 17; xx < x + w - 32; xx += 86) {
        R(ctx, dark, xx, ceiling + 15, 58, 53);
        windowView(xx + 4, ceiling + 19, 50, 45);
        R(ctx, light, xx + 27, ceiling + 19, 2, 45);
        R(ctx, light, xx + 4, ceiling + 42, 50, 2);
        R(ctx, glow, xx + 35, ceiling + 24, 10, 7);
        R(ctx, dark, xx + 4, bottom - 48, 68, 6);
        R(ctx, accent, xx + 6, bottom - 47, 64, 2);
        for (const leg of [xx + 9, xx + 63]) R(ctx, dark, leg, bottom - 42, 3, 18);
        R(ctx, dark, xx + 17, bottom - 68, 29, 19);
        R(ctx, theatre ? light : '#7dafaa', xx + 20, bottom - 65, 23, 13);
        R(ctx, glow, xx + 22, bottom - 63, 12, 2);
        R(ctx, dark, xx + 30, bottom - 49, 4, 4);
        R(ctx, dark, xx + 51, bottom - 64, 7, 16);
        R(ctx, light, xx + 53, bottom - 62, 3, 3);
        R(ctx, dark, xx + 39, bottom - 35, 17, 11);
        R(ctx, mid, xx + 42, bottom - 43, 11, 18);
        R(ctx, dark, xx + 42, bottom - 24, 2, 14);
        R(ctx, dark, xx + 51, bottom - 24, 2, 14);
      }
    }
    // Plants occupy the edge of a room instead of the player's walking line.
    const px = x + w - 22;
    ctx.globalAlpha = .9;
    R(ctx, dark, px - 7, bottom - 41, 15, 17);
    R(ctx, accent, px - 5, bottom - 39, 11, 11);
    for (let i = 0; i < 5; i++) {
      const tip = px - 15 + i * 7;
      L(ctx, leaf, px, bottom - 42, tip, bottom - 65 - i % 2 * 8, 2);
      R(ctx, leaf, tip - 3, bottom - 68 - i % 2 * 8, 8, 4);
    }
    ctx.globalAlpha = 1;
  }

  function register(config) {
    const palette = config.palette;
    const depthName = `family_${config.name}`;
    const roles = {};
    for (const role of ['approach', 'journey', 'finale'])
      roles[role] = config[role].map((p, i) => part(Object.assign({ depthKind: depthName, family: config.name, art: config.art }, p), role, i));
    KF.Families.add(config.name, Object.assign({
      realms: config.realms || [], envs: config.envs || null,
      grounded: true, landmarks: false, wear: false,
      depthKinds: {
        [depthName](ctx, x, y, w, h, cam, t, d) {
          const [dark, mid, light, accent, leaf, glow] = palette;
          const closed = /cave|mine|tunnel|hall|lab|office|interior|cellar|crypt|tower/.test(d.mode);
          const builtRoom = indoorPlace(config.art, d.mode);
          if (builtRoom) {
            interior(ctx, x, y, w, h, palette, config.art, d.mode, cam);
            return;
          }
          ctx.globalAlpha = closed ? .83 : .42;
          R(ctx, closed ? dark : mid, x, y, w, h);
          ctx.globalAlpha = closed ? .36 : .25;
          const stride = config.art === 'handheld' ? 24 : 36;
          // This is the building/terrain wall immediately behind play. Keep it
          // at camera factor 1; slower parallax belongs behind this layer.
          const origin = d.c0 * T - cam.x;
          const first = Math.floor((x - origin) / stride) - 1;
          for (let k = first; origin + k * stride < x + w; k++) {
            const xx = origin + k * stride + 5;
            const hh = 16 + (((k * 7 + d.c0 * 3) % 3 + 3) % 3) * 8;
            R(ctx, closed ? light : dark, xx, y + h - hh, stride - 8, hh);
            R(ctx, glow, xx + 5, y + h - hh + 6, 3, 3);
          }
          ctx.globalAlpha = .28;
          for (let yy = y + 12; yy < y + h; yy += config.art === 'superhot' ? 80 : 22)
            R(ctx, closed ? accent : light, x, yy, w, 1);
          ctx.globalAlpha = 1; void t; void leaf;
        },
      },
      draw(ctx, area, cam, t) {
        for (const pr of area.props) {
          if (pr.k !== 'transition' && indoorPlace(config.art, pr.k)) continue;
          const x = pr.c * T - cam.x, y = pr.r * T - cam.y;
          if (x < -130 || x > KF.VIEW_W + 130 || y < -120 || y > KF.VIEW_H + 160) continue;
          ctx.globalAlpha = pr.detail ? .48 : .88;
          if (pr.k === 'transition') transition(ctx, pr, x, y, palette, config.art, t);
          else motif(ctx, pr.k, x, y, pr.scale || 1, palette, t, config.art);
        }
        ctx.globalAlpha = 1;
      },
      bake(ctx, world, def) {
        const [dark, mid, light, accent, leaf, glow] = palette;
        const W = world.cols, H0 = world.rows;
        ctx.save();
        for (const frame of def.partFrames || []) {
          for (let r = 1; r < H0; r++) for (let c = frame.x0; c < frame.x0 + frame.w; c++) {
            if (world.visualId(c, r) !== 1) continue;
            const x = c * T, y = r * T, n = (c * 17 + r * 13) % 7;
            // Keep a continuous terrain face while letting the original tile
            // texture show through. This also preserves the visual hole under
            // a deceptive floor, which is a useful clue after the first death.
            if (config.art !== 'superhot') {
              ctx.globalAlpha = config.art === 'handheld' ? .56 : .25;
              R(ctx, dark, x, y, T, T);
              if ((Math.floor(c / 4) + Math.floor(r / 3)) % 2 === 0) {
                ctx.globalAlpha = .13;
                R(ctx, mid, x + 1, y + 2, T - 2, T - 3);
              }
            }
            if (/^(city|silent|comic|suburb|works|cyber)$/.test(config.art) &&
                c % 5 === 2 && r % 4 === 2 && world.visualSolid(c, r - 1)) {
              ctx.globalAlpha = .55;
              R(ctx, dark, x + 2, y + 2, 12, 11);
              R(ctx, glow, x + 4, y + 4, 8, 6);
              R(ctx, mid, x + 7, y + 4, 1, 7);
              R(ctx, light, x + 4, y + 11, 8, 1);
            }
            if (world.visualSolid(c, r - 1)) continue;
            ctx.globalAlpha = .45;
            R(ctx, light, x + 1, y, 14, 1);
            if (config.art === 'handheld' || config.art === 'ukiyo') {
              if (n < 3) { R(ctx, leaf, x + 3, y - 3, 2, 3); R(ctx, leaf, x + 5, y - 5, 2, 3); }
            } else if (config.art === 'superhot') {
              R(ctx, accent, x + 12, y + 1, 2, 1);
            } else if (n < 3) {
              R(ctx, dark, x + 3, y + 3, 2, 1); R(ctx, accent, x + 10, y + 2, 3, 1);
            }
          }
        }
        // Broad bands of stone, brick, boards or clean panels interrupt the
        // repeated base tile texture beneath a traversed floor. They remain
        // clearly wall surfaces; none suggests a walkable opening.
        for (const pr of def.props || []) {
          if (pr.k === 'transition' || pr.detail) continue;
          const x = pr.c * T, top = pr.r * T;
          const limit = Math.min(world.pixelH - 9, top + 142);
          for (let y = top + 23, row = 0; y < limit; y += 25, row++) {
            ctx.globalAlpha = config.art === 'superhot' ? .17 : .33;
            R(ctx, dark, x - 37, y, 73, 2);
            R(ctx, light, x - 34 + (row % 2) * 10, y + 2, 28, 1);
            if (config.art === 'city' || config.art === 'silent' || config.art === 'comic' ||
                config.art === 'suburb' || config.art === 'works' || config.art === 'cyber') {
              for (const wx of [x - 25, x + 10]) {
                R(ctx, dark, wx, y + 6, 12, 11);
                R(ctx, glow, wx + 2, y + 8, 8, 5);
                R(ctx, mid, wx + 5, y + 8, 1, 5);
              }
            } else if (config.art !== 'superhot') {
              for (let i = 0; i < 5; i++) {
                R(ctx, i % 2 ? mid : accent, x - 31 + i * 14, y + 8 + i % 2 * 5, 7, 2);
                R(ctx, dark, x - 28 + i * 14, y + 13 + i % 3 * 2, 4, 1);
              }
            }
          }
        }
        ctx.restore(); void mid; void glow;
      },
    }, roles));
  }
  KF.FamilyKit = { register, part };
})(window.KF);
