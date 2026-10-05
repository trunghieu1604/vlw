const fs = require('fs');
const window = { JXLOOK: {} };
eval(fs.readFileSync('c:/Users/TrungHieu/Desktop/vo-lam/vlw/js/jxlook.js', 'utf8'));

const JXL = window.JXLOOK;

const JX_TM_ROW = { ovan: 5, xtho: 13, tanh: 3, dlo: 2, cdsu: 11, pvan: 1, btieu: 6, xlc: 9, duhuy: 4, tdia: 0, dvu: 8, squang: 10, pvu: 7, hhlc: 15, bhv: 11, pvtm: 10 };

function jxRow(g, it) {
  const m = JXL.res[g]; if (!m) return -1;
  const id = it && (it.p != null) ? it.p + 2 : 1;
  const v = m[id] ?? m[1]; return v == null ? -1 : v - 2;
}

function jxHorseRow(it) {
  if (!it) return -1;
  if (it.thanma && JX_TM_ROW[it.thanma] != null) return JX_TM_ROW[it.thanma];
  const r = jxRow('horse', it);
  if (r >= 0) return r;
  const lvl = Math.max(1, Math.min(10, it.lvl || 1));
  const m = JXL.res.horse || {};
  if (m[lvl] != null) return m[lvl] - 2;
  return 0;
}

const jxSheetKey = (sx, nm) => {
  if (nm.startsWith('m:')) return 'm/' + nm.slice(2);
  if (nm.startsWith('ma_')) return 'm/' + nm;
  return sx + '/' + nm;
};

// Test 4 cases: Male Thần Mã, Female Thần Mã, Male Normal Horse, Female Normal Horse
const testCases = [
  { sx: 'm', name: 'Male + Thần Mã Xích Thố', eq: { horse: { d: 10, thanma: 'xtho' } } },
  { sx: 'f', name: 'Female + Thần Mã Xích Thố', eq: { horse: { d: 10, thanma: 'xtho' } } },
  { sx: 'm', name: 'Male + Normal Horse', eq: { horse: { d: 10, lvl: 5 } } },
  { sx: 'f', name: 'Female + Normal Horse', eq: { horse: { d: 10, lvl: 5 } } }
];

for (const tc of testCases) {
  const rows = { helm: 0, armor: 0, weapon: 0, horse: jxHorseRow(tc.eq.horse) };
  const wn = (JXL.wnames[tc.sx] || [])[rows.weapon] || '空手';
  const asc = JXL.assoc[tc.sx][wn] || JXL.assoc[tc.sx]['空手'];
  const ride = rows.horse >= 0 && asc && asc[1] ? 1 : 0;
  const currentAsc = asc ? asc[ride] || asc[0] : {};

  console.log(`\n=== Testing Case: ${tc.name} ===`);
  console.log(`rows.horse = ${rows.horse} | ride = ${ride}`);
  
  const jact = currentAsc['st'];
  const tabs = JXL.tabs[tc.sx];
  const parts = ['马前', '马中', '马后'];
  
  let okCount = 0;
  for (const part of parts) {
    const nm = (((tabs[part] || {})[rows.horse] || {})[jact]);
    if (!nm) {
      console.log(`   FAIL: Part ${part} sheet name missing!`);
      continue;
    }
    const sk = jxSheetKey(tc.sx, nm);
    const m = JXL.sheets[sk];
    if (m) {
      console.log(`   SUCCESS: Part ${part} -> Sheet Key: "${sk}" FOUND!`);
      okCount++;
    } else {
      console.log(`   FAIL: Part ${part} -> Sheet Key: "${sk}" NOT FOUND in JXL.sheets!`);
    }
  }
  console.log(`Result: ${okCount}/3 horse parts ready to render.`);
}
