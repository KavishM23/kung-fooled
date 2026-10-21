'use strict';
// Silent-city cinematography: wet masonry, gas lamps and depth from three parallax planes.
// All detail is baked at high resolution; the camera and collision plane stay strictly side-on.
(function (KF) {
  const A = KF.SceneArt, U = KF.util, VW = KF.VIEW_W, VH = KF.VIEW_H;
  const G = A.gradient;
  const chaplin = KF.Sprites.buildSet({
    style: 'suit', top: 'charcoal', pants: 'black', shoes: 'black', wraps: 'ivory',
    skin: 'pale', head: 'bowler', hat: 'charcoal', hair: 'short', hairColor: 'black',
    moustache: true, build: 'slim', tie: true, prop: 'cane',
  }, 1, ['idle', 'run', 'rise', 'fall', 'land', 'skid', 'victory', 'hurt']);
  const pixels = new WeakMap();
  function chaplinFrame(src) {
    let out = pixels.get(src);
    if (out) return out;
    out = KF.makeCanvas(20, 20);
    const c = out.getContext('2d'); c.imageSmoothingEnabled = true;
    c.drawImage(src, 0, 0, 20, 20);
    const im = c.getImageData(0, 0, 20, 20), d = im.data;
    for (let i = 0; i < d.length; i += 4) {
      const grey = Math.round(d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11);
      d[i] = grey; d[i + 1] = grey; d[i + 2] = Math.round(grey * 0.97);
    }
    c.putImageData(im, 0, 0); pixels.set(src, out); return out;
  }
  function windowPane(c, x, y, w, h, lit, rnd) {
    c.fillStyle = '#080b0e'; c.fillRect(x - 0.8, y - 0.8, w + 1.6, h + 1.6);
    c.fillStyle = lit ? G(c, x, y, x + w, y + h, ['#706454', '#ded0a3', '#675b46']) : '#151a1d'; c.fillRect(x, y, w, h);
    if (lit) {
      c.fillStyle = 'rgba(25,22,21,0.7)'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + w * 0.4, y); c.quadraticCurveTo(x + w * 0.15, y + h * 0.5, x + w * 0.28, y + h); c.lineTo(x, y + h); c.fill();
      c.fillRect(x + w * 0.78, y, w * 0.22, h);
      if (rnd() < 0.5) { c.fillStyle = '#262423'; c.fillRect(x + w * 0.55, y + h * 0.65, 1, h * 0.35); }
    }
    c.strokeStyle = '#3c3e3d'; c.lineWidth = 0.65; c.strokeRect(x, y, w, h);
    c.beginPath(); c.moveTo(x + w / 2, y); c.lineTo(x + w / 2, y + h); c.moveTo(x, y + h * 0.42); c.lineTo(x + w, y + h * 0.42); c.stroke();
    c.fillStyle = '#62625b'; c.fillRect(x - 1.5, y + h, w + 3, 0.7);
  }
  function rail(c, x, y, w) {
    c.strokeStyle = '#080b0d'; c.lineWidth = 0.9; c.strokeRect(x, y, w, 8);
    for (let k = 0; k < w; k += 10) {
      c.beginPath(); c.moveTo(x + k, y); c.lineTo(x + k + 10, y + 8); c.moveTo(x + k + 10, y); c.lineTo(x + k, y + 8); c.stroke();
    }
    c.strokeStyle = '#4e5353'; c.lineWidth = 0.3; c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y); c.stroke();
  }
  function chimney(c, x, y, h, rnd) {
    A.brick(c, x, y - h, 8, h, rnd() * 1e6);
    c.fillStyle = '#393c3d'; c.fillRect(x - 1.5, y - h - 1, 11, 1.5);
    for (let i = 0; i < 2; i++) { c.fillStyle = '#15191b'; c.fillRect(x + i * 4, y - h - 9, 3, 8); c.fillRect(x - 0.5 + i * 4, y - h - 10, 4, 1); }
  }
  function tower(c, x, y) {
    c.strokeStyle = '#171c20'; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(x - 7, y); c.lineTo(x - 5, y - 32); c.lineTo(x + 7, y - 32); c.lineTo(x + 9, y); c.moveTo(x - 7, y); c.lineTo(x + 7, y - 32); c.moveTo(x + 9, y); c.lineTo(x - 5, y - 32); c.stroke();
    c.fillStyle = G(c, x - 7, 0, x + 8, 0, ['#0c1013', '#343738', '#101619']); c.fillRect(x - 7, y - 48, 16, 18);
    A.poly(c, [[x - 9, y - 48], [x + 1, y - 54], [x + 11, y - 48]], '#11171b');
    c.strokeStyle = '#555956'; c.lineWidth = 0.35;
    for (let yy = y - 46; yy < y - 30; yy += 5) c.strokeRect(x - 7, yy, 16, 1);
  }
  function lamp(c, x, ground, scale = 1) {
    c.save(); c.translate(x, ground); c.scale(scale, scale);
    c.fillStyle = G(c, -2, 0, 2, 0, ['#080c10', '#72726a', '#090e12']); c.fillRect(-1, -53, 2, 53); c.fillRect(-2, -4, 4, 4);
    c.fillStyle = '#11171b'; c.fillRect(-2, -54, 4, 2);
    A.poly(c, [[-3, -64], [3, -64], [2, -55], [-2, -55]], '#ead8aa');
    c.strokeStyle = '#12191d'; c.lineWidth = 0.8; c.strokeRect(-3, -64, 6, 9);
    A.poly(c, [[-5, -64], [0, -69], [5, -64]], '#1b2327');
    c.beginPath(); c.moveTo(0, -64); c.lineTo(0, -55); c.stroke();
    A.glow(c, 0, -60, 20, 'rgba(255,225,174,0.18)'); A.glow(c, 0, -60, 8, 'rgba(255,236,194,0.24)');
    c.fillStyle = 'rgba(230,210,166,0.1)'; c.beginPath(); c.ellipse(0, -0.8, 18, 1.3, 0, 0, 7); c.fill();
    c.restore();
  }
  function building(c, x, base, width, height, rnd, shops) {
    const y = base - height;
    A.brick(c, x, y, width, height, rnd() * 1000000, true);
    c.fillStyle = G(c, x, y, x + width, y, ['rgba(0,0,0,0.55)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.6)']); c.fillRect(x, y, width, height);
    c.fillStyle = '#101518'; c.fillRect(x - 2, y - 3, width + 4, 3);
    c.fillStyle = '#565958'; c.fillRect(x - 3, y - 4, width + 6, 0.7);
    for (let yy = y + 10; yy < base - (shops ? 34 : 4); yy += 27) {
      for (let wx = x + 7; wx < x + width - 8; wx += 20) windowPane(c, wx, yy, 9, 17, rnd() < 0.55, rnd);
      c.fillStyle = '#13181a'; c.fillRect(x, yy + 20, width, 1.2);
    }
    if (shops) {
      const sy = base - 33;
      c.fillStyle = '#111719'; c.fillRect(x + 3, sy, width - 6, 32);
      windowPane(c, x + 7, sy + 7, width * 0.44, 23, true, rnd);
      windowPane(c, x + width * 0.64, sy + 9, width * 0.21, 22, true, rnd);
      c.fillStyle = '#303331'; c.fillRect(x + 3, sy + 1, width - 6, 3);
      // Weathered striped canvas awning, softly curved valance.
      for (let xx = x + 1, i = 0; xx < x + width - 1; xx += 4, i++) {
        c.fillStyle = G(c, xx, sy, xx, sy + 8, i % 2 ? ['#494a45', '#242725'] : ['#797a6c', '#444941']);
        c.beginPath(); c.moveTo(xx, sy + 3); c.lineTo(xx + 4, sy + 3); c.lineTo(xx + 4, sy + 9); c.quadraticCurveTo(xx + 2, sy + 12, xx, sy + 9); c.fill();
      }
      c.fillStyle = '#52544c'; c.fillRect(x + 1, base - 1, width - 2, 1);
    }
    chimney(c, x + 7, y - 4, 10 + rnd() * 6, rnd);
    rail(c, x + width * 0.5, y - 12, width * 0.4);
    if (rnd() < 0.4) tower(c, x + width * 0.55, y - 8);
    // A fire escape with cast-iron landings, steps and slender struts.
    c.strokeStyle = '#0b1013'; c.lineWidth = 0.7;
    for (let yy = y + 15; yy < base - 38; yy += 27) {
      rail(c, x + width - 17, yy, 15);
      c.beginPath(); c.moveTo(x + width - 3, yy + 8); c.lineTo(x + width - 15, yy + 28); c.stroke();
      for (let k = 0; k < 7; k++) { c.beginPath(); c.moveTo(x + width - 5 - k * 1.5, yy + 10 + k * 2.5); c.lineTo(x + width - 10 - k * 1.5, yy + 10 + k * 2.5); c.stroke(); }
    }
  }
  function bakeSky(seed) {
    const image = A.hi(VW, VH), c = image.getContext('2d'), rnd = U.rng(seed);
    c.fillStyle = G(c, 0, 0, 0, VH, ['#080d13', '#252d33', '#5a6160']); c.fillRect(0, 0, VW, VH);
    // Clouds are overlapping translucent turbulent banks, rather than a pixel noise pass.
    for (let i = 0; i < 200; i++) {
      const x = rnd() * VW, y = rnd() * 115, r = 3 + rnd() * 20;
      A.glow(c, x, y, r, rnd() < 0.72 ? 'rgba(0,3,7,0.22)' : 'rgba(139,145,147,0.09)');
    }
    A.glow(c, 287, 39, 42, 'rgba(232,233,216,0.12)');
    c.fillStyle = '#deddd0'; c.beginPath(); c.arc(287, 39, 5.2, 0, 7); c.fill();
    c.save(); c.beginPath(); c.arc(287, 39, 5.2, 0, 7); c.clip();
    for (let i = 0; i < 20; i++) { c.fillStyle = 'rgba(68,75,77,0.18)'; c.beginPath(); c.arc(282 + rnd() * 11, 34 + rnd() * 11, 0.2 + rnd() * 1.6, 0, 7); c.fill(); } c.restore();
    return image;
  }
  function bakeCity(seed, depth, mode) {
    const image = A.hi(768, VH), c = image.getContext('2d'), rnd = U.rng(seed);
    if (depth < 2) {
      for (let x = 0; x < 768;) {
        const w = 16 + rnd() * 30, y = (depth ? 68 : 83) + rnd() * 55;
        c.fillStyle = depth ? '#20272b' : '#3a4246'; c.fillRect(x, y, w, VH - y);
        c.fillRect(x + 3, y - 4, w - 6, 4);
        for (let wx = x + 4; wx < x + w - 3; wx += 5) for (let yy = y + 7; yy < VH; yy += 9) if (rnd() < 0.36) {
          c.fillStyle = rnd() < 0.25 ? '#ae9e76' : depth ? '#56594f' : '#6a6d60'; c.fillRect(wx, yy, 1.4, 3.8);
        }
        if (rnd() < 0.4) tower(c, x + w / 2, y);
        chimney(c, x + 2, y, 5 + rnd() * 12, rnd); x += w + 3;
      }
    } else if (mode === 'rooftop') {
      for (let x = 0; x < 768; x += 112) {
        const top = 143 + rnd() * 17;
        building(c, x, 227, 95, 227 - top, rnd, false);
        chimney(c, x + 12, top - 4, 20, rnd); rail(c, x + 40, top - 12, 50);
        A.poly(c, [[x + 48, top - 2], [x + 53, top - 11], [x + 72, top - 11], [x + 80, top - 2]], '#171f24');
        c.fillStyle = '#b7ad8f'; c.fillRect(x + 54, top - 10, 5, 6); c.fillRect(x + 62, top - 10, 5, 6); c.fillRect(x + 70, top - 10, 3, 6);
      }
    } else {
      for (let x = 0; x < 768; x += 182) {
        building(c, x, 176, 61, 109 + rnd() * 23, rnd, true);
        building(c, x + 132, 176, 50, 96 + rnd() * 24, rnd, true);
        rail(c, x + 65, 162, 63);
        c.fillStyle = '#191f22'; c.fillRect(x + 65, 171, 63, 5);
        lamp(c, x + 93, 176, 0.85);
        // Overhead telegraph wires and poles.
        c.strokeStyle = '#131a20'; c.lineWidth = 0.5;
        c.beginPath(); c.moveTo(x + 117, 176); c.lineTo(x + 117, 78); c.moveTo(x + 112, 84); c.lineTo(x + 122, 84); c.moveTo(x + 117, 85); c.quadraticCurveTo(x + 175, 102, x + 299, 85); c.stroke();
      }
    }
    return image;
  }
  function stoneTile(c, x, y, art, e, seed, mode) {
    if (art === 'oneway') {
      c.fillStyle = '#22292b'; c.fillRect(x, y, 16, 3); c.fillStyle = '#9a9c8f'; c.fillRect(x, y, 16, 0.6); return;
    }
    if (art === 'ice') { c.fillStyle = G(c, x, y, x + 16, y + 16, ['#c3d3d2', '#607a83', '#233943']); c.fillRect(x, y, 16, 16); c.fillStyle = '#e9efdf'; c.fillRect(x, y, 16, 0.8); return; }
    if (mode === 'train' && art === 'solid') {
      c.fillStyle = G(c, x, y, x, y + 16, ['#6c716a', '#232a2c', '#0d1419']); c.fillRect(x, y, 16, 16);
      c.strokeStyle = '#93978b'; c.lineWidth = 0.3; c.strokeRect(x + 0.4, y + 0.3, 15.2, 15.3);
      c.fillStyle = '#0d1114'; for (let i = 3; i < 16; i += 6) { c.beginPath(); c.arc(x + i, y + 4, 0.6, 0, 7); c.fill(); } return;
    }
    A.brick(c, x, y, 16, 16, seed * 1e7, false);
    if (art === 'alt') {
      c.fillStyle = G(c, x, y, x + 16, y, ['#1a2123', '#64685f', '#192024']); c.fillRect(x + 0.4, y + 1, 15.2, 15);
      c.strokeStyle = '#131a1c'; c.lineWidth = 0.7; for (let k = 3; k < 16; k += 4) { c.beginPath(); c.moveTo(x + k, y); c.lineTo(x + k, y + 16); c.stroke(); }
    }
    if (e.t) {
      c.fillStyle = G(c, x, y, x, y + 3.5, ['#96998c', '#525b57', '#10191e']); c.fillRect(x, y, 16, 3.5);
      c.fillStyle = 'rgba(229,225,196,0.45)'; c.fillRect(x + 1 + seed * 5, y + 0.2, 5 + seed * 3, 0.45);
      c.strokeStyle = '#1e282c'; c.lineWidth = 0.4; c.beginPath(); c.moveTo(x + 8, y); c.lineTo(x + 8, y + 3); c.stroke();
    }
    c.fillStyle = 'rgba(0,0,0,0.3)'; if (e.l) c.fillRect(x, y, 0.7, 16); if (e.r) c.fillRect(x + 15.3, y, 0.7, 16);
  }
  function silentSpike(c, x, y, dir) {
    c.save(); c.translate(x + 8, y + 8);
    c.rotate(({ up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 })[dir]);
    for (let i = -7; i < 8; i += 5) {
      A.poly(c, [[i, 8], [i + 2.5, -6], [i + 5, 8]], '#555d5f');
      A.poly(c, [[i + 2.5, -6], [i + 5, 8], [i + 2.5, 8]], '#e3e0d1');
    }
    c.restore();
  }
  const places = [
    ['oldtv_studio', 'THE SILENT STREET', 'street'],
    ['oldtv_rooftop', 'MIDNIGHT ROOFTOPS', 'rooftop'],
    ['oldtv_train', 'THE NIGHT EXPRESS', 'train'],
    ['oldtv_harbour', 'THE LAMPLIT CANAL', 'canal'],
  ];
  for (const [id, title, mode] of places) KF.Themes.add(id, {
    id, title, bg: '#11191f', sign: A.sign, spike: silentSpike, door: A.door,
    cube: { top: '#777b70', side: '#262f32', under: '#0d171b', edge: '#242f32' },
    build() {
      this.sky = bakeSky(1931); this.far = bakeCity(1932, 0, mode); this.mid = bakeCity(1933, 1, mode); this.near = bakeCity(1934, 2, mode);
      this.mist = A.hi(VW, VH); const c = this.mist.getContext('2d');
      c.fillStyle = G(c, 0, 70, 0, VH, ['rgba(160,175,176,0)', 'rgba(160,175,176,0.12)', 'rgba(160,175,176,0)']); c.fillRect(0, 70, VW, VH - 70);
    },
    background(c, cam, t) {
      KF.blit(c, this.sky, 0, 0); A.tiled(c, this.far, cam.x, 0.08); KF.blit(c, this.mist, 0, -22);
      A.tiled(c, this.mid, cam.x, 0.22); KF.blit(c, this.mist, 0, 0);
      if (mode === 'train') {
        const speed = cam.x + t * 52; A.tiled(c, this.near, speed, 0.46);
        c.fillStyle = '#0c141a'; c.fillRect(0, 174, VW, 3);
        const off = ((cam.x + t * 120) % 140 + 140) % 140;
        c.strokeStyle = '#131a1e'; c.lineWidth = 1;
        for (let x = -off; x < VW + 140; x += 140) { c.beginPath(); c.moveTo(x, 176); c.lineTo(x, 57); c.moveTo(x - 7, 68); c.lineTo(x + 7, 68); c.moveTo(x, 68); c.quadraticCurveTo(x + 70, 84, x + 140, 68); c.stroke(); }
      } else A.tiled(c, this.near, cam.x, 0.58);
      // Steam and mist drift independently of the camera.
      for (let i = 0; i < 5; i++) {
        const x = ((i * 93 - cam.x * 0.25 + t * 2) % 480 + 480) % 480 - 45;
        A.glow(c, x, 107 + Math.sin(t * 0.2 + i) * 10, 23, 'rgba(157,167,169,0.055)');
      }
      if (mode === 'canal') {
        c.fillStyle = G(c, 0, 177, 0, VH, ['#34413f', '#111d23', '#060f16']); c.fillRect(0, 177, VW, VH - 177);
        for (let i = 0; i < 115; i++) {
          const x = U.hash2(i, 8) * VW, y = 179 + U.hash2(i, 9) * 37;
          const shine = Math.pow(Math.max(0, Math.cos((x + cam.x * 0.58 - 93) / 29)), 12);
          c.strokeStyle = `rgba(223,210,172,${0.05 + shine * 0.37})`; c.lineWidth = 0.35 + (y - 179) / 80;
          c.beginPath(); c.moveTo(x + Math.sin(t * 1.7 + i) * 2, y); c.lineTo(x + 2 + U.hash2(i, 10) * 7, y); c.stroke();
        }
      }
    },
    tile(c, x, y, art, e, seed) { stoneTile(c, x, y, art, e, seed, mode); },
    drawPlayer(c, p, x, feet, state, opts = {}) {
      const frame = KF.Sprites.pickIn(chaplin.frames, state, p.stateT);
      c.save(); c.translate(x, feet); c.scale(p.facing < 0 ? -1 : 1, p.gravDir < 0 ? -1 : 1);
      c.imageSmoothingEnabled = false;
      c.drawImage(chaplinFrame(opts.flash > 0.5 ? frame.flash : frame.img), -chaplin.AX, -chaplin.AY, chaplin.W, chaplin.H);
      c.restore(); return frame;
    },
  });
  A.style('oldtv', 'cinematic', {
    theme: 'oldtv_studio', extrude: true,
    overlay(c, i) {
      c.save();
      const g = c.createRadialGradient(VW / 2, VH / 2, 65, VW / 2, VH / 2, 210);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,5,10,0.48)'); c.fillStyle = g; c.fillRect(0, 0, VW, VH);
      c.fillStyle = 'rgba(240,236,216,0.05)';
      for (let k = 0; k < 90; k++) c.fillRect(i.rnd() * VW, i.rnd() * VH, 0.25, 0.25);
      c.fillStyle = '#070b0f'; c.fillRect(0, 0, VW, 3); c.fillRect(0, VH - 3, VW, 3); c.restore();
    },
  });
})(window.KF);
