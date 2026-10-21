'use strict';
// Main loop: fixed-timestep updates with interpolated rendering, integer canvas scaling,
// scene switching with a wipe, and the global keys (M mute, F1 hitboxes).
(function (KF) {
  class Engine {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.ctx.imageSmoothingEnabled = false;
      this.input = new KF.Input(window);
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
      const s = Math.min(window.innerWidth / KF.VIEW_W, window.innerHeight / KF.VIEW_H);
      const scale = s >= 1 ? Math.floor(s) : s; // integer scale keeps pixels square and sharp
      this.canvas.style.width = KF.VIEW_W * scale + 'px';
      this.canvas.style.height = KF.VIEW_H * scale + 'px';
    }

    setScene(scene) { this.scene = scene; }
    // Switch scenes behind a quick wipe. `make` builds the next scene once the screen is covered.
    go(make) { if (!this.wipe) this.wipe = { t: 0, make, swapped: false }; }

    step(dt) {
      const inp = this.input;
      if (inp.wasPressed('KeyM')) { KF.Audio.setMuted(!KF.Audio.muted); KF.Save.setMuted(KF.Audio.muted); }
      if (inp.wasPressed('F1')) this.debug = !this.debug;
      if (this.wipe) {
        this.wipe.t += dt;
        if (!this.wipe.swapped && this.wipe.t >= 0.18) { this.scene = this.wipe.make(); this.wipe.swapped = true; }
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
          if (this.scene) this.scene.render(this.ctx, this.acc / KF.STEP);
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
