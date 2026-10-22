'use strict';
// A fixed side-view through a continuous white gallery.
(function (KF) {
  const A = KF.SceneArt, VW = KF.VIEW_W, VH = KF.VIEW_H;
  const poly = A.poly;
  function figure(c, x, feet, facing, t, red = false, boss = false, hit = false) {
    const s = boss ? 1.5 : 1, gait = Math.sin(t * 8) * (red ? 0.6 : 1.3);
    const hi = hit ? '#ffffff' : red ? '#ff6456' : '#ffffff';
    const mid = hit ? '#ffffff' : red ? '#e31e22' : '#e9ecee';
    const low = hit ? '#ffffff' : red ? '#98020e' : '#aab5ba';
    c.save(); c.translate(x, feet); c.scale(facing * s, s);
    c.fillStyle = 'rgba(57,65,68,0.18)'; c.beginPath(); c.ellipse(0, 0, 9, 1.8, 0, 0, 7); c.fill();
    poly(c, [[-4,-10],[-1,-10],[gait-2,0],[-6,0]], low);
    poly(c, [[1,-10],[4,-10],[5-gait,0],[1-gait,0]], mid);
    poly(c, [[-5,-22],[2,-23],[6,-12],[2,-9],[-4,-10]], mid);
    poly(c, [[-5,-22],[-1,-22],[-1,-11],[-4,-10]], hi);
    poly(c, [[2,-23],[6,-12],[2,-9],[1,-17]], low);
    poly(c, [[-4,-21],[-7,-18],[-5,-12],[-2,-11],[-1,-13],[-4,-15]], low);
    poly(c, [[3,-21],[6,-20],[8,-16],[7,-13],[3,-14],[2,-17]], hi);
    poly(c, [[-3,-30],[2,-31],[6,-27],[5,-23],[1,-21],[-4,-23],[-6,-27]], mid);
    poly(c, [[-3,-30],[2,-31],[1,-24],[-4,-23],[-6,-27]], hi);
    poly(c, [[2,-31],[6,-27],[5,-23],[1,-24]], low);
    if (red) {
      c.strokeStyle = 'rgba(255,255,255,0.48)'; c.lineWidth = 0.35;
      c.beginPath(); c.moveTo(-3,-29); c.lineTo(1,-24); c.lineTo(5,-27); c.moveTo(-3,-19); c.lineTo(2,-14); c.stroke();
    }
    c.restore();
  }
  KF.SuperhotFigure = { draw: figure };
  KF.Themes.add('superhot_atrium', {
    id: 'superhot_atrium', title: 'WHITE GALLERY', bg: '#eff2f2',
    cube: { top: '#ffffff', side: '#cad1d3', under: '#9ea9ad', edge: '#b9c3c6' },
    sign(c, x, y, text) {
      c.fillStyle = '#f8f9f8'; c.fillRect(x - 41, y - 1, 82, 10);
      c.strokeStyle = '#c2cace'; c.lineWidth = 0.5; c.strokeRect(x - 41, y - 1, 82, 10);
      KF.Font.draw(c, text, x, y + 1, '#34383b', 1, 'center');
    },
    spike: A.spike,
    door(c, x, y, o = {}) {
      c.fillStyle = '#c9d0d2'; c.fillRect(x - 3, y - 3, 22, 35);
      c.fillStyle = '#1c2225'; c.fillRect(x, y, 16, 32);
      c.fillStyle = o.open ? '#f9faf9' : '#41494e'; c.fillRect(x + 2, y + 2, 12, 28);
      c.strokeStyle = '#fff'; c.lineWidth = 0.6; c.strokeRect(x + 2.5, y + 2.5, 11, 27);
    },
    drawPlayer(c, p, x, feet, state, opts) {
      figure(c, x, feet, p.facing, state === 'run' ? p.stateT : 0, false, false, opts.flash > 0.4);
    },
    build() {
      this.sky = A.hi(VW, VH); const c = this.sky.getContext('2d');
      c.fillStyle = A.gradient(c, 0, 0, 0, 176, ['#ffffff', '#edf1f1', '#d9e0e2']); c.fillRect(0, 0, VW, VH);
      poly(c, [[0,0],[VW,0],[VW,17],[0,17]], '#fafafa');
      poly(c, [[0,17],[VW,17],[VW,25],[0,25]], '#d1dadd');
      c.fillStyle = '#f8f9f9'; c.fillRect(0, 25, VW, 112);
      c.fillStyle = '#cbd4d6'; c.fillRect(0, 137, VW, 2);
      poly(c, [[0,139],[VW,139],[VW,176],[0,176]], '#e4e9ea');
      c.strokeStyle = '#c3cdd0'; c.lineWidth = 0.5;
      for (let x = -280; x <= VW + 280; x += 42) { c.beginPath(); c.moveTo(VW / 2, 139); c.lineTo(x, 176); c.stroke(); }
      for (const y of [148, 160, 173]) { c.beginPath(); c.moveTo(0, y); c.lineTo(VW, y); c.stroke(); }
    },
    background(c, cam) {
      KF.blit(c, this.sky, 0, 0);
      const off = ((cam.x * 0.28) % 96 + 96) % 96;
      for (let x = -off - 96; x < VW + 96; x += 96) {
        c.fillStyle = '#e1e7e8'; c.fillRect(x + 17, 27, 62, 106);
        c.fillStyle = '#f7f9f9'; c.fillRect(x + 22, 30, 52, 101);
        c.strokeStyle = '#c7d1d4'; c.lineWidth = 0.8; c.strokeRect(x + 22, 30, 52, 101);
        c.fillStyle = '#dbe2e4'; c.fillRect(x + 47, 30, 1, 101);
        poly(c, [[x,20],[x+13,20],[x+13,139],[x,139]], '#fefefe');
        poly(c, [[x+13,20],[x+17,16],[x+17,135],[x+13,139]], '#bcc8cc');
        poly(c, [[x,139],[x+13,139],[x+32,176],[x-11,176]], 'rgba(80,95,100,0.10)');
      }
    },
    tile(c, x, y, art, e) {
      if (art === 'oneway') { c.fillStyle = '#d4dadd'; c.fillRect(x, y, 16, 2); c.fillStyle = '#fff'; c.fillRect(x, y, 16, 0.7); return; }
      c.fillStyle = y < 180 ? '#f9fafa' : '#d8e0e2'; c.fillRect(x, y, 16, 16);
      if (e.t) { c.fillStyle = '#fff'; c.fillRect(x, y, 16, 1.2); }
      c.strokeStyle = '#b8c3c7'; c.lineWidth = 0.3;
      c.beginPath(); c.moveTo(x + 15.8, y); c.lineTo(x + 15.8, y + 16); c.stroke();
      if (art === 'alt') { c.fillStyle = '#89979e'; c.fillRect(x + 1, y + 12, 14, 2); }
    },
  });
  A.style('superhot', 'lowpoly', {
    theme: 'superhot_atrium', extrude: true,
    overlay(c, i) {
      const scene = KF.engine && KF.engine.scene;
      if (scene && scene.stage && scene.stage.combat && scene.stage.combat.invul > 0 && Math.floor(i.t * 12) % 2) {
        c.fillStyle = 'rgba(222,10,20,0.09)'; c.fillRect(0, 0, VW, VH);
      }
    },
  });
})(window.KF);
