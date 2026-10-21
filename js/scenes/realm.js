'use strict';
// A realm: five levels, each its own world, with a street fight after each of the first four and
// a boss at the end. Shown as a row of cards; each node unlocks the next. Cleared nodes can be
// replayed for smaller rewards.
(function (KF) {
  const F = KF.Font, A = KF.Audio, VW = KF.VIEW_W, U = KF.util;
  const R = (ctx, c, x, y, w = 1, h = 1) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  const CW = 120, CH = 96, GAP = 140; // card size and spacing

  class RealmScene {
    constructor(engine, realmIdx) {
      this.engine = engine;
      this.r = realmIdx;
      this.door = KF.Doors[realmIdx];
      this.theme = KF.Themes.get(this.door.theme);
      this.save = KF.Save.realm(this.door.id);
      this.sel = Math.min(9, this.save.node);
      this.scroll = this.sel;
      this.t = 0;
      A.music(this.door.music);
    }
    node(i) {
      const roster = KF.Roster.R[this.door.id];
      if (i === 9) return { kind: 'boss', name: roster.boss.name, label: 'BOSS', look: roster.boss.look };
      if (i % 2 === 1) { const f = roster.fighters[(i - 1) / 2]; return { kind: 'street', name: f.name, label: 'STREET FIGHT', look: f.look }; }
      const def = this.door.stages[i / 2], rule = KF.Rules.get(def), style = KF.Styles.forStage(this.door.id, i / 2, def);
      return { kind: 'level', name: rule.name, title: def.name, rule: rule.rule, label: `LEVEL ${i / 2 + 1}`, style, def };
    }
    update(dt) {
      this.t += dt;
      const inp = this.engine.input, e = this.engine, max = Math.min(9, this.save.node);
      if (inp.wasPressed('ArrowLeft', 'KeyA')) { this.sel = Math.max(0, this.sel - 1); A.sfx('select'); }
      if (inp.wasPressed('ArrowRight', 'KeyD')) { if (this.sel < max) { this.sel++; A.sfx('select'); } else A.sfx('bonk'); }
      this.scroll += (this.sel - this.scroll) * Math.min(1, dt * 10);
      if (inp.wasPressed('Escape')) e.go(() => new KF.MapScene(e));
      if (inp.wasPressed('KeyC')) e.go(() => new KF.ShopScene(e, { back: this.r }));
      if (inp.wasPressed('Enter', 'Space')) {
        A.sfx('confirm');
        const i = this.sel, r = this.r;
        const prev = Math.floor((i - 1) / 2), style = i % 2 ? KF.Styles.forStage(this.door.id, prev, this.door.stages[prev]).id : null;
        if (i % 2 === 0) e.go(() => new KF.PlayScene(e, { door: r, stage: i / 2 }));
        else if (i === 9) e.go(() => new KF.FightScene(e, { mode: 'boss', realm: r, node: 9, def: KF.Roster.bossDef(r), style }));
        else e.go(() => new KF.FightScene(e, { mode: 'street', realm: r, node: i, def: KF.Roster.streetDef(r, (i - 1) / 2), style }));
      }
    }
    card(ctx, i, cx, t) {
      const n = this.node(i), sel = i === this.sel, open = i <= this.save.node, done = this.save.won[i];
      const x = Math.round(cx - CW / 2), y = 44 + (sel ? -3 : 0);
      const edge = sel ? '#ffd040' : n.kind === 'boss' ? '#a02030' : '#0a0610';
      R(ctx, edge, x - 2, y - 2, CW + 4, CH + 4);
      R(ctx, '#161226', x, y, CW, CH);
      const tw = CW - 8, th = 63;
      if (n.kind === 'level') KF.blit(ctx, KF.Render.thumb(n.style.theme || n.def.theme, tw, th, n.style.id), x + 4, y + 4);
      else { // fighters: their portrait in front of the realm
        KF.blit(ctx, KF.Render.thumb(this.door.theme, tw, th), x + 4, y + 4);
        R(ctx, n.kind === 'boss' ? 'rgba(80,0,10,0.55)' : 'rgba(8,4,16,0.45)', x + 4, y + 4, tw, th);
        const set = KF.Sprites.buildSet(n.look, 1, ['idle']);
        ctx.save(); ctx.translate(cx, y + 62); ctx.scale(-1, 1);
        KF.Sprites.blit(ctx, set.frames.idle[Math.floor(t * 4) % 4], set); ctx.restore();
      }
      if (!open) {
        R(ctx, 'rgba(8,4,16,0.78)', x + 4, y + 4, tw, th);
        R(ctx, '#8a8098', cx - 6, y + 30, 12, 8); R(ctx, '#8a8098', cx - 4, y + 25, 2, 6); R(ctx, '#8a8098', cx + 2, y + 25, 2, 6); R(ctx, '#8a8098', cx - 4, y + 24, 8, 2);
      }
      if (done) { R(ctx, '#0a0610', x + CW - 13, y + 6, 9, 9); R(ctx, '#7cff6a', x + CW - 12, y + 7, 7, 7); F.draw(ctx, '+', x + CW - 9, y + 8, '#0a0610', 1, 'center'); }
      F.draw(ctx, n.label, cx, y + 71, n.kind === 'boss' ? '#ff7060' : n.kind === 'street' ? '#7cd8ff' : '#ffd040', 1, 'center', '#000');
      F.draw(ctx, open ? n.name : '???', cx, y + 82, '#ffffff', 1, 'center', '#000');
    }
    render(ctx) {
      const t = this.t;
      this.theme.background(ctx, { x: t * 10, y: 0 }, this.engine.time, { cheer: 0.25 });
      R(ctx, 'rgba(10,6,20,0.55)', 0, 0, VW, KF.VIEW_H);
      KF.UI.header(ctx, this.door.name, this.door.sub, t);
      for (let i = 0; i < 10; i++) {
        const cx = VW / 2 + (i - this.scroll) * GAP;
        if (cx > -CW && cx < VW + CW) this.card(ctx, i, cx, t);
      }
      // Progress: ten pips, levels square, fights round.
      const px0 = VW / 2 - 9 * 9;
      for (let i = 0; i < 10; i++) {
        const x = px0 + i * 18, y = 150, n = i % 2 === 0 ? 'level' : 'fight', on = this.save.won[i], here = i === this.sel;
        if (i < 9) R(ctx, i < this.save.node ? '#ffd040' : '#3a3050', x + 3, y + 2, 15, 1);
        R(ctx, here ? '#ffffff' : '#0a0610', x - 3, y - 2, 9, 9);
        R(ctx, on ? (i === 9 ? '#ff5040' : n === 'fight' ? '#7cd8ff' : '#ffd040') : i <= this.save.node ? '#6a6080' : '#2a2238', x - 2, y - 1, 7, 7);
      }
      // Details for the chosen node.
      const n = this.node(this.sel), first = !this.save.won[this.sel];
      let a, b;
      if (n.kind === 'level') {
        const best = this.save.best[this.sel / 2];
        a = n.rule || 'THE ORIGINAL. NO TWISTS, JUST TRAPS.';
        b = `"${n.title}"   REWARD ${first ? '20 (+10 PERFECT)' : '5'}` + (best !== undefined ? `   BEST ${best} DEATHS` : '');
      } else if (n.kind === 'street') { a = `${n.name} WANTS A FIGHT`; b = `BEST OF 3   REWARD ${first ? 25 + 10 * this.r : 8}`; }
      else { a = `${n.name} RULES THIS REALM`; b = `REWARD ${first ? 80 + 20 * this.r : 20}   ` + (this.r === KF.Doors.length - 1 ? 'THE FINAL BOSS' : 'WIN TO UNLOCK THE NEXT REALM'); }
      F.draw(ctx, a, VW / 2, 166, n.kind === 'level' ? '#ffd040' : '#ffb0a0', 1, 'center', '#000');
      F.draw(ctx, b, VW / 2, 177, '#c8c0d8', 1, 'center', '#000');
      KF.UI.footer(ctx, 'ENTER: GO    A/D: CHOOSE    C: SHOP    ESC: MAP');
    }
  }
  KF.RealmScene = RealmScene;
})(window.KF);
