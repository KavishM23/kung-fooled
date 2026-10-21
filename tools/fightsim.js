// Fight balance check: plays AI-vs-AI fights headless with the real fight code.
// "Player" is an AI of a given skill using the player's stats; prints its win rate per opponent.
// Usage: node tools/fightsim.js [playerSkill=0.45] [fights=40] [upgradeLevel=0]
'use strict';
const vm = require('vm'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const sb = { console, Math, JSON, Object, Array, Set, Map, Uint8Array, Error, parseInt, Number };
sb.window = sb;
vm.createContext(sb);
for (const f of ['core.js', 'levels/doors.js', 'fight/fighter.js', 'fight/ai.js', 'fight/roster.js']) {
  if (f === 'fight/fighter.js') vm.runInContext('KF.Sprites = { buildSet: () => ({ frames: {} }) }; KF.Audio = { sfx() {} }; KF.Save = { unlocked: () => true };', sb);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', f), 'utf8'), sb, { filename: f });
}
const KF = sb.KF;
const [skill = 0.45, N = 40, upg = 0] = process.argv.slice(2).map(Number);
const STEP = 1 / 120;
const fx = { dust() {}, shake() {}, spark() {}, tick() {}, confetti() {} };

function fight(playerStats, oppDef) {
  const scene = { fx, projectiles: [], spawnProjectile(o, kind) { this.projectiles.push({ owner: o, kind, x: o.x + o.facing * 22, y: o.y - (kind === 'wave' ? 40 : 12), vx: (kind === 'wave' ? 230 : 200) * o.facing, w: 16, h: 14, dmg: kind === 'wave' ? 14 : 13, life: 2 }); } };
  const wins = [0, 0];
  while (wins[0] < 2 && wins[1] < 2) {
    const P = new KF.Fight.Fighter({ name: 'P', look: {}, stats: playerStats }, 110, 1);
    const O = new KF.Fight.Fighter(oppDef, 274, -1);
    const aiP = new KF.Fight.AI(skill), aiO = new KF.Fight.AI(oppDef.d);
    scene.projectiles = [];
    let t = 0;
    while (P.hp > 0 && O.hp > 0 && t < 60) {
      t += STEP;
      P.update(STEP, aiP.update(STEP, P, O, scene), O, scene);
      O.update(STEP, aiO.update(STEP, O, P, scene), P, scene);
      for (const [a, b] of [[P, O], [O, P]]) {
        const hb = a.hitbox();
        if (!hb) continue;
        const m = a.move;
        if (m.multi ? a.moveT - a.lastMulti < m.multi : a.hitDone) continue;
        const h = b.hurtbox();
        if (hb.x < h.x + h.w && hb.x + hb.w > h.x && hb.y < h.y + h.h && hb.y + hb.h > h.y) { a.lastMulti = a.moveT; a.hitDone = true; b.receive(m, a, scene); }
      }
      for (const p of scene.projectiles) {
        p.x += p.vx * STEP; p.life -= STEP;
        const tg = p.owner === P ? O : P, h = tg.hurtbox();
        if (p.life > 0 && Math.abs(p.x - (h.x + h.w / 2)) < 16 && p.y > h.y && p.y < h.y + h.h + 6) { if (tg.receive({ dmg: p.dmg, push: 140, stun: 0.45, down: p.kind === 'quake' }, p.owner, scene) !== 'miss') p.life = 0; }
      }
      scene.projectiles = scene.projectiles.filter((p) => p.life > 0);
      const dx = O.x - P.x;
      if (Math.abs(dx) < 20) { const push = (20 - Math.abs(dx)) / 2, s = Math.sign(dx) || 1; P.x -= push * s; O.x += push * s; }
    }
    wins[P.hp / P.maxHp >= O.hp / O.maxHp ? 0 : 1]++;
  }
  return wins[0] >= 2;
}

const ps = { power: 1 + 0.15 * upg, guard: 1 - 0.08 * upg, health: 100 + 15 * upg, speed: 1 + 0.06 * upg, special: 'wave' };
console.log(`player skill ${skill}, upgrades all level ${upg}, ${N} fights each`);
KF.Doors.forEach((door, r) => {
  const row = [];
  for (let k = 0; k < 4; k++) { const def = KF.Roster.streetDef(r, k); let w = 0; for (let i = 0; i < N; i++) if (fight(ps, def)) w++; row.push(`${Math.round(100 * w / N)}%`); }
  const boss = KF.Roster.bossDef(r); let w = 0; for (let i = 0; i < N; i++) if (fight(ps, boss)) w++;
  console.log(`${door.id.padEnd(8)} street ${row.join(' ')}   boss ${Math.round(100 * w / N)}%`);
});
