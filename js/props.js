'use strict';
// What a falling block turns out to be. A block that drops out of the sky (js/families/01-devil.js
// skyDrop, and the kit's headline crusher) is out of sight until it falls, so it can look like
// something from its realm: an air-conditioning unit off a rooftop, a studio light, a temple
// statue, a cargo crate... Each is drawn in code to fill the block's box (usually 32 x 32), with
// its base on the bottom edge, so the hitbox and the picture agree.
(function (KF) {
  const R = (ctx, c, x, y, w = 1, h = 1) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const ink = '#14101c';

  const LOOKS = {
    // Rooftop air-conditioning unit: grey box, fan grille, pipes.
    acUnit(ctx, x, y, w, h, t) {
      R(ctx, ink, x, y + 4, w, h - 4); R(ctx, '#9aa4ad', x + 1, y + 5, w - 2, h - 6);
      R(ctx, '#c8d0d6', x + 1, y + 5, w - 2, 2); R(ctx, '#6c757e', x + 1, y + h - 4, w - 2, 3);
      const cx = x + w * 0.35, cy = y + h * 0.55, r = Math.min(w, h) * 0.26;
      ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(cx, cy, r + 1, 0, 7); ctx.fill();
      ctx.fillStyle = '#4b535b'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 14);
      for (let i = 0; i < 3; i++) { ctx.rotate(Math.PI * 2 / 3); R(ctx, '#aeb7bf', -1, -r + 1, 3, r - 1); }
      ctx.restore();
      for (let i = 0; i < 4; i++) R(ctx, '#5c656d', x + w * 0.66, y + 9 + i * 5, w * 0.28, 2);
      R(ctx, '#7d6650', x + 3, y, 3, 5); R(ctx, '#7d6650', x + w - 6, y, 3, 5);
    },
    // Film-studio spotlight on its yoke.
    stageLight(ctx, x, y, w, h) {
      R(ctx, ink, x + w * 0.1, y + 2, w * 0.8, h * 0.62); R(ctx, '#4a4a4a', x + w * 0.1 + 1, y + 3, w * 0.8 - 2, h * 0.62 - 2);
      R(ctx, '#f4efd2', x + w * 0.1 + 3, y + 6, w * 0.8 - 6, h * 0.62 - 10);
      R(ctx, '#ffffff', x + w * 0.3, y + 9, w * 0.3, 4);
      R(ctx, ink, x + w * 0.45, y + h * 0.62, w * 0.1, h * 0.25); R(ctx, ink, x + 2, y + h - 4, w - 4, 4);
      R(ctx, '#777777', x + 3, y + h - 3, w - 6, 2);
    },
    // Cartoon anvil.
    anvil(ctx, x, y, w, h) {
      R(ctx, ink, x, y + h * 0.25, w, h * 0.3); R(ctx, '#3c4250', x + 1, y + h * 0.25 + 1, w - 2, h * 0.3 - 2);
      R(ctx, '#8a93a6', x + 2, y + h * 0.25 + 1, w - 4, 2);
      R(ctx, ink, x + w * 0.3, y + h * 0.55, w * 0.4, h * 0.25); R(ctx, '#3c4250', x + w * 0.3 + 1, y + h * 0.55, w * 0.4 - 2, h * 0.25);
      R(ctx, ink, x + w * 0.12, y + h * 0.8, w * 0.76, h * 0.2); R(ctx, '#3c4250', x + w * 0.12 + 1, y + h * 0.8 + 1, w * 0.76 - 2, h * 0.2 - 2);
      KF.Font.draw(ctx, '1T', x + w / 2, y + h * 0.25 + 2, '#ffffff', 1, 'center');
    },
    // A fridge, out of a suburban window.
    fridge(ctx, x, y, w, h) {
      R(ctx, ink, x + 2, y, w - 4, h); R(ctx, '#e8eaee', x + 3, y + 1, w - 6, h - 2);
      R(ctx, ink, x + 3, y + h * 0.38, w - 6, 1); R(ctx, '#a6adb6', x + w - 8, y + 5, 2, h * 0.25); R(ctx, '#a6adb6', x + w - 8, y + h * 0.45, 2, h * 0.3);
      R(ctx, '#ff6a6a', x + 7, y + 6, 4, 4); R(ctx, '#6ad0ff', x + 12, y + 9, 3, 3);
    },
    // Dockside cargo crate with stencil.
    cargo(ctx, x, y, w, h) {
      R(ctx, ink, x, y, w, h); R(ctx, '#c86a2c', x + 1, y + 1, w - 2, h - 2);
      for (let i = 4; i < w - 2; i += 5) R(ctx, '#9a4a1c', x + i, y + 2, 1, h - 4);
      R(ctx, '#e8a060', x + 1, y + 1, w - 2, 2); R(ctx, ink, x + 2, y + h / 2 - 3, w - 4, 7);
      KF.Font.draw(ctx, 'KF', x + w / 2, y + h / 2 - 2, '#f4d070', 1, 'center');
    },
    // A seated stone guardian.
    statue(ctx, x, y, w, h) {
      R(ctx, ink, x + 2, y + h - 7, w - 4, 7); R(ctx, '#8d887a', x + 3, y + h - 6, w - 6, 5);
      R(ctx, ink, x + w * 0.25, y + 6, w * 0.5, h - 12); R(ctx, '#b3ad9a', x + w * 0.25 + 1, y + 7, w * 0.5 - 2, h - 14);
      R(ctx, ink, x + w * 0.3, y, w * 0.4, 9); R(ctx, '#c8c2ad', x + w * 0.3 + 1, y + 1, w * 0.4 - 2, 7);
      R(ctx, ink, x + w * 0.38, y + 3, 2, 2); R(ctx, ink, x + w * 0.56, y + 3, 2, 2);
      R(ctx, '#8d887a', x + w * 0.25 + 2, y + h * 0.5, w * 0.5 - 4, 2);
    },
    // A bronze temple bell.
    bell(ctx, x, y, w, h) {
      R(ctx, ink, x + w * 0.45, y, w * 0.1, 4);
      ctx.fillStyle = ink; ctx.beginPath(); ctx.moveTo(x + w * 0.25, y + 3); ctx.lineTo(x + w * 0.75, y + 3);
      ctx.lineTo(x + w - 1, y + h); ctx.lineTo(x + 1, y + h); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#9c6a2c'; ctx.beginPath(); ctx.moveTo(x + w * 0.27, y + 4); ctx.lineTo(x + w * 0.73, y + 4);
      ctx.lineTo(x + w - 3, y + h - 1); ctx.lineTo(x + 3, y + h - 1); ctx.closePath(); ctx.fill();
      R(ctx, '#d8a050', x + w * 0.35, y + 7, 2, h - 12); R(ctx, '#6a4418', x + 3, y + h - 6, w - 6, 2);
    },
    // A round boulder.
    boulder(ctx, x, y, w, h) {
      ctx.fillStyle = ink; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2 + 1, w / 2, h / 2 - 1, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#6e6a5a'; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2 + 1, w / 2 - 1, h / 2 - 2, 0, 0, 7); ctx.fill();
      R(ctx, '#9a9580', x + w * 0.3, y + 6, 6, 3); R(ctx, '#4e4a3e', x + w * 0.55, y + h * 0.6, 7, 2);
    },
    // A glitching hologram cube.
    glitchCube(ctx, x, y, w, h, t) {
      const o = Math.floor(t * 20) % 3 - 1;
      R(ctx, '#ff3a8a', x + o, y, w, h); R(ctx, '#3af0ff', x - o, y + 1, w, h - 1);
      R(ctx, '#1a1030', x + 2, y + 3, w - 4, h - 5);
      for (let i = 5; i < h - 3; i += 4) R(ctx, '#3af0ff', x + 3 + (i * 7 % 5), y + i, w - 8, 1);
    },
    // A marble bust on a plinth.
    bust(ctx, x, y, w, h) {
      R(ctx, ink, x + 3, y + h - 8, w - 6, 8); R(ctx, '#f0d8f0', x + 4, y + h - 7, w - 8, 6);
      R(ctx, ink, x + w * 0.2, y + h - 15, w * 0.6, 8); R(ctx, '#ffe8ff', x + w * 0.2 + 1, y + h - 14, w * 0.6 - 2, 6);
      R(ctx, ink, x + w * 0.32, y + 1, w * 0.36, h - 15); R(ctx, '#ffeefa', x + w * 0.32 + 1, y + 2, w * 0.36 - 2, h - 17);
      R(ctx, '#c9a3d9', x + w * 0.4, y + 8, 2, 1); R(ctx, '#c9a3d9', x + w * 0.55, y + 8, 2, 1);
    },
    // A server rack with blinking lights.
    serverRack(ctx, x, y, w, h, t) {
      R(ctx, ink, x + 2, y, w - 4, h); R(ctx, '#2a3240', x + 3, y + 1, w - 6, h - 2);
      for (let i = 0; i < 5; i++) {
        R(ctx, '#11161e', x + 5, y + 3 + i * 6, w - 10, 4);
        R(ctx, (Math.floor(t * 6) + i) % 3 ? '#4cff9a' : '#ff4c6a', x + w - 9, y + 4 + i * 6, 2, 2);
      }
    },
    // A clean white cube (SUPERHOT).
    glassCube(ctx, x, y, w, h) {
      R(ctx, '#d8dde2', x, y, w, h); R(ctx, '#ffffff', x + 1, y + 1, w - 2, h - 2);
      R(ctx, '#e9edf0', x + 1, y + h / 2, w - 2, h / 2 - 1); R(ctx, '#ff2a2a', x + w - 4, y + 2, 2, 2);
    },
    // A question-mark block, but heavier.
    brickBlock(ctx, x, y, w, h, t) {
      R(ctx, ink, x, y, w, h); R(ctx, '#e09a2c', x + 1, y + 1, w - 2, h - 2); R(ctx, '#f8d878', x + 1, y + 1, w - 2, 2);
      for (const [px, py] of [[2, 2], [w - 4, 2], [2, h - 4], [w - 4, h - 4]]) R(ctx, ink, x + px, y + py, 2, 2);
      KF.Font.draw(ctx, Math.floor(t * 3) % 2 ? '!' : '?', x + w / 2, y + h / 2 - 3, '#7a3000', 1, 'center');
    },
    crate(ctx, x, y, w, h) {
      R(ctx, ink, x, y, w, h); R(ctx, '#9a6a3a', x + 1, y + 1, w - 2, h - 2);
      R(ctx, '#c08a50', x + 1, y + 1, w - 2, 2); R(ctx, '#6a4422', x + 3, y + 3, 2, h - 6); R(ctx, '#6a4422', x + w - 5, y + 3, 2, h - 6);
    },
  };

  KF.Props = {
    has: (look) => !!LOOKS[look],
    draw(ctx, look, x, y, w, h, t = 0) { (LOOKS[look] || LOOKS.crate)(ctx, x, y, w, h, t); },
    kinds: Object.keys(LOOKS),
  };
})(window.KF);
