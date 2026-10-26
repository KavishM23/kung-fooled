// Screenshots one part of a level in the real game, for checking how a realm family looks.
// Usage:  node tools/famshots.js eightbit-1 3 /path/to/outprefix [columnsPerShot]
// Writes outprefix_0.png, _1.png ... walking the camera across the part (physics frozen, so
// traps don't fire), and outprefix_sheet.png with all of them (needs python3 + PIL).
'use strict';
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { execFileSync } = require('child_process');
const path = require('path');

(async () => {
  const [stage, part = '1', out = '/tmp/famshot', stepArg = '20'] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 768, height: 432 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  const url = 'file://' + path.join(__dirname, '..', 'index.html') + `?unlock=1&stage=${stage}`;
  await p.goto(url); await p.waitForTimeout(1600);
  const spots = await p.evaluate(([part, step]) => {
    const sc = KF.engine.scene, def = sc.def, z = def.routeZones[part - 1], w = sc.stage.world, out = [];
    for (let c = z.from + 6; c < z.to; c += step) {
      // stand on every floor in this column that has headroom, top to bottom
      for (let r = 1; r < w.rows; r++) if (w.visualSolid(c, r) && !w.visualSolid(c, r - 1) && !w.visualSolid(c, r - 2)) out.push([c, r]);
    }
    return out;
  }, [Number(part), Number(stepArg)]);
  let n = 0, lastCam = null;
  for (const [c, r] of spots) {
    const cam = await p.evaluate(([part, c, r]) => {
      const sc = KF.engine.scene, st = sc.stage, pl = st.player;
      st.step = () => {};
      st.part = part; pl.x = c * 16 + 3; pl.y = r * 16 - pl.h; pl.prevX = pl.x; pl.prevY = pl.y;
      sc.banner = null; sc.updateCamera(1); sc.cam.prevX = sc.cam.x; sc.cam.prevY = sc.cam.y;
      return [Math.round(sc.cam.x / 40), Math.round(sc.cam.y / 40)].join(',');
    }, [Number(part), c, r]);
    if (cam === lastCam) continue;
    lastCam = cam;
    await p.waitForTimeout(90);
    await p.screenshot({ path: `${out}_${n++}.png` });
    if (n >= 15) break;
  }
  await b.close();
  try {
    execFileSync('python3', ['-c', `
import sys
from PIL import Image
n=${n}; pre=sys.argv[1]
ims=[Image.open(f'{pre}_{i}.png').resize((384,216)) for i in range(n)]
s=Image.new('RGB',(384*3,216*((n+2)//3)))
for i,im in enumerate(ims): s.paste(im,((i%3)*384,(i//3)*216))
s.save(pre+'_sheet.png')`, out]);
  } catch (e) { console.log('(no sheet: python3/PIL unavailable)'); }
  console.log(`${n} shots -> ${out}_sheet.png; errors:`, errs.length ? [...new Set(errs)].slice(0, 5) : 'none');
})();
