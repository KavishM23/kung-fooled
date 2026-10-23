'use strict';
// Four compact districts per level. The hand-built room remains the second
// district; three small routes introduce, twist and finish its visual idea.
(function (KF) {
  const T = KF.TILE;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const BAITS = ['fakeFloor', 'collapse', 'spikes', 'crusher', 'fakeDoor', 'lureFloor'];
  const CONCEPTS = [
    { name: 'UNTRUSTWORTHY GROUND', tricks: ['fakeFloor', 'collapse', 'lureFloor'] },
    { name: 'FALLING STRUCTURES', tricks: ['collapse', 'crusher', 'fakeFloor'] },
    { name: 'THE ROOM ANSWERS', tricks: ['spikes', 'crusher', 'fakeDoor'] },
    { name: 'THE AMBUSH', tricks: ['crusher', 'spikes', 'fakeDoor'] },
    { name: 'FALSE PROMISES', tricks: ['fakeDoor', 'lureFloor', 'collapse'] },
    { name: 'SHIFTING SUPPORTS', tricks: ['lureFloor', 'fakeFloor', 'crusher'] },
  ];
  // The approach weaves across four broad ledges. Each upward rise is at most
  // two tiles, leaving room for an early or late jump.
  const PROFILES = [
    [32, 30, 33, 31], [31, 29, 32, 30], [30, 33, 31, 32],
    [31, 29, 33, 32], [29, 32, 30, 31], [32, 31, 34, 33],
  ];
  const BAND_SHAPES = [[0, 4, 8, 16, 22], [0, 6, 10, 16, 22], [0, 3, 8, 14, 22]];

  function shift(o, x, y) {
    const t = clone(o);
    if (t.at) { t.at[0] += x; t.at[1] += y; }
    if (t.zone) { t.zone[0] += x; t.zone[1] += y; }
    if (t.when) {
      if (t.when.x !== undefined) t.when.x += x;
      if (t.when.xl !== undefined) t.when.xl += x;
      if (t.when.zone) { t.when.zone[0] += x; t.when.zone[1] += y; }
    }
    return t;
  }

  function baitRoute(m, x0, profile, kind, traps, bands, thickness) {
    // Four readable heights replace the old flat strip without stacking many
    // platforms. The broad third band looks like a safe run to the door.
    for (let band = 0; band < 4; band++) {
      const floor = profile[band];
      for (let c = x0 + bands[band]; c < x0 + bands[band + 1]; c++)
        for (let r = floor; r < floor + thickness; r++) m[r][c] = '#';
    }
    const x = x0 + bands[2] + 2, floor = profile[2];
    const at = [x, floor, 3, thickness];
    if (kind === 'fakeFloor') traps.push({ type: kind, at, say: 'POOF!' });
    if (kind === 'collapse') traps.push({ type: kind, at, delay: 0.28, say: 'NO FLOOR!' });
    if (kind === 'lureFloor') traps.push({ type: kind, at, delay: 0.48, near: 1.8, reform: 1.8 });
    if (kind === 'spikes') traps.push({ type: kind, at: [x, floor - 1, 2],
      when: { x: x - 2.5 }, delay: 0.18, say: 'SURPRISE!' });
    if (kind === 'crusher') {
      for (let c = x; c < x + 2; c++) for (let r = floor - 6; r < floor - 4; r++) m[r][c] = '=';
      traps.push({ type: kind, at: [x, floor - 6, 2, 2],
        when: { x: x - 2.7 }, delay: 0.2, say: 'LOOK UP!' });
    }
    if (kind === 'fakeDoor') traps.push({ type: kind, at: [x, floor - 1], say: 'WRONG DOOR!' });
    return { type: kind, x, floor, x0, profile: profile.slice(), bands: bands.slice() };
  }

  function compose(def, originalTraps, labels, seed, guides = null) {
    const srcW = Math.max(...def.map.map((row) => row.length));
    const tall = !!def.noGates;
    const firstX = 3, firstEnd = firstX + 18;
    const coreX = 33, approachX = 31;
    const thirdX = coreX + srcW + 8, thirdEnd = thirdX + 18;
    const tailX = thirdX + 30;
    const W = tailX + 28, H = Math.max(44, def.map.length + 10);
    const m = Array.from({ length: H }, () => Array(W).fill('.'));
    const traps = [];
    const firstProfile = PROFILES[seed % PROFILES.length];
    // The sheltered third part is a steady upward passage. The exposed final
    // part drops onto thin ledges before climbing back to its exit.
    const climb = 30 + seed % 2, ridge = 22 + seed % 2;
    const thirdProfile = [climb, climb - 2, climb - 4, climb - 6];
    const lastProfile = [ridge, ridge + 3, ridge + 1, ridge - 1];
    const firstFloor = firstProfile[0], firstDoorFloor = firstProfile[3];
    const thirdFloor = thirdProfile[0], thirdDoorFloor = thirdProfile[3];
    const lastFloor = lastProfile[0], lastDoorFloor = lastProfile[3];
    const concept = CONCEPTS[seed % CONCEPTS.length];
    const [firstBait, thirdBait, lastBait] = concept.tricks;
    const baits = [
      baitRoute(m, firstX, firstProfile, firstBait, traps, BAND_SHAPES[0], 3),
      baitRoute(m, thirdX, thirdProfile, thirdBait, traps, BAND_SHAPES[1], 2),
      baitRoute(m, tailX, lastProfile, lastBait, traps, BAND_SHAPES[2], 1),
    ];
    m[firstFloor - 1][firstX + 2] = 'P';
    m[firstDoorFloor - 1][firstEnd] = 'A';
    m[thirdDoorFloor - 1][thirdEnd] = 'C';
    const chasingDoor = originalTraps.some((t) => t.type === 'doorRun');
    const finalStep = chasingDoor ? 16 : 18;
    m[lastDoorFloor - 1][tailX + finalStep] = 'D';
    if (chasingDoor) traps.push({ type: 'doorRun', path: [{
      to: [tailX + 20, lastDoorFloor - 1], near: 3, say: 'NOT SO FAST!',
    }] });

    // Door links keep each act self-contained and stop an accidental leap from
    // one act into another. The middle retains its authored geometry and traps.
    for (let r = 0; r < H; r++) {
      m[r][28] = '#'; m[r][29] = '#';
      m[r][coreX + srcW + 3] = '#'; m[r][coreX + srcW + 4] = '#';
      m[r][thirdX + 26] = '#'; m[r][thirdX + 27] = '#';
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
      m[r][coreX - 1] = '#'; m[r][coreX + srcW] = '#';
    }
    if (!sp || !oldDoor) throw new Error('Route is missing its spawn or exit: ' + def.name);
    let middleStart;
    if (tall) middleStart = { x: (sp[0] + 0.5) * T, y: (sp[1] + 1) * T };
    else {
      const floor = sp[1] + 1;
      for (let c = approachX; c <= sp[0]; c++)
        for (let r = floor; r < floor + 3; r++) m[r][c] = '#';
      middleStart = { x: (approachX + 1.5) * T, y: floor * T };
    }
    traps.push(...originalTraps.filter((t) => t.type !== 'doorRun').map((t) => shift(t, coreX, 8)));
    const bY = (oldDoor[2] === 'U' ? oldDoor[1] : oldDoor[1] - 1) * T;
    return {
      map: m.map((row) => row.join('')),
      traps, baits, concept: concept.name,
      labels: (labels || []).map((l) => shift(l, coreX, 8)),
      depths: (def.depths || []).map((d) => Object.assign({}, d, {
        c0: (d.c0 || 0) + coreX, c1: d.c1 === undefined ? undefined : d.c1 + coreX,
        r0: d.r0 + 8, r1: d.r1 === undefined ? undefined : d.r1 + 8,
      })),
      combat: def.combat && Object.assign({}, def.combat, {
        enemies: def.combat.enemies.map((e) => Object.assign({}, e, { at: [e.at[0] + coreX, e.at[1] + 8] })),
      }),
      checkpoints: [[firstEnd * T, (firstDoorFloor - 2) * T], [oldDoor[0] * T, bY],
        [thirdEnd * T, (thirdDoorFloor - 2) * T]],
      guides: guides && guides.map(([x, y]) => ({ x: x + coreX * T, y: y + 8 * T })),
      doorLinks: [middleStart, { x: (thirdX + 2.5) * T, y: thirdFloor * T },
        { x: (tailX + 2.5) * T, y: lastFloor * T }],
      dividers: [28, coreX + srcW + 3, thirdX + 26],
      routeZones: [{ from: firstX, to: firstX + 22 },
        { from: tall ? coreX : approachX, to: coreX + srcW + 2 },
        { from: thirdX, to: thirdX + 22 }, { from: tailX, to: tailX + 22 }],
    };
  }
  KF.LongRoutes = { compose, BAITS, CONCEPTS };
})(window.KF);
