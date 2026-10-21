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

  // SUPERHOT look for an opponent whose sprite isn't already crystal: every pixel becomes red
  // glass, shaded in triangular facets so it reads as a cut gem rather than a red silhouette.
  function crystalize(set) {
    const frames = {};
    for (const name in set.frames) frames[name] = set.frames[name].map((fr) => {
      const src = fr.img, c = KF.makeCanvas(src.width, src.height), x = c.getContext('2d');
      x.drawImage(src, 0, 0);
      const img = x.getImageData(0, 0, c.width, c.height), d = img.data, W = c.width, cell = Math.max(4, Math.round(W / 14));
      for (let y = 0, o = 0; y < c.height; y++) for (let xx = 0; xx < W; xx++, o += 4) {
        if (!d[o + 3]) continue;
        const l = (d[o] * 77 + d[o + 1] * 150 + d[o + 2] * 29) >> 8;
        const cx = Math.floor(xx / cell), cy = Math.floor(y / cell), upper = (xx % cell) + (y % cell) < cell ? 0 : 1;
        const facet = U.hash2(cx * 2 + upper, cy) * 0.55 - 0.2, v = U.clamp(l / 255 * 0.7 + facet, 0, 1);
        if (l < 40) { d[o] = 90; d[o + 1] = 6; d[o + 2] = 8; continue; } // outline stays dark red
        d[o] = 170 + v * 85; d[o + 1] = 14 + v * v * 120; d[o + 2] = 10 + v * v * 90;
      }
      x.putImageData(img, 0, 0);
      return Object.assign({}, fr, { img: c });
    });
    return Object.assign({}, set, { frames, crystal: true }); // crystal: vector looks draw red glass too
  }

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
      this.hiRes = !!this.style.smooth; engine.fit(this);
      this.theme = KF.Themes.get(opts.env || this.style.theme || (this.mode === 'arena' ? 'neon' : this.realm.theme)); // the place you just played
      KF.Audio.setLowpass(this.style.audio && this.style.audio.lowpass);
      this.oppDef = opts.def;
      this.versus = this.mode === 'versus'; // two players on one keyboard (js/scenes/modes.js)
      this.run = opts.run || null;            // a realm speedrun in progress
      const ps = KF.Economy.playerStats();
      this.player = new KF.Fight.Fighter(this.versus ? opts.p1 : { name: 'BAO', look: KF.Economy.look(), stats: ps, color: '#7cf0ff' }, 110, 1);
      this.opp = new KF.Fight.Fighter(this.oppDef, VW - 110, -1);
      this.oppBase = Object.assign({}, this.opp.stats); // bosses get angrier at half health (phase 2)
      this.ai = new KF.Fight.AI(this.oppDef.d);
      // SUPERHOT: time moves only while you do (see js/rules.js).
      const rule = KF.Rules && KF.Rules.all[this.style.id];
      this.superhot = !!(rule && rule.superhot);
      this.gun = { ammo: 6, cool: 0, reload: 0 }; this.oppGunT = 2.5; this.shotKick = 0;
      if (this.superhot) this.cursor = 'crosshair';
      this.timeK = 1; this.shards = []; this.shattered = false;
      if (this.superhot && !(this.oppDef.look && this.oppDef.look.material === 'crystal')) this.opp.sprites = crystalize(this.opp.sprites);
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
      this.shards = []; this.shattered = false; this.timeK = 1;
      this.timer = ROUND_TIME;
      this.ai = new KF.Fight.AI(this.oppDef.d);
      this.opp.stats = Object.assign({}, this.oppBase); this.phase2 = false; this.phase2T = 0;
      this.setPhase('round');
    }

    playerInput() {
      const i = this.engine.input;
      if (this.versus) return { // player 1 keeps WASD + J K L (and the mouse)
        left: i.isDown('KeyA'), right: i.isDown('KeyD'), block: i.isDown('KeyS'), jump: i.wasPressed('KeyW', 'Space'),
        punch: i.wasPressed('KeyJ') || (i.clicked && !this.clickUsed), kick: i.wasPressed('KeyK') || i.rclicked, special: i.wasPressed('KeyL'),
      };
      return {
        left: i.isDown('ArrowLeft', 'KeyA'), right: i.isDown('ArrowRight', 'KeyD'),
        block: i.isDown('ArrowDown', 'KeyS'),
        jump: i.wasPressed('ArrowUp', 'KeyW', 'Space'),
        // Mouse: left click punches, right click kicks (in a SUPERHOT fight left click shoots instead).
        punch: i.wasPressed('KeyJ', 'KeyZ') || (i.clicked && !this.superhot && !this.clickUsed),
        kick: i.wasPressed('KeyK', 'KeyX') || i.rclicked, special: i.wasPressed('KeyL', 'KeyC'),
        shoot: this.superhot && ((i.clicked && !this.clickUsed) || i.wasPressed('KeyF', 'KeyV')),
      };
    }

    // Player 2 in versus: the arrow keys with Z X C.
    player2Input() {
      const i = this.engine.input;
      return {
        left: i.isDown('ArrowLeft'), right: i.isDown('ArrowRight'), block: i.isDown('ArrowDown'), jump: i.wasPressed('ArrowUp'),
        punch: i.wasPressed('KeyZ'), kick: i.wasPressed('KeyX'), special: i.wasPressed('KeyC'),
      };
    }

    // A boss at half health in a round gets serious: faster, harder, a full special meter.
    checkPhase2() {
      const O = this.opp;
      if (this.mode !== 'boss' || this.phase2 || O.hp > O.maxHp * 0.5 || O.hp <= 0) return;
      this.phase2 = true; this.phase2T = 0;
      O.stats.speed = this.oppBase.speed * 1.18; O.stats.power = this.oppBase.power * 1.2;
      O.meter = 100;
      this.ai = new KF.Fight.AI(Math.min(1, this.oppDef.d + 0.22));
      this.hitstop = 0.45; this.fx.flash = 1; this.fx.shake(8, 0.5);
      A.sfx('rumble');
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
      A.sfx('hit'); KF.Present.sfx(this.style.id, 'death'); // the world's own K.O. stinger
      if (this.superhot && loser === this.opp) this.shatter(loser);
      this.koWinner = winner;
      this.setPhase('ko');
      this.mood.cheer = 1.5;
    }

    // The crystal opponent breaks into red triangles that drift in slow motion.
    shatter(f) {
      this.shattered = true;
      const rnd = U.rng(Math.floor(this.engine.time * 1000) + 7);
      for (let i = 0; i < 46; i++) {
        const x = f.x + (rnd() - 0.5) * 26, y = f.y - 6 - rnd() * 60;
        const ang = Math.atan2(y - (f.y - 34), x - f.x) + (rnd() - 0.5) * 0.8, sp = 60 + rnd() * 200;
        const sz = 2 + rnd() * 6, pts = [0, 1, 2].map((k) => { const a = rnd() * 6.28; return [Math.cos(a) * sz, Math.sin(a) * sz]; });
        this.shards.push({ x, y, vx: Math.cos(ang) * sp + f.facing * -40, vy: Math.sin(ang) * sp - 120, rot: rnd() * 6, vr: (rnd() - 0.5) * 10, pts,
          col: ['#ff2a1a', '#d01008', '#ff6a50', '#a00806', '#ffb0a0'][Math.floor(rnd() * 5)] });
      }
      this.fx.shake(10, 0.6);
    }
    updateShards(dt) {
      for (const p of this.shards) {
        p.vy += 520 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        if (p.y > FLOOR) { p.y = FLOOR; p.vy *= -0.3; p.vx *= 0.6; p.vr *= 0.5; }
      }
    }
    // How hard the player is acting right now (1 = moving/attacking, 0 = hands off).
    activity(inp) {
      const P = this.player;
      return inp.left || inp.right || inp.block || inp.jump || inp.punch || inp.kick || inp.special || this.shotKick > 0 || P.state === 'attack' || !P.grounded ? 1 : 0;
    }

    // SUPERHOT guns. You shoot at the mouse (or straight ahead with F / V); six rounds, then the
    // gun reloads, but only while time moves. Firing nudges time forward, as in SUPERHOT.
    // THE SYSTEM fires back now and then: slow bullets you can see coming, dodge or block.
    updateGuns(dt, fdt, inp) {
      const P = this.player, O = this.opp, g = this.gun;
      this.shotKick = Math.max(0, this.shotKick - dt);
      if (g.ammo <= 0 && (g.reload -= fdt) <= 0) { g.ammo = 6; A.sfx('select'); }
      g.cool -= fdt;
      if (inp.shoot && g.ammo > 0 && g.cool <= 0 && P.state !== 'hit' && P.state !== 'down') {
        const hx = P.x + P.facing * 16, hy = P.y - 36, m = this.engine.input.mouse;
        let ax = P.facing, ay = 0;
        if (m.seen && this.engine.input.clicked) { const dx = m.x - hx, dy = m.y - hy, d = Math.hypot(dx, dy) || 1; ax = dx / d; ay = dy / d; }
        if (Math.sign(ax) !== 0) P.facing = Math.sign(ax);
        this.projectiles.push({ kind: 'bullet', owner: P, x: hx, y: hy, vx: ax * 420, vy: ay * 420, w: 5, h: 5, dmg: 9, life: 2, t: 0 });
        g.ammo--; g.cool = 0.18; this.shotKick = 0.22;
        if (g.ammo <= 0) g.reload = 1.2;
        A.sfx('punch', { speed: 3 }); this.fx.shake(2, 0.08);
      }
      if ((this.oppGunT -= fdt) <= 0 && O.state !== 'hit' && O.state !== 'down' && Math.abs(O.x - P.x) > 50) {
        const hx = O.x + O.facing * 16, hy = O.y - 36, dx = P.x - hx, dy = P.y - 30 - hy, d = Math.hypot(dx, dy) || 1;
        this.projectiles.push({ kind: 'bullet', owner: O, x: hx, y: hy, vx: dx / d * 190, vy: dy / d * 190, w: 5, h: 5, dmg: 7, life: 3, t: 0 });
        this.oppGunT = 1.8 + Math.random() * 1.6;
      }
    }

    updateProjectiles(dt) {
      for (const p of this.projectiles) {
        p.t += dt; p.x += p.vx * dt; p.y += (p.vy || 0) * dt; p.life -= dt;
        const target = p.owner === this.player ? this.opp : this.player;
        const box = { x: p.x - p.w / 2, y: p.y - p.h / 2, w: p.w, h: p.h };
        if (p.life > 0 && U.overlap(box, target.hurtbox())) {
          const res = target.receive({ dmg: p.dmg, push: 140, stun: 0.45, down: p.kind === 'quake' }, p.owner, this);
          if (res !== 'miss') { p.life = 0; this.impact(res, p.owner, target, p.x, p.y, true); }
        }
        if (p.x < -20 || p.x > VW + 20 || p.y < -20 || p.y > FLOOR + 4) p.life = 0;
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
      const click = KF.UI.clicked(this);
      this.clickUsed = !!click; // a click on a button is not also a punch / shot
      if ((input.pause || click === 'pause') && ['fight', 'round'].includes(this.phase)) { this.paused = !this.paused; this.pauseSel = 0; A.sfx('pause'); }
      if (this.paused) return this.updatePause(input);
      if (this.run && this.phase !== 'result') this.run.t += dt;
      if (this.phase2) this.phase2T += dt;
      this.fx.update(dt);
      this.mood.cheer = Math.max(0.15, this.mood.cheer - dt * 0.5);
      this.phaseT += dt;
      const P = this.player, O = this.opp;

      if (this.phase === 'intro') {
        if (this.cue('vs', 0.05)) A.sfx('round');
        if (this.phaseT > 1.8 || (this.phaseT > 0.6 && (input.jumpPressed || input.wasPressed('Enter', 'KeyJ') || (input.clicked && !click)))) this.startRound();
        return;
      }
      if (this.phase === 'round') {
        if (this.cue('r', 0.02)) { A.sfx('round'); this.fx.shake(3, 0.2); }
        if (this.cue('go', 0.9)) { KF.Present.sfx(this.style.id, 'go'); this.fx.shake(5, 0.25); }
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
        const inp = this.playerInput();
        let fdt = sdt;
        if (this.superhot) { // time crawls when you're still; eases up fast, settles slower
          const target = this.activity(inp) ? 1 : 0.05;
          this.timeK += (target - this.timeK) * Math.min(1, dt * (target > this.timeK ? 16 : 6));
          fdt = sdt * this.timeK;
        }
        this.timer -= this.superhot ? dt * this.timeK : dt;
        if (this.superhot) this.updateGuns(dt, fdt, inp);
        P.update(fdt, inp, O, this);
        O.update(fdt, this.versus ? this.player2Input() : this.ai.update(fdt, O, P, this), P, this);
        this.resolveHits(P, O); this.resolveHits(O, P);
        this.checkPhase2();
        this.updateProjectiles(fdt);
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
          this.koWinner = w; this.timeUp = true; this.setPhase('ko'); KF.Present.sfx(this.style.id, 'death');
        }
      } else if (this.phase === 'ko') {
        if (this.superhot) this.timeK = Math.min(1, this.timeK + dt * 2);
        this.updateShards(dt * 0.35);
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
      if (this.versus) { KF.Ach.event('versus'); A.sfx('win'); this.fx.confetti((won ? this.player : this.opp).x, 100); this.setPhase('result'); return; }
      if (won && this.run) this.run.splits.push({ node: this.opts.node, t: this.run.t });
      if (won && this.mode === 'boss') KF.Ach.event('bossWin', { roundsLost: this.wins[1], realm: this.realmIdx });
      if (won && this.mode === 'arena') KF.Ach.event('arena', { streak: this.opts.streak + 1 });
      if (won) {
        if (this.mode === 'arena') {
          this.coins = KF.Economy.earn(10 + 3 * this.opts.streak);
          const a = KF.Save.data.arena; a.best = Math.max(a.best, this.opts.streak + 1); KF.Save.write();
        } else this.coins = KF.Save.completeNode(this.realm.id, this.opts.node);
        if (KF.Present.has(this.style.id, 'win')) KF.Present.sfx(this.style.id, 'win'); else A.sfx('win');
        this.fx.confetti(this.player.x, this.player.y - 40);
      } else {
        KF.Present.sfx(this.style.id, 'lose');
        if (this.mode === 'arena') this.coins = KF.Economy.earn(2 + this.opts.streak);
      }
      this.setPhase('result');
    }

    options() {
      if (this.versus) return ['REMATCH', 'NEW FIGHTERS', 'LEAVE'];
      if (this.run && !this.won) return ['RETRY', 'QUIT RUN'];
      if (this.won) return this.mode === 'arena' ? ['NEXT CHALLENGER', 'LEAVE ARENA'] : ['CONTINUE'];
      return this.mode === 'arena' ? ['LEAVE ARENA'] : ['RETRY', 'BACK TO REALM'];
    }

    updateResult(input) {
      if (this.phaseT < 0.8) return;
      const opts = this.options(), pick = KF.UI.menuInput(this, input, opts.length, 'menuSel');
      if (pick < 0) return;
      A.sfx('confirm');
      const choice = opts[pick], e = this.engine, r = this.realmIdx;
      if (choice === 'RETRY') e.go(() => new FightScene(e, this.opts));
      else if (choice === 'REMATCH') e.go(() => new FightScene(e, this.opts));
      else if (choice === 'NEW FIGHTERS') e.go(() => new KF.VersusSelectScene(e));
      else if (choice === 'LEAVE') e.go(() => new KF.ModesScene(e));
      else if (choice === 'QUIT RUN') e.go(() => new KF.RealmScene(e, r));
      else if (this.run && this.mode === 'boss') { const run = this.run; e.go(() => new KF.RunResultScene(e, run)); }
      else if (choice === 'NEXT CHALLENGER') e.go(() => new FightScene(e, { mode: 'arena', realm: 0, streak: this.opts.streak + 1, def: KF.Roster.arenaDef(this.opts.streak + 1) }));
      else if (choice === 'LEAVE ARENA') e.go(() => new KF.MapScene(e));
      else if (choice === 'BACK TO REALM') e.go(() => new KF.RealmScene(e, r));
      else if (this.mode === 'boss') e.go(() => new KF.MapScene(e, { cleared: r }));
      else e.go(() => new KF.PlayScene(e, { door: r, stage: KF.Path.stageOfNode(this.opts.node + 1), run: this.run }));
    }

    updatePause(input) {
      const pick = KF.UI.menuInput(this, input, 3, 'pauseSel');
      if (pick < 0) return;
      A.sfx('confirm'); this.paused = false;
      const e = this.engine;
      if (pick === 1) e.go(() => new FightScene(e, this.opts));
      if (pick === 2) e.go(() => (this.versus ? new KF.ModesScene(e) : this.mode === 'arena' ? new KF.MapScene(e) : new KF.RealmScene(e, this.realmIdx)));
    }

    // ---------- drawing ----------
    render(ctx) {
      const t = this.engine.time, sh = this.fx.offset(), style = this.style;
      const mid = (this.player.x + this.opp.x) / 2;
      const cam = { x: (mid - VW / 2) * 0.4 + 200 + sh.x, y: sh.y };
      const res = style.smooth ? this.engine.scale : style.res || KF.RES;
      if (!this.wc || this.wc.res !== res) this.wc = KF.makeHi(VW, VH, res, !!style.post);
      const w = this.wc.getContext('2d');
      w.setTransform(res, 0, 0, res, 0, 0); w.imageSmoothingEnabled = !!style.smooth;
      if (style.clearBg) w.clearRect(0, 0, VW, VH); // AR: the camera feed shows through
      else { w.fillStyle = this.theme.bg; w.fillRect(0, 0, VW, VH); }
      if (!style.clearBg || this.theme.id === 'env_' + style.id) this.theme.background(w, { x: cam.x, y: 0 }, t, this.mood);
      for (let x = -16; x < VW + 16; x += 16) {
        const wx = x - (Math.round(cam.x * 1) % 16);
        this.theme.tile(w, wx, FLOOR + sh.y, 'solid', { t: true, d: 0 }, U.hash2(Math.floor((x + cam.x) / 16), 1));
        this.theme.tile(w, wx, FLOOR + 16 + sh.y, 'solid', { d: 1 }, U.hash2(Math.floor((x + cam.x) / 16), 2));
      }
      const scam = { x: -sh.x, y: -sh.y };
      if (this.phase2 && !this.shattered) { // phase 2: a pulsing red aura under the boss
        const O = this.opp, r = 26 + Math.sin(t * 12) * 3;
        w.globalAlpha = 0.35 + 0.15 * Math.sin(t * 12); w.fillStyle = '#ff2a1a';
        w.beginPath(); w.ellipse(O.x - scam.x, FLOOR - 2 - scam.y, r, 6, 0, 0, Math.PI * 2); w.fill(); w.globalAlpha = 1;
      }
      // Draw the one being hit behind the attacker.
      const order = this.opp.state === 'attack' ? [this.player, this.opp] : [this.opp, this.player];
      if (this.phase !== 'intro') for (const f of order) if (!(f === this.opp && this.shattered)) f.draw(w, scam);
      for (const p of this.shards) {
        w.save(); w.translate(Math.round(p.x - scam.x), Math.round(p.y - scam.y)); w.rotate(p.rot);
        w.fillStyle = p.col; w.beginPath(); w.moveTo(p.pts[0][0], p.pts[0][1]); w.lineTo(p.pts[1][0], p.pts[1][1]); w.lineTo(p.pts[2][0], p.pts[2][1]); w.closePath(); w.fill();
        w.restore();
      }
      for (const p of this.projectiles) this.drawProjectile(w, p, scam, t);
      if (this.superhot && this.phase !== 'intro') for (const f of [this.player, this.opp]) { // obsidian pistols
        if (f === this.opp && this.shattered) continue;
        const gx = Math.round(f.x + f.facing * 13 - scam.x), gy = Math.round(f.y - 40 - scam.y), d = f.facing;
        w.fillStyle = '#121216'; w.fillRect(d > 0 ? gx : gx - 9, gy, 9, 3); w.fillRect(d > 0 ? gx : gx - 3, gy + 3, 3, 4);
        w.fillStyle = '#4a4a58'; w.fillRect(d > 0 ? gx + 1 : gx - 8, gy, 6, 1);
      }
      this.fx.render(w, scam);
      if (this.fx.flash > 0) { w.globalAlpha = this.fx.flash * 0.5; w.fillStyle = '#fff'; w.fillRect(0, 0, VW, VH); w.globalAlpha = 1; }
      const cardsOnTop = !!style.compose || KF.Present.onTop(style.id);
      if (!cardsOnTop) this.drawCards(w, t); // into the world, so the style's palette applies
      const info = KF.Styles.info(t, this.engine.frame || 0, res, this.player.x, this.player.y - 30, this.player.x, true);
      info.themeId = this.theme.id;
      KF.Styles.post(style, this.wc, info);
      const glitch = this.superhot && ((this.phase === 'round' && this.phaseT < 0.35) || (this.phase === 'intro' && this.phaseT > 1.5));
      if (style.compose) style.compose(ctx, this.wc, info);
      else if (glitch) { // SUPERHOT-style glitch cut: the picture tears into shifted slices
        const res2 = this.wc.width / VW, seed = Math.floor(this.engine.time * 30);
        for (let y = 0; y < VH; y += 12) {
          const off = (U.hash2(seed, y) - 0.5) * 40, h = Math.min(12, VH - y);
          ctx.drawImage(this.wc, 0, y * res2, this.wc.width, h * res2, off, y, VW, h);
        }
      } else KF.blit(ctx, this.wc, 0, 0);
      if (style.under) style.under(ctx, info);
      if (this.engine.debug) this.drawDebug(ctx, scam);
      this.drawHUD(ctx, t);
      if (cardsOnTop) this.drawCards(ctx, t);
      this.drawOverlay(ctx, t);
      if (style.overlay) style.overlay(ctx, info);
    }

    drawProjectile(ctx, p, cam, t) {
      const x = Math.round(p.x - cam.x), y = Math.round(p.y - cam.y), dir = Math.sign(p.vx);
      if (p.kind === 'bullet') { // SUPERHOT bullet: a black slug with a long trail behind it
        const sp = Math.hypot(p.vx, p.vy) || 1, ux = p.vx / sp, uy = p.vy / sp, mine = p.owner === this.player;
        ctx.strokeStyle = mine ? 'rgba(40,40,48,0.35)' : 'rgba(230,20,10,0.55)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - ux * Math.min(60, p.t * sp), y - uy * Math.min(60, p.t * sp)); ctx.stroke();
        ctx.fillStyle = '#121216'; ctx.beginPath(); ctx.arc(x, y, 2, 0, 7); ctx.fill();
        return;
      }
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
      if (!this.paused) KF.UI.pauseButton(ctx, this, VW / 2 + 19, 4);
      if (this.superhot) { // rounds left, under your special meter
        const g = this.gun;
        for (let i = 0; i < 6; i++) R(i < g.ammo ? '#1a1a1e' : 'rgba(26,26,30,0.25)', 10 + i * 6, VH - 34, 4, 7);
        if (g.ammo <= 0) F.draw(ctx, 'RELOADING... MOVE!', 48, VH - 34, '#d01008', 1, 'left');
      }
      const label = this.versus ? 'VERSUS' : this.run ? `RUN ${KF.fmtTime(this.run.t)}` : this.mode === 'boss' ? (this.phase2 ? 'BOSS  PHASE 2' : 'BOSS') : this.mode === 'arena' ? `ARENA WIN ${this.opts.streak}` : 'STREET FIGHT';
      F.draw(ctx, label, VW / 2, 27, this.mode === 'boss' ? '#ff6050' : '#ff9ad0', 1, 'center', '#000');
      if (this.round === 1 && this.phase !== 'result' && (this.timer ?? ROUND_TIME) > ROUND_TIME - 10) { const k = this.engine.input.keys(); F.draw(ctx, this.superhot ? 'CLICK TO SHOOT   TIME MOVES WHEN YOU MOVE' : `${k.punch} PUNCH (X3)  ${k.kick} KICK  ${k.special} SPECIAL  ${k.block} BLOCK`, VW / 2, 40, '#c8c0d8', 1, 'center', '#000'); }
    }

    // The world's own FIGHT!, K.O. and result cards (js/present.js).
    drawCards(ctx, t) {
      const id = this.style.id, pt = this.phaseT;
      if (this.phase === 'round' && pt >= 0.9) KF.Present.intro(ctx, id, pt - 0.9, { fight: true });
      if (this.phase === 'ko' && !this.shattered) KF.Present.ko(ctx, id, pt, { fight: true, text: this.timeUp ? 'TIME' : null, deaths: this.round - 1 });
      if (this.phase === 'result') KF.Present.win(ctx, id, pt, { fight: true, lose: !this.won, perfect: this.won && this.player.hp >= this.player.maxHp - 0.01 });
    }

    drawOverlay(ctx, t) {
      const pt = this.phaseT;
      const slam = (x, from = 3.5, dur = 0.12) => (x < dur ? from - (from - 1) * (x / dur) : 1);
      if (this.phase === 'intro') { // VS card
        ctx.fillStyle = 'rgba(8,4,16,0.75)'; ctx.fillRect(0, 50, VW, 118);
        const k = Math.min(1, pt * 3);
        const drawBig = (f, x, flip) => {
          // Built at 2.5 rather than scaling the 1.8 fight set, so every pixel stays the same size.
          const vl = KF.Vec.active();
          if (vl) { // smooth style: a big vector portrait
            ctx.save(); ctx.translate(x, 150); ctx.scale(flip ? -1 : 1, 1);
            KF.Vec.draw(ctx, KF.Sprites.POSES.idle[Math.floor(pt * 4) % 4], f.sprites.look, { vlook: vl, scale: 2.5, crystal: f.sprites.crystal, t: pt });
            ctx.restore();
            return;
          }
          const set = f.vsSet || (f.vsSet = f.sprites.look && !this.superhot ? KF.Sprites.buildSet(f.sprites.look, 2.5, ['idle']) : f.sprites);
          const fr = set.frames.idle[Math.floor(pt * 4) % 4], k2 = set === f.sprites ? 1.4 : 1;
          ctx.save(); ctx.translate(x, 150); ctx.scale(flip ? -k2 : k2, k2); KF.Sprites.blit(ctx, fr, set); ctx.restore();
        };
        drawBig(this.player, 30 + 60 * k, false);
        drawBig(this.opp, VW - 30 - 60 * k, true);
        BT.draw(ctx, 'VS', VW / 2, 92, 5, 'fire', slam(pt, 3, 0.15));
        F.draw(ctx, this.player.name, 90, 156, this.player.color, 1, 'center', '#000');
        F.draw(ctx, this.opp.name, VW - 90, 156, this.opp.color, 1, 'center', '#000');
        const sub = this.versus ? 'PLAYER 1 VS PLAYER 2' : this.mode === 'boss' ? `${this.realm.name} BOSS` : this.mode === 'arena' ? 'STREET ARENA' : 'A CHALLENGER APPEARS!';
        if (pt > 0.3) F.draw(ctx, sub, VW / 2, 124, this.mode === 'boss' ? '#ff6050' : '#ffd040', 1, 'center', '#000');
      }
      if (this.phase === 'round') {
        if (pt < 0.9) BT.draw(ctx, this.wins[0] === 1 && this.wins[1] === 1 ? 'FINAL ROUND' : `ROUND ${this.round}`, VW / 2, 92, 4, 'steel', slam(pt));
      }
      if (this.phase === 'ko') {
        const P = this.player, O = this.opp;
        const perfect = this.koWinner.hp >= this.koWinner.maxHp - 0.01;
        if (this.shattered) { // SUPER. HOT. SUPER. HOT.
          if (pt > 0.45) {
            const k = Math.floor((pt - 0.45) / 0.42);
            if (k < 5) BT.draw(ctx, k % 2 ? 'HOT' : 'SUPER', VW / 2, 92, BT.fit ? BT.fit('SUPER', VW - 30, 8) : 7, 'superhot', slam((pt - 0.45) % 0.42, 1.6, 0.06));
          }
        }
        if (pt > 1.2 && !(this.shattered && pt < 2.55)) {
          const w = `${this.koWinner === P ? P.name : O.name} WINS`;
          F.draw(ctx, w, VW / 2, 124, '#ffffff', 2, 'center', '#000');
          if (perfect) BT.draw(ctx, 'PERFECT', VW / 2, 150, 3, 'gold');
        }
      }
      if (this.phase2 && this.phase2T < 1.6 && this.phase === 'fight') {
        BT.draw(ctx, 'PHASE 2', VW / 2, 70, 4, 'fire', slam(this.phase2T, 3, 0.12));
        F.draw(ctx, `${this.opp.name} GETS SERIOUS`, VW / 2, 96, '#ff6050', 1, 'center', '#000');
      }
      if (this.phase === 'result') {
        // The world's own win / lose card sits above (drawCards); the details go in a band below it.
        ctx.fillStyle = 'rgba(8,4,16,0.78)'; ctx.fillRect(0, 140, VW, 48);
        if (this.versus) F.draw(ctx, `${this.won ? 'PLAYER 1' : 'PLAYER 2'} WINS  ${this.wins[0]} - ${this.wins[1]}`, VW / 2, 145, this.won ? '#7cf0ff' : '#ff9ad0', 1, 'center', '#000');
        if (this.coins) {
          KF.HUD.coin(ctx, VW / 2 - 30, 144, t);
          F.draw(ctx, `+${this.coins} COINS`, VW / 2 - 18, 145, '#ffd040', 1, 'left', '#000');
        } else if (!this.won && this.mode !== 'arena' && !this.versus) F.draw(ctx, 'TIP: UPGRADE IN THE DOJO SHOP, OR BLOCK MORE (S)', VW / 2, 145, '#b8b0c8', 1, 'center', '#000');
        if (this.mode === 'arena') F.draw(ctx, `BEST STREAK ${KF.Save.data.arena.best}`, VW / 2, 145, '#9ad8ff', 1, 'center', '#000');
        if (pt > 0.8) KF.UI.menu(ctx, this, this.options(), this.menuSel, 155, 120);
      }
      if (this.paused) {
        ctx.fillStyle = 'rgba(8,4,16,0.7)'; ctx.fillRect(0, 0, VW, VH);
        BT.draw(ctx, 'PAUSED', VW / 2, 70, 4, 'steel');
        KF.UI.menu(ctx, this, ['RESUME', 'RESTART FIGHT', 'QUIT'], this.pauseSel, 98);
        const k = this.engine.input.keys();
        F.draw(ctx, `MOVE ${k.move}  JUMP ${k.jump}  BLOCK ${k.block}  PUNCH ${k.punch}  KICK ${k.kick}  SPECIAL ${k.special}`, VW / 2, 160, '#9a90b0', 1, 'center');
        F.draw(ctx, this.superhot ? 'MOUSE: AIM + CLICK TO SHOOT (OR F / V)' : 'MOUSE: LEFT CLICK PUNCH, RIGHT CLICK KICK', VW / 2, 172, '#7a7094', 1, 'center');
        KF.UI.pauseButton(ctx, this, VW / 2 + 19, 4);
      }
    }
  }
  KF.FightScene = FightScene;
})(window.KF);
