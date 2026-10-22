'use strict';
// The realms. Each realm is one visual style (its medium: silent cinema, Game Boy, comic...), and its
// four levels are different places (rooftops, the docks, a temple...) all shown in that style.
// Path through a realm: level, level, street fight, level, level, boss. Cyber's
// final boss is fought inside its fourth level instead of in a separate fight scene.
//
// Stage files still call KF.addStage(bucket, def) with their original bucket (rooftop, harbour,
// ...); the buckets are dealt out to the realms in order, so difficulty keeps rising.
(function (KF) {
  const REALMS = [
    { id: 'arcade', name: 'ARCADE', sub: 'FULL COLOUR', style: 'hd', theme: 'rooftop', music: 'rooftop', envs: ['rooftop', 'harbour', 'temple', 'sakura'] },
    // Smooth realms (not pixel art) draw their own versions of each place: <realm>_<place>.
    { id: 'oldtv', name: 'RETRO', sub: 'SILENT CITY / 1931', style: 'oldtv', theme: 'oldtv_studio', music: 'silent', envs: ['oldtv_studio', 'oldtv_rooftop', 'oldtv_train', 'oldtv_harbour'] },
    { id: 'pocket', name: 'POCKET', sub: 'FOUR GREENS', style: 'gameboy', theme: 'env_gameboy', music: 'shrine', envs: ['env_gameboy', 'temple', 'sakura', 'viking'] },
    { id: 'comic', name: 'COMIC', sub: 'POW! BAM!', style: 'comic', theme: 'comic_city', music: 'neon', envs: ['comic_city', 'comic_neon', 'comic_train', 'comic_rooftop'] },
    { id: 'argo', name: 'AR GO', sub: 'ON YOUR PHONE', style: 'pocket', theme: 'argo_promenade', music: 'sakura', envs: ['argo_promenade', 'argo_sakura', 'argo_harbour', 'argo_temple'] },
    { id: 'eightbit', name: '8-BIT', sub: 'CARTRIDGE ERA', style: 'nes8bit', theme: 'env_nes8bit', music: 'train', envs: ['env_nes8bit', 'viking', 'neon', 'harbour'] },
    { id: 'woodblock', name: 'WOODBLOCK', sub: 'OLD EDO PRINTS', style: 'ukiyo', theme: 'woodblock_wave', music: 'sakura', envs: ['woodblock_wave', 'woodblock_mountains', 'woodblock_sakura', 'woodblock_fjord'] },
    { id: 'vhs', name: 'VHS', sub: 'HOME VIDEO 1996', style: 'vhs', theme: 'vhs_backyard', music: 'rooftop', envs: ['vhs_backyard', 'vhs_rooftop', 'vhs_mall', 'vhs_train'] },
    { id: 'vapor', name: 'VAPORWAVE', sub: 'SLOWED + REVERB', style: 'vaporwave', theme: 'vapor_plaza', music: 'neon', envs: ['vapor_plaza', 'vapor_neon', 'vapor_harbour', 'vapor_train'] },
    { id: 'cyber', name: 'CYBER', sub: 'NEON TO SUPERHOT', style: 'cyberpunk', theme: 'cyber_megacity', music: 'cyber', styles: ['cyberpunk', 'hologram', 'chrome', 'superhot'], envs: ['cyber_megacity', 'cyber_hologram', 'cyber_chrome', 'superhot_atrium'] },
  ];
  const BUCKETS = ['rooftop', 'harbour', 'neon', 'temple', 'train', 'sakura', 'viking', 'cyber'];
  const pool = {};
  BUCKETS.forEach((b) => { pool[b] = []; });
  // Each realm's third level can be a hand-built tall level (down underground, into a building,
  // under the sea...), added with KF.addStage('tall_<realmId>', def) in js/levels/tall_<realmId>.js.
  // It may pick which of the realm's places it shows with `env`.
  const TALL_SLOT = 2;
  // The hand-built vertical stages use doors placed on grounded points of a
  // proven route. They keep their original geometry and trap choreography.
  const CHECKPOINTS = {
    'arcade-3': [[448,245],[483,373]],
    'oldtv-3': [[333,293],[326,101]],
    'pocket-3': [[274,133],[260,293]],
    'comic-3': [[495,53],[496,389]],
    'argo-3': [[477,309],[440,149]],
    'eightbit-3': [[385,261],[780,395]],
    'woodblock-3': [[172,101],[720,405]],
    'vhs-3': [[407,181],[702,344]],
    'vapor-3': [[237,101],[506,453]],
    'cyber-1': [[316,149],[715,309]],
    'cyber-2': [[350,165],[441,277]],
    'cyber-3': [[204,85],[725,21]],
  };
  REALMS.forEach((r) => { pool['tall_' + r.id] = []; });

  // Names for places shown in any style; a style's own world (env_*) uses that world's name.
  const PLACES = { rooftop: 'ROOFTOPS', harbour: 'THE DOCKS', neon: 'NIGHT MARKET', temple: 'TEMPLE COURTYARD', train: 'SKY EXPRESS', sakura: 'SAKURA VALLEY', viking: 'THE FJORD' };
  const PLACE_MUSIC = { rooftop: 'rooftop', harbour: 'harbour', neon: 'neon', temple: 'shrine', train: 'train', sakura: 'sakura', viking: 'viking' };
  // Realm-specific obstacles give the same platform layouts different rhythms and silhouettes.
  const EXTRA_OBSTACLES = {
    arcade: [
      [{ type: 'conveyor', at: [4, 10, 6], speed: 80 }],
      [{ type: 'lureFloor', at: [24, 11, 2, 3], delay: 0.5 }],
    ],
    oldtv: [
      [{ type: 'movingSpikes', at: [26, 10, 1], travel: [3, 0], period: 3.6 }],
      [{ type: 'pulseBeam', at: [9, 4, 0.35, 7], on: 1.0, off: 1.7, offset: 0.3 }],
      [{ type: 'swingHammer', at: [8, 4], len: 5.5, amp: 0.95, speed: 2.1 }],
    ],
    pocket: [
      [{ type: 'conveyor', at: [3, 10, 6], speed: -85 }],
      [], [{ type: 'lureFloor', at: [12, 11, 2, 3], delay: 0.48 }],
    ],
    comic: [
      [{ type: 'movingSpikes', at: [30, 10, 1], travel: [3, 0], period: 3.1, offset: 0.7 }],
      [{ type: 'dartLauncher', at: [12, 9], dir: 'left', range: 8, period: 2.2, offset: 1.0 },
        { type: 'lookSaw', at: [26, 10], range: 3, speed: 55 }],
    ],
    argo: [
      [{ type: 'conveyor', at: [3, 10, 7], speed: -75 }],
      [{ type: 'swingHammer', at: [9, 4], len: 5.5, amp: 0.9, speed: 2.2 }],
    ],
    eightbit: [
      [], [{ type: 'lookSaw', at: [30, 8], range: 2, speed: 48 }],
      [{ type: 'pulseBeam', at: [31, 3, 0.35, 6], on: 1.1, off: 1.5, offset: 0.4 }],
    ],
    woodblock: [
      [], [{ type: 'conveyor', at: [4, 10, 7], speed: 75 }],
    ],
    vhs: [
      [{ type: 'dartLauncher', at: [18, 9], dir: 'left', range: 10, period: 2.5, offset: 1.2 }],
      [{ type: 'lureFloor', at: [36, 11, 2, 3], delay: 0.54 }],
      [], [{ type: 'movingSpikes', at: [28, 10, 1], travel: [3, 0], period: 3.4 }],
    ],
    vapor: [
      [{ type: 'conveyor', at: [3, 10, 4], speed: 75 }],
      [{ type: 'lookSaw', at: [23, 10], range: 3, speed: 60 }],
    ],
    cyber: [], // the cyber levels carry their own Trap Adventure 2-style traps
  };
  // Every level is one continuous three-part run. The second and third stretches gain
  // telegraphed gates; later levels have shorter safe windows, and part three is tighter
  // than part two. Pick clear columns in the source map so gates never hide in scenery.
  function threeParts(def, level) {
    if (def.noGates) return { cuts: null, traps: [] }; // hand-built tall levels keep their own geometry
    let start = 2, finish = def.map[0].length - 3, lane = 10;
    def.map.forEach((row, r) => {
      const p = row.indexOf('P'), d = Math.max(row.indexOf('D'), row.indexOf('U'));
      if (p >= 0) { start = p; lane = r; }
      if (d >= 0) finish = d;
    });
    for (const tr of def.traps || []) if (tr.type === 'doorRun') for (const stop of tr.path || []) finish = Math.max(finish, stop.to[0]);
    const span = Math.max(9, finish - start);
    const cuts = [Math.round(start + span / 3), Math.round(start + 2 * span / 3)];
    const used = (def.traps || []).filter((t) => t.at).map((t) => [t.at[0], t.at[0] + (t.at[2] || 1)]);
    const gate = (lo, hi, target, part) => {
      const options = [];
      for (let c = Math.max(start + 3, lo); c < Math.min(finish - 2, hi); c++) {
        const clear = [lane - 2, lane - 1, lane].every((r) => def.map[r] && def.map[r][c] === '.');
        // Gates stand on floor, so you can stop and wait for them (never mid-jump over a pit).
        const floored = def.map[lane + 1] && '#=~'.includes(def.map[lane + 1][c]);
        if (!floored) continue;
        // ...with room either side, so you never have to jump an obstacle through the beam.
        const roomy = [c - 1, c + 1].every((x) => [lane - 1, lane].every((r) => def.map[r] && def.map[r][x] === '.') &&
          '#=~'.includes((def.map[lane + 1] || '')[x] || '.'));
        if (!roomy) continue;
        if (!clear || used.some(([a, b]) => c >= a - 1 && c <= b + 1)) continue;
        options.push(c);
      }
      if (!options.length) return null; // no fair place to wait in this stretch: no gate
      const c = options.reduce((best, x) => Math.abs(x - target) < Math.abs(best - target) ? x : best);
      const on = 0.55 + level * 0.11 + (part === 3 ? 0.24 : 0);
      const off = 2.1 - level * 0.15 - (part === 3 ? 0.24 : 0);
      return { type: 'pulseBeam', section: part, at: [c, lane - 2, 0.3, 3], on, off, offset: part === 3 ? 0.45 : 0.1 };
    };
    return { cuts: cuts.map((c) => c * KF.TILE), traps: [
      gate(cuts[0] + 1, cuts[1], (cuts[0] + cuts[1]) / 2, 2),
      gate(cuts[1] + 1, finish, (cuts[1] + finish) / 2, 3),
    ].filter(Boolean) };
  }
  // Raise the source course by twelve tiles to make room for a real vertical
  // climb above it. Every coordinate-bearing trap and label moves with the map.
  function doorCourse(def, cuts, traps, labels) {
    if (!cuts) return { map: def.map, traps, labels, depths: def.depths, combat: def.combat };
    const rise = 12;
    const width = Math.max(...def.map.map((row) => row.length));
    const rows = Array.from({ length: rise }, () => Array(width).fill('.'))
      .concat(def.map.map((row) => row.split('')));
    for (const row of rows) while (row.length < width) row.push('.');
    const stair = (c, r, w) => {
      for (let x = c; x < c + w; x++) if (x > 0 && x < width - 1) {
        // Cut a walkable stair through old ceilings where the new upper route
        // crosses them. Two empty tiles above each tread give the player room.
        rows[r][x] = '-';
        for (let y = r - 2; y < r; y++) if ('#=~^v<>'.includes(rows[y][x])) rows[y][x] = '.';
      }
    };
    const marker = (c, r, ch) => {
      // Keep the approach around each doorway clear even where a source level has
      // a ceiling or decorative block in the same place.
      for (let y = r - 1; y <= r; y++) rows[y][c] = '.';
      rows[r][c] = ch;
      rows[r + 1][c] = '-';
    };
    const first = Math.round(cuts[0] / KF.TILE), second = Math.round(cuts[1] / KF.TILE);
    let spawnRow = 10 + rise;
    def.map.forEach((row, r) => { if (row.includes('P')) spawnRow = r + rise; });
    for (let k = 0; k < 6; k++) stair(first - 6 + k, spawnRow - 2 - k * 2, 3);
    marker(first, spawnRow - 13, 'A');
    // A descending roofline connects the high doorway to the next climb even
    // when the original floor underneath is a pit or a moving obstacle.
    for (let x = first + 2; x < second - 1; x += 3) {
      const progress = (x - first) / Math.max(1, second - first);
      stair(x, spawnRow - 11 + Math.round(progress * 3), 3);
    }
    for (let k = 0; k < 3; k++) stair(second - 4 + k, spawnRow - 2 - k * 2, 3);
    stair(second - 1, spawnRow - 7, 3);
    // The descent into B needs a clear shaft. Source maps may have a solid
    // ceiling directly above this otherwise reachable doorway.
    for (let y = spawnRow - 11; y <= spawnRow - 8; y++)
      for (let x = second - 2; x <= second + 1; x++)
        if (rows[y] && x > 0 && x < width - 1) rows[y][x] = '.';
    marker(second, spawnRow - 8, 'B');
    let exit = width - 3;
    def.map.forEach((row) => { const c = Math.max(row.indexOf('D'), row.indexOf('U')); if (c >= 0) exit = c; });
    if (exit > second + 5) for (let x = second + 3, k = 0; x < exit - 2; x += 3, k++) {
      const r = Math.min(spawnRow - 1, spawnRow - 5 + k * 2);
      // Open the old roof over each descending tread; otherwise a player can
      // walk above the entire descent while the exit lies under that roof.
      for (let c = x; c < x + 3; c++) for (let y = spawnRow - 10; y < r; y++)
        if (rows[y] && '#=~'.includes(rows[y][c])) rows[y][c] = '.';
      stair(x, r, 3);
    }
    if (def.map.some((row) => row.includes('U'))) {
      // A ceiling-hung exit needs the route to rise again after the descent.
      stair(exit - 3, spawnRow - 5, 3);
      stair(exit, spawnRow - 6, 3);
    }
    const shiftPoint = (p) => [p[0], p[1] + rise, ...p.slice(2)];
    const movedTraps = traps.map((t) => {
      const o = Object.assign({}, t);
      if (t.at) o.at = shiftPoint(t.at);
      if (t.zone) o.zone = shiftPoint(t.zone);
      if (t.path && t.type === 'doorRun') o.path = t.path.map((stop) => Object.assign({}, stop, { to: shiftPoint(stop.to) }));
      if (t.when && t.when.zone) o.when = Object.assign({}, t.when, { zone: shiftPoint(t.when.zone) });
      return o;
    });
    return {
      map: rows.map((row) => row.join('')),
      traps: movedTraps,
      labels: (labels || []).map((label) => Object.assign({}, label, { at: shiftPoint(label.at) })),
      depths: (def.depths || []).map((d) => Object.assign({}, d, { r0: d.r0 + rise, r1: d.r1 === undefined ? undefined : d.r1 + rise })),
      combat: def.combat && Object.assign({}, def.combat, { enemies: def.combat.enemies.map((e) => Object.assign({}, e, { at: shiftPoint(e.at) })) }),
    };
  }
  // A theme may carry its own `title` (the smooth realms' places do).
  KF.placeName = (env) => PLACES[env] || (KF.Themes && KF.Themes.has(env) && KF.Themes.get(env).title) ||
    ((KF.Rules && KF.Rules.all[String(env).replace('env_', '')]) || {}).name || String(env).replace(/^[a-z]+_/, '').toUpperCase();

  // The six nodes of a realm's path.
  KF.Path = {
    kinds: ['level', 'level', 'street', 'level', 'level', 'boss'],
    count: 6, street: 2, boss: 5,
    nodeOfStage: (s) => [0, 1, 3, 4][s],
    stageOfNode: (n) => ({ 0: 0, 1: 1, 3: 2, 4: 3 })[n],
  };

  let built = null;
  function build() {
    if (built) return built;
    built = {};
    const cy = pool.cyber, order = [];
    for (const b of BUCKETS) if (b !== 'cyber') order.push(...pool[b]);
    if (cy[2]) order.push(cy[2]); // the low-poly VR stage joins the main run
    const cyber = [cy[0], cy[1], cy[3], cy[4]].filter(Boolean);
    REALMS.forEach((r, k) => {
      const src = r.id === 'cyber' ? cyber : order.slice(4 * k, 4 * k + 4);
      const tall = pool['tall_' + r.id] && pool['tall_' + r.id][0];
      if (tall && src.length > TALL_SLOT) src[TALL_SLOT] = tall;
      const retroSigns = ['CHAPLIN ST.', 'ABOVE THE CITY', 'NIGHT EXPRESS', 'CANAL WALK'];
      built[r.id] = src.map((def, j) => {
        // Hand-built tall levels keep exactly their own traps and signs.
        const baseTraps = (def.traps || []).concat(def.noGates ? [] : (EXTRA_OBSTACLES[r.id] || [])[j] || []);
        const parts = threeParts(Object.assign({}, def, { traps: baseTraps }), j);
        const labels = r.id === 'oldtv' && !def.noGates ? [{ at: [5, 10], text: retroSigns[j] }] : def.labels;
        const course = doorCourse(def, parts.cuts, baseTraps.concat(parts.traps), labels);
        return KF.util.deepFreeze(Object.assign({}, def, {
          realm: r.id, index: j, env: (r.envs.includes(def.env) && def.env) || r.envs[j], theme: (r.envs.includes(def.env) && def.env) || r.envs[j],
          labels: course.labels,
          map: course.map,
          depths: course.depths,
          combat: course.combat,
          checkpoints: CHECKPOINTS[`${r.id}-${j + 1}`] || null,
          traps: course.traps,
          style: (r.styles && r.styles[j]) || r.style, music: PLACE_MUSIC[r.envs[j]] || r.music,
        }));
      });
      KF.StylePlan[r.id] = built[r.id].map((d) => d.style);
    });
    return built;
  }

  KF.Doors = REALMS.map((r) => {
    const door = Object.assign({}, r);
    Object.defineProperty(door, 'stages', { get: () => build()[r.id], enumerable: true });
    return door;
  });
  KF.Levels = KF.Levels || {};
  KF.StylePlan = KF.StylePlan || {};

  KF.addStage = (bucket, def) => {
    if (!pool[bucket]) throw new Error('Unknown stage bucket: ' + bucket);
    built = null;
    pool[bucket].push(KF.util.deepFreeze(Object.assign({}, def)));
  };
})(window.KF);
