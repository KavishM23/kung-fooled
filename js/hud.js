'use strict';
// HUD pieces: the platform strip, coins.
(function (KF) {
  const R = (ctx, c, x, y, w = 1, h = 1) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  const F = KF.Font, VW = KF.VIEW_W;


  // Shared menu layout, so every screen has the same header, footer and text sizes:
  //   header  title at y 16 (big text, scale 2), optional subtitle at y 30, coins top-right
  //   content y 40 - 186
  //   footer  dark bar from y 192: one line of controls, optional dim hint line under it
  KF.UI = {
    TOP: 40, BOTTOM: 186,
    header(ctx, title, sub, t, style = 'fire') {
      KF.BigText.draw(ctx, title, VW / 2, 16, 2, style);
      if (sub) F.draw(ctx, sub, VW / 2, 29, '#9ad8ff', 1, 'center', '#000');
      KF.HUD.coins(ctx, VW - 8, 6, t);
    },
    // ---- mouse ----
    // Scenes register clickable rectangles while they draw; update() asks what was clicked.
    region(scene, id, x, y, w, h) { (scene.hits || (scene.hits = [])).push({ id, x, y, w, h }); },
    under(scene) {
      const m = KF.engine.input.mouse;
      if (!m.seen || !scene.hits) return null;
      for (let i = scene.hits.length - 1; i >= 0; i--) { const r = scene.hits[i]; if (m.x >= r.x && m.x < r.x + r.w && m.y >= r.y && m.y < r.y + r.h) return r.id; }
      return null;
    },
    hover(scene, id) { return this.under(scene) === id; },
    clicked(scene) { return KF.engine.input.clicked ? this.under(scene) : null; },
    // A small plate button. Highlighted when hovered or `on`.
    button(ctx, scene, id, x, y, w, h, label, on = false) {
      const hot = on || this.hover(scene, id);
      R(ctx, hot ? '#ffd040' : '#0a0610', x - 1, y - 1, w + 2, h + 2);
      R(ctx, hot ? '#3a2c5a' : '#1c1630', x, y, w, h);
      F.draw(ctx, label, x + w / 2, y + Math.round((h - 7) / 2), hot ? '#ffffff' : '#c8c0d8', 1, 'center');
      this.region(scene, id, x, y, w, h);
    },
    // A row of buttons spread across the footer: items = [[id, label], ...].
    buttonBar(ctx, scene, items, y = 197) {
      const VH = KF.VIEW_H;
      R(ctx, 'rgba(8,4,16,0.82)', 0, 192, VW, VH - 192);
      R(ctx, 'rgba(255,255,255,0.10)', 0, 192, VW, 1);
      const gap = 6, widths = items.map(([, l]) => F.measure(l, 1) + 12), total = widths.reduce((a, b) => a + b, 0) + gap * (items.length - 1);
      let x = Math.round(VW / 2 - total / 2);
      items.forEach(([id, label], i) => { this.button(ctx, scene, id, x, y, widths[i], 13, label); x += widths[i] + gap; });
    },
    // A vertical menu of buttons (ids m0, m1, ...). menuInput() handles keys, hover and clicks:
    // it returns the chosen index once (Enter/Space or a click), and keeps scene[selKey] in sync.
    menu(ctx, scene, opts, sel, y, w = 132) {
      opts.forEach((o, i) => this.button(ctx, scene, 'm' + i, VW / 2 - w / 2, y + i * 16, w, 13, o, i === sel));
    },
    menuInput(scene, input, n, selKey) {
      const A = KF.Audio, h = this.under(scene);
      if (input.wasPressed('ArrowUp', 'KeyW')) { scene[selKey] = (scene[selKey] + n - 1) % n; A.sfx('select'); }
      if (input.wasPressed('ArrowDown', 'KeyS')) { scene[selKey] = (scene[selKey] + 1) % n; A.sfx('select'); }
      if (h && h[0] === 'm' && input.mouse.moved) { const i = +h.slice(1); if (i !== scene[selKey] && i < n) scene[selKey] = i; }
      if (input.clicked && h && h[0] === 'm') return +h.slice(1);
      if (input.wasPressed('Enter', 'Space')) return scene[selKey];
      return -1;
    },
    // The pause button: two bars in a small square.
    pauseButton(ctx, scene, x, y) {
      const hot = this.hover(scene, 'pause');
      R(ctx, hot ? '#ffd040' : 'rgba(255,255,255,0.25)', x, y, 11, 11);
      R(ctx, hot ? '#3a2c5a' : 'rgba(8,4,16,0.85)', x + 1, y + 1, 9, 9);
      R(ctx, '#ffffff', x + 3, y + 3, 2, 5); R(ctx, '#ffffff', x + 6, y + 3, 2, 5);
      this.region(scene, 'pause', x - 2, y - 2, 15, 15);
    },

    footer(ctx, keys, hint) {
      const VH = KF.VIEW_H;
      R(ctx, 'rgba(8,4,16,0.82)', 0, 192, VW, VH - 192);
      R(ctx, 'rgba(255,255,255,0.10)', 0, 192, VW, 1);
      F.draw(ctx, keys, VW / 2, hint ? 197 : 201, '#ffffff', 1, 'center', '#000');
      if (hint) F.draw(ctx, hint, VW / 2, 207, '#8a80a0', 1, 'center', '#000');
    },
  };

  KF.HUD = {
    lag: 1,
    // Spinning gold coin, 7x7.
    coin(ctx, x, y, t) {
      const w = [7, 5, 3, 1, 3, 5][Math.floor(t * 8) % 6], ox = Math.round(x + (7 - w) / 2);
      R(ctx, '#1a1020', ox - 1, y - 1, w + 2, 9);
      R(ctx, '#e0a020', ox, y, w, 7); R(ctx, '#fff080', ox, y, Math.max(1, w - 2), 2); R(ctx, '#a06010', ox, y + 6, w, 1);
    },
    // Coin total, right-aligned at (x, y).
    coins(ctx, x, y, t) {
      const text = String(KF.Save.data.coins), w = F.measure(text, 1);
      R(ctx, 'rgba(8,4,16,0.7)', x - w - 16, y - 2, w + 18, 12);
      this.coin(ctx, x - w - 12, y, t);
      F.draw(ctx, text, x, y, '#ffd040', 1, 'right', '#000');
    },
    // Platform HUD: one slim strip along the top. World name left, timer centre, deaths right,
    // and a thin line underneath showing how far you are from the door.
    H: 13,
    draw(ctx, s, t) {
      const H = this.H, VH = KF.VIEW_H;
      R(ctx, 'rgba(8,4,16,0.72)', 0, 0, VW, H);
      R(ctx, 'rgba(255,255,255,0.10)', 0, H, VW, 1);
      this.lag = this.lag > s.remaining ? Math.max(s.remaining, this.lag - 0.006) : s.remaining;
      R(ctx, '#ffd040', 0, H, Math.round(VW * (1 - s.remaining)), 1);
      if (s.part) {
        R(ctx, '#f2ebd8', Math.round(VW / 3), H, 1, 2);
        R(ctx, '#f2ebd8', Math.round(VW * 2 / 3), H, 1, 2);
        F.draw(ctx, `P${s.part}/3`, VW - 53, 3, '#ffd040', 1, 'right', '#000');
      }
      F.draw(ctx, s.worldName, 6, 3, '#ffffff', 1, 'left', '#000');
      const secs = Math.floor(s.time);
      F.draw(ctx, `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`, VW / 2, 3, '#c8c0d8', 1, 'center', '#000');
      const pulse = s.deathPulse > 0 && Math.floor(t * 20) % 2;
      const dt = `${s.deaths}`, dw = F.measure(dt, 1);
      F.draw(ctx, dt, VW - 20, 3, pulse ? '#ffffff' : '#ff7a5a', 1, 'right', '#000');
      this.skull(ctx, VW - 20 - dw - 9, 3, pulse ? '#ffffff' : '#ff7a5a');
      if (s.scene) KF.UI.pauseButton(ctx, s.scene, VW - 13, 1);
      // Status warnings live at the bottom, away from ceiling-walking action.
      if (s.reversed) F.draw(ctx, Math.floor(t * 6) % 2 ? 'CONTROLS REVERSED!' : '!DESREVER SLORTNOC', VW / 2, VH - 11, '#ff70d8', 1, 'center', '#000');
      if (s.flipped) F.draw(ctx, 'GRAVITY FLIPPED', VW / 2, s.reversed ? VH - 20 : VH - 11, '#a89aff', 1, 'center', '#000');
    },
    // 7x7 skull for the death count.
    skull(ctx, x, y, c) {
      R(ctx, c, x + 1, y, 5, 1); R(ctx, c, x, y + 1, 7, 3); R(ctx, c, x + 1, y + 4, 5, 1); R(ctx, c, x + 2, y + 5, 3, 2);
      R(ctx, '#000', x + 1, y + 2, 2, 1); R(ctx, '#000', x + 4, y + 2, 2, 1);
    },
  };
})(window.KF);
