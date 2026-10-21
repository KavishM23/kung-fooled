// Checks the level chunks used by the Endless Dojo and the Daily Troll.
// Usage:  node tools/chunks.js            every chunk alone, every attempt variant
//         node tools/chunks.js shy        one chunk
//         MARGIN=1 node tools/chunks.js   human-precision mode (100 ms inputs, 5% weaker jump)
//         MIX=40 node tools/chunks.js     also 40 random assemblies, as the game makes them
//         DAILY=5 FROM=0 node tools/chunks.js   the Daily Troll stages for days 1 to 5
'use strict';
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FILES = ['core.js', 'physics.js', 'world.js', 'player.js', 'traps.js', 'stage.js', 'rules.js', 'levels/doors.js', 'levels/chunks.js', 'solver.js', 'modes.js'];
const sandbox = { console, Math, JSON, Object, Array, Set, Map, Uint8Array, Error, parseInt, Number, Date };
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const f of FILES) vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', f), 'utf8'), sandbox, { filename: f });
const KF = sandbox.KF;

const MARGIN = !!process.env.MARGIN;
if (MARGIN) KF.PlayerTuning.jumpVel *= 0.95;
const opts = { decide: MARGIN ? 12 : 6 };

let failures = 0;
function check(def, label) {
  for (const d of KF.Solver.variants(def)) {
    const t0 = Date.now(), r = KF.Solver.solve(def, d, opts);
    const tag = `${label} deaths=${d}${MARGIN ? ' [margin]' : ''}`;
    if (r.ok) console.log(`OK   ${tag}  ${r.time.toFixed(2)}s (${r.expanded} nodes, ${Date.now() - t0}ms)`);
    else { failures++; console.log(`FAIL ${tag}  no route (${r.expanded} nodes)`); }
  }
}
const only = process.argv[2];
for (const c of KF.Chunks.all) {
  if (only && c.id !== only) continue;
  check(KF.Chunks.assemble([c.id], c.id), `chunk ${c.id.padEnd(12)}`);
}
// Random assemblies, made exactly the way the game makes them.
const MIX = Number(process.env.MIX || 0);
for (let i = 0; i < MIX; i++) {
  const room = KF.Modes.endlessRoom(1000 + i * 7919, i % 12);
  check(room, `endless room ${i % 12} seed ${1000 + i * 7919}`);
}
const FROM = Number(process.env.FROM || 0); // DAILY=5 FROM=10 checks days 10 to 14
for (let i = FROM; i < FROM + Number(process.env.DAILY || 0); i++) {
  const day = KF.Modes.dailyDef(i);
  check(day, `daily #${i + 1}`);
}
process.exit(failures ? 1 : 0);
