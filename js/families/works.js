'use strict';
// Docks, trains and industrial places climb through machines, service ladders,
// gantries and lifts. Machinery is scenery and a source of predictable tricks.
(function (KF) {
  KF.FamilyKit.register({
    name: 'works', envs: /harbour|train|mall/, art: 'works',
    palette: ['#24313c', '#50606a', '#a9b4ad', '#c58c54', '#687b69', '#ffd487'],
    approach: [
      { name: 'LOADING YARD', entrance: 'WAREHOUSE DOOR', shape: 'quay-bay-gantry',
        widths: [18, 18, 18, 18], floors: [27, 23, 17, 22],
        places: ['dock', 'loading bay', 'gantry', 'warehouse'],
        transitions: ['ladder', 'lift', 'ledge'], trick: 'collapse', baitArea: 1, baitOffset: 10 },
      { name: 'SERVICE TRACK', entrance: 'CARGO GATE', shape: 'platform-train-catwalk',
        widths: [19, 17, 18, 18], floors: [21, 27, 19, 23],
        places: ['train platform', 'service tunnel', 'upper catwalk', 'machine hall'],
        transitions: ['shaft', 'lift', 'ladder'], trick: 'crusher', baitArea: 2, baitOffset: 9 },
    ],
    journey: [
      { name: 'MACHINE FLOOR', entrance: 'SERVICE LIFT', shape: 'factory-shaft-control',
        widths: [18, 18, 17, 19], floors: [22, 27, 18, 22],
        places: ['factory', 'maintenance shaft', 'control platform', 'assembly hall'],
        transitions: ['shaft', 'lift', 'ladder'], trick: 'spikes', baitArea: 1, baitOffset: 10 },
      { name: 'FURNACE WALK', entrance: 'CATWALK GATE', shape: 'bay-furnace-gantry',
        widths: [17, 19, 18, 18], floors: [27, 19, 25, 17],
        places: ['loading bay', 'upper catwalk', 'furnace', 'gantry'],
        transitions: ['ladder', 'shaft', 'lift'], trick: 'lureFloor', baitArea: 2, baitOffset: 9 },
    ],
    finale: [
      { name: 'CONTROL ROOM', entrance: 'UPPER LIFT', shape: 'deck-crane-control',
        widths: [18, 18, 18, 18], floors: [22, 17, 25, 18],
        places: ['upper deck', 'crane', 'processing floor', 'control room'],
        transitions: ['lift', 'shaft', 'ladder'], trick: 'fakeDoor', baitArea: 3, baitOffset: 9 },
      { name: 'THE LAST GANTRY', entrance: 'EXIT HATCH', shape: 'floor-catwalk-exit',
        widths: [18, 17, 19, 18], floors: [27, 20, 24, 17],
        places: ['assembly floor', 'catwalk', 'machine platform', 'exit gantry'],
        transitions: ['ladder', 'bridge', 'lift'], trick: 'fakeFloor', baitArea: 2, baitOffset: 10 },
    ],
  });
})(window.KF);
