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

function getFullPlatinaSetForFaction(facId) {
  // Filter rows suitable for facId
  const validRows = J.sets.platina.filter(r => {
    if (r.d > 9 || r.fixed || !r.mag || r.mag.length === 0) return false;
    const reqFac = (r.req.find(q => q[0] === 39) || [0, -1])[1];
    return (reqFac === -1 || reqFac === facId);
  });

  // Group by (Prefix Word 1 + Prefix Word 2 + reqFac)
  const groups = {};
  for (const r of validRows) {
    const clean = r.n.replace(/^\[[^\]]*\]\s*/, '');
    const parts = clean.split(' ');
    // Group key e.g. "Kim Ô Cẩm Lan", "Phục Hi", "Bạch Hổ Phổ Tế"
    const prefix = parts.slice(0, 2).join(' ');
    const reqFac = (r.req.find(q => q[0] === 39) || [0, -1])[1];
    const key = `${prefix}_fac${reqFac}`;
    (groups[key] = groups[key] || []).push(r);
  }

  // Find groups that have all slots from 0 to 9 or max distinct slots
  const sortedGroups = Object.entries(groups).map(([key, items]) => {
    const slots = new Map();
    items.forEach(it => {
      // Keep highest level item for each slot
      if (!slots.has(it.d) || it.lvl > slots.get(it.d).lvl) {
        slots.set(it.d, it);
      }
    });
    const maxLvl = Math.max(...items.map(i => i.lvl));
    return { key, slotCount: slots.size, maxLvl, items: Array.from(slots.values()).sort((a,b)=>a.d-b.d) };
  }).sort((a, b) => b.slotCount - a.slotCount || b.maxLvl - a.maxLvl);

  return sortedGroups[0];
}

for (const fac of global.FACTIONS) {
  const setInfo = getFullPlatinaSetForFaction(fac.id);
  console.log(`\n=== Faction: ${fac.n} (id=${fac.id}) ===`);
  console.log(`Set Name Key: ${setInfo.key} | Total Slots: ${setInfo.slotCount}/10 | Max Level: ${setInfo.maxLvl}`);
  setInfo.items.forEach(it => console.log(`   Slot ${it.d}: ${it.n} (Lv ${it.lvl})`));
}
