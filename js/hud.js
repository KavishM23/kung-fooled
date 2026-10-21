'use strict';
// Fighting-game HUD: your "health bar" shows how far through the door you are (stage X/5),
// the level's bar drains as you approach the exit, a round timer, and a combo-style death counter.
(function (KF) {
  const R = (ctx, c, x, y, w = 1, h = 1) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  const F = KF.Font, VW = KF.VIEW_W;

  function frame(ctx, x, y, w, h) {
    R(ctx, '#0a0610', x - 2, y - 2, w + 4, h + 4);
    R(ctx, '#d8c8a0', x - 1, y - 1, w + 2, 1); R(ctx, '#d8c8a0', x - 1, y + h, w + 2, 1);
    R(ctx, '#d8c8a0', x - 1, y - 1, 1, h + 2); R(ctx, '#d8c8a0', x + w, y - 1, 1, h + 2);
    R(ctx, '#3a0a14', x, y, w, h);
  }
  function fill(ctx, x, y, w, h, ramp) {
    if (w <= 0) return;
    R(ctx, ramp[1], x, y, w, h);
    R(ctx, ramp[0], x, y, w, 2);
    R(ctx, ramp[2], x, y + h - 2, w, 2);
  }

  KF.HUD = {
    lag: 1,
    draw(ctx, s, t) {
      const BW = 150, BH = 8, Y = 8;
      // Player bar (left, fills left to right by stage).
      frame(ctx, 10, Y, BW, BH);
      const seg = BW / s.stageCount;
      for (let i = 0; i < s.stageCount; i++) {
        const x = 10 + Math.round(i * seg), w = Math.round((i + 1) * seg) - Math.round(i * seg) - 1;
        if (i < s.stageIndex) fill(ctx, x, Y, w, BH, ['#fff6a0', '#ffd030', '#c08a10']);
        else if (i === s.stageIndex) fill(ctx, x, Y, w, BH, Math.floor(t * 4) % 2 ? ['#fff6a0', '#ffd030', '#c08a10'] : ['#ffffff', '#fff080', '#e0b030']);
      }
      for (let i = 1; i < s.stageCount; i++) R(ctx, '#0a0610', 10 + Math.round(i * seg) - 1, Y, 1, BH);
      F.draw(ctx, 'BAO', 10, Y + BH + 4, '#ffffff', 1, 'left', '#000');
      F.draw(ctx, `STAGE ${s.stageIndex + 1}/${s.stageCount}`, 10 + BW, Y + BH + 4, '#ffd040', 1, 'right', '#000');

      // The level's bar (right, drains toward the door). Red trail lags behind like real damage.
      const rx = VW - 10 - BW;
      frame(ctx, rx, Y, BW, BH);
      this.lag = this.lag > s.remaining ? Math.max(s.remaining, this.lag - 0.006) : s.remaining;
      const lw = Math.round(BW * this.lag), hw = Math.round(BW * s.remaining);
      fill(ctx, rx + BW - lw, Y, lw, BH, ['#ff8a80', '#e02020', '#901010']);
      fill(ctx, rx + BW - hw, Y, hw, BH, ['#fff6a0', '#ffd030', '#c08a10']);
      F.draw(ctx, s.stageName, rx + BW, Y + BH + 4, '#ffffff', 1, 'right', '#000');
      F.draw(ctx, s.worldName, rx, Y + BH + 4, '#9ad8ff', 1, 'left', '#000');

      // Round timer.
      const secs = Math.min(999, Math.floor(s.time));
      R(ctx, '#0a0610', VW / 2 - 15, 2, 30, 22);
      R(ctx, '#2a1630', VW / 2 - 14, 3, 28, 20);
      KF.BigText.draw(ctx, String(secs).padStart(2, '0'), VW / 2, 12, 2, 'steel');
      F.draw(ctx, `ROUND ${s.round}`, VW / 2, 27, '#ff9ad0', 1, 'center', '#000');

      // Death counter, styled like a combo counter.
      if (s.deaths > 0) {
        const pulse = 1 + Math.max(0, s.deathPulse) * 0.6;
        const dw = KF.BigText.render(String(s.deaths), 3, 'fire').width;
        KF.BigText.draw(ctx, String(s.deaths), 8 + dw / 2, 50, 3, 'fire', pulse);
        F.draw(ctx, s.deaths === 1 ? 'DEATH' : 'DEATHS', 12 + dw, 45, '#ffd040', 1, 'left', '#000');
        if (s.deaths >= 10) F.draw(ctx, s.deaths >= 25 ? 'LEGENDARY!' : 'COMBO!', 12 + dw, 54, '#ff6a4a', 1, 'left', '#000');
      }
      // Status warnings live at the bottom, away from ceiling-walking action.
      const VH = KF.VIEW_H;
      if (s.reversed) F.draw(ctx, Math.floor(t * 6) % 2 ? 'CONTROLS REVERSED!' : '!DESREVER SLORTNOC', VW / 2, VH - 11, '#ff70d8', 1, 'center', '#000');
      if (s.flipped) F.draw(ctx, 'GRAVITY FLIPPED', VW / 2, s.reversed ? VH - 20 : VH - 11, '#a89aff', 1, 'center', '#000');
    },
  };
})(window.KF);
