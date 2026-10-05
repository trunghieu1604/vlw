const fs = require('fs');
const window = { JXLOOK: {} };
eval(fs.readFileSync('c:/Users/TrungHieu/Desktop/vo-lam/vlw/js/jxlook.js', 'utf8'));

const JXL = window.JXLOOK;
const sheets = JXL.sheets;

console.log('Total sheets in JXL.sheets:', Object.keys(sheets).length);

const horseSheetsInJXL = Object.keys(sheets).filter(s => s.includes('ma_h'));
console.log('Horse sheets in JXL.sheets:', horseSheetsInJXL.length);
console.log('Sample horse sheets:', horseSheetsInJXL.slice(0, 15));
