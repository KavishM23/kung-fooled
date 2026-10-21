'use strict';
// Progress in localStorage. Every access is wrapped: private windows and blocked storage just
// mean progress lasts for this session only.
(function (KF) {
  const KEY = 'kung-fooled.save.v1';
  const fresh = () => ({ doors: {}, muted: false });

  KF.Save = {
    data: fresh(),
    load() {
      try {
        const raw = window.localStorage.getItem(KEY);
        if (raw) this.data = Object.assign(fresh(), JSON.parse(raw));
      } catch (e) { this.data = fresh(); }
      return this.data;
    },
    write() {
      try { window.localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* storage unavailable */ }
    },
    door(id) {
      if (!this.data.doors[id]) this.data.doors[id] = { cleared: false, reached: 0, best: {} };
      return this.data.doors[id];
    },
    // Record a cleared stage: unlock the next one, keep the fewest deaths, mark the door at 5/5.
    clearStage(doorId, index, deaths, count) {
      const d = this.door(doorId);
      d.reached = Math.max(d.reached, Math.min(count - 1, index + 1));
      if (d.best[index] === undefined || deaths < d.best[index]) d.best[index] = deaths;
      if (index === count - 1) d.cleared = true;
      this.write();
    },
    setMuted(m) { this.data.muted = m; this.write(); },
  };
})(window.KF);
