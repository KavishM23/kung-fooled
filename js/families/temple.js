'use strict';
// Courts, terraces, galleries and buried chambers: temple height comes from
// masonry, deliberate stair flights and suspended wooden walks.
(function (KF) {
  KF.FamilyKit.register({
    name: 'temple', envs: /temple|sakura/, art: 'temple',
    palette: ['#312d38', '#726c70', '#c9bfa7', '#c88a6c', '#586d58', '#f1d09a'],
    approach: [
      { name: 'OUTER COURT', entrance: 'STONE GATE', shape: 'court-terrace-hall',
        widths: [18, 18, 18, 18], floors: [27, 22, 17, 24],
        places: ['outer court', 'stone terrace', 'temple hall', 'sunken garden'],
        transitions: ['stairs', 'stairs', 'ledge'], trick: 'collapse', baitArea: 1, baitOffset: 9 },
      { name: 'GARDEN STEPS', entrance: 'GARDEN ARCH', shape: 'garden-bridge-gallery',
        widths: [19, 17, 18, 18], floors: [24, 18, 25, 19],
        places: ['garden', 'wooden bridge', 'lower chamber', 'gallery'],
        transitions: ['stairs', 'bridge', 'stairs'], trick: 'fakeFloor', baitArea: 2, baitOffset: 9 },
    ],
    journey: [
      { name: 'UNDER THE SHRINE', entrance: 'CRYPT STAIR', shape: 'hall-crypt-shrine',
        widths: [18, 18, 17, 19], floors: [20, 27, 22, 17],
        places: ['main hall', 'crypt', 'pillared court', 'shrine'],
        transitions: ['stairs', 'stairs', 'stairs'], trick: 'crusher', baitArea: 1, baitOffset: 10 },
      { name: 'HANGING GALLERY', entrance: 'WOODEN WALK', shape: 'courtyard-gallery-tower',
        widths: [18, 17, 19, 18], floors: [27, 20, 24, 16],
        places: ['lower court', 'hanging gallery', 'stone hall', 'temple tower'],
        transitions: ['stairs', 'bridge', 'stairs'], trick: 'lureFloor', baitArea: 2, baitOffset: 9 },
    ],
    finale: [
      { name: 'INNER SANCTUARY', entrance: 'SANCTUARY GATE', shape: 'tower-court-sanctuary',
        widths: [18, 18, 18, 18], floors: [18, 24, 20, 16],
        places: ['tower', 'inner court', 'shrine', 'sanctuary'],
        transitions: ['stairs', 'stairs', 'stairs'], trick: 'fakeDoor', baitArea: 3, baitOffset: 8 },
      { name: 'THE LAST PAGODA', entrance: 'FINAL SHRINE', shape: 'crypt-terrace-pagoda',
        widths: [19, 17, 18, 18], floors: [26, 20, 25, 17],
        places: ['buried chamber', 'high terrace', 'garden', 'pagoda'],
        transitions: ['stairs', 'ledge', 'stairs'], trick: 'spikes', baitArea: 2, baitOffset: 9 },
    ],
  });
})(window.KF);
