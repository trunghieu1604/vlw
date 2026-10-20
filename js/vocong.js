"use strict";
const BOOK_N = {
  bk90: "Võ Lâm Mật Tịch 90",
  bk120: "Bí Kíp 120",
  bk150: "Bí Kíp 150",
  bk180: "Bí Kíp 180",
};
(function () {
  for (const t of Object.values(SK)) t && t.learn === "90" && ((t.req = 80), (t.book = "bk90"), (t.tier = 90));
})();
const bookOk = (n) =>
  !n.book ||
  rebornN() > 0 ||
  (S.sk[n.id] || 0) > 0 ||
  !!(S.bkOk && S.bkOk[n.id]) ||
  (typeof matHave == "function" && matHave("misc", n.book) > 0);
function bookUse(n) {
  const t = SK[n];
  !t ||
    !t.book ||
    (S.sk[n] || 0) > 0 ||
    (S.bkOk && S.bkOk[n]) ||
    (matAdd("misc", t.book, -1),
    ((S.bkOk || (S.bkOk = {}))[n] = 1),
    log(`📖 Lĩnh ngộ <b style="color:#ffd24a">${esc(t.n)}</b> (dùng 1 ${BOOK_N[t.book]})`));
}
function tayTuyModal() {
  const n = Object.values(S.attr).reduce((s, o) => s + o, 0),
    t = Object.keys(S.sk).reduce((s, o) => s + (SK[o] && SK[o].tier === 90 && !isBr90(o) ? 0 : S.sk[o]), 0);
  modal(
    `<h3>Tẩy Tủy</h3><p class="desc">Trả lại điểm đã cộng để phân phối lại. Miễn phí, dùng bao nhiêu lần cũng được. Võ công 90 lĩnh ngộ bằng Mật Tịch được giữ nguyên cấp; mọi võ công khác hoàn lại toàn bộ điểm.</p>
    <div class="card stats"><span>Tiềm năng đã cộng</span><span>${n}</span><span>Điểm kỹ năng đã cộng</span><span>${Math.max(0, t)}</span></div>
    <div class="btnrow"><button class="btn" id="ttA" ${n ? "" : "disabled"}>Tẩy tiềm năng</button><button class="btn" id="ttS" ${t > 0 ? "" : "disabled"}>Tẩy kỹ năng</button><button class="btn" id="ttAll" ${n || t > 0 ? "" : "disabled"}>Tẩy cả hai</button></div>`,
    () => {
      (($("#ttA").onclick = () => tayTuy(!0, !1)),
        ($("#ttS").onclick = () => tayTuy(!1, !0)),
        ($("#ttAll").onclick = () => tayTuy(!0, !0)));
    },
  );
}
function tayTuy(n, t) {
  if (n) for (const s in S.attr) ((S.attrPts += S.attr[s]), (S.attr[s] = 0));
  if (t) {
    const s = FAC[S.fac].starter,
      o = S.bkOk || (S.bkOk = {}),
      i = {};
    for (const c in S.sk) {
      if (!SK[c] || S.sk[c] <= 0) continue;
      SK[c].book && (o[c] = 1);
      if (SK[c].tier === 90 && !isBr90(c)) {
        i[c] = S.sk[c];
      } else if (typeof skIsExp == "function" && skIsExp(c)) {
        i[c] = S.sk[c];
      } else {
        S.skPts += S.sk[c];
      }
    }
    ((S.sk = i), (S.main = 0), (S.mainLock = !1), (S.slots = [0, 0, 0, 0]));
    typeof syncExpSkills == "function" && syncExpSkills();
  }
  ((R.dirty = !0),
    recalc(),
    (R.life = Math.min(R.life, R.P.life)),
    (R.mana = Math.min(R.mana, R.P.mana)),
    fillSlots(),
    renderPad(),
    closeModal(!0),
    refresh(),
    save(),
    uiSfx("learn"),
    log(
      `🌊 Tẩy Tủy: ${[n && "tiềm năng", t && "kỹ năng"].filter(Boolean).join(" + ")} đã hoàn lại (${S.attrPts} tiềm năng, ${S.skPts} điểm kỹ năng).`,
    ));
}
function skLearn(n) {
  const t = SK[n];
  if (!t || !canLearn(t)) return !1;
  if ((R.sim || bookUse(n), sk9Free(t) || S.skPts--, t.tier === 90 && !isBr90(n))) {
    const s = SKL();
    ((S.sk[n] = Math.max(1, s[n] ? s[n].lv : 1)), s[n] || (s[n] = { lv: 1, xp: 0 }));
  } else S.sk[n] = (S.sk[n] || 0) + 1;
  return !0;
}
const SK9_BRANCH = {
    332: [93, 89, 86, 92, 282],
    391: [136, 137, 140, 364, 143],
    394: [392, 174, 393, 175, 181, 90],
    390: [67, 70, 64, 73, 356, 72],
    351: [347, 303, 343, 345, 349],
  },
  isBr90 = (n) => !!SK9_BRANCH[n];
function sk9BranchCap(n) {
  const t = SK9_BRANCH[n],
    s = SK[n];
  if (!t || !s) return 0;
  const o = Math.min(...t.map((i) => S.sk[i] || 0));
  return o < 5 ? 0 : Math.min(s.max, 1 + Math.round(((o - 5) * 19) / 15));
}
function sk9SyncBranch() {
  if (S.sk && !S.br90) {
    S.br90 = 1;
    for (const n in SK9_BRANCH) S.sk[n] > 1 && (S.sk[n] = 1);
  }
  for (const n in SK9_BRANCH) {
    const t = (S.sk && S.sk[n]) || 0;
    if (!t) continue;
    const s = sk9BranchCap(+n);
    t > s && ((S.skPts += t - s), s > 0 ? (S.sk[n] = s) : delete S.sk[n]);
  }
}
// admin "exp" document, key sk9 (server/admin_sections/exp.py): training points per kill, minimum monster level, offline, need curve
const sk9Cfg = (k, d) => (self.GCFG ? GCFG.get("exp", "sk9." + k, d) : d),
  // a kill trains when the monster is level minLv (81) or more, whatever the character's level
  sk9MinL = () => sk9Cfg("minLv", 81),
  SK9_NEED = (n) => Math.max(1, Math.round((25 * Math.pow(n, 1.35) + 25) * sk9Cfg("needMul", 1) * Math.pow(sk9Cfg("growth", 1), n - 1))),
  SKL = () => S.skL || (S.skL = {});
function sk9Using(n, t) {
  const s = SK[n];
  return !isAttack(s) || !!(t && t[n]);
}
function sk9Gain(n, t, s) {
  if (!S.fac || !FAC[S.fac] || !(n > 0)) return;
  const o = SKL();
  for (const i in S.sk) {
    const c = SK[i];
    if (!c || c.tier !== 90 || !S.sk[i] || SK9_BRANCH[i] || !sk9Using(i, s)) continue;
    const a = o[i] || (o[i] = { lv: S.sk[i], xp: 0 });
    if (!(a.lv >= c.max)) {
      for (a.xp = Math.round((a.xp + n) * 100) / 100; a.lv < c.max && a.xp >= SK9_NEED(a.lv);)
        ((a.xp -= SK9_NEED(a.lv)),
          a.lv++,
          (S.sk[i] = a.lv),
          (R.dirty = !0),
          t ||
            (log(`🔥 Luyện thành <b style="color:#ffd24a">${esc(c.n)}</b> cấp ${a.lv}/${c.max}`),
            toast(`${c.n} lên cấp ${a.lv}`)));
      a.lv >= c.max && (a.xp = 0);
    }
  }
}
function sk9OnKill(n) {
  !n ||
    !(n.L >= sk9MinL()) ||
    sk9Gain(n.cls === "boss" ? sk9Cfg("boss", 20) : n.cls === "elite" ? sk9Cfg("elite", 3) : sk9Cfg("normal", 1), !1, n.hitSk);
}
// Training progress ("độ thuần thục", JX1 skill_skillexp_v) of a trained level-90 skill, from a character's
// sk / skL (no context swap: the live updater reads disciples through charGet). null: not a trained 90 skill
// or not learned. JX1's client shows it as "nCurExp / (need / 100)" %; here with one decimal.
function sk9Prog(id, sk, L) {
  const t = SK[id],
    s = sk && sk[id];
  if (!t || t.tier !== 90 || SK9_BRANCH[id] || !s) return null;
  const e = L && L[id],
    lv = Math.max(s, (e && e.lv) || 0),
    max = t.max,
    done = lv >= max,
    need = done ? 0 : SK9_NEED(lv),
    xp = done ? 0 : Math.max(0, Math.min(need, (e && e.xp) || 0)),
    pct = done ? 100 : (xp / need) * 100;
  return { lv, max, xp, need, pct, done };
}
const sk9Pct = (p) => (Math.floor(p.pct * 10) / 10).toFixed(1).replace(".", ","),
  sk9Line = (p) =>
    p.done ? `Luyện: đại thành (cấp ${p.max}/${p.max})` : `Luyện: ${sk9Pct(p)}% (cấp ${p.lv}/${p.max})`,
  sk9Short = (p) => (p.done ? "MAX" : Math.floor(p.pct) + "%"),
  sk9Ctx = () => (typeof PCTX < "u" ? PCTX : 0);
// progress bar of skill id of the character in S; kind "c" (skill cell), "r" (list row), "d" (detail popup).
// data-sk9="<char>:<id>" lets sk9Live() refresh it while farming without re-rendering the window
function sk9BarHTML(id, kind) {
  const p = sk9Prog(id, S.sk, S.skL);
  if (!p) return "";
  const k = `${sk9Ctx()}:${id}`,
    w = `<span class="sk9b${p.done ? " done" : ""}" data-sk9="${k}"><b style="width:${p.pct}%"></b></span>`;
  return kind === "c"
    ? `<span class="sk9c" title="${sk9Line(p)}"><em data-sk9s="${k}">${sk9Short(p)}</em>${w}</span>`
    : `<div class="sk9${kind}">${w}<span class="sk9t" data-sk9t="${k}">${sk9Line(p)}${kind === "d" && !p.done ? ` · ${Math.floor(p.xp)}/${p.need} điểm` : ""}</span>${kind === "d" && !p.done ? `<small class="dim">Mỗi quái cấp ≥ ${Math.max(1, sk9MinL())} bị hạ: +${sk9Cfg("normal", 1)} điểm (tinh anh +${sk9Cfg("elite", 3)}, trùm +${sk9Cfg("boss", 20)})${isAttack(SK[id]) ? "; chiêu phải đánh trúng quái đó" + (sk9Cfg("offline", !0) ? ", lúc vắng mặt chỉ luyện chiêu chính" : "") : ""}${sk9Cfg("offline", !0) ? "" : "; vắng mặt không luyện"}.</small>` : ""}</div>`;
}
// Võ công window, under the "Chiêu chính" bar: training of the current main skill when it is a 90 skill
function sk9MainHTML() {
  const m = R.P && R.P.main,
    h = m && m.id && sk9BarHTML(m.id, "m");
  return h ? h.replace('<div class="sk9m">', `<div class="sk9m"><span class="dim">${esc(m.n)}</span>`) : "";
}
// called by updateTop (main context, ~10 / s): refresh every visible bar, cell title and the hotbar titles
function sk9Live() {
  if (typeof document > "u") return;
  const get = (k, key) => (typeof charGet == "function" ? charGet(k, key) : S[key]),
    cache = {},
    prog = (ks) => {
      if (ks in cache) return cache[ks];
      const [k, id] = ks.split(":").map(Number);
      return (cache[ks] = sk9Prog(id, get(k, "sk"), get(k, "skL")));
    };
  document.querySelectorAll("[data-sk9]").forEach((e) => {
    const p = prog(e.dataset.sk9);
    if (!p) return;
    const w = p.pct + "%",
      b = e.firstElementChild;
    (b && b.style.width !== w && (b.style.width = w), e.classList.toggle("done", p.done));
    const c = e.parentElement;
    c && c.classList.contains("sk9c") && c.title !== sk9Line(p) && (c.title = sk9Line(p));
  });
  document.querySelectorAll("[data-sk9t]").forEach((e) => {
    const p = prog(e.dataset.sk9t);
    if (!p) return;
    const t = sk9Line(p) + (e.closest(".sk9d") && !p.done ? ` · ${Math.floor(p.xp)}/${p.need} điểm` : "");
    e.textContent !== t && (e.textContent = t);
  });
  document.querySelectorAll("[data-sk9s]").forEach((e) => {
    const p = prog(e.dataset.sk9s),
      t = p ? sk9Short(p) : "";
    e.textContent !== t && (e.textContent = t);
  });
  // hotbar (main character): slot / main-skill button titles carry the training %
  if (sk9Ctx() || !S.sk) return;
  const tip = (e, id) => {
    if (!e) return;
    const p = sk9Prog(id, S.sk, S.skL),
      base = (e.title || "").replace(/ · Luyện: [^·(]*\([^)]*\)/, ""),
      t = p ? base + " · " + sk9Line(p) : base;
    e.title !== t && (e.title = t);
  };
  document.querySelectorAll("#pad .sk").forEach((e) => tip(e, S.slots && S.slots[+e.dataset.i]));
  tip(document.querySelector("#bMain"), R.P && R.P.main && R.P.main.id);
}
function sk9Text(n) {
  const t = SK[n],
    s = SKL()[n];
  if (!t || t.tier !== 90) return "";
  if (SK9_BRANCH[n]) {
    const o = SK9_BRANCH[n].filter((i) => SK[i]);
    return `Không luyện: cộng điểm kỹ năng, tối đa cấp ${sk9BranchCap(n)} (tất cả chiêu hỗ trợ đạt 5 → 1, mỗi lần tất cả +1 → +1, tất cả 20 → 20) · ${o.map((i) => `${SK[i].n} ${S.sk[i] || 0}`).join(", ")}`;
  }
  return !s || s.lv >= t.max
    ? s
      ? "Đã luyện tối đa"
      : "Học xong rồi luyện bằng cách đánh quái"
    : `Luyện ${Math.floor(s.xp)}/${SK9_NEED(s.lv)}`;
}
