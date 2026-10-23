'use strict';
// Three large districts per level. The middle district retains the hand-authored
// level and its traps; the two outer routes change elevation across several
// screens. Doors lead into the next district, never straight to another door.
(function (KF) {
  const T = KF.TILE;
  const UP = [
    [30, 29, 28, 29, 27, 26, 25, 26, 24, 23, 22, 20, 19, 18, 17],
    [30, 29, 30, 28, 27, 26, 27, 25, 24, 23, 22, 23, 21, 19, 17],
    [30, 29, 28, 27, 28, 26, 25, 24, 25, 23, 21, 22, 20, 18, 17],
    [30, 29, 28, 29, 27, 25, 26, 24, 23, 24, 22, 20, 21, 19, 17],
  ];
  const RIDGE = [
    [29, 28, 27, 28, 26, 25, 26, 24, 23, 24, 22, 21, 22, 20, 19],
    [29, 30, 28, 27, 26, 27, 25, 24, 25, 23, 22, 23, 21, 20, 19],
    [29, 28, 29, 27, 26, 25, 27, 25, 23, 24, 22, 21, 20, 21, 19],
    [29, 28, 27, 29, 27, 26, 25, 26, 24, 23, 22, 23, 21, 20, 19],
  ];
  const clone = (o) => JSON.parse(JSON.stringify(o));
  function shape(floors, seed) {
    const result = floors.slice();
    // The authored profiles establish the overall climb. Small, bounded bends
    // give each of the 40 courses its own skyline without making a jump taller
    // than two tiles.
    for (const k of [2, 4, 6, 8, 10, 12]) {
      const next = result[k] + Math.floor(KF.util.hash2(seed + 19, k * 7) * 3) - 1;
      if (Math.abs(next - result[k - 1]) <= 2 && Math.abs(next - result[k + 1]) <= 2)
        result[k] = next;
    }
    return result;
  }
  function shift(o, x, y) {
    const t = clone(o);
    if (t.at) { t.at[0] += x; t.at[1] += y; }
    if (t.zone) { t.zone[0] += x; t.zone[1] += y; }
    if (t.when) {
      if (t.when.x !== undefined) t.when.x += x;
      if (t.when.xl !== undefined) t.when.xl += x;
      if (t.when.zone) { t.when.zone[0] += x; t.when.zone[1] += y; }
    }
    if (t.path && t.type === 'doorRun') t.path.forEach((stop) => {
      stop.to[0] += x; stop.to[1] += y;
    });
    return t;
  }
  function addRoute(m, x0, floors, seed, traps, zone) {
    const metal = seed % 3 === 0 ? '=' : '-', slick = seed % 5 === 0 ? '~' : '-';
    floors.forEach((floor, k) => {
      const x = x0 + k * 7;
      for (let c = x; c < x + 5; c++) m[floor][c] = k === 0 || k === 14 ? '=' : k % 5 === 2 ? metal : k % 7 === 5 ? slick : '-';
      // One isolated platform every seven tiles; no stack of parallel floors.
      const spikes = [3 + seed % 2, 6 + Math.floor(seed / 2) % 2,
        11 + Math.floor(seed / 4) % 2];
      if (spikes.includes(k)) {
        m[floor - 1][x + 2] = '^';
      }
      if (k === 5 || k === 10) {
        // These gates have a wide ledge on both sides. They change timing without
        // asking the player to dodge while crossing a gap.
        traps.push({ type: 'pulseBeam', at: [x + 3, floor - 3, 0.3, 3],
          on: 0.8 + seed % 3 * 0.15, off: 2.2, offset: (seed + k) % 3 * 0.35 });
      }
    });
    // Give each district a different tactile stretch before the last climb.
    const k = 8, x = x0 + k * 7, floor = floors[k];
    if (seed % 2) traps.push({ type: 'conveyor', at: [x, floor, 5], speed: seed % 4 === 1 ? -65 : 65 });
    else traps.push({ type: 'collapse', at: [x + 1, floor, 2, 1], delay: 0.7, say: zone === 1 ? 'KEEP MOVING' : 'AGAIN?' });
  }
  function compose(def, originalTraps, labels, seed, guides = null) {
    const srcW = Math.max(...def.map.map((row) => row.length));
    const tall = !!def.noGates, firstX = 3, firstEnd = firstX + 14 * 7 + 2;
    const approachX = 111, coreX = tall ? 145 : 156;
    const tailX = coreX + srcW + 12, W = tailX + 105;
    const H = Math.max(44, def.map.length + 10);
    const m = Array.from({ length: H }, () => Array(W).fill('.'));
    const traps = [];
    const upper = shape(UP[seed % UP.length], seed);
    const ridge = shape(RIDGE[(seed * 3 + 1) % RIDGE.length], seed + 71);
    const chasingDoor = originalTraps.some((t) => t.type === 'doorRun');
    addRoute(m, firstX, upper, seed, traps, 1);
    addRoute(m, tailX, ridge, seed + 3, traps, 3);
    const aRow = upper[14] - 1, finalStep = chasingDoor ? 13 : 14;
    const dRow = ridge[finalStep] - 1;
    m[upper[0] - 1][firstX + 1] = 'P';
    m[aRow][firstEnd] = 'A';
    m[dRow][tailX + finalStep * 7 + 2] = 'D';
    if (chasingDoor) traps.push({ type: 'doorRun', path: [{
      to: [tailX + 14 * 7 + 2, ridge[14] - 1], near: 3, say: 'NOT SO FAST',
    }] });
    // The dividers make the three traversals legible on the map and prevent
    // accidental shortcuts. Doorways are the only passage between districts.
    for (let r = 0; r < H; r++) {
      m[r][105] = '#'; m[r][106] = '#';
      m[r][coreX + srcW + 5] = '#'; m[r][coreX + srcW + 6] = '#';
    }
    let sp = null, oldDoor = null;
    def.map.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) {
        const ch = row[c];
        if (ch === 'P') { sp = [coreX + c, r + 8]; continue; }
        if (ch === 'D' || ch === 'U') { oldDoor = [coreX + c, r + 8, ch]; continue; }
        m[r + 8][coreX + c] = ch;
      }
    });
    if (tall) for (let r = 0; r < H; r++) {
      // The original tall rooms relied on the world's solid side boundaries.
      // Keep those boundaries when the room is placed inside the larger map.
      m[r][coreX - 1] = '#'; m[r][coreX + srcW] = '#';
    }
    if (!sp || !oldDoor) throw new Error('Route is missing its original spawn or exit: ' + def.name);
    let middleStart;
    if (tall) {
      middleStart = { x: (sp[0] + 0.5) * T, y: (sp[1] + 1) * T };
    } else {
      const sourceFloor = sp[1] + 1;
      // A long approach descends to or climbs toward the original challenge.
      const floors = [sourceFloor + 4, sourceFloor + 3, sourceFloor + 4,
        sourceFloor + 2, sourceFloor + 1, sourceFloor + 2, sourceFloor];
      floors.forEach((floor, k) => {
        const x = approachX + k * 7;
        for (let c = x; c < x + 5; c++) m[floor][c] = k % 3 === 1 ? '=' : '-';
        if (k === 3 && !def.combat) m[floor - 1][x + 2] = '^';
      });
      traps.push({ type: 'pulseBeam', at: [approachX + 24, floors[3] - 3, 0.3, 3], on: 0.9, off: 2.2 });
      middleStart = { x: (approachX + 1.5) * T, y: floors[0] * T };
    }
    // Preserve the original author's hazards and geometry in the central act.
    // A running exit becomes an obstacle in the final climb instead.
    const moved = originalTraps.filter((t) => t.type !== 'doorRun').map((t) => shift(t, coreX, 8));
    traps.push(...moved);
    const bY = (oldDoor[2] === 'U' ? oldDoor[1] : oldDoor[1] - 1) * T;
    const checkpoints = [
      [firstEnd * T, (aRow - 1) * T],
      [oldDoor[0] * T, bY],
    ];
    return {
      map: m.map((row) => row.join('')),
      traps,
      labels: (labels || []).map((l) => shift(l, coreX, 8)),
      depths: (def.depths || []).map((d) => Object.assign({}, d, {
        c0: (d.c0 || 0) + coreX, c1: d.c1 === undefined ? undefined : d.c1 + coreX,
        r0: d.r0 + 8, r1: d.r1 === undefined ? undefined : d.r1 + 8,
      })),
      combat: def.combat && Object.assign({}, def.combat, {
        enemies: def.combat.enemies.map((e) => Object.assign({}, e, { at: [e.at[0] + coreX, e.at[1] + 8] })),
      }),
      checkpoints,
      guides: guides && guides.map(([x, y]) => ({ x: x + coreX * T, y: y + 8 * T })),
      doorLinks: [middleStart, { x: (tailX + 1.5) * T, y: ridge[0] * T }],
      routeZones: [{ from: firstX, to: 104 }, { from: tall ? coreX : approachX, to: coreX + srcW + 4 }, { from: tailX, to: tailX + 102 }],
    };
  }
  KF.LongRoutes = { compose };
})(window.KF);
