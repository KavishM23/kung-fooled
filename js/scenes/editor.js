'use strict';
// Level editor. Paint tiles and drop traps with the mouse, test-play, run the level checker in the
// browser to stamp the level PROVEN BEATABLE, and share it as a code (js/levelcode.js).
// The world is drawn at 3/4 size so all 14 rows fit between the top bar and the toolbars.
(function (KF) {
  const F = KF.Font, A = KF.Audio, VW = KF.VIEW_W, T = KF.TILE;
  const ROWS = 14, S = 0.75, TS = T * S, VIEW_Y = 15, VIEW_H = ROWS * TS;
  const DRAFT = 'kung-fooled.editor.v1';
  const R = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

  // tile: the map character painted. trap: placed on click with sensible defaults.
  const TOOLS = [
    { id: '#', label: '#', name: 'SOLID' }, { id: '=', label: '=', name: 'PROP BLOCK' }, { id: '-', label: '-', name: 'ONE-WAY PLATFORM' },
    { id: '~', label: '~', name: 'ICE' }, { id: '^', label: '^', name: 'SPIKES UP' }, { id: 'v', label: 'V', name: 'SPIKES DOWN' },
    { id: '<', label: '<', name: 'SPIKES LEFT' }, { id: '>', label: '>', name: 'SPIKES RIGHT' }, { id: 'P', label: 'P', name: 'SPAWN' },
    { id: 'D', label: 'D', name: 'EXIT DOOR' }, { id: 'erase', label: 'X', name: 'ERASE (OR RIGHT CLICK)' },
    { id: 'collapse', label: 'CL', name: 'COLLAPSING FLOOR', trap: true }, { id: 'fakeFloor', label: 'FF', name: 'FAKE FLOOR', trap: true },
    { id: 'hidden', label: 'HB', name: 'HIDDEN BLOCK', trap: true }, { id: 'spikes', label: 'PS', name: 'POP-UP SPIKES', trap: true },
    { id: 'spring', label: 'SP', name: 'SPRING', trap: true }, { id: 'crusher', label: 'CR', name: 'CRUSHER (IN A CEILING)', trap: true },
    { id: 'blink', label: 'BL', name: 'BLINKING PLATFORM', trap: true }, { id: 'axe', label: 'AX', name: 'SWINGING AXE', trap: true },
  ];
  const TRAP_COL = { collapse: '#ffb040', fakeFloor: '#ff60c0', hidden: '#9ad8ff', spikes: '#ff5050', spring: '#7cff6a', crusher: '#ff8060', blink: '#c0a0ff', axe: '#ffd040' };
  const solidCh = (ch) => ch === '#' || ch === '=' || ch === '~';

  // The cells a trap covers, for drawing and erasing.
  function trapRect(t) {
    const [c, r, w = 1, h = 1] = t.at;
    if (t.type === 'spikes' || t.type === 'blink' || t.type === 'hidden') return { c, r, w, h: 1 };
    if (t.type === 'axe') return { c, r, w: 1, h: 1 };
    return { c, r, w, h };
  }

  class EditorScene {
    constructor(engine) {
      this.engine = engine; this.t = 0;
      this.tool = 0; this.camC = 0; this.msg = null; this.check = null;
      this.looks = KF.Modes.safeLooks();
      if (!this.loadDraft()) this.reset(32);
      this.rebuild();
      A.music('temple');
    }
    reset(w) {
      this.map = Array.from({ length: ROWS }, (_, r) => Array(w).fill(r >= 11 ? '#' : '.'));
      this.map[10][2] = 'P'; this.map[10][w - 3] = 'D';
      this.traps = []; this.look = 0; this.verified = null; this.name = 'HOME-MADE';
    }
    get w() { return this.map[0].length; }
    def() {
      const L = this.looks[this.look % this.looks.length];
      return { name: this.name, map: this.map.map((r) => r.join('')), traps: this.traps.map((t) => JSON.parse(JSON.stringify(t))), labels: [], style: L.style, env: L.env, theme: L.env, music: L.music };
    }
    // After any edit: redraw the baked world, drop the checker stamp, save the draft.
    rebuild() {
      const def = this.def();
      this.theme = KF.Themes.get(def.env);
      this.world = new KF.World(def);
      this.layer = KF.Render.bakeStage(this.world, this.theme, KF.RES);
      this.isVerified = !!this.verified && this.verified === KF.LevelCode.hash(def);
      try { window.localStorage.setItem(DRAFT, JSON.stringify({ map: def.map, traps: this.traps, look: this.look, verified: this.verified, name: this.name })); } catch (e) { /* storage off */ }
    }
    loadDraft() {
      try {
        const d = JSON.parse(window.localStorage.getItem(DRAFT) || 'null');
        if (!d || !d.map || d.map.length !== ROWS) return false;
        this.map = d.map.map((r) => [...r]); this.traps = d.traps || []; this.look = d.look || 0; this.verified = d.verified || null; this.name = d.name || 'HOME-MADE';
        return true;
      } catch (e) { return false; }
    }
    say(text, bad) { this.msg = { text, bad, t: 2.4 }; if (bad) A.sfx('bonk'); }

    // ---------- editing ----------
    cellAt(mx, my) {
      if (my < VIEW_Y || my >= VIEW_Y + VIEW_H) return null;
      const c = Math.floor(mx / TS + this.camC), r = Math.floor((my - VIEW_Y) / TS);
      return c >= 0 && c < this.w && r >= 0 && r < ROWS ? { c, r } : null;
    }
    removeTrapsAt(c, r) {
      const n = this.traps.length;
      this.traps = this.traps.filter((t) => { const q = trapRect(t); return !(c >= q.c && c < q.c + q.w && r >= q.r && r < q.r + q.h); });
      return n !== this.traps.length;
    }
    paint(c, r, id) {
      const m = this.map;
      if (id === 'erase') { const had = this.removeTrapsAt(c, r); if (m[r][c] === '.' && !had) return false; m[r][c] = '.'; return true; }
      if (m[r][c] === id) return false;
      if (id === 'P' || id === 'D') for (const row of m) for (let i = 0; i < row.length; i++) if (row[i] === id) row[i] = '.';
      m[r][c] = id;
      return true;
    }
    placeTrap(c, r, type) {
      const m = this.map, w = this.w, fill = (cc, rr, ww, hh) => { for (let j = 0; j < hh; j++) for (let i = 0; i < ww; i++) if (rr + j < ROWS && cc + i < w) m[rr + j][cc + i] = '#'; };
      this.removeTrapsAt(c, r);
      let t;
      if (type === 'collapse' || type === 'fakeFloor') {
        const tw = Math.min(type === 'collapse' ? 3 : 2, w - c);
        let h = 0; while (r + h < ROWS && (solidCh(m[r + h][c]) || h === 0)) h++;
        fill(c, r, tw, h);
        t = { type, at: [c, r, tw, h], say: type === 'collapse' ? 'OOPS' : 'POOF' };
      } else if (type === 'crusher') { fill(c, r, Math.min(2, w - c), 2); t = { type, at: [c, r, Math.min(2, w - c), 2], say: 'HEADS UP' }; }
      else if (type === 'spikes') t = { type, at: [c, r, Math.min(2, w - c)] };
      else if (type === 'blink') t = { type, at: [c, r, Math.min(2, w - c)], on: 1.4, off: 1 };
      else if (type === 'axe') t = { type, at: [c, r], len: 4, speed: 2.2 };
      else if (type === 'hidden') { m[r][c] = '.'; t = { type, at: [c, r], say: 'BONK' }; }
      else t = { type, at: [c, r] };
      this.traps.push(t);
    }
    resize(dw) {
      const nw = Math.max(24, Math.min(120, this.w + dw));
      if (nw === this.w) return;
      if (dw > 0) this.map.forEach((row, r) => { for (let i = 0; i < dw; i++) row.push(r >= 11 ? '#' : '.'); });
      else {
        this.map.forEach((row) => row.splice(nw));
        this.traps = this.traps.filter((t) => { const q = trapRect(t); return q.c + q.w <= nw; });
        if (!this.map.some((row) => row.includes('D'))) this.map[10][nw - 3] = 'D';
        if (!this.map.some((row) => row.includes('P'))) this.map[10][2] = 'P';
      }
      this.rebuild();
    }
    ready() {
      const flat = this.map.map((r) => r.join('')).join('');
      if (!flat.includes('P') || !flat.includes('D')) { this.say('PLACE A SPAWN (P) AND A DOOR (D) FIRST', true); return false; }
      return true;
    }

    // ---------- the checker, a slice per frame ----------
    startCheck() {
      if (!this.ready()) return;
      const def = KF.util.deepFreeze(this.def());
      this.check = { def, variants: KF.Solver.variants(def), vi: 0, it: null, p: 0 };
      A.sfx('confirm');
    }
    stepCheck() {
      const C = this.check, t0 = performance.now();
      while (performance.now() - t0 < 12) {
        if (!C.it) C.it = KF.Solver.search(C.def, C.variants[C.vi], { budget: 150000, slice: 120 });
        const r = C.it.next();
        if (!r.done) { C.p = r.value; continue; }
        if (!r.value.ok) {
          this.check = null;
          if (r.value.expanded >= 150000) { this.say('TOO TANGLED TO PROVE. TRY A SHORTER LEVEL', true); return; }
          this.say(C.vi ? `NO ROUTE AFTER ${C.vi} DEATH${C.vi > 1 ? 'S' : ''}. MAKE IT FAIRER` : 'NO ROUTE TO THE DOOR. MAKE IT FAIRER', true);
          return;
        }
        C.vi++; C.it = null; C.p = 0;
        if (C.vi >= C.variants.length) {
          this.check = null;
          this.verified = KF.LevelCode.hash(C.def); this.rebuild();
          this.say('PROVEN BEATABLE! SHARE IT', false); A.sfx('perfect');
          KF.Ach.event('verified');
          return;
        }
      }
    }

    update(dt) {
      this.t += dt;
      if (this.msg && (this.msg.t -= dt) <= 0) this.msg = null;
      if (KF.CodeBox.isOpen) return;
      if (this.check) { this.stepCheck(); if (this.engine.input.back) { this.check = null; this.say('CHECK CANCELLED', true); } return; }
      const e = this.engine, inp = e.input, m = inp.mouse;
      if (inp.isDown('KeyA', 'ArrowLeft')) this.camC = Math.max(0, this.camC - dt * 18);
      if (inp.isDown('KeyD', 'ArrowRight')) this.camC = Math.min(Math.max(0, this.w - VW / TS), this.camC + dt * 18);
      const click = KF.UI.clicked(this), over = KF.UI.under(this);
      if (click && click.startsWith('tool')) { this.tool = +click.slice(4); A.sfx('select'); }
      if (click === 'exit' || inp.back) { e.go(() => new KF.ModesScene(e)); return; }
      if (click === 'test' || inp.wasPressed('Enter')) { if (this.ready()) { const def = this.def(); e.go(() => new KF.PlayScene(e, { mode: 'custom', def, back: () => this })); } return; }
      if (click === 'check') return this.startCheck();
      if (click === 'look') { this.look = (this.look + 1) % this.looks.length; this.rebuild(); A.sfx('select'); }
      if (click === 'wider') this.resize(8);
      if (click === 'narrow') this.resize(-8);
      if (click === 'clear') { this.reset(32); this.camC = 0; this.rebuild(); this.say('CLEARED', false); }
      if (click === 'share') {
        if (!this.ready()) return;
        KF.CodeBox.open({ title: 'SHARE YOUR LEVEL', text: KF.LevelCode.encode(this.def(), this.isVerified), copy: true,
          note: this.isVerified ? 'Proven beatable. Send this code to a friend: MODES, then PLAY A LEVEL CODE.' : 'Not checked yet. Press CHECK first to stamp it PROVEN BEATABLE, or share it as it is.' });
      }
      if (click === 'load') KF.CodeBox.open({ title: 'LOAD A LEVEL CODE', note: 'Paste a code to edit it. This replaces the level you are editing.', ok: 'LOAD', onOk: (code) => {
        const lv = KF.LevelCode.decode(code);
        if (!lv) return this.say("THAT CODE DIDN'T WORK", true);
        this.map = lv.def.map.map((r) => [...r]); this.traps = lv.def.traps; this.name = lv.def.name;
        this.look = Math.max(0, this.looks.findIndex((l) => l.style === lv.def.style && l.env === lv.def.env));
        this.verified = lv.verified ? KF.LevelCode.hash(lv.def) : null; this.camC = 0; this.rebuild(); this.say('LOADED', false);
      } });
      // Painting on the grid (not when the pointer is over a button).
      const cell = !over && m.seen ? this.cellAt(m.x, m.y) : null;
      this.hover = cell;
      if (!cell) return;
      const tool = TOOLS[this.tool];
      let changed = false;
      if (m.right) changed = this.paint(cell.c, cell.r, 'erase');
      else if (tool.trap) { if (inp.clicked) { this.placeTrap(cell.c, cell.r, tool.id); changed = true; A.sfx('select'); } }
      else if (m.down) changed = this.paint(cell.c, cell.r, tool.id);
      if (changed) this.rebuild();
    }

    // ---------- drawing ----------
    render(ctx) {
      const t = this.t, cam = this.camC * T;
      this.theme.background(ctx, { x: cam, y: 0 }, this.engine.time, { cheer: 0 });
      R(ctx, 'rgba(8,4,16,0.35)', 0, VIEW_Y, VW, VIEW_H);
      // The baked world, scaled to 3/4.
      const res = this.layer.res || KF.RES, sw = Math.min(this.layer.width, (VW / S) * res);
      ctx.drawImage(this.layer, cam * res, 0, sw, ROWS * T * res, 0, VIEW_Y, sw / res * S, VIEW_H);
      const X = (c) => (c - this.camC) * TS, Y = (r) => VIEW_Y + r * TS;
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      for (let c = Math.ceil(this.camC); c < this.camC + VW / TS + 1; c++) ctx.fillRect(Math.round(X(c)), VIEW_Y, 1, VIEW_H);
      for (let r = 0; r <= ROWS; r++) ctx.fillRect(0, Math.round(Y(r)), VW, 1);
      // Spawn and door markers.
      this.map.forEach((row, r) => row.forEach((ch, c) => {
        if (ch === 'P') { R(ctx, '#7cf0ff', X(c) + 3, Y(r) - 6, 6, 18); F.draw(ctx, 'P', X(c) + 6, Y(r) - 4, '#0a0610', 1, 'center'); }
        if (ch === 'D') { R(ctx, '#5a3a20', X(c) + 1, Y(r) - TS, TS - 2, TS * 2); R(ctx, '#ffd040', X(c) + 8, Y(r) + 2, 2, 2); F.draw(ctx, 'D', X(c) + 6, Y(r) - 8, '#ffd040', 1, 'center'); }
      }));
      // Traps: coloured outlines with their tool letters, since most are disguised in play.
      for (const tr of this.traps) {
        const q = trapRect(tr), col = TRAP_COL[tr.type] || '#fff', x = X(q.c), y = Y(q.r);
        ctx.globalAlpha = 0.25; R(ctx, col, x, y, q.w * TS, q.h * TS); ctx.globalAlpha = 1;
        ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.setLineDash([2, 2]);
        ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, q.w * TS - 1, q.h * TS - 1); ctx.setLineDash([]);
        if (tr.type === 'axe') { ctx.beginPath(); ctx.moveTo(x + 6, y + 6); ctx.lineTo(x + 6 + Math.sin(t * 2.2) * tr.len * TS, y + 6 + Math.cos(t * 2.2) * tr.len * TS * 0.9); ctx.stroke(); }
        F.draw(ctx, TOOLS.find((k) => k.id === tr.type).label, Math.round(x) + 2, Math.round(y) + 2, col, 1, 'left', '#000');
      }
      if (this.hover) { const h = this.hover; ctx.strokeStyle = '#ffffff'; ctx.strokeRect(Math.round(X(h.c)) + 0.5, Math.round(Y(h.r)) + 0.5, TS - 1, TS - 1); }
      // Top bar.
      R(ctx, 'rgba(8,4,16,0.85)', 0, 0, VW, VIEW_Y - 1);
      const tool = TOOLS[this.tool];
      F.draw(ctx, `EDITOR  ${this.w} WIDE  TOOL: ${tool.name}`, 4, 3, '#ffffff', 1, 'left', '#000');
      let status = this.isVerified ? 'PROVEN BEATABLE' : 'NOT CHECKED', col = this.isVerified ? '#7cff6a' : '#a098b0';
      if (this.check) { status = `CHECKING ${this.check.vi + 1}/${this.check.variants.length}  ${Math.round(this.check.p * 100)}%`; col = '#ffd040'; }
      F.draw(ctx, status, VW - 4, 3, col, 1, 'right', '#000');
      if (this.msg) { R(ctx, 'rgba(8,4,16,0.85)', 0, VIEW_Y + 2, VW, 11); F.draw(ctx, this.msg.text, VW / 2, VIEW_Y + 4, this.msg.bad ? '#ff6050' : '#7cff6a', 1, 'center', '#000'); }
      else if (this.t < 6) F.draw(ctx, 'CLICK TO PAINT  RIGHT CLICK ERASES  A/D SCROLLS  ENTER TESTS', VW / 2, VIEW_Y + 4, '#ffd8a0', 1, 'center', '#000');
      // Toolbars.
      R(ctx, 'rgba(8,4,16,0.9)', 0, VIEW_Y + VIEW_H, VW, KF.VIEW_H - VIEW_Y - VIEW_H);
      TOOLS.forEach((tl, i) => KF.UI.button(ctx, this, 'tool' + i, 3 + i * 20, VIEW_Y + VIEW_H + 2, 18, 12, tl.label, i === this.tool));
      const acts = [['test', 'TEST'], ['check', 'CHECK'], ['share', 'SHARE'], ['load', 'LOAD'], ['look', 'LOOK'], ['wider', '+W'], ['narrow', '-W'], ['clear', 'CLEAR'], ['exit', 'EXIT']];
      let x = 3;
      acts.forEach(([id, label]) => { const w = F.measure(label) + 10; KF.UI.button(ctx, this, id, x, VIEW_Y + VIEW_H + 17, w, 12, label); x += w + 4; });
      const over = KF.UI.under(this);
      if (over && over.startsWith('tool')) F.draw(ctx, TOOLS[+over.slice(4)].name, VW - 4, VIEW_Y + VIEW_H + 19, '#ffd040', 1, 'right', '#000');
    }
  }
  KF.EditorScene = EditorScene;
})(window.KF);
