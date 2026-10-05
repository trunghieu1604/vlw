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

async function inspectLiveSite() {
  const html = await fetchUrl('https://volamidle.pages.dev/');
  
  // Find script tags
  const matches = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m => m[1]);
  console.log('Script files in index.html:', matches);

  // Check horse data script or main scripts
  for (const scriptPath of matches) {
    if (scriptPath.includes('horse') || scriptPath.includes('data') || scriptPath.includes('rdata') || scriptPath.includes('ui')) {
      const fullUrl = `https://volamidle.pages.dev/${scriptPath.replace(/^\//, '')}`;
      const code = await fetchUrl(fullUrl);
      console.log(`\nInspecting ${scriptPath} (length: ${code.length}):`);
      
      // Check for horse items, mounts, Thần Mã, Bôn Tiêu, Phi Vân, Xích Thố, Bát Đái
      const horseMentions = [...code.matchAll(/(?:thần mã|thăng cấp ngựa|bôn tiêu|phi vân|xích thố|tuyệt ảnh|bát đái|hãn huyết|chiếu dạ|ngựa|horse)[^;,\n]{0,100}/gi)].map(m => m[0]);
      if (horseMentions.length > 0) {
        console.log(`  Found ${horseMentions.length} horse mentions. Examples:`);
        horseMentions.slice(0, 5).forEach(m => console.log(`   - ${m.trim()}`));
      }
    }
  }

  // Check version string in index.html or sw.js
  const vMatch = html.match(/v=\d+/g);
  console.log('\nCache / Script Version tags found:', vMatch ? [...new Set(vMatch)] : 'None');
}

inspectLiveSite();
