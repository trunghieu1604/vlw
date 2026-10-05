// Find horse sprite .webp files that are not real WEBP (HTML fallback), try to re-download from origin.
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..', 'img', 'jx');
const ORIGIN = 'https://volamidle.pages.dev/img/jx/';

const isWebp = buf => buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';

function get(url) {
  return new Promise(resolve => {
    https.get(url, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, type: res.headers['content-type'] || '', buf: Buffer.concat(chunks) }));
    }).on('error', e => resolve({ status: 0, type: '', buf: Buffer.alloc(0), err: e.message }));
  });
}

(async () => {
  const bad = [];
  for (const sx of ['m', 'f']) {
    const dir = path.join(ROOT, sx);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.webp')) continue;
      const p = path.join(dir, f);
      if (!isWebp(fs.readFileSync(p))) bad.push(sx + '/' + f);
    }
  }
  console.log('Bad files:', bad.length);
  const ids = [...new Set(bad.map(b => b.match(/ma_h[hbt]_(\d+)_/)?.[1]).filter(Boolean))];
  console.log('Affected horse sprite ids:', ids.join(', '));

  let fixed = 0, missing = 0;
  for (const rel of bad) {
    const r = await get(ORIGIN + rel);
    if (r.status === 200 && isWebp(r.buf)) {
      fs.writeFileSync(path.join(ROOT, rel), r.buf);
      fixed++;
    } else {
      missing++;
      console.log(`  origin has no real image: ${rel} (status ${r.status}, ${r.type})`);
    }
  }
  console.log(`Re-downloaded OK: ${fixed} | Not available on origin: ${missing}`);
})();
