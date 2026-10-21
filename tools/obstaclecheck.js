// Checks the two timed hazard types without rendering or relying on a particular route.
'use strict';
const assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..');
const sb = { console, Math, JSON, Object, Array, Set, Map, Uint8Array, Error, parseInt, Number };
sb.window = sb; vm.createContext(sb);
for (const file of ['core.js', 'physics.js', 'world.js', 'player.js', 'traps.js', 'combat.js', 'stage.js', 'rules.js', 'levels/doors.js'])
  vm.runInContext(fs.readFileSync(path.join(root, 'js', file), 'utf8'), sb, { filename: file });
for (const file of fs.readdirSync(path.join(root, 'js/levels')).filter((f) => /^world\d+\.js$/.test(f)).sort())
  vm.runInContext(fs.readFileSync(path.join(root, 'js/levels', file), 'utf8'), sb, { filename: file });
const KF = sb.KF, retro = KF.Doors.find((d) => d.id === 'oldtv');
const moving = new KF.Stage(retro.stages[0]).traps.find((t) => t.def.type === 'movingSpikes');
const start = moving.x;
moving.stage.t = moving.period / 4; moving.tick();
assert(moving.x > start + 20, 'spikes should move toward their patrol end');
let box = KF.spikeRect('up', moving.x, moving.y);
assert(moving.kills({ x: box.x, y: box.y, w: box.w, h: box.h }), 'moving spikes must damage on contact');
assert(!moving.kills({ x: 0, y: 0, w: 8, h: 8 }), 'moving spikes must not damage at a distance');
moving.stage.t = moving.period; moving.tick();
assert.equal(moving.x, start, 'moving spikes should return home');
const beam = new KF.Stage(retro.stages[1]).traps.find((t) => t.def.type === 'pulseBeam');
const target = { x: beam.rect.x, y: beam.rect.y + 15, w: beam.rect.w, h: 8 };
beam.stage.t = 0;
assert(beam.active && beam.kills(target), 'lit beam must damage on contact');
beam.stage.t = beam.on + 0.2;
assert(!beam.active && !beam.kills(target), 'beam must leave a safe timing window');
console.log('PASS moving spike patrol, collision, return, beam on/off collision');
