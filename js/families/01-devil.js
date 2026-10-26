'use strict';
// Layered trap sequences for the realm-family parts (js/families/00-kit.js).
//
// Each kit part used to hold one trick and then a long safe walk. This adds a short sequence of
// further surprises along the rest of the part, chosen per part and per realm, so that getting
// past one trap usually shows you the next. The rules every beat follows:
//   - Nothing gives a trap away before it goes: trap floors are ordinary ground (baked with the
//     level), hidden spikes aren't drawn, a moving ledge looks like the rock it is cut from.
//   - Every beat is deterministic and has a way through that you can learn and repeat.
//   - Beats are placed only on long flat stretches, away from the spawn, the doors and the part's
//     headline trick, and the level checker (tools/solve.js) proves each part is still beatable.
//
// Beats (the names are used in the tables below):
//   ambush     spikes shoot up just ahead of a runner. Jump before the spot and they never appear.
//   retreat    ...and if you stop and back away, more come up behind you.
//   dropLedge  the far side of a gap drops away while you're in the air over it, then comes back.
//              Hop near the edge to set it off, wait for it to come back, then cross.
//   chase      a long run of floor starts falling in behind you. Keep running; stopping kills.
//   warpExit   a door that looks exactly like the exit sends you back down the part.
//   ghostGap   a pit you'd jump, then ordinary floor that isn't there. The pit has an invisible
//              floor: walk across it, then jump the false floor.
//   flipRun    left and right swap just before a gap (nothing shows it). Steer the other way.
//   coins      three coins in your path; one is a bomb that looks like the others. Hop it.
//   skyDrop    a block falls from high above the screen onto a runner. Let it land, then hop it.
//   doorChase  (finales) the exit runs off, and the floor in front of where it stops gives way.
(function (KF) {
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

  // What each realm's traps are, as far as the taunts are concerned.
  const SAY = {
    city: { ambush: 'MIND THE VENT', drop: 'SCAFFOLD OUT!', chase: 'ROOF CAVING!', warp: 'WRONG FLOOR', exit: 'NOT YET' },
    silent: { ambush: 'STAGE NAILS!', drop: 'CUT!', chase: 'RUN, CHARLIE!', warp: 'WRONG SET', exit: 'INTERMISSION' },
    comic: { ambush: 'SNIKT!', drop: 'WHOOPS!', chase: 'KRAKA-BOOM!', warp: 'MEANWHILE...', exit: 'TO BE CONTINUED' },
    suburb: { ambush: 'LEGO!', drop: 'DECK GAVE WAY', chase: 'SINKHOLE!', warp: 'WRONG HOUSE', exit: 'BE RIGHT BACK' },
    works: { ambush: 'PRESS!', drop: 'CATWALK OUT', chase: 'FLOOR DROP!', warp: 'WRONG BAY', exit: 'SHIFT CHANGE' },
    temple: { ambush: 'STONE TEETH', drop: 'THE STEP SINKS', chase: 'THE HALL FALLS', warp: 'FALSE GATE', exit: 'NOT WORTHY' },
    ukiyo: { ambush: 'BAMBOO!', drop: 'THE BANK SLIPS', chase: 'LANDSLIDE!', warp: 'WRONG SHRINE', exit: 'PATIENCE' },
    handheld: { ambush: 'OUCH!', drop: 'BRIDGE OUT', chase: 'RUN!', warp: 'WRONG CAVE', exit: 'NOT HERE' },
    ar: { ambush: 'GLITCH!', drop: 'TRACKING LOST', chase: 'RENDER FAIL', warp: 'WRONG ANCHOR', exit: 'RECALIBRATING' },
    dream: { ambush: 'A E S T H E T I C', drop: 'FADE OUT', chase: 'DISSOLVE', warp: 'DEJA VU', exit: 'NOT REAL' },
    cyber: { ambush: 'ICE!', drop: 'ACCESS DENIED', chase: 'FIREWALL', warp: '404', exit: 'REROUTED' },
    superhot: { ambush: 'SUPER', drop: 'HOT', chase: 'SUPER HOT', warp: 'MIND IS SOFTWARE', exit: 'NOT YET' },
    nes: { ambush: 'POW!', drop: 'BRIDGE OUT', chase: 'RUN!', warp: 'WARP ZONE?', exit: 'TRY AGAIN' },
  };
  // What a block that falls out of the sky turns out to be, realm by realm (js/props.js draws them).
  const LOOK = {
    city: 'acUnit', silent: 'stageLight', comic: 'anvil', suburb: 'fridge', works: 'cargo', temple: 'statue',
    ukiyo: 'bell', handheld: 'boulder', ar: 'glitchCube', dream: 'bust', cyber: 'serverRack', superhot: 'glassCube',
    nes: 'brickBlock',
  };
  // Which beats each family leans on (first is the most likely), so realms feel different.
  const TASTE = {
    city: ['skyDrop', 'dropLedge', 'ambush', 'warpExit', 'coins', 'ghostGap', 'chase'],
    silent: ['ambush', 'skyDrop', 'warpExit', 'dropLedge', 'ghostGap', 'chase', 'coins'],
    comic: ['coins', 'ambush', 'flipRun', 'chase', 'skyDrop', 'dropLedge', 'warpExit'],
    suburb: ['warpExit', 'coins', 'ghostGap', 'ambush', 'dropLedge', 'chase', 'skyDrop'],
    works: ['chase', 'skyDrop', 'dropLedge', 'ambush', 'warpExit', 'ghostGap', 'coins'],
    temple: ['dropLedge', 'ambush', 'skyDrop', 'ghostGap', 'chase', 'warpExit', 'coins'],
    ukiyo: ['chase', 'dropLedge', 'ghostGap', 'ambush', 'coins', 'skyDrop', 'warpExit'],
    handheld: ['coins', 'ghostGap', 'dropLedge', 'warpExit', 'ambush', 'chase', 'skyDrop'],
    ar: ['warpExit', 'flipRun', 'coins', 'ambush', 'chase', 'dropLedge', 'skyDrop'],
    dream: ['dropLedge', 'warpExit', 'flipRun', 'coins', 'ambush', 'chase', 'skyDrop'],
    cyber: ['ambush', 'flipRun', 'chase', 'skyDrop', 'warpExit', 'coins', 'dropLedge'],
    superhot: ['skyDrop', 'dropLedge', 'ambush', 'flipRun', 'chase', 'warpExit', 'coins'],
    nes: ['coins', 'ceilingDrop', 'ambush', 'skyDrop', 'ghostGap', 'dropLedge', 'chase'],
  };
  const NEED = { ambush: 8, dropLedge: 10, chase: 14, warpExit: 4, ghostGap: 9, flipRun: 12, coins: 7, skyDrop: 7, ceilingDrop: 7 };
  // How a level's parts develop: the approach teaches, the journey turns it round, the finale
  // combines. Each role draws its beats from its own pool, in the realm's order of taste.
  const ROLE = {
    approach: ['ambush', 'coins', 'warpExit', 'ghostGap', 'skyDrop', 'dropLedge'],
    journey: ['dropLedge', 'chase', 'flipRun', 'skyDrop', 'ghostGap', 'coins', 'ambush'],
    finale: ['chase', 'skyDrop', 'ambush', 'flipRun', 'dropLedge', 'ghostGap', 'coins'],
  };
  // Realms where the controls themselves are part of the joke.
  const FLIPS = new Set(['comic', 'ar', 'dream', 'cyber', 'superhot', 'handheld']);

  // The beats, as builders that write traps (and carve gaps) into a map. ctx: { m, H, traps, tag,
  // seed, say, art, block(c0, c1), flat(c, f), backFor(at) }. `at` is { c, f } (left column, floor row).
  function makeBeats({ m, H, traps, tag, seed, say, art, block, flat, backFor }) {
    return {
      ambush(at) {
        const { c, f } = at, id = `${tag}amb${c}`;
        traps.push({ type: 'spikes', id, at: [c + 4, f - 1, 2], when: { x: c + 2.4, xl: c + 3.4, grounded: true }, delay: 0, say: say.ambush });
        // If the surprise makes you stop and back off, the floor behind bites too.
        if ((seed >>> 3) % 2) traps.push({ type: 'spikes', at: [c, f - 1, 2], when: { after: id, xl: c + 2.2 }, delay: 0.1 });
        block(c, c + 8);
      },
      dropLedge(at) {
        const { c, f } = at, g = c + 3; // gap g..g+2, ledge g+3..g+4
        for (let r = f; r < H; r++) for (let k = 0; k < 3; k++) m[r][g + k] = '.';
        let depth = 0; while (f + depth < H && m[f + depth][g + 3] === '#' && m[f + depth][g + 4] === '#') depth++;
        traps.push({ type: 'slab', at: [g + 3, f, 2, depth], legs: [[0, 5, 420]], home: true, hold: 0.8, returnSpeed: 200,
          when: { airborne: true, x: g - 1.2, xl: g + 3 }, ease: 0, say: say.drop });
        block(c, c + 10);
      },
      chase(at) {
        const { c, f } = at;
        let prev = null;
        for (let k = 0; k < 4; k++) {
          const x = c + 1 + k * 3;
          let depth = 0; while (f + depth < H && [0, 1, 2].every((i) => m[f + depth][x + i] === '#')) depth++;
          const id = `${tag}ch${c}_${k}`;
          traps.push(Object.assign({ type: 'collapse', id, at: [x, f, 3, depth] },
            prev ? { when: { after: prev }, delay: 0.42 } : { when: { x: c + 1.6, grounded: true }, delay: 0.36, say: say.chase }));
          prev = id;
        }
        block(c, c + 14);
      },
      ghostGap(at) {
        const { c, f } = at, g = c + 2; // pit g..g+2 (with an invisible floor), false floor g+3..g+5
        for (let r = f; r < H; r++) for (let k = 0; k < 3; k++) m[r][g + k] = '.';
        traps.push({ type: 'ghostFloor', at: [g, f, 3] });
        let depth = 0; while (f + depth < H && [3, 4, 5].every((k) => m[f + depth][g + k] === '#')) depth++;
        traps.push({ type: 'fakeFloor', at: [g + 3, f, 3, depth], say: say.drop });
        block(c, c + 9);
      },
      flipRun(at) {
        const { c, f } = at, g = c + 7; // a gap g..g+2 at the end of a stretch where the controls swap
        for (let r = f; r < H; r++) for (let k = 0; k < 3; k++) m[r][g + k] = '.';
        traps.push({ type: 'reverse', zone: [c + 3, f - 6, 8, 6], hidden: true });
        block(c, c + 13);
      },
      coins(at) {
        const { c, f } = at, bomb = (seed >>> 11) % 3;
        for (let k = 0; k < 3; k++) traps.push(Object.assign({ type: 'coin', at: [c + 1 + k * 2, f - 1] }, k === bomb ? { boom: true } : {}));
        block(c, c + 7);
      },
      skyDrop(at) {
        const { c, f } = at, top = Math.max(0, f - 15);
        for (let r = top; r < top + 2; r++) for (let k = 3; k < 5; k++) m[r][c + k] = '=';
        traps.push({ type: 'crusher', at: [c + 3, top, 2, 2], when: { x: c + 0.3 }, delay: 0.03, say: say.ambush, look: LOOK[art] || 'crate' });
        block(c, c + 7);
      },
      warpExit(at) {
        const { c, f } = at;
        traps.push({ type: 'warpDoor', at: [c + 1, f - 1], to: backFor(at), say: say.warp });
        block(c - 1, c + 4);
      },
          // An ordinary-looking piece of ceiling over a flat stretch drops as you pass under it.
      // at.ceil: the ceiling's lowest solid row above the floor.
      ceilingDrop(at) {
        const { c, f, ceil } = at, x = c + 3;
        // Time for a 2x2 block from that ceiling to reach head height (gravity 1800, max 650 px/s).
        const d = Math.max(8, (f - ceil - 1) * 16 - 22), tAcc = 650 / 1800, dAcc = 0.5 * 1800 * tAcc * tAcc;
        const t = d <= dAcc ? Math.sqrt(2 * d / 1800) : tAcc + (d - dAcc) / 650;
        const trig = Math.max(c + 0.3, x + 1 - 7.5 * (t + 0.03));
        traps.push({ type: 'crusher', at: [x, ceil - 1, 2, 2], when: { x: +trig.toFixed(2) }, delay: 0.03, say: say.ambush });
        block(c, c + 7);
      },
    };
  }

  // ctx: { cfg, role, variant, m (rows of chars, mutable), H, W, bounds, floors, traps, bx, exitCol }
  function layer(ctx) {
    const { cfg, role, variant, m, H, W, bounds, floors, traps } = ctx;
    const art = cfg.art || cfg.family || 'city', say = SAY[art] || SAY.city;
    const seed = hash(`${cfg.family}|${role}|${variant}|${cfg.name}`);
    const tag = `${role[0]}${variant}`; // ids stay unique across the parts of one level
    const used = []; // [c0, c1) column ranges taken
    const block = (a, b) => used.push([a, b]);
    block(0, 7); // the arrival
    block(ctx.bx - 4, ctx.bx + 7); // the part's headline trick
    block(ctx.exitCol - (role === 'finale' ? 6 : 5), W); // the door (and room for it to run)
    const free = (a, b) => used.every(([x, y]) => b <= x || a >= y);
    // A column is flat ground if it is solid floor with open air above it for a jump.
    const flat = (c, f) => m[f] && m[f][c] === '#' && m[f + 1] && m[f + 1][c] === '#' &&
      [1, 2, 3, 4, 5].every((k) => m[f - k] && m[f - k][c] === '.');
    // Find `len` flat columns in one area, as far from the area's ends as the length allows.
    function spot(area, len) {
      const a = bounds[area], b = bounds[area + 1], f = floors[area];
      const runs = [];
      let start = -1;
      for (let c = a; c <= b; c++) {
        const ok = c < b && flat(c, f);
        if (ok && start < 0) start = c;
        if (!ok && start >= 0) { runs.push([start, c]); start = -1; }
      }
      for (const [r0, r1] of runs) {
        // Keep a tile of ordinary ground at each end of the beat.
        for (let c = r0 + 1; c + len + 1 <= r1; c++) if (free(c - 1, c + len + 1)) return { c, f, area };
      }
      return null;
    }
    const areas = bounds.length - 1;
    const order = (k) => Array.from({ length: areas }, (_, i) => (i + k) % areas);

    const beats = makeBeats({ m, H, traps, tag, seed, say, art, block, flat,
      // warpExit: back to where this stretch of the part began (onto real floor, not a stair).
      backFor: (at) => {
        let back = bounds[at.area] + 1;
        while (back < at.c - 2 && !flat(back, floors[at.area])) back++;
        return [back, floors[at.area]];
      } });

    const taste = TASTE[art] || TASTE.city;
    // This part's pool, ordered by the realm's taste (unknown to the taste: after it).
    const pool = ROLE[role].filter((n) => n !== 'flipRun' || FLIPS.has(art))
      .sort((a, b) => (taste.indexOf(a) + 9) % 9 - (taste.indexOf(b) + 9) % 9);
    const count = role === 'approach' ? 1 + (seed % 2) : 2 + (seed % 3 === 0 ? 1 : 0);
    const placed = [];
    // Walk the pool from a per-part starting point; a beat that finds no room gives way to the next.
    for (let k = 0; k < pool.length && placed.length < count; k++) {
      const name = pool[(k + (seed >>> 5)) % pool.length];
      for (const area of order((seed >>> 8) + k * 2)) {
        // warpExit wants the last area (it stands in front of the real door).
        if (name === 'warpExit' && area !== areas - 1) continue;
        const at = name === 'warpExit' ? (() => {
          const f = floors[area], c = ctx.exitCol - 9;
          return [c - 1, c, c + 1, c + 2, c + 3].every((x) => flat(x, f)) && free(c - 1, c + 4) ? { c, f, area } : null;
        })() : spot(area, NEED[name]);
        if (!at) continue;
        beats[name](at); placed.push(name);
        break;
      }
    }
    // The finale's exit: sometimes it is just a door. Sometimes it runs, and the floor in front of
    // where it stops gives way.
    if (role === 'finale' && seed % 4 !== 1) {
      const f = floors[areas - 1], e = ctx.exitCol;
      const ok = [e - 3, e - 2, e - 1, e, e + 1, e + 2, e + 3, e + 4].every((x) => m[f][x] === '#');
      if (ok) {
        traps.push({ type: 'doorRun', id: `${tag}exit`, path: [{ to: [e + 4, f - 1], near: 3, say: say.exit }] });
        let depth = 0; while (f + depth < H && m[f + depth][e + 2] === '#' && m[f + depth][e + 3] === '#') depth++;
        traps.push({ type: 'collapse', at: [e + 2, f, 2, depth], when: { after: `${tag}exit`, zone: [e + 2, f - 2, 2, 2], grounded: true }, delay: 0.05 });
        placed.push('doorChase');
      }
    }
    (KF.Devil.log || (KF.Devil.log = [])).push({ family: cfg.family, role, variant, name: cfg.name, placed });
    return placed;
  }

  // ---- Hand-built places: the middle room of every level, and the 8-BIT realm's parts ----
  // These were drawn by hand, so instead of a part's areas this reads the map itself: every row a
  // player can stand on, the flat stretches along it, and whether the ground under a stretch is
  // solid to the bottom (only then may a beat cut a gap in it) or there's a ceiling over it (a
  // ceiling can drop). Anything near a trap the room already has, its spawn or its doors is left
  // alone, so the room's own puzzle is untouched and the new beats add to it.
  // ctx: { m (rows of char arrays, mutable), H, from, to (columns), traps, art, name, count, keep: [[c0, c1], ...] }
  const THICK = new Set(['dropLedge', 'ghostGap', 'flipRun', 'chase']);
  function layerRegion(ctx) {
    const { m, H, from, to, traps, name } = ctx;
    const art = SAY[ctx.art] ? ctx.art : 'city', say = SAY[art];
    const seed = hash(`${name}|${from}|${art}`), tag = `m${from}`;
    const used = (ctx.keep || []).slice();
    const block = (a, b, t = null) => used.push([a, b, t]);
    // Keep clear of everything the room already does.
    for (const t of traps) {
      const r = t.at || t.zone; if (!r) continue;
      const c0 = r[0], w = t.zone ? r[2] : (t.type === 'axe' || t.type === 'swingHammer') ? 1 : r[2] || 1;
      const reach = t.type === 'axe' || t.type === 'swingHammer' ? Math.ceil(t.len || 4) + 1 : 2;
      if (c0 + w >= from - 3 && c0 < to + 3) block(c0 - reach, c0 + w + reach, t);
    }
    const free = (a, b, except = null) => used.every(([x, y, t]) => t === except && except || b <= x || a >= y);
    const open = (r, c) => r >= 0 && m[r] && m[r][c] === '.';
    const flat = (c, f) => m[f] && m[f][c] === '#' && [1, 2, 3, 4, 5].every((k) => open(f - k, c));
    const thick = (c, f) => { for (let r = f; r < H; r++) if (m[r][c] !== '#') return false; return true; };
    const sky = (c, f) => { for (let r = 0; r < f; r++) if (m[r][c] !== '.') return false; return true; };
    // The lowest solid row of a ceiling 6 to 9 rows above the floor, two tiles thick, or -1.
    const ceilAt = (c, f) => {
      for (let k = 6; k <= 9; k++) if (m[f - k] && m[f - k][c] === '#' && m[f - k - 1] && m[f - k - 1][c] === '#' &&
        [...Array(k - 1)].every((_, j) => open(f - 1 - j, c))) return f - k;
      return -1;
    };
    // Flat stretches: for every floor row, runs of columns standing on it.
    const runs = [];
    for (let f = 6; f < H - 1; f++) {
      let start = -1;
      for (let c = from; c <= to; c++) {
        const ok = c < to && flat(c, f);
        if (ok && start < 0) start = c;
        if (!ok && start >= 0) { if (c - start >= 9) runs.push({ f, c0: start, c1: c }); start = -1; }
      }
    }
    // Where a beat of `len` columns fits, and what it needs from the stretch.
    function spot(name, len) {
      for (const run of runs) {
        // Leave a run-up after the beat: hand-built rooms often end a stretch in a timed jump.
        for (let c = run.c0 + 1; c + len + 4 <= run.c1; c++) {
          if (!free(c - 1, c + len + 1)) continue;
          const cols = Array.from({ length: len }, (_, i) => c + i);
          if (THICK.has(name) && !cols.every((x) => thick(x, run.f))) continue;
          if (name === 'skyDrop' && !(run.f >= 16 && [c + 3, c + 4].every((x) => sky(x, run.f)))) continue;
          if (name === 'ceilingDrop') {
            const ceil = ceilAt(c + 3, run.f);
            if (ceil < 0 || ceilAt(c + 4, run.f) !== ceil) continue;
            return { c, f: run.f, ceil };
          }
          return { c, f: run.f };
        }
      }
      return null;
    }
    const beats = makeBeats({ m, H, traps, tag, seed, say, art, block, flat, backFor: (at) => [at.c - 6, at.f] });
    const placed = [];
    // First, a follow-up to one of the room's own traps: once you've learned to clear its false
    // floor or the block that falls in your way, spikes come up where that clearing jump lands
    // you running. (Only traps that are there on every attempt can be built on.)
    const anchors = traps.filter((t) => t.at && ['collapse', 'fakeFloor', 'lureFloor', 'crusher'].includes(t.type) &&
      t.at[0] >= from && t.at[0] < to && (t.deaths === undefined || [].concat(t.deaths).every((d) => typeof d === 'string')));
    for (let k = 0; k < anchors.length; k++) {
      const t = anchors[(k + (seed >>> 7)) % anchors.length], [c, r, w = 1, h = 1] = t.at;
      let f = t.type === 'crusher' ? r + h : r;
      if (t.type === 'crusher') while (f < H - 1 && m[f][c] !== '#' && !(m[f] && m[f][c] === '=' && false)) f++;
      const L = c + w, cols = [0, 1, 2, 3, 4, 5].map((i) => L + i);
      if (L + 6 > to || !cols.every((x) => flat(x, f)) || !free(L, L + 6, t)) continue;
      traps.push({ type: 'spikes', at: [L + 2, f - 1, 2], when: { x: L + 0.8, xl: L + 1.8, grounded: true }, delay: 0, say: say.ambush });
      block(L, L + 6); placed.push('followUp');
      break;
    }
    // A room's way out may have a twin: the first door you reach looks exactly like the real one and
    // sends you back to the start of the room. ctx.door: [c, r] the real door's bottom tile.
    if (ctx.door && ctx.back) {
      const [dc, dr] = ctx.door, f = dr + 1;
      for (const x of [dc - 3, dc - 4]) {
        const cols = [x - 1, x, x + 1];
        if (!cols.every((cc) => m[f] && m[f][cc] === '#' && open(f - 1, cc) && open(f - 2, cc) && open(f - 3, cc))) continue;
        if (!used.every(([a, b, t]) => !t || x + 2 <= a || x - 1 >= b)) continue; // clear of the room's traps
        traps.push({ type: 'warpDoor', at: [x, dr], to: ctx.back, say: say.warp });
        placed.push('decoyDoor');
        break;
      }
    }
    const taste = TASTE[art] || TASTE.city;
    const pool = ['ceilingDrop', 'ambush', 'coins', 'skyDrop', 'ghostGap', 'dropLedge', 'chase']
      .concat(FLIPS.has(art) ? ['flipRun'] : [])
      .sort((a, b) => (taste.indexOf(a) + 9) % 9 - (taste.indexOf(b) + 9) % 9);
    for (let k = 0; k < pool.length && placed.length < (ctx.count || 2); k++) {
      const name = pool[(k + (seed >>> 5)) % pool.length];
      const at = spot(name, NEED[name]);
      if (!at) continue;
      beats[name](at); placed.push(name);
    }
    (KF.Devil.log || (KF.Devil.log = [])).push({ family: art, role: 'room', variant: from, name, placed, runs: runs.map((r) => `${r.f}:${r.c0}-${r.c1}`).join(' '), used: used.map(([a, b]) => `${a}-${b}`).join(' ') });
    return placed;
  }

  KF.Devil = { layer, layerRegion, SAY, TASTE, LOOK };
})(window.KF);
