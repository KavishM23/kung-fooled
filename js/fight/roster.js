'use strict';
// Who you fight. Every realm has four street fighters (one after each stage, getting tougher)
// and a boss at the end. Looks are built from the same parts as the player's customisation.
(function (KF) {
  const R = {};
  const st = (name, look, color, special = 'wave') => ({ name, look: Object.assign({ band: 'none' }, look), color, special });
  // Each street fighter belongs to the world of the level just before them (fighter k follows
  // level k, see KF.StylePlan in js/rules.js); the boss rules the whole realm.
  R.rooftop = {
    fighters: [ // after ROOFTOPS AT DUSK, THE 1950S STUDIO, COMIC CITY, POCKET TOWN
      st('DAICHI', { hair: 'bald', beard: true, hairColor: 'black', top: 'white', style: 'gi', pants: 'white', belt: 'black', wraps: 'tan', skin: 'tan', build: 'heavy', shoes: 'tan' }, '#ffd8a0', 'stomp'),
      st('JOHNNY TV', { hair: 'slick', hairColor: 'black', top: 'charcoal', style: 'suit', pants: 'charcoal', tie: 'bow', tieColor: 'white', wraps: 'white', shoes: 'black', skin: 'light', prop: 'mic' }, '#e0e0e0', 'wave'),
      st('CAPTAIN KAPOW', { hair: 'short', hairColor: 'black', mask: 'navy', top: 'blue', style: 'hero', pants: 'blue', trim: 'yellow', cape: 'red', wraps: 'red', shoes: 'red', belt: 'yellow', build: 'heavy', skin: 'light' }, '#5a90ff', 'rush'),
      st('BUG KID', { head: 'cap', hat: 'red', hair: 'short', hairColor: 'black', top: 'blue', style: 'vest', pants: 'green', legs: 'shorts', wraps: 'red', shoes: 'red', skin: 'light', build: 'slim' }, '#ff6040', 'spin'),
    ],
    boss: st('THE LANDLORD', { hair: 'long', hairColor: 'white', beard: true, top: 'navy', style: 'robe', pants: 'black', wraps: 'gold', trim: 'gold', belt: 'gold', build: 'heavy' }, '#ffd040', 'wave'),
  };
  R.harbour = {
    fighters: [ // after THE SILENT DOCK, THE BLUEPRINT, AR PROMENADE, RAINY WATERFRONT
      st('BRAMBLE', { head: 'bowler', hat: 'black', hair: 'short', top: 'black', style: 'suit', pants: 'charcoal', tieColor: 'black', wraps: 'white', shoes: 'black', skin: 'grey', moustache: true, hairColor: 'black', prop: 'cane' }, '#d0d0d0', 'rush'),
      st('FOREMAN', { head: 'hardhat', hat: 'yellow', hair: 'short', hairColor: 'brown', moustache: true, top: 'hivis', style: 'vest', pants: 'denim', wraps: 'hide', shoes: 'hide', skin: 'light', build: 'heavy' }, '#ffa010', 'stomp'),
      st('LIKEZ', { hair: 'bun', hairColor: 'pink', shades: 'black', top: 'pink', style: 'track', trim: 'white', pants: 'pink', wraps: 'white', shoes: 'white', skin: 'pale', build: 'slim', prop: 'phone', glow: 'sky' }, '#ff90c0', 'spin'),
      st('THE DETECTIVE', { head: 'fedora', hat: 'khaki', hair: 'short', top: 'khaki', style: 'coat', pants: 'charcoal', trim: 'black', wraps: 'black', shoes: 'black', skin: 'light' }, '#c8b880', 'wave'),
    ],
    boss: st('CAPTAIN BRINE', { head: 'tricorn', hat: 'black', hair: 'long', hairColor: 'black', beard: true, top: 'crimson', style: 'coat', pants: 'navy', trim: 'gold', wraps: 'gold', shoes: 'black', build: 'heavy' }, '#ff5050', 'stomp'),
  };
  R.neon = {
    fighters: [ // after CORRUPTED MARKET, VAPOR PLAZA, HALL OF MIRRORS, WAREHOUSE CAM 04
      st('GL1TCH', { hair: 'mohawk', hairColor: 'green', visor: 'magenta', top: 'black', style: 'cyber', glow: 'lime', pants: 'purple', wraps: 'magenta', shoes: 'black', skin: 'pale' }, '#a0ff60', 'rush'),
      st('AESTHETIC', { hair: 'slick', hairColor: 'pink', shades: 'cyan', top: 'mint', style: 'track', trim: 'pink', pants: 'sky', wraps: 'white', shoes: 'white', skin: 'olive' }, '#80f0d0', 'wave'),
      st('THE GREAT ZORBO', { hair: 'bald', moustache: true, hairColor: 'black', top: 'red', style: 'tank', pants: 'black', belt: 'gold', wraps: 'hide', shoes: 'black', skin: 'tan', build: 'heavy' }, '#ff7050', 'stomp'),
      st('NIGHT GUARD', { head: 'peaked', hat: 'navy', hair: 'short', top: 'navy', style: 'suit', tieColor: 'black', pants: 'navy', wraps: 'black', shoes: 'black', skin: 'dark' }, '#7090ff', 'spin'),
    ],
    boss: st('NEON EMPRESS', { hair: 'long', hairColor: 'pink', top: 'purple', style: 'robe', pants: 'black', trim: 'lime', wraps: 'pink', belt: 'lime', skin: 'pale' }, '#ff50e0', 'spin'),
  };
  R.temple = {
    fighters: [ // after THE NOTEBOOK, INK MOUNTAINS, JUNGLE RUINS, TEXT MODE
      st('SCRIBBLES', { hair: 'spiky', hairColor: 'black', band: 'white', top: 'white', style: 'track', trim: 'blue', pants: 'blue', wraps: 'white', shoes: 'white', skin: 'light', build: 'slim' }, '#80b0ff', 'spin'),
      st('OLD BRUSH', { head: 'straw', hair: 'long', hairColor: 'grey', beard: true, top: 'gray', style: 'robe', pants: 'black', belt: 'black', wraps: 'ivory', shoes: 'hide' }, '#c0c0c0', 'wave'),
      st('RUIN RAIDER', { head: 'fedora', hat: 'hide', hair: 'short', hairColor: 'brown', top: 'olive', style: 'vest', pants: 'khaki', legs: 'shorts', shins: 'khaki', scarf: 'red', wraps: 'hide', shoes: 'hide', skin: 'tan' }, '#c0d060', 'rush'),
      st('ROOT', { head: 'hood', band: 'black', visor: 'lime', top: 'black', style: 'track', trim: 'green', pants: 'black', wraps: 'black', shoes: 'black', skin: 'pale' }, '#60ff80', 'wave'),
    ],
    boss: st('GRANDMA HANA', { hair: 'bun', hairColor: 'grey', top: 'slate', style: 'tang', trim: 'ivory', pants: 'navy', belt: 'red', wraps: 'pale', shoes: 'black', skin: 'pale', build: 'slim' }, '#ff7060', 'spin'),
  };
  R.train = {
    fighters: [ // after WILD WEST 8-BIT, SUBWAY NEGATIVE, THE TRAIN ROBBERY, POP ART METRO
      st('DUSTY', { head: 'cowboy', hat: 'hide', hair: 'short', hairColor: 'blond', top: 'denim', style: 'vest', pants: 'denim', scarf: 'red', wraps: 'hide', shoes: 'hide', skin: 'light' }, '#e0b060', 'wave'),
      st('THE COMMUTER', { hair: 'short', hairColor: 'brown', top: 'navy', style: 'suit', tieColor: 'red', pants: 'navy', wraps: 'light', shoes: 'black', skin: 'olive' }, '#90a0ff', 'rush'),
      st('BLACK BART', { head: 'cowboy', hat: 'black', hair: 'long', hairColor: 'black', bandana: 'red', top: 'black', style: 'coat', pants: 'charcoal', wraps: 'black', shoes: 'black', skin: 'tan', build: 'heavy' }, '#ff5050', 'stomp'),
      st('MIRA', { hair: 'bun', hairColor: 'black', top: 'coral', style: 'tank', pants: 'black', legs: 'shorts', shins: 'cream', wraps: 'cream', shoes: 'hide', skin: 'deep' }, '#ff8a50', 'spin'),
    ],
    boss: st('THE CONDUCTOR', { head: 'peaked', hat: 'navy', hair: 'short', hairColor: 'grey', moustache: true, top: 'navy', style: 'coat', trim: 'gold', pants: 'navy', wraps: 'white', shoes: 'black', skin: 'light', build: 'heavy' }, '#ffd040', 'rush'),
  };
  R.sakura = {
    fighters: [ // after THE POP-UP BOOK, THE GREAT WAVE, THE DREAM, THE TEA HOUSE
      st('RED HOOD', { head: 'hood', band: 'red', cape: 'red', top: 'white', style: 'tang', trim: 'red', pants: 'hide', belt: 'hide', wraps: 'hide', shoes: 'hide', skin: 'pale', build: 'slim' }, '#ff5050', 'rush'),
      st('FISHERMAN GEN', { head: 'straw', hair: 'short', top: 'indigo', style: 'tang', trim: 'white', pants: 'indigo', legs: 'shorts', shins: 'white', belt: 'white', wraps: 'white', shoes: 'hide', skin: 'tan', build: 'heavy' }, '#6070ff', 'stomp'),
      st('SLEEPWALKER', { hair: 'spiky', hairColor: 'blue', mask: 'pink', top: 'sky', style: 'track', trim: 'white', pants: 'sky', wraps: 'white', shoes: 'white', skin: 'pale' }, '#a0c0ff', 'wave'),
      st('TEA MASTER RIN', { hair: 'topknot', hairColor: 'grey', top: 'green', style: 'robe', trim: 'ivory', pants: 'black', belt: 'black', wraps: 'ivory', shoes: 'black', skin: 'light' }, '#90e070', 'spin'),
    ],
    boss: st('HANAKO OF THE STORM', { hair: 'long', hairColor: 'white', top: 'crimson', style: 'robe', pants: 'black', trim: 'pink', wraps: 'pink', belt: 'pink', skin: 'pale' }, '#ff70a0', 'spin'),
  };
  R.viking = {
    fighters: [ // after THE RUNESTONE, THE TAPESTRY, THE MEAD HALL, GLACIER CAVE
      st('RUNE CARVER', { hair: 'bald', beard: true, hairColor: 'brown', top: 'gray', style: 'fur', trim: 'ivory', pants: 'hide', wraps: 'steel', shoes: 'hide', skin: 'light', build: 'heavy' }, '#c0c0d0', 'stomp'),
      st('ASTRID', { hair: 'braid', hairColor: 'blond', top: 'red', style: 'tang', trim: 'gold', pants: 'gray', belt: 'hide', wraps: 'hide', shoes: 'hide', skin: 'pale' }, '#ff8060', 'rush'),
      st('BEORN', { head: 'horned', beard: true, hairColor: 'red', top: 'hide', style: 'fur', pants: 'hide', trim: 'ivory', wraps: 'hide', shoes: 'hide', skin: 'light', build: 'heavy' }, '#d8a060', 'stomp'),
      st('ICE JOTUN', { hair: 'long', hairColor: 'white', beard: true, top: 'white', style: 'fur', trim: 'sky', pants: 'sky', wraps: 'sky', shoes: 'white', skin: 'frost', build: 'heavy' }, '#a0e0ff', 'wave'),
    ],
    boss: st('JARL IRONBEARD', { head: 'horned', beard: true, hairColor: 'red', top: 'steel', style: 'armor', pants: 'hide', trim: 'ivory', wraps: 'steel', cape: 'crimson', shoes: 'hide', skin: 'light', build: 'heavy' }, '#ff8040', 'stomp'),
  };
  R.cyber = {
    fighters: [
      st('VOLT', { hair: 'mohawk', hairColor: 'magenta', visor: 'cyan', arm: 'cyber', glow: 'cyan', top: 'charcoal', style: 'cyber', pants: 'charcoal', wraps: 'black', shoes: 'black', skin: 'tan' }, '#40e0ff', 'rush'),
      st('NETRUNNER', { head: 'hood', band: 'navy', visor: 'lime', glow: 'lime', top: 'navy', style: 'cyber', pants: 'black', wraps: 'black', shoes: 'black', skin: 'pale', build: 'slim' }, '#80ff60', 'wave'),
      st('CHROME COURIER', { head: 'helmet', hat: 'chrome', glow: 'magenta', top: 'yellow', style: 'cyber', pants: 'black', wraps: 'chrome', shoes: 'black', arm: 'cyber' }, '#ffe040', 'spin'),
      st('HOLO IDOL', { hair: 'bun', hairColor: 'cyan', shades: 'magenta', glow: 'magenta', top: 'white', style: 'track', trim: 'magenta', pants: 'white', wraps: 'magenta', shoes: 'white', skin: 'pale', build: 'slim' }, '#ff60e0', 'spin'),
    ],
    boss: st('THE SYSTEM', { material: 'crystal', hair: 'bald', style: 'tank', build: 'heavy' }, '#ff3030', 'rush'),
  };

  // Who guards each realm: one street fighter in the middle and a boss at the end, picked from the
  // cast above to suit the realm's style. Everyone else still turns up in the Street Arena.
  const ALL = [];
  for (const id in R) { ALL.push(...R[id].fighters); ALL.push(R[id].boss); }
  const byName = (n) => { const f = ALL.find((x) => x.name === n); if (!f) throw new Error('No fighter ' + n); return f; };
  const CAST = {
    arcade: ['MIRA', 'THE LANDLORD'], oldtv: ['JOHNNY TV', 'BRAMBLE'], pocket: ['BUG KID', 'GRANDMA HANA'],
    comic: ['THE GREAT ZORBO', 'CAPTAIN KAPOW'], argo: ['LIKEZ', 'HOLO IDOL'], eightbit: ['DUSTY', 'BLACK BART'],
    woodblock: ['OLD BRUSH', 'HANAKO OF THE STORM'], vhs: ['DAICHI', 'THE DETECTIVE'], vapor: ['AESTHETIC', 'NEON EMPRESS'],
    cyber: ['VOLT', 'CHROME COURIER'],
    superhot: ['NETRUNNER', 'THE SYSTEM'], // fought inside the SUPERHOT levels, not in fight scenes
  };
  const REALM = {};
  for (const id in CAST) REALM[id] = { fighters: [byName(CAST[id][0])], boss: byName(CAST[id][1]) };

  // Difficulty and stats. Street fighters ramp up through a realm; bosses are clearly harder.
  function streetDef(realmIdx, k) {
    const f = REALM[KF.Doors[realmIdx].id].fighters[k];
    const d = Math.min(0.72, 0.16 + 0.065 * realmIdx + 0.06 * k);
    return { ...f, d, stats: { health: 85 + 6 * realmIdx + 4 * k, power: 0.85 + 0.05 * realmIdx, guard: 1, speed: 0.95 + 0.02 * realmIdx, special: f.special } };
  }
  function bossDef(realmIdx) {
    const b = REALM[KF.Doors[realmIdx].id].boss;
    const d = Math.min(0.88, 0.48 + 0.06 * realmIdx);
    return { ...b, d, boss: true, stats: { health: 140 + 15 * realmIdx, power: 1.0 + 0.06 * realmIdx, guard: 0.95, speed: 1.0 + 0.025 * realmIdx, special: b.special } };
  }
  // Street Arena: random fighters from unlocked realms, tougher each win, capped below bosses.
  // Street Arena: anyone from the cast whose realm (or an earlier one) you have reached.
  function arenaDef(streak) {
    let reach = 0;
    KF.Doors.forEach((door, i) => { if (KF.Save.unlocked(i)) reach = i; });
    const pool = ALL.filter((f) => !Object.keys(CAST).some((id, i) => i > reach && CAST[id].includes(f.name)));
    const f = pool[Math.floor(Math.random() * pool.length)];
    const d = Math.min(0.68, 0.15 + 0.05 * streak);
    return { ...f, d, stats: { health: 90 + 4 * streak, power: 0.9 + 0.03 * Math.min(streak, 10), guard: 1, speed: 1, special: f.special } };
  }

  KF.Roster = { R: REALM, ALL, streetDef, bossDef, arenaDef };
})(window.KF);
