"use strict";
const FPS_JX = 18,
  WXG_POISON = [1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 7],
  AURA_DMG = { 69: { el: "poison", every: 72 / 18, rad: 200, tab: WXG_POISON, col: "#8fe34a" } },
  auraSkill = (t) => {
    const e = AURA_DMG[t];
    return (
      e.sk || (e.sk = Object.assign({}, SK[t], { aura: 0, attr: { poisondamage_v: e.tab.map((s) => [s, 60, 10]) } }))
    );
  },
  auraHit = (t, e) => {
    const s = AURA_DMG[t],
      n = Math.min(e, s.tab.length);
    return (R.P && (activeInfo(R.P, auraSkill(t), n).parts || {})[s.el]) || 0;
  },
  hasCost = (t) => !!(t.attr && t.attr.skill_cost_v);
// Team-shared skills, from the JX1 \settings\Skills.txt columns (paks of the cocos2dx client, read with
// tools/jxmap/pak.py; KSkill::LoadSkillLevelData: IsAura -> m_bIsAura, TargetAlly -> m_eRelation |= relation_ally,
// AttackRadius -> range; party members are relation_ally):
//  aura  IsAura=1 TargetAlly=1 (state child skill, AttackRadius 180): the aura state reaches every member in range
//  buff  IsAura=0 TargetAlly=1, SkillStyle 0, MisslesForm 6 AtTarget, AttackRadius 400/440: castable on an ally
//  heal  same columns as buff, a short lifereplenish (Từ Hàng Phổ Độ): heals the lowest-HP member in range
// TargetAlly=0 skills (Thu Phong Diệp 81, Nhân Kiếm Hợp Nhất 163, Kim Chung Tráo 33, Thái Cực Thần Công 157…) stay
// self-only; Vô Hình Độc 69 is an enemy aura (TargetEnemy=1). Range = SK[id].radius (= AttackRadius).
const SK_TEAM_AURA = new Set([16, 86, 89, 92, 146, 159, 282, 332]),
  SK_TEAM_BUFF = new Set([15, 171, 173, 178]),
  SK_TEAM_HEAL = new Set([93, 94]),
  skTeamR = (t) => (SK[t] && SK[t].radius) || 180;
function skKind(t) {
  return t
    ? isAttack(t)
      ? "atk"
      : t.aura
        ? Object.keys(t.attr || {}).length || AURA_DMG[t.id]
          ? "aura"
          : "none"
        : hasCost(t)
          ? t.enemy
            ? "curse"
            : "buff"
          : "passive"
    : "none";
}
const SK_KIND_VI = {
  atk: "Tấn công",
  passive: "Bị động",
  buff: "Bùa lợi",
  aura: "Vòng sáng",
  curse: "Bùa hại",
  none: "—",
};
function skDur(t, e) {
  let s = 0;
  for (const n in t.attr) {
    if (/^(skill_|missle_|addskill)/.test(n)) continue;
    const c = skVal(t, n, e);
    c && c[1] > s && (s = c[1]);
  }
  return s > 0 ? s / 18 : 0;
}
const skCost = (t, e) => (skVal(t, "skill_cost_v", e) || [0])[0] || 0,
  SKS = () => R.sks || (R.sks = { buff: {}, cd: {} }),
  clk = () => R.clock || 0,
  buffOn = (t) => (SKS().buff[t] || 0) > clk() && !!S.sk[t],
  auraList = () =>
    Object.keys(S.sk || {})
      .filter((t) => S.sk[t] && SK[t] && skKind(SK[t]) === "aura" && !(S.auraOff || {})[t])
      .map(Number),
  auraOn = (t) => auraList().includes(+t);
function auraActive() {
  return auraList()[0] || 0;
}
// aura / buff timers live in R.sks (per actor: swapped with the disciples, js/party.js)
const auraTm = () => SKS().aT || (SKS().aT = {});
function auraDmgTick(t) {
  for (const e of auraList()) AURA_DMG[e] && auraDmg1(e, t);
}
function auraDmg1(t, e) {
  const s = AURA_DMG[t];
  if (!s || !R.P || !R.P.main || R.town || R.deadT > 0 || (auraTm()[t] = (auraTm()[t] || 0) - e) > 0) return;
  auraTm()[t] = s.every;
  const n = Math.max(1, skLv(t)),
    c = auraHit(t, n);
  if (!(c > 0)) return;
  const a = R.enemies.filter((o) => !o.dead && o.hp > 0 && jxdE(H, o) <= s.rad);
  if (!a.length) return;
  const l = heroSeries();
  for (const o of a) {
    const i = curseMod(o),
      p = i ? Object.fromEntries(ELEM.map((f) => [f, o.res[f] + (i.res[f] || 0)])) : o.res;
    let r =
      applyPart(
        c * rnd(0.9, 1.1) * (i && i.poison ? 1 + i.poison / 100 : 1),
        s.el,
        l,
        o.series,
        p,
        75,
        R.P.series5 || 0,
      ) * cheatK();
    if (s.el === "poison") {
      const f = o.poison > 0 ? o.poisonDmg * o.poison : 0;
      ((o.poisonDmg = (f + r) / POISON_TIME), (o.poison = POISON_TIME));
    } else o.hp -= r;
  }
}
function skApplies(t) {
  const e = skKind(t);
  if (e === "passive") return !0;
  const own = e === "aura" ? auraOn(t.id) : e === "buff" ? buffOn(t.id) || !!R.buffAssume : !1;
  // the same team aura / buff from a party member at a higher level replaces the own copy (JX1 states don't stack)
  return own && !(typeof partyShareLv == "function" && partyShareLv(t.id) > skLv(t.id));
}
function skillSysTick(t) {
  const q = SKS();
  if ((auraDmgTick(t), (q.t = (q.t || 0) - t), q.t > 0 || ((q.t = 0.5), !S.fac || !R.P || R.deadT > 0 || R.town))) return;
  const e = clk(),
    s = SKS();
  let n = !1;
  for (const a in s.buff) s.buff[a] <= e && s.buff[a] > 0 && ((s.buff[a] = 0), (n = !0));
  const c = R.enemies.some((a) => !a.dead);
  for (const a in S.sk) {
    const l = SK[a];
    if (!(S.sk[a] || 0)) continue;
    const i = skKind(l);
    if ((i !== "buff" && i !== "curse") || (i === "buff" && S.autoBuff === !1) || (i === "curse" && S.autoCurse === !1))
      continue;
    const p = skLv(a),
      r = skCost(l, p),
      f = skDur(l, p),
      k = skCostLife(l),
      m = () => {
        k ? (R.life = Math.max(1, R.life - r)) : (R.mana -= r);
      };
    if (!(k ? R.life < r + R.P.life * 0.3 : R.mana < r + R.P.mana * 0.15)) {
      if (i === "buff") {
        if (buffOn(a)) continue;
        if (f < 5) {
          if (!c || (s.cd[a] || 0) > e) continue;
          // ally heal (TargetAlly): the lowest-HP living party member in range (the caster included)
          const tg = SK_TEAM_HEAL.has(+a) && typeof partyHealTarget == "function" ? partyHealTarget(skTeamR(a)) : null;
          if (tg ? tg.ratio >= 0.6 : !(R.life < R.P.life * 0.6)) continue;
          const g = skVal(l, "lifereplenish_v", p),
            hv = (g ? g[0] : 0) * f * 2;
          (m(), (s.cd[a] = e + 8), addText(H.x, H.y - 60, "✚ " + l.n, "#8f8", 12));
          tg && !tg.self ? partyHealApply(tg, hv) : heal(hv, !1);
          continue;
        }
        (m(), (s.buff[a] = e + f), (n = !0), typeof uiSfx == "function" && uiSfx("use"));
        typeof jmSupFx == "function" && jmSupFx(+a, H, !0);
      } else if (c) {
        const d = R.enemies
          .filter((u) => !u.dead && !((u.curse || {})[a] > e))
          .sort(
            (u, h) =>
              (h.cls === "boss") - (u.cls === "boss") ||
              (h.cls === "elite") - (u.cls === "elite") ||
              Math.hypot(u.x - H.x, u.y - H.y) - Math.hypot(h.x - H.x, h.y - H.y),
          )[0];
        if (!d || jxdE(H, d) > 420 || (d.cls === "normal" && R.enemies.filter((u) => !u.dead).length < 3)) continue;
        m();
        const b = d.curse || (d.curse = {});
        ((b[a] = e + Math.min(f, 60)), typeof castFx == "function" && castFx({ id: +a }));
        typeof jmSupFx == "function" && jmSupFx(+a, d);
        for (const u of R.enemies)
          u !== d && !u.dead && jxdE(d, u) < 120 && ((u.curse || (u.curse = {}))[a] = e + Math.min(f, 60));
      }
    }
  }
  n && ((R.dirty = !0), typeof partyShareNow == "function" && partyShareNow());
}
function curseMod(t) {
  const e = t.curse;
  if (!e) return null;
  const s = clk(),
    n = { res: {}, def: 0, ar: 0, dmg: 0, ret: 0, slow: 0, regen: 0, poison: 0, crit: 0 };
  let c = !1;
  for (const a in e) {
    if (e[a] <= s) continue;
    const l = SK[a],
      o = Math.max(1, skLv(a));
    if (l) {
      c = !0;
      for (const i in l.attr) {
        if (/^(skill_|missle_|addskill)/.test(i)) continue;
        const p = skVal(l, i, o);
        if (!p) continue;
        const r = p[0];
        if (i === "allres_p") for (const f of ELEM) n.res[f] = (n.res[f] || 0) + r;
        else if (/res_p$/.test(i)) {
          const f = i.startsWith("physics") ? "phys" : i.startsWith("lighting") ? "light" : i.replace("res_p", "");
          n.res[f] = (n.res[f] || 0) + r;
        } else
          i === "adddefense_v"
            ? (n.def += r)
            : i === "attackratingenhance_p"
              ? (n.ar += r)
              : i === "addphysicsdamage_p"
                ? (n.dmg += r)
                : i === "meleedamagereturn_p"
                  ? (n.ret += -r)
                  : i === "fasthitrecover_v"
                    ? (n.slow += -r)
                    : i === "lifereplenish_v"
                      ? (n.regen += r)
                      : i === "poisontimereduce_p"
                        ? (n.poison += -r)
                        : i === "deadlystrikeenhance_p" && (n.crit += r);
      }
    }
  }
  return c ? n : null;
}
const isCursed = (t) => !!curseMod(t);
function skStateTag(t) {
  const e = skKind(t),
    s = S.sk[t.id] || 0;
  if (e === "buff") {
    const n = skDur(t, Math.max(1, s));
    return n < 5
      ? '<span class="tag buff">Hồi phục</span>'
      : `<span class="tag buff">Bùa lợi ${Math.round(n)}s</span>${s && buffOn(t.id) ? ` <small class="cp">đang có ${Math.ceil(SKS().buff[t.id] - clk())}s</small>` : ""}`;
  }
  return e === "aura" && AURA_DMG[t.id]
    ? `<span class="tag aura">Vòng sáng độc</span> <small class="dim">mỗi ${AURA_DMG[t.id].every}s phủ độc quái trong ${AURA_DMG[t.id].rad} · độc ${AURA_DMG[t.id].tab[Math.min(Math.max(1, s + ((R.P && R.P.plusSkill) || 0)), 30) - 1]} điểm/lần → ~${fmt(auraHit(t.id, Math.max(1, s + ((R.P && R.P.plusSkill) || 0))))}/nhịp</small>${s ? (auraActive() === t.id ? ' <small class="cp">● đang bật</small>' : ` <button class="btn sm" data-aura="${t.id}">Bật</button>`) : ""}`
    : e === "aura"
      ? `<span class="tag aura">Vòng sáng</span>${s ? (auraOn(t.id) ? ` <small class="cp">● đang bật</small> <button class="btn sm" data-aura="${t.id}">Tắt</button>` : ` <button class="btn sm" data-aura="${t.id}">Bật</button>`) : ""}`
      : e === "curse"
        ? `<span class="tag curse">Bùa hại ${Math.round(Math.min(60, skDur(t, Math.max(1, s))))}s</span>`
        : e === "passive"
          ? '<span class="tag">Bị động</span>'
          : "";
}
function bindSkState(t) {
  t.querySelectorAll("[data-aura]").forEach(
    (e) =>
      (e.onclick = (s) => {
        s.stopPropagation();
        const n = e.dataset.aura,
          c = S.auraOff || (S.auraOff = {});
        (c[n] ? delete c[n] : (c[n] = 1),
          (R.dirty = !0),
          recalc(),
          typeof partyShareNow == "function" && partyShareNow(),
          save(),
          toast(`${c[n] ? "Tắt" : "Bật"} vòng sáng: ${SK[n].n}`),
          refresh());
      }),
  );
}
function skOptsHTML() {
  const sh = typeof partyShared == "function" ? partyShared() : [];
  return `${sh.length ? `<div class="small" style="margin:2px 0 6px">Nhận từ tổ đội: ${sh.map((o) => `<span class="tag ${o.aura ? "aura" : "buff"}">${esc(o.n)}</span>`).join(" ")}</div>` : ""}<label><input type="checkbox" id="cBuff" ${S.autoBuff === !1 ? "" : "checked"}> Tự thi triển bùa lợi khi hết thời gian (tốn nội lực)</label>
    <label><input type="checkbox" id="cCurse" ${S.autoCurse === !1 ? "" : "checked"}> Tự thi triển bùa hại lên trùm, tinh anh hoặc đám từ 3 quái</label>`;
}
function bindSkOpts() {
  const t = $("#cBuff"),
    e = $("#cCurse");
  (t &&
    (t.onchange = () => {
      ((S.autoBuff = t.checked), save());
    }),
    e &&
      (e.onchange = () => {
        ((S.autoCurse = e.checked), save());
      }));
}
const BUF_ITEM_IC = { tt: "img/ep/tt.png", luck: "img/ep/qht.png", xp: "img/ep/fd.png", drop: "img/ep/mys.png" },
  fmtLeft = (t) =>
    t < 0 ? "N/A" : t >= 3600 ? Math.floor(t / 3600) + "h" : t >= 60 ? Math.floor(t / 60) + "m" : Math.ceil(t) + "s";
function stateIcons() {
  const t = [];
  newbieOn() &&
    t.push({
      ic: "img/ep/tanthu.png",
      t: -1,
      n: `Hỗ Trợ Tân Thủ: mỗi giây hồi ${NEWBIE_REGEN.life * 100}% sinh lực, ${NEWBIE_REGEN.mana * 100}% nội lực, +${NEWBIE_XP * 100}% kinh nghiệm (đến cấp ${NEWBIE_LV})`,
    });
  for (const n of auraList()) t.push({ ic: SK[n].ic, t: -1, n: "Vòng sáng: " + SK[n].n });
  const e = clk();
  for (const n in SKS().buff)
    SKS().buff[n] > e && SK[n] && S.sk[n] && t.push({ ic: SK[n].ic, t: SKS().buff[n] - e, n: SK[n].n });
  // auras / buffs the other party members share with this character (party.js pAuraTick)
  if (typeof partyShared == "function") for (const o of partyShared()) t.push({ ic: o.ic, t: o.t, n: o.n });
  const s = Date.now();
  for (const n in S.buf || {}) {
    const c = S.buf[n];
    c &&
      c.until > s &&
      BUFF_VI[n] &&
      t.push({
        ic: BUF_ITEM_IC[n] || "img/ep/fd.png",
        t: (c.until - s) / 1e3,
        n: `${BUFF_VI[n]} +${n === "luck" ? Math.round(c.p) : Math.round(c.p * 100) + "%"}`,
      });
  }
  return t;
}
