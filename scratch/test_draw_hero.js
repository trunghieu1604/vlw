const fs = require('fs');
const window = { JXLOOK: {} };
eval(fs.readFileSync('c:/Users/TrungHieu/Desktop/vo-lam/vlw/js/jxlook.js', 'utf8'));

const JXL = window.JXLOOK;

// Simulate character setup
const sx = 'm';
const eq = { horse: { d: 10, thanma: 'xtho' } };
const R = { mounted: true };

function jxRow(g, it) {
  const m = JXL.res[g]; if (!m) return -1;
  const id = 1; // default fallback
  const v = m[id] ?? m[1]; return v == null ? -1 : v - 2;
}

const JX_TM_ROW = { ovan: 5, xtho: 13, tanh: 3, dlo: 2, cdsu: 11, pvan: 1, btieu: 6, xlc: 9, duhuy: 4, tdia: 0, dvu: 8, squang: 10, pvu: 7, hhlc: 15, bhv: 11, pvtm: 10 };
function jxHorseRow(it) {
  if (it && it.thanma && JX_TM_ROW[it.thanma] != null && JXL.tabs[sx]) return JX_TM_ROW[it.thanma];
  const r = jxRow('horse', it); if (r >= 0) return r;
  const m = JXL.res.horse || {}; for (const k in m) if (m[k] >= 2) return m[k] - 2;
  return -1;
}

const rows = { helm: 0, armor: 0, weapon: 0, horse: eq.horse && R.mounted ? jxHorseRow(eq.horse) : -1 };
const wn = (JXL.wnames[sx] || [])[rows.weapon] || '空手';
const asc = JXL.assoc[sx][wn] || JXL.assoc[sx]['空手'];
const ride = rows.horse >= 0 && asc && asc[1] ? 1 : 0;
const currentAsc = asc ? asc[ride] || asc[0] : {};

console.log('rows:', rows);
console.log('ride:', ride);
console.log('currentAsc (Action mapping when riding):', currentAsc);

// Check body parts for 'st' (stand action) mapped to '骑马站立'
const jact = currentAsc['st'];
console.log('Action for "st":', jact);

const JX_PART_IDX = { '头部': 0, '发型': 1, '肩膀': 4, '躯体': 5, '左手': 6, '右手': 7, '左手武器': 8, '右手武器': 9, '马前': 12, '马中': 13, '马后': 14 };
const JX_GROUP = { '头部': 'helm', '发型': 'helm', '肩膀': 'armor', '躯体': 'armor', '左手': 'armor', '右手': 'armor', '左手武器': 'weapon', '右手武器': 'weapon', '马前': 'horse', '马中': 'horse', '马后': 'horse' };

const tabs = JXL.tabs[sx];
for (const part in JX_PART_IDX) {
  const grp = JX_GROUP[part];
  const r = rows[grp];
  const nm = (((tabs[part] || {})[r] || {})[jact]);
  console.log(`Part: ${part} (group: ${grp}, row: ${r}) -> Sheet Name: "${nm}"`);
}
