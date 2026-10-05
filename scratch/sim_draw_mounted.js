// Run the real jxparts.js in Node with mocked game globals + a recording canvas, mount a horse, and see what gets drawn.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const isWebp = p => { try { return fs.readFileSync(p).toString('ascii', 0, 4) === 'RIFF'; } catch { return false; } };

global.window = global;
vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'js', 'jxlook.js'), 'utf8'));
global.J = window.JX;

// --- minimal game globals used by jxparts.js
global.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
global.reqOk = () => true;
global.sexReqOk = () => true;
global.baseRow = (detail, particular, tier) => {
  const g = J.items[detail]; if (!g) return null;
  const rows = g.list.filter(r => r.k === particular); if (!rows.length) return null;
  return rows.reduce((b, r) => Math.abs(r.lvl - tier) < Math.abs(b.lvl - tier) ? r : b);
};
const drawn = [];
global.CX = { globalAlpha: 1, drawImage: (im) => drawn.push(im.src) };
global.img = src => ({ src, complete: true, naturalWidth: isWebp(path.join(ROOT, src)) ? 100 : 0, failed: !isWebp(path.join(ROOT, src)) });

vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'js', 'jxparts.js'), 'utf8'));

function test(label, sex, horse) {
  global.S = { fac: 'shaolin', sex, eq: { horse }, jxLook: true };
  global.R = { mounted: true };
  const jx = jxSetup();
  global.R.jx = jx;
  drawn.length = 0;
  const h = drawJxHero('st', 2, 0.1, 0, 0, 1, 1, 'x');
  const horseParts = drawn.filter(s => /ma_h[hbt]_/.test(s));
  console.log(`\n[${label}] rows=${JSON.stringify(jx.rows)} ride=${jx.ride} st=${jx.asc.st} -> returned ${h}`);
  console.log(`   drew ${drawn.length} layers, horse layers: ${horseParts.length} ${horseParts.map(s => path.basename(s)).join(' ')}`);
}

const list = J.items[10].list;
test('male, shop horse (first row)', 0, { d: 10, k: list[0].k, p: list[0].p, lvl: list[0].lvl });
test('male, horse p=250', 0, { d: 10, k: 25, p: 250, lvl: 1 });
test('female, shop horse', 1, { d: 10, k: list[0].k, p: list[0].p, lvl: list[0].lvl });
for (const tm of ['ovan', 'xtho', 'tanh', 'dlo', 'cdsu', 'squang', 'hhlc', 'bhv'])
  test('male, Than Ma ' + tm, 0, { d: 10, thanma: tm, lvl: 1 });

// exhaustive: every horse item + every Than Ma, both sexes -> must draw all 3 horse layers
let bad = 0, total = 0;
const all = list.map(b => ({ d: 10, k: b.k, p: b.p, lvl: b.lvl, n: b.n }))
  .concat(Object.keys(JX_TM_ROW).map(tm => ({ d: 10, thanma: tm, lvl: 1, n: 'TM ' + tm })));
for (const sex of [0, 1]) for (const h of all) {
  global.S = { fac: 'shaolin', sex, eq: { horse: h }, jxLook: true }; global.R = { mounted: true };
  global.R.jx = jxSetup(); drawn.length = 0; drawJxHero('st', 2, 0.1, 0, 0, 1, 1, 'x');
  const n = drawn.filter(s => /ma_h[hbt]_/.test(s)).length; total++;
  if (n !== 3) { bad++; if (bad <= 10) console.log(`  INCOMPLETE: sex ${sex} ${h.n} (p=${h.p}) -> ${n}/3 layers, row ${R.jx.rows.horse}`); }
}
console.log(`\nEXHAUSTIVE: ${total - bad}/${total} horse cases draw a complete horse.`);
