'use strict';
// Title screen (logo, PLAY, CONTROLS) and the controls page.
(function (KF) {
  const F = KF.Font, VW = KF.VIEW_W, VH = KF.VIEW_H;

  class TitleScene {
    constructor(engine) {
      this.engine = engine;
      this.theme = KF.Themes.get('temple');
      this.t = 0; this.sel = 0;
      KF.Audio.music('temple');
    }
    update(dt) {
      this.t += dt;
      const inp = this.engine.input, e = this.engine;
      if (this.t < 0.3) return;
      if (inp.wasPressed('ArrowLeft', 'KeyA', 'ArrowRight', 'KeyD')) { this.sel ^= 1; KF.Audio.sfx('select'); }
      const click = KF.UI.clicked(this);
      if (click === 'play' || click === 'controls' || inp.confirm) {
        KF.Audio.unlock(); KF.Audio.sfx('confirm');
        if (click === 'controls' || (!click && this.sel === 1)) e.go(() => new KF.ControlsScene(e));
        else e.go(() => new KF.MapScene(e));
      }
    }
    render(ctx) {
      const t = this.t, cam = { x: t * 14, y: 0 };
      this.theme.background(ctx, cam, this.engine.time, { cheer: 0.3 + 0.3 * Math.sin(t) });
      ctx.fillStyle = 'rgba(10,6,20,0.45)'; ctx.fillRect(0, 0, VW, VH);
      const k = Math.min(1, t / 0.25), z = 1 + (1 - k) * 3;
      KF.BigText.draw(ctx, 'KUNG', VW / 2 - 6, 50 + Math.sin(t * 2) * 1.5, 6, 'steel', z);
      if (t > 0.18) KF.BigText.draw(ctx, 'FOOLED', VW / 2 + 6, 96 + Math.sin(t * 2 + 1) * 1.5, 6, 'fire', 1 + Math.max(0, 0.4 - t) * 8);
      if (t > 0.5) F.draw(ctx, 'A TROLL PLATFORMER. ALLEGEDLY.', VW / 2, 128, '#ffd8a0', 1, 'center', '#000');
      if (t > 0.6) {
        const hot = KF.UI.under(this);
        KF.UI.button(ctx, this, 'play', VW / 2 - 76, 150, 70, 17, 'PLAY', hot ? false : this.sel === 0);
        KF.UI.button(ctx, this, 'controls', VW / 2 + 6, 150, 70, 17, 'CONTROLS', hot ? false : this.sel === 1);
        F.draw(ctx, 'CLICK, OR ENTER', VW / 2, 176, '#7a7094', 1, 'center', '#000');
      }
      const set = KF.Sprites.buildSet(KF.Economy.look(), 2, ['idle']), fr = set.frames.idle[Math.floor(t * 4) % 4];
      ctx.save(); ctx.translate(44, 206); KF.Sprites.blit(ctx, fr, set); ctx.restore();
    }
  }

  // Both key sets side by side, plus the mouse.
  class ControlsScene {
    constructor(engine) { this.engine = engine; this.theme = KF.Themes.get('temple'); this.t = 0; }
    update(dt) {
      this.t += dt;
      const inp = this.engine.input, click = KF.UI.clicked(this);
      if (this.t > 0.2 && (inp.back || inp.confirm || click === 'back')) { KF.Audio.sfx('confirm'); this.engine.go(() => new KF.TitleScene(this.engine)); }
    }
    render(ctx) {
      const R = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
      this.theme.background(ctx, { x: this.t * 8, y: 0 }, this.engine.time, { cheer: 0.2 });
      R('rgba(10,6,20,0.7)', 0, 0, VW, VH);
      KF.UI.header(ctx, 'CONTROLS', 'BOTH SETS WORK AT ONCE. USE WHICHEVER YOU LIKE.', this.t);
      const col = (x, title, rows) => {
        R('#0a0610', x - 1, 41, 172, 112); R('#1c1630', x, 42, 170, 110);
        F.draw(ctx, title, x + 85, 48, '#ffd040', 1, 'center');
        rows.forEach(([a, b], i) => { F.draw(ctx, a, x + 8, 62 + i * 11, '#a098b0'); F.draw(ctx, b, x + 162, 62 + i * 11, '#ffffff', 1, 'right'); });
      };
      const rows = (m, j, b, p, k, s) => [['MOVE', m], ['JUMP', j], ['BLOCK (FIGHTS)', b], ['PUNCH', p], ['KICK', k], ['SPECIAL', s], ['RESTART LEVEL', 'R'], ['PAUSE', 'ESC / P']];
      col(14, 'SET 1: WASD', rows('A  D', 'W / SPACE', 'S', 'J', 'K', 'L'));
      col(VW - 184, 'SET 2: ARROWS', rows('LEFT  RIGHT', 'UP / SPACE', 'DOWN', 'Z', 'X', 'C'));
      F.draw(ctx, 'MOUSE: CLICK MENUS, CARDS AND THE PAUSE BUTTON', VW / 2, 159, '#c8c0d8', 1, 'center', '#000');
      F.draw(ctx, 'FIGHTS: LEFT CLICK PUNCH, RIGHT CLICK KICK', VW / 2, 169, '#c8c0d8', 1, 'center', '#000');
      F.draw(ctx, 'SUPERHOT FIGHT: AIM AND CLICK TO SHOOT (OR F / V)', VW / 2, 179, '#c8c0d8', 1, 'center', '#000');
      KF.UI.buttonBar(ctx, this, [['back', 'BACK']]);
    }
  }
  KF.TitleScene = TitleScene;
  KF.ControlsScene = ControlsScene;
})(window.KF);
