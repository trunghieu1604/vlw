const fs = require('fs');

const window = { JX: {}, WORLD: { zones: [], mon: {} } };
eval(fs.readFileSync('c:/Users/TrungHieu/Desktop/vo-lam/vlw/js/data.js', 'utf8'));
eval(fs.readFileSync('c:/Users/TrungHieu/Desktop/vo-lam/vlw/js/rdata.js', 'utf8'));
eval(fs.readFileSync('c:/Users/TrungHieu/Desktop/vo-lam/vlw/js/world.js', 'utf8'));
global.JX = window.JX;
global.J = window.JX;
global.FACTIONS = [
  { id: 0, n: 'Thiếu Lâm' },
  { id: 1, n: 'Thiên Vương' },
  { id: 2, n: 'Đường Môn' },
  { id: 3, n: 'Ngũ Độc' },
  { id: 4, n: 'Nga My' },
  { id: 5, n: 'Thúy Yên' },
  { id: 6, n: 'Cái Bang' },
  { id: 7, n: 'Thiên Nhẫn' },
  { id: 8, n: 'Võ Đang' },
  { id: 9, n: 'Côn Lôn' }
];

eval(fs.readFileSync('c:/Users/TrungHieu/Desktop/vo-lam/vlw/js/core.js', 'utf8'));
global.SET_VI = {};
eval(fs.readFileSync('c:/Users/TrungHieu/Desktop/vo-lam/vlw/js/setvi.js', 'utf8'));
global.SET_VI = window.SET_VI;

const setRowOk = r => r.d <= 10 && r.mag && r.mag.length > 0 && !r.fixed;
const sexReqOk = () => true;

function pickBestSetGroup(kind, facId) {
  const rows = J.sets[kind].filter(r => {
    const reqFac = (r.req.find(q => q[0] === 39) || [0, -1])[1];
    return setRowOk(r) && sexReqOk(r.req) && (reqFac === -1 || reqFac === facId);
  });

  const byGrp = {};
  for (const r of rows) {
    const key = r.grp || r.sid || r.n;
    (byGrp[key] = byGrp[key] || []).push(r);
  }

  // Find set group with highest average level and most items
  let bestKey = null, bestScore = -1, bestGroup = [];
  for (const key in byGrp) {
    const group = byGrp[key];
    const uniqueSlots = new Set(group.map(i => i.d)).size;
    const maxLvl = Math.max(...group.map(i => i.lvl));
    const score = uniqueSlots * 1000 + maxLvl;
    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
      bestGroup = group;
    }
  }

  return { key: bestKey, items: bestGroup };
}

for (const fac of global.FACTIONS) {
  console.log(`\n=================== Faction: ${fac.n} (id=${fac.id}) ===================`);
  ['gold', 'platina'].forEach(kind => {
    const res = pickBestSetGroup(kind, fac.id);
    console.log(`[${kind.toUpperCase()}] Best Group: "${res.key}" (${res.items.length} items):`);
    res.items.forEach(it => console.log(`   Slot ${it.d}: ${it.n} (grp=${it.grp}, sid=${it.sid}, lvl=${it.lvl})`));
  });
}
