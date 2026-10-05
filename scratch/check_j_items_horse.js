const fs = require('fs');
const window = { JX: {} };
eval(fs.readFileSync('c:/Users/TrungHieu/Desktop/vo-lam/vlw/js/data.js', 'utf8'));

const horses = window.JX.items[10];
console.log('J.items[10] (Horse items):', horses ? horses.list.length : 'None');
if (horses) {
  horses.list.forEach(h => console.log(`   - Particular k=${h.k}, Name="${h.n}", Level=${h.lvl}, p=${h.p}`));
}
