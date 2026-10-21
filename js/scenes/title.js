'use strict';
// Title screen. The first time, THE GAME tries to talk you out of playing: "PRESS ENTER" dodges
// your first two presses, then the logo falls apart and it gives up.
(function (KF) {
  const F = KF.Font, VW = KF.VIEW_W, VH = KF.VIEW_H, N = KF.Narrator;

  class TitleScene {
    constructor(engine) {
      this.engine = engine;
      this.theme = KF.Themes.get('temple');
      this.t = 0;
      this.gag = !engine.titleSeen;   // only the first visit per session
      this.presses = 0;
      this.prompt = { x: VW / 2, y: 150 };
      this.letters = null;            // falling logo letters once it gives up
      this.leaveT = -1;
      KF.Audio.music('temple');
      N.y = 132;
    }
    makeLetters() {
      const out = [];
      const row = (word, cy, style, dx) => {
        const imgs = [...word].map((ch) => KF.BigText.render(ch, 6, style));
        const total = imgs.reduce((a, im) => a + im.width - 14, 0);
        let x = VW / 2 + dx - total / 2;
        imgs.forEach((im) => { out.push({ im, x: x + (im.width - 14) / 2, y: cy, vx: (Math.random() - 0.5) * 60, vy: -80 - Math.random() * 120, rot: 0, vr: (Math.random() - 0.5) * 6, delay: Math.random() * 0.4 }); x += im.width - 14; });
      };
      row('KUNG', 46, 'steel', -6); row('FOOLED', 92, 'fire', 6);
      return out;
    }
    update(dt) {
      this.t += dt;
      const i = this.engine.input;
      if (this.gag && this.t > 0.9 && this.presses === 0 && !this.saidHello) { this.saidHello = true; N.say(N.LINES.title[0], { hold: 9 }); }
      if (this.letters) {
        for (const l of this.letters) {
          if ((l.delay -= dt) > 0) continue;
          l.vy += 700 * dt; l.x += l.vx * dt; l.y += l.vy * dt; l.rot += l.vr * dt;
          if (l.y > 196) { l.y = 196; l.vy *= -0.35; l.vx *= 0.7; l.vr *= 0.5; if (Math.abs(l.vy) > 40) KF.Audio.sfx('land', { speed: 200 }); }
        }
      }
      if (this.leaveT >= 0 && (this.leaveT += dt) > 1.6) { this.go(); return; }
      if (this.t > 0.3 && i.wasPressed('Enter', 'Space', 'KeyW', 'ArrowUp') && this.leaveT < 0) {
        KF.Audio.unlock();
        if (!this.gag) { this.go(); return; }
        this.presses++;
        if (this.presses < 3) { // dodge
          KF.Audio.sfx('whoosh');
          this.prompt = { x: 60 + Math.random() * (VW - 120), y: 140 + Math.random() * 40 };
          N.say(N.LINES.title[this.presses], { now: true, hold: 6 });
        } else {
          KF.Audio.sfx('crumble');
          this.letters = this.makeLetters();
          N.say(N.LINES.title[3], { now: true, hold: 3 });
          this.leaveT = 0;
        }
      }
    }
    go() {
      this.engine.titleSeen = true;
      KF.Audio.sfx('confirm');
      this.engine.go(() => new KF.MapScene(this.engine));
    }
    render(ctx) {
      const t = this.t, cam = { x: t * 14, y: 0 };
      this.theme.background(ctx, cam, this.engine.time, { cheer: 0.3 + 0.3 * Math.sin(t) });
      ctx.fillStyle = 'rgba(10,6,20,0.35)'; ctx.fillRect(0, 0, VW, VH);
      if (this.letters) {
        for (const l of this.letters) {
          ctx.save(); ctx.translate(Math.round(l.x), Math.round(l.y)); ctx.rotate(l.rot);
          ctx.drawImage(l.im, -l.im.width / 2, -l.im.height / 2); ctx.restore();
        }
      } else {
        const k = Math.min(1, t / 0.25), z = 1 + (1 - k) * 3;
        KF.BigText.draw(ctx, 'KUNG', VW / 2 - 6, 46 + Math.sin(t * 2) * 1.5, 6, 'steel', z);
        if (t > 0.18) KF.BigText.draw(ctx, 'FOOLED', VW / 2 + 6, 92 + Math.sin(t * 2 + 1) * 1.5, 6, 'fire', 1 + Math.max(0, 0.4 - t) * 8);
        if (t > 0.5) F.draw(ctx, 'A TROLL PLATFORMER. ALLEGEDLY.', VW / 2, 124, '#ffd8a0', 1, 'center', '#000');
      }
      const fr = KF.Sprites.pick(this.letters ? 'victory' : 'idle', t);
      ctx.save(); ctx.translate(58, 200); ctx.scale(2, 2); KF.Sprites.blit(ctx, fr, KF.Sprites.set); ctx.restore();
      if (t > 0.6 && Math.floor(t * 2.5) % 2 && this.leaveT < 0) F.draw(ctx, 'PRESS ENTER', this.prompt.x, this.prompt.y, '#ffffff', 2, 'center', '#000');
      F.draw(ctx, 'PLATFORMS: ARROWS/AD MOVE  SPACE/W JUMP  R RESTART', VW / 2, 184, '#b0a8c8', 1, 'center', '#000');
      F.draw(ctx, 'FIGHTS: J PUNCH  K KICK  L SPECIAL  S BLOCK', VW / 2, 194, '#b0a8c8', 1, 'center', '#000');
      F.draw(ctx, 'EVERY TRAP CAN BE BEATEN. EVENTUALLY.', VW / 2, 205, '#7a7094', 1, 'center', '#000');
    }
  }
  KF.TitleScene = TitleScene;
})(window.KF);
