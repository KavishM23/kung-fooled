// Every realm level requires two intermediate doors before its exit.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const root = path.join(__dirname, '..');
const sb = { console, Math, JSON, Object, Array, Set, Map, Uint8Array, Error, parseInt, Number };
sb.window = sb; vm.createContext(sb);
for (const file of ['core.js', 'physics.js', 'world.js', 'player.js', 'traps.js', 'combat.js', 'stage.js', 'rules.js', 'levels/doors.js'])
  vm.runInContext(fs.readFileSync(path.join(root, 'js', file), 'utf8'), sb, { filename: file });
for (const file of fs.readdirSync(path.join(root, 'js/levels')).filter((f) => /^(world\d+|tall_[a-z]+)\.js$/.test(f)).sort())
  vm.runInContext(fs.readFileSync(path.join(root, 'js/levels', file), 'utf8'), sb, { filename: file });
let count = 0;
for (const door of sb.KF.Doors) {
  if (door.single) { assert.equal(door.stages.length, 1); continue; }
  assert.equal(door.stages.length, 4, `${door.id} should have four levels`);
  door.stages.forEach((def, index) => {
    const world = new sb.KF.World(def), tag = `${door.id}-${index + 1}`;
    assert(world.door, `${tag} needs an exit`);
    assert(world.partDoors[0] && world.partDoors[1], `${tag} needs two intermediate doors`);
    assert.notDeepEqual(world.partDoors[0], world.partDoors[1], `${tag} doors must be separate`);
    if (!def.noGates) {
      assert(world.partDoors[0].y < world.partDoors[1].y,
        `${tag} should climb to door one, then descend to door two`);
      assert(world.spawn.y - world.partDoors[0].y >= 200 && world.pixelH > sb.KF.VIEW_H + 150,
        `${tag} needs enough vertical travel to move the camera`);
      assert(def.map.some((row) => row.includes('-')), `${tag} needs climbable shelves`);
    }
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
assert.equal(run.player.y + run.player.h, run.world.partDoors[0].y + run.world.partDoors[0].h,
  'entering an intermediate door should settle the player on its shelf');
touch(run.world.partDoors[1]);
assert.equal(run.part, 3);
touch(run.world.door);
assert.equal(run.state, 'won');
assert.deepEqual(Array.from(run.events.filter((e) => e.type === 'part'), (e) => e.part), [2, 3]);
console.log(`PASS ${count} levels require three doors in order; ordinary levels climb and descend`);
