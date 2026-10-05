const fs = require('fs');
const window = { JX: {}, WORLD: { zones: [], mon: {} } };
eval(fs.readFileSync('c:/Users/TrungHieu/Desktop/vo-lam/vlw/js/data.js', 'utf8'));
eval(fs.readFileSync('c:/Users/TrungHieu/Desktop/vo-lam/vlw/js/rdata.js', 'utf8'));
eval(fs.readFileSync('c:/Users/TrungHieu/Desktop/vo-lam/vlw/js/world.js', 'utf8'));
global.JX = window.JX;
global.J = window.JX;

console.log('Total Platina items:', J.sets.platina.length);

const setsByGrp = {};
for (const r of J.sets.platina) {
  const grp = r.grp || r.sid || r.n;
  (setsByGrp[grp] = setsByGrp[grp] || []).push(r);
}

console.log('\n--- Platina Sets Summary ---');
for (const grp in setsByGrp) {
  const items = setsByGrp[grp];
  const slots = new Set(items.map(i => i.d));
  console.log(`Group "${grp}" (sid: ${items[0].sid}): ${items.length} items across slots: [${Array.from(slots).sort((a,b)=>a-b).join(', ')}]`);
  items.forEach(i => console.log(`   Slot ${i.d}: ${i.n}`));
}
