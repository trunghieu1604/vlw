/* ======================= MENU ADMIN (Right Click Context Menu) ======================= */
'use strict';

function adminAddGold() {
  if (!S || !S.fac) return;
  S.gold = (S.gold || 0) + 500000000;
  R.dirty = true;
  recalc();
  refresh();
  toast('⚡ Hack 5 Ức Vàng (500.000.000 lượng) thành công!');
  log('⚡ <b class="gold">ADMIN: Hack +500.000.000 Ngân lượng!</b>');
  save();
}

function adminAddKnb() {
  if (!S || !S.fac) return;
  S.knb = (S.knb || 0) + 10000;
  R.dirty = true;
  refresh();
  toast('⚡ Hack 10.000 Kim Nguyên Bảo thành công!');
  log('⚡ <b class="gold">ADMIN: Hack +10.000 KNB!</b>');
  save();
}

function adminMaxLevel() {
  if (!S || !S.fac) return;
  S.lvl = 200;
  R.dirty = true;
  recalc();
  if (typeof onLevelUp === 'function') onLevelUp();
  refresh();
  toast('⚡ Đã tăng cấp lên Max Lv 200!');
  log('⚡ <b class="gold">ADMIN: Đạt Cấp 200 Max!</b>');
  save();
}

function adminAddStats() {
  if (!S || !S.fac) return;
  if (!S.attr) S.attr = { str: 0, dex: 0, vit: 0, eng: 0 };
  S.attr.str = 2000;
  S.attr.dex = 2000;
  S.attr.vit = 2000;
  S.attr.eng = 2000;
  S.skPts = (S.skPts || 0) + 2000;
  R.dirty = true;
  recalc();
  refresh();
  toast('⚡ Hack 4 chỉ số lên 2000 + 2000 điểm kỹ năng!');
  log('⚡ <b class="gold">ADMIN: Sức mạnh 2000 · Thân pháp 2000 · Sinh khí 2000 · Nội công 2000 · Điểm kỹ năng +2000!</b>');
  save();
}

function adminAddFullSet(kind) {
  if (!S || !S.fac) return;
  const facId = (typeof FAC !== 'undefined' && FAC[S.fac]) ? FAC[S.fac].id : -1;
  const rows = (typeof J !== 'undefined' && J.sets && J.sets[kind]) ? J.sets[kind].filter(r => {
    const reqFac = (r.req.find(q => q[0] === 39) || [0, -1])[1];
    return setRowOk(r) && sexReqOk(r.req) && (reqFac === -1 || reqFac === facId);
  }) : [];

  // Group by Set Group (r.grp or r.sid)
  const byGrp = {};
  for (const r of rows) {
    const key = r.grp || r.sid || r.n;
    (byGrp[key] = byGrp[key] || []).push(r);
  }

  // Pick group with highest level & most slots (to ensure all pieces belong to SAME set)
  let bestKey = null, bestScore = -1, bestGroup = [];
  for (const key in byGrp) {
    const group = byGrp[key];
    const uniqueSlots = new Set(group.map(i => i.d)).size;
    const maxLvl = Math.max(...group.map(i => i.lvl));
    const score = uniqueSlots * 1000 + maxLvl;
    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
      bestGroup = group;
    }
  }

  if (!bestGroup.length) {
    toast('Không tìm thấy bộ trang bị phù hợp');
    return;
  }

  const addedNames = [];
  const rings = [];

  // Create all items of this exact set group
  for (const r of bestGroup) {
    const it = makeSetItem(kind, r, 10);
    it.enh = 10;
    S.inv.push(it);
    addedNames.push(it.n);
    if (r.d === 3) rings.push(r);
  }

  // Ensure 2 rings for Nhẫn 1 & Nhẫn 2
  if (rings.length > 0) {
    const r2 = rings[1] || rings[0];
    const ring2 = makeSetItem(kind, r2, 10);
    ring2.enh = 10;
    S.inv.push(ring2);
    addedNames.push(ring2.n);
  }

  R.dirty = true;
  recalc();
  refresh();
  const name = kind === 'gold' ? 'Hoàng Kim' : 'Bạch Kim';
  toast(`⚡ Nhận Full bộ ${name} +10 (${addedNames.length} món đồng bộ)!`);
  log(`⚡ <b class="gold">ADMIN: Nhận Full bộ ${name} +10 (${addedNames.length} món đồng bộ 100%) vào hành trang!</b>`);
  save();
}

function adminAddFd() {
  if (!S || !S.fac) return;
  const r = typeof RW === 'function' ? RW() : (S.rw || (S.rw = {}));
  r.fd = (r.fd || 0) + 1000;
  R.dirty = true;
  refresh();
  toast('⚡ Hack +1.000 Điểm Phúc Duyên thành công!');
  log('⚡ <b class="gold">ADMIN: Hack +1.000 Điểm Phúc Duyên!</b>');
  save();
}

function adminAddBtt() {
  if (!S || !S.fac) return;
  const r = typeof RW === 'function' ? RW() : (S.rw || (S.rw = {}));
  r.stat = r.stat || {};
  r.stat.tokens = (r.stat.tokens || 0) + 1000;
  R.dirty = true;
  refresh();
  toast('⚡ Hack +1.000 Bánh Trung Thu (Vật phẩm sự kiện) thành công!');
  log('⚡ <b class="gold">ADMIN: Hack +1.000 Bánh Trung Thu!</b>');
  save();
}

let adminUnlocked = false;

function openAdminWithPass(e) {
  if (e) e.preventDefault();
  if (!S || !S.fac) {
    toast('Hãy vào game / tạo nhân vật trước!');
    return;
  }
  if (!adminUnlocked) {
    const pass = prompt('Nhập mật khẩu Admin (4 chữ số):');
    if (pass !== '8686') {
      toast('❌ Sai mật khẩu!');
      return;
    }
    adminUnlocked = true;
    toast('🔓 Mở khóa Menu Admin thành công!');
  }
  showAdminMenu();
}

function showAdminMenu(e) {
  if (e) e.preventDefault();
  if (!S || !S.fac) {
    toast('Hãy vào game / tạo nhân vật trước!');
    return;
  }
  const body = `
    <div style="text-align:center; padding:10px;">
      <h3 style="color:#f3d88a; margin-bottom:15px; font-size:18px;">⚡ MENU ADMIN HACK ⚡</h3>
      <div style="display:flex; flex-direction:column; gap:10px; max-width:340px; margin:0 auto;">
        <button class="btn" style="background:#9370db; color:#fff; font-weight:bold; padding:10px;" id="bAdmStats">⚡ Hack 4 Chỉ Số (2000) + 2000 Skill Pts</button>
        <button class="btn" style="background:#8b0000; color:#fff; font-weight:bold; padding:10px;" id="bAdmKnb">💎 Hack 10.000 KNB</button>
        <button class="btn" style="background:#b8860b; color:#fff; font-weight:bold; padding:10px;" id="bAdmGold">💰 Hack 5 Ức Vàng (500M)</button>
        <button class="btn" style="background:#2e8b57; color:#fff; font-weight:bold; padding:10px;" id="bAdmLvl">👑 Max Level 200</button>
        <button class="btn" style="background:#d2691e; color:#fff; font-weight:bold; padding:10px;" id="bAdmSetGold">🏆 Full Bộ Hoàng Kim +10</button>
        <button class="btn" style="background:#4682b4; color:#fff; font-weight:bold; padding:10px;" id="bAdmSetPlat">💎 Full Bộ Bạch Kim +10</button>
        <button class="btn" style="background:#cc6600; color:#fff; font-weight:bold; padding:10px;" id="bAdmFd">🧧 Hack +1.000 Phúc Duyên</button>
        <button class="btn" style="background:#d4a017; color:#fff; font-weight:bold; padding:10px;" id="bAdmBtt">🥮 Hack +1.000 Bánh Trung Thu</button>
      </div>
    </div>
  `;

  modal(body, () => {
    const elStats = document.querySelector('#bAdmStats');
    if (elStats) elStats.onclick = () => { adminAddStats(); closeModal(); };
    const elKnb = document.querySelector('#bAdmKnb');
    if (elKnb) elKnb.onclick = () => { adminAddKnb(); closeModal(); };
    const elGold = document.querySelector('#bAdmGold');
    if (elGold) elGold.onclick = () => { adminAddGold(); closeModal(); };
    const elLvl = document.querySelector('#bAdmLvl');
    if (elLvl) elLvl.onclick = () => { adminMaxLevel(); closeModal(); };
    const elGoldSet = document.querySelector('#bAdmSetGold');
    if (elGoldSet) elGoldSet.onclick = () => { adminAddFullSet('gold'); closeModal(); };
    const elPlatSet = document.querySelector('#bAdmSetPlat');
    if (elPlatSet) elPlatSet.onclick = () => { adminAddFullSet('platina'); closeModal(); };
    const elFd = document.querySelector('#bAdmFd');
    if (elFd) elFd.onclick = () => { adminAddFd(); closeModal(); };
    const elBtt = document.querySelector('#bAdmBtt');
    if (elBtt) elBtt.onclick = () => { adminAddBtt(); closeModal(); };
  });
}
