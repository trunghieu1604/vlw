const https = require('https');
const fs = require('fs');
const path = require('path');

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const opts = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    };
    https.get(url, opts, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchBuffer(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

async function main() {
  const epDir = 'c:/Users/TrungHieu/Desktop/vo-lam/vlw/img/ep';
  if (!fs.existsSync(epDir)) fs.mkdirSync(epDir, { recursive: true });

  const epFiles = [
    'da1.png', 'da2.png', 'da3.png', 'da4.png', 'da5.png', 'da6.png',
    'ht.png', 'tt.png', 'qht.png', 'fd.png', 'mys.png', 'wc.png',
    'knb.png', 'tanthu.png', 'mt90.png', 'dtbk.png', 'ldp.png', 'ldt.png',
    'box2.png', 'box3.png'
  ];

  for (const fn of epFiles) {
    const url = 'https://volamidle.pages.dev/img/ep/' + fn;
    const target = path.join(epDir, fn);
    try {
      const data = await fetchBuffer(url);
      fs.writeFileSync(target, data);
      console.log(`[SUCCESS] Downloaded ${fn} (${data.length} bytes)`);
    } catch (err) {
      console.error(`[FAIL] ${fn}:`, err.message);
    }
  }
}

main();
