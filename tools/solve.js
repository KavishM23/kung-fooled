// Level checker: proves every stage can be finished on every attempt variant.
// Usage:  node tools/solve.js            (all stages)
//         node tools/solve.js rooftop 2  (door id, stage number 1-5)
//         MARGIN=1 node tools/solve.js   (human-precision check: 100 ms inputs, 5% weaker jump)
// It runs the real game logic headless and searches for an input sequence that reaches the door.
'use strict';
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SIM_FILES = ['core.js', 'physics.js', 'world.js', 'player.js', 'traps.js', 'stage.js', 'rules.js', 'levels/doors.js'];
const sandbox = { console, Math, JSON, Object, Array, Set, Map, Uint8Array, Error, parseInt, Number };
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const f of SIM_FILES) vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', f), 'utf8'), sandbox, { filename: f });
for (const f of fs.readdirSync(path.join(ROOT, 'js/levels')).sort()) {
  if (/^world\d+\.js$/.test(f)) vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/levels', f), 'utf8'), sandbox, { filename: f });
}
const KF = sandbox.KF;

// MARGIN=1: "could a human do this?" mode. Inputs can only change every 100 ms (instead of 50 ms)
// and the jump is 5% weaker. A stage that passes this has slack in every jump and timing.
const MARGIN = !!process.env.MARGIN;
if (MARGIN) KF.PlayerTuning.jumpVel *= 0.95;

function clone(o, memo) {
  if (o === null || typeof o !== 'object' || Object.isFrozen(o)) return o;
  const m = memo.get(o);
  if (m) return m;
  let c;
  if (ArrayBuffer.isView(o)) { c = o.slice(); memo.set(o, c); return c; }
  if (Array.isArray(o)) { c = new Array(o.length); memo.set(o, c); for (let i = 0; i < o.length; i++) c[i] = clone(o[i], memo); return c; }
  c = Object.create(Object.getPrototypeOf(o)); memo.set(o, c);
  for (const k of Object.keys(o)) c[k] = clone(o[k], memo);
  return c;
}

// Binary heap keyed on f.
class Heap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(n) { const a = this.a; a.push(n); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p].f <= a[i].f) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && a[l].f < a[m].f) m = l; if (r < a.length && a[r].f < a[m].f) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } }
    return top;
  }
}

const DECIDE = Number(process.env.DECIDE) || (MARGIN ? 12 : 6); // physics steps per decision (50 ms, or 100 ms in margin mode)
const ACTIONS = [];
for (const dir of [1, 0, -1]) for (const jump of [1, 0]) ACTIONS.push({ dir, jump });

function key(st, held) {
  const p = st.player, d = st.world.door;
  let k = `${Math.round(p.x / 2)},${Math.round(p.y / 2)},${Math.round(p.vx / 30)},${Math.round(p.vy / 50)},${p.grounded | 0},${p.gravDir},${p.launchT > 0 ? 1 : 0},${held | 0}${p.jumping | 0}${p.coyoteT > 0 ? 1 : 0}`;
  k += `|${d ? Math.round(d.x / 4) + ',' + Math.round(d.y / 4) : ''}`;
  for (const tr of st.traps) k += tr.fired ? '1' : tr.pending >= 0 ? 'p' : '0';
  for (const s of st.world.dynamicSolids) k += `,${Math.round(s.x / 4)}:${Math.round(s.y / 4)}:${s.active === false ? 0 : 1}`;
  if (st.def.traps && st.def.traps.some((t) => t.when && t.when.time !== undefined)) k += '|' + Math.floor(st.t / 0.25);
  for (const tr of st.traps) if (tr.period) k += '|' + Math.floor(((st.t + (tr.def.offset || 0)) % tr.period) / 0.1);
  return k;
}

// Estimated seconds to the exit. A door that still has legs to run counts its whole remaining
// route, so scaring it away is not punished (otherwise the search avoids triggering it at all).
function heuristic(st) {
  const p = st.player, d = st.world.door;
  if (!d) return 1e9;
  let dist = Math.hypot(d.x + 8 - p.centerX, d.y + 16 - (p.y + p.h / 2));
  for (const tr of st.traps) {
    if (!(tr instanceof KF.Traps.types.doorRun)) continue;
    const path = tr.def.path || [];
    let px = tr.moving ? tr.target.x : d.x, py = tr.moving ? tr.target.y : d.y;
    if (tr.moving) dist = Math.hypot(px + 8 - p.centerX, py + 16 - (p.y + p.h / 2));
    for (let i = tr.leg + (tr.moving ? 1 : 0); i < path.length; i++) {
      const nx = path[i].to[0] * 16, ny = (path[i].to[1] - 1) * 16;
      dist += Math.hypot(nx - px, ny - py); px = nx; py = ny;
    }
  }
  return dist / 120;
}

const WEIGHT = Number(process.env.WEIGHT || 2.5);
function solve(def, deaths, budget = Number(process.env.BUDGET || 250000)) {
  const start = new KF.Stage(def, deaths);
  const open = new Heap();
  const seen = new Set([key(start, false)]);
  open.push({ st: start, held: false, g: 0, f: heuristic(start), seq: null });
  let expanded = 0, best = 0;
  while (open.size && expanded < budget) {
    const node = open.pop();
    expanded++;
    for (const a of ACTIONS) {
      const st = clone(node.st, new Map());
      const input = { left: a.dir < 0, right: a.dir > 0, jumpHeld: !!a.jump, jumpPressed: false };
      for (let i = 0; i < DECIDE && st.state === 'play'; i++) {
        input.jumpPressed = i === 0 && a.jump && !node.held;
        st.step(KF.STEP, input);
        st.events.length = 0;
      }
      const seq = { a, prev: node.seq };
      if (st.state === 'won') return { ok: true, time: (node.g + DECIDE * KF.STEP), expanded, seq };
      if (process.env.DEBUG && st.state === 'dead' && st.player.centerX > best) { best = st.player.centerX; console.log('  died at', best.toFixed(0), st.player.y.toFixed(0), st.cause, st.t.toFixed(2)); }
      if (process.env.DEBUG && st.state === 'play' && st.player.centerX > (solve.far || 0)) { solve.far = st.player.centerX; if (Math.floor(solve.far / 16) !== Math.floor((solve.farP || 0) / 16)) { solve.farP = solve.far; console.log('  reached col', (solve.far / 16).toFixed(1), 'y', st.player.y.toFixed(0), 't', st.t.toFixed(2), 'door', st.world.door.x / 16); } }
      if (st.state !== 'play' || st.t > 60) continue;
      const k = key(st, a.jump);
      if (seen.has(k)) continue;
      seen.add(k);
      const g = node.g + DECIDE * KF.STEP;
      // Firing a trap and surviving is progress in this game (blocks revealed, doors scared off),
      // so such states get a small bonus.
      const fired = st.traps.reduce((n, tr) => n + (tr.fired ? 1 : 0), 0);
      open.push({ st, held: !!a.jump, g, f: g + heuristic(st) * WEIGHT - fired * 1.5, seq });
    }
  }
  return { ok: false, expanded };
}

function variants(def) {
  let max = 0;
  for (const t of def.traps || []) {
    const list = t.deaths === undefined ? [] : Array.isArray(t.deaths) ? t.deaths : [t.deaths];
    for (const s of list) max = Math.max(max, parseInt(s, 10));
  }
  return Array.from({ length: max + 2 }, (_, i) => i);
}

function describe(seq) {
  const steps = [];
  for (let n = seq; n; n = n.prev) steps.push(n.a);
  steps.reverse();
  const out = [];
  for (const s of steps) {
    const tag = (s.dir > 0 ? 'R' : s.dir < 0 ? 'L' : '_') + (s.jump ? 'J' : '');
    if (out.length && out[out.length - 1].tag === tag) out[out.length - 1].n++;
    else out.push({ tag, n: 1 });
  }
  return out.map((o) => `${o.tag}${o.n > 1 ? 'x' + o.n : ''}`).join(' ');
}

const [onlyDoor, onlyStage] = process.argv.slice(2);
let failures = 0;
const dump = {}; // DUMP=file.json writes every solution as [dir, jump] per 50ms, for replays
for (const door of KF.Doors) {
  if (onlyDoor && door.id !== onlyDoor) continue;
  door.stages.forEach((def, i) => {
    if (onlyStage && Number(onlyStage) !== i + 1) return;
    for (const d of variants(def)) {
      const t0 = Date.now();
      const r = solve(def, d);
      const label = `${door.id} ${i + 1} "${def.name}" deaths=${d}${MARGIN ? ' [margin]' : ''}`;
      if (r.ok && process.env.DUMP) {
        const steps = []; for (let n = r.seq; n; n = n.prev) steps.push([n.a.dir, n.a.jump]);
        dump[`${door.id}-${i + 1}-${d}`] = steps.reverse();
      }
      if (r.ok) console.log(`OK   ${label}  ${r.time.toFixed(2)}s  (${r.expanded} nodes, ${Date.now() - t0}ms)` + (process.env.VERBOSE ? '\n     ' + describe(r.seq) : ''));
      else { failures++; console.log(`FAIL ${label}  no route found (${r.expanded} nodes)`); }
    }
  });
}
if (!KF.Doors.some((d) => d.stages.length)) console.log('No stages loaded.');
if (process.env.DUMP) fs.writeFileSync(process.env.DUMP, JSON.stringify(dump));
process.exit(failures ? 1 : 0);
