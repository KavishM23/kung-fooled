# KUNG FOOLED

A troll platformer dressed as a late-90s arcade fighter. Run from the left of each stage to the
exit door. The stage will betray you. Learn each trap by dying to it; respawn is instant.

**Ten style realms, each with four levels.** Each realm shows different places in its medium.
The realms are ARCADE (full colour), RETRO (cinematic black and white),
POCKET (four Game Boy greens), COMIC, AR GO (the world through your phone), 8-BIT, WOODBLOCK
(Edo prints), VHS (home video), VAPORWAVE and CYBER. In Retro, you travel through a
lamp-lit street, moonlit rooftops, a night train and a reflective canal. The Chaplin-style
bowler-hatted player is deliberately chunky grayscale pixel art against those detailed backdrops.
Each realm's style also brings its own rule, K.O. card and sounds.

A realm runs level, level, street fight, level, level, boss. **Every realm and every node is
open from the start.** Clearing them tracks progress and pays coins, which buy outfits, headgear, hair, fist wraps, stat
upgrades and special moves in the Dojo. Each realm's street fighter and boss suit its style:
Johnny TV and the bowler-hatted Bramble in Retro, Bug Kid and Grandma Hana in Pocket, and
Volt and THE SYSTEM in Cyber. Every other fighter appears in the Street Arena.

Each realm level travels through four parts: an approach, the original hand-built room, an
interior, and a final exit area. Three intermediate doors connect them; each door is also a
checkpoint, so death starts the next attempt in the current part. The three generated parts are
long places (about 60 tiles, several screens) with a few big changes in height rather than many
small ones, and every height belongs to a structure:

- **Approach.** A long street, a scaffold up the side of a building, a sustained run across two
  roofs joined by a bridge, then the fire escape down to the yard. Or the other way round: down
  the fire escape first, along the street, and up the taller block opposite.
- **Interior.** Drop through a roof hatch, take the stairwell down to the hall below and leave by
  the service door, then climb a scaffold to the next roof. Or come in at the ground floor and go
  up the stairwell landings to the floor above and out onto the balcony.
- **Exit.** A long upper roof that ends where it has fallen in, a drop to the yard, a canal to
  jump and the climb up a tower to the door. Or the climb first, a long high roof, then down onto
  the lower roof and the exit.

Floors are solid down to the ground, so nothing floats, and `tools/partcheck.js` fails any
generated block that does, any token one- to three-tile step, and any section too short to be a
place. Each part hides one Level Devil trick on an apparently safe floor (the bridge, the hall,
the last roof). Three variations on a named trap concept develop across the level, and all six
trick types appear across the 40 levels. The hand-built room keeps its own traps, combat and
winding route; it now stands on ground too, and a floor trap in its bottom row takes the ground
beneath it, so nothing gives the trap away. Solid dividers prevent skipping parts, and revealed
traps leave small visual reminders on retries.

Behind the route, each structure is drawn where it stands: scaffold poles and ladders, the back
walls, windows and lamps of the rooms, the stairs in the stairwell, the bridge railings, the
zig-zag fire escape, a crane cable over a falling load. Built places get steel, brick and lit
windows; natural places get timber, rope, rock, caves and trees. Each level also has its own
distant landmarks and material details on exposed floors. The camera looks ahead during climbs and falls while tracking smoothly.

**Cyber and SUPERHOT.** The last realm's places are a neon megacity, a hologram district and
chrome Y2K. Its finale is a continuous side-on SUPERHOT tribute: move through the level,
aim and shoot red crystal sentinels, dodge or block their bullets, and defeat THE SYSTEM
inside the level to open the exit. Time crawls while you stand still, and defeated enemies
shatter into shards. The clean white atrium uses faceted figures, extruded geometry and
perspective scenery while movement stays on a flat side-view plane. Press F or V to shoot
forward, or aim and click; J, Z, K or X strike nearby enemies, and S or Down blocks.

Arcade, Pocket and 8-Bit keep their pixel art. Retro pairs a pixel character with detailed
scenery. Comic, AR GO, Woodblock, VHS, Vaporwave and Cyber draw smooth characters and
scenery in their own materials. Realm hazards include patrolling spike racks, timed beam
gates, moving conveyor floors and dart launchers. The belts change your ground speed;
the launchers show their firing lane so you can time a crossing.
Later stages also use swinging hammers, floors that crack and vanish when approached, and
saws that creep toward you while you face away. The floors reform after you move clear.

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

## Modes

Press Q on the realm map (or click MODES) for everything beyond the realms.

- **Endless Dojo** (also T on the map): an endless speedrun of generated rooms against a clock.
  You start with 45 seconds and each room you clear adds time. Rooms get longer and meaner as you
  go. Every room is built from hand-made chunks (`js/levels/chunks.js`) that the level checker has
  proved beatable, so a room can be cruel but never impossible.
- **Daily Troll:** one longer generated stage per day, the same for everyone. Press C on the win
  screen to copy your result (deaths and time) to share.
- **Versus:** two players on one keyboard. Player 1 uses WASD + J/K/L, player 2 uses the arrows +
  Z/X/C. Everyone gets the same stats, so it's down to skill.
- **Level editor:** paint tiles and drop traps with the mouse, TEST to play it, CHECK to run the
  level checker in your browser (a level that passes is stamped PROVEN BEATABLE), and SHARE to get
  a code. Anyone can paste the code into PLAY A LEVEL CODE. Editing a level drops its stamp.
- **Speedrun:** press R on a realm screen to run the whole realm (4 levels, street fight and boss)
  on one clock. The result screen shows splits against your best run, and a run with no deaths
  earns the realm's DEATHLESS badge.
- **Trophies:** 18 achievements, each paying coins. They pop up as you earn them.

Other things that happen along the way:
- When you clear a level after dying, press V to watch every attempt at once.
- Your best run on each level is saved and races you as a ghost the next time.
- The first time a trap gets you, a card names it.
- Bosses change at half health: faster, harder hitting, and with a full special meter.

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
On the realm map, C opens the shop, F the Street Arena, T the Endless Dojo and Q the other modes.
On a realm screen, R starts a speedrun of that realm.

Fights are best of three rounds, 60 s each.

On phones and tablets, on-screen buttons appear during levels (move and jump) and fights (block,
punch, kick, special). Menus work by tapping. Add `?touch=1` to show the buttons on a desktop.

Each red X in a level marks where you died earlier in that visit. The realm screen shows your best
deaths and best time for each level.

Landing hits fills your special meter. Specials (buy more in the shop): Spirit Wave
(projectile), Tiger Rush (dashing elbow), Whirlwind Kick (multi-hit), Quake Stomp (ground wave).

Movement has 80 ms coyote time, 100 ms jump buffering and variable jump height (a tap hops about
1 tile, a full hold 3.5 tiles, 0.56 s in the air). Clipping a ceiling edge slides you past it, and
clipping a ledge's top corner while falling pops you up onto it.

Tip: every realm, level and fight is open from the start.
`index.html?stage=oldtv-3` jumps straight into a level. It takes
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
js/levels/       doors, routes and stages  js/music.js    the four chiptune tracks
js/scenes/       title, map, realm path,   tools/solve.js level checker (Node)
                 shop, fight, play          tools/fightsim.js fight balance (Node)
tools/combatcheck.js integrated finale check
tools/partcheck.js   four-part progression check    js/scenery.js stage landmarks and materials
js/fight/        fighter, AI, roster        js/economy.js  shop items, upgrades, coins
js/styles.js     per-stage visual styles   js/envs/       per-stage environments
js/rules.js      world names + rules       js/present.js  per-world cards and sounds
js/modes.js      endless + daily stages    js/levels/chunks.js  stage pieces for them
js/solver.js     level checker (browser)   js/levelcode.js  editor share codes
js/ghosts.js     best-run ghosts, replays  js/achievements.js  trophies + trap cards
js/scenes/modes.js  modes menu, versus, speedrun results   js/scenes/editor.js  level editor
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
ceiling (its top tile). `js/levels/routes.js` places the source map and its traps in the middle
district, then builds the three generated parts around it. `A`, `B` and `C` mark the intermediate doors;
each takes the player to the next district. Falling below the map kills; the left and right
edges are walls.

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
| `lunger` | `at`, `speed`, `hop`, `range` | player within `range` tiles; the block leaps at you, then falls |
| `ambushFlame` | `at: [c0, floorRow, width]`, `warn`, `burn`, `h` | airborne nearby; predicts your landing column, a vent glows, then a flame column erupts |
| `water` | `at` | always on; you sink slowly, and jump swims upward |

The cyber realm's first three levels use these in the style of Trap Adventure 2. Its opener
has three stair blocks: the third one sprouts spikes, then on later attempts leaps at you, and
the start area closes in. These levels are also tall. They go under a tower into a flooded
undercity, down a building floor by floor, and to the sea floor. Level-wide options for that:
`depths: [{ r0, r1, c0, c1, kind }]` draws underground, interior or sea backdrops below the
skyline. `camera: 'flip'` switches to whole-screen flips. `noGates: true` turns off the automatic
part gates.

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
node tools/solve.js arcade 3        # one stage
VERBOSE=1 node tools/solve.js comic 2  # also print the winning input sequence
MARGIN=1 node tools/solve.js        # human-precision check (see below)
node tools/partcheck.js             # all four-part layouts and door order
```

The checker runs the real game logic headless and searches for inputs that pass all four parts,
separately for each `deaths` variant. A death restarts at the latest door, so each part is searched
from its own checkpoint (`WHOLE=1` searches a level in one go). Every stage that ships passes on every variant, which is
the "no trap kills you with zero counterplay on the next attempt" rule made testable.

`MARGIN=1` makes it stricter: inputs may only change every 100 ms and the jump is 5% weaker. A
stage that still passes has slack in every gap and timing window, so it isn't pixel-perfect. Every
shipped stage passes both checks.

For tall levels (`noGates`), the checker estimates the remaining distance as the length of
the open-tile path to the door rather than a straight line, so routes that double back down
floors or through a basin are searched efficiently. The generated parts use a stricter version
of that path (`KF.LongRoutes.walkField`): it only counts tiles a player can stand near or fall
through, so it scores the real way down the fire escape and back up the scaffold, not a line
through the air.

The chunks that build Endless Dojo rooms and Daily Trolls have their own checker:

```
node tools/chunks.js                # every chunk on its own, every attempt variant
MARGIN=1 node tools/chunks.js       # the same at human precision
MIX=40 node tools/chunks.js nonechunk     # 40 random rooms, made the way the game makes them
DAILY=5 FROM=0 node tools/chunks.js nonechunk   # the Daily Trolls for days 1 to 5
```

The editor's CHECK button runs the same search in the browser (`js/solver.js`), a slice per frame.
