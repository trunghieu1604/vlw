"use strict";
const FACTION_WEAPON_SHARE = 0.5;
function dropFile(n) {
  const e = n < 110 ? clamp(Math.floor(n / 10) * 10, 10, 90) : n < 119 ? 110 : 119;
  return J.drop["npcdroprate" + e + ".ini"] || J.drop["npcdroprate.ini"];
}
function itemTier(n, e) {
  const t = e.main,
    r = t.MinItemLevelScale || 20,
    o = t.MaxItemLevelScale || 10;
  let u = Math.min(Math.floor(n / o), t.MaxItemLevel || 10),
    a = Math.max(Math.floor(n / r), t.MinItemLevel || 1);
  return (u < a && ([a, u] = [u, a]), clamp(a + (u > a ? Math.floor(Math.random() * (u - a)) : 0), 1, 10));
}
function baseRow(n, e, t) {
  const r = J.items[n];
  if (!r) return null;
  let o = r.list.filter((a) => a.k === e);
  if (!o.length) return null;
  const u = o.filter((a) => sexReqOk(a.req));
  return (u.length && (o = u), o.reduce((a, l) => (Math.abs(l.lvl - t) < Math.abs(a.lvl - t) ? l : a)));
}
const DROP_SKEW = 1;
function skewVal(n, e, t) {
  const r = Math.abs(n) <= Math.abs(e) ? n : e;
  return Math.round(r + ((r === n ? e : n) - r) * Math.pow(Math.random(), t));
}
function rollLine(n, e, t, r, o = 0, u = 1) {
  const a = e % 2 === 0 ? 1 : 0,
    l = Math.floor(Math.random() * 100) / (1 + (o * 20) / 100),
    c = J.affix.filter(
      (i) => i.pre === a && (i.s < 0 || i.s === n.s) && i.lvl <= t && (i.w[n.d] || 0) > l && !r.has(i.a),
    );
  if (!c.length) return null;
  const h = pick(c);
  r.add(h.a);
  const s = h.p.map(([i, f]) =>
    i === -1 && f === -1 ? -1 : u > 1 ? skewVal(i, f, u) : irnd(Math.min(i, f), Math.max(i, f)),
  );
  return { a: h.a, p: s, n: h.n, pre: a };
}
function rollMagic(n, e, t = 0, r = 1) {
  const o = [],
    u = new Set();
  for (let a = 0; a < e.length; a++) {
    const l = rollLine(n, a, e[a], u, t, r);
    if (!l) break;
    o.push(l);
  }
  return o;
}
function magicCount(n, e = 1) {
  const t =
    Math.random() * 100 -
    (n === "boss" ? 35 : n === "elite" ? 12 : 0) -
    (R.P ? R.P.lucky : 0) * 0.5 -
    Math.min(e, 200) * 0.05;
  return t < 3 ? irnd(5, 6) : t < 15 ? irnd(3, 4) : t < 50 ? irnd(1, 2) : 0;
}
const magicLevels = (n, e) => Array.from({ length: n }, () => clamp(e, 1, 10));
function rarityOf(n) {
  return n >= 1 ? 1 : 0;
}
const randomSeries = () => irnd(0, 4);
function sexPart(n, e) {
  const t = J.items[n];
  if (!t) return e;
  const r = t.list.filter((u) => u.k === e);
  if (!r.length || r.some((u) => sexReqOk(u.req))) return e;
  const o = [...new Set(t.list.filter((u) => sexReqOk(u.req)).map((u) => u.k))];
  return o.length ? pick(o) : e;
}
function makeItem(n, e, t, r, o) {
  const u = baseRow(n, e, t);
  if (!u) return null;
  const a = {
    uid: S.uid++,
    d: n,
    k: e,
    p: u.p,
    n: u.n,
    ic: u.ic || "",
    lvl: u.lvl,
    s: u.s >= 0 ? u.s : o >= 0 && o <= 4 ? o : randomSeries(),
    base: u.base.map((l) => l.slice()),
    req: u.req.map((l) => l.slice()),
    price: u.price,
  };
  return (
    (a.mag = rollMagic(a, magicLevels(r, u.lvl), R.P ? R.P.lucky : 0, DROP_SKEW)),
    (a.r = rarityOf(a.mag.length)),
    a
  );
}
// admin console "drops" config (js/gcfg/drops.js); built-in value when no config is loaded
const dropCfg = (k, d) => (self.GCFG ? GCFG.get("drops", k, d) : d);
const DROP_NORMAL = 0.08,
  dropMul = () =>
    (1 + (typeof buffP == "function" ? buffP("drop") : 0)) *
    (1 + 0.1 * rebornN()) *
    (1 + Math.min(100, Math.max(0, R.P ? R.P.lucky : 0)) * 0.005);
function rollDrops(n) {
  const e = dropFile(n.L),
    t = e.items.filter((a) => a[0] === 0 && a[1] <= 9),
    r = dropMul(),
    o =
      n.cls === "boss"
        ? Math.round(dropCfg("cls.boss.item", 3) * dropCfg("mul.normal", 1)) + (Math.random() < r - 1 ? 1 : 0)
        : n.cls === "elite"
          ? Math.random() < dropCfg("cls.elite.item", 0.5) * dropCfg("mul.normal", 1) * r
            ? 1
            : 0
          : Math.random() < dropCfg("cls.normal.item", DROP_NORMAL) * dropCfg("mul.normal", 1) * r * densK(n)
            ? 1
            : 0,
    u = [];
  for (let a = 0; a < o * (n.bonusDrop || 1); a++) {
    const l = wpick(t, (f) => f[3]);
    if (!l) continue;
    let [c, h] = [l[1], l[2]];
    const s = FAC[S.fac];
    (c <= 1 && s && !s.novice && Math.random() < 0.5 && ([c, h] = wantWeaponDP()), (h = sexPart(c, h)));
    let i = makeItem(c, h, itemTier(n.L, e), magicCount(n.cls, n.L), n.series);
    for (let f = 0; i && !sexOk(i) && f < 6; f++)
      i = makeItem(c, h, itemTier(n.L, e), magicCount(n.cls, n.L), n.series);
    i && sexOk(i) && u.push(i);
  }
  if (
    typeof verVio == "function" &&
    verVio() &&
    Math.random() < dropCfg("cls." + n.cls + ".jewel", JEWEL_DROP[n.cls] ?? JEWEL_DROP.normal) * dropCfg("mul.jewel", 1) * r * densK(n) * (n.bonusDrop || 1) * dropCfg("vip", VIP_DROP_RATE)
  ) {
    const a = t.filter((h) => FUSE_SLOTS.includes(h[1])),
      l = a.length ? wpick(a, (h) => h[3]) : null,
      c = l && makeItem(l[1], l[2], itemTier(n.L, e), irnd(0, 2), n.series);
    c && u.push(c);
  }
  if (
    typeof verVio == "function" &&
    verVio() &&
    typeof phoiFromDrop == "function" &&
    Math.random() < (n.cls === "boss" ? 0.2 : n.cls === "elite" ? 0.05 : 0.002) * r * (n.bonusDrop || 1)
  ) {
    const ph = phoiFromDrop(n.L);
    ph && u.push(ph);
  }
  return u;
}
const JEWEL_DROP = { normal: 0.04, elite: 0.35, boss: 1 };
// "VIP" drops (Hoàng Kim / Bạch Kim set items in sets.js rollSetDrop + jewellery here): 1/4 of the original rate
const VIP_DROP_RATE = 0.25;
function moneyDrop(n) {
  const e = dropFile(n.L).main;
  return Math.round(
    ((e.MoneyScale || 50) / 10) * n.L * rnd(0.6, 1.4) * (n.cls === "boss" ? 8 : n.cls === "elite" ? 2 : 1),
  );
}
const VAL_K = 1540,
  VAL_EXP = 2.4,
  ATTR_MAX = (() => {
    const n = {},
      e = (t, r) => {
        const o = Math.max(Math.abs(r[0] || 0), Math.abs(r[1] || 0));
        o > 0 && o !== 1 && !(r[0] === -1 && r[1] === -1) && (n[t] = Math.max(n[t] || 0, o));
      };
    for (const t of J.affixLevel) e(t.a, t.p[0]);
    for (const t in J.ge) e(J.ge[t].a, J.ge[t].p[0]);
    return n;
  })(),
  BASE_MAX = {};
function baseStat(n) {
  let e = 0;
  for (const [t, r, o] of n.base || []) (t === 28 || t === 29 || t === 30) && (e += (r + o) / 2);
  return e;
}
function baseMax(n) {
  const e = n.d + ":" + n.k;
  if (BASE_MAX[e] !== void 0) return BASE_MAX[e];
  const t = J.items[n.d];
  let r = 0;
  if (t) for (const o of t.list) o.k === n.k && (r = Math.max(r, baseStat(o)));
  return (BASE_MAX[e] = r);
}
function statScore(n) {
  let e = 0;
  for (const r of (n.mag || []).concat(n.ext || [])) {
    const o = attrName(r.a);
    if (typeof ATTR_NOEFFECT < "u" && ATTR_NOEFFECT.has(o)) continue;
    const u = ATTR_MAX[r.a],
      a = Math.abs((r.p || [])[0] || 0);
    e += u ? Math.min(1.5, a / u) : 0.3;
  }
  const t = baseMax(n);
  return (t > 0 && (e += (baseStat(n) / t) * enhMul(n)), e);
}
function itemValue(n) {
  if (n.d === 10) return Math.round(((n.price || 100) / 10) * (1 + (n.mag || []).length * 0.8));
  const e = n.set ? (n.set.kind === "platina" ? 2 * (1 + 0.3 * (n.plv || 0)) : 1) : n.vio ? 1.5 : 1;
  return Math.max(1, Math.round(VAL_K * Math.pow(statScore(n) + 0.05, VAL_EXP) * e * (1 + 0.15 * (n.enh || 0))));
}
function itemPower(n) {
  let e = n.lvl * 10;
  for (const [t, r, o] of (n.base || [])) (t === 28 || t === 29 || t === 30) && (e += (r + o) / 2);
  for (const t of n.mag.concat(n.ext || [])) {
    const r = attrName(t.a);
    (typeof ATTR_NOEFFECT < "u" && ATTR_NOEFFECT.has(r)) || (e += 15 + Math.min(200, Math.abs(t.p[0])) * 0.6);
  }
  return e * enhMul(n);
}
function slotFor(n) {
  if (n.d === 11 && (n.anim || n.expireAt || n.perm)) return "mask";
  if (n.d === 12) return "mask";
  const e = DETAIL_SLOT[n.d];
  return e === "ring"
    ? S.eq.ring1
      ? S.eq.ring2 && itemPower(S.eq.ring1) <= itemPower(S.eq.ring2)
        ? "ring1"
        : "ring2"
      : "ring1"
    : e;
}
function magText(n) {
  const e = attrName(n.a),
    t = n.p.map((o) => (o === -1 ? 0 : o));
  let r;
  return (
    (r = attrText(e, t).split("<enter>")[0]),
    typeof ATTR_NOEFFECT < "u" && ATTR_NOEFFECT.has(e) && (r += " · không tác dụng trong game"),
    r
  );
}
const REQ_NAME = {
  32: "requirestr",
  33: "requiredex",
  34: "requirevit",
  35: "requireeng",
  36: "requirelevel",
  37: "requireseries",
  38: "requiresex",
  39: "requiremenpai",
  46: "require_translife",
};
function reqLineOk(n, e) {
  return n === 36
    ? eqLevel() >= e
    : n === 32
      ? heroAttr("str") >= e
      : n === 33
        ? heroAttr("dex") >= e
        : n === 34
          ? heroAttr("vit") >= e
          : n === 35
            ? heroAttr("eng") >= e
            : n === 37
              ? e < 0 || !FAC[S.fac] || heroSeries() === e
              : n === 38
                ? e < 0 || (S.sex || 0) === e
                : n === 39
                  ? e < 0 || !FAC[S.fac] || FAC[S.fac].id === e
                  : n === 46
                    ? rebornN() >= e
                    : !0;
}
function reqLineText(n, e) {
  return n === 37
    ? "Thuộc tính ngũ hành: " + (SERIES[e] || e)
    : n === 38
      ? "Giới tính: " + (e ? "Nữ" : "Nam")
      : n === 39
        ? "Môn phái: " + ((J.factions.find((t) => t.id === e) || J.factions[e] || {}).n || e)
        : attrText(REQ_NAME[n], [e, 0, 0]);
}
function itemLines(n) {
  const e = [],
    t = enhMul(n),
    r = J.items[n.d] && J.items[n.d].list.find((s) => s.k === n.k && (s.lvl == null || s.lvl === n.lvl)),
    o = n.d === 10 ? 1 : enhLineMul(n),
    u = (s) =>
      o === 1 || attrName(s.a) === "allskill_v"
        ? magText(s)
        : magText(Object.assign({}, s, { p: s.p.map((i, f) => (i === -1 || f > 1 ? i : Math.round(i * o))) }));
  (n.s >= 0 && e.push(["b", "Ngũ hành thuộc tính: " + SERIES[n.s], SERIES_COL[n.s]]),
    r && r.d && e.push(["b in", r.d]));
  if (n.d === 12 || (n.d === 11 && (n.anim || n.expireAt || n.perm))) {
    if (n.perm) {
      e.push(["m", "Thời hạn: Vĩnh viễn", "#ffcc00"]);
    } else if (n.expireAt) {
      const left = n.expireAt - Date.now();
      if (left <= 0) {
        e.push(["rq", "Thời hạn: ĐÃ HẾT HẠN (không còn tác dụng)", "#ff4444"]);
      } else {
        const d = Math.floor(left / 86400000);
        const h = Math.floor((left % 86400000) / 3600000);
        const m = Math.floor((left % 3600000) / 60000);
        e.push(["m", `Thời hạn còn lại: ${d > 0 ? d + " ngày " : ""}${h} giờ ${m} phút`, "#44ff88"]);
      }
    }
  }
  const a = (s) => (n.d === 10 && typeof horseAdj == "function" ? horseAdj(n, s) : s);
  for (const [s, i, f] of (n.base || [])) {
    const d = attrName(s);
    if (d === "item_purple" || s === 167 || d === "staminamax_v") continue;
    if (d === "durability_v") {
      e.push(["b", `Độ bền ${f} / ${f}`]);
      continue;
    }
    const p = Math.round(s === 28 || s === 29 ? i * t : a(((i + f) / 2) * t));
    e.push(["b", attrText(d, [p, 0, p])]);
  }
  for (const [s, i] of (n.req || []))
    !REQ_NAME[s] ||
      ((s === 37 || s === 38 || s === 39) && i < 0) ||
      (s !== 37 && s !== 38 && s !== 39 && !(i > 0)) ||
      e.push([reqLineOk(s, i) ? "b" : "rq", reqLineText(s, i)]);

  if (n.ca) {
    const tier = (n.ca && n.ca.lvl) || 1;
    const cap = (typeof I0 !== "undefined" && I0.cap && I0.cap[tier]) || (tier >= 2 ? 15 : 10);
    const maxC = (n.ca && n.ca.max) || (typeof I0 !== "undefined" && I0.max && I0.max[tier]) || (tier >= 2 ? 32 : 12);
    e.push(["r", `Số lần khắc: ${n.ca.carve || 0}/${maxC}`]);
    (n.mag || []).forEach((s) => {
      e.push(["m", `${magText(s)} (${s.lv || 1}/${cap})`]);
    });
  } else {
    const l = n.d === 10 ? 3 : typeof hiddenActive == "function" ? hiddenActive(n) : 0;
    n.mag.forEach((s, i) => {
      const f = i % 2 === 0 || i >> 1 < l;
      e.push([f ? "m" : "h", u(s)]);
    });
  }

  const c = [];
  if (
    (n.plv && c.push(["h on", `Bạch Kim +${n.plv}: thuộc tính gốc +${Math.round(n.plv * PLAT_STEP * 100)}%`]),
    n.enh &&
      c.push([
        "h on",
        `Cường hóa +${n.enh}: thuộc tính gốc +${Math.round((t - 1) * 100)}%, các dòng thuộc tính +${Math.round((o - 1) * 100)}%`,
      ]),
    n.thanma && c.push(["r", "Thần mã: không phạt né tránh, thần lực luôn hiệu lực"]),
    n.d === 10 &&
      typeof horseLv == "function" &&
      c.push([
        "h on",
        `Thuần dưỡng cấp ${horseLv(n)}/${HORSE_MAX}: chỉ số ngựa +${Math.round(horseLv(n) * HORSE_UP * 100)}%, phạt né −${Math.min(100, Math.round(horseLv(n) * HORSE_PEN * 100))}%`,
      ]),
    Math.floor((n.mag || []).length / 2) && !n.leg && !n.ca && n.d !== 10 && n.d !== 11 && n.s >= 0 && typeof ACCRUE < "u")
  ) {
    const s = +Object.keys(ACCRUE).find((d) => ACCRUE[d] === n.s),
      i = slotOfEquipped(n, S.eq) || slotFor(n),
      f = typeof enoughToActive == "function" && enoughToActive(S.eq);
    (c.push(["r", `Kích hoạt thuộc tính ẩn:${n.set ? " (đủ bộ tự kích hết)" : ""}`]),
      c.push([f || heroSeries() === s ? "h on" : "h", `  Nhân vật: hệ ${SERIES[s]}`]));
    for (const d of ACTIVATED_BY[i] || [])
      c.push([f || (S.eq[d] && S.eq[d].s === s) ? "h on" : "h", `  ${SLOT_VI[d]}: hệ ${SERIES[s]}`]);
  }
  if (n.set) {
    const s = typeof goldEnhance == "function" ? goldEnhance(n, S.eq) : 0,
      i = (typeof setCounts == "function" && setCounts(S.eq)[n.set.grp]) || 0;
    ((n.ext || []).forEach((f, d) =>
      c.push([d < s ? "m" : "h", u(f) + (d < s ? "" : ` (mặc ${n.set.n1 * (d + 1)} món cùng bộ)`)]),
    ),
      c.push([
        "r",
        `Bộ ${n.set.kind === "gold" ? "Hoàng Kim" : "Bạch Kim"}: đang mặc ${i} món · đủ ${n.set.n2} món mở hết dòng ẩn mọi trang bị`,
      ]));
    for (const f of setMembers(n))
      c.push([
        "r",
        `  ${Object.values(S.eq).some((d) => d && d.set && bareName(d.n) === bareName(f.n)) ? "✔" : "·"} ${f.n}`,
      ]);
  }
  return (c.length && (e.push(["sep", ""]), e.push(...c)), e);
}
const GROUND_MAX = 40,
  PICK_R = 26,
  LOOT_ATTR_GROUPS = [
    ["Sinh lực", ["lifemax_v", "lifemax_p", "lifereplenish_v"]],
    ["Nội lực", ["manamax_v", "manamax_p", "manareplenish_v"]],
    [
      "Sát thương",
      [
        "addphysicsdamage_v",
        "addphysicsdamage_p",
        "addfiredamage_v",
        "addcolddamage_v",
        "addlightingdamage_v",
        "addpoisondamage_v",
      ],
    ],
    ["Kháng", ["physicsres_p", "poisonres_p", "coldres_p", "fireres_p", "lightingres_p", "allres_p"]],
    ["Chỉ số", ["strength_v", "dexterity_v", "vitality_v", "energy_v"]],
    ["Kỹ năng", ["allskill_v"]],
    ["Tốc độ", ["attackspeed_v", "castspeed_v", "fastwalkrun_p"]],
    ["Hút máu / nội", ["steallifeenhance_p", "stealmanaenhance_p"]],
    ["Chính xác / né", ["attackratingenhance_v", "adddefense_v"]],
    ["Sát thương nội công", ["metalskill_v", "earthskill_v", "woodskill_v", "waterskill_v", "fireskill_v"]],
  ],
  LOOT_SLOT_GROUPS = [
    ["weapon", "Vũ khí"],
    ["armor", "Áo"],
    ["helm", "Mũ"],
    ["belt", "Đai"],
    ["boot", "Giày"],
    ["cuff", "Hộ uyển"],
    ["amulet", "Dây chuyền"],
    ["ring", "Nhẫn"],
    ["pendant", "Ngọc bội"],
    ["horse", "Ngựa"],
  ],
  LOOT_DEF = () => ({
    mode: "smart",
    smartUp: !0,
    custom: !1,
    minRar: 1,
    minLvl: 1,
    groups: [],
    series: [],
    auto: !0,
    minMag: 0,
    slots: [],
    wear: !1,
    accrue: !1,
    facW: !1,
    keepRare: !0,
    keepVio: !0,
    keepPhoi: !0,
    setOnly: !1,
    setKeep: [],
    setMine: !1,
    pickAll: !0,
    ep: { white: !0, jew: !0, blue: !0, blueLv: 5, dest: "box" },
  }),
  SET_FAMILIES = [
    ["Thanh Câu", 50],
    ["Vân Lộc", 80],
    ["Môn phái", 99],
    ["Thương Lang", 100],
    ["Tống Kim", 120],
    ["Tử Mãng", 120],
    ["Kim Ô", 120],
    ["Bạch Hổ", 120],
    ["Xích Lân", 120],
    ["Minh Phượng", 120],
    ["Huyền Viên", 120],
    ["Tinh Sương", 120],
    ["Đằng Long", 180],
    ["Bộ chung", 0],
  ],
  SET_NAMED = SET_FAMILIES.filter(([n]) => !["Môn phái", "Tống Kim", "Bộ chung"].includes(n)),
  setFac = (n) => ((n.req || []).find((e) => e[0] === 39) || [0, -1])[1];
function setFamily(n) {
  if (!n || !n.set) return null;
  const e = bareName(n.n),
    t = SET_NAMED.find(([r]) => e.startsWith(r));
  return t ? t[0] : n.n.includes("Tống Kim") ? "Tống Kim" : setFac(n) >= 0 ? "Môn phái" : "Bộ chung";
}
const SET_GRP_NAME = {
  29: "Vô Danh",
  41: "Tuệ Thanh",
  42: "Vinh Diệu",
  44: "Càn Khôn",
  45: "Chấp Tử",
  46: "Minh Nguyệt",
  52: "Như Ý",
};
let LOOT_SETS = null,
  SET_GRP_KEY = null;
function lootSets() {
  if (LOOT_SETS) return LOOT_SETS;
  const n = new Map(),
    e = {};
  for (const r of J.sets.gold) {
    if (typeof setRowOk == "function" && !setRowOk(r)) continue;
    const o = (r.req.find((l) => l[0] === 36) || [0, 0])[1];
    if ((r.req.find((l) => l[0] === 39) || [0, -1])[1] >= 0) {
      e[r.grp] = o >= 120 ? "MP120" : "MP80";
      continue;
    }
    const a = n.get(r.grp) || { names: [], lv: 999 };
    (a.names.push(bareName(r.n)), (a.lv = Math.min(a.lv, o)), n.set(r.grp, a));
  }
  const t = [];
  for (const [r, o] of n) {
    const u = o.names.map((s) => s.split(" "));
    let a = 0;
    for (; u.every((s) => s[a] && s[a] === u[0][a]);) a++;
    const l = SET_GRP_NAME[r] || u[0].slice(0, Math.max(a, 2)).join(" "),
      c = "G:" + l;
    e[r] = c;
    const h = t.find((s) => s.k === c);
    h ? (h.lv = Math.min(h.lv, o.lv)) : t.push({ k: c, n: l, lv: o.lv });
  }
  return (
    t.sort((r, o) => r.lv - o.lv || r.n.localeCompare(o.n)),
    t.push({ k: "MP80", n: "Môn phái", lv: 80 }, { k: "MP120", n: "Môn phái", lv: 120 }),
    (SET_GRP_KEY = e),
    (LOOT_SETS = t),
    t
  );
}
function setGroupKey(n) {
  return !n || !n.set
    ? null
    : (lootSets(),
      SET_GRP_KEY[n.set.grp] ||
        (setFac(n) >= 0 ? (((n.req || []).find((e) => e[0] === 36) || [0, 0])[1] >= 120 ? "MP120" : "MP80") : null));
}
const setGroupName = (n) => {
  const e = lootSets().find((t) => t.k === n);
  return e ? e.n : n;
};
function setKept(n) {
  return !(!n || !n.set);
}
function lootFilter() {
  const n = S.lootF || (S.lootF = LOOT_DEF());
  if (n.setV !== 2) {
    const e = n.setKeep || [],
      t = lootSets(),
      r = [];
    (e.includes("Bộ chung") && t.filter((o) => o.k.startsWith("G:")).forEach((o) => r.push(o.k)),
      e.includes("Môn phái") && r.push("MP80", "MP120"),
      (n.setKeep = r),
      (n.setV = 2));
  }
  if (
    (n.mode === void 0 && (n.mode = "smart"),
    n.smartUp === void 0 &&
      ((n.smartUp = n.mode !== "custom"), (n.custom = n.mode === "custom"), n.mode !== "custom" && (n.keepRare = !0)),
    n.pickAll === void 0 || n.setKeep === void 0 || n.keepRare === void 0 || n.ep === void 0)
  ) {
    const e = LOOT_DEF();
    for (const t in e) n[t] === void 0 && (n[t] = e[t]);
    (S.epAuto === !1 && (n.ep.white = !1), S.epAutoJ === !1 && (n.ep.jew = !1), delete S.epAuto, delete S.epAutoJ);
  }
  if (n.keepVio === void 0) n.keepVio = !0;
  if (n.keepPhoi === void 0) n.keepPhoi = !0;
  return n;
}
let LF_KEY = null,
  LF_WANT = null;
function lootWant(n) {
  const e = n.groups.join(",");
  return (
    e !== LF_KEY &&
      ((LF_KEY = e),
      (LF_WANT = n.groups.length
        ? new Set(
            n.groups
              .flatMap((t) => (LOOT_ATTR_GROUPS[t] || [0, []])[1])
              .map((t) => ATTR_ID[t])
              .filter((t) => t !== void 0),
          )
        : null)),
    LF_WANT
  );
}
function isVioKept(n, lf) {
  if (!n || !n.vio) return !1;
  if (n.enh > 0) return !0;
  lf = lf || (typeof lootFilter == "function" ? lootFilter() : null);
  const isPhoi = !(n.mag || []).length;
  if (isPhoi) {
    return !lf || lf.keepPhoi !== false;
  }
  return !lf || lf.keepVio !== false;
}
if (typeof window !== "undefined") window.isVioKept = isVioKept;
const lootRare = (n) => {
  const lf = typeof lootFilter == "function" ? lootFilter() : null;
  const vioKept = isVioKept(n, lf);
  return !!((n.set && setKept(n)) || vioKept || n.plv || (n.d === 10 && (n.r >= 3 || n.rareH)));
};
function epWant(n) {
  const e = lootFilter().ep;
  return !e || typeof verVio != "function" || !verVio() || !n || n.set || n.vio || n.thanma || !(n.d >= 0 && n.d <= 9)
    ? ""
    : e.jew &&
        FUSE_SLOTS.includes(n.d) &&
        (n.r || 0) <= 2 &&
        !(typeof betterThanEquipped == "function" && betterThanEquipped(n))
      ? "jew"
      : e.white && (n.r || 0) === 0 && !(n.mag || []).length
        ? "white"
        : e.blue &&
            (n.r === 1 || n.r === 2) &&
            (n.mag || []).some((t) => oreRows(t.a).length && hutLevel(t) >= (e.blueLv || 1))
          ? "blue"
          : "";
}
let UG_KEY = "",
  UG = {},
  UG_BASE = 1;
function soonWearable(n) {
  if (!sexOk(n)) return !1;
  for (const [t, r] of n.req || [])
    if (
      (t === 36 && r > eqLevel() + 10) ||
      ((t === 37 || t === 39) && r >= 0 && FAC[S.fac] && (t === 37 ? heroSeries() !== r : FAC[S.fac].id !== r))
    )
      return !1;
  const e = FAC[S.fac];
  return !(DETAIL_SLOT[n.d] === "weapon" && e && !weaponFits(n));
}
function upgradeGain(n) {
  if (!n || !S.fac || !(n.d >= 0 && n.d <= 10)) return -1;
  const e =
    Object.values(S.eq)
      .map((r) => (r ? r.uid + "." + (r.enh || 0) + "." + (r.mag || []).length : 0))
      .join(",") +
    "|" +
    S.lvl +
    "|" +
    S.fac;
  if (e !== UG_KEY) {
    ((UG_KEY = e), (UG = {}));
    try {
      UG_BASE = Math.max(1, power(calc(S.eq)));
    } catch {
      UG_BASE = 1;
    }
  }
  if (n.uid in UG) return UG[n.uid];
  let t = -1;
  if (soonWearable(n))
    try {
      const r = Object.assign({}, S.eq);
      ((r[slotFor(n)] = n), (t = power(calc(r)) / UG_BASE - 1));
    } catch {
      t = -1;
    }
  return (UG[n.uid] = t);
}
const isUpgrade = (n) => upgradeGain(n) > 0.005,
  UGE = {};
function enhGain(n) {
  if (!n || !S.fac || !(n.d >= 0 && n.d <= 9)) return null;
  const e = S.eq[slotFor(n)],
    t = (e && e.enh) || 0;
  if (t <= (n.enh || 0)) return null;
  upgradeGain(n);
  const r = UG_KEY + "#" + n.uid;
  if (r in UGE) return UGE[r];
  let o = null;
  if (soonWearable(n))
    try {
      const u = Object.assign({}, n, { enh: t }),
        a = Object.assign({}, S.eq);
      a[slotFor(n)] = u;
      const l = power(calc(a)) / UG_BASE - 1;
      l > 0.005 && (o = { enh: t, gain: l });
    } catch {
      o = null;
    }
  return (UGE[r] = o);
}
const isPotential = (n) => !isUpgrade(n) && !!enhGain(n);
function lootMatch(n) {
  if (typeof dtNeed == "function" && dtNeed(n)) return !0;
  const e = lootFilter();
  if (n.set && !setKept(n)) return !1;
  if (n.vio && !isVioKept(n, e) && !(e.smartUp && (isUpgrade(n) || isPotential(n)))) return !1;
  if ((e.keepRare && lootRare(n)) || (e.smartUp && (isUpgrade(n) || isPotential(n)))) return !0;
  if (
    !e.custom ||
    n.r < e.minRar ||
    n.lvl < e.minLvl ||
    (n.mag || []).length < (e.minMag || 0) ||
    (e.series.length && !e.series.includes(n.s)) ||
    (e.slots.length && !e.slots.includes(DETAIL_SLOT[n.d]))
  )
    return !1;
  if (e.wear) {
    if (!sexOk(n)) return !1;
    for (const [r, o] of n.req || [])
      if (
        (r === 36 && o > eqLevel() + 5) ||
        ((r === 37 || r === 39) && o >= 0 && FAC[S.fac] && (r === 37 ? heroSeries() !== o : FAC[S.fac].id !== o))
      )
        return !1;
  }
  if (
    (e.accrue && n.s >= 0 && n.d !== 10 && FAC[S.fac] && !accrues(heroSeries(), n.s)) ||
    (e.facW && DETAIL_SLOT[n.d] === "weapon" && FAC[S.fac] && !weaponFits(n))
  )
    return !1;
  const t = lootWant(e);
  return !(t && !n.mag.some((r) => t.has(r.a)));
}
const LOOT_QUICK = [
  ["Mặc định", { smartUp: !0, custom: !1 }],
  ["Tím / Hoàng Kim", { smartUp: !0, custom: !0, minRar: 3 }],
  ["Hợp phái", { smartUp: !0, custom: !0, wear: !0, facW: !0, accrue: !0 }],
  ["Nhặt hết", { smartUp: !0, custom: !0, minRar: 0, minLvl: 1 }],
];
function lootPresets() {
  const n = S.lootP || (S.lootP = [null, null, null]);
  for (; n.length < 3;) n.push(null);
  return n;
}
function lootSavePreset(n) {
  const e = lootFilter();
  lootPresets()[n] = JSON.parse(JSON.stringify(e));
}
function lootLoadPreset(n) {
  const { auto: e, pickAll: t } = lootFilter();
  ((S.lootF = Object.assign(LOOT_DEF(), JSON.parse(JSON.stringify(n)), { auto: e, pickAll: t })), (LF_KEY = null));
}
function dropToGround(n, e) {
  const t = rnd(0, Math.PI * 2),
    r = rnd(10, 26),
    [o, u] = inWorld(e.x + Math.cos(t) * r, e.y + Math.sin(t) * r);
  if ((R.ground.push({ it: n, x: o, y: u, age: 0 }), R.ground.length > GROUND_MAX)) {
    let a = R.ground.findIndex((c) => !c.it.set && !isVioKept(c.it) && !c.it.plv);
    a < 0 && (a = 0);
    const l = R.ground.splice(a, 1)[0];
    S.gold += itemValue(l.it);
  }
  (R.quiet || uiSfx(n.d <= 1 ? "dropWeapon" : n.d === 2 || n.d === 7 ? "dropCloth" : "dropOther"),
    n.r >= 2 && !R.quiet && log(`Rơi xuống đất: <span style="color:${RAR_COL[n.r]}">${esc(n.n)}</span>`));
}
function makeRoom(n, e) {
  let t = null;
  for (const r of S.inv)
    !(r.set && setKept(r)) &&
      !isVioKept(r) &&
      !r.plv &&
      !r.lock &&
      !r.thanma &&
      !dtNeed(r) &&
      (!t || itemPower(r) < itemPower(t)) &&
      (t = r);
  return !t || (!e && itemPower(t) >= itemPower(n))
    ? !1
    : ((S.gold += itemValue(t)), S.inv.splice(S.inv.indexOf(t), 1), (invDirty = !0), !0);
}
const sellableByFilter = () =>
  S.inv.filter((n) => !lootMatch(n) && !sellProtected(n) && !Object.values(S.eq).includes(n));
function sellByFilter(n) {
  const e = sellableByFilter();
  if (!e.length) return 0;
  let t = 0;
  for (const r of e) t += itemValue(r);
  return (
    (S.gold += t),
    (S.inv = S.inv.filter((r) => !e.includes(r))),
    (invDirty = !0),
    !n &&
      !R.quiet &&
      log(`<span class="dim">Hành trang đầy: bán ${e.length} món không khớp bộ lọc (+${fmtL(t)} lượng)</span>`),
    e.length
  );
}
const LOOT_NEAR = 220;
function pickNearest() {
  let n = null,
    e = 600;
  for (const t of R.ground) {
    const r = Math.hypot(t.x - H.x, t.y - H.y);
    r < e && ((e = r), (n = t));
  }
  if (!n) {
    toast("Không có đồ gần để nhặt");
    return;
  }
  ((R.pickTarget = n), (R.moveTo = null));
}
function pickUp(n, e) {
  const t = R.ground.indexOf(n);
  return t < 0
    ? !1
    : ((S.inv.length >= INV_MAX || epBox().length >= EP_BOX_MAX) && typeof autoHut == "function" && autoHut(5),
      S.inv.length >= INV_MAX && lootFilter().pickAll && sellByFilter(),
      !(epWant(n.it) && lootFilter().ep.dest !== "inv" && !lootMatch(n.it)) &&
      S.inv.length >= INV_MAX &&
      !makeRoom(n.it, typeof dtNeed == "function" && dtNeed(n.it))
        ? (e || toast("Hành trang đầy"), !1)
        : (R.ground.splice(t, 1),
          addItem(n.it, e, !0, R.pickTarget === n),
          questTick("picked"),
          R.pickTarget === n && (R.pickTarget = null),
          !0));
}
function updateGround(n) {
  for (const o of R.ground) o.age += n;
  let e = R.pickTarget && R.ground.includes(R.pickTarget) ? R.pickTarget : null;
  const t = R.enemies.some((o) => !o.dead && (!o.home || o.aggro));
  if (!e && lootFilter().auto && !(typeof manual == "function" && manual())) {
    let o = null,
      u = 1e9;
    const a = lootFilter(),
      l = a.pickAll,
      c = S.inv.length >= INV_MAX && !(l && sellableByFilter().length),
      h = c ? Math.min(...S.inv.filter((s) => !s.set && !s.lock).map(itemPower), 1 / 0) : -1 / 0;
    for (const s of R.ground) {
      if (
        s.age < 0.4 ||
        (t && Math.hypot(s.x - H.x, s.y - H.y) > LOOT_NEAR) ||
        !(l || lootMatch(s.it) || epWant(s.it)) ||
        (c && itemPower(s.it) <= h && !dtNeed(s.it))
      )
        continue;
      const i = Math.hypot(s.x - H.x, s.y - H.y);
      i < u && ((u = i), (o = s));
    }
    e = o;
  }
  return e
    ? Math.hypot(e.x - H.x, e.y - H.y) <= PICK_R
      ? (pickUp(e, !0), !0)
      : (typeof heroCasting == "function" && heroCasting()) || (obsSteer(H, e.x, e.y, 170 * curSpeed() * n), (H.face = e.x >= H.x ? 1 : -1), !0)
    : !1;
}
function groundAt(n, e) {
  let t = null,
    r = 30;
  for (const o of R.ground) {
    const u = Math.hypot(o.x - n, o.y - (e + 6));
    u < r && ((r = u), (t = o));
  }
  return t;
}
function saveGround() {
  // saved in old crop space so saves stay valid whichever map data (full JMAP / JMO crop) is loaded
  const o = typeof JXM < "u" ? JXM.off : { x: 0, y: 0 };
  S.ground = R.ground.map((n) => ({ it: n.it, wx: n.x - o.x, wy: n.y - o.y }));
}
function restoreGround() {
  R.ground = (S.ground || [])
    .filter((n) => n && n.it)
    .map((n) => {
      const [e, t] = inWorld(n.wx ?? WORLD.w / 2, n.wy ?? WORLD.h / 2);
      return { it: n.it, x: e, y: t, age: 1 };
    });
}
