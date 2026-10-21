'use strict';
// Which world each level is, and the rule that world bends. Pure data, loaded by the game and by
// tools/solve.js, so every rule is part of the "is this level beatable" check.
//   name      the level's world, shown on its title card and the HUD
//   rule      one line telling the player what is different here (null = nothing)
//   tuning    multipliers on KF.PlayerTuning: gravity, jumpVel, runSpeed, maxFall
//   fixedJump every jump is full height (no variable jump), like old consoles
//   ice       the whole level is slippery
//   reverse   left and right are swapped
//   wind      constant push in px/s (negative = headwind)
//   timeScale the whole level runs faster (> 1) or slower (< 1)
//   camera    'panels': the camera jumps a half-screen at a time instead of following smoothly
//   reveal    traps and hidden blocks are drawn as dashed outlines before they go off
//   sight     tiles further than this many px from the player are not drawn
//   blackout  the lights cut out for `blackout.off` s every `blackout.every` s, with a warning flicker
//   rewind    dying plays the last moments backwards before the respawn
(function (KF) {
  KF.StylePlan = {
    rooftop: ['hd', 'oldtv', 'comic', 'gameboy', 'vhs'],
    harbour: ['silent', 'blueprint', 'pocket', 'noir', 'cga'],
    neon: ['glitch', 'vaporwave', 'mirror', 'thermal', 'bsod'],
    temple: ['sketch', 'ink', 'nightvision', 'ascii', 'cube3d'],
    train: ['nes8bit', 'negative', 'cinema', 'popart', 'vector'],
    sakura: ['storybook', 'ukiyo', 'dream', 'duotone', 'polaroid'],
    viking: ['emboss', 'stitch', 'candle', 'frost', 'golden'],
  };

  const R = {
    hd: { name: 'ROOFTOPS AT DUSK', rule: null },
    oldtv: { name: 'THE 1950S STUDIO', rule: 'LIVE TV. THE PICTURE ROLLS NOW AND THEN.', roll: { every: 7, dur: 0.7 } },
    comic: { name: 'COMIC CITY', rule: 'ONE PANEL AT A TIME.', camera: 'panels' },
    gameboy: { name: 'POCKET TOWN', rule: 'LOW BATTERY: EVERYTHING IS SLUGGISH.', tuning: { runSpeed: 0.85 } },
    vhs: { name: 'BACKYARD TAPE', rule: 'EVERY DEATH GETS REWOUND.', rewind: true },

    silent: { name: 'THE SILENT DOCK', rule: 'UNDERCRANKED: EVERYTHING RUNS FAST.', timeScale: 1.15 },
    blueprint: { name: 'THE BLUEPRINT', rule: 'THE PLANS MARK WHERE EVERY TRAP IS.', reveal: true },
    pocket: { name: 'AR PROMENADE', rule: 'THE WORLD IS ON YOUR PHONE. MIND THE TILT.' },
    noir: { name: 'RAINY WATERFRONT', rule: 'THE LIGHTS KEEP CUTTING OUT.', blackout: { every: 6, off: 1.2 } },
    cga: { name: 'PIRATE DISK', rule: 'TURBO BUTTON IS ON: YOU RUN FASTER.', tuning: { runSpeed: 1.2 } },

    glitch: { name: 'CORRUPTED MARKET', rule: 'THE PICTURE IS BREAKING UP.' },
    vaporwave: { name: 'VAPOR PLAZA', rule: 'SLOWED + REVERB: EVERYTHING AT 80%.', timeScale: 0.8 },
    mirror: { name: 'HALL OF MIRRORS', rule: 'THE WHOLE WORLD IS FLIPPED. RIGHT GOES LEFT.' },
    thermal: { name: 'WAREHOUSE CAM 04', rule: 'ONLY WARM THINGS SHOW UP WELL.' },
    bsod: { name: 'FATAL ERROR', rule: 'THE GAME HAS CRASHED. PLAY ANYWAY.' },

    sketch: { name: 'THE NOTEBOOK', rule: 'THE PENCIL ONLY DRAWS WHAT IS NEAR YOU.', sight: 150 },
    ink: { name: 'INK MOUNTAINS', rule: 'LIGHT AS A BRUSH STROKE: LOWER GRAVITY.', tuning: { gravity: 0.85 } },
    nightvision: { name: 'JUNGLE RUINS', rule: 'YOU CAN ONLY SEE THROUGH THE GOGGLES.' },
    ascii: { name: 'TEXT MODE', rule: 'YOU ARE THE @.' },
    cube3d: { name: 'THE TOY BOX', rule: 'NOW IN 3D. THE FLOOR IS STILL FLAT.' },

    nes8bit: { name: 'WILD WEST 8-BIT', rule: 'OLD CONSOLE: EVERY JUMP IS FULL HEIGHT.', fixedJump: true },
    negative: { name: 'SUBWAY NEGATIVE', rule: 'DARK IS LIGHT. LIGHT IS DARK.' },
    cinema: { name: 'THE TRAIN ROBBERY', rule: 'WIDESCREEN: LESS SKY, MORE DRAMA.' },
    popart: { name: 'POP ART METRO', rule: 'ONE PANEL AT A TIME.', camera: 'panels' },
    vector: { name: 'VECTOR LINE', rule: 'WIREFRAME ONLY. NO FILL, NO MERCY.' },

    storybook: { name: 'THE POP-UP BOOK', rule: 'ONCE UPON A TIME.' },
    ukiyo: { name: 'THE GREAT WAVE', rule: 'A HEADWIND OFF THE SEA.', wind: -24 },
    dream: { name: 'THE DREAM', rule: 'LOW GRAVITY. YOU FLOAT.', tuning: { gravity: 0.62, maxFall: 0.7 } },
    duotone: { name: 'THE TEA HOUSE', rule: 'TWO COLOURS. THAT IS ALL.' },
    polaroid: { name: 'HANAMI PHOTO', rule: 'SMILE FOR THE CAMERA.' },

    emboss: { name: 'THE RUNESTONE', rule: 'CARVED IN STONE.' },
    stitch: { name: 'THE TAPESTRY', rule: 'EMBROIDERED ONE STITCH AT A TIME.' },
    candle: { name: 'THE MEAD HALL', rule: 'ONLY THE FIRE LIGHTS THE WAY.' },
    frost: { name: 'GLACIER CAVE', rule: 'EVERYTHING IS ICE.', ice: true },
    golden: { name: 'VALHALLA', rule: 'BLESSED BY THE GODS: YOU JUMP HIGHER.', tuning: { jumpVel: 1.08 } },
  };

  KF.Rules = {
    all: R,
    styleFor(def) { return (def && def.style) || (def && KF.StylePlan[def.realm] || [])[def && def.index] || 'hd'; },
    get(def) { return R[this.styleFor(def)] || R.hd; },
    // The player's movement numbers with a rule's multipliers applied.
    tuning(rule) {
      const t = Object.assign({}, KF.PlayerTuning);
      for (const k in (rule && rule.tuning) || {}) t[k] *= rule.tuning[k];
      if (rule && rule.fixedJump) t.jumpCutVel = t.jumpVel;
      return t;
    },
  };
})(window.KF);
