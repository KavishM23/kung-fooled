'use strict';
// Axis-separated AABB movement against the world's solids (tiles + dynamic bodies).
// Bodies need: x, y, w, h and optionally gravDir (1 = down, -1 = up).
(function (KF) {
  const EPS = 0.01;

  // Was `s` on the far side of the body before it moved along this axis?
  function aheadX(prevX, b, s, dx) {
    return dx > 0 ? prevX + b.w <= s.x + EPS : prevX >= s.x + s.w - EPS;
  }
  function aheadY(prevY, b, s, dy) {
    return dy > 0 ? prevY + b.h <= s.y + EPS : prevY >= s.y + s.h - EPS;
  }

  KF.Physics = {
    // Returns true if the body was stopped by a wall.
    moveX(b, world, dx) {
      if (!dx) return false;
      const prevX = b.x;
      b.x += dx;
      let hit = false;
      for (const s of world.solidsIn(b.x, b.y, b.w, b.h, b)) {
        if (s.oneWay || !aheadX(prevX, b, s, dx)) continue;
        if (dx > 0) b.x = Math.min(b.x, s.x - b.w);
        else b.x = Math.max(b.x, s.x + s.w);
        hit = true;
      }
      return hit;
    },

    // Returns the sign of the blocked direction (1 = hit something below, -1 = above, 0 = free).
    // `nudge` = max pixels of corner correction when moving against gravity (bumping a ceiling edge).
    moveY(b, world, dy, nudge = 0) {
      if (!dy) return 0;
      const g = b.gravDir || 1;
      const prevY = b.y;
      b.y += dy;
      const blockers = world.solidsIn(b.x, b.y, b.w, b.h, b).filter((s) => {
        if (s.oneWay && dy * g <= 0) return false; // one-way platforms only stop "falling"
        return aheadY(prevY, b, s, dy);
      });
      if (!blockers.length) return 0;

      // Corner correction: clipping a ceiling edge by a few pixels slides you past it instead.
      if (nudge && dy * g < 0) {
        for (let n = 1; n <= nudge; n++) {
          for (const d of [-1, 1]) {
            if (!world.overlapsSolid(b.x + d * n, b.y, b.w, b.h, b)) { b.x += d * n; return 0; }
          }
        }
      }
      for (const s of blockers) {
        if (dy > 0) b.y = Math.min(b.y, s.y - b.h);
        else b.y = Math.max(b.y, s.y + s.h);
      }
      return dy > 0 ? 1 : -1;
    },
  };
})(window.KF);
