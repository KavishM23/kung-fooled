'use strict';
// Per-stage environments for the harbour realm: a silent-film dock set, a harbour engineering
// drawing, an AR phone game on a seaside promenade, a rainy noir waterfront and a DOS pirate game.
(function (KF) {
  const { R, OUT, ditherSky, tiled, edges, Art } = KF.ThemeKit;
  const U = KF.util, VW = KF.VIEW_W, VH = KF.VIEW_H, F = () => KF.Font;
  // Screen x of a feature at world x `wx` repeating every `span`, scrolled at parallax `par`.
  const loopX = (wx, camX, par, span) => ((((wx - camX * par) % span) + span) % span) - 40;
  const lum = (d, o) => (d[o] * 77 + d[o + 1] * 150 + d[o + 2] * 29) >> 8;
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.5);
  const deaths = () => { const s = KF.engine && KF.engine.scene; return (s && s.deaths) || 0; };
  function line(ctx, pts, color, w = 0.5) {
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
  }
  function disc(ctx, x, y, r, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }

  // =====================================================================================
  // 1. SILENT FILM: a 1920s studio dock set. Painted backdrop, cardboard steamship whose smoke
  //    is cotton wool on strings, a theatre wave machine, and the crew filming every take.
  // =====================================================================================
  KF.Env.add('silent', {
    name: 'FILM SET', bg: '#1c1712',
    signBoard: '#f4ecd8', signInk: '#1a120a', signPost: '#3a2a1a',
    zone: { gravity: '#d8d0c0', reverse: '#8a7a6a' },
    build() {
      const rnd = U.rng(41);
      // Painted backdrop: sky, clouds, a painted sea and lighthouse, with canvas seams.
      this.drop = KF.makeHi(512, 150);
      const b = this.drop.getContext('2d');
      const g = b.createLinearGradient(0, 0, 0, 150); g.addColorStop(0, '#8a8478'); g.addColorStop(0.62, '#b4ac9a'); g.addColorStop(0.63, '#6a665e'); g.addColorStop(1, '#4e4a44');
      b.fillStyle = g; b.fillRect(0, 0, 512, 150);
      for (let k = 0; k < 9; k++) { // brush-stroke clouds
        const cx = rnd() * 512, cy = 14 + rnd() * 50, w = 30 + rnd() * 40;
        for (let j = 0; j < 7; j++) disc(b, cx + (j - 3) * w / 7, cy + Math.sin(j) * 2, 5 + rnd() * 5, j % 2 ? '#cfc6b0' : '#c2b9a4');
        R(b, '#a49c8a', cx - w / 2, cy + 6, w, 1);
      }
      for (let y = 96; y < 150; y += 6) for (let x = (y / 6) % 2 * 8; x < 512; x += 16) { // painted wave scallops
        b.strokeStyle = '#7e7a70'; b.lineWidth = 1; b.beginPath(); b.arc(x, y, 6, Math.PI, 0); b.stroke();
      }
      // painted lighthouse on a rock
      R(b, '#5a564e', 380, 84, 60, 14); R(b, '#5a564e', 392, 78, 34, 8);
      b.fillStyle = '#d8d0bc'; b.beginPath(); b.moveTo(402, 80); b.lineTo(416, 80); b.lineTo(413, 38); b.lineTo(405, 38); b.fill();
      R(b, '#6a645a', 404, 52, 10, 4); R(b, '#6a645a', 403, 66, 12, 4);
      R(b, '#3a362e', 403, 30, 12, 8); R(b, '#efe6cc', 405, 31, 8, 5); R(b, '#3a362e', 402, 28, 14, 2);
      for (let x = 0; x < 512; x += 128) { R(b, 'rgba(30,24,18,0.25)', x, 0, 1, 150); R(b, 'rgba(255,250,235,0.12)', x + 1, 0, 1, 150); } // seams
      for (let k = 0; k < 60; k++) R(b, 'rgba(40,30,20,0.12)', rnd() * 512, rnd() * 150, 1 + rnd() * 3, 1); // canvas texture
      // Cardboard steamship + crane cut-outs, with their wooden braces showing.
      this.props = KF.makeHi(640, VH);
      const p = this.props.getContext('2d');
      const ship = (sx) => {
        R(p, '#2a241c', sx + 20, 150, 2, 22); R(p, '#2a241c', sx + 100, 150, 2, 22); // braces
        line(p, [[sx + 21, 150], [sx + 6, 172]], '#2a241c', 1); line(p, [[sx + 101, 150], [sx + 116, 172]], '#2a241c', 1);
        p.fillStyle = '#3e3830'; p.beginPath(); p.moveTo(sx, 118); p.lineTo(sx + 128, 118); p.lineTo(sx + 118, 152); p.lineTo(sx + 10, 152); p.fill();
        R(p, '#d0c8b4', sx + 2, 118, 124, 3); R(p, '#5a5248', sx + 10, 140, 108, 2);
        for (let i = 0; i < 8; i++) { disc(p, sx + 18 + i * 13, 129, 2.5, '#1e1a14'); disc(p, sx + 18 + i * 13, 128.5, 1.5, '#7a7262'); }
        R(p, '#5e584c', sx + 30, 100, 64, 18); R(p, '#cfc6b0', sx + 30, 100, 64, 2);
        for (let i = 0; i < 6; i++) R(p, '#2a241c', sx + 34 + i * 10, 106, 5, 4);
        for (const fx of [44, 70]) { R(p, '#2e2a24', fx + sx, 72, 12, 28); R(p, '#d0c8b4', fx + sx, 78, 12, 4); R(p, '#1a1610', fx + sx - 1, 70, 14, 3); }
        line(p, [[sx + 2, 118], [sx + 50, 62], [sx + 126, 118]], '#4a443a', 0.5);
        F().draw(p, 'S.S. ROLLO', sx + 64, 143, '#cfc6b0', 1, 'center');
      };
      ship(70); ship(390);
      // dockside crane
      const cx = 290;
      R(p, '#2a261e', cx, 60, 5, 112); R(p, '#2a261e', cx + 26, 60, 5, 112);
      for (let y = 64; y < 170; y += 12) line(p, [[cx + 5, y], [cx + 26, y + 12]], '#2a261e', 1);
      R(p, '#2a261e', cx - 40, 54, 100, 6); line(p, [[cx - 36, 60], [cx - 36, 96]], '#2a261e', 0.5); R(p, '#2a261e', cx - 42, 96, 12, 8);
      this.funnels = [114, 140, 434, 460];
      // Theatre wave machine: rows of scalloped boards.
      this.wave = [];
      for (let k = 0; k < 4; k++) {
        const c = KF.makeHi(VW + 64, 18), x = c.getContext('2d'), col = ['#4a463e', '#5c574d', '#6e685c', '#807a6c'][k];
        x.fillStyle = col;
        for (let wx = 0; wx < VW + 64; wx += 32) { x.beginPath(); x.moveTo(wx, 18); x.quadraticCurveTo(wx + 8, 0, wx + 16, 4); x.quadraticCurveTo(wx + 24, 8, wx + 32, 18); x.fill(); }
        R(x, '#d8d0bc', 0, 17, VW + 64, 1);
        this.wave.push(c);
      }
    },
    background(ctx, cam, t, mood) {
      // Fly loft: battens and ropes above the backdrop.
      R(ctx, '#15110d', 0, 0, VW, VH);
      KF.ThemeKit.tiled(ctx, this.drop, cam.x, 0.06, 18);
      R(ctx, '#0e0b08', 0, 0, VW, 18);
      for (let x = -((cam.x * 0.06) % 48); x < VW; x += 48) { R(ctx, '#3a322a', x, 0, 1, 20); }
      R(ctx, '#2e2820', 0, 16, VW, 3); R(ctx, '#5a5044', 0, 16, VW, 1);
      tiled(ctx, this.props, cam.x, 0.22);
      // Cotton-wool smoke on strings, bobbing over the funnels.
      for (const fx of this.funnels) {
        const x = loopX(fx, cam.x, 0.22, 640) + 40;
        if (x < -30 || x > VW + 30) continue;
        for (let k = 0; k < 3; k++) {
          const px = x + k * 9 + Math.sin(t * 1.3 + k + fx) * 2, py = 56 - k * 9 + Math.sin(t * 2 + k * 2) * 1.5;
          line(ctx, [[px, 19], [px, py - 5]], '#6a6052', 0.5);
          disc(ctx, px, py, 6 - k, '#d8d0be'); disc(ctx, px + 3, py + 1, 4 - k * 0.5, '#bcb4a2'); disc(ctx, px - 2, py - 2, 3, '#ece4d2');
        }
      }
      // Wave machine at the foot of the set, each row sliding the other way.
      for (let k = 0; k < 4; k++) {
        const dir = k % 2 ? 1 : -1, off = ((t * 14 * dir + cam.x * (0.3 + k * 0.08)) % 32 + 32) % 32;
        KF.blit(ctx, this.wave[k], -off - 16, 150 + k * 14);
      }
      R(ctx, '#2a241c', 0, 206, VW, 10);
      // Studio lights and the crew in front of the set. They lean in when you die.
      const cheer = mood.cheer || 0;
      for (let k = 0; k < 2; k++) {
        const x = loopX(80 + k * 330, cam.x, 0.55, 660) + 40;
        if (x < -60 || x > VW + 60) continue;
        ctx.globalAlpha = 0.08 + cheer * 0.06; ctx.fillStyle = '#fff6dc';
        ctx.beginPath(); ctx.moveTo(x + 6, 102); ctx.lineTo(x + 120, 200); ctx.lineTo(x - 40, 200); ctx.fill(); ctx.globalAlpha = 1;
        R(ctx, '#0c0a08', x + 5, 104, 2, 70); line(ctx, [[x + 6, 170], [x - 6, 180]], '#0c0a08', 1); line(ctx, [[x + 6, 170], [x + 18, 180]], '#0c0a08', 1);
        R(ctx, '#0c0a08', x - 2, 94, 16, 12); R(ctx, '#f8f0d8', x + 10, 96, 3, 8);
      }
      const camX = loopX(250, cam.x, 0.55, 660) + 40;
      if (camX > -60 && camX < VW + 60) { // hand-cranked camera, cameraman, director's megaphone
        const y = 132;
        R(ctx, '#0c0a08', camX, y, 22, 14); disc(ctx, camX + 6, y - 4, 6, '#0c0a08'); disc(ctx, camX + 18, y - 4, 6, '#0c0a08');
        R(ctx, '#0c0a08', camX + 22, y + 4, 8, 6); line(ctx, [[camX + 11, y + 14], [camX + 2, y + 44]], '#0c0a08', 1); line(ctx, [[camX + 11, y + 14], [camX + 20, y + 44]], '#0c0a08', 1);
        const a = t * 6; line(ctx, [[camX - 2, y + 7], [camX - 2 + Math.cos(a) * 4, y + 7 + Math.sin(a) * 4]], '#0c0a08', 1);
        R(ctx, '#0c0a08', camX - 14, y - 6 - cheer * 3, 8, 28); disc(ctx, camX - 10, y - 10 - cheer * 3, 4, '#0c0a08'); R(ctx, '#0c0a08', camX - 16, y - 14 - cheer * 3, 12, 2);
        const dx = camX + 44, hop = Math.round(Math.abs(Math.sin(t * 12)) * cheer * 4);
        R(ctx, '#0c0a08', dx, y - hop, 8, 30); disc(ctx, dx + 4, y - 4 - hop, 4, '#0c0a08'); R(ctx, '#0c0a08', dx + 1, y - 9 - hop, 6, 2);
        ctx.fillStyle = '#0c0a08'; ctx.beginPath(); ctx.moveTo(dx - 2, y + 4 - hop); ctx.lineTo(dx - 12, y - 2 - hop); ctx.lineTo(dx - 12, y + 10 - hop); ctx.fill();
        // clapperboard: the take number is your attempt
        const bx = dx + 20, by = 160;
        R(ctx, '#0c0a08', bx - 1, by - 1, 34, 22); R(ctx, '#2a2620', bx, by, 32, 20);
        ctx.save(); ctx.translate(bx, by); ctx.rotate(cheer > 0.6 ? -0.5 : -0.12);
        for (let i = 0; i < 4; i++) R(ctx, i % 2 ? '#e8e0cc' : '#0c0a08', i * 8, -4, 8, 4);
        ctx.restore();
        F().draw(ctx, `TAKE ${deaths() + 1}`, bx + 16, by + 7, '#e8e0cc', 1, 'center');
      }
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid') { // pier: plank deck on cross-braced pilings
        R(ctx, '#3a3026', x, y, 16, 16);
        R(ctx, '#251e16', x + 2, y, 3, 16); R(ctx, '#251e16', x + 11, y, 3, 16);
        line(ctx, [[x + 4, y + 2], [x + 12, y + 14]], '#1c160f', 1); line(ctx, [[x + 12, y + 2], [x + 4, y + 14]], '#1c160f', 1);
        if (e.t) {
          R(ctx, '#f4ead2', x, y, 16, 1); R(ctx, '#c8b898', x, y + 1, 16, 3); R(ctx, '#8a7a5e', x, y + 4, 16, 1); R(ctx, '#1a140e', x, y + 5, 16, 1);
          R(ctx, '#5a4c38', x + Math.floor(seed * 12) + 2, y + 2); R(ctx, '#5a4c38', x + 8 + Math.floor(seed * 5), y + 2);
          if (seed > 0.5) R(ctx, '#a89878', x + 7, y + 1, 1, 3);
        }
        edges(ctx, x, y, e, '#120e0a');
      } else if (art === 'alt') { // shipping crate
        R(ctx, '#b0a080', x, y, 16, 16);
        for (let i = 0; i < 4; i++) R(ctx, '#8a7a5e', x, y + 3 + i * 4, 16, 1);
        R(ctx, '#5a4c38', x, y, 16, 2); R(ctx, '#5a4c38', x, y + 14, 16, 2); R(ctx, '#5a4c38', x, y, 2, 16); R(ctx, '#5a4c38', x + 14, y, 2, 16);
        if (seed > 0.4) { R(ctx, '#3a3026', x + 4, y + 6, 8, 1); R(ctx, '#3a3026', x + 4, y + 9, 6, 1); }
        if (e.t) R(ctx, '#f0e6cc', x, y, 16, 1);
        edges(ctx, x, y, e, '#1a140e');
      } else if (art === 'ice') { // greased plank
        R(ctx, '#d8d4cc', x, y, 16, 16); R(ctx, '#ffffff', x, y, 16, 2); R(ctx, '#ffffff', x + 3 + Math.floor(seed * 8), y + 4, 3, 1);
        edges(ctx, x, y, e, '#1a140e');
      } else { // one-way plank on rope
        R(ctx, '#f4ead2', x, y, 16, 1); R(ctx, '#c0b090', x, y + 1, 16, 2); R(ctx, '#3a3026', x, y + 3, 16, 1);
        R(ctx, '#8a7a5e', x + 2, y + 4, 1, 3); R(ctx, '#8a7a5e', x + 13, y + 4, 1, 3);
      }
    },
  });

  // =====================================================================================
  // 2. BLUEPRINT: the stage is an engineering drawing of the harbour. Bright ink becomes white
  //    linework, edges are traced, the paper stays blueprint blue.
  // =====================================================================================
  const BP = { paper: [20, 64, 140], ink: [236, 244, 255] };
  let bpL = null, bpE = null;
  KF.Env.add('blueprint', {
    name: 'DRAWING', bg: '#0a0c10',
    signBoard: '#0a0c10', signInk: '#ffffff', signPost: '#ffffff',
    zone: { gravity: '#ffffff', reverse: '#9aa0b0' },
    build() {
      const c = (this.sheet = KF.makeHi(900, VH)), x = c.getContext('2d'), ink = '#9aa0aa', faint = '#787e8a';
      const T = (s, px, py, col = ink, a = 'left') => F().draw(x, s, px, py, col, 1, a);
      const dim = (x0, y0, x1, y1, label) => { // dimension line with arrowheads and label
        line(x, [[x0, y0], [x1, y1]], ink); const h = x0 === x1;
        for (const [px, py, s] of [[x0, y0, 1], [x1, y1, -1]]) h ? line(x, [[px - 2, py + 3 * s], [px, py], [px + 2, py + 3 * s]], ink) : line(x, [[px + 3 * s, py - 2], [px, py], [px + 3 * s, py + 2]], ink);
        h ? T(label, x0 + 3, (y0 + y1) / 2 - 3) : T(label, (x0 + x1) / 2, y0 - 9, ink, 'center');
      };
      // Lighthouse in elevation.
      const lx = 60;
      line(x, [[lx, 150], [lx + 8, 46], [lx + 24, 46], [lx + 32, 150]], ink);
      line(x, [[lx + 4, 100], [lx + 28, 100]], faint); line(x, [[lx + 6, 74], [lx + 26, 74]], faint);
      x.strokeStyle = ink; x.lineWidth = 0.5; x.strokeRect(lx + 6.5, 30.5, 19, 15); x.strokeRect(lx + 3.5, 44.5, 25, 2);
      line(x, [[lx + 6, 30], [lx + 16, 20], [lx + 26, 30]], ink);
      line(x, [[lx + 16, 20], [lx + 16, 150]], faint);
      dim(lx - 10, 20, lx - 10, 150, 'H 24.0M');
      T('FIG. 1  LIGHTHOUSE', lx + 34, 120);
      // Steamship profile.
      const sx = 230;
      line(x, [[sx, 118], [sx + 150, 118], [sx + 140, 148], [sx + 12, 148], [sx, 118]], ink);
      line(x, [[sx - 6, 140], [sx + 160, 140]], faint); T('WL', sx + 162, 137, faint);
      x.strokeRect(sx + 40.5, 98.5, 70, 20); x.strokeRect(sx + 56.5, 70.5, 12, 28); x.strokeRect(sx + 80.5, 70.5, 12, 28);
      for (let i = 0; i < 9; i++) { x.beginPath(); x.arc(sx + 18 + i * 14, 128, 2, 0, 7); x.stroke(); }
      line(x, [[sx + 20, 118], [sx + 20, 56], [sx + 130, 118]], faint); line(x, [[sx + 130, 118], [sx + 130, 60]], ink);
      dim(sx, 170, sx + 150, 170, 'LOA 46.5M');
      T('FIG. 2  S.S. ROLLO, PROFILE', sx + 100, 88);
      // Compass rose.
      const cx = 560, cy = 70;
      x.beginPath(); x.arc(cx, cy, 22, 0, 7); x.stroke(); x.beginPath(); x.arc(cx, cy, 16, 0, 7); x.stroke();
      line(x, [[cx, cy - 28], [cx + 4, cy], [cx, cy + 28], [cx - 4, cy], [cx, cy - 28]], ink);
      line(x, [[cx - 28, cy], [cx, cy + 4], [cx + 28, cy], [cx, cy - 4], [cx - 28, cy]], ink);
      T('N', cx, cy - 38, ink, 'center');
      // Crane with callouts.
      const kx = 680;
      line(x, [[kx, 150], [kx, 50], [kx + 20, 50], [kx + 20, 150]], ink);
      for (let y = 50; y < 150; y += 14) line(x, [[kx, y], [kx + 20, y + 14]], faint);
      line(x, [[kx - 50, 46], [kx + 80, 46]], ink); line(x, [[kx - 40, 46], [kx - 40, 90]], faint); x.strokeRect(kx - 46.5, 90.5, 12, 8);
      line(x, [[kx + 30, 70], [kx + 60, 40]], faint); T('GANTRY CRANE 12T', kx + 62, 34);
      T('BOLLARD (TYP.)', 440, 150); line(x, [[460, 158], [470, 168]], faint);
      T('SECTION A-A', 800, 40); line(x, [[790, 52], [890, 52]], ink);
      T('SCALE 1:200', 800, 60, faint);
      for (let gx = 0; gx < 900; gx += 64) T(String.fromCharCode(65 + gx / 64), gx + 30, 6, faint);
    },
    background(ctx, cam, t, mood) {
      R(ctx, '#0a0c10', 0, 0, VW, VH);
      tiled(ctx, this.sheet, cam.x, 0.2);
      // sea section: dashed water line and wave hatch, drifting
      const off = (t * 10 + cam.x * 0.3) % 12;
      ctx.strokeStyle = '#9aa0ac'; ctx.lineWidth = 0.5; ctx.beginPath();
      for (let x = -off; x < VW; x += 12) { ctx.moveTo(x, 190); ctx.lineTo(x + 7, 190); }
      for (let x = -off * 2; x < VW; x += 24) { ctx.moveTo(x, 200); ctx.quadraticCurveTo(x + 6, 196, x + 12, 200); ctx.moveTo(x + 6, 208); ctx.quadraticCurveTo(x + 12, 204, x + 18, 208); }
      ctx.stroke();
      // a drafting cursor sweeping a measurement across the page
      const mx = (t * 40) % (VW + 80) - 40;
      line(ctx, [[mx, 24], [mx, 180]], '#565c68');
      F().draw(ctx, `X=${Math.floor(cam.x + mx)}`, mx + 3, 64, '#7a808c');
      if (mood.cheer > 0.3) { // the checker rejects your attempt
        ctx.save(); ctx.translate(VW - 110, 70); ctx.rotate(-0.18); ctx.globalAlpha = Math.min(1, mood.cheer);
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.strokeRect(-36, -9, 72, 18); F().draw(ctx, 'REJECTED', 0, -3, '#ffffff', 1, 'center');
        ctx.restore(); ctx.globalAlpha = 1;
      }
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid' || art === 'ice') { // cut section: 45-degree hatch inside a crisp outline
        R(ctx, '#0a0c10', x, y, 16, 16);
        ctx.strokeStyle = art === 'ice' ? '#ffffff' : '#a0a6b2'; ctx.lineWidth = 0.5; ctx.beginPath();
        const s = art === 'ice' ? 8 : 4, o = (x + y) % s;
        for (let k = -16 - o; k < 16; k += s) { ctx.moveTo(x + Math.max(0, k), y + Math.max(0, -k)); ctx.lineTo(x + Math.min(16, k + 16), y + Math.min(16, 16 - k)); }
        ctx.stroke();
        if (e.t) { R(ctx, '#ffffff', x, y, 16, 1.5); }
        if (e.l) R(ctx, '#ffffff', x, y, 1, 16);
        if (e.r) R(ctx, '#ffffff', x + 15, y, 1, 16);
        if (e.b) R(ctx, '#ffffff', x, y + 15, 16, 1);
      } else if (art === 'alt') { // box symbol: square with diagonals
        R(ctx, '#0a0c10', x, y, 16, 16);
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.75; ctx.strokeRect(x + 0.5, y + 0.5, 15, 15);
        line(ctx, [[x + 1, y + 1], [x + 15, y + 15]], '#a0a6b2'); line(ctx, [[x + 15, y + 1], [x + 1, y + 15]], '#a0a6b2');
        if (e.t) R(ctx, '#ffffff', x, y, 16, 1.5);
      } else { // one-way: thin member with a hidden-line centre
        R(ctx, '#ffffff', x, y, 16, 1); R(ctx, '#ffffff', x, y + 3, 16, 0.5);
        for (let k = 0; k < 16; k += 4) R(ctx, '#a0a6b2', x + k, y + 1.75, 2, 0.5);
      }
    },
  }, {
    // Bright ink -> white lines, sprite edges traced, everything else blueprint blue.
    post(d, W, H) {
      const n = W * H;
      if (!bpL || bpL.length !== n) { bpL = new Uint8Array(n); bpE = new Uint8Array(n); }
      const L = bpL, E = bpE;
      for (let i = 0; i < n; i++) L[i] = lum(d, i * 4);
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        const gx = -L[i - W - 1] - 2 * L[i - 1] - L[i + W - 1] + L[i - W + 1] + 2 * L[i + 1] + L[i + W + 1];
        const gy = -L[i - W - 1] - 2 * L[i - W] - L[i - W + 1] + L[i + W - 1] + 2 * L[i + W] + L[i + W + 1];
        E[i] = Math.min(255, (Math.abs(gx) + Math.abs(gy)) >> 2);
      }
      const [pr, pg, pb] = BP.paper, [ir, ig, ib] = BP.ink;
      for (let i = 0; i < n; i++) {
        const o = i * 4, l = L[i];
        let v = l > 70 ? (l - 70) / 150 : 0;
        const e = E[i] > 60 ? (E[i] - 60) / 70 : 0;
        if (e > v) v = e;
        if (v > 1) v = 1;
        const f = l * 0.06;
        d[o] = pr + f + (ir - pr) * v; d[o + 1] = pg + f + (ig - pg) * v; d[o + 2] = pb + f + (ib - pb) * v;
      }
    },
  });

  // =====================================================================================
  // 3. AR MODE: a phone held up on a seaside promenade. The stage is a hologram floating over
  //    the real pavement; little AR critters hang about on it.
  // =====================================================================================
  let promenade = null;
  function buildPromenade() {
    const c = KF.makeHi(VW + 200, VH), x = c.getContext('2d'), W = VW + 200, rnd = U.rng(77);
    const sky = x.createLinearGradient(0, 0, 0, 46); sky.addColorStop(0, '#6c9cc8'); sky.addColorStop(1, '#bcd4e4');
    x.fillStyle = sky; x.fillRect(0, 0, W, 46);
    for (let k = 0; k < 8; k++) { const cx = rnd() * W, cy = 8 + rnd() * 22; for (let j = 0; j < 5; j++) disc(x, cx + j * 6, cy + Math.sin(j * 2) * 2, 4 + rnd() * 3, 'rgba(255,255,255,0.8)'); }
    // sea, horizon, a pier with a ferris wheel in the distance
    R(x, '#3e7694', 0, 30, W, 16); R(x, '#5a90aa', 0, 30, W, 1);
    for (let k = 0; k < 40; k++) R(x, 'rgba(255,255,255,0.5)', rnd() * W, 32 + rnd() * 12, 3 + rnd() * 5, 0.5);
    R(x, '#5a5048', 300, 24, 120, 3); for (let px = 302; px < 420; px += 8) R(x, '#5a5048', px, 27, 1, 6);
    x.strokeStyle = '#6a5a58'; x.lineWidth = 0.75; x.beginPath(); x.arc(400, 12, 11, 0, 7); x.stroke();
    for (let a = 0; a < 6; a++) line(x, [[400, 12], [400 + Math.cos(a) * 11, 12 + Math.sin(a) * 11]], '#6a5a58');
    line(x, [[394, 24], [400, 12], [406, 24]], '#6a5a58', 1);
    // railing + lamp posts on the promenade edge
    R(x, '#e8ecee', 0, 40, W, 1.5); R(x, '#9aa4aa', 0, 44, W, 1);
    for (let px = 4; px < W; px += 10) R(x, '#c8d0d4', px, 40, 1, 6);
    for (let px = 30; px < W; px += 140) { R(x, '#4a5258', px, 6, 2, 40); R(x, '#4a5258', px - 3, 5, 8, 2); R(x, '#f8f4d8', px - 2, 7, 6, 2); }
    // pavement, warm sandstone slabs in perspective
    const pg = x.createLinearGradient(0, 46, 0, VH); pg.addColorStop(0, '#b4aa9c'); pg.addColorStop(1, '#8a7e70');
    x.fillStyle = pg; x.fillRect(0, 46, W, VH - 46);
    for (let k = 0; k < 9; k++) { const y = 46 + Math.pow(k / 8, 1.6) * (VH - 46); R(x, 'rgba(60,50,40,0.35)', 0, y, W, 0.5); }
    for (let k = -20; k < 30; k++) line(x, [[W / 2 + k * 14, 46], [W / 2 + k * 60, VH]], 'rgba(60,50,40,0.3)');
    // a bench and a bin
    R(x, '#6a4a30', 120, 54, 34, 3); R(x, '#6a4a30', 120, 50, 34, 2); R(x, '#3a3a3a', 122, 57, 2, 6); R(x, '#3a3a3a', 150, 57, 2, 6);
    R(x, '#2e5a3a', 470, 50, 10, 14); R(x, '#1e3a26', 470, 50, 10, 2);
    return c;
  }
  KF.Env.add('pocket', {
    name: 'AR', bg: '#000000',
    signBoard: '#ffffff', signInk: '#1a60a0', signPost: '#5ae0ff',
    zone: { gravity: '#7a6aff', reverse: '#ff5ac8' },
    build() {},
    background(ctx, cam, t, mood) {
      ctx.clearRect(0, 0, VW, VH); // the camera feed shows through behind the hologram
      const cheer = mood.cheer || 0;
      // AR critters and map pins anchored in the world
      for (let k = 0; k < 6; k++) {
        const wx = 140 + k * 230, x = Math.round(wx - cam.x * 0.9), y = 108 + (k % 3) * 14 - cam.y * 0.9;
        if (x < -30 || x > VW + 30) continue;
        const bob = Math.sin(t * 3 + k) * 3 - Math.abs(Math.sin(t * 14 + k)) * cheer * 8;
        ctx.globalAlpha = 0.35; disc(ctx, x, y + 30, 6, '#002030'); ctx.globalAlpha = 1;
        if (k % 2) { // a round, smug critter
          disc(ctx, x, y + bob, 8, '#1a2030'); disc(ctx, x, y + bob, 7, ['#ffd040', '#ff7ab0', '#7aff9a'][k % 3]);
          R(ctx, '#1a2030', x - 3, y - 2 + bob, 2, 2); R(ctx, '#1a2030', x + 2, y - 2 + bob, 2, 2); R(ctx, '#1a2030', x - 2, y + 3 + bob, 4, 1);
          R(ctx, '#1a2030', x - 6, y - 10 + bob, 2, 4); R(ctx, '#1a2030', x + 4, y - 10 + bob, 2, 4);
          F().draw(ctx, 'CP 12', x, y - 22 + bob, '#ffffff', 1, 'center', '#1a2030');
        } else { // location pin
          disc(ctx, x, y + bob, 6, '#1a2030'); disc(ctx, x, y + bob, 5, '#3ad0ff'); disc(ctx, x, y + bob, 2, '#ffffff');
          ctx.fillStyle = '#3ad0ff'; ctx.beginPath(); ctx.moveTo(x - 4, y + 3 + bob); ctx.lineTo(x, y + 12 + bob); ctx.lineTo(x + 4, y + 3 + bob); ctx.fill();
        }
      }
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'oneway') {
        R(ctx, 'rgba(90,230,255,0.45)', x, y, 16, 3); R(ctx, '#eaffff', x, y, 16, 1);
        return;
      }
      const fill = art === 'alt' ? 'rgba(255,90,200,0.5)' : art === 'ice' ? 'rgba(200,250,255,0.7)' : 'rgba(40,190,255,0.42)';
      const edge = art === 'alt' ? '#ffb0f0' : '#a0f4ff';
      R(ctx, fill, x, y, 16, 16);
      R(ctx, 'rgba(255,255,255,0.18)', x + 7.5, y, 0.5, 16); R(ctx, 'rgba(255,255,255,0.18)', x, y + 7.5, 16, 0.5);
      if (e.t) { R(ctx, '#ffffff', x, y, 16, 1.5); R(ctx, edge, x, y + 1.5, 16, 0.5); }
      if (e.l) R(ctx, edge, x, y, 1, 16);
      if (e.r) R(ctx, edge, x + 15, y, 1, 16);
      if (e.b) R(ctx, edge, x, y + 15, 16, 1);
      if (art === 'alt') F().draw(ctx, '?', x + 8, y + 5, '#ffffff', 1, 'center');
    },
  }, {
    compose(ctx, wc, i) {
      if (!promenade) promenade = buildPromenade();
      // Handheld: the feed sways a little and pans as you walk.
      const sway = Math.sin(i.t * 1.1) * 1.5, pan = ((i.player.worldX || 0) * 0.15) % 200;
      ctx.save(); ctx.translate(sway, Math.sin(i.t * 1.7) * 0.8);
      KF.blit(ctx, promenade, -pan - 4, 0);
      ctx.restore();
      const top = 46, res = wc.width / VW;
      // holographic floor grid under the stage plane
      ctx.strokeStyle = 'rgba(120,230,255,0.25)'; ctx.lineWidth = 0.5; ctx.beginPath();
      for (let k = 1; k < 10; k++) { const tt = k / 10, y = top + (VH - top) * (1 - Math.pow(1 - tt, 0.6)); ctx.moveTo(0, y); ctx.lineTo(VW, y); }
      ctx.stroke();
      for (let y = top; y < VH; y += 0.5) {
        const tt = (y - top) / (VH - top), sy = VH * (1 - Math.pow(1 - tt, 1.7)), s = U.lerp(0.58, 1.1, tt);
        ctx.drawImage(wc, 0, Math.floor(sy * res), wc.width, 1, VW / 2 - VW * s / 2 + sway * 0.5, y, VW * s, 0.5);
      }
      ctx.globalAlpha = 0.5; ctx.fillStyle = '#9af0ff'; ctx.fillRect(0, top, VW, 0.5); ctx.globalAlpha = 1;
    },
  });

  // =====================================================================================
  // 4. NOIR: a rainy 1940s waterfront alley. Fire escapes, a HOTEL sign, light through blinds,
  //    wet cobbles. Only the lamps, the sign and your own glow cut through the dark.
  // =====================================================================================
  let noirK = null;
  KF.Env.add('noir', {
    name: 'WATERFRONT', bg: '#060608',
    signBoard: '#d8d8d8', signInk: '#101010', signPost: '#2a2a2a',
    zone: { gravity: '#d0d0ff', reverse: '#ffc0e0' },
    build() {
      const rnd = U.rng(19);
      this.lights = [];
      // far skyline across the water
      this.far = KF.makeHi(600, VH); const f = this.far.getContext('2d');
      for (let x = 0; x < 600;) { const w = 14 + rnd() * 30, h = 30 + rnd() * 60; R(f, '#17171c', x, 140 - h, w, h + 20); for (let k = 0; k < w * h / 60; k++) if (rnd() < 0.12) R(f, '#f4f0dc', x + 2 + rnd() * (w - 4), 142 - h + rnd() * h, 1, 1); x += w + 2; }
      // alley walls with fire escapes and windows (one lit through venetian blinds)
      this.wall = KF.makeHi(720, VH); const m = this.wall.getContext('2d');
      this.blinds = []; this.signs = [];
      for (let x = 0; x < 720; x += 240) {
        R(m, '#24242a', x, 10, 150, 150);
        for (let by = 12; by < 160; by += 4) for (let bx = x + ((by / 4) % 2) * 4; bx < x + 150; bx += 8) R(m, '#1c1c22', bx, by, 1, 4);
        for (let by = 14; by < 160; by += 4) R(m, '#1a1a1f', x, by, 150, 0.5);
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
          const wx = x + 14 + c * 46, wy = 24 + r * 44;
          R(m, '#0e0e12', wx, wy, 20, 26); R(m, '#3a3a40', wx - 1, wy + 26, 22, 2);
          if (r === 1 && c === 1) this.blinds.push({ x: wx, y: wy });
        }
        for (let r = 0; r < 3; r++) { // fire escape landings with zig-zag stairs
          const ly = 52 + r * 44;
          R(m, '#0a0a0c', x + 4, ly, 120, 2); for (let k = 0; k < 120; k += 6) R(m, '#0a0a0c', x + 4 + k, ly - 8, 1, 8); R(m, '#0a0a0c', x + 4, ly - 8, 120, 1);
          if (r < 2) for (let k = 0; k < 40; k++) R(m, '#0a0a0c', x + 80 + k, ly + 2 + k, 2, 1);
        }
        this.signs.push({ x: x + 162, y: 26 });
        R(m, '#0a0a0c', x + 158, 20, 4, 2); R(m, '#0a0a0c', x + 158, 110, 4, 2);
      }
    },
    background(ctx, cam, t, mood) {
      R(ctx, '#060608', 0, 0, VW, VH);
      tiled(ctx, this.far, cam.x, 0.08, 6);
      // the harbour: black water with broken neon reflections, fog drifting over it
      R(ctx, '#08080c', 0, 150, VW, VH - 150);
      for (let i = 0; i < 26; i++) { const x = ((i * 47 - cam.x * 0.2 + t * 6) % (VW + 30) + VW + 30) % (VW + 30) - 15, y = 154 + (i * 13) % 60; R(ctx, i % 4 ? '#3a3a44' : '#d8d8e0', x, y, 4 + (i % 3) * 3, 0.5); }
      tiled(ctx, this.wall, cam.x, 0.35, 0);
      const L = (this.lit = []);
      const flick = U.hash2(Math.floor(t * 9), 3) > 0.12;
      for (const s of this.signs) { // vertical HOTEL neon, one letter on the blink
        const x = loopX(s.x, cam.x, 0.35, 720) + 40;
        if (x < -20 || x > VW + 20) continue;
        R(ctx, '#0a0a0c', x - 1, s.y - 1, 14, 86);
        [...'HOTEL'].forEach((ch, k) => { const on = k !== 3 || flick; F().draw(ctx, ch, x + 6, s.y + 4 + k * 16, on ? '#ffffff' : '#3a3a3a', 2, 'center'); });
        L.push({ x: x + 6, y: s.y + 42, r: 34 });
      }
      for (const b of this.blinds) { // light through venetian blinds
        const x = loopX(b.x, cam.x, 0.35, 720) + 40;
        if (x < -60 || x > VW + 20) continue;
        for (let k = 0; k < 6; k++) R(ctx, '#f0ecd8', x + 1, b.y + 2 + k * 4, 18, 2);
        ctx.save(); ctx.beginPath(); ctx.moveTo(x + 1, b.y + 2); ctx.lineTo(x + 19, b.y + 2); ctx.lineTo(x + 58, b.y + 90); ctx.lineTo(x + 22, b.y + 90); ctx.closePath(); ctx.clip();
        ctx.globalAlpha = 0.22;
        for (let k = 0; k < 12; k++) R(ctx, '#e0dccc', x, b.y + 2 + k * 7.5, 60, 4);
        ctx.restore(); ctx.globalAlpha = 1;
        L.push({ x: x + 16, y: b.y + 30, r: 30 });
      }
      // street lamps on the quay, a man in a trench coat smoking under one
      for (let k = 0; k < 3; k++) {
        const x = loopX(90 + k * 260, cam.x, 0.6, 780) + 40;
        if (x < -40 || x > VW + 40) continue;
        R(ctx, '#0c0c10', x, 94, 2, 80); R(ctx, '#0c0c10', x - 4, 90, 10, 4); R(ctx, '#ffffff', x - 2, 94, 6, 2);
        ctx.globalAlpha = 0.12; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x - 2, 96); ctx.lineTo(x + 4, 96); ctx.lineTo(x + 30, 176); ctx.lineTo(x - 28, 176); ctx.fill(); ctx.globalAlpha = 1;
        L.push({ x: x + 1, y: 130, r: 46 });
        if (k === 1) {
          const mx = x + 14, my = 150 - Math.round((mood.cheer || 0) * 2);
          R(ctx, '#0a0a0c', mx, my, 9, 24); R(ctx, '#0a0a0c', mx - 1, my + 8, 11, 12); disc(ctx, mx + 4.5, my - 3, 3.5, '#0a0a0c');
          R(ctx, '#0a0a0c', mx - 2, my - 6, 13, 2); R(ctx, '#0a0a0c', mx + 1, my - 9, 7, 3);
          const ember = 0.6 + 0.4 * Math.sin(t * 2.3);
          ctx.globalAlpha = ember; R(ctx, '#ffffff', mx - 1, my - 1, 1, 1); ctx.globalAlpha = 1;
          if (Math.sin(t * 2.3) > 0.7) L.push({ x: mx - 1, y: my - 1, r: 8 });
        }
      }
      // fog bands
      ctx.globalAlpha = 0.09; ctx.fillStyle = '#d0d0d8';
      for (let k = 0; k < 3; k++) { const x = ((t * (6 + k * 3) + k * 140 - cam.x * 0.5) % (VW + 200) + VW + 200) % (VW + 200) - 200; ctx.fillRect(x, 150 + k * 9, 200, 7); }
      ctx.globalAlpha = 1;
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid' || art === 'ice') { // wet cobbles over a brick quay wall
        R(ctx, '#2a2a30', x, y, 16, 16);
        for (let k = 0; k < 16; k += 4) R(ctx, '#1c1c22', x, y + k + 3, 16, 1);
        for (let k = 0; k < 4; k++) R(ctx, '#1c1c22', x + ((k % 2) * 4 + 3), y + k * 4, 1, 3);
        if (e.t) {
          for (let k = 0; k < 4; k++) { R(ctx, '#7a7a84', x + k * 4, y, 3.5, 3); R(ctx, '#d8d8e0', x + k * 4 + 0.5, y, 2, 1); }
          R(ctx, '#ffffff', x, y, 16, 0.5);
          if (seed > 0.6) R(ctx, '#bcbcc8', x + 3, y + 4, 6, 0.5); // puddle shine
          R(ctx, '#0a0a0c', x, y + 3, 16, 1);
        }
        if (art === 'ice') { R(ctx, 'rgba(255,255,255,0.4)', x, y, 16, 16); }
        edges(ctx, x, y, e, '#060608');
      } else if (art === 'alt') { // trash cans and crates
        R(ctx, '#5a5a62', x + 1, y + 2, 14, 14); R(ctx, '#3a3a42', x + 1, y + 2, 14, 1);
        for (let k = 0; k < 4; k++) R(ctx, '#46464e', x + 3 + k * 3, y + 4, 1, 11);
        R(ctx, '#c8c8d0', x, y, 16, 2); R(ctx, '#ffffff', x, y, 16, 0.5); R(ctx, '#2a2a30', x + 6, y - 1, 4, 1);
        edges(ctx, x, y, e, '#060608');
      } else { // fire-escape grating
        R(ctx, '#d0d0d8', x, y, 16, 1); R(ctx, '#5a5a64', x, y + 1, 16, 2);
        for (let k = 0; k < 16; k += 3) R(ctx, '#18181c', x + k, y + 1, 1, 2);
        R(ctx, '#3a3a42', x + 7, y + 3, 1, 5);
      }
    },
  }, {
    // Grey, hard contrast, dark except near you, the lamps, the sign and the lit window.
    post(d, W, H, i) {
      const n = W * H, res = i.res;
      if (!noirK || noirK.length !== n) noirK = new Float32Array(n);
      const K = noirK, flash = i.t % 6 < 0.12;
      const th = KF.Themes.get('env_noir'), lights = [{ x: i.player.x, y: i.player.y, r: 84 }].concat(th.lit || []);
      K.fill(flash ? 1 : 0.4);
      if (!flash) for (const l of lights) {
        const cx = l.x * res, cy = l.y * res, r = l.r * res, r2 = r * r;
        const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(W, Math.ceil(cx + r)), y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(H, Math.ceil(cy + r));
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
          const dd = (x - cx) * (x - cx) + (y - cy) * (y - cy);
          if (dd >= r2) continue;
          const k = 1 - Math.sqrt(dd) / r, v = k > 0.45 ? 1 : k / 0.45, j = y * W + x;
          if (v > K[j]) K[j] = v;
        }
      }
      for (let k = 0, o = 0; k < n; k++, o += 4) {
        let l = lum(d, o);
        l = (l - 90) * 1.3 + 112; // lifted: shadows stay grey, not black
        if (l > 228) l = 255; else l *= K[k]; // emissive whites stay lit in the dark
        l = l < 0 ? 0 : l > 255 ? 255 : l;
        d[o] = d[o + 1] = d[o + 2] = l;
      }
    },
  });

  // =====================================================================================
  // 5. CGA: a 1980s DOS pirate adventure on a ship's deck, four colours, text parser and all.
  // =====================================================================================
  const CGA = [[0, 0, 0], [85, 255, 255], [255, 85, 255], [255, 255, 255]];
  let cgaLut = null;
  const CK = '#000000', CC = '#55ffff', CM = '#ff55ff', CW = '#ffffff';
  KF.Env.add('cga', {
    name: 'PIRATES', bg: CK,
    signBoard: CW, signInk: CK, signPost: CM,
    zone: { gravity: CC, reverse: CM },
    build() {
      // far: island with palm, enemy ship on the horizon
      this.far = KF.makeHi(600, VH); const f = this.far.getContext('2d');
      R(f, CM, 80, 96, 60, 8); R(f, CM, 96, 90, 30, 6); R(f, CC, 112, 70, 2, 22);
      for (let k = -3; k <= 3; k++) R(f, CC, 113 + k * 3, 68 + Math.abs(k), 3, 2);
      R(f, CM, 330, 92, 46, 8); R(f, CM, 336, 100, 34, 3); R(f, CK, 352, 62, 2, 30); R(f, CW, 342, 66, 22, 14); R(f, CW, 344, 82, 18, 8); R(f, CK, 350, 70, 6, 5);
      // near: our ship's masts, sails and rigging
      this.rig = KF.makeHi(560, VH); const r = this.rig.getContext('2d');
      for (const mx of [120, 400]) {
        R(r, CM, mx, 0, 5, 176); R(r, CK, mx + 4, 0, 1, 176);
        R(r, CW, mx - 50, 20, 105, 56); R(r, CC, mx - 50, 70, 105, 6); R(r, CK, mx - 52, 18, 109, 2);
        R(r, CW, mx - 40, 86, 85, 46); R(r, CC, mx - 40, 126, 85, 6); R(r, CK, mx - 42, 84, 89, 2);
        if (mx === 120) { // skull and crossbones
          R(r, CK, mx - 8, 36, 20, 16); R(r, CW, mx - 4, 40, 4, 4); R(r, CW, mx + 4, 40, 4, 4); R(r, CK, mx - 4, 52, 12, 4);
          line(r, [[mx - 16, 56], [mx + 20, 68]], CK, 2); line(r, [[mx + 20, 56], [mx - 16, 68]], CK, 2);
        }
        for (let k = 0; k < 6; k++) line(r, [[mx + 2, 4 + k * 4], [mx - 90 + k * 8, 176]], CC, 0.75), line(r, [[mx + 2, 4 + k * 4], [mx + 94 - k * 8, 176]], CC, 0.75);
        R(r, CK, mx - 8, 0, 21, 8); R(r, CM, mx - 6, 2, 17, 4); // crow's nest
      }
    },
    background(ctx, cam, t, mood) {
      // night sky: stars, a chunky moon with cyan cloud bands, waves, gulls
      R(ctx, CK, 0, 0, VW, 112);
      for (let k = 0; k < 40; k++) { const x = (k * 89 + 13) % VW, y = (k * 37) % 100; if ((k + Math.floor(t * 2)) % 7) R(ctx, k % 3 ? CC : CW, x, y, 1, 1); }
      R(ctx, CW, 296, 14, 16, 16); R(ctx, CW, 292, 18, 24, 8); R(ctx, CC, 300, 18, 3, 3); R(ctx, CC, 306, 24, 2, 2);
      for (let k = 0; k < 4; k++) { const x = ((k * 113 - cam.x * 0.05 + t * 3) % (VW + 60) + VW + 60) % (VW + 60) - 40; for (let j = 0; j < 40; j += 2) { R(ctx, CC, x + j + (k % 2), 34 + k * 11, 1, 1); if (j > 6 && j < 30) R(ctx, CC, x + j + 1, 32 + k * 11, 1, 1); } }
      tiled(ctx, this.far, cam.x, 0.05, 12);
      if ((t % 5) < 0.6) { const x = loopX(352 + 30, cam.x, 0.05, 600) + 40; R(ctx, CW, x, 92 - (t % 5) * 10, 6, 5); } // cannon puff
      R(ctx, CK, 0, 112, VW, VH - 112); R(ctx, CW, 0, 112, VW, 1);
      for (let row = 0; row < 5; row++) {
        const y = 120 + row * 18, sp = 28 + row * 6, sh = Math.floor((t * (4 + row) + cam.x * (0.1 + row * 0.06)) / 2) * 2 % sp;
        for (let x = -sh + (row % 2) * 12; x < VW; x += sp) { R(ctx, CC, x, y, 6 + row, 1); R(ctx, CC, x + 2, y - 1, 2 + row, 1); }
      }
      for (let k = 0; k < 3; k++) { // gulls
        const x = ((t * 18 + k * 140) % (VW + 40)) - 20, y = 40 + k * 14 + Math.sin(t * 2 + k) * 4, w = Math.floor(t * 4 + k) % 2;
        R(ctx, CW, x, y, 3, 1); R(ctx, CW, x + 4, y, 3, 1); R(ctx, CW, x + 3, y + 1 - w, 1, 1);
      }
      tiled(ctx, this.rig, cam.x, 0.55, 0);
      // the crew in the rigging cheer (in four colours) when you fall
      if (mood.cheer > 0.3) for (let k = 0; k < 3; k++) { const x = loopX(80 + k * 190, cam.x, 0.55, 560) + 40, y = 90 - Math.floor(Math.abs(Math.sin(t * 12 + k)) * 6); R(ctx, CK, x, y, 4, 8); R(ctx, CM, x, y - 4, 4, 4); R(ctx, CK, x - 2, y - 6, 1, 5); R(ctx, CK, x + 5, y - 6, 1, 5); }
    },
    tile(ctx, x, y, art, e, seed) {
      if (art === 'solid' || art === 'ice') { // ship's deck planks over the hull
        R(ctx, CC, x, y, 16, 16);
        for (let k = 2; k < 16; k += 4) R(ctx, CK, x, y + k, 16, 1);
        R(ctx, CK, x + (seed > 0.5 ? 5 : 11), y + 3, 1, 3); R(ctx, CK, x + (seed > 0.5 ? 9 : 3), y + 11, 1, 3);
        if (e.t) { R(ctx, CW, x, y, 16, 2); R(ctx, CK, x, y + 2, 16, 1); R(ctx, CK, x + 7, y, 1, 2); }
        if (art === 'ice') { R(ctx, CW, x, y + 3, 16, 13); for (let k = 0; k < 16; k += 4) R(ctx, CC, x + k + 1, y + 5 + (k % 8), 2, 1); }
        edges(ctx, x, y, e, CK);
      } else if (art === 'alt') { // barrel or treasure chest
        if (seed > 0.5) {
          R(ctx, CK, x, y, 16, 16); R(ctx, CM, x + 2, y + 1, 12, 14); R(ctx, CK, x + 2, y + 4, 12, 1); R(ctx, CK, x + 2, y + 11, 12, 1); R(ctx, CC, x + 4, y + 2, 1, 12);
        } else {
          R(ctx, CK, x, y, 16, 16); R(ctx, CM, x + 1, y + 5, 14, 10); R(ctx, CM, x + 1, y + 1, 14, 3); R(ctx, CW, x + 7, y + 6, 2, 3); R(ctx, CC, x + 1, y + 4, 14, 1);
        }
        if (e.t) R(ctx, CW, x, y, 16, 1);
      } else { // rope-slung plank
        R(ctx, CW, x, y, 16, 1); R(ctx, CC, x, y + 1, 16, 2); R(ctx, CK, x, y + 3, 16, 1);
        R(ctx, CW, x + 1, y - 6, 1, 6); R(ctx, CW, x + 14, y - 6, 1, 6);
      }
    },
  }, {
    // True 4-colour CGA (palette 1, high intensity) with ordered dither for in-between colours.
    post(d, W, H) {
      if (!cgaLut) {
        cgaLut = new Uint8Array(32768 * 2);
        for (let i = 0; i < 32768; i++) {
          const r = (i >> 10) << 3, g = ((i >> 5) & 31) << 3, b = (i & 31) << 3;
          const ds = CGA.map((c) => (c[0] - r) ** 2 * 0.3 + (c[1] - g) ** 2 * 0.59 + (c[2] - b) ** 2 * 0.11);
          const order = [0, 1, 2, 3].sort((a, b2) => ds[a] - ds[b2]);
          const a = order[0], b2 = order[1], da = Math.sqrt(ds[a]), db = Math.sqrt(ds[b2]);
          cgaLut[i * 2] = a | (b2 << 2);
          cgaLut[i * 2 + 1] = Math.round((da / (da + db || 1)) * 255); // how far toward the second colour
        }
      }
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const o = (y * W + x) * 4, k = ((d[o] >> 3) << 10) | ((d[o + 1] >> 3) << 5) | (d[o + 2] >> 3);
        const pair = cgaLut[k * 2], mix = cgaLut[k * 2 + 1] / 255;
        const c = CGA[mix > 0.38 + (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) * 0.24 ? pair >> 2 : pair & 3];
        d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2];
      }
    },
    overlay(ctx, i) { // adventure-game text parser along the bottom
      R(ctx, CK, 0, VH - 10, VW, 10); R(ctx, CC, 0, VH - 10, VW, 1);
      const cmds = ['WALK RIGHT', 'JUMP', 'LOOK AT DOOR', 'TRUST DOOR', 'DONT', 'TAKE SPIKES'];
      const s = Math.floor(i.t / 3) % cmds.length, n = Math.min(cmds[s].length, Math.floor((i.t % 3) * 8));
      F().draw(ctx, '> ' + cmds[s].slice(0, n) + (Math.floor(i.t * 3) % 2 ? '_' : ''), 6, VH - 8, CW);
      F().draw(ctx, `SCORE: ${Math.max(0, 210 - deaths() * 5)} OF 210`, VW - 6, VH - 8, CC, 1, 'right');
    },
  });
})(window.KF);
