"use strict";
const SAVE_V = 1,
  OFFLINE_MAX = 28800,
  SLOT_N = 3,
  SLOT_PTR = "jxidle_slot";
let SLOT = 0,
  SAVE_LOCK = !1;
const slotKey = (n) => (n === 0 ? "jxidle" : "jxidle_" + (n + 1)),
  saveKey = () => slotKey(SLOT);
let S;
const FEMALE_FAC = ["emei", "cuiyan"];
function newSave() {
  return {
    v: 1,
    name: "Tân thủ",
    fac: null,
    sex: 0,
    lvl: 1,
    xp: 0,
    gold: 0,
    attrPts: 0,
    attr: { str: 0, dex: 0, vit: 0, eng: 0 },
    skPts: 1,
    sk: {},
    lx: {},
    main: 0,
    eq: {},
    inv: [],
    stage: 1,
    maxStage: 1,
    wave: 1,
    uid: 1,
    autoSell: 0,
    kps: 0.2,
    totalKills: 0,
    autoEquip: !0,
    autoPts: !1,
    diff: 1,
    autoForge: !0,
    autoBuy: !0,
    tut: 0,
    hints: {},
    bakAt: 0,
    potOff: !1,
    potUsed: 0,
    potStock: { life: {}, mana: {} },
    ctrl: "auto",
    joy: "fixed",
    slots: [0, 0, 0, 0],
    snd: { on: !0, vol: 0.7, music: !0, mvol: 0.4 },
    lootF: { minRar: 1, minLvl: 1, groups: [], series: [], auto: !0 },
    ground: [],
    mats: { ht: {}, ore: {}, shard: {}, misc: {} },
    last: Date.now(),
  };
}
const SAVE_SALT = "jx-idle-v1:";
function sigOf(n) {
  let e = 3735928559,
    a = 1103547991;
  const s = SAVE_SALT + n;
  for (let t = 0; t < s.length; t++) {
    const o = s.charCodeAt(t);
    ((e = Math.imul(e ^ o, 2654435761)), (a = Math.imul(a ^ o, 1597334677)));
  }
  return (
    (e = Math.imul(e ^ (e >>> 16), 2246822507) ^ Math.imul(a ^ (a >>> 13), 3266489909)),
    (a = Math.imul(a ^ (a >>> 16), 2246822507) ^ Math.imul(e ^ (e >>> 13), 3266489909)),
    (4294967296 * (2097151 & a) + (e >>> 0)).toString(36)
  );
}
function pack(n) {
  // never serialize S while a disciple is swapped in (js/party.js)
  if (n === S && typeof PCTX < "u" && PCTX) return withMain(() => pack(n));
  const e = JSON.stringify(n);
  return JSON.stringify({ d: e, h: sigOf(e) });
}
function unpack(n) {
  const e = JSON.parse(n);
  return e && typeof e.d == "string" && typeof e.h == "string"
    ? { state: JSON.parse(e.d), ok: sigOf(e.d) === e.h }
    : { state: e, ok: !0, legacy: !0 };
}
function save() {
  if (typeof pDefer == "function" && pDefer("save", save)) return;
  if (!(SAVE_LOCK || !S || !S.fac)) {
    ((S.last = Date.now()), typeof saveGround == "function" && R.ground && saveGround());
    try {
      const n = saveKey(),
        e = localStorage.getItem(n);
      if (e)
        try {
          unpack(e).ok && localStorage.setItem(n + "_bak", e);
        } catch {}
      (localStorage.setItem(n, pack(S)), localStorage.setItem(SLOT_PTR, String(SLOT)));
    } catch {}
    typeof syncRankFirebase == "function" && syncRankFirebase();
  }
}
function vioDedupe(n) {
  if (!n || !n.vio || !Array.isArray(n.mag)) return !1;
  const e = new Set(),
    a = n.mag.length;
  return (
    (n.mag = n.mag.filter((s) => s && !e.has(s.a) && e.add(s.a))),
    n.mag.forEach((s, t) => {
      s.pre = t % 2 === 0 ? 1 : 0;
    }),
    n.mag.length < a
  );
}
function migrate(n) {
  typeof init120Skills == "function" && init120Skills();
  const e = Object.assign(newSave(), n);
  ((e.attr = Object.assign({ str: 0, dex: 0, vit: 0, eng: 0 }, n.attr || {})),
    e.mig73 || ((e.mig73 = 1), (e.autoForge = !0)),
    e.fac && !FAC[e.fac] && (e.fac = null));
  for (const t in e.sk) {
    if (!SK[t] && !((t >= 708 && t <= 717) || (t >= 1055 && t <= 1114))) delete e.sk[t];
  }
  if (!e.sk9Free) {
    e.sk9Free = 1;
    for (const t in e.sk)
      SK[t] &&
        SK[t].tier === 90 &&
        !(typeof isBr90 == "function" && isBr90(t)) &&
        e.sk[t] > 0 &&
        (e.skPts = (e.skPts || 0) + 1);
  }
  ((e.stage = clamp(e.stage | 0 || 1, 1, STAGES + 400)),
    delete e.push,
    (e.snd = Object.assign({ on: !0, vol: 0.7, music: !0, mvol: 0.4 }, n.snd && "vol" in n.snd ? n.snd : {})),
    (e.lootF = Object.assign({ minRar: 1, minLvl: 1, groups: [], series: [], auto: !0 }, n.lootF || {})),
    n.autoSell && !n.lootF && (e.lootF.minRar = n.autoSell));
  for (const t of e.inv.concat(
    Object.values(e.eq),
    (e.ground || []).map((o) => o && o.it),
  ))
    t && (t.mag || []).some((o) => o.pre === void 0) && (t.leg = !0);
  for (const t of e.inv.concat(Object.values(e.eq), e.epBox || [])) vioDedupe(t);
  // the monster pet ("Đồng hành") was replaced by the disciples (js/party.js): refund it as gold, once
  if (e.rw && e.rw.pet) {
    const t = e.rw.pet,
      o = clamp(t.lvl | 0, 1, 999),
      r = Math.round(2e3 * o * (1 + o / 10));
    ((e.gold = (Number.isFinite(+e.gold) ? +e.gold : 0) + r), (e.petGold = [o, r]), delete e.rw.pet);
  }
  (n.autoPtsOff || ((e.autoPts = !1), (e.autoPtsOff = 1)),
    (e.mats = {
      ht: Object.assign({}, (n.mats || {}).ht),
      ore: Object.assign({}, (n.mats || {}).ore),
      shard: Object.assign({}, (n.mats || {}).shard),
      misc: Object.assign({}, (n.mats || {}).misc),
    }),
    (e.rw = n.rw && typeof n.rw == "object" ? n.rw : {}),
    // Thu hồi danh hiệu Võ Lâm Minh Chủ cũ từ ANDYTRAN (chỉ ai nhập giftcode mới VLMC mới được sở hữu)
    ((!e.gc || !e.gc.VLMC) && e.rw && (e.rw.titles && delete e.rw.titles.vlmc, e.rw.title === "vlmc" && (e.rw.title = ""))),
    (e.gc && e.gc.ANDYTRAN && delete e.gc.ANDYTRAN),
    (e.lx = n.lx && typeof n.lx == "object" ? n.lx : (e.lx || {})),
    (e.lvl = clamp(Math.floor(+e.lvl) || 1, 1, e.rw && e.rw.stat && e.rw.stat.reborn >= 5 ? 9999 : 200)),
    (e.xp = Math.max(0, +e.xp || 0)),
    (e.gold = Number.isFinite(+e.gold) ? Math.max(0, +e.gold) : 0),
    (e.skPts = Math.max(0, Math.floor(+e.skPts) || 0)),
    (e.attrPts = Math.max(0, Math.floor(+e.attrPts) || 0)),
    (e.inv = (Array.isArray(e.inv) ? e.inv : [])
      .filter((t) => t && typeof t == "object" && Array.isArray(t.base) && Array.isArray(t.mag))
      .slice(0, INV_MAX)));
  // Cập nhật mặt nạ (d === 11) sang danh sách model người và icon mới nhất
  const maskList = (typeof J !== "undefined" && J.items && J.items[11] && J.items[11].list) || [];
  if (maskList.length) {
    const updateMask = (it) => {
      if (!it || it.d !== 11) return;
      const def = maskList.find((m) => m.k === it.k) || maskList[0];
      if (def) {
        it.n = def.n;
        it.anim = def.anim;
        it.ic = def.ic;
        if (def.perm) it.perm = true;
      }
    };
    if (Array.isArray(e.inv)) e.inv.forEach(updateMask);
    if (e.eq && e.eq.mask) updateMask(e.eq.mask);
    if (Array.isArray(e.stash)) e.stash.forEach(updateMask);
  }
  // disciples (js/party.js): sanitize their sheets; their worn items and bags count for uid uniqueness
  e.party =
    Array.isArray(n.party) && typeof partySanitize == "function"
      ? n.party
          .map((t) => partySanitize(t, e))
          .filter(Boolean)
          .slice(0, PARTY_MAX - 1)
      : Array.isArray(n.party)
        ? n.party
        : void 0;
  let a = 0;
  for (const t of e.inv.concat(
    Object.values(e.eq || {}),
    e.stable || [],
    (e.party || []).flatMap((o) => Object.values((o && o.eq) || {}).concat((o && o.inv) || [])),
  ))
    t && t.uid > a && (a = t.uid);
  e.uid = Math.max(+e.uid || 1, a + 1);
  {
    const t = new Set(
      Object.values(e.eq || {})
        .concat((e.party || []).flatMap((o) => Object.values((o && o.eq) || {})))
        .map((o) => o && o.uid),
    );
    e.inv = e.inv.filter((o) => (t.has(o.uid) && (o.uid = e.uid++), t.add(o.uid), !0));
    // each disciple has its own bag (js/party.js): uids stay unique across every bag
    for (const o of e.party || []) for (const r of (o && o.inv) || []) (t.has(r.uid) && (r.uid = e.uid++), t.add(r.uid));
  }
  ((e.diff = [0, 1, 2].includes(+n.diff) ? +n.diff : 1),
    (e.hints = n.hints && typeof n.hints == "object" ? n.hints : {}),
    e.fac && !n.sexSet && (e.sex = FEMALE_FAC.includes(e.fac) ? 1 : 0),
    e.fac && (e.sexSet = 1));
  const s = (t) => e.eq[t] && !sexReqOkFor(e.eq[t], e.sex);
  for (const t of Object.keys(e.eq || {}))
    !e.eq[t] || typeof e.eq[t] != "object"
      ? delete e.eq[t]
      : s(t) && (e.inv.length < INV_MAX && e.inv.push(e.eq[t]), delete e.eq[t]);
  for (const t of e.inv.concat(
    Object.values(e.eq || {}),
    (e.ground || []).map((o) => o && o.it),
  ))
    t && t.set && /[\u3400-\u9fff]/.test(t.n) && (t.n = setNameVi(t.n));
  {
    const t = e.inv.length + Object.keys(e.eq || {}).length + (e.ground || []).length;
    e.inv = e.inv.filter((r) => !setNoData(r));
    for (const r of Object.keys(e.eq || {})) setNoData(e.eq[r]) && delete e.eq[r];
    e.ground = (e.ground || []).filter((r) => !(r && setNoData(r.it)));
    const o = t - (e.inv.length + Object.keys(e.eq || {}).length + e.ground.length);
    o > 0 && (window.SET_PURGED = window.SET_PURGED || []).push(o);
    for (const r of e.inv.concat(
      Object.values(e.eq || {}),
      e.ground.map((l) => l && l.it),
    ))
      setRepair(r);
  }
  for (const t of e.inv.concat(
    Object.values(e.eq || {}),
    (e.ground || []).map((o) => o && o.it),
  ))
    t && t.set && t.set.kind === "platina" && !/^\[/.test(t.n) && (t.n = "[Bạch Kim] " + t.n);
  for (const t in e.sk) SK[t] && SK[t].book && ((e.bkOk || (e.bkOk = {}))[t] = 1);
  for (const t of e.inv.concat(Object.values(e.eq || {})))
    t && t.d === 10 && t.r === 3 && !t.vio && ((t.r = 2), (t.rareH = 1));
  for (const t of e.inv.concat(Object.values(e.eq || {}), e.epBox || []))
    t && t.r === 2 && !t.rareH && t.d !== 10 && (t.r = (t.mag || []).length ? 1 : 0);
  if (!e.sk9m) {
    e.skL = e.skL || {};
    for (const o in e.sk) {
      const r = SK[o];
      r &&
        r.tier === 90 &&
        e.sk[o] > 0 &&
        ((e.skL[o] = { lv: e.sk[o], xp: 0 }), (e.skPts = (e.skPts || 0) + e.sk[o] - 1));
    }
    const t = (e.lvl || 1) + REB_EQ_LV * ((e.rw && e.rw.stat && e.rw.stat.reborn) || 0);
    for (const o in e.sk) {
      const r = SK[o];
      if (!r || r.tier === 90) continue;
      const l = Math.max(1, Math.min(r.max, t - r.req + 1));
      e.sk[o] > l && ((e.skPts = (e.skPts || 0) + e.sk[o] - l), (e.sk[o] = l));
    }
    e.sk9m = 1;
  }
  if (!e.eqRebuild && typeof eqRemoved == "function") {
    let t = 0,
      o = 0;
    const r = e.lvl || 1,
      l = (i) => {
        let c = typeof itemValue == "function" ? itemValue(i) : 0;
        for (let f = 0; f < (i.enh || 0); f++)
          c +=
            (0.2 * (1e3 + (i.lvl || 0) * 1e3 + (i.r || 0) * 2e3) * Math.pow(1.8, f) * (1 + r / 10)) /
            Math.max(0.35, 1 - 0.07 * f);
        return c;
      },
      u = (i) => (eqRemoved(i) ? ((t += l(i)), o++, !1) : !0);
    ((e.inv = (e.inv || []).filter(u)), (e.epBox = (e.epBox || []).filter(u)));
    for (const i in e.eq || {}) e.eq[i] && !u(e.eq[i]) && delete e.eq[i];
    if (e.mats && e.mats.shard && typeof shardRows < "u")
      for (const i in e.mats.shard) {
        const c = shardRows.get(i);
        (!c || !setRowOk(c)) && delete e.mats.shard[i];
      }
    ((t = Math.min(5e8, Math.round(t))),
      t > 0 && (e.gold = (e.gold || 0) + t),
      o && (e.eqRebuildMsg = [o, t]),
      (e.eqRebuild = 1));
  }
  if (!e.horseEnhFix) {
    let t = 0;
    for (const o of (e.inv || []).concat(Object.values(e.eq || {}), e.epBox || [], e.stable || []))
      if (!(!o || o.d !== 10 || !(o.enh > 0))) {
        for (let r = 0; r < o.enh; r++)
          t +=
            ((1e3 + (o.lvl || 0) * 1e3 + (o.r || 0) * 2e3) * Math.pow(1.8, r) * (1 + (e.lvl || 1) / 10)) /
            Math.max(0.35, 1 - 0.07 * r);
        delete o.enh;
      }
    ((t = Math.round(t)), t > 0 && ((e.gold = (e.gold || 0) + t), (e.horseEnhBack = t)), (e.horseEnhFix = 1));
  }
  if (typeof eqBanned == "function") {
    let t = 0;
    const o = (r) => (eqBanned(r) ? (t++, !1) : !0);
    ((e.inv = (e.inv || []).filter(o)),
      (e.epBox = (e.epBox || []).filter(o)),
      Array.isArray(e.stable) && (e.stable = e.stable.filter(o)));
    for (const r in e.eq || {}) e.eq[r] && !o(e.eq[r]) && delete e.eq[r];
    if (e.mats && e.mats.shard) for (const r in e.mats.shard) setBanned(r) && delete e.mats.shard[r];
    t && (e.banMsg = t);
  }
  for (const o of (e.inv || []).concat(Object.values(e.eq || {}), e.epBox || [], e.stable || [])) {
    if (o && o.d === 10 && (o.n === "Sư tử" || o.k === 22)) {
      if (o.gift || o.noHc || (o.req && o.req.some((r) => r[0] === 36 && r[1] === 1))) {
        o.gift = 1;
        o.noHc = 1;
        o.req = [[36, 1]];
        o.base = [[111, 50, 50]];
        o.mag = [];
      } else {
        o.req = [[36, 150]];
      }
    }
  }
  return ((e.v = 1), e);
}
function slotInfo(n) {
  try {
    const e = localStorage.getItem(slotKey(n));
    if (!e) return null;
    let a;
    try {
      a = unpack(e);
    } catch {
      a = null;
    }
    if (!a || !a.ok) {
      const t = localStorage.getItem(slotKey(n) + "_bak");
      try {
        a = t && unpack(t);
      } catch {
        a = null;
      }
    }
    const s = a && a.state;
    return !s || !s.fac
      ? null
      : {
          fac: s.fac,
          lvl: s.lvl | 0 || 1,
          stage: s.stage | 0 || 1,
          last: s.last || 0,
          name: s.name || "",
          sex: s.sex | 0,
        };
  } catch {
    return null;
  }
}
function pickSlot() {
  let n = null;
  try {
    n = localStorage.getItem(SLOT_PTR);
  } catch {}
  const e = [...Array(3).keys()].filter((s) => slotInfo(s));
  if (n === "menu") return { slot: e[0] ?? 0, menu: e.length > 0 };
  const a = +n;
  return n !== null && Number.isInteger(a) && a >= 0 && a < 3
    ? { slot: a, menu: !1 }
    : e.length > 1
      ? { slot: e[0], menu: !0 }
      : { slot: e[0] ?? 0, menu: !1 };
}
async function deleteSlot(n) {
  if (typeof netOn == "function" && netOn() && NET.user)
    try {
      await netCall((e) => e.del("/api/saves/" + n));
    } catch (e) {
      toast("Không xóa được trên đám mây: " + e.message);
      return;
    }
  SAVE_LOCK = !0;
  try {
    (localStorage.removeItem(slotKey(n)),
      localStorage.removeItem(slotKey(n) + "_bak"),
      localStorage.setItem(SLOT_PTR, "menu"));
  } catch {}
  location.reload();
}
async function switchCharacter() {
  if ((save(), typeof netOn == "function" && netOn() && NET.user && S && S.fac))
    try {
      await netUpload();
    } catch {}
  SAVE_LOCK = !0;
  try {
    localStorage.setItem(SLOT_PTR, "menu");
  } catch {}
  location.reload();
}
function load() {
  try {
    const n = localStorage.getItem(saveKey());
    if (n) {
      let e = unpack(n);
      if (!e.ok) {
        const a = localStorage.getItem(saveKey() + "_bak");
        let s = null;
        try {
          s = a && unpack(a);
        } catch {}
        (s && s.ok ? (e = s) : (e.state.tampered = 1), (window.__tampered = !0));
      }
      return ((S = migrate(e.state)), !0);
    }
  } catch (n) {
    console.warn("Khong doc duoc file luu, tao moi", n);
  }
  return ((S = newSave()), !1);
}
function saveFileText() {
  return (
    save(),
    JSON.stringify({ game: "jxidle", v: 1, exported: Date.now(), fac: S.fac, lvl: S.lvl, data: pack(S) })
  );
}
function saveFileName() {
  const n = new Date(),
    e = (a) => String(a).padStart(2, "0");
  return `jxidle_${S.fac}_cap${S.lvl}_${n.getFullYear()}${e(n.getMonth() + 1)}${e(n.getDate())}_${e(n.getHours())}${e(n.getMinutes())}.jxsave`;
}
function downloadSaveFile() {
  if (!S.fac) return !1;
  const n = new Blob([saveFileText()], { type: "application/json" }),
    e = document.createElement("a");
  return (
    (S.bakAt = Date.now()),
    save(),
    (e.href = URL.createObjectURL(n)),
    (e.download = saveFileName()),
    document.body.appendChild(e),
    e.click(),
    setTimeout(() => {
      (URL.revokeObjectURL(e.href), e.remove());
    }, 1500),
    !0
  );
}
function parseSaveText(n) {
  if (
    ((n = String(n || "")
      .trim()
      .replace(/^\uFEFF/, "")),
    !n)
  )
    throw new Error("File rỗng");
  let e;
  if (n[0] === "{") {
    const t = JSON.parse(n);
    if (t && t.game === "jxidle" && typeof t.data == "string") e = t.data;
    else if (t && typeof t.d == "string" && typeof t.h == "string") e = n;
    else throw new Error("Không phải file lưu của game");
  } else e = decodeURIComponent(escape(atob(n)));
  const a = unpack(e);
  if (!a.ok) throw new Error("File đã bị chỉnh sửa (sai chữ ký)");
  const s = a.state;
  if (!s || typeof s != "object" || !s.fac || !FAC[s.fac] || !("lvl" in s))
    throw new Error("File không có nhân vật hợp lệ");
  return s;
}
function writeSlot(n, e) {
  const a = migrate(e);
  ((a.last = Date.now()), (SAVE_LOCK = !0));
  try {
    const s = slotKey(n),
      t = localStorage.getItem(s);
    (t && localStorage.setItem(s + "_bak", t),
      localStorage.setItem(s, pack(a)),
      localStorage.setItem(SLOT_PTR, String(n)));
  } catch {
    throw ((SAVE_LOCK = !1), new Error("Không ghi được (bộ nhớ trình duyệt đầy hoặc bị chặn)"));
  }
  return a;
}
function exportSave() {
  return (save(), btoa(unescape(encodeURIComponent(pack(S)))));
}
function importSave(n) {
  const e = unpack(decodeURIComponent(escape(atob(n.trim()))));
  if (!e.ok) throw new Error("Mã đã bị chỉnh sửa");
  const a = e.state;
  if (!a || typeof a != "object" || !("lvl" in a)) throw new Error("Mã không hợp lệ");
  ((S = migrate(a)), save(), (R.dirty = !0));
}
const OFFLINE_FULL = 8 * 3600,
  OFFLINE_TAIL = 1,
  OFFLINE_RATE = 0.7,
  OFFLINE_DAY_MAX = 12 * 3600;
function offlineGains() {
  const n = Date.now(),
    e = (n - S.last) / 1e3;
  if (!(e >= 60) || !S.fac) return null;
  const a = (S.offDay = S.offDay && n - S.offDay.t0 < 864e5 && S.offDay.t0 <= n ? S.offDay : { t0: n, secs: 0 }),
    s = Math.min(28800, e, Math.max(0, OFFLINE_DAY_MAX - a.secs));
  if (s < 60) return null;
  a.secs += s;
  const t = s,
    o = Math.min(t, OFFLINE_FULL) + OFFLINE_TAIL * Math.max(0, t - OFFLINE_FULL),
    r = Math.floor(o * clamp(S.kps || 0.1, 0.02, 3) * OFFLINE_RATE);
  if (!r) return null;
  const l = stageLevel(S.stage),
    u = S.lvl,
    // EXP of the offline kills for the character in S (the main, or a disciple swapped in: js/party.js)
    xf = () =>
      expFor(Math.min(l, S.lvl + expCfg("over", XP_OVER))) *
      r *
      xpPenK(l - S.lvl) *
      xpMonK(l) *
      DENS_REW * expCfg("offlineMul", 1) * xpZoneK(),
    i = xf(),
    c = moneyDrop({ L: l, cls: "normal" }) * r * monRewK(l) * hpRatio(l) * DENS_REW;
  (gainXp(i * newbieXp()),
    (S.gold += c),
    l >= sk9MinL() && sk9Cfg("offline", !0) && sk9Gain(r * sk9Cfg("normal", 1), !0, R.P && R.P.main ? { [R.P.main.id]: 1 } : null));
  // every disciple gets the full EXP too, at its own level
  if (typeof partyN == "function")
    for (let k = 1; k <= partyN(); k++)
      (typeof pActive != "function" || pActive(k)) &&
      withChar(k, () => {
        (R.P || recalc(), gainXp(xf() * newbieXp()), l >= sk9MinL() && sk9Cfg("offline", !0) && sk9Gain(r * sk9Cfg("normal", 1), !0, R.P && R.P.main ? { [R.P.main.id]: 1 } : null));
      });
  let f = 0,
    d = 0;
  const g = Math.min(30, Math.floor(r * 0.08 * DENS_REW));
  for (let m = 0; m < g; m++) {
    const h = rollDrops({ L: l, cls: Math.random() < 0.15 ? "elite" : "normal", bonusDrop: 1 })[0];
    h && (addItem(h, !0) ? f++ : d++);
  }
  (autoEquipAll(), typeof autoFuse == "function" && autoFuse(), sweepJunk(), autoBuyWeapon(), autoForge());
  const p = offlineChests(t);
  return { secs: t, kills: r, xp: i, gold: c, lv0: u, lv1: S.lvl, got: f, sold: d, chests: p };
}
