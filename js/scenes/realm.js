'use strict';
// A realm's path: stage, street fight, stage, ... stage 5, boss. Each node unlocks the next.
// Cleared nodes can be replayed (smaller rewards).
(function (KF) {
  const F = KF.Font, A = KF.Audio, VW = KF.VIEW_W, U = KF.util;

  class RealmScene {
    constructor(engine, realmIdx) {
      this.engine = engine;
      this.r = realmIdx;
      this.door = KF.Doors[realmIdx];
      this.theme = KF.Themes.get(this.door.theme);
      this.save = KF.Save.realm(this.door.id);
      this.sel = Math.min(9, this.save.node);
      this.px = this.nodeX(this.sel); this.facing = 1;
      this.t = 0;
      A.music(this.door.music);
    }
    nodeX(i) { return 26 + i * 37; }
    nodeY(i) { return 118 + Math.round(Math.sin(i * 0.9) * 14); }
    node(i) {
      const roster = KF.Roster.R[this.door.id];
      if (i === 9) return { kind: 'boss', name: roster.boss.name, label: 'BOSS' };
      if (i % 2 === 0) return { kind: 'stage', name: this.door.stages[i / 2].name, label: `STAGE ${i / 2 + 1}`, look: KF.Styles.forStage(this.door.id, i / 2, this.door.stages[i / 2]).name };
      return { kind: 'street', name: roster.fighters[(i - 1) / 2].name, label: 'STREET FIGHT' };
    }
    update(dt) {
      this.t += dt;
      const inp = this.engine.input, e = this.engine, max = Math.min(9, this.save.node);
      if (inp.wasPressed('ArrowLeft', 'KeyA')) { this.sel = Math.max(0, this.sel - 1); A.sfx('select'); }
      if (inp.wasPressed('ArrowRight', 'KeyD')) { if (this.sel < max) { this.sel++; A.sfx('select'); } else A.sfx('bonk'); }
      if (inp.wasPressed('Escape')) e.go(() => new KF.MapScene(e));
      if (inp.wasPressed('KeyC')) e.go(() => new KF.ShopScene(e, { back: this.r }));
      if (inp.wasPressed('Enter', 'Space')) {
        A.sfx('confirm');
        const i = this.sel, r = this.r;
        const prevStage = Math.floor((i - 1) / 2), style = i % 2 ? KF.Styles.forStage(this.door.id, prevStage, this.door.stages[prevStage]).id : null;
        if (i % 2 === 0) e.go(() => new KF.PlayScene(e, { door: r, stage: i / 2 }));
        else if (i === 9) e.go(() => new KF.FightScene(e, { mode: 'boss', realm: r, node: 9, def: KF.Roster.bossDef(r), style }));
        else e.go(() => new KF.FightScene(e, { mode: 'street', realm: r, node: i, def: KF.Roster.streetDef(r, (i - 1) / 2), style }));
      }
      const tx = this.nodeX(this.sel);
      this.walking = Math.abs(tx - this.px) > 1;
      if (this.walking) { this.facing = Math.sign(tx - this.px); this.px += this.facing * Math.min(Math.abs(tx - this.px), 220 * dt); }
    }
    render(ctx) {
      const t = this.t, R = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
      this.theme.background(ctx, { x: t * 10, y: 0 }, this.engine.time, { cheer: 0.25 });
      ctx.fillStyle = 'rgba(10,6,20,0.45)'; ctx.fillRect(0, 0, VW, KF.VIEW_H);
      KF.BigText.draw(ctx, this.door.name, VW / 2, 20, 3, 'fire');
      F.draw(ctx, this.door.sub, VW / 2, 36, '#9ad8ff', 1, 'center', '#000');
      KF.HUD.coins(ctx, VW - 8, 6, t);
      // Path.
      for (let i = 0; i < 9; i++) {
        const x0 = this.nodeX(i), y0 = this.nodeY(i), x1 = this.nodeX(i + 1), y1 = this.nodeY(i + 1);
        for (let k = 0; k < 1; k += 0.12) R(i < this.save.node ? '#ffd040' : '#4a4060', Math.round(U.lerp(x0, x1, k)), Math.round(U.lerp(y0, y1, k)), 2, 2);
      }
      for (let i = 0; i < 10; i++) {
        const n = this.node(i), x = this.nodeX(i), y = this.nodeY(i);
        const open = i <= this.save.node, done = this.save.won[i], sel = i === this.sel;
        const r = n.kind === 'boss' ? 11 : 8;
        ctx.fillStyle = sel ? '#ffffff' : '#0a0610'; ctx.beginPath(); ctx.arc(x, y, r + 2, 0, 7); ctx.fill();
        ctx.fillStyle = !open ? '#2a2238' : n.kind === 'boss' ? '#c02838' : n.kind === 'street' ? '#2a7a9a' : '#c08a20';
        ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
        const glyph = n.kind === 'stage' ? String(i / 2 + 1) : n.kind === 'street' ? 'VS' : '!!';
        F.draw(ctx, glyph, x + 1, y - 3, open ? '#ffffff' : '#6a6080', 1, 'center');
        if (done) { R('#7cff6a', x + r - 3, y - r, 5, 5); R('#1a1020', x + r - 2, y - r + 1, 3, 3); R('#7cff6a', x + r - 1, y - r + 2, 1, 1); }
      }
      // Fighter standing on the chosen node.
      const fr = KF.Sprites.pick(this.walking ? 'run' : 'idle', t);
      const fy = this.nodeY(Math.round((this.px - 26) / 37)) - 10;
      KF.Sprites.draw(ctx, fr, this.px, fy, this.walking ? this.facing : 1);
      // Info.
      const n = this.node(this.sel), first = !this.save.won[this.sel];
      R('rgba(8,4,16,0.82)', 20, 150, VW - 40, 40);
      F.draw(ctx, `${n.label}: ${n.name}`, VW / 2, 156, n.kind === 'boss' ? '#ff7060' : '#ffffff', 1, 'center', '#000');
      let info;
      if (n.kind === 'stage') {
        const best = this.save.best[this.sel / 2];
        info = `${n.look}   REWARD ${first ? '20 (+10 PERFECT)' : '5'} COINS` + (best !== undefined ? `   BEST ${best}` : '');
      } else if (n.kind === 'street') info = `REWARD ${first ? 25 + 10 * this.r : 8} COINS   BEST OF 3 ROUNDS`;
      else info = `REWARD ${first ? 80 + 20 * this.r : 20} COINS   BEAT IT TO UNLOCK THE NEXT REALM`;
      F.draw(ctx, info, VW / 2, 167, '#ffd040', 1, 'center', '#000');
      F.draw(ctx, 'ENTER: GO     LEFT/RIGHT: CHOOSE     C: SHOP     ESC: MAP', VW / 2, 178, '#a098b0', 1, 'center', '#000');
    }
  }
  KF.RealmScene = RealmScene;
})(window.KF);
