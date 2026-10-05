const fs = require('fs');

const window = {};
eval(fs.readFileSync('c:/Users/TrungHieu/Desktop/vo-lam/vlw/js/data.js', 'utf8'));

const J = window.JX;

console.log('=== Checking all items for icons ===');
const missingIcons = new Set();
if (J.items) {
  for (const cat in J.items) {
    const list = J.items[cat].list || [];
    for (const it of list) {
      if (it.ic) {
        if (!fs.existsSync('c:/Users/TrungHieu/Desktop/vo-lam/vlw/' + it.ic.replace(/^\//, ''))) {
          missingIcons.add(it.ic);
        }
      }
    }
  }
}

console.log('Missing item icons:', Array.from(missingIcons));
