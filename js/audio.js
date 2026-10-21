'use strict';
// Every sound is synthesised with Web Audio: chip-style SFX, a formant "announcer" voice,
// and a step sequencer playing one looping arena track per world. M toggles mute.
(function (KF) {
  const A = {
    ctx: null, master: null, sfxBus: null, musicBus: null, noiseBuf: null,
    muted: false, track: null, timer: null,

    init() {
      if (this.ctx) return true;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        this.ctx = new AC();
        this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.8;
        const comp = this.ctx.createDynamicsCompressor();
        // A low-pass on everything lets styles muffle the sound (old TV, silent film...).
        this.tone_ = this.ctx.createBiquadFilter(); this.tone_.type = 'lowpass'; this.tone_.frequency.value = this.toneHz || 22000;
        this.master.connect(this.tone_); this.tone_.connect(comp); comp.connect(this.ctx.destination);
        this.sfxBus = this.ctx.createGain(); this.sfxBus.gain.value = 0.55; this.sfxBus.connect(this.master);
        this.musicBus = this.ctx.createGain(); this.musicBus.gain.value = 0.32; this.musicBus.connect(this.master);
        const len = this.ctx.sampleRate;
        this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        return true;
      } catch (e) { this.ctx = null; return false; }
    },
    // Browsers only allow audio after a user gesture: called on the first key press.
    unlock() {
      if (!this.init()) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();
      if (this.pendingTrack && !this.timer) this.music(this.pendingTrack);
    },
    setMuted(m) {
      this.muted = m;
      if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.02);
    },
    get now() { return this.ctx ? this.ctx.currentTime : 0; },
    setLowpass(hz) { this.toneHz = hz || 22000; if (this.tone_) this.tone_.frequency.setTargetAtTime(this.toneHz, this.ctx.currentTime, 0.05); },

    // ---- primitives ----
    tone({ type = 'square', f0 = 440, f1 = null, dur = 0.1, vol = 0.3, at = 0, attack = 0.005, bus = null, curve = 'exp' }) {
      if (!this.ctx) return;
      const t = this.now + at, o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, t);
      if (f1 !== null) {
        if (curve === 'exp') o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
        else o.frequency.linearRampToValueAtTime(f1, t + dur);
      }
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(bus || this.sfxBus);
      o.start(t); o.stop(t + dur + 0.02);
    },
    noise({ dur = 0.1, vol = 0.3, at = 0, type = 'lowpass', freq = 2000, f1 = null, q = 1, bus = null }) {
      if (!this.ctx) return;
      const t = this.now + at, s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
      s.buffer = this.noiseBuf;
      f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
      if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(bus || this.sfxBus);
      s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
    },
    // Crude formant speech: a buzzy voice through three band-pass "vocal tract" filters.
    // segs: [{ d: seconds, f: [F1, F2, F3], p: pitch Hz, a: amplitude, n: consonant noise }]
    voice(segs, at = 0, gain = 0.9, bus = null) {
      if (!this.ctx) return;
      const c = this.ctx, t0 = this.now + at;
      const src = c.createOscillator(); src.type = 'sawtooth';
      const vg = c.createGain(); vg.gain.value = 0;
      const out = c.createGain(); out.gain.value = gain; out.connect(bus || this.sfxBus);
      const filters = [0, 1, 2].map((i) => { const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = [7, 11, 13][i]; const g = c.createGain(); g.gain.value = [1, 0.7, 0.35][i]; vg.connect(f); f.connect(g); g.connect(out); return f; });
      src.connect(vg);
      let t = t0;
      src.frequency.setValueAtTime(segs[0].p || 110, t);
      for (const s of segs) {
        filters.forEach((f, i) => f.frequency.linearRampToValueAtTime(s.f[i], t + Math.min(0.04, s.d)));
        src.frequency.linearRampToValueAtTime(s.p || 110, t + s.d);
        vg.gain.linearRampToValueAtTime((s.a ?? 1) * 0.9, t + Math.min(0.03, s.d));
        if (s.n) this.noise({ dur: s.d, vol: s.n, at: t - this.now, type: 'bandpass', freq: s.nf || 3000, q: 1.5, bus });
        t += s.d;
      }
      vg.gain.linearRampToValueAtTime(0, t + 0.06);
      src.start(t0); src.stop(t + 0.1);
    },

    // ---- named sound effects ----
    sfx(name, opt = {}) {
      if (!this.ctx || this.muted) return;
      switch (name) {
        case 'jump': this.tone({ type: 'square', f0: 260, f1: 620, dur: 0.11, vol: 0.16 }); break;
        case 'land': this.noise({ dur: 0.08, vol: 0.25 * Math.min(1, (opt.speed || 200) / 300), freq: 600 }); this.tone({ type: 'triangle', f0: 140, f1: 60, dur: 0.08, vol: 0.2 }); break;
        case 'skid': this.noise({ dur: 0.12, vol: 0.1, type: 'bandpass', freq: 3000, q: 2 }); break;
        case 'hit':
          this.noise({ dur: 0.25, vol: 0.6, freq: 3000, f1: 300 });
          this.tone({ type: 'sine', f0: 220, f1: 40, dur: 0.3, vol: 0.6 });
          this.tone({ type: 'square', f0: 110, f1: 55, dur: 0.15, vol: 0.25 });
          break;
        case 'ko': // "K... O!"
          this.tone({ type: 'sawtooth', f0: 90, f1: 40, dur: 0.6, vol: 0.25 });
          this.voice([
            { d: 0.05, f: [400, 1800, 2600], p: 120, a: 0, n: 0.5, nf: 2500 },
            { d: 0.16, f: [650, 1750, 2500], p: 132 }, { d: 0.1, f: [430, 2100, 2700], p: 126 },
            { d: 0.06, f: [400, 1200, 2400], p: 120, a: 0.4 },
            { d: 0.38, f: [480, 860, 2400], p: 112 }, { d: 0.2, f: [380, 720, 2300], p: 88 },
          ], 0.05);
          break;
        case 'round': // "ROUND"
          this.voice([
            { d: 0.08, f: [350, 1100, 1500], p: 110, a: 0.6 }, { d: 0.2, f: [680, 1080, 2500], p: 118 },
            { d: 0.1, f: [420, 900, 2400], p: 108 }, { d: 0.16, f: [300, 1600, 2500], p: 96, a: 0.5 },
          ]);
          this.tone({ type: 'square', f0: 660, dur: 0.12, vol: 0.12, at: 0.62 }); this.tone({ type: 'square', f0: 990, dur: 0.18, vol: 0.12, at: 0.72 });
          break;
        case 'go': // "GO!"
          this.voice([{ d: 0.05, f: [300, 900, 2300], p: 130, a: 0.3, n: 0.2, nf: 900 }, { d: 0.32, f: [520, 900, 2400], p: 160 }, { d: 0.18, f: [420, 760, 2300], p: 175 }]);
          this.noise({ dur: 0.3, vol: 0.2, freq: 5000, f1: 800 });
          break;
        case 'perfect':
          this.voice([
            { d: 0.04, f: [300, 1000, 2400], p: 120, a: 0, n: 0.35, nf: 1200 }, { d: 0.14, f: [500, 1400, 1700], p: 125 },
            { d: 0.08, f: [400, 1300, 1700], p: 120, a: 0.2, n: 0.25, nf: 4500 }, { d: 0.18, f: [560, 1850, 2500], p: 140 },
            { d: 0.06, f: [400, 1800, 2500], p: 130, a: 0, n: 0.4, nf: 3500 },
          ]);
          break;
        case 'win': {
          const notes = [523, 659, 784, 1047, 784, 1047, 1319];
          notes.forEach((f, i) => this.tone({ type: 'square', f0: f, dur: i === notes.length - 1 ? 0.5 : 0.12, vol: 0.14, at: i * 0.09 }));
          [262, 392, 523].forEach((f, i) => this.tone({ type: 'triangle', f0: f, dur: 0.3, vol: 0.25, at: i * 0.2 }));
          break;
        }
        case 'crumble': this.noise({ dur: 0.45, vol: 0.4, freq: 900, f1: 120 }); this.tone({ type: 'triangle', f0: 90, f1: 40, dur: 0.4, vol: 0.25 }); break;
        case 'spikes': this.tone({ type: 'square', f0: 1800, f1: 900, dur: 0.06, vol: 0.12 }); this.noise({ dur: 0.08, vol: 0.25, type: 'highpass', freq: 4000 }); break;
        case 'rumble': this.noise({ dur: 0.3, vol: 0.25, freq: 300 }); break;
        case 'slam': this.tone({ type: 'sine', f0: 150, f1: 35, dur: 0.35, vol: 0.7 }); this.noise({ dur: 0.2, vol: 0.4, freq: 1500, f1: 200 }); break;
        case 'spring': this.tone({ type: 'sine', f0: 180, f1: 900, dur: 0.25, vol: 0.35 }); this.tone({ type: 'square', f0: 360, f1: 1200, dur: 0.15, vol: 0.08, at: 0.02 }); break;
        case 'whoosh': this.noise({ dur: 0.25, vol: 0.18, type: 'bandpass', freq: 800, f1: 3000, q: 2 }); break;
        case 'doorrun': this.noise({ dur: 0.3, vol: 0.2, type: 'bandpass', freq: 600, f1: 2400, q: 3 }); [880, 1100, 1320].forEach((f, i) => this.tone({ type: 'square', f0: f, dur: 0.05, vol: 0.08, at: i * 0.05 })); break;
        case 'punch': this.tone({ type: 'square', f0: 300, f1: 80, dur: 0.12, vol: 0.3 }); this.noise({ dur: 0.1, vol: 0.4, freq: 2000 }); break;
        case 'gravity': this.tone({ type: 'sine', f0: opt.g < 0 ? 200 : 800, f1: opt.g < 0 ? 800 : 200, dur: 0.3, vol: 0.25 }); break;
        case 'reverse': this.tone({ type: 'square', f0: 500, f1: 300, dur: 0.15, vol: 0.08 }); this.tone({ type: 'square', f0: 300, f1: 500, dur: 0.15, vol: 0.08, at: 0.15 }); break;
        case 'bonk': this.tone({ type: 'square', f0: 220, f1: 180, dur: 0.1, vol: 0.2 }); break;
        case 'say': this.tone({ type: 'square', f0: 700, dur: 0.04, vol: 0.06 }); this.tone({ type: 'square', f0: 520, dur: 0.05, vol: 0.06, at: 0.05 }); break;
        case 'select': this.tone({ type: 'square', f0: 880, dur: 0.05, vol: 0.1 }); break;
        case 'confirm': this.tone({ type: 'square', f0: 660, dur: 0.06, vol: 0.12 }); this.tone({ type: 'square', f0: 1320, dur: 0.1, vol: 0.12, at: 0.06 }); break;
        case 'punch': this.noise({ dur: 0.07, vol: 0.45, freq: 2500, f1: 600 }); this.tone({ type: 'square', f0: 220, f1: 90, dur: 0.07, vol: 0.18 }); break;
        case 'heavy': this.noise({ dur: 0.14, vol: 0.6, freq: 1800, f1: 200 }); this.tone({ type: 'sine', f0: 160, f1: 45, dur: 0.18, vol: 0.55 }); break;
        case 'block': this.tone({ type: 'square', f0: 1200, f1: 700, dur: 0.05, vol: 0.12 }); this.noise({ dur: 0.05, vol: 0.2, type: 'highpass', freq: 3000 }); break;
        case 'wave': this.tone({ type: 'sawtooth', f0: 200, f1: 900, dur: 0.25, vol: 0.16 }); this.noise({ dur: 0.3, vol: 0.2, type: 'bandpass', freq: 1500, f1: 4000, q: 2 }); break;
        case 'special': this.tone({ type: 'square', f0: 400, f1: 1200, dur: 0.12, vol: 0.1 }); break;
        case 'lose': [392, 349, 311, 262].forEach((f, i) => this.tone({ type: 'triangle', f0: f, dur: 0.25, vol: 0.25, at: i * 0.18 })); break;
        case 'buy': [784, 988, 1319].forEach((f, i) => this.tone({ type: 'square', f0: f, dur: 0.08, vol: 0.12, at: i * 0.06 })); break;
        case 'blip': this.tone({ type: 'square', f0: 420 + Math.random() * 160, dur: 0.03, vol: 0.05 }); break;
        case 'pause': this.tone({ type: 'triangle', f0: 440, f1: 220, dur: 0.12, vol: 0.2 }); break;
      }
    },

    // ---- music ----
    music(id) {
      this.pendingTrack = id;
      if (!this.ctx) return;
      if (this.track && this.track.id === id && this.timer) return;
      this.stopMusic();
      const def = KF.Music[id];
      if (!def) return;
      this.track = { id, def, step: 0, next: this.now + 0.08, parts: compile(def) };
      this.timer = setInterval(() => this.schedule(), 25);
    },
    stopMusic() { if (this.timer) clearInterval(this.timer); this.timer = null; this.track = null; },
    schedule() {
      const tr = this.track;
      if (!tr || !this.ctx) return;
      const stepDur = 60 / tr.def.bpm / 4;
      while (tr.next < this.now + 0.12) {
        const at = tr.next - this.now;
        for (const p of tr.parts) {
          const ev = p.events[tr.step % p.events.length];
          if (!ev) continue;
          if (p.drum) this.drum(ev, at);
          else this.tone({ type: p.wave, f0: ev.f, dur: ev.len * stepDur * 0.95, vol: p.vol, at, attack: 0.004, bus: this.musicBus });
        }
        tr.step++; tr.next += stepDur;
      }
    },
    drum(k, at) {
      const b = this.musicBus;
      if (k.includes('k')) this.tone({ type: 'sine', f0: 150, f1: 40, dur: 0.14, vol: 0.9, at, bus: b });
      if (k.includes('s')) { this.noise({ dur: 0.12, vol: 0.45, at, type: 'bandpass', freq: 1800, q: 0.8, bus: b }); this.tone({ type: 'triangle', f0: 220, f1: 120, dur: 0.08, vol: 0.3, at, bus: b }); }
      if (k.includes('h')) this.noise({ dur: 0.03, vol: 0.18, at, type: 'highpass', freq: 7000, bus: b });
      if (k.includes('o')) this.noise({ dur: 0.12, vol: 0.14, at, type: 'highpass', freq: 6000, bus: b });
    },
  };

  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function freq(tok) {
    const m = /^([A-G])(#|b)?(-?\d)$/.exec(tok);
    if (!m) return null;
    const n = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (parseInt(m[3], 10) + 1) * 12;
    return 440 * Math.pow(2, (n - 69) / 12);
  }
  // Parse "A3 - . C4" style lines: note, '-' holds the previous note, '.' rest.
  function compile(def) {
    return def.parts.map((p) => {
      const toks = p.seq.trim().split(/\s+/);
      const events = new Array(toks.length).fill(null);
      if (p.drum) { toks.forEach((t, i) => { if (t !== '.') events[i] = t; }); return { drum: true, events }; }
      let last = -1;
      toks.forEach((t, i) => {
        if (t === '-') { if (last >= 0) events[last].len++; return; }
        if (t === '.') { last = -1; return; }
        events[i] = { f: freq(t), len: 1 }; last = i;
      });
      return { wave: p.wave, vol: p.vol, events };
    });
  }

  // ---- world sound library ----
  // Longer, more "real" sounds for each world's moments: a sitcom laugh track and applause, a
  // silent-film piano, a gong, a sad muted trumpet, chip jingles on pulse waves, a PC speaker...
  // A.fx(name) plays one. Death stingers go through their own gain so a new one fades the last.
  const rnd = (a, b) => a + Math.random() * (b - a);
  const FX_LEVEL = {
    deathPC: 4, deathPencil: 5, deathRadio: 3.5, deathPhone: 3, deathCandle: 3, deathMusicBox: 2.5, deathVector: 2.5,
    deathMonitor: 2, deathError: 2.5, deathSax: 2.2, deathHorn: 2, deathCloth: 2.2, deathCarnival: 1.6, deathVapor: 2,
    deathDream: 1.8, deathTea: 1.6, deathShamisen: 1.8, deathBlocks: 1.8, deathAlarm: 2, deathGB: 2, deathNES: 1.5,
    deathCartoon: 1.6, deathIce: 1.5, deathStone: 1.5, deathSilent: 0.6, deathGong: 0.7,
    goPC: 3, goChip: 3, goSax: 4, goPhone: 2.5, goWhistle: 2, goHorn: 2.5, goChime: 2, goBell: 1.4,
    winPiano: 0.45, winPC: 3, winChip: 2.2, winSax: 4, winHorn: 2.2, winBrass: 2.5, winShatter: 2, winMusicBox: 1.8, winVapor: 1.6, winGlitch: 1.5, winKoto: 1.2,
    jumpPulse: 2.5, jumpPC: 3, jumpSoft: 3, jumpGlass: 3, jumpCartoon: 1.6, landSoft: 4, landPC: 3,
  };
  const NT = (n) => 440 * Math.pow(2, (n - 69) / 12); // MIDI note -> Hz
  Object.assign(A, {
    bufs: {},
    waves: {},
    // Pulse wave with a duty cycle (Game Boy / NES voices).
    pulse(duty) {
      const k = 'p' + duty;
      if (this.waves[k]) return this.waves[k];
      const N = 48, re = new Float32Array(N), im = new Float32Array(N);
      for (let n = 1; n < N; n++) im[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
      return (this.waves[k] = this.ctx.createPeriodicWave(re, im));
    },
    // General oscillator note. o: { type|wave, f, f1, at, dur, vol, attack, bus, vib: [rate, depth], filter: { type, f, f1, q }, detune }
    note(o) {
      if (!this.ctx) return null;
      const c = this.ctx, t = this.now + (o.at || 0), dur = o.dur || 0.2;
      const osc = c.createOscillator(), g = c.createGain();
      if (o.wave) osc.setPeriodicWave(o.wave); else osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(o.f, t);
      if (o.f1) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t + (o.glide || dur));
      if (o.detune) osc.detune.value = o.detune;
      if (o.vib) {
        const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = o.vib[0]; lg.gain.value = o.vib[1];
        l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + dur + 0.1);
      }
      const att = o.attack ?? 0.005, vol = o.vol ?? 0.2;
      g.gain.setValueAtTime(0.0001, t);
      if (o.flat) { g.gain.setValueAtTime(vol, t); g.gain.setValueAtTime(vol, t + dur - 0.004); g.gain.linearRampToValueAtTime(0, t + dur); }
      else { g.gain.linearRampToValueAtTime(vol, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
      let head = osc;
      if (o.filter) {
        const f = c.createBiquadFilter(); f.type = o.filter.type || 'lowpass'; f.Q.value = o.filter.q || 1;
        f.frequency.setValueAtTime(o.filter.f, t);
        if (o.filter.f1) f.frequency.exponentialRampToValueAtTime(o.filter.f1, t + (o.filter.dur || dur));
        if (o.filter.wah) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = o.filter.wah[0]; lg.gain.value = o.filter.wah[1]; l.connect(lg); lg.connect(f.frequency); l.start(t); l.stop(t + dur + 0.1); }
        osc.connect(f); head = f;
      }
      head.connect(g); g.connect(o.bus || this.sfxBus);
      osc.start(t); osc.stop(t + dur + 0.05);
      return g;
    },
    // Play a mono buffer.
    play(buf, o = {}) {
      if (!this.ctx) return;
      const c = this.ctx, t = this.now + (o.at || 0), src = c.createBufferSource(), g = c.createGain();
      src.buffer = buf; src.playbackRate.value = o.rate || 1; g.gain.value = o.vol ?? 0.5;
      let head = src;
      if (o.filter) { const f = c.createBiquadFilter(); f.type = o.filter.type || 'lowpass'; f.frequency.value = o.filter.f; f.Q.value = o.filter.q || 0.7; src.connect(f); head = f; }
      head.connect(g); g.connect(o.bus || this.sfxBus); src.start(t);
    },
    // Build (and cache) a buffer by filling samples: fill(data, sampleRate).
    buffer(key, secs, fill, cache = true) {
      if (cache && this.bufs[key]) return this.bufs[key];
      const sr = this.ctx.sampleRate, b = this.ctx.createBuffer(1, Math.ceil(secs * sr), sr);
      fill(b.getChannelData(0), sr);
      if (cache) this.bufs[key] = b;
      return b;
    },
    // A gain node on the sfx bus for one stinger; starting another fades the previous one out.
    stinger(vol = 1) {
      const c = this.ctx, g = c.createGain(); g.gain.value = vol; g.connect(this.sfxBus);
      if (this.lastSting) { try { this.lastSting.gain.setTargetAtTime(0, c.currentTime, 0.08); } catch (e) { /* gone */ } }
      this.lastSting = g;
      return g;
    },

    // ---- building blocks ----
    // Sitcom laugh track: a crowd of formant "ha-ha-ha" voices at jittered pitches and times, over a breathy murmur.
    laugh(bus, at = 0, dur = 2.2, n = 11) {
      const vowels = [[820, 1220, 2600], [700, 1150, 2500], [600, 1700, 2600], [760, 1350, 2700]];
      for (let v = 0; v < n; v++) {
        const female = Math.random() < 0.45, base = female ? rnd(230, 330) : rnd(120, 190);
        const vw = vowels[Math.floor(Math.random() * vowels.length)], segs = [];
        const count = 4 + Math.floor(Math.random() * 5), start = rnd(0, 0.45);
        for (let k = 0; k < count; k++) {
          const p = base * (1.12 - k * 0.035) * rnd(0.96, 1.04), d = rnd(0.075, 0.11);
          segs.push({ d: 0.03, f: vw, p, a: 0.05, n: 0.18, nf: 1600 }); // the "h"
          segs.push({ d, f: vw.map((x) => x * rnd(0.95, 1.05)), p: p * 1.03, a: 0.9 - k * 0.07 });
          segs.push({ d: rnd(0.03, 0.06), f: vw, p: p * 0.92, a: 0 });
        }
        this.voice(segs, at + start, rnd(0.07, 0.12), bus);
      }
      const t = this.now + at, src = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
      src.buffer = this.noiseBuf; src.loop = true; f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.6;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.09, t + 0.3); g.gain.linearRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(bus); src.start(t); src.stop(t + dur + 0.1);
    },
    // Applause: hundreds of single hand-claps (short filtered noise bursts) swelling then dying away.
    applause(bus, at = 0, dur = 2.6, vol = 0.55) {
      const buf = this.buffer('applause' + dur, dur, (d, sr) => {
        let t = 0;
        while (t < dur) {
          const x = t / dur, rate = x < 0.25 ? 20 + x * 400 : 120 * (1 - x) + 8; // claps per second
          t += -Math.log(1 - Math.random()) / rate;
          const i0 = Math.floor(t * sr), len = Math.floor(sr * rnd(0.012, 0.03)), amp = rnd(0.25, 1) * (x < 0.25 ? x * 4 : 1 - (x - 0.25) / 0.75);
          const bright = rnd(0.3, 0.9);
          let lp = 0, prev = 0;
          for (let j = 0; j < len && i0 + j < d.length; j++) {
            const w = Math.random() * 2 - 1;
            lp += (w - lp) * bright; const hp = lp - prev; prev = lp; // band-limited noise
            d[i0 + j] += hp * amp * Math.exp(-j / (len * 0.25)) * 0.6;
          }
        }
      });
      this.play(buf, { at, vol, bus });
    },
    // Rising scream: a formant "aaah" sliding up then cracking down.
    scream(bus, at = 0) {
      this.voice([
        { d: 0.04, f: [700, 1200, 2600], p: 380, a: 0.3, n: 0.2, nf: 2000 },
        { d: 0.18, f: [900, 1400, 2800], p: 620 }, { d: 0.12, f: [950, 1450, 2900], p: 700 },
        { d: 0.12, f: [900, 1350, 2800], p: 660 }, { d: 0.22, f: [850, 1300, 2700], p: 420, a: 0.6 },
      ], at, 0.32, bus);
    },
    // Honky-tonk piano note: two detuned strings and a hammer tick.
    piano(f, at, bus, vol = 0.18, dur = 0.9) {
      this.note({ type: 'triangle', f, at, dur, vol, bus, attack: 0.003 });
      this.note({ type: 'triangle', f: f * 1.006, at, dur: dur * 0.8, vol: vol * 0.7, bus, attack: 0.003 });
      this.note({ type: 'sawtooth', f: f * 2, at, dur: dur * 0.3, vol: vol * 0.25, bus, attack: 0.002, filter: { f: 2500, f1: 600 } });
      this.noise({ dur: 0.015, vol: vol * 0.6, at, type: 'highpass', freq: 2500, bus });
    },
    // Film projector: a 24-per-second clatter over a motor hum.
    projector(bus, at = 0, dur = 1.2) {
      for (let k = 0; k < dur * 24; k++) this.noise({ dur: 0.012, vol: 0.12 * (k % 2 ? 0.6 : 1), at: at + k / 24, type: 'bandpass', freq: 3200, q: 2, bus });
      this.note({ type: 'sawtooth', f: 58, at, dur, vol: 0.08, bus, attack: 0.05, filter: { f: 300 } });
    },
    // Muted trumpet: sawtooth through a "wah" filter that opens then closes.
    trumpet(f, at, dur, bus, vol = 0.22, vib = 0) {
      this.note({ type: 'sawtooth', f, at, dur, vol, bus, attack: 0.03, vib: vib ? [5.5, f * 0.03] : null, filter: { type: 'bandpass', f: 500, f1: 1500, q: 3, dur: dur * 0.4 } });
      this.note({ type: 'square', f: f * 0.5, at, dur, vol: vol * 0.25, bus, attack: 0.03, filter: { f: 700 } });
    },
    // Gong: inharmonic partials with long, staggered decays and a soft strike.
    gong(bus, at = 0, f = 92, vol = 0.32) {
      [[1, 1, 3.2], [1.52, 0.6, 2.6], [2.31, 0.45, 2.0], [2.78, 0.35, 1.6], [3.62, 0.25, 1.2], [4.47, 0.18, 0.9], [5.4, 0.12, 0.7]].forEach(([r, a, d]) => {
        this.note({ type: 'sine', f: f * r, f1: f * r * 0.985, at, dur: d, vol: vol * a, bus, attack: 0.02 });
        this.note({ type: 'sine', f: f * r * 1.004, at, dur: d * 0.9, vol: vol * a * 0.5, bus, attack: 0.03 });
      });
      this.noise({ dur: 0.25, vol: vol * 0.8, at, freq: 900, f1: 200, bus });
    },
    // Woody tock (woodblock, toy blocks, clappers).
    tock(f, at, bus, vol = 0.3) {
      this.note({ type: 'sine', f, f1: f * 0.8, at, dur: 0.09, vol, bus, attack: 0.001 });
      this.noise({ dur: 0.02, vol: vol * 0.7, at, type: 'bandpass', freq: f * 2.2, q: 3, bus });
    },
    // Glass/ice tinkle: random high pings.
    tinkle(bus, at = 0, n = 14, dur = 0.6, lo = 2600, hi = 7000, vol = 0.07) {
      for (let k = 0; k < n; k++) this.note({ type: 'sine', f: rnd(lo, hi), at: at + Math.pow(Math.random(), 1.6) * dur, dur: rnd(0.08, 0.3), vol: vol * rnd(0.5, 1), bus, attack: 0.001 });
    },
    // Karplus-Strong plucked string (shamisen, lute, koto).
    pluck(f, at, bus, vol = 0.35, bright = 0.5, decay = 0.996) {
      const key = 'ks' + Math.round(f) + '_' + bright + '_' + decay;
      const buf = this.buffer(key, 1.4, (d, sr) => {
        const N = Math.max(2, Math.round(sr / f)), ring = new Float32Array(N);
        for (let i = 0; i < N; i++) ring[i] = Math.random() * 2 - 1;
        for (let i = 0, p = 0; i < d.length; i++, p = (p + 1) % N) {
          const nx = (p + 1) % N;
          d[i] = ring[p] * 0.7;
          const avg = 0.5 * (ring[p] + ring[nx]); // the averaging filter dulls the string over time
          ring[p] = decay * (avg * (1 - bright * 0.5) + ring[p] * bright * 0.5);
        }
      });
      this.play(buf, { at, vol, bus });
    },
    // Breathy noise swell (wind, page turns, blow-outs, waves).
    swoosh(bus, at, dur, f0, f1, vol = 0.2, q = 1.2, type = 'bandpass') {
      const c = this.ctx, t = this.now + at, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      src.buffer = this.noiseBuf; src.loop = true; f.type = type; f.Q.value = q;
      f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(bus); src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
    },
    // Bitcrushed stutter: chopped grains of tone and noise, quantised to 4 bits.
    crushed(bus, at = 0, dur = 0.7, vol = 0.35) {
      const buf = this.buffer('crush', dur, (d, sr) => {
        const seg = Math.floor(sr * 0.035);
        let prev = null;
        for (let s = 0; s * seg < d.length; s++) {
          const kind = prev && Math.random() < 0.4 ? 'rep' : Math.random() < 0.5 ? 'tone' : Math.random() < 0.6 ? 'noise' : 'gap';
          const f = rnd(120, 1600), hold = 1 + Math.floor(Math.random() * 6), out = new Float32Array(seg);
          for (let j = 0, h = 0; j < seg; j++) {
            if (j % hold === 0) h = kind === 'tone' ? (Math.sin(2 * Math.PI * f * j / sr) > 0 ? 1 : -1) : kind === 'noise' ? Math.random() * 2 - 1 : 0;
            out[j] = kind === 'rep' ? prev[j] : Math.round(h * 7) / 7;
          }
          const fade = 1 - (s * seg) / d.length;
          for (let j = 0; j < seg && s * seg + j < d.length; j++) d[s * seg + j] = out[j] * fade * 0.8;
          if (kind !== 'rep') prev = out;
        }
      }, false);
      this.play(buf, { at, vol, bus });
    },
    // Feedback echo send (vaporwave reverb tails, dream).
    echo(time = 0.32, fb = 0.45, wet = 0.5) {
      const c = this.ctx, inp = c.createGain(), d = c.createDelay(1), f = c.createGain(), w = c.createGain(), lp = c.createBiquadFilter();
      d.delayTime.value = time; f.gain.value = fb; w.gain.value = wet; lp.type = 'lowpass'; lp.frequency.value = 2200;
      inp.connect(this.sfxBus); inp.connect(d); d.connect(lp); lp.connect(f); f.connect(d); lp.connect(w); w.connect(this.sfxBus);
      setTimeout(() => { try { inp.disconnect(); } catch (e) { /* ok */ } }, 6000);
      return inp;
    },

    // ---- the named world sounds ----
    // Each sound has a level so they sit at about the same loudness as the arcade hit + K.O.
    fx(name, opt = {}) {
      if (!this.ctx || this.muted) return;
      const lv = FX_LEVEL[name] || 1, bus = this.sfxBus;
      if (lv !== 1) { const g = this.ctx.createGain(); g.gain.value = lv; g.connect(bus); this.sfxBus = g; }
      try { this.fx_(name, opt); } finally { this.sfxBus = bus; }
    },
    fx_(name, opt) {
      const B = (v) => this.stinger(v), S = this.sfxBus;
      const thud = (b, at = 0, v = 0.45) => { this.note({ type: 'sine', f: 140, f1: 45, at, dur: 0.22, vol: v, bus: b, attack: 0.002 }); this.noise({ dur: 0.12, vol: v * 0.7, at, freq: 1200, f1: 200, bus: b }); };
      switch (name) {
        // -- deaths --
        case 'deathSitcom': { const b = B(1); thud(b); this.scream(b, 0.02); this.laugh(b, 0.42, 2.4); this.applause(b, 0.75, 2.6, 0.45); break; }
        case 'deathSilent': { // projector rattle + melodrama tremolo on a diminished chord, then a low thump
          const b = B(1); thud(b, 0, 0.3); this.projector(b, 0, 1.4);
          for (let k = 0; k < 14; k++) [62, 65, 68, 71].forEach((n) => this.piano(NT(n + (k > 9 ? -12 : 0)), 0.05 + k * 0.065, b, 0.05 * (1 - k / 16), 0.25));
          this.piano(NT(38), 0.98, b, 0.3, 1.4); this.piano(NT(50), 0.98, b, 0.2, 1.2); break;
        }
        case 'deathCartoon': { const b = B(1); thud(b); this.note({ type: 'sine', f: 1700, f1: 260, at: 0.05, dur: 0.75, vol: 0.2, bus: b, vib: [7, 30] }); this.tock(520, 0.82, b, 0.35); this.tock(390, 0.92, b, 0.3); break; }
        case 'deathGB': { // falling pulse arpeggio, then a low blip
          const b = B(1), w = this.pulse(0.25), w2 = this.pulse(0.125);
          [83, 82, 81, 80, 79, 78, 77, 76].forEach((n, i) => this.note({ wave: w, f: NT(n), at: i * 0.045, dur: 0.045, vol: 0.12, bus: b, flat: true }));
          [72, 67, 64, 60].forEach((n, i) => this.note({ wave: w2, f: NT(n), at: 0.42 + i * 0.13, dur: 0.12, vol: 0.13, bus: b, flat: true }));
          this.note({ type: 'triangle', f: NT(36), at: 0.94, dur: 0.35, vol: 0.3, bus: b, flat: true }); break;
        }
        case 'deathNES': {
          const b = B(1), w = this.pulse(0.5);
          [76, 79, 84, 0, 71, 67, 64, 59].forEach((n, i) => n && this.note({ wave: w, f: NT(n), at: i * 0.09, dur: 0.085, vol: 0.12, bus: b, flat: true }));
          [52, 47, 43, 40].forEach((n, i) => this.note({ type: 'triangle', f: NT(n), at: 0.4 + i * 0.12, dur: 0.11, vol: 0.32, bus: b, flat: true }));
          for (let k = 0; k < 4; k++) this.noise({ dur: 0.05, vol: 0.25 - k * 0.05, at: 0.9 + k * 0.08, freq: 1800 - k * 300, bus: b }); break;
        }
        case 'deathVHS': { // stop clunk, then the tape rewinding with a warble
          const b = B(1); this.note({ type: 'sine', f: 75, f1: 40, dur: 0.14, vol: 0.5, bus: b, attack: 0.001 }); this.noise({ dur: 0.04, vol: 0.45, type: 'highpass', freq: 2500, bus: b }); this.tock(260, 0.08, b, 0.25);
          this.note({ type: 'sawtooth', f: 180, f1: 2200, at: 0.22, dur: 0.7, glide: 0.65, vol: 0.09, bus: b, vib: [9, 40], filter: { f: 1600 } });
          this.swoosh(b, 0.2, 0.75, 600, 4000, 0.12); break;
        }
        case 'deathPC': { const b = B(1); [880, 660, 440, 220].forEach((f, i) => this.note({ type: 'square', f, at: i * 0.12, dur: i === 3 ? 0.4 : 0.1, vol: 0.1, bus: b, flat: true })); break; }
        case 'deathGlitch': { const b = B(1); thud(b, 0, 0.3); this.crushed(b, 0.02, 0.8, 0.4); break; }
        case 'deathVapor': { // slowed, detuned electric piano chord melting down, with an echo tail
          const e = this.echo(0.38, 0.5, 0.55), b = B(1); b.disconnect(); b.connect(e);
          [[60, 64, 67, 71], [57, 60, 64, 67]].forEach((ch, k) => ch.forEach((n) => {
            this.note({ type: 'sine', f: NT(n - 12), f1: NT(n - 12) * 0.94, at: k * 0.45, dur: 0.9, vol: 0.09, bus: b, vib: [4, 2], attack: 0.02 });
            this.note({ type: 'sine', f: NT(n), f1: NT(n) * 0.94, at: k * 0.45, dur: 0.5, vol: 0.03, bus: b, attack: 0.01 });
          })); break;
        }
        case 'deathCarnival': { // calliope "wah wah wah waaah" + boing
          const b = B(1);
          [72, 71, 70, 69].forEach((n, i) => { const d = i === 3 ? 0.8 : 0.28; this.note({ type: 'square', f: NT(n), at: i * 0.3, dur: d, vol: 0.06, bus: b, vib: i === 3 ? [6, 12] : null, filter: { f: 2000 } }); this.note({ type: 'triangle', f: NT(n + 12), at: i * 0.3, dur: d, vol: 0.08, bus: b, vib: [6, 8] }); });
          this.note({ type: 'sine', f: 180, at: 0, dur: 0.4, vol: 0.25, bus: b, vib: [22, 60] }); break;
        }
        case 'deathMonitor': { const b = B(1); [0, 0.25].forEach((a) => this.note({ type: 'sine', f: 1000, at: a, dur: 0.12, vol: 0.12, bus: b, flat: true })); this.note({ type: 'sine', f: 1000, at: 0.5, dur: 1.4, vol: 0.12, bus: b, flat: true }); this.swoosh(b, 0, 0.5, 2500, 2400, 0.12, 0.5); break; }
        case 'deathError': { const b = B(1); this.note({ type: 'sine', f: 880, dur: 0.5, vol: 0.18, bus: b }); this.note({ type: 'sine', f: 659, at: 0.14, dur: 0.7, vol: 0.18, bus: b }); for (let k = 0; k < 6; k++) this.noise({ dur: 0.008, vol: 0.2, at: 0.35 + k * rnd(0.05, 0.1), type: 'highpass', freq: 4000, bus: b }); break; }
        case 'deathPencil': { const b = B(1); for (let k = 0; k < 6; k++) this.swoosh(b, k * 0.07, 0.09, k % 2 ? 2600 : 4200, k % 2 ? 4200 : 2600, 0.16, 3); this.swoosh(b, 0.5, 0.35, 900, 700, 0.12, 1.5); break; }
        case 'deathGong': { const b = B(1); thud(b, 0, 0.25); this.gong(b, 0.03); break; }
        case 'deathRadio': { const b = B(1); this.note({ type: 'sine', f: 1900, f1: 800, dur: 0.12, vol: 0.12, bus: b }); this.swoosh(b, 0.05, 0.6, 2400, 2000, 0.18, 0.6); this.note({ type: 'sawtooth', f: 55, at: 0.1, dur: 1.1, vol: 0.09, bus: b, filter: { f: 300 } }); break; }
        case 'deathBlocks': { const b = B(1); [880, 740, 620, 520, 430].forEach((f, i) => this.tock(f, i * 0.08 + Math.random() * 0.02, b, 0.3)); this.note({ type: 'sine', f: 1500, f1: 700, at: 0.5, dur: 0.25, vol: 0.12, bus: b, vib: [30, 80] }); break; }
        case 'deathShutter': { const b = B(1); [0, 0.05].forEach((a) => this.noise({ dur: 0.025, vol: 0.4, at: a, type: 'highpass', freq: 2000, bus: b })); for (let k = 0; k < 8; k++) this.noise({ dur: 0.012, vol: 0.18, at: 0.2 + k * 0.05, type: 'bandpass', freq: 2600, q: 3, bus: b }); break; }
        case 'deathClapper': { const b = B(1); this.tock(900, 0, b, 0.45); this.noise({ dur: 0.04, vol: 0.5, type: 'highpass', freq: 1800, bus: b }); this.voice([{ d: 0.05, f: [400, 1700, 2500], p: 140, a: 0, n: 0.4, nf: 2500 }, { d: 0.14, f: [450, 1000, 2300], p: 150 }, { d: 0.05, f: [400, 1700, 2500], p: 130, a: 0, n: 0.3, nf: 4000 }], 0.15, 0.7, b); this.laugh(b, 0.5, 1.2, 0); this.swoosh(b, 0.35, 0.9, 700, 500, 0.08, 0.6); break; }
        case 'deathBoom': { const b = B(1); this.swoosh(b, 0, 1.2, 2400, 70, 0.5, 0.7, 'lowpass'); this.note({ type: 'sine', f: 90, f1: 28, dur: 0.6, vol: 0.55, bus: b }); break; }
        case 'deathVector': { const b = B(1); this.swoosh(b, 0, 0.9, 3000, 90, 0.4, 0.8, 'lowpass'); this.note({ type: 'sawtooth', f: 520, f1: 40, dur: 0.8, vol: 0.12, bus: b }); this.note({ type: 'square', f: 260, f1: 30, at: 0.05, dur: 0.7, vol: 0.06, bus: b }); break; }
        case 'deathMusicBox': { const b = B(1); this.swoosh(b, 0, 0.35, 1200, 3000, 0.12, 0.8); [88, 84, 81, 76, 72].forEach((n, i) => { this.note({ type: 'sine', f: NT(n), at: 0.2 + i * 0.22, dur: 0.9, vol: 0.12, bus: b, attack: 0.002 }); this.note({ type: 'sine', f: NT(n) * 3.01, at: 0.2 + i * 0.22, dur: 0.25, vol: 0.03, bus: b, attack: 0.002 }); }); break; }
        case 'deathShamisen': { const b = B(1); [64, 63, 59, 52].forEach((n, i) => this.pluck(NT(n), i * 0.16, b, 0.35, 0.9, 0.994)); this.swoosh(b, 0.3, 1.6, 400, 1600, 0.2, 0.5, 'lowpass'); break; }
        case 'deathAlarm': { const b = B(1); for (let k = 0; k < 16; k++) this.note({ type: 'sine', f: 2400 + (k % 2) * 300, at: k * 0.05, dur: 0.045, vol: 0.1, bus: b, flat: true }); this.swoosh(b, 0.9, 0.6, 3000, 9000, 0.15, 0.7, 'highpass'); break; } // a bell hammering, then a rush
        case 'deathTea': { const b = B(1); [2900, 4150, 5600].forEach((f) => this.note({ type: 'sine', f, dur: 0.5, vol: 0.07, bus: b, attack: 0.001 })); this.swoosh(b, 0.1, 0.9, 1500, 900, 0.14, 0.9); this.tock(1200, 0.95, b, 0.35); this.tock(1250, 1.08, b, 0.35); break; }
        case 'deathFlash': { const b = B(1); this.note({ type: 'sine', f: 1800, f1: 7000, dur: 0.45, vol: 0.05, bus: b }); this.noise({ dur: 0.03, vol: 0.45, at: 0.46, type: 'highpass', freq: 2500, bus: b }); this.note({ type: 'sawtooth', f: 110, at: 0.55, dur: 0.6, vol: 0.06, bus: b, filter: { f: 500 }, vib: [30, 8] }); break; }
        case 'deathStone': { const b = B(1); [3100, 2700, 3500].forEach((f, i) => { this.note({ type: 'sine', f, at: i * 0.11, dur: 0.15, vol: 0.12, bus: b, attack: 0.001 }); this.noise({ dur: 0.03, vol: 0.3, at: i * 0.11, type: 'highpass', freq: 3000, bus: b }); }); this.swoosh(b, 0.35, 0.8, 900, 150, 0.35, 0.7, 'lowpass'); break; }
        case 'deathCloth': { const b = B(1); this.swoosh(b, 0, 0.32, 2600, 700, 0.25, 2); [64, 62, 60].forEach((n, i) => this.pluck(NT(n), 0.35 + i * 0.2, b, 0.3, 0.6, 0.995)); break; }
        case 'deathCandle': { const b = B(1); this.swoosh(b, 0, 0.55, 1300, 350, 0.3, 0.9); this.note({ type: 'sawtooth', f: 82, at: 0.4, dur: 1.4, vol: 0.12, bus: b, attack: 0.25, filter: { f: 250, f1: 700, dur: 0.7 } }); this.note({ type: 'sawtooth', f: 82.6, at: 0.4, dur: 1.4, vol: 0.1, bus: b, attack: 0.3, filter: { f: 250, f1: 700, dur: 0.7 } }); break; }
        case 'deathIce': { const b = B(1); for (let k = 0; k < 6; k++) this.noise({ dur: 0.03, vol: 0.35, at: k * rnd(0.03, 0.06), type: 'highpass', freq: 3500, bus: b }); this.tinkle(b, 0.12, 18, 0.8); this.note({ type: 'sine', f: 120, f1: 50, dur: 0.3, vol: 0.3, bus: b }); break; }
        case 'deathHorn': { const b = B(1); thud(b, 0, 0.3); [110, 110.7].forEach((f) => this.note({ type: 'sawtooth', f, at: 0.1, dur: 1.6, vol: 0.12, bus: b, attack: 0.3, filter: { f: 260, f1: 900, dur: 0.8 } })); [[57, 0.07], [61, 0.06], [64, 0.06]].forEach(([n, v]) => this.voice([{ d: 0.2, f: [750, 1150, 2500], p: NT(n), a: 0.4 }, { d: 1.0, f: [780, 1100, 2450], p: NT(n) }, { d: 0.4, f: [700, 1050, 2400], p: NT(n) * 0.99, a: 0.2 }], 0.35, v * 2, b)); break; }
        case 'deathShatter': { const b = B(1); this.noise({ dur: 0.18, vol: 0.5, type: 'highpass', freq: 2500, bus: b }); this.tinkle(b, 0.02, 26, 0.9, 3000, 9000, 0.08); this.note({ type: 'sine', f: 70, f1: 35, dur: 0.4, vol: 0.4, bus: b }); break; }
        case 'deathSax': { // noir: a sad muted trumpet falling, rain on the pavement
          const b = B(1); thud(b, 0, 0.25);
          [[58, 0.32], [57, 0.32], [56, 0.32], [55, 1.1]].forEach(([n, d], i) => this.trumpet(NT(n), 0.1 + i * 0.34, d, b, 0.13, i === 3));
          this.swoosh(b, 0, 1.6, 5000, 4000, 0.05, 0.4, 'highpass'); break;
        }
        case 'deathStamp': { const b = B(1); this.note({ type: 'sine', f: 95, f1: 45, dur: 0.18, vol: 0.5, bus: b, attack: 0.001 }); this.noise({ dur: 0.08, vol: 0.4, freq: 700, bus: b }); for (let k = 0; k < 7; k++) this.noise({ dur: 0.03, vol: 0.18, at: 0.3 + k * 0.035, type: 'bandpass', freq: 2200 + k * 200, q: 2, bus: b }); break; }
        case 'deathPhone': { const b = B(1); this.note({ type: 'sine', f: 1046, dur: 0.14, vol: 0.14, bus: b }); this.note({ type: 'sine', f: 784, at: 0.15, dur: 0.3, vol: 0.14, bus: b }); this.note({ type: 'sine', f: 500, f1: 1800, at: 0.45, dur: 0.12, vol: 0.12, bus: b }); this.swoosh(b, 0.45, 0.3, 3000, 800, 0.12); break; }
        case 'deathDream': { const b = B(1); this.note({ type: 'sine', f: 2637, dur: 0.6, vol: 0.06, bus: b, flat: true, vib: [26, 500] }); this.swoosh(b, 0.1, 1.0, 400, 6000, 0.12, 0.6, 'highpass'); this.note({ type: 'sine', f: 440, f1: 220, at: 0.4, dur: 1.0, vol: 0.1, bus: b, vib: [3, 6] }); break; }
        // -- starts --
        case 'goClapper': this.tock(950, 0, S, 0.45); this.noise({ dur: 0.04, vol: 0.4, type: 'highpass', freq: 1800 }); break;
        case 'goBell': this.note({ type: 'sine', f: 1568, dur: 0.9, vol: 0.16 }); this.note({ type: 'sine', f: 1568 * 2.76, dur: 0.3, vol: 0.04 }); this.note({ type: 'square', f: 120, dur: 0.25, vol: 0.05, flat: true }); break;
        case 'goPC': [523, 784].forEach((f, i) => this.note({ type: 'square', f, at: i * 0.08, dur: 0.07, vol: 0.09, flat: true })); break;
        case 'goChip': { const w = this.pulse(0.25); [72, 76, 79, 84].forEach((n, i) => this.note({ wave: w, f: NT(n), at: i * 0.06, dur: 0.06, vol: 0.1, flat: true })); break; }
        case 'goVHS': this.tock(240, 0, S, 0.3); this.note({ type: 'sine', f: 60, dur: 0.3, vol: 0.2 }); this.note({ type: 'sawtooth', f: 90, at: 0.1, dur: 0.5, vol: 0.05, filter: { f: 400 } }); break;
        case 'goWood': this.tock(1150, 0, S, 0.4); this.tock(1200, 0.12, S, 0.4); break;
        case 'goGong': this.gong(S, 0, 140, 0.18); break;
        case 'goHorn': [110, 110.6, 165].forEach((f) => this.note({ type: 'sawtooth', f, dur: 0.9, vol: 0.08, attack: 0.12, filter: { f: 400, f1: 1200, dur: 0.4 } })); break;
        case 'goGlitch': { const b = this.stinger(1); this.crushed(b, 0, 0.3, 0.25); break; }
        case 'goPhone': [1318, 1568, 2093].forEach((f, i) => this.note({ type: 'sine', f, at: i * 0.07, dur: 0.2, vol: 0.1 })); break;
        case 'goSax': this.trumpet(NT(62), 0, 0.18, S, 0.12); this.trumpet(NT(65), 0.18, 0.45, S, 0.12, true); break;
        case 'goChime': [76, 83, 88].forEach((n, i) => this.note({ type: 'sine', f: NT(n), at: i * 0.1, dur: 0.8, vol: 0.09 })); break;
        case 'goWhistle': this.note({ type: 'sine', f: 500, f1: 1500, dur: 0.25, vol: 0.14, vib: [8, 20] }); break;
        case 'goVapor': { const e = this.echo(0.3, 0.45, 0.5); [60, 64, 67, 71].forEach((n) => this.note({ type: 'sine', f: NT(n), dur: 0.9, vol: 0.06, bus: e, vib: [4, 2], attack: 0.03 })); break; }
        case 'goShutter': [0, 0.05].forEach((a) => this.noise({ dur: 0.025, vol: 0.35, at: a, type: 'highpass', freq: 2200 })); break;
        // -- wins --
        case 'winSitcom': { const b = this.stinger(0.9); this.applause(b, 0, 2.4, 0.55); [60, 64, 67, 72].forEach((n, i) => this.piano(NT(n), i * 0.09, b, 0.13, 0.7)); [48, 60, 64, 67].forEach((n) => this.piano(NT(n), 0.42, b, 0.09, 1.2)); break; }
        case 'winPiano': { const b = this.stinger(1); this.projector(b, 0, 1.6); [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => this.piano(NT(n), i * 0.07, b, 0.13, 0.5)); [48, 55, 64, 72].forEach((n) => this.piano(NT(n), 0.55, b, 0.1, 1.4)); break; }
        case 'winChip': { const w = this.pulse(0.25), w2 = this.pulse(0.5); [72, 76, 79, 84, 79, 84, 88].forEach((n, i) => this.note({ wave: w, f: NT(n), at: i * 0.09, dur: i === 6 ? 0.5 : 0.08, vol: 0.1, flat: true })); [48, 55, 60].forEach((n, i) => this.note({ wave: w2, f: NT(n), at: i * 0.2, dur: 0.18, vol: 0.07, flat: true })); break; }
        case 'winPC': [523, 659, 784, 1047].forEach((f, i) => this.note({ type: 'square', f, at: i * 0.09, dur: i === 3 ? 0.3 : 0.08, vol: 0.09, flat: true })); break;
        case 'winKoto': [62, 64, 67, 69, 74, 76].forEach((n, i) => this.pluck(NT(n), i * 0.11, S, 0.3, 0.8, 0.996)); break;
        case 'winHorn': { [[110, 0], [138.6, 0.35], [165, 0.7]].forEach(([f, a]) => [f, f * 1.006].forEach((ff) => this.note({ type: 'sawtooth', f: ff, at: a, dur: a > 0.5 ? 1.2 : 0.4, vol: 0.08, attack: 0.08, filter: { f: 400, f1: 1400, dur: 0.3 } }))); [[57, 0.06], [64, 0.05], [69, 0.05]].forEach(([n, v]) => this.voice([{ d: 0.3, f: [750, 1150, 2500], p: NT(n), a: 0.5 }, { d: 1.1, f: [780, 1100, 2450], p: NT(n) }], 0.7, v * 2)); break; }
        case 'winSax': [[62, 0.15], [65, 0.15], [67, 0.15], [70, 0.6]].forEach(([n, d], i) => this.trumpet(NT(n), i * 0.16, d, S, 0.12, i === 3)); break;
        case 'winVapor': { const e = this.echo(0.36, 0.5, 0.55); [[65, 69, 72, 76], [67, 71, 74, 78]].forEach((ch, k) => ch.forEach((n) => this.note({ type: 'sine', f: NT(n), at: k * 0.5, dur: 1.2, vol: 0.06, bus: e, vib: [4, 2], attack: 0.03 }))); break; }
        case 'winGlitch': { const b = this.stinger(1); this.crushed(b, 0, 0.35, 0.25); const w = this.pulse(0.25); [72, 76, 79, 84].forEach((n, i) => this.note({ wave: w, f: NT(n), at: 0.4 + i * 0.07, dur: 0.07, vol: 0.1, flat: true })); break; }
        case 'winBlocks': [520, 620, 740, 880, 1040].forEach((f, i) => this.tock(f, i * 0.08, S, 0.3)); break;
        case 'winMusicBox': [72, 76, 79, 84, 88].forEach((n, i) => { this.note({ type: 'sine', f: NT(n), at: i * 0.12, dur: 0.9, vol: 0.12, attack: 0.002 }); this.note({ type: 'sine', f: NT(n) * 3.01, at: i * 0.12, dur: 0.2, vol: 0.03, attack: 0.002 }); }); break;
        case 'winBrass': [[60, 64, 67], [65, 69, 72], [67, 71, 74, 79]].forEach((ch, k) => ch.forEach((n) => this.note({ type: 'sawtooth', f: NT(n), at: k * 0.16, dur: k === 2 ? 0.7 : 0.14, vol: 0.05, attack: 0.02, filter: { f: 800, f1: 2400, dur: 0.1 } }))); break;
        case 'winShatter': { const b = this.stinger(1); this.tinkle(b, 0, 20, 0.6, 3000, 9000, 0.07); break; }
        // -- small things --
        case 'jumpPulse': { const w = this.pulse(0.125); this.note({ wave: w, f: 300, f1: 760, dur: 0.12, vol: 0.09 }); break; }
        case 'jumpPC': this.note({ type: 'square', f: 600, f1: 1200, dur: 0.06, vol: 0.06, flat: true }); break;
        case 'jumpSoft': this.swoosh(S, 0, 0.14, 700, 1800, 0.12, 1.2); break;
        case 'jumpCartoon': this.note({ type: 'sine', f: 380, f1: 1100, dur: 0.16, vol: 0.14, vib: [14, 20] }); break;
        case 'jumpGlass': this.note({ type: 'sine', f: 1200, f1: 2400, dur: 0.1, vol: 0.06 }); break;
        case 'landSoft': this.noise({ dur: 0.07, vol: 0.18 * Math.min(1, (opt.speed || 200) / 300), freq: 500 }); break;
        case 'landWood': this.tock(300 + Math.random() * 60, 0, S, 0.18 * Math.min(1, (opt.speed || 200) / 300)); break;
        case 'landPC': this.note({ type: 'square', f: 140, dur: 0.03, vol: 0.06, flat: true }); break;
      }
    },
  });

  KF.Audio = A;
})(window.KF);
