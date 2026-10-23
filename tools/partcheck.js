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
const profiles = new Set();
for (const door of sb.KF.Doors) {
  assert.equal(door.stages.length, 4, `${door.id} should have four levels`);
  door.stages.forEach((def, index) => {
    const world = new sb.KF.World(def), tag = `${door.id}-${index + 1}`;
    assert(world.door, `${tag} needs an exit`);
    assert(world.partDoors[0] && world.partDoors[1], `${tag} needs two intermediate doors`);
    assert.notDeepEqual(world.partDoors[0], world.partDoors[1], `${tag} doors must be separate`);
    assert(def.routeZones && def.routeZones.length === 3, `${tag} needs three distinct routes`);
    assert(def.routeZones[0].to - def.routeZones[0].from >= 90, `${tag} first route is too short`);
    assert(def.routeZones[1].to - def.routeZones[1].from >= 35, `${tag} middle route is too short`);
    assert(def.routeZones[2].to - def.routeZones[2].from >= 90, `${tag} final route is too short`);
    assert(world.partDoors[1].x - world.partDoors[0].x >= 30 * sb.KF.TILE,
      `${tag} doors are too close together`);
    assert(world.door.x - world.partDoors[1].x >= 30 * sb.KF.TILE,
      `${tag} exit is too close to door two`);
    assert(world.spawn.y - world.partDoors[0].y >= 10 * sb.KF.TILE,
      `${tag} needs a real climb to door one`);
    assert(world.pixelH > sb.KF.VIEW_H + 150, `${tag} needs vertical camera travel`);
    const heights = [def.routeZones[0].from, def.routeZones[2].from]
      .flatMap((from) => Array.from({ length: 15 }, (_, k) => {
        const col = from + k * 7;
        return def.map.findIndex((row) => '-=~'.includes(row[col] || '.'));
      }));
    const profile = heights.join(',');
    assert(!profiles.has(profile), `${tag} repeats another level's full outer route`);
    profiles.add(profile);
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
console.log(`PASS ${count} long levels have three distant doors, vertical routes, and ordered passage`);
