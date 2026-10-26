'use strict';
// Woodblock landscapes carry a path from shoreline to mountain. Cliffs are
// layered ink, bridges timber, and every drop remains within the print's depth.
(function (KF) {
  KF.FamilyKit.register({
    name: 'ukiyo', realms: ['woodblock'], art: 'ukiyo',
    palette: ['#283c50', '#54758b', '#bdc4b5', '#d99c70', '#587563', '#f2d5aa'],
    approach: [
      { name: 'THE SHORE PATH', entrance: 'ROPE BRIDGE', shape: 'shore-cliff-pine',
        widths: [18, 18, 18, 18], floors: [27, 22, 17, 23],
        places: ['shore', 'cliff trail', 'pine grove', 'lower village'],
        transitions: ['stairs', 'vines', 'ledge'], trick: 'collapse', baitArea: 1, baitOffset: 9 },
      { name: 'MOUNTAIN INK', entrance: 'STONE PASS', shape: 'valley-cave-ridge',
        widths: [18, 19, 17, 18], floors: [21, 27, 20, 17],
        places: ['valley', 'cave', 'mountain ridge', 'pagoda'],
        transitions: ['ledge', 'vines', 'stairs'], trick: 'fakeFloor', baitArea: 2, baitOffset: 9 },
    ],
    journey: [
      { name: 'SAKURA GALLERY', entrance: 'TEMPLE GATE', shape: 'grove-temple-court',
        widths: [18, 18, 17, 19], floors: [23, 18, 25, 19],
        places: ['sakura grove', 'temple hall', 'lower court', 'upper gallery'],
        transitions: ['stairs', 'ledge', 'stairs'], trick: 'spikes', baitArea: 2, baitOffset: 8 },
      { name: 'INSIDE THE CLIFF', entrance: 'CAVE MOUTH', shape: 'cliff-cave-bridge',
        widths: [19, 17, 18, 18], floors: [19, 27, 23, 17],
        places: ['cliff', 'cave', 'river bridge', 'highland'],
        transitions: ['ledge', 'vines', 'stairs'], trick: 'lureFloor', baitArea: 1, baitOffset: 9 },
    ],
    finale: [
      { name: 'THE LAST PAGODA', entrance: 'PAGODA GATE', shape: 'shore-hill-shrine',
        widths: [18, 18, 18, 18], floors: [26, 20, 24, 16],
        places: ['shore', 'pine hill', 'temple garden', 'pagoda'],
        transitions: ['stairs', 'ledge', 'stairs'], trick: 'fakeDoor', baitArea: 2, baitOffset: 8 },
      { name: 'FJORD SUMMIT', entrance: 'SUMMIT PASS', shape: 'fjord-bridge-summit',
        widths: [17, 19, 18, 18], floors: [21, 26, 19, 17],
        places: ['fjord', 'rope bridge', 'cliff trail', 'summit'],
        transitions: ['bridge', 'vines', 'stairs'], trick: 'crusher', baitArea: 2, baitOffset: 9 },
    ],
  });
})(window.KF);
