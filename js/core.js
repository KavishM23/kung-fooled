'use strict';
// Shared namespace, constants and small helpers.
window.KF = window.KF || {};
(function (KF) {
  KF.VIEW_W = 384;
  KF.VIEW_H = 216;
  KF.TILE = 16;
  KF.STEP = 1 / 120; // fixed physics step (seconds)

  KF.util = {
    clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
    lerp: (a, b, t) => a + (b - a) * t,
    approach: (v, target, delta) =>
      v < target ? Math.min(v + delta, target) : Math.max(v - delta, target),
    sign: (v) => (v > 0 ? 1 : v < 0 ? -1 : 0),
    rand: (a, b) => a + Math.random() * (b - a),
    overlap: (a, b) =>
      a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y,
    // Deterministic RNG (mulberry32) so procedural art looks the same every load.
    rng(seed) {
      let a = seed >>> 0;
      return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },
    hash2(x, y) {
      let h = (x * 374761393 + y * 668265263) | 0;
      h = Math.imul(h ^ (h >>> 13), 1274126177);
      return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    },
    deepFreeze(o) {
      if (o && typeof o === 'object' && !Object.isFrozen(o)) {
        Object.freeze(o);
        for (const k of Object.keys(o)) KF.util.deepFreeze(o[k]);
      }
      return o;
    },
  };

  // The screen is drawn in logical 384x216 coordinates, but the real canvas has RES times as
  // many pixels, so sprites and scenery can carry finer pixel detail than the gameplay grid.
  KF.RES = 2;

  KF.makeCanvas = (w, h) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').imageSmoothingEnabled = false;
    return c;
  };
  // A canvas measured in logical units (lw x lh) but backed by RES x more pixels; its context is
  // pre-scaled so drawing code keeps using logical coordinates (0.5 = one real pixel).
  // read: the canvas will be read back every frame (style post-processing).
  KF.makeHi = (lw, lh, res = KF.RES, read = false) => {
    const c = document.createElement('canvas');
    c.width = Math.ceil(lw * res); c.height = Math.ceil(lh * res);
    const x = c.getContext('2d', read ? { willReadFrequently: true } : undefined);
    x.imageSmoothingEnabled = false;
    c.lw = lw; c.lh = lh; c.res = res;
    x.setTransform(res, 0, 0, res, 0, 0);
    return c;
  };
  // Draw any canvas at its logical size.
  KF.blit = (ctx, img, x, y, w = img.lw ?? img.width, h = img.lh ?? img.height) => ctx.drawImage(img, x, y, w, h);
})(window.KF);
