'use strict';
// The realms. Each realm is one visual style (its medium: old TV, Game Boy, comic...), and its
// four levels are different places (rooftops, the docks, a temple...) all shown in that style.
// Path through a realm: level, level, street fight, level, level, boss.
//
// Stage files still call KF.addStage(bucket, def) with their original bucket (rooftop, harbour,
// ...); the buckets are dealt out to the realms in order, so difficulty keeps rising.
(function (KF) {
  const REALMS = [
    { id: 'arcade', name: 'ARCADE', sub: 'FULL COLOUR', style: 'hd', theme: 'rooftop', music: 'rooftop', envs: ['rooftop', 'harbour', 'temple', 'sakura'] },
    // Smooth realms (not pixel art) draw their own versions of each place: <realm>_<place>.
    { id: 'oldtv', name: 'OLD TV', sub: 'BLACK AND WHITE', style: 'oldtv', theme: 'oldtv_studio', music: 'rooftop', envs: ['oldtv_studio', 'oldtv_rooftop', 'oldtv_train', 'oldtv_harbour'] },
    { id: 'pocket', name: 'POCKET', sub: 'FOUR GREENS', style: 'gameboy', theme: 'env_gameboy', music: 'shrine', envs: ['env_gameboy', 'temple', 'sakura', 'viking'] },
    { id: 'comic', name: 'COMIC', sub: 'POW! BAM!', style: 'comic', theme: 'comic_city', music: 'neon', envs: ['comic_city', 'comic_neon', 'comic_train', 'comic_rooftop'] },
    { id: 'argo', name: 'AR GO', sub: 'ON YOUR PHONE', style: 'pocket', theme: 'argo_promenade', music: 'sakura', envs: ['argo_promenade', 'argo_sakura', 'argo_harbour', 'argo_temple'] },
    { id: 'eightbit', name: '8-BIT', sub: 'CARTRIDGE ERA', style: 'nes8bit', theme: 'env_nes8bit', music: 'train', envs: ['env_nes8bit', 'viking', 'neon', 'harbour'] },
    { id: 'woodblock', name: 'WOODBLOCK', sub: 'OLD EDO PRINTS', style: 'ukiyo', theme: 'woodblock_wave', music: 'sakura', envs: ['woodblock_wave', 'woodblock_mountains', 'woodblock_sakura', 'woodblock_fjord'] },
    { id: 'vhs', name: 'VHS', sub: 'HOME VIDEO 1996', style: 'vhs', theme: 'vhs_backyard', music: 'rooftop', envs: ['vhs_backyard', 'vhs_rooftop', 'vhs_mall', 'vhs_train'] },
    { id: 'vapor', name: 'VAPORWAVE', sub: 'SLOWED + REVERB', style: 'vaporwave', theme: 'vapor_plaza', music: 'neon', envs: ['vapor_plaza', 'vapor_neon', 'vapor_harbour', 'vapor_train'] },
    { id: 'cyber', name: 'CYBER', sub: 'NEO-TOKYO 2099', style: 'cyberpunk', theme: 'cyber_megacity', music: 'cyber', envs: ['cyber_megacity', 'cyber_hologram', 'cyber_chrome', 'cyber_datacore'] },
  ];
  const BUCKETS = ['rooftop', 'harbour', 'neon', 'temple', 'train', 'sakura', 'viking', 'cyber'];
  const pool = {};
  BUCKETS.forEach((b) => { pool[b] = []; });

  // Names for places shown in any style; a style's own world (env_*) uses that world's name.
  const PLACES = { rooftop: 'ROOFTOPS', harbour: 'THE DOCKS', neon: 'NIGHT MARKET', temple: 'TEMPLE COURTYARD', train: 'SKY EXPRESS', sakura: 'SAKURA VALLEY', viking: 'THE FJORD' };
  const PLACE_MUSIC = { rooftop: 'rooftop', harbour: 'harbour', neon: 'neon', temple: 'shrine', train: 'train', sakura: 'sakura', viking: 'viking' };
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
      built[r.id] = src.map((def, j) => KF.util.deepFreeze(Object.assign({}, def, {
        realm: r.id, index: j, env: r.envs[j], theme: r.envs[j],
        style: (r.styles && r.styles[j]) || r.style, music: PLACE_MUSIC[r.envs[j]] || r.music,
      })));
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
