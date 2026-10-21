# KUNG FOOLED

A troll platformer dressed as a late-90s arcade fighter. Run from the left of each stage to the
exit door. The stage will betray you. Learn each trap by dying to it; respawn is instant.

**Ten realms, ten styles.** Each realm is one visual medium, and its four levels are different
places shown in that medium. The realms are ARCADE (full colour), RETRO (cinematic black and white),
POCKET (four Game Boy greens), COMIC, AR GO (the world through your phone), 8-BIT, WOODBLOCK
(Edo prints), VHS (home video), VAPORWAVE and CYBER. In Retro, you travel through a
lamp-lit street, moonlit rooftops, a night train and a reflective canal.
Each realm's style also brings its own rule, K.O. card and sounds.

A realm runs level, level, street fight, level, level, boss. **Every realm and every node is
open from the start.** Clearing them tracks progress and pays coins, which buy outfits, headgear, hair, fist wraps, stat
upgrades and special moves in the Dojo. Each realm's street fighter and boss suit its style:
Johnny TV and the bowler-hatted Bramble in Retro, Bug Kid and Grandma Hana in Pocket, and
Volt and THE SYSTEM in Cyber. Every other fighter appears in the Street Arena.

**Cyber and SUPERHOT.** The last realm's places are a neon megacity, a hologram district and
chrome Y2K. Its finale is a continuous side-on SUPERHOT tribute: move through the level,
aim and shoot red crystal sentinels, dodge or block their bullets, and defeat THE SYSTEM
inside the level to open the exit. Time crawls while you stand still, and defeated enemies
shatter into shards. The clean white atrium uses faceted figures, extruded geometry and
perspective scenery while movement stays on a flat side-view plane. Press F or V to shoot
forward, or aim and click; J, Z, K or X strike nearby enemies, and S or Down blocks.

Arcade, Pocket and 8-Bit keep their pixel art. Retro, Comic, AR GO, Woodblock, VHS,
Vaporwave and Cyber draw smooth characters and scenery in their own materials.

**Every world has its own K.O., start and win cards and sounds.** Some examples:
- Retro shows silent-film intertitles with projector and piano sounds.
- The silent film shows an intertitle over projector rattle and a piano sting.
- The Game Boy world shows GAME OVER with a pulse-wave jingle.
- The comic world shows a POW! burst with a slide whistle.
- The woodblock print shows a red seal with a shamisen.
- The tapestry shows HIC CADIT with lute plucks.

All of it is drawn and synthesised in code (`js/present.js`, `js/audio.js`).

**Arena styles.** The other styles built along the way still appear as random looks for
Street Arena fights. They include silent film, noir, blueprint, glitch, thermal camera, ink wash,
pop art, a pop-up book, the Bayeux tapestry and more.

**Each style bends one rule**, shown on the level's title card. Some examples:
- The silent film runs undercranked, so everything is 15% faster.
- Vaporwave is "slowed + reverb", so everything runs at 80%.
- The NES world gives full-height jumps only.
- The glacier is ice everywhere, and the dream has low gravity.
- The Great Wave blows a headwind.
- Noir's lights cut out.
- The comic and pop-art worlds move one panel at a time, and the notebook's pencil only draws what's near you.
- The blueprint marks every trap, and the VHS tape rewinds your deaths.

The rules live in `js/rules.js`, and the level checker applies them, so every level is proved
beatable with its rule on.

**Play:** open `index.html` in a browser. No build step, no server, no dependencies.

## Controls

There are two full control sets, and both work at the same time. Use whichever you like; the
on-screen hints follow the one you last used.

| Action | Set 1: WASD | Set 2: Arrows | Mouse |
| --- | --- | --- | --- |
| Move / walk | A, D | Left, Right | |
| Jump (hold for higher) | W / Space | Up / Space | |
| Block (fights) | S | Down | |
| Punch (3 quick presses: jab, cross, uppercut) | J | Z | Left click |
| Kick | K | X | Right click |
| Special (meter at least half full) | L | C | |
| Shoot (SUPERHOT level; hold to repeat) | F | V | Aim + left click |
| Restart the level | R | R | |
| Pause | Esc / P | Esc / P | Pause button, top right |

Every menu, card and button can also be clicked. Other keys: M mutes, and F1 shows hitboxes.
On the realm map, C opens the shop, F the Street Arena and T the training dojo.

Fights are best of three rounds, 60 s each.

Landing hits fills your special meter. Specials (buy more in the shop): Spirit Wave
(projectile), Tiger Rush (dashing elbow), Whirlwind Kick (multi-hit), Quake Stomp (ground wave).

Movement has 80 ms coyote time, 100 ms jump buffering and variable jump height (a tap hops about
1 tile, a full hold 3.5 tiles, 0.56 s in the air). Clipping a ceiling edge slides you past it, and
clipping a ledge's top corner while falling pops you up onto it.

Tip: `index.html?stage=oldtv-3` jumps straight into a level. It takes
each realm id (`arcade`, `oldtv`, `pocket`, `comic`, `argo`, `eightbit`, `woodblock`,
`vhs`, `vapor`, `cyber`) with level 1-4, and `?fight=oldtv-1` into a realm's street fight (`-2` = the boss).
`?fight=cyber-2` opens Cyber's integrated SUPERHOT finale instead of a separate fight.
Use `?scene=shop` for the shop and `?stage=training` for the dojo.

## Project layout

```
js/core.js       constants, helpers        js/sprites.js  the fighter, drawn from poses
js/input.js      keyboard                  js/themes.js   arena tiles + parallax backgrounds
js/physics.js    AABB movement             js/render.js   stage, traps, door, hitbox overlay
js/world.js      tile grid, map parsing    js/fx.js       sparks, dust, shake, speech bubbles
js/player.js     movement + tuning         js/bigtext.js  ROUND / K.O. / PERFECT lettering
js/traps.js      every trap type           js/hud.js      health bars, timer, death combo
js/stage.js      rules for one attempt     js/combat.js   in-level SUPERHOT combat
js/levels/       doors and stages          js/music.js    the four chiptune tracks
js/scenes/       title, map, realm path,   tools/solve.js level checker (Node)
                 shop, fight, play          tools/fightsim.js fight balance (Node)
tools/combatcheck.js integrated finale check
js/fight/        fighter, AI, roster        js/economy.js  shop items, upgrades, coins
js/styles.js     per-stage visual styles   js/envs/       per-stage environments
js/rules.js      world names + rules       js/present.js  per-world cards and sounds
```

Each level pairs a *style* (the medium) with an *environment* (the place) and a *rule*
(`js/rules.js`: the world's name, its one-line twist, and any physics changes). The environment is
a full theme with its own scenery, tiles and props, registered with
`KF.Env.add(styleId, theme, extra)` in `js/envs/<realm>.js`. Styles are post-process passes over the rendered world, plus optional hooks: `under`/`overlay`
drawing, `compose` (for example the AR phone frame), a theme override (ASCII, BSOD), `res`
(1 = chunky low-res), `extrude` (3D faces), a custom K.O. card and an audio low-pass filter.
`KF.StylePlan` in `js/styles.js` assigns a style to each stage. A stage can also set
`style: 'noir'` directly.

Fighters, the player included, are all built from one code-drawn skeleton. A *look* (outfit
style and colours, hair, headgear, beard, skin) picks the materials, so every shop item and
every opponent is a few lines of data: see `js/economy.js` and `js/fight/roster.js`.
`node tools/fightsim.js 0.45 30 2` plays AI-vs-AI fights to check each opponent's win rate
for a player of a given skill and upgrade level.

All movement numbers are in `KF.PlayerTuning` at the top of `js/player.js`.

## Adding a stage

Stages live in `js/levels/world1.js` to `world9.js`, grouped in buckets (`rooftop`, `harbour`, ...,
`cyber`). `js/levels/doors.js` deals the buckets out to the ten realms in order, so difficulty
keeps rising, and gives each level its realm's style and a place (`envs`). Each stage is a tile
grid plus a trap list:

```js
KF.addStage('rooftop', {
  name: 'MY STAGE',
  map: [                      // 14 rows; any width (24 columns fill one screen)
    '..............................',
    // ...
    '..P.......................D...',
    '##############################',
    '##############################',
    '##############################',
  ],
  labels: [{ at: [4, 10], text: 'EASY!' }],    // signboard standing on the tile below
  traps: [
    { type: 'collapse', at: [13, 11, 3, 3], say: 'OOPS' },
  ],
});
```

Map legend: `#` solid, `=` solid prop block (crate / AC unit / stall), `-` one-way platform, `~` ice,
`^ v < >` spikes, `P` spawn, `D` exit door (its bottom tile), `U` upside-down exit hanging from a
ceiling (its top tile). Falling below the map kills; the left and right edges are walls.

To add a whole new realm, add an entry to `KF.Doors` in `js/levels/doors.js`, a theme in
`js/themes.js` (themes provide `build`, `background` and `tile`), a music track in `js/music.js`
and its four street fighters and boss in `js/fight/roster.js`.

## Traps

All coordinates are in tiles: `at: [column, row, width, height]`. Trap tiles you draw in the map
with `#` are taken over by the trap, so the trap looks exactly like the floor around it.

| type | fields | default trigger |
| --- | --- | --- |
| `collapse` | `at` | stood on |
| `spikes` | `at: [c, r, length]`, `dir: up/down/left/right` | player within 1.5 tiles |
| `crusher` | `at` (block in a ceiling), `gravity` | player passes underneath |
| `spring` | `at: [c, r]`, `power`, `vx`, `control` (seconds of momentum) | landed on |
| `shy` | `at: [c, r, w]`, `path: [[dx, dy], ...]`, `near`, `speed` | player within `near` tiles, once per leg |
| `doorRun` | `path: [{ to: [c, r], near, speed, say }, ...]` | player within `near` of the door, per leg |
| `fakeDoor` | `at: [c, r]` | touched (it punches). Fakes have no lantern. |
| `gravity` | `zone: [c, r, w, h]`, `g: -1 or 1`, `hidden` | entering the zone |
| `reverse` | `zone`, `hidden` | while inside the zone |
| `hidden` | `at: [c, r]` | jumping into it from below |
| `mover` | `at`, `path`, `speed` (moves a chunk of level, crushes) | needs `when` |
| `taunt` | `at`, `text` | needs `when` |
| `fakeFloor` | `at` (drawn like floor, not solid) | always |
| `wind` | `zone`, `force` (px/s, + = right), `gust: [on, off]` | while inside and blowing |
| `blink` | `at: [c, r, w]`, `on`, `off`, `offset` (seconds) | timer; flickers before vanishing |
| `axe` | `at: [c, r]` pivot, `len` (tiles), `amp` (radians), `speed`, `offset` | always swinging |

Fields every trap accepts:

- `when`: trigger conditions, all of which must hold. `x: 12` (player right of column 12),
  `xl: 12` (left of it), `zone: [c, r, w, h]`, `near: 3`, `time: 1.5` (seconds since spawn),
  `after: 'id'` (another trap fired), `touch`, `airborne`, `grounded`.
- `delay`: seconds between trigger and firing. The trap shakes during it.
- `deaths`: which attempts the trap exists on, counted as deaths so far on this stage:
  `[0]` first attempt only, `['1+']` from the second attempt on, `[0, '2+']` fire, rest, fire again.
- `id`: name for `after` chains. `say`: speech bubble when it fires.

Hidden zones and hidden blocks stay revealed for the rest of the visit once they've caught you.

## Checking a level is fair

```
node tools/solve.js                 # every stage, every attempt variant
node tools/solve.js harbour 3       # one stage
VERBOSE=1 node tools/solve.js neon 2   # also print the winning input sequence
MARGIN=1 node tools/solve.js        # human-precision check (see below)
```

The checker runs the real game logic headless and searches for inputs that reach the door,
separately for each `deaths` variant. Every stage that ships passes on every variant, which is
the "no trap kills you with zero counterplay on the next attempt" rule made testable.

`MARGIN=1` makes it stricter: inputs may only change every 100 ms and the jump is 5% weaker. A
stage that still passes has slack in every gap and timing window, so it isn't pixel-perfect. Every
shipped stage passes both checks.
