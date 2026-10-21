'use strict';
(function (KF) {
  KF.Save.load();
  KF.Audio.muted = !!KF.Save.data.muted;
  KF.Sprites.setLook(KF.Economy.look());
  const engine = new KF.Engine(document.getElementById('game'));
  KF.engine = engine;
  // ?stage=harbour-2 jumps straight into a stage (handy while authoring levels); ?stage=training too.
  const m = /[?&]stage=([a-z]+)(?:-(\d))?/.exec(window.location.search);
  let m2;
  if (m && m[1] === 'training') engine.setScene(new KF.PlayScene(engine, { training: true }));
  else if (m && KF.Doors.some((d) => d.id === m[1])) {
    engine.setScene(new KF.PlayScene(engine, { door: KF.Doors.findIndex((d) => d.id === m[1]), stage: Math.max(0, (+m[2] || 1) - 1) }));
  } else if ((m2 = /[?&]fight=([a-z]+)-(\d)/.exec(window.location.search))) { // ?fight=viking-5 (5 = boss)
    const r = Math.max(0, KF.Doors.findIndex((d) => d.id === m2[1])), k = +m2[2];
    engine.setScene(new KF.FightScene(engine, k >= 5 ? { mode: 'boss', realm: r, node: 9, def: KF.Roster.bossDef(r) } : { mode: 'street', realm: r, node: k * 2 - 1, def: KF.Roster.streetDef(r, k - 1) }));
  } else if (/[?&]scene=shop/.test(window.location.search)) engine.setScene(new KF.ShopScene(engine));
  else if (/[?&]scene=map/.test(window.location.search)) engine.setScene(new KF.MapScene(engine));
  else engine.setScene(new KF.TitleScene(engine));
  engine.start();
})(window.KF);
