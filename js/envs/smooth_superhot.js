'use strict';
// Smooth (non-pixel) places for the SUPERHOT realm. The look: a white, softly shaded geometric
// world seen side-on with a little depth (2.5D), black obsidian objects, and red for anything
// that wants you dead. Places: an office floor, a subway car, a rooftop bar and the core.
//
// Every block is drawn as a front face plus a top face receding up and to the right, lit from the
// upper left, so the flat side view reads as solid 3D geometry.
(function (KF) {
  const VW = KF.VIEW_W, VH = KF.VIEW_H, T = KF.TILE;
  const R = (ctx, c, x, y, w = 1, h = 1) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  const DEPTH = 5; // how far the top faces recede (px), for the 2.5D look

  const S = KF.Styles.all.superhot;
  if (S) Object.assign(S, { smooth: true, vecLook: 'lowpoly' });

  // ---------- shared painters ----------
  const lin = (ctx, x0, y0, x1, y1, stops) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
  // A box seen from the side: front face + receding top face (+ right side face when `side`).
  function box(ctx, x, y, w, h, pal, o = {}) {
    const d = o.depth ?? DEPTH;
    if (o.top !== false) {
      ctx.fillStyle = pal.top;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + d, y - d); ctx.lineTo(x + w + d, y - d); ctx.lineTo(x + w, y); ctx.closePath(); ctx.fill();
    }
    if (o.side) {
      ctx.fillStyle = pal.side;
      ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w + d, y - d); ctx.lineTo(x + w + d, y + h - d); ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = o.flat ? pal.front : lin(ctx, x, y, x, y + h, [[0, pal.front], [1, pal.frontLo || pal.front]]);
    ctx.fillRect(x, y, w, h);
  }
  const WHITE = { top: '#ffffff', front: '#eef0f3', frontLo: '#dfe2e7', side: '#d4d7dd' };
  const GREY = { top: '#e9ebef', front: '#d9dce2', frontLo: '#c8ccd3', side: '#bfc3cb' };
  const OBSIDIAN = { top: '#3a3a44', front: '#1a1a20', frontLo: '#0e0e12', side: '#26262e' };
  const RED = '#e3170a';

  // Tiles shared by all four places, tinted per place.
  function makeTiles(pal) {
    return {
      tile(ctx, x, y, art, e, seed) {
        if (art === 'oneway') { // a thin slab
          box(ctx, x, y, 16, 3, pal.slab, { depth: 3, top: true });
          R(ctx, 'rgba(0,0,0,0.08)', x, y + 3, 16, 1);
          return;
        }
        if (art === 'alt') { // obsidian block
          box(ctx, x, y, 16, 16, OBSIDIAN, { top: !!e.t, side: !!e.r });
          R(ctx, 'rgba(255,255,255,0.10)', x + 2, y + 2, 1, 12);
          return;
        }
        if (art === 'ice') { box(ctx, x, y, 16, 16, { top: '#ffffff', front: '#dff3ff', frontLo: '#c6e6f6', side: '#b6d8ea' }, { top: !!e.t }); return; }
        box(ctx, x, y, 16, 16, pal.block, { top: !!e.t, side: !!e.r, flat: !e.t });
        if (e.t) R(ctx, 'rgba(255,255,255,0.9)', x, y, 16, 1);
        if (!e.t) R(ctx, 'rgba(0,0,0,0.035)', x, y + ((seed * 16) | 0) % 16, 16, 1); // faint panel seams
        if (e.l) R(ctx, 'rgba(255,255,255,0.6)', x, y, 1, 16);
        if (e.r) R(ctx, 'rgba(0,0,0,0.06)', x + 15, y, 1, 16);
      },
      // Red crystal spikes: faceted shards with a light and a dark face.
      spike(ctx, x, y, dir) {
        ctx.save(); ctx.translate(x + 8, y + 8);
        ctx.rotate({ up: 0, down: Math.PI, left: -Math.PI / 2, right: Math.PI / 2 }[dir] || 0);
        for (const ox of [-4, 4]) {
          ctx.fillStyle = '#ff5a40'; ctx.beginPath(); ctx.moveTo(ox - 4, 8); ctx.lineTo(ox, -6); ctx.lineTo(ox, 8); ctx.fill();
          ctx.fillStyle = '#b00c04'; ctx.beginPath(); ctx.moveTo(ox, -6); ctx.lineTo(ox + 4, 8); ctx.lineTo(ox, 8); ctx.fill();
        }
        ctx.restore();
      },
      // The exit: an obsidian doorway glowing white inside.
      door(ctx, x, y, o = {}) {
        ctx.save();
        if (o.flipped) { ctx.translate(0, y * 2 + 32); ctx.scale(1, -1); }
        box(ctx, x - 2, y, 20, 32, OBSIDIAN, { side: true });
        const open = o.open || 0;
        ctx.fillStyle = lin(ctx, x, y, x, y + 32, [[0, '#ffffff'], [1, open ? '#ffffff' : '#e8ebf0']]);
        ctx.fillRect(x + 2, y + 4, 12, 28);
        if (o.lantern) { ctx.globalAlpha = 0.35 + 0.2 * Math.sin((o.t || 0) * 3); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x + 8, y + 16, 18, 0, 7); ctx.fill(); }
        ctx.restore();
      },
      spring(ctx, x, y, sq) {
        const h = Math.round(6 - sq * 4);
        box(ctx, x + 2, y + 16 - h - 2, 12, 2, OBSIDIAN, { depth: 2 });
        ctx.fillStyle = '#9aa0aa'; for (let i = 0; i < h; i += 2) ctx.fillRect(x + 4, y + 16 - h + i, 8, 1);
      },
      sign(ctx, x, y, text) {
        const w = KF.Font.measure(text) + 10, bx = Math.round(x - w / 2), by = Math.round(y);
        box(ctx, bx, by, w, 11, OBSIDIAN, { depth: 3, side: true });
        KF.Font.draw(ctx, text, bx + 5, by + 2, '#ffffff');
        R(ctx, '#1a1a20', bx + w / 2 - 1, by + 11, 2, 7);
      },
    };
  }
  // A parallax strip, baked once at full smooth resolution, repeated across the screen.
  function strip(lw, draw) { const c = KF.makeHi(lw, VH, KF.HI_MAX), x = c.getContext('2d'); x.imageSmoothingEnabled = true; draw(x); return c; }
  function tiled(ctx, img, camX, par, y = 0) {
    const w = img.lw; let ox = -((camX * par) % w); if (ox > 0) ox -= w;
    for (let x = ox; x < VW; x += w) KF.blit(ctx, img, x, y);
  }
  // Soft white haze at the bottom of distant layers: depth fog.
  const haze = (ctx, y0, y1, a = 0.7) => { ctx.fillStyle = lin(ctx, 0, y0, 0, y1, [[0, 'rgba(250,251,252,0)'], [1, `rgba(250,251,252,${a})`]]); ctx.fillRect(0, y0, VW, y1 - y0); };
  const common = { bg: '#f4f5f7', signBoard: '#1a1a20', signInk: '#ffffff', zone: { gravity: '#8a8a9a', reverse: '#ff5a40' } };

  // ======================================================================
  // 1. OFFICE FLOOR: white open-plan office, tall windows onto a pale city.
  // ======================================================================
  KF.Themes.add('superhot_office', Object.assign({
    id: 'superhot_office', title: 'OFFICE FLOOR', name: 'OFFICE',
    build() {
      this.far = strip(512, (x) => { // the city through the windows
        for (let i = 0; i < 18; i++) {
          const w = 22 + (i * 37) % 30, h = 60 + (i * 53) % 90, bx = i * 29;
          box(x, bx, 200 - h, w, h + 20, { top: '#ffffff', front: '#e4e7ec', frontLo: '#f2f4f6', side: '#d6dae0' }, { side: true, depth: 4 });
        }
      });
      this.mid = strip(384, (x) => { // window wall: frames and pillars with depth
        x.fillStyle = 'rgba(255,255,255,0.0)';
        for (let i = 0; i < 4; i++) {
          const px = i * 96;
          box(x, px, 24, 14, 150, GREY, { side: true, depth: 6 });
          R(x, '#cfd3da', px + 14, 24, 82, 3); R(x, '#cfd3da', px + 14, 92, 82, 2); R(x, '#cfd3da', px + 54, 24, 2, 150);
        }
        R(x, '#e4e7ec', 0, 14, 384, 10); // ceiling beam
        for (let i = 0; i < 6; i++) { R(x, '#ffffff', 12 + i * 64, 4, 40, 4); x.fillStyle = 'rgba(255,255,255,0.5)'; x.fillRect(8 + i * 64, 8, 48, 2); }
      });
      this.near = strip(448, (x) => { // desks and chairs, between you and the windows
        for (let i = 0; i < 4; i++) {
          const dx = 20 + i * 112;
          box(x, dx, 150, 56, 6, WHITE, { side: true, depth: 6 });
          R(x, '#c8ccd3', dx + 4, 156, 3, 20); R(x, '#c8ccd3', dx + 49, 156, 3, 20);
          box(x, dx + 18, 136, 18, 12, OBSIDIAN, { depth: 3, side: true }); // monitor
          R(x, '#5a5a66', dx + 26, 148, 2, 2);
          box(x, dx + 64, 146, 12, 10, GREY, { depth: 3 }); R(x, '#9aa0aa', dx + 69, 156, 2, 18); // chair
        }
      });
    },
    background(ctx, cam, t) {
      ctx.fillStyle = lin(ctx, 0, 0, 0, VH, [[0, '#fbfbfc'], [1, '#eceef1']]); ctx.fillRect(0, 0, VW, VH);
      tiled(ctx, this.far, cam.x, 0.12, -10); haze(ctx, 120, 200, 0.6);
      tiled(ctx, this.mid, cam.x, 0.35);
      ctx.globalAlpha = 0.55; tiled(ctx, this.near, cam.x, 0.6, -6); ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(120,128,140,0.08)'; ctx.fillRect(0, 168, VW, 8); // soft floor shadow line
    },
  }, common, makeTiles({ block: WHITE, slab: GREY })));

  // ======================================================================
  // 2. SUBWAY CAR: inside a white train; tunnel lights streak past the windows.
  // ======================================================================
  KF.Themes.add('superhot_subway', Object.assign({
    id: 'superhot_subway', title: 'SUBWAY CAR', name: 'SUBWAY',
    build() {
      this.car = strip(256, (x) => {
        R(x, '#eef0f3', 0, 80, 256, 100);
        for (let i = 0; i < 3; i++) { // windows
          const wx = 16 + i * 84;
          R(x, '#cdd2d9', wx - 2, 98, 60, 38);
          x.fillStyle = lin(x, 0, 100, 0, 134, [[0, '#2a2a32'], [1, '#14141a']]); x.fillRect(wx, 100, 56, 34);
        }
        R(x, '#d8dce2', 0, 140, 256, 3); // rail
        for (let i = 0; i < 4; i++) { R(x, '#b9bec6', 6 + i * 64, 88, 2, 88); R(x, '#ffffff', 5 + i * 64, 88, 1, 88); } // poles
        for (let i = 0; i < 3; i++) box(x, 20 + i * 84, 156, 50, 8, GREY, { depth: 5, side: true }); // seats
        R(x, '#ffffff', 0, 84, 256, 3);
      });
    },
    background(ctx, cam, t) {
      R(ctx, '#0e0e12', 0, 0, VW, VH);
      // tunnel lights rushing past (seen through the windows of the car layer)
      const off = (t * 900) % 120;
      for (let i = -1; i < 5; i++) {
        const lx = i * 120 - off;
        ctx.fillStyle = lin(ctx, lx, 0, lx + 90, 0, [[0, 'rgba(255,255,255,0)'], [0.5, 'rgba(255,255,255,0.85)'], [1, 'rgba(255,255,255,0)']]);
        ctx.fillRect(lx, 104, 90, 3); ctx.fillRect(lx + 30, 124, 60, 2);
      }
      tiled(ctx, this.car, cam.x, 1);
      // the car's own light: a soft wash from above
      ctx.fillStyle = lin(ctx, 0, 80, 0, 180, [[0, 'rgba(255,255,255,0.25)'], [1, 'rgba(255,255,255,0)']]); ctx.fillRect(0, 80, VW, 100);
    },
  }, common, makeTiles({ block: { top: '#f7f8fa', front: '#e6e9ee', frontLo: '#d2d6dc', side: '#c9cdd4' }, slab: GREY })));

  // ======================================================================
  // 3. ROOFTOP BAR: pale sky, white towers in soft perspective, a bar under string lights.
  // ======================================================================
  KF.Themes.add('superhot_rooftop', Object.assign({
    id: 'superhot_rooftop', title: 'ROOFTOP BAR', name: 'ROOFTOP',
    build() {
      this.far = strip(640, (x) => {
        for (let i = 0; i < 22; i++) {
          const w = 18 + (i * 31) % 26, h = 40 + (i * 71) % 110, bx = i * 30;
          box(x, bx, 190 - h, w, h + 30, { top: '#ffffff', front: '#e9ecf0', frontLo: '#f6f7f9', side: '#dde1e6' }, { side: true, depth: 5 });
          for (let k = 0; k < h - 10; k += 9) R(x, 'rgba(170,178,190,0.25)', bx + 3, 196 - h + k, w - 6, 2);
        }
      });
      this.mid = strip(400, (x) => {
        for (let i = 0; i < 4; i++) {
          const bx = 30 + i * 100;
          box(x, bx, 120, 40, 60, GREY, { side: true, depth: 8 }); // vents and water tanks
          x.fillStyle = '#e6e9ee'; x.beginPath(); x.ellipse(bx + 70, 112, 14, 6, 0, 0, 7); x.fill();
          box(x, bx + 56, 112, 28, 30, WHITE, { top: false, depth: 6 });
        }
      });
    },
    background(ctx, cam, t) {
      ctx.fillStyle = lin(ctx, 0, 0, 0, VH, [[0, '#ffffff'], [0.7, '#eef1f5'], [1, '#e3e7ec']]); ctx.fillRect(0, 0, VW, VH);
      tiled(ctx, this.far, cam.x, 0.1, 10); haze(ctx, 110, 200, 0.75);
      tiled(ctx, this.mid, cam.x, 0.3, 20); haze(ctx, 150, 200, 0.4);
      // string lights sagging across the bar
      ctx.strokeStyle = 'rgba(40,40,48,0.5)'; ctx.lineWidth = 0.6; ctx.beginPath();
      const ox = -((cam.x * 0.8) % 96);
      for (let x = ox - 96; x < VW + 96; x += 96) { ctx.moveTo(x, 40); ctx.quadraticCurveTo(x + 48, 58, x + 96, 40); }
      ctx.stroke();
      for (let x = ox - 96; x < VW + 96; x += 12) {
        const u = (((x - ox) % 96) + 96) % 96 / 96, y = 40 + 4 * 18 * u * (1 - u);
        ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.arc(x, y + 2, 1.6, 0, 7); ctx.fill();
      }
    },
  }, common, makeTiles({ block: GREY, slab: WHITE })));

  // ======================================================================
  // 4. THE CORE: a white void, floating geometry, a perspective grid floor. THE SYSTEM's home.
  // ======================================================================
  KF.Themes.add('superhot_core', Object.assign({
    id: 'superhot_core', title: 'THE CORE', name: 'CORE',
    build() {},
    background(ctx, cam, t, mood) {
      ctx.fillStyle = lin(ctx, 0, 0, 0, VH, [[0, '#ffffff'], [1, '#e8ebef']]); ctx.fillRect(0, 0, VW, VH);
      // perspective grid on the floor plane, receding to a horizon
      const hz = 120; ctx.strokeStyle = 'rgba(150,158,170,0.35)'; ctx.lineWidth = 0.5; ctx.beginPath();
      for (let i = -12; i <= 12; i++) { const fx = VW / 2 + i * 40 - ((cam.x * 0.5) % 40); ctx.moveTo(VW / 2 + (fx - VW / 2) * 0.15, hz); ctx.lineTo(fx, VH); }
      for (let k = 1; k < 8; k++) { const y = hz + (VH - hz) * Math.pow(k / 8, 1.8); ctx.moveTo(0, y); ctx.lineTo(VW, y); }
      ctx.stroke();
      // floating cubes and shards, slowly turning (they turn faster when the world moves)
      const tk = KF.engine && KF.engine.scene && KF.engine.scene.stage ? KF.engine.scene.stage.t : t;
      for (let i = 0; i < 9; i++) {
        const par = 0.15 + (i % 3) * 0.12, bx = ((i * 97 - cam.x * par) % (VW + 80) + VW + 80) % (VW + 80) - 40;
        const by = 30 + (i * 41) % 80 + Math.sin(tk * 0.8 + i) * 6, s = 8 + (i % 4) * 5, a = tk * 0.5 + i;
        ctx.save(); ctx.translate(bx, by); ctx.rotate(a * (i % 2 ? 1 : -1) * 0.3);
        const red = i === 4;
        ctx.fillStyle = red ? '#ff5a40' : '#ffffff'; ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s, 0); ctx.lineTo(0, s * 0.3); ctx.closePath(); ctx.fill();
        ctx.fillStyle = red ? '#b00c04' : '#d9dde3'; ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(-s, 0); ctx.lineTo(0, s * 0.3); ctx.closePath(); ctx.fill();
        ctx.fillStyle = red ? '#7a0802' : '#c3c8cf'; ctx.beginPath(); ctx.moveTo(-s, 0); ctx.lineTo(0, s); ctx.lineTo(s, 0); ctx.lineTo(0, s * 0.3); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      haze(ctx, 100, 200, 0.5);
      if (mood && mood.cheer > 0.5) { ctx.fillStyle = `rgba(227,23,10,${(mood.cheer - 0.5) * 0.08})`; ctx.fillRect(0, 0, VW, VH); }
    },
  }, common, makeTiles({ block: { top: '#ffffff', front: '#f1f3f6', frontLo: '#e2e5ea', side: '#d6dae0' }, slab: { top: '#ffffff', front: '#1a1a20', frontLo: '#121216', side: '#26262e' } })));

  void RED; void T;
})(window.KF);
