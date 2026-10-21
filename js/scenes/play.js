'use strict';
// One stage of one door: wraps the Stage simulation with arcade presentation.
// Phases: intro (ROUND n / GO!) -> play -> hitstop -> ko -> (respawn) ... -> win.
(function (KF) {
  const U = KF.util, F = KF.Font, A = KF.Audio, T = KF.TILE;
  const VW = KF.VIEW_W, VH = KF.VIEW_H;

  class PlayScene {
    // opts: { door: index, stage: index } or { training: true }
    constructor(engine, opts) {
      this.engine = engine;
      this.training = !!opts.training;
      this.doorIdx = opts.door ?? 0;
      this.stageIdx = opts.stage ?? 0;
      this.door = this.training ? { id: 'training', name: 'DOJO', music: 'temple', stages: [KF.Levels.test] } : KF.Doors[this.doorIdx];
      this.def = this.training ? KF.Levels.test : this.door.stages[this.stageIdx];
      this.theme = KF.Themes.get(this.def.theme);
      this.deaths = 0;
      this.time = 0;
      this.memory = { seen: {} };
      this.fx = new KF.FX();
      this.mood = { cheer: 0 };
      this.debug = engine.debug;
      this.paused = false; this.pauseSel = 0;
      this.deathPulse = 0;
      this.banner = null;
      this.newAttempt();
      this.setPhase('intro');
      A.music(this.door.music);
      KF.HUD.lag = 1;
    }

    setPhase(p) { this.phase = p; this.phaseT = 0; this.cues = {}; }
    cue(name, at) { if (this.phaseT >= at && !this.cues[name]) { this.cues[name] = true; return true; } return false; }

    newAttempt() {
      this.stage = new KF.Stage(this.def, this.deaths, this.memory);
      this.layer = KF.Render.bakeStage(this.stage.world, this.theme);
      this.trail = []; this.trailT = 0;
      this.ko = null;
      this.spawnFlash = 1;
      this.wasReversed = false;
      this.cam = { x: 0, y: 0, prevX: 0, prevY: 0 };
      this.updateCamera(1); this.cam.prevX = this.cam.x; this.cam.prevY = this.cam.y;
    }

    updateCamera(k) {
      const p = this.stage.player, c = this.cam, w = this.stage.world;
      c.prevX = c.x; c.prevY = c.y;
      const look = U.clamp(p.vx * 0.25, -32, 32);
      const tx = U.clamp(p.centerX - VW / 2 + look, 0, Math.max(0, w.pixelW - VW));
      const ty = U.clamp(p.y + p.h / 2 - VH * 0.55, 0, Math.max(0, w.pixelH - VH));
      c.x += (tx - c.x) * k;
      c.y += (ty - c.y) * k;
    }

    handleEvents() {
      const fx = this.fx, th = this.theme;
      for (const e of this.stage.events) {
        switch (e.type) {
          case 'jump': A.sfx('jump'); fx.dust(e.x, e.y, 4, 0, e.g); break;
          case 'land':
            A.sfx('land', { speed: e.speed });
            fx.dust(e.x - 4, e.y, 3, -1, e.g); fx.dust(e.x + 4, e.y, 3, 1, e.g);
            if (e.speed > 340) fx.shake(2, 0.12);
            break;
          case 'skid': A.sfx('skid'); fx.dust(e.x, e.y, 3, -this.stage.player.facing, e.g); break;
          case 'death':
            A.sfx('hit');
            fx.spark(e.x, U.clamp(e.y, this.cam.y + 20, this.cam.y + VH - 20), 1.4);
            fx.flash = 1; fx.shake(7, 0.4);
            this.deaths++; this.deathPulse = 1; this.mood.cheer = 1.2;
            break;
          case 'crumble': A.sfx('crumble'); fx.debris(e.x, e.y + 2, e.w, ['#d5bd9c', '#8e4436', '#5c2a2c', '#9c8468']); fx.shake(2, 0.2); break;
          case 'spikes': A.sfx('spikes'); break;
          case 'rumble': A.sfx('rumble'); break;
          case 'slam': A.sfx('slam'); fx.shake(4, 0.25); fx.dust(e.x - e.w / 2, e.y, 4, -1); fx.dust(e.x + e.w / 2, e.y, 4, 1); break;
          case 'spring': A.sfx('spring'); fx.dust(e.x, e.y + 6, 5); break;
          case 'whoosh': A.sfx('whoosh'); break;
          case 'doorrun': A.sfx('doorrun'); fx.dust(e.x, e.y + 16, 4); break;
          case 'punch': A.sfx('punch'); break;
          case 'gravity': A.sfx('gravity', { g: e.g }); fx.tick(e.x, e.y); break;
          case 'bonk': A.sfx('bonk'); fx.tick(e.x, e.y + 8); break;
          case 'poof': A.sfx('whoosh'); fx.dust(e.x, e.y, 8); break;
          case 'say': A.sfx('say'); fx.say(e.text, e.x, e.y); break;
          case 'win': A.sfx('win'); fx.confetti(e.x, e.y); this.mood.cheer = 1.6; break;
        }
      }
      this.stage.events.length = 0;
      void th;
    }

    restart(countDeath) {
      if (countDeath) this.deaths++;
      this.newAttempt();
      this.banner = { text: 'ROUND ' + (this.deaths + 1), t: 0 };
      A.sfx('select');
      this.setPhase('play');
    }

    update(dt) {
      const input = this.engine.input;
      this.debug = this.engine.debug;
      if (input.wasPressed('Escape') && this.phase !== 'win') {
        this.paused = !this.paused; this.pauseSel = 0; A.sfx('pause');
      }
      if (this.paused) return this.updatePause(input);

      this.fx.update(dt);
      this.mood.cheer = Math.max(0, this.mood.cheer - dt * 0.6);
      this.deathPulse = Math.max(0, this.deathPulse - dt * 3);
      this.spawnFlash = Math.max(0, this.spawnFlash - dt * 5);
      if (this.banner && (this.banner.t += dt) > 0.9) this.banner = null;
      this.phaseT += dt;
      const p = this.stage.player;

      if (input.wasPressed('KeyR') && (this.phase === 'play' || this.phase === 'ko')) { this.restart(false); return; }

      switch (this.phase) {
        case 'intro':
          p.stateT += dt;
          if (this.cue('round', 0.05)) { A.sfx('round'); this.fx.shake(3, 0.2); }
          if (this.phaseT > 0.5 && (input.jumpPressed || input.wasPressed('Enter'))) this.phaseT = Math.max(this.phaseT, 0.95);
          if (this.cue('go', 0.95)) { A.sfx('go'); this.fx.shake(5, 0.25); }
          if (this.phaseT >= 1.05) { this.phase = 'play'; this.goT = 0; }
          break;
        case 'play':
          this.time += dt;
          this.stage.step(dt, input);
          if (p.reversed && !this.wasReversed) A.sfx('reverse');
          this.wasReversed = p.reversed;
          this.handleEvents();
          this.updateTrail(dt);
          if (this.stage.state === 'dead') this.setPhase('hitstop');
          else if (this.stage.state === 'won') this.startWin();
          break;
        case 'hitstop': // freeze frame on impact
          if (this.phaseT >= 0.15) {
            this.setPhase('ko');
            const inView = p.y < this.stage.world.pixelH && p.y + p.h > 0;
            this.ko = inView ? {
              x: p.centerX, y: p.y + p.h / 2, vx: -p.facing * 80, vy: -300 * p.gravDir, rot: 0,
              vrot: -p.facing * 13, flip: p.gravDir < 0, facing: p.facing,
            } : null;
            A.sfx('ko'); this.fx.shake(6, 0.3);
          }
          break;
        case 'ko':
          if (this.ko) {
            const k = this.ko;
            k.vy += 1100 * (k.flip ? -1 : 1) * dt; k.x += k.vx * dt; k.y += k.vy * dt; k.rot += k.vrot * dt;
          }
          if (this.phaseT > 0.85 || (this.phaseT > 0.3 && (input.jumpPressed || input.wasPressed('Enter')))) this.restart(false);
          break;
        case 'win':
          p.stateT += dt;
          this.stage.step(dt, { left: false, right: false, jumpHeld: false, jumpPressed: false });
          if (this.cue('banner', 0.45)) { A.sfx(this.deaths === 0 ? 'perfect' : 'confirm'); this.fx.shake(4, 0.2); }
          if (this.phaseT > 1.2 && (input.jumpPressed || input.wasPressed('Enter', 'Space'))) this.next();
          else if (this.phaseT > 5) this.next();
          break;
      }
      this.updateCamera(1 - Math.pow(0.0008, dt));
    }

    updateTrail(dt) {
      const p = this.stage.player;
      for (const g of this.trail) g.a -= dt * 2.2;
      this.trail = this.trail.filter((g) => g.a > 0);
      this.trailT -= dt;
      if ((p.fast || p.launchT > 0) && this.trailT <= 0) {
        this.trailT = 0.035;
        const frame = KF.Sprites.pick(p.state, p.stateT);
        this.trail.push({ x: p.centerX, y: p.gravDir < 0 ? p.y : p.y + p.h, frame, facing: p.facing, flip: p.gravDir < 0, which: this.trail.length % 2 ? 'ghostA' : 'ghostB', a: 0.55 });
      }
    }

    startWin() {
      this.setPhase('win');
      const p = this.stage.player;
      p.state = 'victory'; p.stateT = 0; p.vx = 0;
      this.trail = [];
      if (!this.training) KF.Save.clearStage(this.door.id, this.stageIdx, this.deaths, this.door.stages.length);
    }

    next() {
      if (this.training) { this.engine.go(() => new KF.SelectScene(this.engine)); return; }
      if (this.stageIdx + 1 < this.door.stages.length) {
        const d = this.doorIdx, s = this.stageIdx + 1;
        this.engine.go(() => new PlayScene(this.engine, { door: d, stage: s }));
      } else {
        this.engine.go(() => new KF.SelectScene(this.engine, { cleared: this.doorIdx }));
      }
    }

    updatePause(input) {
      const opts = ['RESUME', 'RESTART STAGE', 'QUIT TO DOORS'];
      if (input.wasPressed('ArrowUp', 'KeyW')) { this.pauseSel = (this.pauseSel + 2) % 3; A.sfx('select'); }
      if (input.wasPressed('ArrowDown', 'KeyS')) { this.pauseSel = (this.pauseSel + 1) % 3; A.sfx('select'); }
      if (input.wasPressed('Enter', 'Space')) {
        A.sfx('confirm');
        this.paused = false;
        if (this.pauseSel === 1) { this.deaths = 0; this.time = 0; this.memory = { seen: {} }; this.newAttempt(); this.setPhase('intro'); }
        if (this.pauseSel === 2) this.engine.go(() => new KF.SelectScene(this.engine));
      }
      void opts;
    }

    render(ctx, alpha) {
      const st = this.stage, p = st.player, c = this.cam;
      const frozen = this.phase === 'hitstop' || this.paused;
      const a = frozen ? 1 : alpha;
      const sh = this.fx.offset();
      const cam = { x: Math.round(U.lerp(c.prevX, c.x, a)) + sh.x, y: Math.round(U.lerp(c.prevY, c.y, a)) + sh.y };
      const t = this.engine.time;

      ctx.fillStyle = this.theme.bg; ctx.fillRect(0, 0, VW, VH);
      this.theme.background(ctx, cam, t, this.mood);
      KF.Render.zones(ctx, st, this.theme, cam, t);
      KF.Render.labels(ctx, this.def, this.theme, cam);
      ctx.drawImage(this.layer, -cam.x, -cam.y);
      KF.Render.traps(ctx, st, this.theme, cam, t);
      const doorOpen = this.phase === 'win' ? Math.min(1, this.phaseT * 4) : 0;
      KF.Render.door(ctx, st, cam, t, doorOpen);

      const pos = { x: U.lerp(p.prevX, p.x, a), y: U.lerp(p.prevY, p.y, a) };
      if (this.phase === 'ko') {
        if (this.ko) {
          const k = this.ko, fr = KF.Sprites.frames.hurt[0];
          ctx.save();
          ctx.translate(Math.round(k.x - cam.x), Math.round(k.y - cam.y));
          ctx.rotate(Math.round(k.rot / (Math.PI / 4)) * (Math.PI / 4)); // snap to 45 degrees: crunchy arcade spin
          ctx.scale(k.facing < 0 ? -1 : 1, k.flip ? -1 : 1);
          ctx.drawImage(fr.img, -KF.Sprites.AX, -24);
          ctx.restore();
        }
      } else if (this.phase === 'hitstop') {
        KF.Render.player(ctx, p, pos, cam, { state: 'hurt', flash: Math.floor(this.phaseT * 40) % 2 ? 1 : 0 });
      } else {
        KF.Render.player(ctx, p, pos, cam, { trail: this.trail, flash: this.spawnFlash * 0.8, state: this.phase === 'win' ? 'victory' : null });
      }
      this.fx.render(ctx, cam);
      if (this.fx.flash > 0) { ctx.globalAlpha = this.fx.flash * 0.5; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1; }
      if (this.debug) KF.Render.debug(ctx, this, cam);

      KF.HUD.draw(ctx, {
        stageIndex: this.stageIdx, stageCount: this.door.stages.length, worldName: this.door.name, stageName: this.def.name,
        remaining: st.remaining, time: this.time, round: this.deaths + 1, deaths: this.deaths, deathPulse: this.deathPulse,
        reversed: p.reversed && this.phase === 'play', flipped: p.gravDir < 0,
      }, t);
      this.renderOverlay(ctx, t);
    }

    renderOverlay(ctx, t) {
      const BT = KF.BigText, pt = this.phaseT;
      const slam = (x, from = 3.5, dur = 0.12) => (x < dur ? from - (from - 1) * (x / dur) : 1);
      if (this.phase === 'intro') {
        if (pt < 0.95) {
          BT.draw(ctx, `ROUND ${this.deaths + 1}`, VW / 2, 92, 4, 'steel', slam(pt));
          const label = this.training ? 'TRAINING DOJO' : `${this.door.name} ${this.stageIdx + 1}: ${this.def.name}`;
          if (pt > 0.2) F.draw(ctx, label, VW / 2, 120, '#ffffff', 1, 'center', '#000');
        } else {
          BT.draw(ctx, 'GO!', VW / 2, 96, 7, 'fire', slam(pt - 0.95, 3, 0.08), Math.min(1, (1.35 - pt) * 6 + 0.4));
        }
      }
      if (this.phase === 'play' && this.goT !== undefined && this.goT < 0.35) {
        this.goT += 1 / 60;
        BT.draw(ctx, 'GO!', VW / 2, 96, 7, 'fire', 1 + this.goT * 1.2, Math.max(0, 1 - this.goT * 3));
      }
      if (this.banner && this.phase === 'play') {
        const bt = this.banner.t;
        BT.draw(ctx, this.banner.text, VW / 2, 70, 3, 'steel', slam(bt, 2.5, 0.08), bt > 0.6 ? (0.9 - bt) / 0.3 : 1);
      }
      if (this.phase === 'ko' || this.phase === 'hitstop') {
        const kt = this.phase === 'ko' ? pt : 0;
        if (this.phase === 'ko') BT.draw(ctx, 'K.O.', VW / 2, 92, 7, 'blood', slam(kt, 4, 0.1));
        if (kt > 0.35) F.draw(ctx, Math.floor(t * 3) % 2 ? 'JUMP: AGAIN' : '', VW / 2, 130, '#ffffff', 1, 'center', '#000');
      }
      if (this.phase === 'win' && pt > 0.45) {
        const wt = pt - 0.45;
        const perfect = this.deaths === 0;
        const band = Math.min(1, wt * 8);
        ctx.fillStyle = 'rgba(8,4,16,0.72)'; ctx.fillRect(0, 84 - 34 * band, VW, 68 * band);
        ctx.fillStyle = perfect ? '#ffd040' : '#ff7030'; ctx.fillRect(0, 84 - 34 * band, VW, 1); ctx.fillRect(0, 84 + 34 * band - 1, VW, 1);
        BT.draw(ctx, perfect ? 'PERFECT' : 'YOU WIN', VW / 2, 76, 5, perfect ? 'gold' : 'fire', slam(wt, 3, 0.1));
        if (wt > 0.3) {
          const best = this.training ? null : KF.Save.door(this.door.id).best[this.stageIdx];
          F.draw(ctx, `TIME ${this.time.toFixed(1)}S    DEATHS ${this.deaths}` + (best !== undefined && best !== null ? `    BEST ${best}` : ''), VW / 2, 100, '#ffffff', 1, 'center', '#000');
        }
        if (pt > 1.2 && Math.floor(t * 3) % 2) {
          const last = !this.training && this.stageIdx === this.door.stages.length - 1;
          F.draw(ctx, last ? 'JUMP: DOOR CLEARED!' : 'JUMP: NEXT STAGE', VW / 2, 110, '#ffd040', 1, 'center', '#000');
        }
      }
      if (this.paused) {
        ctx.fillStyle = 'rgba(8,4,16,0.7)'; ctx.fillRect(0, 0, VW, VH);
        BT.draw(ctx, 'PAUSED', VW / 2, 70, 4, 'steel');
        ['RESUME', 'RESTART STAGE', 'QUIT TO DOORS'].forEach((o, i) => {
          const sel = i === this.pauseSel;
          F.draw(ctx, (sel ? '> ' : '  ') + o, VW / 2, 104 + i * 14, sel ? '#ffd040' : '#b8b0c8', 1, 'center', '#000');
        });
        F.draw(ctx, 'R RESTART   M SOUND   F1 HITBOXES', VW / 2, 170, '#7a7090', 1, 'center');
      }
    }
  }
  KF.PlayScene = PlayScene;
})(window.KF);
