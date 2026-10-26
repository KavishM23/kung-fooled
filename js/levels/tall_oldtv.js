'use strict';
// The oldtv realm's tall level (its third level), dealt in by js/levels/doors.js.
(function (KF) {
  // Up the fly tower of the old studio, a flip-screen climb: a trapdoor on the stage, a sandbag
  // that swings at you, pyrotechnics that guess where you'll land, a spotlight that drops, then back along
  // the fly gallery and up to the rafter, with lighting bars, a plank that isn't there, and
  // a floor of nails in front of the door once you've died once.
  KF.addStage('tall_oldtv', {
    name: 'BEHIND THE SCENES',
    env: 'oldtv_studio',
    noGates: true,
    camera: 'flip',
    map: [
      '#..............................................#',
      '#..............................................#',
      '#...........................==.......==........#',
      '#..............................................#',
      '#............................................D.#',
      '#....................###########################',
      '#.......................==.....................#',
      '#..............................................#',
      '#.............-------..........................#',
      '#..............................................#',
      '#..............................................#',
      '################################-------........#',
      '#..............................................#',
      '#..............................................#',
      '#..............................--------........#',
      '#................................###...........#',
      '#................................###...........#',
      '#.......................-------..###...........#',
      '#................................###...........#',
      '#................................###...........#',
      '#...............-------..........###...........#',
      '#................................###...........#',
      '#........=.......................###...........#',
      '#.......-------..................###...........#',
      '#................................###...........#',
      '#.P..............................###^^^^^^^^^^^#',
      '################################################',
    ],
    labels: [{ at: [7, 25], text: 'QUIET ON SET' }],
    depths: [{ r0: 0, kind: 'backstage' }],
    traps: [
      { type: 'fakeFloor', at: [4, 26, 3, 1], deaths: [0], say: 'TRAPDOOR' },
      { type: 'lunger', at: [9, 22, 1, 1], when: { near: 2 }, speed: 110, hop: 220, deaths: ['1+'], say: 'SANDBAG' },
      { type: 'ambushFlame', at: [16, 20, 7], when: { x: 14.5, airborne: true }, warn: 0.42, burn: 0.8, say: 'PYRO' },
      { type: 'crusher', at: [24, 6, 2, 1], when: { zone: [26, 8, 2, 3] }, say: 'SPOTLIGHT' },
      { type: 'crusher', at: [28, 2, 2, 1], when: { zone: [26, 3, 2, 2] } },
      { type: 'crusher', at: [37, 2, 2, 1], when: { zone: [35, 3, 2, 2] }, deaths: ['1+'] },
      { type: 'fakeFloor', at: [40, 5, 2, 1], deaths: [0, '2+'], say: 'MIND THE GAP' },
      { type: 'spikes', at: [43, 4, 2], when: { zone: [41, 3, 2, 2], grounded: true }, delay: 0.12, deaths: ['1+'], say: 'CUT!' },
      // Layered: A tempting row of coins off the route; one is a bomb.
      { type: 'coin', at: [25, 24] },
      { type: 'coin', at: [27, 24], boom: true },
      { type: 'coin', at: [29, 24] },
    ],
  });
})(window.KF);
