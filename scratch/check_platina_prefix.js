const fs = require('fs');
const window = { JX: {}, WORLD: { zones: [], mon: {} } };
eval(fs.readFileSync('c:/Users/TrungHieu/Desktop/vo-lam/vlw/js/data.js', 'utf8'));
eval(fs.readFileSync('c:/Users/TrungHieu/Desktop/vo-lam/vlw/js/rdata.js', 'utf8'));
eval(fs.readFileSync('c:/Users/TrungHieu/Desktop/vo-lam/vlw/js/world.js', 'utf8'));
global.JX = window.JX;
global.J = window.JX;

console.log('--- Analyzing Platina Items ---');

// Group Platina items by their prefix or name base
const prefixMap = {};
for (const r of J.sets.platina) {
  if (r.d > 9) continue; // slot > 9
  // Extract base set name e.g. "Bạch Hổ", "Tuyên Viên", "Hắc thần", "Kim Ô", "Độc Cô", etc.
  const cleanName = r.n.replace(/^\[[^\]]*\]\s*/, '');
  const prefix = cleanName.split(' ')[0] + ' ' + (cleanName.split(' ')[1] || '');
  (prefixMap[prefix] = prefixMap[prefix] || []).push({ name: r.n, slot: r.d, level: r.lvl, raw: r });
}

for (const p in prefixMap) {
  const list = prefixMap[p];
  const slots = new Set(list.map(i => i.slot));
  if (slots.size >= 4) {
    console.log(`Prefix "${p}": ${list.length} items across slots: [${Array.from(slots).sort((a,b)=>a-b).join(', ')}]`);
    list.slice(0, 10).forEach(i => console.log(`   Slot ${i.slot}: ${i.name}`));
  }
}
