// Prints one part of a built level as text, with its traps marked, for designing realm families.
// Usage:  node tools/famview.js eightbit 1 3     (realm, level 1-4, part 1-4)
// Trap letters (a, b, c...) are drawn at each trap's `at` tile and listed underneath.
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..');
const sb = { console, Math, JSON, Object, Array, Set, Map, Uint8Array, Error, parseInt, Number };
sb.window = sb; vm.createContext(sb);
for (const file of ['core.js', 'physics.js', 'world.js', 'player.js', 'traps.js', 'combat.js', 'stage.js', 'rules.js', 'levels/doors.js', 'levels/routes.js'])
  vm.runInContext(fs.readFileSync(path.join(root, 'js', file), 'utf8'), sb, { filename: file });
for (const file of fs.readdirSync(path.join(root, 'js/levels')).filter((f) => /^(world\d+|tall_[a-z]+)\.js$/.test(f)).sort())
  vm.runInContext(fs.readFileSync(path.join(root, 'js/levels', file), 'utf8'), sb, { filename: file });
for (const file of fs.readdirSync(path.join(root, 'js/families')).filter((f) => f.endsWith('.js')).sort())
  try { vm.runInContext(fs.readFileSync(path.join(root, 'js/families', file), 'utf8'), sb, { filename: file }); }
  catch (e) { console.log(`WARNING: family ${file} did not load: ${e.message}`); }

const [realm, level = 1, part = 1] = process.argv.slice(2);
const door = sb.KF.Doors.find((d) => d.id === realm);
if (!door) { console.log('realms:', sb.KF.Doors.map((d) => d.id).join(' ')); process.exit(1); }
const def = door.stages[level - 1], zone = def.routeZones[part - 1];
const rows = def.map.map((r) => r.slice(zone.from, zone.to).split(''));
const marks = [];
def.traps.forEach((t, i) => {
  if (!t.at && !t.zone) return;
  const [c, r] = t.at || t.zone;
  if (c < zone.from || c >= zone.to) return;
  const letter = String.fromCharCode(97 + (marks.length % 26));
  if (rows[r]) rows[r][c - zone.from] = letter;
  marks.push(`${letter} ${t.type} at ${JSON.stringify(t.at || t.zone)}${t.deaths !== undefined ? ' deaths ' + JSON.stringify(t.deaths) : ''}${i === (def.baits[[0, -1, 1, 2][part - 1]] || {}).trick ? '  <- trick' : ''}`);
});
const name = (def.parts[part - 1] || {}).name;
console.log(`${realm} ${level} "${def.name}" part ${part}: ${name}  (${def.family}, cols ${zone.from}-${zone.to}, ${def.map.length} rows)`);
const ruler = Array.from({ length: zone.to - zone.from }, (_, i) => (i % 10 ? (i % 5 ? ' ' : '.') : String((i / 10) % 10))).join('');
console.log('   ' + ruler);
rows.forEach((r, i) => { const line = r.join(''); if (line.trim().replace(/\./g, '')) console.log(String(i).padStart(2) + ' ' + line); });
console.log(marks.join('\n'));
