'use strict';
// Ghosts: recordings of your runs through a level (position and pose, 30 times a second).
//  - The best-time run on each level is kept and replayed as a translucent rival.
//  - Every attempt of the current visit is kept too, for the "all your tries" replay on a win.
// Stored apart from the main save, so a big ghost file can never break progress.
(function (KF) {
  const KEY = 'kung-fooled.ghosts.v1', HZ = 30;
  let store = null;
  const load = () => {
    if (store) return store;
    try { store = JSON.parse(window.localStorage.getItem(KEY) || '{}') || {}; } catch (e) { store = {}; }
    return store;
  };

  // One recording: flat arrays, so it serialises small.
  class Track {
    constructor() { this.x = []; this.y = []; this.s = []; this.f = []; this.acc = 0; this.end = null; }
    push(dt, p) {
      this.acc += dt;
      while (this.acc >= 1 / HZ) {
        this.acc -= 1 / HZ;
        this.x.push(Math.round(p.centerX)); this.y.push(Math.round(p.gravDir < 0 ? p.y : p.y + p.h));
        this.s.push(p.state); this.f.push((p.facing < 0 ? -1 : 1) * (p.gravDir < 0 ? 2 : 1));
      }
    }
    get length() { return this.x.length / HZ; }
    // Pose at time t (seconds), or null after the recording ends.
    at(t) {
      const n = this.x.length, i = Math.floor(t * HZ);
      if (!n || i >= n) return null;
      const j = Math.min(n - 1, i + 1), k = t * HZ - i;
      return { x: this.x[i] + (this.x[j] - this.x[i]) * k, y: this.y[i] + (this.y[j] - this.y[i]) * k, state: this.s[i], facing: Math.sign(this.f[i]), flip: Math.abs(this.f[i]) === 2, stateT: t };
    }
    last() { const n = this.x.length - 1; return n < 0 ? null : { x: this.x[n], y: this.y[n] }; }
    toJSON() { return { x: this.x, y: this.y, s: this.s, f: this.f }; }
    static from(o) { const t = new Track(); Object.assign(t, { x: o.x || [], y: o.y || [], s: o.s || [], f: o.f || [] }); return t; }
  }

  KF.Ghosts = {
    Track, HZ,
    // Best-time recording for a level id (e.g. "arcade-1"), or null.
    best(id) { const o = load()[id]; return o ? { time: o.time, track: Track.from(o.track) } : null; },
    saveBest(id, time, track) {
      const s = load();
      if (s[id] && s[id].time <= time) return false;
      s[id] = { time, track: track.toJSON() };
      try { window.localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* full or blocked: skip */ }
      return true;
    },
    // Draw a recorded pose. which: 'ghostA' (cyan) or 'ghostB' (pink); alpha: opacity.
    draw(ctx, g, cam, which = 'ghostA', alpha = 0.45) {
      const frame = KF.Sprites.pick(g.state, g.stateT);
      const vl = KF.Vec && KF.Vec.active();
      ctx.save(); ctx.globalAlpha = alpha;
      if (vl) {
        ctx.translate(Math.round(g.x - cam.x), Math.round(g.y - cam.y)); ctx.scale(g.facing < 0 ? -1 : 1, g.flip ? -1 : 1);
        KF.Vec.draw(ctx, frame.pose, KF.Sprites.set.look, { vlook: vl, tint: which === 'ghostA' ? '#38e8ff' : '#ff4fb8', alpha, noShadow: true });
      } else KF.Sprites.draw(ctx, frame, g.x - cam.x, g.y - cam.y, g.facing, g.flip, which);
      ctx.restore();
    },
  };
})(window.KF);
