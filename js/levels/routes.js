'use strict';
// Four districts per level. The hand-built room remains the second district;
// the other three are long built places with a few large changes in height.
// Every height belongs to a structure: a street and the roof above it, the
// floors of a building, a yard and the tower you climb out of it. Floors are
// solid down to the ground, so nothing floats, and climbs go up scaffolds or
// fire escapes rather than single offset blocks.
(function (KF) {
  const T = KF.TILE;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const BAITS = ['fakeFloor', 'collapse', 'spikes', 'crusher', 'fakeDoor', 'lureFloor'];
  const FLOOR_BAITS = ['fakeFloor', 'collapse', 'lureFloor'];
  const CONCEPTS = [
    { name: 'UNTRUSTWORTHY GROUND', tricks: ['fakeFloor', 'collapse', 'lureFloor'] },
    { name: 'FALLING STRUCTURES', tricks: ['collapse', 'crusher', 'fakeFloor'] },
    { name: 'THE ROOM ANSWERS', tricks: ['spikes', 'crusher', 'fakeDoor'] },
    { name: 'THE AMBUSH', tricks: ['crusher', 'spikes', 'fakeDoor'] },
    { name: 'FALSE PROMISES', tricks: ['fakeDoor', 'lureFloor', 'collapse'] },
    { name: 'SHIFTING SUPPORTS', tricks: ['lureFloor', 'fakeFloor', 'crusher'] },
  ];
  const PART_W = 62; // tiles: roughly eight seconds of running, plus the climbs

  function shift(o, x, y) {
    const t = clone(o);
    if (t.at) { t.at[0] += x; t.at[1] += y; }
    if (t.zone) { t.zone[0] += x; t.zone[1] += y; }
    for (const key of ['when', 'reverseWhen']) {
      const w = t[key];
      if (!w) continue;
      if (w.x !== undefined) w.x += x;
      if (w.xl !== undefined) w.xl += x;
      if (w.zone) { w.zone[0] += x; w.zone[1] += y; }
    }
    if (t.to) { t.to[0] += x; t.to[1] += y; }
    if (t.type === 'doorRun') for (const leg of t.path || []) { leg.to[0] += x; leg.to[1] += y; }
    return t;
  }

  // Drawing helpers for one district, in its own column space (x0 = its left edge).
  function builder(m, x0, H) {
    const W = m[0].length;
    const put = (c, r, ch) => { if (r >= 0 && r < H && x0 + c >= 0 && x0 + c < W) m[r][x0 + c] = ch; };
    const fill = (c0, c1, r0, r1, ch) => { for (let r = r0; r < r1; r++) for (let c = c0; c < c1; c++) put(c, r, ch); };
    const b = {
      x0, sections: [], structures: [],
      // A floor that is the top of something standing on the ground.
      mass(c0, c1, top, kind) { fill(c0, c1, top, H, '#'); b.sections.push({ x0: x0 + c0, x1: x0 + c1, floor: top, kind }); },
      open(c0, c1, r0, r1) { fill(c0, c1, r0, r1, '.'); },
      deck(c0, c1, r) { fill(c0, c1, r, r + 1, '-'); },
      solid(c0, c1, r0, r1, ch = '#') { fill(c0, c1, r0, r1, ch); },
      note(kind, c0, c1, r0, r1, extra) {
        b.structures.push(Object.assign({ kind, x0: x0 + c0, x1: x0 + c1, r0, r1 }, extra || {}));
      },
      put,
      // A scaffold against a wall at column `wall`: a stack of one-way plank
      // decks every two tiles, the top one level with a jump onto the roof.
      scaffold(wall, from, to) {
        for (let r = from - 2; r > to; r -= 2) b.deck(wall - 6, wall, r);
        b.note('scaffold', wall - 6, wall, to, from);
      },
    };
    return b;
  }

  // The single Level Devil trick of a district, placed on an apparently safe floor.
  // Floor tricks need a drop under them; the caller leaves one.
  function bait(m, kind, x, floor, traps) {
    const at = [x, floor, 3, 2];
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
  }

  // PART 1, the approach: a long street, a scaffold up the side of a building,
  // a sustained run across two roofs joined by a bridge (the trick), then down
  // the fire escape to the yard and the door.
  //   low -> climb -> high -> high -> descent -> low
  function approach(m, x0, H, s, kind, traps) {
    const b = builder(m, x0, H);
    const L = H - 9 - s % 2, up = s % 3 === 2 ? 8 : 6, hi = L - up;
    const wall = 15 + s % 2, bridge = wall + 15 + s % 3, roof2 = bridge + 3, escape = roof2 + 13;
    b.mass(0, wall, L, 'street');
    b.scaffold(wall, L, hi);
    b.mass(wall, bridge, hi, 'roof');
    // The gap between the two buildings goes all the way down; the bridge spans it.
    b.solid(bridge, roof2, hi, hi + 2);
    b.note('bridge', bridge, roof2, hi, hi + 2);
    b.sections.push({ x0: x0 + bridge, x1: x0 + roof2, floor: hi, kind: 'bridge' });
    b.mass(roof2, escape, hi, 'roof');
    // The fire escape: two landings down the wall to the yard.
    b.deck(escape, escape + 4, hi + Math.floor(up / 2));
    b.note('fireEscape', escape, escape + 4, hi, L);
    b.mass(escape, PART_W, L, 'yard');
    if (kind === 'crusher') b.note('crane', bridge, bridge + 2, 0, hi - 6);
    if (kind === 'fakeDoor') b.note('kiosk', bridge - 1, bridge + 2, hi - 3, hi);
    bait(m, kind, x0 + bridge, hi, traps);
    b.put(2, L - 1, 'P');
    b.put(PART_W - 4, L - 1, 'A');
    return Object.assign(b, { start: [2, L], exit: [PART_W - 4, L], bait: { x: x0 + bridge, floor: hi },
      shape: 'climb-plateau-descent' });
  }

  // PART 3, inside: drop through a roof hatch into a building, down a stairwell
  // to the floor below, through the trick in the lower hall, out of the service
  // door into a yard and up a scaffold to the door on the next roof.
  //   mid -> down -> down -> up
  function interior(m, x0, H, s, kind, traps) {
    const b = builder(m, x0, H);
    const roof = H - 25 - s % 2;
    const f1 = roof + 8, f2 = roof + 16, exitRoof = f2 - 8;
    const hatch = 10 + s % 3, stair = hatch + 9 + s % 2, end = 38 + s % 2;
    // One building: roof, two floors and the ground under them.
    b.mass(0, end, roof, 'roof');
    // The building's taller east wing stops a walk over the roof past the rooms.
    b.solid(end - 4, end, roof - 6, roof);
    b.note('wing', end - 4, end, roof - 6, roof);
    b.open(hatch, hatch + 2, roof, roof + 2);
    b.open(3, stair + 3, roof + 2, f1);
    b.note('room', 3, stair + 3, roof + 2, f1);
    b.note('hatch', hatch, hatch + 2, roof, roof + 2);
    b.sections.push({ x0: x0 + 3, x1: x0 + stair, floor: f1, kind: 'upper floor' });
    b.open(stair, stair + 3, f1, f1 + 2);
    b.note('stairwell', stair, stair + 3, f1 - 6, f2);
    b.open(stair - 3, end - 2, f1 + 2, f2);
    b.note('room', stair - 3, end - 2, f1 + 2, f2);
    b.sections.push({ x0: x0 + stair, x1: x0 + end - 2, floor: f2, kind: 'lower hall' });
    // The service door out of the east wall.
    b.open(end - 2, end, f2 - 3, f2);
    b.note('doorway', end - 2, end, f2 - 3, f2);
    const x = stair + 7 + s % 3;
    if (FLOOR_BAITS.includes(kind)) { b.open(x, x + 3, f2 + 2, H); b.note('shaft', x, x + 3, f2, H); }
    bait(m, kind, x0 + x, f2, traps);
    const tower = end + 9;
    b.mass(end, tower, f2, 'yard');
    b.scaffold(tower, f2, exitRoof);
    b.mass(tower, PART_W, exitRoof, 'roof');
    b.put(PART_W - 4, exitRoof - 1, 'C');
    return Object.assign(b, { start: [2, roof], exit: [PART_W - 4, exitRoof], bait: { x: x0 + x, floor: f2 },
      shape: 'descend-descend-climb' });
  }

  // PART 4, exposed: a long upper roof that ends where the roof has fallen in,
  // a drop to the lower yard, a canal to jump, the long climb up a tower and
  // the trick on the last roof before the exit.
  //   high -> sudden drop -> long low -> climb -> high
  function finale(m, x0, H, s, kind, traps, chasingDoor) {
    const b = builder(m, x0, H);
    const hi = H - 24 - s % 2, low = hi + 10, top = hi - (s % 2 ? 0 : 2);
    const edge = 18 + s % 3, canal = edge + 8 + s % 2, tower = canal + 15;
    b.mass(0, edge, hi, 'roof');
    b.note('brokenEdge', edge - 2, edge, hi, low);
    b.mass(edge, canal, low, 'yard');
    b.note('canal', canal, canal + 3, low, H);
    b.mass(canal + 3, tower, low, 'yard');
    b.scaffold(tower, low, top);
    b.mass(tower, PART_W, top, 'roof');
    const x = tower + 5;
    if (FLOOR_BAITS.includes(kind)) { b.open(x, x + 3, top + 2, H); b.note('shaft', x, x + 3, top, H); }
    if (kind === 'crusher') b.note('crane', x, x + 2, 0, top - 6);
    bait(m, kind, x0 + x, top, traps);
    const door = chasingDoor ? PART_W - 7 : PART_W - 5;
    b.put(door, top - 1, 'D');
    return Object.assign(b, { start: [2, hi], exit: [door, top], bait: { x: x0 + x, floor: top },
      shape: 'drop-traverse-climb' });
  }

  // PART 1, the other way round: start on a roof, take the fire escape down
  // to a long street, climb the scaffold of the taller block opposite and
  // cross its roof and bridge to the door.
  //   mid -> descent -> low -> climb -> high
  function approachDown(m, x0, H, s, kind, traps) {
    const b = builder(m, x0, H);
    const L = H - 9, roof = L - 6, top = L - 8;
    const escape = 16 + s % 2, wall = escape + 18, bridge = wall + 12 + s % 2, roof2 = bridge + 3;
    b.mass(0, escape, roof, 'roof');
    b.deck(escape, escape + 4, roof + 3);
    b.note('fireEscape', escape, escape + 4, roof, L);
    b.mass(escape, wall, L, 'street');
    b.scaffold(wall, L, top);
    b.mass(wall, bridge, top, 'roof');
    b.solid(bridge, roof2, top, top + 2);
    b.note('bridge', bridge, roof2, top, top + 2);
    b.sections.push({ x0: x0 + bridge, x1: x0 + roof2, floor: top, kind: 'bridge' });
    b.mass(roof2, PART_W, top, 'roof');
    if (kind === 'crusher') b.note('crane', bridge, bridge + 2, 0, top - 6);
    if (kind === 'fakeDoor') b.note('kiosk', bridge - 1, bridge + 2, top - 3, top);
    bait(m, kind, x0 + bridge, top, traps);
    b.put(2, roof - 1, 'P');
    b.put(PART_W - 4, top - 1, 'A');
    return Object.assign(b, { start: [2, roof], exit: [PART_W - 4, top], bait: { x: x0 + bridge, floor: top },
      shape: 'descent-street-climb' });
  }

  // PART 3, upward: in at the ground floor, through the trick in the hall,
  // up the stairwell landings to the floor above and out onto the balcony.
  //   low -> low -> up -> high
  function interiorUp(m, x0, H, s, kind, traps) {
    const b = builder(m, x0, H);
    const G = H - 9, up = G - 8, roof = G - 16;
    const west = 8, east = 44 + s % 2, stair = 33 + s % 3;
    b.mass(0, west, G, 'yard');
    b.mass(west, east, roof, 'roof');
    b.open(west, west + 2, G - 3, G);
    b.note('doorway', west, west + 2, G - 3, G);
    b.open(west + 2, east - 2, G - 6, G);
    b.note('room', west + 2, east - 2, G - 6, G);
    b.sections.push({ x0: x0 + west, x1: x0 + stair, floor: G, kind: 'ground hall' });
    // The stairwell: an opening in the ceiling with landings up through it.
    b.open(stair, stair + 4, up, G - 6);
    for (let r = G - 2; r >= up; r -= 2) b.deck(stair, stair + 4, r);
    b.note('stairwell', stair, stair + 4, up - 6, G);
    b.open(west + 6, east - 2, roof + 2, up);
    b.note('room', west + 6, east - 2, roof + 2, up);
    b.sections.push({ x0: x0 + stair, x1: x0 + east - 2, floor: up, kind: 'upper floor' });
    b.open(east - 2, east, up - 3, up);
    b.note('doorway', east - 2, east, up - 3, up);
    const x = west + 10 + s % 3;
    if (FLOOR_BAITS.includes(kind)) { b.open(x, x + 3, G + 2, H); b.note('shaft', x, x + 3, G, H); }
    bait(m, kind, x0 + x, G, traps);
    b.mass(east, PART_W, up, 'roof');
    b.put(PART_W - 4, up - 1, 'C');
    return Object.assign(b, { start: [2, G], exit: [PART_W - 4, up], bait: { x: x0 + x, floor: G },
      shape: 'enter-climb-out' });
  }

  // PART 4, the long climb first: up the scaffold from the yard, a sustained
  // upper roof with the trick on it, then down onto the lower roof and the exit.
  //   low -> climb -> high -> drop -> mid
  function finaleHigh(m, x0, H, s, kind, traps, chasingDoor) {
    const b = builder(m, x0, H);
    const L = H - 9, top = L - 8, lower = top + 4;
    const wall = 14 + s % 2, edge = wall + 24 + s % 3;
    b.mass(0, wall, L, 'yard');
    b.scaffold(wall, L, top);
    b.mass(wall, edge, top, 'roof');
    b.note('brokenEdge', edge - 2, edge, top, lower);
    b.mass(edge, PART_W, lower, 'roof');
    const x = wall + 14 + s % 3;
    if (FLOOR_BAITS.includes(kind)) { b.open(x, x + 3, top + 2, H); b.note('shaft', x, x + 3, top, H); }
    if (kind === 'crusher') b.note('crane', x, x + 2, 0, top - 6);
    bait(m, kind, x0 + x, top, traps);
    const door = chasingDoor ? PART_W - 7 : PART_W - 5;
    b.put(door, lower - 1, 'D');
    return Object.assign(b, { start: [2, L], exit: [door, lower], bait: { x: x0 + x, floor: top },
      shape: 'climb-plateau-drop' });
  }

  // A district described as a row of places. Each entry is a stretch of floor
  // `len` tiles long at `dy` tiles from the base ground, and says how you got
  // there from the one before:
  //   up: 'stairs' | 'ladder' | 'vines' | 'lift' | 'scaffold'  (a stack of landings)
  //   down: 'ledge' | 'stairs' | 'shaft'                        (a landing on the way down)
  //   span: 'bridge' | 'ropeBridge' | 'catwalk' | 'glass', gap  (same height, over a drop)
  // `covered` makes it an interior carved into its building, hill or temple:
  // in through a doorway on the left, out through one on the right, or `up`
  // the landings of a stairwell to its roof. `bait` places the district's trick
  // that many tiles in (`spanBait` puts it on the span instead).
  function layout(m, x0, H, kind, traps, plan, marker, chasingDoor) {
    const b = builder(m, x0, H);
    const L = H - 9;
    let c = 0, prev = null, baitAt = null, start = null, exit = null;
    plan.places.forEach((pl, i) => {
      const floor = L + pl.dy;
      if (pl.span) {
        b.solid(c, c + pl.gap, floor, floor + 2);
        b.note(pl.span, c, c + pl.gap, floor, floor + 2);
        b.sections.push({ x0: x0 + c, x1: x0 + c + pl.gap, floor, kind: 'bridge' });
        if (pl.spanBait !== undefined) baitAt = { x: c + pl.spanBait, floor, open: true };
        c += pl.gap;
      }
      const c0 = c, c1 = c + pl.len;
      if (pl.covered) {
        b.solid(c0, c1, floor - 8, H);
        b.open(c0 + 2, c1 - 2, floor - 6, floor);
        b.note('room', c0 + 2, c1 - 2, floor - 6, floor, { style: pl.covered });
        if (i > 0) { b.open(c0, c0 + 2, floor - 3, floor); b.note('doorway', c0, c0 + 2, floor - 3, floor); }
        if (pl.exitUp) {
          b.open(c1 - 6, c1 - 2, floor - 8, floor - 6);
          for (let r = floor - 2; r >= floor - 8; r -= 2) b.deck(c1 - 6, c1 - 2, r);
          b.note(pl.exitUp, c1 - 6, c1 - 2, floor - 8, floor);
        } else if (i < plan.places.length - 1) {
          b.open(c1 - 2, c1, floor - 3, floor); b.note('doorway', c1 - 2, c1, floor - 3, floor);
        }
        b.sections.push({ x0: x0 + c0, x1: x0 + c1, floor, kind: pl.kind, look: 'inside' });
      } else b.mass(c0, c1, floor, pl.kind);
      if (!pl.covered) b.sections[b.sections.length - 1].look = pl.look || (pl.dy < -3 ? 'top' : 'low');
      if (prev && !pl.span && !(prev.covered && prev.exitUp)) {
        const pf = L + prev.dy;
        if (floor < pf) b.scaffold(c0, pf, floor), b.structures[b.structures.length - 1].kind = pl.up || 'scaffold';
        else if (floor > pf) {
          const mid = pf + Math.floor((floor - pf) / 2);
          if (floor - pf >= 4) b.deck(c0, c0 + 4, mid);
          b.note(pl.down || 'ledge', c0, c0 + 4, pf, floor);
        }
      }
      if (pl.bait !== undefined) baitAt = { x: c0 + pl.bait, floor, covered: !!pl.covered };
      if (i === 0) start = [pl.start || 2, floor];
      if (i === plan.places.length - 1) exit = [c1 - (marker === 'D' && chasingDoor ? 7 : 4), floor];
      prev = pl; c = c1;
    });
    if (c !== PART_W) throw new Error(`layout ${plan.shape} is ${c} tiles, not ${PART_W}`);
    const { x, floor } = baitAt;
    if (FLOOR_BAITS.includes(kind) && !baitAt.open) { b.open(x, x + 3, floor + 2, H); b.note('shaft', x, x + 3, floor, H); }
    if (kind === 'crusher' && !baitAt.covered) b.note('crane', x, x + 2, 0, floor - 6);
    bait(m, kind, x0 + x, floor, traps);
    b.put(start[0], start[1] - 1, marker === 'A' ? 'P' : '.');
    b.put(exit[0], exit[1] - 1, marker);
    return Object.assign(b, { start, exit, bait: { x: x0 + x, floor }, shape: plan.shape });
  }

  // Realm families. Each has its own three districts; built cities keep the
  // rooftop, building and tower layouts above.
  const FAMILIES = {
    // Village, hills and cliffs, a cave, and the high ground beyond.
    land: [
      { shape: 'village-cliff-meadow', places: [
        { len: 18, dy: 0, kind: 'village' },
        { len: 24, dy: -8, kind: 'highland', up: 'vines', bait: 10 },
        { len: 20, dy: -2, kind: 'meadow', down: 'ledge' }] },
      { shape: 'cliff-cave-heights', places: [
        { len: 12, dy: -6, kind: 'cliff path' },
        { len: 8, dy: 0, kind: 'cave mouth', down: 'ledge' },
        { len: 26, dy: 0, kind: 'cave', covered: 'cave', exitUp: 'vines', bait: 9 },
        { len: 16, dy: -8, kind: 'high ground', look: 'top' }] },
      { shape: 'bridge-summit', places: [
        { len: 18, dy: 0, kind: 'valley' },
        { len: 14, dy: 0, kind: 'far bank', span: 'ropeBridge', gap: 4 },
        { len: 26, dy: -10, kind: 'summit', up: 'ladder', bait: 12 }] },
    ],
    // Courtyard, stairs, halls, lower chambers, and a tower.
    temple: [
      { shape: 'courtyard-stairs-hall', places: [
        { len: 16, dy: 0, kind: 'courtyard' },
        { len: 12, dy: -6, kind: 'terrace', up: 'stairs' },
        { len: 24, dy: -6, kind: 'hall', covered: 'hall', bait: 10 },
        { len: 10, dy: -2, kind: 'garden', down: 'stairs' }] },
      { shape: 'terrace-chamber-gallery', places: [
        { len: 12, dy: -4, kind: 'upper terrace' },
        { len: 8, dy: 4, kind: 'sunken court', down: 'stairs' },
        { len: 26, dy: 4, kind: 'lower chamber', covered: 'hall', exitUp: 'stairs', bait: 9 },
        { len: 16, dy: -4, kind: 'gallery', look: 'top' }] },
      { shape: 'gate-tower', places: [
        { len: 18, dy: 0, kind: 'outer court' },
        { len: 12, dy: 0, kind: 'gatehouse', span: 'bridge', gap: 3 },
        { len: 29, dy: -12, kind: 'tower top', up: 'stairs', bait: 13 }] },
    ],
    // Factory floor, catwalks, machinery, a shaft, and the upper platforms.
    works: [
      { shape: 'factory-catwalk-platform', places: [
        { len: 22, dy: 0, kind: 'factory floor', covered: 'works', start: 4, bait: 11 },
        { len: 14, dy: 0, kind: 'loading yard' },
        { len: 10, dy: -8, kind: 'platform', up: 'ladder' },
        { len: 10, dy: -8, kind: 'upper platform', span: 'catwalk', gap: 6, look: 'top' }] },
      { shape: 'shaft-machinery-lift', places: [
        { len: 14, dy: -6, kind: 'gantry' },
        { len: 8, dy: 2, kind: 'shaft floor', down: 'shaft' },
        { len: 24, dy: 2, kind: 'machine hall', covered: 'works', exitUp: 'ladder', bait: 9 },
        { len: 16, dy: -6, kind: 'upper platform', look: 'top' }] },
      { shape: 'catwalk-gantry-top', places: [
        { len: 16, dy: -4, kind: 'platform' },
        { len: 12, dy: -4, kind: 'gantry', span: 'catwalk', gap: 8, spanBait: 3 },
        { len: 26, dy: -12, kind: 'top deck', up: 'lift' }] },
    ],
    // Large plain surfaces: plazas, broad steps, suspended decks, an atrium.
    plain: [
      { shape: 'plaza-steps-deck', places: [
        { len: 22, dy: 0, kind: 'plaza' },
        { len: 18, dy: -8, kind: 'upper deck', up: 'stairs' },
        { len: 16, dy: -8, kind: 'far deck', span: 'glass', gap: 6, spanBait: 2 }] },
      { shape: 'mezzanine-atrium-gallery', places: [
        { len: 12, dy: -6, kind: 'mezzanine' },
        { len: 8, dy: 0, kind: 'atrium floor', down: 'stairs' },
        { len: 26, dy: 0, kind: 'atrium hall', covered: 'room', exitUp: 'stairs', bait: 9 },
        { len: 16, dy: -8, kind: 'upper gallery', look: 'top' }] },
      { shape: 'terrace-court-skydeck', places: [
        { len: 14, dy: -4, kind: 'terrace' },
        { len: 18, dy: 4, kind: 'lower court', down: 'ledge', bait: 9 },
        { len: 30, dy: -10, kind: 'sky deck', up: 'lift' }] },
    ],
  };
  const familyOf = (env) => {
    env = String(env || '');
    if (/temple|sakura|pagoda/.test(env)) return 'temple';
    if (/viking|fjord|mountain|cliff|wave|gameboy|nes8bit/.test(env)) return 'land';
    if (/harbour|dock|train|rail|mall/.test(env)) return 'works';
    if (/plaza|promenade|vapor|hologram|chrome|superhot/.test(env)) return 'plain';
    return 'city';
  };

  // ---- Realm families of hand-built parts ----
  // A family is one realm's way of building space (see js/families/*.js). It
  // supplies two hand-built maps for each of the three generated parts of a
  // level, approach, journey and finale, plus its own backgrounds and scenery.
  //
  //   KF.Families.add('nes', {
  //     realms: ['eightbit'],            // realms built this way (or envs: /regex/)
  //     grounded: false,                 // floating blocks are part of the style
  //     approach: [partA, partB], journey: [...], finale: [...],
  //     depthKinds: { kind(ctx, x, y, w, h, cam, t, d) {} },  // background regions
  //     draw(ctx, part, cam, t, pal) {}, // scenery behind the tiles of one part
  //     landmarks: false,                // skip the generic distant landmarks
  //   });
  //
  // A part: { name, entrance, shape, map: [rows], traps, trick, trickFrom, depths, props, run }
  //   map rows are equal-width strings, bottom-aligned with the level's floor of the map.
  //   'S' marks where you arrive (standing on the tile below) and 'E' the exit door's
  //   bottom tile. Traps, depths, props, trickFrom and run use the part's own tile
  //   coordinates: columns from its left edge, rows from the top of its map.
  //   trick: index of the part's headline trap; trickFrom: [c, r] a floor spot to
  //   run at it from. run: where a runaway door goes (finale; default 4 tiles right).
  const registry = {};
  KF.Families = {
    add(name, spec) {
      for (const role of ['approach', 'journey', 'finale'])
        if (!spec[role] || !spec[role].length) throw new Error(`family ${name} needs ${role} parts`);
      registry[name] = Object.assign({ name }, spec);
    },
    get: (name) => registry[name],
    // Background painters are looked up here by the renderer (families load before it does).
    depthKind: (kind) => { for (const f of Object.values(registry)) if (f.depthKinds && f.depthKinds[kind]) return f.depthKinds[kind]; return null; },
    all: () => Object.values(registry),
    // Realm first: a realm with its own family is built that way everywhere;
    // otherwise the place decides (an arcade temple is a temple).
    pick(realm, env) {
      const list = Object.values(registry);
      return list.find((f) => (f.realms || []).includes(realm)) ||
        list.find((f) => f.envs && f.envs.test(String(env || ''))) || null;
    },
  };

  function partProblem(spec) {
    if (!spec.map || !spec.map.length) return 'no map';
    const w = spec.map[0].length;
    const bad = spec.map.findIndex((row) => typeof row !== 'string' || row.length !== w);
    if (bad >= 0) return `row ${bad} is not ${w} wide`;
    const text = spec.map.join('');
    if (!text.includes('S') || !text.includes('E')) return 'needs an S and an E';
    return null;
  }

  function placeAuthored(m, x0, H, spec, marker, traps) {
    const rowOff = H - spec.map.length, w = spec.map[0].length;
    let start = null, exit = null;
    spec.map.forEach((row, r) => {
      if (row.length !== w) throw new Error(`${spec.shape}: row ${r} is ${row.length} wide, not ${w}`);
      for (let c = 0; c < w; c++) {
        let ch = row[c];
        if (ch === 'S') { start = [c, r + rowOff + 1]; ch = marker === 'A' ? 'P' : '.'; }
        else if (ch === 'E') { exit = [c, r + rowOff + 1]; ch = marker; }
        m[r + rowOff][x0 + c] = ch;
      }
    });
    if (!start || !exit) throw new Error(`${spec.shape} needs an S and an E`);
    const first = traps.length;
    traps.push(...(spec.traps || []).map((t) => shift(t, x0, rowOff)));
    const trick = spec.trick !== undefined ? traps[first + spec.trick] : null;
    const from = spec.trickFrom ? [spec.trickFrom[0] + x0, spec.trickFrom[1] + rowOff] : null;
    return {
      x0, w, start, exit, authored: true, shape: spec.shape, name: spec.name, entrance: spec.entrance,
      run: spec.run ? [spec.run[0], spec.run[1] + rowOff] : null,
      bait: { x: trick && trick.at ? trick.at[0] : x0 + start[0], floor: from ? from[1] : start[1], from, trick: first + (spec.trick ?? -1) },
      sections: [], structures: [],
      depths: (spec.depths || []).map((d) => Object.assign({}, d, {
        c0: (d.c0 || 0) + x0, c1: (d.c1 === undefined ? w : d.c1) + x0,
        r0: (d.r0 || 0) + rowOff, r1: d.r1 === undefined ? undefined : d.r1 + rowOff })),
      props: (spec.props || []).map((pr) => Object.assign({}, pr, { c: pr.c + x0, r: pr.r + rowOff })),
      rowOff, height: spec.map.length,
    };
  }

  function compose(def, sourceTraps, labels, seed, guides = null, env = def.env, realm = def.realm) {
    const originalTraps = clone(sourceTraps);
    const srcW = Math.max(...def.map.map((row) => row.length)), srcH = def.map.length;
    const tall = !!def.noGates;
    let authored = KF.Families.pick(realm, env);
    // A family part with a broken map falls back to the generic layout (and says so),
    // so one unfinished family can't stop the rest of the game from building.
    if (authored) for (const role of ['approach', 'journey', 'finale']) for (const spec of authored[role]) {
      const problem = partProblem(spec);
      if (problem && authored) { console.warn(`family ${authored.name}: ${spec.shape || spec.name}: ${problem}; using the generic layout`); authored = null; }
    }
    // Each level of a realm takes a different pair of each part: four levels, four combinations.
    const j = seed % 4, pickPart = (list, i) => list[i % list.length];
    const specs = authored && [pickPart(authored.approach, j), pickPart(authored.journey, j >> 1),
      pickPart(authored.finale, j + (j >> 1))];
    const H = Math.max(50, srcH + 10, ...(specs || []).map((p) => p.map.length));
    // Ordinary rooms sit low, on the same ground as the districts around them.
    const coreY = tall ? 8 : H - srcH - 3;
    const widths = specs ? specs.map((p) => p.map[0].length) : [PART_W, PART_W, PART_W];
    const p1X = 0, div1 = p1X + widths[0];
    const coreX = div1 + 4, approachX = coreX - 2;
    const div2 = coreX + srcW + (tall ? 1 : 0), p3X = div2 + 2;
    const div3 = p3X + widths[1], p4X = div3 + 2;
    const W = p4X + widths[2];
    const m = Array.from({ length: H }, () => Array(W).fill('.'));
    const traps = [];
    const concept = CONCEPTS[seed % CONCEPTS.length];
    const [firstBait, thirdBait, lastBait] = concept.tricks;
    const chasingDoor = originalTraps.some((t) => t.type === 'doorRun');
    const family = !authored && FAMILIES[familyOf(env)];
    const parts = authored ? [
      placeAuthored(m, p1X, H, specs[0], 'A', traps),
      placeAuthored(m, p3X, H, specs[1], 'C', traps),
      placeAuthored(m, p4X, H, specs[2], 'D', traps),
    ] : family ? [
      layout(m, p1X, H, firstBait, traps, family[0], 'A', chasingDoor),
      layout(m, p3X, H, thirdBait, traps, family[1], 'C', chasingDoor),
      layout(m, p4X, H, lastBait, traps, family[2], 'D', chasingDoor),
    ] : [
      // City districts have two layouts each; the seed mixes them so
      // neighbouring levels don't share a silhouette.
      (seed % 2 ? approachDown : approach)(m, p1X, H, seed, firstBait, traps),
      (Math.floor(seed / 2) % 2 ? interiorUp : interior)(m, p3X, H, seed, thirdBait, traps),
      (Math.floor(seed / 4) % 2 ? finaleHigh : finale)(m, p4X, H, seed, lastBait, traps, chasingDoor),
    ];
    const [one, three, four] = parts;
    if (chasingDoor) {
      const to = four.run ? [p4X + four.run[0], four.run[1]] : [p4X + four.exit[0] + 4, four.exit[1] - 1];
      traps.push({ type: 'doorRun', path: [{ to, near: 3, say: 'NOT SO FAST!' }] });
    }

    // Door links keep each district self-contained and stop an accidental leap from
    // one into another. The middle keeps its authored geometry and traps.
    for (let r = 0; r < H; r++) for (const d of [div1, div2, div3]) { m[r][d] = '#'; m[r][d + 1] = '#'; }
    let sp = null, oldDoor = null;
    def.map.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) {
        const ch = row[c];
        if (ch === 'P') { sp = [coreX + c, r + coreY]; continue; }
        if (ch === 'D' || ch === 'U') { oldDoor = [coreX + c, r + coreY, ch]; continue; }
        m[r + coreY][coreX + c] = ch;
      }
    });
    if (tall) for (let r = 0; r < H; r++) {
      m[r][coreX - 1] = '#'; m[r][coreX + srcW] = '#';
    } else {
      // The authored floor stands on ground instead of floating as a slab. Pits
      // stay open. A floor trick in the bottom row now takes the ground under it
      // too, so there's no hollow beneath it to give it away; anything else that
      // moves through the bottom row keeps its column open.
      const opened = new Set();
      for (const t of originalTraps) {
        if (!t.at || t.at.length < 4 || t.at[1] + t.at[3] < srcH) continue;
        if (FLOOR_BAITS.includes(t.type)) { t.at[3] = H - coreY - t.at[1]; continue; }
        for (let c = t.at[0]; c < t.at[0] + t.at[2]; c++) opened.add(c);
      }
      const last = def.map[srcH - 1];
      for (let c = 0; c < srcW; c++) {
        if (opened.has(c) || !'#='.includes(last[c] || '.')) continue;
        for (let r = srcH + coreY; r < H; r++) m[r][coreX + c] = '#';
      }
    }
    if (!sp || !oldDoor) throw new Error('Route is missing its spawn or exit: ' + def.name);
    let middleStart;
    if (tall) middleStart = { x: (sp[0] + 0.5) * T, y: (sp[1] + 1) * T };
    else {
      const floor = sp[1] + 1;
      for (let c = approachX; c <= sp[0]; c++)
        for (let r = floor; r < H; r++) m[r][c] = '#';
      middleStart = { x: (approachX + 1.5) * T, y: floor * T };
    }
    traps.push(...originalTraps.filter((t) => t.type !== 'doorRun').map((t) => shift(t, coreX, coreY)));
    const bY = (oldDoor[2] === 'U' ? oldDoor[1] : oldDoor[1] - 1) * T;
    const doorAt = (part) => [(part.x0 + part.exit[0]) * T, (part.exit[1] - 2) * T];
    const startAt = (part) => ({ x: (part.x0 + part.start[0] + 0.5) * T, y: part.start[1] * T });
    return {
      map: m.map((row) => row.join('')),
      traps, concept: authored ? null : concept.name,
      family: authored ? authored.name : family ? familyOf(env) : 'city', authored: !!authored,
      baits: parts.map((p, i) => ({ type: authored ? (traps[p.bait.trick] || {}).type : concept.tricks[i],
        x: p.bait.x, floor: p.bait.floor, from: p.bait.from, trick: p.bait.trick,
        x0: p.x0, w: p.w || PART_W, shape: p.shape, sections: p.sections })),
      partNames: authored ? [one.name, null, three.name, four.name] : null,
      entrances: authored ? [null, one.entrance || null, three.entrance || null, four.entrance || null] : null,
      props: authored ? [].concat(...parts.map((p) => p.props)) : [],
      partFrames: parts.map((p) => ({ x0: p.x0, w: p.w || PART_W, rowOff: p.rowOff || 0, height: p.height || H })),
      structures: [].concat(...parts.map((p) => p.structures)),
      labels: (labels || []).map((l) => shift(l, coreX, coreY)),
      depths: (def.depths || []).map((d) => Object.assign({}, d, {
        c0: (d.c0 || 0) + coreX, c1: d.c1 === undefined ? undefined : d.c1 + coreX,
        r0: d.r0 + coreY, r1: d.r1 === undefined ? undefined : d.r1 + coreY,
      })).concat(...parts.map((p) => p.depths || [])),
      combat: def.combat && Object.assign({}, def.combat, {
        enemies: def.combat.enemies.map((e) => Object.assign({}, e, { at: [e.at[0] + coreX, e.at[1] + coreY] })),
      }),
      checkpoints: [doorAt(one), [oldDoor[0] * T, bY], doorAt(three)],
      guides: guides && guides.map(([x, y]) => ({ x: x + coreX * T, y: y + coreY * T })),
      doorLinks: [middleStart, startAt(three), startAt(four)],
      dividers: [div1, div2, div3],
      routeZones: [{ from: p1X, to: p1X + widths[0] },
        { from: tall ? coreX : approachX, to: coreX + srcW + 2 },
        { from: p3X, to: p3X + widths[1] }, { from: p4X, to: p4X + widths[2] }],
    };
  }
  // Steps to the goal for the level checkers, over the open tiles a player can
  // actually occupy: near a floor (or a short jump from one), or falling.
  // Rising through empty air is not a route, so the long districts are scored
  // by their real path down and back up instead of a straight line.
  function walkField(map, W, H, starts, extra = {}) {
    const open = (c, r) => c >= 0 && r >= 0 && c < W && r < H && !'#=~'.includes((map[r] || '')[c] || '.');
    // Moving platforms and lifts are floors too, anywhere along their track.
    const moving = new Set((extra.floors || []).map(([c, r]) => r * W + c));
    const floor = (c, r) => '#=-'.includes((map[r] || '')[c] || '.') || moving.has(r * W + c);
    const near = new Uint8Array(W * H), held = new Uint8Array(W * H), dist = new Float32Array(W * H).fill(1e9);
    for (let c = 0; c < W; c++) for (let r = 0; r < H; r++) if (open(c, r))
      for (let k = 1; k <= 4; k++) if (floor(c, r + k)) { near[r * W + c] = 1; break; } else if (!open(c, r + k)) break;
    for (let c = 0; c < W; c++) for (let r = 0; r < H; r++)
      for (let k = -2; k <= 2; k++) if (near[r * W + c + k] && c + k >= 0 && c + k < W) { held[r * W + c] = 1; break; }
    // Pipes: arriving at a pipe's exit is one step from standing on its mouth.
    const into = new Map();
    for (const [fc, fr, tc, tr] of extra.links || []) {
      const k = tr * W + tc;
      if (!into.has(k)) into.set(k, []);
      into.get(k).push([fc, fr]);
    }
    const q = [];
    for (const [c, r] of starts) if (open(c, r)) { dist[r * W + c] = 0; q.push([c, r]); }
    for (let i = 0; i < q.length; i++) {
      const [c, r] = q[i], base = dist[r * W + c];
      for (const [nc, nr] of [[c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]]) {
        // Moving from (nc, nr) into (c, r): allowed onto held tiles, or by falling.
        if (!open(nc, nr) || dist[nr * W + nc] <= base + 1) continue;
        if (!held[r * W + c] && !(nr === r - 1 && nc === c)) continue;
        dist[nr * W + nc] = base + 1; q.push([nc, nr]);
      }
      for (const [fc, fr] of into.get(r * W + c) || []) {
        if (!open(fc, fr) || dist[fr * W + fc] <= base + 1) continue;
        dist[fr * W + fc] = base + 1; q.push([fc, fr]);
      }
    }
    return dist;
  }
  // What a level's traps add to the walk field: the tracks of moving floors,
  // and the pipes between places.
  function walkExtras(traps) {
    const floors = [], links = [];
    for (const t of traps) {
      if (!t.at) continue;
      const [c, r, w = 2] = t.at;
      let moves = null;
      if (t.type === 'platform') moves = [t.path || [3, 0]];
      else if (t.type === 'lift') moves = t.legs || [[0, -6]];
      else if (t.type === 'shy') moves = t.path || [];
      else if (t.type === 'blink') moves = [];
      if (moves) {
        let x = 0, y = 0, x0 = 0, x1 = 0, y0 = 0, y1 = 0;
        for (const [dx, dy] of moves) { x += dx; y += dy; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
        for (let cc = c + x0; cc < c + w + x1; cc++) for (let rr = r + y0; rr <= r + y1; rr++) floors.push([cc, rr]);
      }
      if (t.type === 'pipe' && t.to) {
        const mouth = t.dir === 'left' ? [c - 1, r + 1] : t.dir === 'right' ? [c + 1, r + 1] : [c, r - 1];
        links.push([mouth[0], mouth[1], t.to[0], t.to[1] - 1], [mouth[0] + (t.dir ? 0 : 1), mouth[1], t.to[0] + 1, t.to[1] - 1]);
      }
    }
    return { floors, links };
  }
  KF.LongRoutes = { compose, walkField, walkExtras, familyOf, BAITS, CONCEPTS, PART_W };
})(window.KF);
