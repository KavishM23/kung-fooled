'use strict';
// The three doors (worlds). Stage files call KF.addStage(doorId, def) to fill them.
(function (KF) {
  KF.Doors = [
    { id: 'rooftop', name: 'ROOFTOP', sub: 'AT DUSK', theme: 'rooftop', music: 'rooftop', stages: [] },
    { id: 'harbour', name: 'HARBOUR', sub: 'DOCK 9', theme: 'harbour', music: 'harbour', stages: [] },
    { id: 'neon', name: 'NEON', sub: 'NIGHT MARKET', theme: 'neon', music: 'neon', stages: [] },
    { id: 'temple', name: 'TEMPLE', sub: 'COURTYARD', theme: 'temple', music: 'shrine', stages: [] },
    { id: 'train', name: 'TRAIN', sub: 'SKY EXPRESS', theme: 'train', music: 'train', stages: [] },
  ];
  KF.Levels = KF.Levels || {};

  KF.addStage = (doorId, def) => {
    const door = KF.Doors.find((d) => d.id === doorId);
    if (!door) throw new Error('Unknown door: ' + doorId);
    door.stages.push(KF.util.deepFreeze(Object.assign({ theme: door.theme }, def)));
  };
})(window.KF);
