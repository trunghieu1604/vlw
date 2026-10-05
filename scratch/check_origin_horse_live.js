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

async function checkLiveWeb() {
  console.log('Fetching https://volamidle.pages.dev/index.html ...');
  const html = await fetchUrl('https://volamidle.pages.dev/index.html');
  
  // Extract script tags
  const scripts = [...html.matchAll(/src=["']([^"']+\.js[^"']*)["']/g)].map(m => m[1]);
  console.log('Found scripts on live site:', scripts);

  // Search for horse references in scripts or test horse URLs on origin site
  const horseUrlsToTest = [
    'img/spr/horse/0.png',
    'img/spr/horse/1.png',
    'img/spr/horse/b1.png',
    'img/spr/horse/b2.png',
    'img/spr/horse/b3.png',
    'img/spr/horse/b4.png',
    'img/spr/horse/b5.png',
    'img/spr/horse/b6.png',
    'img/spr/horse/b7.png',
    'img/spr/horse/b8.png',
    'img/spr/horse/b9.png',
    'img/spr/horse/b10.png',
    'img/spr/horse/b11.png',
    'img/spr/horse/b12.png',
    'img/spr/horse/b13.png',
    'img/spr/horse/b14.png',
    'img/spr/horse/b15.png'
  ];

  console.log('\nTesting horse image URLs on volamidle.pages.dev ...');
  for (const path of horseUrlsToTest) {
    const fullUrl = `https://volamidle.pages.dev/${path}`;
    try {
      const status = await new Promise(resolve => {
        https.get(fullUrl, res => resolve(res.statusCode)).on('error', () => resolve(500));
      });
      console.log(`URL: ${path} -> Status: ${status}`);
    } catch(e) {
      console.log(`URL: ${path} -> Error: ${e.message}`);
    }
  }

  // Also check if any script contains horse data definitions
  for (const s of scripts) {
    const sUrl = s.startsWith('http') ? s : `https://volamidle.pages.dev/${s.replace(/^\//, '')}`;
    try {
      const content = await fetchUrl(sUrl);
      if (content.includes('horse') || content.includes('Thần Mã') || content.includes('Bôn Tiêu')) {
        const matches = [...content.matchAll(/img\/[^\s"']*(?:horse|ngua|tm|bon)[^\s"']*/gi)].map(m => m[0]);
        if (matches.length > 0) {
          console.log(`\nFound horse image references in ${s}:`, [...new Set(matches)]);
        }
      }
    } catch(e) {}
  }
}

checkLiveWeb();
