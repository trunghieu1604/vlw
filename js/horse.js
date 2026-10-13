"use strict";
const HORSE_MAX = 20,
  HORSE_UP = 0.04,
  HORSE_PEN = 0.05,
  HORSE_FEED_XP = 100,
  HORSE_KEEP = 0.8,
  HBOOK_MAX = 10,
  HORSE_DROP = { boss: 0.003, gb: 0.02, dg: 0.4, wbS: 0.15 },
  HORSE_RARE = [5, 6, 7, 8, 9, 11, 13, 19, 20, 21, 22],
  isHorse = (n) => !!n && n.d === 10,
  horseLv = (n) => (n && n.hlv) | 0,
  horseNeed = (n) => 40 + n * 35,
  HORSE_KILL_K = 1 / 3;
if (typeof J != "undefined" && J.items && J.items[10] && J.items[10].list) {
  for (const h of J.items[10].list) {
    if (h.n === "Sư tử" || h.k === 22) {
      h.req = (h.req || []).map((r) => (r[0] === 36 ? [36, 150] : r));
    }
  }
}
function horseAdj(n, s) {
  if (!isHorse(n)) return s;
  const t = horseLv(n);
  return s >= 0 ? s * (1 + 0.04 * t) : s * Math.max(0, 1 - 0.05 * t);
}
const horseBook = () => S.hbook || (S.hbook = {}),
  horseBookCount = () => Object.keys(horseBook()).length,
  HC_TIERS = [
    ["Thường", "#b08a5a", 1],
    ["Tốt", "#5fd46a", 1],
    ["Quý", "#5fb8ff", 2],
    ["Thần", "#c77dff", 3],
    ["Danh mã", "#ff9a3c", 4],
    ["Bảo mã", "#ff5a5a", 5],
    ["Chí tôn", "#ffd24a", 6],
  ],
  HC_KIND = {
    5: 3,
    14: 3,
    15: 3,
    17: 3,
    22: 3,
    23: 3,
    24: 3,
    25: 3,
    6: 4,
    8: 4,
    9: 5,
    11: 5,
    13: 5,
    31: 5,
    32: 5,
    7: 6,
    16: 6,
    18: 6,
    19: 6,
    20: 6,
    21: 6,
    30: 6,
  },
  hcKey = (n) => (n.n || "").replace(/\s+\d+$/, "").toLowerCase();
function hcTier(n) {
  if (!isHorse(n) || n.noHc || n.gift) return -1;
  return n.k <= 4 ? (n.lvl <= 4 ? 0 : n.lvl <= 8 ? 1 : 2) : (HC_KIND[n.k] ?? -1);
}
let HC_ALL = null;
function hcAll() {
  if (HC_ALL) return HC_ALL;
  const n = J.items[10],
    s = new Map();
  for (const t of n ? n.list : []) {
    const e = hcTier(Object.assign({}, t, { d: 10 })),
      o = hcKey(t);
    e >= 0 && !s.has(o) && s.set(o, [t.n.replace(/\s+\d+$/, ""), e]);
  }
  return (HC_ALL = s);
}
function hcOwned() {
  const n = new Map();
  for (const s of stable().concat(isHorse(S.eq.horse) ? [S.eq.horse] : [])) {
    if (s.noHc || s.gift) continue;
    const t = hcTier(s);
    t >= 0 && n.set(hcKey(s), t);
  }
  return n;
}
function hcBonus() {
  const n = hcOwned();
  let s = 0;
  for (const t of n.values()) s += HC_TIERS[t][2];
  return { n: n.size, hp: n.size, xp: s };
}
function horseFixReq(n) {
  if (!isHorse(n) || !n.req || n.noHc || n.gift) return;
  const s = n.req.find((e) => e[0] === 36);
  if (!s) return;
  let t = null;
  if (n.thanma) {
    const e = typeof tmDef == "function" && tmDef(n.thanma);
    e && (t = e[4]);
  } else {
    const e = J.items[10] && J.items[10].list.find((r) => r.k === n.k && r.lvl === n.lvl),
      o = e && e.req.find((r) => r[0] === 36);
    o && (t = o[1]);
  }
  t != null && s[1] !== t && (s[1] = t);
}
function horseAttr(n) {
  for (const t of stable().concat(S.inv.filter(isHorse), isHorse(S.eq.horse) ? [S.eq.horse] : [])) horseFixReq(t);
  const s = hcBonus();
  (s.hp && addAttr(n, "lifemax_p", [s.hp, 0, 0]), s.xp && addAttr(n, "expenhance_p", [s.xp, 0, 0]));
}
function horseKindName(n) {
  const s = horseBook()[n];
  if (typeof s == "string") return s;
  if (isNaN(+n)) return n;
  const t = J.items[10],
    e = t && t.list.find((o) => o.k === +n);
  return e ? e.n.replace(/\s+\d+$/, "") : "Ngựa";
}
function horseGainXp(n, s) {
  const t = S.eq.horse;
  if (!isHorse(t)) return !1;
  const e = horseBook(),
    o = t.n.replace(/\s+\d+$/, "");
  if ((e[o] || (e[t.k] === o && delete e[t.k], (e[o] = o)), horseLv(t) >= 20)) return !1;
  t.hxp = (t.hxp || 0) + n;
  let r = !1;
  for (; horseLv(t) < 20 && t.hxp >= horseNeed(horseLv(t));)
    ((t.hxp -= horseNeed(horseLv(t))), (t.hlv = horseLv(t) + 1), (r = !0));
  return (
    horseLv(t) >= 20 && (t.hxp = 0),
    r &&
      ((R.dirty = !0),
      (invDirty = !0),
      R.quiet ||
        (log(`<b class="up">${esc(t.n)}</b> thuần dưỡng lên cấp ${t.hlv}`),
        s || addText(H.x, H.y - 70, `Ngựa cấp ${t.hlv}`, "#ffd24a", 12)),
      typeof recSet == "function" && recSet("horseLv", t.hlv, { n: t.n })),
    r
  );
}
const horseFeedCost = (n) => 3 + Math.floor(horseLv(n) / 2);
function horseFeed(n = 1) {
  const s = S.eq.horse;
  if (!isHorse(s)) return { ok: !1, msg: "Chưa cưỡi ngựa" };
  let t = 0,
    e = 0;
  for (; t < n && horseLv(s) < 20; t++) {
    const o = horseFeedCost(s);
    if ((S.knb | 0) < o) break;
    ((S.knb = (S.knb | 0) - o), (e += o), horseGainXp(100, !0));
  }
  return t
    ? (save(), { ok: !0, msg: `Cho ăn ${t} lần (−${e} KNB) · cấp ${horseLv(s)}` })
    : { ok: !1, msg: horseLv(s) >= 20 ? "Ngựa đã thuần dưỡng tối đa" : "Không đủ Kim Nguyên Bảo" };
}
const horseMoveCost = () => Math.round(2e3 * (1 + S.lvl / 10));
function horseTransfer(n) {
  const s = S.eq.horse;
  if (!isHorse(s) || !isHorse(n) || s === n || !(S.inv.includes(n) || stable().includes(n)))
    return { ok: !1, msg: "Chọn một ngựa trong hành trang" };
  const t = Math.floor(horseLv(s) * 0.8);
  return t <= horseLv(n)
    ? { ok: !1, msg: "Ngựa nhận đã có cấp cao hơn hoặc bằng" }
    : payGold(horseMoveCost())
      ? ((n.hlv = t),
        (n.hxp = 0),
        (s.hlv = 0),
        (s.hxp = 0),
        (R.dirty = !0),
        (invDirty = !0),
        save(),
        { ok: !0, msg: `Chuyển thuần dưỡng: ${n.n} cấp ${t}` })
      : { ok: !1, msg: "Không đủ ngân lượng" };
}
function horseRoll(n) {
  const s = J.items[10];
  if (!s) return null;
  const t = (c) => (c.req.find((l) => l[0] === 36) || [0, 0])[1],
    o = (n ? HORSE_RARE : [0, 1, 2, 3, 4])
      .map((c) => s.list.filter((l) => l.k === c && sexReqOk(l.req) && t(l) <= eqLevel()))
      .filter((c) => c.length);
  if (!o.length) return n ? horseRoll(!1) : null;
  const r = pick(o),
    h = r.reduce((c, l) => (l.lvl > c.lvl ? l : c)),
    a = makeItem(10, h.k, h.lvl, 0);
  return a ? (n && ((a.r = 2), (a.rareH = 1)), a) : null;
}
const HB_TIERS = [
    ["Thường", 0.56, 0, 0],
    ["Tốt", 0.315, 1, 1],
    ["Quý", 0.06, 2, 2],
    ["Thần", 0.03, 3, 3],
    ["Danh mã", 0.02, 3, 4],
    ["Bảo mã", 0.01, 4, 5],
    ["Chí tôn", 0.005, 4, 6],
  ],
  HB_DROP = { boss: 0.02, gb: 0.25, dg: 0.5 },
  horseBoxHave = () => matHave("misc", "rngua");
function horseBoxGive(n, s) {
  (matAdd("misc", "rngua", n),
    (invDirty = !0),
    s && !R.quiet && log(`🎁 ${s}: nhận <b style="color:#ffd24a">${n} Rương Ngựa</b> (Kỳ Trân Các › Thú cưỡi › Dùng)`));
}
function horseBoxOpen() {
  const n = J.items[10];
  if (!n) return "Rương trống";
  let s = Math.random(),
    t = HB_TIERS.length - 1;
  for (let u = 0; u < HB_TIERS.length; u++) {
    if (s < HB_TIERS[u][1]) {
      t = u;
      break;
    }
    s -= HB_TIERS[u][1];
  }
  const [e, , o, r] = HB_TIERS[t],
    h = n.list.filter((u) => hcTier(Object.assign({}, u, { d: 10 })) === r && sexReqOk(u.req));
  if (!h.length) return "Rương trống";
  const a = {};
  for (const u of h) (a[u.n.replace(/\s+\d+$/, "").toLowerCase()] ||= []).push(u);
  const c = pick(pick(Object.values(a))),
    l = makeItem(10, c.k, c.lvl, 0);
  return l
    ? ((l.r = o),
      t >= 2 && ((l.rareH = 1), (l.lock = 1)),
      (l.hbt = t),
      horseFixReq(l),
      addItem(l, !0, !0, !0),
      t >= 2 &&
        log(
          `🐎 <b style="color:#ffd24a">Rương Ngựa: ngựa ${e}!</b> Nhận <b style="color:${RAR_COL[l.r]}">${esc(l.n)}</b> (tự khóa 🔒)`,
        ),
      `Rương Ngựa (${e}): ${l.n}`)
    : "Rương trống";
}
function horseBoxUse(n = 1) {
  const s = [];
  let t = 0;
  for (; t < n && !(horseBoxHave() < 1); t++) {
    if (S.inv.length >= INV_MAX) {
      s.push("Hành trang đầy");
      break;
    }
    (matAdd("misc", "rngua", -1), s.push(horseBoxOpen()));
  }
  if (!t) {
    toast(horseBoxHave() < 1 ? "Không có Rương Ngựa" : "Hành trang đầy");
    return;
  }
  (log(
    `🎁 Mở ${t} Rương Ngựa: ${esc(
      s
        .filter((e) => e !== "Hành trang đầy")
        .map((e) => e.replace(/^Rương Ngựa /, ""))
        .join(" · "),
    )}`,
  ),
    toast(t > 1 ? `Mở ${t} Rương Ngựa` : s[0]),
    uiSfx("learn"),
    (R.dirty = !0),
    (invDirty = !0),
    save(),
    refresh());
}
function horseOnKill(n) {
  (horseGainXp((n.cls === "boss" ? 10 : n.cls === "elite" ? 3 : 1) * HORSE_KILL_K),
    !(n.cls !== "boss" && !n.goldBoss) &&
      Math.random() < (n.goldBoss ? HB_DROP.gb : HB_DROP.boss) &&
      horseBoxGive(1, n.goldBoss ? "Trùm Hoàng Kim" : "Hạ trùm"));
}
const mountHaste = () => clamp(R.P ? R.P.speed : 1, 1, 1.8);
function drawMount(n, s) {
  if (!S.eq.horse || !R.mounted || S.lowFx) {
    R.dust = null;
    return;
  }
  const t = R.dust || (R.dust = []);
  H.moving &&
    R.deadT <= 0 &&
    ((R.dustT = (R.dustT || 0) - s),
    R.dustT <= 0 && ((R.dustT = 0.07), t.push({ x: H.x + rnd(-8, 8), y: H.y + rnd(-2, 3), life: 0.55 })));
  const e = lookOn() && R.look,
    o = (e && e.dust) || "#b89c6c",
    r = (e && e.hlv) || 0,
    h = R.clock || performance.now() / 1e3;
  if (r >= 2 && R.deadT <= 0) {
    const a = 0.5 + 0.5 * Math.sin(h * 3),
      c = n.createRadialGradient(H.x, H.y, 2, H.x, H.y, 34);
    (c.addColorStop(0, o),
      c.addColorStop(1, "rgba(0,0,0,0)"),
      (n.globalAlpha = 0.22 + 0.16 * a),
      (n.fillStyle = c),
      n.beginPath(),
      n.ellipse(H.x, H.y + 1, 34, 13, 0, 0, 7),
      n.fill(),
      r >= 3 &&
        ((R.hsT = (R.hsT || 0) - s),
        R.hsT <= 0 && ((R.hsT = 0.12), t.push({ x: H.x + rnd(-22, 22), y: H.y + rnd(-4, 4), life: 0.9, up: !0 }))));
  }
  for (const a of t) {
    if (((a.life -= s), a.up)) {
      const l = clamp(a.life / 0.9, 0, 1);
      ((n.globalAlpha = l * 0.85),
        (n.fillStyle = o),
        n.beginPath(),
        n.arc(a.x, a.y - (1 - l) * 46, 1.6 + l * 1.4, 0, 7),
        n.fill());
      continue;
    }
    const c = clamp(a.life / 0.55, 0, 1);
    ((n.globalAlpha = c * (r ? 0.6 : 0.45)),
      (n.fillStyle = o),
      n.beginPath(),
      n.ellipse(a.x, a.y, 4 + (1 - c) * 9, 2 + (1 - c) * 3, 0, 0, 7),
      n.fill());
  }
  ((n.globalAlpha = 1), (R.dust = t.filter((a) => a.life > 0)));
}
const STABLE_MAX = 60,
  stable = () => S.stable || (S.stable = []);
function stableIn(n) {
  return !isHorse(n) || !S.inv.includes(n)
    ? { ok: !1, msg: "Chọn ngựa trong hành trang" }
    : stable().length >= STABLE_MAX
      ? { ok: !1, msg: `Mã Trường đầy (${STABLE_MAX})` }
      : ((S.inv = S.inv.filter((s) => s !== n)),
        stable().push(n),
        (invDirty = !0),
        (R.dirty = !0),
        save(),
        { ok: !0, msg: "Đã đưa " + n.n + " vào Mã Trường" });
}
function stableOut(n) {
  const s = stable();
  return s.includes(n)
    ? S.inv.length >= INV_MAX
      ? { ok: !1, msg: "Hành trang đầy" }
      : ((S.stable = s.filter((t) => t !== n)),
        S.inv.unshift(n),
        (invDirty = !0),
        (R.dirty = !0),
        save(),
        { ok: !0, msg: "Lấy " + n.n + " ra hành trang" })
    : { ok: !1, msg: "Không có trong Mã Trường" };
}
function stableRide(n) {
  if (!isHorse(n)) return { ok: !1, msg: "Không phải ngựa" };
  if (!reqOk(n)) return { ok: !1, msg: "Chưa đủ điều kiện: " + reqProblems(n).join("; ") };
  const s = S.eq.horse;
  return (
    (S.stable = stable().filter((t) => t !== n)),
    (S.inv = S.inv.filter((t) => t !== n)),
    (S.eq.horse = n),
    s && s !== n && (stable().length < STABLE_MAX ? stable().push(s) : S.inv.unshift(s)),
    (R.dirty = !0),
    (invDirty = !0),
    (R.rideCd = 0),
    typeof setMount == "function" && setMount(!0, !0),
    save(),
    { ok: !0, msg: "Cưỡi " + n.n }
  );
}
function horsePickModal() {
  const n = S.eq.horse,
    s = stable()
      .map((e) => [e, "st"])
      .concat(S.inv.filter(isHorse).map((e) => [e, "inv"])),
    t = ([
      e,
      o,
    ]) => `<div class="qrow"><span><b style="color:${RAR_COL[e.r]}">${esc(e.n)}</b><small>${o === "st" ? "Mã Trường" : "Hành trang"} · cấp yêu cầu ${(e.req.find((r) => r[0] === 36) || [0, 0])[1]} · thuần dưỡng ${horseLv(e)} · ${esc(horseStatLine(e))}</small></span>
    <span class="btnrow"><button class="btn sm" data-hr="${e.uid}" ${reqOk(e) ? "" : "disabled"}>Cưỡi</button></span></div>`;
  modal(
    `<h3>Chọn ngựa <small>${stable().length}/${STABLE_MAX} trong Mã Trường</small></h3>
    ${
      n
        ? `<div class="card"><b style="color:${RAR_COL[n.r]}">${esc(n.n)}</b> <small class="dim">đang dùng · thuần dưỡng ${horseLv(n)}</small><p class="small">${esc(horseStatLine(n))}</p>
      <div class="btnrow"><button class="btn" id="hpInfo">Chi tiết</button><button class="btn" id="hpBack" ${stable().length < STABLE_MAX ? "" : "disabled"}>Cất vào Mã Trường</button></div></div>`
        : ""
    }
    ${s.length ? s.map(t).join("") : '<p class="dim small">Chưa có ngựa nào khác. Ngựa nhặt được nằm trong hành trang, bấm vào ngựa → "Cất vào Mã Trường".</p>'}
    <div class="btnrow"><button class="btn" id="hpStable">Mở Mã Trường</button></div>`,
    () => {
      document.querySelectorAll("#mBody [data-hr]").forEach(
        (h) =>
          (h.onclick = () => {
            const a = s.map((l) => l[0]).find((l) => l.uid === +h.dataset.hr),
              c = stableRide(a);
            (toast(c.msg), c.ok && (uiSfx("equipCloth"), refresh()), horsePickModal());
          }),
      );
      const e = $("#hpInfo");
      e && (e.onclick = () => itemModal(n, "horse"));
      const o = $("#hpBack");
      o &&
        (o.onclick = () => {
          (delete S.eq.horse,
            stable().push(n),
            (R.mounted = !1),
            (R.dirty = !0),
            (invDirty = !0),
            save(),
            refresh(),
            horsePickModal());
        });
      const r = $("#hpStable");
      r &&
        (r.onclick = () => {
          typeof actModal == "function" && actModal("horse");
        });
    },
  );
}
function horseStatLine(n) {
  const s = [];
  for (const [t, e, o] of n.base) {
    const r = attrName(t);
    if (r === "staminamax_v") continue;
    const h = Math.round(horseAdj(n, ((e + o) / 2) * enhMul(n)));
    s.push(attrText(r, [h, 0, h]));
  }
  return s.join(" · ");
}
function stableBody() {
  const n = S.eq.horse,
    s = S.inv.filter(isHorse),
    t = stable(),
    e = isHorse(n)
      ? (() => {
          const i = horseLv(n),
            f = horseNeed(i),
            g = i >= 20 ? 100 : Math.round(((n.hxp || 0) / f) * 100);
          return `<div class="card"><div class="idet"><div class="pic r${n.r}">${n.ic ? `<img src="${esc(n.ic)}" alt="">` : ""}</div><div><h4 style="color:${RAR_COL[n.r]}">${esc(n.n)}</h4>
      <small class="dim">Thuần dưỡng cấp <b>${i}/20</b> · chỉ số +${Math.round(i * 0.04 * 100)}% · phạt né tránh −${Math.min(100, Math.round(i * 0.05 * 100))}%</small></div></div>
      <div class="bar xpb"><i style="width:${g}%"></i><span>${i >= 20 ? "Tối đa" : `${Math.floor(n.hxp || 0)} / ${f}`}</span></div>
      <p class="small">${esc(horseStatLine(n))}</p>
      <div class="btnrow"><button class="btn" id="hFeed" ${i < 20 && (S.knb | 0) >= horseFeedCost(n) ? "" : "disabled"}>Cho ăn (${horseFeedCost(n)} KNB, +100)</button><button class="btn" id="hFeed10" ${i < 20 && (S.knb | 0) >= horseFeedCost(n) ? "" : "disabled"}>Cho ăn ×10</button></div></div>`;
        })()
      : '<div class="card"><p class="desc">Chưa cưỡi ngựa. Ngựa chỉ có từ <b>Rương Ngựa</b> (Kỳ Trân Các › Thú cưỡi 20 KNB, hoặc rơi từ trùm / phó bản): Thường 56% · Tốt 31,5% · Quý 6% · Thần 3% · Danh mã 2% · Bảo mã 1% · Chí tôn 0,5%.</p></div>',
    o = (
      i,
      f,
    ) => `<div class="qrow"><span><b style="color:${RAR_COL[i.r]}">${esc(i.n)}</b><small>cấp yêu cầu ${(i.req.find((g) => g[0] === 36) || [0, 0])[1]} · thuần dưỡng ${horseLv(i)} · ${esc(horseStatLine(i))}</small></span><small></small>
    <span class="btnrow"><button class="btn sm" data-ride="${i.uid}" ${reqOk(i) ? "" : "disabled"}>Cưỡi</button>${isHorse(n) && Math.floor(horseLv(n) * 0.8) > horseLv(i) ? `<button class="btn sm" data-mv="${i.uid}">Chuyển cấp (${fmtL(horseMoveCost())})</button>` : ""}${f === "st" ? `<button class="btn sm" data-sout="${i.uid}">Lấy ra</button>` : `<button class="btn sm" data-sin="${i.uid}">Cất vào Mã Trường</button>`}</span></div>`,
    r = s.map((i) => o(i, "inv")).join(""),
    h = t.map((i) => o(i, "st")).join(""),
    a = hcOwned(),
    c = hcAll(),
    l = hcBonus(),
    u = HC_TIERS.map(([i, f, g], p) => {
      const m = [...c].filter(([, d]) => d[1] === p),
        b = m.filter(([d]) => a.has(d)).length;
      return `<div class="hct"><b style="color:${f}">${i}</b> <small class="dim">${b}/${m.length} · mỗi loài +1% sinh lực, +${g}% EXP</small><div class="chips">${m.map(([d, v]) => `<span class="chip2${a.has(d) ? " hc-on" : ""}" title="${a.has(d) ? "Đã có" : "Chưa có"}">${a.has(d) ? "✓ " : ""}${esc(v[0])}</span>`).join("")}</div></div>`;
    }).join("");
  return `<p class="desc">Ngựa đang cưỡi lên cấp khi hạ quái (thường 1, tinh anh 3, trùm 10) hoặc cho ăn. Mỗi cấp +${0.04 * 100}% chỉ số ngựa, giảm ${0.05 * 100}% phạt né tránh. Tốc độ chạy của ngựa chỉ tính khi đang cưỡi (phím M / Auto tự lên ngựa khi di chuyển).</p>
    ${e}
    <h4 class="rech">Ngựa trong Mã Trường <small class="dim">${t.length}/${STABLE_MAX}</small></h4>${h || '<p class="dim small">Trống. Ngựa nhặt được nằm trong hành trang: bấm "Cất vào Mã Trường".</p>'}
    <h4 class="rech">Ngựa trong hành trang</h4>${r || '<p class="dim small">Không có ngựa nào khác. Chuyển thuần dưỡng sang ngựa mới giữ 80% cấp.</p>'}
    <h4 class="rech">Bộ sưu tập Mã Trường <small class="dim">${l.n}/${c.size} loài · <b class="gold">+${l.hp}% sinh lực · +${l.xp}% EXP</b></small></h4>
    <p class="dim small">Mỗi loài ngựa nằm trong Mã Trường (hoặc đang cưỡi) được cộng 1 lần. Ngựa trùng loài không cộng thêm.</p>${u}`;
}
function bindStable(n) {
  const s = (o, r) => {
      const h = $(o);
      h && (h.onclick = r);
    },
    t = (o) => {
      (toast(o.msg), o.ok && uiSfx("learn"), n());
    };
  (s("#hFeed", () => t(horseFeed(1))), s("#hFeed10", () => t(horseFeed(10))));
  const e = (o) => S.inv.concat(stable()).find((r) => r.uid === +o);
  (document.querySelectorAll("#mBody [data-ride]").forEach(
    (o) =>
      (o.onclick = () => {
        const r = e(o.dataset.ride);
        if (r) {
          const h = stableRide(r);
          (toast(h.msg), refresh());
        }
        n();
      }),
  ),
    document.querySelectorAll("#mBody [data-mv]").forEach((o) => (o.onclick = () => t(horseTransfer(e(o.dataset.mv))))),
    document.querySelectorAll("#mBody [data-sin]").forEach((o) => (o.onclick = () => t(stableIn(e(o.dataset.sin))))),
    document
      .querySelectorAll("#mBody [data-sout]")
      .forEach((o) => (o.onclick = () => t(stableOut(e(o.dataset.sout))))));
}
