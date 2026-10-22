'use strict';
// Realm map: every realm, level and boss is open from the start. Also visit the Dojo shop,
// the Street Arena, or MODES (Endless Dojo, Daily Troll, Versus, editor, trophies).
// T jumps straight into the Endless Dojo.
(function (KF) {
  const F = KF.Font, A = KF.Audio, VW = KF.VIEW_W, VH = KF.VIEW_H;
  class MapScene {
    constructor(engine, opts = {}) {
      this.engine = engine;
      this.theme = KF.Themes.get('temple');
      this.t = 0;
      this.cleared = opts.cleared;
      const n = KF.Doors.length;
      this.sel = opts.cleared !== undefined ? Math.min(n - 1, opts.cleared + 1) : (engine.lastRealm || 0);
      this.scroll = this.sel;
      A.music('temple');
      if (opts.cleared !== undefined) A.sfx('win');
    }
    update(dt) {
      this.t += dt;
      const inp = this.engine.input, n = KF.Doors.length, e = this.engine;
      if (inp.wasPressed('ArrowLeft', 'KeyA')) { this.sel = (this.sel + n - 1) % n; A.sfx('select'); }
      if (inp.wasPressed('ArrowRight', 'KeyD')) { this.sel = (this.sel + 1) % n; A.sfx('select'); }
      this.scroll += (this.sel - this.scroll) * Math.min(1, dt * 10);
      const click = KF.UI.clicked(this);
      if (click && click[0] === 'r') { const i = +click.slice(1); if (i !== this.sel) { this.sel = i; A.sfx('select'); } else this.enter = true; }
      if (inp.confirm || click === 'enter' || this.enter) {
        this.enter = false;
        A.sfx('confirm'); e.lastRealm = this.sel;
        const r = this.sel; e.go(() => KF.Doors[r].single ? new KF.ClimbScene(e) : new KF.RealmScene(e, r));
      }
      if (inp.wasPressed('KeyC') || click === 'shop') { A.sfx('confirm'); e.go(() => new KF.ShopScene(e)); }
      if (inp.wasPressed('KeyF') || click === 'arena') { A.sfx('confirm'); e.go(() => new KF.FightScene(e, { mode: 'arena', realm: 0, streak: 0, def: KF.Roster.arenaDef(0) })); }
      if (inp.wasPressed('KeyT')) e.go(() => KF.Modes.startEndless(e)); // training is now the Endless Dojo
      if (inp.wasPressed('KeyQ') || click === 'modes') { A.sfx('confirm'); e.go(() => new KF.ModesScene(e)); }
      if (inp.back || click === 'back') e.go(() => new KF.TitleScene(e));
    }
    render(ctx) {
      const t = this.t, R = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
      this.theme.background(ctx, { x: 40 + t * 6, y: 0 }, this.engine.time, { cheer: this.cleared !== undefined ? 1 : 0.2 });
      R('rgba(9,7,19,0.82)', 0, 0, VW, VH);
      R('#100d20', 0, 0, VW, 39);
      F.draw(ctx, 'CHOOSE YOUR REALM', VW / 2, 8, '#fff4d0', 2, 'center', '#000');
      F.draw(ctx, 'ALL REALMS AND LEVELS OPEN', VW / 2, 29, '#9ad8ff', 1, 'center');
      KF.HUD.coins(ctx, VW - 8, 5, t);
      // Only one card carries detail. Neighbouring realms are small, clickable previews.
      const drawPreview = (i, x) => {
        const left = i < this.sel, idx = (i + KF.Doors.length) % KF.Doors.length;
        const d = KF.Doors[idx], hot = KF.UI.hover(this, 'r' + idx);
        R(hot ? '#ffd040' : '#403850', x - 2, 64, 84, 75);
        R('#171428', x, 66, 80, 71);
        KF.blit(ctx, KF.Render.thumb(d.theme, 74, 45, d.style), x + 3, 69);
        F.draw(ctx, d.name, x + 40, 121, hot ? '#fff' : '#c8bfd8', 1, 'center');
        F.draw(ctx, left ? '<' : '>', x + 40, 130, '#ffd040', 1, 'center');
        KF.UI.region(this, 'r' + idx, x - 2, 64, 84, 75);
      };
      drawPreview(this.sel - 1, 13);
      drawPreview(this.sel + 1, 291);
      const d = KF.Doors[this.sel], save = KF.Save.realm(d.id), x = 107, y = 49;
      R('#ffd040', x - 2, y - 2, 174, 107);
      R('#171326', x, y, 170, 103);
      KF.blit(ctx, KF.Render.thumb(d.theme, 160, 66, d.style), x + 5, y + 5);
      R('rgba(10,7,20,0.9)', x + 5, y + 59, 160, 12);
      F.draw(ctx, d.name, VW / 2, y + 61, '#fff', 1, 'center', '#000');
      F.draw(ctx, d.sub, VW / 2, y + 76, '#a9dfff', 1, 'center');
      for (let k = 0; k < (d.single ? 1 : KF.Path.count); k++) {
        const kind = KF.Path.kinds[k], px = x + 42 + k * 15;
        R('#090815', px, y + 90, 9, 8);
        R(save.won[k] ? kind === 'boss' ? '#ff5040' : kind === 'street' ? '#7cf0ff' : '#ffd040' : '#443b55', px + 1, y + 91, 7, 6);
      }
      KF.UI.region(this, 'r' + this.sel, x - 2, y - 2, 174, 107);
      if (this.cleared !== undefined && t < 4) {
        R('rgba(38,27,10,0.94)', 105, 155, 174, 10);
        F.draw(ctx, 'REALM CLEARED!  + REWARDS', VW / 2, 157, '#ffe07c', 1, 'center');
      } else F.draw(ctx, `${this.sel + 1} / ${KF.Doors.length}   LEFT / RIGHT TO BROWSE`, VW / 2, 157, '#958ba7', 1, 'center');
      F.draw(ctx, d.single ? 'NO CHECKPOINTS - CLIMB OR FALL' : `BOSS: ${KF.Roster.R[d.id].boss.name}`, VW / 2, 170, '#ffb0a0', 1, 'center');
      F.draw(ctx, d.single ? 'MOUSE AIM + HOLD CLICK TO PUSH' : `ARENA BEST STREAK ${KF.Save.data.arena.best}`, VW / 2, 181, '#8f85a1', 1, 'center');
      KF.UI.buttonBar(ctx, this, [['enter', 'ENTER REALM'], ['shop', 'SHOP (C)'], ['arena', 'ARENA (F)'], ['modes', 'MODES (Q)'], ['back', 'BACK']]);
    }
  }
  KF.MapScene = MapScene;
})(window.KF);
