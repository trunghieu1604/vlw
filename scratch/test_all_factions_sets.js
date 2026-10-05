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
eval(fs.readFileSync('c:/Users/TrungHieu/Desktop/vo-lam/vlw/js/sets.js', 'utf8'));
global.makeSetItem = makeSetItem;

const setRowOk = r => r.d <= 10 && r.mag && r.mag.length > 0 && !r.fixed;
const sexReqOk = () => true;

function adminEquipFullSet(kind, facId) {
  const rows = J.sets[kind].filter(r => {
    const reqFac = (r.req.find(q => q[0] === 39) || [0, -1])[1];
    return setRowOk(r) && sexReqOk(r.req) && (reqFac === -1 || reqFac === facId);
  });

  const byGrp = {};
  for (const r of rows) {
    const key = r.grp || r.sid || r.n;
    (byGrp[key] = byGrp[key] || []).push(r);
  }

  // Pick group with highest level & most slots
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

  const eqItems = {};
  const addedList = [];

  for (const r of bestGroup) {
    const it = makeSetItem(kind, r, 10);
    it.enh = 10;
    if (r.d === 0 || r.d === 1) eqItems.weapon = it;
    else if (r.d === 2) eqItems.armor = it;
    else if (r.d === 7) eqItems.helm = it;
    else if (r.d === 6) eqItems.belt = it;
    else if (r.d === 5) eqItems.boot = it;
    else if (r.d === 8) eqItems.cuff = it;
    else if (r.d === 4) eqItems.amulet = it;
    else if (r.d === 9) eqItems.pendant = it;
    else if (r.d === 3) {
      if (!eqItems.ring1) eqItems.ring1 = it;
      else if (!eqItems.ring2) {
        const ring2 = makeSetItem(kind, r, 10);
        ring2.enh = 10;
        eqItems.ring2 = ring2;
      }
    }
    addedList.push(it);
  }

  if (eqItems.ring1 && !eqItems.ring2) {
    const r3 = bestGroup.find(r => r.d === 3) || bestGroup[0];
    eqItems.ring2 = makeSetItem(kind, r3, 10);
    eqItems.ring2.enh = 10;
  }

  return { eqItems, count: Object.keys(eqItems).length };
}

for (const f of global.FACTIONS) {
  const g = adminEquipFullSet('gold', f.id);
  const p = adminEquipFullSet('platina', f.id);
  console.log(`Faction ${f.n}: Gold slots=${g.count}, Platina slots=${p.count}`);
}
