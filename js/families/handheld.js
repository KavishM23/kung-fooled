'use strict';
// Four greens, broad cliffs and short readable climbs: the handheld world is
// an adventure route rather than a rooftop course.
(function (KF) {
  KF.FamilyKit.register({
    name: 'handheld', realms: ['pocket'], art: 'handheld',
    palette: ['#142c24', '#306247', '#82aa68', '#b4c979', '#557f50', '#d4e2a0'],
    approach: [
      { name: 'VILLAGE TO HIGHLAND', entrance: 'TRAIL GATE', shape: 'village-forest-cliff',
        widths: [19, 18, 16, 19], floors: [27, 23, 17, 22],
        places: ['village', 'forest trail', 'raised cliff', 'meadow'],
        transitions: ['stairs', 'vines', 'ledge'], trick: 'collapse', baitArea: 1, baitOffset: 10 },
      { name: 'RIVER ROUTE', entrance: 'WOODEN BRIDGE', shape: 'woods-river-cave',
        widths: [18, 17, 19, 18], floors: [22, 27, 21, 17],
        places: ['forest', 'river bank', 'cave mouth', 'highland'],
        transitions: ['bridge', 'vines', 'ladder'], trick: 'fakeFloor', baitArea: 2, baitOffset: 10 },
    ],
    journey: [
      { name: 'RUIN STAIR', entrance: 'CAVE ENTRANCE', shape: 'cave-ruins-tower',
        widths: [18, 18, 18, 18], floors: [20, 27, 22, 16],
        places: ['cave', 'underground ruins', 'stone hall', 'tower'],
        transitions: ['ledge', 'stairs', 'ladder'], trick: 'spikes', baitArea: 1, baitOffset: 10 },
      { name: 'CANOPY WALK', entrance: 'FOREST LADDER', shape: 'grove-branches-bridge',
        widths: [17, 20, 16, 19], floors: [27, 19, 23, 17],
        places: ['grove', 'canopy', 'river bridge', 'cliff trail'],
        transitions: ['vines', 'bridge', 'vines'], trick: 'lureFloor', baitArea: 2, baitOffset: 8 },
    ],
    finale: [
      { name: 'MOUNTAIN SETTLEMENT', entrance: 'SUMMIT GATE', shape: 'ridge-tower-town',
        widths: [18, 18, 18, 18], floors: [22, 16, 24, 18],
        places: ['ridge', 'lookout tower', 'mountain trail', 'village'],
        transitions: ['ladder', 'ledge', 'stairs'], trick: 'fakeDoor', baitArea: 3, baitOffset: 8 },
      { name: 'THE LAST BRIDGE', entrance: 'TOWN ARCH', shape: 'ruins-bridge-gate',
        widths: [19, 17, 17, 19], floors: [27, 21, 24, 17],
        places: ['old ruins', 'river bridge', 'forest trail', 'gatehouse'],
        transitions: ['stairs', 'bridge', 'ladder'], trick: 'crusher', baitArea: 2, baitOffset: 9 },
    ],
  });
})(window.KF);
