'use strict';
// A stage's static geometry: tile grid parsed from strings, spawn/door markers, dynamic solids.
(function (KF) {
  const T = KF.TILE;

  // Tile legend. Anything not listed (including the markers P and D) is empty space.
  KF.TileDefs = {
    '#': { id: 1, solid: true, art: 'solid' },
    '=': { id: 2, solid: true, art: 'alt' },     // solid, drawn as the theme's prop block (crate, AC unit...)
    '-': { id: 3, oneWay: true, art: 'oneway' }, // jump up through, land on top
    '^': { id: 4, spike: 'up' },
    'v': { id: 5, spike: 'down' },
    '<': { id: 6, spike: 'left' },
    '>': { id: 7, spike: 'right' },
  };
  const BY_ID = [null];
  for (const ch in KF.TileDefs) BY_ID[KF.TileDefs[ch].id] = KF.TileDefs[ch];
  KF.TileById = BY_ID;

  // Lethal part of a spike tile, inset so near-misses are forgiven.
  KF.spikeRect = (dir, x, y) => {
    switch (dir) {
      case 'up': return { x: x + 2, y: y + 9, w: 12, h: 7 };
      case 'down': return { x: x + 2, y: y, w: 12, h: 7 };
      case 'left': return { x: x, y: y + 2, w: 7, h: 12 };
      default: return { x: x + 9, y: y + 2, w: 7, h: 12 };
    }
  };

  class World {
    constructor(def) {
      const rows = def.map;
      this.rows = rows.length;
      this.cols = Math.max(...rows.map((r) => r.length));
      this.pixelW = this.cols * T;
      this.pixelH = this.rows * T;
      this.tiles = new Uint8Array(this.cols * this.rows);
      this.spawn = { x: T, y: T };
      this.door = null;
      this.dynamicSolids = []; // { x, y, w, h, active?, oneWay?, dx?, dy? }

      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          const ch = rows[r][c] || '.';
          const td = KF.TileDefs[ch];
          if (td) this.tiles[r * this.cols + c] = td.id;
          // Markers stand on the tile below them: P = spawn, D = bottom half of the exit door.
          if (ch === 'P') this.spawn = { x: c * T + T / 2, y: (r + 1) * T };
          if (ch === 'D') this.door = { x: c * T, y: (r - 1) * T, w: T, h: T * 2, moving: false, flipped: false };
          // U = upside-down door hanging from a ceiling (marker is its top tile).
          if (ch === 'U') this.door = { x: c * T, y: r * T, w: T, h: T * 2, moving: false, flipped: true };
        }
      }
      // What the level *looks* like before traps claim tiles, so trap tiles blend in perfectly.
      this.visual = this.tiles.slice();
    }

    tileId(c, r) {
      if (c < 0 || c >= this.cols) return 1; // side walls are solid
      if (r < 0 || r >= this.rows) return 0; // open above and below (pits kill)
      return this.tiles[r * this.cols + c];
    }
    tileDef(c, r) { return BY_ID[this.tileId(c, r)] || null; }
    visualId(c, r) {
      if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) return 0;
      return this.visual[r * this.cols + c];
    }
    // Visual solidity for autotiling edges (map edges count as solid at the sides/bottom).
    visualSolid(c, r) {
      if (c < 0 || c >= this.cols || r >= this.rows) return true;
      if (r < 0) return false;
      const td = BY_ID[this.visual[r * this.cols + c]];
      return !!(td && td.solid);
    }
    // A trap takes ownership of tiles: they leave the grid and become the trap's own body.
    claim([c, r, w = 1, h = 1]) {
      for (let j = 0; j < h; j++) {
        for (let i = 0; i < w; i++) {
          const cc = c + i, rr = r + j;
          if (cc >= 0 && cc < this.cols && rr >= 0 && rr < this.rows) this.tiles[rr * this.cols + cc] = 0;
        }
      }
    }

    // All solid rects (tiles + active dynamic solids) overlapping the rect. `self` is excluded.
    solidsIn(x, y, w, h, self) {
      const out = [];
      const c0 = Math.floor(x / T), c1 = Math.floor((x + w - 1e-6) / T);
      const r0 = Math.floor(y / T), r1 = Math.floor((y + h - 1e-6) / T);
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          const td = this.tileDef(c, r);
          if (td && (td.solid || td.oneWay)) out.push({ x: c * T, y: r * T, w: T, h: T, oneWay: !!td.oneWay });
        }
      }
      for (const s of this.dynamicSolids) {
        if (s !== self && s.active !== false &&
            x < s.x + s.w && x + w > s.x && y < s.y + s.h && y + h > s.y) out.push(s);
      }
      return out;
    }

    overlapsSolid(x, y, w, h, self) {
      return this.solidsIn(x, y, w, h, self).some((s) => !s.oneWay);
    }

    spikeHit(b) {
      const c0 = Math.floor(b.x / T), c1 = Math.floor((b.x + b.w) / T);
      const r0 = Math.floor(b.y / T), r1 = Math.floor((b.y + b.h) / T);
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          const td = this.tileDef(c, r);
          if (td && td.spike && KF.util.overlap(b, KF.spikeRect(td.spike, c * T, r * T))) return true;
        }
      }
      return false;
    }
  }
  KF.World = World;
})(window.KF);
