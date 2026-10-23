// Every realm level travels through four compact parts, with three checkpoints.
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
let count = 0;
const baitPairs = new Set();
const usedBaits = new Set();
const naiveOutcomes = {};
for (const door of sb.KF.Doors) {
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
    assert.equal(new Set(def.baits.map((b) => b.bands.join(','))).size, 3,
      `${tag} generated sections need different silhouettes`);
    for (const route of [def.routeZones[0], def.routeZones[2], def.routeZones[3]]) {
      assert(route.to - route.from <= 24, `${tag} outer act should fit within one view`);
      assert(route.to - route.from >= 20, `${tag} door should require a real approach`);
    }
    assert(def.baits && def.baits.length === 3, `${tag} needs three designed baits`);
    assert.equal(new Set(def.baits.map((b) => b.type)).size, 3, `${tag} tricks should develop`);
    assert(def.concept, `${tag} needs a trap concept`);
    assert(world.partDoors[0].x - world.spawn.x < sb.KF.VIEW_W - 40,
      `${tag} first door should be visible from the start`);
    assert(world.door.x - def.doorLinks[2].x < sb.KF.VIEW_W - 40,
      `${tag} final door should be visible on arrival`);
    for (const [act, bait] of def.baits.entries()) {
      assert(def.traps.some((t) => t.type === bait.type && t.at[0] === bait.x),
        `${tag} ${bait.type} bait must have a real trap`);
      assert(world.visualSolid(bait.x, bait.floor), `${tag} bait needs an apparent safe floor`);
      const heights = bait.profile;
      assert.equal(heights.length, 4, `${tag} act needs four playable height bands`);
      assert(new Set(heights).size >= 3 && Math.max(...heights) - Math.min(...heights) >= 3,
        `${tag} act needs a meaningful change in elevation`);
      const changes = heights.slice(1).map((h, i) => Math.sign(h - heights[i]));
      if (act === 0) assert(changes[0] !== changes[1] && changes[1] !== changes[2],
        `${tag} approach should weave through two height changes`);
      if (act === 1) assert(changes.every((v) => v < 0),
        `${tag} upper passage should make a sustained climb`);
      if (act === 2) assert(changes[0] > 0 && changes[1] < 0 && changes[2] < 0,
        `${tag} finale should drop and then climb`);
      assert(changes.every((n) => n !== 0) && heights.every((h, i) =>
        i === 0 || h - heights[i - 1] >= -2), `${tag} climb must have jump margin`);
      assert.equal(bait.bands.length, 5, `${tag} needs four band boundaries`);
      for (let band = 0; band < 4; band++) {
        assert(world.visualSolid(bait.x0 + bait.bands[band] + 1, heights[band]),
          `${tag} band ${band + 1} must be a playable floor`);
      }
      usedBaits.add(bait.type);
    }
    // From the apparently safe lower band, simply holding forward should
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
        const retry = new sb.KF.Stage(def, 1, attempt.memory);
        const remembered = retry.traps.find((t) => t.def.type === bait.type && t.def.at[0] === bait.x);
        assert(remembered.seen, `${tag} act ${act + 1} bait should be marked on retry`);
      }
      (naiveOutcomes[bait.type] ||= {})[outcome] =
        ((naiveOutcomes[bait.type] || {})[outcome] || 0) + 1;
    });
    baitPairs.add(def.baits.map((b) => b.type).join('/'));
    count++;
  });
}
const def = sb.KF.Doors[0].stages[0], run = new sb.KF.Stage(def);
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
assert.equal(usedBaits.size, sb.KF.LongRoutes.BAITS.length, 'all bait types should appear');
assert.equal(baitPairs.size, sb.KF.LongRoutes.BAITS.length, 'bait pairs should rotate');
console.log(`PASS ${count} levels have four named parts, three checkpoints and three readable baits`);
console.log('Straight-run bait outcomes:', naiveOutcomes);
