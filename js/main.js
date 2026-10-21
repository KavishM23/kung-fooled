'use strict';
(function (KF) {
  KF.Save.load();
  KF.Audio.muted = !!KF.Save.data.muted;
  const engine = new KF.Engine(document.getElementById('game'));
  KF.engine = engine;
  // ?stage=harbour-2 jumps straight into a stage (handy while authoring levels); ?stage=training too.
  const m = /[?&]stage=([a-z]+)(?:-(\d))?/.exec(window.location.search);
  if (m && m[1] === 'training') engine.setScene(new KF.PlayScene(engine, { training: true }));
  else if (m && KF.Doors.some((d) => d.id === m[1])) {
    engine.setScene(new KF.PlayScene(engine, { door: KF.Doors.findIndex((d) => d.id === m[1]), stage: Math.max(0, (+m[2] || 1) - 1) }));
  } else engine.setScene(new KF.TitleScene(engine));
  engine.start();
})(window.KF);
