const fs = require('fs');
const path = require('path');

const html = fs.readFileSync('c:/Users/TrungHieu/Desktop/vo-lam/vlw/index.html', 'utf8');
const scripts = Array.from(html.matchAll(/src=["']([^"']+\.js[^"']*)["']/g)).map(m => m[1].split('?')[0]);
console.log(`Testing ${scripts.length} scripts from index.html...`);

let errors = 0;
for (const s of scripts) {
  const fullPath = path.join('c:/Users/TrungHieu/Desktop/vo-lam/vlw', s);
  if (!fs.existsSync(fullPath)) {
    console.error(`MISSING FILE: ${s}`);
    errors++;
    continue;
  }
  const code = fs.readFileSync(fullPath, 'utf8');
  try {
    new Function(code);
  } catch (e) {
    console.error(`SYNTAX ERROR in ${s}:`, e.message);
    errors++;
  }
}

if (errors === 0) {
  console.log('SUCCESS: All scripts in index.html passed syntax validation!');
} else {
  console.error(`FAILURE: Found ${errors} errors.`);
}
