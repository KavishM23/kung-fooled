'use strict';
// One stage of one door: wraps the Stage simulation with arcade presentation.
// Phases: intro (ROUND n / GO!) -> play -> hitstop -> ko -> (respawn) ... -> win.
(function (KF) {
  const U = KF.util, F = KF.Font, A = KF.Audio, T = KF.TILE;
  const VW = KF.VIEW_W, VH = KF.VIEW_H;

  class PlayScene {
    // opts: { door: index, stage: index } or { training: true }, plus optionally
    //   run      a realm speedrun in progress (js/scenes/modes.js)
    //   mode     'endless' | 'daily' | 'custom', with def: a generated or home-made stage
    //   endless  the Endless Dojo run state; back: () => scene to return to (custom levels)
    constructor(engine, opts) {
      this.engine = engine;
      this.opts = opts;
      this.training = !!opts.training;
      this.mode = opts.mode || (this.training ? 'training' : 'realm');
      this.run = opts.run || null;
      this.endless = opts.endless || null;
      this.doorIdx = opts.door ?? 0;
      this.stageIdx = opts.def ? 0 : opts.stage ?? 0;
      if (opts.def) this.door = { id: this.mode, name: opts.def.name, music: opts.def.music || 'neon', stages: [opts.def] };
      else this.door = this.training ? { id: 'training', name: 'DOJO', music: 'temple', stages: [KF.Levels.test] } : KF.Doors[this.doorIdx];
      this.def = opts.def || (this.training ? KF.Levels.test : this.door.stages[this.stageIdx]);
      this.style = this.training ? KF.Styles.get('hd') : opts.def ? KF.Styles.get(opts.def.style || 'hd') : KF.Styles.forStage(this.door.id, this.stageIdx, this.def);
      this.hiRes = !!this.style.smooth; engine.fit(this); // smooth styles draw at the screen's resolution
      this.theme = KF.Themes.get(this.def.env || this.style.theme || this.def.theme);
      this.rule = this.training ? { name: 'TRAINING DOJO', rule: null } : KF.Rules.get(this.def);
      this.worldName = this.training ? 'TRAINING DOJO' : opts.def ? opts.def.name : KF.placeName(this.def.env);
      // Ghost of your best-time run on this level, and recordings of every try this visit.
      this.levelId = this.mode === 'realm' ? `${this.door.id}-${this.stageIdx + 1}` : this.mode === 'daily' ? `daily-${this.def.daily}` : null;
      this.ghost = this.levelId && KF.Ghosts.best(this.levelId);
      this.attempts = [];
      KF.Audio.setLowpass(this.style.audio && this.style.audio.lowpass);
      this.deaths = 0;
      this.time = 0;
      this.memory = { seen: {} };
      this.graves = []; // where you died this visit, marked so you remember what got you
      this.fx = new KF.FX();
      this.mood = { cheer: 0 };
      this.debug = engine.debug;
      this.paused = false; this.pauseSel = 0;
      this.deathPulse = 0;
      this.banner = null;
      this.newAttempt();
      this.setPhase(this.style.crashIntro && !opts.quick ? 'crash' : 'intro');
      if (opts.quick) { this.phaseT = 0.9; this.banner = { text: opts.quick, t: 0 }; } // Endless rooms after the first: straight to GO
      A.music(this.def.music || this.door.music);
      KF.HUD.lag = 1;
    }

    setPhase(p) { this.phase = p; this.phaseT = 0; this.cues = {}; }
    cue(name, at) { if (this.phaseT >= at && !this.cues[name]) { this.cues[name] = true; return true; } return false; }
    locationBanner() {
      const part = this.stage.part, name = ((this.def.parts || [])[part - 1] || {}).name || 'NEXT AREA';
      return { text: `${part}/${this.stage.world.partDoors.length + 1}  ${name}`, t: 0 };
    }

    newAttempt() {
      this.stage = new KF.Stage(this.def, this.deaths, this.memory);
      this.layer = KF.Render.bakeStage(this.stage.world, this.theme, this.style.smooth ? this.engine.scale : KF.RES, this.def);
      this.trail = []; this.trailT = 0;
      this.hist = [];
      this.track = new KF.Ghosts.Track(); this.attemptT = 0;
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
      const mode = this.def.camera || this.rule.camera;
      if (mode === 'flip') { // flip-screen, like Trap Adventure 2: whole screens, both ways
        tx = U.clamp(Math.floor(p.centerX / VW) * VW, 0, Math.max(0, w.pixelW - VW));
        const ty = U.clamp(Math.floor((p.y + p.h / 2) / VH) * VH, 0, Math.max(0, w.pixelH - VH));
        c.x = tx; c.y = ty; return;
      }
      if (mode === 'panels') { // comic panels: jump half a screen at a time
        const half = VW / 2;
        tx = U.clamp(Math.floor(p.centerX / half) * half - VW / 4, 0, Math.max(0, w.pixelW - VW));
        if (k < 1) k = Math.min(1, k * 4);
      }
      // Lead a climb or fall while smoothing toward the new height. The next
      // ledge comes into view before the player reaches it.
      const verticalLook = U.clamp(p.vy * 0.16, -28, 40);
      const ty = U.clamp(p.y + p.h / 2 - VH * 0.55 + verticalLook, 0, Math.max(0, w.pixelH - VH));
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
            this.graves.push({ x: e.x, y: U.clamp(e.y, 8, this.stage.world.pixelH - 8) });
            this.trapCard = KF.TrapCards.first(this.stage);
            KF.Ach.event('death');
            if (this.run) this.run.deaths++;
            if (this.graves.length > 40) this.graves.shift();
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
          case 'part':
            this.banner = this.locationBanner(); A.sfx('confirm');
            if (this.def.doorLinks) {
              this.updateCamera(1);
              this.cam.prevX = this.cam.x; this.cam.prevY = this.cam.y;
            }
            break;
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
      if (this.def.parts) this.banner = this.locationBanner();
    }

    update(dt) {
      const input = this.engine.input;
      this.debug = this.engine.debug;
      const click = KF.UI.clicked(this);
      this.tap = input.clicked && !click; // a click on the world itself: "continue" in cards
      if ((input.pause || click === 'pause') && !['win', 'over', 'replay'].includes(this.phase)) {
        this.paused = !this.paused; this.pauseSel = 0; A.sfx('pause');
      }
      if (this.paused) return this.updatePause(input);
      if (this.run && this.phase !== 'win') this.run.t += dt;
      if (this.endless && ['play', 'hitstop', 'ko'].includes(this.phase)) {
        this.endless.timeLeft -= dt;
        if (this.endless.timeLeft <= 0) { this.endless.timeLeft = 0; this.endlessOver(); }
      }

      this.fx.update(dt);
      this.mood.cheer = Math.max(0, this.mood.cheer - dt * 0.6);
      this.deathPulse = Math.max(0, this.deathPulse - dt * 3);
      this.spawnFlash = Math.max(0, this.spawnFlash - dt * 5);
      if (this.banner && (this.banner.t += dt) > 0.9) this.banner = null;
      this.phaseT += dt;
      const p = this.stage.player;

      if (input.wasPressed('KeyR') && (this.phase === 'play' || this.phase === 'ko')) { this.restart(false); return; }

      switch (this.phase) {
        case 'over': // Endless Dojo: the clock ran out
          if (this.phaseT > 0.8 && (input.jumpPressed || input.wasPressed('Enter') || this.tap)) {
            const e = this.engine; e.go(() => KF.Modes.startEndless(e));
          }
          if (this.phaseT > 0.8 && input.back) { const e = this.engine; e.go(() => new KF.ModesScene(e)); }
          return;
        case 'replay': { // every try at once, Super Meat Boy style; the camera follows the winning try
          const win = this.attempts[this.attempts.length - 1], g = win.at(Math.min(this.phaseT, win.length - 0.02));
          if (g) {
            const c = this.cam, w = this.stage.world, k = 1 - Math.pow(0.0008, dt);
            c.prevX = c.x; c.prevY = c.y;
            c.x += (U.clamp(g.x - VW / 2, 0, Math.max(0, w.pixelW - VW)) - c.x) * k;
            c.y += (U.clamp(g.y - 11 - VH * 0.55, 0, Math.max(0, w.pixelH - VH)) - c.y) * k;
          }
        }
          if (this.phaseT > this.replayLen + 1 || (this.phaseT > 0.4 && (input.jumpPressed || input.wasPressed('Enter') || this.tap))) { this.setPhase('win'); this.phaseT = 1.3; this.replayed = true; }
          return;
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
          if (this.phaseT >= 1.05) {
            this.phase = 'play';
            if (this.def.parts) this.banner = this.locationBanner();
          }
          break;
        case 'play':
          this.time += dt;
          const controls = { left: input.left, right: input.right, jumpHeld: input.jumpHeld, jumpPressed: input.jumpPressed,
            shoot: input.isDown('KeyF', 'KeyV') || input.wasPressed('KeyF', 'KeyV') || (input.clicked && !click),
            melee: input.isDown('KeyJ', 'KeyZ', 'KeyK', 'KeyX') || input.wasPressed('KeyJ', 'KeyZ', 'KeyK', 'KeyX') || input.rclicked,
            block: input.isDown('KeyS', 'ArrowDown') };
          if (input.clicked && !click && input.mouse.seen) { controls.aimX = input.mouse.x + this.cam.x; controls.aimY = input.mouse.y + this.cam.y; }
          this.stage.step(dt, controls);
          this.attemptT += dt;
          this.track.push(dt, p);
          // Stand still too long and the narrator gets bored.
          if (p.reversed && !this.wasReversed) A.sfx('reverse');
          this.wasReversed = p.reversed;
          this.handleEvents();
          this.updateTrail(dt);
          if (this.rule.rewind) { // the tape keeps the last second and a bit, for the rewind on death
            this.hist.push({ x: p.x, y: p.y, state: p.state, stateT: p.stateT, facing: p.facing, flip: p.gravDir < 0 });
            if (this.hist.length > 150) this.hist.shift();
          }
          if (this.stage.state === 'dead') { this.track.end = 'dead'; this.attempts.push(this.track); this.setPhase('hitstop'); }
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
          if (this.phaseT > (this.trapCard ? 2.4 : 0.85) || (this.phaseT > 0.3 && (input.jumpPressed || input.wasPressed('Enter') || this.tap))) { this.trapCard = null; this.restart(false); }
          break;
        case 'win':
          p.stateT += dt;
          this.stage.step(dt, { left: false, right: false, jumpHeld: false, jumpPressed: false });
          if (this.endless) { if (this.phaseT > 0.7) this.next(); break; }
          if (this.phaseT > 1.2 && this.attempts.length > 1 && (input.wasPressed('KeyV') || KF.UI.clicked(this) === 'replay')) { this.startReplay(); break; }
          if (this.phaseT > 1.2 && this.mode === 'daily' && input.wasPressed('KeyC')) this.copyDaily();
          if (this.cue('banner', 0.45)) { if (!KF.Present.has(this.style.id, 'win')) A.sfx(this.deaths === 0 ? 'perfect' : 'confirm'); this.fx.shake(4, 0.2); }
          if (this.phaseT > 1.2 && (input.jumpPressed || input.wasPressed('Enter', 'Space') || this.tap)) this.next();
          else if (this.phaseT > (this.attempts.length > 1 && !this.replayed ? 8 : 5)) this.next();
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
      this.track.end = 'won'; this.attempts.push(this.track);
      this.coins = this.mode === 'realm' ? KF.Save.completeNode(this.door.id, KF.Path.nodeOfStage(this.stageIdx), { deaths: this.deaths, time: this.time }) : 0;
      if (this.mode === 'realm' && this.def.combat && this.stage.combat.cleared) { this.coins += KF.Save.completeNode(this.door.id, KF.Path.boss); KF.Ach.event('bossWin', { roundsLost: 0, realm: this.doorIdx }); }
      // Your best single run on this level becomes its ghost.
      const beatGhost = !!(this.ghost && this.attemptT < this.ghost.time);
      this.newGhost = this.levelId && KF.Ghosts.saveBest(this.levelId, this.attemptT, this.track);
      if (this.mode === 'realm') KF.Ach.event('levelWin', { deaths: this.deaths, beatGhost });
      if (this.run) this.run.splits.push({ node: KF.Path.nodeOfStage(this.stageIdx), t: this.run.t });
      if (this.mode === 'daily') {
        const d = KF.Save.data, k = String(this.def.daily);
        d.daily = d.daily || {};
        const prev = d.daily[k];
        if (!prev || this.deaths < prev.deaths || (this.deaths === prev.deaths && this.time < prev.time)) d.daily[k] = { deaths: this.deaths, time: this.time };
        KF.Save.write();
        KF.Ach.event('daily');
      }
      if (this.endless) {
        const E = this.endless;
        E.room++; E.cleared++; E.deaths += this.deaths;
        const bonus = Math.round(8 + this.def.chunks.length * 2);
        E.timeLeft += bonus; E.lastBonus = bonus;
        KF.Ach.event('endless', { room: E.room + 1 });
      }
    }

    // The Endless Dojo clock ran out: record the run and show the score.
    endlessOver() {
      const E = this.endless, d = KF.Save.data;
      d.endless = d.endless || { best: 0 };
      E.newBest = E.cleared > d.endless.best;
      if (E.newBest) d.endless.best = E.cleared;
      KF.Save.write();
      this.stage.state = 'over';
      this.setPhase('over');
      A.sfx('lose');
    }

    startReplay() {
      this.setPhase('replay');
      this.replayLen = Math.max(...this.attempts.map((a) => a.length));
      KF.Ach.event('replay');
      A.sfx('confirm');
    }

    // The Daily Troll result, copied as text to share.
    shareText() {
      const d = this.def.daily + 1, b = (KF.Save.data.daily || {})[String(this.def.daily)];
      return `KUNG FOOLED DAILY TROLL #${d}\n${this.deaths} deaths, ${this.time.toFixed(1)}s` + (b ? `\nmy best: ${b.deaths} deaths, ${b.time.toFixed(1)}s` : '');
    }
    copyDaily() {
      const text = this.shareText();
      try { navigator.clipboard.writeText(text).then(() => { this.copied = 'COPIED!'; }, () => { this.copied = 'COPY FAILED'; }); } catch (e) { this.copied = 'COPY FAILED'; }
      A.sfx('confirm');
    }

    // After a stage: the realm's next street fighter, or its boss after stage 5.
    next() {
      const e = this.engine, r = this.doorIdx, s = this.stageIdx, run = this.run;
      if (this.training) { e.go(() => new KF.MapScene(e)); return; }
      if (this.endless) { const E = this.endless; e.go(() => new KF.PlayScene(e, { mode: 'endless', endless: E, def: KF.Modes.endlessRoom(E.seed, E.room), quick: `ROOM ${E.room + 1}  +${E.lastBonus}S` })); return; }
      if (this.mode === 'daily') { e.go(() => new KF.ModesScene(e)); return; }
      if (this.mode === 'custom') { e.go(this.opts.back || (() => new KF.ModesScene(e))); return; }
      if (this.def.combat) { const run = this.run; e.go(() => run ? new KF.RunResultScene(e, run) : new KF.MapScene(e, { cleared: r })); return; }
      const style = this.style.id;
      const env = this.def.env;
      // Path: level, level, street fight, level, level, boss.
      if (s === this.door.stages.length - 1) e.go(() => new KF.FightScene(e, { mode: 'boss', realm: r, node: KF.Path.boss, def: KF.Roster.bossDef(r), style, env, run }));
      else if (s === 1) e.go(() => new KF.FightScene(e, { mode: 'street', realm: r, node: KF.Path.street, def: KF.Roster.streetDef(r, 0), style, env, run }));
      else e.go(() => new KF.PlayScene(e, { door: r, stage: s + 1, run }));
    }

    updatePause(input) {
      const pick = KF.UI.menuInput(this, input, 3, 'pauseSel');
      if (pick < 0) return;
      A.sfx('confirm');
      this.paused = false;
      if (pick === 1) { this.deaths = 0; this.time = 0; this.memory = { seen: {} }; this.graves = []; this.newAttempt(); this.setPhase('intro'); }
      if (pick === 2) {
        const r = this.doorIdx, e = this.engine;
        if (this.mode === 'custom') e.go(this.opts.back || (() => new KF.ModesScene(e)));
        else if (this.mode === 'endless' || this.mode === 'daily') e.go(() => new KF.ModesScene(e));
        else e.go(() => (this.training ? new KF.MapScene(e) : new KF.RealmScene(e, r)));
      }
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
      KF.Render.depths(w, st, cam, t);
      if (KF.Scenery) KF.Scenery.draw(w, st, cam, t);
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
      this.renderGraves(w, cam);
      if (this.phase === 'replay') this.renderReplay(w, cam);
      else if (this.ghost && !this.endless && ['play', 'hitstop', 'ko'].includes(this.phase)) {
        const g = this.ghost.track.at(this.attemptT);
        if (g) KF.Ghosts.draw(w, g, cam, 'ghostA', 0.32);
      }
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
      } else if (this.phase !== 'crash' && this.phase !== 'replay') {
        KF.Render.player(w, p, pos, cam, { trail: this.trail, flash: Math.max(glow, this.spawnFlash * 0.8), state: this.phase === 'win' ? 'victory' : null, theme: this.theme });
      }
      KF.Render.water(w, st, cam, t);
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
      if (this.phase !== 'crash') {
        if (st.combat) KF.CombatRender.topHud(ctx, this, st);
        else KF.HUD.draw(ctx, {
          scene: this, worldName: this.run ? `RUN  ${this.worldName}` : this.worldName, remaining: st.remaining,
          time: this.run ? this.run.t : this.endless ? this.endless.timeLeft : this.time, deaths: this.run ? this.run.deaths : this.deaths, deathPulse: this.deathPulse,
          part: st.world.partDoors[0] ? st.part : null, parts: st.world.partDoors.length + 1,
          reversed: p.reversed !== !!st.rule.reverse && this.phase === 'play', flipped: p.gravDir < 0,
        }, t);
      }
      if (st.world.partDoors[0] && this.phase === 'play') {
        const goal = st.world.partDoors[st.part - 1] || st.world.door;
        const sx = goal.x + 8 - cam.x, sy = goal.y + 16 - cam.y;
        if (sx < 18 || sx > VW - 18 || sy < 21 || sy > VH - 18) {
          const arrow = sy < 21 ? '^' : sy > VH - 18 ? 'v' : sx < 18 ? '<' : '>';
          const label = `DOOR ${st.part} ${arrow}`, lx = U.clamp(sx, 34, VW - 34), ly = U.clamp(sy, 23, VH - 16);
          ctx.fillStyle = 'rgba(13,12,27,.82)'; ctx.fillRect(lx - 32, ly - 2, 64, 12);
          F.draw(ctx, label, lx, ly, '#ffe190', 1, 'center', '#000');
        }
      }
      if (st.combat && this.phase === 'play') KF.CombatRender.hud(ctx, st);
      this.renderOverlay(ctx, t);
    }

    // All the tries of this visit at once. Deaths leave their X; the winning try is drawn solid pink.
    renderReplay(w, cam) {
      const t = this.phaseT, n = this.attempts.length;
      this.attempts.forEach((a, i) => {
        const g = a.at(t), win = i === n - 1;
        if (g) KF.Ghosts.draw(w, g, cam, win ? 'ghostB' : 'ghostA', win ? 0.95 : 0.5);
        else if (a.end === 'dead') { const l = a.last(); if (l) F.draw(w, 'X', Math.round(l.x - cam.x), Math.round(l.y - 14 - cam.y), '#ff4a5a', 1, 'center', '#000'); }
      });
    }

    // Earlier deaths this visit: a red X where each one happened. The newest pulses briefly.
    renderGraves(w, cam) {
      const n = this.graves.length;
      if (!n || this.phase === 'crash') return;
      this.graves.forEach((g, i) => {
        const x = Math.round(g.x - cam.x), y = Math.round(g.y - cam.y);
        if (x < -8 || x > VW + 8 || y < -8 || y > VH + 8) return;
        w.globalAlpha = i === n - 1 && this.phase === 'ko' ? 1 : 0.55;
        F.draw(w, 'X', x, y - 3, '#ff4a5a', 1, 'center', '#000');
      });
      w.globalAlpha = 1;
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
      if (this.phase === 'win' && this.phaseT > 0.45 && !this.endless) P.win(ctx, id, this.phaseT - 0.45, { perfect: this.deaths === 0, deaths: this.deaths });
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
          if (pt > 0.25 && !this.training) F.draw(ctx, `${this.door.name}  -  LEVEL ${this.stageIdx + 1} OF ${this.door.stages.length}  -  3 PARTS`, VW / 2, 128, '#b8b0c8', 1, 'center', '#000');
        }
      }
      if (this.style.compose || KF.Present.onTop(this.style.id)) this.renderCards(ctx, t);
      if (this.banner && this.phase === 'play') {
        const bt = this.banner.t;
        ctx.save(); ctx.globalAlpha = bt > 0.6 ? (0.9 - bt) / 0.3 : 1;
        ctx.fillStyle = 'rgba(8,4,16,0.85)'; ctx.fillRect(VW / 2 - 38, 22, 76, 15);
        F.draw(ctx, this.banner.text, VW / 2, 26, '#ffd040', 1, 'center', '#000');
        ctx.restore();
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
      if (this.endless && this.phase !== 'over') { // the Endless Dojo clock
        const tl = this.endless.timeLeft, low = tl < 10;
        F.draw(ctx, `${tl.toFixed(1)}S LEFT   ROOM ${this.endless.room + 1}   BEST ${(KF.Save.data.endless || {}).best || 0}`, VW / 2, 17, low && Math.floor(t * 4) % 2 ? '#ff4a5a' : low ? '#ffffff' : '#ffd040', 1, 'center', '#000');
      }
      if (this.phase === 'ko' && this.trapCard && pt > 0.25) { // first time this trap got you
        const c = this.trapCard, k = Math.min(1, (pt - 0.25) * 6);
        ctx.fillStyle = 'rgba(8,4,16,0.85)'; ctx.fillRect(VW / 2 - 110, 130 - 4 * k, 220, 30);
        ctx.fillStyle = '#ffd040'; ctx.fillRect(VW / 2 - 110, 130 - 4 * k, 220, 1);
        F.draw(ctx, `NEW TRAP: ${c.name}`, VW / 2, 133 - 4 * k, '#ffd040', 1, 'center', '#000');
        F.draw(ctx, c.joke, VW / 2, 144 - 4 * k, '#ffffff', 1, 'center', '#000');
      }
      if (this.phase === 'ko' || this.phase === 'hitstop') {
        const kt = this.phase === 'ko' ? pt : 0;
        if (kt > 0.35 && Math.floor(t * 3) % 2) F.draw(ctx, 'JUMP: AGAIN', VW / 2, 162, '#ffffff', 1, 'center', '#000');
      }
      if (this.phase === 'over') {
        const E = this.endless, k = Math.min(1, pt * 5);
        ctx.fillStyle = 'rgba(8,4,16,0.8)'; ctx.fillRect(0, 60 * k, VW, 100 * k);
        BT.draw(ctx, 'TIME UP', VW / 2, 82, 4, 'fire', slam(pt));
        if (pt > 0.3) F.draw(ctx, `ROOMS CLEARED ${E.cleared}    DEATHS ${E.deaths + this.deaths}`, VW / 2, 110, '#ffffff', 1, 'center', '#000');
        if (pt > 0.4) F.draw(ctx, E.newBest ? 'NEW BEST!' : `BEST ${(KF.Save.data.endless || {}).best || 0} ROOMS`, VW / 2, 122, E.newBest ? '#ffd040' : '#b8b0c8', 1, 'center', '#000');
        if (pt > 0.8 && Math.floor(t * 3) % 2) F.draw(ctx, 'JUMP: GO AGAIN    ESC: MODES', VW / 2, 142, '#ffd040', 1, 'center', '#000');
        return;
      }
      if (this.phase === 'replay') {
        F.draw(ctx, `ALL ${this.attempts.length} TRIES`, VW / 2, 20, '#ff9ad0', 1, 'center', '#000');
        if (Math.floor(t * 3) % 2) F.draw(ctx, 'JUMP: SKIP', VW / 2, VH - 12, '#ffffff', 1, 'center', '#000');
        return;
      }
      if (this.phase === 'win' && pt > 0.45 && !this.endless) { // the world's win card is drawn by renderCards; stats under it
        const wt = pt - 0.45;
        if (wt > 0.3) {
          ctx.fillStyle = 'rgba(8,4,16,0.72)'; ctx.fillRect(0, 148, VW, 38);
          const sv = this.training ? null : KF.Save.door(this.door.id), best = sv ? sv.best[this.stageIdx] : null;
          const bt = sv && sv.time ? sv.time[this.stageIdx] : undefined, newBest = bt !== undefined && Math.abs(bt - this.time) < 1e-6;
          F.draw(ctx, `TIME ${this.time.toFixed(1)}S` + (newBest ? ' NEW BEST!' : bt !== undefined ? ` (BEST ${bt.toFixed(1)})` : '') + `    DEATHS ${this.deaths}` + (best !== undefined && best !== null ? `    BEST ${best}` : '') + (this.deaths === 0 ? '    PERFECT!' : ''), VW / 2, 152, '#ffffff', 1, 'center', '#000');
          if (this.coins) { KF.HUD.coin(ctx, VW / 2 - 30, 162, t); F.draw(ctx, `+${this.coins} COINS`, VW / 2 - 18, 163, '#ffd040', 1, 'left', '#000'); }
          else if (this.mode === 'daily') F.draw(ctx, this.copied || 'C: COPY RESULT TO SHARE', VW / 2, 163, '#9ad8ff', 1, 'center', '#000');
          if (this.newGhost && this.ghost) F.draw(ctx, 'YOU BEAT YOUR GHOST!', VW / 2, 140, '#38e8ff', 1, 'center', '#000');
          if (this.attempts.length > 1 && pt > 1.2) KF.UI.button(ctx, this, 'replay', VW - 100, 161, 94, 12, `V: REPLAY ${this.attempts.length} TRIES`);
        }
        if (pt > 1.2 && Math.floor(t * 3) % 2) {
          const last = !this.training && this.stageIdx === this.door.stages.length - 1;
          F.draw(ctx, this.training || this.def.combat ? 'JUMP: BACK TO MAP' : this.mode === 'custom' || this.mode === 'daily' ? 'JUMP: CONTINUE' : last ? 'JUMP: FACE THE BOSS!' : this.stageIdx === 1 ? 'JUMP: A CHALLENGER APPROACHES' : 'JUMP: NEXT LEVEL', VW / 2, 175, '#ffd040', 1, 'center', '#000');
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
