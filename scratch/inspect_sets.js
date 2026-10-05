const fs = require('fs');

const window = { JX: {}, WORLD: { zones: [], mon: {} } };
eval(fs.readFileSync('c:/Users/TrungHieu/Desktop/vo-lam/vlw/js/data.js', 'utf8'));
eval(fs.readFileSync('c:/Users/TrungHieu/Desktop/vo-lam/vlw/js/rdata.js', 'utf8'));
eval(fs.readFileSync('c:/Users/TrungHieu/Desktop/vo-lam/vlw/js/world.js', 'utf8'));
global.JX = window.JX;
global.J = window.JX;
global.FACTIONS = [{ id: 5, n: 'Cái Bang' }];
eval(fs.readFileSync('c:/Users/TrungHieu/Desktop/vo-lam/vlw/js/core.js', 'utf8'));
global.SET_VI = {};
eval(fs.readFileSync('c:/Users/TrungHieu/Desktop/vo-lam/vlw/js/setvi.js', 'utf8'));
global.SET_VI = window.SET_VI;
eval(fs.readFileSync('c:/Users/TrungHieu/Desktop/vo-lam/vlw/js/sets.js', 'utf8'));
global.setRowOk = setRowOk;
global.sexReqOk = sexReqOk;

console.log('=== Checking set groups for Cái Bang (facId = 5) ===');
const facId = 5;

['gold', 'platina'].forEach(kind => {
  console.log(`\n=================== Kind: ${kind} ===================`);
  const rows = J.sets[kind].filter(r => {
    const reqFac = (r.req.find(q => q[0] === 39) || [0, -1])[1];
    return setRowOk(r) && sexReqOk(r.req) && (reqFac === -1 || reqFac === facId);
  });

  const byGrp = {};
  for (const r of rows) {
    const grp = r.grp || r.sid || r.n;
    (byGrp[grp] = byGrp[grp] || []).push(r);
  }

  for (const grp in byGrp) {
    const groupRows = byGrp[grp];
    console.log(`\nSet Group: "${grp}" | sid: ${groupRows[0].sid} | items count: ${groupRows.length}`);
    groupRows.forEach(r => console.log(`   Slot ${r.d}: ${r.n} (sid=${r.sid}, grp=${r.grp}, lvl=${r.lvl})`));
  }
});
