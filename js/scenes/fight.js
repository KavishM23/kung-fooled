'use strict';
// One-on-one fight, best of three rounds.
//   mode 'street': the challenger after a stage   mode 'boss': end of a realm
//   mode 'arena':  Street Arena ladder (opts.streak)
// Controls: move A/D or arrows, jump W/Up/Space, block S/Down, punch J (or Z),
// kick K (or X), special L (or C). Punch three times quickly for a combo.
(function (KF) {
  const U = KF.util, F = KF.Font, A = KF.Audio, BT = KF.BigText;
  const VW = KF.VIEW_W, VH = KF.VIEW_H, FLOOR = KF.Fight.FLOOR;
  const ROUND_TIME = 60;

  class FightScene {
    constructor(engine, opts) {
      this.engine = engine;
      this.opts = opts;
      this.mode = opts.mode;
      this.realmIdx = opts.realm ?? 0;
      this.realm = KF.Doors[this.realmIdx];
      // Fights keep the look of the stage before them; the arena picks a random look each bout.
      const ids = Object.keys(KF.Styles.all).filter((k) => !['pocket', 'bsod', 'ascii'].includes(k));
      this.style = KF.Styles.get(opts.style || (this.mode === 'arena' ? ids[Math.floor(Math.random() * ids.length)] : 'hd'));
      this.theme = KF.Themes.get(this.style.theme || (this.mode === 'arena' ? 'neon' : this.realm.theme));
      KF.Audio.setLowpass(this.style.audio && this.style.audio.lowpass);
      this.oppDef = opts.def;
      const ps = KF.Economy.playerStats();
      this.player = new KF.Fight.Fighter({ name: 'BAO', look: KF.Economy.look(), stats: ps, color: '#7cf0ff' }, 110, 1);
      this.opp = new KF.Fight.Fighter(this.oppDef, VW - 110, -1);
      this.ai = new KF.Fight.AI(this.oppDef.d);
      this.wins = [0, 0];
      this.round = 1;
      this.fx = new KF.FX();
      this.projectiles = [];
      this.hitstop = 0;
      this.slow = 1;
      this.mood = { cheer: 0.2 };
      this.paused = false; this.pauseSel = 0;
      this.menuSel = 0;
      this.setPhase('intro');
      A.music(this.mode === 'boss' ? 'boss' : 'fight');
    }
    setPhase(p) { this.phase = p; this.phaseT = 0; this.cues = {}; }
    cue(n, at) { if (this.phaseT >= at && !this.cues[n]) { this.cues[n] = true; return true; } return false; }

    startRound() {
      const pm = this.player.meter, om = this.opp.meter;
      this.player.reset(110, 1); this.opp.reset(VW - 110, -1);
      this.player.meter = pm; this.opp.meter = om;
      this.projectiles = [];
      this.timer = ROUND_TIME;
      this.ai = new KF.Fight.AI(this.oppDef.d);
      this.setPhase('round');
    }

    playerInput() {
      const i = this.engine.input;
      return {
        left: i.isDown('ArrowLeft', 'KeyA'), right: i.isDown('ArrowRight', 'KeyD'),
        block: i.isDown('ArrowDown', 'KeyS'),
        jump: i.wasPressed('ArrowUp', 'KeyW', 'Space'),
        punch: i.wasPressed('KeyJ', 'KeyZ'), kick: i.wasPressed('KeyK', 'KeyX'), special: i.wasPressed('KeyL', 'KeyC'),
      };
    }

    spawnProjectile(owner, kind) {
      if (kind === 'wave') {
        this.projectiles.push({ owner, kind, x: owner.x + owner.facing * 22, y: owner.y - 40, vx: 230 * owner.facing, w: 16, h: 14, dmg: 14, life: 2.2, t: 0, color: owner.color });
      } else { // quake: a shockwave rolling along the floor
        this.projectiles.push({ owner, kind, x: owner.x + owner.facing * 18, y: FLOOR - 12, vx: 200 * owner.facing, w: 20, h: 12, dmg: 13, life: 1.5, t: 0, color: owner.color });
        this.fx.shake(4, 0.25); this.fx.dust(owner.x, FLOOR, 10);
      }
      A.sfx(kind === 'wave' ? 'wave' : 'slam');
    }

    resolveHits(a, b) {
      const hb = a.hitbox();
      if (!hb) return;
      const m = a.move;
      if (m.multi) { if (a.moveT - a.lastMulti < m.multi) return; } else if (a.hitDone) return;
      if (!U.overlap(hb, b.hurtbox())) return;
      a.lastMulti = a.moveT;
      a.hitDone = true;
      const res = b.receive(m, a, this);
      if (res === 'miss') return;
      const cx = (hb.x + hb.w / 2 + b.x) / 2, cy = hb.y + hb.h / 2;
      this.impact(res, a, b, cx, cy, m.dmg >= 11);
    }

    impact(res, a, b, x, y, heavy) {
      if (res === 'block') {
        this.fx.tick(x, y); A.sfx('block');
        this.hitstop = 0.04;
        return;
      }
      a.combo = (b.state === 'hit' || b.state === 'down' || b.state === 'ko') ? a.combo + 1 : 1;
      this.fx.spark(x, y, heavy ? 1 : 0.6);
      this.fx.shake(heavy ? 4 : 2, 0.15);
      this.hitstop = heavy ? 0.11 : 0.07;
      A.sfx(heavy ? 'heavy' : 'punch');
      if (b.state === 'ko') this.onKO(a, b);
    }

    onKO(winner, loser) {
      this.hitstop = 0.25;
      this.slow = 0.3;
      this.fx.flash = 1; this.fx.shake(8, 0.5);
      A.sfx('hit'); A.sfx('ko');
      this.koWinner = winner;
      this.setPhase('ko');
      this.mood.cheer = 1.5;
    }

    updateProjectiles(dt) {
      for (const p of this.projectiles) {
        p.t += dt; p.x += p.vx * dt; p.life -= dt;
        const target = p.owner === this.player ? this.opp : this.player;
        const box = { x: p.x - p.w / 2, y: p.y - p.h / 2, w: p.w, h: p.h };
        if (p.life > 0 && U.overlap(box, target.hurtbox())) {
          const res = target.receive({ dmg: p.dmg, push: 140, stun: 0.45, down: p.kind === 'quake' }, p.owner, this);
          if (res !== 'miss') { p.life = 0; this.impact(res, p.owner, target, p.x, p.y, true); }
        }
        if (p.x < -20 || p.x > VW + 20) p.life = 0;
      }
      // Opposing waves cancel each other out.
      for (const p of this.projectiles) for (const q of this.projectiles) {
        if (p !== q && p.owner !== q.owner && p.life > 0 && q.life > 0 && Math.abs(p.x - q.x) < 14 && Math.abs(p.y - q.y) < 20) {
          p.life = q.life = 0; this.fx.spark((p.x + q.x) / 2, p.y, 0.7); A.sfx('block');
        }
      }
      this.projectiles = this.projectiles.filter((p) => p.life > 0);
    }

    update(dt) {
      const input = this.engine.input;
      if (input.wasPressed('Escape') && ['fight', 'round'].includes(this.phase)) { this.paused = !this.paused; this.pauseSel = 0; A.sfx('pause'); }
      if (this.paused) return this.updatePause(input);
      this.fx.update(dt);
      this.mood.cheer = Math.max(0.15, this.mood.cheer - dt * 0.5);
      this.phaseT += dt;
      const P = this.player, O = this.opp;

      if (this.phase === 'intro') {
        if (this.cue('vs', 0.05)) A.sfx('round');
        if (this.phaseT > 1.8 || (this.phaseT > 0.6 && (input.jumpPressed || input.wasPressed('Enter', 'KeyJ')))) this.startRound();
        return;
      }
      if (this.phase === 'round') {
        if (this.cue('r', 0.02)) { A.sfx('round'); this.fx.shake(3, 0.2); }
        if (this.cue('go', 0.9)) { A.sfx('go'); this.fx.shake(5, 0.25); }
        P.update(dt, {}, O, this); O.update(dt, {}, P, this);
        if (this.phaseT > 1.2) this.setPhase('fight');
        return;
      }
      if (this.phase === 'result') return this.updateResult(input);

      // Hitstop freezes the action for a few frames on impact.
      if (this.hitstop > 0) { this.hitstop -= dt; return; }
      const sdt = dt * this.slow;
      if (this.slow < 1) this.slow = Math.min(1, this.slow + dt * 0.8);

      if (this.phase === 'fight') {
        this.timer -= dt;
        P.update(sdt, this.playerInput(), O, this);
        O.update(sdt, this.ai.update(sdt, O, P, this), P, this);
        this.resolveHits(P, O); this.resolveHits(O, P);
        this.updateProjectiles(sdt);
        if (P.state !== 'hit' && P.state !== 'down') O.combo = 0;
        if (O.state !== 'hit' && O.state !== 'down') P.combo = 0;
        // Bodies don't overlap.
        const dx = O.x - P.x;
        if (Math.abs(dx) < 20 && Math.abs(O.y - P.y) < 40) {
          const push = (20 - Math.abs(dx)) / 2, s = Math.sign(dx) || 1;
          P.x = U.clamp(P.x - push * s, KF.Fight.BOUNDS[0], KF.Fight.BOUNDS[1]);
          O.x = U.clamp(O.x + push * s, KF.Fight.BOUNDS[0], KF.Fight.BOUNDS[1]);
        }
        if (this.timer <= 0 && this.phase === 'fight') { // time up: more health (as a share) wins
          this.timer = 0;
          const w = P.hp / P.maxHp >= O.hp / O.maxHp ? P : O;
          (w === P ? O : P).setState('ko');
          this.koWinner = w; this.timeUp = true; this.setPhase('ko'); A.sfx('ko');
        }
      } else if (this.phase === 'ko') {
        P.update(sdt, {}, O, this); O.update(sdt, {}, P, this);
        this.updateProjectiles(sdt);
        if (this.phaseT > 1.1 && this.koWinner.grounded && this.koWinner.state !== 'win') {
          this.koWinner.setState('win');
          this.wins[this.koWinner === P ? 0 : 1]++;
        }
        if (this.phaseT > 2.6) {
          if (this.wins[0] >= 2 || this.wins[1] >= 2) this.finish(this.wins[0] >= 2);
          else { this.round++; this.timeUp = false; this.startRound(); }
        }
      }
    }

    finish(won) {
      this.won = won;
      this.coins = 0;
      if (won) {
        if (this.mode === 'arena') {
          this.coins = KF.Economy.earn(10 + 3 * this.opts.streak);
          const a = KF.Save.data.arena; a.best = Math.max(a.best, this.opts.streak + 1); KF.Save.write();
        } else this.coins = KF.Save.completeNode(this.realm.id, this.opts.node);
        A.sfx('win');
        this.fx.confetti(this.player.x, this.player.y - 40);
      } else {
        A.sfx('lose');
        if (this.mode === 'arena') this.coins = KF.Economy.earn(2 + this.opts.streak);
      }
      this.setPhase('result');
    }

    options() {
      if (this.won) return this.mode === 'arena' ? ['NEXT CHALLENGER', 'LEAVE ARENA'] : ['CONTINUE'];
      return this.mode === 'arena' ? ['LEAVE ARENA'] : ['RETRY', 'BACK TO REALM'];
    }

    updateResult(input) {
      if (this.phaseT < 0.8) return;
      const opts = this.options();
      if (input.wasPressed('ArrowUp', 'KeyW')) { this.menuSel = (this.menuSel + opts.length - 1) % opts.length; A.sfx('select'); }
      if (input.wasPressed('ArrowDown', 'KeyS')) { this.menuSel = (this.menuSel + 1) % opts.length; A.sfx('select'); }
      if (!input.wasPressed('Enter', 'Space', 'KeyJ')) return;
      A.sfx('confirm');
      const choice = opts[this.menuSel], e = this.engine, r = this.realmIdx;
      if (choice === 'RETRY') e.go(() => new FightScene(e, this.opts));
      else if (choice === 'NEXT CHALLENGER') e.go(() => new FightScene(e, { mode: 'arena', realm: 0, streak: this.opts.streak + 1, def: KF.Roster.arenaDef(this.opts.streak + 1) }));
      else if (choice === 'LEAVE ARENA') e.go(() => new KF.MapScene(e));
      else if (choice === 'BACK TO REALM') e.go(() => new KF.RealmScene(e, r));
      else if (this.mode === 'boss') e.go(() => new KF.MapScene(e, { cleared: r }));
      else { const stage = (this.opts.node + 1) / 2; e.go(() => new KF.PlayScene(e, { door: r, stage })); }
    }

    updatePause(input) {
      const opts = ['RESUME', 'RESTART FIGHT', 'QUIT'];
      if (input.wasPressed('ArrowUp', 'KeyW')) { this.pauseSel = (this.pauseSel + 2) % 3; A.sfx('select'); }
      if (input.wasPressed('ArrowDown', 'KeyS')) { this.pauseSel = (this.pauseSel + 1) % 3; A.sfx('select'); }
      if (input.wasPressed('Enter', 'Space')) {
        A.sfx('confirm'); this.paused = false;
        const e = this.engine;
        if (this.pauseSel === 1) e.go(() => new FightScene(e, this.opts));
        if (this.pauseSel === 2) e.go(() => (this.mode === 'arena' ? new KF.MapScene(e) : new KF.RealmScene(e, this.realmIdx)));
      }
      void opts;
    }

    // ---------- drawing ----------
    render(ctx) {
      const t = this.engine.time, sh = this.fx.offset(), style = this.style;
      const mid = (this.player.x + this.opp.x) / 2;
      const cam = { x: (mid - VW / 2) * 0.4 + 200 + sh.x, y: sh.y };
      const res = style.res || KF.RES;
      if (!this.wc || this.wc.res !== res) this.wc = KF.makeHi(VW, VH, res, !!style.post);
      const w = this.wc.getContext('2d');
      w.setTransform(res, 0, 0, res, 0, 0); w.imageSmoothingEnabled = false;
      w.fillStyle = this.theme.bg; w.fillRect(0, 0, VW, VH);
      this.theme.background(w, { x: cam.x, y: 0 }, t, this.mood);
      for (let x = -16; x < VW + 16; x += 16) {
        const wx = x - (Math.round(cam.x * 1) % 16);
        this.theme.tile(w, wx, FLOOR + sh.y, 'solid', { t: true, d: 0 }, U.hash2(Math.floor((x + cam.x) / 16), 1));
        this.theme.tile(w, wx, FLOOR + 16 + sh.y, 'solid', { d: 1 }, U.hash2(Math.floor((x + cam.x) / 16), 2));
      }
      const scam = { x: -sh.x, y: -sh.y };
      // Draw the one being hit behind the attacker.
      const order = this.opp.state === 'attack' ? [this.player, this.opp] : [this.opp, this.player];
      if (this.phase !== 'intro') for (const f of order) f.draw(w, scam);
      for (const p of this.projectiles) this.drawProjectile(w, p, scam, t);
      this.fx.render(w, scam);
      if (this.fx.flash > 0) { w.globalAlpha = this.fx.flash * 0.5; w.fillStyle = '#fff'; w.fillRect(0, 0, VW, VH); w.globalAlpha = 1; }
      const info = KF.Styles.info(t, this.engine.frame || 0, res, this.player.x, this.player.y - 30, this.player.x, true);
      KF.Styles.post(style, this.wc, info);
      if (style.compose) style.compose(ctx, this.wc, info); else KF.blit(ctx, this.wc, 0, 0);
      if (style.under) style.under(ctx, info);
      if (this.engine.debug) this.drawDebug(ctx, scam);
      this.drawHUD(ctx, t);
      this.drawOverlay(ctx, t);
      if (style.overlay) style.overlay(ctx, info);
    }

    drawProjectile(ctx, p, cam, t) {
      const x = Math.round(p.x - cam.x), y = Math.round(p.y - cam.y), dir = Math.sign(p.vx);
      if (p.kind === 'wave') {
        for (let i = 1; i <= 4; i++) { ctx.globalAlpha = 0.25 / i; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(x - dir * i * 6, y, 8 - i, 0, 7); ctx.fill(); }
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#1a1020'; ctx.beginPath(); ctx.arc(x, y, 8, 0, 7); ctx.fill();
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x + dir, y - 1, 3 + Math.sin(t * 30), 0, 7); ctx.fill();
      } else {
        for (let i = 0; i < 5; i++) {
          const h = 4 + ((i * 7 + Math.floor(t * 30)) % 9);
          ctx.fillStyle = i % 2 ? p.color : '#ffffff';
          ctx.fillRect(x - 10 + i * 4, FLOOR - h - cam.y, 3, h);
        }
      }
    }

    drawDebug(ctx, cam) {
      ctx.lineWidth = 1;
      for (const f of [this.player, this.opp]) {
        const h = f.hurtbox(); ctx.strokeStyle = '#00ff66'; ctx.strokeRect(h.x - cam.x + 0.5, h.y - cam.y + 0.5, h.w, h.h);
        const a = f.hitbox(); if (a) { ctx.strokeStyle = '#ff3040'; ctx.strokeRect(a.x - cam.x + 0.5, a.y - cam.y + 0.5, a.w, a.h); }
      }
      F.draw(ctx, `AI LEVEL ${(this.oppDef.d * 100).toFixed(0)}`, 4, VH - 10, '#7fff9f');
    }

    drawHUD(ctx, t) {
      const R = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
      const bar = (f, x, right) => {
        const W = 150, H = 9, y = 8;
        R('#0a0610', x - 2, y - 2, W + 4, H + 4); R('#d8c8a0', x - 1, y - 1, W + 2, H + 2); R('#3a0a14', x, y, W, H);
        f.lag = f.lag === undefined ? f.hp : f.lag > f.hp ? Math.max(f.hp, f.lag - 0.5) : f.hp;
        const lw = Math.round(W * f.lag / f.maxHp), hw = Math.round(W * f.hp / f.maxHp);
        const lowHp = f.hp / f.maxHp < 0.25 && Math.floor(t * 6) % 2;
        R('#e02020', right ? x + W - lw : x, y, lw, H);
        R(lowHp ? '#ff8040' : '#ffd030', right ? x + W - hw : x, y, hw, H);
        R('#fff6a0', right ? x + W - hw : x, y, hw, 2);
        F.draw(ctx, f.name, right ? x + W : x, y + H + 4, '#ffffff', 1, right ? 'right' : 'left', '#000');
        // round wins
        const wins = this.wins[f === this.player ? 0 : 1];
        for (let i = 0; i < 2; i++) {
          const px = right ? x + W - 10 - i * 10 : x + i * 10, py = y + H + 14;
          R('#0a0610', px, py, 8, 8); R(i < wins ? '#ffd040' : '#3a2a48', px + 1, py + 1, 6, 6);
        }
        // special meter
        const my = VH - 12, mw = 90;
        const mx = right ? VW - 10 - mw : 10;
        R('#0a0610', mx - 1, my - 1, mw + 2, 7); R('#1a1430', mx, my, mw, 5);
        const full = f.meter >= 50;
        R(full && Math.floor(t * 8) % 2 ? '#ffffff' : f.color, right ? mx + mw - Math.round(mw * f.meter / 100) : mx, my, Math.round(mw * f.meter / 100), 5);
        R('#0a0610', mx + mw / 2, my, 1, 5);
        F.draw(ctx, full ? 'SPECIAL READY' : 'SPECIAL', right ? mx + mw : mx, my - 9, full ? '#ffffff' : '#8a80a0', 1, right ? 'right' : 'left', '#000');
        if (f.combo >= 2) {
          KF.BigText.draw(ctx, `${f.combo} HITS`, right ? VW - 60 : 60, 64, 2, 'fire');
        }
      };
      bar(this.player, 10, false);
      bar(this.opp, VW - 160, true);
      R('#0a0610', VW / 2 - 15, 2, 30, 22); R('#2a1630', VW / 2 - 14, 3, 28, 20);
      BT.draw(ctx, String(Math.ceil(Math.max(0, this.timer ?? ROUND_TIME))).padStart(2, '0'), VW / 2, 12, 2, 'steel');
      const label = this.mode === 'boss' ? 'BOSS' : this.mode === 'arena' ? `ARENA WIN ${this.opts.streak}` : 'STREET FIGHT';
      F.draw(ctx, label, VW / 2, 27, this.mode === 'boss' ? '#ff6050' : '#ff9ad0', 1, 'center', '#000');
      if (this.round === 1 && this.phase !== 'result' && (this.timer ?? ROUND_TIME) > ROUND_TIME - 10) F.draw(ctx, 'J PUNCH (X3 COMBO)  K KICK  L SPECIAL  S BLOCK', VW / 2, 40, '#c8c0d8', 1, 'center', '#000');
    }

    drawOverlay(ctx, t) {
      const pt = this.phaseT;
      const slam = (x, from = 3.5, dur = 0.12) => (x < dur ? from - (from - 1) * (x / dur) : 1);
      if (this.phase === 'intro') { // VS card
        ctx.fillStyle = 'rgba(8,4,16,0.75)'; ctx.fillRect(0, 50, VW, 110);
        const k = Math.min(1, pt * 3);
        const drawBig = (f, x, flip) => {
          const set = f.sprites, fr = set.frames.idle[Math.floor(pt * 4) % 4];
          ctx.save(); ctx.translate(x, 150); ctx.scale(flip ? -1.4 : 1.4, 1.4); KF.Sprites.blit(ctx, fr, set); ctx.restore();
        };
        drawBig(this.player, 30 + 60 * k, false);
        drawBig(this.opp, VW - 30 - 60 * k, true);
        BT.draw(ctx, 'VS', VW / 2, 92, 5, 'fire', slam(pt, 3, 0.15));
        F.draw(ctx, 'BAO', 90, 140, '#7cf0ff', 1, 'center', '#000');
        F.draw(ctx, this.opp.name, VW - 90, 140, this.opp.color, 1, 'center', '#000');
        const sub = this.mode === 'boss' ? `${this.realm.name} BOSS` : this.mode === 'arena' ? 'STREET ARENA' : 'A CHALLENGER APPEARS!';
        if (pt > 0.3) F.draw(ctx, sub, VW / 2, 124, this.mode === 'boss' ? '#ff6050' : '#ffd040', 1, 'center', '#000');
      }
      if (this.phase === 'round') {
        if (pt < 0.9) BT.draw(ctx, this.wins[0] === 1 && this.wins[1] === 1 ? 'FINAL ROUND' : `ROUND ${this.round}`, VW / 2, 92, 4, 'steel', slam(pt));
        else BT.draw(ctx, 'FIGHT!', VW / 2, 96, 6, 'fire', slam(pt - 0.9, 3, 0.08));
      }
      if (this.phase === 'ko') {
        const P = this.player, O = this.opp;
        const perfect = this.koWinner.hp >= this.koWinner.maxHp - 0.01;
        BT.draw(ctx, this.timeUp ? 'TIME' : 'K.O.', VW / 2, 92, 7, 'blood', slam(pt, 4, 0.1));
        if (pt > 1.2) {
          const w = this.koWinner === P ? 'BAO WINS' : `${O.name} WINS`;
          F.draw(ctx, w, VW / 2, 124, '#ffffff', 2, 'center', '#000');
          if (perfect) BT.draw(ctx, 'PERFECT', VW / 2, 150, 3, 'gold');
        }
      }
      if (this.phase === 'result') {
        ctx.fillStyle = 'rgba(8,4,16,0.72)'; ctx.fillRect(0, 54, VW, 108);
        BT.draw(ctx, this.won ? 'YOU WIN' : 'YOU LOSE', VW / 2, 80, 5, this.won ? 'gold' : 'blood', slam(pt, 3, 0.12));
        if (this.coins) {
          KF.HUD.coin(ctx, VW / 2 - 30, 104, t);
          F.draw(ctx, `+${this.coins} COINS`, VW / 2 - 18, 105, '#ffd040', 1, 'left', '#000');
        }
        if (!this.won && this.mode !== 'arena') F.draw(ctx, 'TIP: UPGRADE IN THE DOJO SHOP, OR BLOCK MORE (S)', VW / 2, 117, '#b8b0c8', 1, 'center', '#000');
        if (this.mode === 'arena') F.draw(ctx, `BEST STREAK ${KF.Save.data.arena.best}`, VW / 2, 117, '#9ad8ff', 1, 'center', '#000');
        if (pt > 0.8) this.options().forEach((o, i) => {
          const sel = i === this.menuSel;
          F.draw(ctx, (sel ? '> ' : '  ') + o, VW / 2, 130 + i * 11, sel ? '#ffd040' : '#b8b0c8', 1, 'center', '#000');
        });
      }
      if (this.paused) {
        ctx.fillStyle = 'rgba(8,4,16,0.7)'; ctx.fillRect(0, 0, VW, VH);
        BT.draw(ctx, 'PAUSED', VW / 2, 70, 4, 'steel');
        ['RESUME', 'RESTART FIGHT', 'QUIT'].forEach((o, i) => {
          const sel = i === this.pauseSel;
          F.draw(ctx, (sel ? '> ' : '  ') + o, VW / 2, 104 + i * 14, sel ? '#ffd040' : '#b8b0c8', 1, 'center', '#000');
        });
        F.draw(ctx, 'MOVE A/D  JUMP W  BLOCK S  PUNCH J  KICK K  SPECIAL L', VW / 2, 170, '#9a90b0', 1, 'center');
        F.draw(ctx, 'PUNCH 3X FAST FOR A COMBO. HITS FILL YOUR SPECIAL METER.', VW / 2, 182, '#7a7094', 1, 'center');
      }
    }
  }
  KF.FightScene = FightScene;
})(window.KF);
