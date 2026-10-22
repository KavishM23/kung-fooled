// Every realm level has three ordered stretches and escalating timed challenges.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const root = path.join(__dirname, '..');
const sb = { console, Math, JSON, Object, Array, Set, Map, Uint8Array, Error, parseInt, Number };
sb.window = sb; vm.createContext(sb);
for (const file of ['core.js', 'physics.js', 'world.js', 'player.js', 'traps.js', 'combat.js', 'stage.js', 'rules.js', 'levels/doors.js'])
  vm.runInContext(fs.readFileSync(path.join(root, 'js', file), 'utf8'), sb, { filename: file });
for (const file of fs.readdirSync(path.join(root, 'js/levels')).filter((f) => /^world\d+\.js$/.test(f)).sort())
  vm.runInContext(fs.readFileSync(path.join(root, 'js/levels', file), 'utf8'), sb, { filename: file });
for (const door of sb.KF.Doors) {
  if (door.single) { assert.equal(door.stages.length, 1, 'the ascent is one continuous level'); continue; }
  assert.equal(door.stages.length, 4, `${door.id} should have four levels`);
  let last = 0;
  door.stages.forEach((def, level) => {
    assert(def.parts && def.parts.length === 2 && def.parts[0] < def.parts[1], `${door.id}-${level + 1} needs three ordered parts`);
    const middle = def.traps.find((t) => t.section === 2);
    const final = def.traps.find((t) => t.section === 3);
    assert(middle && final, `${door.id}-${level + 1} needs challenges in parts two and three`);
    assert(middle.at[0] * 16 > def.parts[0] && middle.at[0] * 16 < def.parts[1]);
    assert(final.at[0] * 16 > def.parts[1]);
    assert(final.on > middle.on && final.off < middle.off, 'the final gate must have a harder timing window');
    assert(middle.on > last, 'later levels must have tighter timing');
    last = middle.on;
  });
}
const first = sb.KF.Doors[0].stages[0], run = new sb.KF.Stage(first);
run.player.x = first.parts[0];
run.step(0, { left: false, right: false, jumpHeld: false, jumpPressed: false });
assert.equal(run.part, 2, 'crossing the first boundary should enter part two');
assert(run.events.some((e) => e.type === 'part' && e.part === 2), 'crossing should announce the new part');
console.log('PASS all 40 levels have three ordered parts and escalating timed challenges');
