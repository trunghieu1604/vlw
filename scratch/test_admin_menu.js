const fs = require('fs');

const window = { JX: {}, WORLD: { zones: [], mon: {} } };
eval(fs.readFileSync('c:/Users/TrungHieu/Desktop/vo-lam/vlw/js/data.js', 'utf8'));
eval(fs.readFileSync('c:/Users/TrungHieu/Desktop/vo-lam/vlw/js/rdata.js', 'utf8'));
eval(fs.readFileSync('c:/Users/TrungHieu/Desktop/vo-lam/vlw/js/world.js', 'utf8'));
global.JX = window.JX;
global.J = window.JX;
eval(fs.readFileSync('c:/Users/TrungHieu/Desktop/vo-lam/vlw/js/core.js', 'utf8'));
eval(fs.readFileSync('c:/Users/TrungHieu/Desktop/vo-lam/vlw/js/setvi.js', 'utf8').replace('const SET_VI', 'var SET_VI = global.SET_VI'));
global.SET_VI = SET_VI;
eval(fs.readFileSync('c:/Users/TrungHieu/Desktop/vo-lam/vlw/js/sets.js', 'utf8'));

global.S = { uid: 1, sex: 0, fac: 'gaibang', lvl: 200, inv: [] };
global.FAC = { gaibang: { id: 5, n: 'Cái Bang' } };

function adminGetFullSet(kind) {
  const facId = global.FAC[global.S.fac] ? global.FAC[global.S.fac].id : -1;
  const rows = J.sets[kind].filter(r => {
    const reqFac = (r.req.find(q => q[0] === 39) || [0, -1])[1];
    return setRowOk(r) && sexReqOk(r.req) && (reqFac === -1 || reqFac === facId);
  });

  const added = [];
  for (let slot = 0; slot <= 9; slot++) {
    const slotRows = rows.filter(r => r.d === slot).sort((a,b) => b.lvl - a.lvl);
    if (slotRows.length) {
      const it = makeSetItem(kind, slotRows[0], 10);
      it.enh = 10;
      global.S.inv.push(it);
      added.push(it);
    }
  }
  return added;
}

console.log('--- Testing Gold Set +10 ---');
const goldItems = adminGetFullSet('gold');
goldItems.forEach(it => console.log(`Slot ${it.d}: ${it.n} | cap ${it.lvl} | +${it.enh} | r=${it.r}`));

console.log('\n--- Testing Platinum Set +10 ---');
const platItems = adminGetFullSet('platina');
platItems.forEach(it => console.log(`Slot ${it.d}: ${it.n} | cap ${it.lvl} | +${it.enh} | r=${it.r}`));
