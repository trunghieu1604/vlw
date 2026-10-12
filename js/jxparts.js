"use strict";
let JXL = window.JXLOOK || null;
if (!JXL && typeof document < "u") {
  const n = document.createElement("script");
  ((n.src = "jxlook.js?v=" + ((document.querySelector('script[src*="js/core.js"]') || {}).src || "").split("v=")[1]),
    (n.onload = () => {
      ((JXL = window.JXLOOK || null),
        JXL && typeof R < "u" && S && S.fac && ((R.jx = jxOn() ? jxSetup() : null), R.jx && jxPreload()));
    }),
    document.head.appendChild(n));
}
const JX_PART_IDX = {
    头部: 0,
    发型: 1,
    肩膀: 4,
    躯体: 5,
    左手: 6,
    右手: 7,
    左手武器: 8,
    右手武器: 9,
    马前: 12,
    马中: 13,
    马后: 14,
  },
  JX_IDX_PART = Object.fromEntries(Object.entries(JX_PART_IDX).map(([n, o]) => [o, n])),
  JX_GROUP = {
    头部: "helm",
    发型: "helm",
    肩膀: "armor",
    躯体: "armor",
    左手: "armor",
    右手: "armor",
    左手武器: "weapon",
    右手武器: "weapon",
    马前: "horse",
    马中: "horse",
    马后: "horse",
  },
  jxSheetKey = (n, o) => (o.startsWith("m:") ? "m/" + o.slice(2) : n + "/" + o),
  jxOn = () => !!JXL && S && S.jxLook !== !1;
function jxItemP(n) {
  if (!n) return -1;
  if (Number.isInteger(n.p)) return n.p;
  const o = typeof baseRow == "function" ? baseRow(n.d, n.k, n.lvl || 1) : null;
  return o && Number.isInteger(o.p) ? o.p : -1;
}
const JX_TM_ROW = {
    ovan: 5,
    xtho: 13,
    tanh: 3,
    dlo: 2,
    cdsu: 11,
    pvan: 1,
    btieu: 6,
    xlc: 9,
    duhuy: 4,
    tdia: 0,
    dvu: 8,
    squang: 10,
    pvu: 7,
    hhlc: 15,
    bhv: 11,
    pvtm: 10,
  },
  JX_HN_ROW = {
    "Bôn Tiêu": 6,
    "Phiên Vũ": 7,
    "Phi Vân": 1,
    "Xích Long Câu": 9,
    "Tuyệt Địa": 0,
    "Du Huy": 4,
    "Đằng Vụ": 8,
    "Siêu Quang": 10,
    "Kim Tinh Hổ Vương": 10,
    "Hỏa Tinh Kim Hổ Vương": 13,
    "Kim Tinh Bạch Hổ Vương": 11,
    "Long Tinh Hắc Hổ Vương": 3,
    "Hãn Huyết Long Câu": 15,
    "Phong Vân Bạch Mã": 11,
    "Phong Vân Chiến Mã": 2,
    "Phong Vân Thần Mã": 10,
    "Sư tử": 10,
    "Lạc đà": 9,
    "Dương Đà": 0,
    "Hươu đốm": 9,
    "Dương Sa": 7,
    "Ngự Phong": 8,
    "Truy điện": 4,
    "Lưu Tinh": 1,
  },
  JX_K_ROW = {
    6: 10,
    7: 11,
    8: 12,
    9: 13,
    11: 15,
    13: 17,
    14: 18,
    15: 19,
    16: 20,
    17: 21,
    18: 22,
    19: 11,
    20: 11,
    21: 11,
    22: 23,
    23: 24,
    24: 25,
    25: 26,
    30: 11,
    31: 13,
    32: 17,
  },
  JX_K5_ROW = {
    "Ô Vân Đạp Tuyết": 5,
    "Xích Thố": 0,
    "Tuyệt Ảnh": 9,
    "Tuyệt ảnh": 9,
    "Đích Lô": 2,
    "Chiếu Dạ Ngọc Sư Tử": 1,
  };
function jxHorseExact(n) {
  if (!n) return -1;
  const o = (JXL.tabs[S && S.sex ? "f" : "m"] || {}).马中 || {},
    t = (n.n || "").replace(/\s+\d+$/, ""),
    e = n.k === 5 ? JX_K5_ROW[t] : JX_K_ROW[n.k];
  return e != null && o[e] ? e : -1;
}
function jxHorseRow(n) {
  const o = jxHorseExact(n);
  if (o >= 0) return o;
  if (n && n.thanma && JX_TM_ROW[n.thanma] != null && JXL.tabs[R.jx ? R.jx.sx : "m"]) return JX_TM_ROW[n.thanma];
  const t = n && n.n ? n.n.replace(/\s+\d+$/, "") : "";
  if (JX_HN_ROW[t] != null && jxRow("horse", n) < 0) return JX_HN_ROW[t];
  const e = jxRow("horse", n);
  if (e >= 0) return e;
  const r = JXL.res.horse || {};
  for (const s in r) if (r[s] >= 2) return r[s] - 2;
  return -1;
}
function jxRow(n, o) {
  const t = JXL.res[n];
  if (!t) return -1;
  const e = o && (reqOk(o) || n === "horse") && jxItemP(o) >= 0 ? jxItemP(o) + 2 : 1,
    r = t[e] ?? t[1];
  return r == null ? -1 : r - 2;
}
function jxSetup() {
  if (!JXL || !S || !S.fac) return null;
  const n = S.sex ? "f" : "m",
    o = S.eq,
    t = o.weapon,
    e = {
      helm: jxRow("helm", o.helm),
      armor: jxRow("armor", o.armor),
      weapon: jxRow(t && t.d === 1 ? "range" : "melee", t),
      horse: o.horse && R.mounted ? jxHorseRow(o.horse) : -1,
    };
  e.weapon < 0 && (e.weapon = 0);
  const r = (JXL.wnames[n] || [])[e.weapon] || "空手",
    s = JXL.assoc[n][r] || JXL.assoc[n].空手,
    a = e.horse >= 0 && s && s[1] ? 1 : 0;
  return { sx: n, rows: e, asc: s ? s[a] || s[0] : {}, ride: a, key: JSON.stringify([n, e, a]) };
}
// JX1 part draw order (CSortTable::GetSort, called from KNpcResVN::Draw): nDir is the SPR direction
// index (0..7 for the 8-direction player SPRs -> Dir1..Dir8, not Dir1/3/5..) and "LineN" rows match the
// ABSOLUTE frame number dir*framesPerDir+frame.
function jxOrder(n, o, t, e) {
  const r = JXL.sort[n],
    s = r[o] || {},
    a = r.DEFAULT;
  for (const f in s) if (f[0] === "L" && s[f][0] === e) return s[f].slice(1);
  return (s["Dir" + (t + 1)] || a["Dir" + (t + 1)] || a.Dir1).slice(1);
}
// ms per native SPR frame (sheets hold every frame; same cycle length as the old half-frame sheets)
const JX_MS = { st: 60, run: 42.5 };
// last look whose sheets were all loaded: drawn while a new look / action is still loading,
// so body parts never pop in and out one by one (R.jxLast: per actor, swapped with the disciples)
// sheets of look u for action g -> [[img, meta, part]], or null while any of them is still loading
function jxSet(u, g) {
  // complete sets are cached on the look object (a new look = a new object): no per-frame lookups
  const C = u._set || (u._set = {});
  if (C[g]) return C[g];
  const L = JXL.tabs[u.sx] || {},
    b = [];
  let wait = !1;
  for (const c in JX_PART_IDX) {
    const h = u.rows[JX_GROUP[c]];
    if (h < 0) continue;
    const l = ((L[c] || {})[h] || {})[g];
    if (!l) continue;
    const j = jxSheetKey(u.sx, l),
      m = JXL.sheets[j];
    if (!m) continue;
    const x = img("img/jx/" + j + ".webp" + SPR_V);
    if (!x.complete) wait = !0;
    else if (x.naturalWidth) b.push([x, m, c]);
  }
  return wait || !b.length ? null : (C[g] = b);
}
// "at" -> the magic action ("mg") for the skill being cast: JX1 CharAnimId when the effect tables have it
// (JFX.act, fxjx.js: 11 cdo_magic / 9,10 cdo_attack), else a non-physical main skill casts with "mg"
const jxCastMg = () => {
    const a = typeof JFX < "u" && JFX.act && H && H.castSk && JFX.act[H.castSk];
    return a ? a === "mg" : !!(R.P && R.P.main && !R.P.main.phys);
  },
  jxAct = (u, n, f) => (!f && n === "at" && jxCastMg() && u.asc.mg ? "mg" : n);
function drawJxHero(n, o, t, e, r, s, a, O, f) {
  let u = f || R.jx;
  if (!u) return !1;
  let g = u.asc[jxAct(u, n, f)] || u.asc.st;
  if (!g) return !1;
  let b = jxSet(u, g);
  if (!b && !f) {
    // still loading: keep drawing the previous complete look, else this look's stand pose
    const v = R.jxLast && R.jxLast.key !== u.key ? R.jxLast : null,
      vg = v && (v.asc[jxAct(v, n)] || v.asc.st),
      vb = vg && jxSet(v, vg);
    if (vb) ((u = v), (g = vg), (b = vb));
    else if (u.asc.st && u.asc.st !== g && (b = jxSet(u, u.asc.st))) ((g = u.asc.st), (n = "st"));
  }
  if (!b) return !1;
  !f && u === R.jx && (R.jxLast = u);
  let p = null;
  for (const [, m, c] of b) (c === "躯体" || !p) && (p = m);
  const d = p[4],
    D = p[5] || 8,
    dr = Math.floor(((o % 8) * D) / 8 + 0.5) % D;
  let w;
  if (n === "st" || n === "run") w = Math.floor((t * 1e3) / (JX_MS[n] || 55)) % d;
  else {
    const i = (typeof animLen == "function" && animLen(O, n)) || d * 0.05;
    w = Math.min(d - 1, Math.floor(clamp(t / Math.max(0.1, i), 0, 0.999) * d));
  }
  const T = jxOrder(u.sx, g, dr, dr * d + w * (p[6] || 1));
  b.sort((i, c) => T.indexOf(JX_PART_IDX[i[2]]) - T.indexOf(JX_PART_IDX[c[2]]));
  const M = JXL.foot[0],
    X = JXL.foot[1],
    k = s / (JXL.sc || 1),
    // whole CSS pixels at 1:1 (the camera is already rounded) -> the sprite is never resampled
    ex = k === 1 ? Math.round(e) : e,
    ey = k === 1 ? Math.round(r) : r,
    sm = sprCrisp(CX, k);
  let y = 0;
  CX.globalAlpha = a;
  for (const [i, c] of b) {
    const [h, l, j, m, x, H] = c,
      P = Math.min(x - 1, Math.floor((w * x) / d)),
      _ = H === D ? dr : Math.floor(((o % 8) * H) / 8 + 0.5) % H;
    (CX.drawImage(i, P * h, _ * l, h, l, ex + (j - M) * k, ey + (m - X) * k, h * k, l * k),
      (y = Math.max(y, (X - m) * k)));
  }
  return ((CX.globalAlpha = 1), (CX.imageSmoothingEnabled = sm), y);
}
function jxPreload() {
  const n = R.jx;
  if (n)
    for (const o of Object.values(n.asc))
      for (const t in JX_PART_IDX) {
        const e = n.rows[JX_GROUP[t]];
        if (e < 0) continue;
        const r = (((JXL.tabs[n.sx] || {})[t] || {})[e] || {})[o];
        r && JXL.sheets[jxSheetKey(n.sx, r)] && img("img/jx/" + jxSheetKey(n.sx, r) + ".webp" + SPR_V);
      }
}
