// Smoke test for the continuous hammer climb's physics and summit trigger.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const root = path.join(__dirname, '..');
const sb = { console, Math, JSON, Object, Array, Set, Map, Uint8Array, Error, parseInt, Number };
sb.window = sb; vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/core.js'), 'utf8'), sb);
let cleared = false;
sb.KF.Save = { realm: () => ({ bestHeight: 0 }), write: () => {}, completeNode: () => { cleared = true; } };
sb.KF.Audio = { music: () => {}, sfx: () => {} };
vm.runInContext(fs.readFileSync(path.join(root, 'js/scenes/climb.js'), 'utf8'), sb);
const mouse = { seen: true, x: 0, y: 0, down: true };
const input = { mouse, wasPressed: () => false, left: false, right: false };
const climb = new sb.KF.ClimbScene({ input, go: () => {} });
const startY = climb.y;
for (let i = 0; i < 60; i++) {
  mouse.x = climb.x;
  mouse.y = climb.y + 40 - climb.cam;
  climb.update(1 / 120);
}
assert(climb.y < startY - 40, 'pushing the hammer against the ground must lift the climber');
assert(climb.best > 0, 'climb progress must be recorded');
climb.x = 355; climb.vx = 120; climb.update(1 / 120);
assert(climb.x <= 335, 'the visible rock wall must block the climber');
climb.x = 50; climb.y = 100; climb.vx = climb.vy = 0; climb.update(0);
assert(climb.won && cleared, 'reaching the summit must clear the realm');
console.log('PASS hammer push, climb progress, rock collision, and summit clear');
