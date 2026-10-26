// Level checker: proves every stage can be finished on every attempt variant.
// Usage:  node tools/solve.js            (all stages)
//         node tools/solve.js rooftop 2  (door id, stage number 1-5)
//         MARGIN=1 node tools/solve.js   (human-precision check: 100 ms inputs, 5% weaker jump)
//         PARTS=1,3 node tools/solve.js eightbit 2   (only those parts, each from its checkpoint)
// It runs the real game logic headless and searches for an input sequence that reaches the door.
'use strict';
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SIM_FILES = ['core.js', 'physics.js', 'world.js', 'player.js', 'traps.js', 'combat.js', 'stage.js', 'rules.js', 'levels/doors.js', 'levels/routes.js'];
const sandbox = { console, Math, JSON, Object, Array, Set, Map, Uint8Array, Error, parseInt, Number };
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const f of SIM_FILES) vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', f), 'utf8'), sandbox, { filename: f });
for (const f of fs.readdirSync(path.join(ROOT, 'js/levels')).sort()) {
  if (/^(world\d+|tall_[a-z]+)\.js$/.test(f)) vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/levels', f), 'utf8'), sandbox, { filename: f });
}
const FAMILY_DIR = path.join(ROOT, 'js/families');
for (const f of (fs.existsSync(FAMILY_DIR) ? fs.readdirSync(FAMILY_DIR) : []).filter((f) => f.endsWith('.js')).sort())
{
  try { vm.runInContext(fs.readFileSync(path.join(FAMILY_DIR, f), 'utf8'), sandbox, { filename: f }); }
  catch (e) { console.log(`WARNING: family ${f} did not load: ${e.message}`); }
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

const DECIDE = Number(process.env.DECIDE) || (MARGIN ? 12 : 6); // physics steps per decision (usually 50 ms; 100 ms for tall stages and margin mode)
const ACTIONS = [];
for (const dir of [1, 0, -1]) for (const jump of [1, 0]) ACTIONS.push({ dir, jump });

function target(st) { return st.part === 2 && st.def.guides && st.def.guides[st.guide] ||
  st.world.partDoors[st.part - 1] || st.world.door; }
function key(st, held) {
  const p = st.player, d = target(st);
  let k = `${Math.round(p.x / 2)},${Math.round(p.y / 2)},${Math.round(p.vx / 30)},${Math.round(p.vy / 50)},${p.grounded | 0},${p.gravDir},${p.launchT > 0 ? 1 : 0},${held | 0}${p.jumping | 0}${p.coyoteT > 0 ? 1 : 0}`;
  k += `|${st.part}|${st.guide}|${d ? Math.round(d.x / 4) + ',' + Math.round(d.y / 4) : ''}`;
  if (st.part <= st.world.partDoors.length && st.world.door) k += `|${Math.round(st.world.door.x / 4)},${Math.round(st.world.door.y / 4)}`;
  for (const tr of st.traps) k += tr.fired ? '1' : tr.pending >= 0 ? 'p' : '0';
  for (const tr of st.traps) if (tr.stateKey && (!tr.solid || Math.abs(tr.solid.x - p.centerX) < 220)) k += tr.stateKey(); // lifts, pipes, platforms, belts
  for (const tr of st.traps) {
    if (tr.def.type === 'lookSaw') k += `s${Math.round(tr.x / 4)}`;
    if (tr.def.type === 'lureFloor') k += `l${tr.mode[0]}${Math.round(Math.max(0, tr.timer) * 5)}`;
  }
  for (const tr of st.traps) if (tr.col !== undefined && tr.col !== null) { // ambush flames: timing only matters until they burn out
    const live = tr.t < tr.warnT + (tr.def.burn ?? 0.9);
    k += `|f${tr.col}:${live ? Math.floor(tr.t / 0.05) : 'x'}`;
  }
  // Moving floors far from the player can't affect this decision; keying them would make
  // every moment of a looping platform a new state.
  for (const s of st.world.dynamicSolids) if (Math.abs(s.x + s.w / 2 - p.centerX) < 220 && Math.abs(s.y - p.y) < 200)
    k += `,${Math.round(s.x / 4)}:${Math.round(s.y / 4)}:${s.active === false ? 0 : 1}`;
  if (st.def.traps && st.def.traps.some((t) => t.when && t.when.time !== undefined)) k += '|' + Math.floor(st.t / 0.25);
  // A remote gate's exact clock phase cannot affect this decision. Including
  // every gate across a long level multiplies otherwise identical search states.
  for (const tr of st.traps) if (tr.period && tr.rect &&
    p.centerX >= tr.rect.x - 128 && p.centerX <= tr.rect.x + tr.rect.w + 128)
    k += '|' + Math.floor(((st.t + (tr.def.offset || 0)) % tr.period) / 0.1);
  if (st.combat) {
    k += '|' + [st.combat.health, st.combat.ammo, Math.round(st.combat.reload * 5), ...st.combat.enemies.map((e) => e.hp)].join(',');
    for (const b of st.combat.bullets) k += ';' + [Math.round(b.x / 8), Math.round(b.y / 8), b.enemy | 0].join(',');
  }
  return k;
}

// Estimated seconds to the exit. A door that still has legs to run counts its whole remaining
// route, so scaring it away is not punished (otherwise the search avoids triggering it at all).
// Tall hand-built levels (def.noGates) double back: down a tower's floors, out through a basin.
// For those the estimate is the length of the open-tile path to the door (a flood fill over the
// map, ignoring jump limits), so heading "away" from the door along the real route isn't punished.
const fields = new Map();
function pathField(st) {
  const def = st.def;
  let byPart = fields.get(def);
  if (!byPart) { byPart = new Map(); fields.set(def, byPart); }
  const goal = target(st), targetKey = `${st.part}-${st.guide}-${Math.round(goal.x / 16)},${Math.round(goal.y / 16)}`; // a running door moves the goal
  if (byPart.has(targetKey)) return byPart.get(targetKey);
  const W = st.world.cols, H = st.world.rows;
  const d = target(st);
  const dc = Math.floor((d.x + 8) / 16), dr = Math.floor((d.y + 16) / 16);
  const starts = [[dc, dr], [dc, dr - 1], [dc, dr + 1]];
  let dist;
  if (def.doorLinks && st.part !== 2) dist = KF.LongRoutes.walkField(def.map, W, H, starts, KF.LongRoutes.walkExtras(def.traps));
  else {
    dist = new Float32Array(W * H).fill(1e9);
    const open = (c, r) => c >= 0 && r >= 0 && c < W && r < H && !'#=~'.includes((def.map[r] || '')[c] || '.');
    const q = [];
    for (const [c, r] of starts) if (open(c, r)) { dist[r * W + c] = 0; q.push([c, r]); }
    for (let i = 0; i < q.length; i++) {
      const [c, r] = q[i], base = dist[r * W + c];
      for (const [nc, nr] of [[c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]]) {
        if (!open(nc, nr) || dist[nr * W + nc] <= base + 1) continue;
        dist[nr * W + nc] = base + 1; q.push([nc, nr]);
      }
    }
  }
  const f = { dist, W, H };
  byPart.set(targetKey, f);
  return f;
}
function routeEstimate(st) {
  if (!(st.def.noGates || (st.def.doorLinks && st.part !== 2)) || !st.world.door) return null; // the long outer districts double back too
  const f = pathField(st), p = st.player;
  const c = Math.max(0, Math.min(f.W - 1, Math.floor(p.centerX / 16))), r = Math.max(0, Math.min(f.H - 1, Math.floor((p.y + p.h / 2) / 16)));
  const v = f.dist[r * f.W + c];
  // In a long outer part, a spot with no way on (the bottom of a pit) is a dead end,
  // not a short cut: score it far away instead of falling back to a straight line.
  if (v >= 1e9) return st.def.doorLinks && st.part !== 2 ? 1e5 : null;
  return v * 16;
}
function heuristic(st) {
  const p = st.player, d = target(st);
  if (!d) return 1e9;
  const viaRoute = routeEstimate(st);
  if (viaRoute !== null) return viaRoute / 120;
  let dist = Math.hypot(d.x + 8 - p.centerX, d.y + 16 - (p.y + p.h / 2));
  if (st.part <= st.world.partDoors.length) return dist / 120;
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
function solve(def, deaths, budget = Number(process.env.BUDGET || 250000), part = 0) {
  const start = new KF.Stage(def, deaths, { seen: {}, checkpoint: part || 1 });
  const open = new Heap();
  const seen = new Set([key(start, false)]);
  open.push({ st: start, held: false, g: 0, f: heuristic(start), seq: null });
  let expanded = 0, best = 0;
  const decide = def.noGates && !MARGIN ? 12 : DECIDE;
  while (open.size && expanded < budget) {
    const node = open.pop();
    expanded++;
    for (const a of ACTIONS) {
      const st = clone(node.st, new Map());
      const input = { left: a.dir < 0, right: a.dir > 0, jumpHeld: !!a.jump, jumpPressed: false };
      for (let i = 0; i < decide && st.state === 'play'; i++) {
        input.jumpPressed = i === 0 && a.jump && !node.held;
        if (st.combat) {
          const p = st.player;
          const visible = st.combat.enemies.filter((e) => e.hp > 0 &&
            Math.abs(e.x - p.x) < 290 &&
            !st.combat.wallBetween(p.centerX, p.y + 8, e.x + e.w / 2, e.y + e.h / 2));
          const target = visible.sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
          input.shoot = !!target; input.melee = !!target;
          if (target) { input.aimX = target.x + target.w / 2; input.aimY = target.y + target.h / 2; }
        }
        st.step(KF.STEP, input);
        st.events.length = 0;
      }
      const seq = { a, prev: node.seq };
      if (st.state === 'won' || (part && st.part > part)) return { ok: true, time: (node.g + decide * KF.STEP), expanded, seq };
      if (process.env.DEBUG && st.part > (solve.maxPart || 1)) { solve.maxPart = st.part; console.log('  passed part', st.part - 1, 'at', st.player.x.toFixed(0), st.player.y.toFixed(0), 't', st.t.toFixed(2)); }
      if (process.env.DEBUG && st.guide > (solve.maxGuide || 0)) { solve.maxGuide = st.guide; console.log('  reached guide', st.guide, 'at', st.player.x.toFixed(0), st.player.y.toFixed(0), 't', st.t.toFixed(2)); }
      if (process.env.DEBUG && st.state === 'dead' && st.player.centerX > best) { best = st.player.centerX; console.log('  died at', best.toFixed(0), st.player.y.toFixed(0), st.cause, st.t.toFixed(2)); }
      if (process.env.DEBUG && st.state === 'play' && st.player.centerX > (solve.far || 0)) { solve.far = st.player.centerX; if (Math.floor(solve.far / 16) !== Math.floor((solve.farP || 0) / 16)) { solve.farP = solve.far; console.log('  reached col', (solve.far / 16).toFixed(1), 'y', st.player.y.toFixed(0), 't', st.t.toFixed(2), 'door', st.world.door.x / 16); } }
      if (st.state !== 'play' || st.t > (def.doorLinks ? 120 : 60)) continue;
      const k = key(st, a.jump);
      if (seen.has(k)) continue;
      seen.add(k);
      const g = node.g + decide * KF.STEP;
      // Firing a trap and surviving is progress in this game (blocks revealed, doors scared off),
      // so such states get a small bonus.
      const fired = st.traps.reduce((n, tr) => n + (tr.fired ? 1 : 0), 0);
      const combatProgress = st.combat ? st.combat.enemies.reduce((n, e) => n + (e.maxHp - e.hp), 0) : 0;
      open.push({ st, held: !!a.jump, g, f: g + heuristic(st) * WEIGHT - fired * 1.5 - (st.part - 1 + st.guide) * 100 - combatProgress * 15, seq });
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
const dump = {}; // DUMP=file.json writes every solution as [dir, jump] per decision, for replays
for (const door of KF.Doors) {
  if (onlyDoor && door.id !== onlyDoor) continue;
  door.stages.forEach((def, i) => {
    if (onlyStage && Number(onlyStage) !== i + 1) return;
    for (const d of variants(def)) {
      if (process.env.DEATHS !== undefined && d !== Number(process.env.DEATHS)) continue;
      const t0 = Date.now();
      // A death restarts at the latest door, so each part is searched from its
      // own checkpoint; DUMP=1 or WHOLE=1 searches the whole level in one go.
      let r;
      if (def.doorLinks && !process.env.WHOLE && !process.env.DUMP) {
        r = { ok: true, time: 0, expanded: 0 };
        const only = process.env.PARTS ? process.env.PARTS.split(',').map(Number) : null; // PARTS=1,3 checks just those
        for (let part = 1; part <= def.doorLinks.length + 1 && r.ok; part++) {
          if (only && !only.includes(part)) continue;
          const one = solve(def, d, undefined, part);
          r = { ok: one.ok, time: r.time + (one.time || 0), expanded: r.expanded + one.expanded, seq: one.seq, part };
        }
      } else r = solve(def, d);
      const label = `${door.id} ${i + 1} "${def.name}" deaths=${d}${MARGIN ? ' [margin]' : ''}`;
      if (r.ok && process.env.DUMP) {
        const steps = []; for (let n = r.seq; n; n = n.prev) steps.push([n.a.dir, n.a.jump]);
        dump[`${door.id}-${i + 1}-${d}`] = steps.reverse();
      }
      if (r.ok) console.log(`OK   ${label}  ${r.time.toFixed(2)}s  (${r.expanded} nodes, ${Date.now() - t0}ms)` + (process.env.VERBOSE ? '\n     ' + describe(r.seq) : ''));
      else { failures++; console.log(`FAIL ${label}  no route found${r.part ? ' in part ' + r.part : ''} (${r.expanded} nodes)`); }
    }
  });
}
if (!KF.Doors.some((d) => d.stages.length)) console.log('No stages loaded.');
if (process.env.DUMP) fs.writeFileSync(process.env.DUMP, JSON.stringify(dump));
process.exit(failures ? 1 : 0);
