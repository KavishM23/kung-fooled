'use strict';
(function (KF) {
  const F = KF.Font;
  KF.CombatRender = {
    world(ctx, stage, cam) {
      const c = stage.combat, p = stage.player;
      for (const e of c.enemies) {
        if (e.hp <= 0 || e.x < cam.x - 40 || e.x > cam.x + KF.VIEW_W + 40) continue;
        const x = e.x + e.w / 2 - cam.x, y = e.y + e.h - cam.y;
        if (e.warn > 0) {
          ctx.strokeStyle = `rgba(255,30,20,${0.18 + e.warn * 0.6})`; ctx.lineWidth = 0.45;
          ctx.beginPath(); ctx.moveTo(x, y - 16); ctx.lineTo(p.centerX - cam.x, p.y + 9 - cam.y); ctx.stroke();
        }
        ctx.save(); ctx.translate(x, y); ctx.scale(e.facing * (e.boss ? 1.32 : 0.82), e.boss ? 1.32 : 0.82);
        KF.Vec.draw(ctx, KF.Sprites.pick('idle', e.t).pose,
          { material: 'crystal', style: 'suit', hair: 'bald', build: e.boss ? 'heavy' : 'slim' },
          { vlook: 'lowpoly', crystal: true, flash: e.hit > 0 ? 0.7 : 0 });
        ctx.fillStyle = '#16161b'; ctx.fillRect(8, -21, 11, 3); ctx.fillRect(8, -18, 3, 5);
        ctx.restore();
        const barY = y - (e.boss ? 52 : 33), barW = e.boss ? 36 : 22;
        ctx.fillStyle = '#3a1214'; ctx.fillRect(x - barW / 2, barY, barW, 2);
        ctx.fillStyle = '#ff332b'; ctx.fillRect(x - barW / 2, barY, barW * e.hp / e.maxHp, 2);
        if (e.boss) F.draw(ctx, e.name, x, y - 62, '#b50012', 1, 'center', '#ffffff');
      }
      for (const b of c.bullets) {
        const length = Math.hypot(b.vx, b.vy), x = b.x - cam.x, y = b.y - cam.y;
        ctx.lineWidth = b.enemy ? 1.3 : 1;
        ctx.strokeStyle = b.enemy ? '#ed2017' : '#24242b';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - b.vx / length * 9, y - b.vy / length * 9); ctx.stroke();
        ctx.fillStyle = b.enemy ? '#ff6b3f' : '#fff'; ctx.beginPath(); ctx.arc(x, y, 1.1, 0, Math.PI * 2); ctx.fill();
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
      ctx.fillStyle = 'rgba(250,250,250,0.9)'; ctx.fillRect(0, KF.VIEW_H - 25, KF.VIEW_W, 25);
      F.draw(ctx, `VITALS ${'|'.repeat(Math.max(0, c.health))}   ${c.reload ? 'RELOADING' : 'AMMO ' + c.ammo + '/6'}`, 7, KF.VIEW_H - 21, '#24242b');
      F.draw(ctx, c.cleared ? 'EXIT OPEN' : `HOSTILES ${c.remaining}`, KF.VIEW_W - 7, KF.VIEW_H - 21, '#c31820', 1, 'right');
      F.draw(ctx, 'CLICK AIM/F FIRE  J/K MELEE  S BLOCK', 7, KF.VIEW_H - 10, '#55555c');
      F.draw(ctx, st.timeK < 1 ? 'TIME SLOWED' : 'TIME FLOWS', KF.VIEW_W - 7, 19, '#c31820', 1, 'right', '#fff');
    },
  };
})(window.KF);
