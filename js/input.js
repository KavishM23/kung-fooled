'use strict';
// Keyboard state. "pressed" edges are latched until the next fixed physics step consumes them,
// so a tap is never lost between frames.
(function (KF) {
  const GAME_KEYS = new Set([
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyA', 'KeyD', 'KeyW', 'KeyS',
    'KeyR', 'KeyM', 'KeyT', 'Escape', 'Enter', 'F1',
  ]);

  class Input {
    constructor(target = window) {
      this.down = new Set();
      this.pressed = new Set();
      target.addEventListener('keydown', (e) => {
        if (GAME_KEYS.has(e.code)) e.preventDefault();
        if (!e.repeat && !this.down.has(e.code)) this.pressed.add(e.code);
        this.down.add(e.code);
      });
      target.addEventListener('keyup', (e) => {
        if (GAME_KEYS.has(e.code)) e.preventDefault();
        this.down.delete(e.code);
      });
      // Avoid "stuck" keys when the tab loses focus.
      target.addEventListener('blur', () => this.down.clear());
    }
    isDown(...codes) { return codes.some((c) => this.down.has(c)); }
    wasPressed(...codes) { return codes.some((c) => this.pressed.has(c)); }
    endStep() { this.pressed.clear(); }

    get left() { return this.isDown('ArrowLeft', 'KeyA'); }
    get right() { return this.isDown('ArrowRight', 'KeyD'); }
    get jumpHeld() { return this.isDown('Space', 'KeyW', 'ArrowUp'); }
    get jumpPressed() { return this.wasPressed('Space', 'KeyW', 'ArrowUp'); }
  }
  KF.Input = Input;
})(window.KF);
