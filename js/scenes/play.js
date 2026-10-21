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
      this.style = this.training ? KF.Styles.get('hd') : KF.Styles.forStage(this.door.id, this.stageIdx, this.def);
      this.hiRes = !!this.style.smooth; engine.fit(this); // smooth styles draw at the screen's resolution
      this.theme = KF.Themes.get(this.def.env || this.style.theme || this.def.theme);
      this.rule = this.training ? { name: 'TRAINING DOJO', rule: null } : KF.Rules.get(this.def);
      this.worldName = this.training ? 'TRAINING DOJO' : KF.placeName(this.def.env);
      KF.Audio.setLowpass(this.style.audio && this.style.audio.lowpass);
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
      this.setPhase(this.style.crashIntro ? 'crash' : 'intro');
      A.music(this.def.music || this.door.music);
      KF.HUD.lag = 1;
    }

    setPhase(p) { this.phase = p; this.phaseT = 0; this.cues = {}; }
    cue(name, at) { if (this.phaseT >= at && !this.cues[name]) { this.cues[name] = true; return true; } return false; }

    newAttempt() {
      this.stage = new KF.Stage(this.def, this.deaths, this.memory);
      this.layer = KF.Render.bakeStage(this.stage.world, this.theme, this.style.smooth ? this.engine.scale : KF.RES);
      this.trail = []; this.trailT = 0;
      this.hist = [];
      this.ko = null;
      this.spawnFlash = 1;
      this.wasReversed = false;
      if (this.def.combat) this.cursor = 'crosshair';
      this.cam = { x: 0, y: 0, prevX: 0, prevY: 0 };
      this.updateCamera(1); this.cam.prevX = this.cam.x; this.cam.prevY = this.cam.y;
    }

    updateCamera(k) {
      const p = this.stage.player, c = this.cam, w = this.stage.world;
      c.prevX = c.x; c.prevY = c.y;
      const look = U.clamp(p.vx * 0.25, -32, 32);
      let tx = U.clamp(p.centerX - VW / 2 + look, 0, Math.max(0, w.pixelW - VW));
      if (this.rule.camera === 'panels') { // comic panels: jump half a screen at a time
        const half = VW / 2;
        tx = U.clamp(Math.floor(p.centerX / half) * half - VW / 4, 0, Math.max(0, w.pixelW - VW));
        if (k < 1) k = Math.min(1, k * 4);
      }
      const ty = U.clamp(p.y + p.h / 2 - VH * 0.55, 0, Math.max(0, w.pixelH - VH));
      c.x += (tx - c.x) * k;
      c.y += (ty - c.y) * k;
    }

    handleEvents() {
      const fx = this.fx, th = this.theme;
      for (const e of this.stage.events) {
        switch (e.type) {
          case 'shot': A.sfx('punch', { speed: 3 }); break;
          case 'swing': A.sfx('whoosh'); break;
          case 'impact': A.sfx('punch'); fx.spark(e.x, e.y, 0.6); break;
          case 'shatter': A.sfx('crumble'); fx.shake(3, 0.15); break;
          case 'blocked': A.sfx('block'); fx.spark(e.x, e.y, 0.5); break;
          case 'damage': A.sfx('punch'); fx.shake(4, 0.15); break;
          case 'jump': KF.Present.sfx(this.style.id, 'jump'); fx.dust(e.x, e.y, 4, 0, e.g); break;
          case 'land':
            KF.Present.sfx(this.style.id, 'land', { speed: e.speed });
            fx.dust(e.x - 4, e.y, 3, -1, e.g); fx.dust(e.x + 4, e.y, 3, 1, e.g);
            if (e.speed > 340) fx.shake(2, 0.12);
            break;
          case 'skid': A.sfx('skid'); fx.dust(e.x, e.y, 3, -this.stage.player.facing, e.g); break;
          case 'death':
            KF.Present.sfx(this.style.id, 'death'); // the world's own death stinger
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
          case 'win': if (KF.Present.has(this.style.id, 'win')) KF.Present.sfx(this.style.id, 'win', { perfect: this.deaths === 0 }); else A.sfx('win'); fx.confetti(e.x, e.y); this.mood.cheer = 1.6; break;
        }
      }
      this.stage.events.length = 0;
      void th;
    }

    restart(countDeath) {
      if (countDeath) this.deaths++;
      this.newAttempt();
      A.sfx('select');
      this.setPhase('play');
    }

    update(dt) {
      const input = this.engine.input;
      this.debug = this.engine.debug;
      const click = KF.UI.clicked(this);
      this.tap = input.clicked && !click; // a click on the world itself: "continue" in cards
      if ((input.pause || click === 'pause') && this.phase !== 'win') {
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
        case 'crash': // fake crash screen before the stage "recovers"
          if (this.cue('beep', 0.05)) A.sfx('bonk');
          if (this.phaseT > 2.6 || (this.phaseT > 0.8 && input.wasPressed('Enter', 'Space'))) { this.setPhase('intro'); this.fx.shake(6, 0.3); }
          break;
        case 'intro':
          p.stateT += dt;
          if (this.cue('round', 0.05)) { A.sfx('whoosh'); this.fx.shake(3, 0.2); }
          if (this.phaseT > 0.5 && (input.jumpPressed || input.wasPressed('Enter') || this.tap)) this.phaseT = Math.max(this.phaseT, 0.95);
          if (this.cue('go', 0.95)) {
            KF.Present.sfx(this.style.id, 'go'); this.fx.shake(5, 0.25); this.goAt = this.engine.time;
          }
          if (this.phaseT >= 1.05) this.phase = 'play';
          break;
        case 'play':
          this.time += dt;
          const controls = { left: input.left, right: input.right, jumpHeld: input.jumpHeld, jumpPressed: input.jumpPressed,
            shoot: input.isDown('KeyF', 'KeyV') || input.wasPressed('KeyF', 'KeyV') || (input.clicked && !click),
            melee: input.isDown('KeyJ', 'KeyZ', 'KeyK', 'KeyX') || input.wasPressed('KeyJ', 'KeyZ', 'KeyK', 'KeyX') || input.rclicked,
            block: input.isDown('KeyS', 'ArrowDown') };
          if (input.clicked && !click && input.mouse.seen) { controls.aimX = input.mouse.x + this.cam.x; controls.aimY = input.mouse.y + this.cam.y; }
          this.stage.step(dt, controls);
          // Stand still too long and the narrator gets bored.
          if (p.reversed && !this.wasReversed) A.sfx('reverse');
          this.wasReversed = p.reversed;
          this.handleEvents();
          this.updateTrail(dt);
          if (this.rule.rewind) { // the tape keeps the last second and a bit, for the rewind on death
            this.hist.push({ x: p.x, y: p.y, state: p.state, stateT: p.stateT, facing: p.facing, flip: p.gravDir < 0 });
            if (this.hist.length > 150) this.hist.shift();
          }
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
            this.fx.shake(6, 0.3);
          }
          break;
        case 'ko':
          if (this.ko) {
            const k = this.ko;
            k.vy += 1100 * (k.flip ? -1 : 1) * dt; k.x += k.vx * dt; k.y += k.vy * dt; k.rot += k.vrot * dt;
          }
          if (this.phaseT > 0.85 || (this.phaseT > 0.3 && (input.jumpPressed || input.wasPressed('Enter') || this.tap))) this.restart(false);
          break;
        case 'win':
          p.stateT += dt;
          this.stage.step(dt, { left: false, right: false, jumpHeld: false, jumpPressed: false });
          if (this.cue('banner', 0.45)) { if (!KF.Present.has(this.style.id, 'win')) A.sfx(this.deaths === 0 ? 'perfect' : 'confirm'); this.fx.shake(4, 0.2); }
          if (this.phaseT > 1.2 && (input.jumpPressed || input.wasPressed('Enter', 'Space') || this.tap)) this.next();
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
      this.coins = this.training ? 0 : KF.Save.completeNode(this.door.id, KF.Path.nodeOfStage(this.stageIdx), { deaths: this.deaths });
      if (this.def.combat && this.stage.combat.cleared) this.coins += KF.Save.completeNode(this.door.id, KF.Path.boss);
    }

    // After a stage: the realm's next street fighter, or its boss after stage 5.
    next() {
      const e = this.engine, r = this.doorIdx, s = this.stageIdx;
      if (this.training) { e.go(() => new KF.MapScene(e)); return; }
      if (this.def.combat) { e.go(() => new KF.MapScene(e, { cleared: r })); return; }
      const style = this.style.id;
      const env = this.def.env;
      // Path: level, level, street fight, level, level, boss.
      if (s === this.door.stages.length - 1) e.go(() => new KF.FightScene(e, { mode: 'boss', realm: r, node: KF.Path.boss, def: KF.Roster.bossDef(r), style, env }));
      else if (s === 1) e.go(() => new KF.FightScene(e, { mode: 'street', realm: r, node: KF.Path.street, def: KF.Roster.streetDef(r, 0), style, env }));
      else e.go(() => new KF.PlayScene(e, { door: r, stage: s + 1 }));
    }

    updatePause(input) {
      const pick = KF.UI.menuInput(this, input, 3, 'pauseSel');
      if (pick < 0) return;
      A.sfx('confirm');
      this.paused = false;
      if (pick === 1) { this.deaths = 0; this.time = 0; this.memory = { seen: {} }; this.newAttempt(); this.setPhase('intro'); }
      if (pick === 2) { const r = this.doorIdx; this.engine.go(() => (this.training ? new KF.MapScene(this.engine) : new KF.RealmScene(this.engine, r))); }
    }

    render(ctx, alpha) {
      const st = this.stage, p = st.player, c = this.cam, style = this.style;
      const frozen = this.phase === 'hitstop' || this.paused;
      const a = frozen ? 1 : alpha;
      const sh = this.fx.offset();
      const cam = { x: Math.round(U.lerp(c.prevX, c.x, a)) + sh.x, y: Math.round(U.lerp(c.prevY, c.y, a)) + sh.y };
      const t = this.engine.time;

      // The world is drawn into its own canvas so the stage's style can rework it.
      const res = style.smooth ? this.engine.scale : style.res || KF.RES;
      if (!this.wc || this.wc.res !== res) this.wc = KF.makeHi(VW, VH, res, !!style.post);
      const w = this.wc.getContext('2d');
      w.setTransform(res, 0, 0, res, 0, 0); w.imageSmoothingEnabled = !!style.smooth;
      if (style.clearBg) w.clearRect(0, 0, VW, VH); // AR: the camera feed shows through
      else { w.fillStyle = this.theme.bg; w.fillRect(0, 0, VW, VH); }
      if (!style.clearBg || this.theme.id === 'env_' + style.id) this.theme.background(w, cam, t, this.mood);
      KF.Render.zones(w, st, this.theme, cam, t);
      KF.Render.labels(w, this.def, this.theme, cam);
      if (style.extrude) KF.Render.extrude(w, st, this.theme, cam);
      const pos = { x: U.lerp(p.prevX, p.x, a), y: U.lerp(p.prevY, p.y, a) };
      const sight = this.rule.sight;
      if (sight) { // the pencil has only drawn the part of the world near you
        w.save(); w.beginPath(); w.arc(pos.x + p.w / 2 - cam.x, pos.y + p.h / 2 - cam.y, sight, 0, Math.PI * 2); w.clip();
      }
      KF.blit(w, this.layer, -cam.x, -cam.y);
      KF.Render.traps(w, st, this.theme, cam, t);
      if (sight) w.restore();
      const doorOpen = this.phase === 'win' ? Math.min(1, this.phaseT * 4) : 0;
      KF.Render.door(w, st, cam, t, doorOpen, this.theme);
      if (st.combat) KF.CombatRender.world(w, st, cam);

      const glow = style.playerGlow || 0;
      if (this.phase === 'ko' && this.rule.rewind && this.hist.length) {
        const n = this.hist.length, h = this.hist[Math.max(0, n - 1 - Math.floor(Math.min(1, this.phaseT / 0.8) * (n - 1)))];
        KF.Render.player(w, p, { x: h.x, y: h.y }, cam, { state: h.state, theme: this.theme });
      } else if (this.phase === 'ko') {
        if (this.ko) {
          const k = this.ko, fr = KF.Sprites.frames.hurt[0];
          w.save();
          w.translate(Math.round(k.x - cam.x), Math.round(k.y - cam.y));
          w.rotate(Math.round(k.rot / (Math.PI / 4)) * (Math.PI / 4)); // snap to 45 degrees: crunchy arcade spin
          w.scale(k.facing < 0 ? -1 : 1, k.flip ? -1 : 1);
          if (this.theme.drawPlayer) KF.Font.draw(w, 'X', 0, -10, '#8af4ff', 3, 'center');
          else KF.Render.figure(w, fr, { dy: KF.Sprites.AY - 24 });
          w.restore();
        }
      } else if (this.phase === 'hitstop') {
        KF.Render.player(w, p, pos, cam, { state: 'hurt', flash: Math.floor(this.phaseT * 40) % 2 ? 1 : glow, theme: this.theme });
      } else if (this.phase !== 'crash') {
        KF.Render.player(w, p, pos, cam, { trail: this.trail, flash: Math.max(glow, this.spawnFlash * 0.8), state: this.phase === 'win' ? 'victory' : null, theme: this.theme });
      }
      this.fx.render(w, cam);
      if (this.fx.flash > 0) { w.globalAlpha = this.fx.flash * 0.5; w.fillStyle = '#ffffff'; w.fillRect(0, 0, VW, VH); w.globalAlpha = 1; }

      const cardsOnTop = !!style.compose || KF.Present.onTop(style.id);
      if (!cardsOnTop) this.renderCards(w, t);
      const info = KF.Styles.info(t, this.engine.frame || 0, res, pos.x + p.w / 2 - cam.x, pos.y + p.h / 2 - cam.y, p.x);
      info.themeId = this.theme.id;
      KF.Styles.post(style, this.wc, info);
      const roll = this.rule.roll, rollT = roll && this.time > roll.dur ? this.time % roll.every : 1e9; // never on the opening frames
      if (style.compose) style.compose(ctx, this.wc, info);
      else if (roll && rollT < roll.dur && this.phase === 'play') { // the picture rolls, like a TV losing vertical hold
        const off = Math.round((rollT / roll.dur) * VH);
        KF.blit(ctx, this.wc, 0, off); KF.blit(ctx, this.wc, 0, off - VH);
        ctx.fillStyle = '#000'; ctx.fillRect(0, off - 3, VW, 5);
      } else KF.blit(ctx, this.wc, 0, 0);
      const bo = this.rule.blackout;
      if (bo && this.phase === 'play') { // the lights cut out, after a warning flicker
        const c = this.time % bo.every, offAt = bo.every - bo.off;
        let dark = c > offAt ? 0.86 : c > offAt - 0.6 && Math.floor(this.time * 14) % 2 ? 0.5 : 0;
        if (dark) {
          const px = pos.x + p.w / 2 - cam.x, py = pos.y + p.h / 2 - cam.y;
          const g = ctx.createRadialGradient(px, py, 10, px, py, 34);
          g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${dark})`);
          ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
        }
      }
      if (style.under) style.under(ctx, info);
      if (this.debug) KF.Render.debug(ctx, this, cam);

      if (style.overlay) style.overlay(ctx, info);
      if (this.phase !== 'crash') KF.HUD.draw(ctx, {
        scene: this, worldName: this.worldName, remaining: st.remaining, time: this.time, deaths: this.deaths, deathPulse: this.deathPulse,
        reversed: p.reversed !== !!st.rule.reverse && this.phase === 'play', flipped: p.gravDir < 0,
      }, t);
      if (st.combat && this.phase === 'play') KF.CombatRender.hud(ctx, st);
      this.renderOverlay(ctx, t);
    }

    // The world's K.O. card, start text and win text (js/present.js). They are drawn into the world
    // canvas before the style's pixel pass, so a black-and-white world gets black-and-white
    // lettering; styles that reshape the world canvas (mirror, AR) get them on top instead.
    renderCards(ctx, t) {
      const id = this.style.id, P = KF.Present;
      if (this.phase === 'ko') P.ko(ctx, id, this.phaseT, { deaths: this.deaths - 1, rewind: !!this.rule.rewind });
      if (this.goAt !== undefined && t - this.goAt < 0.9 && (this.phase === 'play' || this.phase === 'intro')) {
        const gt = t - this.goAt;
        ctx.save(); ctx.globalAlpha = Math.min(1, (0.9 - gt) / 0.25);
        P.intro(ctx, id, gt, { deaths: this.deaths });
        ctx.restore();
      }
      if (this.phase === 'win' && this.phaseT > 0.45) P.win(ctx, id, this.phaseT - 0.45, { perfect: this.deaths === 0, deaths: this.deaths });
    }

    renderOverlay(ctx, t) {
      const BT = KF.BigText, pt = this.phaseT;
      const slam = (x, from = 3.5, dur = 0.12) => (x < dur ? from - (from - 1) * (x / dur) : 1);
      if (this.phase === 'intro') {
        if (pt < 0.95) { // title card: the world's name and the rule it bends
          const k = Math.min(1, pt * 6);
          ctx.fillStyle = 'rgba(8,4,16,0.75)'; ctx.fillRect(0, 108 - 34 * k, VW, 68 * k);
          BT.draw(ctx, this.worldName, VW / 2, 92, BT.fit ? BT.fit(this.worldName, VW - 40, 4) : 3, 'steel', slam(pt));
          if (pt > 0.15 && this.rule.rule) F.draw(ctx, this.rule.rule, VW / 2, 114, '#ffd040', 1, 'center', '#000');
          if (pt > 0.25 && !this.training) F.draw(ctx, `${this.door.name}  -  LEVEL ${this.stageIdx + 1} OF ${this.door.stages.length}`, VW / 2, 128, '#b8b0c8', 1, 'center', '#000');
        }
      }
      if (this.style.compose || KF.Present.onTop(this.style.id)) this.renderCards(ctx, t);
      if (this.banner && this.phase === 'play') {
        const bt = this.banner.t;
        BT.draw(ctx, this.banner.text, VW / 2, 70, 3, 'steel', slam(bt, 2.5, 0.08), bt > 0.6 ? (0.9 - bt) / 0.3 : 1);
      }
      if (this.phase === 'crash') {
        ctx.fillStyle = '#0c2a8a'; ctx.fillRect(0, 0, VW, VH);
        F.draw(ctx, 'X_X', 30, 30, '#ffffff', 8);
        F.draw(ctx, 'KUNG FOOLED HAS STOPPED WORKING.', 30, 104, '#ffffff', 1);
        F.draw(ctx, 'IT WAS PROBABLY YOUR FAULT.', 30, 116, '#ffffff', 1);
        F.draw(ctx, `COLLECTING EXCUSES... ${Math.min(100, Math.floor(pt * 48))}% COMPLETE`, 30, 136, '#9ab0ff', 1);
        F.draw(ctx, 'STOP CODE: STAGE_TOO_HARD', 30, 160, '#9ab0ff', 1);
        return;
      }
      if (this.phase === 'ko' || this.phase === 'hitstop') {
        const kt = this.phase === 'ko' ? pt : 0;
        if (kt > 0.35 && Math.floor(t * 3) % 2) F.draw(ctx, 'JUMP: AGAIN', VW / 2, 162, '#ffffff', 1, 'center', '#000');
      }
      if (this.phase === 'win' && pt > 0.45) { // the world's win card is drawn by renderCards; stats under it
        const wt = pt - 0.45;
        if (wt > 0.3) {
          ctx.fillStyle = 'rgba(8,4,16,0.72)'; ctx.fillRect(0, 148, VW, 38);
          const best = this.training ? null : KF.Save.door(this.door.id).best[this.stageIdx];
          F.draw(ctx, `TIME ${this.time.toFixed(1)}S    DEATHS ${this.deaths}` + (best !== undefined && best !== null ? `    BEST ${best}` : '') + (this.deaths === 0 ? '    PERFECT!' : ''), VW / 2, 152, '#ffffff', 1, 'center', '#000');
          if (this.coins) { KF.HUD.coin(ctx, VW / 2 - 30, 162, t); F.draw(ctx, `+${this.coins} COINS`, VW / 2 - 18, 163, '#ffd040', 1, 'left', '#000'); }
        }
        if (pt > 1.2 && Math.floor(t * 3) % 2) {
          const last = !this.training && this.stageIdx === this.door.stages.length - 1;
          F.draw(ctx, this.training || this.def.combat ? 'JUMP: BACK TO MAP' : last ? 'JUMP: FACE THE BOSS!' : this.stageIdx === 1 ? 'JUMP: A CHALLENGER APPROACHES' : 'JUMP: NEXT LEVEL', VW / 2, 175, '#ffd040', 1, 'center', '#000');
        }
      }
      if (this.paused) {
        ctx.fillStyle = 'rgba(8,4,16,0.7)'; ctx.fillRect(0, 0, VW, VH);
        BT.draw(ctx, 'PAUSED', VW / 2, 70, 4, 'steel');
        KF.UI.menu(ctx, this, ['RESUME', 'RESTART LEVEL', this.training ? 'QUIT TO MAP' : 'QUIT TO REALM'], this.pauseSel, 98);
        F.draw(ctx, 'ESC / P: RESUME    R: RESTART    M: SOUND', VW / 2, 160, '#7a7090', 1, 'center');
        KF.UI.pauseButton(ctx, this, VW - 13, 1);
      }
    }
  }
  KF.PlayScene = PlayScene;
})(window.KF);
