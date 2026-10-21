// Functional checks for the integrated SUPERHOT platforming finale.
'use strict';
const assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..');
const sb = { console, Math, JSON, Object, Array, Set, Map, Uint8Array, Error, parseInt, Number };
sb.window = sb; vm.createContext(sb);
for (const file of ['core.js', 'physics.js', 'world.js', 'player.js', 'traps.js', 'combat.js', 'stage.js', 'rules.js', 'levels/doors.js'])
  vm.runInContext(fs.readFileSync(path.join(root, 'js', file), 'utf8'), sb, { filename: file });
for (const file of fs.readdirSync(path.join(root, 'js/levels')).filter((f) => /^world\d+\.js$/.test(f)).sort())
  vm.runInContext(fs.readFileSync(path.join(root, 'js/levels', file), 'utf8'), sb, { filename: file });
const KF = sb.KF, def = KF.Doors.find((d) => d.id === 'cyber').stages[3];
const empty = { left: false, right: false, jumpHeld: false, jumpPressed: false, shoot: false, melee: false, block: false };
assert.equal(def.style, 'superhot');
assert.equal(def.combat.enemies.length, 4);
const st = new KF.Stage(def), c = st.combat;
assert.equal(c.remaining, 4);
st.step(KF.STEP, empty);
assert(st.t > 0 && st.t < KF.STEP * 0.07, 'world must crawl when input stops');
// Reaching the door early cannot skip the enemies.
const d = st.world.door;
st.player.x = d.x + 3; st.player.y = 154;
st.step(KF.STEP, { ...empty, left: true, right: true });
assert.equal(st.state, 'play', 'exit must stay locked during combat');
// Two aimed shots from the real platformer controller kill a sentinel.
const first = c.enemies[0];
st.player.x = first.x - 52; st.player.y = first.y + 4; st.player.vx = st.player.vy = 0;
for (let tick = 0; tick < 75 && first.hp > 0; tick++) {
  st.step(KF.STEP, { ...empty, left: true, right: true, shoot: tick % 25 === 0,
    aimX: first.x + 6, aimY: first.y + 10 });
}
assert.equal(first.hp, 0, 'aimed shots should hit enemies in the level');
assert.equal(c.remaining, 3);
assert(c.shards.length > 0, 'defeated crystal enemies should shatter');
// Bullets are visible projectiles and a facing block prevents damage.
const hp = c.health, p = st.player;
c.invul = 0; p.facing = 1; p.x = 35; p.y = 154;
c.fire(p.centerX + 15, p.y + 10, -1, 0, true);
for (let i = 0; i < 22; i++) c.update(KF.STEP, { ...empty, block: true });
assert.equal(c.health, hp, 'blocking toward a bullet should prevent damage');
c.invul = 0;
c.fire(p.centerX + 15, p.y + 10, -1, 0, true);
for (let i = 0; i < 22; i++) c.update(KF.STEP, empty);
assert.equal(c.health, hp - 1, 'unblocked bullets should damage the player');
for (const e of c.enemies) c.hurtEnemy(e, e.hp);
assert(c.cleared);
p.x = d.x + 3; p.y = 154; p.vx = p.vy = 0;
st.step(KF.STEP, { ...empty, left: true, right: true });
assert.equal(st.state, 'won', 'exit must open once the boss and sentinels are defeated');
console.log('PASS SUPERHOT slowdown, exit gate, aiming, shatter, blocking, damage, boss clear');
