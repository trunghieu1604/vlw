/* ======================= NHAN VAT GHEP BO PHAN KIEU JX1 =======================
   Hinh tu client VLTK (spr\npcres\man|woman) xuat bang jxres/build.py -> img/jx/{m,f}/*.webp + jxlook.js (window.JXLOOK).
   Nhu JX1: nhan vat ghep tu 11 bo phan (dau, toc, vai, than, 2 tay, 2 vu khi, ngua truoc/giua/sau), moi bo phan chon dong
   theo trang bi dang mac qua bang ArmorRes / HelmRes / MeleeRes / RangeRes / HorseRes (ma = dong trong bang do + 2;
   ma 1 = khong mac). Tu the (dung / chay / danh / thi trien / trung don / nga, co hoac khong cuoi ngua) lay theo bang
   "vu khi - hanh dong" (未骑马关联表 / 骑马关联表); thu tu ve tung bo phan theo huong va khung (贴图顺序表).
   Thieu hinh (chua tai xong) -> ve hinh mon phai cu. */
'use strict';
let JXL = window.JXLOOK || null;
if (!JXL && typeof document !== 'undefined') {
  const s = document.createElement('script'); s.src = 'js/jxlook.js?v=' + ((document.querySelector('script[src*="js/core.js"]') || {}).src || '').split('v=')[1];
  s.onload = () => { JXL = window.JXLOOK || null; if (JXL && typeof R !== 'undefined' && S && S.fac) { R.jx = jxOn() ? jxSetup() : null; if (R.jx) jxPreload(); } };
  document.head.appendChild(s);
}
const JX_PART_IDX = { '头部': 0, '发型': 1, '肩膀': 4, '躯体': 5, '左手': 6, '右手': 7, '左手武器': 8, '右手武器': 9, '马前': 12, '马中': 13, '马后': 14 };
const JX_IDX_PART = Object.fromEntries(Object.entries(JX_PART_IDX).map(([k, v]) => [v, k]));
const JX_GROUP = { '头部': 'helm', '发型': 'helm', '肩膀': 'armor', '躯体': 'armor', '左手': 'armor', '右手': 'armor', '左手武器': 'weapon', '右手武器': 'weapon', '马前': 'horse', '马中': 'horse', '马后': 'horse' };
const jxSheetKey = (sx, nm) => nm.startsWith('m:') ? 'm/' + nm.slice(2) : (nm.startsWith('ma_') ? 'm/' + nm : sx + '/' + nm);
const jxOn = () => !!JXL && S && S.jxLook !== false;
function jxItemP(it) {
  if (!it) return -1;
  if (Number.isInteger(it.p)) return it.p;
  const b = typeof baseRow === 'function' ? baseRow(it.d, it.k, it.lvl || 1) : null;
  return b && Number.isInteger(b.p) ? b.p : -1;
}
const HORSE_NAME_TO_ROW = [
  ['Ô Vân', 5], ['Xích Thố', 0], ['Tuyệt Ảnh', 9], ['Tuyệt ảnh', 9], ['Đích Lô', 2], ['Chiếu Dạ', 1],
  ['Bôn Tiêu', 6], ['Phiên Vũ', 7], ['Phi Vân', 1], ['Xích Long', 9], ['Tuyệt Địa', 0], ['Du Huy', 4],
  ['Đằng Vụ', 8], ['Siêu Quang', 10], ['Hãn Huyết', 15], ['Bạch Hổ', 11], ['Thần Mã', 10], ['Hổ Vương', 10],
  ['Sư tử', 10], ['Lạc đà', 9], ['Dương Đà', 0], ['Hươu', 9], ['Dương Sa', 7], ['Ngự Phong', 8],
  ['Truy điện', 4], ['Lưu Tinh', 1], ['Bạch Mã', 11], ['Chiến Mã', 2], ['Thông', 1], ['Lưu', 1], ['Hoàng', 0], ['Mã', 0]
];

function jxHorseRow(it) {
  if (!it || !JXL || !JXL.tabs) return -1;
  const sx = R.jx ? R.jx.sx : (S && S.sex ? 'f' : 'm');
  const tab = (JXL.tabs[sx] || {})['马中'] || {};
  if (!tab) return -1;
  if (it.thanma && JX_TM_ROW[it.thanma] != null && tab[JX_TM_ROW[it.thanma]] != null) return JX_TM_ROW[it.thanma];
  const name = it.n || '';
  for (const [kw, row] of HORSE_NAME_TO_ROW) {
    if (name.includes(kw) && tab[row] != null) return row;
  }
  const r = jxRow('horse', it);
  if (r >= 0 && tab[r] != null) return r;
  const m = JXL.res ? (JXL.res.horse || {}) : {};
  for (const k in m) if (m[k] >= 2 && tab[m[k] - 2] != null) return m[k] - 2;
  return 0;
}

const JX_SET_PART = { helm: '头部', armor: '躯体', melee: '右手武器', range: '右手武器' };
function jxSetRow(g, it) {
  const s = it && it.set, tab = s && JXL.set && JXL.set[s.kind];
  if (!tab) return -1;
  const key = s.grp + '.' + s.sid + '.' + it.d + '.' + it.k;
  const r = tab[key];
  if (r == null) return -1;
  const sx = S && S.sex ? 'f' : 'm';
  const c = ((JXL.tabs[sx] || {})[JX_SET_PART[g]] || {})[r];
  return c && Object.keys(c).length ? r : -1;
}

function jxRow(g, it) {
  const m = JXL.res[g]; if (!m) return -1;
  if (it && it.set && g !== 'horse' && reqOk(it)) { const r = jxSetRow(g, it); if (r >= 0) return r; }
  const id = it && (reqOk(it) || g === 'horse') && jxItemP(it) >= 0 ? jxItemP(it) + 2 : 1;
  const v = m[id] ?? m[1]; return v == null ? -1 : v - 2;
}

function jxSetup() {
  if (!JXL || !S || !S.fac) return null;
  const sx = S.sex ? 'f' : 'm', eq = S.eq, w = eq.weapon;
  const rows = { helm: jxRow('helm', eq.helm), armor: jxRow('armor', eq.armor), weapon: jxRow(w && w.d === 1 ? 'range' : 'melee', w), horse: eq.horse && R.mounted ? jxHorseRow(eq.horse) : -1 };
  if (rows.weapon < 0) rows.weapon = 0;
  const wn = (JXL.wnames[sx] || [])[rows.weapon] || '空手';
  const asc = JXL.assoc[sx][wn] || JXL.assoc[sx]['空手'];
  const ride = rows.horse >= 0 && asc && asc[1] ? 1 : 0;
  return { sx, rows, asc: asc ? asc[ride] || asc[0] : {}, ride, key: JSON.stringify([sx, rows, ride]) };
}

function jxOrder(sx, act, dir16, frame) {
  const S2 = JXL.sort[sx], sec = S2[act] || {}, D = S2.DEFAULT;
  for (const k in sec) if (k[0] === 'L' && sec[k][0] === frame) return sec[k].slice(1);
  const v = sec['Dir' + (dir16 + 1)] || D['Dir' + (dir16 + 1)] || D.Dir1; return v.slice(1);
}

const JX_MS = { st: 120, run: 85 };
function drawJxHero(act, dir8, time, x, y, sc, alpha, mainSk, overrideJx) {
  const jx = overrideJx || R.jx; if (!jx) return false;
  const castMg = !overrideJx && act === 'at' && R.P && R.P.main && !R.P.main.phys && jx.asc.mg;
  const g = jx.asc[castMg ? 'mg' : act] || jx.asc.st; if (!g) return false;
  const tab = JXL.tabs[jx.sx], loaded = []; let masterP = null;
  const rawOrder = jxOrder(jx.sx, g, dir8 % 8 * 2, 0);
  for (const rawP of rawOrder) {
    const pName = typeof rawP === 'number' ? (JX_IDX_PART[rawP] || rawP) : rawP;
    const pIdx = typeof rawP === 'number' ? rawP : JX_PART_IDX[rawP];
    if (pIdx == null) continue;
    const groupName = JX_GROUP[pName]; if (!groupName) continue;
    const row = jx.rows[groupName]; if (row < 0) continue;
    const keyStr = ((tab[pName] || {})[row] || {})[g]; if (!keyStr) continue;
    const fullKey = jxSheetKey(jx.sx, keyStr), meta = JXL.sheets[fullKey]; if (!meta) continue;
    const im = img('img/jx/' + fullKey + '.webp');
    if (!im.complete || !im.naturalWidth) { if (pName === '躯体' || (pName === '马中' && jx.rows.horse >= 0)) return false; continue; }
    loaded.push([im, meta, pName, pIdx]);
    if (pName === '躯体' || !masterP) masterP = meta;
  }
  if (!masterP) return false;
  const framesN = masterP[4]; let fr;
  if (act === 'st' || act === 'run') fr = Math.floor(time * 1000 / (JX_MS[act] || 110)) % framesN;
  else {
    const dur = typeof animLen === 'function' && animLen(mainSk, act) || framesN * 0.09;
    fr = Math.min(framesN - 1, Math.floor(clamp(time / Math.max(0.1, dur), 0, 0.999) * framesN));
  }
  const rawSort = jxOrder(jx.sx, g, dir8 % 8 * 2, fr * (masterP[6] || 1));
  const sortLst = rawSort.map(p => typeof p === 'number' ? p : JX_PART_IDX[p]);
  loaded.sort((a, b) => sortLst.indexOf(a[3]) - sortLst.indexOf(b[3]));
  const footX = JXL.foot[0], footY = JXL.foot[1]; let maxH = 0;
  CX.globalAlpha = alpha;
  for (const [im, m, pName, pIdx] of loaded) {
    const [w, h, ox, oy, n, dDirs] = m;
    const colFr = Math.min(n - 1, Math.floor(fr * n / framesN));
    const rowDir = dDirs >= 8 ? dir8 % 8 : Math.floor(dir8 % 8 * dDirs / 8);
    const dx = x + (ox - footX) * sc;
    const dy = y + (oy - footY) * sc;
    const dw = w * sc;
    const dh = h * sc;
    CX.drawImage(im, colFr * w, rowDir * h, w, h, dx, dy, dw, dh);
    maxH = Math.max(maxH, (footY - oy) * sc);
  }
  CX.globalAlpha = 1;
  return maxH;
}

function jxPreload() {
  const jx = R.jx;
  if (jx) for (const act of Object.values(jx.asc)) for (const pName in JX_PART_IDX) {
    const row = jx.rows[JX_GROUP[pName]]; if (row < 0) continue;
    const keyStr = (((JXL.tabs[jx.sx] || {})[pName] || {})[row] || {})[act];
    if (keyStr && JXL.sheets[jxSheetKey(jx.sx, keyStr)]) img('img/jx/' + jxSheetKey(jx.sx, keyStr) + '.webp');
  }
}
