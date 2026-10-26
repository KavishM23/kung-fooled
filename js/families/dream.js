'use strict';
// Vaporwave rises through impossible plazas and atria. Broad colour planes
// and luminous geometry replace the industrial and rooftop vocabulary.
(function (KF) {
  KF.FamilyKit.register({
    name: 'dream', realms: ['vapor'], art: 'dream',
    palette: ['#30204d', '#695383', '#b2a4bc', '#ed9fba', '#6da9bd', '#ffe0b6'],
    approach: [
      { name: 'SUNSET PLAZA', entrance: 'MIRROR ARCH', shape: 'plaza-steps-glass',
        widths: [18, 18, 18, 18], floors: [27, 22, 17, 24],
        places: ['plaza', 'mirror stairs', 'glass deck', 'lower court'],
        transitions: ['stairs', 'stairs', 'ledge'], trick: 'fakeFloor', baitArea: 2, baitOffset: 10 },
      { name: 'SYNTH MARINA', entrance: 'NEON GATE', shape: 'shore-terrace-portal',
        widths: [19, 17, 18, 18], floors: [21, 27, 20, 17],
        places: ['shore', 'lower plaza', 'neon terrace', 'portal'],
        transitions: ['bridge', 'stairs', 'lift'], trick: 'lureFloor', baitArea: 1, baitOffset: 9 },
    ],
    journey: [
      { name: 'MIRROR HALL', entrance: 'GLASS STAIRS', shape: 'atrium-mirror-gallery',
        widths: [18, 18, 17, 19], floors: [20, 27, 23, 17],
        places: ['atrium', 'mirror hall', 'suspended glass', 'upper gallery'],
        transitions: ['stairs', 'lift', 'stairs'], trick: 'fakeDoor', baitArea: 1, baitOffset: 9 },
      { name: 'THE DREAM TRAIN', entrance: 'PLATFORM PORTAL', shape: 'platform-void-neon',
        widths: [18, 18, 18, 18], floors: [27, 19, 25, 17],
        places: ['train platform', 'void bridge', 'lower mall', 'neon gallery'],
        transitions: ['lift', 'bridge', 'stairs'], trick: 'spikes', baitArea: 2, baitOffset: 9 },
    ],
    finale: [
      { name: 'SKY DECK', entrance: 'HORIZON GATE', shape: 'plaza-suspended-exit',
        widths: [18, 18, 18, 18], floors: [23, 17, 24, 18],
        places: ['upper plaza', 'suspended glass', 'lower court', 'sky deck'],
        transitions: ['stairs', 'ledge', 'lift'], trick: 'collapse', baitArea: 3, baitOffset: 9 },
      { name: 'ENDLESS SUNSET', entrance: 'FINAL PORTAL', shape: 'mirror-beach-portal',
        widths: [18, 17, 19, 18], floors: [27, 21, 26, 18],
        places: ['mirror hall', 'neon balcony', 'shore', 'portal'],
        transitions: ['stairs', 'ledge', 'lift'], trick: 'crusher', baitArea: 3, baitOffset: 9 },
    ],
  });
})(window.KF);
