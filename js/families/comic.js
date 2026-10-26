'use strict';
// Angled inked city panels, train roofs and comic billboards. Spatial changes
// are bold and legible like panel cuts, while trap cues retain clear outlines.
(function (KF) {
  KF.FamilyKit.register({
    name: 'comic', realms: ['comic'], art: 'comic',
    palette: ['#22304d', '#52678c', '#f2e7d1', '#f3a657', '#45a7a1', '#ffda6d'],
    approach: [
      { name: 'PANEL ONE', entrance: 'INKED DOOR', shape: 'street-billboard-roof',
        widths: [18, 18, 18, 18], floors: [27, 22, 17, 24],
        places: ['city street', 'billboard', 'upper roof', 'lower street'],
        transitions: ['stairs', 'ladder', 'fire escape'], trick: 'spikes', baitArea: 1, baitOffset: 9 },
      { name: 'NIGHT MARKET', entrance: 'MARKET ARCH', shape: 'market-neon-balcony',
        widths: [19, 17, 18, 18], floors: [21, 27, 20, 17],
        places: ['market', 'neon alley', 'balcony', 'upper roof'],
        transitions: ['stairs', 'ladder', 'bridge'], trick: 'fakeFloor', baitArea: 2, baitOffset: 9 },
    ],
    journey: [
      { name: 'GUTTER CROSSING', entrance: 'PANEL GATE', shape: 'roof-train-bridge',
        widths: [18, 18, 17, 19], floors: [20, 27, 23, 17],
        places: ['rooftop', 'train platform', 'ink bridge', 'upper office'],
        transitions: ['fire escape', 'ladder', 'stairs'], trick: 'collapse', baitArea: 2, baitOffset: 9 },
      { name: 'BILLBOARD WALK', entrance: 'BACKDROP DOOR', shape: 'street-sign-scaffold',
        widths: [18, 18, 18, 18], floors: [27, 19, 25, 17],
        places: ['city street', 'billboard', 'lower alley', 'scaffold roof'],
        transitions: ['ladder', 'ledge', 'ladder'], trick: 'crusher', baitArea: 2, baitOffset: 9 },
    ],
    finale: [
      { name: 'LAST PANEL', entrance: 'FINAL FRAME', shape: 'roof-bridge-tower',
        widths: [18, 18, 18, 18], floors: [22, 17, 24, 18],
        places: ['upper roof', 'signal bridge', 'lower street', 'tower'],
        transitions: ['stairs', 'fire escape', 'ladder'], trick: 'fakeDoor', baitArea: 3, baitOffset: 9 },
      { name: 'SPLASH PAGE', entrance: 'THE EXIT', shape: 'market-train-roof',
        widths: [19, 17, 18, 18], floors: [27, 21, 26, 18],
        places: ['market', 'train roof', 'neon alley', 'high roof'],
        transitions: ['ladder', 'ledge', 'ladder'], trick: 'lureFloor', baitArea: 1, baitOffset: 9 },
    ],
  });
})(window.KF);
