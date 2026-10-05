// Check that draw-order tables (JXL.sort) include horse parts 12/13/14 for riding actions.
const fs = require('fs');
const path = require('path');
const window = {};
eval(fs.readFileSync(path.join(__dirname, '..', 'js', 'jxlook.js'), 'utf8'));
const JXL = window.JXLOOK;

const RIDE_ACTS = ['骑马站立', '骑马跑步', '骑马攻击劈', '骑马魔法', '骑马受伤'];
for (const sx of ['m', 'f']) {
  const S2 = JXL.sort[sx];
  console.log(`\n=== sex ${sx} | sort sections: ${Object.keys(S2).length} ===`);
  for (const act of RIDE_ACTS) {
    const sec = S2[act];
    if (!sec) { console.log(`  ${act}: NO SECTION (falls back to DEFAULT)`); continue; }
    const d1 = sec.Dir1 || S2.DEFAULT.Dir1;
    const lines = Object.keys(sec).filter(k => k[0] === 'L').length;
    console.log(`  ${act}: Dir1 = [${d1.join(',')}] | Line overrides: ${lines}`);
  }
  console.log('  DEFAULT.Dir1 =', S2.DEFAULT.Dir1.join(','));
}

// Which horse rows have every part available as a real local image?
const isWebp = p => { try { const b = fs.readFileSync(p); return b.toString('ascii', 0, 4) === 'RIFF'; } catch { return false; } };
const tabs = JXL.tabs.m;
console.log('\n=== Horse rows with complete sprites (rd01 / stand) ===');
for (const row of Object.keys(tabs['马中'])) {
  const st = p => (tabs[p][row] || {})['骑马站立'];
  const ok = ['马前', '马中', '马后'].map(p => st(p) && isWebp(path.join(__dirname, '..', 'img', 'jx', 'm', st(p) + '.webp')));
  console.log(`  row ${row.padStart(2)}: head=${ok[0] ? 'OK' : '--'} body=${ok[1] ? 'OK' : '--'} tail=${ok[2] ? 'OK' : '--'}`);
}
