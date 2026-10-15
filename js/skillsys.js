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
        const stn = skVal(l, "stun_p", p);
        if (stn && stn[0] && Math.random() * 100 < stn[0]) {
          const stDur = Math.max(0.6, (stn[1] || 18) / 18);
          d.stun = Math.max(d.stun || 0, stDur);
          typeof addText == "function" && addText(d.x, d.y - (d.r || 30) - 8, "Hôn mê!", "#ff4444", 12);
        }
        for (const u of R.enemies) {
          if (u !== d && !u.dead && jxdE(d, u) < 120) {
            (u.curse || (u.curse = {}))[a] = e + Math.min(f, 60);
            if (stn && stn[0] && Math.random() * 100 < stn[0]) {
              u.stun = Math.max(u.stun || 0, Math.max(0.6, (stn[1] || 18) / 18));
            }
          }
        }
      }
    }
  }
  n && ((R.dirty = !0), typeof partyShareNow == "function" && partyShareNow());
}
function curseMod(t) {
  const e = t.curse;
  if (!e) return null;
  const s = clk(),
    n = {
      res: {},
      def: 0,
      ar: 0,
      dmg: 0,
      ret: 0,
      retRange: 0,
      slow: 0,
      slowMove: 0,
      atkSpeed: 0,
      freezeRed: 0,
      stunRed: 0,
      regen: 0,
      poison: 0,
      crit: 0,
    };
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
        } else if (i === "adddefense_v") n.def += r;
        else if (i === "attackratingenhance_p") n.ar += r;
        else if (i === "addphysicsdamage_p") n.dmg += r;
        else if (i === "meleedamagereturn_p") n.ret += -r;
        else if (i === "rangedamagereturn_p") n.retRange += -r;
        else if (i === "fasthitrecover_v") n.slow += -r;
        else if (i === "fastwalkrun_p") n.slowMove += r;
        else if (i === "castspeed_v" || i === "attackspeed_v") n.atkSpeed += r;
        else if (i === "freezetimereduce_p") n.freezeRed += r;
        else if (i === "stuntimereduce_p") n.stunRed += r;
        else if (i === "lifereplenish_v") n.regen += r;
        else if (i === "poisontimereduce_p") n.poison += -r;
        else if (i === "deadlystrikeenhance_p") n.crit += r;
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

// --- KỸ NĂNG 120 VÀ 150 (VÕ LÂM HOÀNG KIM) ---
const SK_120_COST = 3e9,
  SK_150_COST = 1e10,
  SK_120_REQ = 120,
  SK_150_REQ = 150,
  SK_120_MAX = 20,
  SK_120_XP = [600, 1200, 2000, 3000, 4200, 5600, 7200, 9000, 11000, 13200, 15600, 18200, 21000, 24000, 27200, 30600, 34200, 38000, 42800],
  sk120Scale = (lv, minVal, maxVal) => minVal + (maxVal - minVal) * (clamp(lv, 1, SK_120_MAX) - 1) / (SK_120_MAX - 1),
  SK_120 = {
    708: {
      fac: "tianwang",
      n: "Đảo Hư Thiên",
      prop: "Hỗ trợ bị động",
      d: "Một loại võ công độc đáo do Chung Ngưu Tử sáng chế.",
      desc: (lv) => [
        `Kháng tất cả +${sk120Scale(lv, 1, 10).toFixed(0)}%`,
        `Kháng tối đa +${sk120Scale(lv, 1, 5).toFixed(0)}%`,
        `Hồi sinh lực ${sk120Scale(lv, 0.2, 1).toFixed(1)}% sinh lực tối đa / giây`,
        `Hóa giải (né hẳn đòn) +${sk120Scale(lv, 1, 12).toFixed(0)}%`
      ]
    },
    709: {
      fac: "shaolin",
      n: "Đại Thừa Như Lai Chú",
      prop: "Hỗ trợ bị động",
      d: "Thân tâm thanh tịnh, tự động phản kích lại đối phương.",
      desc: (lv) => [
        `Phản lại ${sk120Scale(lv, 5, 40).toFixed(0)}% sát thương nhận vào cho quái (cận chiến và tầm xa)`
      ]
    },
    710: {
      fac: "tangmen",
      n: "Mê Ảnh Tung",
      prop: "Hỗ trợ chủ động",
      d: "Thuật di hình hoán ảnh, đi đến điểm chỉ định trong nháy mắt.",
      desc: (lv) => [
        `Mỗi ${sk120Scale(lv, 30, 15).toFixed(0)} giây tạo ảo ảnh 6 giây cùng đánh: sát thương +${sk120Scale(lv, 20, 60).toFixed(0)}%`,
        `Bị đánh ${sk120Scale(lv, 5, 25).toFixed(0)}% lóe ảnh né hẳn đòn`
      ]
    },
    711: {
      fac: "wudu",
      n: "Hấp Tinh Yểm",
      prop: "Hỗ trợ bị động",
      d: "Chí âm chí độc, hạ độc và làm giảm nội lực đối phương.",
      desc: (lv) => [
        `Đánh trúng ${sk120Scale(lv, 1, 15).toFixed(0)}% yểm chú: thêm độc bằng ${sk120Scale(lv, 30, 85).toFixed(0)}% sát thương đòn đó (hồi 10 giây)`
      ]
    },
    712: {
      fac: "emei",
      n: "Bế Nguyệt Phất Trần",
      prop: "Vòng sáng hỗ trợ",
      d: "Võ công tinh túy, dùng để hỗ trợ số đông.",
      desc: (lv) => [
        `+${Math.round(sk120Scale(lv, 1, 5))} cấp các chiêu hỗ trợ Nga My (Mộng Điệp, Phổ Độ Chúng Sinh…)`
      ]
    },
    713: {
      fac: "cuiyan",
      n: "Ngự Tuyết Ẩn",
      prop: "Hỗ trợ chủ động",
      d: "Tuyết trắng phiêu bồng ẩn tàng bóng dáng kiều nữ.",
      desc: (lv) => [
        `Máu dưới 50%: ẩn thân ${sk120Scale(lv, 5, 30).toFixed(0)} giây (quái đánh trượt)`,
        `Hồi chiêu ${sk120Scale(lv, 60, 40).toFixed(0)} giây`
      ]
    },
    714: {
      fac: "gaibang",
      n: "Hỗn Thiên Khí Công",
      prop: "Hỗ trợ bị động",
      d: "Tuyệt học tập hợp tâm huyết của các vị bang chủ.",
      desc: (lv) => [
        `Đánh trúng ${sk120Scale(lv, 1, 6).toFixed(0)}% yểm chú: quái giảm ${sk120Scale(lv, 2, 10).toFixed(0)}% kháng vật lý, ${sk120Scale(lv, 3, 15).toFixed(0)}% kháng hỏa trong ${sk120Scale(lv, 3, 9).toFixed(0)} giây (hồi 12 giây)`
      ]
    },
    715: {
      fac: "tianren",
      n: "Ma Âm Phệ Phách",
      prop: "Hỗ trợ chủ động",
      d: "Âm tà bí hiểm, làm cho kẻ thù phải hoảng loạn.",
      desc: (lv) => [
        `Từ 3 quái áp sát hoặc máu dưới 40%: quái xung quanh hoảng loạn ${sk120Scale(lv, 1, 4).toFixed(1)} giây`,
        `Hồi chiêu ${sk120Scale(lv, 45, 20).toFixed(0)} giây`
      ]
    },
    716: {
      fac: "wudang",
      n: "Xuất Ứ Bất Nhiễm",
      prop: "Hỗ trợ chủ động",
      d: "Thân tâm thanh tịnh, loại bỏ tất cả trạng thái dị thường.",
      desc: (lv) => [
        `Máu dưới 35%: bất nhiễm ${sk120Scale(lv, 1, 3).toFixed(1)} giây (miễn mọi sát thương)`,
        `Hồi chiêu ${sk120Scale(lv, 35, 15).toFixed(0)} giây`
      ]
    },
    717: {
      fac: "kunlun",
      n: "Lưỡng Nghi Chân Khí",
      prop: "Hỗ trợ bị động",
      d: "Chân khí hộ thể, bảo vệ tính mạng lúc hiểm nguy.",
      desc: (lv) => [
        `Máu dưới 30%: khiên hút ${sk120Scale(lv, 10, 40).toFixed(0)}% sinh lực tối đa trong ${sk120Scale(lv, 5, 10).toFixed(0)} giây, chạy nhanh +${sk120Scale(lv, 5, 35).toFixed(0)}%`,
        `Hồi 20 giây`
      ]
    }
  };

function init120Skills() {
  if (typeof SK == "undefined") return;
  for (const id in SK_120) {
    const item = SK_120[id];
    if (!SK[id]) {
      SK[id] = {
        id: +id,
        n: item.n,
        prop: item.prop,
        d: item.d,
        f: item.fac,
        series: (typeof FAC != "undefined" && FAC[item.fac] ? FAC[item.fac].series : 0),
        req: SK_120_REQ,
        max: SK_120_MAX,
        style: 3,
        melee: 0,
        phys: 0,
        aura: item.prop.includes("Vòng sáng") ? 1 : 0,
        enemy: 0,
        self: 1,
        attr: {},
        learn: "120",
        exp: 1,
        xp: SK_120_XP,
        ic: `img/s/${id}.png`,
        x120: 1
      };
    }
    if (typeof FAC != "undefined" && FAC[item.fac] && !FAC[item.fac].skills.includes(+id)) {
      FAC[item.fac].skills.push(+id);
    }
  }
}

const skIsExp = (id) => !!(SK[id] && SK[id].exp),
  skTrainMap = () => (S.lx && typeof S.lx == "object" ? S.lx : (S.lx = {})),
  skTrainRec = (id) => skTrainMap()[id] || null,
  sk120IdOf = (fac) => {
    for (const id in SK_120) {
      if (SK_120[id].fac === fac) return +id;
    }
    return 0;
  },
  sk150List = (fac) => {
    if (!fac || typeof FAC == "undefined" || !FAC[fac]) return [];
    return FAC[fac].skills.filter(id => SK[id] && SK[id].req >= 150 && SK[id].exp);
  },
  skExpNeeded = (sk, lv) => {
    if (!sk || !sk.xp) return 1e9;
    return sk.xp[Math.min(lv - 1, sk.xp.length - 1)] || 1e9;
  };

function syncExpSkills() {
  if (!S || !S.sk || !S.fac) return;
  init120Skills();
  const tm = skTrainMap();
  const skl = typeof SKL == "function" ? SKL() : (S.skL || {});
  for (const id in skl) {
    if (skIsExp(id) && !tm[id] && skl[id] && skl[id].lv > 0) {
      tm[id] = { lv: skl[id].lv, xp: skl[id].xp || 0 };
    }
  }
  if (S.bkOk) {
    for (const id in S.bkOk) {
      if (S.bkOk[id] && skIsExp(id) && !tm[id] && SK[id] && SK[id].f === S.fac) {
        tm[id] = { lv: 1, xp: 0 };
      }
    }
  }
  for (const id in S.sk) {
    if (skIsExp(id)) {
      if (SK[id] && SK[id].f !== S.fac) {
        delete S.sk[id];
        delete tm[id];
      } else if (!tm[id] && S.sk[id] > 0) {
        tm[id] = { lv: S.sk[id], xp: 0 };
      }
    }
  }
  for (const id in tm) {
    if (skIsExp(id) && SK[id] && SK[id].f === S.fac) {
      S.sk[id] = clamp(0 | tm[id].lv || 1, 1, SK[id].max);
    }
  }
}

function addSkillExp(id, xpAdd) {
  if (!S || !skIsExp(id)) return;
  const sk = SK[id];
  if (!sk) return;
  const tm = skTrainMap();
  let rec = tm[id];
  if (!rec) return;
  if (rec.lv >= sk.max) return;
  rec.xp = (rec.xp || 0) + xpAdd;
  const need = skExpNeeded(sk, rec.lv);
  if (rec.xp >= need) {
    rec.xp -= need;
    rec.lv = Math.min(sk.max, rec.lv + 1);
    S.sk[id] = rec.lv;
    typeof recalc == "function" && recalc();
    typeof renderSkill == "function" && renderSkill();
    typeof toast == "function" && toast(`🔥 Kỹ năng [${sk.n}] đã thăng cấp ${rec.lv}/${sk.max}!`);
  }
}

init120Skills();
document.readyState === "loading"
  ? document.addEventListener("DOMContentLoaded", () => setTimeout(syncExpSkills, 0))
  : setTimeout(syncExpSkills, 0);


