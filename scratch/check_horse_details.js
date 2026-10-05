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

async function inspectHorseCode() {
  console.log('Fetching js/horse.js?v=213 ...');
  const horseJs = await fetchUrl('https://volamidle.pages.dev/js/horse.js?v=213');
  console.log('--- js/horse.js preview ---');
  console.log(horseJs.slice(0, 1500));

  console.log('\nFetching js/thanma.js?v=213 ...');
  const thanMaJs = await fetchUrl('https://volamidle.pages.dev/js/thanma.js?v=213');
  console.log('--- js/thanma.js preview ---');
  console.log(thanMaJs.slice(0, 1500));
}

inspectHorseCode();
