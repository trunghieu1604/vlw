"use strict";
const ATTR_ALIAS = {
    lifemax_yan_v: "lifemax_v",
    lifemax_yan_p: "lifemax_p",
    manamax_yan_v: "manamax_v",
    allres_yan_p: "allres_p",
    physicsres_yan_p: "physicsres_p",
    poisonres_yan_p: "poisonres_p",
    coldres_yan_p: "coldres_p",
    fireres_yan_p: "fireres_p",
    lightingres_yan_p: "lightingres_p",
    attackspeed_yan_v: "attackspeed_v",
    castspeed_yan_v: "castspeed_v",
    sorbdamage_yan_p: "sorbdamage_p",
    fasthitrecover_yan_v: "fasthitrecover_v",
    anti_allres_yan_p: "anti_allres_p",
    anti_coldres_yan_p: "anti_coldres_p",
    anti_lightingres_yan_p: "anti_lightingres_p",
  },
  NEWBIE_LV = 30,
  NEWBIE_REGEN = { life: 0.03, mana: 0.05 },
  NEWBIE_XP = 2,
  newbieXp = () => (typeof S < "u" && S && S.fac && expCfg("newbie.on", !0) && S.lvl < expCfg("newbie.maxLv", NEWBIE_LV) ? 1 + expCfg("newbie.bonus", NEWBIE_XP) : 1),
  newbieOn = () => typeof S < "u" && S && S.fac && S.lvl < NEWBIE_LV,
  ATTR_NOEFFECT = new Set([
    "indestructible_b",
    "staminareplenish_v",
    "staminamax_v",
    "pk_punish_weaken",
    "durability_v",
    "item_purple",
  ]);
function addAttr(t, n, e, s = 1) {
  n = ATTR_ALIAS[n] || n;
  const i = t[n] || (t[n] = [0, 0, 0]);
  for (let o = 0; o < 3; o++) i[o] += (e[o] || 0) * s;
}
const av = (t, n, e = 0) => (t[n] ? t[n][e] : 0),
  ACCRUE = { 0: 2, 2: 1, 1: 3, 3: 4, 4: 0 },
  accrues = (t, n) => t >= 0 && n >= 0 && ACCRUE[t] === n,
  ACTIVATED_BY = {
    helm: ["armor", "amulet"],
    armor: ["ring2", "belt"],
    belt: ["pendant", "cuff"],
    weapon: ["amulet", "armor"],
    boot: ["weapon", "helm"],
    cuff: ["boot", "ring1"],
    amulet: ["belt", "ring2"],
    ring1: ["weapon", "helm"],
    ring2: ["cuff", "pendant"],
    pendant: ["boot", "ring1"],
  };
function slotOfEquipped(t, n) {
  for (const e in n) if (n[e] === t) return e;
  return null;
}
function hiddenActive(t, n = S.eq) {
  if (t.leg || (t.set && t.d === 10) || enoughToActive(n)) return 10;
  const e = slotOfEquipped(t, n);
  if (!e) return 0;
  if (e === "horse") return 3;
  let s = accrues(heroSeries(), t.s) ? 1 : 0;
  for (const i of ACTIVATED_BY[e] || []) n[i] && accrues(n[i].s, t.s) && s++;
  return s;
}
function heroStart() {
  const t = FAC[S.fac];
  return J.start[t.series * 2 + (S.sex || 0)] || J.start[0];
}
function heroSeries() {
  return FAC[S.fac] ? FAC[S.fac].series : 0;
}
function weaponCode(t) {
  const n = t.weapon;
  return n ? (n.d === 1 ? 7 : n.k === 6 ? 9 : n.k) : 9;
}
function skillBonusLv(t) {
  const n = R.P;
  return n ? (n.plusSkill || 0) + ((n.skAdd || {})[t] || 0) : 0;
}
const skCostLife = (t) => !!t && t.cost === 2,
  skCanPay = (t) => (t.costLife ? R.life - t.cost >= R.P.life * 0.25 : R.mana >= t.cost),
  skPay = (t) => {
    t.costLife ? (R.life = Math.max(1, R.life - t.cost)) : (R.mana -= t.cost);
  },
  skLv = (t) => {
    const n = (S.sk && S.sk[t]) || 0;
    return n ? n + skillBonusLv(+t) : 0;
  };
function passiveApplies(t, n, e, s) {
  if (n === "addphysicsdamage_p" || n === "attackratingenhance_p" || n === "deadlystrikeenhance_p") {
    const i = t.attr.addphysicsdamage_p ? skVal(t, "addphysicsdamage_p", 1)[2] : -1;
    if ([0, 1, 2, 3, 4, 5, 7, 9].includes(i)) return s === i;
  }
  return !0;
}
const SKIP_PASSIVE = /^(skill_|missle_|addskilldamage)/;
let IGNORE_REQ = null;
const reqPass = (t) => t === IGNORE_REQ || reqOk(t),
  VIO_MUL = 1.8;
function calc(t) {
  t = t || S.eq;
  const n = {},
    e = S.lvl,
    s = heroSeries(),
    i = J.levelAdd[s],
    o = heroStart(),
    c = {},
    f = (r, l = 1) => {
      const p = attrReal(attrName(r.a)),
        m = r.p.map((k, g) => (k === -1 ? 0 : g < 2 && l !== 1 ? k * l : k));
      if (p === "allskill_v") {
        const k = Math.round(Math.max(0, r.p[0] || 0)),
          g = r.p[2] > 0 ? r.p[2] : 0;
        g ? (c[g] = (c[g] || 0) + k) : addAttr(n, p, [k, 0, 0]);
        return;
      }
      addAttr(n, p, m);
    };
  let u = 0;
  for (const r in t) {
    const l = t[r];
    if (!l || !reqPass(l)) continue;
    const p = r === "horse" ? av(n, "fastwalkrun_p") : 0,
      m = enhMul(l);
    for (const [v, M, I] of l.base)
      addAttr(n, attrName(v), [horseAdj(l, (v === 28 || v === 29 ? M : (M + I) / 2) * m), 0, 0]);
    const k = hiddenActive(l, t),
      g = r === "horse" ? 1 : enhLineMul(l),
      V = (l.vio ? VIO_MUL : 1) * g;
    if (
      ((l.mag || []).forEach((v, M) => {
        (M % 2 === 0 || Math.floor(M / 2) < k) && f(v, V);
      }),
      l.set)
    ) {
      const v = goldEnhance(l, t);
      (l.ext || []).slice(0, v).forEach((M) => f(M, g));
    }
    r === "horse" && (u = av(n, "fastwalkrun_p") - p);
  }
  const h = weaponCode(t),
    d = Math.round(av(n, "allskill_v")),
    a = { A: n, plusSkill: d, skAdd: c },
    _ = (r) => S.sk[r] + d + (c[r] || 0);
  for (const r in S.sk) {
    const l = SK[r];
    if (!l || !S.sk[r] || isAttack(l) || (typeof skApplies == "function" && !skApplies(l))) continue;
    const p = _(r);
    for (const m in l.attr) {
      if (SKIP_PASSIVE.test(m)) continue;
      const k = skVal(l, m, p);
      k && passiveApplies(l, m, k, h) && addAttr(n, m, k);
    }
  }
  (titleAttr(n),
    horseAttr(n),
    typeof partyAuraAttr == "function" && partyAuraAttr(n, h),
    (a.rebDmg = 1 + rebornBonus().dmg),
    (a.dmgMul = a.rebDmg * HERO_DMG_K),
    (a.str = o.str + S.attr.str + av(n, "strength_v")),
    (a.dex = o.dex + S.attr.dex + av(n, "dexterity_v")),
    (a.vit = o.vit + S.attr.vit + av(n, "vitality_v")),
    (a.eng = o.eng + S.attr.eng + av(n, "energy_v")),
    (a.series = s),
    (a.life =
      (o.life +
        (e - 1) * (i.LifePerLevel + IDLE_LIFE_PER_LEVEL) +
        (a.vit - o.vit) * i.LifePerVitality +
        av(n, "lifemax_v")) *
      (1 + av(n, "lifemax_p") / 100)),
    (a.mana =
      (o.mana + (e - 1) * i.ManaPerLevel + (a.eng - o.eng) * i.ManaPerEnergy + av(n, "manamax_v")) *
      (1 + av(n, "manamax_p") / 100)),
    (a.life = Math.max(50, a.life)),
    (a.mana = Math.max(20, a.mana)),
    (a.regen = 1 + e * 0.08 + av(n, "lifereplenish_v") + (a.life * av(n, "lifereplenish_p")) / 1e4),
    (a.manaRegen = 1 + e * 0.05 + av(n, "manareplenish_v") + a.eng * 0.02),
    (a.arBase = a.dex * 4 - 28 + av(n, "attackrating_v") + av(n, "attackratingenhance_v")),
    (a.arPct = av(n, "attackratingenhance_p") + av(n, "attackrating_p")),
    (a.ar = Math.max(10, a.arBase * (1 + a.arPct / 100))),
    (a.newbie = newbieOn()),
    a.newbie && ((a.regen += a.life * NEWBIE_REGEN.life), (a.manaRegen += a.mana * NEWBIE_REGEN.mana)),
    (a.def =
      Math.max(0, a.dex / 4 + av(n, "adddefense_v") + av(n, "armordefense_v")) *
      (1 + av(n, "armordefenseenhance_p") / 100)));
  const C = { phys: i.physicres, poison: i.poisonres, cold: i.coldres, fire: i.fireres, light: i.lightingres };
  ((a.res = {}),
    (a.resMax = PLAYER_RES_MAX + av(n, "allresmax_p") + REBORN_RES * (typeof rebornN == "function" ? rebornN() : 0)));
  for (const r of ELEM) a.res[r] = clamp(C[r] + av(n, ELEM_RES[r]) + av(n, "allres_p"), -100, a.resMax);
  const w = t.weapon && reqPass(t.weapon) ? t.weapon : null,
    x = !!(w && w.d === 1),
    A = av(n, "weapondamagemin_v") || 1,
    b = av(n, "weapondamagemax_v") || 2,
    T = x ? a.dex / DEX_PER_DMG : a.str / STR_PER_DMG;
  ((a.wmin = A + T + av(n, "addphysicsdamage_v")),
    (a.wmax = b + T + av(n, "addphysicsdamage_v")),
    (a.physPct = av(n, "addphysicsdamage_p") + av(n, "weapondamageenhance_p")),
    (a.spellW = 1),
    (a.physStat = 1),
    (a.add = {}));
  for (const r of ELEM) r !== "phys" && (a.add[r] = av(n, ELEM_ADD[r]));
  a.enh = {};
  for (const r in ELEM_ENH) a.enh[r] = av(n, ELEM_ENH[r]);
  ((a.crit = clamp(av(n, "deadlystrikeenhance_p") + av(n, "deadlystrike_p"), 0, 75)),
    (a.aspdP = clamp(1 + av(n, "attackspeed_v") / 100, 0.5, 3)),
    (a.aspdC = clamp(0.9 * (1 + av(n, "castspeed_v") / 100), 0.45, 2.7)),
    (a.aspd = a.aspdP),
    (a.leech = av(n, "steallife_p") + av(n, "steallifeenhance_p")),
    (a.manaLeech = av(n, "stealmana_p") + av(n, "stealmanaenhance_p")),
    (a.ignoreDef = av(n, "ignoredefense_p")),
    (a.retMelee = av(n, "meleedamagereturn_v")),
    (a.retMeleeP = av(n, "meleedamagereturn_p")),
    (a.series5 = av(n, "five_elements_enhance_v")),
    (a.res5 = av(n, "five_elements_resist_v")),
    (a.seriesSkill = 0),
    (a.lucky = av(n, "lucky_v") + (typeof buffP == "function" ? buffP("luck") : 0)),
    (a.speed = 1 + av(n, "fastwalkrun_p") / 100),
    (a.speedFoot = 1 + (av(n, "fastwalkrun_p") - u) / 100),
    (a.manaShield = clamp(av(n, "manashield_p"), 0, 90)),
    (a.skillEnh = av(n, "skill_enhance")),
    (a.heavy = clamp(av(n, "enhancehit_rate"), 0, 50)),
    (a.block = clamp(av(n, "block_rate"), 0, 50)),
    (a.dmgShield = av(n, "dynamicmagicshield_v")),
    (a.sorb = clamp(av(n, "sorbdamage_p"), 0, 60)),
    (a.anti = {}));
  for (const r of ELEM)
    a.anti[r] =
      av(n, "anti_allres_p") + av(n, "anti_" + (r === "phys" ? "physics" : r === "light" ? "lighting" : r) + "res_p");
  ((a.dmg2mana = av(n, "damage2addmana_p")),
    (a.retRangeP = av(n, "rangedamagereturn_p")),
    (a.stunAdd = av(n, "do_stun_p")),
    (a.expPct = av(n, "expenhance_p")),
    (a.stunRed = clamp(av(n, "stuntimereduce_p"), 0, 80)),
    (a.freezeRed = clamp(av(n, "freezetimereduce_p"), 0, 80)),
    (a.poisonRed = clamp(av(n, "poisontimereduce_p"), 0, 80)),
    (a.hitRec = clamp(av(n, "fasthitrecover_v"), 0, 90)),
    (a.vision = clamp(av(n, "visionradius_p"), 0, 30)),
    (a.knock = clamp(av(n, "knockback_p"), 0, 40)),
    (a.antiMax = clamp(av(n, "anti_maxres_p"), 0, 240)),
    (a.antiStun = clamp(av(n, "anti_do_stun_p"), 0, 80)),
    (a.stunLong = clamp(av(n, "anti_stuntimereduce_p"), 0, 200)),
    (a.breakRes = clamp(av(n, "anti_do_hurt_p"), 0, 60)),
    (a.antiBlock = av(n, "anti_block_rate")),
    (a.antiSorb = clamp(av(n, "anti_sorbdamage_yan_p"), 0, 60)),
    (a.magAdd = {
      phys: av(n, "addphysicsmagic_v"),
      poison: av(n, "addpoisonmagic_v"),
      cold: av(n, "addcoldmagic_v"),
      fire: av(n, "addfiremagic_v"),
      light: av(n, "addlightingmagic_v"),
    }),
    (a.ranged = x),
    (a.skillBonus = {}));
  for (const r in S.sk) {
    const l = SK[r];
    if (!(!l || !S.sk[r])) {
      for (const p in l.attr)
        if (p.startsWith("addskilldamage")) {
          const m = skVal(l, p, _(r));
          m && m[0] && (a.skillBonus[m[0]] = (a.skillBonus[m[0]] || 0) + m[2]);
        }
    }
  }
  a.actives = [];
  const L = [],
    O = curEqt();
  for (const r in S.sk) {
    const l = SK[r];
    if (S.sk[r] && isAttack(l) && (!isTrapSk(l) || (S.mainLock && +S.main == +r))) {
      const p = activeInfo(a, l, _(r));
      (L.push(p), (skWOk(l, O) || (R.ignoreEqt && R.ignoreEqt.has(skEqt(l)))) && a.actives.push(p));
    }
  }
  a.basic = basicAttack(a);
  const N = a.manaRegen + manaPotRate(e);
  for (const r of a.actives) {
    const l = r.costLife ? 0 : r.cost * r.rate;
    ((r.sustain = l > 0 ? Math.min(1, N / l) : 1), (r.dps = r.dps * r.sustain));
  }
  const E = a.actives.concat([a.basic]).sort((r, l) => l.dps - r.dps),
    q = new Set(
      S.inv
        .concat(S.eq.weapon ? [S.eq.weapon] : [])
        .filter((r) => r.d <= 1 && reqOk(r))
        .map(itEqt),
    ),
    y = L.filter((r) => {
      const l = skEqt(SK[r.id]);
      return l === null || q.has(l);
    }).sort((r, l) => l.dps - r.dps)[0];
  return (
    (a.wantId = y && y.dps > a.basic.dps ? y.id : 0),
    (a.main = (S.mainLock && (S.main === "basic" ? a.basic : a.actives.find((r) => r.id === S.main))) || E[0]),
    (a.bestAuto = E[0]),
    a
  );
}
const SK_TPC = { 19: 5, 20: 54, 40: 36, 138: 40, 164: 25 },
  skMissiles = (t, n) => {
    const e = n ? skVal(t, "skill_misslenum_v", n) : null;
    return Math.max(1, e ? e[0] : t.childN || 1);
  },
  EV2 = {
    302: { n: "Truy Tinh Trục Điện", k: 0.15, el: "poison", max: 8 },
    339: { n: "Ngân Đao Xạ Nguyệt", col: 1, sid: 340, k: 0.8, el: "phys", max: 3 },
    336: { n: "Băng Tâm Tuyết Liên", col: 1, sid: 382, k: 0.25, el: "cold", max: 3 },
    353: { n: "Thiên Canh Độc Thủ", sid: 354, k: 0.3, el: "phys", poison: 0.1, max: 3 },
    362: { n: "Nghiệp Hỏa Phần Thành", sid: 363, k: 1, el: "fire", max: 5 },
    357: { n: "Long Chiến Vu Dã", col: 1, k: 1, el: "fire", max: 2 },
    328: { n: "Ngọc Tuyền Tẩy Trần", sid: 329, self: !0, k: 0.35, el: "phys", max: 3 },
    380: {
      n: "Kim Đỉnh Phật Quang",
      sid: 331,
      k: 0.35,
      el: "cold",
      max: 4,
      rays: (t) => clamp(1 + Math.floor((t - 11) / 3), 1, 4),
    },
    337: { n: "Phong Tuyết Băng Thiên", sid: 338, k: 0.35, el: "cold", max: 3 },
    355: { n: "Tinh Không Phá", col: 1, sid: 383, k: 0.35, el: "poison", max: 3 },
    375: { n: "Bình Địa Hám Lôi", col: 1, k: 0.35, el: "light", max: 3 },
    372: { n: "Khiếu Phong Tam Liên Kích", col: 1, sid: 373, k: 0.35, el: "light", max: 3 },
  },
  XUANYI_TAB = Array.from({ length: 20 }, (t, n) => [4 + 7 * (n + 1), 0, 296 + 59 * (n + 1)]);
for (const t of [163, 215, 368])
  EV2[t] = {
    n: "Thái Cực Kiếm Ý",
    k: 0,
    stun: 30,
    max: 3,
    self: !0,
    fx: "176",
    at16: {
      n: "Huyền Nhất Vô Tượng",
      el: "light",
      max: 3,
      col: 1,
      sid: 162,
      fx: "27",
      self: !1,
      castFx: "176",
      tab: { lightingdamage_v: XUANYI_TAB },
    },
  };
const ev2Sk = (t, n) =>
  n._sk || (n._sk = Object.assign({}, SK[t], { id: n.sid || t, phys: 0, aura: 0, attr: Object.assign({}, n.tab) }));
function ev2Parts(t, n) {
  if (n.tab && typeof R < "u" && R.P) {
    const i = activeInfo(R.P, ev2Sk(t.id, n), Math.min(t.L, 20)).parts || {};
    return { [n.el]: i[n.el] || 0 };
  }
  const e = n.sid ? ev2SupF(t.id, n.sid) : 1,
    s = {};
  return (n.k > 0 && (s[n.el] = t.tot * n.k * e), n.poison && (s.poison = (s.poison || 0) + t.tot * n.poison * e), s);
}
function ev2SupF(t, n) {
  const e = typeof R < "u" && R.P;
  if (!e || !e.skillBonus) return 1;
  const s = (e.seriesSkill || 0) + (e.skillEnh || 0);
  return (1 + ((e.skillBonus[n] || 0) + s) / 100) / Math.max(0.01, 1 + ((e.skillBonus[t] || 0) + s) / 100);
}
const ev2Of = (t) => {
    const n = t && t.ev && EV2[t.id];
    return n ? (n.at16 && t.L >= 16 ? n._16 || (n._16 = Object.assign({}, n, n.at16, { stun: n.stun })) : n) : null;
  },
  ev2Exp = (t) => {
    const n = ev2Of(t);
    return n
      ? ((n.tab
          ? Object.values(ev2Parts(t, n)).reduce((s, i) => s + i, 0) / Math.max(1, t.tot)
          : (n.k + (n.poison || 0)) * (n.sid ? ev2SupF(t.id, n.sid) : 1)) *
          (n.chance || 1) *
          Math.min(ev2Max(t, n), 2.2)) /
          expectedHits(t)
      : 0;
  },
  ev2Max = (t, n) => (n.rays ? n.rays(t.L) : n.max),
  SK_EVENTS = ["skill_startevent", "skill_collideevent", "skill_flyevent", "skill_vanishedevent"],
  skEventLv = (t) => {
    let n = 0;
    for (const e of SK_EVENTS) {
      const s = (t.attr || {})[e];
      if (!s) continue;
      const i = s.findIndex((o) => o && o[0] === 1);
      i >= 0 && (n = n ? Math.min(n, i + 1) : i + 1);
    }
    return n;
  },
  skEvent = (t, n) => {
    const e = skEventLv(t);
    return !!e && n >= e;
  },
  MIS_GEO = {
    216: [1, 360, 0, 4],
    66: [0, 300, 0, 4],
    77: [0, 0, 0, 6],
    86: [0, 0, 1, 4],
    61: [1, 496, 0, 1],
    272: [1, 480, 1, 1],
    317: [4, 3e4, 0, 3],
    135: [0, 0, 0, 6],
    136: [1, 640, 0, 1],
    405: [0, 0, 1, 3],
    219: [1, 0, 0, 4],
    404: [0, 0, 0, 0],
    406: [0, 0, 0, 3],
    221: [1, 180, 1, 1],
    222: [1, 280, 0, 1],
    224: [5, 300, 0, 2],
    220: [0, 240, 1, 1],
    225: [0, 0, 0, 1],
    407: [0, 0, 0, 3],
    326: [1, 768, 1, 1],
    327: [1, 576, 0, 1],
    408: [0, 0, 1, 5],
    35: [7, 960, 1, 3],
    116: [1, 450, 1, 1],
    37: [1, 480, 1, 1],
    38: [0, 0, 0, 3],
    67: [5, 576, 1, 1],
    106: [0, 0, 1, 2],
    151: [100, 960, 0, 1],
    96: [0, 0, 0, 1],
    149: [1, 512, 0, 1],
    152: [100, 1024, 1, 1],
    30: [1, 240, 1, 1],
    31: [1, 496, 1, 1],
    32: [1, 496, 1, 1],
    190: [3, 480, 0, 3],
    33: [0, 0, 0, 3],
    34: [1, 496, 1, 2],
    163: [0, 0, 0, 3],
    165: [1, 640, 0, 1],
    68: [1, 384, 1, 1],
    2: [1, 640, 1, 1],
    101: [0, 0, 0, 2],
    191: [1, 512, 1, 1],
    3: [1, 320, 1, 1],
    4: [0, 0, 0, 5],
    142: [1, 512, 0, 1],
    186: [0, 0, 0, 3],
    6: [1, 360, 1, 1],
    7: [1, 416, 0, 2],
    8: [1, 0, 1, 2],
    12: [0, 0, 0, 3],
    9: [0, 0, 1, 2],
    10: [0, 0, 0, 8],
    146: [1, 768, 1, 1],
    147: [1, 480, 0, 1],
    45: [1, 496, 1, 1],
    46: [1, 496, 1, 1],
    47: [1, 496, 1, 1],
    48: [1, 160, 1, 1],
    166: [5, 1600, 1, 1],
    168: [5, 1280, 1, 1],
    54: [1, 240, 1, 1],
    57: [1, 400, 1, 3],
    55: [0, 0, 0, 2],
    56: [1, 288, 1, 1],
    69: [1, 72, 1, 1],
    58: [0, 0, 0, 4],
    169: [1, 192, 0, 1],
    171: [0, 0, 1, 1],
    24: [1, 320, 1, 1],
    25: [1, 320, 0, 1],
    26: [0, 0, 0, 3],
    28: [0, 0, 0, 4],
    29: [1, 320, 1, 1],
    110: [1, 128, 0, 1],
    173: [0, 0, 0, 4],
    175: [1, 192, 0, 1],
    14: [1, 300, 1, 1],
    17: [0, 0, 0, 2],
    15: [1, 480, 1, 1],
    16: [1, 1085, 0, 2],
    18: [0, 4, 1, 2],
    178: [1, 1085, 0, 4],
    181: [0, 12, 1, 2],
  },
  misGeo = (t) => (t && MIS_GEO[t.child]) || null,
  misLine = (t) => (t && t.form === 1 ? misGeo(t) : null);
function skGeo(t, n, e) {
  const s = misGeo(t),
    i = skMissiles(t, n),
    o = s && s[3] > 1 ? s[3] * 24 : 0,
    c = s ? Math.max(s[1], e) : e,
    f = !!s && !s[2],
    u = t.form;
  return u === 1
    ? { k: "line", n: i, len: c, pierce: f, area: o }
    : u === 2
      ? { k: "fan", n: i, len: c, pierce: f, area: o, half: Math.max(0.18, (i - 1) * 0.13 + 0.1) }
      : u === 0
        ? { k: "wall", n: i, len: c, pierce: f, area: o, w: Math.max(30, i * 18) }
        : u === 3
          ? { k: "ring", n: i, len: (s && s[1]) || e, pierce: f, area: o }
          : u === 7
            ? { k: "self", n: i, r: o || e + 40 }
            : u >= 4 && u <= 6
              ? { k: "spot", n: i, r: o || 0, scat: i > 1 ? 70 : 0 }
              : { k: "single", n: i };
}
function geoEst(t) {
  const n = (e) => (e >= 70 ? 3 : e >= 45 ? 2 : 1);
  switch (t.k) {
    case "line":
      return t.pierce ? 3 : t.area ? n(t.area) : 1;
    case "fan":
    case "wall":
    case "ring":
      return t.pierce ? 3 : Math.max(t.area ? n(t.area) : 1, Math.min(3, t.n));
    case "self":
      return 3;
    case "spot":
      return Math.max(n(t.r), Math.min(3, t.n > 1 ? t.n : 1));
    default:
      return 1;
  }
}
function skillTargets(t, n, e) {
  if (misGeo(t) && t.form < 8)
    return geoEst(skGeo(t, n, e || (skVal(t, "skill_attackradius", n) || [t.radius || 60])[0] || 60));
  const s = skMissiles(t, n);
  let i;
  switch (t.form) {
    case 0:
      i = s > 1 ? 3 : 2;
      break;
    case 1:
      i = 2;
      break;
    case 2:
      i = Math.min(3, 1 + Math.ceil(s / 3));
      break;
    case 3:
    case 4:
    case 5:
    case 6:
    case 7:
      i = 3;
      break;
    default:
      i = 1;
  }
  return i;
}
var ENG_MODE = 2;
const SK_TRIM = {
    10: 2,
    20: 2,
    11: 1.1,
    19: 0.9,
    271: 0.6,
    318: 1.95,
    319: 2,
    321: 2,
    29: 1.8,
    30: 1.7,
    34: 1.75,
    31: 2,
    35: 2,
    37: 2,
    40: 1.6,
    32: 2,
    41: 2,
    324: 1.9,
    322: 2,
    323: 2,
    325: 2,
    45: 0.6,
    347: 1.6,
    303: 2,
    47: 0.85,
    50: 0.75,
    54: 0.6,
    343: 2,
    345: 2,
    349: 2,
    58: 0.75,
    249: 0.5,
    341: 0.5,
    339: 0.7,
    63: 2,
    65: 1.15,
    68: 2,
    384: 1.9,
    71: 1.2,
    74: 1.05,
    353: 1.75,
    355: 2,
    80: 0.5,
    85: 0.55,
    82: 0.5,
    385: 0.7,
    88: 0.55,
    91: 0.55,
    328: 0.75,
    380: 0.5,
    99: 1.05,
    102: 0.6,
    113: 0.55,
    108: 1.1,
    336: 1.5,
    337: 0.7,
    119: 0.55,
    122: 0.5,
    125: 0.5,
    128: 0.5,
    357: 0.5,
    135: 1.35,
    145: 2,
    138: 2,
    141: 1.45,
    142: 1.45,
    148: 1.8,
    361: 1.85,
    362: 2,
    153: 0.5,
    155: 0.65,
    158: 0.65,
    164: 0.5,
    165: 0.5,
    267: 0.95,
    365: 0.5,
    368: 0.5,
    162: 0.5,
    169: 0.5,
    179: 0.5,
    172: 0.7,
    176: 0.5,
    182: 0.5,
    372: 0.7,
    375: 0.8,
  },
  MANY = {
    29: [1, 10, "s"],
    30: [2, 10, "s"],
    31: [1, 8, "s"],
    32: [1, 5, "s"],
    34: [1, 10, "s"],
    35: [3, 8, "s"],
    37: [1, 8, "s"],
    41: [4, 4, "s"],
    271: [2, 5, "s"],
    318: [2, 5, "p"],
    322: [1, 5, "w3"],
    323: [5, 3, "p"],
    324: [1, 5, "s"],
    325: [1, 4, "f3"],
  },
  manyGeo = (t) =>
    t[2] === "p"
      ? { k: "line", n: 1, len: 96, pierce: !0, area: 0 }
      : t[2] === "w3"
        ? { k: "wall", n: 3, len: 72, pierce: !1, area: 0, w: 54 }
        : t[2] === "f3"
          ? { k: "fan", n: 3, len: 72, pierce: !1, area: 0, half: 0.36 }
          : null,
  manyRate = (t) => (t[0] * 18) / (t[0] * t[1] + 1),
  SK_USE_AR = new Set([
    2, 11, 17, 29, 30, 31, 32, 34, 35, 37, 38, 41, 139, 142, 147, 216, 218, 219, 220, 221, 222, 223, 224, 225, 267, 271,
    272, 323, 324, 325, 327, 368, 404, 405, 406, 407, 408,
  ]);
function activeInfo(t, n, e) {
  const i = skVal(n, "physicsenhance_p", e),
    o = (1 + ((t.skillBonus[n.id] || 0) + t.seriesSkill + (t.skillEnh || 0)) / 100) * (t.dmgMul || 1),
    c = {};
  if (i) {
    c.phys = ((t.wmin + t.wmax) / 2) * (1 + (i[0] + t.physPct) / 100);
    for (const l in t.add) t.add[l] && (c[l] = (c[l] || 0) + t.add[l]);
  }
  for (const l of ELEM) {
    const p = skVal(n, ELEM_ATTR[l], e);
    if (!p) continue;
    const m = l === "poison" ? (p[0] * (p[1] || 1)) / Math.max(1, p[2] || 1) : p[2] ? (p[0] + p[2]) / 2 : p[0];
    c[l] = (c[l] || 0) + m * (1 + (t.enh[l] || 0) / 100);
  }
  if (!i && t.magAdd)
    for (const l of ELEM) t.magAdd[l] && (c[l] = (c[l] || 0) + t.magAdd[l] * (1 + (t.enh[l] || 0) / 100));
  if (!i && ENG_MODE) {
    const l = 1 + (t.eng || 0) / 500;
    for (const p in c) c[p] *= l;
  }
  let f = 0;
  for (const l in c) ((c[l] *= o), (f += c[l]));
  const u = (skVal(n, "skill_attackradius", e) || [n.radius || 60])[0] || 60,
    h = u * (1 + (t.vision || 0) / 100),
    d = MANY[n.id],
    a = d ? manyGeo(d) : null,
    _ = d ? (a ? geoEst(a) : 1) : skillTargets(n, e, h),
    C = skMissiles(n, e),
    w = skEvent(n, e),
    x = (skVal(n, "skill_cost_v", e) || [0])[0],
    A = t.crit + (skVal(n, "deadlystrike_p", e) || [0])[0],
    b = (skVal(n, "attackrating_p", e) || [0])[0] || 0,
    T = (skVal(n, "fatallystrike_p", e) || [0])[0] || 0,
    L = (skVal(n, "seriesdamage_p", e) || [0])[0],
    O = t.ignoreDef + (skVal(n, "ignoredefense_p", e) || [0])[0],
    N = (skVal(n, "stun_p", e) || [0])[0],
    E = (SK_TPC[n.id] || 0) / 18,
    q = d ? manyRate(d) : Math.min(n.phys ? t.aspdP || t.aspd : t.aspdC || t.aspd * 0.9, E ? 1 / E : 99),
    y = (l) => {
      const p = skVal(n, ELEM_ATTR[l], e);
      return p && p[1] > 0 ? p[1] / 18 : 0;
    },
    r = {
      skLeech: (skVal(n, "steallife_p", e) || [0])[0] || 0,
      skMLeech: (skVal(n, "stealmana_p", e) || [0])[0] || 0,
      geo: d ? a : misGeo(n) && n.form < 8 ? skGeo(n, e, h) : null,
      many: d || null,
      id: n.id,
      n: n.n,
      L: e,
      ext: !!i,
      wpn: skEqt(n) !== null,
      parts: c,
      tot: f,
      rad: h,
      melee: u <= 120,
      targets: _,
      nMis: C,
      ev: w,
      around: n.form === 7,
      cost: d ? x / d[0] : x,
      costLife: skCostLife(n),
      crit: A,
      series5: L,
      ignore: O,
      stun: N,
      fatal: T,
      ar: b ? Math.max(10, (t.arBase || 0) * (1 + ((t.arPct || 0) + b) / 100)) : 0,
      skAr: b,
      series: n.series >= 0 ? n.series : t.series,
      rate: q,
      cd: E,
      coldT: y("cold"),
      poisonT: y("poison"),
      dps: 0,
      useAR: SK_USE_AR.has(+n.id),
      phys: !!n.phys,
    };
  return (
    (r.dps =
      (f - (c.poison || 0) * (1 - POISON_EFF) + (((c.phys || 0) * A) / 100) * (CRIT_MULT - 1)) *
      expectedHits(r) *
      q *
      (r.melee ? MELEE_UPTIME : 1) *
      extraMul(t)),
    (r.dps *= 1 + ev2Exp(r)),
    r
  );
}
function basicAttack(t) {
  const e = { phys: ((t.wmin + t.wmax) / 2) * (1 + t.physPct / 100) * t.physStat };
  for (const i in t.add) t.add[i] && (e[i] = t.add[i]);
  let s = 0;
  for (const i in e) ((e[i] *= t.dmgMul || 1), (s += e[i]));
  return {
    id: 0,
    n: "Đánh thường",
    basic: !0,
    ext: !0,
    L: 1,
    parts: e,
    tot: s,
    rad: t.ranged ? 320 : [2, 3].includes(weaponCode(S.eq)) ? 100 : 75,
    melee: !t.ranged,
    targets: 1,
    cost: 0,
    crit: t.crit,
    series5: 0,
    ignore: t.ignoreDef,
    stun: 0,
    series: t.series,
    rate: t.aspd,
    dps: s * t.aspd * (t.ranged ? 1 : MELEE_UPTIME) * extraMul(t),
    useAR: 1,
    phys: !0,
  };
}
function extraMul(t) {
  if (!t || !t.anti) return 1;
  const n = ELEM.reduce((e, s) => e + (t.anti[s] || 0), 0) / ELEM.length;
  return (1 + ((t.heavy || 0) / 100) * 0.5) * (1 + (Math.min(n, 35) / 100) * 0.6);
}
function manaPotRate(t) {
  let n = 0;
  for (const e of J.potions)
    e.kind === "mana" && t >= (POT_TIER_LV[e.tier] || 999) && (n = Math.max(n, e.total / Math.max(1, e.dur)));
  return n;
}
const W_TIER1 = {},
  weaponDmg = (t) => (t.base || []).reduce((n, [e, s, i]) => n + (e === 28 || e === 29 ? s : 0), 0) * enhMul(t);
function weaponTierMul(t) {
  if (!t || t.d > 1) return 1;
  const n = t.d + ":" + t.k;
  if (!(n in W_TIER1)) {
    const e = baseRow(t.d, t.k, 1);
    W_TIER1[n] = e ? Math.max(1, weaponDmg(e)) : 0;
  }
  return W_TIER1[n] ? clamp(weaponDmg(t) / W_TIER1[n], 1, 20) : 1;
}
const sexReqOkFor = (t, n) => {
    const e = (t.req || []).find((s) => s[0] === 38);
    return !e || e[1] < 0 || e[1] === (n || 0);
  },
  sexReqOk = (t) => sexReqOkFor({ req: t }, S.sex),
  sexOk = (t) => sexReqOk(t.req);
function reqOk(t) {
  if (!sexOk(t)) return !1;
  for (const [n, e] of t.req || [])
    if (
      (n === 36 && eqLevel() < e) ||
      (n === 32 && heroAttr("str") < e) ||
      (n === 33 && heroAttr("dex") < e) ||
      (n === 34 && heroAttr("vit") < e) ||
      (n === 35 && heroAttr("eng") < e) ||
      (n === 37 && e >= 0 && FAC[S.fac] && heroSeries() !== e) ||
      (n === 39 && e >= 0 && FAC[S.fac] && FAC[S.fac].id !== e)
    )
      return !1;
  return !0;
}
function heroAttr(t) {
  return heroStart()[t] + S.attr[t];
}
const POWER_DPS_W = 0.7,
  lucTay = (t) => (t ? `${fmt(Math.round(t.tot * 0.85))} – ${fmt(Math.round(t.tot * 1.15))}` : "—");
function power(t) {
  const n = S.lvl,
    e = 8 + 3.2 * n,
    s = 30 + 9 * n,
    i = S.mainLock ? t.main : t.bestAuto || t.main,
    o = i.useAR ? hitPercent(i.ar || t.ar, e, i.ignore) / 100 : 1,
    c = 1 - hitPercent(s, t.def) / 100,
    f = ELEM.reduce((d, a) => d + t.res[a], 0) / ELEM.length,
    u = i.dps * o,
    h =
      t.life /
      Math.max(0.2, 1 - f / 100) /
      Math.max(0.3, 1 - c) /
      (1 - (t.block || 0) / 100) /
      (1 - (t.sorb || 0) / 100) /
      (1 - Math.min(DMG_SHIELD_MAX, (t.dmgShield || 0) / (S.lvl * 3 + 30)));
  return Math.pow(Math.max(1, u), POWER_DPS_W) * Math.pow(Math.max(1, h), 1 - POWER_DPS_W);
}
const POWER_LV = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190],
  POWER_TGT = [
    130, 376, 626, 871, 1195, 1711, 3433, 5432, 7235, 8289, 9807, 11292, 12029, 13018, 14077, 14729, 15396, 16159,
    16944,
  ],
  POWER_RAW = {
    shaolin: [
      154, 784, 1818, 2712, 5702, 6290, 14570, 23764, 23764, 23764, 31597, 31597, 31597, 31597, 31597, 31597, 31597,
      33572, 36006,
    ],
    tianwang: [
      90, 228, 391, 437, 660, 1629, 2173, 9779, 12925, 14152, 19354, 19354, 19354, 19354, 19354, 19354, 19354, 19354,
      19354,
    ],
    tangmen: [
      70, 199, 319, 485, 813, 1495, 2441, 4090, 5843, 5843, 8287, 8287, 8287, 8287, 8287, 8287, 8287, 8287, 8287,
    ],
    wudu: [
      218, 435, 764, 1205, 2044, 2908, 6005, 7994, 10692, 11886, 13644, 13644, 13644, 13644, 13644, 13644, 13644, 13644,
      13644,
    ],
    emei: [
      158, 402, 849, 1264, 1264, 2463, 4088, 6111, 7858, 9133, 9533, 15965, 18928, 22639, 27123, 28713, 30303, 31892,
      33482,
    ],
    cuiyan: [
      151, 455, 561, 1047, 1047, 1047, 2e3, 2420, 4181, 4181, 4181, 6880, 8747, 12058, 16897, 18495, 20160, 21892,
      23689,
    ],
    gaibang: [
      153, 320, 630, 630, 630, 630, 1636, 2909, 5527, 6875, 8848, 8848, 8848, 8982, 8982, 9660, 10471, 11312, 12183,
    ],
    tianren: [
      108, 447, 447, 580, 748, 1103, 2117, 2802, 2977, 3715, 4402, 4402, 4471, 4905, 5436, 5969, 6525, 7102, 7701,
    ],
    wudang: [
      139, 360, 870, 1310, 1470, 2592, 5363, 6851, 8426, 9304, 10609, 14616, 15507, 16544, 17749, 18662, 19574, 20485,
      21397,
    ],
    kunlun: [
      121, 384, 458, 576, 1038, 1038, 3227, 3566, 4499, 7228, 7228, 7799, 9034, 10161, 11123, 12163, 13248, 14377,
      15549,
    ],
  };
function powerShown(t) {
  const n = FAC[S.fac] && POWER_RAW[S.fac];
  if (!n) return t;
  const e = Math.max(POWER_LV[0], Math.min(POWER_LV[POWER_LV.length - 1], S.lvl | 0));
  let s = 0;
  for (; s < POWER_LV.length - 2 && e > POWER_LV[s + 1];) s++;
  const i = (e - POWER_LV[s]) / (POWER_LV[s + 1] - POWER_LV[s]),
    o = (c, f) => Math.log(c[f]) * (1 - i) + Math.log(c[f + 1]) * i;
  return t * Math.exp(o(POWER_TGT, s) - o(n, s));
}
function autoSpendSkills() {
  const t = FAC[S.fac];
  if (!t) return 0;
  const n = R.buffAssume;
  ((R.buffAssume = !0), (R.ignoreEqt = null));
  try {
    return autoSpendSkills0(t);
  } finally {
    ((R.buffAssume = n), (R.ignoreEqt = null), (R.dirty = !0));
  }
}
const SK_PROJ = 10,
  isTrapSk = (t) => !!t && /bẫy/i.test(t.d || "");
function autoSpendSkills0(t) {
  let n = 0;
  for (; S.skPts > 0;) {
    const e = power(calc());
    let s = null,
      i = 0,
      o = -1 / 0;
    for (const c of t.skills) {
      const f = SK[c];
      if (!canLearn(f) || isTrapSk(f)) continue;
      const u = S.sk[c] || 0,
        h =
          isAttack(f) && f.tier !== 90
            ? Math.max(skCap(f), Math.min(f.max, eqLevel() + SK_PROJ - f.req + 1))
            : skCap(f),
        d = Math.max(1, Math.min(20, h - u));
      for (const a of [...new Set([1, Math.min(5, d), d])]) {
        S.sk[c] = u + a;
        const _ = (power(calc()) - e) / a + (isAttack(f) ? 0 : 1e-6) + f.req * 1e-9;
        (u ? (S.sk[c] = u) : delete S.sk[c], _ > o && ((o = _), (s = c), (i = a)));
      }
    }
    if (s == null) break;
    if (
      ((i = Math.min(i, S.skPts)),
      typeof bookUse == "function" && !R.sim && bookUse(s),
      (i = Math.min(i, skCap(SK[s]) - (S.sk[s] || 0))),
      SK[s].tier === 90)
    ) {
      (skLearn(s), sk9Free(SK[s]) || n++);
      continue;
    }
    ((S.sk[s] = (S.sk[s] || 0) + i), (S.skPts -= i), (n += i));
  }
  return (n && (R.dirty = !0), n);
}
const ATTR_REQ = { 32: "str", 33: "dex", 34: "vit", 35: "eng" },
  REQ_SAVE_LEVELS = 10;
function weaponTarget() {
  return (
    (FAC[S.fac] &&
      S.inv
        .concat(S.eq.weapon ? [S.eq.weapon] : [])
        .filter(
          (e) =>
            e.d <= 1 &&
            weaponFits(e) &&
            (e.req || []).every(([s, i]) => s !== 36 || eqLevel() >= i) &&
            !(e.req || []).some(([s, i]) => (s === 37 || s === 39) && i >= 0 && !reqOk(e)),
        )
        .sort((e, s) => weaponDmg(s) - weaponDmg(e))[0]) ||
    null
  );
}
const REQ_VI = { 32: "Sức mạnh", 33: "Thân pháp", 34: "Sinh khí", 35: "Nội công" };
function reqProblems(t) {
  const n = [];
  for (const [e, s] of t.req || [])
    if (e === 36 && eqLevel() < s) n.push(`Cấp ${s} (hiện ${eqLevel()}, thiếu ${s - eqLevel()})`);
    else if (REQ_VI[e] && heroAttr(ATTR_REQ[e]) < s) {
      const i = heroAttr(ATTR_REQ[e]);
      n.push(`${REQ_VI[e]} ${s} (hiện ${i}, thiếu ${s - i})`);
    } else
      e === 38 && s >= 0 && (S.sex || 0) !== s
        ? n.push(`Chỉ dành cho ${s ? "nữ" : "nam"} (nhân vật của bạn là ${S.sex ? "nữ" : "nam"})`)
        : e === 37 && s >= 0 && FAC[S.fac] && heroSeries() !== s
          ? n.push(`Chỉ hệ ${SERIES[s]} (bạn hệ ${SERIES[heroSeries()]})`)
          : e === 39 &&
            s >= 0 &&
            FAC[S.fac] &&
            FAC[S.fac].id !== s &&
            n.push(`Chỉ môn phái ${(J.factions[s] || {}).n || s}`);
  return n;
}
function equipCompare(t, n) {
  const e = Object.assign({}, S.eq);
  e[slotFor(t)] = t;
  const s = calc(S.eq),
    i = IGNORE_REQ;
  IGNORE_REQ = n ? t : null;
  let o;
  try {
    o = calc(e);
  } finally {
    IGNORE_REQ = i;
  }
  const c = power(s),
    f = power(o),
    u = (d) => ELEM.reduce((a, _) => a + d.res[_], 0) / ELEM.length;
  return {
    why: compareWhy(t, e, s, o),
    gain: f / Math.max(1, c) - 1,
    dps: (o.bestAuto || o.main).dps / Math.max(1, (s.bestAuto || s.main).dps) - 1,
    life: o.life - s.life,
    def: o.def - s.def,
    res: u(o) - u(s),
    ar: o.ar - s.ar,
  };
}
function compareWhy(t, n, e, s) {
  const i = S.eq,
    o = slotFor(t),
    c = [],
    f = i[o];
  for (const u in i) {
    const h = i[u];
    if (!h || u === o || (h.mag || []).length < 2) continue;
    const d = hiddenActive(h, i),
      a = hiddenActive(h, n),
      _ = Math.floor(h.mag.length / 2);
    a !== d &&
      c.push(
        `${SLOT_VI[u]} ${a > d ? "mở thêm" : "đóng bớt"} ${Math.abs(a - d)} dòng ẩn (${a}/${_}) do tương sinh hệ ${SERIES[t.s] || "—"}`,
      );
  }
  if ((t.mag || []).length > 1 && t.d !== 10) {
    const u = hiddenActive(t, n),
      h = Math.floor(t.mag.length / 2),
      d = f && (f.mag || []).length > 1 ? hiddenActive(f, i) : null;
    c.push(`Món này mở ${u}/${h} dòng ẩn${d !== null ? `, món đang mặc mở ${d}/${Math.floor(f.mag.length / 2)}` : ""}`);
  }
  return (
    enoughToActive(n) !== enoughToActive(i) &&
      c.push(enoughToActive(n) ? "Đủ bộ: mở hết dòng ẩn của mọi trang bị" : "Mất đủ bộ: các dòng ẩn bị đóng lại"),
    e.main.id !== s.main.id && c.push(`Chiêu chính đổi: ${e.main.n} → ${s.main.n}`),
    o === "weapon" &&
      c.push(
        `Sát thương vũ khí ${Math.round(e.wmin)}–${Math.round(e.wmax)} → ${Math.round(s.wmin)}–${Math.round(s.wmax)}`,
      ),
    c.length || c.push("Chỉ thay đổi chỉ số thường (phòng thủ, sinh lực, kháng), không đụng tới dòng ẩn hay bộ."),
    c
  );
}
const pctTxt = (t) => (t >= 0 ? "+" : "") + (t * 100).toFixed(1) + "%",
  numTxt = (t) => (t >= 0 ? "+" : "") + Math.round(t);
function reqDeficit(t) {
  const n = {};
  for (const [e, s] of t.req || []) {
    const i = ATTR_REQ[e];
    i && heroAttr(i) < s && (n[i] = s - heroAttr(i));
  }
  return n;
}
function gearReqPlan(t = S.attrPts) {
  const n = (o) => ((o.req || []).find((c) => c[0] === 36) || [0, 0])[1],
    e = Object.values(S.eq)
      .filter((o) => o && (o.req || []).some(([c]) => ATTR_REQ[c]))
      .sort((o, c) => n(o) - n(c)),
    s = { str: 0, dex: 0, vit: 0, eng: 0 },
    i = [];
  for (const o of e) {
    const c = {};
    let f = 0;
    for (const [u, h] of o.req) {
      const d = ATTR_REQ[u];
      if (!d) continue;
      const a = h - (heroAttr(d) + s[d]);
      a > 0 && (c[d] = Math.max(c[d] || 0, a));
    }
    for (const u in c) ((s[u] += c[u]), (f += c[u]));
    f && i.push({ it: o, d: c, n: f, lv: n(o) });
  }
  return { list: i, total: Object.values(s).reduce((o, c) => o + c, 0), add: s };
}
function fillGearReq() {
  let t = 0;
  for (const { d: n } of gearReqPlan().list)
    for (const e in n) {
      const s = Math.min(n[e], S.attrPts);
      s > 0 && ((S.attr[e] += s), (S.attrPts -= s), (t += s));
    }
  return (t && (R.dirty = !0), t);
}
function autoSpendAttrs() {
  let t = fillGearReq();
  const n = weaponTarget();
  if (n) {
    const e = reqDeficit(n),
      s = Object.values(e).reduce((i, o) => i + o, 0);
    if (s > 0 && s <= S.attrPts + PTS_PER_LEVEL * REQ_SAVE_LEVELS)
      for (const i in e) {
        const o = Math.min(e[i], S.attrPts);
        ((S.attr[i] += o), (S.attrPts -= o), (t += o));
      }
    n !== S.eq.weapon && reqOk(n) && typeof equip == "function" && equipGain(n) > 0 && equip(n, !0);
  }
  for (; S.attrPts > 0;) {
    const e = power(calc());
    let s = "vit",
      i = -1 / 0;
    for (const o of ["str", "dex", "vit", "eng"]) {
      S.attr[o]++;
      const c = power(calc()) - e;
      (S.attr[o]--, c > i && ((i = c), (s = o)));
    }
    (S.attr[s]++, S.attrPts--, t++);
  }
  return (t && (R.dirty = !0), t);
}
const sk9Free = (t) => !!t && t.tier === 90 && !(typeof isBr90 == "function" && isBr90(t.id)),
  skReqOk = (t) => !!t && (S.lvl >= t.req || (t.tier === 90 && rebornN() > 0));
function canLearn(t) {
  return (
    (S.skPts > 0 || (sk9Free(t) && !S.sk[t.id])) &&
    skReqOk(t) &&
    (S.sk[t.id] || 0) < skCap(t) &&
    (typeof bookOk != "function" || bookOk(t))
  );
}
function skCap(t) {
  return typeof isBr90 == "function" && isBr90(t.id)
    ? sk9BranchCap(t.id)
    : t.tier === 90
      ? 1
      : Math.max(0, Math.min(t.max, eqLevel() - t.req + 1));
}
const NORM_TIERS = [
    [1, 19],
    [20, 39],
    [40, 59],
    [60, 79],
    [80, 999],
  ],
  MELEE_UPTIME = 0.82;
function expectedHits(t) {
  const n = Math.min(4, t.targets);
  return t.around ? 1 + (n - 1) * 0.12 : 1 + (n - 1) * 0.55;
}
function masteryPct(t) {
  let n = 0;
  for (const e of t.skills) {
    const s = SK[e],
      i = s && !s.enemy && s.attr.addphysicsdamage_p;
    if (!i) continue;
    const o = i[19] || i[i.length - 1];
    Array.isArray(o) && o[2] === t.wcode && (n = Math.max(n, o[0]));
  }
  return n;
}
function refChar(t, n, e) {
  const s = 10 + t * 0.8,
    i = 60 + t;
  return {
    wmin: s,
    wmax: s * 1.3,
    physPct: masteryPct(n),
    physStat: 1 + (i * e * (n.wcode === 7 ? DEX_PCT_RANGED : 1)) / STR_PER_PCT / 100,
    add: {},
    enh: {},
    eng: i * (1 - e),
    seriesSkill: 0,
    skillBonus: {},
    crit: 0,
    aspd: 1,
    ignoreDef: 0,
    series: 0,
    spellW: 1,
  };
}
const REF_HIT = 0.75,
  REF_HIT_RANGED = 0.9,
  POISON_EFF = 0.75;
function refDps(t) {
  let n = 0;
  for (const e of [0, 1]) {
    const s = activeInfo(refChar(Math.max(10, t.req), t.fac, e), t, 20),
      i = s.tot - (s.parts.poison || 0) * (1 - POISON_EFF),
      o = s.useAR ? (t.fac.wcode === 7 ? REF_HIT_RANGED : REF_HIT) : 1;
    n = Math.max(n, i * expectedHits(s) * s.rate * (s.melee ? MELEE_UPTIME : 1) * o);
  }
  return n;
}
function initSkillNorm() {
  const t = [];
  for (const n of FACTIONS)
    for (const e of n.skills) {
      const s = SK[e];
      isAttack(s) && ((s.fac = n), t.push(s));
    }
  for (const [n, e] of NORM_TIERS) {
    const i = t.filter((f) => f.req >= n && f.req <= e).map((f) => ((f.norm = 1), [f, refDps(f)])),
      o = i.map((f) => f[1]).sort((f, u) => f - u),
      c = o[Math.floor(o.length / 2)] || 1;
    for (const [f, u] of i) f.norm = clamp(c / Math.max(1, u), 0.35, 3);
  }
}
initSkillNorm();
const FN_LV = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 135, 150, 175, 200],
  HERO_DMG_K = 1,
  FAC_DMG_NORM = {
    shaolin: [0.99, 1.3, 1.23, 0.89, 1.5, 0.79, 1.1, 1.98, 1.34, 1.15, 1.17, 0.82, 0.66, 0.48, 0.37, 0.31],
    tianwang: [1.06, 1.32, 1.82, 1.8, 1.47, 2.15, 2.27, 5.73, 5.09, 5.05, 6.63, 2.85, 2.65, 2.01, 1.6, 0.62],
    tangmen: [0.66, 1.39, 1.91, 1.71, 2.15, 3.39, 1.79, 1.44, 1.59, 1.12, 2.21, 0.74, 0.53, 0.41, 0.76, 1.43],
    wudu: [1.5, 1.19, 1.99, 1.47, 1.65, 1.77, 1.7, 1.47, 1.96, 1.82, 1.93, 0.99, 0.31, 0.18, 0.17, 0.72],
    emei: [0.54, 0.36, 0.31, 0.38, 0.2, 0.27, 0.27, 0.26, 0.33, 0.25, 0.21, 0.5, 0.54, 0.84, 0.69, 1.2],
    cuiyan: [1.25, 1.49, 1.38, 2.02, 0.97, 1.09, 1.41, 1.45, 2.04, 1.53, 1.35, 2.82, 3.46, 7.14, 6.41, 8],
    gaibang: [1.48, 1.36, 1.81, 1.94, 0.5, 0.72, 1.04, 1.62, 3.54, 3.34, 3.42, 2.69, 2.52, 2.02, 2.35, 5.63],
    tianren: [0.74, 1.57, 2.02, 1.66, 1.37, 1.3, 1.23, 1.45, 1.34, 1.57, 1.59, 1.16, 1.29, 1.22, 1.12, 0.59],
    wudang: [0.63, 0.47, 0.17, 0.23, 0.18, 0.21, 0.33, 0.32, 0.27, 0.15, 0.15, 0.25, 0.25, 0.25, 0.25, 0.12],
    kunlun: [1.69, 1.29, 0.94, 1.09, 1.68, 1.45, 2.53, 1.58, 1.73, 1.59, 1.69, 3.06, 3.27, 2.99, 2.83, 1.17],
  };
function facNorm(t, n) {
  const e = FAC_DMG_NORM[t];
  if (!e || window.NO_FAC_NORM) return 1;
  if (n <= FN_LV[0]) return e[0];
  for (let s = 1; s < FN_LV.length; s++)
    if (n <= FN_LV[s]) {
      const i = (n - FN_LV[s - 1]) / (FN_LV[s] - FN_LV[s - 1]);
      return e[s - 1] + (e[s] - e[s - 1]) * i;
    }
  return e[e.length - 1];
}
