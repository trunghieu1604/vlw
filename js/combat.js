"use strict";
const R = {
    corpses: [],
    lootWait: 0,
    ground: [],
    pickTarget: null,
    enemies: [],
    P: null,
    life: 1,
    mana: 1,
    atkT: 0,
    deadT: 0,
    spawnT: 0,
    kills: 0,
    t0: Date.now(),
    logs: [],
    fx: [],
    txt: [],
    dirty: !0,
    stall: 0,
    farm: 0,
  },
  AR = { w: 400, h: 520, top: 70, bot: 470 },
  H = { x: 768, y: 768, face: 1 },
  zoneIdx = (t) => Math.min(ZONES.length - 1, Math.floor((t - 1) / ZONE_STAGES)),
  ZALT = W.zalt || {},
  zoneOf = (t) => {
    const n = zoneIdx(t),
      e = S && S.zalt && S.zalt[n];
    return (e && ZALT[n] && ZALT[n][e - 1]) || ZONES[n];
  },
  inZone = (t) => ((t - 1) % ZONE_STAGES) + 1;
function stageLevel(t) {
  if (t > STAGES) return BASE_CAP;
  const n = zoneOf(t),
    e = Math.round(n.lo + ((inZone(t) - 1) * (n.hi - n.lo)) / (ZONE_STAGES - 1));
  return n.lo >= 160 ? Math.min(BASE_CAP, e) : e;
}
const POISON_TIME = 3,
  SERIES_BONUS = 0.1,
  ELEM_SLOW_T = 1.5,
  ELEM_SLOW = 0.5,
  ELEM_STUN_P = 0,
  ELEM_STUN_T = 0.5,
  CLS = {
    normal: { hp: 1, dmg: 1, xp: 1, r: 17 },
    elite: { hp: 2.5, dmg: 1.3, xp: 3, r: 21 },
    boss: { hp: 14, dmg: 1.7, xp: 20, r: 30 },
  },
  DIFFS = [
    { n: "Dễ", hp: 0.75, dmg: 0.7, rew: 0.8, d: "Quái yếu hơn (máu −25%, sát thương −30%), thưởng −20%" },
    { n: "Thường", hp: 1, dmg: 1, rew: 1, d: "Cân bằng chuẩn" },
    { n: "Khó", hp: 1.4, dmg: 1.35, rew: 1.25, d: "Quái mạnh hơn (máu +40%, sát thương +35%), thưởng +25%" },
  ],
  diffOf = () => DIFFS[1],
  MON_HP_K = [
    [1, 1],
    [10, 1.1],
    [30, 1.8],
    [60, 3.5],
    [90, 12],
    [120, 20],
    [150, 28],
    [200, 40],
  ],
  MON_DMG_K = [
    [1, 1],
    [30, 1.3],
    [60, 1.45],
    [90, 1.7],
    [120, 2.2],
    [200, 2.8],
  ],
  monRewK = (t) => Math.pow(lerpK(MON_HP_K, t), 0.4),
  lerpK = (t, n) => {
    for (let e = 1; e < t.length; e++)
      if (n <= t[e][0]) {
        const [o, i] = t[e - 1],
          [s, r] = t[e];
        return i + ((r - i) * (n - o)) / (s - o);
      }
    return t[t.length - 1][1];
  },
  JX1_LIFE = [
    [10, 50, 3, 0],
    [20, 122, 8, 10],
    [30, 270, 30, 20],
    [40, 900, 35, 30],
    [50, 1450, 60, 40],
    [60, 2100, 48, 50],
    [70, 2950, 54, 60],
    [80, 3500, 58, 70],
    [90, 5050, 11, 80],
    [100, 6450, 11, 90],
  ];
function jx1Life(t) {
  return t > 100 ? 26240 + (t - 100) * 340 : jx1Pw(t, JX1_LIFE, 0) * clamp(1 + (3 * (t - 40)) / 30, 1, 4);
}
const JX1_AR = [
    [10, 10, 3, 0],
    [20, 50, 4, 10],
    [30, 100, 5, 20],
    [40, 250, 5, 30],
    [50, 400, 5, 40],
    [60, 500, 5, 50],
    [70, 600, 5, 60],
    [80, 700, 5, 70],
    [90, 800, 5, 80],
    [100, 900, 5, 90],
  ],
  JX1_DEF = [
    [10, 10, 0, 0],
    [20, 50, 3, 10],
    [30, 100, 5, 20],
    [40, 150, 5, 30],
    [50, 200, 5, 40],
    [60, 300, 5, 50],
    [70, 400, 5, 60],
    [80, 500, 5, 70],
    [90, 600, 5, 80],
    [100, 800, 10, 90],
  ],
  JX1_DMG = [
    [10, 3, 0.3, 0],
    [20, 8, 0.3, 10],
    [30, 13, 0.4, 20],
    [40, 20, 0.5, 30],
    [50, 29, 0.5, 40],
    [60, 39, 0.6, 50],
    [70, 50, 0.7, 60],
    [80, 65, 0.8, 70],
    [90, 85, 0.9, 80],
    [100, 112, 1, 90],
  ];
function jx1Pw(t, n, e) {
  if (t > 100) {
    const [o, i, s, r] = n[n.length - 1];
    return Math.floor(i + s * (o - r)) + e * (t - 100);
  }
  for (const [o, i, s, r] of n) if (t <= o) return Math.floor(i + s * (Math.max(1, t) - r));
  return 0;
}
const MON_HP_G = 1,
  MON_HP_JX = [
    [1, 0.2],
    [10, 0.2],
    [30, 0.24],
    [60, 0.2],
    [90, 0.19],
    [120, 0.15],
    [150, 0.17],
    [200, 0.17],
  ],
  monHpK = (t) => lerpK(MON_HP_JX, t);
// admin "monsters" document, key base (server/admin_sections/monsters.py): HP of every monster x hp, monsters per
// camp / wave x count, every map
const MON_BASE_HP = 4,
  MON_BASE_COUNT = 2,
  monBase = (k, d) => (self.GCFG ? GCFG.get("monsters", "base." + k, d) : d),
  monCount = (n) => Math.max(1, Math.round(n * monBase("count", MON_BASE_COUNT)));
function enemyStats(t, n) {
  const e = CLS[n];
  return {
    hp: jx1Life(t) * MON_HP_G * monBase("hp", MON_BASE_HP) * monHpK(t) * e.hp,
    dmg: (2 + 1 * t + 0.006 * t * t) * e.dmg * lerpK(MON_DMG_K, t),
    ar: 30 + t * 9,
    def: 8 + t * 3.2,
  };
}
// admin console "exp" document (docs/admin-console.md, js/gcfg/exp.js): value or the built-in constant
const expCfg = (k, d) => (self.GCFG ? GCFG.get("exp", k, d) : d),
  xpPenK = (d) => {
    if (typeof S < "u" && S && S.lvl < 200) {
      return d < -20 ? 0.6 : d < -10 ? 0.8 : 1;
    }
    return d < -expCfg("penalty.far", 10) ? expCfg("penalty.farK", 0.2) : d < -expCfg("penalty.near", 5) ? expCfg("penalty.nearK", 0.6) : 1;
  },
  xpMonK = (L) => Math.pow(lerpK(MON_HP_K, L), expCfg("monRewP", 0.4)),
  xpZoneK = () => (typeof S < "u" && S && S.stage > 0 ? expCfg("zones." + zoneOf(S.stage).id, 1) : 1);
// EXP to go from level L to L+1: J.exp for L < 200, and balanced progression for L >= 200
const LV_NEED_FROM = 90,
  LV_NEED_MUL = 10,
  LV_NEED_GROWTH = 1.05,
  lvNeed = (L) => {
    if (L >= 200) {
      return Math.round(1e7 + (L - 200) * 5e5);
    }
    const maxIdx = J.exp ? J.exp.length : 200;
    return (J.exp && (L <= maxIdx ? J.exp[L - 1] : J.exp[maxIdx - 1])) || 2e9;
  };
const XP_OVER = 25,
  XP_SLOW_FROM = 30,
  XP_SLOW_K = 6,
  XP_SLOW_P = 1,
  xpSlow = (t) => (t < 200 ? 1 : 1 + XP_SLOW_K * Math.pow((Math.min(t, 200) - XP_SLOW_FROM) / 120, XP_SLOW_P));
function expFor(t) {
  const maxIdx = J.exp ? J.exp.length : 200;
  const expVal = (J.exp && J.exp[clamp(t, 1, maxIdx) - 1]) || 2e9;
  return (expVal / (10 + Math.min(t, 200) * 1.4)) * xpPace(t);
}
const XP_DRAG = 14,
  XP_DRAG_LV = [40, 70];
function oldMonHp(t) {
  return (t > 100 ? 26240 + (t - 100) * 340 : jx1Pw(t, JX1_LIFE, 0) * clamp(1 + (3 * (t - 40)) / 30, 1, 4)) * monHpK(t);
}
const MON_HP_SCALE = 0.4,
  hpRatio = (t) => 1;
function xpDrag() {
  if (typeof S < "u" && S && S.lvl < 200) return 1;
  if (rebornN() > 0) return XP_DRAG;
  const [t, n] = XP_DRAG_LV;
  return 1 + (XP_DRAG - 1) * clamp((S.lvl - t) / (n - t), 0, 1);
}
const xpPace = (t) => hpRatio(t) / xpDrag(),
  NPC_SK_R = {
    1: 100,
    2: 320,
    53: 75,
    102: 360,
    122: 300,
    153: 400,
    164: 470,
    165: 400,
    196: 180,
    197: 180,
    198: 180,
    200: 180,
    201: 180,
    233: 270,
    234: 180,
    235: 450,
    236: 360,
    237: 300,
    238: 72,
    239: 400,
    240: 320,
    241: 180,
    242: 72,
  },
  MON_RANGE_MAX = 320;
function monReach(t) {
  const n = (MON[t] && MON[t].sk) || [],
    e = n.find((o) => o !== 53 && o !== 101 && NPC_SK_R[o]) || n.find((o) => NPC_SK_R[o]) || 53;
  return Math.min(MON_RANGE_MAX, NPC_SK_R[e] || 75);
}
const MON_WEAK = [3, 0, 4, 2, 1];
function makeEnemy(t, n, e, o, i) {
  n = clamp(Math.round(n) || 1, 1, BASE_CAP);
  const s = MON[t],
    r = zoneOf(S.stage),
    a = enemyStats(n, e),
    f = diffOf(),
    u = rebornHard();
  ((a.hp *= f.hp * u.hp), (a.dmg *= f.dmg * u.dmg));
  const c = e === "boss" ? monSeries(t) : irnd(0, 4),
    m = e === "boss" ? s.rmax : ELEM.map((M, T) => (T === c ? 90 : T === MON_WEAK[c] ? 60 : 75)),
    y = {};
  return (
    ELEM.forEach((M, T) => {
      const g = m[T] || 75,
        k = g > 75 ? 10 : g < 75 ? -10 : 0;
      y[M] = clamp(n * 0.35 + (e === "boss" ? 10 : 0) + k, -20, g);
    }),
    {
      id: Math.random(),
      tid: t,
      n: s.n,
      img: s.img ? img(s.img) : null,
      sz: s.sz,
      L: n,
      cls: e,
      series: c,
      res: y,
      hp: a.hp,
      max: a.hp,
      dmg: a.dmg,
      ar: a.ar,
      def: a.def,
      x: o,
      y: i,
      r: CLS[e].r,
      spd: (30 + (s.run || 6) * 4) * (e === "boss" ? 0.7 : 1),
      atkCd: rnd(0.5, 1.5),
      cd: 1.2 + (18 / Math.max(8, s.spd || 18)) * 0.5,
      reach: monReach(t),
      ranged: monReach(t) > 120,
      born: R.clock || 0,
      stun: 0,
      slowT: 0,
      poison: 0,
      poisonDmg: 0,
      hitT: 0,
      face: 1,
    }
  );
}
const DENS_MIN = 6,
  DENS_MAX = 8,
  DENS_BOSS = 4,
  DENS_REW = 1,
  DENS_DMG = 0.75,
  DENS_BY_LV = [
    [5, 2, 3, 1],
    [10, 3, 4, 1],
    [20, 4, 5, 2],
    [30, 5, 6, 3],
    [45, 5, 7, 3],
    [999, DENS_MIN, DENS_MAX, DENS_BOSS],
  ],
  densRange = () => DENS_BY_LV.find((t) => (S.lvl | 0) <= t[0]),
  densK = (t) => (t && t.dens ? DENS_REW : 1);
function spawnWave() {
  ((R.enemies = []), (R.stall = 0));
  const t = zoneOf(S.stage),
    n = stageLevel(S.stage),
    e = (r, a) => {
      const f = rnd(0, Math.PI * 2),
        u = rnd(r, a);
      return inWorld(H.x + Math.cos(f) * u, H.y + Math.sin(f) * u);
    },
    o = () => (R.sp = e(140, 300))[0],
    i = () => R.sp[1],
    s = (r) => {
      const a = makeEnemy(pick(t.m), n, r, o(), i());
      (r === "normal" && ((a.dens = !0), (a.dmg *= DENS_DMG)), R.enemies.push(a));
    };
  if (S.wave === WAVES && bossRoundDue()) {
    const r = e(220, 260),
      a = makeEnemy(t.boss, n + 1, "boss", r[0], r[1]);
    ((a.n = bossName(t.boss, t.n)), R.enemies.push(a), s("elite"));
    for (let f = 0, c = monCount(densRange()[3]); f < c; f++) s("normal");
    log(`<b class="boss">${esc(bossName(t.boss, t.n))}</b> xuất hiện!`);
  } else {
    const r = densRange(),
      a = monCount(irnd(r[1], r[2])),
      f = S.wave === WAVES ? 1 + (Math.random() < 0.4 ? 1 : 0) : 0;
    for (let u = 0; u < a; u++) s(u < f ? "elite" : "normal");
  }
  t.id !== R.zoneShown &&
    ((R.zoneShown = t.id),
    (R.banner = { t: 2.4, text: t.n, sub: `Cấp ${t.lo}–${t.hi}` }),
    typeof onZoneChange == "function" && onZoneChange(t));
}
function hitPercent(t, n, e = 0) {
  const o = (n * (100 - Math.min(e, 100))) / 100;
  let i = t + o === 0 ? 50 : (t * 100) / (t + o);
  if (i > MAX_HIT) i = MAX_HIT;
  return Math.max(MIN_HIT, i);
}
function applyPart(t, n, e, o, i, s, r) {
  let a = (i && i[n] != null) ? i[n] : 0;
  return (
    counters(e, o) ? (a -= r) : counters(o, e) && (a += r),
    (a = clamp(a, -s, Math.min(s, MAX_RESIST))),
    (t * (100 - a)) / 100
  );
}
function heroHit(t, n) {
  ((n.aggro = !0), t && t.id && SK[t.id] && SK[t.id].tier === 90 && ((n.hitSk || (n.hitSk = {}))[t.id] = 1));
  const e = typeof curseMod == "function" ? curseMod(n) : null;
  if (t.useAR && Math.random() * 100 >= hitPercent(t.ar || R.P.ar, Math.max(0, (n.def || 0) + (e ? e.def : 0)), t.ignore))
    return (addText(n.x, n.y - (n.r || 30) - 8, "Trượt", "#aaa", 11), 0);
  t.ev2 || stateOnHit(t, n);
  const o = Math.random() * 100 < t.crit,
    i = (R.P.heavy > 0 || t.fatal > 0) && Math.random() * 100 < (R.P.heavy || 0) + (t.ev2 ? 0 : t.fatal || 0);
  let s = 0,
    r = "phys",
    a = 0;
  const f = n.cls === "boss" || n.cls === "elite";
  if (f && Math.random() * 100 < (n.cls === "boss" ? 6 : 3) - (R.P.antiBlock || 0))
    return (addText(n.x, n.y - (n.r || 30) - 8, "Hóa giải", "#ccc", 11), 0);
  // 120 Đường Môn - Mê Ảnh Tung buff sát thương
  if (R.s120 && R.s120.buff && R.s120.buff[710] && R.s120.buff[710].until > performance.now()) {
    t.parts = t.parts || {};
  }
  const nRes = n.res || { phys: 25, fire: 25, cold: 25, light: 25, poison: 25 };
  const u = n.resBrkT > 0 ? 10 : 0,
    c = R.P.anti,
    m =
      (c && ELEM.some((l) => c[l])) || u
        ? Object.fromEntries(ELEM.map((l) => [l, (nRes[l] != null ? nRes[l] : 25) - ((c && c[l]) || 0) - u]))
        : nRes,
    y = e ? Object.fromEntries(ELEM.map((l) => [l, (m[l] != null ? m[l] : 25) + ((e.res && e.res[l]) || 0)])) : m,
    M = R.P.antiMax ? Math.max(0, 75 - R.P.antiMax / 4) : 75;
  for (const l in t.parts) {
    let d = t.parts[l] * rnd(0.85, 1.15);
    if (l === "poison") {
      const h = n.poison > 0 ? n.poisonDmg * n.poison : 0,
        p = t.poisonT || POISON_TIME;
      ((n.poisonDmg =
        (h +
          applyPart(d * (e && e.poison ? 1 + e.poison / 100 : 1), "poison", t.series, n.series, y, M, t.series5) *
            cheatK()) /
        Math.max(p, n.poison > 0 ? n.poison : 0)),
        (n.poison = Math.max(p, n.poison > 0 ? n.poison : 0)));
      continue;
    }
    ((d = applyPart(d, l, t.series, n.series, y, M, t.series5)),
      o && l === "phys" && (d *= CRIT_MULT),
      (s += d),
      d > a && ((a = d), (r = l)));
  }
  (counters(t.series, n.series) && (s += R.P.series5),
    i && (s *= 1.5),
    f && R.P.antiSorb && (s *= 1 + R.P.antiSorb / 100));
  const T = counters(t.series, n.series),
    g = counters(n.series, t.series);
  (T ? (s *= 1 + SERIES_BONUS) : g && (s *= 1 - SERIES_BONUS),
    t.parts.cold && !(n.slowT > 0) && (n.slowT = (t.coldT || ELEM_SLOW_T) * (1 - ((e && e.freezeRed) || 0) / 100)));
  const isWorldBoss = !!n.isWbBoss;
  const isAnyBoss = isWorldBoss || !!n.wb;
  const isWb = isWorldBoss;
  if (isAnyBoss) {
    n.stun = 0;
    n.slowT = 0;
  }
  const k = isAnyBoss ? 0 : (1 + (R.P.stunLong || 0) / 100) * (1 - ((e && e.stunRed) || 0) / 100);
  if (
    (t.parts.light && !isAnyBoss && Math.random() < ELEM_STUN_P && (n.stun = Math.max(n.stun, ELEM_STUN_T * k)),
    (s = Math.max(1, s * cheatK())),
    (isWorldBoss ? (n.hp = n.max) : (n.hp = Math.max(0, n.hp - s))),
    R.tower && (R.stall = 0),
    isWorldBoss && typeof onHeroHitWb === "function" && onHeroHitWb(s),
    (n.retMeleeP || n.retMelee) && !t.ranged && (() => {
      const retP = Math.max(0, (n.retMeleeP || 0) * (1 - (R.P.returnRes || 0) / 100));
      const refDmg = Math.max(0, (n.retMelee || 0) + (s * retP) / 100);
      refDmg > 0 && ((R.life = Math.max(1, R.life - refDmg)), addText(H.x, H.y - 40, "-" + fmt(refDmg) + " ↩", "#ff8844", 11));
    })(),
    (n.hitT = 0.12),
    !isWb && n.act !== "at" && ((n.act = "hurt"), (n.actT = 0), npcSfx(MON[n.tid] ? MON[n.tid].anim : (heroGfx() && heroGfx().anim), "hurt", 0.3)),
    !isWb && (t.stun || R.P.stunAdd) &&
      Math.random() * 100 < (t.stun || 0) + (R.P.stunAdd || 0) &&
      (n.stun = Math.max(n.stun, 0.8 * k)),
    !isWb && R.P.knock && n.cls !== "boss" && Math.random() * 100 < R.P.knock)
  ) {
    const l = n.x - H.x,
      d = n.y - H.y,
      h = Math.hypot(l, d) || 1;
    ((n.x += (l / h) * 40),
      (n.y += (d / h) * 40),
      (n.stun = Math.max(n.stun, 0.25)),
      (n.atkCd = Math.max(n.atkCd || 0, 0.3)));
  }
  R.P.breakRes && Math.random() * 100 < R.P.breakRes && (n.resBrkT = 3);
  const b = t.basic || t.wpn,
    E = ((b && R.P.leech) || 0) + (t.ev2 ? 0 : t.skLeech || 0),
    x = ((b && R.P.manaLeech) || 0) + (t.ev2 ? 0 : t.skMLeech || 0);
  (E && heal((s * E) / 100, !0), x && (R.mana = Math.min(R.P.mana, R.mana + (s * x) / 100)));
  const _ = T ? " ⚡" : g ? " 🛡" : "";
  return (
    addText(n.x, n.y - n.r - 6, fmt(s) + _ + (i ? "!" : ""), o || i ? "#ffe14a" : ELEM_COL[r], o || i ? 16 : 12),
    s
  );
}
function enemyHit(t) {
  if (R.invulT > 0) return;
  const isWbScene = (typeof WB !== "undefined" && WB.arena && WB.arena.on) || (typeof R !== "undefined" && R && R.dg && R.dg.kind === "worldboss");
  if (!isWbScene && ((typeof isGodMode == "function" && isGodMode()) || (typeof R !== "undefined" && R && R.admGod))) {
    addText(H.x, H.y - 30, "Bất tử", "#ffd24a", 11);
    return;
  }
  // 120 Thúy Yên - Ngự Tuyết Ẩn (quái đánh trượt)
  if (R.s120 && R.s120.stealth && R.s120.stealth > performance.now()) {
    addText(H.x, H.y - 30, "Ẩn thân", "#7fd0ff", 11);
    return;
  }
  // 120 Võ Đang - Xuất Ứ Bất Nhiễm (miễn mọi sát thương)
  if (R.s120 && R.s120.immune && R.s120.immune > performance.now()) {
    addText(H.x, H.y - 30, "Bất nhiễm", "#ffe08a", 11);
    return;
  }
  // 120 Đường Môn - Mê Ảnh Tung (lóe ảnh né hẳn đòn)
  if (S.sk && S.sk[710] && typeof sk120Scale == "function" && Math.random() * 100 < sk120Scale(S.sk[710], 5, 25)) {
    addText(H.x, H.y - 30, "Mê Ảnh", "#bfe8ff", 11);
    return;
  }
  const isWb = !!t.isWbBoss;
  if (isWb) {
    const maxHp = (R.P && R.P.life) || 1000;
    // Gõ 1 cái mất 15% máu tính theo từng người chơi
    const dmgVal = Math.max(1, Math.round(maxHp * 0.15));
    R.life = Math.max(0, R.life - dmgVal);
    R.hurtT = 0.25;
    if (H.act !== "at" && Math.random() < 0.3) {
      H.act = "hurt";
      H.actT = 0;
      R.atkT = Math.max(R.atkT || 0, 0.25 * (1 - (R.P.hitRec || 0) / 100));
    }
    addText(H.x + rnd(-10, 10), H.y - 36, "-" + fmt(dmgVal), "#ff3333", 13);
    return;
  }
  const n = typeof curseMod == "function" ? curseMod(t) : null;
  if (Math.random() * 100 >= hitPercent(t.ar * (n ? Math.max(0.1, 1 + n.ar / 100) : 1), R.P.def)) {
    addText(H.x, H.y - 30, "Né", "#9cf", 11);
    return;
  }
  const totalBlock = (R.P.block || 0) + (R.P.antiBlock || 0);
  if (totalBlock > 0 && Math.random() * 100 < totalBlock) {
    addText(H.x, H.y - 30, "Hóa giải", "#9cf", 11);
    return;
  }
  const e = SERIES_ELEM[t.series] || "phys";
  const baseFatal = t.cls === "boss" ? 16 : t.cls === "elite" ? 8 : 0;
  const fatalChance = Math.max(0, baseFatal - (R.P.fatallyRes || 0));
  const isFatal = fatalChance > 0 && Math.random() * 100 < fatalChance;
  let o = t.dmg * rnd(0.8, 1.2) * (n ? Math.max(0.1, 1 + n.dmg / 100) : 1);
  if (isFatal) o *= 1.4;
  if (
    ((o = applyPart(o, e, t.series, R.P.series, R.P.res, R.P.resMax || PLAYER_RES_MAX, 10)),
    counters(t.series, R.P.series)
      ? ((o *= 1 + SERIES_BONUS), R.P.res5 && (o = Math.max(1, o - R.P.res5)))
      : counters(R.P.series, t.series) && (o *= 1 - SERIES_BONUS),
    R.P.dmgShield && (o -= Math.min(R.P.dmgShield, o * DMG_SHIELD_MAX)),
    e === "cold" && (R.slowT = Math.max(R.slowT || 0, ELEM_SLOW_T * (1 - (R.P.freezeRed || 0) / 100))),
    e === "light" &&
      Math.random() < ELEM_STUN_P &&
      !(Math.random() * 100 < (R.P.antiStun || 0)) &&
      (R.stunT = Math.max(R.stunT || 0, ELEM_STUN_T * (1 - (R.P.stunRed || 0) / 100))),
    e === "poison")
  ) {
    const i = POISON_TIME * (1 - (R.P.poisonRed || 0) / 100),
      s = o * 0.4;
    ((o -= s),
      i > 0.05 && ((R.hpDot = (R.hpDot || 0) + (s * i) / POISON_TIME), (R.hpDotT = Math.max(R.hpDotT || 0, i))));
  }
  if (
    (R.P.sorb && (o *= 1 - R.P.sorb / 100),
    R.P.dmg2mana && (R.mana = Math.min(R.P.mana, R.mana + (o * R.P.dmg2mana) / 100)),
    n && n.ret && !t.ranged && (t.hp -= ((o * n.ret) / 100) * cheatK()),
    R.P.retDmg && (t.hp -= ((o * R.P.retDmg) / 100) * cheatK()),
    // 120 Côn Lôn - Lưỡng Nghi Chân Khí (khiên hút sát thương)
    R.s120 && R.s120.shield > 0 && R.s120.shieldUntil > performance.now() && ((() => {
      const abs = Math.min(R.s120.shield, o);
      R.s120.shield -= abs;
      o -= abs;
      if (abs > 0) addText(H.x, H.y - 30, "Khiên đỡ -" + fmt(abs), "#6be3ff", 11);
    })()),
    R.P.manaShield > 0 && R.mana > 0)
  ) {
    const i = Math.min(R.mana, (o * R.P.manaShield) / 100);
    ((R.mana -= i), (o -= i));
  }
  if (
    ((R.life -= o),
    (R.hurtT = 0.25),
    H.act !== "at" &&
      Math.random() < 0.3 &&
      ((H.act = "hurt"), (H.actT = 0), (R.atkT = Math.max(R.atkT || 0, 0.25 * (1 - (R.P.hitRec || 0) / 100)))),
    R.P.retMelee || R.P.retMeleeP || R.P.retRangeP)
  ) {
    const retCurse = n && (t.ranged ? n.retRange : n.ret) ? Math.max(0, 1 + (t.ranged ? n.retRange : n.ret) / 100) : 1;
    const i = (t.ranged ? (o * (R.P.retRangeP || 0)) / 100 : R.P.retMelee + (o * R.P.retMeleeP) / 100) * retCurse;
    i > 0 && (t.hp -= i * cheatK());
  }
  addText(H.x + rnd(-10, 10), H.y - 36, "-" + fmt(o), "#ff6a5a", 12);
}
function heal(t, n) {
  const e = R.life;
  ((R.life = Math.min(R.P.life, R.life + t)),
    !n && R.life - e > 1 && addText(H.x, H.y - 44, "+" + fmt(R.life - e), "#7f7", 11));
}
const POT_TIER_LV = [0, 1, 20, 40, 70, 100];
function bestPotion(t) {
  let n = null;
  for (const e of J.potions)
    e.kind === t &&
      S.lvl >= (POT_TIER_LV[e.tier] || 999) &&
      potPrice(e) <= S.gold &&
      (!n || e.tier > n.tier) &&
      (n = e);
  return n;
}
const potPrice = (t) => Math.round(t.price * (1 + S.lvl / 25));
function autoPotion(t) {
  R.hot = R.hot || { life: 0, mana: 0, lifeT: 0, manaT: 0 };
  const n = R.hot,
    e = R.P;
  for (const s of ["life", "mana"])
    if (n[s + "T"] > 0) {
      const r = Math.min(t, n[s + "T"]);
      ((n[s + "T"] -= t),
        s === "life"
          ? (R.life = Math.min(e.life, R.life + n.life * r))
          : (R.mana = Math.min(e.mana, R.mana + n.mana * r)));
    }
  if (((R.potCd = R.potCd || { life: 0, mana: 0 }), S.potBuy !== !1)) for (const s of [0, 1]) potRestock(s);
  if (S.potOff) return;
  const o = R.life < e.life * 0.5,
    i = R.mana < e.mana * 0.5 || (e.main.cost > 0 && !e.main.costLife && R.mana < e.main.cost * 2);
  for (const [s, r] of [
    ["life", o],
    ["mana", i],
  ]) {
    const a = s === "life" && R.life < e.life * 0.3;
    if (!r || R.potCd[s] > 0 || (n[s + "T"] > 0 && !a)) continue;
    const f = typeof slotPick == "function" ? slotPick(s === "life" ? 0 : 1) : null,
      u = f ? null : takeStock(s),
      c = f ? f.p : u || bestPotion(s);
    c && (usePotion(s, c, f ? f.free : !!u), (R.potCd[s] = POT_CD));
  }
}
function potRestock(t) {
  const n = t ? "mana" : "life",
    e = typeof slotPot == "function" ? slotPot(t) : null;
  if (e ? (potStock(e.kind)[e.tier] || 0) > 0 : stockCount(n) > 0) return;
  let o = e && potOpen(e) ? e : null;
  if (!o)
    for (const r of J.potions)
      r.kind === n &&
        S.lvl >= (POT_TIER_LV[r.tier] || 999) &&
        potPrice(r) * POT_STACK <= S.gold * 0.2 &&
        (!o || r.tier > o.tier) &&
        (o = r);
  if (!o) return;
  const i = potPrice(o) * POT_STACK;
  if (i > S.gold * 0.2) return;
  S.gold -= i;
  const s = potStock(o.kind);
  ((s[o.tier] = (s[o.tier] || 0) + POT_STACK), log(`Tự mua ${POT_STACK} ${o.n} (-${fmtL(i)} lượng)`));
}
function usePotion(t, n, e) {
  R.hot = R.hot || { life: 0, mana: 0, lifeT: 0, manaT: 0 };
  const o = R.hot;
  (e || (S.gold -= potPrice(n)), (S.potUsed = (S.potUsed || 0) + 1), questTick("pots"));
  const i = (s, r, a) => {
    const f = o[s + "T"] > 0 ? o[s] * o[s + "T"] : 0;
    ((o[s + "T"] = a), (o[s] = (f + r) / a));
  };
  n.kind === "both" ? (i("life", n.total, n.dur), i("mana", n.mtotal, n.mdur)) : i(t, n.total, n.dur);
}
const alive = () => R.enemies.filter((t) => t.hp > 0);
function nearest(t) {
  const n = R.P ? R.P.series : -1;
  let e = null,
    o = 1e9;
  for (const i of t) {
    let s = jxdE(H, i) * (typeof dtWant == "function" && dtWant(i) ? 0.85 : 1);
    (OBS.g && !obsSee(H.x, H.y, i.x, i.y) && (s = s * 2.5 + 200), s < o && ((o = s), (e = i)));
  }
  return e;
}
function rotPool(t) {
  if (S.rot === !1 || window.NO_ROT || (S.mainLock && S.main === "basic")) return [];
  const n = (S.slots || []).filter((o) => o > 0),
    e = t.actives.filter((o) => n.includes(o.id));
  // a main skill locked by the player (Võ công: picker / star) always takes part in the rotation, even when it
  // is not in one of the 4 slots (a disciple's slots are auto-filled): otherwise it was never cast
  t.main && S.mainLock && t.main !== t.basic && !e.includes(t.main) && t.actives.includes(t.main) && (n.unshift(t.main.id), e.push(t.main));
  return e.length < 2 ? [] : n.map((o) => e.find((i) => i.id === o)).filter(Boolean);
}
function pickAttack(t, n) {
  const e = autoRide() && !skHorseOk(SK[t.main.id], !!R.mounted) ? !R.mounted : !!R.mounted,
    o = n ? [] : rotPool(t).filter((r) => skHorseOk(SK[r.id], e)),
    i = (r) => !r.cd || ((R.skCd || {})[r.id] || 0) <= (R.clock || 0);
  if (o.length < 2) {
    if (i(t.main)) return skCanPay(t.main) ? t.main : null;
    const r = t.actives
      .filter((a) => a !== t.main && i(a) && skCanPay(a) && skHorseOk(SK[a.id], e))
      .sort((a, f) => f.dps - a.dps)[0];
    return r && r.dps > t.basic.dps ? r : t.basic;
  }
  const s = o.length;
  R.rotI = (R.rotI || 0) % s;
  for (let r = 0; r < s; r++) {
    const a = o[(R.rotI + r) % s];
    if (i(a) && skCanPay(a)) return ((R.rotI = (R.rotI + r + 1) % s), a);
  }
  return o.some(i) ? null : t.basic;
}
const GEO_PAST = 160;
function geoTargets(t, n, e) {
  const o = (l) => ({ x: l.x, y: l.y }),
    i = (l) => l.r || 16,
    s = o(H),
    r = o(n),
    a = t.geo,
    f = r.x - s.x,
    u = r.y - s.y,
    c = Math.hypot(f, u) || 1,
    m = f / c,
    y = u / c,
    M = e.filter((l) => l !== n && !l.dead && l.hp > 0).map((l) => ({ e: l, p: o(l), r: i(l) })),
    T = (lx, ly, h) => obsSee(lx, ly, h.e.x, h.e.y),
    g = (lx, ly, h) => M.filter((p) => Math.hypot(p.p.x - lx, p.p.y - ly) <= h + p.r && T(lx, ly, p)),
    k = (list, dx, dy) => list.sort((p, P) => Math.hypot(p.p.x - dx, p.p.y - dy) - Math.hypot(P.p.x - dx, P.p.y - dy)),
    b = (l) => (l.p.x - s.x) * m + (l.p.y - s.y) * y,
    E = (l) => Math.abs((l.p.x - s.x) * y - (l.p.y - s.y) * m);
  let x = [];
  const _ = Math.min(t.rad || 400, c + GEO_PAST) + 40;
  switch (a.k) {
    case "line":
    case "wall": {
      const l = Math.min(Math.max(a.len, c), _),
        d = (a.k === "wall" ? a.w : 36) + (a.area || 0),
        h = M.filter((p) => {
          const P = b(p);
          return P >= -20 && P <= l + 30 && E(p) <= d + p.r && T(s.x, s.y, p);
        });
      x = a.pierce ? h : k(h, s.x, s.y).slice(0, Math.max(1, (a.n || 5) - 1));
      if (!a.pierce && a.area) x = x.concat(g(r.x, r.y, a.area));
      break;
    }
    case "fan":
    case "ring": {
      const l = Math.min(Math.max(a.len, a.k === "ring" ? 0 : c), _),
        d = M.filter((h) => {
          const p = Math.hypot(h.p.x - s.x, h.p.y - s.y);
          if (p > l + h.r + 20) return !1;
          if (a.k === "fan") {
            const P = b(h) / (p || 1);
            if (Math.acos(clamp(P, -1, 1)) > (a.half || 0.8)) return !1;
          }
          return T(s.x, s.y, h);
        });
      x = a.pierce ? d : k(d, s.x, s.y).slice(0, Math.max(1, (a.n || 5) - 1));
      if (!a.pierce && a.area) x = x.concat(g(r.x, r.y, a.area));
      break;
    }
    case "self":
      x = g(s.x, s.y, a.r || 150);
      break;
    case "spot": {
      a.r ? (x = g(r.x, r.y, a.r + (a.scat || 0))) : a.n > 1 && (x = k(g(r.x, r.y, a.scat || 120), r.x, r.y).slice(0, a.n - 1));
      break;
    }
    default:
      x = [];
  }
  return [...new Set(x.map((l) => l.e))];
}
function stage2(t, n, e, o) {
  const i = ev2Of(t);
  if (!i) return;
  const s = i.rays || i.self ? H : n,
    r = i.rays ? 280 : i.self ? 170 : 150,
    a =
      i.col && o
        ? o.filter((u) => !u.dead && u.hp > 0).slice(0, ev2Max(t, i))
        : e
            .filter((u) => !u.dead && u.hp > 0 && Math.hypot(u.x - s.x, u.y - s.y) - (u.r || 15) <= r && obsSee(s.x, s.y, u.x, u.y))
            .sort((u, c) => Math.hypot(u.x - s.x, u.y - s.y) - Math.hypot(c.x - s.x, c.y - s.y))
            .slice(0, ev2Max(t, i));
  let f = !1;
  (i.self && typeof ev2Fx == "function" && (i.noFx || ev2Fx(H, t, i.n, null, i), (f = !0)),
    i.castFx && typeof ev2Fx == "function" && ev2Fx(H, t, null, null, { self: !0, fx: i.castFx }));
  for (const u of a) {
    if (i.chance && Math.random() >= i.chance) continue;
    const c = ev2Parts(t, i),
      m = Object.assign({}, t, { parts: c, stun: i.stun || 0, useAR: !1, ev2: !0, crit: i.el === "phys" ? t.crit : 0 });
    (recHit(heroHit(m, u), m),
      typeof ev2Fx == "function" &&
        !i.self &&
        ev2Fx(u, t, !f && (i.rays ? `${i.n} ×${ev2Max(t, i)}` : i.n), i.rays ? H : null, i),
      (f = !0));
  }
  !f && !i.chance && !i.rays && typeof ev2Fx == "function" && ev2Fx(n, t, i.n, null, i);
}
const DASH_ID = 40,
  DASH_RAD = 200,
  DASH_T = 0.18;
function dashTry(t, n, e) {
  if (!S.sk[DASH_ID] || R.dash || R.town) return 0;
  const o = t.actives.find((f) => f.id === DASH_ID);
  if (
    !o ||
    ((R.skCd || {})[DASH_ID] || 0) > (R.clock || 0) ||
    !skCanPay(o) ||
    e < 40 ||
    e > DASH_RAD ||
    !obsSee(H.x, H.y, n.x, n.y)
  )
    return 0;
  (skPay(o), ((R.skCd = R.skCd || {})[DASH_ID] = (R.clock || 0) + (o.cd || 2)));
  const i = n.x - H.x,
    s = n.y - H.y,
    r = Math.hypot(i, s) || 1,
    a = (n.r || 12) + 14;
  return (
    (R.dash = { x0: H.x, y0: H.y, x1: n.x - (i / r) * a, y1: n.y - (s / r) * a, t: 0, tg: n, a: o }),
    (H.face = i >= 0 ? 1 : -1),
    (H.dir = dirOf(i, s)),
    (H.act = "run"),
    (H.actT = 0),
    (R.moveTo = null),
    DASH_T + 0.12
  );
}
function dashTick(t) {
  const n = R.dash;
  if (!n) return !1;
  n.t += t;
  const e = Math.min(1, n.t / DASH_T);
  if (
    ((R.dashTrail = R.dashTrail || []).push({ x: H.x, y: H.y, dir: H.dir, t: 0 }),
    (H.x = n.x0 + (n.x1 - n.x0) * e),
    (H.y = n.y0 + (n.y1 - n.y0) * e),
    e >= 1)
  ) {
    R.dash = null;
    const o = n.tg;
    (o && !o.dead && o.hp > 0 && recHit(heroHit(n.a, o), n.a),
      (H.act = "at"),
      (H.lastAtkT = performance.now()),
      (H.actT = 0),
      (H.castSk = n.a.id || 0),
      n.a.id && skillSfx(n.a.id));
  }
  return !0;
}
function heroTarget(t) {
  const n = !manual(),
    e = R.clock || 0,
    o = R.tgtBan || (R.tgtBan = new Map());
  let i = t;
  if (n && S.mode === "quest" && typeof dtWant == "function") {
    const c = t.filter(dtWant);
    c.length && (i = c);
  }
  if (n && S.bossFirst) {
    const c = i.filter((m) => m.cls === "boss" || m.goldBoss);
    c.length && (i = c);
  }
  const s = i.filter((c) => !(o.get(c) > e)),
    r = s.length ? s : i,
    a = R.tgt,
    f = nearest(r);
  if (a && !a.dead && a.hp > 0 && r.includes(a)) {
    const c = jxdE(H, a);
    if ((c < (R.tgtD ?? 1e9) - 25 && ((R.tgtD = c), (R.tgtHitT = e)), e - (R.tgtHitT ?? e) > 5 && r.length > 1))
      o.set(a, e + 8);
    else if (!f || f === a || jxdE(H, f) > jxdE(H, a) * 0.5 - 40) return a;
  }
  const u = (a && r.includes(a) && o.get(a) > e && nearest(r.filter((c) => c !== a))) || f;
  if (u !== R.tgt && ((R.tgt = u), (R.tgtHitT = e), (R.tgtD = u ? jxdE(H, u) : 1e9), o.size > 50))
    for (const [c, m] of o) (m <= e || c.dead) && o.delete(c);
  return u;
}
// pool: monsters the actor may pick as target (a disciple: the ones near its leader, js/party.js)
function heroAttack(pool) {
  const t = R.P,
    n = alive();
  if (!n.length) return 0.3;
  const e = heroTarget(pool && pool.length ? pool : n);
  let o = pickAttack(t, e.cls === "boss" || e.cls === "elite" || !!e.goldBoss);
  if (!o) return 0.25;
  o.id === DASH_ID && (o = t.basic);
  const i = Math.hypot(e.x - H.x, e.y - H.y) - (e.r || 15);
  {
    const c = dashTry(t, e, i);
    if (c) return c;
  }
  if (i > o.rad + 300 && autoRide()) setMount(!0, !0);
  else if (i <= o.rad + 60) {
    const c = rideForAttack(o);
    if (c === !0) return 0.25;
    c === null && (o = t.basic);
  }
  const s = (S.closeAtk && !manual() ? Math.min(o.rad, 75) : (o.rad || 80)) + 12;
  if (i > s || !obsSee(H.x, H.y, e.x, e.y)) return ((R.moveTo = manual() ? null : e), 0.05);
  ((R.moveTo = null),
    (R.tgtHitT = R.clock || 0),
    (R.tgtD = 0),
    skPay(o),
    o.cd && ((R.skCd = R.skCd || {})[o.id] = (R.clock || 0) + o.cd));
  const r = o.around ? H : e;
  const isAoe = o.around || o.form === 6 || o.form === 7 || o.form === 12 || (o.rad && o.rad >= 120) || (o.targets > 1) || (o.nMis > 1);
  const maxTargets = isAoe ? Math.max(o.targets || 1, o.around ? 8 : (o.form === 6 || o.form === 12 ? 6 : 4)) : (o.targets || 1);
  const aoeRadius = o.around
    ? Math.max(180, (o.rad || 120) + 40)
    : Math.max(140, Math.min(260, (o.rad ? o.rad * 0.65 : 140)));
  const f = o.geo
    ? geoTargets(o, e, n)
    : (maxTargets > 1
        ? n
            .filter((c) => {
              if (c === e || c.dead || c.hp <= 0) return false;
              const dist = Math.hypot(c.x - r.x, c.y - r.y) - (c.r || 15);
              return dist <= aoeRadius && obsSee(r.x, r.y, c.x, c.y);
            })
            .sort((a, b) => Math.hypot(a.x - r.x, a.y - r.y) - Math.hypot(b.x - r.x, b.y - r.y))
            .slice(0, maxTargets - 1)
        : []);
  f.unshift(e);
  skillFx(H, e, o);
  for (const c of f) {
    const dmg = heroHit(o, c);
    recHit(dmg, o);
    // 120 Ngũ Độc - Hấp Tinh Yểm (yểm độc theo sát thương)
    if (S.sk && S.sk[711] && typeof sk120Scale == "function" && Math.random() * 100 < sk120Scale(S.sk[711], 1, 15)) {
      const pDmg = dmg * (sk120Scale(S.sk[711], 30, 85) / 100);
      c.poisonDmg = ((c.poison > 0 ? c.poisonDmg * c.poison : 0) + pDmg) / 3;
      c.poison = 3;
      addText(c.x, c.y - (c.r || 30) - 20, "Hấp Tinh Yểm", "#7cff7c", 11);
    }
    // 120 Cái Bang - Hỗn Thiên Khí Công (giảm kháng quái)
    if (S.sk && S.sk[714] && typeof sk120Scale == "function" && Math.random() * 100 < sk120Scale(S.sk[714], 1, 6) && !c.cb120) {
      const pRed = sk120Scale(S.sk[714], 2, 10);
      const fRed = sk120Scale(S.sk[714], 3, 15);
      c.cb120 = { t: sk120Scale(S.sk[714], 3, 9), p: pRed, f: fRed };
      c.res = c.res || { phys: 25, fire: 25, cold: 25, light: 25, poison: 25 };
      c.res.phys = (c.res.phys || 0) - pRed;
      c.res.fire = (c.res.fire || 0) - fRed;
      addText(c.x, c.y - (c.r || 30) - 20, "Hỗn Thiên Khí Công", "#ffb86b", 11);
    }
  }
  return (
    o.ev && stage2(o, e, n, f),
    (H.face = e.x >= H.x ? 1 : -1),
    (H.dir = dirOf(e.x - H.x, e.y - H.y)),
    (H.act = "at"),
    (H.lastAtkT = performance.now()),
    (H.actT = 0),
    (H.castSk = o.id || 0),
    o.id ? skillSfx(o.id) : npcSfx(heroGfx() && heroGfx().anim, "at", 0.4),
    1 / o.rate
  );
}
function enemyAI(t, n) {
  const crs = t.curse && typeof curseMod == "function" ? curseMod(t) : null;
  if (t.resBrkT > 0) t.resBrkT -= n;
  if (crs && crs.regen < 0) {
    const drain = Math.abs(crs.regen) * (15 + (t.L || 1) * 2);
    t.hp -= drain * n;
  }
  if (t.wb || t.isWbBoss) {
    t.stun = 0;
    t.slowT = 0;
  } else if (t.stun > 0) {
    t.stun -= n;
    return;
  }
  const e = t.slowT > 0 ? ((t.slowT -= n), ELEM_SLOW) : 1;
  const moveSpdMod = crs && crs.slowMove ? Math.max(0.2, 1 + crs.slowMove / 100) : 1;
  if ((t.poison > 0 && ((t.poison -= n), (t.hp -= t.poisonDmg * n)), t.home && fieldIdle(t, n))) return;
  // target: the nearest party member (js/party.js); T is its actor (H for the main character)
  const pk = typeof partyAggro == "function" ? partyAggro(t, n) : 0,
    T = pk ? pAct(pk).h : H,
    o = jxdE(t, T),
    i = t.ranged ? t.reach || 200 : Math.max((t.r + 24) / JX_K, Math.min(t.reach || 0, 90));
  ((t.seeT = (t.seeT || 0) - n) <= 0 && ((t.seeT = 0.25), (t.see = o > i + 4 || obsSee(t.x, t.y, T.x, T.y))),
    (t.moving = (o > i || !t.see) && navGo(t, T.x, T.y, t.spd * e * moveSpdMod * n, 1) > 0),
    // face the way it walks (around walls too); face its target when standing / attacking
    (t.moving && navFace(t)) || ((t.face = T.x >= t.x ? 1 : -1), (t.dir = dirOf(T.x - t.x, T.y - t.y))),
    navSep(t, R.enemies, 14),
    t.home && fieldLeash(t),
    (t.atkCd -= n * e),
    o <= i + 4 &&
      t.see &&
      t.atkCd <= 0 &&
      ((t.atkCd = (t.wb || t.isWbBoss) ? t.cd : t.cd * (crs ? (1 + (crs.slow || 0) / 100) * (1 - (crs.atkSpeed || 0) / 100) : 1)),
      pk ? withChar(pk, () => enemyHit(t)) : enemyHit(t),
      (t.act = "at"),
      (t.actT = 0),
      npcSfx(t.animKey || (t.tid != null && MON[t.tid] ? MON[t.tid].anim : (typeof heroGfx == "function" && heroGfx() ? heroGfx().anim : "mon_1")), "at", 0.35),
      t.ranged && fxLine(t, T, { parts: { phys: 1 } })));
}
function tick(t) {
  (obsFrame(),
    recTick(t),
    (R.sweepT = (R.sweepT || 0) + t) > 30 &&
      ((R.sweepT = 0),
      autoEquipAll(),
      typeof autoFuse == "function" && autoFuse(),
      typeof autoHut == "function" && autoHut(),
      sweepJunk(),
      autoBuyWeapon(),
      autoForge(),
      checkHints()),
    R.dirty && recalc());
  if (R.invulT > 0) R.invulT -= t;
  const n = R.P;
  if (R.deadT > 0) {
    R.deadT -= t;
    if (R.deadT <= 0) {
      R.life = n.life;
      R.mana = n.mana;
      if (R.dg && R.dg.kind === "worldboss") {
        const heroPos = (typeof inWorld === "function") ? inWorld(2150, 1130) : [2150, 1130];
        H.x = heroPos[0] - 120;
        H.y = heroPos[1];
        H.act = "st";
        H.actT = 0;
        R.invulT = 2;
        addText(H.x, H.y - 40, "Hồi sinh tiếp tục chiến đấu!", "#ffd700", 14);
        if (typeof toast === "function") toast("Đã hồi sinh! Hãy tiếp tục tiến vào khiêu chiến Boss!");
      } else {
        S.wave = 1;
        fieldMode() || spawnWave();
      }
    }
    return;
  }
  if (
    ((R.life = Math.min(n.life, R.life + n.regen * t)),
    (R.mana = Math.min(n.mana, R.mana + n.manaRegen * t)),
    autoPotion(t),
    rideTick(t),
    R.hpDotT > 0)
  ) {
    const o = Math.min(t, R.hpDotT) / R.hpDotT;
    ((R.life -= R.hpDot * o), (R.hpDot -= R.hpDot * o), (R.hpDotT -= t));
  }
  if (
    (R.slowT > 0 && (R.slowT -= t),
    R.stunT > 0 && (R.stunT -= t),
    R.hurtT > 0 && (R.hurtT -= t),
    R.tpCd > 0 && (R.tpCd -= t),
    R.potCd && ((R.potCd.life = Math.max(0, R.potCd.life - t)), (R.potCd.mana = Math.max(0, R.potCd.mana - t))),
    goldBossTick(t),
    typeof skill120Tick == "function" && skill120Tick(t),
    typeof partyTick == "function" && partyTick(t),
    ghTick(t),
    typeof skillSysTick == "function" && skillSysTick(t),
    typeof othTick == "function" && othTick(t),
    R.town)
  ) {
    townTick(t);
    return;
  }
  (dgTick(t), (R.activeT = (R.activeT || 0) + t));
  const e = updateGround(t);
  if ((fieldMode() && fieldTick(t), !R.enemies.length)) {
    if (fieldMode()) return;
    if (e && R.lootWait < 8) {
      R.lootWait += t;
      return;
    }
    if (R.spawnT > 0) {
      R.spawnT -= t;
      return;
    }
    ((R.lootWait = 0), R.dg ? dgSpawn() : R.tower ? towerSpawn() : (spawnWave(), goldBossDue() && spawnGoldBoss()));
    return;
  }
  if (R.dashTrail) {
    for (const o of R.dashTrail) o.t += t;
    ((R.dashTrail = R.dashTrail.filter((o) => o.t < 0.3)), R.dashTrail.length || (R.dashTrail = null));
  }
  if (dashTick(t)) {
    for (const o of alive()) enemyAI(o, t);
    killCheck();
    return;
  }
  (manual() && moveManual(t),
    (e && R.pickTarget) ||
      (manual() ||
        (R.moveTo &&
          R.moveTo.hp > 0 &&
          !e &&
          !heroCasting() &&
          (R.stunT > 0 || obsSteer(H, R.moveTo.x, R.moveTo.y, 150 * curSpeed() * (R.slowT > 0 ? ELEM_SLOW : 1) * t))),
      R.stunT > 0 || ((R.atkT -= t * (R.slowT > 0 ? ELEM_SLOW : 1)), R.atkT <= 0 && !heroWantsMove() && (R.atkT = heroAttack()))));
  for (const o of alive()) enemyAI(o, t);
  (killCheck(), (R.stall += t), (R.tower ? R.stall > 180 : R.stall > 45) && stallOut(), R.life <= 0 && heroDeath());
}
function stallOut() {
  if (((R.stall = 0), R.dg)) return;
  if (R.tower) {
    log(`<span class="bad">Hết thời gian khiêu chiến tháp tầng ${R.tower.floor} (3 phút).</span>`);
    typeof toast === "function" && toast(`Hết thời gian khiêu chiến tháp tầng ${R.tower.floor}`);
    towerExit(!1);
    return;
  }
  if (fieldMode()) {
    ((R.field = null), log('<span class="dim">Lâu không hạ được quái, dàn lại bãi quái.</span>'));
    return;
  }
  (R.enemies.some((n) => !n.dead && n.cls === "boss") || S.wave === WAVES
    ? (R.enemies.some((n) => n.goldBoss && !n.dead) && (RW().gbT = GB_RETRY),
      log('<span class="dim">Đánh mãi không hạ được, gọi quái mới.</span>'),
      (S.wave = 1),
      (R.round = (R.round || 0) + 1),
      typeof onStageChange == "function" && onStageChange())
    : log('<span class="dim">Đợt quái kéo dài quá lâu, gọi đợt mới.</span>'),
    spawnWave());
}
function killCheck() {
  for (const t of R.enemies)
    t.hp <= 0 &&
      !t.dead &&
      ((t.dead = !0),
      onKill(t),
      npcSfx(MON[t.tid] ? MON[t.tid].anim : (heroGfx() && heroGfx().anim), "die", 0.5),
      R.quiet || ((t.act = "die"), (t.actT = 0), R.corpses.push(t)));
  !fieldMode() && !(R.dg && R.dg.kind === "worldboss") && R.enemies.length && R.enemies.every((t) => t.dead) && ((R.enemies = []), waveCleared());
}
// EXP of a kill for the character in S (the main, or a disciple swapped in by withChar)
// EXP from kills, every map / zone / dungeon, main and disciples (balance: 1/4 of the original idle game rate)
const KILL_XP_RATE = 0.25;
function killXp(t) {
  const e = xpPenK(t.L - Math.min(BASE_CAP, S.lvl));
  return (
    expFor(Math.min(t.L, Math.min(BASE_CAP, S.lvl) + expCfg("over", XP_OVER))) * expCfg("classXp." + t.cls, CLS[t.cls].xp) * newbieXp() * e * diffOf().rew * xpMonK(t.L) * densK(t) *
    expCfg("killRate", KILL_XP_RATE) * xpZoneK()
  );
}
function onKill(t) {
  (R.kills++, (S.totalKills = (S.totalKills || 0) + 1), (R.stall = 0), fieldOnKill());
  const o = gainXp(killXp(t)),
    i = Math.round(moneyDrop(t) * diffOf().rew * monRewK(t.L) * hpRatio(t.L) * densK(t) * dropCfg("mul.money", 1) * dropCfg("cls." + t.cls + ".money", 1));
  ((S.gold += i),
    o >= 1 &&
      log(`<span class="xpl">Nhận được <b>${Math.round(o).toLocaleString("vi-VN")}</b> điểm kinh nghiệm</span>`),
    i > 0 && t.cls !== "boss" && log(`<span class="gdl">Nhặt được <b>${fmtL(i)}</b> lượng</span>`),
    burst(t.x, t.y, SERIES_COL[t.series]));
  for (const r of rollDrops(t)) dropToGround(r, t);
  for (const r of allDrops(t)) log(`Nhặt được <b style="color:#7fd0ff">${esc(r)}</b>`);
  const s = rollSetDrop(t);
  (s && (dropToGround(s, t), log(`<b style="color:${RAR_COL[s.r]}">${esc(s.n)}</b> rơi ra!`)),
    t.cls === "boss" && log(`Hạ <b class="boss">${esc(t.n)}</b> (+${fmtL(i)} lượng)`),
    rwOnKill(t),
    recKill(t, i),
    horseOnKill(t),
    ghOnKill(t),
    sk9OnKill(t),
    typeof expSkillOnKill == "function" && expSkillOnKill(t),
    typeof partyOnKill == "function" && partyOnKill(t));
}
function expSkillOnKill(t) {
  if (typeof skTrainMap != "function" || !S || !S.fac) return;
  const tm = skTrainMap();
  const clsMul = t.cls === "boss" ? 10 : t.cls === "elite" ? 3 : 1;
  const lvMul = t.L >= 200 ? 1.5 : t.L < 150 ? 0.5 : 1;
  const goldHourMul = (typeof isGoldHour == "function" && isGoldHour()) ? 2 : 1;
  const xpBase = Math.round(1 * clsMul * lvMul * goldHourMul);

  // 1. Kỹ năng 120 của môn phái nhận exp mỗi khi hạ bất kỳ quái nào
  const sk120Id = typeof sk120IdOf == "function" ? sk120IdOf(S.fac) : 0;
  if (sk120Id && tm[sk120Id] && typeof addSkillExp == "function") {
    addSkillExp(sk120Id, xpBase);
  }

  // 2. Kỹ năng 150 đang đặt làm chiêu tấn công chính nhận exp khi đánh quái
  let castId = H.castSk || (R.P && R.P.main ? R.P.main.id : 0);
  if (typeof SK15_PART !== "undefined" && SK15_PART[castId]) castId = SK15_PART[castId];
  if (castId && castId !== sk120Id && tm[castId] && SK[castId] && SK[castId].exp && typeof addSkillExp == "function") {
    addSkillExp(castId, xpBase);
  } else if (R.P && R.P.main && R.P.main.id && tm[R.P.main.id] && SK[R.P.main.id] && SK[R.P.main.id].exp && typeof addSkillExp == "function") {
    addSkillExp(R.P.main.id, xpBase);
  }
}
function skill120Tick(t) {
  if (!S || !S.fac || !S.sk || R.town || R.deadT > 0 || !R.P) return;
  const now = performance.now();
  const s120 = R.s120 || (R.s120 = { cd: {}, buff: {} });

  if (S.sk[710] && typeof sk120Scale == "function" && (s120.cd[710] || 0) <= now) {
    const lv = S.sk[710];
    const interval = sk120Scale(lv, 30, 15) * 1000;
    const dur = 6000;
    const dmgBonus = sk120Scale(lv, 20, 60);
    s120.cd[710] = now + interval;
    s120.buff[710] = { until: now + dur, dmgBonus };
    addText(H.x, H.y - 50, "👥 Mê Ảnh Tung", "#bfe8ff", 12);
  }

  const hpRatio = R.life / (R.P.life || 1);

  if (S.sk[713] && typeof sk120Scale == "function" && hpRatio < 0.5 && (s120.cd[713] || 0) <= now) {
    const lv = S.sk[713];
    const dur = sk120Scale(lv, 5, 30) * 1000;
    const cd = sk120Scale(lv, 60, 40) * 1000;
    s120.cd[713] = now + cd;
    s120.stealth = now + dur;
    addText(H.x, H.y - 50, "❄ Ngự Tuyết Ẩn", "#7fd0ff", 12);
  }

  if (S.sk[715] && typeof sk120Scale == "function" && (s120.cd[715] || 0) <= now) {
    const lv = S.sk[715];
    const nearEnemies = R.enemies.filter(e => !e.dead && Math.hypot(e.x - H.x, e.y - H.y) < 140);
    if (nearEnemies.length >= 3 || hpRatio < 0.4) {
      const dur = sk120Scale(lv, 1, 4);
      const cd = sk120Scale(lv, 45, 20) * 1000;
      s120.cd[715] = now + cd;
      for (const e of R.enemies) {
        if (!e.dead && Math.hypot(e.x - H.x, e.y - H.y) < 220) {
          e.stun = Math.max(e.stun || 0, dur);
        }
      }
      addText(H.x, H.y - 50, "Ma Âm Phệ Phách", "#ff6b6b", 12);
    }
  }

  if (S.sk[716] && typeof sk120Scale == "function" && hpRatio < 0.35 && (s120.cd[716] || 0) <= now) {
    const lv = S.sk[716];
    const dur = sk120Scale(lv, 1, 3) * 1000;
    const cd = sk120Scale(lv, 35, 15) * 1000;
    s120.cd[716] = now + cd;
    s120.immune = now + dur;
    addText(H.x, H.y - 50, "☯ Xuất Ứ Bất Nhiễm", "#ffe08a", 12);
  }

  if (S.sk[717] && typeof sk120Scale == "function" && hpRatio < 0.3 && (s120.cd[717] || 0) <= now) {
    const lv = S.sk[717];
    const shieldVal = (R.P.life || 1000) * (sk120Scale(lv, 10, 40) / 100);
    const dur = sk120Scale(lv, 5, 10) * 1000;
    const cd = 20 * 1000;
    s120.cd[717] = now + cd;
    s120.shield = shieldVal;
    s120.shieldUntil = now + dur;
    s120.speedBonus = sk120Scale(lv, 5, 35);
    addText(H.x, H.y - 50, "🛡 Lưỡng Nghi Chân Khí", "#6be3ff", 12);
  }

  if (S.sk[708] && typeof sk120Scale == "function") {
    const lv = S.sk[708];
    const regenRate = sk120Scale(lv, 0.2, 1) / 100;
    R.life = Math.min(R.P.life, R.life + R.P.life * regenRate * t);
  }
}
const XP_EVENT = 5;
function gainXp(t) {
  const n = levelCap();
  if (S.lvl >= n) return 0;
  let e =
    (t *
      expCfg("event", XP_EVENT) *
      (1 + rebornBonus().xp + (R.P && R.P.expPct ? R.P.expPct / 100 : 0)) *
      (1 + buffP("xp")) *
      (1 + buffP("tt"))) /
    xpSlow(Math.min(BASE_CAP, S.lvl));
  const rb = typeof rebornN === "function" ? rebornN() : ((S && S.rw && S.rw.stat && S.rw.stat.reborn) || 0);
  if (S.lvl < 200) {
    e = Math.min(200000, e);
  } else if (rb >= 10 && S.lvl >= 200) {
    e = Math.min(2500, e);
  }
  let upCount = 0;
  for (S.xp += e; S.lvl < n && S.xp >= lvNeed(S.lvl) && upCount < 50; upCount++) {
    const need = lvNeed(S.lvl);
    if (!need || need <= 0) break;
    ((S.xp -= need),
      S.lvl++,
      (S.attrPts += PTS_PER_LEVEL),
      (S.skPts += SKILL_PTS_PER_LEVEL),
      (R.dirty = !0),
      uiSfx("levelup"),
      log(
        `<b class="up">${typeof PCTX < "u" && PCTX ? esc(S.name) + " lên" : "Lên"} cấp ${S.lvl}!</b> +${PTS_PER_LEVEL} tiềm năng, +${SKILL_PTS_PER_LEVEL} kỹ năng`,
      ),
      typeof onLevelUp == "function" && onLevelUp());
  }
  return e;
}
function waveCleared() {
  if (R.dg) {
    dgCleared();
    return;
  }
  if (R.tower) {
    towerCleared();
    return;
  }
  if ((heal(R.P.life * 0.15, !0), (R.mana = Math.min(R.P.mana, R.mana + R.P.mana * 0.2)), S.wave < WAVES)) {
    (S.wave++, (R.spawnT = 1.2 / mountHaste()));
    return;
  }
  ((S.wave = 1),
    (R.round = (R.round || 0) + 1),
    questTick("stages"),
    typeof onStageChange == "function" && onStageChange());
}
function heroDeath() {
  const isWbScene = (typeof WB !== "undefined" && WB.arena && WB.arena.on) || (typeof R !== "undefined" && R && R.dg && R.dg.kind === "worldboss");
  if (!isWbScene && typeof isGodMode == "function" && isGodMode() && R.P) {
    R.life = R.P.life;
    R.hpDot = R.hpDotT = 0;
    return;
  }
  if (isWbScene) {
    R.deadT = 2.5;
    R.life = 0;
    H.act = "die";
    H.actT = 0;
    R.slowT = R.stunT = R.hpDotT = R.hpDot = 0;
    log('<span class="bad">Bạn đã bị Boss Thế Giới hạ gục! Sẽ hồi sinh sau 2.5s để tiếp tục chiến đấu...</span>');
    addText(H.x, H.y - 40, "Trọng thương! Chờ hồi sinh...", "#ff3333", 14);
    return;
  }
  if (
    (R.enemies.some((t) => t.goldBoss && !t.dead) && (RW().gbT = GB_RETRY),
    (R.deadT = 3),
    (R.life = 0),
    (R.enemies = []),
    recDeath(),
    (R.slowT = R.stunT = R.hpDotT = R.hpDot = 0),
    log('<span class="bad">Bạn đã trọng thương.</span>'),
    R.dg)
  ) {
    if (R.dg.kind === "worldboss") {
      R.deadT = 2.5;
      R.life = 0;
      H.act = "die";
      H.actT = 0;
      log('<span class="bad">Bạn đã bị Boss Thế Giới hạ gục! Sẽ hồi sinh sau 2.5s để tiếp tục chiến đấu...</span>');
      addText(H.x, H.y - 40, "Trọng thương! Chờ hồi sinh...", "#ff3333", 14);
      return;
    }
    dgFail("Gục ngã");
    return;
  }
  if (R.tower) {
    towerExit(!0);
    return;
  }
  typeof onStageChange == "function" && onStageChange();
}
function recalc() {
  typeof sk9SyncBranch == "function" && sk9SyncBranch();
  const t = R.P ? R.life / R.P.life : 1,
    n = R.P ? R.mana / R.P.mana : 1;
  ((R.P = calc()),
    (R.life = Math.min(R.P.life, R.P.life * t)),
    (R.mana = Math.min(R.P.mana, R.P.mana * n)),
    (R.power = powerShown(power(R.P))),
    (R.dirty = !1));
  const e = curEqt();
  if (
    (R.padEqt !== e &&
      ((R.padEqt = e), typeof renderPad == "function" && document.querySelector("#pad") && renderPad()),
    typeof heroLook == "function" && (R.look = heroLook()),
    typeof jxSetup == "function")
  ) {
    const o = R.jx && R.jx.key;
    ((R.jx = jxOn() ? jxSetup() : null), R.jx && R.jx.key !== o && jxPreload());
  }
}
function simulate(t, n = 0.05) {
  const e = R.quiet;
  R.quiet = !0;
  for (let o = 0; o < t; o += n) tick(n);
  R.quiet = e;
}
