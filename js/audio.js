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
        this.master.connect(comp); comp.connect(this.ctx.destination);
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
    voice(segs, at = 0, gain = 0.9) {
      if (!this.ctx) return;
      const c = this.ctx, t0 = this.now + at;
      const src = c.createOscillator(); src.type = 'sawtooth';
      const vg = c.createGain(); vg.gain.value = 0;
      const out = c.createGain(); out.gain.value = gain; out.connect(this.sfxBus);
      const filters = [0, 1, 2].map((i) => { const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = [7, 11, 13][i]; const g = c.createGain(); g.gain.value = [1, 0.7, 0.35][i]; vg.connect(f); f.connect(g); g.connect(out); return f; });
      src.connect(vg);
      let t = t0;
      src.frequency.setValueAtTime(segs[0].p || 110, t);
      for (const s of segs) {
        filters.forEach((f, i) => f.frequency.linearRampToValueAtTime(s.f[i], t + Math.min(0.04, s.d)));
        src.frequency.linearRampToValueAtTime(s.p || 110, t + s.d);
        vg.gain.linearRampToValueAtTime((s.a ?? 1) * 0.9, t + Math.min(0.03, s.d));
        if (s.n) this.noise({ dur: s.d, vol: s.n, at: t - this.now, type: 'bandpass', freq: s.nf || 3000, q: 1.5 });
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

  KF.Audio = A;
})(window.KF);
