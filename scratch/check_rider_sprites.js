// For every non-horse part row, check that riding-pose sheets exist (in JXL.sheets) and are real WEBP files locally.
const fs = require('fs');
const path = require('path');
const window = {};
eval(fs.readFileSync(path.join(__dirname, '..', 'js', 'jxlook.js'), 'utf8'));
const JXL = window.JXLOOK;
const IMG = path.join(__dirname, '..', 'img', 'jx');
const isWebp = p => { try { return fs.readFileSync(p).toString('ascii', 0, 4) === 'RIFF'; } catch { return false; } };
const key = (sx, nm) => nm.startsWith('m:') ? 'm/' + nm.slice(2) : nm.startsWith('ma_') ? 'm/' + nm : sx + '/' + nm;

const RIDE = ['骑马站立', '骑马跑步'];
for (const sx of ['m', 'f']) {
  const tabs = JXL.tabs[sx];
  for (const part of ['躯体', '头部', '左手', '右手']) {
    const rows = tabs[part] || {};
    let total = 0, noName = 0, noSheet = 0, badFile = 0; const ex = [];
    for (const r of Object.keys(rows)) for (const a of RIDE) {
      total++;
      const nm = rows[r][a];
      if (!nm) { noName++; if (ex.length < 3) ex.push(`row ${r} ${a}: no name`); continue; }
      const k = key(sx, nm);
      if (!JXL.sheets[k]) { noSheet++; if (ex.length < 3) ex.push(`row ${r}: ${k} not in sheets`); continue; }
      if (!isWebp(path.join(IMG, k + '.webp'))) { badFile++; if (ex.length < 3) ex.push(`row ${r}: ${k}.webp missing/bad`); }
    }
    console.log(`[${sx}] ${part}: ${total} checks | no name ${noName} | not in sheets ${noSheet} | bad file ${badFile}` + (ex.length ? '\n     e.g. ' + ex.join('\n          ') : ''));
  }
}
// What key does the current code produce for female riding body? (sheet names for f are plain, e.g. 'fa_bd_..')
const fBody = JXL.tabs.f['躯体'][0]['骑马站立'];
console.log('\nFemale body riding sheet name (row 0):', fBody, '-> key', key('f', fBody), 'exists:', !!JXL.sheets[key('f', fBody)]);
const fHorse = JXL.tabs.f['马中'][0]['骑马站立'];
console.log('Female horse body sheet name (row 0):', fHorse, '-> key', key('f', fHorse), 'exists:', !!JXL.sheets[key('f', fHorse)]);
