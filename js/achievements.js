'use strict';
// Achievements ("trophies"): each pays coins once, pops a toast when earned, and is listed on the
// TROPHIES screen. Game code reports what happened with KF.Ach.event(name, data); the checks
// below decide what that earns. Counters and unlocks live in the save.
(function (KF) {
  const F = KF.Font, VW = KF.VIEW_W;
  const LIST = [
    { id: 'firstblood', name: 'FIRST BLOOD', desc: 'DIE FOR THE FIRST TIME', coins: 10 },
    { id: 'flawless', name: 'FLAWLESS', desc: 'FINISH ANY LEVEL WITH NO DEATHS', coins: 20 },
    { id: 'stubborn', name: 'STUBBORN', desc: 'DIE 25 TIMES ON ONE LEVEL, THEN BEAT IT', coins: 60 },
    { id: 'hundred', name: 'PERSISTENT', desc: 'DIE 100 TIMES IN TOTAL', coins: 50 },
    { id: 'realm1', name: 'REALM WALKER', desc: 'CLEAR YOUR FIRST REALM', coins: 50 },
    { id: 'allrealms', name: 'ALL TEN', desc: 'CLEAR EVERY REALM', coins: 300 },
    { id: 'untouchable', name: 'UNTOUCHABLE', desc: 'BEAT A BOSS WITHOUT LOSING A ROUND', coins: 80 },
    { id: 'naked', name: 'NAKED KUNG FU', desc: 'BEAT THE SYSTEM WITH NO STAT UPGRADES', coins: 200 },
    { id: 'streak5', name: 'STREAKER', desc: 'WIN 5 ARENA FIGHTS IN A ROW', coins: 50 },
    { id: 'speedrun', name: 'SPEED DEMON', desc: 'FINISH A REALM SPEEDRUN', coins: 60 },
    { id: 'deathless', name: 'DEATHLESS', desc: 'FINISH A REALM SPEEDRUN WITH NO DEATHS', coins: 150 },
    { id: 'ghost', name: 'GHOSTBUSTER', desc: 'BEAT YOUR OWN BEST-TIME GHOST', coins: 30 },
    { id: 'dojo10', name: 'DOJO REGULAR', desc: 'REACH ROOM 10 IN THE ENDLESS DOJO', coins: 60 },
    { id: 'dojo25', name: 'DOJO MASTER', desc: 'REACH ROOM 25 IN THE ENDLESS DOJO', coins: 150 },
    { id: 'daily', name: 'TROLLED DAILY', desc: 'FINISH A DAILY TROLL', coins: 30 },
    { id: 'architect', name: 'ARCHITECT', desc: 'BUILD A LEVEL AND PROVE IT BEATABLE', coins: 40 },
    { id: 'versus', name: 'HOUSE RULES', desc: 'PLAY A TWO-PLAYER VERSUS MATCH', coins: 20 },
    { id: 'replay', name: 'HIGHLIGHT REEL', desc: 'WATCH A REPLAY OF ALL YOUR TRIES', coins: 10 },
  ];

  const save = () => {
    const d = KF.Save.data;
    d.ach = d.ach || {};
    d.stats = d.stats || { deaths: 0 };
    return d;
  };

  KF.Ach = {
    list: LIST,
    toasts: [],
    has(id) { return !!save().ach[id]; },
    count() { const d = save(); return LIST.filter((a) => d.ach[a.id]).length; },
    unlock(id) {
      const d = save();
      if (d.ach[id]) return;
      const a = LIST.find((x) => x.id === id);
      if (!a) return;
      d.ach[id] = Date.now();
      d.coins += a.coins;
      KF.Save.write();
      this.toasts.push({ a, t: 0 });
      if (KF.Audio) KF.Audio.sfx('perfect');
    },
    // name: what happened. data: details. Every check is cheap, so call freely.
    event(name, data = {}) {
      const d = save(), s = d.stats;
      switch (name) {
        case 'death':
          s.deaths = (s.deaths || 0) + 1;
          this.unlock('firstblood');
          if (s.deaths >= 100) this.unlock('hundred');
          break;
        case 'levelWin':
          if (data.deaths === 0) this.unlock('flawless');
          if (data.deaths >= 25) this.unlock('stubborn');
          if (data.beatGhost) this.unlock('ghost');
          break;
        case 'bossWin': {
          if (data.roundsLost === 0) this.unlock('untouchable');
          const cleared = KF.Doors.filter((door) => KF.Save.realm(door.id).cleared).length;
          if (cleared >= 1) this.unlock('realm1');
          if (cleared >= KF.Doors.length) this.unlock('allrealms');
          if (data.realm === KF.Doors.length - 1 && KF.Economy.UPGRADES.every((u) => !KF.Economy.level(u.id))) this.unlock('naked');
          break;
        }
        case 'arena': if (data.streak >= 5) this.unlock('streak5'); break;
        case 'speedrun': this.unlock('speedrun'); if (data.deaths === 0) this.unlock('deathless'); break;
        case 'endless': if (data.room >= 10) this.unlock('dojo10'); if (data.room >= 25) this.unlock('dojo25'); break;
        case 'daily': this.unlock('daily'); break;
        case 'verified': this.unlock('architect'); break;
        case 'versus': this.unlock('versus'); break;
        case 'replay': this.unlock('replay'); break;
      }
      KF.Save.write();
    },
    // Drawn by the engine over every scene: a banner sliding in from the top right.
    renderToasts(ctx, dt) {
      const T = this.toasts[0];
      if (!T) return;
      T.t += dt;
      const k = T.t < 0.25 ? T.t / 0.25 : T.t > 2.6 ? Math.max(0, 1 - (T.t - 2.6) / 0.25) : 1;
      if (T.t > 2.85) { this.toasts.shift(); return; }
      const w = 170, x = Math.round(VW - (w + 6) * k), y = 18;
      ctx.fillStyle = '#0a0610'; ctx.fillRect(x - 1, y - 1, w + 2, 26);
      ctx.fillStyle = '#2a1c48'; ctx.fillRect(x, y, w, 24);
      ctx.fillStyle = '#ffd040'; ctx.fillRect(x, y, 3, 24);
      KF.Ach.trophy(ctx, x + 7, y + 6, true);
      F.draw(ctx, 'TROPHY: ' + T.a.name, x + 22, y + 4, '#ffd040', 1, 'left', '#000');
      F.draw(ctx, `+${T.a.coins} COINS`, x + 22, y + 14, '#ffffff', 1, 'left', '#000');
    },
    // A 12x12 trophy cup.
    trophy(ctx, x, y, gold) {
      const c = gold ? '#ffd040' : '#3a3050', d = gold ? '#a07010' : '#24203a';
      ctx.fillStyle = c; ctx.fillRect(x + 2, y, 8, 5); ctx.fillRect(x, y + 1, 2, 3); ctx.fillRect(x + 10, y + 1, 2, 3);
      ctx.fillStyle = d; ctx.fillRect(x + 3, y + 5, 6, 1);
      ctx.fillStyle = c; ctx.fillRect(x + 5, y + 6, 2, 3); ctx.fillRect(x + 3, y + 9, 6, 2);
    },
  };

  // What killed you, for the first-time trap cards. pit deaths are traced back to the trap that
  // dropped you (a fake floor, a collapse...).
  const CARDS = {
    collapse: ['COLLAPSING FLOOR', 'FLOORS HAVE COMMITMENT ISSUES.'],
    fakeFloor: ['FAKE FLOOR', 'IT WAS PAINTED ON. BEAUTIFULLY.'],
    spikes: ['SPIKES', 'POINTY. ALSO SOMETIMES SHY.'],
    crusher: ['CRUSHER', 'LOOK UP. ALWAYS LOOK UP.'],
    crush: ['SQUASHED', 'SOMETHING SOLID WON THE ARGUMENT.'],
    pit: ['BOTTOMLESS PIT', 'GRAVITY: STILL UNDEFEATED.'],
    fakedoor: ['FAKE DOOR', 'NO LANTERN? THEN IT HAS A FIST.'],
    axe: ['SWINGING AXE', 'TIMING IS EVERYTHING. YOURS WAS NOT.'],
    blink: ['BLINKING PLATFORM', 'IT BLINKED. YOU DID NOT.'],
    shy: ['SHY PLATFORM', 'IT GETS NERVOUS WHEN YOU COME CLOSE.'],
    hidden: ['HIDDEN BLOCK', 'INVISIBLE CEILING. VERY VISIBLE BONK.'],
    wind: ['WIND', 'THE WEATHER HAS OPINIONS.'],
    reverse: ['REVERSE ZONE', 'LEFT IS RIGHT. RIGHT IS GONE.'],
    gravity: ['GRAVITY FLIP', 'DOWN IS A STATE OF MIND.'],
    spring: ['SPRING', 'WHEEE. THEN NOT WHEEE.'],
    mover: ['MOVING WALL', 'THE LEVEL REARRANGED ITSELF. ON YOU.'],
    doorRun: ['RUNAWAY DOOR', 'THE EXIT HAS LEGS.'],
  };
  KF.TrapCards = {
    CARDS,
    // The trap to blame for this death, or null.
    blame(stage) {
      const cause = stage.cause, fired = (type) => stage.traps.some((t) => t.def.type === type && t.fired);
      if (cause === 'pit') {
        for (const type of ['fakeFloor', 'collapse', 'shy', 'blink', 'spring', 'wind', 'reverse', 'gravity']) {
          if (type === 'blink' || type === 'wind' || type === 'reverse' || type === 'gravity' ? stage.traps.some((t) => t.def.type === type) : fired(type)) return type;
        }
        return 'pit';
      }
      if (cause === 'crush') return fired('mover') ? 'mover' : fired('crusher') ? 'crusher' : 'crush';
      if (cause === 'spikes' && (fired('hidden') || fired('spring'))) return fired('hidden') ? 'hidden' : 'spring';
      return CARDS[cause] ? cause : null;
    },
    // Records the trap as seen; returns its card the first time only.
    first(stage) {
      const k = this.blame(stage);
      if (!k) return null;
      const d = KF.Save.data;
      d.seenTraps = d.seenTraps || {};
      if (d.seenTraps[k]) return null;
      d.seenTraps[k] = true; KF.Save.write();
      return { key: k, name: CARDS[k][0], joke: CARDS[k][1] };
    },
  };
})(window.KF);
