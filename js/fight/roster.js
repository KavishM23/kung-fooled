'use strict';
// Who you fight. Every realm has four street fighters (one after each stage, getting tougher)
// and a boss at the end. Looks are built from the same parts as the player's customisation.
(function (KF) {
  const R = {};
  const st = (name, look, color, special = 'wave') => ({ name, look: Object.assign({ band: 'none' }, look), color, special });
  R.rooftop = {
    fighters: [
      st('SPIKE', { hair: 'mohawk', hairColor: 'red', top: 'black', style: 'vest', pants: 'gray', wraps: 'red' }, '#ff6040'),
      st('TOMO', { hair: 'topknot', top: 'white', style: 'gi', pants: 'white', band: 'red', skin: 'light' }, '#80d0ff'),
      st('RAZOR REI', { head: 'hood', band: 'gray', top: 'gray', style: 'gi', pants: 'black', wraps: 'black' }, '#c0c0ff', 'rush'),
      st('BIG KAZ', { hair: 'bald', top: 'red', style: 'vest', pants: 'black', beard: true, skin: 'dark' }, '#ffb040', 'stomp'),
    ],
    boss: st('THE LANDLORD', { hair: 'long', hairColor: 'white', beard: true, top: 'navy', style: 'robe', pants: 'black', wraps: 'gold', trim: 'gold' }, '#ffd040', 'wave'),
  };
  R.harbour = {
    fighters: [
      st('DOCKHAND DAN', { hair: 'spiky', hairColor: 'brown', top: 'blue', style: 'vest', pants: 'navy', skin: 'light' }, '#70b0ff'),
      st('SALTY SUE', { hair: 'braid', hairColor: 'red', band: 'white', top: 'white', style: 'vest', pants: 'blue', skin: 'pale' }, '#a0e0ff'),
      st('NETTER', { head: 'straw', top: 'hide', style: 'vest', pants: 'gray' }, '#d8b058', 'stomp'),
      st('BOSUN', { hair: 'bald', beard: true, hairColor: 'black', top: 'navy', style: 'gi', pants: 'navy', wraps: 'steel', skin: 'dark' }, '#90a0ff', 'rush'),
    ],
    boss: st('CAPTAIN BRINE', { hair: 'long', hairColor: 'black', beard: true, top: 'crimson', style: 'gi', pants: 'navy', trim: 'gold', wraps: 'gold' }, '#ff5050', 'stomp'),
  };
  R.neon = {
    fighters: [
      st('GLITCH', { hair: 'mohawk', hairColor: 'blue', top: 'purple', style: 'vest', pants: 'black', trim: 'lime' }, '#a0ff60'),
      st('VOLTA', { hair: 'long', hairColor: 'pink', top: 'black', style: 'vest', pants: 'purple', skin: 'pale', wraps: 'pink' }, '#ff70d0', 'rush'),
      st('DJ STATIC', { head: 'hood', band: 'lime', top: 'black', style: 'gi', pants: 'black', skin: 'dark' }, '#c0ff40', 'wave'),
      st('PIXEL', { hair: 'topknot', hairColor: 'blue', top: 'blue', style: 'gi', pants: 'white', band: 'pink' }, '#60c0ff', 'spin'),
    ],
    boss: st('NEON EMPRESS', { hair: 'long', hairColor: 'pink', top: 'purple', style: 'robe', pants: 'black', trim: 'lime', wraps: 'pink', skin: 'pale' }, '#ff50e0', 'spin'),
  };
  R.temple = {
    fighters: [
      st('ACOLYTE JIN', { hair: 'bald', top: 'orange', style: 'robe', pants: 'orange' }, '#ffb040'),
      st('MONK SEN', { hair: 'bald', top: 'crimson', style: 'robe', pants: 'gold', skin: 'light' }, '#ff8040', 'stomp'),
      st('TEMPLE GUARD', { head: 'kabuto', top: 'steel', style: 'armor', pants: 'red' }, '#c8d4e4', 'rush'),
      st('SISTER YURI', { hair: 'long', top: 'white', style: 'robe', pants: 'crimson', skin: 'pale', band: 'red' }, '#ff9090', 'spin'),
    ],
    boss: st('MASTER OBORO', { hair: 'topknot', hairColor: 'white', beard: true, top: 'black', style: 'robe', pants: 'gray', trim: 'gold', wraps: 'gold' }, '#e0e0ff', 'wave'),
  };
  R.train = {
    fighters: [
      st('TICKET TAKER', { head: 'hood', band: 'navy', top: 'navy', style: 'gi', pants: 'navy', trim: 'gold' }, '#7090ff'),
      st('STOWAWAY', { hair: 'spiky', hairColor: 'brown', top: 'hide', style: 'vest', pants: 'gray', band: 'green' }, '#a0d060', 'spin'),
      st('ENGINEER ROKU', { hair: 'bald', beard: true, top: 'blue', style: 'vest', pants: 'blue', wraps: 'steel' }, '#80b0ff', 'stomp'),
      st('COURIER', { hair: 'braid', hairColor: 'blond', top: 'red', style: 'gi', pants: 'black', band: 'white', skin: 'light' }, '#ff7060', 'rush'),
    ],
    boss: st('CONDUCTOR KAZE', { head: 'kabuto', top: 'navy', style: 'armor', pants: 'navy', trim: 'gold', wraps: 'gold' }, '#ffd040', 'rush'),
  };
  R.sakura = {
    fighters: [
      st('PETAL', { hair: 'long', hairColor: 'pink', top: 'pink', style: 'robe', pants: 'white', skin: 'pale' }, '#ff90c0'),
      st('RONIN AOI', { head: 'straw', top: 'blue', style: 'gi', pants: 'navy' }, '#70a0ff', 'rush'),
      st('LANTERN KID', { hair: 'topknot', top: 'orange', style: 'gi', pants: 'white', band: 'red', skin: 'light' }, '#ffa040', 'spin'),
      st('BLOSSOM TWINS', { hair: 'braid', hairColor: 'black', top: 'pink', style: 'gi', pants: 'pink', band: 'white' }, '#ffb0d0', 'wave'),
    ],
    boss: st('HANAKO OF THE STORM', { hair: 'long', hairColor: 'white', top: 'crimson', style: 'robe', pants: 'black', trim: 'pink', wraps: 'pink', skin: 'pale' }, '#ff70a0', 'spin'),
  };
  R.viking = {
    fighters: [
      st('SHIELDMAIDEN ASTRID', { hair: 'braid', hairColor: 'blond', top: 'hide', style: 'fur', pants: 'gray', trim: 'ivory', skin: 'pale' }, '#c0e0ff'),
      st('BEORN', { head: 'horned', beard: true, hairColor: 'brown', top: 'hide', style: 'fur', pants: 'hide', trim: 'ivory', skin: 'light' }, '#d8a060', 'stomp'),
      st('SKALD', { hair: 'long', hairColor: 'red', beard: true, top: 'green', style: 'gi', pants: 'hide', trim: 'ivory', skin: 'light' }, '#90e070', 'wave'),
      st('RAVEN EYE', { head: 'hood', band: 'black', top: 'black', style: 'fur', pants: 'black', trim: 'gray', skin: 'pale' }, '#a0a0c0', 'rush'),
    ],
    boss: st('JARL BJORN IRONBEARD', { head: 'horned', beard: true, hairColor: 'red', top: 'steel', style: 'armor', pants: 'hide', trim: 'ivory', wraps: 'steel', skin: 'light' }, '#ff8040', 'stomp'),
  };

  // Placeholder until the cyber realm's fighters are designed.
  R.cyber = { fighters: R.neon.fighters.slice(), boss: R.neon.boss };

  // Difficulty and stats. Street fighters ramp up through a realm; bosses are clearly harder.
  function streetDef(realmIdx, k) {
    const f = R[KF.Doors[realmIdx].id].fighters[k];
    const d = Math.min(0.72, 0.12 + 0.07 * realmIdx + 0.06 * k);
    return { ...f, d, stats: { health: 85 + 6 * realmIdx + 4 * k, power: 0.85 + 0.05 * realmIdx, guard: 1, speed: 0.95 + 0.02 * realmIdx, special: f.special } };
  }
  function bossDef(realmIdx) {
    const b = R[KF.Doors[realmIdx].id].boss;
    const d = Math.min(0.88, 0.48 + 0.06 * realmIdx);
    return { ...b, d, boss: true, stats: { health: 140 + 15 * realmIdx, power: 1.0 + 0.06 * realmIdx, guard: 0.95, speed: 1.0 + 0.025 * realmIdx, special: b.special } };
  }
  // Street Arena: random fighters from unlocked realms, tougher each win, capped below bosses.
  function arenaDef(streak) {
    const pool = [];
    KF.Doors.forEach((door, i) => { if (KF.Save.unlocked(i)) R[door.id].fighters.forEach((f, k) => pool.push([i, k])); });
    const [i, k] = pool[Math.floor(Math.random() * pool.length)];
    const base = streetDef(i, k);
    const d = Math.min(0.68, 0.15 + 0.05 * streak);
    return { ...base, d, stats: { ...base.stats, health: 90 + 4 * streak, power: 0.9 + 0.03 * Math.min(streak, 10) } };
  }

  KF.Roster = { R, streetDef, bossDef, arenaDef };
})(window.KF);
