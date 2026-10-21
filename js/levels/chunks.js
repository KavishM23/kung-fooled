'use strict';
// Level chunks: short hand-made pieces, each one trap idea, that join end to end into whole
// stages. The Endless Dojo and the Daily Troll build their stages from these.
//
// Every chunk is 14 rows tall with floor along rows 11-13 at both ends, so any chunk can follow
// any other. Trap coordinates are local to the chunk; build() shifts them into place.
// tools/chunks.js runs the level checker on every chunk (all attempt variants, plus the
// human-precision MARGIN mode) and on random assemblies, so whatever the dice pick is beatable.
(function (KF) {
  const ROWS = 14, FLOOR = 11;
  // A blank chunk: open air over solid floor.
  const grid = (w) => Array.from({ length: ROWS }, (_, r) => Array(w).fill(r >= FLOOR ? '#' : '.'));
  const put = (m, c, r, ch, w = 1, h = 1) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) m[r + j][c + i] = ch; };
  const pit = (m, c, w) => put(m, c, FLOOR, '.', w, ROWS - FLOOR);

  // diff: 1 (a gentle joke) to 5 (mean). build(m) edits the grid and returns { traps, labels }.
  const CHUNKS = [
    { id: 'gap', diff: 1, w: 11, build(m) { pit(m, 4, 3); return {}; } },
    { id: 'steps', diff: 1, w: 14, build(m) {
      put(m, 4, 10, '#'); put(m, 5, 9, '#', 1, 2); put(m, 6, 8, '#', 3, 3); put(m, 9, 9, '#', 1, 2); put(m, 10, 10, '#');
      return { labels: [{ at: [7, 7], text: 'VIEW!' }], traps: [{ type: 'collapse', at: [6, 8, 3, 3], deaths: [0], say: 'NICE VIEW' }] };
    } },
    { id: 'warmup', diff: 1, w: 14, build() {
      return { traps: [
        { type: 'collapse', at: [3, 11, 3, 3], deaths: [0, '2+'], say: 'OOPS' },
        { type: 'collapse', at: [8, 11, 3, 3], deaths: ['1+'], say: 'GOTCHA' },
      ] };
    } },
    { id: 'popspikes', diff: 1, w: 12, build() {
      return { traps: [{ type: 'spikes', at: [6, 10, 2], when: { x: 4.6 } }] };
    } },
    { id: 'twogaps', diff: 2, w: 14, build(m) { pit(m, 3, 2); pit(m, 8, 3); return {}; } },
    { id: 'fakefloor', diff: 2, w: 12, build() {
      return { labels: [{ at: [2, 10], text: 'SOLID' }], traps: [{ type: 'fakeFloor', at: [4, 11, 3, 3], say: 'POOF' }] };
    } },
    { id: 'crusher', diff: 2, w: 14, build(m) {
      put(m, 2, 5, '#', 11, 2);
      return { traps: [
        { type: 'crusher', at: [6, 5, 2, 2], when: { x: 4.6 }, deaths: [0, '2+'], say: 'HEADS UP' },
        { type: 'crusher', at: [9, 5, 2, 2], when: { x: 7.6 }, deaths: ['1+'] },
      ] };
    } },
    { id: 'bonk', diff: 2, w: 12, build(m) {
      pit(m, 5, 2);
      return { traps: [{ type: 'hidden', at: [5, 8], say: 'BONK' }] };
    } },
    { id: 'spring', diff: 2, w: 14, build(m) {
      put(m, 7, 6, '#', 2, 5);
      return { traps: [{ type: 'spring', at: [5, 10], power: 600, vx: 160, say: 'WHEEE' }] };
    } },
    { id: 'lowceiling', diff: 2, w: 14, build(m) {
      put(m, 3, 7, '#', 8, 2); put(m, 4, 9, 'v', 6, 1);
      return { labels: [{ at: [1, 10], text: 'DUCK?' }] };
    } },
    { id: 'fakedoor', diff: 2, w: 12, build() {
      return { traps: [{ type: 'fakeDoor', at: [6, 10], say: 'FAKE!' }] };
    } },
    { id: 'blink', diff: 3, w: 14, build(m) {
      pit(m, 3, 8);
      return { traps: [
        { type: 'blink', at: [4, 9, 2], on: 1.6, off: 0.8, offset: 0 },
        { type: 'blink', at: [8, 9, 2], on: 1.6, off: 0.8, offset: 1.2 },
      ] };
    } },
    { id: 'axe', diff: 3, w: 12, build() {
      return { traps: [{ type: 'axe', at: [6, 3], len: 6, speed: 2.4 }] };
    } },
    { id: 'shy', diff: 3, w: 14, build(m) {
      pit(m, 4, 6);
      return { traps: [{ type: 'shy', at: [5, 10, 2], path: [[2, 0]], near: 2.2 }] };
    } },
    { id: 'wind', diff: 3, w: 14, build(m) {
      pit(m, 5, 4);
      return { traps: [{ type: 'wind', zone: [0, 0, 14, 14], force: -70, gust: [1.0, 1.2], say: 'WHOOSH' }] };
    } },
    { id: 'icegap', diff: 3, w: 14, build(m) {
      put(m, 0, FLOOR, '~', 6, 1); pit(m, 6, 3);
      return {};
    } },
    { id: 'mover', diff: 3, w: 14, build(m) {
      put(m, 3, 6, '#', 8, 2);
      return { traps: [{ type: 'mover', at: [3, 6, 8, 2], path: [[0, 2]], speed: 20, when: { x: 2.5 }, say: 'CLOSING' }] };
    } },
    { id: 'reverse', diff: 3, w: 14, build(m) {
      pit(m, 6, 2);
      return { traps: [{ type: 'reverse', zone: [3, 0, 7, 14], say: 'WRONG WAY' }] };
    } },
    { id: 'airspikes', diff: 3, w: 14, build() {
      return { traps: [
        { type: 'spikes', at: [4, 10, 2], when: { x: 2.6 } },
        { type: 'spikes', at: [8, 10, 2], when: { x: 6, airborne: true }, deaths: ['1+'], say: 'SEE?' },
      ] };
    } },
    { id: 'spikefield', diff: 3, w: 16, build(m) {
      put(m, 3, 10, '^', 10, 1); put(m, 4, 8, '-', 3, 1); put(m, 9, 8, '-', 3, 1);
      return {};
    } },
    { id: 'doublefake', diff: 4, w: 16, build(m) {
      pit(m, 7, 3);
      return { traps: [
        { type: 'fakeFloor', at: [3, 11, 2, 3], say: 'POOF' },
        { type: 'collapse', at: [11, 11, 3, 3], deaths: ['1+'], say: 'AGAIN?' },
      ] };
    } },
    { id: 'twoaxes', diff: 4, w: 16, build() {
      return { traps: [
        { type: 'axe', at: [5, 3], len: 6, speed: 2.4, offset: 0 },
        { type: 'axe', at: [10, 3], len: 6, speed: 2.4, offset: 1.3 },
      ] };
    } },
    { id: 'springpit', diff: 4, w: 16, build(m) {
      pit(m, 4, 7);
      return { traps: [{ type: 'spring', at: [2, 10], power: 560, vx: 230, say: 'FLY' }] };
    } },
    { id: 'crushfake', diff: 4, w: 16, build(m) {
      put(m, 2, 5, '#', 9, 2);
      return { traps: [
        { type: 'crusher', at: [5, 5, 2, 2], when: { x: 3.6 }, say: 'HEADS UP' },
        { type: 'fakeFloor', at: [8, 11, 2, 3], deaths: ['1+'], say: 'AND DOWN' },
      ] };
    } },
    { id: 'blinkspikes', diff: 5, w: 16, build(m) {
      put(m, 3, 10, '^', 10, 1);
      return { traps: [
        { type: 'blink', at: [4, 8, 2], on: 1.4, off: 0.7, offset: 0 },
        { type: 'blink', at: [7, 8, 2], on: 1.4, off: 0.7, offset: 0.7 },
        { type: 'blink', at: [10, 8, 2], on: 1.4, off: 0.7, offset: 1.4 },
      ] };
    } },
    { id: 'gauntlet', diff: 5, w: 18, build(m) {
      pit(m, 4, 2); pit(m, 10, 3);
      return { traps: [
        { type: 'spikes', at: [7, 10, 2], when: { x: 6.2 }, deaths: [0, '2+'] },
        { type: 'hidden', at: [10, 8], deaths: ['1+'], say: 'BONK' },
        { type: 'collapse', at: [14, 11, 2, 3], deaths: ['2+'], say: 'STILL HERE?' },
      ] };
    } },
  ];

  // Shift a trap or label from chunk coordinates to stage coordinates.
  function shift(def, dc) {
    const o = JSON.parse(JSON.stringify(def));
    if (o.at) o.at[0] += dc;
    if (o.zone) o.zone[0] += dc;
    if (o.when) {
      if (o.when.x !== undefined) o.when.x += dc;
      if (o.when.xl !== undefined) o.when.xl += dc;
      if (o.when.zone) o.when.zone[0] += dc;
    }
    return o;
  }

  KF.Chunks = {
    all: CHUNKS,
    get(id) { return CHUNKS.find((c) => c.id === id); },
    // Join chunks into a stage. ids: chunk ids in order. Returns a stage def (map, traps, labels).
    assemble(ids, name = 'CHUNKS') {
      const startW = 5, endW = 6;
      const rows = Array.from({ length: ROWS }, () => '');
      const traps = [], labels = [];
      const pad = (w, marker, at) => { const m = grid(w); if (marker) m[FLOOR - 1][at] = marker; return m; };
      const append = (m) => { for (let r = 0; r < ROWS; r++) rows[r] += m[r].join(''); };
      append(pad(startW, 'P', 2));
      let col = startW;
      for (const id of ids) {
        const c = this.get(id), m = grid(c.w), out = c.build(m) || {};
        append(m);
        for (const t of out.traps || []) traps.push(shift(t, col));
        for (const l of out.labels || []) labels.push(shift(l, col));
        col += c.w;
      }
      append(pad(endW, 'D', 3));
      return { name, map: rows, traps, labels };
    },
    // Pick `count` chunks with a seeded RNG, difficulty in [lo, hi], no chunk twice in a row.
    pick(rnd, count, lo, hi, avoid = []) {
      const pool = CHUNKS.filter((c) => c.diff >= lo && c.diff <= hi);
      const out = [];
      let last = null;
      for (let i = 0; i < count; i++) {
        let tries = 0, c;
        do { c = pool[Math.floor(rnd() * pool.length)]; tries++; } while ((c.id === last || (avoid.includes(c.id) && tries < 8)) && tries < 20);
        out.push(c.id); last = c.id;
      }
      return out;
    },
  };
})(window.KF);
