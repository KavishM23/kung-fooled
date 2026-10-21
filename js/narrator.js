'use strict';
// THE GAME: a grumpy narrator who would rather you didn't play. It comments on styles, deaths,
// idling, fights and menus in a typewriter box with a little TV-face portrait.
(function (KF) {
  const F = () => KF.Font, VW = KF.VIEW_W;
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  const LINES = {
    style: {
      hd: ['UGH, YOU AGAIN. AT LEAST IT IS IN HIGH DEFINITION NOW.'],
      oldtv: ['WE ARE EXPERIENCING TECHNICAL DIFFICULTIES. PLEASE STAY TUNED. OR DO NOT.'],
      comic: ['FINE, HAVE A COMIC. EVERY DEATH GETS A SOUND EFFECT NOW.'],
      gameboy: ['I RAN OUT OF COLOURS. YOU GET FOUR. THEY ARE ALL GREEN.'],
      vhs: ['BE KIND, REWIND. ACTUALLY YOU CAN NOT. JUST PRESS R.'],
      silent: ['SOUND COSTS EXTRA IN THIS DECADE. SO DOES COLOUR.'],
      blueprint: ['THIS STAGE IS NOT BUILT YET. THESE ARE THE PLANS. WALK GENTLY.'],
      pocket: ['I PUT THE GAME ON A PHONE. GO OUTSIDE. CATCH THE DOOR.'],
      noir: ['IT WAS A DARK AND STORMY LEVEL. SOMEBODY FORGOT TO PAY THE LIGHT BILL.'],
      cga: ['1984 CALLED. IT WANTS ITS PALETTE BACK.'],
      glitch: ['SOMETHING IS WRONG WITH ME. DO NOT LOOK AT MY PIXELS.'],
      vaporwave: ['THIS STAGE IS A MOOD. DO NOT ASK ME WHICH ONE.'],
      mirror: ['EVERYTHING IS BACKWARDS. YOUR KEYS ARE NOT. GOOD LUCK WITH THAT.'],
      thermal: ['I CAN ONLY SEE BODY HEAT. YOURS IS PANICKING.'],
      bsod: ['HUH. I CRASHED. WAIT... THE ERROR TEXT IS SOLID? FINE. PLAY ON MY ERROR.'],
      sketch: ['I HAD NOT FINISHED DRAWING THIS ONE. MIND THE PENCIL LINES.'],
      ink: ['A CALM INK PAINTING. PLEASE DO NOT RUIN IT BY DYING IN IT.'],
      nightvision: ['LIGHTS OUT. GOGGLES ON. SOMEWHERE IN THE DARK, A TRAP IS SMILING.'],
      ascii: ['MY GRAPHICS CARD QUIT. YOU ARE THE @. EVERYTHING ELSE IS A PROBLEM.'],
      cube3d: ['BEHOLD: THE THIRD DIMENSION. IT CHANGES NOTHING. ENJOY.'],
      nes8bit: ['PIXELS THIS BIG? MUST BE A CLASSIC.'],
      negative: ['I INVERTED EVERYTHING. EVEN MY OPINION OF YOU. HM. STILL LOW.'],
      cinema: ['NOW IN WIDESCREEN. THE WHOLE BUDGET WENT ON THE BLACK BARS.'],
      popart: ['IT IS ART NOW. ART CAN NOT HURT YOU. THE SPIKES CAN.'],
      vector: ['LINES ONLY. BUDGET CUTS.'],
      storybook: ['ONCE UPON A TIME, SOMEONE KEPT DYING ON PAGE SIX.'],
      ukiyo: ['A WOODBLOCK PRINT. HAND CARVED. PLEASE DO NOT SMUDGE THE INK.'],
      dream: ['IS THIS A DREAM? IF YOU DIE, YOU WAKE UP. AT THE START. AGAIN.'],
      duotone: ['TWO COLOURS. THAT IS ALL THE SUNSET COULD AFFORD.'],
      polaroid: ['HOLD STILL. SAY CHEESE. DO NOT SAY ANYTHING ABOUT THE SPIKES.'],
      emboss: ['YOUR LEGEND IS CARVED IN STONE. MOSTLY THE PARTS WHERE YOU FALL.'],
      stitch: ['MY GRANDMOTHER STITCHED THIS LEVEL. DO NOT YOU DARE DIE ON HER TAPESTRY.'],
      candle: ['ONE CANDLE. VERY ATMOSPHERIC. VERY DARK. YOU ARE WELCOME.'],
      frost: ['IT IS SO COLD EVEN THE SCREEN FROZE.'],
      golden: ['THE LAST STAGE. GILDED. EXPENSIVE. PLEASE DO NOT SCRATCH IT.'],
    },
    death: ['OOPS. NOT MY FAULT.', 'I DID WARN YOU. IN MY HEAD.', 'THAT LOOKED PAINFUL. AGAIN?', 'THE FLOOR SAYS SORRY. IT IS LYING.', 'CLASSIC.', 'DID YOU SEE THAT COMING? I DID.'],
    deathCount: { 3: 'THREE. I AM NOT COUNTING. THREE.', 5: 'FIVE DEATHS. THE CROWD IS GETTING ATTACHED TO YOU.', 10: 'TEN. I AM GETTING YOU A FRAME FOR THE WALL OF SHAME.', 20: 'TWENTY. AT THIS POINT THE TRAPS ARE EMBARRASSED FOR YOU.', 40: 'FORTY. HAVE YOU CONSIDERED A DIFFERENT HOBBY? LIKE GARDENING?' },
    idle: ['ARE YOU WAITING FOR SOMETHING? THE DOOR WILL NOT COME TO YOU.', 'GOOD. JUST STAND THERE. NOTHING CAN GO WRONG.', 'HELLO? I CAN HEAR YOU NOT PLAYING.'],
    win: ['FINE. YOU WIN. THIS TIME.', 'LUCK. THAT WAS LUCK.', 'THE DOOR IS DISAPPOINTED IN ITSELF.'],
    perfect: ['NO DEATHS? WHO TOLD YOU THE TRAPS?', 'PERFECT. I AM CALLING A LAWYER.'],
    fightIntro: ['OH GOOD, VIOLENCE. AT LEAST IT IS NOT PLATFORMING.', 'PUNCH WITH J. OR DO NOT. I AM NOT YOUR COACH.', 'THEY SEEM NICE. HIT THEM ANYWAY.'],
    bossIntro: ['THIS ONE IS THE BOSS. I WOULD RUN. YOU CAN NOT RUN. SORRY.', 'BOSS FIGHT. I PUT MY BEST PIXELS INTO THIS ONE.'],
    fightLose: ['YOU LOST A FIGHT TO A BUNCH OF SHADED CIRCLES.', 'TRY BLOCKING. IT IS THE S KEY. IT IS ALWAYS THE S KEY.', 'THE SHOP SELLS UPGRADES. JUST SAYING.'],
    fightWin: ['YOU HIT THEM UNTIL THEY FELL OVER. INSPIRING.', 'A WIN. I WILL TELL NO ONE.'],
    shop: ['BUYING THINGS WILL NOT MAKE YOU GOOD. IT MIGHT MAKE YOU LOOK GOOD.'],
    map: ['SEVEN REALMS. SEVEN WAYS TO BE DISAPPOINTED. PICK ONE.'],
    title: ['THERE IS NOTHING TO SEE HERE. YOU CAN CLOSE THE TAB.', 'STOP THAT.', 'I SAID STOP. THE BUTTON IS NOT EVEN REAL.', 'FINE. FINE! GO. PLAY. SEE IF I CARE.'],
  };

  const N = {
    LINES, pick,
    cur: null, queue: [], y: 40, blipT: 0,
    say(text, opts = {}) {
      if (!text) return;
      const item = { text, t: 0, hold: opts.hold ?? 2.6, shown: 0 };
      if (opts.now || !this.cur) { this.cur = item; this.queue = opts.now ? [] : this.queue; } else if (this.queue.length < 2) this.queue.push(item);
    },
    clear() { this.cur = null; this.queue = []; },
    update(dt) {
      const c = this.cur;
      if (!c) return;
      c.t += dt;
      const n = Math.min(c.text.length, Math.floor(c.t * 42));
      if (n > c.shown) {
        if (n % 2 === 0 && c.text[n - 1] !== ' ') KF.Audio.sfx('blip');
        c.shown = n;
      }
      if (n >= c.text.length && c.t > c.text.length / 42 + c.hold) { this.cur = this.queue.shift() || null; }
    },
    render(ctx, t) {
      const c = this.cur;
      if (!c) return;
      const words = c.text.slice(0, c.shown).split(' '), lines = [''];
      for (const w of words) { if (F().measure(lines[lines.length - 1] + ' ' + w) > 210) lines.push(w); else lines[lines.length - 1] += (lines[lines.length - 1] ? ' ' : '') + w; }
      const h = 16 + lines.length * 9, x = 70, y = this.y, w = VW - 140;
      ctx.fillStyle = 'rgba(6,4,12,0.8)'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#e8d8ff'; ctx.fillRect(x, y, w, 0.5); ctx.fillRect(x, y + h - 0.5, w, 0.5); ctx.fillRect(x, y, 0.5, h); ctx.fillRect(x + w - 0.5, y, 0.5, h);
      // TV-face portrait
      ctx.fillStyle = '#2a2440'; ctx.fillRect(x + 4, y + 4, 18, 14); ctx.fillStyle = '#7cf0ff'; ctx.fillRect(x + 5, y + 5, 16, 12);
      ctx.fillStyle = '#0a0a14'; ctx.fillRect(x + 8, y + 8, 2, 3); ctx.fillRect(x + 15, y + 8, 2, 3);
      const talking = c.shown < c.text.length && Math.floor(t * 12) % 2;
      ctx.fillRect(x + 9, y + 13, 7, talking ? 2 : 1);
      ctx.fillRect(x + 10, y + 18, 6, 2);
      F().draw(ctx, 'THE GAME', x + 27, y + 3, '#ff8ab0');
      lines.forEach((l, i) => F().draw(ctx, l, x + 27, y + 12 + i * 9, '#ffffff'));
    },
  };
  KF.Narrator = N;
})(window.KF);
