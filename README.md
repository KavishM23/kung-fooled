# KUNG FOOLED

A troll platformer dressed as a late-90s arcade fighter. Run from the left of each stage to the
exit door. The stage will betray you. Learn each trap by dying to it; respawn is instant.

Between stages you fight. Each realm is five platform stages, a street fight after each of the
first four, and a boss at the end. Beat the boss to unlock the next realm. Fights and stages pay
coins, which buy outfits, headgear, hair, fist wraps, stat upgrades and special moves in the Dojo.

**Realms:** Rooftop at Dusk, Harbour, Neon Night Market, Temple Courtyard, Sky Express, Sakura
Spring, Viking Fjord. Each has its own arena art, music, traps and fighters.

**Every stage is a different world.** Inspired by how *There Is No Game* changes genre and
medium every chapter, each of the 35 stages is its own place, not a recolour. Examples:
- a 1950s TV studio set in black and white
- a comic-book city
- a handheld-RPG town in four greens
- a VHS home video of a backyard
- a silent-film dock and a blueprint drawing
- an AR phone game, rainy noir and a DOS pirate ship
- a corrupted-memory market, vaporwave, a funhouse of mirrors and a thermal camera
- a fake crash screen
- a notebook doodle, ink-wash mountains, night-vision ruins, text mode and a 3D toy-block room
- a wild-west railroad on the NES and a film negative of a subway
- a widescreen train robbery, a pop-art poster and an 80s vector arcade
- a pop-up book, a woodblock wave, a dream, a tea house and a holiday photo
- a runestone carving, the Bayeux tapestry, a mead hall by candlelight, a glacier cave and Valhalla

The art is drawn at twice the logical resolution, with shaded pixel-art fighters.

**Play:** open `index.html` in a browser. No build step, no server, no dependencies.

## Controls

| Key | Action |
| --- | --- |
| Arrow keys / A, D | Move |
| Space / W / Up | Jump (hold for higher) |
| R | Restart the stage |
| Esc | Pause (resume / restart / quit) |
| M | Mute |
| F1 | Show hitboxes and movement debug info |
| T (realm map) | Training dojo (the movement test stage) |
| C (realm map) | Dojo shop: customise and upgrade |
| F (realm map) | Street Arena: an endless ladder of fights for coins |

**Fights** (best of three rounds, 60 s each):

| Key | Action |
| --- | --- |
| A/D or arrows | Walk |
| W / Up / Space | Jump (punch or kick in the air for a jump kick) |
| S / Down | Block (takes a little chip damage) |
| J (or Z) | Punch. Press 3 times quickly for jab, cross, uppercut |
| K (or X) | Kick (slower, longer reach, more damage) |
| L (or C) | Special move, when the meter is at least half full |

Landing hits fills your special meter. Specials (buy more in the shop): Spirit Wave
(projectile), Tiger Rush (dashing elbow), Whirlwind Kick (multi-hit), Quake Stomp (ground wave).

Movement has 80 ms coyote time, 100 ms jump buffering and variable jump height (a tap hops about
1 tile, a full hold 3.5 tiles, 0.56 s in the air). Clipping a ceiling edge slides you past it, and
clipping a ledge's top corner while falling pops you up onto it.

Tip: `index.html?stage=harbour-3` jumps straight into a stage (`rooftop`, `harbour`, `neon`,
`temple`, `train`, `sakura`, `viking`, 1-5), `?fight=viking-2` into a street fight (5 = the boss),
`?scene=shop` into the shop, `?stage=training` into the dojo.

## Project layout

```
js/core.js       constants, helpers        js/sprites.js  the fighter, drawn from poses
js/input.js      keyboard                  js/themes.js   arena tiles + parallax backgrounds
js/physics.js    AABB movement             js/render.js   stage, traps, door, hitbox overlay
js/world.js      tile grid, map parsing    js/fx.js       sparks, dust, shake, speech bubbles
js/player.js     movement + tuning         js/bigtext.js  ROUND / K.O. / PERFECT lettering
js/traps.js      every trap type           js/hud.js      health bars, timer, death combo
js/stage.js      rules for one attempt     js/audio.js    Web Audio SFX + sequencer
js/levels/       doors and stages          js/music.js    the four chiptune tracks
js/scenes/       title, map, realm path,   tools/solve.js level checker (Node)
                 shop, fight, play          tools/fightsim.js fight balance (Node)
js/fight/        fighter, AI, roster        js/economy.js  shop items, upgrades, coins
js/styles.js     per-stage visual styles   js/envs/       per-stage environments
```

Each stage pairs a *style* (the medium) with an *environment* (the place). The environment is
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

Each realm is five stages. Stages live in `js/levels/world1.js`–`world7.js` (one file per realm).
Each one is a tile grid plus a trap list:

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
