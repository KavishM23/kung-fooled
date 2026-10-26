'use strict';
// AR overlays a physical promenade, garden and harbour: real terraces remain
// readable while luminous markers and portals can lie about the next step.
(function (KF) {
  KF.FamilyKit.register({
    name: 'ar', realms: ['argo'], art: 'ar',
    palette: ['#183e3d', '#36796e', '#9dd4ba', '#ebaa7c', '#559a79', '#eaffd5'],
    approach: [
      { name: 'PROMENADE', entrance: 'AR GATE', shape: 'square-garden-terrace',
        widths: [18, 18, 18, 18], floors: [27, 22, 18, 24],
        places: ['plaza', 'garden', 'upper terrace', 'shore walk'],
        transitions: ['stairs', 'stairs', 'ledge'], trick: 'fakeDoor', baitArea: 2, baitOffset: 9 },
      { name: 'RIVERSIDE ROUTE', entrance: 'FLOATING MARKER', shape: 'grove-bridge-temple',
        widths: [19, 17, 18, 18], floors: [22, 26, 20, 17],
        places: ['grove', 'river bridge', 'terrace', 'temple gate'],
        transitions: ['bridge', 'stairs', 'stairs'], trick: 'lureFloor', baitArea: 1, baitOffset: 9 },
    ],
    journey: [
      { name: 'SCANNED GARDEN', entrance: 'GARDEN PORTAL', shape: 'garden-cave-gallery',
        widths: [18, 17, 19, 18], floors: [21, 27, 23, 17],
        places: ['garden', 'cave', 'stone hall', 'upper gallery'],
        transitions: ['ledge', 'stairs', 'stairs'], trick: 'spikes', baitArea: 2, baitOffset: 10 },
      { name: 'HARBOUR OVERLAY', entrance: 'QUAY GATE', shape: 'dock-warehouse-deck',
        widths: [18, 18, 18, 18], floors: [26, 20, 25, 18],
        places: ['dock', 'upper deck', 'warehouse', 'lookout'],
        transitions: ['ladder', 'stairs', 'lift'], trick: 'collapse', baitArea: 1, baitOffset: 9 },
    ],
    finale: [
      { name: 'THE REAL GATE', entrance: 'EXIT MARKER', shape: 'terrace-bridge-lookout',
        widths: [17, 19, 18, 18], floors: [24, 18, 22, 16],
        places: ['temple terrace', 'glass bridge', 'garden', 'lookout tower'],
        transitions: ['stairs', 'bridge', 'stairs'], trick: 'fakeFloor', baitArea: 2, baitOffset: 9 },
      { name: 'TWO WORLDS', entrance: 'LAST PORTAL', shape: 'plaza-ruins-roof',
        widths: [18, 18, 17, 19], floors: [27, 21, 26, 18],
        places: ['plaza', 'old ruins', 'garden', 'upper terrace'],
        transitions: ['stairs', 'ledge', 'stairs'], trick: 'crusher', baitArea: 3, baitOffset: 9 },
    ],
  });
})(window.KF);
