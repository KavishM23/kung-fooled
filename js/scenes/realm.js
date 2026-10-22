'use strict';
// A realm: one style, four levels in different places, a street fight in the middle and a boss
// at the end. Shown as a row of cards; each node unlocks the next. Cleared nodes can be
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
      this.path = KF.Path.of(this.door);
      this.sel = Math.min(this.path.count - 1, this.save.node);
      this.scroll = this.sel;
      this.t = 0;
      A.music(this.door.music);
    }
    // Nodes along the realm's path (this.path.of): by default level, level, street fight, level, level, boss.
    node(i) {
      const roster = KF.Roster.R[this.door.id], kind = this.path.kinds[i];
      if (kind === 'boss') return { kind, name: roster.boss.name, label: 'BOSS', look: roster.boss.look };
      if (kind === 'street') { const f = roster.fighters[0]; return { kind, name: f.name, label: 'STREET FIGHT', look: f.look }; }
      const s = this.path.stageOfNode(i), def = this.door.stages[s], rule = KF.Rules.get(def), style = KF.Styles.forStage(this.door.id, s, def);
      return { kind, stage: s, name: KF.placeName(def.env), rule: rule.rule, label: `LEVEL ${s + 1}`, style, def };
    }
    // The style a fight at node i uses: the one of the level just before it.
    fightOpts(i) { const def = this.door.stages[this.path.stageOfNode(i - 1)]; return { style: def.style, env: def.env }; }
    update(dt) {
      this.t += dt;
      const inp = this.engine.input, e = this.engine, max = this.path.count - 1; // every node is open
      if (inp.wasPressed('ArrowLeft', 'KeyA')) { this.sel = Math.max(0, this.sel - 1); A.sfx('select'); }
      if (inp.wasPressed('ArrowRight', 'KeyD')) { if (this.sel < max) { this.sel++; A.sfx('select'); } else A.sfx('bonk'); }
      this.scroll += (this.sel - this.scroll) * Math.min(1, dt * 10);
      const click = KF.UI.clicked(this);
      let go = inp.confirm || click === 'go';
      if (click && click[0] === 'c') { const i = +click.slice(1); if (i === this.sel) go = true; else if (i <= max) { this.sel = i; A.sfx('select'); } else A.sfx('bonk'); }
      if (inp.back || click === 'back') e.go(() => new KF.MapScene(e));
      if (inp.wasPressed('KeyC') || click === 'shop') e.go(() => new KF.ShopScene(e, { back: this.r }));
      if (go) {
        A.sfx('confirm');
        const i = this.sel, r = this.r, kind = this.path.kinds[i];
        if (kind === 'level') e.go(() => new KF.PlayScene(e, { door: r, stage: this.path.stageOfNode(i) }));
        else if (kind === 'boss') e.go(() => new KF.FightScene(e, { mode: 'boss', realm: r, node: i, def: KF.Roster.bossDef(r), ...this.fightOpts(i) }));
        else e.go(() => new KF.FightScene(e, { mode: 'street', realm: r, node: i, def: KF.Roster.streetDef(r, 0), ...this.fightOpts(i) }));
      }
    }
    card(ctx, i, cx, t) {
      const n = this.node(i), sel = i === this.sel, open = true, done = this.save.won[i];
      const x = Math.round(cx - CW / 2), y = 44 + (sel ? -3 : 0);
      const edge = sel ? '#ffd040' : n.kind === 'boss' ? '#a02030' : '#0a0610';
      R(ctx, sel ? edge : KF.UI.hover(this, 'c' + i) ? '#6a5a8a' : edge, x - 2, y - 2, CW + 4, CH + 4);
      KF.UI.region(this, 'c' + i, x - 2, y - 2, CW + 4, CH + 4);
      R(ctx, '#161226', x, y, CW, CH);
      const tw = CW - 8, th = 63;
      if (n.kind === 'level') KF.blit(ctx, KF.Render.thumb(n.def.env, tw, th, n.style.id), x + 4, y + 4);
      else { // fighters: their portrait in front of the realm
        KF.blit(ctx, KF.Render.thumb(this.fightOpts(i).env, tw, th, this.fightOpts(i).style), x + 4, y + 4);
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
      for (let i = 0; i < this.path.count; i++) {
        const cx = VW / 2 + (i - this.scroll) * GAP;
        if (cx > -CW && cx < VW + CW) this.card(ctx, i, cx, t);
      }
      // Progress: ten pips, levels square, fights round.
      const N = this.path.count, px0 = VW / 2 - (N - 1) * 12;
      for (let i = 0; i < N; i++) {
        const x = px0 + i * 24, y = 150, n = this.path.kinds[i], on = this.save.won[i], here = i === this.sel;
        if (i < N - 1) R(ctx, i < this.save.node ? '#ffd040' : '#3a3050', x + 3, y + 2, 21, 1);
        R(ctx, here ? '#ffffff' : '#0a0610', x - 3, y - 2, 9, 9);
        R(ctx, on ? (n === 'boss' ? '#ff5040' : n === 'street' ? '#7cd8ff' : '#ffd040') : i <= this.save.node ? '#6a6080' : '#2a2238', x - 2, y - 1, 7, 7);
      }
      // Details for the chosen node.
      const n = this.node(this.sel), first = !this.save.won[this.sel];
      let a, b;
      if (n.kind === 'level') {
        const best = this.save.best[n.stage];
        a = n.rule || 'THE ORIGINAL. NO TWISTS, JUST TRAPS.';
        b = `REWARD ${first ? '20 (+10 PERFECT)' : '5'}` + (best !== undefined ? `   BEST ${best} DEATHS` : '');
      } else if (n.kind === 'street') { a = `${n.name} WANTS A FIGHT`; b = `BEST OF 3   REWARD ${first ? 40 + 10 * this.r : 10}`; }
      else { a = `${n.name} RULES THIS REALM`; b = `REWARD ${first ? 100 + 20 * this.r : 20}   ` + (this.r === KF.Doors.length - 1 ? 'THE FINAL BOSS' : 'WIN TO UNLOCK THE NEXT REALM'); }
      F.draw(ctx, a, VW / 2, 166, n.kind === 'level' ? '#ffd040' : '#ffb0a0', 1, 'center', '#000');
      F.draw(ctx, b, VW / 2, 177, '#c8c0d8', 1, 'center', '#000');
      KF.UI.buttonBar(ctx, this, [['go', 'GO (ENTER)'], ['shop', 'SHOP (C)'], ['back', 'MAP (ESC)']]);
    }
  }
  KF.RealmScene = RealmScene;
})(window.KF);
