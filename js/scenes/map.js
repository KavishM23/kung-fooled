'use strict';
// Realm map: every realm, level and boss is open from the start. Also visit the
// Dojo shop, the Street Arena, or the training dojo.
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
        const r = this.sel; e.go(() => new KF.RealmScene(e, r));
      }
      if (inp.wasPressed('KeyC') || click === 'shop') { A.sfx('confirm'); e.go(() => new KF.ShopScene(e)); }
      if (inp.wasPressed('KeyF') || click === 'arena') { A.sfx('confirm'); e.go(() => new KF.FightScene(e, { mode: 'arena', realm: 0, streak: 0, def: KF.Roster.arenaDef(0) })); }
      if (inp.wasPressed('KeyT') || click === 'training') e.go(() => new KF.PlayScene(e, { training: true }));
      if (inp.back || click === 'back') e.go(() => new KF.TitleScene(e));
    }
    render(ctx) {
      const t = this.t, R = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
      this.theme.background(ctx, { x: 40 + t * 6, y: 0 }, this.engine.time, { cheer: this.cleared !== undefined ? 1 : 0.2 });
      ctx.fillStyle = 'rgba(10,6,20,0.55)'; ctx.fillRect(0, 0, VW, VH);
      KF.UI.header(ctx, 'CHOOSE YOUR REALM', 'ALL REALMS / ALL LEVELS OPEN', t);
      KF.Doors.forEach((d, i) => {
        const cx = Math.round(VW / 2 + (i - this.scroll) * 112);
        if (cx < -70 || cx > VW + 70) return;
        const sel = i === this.sel, save = KF.Save.realm(d.id);
        const x = cx - 52, y = 44 + (sel ? -4 : 0);
        R(sel ? '#ffd040' : KF.UI.hover(this, 'r' + i) ? '#6a5a8a' : '#0a0610', x - 2, y - 2, 108, 112);
        KF.UI.region(this, 'r' + i, x - 2, y - 2, 108, 112);
        R('#1a1428', x, y, 104, 108);
        KF.blit(ctx, KF.Render.thumb(d.theme, 96, 54, d.style), x + 4, y + 4);
        F.draw(ctx, `REALM ${i + 1}`, cx, y + 63, sel ? '#ffd040' : '#a098b0', 1, 'center', '#000');
        F.draw(ctx, d.name, cx, y + 73, '#ffffff', 1, 'center', '#000');
        F.draw(ctx, d.sub, cx, y + 82, '#9ad8ff', 1, 'center', '#000');
        // progress pips: level, level, fight, level, level, boss
        for (let k = 0; k < KF.Path.count; k++) {
          const done = save.won[k], px = x + 16 + k * 13, kind = KF.Path.kinds[k];
          R('#0a0610', px, y + 94, 7, 7);
          R(done ? (kind === 'boss' ? '#ff5040' : kind === 'street' ? '#7cf0ff' : '#ffd040') : '#2a2238', px + 1, y + 95, 5, 5);
        }
        if (save.cleared) { ctx.save(); ctx.translate(cx, y + 30); ctx.rotate(-0.2); KF.BigText.draw(ctx, 'CLEARED', 0, 0, 1, 'gold'); ctx.restore(); }
      });
      const d = KF.Doors[this.sel];
      F.draw(ctx, `BOSS: ${KF.Roster.R[d.id].boss.name}`, VW / 2, 166, '#ffb0a0', 1, 'center', '#000');
      if (this.cleared !== undefined && t < 4) KF.BigText.draw(ctx, 'REALM CLEARED!', VW / 2, 110, 3, 'gold', t < 0.12 ? 3 - t * 16 : 1);
      F.draw(ctx, `ARENA BEST STREAK ${KF.Save.data.arena.best}`, VW / 2, 177, '#7a7094', 1, 'center', '#000');
      KF.UI.buttonBar(ctx, this, [['enter', 'ENTER REALM'], ['shop', 'SHOP (C)'], ['arena', 'ARENA (F)'], ['training', 'TRAINING (T)'], ['back', 'BACK']]);
    }
  }
  KF.MapScene = MapScene;
})(window.KF);
