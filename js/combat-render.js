'use strict';
(function (KF) {
  const F = KF.Font;
  KF.CombatRender = {
    topHud(ctx, scene, st) {
      ctx.fillStyle = 'rgba(250,251,251,0.94)'; ctx.fillRect(0, 0, KF.VIEW_W, 14);
      ctx.fillStyle = '#c3cccf'; ctx.fillRect(0, 14, KF.VIEW_W, 0.5);
      ctx.font = 'bold 8px Arial, sans-serif'; ctx.textBaseline = 'top';
      ctx.textAlign = 'left'; ctx.fillStyle = '#202428'; ctx.fillText('SUPERHOT', 7, 3);
      ctx.textAlign = 'center'; ctx.fillStyle = '#657176';
      ctx.fillText(`0:${String(Math.floor(scene.time) % 60).padStart(2, '0')}`, KF.VIEW_W / 2, 3);
      ctx.textAlign = 'right'; ctx.fillStyle = '#ae1a23'; ctx.fillText(`DEATHS ${scene.deaths}`, KF.VIEW_W - 18, 3);
      KF.UI.pauseButton(ctx, scene, KF.VIEW_W - 13, 1);
      void st;
    },
    world(ctx, stage, cam) {
      const c = stage.combat, p = stage.player;
      for (const e of c.enemies) {
        if (e.hp <= 0 || e.x < cam.x - 40 || e.x > cam.x + KF.VIEW_W + 40) continue;
        const x = e.x + e.w / 2 - cam.x, y = e.y + e.h - cam.y;
        if (e.warn > 0) {
          ctx.strokeStyle = `rgba(25,28,31,${0.12 + e.warn * 0.35})`; ctx.lineWidth = 0.45;
          ctx.beginPath(); ctx.moveTo(x, y - 16); ctx.lineTo(p.centerX - cam.x, p.y + 9 - cam.y); ctx.stroke();
        }
        KF.SuperhotFigure.draw(ctx, x, y, e.facing, e.t, true, e.boss, e.hit > 0);
        ctx.save(); ctx.translate(x, y - (e.boss ? 23 : 16)); ctx.scale(e.facing, 1);
        ctx.fillStyle = '#171b1e'; ctx.fillRect(4, -1, 11, 2.8); ctx.fillRect(6, 1, 2.8, 4);
        ctx.fillStyle = '#626b70'; ctx.fillRect(5, -1, 8, 0.45); ctx.restore();
        const barY = y - (e.boss ? 51 : 36), barW = e.boss ? 30 : 18;
        ctx.fillStyle = '#3a1214'; ctx.fillRect(x - barW / 2, barY, barW, 2);
        ctx.fillStyle = '#ff332b'; ctx.fillRect(x - barW / 2, barY, barW * e.hp / e.maxHp, 2);
        if (e.boss) { ctx.fillStyle = '#a50010'; ctx.font = 'bold 7px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(e.name, x, y - 53); }
      }
      for (const b of c.bullets) {
        const length = Math.hypot(b.vx, b.vy), x = b.x - cam.x, y = b.y - cam.y;
        const dx = b.vx / length, dy = b.vy / length;
        ctx.strokeStyle = 'rgba(25,30,34,0.22)'; ctx.lineWidth = 0.55;
        ctx.beginPath(); ctx.moveTo(x - dx * 5, y - dy * 5); ctx.lineTo(x - dx * 16, y - dy * 16); ctx.stroke();
        ctx.strokeStyle = '#1a1d20'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x - dx * 3, y - dy * 3); ctx.lineTo(x + dx * 3, y + dy * 3); ctx.stroke();
        ctx.strokeStyle = '#aeb7ba'; ctx.lineWidth = 0.35;
        ctx.beginPath(); ctx.moveTo(x - dx * 2, y - dy * 2 - 0.45); ctx.lineTo(x + dx * 2, y + dy * 2 - 0.45); ctx.stroke();
      }
      for (const s of c.shards) {
        ctx.save(); ctx.globalAlpha = Math.min(1, s.life * 2); ctx.translate(s.x - cam.x, s.y - cam.y); ctx.rotate(s.rot);
        ctx.fillStyle = s.size > 2.5 ? '#ff533f' : '#ad0013';
        ctx.beginPath(); ctx.moveTo(-s.size, -s.size); ctx.lineTo(s.size, 0); ctx.lineTo(0, s.size * 1.4); ctx.closePath(); ctx.fill(); ctx.restore();
      }
      // The held weapon follows the same side profile and camera as the platformer.
      if (stage.state === 'play') {
        const x = p.centerX - cam.x + p.facing * 4, y = p.y + 8 - cam.y;
        ctx.save(); ctx.translate(x, y); ctx.scale(p.facing, 1);
        ctx.fillStyle = '#18181e'; ctx.fillRect(0, -1, 11, 3); ctx.fillRect(1, 2, 3, 4);
        ctx.fillStyle = '#777780'; ctx.fillRect(1, -1, 9, 0.6);
        if (c.shotT > 0) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(11, 0); ctx.lineTo(17, -3); ctx.lineTo(15, 1); ctx.lineTo(17, 4); ctx.closePath(); ctx.fill(); }
        ctx.restore();
      }
      const d = stage.world.door;
      if (d && !c.cleared && Math.abs(d.x - cam.x - KF.VIEW_W / 2) < KF.VIEW_W) {
        F.draw(ctx, 'CLEAR ALL HOSTILES', d.x + 8 - cam.x, d.y - 10 - cam.y, '#b40012', 1, 'center', '#fff');
      }
    },
    hud(ctx, st) {
      const c = st.combat;
      ctx.fillStyle = 'rgba(249,250,250,0.95)'; ctx.fillRect(0, KF.VIEW_H - 17, KF.VIEW_W, 17);
      ctx.fillStyle = '#b7c1c4'; ctx.fillRect(0, KF.VIEW_H - 17, KF.VIEW_W, 0.6);
      ctx.font = 'bold 8px Arial, sans-serif'; ctx.textBaseline = 'top'; ctx.textAlign = 'left'; ctx.fillStyle = '#25292c';
      ctx.fillText(`HEALTH ${'|'.repeat(Math.max(0, c.health))}   ${c.reload ? 'RELOADING' : 'AMMO ' + c.ammo + '/6'}`, 7, KF.VIEW_H - 12);
      ctx.textAlign = 'right'; ctx.fillStyle = '#b21420';
      ctx.fillText(c.cleared ? 'EXIT OPEN' : `HOSTILES ${c.remaining}`, KF.VIEW_W - 7, KF.VIEW_H - 12);
      ctx.font = 'bold 7px Arial, sans-serif';
      ctx.fillText(st.timeK < 1 ? 'TIME MOVES WHEN YOU MOVE' : 'TIME MOVING', KF.VIEW_W - 7, 18);
    },
  };
})(window.KF);
