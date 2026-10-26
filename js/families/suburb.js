'use strict';
// The VHS world passes through lived-in yards, apartment roofs, service
// corridors and the commuter line; its analogue picture holds them together.
(function (KF) {
  KF.FamilyKit.register({
    name: 'suburb', realms: ['vhs'], art: 'suburb',
    palette: ['#282d46', '#68758b', '#b5a2a0', '#ce9278', '#5f8472', '#f6ce91'],
    approach: [
      { name: 'SIDE YARD', entrance: 'BASEMENT DOOR', shape: 'yard-garage-roof',
        widths: [18, 18, 18, 18], floors: [27, 23, 18, 24],
        places: ['backyard', 'garage', 'apartment roof', 'side yard'],
        transitions: ['stairs', 'ladder', 'fire escape'], trick: 'lureFloor', baitArea: 1, baitOffset: 10 },
      { name: 'BLOCK PARTY', entrance: 'SHOP ENTRANCE', shape: 'street-mall-balcony',
        widths: [19, 17, 17, 19], floors: [22, 27, 20, 24],
        places: ['old street', 'mall', 'upper arcade', 'balcony'],
        transitions: ['stairs', 'escalator', 'ledge'], trick: 'fakeFloor', baitArea: 2, baitOffset: 9 },
    ],
    journey: [
      { name: 'SERVICE HALL', entrance: 'MAINTENANCE HATCH', shape: 'mall-store-room',
        widths: [18, 18, 18, 18], floors: [21, 27, 23, 17],
        places: ['mall', 'service tunnel', 'storage hall', 'skylight roof'],
        transitions: ['stairs', 'escalator', 'ladder'], trick: 'crusher', baitArea: 1, baitOffset: 9 },
      { name: 'APARTMENT BLOCK', entrance: 'FIRE ESCAPE', shape: 'roof-room-train',
        widths: [18, 17, 19, 18], floors: [26, 19, 25, 18],
        places: ['apartment roof', 'apartment bedroom', 'lower street', 'train platform'],
        transitions: ['fire escape', 'stairs', 'ladder'], trick: 'collapse', baitArea: 2, baitOffset: 10 },
    ],
    finale: [
      { name: 'LAST TRAIN', entrance: 'CARRIAGE DOOR', shape: 'platform-coach-signal',
        widths: [18, 18, 18, 18], floors: [25, 19, 23, 17],
        places: ['train platform', 'train carriage', 'signal bridge', 'exit roof'],
        transitions: ['stairs', 'bridge', 'ladder'], trick: 'fakeDoor', baitArea: 3, baitOffset: 9 },
      { name: 'ROOFTOP ANTENNA', entrance: 'ROOF HATCH', shape: 'yard-roof-antenna',
        widths: [19, 17, 18, 18], floors: [27, 21, 26, 18],
        places: ['backyard', 'apartment roof', 'service room', 'antenna tower'],
        transitions: ['fire escape', 'stairs', 'ladder'], trick: 'spikes', baitArea: 3, baitOffset: 9 },
    ],
  });
})(window.KF);
