'use strict';
// SUPERHOT: a white low-poly 3D-looking arena, seen entirely from the platformer's side.
(function (KF) {
  const A = KF.SceneArt, U = KF.util, G = A.gradient, VW = KF.VIEW_W, VH = KF.VIEW_H;
  KF.Themes.add('superhot_atrium', {
    id: 'superhot_atrium', title: 'SUPERHOT ATRIUM', bg: '#e9edef',
    cube: { top: '#f8faf9', side: '#aeb9bc', under: '#8b989d', edge: '#c2cacd' },
    sign(c, x, y, text) {
      c.fillStyle = '#e7ebed'; c.fillRect(x - 34, y - 1, 68, 10);
      c.strokeStyle = '#aab4b9'; c.lineWidth = 0.4; c.strokeRect(x - 34, y - 1, 68, 10);
      KF.Font.draw(c, text, x, y + 1, '#aa0a13', 1, 'center');
    },
    spike: A.spike,
    door(c, x, y, o = {}) {
      c.fillStyle = '#d2dadd'; c.fillRect(x - 2, y - 2, 20, 34);
      c.fillStyle = o.open ? '#fff' : '#101419'; c.fillRect(x, y, 16, 32);
      c.strokeStyle = '#ed2626'; c.lineWidth = 0.8; c.strokeRect(x, y, 16, 32);
      if (!o.open) KF.Font.draw(c, 'LOCK', x + 8, y + 9, '#f34a44', 1, 'center');
    },
    build() {
      this.sky = A.hi(VW, VH); const c = this.sky.getContext('2d');
      c.fillStyle = G(c, 0, 0, 0, VH, ['#fafbfb', '#e4eaec', '#c5d0d4']); c.fillRect(0, 0, VW, VH);
      // An atrium receding into depth; every edge converges on a fixed vanishing point.
      for (let k = 0; k < 5; k++) {
        const inset = k * 17, alpha = 0.08 + k * 0.09;
        A.poly(c, [[inset, inset * 0.35], [VW - inset, inset * 0.35], [VW / 2 + 56, 93], [VW / 2 - 56, 93]], `rgba(90,110,120,${alpha})`);
        A.poly(c, [[inset, 174 - inset * 0.25], [VW / 2 - 56, 93], [VW / 2 + 56, 93], [VW - inset, 174 - inset * 0.25]], `rgba(95,115,120,${alpha * 0.5})`);
      }
      c.strokeStyle = 'rgba(57,73,80,0.12)'; c.lineWidth = 0.5;
      for (let x = -240; x < VW + 240; x += 32) { c.beginPath(); c.moveTo(x, 174); c.lineTo(VW / 2, 93); c.stroke(); }
      for (let y = 113; y < 174; y += 10) { c.beginPath(); c.moveTo(0, y); c.lineTo(VW, y); c.stroke(); }
    },
    background(c, cam, t) {
      KF.blit(c, this.sky, 0, 0);
      const offset = cam.x * 0.18;
      for (let x = -((offset % 155 + 155) % 155) - 60; x < VW + 155; x += 155) {
        // Faceted white pillars cast long slate shadows into the floor.
        A.poly(c, [[x + 3, 158], [x + 19, 158], [x + 31, 177], [x - 5, 177]], 'rgba(72,87,94,0.14)');
        A.poly(c, [[x, 26], [x + 15, 26], [x + 15, 167], [x, 167]], '#f7f8f7');
        A.poly(c, [[x + 15, 26], [x + 20, 18], [x + 20, 156], [x + 15, 167]], '#a9b6bc');
        A.poly(c, [[x, 26], [x + 6, 18], [x + 20, 18], [x + 15, 26]], '#fff');
        c.fillStyle = '#9babb1'; c.fillRect(x, 24, 15, 0.5);
      }
      // Suspended black monoliths define the depth without obscuring the walkable plane.
      for (let i = 0; i < 3; i++) {
        const x = ((i * 173 + 68 - cam.x * 0.09) % 520 + 520) % 520 - 40;
        A.poly(c, [[x, 30], [x + 16, 30], [x + 16, 77], [x, 77]], '#171d22');
        A.poly(c, [[x + 16, 30], [x + 24, 22], [x + 24, 69], [x + 16, 77]], '#3a454c');
        A.poly(c, [[x, 30], [x + 8, 22], [x + 24, 22], [x + 16, 30]], '#69777d');
      }
      c.strokeStyle = 'rgba(110,130,136,0.12)'; c.lineWidth = 0.5;
      for (let i = 0; i < 7; i++) {
        const x = ((i * 61 - cam.x * 0.13) % (VW + 60) + VW + 60) % (VW + 60) - 30;
        c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 34, 153); c.stroke();
      }
      void t;
    },
    tile(c, x, y, art, e, seed) {
      if (art === 'oneway') {
        c.fillStyle = '#bbc6ca'; c.fillRect(x, y, 16, 2);
        c.fillStyle = '#f5f8f8'; c.fillRect(x, y, 16, 0.7); return;
      }
      c.fillStyle = G(c, x, y, x, y + 16, ['#f8faf9', '#d2dcde', '#a7b6bc']); c.fillRect(x, y, 16, 16);
      if (e.t) {
        c.fillStyle = '#fff'; c.fillRect(x, y, 16, 1);
        c.fillStyle = '#9daeb4'; c.fillRect(x, y + 2, 16, 0.35);
      }
      c.strokeStyle = '#aab9be'; c.lineWidth = 0.35;
      c.beginPath(); c.moveTo(x, y + 15.5); c.lineTo(x + 16, y + 15.5);
      c.moveTo(x + 15.5, y); c.lineTo(x + 15.5, y + 16); c.stroke();
      if (art === 'alt') {
        A.poly(c, [[x + 1, y + 14], [x + 4, y + 2], [x + 13, y + 2], [x + 15, y + 14]], '#172026');
        A.poly(c, [[x + 4, y + 2], [x + 8, y], [x + 16, y + 1], [x + 13, y + 2]], '#51616a');
      }
      if (art === 'ice') { c.fillStyle = 'rgba(180,240,250,0.45)'; c.fillRect(x, y, 16, 3); }
      if (seed > 0.7) { c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(x + 1, y + 4, 8, 0.5); }
    },
  });
  A.style('superhot', 'lowpoly', {
    theme: 'superhot_atrium', extrude: true,
    overlay(c, i) {
      const scene = KF.engine && KF.engine.scene;
      if (!scene || !scene.stage || !scene.stage.combat) return;
      c.save(); c.strokeStyle = scene.stage.timeK < 1 ? 'rgba(183,0,15,0.35)' : 'rgba(30,30,38,0.16)';
      c.lineWidth = 0.3; c.beginPath(); c.arc(VW / 2, VH / 2, 3.5, 0, 7); c.stroke();
      c.beginPath(); c.moveTo(VW / 2 - 6, VH / 2); c.lineTo(VW / 2 - 2.5, VH / 2); c.moveTo(VW / 2 + 2.5, VH / 2); c.lineTo(VW / 2 + 6, VH / 2); c.stroke();
      if (scene.stage.combat.invul > 0 && Math.floor(i.t * 12) % 2) {
        c.fillStyle = 'rgba(235,20,20,0.12)'; c.fillRect(0, 0, VW, VH);
      }
      c.restore();
    },
  });
})(window.KF);
