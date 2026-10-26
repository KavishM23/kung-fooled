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
  // Winding tall rooms double back. These invisible landmarks guide the
  // reachability checker around those bends; they are not doors.
  const GUIDES = {
    'eightbit-3': [[385,261],[780,395]],
    'woodblock-3': [[172,101],[720,405]],
    'vapor-3': [[237,101],[506,453]],
    'cyber-1': [[316,149],[715,309]],
    'cyber-2': [[350,165],[441,277]],
    'cyber-3': [[204,85],[512,368],[608,368],[688,144],[725,21]],
  };
  REALMS.forEach((r) => { pool['tall_' + r.id] = []; });

  // Names for places shown in any style; a style's own world (env_*) uses that world's name.
  const PLACES = { rooftop: 'ROOFTOPS', harbour: 'THE DOCKS', neon: 'NIGHT MARKET', temple: 'TEMPLE COURTYARD', train: 'SKY EXPRESS', sakura: 'SAKURA VALLEY', viking: 'THE FJORD' };
  const PLACE_MUSIC = { rooftop: 'rooftop', harbour: 'harbour', neon: 'neon', temple: 'shrine', train: 'train', sakura: 'sakura', viking: 'viking' };
  // A level moves through four recognizable locations in one place. These
  // names also identify the doorway, stairs, hatch or bridge between them.
  function localities(env) {
    if (/train|rail/.test(env)) return ['PLATFORM', 'CARRIAGE', 'ENGINE WALK', 'SIGNAL GANTRY'];
    if (/harbour|dock|wave/.test(env)) return ['QUAYSIDE', 'WAREHOUSE', 'CRANE WALK', 'BREAKWATER'];
    if (/temple|sakura|pagoda/.test(env)) return ['OUTER GARDEN', 'INNER HALL', 'COVERED WALK', 'SANCTUARY'];
    if (/viking|fjord|mountain|cliff/.test(env)) return ['LOWER PATH', 'CAVE PASSAGE', 'CLIFF LEDGE', 'SUMMIT GATE'];
    if (/backyard/.test(env)) return ['SIDE YARD', 'BASEMENT', 'FIRE ESCAPE', 'UPPER ROOF'];
    if (/mall/.test(env)) return ['SHOP FRONT', 'SERVICE HALL', 'UPPER ARCADE', 'SKYLIGHT'];
    if (/gameboy|nes8bit/.test(env)) return ['TOWN EDGE', 'HIDDEN ROUTE', 'HIGH PASS', 'FINAL GATE'];
    if (/plaza|promenade/.test(env)) return ['LOWER SQUARE', 'PASSAGE', 'BALCONY', 'LOOKOUT'];
    if (/roof|city|studio|neon|chrome|hologram|atrium|comic|cyber/.test(env))
      return ['STREET ENTRY', 'INNER FLOORS', 'SCAFFOLD', 'ROOFTOP EXIT'];
    return ['OUTER PATH', 'INNER PASSAGE', 'UPPER WALK', 'EXIT GATE'];
  }
  function passages(env) {
    if (/train|rail/.test(env)) return ['START', 'CARRIAGE', 'ROOF HATCH', 'SIGNAL GATE'];
    if (/harbour|dock|wave/.test(env)) return ['START', 'WAREHOUSE', 'CRANE LIFT', 'GANGPLANK'];
    if (/temple|sakura|pagoda/.test(env)) return ['START', 'TEMPLE GATE', 'STONE STAIRS', 'INNER GATE'];
    if (/viking|fjord|mountain|cliff/.test(env)) return ['START', 'CAVE MOUTH', 'CLIFF PATH', 'SUMMIT PASS'];
    if (/roof|city|studio|neon|chrome|hologram|atrium|comic|cyber/.test(env))
      return ['START', 'SERVICE DOOR', 'FIRE ESCAPE', 'ROOF HATCH'];
    return ['START', 'GATE', 'STAIRS', 'UPPER DOOR'];
  }
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
      [],
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
        // Keep each source room's obstacle set and signs in its middle district.
        const baseTraps = (def.traps || []).concat(def.noGates ? [] : (EXTRA_OBSTACLES[r.id] || [])[j] || []);
        const labels = r.id === 'oldtv' && !def.noGates ? [{ at: [5, 10], text: retroSigns[j] }] : def.labels;
        const env = (r.envs.includes(def.env) && def.env) || r.envs[j];
        const course = KF.LongRoutes.compose(def, baseTraps, labels, k * 4 + j, GUIDES[`${r.id}-${j + 1}`], env, r.id);
        return KF.util.deepFreeze(Object.assign({}, def, {
          realm: r.id, index: j, env, theme: env,
          labels: course.labels,
          map: course.map,
          depths: course.depths,
          combat: course.combat,
          checkpoints: course.checkpoints,
          doorLinks: course.doorLinks,
          dividers: course.dividers,
          guides: course.guides,
          routeZones: course.routeZones,
          baits: course.baits,
          structures: course.structures,
          concept: course.concept,
          family: course.family,
          authored: course.authored,
          props: course.props,
          partFrames: course.partFrames,
          parts: localities(env).map((name, i) => ({
            name: (course.partNames && course.partNames[i]) || name,
            entrance: (course.entrances && course.entrances[i]) || passages(env)[i] })),
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
