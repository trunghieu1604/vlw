const fs = require('fs');
const window = { JXLOOK: {} };
eval(fs.readFileSync('c:/Users/TrungHieu/Desktop/vo-lam/vlw/js/jxlook.js', 'utf8'));

const resHorse = window.JXLOOK.res.horse;
console.log('JXL.res.horse length:', resHorse ? resHorse.length : 'None');
console.log('JXL.res.horse values:', resHorse);
