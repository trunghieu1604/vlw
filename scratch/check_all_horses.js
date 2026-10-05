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

async function inspectAllHorses() {
  console.log('Fetching thanma.js ...');
  const thanmaCode = await fetchUrl('https://volamidle.pages.dev/js/thanma.js?v=213');
  
  // Extract THAN_MA array
  const tmMatches = [...thanmaCode.matchAll(/\[['"]([^'"]+)['"]\s*,\s*\d+\s*,\s*['"]([^'"]+)['"]/g)];
  console.log('\n--- Thần Mã List on Live Site ---');
  tmMatches.forEach(m => console.log(`Code: ${m[1]} | Name: ${m[2]}`));

  console.log('\nFetching horse.js ...');
  const horseCode = await fetchUrl('https://volamidle.pages.dev/js/horse.js?v=213');
  console.log('horse.js length:', horseCode.length);
}

inspectAllHorses();
