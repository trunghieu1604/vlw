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
global.setRowOk = (r) => r.d <= 10 && r.mag.length > 0 && !r.fixed;
global.sexReqOk = () => true;

console.log('=== Finding complete set groups for all factions ===');

function findCompleteSetGroups(kind, facId) {
  const rows = J.sets[kind].filter(r => {
    const reqFac = (r.req.find(q => q[0] === 39) || [0, -1])[1];
    return setRowOk(r) && sexReqOk(r.req) && (reqFac === -1 || reqFac === facId);
  });

  const byGrp = {};
  for (const r of rows) {
    const grpKey = r.sid ? 'sid_' + r.sid : (r.grp || r.n);
    (byGrp[grpKey] = byGrp[grpKey] || []).push(r);
  }

  // Filter groups that have most slots
  const groups = Object.entries(byGrp).map(([grp, items]) => {
    const slots = new Set(items.map(i => i.d));
    return { grp, sid: items[0].sid, grpName: items[0].grp, count: items.length, slotCount: slots.size, items };
  }).sort((a, b) => b.slotCount - a.slotCount || b.count - a.count);

  return groups;
}

for (const fac of global.FACTIONS) {
  console.log(`\n=================== Faction: ${fac.n} (id=${fac.id}) ===================`);
  ['gold', 'platina'].forEach(kind => {
    const grps = findCompleteSetGroups(kind, fac.id);
    console.log(`\nBest Set Group for ${kind}:`);
    if (grps.length > 0) {
      const best = grps[0];
      console.log(`Group Key: ${best.grp} | SID: ${best.sid} | Slots covered: ${best.slotCount}/10 | Total items in group: ${best.count}`);
      best.items.forEach(it => console.log(`   Slot ${it.d}: ${it.n} (cap ${it.lvl})`));
    }
  });
}
