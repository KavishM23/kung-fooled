'use strict';
// Title screen.
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
      if (this.t > 0.3 && this.engine.input.wasPressed('Enter', 'Space', 'KeyW', 'ArrowUp')) { KF.Audio.unlock(); this.go(); }
    }
    go() {
      KF.Audio.sfx('confirm');
      this.engine.go(() => new KF.MapScene(this.engine));
    }
    render(ctx) {
      const t = this.t, cam = { x: t * 14, y: 0 };
      this.theme.background(ctx, cam, this.engine.time, { cheer: 0.3 + 0.3 * Math.sin(t) });
      ctx.fillStyle = 'rgba(10,6,20,0.35)'; ctx.fillRect(0, 0, VW, VH);
      const k = Math.min(1, t / 0.25), z = 1 + (1 - k) * 3;
      KF.BigText.draw(ctx, 'KUNG', VW / 2 - 6, 46 + Math.sin(t * 2) * 1.5, 6, 'steel', z);
      if (t > 0.18) KF.BigText.draw(ctx, 'FOOLED', VW / 2 + 6, 92 + Math.sin(t * 2 + 1) * 1.5, 6, 'fire', 1 + Math.max(0, 0.4 - t) * 8);
      if (t > 0.5) F.draw(ctx, 'A TROLL PLATFORMER. ALLEGEDLY.', VW / 2, 124, '#ffd8a0', 1, 'center', '#000');
      const fr = KF.Sprites.pick('idle', t);
      ctx.save(); ctx.translate(58, 200); ctx.scale(2, 2); KF.Sprites.blit(ctx, fr, KF.Sprites.set); ctx.restore();
      if (t > 0.6 && Math.floor(t * 2.5) % 2) F.draw(ctx, 'PRESS ENTER', VW / 2, 150, '#ffffff', 2, 'center', '#000');
      F.draw(ctx, 'PLATFORMS: ARROWS/AD MOVE  SPACE/W JUMP  R RESTART', VW / 2, 184, '#b0a8c8', 1, 'center', '#000');
      F.draw(ctx, 'FIGHTS: J PUNCH  K KICK  L SPECIAL  S BLOCK', VW / 2, 194, '#b0a8c8', 1, 'center', '#000');
      F.draw(ctx, 'EVERY TRAP CAN BE BEATEN. EVENTUALLY.', VW / 2, 205, '#7a7094', 1, 'center', '#000');
    }
  }
  KF.TitleScene = TitleScene;
})(window.KF);
