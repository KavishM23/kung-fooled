'use strict';
// Progress in localStorage. Every access is wrapped: private windows and blocked storage just
// mean progress lasts for this session only.
(function (KF) {
  const KEY = 'kung-fooled.save.v2';
  const fresh = () => ({
    coins: 0, owned: {}, upg: {}, muted: false,
    equip: { outfit: 'o_teal', head: 'h_orange', hair: 'r_spiky', colour: 'c_black', fists: 'w_cream', face: 'f_none', skin: 's_tan', special: 'wave' },
    realms: {},   // id -> { node: furthest unlocked node, cleared, best: {stage: deaths}, won: {node: true} }
    arena: { best: 0 },
  });

  KF.Save = {
    data: fresh(),
    load() {
      try {
        const raw = window.localStorage.getItem(KEY);
        if (raw) {
          const d = JSON.parse(raw), f = fresh();
          this.data = Object.assign(f, d, { equip: Object.assign(f.equip, d.equip || {}), arena: Object.assign(f.arena, d.arena || {}) });
        }
      } catch (e) { this.data = fresh(); }
      return this.data;
    },
    write() {
      try { window.localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* storage unavailable */ }
    },
    realm(id) {
      if (!this.data.realms[id]) this.data.realms[id] = { node: 0, cleared: false, best: {}, won: {} };
      return this.data.realms[id];
    },
    // Kept for the platform scene: stage i of a realm is node 2i.
    door(id) { return this.realm(id); },
    unlocked(index) { return index === 0 || this.realm(KF.Doors[index - 1].id).cleared; },
    // Finish a node (stage or fight). Returns the coins earned (first clears pay more).
    completeNode(realmId, node, extra = {}) {
      const r = this.realm(realmId), realmIdx = KF.Doors.findIndex((d) => d.id === realmId);
      const first = !r.won[node];
      r.won[node] = true;
      r.node = Math.max(r.node, node + 1);
      let coins;
      const isStage = node % 2 === 0, isBoss = node === 9;
      if (isStage) {
        coins = first ? 20 : 5;
        if (extra.deaths === 0) coins += first ? 10 : 2;
        const s = node / 2;
        if (r.best[s] === undefined || extra.deaths < r.best[s]) r.best[s] = extra.deaths;
      } else if (isBoss) {
        coins = first ? 80 + 20 * realmIdx : 20;
        r.cleared = true;
      } else coins = first ? 25 + 10 * realmIdx : 8;
      this.data.coins += coins;
      this.write();
      return coins;
    },
    setMuted(m) { this.data.muted = m; this.write(); },
  };
})(window.KF);
