'use strict';
// Smooth (non-pixel) places for the VHS realm: Dad's camcorder, summer '96. Each place is a soft,
// painted scene built from gradients and shapes (sunlight, haze, soft shadows) and the tape look
// is done on the GPU in compose(): a soft image, colour fringing, a drifting tracking band,
// head-switching noise at the bottom, tape speckle and the camcorder's on-screen display.
(function (KF) {
  const VW = KF.VIEW_W, VH = KF.VIEW_H, U = KF.util, F = () => KF.Font;
  const HI = () => KF.HI_MAX;

  // ---------- drawing helpers (logical coordinates, any resolution) ----------
  const lin = (ctx, x0, y0, x1, y1, stops) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(([p, c]) => g.addColorStop(p, c));
    return g;
  };
  const rad = (ctx, x, y, r0, r1, stops) => {
    const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
    stops.forEach(([p, c]) => g.addColorStop(p, c));
    return g;
  };
  const rrect = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
  const fillR = (ctx, fill, x, y, w, h, r = 0) => { ctx.fillStyle = fill; if (r) { rrect(ctx, x, y, w, h, r); ctx.fill(); } else ctx.fillRect(x, y, w, h); };
  const circle = (ctx, fill, x, y, r) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
  const glow = (ctx, x, y, r, col, a = 1) => { ctx.globalAlpha = a; ctx.fillStyle = rad(ctx, x, y, 0, r, [[0, col], [1, 'rgba(0,0,0,0)']]); ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1; };
  // A baked layer `w` logical px wide that wraps seamlessly: draw() is called at offsets -w, 0, w.
  function layer(w, h, draw) {
    const c = KF.makeHi(w, h, HI()), x = c.getContext('2d');
    x.imageSmoothingEnabled = true;
    for (const off of [-w, 0, w]) { x.save(); x.translate(off, 0); draw(x, U.rng(77)); x.restore(); }
    return c;
  }
  // Parallax blit of a wrapping layer.
  function scroll(ctx, img, camX, par, y = 0) {
    const w = img.lw;
    let ox = -((camX * par) % w);
    if (ox > 0) ox -= w;
    for (let x = ox; x < VW; x += w) ctx.drawImage(img, x, y, w, img.lh);
  }
  const wrapX = (wx, camX, par, span) => ((((wx - camX * par) % span) + span) % span) - 40;
  // Soft cloud: overlapping radial puffs.
  function cloud(ctx, x, y, s, a = 0.95) {
    for (const [dx, dy, r] of [[-14, 3, 9], [-5, -3, 11], [6, -1, 10], [15, 3, 8], [0, 5, 10]]) {
      ctx.globalAlpha = a; ctx.fillStyle = rad(ctx, x + dx * s, y + dy * s, 0, r * s, [[0, '#ffffff'], [0.65, 'rgba(255,255,255,0.9)'], [1, 'rgba(255,255,255,0)']]);
      ctx.fillRect(x + (dx - r) * s, y + (dy - r) * s, r * 2 * s, r * 2 * s);
    }
    ctx.globalAlpha = 1;
  }
  // A soft-edged block with a lit top face and a shaded front: the "side-on but solid" look.
  function slab(ctx, x, y, w, h, top, frontA, frontB, lip = 3) {
    ctx.fillStyle = lin(ctx, 0, y, 0, y + h, [[0, frontA], [1, frontB]]); ctx.fillRect(x, y, w, h);
    ctx.fillStyle = top; ctx.fillRect(x, y, w, lip);
  }

  // Marker-pen signboard text: smooth type, like a sign someone made for the video.
  function marker(ctx, text, x, y, color, size = 7, align = 'center') {
    ctx.font = `bold ${size}px "Trebuchet MS", "Arial Rounded MT Bold", Arial, sans-serif`;
    ctx.textAlign = align; ctx.textBaseline = 'top'; ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    return ctx.measureText(text).width;
  }

  // ---------- shared props, in the soft painted look ----------
  function spikes(metal, base) {
    return function (ctx, x, y, dir) {
      ctx.save();
      ctx.translate(x + 8, y + 8);
      ctx.rotate({ up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 }[dir] || 0);
      ctx.fillStyle = lin(ctx, 0, 5, 0, 8, [[0, base[0]], [1, base[1]]]); rrect(ctx, -8, 5, 16, 3, 1); ctx.fill();
      for (const cx of [-4, 4]) { // two steel stakes, lit from the left
        ctx.beginPath(); ctx.moveTo(cx - 3.6, 6); ctx.lineTo(cx, -2.5); ctx.lineTo(cx + 3.6, 6); ctx.closePath();
        ctx.fillStyle = lin(ctx, cx - 3.6, 0, cx + 3.6, 0, [[0, metal[0]], [0.45, metal[1]], [1, metal[2]]]); ctx.fill();
        ctx.strokeStyle = 'rgba(30,10,10,0.7)'; ctx.lineWidth = 0.6; ctx.stroke();
        circle(ctx, '#ffffff', cx - 0.6, 0.5, 0.6);
      }
      ctx.restore();
    };
  }
  // A door with a little porch light; the real exit glows. Supports running legs and hanging upside down.
  function door(pal) {
    return function (ctx, x, y, o = {}) {
      ctx.save();
      if (o.flipped) { ctx.translate(0, y * 2 + 32); ctx.scale(1, -1); }
      if (o.legs) {
        const k = Math.sin(o.legs * 24) * 2;
        ctx.strokeStyle = '#2a2018'; ctx.lineWidth = 2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x + 5, y + 31); ctx.lineTo(x + 5 + k, y + 35); ctx.moveTo(x + 11, y + 31); ctx.lineTo(x + 11 - k, y + 35); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 1, y + 31, 16, 2); // contact shadow
      fillR(ctx, lin(ctx, x - 2, 0, x + 18, 0, [[0, pal.frame[0]], [1, pal.frame[1]]]), x - 2, y + 1, 20, 31, 1.5);
      const open = o.open || 0;
      if (open > 0) {
        fillR(ctx, rad(ctx, x + 8, y + 18, 1, 16, [[0, '#fff6d8'], [0.6, '#ffd890'], [1, '#d08a40']]), x, y + 3, 16, 29);
        ctx.globalAlpha = 1 - open; fillR(ctx, pal.door[0], x, y + 3, 16, 29); ctx.globalAlpha = 1;
      } else {
        fillR(ctx, lin(ctx, x, 0, x + 16, 0, [[0, pal.door[0]], [0.5, pal.door[1]], [1, pal.door[2]]]), x, y + 3, 16, 29);
        ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 0.6; // panels
        rrect(ctx, x + 2.5, y + 6, 11, 9, 1); ctx.stroke(); rrect(ctx, x + 2.5, y + 18, 11, 11, 1); ctx.stroke();
        circle(ctx, lin(ctx, x + 11, y + 17, x + 14, y + 20, [[0, '#fff2b0'], [1, '#a07820']]), x + 13, y + 18.5, 1.3);
      }
      if (o.lantern) { // the real exit: a porch light and an EXIT card taped above
        const p = 0.75 + 0.25 * Math.sin((o.t || 0) * 5);
        glow(ctx, x + 8, y - 4, 14, 'rgba(255,220,140,0.9)', 0.55 * p);
        fillR(ctx, '#fffbe8', x + 1, y - 9, 14, 7, 1);
        marker(ctx, 'EXIT', x + 8, y - 8.6, '#d03020', 5.5);
      }
      ctx.restore();
    };
  }
  function spring(ctx, x, y, squash) { // a mini trampoline
    const top = y + 9 + squash * 3;
    ctx.strokeStyle = '#30343c'; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + 3, top + 1); ctx.lineTo(x + 2, y + 16); ctx.moveTo(x + 13, top + 1); ctx.lineTo(x + 14, y + 16); ctx.stroke();
    ctx.fillStyle = lin(ctx, 0, top - 1, 0, top + 2, [[0, '#3a4a9a'], [1, '#1a2050']]);
    ctx.beginPath(); ctx.ellipse(x + 8, top, 7.5, 1.8 - squash * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffd040'; ctx.lineWidth = 0.8; ctx.stroke();
  }
  function sign(pal) {
    return function (ctx, x, y, text) {
      ctx.font = 'bold 7px "Trebuchet MS", Arial, sans-serif';
      const w = Math.max(18, ctx.measureText(text).width + 8), bx = x - w / 2;
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x - 0.5, y + 12, 3, 7);
      fillR(ctx, pal.post, x - 1, y + 9, 2, 9);
      ctx.save(); ctx.translate(x, y + 5); ctx.rotate(-0.03); ctx.translate(-x, -y - 5);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; rrect(ctx, bx + 1, y + 1, w, 11, 1.5); ctx.fill();
      fillR(ctx, lin(ctx, 0, y, 0, y + 11, [[0, pal.board[0]], [1, pal.board[1]]]), bx, y, w, 11, 1.5);
      marker(ctx, text, x, y + 2, pal.ink, 7);
      ctx.restore();
    };
  }

  // ======================================================================
  // 1. BACKYARD BBQ: a hot July afternoon behind the house.
  // ======================================================================
  KF.Themes.add('vhs_backyard', {
    id: 'vhs_backyard', title: 'BACKYARD BBQ', name: 'BACKYARD', bg: '#8cc8f0',
    zone: { gravity: '#8a7aff', reverse: '#ff5ac8' },
    signBoard: '#fff4d8', signInk: '#3a2a1a', signPost: '#8a6038',
    build() {
      this.sky = KF.makeHi(VW, VH, HI()); const s = this.sky.getContext('2d'); s.imageSmoothingEnabled = true;
      s.fillStyle = lin(s, 0, 0, 0, VH, [[0, '#5a9ee8'], [0.55, '#a8d4f4'], [1, '#f4e8c8']]); s.fillRect(0, 0, VW, VH);
      glow(s, 300, 30, 90, 'rgba(255,250,220,0.9)', 0.8); circle(s, '#fffdf0', 300, 30, 9);
      const rnd = U.rng(9);
      for (let k = 0; k < 6; k++) cloud(s, 20 + k * 66 + rnd() * 20, 30 + rnd() * 34, 0.8 + rnd() * 0.5, 0.85);
      // Far: neighbours' roofs and trees, hazy blue-green.
      this.far = layer(640, VH, (x, r) => {
        for (let px = 0; px < 640;) {
          const w = 60 + r() * 50, h = 22 + r() * 14, base = 128;
          x.fillStyle = 'rgba(120,150,170,0.75)'; x.fillRect(px, base - h, w, h + 40);
          x.fillStyle = 'rgba(150,100,100,0.75)'; x.beginPath(); x.moveTo(px - 4, base - h); x.lineTo(px + w / 2, base - h - 16); x.lineTo(px + w + 4, base - h); x.fill();
          for (let t = 0; t < 2; t++) { const tx = px + w + 6 + r() * 18; circle(x, 'rgba(90,140,110,0.8)', tx, base - 22 - r() * 10, 12 + r() * 8); }
          px += w + 26 + r() * 20;
        }
        x.strokeStyle = 'rgba(40,40,50,0.6)'; x.lineWidth = 0.6; // telephone wire
        x.beginPath(); x.moveTo(0, 60); for (let px = 0; px <= 640; px += 160) x.quadraticCurveTo(px + 80, 74, px + 160, 60); x.stroke();
        for (let px = 0; px < 640; px += 160) fillR(x, 'rgba(70,55,45,0.85)', px - 1.5, 56, 3, 90);
      });
      // Mid: the wooden fence with a gate, a tree, the shed.
      this.mid = layer(768, VH, (x, r) => {
        const top = 126;
        for (let px = 0; px < 768; px += 9) {
          x.fillStyle = lin(x, px, 0, px + 8, 0, [[0, '#c89868'], [0.5, '#b8875a'], [1, '#8a6038']]);
          rrect(x, px, top + (px % 27 === 0 ? -2 : 0), 8, 60, [2, 2, 0, 0]); x.fill();
        }
        x.fillStyle = 'rgba(80,50,30,0.35)'; x.fillRect(0, top + 12, 768, 2.5); x.fillRect(0, top + 38, 768, 2.5);
        for (const tx of [120, 520]) { // big leafy trees behind the fence
          fillR(x, lin(x, tx - 5, 0, tx + 5, 0, [[0, '#6a4a30'], [1, '#3a2818']]), tx - 5, 60, 10, 80, 3);
          for (const [dx, dy, rr] of [[-26, 54, 22], [0, 40, 28], [26, 54, 22], [-12, 70, 20], [14, 72, 20]]) {
            x.fillStyle = rad(x, tx + dx - 6, dy - 8, 2, rr, [[0, '#7ac060'], [0.7, '#4a8a3a'], [1, '#2e6028']]); x.beginPath(); x.arc(tx + dx, dy, rr, 0, 7); x.fill();
          }
        }
        // shed
        fillR(x, lin(x, 300, 0, 360, 0, [[0, '#d8d0c0'], [1, '#a8a090']]), 300, 96, 60, 40);
        x.fillStyle = '#8a4a3a'; x.beginPath(); x.moveTo(294, 98); x.lineTo(330, 80); x.lineTo(366, 98); x.fill();
        fillR(x, '#6a5a4a', 322, 110, 14, 26, 1);
      });
    },
    background(ctx, cam, t, mood) {
      ctx.drawImage(this.sky, 0, 0, VW, VH);
      scroll(ctx, this.far, cam.x, 0.12, -4);
      scroll(ctx, this.mid, cam.x, 0.35, 0);
      // Kettle BBQ with smoke, sprinkler arc, a garden gnome; the neighbour pops up on a death.
      const bx = wrapX(240, cam.x, 0.35, 768);
      ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(bx - 6, 172); ctx.lineTo(bx, 160); ctx.lineTo(bx + 6, 172); ctx.stroke();
      ctx.fillStyle = lin(ctx, bx - 9, 0, bx + 9, 0, [[0, '#4a4a52'], [0.4, '#2a2a30'], [1, '#101014']]);
      ctx.beginPath(); ctx.arc(bx, 156, 9, 0, Math.PI); ctx.fill();
      ctx.beginPath(); ctx.ellipse(bx, 155, 9, 3, 0, Math.PI, 0); ctx.fill();
      for (let k = 0; k < 4; k++) { const p = (t * 0.6 + k / 4) % 1; glow(ctx, bx + Math.sin(t * 2 + k) * 5 * p, 148 - p * 40, 5 + p * 9, 'rgba(240,240,240,0.7)', (1 - p) * 0.8); }
      const nx = wrapX(470, cam.x, 0.35, 768), up = Math.min(1, mood.cheer || 0) * 14;
      if (up > 1) { // neighbour's head over the fence
        circle(ctx, '#e8b090', nx, 128 - up, 6); fillR(ctx, '#5a3a20', nx - 6, 122 - up, 12, 4, 2);
        circle(ctx, '#202020', nx - 2, 128 - up, 0.8); circle(ctx, '#202020', nx + 2, 128 - up, 0.8);
      }
      const sx = wrapX(600, cam.x, 0.5, 900), sa = Math.sin(t * 1.6) * 0.9;
      ctx.strokeStyle = 'rgba(220,240,255,0.55)'; ctx.lineWidth = 0.7;
      for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(sx, 176); ctx.quadraticCurveTo(sx + Math.sin(sa + k * 0.15) * 20, 150, sx + Math.sin(sa + k * 0.15) * 34, 176); ctx.stroke(); }
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid') { // lawn over a sandstone retaining wall
        slab(ctx, x, y, 16, 16, 'rgba(0,0,0,0)', '#c89a68', '#7a5634', 0);
        ctx.strokeStyle = 'rgba(70,40,20,0.55)'; ctx.lineWidth = 0.6;
        for (let k = 0; k < 16; k += 8) { ctx.beginPath(); ctx.moveTo(x, y + k + 8); ctx.lineTo(x + 16, y + k + 8); ctx.stroke(); const o = ((k / 8 + (seed > 0.5 ? 1 : 0)) % 2) * 8; ctx.beginPath(); ctx.moveTo(x + o, y + k); ctx.lineTo(x + o, y + k + 8); ctx.stroke(); }
        if (e.t) {
          ctx.fillStyle = lin(ctx, 0, y - 2, 0, y + 5, [[0, '#9ae070'], [0.5, '#5aaa40'], [1, '#3a7a2a']]);
          ctx.beginPath(); ctx.moveTo(x, y + 5);
          for (let k = 0; k <= 16; k += 2) ctx.lineTo(x + k, y - 1 + ((k + seed * 10) % 3) * 0.6);
          ctx.lineTo(x + 16, y + 5); ctx.fill();
          ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(x, y + 5, 16, 1.5);
        }
        if (e.l) { ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x, y, 1, 16); }
        if (e.r) { ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(x + 15, y, 1, 16); }
      } else if (art === 'alt') { // picnic cooler
        fillR(ctx, lin(ctx, x, 0, x + 16, 0, [[0, '#3a7ad8'], [0.5, '#2a5ab8'], [1, '#1a3a80']]), x + 0.5, y + 3, 15, 13, 2);
        fillR(ctx, lin(ctx, 0, y, 0, y + 4, [[0, '#ffffff'], [1, '#d0d8e0']]), x, y + 1, 16, 4, 1.5);
        fillR(ctx, '#e0e4e8', x + 5, y - 0.5, 6, 2, 1);
        ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x + 2, y + 6, 1.5, 8);
      } else if (art === 'ice') { // slip 'n slide: wet yellow plastic
        fillR(ctx, lin(ctx, 0, y, 0, y + 16, [[0, '#ffe060'], [1, '#d0a020']]), x, y, 16, 16);
        ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(x, y, 16, 1.2);
        circle(ctx, 'rgba(255,255,255,0.6)', x + 4 + seed * 8, y + 3, 0.9); circle(ctx, 'rgba(160,220,255,0.6)', x + 11, y + 6, 1.2);
      } else { // deck boards on posts
        fillR(ctx, lin(ctx, 0, y, 0, y + 4, [[0, '#f0c890'], [1, '#a87840']]), x, y, 16, 4, 0.8);
        ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(x, y + 4, 16, 1);
      }
    },
    spike: spikes(['#f4f4f8', '#b8bcc8', '#6a7080'], ['#e03030', '#8a1010']),
    door: door({ frame: ['#f4f0e8', '#c8c0b0'], door: ['#5a9a6a', '#3a7a4a', '#2a5a36'] }),
    spring,
    sign: sign({ board: ['#fffaf0', '#f0e4c8'], ink: '#2a3a8a', post: '#8a6038' }),
  });

  // ======================================================================
  // 2. APARTMENT ROOF: golden hour over the city, laundry on the line.
  // ======================================================================
  KF.Themes.add('vhs_rooftop', {
    id: 'vhs_rooftop', title: 'APARTMENT ROOF', name: 'ROOF', bg: '#f0a878',
    zone: { gravity: '#8a7aff', reverse: '#ff5ac8' },
    signBoard: '#fff4d8', signInk: '#3a2a1a', signPost: '#5a4a3a',
    build() {
      this.sky = KF.makeHi(VW, VH, HI()); const s = this.sky.getContext('2d'); s.imageSmoothingEnabled = true;
      s.fillStyle = lin(s, 0, 0, 0, VH, [[0, '#5a6aa8'], [0.35, '#c88a9a'], [0.65, '#f8b080'], [1, '#ffe0a0']]); s.fillRect(0, 0, VW, VH);
      glow(s, 90, 130, 110, 'rgba(255,220,150,0.95)', 0.9); circle(s, '#fff0c0', 90, 128, 14);
      const rnd = U.rng(31);
      for (let k = 0; k < 4; k++) { s.globalAlpha = 0.5; s.fillStyle = '#f8c0a0'; rrect(s, rnd() * VW, 30 + rnd() * 50, 60 + rnd() * 60, 3, 1.5); s.fill(); }
      s.globalAlpha = 1;
      const city = (par, col, lit, base, hmin, hmax, seed) => layer(640, VH, (x) => {
        const r = U.rng(seed);
        for (let px = 0; px < 640;) {
          const w = 20 + r() * 34, h = hmin + r() * (hmax - hmin);
          x.fillStyle = col; x.fillRect(px, base - h, w, h + 60);
          if (lit) for (let wy = base - h + 5; wy < base; wy += 6) for (let wx = px + 3; wx < px + w - 3; wx += 5) if (r() < 0.22) { x.fillStyle = lit; x.fillRect(wx, wy, 2.4, 3); }
          if (r() < 0.3) { x.fillStyle = col; x.fillRect(px + w / 2 - 0.5, base - h - 14, 1, 14); }
          px += w + r() * 5;
        }
      });
      this.far = city(0.1, 'rgba(150,110,150,0.75)', null, 150, 30, 80, 5);
      this.mid = city(0.25, 'rgba(90,60,90,0.9)', 'rgba(255,220,150,0.8)', 170, 40, 100, 8);
    },
    background(ctx, cam, t, mood) {
      ctx.drawImage(this.sky, 0, 0, VW, VH);
      scroll(ctx, this.far, cam.x, 0.08, 0);
      scroll(ctx, this.mid, cam.x, 0.22, 0);
      // water tower and a satellite dish on the next roof
      const wx = wrapX(220, cam.x, 0.4, 700);
      ctx.strokeStyle = '#3a2a30'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(wx - 10, 168); ctx.lineTo(wx - 7, 128); ctx.moveTo(wx + 10, 168); ctx.lineTo(wx + 7, 128); ctx.stroke();
      fillR(ctx, lin(ctx, wx - 12, 0, wx + 12, 0, [[0, '#8a5a40'], [0.4, '#6a4030'], [1, '#3a2018']]), wx - 12, 104, 24, 26, 2);
      ctx.fillStyle = '#3a2a2a'; ctx.beginPath(); ctx.moveTo(wx - 13, 105); ctx.lineTo(wx, 94); ctx.lineTo(wx + 13, 105); ctx.fill();
      // laundry line: shirts flap, harder on a death
      const lx = wrapX(470, cam.x, 0.55, 800), gust = 1 + (mood.cheer || 0) * 3;
      ctx.strokeStyle = 'rgba(60,50,50,0.8)'; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(lx, 140); ctx.quadraticCurveTo(lx + 50, 148, lx + 100, 140); ctx.stroke();
      ['#f0f0f0', '#e05050', '#5080e0', '#f0d040'].forEach((c, k) => {
        const px = lx + 14 + k * 22, sw = Math.sin(t * 4 * gust + k) * 3 * gust;
        ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(px - 6, 143); ctx.lineTo(px + 6, 143); ctx.lineTo(px + 6 + sw, 157); ctx.lineTo(px - 6 + sw, 157); ctx.fill();
      });
      // pigeons, scattering on a death
      const fly = mood.cheer || 0;
      for (let k = 0; k < 4; k++) {
        const px = wrapX(130 + k * 14, cam.x, 0.5, 600), py = 164 - fly * (20 + k * 9);
        ctx.fillStyle = '#5a5a68'; ctx.beginPath(); ctx.ellipse(px + fly * k * 10, py, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
        circle(ctx, '#6a6a78', px + 2.5 + fly * k * 10, py - 1.5, 1.4);
      }
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid') { // brick parapet with a tar-and-gravel top
        slab(ctx, x, y, 16, 16, 'rgba(0,0,0,0)', '#b86a50', '#7a3a2a', 0);
        ctx.strokeStyle = 'rgba(60,20,15,0.45)'; ctx.lineWidth = 0.5;
        for (let k = 0; k < 16; k += 4) {
          ctx.beginPath(); ctx.moveTo(x, y + k); ctx.lineTo(x + 16, y + k); ctx.stroke();
          const o = (k / 4) % 2 ? 0 : 4;
          for (let bx = o; bx < 16; bx += 8) { ctx.beginPath(); ctx.moveTo(x + bx, y + k); ctx.lineTo(x + bx, y + k + 4); ctx.stroke(); }
        }
        if (e.t) {
          fillR(ctx, lin(ctx, 0, y - 1, 0, y + 4, [[0, '#e8dcc8'], [0.6, '#b8a890'], [1, '#6a5a4a']]), x, y - 0.5, 16, 4.5);
          ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(x, y + 4, 16, 1.2);
        }
        if (e.r) { ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(x + 15, y, 1, 16); }
      } else if (art === 'alt') { // window AC unit
        fillR(ctx, lin(ctx, x, 0, x + 16, 0, [[0, '#d8dce4'], [0.5, '#aab0bc'], [1, '#6a7080']]), x + 0.5, y + 0.5, 15, 15, 1.5);
        ctx.strokeStyle = 'rgba(40,40,60,0.45)'; ctx.lineWidth = 0.6;
        for (let k = 4; k < 14; k += 2.5) { ctx.beginPath(); ctx.moveTo(x + 3, y + k); ctx.lineTo(x + 13, y + k); ctx.stroke(); }
      } else if (art === 'ice') { // wet sheet metal
        fillR(ctx, lin(ctx, 0, y, 0, y + 16, [[0, '#c8e0f0'], [1, '#6a8aa0']]), x, y, 16, 16);
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(x, y, 16, 1.2);
      } else { // a plank across two crates
        fillR(ctx, lin(ctx, 0, y, 0, y + 4, [[0, '#e0b880'], [1, '#8a6038']]), x, y, 16, 4, 0.6);
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x, y + 4, 16, 1);
      }
    },
    spike: spikes(['#f0f0f4', '#a8acb8', '#5a6070'], ['#d82828', '#7a0a0a']),
    door: door({ frame: ['#8a8a90', '#5a5a60'], door: ['#c85040', '#a03828', '#702018'] }),
    spring,
    sign: sign({ board: ['#fffaf0', '#f0e4c8'], ink: '#a02018', post: '#4a4a50' }),
  });

  // ======================================================================
  // 3. THE MALL, 1996: the atrium under the skylight, neon shopfronts, a fountain.
  // ======================================================================
  KF.Themes.add('vhs_mall', {
    id: 'vhs_mall', title: 'THE MALL, 1996', name: 'MALL', bg: '#e8e0f0',
    zone: { gravity: '#8a7aff', reverse: '#ff5ac8' },
    signBoard: '#fff4d8', signInk: '#3a2a1a', signPost: '#7a7a8a',
    build() {
      this.sky = KF.makeHi(VW, VH, HI()); const s = this.sky.getContext('2d'); s.imageSmoothingEnabled = true;
      s.fillStyle = lin(s, 0, 0, 0, VH, [[0, '#a8c8e8'], [0.3, '#e8e8f0'], [1, '#d8c8d8']]); s.fillRect(0, 0, VW, VH);
      // skylight girders
      s.strokeStyle = 'rgba(80,90,110,0.5)'; s.lineWidth = 1.5;
      for (let x = -20; x < VW + 20; x += 36) { s.beginPath(); s.moveTo(x, 0); s.lineTo(x + 18, 34); s.stroke(); }
      s.fillStyle = 'rgba(80,90,110,0.55)'; s.fillRect(0, 34, VW, 3);
      for (let k = 0; k < 5; k++) { s.globalAlpha = 0.12; s.fillStyle = '#fffbe0'; s.beginPath(); s.moveTo(40 + k * 80, 36); s.lineTo(70 + k * 80, 36); s.lineTo(110 + k * 80, VH); s.lineTo(30 + k * 80, VH); s.fill(); }
      s.globalAlpha = 1;
      // Upper gallery: shopfronts behind glass railing.
      const names = ['ARCADE', 'MUSIC', 'PRETZELS', 'VIDEO', 'SHOES', 'TOYS'];
      const cols = ['#ff4aa0', '#40d8ff', '#ffb030', '#a060ff', '#50e090', '#ff6040'];
      this.shops = layer(720, VH, (x) => {
        x.fillStyle = lin(x, 0, 44, 0, 104, [[0, '#d8d0e0'], [1, '#b0a8c0']]); x.fillRect(0, 44, 720, 62);
        for (let k = 0; k < 6; k++) {
          const px = k * 120 + 10;
          fillR(x, lin(x, 0, 58, 0, 100, [[0, '#2a2a40'], [1, '#4a4a60']]), px, 58, 96, 44, 1);
          x.globalAlpha = 0.25; fillR(x, cols[k], px + 4, 62, 88, 36); x.globalAlpha = 1;
          fillR(x, '#fdfaf0', px, 46, 96, 10, 1);
          x.font = 'bold 8px "Trebuchet MS", Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'top'; x.fillStyle = cols[k];
          x.fillText(names[k], px + 48, 47);
        }
        x.fillStyle = 'rgba(220,240,255,0.35)'; x.fillRect(0, 92, 720, 14); // glass railing
        x.fillStyle = '#8a8a9a'; x.fillRect(0, 91, 720, 1.5); x.fillRect(0, 106, 720, 2);
      });
      this.lower = layer(900, VH, (x, r) => { // palms in planters and the fountain
        for (let px = 60; px < 900; px += 220) {
          fillR(x, lin(x, px - 10, 0, px + 10, 0, [[0, '#c8b8a0'], [1, '#8a7a68']]), px - 11, 150, 22, 18, 2);
          x.strokeStyle = '#7a5a3a'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(px, 152); x.quadraticCurveTo(px - 4, 130, px + 2, 112); x.stroke();
          for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * 0.45; x.strokeStyle = '#3a8a4a'; x.lineWidth = 3; x.lineCap = 'round'; x.beginPath(); x.moveTo(px + 2, 112); x.quadraticCurveTo(px + 2 + Math.cos(a) * 14, 112 + Math.sin(a) * 10, px + 2 + Math.cos(a) * 22, 118 + Math.sin(a) * 6 + 8); x.stroke(); }
        }
        const fx = 420;
        fillR(x, lin(x, 0, 150, 0, 170, [[0, '#e0e4ec'], [1, '#9aa0b0']]), fx - 40, 152, 80, 16, 4);
        x.fillStyle = 'rgba(120,190,240,0.7)'; x.beginPath(); x.ellipse(fx, 153, 38, 3, 0, 0, Math.PI * 2); x.fill();
      });
    },
    background(ctx, cam, t, mood) {
      ctx.drawImage(this.sky, 0, 0, VW, VH);
      scroll(ctx, this.shops, cam.x, 0.18, 0);
      // Escalator diagonal, with little shoppers riding it.
      const ex = wrapX(150, cam.x, 0.3, 640);
      ctx.fillStyle = lin(ctx, ex, 108, ex + 60, 160, [[0, '#9aa0b0'], [1, '#6a7080']]);
      ctx.beginPath(); ctx.moveTo(ex, 160); ctx.lineTo(ex + 60, 108); ctx.lineTo(ex + 72, 108); ctx.lineTo(ex + 12, 160); ctx.fill();
      const hop = Math.abs(Math.sin(t * 9)) * Math.min(1, mood.cheer || 0) * 5;
      for (let k = 0; k < 3; k++) { const p = (t * 0.08 + k / 3) % 1, px = ex + 6 + p * 60, py = 156 - p * 52; fillR(ctx, ['#e05070', '#4070d0', '#50a060'][k], px - 2, py - 9 - hop, 4, 7, 1.5); circle(ctx, '#e8b890', px, py - 11 - hop, 2); }
      scroll(ctx, this.lower, cam.x, 0.45, 0);
      // fountain jets
      const fx = wrapX(420, cam.x, 0.45, 900) + 40;
      ctx.strokeStyle = 'rgba(200,235,255,0.7)'; ctx.lineWidth = 1.2;
      for (let k = -2; k <= 2; k++) { const h = 24 + Math.sin(t * 3 + k) * 3 + (mood.cheer || 0) * 10; ctx.beginPath(); ctx.moveTo(fx, 152); ctx.quadraticCurveTo(fx + k * 8, 152 - h * 2, fx + k * 16, 152); ctx.stroke(); }
      // a balloon drifting up under the skylight
      const bx = wrapX(300, cam.x, 0.3, 700), by = 120 - ((t * 6) % 90);
      ctx.strokeStyle = 'rgba(80,80,80,0.5)'; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.moveTo(bx, by + 6); ctx.lineTo(bx + 1, by + 18); ctx.stroke();
      circle(ctx, rad(ctx, bx - 2, by - 2, 0.5, 7, [[0, '#ff9ab0'], [1, '#e02858']]), bx, by, 5);
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid') { // terrazzo with a polished top
        slab(ctx, x, y, 16, 16, 'rgba(0,0,0,0)', '#8a7a98', '#4a3a5a', 0);
        const r = U.rng(Math.floor(seed * 9999));
        for (let k = 0; k < 7; k++) circle(ctx, ['#c8b8d0', '#e0a0a8', '#a0b0d0', '#f0ece8'][k % 4], x + r() * 16, y + 4 + r() * 12, 0.5 + r() * 0.5);
        if (e.t) {
          fillR(ctx, lin(ctx, 0, y, 0, y + 4, [[0, '#ffffff'], [0.5, '#e8e0f0'], [1, '#a098b0']]), x, y, 16, 4);
          ctx.fillStyle = '#2a2038'; ctx.fillRect(x, y + 4, 16, 0.8);
          ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(x + ((seed * 13) | 0), y + 0.6, 3, 0.8);
        }
        if (e.r) { ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(x + 15, y, 1, 16); }
      } else if (art === 'alt') { // planter box with a little shrub
        fillR(ctx, lin(ctx, x, 0, x + 16, 0, [[0, '#e8d8c0'], [1, '#a08868']]), x + 0.5, y + 5, 15, 11, 1.5);
        for (const [dx, rr] of [[4, 4], [8, 5], [12, 4]]) circle(ctx, rad(ctx, x + dx - 1, y + 3, 0.5, rr, [[0, '#7ad070'], [1, '#2a7a3a']]), x + dx, y + 4, rr);
      } else if (art === 'ice') { // freshly mopped floor
        fillR(ctx, lin(ctx, 0, y, 0, y + 16, [[0, '#7ab0d8'], [1, '#3a5a80']]), x, y, 16, 16);
        ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(x, y, 16, 1.4);
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x + ((seed * 11) | 0), y + 3, 4, 0.7);
      } else { // glass balcony ledge with a chrome rail
        fillR(ctx, 'rgba(200,230,255,0.55)', x, y, 16, 4);
        fillR(ctx, lin(ctx, 0, y, 0, y + 1.5, [[0, '#ffffff'], [1, '#8a90a0']]), x, y, 16, 1.5);
      }
    },
    spike: spikes(['#ffffff', '#c0c4d0', '#7a8090'], ['#ff3060', '#a00830']),
    door: door({ frame: ['#e0e4ec', '#9aa0b0'], door: ['#a0d0f0', '#70a8d8', '#4a80b0'] }),
    spring,
    sign: sign({ board: ['#ffffff', '#e8e8f8'], ink: '#d02880', post: '#8a8a9a' }),
  });

  // ======================================================================
  // 4. COMMUTER TRAIN: inside the carriage, the suburbs rushing past.
  // ======================================================================
  KF.Themes.add('vhs_train', {
    id: 'vhs_train', title: 'COMMUTER TRAIN', name: 'TRAIN', bg: '#d0d8d0',
    zone: { gravity: '#8a7aff', reverse: '#ff5ac8' },
    signBoard: '#fff4d8', signInk: '#3a2a1a', signPost: '#6a6a70',
    build() {
      this.out = KF.makeHi(VW, VH, HI()); const s = this.out.getContext('2d'); s.imageSmoothingEnabled = true;
      s.fillStyle = lin(s, 0, 0, 0, VH, [[0, '#90b8e0'], [0.6, '#d8e4e8'], [1, '#b8c8a8']]); s.fillRect(0, 0, VW, VH);
      this.hills = layer(800, VH, (x, r) => {
        x.fillStyle = 'rgba(110,150,120,0.8)'; x.beginPath(); x.moveTo(0, 120);
        for (let px = 0; px <= 800; px += 40) x.lineTo(px, 100 + Math.sin(px * 0.018) * 10 + r() * 6);
        x.lineTo(800, 200); x.lineTo(0, 200); x.fill();
        for (let px = 20; px < 800; px += 70 + r() * 40) { fillR(x, 'rgba(230,220,200,0.9)', px, 108, 16, 12); x.fillStyle = 'rgba(160,80,70,0.9)'; x.beginPath(); x.moveTo(px - 2, 108); x.lineTo(px + 8, 101); x.lineTo(px + 18, 108); x.fill(); }
      });
      // The carriage interior is a fixed frame: wall, windows, seats, grab handles.
      this.car = KF.makeHi(VW, VH, HI()); const c = this.car.getContext('2d'); c.imageSmoothingEnabled = true;
      c.fillStyle = lin(c, 0, 0, 0, 40, [[0, '#f0f0e8'], [1, '#c8c8c0']]); c.fillRect(0, 0, VW, 42);
      c.fillStyle = lin(c, 0, 128, 0, VH, [[0, '#8a8478'], [1, '#4a463e']]); c.fillRect(0, 128, VW, VH - 128);
      c.globalCompositeOperation = 'destination-out';
      for (let wx = 10; wx < VW; wx += 96) { rrect(c, wx, 46, 80, 78, 8); c.fill(); }
      c.globalCompositeOperation = 'source-over';
      c.fillStyle = lin(c, 0, 42, 0, 128, [[0, '#e8e4d8'], [1, '#b8b4a8']]);
      for (let wx = 0; wx < VW; wx += 96) { c.fillRect(wx - 6, 42, 16, 86); }
      for (let wx = 10; wx < VW; wx += 96) { c.strokeStyle = '#8a8a90'; c.lineWidth = 2; rrect(c, wx, 46, 80, 78, 8); c.stroke(); }
      for (let wx = 18; wx < VW; wx += 96) { // seats under the windows
        fillR(c, lin(c, 0, 132, 0, 160, [[0, '#4a6ab0'], [1, '#2a3a70']]), wx, 132, 64, 26, 4);
        c.fillStyle = 'rgba(255,255,255,0.15)'; c.fillRect(wx + 3, 134, 58, 2);
      }
      c.strokeStyle = '#b8bcc4'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, 30); c.lineTo(VW, 30); c.stroke();
      for (let hx = 30; hx < VW; hx += 48) { c.strokeStyle = '#d0d4dc'; c.lineWidth = 1; c.beginPath(); c.moveTo(hx, 30); c.lineTo(hx, 38); c.stroke(); c.beginPath(); c.arc(hx, 41, 3, 0, 7); c.stroke(); }
      c.fillStyle = '#fff8e0'; for (let lx = 40; lx < VW; lx += 110) fillR(c, '#fffbe8', lx, 16, 50, 4, 2);
    },
    background(ctx, cam, t, mood) {
      ctx.drawImage(this.out, 0, 0, VW, VH);
      scroll(ctx, this.hills, cam.x + t * 120, 0.2, 0);
      // poles whipping past the windows
      const off = (t * 520) % 140;
      for (let k = -1; k < 4; k++) { const px = k * 140 - off; ctx.fillStyle = 'rgba(70,60,60,0.65)'; ctx.fillRect(px, 40, 3, 100); ctx.fillRect(px - 10, 56, 24, 1.5); }
      ctx.drawImage(this.car, 0, 0, VW, VH);
      // passengers: seated silhouettes that jump on a death; lights flicker in tunnels
      const jump = Math.min(1, mood.cheer || 0) * 6;
      for (let k = 0; k < 4; k++) {
        const px = 36 + k * 96 + (k % 2) * 22, py = 132 - Math.abs(Math.sin(t * 10 + k)) * jump;
        fillR(ctx, ['#6a5a4a', '#3a3a4a', '#7a4a4a', '#4a5a6a'][k], px - 6, py - 14, 12, 16, 4);
        circle(ctx, '#e0b090', px, py - 18, 4.5);
        if (k === 1) fillR(ctx, '#f0ece0', px - 9, py - 12, 18, 9, 1); // newspaper
      }
      const tunnel = (t % 11) > 9.6;
      if (tunnel) { ctx.fillStyle = 'rgba(20,20,30,0.55)'; ctx.fillRect(0, 0, VW, VH); }
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid') { // ribbed rubber floor over the steel underframe
        slab(ctx, x, y, 16, 16, 'rgba(0,0,0,0)', '#7a8088', '#3a4048', 0);
        ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x, y + 8, 16, 1); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x, y + 9, 16, 1);
        circle(ctx, '#9aa0a8', x + 3, y + 12, 0.8); circle(ctx, '#9aa0a8', x + 13, y + 12, 0.8);
        if (e.t) {
          fillR(ctx, lin(ctx, 0, y, 0, y + 4, [[0, '#f0e8d0'], [1, '#a89c80']]), x, y, 16, 4);
          ctx.fillStyle = 'rgba(0,0,0,0.18)'; for (let k = 1; k < 16; k += 3) ctx.fillRect(x + k, y + 1, 1.2, 2.5);
          ctx.fillStyle = '#ffc020'; ctx.fillRect(x, y, 16, 1);
          ctx.fillStyle = '#1a1e24'; ctx.fillRect(x, y + 4, 16, 0.8);
        }
      } else if (art === 'alt') { // suitcase
        fillR(ctx, lin(ctx, x, 0, x + 16, 0, [[0, '#a85a3a'], [1, '#6a3020']]), x + 0.5, y + 3, 15, 13, 2);
        fillR(ctx, '#3a2018', x + 5, y, 6, 3.5, 1.5); ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x + 2, y + 5, 12, 1.2);
        ctx.fillStyle = '#d8b040'; ctx.fillRect(x + 3, y + 8, 2, 2); ctx.fillRect(x + 11, y + 8, 2, 2);
      } else if (art === 'ice') { // spilled soda
        fillR(ctx, lin(ctx, 0, y, 0, y + 16, [[0, '#d8c8a0'], [1, '#8a8470']]), x, y, 16, 16);
        ctx.fillStyle = 'rgba(120,60,20,0.65)'; ctx.beginPath(); ctx.ellipse(x + 8, y + 1.5, 7, 1.6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(x + 4, y + 0.8, 4, 0.6);
      } else { // luggage rack: chrome bars
        fillR(ctx, lin(ctx, 0, y, 0, y + 3, [[0, '#ffffff'], [1, '#8a90a0']]), x, y, 16, 2.5, 1);
        ctx.strokeStyle = 'rgba(150,155,170,0.8)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.lineTo(x + 16, y + 4); ctx.stroke();
      }
    },
    spike: spikes(['#ffffff', '#b8bcc8', '#6a7080'], ['#e83030', '#801010']),
    door: door({ frame: ['#c8ccd4', '#7a808a'], door: ['#e8a030', '#c07818', '#8a5010'] }),
    spring,
    sign: sign({ board: ['#ffffff', '#ececf0'], ink: '#1a4a9a', post: '#6a6a70' }),
  });

  // ======================================================================
  // The tape look, done on the GPU at screen resolution.
  // ======================================================================
  // Three full-screen passes per frame: the soft image, one colour-fringe layer (red smeared
  // right, blue left, plus a warm lift of the blacks) and a static overlay (scanlines and a lens
  // vignette). Everything else (tracking band, head noise, speckle) touches only small areas.
  let lo = null, q = null, qr = null, qb = null, fringe = null, noise = null, still = null;
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  function buffers(wc) {
    const W = Math.ceil(wc.width * 0.55), H = Math.ceil(wc.height * 0.55);
    if (lo && lo.width === W && lo.height === H) return;
    lo = canvas(W, H);
    const QW = Math.ceil(wc.width / 4), QH = Math.ceil(wc.height / 4);
    q = canvas(QW, QH); qr = canvas(QW, QH); qb = canvas(QW, QH); fringe = canvas(QW, QH);
    noise = canvas(320, 180);
    const nx = noise.getContext('2d'), r = U.rng(1996), img = nx.createImageData(320, 180);
    for (let k = 0; k < 320 * 180; k++) {
      const v = r(), o = k * 4;
      if (v < 0.03) { img.data[o] = img.data[o + 1] = img.data[o + 2] = 255; img.data[o + 3] = 210; } else if (v < 0.05) img.data[o + 3] = 170;
    }
    nx.putImageData(img, 0, 0);
    still = KF.makeHi(VW, VH, wc.width / VW); const sx = still.getContext('2d'); sx.imageSmoothingEnabled = true;
    sx.fillStyle = 'rgba(0,0,0,0.11)'; for (let y = 0; y < VH; y++) sx.fillRect(0, y + 0.55, VW, 0.4);
    sx.fillStyle = rad(sx, VW / 2, VH / 2, VH * 0.45, VW * 0.62, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(10,5,20,0.42)']]);
    sx.fillRect(0, 0, VW, VH);
  }
  // One colour channel of q, shifted by dx real pixels.
  function channel(dst, col, dx) {
    const x = dst.getContext('2d');
    x.globalCompositeOperation = 'copy'; x.drawImage(q, dx, 0);
    x.globalCompositeOperation = 'multiply'; x.fillStyle = col; x.fillRect(0, 0, dst.width, dst.height);
    x.globalCompositeOperation = 'destination-in'; x.drawImage(q, dx, 0);
    x.globalCompositeOperation = 'source-over';
  }
  function compose(ctx, wc, i) {
    buffers(wc);
    const t = i.t, k = wc.width / VW;
    const lx = lo.getContext('2d'); lx.imageSmoothingEnabled = true; lx.globalCompositeOperation = 'copy'; lx.drawImage(wc, 0, 0, lo.width, lo.height);
    const qx = q.getContext('2d'); qx.imageSmoothingEnabled = true; qx.globalCompositeOperation = 'copy'; qx.drawImage(lo, 0, 0, q.width, q.height);
    channel(qr, '#ff2a18', 0.45); channel(qb, '#1a48ff', -0.35);
    const fx = fringe.getContext('2d');
    fx.globalCompositeOperation = 'copy'; fx.fillStyle = 'rgba(26,18,24,1)'; fx.fillRect(0, 0, fringe.width, fringe.height); // warm lift of the blacks
    fx.globalCompositeOperation = 'lighter'; fx.globalAlpha = 0.16; fx.drawImage(qr, 0, 0); fx.globalAlpha = 0.12; fx.drawImage(qb, 0, 0);
    fx.globalAlpha = 1; fx.globalCompositeOperation = 'source-over';
    const sm = ctx.imageSmoothingEnabled;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(lo, 0, 0, VW, VH); // the soft tape picture
    ctx.globalCompositeOperation = 'screen'; ctx.drawImage(fringe, 0, 0, VW, VH);
    ctx.globalCompositeOperation = 'source-over';
    // Tracking band: a strip drifting down the picture, torn sideways.
    const by = ((t * 24) % (VH + 50)) - 25;
    for (let s = 0; s < 3; s++) {
      const y0 = by + s * 3, off = Math.sin(t * 37 + s * 2) * 3 + (U.hash2(Math.floor(t * 20), s) - 0.5) * 4;
      if (y0 < 0 || y0 > VH - 3) continue;
      ctx.drawImage(wc, 0, y0 * k, wc.width, 3 * k, off, y0, VW, 3);
    }
    ctx.globalAlpha = 0.25; ctx.drawImage(noise, (t * 997) % 200, 0, 120, 12, 0, by, VW, 9);
    // Head-switching noise along the bottom edge.
    ctx.globalAlpha = 1;
    const hy = VH - 5, hoff = 4 + Math.sin(t * 50) * 2;
    ctx.drawImage(lo, 0, hy * k * 0.55, lo.width, 5 * k * 0.55, hoff, hy, VW, 5);
    ctx.globalAlpha = 0.55; ctx.drawImage(noise, (t * 613) % 200, 100, 120, 8, 0, hy, VW, 5);
    // Tape speckle: a few dozen flecks, and the odd dropout line.
    ctx.globalAlpha = 0.5; ctx.fillStyle = '#ffffff';
    const f = Math.floor(t * 24);
    for (let n = 0; n < 36; n++) ctx.fillRect(U.hash2(f, n) * VW, U.hash2(n, f) * VH, 0.5 + U.hash2(f + n, 3), 0.4);
    ctx.globalAlpha = 1;
    if (U.hash2(Math.floor(t * 12), 7) < 0.12) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(U.hash2(Math.floor(t * 12), 9) * VW * 0.6, U.hash2(Math.floor(t * 12), 3) * VH, 40 + U.hash2(Math.floor(t * 12), 4) * 90, 0.6); }
    ctx.drawImage(still, 0, 0, VW, VH); // scanlines + lens vignette
    ctx.restore();
    ctx.imageSmoothingEnabled = sm;
  }

  // Camcorder OSD in smooth type, clear of the HUD strip (levels) and the fight meters. Text gets
  // a dark copy one step down-right instead of a canvas shadow (much cheaper).
  function txt(ctx, text, x, y, col) { ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillText(text, x + 0.6, y + 0.6); ctx.fillStyle = col; ctx.fillText(text, x, y); }
  function osd(ctx, i) {
    const t = i.t, s = Math.floor(t), blink = Math.floor(t * 1.5) % 2 === 0;
    const tc = `0:${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    ctx.save();
    ctx.font = 'bold 7.5px "Courier New", monospace'; ctx.textBaseline = 'top';
    if (i.fight) { // fights: one line, bottom centre between the special meters
      ctx.textAlign = 'center'; txt(ctx, `REC   SP ${tc}`, VW / 2 + 4, VH - 14, '#ffffff');
      if (blink) circle(ctx, '#ff2a2a', VW / 2 - 40, VH - 10.5, 2.6);
    } else {
      ctx.textAlign = 'right';
      txt(ctx, 'REC', VW - 14, 22, '#ffffff');
      if (blink) circle(ctx, '#ff2a2a', VW - 34, 25.5, 2.8);
      txt(ctx, `SP ${tc}`, VW - 14, 32, '#ffffff');
      txt(ctx, 'JUL 14 1996', VW - 14, VH - 16, '#ffb040');
      const bly = VH - 17; // battery, bottom left (the VHS death card uses the top left)
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.8; rrect(ctx, 14, bly, 16, 7, 1); ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(30, bly + 2, 1.5, 3); ctx.fillRect(15.5, bly + 1.5, 9, 4);
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 0.6;
      ctx.beginPath();
      for (const [cx, cy, dx, dy] of [[10, 20, 1, 1], [VW - 10, 20, -1, 1], [10, VH - 8, 1, -1], [VW - 10, VH - 8, -1, -1]]) {
        ctx.moveTo(cx + dx * 10, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + dy * 8);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  // theme: the place a VHS fight uses when none is given (e.g. Street Arena).
  Object.assign(KF.Styles.all.vhs, { smooth: true, vecLook: 'video', theme: 'vhs_backyard', compose, overlay: osd });
})(window.KF);
