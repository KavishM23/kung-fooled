'use strict';
// Urban traversal belongs to actual connected buildings: street entrances,
// balconies, stairwells and upper roofs, with structural traps on the route.
(function (KF) {
  KF.FamilyKit.register({
    name: 'city', envs: /rooftop|megacity/, art: 'city',
    palette: ['#1d2637', '#40556a', '#8eabb5', '#a8795b', '#415a60', '#f5c980'],
    approach: [
      { name: 'STREET TO FIRE ESCAPE', entrance: 'SERVICE ENTRY', shape: 'alley-balcony-roof',
        widths: [19, 17, 17, 19], floors: [27, 21, 17, 24],
        places: ['street', 'building balcony', 'high roof', 'service yard'],
        transitions: ['stairs', 'ladder', 'fire escape'], trick: 'collapse', baitArea: 1, baitOffset: 9 },
      { name: 'TOWER APPROACH', entrance: 'MAINTENANCE DOOR', shape: 'roof-alley-scaffold',
        widths: [18, 19, 17, 18], floors: [20, 27, 18, 22],
        places: ['roof', 'lower street', 'scaffold tower', 'office balcony'],
        transitions: ['fire escape', 'ladder', 'ledge'], trick: 'crusher', baitArea: 2, baitOffset: 8 },
    ],
    journey: [
      { name: 'INSIDE THE TOWER', entrance: 'STAIRWELL', shape: 'office-hall-window',
        widths: [18, 18, 18, 18], floors: [20, 27, 23, 17],
        places: ['office', 'lower hall', 'window ledge', 'upper office'],
        transitions: ['stairs', 'stairs', 'lift'], trick: 'fakeFloor', baitArea: 1, baitOffset: 10 },
      { name: 'THE EXTERIOR', entrance: 'FIRE ESCAPE', shape: 'balcony-scaffold-roof',
        widths: [19, 17, 18, 18], floors: [25, 19, 26, 17],
        places: ['balcony', 'maintenance platform', 'lower roof', 'crane deck'],
        transitions: ['ladder', 'fire escape', 'lift'], trick: 'spikes', baitArea: 2, baitOffset: 9 },
    ],
    finale: [
      { name: 'CRANE AND ROOFS', entrance: 'UPPER HATCH', shape: 'roof-crane-exit',
        widths: [18, 18, 18, 18], floors: [21, 17, 25, 19],
        places: ['upper roof', 'crane', 'service floor', 'high roof'],
        transitions: ['ladder', 'fire escape', 'stairs'], trick: 'fakeDoor', baitArea: 3, baitOffset: 8 },
      { name: 'THE TOP FLOOR', entrance: 'ROOF HATCH', shape: 'yard-office-tower',
        widths: [17, 20, 17, 18], floors: [27, 21, 18, 23],
        places: ['service yard', 'office', 'tower roof', 'final balcony'],
        transitions: ['lift', 'stairs', 'ledge'], trick: 'lureFloor', baitArea: 2, baitOffset: 9 },
    ],
  });
})(window.KF);
