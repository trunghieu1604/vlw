"use strict";
const dayKey = (t) => `${t.getFullYear()}-${t.getMonth() + 1}-${t.getDate()}`,
  today = () => dayKey(new Date()),
  GB_EVERY = 1800,
  GB_RETRY = 300,
  REBORN_LV = 200,
  REBORN_MAX = 20,
  FD_COST = 10;
function RW() {
  const t = S.rw || (S.rw = {});
  return (
    (t.stat = Object.assign(
      { kills: 0, bosses: 0, goldBoss: 0, picked: 0, towerBest: 0, reborn: 0, chests: 0, tokens: 0 },
      t.stat || {},
    )),
    (t.login = Object.assign({ last: "", streak: 0, total: 0, got: {}, claimed: !0 }, t.login || {})),
    (t.ach = t.ach || {}),
    (t.title = t.title || ""),
    (t.fd = t.fd || 0),
    t.gbT == null && (t.gbT = 1800),
    t
  );
}
const potTierNow = (t) => {
    let n = t || 1;
    for (let o = 1; o < POT_TIER_LV.length; o++) S.lvl >= POT_TIER_LV[o] && (n = Math.max(n, o));
    return n;
  },
  buffTxt = (t, n, o) =>
    t === "luck"
      ? `Quế Hoa Tửu +${n} may mắn trong ${o} phút`
      : `${BUFF_VI[t]} +${Math.round(n * 100)}% trong ${o} phút`;
function grant(t, n) {
  const o = [];
  if (t.gold) {
    const s = Math.round(t.gold * (1 + S.lvl / 10));
    ((S.gold += s), o.push(`${fmtL(s)} lượng`));
  }
  if (t.pot) {
    const s = potTierNow(t.pot.tier),
      i = potStock(t.pot.kind),
      e = J.potions.find((c) => c.kind === t.pot.kind && c.tier === s);
    ((i[s] = (i[s] || 0) + t.pot.n), o.push(`${t.pot.n} ${e ? e.n : "bình thuốc"}`));
  }
  if (t.ht) {
    const s = clamp(Math.floor(S.lvl / 15) + 1, 1, HT_MAX);
    (matAdd("ht", s, t.ht), o.push(`${t.ht} Huyền Tinh cấp ${s}`));
  }
  if (
    (t.fd && ((RW().fd += t.fd), o.push(`${t.fd} Phúc Duyên`)),
    t.knb && ((S.knb = (S.knb || 0) + t.knb), o.push(`${t.knb} Kim Nguyên Bảo`)),
    t.item)
  ) {
    const s = (() => {
      const i = irnd(0, 9);
      return makeItem(i, sexPart(i, 0), clamp(Math.round(S.lvl / 12) + 1, 1, 10), t.item);
    })();
    s && (addItem(s, !0, !0, !0), o.push(esc(s.n)));
  }
  if (t.set && !t.common && goldMul("grant") < 1 && Math.random() >= goldMul("grant") * HK_GRANT_K) {
    const s = clamp(Math.floor(S.lvl / 15) + 1, 1, HT_MAX);
    (matAdd("ht", s, 2), o.push(`2 Huyền Tinh cấp ${s}`));
  } else if (t.set) {
    const s = forceSetItem(t.common);
    s && (addItem(s, !0, !0, !0), o.push(`<b style="color:${RAR_COL[s.r]}">${esc(s.n)}</b>`));
  }
  if ((t.pts && ((S.attrPts += t.pts), o.push(`${t.pts} điểm tiềm năng`)), t.buff))
    for (const s in t.buff) {
      const [i, e] = t.buff[s];
      (addBuff(s, i, e), o.push(buffTxt(s, i, e)));
    }
  if ((t.skp && ((S.skPts = (S.skPts || 0) + t.skp), o.push(`${t.skp} điểm kỹ năng`)), t.xp && S.lvl < levelCap())) {
    const s = S.lvl;
    (gainXp((J.exp[S.lvl - 1] * t.xp * expCfg("questMul", 1) * xpSlow(S.lvl)) / xpDrag()),
      o.push(S.lvl > s ? `kinh nghiệm (lên cấp ${S.lvl})` : `${Math.round(t.xp * 1e3) / 10}% kinh nghiệm`));
  }
  if (t.misc)
    for (const s in t.misc)
      t.misc[s] > 0 &&
        (matAdd("misc", s, t.misc[s]), o.push(`<b style="color:#ffd24a">${t.misc[s]} ${miscName(s)}</b>`));
  return (o.length && !R.batch && (log(`🎁 ${esc(n)}: ${o.join(", ")}`), R.quiet || uiSfx("learn"), save()), o);
}
const EVENT_GOLD = /^(An Bang|Định Quốc|Hiệp Cốt|Nhu Tình|Kim Phong|Thiên Hoàng|Động Sát)/i;
function forceSetItem(t, n) {
  const o = FAC[S.fac] ? FAC[S.fac].id : -1,
    s = S.lvl + 15,
    i = (l, h) => (l.req.find((f) => f[0] === h) || [0, -1])[1],
    e = J.sets.gold.filter((l) => sexReqOk(l.req) && setRowOk(l) && setVerOk(l, S.lvl));
  if (t) {
    const l = J.sets.gold.filter((a) => sexReqOk(a.req) && setRowOk(a) && i(a, 39) < 0 && EVENT_GOLD.test(a.n)),
      h = l.filter((a) => i(a, 36) <= s && setVerOk(a, S.lvl)),
      f = l.filter((a) => i(a, 36) <= s),
      r = h.length ? h : f.length ? f : l;
    return r.length ? makeSetItem("gold", pick(r), 5) : null;
  }
  if (!n && Math.random() >= HKMP_GRANT) {
    const l = e.filter((h) => i(h, 39) < 0 && i(h, 36) <= s);
    if (l.length) return makeSetItem("gold", pick(l), 5);
  }
  let c = e.filter((l) => i(l, 39) === o && i(l, 36) <= s);
  return (
    c.length || (c = e.filter((l) => i(l, 36) <= s)),
    c.length || (c = e.filter((l) => i(l, 39) === o)),
    c.length ? makeSetItem("gold", pick(c), 5) : null
  );
}
const LOGIN7 = [
    { gold: 500, knb: 1 },
    { pot: { kind: "life", tier: 1, n: 20 } },
    { gold: 1e3, fd: 10, knb: 1 },
    { pot: { kind: "mana", tier: 1, n: 20 }, ht: 2 },
    { item: 5, ht: 2 },
    { gold: 2e3, fd: 15, knb: 2 },
    { set: 1, fd: 30, knb: 5 },
  ],
  LOGIN30 = {
    10: { gold: 5e3, pts: 10, knb: 10 },
    20: { set: 1, pts: 20, knb: 15 },
    30: { set: 1, fd: 80, pts: 30, knb: 25 },
  };
function loginCheck() {
  if (!S || !S.fac) return;
  const t = RW().login,
    n = today();
  if (t.last === n) return;
  const o = new Date();
  (o.setDate(o.getDate() - 1),
    (t.streak = t.last === dayKey(o) ? t.streak + 1 : 1),
    (t.last = n),
    t.total++,
    (t.claimed = !1),
    RW().dq && delete RW().dq,
    dotGift());
}
function claimLogin() {
  const t = RW().login;
  if (t.claimed) return;
  ((t.claimed = !0), grant(LOGIN7[(t.streak - 1) % 7], `Điểm danh ngày ${t.streak}`));
  const n = LOGIN30[t.total];
  (n && !t.got[t.total] && ((t.got[t.total] = 1), grant(n, `Điểm danh ${t.total} ngày`)), achCheck());
}
const LV_MS = [
    [10, { gold: 500, pot: { kind: "life", tier: 1, n: 20 }, knb: 2 }, "Mở khóa: tháp thử thách"],
    [20, { gold: 1e3, pot: { kind: "mana", tier: 1, n: 20 }, fd: 10, knb: 2 }, "Mở khóa: đồ đệ dùng chung rương đồ"],
    [30, { item: 5, fd: 10, ht: 2, knb: 3 }, ""],
    [40, { gold: 2500, pot: { kind: "life", tier: 1, n: 20 }, pts: 3, ht: 2, knb: 3 }, ""],
    [50, { item: 6, fd: 15, ht: 3, knb: 5 }, "Danh hiệu «Thiếu hiệp»"],
    [60, { gold: 5e3, pot: { kind: "mana", tier: 1, n: 20 }, pts: 3, ht: 3, knb: 5 }, ""],
    [70, { set: 1, fd: 20, ht: 3, knb: 5 }, ""],
    [80, { gold: 8e3, pot: { kind: "life", tier: 1, n: 20 }, pts: 4, ht: 4, knb: 6 }, ""],
    [90, { item: 6, fd: 20, ht: 4, knb: 10, buff: { xp: [0.3, 30] } }, ""],
    [95, { set: 1, fd: 25, pts: 5, ht: 4, knb: 6 }, "Danh hiệu «Đại hiệp»"],
    [97, { gold: 15e3, pot: { kind: "both", tier: 1, n: 20 }, fd: 20, knb: 6 }, ""],
    [99, { set: 1, fd: 30, pts: 5, ht: 5, knb: 8 }, "Danh hiệu «Tông sư»"],
    [110, { fd: 30, ht: 5, knb: 8, buff: { xp: [0.5, 30] } }, ""],
    [120, { set: 1, fd: 30, pts: 5, ht: 5, knb: 8, buff: { drop: [0.5, 30] } }, ""],
    [135, { item: 6, fd: 40, ht: 6, knb: 10, buff: { xp: [0.5, 45] } }, ""],
    [150, { set: 1, fd: 50, pts: 8, ht: 6, knb: 12, buff: { xp: [1, 30] } }, ""],
    [165, { fd: 50, ht: 6, knb: 10, buff: { drop: [1, 30] } }, ""],
    [180, { set: 1, fd: 60, pts: 10, ht: 8, knb: 12, buff: { xp: [1, 45] } }, ""],
    [190, { set: 1, fd: 60, ht: 8, knb: 12, buff: { drop: [1, 45] } }, ""],
    [
      200,
      { set: 1, fd: 100, pts: 15, ht: 10, knb: 25, buff: { xp: [1, 60], drop: [1, 60] } },
      "Cấp tối đa · mở khóa chuyển sinh",
    ],
  ],
  LV_MS_RB = [
    [10, { fd: 15, knb: 3, buff: { xp: [0.5, 30] } }, ""],
    [30, { item: 6, fd: 15, ht: 3, knb: 4, buff: { drop: [0.5, 30] } }, ""],
    [50, { set: 1, fd: 20, ht: 4, knb: 6, buff: { xp: [0.5, 45] } }, ""],
    [80, { fd: 25, ht: 5, knb: 6, buff: { xp: [1, 30] } }, ""],
    [100, { set: 1, pts: 5, ht: 6, knb: 8, buff: { drop: [1, 30] } }, ""],
    [130, { set: 1, fd: 40, ht: 6, knb: 8, buff: { xp: [1, 45] } }, ""],
    [160, { set: 1, fd: 50, pts: 8, ht: 8, knb: 10, buff: { xp: [1, 45], drop: [1, 45] } }, ""],
    [
      200,
      { set: 1, fd: 100, pts: 15, ht: 10, knb: 20, buff: { xp: [1.5, 60], drop: [1, 60] } },
      "Mở khóa chuyển sinh lần sau",
    ],
  ],
  lvMsList = () => (rebornN() ? LV_MS_RB : LV_MS),
  lvKey = (t) => (rebornN() ? rebornN() + ":" + t : t),
  TOWER_LV = 10,
  unlocked = (t) => S.lvl >= t || RW().stat.reborn > 0;
function lvMsReady() {
  const t = RW().lvGot || {};
  return lvMsList().filter(([n]) => S.lvl >= n && !t[lvKey(n)]);
}
function claimLvMs(t) {
  const n = RW(),
    o = lvMsList().find((s) => s[0] === t);
  ((n.lvGot = n.lvGot || {}),
    !(!o || S.lvl < t || n.lvGot[lvKey(t)]) &&
      ((n.lvGot[lvKey(t)] = 1),
      grant(o[1], `Mốc cấp ${t}${rebornN() ? ` (chuyển sinh ${rebornN()})` : ""}`),
      achCheck(),
      refreshGift()));
}
const BUFF_VI = { xp: "Kinh nghiệm", drop: "Tỉ lệ rơi đồ", tt: "Tiên Thảo Lộ", luck: "May mắn" },
  BUFF_IC = { xp: "⏫", drop: "🎲", tt: "🌿", luck: "🍶" },
  BUF = () => S.buf || (S.buf = {});
function buffP(t) {
  const n = S && S.buf && S.buf[t];
  return n && n.until > Date.now() ? n.p : 0;
}
function addBuff(t, n, o) {
  const s = BUF(),
    i = Date.now(),
    e = s[t];
  e && e.until > i
    ? (s[t] = n >= e.p ? { p: n, until: e.until + o * 6e4 } : { p: e.p, until: e.until + (o * 6e4 * n) / e.p })
    : (s[t] = { p: n, until: i + o * 6e4 });
}
function buffText() {
  const t = Date.now(),
    n = [];
  for (const o in BUFF_VI) {
    const s = S.buf && S.buf[o];
    if (!s || s.until <= t) continue;
    const i = Math.round((s.until - t) / 1e3);
    n.push(
      `${BUFF_IC[o]} ${BUFF_VI[o]} +${o === "luck" ? Math.round(s.p) : Math.round(s.p * 100) + "%"} <small class="dim">${Math.floor(i / 60)}:${String(i % 60).padStart(2, "0")}</small>`,
    );
  }
  return n.join(" · ");
}
function questTick(t, n = 1) {
  S && S.fac && t === "picked" && (RW().stat.picked += n);
}
const ACH = [
  ["lv30", "Xuất sơn", () => S.lvl >= 30 || RW().stat.reborn > 0, { gold: 1e3, knb: 2 }, ["lifemax_p", 3]],
  ["lv50", "Thiếu hiệp", () => (RW().lvGot || {})[50], { fd: 10, knb: 3 }, ["lifemax_p", 4]],
  [
    "lv80",
    "Danh chấn giang hồ",
    () => S.lvl >= 80 || RW().stat.reborn > 0,
    { gold: 5e3, pts: 10, knb: 5 },
    ["attackspeed_v", 3],
  ],
  ["lv100", "Đại hiệp", () => (RW().lvGot || {})[95] || (RW().lvGot || {})[100], { fd: 20, knb: 5 }, ["allres_p", 4]],
  ["lv150", "Tông sư", () => (RW().lvGot || {})[99] || (RW().lvGot || {})[150], { fd: 30, knb: 8 }, ["allres_p", 6]],
  ["k1000", "Sát thủ", () => RW().stat.kills >= 1e3, { fd: 10, knb: 2 }, ["manamax_p", 4]],
  ["k10000", "Vạn nhân địch", () => RW().stat.kills >= 1e4, { set: 1, knb: 5 }, ["attackspeed_v", 5]],
  ["b50", "Diệt trùm", () => RW().stat.bosses >= 50, { fd: 20, ht: 3, knb: 3 }, ["allres_p", 3]],
  ["zone8", "Nửa giang sơn", () => S.maxStage >= STAGES / 2, { gold: 8e3, knb: 3 }, ["fastwalkrun_p", 5]],
  ["zone16", "Trường Bạch sơn chủ", () => S.maxStage > STAGES, { set: 1, pts: 20, knb: 10 }, ["lifemax_p", 6]],
  ["setfull", "Hoàng Kim đủ bộ", () => enoughToActive(S.eq), { fd: 30, knb: 10 }, ["allres_p", 5]],
  ["tower20", "Leo tháp tầng 20", () => RW().stat.towerBest >= 20, { set: 1, knb: 5 }, ["attackspeed_v", 6]],
  ["reborn1", "Chuyển sinh", () => RW().stat.reborn >= 1, { fd: 50, knb: 20 }, ["lifemax_p", 8]],
  ["gold5", "Săn trùm Hoàng Kim", () => RW().stat.goldBoss >= 5, { fd: 20, ht: 4, knb: 8 }, ["lucky_v", 10]],
  ["login30", "Giang hồ lão luyện", () => RW().login.total >= 30, { set: 1, knb: 10 }, ["manamax_p", 6]],
];
function achCheck() {
  if (!S || !S.fac) return;
  const t = RW();
  for (const [n, o, s, i] of ACH)
    !t.ach[n] && s() && ((t.ach[n] = 1), grant(i, `Thành tựu «${o}»`), R.quiet || toast(`Thành tựu: ${o}`), dotGift());
  typeof titleCheck == "function" && titleCheck();
}
function goldBossTick(t) {
  S.fac && !R.town && !R.tower && !R.dg && (RW().gbT -= t);
}
function goldBossDue() {
  return !R.tower && !R.dg && RW().gbT <= 0;
}
function spawnGoldBoss() {
  const t = zoneOf(Math.min(S.stage, STAGES)),
    n = Math.min(stageLevel(S.stage), S.lvl) + 2,
    [o, s] = inWorld(H.x + 240, H.y - 120),
    i = makeEnemy(t.boss, n, "boss", o, s);
  ((i.hp = i.max = i.max * 2),
    (i.dmg *= 1.15),
    (i.goldBoss = !0),
    (i.n = "Trùm Hoàng Kim · " + bossName(t.boss, t.n)),
    R.enemies.push(i),
    (RW().gbT = 1800),
    (R.banner = { t: 2.5, text: "Trùm Hoàng Kim xuất hiện!", sub: "Hạ để nhận đồ Hoàng Kim" }),
    log('<b style="color:#ffb52e">Trùm Hoàng Kim xuất hiện!</b>'));
}
function offlineChests(t) {
  let n = 0;
  return (
    t >= 3600 && (grant({ gold: 500, pot: { kind: "life", tier: 2, n: 5 } }, "Tu luyện 1 giờ"), n++),
    t >= 4 * 3600 && (grant({ gold: 1500, fd: 10 }, "Tu luyện 4 giờ"), n++),
    t >= 8 * 3600 - 60 && (grant({ set: 1, fd: 20 }, "Tu luyện 8 giờ"), n++),
    n
  );
}
function towerStart() {
  if (R.dg) {
    toast("Đang ở phó bản");
    return;
  }
  (R.town && backFromTown(),
    (R.tower = { floor: Math.max(1, RW().stat.towerBest - 4) }),
    (R.enemies = []),
    (R.corpses = []),
    (R.spawnT = 0.5),
    (R.banner = { t: 2, text: `Tháp thử thách · tầng ${R.tower.floor}`, sub: "Gục ngã là rời tháp" }),
    closeModal(!0));
}
const towerLevel = (t) => Math.min(BASE_CAP, 10 + t * 4);
function towerSpawn() {
  const t = R.tower.floor,
    n = towerLevel(t),
    o = ZONES[Math.min(ZONES.length - 1, Math.floor(t / 3))],
    s = t % 5 === 0;
  ((R.enemies = []), (R.stall = 0));
  const i = s ? 1 : 3 + (t % 3);
  for (let e = 0; e < i; e++) {
    const [c, l] = inWorld(H.x + rnd(-260, 260), H.y + rnd(-220, 220));
    R.enemies.push(makeEnemy(s ? o.boss : pick(o.m), n, s ? "boss" : "elite", c, l));
  }
}
function towerCleared() {
  const t = RW(),
    n = R.tower.floor;
  (n > t.stat.towerBest &&
    ((t.stat.towerBest = n), grant(n % 5 === 0 ? { set: 1, fd: 10 } : { gold: 200 * n, fd: 2 }, `Tháp tầng ${n}`)),
    questTick("tower"),
    achCheck(),
    heal(R.P.life * 0.3, !0),
    (R.mana = Math.min(R.P.mana, R.mana + R.P.mana * 0.3)),
    R.tower.floor++,
    (R.spawnT = 1.5),
    (R.banner = { t: 1.5, text: `Tầng ${R.tower.floor}`, sub: `Quái cấp ${towerLevel(R.tower.floor)}` }));
}
function towerExit(t) {
  R.tower &&
    (log(`${t ? "Gục ở" : "Rời"} tháp thử thách tầng ${R.tower.floor}. Kỷ lục: ${RW().stat.towerBest}`),
    (R.tower = null),
    (R.enemies = []),
    (S.wave = 1),
    (R.spawnT = 0.5),
    (R.zoneShown = null));
}
const REB_HP = 0.25,
  REB_DMG = 0.15,
  REB_ATTR = 5,
  REB_SK = 1;
function rebornHard() {
  const t = (S && S.rw && S.rw.stat && S.rw.stat.reborn) || 0;
  return { hp: 1 + REB_HP * t, dmg: 1 + REB_DMG * t };
}
function rebornBonus() {
  const t = (S && S.rw && S.rw.stat && S.rw.stat.reborn) || 0;
  const xpPen = (typeof S < "u" && S && S.lvl < 200) ? 0 : Math.max(-0.5, -0.05 * t);
  return { xp: xpPen, dmg: 0.1 * t };
}
function doReborn() {
  const t = RW();
  if (
    S.lvl < 200 ||
    t.stat.reborn >= REBORN_MAX ||
    !confirm(
      "Chuyển sinh: về cấp 1, giữ trang bị. Toàn bộ điểm tiềm năng và kỹ năng cũ bị tẩy (giữ nguyên võ công 90 đã luyện), nhận điểm thưởng chuyển sinh. Quái mạnh hơn. Tiếp tục?",
    )
  )
    return;
  t.stat.reborn++;
  const n = t.stat.reborn,
    o = FAC[S.fac].starter,
    s = S.bkOk || (S.bkOk = {});
  for (const e in S.sk) SK[e] && SK[e].book && (s[e] = 1);
  ((S.lvl = 1), (S.xp = 0), (S.attr = { str: 0, dex: 0, vit: 0, eng: 0 }), (S.attrPts = REB_ATTR));
  const i = {};
  for (const e in S.sk) {
    if (!SK[e] || S.sk[e] <= 0) continue;
    if (SK[e].tier === 90 && !(typeof isBr90 == "function" && isBr90(e))) {
      i[e] = S.sk[e];
    } else if (typeof skIsExp == "function" && skIsExp(e)) {
      i[e] = S.sk[e];
    }
  }
  ((S.sk = Object.assign({}, i)),
    (S.skPts = REB_SK),
    typeof syncExpSkills == "function" && syncExpSkills(),
    o && ((S.sk[o] = 1), (S.main = o)),
    (S.mainLock = !1),
    (S.slots = [0, 0, 0, 0]),
    // a disciple's reborn (js/party.js) keeps the party's map
    typeof PCTX < "u" && PCTX
      ? (R.dirty = !0)
      : ((S.stage = 1), (S.wave = 1), (R.tower = null), (R.enemies = []), (R.dirty = !0), (R.zoneShown = null)),
    log(
      `<b class="up">Chuyển sinh lần ${n}!</b> Tẩy toàn bộ điểm cũ (giữ võ công 90, 120, 150${
        Object.keys(i).length
          ? ": " +
            Object.keys(i)
              .map((e) => SK[e].n + " " + i[e])
              .join(", ")
          : ""
      }), nhận ${REB_ATTR} tiềm năng + ${REB_SK} điểm kỹ năng · −${n * 10}% kinh nghiệm, +${n * 10}% sát thương · quái +${Math.round(REB_HP * n * 100)}% máu, +${Math.round(REB_DMG * n * 100)}% sát thương`,
    ),
    S.autoPts === !0
      ? (autoSpendAttrs(), autoSpendSkills())
      : gearReqPlan().total && toast("Bấm Gợi ý ở thẻ Nhân vật: cộng đủ điểm cho bộ đồ đang mặc"),
    typeof fillSlots == "function" && (fillSlots(), renderPad()),
    achCheck(),
    closeModal(!0),
    refresh(),
    save());
}
function eventNow() {
  const t = new Date().getMonth() + 1;
  return t === 1 || t === 2
    ? { n: "Tết Nguyên Đán", token: "Bánh Chưng", col: "#ff5a4a" }
    : t === 9 || t === 10
      ? { n: "Tết Trung Thu", token: "Bánh Trung Thu", col: "#ffd24a" }
      : t === 12
        ? { n: "Giáng Sinh", token: "Chuông Bạc", col: "#9fe3ff" }
        : { n: "Hội Võ Lâm", token: "Lệnh Bài Võ Lâm", col: "#c8a2ff" };
}
const EVENT_SHOP = [
  [10, { gold: 2e3 }],
  [15, { knb: 2 }],
  [20, { pot: { kind: "both", tier: 1, n: 20 } }],
  [25, { ht: 3 }],
  [30, { item: 6 }],
  [40, { fd: 30 }],
  [50, { knb: 8 }],
  [60, { set: 1, common: 1 }],
];
function eventBuy(t) {
  const [n, o] = EVENT_SHOP[t],
    s = RW().stat;
  if (s.tokens < n) {
    toast(`Cần ${n} ${eventNow().token}`);
    return;
  }
  ((s.tokens -= n), grant(o, eventNow().n), refreshGift());
}
const FD_TABLE = [
    [40, { gold: 2e3 }],
    [22, { knb: 1 }],
    [8, { buff: { tt: [0.5, 30] } }],
    [15, { buff: { luck: [20, 30] } }],
    [10, { pts: 5 }],
    [4, { skp: 1 }],
    [1, { set: 1, common: 1 }],
  ],
  HK_GRANT_K = 0.35;
function openChestMany(t) {
  const n = RW();
  if (((t = Math.min(t, Math.floor(n.fd / 10))), t < 1)) {
    toast("Cần 10 điểm Phúc Duyên");
    return;
  }
  if (t === 1) {
    openChest();
    return;
  }
  const o = S.gold,
    s = {},
    i = [],
    e = S.inv.length;
  R.batch = !0;
  try {
    for (let r = 0; r < t; r++) {
      ((n.fd -= 10), n.stat.chests++);
      for (const a of grant(wpick(FD_TABLE, (u) => u[0])[1], "Rương Phúc Duyên")) {
        if (/lượng$/.test(a)) continue;
        const u = a.match(/^(.+?) \+\S+(?: may mắn)? trong (\d+) phút$/);
        if (u) {
          const p = u[1] + " (phút)";
          s[p] = (s[p] || 0) + +u[2];
          continue;
        }
        if (/^<b|^[^\d]/.test(a) && !/^\d+ (Kim Sáng|Ngưng Thần|Phúc Duyên|điểm)/.test(a)) {
          i.push(a);
          continue;
        }
        const d = a.match(/^(\d+) (.+)$/);
        d ? (s[d[2]] = (s[d[2]] || 0) + +d[1]) : (s[a] = (s[a] || 0) + 1);
      }
    }
  } finally {
    R.batch = !1;
  }
  const c = S.gold - o,
    l = i.filter((r) => r.startsWith("<b")),
    h = [c > 0 ? `${fmtL(c)} lượng` : ""].concat(Object.entries(s).map(([r, a]) => `${a} ${r}`)).filter(Boolean);
  (i.length && h.push(`${i.length} món đồ${l.length ? ` (${l.length} Hoàng Kim)` : ""}`),
    log(`🎁 Mở ${t} rương Phúc Duyên: ${h.join(", ")}${l.length ? " · " + l.join(", ") : ""}`),
    uiSfx("learn"),
    achCheck(),
    save(),
    refreshGift());
  const f = i.length - (S.inv.length - e);
  modal(
    `<h3>Mở ${t} rương Phúc Duyên</h3><div class="card stats">${c > 0 ? `<span>Ngân lượng</span><span>+${fmtL(c)}</span>` : ""}${Object.entries(
      s,
    )
      .map(([r, a]) => `<span>${esc(r)}</span><span>+${a}</span>`)
      .join("")}<span>Trang bị</span><span>${i.length}${l.length ? ` (${l.length} Hoàng Kim)` : ""}</span></div>
    ${i.length ? `<div class="sl">${i.map((r) => `<div>${r}</div>`).join("")}</div>` : ""}${f > 0 ? `<p class="dim small">${f} món không vào được hành trang (đầy hoặc đồ thừa) đã được bán.</p>` : ""}
    <p class="desc">Còn ${n.fd} Phúc Duyên.</p><div class="btnrow"><button class="btn" id="cBack">Quay lại</button></div>`,
    () => {
      $("#cBack").onclick = () => {
        ((giftTab = "chest"), giftModal());
      };
    },
  );
}
function openChest() {
  const t = RW();
  if (t.fd < 10) {
    toast("Cần 10 điểm Phúc Duyên");
    return;
  }
  ((t.fd -= 10), t.stat.chests++);
  const n = grant(wpick(FD_TABLE, (o) => o[0])[1], "Rương Phúc Duyên");
  (toast("Rương Phúc Duyên: " + n.join(", ").replace(/<[^>]+>/g, "")), refreshGift());
}
function rwOnKill(t) {
  if (!S.fac) return;
  const n = RW();
  if (
    (n.stat.kills++,
    questTick("kills"),
    t.cls === "boss" && (n.stat.bosses++, questTick("bosses")),
    t.goldBoss && (n.stat.goldBoss++, grant({ set: 1, fd: 10 }, "Hạ Trùm Hoàng Kim")),
    Math.random() < dropCfg("event", 0.05))
  ) {
    n.stat.tokens++;
    const o = eventNow();
    addText(t.x, t.y - 50, "+1 " + o.token, o.col, 11);
  }
  (n.stat.kills % 25 === 0 || t.cls === "boss") && achCheck();
}
function giftCounts() {
  const t = RW(),
    n = t.stat.tokens || 0;
  return {
    login: t.login.claimed ? 0 : 1,
    lvms: lvMsReady().length,
    chest: Math.floor(t.fd / 10),
    event: EVENT_SHOP.filter(([o]) => n >= o).length,
  };
}
function giftPending() {
  if (!S || !S.fac) return !1;
  const t = RW();
  return Object.values(giftCounts()).some((n) => n > 0);
}
function dotGift() {
  const t = $("#giftBtn");
  t && t.classList.toggle("on", giftPending());
  const b = $("#bGiftSys");
  b && b.classList.toggle("on", giftPending());
}
let giftTab = "login";
function refreshGift() {
  (!$("#modal").classList.contains("hidden") && $("#giftTabs") && giftModal(), dotGift());
}
function giftText(t) {
  const n = [];
  if ((t.gold && n.push(`${fmtL(t.gold * (1 + S.lvl / 10))} lượng`), t.pot)) {
    const o = J.potions.find((s) => s.kind === t.pot.kind && s.tier === potTierNow(t.pot.tier));
    n.push(`${t.pot.n} ${o ? o.n : "bình thuốc"}`);
  }
  if (
    (t.ht && n.push(`${t.ht} Huyền Tinh cấp ${clamp(Math.floor(S.lvl / 15) + 1, 1, HT_MAX)}`),
    t.fd && n.push(`${t.fd} Phúc Duyên`),
    t.knb &&
      n.push(
        `<img src="img/ep/knb.png" alt="" style="height:13px;vertical-align:middle;image-rendering:pixelated"> ${t.knb} Kim Nguyên Bảo`,
      ),
    t.item && n.push(`đồ ${t.item} dòng`),
    t.set &&
      n.push(
        t.common
          ? "đồ Hoàng Kim dùng chung (Kim Phong, An Bang, Định Quốc…)"
          : "phôi Tím + Huyền Tinh (hiếm: đồ Hoàng Kim)",
      ),
    t.pts && n.push(`${t.pts} tiềm năng`),
    t.buff)
  )
    for (const o in t.buff) n.push(buffTxt(o, t.buff[o][0], t.buff[o][1]).replace(" trong ", " "));
  if ((t.skp && n.push(`${t.skp} điểm kỹ năng`), t.misc)) for (const o in t.misc) n.push(`${t.misc[o]} ${miscName(o)}`);
  return n.join(", ");
}
function giftBody(t) {
  if (giftTab === "login") {
    const n = t.login,
      o = (((n.streak - 1) % 7) + 7) % 7;
    return `<p class="desc">Chuỗi ${n.streak} ngày · tổng ${n.total} ngày. Mốc 10 / 20 / 30 ngày có quà lớn.</p>
      <div class="days">${LOGIN7.map((s, i) => `<div class="day${i < o || (i === o && n.claimed) ? " got" : ""}${i === o ? " cur" : ""}"><b>Ngày ${i + 1}</b><small>${giftText(s)}</small></div>`).join("")}</div>
      <div class="btnrow"><button class="btn" id="gLogin" ${n.claimed ? "disabled" : ""}>${n.claimed ? "Đã nhận hôm nay" : "Nhận quà hôm nay"}</button></div>`;
  }
  if (giftTab === "lvms") {
    const n = t.lvGot || {},
      o = rebornN();
    return `<p class="desc">${o ? `Mốc cấp vòng chuyển sinh ${o}: nhận lại mỗi lần chuyển sinh, chủ yếu hiệu ứng tăng kinh nghiệm / rơi đồ để lên lại cấp 200 nhanh hơn.` : "Quà mốc cấp: nhận một lần. Từ cấp 90 có thêm hiệu ứng tăng kinh nghiệm / tỉ lệ rơi đồ trong một số phút."} Hiệu ứng nhận thêm khi đang còn sẽ cộng dồn thời gian.</p>${lvMsReady().length > 1 ? `<div class="btnrow"><button class="btn on" id="gLvAll">Nhận tất cả (${lvMsReady().length})</button></div>` : ""}${buffText() ? `<div class="card">${buffText()}</div>` : ""}${lvMsList()
      .map(
        ([s, i, e]) =>
          `<div class="qrow${S.lvl >= s ? "" : " lock"}"><span><b>Cấp ${s}</b><small>${giftText(i)}${e ? " · " + e : ""}</small></span><small></small><button class="btn sm" data-lv="${s}" ${S.lvl >= s && !n[lvKey(s)] ? "" : "disabled"}>${n[lvKey(s)] ? "Đã nhận" : "Nhận"}</button></div>`,
      )
      .join("")}`;
  }
  if (giftTab === "ach")
    return `<p class="desc">Đạt <b>${ACH.filter((n) => t.ach[n[0]]).length}/${ACH.length}</b> · thưởng tự nhận khi hoàn thành. Danh hiệu: thẻ Nhân vật → 🎖 Danh hiệu.</p>${[
      ...ACH,
    ]
      .sort((n, o) => !!t.ach[o[0]] - !!t.ach[n[0]])
      .map(
        ([n, o, , s, i]) =>
          `<div class="qrow${t.ach[n] ? "" : " lock"}"><span><b>${o}</b><small>${giftText(s)}</small></span><small>${t.ach[n] ? "✓" : ""}</small></div>`,
      )
      .join("")}`;
  if (giftTab === "chest")
    return `<p class="desc">Điểm Phúc Duyên: <b>${t.fd}</b> (điểm danh, nhiệm vụ, thành tựu, trùm). Mỗi lần mở: 10 điểm.</p>
      <div class="chips">${FD_TABLE.map(([n, o]) => `<span class="chip2">${giftText(o)} · ${n}%</span>`).join("")}</div>
      <div class="btnrow"><button class="btn" id="gChest" ${t.fd >= 10 ? "" : "disabled"}>Mở ×1</button><button class="btn" data-ch="10" ${t.fd >= 100 ? "" : "disabled"}>Mở ×10</button><button class="btn" data-ch="100" ${t.fd >= 1e3 ? "" : "disabled"}>Mở ×100</button><button class="btn" data-ch="999999" ${t.fd >= 20 ? "" : "disabled"}>Mở hết (${Math.floor(t.fd / 10)})</button></div>`;
  if (giftTab === "event") {
    const n = eventNow();
    return `<p class="desc">Sự kiện: <b style="color:${n.col}">${n.n}</b>. Quái rơi ${n.token} (5%). Đang có: <b>${t.stat.tokens}</b>.</p>${EVENT_SHOP.map(([o, s], i) => `<div class="qrow"><span>${giftText(s)}</span><small>${o} ${n.token}</small><button class="btn sm" data-e="${i}" ${t.stat.tokens >= o ? "" : "disabled"}>Đổi</button></div>`).join("")}`;
  }
  if (giftTab === "giftcode") {
    return `<p class="desc">Nhập mã Giftcode để nhận phần thưởng trực tiếp vào <b>Hành trang</b>.</p>
      <div class="btnrow"><input id="gcIn" maxlength="32" placeholder="NHẬP MÃ VÀO ĐÂY" style="flex:1;text-transform:uppercase;padding:6px 10px;background:#0d1411;border:1px solid #3d6052;color:#ffe9b0;user-select:text;-webkit-user-select:text;cursor:text" autocomplete="off"><button class="btn on" id="gcOk">Nhận quà</button></div>
      <div id="gcMsg" class="small" style="min-height:1.5em;margin-top:8px"></div>`;
  }
  return "";
}
function towerBody(t = RW()) {
  return `<p class="desc">Mỗi tầng một đợt tinh anh; tầng chia hết cho 5 là trùm (lần đầu qua được đồ Hoàng Kim). Quái cấp 10 + 4 × tầng. Gục ngã là rời tháp.</p>
      <p>Kỷ lục: <b>tầng ${t.stat.towerBest}</b>${R.tower ? ` · đang ở tầng ${R.tower.floor}` : ""}</p>
      <div class="btnrow">${R.tower ? '<button class="btn red" id="gTowerOut">Rời tháp</button>' : unlocked(TOWER_LV) ? `<button class="btn" id="gTower">Vào tháp (từ tầng ${Math.max(1, t.stat.towerBest - 4)})</button>` : `<button class="btn" disabled>Cần cấp ${TOWER_LV}</button>`}</div>`;
}
function rebornBody(t = RW()) {
  const n = rebornBonus(),
    o = t.stat.reborn >= REBORN_MAX;
  return `<p class="desc">Đạt cấp 200: về cấp 1, giữ trang bị; <b>mỗi lần chuyển sinh +${REB_EQ_LV} cấp khi xét yêu cầu trang bị</b> (vd cấp 10 chuyển sinh 1 = cấp ${10 + REB_EQ_LV}: mặc được mọi trang bị); võ công 90 học không cần Mật Tịch; mỗi lần +10% tỉ lệ rơi đồ; mốc cấp nhận lại mỗi vòng; tẩy toàn bộ điểm tiềm năng và kỹ năng cũ, nhận cố định <b>${REB_ATTR} điểm tiềm năng + ${REB_SK} điểm kỹ năng</b>; mỗi lần quái mạnh thêm (+25% máu, +15% sát thương), +10% sát thương nhưng <b>kinh nghiệm nhận được −10%</b> mỗi lần (tối đa ${REBORN_MAX} lần).</p>
      <p>Đã chuyển sinh: <b>${t.stat.reborn}</b> lần · hiện ${n.xp === 0 ? "100% kinh nghiệm (dưới cấp 200 không phạt)" : `${Math.round((1 + n.xp) * 100)}% kinh nghiệm (${Math.round(n.xp * 100)}%)`}, +${Math.round(n.dmg * 100)}% sát thương, kháng tối đa ${PLAYER_RES_MAX + REBORN_RES * t.stat.reborn}% (+${REBORN_RES}% mỗi lần, vô hiệu khi đánh Boss Thế Giới) · độ khó: quái ×${rebornHard().hp.toFixed(2)} máu, ×${rebornHard().dmg.toFixed(2)} sát thương.</p>
      <div class="btnrow"><button class="btn red" id="gReborn" ${S.lvl >= 200 && !o ? "" : "disabled"}>${o ? "Đã chuyển sinh tối đa" : S.lvl >= 200 ? "Chuyển sinh" : "Cần cấp 200"}</button></div>`;
}
const GIFT_TABS = [
  ["login", "Điểm danh"],
  ["lvms", "Mốc cấp"],
  ["chest", "Phúc Duyên"],
  ["event", "Sự kiện"],
  ["ach", "Thành tựu"],
  ["giftcode", "Giftcode"],
];
function giftModal(t) {
  if (!S.fac) return;
  const n = RW(),
    o = giftCounts();
  if ((GIFT_TABS.some(([s]) => s === giftTab) || (giftTab = "login"), t && !o[giftTab])) {
    const s = GIFT_TABS.find(([i]) => o[i] > 0);
    s && (giftTab = s[0]);
  }
  modal(
    `<h3>🎁 Phần thưởng <small>Phúc Duyên ${n.fd}${n.stat.tokens ? ` · ${eventNow().token} ${n.stat.tokens}` : ""}</small></h3><div class="dtabs" id="giftTabs">${GIFT_TABS.map(([s, i]) => `<button data-g="${s}" class="${s === giftTab ? "on" : ""}">${i}${o[s] ? ` <b class="gdot">${o[s] > 99 ? "99+" : o[s]}</b>` : ""}</button>`).join("")}</div>${giftBody(n)}`,
    () => {
      document.querySelectorAll("#mBody #giftTabs button").forEach(
        (i) =>
          (i.onclick = () => {
            ((giftTab = i.dataset.g), giftModal());
          }),
      );
      const s = (i, e) => {
        const c = $(i);
        c && (c.onclick = e);
      };
      (s("#gLogin", () => {
        (claimLogin(), refreshGift());
      }),
        s("#gChest", openChest),
        document.querySelectorAll("#mBody [data-ch]").forEach((i) => (i.onclick = () => openChestMany(+i.dataset.ch))),
        document.querySelectorAll("#mBody [data-lv]").forEach((i) => (i.onclick = () => claimLvMs(+i.dataset.lv))),
        s("#gLvAll", () => {
          for (const [i] of lvMsReady()) claimLvMs(i);
          save();
        }),
        document.querySelectorAll("#mBody [data-t]").forEach(
          (i) =>
            (i.onclick = () => {
              ((n.title = n.title === i.dataset.t ? "" : i.dataset.t), (R.dirty = !0), save(), refreshGift());
            }),
        ),
        document.querySelectorAll("#mBody [data-e]").forEach((i) => (i.onclick = () => eventBuy(+i.dataset.e))));

      const sGc = async () => {
        const gcIn = $("#gcIn"),
          gcOk = $("#gcOk"),
          gcMsg = $("#gcMsg");
        if (!gcIn || !gcOk || gcOk.disabled) return;
        gcOk.disabled = !0;
        gcMsg.innerHTML = '<span class="dim">Đang kiểm tra…</span>';
        try {
          const res = await netRedeem(gcIn.value);
          gcMsg.innerHTML = `<span class="cp">✔ Nhận thành công: <b>${res.out.join(", ") || "—"}</b>! Đã thêm vào Hành trang.</span>`;
          uiSfx("levelup");
          gcIn.value = "";
        } catch (err) {
          gcMsg.innerHTML = `<span class="cn">✖ ${esc(err.message || String(err))}</span>`;
          uiSfx("use");
        }
        gcOk.disabled = !1;
      };
      const bGc = $("#gcOk");
      bGc && (bGc.onclick = sGc);
      const inGc = $("#gcIn");
      if (inGc) {
        setTimeout(() => inGc.focus(), 60);
        inGc.addEventListener("pointerdown", (e) => e.stopPropagation());
        inGc.addEventListener("mousedown", (e) => e.stopPropagation());
        inGc.addEventListener("click", (e) => {
          e.stopPropagation();
          inGc.focus();
        });
        inGc.addEventListener("keydown", (e) => {
          e.stopPropagation();
          if (e.key === "Enter") {
            e.preventDefault();
            sGc();
          }
        });
      }
    },
  );
}
function rebornModal() {
  S.fac &&
    modal(`<h3>Chuyển sinh <small>${RW().stat.reborn}/${REBORN_MAX} lần</small></h3>${rebornBody()}`, () => {
      const t = $("#gReborn");
      t && (t.onclick = doReborn);
    });
}
