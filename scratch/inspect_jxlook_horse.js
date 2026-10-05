const fs = require('fs');
const window = { JXLOOK: {} };
eval(fs.readFileSync('c:/Users/TrungHieu/Desktop/vo-lam/vlw/js/jxlook.js', 'utf8'));

const JXL = window.JXLOOK;
console.log('JXL keys:', Object.keys(JXL));
console.log('JXL.res:', JXL.res);
console.log('JXL.tabs m parts:', Object.keys(JXL.tabs.m || {}));
console.log('JXL.tabs f parts:', Object.keys(JXL.tabs.f || {}));

if (JXL.tabs.m) {
  console.log('JXL.tabs.m 马前:', JXL.tabs.m['马前']);
  console.log('JXL.tabs.m 马中:', JXL.tabs.m['马中']);
  console.log('JXL.tabs.m 马后:', JXL.tabs.m['马后']);
}
