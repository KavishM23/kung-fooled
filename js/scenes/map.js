'use strict';
// Realm map: pick a realm (each unlocks when the previous realm's boss is beaten), or visit the
// Dojo shop, the Street Arena, or the training dojo.
(function (KF) {
  const F = KF.Font, A = KF.Audio, VW = KF.VIEW_W, VH = KF.VIEW_H;
  const thumbs = {};

  // Small live-looking preview of each realm's arena, rendered once from its theme.
  function thumb(door) {
    if (thumbs[door.id]) return thumbs[door.id];
    const big = KF.makeHi(VW, VH), bx = big.getContext('2d');
    const th = KF.Themes.get(door.theme);
    th.background(bx, { x: 120, y: 0 }, 3.3, { cheer: 0 });
    for (let x = 0; x < VW; x += 16) { th.tile(bx, x, 168, 'solid', { t: true, d: 0 }, KF.util.hash2(x, 3)); th.tile(bx, x, 184, 'solid', { d: 1 }, KF.util.hash2(x, 4)); th.tile(bx, x, 200, 'solid', { d: 2 }, KF.util.hash2(x, 5)); }
    const c = KF.makeHi(96, 54), x = c.getContext('2d');
    x.imageSmoothingEnabled = true; x.drawImage(big, 0, 0, 96, 54);
    thumbs[door.id] = c;
    return c;
  }

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
      KF.Narrator.y = 132;
      if (!engine.mapSeen) { engine.mapSeen = true; KF.Narrator.say(KF.Narrator.LINES.map[0]); }
    }
    update(dt) {
      this.t += dt;
      const inp = this.engine.input, n = KF.Doors.length, e = this.engine;
      if (inp.wasPressed('ArrowLeft', 'KeyA')) { this.sel = (this.sel + n - 1) % n; A.sfx('select'); }
      if (inp.wasPressed('ArrowRight', 'KeyD')) { this.sel = (this.sel + 1) % n; A.sfx('select'); }
      this.scroll += (this.sel - this.scroll) * Math.min(1, dt * 10);
      if (inp.wasPressed('Enter', 'Space')) {
        if (KF.Save.unlocked(this.sel)) { A.sfx('confirm'); e.lastRealm = this.sel; const r = this.sel; e.go(() => new KF.RealmScene(e, r)); }
        else { A.sfx('bonk'); this.denied = 0.6; }
      }
      if (inp.wasPressed('KeyC')) { A.sfx('confirm'); e.go(() => new KF.ShopScene(e)); }
      if (inp.wasPressed('KeyF')) { A.sfx('confirm'); e.go(() => new KF.FightScene(e, { mode: 'arena', realm: 0, streak: 0, def: KF.Roster.arenaDef(0) })); }
      if (inp.wasPressed('KeyT')) e.go(() => new KF.PlayScene(e, { training: true }));
      if (inp.wasPressed('Escape')) e.go(() => new KF.TitleScene(e));
      if (this.denied > 0) this.denied -= dt;
    }
    render(ctx) {
      const t = this.t, R = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
      this.theme.background(ctx, { x: 40 + t * 6, y: 0 }, this.engine.time, { cheer: this.cleared !== undefined ? 1 : 0.2 });
      ctx.fillStyle = 'rgba(10,6,20,0.55)'; ctx.fillRect(0, 0, VW, VH);
      KF.BigText.draw(ctx, 'CHOOSE YOUR REALM', VW / 2, 18, 2, 'fire');
      KF.HUD.coins(ctx, VW - 8, 6, t);
      KF.Doors.forEach((d, i) => {
        const cx = Math.round(VW / 2 + (i - this.scroll) * 112);
        if (cx < -70 || cx > VW + 70) return;
        const sel = i === this.sel, unlocked = KF.Save.unlocked(i), save = KF.Save.realm(d.id);
        const x = cx - 52, y = 44 + (sel ? -4 : 0);
        R(sel ? '#ffd040' : '#0a0610', x - 2, y - 2, 108, 112);
        R('#1a1428', x, y, 104, 108);
        KF.blit(ctx, thumb(d), x + 4, y + 4);
        if (!unlocked) { ctx.fillStyle = 'rgba(8,4,16,0.75)'; ctx.fillRect(x + 4, y + 4, 96, 54); }
        F.draw(ctx, `REALM ${i + 1}`, cx, y + 63, sel ? '#ffd040' : '#a098b0', 1, 'center', '#000');
        F.draw(ctx, d.name, cx, y + 73, '#ffffff', 1, 'center', '#000');
        F.draw(ctx, d.sub, cx, y + 82, '#9ad8ff', 1, 'center', '#000');
        // progress pips: 5 stages + 4 fights + boss
        for (let k = 0; k < 10; k++) {
          const done = save.won[k], px = x + 7 + k * 9.2;
          R('#0a0610', px, y + 94, 7, 7);
          R(done ? (k === 9 ? '#ff5040' : k % 2 ? '#7cf0ff' : '#ffd040') : '#2a2238', px + 1, y + 95, 5, 5);
        }
        if (!unlocked) {
          R('#0a0610', cx - 7, y + 18, 14, 14); R('#8a8098', cx - 6, y + 24, 12, 7); R('#8a8098', cx - 4, y + 19, 8, 2); R('#8a8098', cx - 4, y + 19, 2, 6); R('#8a8098', cx + 2, y + 19, 2, 6);
          F.draw(ctx, 'LOCKED', cx, y + 38, '#b0a8c0', 1, 'center', '#000');
        }
        if (save.cleared) { ctx.save(); ctx.translate(cx, y + 30); ctx.rotate(-0.2); KF.BigText.draw(ctx, 'CLEARED', 0, 0, 1, 'gold'); ctx.restore(); }
      });
      const d = KF.Doors[this.sel], unlocked = KF.Save.unlocked(this.sel);
      const msg = unlocked ? `BOSS: ${KF.Roster.R[d.id].boss.name}` : `BEAT THE ${KF.Doors[this.sel - 1].name} BOSS TO UNLOCK`;
      F.draw(ctx, msg, VW / 2, 168, this.denied > 0 ? '#ff6050' : unlocked ? '#ffb0a0' : '#b0a8c0', 1, 'center', '#000');
      if (this.cleared !== undefined && t < 4) KF.BigText.draw(ctx, 'REALM CLEARED!', VW / 2, 110, 3, 'gold', t < 0.12 ? 3 - t * 16 : 1);
      R('rgba(8,4,16,0.8)', 0, 180, VW, 36);
      F.draw(ctx, 'ENTER: ENTER REALM     C: DOJO SHOP     F: STREET ARENA', VW / 2, 186, '#ffffff', 1, 'center', '#000');
      F.draw(ctx, 'T: TRAINING     ESC: TITLE     M: SOUND', VW / 2, 198, '#a098b0', 1, 'center', '#000');
      F.draw(ctx, `ARENA BEST STREAK ${KF.Save.data.arena.best}`, VW / 2, 208, '#7a7094', 1, 'center');
    }
  }
  KF.MapScene = MapScene;
})(window.KF);
