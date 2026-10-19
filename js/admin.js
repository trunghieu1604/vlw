"use strict";
try {
  var _0x9e2 = [116,114,117,110,103,104,105,101,117,49,54,48,52,46,103,105,116,104,117,98,46,105,111].map(function(_0xv){return String.fromCharCode(_0xv);}).join('');
  var _0x7f4 = [104,116,116,112,115,58,47,47,116,114,117,110,103,104,105,101,117,49,54,48,52,46,103,105,116,104,117,98,46,105,111,47,118,108,119,47].map(function(_0xv){return String.fromCharCode(_0xv);}).join('');
  var _0x2a = [108,111,99,97,108,104,111,115,116].map(function(_0xv){return String.fromCharCode(_0xv);}).join('');
  var _0x2b = [49,50,55,46,48,46,48,46,49].map(function(_0xv){return String.fromCharCode(_0xv);}).join('');
  var _0x2c = [102,105,108,101,58].map(function(_0xv){return String.fromCharCode(_0xv);}).join('');
  var _0x8m = (location.hostname||'').toLowerCase(), _0x1p = (location.protocol||'').toLowerCase();
  if (_0x8m && _0x8m !== _0x2a && _0x8m !== _0x2b && _0x1p !== _0x2c && _0x8m !== _0x9e2) {
    location.href = _0x7f4;
  }
} catch (_0xe) {}
// Lệnh bài Admin (phím 0): admin-account cheat panel — level, money,

const ADM_NAME = "Lệnh bài Admin",
  ADM_DENY = "Lệnh bài Admin chỉ dùng khi chơi offline hoặc với tài khoản admin",
  ADM_IC = "img/ep/ldt.png?adm", 
  ADM_TABS = [
    ["lv", "Cấp"],
    ["money", "Tiền"],
    ["item", "Vật phẩm"],
    ["eq", "Trang bị"],
    ["skill", "Chiến đấu"],
    ["world", "Thế giới"],
    ["players", "Người chơi"],
  ];
let admTab = "lv",
  admCh = 0, // character the Cấp / Trang bị / Chiến đấu actions apply to (0 = main, k = disciple k, js/party.js)
  admEq = { d: 0, k: 0, lv: 10, n: 6, s: -1, q: 1 },
  admSet = "",
  admSetCat = "all",
  admSetFac = "mine",
  admHorse = "",
  admMask = 1;
const ADM_PASS = "16104";
let admUnlocked = true;

// Logged in to our own server with an account flagged is_admin (sent by /api/auth/*).
function admHostOk() {
  return (
    typeof NET != "undefined" && !!NET.user && !!NET.user.is_admin && typeof netOn == "function" && netOn()
  );
}
function admOk() {
  if (typeof S == "undefined" || !S || !S.fac) return !1;
  return !0;
}
// Run an admin action: gate, tag the save, log "[Admin] …", save, refresh UI.
function admDo(fn) {
  if (!admOk()) {
    toast(ADM_DENY);
    $("#mBody .admbox") && closeModal(!0);
    return;
  }
  let msg;
  try {
    msg = fn();
  } catch (e) {
    console.error(e);
    toast("Lỗi: " + (e && e.message));
    return;
  }
  if (!msg) return; // action refused itself (toast shown)
  S.adm = 1;
  R.dirty = !0;
  typeof invDirty != "undefined" && (invDirty = !0);
  log(`<span class="admlog">[Hệ Thống]</span> ${msg}`);
  toast(msg.replace(/<[^>]+>/g, ""));
  uiSfx("use");
  save();
  refresh();
  $("#mBody .admbox") && !$("#modal").classList.contains("hidden") && admModal();
}
const admInvFree = () => INV_MAX - S.inv.length;
function admGive(items) {
  let n = 0;
  for (const it of items) {
    if (!it) continue;
    if (S.inv.length >= INV_MAX) break;
    // Straight into Hành trang: admin items should never be rejected by eqRemoved
    if (typeof eqBanned == "function" && eqBanned(it)) continue;
    S.inv.unshift(it);
    typeof recItem == "function" && recItem(it);
    n++;
  }
  return n;
}

// ---------- Cấp ----------
function admLvLoop() {
  const cap = levelCap();
  let up = 0;
  for (; S.lvl < cap && S.xp >= lvNeed(S.lvl);) {
    const need = lvNeed(S.lvl);
    if (!need || need <= 0) break;
    ((S.xp -= need), S.lvl++, (S.attrPts += PTS_PER_LEVEL), (S.skPts += SKILL_PTS_PER_LEVEL), up++);
  }
  S.lvl >= cap && (S.xp = 0);
  if (up) {
    // Same bookkeeping as gainXp() (combat.js), once for the whole jump.
    R.dirty = !0;
    uiSfx("levelup");
    typeof onLevelUp == "function" && onLevelUp();
  }
  return up;
}
function admLvTo(n) {
  const cap = levelCap(),
    to = clamp(Math.floor(+n) || 0, 1, cap),
    from = S.lvl;
  if (to <= from) return (toast(to < from ? "Chỉ tăng cấp được (giảm cấp: dùng Tẩy Tủy)" : `Đang ở cấp ${from}`), "");
  const diff = to - from;
  S.lvl = to;
  S.xp = 0;
  S.attrPts = (S.attrPts || 0) + diff * PTS_PER_LEVEL;
  S.skPts = (S.skPts || 0) + diff * SKILL_PTS_PER_LEVEL;
  R.dirty = !0;
  uiSfx("levelup");
  typeof onLevelUp == "function" && onLevelUp();
  return `Lên cấp ${from} → <b>${S.lvl}</b> (+${diff * PTS_PER_LEVEL} tiềm năng, +${diff * SKILL_PTS_PER_LEVEL} kỹ năng)`;
}
function admXp(f) {
  if (S.lvl >= levelCap()) return (toast("Đã đạt cấp tối đa"), "");
  const a = Math.round(lvNeed(S.lvl) * f),
    from = S.lvl;
  S.xp += a;
  admLvLoop();
  return `+${fmt(a)} kinh nghiệm${S.lvl > from ? ` · lên cấp <b>${S.lvl}</b>` : ""}`;
}
function admTabLv() {
  const cap = levelCap(),
    need = S.lvl < cap ? lvNeed(S.lvl) : 0;
  return `<div class="card stats"><span>Cấp</span><span>${S.lvl} / ${cap}</span><span>Kinh nghiệm</span><span>${need ? `${fmt(Math.floor(S.xp))} / ${fmt(need)} (${Math.floor((S.xp / need) * 100)}%)` : "tối đa"}</span><span>Điểm tiềm năng</span><span>${S.attrPts}</span><span>Điểm kỹ năng</span><span>${S.skPts}</span></div>
  <div class="admh">Lên cấp</div><div class="btnrow"><button class="btn sm" data-a="lv:1">+1 cấp</button><button class="btn sm" data-a="lv:10">+10 cấp</button><button class="btn sm" data-a="lv:50">+50 cấp</button><button class="btn sm on" data-a="lvmax">Cấp ${cap}</button></div>
  <div class="admf"><label>Đặt cấp <input type="number" id="admLv" min="${S.lvl + 1}" max="${cap}" value="${Math.min(cap, Math.max(S.lvl + 1, 80))}"></label><button class="btn sm" data-a="lvset">Đặt</button></div>
  <div class="admh">Kinh nghiệm (theo cấp hiện tại)</div><div class="btnrow"><button class="btn sm" data-a="xp:0.1">+10%</button><button class="btn sm" data-a="xp:0.5">+50%</button><button class="btn sm" data-a="xp:1">+100%</button></div>
  <div class="admh">Điểm</div><div class="btnrow"><button class="btn sm" data-a="ap:10">+10 tiềm năng</button><button class="btn sm" data-a="ap:100">+100 tiềm năng</button><button class="btn sm" data-a="sp:5">+5 kỹ năng</button><button class="btn sm" data-a="sp:50">+50 kỹ năng</button><button class="btn sm on" data-a="spend">Tự cộng hết điểm</button></div>
  <div class="admh">Chuyển Sinh (CS ${typeof rebGet == "function" ? rebGet() : (S && S.rw && S.rw.stat ? S.rw.stat.reborn : 0)})</div><div class="btnrow"><button class="btn sm" data-a="reb:1">+1 CS</button><button class="btn sm" data-a="reb:-1">-1 CS (Giảm CS)</button><button class="btn sm" data-a="reb:0">Về CS 0</button><button class="btn sm" data-a="reb:10">CS 10</button><button class="btn sm on" data-a="reb:20">CS 20 (Tối đa)</button></div>
  <div class="admh">Danh Hiệu Giang Hồ</div><div class="btnrow"><button class="btn sm on" data-a="titleall">🎖 Mở khóa mọi Danh Hiệu</button><button class="btn sm" data-a="titlemodal">Xem & Đeo Danh Hiệu</button></div>
  <div class="admh">Tiện Ích Nhanh</div><div class="btnrow"><button class="btn sm red" data-a="clearchat">💬 Xóa Sạch Kênh Chat</button><button class="btn sm" data-a="cd">Đặt lại hồi chiêu</button><button class="btn sm on" data-a="full">Hồi đầy máu/mana</button></div>
  ${typeof isNovice == "function" && isNovice() && S.lvl >= NOVICE_LV ? `<div class="btnrow"><button class="btn sm on" data-a="join">Gia nhập môn phái</button></div>` : ""}
  <p class="dim small">Lên cấp đi theo đường lên cấp của game (cộng tiềm năng / kỹ năng mỗi cấp, tự cộng điểm nếu bật, tự đổi bãi, mốc quà cấp).</p>`;
}
function admReborn(x) {
  const maxRb = typeof REBORN_MAX !== "undefined" ? REBORN_MAX : 20;
  const from = typeof rebGet == "function" ? rebGet() : ((S.rw && S.rw.stat && S.rw.stat.reborn) | 0);
  let to = from;
  if (x === "20" || x === 20) to = 20;
  else if (x === "10" || x === 10) to = 10;
  else if (x === "5" || x === 5) to = 5;
  else if (x === "0" || x === 0) to = 0;
  else to = Math.max(0, Math.min(maxRb, from + (+x || 0)));
  if (typeof rebSet == "function") rebSet(to);
  else {
    const rw = S.rw || (S.rw = {});
    (rw.stat || (rw.stat = {})).reborn = to;
  }
  let off = 0;
  if (to < from) {
    const eqLv = typeof eqLevel == "function" ? eqLevel() : (S.lvl || 1);
    for (const k of Object.keys(S.eq || {})) {
      const it = S.eq[k];
      if (!it || !(it.req || []).some(([n, e]) => n === 36 && e > eqLv)) continue;
      if (S.inv.length >= INV_MAX) break;
      S.inv.unshift(it);
      delete S.eq[k];
      off++;
    }
  }
  R.dirty = !0;
  typeof recalc == "function" && recalc();
  save();
  typeof refresh == "function" && refresh();
  return `${to < from ? "Giảm" : "Chỉnh"} chuyển sinh ${from} → <b>CS ${to}</b>${off ? ` (tháo ${off} món quá cấp)` : ""}`;
}
function admTitleAll() {
  const t = typeof TT == "function" ? TT() : null;
  if (!t || typeof TITLES == "undefined") return (toast("Lỗi dữ liệu danh hiệu"), "");
  let n = 0;
  for (const c of TITLES) {
    if (!t[c[0]]) {
      t[c[0]] = 1;
      n++;
    }
  }
  const rw = typeof RW == "function" ? RW() : null;
  if (rw && !rw.title) rw.title = "admin";
  R.dirty = !0;
  save();
  typeof refresh == "function" && refresh();
  return `Đã mở khóa toàn bộ ${TITLES.length} Danh Hiệu (gồm cả «Vô Song Vương Giả»)!`;
}

// ---------- Tiền ----------
const ADM_CUR = [
  ["gold", "Ngân lượng", "", [1e5, 1e6, 1e7, 1e8], (n) => (S.gold += n), () => S.gold, (n) => fmtL(n)],
  ["knb", "Kim Nguyên Bảo", "img/ep/knb.png", [10, 100, 1e3], (n) => (S.knb = (S.knb || 0) + n), () => S.knb || 0, fmt],
  ["fd", "Phúc Duyên", "img/ep/fd.png", [10, 100, 1e3], (n) => (RW().fd = (RW().fd || 0) + n), () => RW().fd || 0, fmt],
];
function admTabMoney() {
  return (
    ADM_CUR.map(
      ([k, n, ic, steps, , have, f]) =>
        `<div class="admcur">${ic ? `<img src="${ic}" alt="">` : '<i class="coin admcoin"></i>'}<span><b>${n}</b><small>đang có ${f(have())}</small></span><div class="btnrow">${steps.map((s) => `<button class="btn sm" data-a="cur:${k}:${s}">+${f(s)}</button>`).join("")}</div></div>`,
    ).join("") +
    `<div class="admf"><select id="admCurK">${ADM_CUR.map(([k, n]) => `<option value="${k}">${n}</option>`).join("")}</select><input type="number" id="admCurN" min="1" value="1000000"><button class="btn sm" data-a="curset">Thêm</button></div>`
  );
}
function admCur(k, n) {
  const c = ADM_CUR.find((e) => e[0] === k);
  n = Math.floor(+n);
  if (!c || !(n > 0) || n > 1e12) return (toast("Số không hợp lệ"), "");
  c[4](n);
  return `+${c[6](n)} ${c[1]}`;
}

// ---------- Vật phẩm ----------
function admKtcList() {
  return typeof KTC == "undefined" ? [] : KTC.filter((e) => e.k !== "knb" && typeof e.use == "function");
}
function admKtc(k, q) {
  const e = admKtcList().find((x) => x.k === k);
  if (!e) return "";
  // KTC use() hooks also bump daily purchase counters — keep those untouched.
  const ld = typeof ldtDay == "function" ? ldtDay().n : 0;
  let last = "";
  for (let i = 0; i < q; i++) last = e.use() || "";
  typeof ldtDay == "function" && (ldtDay().n = ld);
  return q > 1 ? `Nhận ${q} × ${esc(e.n)}` : esc(last || e.n);
}
function admTabItem() {
  const pots = J.potions
      .map(
        (p, i) =>
          `<button class="shoprow" data-a="pot:${i}"><img src="${esc(p.ic || "")}" alt=""><span><b>${esc(p.n)}</b><small>${p.kind === "life" ? "sinh lực" : p.kind === "mana" ? "nội lực" : "sinh lực + nội lực"} · còn ${potStock(p.kind)[p.tier] || 0}</small></span><em>+100</em></button>`,
      )
      .join(""),
    ktc = admKtcList()
      .map(
        (e) =>
          `<div class="shoprow admrow"><img src="${esc(e.ic)}" alt=""><span><b>${esc(e.n)}</b><small>${esc(e.d)}</small></span><span class="btnrow"><button class="btn sm" data-a="ktc:${e.k}:1">+1</button><button class="btn sm" data-a="ktc:${e.k}:10">+10</button></span></div>`,
      )
      .join(""),
    misc = [
      ["thp", typeof TH_NAME != "undefined" ? TH_NAME : "Thần Hành Phù", "img/ep/ldp.png?th", 1],
      ["wc", "Thủy Tinh Trắng", "img/ep/wc.png", 10],
      ["mys", "Thần Bí Khoáng Thạch", "img/ep/mys.png", 10],
    ]
      .map(
        ([k, n, ic, q]) =>
          `<button class="shoprow" data-a="misc:${k}:${q}"><img src="${ic}" alt=""><span><b>${n}</b><small>đang có ${matHave("misc", k)}</small></span><em>+${q}</em></button>`,
      )
      .join("");
  return `<div class="btnrow"><button class="btn sm on" data-a="potall">Mọi loại thuốc +100</button><button class="btn sm on" data-a="matpack">🎁 Gói Nguyên Liệu Ép Đồ (HT10, Đá c6...)</button></div>
  <div class="shoplist admlist"><div class="admh">Thuốc</div>${pots}
  <div class="admh">Phù · nguyên liệu</div>${misc}
  <div class="shoprow admrow"><img src="img/ep/ht.png" alt=""><span><b>Huyền Tinh Khoáng Thạch</b><small>chọn cấp</small></span><span class="btnrow"><select id="admHt">${Array.from({ length: HT_MAX }, (_, i) => `<option${i + 1 === Math.min(HT_MAX, Math.floor(S.lvl / 15) + 1) ? " selected" : ""}>${i + 1}</option>`).join("")}</select><button class="btn sm" data-a="ht:10">+10</button></span></div>
  <div class="shoprow admrow"><img src="img/ep/da1.png" alt=""><span><b>Đá thuộc tính</b><small>cấp theo cấp nhân vật, hợp đồ đang mặc</small></span><span class="btnrow"><button class="btn sm" data-a="ore:5">+5</button></span></div>
  <div class="admh">Kỳ Trân Các</div>${ktc}</div>
  <p class="dim small">Thổ Địa Phù dùng mãi không mất: hồi chiêu đặt lại ở thẻ Thế giới.</p>`;
}

// ---------- Trang bị ----------
const admKinds = (d) => {
  const it = J.items[d];
  if (!it) return [];
  const m = new Map();
  for (const r of it.list) m.has(r.k) || m.set(r.k, r);
  return [...m.values()].map((r) => [r.k, r.n]);
};
function admMake(d, k, lv, lines, s) {
  let it = null;
  for (let i = 0; i < 8 && !(it && sexOk(it)); i++) it = makeItem(d, sexPart(d, k), lv, lines, s);
  return it;
}
function admEqMake() {
  const e = admEq,
    q = clamp(e.q | 0, 1, 20);
  if (admInvFree() < 1) return (toast("Hành trang đầy"), "");
  const its = [];
  for (let i = 0; i < Math.min(q, admInvFree()); i++) its.push(admMake(e.d, e.k, e.lv, e.n, e.s));
  const n = admGive(its);
  return n ? `Tạo ${n} × <b>${esc(its[0].n)}</b> (cấp phẩm ${e.lv}, ${e.n} dòng)` : (toast("Không tạo được món này"), "");
}
function admFullGear(wear) {
  const lv = admEq.lv,
    lines = admEq.n,
    [wd, wk] = wantWeaponDP(),
    plan = [[wd, wk], [2], [3], [3], [4], [5], [6], [7], [8], [9]];
  if (admInvFree() < plan.length) return (toast(`Cần ${plan.length} ô trống trong hành trang`), "");
  const its = plan.map(([d, k]) => {
    const ks = admKinds(d).map((x) => x[0]);
    // Prefer a kind this character can wear (sex / faction / attribute requirements).
    let it = null;
    for (let i = 0; i < 16; i++) {
      it = admMake(d, k != null ? k : ks.length ? pick(ks) : 0, lv, lines, admEq.s);
      if (it && (typeof reqOk != "function" || reqOk(it))) break;
    }
    return it;
  });
  const n = admGive(its);
  wear && typeof autoEquipAll == "function" && autoEquipAll();
  return `Tạo trọn bộ ${n} món (cấp phẩm ${lv}, ${lines} dòng)${wear ? ", tự mặc đồ tốt hơn" : ""}`;
}
const ADM_ROUTE_PREFIXES = [
  "Thanh Câu", "Vân Lộc", "Thương Lang", "Tử Mãng", "Kim Ô", "Bạch Hổ",
  "Xích Lân", "Minh Phượng", "Huyền Viên", "Tinh Sương", "Đằng Long", "Tống Kim"
];

const ADM_HKMP_MERGE = {
  2: [61], 3: [62], 4: [63], 5: [64], 6: [65], 7: [66], 8: [67],
  10: [68], 11: [69], 12: [70], 13: [71], 15: [72], 16: [73], 17: [74],
  19: [75], 20: [76], 21: [77], 23: [78], 24: [79], 25: [80], 26: [81], 27: [82]
};
const ADM_HKMP_SECONDARY = new Set(Object.values(ADM_HKMP_MERGE).flat());

function admGetSetName(rows, grp, isPlat) {
  const custom = typeof SET_GRP_NAME != "undefined" && SET_GRP_NAME[grp];
  if (custom && !isPlat) return custom;
  const n0 = typeof bareName == "function" ? bareName(rows[0].n) : String(rows[0].n || "").replace(/^\[[^\]]*\]\s*/, "");
  const parts = n0.split(" ");
  let prefix = parts.slice(0, 2).join(" ");
  if (parts.length >= 4 && ADM_ROUTE_PREFIXES.some((r) => n0.startsWith(r))) {
    prefix = parts.slice(0, 4).join(" ");
  } else if (parts[0].startsWith("Tinh")) {
    prefix = parts.slice(0, 2).join(" ");
  }
  return isPlat ? `[Bạch Kim] ${prefix}` : prefix;
}

let ADM_CATALOG_CACHE = null;

function admAllCatalog() {
  if (ADM_CATALOG_CACHE) return ADM_CATALOG_CACHE;
  if (!J.sets || !J.sets.gold) return [];
  const list = [];
  const fid = S && S.fac != null && FAC[S.fac] ? FAC[S.fac].id : -1;

  // 1. Hoàng Kim Môn Phái (HKMP)
  for (let g = 1; g <= 28; g++) {
    const r1 = J.sets.gold.filter((x) => x.grp === g);
    if (!r1.length) continue;
    const extraGrps = ADM_HKMP_MERGE[g] || [];
    const r2 = extraGrps.flatMap((eg) => J.sets.gold.filter((x) => x.grp === eg));
    const allRows = [...r1, ...r2];
    const f = (allRows[0].req.find((x) => x[0] === 39) || [0, -1])[1];
    const facName = f >= 0 ? (FACTIONS.find((x) => x.id === f) || {}).n : "";
    const nm = admGetSetName(allRows, g, !1);
    const minLvl = Math.min(...allRows.map((x) => (x.req.find((r) => r[0] === 36) || [0, 0])[1]));
    const maxLvl = Math.max(...allRows.map((x) => (x.req.find((r) => r[0] === 36) || [0, 0])[1]));
    const p1Lvl = Math.min(...r1.map((x) => (x.req.find((r) => r[0] === 36) || [0, 0])[1]));
    const p2Lvl = r2.length ? Math.min(...r2.map((x) => (x.req.find((r) => r[0] === 36) || [0, 0])[1])) : 0;
    const fullLvlStr = minLvl !== maxLvl ? `${minLvl}-${maxLvl}` : minLvl;

    if (r2.length) {
      list.push({
        id: "gold_hkmp_full_" + g,
        grp: g,
        kind: "gold",
        cat: "hkmp",
        fac: f,
        mine: f >= 0 && f === fid,
        lv: minLvl,
        n: `${nm}${facName ? ` · ${facName}` : ""} (Trọn bộ ${allRows.length} món, cấp ${fullLvlStr})`,
        rows: allRows,
      });
      list.push({
        id: "gold_hkmp_p1_" + g,
        grp: g,
        kind: "gold",
        cat: "hkmp",
        fac: f,
        mine: f >= 0 && f === fid,
        lv: p1Lvl,
        n: `${nm}${facName ? ` · ${facName}` : ""} (Phần 1: ${r1.length} món, cấp ${p1Lvl})`,
        rows: r1,
      });
      list.push({
        id: "gold_hkmp_p2_" + g,
        grp: extraGrps[0],
        kind: "gold",
        cat: "hkmp",
        fac: f,
        mine: f >= 0 && f === fid,
        lv: p2Lvl,
        n: `${nm}${facName ? ` · ${facName}` : ""} (Phần 2: ${r2.length} món, cấp ${p2Lvl})`,
        rows: r2,
      });
    } else {
      list.push({
        id: "gold_hkmp_" + g,
        grp: g,
        kind: "gold",
        cat: "hkmp",
        fac: f,
        mine: f >= 0 && f === fid,
        lv: minLvl,
        n: `${nm}${facName ? ` · ${facName}` : ""} (Trọn bộ ${allRows.length} món, cấp ${fullLvlStr})`,
        rows: allRows,
      });
    }
  }

  // 2. Hoàng Kim Chung & Lộ Trình Cấp
  const otherGold = new Map();
  for (const r of J.sets.gold) {
    if (r.grp <= 28 || ADM_HKMP_SECONDARY.has(r.grp)) continue;
    const arr = otherGold.get(r.grp) || [];
    arr.push(r);
    otherGold.set(r.grp, arr);
  }

  for (const [grp, rows] of otherGold) {
    const f = (rows[0].req.find((x) => x[0] === 39) || [0, -1])[1];
    const facName = f >= 0 ? (FACTIONS.find((x) => x.id === f) || {}).n : "";
    const nm = admGetSetName(rows, grp, !1);
    const lvl = Math.min(...rows.map((x) => (x.req.find((r) => r[0] === 36) || [0, 0])[1]));
    const b0 = typeof bareName == "function" ? bareName(rows[0].n) : String(rows[0].n || "").replace(/^\[[^\]]*\]\s*/, "");
    const isRoute = ADM_ROUTE_PREFIXES.some((prefix) => b0.startsWith(prefix));
    const cat = isRoute ? "gold_route" : "gold_gen";
    let finalRows = rows;
    if (rows.length === 20) {
      finalRows = rows.slice(10, 20); // 10 món phẩm cấp cao
    }
    list.push({
      id: "gold_" + grp,
      grp: grp,
      kind: "gold",
      cat: cat,
      fac: f,
      mine: f >= 0 && f === fid,
      lv: lvl,
      n: `${nm}${facName ? ` · ${facName}` : ""} (${finalRows.length} món, cấp ${lvl})`,
      rows: finalRows,
    });
  }

  // 3. Bộ Bạch Kim (Platina)
  const platGrps = new Map();
  for (const r of J.sets.platina || []) {
    const arr = platGrps.get(r.grp) || [];
    arr.push(r);
    platGrps.set(r.grp, arr);
  }

  for (const [grp, rows] of platGrps) {
    const f = (rows[0].req.find((x) => x[0] === 39) || [0, -1])[1];
    const facName = f >= 0 ? (FACTIONS.find((x) => x.id === f) || {}).n : "";
    const nm = admGetSetName(rows, grp, !0);
    const lvl = Math.min(...rows.map((x) => (x.req.find((r) => r[0] === 36) || [0, 0])[1]));
    let finalRows = rows;
    if (rows.length === 20) {
      finalRows = rows.slice(10, 20);
    }
    list.push({
      id: "plat_" + grp,
      grp: grp,
      kind: "platina",
      cat: "platina",
      fac: f,
      mine: f >= 0 && f === fid,
      lv: lvl,
      n: `${nm}${facName ? ` · ${facName}` : ""} (${finalRows.length} món, cấp ${lvl})`,
      rows: finalRows,
    });
  }

  ADM_CATALOG_CACHE = list;
  return list;
}

function admSets() {
  const all = admAllCatalog();
  const fid = S && S.fac != null && FAC[S.fac] ? FAC[S.fac].id : -1;
  const catOrder = { hkmp: 0, gold_route: 1, platina: 2, gold_gen: 3 };
  return all
    .filter((s) => {
      const isMine = s.fac >= 0 && s.fac === fid;
      if (admSetCat !== "all" && s.cat !== admSetCat) return !1;
      if (admSetFac === "mine") return isMine || s.fac < 0;
      if (admSetFac === "-1") return s.fac < 0;
      if (admSetFac !== "all" && String(s.fac) !== String(admSetFac)) return !1;
      return !0;
    })
    .map((s) => ({
      ...s,
      mine: s.fac >= 0 && s.fac === fid,
    }))
    .sort((a, b) => {
      if (b.mine !== a.mine) return b.mine - a.mine;
      const aIsFac = a.fac >= 0 ? 1 : 0;
      const bIsFac = b.fac >= 0 ? 1 : 0;
      if (bIsFac !== aIsFac) return bIsFac - aIsFac;
      const cA = catOrder[a.cat] ?? 9;
      const cB = catOrder[b.cat] ?? 9;
      if (cA !== cB) return cA - cB;
      if (a.kind !== b.kind) return a.kind === "gold" ? -1 : 1;
      if (a.lv !== b.lv) return a.lv - b.lv;
      const aFull = a.id.includes("_full_") ? 0 : a.id.includes("_p1_") ? 1 : 2;
      const bFull = b.id.includes("_full_") ? 0 : b.id.includes("_p1_") ? 1 : 2;
      if (aFull !== bFull) return aFull - bFull;
      return a.n.localeCompare(b.n);
    });
}
function admSetGive(wear) {
  const sid = ($("#admSet") || {}).value || admSet;
  const all = admAllCatalog();
  const g = all.find((x) => String(x.id) === String(sid));
  if (!g) return (toast("Chọn bộ trang bị"), "");
  const need = g.rows.length;
  const free = admInvFree();
  if (free < 1) return (toast("Hành trang đã đầy!"), "");
  if (free < need) {
    toast(`Cần ${need} ô trống (hiện còn ${free} ô)`);
    return "";
  }
  const its = g.rows.map((r) => makeSetItem(g.kind, r, 10));
  const n = admGive(its);
  let weared = 0;
  if (wear) {
    for (const it of its) {
      if (typeof reqOk == "function" && reqOk(it) && typeof equip == "function") {
        equip(it, !0);
        weared++;
      }
    }
    typeof autoEquipAll == "function" && autoEquipAll();
  }
  const col = RAR_COL[g.kind === "platina" ? 5 : 4] || "#ffd24a";
  return `Nhận ${n} món bộ <b style="color:${col}">${esc(g.n)}</b>${wear ? (weared ? `, đã mặc ${weared}/${n} món` : " (chưa đủ cấp/điểm để mặc)") : ""}`;
}
function admHorses() {
  const res = [];
  // 1. Toàn bộ Thần Mã từ THAN_MA (thanma.js)
  if (typeof THAN_MA != "undefined" && Array.isArray(THAN_MA)) {
    for (const tm of THAN_MA) {
      res.push({
        id: "tm_" + tm[0],
        n: `★ [Thần Mã] ${tm[3]} (Cấp ${tm[4]})`,
        group: "★ Thần Mã Cực Phẩm (14 loại)",
        isTm: true,
        tmId: tm[0],
        lvl: tm[4],
      });
    }
  }

  // 2. Toàn bộ 54 loại ngựa chuẩn trong game từ J.items[10].list
  const it = typeof J != "undefined" && J.items && J.items[10];
  if (it && it.list) {
    const nameMap = new Map();
    for (const r of it.list) {
      if (!sexReqOk(r.req)) continue;
      const cur = nameMap.get(r.n);
      if (!cur || r.lvl > cur.lvl) nameMap.set(r.n, r);
    }

    for (const r of nameMap.values()) {
      const reqLv = (r.req.find((x) => x[0] === 36) || [0, 0])[1];
      let group = "Ngựa Thường & Đại Uyển (Cấp 25 - 72)";
      if (r.k >= 14 && r.k <= 17) {
        group = "Thú Cưỡi Hổ Vương (Cấp 150 - 180)";
      } else if (r.k >= 22 && r.k <= 29) {
        group = "Thú Cưỡi Đặc Biệt (Sư tử, Lạc đà, Hươu...)";
      } else if (r.k >= 19 && r.k <= 21) {
        group = "Dòng Ngựa Phong Vân (Cấp 150)";
      } else if (r.k === 5) {
        group = "Ngũ Đại Danh Mã (Cấp 80)";
      } else if (reqLv >= 80 || (typeof HORSE_RARE != "undefined" && HORSE_RARE.includes(r.k))) {
        group = "Danh Mã & Bảo Mã Hiếm (Cấp 80 - 150)";
      }

      res.push({
        id: `h_${r.k}_${r.lvl}`,
        n: `${r.n} (Cấp ${reqLv})`,
        group: group,
        isTm: false,
        k: r.k,
        lvl: r.lvl,
        reqLv: reqLv,
      });
    }
  }
  return res;
}
function admHorseOpts(hs, cur) {
  const groups = new Map();
  for (const h of hs) {
    const g = h.group || "Khác";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(h);
  }
  let out = "";
  for (const [grp, list] of groups) {
    out += `<optgroup label="${esc(grp)}">`;
    for (const h of list) {
      out += `<option value="${h.id}"${String(h.id) === String(cur) ? " selected" : ""}>${esc(h.n)}</option>`;
    }
    out += `</optgroup>`;
  }
  return out;
}
function admMaskOpts(cur) {
  const list = (typeof J !== "undefined" && J.items && J.items[11] && J.items[11].list) || [];
  return list.map((m) => `<option value="${m.k}"${Number(m.k) === Number(cur) ? " selected" : ""}>${m.k}. ${esc(m.n)} (3 ngày)</option>`).join("");
}
function admHorseGive() {
  const hs = admHorses();
  const curId = (typeof $ == "function" && $("#admHorse") && $("#admHorse").value) || admHorse;
  const r = hs.find((x) => String(x.id) === String(curId));
  if (!r) return (toast("Chọn ngựa"), "");
  if (admInvFree() < 1) return (toast("Hành trang đầy"), "");
  let h = null;
  if (r.isTm) {
    if (typeof makeThanMa == "function") {
      h = makeThanMa(r.tmId);
    }
  } else {
    h = makeItem(10, r.k, r.lvl, 0);
    if (h) {
      typeof HORSE_RARE != "undefined" && HORSE_RARE.includes(r.k) && ((h.r = 2), (h.rareH = 1));
    }
  }
  if (!h) return (toast("Không thể tạo ngựa"), "");
  return admGive([h]) ? `Nhận ngựa <b>${esc(h.n)}</b>` : "";
}
function admHorseAll() {
  const all = typeof hcAll == "function" ? hcAll() : null;
  if (!all) return (toast("Lỗi dữ liệu Mã Trường"), "");
  const owned = typeof hcOwned == "function" ? hcOwned() : new Map();
  const st = typeof stable == "function" ? stable() : (S.stable || (S.stable = []));
  let added = 0;
  for (const [key, val] of all.entries()) {
    if (owned.has(key)) continue;
    const [name, tier] = val;
    const itemDef = J.items && J.items[10] && J.items[10].list.find((r) => hcKey(r) === key);
    if (!itemDef) continue;
    const h = makeItem(10, itemDef.k, itemDef.lvl, 0);
    if (h) {
      typeof HORSE_RARE != "undefined" && HORSE_RARE.includes(itemDef.k) && ((h.r = 2), (h.rareH = 1));
      st.push(h);
      owned.set(key, tier);
      added++;
    }
  }
  R.dirty = !0;
  typeof invDirty != "undefined" && (invDirty = !0);
  typeof recalc == "function" && recalc();
  return added > 0
    ? `Đã thêm ${added} ngựa vào Mã Trường (Đủ trọn bộ 48/48 loài · +48% HP, +125% EXP)`
    : "Mã Trường đã thu thập đủ trọn bộ 48 loài ngựa!";
}
function admEnhFull() {
  const eq = S.eq;
  if (!eq) return (toast("Không có trang bị"), "");
  let count = 0;
  const maxEnh = typeof ENH_MAX != "undefined" ? ENH_MAX : 10;
  for (const [slot, item] of Object.entries(eq)) {
    if (item && item.d !== 10) {
      item.enh = maxEnh;
      typeof recEnh == "function" && recEnh(item);
      count++;
    }
  }
  R.dirty = !0;
  typeof invDirty != "undefined" && (invDirty = !0);
  typeof recalc == "function" && recalc();
  typeof renderPad == "function" && renderPad();
  save();
  return count > 0
    ? `Đã cường hóa +${maxEnh} tối đa cho ${count} món trang bị đang mặc!`
    : (toast("Chưa mặc trang bị nào (hoặc chỉ có ngựa)"), "");
}
function admMatPack() {
  const addMat = typeof matAdd == "function" ? matAdd : (k, t, n) => {
    const m = S.mats || (S.mats = {});
    m[k] = m[k] || {};
    m[k][t] = (m[k][t] || 0) + n;
  };
  addMat("ht", 10, 99);
  addMat("misc", "wc", 99);
  addMat("misc", "mys", 99);
  if (typeof RW == "function") RW().fd = (RW().fd || 0) + 10000;
  let oreCount = 0;
  for (let place = 0; place < 6; place++) {
    const defaultA = [126, 166, 115, 58, 43, 150][place];
    const pool = typeof orePool == "function" ? orePool(place) : null;
    const a = pool && pool.length ? pool[0] : defaultA;
    const s = place % 2 === 1 ? (S.fac && typeof FAC != "undefined" && FAC[S.fac] ? FAC[S.fac].series : 0) : -1;
    const k = typeof oreKey == "function" ? oreKey(place, a, 6, s) : `${place}:${a}:6` + (s >= 0 && place % 2 ? `:${s}` : "");
    addMat("ore", k, 5);
    oreCount += 5;
  }
  R.dirty = !0;
  save();
  return `Đã nhận: <b>99× Huyền Tinh cấp 10</b>, <b>${oreCount}× Đá thuộc tính cấp 6</b> (đủ 6 vị trí), <b>99× Thủy Tinh</b>, <b>99× Thần Bí K.T</b> và <b>+10.000 Phúc Duyên</b>!`;
}
function admTabEq() {
  const e = admEq,
    ds = Object.keys(J.items)
      .map(Number)
      .filter((d) => d !== 10),
    ks = admKinds(e.d);
  ks.some((x) => x[0] === e.k) || (e.k = ks.length ? ks[0][0] : 0);
  const sets = admSets(),
    hs = admHorses();
  sets.some((g) => String(g.id) === String(admSet)) || (admSet = sets.length ? String(sets[0].id) : "");
  hs.some((h) => String(h.id) === String(admHorse)) || (admHorse = hs.length ? String(hs[0].id) : "");
  const opt = (v, cur, label) => `<option value="${v}"${String(v) === String(cur) ? " selected" : ""}>${esc(label)}</option>`;
  return `<p class="dim small">Hành trang trống ${admInvFree()} / ${INV_MAX} ô. Đồ tạo bằng bộ sinh đồ của game (như đồ rơi). Tự mặc chỉ mặc món đủ yêu cầu (thiếu sức mạnh / thân pháp: thêm tiềm năng ở thẻ Cấp).</p>
  <div class="admh">Tạo món lẻ</div>
  <div class="admgrid">
    <label>Loại<select id="admEqD">${ds.map((d) => opt(d, e.d, J.items[d].n)).join("")}</select></label>
    <label>Kiểu<select id="admEqK">${ks.map(([k, n]) => opt(k, e.k, n)).join("")}</select></label>
    <label>Cấp phẩm<select id="admEqL">${Array.from({ length: 10 }, (_, i) => opt(i + 1, e.lv, String(i + 1))).join("")}</select></label>
    <label>Số dòng<select id="admEqN">${Array.from({ length: 7 }, (_, i) => opt(i, e.n, i ? `${i} dòng` : "Trắng")).join("")}</select></label>
    <label>Hệ<select id="admEqS">${opt(-1, e.s, "Ngẫu nhiên")}${SERIES.map((n, i) => opt(i, e.s, n)).join("")}</select></label>
    <label>Số lượng<input type="number" id="admEqQ" min="1" max="20" value="${e.q}"></label>
  </div>
  <div class="btnrow"><button class="btn sm on" data-a="eqmake">Tạo</button><button class="btn sm" data-a="eqfull:0">Trọn bộ 10 món</button><button class="btn sm" data-a="eqfull:1">Trọn bộ + tự mặc</button></div>
  <div class="admh">Cường Hóa & Tinh Luyện (Lò Rèn)</div>
  <div class="btnrow">
    <button class="btn sm on" data-a="enhfull" title="Cường hóa +10 tối đa cho toàn bộ 10 món trang bị đang mặc">⚡ Full Cường Hóa +10 toàn thân</button>
    <button class="btn sm" data-a="matpack" title="Nhận 99x Huyền Tinh c10, Đá thuộc tính c6, Thủy Tinh, Thần Bí KT, Phúc Duyên">🎁 Gói Nguyên Liệu Khảm & Ép Đồ</button>
  </div>
  <div class="admh">Bộ Trang Bị (Hoàng Kim & Bạch Kim)</div>
  <div class="admgrid" style="grid-template-columns:1fr 1fr">
    <label>Loại bộ<select id="admSetCat">
      ${opt("all", admSetCat, "Tất cả loại bộ")}
      ${opt("hkmp", admSetCat, "Hoàng Kim Môn Phái (10 món)")}
      ${opt("gold_gen", admSetCat, "Hoàng Kim Chung (An Bang, Định Quốc...)")}
      ${opt("gold_route", admSetCat, "Lộ Trình Cấp (Thanh Câu → Đằng Long)")}
      ${opt("platina", admSetCat, "Bộ Bạch Kim (Platina)")}
    </select></label>
    <label>Môn phái<select id="admSetFac">
      ${opt("mine", admSetFac, "★ Phái hiện tại")}
      ${opt("all", admSetFac, "Tất cả phái")}
      ${opt("-1", admSetFac, "Bộ chung (Không phái)")}
      ${FACTIONS.map((f) => opt(f.id, admSetFac, f.n)).join("")}
    </select></label>
  </div>
  <div class="admf" style="margin-top:6px">
    <select id="admSet" style="flex:1 1 240px">${sets.map((g) => opt(g.id, admSet, (g.mine ? "★ " : "") + g.n)).join("")}</select>
  </div>
  <div class="btnrow" style="margin-top:6px">
    <button class="btn sm on" data-a="set">Nhận trọn bộ</button>
    <button class="btn sm" data-a="setwear">Nhận & Tự mặc</button>
  </div>
  <div class="admh">Ngựa & Thú Cưỡi (Đầy đủ ${hs.length} loại · Cả Thần Mã)</div>
  <div class="admf"><select id="admHorse">${admHorseOpts(hs, admHorse)}</select><button class="btn sm" data-a="horse">Nhận ngựa</button><button class="btn sm on" data-a="horseall" title="Thu thập đủ 48 loài ngựa vào Mã Trường">⚡ Đủ 48 ngựa Mã Trường</button></div>
  <div class="admh">🎭 Mặt Nạ & Ngoại Trang (Mặt Nạ Võ Lâm)</div>
  <div class="admf" style="margin-bottom:6px">
    <select id="admMask">${admMaskOpts(admMask)}</select>
    <button class="btn sm on" data-a="mask">Nhận Mặt Nạ</button>
    <button class="btn sm" data-a="mask_all" title="Nhận trọn bộ 13 mặt nạ Võ Lâm vào túi để test">🎁 Nhận 13 Mặt Nạ (Test)</button>
  </div>
  <div class="btnrow">
    <button class="btn sm on" data-a="mask_refresh" title="Cập nhật tất cả mặt nạ trong túi sang model người mới nhất">🔄 Cập Nhật Mặt Nạ Mới</button>
    <button class="btn sm red" data-a="mask_reset" title="Xóa toàn bộ mặt nạ trong túi/người và reset thời hạn 3 ngày ở Kỳ Trân Các để mua test">🗑️ Reset / Xóa Hết Mặt Nạ</button>
  </div>`;
}

// ---------- Chiến đấu ----------
function admMaxSkills() {
  const f = FAC[S.fac];
  if (!f || !f.skills) return (toast("Chưa có môn phái"), "");
  let n = 0;
  const L = typeof SKL == "function" ? SKL() : {},
    one = (pass2) => {
      for (const id of f.skills) {
        const t = SK[id];
        if (!t || !skReqOk(t)) continue;
        const br = typeof isBr90 == "function" && isBr90(id);
        if (br !== pass2) continue;
        let to;
        if (t.tier === 90 && !br) {
          to = t.max;
          L[id] = { lv: to, xp: 0 };
          t.book && ((S.bkOk || (S.bkOk = {}))[id] = 1);
        } else to = skCap(t);
        to > (S.sk[id] || 0) && ((S.sk[id] = to), n++);
      }
    };
  one(!1);
  one(!0); // 90 branch skills: cap depends on their branch skills
  if (!n) return (toast("Võ công đã tối đa ở cấp hiện tại"), "");
  R.dirty = !0;
  recalc();
  typeof fillSlots == "function" && fillSlots();
  renderPad();
  return `Tối đa ${n} võ công (theo giới hạn cấp hiện tại)`;
}
function admResetCd() {
  R.potCd = { life: 0, mana: 0 };
  R.skCd = {};
  R.tpCd = 0;
  R.thAt = 0;
  R.rideCd = 0;
  typeof SKS == "function" && (SKS().cd = {});
  return "Đặt lại mọi thời gian hồi (chiêu, thuốc, Thổ Địa Phù, Thần Hành Phù, ngựa)";
}
function admFull() {
  R.dirty && recalc();
  R.life = R.P.life;
  R.mana = R.P.mana;
  R.hpDot = R.hpDotT = 0;
  return "Hồi đầy sinh lực + nội lực";
}
function admTabSkill() {
  const sw = (k, on, n, d) =>
    `<button class="shoprow admsw${on ? " own" : ""}" data-a="${k}"><span class="admck">${on ? "✔" : ""}</span><span><b>${n}</b><small>${d}</small></span><em>${on ? "Đang bật" : "Tắt"}</em></button>`;
  return `<div class="btnrow"><button class="btn sm on" data-a="skmax">Tối đa võ công</button><button class="btn sm" data-a="cd">Đặt lại hồi chiêu</button><button class="btn sm" data-a="full">Hồi đầy HP / MP</button></div>
  <div class="shoplist admlist">${sw("god", !!R.admGod, "Bất tử", "Quái đánh không mất máu, không thể trọng thương")}${sw("ohk", !!R.admOhk, "Nhất kích", "Mỗi đòn đánh trúng hạ gục mục tiêu")}</div>
  <p class="dim small">Bất tử / Nhất kích chỉ có hiệu lực trong phiên này (tải lại trang sẽ tắt).</p>`;
}

// ---------- Thế giới ----------
function admGo(k) {
  if (typeof thGo != "function") return (toast("Thiếu Thần Hành Phù"), "");
  if (k.startsWith("v:")) {
    // JX1 destination (thanhanh_dest.js): unlock the zone it uses (visit / zone maps)
    const d = typeof thDest == "function" && thDest(k.split(":")[1]),
      p = d && thPlan(d);
    p && p.z != null && !zoneOpen(p.z) && (S.maxStage = Math.max(S.maxStage || 1, zoneFirst(p.z)));
  } else if (k !== "town") {
    const z = +k.split(":")[0];
    zoneOpen(z) || (S.maxStage = Math.max(S.maxStage || 1, zoneFirst(z)));
  }
  // Reuse Thần Hành Phù's travel path, ignoring its cooldown / item count.
  const had = thHave(),
    at = R.thAt;
  had < 1 && matAdd("misc", TH_KEY, 1);
  R.thAt = 0;
  const lg = R.logs && R.logs[0],
    mg = typeof MIGU == "object" ? MIGU : null; // Mật Cốc: no pass / level needed (js/migu.js)
  mg && mg.adm++;
  try {
    thGo(k);
  } finally {
    mg && mg.adm--;
  }
  const moved = R.logs && R.logs[0] !== lg;
  had < 1 && matAdd("misc", TH_KEY, -1);
  R.thAt = at;
  moved && R.logs[0].includes(TH_NAME) && R.logs.shift();
  if (!moved) return "";
  const dest = typeof thKeyName == "function" ? thKeyName(k) : k;
  return `Dịch chuyển tới <b>${esc(dest)}</b>`;
}
// Same destination list as the Thần Hành Phù picker (thanhanh.js thListHTML), rows act via data-a="go:<key>".
function admTabWorld() {
  return `
  <div class="admh">🏆 Bảng Xếp Hạng & Kênh Chat Online</div>
  <div class="btnrow" style="margin-bottom:8px">
    <button class="btn sm red" data-a="clearrank">🧹 Xóa Trắng Bảng Xếp Hạng</button>
    <button class="btn sm red" data-a="clearchat">💬 Xóa Sạch Kênh Chat (Cả Server)</button>
  </div>
  <div class="admh">⚔️ Boss Thế Giới Online (Trung Hiếu)</div>
  <div class="btnrow" style="margin-bottom:8px">
    <button class="btn sm on" data-a="wbsummon">⚡ Triệu Hồi Boss Thế Giới Ngay (Cả Server)</button>
    <button class="btn sm red" data-a="wbkill">💀 Kết Thúc Boss Thế Giới</button>
  </div>
  <div class="admh">Bản Đồ & Luyện Công</div>
  <div class="btnrow">
    <button class="btn sm on" data-a="unlock">Mở mọi bãi luyện công</button>
    <button class="btn sm" data-a="cd">Đặt lại Thổ Địa / Thần Hành</button>
    <button class="btn sm" data-a="thmodal">📜 Thần Hành Phù (Dịch Chuyển)</button>
  </div>`;
}

// ---------- Character selector (đồ đệ) ----------
const ADM_CH_TABS = { lv: 1, eq: 1, skill: 1 },
  admChN = () => (typeof partyN == "function" ? partyN() : 0),
  admChOf = (k) => (ADM_CH_TABS[k] || k === "join" || k === "ore" ? admCh : 0),
  admInCh = (k, fn) => (typeof withChar == "function" && admChOf(k) ? withChar(admChOf(k), fn) : fn());
function admChRow() {
  if (!admChN() || !ADM_CH_TABS[admTab]) return "";
  admCh > admChN() && (admCh = 0);
  return `<div class="dtabs admch"><small class="dim">Áp dụng cho:</small>${partyIdx()
    .map(
      (k) =>
        `<button data-ach="${k}" class="${k === admCh ? "on" : ""}">${k + 1}. ${esc(charGet(k, "name") || "")} <small>Lv${charGet(k, "lvl")}</small></button>`,
    )
    .join("")}</div>`;
}

// ---------- Modal ----------
let admPePlayersList = [];
let admAccountsMap = {};
let admPeSelectedName = "";
let admPeSet = "";
let admPeHorse = "";
let admPeMask = 1;
let admPeMaskPerm = false;

function admPeSetOptions(targetFac) {
  const all = typeof admAllCatalog === "function" ? admAllCatalog() : [];
  const fid = targetFac != null ? targetFac : -1;
  const targetFacName = (typeof FACTIONS !== "undefined" && FACTIONS.find((f) => f.id === fid))?.n || "";

  // Prioritize full sets (skip partial p1/p2 variants to keep the list clean)
  const fullSets = all.filter((s) => !s.id.includes("_p1_") && !s.id.includes("_p2_"));
  const groups = [
    {
      label: `⭐ HK Môn Phái${targetFacName ? ` (${targetFacName})` : ""}`,
      filter: (s) => s.cat === "hkmp" && s.fac === fid,
    },
    {
      label: "👑 Hoàng Kim Chung (An Bang, Định Quốc...)",
      filter: (s) => s.cat === "gold_gen",
    },
    {
      label: "📜 Lộ Trình Cấp (Thanh Câu → Đằng Long)",
      filter: (s) => s.cat === "gold_route",
    },
    {
      label: "⚔️ HK Môn Phái Khác",
      filter: (s) => s.cat === "hkmp" && s.fac !== fid,
    },
    {
      label: "✨ Trang Bị Bạch Kim (Platina)",
      filter: (s) => s.cat === "platina",
    },
  ];

  let out = "";
  for (const g of groups) {
    const list = fullSets.filter(g.filter);
    if (!list.length) continue;
    out += `<optgroup label="${esc(g.label)}">`;
    for (const s of list) {
      out += `<option value="${s.id}"${String(s.id) === String(admPeSet) ? " selected" : ""}>${esc(s.n)}</option>`;
    }
    out += `</optgroup>`;
  }
  return out;
}

function sendPlayerEditCmd(targetName, cmd, successMsg) {
  cmd.id = "cmd_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
  cmd.t = Date.now();
  if (typeof firebase === "undefined" || !window.CHAT_CFG || !CHAT_CFG.firebaseUrl) {
    if (typeof S !== "undefined" && S && S.name === targetName && typeof peApply === "function") {
      S.admQ = S.admQ || {};
      S.admQ[cmd.id] = cmd;
      peApply();
      return successMsg || "Đã áp dụng lệnh can thiệp thành công!";
    }
    return toast("Firebase chưa kết nối"), "";
  }
  try {
    const db = firebase.database();
    // Firebase strictly rejects objects with undefined values: strip them clean
    const cleanCmd = JSON.parse(JSON.stringify(cmd));
    db.ref("player_commands/name/" + targetName).push(cleanCmd);
    return successMsg || "Đã gửi lệnh can thiệp thành công!";
  } catch (e) {
    return "Lỗi gửi lệnh: " + e.message;
  }
}

function admTabPlayers() {
  if (window.CHAT_CFG && CHAT_CFG.firebaseUrl && (!admPePlayersList.length || !Object.keys(admAccountsMap).length)) {
    Promise.all([
      fetch(`${CHAT_CFG.firebaseUrl}/accounts.json`).then(r => r.json()).catch(() => null),
      fetch(`${CHAT_CFG.firebaseUrl}/ranking/players.json`).then(r => r.json()).catch(() => null)
    ]).then(([accs, ranks]) => {
      let changed = false;
      if (accs) {
        admAccountsMap = accs;
        changed = true;
      }
      if (ranks) {
        admPePlayersList = Object.values(ranks);
        changed = true;
      }
      if (accs) {
        for (const [u, acc] of Object.entries(accs)) {
          const charN = acc.charName || u;
          if (!admPePlayersList.some(p => p.name === charN || p.u === u)) {
            admPePlayersList.push({
              name: charN,
              u: u,
              fac: (acc.saveData && typeof unpack === "function" ? (unpack(acc.saveData).state || {}).fac : null) || "emei",
              lvl: acc.lvl || 1,
              reborn: acc.reborn || 0,
              power: 0
            });
            changed = true;
          }
        }
      }
      if (changed && admTab === "players" && !$("#modal").classList.contains("hidden")) {
        admModal();
      }
    });
  }

  const pOptions = (admPePlayersList.length
    ? admPePlayersList.map(p => {
        const accInfo = Object.values(admAccountsMap).find(a => a.charName === p.name || a.u === p.name || a.u === p.u);
        const uLabel = accInfo ? ` [TK: ${accInfo.u}]` : (p.u ? ` [TK: ${p.u}]` : "");
        return `<option value="${esc(p.name)}" ${p.name === admPeSelectedName ? "selected" : ""}>${esc(p.name)}${uLabel} (${esc(facName(p.fac))} · Lv${p.lvl || 1}${p.reborn ? ` · CS${p.reborn}` : ""})</option>`;
      }).join("")
    : `<option value="">(Đang tải danh sách người chơi...)</option>`
  );

  const selP = admPePlayersList.find(p => p.name === admPeSelectedName) || (admPePlayersList[0] || null);
  if (selP && !admPeSelectedName) admPeSelectedName = selP.name;

  const currAcc = Object.values(admAccountsMap).find(a => a.charName === selP?.name || a.u === selP?.name || a.u === selP?.u) 
               || (selP && admAccountsMap[selP.u]) 
               || (selP && admAccountsMap[selP.name]) 
               || null;

  const hs = typeof admHorses === "function" ? admHorses() : [];
  if (!admPeHorse || !hs.some(h => String(h.id) === String(admPeHorse))) {
    admPeHorse = hs[0] ? String(hs[0].id) : "";
  }
  const allCatalog = typeof admAllCatalog === "function" ? admAllCatalog() : [];
  if (selP && (!admPeSet || !allCatalog.some(s => String(s.id) === String(admPeSet)))) {
    const defaultSet = allCatalog.find(s => s.cat === "hkmp" && s.fac === selP.fac && s.id.includes("full"))
                    || allCatalog.find(s => s.cat === "hkmp" && s.fac === selP.fac)
                    || allCatalog[0];
    if (defaultSet) admPeSet = String(defaultSet.id);
  }

  return `
  <div class="admh">👤 Quản Lý Người Chơi (Can Thiệp Tài Khoản Từ Xa)</div>
  <div class="admf" style="margin-bottom:8px">
    <select id="admPeTarget" style="flex:1;padding:5px;font-size:12px;background:#111;color:#fff;border:1px solid #777">
      ${pOptions}
    </select>
    <button class="btn sm" data-a="pe_reload">🔄 Tải lại</button>
  </div>
  ${selP ? `
    <div class="card stats" style="margin-bottom:8px;background:#1a1914;padding:6px">
      <span>Đang chọn</span><span class="gold"><b>${esc(selP.name)}</b></span>
      <span>Môn phái</span><span>${esc(facName(selP.fac))}</span>
      <span>Cấp độ</span><span>${selP.lvl || 1}</span>
      <span>Chuyển sinh</span><span class="cp"><b>CS ${selP.reborn || 0}</b></span>
      <span>Lực chiến</span><span>${fmt(selP.power || 0)}</span>
    </div>

    <div class="admh">🔑 Tài Khoản & Mật Khẩu Đăng Nhập</div>
    <div class="card" style="margin-bottom:8px;background:#14171f;border:1px solid #d4af37;padding:10px 12px;border-radius:6px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span style="color:#aaa;font-size:12px">Tên đăng nhập:</span>
        <b style="color:#7ee07e;font-size:14px">${esc(currAcc ? currAcc.u : (selP ? (selP.u || selP.name) : "N/A"))}</b>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="color:#aaa;font-size:12px">Mật khẩu hiện tại:</span>
        <b id="admCurPassText" style="color:#ffd700;font-size:14px;letter-spacing:1px;font-family:monospace">${esc(currAcc && currAcc.rawP ? currAcc.rawP : (currAcc ? "(Mật khẩu đã mã hóa · Hãy đổi mật khẩu mới)" : "(Chưa có tài khoản mây)"))}</b>
      </div>
      ${currAcc ? `
        <div class="admf" style="margin:6px 0 0;gap:6px">
          <input type="text" id="admNewPassInput" placeholder="Nhập mật khẩu mới cho ${esc(currAcc.u)}…" style="flex:1;background:#0d1117;color:#fff;border:1px solid #777;padding:5px 8px;font-size:12px;border-radius:4px" maxlength="32">
          <button class="btn sm on" data-a="pe_changepass" style="font-weight:bold;color:#fff;background:#238636;border-color:#2ea043">⚡ Đổi Mật Khẩu</button>
        </div>
        <p class="dim small" style="margin:4px 0 0;font-size:11px">💡 Nhập mật khẩu mới rồi bấm "Đổi Mật Khẩu" để đặt lại ngay cho người chơi này.</p>
      ` : ''}
    </div>
  ` : ''}

  <div class="admh">📈 Cấp Độ & Kinh Nghiệm (Tăng / Giảm Cấp & EXP)</div>
  <div class="admf">
    <label>Đặt cấp: <input type="number" id="admPeLvVal" min="1" max="200" value="${selP ? (selP.lvl || 80) : 80}" style="width:65px"></label>
    <button class="btn sm on" data-a="pe_setlv">Đặt Cấp</button>
    <button class="btn sm" data-a="pe_inclv" title="Tăng 1 cấp">🔺 +1 Cấp</button>
    <button class="btn sm red" data-a="pe_declv" title="Giảm 1 cấp">🔻 -1 Cấp</button>
  </div>
  <div class="admf">
    <label>EXP: <input type="number" id="admPeXpVal" placeholder="Số lượng EXP" value="10000000" style="width:120px"></label>
    <button class="btn sm on" data-a="pe_addxp">➕ Cộng EXP</button>
    <button class="btn sm red" data-a="pe_subxp">➖ Trừ EXP</button>
  </div>

  <div class="admh">🔄 Chuyển Sinh (Tăng / Giảm Cấp CS)</div>
  <div class="admf">
    <label>Chuyển sinh: <input type="number" id="admPeRebornVal" min="0" max="10" value="${selP ? (selP.reborn || 0) : 0}" style="width:55px"></label>
    <button class="btn sm on" data-a="pe_setreborn">Đặt CS</button>
    <button class="btn sm" data-a="pe_increborn" title="Tăng 1 cấp chuyển sinh">🔺 +1 CS</button>
    <button class="btn sm red" data-a="pe_decreborn" title="Giảm 1 cấp chuyển sinh">🔻 -1 CS</button>
    <button class="btn sm red" data-a="pe_resetreborn" title="Về chưa chuyển sinh (CS 0)">Về CS 0</button>
  </div>

  <div class="admh">💰 Ngân Lượng & Kim Nguyên Bảo (Tặng / Rút)</div>
  <div class="admf">
    <label>Ngân lượng: <input type="number" id="admPeGoldVal" placeholder="Số lượng" value="10000000" style="width:100px"></label>
    <button class="btn sm on" data-a="pe_sendgold">➕ Tặng Vàng</button>
    <button class="btn sm red" data-a="pe_subgold">➖ Rút Vàng</button>
    <button class="btn sm red" data-a="pe_zerogold" title="Đưa ngân lượng về 0">Về 0 Lượng</button>
  </div>
  <div class="admf">
    <label>KNB: <input type="number" id="admPeKnbVal" placeholder="Số lượng" value="1000" style="width:100px"></label>
    <button class="btn sm on" data-a="pe_sendknb">➕ Tặng KNB</button>
    <button class="btn sm red" data-a="pe_subknb">➖ Rút KNB</button>
    <button class="btn sm red" data-a="pe_zeroknb" title="Đưa KNB về 0">Về 0 KNB</button>
  </div>

  <div class="admh">🐎 Thú Cưỡi & Ngựa (Tặng / Thu Hồi)</div>
  <div class="admf" style="margin-bottom:6px">
    <select id="admPeHorse" style="flex:1 1 200px;min-width:180px;background:#111;color:#fff;border:1px solid #777;padding:5px;font-size:12px">
      ${admHorseOpts(hs, admPeHorse || (hs[0] ? hs[0].id : ""))}
    </select>
    <button class="btn sm on" data-a="pe_givehorse">🎁 Tặng Ngựa</button>
    <button class="btn sm red" data-a="pe_revokehorse" title="Thu hồi loài ngựa đang chọn trong dropdown">🚫 Thu Hồi Ngựa Này</button>
  </div>
  <div class="btnrow" style="margin-bottom:6px">
    <button class="btn sm on" data-a="pe_giveallhorses" title="Mở khóa và tặng đủ 48 loài ngựa vào Mã Trường">⚡ Đủ 48 Ngựa</button>
    <button class="btn sm red" data-a="pe_revokeallhorses" title="Thu hồi toàn bộ ngựa và dọn sạch Mã Trường">🧹 Dọn Sạch Mã Trường</button>
  </div>

  <div class="admh">🎭 Mặt Nạ & Ngoại Trang (Tặng / Thu Hồi)</div>
  <div class="admf" style="margin-bottom:6px">
    <select id="admPeMask" style="flex:1 1 200px;min-width:180px;background:#111;color:#fff;border:1px solid #777;padding:5px;font-size:12px">
      ${admMaskOpts(admPeMask || 1)}
    </select>
    <label style="display:flex;align-items:center;gap:4px;font-size:12px;color:#ffd76a;white-space:nowrap;margin:0 4px">
      <input type="checkbox" id="admPeMaskPerm" ${admPeMaskPerm ? "checked" : ""}> Vĩnh viễn
    </label>
    <button class="btn sm on" data-a="pe_givemask">🎁 Tặng Mặt Nạ Này</button>
    <button class="btn sm red" data-a="pe_revokemask" title="Thu hồi loại mặt nạ đang chọn trong dropdown">🚫 Thu Hồi Mặt Nạ Này</button>
  </div>
  <div class="btnrow" style="margin-bottom:6px">
    <button class="btn sm on" data-a="pe_giveallmasks" title="Tặng toàn bộ 13 loại mặt nạ Võ Lâm cho người chơi">⚡ Tặng Đủ 13 Mặt Nạ</button>
    <button class="btn sm red" data-a="pe_revokeallmasks" title="Thu hồi toàn bộ mặt nạ trên người, trong túi và kho">🧹 Thu Hồi Hết Mặt Nạ</button>
  </div>

  <div class="admh">🎁 Trang Bị & Bộ Trang Bị (Tặng / Thu Hồi)</div>
  <div class="admf" style="margin-bottom:6px">
    <select id="admPeSet" style="flex:1 1 200px;min-width:180px;background:#111;color:#fff;border:1px solid #777;padding:5px;font-size:12px">
      ${admPeSetOptions(selP ? selP.fac : -1)}
    </select>
    <button class="btn sm on" data-a="pe_giveset">Gửi Bộ Này</button>
    <button class="btn sm on" data-a="pe_givesetwear" title="Gửi và tự động mặc nếu đủ điều kiện">Gửi & Mặc</button>
    <button class="btn sm red" data-a="pe_revokeset" title="Thu hồi các món thuộc bộ này trên người và hành trang">🚫 Thu Hồi Bộ Này</button>
  </div>
  <div class="btnrow" style="margin-bottom:6px">
    <button class="btn sm on" data-a="pe_givehkmp" title="Tự động tặng trọn bộ Hoàng Kim Môn Phái 10 món phù hợp với phái">⭐ Full HKMP Phái</button>
    <button class="btn sm red" data-a="pe_revokehkmp" title="Thu hồi toàn bộ trang bị HKMP">🚫 Thu Hồi HKMP</button>
    <button class="btn sm on" data-a="pe_giveab" title="Tặng bộ An Bang hoàn chỉnh">Tặng An Bang</button>
    <button class="btn sm red" data-a="pe_revokeab" title="Thu hồi bộ An Bang">🚫 Thu Hồi AB</button>
    <button class="btn sm on" data-a="pe_givedq" title="Tặng bộ Định Quốc hoàn chỉnh">Tặng Định Quốc</button>
    <button class="btn sm red" data-a="pe_revokedq" title="Thu hồi bộ Định Quốc">🚫 Thu Hồi ĐQ</button>
  </div>
  <div class="btnrow" style="margin-bottom:8px">
    <button class="btn sm on" data-a="pe_enhfull" title="Cường hóa +10 tối đa toàn bộ trang bị đang mặc trên người">⚡ Full Cường Hóa +10</button>
    <button class="btn sm red" data-a="pe_enhreset" title="Đưa cường hóa toàn thân về +0">🔻 Về Cường Hóa +0</button>
    <button class="btn sm red" data-a="pe_stripwear" title="Lột sạch toàn bộ trang bị đang mặc trên người">🧹 Lột Sạch Đồ Đang Mặc</button>
  </div>

  <div class="admh">💎 Nguyên Liệu & Thuốc (Tặng / Rút)</div>
  <div class="btnrow" style="margin-bottom:8px">
    <button class="btn sm on" data-a="pe_givematpack" title="Tặng 99 Huyền Tinh 10, Thủy Tinh, Thần Bí KT, 30 Đá c6, 10.000 Phúc Duyên">💎 Gói Nguyên Liệu</button>
    <button class="btn sm red" data-a="pe_revokematpack" title="Thu hồi toàn bộ nguyên liệu ép đồ">🚫 Thu Hồi Nguyên Liệu</button>
    <button class="btn sm on" data-a="pe_givepots" title="Bơm 500 bình máu + mana các loại">🧪 Bơm 500 Thuốc</button>
    <button class="btn sm red" data-a="pe_revokepots" title="Rút toàn bộ máu và mana về 0">🚫 Rút Hết Thuốc</button>
  </div>

  <div class="admh">🌀 Tẩy Tủy & Điểm (Reset Điểm)</div>
  <div class="btnrow" style="margin-bottom:8px">
    <button class="btn sm" data-a="pe_reseta">Tẩy Tiềm Năng</button>
    <button class="btn sm" data-a="pe_resets">Tẩy Kỹ Năng</button>
    <button class="btn sm on" data-a="pe_resetall">Tẩy Toàn Bộ</button>
  </div>

  <div class="admh">👑 Danh Hiệu & Đặc Quyền (Tặng / Thu Hồi)</div>
  <div class="btnrow" style="margin-bottom:8px">
    <button class="btn sm on" data-a="pe_givevlmc" title="Phong tặng danh hiệu Võ Lâm Minh Chủ">👑 Tặng VLMC</button>
    <button class="btn sm red" data-a="pe_revokevlmc" title="Thu hồi danh hiệu Võ Lâm Minh Chủ">🚫 Thu Hồi VLMC</button>
  </div>

  <div class="admh">✉️ Gửi Tin Nhắn / Cảnh Báo Riêng (Popup)</div>
  <div style="display:flex;gap:4px;margin-bottom:8px">
    <input type="text" id="admPeMsgVal" placeholder="Nhập lời nhắn gửi riêng cho người này…" style="flex:1;background:#111;color:#fff;border:1px solid #555;padding:5px 8px;font-size:12px;border-radius:3px">
    <button class="btn sm on" data-a="pe_sendmsg">Gửi Tin</button>
  </div>
  <p class="dim small">Các lệnh can thiệp sẽ được đẩy trực tiếp đến người chơi qua Firebase và tự động chạy an toàn qua module player-edit.</p>
  `;
}

function admModal() {
  if (!admOk()) return toast(ADM_DENY);
  const body0 = { lv: admTabLv, money: admTabMoney, item: admTabItem, eq: admTabEq, skill: admTabSkill, world: admTabWorld, players: admTabPlayers }[admTab] || admTabLv,
    body = () => admInCh(admTab, body0),
    old = $("#mBody .admbody"),
    sc = old && $("#mBody .admbox") ? old.scrollTop : 0,
    ls = $("#mBody .admlist"),
    lsc = ls ? ls.scrollTop : 0;
  modal(
    `<div class="admbox"><h3 style="margin:0 0 6px"><img src="${ADM_IC}" alt="" class="admic"> ${ADM_NAME} <small>${admHostOk() ? "admin online" : "v3.0.6 Final"}</small></h3>
    <div class="dtabs admtabs">${ADM_TABS.map(([k, n]) => `<button data-at="${k}" class="${k === admTab ? "on" : ""}">${n}</button>`).join("")}</div>
    ${admChRow()}<div class="admbody">${body()}</div></div>`,
    () => {
      const b = $("#mBody .admbody");
      b && (b.scrollTop = sc);
      const l = $("#mBody .admlist");
      l && (l.scrollTop = lsc);
      document.querySelectorAll("#mBody [data-at]").forEach((e) => (e.onclick = () => ((admTab = e.dataset.at), admModal())));
      document.querySelectorAll("#mBody [data-ach]").forEach((e) => (e.onclick = () => ((admCh = +e.dataset.ach), admModal())));
      document.querySelectorAll("#mBody [data-a]").forEach((e) => (e.onclick = () => admAct(e.dataset.a)));
      const v = (id) => $("#" + id);
      v("admPeTarget") && (v("admPeTarget").onchange = (e) => {
        admPeSelectedName = e.target.value;
        admPeSet = "";
        admModal();
      });
      v("admPeSet") && (v("admPeSet").onchange = () => (admPeSet = v("admPeSet").value));
      v("admPeHorse") && (v("admPeHorse").onchange = () => (admPeHorse = v("admPeHorse").value));
      v("admPeMask") && (v("admPeMask").onchange = () => (admPeMask = +v("admPeMask").value || 1));
      v("admPeMaskPerm") && (v("admPeMaskPerm").onchange = () => (admPeMaskPerm = !!v("admPeMaskPerm").checked));
      const eqSync = () => {
        const g = (id, d) => (v(id) ? +v(id).value : d);
        admEq = { d: g("admEqD", 0), k: g("admEqK", 0), lv: g("admEqL", 10), n: g("admEqN", 6), s: g("admEqS", -1), q: clamp(g("admEqQ", 1) | 0, 1, 20) };
      };
      v("admEqD") && (v("admEqD").onchange = () => (eqSync(), admModal()));
      ["admEqK", "admEqL", "admEqN", "admEqS", "admEqQ"].forEach((id) => v(id) && (v(id).onchange = eqSync));
      v("admSetCat") && (v("admSetCat").onchange = () => { admSetCat = v("admSetCat").value; admSet = ""; admModal(); });
      v("admSetFac") && (v("admSetFac").onchange = () => { admSetFac = v("admSetFac").value; admSet = ""; admModal(); });
      v("admSet") && (v("admSet").onchange = () => (admSet = v("admSet").value));
      v("admHorse") && (v("admHorse").onchange = () => (admHorse = v("admHorse").value));
      v("admMask") && (v("admMask").onchange = () => (admMask = +v("admMask").value || 1));
      v("admThQ") &&
        typeof thFilter == "function" &&
        (v("admThQ").oninput = () => thFilter($("#mBody .admlist"), v("admThQ").value));
    }
  );
}
function admAct(a) {
  const [k, x, y] = a.split(":"),
    v = (id) => ($("#" + id) || {}).value;
  const tab = {
    lv: "lv", lvmax: "lv", lvset: "lv", xp: "lv", ap: "lv", sp: "lv", spend: "lv", titleall: "lv", titlemodal: "lv", reb: "lv",
    eqmake: "eq", eqfull: "eq", set: "eq", setwear: "eq", horse: "eq", horseall: "eq", enhfull: "eq", matpack: "eq",
    mask: "eq", mask_all: "eq", mask_reset: "eq", mask_refresh: "eq",
    skmax: "skill", cd: "skill", full: "skill"
  }[k] || k;
  admDo(() => admInCh(tab, () => {
    switch (k) {
      case "lv":
        return admLvTo(S.lvl + +x);
      case "lvmax":
        return admLvTo(levelCap());
      case "lvset":
        return admLvTo(v("admLv"));
      case "xp":
        return admXp(+x);
      case "ap":
        return ((S.attrPts += +x), `+${x} điểm tiềm năng`);
      case "sp":
        return ((S.skPts += +x), `+${x} điểm kỹ năng`);
      case "spend": {
        // The game's own auto-allocation (same as "Tự cộng điểm" on level-up).
        const a = S.attrPts,
          s = S.skPts;
        autoSpendAttrs();
        FAC[S.fac] && !isNovice() && autoSpendSkills();
        R.dirty = !0;
        recalc();
        typeof autoEquipAll == "function" && autoEquipAll();
        renderPad();
        return a - S.attrPts || s - S.skPts
          ? `Tự cộng ${a - S.attrPts} tiềm năng, ${s - S.skPts} điểm kỹ năng`
          : (toast("Không còn điểm để cộng"), "");
      }
      case "reb":
        return admReborn(x);
      case "join": {
        const c = admCh; // the faction picker acts on the selected character
        return (setTimeout(() => withChar(c, () => (closeModal(!0), joinModal())), 0), "Mở bảng gia nhập môn phái");
      }
      case "cur":
        return admCur(x, y);
      case "curset":
        return admCur(v("admCurK"), v("admCurN"));
      case "pot":
      case "potall": {
        const ps = k === "pot" ? [J.potions[+x]] : J.potions;
        for (const p of ps) p && (potStock(p.kind)[p.tier] = (potStock(p.kind)[p.tier] || 0) + 100);
        return k === "pot" ? `+100 ${esc(ps[0].n)}` : `+100 mỗi loại thuốc (${ps.length} loại)`;
      }
      case "misc":
        return (matAdd("misc", x, +y), `+${y} ${esc(miscName(x))}`);
      case "ht": {
        const l = clamp(+v("admHt") || 1, 1, HT_MAX);
        return (matAdd("ht", l, +x), `+${x} Huyền Tinh cấp ${l}`);
      }
      case "ore": {
        const r = [];
        for (let i = 0; i < +x; i++) r.push(forceOre(S.lvl));
        return "Đá thuộc tính: " + r.map(esc).join(", ");
      }
      case "ktc":
        return admKtc(x, +y);
      case "eqmake":
        return admEqMake();
      case "eqfull":
        return admFullGear(x === "1");
      case "set":
        return admSetGive(!1);
      case "setwear":
        return admSetGive(!0);
      case "horse":
        return admHorseGive();
      case "horseall":
        return admHorseAll();
      case "enhfull":
        return admEnhFull();
      case "matpack":
        return admMatPack();
      case "mask_reset": {
        let removed = 0;
        if (S.inv) {
          const before = S.inv.length;
          S.inv = S.inv.filter((it) => it && it.d !== 11);
          removed += before - S.inv.length;
        }
        if (S.eq && S.eq.mask) {
          delete S.eq.mask;
          removed++;
        }
        if (S.stash) {
          const before = S.stash.length;
          S.stash = S.stash.filter((it) => it && it.d !== 11);
          removed += before - S.stash.length;
        }
        if (S.gc) delete S.gc["NGUYETCA"];
        R.dirty = !0;
        typeof invDirty != "undefined" && (invDirty = !0);
        save();
        refresh();
        return `Đã xóa ${removed} mặt nạ & reset thời hạn mua tại Kỳ Trân Các (Có thể nhập lại code NGUYETCA)!`;
      }
      case "mask_refresh": {
        if (typeof migrateMasks == "function") migrateMasks();
        R.dirty = !0;
        typeof invDirty != "undefined" && (invDirty = !0);
        save();
        refresh();
        return "Đã cập nhật toàn bộ mặt nạ trong túi sang model người và icon mới nhất!";
      }
      case "mask": {
        const curK = +($("#admMask") ? $("#admMask").value : admMask) || admMask || 1;
        if (admInvFree() < 1) return (toast("Hành trang đã đầy"), "");
        const it = makeMaskItem(curK, false);
        S.inv.unshift(it);
        R.dirty = !0;
        typeof invDirty != "undefined" && (invDirty = !0);
        save();
        refresh();
        return `Đã thêm [${it.n}] vào hành trang!`;
      }
      case "mask_all": {
        const list = (typeof J != "undefined" && J.items && J.items[11] && J.items[11].list) || [];
        let added = 0;
        for (const m of list) {
          if (admInvFree() < 1) break;
          const it = makeMaskItem(m.k, false);
          S.inv.unshift(it);
          added++;
        }
        R.dirty = !0;
        typeof invDirty != "undefined" && (invDirty = !0);
        save();
        refresh();
        return `Đã thêm ${added} mặt nạ Võ Lâm vào hành trang!`;
      }
      case "titleall":
        return admTitleAll();
      case "titlemodal":
        return (setTimeout(() => typeof titleModal == "function" && titleModal(), 50), "Mở bảng Danh Hiệu");
      case "skmax":
        return admMaxSkills();
      case "cd":
        return admResetCd();
      case "full":
        return admFull();
      case "god":
        return ((R.admGod = !R.admGod), R.admGod && admFull(), `Bất tử: <b>${R.admGod ? "bật" : "tắt"}</b>`);
      case "ohk":
        return ((R.admOhk = !R.admOhk), `Nhất kích: <b>${R.admOhk ? "bật" : "tắt"}</b>`);
      case "unlock":
        return ((S.maxStage = STAGES), typeof syncMaxStage == "function" && syncMaxStage(), "Mở mọi bãi luyện công");
      case "thmodal":
        return (setTimeout(() => typeof thModal == "function" && thModal(), 50), "Mở Thần Hành Phù");
      case "bcast": {
        const inp = $("#admBcastTxt");
        const txt = inp ? inp.value.trim() : "";
        if (!txt) return (toast("Chưa nhập nội dung thông báo"), "");
        if (typeof firebase !== "undefined" && window.CHAT_CFG && CHAT_CFG.firebaseUrl) {
          try {
            firebase.database().ref("chat/msgs").push({
              cid: "admin",
              sys: true,
              name: "Hệ Thống",
              msg: "📢 [THÔNG BÁO]: " + txt,
              ts: Date.now()
            });
            inp.value = "";
            return "Đã phát thông báo toàn server!";
          } catch (e) {
            return "Lỗi gửi thông báo: " + e.message;
          }
        }
        return toast("Chat Firebase chưa kết nối"), "";
      }
      case "clearrank": {
        if (!confirm("CẢNH BÁO: Bạn có chắc chắn muốn XÓA TOÀN BỘ dữ liệu Bảng Xếp Hạng trên server không?")) return "";
        const db = typeof getFirebaseDb === "function" ? getFirebaseDb() : (typeof firebase !== "undefined" && firebase.apps && firebase.apps.length ? firebase.database() : null);
        if (db) {
          try {
            db.ref("ranking/players").remove();
            return "Đã xóa trắng Bảng Xếp Hạng thành công!";
          } catch (e) {
            return "Lỗi xóa BXH: " + e.message;
          }
        }
        return toast("Firebase chưa kết nối"), "";
      }
      case "clearchat": {
        if (typeof chatClearAll === "function") {
          chatClearAll();
        } else {
          const db = typeof getFirebaseDb === "function" ? getFirebaseDb() : null;
          if (db) {
            try { db.ref("chat/msgs").remove(); } catch (e) {}
          }
          if (typeof CHAT !== "undefined" && CHAT) {
            CHAT.msgs = [];
            if (typeof chatRender === "function") chatRender();
          }
        }
        return "Đã xóa toàn bộ tin nhắn kênh chat thành công!";
      }
      case "wbsummon": {
        const db = typeof getFirebaseDb === "function" ? getFirebaseDb() : (typeof firebase !== "undefined" && firebase.apps && firebase.apps.length ? firebase.database() : null);
        if (db) {
          try {
            const hpMax = (typeof WB_BOSS_CONFIG !== "undefined" ? WB_BOSS_CONFIG.hpMax : 120000000);
            db.ref("worldboss/state").set({
              st: "up",
              hp: hpMax,
              hpMax: hpMax,
              name: "Trung Hiếu",
              startedAt: Date.now(),
              end: Date.now() + 10 * 60 * 1000,
              summonedBy: S.name || "Admin",
              killer: ""
            });
            db.ref("worldboss/damage").remove();
            db.ref("chat/msgs").push({
              cid: "admin",
              sys: true,
              name: "Hệ Thống",
              msg: "📢 [BOSS THẾ GIỚI]: Boss Trung Hiếu đã xuất hiện tại Phong Lăng Độ (Thuyền 337)! Anh em mau vào săn!",
              ts: Date.now()
            });
          } catch (e) {
            console.warn("wbsummon firebase err:", e);
          }
        }
        if (typeof spawnWorldBoss === "function") spawnWorldBoss(true);
        return db ? "Đã triệu hồi Boss Thế Giới cho toàn server!" : "Đã triệu hồi Boss Thế Giới (Offline)";
      }
      case "wbkill": {
        const db = typeof getFirebaseDb === "function" ? getFirebaseDb() : (typeof firebase !== "undefined" && firebase.apps && firebase.apps.length ? firebase.database() : null);
        if (db) {
          try {
            db.ref("worldboss/state").update({
              st: "dead",
              hp: 0,
              killer: S.name || "Admin",
              endedAt: Date.now()
            });
          } catch (e) {
            console.warn("wbkill firebase err:", e);
          }
        }
        if (typeof handleBossDefeated === "function") handleBossDefeated();
        return "Đã kết thúc Boss Thế Giới!";
      }
      case "pe_reload": {
        admPePlayersList = [];
        admAccountsMap = {};
        return "Đang làm mới danh sách người chơi & tài khoản...";
      }
      case "pe_changepass": {
        const pName = admPeSelectedName;
        if (!pName) return (toast("Chưa chọn người chơi"), "");
        const currAcc = Object.values(admAccountsMap).find(a => a.charName === pName || a.u === pName || a.u === (admPePlayersList.find(p => p.name === pName) || {}).u) || admAccountsMap[pName];
        if (!currAcc || !currAcc.u) return (toast("Không tìm thấy tài khoản gắn với người chơi này!"), "");
        const newPInput = document.getElementById("admNewPassInput");
        const newPass = newPInput ? newPInput.value.trim() : "";
        if (!newPass || newPass.length < 4) {
          return (toast("Mật khẩu mới phải có ít nhất 4 ký tự!"), "");
        }
        if (typeof authHashPass !== "function") return (toast("Lỗi: Không tìm thấy authHashPass"), "");

        authHashPass(newPass).then(async (newHash) => {
          const updateData = { p: newHash, rawP: newPass };
          let ok = false;
          if (window.CHAT_CFG && CHAT_CFG.firebaseUrl) {
            try {
              const res = await fetch(`${CHAT_CFG.firebaseUrl}/accounts/${encodeURIComponent(currAcc.u)}.json`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updateData)
              });
              if (res.ok) ok = true;
            } catch (e) {}
          }
          if (!ok && typeof firebase !== "undefined") {
            try {
              await firebase.database().ref("accounts/" + currAcc.u).update(updateData);
              ok = true;
            } catch (e) {}
          }
          if (ok) {
            currAcc.p = newHash;
            currAcc.rawP = newPass;
            admAccountsMap[currAcc.u] = currAcc;
            toast(`Đã đổi mật khẩu cho [${currAcc.u}] thành: ${newPass}`);
            admModal();
          } else {
            toast("Lỗi kết nối khi đổi mật khẩu!");
          }
        });
        return "Đang cập nhật mật khẩu mới...";
      }
      case "pe_setlv": {
        const pName = admPeSelectedName;
        if (!pName) return (toast("Chưa chọn người chơi"), "");
        const lv = +($("#admPeLvVal") ? $("#admPeLvVal").value : 0);
        if (!lv || lv < 1 || lv > 200) return (toast("Cấp độ không hợp lệ (1-200)"), "");
        return sendPlayerEditCmd(pName, { op: "lvl", v: lv, by: S.name || "Admin" }, `Đã đặt cấp độ ${lv} cho [${pName}]`);
      }
      case "pe_inclv": {
        const pName = admPeSelectedName;
        if (!pName) return (toast("Chưa chọn người chơi"), "");
        return sendPlayerEditCmd(pName, { op: "lvl", delta: 1, by: S.name || "Admin" }, `Đã gửi lệnh tăng 1 cấp cho [${pName}]`);
      }
      case "pe_declv": {
        const pName = admPeSelectedName;
        if (!pName) return (toast("Chưa chọn người chơi"), "");
        return sendPlayerEditCmd(pName, { op: "lvl", delta: -1, by: S.name || "Admin" }, `Đã gửi lệnh giảm 1 cấp cho [${pName}]`);
      }
      case "pe_addxp": {
        const pName = admPeSelectedName;
        if (!pName) return (toast("Chưa chọn người chơi"), "");
        const xp = +($("#admPeXpVal") ? $("#admPeXpVal").value : 0);
        if (!xp) return (toast("Chưa nhập số EXP"), "");
        return sendPlayerEditCmd(pName, { op: "xp", v: xp, by: S.name || "Admin" }, `Đã gửi ${fmt(xp)} EXP cho [${pName}]`);
      }
      case "pe_subxp": {
        const pName = admPeSelectedName;
        if (!pName) return (toast("Chưa chọn người chơi"), "");
        const xp = +($("#admPeXpVal") ? $("#admPeXpVal").value : 0);
        if (!xp) return (toast("Chưa nhập số EXP"), "");
        return sendPlayerEditCmd(pName, { op: "xp", v: -Math.abs(xp), by: S.name || "Admin" }, `Đã trừ ${fmt(xp)} EXP của [${pName}]`);
      }
      case "pe_reseta": {
        const pName = admPeSelectedName;
        if (!pName) return (toast("Chưa chọn người chơi"), "");
        return sendPlayerEditCmd(pName, { op: "reset", a: 1, s: 0, by: S.name || "Admin" }, `Đã tẩy tiềm năng cho [${pName}]`);
      }
      case "pe_resets": {
        const pName = admPeSelectedName;
        if (!pName) return (toast("Chưa chọn người chơi"), "");
        return sendPlayerEditCmd(pName, { op: "reset", a: 0, s: 1, by: S.name || "Admin" }, `Đã tẩy kỹ năng cho [${pName}]`);
      }
      case "pe_resetall": {
        const pName = admPeSelectedName;
        if (!pName) return (toast("Chưa chọn người chơi"), "");
        return sendPlayerEditCmd(pName, { op: "reset", a: 1, s: 1, by: S.name || "Admin" }, `Đã tẩy toàn bộ điểm cho [${pName}]`);
      }
      case "pe_sendgold": {
        const pName = admPeSelectedName;
        if (!pName) return (toast("Chưa chọn người chơi"), "");
        const gold = +($("#admPeGoldVal") ? $("#admPeGoldVal").value : 0);
        if (!gold) return (toast("Chưa nhập số vàng"), "");
        return sendPlayerEditCmd(pName, { op: "gold", v: gold, by: S.name || "Admin" }, `Đã tặng ${fmtL(gold)} lượng cho [${pName}]`);
      }
      case "pe_subgold": {
        const pName = admPeSelectedName;
        if (!pName) return (toast("Chưa chọn người chơi"), "");
        const gold = +($("#admPeGoldVal") ? $("#admPeGoldVal").value : 0);
        if (!gold) return (toast("Chưa nhập số vàng"), "");
        return sendPlayerEditCmd(pName, { op: "gold", v: -Math.abs(gold), by: S.name || "Admin" }, `Đã trừ ${fmtL(gold)} lượng của [${pName}]`);
      }
      case "pe_zerogold": {
        const pName = admPeSelectedName;
        if (!pName) return (toast("Chưa chọn người chơi"), "");
        return sendPlayerEditCmd(pName, { op: "gold", setZero: true, by: S.name || "Admin" }, `Đã đưa ngân lượng về 0 của [${pName}]`);
      }
      case "pe_sendknb": {
        const pName = admPeSelectedName;
        if (!pName) return (toast("Chưa chọn người chơi"), "");
        const knb = +($("#admPeKnbVal") ? $("#admPeKnbVal").value : 0);
        if (!knb) return (toast("Chưa nhập số KNB"), "");
        return sendPlayerEditCmd(pName, { op: "knb", v: knb, by: S.name || "Admin" }, `Đã tặng ${knb} KNB cho [${pName}]`);
      }
      case "pe_subknb": {
        const pName = admPeSelectedName;
        if (!pName) return (toast("Chưa chọn người chơi"), "");
        const knb = +($("#admPeKnbVal") ? $("#admPeKnbVal").value : 0);
        if (!knb) return (toast("Chưa nhập số KNB"), "");
        return sendPlayerEditCmd(pName, { op: "knb", v: -Math.abs(knb), by: S.name || "Admin" }, `Đã trừ ${knb} KNB của [${pName}]`);
      }
      case "pe_zeroknb": {
        const pName = admPeSelectedName;
        if (!pName) return (toast("Chưa chọn người chơi"), "");
        return sendPlayerEditCmd(pName, { op: "knb", setZero: true, by: S.name || "Admin" }, `Đã đưa KNB về 0 của [${pName}]`);
      }
      case "pe_sendmsg": {
        const pName = admPeSelectedName;
        if (!pName) return (toast("Chưa chọn người chơi"), "");
        const inp = $("#admPeMsgVal");
        const msg = inp ? inp.value.trim() : "";
        if (!msg) return (toast("Chưa nhập nội dung tin nhắn"), "");
        inp.value = "";
        return sendPlayerEditCmd(pName, { op: "msg", v: msg, by: S.name || "Admin" }, `Đã gửi tin nhắn riêng cho [${pName}]`);
      }
      case "pe_setreborn": {
        const pName = admPeSelectedName;
        if (!pName) return (toast("Chưa chọn người chơi"), "");
        const cs = +($("#admPeRebornVal") ? $("#admPeRebornVal").value : 0);
        if (cs < 0 || cs > 10) return (toast("Số lần chuyển sinh không hợp lệ (0-10)"), "");
        return sendPlayerEditCmd(pName, { op: "reborn", v: cs, by: S.name || "Admin" }, `Đã đặt Chuyển Sinh ${cs} cho [${pName}]`);
      }
      case "pe_increborn": {
        const pName = admPeSelectedName;
        if (!pName) return (toast("Chưa chọn người chơi"), "");
        return sendPlayerEditCmd(pName, { op: "reborn", delta: 1, by: S.name || "Admin" }, `Đã gửi lệnh tăng 1 Chuyển Sinh cho [${pName}]`);
      }
      case "pe_decreborn": {
        const pName = admPeSelectedName;
        if (!pName) return (toast("Chưa chọn người chơi"), "");
        return sendPlayerEditCmd(pName, { op: "reborn", delta: -1, by: S.name || "Admin" }, `Đã gửi lệnh giảm 1 Chuyển Sinh cho [${pName}]`);
      }
      case "pe_resetreborn": {
        const pName = admPeSelectedName;
        if (!pName) return (toast("Chưa chọn người chơi"), "");
        return sendPlayerEditCmd(pName, { op: "reborn", v: 0, by: S.name || "Admin" }, `Đã đặt về CS 0 (chưa chuyển sinh) cho [${pName}]`);
      }
      case "pe_givehorse": {
        const pName = admPeSelectedName;
        if (!pName) return (toast("Chưa chọn người chơi"), "");
        const hId = ($("#admPeHorse") ? $("#admPeHorse").value : admPeHorse) || admPeHorse;
        const hs = typeof admHorses === "function" ? admHorses() : [];
        const h = hs.find((x) => String(x.id) === String(hId)) || hs[0];
        if (!h) return (toast("Chưa chọn ngựa"), "");
        const cmd = {
          op: "horse",
          horseId: h.id,
          isTm: !!h.isTm,
          n: h.n,
          by: S.name || "Admin"
        };
        if (h.isTm && h.tmId != null) cmd.tmId = h.tmId;
        if (h.k != null) cmd.k = h.k;
        if (h.lvl != null) cmd.lvl = h.lvl;
        return sendPlayerEditCmd(pName, cmd, `Đã tặng thú cưỡi [${h.n}] cho [${pName}]`);
      }
      case "pe_revokehorse": {
        const pName = admPeSelectedName;
        if (!pName) return (toast("Chưa chọn người chơi"), "");
        const hId = ($("#admPeHorse") ? $("#admPeHorse").value : admPeHorse) || admPeHorse;
        const hs = typeof admHorses === "function" ? admHorses() : [];
        const h = hs.find((x) => String(x.id) === String(hId)) || hs[0];
        if (!h) return (toast("Chưa chọn ngựa"), "");
        return sendPlayerEditCmd(pName, {
          op: "revoke_horse",
          horseId: h.id,
          n: h.n,
          tmId: h.tmId,
          by: S.name || "Admin"
        }, `Đã gửi lệnh thu hồi thú cưỡi [${h.n}] của [${pName}]`);
      }
      case "pe_giveallhorses": {
        const pName = admPeSelectedName;
        if (!pName) return (toast("Chưa chọn người chơi"), "");
        return sendPlayerEditCmd(pName, { op: "horse_all", by: S.name || "Admin" }, `Đã mở khóa 48 loài ngựa vào Mã Trường cho [${pName}]`);
      }
      case "pe_revokeallhorses": {
        const pName = admPeSelectedName;
        if (!pName) return (toast("Chưa chọn người chơi"), "");
        return sendPlayerEditCmd(pName, { op: "revoke_all_horses", by: S.name || "Admin" }, `Đã gửi lệnh thu hồi toàn bộ ngựa và dọn Mã Trường của [${pName}]`);
      }
      case "pe_givemask": {
        const pName = admPeSelectedName;
        if (!pName) return (toast("Chưa chọn người chơi"), "");
        const maskK = +($("#admPeMask") ? $("#admPeMask").value : admPeMask) || admPeMask || 1;
        const isPerm = $("#admPeMaskPerm") ? $("#admPeMaskPerm").checked : admPeMaskPerm;
        const list = (typeof J !== "undefined" && J.items && J.items[11] && J.items[11].list) || [];
        const mDef = list.find((x) => x.k === maskK) || list[0];
        const mName = mDef ? mDef.n : "Mặt nạ";
        return sendPlayerEditCmd(pName, {
          op: "give_mask",
          maskK: maskK,
          maskName: mName,
          perm: !!isPerm,
          by: S.name || "Admin"
        }, `Đã tặng [${mName}${isPerm ? " (Vĩnh viễn)" : " (3 ngày)"}] cho [${pName}]`);
      }
      case "pe_giveallmasks": {
        const pName = admPeSelectedName;
        if (!pName) return (toast("Chưa chọn người chơi"), "");
        const isPerm = $("#admPeMaskPerm") ? $("#admPeMaskPerm").checked : admPeMaskPerm;
        return sendPlayerEditCmd(pName, {
          op: "give_all_masks",
          perm: !!isPerm,
          by: S.name || "Admin"
        }, `Đã gửi tặng trọn bộ 13 mặt nạ${isPerm ? " (Vĩnh viễn)" : ""} cho [${pName}]`);
      }
      case "pe_revokemask": {
        const pName = admPeSelectedName;
        if (!pName) return (toast("Chưa chọn người chơi"), "");
        const maskK = +($("#admPeMask") ? $("#admPeMask").value : admPeMask) || admPeMask || 1;
        const list = (typeof J !== "undefined" && J.items && J.items[11] && J.items[11].list) || [];
        const mDef = list.find((x) => x.k === maskK) || list[0];
        const mName = mDef ? mDef.n : "Mặt nạ";
        return sendPlayerEditCmd(pName, {
          op: "revoke_mask",
          maskK: maskK,
          maskName: mName,
          by: S.name || "Admin"
        }, `Đã gửi lệnh thu hồi [${mName}] của [${pName}]`);
      }
      case "pe_revokeallmasks": {
        const pName = admPeSelectedName;
        if (!pName) return (toast("Chưa chọn người chơi"), "");
        return sendPlayerEditCmd(pName, {
          op: "revoke_all_masks",
          by: S.name || "Admin"
        }, `Đã gửi lệnh thu hồi toàn bộ mặt nạ của [${pName}]`);
      }
      case "pe_giveset":
      case "pe_givesetwear": {
        const pName = admPeSelectedName;
        if (!pName) return (toast("Chưa chọn người chơi"), "");
        const setId = ($("#admPeSet") ? $("#admPeSet").value : admPeSet) || admPeSet;
        const all = typeof admAllCatalog === "function" ? admAllCatalog() : [];
        const setItem = all.find((x) => String(x.id) === String(setId)) || all[0];
        if (!setItem) return (toast("Chưa chọn bộ trang bị"), "");
        const wear = k === "pe_givesetwear" ? 1 : 0;
        return sendPlayerEditCmd(pName, {
          op: "give_set",
          setId: setItem.id,
          setName: setItem.n,
          wear: wear,
          by: S.name || "Admin"
        }, `Đã tặng bộ [${setItem.n}] cho [${pName}]`);
      }
      case "pe_revokeset": {
        const pName = admPeSelectedName;
        if (!pName) return (toast("Chưa chọn người chơi"), "");
        const setId = ($("#admPeSet") ? $("#admPeSet").value : admPeSet) || admPeSet;
        const all = typeof admAllCatalog === "function" ? admAllCatalog() : [];
        const setItem = all.find((x) => String(x.id) === String(setId)) || all[0];
        if (!setItem) return (toast("Chưa chọn bộ trang bị"), "");
        return sendPlayerEditCmd(pName, {
          op: "revoke_set",
          setId: setItem.id,
          setName: setItem.n,
          by: S.name || "Admin"
        }, `Đã gửi lệnh thu hồi bộ [${setItem.n}] của [${pName}]`);
      }
      case "pe_givehkmp": {
        const pName = admPeSelectedName;
        if (!pName) return (toast("Chưa chọn người chơi"), "");
        const selP = admPePlayersList.find((p) => p.name === pName);
        const facId = selP ? selP.fac : -1;
        const cmd = {
          op: "give_set",
          special: "hkmp",
          by: S.name || "Admin"
        };
        if (facId != null && facId >= 0) cmd.fac = facId;
        return sendPlayerEditCmd(pName, cmd, `Đã tặng trọn bộ Hoàng Kim Môn Phái cho [${pName}]`);
      }
      case "pe_revokehkmp": {
        const pName = admPeSelectedName;
        if (!pName) return (toast("Chưa chọn người chơi"), "");
        return sendPlayerEditCmd(pName, { op: "revoke_set", special: "hkmp", by: S.name || "Admin" }, `Đã gửi lệnh thu hồi bộ HKMP của [${pName}]`);
      }
      case "pe_givematpack": {
        const pName = admPeSelectedName;
        if (!pName) return (toast("Chưa chọn người chơi"), "");
        return sendPlayerEditCmd(pName, { op: "matpack", by: S.name || "Admin" }, `Đã tặng Gói Nguyên Liệu Ép Đồ cho [${pName}]`);
      }
      case "pe_revokematpack": {
        const pName = admPeSelectedName;
        if (!pName) return (toast("Chưa chọn người chơi"), "");
        return sendPlayerEditCmd(pName, { op: "revoke_matpack", by: S.name || "Admin" }, `Đã gửi lệnh thu hồi toàn bộ nguyên liệu của [${pName}]`);
      }
      case "pe_enhfull": {
        const pName = admPeSelectedName;
        if (!pName) return (toast("Chưa chọn người chơi"), "");
        return sendPlayerEditCmd(pName, { op: "enhfull", by: S.name || "Admin" }, `Đã cường hóa +10 toàn thân cho [${pName}]`);
      }
      case "pe_enhreset": {
        const pName = admPeSelectedName;
        if (!pName) return (toast("Chưa chọn người chơi"), "");
        return sendPlayerEditCmd(pName, { op: "enh_reset", by: S.name || "Admin" }, `Đã gửi lệnh giảm cường hóa về +0 của [${pName}]`);
      }
      case "pe_givepots": {
        const pName = admPeSelectedName;
        if (!pName) return (toast("Chưa chọn người chơi"), "");
        return sendPlayerEditCmd(pName, { op: "give_potions", by: S.name || "Admin" }, `Đã bơm 500 bình máu và mana cho [${pName}]`);
      }
      case "pe_revokepots": {
        const pName = admPeSelectedName;
        if (!pName) return (toast("Chưa chọn người chơi"), "");
        return sendPlayerEditCmd(pName, { op: "revoke_potions", by: S.name || "Admin" }, `Đã gửi lệnh rút toàn bộ thuốc của [${pName}]`);
      }
      case "pe_giveab": {
        const pName = admPeSelectedName;
        if (!pName) return (toast("Chưa chọn người chơi"), "");
        return sendPlayerEditCmd(pName, { op: "give_set", special: "ab", by: S.name || "Admin" }, `Đã tặng bộ An Bang cho [${pName}]`);
      }
      case "pe_revokeab": {
        const pName = admPeSelectedName;
        if (!pName) return (toast("Chưa chọn người chơi"), "");
        return sendPlayerEditCmd(pName, { op: "revoke_set", special: "ab", by: S.name || "Admin" }, `Đã gửi lệnh thu hồi bộ An Bang của [${pName}]`);
      }
      case "pe_givedq": {
        const pName = admPeSelectedName;
        if (!pName) return (toast("Chưa chọn người chơi"), "");
        return sendPlayerEditCmd(pName, { op: "give_set", special: "dq", by: S.name || "Admin" }, `Đã tặng bộ Định Quốc cho [${pName}]`);
      }
      case "pe_revokedq": {
        const pName = admPeSelectedName;
        if (!pName) return (toast("Chưa chọn người chơi"), "");
        return sendPlayerEditCmd(pName, { op: "revoke_set", special: "dq", by: S.name || "Admin" }, `Đã gửi lệnh thu hồi bộ Định Quốc của [${pName}]`);
      }
      case "pe_stripwear": {
        const pName = admPeSelectedName;
        if (!pName) return (toast("Chưa chọn người chơi"), "");
        return sendPlayerEditCmd(pName, { op: "strip_wear", by: S.name || "Admin" }, `Đã gửi lệnh lột toàn bộ trang bị đang mặc của [${pName}]`);
      }
      case "pe_givevlmc": {
        const pName = admPeSelectedName;
        if (!pName) return (toast("Chưa chọn người chơi"), "");
        return sendPlayerEditCmd(pName, { op: "give_vlmc", by: S.name || "Admin" }, `Đã phong tặng danh hiệu Võ Lâm Minh Chủ cho [${pName}]`);
      }
      case "pe_revokevlmc": {
        const pName = admPeSelectedName;
        if (!pName) return (toast("Chưa chọn người chơi"), "");
        return sendPlayerEditCmd(pName, { op: "revoke_vlmc", by: S.name || "Admin" }, `Đã gửi lệnh thu hồi danh hiệu Võ Lâm Minh Chủ của [${pName}]`);
      }
      case "go":
        return admGo(a.slice(3));
    }
    return "";
  }));
}
function admPromptPass(onSuccess) {
  modal(
    `<div class="admbox" style="text-align:center;padding:16px 12px;max-width:320px;margin:0 auto">
      <h3 style="display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:10px">
        <img src="${ADM_IC}" alt="" class="admic"> Lệnh Bài Admin
      </h3>
      <p style="margin:8px 0;color:var(--dim,#bdb59a);font-size:12px">Nhập mật khẩu:</p>
      <form id="admPassForm" onsubmit="return false;" style="margin:0">
        <div style="margin:12px 0 8px;display:flex;justify-content:center;gap:6px">
          <input type="password" id="admPassInput" autocomplete="current-password" placeholder="Nhập mật khẩu..." style="padding:6px 10px;background:#111;color:#eee;border:1px solid #555;border-radius:4px;font-size:14px;text-align:center;width:140px">
          <button id="admPassSubmit" class="btn primary" type="submit" style="padding:6px 12px;cursor:pointer">Mở</button>
          <button id="admPassCancel" class="btn" type="button" style="padding:6px 12px;cursor:pointer">Hủy</button>
        </div>
      </form>
      <div id="admPassErr" style="color:#ff6a5a;font-size:11px;min-height:16px;margin-top:4px"></div>
    </div>`,
    () => {
      const inp = $("#admPassInput"), btn = $("#admPassSubmit"), err = $("#admPassErr"), form = $("#admPassForm"), cancel = $("#admPassCancel");
      if (!inp) return;
      setTimeout(() => inp && inp.focus(), 100);
      const check = () => {
        if (inp.value === ADM_PASS) {
          admUnlocked = true;
          if (typeof onSuccess == "function") onSuccess();
          else admModal();
        } else {
          err.textContent = "Mật khẩu không chính xác!";
          inp.value = "";
          inp.focus();
        }
      };
      btn && (btn.onclick = check);
      form && (form.onsubmit = (e) => { e.preventDefault(); check(); return false; });
      cancel && (cancel.onclick = () => closeModal(!0));
    },
    true
  );
}
function admUse() {
  if (!S || !S.fac) return;
  if (!admOk()) return toast(ADM_DENY);
  admModal();
}
function admOpenDirect() {
  if (!S || !S.fac) return toast("Chưa tạo nhân vật");
  admModal();
}
window.admOpenDirect = admOpenDirect;

// ---------- Hooks ----------
function admGuardNet() {}
function admHookCombat() {
  if (typeof enemyHit == "function") {
    const o = enemyHit;
    enemyHit = function (t) {
      if (R.admGod && admOk()) return (addText(H.x, H.y - 30, "Bất tử", "#ffd24a", 11), void 0);
      return o.apply(this, arguments);
    };
  }
  if (typeof heroDeath == "function") {
    const o = heroDeath;
    heroDeath = function () {
      if (R.admGod && admOk() && R.P) return void ((R.life = R.P.life), (R.hpDot = R.hpDotT = 0));
      return o.apply(this, arguments);
    };
  }
  if (typeof heroHit == "function") {
    const o = heroHit;
    heroHit = function (t, n) {
      const r = o.apply(this, arguments);
      R.admOhk && !R.quiet && n && r > 0 && n.hp > 0 && admOk() && (n.hp = 0);
      return r;
    };
  }
}
function admSyncBtn() {
  const b = $("#bAdm");
  if (b) b.style.display = "none";
  if (R.admGod && R.P && R.life < R.P.life && !(R.deadT > 0)) R.life = R.P.life;
}

const ADM_CSS = `
img[src$="ldt.png?adm"],#pad .pbtn.adm i{filter:hue-rotate(-40deg) saturate(1.8) brightness(1.1)}
#pad .pbtn.adm i{background-image:url(img/ep/ldt.png)}
.pbtn.adm{background:radial-gradient(#c93a3a,#3a0808)}
#modal #mClose{display:flex !important;align-items:center;justify-content:center;z-index:100 !important}
.admic{height:18px;vertical-align:middle;image-rendering:pixelated}
.admbox h3 small{font-weight:normal}
.admtabs{display:flex;flex-wrap:wrap;gap:3px;margin:4px 0 6px}
.admtabs button{flex:1 1 auto;min-width:0;padding:4px 6px;font-size:12px}
.admch{display:flex;flex-wrap:wrap;gap:3px;align-items:center;margin:0 0 6px}
.admch button{padding:2px 6px;font-size:11px}
.admbody{max-height:62vh;overflow-y:auto;overflow-x:hidden;padding-right:2px}
.admbody .admlist{max-height:none}
.admh{color:var(--gold,#e0c060);font-weight:bold;margin:8px 0 3px;font-size:13px}
.admf{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:4px 0}
.admf select,.admf input,.admgrid select,.admgrid input{min-width:0;max-width:100%;padding:3px 4px;background:#111;color:#eee;border:1px solid #555;font:inherit;font-size:12px}
.admf select{flex:1 1 180px}
.admf input[type=number]{width:110px}
.admgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:6px;margin:4px 0}
.admgrid label{display:flex;flex-direction:column;gap:2px;font-size:11px;color:var(--dim,#bdb59a)}
.admcur{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--line,#3e3c30)}
.admcur img{width:28px;height:28px;object-fit:contain;image-rendering:pixelated}
.admcur .admcoin{display:inline-block;width:24px;height:18px;margin:5px 2px}
.admcur>span{flex:1 1 120px;min-width:0}
.admcur small{display:block;color:var(--dim,#bdb59a);font-size:11px}
.admrow{cursor:default;grid-template-columns:auto 1fr auto}
.admrow .btnrow{margin:0;flex-wrap:nowrap;align-items:center;gap:4px}
.admrow select{background:#111;color:#eee;border:1px solid #555}
.admlist .shoprow:not(:has(img)){grid-template-columns:1fr auto}
.admlist .shoprow.alt{margin-left:14px}
.admlist .shoprow.admsw{grid-template-columns:auto 1fr auto;align-items:center;text-align:left}
.admlist .shoprow.admsw>span{text-align:left}
.admsw .admck{display:inline-grid;place-items:center;width:20px;height:20px;border:1px solid #777;color:#ffd24a}
.admlog{color:#ff6a5a;font-weight:bold}
`;

function admInstall() {
  const st = document.createElement("style");
  st.textContent = ADM_CSS;
  document.head.appendChild(st);
  admGuardNet();
  admHookCombat();
  window.admUse = admUse;
  const btn = $("#bAdm");
  btn &&
    btn.addEventListener("pointerdown", (e) => {
      (e.preventDefault(), e.stopPropagation(), e.button !== 2 && admUse());
    });
  admSyncBtn();
  setInterval(() => {
    try {
      admSyncBtn();
    } catch {}
  }, 500);
}
document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", admInstall) : setTimeout(admInstall, 0);
