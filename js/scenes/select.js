'use strict';
// Door select: three arena doors, cleared ones stamped, your fighter walks between them.
(function (KF) {
  const F = KF.Font, VW = KF.VIEW_W, A = KF.Audio;

  class SelectScene {
    constructor(engine, opts = {}) {
      this.engine = engine;
      this.theme = KF.Themes.get('temple');
      this.t = 0;
      this.sel = opts.cleared !== undefined ? Math.min(KF.Doors.length - 1, opts.cleared + 1) : (engine.lastDoor || 0);
      this.cleared = opts.cleared;
      this.stageSel = this.defaultStage(this.sel);
      this.px = this.doorX(this.sel); this.facing = 1;
      A.music('temple');
      if (opts.cleared !== undefined) A.sfx('win');
    }
    doorX(i) { const n = KF.Doors.length, gap = Math.min(120, (VW - 40) / n); return VW / 2 + (i - (n - 1) / 2) * gap; }
    defaultStage(i) {
      const d = KF.Save.door(KF.Doors[i].id);
      return d.cleared ? 0 : d.reached;
    }
    update(dt) {
      this.t += dt;
      const inp = this.engine.input, n = KF.Doors.length;
      if (inp.wasPressed('ArrowLeft', 'KeyA')) { this.sel = (this.sel + n - 1) % n; this.stageSel = this.defaultStage(this.sel); A.sfx('select'); }
      if (inp.wasPressed('ArrowRight', 'KeyD')) { this.sel = (this.sel + 1) % n; this.stageSel = this.defaultStage(this.sel); A.sfx('select'); }
      const save = KF.Save.door(KF.Doors[this.sel].id);
      const maxStage = save.cleared ? KF.Doors[this.sel].stages.length - 1 : save.reached;
      if (inp.wasPressed('ArrowUp', 'KeyW')) { this.stageSel = Math.min(maxStage, this.stageSel + 1); A.sfx('select'); }
      if (inp.wasPressed('ArrowDown', 'KeyS')) { this.stageSel = Math.max(0, this.stageSel - 1); A.sfx('select'); }
      if (inp.wasPressed('Enter', 'Space')) {
        A.sfx('confirm');
        this.engine.lastDoor = this.sel;
        const d = this.sel, s = this.stageSel;
        this.engine.go(() => new KF.PlayScene(this.engine, { door: d, stage: s }));
      }
      if (inp.wasPressed('KeyT')) this.engine.go(() => new KF.PlayScene(this.engine, { training: true }));
      if (inp.wasPressed('Escape')) this.engine.go(() => new KF.TitleScene(this.engine));
      const tx = this.doorX(this.sel);
      if (Math.abs(tx - this.px) > 1) { this.facing = Math.sign(tx - this.px); this.px += Math.sign(tx - this.px) * Math.min(Math.abs(tx - this.px), 260 * dt); this.walking = true; }
      else this.walking = false;
    }
    render(ctx) {
      const t = this.t;
      this.theme.background(ctx, { x: 40, y: 0 }, this.engine.time, { cheer: this.cleared !== undefined ? 1 : 0.2 });
      ctx.fillStyle = 'rgba(10,6,20,0.35)'; ctx.fillRect(0, 0, VW, KF.VIEW_H);
      // Stone floor.
      for (let x = 0; x < VW; x += 16) this.theme.tile(ctx, x, 176, 'solid', { t: true }, KF.util.hash2(x, 1));
      for (let x = 0; x < VW; x += 16) this.theme.tile(ctx, x, 192, 'solid', {}, KF.util.hash2(x, 2));
      KF.BigText.draw(ctx, 'CHOOSE YOUR DOOR', VW / 2, 20, 2, 'fire');
      KF.Doors.forEach((d, i) => {
        const x = this.doorX(i), save = KF.Save.door(d.id), selected = i === this.sel;
        ctx.save(); ctx.translate(Math.round(x - 16), 104); ctx.scale(2, 2);
        KF.Art.door(ctx, 0, 4, { lantern: true, open: selected ? 0.35 + 0.1 * Math.sin(t * 4) : 0, t });
        ctx.restore();
        F.draw(ctx, `DOOR ${i + 1}`, x, 60, selected ? '#ffd040' : '#a098b0', 1, 'center', '#000');
        F.draw(ctx, d.name, x, 70, selected ? '#ffffff' : '#c8c0d8', 1, 'center', '#000');
        // progress pips
        for (let s = 0; s < d.stages.length; s++) {
          const done = save.cleared || s < save.reached;
          ctx.fillStyle = '#0a0610'; ctx.fillRect(x - 21 + s * 9, 86, 7, 7);
          ctx.fillStyle = done ? '#ffd040' : s === save.reached ? '#6a5a80' : '#2a2238'; ctx.fillRect(x - 20 + s * 9, 87, 5, 5);
        }
        if (save.cleared) {
          ctx.save(); ctx.translate(x, 140); ctx.rotate(-0.25);
          KF.BigText.draw(ctx, 'CLEAR', 0, 0, 1, 'gold');
          ctx.restore();
        }
      });
      // The fighter in front of the chosen door.
      const fr = KF.Sprites.pick(this.walking ? 'run' : 'idle', t);
      KF.Sprites.draw(ctx, fr, this.px, 176, this.walking ? this.facing : 1);
      const d = KF.Doors[this.sel], save = KF.Save.door(d.id);
      const maxStage = save.cleared ? d.stages.length - 1 : save.reached;
      const stName = d.stages[this.stageSel] ? d.stages[this.stageSel].name : '';
      F.draw(ctx, `${d.name} ${d.sub}  -  STAGE ${this.stageSel + 1}: ${stName}`, VW / 2, 40, '#ffffff', 1, 'center', '#000');
      if (maxStage > 0) F.draw(ctx, 'UP/DOWN: CHOOSE STAGE', VW / 2, 192, '#d8d0e8', 1, 'center', '#000');
      if (this.cleared !== undefined && t < 4) KF.BigText.draw(ctx, 'DOOR CLEARED!', VW / 2, 120, 3, 'gold', t < 0.12 ? 3 - t * 16 : 1);
      F.draw(ctx, 'LEFT/RIGHT DOOR   ENTER FIGHT   T TRAINING   ESC TITLE', VW / 2, 205, '#d8d0e8', 1, 'center', '#000');
    }
  }
  KF.SelectScene = SelectScene;
})(window.KF);
