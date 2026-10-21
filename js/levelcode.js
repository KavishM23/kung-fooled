'use strict';
// Share codes for home-made levels: "KF1-" + the level as compact JSON in URL-safe base64.
// Map rows are run-length encoded ("12.3#" = twelve empty tiles, three solid). A level that
// passed the editor's solver check carries a stamp: a hash of its map and traps, so editing the
// code by hand drops the stamp.
(function (KF) {
  const ROWS = 14, TILES = '.#=-~^v<>PD';
  const TRAPS = ['collapse', 'fakeFloor', 'hidden', 'spikes', 'spring', 'crusher', 'blink', 'axe'];
  const rle = (row) => row.replace(/(.)\1*/g, (run, ch) => (run.length > 1 ? run.length : '') + ch);
  const unrle = (s) => s.replace(/(\d+)(\D)/g, (_, n, ch) => ch.repeat(+n));
  const b64 = (s) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64 = (s) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));

  KF.LevelCode = {
    TRAPS,
    hash(def) {
      const s = JSON.stringify([def.map, def.traps || []]);
      let h = 2166136261;
      for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
      return (h >>> 0).toString(36);
    },
    encode(def, verified) {
      return 'KF1-' + b64(JSON.stringify({ n: def.name, m: def.map.map(rle), t: def.traps || [], s: def.style, e: def.env, v: verified ? this.hash(def) : 0 }));
    },
    // Returns { def, verified } or null when the code is broken or not a level.
    decode(code) {
      try {
        const m = /KF1-([A-Za-z0-9_-]+)/.exec(String(code).replace(/\s+/g, ''));
        if (!m) return null;
        const o = JSON.parse(unb64(m[1]));
        const map = (o.m || []).map(unrle);
        if (map.length !== ROWS) return null;
        const w = map[0].length;
        if (w < 16 || w > 160 || map.some((r) => r.length !== w || [...r].some((ch) => !TILES.includes(ch)))) return null;
        if (map.join('').split('P').length !== 2 || map.join('').split('D').length !== 2) return null;
        const traps = (o.t || []).filter((t) => TRAPS.includes(t.type) && Array.isArray(t.at));
        const looks = KF.Modes.safeLooks(), look = looks.find((l) => l.style === o.s && l.env === o.e) || looks[0];
        const def = { name: String(o.n || 'HOME-MADE').toUpperCase().slice(0, 24), map, traps, labels: [], style: look.style, env: look.env, theme: look.env, music: look.music };
        return { def, verified: !!o.v && o.v === this.hash(def) };
      } catch (e) { return null; }
    },
  };
})(window.KF);
