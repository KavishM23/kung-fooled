'use strict';
// Painterly 1990s places. Camcorder damage is a surface effect, never baked into the art.
(function (KF) {
  const A = KF.SceneArt, U = KF.util, G = A.gradient, VW = KF.VIEW_W, VH = KF.VIEW_H;
  const places = [
    ['vhs_backyard', 'BACKYARD 1996', 'yard'], ['vhs_rooftop', 'APARTMENT ROOFS', 'roof'],
    ['vhs_mall', 'THE MALL', 'mall'], ['vhs_train', 'LAST TRAIN HOME', 'train'],
  ];
  function skyline(seed, mode, far) {
    const canvas = A.hi(640, VH), c = canvas.getContext('2d'), rnd = U.rng(seed);
    for (let x = 0; x < 640;) {
      const w = mode === 'mall' ? 62 : mode === 'train' ? 43 : 30 + rnd() * 35;
      const top = (far ? 75 : 112) + rnd() * 25;
      c.fillStyle = G(c, x, top, x, VH, far ? ['#677889', '#626c71'] : ['#827b7e', '#424854']);
      c.fillRect(x, top, w, VH - top);
      A.poly(c, [[x - 2, top], [x + w / 2, top - 12], [x + w + 2, top]], far ? '#4e6579' : '#544c57');
      c.fillStyle = far ? '#687e92' : '#333941'; c.fillRect(x + 3, top + 18, w - 6, 14);
      c.fillStyle = rnd() < 0.5 ? '#dfbf9b' : '#a9c4c4'; c.fillRect(x + 5, top + 20, w - 10, 9);
      c.strokeStyle = '#4a444c'; c.lineWidth = 0.5; c.strokeRect(x + 5, top + 20, w - 10, 9);
      c.beginPath(); c.moveTo(x + w / 2, top + 20); c.lineTo(x + w / 2, top + 29); c.stroke();
      if (mode === 'mall') {
        c.fillStyle = '#413951'; c.fillRect(x + 2, top + 2, w - 4, 10);
        c.fillStyle = '#f1daba'; c.font = 'bold 5px sans-serif'; c.fillText(['VIDEO', 'ARCADE', 'FOOD'][Math.floor(rnd() * 3)], x + 8, top + 9);
      }
      x += w + (far ? 9 : 24);
    }
    return canvas;
  }
  function tile(c, x, y, art, e, seed, mode) {
    if (art === 'oneway') { c.fillStyle = '#f3d7b1'; c.fillRect(x, y, 16, 1); c.fillStyle = '#5d7180'; c.fillRect(x, y + 1, 16, 3); return; }
    const cols = mode === 'mall' ? ['#c6afb0', '#8f858e', '#575869'] : mode === 'train' ? ['#bdcad1', '#7b8b96', '#344553'] : ['#ad9591', '#675e6c', '#363b4a'];
    c.fillStyle = G(c, x, y, x, y + 16, cols); c.fillRect(x, y, 16, 16);
    if (e.t) { c.fillStyle = '#e8cfb4'; c.fillRect(x, y, 16, 1.5); c.fillStyle = 'rgba(40,43,59,0.5)'; c.fillRect(x, y + 3, 16, 1); }
    c.strokeStyle = 'rgba(23,27,39,0.55)'; c.lineWidth = 0.35; c.strokeRect(x + 0.4, y + 0.4, 15.2, 15.2);
    if (art === 'alt') {
      c.fillStyle = '#56616b'; c.fillRect(x + 1, y + 3, 14, 13);
      c.fillStyle = '#8a93a0'; c.fillRect(x + 3, y + 5, 10, 8);
      c.fillStyle = '#171d2c'; c.beginPath(); c.arc(x + 8, y + 9, 3, 0, 7); c.fill();
    } else if (art === 'solid') {
      c.strokeStyle = 'rgba(30,37,45,0.35)'; c.beginPath(); c.moveTo(x + 5, y + 2); c.lineTo(x + 5, y + 16); c.moveTo(x + 11, y + 2); c.lineTo(x + 11, y + 16); c.stroke();
      c.fillStyle = `rgba(255,236,210,${0.12 + seed * 0.15})`; c.fillRect(x + 1, y + 2, 5, 0.5);
    }
    if (art === 'ice') { c.fillStyle = 'rgba(200,245,255,0.4)'; c.fillRect(x, y, 16, 3); }
  }
  for (const [id, title, mode] of places) KF.Themes.add(id, {
    id, title, bg: '#5e7186', sign: A.sign, spike: A.spike, door: A.door,
    cube: { top: '#d9b9a4', side: '#5c5361', under: '#2d3444', edge: '#413c48' },
    build() {
      this.sky = A.hi(VW, VH); const c = this.sky.getContext('2d');
      c.fillStyle = G(c, 0, 0, 0, VH, mode === 'mall' ? ['#4c5370', '#a892a5', '#ddc7a8'] : ['#526a83', '#bd9f9b', '#e5b791']); c.fillRect(0, 0, VW, VH);
      A.glow(c, 303, 54, 76, 'rgba(255,217,171,0.28)');
      c.fillStyle = '#e9c9a6'; c.beginPath(); c.arc(303, 54, 12, 0, 7); c.fill();
      this.far = skyline(1996, mode, true); this.mid = skyline(1997, mode, false);
    },
    background(c, cam, t) {
      KF.blit(c, this.sky, 0, 0); A.tiled(c, this.far, cam.x, 0.1);
      c.fillStyle = G(c, 0, 103, 0, VH, ['rgba(238,200,179,0)', 'rgba(235,191,179,0.2)']); c.fillRect(0, 103, VW, VH - 103);
      A.tiled(c, this.mid, mode === 'train' ? cam.x + t * 45 : cam.x, 0.38);
      if (mode === 'yard') {
        c.strokeStyle = '#564851'; c.lineWidth = 0.7;
        for (let x = -((cam.x * 0.7) % 23); x < VW; x += 23) { c.beginPath(); c.moveTo(x, 166); c.lineTo(x, 187); c.stroke(); }
      } else if (mode === 'roof') {
        for (let x = -((cam.x * 0.5) % 80); x < VW; x += 80) {
          c.fillStyle = '#677281'; c.fillRect(x, 145, 19, 22); c.fillStyle = '#c6ae9e'; c.fillRect(x + 3, 148, 13, 2);
        }
      } else if (mode === 'mall') {
        c.strokeStyle = 'rgba(250,228,215,0.35)'; c.lineWidth = 1;
        for (let x = 0; x < VW; x += 80) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 35, 120); c.stroke(); }
      } else {
        for (let x = -((cam.x * 0.8 + t * 90) % 120); x < VW; x += 120) {
          c.strokeStyle = '#4d525e'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, 30); c.lineTo(x, 174); c.stroke();
        }
      }
    },
    tile(c, x, y, art, e, seed) { tile(c, x, y, art, e, seed, mode); },
  });
  A.style('vhs', 'video', { theme: 'vhs_backyard', extrude: true,
    overlay(c, i) {
      c.save(); c.fillStyle = 'rgba(37,40,54,0.09)'; for (let y = 0; y < VH; y += 2) c.fillRect(0, y, VW, 0.35);
      const y = (i.frame * 1.7) % VH;
      c.fillStyle = 'rgba(255,255,255,0.13)'; c.fillRect(0, y, VW, 1);
      c.fillStyle = 'rgba(20,10,30,0.07)'; c.fillRect(0, y + 1, VW, 2);
      const v = c.createRadialGradient(VW / 2, VH / 2, 65, VW / 2, VH / 2, 210);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(15,9,31,0.4)'); c.fillStyle = v; c.fillRect(0, 0, VW, VH);
      KF.Font.draw(c, 'PLAY', 7, 18, '#e8e9eb'); KF.Font.draw(c, 'SP', VW - 7, 18, '#e8e9eb', 1, 'right'); c.restore();
    },
  });
})(window.KF);
