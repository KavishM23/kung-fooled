'use strict';
// Keyboard and mouse state. "pressed" edges (and clicks) are latched until the next fixed physics
// step consumes them, so a tap is never lost between frames.
//
// Two full control sets work at the same time:
//   WASD:   A/D move, W or Space jump, S block   fights: J punch, K kick, L special
//   ARROWS: left/right move, up jump, down block fights: Z punch, X kick, C special
// The mouse clicks menus and the pause button; in fights left click punches, right click kicks
// (and in a SUPERHOT fight left click fires the gun at the cursor).
// `scheme` remembers which set was used last so on-screen hints can show the right keys.
(function (KF) {
  const GAME_KEYS = new Set([
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyA', 'KeyD', 'KeyW', 'KeyS',
    'KeyR', 'KeyM', 'KeyT', 'KeyJ', 'KeyK', 'KeyL', 'KeyZ', 'KeyX', 'KeyC', 'KeyF', 'KeyV', 'KeyP', 'KeyQ', 'KeyE', 'Escape', 'Enter', 'F1',
  ]);
  const ARROW_SET = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyZ', 'KeyX', 'KeyC']);
  const WASD_SET = new Set(['KeyA', 'KeyD', 'KeyW', 'KeyS', 'KeyJ', 'KeyK', 'KeyL']);

  class Input {
    constructor(target = window, canvas = null) {
      this.down = new Set();
      this.pressed = new Set();
      this.scheme = 'wasd';
      this.mouse = { x: -99, y: -99, down: false, right: false, seen: false };
      this.clicked = false; this.rclicked = false;
      // Typing in a text box (the level-code dialog) is not game input.
      const typing = (e) => e.target && /^(TEXTAREA|INPUT)$/.test(e.target.tagName);
      target.addEventListener('keydown', (e) => {
        if (typing(e)) return;
        if (GAME_KEYS.has(e.code)) e.preventDefault();
        if (!e.repeat && !this.down.has(e.code)) this.pressed.add(e.code);
        this.down.add(e.code);
        this.mouse.moved = false;
        if (ARROW_SET.has(e.code)) this.scheme = 'arrows'; else if (WASD_SET.has(e.code)) this.scheme = 'wasd';
      });
      target.addEventListener('keyup', (e) => {
        if (typing(e)) return;
        if (GAME_KEYS.has(e.code)) e.preventDefault();
        this.down.delete(e.code);
      });
      // Avoid "stuck" keys when the tab loses focus.
      target.addEventListener('blur', () => { this.down.clear(); this.mouse.down = this.mouse.right = false; });
      if (canvas) {
        const at = (e) => { // client px -> logical 384 x 216 coordinates
          const r = canvas.getBoundingClientRect();
          this.mouse.x = ((e.clientX - r.left) / r.width) * KF.VIEW_W;
          this.mouse.y = ((e.clientY - r.top) / r.height) * KF.VIEW_H;
          this.mouse.seen = true;
        };
        window.addEventListener('pointermove', (e) => { at(e); this.mouse.moved = true; }); // hover only selects after the mouse moves
        canvas.addEventListener('pointerdown', (e) => {
          at(e); window.focus();
          if (e.button === 2) { this.mouse.right = true; this.rclicked = true; } else { this.mouse.down = true; this.clicked = true; }
          e.preventDefault();
        });
        window.addEventListener('pointerup', (e) => { if (e.button === 2) this.mouse.right = false; else this.mouse.down = false; });
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
      }
    }
    isDown(...codes) { return codes.some((c) => this.down.has(c)); }
    wasPressed(...codes) { return codes.some((c) => this.pressed.has(c)); }
    endStep() { this.pressed.clear(); this.clicked = false; this.rclicked = false; }

    get left() { return this.isDown('ArrowLeft', 'KeyA'); }
    get right() { return this.isDown('ArrowRight', 'KeyD'); }
    get jumpHeld() { return this.isDown('Space', 'KeyW', 'ArrowUp'); }
    get jumpPressed() { return this.wasPressed('Space', 'KeyW', 'ArrowUp'); }
    get confirm() { return this.wasPressed('Enter', 'Space'); }
    get back() { return this.wasPressed('Escape'); }
    get pause() { return this.wasPressed('Escape', 'KeyP'); }
    // Key names for hints, in the set the player is using.
    keys() {
      return this.scheme === 'arrows'
        ? { move: 'LEFT/RIGHT', jump: 'UP', block: 'DOWN', punch: 'Z', kick: 'X', special: 'C' }
        : { move: 'A/D', jump: 'W', block: 'S', punch: 'J', kick: 'K', special: 'L' };
    }
  }
  KF.Input = Input;
})(window.KF);
