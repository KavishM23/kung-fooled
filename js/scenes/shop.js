'use strict';
// The Dojo: spend coins on looks, stat upgrades and special moves. Cosmetics preview on your
// fighter as you browse; buying something equips it.
(function (KF) {
  const F = KF.Font, A = KF.Audio, E = KF.Economy, VW = KF.VIEW_W, VH = KF.VIEW_H;
  const TABS = ['OUTFIT', 'HEAD', 'HAIR', 'COLOUR', 'FISTS', 'FACE', 'EXTRA', 'SKIN', 'UPGRADES', 'SPECIALS'];

  class ShopScene {
    constructor(engine, opts = {}) {
      this.engine = engine;
      this.back = opts.back;
      this.theme = KF.Themes.get('temple');
      this.tab = 0; this.sel = 0; this.scroll = 0; this.t = 0; this.msg = null;
      A.music('temple');
    }
    entries() {
      const tab = TABS[this.tab];
      if (tab === 'UPGRADES') return E.UPGRADES.map((u) => ({ kind: 'upgrade', id: u.id, name: u.name, desc: u.desc }));
      if (tab === 'SPECIALS') return E.SPECIALS.map((s) => ({ kind: 'special', id: s.id, name: s.name, desc: s.desc, price: s.price }));
      const slot = tab.toLowerCase();
      return E.ITEMS.filter((i) => i.slot === slot).map((i) => ({ kind: 'item', id: i.id, name: i.name, price: i.price, slot }));
    }
    say(text, good) { this.msg = { text, good, t: 1.6 }; }
    update(dt) {
      this.t += dt;
      if (this.msg && (this.msg.t -= dt) <= 0) this.msg = null;
      const inp = this.engine.input, e = this.engine, list = this.entries();
      if (inp.wasPressed('ArrowLeft', 'KeyA')) { this.tab = (this.tab + TABS.length - 1) % TABS.length; this.sel = 0; A.sfx('select'); }
      if (inp.wasPressed('ArrowRight', 'KeyD')) { this.tab = (this.tab + 1) % TABS.length; this.sel = 0; A.sfx('select'); }
      if (inp.wasPressed('ArrowUp', 'KeyW')) { this.sel = (this.sel + list.length - 1) % list.length; A.sfx('select'); }
      if (inp.wasPressed('ArrowDown', 'KeyS')) { this.sel = (this.sel + 1) % list.length; A.sfx('select'); }
      const click = KF.UI.clicked(this);
      if (click && click[0] === 't') { this.tab = +click.slice(1); this.sel = 0; A.sfx('select'); }
      if (click && click[0] === 'i') { const i = +click.slice(1); if (i === this.sel) this.activate(list[i]); else { this.sel = i; A.sfx('select'); } }
      if (inp.back || click === 'back') {
        const b = this.back;
        e.go(() => (b !== undefined ? new KF.RealmScene(e, b) : new KF.MapScene(e)));
      }
      if (inp.confirm || click === 'buy') this.activate(list[this.sel]);
    }
    activate(it) {
      if (it.kind === 'upgrade') {
        const c = E.upgradeCost(it.id);
        if (c === null) return this.say('ALREADY MAXED', false);
        if (E.upgrade(it.id)) { A.sfx('buy'); this.say(`${it.name} UP!`, true); } else { A.sfx('bonk'); this.say('NOT ENOUGH COINS', false); }
        return;
      }
      if (E.owns(it.id)) { E.equip(it.id); A.sfx('confirm'); this.say('EQUIPPED', true); return; }
      if (E.buy(it.id)) { E.equip(it.id); A.sfx('buy'); this.say('BOUGHT!', true); } else { A.sfx('bonk'); this.say('NOT ENOUGH COINS', false); }
    }
    previewLook() {
      const look = E.look(), it = this.entries()[this.sel];
      if (it && it.kind === 'item') Object.assign(look, E.item(it.id).look);
      if (look.wraps === 'skin') look.wraps = look.skin;
      return look;
    }
    render(ctx) {
      const t = this.t, R = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
      this.theme.background(ctx, { x: 80, y: 0 }, this.engine.time, { cheer: 0.1 });
      ctx.fillStyle = 'rgba(10,6,20,0.62)'; ctx.fillRect(0, 0, VW, VH);
      KF.UI.header(ctx, 'DOJO SHOP', null, t, 'gold');
      // Preview pedestal.
      R('#0a0610', 8, 40, 122, 146); R('#1c1630', 9, 41, 120, 144);
      const set = KF.Sprites.buildSet(this.previewLook(), 2.25, ['idle', 'jab', 'kick', 'victory']);
      const cycle = Math.floor(t / 1.2) % 4, fr = cycle === 1 ? set.frames.jab[0] : cycle === 2 ? set.frames.kick[0] : cycle === 3 ? set.frames.victory[2] : set.frames.idle[Math.floor(t * 4) % 4];
      ctx.save(); ctx.translate(66, 140); KF.Sprites.blit(ctx, fr, set); ctx.restore();
      R('#2a2240', 20, 140, 98, 4);
      const st = E.playerStats();
      [['POWER', 'power'], ['GUARD', 'guard'], ['HEALTH', 'health'], ['SPEED', 'speed']].forEach(([n, k], i) => {
        F.draw(ctx, n, 14, 147 + i * 9, '#a098b0');
        for (let l = 0; l < 5; l++) R(l < E.level(k) ? '#ffd040' : '#3a3050', 64 + l * 9, 148 + i * 9, 7, 5);
      });
      void st;
      // Tabs.
      let tx = 138, ty = 40;
      TABS.forEach((name, i) => {
        const w = F.measure(name) + 6, sel = i === this.tab;
        if (tx + w > VW - 6) { tx = 138; ty += 13; } // wrap to a second row
        R(sel ? '#ffd040' : KF.UI.hover(this, 't' + i) ? '#4a3a6a' : '#2a2240', tx, ty, w, 11);
        KF.UI.region(this, 't' + i, tx, ty, w, 11);
        F.draw(ctx, name, tx + 3, ty + 2, sel ? '#1a1020' : '#c8c0d8');
        tx += w + 2;
      });
      // Item list.
      const list = this.entries();
      this.scroll = Math.max(0, Math.min(this.sel - 2, list.length - 7));
      list.slice(this.scroll, this.scroll + 7).forEach((it, k) => {
        const i = k + this.scroll, y = 68 + k * 13, sel = i === this.sel;
        R(sel ? '#3a2c5a' : KF.UI.hover(this, 'i' + i) ? '#221a38' : '#161226', 138, y, VW - 146, 12);
        KF.UI.region(this, 'i' + i, 138, y, VW - 146, 12);
        if (sel) R('#ffd040', 138, y, 2, 12);
        F.draw(ctx, it.name, 144, y + 3, '#ffffff');
        let right, col = '#ffd040';
        if (it.kind === 'upgrade') {
          const c = E.upgradeCost(it.id);
          for (let l = 0; l < 5; l++) R(l < E.level(it.id) ? '#ffd040' : '#3a3050', 260 + l * 6, y + 4, 4, 4);
          right = c === null ? 'MAX' : `${c}`; if (c !== null && E.coins < c) col = '#8a7060';
        } else if (it.kind === 'special') {
          right = E.save().equip.special === it.id ? 'EQUIPPED' : E.owns(it.id) ? 'OWNED' : `${it.price}`;
          if (!E.owns(it.id) && E.coins < it.price) col = '#8a7060';
        } else {
          right = E.equipped(it.slot) === it.id ? 'EQUIPPED' : E.owns(it.id) ? 'OWNED' : `${it.price}`;
          if (!E.owns(it.id) && E.coins < it.price) col = '#8a7060';
          if (right === 'EQUIPPED') col = '#7cff6a'; else if (right === 'OWNED') col = '#9ad8ff';
        }
        if (/^\d+$/.test(right)) KF.HUD.coin(ctx, VW - 14 - F.measure(right) - 10, y + 2, t);
        F.draw(ctx, right, VW - 12, y + 3, col, 1, 'right');
      });
      const it = list[this.sel];
      if (this.msg) F.draw(ctx, this.msg.text, 252, 176, this.msg.good ? '#7cff6a' : '#ff6050', 1, 'center', '#000');
      else if (it && it.desc) F.draw(ctx, it.desc, 252, 176, '#b8b0c8', 1, 'center', '#000');
      else F.draw(ctx, 'CLICK AN ITEM TWICE TO BUY / EQUIP', 252, 176, '#6a6080', 1, 'center', '#000');
      KF.UI.buttonBar(ctx, this, [['buy', 'BUY / EQUIP  (ENTER)'], ['back', 'BACK  (ESC)']]);
    }
  }
  KF.ShopScene = ShopScene;
})(window.KF);
