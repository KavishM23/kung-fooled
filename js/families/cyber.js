'use strict';
// The hologram and chrome levels make vertical routes out of projected decks,
// server halls and chrome shafts. The SUPERHOT finale uses its own sparse kit.
(function (KF) {
  KF.FamilyKit.register({
    name: 'cyber', envs: /^cyber_(hologram|chrome)$/, art: 'cyber',
    palette: ['#122536', '#315469', '#a1cbd1', '#4bb6ba', '#3a7d83', '#b5f6e4'],
    approach: [
      { name: 'NEON ACCESS', entrance: 'DATA GATE', shape: 'street-projector-deck',
        widths: [18, 18, 18, 18], floors: [27, 22, 17, 24],
        places: ['cyber street', 'hologram portal', 'projected glass', 'service floor'],
        transitions: ['stairs', 'lift', 'ledge'], trick: 'fakeFloor', baitArea: 2, baitOffset: 9 },
      { name: 'CHROME UNDERPASS', entrance: 'MAINTENANCE LIFT', shape: 'roof-server-shaft',
        widths: [18, 17, 19, 18], floors: [21, 27, 19, 23],
        places: ['chrome roof', 'server tunnel', 'vertical shaft', 'neon gallery'],
        transitions: ['shaft', 'lift', 'stairs'], trick: 'lureFloor', baitArea: 1, baitOffset: 9 },
    ],
    journey: [
      { name: 'PROJECTOR ROOM', entrance: 'GLASS PASSAGE', shape: 'atrium-server-gallery',
        widths: [18, 18, 17, 19], floors: [20, 27, 23, 17],
        places: ['hologram atrium', 'server hall', 'chrome balcony', 'upper gallery'],
        transitions: ['stairs', 'lift', 'stairs'], trick: 'crusher', baitArea: 1, baitOffset: 10 },
      { name: 'THE CHROME SHAFT', entrance: 'DATA LIFT', shape: 'lab-shaft-glass',
        widths: [18, 18, 18, 18], floors: [27, 19, 25, 17],
        places: ['lower lab', 'chrome tower', 'hologram tunnel', 'glass deck'],
        transitions: ['lift', 'shaft', 'lift'], trick: 'spikes', baitArea: 2, baitOffset: 9 },
    ],
    finale: [
      { name: 'HIGH SERVER', entrance: 'EXIT TERMINAL', shape: 'deck-data-tower',
        widths: [18, 18, 18, 18], floors: [22, 17, 24, 18],
        places: ['glass deck', 'server tower', 'lower lab', 'neon portal'],
        transitions: ['lift', 'shaft', 'lift'], trick: 'fakeDoor', baitArea: 3, baitOffset: 8 },
      { name: 'SIGNAL ROOF', entrance: 'FINAL PROJECTOR', shape: 'neon-gallery-roof',
        widths: [18, 17, 19, 18], floors: [27, 21, 26, 18],
        places: ['neon street', 'upper gallery', 'server hall', 'chrome roof'],
        transitions: ['stairs', 'shaft', 'lift'], trick: 'collapse', baitArea: 3, baitOffset: 9 },
    ],
  });
})(window.KF);
