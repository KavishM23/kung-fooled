'use strict';
// Player controller. The collision box (w x h) is a fixed rectangle, smaller than the sprite.
(function (KF) {
  const U = KF.util;

  // All movement feel lives here. Units: pixels and seconds (16px = 1 tile).
  const P = KF.PlayerTuning = {
    w: 10, h: 22,
    runSpeed: 120,
    groundAccel: 1500, groundDecel: 1900, turnAccel: 2800,
    airAccel: 1100, airDecel: 450, airTurnAccel: 1700,
    gravity: 1300,
    fallMul: 1.5,        // falls faster than it rises: snappier arcs
    apexMul: 0.55,       // a little hang time at the top while jump is held
    apexThreshold: 45,
    jumpVel: 385,        // ~3.6 tiles at full hold (3-tile ledges clear with margin)
    jumpCutVel: 190,     // releasing early caps upward speed here: a tap still hops ~1 tile
    maxFall: 400,
    ledgeAssist: 5,      // px: clipping a ledge's top corner while falling pops you onto it
    coyote: 0.08,
    buffer: 0.10,
    cornerNudge: 4,
    landTime: 0.12,
    launchControl: 0.35, // air control kept while flying off a spring
  };

  class Player {
    constructor(x, y) { this.reset(x, y); }

    // (x, y) is the spawn point: centre-bottom of the hitbox.
    reset(x, y) {
      this.w = P.w; this.h = P.h;
      this.x = x - P.w / 2; this.y = y - P.h;
      this.prevX = this.x; this.prevY = this.y;
      this.vx = 0; this.vy = 0;
      this.gravDir = 1;
      this.reversed = false;   // reversed-controls zones set this
      this.launchT = 0;        // reduced air control after a spring launch
      this.topSpeedT = 0;      // time spent at full run speed (drives the afterimage trail)
      this.grounded = false;
      this.coyoteT = 0; this.bufferT = 0;
      this.jumping = false;
      this.facing = 1;
      this.landT = 0;
      this.dead = false;
      this.state = 'idle';
      this.stateT = 0;
      this.events = [];        // drained by the scene for sfx / particles
    }

    get centerX() { return this.x + this.w / 2; }

    update(dt, input, world) {
      this.prevX = this.x; this.prevY = this.y;
      if (this.dead) return;
      const g = this.gravDir;

      let dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      if (this.reversed) dir = -dir;
      if (dir) this.facing = dir;

      // Horizontal: accelerate toward target speed; turning around is extra snappy.
      const turning = dir !== 0 && this.vx !== 0 && Math.sign(this.vx) !== dir;
      let a;
      if (this.grounded) a = dir === 0 ? P.groundDecel : turning ? P.turnAccel : P.groundAccel;
      else a = dir === 0 ? P.airDecel : turning ? P.airTurnAccel : P.airAccel;
      // After a spring launch momentum is kept unless you actively steer.
      if (this.launchT > 0) {
        this.launchT -= dt;
        const coasting = dir === 0 || (dir === Math.sign(this.vx) && Math.abs(this.vx) > P.runSpeed);
        a = coasting ? 0 : a * P.launchControl;
      }
      const skid = turning && this.grounded && Math.abs(this.vx) > 90;
      if (skid && !this.skidding) this.events.push({ type: 'skid' });
      this.skidding = skid;
      if (this.grounded && world.slipperyUnder(this, g)) a *= dir === 0 ? 0.12 : 0.3; // ice
      this.vx = U.approach(this.vx, dir * P.runSpeed, a * dt);

      // Coyote time and jump buffering.
      this.coyoteT = this.grounded ? P.coyote : this.coyoteT - dt;
      this.bufferT = input.jumpPressed ? P.buffer : this.bufferT - dt;
      if (this.bufferT > 0 && this.coyoteT > 0) {
        this.vy = -P.jumpVel * g;
        this.jumping = true;
        this.grounded = false;
        this.coyoteT = 0; this.bufferT = 0;
        this.events.push({ type: 'jump' });
      }

      // Variable jump height: releasing early cuts upward speed once.
      if (this.jumping && !input.jumpHeld) {
        if (this.vy * g < -P.jumpCutVel) this.vy = -P.jumpCutVel * g;
        this.jumping = false;
      }
      if (this.vy * g >= 0) this.jumping = false;

      // Gravity (direction-aware so gravity-flip zones just set gravDir).
      let gm = 1;
      if (this.vy * g > 0) gm = P.fallMul;
      else if (input.jumpHeld && Math.abs(this.vy) < P.apexThreshold) gm = P.apexMul;
      this.vy += P.gravity * gm * g * dt;
      if (this.vy * g > P.maxFall) this.vy = P.maxFall * g;

      // Move and collide.
      const wasGrounded = this.grounded;
      const fallSpeed = this.vy * g;
      const dx = (this.vx + (this.windX || 0)) * dt, wantX = this.x + dx;
      if (KF.Physics.moveX(this, world, dx) && !this.ledgeAssist(world, wantX)) this.vx = 0;
      const hy = KF.Physics.moveY(this, world, this.vy * dt, fallSpeed < 0 ? P.cornerNudge : 0);
      this.grounded = hy !== 0 && hy === g;
      if (hy !== 0) {
        if (hy !== g) this.jumping = false; // bonked a ceiling
        this.vy = 0;
      }
      if (this.grounded && !wasGrounded) {
        this.landT = P.landTime;
        this.launchT = 0;
        this.events.push({ type: 'land', speed: fallSpeed });
      }
      if (this.landT > 0) this.landT -= dt;
      this.topSpeedT = this.grounded && Math.abs(this.vx) >= P.runSpeed - 1 ? this.topSpeedT + dt : 0;

      this.updateState(dt);
    }

    // Forgiveness: if a wall stopped us mid-air and its top edge is only a few pixels above our feet,
    // step up onto it instead of sliding down the face.
    ledgeAssist(world, wantX) {
      const g = this.gravDir;
      if (this.grounded || this.vy * g < -60) return false;
      for (let k = 1; k <= P.ledgeAssist; k++) {
        const ny = this.y - k * g;
        if (!world.overlapsSolid(wantX, ny, this.w, this.h, this)) { this.x = wantX; this.y = ny; return true; }
      }
      return false;
    }

    // Spring launch: vy is "upward" speed relative to current gravity.
    launch(vx, up, control = 0.8) {
      if (vx) this.vx = vx;
      this.vy = -up * this.gravDir;
      this.launchT = control;
      this.grounded = false; this.jumping = false; this.coyoteT = 0;
    }

    flipGravity(g) {
      this.gravDir = g;
      this.vy *= 0.25;
      this.grounded = false; this.jumping = false; this.coyoteT = 0;
    }

    get fast() { return this.topSpeedT > 0.45 || Math.abs(this.vx) > P.runSpeed + 20; }

    updateState(dt) {
      const g = this.gravDir;
      let s;
      if (this.dead) s = 'dead';
      else if (!this.grounded) s = this.vy * g < 0 ? 'rise' : 'fall';
      else if (this.landT > 0) s = 'land';
      else if (Math.abs(this.vx) > 8) s = 'run';
      else s = 'idle';
      if (s !== this.state) { this.state = s; this.stateT = 0; } else this.stateT += dt;
    }
  }
  KF.Player = Player;
})(window.KF);
