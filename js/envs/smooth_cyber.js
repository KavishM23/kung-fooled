'use strict';
// Smooth (non-pixel) places for the CYBER realm, drawn with paths and gradients at the screen's
// resolution: a neon megacity in the rain, a district made of holograms, a Y2K chrome arcade and
// the data core at the heart of the net. Blocks are seen side-on with a lit top surface and a
// bevelled front, so the flat side view still reads as solid 3D metal and glass.
// The realm's style (cyberpunk) gets GPU-side effects: neon bloom, fog, rain and fine scanlines.
(function (KF) {
  const { tiled, wrapX } = KF.ThemeKit;
  const U = KF.util, VW = KF.VIEW_W, VH = KF.VIEW_H;

  // ---------- helpers ----------
  const mk = (w, h) => { const c = KF.makeHi(w, h, KF.HI_MAX), x = c.getContext('2d'); x.imageSmoothingEnabled = true; return c; };
  const grad = (ctx, x0, y0, x1, y1, stops) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); for (const [o, c] of stops) g.addColorStop(o, c); return g; };
  const box = (ctx, fill, x, y, w, h) => { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); };
  const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
  const text = (ctx, str, x, y, size, col, align = 'center', weight = 'bold') => {
    ctx.font = `${weight} ${size}px "Arial Narrow", "Helvetica Neue", Arial, sans-serif`;
    ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = col; ctx.fillText(str, x, y);
  };
  // Soft glow: a few widening translucent copies of a rectangle.
  const glow = (ctx, col, x, y, w, h, a = 0.5, spread = 3) => {
    ctx.fillStyle = col;
    for (let k = 3; k >= 1; k--) { ctx.globalAlpha = a * 0.18 * (4 - k); const s = spread * k / 3; ctx.fillRect(x - s, y - s, w + 2 * s, h + 2 * s); }
    ctx.globalAlpha = 1;
  };
  const disc = (ctx, x, y, r, fill) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
  const radial = (ctx, x, y, r, stops) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); for (const [o, c] of stops) g.addColorStop(o, c); return g; };

  // A solid block seen side-on: lit top surface, front face gradient, bevelled exposed sides, a
  // trim light along the top edge you stand on. p: { face: [top, bottom], top: [back, front],
  // side, under, trim, seam }.
  function block(ctx, x, y, e, p, seed) {
    ctx.fillStyle = grad(ctx, 0, y, 0, y + 16, [[0, p.face[0]], [1, p.face[1]]]);
    ctx.fillRect(x, y, 16, 16);
    if (p.seam) { // panel seams and rivets
      box(ctx, p.seam, x, y + 9.2, 16, 0.4);
      box(ctx, p.seam, x + (seed < 0.5 ? 7.8 : 11.8), y + 9.6, 0.4, 6.4);
      if (seed > 0.3) { disc(ctx, x + 2.2, y + 12.6, 0.45, p.seam); disc(ctx, x + 13.8, y + 12.6, 0.45, p.seam); }
    }
    if (e.l) { ctx.fillStyle = grad(ctx, x, 0, x + 2.2, 0, [[0, p.side], [1, 'rgba(0,0,0,0)']]); ctx.fillRect(x, y, 2.2, 16); }
    if (e.r) { ctx.fillStyle = grad(ctx, x + 16, 0, x + 13.8, 0, [[0, p.side], [1, 'rgba(0,0,0,0)']]); ctx.fillRect(x + 13.8, y, 2.2, 16); }
    if (e.b) { ctx.fillStyle = grad(ctx, 0, y + 16, 0, y + 13, [[0, p.under], [1, 'rgba(0,0,0,0)']]); ctx.fillRect(x, y + 13, 16, 3); }
    if (e.t) {
      ctx.fillStyle = grad(ctx, 0, y, 0, y + 3.6, [[0, p.top[0]], [1, p.top[1]]]);
      ctx.fillRect(x, y, 16, 3.6);
      box(ctx, 'rgba(0,0,0,0.35)', x, y + 3.6, 16, 0.6); // the lip's shadow on the front face
      if (p.trim) { box(ctx, p.trim, x, y, 16, 0.9); ctx.globalAlpha = 0.35; box(ctx, p.trim, x, y - 1.2, 16, 1.2); ctx.globalAlpha = 1; }
    }
  }
  function oneway(ctx, x, y, col, core) { // a thin light bridge
    ctx.globalAlpha = 0.3; box(ctx, col, x, y - 1, 16, 4.6); ctx.globalAlpha = 1;
    ctx.fillStyle = grad(ctx, 0, y, 0, y + 3.2, [[0, core], [0.35, col], [1, 'rgba(0,0,0,0.2)']]);
    ctx.fillRect(x, y, 16, 3.2);
    for (let i = 1.5; i < 16; i += 3.5) box(ctx, 'rgba(255,255,255,0.35)', x + i, y + 0.9, 1.4, 1.4);
  }
  // Red energy prongs, two per tile, tips 10px above the base like every other spike set.
  function spikes(ctx, x, y, dir, base = '#3a0010') {
    const rot = { up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 }[dir] || 0;
    ctx.save(); ctx.translate(x + 8, y + 8); ctx.rotate(rot); ctx.translate(-8, -8);
    for (const ox of [0, 8]) {
      ctx.globalAlpha = 0.35; ctx.fillStyle = '#ff2050';
      ctx.beginPath(); ctx.moveTo(ox + 0, 16); ctx.lineTo(ox + 4, 4.5); ctx.lineTo(ox + 8, 16); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = grad(ctx, 0, 6, 0, 16, [[0, '#ffffff'], [0.25, '#ff6a8a'], [0.7, '#e0103a'], [1, '#6a0018']]);
      ctx.beginPath(); ctx.moveTo(ox + 1.2, 16); ctx.lineTo(ox + 4, 6); ctx.lineTo(ox + 6.8, 16); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.moveTo(ox + 3.4, 15); ctx.lineTo(ox + 4, 7.5); ctx.lineTo(ox + 4.4, 15); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = grad(ctx, 0, 14, 0, 16, [[0, '#ff2a5a'], [1, base]]); ctx.fillRect(0, 14.4, 16, 1.6);
    ctx.restore();
  }
  // Sliding blast door with a glowing exit beacon; the real one has the beacon.
  function door(accent) {
    return function (ctx, x, y, o = {}) {
      ctx.save();
      if (o.flipped) { ctx.translate(0, y * 2 + 32); ctx.scale(1, -1); }
      if (o.legs) { // the door runs away on two little servo legs
        const k = Math.floor(o.legs * 12) % 2;
        for (const [lx, up] of [[x + 3.5, k], [x + 10.5, 1 - k]]) {
          ctx.strokeStyle = '#8a90a8'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(lx + 1, y + 31); ctx.lineTo(lx + (up ? 2.5 : -0.5), y + 33); ctx.lineTo(lx + 1, y + 35 - up); ctx.stroke();
        }
      }
      rr(ctx, x - 1.5, y + 1, 19, 31.5, 2.5); ctx.fillStyle = grad(ctx, x, 0, x + 16, 0, [[0, '#2a2e40'], [0.5, '#4a5068'], [1, '#1a1c2a']]); ctx.fill();
      const open = o.open || 0, pw = 6.5 * (1 - open);
      rr(ctx, x + 1.5, y + 4, 13, 28, 1); ctx.fillStyle = '#05060c'; ctx.fill();
      if (open > 0) {
        ctx.fillStyle = grad(ctx, 0, y + 4, 0, y + 32, [[0, 'rgba(255,255,255,0.95)'], [1, accent]]);
        ctx.globalAlpha = 0.4 + 0.6 * open; ctx.fillRect(x + 1.5 + pw, y + 4, 13 - pw * 2, 28); ctx.globalAlpha = 1;
      }
      for (const side of [0, 1]) { // the two halves
        const px = side ? x + 14.5 - pw : x + 1.5;
        ctx.fillStyle = grad(ctx, 0, y + 4, 0, y + 32, [[0, '#5a6280'], [1, '#2a2e44']]);
        ctx.fillRect(px, y + 4, pw, 28);
        if (pw > 1) { box(ctx, accent, side ? px + 0.3 : px + pw - 0.9, y + 6, 0.6, 24); for (let k = 0; k < 4; k++) box(ctx, 'rgba(0,0,0,0.35)', px + 0.6, y + 9 + k * 6, pw - 1.2, 0.5); }
      }
      ctx.strokeStyle = accent; ctx.lineWidth = 0.7; rr(ctx, x - 1.5, y + 1, 19, 31.5, 2.5); ctx.stroke();
      if (o.lantern) { // beacon ring above the real exit
        const p = 0.6 + 0.4 * Math.sin((o.t || 0) * 4);
        ctx.fillStyle = radial(ctx, x + 8, y - 5, 10, [[0, accent], [1, 'rgba(0,0,0,0)']]);
        ctx.globalAlpha = 0.5 * p; ctx.fillRect(x - 4, y - 17, 24, 24); ctx.globalAlpha = 1;
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x + 8, y - 5, 5, 2.2, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = accent; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.ellipse(x + 8, y - 5, 6.5, 3, 0, 0, Math.PI * 2); ctx.stroke();
        text(ctx, 'EXIT', x + 8, y - 11, 4, '#ffffff');
      }
      ctx.restore();
    };
  }
  // Magnetic jump pad.
  function spring(accent) {
    return function (ctx, x, y, squash) {
      const h = 5 - squash * 3.2;
      rr(ctx, x + 1, y + 12.5, 14, 3.5, 1.2); ctx.fillStyle = grad(ctx, 0, y + 12.5, 0, y + 16, [[0, '#4a5068'], [1, '#14161f']]); ctx.fill();
      ctx.globalAlpha = 0.45; ctx.fillStyle = accent; ctx.fillRect(x + 3, y + 16 - h - 2, 10, h + 1); ctx.globalAlpha = 1;
      for (let k = 0; k < 3; k++) box(ctx, accent, x + 3.5, y + 13 - k * (h / 3), 9, 0.5);
      rr(ctx, x + 1.5, y + 16 - h - 4.5, 13, 2.4, 1.2); ctx.fillStyle = grad(ctx, 0, y + 16 - h - 4.5, 0, y + 16 - h - 2, [[0, '#ffffff'], [1, accent]]); ctx.fill();
    };
  }
  // Holo sign on a thin post.
  function sign(border, ink) {
    return function (ctx, x, y, str) {
      ctx.font = 'bold 6px "Arial Narrow", "Helvetica Neue", Arial, sans-serif';
      const w = ctx.measureText(str).width + 8, bx = x - w / 2;
      box(ctx, '#2a3048', x - 0.5, y + 10, 1, 8);
      glow(ctx, border, bx, y - 1, w, 11, 0.4, 2);
      rr(ctx, bx, y - 1, w, 11, 2); ctx.fillStyle = 'rgba(8,6,20,0.88)'; ctx.fill();
      ctx.strokeStyle = border; ctx.lineWidth = 0.6; ctx.stroke();
      text(ctx, str, x, y + 4.6, 6, ink);
    };
  }

  // Small pre-drawn sprites reused every frame (cheaper than building gradients per frame).
  const sprites = {};
  function sprite(key, w, h, draw) { if (!sprites[key]) { const c = mk(w, h); draw(c.getContext('2d')); sprites[key] = c; } return sprites[key]; }
  const streak = (col) => sprite('streak' + col, 18, 1, (x) => { x.fillStyle = grad(x, 0, 0, 18, 0, [[0, 'rgba(0,0,0,0)'], [0.5, col], [1, 'rgba(0,0,0,0)']]); x.fillRect(0, 0, 18, 1); });
  const puff = () => sprite('puff', 32, 32, (x) => { x.fillStyle = radial(x, 16, 16, 16, [[0, 'rgba(216,192,255,1)'], [1, 'rgba(216,192,255,0)']]); x.fillRect(0, 0, 32, 32); });

  // =====================================================================================
  // 1. NEON MEGACITY: rain, holo-ads, flying cars, towers without tops.
  // =====================================================================================
  const ADS = [['SYNTH', 'RAMEN'], ['BUY', '.EXE'], ['CHROME', 'ARMS'], ['SLEEP IS', 'OPTIONAL'], ['NEURAL', 'LINK'], ['KUNG FU', '.DLL'], ['NO', 'REFUNDS']];
  KF.Themes.add('cyber_megacity', {
    id: 'cyber_megacity', title: 'NEON MEGACITY', name: 'MEGACITY', bg: '#06020e', bloom: 0.5,
    signBoard: '#10081e', signInk: '#ff4ad8', signPost: '#2a1a40', signShade: '#4af0ff',
    zone: { gravity: '#4af0ff', reverse: '#ff4ad8' },
    build() {
      const rnd = U.rng(2099);
      this.sky = mk(VW, VH);
      const s = this.sky.getContext('2d');
      s.fillStyle = grad(s, 0, 0, 0, VH, [[0, '#04010c'], [0.35, '#0e0424'], [0.7, '#2a0a40'], [1, '#5a1450']]); s.fillRect(0, 0, VW, VH);
      s.fillStyle = radial(s, 290, 40, 26, [[0, 'rgba(255,190,240,0.9)'], [0.5, 'rgba(255,120,220,0.25)'], [1, 'rgba(0,0,0,0)']]); s.fillRect(250, 0, 80, 80);
      s.strokeStyle = 'rgba(255,160,240,0.35)'; s.lineWidth = 0.6; s.beginPath(); s.ellipse(290, 40, 20, 5, -0.25, 0, Math.PI * 2); s.stroke();
      // Far: megastructures fading into fog.
      this.far = mk(720, VH); this.strips = [];
      const f = this.far.getContext('2d');
      for (let x = 0; x < 720;) {
        const w = 24 + rnd() * 36, top = 8 + rnd() * 80;
        f.fillStyle = grad(f, x, 0, x + w, 0, [[0, '#1e1442'], [0.6, '#160e32'], [1, '#0e0822']]);
        f.beginPath(); f.moveTo(x, VH); f.lineTo(x, top + 6); f.lineTo(x + w * 0.3, top); f.lineTo(x + w, top + 3); f.lineTo(x + w, VH); f.fill();
        for (let wy = top + 8; wy < VH; wy += 4.5) for (let wx = x + 3; wx < x + w - 3; wx += 3.2) {
          const r = rnd(); if (r < 0.15) { f.fillStyle = r < 0.03 ? 'rgba(255,190,120,0.8)' : 'rgba(150,110,230,0.45)'; f.fillRect(wx, wy, 1.4, 1.8); }
        }
        if (rnd() < 0.6) this.strips.push({ x: x + 3 + rnd() * (w - 6), top: top + 4, col: rnd() < 0.5 ? '#ff3ad0' : '#3af0ff', ph: rnd() * 9 });
        if (rnd() < 0.35) { f.fillStyle = '#160e32'; f.fillRect(x + w * 0.3 - 0.5, top - 20, 1, 20); }
        x += w + rnd() * 8;
      }
      f.fillStyle = grad(f, 0, 60, 0, VH, [[0, 'rgba(90,30,130,0)'], [1, 'rgba(110,40,140,0.55)']]); f.fillRect(0, 60, 720, VH - 60);
      // Mid: closer blocks carrying holo billboards, pipes, balconies.
      this.mid = mk(800, VH); this.boards = [];
      const m = this.mid.getContext('2d');
      for (let x = 0; x < 800;) {
        const w = 46 + rnd() * 50, top = 86 + rnd() * 40;
        m.fillStyle = grad(m, x, 0, x + w, 0, [[0, '#120a24'], [1, '#08040f']]); m.fillRect(x, top, w, VH - top);
        m.fillStyle = 'rgba(255,255,255,0.08)'; m.fillRect(x, top, w, 0.8);
        for (let wy = top + 6; wy < VH; wy += 8) {
          m.fillStyle = 'rgba(0,0,0,0.5)'; m.fillRect(x + 2, wy + 4, w - 4, 0.8); // balcony rails
          for (let wx = x + 5; wx < x + w - 5; wx += 7) if (rnd() < 0.25) { m.fillStyle = rnd() < 0.3 ? 'rgba(255,170,90,0.55)' : 'rgba(120,80,200,0.4)'; m.fillRect(wx, wy, 3.4, 2.4); }
        }
        m.strokeStyle = 'rgba(80,60,120,0.6)'; m.lineWidth = 0.8; m.beginPath(); m.moveTo(x + w - 3, top); m.lineTo(x + w - 3, VH); m.stroke(); // drainpipe
        if (rnd() < 0.75) {
          const bw = Math.min(w - 8, 32 + rnd() * 28), bh = 16 + rnd() * 12;
          this.boards.push({ x: x + 4, y: top - bh - 10, w: bw, h: bh, ad: Math.floor(rnd() * ADS.length), col: ['#ff3ad0', '#3af0ff', '#ffd040', '#7aff5a'][Math.floor(rnd() * 4)], ph: rnd() * 9 });
          m.fillStyle = '#0a0616'; m.fillRect(x + 4 + bw / 2 - 1, top - 10, 2, 10);
        }
        x += w + 10 + rnd() * 16;
      }
      this.cars = [];
      for (let i = 0; i < 7; i++) this.cars.push({ y: 26 + rnd() * 74, sp: (rnd() < 0.5 ? -1 : 1) * (40 + rnd() * 60), ph: rnd() * 1000, par: 0.18 + rnd() * 0.25, col: rnd() < 0.5 ? '#3af0ff' : '#ff3ad0' });
    },
    background(ctx, cam, t, mood) {
      KF.blit(ctx, this.sky, 0, 0);
      tiled(ctx, this.far, cam.x, 0.08, -4);
      for (const s of this.strips) { // neon strips pulse up the towers
        const x = wrapX(s.x, cam.x, 0.08, 720) + 24;
        if (x < -4 || x > VW + 4) continue;
        const a = 0.45 + 0.3 * Math.sin(t * 2 + s.ph);
        glow(ctx, s.col, x - 0.4, s.top, 0.8, VH - s.top, a * 0.6, 2.5);
        ctx.globalAlpha = a; box(ctx, s.col, x - 0.4, s.top, 0.8, VH - s.top); ctx.globalAlpha = 1;
        const py = s.top + ((t * 40 + s.ph * 20) % (VH - s.top));
        box(ctx, '#ffffff', x - 0.5, py, 1, 4);
      }
      for (const c of this.cars) { // flying cars with headlight cones
        const span = VW + 80, x = ((((c.ph + t * c.sp) - cam.x * c.par) % span) + span) % span - 40, d = Math.sign(c.sp);
        ctx.fillStyle = grad(ctx, 0, c.y - 2, 0, c.y + 2, [[0, 'rgba(255,240,200,0.25)'], [1, 'rgba(255,240,200,0)']]);
        ctx.beginPath(); ctx.moveTo(x + (d > 0 ? 12 : 0), c.y); ctx.lineTo(x + (d > 0 ? 34 : -22), c.y - 4); ctx.lineTo(x + (d > 0 ? 34 : -22), c.y + 4); ctx.fill();
        rr(ctx, x, c.y - 1.6, 12, 3.4, 1.7); ctx.fillStyle = grad(ctx, 0, c.y - 1.6, 0, c.y + 1.8, [[0, '#4a3a70'], [1, '#120a22']]); ctx.fill();
        rr(ctx, x + 3, c.y - 1.2, 6, 1.2, 0.6); ctx.fillStyle = c.col; ctx.fill();
        disc(ctx, d > 0 ? x + 0.6 : x + 11.4, c.y + 0.2, 0.7, '#ff3040');
      }
      tiled(ctx, this.mid, cam.x, 0.25);
      for (const b of this.boards) {
        const x = wrapX(b.x, cam.x, 0.25, 800) + 24;
        if (x < -b.w - 4 || x > VW + 4) continue;
        const glitch = Math.sin(t * 9 + b.ph) > 0.95 || (mood.cheer > 0.6 && Math.sin(t * 30 + b.ph) > 0);
        const ad = ADS[(b.ad + Math.floor((t + b.ph) / 4)) % ADS.length], ox = glitch ? 1.5 : 0;
        glow(ctx, b.col, x, b.y, b.w, b.h, 0.45, 4);
        rr(ctx, x, b.y, b.w, b.h, 1.5); ctx.fillStyle = 'rgba(8,4,20,0.9)'; ctx.fill();
        ctx.strokeStyle = b.col; ctx.lineWidth = 0.7; ctx.stroke();
        text(ctx, ad[0], x + b.w / 2 + ox, b.y + b.h * 0.34, Math.min(7, b.h * 0.34), glitch ? '#ffffff' : b.col);
        text(ctx, ad[1], x + b.w / 2 - ox, b.y + b.h * 0.72, Math.min(6, b.h * 0.28), '#ffffff');
        const sy = b.y + ((t * 12 + b.ph * 5) % b.h); ctx.globalAlpha = 0.25; box(ctx, '#ffffff', x + 1, sy, b.w - 2, 0.6); ctx.globalAlpha = 1;
      }
      // The wet street far below catches the neon.
      ctx.fillStyle = grad(ctx, 0, 148, 0, VH, [[0, '#0a0418'], [1, '#020106']]); ctx.fillRect(0, 148, VW, VH - 148);
      for (let i = 0; i < 18; i++) {
        const x = ((i * 53 - cam.x * 0.5) % (VW + 40) + VW + 40) % (VW + 40) - 20;
        ctx.globalAlpha = 0.25 + 0.15 * Math.sin(t * 3 + i);
        ctx.drawImage(streak(i % 2 ? '#ff3ad0' : '#3af0ff'), x, 156 + (i % 5) * 9, 18, 0.8);
      }
      ctx.globalAlpha = 1;
      for (let i = 0; i < 4; i++) { // steam from street vents
        const x = ((i * 113 - cam.x * 0.6) % (VW + 60) + VW + 60) % (VW + 60) - 30;
        for (let k = 0; k < 4; k++) {
          const p = (t * 0.4 + k / 4 + i * 0.3) % 1, r = 5 + p * 12;
          ctx.globalAlpha = 0.16 * (1 - p);
          ctx.drawImage(puff(), x + Math.sin(p * 6 + i) * 4 - r, 172 - p * 52 - r, r * 2, r * 2);
        }
      }
      ctx.globalAlpha = 1;
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'oneway') return oneway(ctx, x, y, '#3af0ff', '#e8fdff');
      if (art === 'alt') { // cargo container with hazard stripes
        block(ctx, x, y, e, { face: ['#4a2468', '#22102e'], top: ['#9a6ac8', '#5a3480'], side: 'rgba(0,0,0,0.5)', under: 'rgba(0,0,0,0.5)', trim: null }, seed);
        for (let i = 1; i < 16; i += 3) box(ctx, 'rgba(0,0,0,0.28)', x + i, y + 4.5, 1.2, 8);
        ctx.save(); ctx.beginPath(); ctx.rect(x, y + 12.5, 16, 2.4); ctx.clip();
        for (let i = -4; i < 18; i += 4) { ctx.fillStyle = '#ffd040'; ctx.beginPath(); ctx.moveTo(x + i, y + 15); ctx.lineTo(x + i + 2, y + 12.5); ctx.lineTo(x + i + 4, y + 12.5); ctx.lineTo(x + i + 2, y + 15); ctx.fill(); }
        ctx.restore();
        return;
      }
      if (art === 'ice') { // slick black glass
        block(ctx, x, y, e, { face: ['#123a5a', '#06121e'], top: ['#d8f8ff', '#3a8ab0'], side: 'rgba(0,0,0,0.5)', under: 'rgba(0,0,0,0.5)', trim: '#bff4ff' }, seed);
        ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.moveTo(x + 3, y + 16); ctx.lineTo(x + 9, y + 4); ctx.lineTo(x + 12, y + 4); ctx.lineTo(x + 6, y + 16); ctx.fill();
        return;
      }
      block(ctx, x, y, e, { face: ['#221a3a', '#0c0818'], top: ['#6a5a98', '#2e2450'], side: 'rgba(0,0,0,0.55)', under: 'rgba(0,0,0,0.6)', trim: seed < 0.5 ? '#ff4ad8' : '#4af0ff', seam: 'rgba(0,0,0,0.45)' }, seed);
      if (seed > 0.82) { box(ctx, 'rgba(255,74,216,0.6)', x + 2, y + 6, 4, 0.8); }
    },
    spike: (ctx, x, y, dir) => spikes(ctx, x, y, dir),
    door: door('#3af0ff'),
    spring: spring('#ff4ad8'),
    sign: sign('#ff4ad8', '#ffd8f6'),
  });

  // =====================================================================================
  // 2. HOLO DISTRICT: a city made of light. Wireframe towers, scan beams, projected floors.
  // =====================================================================================
  const H1 = '#5af4ff';
  KF.Themes.add('cyber_hologram', {
    id: 'cyber_hologram', title: 'HOLO DISTRICT', name: 'HOLO', bg: '#010409', bloom: 0.55,
    signBoard: '#031420', signInk: H1, signPost: '#0a3040',
    zone: { gravity: '#7af0ff', reverse: '#ff6ad8' },
    build() {
      const rnd = U.rng(77);
      this.sky = mk(VW, VH);
      const s = this.sky.getContext('2d');
      s.fillStyle = grad(s, 0, 0, 0, VH, [[0, '#000208'], [0.6, '#031426'], [1, '#062a40']]); s.fillRect(0, 0, VW, VH);
      // Far: wireframe towers.
      this.far = mk(720, VH);
      const f = this.far.getContext('2d');
      for (let x = 0; x < 720;) {
        const w = 26 + rnd() * 40, top = 20 + rnd() * 90, a = 0.18 + rnd() * 0.2;
        f.fillStyle = `rgba(60,200,255,${a * 0.2})`; f.fillRect(x, top, w, VH - top);
        f.strokeStyle = `rgba(90,240,255,${a + 0.15})`; f.lineWidth = 0.5; f.strokeRect(x + 0.25, top + 0.25, w - 0.5, VH - top);
        f.strokeStyle = `rgba(90,240,255,${a * 0.6})`; f.beginPath();
        for (let yy = top + 6; yy < VH; yy += 6) { f.moveTo(x, yy); f.lineTo(x + w, yy); }
        for (let xx = x + 8; xx < x + w; xx += 8) { f.moveTo(xx, top); f.lineTo(xx, VH); }
        f.stroke();
        if (rnd() < 0.5) { f.strokeStyle = `rgba(255,120,220,${a + 0.2})`; f.beginPath(); f.moveTo(x + w / 2, top); f.lineTo(x + w / 2, top - 16); f.stroke(); }
        x += w + 8 + rnd() * 18;
      }
      this.koi = [];
      for (let i = 0; i < 4; i++) this.koi.push({ ph: rnd() * 9, y: 30 + rnd() * 70, sp: 14 + rnd() * 10, col: i % 2 ? '#ff8ad8' : '#8af4ff' });
    },
    background(ctx, cam, t, mood) {
      KF.blit(ctx, this.sky, 0, 0);
      tiled(ctx, this.far, cam.x, 0.12, 0);
      // Perspective floor grid rushing past under the city.
      ctx.strokeStyle = 'rgba(90,240,255,0.25)'; ctx.lineWidth = 0.5; ctx.beginPath();
      const hz = 150, ox = (cam.x * 0.4) % 24;
      for (let i = -12; i <= 28; i++) { const xb = i * 24 - ox; ctx.moveTo(VW / 2 + (xb - VW / 2) * 0.15, hz); ctx.lineTo(xb, VH); }
      for (let k = 0; k < 8; k++) { const p = ((k + (t * 0.6) % 1) / 8), y = hz + (VH - hz) * p * p; ctx.moveTo(0, y); ctx.lineTo(VW, y); }
      ctx.stroke();
      // Holo koi swimming through the air.
      for (const k of this.koi) {
        const x = ((k.ph * 60 + t * k.sp - cam.x * 0.2) % (VW + 80) + VW + 80) % (VW + 80) - 40, y = k.y + Math.sin(t + k.ph) * 4, w = Math.sin(t * 5 + k.ph) * 1.5;
        ctx.strokeStyle = k.col; ctx.lineWidth = 0.7; ctx.globalAlpha = 0.7;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + 5, y - 4, x + 12, y - 3, x + 16, y + w); ctx.bezierCurveTo(x + 12, y + 3, x + 5, y + 4, x, y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + 16, y + w); ctx.lineTo(x + 21, y - 3 + w); ctx.lineTo(x + 20, y + w); ctx.lineTo(x + 21, y + 3 + w); ctx.closePath(); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      // A slowly turning holo diamond over the district.
      const dx = 300 - ((cam.x * 0.1) % (VW + 100)), dy = 48 + Math.sin(t) * 3, a = t * 0.8, rw = 12 * Math.cos(a);
      ctx.strokeStyle = mood.cheer > 0.5 ? '#ff6ad8' : H1; ctx.lineWidth = 0.7; ctx.beginPath();
      for (const [px, py] of [[dx, dy - 16], [dx, dy + 16]]) { ctx.moveTo(px, py); ctx.lineTo(dx - 12, dy); ctx.moveTo(px, py); ctx.lineTo(dx + 12, dy); ctx.moveTo(px, py); ctx.lineTo(dx + rw, dy); }
      ctx.moveTo(dx - 12, dy); ctx.lineTo(dx + 12, dy); ctx.stroke();
      // Scan beam sweeping across.
      const sx = ((t * 60) % (VW + 120)) - 60;
      ctx.fillStyle = grad(ctx, sx - 30, 0, sx + 30, 0, [[0, 'rgba(90,240,255,0)'], [0.5, 'rgba(90,240,255,0.12)'], [1, 'rgba(90,240,255,0)']]); ctx.fillRect(sx - 30, 0, 60, VH);
    },
    tile(ctx, x, y, art, e, seed) {
      const cyan = art === 'alt' ? 'rgba(255,110,220,' : art === 'ice' ? 'rgba(220,250,255,' : 'rgba(90,240,255,';
      if (art === 'oneway') return oneway(ctx, x, y, 'rgba(90,240,255,0.8)', '#ffffff');
      ctx.fillStyle = grad(ctx, 0, y, 0, y + 16, [[0, cyan + '0.32)'], [1, cyan + '0.1)']]); ctx.fillRect(x, y, 16, 16);
      ctx.strokeStyle = cyan + '0.2)'; ctx.lineWidth = 0.35; ctx.beginPath(); // inner projection grid
      for (let k = 4; k < 16; k += 4) { ctx.moveTo(x, y + k); ctx.lineTo(x + 16, y + k); ctx.moveTo(x + k, y); ctx.lineTo(x + k, y + 16); }
      ctx.stroke();
      ctx.strokeStyle = cyan + '0.95)'; ctx.lineWidth = 0.7; ctx.beginPath();
      if (e.t) { ctx.moveTo(x, y + 0.35); ctx.lineTo(x + 16, y + 0.35); }
      if (e.b) { ctx.moveTo(x, y + 15.65); ctx.lineTo(x + 16, y + 15.65); }
      if (e.l) { ctx.moveTo(x + 0.35, y); ctx.lineTo(x + 0.35, y + 16); }
      if (e.r) { ctx.moveTo(x + 15.65, y); ctx.lineTo(x + 15.65, y + 16); }
      ctx.stroke();
      if (e.t) { ctx.fillStyle = grad(ctx, 0, y, 0, y + 3.5, [[0, cyan + '0.7)'], [1, cyan + '0.15)']]); ctx.fillRect(x, y, 16, 3.5); ctx.globalAlpha = 0.35; box(ctx, '#ffffff', x, y, 16, 0.6); ctx.globalAlpha = 1; }
      if (art === 'alt') text(ctx, '?', x + 8, y + 9, 9, 'rgba(255,200,240,0.8)');
    },
    spike: (ctx, x, y, dir) => spikes(ctx, x, y, dir, '#3a0020'),
    door: door(H1),
    spring: spring(H1),
    sign: sign(H1, '#dffcff'),
  });

  // =====================================================================================
  // 3. CHROME ARCADE: Y2K liquid metal, candy plastic and a giant chrome 2000.
  // =====================================================================================
  const CHROME = [[0, '#ffffff'], [0.3, '#b8c8e4'], [0.48, '#3a4868'], [0.54, '#e8f0ff'], [0.75, '#8a9ab8'], [1, '#4a5878']];
  KF.Themes.add('cyber_chrome', {
    id: 'cyber_chrome', title: 'CHROME ARCADE', name: 'CHROME', bg: '#c8d0f0', bloom: 0.12,
    signBoard: '#e8f0ff', signInk: '#3a2a8a', signPost: '#8a9ab8',
    zone: { gravity: '#5a7aff', reverse: '#ff3ab0' },
    build() {
      const rnd = U.rng(2000);
      this.sky = mk(VW, VH);
      const s = this.sky.getContext('2d');
      s.fillStyle = grad(s, 0, 0, 0, VH, [[0, '#9aa8ff'], [0.45, '#e8e4ff'], [0.7, '#ffe0f4'], [1, '#c0e8ff']]); s.fillRect(0, 0, VW, VH);
      s.fillStyle = radial(s, 70, 40, 60, [[0, 'rgba(255,255,255,0.9)'], [1, 'rgba(255,255,255,0)']]); s.fillRect(0, 0, 140, 110);
      // Far: a giant chrome 2000 and translucent candy towers.
      this.far = mk(720, VH);
      const f = this.far.getContext('2d');
      for (let x = 10; x < 720;) {
        const w = 26 + rnd() * 30, top = 60 + rnd() * 60, col = ['rgba(255,110,200,0.28)', 'rgba(120,255,160,0.25)', 'rgba(120,170,255,0.3)'][Math.floor(rnd() * 3)];
        rr(f, x, top, w, VH - top, 6); f.fillStyle = col; f.fill();
        f.fillStyle = 'rgba(255,255,255,0.4)'; f.fillRect(x + 4, top + 6, 2.5, VH - top - 10);
        x += w + 20 + rnd() * 30;
      }
      f.save(); f.font = 'italic 900 64px "Arial Black", Arial, sans-serif'; f.textAlign = 'center'; f.textBaseline = 'alphabetic';
      for (const cx of [180, 540]) {
        f.lineWidth = 3; f.strokeStyle = '#2a3050'; f.strokeText('2000', cx, 120);
        f.fillStyle = grad(f, 0, 70, 0, 120, CHROME); f.fillText('2000', cx, 120);
      }
      f.restore();
      this.blobs = [];
      for (let i = 0; i < 6; i++) this.blobs.push({ x: rnd() * 600, y: 30 + rnd() * 90, r: 6 + rnd() * 10, ph: rnd() * 9, par: 0.15 + rnd() * 0.2 });
    },
    background(ctx, cam, t, mood) {
      KF.blit(ctx, this.sky, 0, 0);
      tiled(ctx, this.far, cam.x, 0.1, 0);
      for (const b of this.blobs) { // liquid chrome blobs, wobbling
        const x = ((b.x - cam.x * b.par) % (VW + 60) + VW + 60) % (VW + 60) - 30, y = b.y + Math.sin(t * 1.3 + b.ph) * 5;
        const sx = 1 + Math.sin(t * 2 + b.ph) * 0.12 * (1 + mood.cheer);
        ctx.save(); ctx.translate(x, y); ctx.scale(sx, 2 - sx);
        ctx.fillStyle = radial(ctx, -b.r * 0.35, -b.r * 0.4, b.r * 1.3, [[0, '#ffffff'], [0.35, '#c8d4f0'], [0.6, '#4a5878'], [0.8, '#e0e8ff'], [1, '#7a88a8']]);
        ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      // Reflective floor plane far below.
      ctx.fillStyle = grad(ctx, 0, 150, 0, VH, [[0, 'rgba(255,255,255,0.7)'], [0.2, '#b0c0e8'], [1, '#6a7aa8']]); ctx.fillRect(0, 150, VW, VH - 150);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      for (let i = 0; i < 10; i++) { const x = ((i * 61 - cam.x * 0.5) % (VW + 40) + VW + 40) % (VW + 40) - 20; ctx.fillRect(x, 158 + (i % 4) * 12, 26, 0.8); }
      // Lens flare that drifts with the camera.
      const fx = 70 - (cam.x * 0.05) % 30;
      for (const [k, r, c] of [[0.6, 4, 'rgba(255,120,220,0.25)'], [1.2, 7, 'rgba(120,200,255,0.2)'], [1.8, 3, 'rgba(255,255,255,0.45)']]) disc(ctx, fx + (VW / 2 - fx) * k, 40 + (VH / 2 - 40) * k, r, c);
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'oneway') { // chrome tube rail
        ctx.fillStyle = grad(ctx, 0, y, 0, y + 3.4, [[0, '#ffffff'], [0.4, '#8a9ab8'], [0.6, '#2a3450'], [1, '#c8d4ec']]);
        rr(ctx, x, y, 16, 3.4, 1.7); ctx.fill();
        return;
      }
      if (art === 'alt') { // translucent candy plastic box
        const col = seed < 0.5 ? [255, 90, 190] : [120, 230, 90];
        rr(ctx, x + 0.5, y + 0.5, 15, 15, 3);
        ctx.fillStyle = grad(ctx, 0, y, 0, y + 16, [[0, `rgba(${col},0.85)`], [1, `rgba(${col.map((v) => v * 0.55)},0.9)`]]); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 0.6; ctx.stroke();
        rr(ctx, x + 2.5, y + 2, 4, 9, 2); ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill();
        return;
      }
      if (art === 'ice') {
        block(ctx, x, y, e, { face: ['#9ae0ff', '#3a8ad0'], top: ['#ffffff', '#c8f0ff'], side: 'rgba(0,40,80,0.4)', under: 'rgba(0,40,80,0.4)', trim: '#ffffff' }, seed);
        return;
      }
      // Polished chrome: horizon-band reflection, rounded highlight on top.
      ctx.fillStyle = grad(ctx, 0, y, 0, y + 16, CHROME); ctx.fillRect(x, y, 16, 16);
      if (e.l) { ctx.fillStyle = grad(ctx, x, 0, x + 2.5, 0, [[0, 'rgba(20,30,60,0.5)'], [1, 'rgba(20,30,60,0)']]); ctx.fillRect(x, y, 2.5, 16); }
      if (e.r) { ctx.fillStyle = grad(ctx, x + 16, 0, x + 13.5, 0, [[0, 'rgba(255,255,255,0.7)'], [1, 'rgba(255,255,255,0)']]); ctx.fillRect(x + 13.5, y, 2.5, 16); }
      if (e.b) box(ctx, 'rgba(20,30,60,0.45)', x, y + 15, 16, 1);
      if (e.t) {
        ctx.fillStyle = grad(ctx, 0, y, 0, y + 3.4, [[0, '#ffffff'], [1, '#d0dcf4']]); ctx.fillRect(x, y, 16, 3.4);
        box(ctx, '#ff4ab8', x, y, 16, 0.7);
        box(ctx, 'rgba(40,50,90,0.4)', x, y + 3.4, 16, 0.5);
      }
    },
    spike: (ctx, x, y, dir) => spikes(ctx, x, y, dir, '#5a0a30'),
    door: door('#ff4ab8'),
    spring: spring('#5a7aff'),
    sign: sign('#5a7aff', '#ffffff'),
  });

  // =====================================================================================
  // 4. THE DATA CORE: server aisles, cable runs and the glowing core of the net.
  // =====================================================================================
  const CORE = '#4ab8ff';
  KF.Themes.add('cyber_datacore', {
    id: 'cyber_datacore', title: 'THE DATA CORE', name: 'CORE', bg: '#02050b', bloom: 0.55,
    signBoard: '#041020', signInk: '#7ad8ff', signPost: '#14304a',
    zone: { gravity: '#7ad8ff', reverse: '#ff5aa8' },
    build() {
      const rnd = U.rng(404);
      this.sky = mk(VW, VH);
      const s = this.sky.getContext('2d');
      s.fillStyle = grad(s, 0, 0, 0, VH, [[0, '#010308'], [0.5, '#04101e'], [1, '#081a2e']]); s.fillRect(0, 0, VW, VH);
      // Far: rows of server racks, cable bundles sagging between them.
      this.far = mk(720, VH); this.leds = [];
      const f = this.far.getContext('2d');
      for (let x = 0; x < 720; x += 30) {
        const top = 40 + (rnd() < 0.3 ? 20 : 0);
        f.fillStyle = grad(f, x, 0, x + 24, 0, [[0, '#0e1e30'], [1, '#060e18']]); f.fillRect(x, top, 24, VH - top);
        for (let yy = top + 4; yy < VH; yy += 5) { f.fillStyle = 'rgba(0,0,0,0.5)'; f.fillRect(x + 2, yy, 20, 3.4); }
        for (let k = 0; k < 7; k++) this.leds.push({ x: x + 4 + rnd() * 16, y: top + 6 + rnd() * (VH - top - 20), ph: rnd() * 9, col: rnd() < 0.7 ? '#3aff9a' : '#4ab8ff' });
        f.strokeStyle = 'rgba(30,60,90,0.8)'; f.lineWidth = 1.2; f.beginPath(); f.moveTo(x + 24, top + 4); f.quadraticCurveTo(x + 27, top + 22, x + 30, top + 4); f.stroke();
      }
      f.fillStyle = grad(f, 0, 80, 0, VH, [[0, 'rgba(20,60,110,0)'], [1, 'rgba(30,80,140,0.5)']]); f.fillRect(0, 80, 720, VH - 80);
      this.streams = [];
      for (let i = 0; i < 14; i++) this.streams.push({ x: rnd() * VW, sp: 30 + rnd() * 50, ph: rnd() * 200, len: 10 + rnd() * 20 });
    },
    background(ctx, cam, t, mood) {
      KF.blit(ctx, this.sky, 0, 0);
      // The core: a pillar of light far behind the aisles, pulsing faster when you die.
      const cx = 250 - (cam.x * 0.04) % 40, pulse = 0.6 + 0.4 * Math.sin(t * (2 + mood.cheer * 6));
      ctx.fillStyle = grad(ctx, cx - 30, 0, cx + 30, 0, [[0, 'rgba(74,184,255,0)'], [0.5, `rgba(120,210,255,${0.35 * pulse})`], [1, 'rgba(74,184,255,0)']]); ctx.fillRect(cx - 30, 0, 60, VH);
      ctx.fillStyle = grad(ctx, cx - 4, 0, cx + 4, 0, [[0, 'rgba(200,240,255,0)'], [0.5, `rgba(230,250,255,${0.8 * pulse})`], [1, 'rgba(200,240,255,0)']]); ctx.fillRect(cx - 4, 0, 8, VH);
      ctx.strokeStyle = `rgba(150,220,255,${0.5 * pulse})`; ctx.lineWidth = 0.6;
      for (let k = 0; k < 4; k++) { const ry = ((t * 30 + k * 50) % (VH + 20)) - 10; ctx.beginPath(); ctx.ellipse(cx, ry, 22, 4, 0, 0, Math.PI * 2); ctx.stroke(); }
      tiled(ctx, this.far, cam.x, 0.2, 0);
      for (const l of this.leds) { // blinking drive lights
        if (Math.sin(t * 5 + l.ph * 3) > 0.3) continue;
        const x = wrapX(l.x, cam.x, 0.2, 720) + 24;
        if (x < -2 || x > VW + 2) continue;
        disc(ctx, x, l.y, 0.7, l.col);
      }
      for (const s of this.streams) { // data falling down the light shafts
        const y = (s.ph + t * s.sp) % (VH + 40) - 20, x = ((s.x - cam.x * 0.3) % VW + VW) % VW;
        ctx.fillStyle = grad(ctx, 0, y - s.len, 0, y, [[0, 'rgba(74,184,255,0)'], [1, 'rgba(160,230,255,0.7)']]); ctx.fillRect(x, y - s.len, 0.8, s.len);
      }
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'oneway') { // cable tray
        ctx.fillStyle = grad(ctx, 0, y, 0, y + 3, [[0, '#6a8aa8'], [1, '#1a2a3a']]); ctx.fillRect(x, y, 16, 3);
        ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 0.4; ctx.beginPath(); for (let i = 1; i < 16; i += 2) { ctx.moveTo(x + i, y + 0.6); ctx.lineTo(x + i + 1, y + 2.6); } ctx.stroke();
        box(ctx, CORE, x, y, 16, 0.6);
        return;
      }
      if (art === 'alt') { // a server rack block
        block(ctx, x, y, e, { face: ['#18283a', '#0a121c'], top: ['#5a7a98', '#22364a'], side: 'rgba(0,0,0,0.55)', under: 'rgba(0,0,0,0.6)', trim: '#3aff9a' }, seed);
        for (let k = 0; k < 3; k++) { rr(ctx, x + 2, y + 5 + k * 3.4, 12, 2.4, 0.6); ctx.fillStyle = '#05090f'; ctx.fill(); disc(ctx, x + 12.6, y + 6.2 + k * 3.4, 0.5, k === Math.floor(seed * 3) ? '#ff5a5a' : '#3aff9a'); }
        return;
      }
      if (art === 'ice') {
        block(ctx, x, y, e, { face: ['#2a6a9a', '#0c2440'], top: ['#e8f8ff', '#7ac0e8'], side: 'rgba(0,0,0,0.45)', under: 'rgba(0,0,0,0.5)', trim: '#e8f8ff' }, seed);
        return;
      }
      // Steel floor grating with a blue LED strip along the top.
      block(ctx, x, y, e, { face: ['#1a2636', '#080e16'], top: ['#7a90a8', '#2e3e52'], side: 'rgba(0,0,0,0.55)', under: 'rgba(0,0,0,0.6)', trim: CORE, seam: 'rgba(0,0,0,0.5)' }, seed);
      if (e.t) for (let i = 1.2; i < 16; i += 2.6) { ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(x + i, y + 2.2, 0.8, 0.45, 0, 0, Math.PI * 2); ctx.fill(); }
    },
    spike: (ctx, x, y, dir) => spikes(ctx, x, y, dir),
    door: door(CORE),
    spring: spring('#3aff9a'),
    sign: sign(CORE, '#e0f6ff'),
  });

  // ---------- the realm's style: smooth, with GPU-side neon effects ----------
  let bloomC = null, bloomF = -1;
  const veil = {};
  const S = KF.Styles.all.cyberpunk;
  Object.assign(S, {
    smooth: true, vecLook: 'neon',
    // Neon bloom: a small blurred, contrast-thresholded copy of the frame added back on top.
    compose(ctx, wc) {
      KF.blit(ctx, wc, 0, 0);
      const scene = KF.engine && KF.engine.scene, k = (scene && scene.theme && scene.theme.bloom) ?? 0.45;
      if (!k) return;
      if (!bloomC) { bloomC = document.createElement('canvas'); bloomC.width = 128; bloomC.height = 72; }
      const f = KF.engine.frame || 0;
      if (f !== bloomF + 1 || f % 2 === 0) { // refreshed every other frame: the glow lags by a frame, invisibly
        const b = bloomC.getContext('2d');
        b.globalCompositeOperation = 'copy'; b.filter = 'brightness(0.75) contrast(2.6) blur(1.5px)';
        b.drawImage(wc, 0, 0, 128, 72); b.filter = 'none';
      }
      bloomF = f;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = k; ctx.imageSmoothingEnabled = true;
      ctx.drawImage(bloomC, 0, 0, VW, VH); ctx.restore();
    },
    overlay(ctx, i) {
      const th = KF.engine && KF.engine.scene && KF.engine.scene.theme, bright = th && th.id === 'cyber_chrome';
      if (!bright) { // rain in front of everything (not in the chrome arcade, which is indoors)
        ctx.strokeStyle = 'rgba(180,210,255,0.3)'; ctx.lineWidth = 0.45; ctx.lineCap = 'round'; ctx.beginPath();
        for (let k = 0; k < 110; k++) {
          const x = (k * 41 + i.t * 70) % (VW + 30) - 15, y = (k * 67 + i.t * 330) % (VH + 20) - 10;
          ctx.moveTo(x, y); ctx.lineTo(x - 1.8, y + 7);
        }
        ctx.stroke();
      }
      const key = bright ? 'b' : 'd';
      if (!veil[key]) { // fine scanlines (a third of each logical row) and an edge vignette, baked once
        const c = KF.makeHi(VW, VH, KF.HI_MAX), x = c.getContext('2d');
        x.fillStyle = 'rgba(0,0,0,0.12)'; for (let y = 0; y < VH; y += 1) x.fillRect(0, y + 0.66, VW, 0.34);
        const g = x.createRadialGradient(VW / 2, VH / 2, VH * 0.45, VW / 2, VH / 2, VW * 0.62);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, bright ? 'rgba(90,60,160,0.25)' : 'rgba(10,0,30,0.55)');
        x.fillStyle = g; x.fillRect(0, 0, VW, VH);
        veil[key] = c;
      }
      KF.blit(ctx, veil[key], 0, 0);
    },
  });
})(window.KF);
