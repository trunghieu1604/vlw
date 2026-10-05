const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function testJxHorseWebp() {
  console.log('Fetching jxlook.js ...');
  const jxlook = await fetchUrl('https://volamidle.pages.dev/js/jxlook.js?v=213');
  
  // Find horse mentions in jxlook.js
  const horseSheets = [...jxlook.matchAll(/['"]([^'"]*horse[^'"]*)['"]/gi)].map(m => m[1]);
  console.log(`Found ${horseSheets.length} horse sheet paths in jxlook.js. Sample:`, [...new Set(horseSheets)].slice(0, 10));

  // Test the first 5 horse sheet webp URLs on volamidle.pages.dev
  const samples = [...new Set(horseSheets)].slice(0, 8);
  for (const s of samples) {
    const cleanPath = s.startsWith('m:') ? 'm/' + s.slice(2) : s;
    const url = `https://volamidle.pages.dev/img/jx/${cleanPath}.webp`;
    const status = await new Promise(resolve => {
      https.get(url, res => resolve(res.statusCode)).on('error', () => resolve(500));
    });
    console.log(`URL: ${url} -> Status: ${status}`);
  }
}

testJxHorseWebp();
