// Every realm level requires two intermediate doors before its exit.
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
    assert(world.partDoors[0] && world.partDoors[1], `${tag} needs two intermediate doors`);
    assert.notDeepEqual(world.partDoors[0], world.partDoors[1], `${tag} doors must be separate`);
    assert(def.routeZones && def.routeZones.length === 3, `${tag} needs three distinct routes`);
    for (const route of [def.routeZones[0], def.routeZones[2]]) {
      assert(route.to - route.from <= 24, `${tag} outer act should fit within one view`);
      assert(route.to - route.from >= 20, `${tag} door should require a real approach`);
    }
    assert(def.baits && def.baits.length === 2, `${tag} needs two designed baits`);
    assert.notEqual(def.baits[0].type, def.baits[1].type, `${tag} should change its trick at the last door`);
    assert(world.partDoors[0].x - world.spawn.x < sb.KF.VIEW_W - 40,
      `${tag} first door should be visible from the start`);
    assert(world.door.x - def.doorLinks[1].x < sb.KF.VIEW_W - 40,
      `${tag} final door should be visible on arrival`);
    for (const bait of def.baits) {
      assert(def.traps.some((t) => t.type === bait.type && t.at[0] === bait.x),
        `${tag} ${bait.type} bait must have a real trap`);
      assert(world.visualSolid(bait.x, bait.floor), `${tag} bait needs an apparent safe floor`);
      const heights = bait.profile;
      assert.equal(heights.length, 4, `${tag} act needs four playable height bands`);
      assert(new Set(heights).size >= 3 && Math.max(...heights) - Math.min(...heights) >= 3,
        `${tag} act needs a meaningful change in elevation`);
      const changes = heights.slice(1).map((h, i) => Math.sign(h - heights[i]));
      assert(changes[0] !== changes[1] && changes[1] !== changes[2],
        `${tag} route should reverse vertical direction twice`);
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
      attempt.part = act ? 3 : 1;
      p.x = (bait.x0 + 8.5) * sb.KF.TILE - p.w / 2;
      p.y = bait.floor * sb.KF.TILE - p.h;
      p.prevX = p.x; p.prevY = p.y;
      const trap = attempt.traps.find((t) => t.def.type === bait.type && t.def.at[0] === bait.x);
      const forward = { left: !!attempt.rule.reverse, right: !attempt.rule.reverse,
        jumpHeld: false, jumpPressed: false };
      let sprung = false;
      for (let tick = 0; tick < 1200 && attempt.state === 'play' && attempt.part === (act ? 3 : 1); tick++) {
        attempt.step(sb.KF.STEP, forward);
        sprung ||= trap.fired || trap.mode === 'warning' || trap.mode === 'gone';
      }
      assert(sprung, `${tag} act ${act + 1} bait must spring on the obvious straight path`);
      const outcome = attempt.state === 'dead' ? 'death' : attempt.part > (act ? 3 : 1) ? 'passed' : 'blocked';
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
assert.equal(run.state, 'play', 'the exit must stay locked until both intermediate doors are passed');
touch(run.world.partDoors[1]);
assert.equal(run.part, 1, 'the second door must stay locked until the first is passed');
touch(run.world.partDoors[0]);
assert.equal(run.part, 2);
assert.equal(run.player.centerX, def.doorLinks[0].x,
  'door one should lead into the middle route');
touch(run.world.partDoors[1]);
assert.equal(run.part, 3);
touch(run.world.door);
assert.equal(run.state, 'won');
assert.deepEqual(Array.from(run.events.filter((e) => e.type === 'part'), (e) => e.part), [2, 3]);
assert.equal(usedBaits.size, sb.KF.LongRoutes.BAITS.length, 'all bait types should appear');
assert.equal(baitPairs.size, sb.KF.LongRoutes.BAITS.length, 'bait pairs should rotate');
console.log(`PASS ${count} levels have three ordered doors and two distinct readable baits`);
console.log('Straight-run bait outcomes:', naiveOutcomes);
