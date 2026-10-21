'use strict';
(function (KF) {
  const F = KF.Font, VW = KF.VIEW_W, VH = KF.VIEW_H;

  class TitleScene {
    constructor(engine) {
      this.engine = engine;
      this.theme = KF.Themes.get('temple');
      this.t = 0;
      KF.Audio.music('temple');
    }
    update(dt) {
      this.t += dt;
      const i = this.engine.input;
      if (this.t > 0.3 && i.wasPressed('Enter', 'Space', 'KeyW', 'ArrowUp')) {
        KF.Audio.sfx('confirm');
        this.engine.go(() => new KF.SelectScene(this.engine));
      }
    }
    render(ctx) {
      const t = this.t, cam = { x: t * 14, y: 0 };
      this.theme.background(ctx, cam, this.engine.time, { cheer: 0.3 + 0.3 * Math.sin(t) });
      ctx.fillStyle = 'rgba(10,6,20,0.35)'; ctx.fillRect(0, 0, VW, VH);
      // Logo slams in, then idles with a slight bob.
      const k = Math.min(1, t / 0.25), z = 1 + (1 - k) * 3;
      KF.BigText.draw(ctx, 'KUNG', VW / 2 - 6, 46 + Math.sin(t * 2) * 1.5, 6, 'steel', z);
      if (t > 0.18) KF.BigText.draw(ctx, 'FOOLED', VW / 2 + 6, 92 + Math.sin(t * 2 + 1) * 1.5, 6, 'fire', 1 + Math.max(0, 0.4 - t) * 8);
      if (t > 0.5) F.draw(ctx, 'A TROLL PLATFORMER', VW / 2, 124, '#ffd8a0', 1, 'center', '#000');
      // The fighter, at double size, in his stance.
      const fr = KF.Sprites.pick('idle', t);
      ctx.save(); ctx.translate(58, 200); ctx.scale(2, 2); ctx.drawImage(fr.img, -KF.Sprites.AX, -KF.Sprites.AY); ctx.restore();
      if (t > 0.6 && Math.floor(t * 2.5) % 2) F.draw(ctx, 'PRESS ENTER', VW / 2, 150, '#ffffff', 2, 'center', '#000');
      F.draw(ctx, 'ARROWS/AD MOVE   SPACE/W JUMP   R RESTART   M SOUND', VW / 2, 190, '#b0a8c8', 1, 'center', '#000');
      F.draw(ctx, 'EVERY TRAP CAN BE BEATEN. EVENTUALLY.', VW / 2, 202, '#7a7094', 1, 'center', '#000');
    }
  }
  KF.TitleScene = TitleScene;
})(window.KF);
