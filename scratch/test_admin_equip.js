const fs = require('fs');

const window = { JX: {}, WORLD: { zones: [], mon: {} } };
eval(fs.readFileSync('c:/Users/TrungHieu/Desktop/vo-lam/vlw/js/data.js', 'utf8'));
eval(fs.readFileSync('c:/Users/TrungHieu/Desktop/vo-lam/vlw/js/rdata.js', 'utf8'));
eval(fs.readFileSync('c:/Users/TrungHieu/Desktop/vo-lam/vlw/js/world.js', 'utf8'));
global.JX = window.JX;
global.J = window.JX;
global.FACTIONS = [
  { id: 5, n: 'Cái Bang' }
];

eval(fs.readFileSync('c:/Users/TrungHieu/Desktop/vo-lam/vlw/js/core.js', 'utf8'));
global.SET_VI = {};
eval(fs.readFileSync('c:/Users/TrungHieu/Desktop/vo-lam/vlw/js/setvi.js', 'utf8'));
global.SET_VI = window.SET_VI;

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

  console.log(`\nPicked Set Group "${bestKey}" with ${bestGroup.length} item definitions.`);

  const eqItems = {};
  const addedList = [];

  // Map slots to items
  for (const r of bestGroup) {
    const it = { uid: Math.floor(Math.random() * 100000), d: r.d, k: r.k, n: r.n, lvl: r.lvl, s: r.s, r: kind === 'gold' ? 4 : 5, set: { kind, grp: r.grp, n1: r.n1 || 3, n2: r.n2 || 5, sid: r.sid }, enh: 10 };
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
        const ring2 = Object.assign({}, it, { uid: Math.floor(Math.random() * 100000) });
        eqItems.ring2 = ring2;
      }
    }
    addedList.push(it.n);
  }

  // If ring2 was missing from group (only 1 ring row in definition), duplicate ring1 as ring2
  if (eqItems.ring1 && !eqItems.ring2) {
    eqItems.ring2 = Object.assign({}, eqItems.ring1, { uid: Math.floor(Math.random() * 100000) });
  }

  return { eqItems, addedList };
}

const res = adminEquipFullSet('platina', 5);
console.log('Equipped Slots:');
for (const k in res.eqItems) {
  const i = res.eqItems[k];
  console.log(`  ${k}: ${i.n} (+${i.enh}) | grp=${i.set.grp} | sid=${i.set.sid}`);
}
