// Every realm level travels through four long parts, with three checkpoints.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const root = path.join(__dirname, '..');
const sb = { console, Math, JSON, Object, Array, Set, Map, Uint8Array, Error, parseInt, Number };
sb.window = sb; vm.createContext(sb);
for (const file of ['core.js', 'physics.js', 'world.js', 'player.js', 'traps.js', 'combat.js', 'stage.js', 'rules.js', 'levels/doors.js', 'levels/routes.js'])
  vm.runInContext(fs.readFileSync(path.join(root, 'js', file), 'utf8'), sb, { filename: file });
for (const file of fs.readdirSync(path.join(root, 'js/levels')).filter((f) => /^(world\d+|tall_[a-z]+)\.js$/.test(f)).sort())
  vm.runInContext(fs.readFileSync(path.join(root, 'js/levels', file), 'utf8'), sb, { filename: file });
for (const file of (fs.existsSync(path.join(root, 'js/families')) ? fs.readdirSync(path.join(root, 'js/families')) : []).filter((f) => f.endsWith('.js')).sort())
  try { vm.runInContext(fs.readFileSync(path.join(root, 'js/families', file), 'utf8'), sb, { filename: file }); }
  catch (e) { console.log(`WARNING: family ${file} did not load: ${e.message}`); }
let count = 0, authoredCount = 0;
const baitPairs = new Set();
const usedBaits = new Set();
const naiveOutcomes = {};
// ONLY=pocket,woodblock checks just those realms (the door-order test below always runs).
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
for (const door of sb.KF.Doors) {
  if (ONLY && !ONLY.includes(door.id)) continue;
  assert.equal(door.stages.length, 4, `${door.id} should have four levels`);
  door.stages.forEach((def, index) => {
    const world = new sb.KF.World(def), tag = `${door.id}-${index + 1}`;
    assert(world.door, `${tag} needs an exit`);
    assert.equal(world.partDoors.length, 3, `${tag} needs three intermediate doors`);
    assert(world.partDoors.every(Boolean), `${tag} needs all three doors`);
    assert.equal(new Set(world.partDoors.map((d) => d.x)).size, 3, `${tag} doors must be separate`);
    assert(def.routeZones && def.routeZones.length === 4, `${tag} needs four distinct routes`);
    assert(def.parts && def.parts.length === 4 && new Set(def.parts.map((p) => p.name)).size === 4,
      `${tag} needs four named locations`);
    assert(def.doorLinks && def.doorLinks.length === 3, `${tag} needs three transitions`);
    if (def.authored) {
      // Hand-built realm parts: each part's headline trick must catch a player who
      // simply runs at it, and grounded families may not leave blocks in the air.
      const fam = sb.KF.Families.get(def.family);
      assert(fam, `${tag} names an unknown family ${def.family}`);
      assert(def.baits && def.baits.length === 3, `${tag} needs three built parts`);
      assert.equal(new Set(def.baits.map((b) => b.shape)).size, 3, `${tag} parts need different layouts`);
      if (fam.grounded !== false) {
        const grounded = new Set(), q = [];
        const solidAt = (c, r) => (def.map[r] || '')[c] === '#';
        for (let c = 0; c < world.cols; c++) if (solidAt(c, world.rows - 1)) { grounded.add(`${c},${world.rows - 1}`); q.push([c, world.rows - 1]); }
        for (let i = 0; i < q.length; i++) {
          const [c, r] = q[i];
          for (const [nc, nr] of [[c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]]) {
            const k = `${nc},${nr}`;
            if (!grounded.has(k) && solidAt(nc, nr)) { grounded.add(k); q.push([nc, nr]); }
          }
        }
        for (const route of [def.routeZones[0], def.routeZones[2], def.routeZones[3]])
          for (let c = route.from; c < route.to; c++) for (let r = 0; r < world.rows; r++)
            assert((def.map[r] || '')[c] !== '#' || grounded.has(`${c},${r}`), `${tag} (${def.family}) has a floating block at ${c},${r}`);
      }
      def.baits.forEach((bait, act) => {
        const part = [1, 3, 4][act];
        assert(bait.trick >= 0 && def.traps[bait.trick], `${tag} part ${part} (${bait.shape}) needs a headline trick`);
        if (!bait.from) return;
        const attempt = new sb.KF.Stage(def), p = attempt.player;
        attempt.part = part;
        p.x = (bait.from[0] + 0.5) * sb.KF.TILE - p.w / 2; p.y = bait.from[1] * sb.KF.TILE - p.h;
        p.prevX = p.x; p.prevY = p.y;
        const trap = attempt.traps.find((t) => t.def === def.traps[bait.trick]);
        assert(trap, `${tag} part ${part} trick is missing on the first attempt`);
        const forward = { left: !!attempt.rule.reverse, right: !attempt.rule.reverse, jumpHeld: false, jumpPressed: false };
        let sprung = false;
        for (let tick = 0; tick < 1500 && attempt.state === 'play' && attempt.part === part; tick++) {
          attempt.step(sb.KF.STEP, forward);
          sprung ||= trap.fired || trap.mode === 'warning' || trap.mode === 'gone' || trap.mode === 'going' || !!trap.turned || !!trap.flipped;
        }
        assert(sprung, `${tag} part ${part} (${bait.shape}) trick must spring on the obvious straight path`);
        const outcome = attempt.state === 'dead' ? 'death' : attempt.part > part ? 'passed' : 'blocked';
        assert.notEqual(outcome, 'passed', `${tag} part ${part} (${bait.shape}): running straight at the trick must not win`);
        (naiveOutcomes[bait.type] ||= {})[outcome] = ((naiveOutcomes[bait.type] || {})[outcome] || 0) + 1;
      });
      authoredCount++;
    } else {
      assert(def.baits && def.baits.length === 3, `${tag} needs three designed baits`);
      assert.equal(new Set(def.baits.map((b) => b.type)).size, 3, `${tag} tricks should develop`);
      assert.equal(new Set(def.baits.map((b) => b.shape)).size, 3,
        `${tag} generated districts need different silhouettes`);
      assert(def.concept, `${tag} needs a trap concept`);
      // Solid ground anywhere in a generated district must reach the bottom of
      // the map: buildings, cliffs and floors, never a block floating in the air.
      const grounded = new Set(), q = [];
      // A doorway is a gap in a load-bearing wall; the lintel above it still stands on it.
      const doorways = def.structures.filter((s) => s.kind === 'doorway');
      const solidAt = (c, r) => (def.map[r] || '')[c] === '#' ||
        doorways.some((d) => c >= d.x0 && c < d.x1 && r >= d.r0 && r < d.r1);
      for (let c = 0; c < world.cols; c++) if (solidAt(c, world.rows - 1)) { grounded.add(`${c},${world.rows - 1}`); q.push([c, world.rows - 1]); }
      for (let i = 0; i < q.length; i++) {
        const [c, r] = q[i];
        for (const [nc, nr] of [[c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]]) {
          const k = `${nc},${nr}`;
          if (!grounded.has(k) && solidAt(nc, nr)) { grounded.add(k); q.push([nc, nr]); }
        }
      }
      for (const [act, route] of [def.routeZones[0], def.routeZones[2], def.routeZones[3]].entries()) {
        assert(route.to - route.from >= 56, `${tag} district ${act + 1} needs room to breathe`);
        for (let c = route.from; c < route.to; c++) for (let r = 0; r < world.rows; r++)
          assert((def.map[r] || '')[c] !== '#' || grounded.has(`${c},${r}`), `${tag} has a floating block at ${c},${r}`);
      }
      for (const [act, bait] of def.baits.entries()) {
        assert(def.traps.some((t) => t.type === bait.type && t.at[0] === bait.x),
          `${tag} ${bait.type} bait must have a real trap`);
        assert(world.visualSolid(bait.x, bait.floor), `${tag} bait needs an apparent safe floor`);
        // A few large changes in height, each held for a while; no one-tile bumps.
        const walk = bait.sections.filter((s) => s.kind !== 'bridge');
        const heights = walk.map((s) => s.floor);
        assert(Math.max(...heights) - Math.min(...heights) >= 6, `${tag} act ${act + 1} needs a real climb or drop`);
        assert(new Set(heights).size <= 4, `${tag} act ${act + 1} changes height too often`);
        for (const s of walk) assert(s.x1 - s.x0 >= 7, `${tag} act ${act + 1} ${s.kind} is too short to be a place`);
        for (let i = 1; i < heights.length; i++) {
          const step = Math.abs(heights[i] - heights[i - 1]);
          assert(step === 0 || step >= 4, `${tag} act ${act + 1} has a token ${step}-tile step`);
        }
        usedBaits.add(bait.type);
      }
      // From the apparently safe floor, simply holding forward should
      // reveal the bait and cause an understandable failure.
      def.baits.forEach((bait, act) => {
        const attempt = new sb.KF.Stage(def);
        const p = attempt.player;
        const part = [1, 3, 4][act];
        attempt.part = part;
        p.x = (bait.x - 1.5) * sb.KF.TILE - p.w / 2;
        p.y = bait.floor * sb.KF.TILE - p.h;
        p.prevX = p.x; p.prevY = p.y;
        const trap = attempt.traps.find((t) => t.def.type === bait.type && t.def.at[0] === bait.x);
        const forward = { left: !!attempt.rule.reverse, right: !attempt.rule.reverse,
          jumpHeld: false, jumpPressed: false };
        let sprung = false;
        for (let tick = 0; tick < 1200 && attempt.state === 'play' && attempt.part === part; tick++) {
          attempt.step(sb.KF.STEP, forward);
          sprung ||= trap.fired || trap.mode === 'warning' || trap.mode === 'gone';
        }
        assert(sprung, `${tag} act ${act + 1} bait must spring on the obvious straight path`);
        const outcome = attempt.state === 'dead' ? 'death' : attempt.part > part ? 'passed' : 'blocked';
        assert.equal(outcome, 'death', `${tag} act ${act + 1} straight run should expose the mistake`);
        if (bait.type !== 'crusher') {
          // Level Devil rule: the retry looks exactly like the first try. Nothing marks the trap.
          const retry = new sb.KF.Stage(def, 1, attempt.memory);
          const remembered = retry.traps.find((t) => t.def.type === bait.type && t.def.at[0] === bait.x);
          assert(remembered && !remembered.seen && !remembered.fired, `${tag} act ${act + 1} bait must be hidden again on retry`);
        }
        (naiveOutcomes[bait.type] ||= {})[outcome] =
          ((naiveOutcomes[bait.type] || {})[outcome] || 0) + 1;
      });
      baitPairs.add(def.baits.map((b) => b.type).join('/'));
    }
    count++;
  });
}
// The door locks, checked without the level's traps (a running exit would dodge the touch).
const def = Object.assign({}, sb.KF.Doors[0].stages[0], { traps: [] }), run = new sb.KF.Stage(def);
const input = { left: false, right: false, jumpHeld: false, jumpPressed: false };
const touch = (d) => { run.player.x = d.x + 2; run.player.y = d.y + 5; run.step(0, input); };
touch(run.world.door);
assert.equal(run.state, 'play', 'the exit must stay locked until all intermediate doors are passed');
touch(run.world.partDoors[1]);
assert.equal(run.part, 1, 'the second door must stay locked until the first is passed');
touch(run.world.partDoors[2]);
assert.equal(run.part, 1, 'the third door must stay locked until the first is passed');
touch(run.world.partDoors[0]);
assert.equal(run.part, 2);
assert.equal(run.player.centerX, def.doorLinks[0].x,
  'door one should lead into the middle route');
touch(run.world.partDoors[1]);
assert.equal(run.part, 3);
const retry = new sb.KF.Stage(def, 1, run.memory);
assert.equal(retry.part, 3, 'retry should start at the latest completed section');
assert.equal(retry.player.centerX, def.doorLinks[1].x);
touch(run.world.partDoors[2]);
assert.equal(run.part, 4);
const finalRetry = new sb.KF.Stage(def, 1, run.memory);
assert.equal(finalRetry.part, 4, 'retry should preserve the third checkpoint');
assert.equal(finalRetry.player.centerX, def.doorLinks[2].x);
touch(run.world.door);
assert.equal(run.state, 'won');
assert.deepEqual(Array.from(run.events.filter((e) => e.type === 'part'), (e) => e.part), [2, 3, 4]);
if (!ONLY && count > authoredCount) {
  assert.equal(usedBaits.size, sb.KF.LongRoutes.BAITS.length, 'all bait types should appear');
  assert.equal(baitPairs.size, sb.KF.LongRoutes.BAITS.length, 'bait pairs should rotate');
}
console.log(`PASS ${count} levels have four named parts and three checkpoints; ${authoredCount} are built from realm families`);
console.log('Straight-run bait outcomes:', naiveOutcomes);
