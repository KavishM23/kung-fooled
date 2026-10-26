'use strict';
// Door 1: ROOFTOP AT DUSK. New traps: collapsing floor, pop-up spikes, falling ceiling.
// Map legend:  # solid   = solid prop block   - one-way platform   ^ v < > spikes
//              P spawn   D exit door (bottom tile)   U upside-down exit door (top tile)
// Trap coordinates are tiles: at: [column, row, width, height]. See js/traps.js for every option.
(function (KF) {
  KF.addStage('rooftop', {
    name: 'WARM UP',
    map: [
      '..............................',
      '..............................',
      '..............................',
      '..............................',
      '..............................',
      '..............................',
      '..............................',
      '..............................',
      '..............................',
      '..............................',
      '..P.....=..................D..',
      '##############################',
      '##############################',
      '##############################',
    ],

    labels: [{ at: [4, 10], text: 'EASY!' }],
    traps: [
      // Attempt 1: the floor halfway drops. Attempt 2: that one is fine, the next one drops.
      // Attempt 3+: both. Each gap is 3 tiles: an easy jump once you know.
      { type: 'collapse', at: [13, 11, 3, 3], deaths: [0, '2+'], say: 'OOPS' },
      { type: 'collapse', at: [19, 11, 3, 3], deaths: ['1+'], say: 'GOTCHA' },
      // Layered: Coins pay out. The one by the door doesn't.
      { type: 'coin', at: [5, 10] },
      { type: 'coin', at: [6, 10] },
      { type: 'coin', at: [24, 10], boom: true },
    ],
  });

  KF.addStage('rooftop', {
    name: 'SPIKE SURPRISE',
    map: [
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '..P.............^^...........D..',
      '################################',
      '################################',
      '################################',
    ],

    labels: [{ at: [5, 10], text: 'NO SPIKES' }],
    traps: [
      { type: 'spikes', at: [9, 10, 2], when: { x: 8 }, deaths: [0, '2+'] },
      { type: 'spikes', at: [9, 10, 2], when: { x: 4.5 }, deaths: [1], say: 'SEE?' },
      // Pops up where you'd land after hopping the first set.
      { type: 'spikes', at: [12, 10, 2], when: { x: 10, airborne: true }, deaths: ['1+'] },
      { type: 'spikes', at: [21, 10, 2], when: { x: 19.5 } },
      // Layered: One more, just when the door is in sight.
      { type: 'spikes', at: [25, 10, 2], when: { x: 23.5, grounded: true }, say: 'AND ANOTHER' },
    ],
  });

  KF.addStage('rooftop', {
    name: 'LOOK UP',
    map: [
      '..................................',
      '..................................',
      '..................................',
      '..................................',
      '............=........=............',
      '..........#############...........',
      '..........#############...........',
      '..................................',
      '..................................',
      '..................................',
      '..P...........................D...',
      '##################################',
      '##################################',
      '##################################',
    ],

    labels: [{ at: [6, 10], text: 'SAFE ZONE' }],
    traps: [
      // Drops just ahead of you so that running straight in gets you squashed. Stop and let it land.
      { type: 'crusher', at: [13, 5, 2, 2], when: { x: 11.6 }, deaths: [0, '2+'], say: 'HEADS UP' },
      { type: 'crusher', at: [19, 5, 2, 2], when: { x: 17.6 }, deaths: ['1+'] },
    ],
  });

  KF.addStage('rooftop', {
    name: 'TRUST FALL',
    map: [
      '....................................',
      '....................................',
      '....................................',
      '....................................',
      '....................................',
      '....................................',
      '....................................',
      '....................................',
      '....................................',
      '....................................',
      '..P.......##..##..##.............D..',
      '########..............##############',
      '########..............##############',
      '########^^^^^^^^^^^^^^##############',
    ],

    traps: [
      // The middle stepping stone always crumbles: bounce off it.
      { type: 'collapse', at: [14, 10, 2, 1], delay: 0.22 },
      { type: 'collapse', at: [18, 10, 2, 1], delay: 0.3, deaths: ['1+'] },
      { type: 'spikes', at: [22, 10, 1], when: { x: 20, airborne: true }, deaths: ['2+'], say: 'HA!' },
    ],
  });

  KF.addStage('rooftop', {
    name: 'ROOFTOP RUMBLE',
    map: [
      '..............................................',
      '..............................................',
      '..............................................',
      '..............................................',
      '..............................................',
      '..............###########.....................',
      '..............###########.....................',
      '...........................................D..',
      '...................................###########',
      '...............................==..###########',
      '..P.........................=..==..###########',
      '##############################################',
      '##############################################',
      '##############################################',
    ],

    labels: [{ at: [37, 7], text: 'EXIT' }],
    traps: [
      { type: 'spikes', at: [7, 10, 2], when: { x: 5.8 }, deaths: [0] },
      { type: 'spikes', at: [7, 10, 2], when: { x: 3 }, deaths: ['1+'] },
      { type: 'hidden', at: [8, 7], deaths: ['1+'] },
      // The block lands, then the floor under it gives way.
      { id: 'c1', type: 'crusher', at: [17, 5, 2, 2], when: { x: 15.6 } },
      { type: 'collapse', at: [17, 11, 2, 3], when: { after: 'c1' }, delay: 0.45 },
      { type: 'crusher', at: [22, 5, 2, 2], when: { x: 20.8 }, deaths: ['1+'] },
      { type: 'collapse', at: [31, 9, 2, 2], delay: 0.15, deaths: [0, '2+'] },
      { type: 'spikes', at: [41, 7, 1], when: { x: 39 }, say: 'ALMOST' },
      // Layered: The first door on the roof is a set: it drops you back at the start.
      { type: 'warpDoor', at: [37, 7], to: [3, 11], say: 'FROM THE TOP' },
    ],
  });
})(window.KF);
