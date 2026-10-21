'use strict';
// The MODES hub and its screens: Endless Dojo, Daily Troll, two-player Versus, the level editor,
// playing a shared level code, the trophy cabinet, and the realm speedrun results.
(function (KF) {
  const F = KF.Font, A = KF.Audio, VW = KF.VIEW_W, VH = KF.VIEW_H, BT = KF.BigText;
  const R = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  const fmt = (t) => { const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s < 10 ? '0' : ''}${s.toFixed(2)}`; };
  KF.fmtTime = fmt;

  // An Endless Dojo run: rooms of chunks against the clock. Clearing a room adds time.
  KF.Modes.startEndless = (e) => {
    const E = { seed: (Math.random() * 2 ** 31) >>> 0, room: 0, cleared: 0, deaths: 0, timeLeft: 45 };
    return new KF.PlayScene(e, { mode: 'endless', endless: E, def: KF.Modes.endlessRoom(E.seed, 0) });
  };

  // A small HTML dialog for share codes (the canvas has no text box). Typing in it is ignored by
  // the game's own key handling (see js/input.js).
  KF.CodeBox = {
    open({ title, text = '', note = '', ok = 'CLOSE', onOk, copy = false }) {
      this.close();
      const wrap = document.createElement('div');
      wrap.id = 'kf-codebox';
      wrap.innerHTML = `<style>
        #kf-codebox { position: fixed; inset: 0; display: grid; place-items: center; background: rgba(7,6,11,0.7); z-index: 20; padding: 16px; }
        #kf-codebox .box { width: min(520px, 100%); background: #1c1630; border: 2px solid #ffd040; padding: 16px; font: 14px monospace; color: #fff; display: flex; flex-direction: column; gap: 10px; }
        #kf-codebox h2 { margin: 0; font: bold 16px monospace; color: #ffd040; letter-spacing: 1px; }
        #kf-codebox p { margin: 0; color: #c8c0d8; }
        #kf-codebox textarea { width: 100%; height: 96px; resize: vertical; background: #0a0610; color: #fff; border: 1px solid #6a5a8a; font: 12px monospace; padding: 8px; box-sizing: border-box; word-break: break-all; }
        #kf-codebox .row { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; }
        #kf-codebox button { font: bold 13px monospace; padding: 8px 14px; background: #2a2240; color: #fff; border: 1px solid #6a5a8a; cursor: pointer; }
        #kf-codebox button.main { background: #ffd040; color: #1a1020; border-color: #ffd040; }
      </style><div class="box" role="dialog" aria-label="${title}"><h2></h2><p></p><textarea spellcheck="false" aria-label="Level code"></textarea><div class="row"></div></div>`;
      wrap.querySelector('h2').textContent = title;
      wrap.querySelector('p').textContent = note;
      const ta = wrap.querySelector('textarea'); ta.value = text;
      const row = wrap.querySelector('.row');
      const btn = (label, fn, main) => { const b = document.createElement('button'); b.textContent = label; if (main) b.className = 'main'; b.onclick = fn; row.appendChild(b); return b; };
      if (copy) {
        const b = btn('COPY', () => {
          ta.select();
          try { navigator.clipboard.writeText(ta.value).then(() => { b.textContent = 'COPIED'; }, () => { b.textContent = 'PRESS CTRL+C'; }); } catch (e) { b.textContent = 'PRESS CTRL+C'; }
        });
      }
      if (onOk) btn('CANCEL', () => this.close());
      btn(ok, () => { const v = ta.value.trim(); this.close(); if (onOk) onOk(v); }, true);
      wrap.addEventListener('pointerdown', (e) => { if (e.target === wrap) this.close(); });
      wrap.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.close(); e.stopPropagation(); });
      document.body.appendChild(wrap);
      setTimeout(() => { ta.focus(); if (copy) ta.select(); }, 0);
    },
    close() { const w = document.getElementById('kf-codebox'); if (w) w.remove(); },
    get isOpen() { return !!document.getElementById('kf-codebox'); },
  };

  // ---------------- the hub ----------------
  class ModesScene {
    constructor(engine) {
      this.engine = engine; this.theme = KF.Themes.get('temple'); this.t = 0; this.sel = 0; this.msg = null;
      A.music('temple');
    }
    items() {
      const d = KF.Save.data, day = KF.Modes.dayNumber(), today = (d.daily || {})[String(day)];
      return [
        ['ENDLESS DOJO', `ROOMS OF TRAPS AGAINST THE CLOCK. BEST: ${(d.endless || {}).best || 0} ROOMS`],
        [`DAILY TROLL #${day + 1}`, today ? `DONE TODAY: ${today.deaths} DEATHS, ${today.time.toFixed(1)}S. BEAT IT?` : 'ONE NEW LEVEL A DAY, THE SAME FOR EVERYONE'],
        ['VERSUS  2 PLAYERS', 'ONE KEYBOARD: WASD + J K L  VS  ARROWS + Z X C'],
        ['LEVEL EDITOR', 'BUILD A TROLL LEVEL, PROVE IT BEATABLE, SHARE THE CODE'],
        ['PLAY A LEVEL CODE', "PASTE A FRIEND'S CODE AND TRY THEIR LEVEL"],
        [`TROPHIES  ${KF.Ach.count()}/${KF.Ach.list.length}`, 'EVERY TROPHY PAYS COINS ONCE'],
      ];
    }
    update(dt) {
      this.t += dt;
      if (KF.CodeBox.isOpen) return;
      const e = this.engine, inp = e.input, items = this.items();
      if (this.msg && (this.msg.t -= dt) < 0) this.msg = null;
      if (inp.back || KF.UI.clicked(this) === 'back') { e.go(() => new KF.MapScene(e)); return; }
      const pick = KF.UI.menuInput(this, inp, items.length, 'sel');
      if (pick < 0) return;
      A.sfx('confirm');
      if (pick === 0) e.go(() => KF.Modes.startEndless(e));
      if (pick === 1) { const day = KF.Modes.dayNumber(); e.go(() => new KF.PlayScene(e, { mode: 'daily', def: KF.Modes.dailyDef(day) })); }
      if (pick === 2) e.go(() => new VersusSelectScene(e));
      if (pick === 3) e.go(() => new KF.EditorScene(e));
      if (pick === 4) KF.CodeBox.open({
        title: 'PLAY A LEVEL CODE', note: 'Paste the code your friend sent (it starts with KF1-).', ok: 'PLAY',
        onOk: (code) => {
          const lv = KF.LevelCode.decode(code);
          if (!lv) { this.msg = { text: "THAT CODE DIDN'T WORK", t: 2 }; A.sfx('bonk'); return; }
          e.go(() => new KF.PlayScene(e, { mode: 'custom', def: lv.def, back: () => new ModesScene(e) }));
        },
      });
      if (pick === 5) e.go(() => new TrophiesScene(e));
    }
    render(ctx) {
      const t = this.t;
      this.theme.background(ctx, { x: 60 + t * 8, y: 0 }, this.engine.time, { cheer: 0.3 });
      R(ctx, 'rgba(10,6,20,0.62)', 0, 0, VW, VH);
      KF.UI.header(ctx, 'MODES', 'MORE WAYS TO GET FOOLED', t);
      const items = this.items();
      KF.UI.menu(ctx, this, items.map((i) => i[0]), this.sel, 44, 170);
      F.draw(ctx, this.msg ? this.msg.text : items[this.sel][1], VW / 2, 146, this.msg ? '#ff6050' : '#ffd8a0', 1, 'center', '#000');
      KF.UI.buttonBar(ctx, this, [['back', 'BACK (ESC)']]);
    }
  }

  // ---------------- trophies ----------------
  class TrophiesScene {
    constructor(engine) { this.engine = engine; this.theme = KF.Themes.get('temple'); this.t = 0; this.sel = 0; }
    update(dt) {
      this.t += dt;
      const e = this.engine, inp = e.input, n = KF.Ach.list.length, half = Math.ceil(n / 2);
      if (inp.wasPressed('ArrowDown', 'KeyS')) this.sel = (this.sel + 1) % n;
      if (inp.wasPressed('ArrowUp', 'KeyW')) this.sel = (this.sel + n - 1) % n;
      if (inp.wasPressed('ArrowRight', 'KeyD', 'ArrowLeft', 'KeyA')) this.sel = (this.sel + half) % (half * 2) % n;
      const h = KF.UI.under(this);
      if (h && h[0] === 'a' && inp.mouse.moved) this.sel = +h.slice(1);
      if (inp.back || inp.confirm || KF.UI.clicked(this) === 'back') e.go(() => new ModesScene(e));
    }
    render(ctx) {
      const t = this.t, L = KF.Ach.list, half = Math.ceil(L.length / 2);
      this.theme.background(ctx, { x: 60, y: 0 }, this.engine.time, { cheer: 0.2 });
      R(ctx, 'rgba(10,6,20,0.7)', 0, 0, VW, VH);
      KF.UI.header(ctx, 'TROPHIES', `${KF.Ach.count()} OF ${L.length}`, t);
      L.forEach((a, i) => {
        const col = i < half ? 0 : 1, row = i % half, x = 10 + col * 188, y = 40 + row * 14, got = KF.Ach.has(a.id), sel = i === this.sel;
        R(ctx, sel ? '#3a2c5a' : '#161226', x, y, 180, 12);
        KF.UI.region(this, 'a' + i, x, y, 180, 12);
        KF.Ach.trophy(ctx, x + 2, y, got);
        F.draw(ctx, a.name, x + 18, y + 3, got ? '#ffffff' : '#7a7094');
        F.draw(ctx, String(a.coins), x + 176, y + 3, got ? '#7cff6a' : '#a07a40', 1, 'right');
      });
      const a = L[this.sel];
      F.draw(ctx, a.desc, VW / 2, 172, KF.Ach.has(a.id) ? '#7cff6a' : '#ffd8a0', 1, 'center', '#000');
      KF.UI.buttonBar(ctx, this, [['back', 'BACK (ESC)']]);
    }
  }

  // ---------------- versus: pick your fighters ----------------
  class VersusSelectScene {
    constructor(engine) {
      this.engine = engine; this.t = 0;
      this.theme = KF.Themes.get('neon');
      const me = KF.Economy.look();
      this.cast = [{ name: 'BAO', look: me, color: '#7cf0ff', special: KF.Save.data.equip.special || 'wave' }, ...KF.Roster.ALL];
      this.p = [{ sel: 0, ready: false }, { sel: 1, ready: false }];
      this.sets = {};
      this.goT = 0;
      A.music('fight');
    }
    set(i) { return this.sets[i] || (this.sets[i] = KF.Sprites.buildSet(this.cast[i].look, 2.4, ['idle'])); }
    update(dt) {
      this.t += dt;
      const e = this.engine, inp = e.input, n = this.cast.length, click = KF.UI.clicked(this);
      if (inp.back || click === 'back') { e.go(() => new ModesScene(e)); return; }
      const keys = [{ l: 'KeyA', r: 'KeyD', ok: ['KeyJ', 'KeyW', 'Space'], no: 'KeyK' }, { l: 'ArrowLeft', r: 'ArrowRight', ok: ['KeyZ', 'ArrowUp', 'Enter'], no: 'KeyX' }];
      this.p.forEach((p, k) => {
        const K = keys[k];
        if (!p.ready && inp.wasPressed(K.l)) { p.sel = (p.sel + n - 1) % n; A.sfx('select'); }
        if (!p.ready && inp.wasPressed(K.r)) { p.sel = (p.sel + 1) % n; A.sfx('select'); }
        if (!p.ready && inp.wasPressed(...K.ok)) { p.ready = true; A.sfx('confirm'); }
        if (p.ready && inp.wasPressed(K.no)) { p.ready = false; A.sfx('select'); }
      });
      if (click === 'go') this.p.forEach((p) => { p.ready = true; });
      if (click && click[0] === 'p') { const [k, d] = click.slice(1).split(':').map(Number); const p = this.p[k]; if (!p.ready) { p.sel = (p.sel + d + n) % n; A.sfx('select'); } }
      if (this.p.every((p) => p.ready) && (this.goT += dt) > 0.5) {
        const def = (i, color) => { const c = this.cast[i]; return { name: c.name, look: c.look, color: color || c.color, stats: { power: 1, guard: 1, health: 110, speed: 1, special: c.special || 'wave' } }; };
        const p1 = def(this.p[0].sel), p2 = def(this.p[1].sel, this.p[0].sel === this.p[1].sel ? '#ff9ad0' : null);
        if (p1.name === p2.name) p2.name = p2.name + ' 2';
        const L = KF.Modes.safeLooks(), look = L[Math.floor(Math.random() * L.length)];
        e.go(() => new KF.FightScene(e, { mode: 'versus', realm: 0, p1, def: p2, style: look.style, env: look.env }));
      }
    }
    render(ctx) {
      const t = this.t;
      this.theme.background(ctx, { x: t * 20, y: 0 }, this.engine.time, { cheer: 0.6 });
      R(ctx, 'rgba(10,6,20,0.55)', 0, 0, VW, VH);
      KF.UI.header(ctx, 'VERSUS', 'TWO PLAYERS, ONE KEYBOARD', t);
      const hint = [['A / D: PICK   J: READY', 'K: CHANGE'], ['LEFT / RIGHT: PICK   Z: READY', 'X: CHANGE']];
      this.p.forEach((p, k) => {
        const cx = k ? VW - 96 : 96, c = this.cast[p.sel], set = this.set(p.sel);
        R(ctx, p.ready ? '#ffd040' : '#0a0610', cx - 72, 40, 144, 120); R(ctx, '#161226', cx - 70, 42, 140, 116);
        F.draw(ctx, k ? 'PLAYER 2' : 'PLAYER 1', cx, 46, k ? '#ff9ad0' : '#7cf0ff', 1, 'center');
        ctx.save(); ctx.translate(cx, 134); ctx.scale(k ? -1 : 1, 1); KF.Sprites.blit(ctx, set.frames.idle[Math.floor(t * 4) % 4], set); ctx.restore();
        F.draw(ctx, c.name, cx, 140, '#ffffff', 1, 'center', '#000');
        F.draw(ctx, p.ready ? 'READY!' : hint[k][0], cx, 150, p.ready ? '#7cff6a' : '#a098b0', 1, 'center');
        if (!p.ready) { KF.UI.button(ctx, this, `p${k}:-1`, cx - 70, 92, 14, 14, '<'); KF.UI.button(ctx, this, `p${k}:1`, cx + 56, 92, 14, 14, '>'); }
      });
      BT.draw(ctx, 'VS', VW / 2, 92, 4, 'fire');
      F.draw(ctx, 'EQUAL STATS FOR BOTH. FIRST TO TWO ROUNDS.', VW / 2, 172, '#ffd8a0', 1, 'center', '#000');
      KF.UI.buttonBar(ctx, this, [['go', 'FIGHT!'], ['back', 'BACK (ESC)']]);
    }
  }

  // ---------------- realm speedrun: results ----------------
  // run: { realm, t, splits: [{ node, t }], deaths, fightLosses }
  KF.Modes.startRun = (e, realm) => new KF.PlayScene(e, { door: realm, stage: 0, run: { realm, t: 0, splits: [], deaths: 0 } });
  class RunResultScene {
    constructor(engine, run) {
      this.engine = engine; this.run = run; this.t = 0; this.sel = 0;
      const door = KF.Doors[run.realm], d = KF.Save.data;
      this.door = door; this.theme = KF.Themes.get(door.theme);
      d.runs = d.runs || {};
      this.best = d.runs[door.id] || null;
      this.record = !this.best || run.t < this.best.t;
      this.deathless = run.deaths === 0;
      if (this.record) d.runs[door.id] = { t: run.t, splits: run.splits.map((s) => s.t), deaths: run.deaths };
      if (this.deathless) { const r = KF.Save.realm(door.id); r.deathless = true; }
      KF.Save.write();
      KF.Ach.event('speedrun', { deaths: run.deaths });
      A.sfx(this.record ? 'perfect' : 'win');
    }
    update(dt) {
      this.t += dt;
      if (this.t < 0.6) return;
      const e = this.engine, pick = KF.UI.menuInput(this, e.input, 3, 'sel');
      if (pick === 0) e.go(() => KF.Modes.startRun(e, this.run.realm));
      if (pick === 1) e.go(() => new KF.RealmScene(e, this.run.realm));
      if (pick === 2) e.go(() => new KF.MapScene(e));
    }
    render(ctx) {
      const t = this.t, run = this.run;
      this.theme.background(ctx, { x: t * 10, y: 0 }, this.engine.time, { cheer: 1 });
      R(ctx, 'rgba(10,6,20,0.72)', 0, 0, VW, VH);
      KF.UI.header(ctx, `${this.door.name} SPEEDRUN`, this.record ? 'NEW RECORD!' : `BEST ${fmt(this.best.t)}`, t, 'gold');
      const names = ['LEVEL 1', 'LEVEL 2', 'STREET FIGHT', 'LEVEL 3', 'LEVEL 4', 'BOSS'];
      run.splits.forEach((s, i) => {
        const y = 42 + i * 11, prev = this.best && this.best.splits[i];
        F.draw(ctx, names[s.node] || `NODE ${s.node + 1}`, 110, y, '#c8c0d8');
        F.draw(ctx, fmt(s.t), 250, y, '#ffffff', 1, 'right');
        if (prev !== undefined && prev !== null && !this.record) {
          const dlt = s.t - prev;
          F.draw(ctx, `${dlt <= 0 ? '-' : '+'}${Math.abs(dlt).toFixed(2)}`, 300, y, dlt <= 0 ? '#7cff6a' : '#ff6050', 1, 'right');
        }
      });
      F.draw(ctx, `TOTAL ${fmt(run.t)}    DEATHS ${run.deaths}`, VW / 2, 112, '#ffd040', 1, 'center', '#000');
      if (this.deathless) BT.draw(ctx, 'DEATHLESS', VW / 2, 128, 2, 'gold');
      KF.UI.menu(ctx, this, ['RUN IT AGAIN', 'BACK TO REALM', 'MAP'], this.sel, 140, 130);
    }
  }

  KF.ModesScene = ModesScene;
  KF.TrophiesScene = TrophiesScene;
  KF.VersusSelectScene = VersusSelectScene;
  KF.RunResultScene = RunResultScene;
})(window.KF);
