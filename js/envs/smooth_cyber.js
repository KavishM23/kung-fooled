'use strict';
// High-resolution side-on architecture for neon, hologram, and chrome places.
(function (KF) {
  const A = KF.SceneArt, U = KF.util, VW = KF.VIEW_W, VH = KF.VIEW_H, G = A.gradient;
  const schemes = {
    neon: { sky: ['#050913', '#10283a', '#381540'], wall: ['#07111d', '#263350', '#091526'], light: '#4deff2', trim: '#f259c7' },
    holo: { sky: ['#061724', '#266281', '#163251'], wall: ['#103447', '#54a5b1', '#113b59'], light: '#82faff', trim: '#ad94ff' },
    chrome: { sky: ['#252b43', '#b5c8d7', '#6a7c9e'], wall: ['#ecf9ff', '#748b9f', '#1d3246'], light: '#f1ffff', trim: '#b49cff' },
  };
  function buildings(p, mode, seed, far) {
    const canvas = A.hi(640, VH), c = canvas.getContext('2d'), rnd = U.rng(seed);
    for (let x = 0; x < 640;) {
      const w = 18 + rnd() * 26, top = 30 + rnd() * 82 + (far ? -17 : 18);
      c.fillStyle = G(c, x, 0, x + w, 0, p.wall); c.fillRect(x, top, w, VH - top);
      A.poly(c, [[x + w, top], [x + w + 5, top - 8], [x + w + 5, VH], [x + w, VH]], '#101b2d');
      A.poly(c, [[x, top], [x + 5, top - 8], [x + w + 5, top - 8], [x + w, top]], mode === 'chrome' ? '#d7e3eb' : '#213653');
      c.globalAlpha = far ? 0.2 : 0.55; c.fillStyle = p.light; c.fillRect(x + w - 0.7, top, 0.7, VH - top);
      for (let yy = top + 5; yy < VH; yy += 5) for (let xx = x + 3; xx < x + w - 2; xx += 4) if (rnd() < 0.48) {
        c.fillStyle = rnd() < 0.2 ? p.trim : p.light; c.fillRect(xx, yy, 1.3, 2);
      }
      c.globalAlpha = 1;
      if (!far && mode !== 'chrome') {
        c.strokeStyle = p.trim; c.lineWidth = 0.7; c.strokeRect(x + 3, top + 11, w - 6, 16);
        c.save(); c.font = 'bold 4px monospace'; c.textAlign = 'center'; c.fillStyle = p.light;
        c.fillText(['NEURAL', 'SYNTH', '2099'][Math.floor(rnd() * 3)], x + w / 2, top + 21); c.restore();
      }
      if (mode === 'holo') {
        c.strokeStyle = 'rgba(140,255,255,0.25)'; c.lineWidth = 0.25;
        for (let yy = top + 2; yy < VH; yy += 3) { c.beginPath(); c.moveTo(x, yy); c.lineTo(x + w, yy); c.stroke(); }
      }
      x += w + 11;
    }
    return canvas;
  }
  function floor(c, x, y, art, e, seed, mode, p) {
    if (art === 'oneway') {
      c.fillStyle = p.light; c.fillRect(x, y, 16, 1);
      c.fillStyle = 'rgba(80,220,245,0.3)'; c.fillRect(x, y + 1, 16, 3); return;
    }
    c.fillStyle = mode === 'chrome'
      ? G(c, x, y, x, y + 16, ['#f4ffff', '#92a9bd', '#354657', '#bdcbd9'])
      : G(c, x, y, x + 16, y + 16, ['#3b5163', '#132231', '#09131e']);
    c.fillRect(x, y, 16, 16);
    c.strokeStyle = mode === 'chrome' ? '#52647b' : '#07101b'; c.lineWidth = 0.45; c.strokeRect(x + 0.5, y + 0.5, 15, 15);
    if (e.t) { c.fillStyle = p.light; c.fillRect(x, y, 16, 0.85); c.fillStyle = p.trim; c.fillRect(x, y + 2.5, 16, 0.4); }
    if (art === 'alt') {
      c.fillStyle = '#182536'; c.fillRect(x + 2, y + 2, 12, 11);
      c.strokeStyle = p.light; c.lineWidth = 0.55; c.strokeRect(x + 2, y + 2, 12, 11);
      for (let i = 0; i < 3; i++) { c.fillStyle = p.light; c.fillRect(x + 4, y + 4 + i * 2, 4 + seed * 5, 0.5); }
    } else {
      c.strokeStyle = mode === 'chrome' ? '#9ac4d1' : '#42617b'; c.lineWidth = 0.4;
      c.beginPath(); c.moveTo(x + 2, y + 8); c.lineTo(x + 8, y + 8); c.lineTo(x + 11, y + 11); c.lineTo(x + 16, y + 11); c.stroke();
    }
    if (art === 'ice') { c.fillStyle = 'rgba(170,255,255,0.5)'; c.fillRect(x, y, 16, 2); }
  }
  for (const [id, title, mode, style] of [
    ['cyber_megacity', 'NEON MEGACITY', 'neon', 'cyberpunk'],
    ['cyber_hologram', 'HOLO DISTRICT', 'holo', 'hologram'],
    ['cyber_chrome', 'LIQUID CHROME', 'chrome', 'chrome'],
  ]) {
    const p = schemes[mode];
    KF.Themes.add(id, {
      id, title, bg: p.sky[0], sign: A.sign, spike: A.spike, door: A.door,
      cube: { top: mode === 'chrome' ? '#d2e7ec' : '#416779', side: '#17283b', under: '#081522', edge: '#314459' },
      build() {
        this.sky = A.hi(VW, VH); const c = this.sky.getContext('2d');
        c.fillStyle = G(c, 0, 0, 0, VH, p.sky); c.fillRect(0, 0, VW, VH);
        A.glow(c, 285, 60, 86, mode === 'chrome' ? 'rgba(255,255,240,0.35)' : 'rgba(130,90,210,0.22)');
        this.far = buildings(p, mode, 2099, true); this.mid = buildings(p, mode, 2100, false);
      },
      background(c, cam, t) {
        KF.blit(c, this.sky, 0, 0); A.tiled(c, this.far, cam.x, 0.12);
        c.fillStyle = G(c, 0, 92, 0, VH, ['rgba(130,180,210,0)', 'rgba(130,180,210,0.15)']); c.fillRect(0, 92, VW, VH - 92);
        A.tiled(c, this.mid, cam.x, 0.43);
        if (mode === 'chrome') {
          const x = 290 - ((cam.x * 0.16) % 460), y = 70;
          A.glow(c, x, y, 35, 'rgba(245,255,255,0.25)');
          c.fillStyle = G(c, 0, y - 22, 0, y + 22, ['#fff', '#91aabd', '#22374a', '#e9ffff', '#53667f']);
          c.beginPath(); c.arc(x, y, 22, 0, 7); c.fill();
          c.fillStyle = '#fff'; c.beginPath(); c.ellipse(x - 8, y - 11, 4, 1.2, -0.5, 0, 7); c.fill();
        } else {
          const off = (t * 18 - cam.x * 0.2) % 510;
          for (let k = 0; k < 2; k++) {
            const x = ((off + k * 250 + 510) % 510) - 50, y = 72 + k * 31;
            c.fillStyle = '#243d51'; c.beginPath(); c.roundRect(x, y, 18, 4, 2); c.fill();
            c.fillStyle = p.light; c.fillRect(x + 1, y + 3, 14, 0.6);
          }
          c.strokeStyle = mode === 'holo' ? 'rgba(140,255,255,0.18)' : 'rgba(140,180,220,0.25)'; c.lineWidth = 0.35;
          for (let i = 0; i < 55; i++) {
            const x = ((i * 43 - t * 31 - cam.x * 0.15) % VW + VW) % VW, y = (i * 29 + t * 95) % VH;
            c.beginPath(); c.moveTo(x, y); c.lineTo(x - 1.5, y + 7); c.stroke();
          }
        }
      },
      tile(c, x, y, art, e, seed) { floor(c, x, y, art, e, seed, mode, p); },
    });
    A.style(style, mode === 'chrome' ? 'gloss' : 'neon', { theme: id, extrude: true });
  }
})(window.KF);
