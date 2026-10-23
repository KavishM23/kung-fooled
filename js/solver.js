'use strict';
// The level checker's search, usable in the browser (the level editor's "PROVEN BEATABLE" check)
// and in Node (tools/chunks.js). Same method as tools/solve.js: run the real game logic headless
// and search for an input sequence that reaches the door.
(function (KF) {
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
  const ACTIONS = [];
  for (const dir of [1, 0, -1]) for (const jump of [1, 0]) ACTIONS.push({ dir, jump });

  function target(st) { return st.part === 2 && st.def.guides && st.def.guides[st.guide] ||
    st.world.partDoors[st.part - 1] || st.world.door; }
  function key(st, held) {
    const p = st.player, d = target(st);
    let k = `${Math.round(p.x / 2)},${Math.round(p.y / 2)},${Math.round(p.vx / 30)},${Math.round(p.vy / 50)},${p.grounded | 0},${p.gravDir},${p.launchT > 0 ? 1 : 0},${held | 0}${p.jumping | 0}${p.coyoteT > 0 ? 1 : 0}`;
    k += `|${st.part}|${st.guide}|${d ? Math.round(d.x / 4) + ',' + Math.round(d.y / 4) : ''}`;
    if (st.part < 3 && st.world.door) k += `|${Math.round(st.world.door.x / 4)},${Math.round(st.world.door.y / 4)}`;
    for (const tr of st.traps) k += tr.fired ? '1' : tr.pending >= 0 ? 'p' : '0';
    for (const tr of st.traps) {
      if (tr.def.type === 'lookSaw') k += `s${Math.round(tr.x / 4)}`;
      if (tr.def.type === 'lureFloor') k += `l${tr.mode[0]}${Math.round(Math.max(0, tr.timer) * 5)}`;
    }
    for (const tr of st.traps) if (tr.col !== undefined && tr.col !== null) { // ambush flames: timing only matters until they burn out
      const live = tr.t < tr.warnT + (tr.def.burn ?? 0.9);
      k += `|f${tr.col}:${live ? Math.floor(tr.t / 0.05) : 'x'}`;
    }
    for (const s of st.world.dynamicSolids) k += `,${Math.round(s.x / 4)}:${Math.round(s.y / 4)}:${s.active === false ? 0 : 1}`;
    if (st.def.traps && st.def.traps.some((t) => t.when && t.when.time !== undefined)) k += '|' + Math.floor(st.t / 0.25);
    for (const tr of st.traps) if (tr.period && tr.rect &&
      p.centerX >= tr.rect.x - 128 && p.centerX <= tr.rect.x + tr.rect.w + 128)
      k += '|' + Math.floor(((st.t + (tr.def.offset || 0)) % tr.period) / 0.1);
    if (st.combat) {
      k += '|' + [st.combat.health, st.combat.ammo, Math.round(st.combat.reload * 5), ...st.combat.enemies.map((e) => e.hp)].join(',');
      for (const b of st.combat.bullets) k += ';' + [Math.round(b.x / 8), Math.round(b.y / 8), b.enemy | 0].join(',');
    }
    return k;
  }
  const fields = new Map();
  function routeEstimate(st) {
    if (!st.def.noGates || (st.def.doorLinks && st.part !== 2) || !st.world.door) return null;
    let byPart = fields.get(st.def);
    if (!byPart) { byPart = new Map(); fields.set(st.def, byPart); }
    const targetKey = `${st.part}-${st.guide}`;
    let field = byPart.get(targetKey);
    if (!field) {
      const W = st.world.cols, H = st.world.rows, dist = new Float32Array(W * H).fill(1e9);
      const open = (c, r) => c >= 0 && r >= 0 && c < W && r < H && !'#=~'.includes((st.def.map[r] || '')[c] || '.');
      const d = target(st), q = [];
      const dc = Math.floor((d.x + 8) / 16), dr = Math.floor((d.y + 16) / 16);
      for (const [c, r] of [[dc, dr], [dc, dr - 1], [dc, dr + 1]])
        if (open(c, r)) { dist[r * W + c] = 0; q.push([c, r]); }
      for (let i = 0; i < q.length; i++) {
        const [c, r] = q[i], base = dist[r * W + c];
        for (const [nc, nr] of [[c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]]) {
          if (!open(nc, nr) || dist[nr * W + nc] <= base + 1) continue;
          dist[nr * W + nc] = base + 1; q.push([nc, nr]);
        }
      }
      field = { dist, W, H }; byPart.set(targetKey, field);
    }
    const p = st.player;
    const c = Math.max(0, Math.min(field.W - 1, Math.floor(p.centerX / 16)));
    const r = Math.max(0, Math.min(field.H - 1, Math.floor((p.y + p.h / 2) / 16)));
    const v = field.dist[r * field.W + c];
    return v >= 1e9 ? null : v * 16;
  }
  function heuristic(st) {
    const p = st.player, d = target(st);
    if (!d) return 1e9;
    const viaRoute = routeEstimate(st);
    if (viaRoute !== null) return viaRoute / 120;
    let dist = Math.hypot(d.x + 8 - p.centerX, d.y + 16 - (p.y + p.h / 2));
    if (st.part < 3) return dist / 120;
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

  KF.Solver = {
    // The attempt variants a stage has: deaths 0 .. (largest number named in any trap's `deaths`) + 1.
    variants(def) {
      let max = 0;
      for (const t of def.traps || []) {
        const list = t.deaths === undefined ? [] : Array.isArray(t.deaths) ? t.deaths : [t.deaths];
        for (const s of list) max = Math.max(max, parseInt(s, 10));
      }
      return Array.from({ length: max + 2 }, (_, i) => i);
    },
    // A generator: each next() expands up to `slice` search nodes and yields progress (0..1);
    // its return value is { ok, time, expanded }. opts: { decide, budget, weight, slice, tmax }.
    *search(def, deaths, opts = {}) {
      const DECIDE = opts.decide || (def.noGates ? 12 : 6), budget = opts.budget || 250000, WEIGHT = opts.weight || 2.5, slice = opts.slice || 1e9, tmax = opts.tmax || (def.doorLinks ? 120 : 60);
      const start = new KF.Stage(def, deaths);
      const open = new Heap(), seen = new Set([key(start, false)]);
      open.push({ st: start, held: false, g: 0, f: heuristic(start), seq: null });
      let expanded = 0;
      while (open.size && expanded < budget) {
        const node = open.pop();
        expanded++;
        if (expanded % slice === 0) yield expanded / budget;
        for (const a of ACTIONS) {
          const st = clone(node.st, new Map());
          const input = { left: a.dir < 0, right: a.dir > 0, jumpHeld: !!a.jump, jumpPressed: false };
          for (let i = 0; i < DECIDE && st.state === 'play'; i++) {
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
          if (st.state === 'won') return { ok: true, time: node.g + DECIDE * KF.STEP, expanded, seq };
          if (st.state !== 'play' || st.t > tmax) continue;
          const k = key(st, a.jump);
          if (seen.has(k)) continue;
          seen.add(k);
          const g = node.g + DECIDE * KF.STEP;
          const fired = st.traps.reduce((n, tr) => n + (tr.fired ? 1 : 0), 0);
          const combatProgress = st.combat ? st.combat.enemies.reduce((n, e) => n + (e.maxHp - e.hp), 0) : 0;
          open.push({ st, held: !!a.jump, g, f: g + heuristic(st) * WEIGHT - fired * 1.5 - (st.part - 1 + st.guide) * 100 - combatProgress * 15, seq });
        }
      }
      return { ok: false, expanded };
    },
    solve(def, deaths, opts) {
      const it = this.search(def, deaths, opts);
      let r = it.next();
      while (!r.done) r = it.next();
      return r.value;
    },
  };
})(window.KF);
