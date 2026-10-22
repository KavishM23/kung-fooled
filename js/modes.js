'use strict';
// Stage generation for the Endless Dojo and the Daily Troll. Pure logic (no drawing), so
// tools/chunks.js can check the exact stages the game makes.
(function (KF) {
  // Rules that change how you move or what you can see. Generated stages avoid the realms whose
  // style carries one, so a random room is never also secretly reversed or in the dark.
  const HARD_RULES = ['tuning', 'fixedJump', 'ice', 'reverse', 'wind', 'timeScale', 'superhot', 'sight', 'blackout', 'camera', 'roll'];
  let looks = null;
  // Every realm place whose style has no movement or visibility rule: { style, env }.
  function safeLooks() {
    if (looks) return looks;
    looks = [];
    for (const door of KF.Doors) {
      if (!door.envs) continue;
      const rule = (KF.Rules && KF.Rules.all[door.style]) || {};
      if (HARD_RULES.some((k) => rule[k])) continue;
      door.envs.forEach((env) => looks.push({ style: door.style, env, realm: door.id, music: door.music }));
    }
    return looks;
  }
  const EPOCH = Date.UTC(2026, 9, 21); // Daily Troll #1 is 21 October 2026

  KF.Modes = {
    safeLooks,
    // Room n of an Endless Dojo run (n from 0). More chunks and meaner ones as you go.
    endlessRoom(seed, n) {
      const rnd = KF.util.rng((seed ^ Math.imul(n + 1, 2654435761)) >>> 0);
      const count = Math.min(5, 2 + Math.floor(n / 3));
      const hi = Math.min(5, 1 + Math.floor(n / 2)), lo = Math.max(1, hi - 2);
      const ids = KF.Chunks.pick(rnd, count, lo, hi);
      const def = KF.Chunks.assemble(ids, `ROOM ${n + 1}`);
      const L = safeLooks(), look = L[Math.floor(rnd() * L.length)];
      return Object.assign(def, { style: look.style, env: look.env, theme: look.env, music: look.music, chunks: ids });
    },
    // Today's number: 0 on 21 October 2026, counted in the player's own calendar days.
    dayNumber(date = new Date()) {
      return Math.max(0, Math.round((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - EPOCH) / 864e5));
    },
    // The Daily Troll: one longer stage per day, the same for everyone.
    dailyDef(day) {
      const rnd = KF.util.rng((Math.imul(day + 1, 2246822519) ^ 0x5bd1e995) >>> 0);
      const ids = KF.Chunks.pick(rnd, 5, 1, 4);
      ids.splice(2 + Math.floor(rnd() * 3), 0, KF.Chunks.pick(rnd, 1, 4, 5)[0]); // one mean chunk, never first
      const def = KF.Chunks.assemble(ids, `DAILY TROLL #${day + 1}`);
      const L = safeLooks(), look = L[Math.floor(rnd() * L.length)];
      return Object.assign(def, { style: look.style, env: look.env, theme: look.env, music: look.music, chunks: ids, daily: day });
    },
  };
})(window.KF);
