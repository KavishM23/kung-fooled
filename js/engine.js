'use strict';
// Main loop: fixed-timestep updates with interpolated rendering, canvas scaling, scene switching
// with a wipe, and the global keys (M mute, F1 hitboxes).
//
// Two resolutions. Pixel-art scenes draw at KF.RES (2x the 384x216 logical screen) and the
// canvas is shown at a whole multiple, so every pixel stays square. Scenes with `hiRes` (realms
// whose style is smooth rather than pixel art) get a canvas at the screen's real resolution and
// `engine.scale` real pixels per logical pixel, up to KF.HI_MAX.
(function (KF) {
  class Engine {
    constructor(canvas) {
      this.canvas = canvas;
      this.scale = KF.RES; this.hiRes = false;
      canvas.width = KF.VIEW_W * KF.RES; canvas.height = KF.VIEW_H * KF.RES;
      this.ctx = canvas.getContext('2d');
      this.ctx.imageSmoothingEnabled = false;
      this.input = new KF.Input(window, canvas);
      this.scene = null;
      this.acc = 0; this.last = 0; this.fps = 60; this.time = 0;
      this.debug = false;
      this.wipe = null; // { t, make, swapped }
      this.resize();
      window.addEventListener('resize', () => this.resize());
      window.addEventListener('keydown', () => KF.Audio.unlock());
      window.addEventListener('pointerdown', () => KF.Audio.unlock());
    }

    resize() {
      const VW = KF.VIEW_W, VH = KF.VIEW_H, fit = Math.min(window.innerWidth / VW, window.innerHeight / VH);
      let scale = KF.RES, cssW, cssH;
      if (this.hiRes) { // smooth: as many real pixels as the screen has (capped)
        scale = Math.max(KF.RES, Math.min(KF.HI_MAX, Math.ceil(fit * (window.devicePixelRatio || 1)))); // whole, so pixel UI text stays crisp
        cssW = VW * fit; cssH = VH * fit;
      } else { // pixel art: whole multiples of the real canvas size keep every pixel square, but on
        // most laptop screens that leaves a third of the window black. Use a whole multiple only
        // when it fills at least 90% of the window; otherwise fill it with near-square pixels.
        const s = fit / KF.RES, k = s >= 1 && Math.floor(s) / s >= 0.9 ? Math.floor(s) : s;
        cssW = VW * KF.RES * k; cssH = VH * KF.RES * k;
      }
      if (scale !== this.scale || this.canvas.width !== Math.round(VW * scale)) {
        this.scale = scale;
        this.canvas.width = Math.round(VW * scale); this.canvas.height = Math.round(VH * scale);
      }
      this.canvas.style.width = cssW + 'px';
      this.canvas.style.height = cssH + 'px';
      this.canvas.style.imageRendering = this.hiRes ? 'auto' : 'pixelated';
    }
    // Pick the resolution for the scene about to show.
    fit(scene) { const hi = !!(scene && scene.hiRes); if (hi !== this.hiRes) { this.hiRes = hi; this.resize(); } }

    setScene(scene) { this.scene = scene; this.fit(scene); }
    // Switch scenes behind a quick wipe. `make` builds the next scene once the screen is covered.
    go(make) { if (!this.wipe) this.wipe = { t: 0, make: () => { KF.Audio.setLowpass(null); return make(); }, swapped: false }; }

    step(dt) {
      const inp = this.input;
      if (inp.wasPressed('KeyM')) { KF.Audio.setMuted(!KF.Audio.muted); KF.Save.setMuted(KF.Audio.muted); }
      if (inp.wasPressed('F1')) this.debug = !this.debug;
      if (this.wipe) {
        this.wipe.t += dt;
        if (!this.wipe.swapped && this.wipe.t >= 0.18) { this.scene = this.wipe.make(); this.wipe.swapped = true; this.fit(this.scene); }
        if (this.wipe.t >= 0.36) this.wipe = null;
        if (this.wipe && !this.wipe.swapped) return;
      }
      if (this.scene) this.scene.update(dt);
    }

    renderWipe(ctx) {
      if (!this.wipe) return;
      const t = this.wipe.t, k = t < 0.18 ? t / 0.18 : 1 - (t - 0.18) / 0.18;
      ctx.fillStyle = '#07050c';
      for (let i = 0; i < 12; i++) { // diagonal arcade shutters
        const h = KF.VIEW_H / 12, w = KF.VIEW_W * Math.min(1, k * 1.4 - i * 0.03) + 24;
        if (w > 0) ctx.fillRect(i % 2 ? KF.VIEW_W - w : 0, i * h, w, h + 1);
      }
    }

    start() {
      const frame = (t) => {
        const dt = Math.min((t - (this.last || t)) / 1000, 0.25);
        this.last = t;
        if (dt > 0) this.fps += (1 / dt - this.fps) * 0.05;
        this.acc += dt;
        while (this.acc >= KF.STEP) {
          this.time += KF.STEP;
          try { this.step(KF.STEP); } catch (e) { console.error(e); }
          this.input.endStep();
          this.acc -= KF.STEP;
        }
        try {
          this.ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
          this.ctx.imageSmoothingEnabled = false;
          this.frame = (this.frame || 0) + 1;
          if (this.scene) {
            this.scene.hits = []; // clickable regions, registered while drawing (see KF.UI)
            this.scene.render(this.ctx, this.acc / KF.STEP);
            this.canvas.style.cursor = KF.UI.under(this.scene) ? 'pointer' : this.scene.cursor || 'default';
          }
          this.renderWipe(this.ctx);
          if (KF.Audio.muted) KF.Font.draw(this.ctx, 'MUTE', KF.VIEW_W - 4, KF.VIEW_H - 9, '#7a7094', 1, 'right');
        } catch (e) { console.error(e); }
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    }
  }
  KF.Engine = Engine;
})(window.KF);
