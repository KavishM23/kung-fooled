// Functional checks for the integrated SUPERHOT platforming finale.
'use strict';
const assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..');
const sb = { console, Math, JSON, Object, Array, Set, Map, Uint8Array, Error, parseInt, Number };
sb.window = sb; vm.createContext(sb);
for (const file of ['core.js', 'physics.js', 'world.js', 'player.js', 'traps.js', 'combat.js', 'stage.js', 'rules.js', 'levels/doors.js', 'levels/routes.js'])
  vm.runInContext(fs.readFileSync(path.join(root, 'js', file), 'utf8'), sb, { filename: file });
for (const file of fs.readdirSync(path.join(root, 'js/levels')).filter((f) => /^world\d+\.js$/.test(f)).sort())
  vm.runInContext(fs.readFileSync(path.join(root, 'js/levels', file), 'utf8'), sb, { filename: file });
for (const file of (fs.existsSync(path.join(root, 'js/families')) ? fs.readdirSync(path.join(root, 'js/families')) : []).filter((f) => f.endsWith('.js')).sort())
  try { vm.runInContext(fs.readFileSync(path.join(root, 'js/families', file), 'utf8'), sb, { filename: file }); }
  catch (e) { console.log(`WARNING: family ${file} did not load: ${e.message}`); }
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
st.player.x = d.x + 3; st.player.y = d.y + 5;
st.step(KF.STEP, { ...empty, left: true, right: true });
assert.equal(st.state, 'play', 'exit must stay locked during combat');
const [doorOne, doorTwo] = st.world.partDoors;
st.player.x = doorOne.x + 2; st.player.y = doorOne.y + 5;
st.step(0, empty);
assert.equal(st.part, 2);
st.player.x = doorTwo.x + 2; st.player.y = doorTwo.y + 5;
st.step(0, empty);
assert.equal(st.part, 2, 'door two must keep the player in the combat district until it is cleared');
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
for (const checkpoint of st.world.partDoors) {
  p.x = checkpoint.x + 2; p.y = checkpoint.y + 5; p.vx = p.vy = 0;
  st.step(0, empty);
}
assert.equal(st.part, 4, 'all intermediate doors must be passed');
const clearedRetry = new KF.Stage(def, 1, st.memory);
assert.equal(clearedRetry.part, 4, 'retry should preserve the final combat checkpoint');
assert(clearedRetry.combat.cleared, 'boss clear should survive a death after the combat section');
p.x = d.x + 3; p.y = d.y + 5; p.vx = p.vy = 0;
st.step(KF.STEP, { ...empty, left: true, right: true });
assert.equal(st.state, 'won', 'exit must open once the boss and sentinels are defeated');
console.log('PASS SUPERHOT slowdown, exit gate, aiming, shatter, blocking, damage, boss clear');
