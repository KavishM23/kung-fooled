'use strict';
// 1930s monochrome backlots, elevated train walks and studio flats. Moving
// scenery is the trick; the structural route retains generous old-film timing.
(function (KF) {
  KF.FamilyKit.register({
    name: 'silent', realms: ['oldtv'], art: 'silent',
    palette: ['#242424', '#666666', '#d5d1c5', '#929089', '#555555', '#f5ead4'],
    approach: [
      { name: 'STUDIO BACKLOT', entrance: 'STAGE DOOR', shape: 'set-stairs-catwalk',
        widths: [18, 17, 19, 18], floors: [27, 22, 18, 24],
        places: ['studio', 'painted street', 'upper catwalk', 'backstage'],
        transitions: ['stairs', 'ladder', 'ledge'], trick: 'fakeFloor', baitArea: 1, baitOffset: 9 },
      { name: 'THE TRAIN YARD', entrance: 'CARRIAGE DOOR', shape: 'platform-tunnel-bridge',
        widths: [19, 18, 17, 18], floors: [22, 27, 19, 23],
        places: ['train platform', 'dark tunnel', 'signal bridge', 'studio'],
        transitions: ['shaft', 'ladder', 'stairs'], trick: 'collapse', baitArea: 2, baitOffset: 8 },
    ],
    journey: [
      { name: 'ABOVE THE CITY', entrance: 'FIRE LADDER', shape: 'street-roof-studio',
        widths: [18, 18, 18, 18], floors: [27, 20, 25, 17],
        places: ['old street', 'city roof', 'film set', 'upper studio'],
        transitions: ['ladder', 'fire escape', 'stairs'], trick: 'spikes', baitArea: 2, baitOffset: 9 },
      { name: 'NIGHT EXPRESS', entrance: 'TRAIN STEPS', shape: 'coach-gantry-roof',
        widths: [18, 18, 17, 19], floors: [20, 26, 19, 23],
        places: ['train carriage', 'lower platform', 'signal gantry', 'roof'],
        transitions: ['stairs', 'ladder', 'ledge'], trick: 'crusher', baitArea: 1, baitOffset: 10 },
    ],
    finale: [
      { name: 'THE LAST REEL', entrance: 'PROJECTION DOOR', shape: 'studio-roof-exit',
        widths: [17, 19, 18, 18], floors: [25, 18, 22, 16],
        places: ['studio', 'projection booth', 'city roof', 'upper tower'],
        transitions: ['stairs', 'fire escape', 'ladder'], trick: 'fakeDoor', baitArea: 3, baitOffset: 8 },
      { name: 'CANAL FINALE', entrance: 'BRIDGE GATE', shape: 'dock-bridge-bell',
        widths: [18, 18, 18, 18], floors: [22, 26, 19, 23],
        places: ['dock', 'canal bridge', 'old tower', 'train platform'],
        transitions: ['bridge', 'ladder', 'stairs'], trick: 'lureFloor', baitArea: 1, baitOffset: 9 },
    ],
  });
})(window.KF);
