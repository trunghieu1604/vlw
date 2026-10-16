"use strict";
window.J = window.JX;
const J = window.JX,
  W = window.JW,
  $ = (n) => document.querySelector(n),
  rnd = (n, t) => n + Math.random() * (t - n),
  irnd = (n, t) => Math.floor(n + Math.random() * (t - n + 1)),
  pick = (n) => n[Math.floor(Math.random() * n.length)],
  clamp = (n, t, e) => Math.max(t, Math.min(e, n)),
  JX_K = 0.81,
  jxd = (n, t, e, s) => Math.hypot(e - n, (s - t) * 2) / JX_K,
  jxdE = (n, t) => jxd(n.x, n.y, t.x, t.y),
  fmtL = (n) => {
    if (((n = Math.round(+n || 0)), Math.abs(n) < 1e4)) return n.toLocaleString("vi-VN");
    const e = n / 1e4;
    return (
      (Math.abs(e) < 100 ? (Math.round(e * 10) / 10).toLocaleString("vi-VN") : Math.round(e).toLocaleString("vi-VN")) +
      " vạn"
    );
  },
  fmt = (n) => {
    n = Math.round(n);
    const t = Math.abs(n);
    return t < 1e4
      ? "" + n
      : t < 1e6
        ? (n / 1e3).toFixed(t < 1e5 ? 1 : 0) + "k"
        : t < 1e9
          ? (n / 1e6).toFixed(2) + "M"
          : (n / 1e9).toFixed(2) + "B";
  },
  esc = (n) => String(n).replace(/[&<>"]/g, (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[t]);
function wpick(n, t) {
  let e = 0;
  for (const o of n) e += t(o);
  let s = Math.random() * e;
  for (const o of n) if (((s -= t(o)), s <= 0)) return o;
  return n[n.length - 1];
}
const SERIES = J.series,
  SERIES_COL = ["#f3d35b", "#6fd46a", "#5fb8ff", "#ff6a3a", "#c8965a"],
  KHAC = { 0: 1, 1: 4, 4: 2, 2: 3, 3: 0 },
  counters = (n, t) => n >= 0 && t >= 0 && KHAC[n] === t,
  ELEM = ["phys", "poison", "cold", "fire", "light"],
  ELEM_VI = { phys: "Vật lý", poison: "Độc", cold: "Băng", fire: "Hỏa", light: "Lôi" },
  ELEM_COL = { phys: "#f0e6d0", poison: "#8fe34a", cold: "#7fd0ff", fire: "#ff7a2a", light: "#d9b6ff" },
  ELEM_ATTR = {
    phys: "physicsdamage_v",
    poison: "poisondamage_v",
    cold: "colddamage_v",
    fire: "firedamage_v",
    light: "lightingdamage_v",
  },
  ELEM_ADD = {
    phys: "addphysicsdamage_v",
    poison: "addpoisondamage_v",
    cold: "addcolddamage_v",
    fire: "addfiredamage_v",
    light: "addlightingdamage_v",
  },
  ELEM_RES = {
    phys: "physicsres_p",
    poison: "poisonres_p",
    cold: "coldres_p",
    fire: "fireres_p",
    light: "lightingres_p",
  },
  ELEM_ENH = { poison: "poisonenhance_p", cold: "coldenhance_p", fire: "fireenhance_p", light: "lightingenhance_p" },
  MAX_RESIST = 95,
  PLAYER_RES_MAX = 75,
  REBORN_RES = 2,
  MAX_HIT = 95,
  MIN_HIT = 40,
  CRIT_MULT = 2,
  STR_PER_DMG = 5,
  DEX_PER_DMG = 5,
  ENG_PER_DMG = 4,
  ENG_PER_PCT = 1,
  STR_PER_PCT = 1,
  DEX_PCT_RANGED = 1,
  IDLE_LIFE_PER_LEVEL = 0,
  PTS_PER_LEVEL = 5,
  SKILL_PTS_PER_LEVEL = 1,
  MAX_LEVEL = 9999,
  BASE_CAP = 200,
  rebornN = () => (typeof S < "u" && S && S.rw && S.rw.stat && S.rw.stat.reborn) || 0,
  levelCap = () => (rebornN() >= 5 ? 9999 : 200),
  REB_EQ_LV = 200,
  eqLevel = () => S.lvl + REB_EQ_LV * rebornN(),
  ATTR_ID = Object.fromEntries(J.attr.map((n, t) => [n, t])),
  ATTR_SER_DMG = {
    metalskill_v: "addphysicsmagic_v",
    earthskill_v: "addpoisonmagic_v",
    woodskill_v: "addcoldmagic_v",
    waterskill_v: "addfiremagic_v",
    fireskill_v: "addlightingmagic_v",
  },
  attrReal = (n) => ATTR_SER_DMG[n] || n;
function skPlusText(n) {
  const t = Math.round(n[0] || 0),
    e = n[2] || 0;
  if (!(e > 0)) return `Tất cả kỹ năng: +${t} cấp`;
  const s = (typeof SK < "u" && SK[e]) || J.skills[e],
    o = typeof S < "u" && S && typeof FAC < "u" ? FAC[S.fac] : null,
    a = !o || (o.skills || []).some((c) => +c == +e);
  return `Kỹ năng ${s ? s.n : "#" + e}: +${t} cấp${a ? "" : " (không thuộc môn phái)"}`;
}
function attrText(n, t) {
  if (((n = attrReal(n)), n === "allskill_v")) return skPlusText(t);
  const e = J.attrDesc[n];
  return e
    ? e
        .replace(/#([a-zA-Z])([123A])([-+~%]?)/g, (s, o, a, c) => {
          const r = a === "A" ? Math.floor((t[0] || 0) / 256) : t[+a - 1] || 0;
          return o === "l" ? (J.skills[r] ? J.skills[r].n : "#" + r) : (c === "+" && r > 0 ? "+" : "") + r;
        })
        .replace(/#[a-zA-Z][123A][-+~]?/g, "")
        .replace(/Kỹ năng (\d+)/, (s, o) => (J.skills[o] ? "Kỹ năng " + J.skills[o].n : s))
    : n + ": " + t.filter((s) => s).join(" / ");
}
const FACTIONS = J.factions.filter((n) => n.skills && n.skills.length),
  FAC = Object.fromEntries(FACTIONS.map((n) => [n.key, n])),
  NOVICE_LV = 10;
for (let n = 0; n < 5; n++)
  FAC["vo" + n] = { key: "vo" + n, n: "Vô Môn Phái", series: n, skills: [], wcode: -1, id: -1, novice: !0 };
const isNovice = () => !!(S && FAC[S.fac] && FAC[S.fac].novice),
  FAC_SEX = { shaolin: 0, emei: 1, cuiyan: 1 },
  facAllowed = (n, t) => !(n.key in FAC_SEX) || FAC_SEX[n.key] === (t || 0);
function heroGfx(n = S && S.fac, t = S && S.sex) {
  if (W.hero[n]) return W.hero[n];
  const e = FAC[n];
  if (!e) return null;
  const s = FACTIONS.filter((a) => a.series === e.series),
    o = s.find((a) => facAllowed(a, t) && a.key in FAC_SEX) || s.find((a) => facAllowed(a, t)) || s[0];
  return t && !s.some((a) => FAC_SEX[a.key] === 1) ? W.hero.emei : W.hero[o.key];
}
const SK = J.skills;
for (const n of FACTIONS) {
  const t = n.skills
    .map((o) => SK[o])
    .filter(
      (o) =>
        o &&
        o.enemy &&
        [
          "physicsenhance_p",
          "physicsdamage_v",
          "poisondamage_v",
          "colddamage_v",
          "firedamage_v",
          "lightingdamage_v",
        ].some((a) => o.attr[a]),
    )
    .sort((o, a) => o.req - a.req || o.id - a.id);
  t.length && ((t[0].req = 1), (n.starter = t[0].id));
  const e = n.skills
      .map((o) => SK[o])
      .filter((o) => o && !o.enemy && o.attr.addphysicsdamage_p)
      .sort((o, a) => o.req - a.req || o.id - a.id)[0],
    s = e && e.attr.addphysicsdamage_p[0];
  n.wcode = Array.isArray(s) && [0, 1, 2, 3, 4, 5, 7, 9].includes(s[2]) ? s[2] : -1;
}
SK[384] && (SK[384].eqt = -2);
const SK150_EQT = {
  1056: 2, 1057: 1, 1058: 1, 1059: 3, 1060: 4, 1061: 0,
  1062: -2, 1063: 1, 1065: -2, 1066: -2, 1067: 1, 1069: 100,
  1070: 101, 1071: 102, 1073: -2, 1074: 2, 1075: 3, 1076: -2,
  1078: -2, 1079: 0, 1080: 1, 1081: -2, 1114: -2
};
for (const [k, v] of Object.entries(SK150_EQT)) {
  if (SK[k]) SK[k].eqt = v;
}
const EQT_VI = {
    "-1": "Tay không",
    0: "Kiếm",
    1: "Đao",
    2: "Côn",
    3: "Thương",
    4: "Song Chùy",
    5: "Song Đao",
    100: "Phi Tiêu",
    101: "Phi Đao",
    102: "Tụ Tiễn",
  },
  itEqt = (n) => (n ? (n.d === 1 ? 100 + n.k : n.k === 6 ? -1 : n.k) : -1),
  curEqt = () => itEqt(S.eq && S.eq.weapon),
  skEqt = (n) => (n && n.eqt != null && n.eqt !== -2 && n.eqt !== -1 && n.attr && n.attr.physicsenhance_p ? n.eqt : null),
  skWOk = (n, t = curEqt()) => skEqt(n) === null || skEqt(n) === -1 || skEqt(n) === t;
function wantEqt() {
  const n = S.mainLock && S.main && S.main !== "basic" ? S.main : typeof R < "u" && R.P && R.P.wantId;
  return skEqt(SK[n]);
}
function weaponFits(n) {
  const t = wantEqt();
  if (t !== null) return itEqt(n) === t;
  const e = FAC[S.fac];
  return !e || e.wcode < 0 || weaponCode({ weapon: n }) === e.wcode;
}
function facWeaponDP(n) {
  const t = skEqt(SK[n.starter]);
  if (t !== null) return t === -1 ? [0, 6] : t >= 100 ? [1, t - 100] : [0, t];
  const e = n.wcode >= 0 ? n.wcode : 0;
  return e === 7 ? [1, 0] : [0, e === 9 ? 6 : e];
}
function wantWeaponDP() {
  const n = wantEqt();
  if (n !== null) return n === -1 ? [0, 6] : n >= 100 ? [1, n - 100] : [0, n];
  const t = FAC[S.fac],
    e = t && t.wcode >= 0 ? t.wcode : 0;
  return e === 7 ? [1, irnd(0, 2)] : [0, e === 9 ? 6 : e];
}
const SKV_FIXED = /^(skill_|missle_)/,
  SKV_EXTRA_MAX = 10,
  skVal = (n, t, e) => {
    const s = n.attr[t];
    if (!s) return null;
    const o = s.length,
      a = s[o - 1],
      c = (i) => (Array.isArray(i) ? i : [i, 0, 0]);
    if (e <= o || o < 2 || SKV_FIXED.test(t)) return c(s[clamp(e, 1, o) - 1]);
    const r = Math.min(SKV_EXTRA_MAX, e - o),
      d = c(s[o - 2]);
    return c(a).map((i, l) => (l === 1 && t.startsWith("poison") ? i : i + (i - d[l]) * r));
  },
  DMG_ATTRS = [
    "physicsenhance_p",
    "physicsdamage_v",
    "poisondamage_v",
    "colddamage_v",
    "firedamage_v",
    "lightingdamage_v",
  ],
  isAttack = (n) => !!(n && n.enemy && DMG_ATTRS.some((t) => n.attr[t])),
  ZONES = W.zones,
  MON = W.mon;
for (const n in W.anim || {})
  for (const t in W.anim[n]) {
    const e = W.anim[n][t];
    e && (e.ax < 0 || e.ay < 0 || e.ax > e.w || e.ay > e.h * 1.2) && ((e.ax = e.w / 2), (e.ay = e.h - 2));
  }
const ZONE_STAGES = 10,
  WAVES = 4,
  SERIES_ELEM = ["phys", "poison", "cold", "fire", "light"];
function monSeries(n) {
  const t = MON[n];
  if (!t) return 0;
  if (t._s !== void 0) return t._s;
  const e = t.rmax || [],
    s = Math.max(...e),
    o = e.map((a, c) => (a === s ? c : -1)).filter((a) => a >= 0);
  return (t._s = o.length === 1 ? o[0] : Math.abs(+n || 0) % 5);
}
function zoneSeries(n) {
  const t = [0, 0, 0, 0, 0];
  for (const e of n.m) t[monSeries(e)]++;
  return t;
}
const STAGES = ZONES.length * ZONE_STAGES,
  DMG_SHIELD_MAX = 0.35,
  SLOTS = [
    ["weapon", "Vũ khí"],
    ["armor", "Áo"],
    ["helm", "Mũ"],
    ["belt", "Đai lưng"],
    ["boot", "Giày"],
    ["cuff", "Hộ uyển"],
    ["amulet", "Dây chuyền"],
    ["ring1", "Nhẫn 1"],
    ["ring2", "Nhẫn 2"],
    ["pendant", "Ngọc bội"],
    ["horse", "Ngựa"],
    ["mask", "Mặt nạ"],
  ],
  SLOT_VI = Object.fromEntries(SLOTS),
  DETAIL_SLOT = ["weapon", "weapon", "armor", "ring", "amulet", "boot", "belt", "helm", "cuff", "pendant", "horse", "mask"],
  MELEE_KIND = ["sword", "blade", "wand", "spear", "hammer", "dualblades"],
  RANGE_KIND = ["darts", "knife", "crossbow"],
  AFFIX_KEY = {
    armor: "armor",
    ring: "ring",
    amulet: "necklace",
    boot: "boot",
    belt: "belt",
    helm: "helm",
    cuff: "cuff",
    pendant: "pendant",
  },
  RAR_VI = ["Thường", "Xanh", "Hiếm", "Tím", "Hoàng Kim", "Bạch Kim"],
  RAR_COL = ["#e8e0d0", "#6aa8ff", "#ff9a3c", "#c77bff", "#ffcc00", "#9fe8ff"],
  INV_MAX = 60,
  ENH_MAX = 10,
  ENH_STEP = 0.08,
  PLAT_STEP = 0.05,
  ENH_LINE_STEP = 0.04,
  enhLineMul = (n) => 1 + ENH_LINE_STEP * ((n && n.enh) || 0),
  enhMul = (n) => 1 + ENH_STEP * ((n && n.enh) || 0) + PLAT_STEP * ((n && n.plv) || 0),
  WORLD = { w: 3072, h: 3072, pad: 20 },
  clampWorld = (n, t) => [clamp(n, WORLD.pad, WORLD.w - WORLD.pad), clamp(t, WORLD.pad + 30, WORLD.h - WORLD.pad)],
  inWorld = (n, t) => {
    const e = clampWorld(n, t);
    return typeof OBS < "u" && OBS.g ? obsSnap(e[0], e[1]) : e;
  },
  attrName = (n) => J.attr[n] || "#" + n,
  bossName = (n, t) => (MON[n] && /^Tiểu Boss/i.test(MON[n].n) ? `Bá Chủ ${t || ""}`.trim() : MON[n] ? MON[n].n : "");

function isGodMode() {
  if (typeof S === "undefined" || !S) return false;
  if (typeof R !== "undefined" && R && R.admGod && typeof admOk === "function" && admOk()) return true;
  return false;
}
window.isGodMode = isGodMode;

// Danh sách mặt nạ ngoại trang Võ Lâm (DetailType = 11: mask)
J.items[11] = {
  n: "Mặt nạ",
  list: [
    { k: 1, n: "Mặt nạ Nguyệt Ca Đảo Chủ", anim: "boss093", d: "Đeo vào hóa thân thành Nguyệt Ca Đảo Chủ tuyệt sắc toạ trên trăng khuyết huyền ảo, phong thái vương giả cái thế.", ic: "img/ep/ldt.png", duration: 3 * 86400 * 1000 },
    { k: 2, n: "Mặt nạ Đoạt Phách Vệ Sĩ", anim: "enemy029", d: "Đeo vào hóa thân thành Đoạt Phách Vệ Sĩ uy phong lẫm liệt, tay cầm khiên kiếm hoàng lăng.", ic: "img/ep/ldt.png", duration: 3 * 86400 * 1000 },
    { k: 3, n: "Mặt nạ Lam Y Nữ Hiệp", anim: "boss002", d: "Đeo vào hóa thân thành Lam Y Nữ Hiệp kiều diễm, song kiếm vô song phong hoa tuyệt đại.", ic: "img/ep/ldt.png", duration: 3 * 86400 * 1000 },
    { k: 4, n: "Mặt nạ Miêu Cương Thánh Nữ", anim: "boss008", d: "Đeo vào hóa thân thành Miêu Cương Thánh Nữ áo tiên vương miện đài các kiêu sa.", ic: "img/ep/ldt.png", duration: 3 * 86400 * 1000 },
    { k: 5, n: "Mặt nạ Hồng Y Nữ Hiệp", anim: "boss005", d: "Đeo vào hóa thân thành Hồng Y Nữ Hiệp kiều diễm, tóc đuôi ngựa thướt tha, kiếm vũ khuynh thành.", ic: "img/ep/ldt.png", duration: 3 * 86400 * 1000 },
    { k: 6, n: "Mặt nạ Thúy Y Tiên Tử", anim: "enemy059", d: "Đeo vào hóa thân thành Thúy Y Tiên Tử áo lục song kiếm, dáng ngọc thanh tân thoát tục.", ic: "img/ep/ldt.png", duration: 3 * 86400 * 1000 },
    { k: 7, n: "Mặt nạ Tiêu Dao Phiến Khách", anim: "boss006", d: "Đeo vào hóa thân thành Tiêu Dao Phiến Khách lãng tử hào hoa, tay phe phẩy quạt ngạo thị quần hùng.", ic: "img/ep/ldt.png", duration: 3 * 86400 * 1000 },
    { k: 8, n: "Mặt nạ Thi Nghi Sinh", anim: "enemy003", d: "Đeo vào hóa thân thành Thi Nghi Sinh nho nhã phong lưu, văn võ song toàn.", ic: "img/ep/ldt.png", duration: 3 * 86400 * 1000 },
    { k: 9, n: "Mặt nạ Phi Sa Cuồng Đao", anim: "enemy083", d: "Đeo vào hóa thân thành Phi Sa Cuồng Đao dũng mãnh, phong trần cái thế.", ic: "img/ep/ldt.png", duration: 3 * 86400 * 1000 },
    { k: 10, n: "Mặt nạ Lạc Quang Thiền Sư", anim: "enemy021", d: "Đeo vào hóa thân thành Lạc Quang Thiền Sư võ công thâm hậu, độc bộ võ lâm.", ic: "img/ep/ldt.png", duration: 3 * 86400 * 1000 },
    { k: 11, n: "Mặt nạ Boss Vân Tuyết Sơn", anim: "boss013", d: "Đeo vào hóa thân thành Đại Boss Vân Tuyết Sơn oai phong lẫm liệt chấn nhiếp bát phương.", ic: "img/ep/ldt.png", duration: 3 * 86400 * 1000 },
    { k: 12, n: "Mặt nạ Thừa Phong Kiếm Khách", anim: "enemy069", d: "Đeo vào hóa thân thành Thừa Phong Kiếm Khách Kim Sơn Đảo xuất chiêu cuồng phong bão táp.", ic: "img/ep/ldt.png", duration: 3 * 86400 * 1000 },
    { k: 13, n: "Mặt nạ Chiến Tướng Liêu Định", anim: "enemy206", d: "Đeo vào hóa thân thành Thiết Giáp Chiến Tướng Liêu Định thân mang trọng giáp hùng dũng trấn ải.", ic: "img/ep/ldt.png", duration: 3 * 86400 * 1000 },
  ],
};

function makeMaskItem(k, perm = false) {
  const list = J.items[11].list;
  const def = list.find((m) => m.k === k) || list[0];
  const isPerm = !!perm;
  const it = {
    uid: typeof genUid === "function" ? genUid() : Date.now() + Math.floor(Math.random() * 10000),
    d: 11,
    k: def.k,
    lvl: 1,
    r: isPerm ? 4 : 3,
    n: def.n,
    anim: def.anim,
    ic: def.ic,
    mag: [],
    base: [],
    req: [],
  };
  if (isPerm) {
    it.perm = true;
  } else {
    it.expireAt = Date.now() + (def.duration || 3 * 86400 * 1000);
  }
  return it;
}
window.makeMaskItem = makeMaskItem;

function migrateMasks() {
  if (typeof S === "undefined" || !S) return;
  const list = (typeof J !== "undefined" && J.items && J.items[11] && J.items[11].list) || [];
  if (!list.length) return;

  const updateItem = (it) => {
    if (!it || it.d !== 11) return;
    const def = list.find((m) => m.k === it.k) || list[0];
    if (def) {
      it.n = def.n;
      it.anim = def.anim;
      it.ic = def.ic;
      if (def.perm) it.perm = true;
    }
  };

  if (S.inv && Array.isArray(S.inv)) S.inv.forEach(updateItem);
  if (S.eq && S.eq.mask) updateItem(S.eq.mask);
  if (S.stash && Array.isArray(S.stash)) S.stash.forEach(updateItem);
}
window.migrateMasks = migrateMasks;

function getActive3DayMask() {
  if (typeof S === "undefined" || !S) return null;
  const now = Date.now();
  if (S.eq && S.eq.mask && !S.eq.mask.perm && S.eq.mask.expireAt && S.eq.mask.expireAt > now) {
    return S.eq.mask;
  }
  if (S.inv && Array.isArray(S.inv)) {
    const found = S.inv.find((it) => it && it.d === 11 && !it.perm && it.expireAt && it.expireAt > now);
    if (found) return found;
  }
  if (S.stash && Array.isArray(S.stash)) {
    const found = S.stash.find((it) => it && it.d === 11 && !it.perm && it.expireAt && it.expireAt > now);
    if (found) return found;
  }
  return null;
}
window.getActive3DayMask = getActive3DayMask;

function maskBoxHave() {
  return typeof matHave === "function" ? matHave("misc", "rmatna") : 0;
}
window.maskBoxHave = maskBoxHave;

function maskBoxOpen() {
  if (typeof S === "undefined" || !S) return null;
  const list = (typeof J !== "undefined" && J.items && J.items[11] && J.items[11].list) || [];
  const pool = list;
  if (!pool.length) return null;
  const picked = pool[Math.floor(Math.random() * pool.length)];
  const item = typeof makeMaskItem === "function" ? makeMaskItem(picked.k, false) : null;
  if (!item) return null;

  if (typeof addItem === "function") {
    addItem(item, true, true, true);
  } else {
    S.inv.unshift(item);
  }
  return item;
}
window.maskBoxOpen = maskBoxOpen;

function maskBoxUse(n = 1) {
  if (maskBoxHave() < 1) {
    if (typeof toast === "function") toast("Không có Rương Mặt Nạ trong túi");
    return;
  }
  if (S.inv.length >= INV_MAX) {
    if (typeof toast === "function") toast("Hành trang đã đầy!");
    return;
  }
  matAdd("misc", "rmatna", -1);
  const item = maskBoxOpen();
  if (!item) {
    if (typeof toast === "function") toast("Lỗi mở rương!");
    return;
  }
  if (typeof uiSfx === "function") uiSfx("levelup");
  if (typeof toast === "function") toast(`Nhận: ${item.n} (Hạn 3 ngày)`);
  if (typeof log === "function") {
    log(`🎭 <b style="color:#ffd24a">Mở Rương Mặt Nạ!</b> Nhận được <b style="color:#ff9e42">${esc(item.n)}</b> (Hạn sử dụng 3 ngày). Đeo ở phím F3 để đổi ngoại trang!`);
  }
  if (typeof R !== "undefined") R.dirty = !0;
  if (typeof invDirty !== "undefined") invDirty = !0;
  if (typeof save === "function") save();
  if (typeof refresh === "function") refresh();
  if (typeof ktcModal === "function" && document.getElementById("mBody")) ktcModal();
}
window.maskBoxUse = maskBoxUse;

