'use strict';
// Architecture is the ornament here: white planes, black joints, precise red
// accents and traps that change the geometry when the player commits.
(function (KF) {
  KF.FamilyKit.register({
    name: 'superhot', envs: /^superhot_/, art: 'superhot',
    palette: ['#20232a', '#d1d8dd', '#f8fcff', '#e14649', '#c8d1d5', '#ff6a63'],
    approach: [
      { name: 'WHITE LOBBY', entrance: 'GLASS DOOR', shape: 'lobby-glass-atrium',
        widths: [20, 17, 17, 18], floors: [27, 27, 19, 23],
        places: ['white lobby', 'glass corridor', 'open atrium', 'lower lab'],
        transitions: ['bridge', 'stairs', 'ledge'], trick: 'lureFloor', baitArea: 1, baitOffset: 9 },
      { name: 'EMPTY CORRIDOR', entrance: 'RETRACTING SPAN', shape: 'corridor-shaft-deck',
        widths: [18, 18, 18, 18], floors: [22, 27, 19, 22],
        places: ['white corridor', 'vertical shaft', 'suspended glass', 'atrium'],
        transitions: ['shaft', 'lift', 'bridge'], trick: 'fakeFloor', baitArea: 2, baitOffset: 9 },
    ],
    journey: [
      { name: 'SUSPENDED ATRIUM', entrance: 'UPPER LIFT', shape: 'atrium-gallery-lab',
        widths: [18, 18, 17, 19], floors: [24, 17, 25, 19],
        places: ['atrium', 'suspended glass', 'lower lab', 'observation gallery'],
        transitions: ['lift', 'ledge', 'stairs'], trick: 'crusher', baitArea: 2, baitOffset: 9 },
      { name: 'SHIFTING CHAMBER', entrance: 'MOVING WALL', shape: 'lab-shaft-gallery',
        widths: [19, 17, 18, 18], floors: [27, 21, 27, 18],
        places: ['lower lab', 'glass stairs', 'vertical shaft', 'upper gallery'],
        transitions: ['stairs', 'shaft', 'lift'], trick: 'spikes', baitArea: 1, baitOffset: 9 },
    ],
    finale: [
      { name: 'OBSERVATION DECK', entrance: 'FINAL GLASS', shape: 'deck-shaft-chamber',
        widths: [18, 19, 17, 18], floors: [19, 24, 17, 22],
        places: ['observation deck', 'glass bridge', 'white chamber', 'upper lab'],
        transitions: ['bridge', 'lift', 'stairs'], trick: 'fakeDoor', baitArea: 3, baitOffset: 8 },
      { name: 'THE LAST PLANE', entrance: 'RED PORTAL', shape: 'atrium-platform-exit',
        widths: [18, 18, 18, 18], floors: [26, 18, 22, 17],
        places: ['open atrium', 'suspended glass', 'lower lab', 'white chamber'],
        transitions: ['lift', 'ledge', 'stairs'], trick: 'collapse', baitArea: 3, baitOffset: 9 },
    ],
  });
})(window.KF);
