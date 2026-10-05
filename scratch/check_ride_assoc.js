// Check which weapon types have a riding pose table (assoc[sx][weapon][1]) and whether the riding pose
// names actually exist in the horse part tables.
const fs = require('fs');
const path = require('path');
const window = {};
eval(fs.readFileSync(path.join(__dirname, '..', 'js', 'jxlook.js'), 'utf8'));
const JXL = window.JXLOOK;

for (const sx of ['m', 'f']) {
  console.log(`\n=== sex ${sx} ===`);
  console.log('wnames:', JSON.stringify(JXL.wnames[sx]));
  const horseActs = new Set(Object.values(JXL.tabs[sx]['马中'][0] || {}));
  const horseActNames = new Set(Object.keys(JXL.tabs[sx]['马中'][0] || {}));
  console.log('horse body row0 has poses:', [...horseActNames].join(', '));
  for (const [wn, asc] of Object.entries(JXL.assoc[sx])) {
    const ride = asc[1];
    if (!ride) { console.log(`  ${wn}: NO RIDING POSE TABLE`); continue; }
    const missing = Object.entries(ride).filter(([k, v]) => !horseActNames.has(v)).map(([k, v]) => `${k}->${v}`);
    console.log(`  ${wn}: ride = ${JSON.stringify(ride)}${missing.length ? '  | horse lacks: ' + missing.join(', ') : ''}`);
  }
}
