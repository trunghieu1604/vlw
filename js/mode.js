"use strict";
const BOSS_ROUNDS = 3,
  zoneFirst = (t) => t * ZONE_STAGES + 1,
  effLv = () => (rebornN() ? MAX_LEVEL : S.lvl),
  zoneOpen = (t) => !!ZONES[t] && (ZONES[t].lo <= effLv() + 3 || S.maxStage >= zoneFirst(t));
function bestZoneIdx(t = S.lvl) {
  let n = 0;
  return (
    ZONES.forEach((e, o) => {
      e.lo <= t && zoneOpen(o) && (n = o);
    }),
    n
  );
}
const zoneIdxForLevel = (t) => {
  const n = ZONES.findIndex((e) => t <= e.hi);
  return n < 0 ? ZONES.length - 1 : n;
};
function farmStage(t) {
  const n = zoneFirst(t);
  let e = n,
    o = 1e9;
  for (let s = 0; s < ZONE_STAGES; s++) {
    const a = n + s;
    if (a > STAGES) break;
    const i = Math.abs(stageLevel(a) - S.lvl);
    i < o && ((o = i), (e = a));
  }
  return e;
}
function syncMaxStage() {
  for (let t = 0; t < ZONES.length; t++)
    zoneOpen(t) && (S.maxStage = Math.max(S.maxStage || 1, Math.min(STAGES, zoneFirst(t) + ZONE_STAGES - 1)));
}
function gotoZone(t, n, e) {
  if (!ZONES[t] || R.dg || R.tower) return !1;
  R.town && backFromTown();
  const o = farmStage(t),
    s = zoneIdx(Math.min(S.stage, STAGES)) === t;
  if (((S.stage = o), (S.wave = 1), !s)) {
    e || ((R.enemies = []), (R.corpses = []), (R.spawnT = 0.6));
    const a = zoneOf(o);
    ((R.zoneShown = a.id),
      onZoneChange(a),
      (R.banner = { t: 2.2, text: a.n, sub: n || `Cấp ${a.lo}–${a.hi}` }),
      n && log(`🗺 ${esc(n)}: tới <b>${esc(a.n)}</b>`));
  }
  return !0;
}
const bossRoundDue = () => (R.round || 0) % 3 === 2;
function autoMapCheck() {
  if ((syncMaxStage(), S.mode === "quest" || S.autoMap === !1 || R.dg || R.tower || R.town || R.sat)) return;
  const t = bestZoneIdx(),
    n = zoneIdx(Math.min(S.stage, STAGES));
  if (t !== n) gotoZone(t, "Đủ cấp, đổi bãi luyện công");
  else {
    const e = farmStage(t);
    e !== S.stage && (S.stage = e);
  }
}
let qpT = 0;
function questPilot(t) {
  if (
    ((qpT -= t),
    qpT > 0 || ((qpT = 1.5), S.mode !== "quest" || !S.fac || isNovice() || R.dg || R.tower || R.deadT > 0) || R.sat)
  )
    return;
  R.town && backFromTown();
  const n = DT();
  if (
    (S.lvl >= DT_LV && n.today >= dtMax() && S.autoLdt !== !1 && matHave("misc", "ldt") > 0 && dtUseLdt(!0),
    S.lvl >= DT_LV && n.today < dtMax())
  ) {
    ((n.auto = !0), n.task || dtNew());
    const o = n.task;
    if (o) {
      if (dtReady(o)) {
        dtComplete(!0);
        return;
      }
      if ((o.t === "killm" || o.t === "elite" || o.t === "boss") && o.zi != null) {
        const a = (S.zalt || {})[o.zi] || 0;
        zoneIdx(Math.min(S.stage, STAGES)) !== o.zi
          ? (((S.zalt || (S.zalt = {}))[o.zi] = o.za || 0), gotoZone(o.zi, `Dã Tẩu: ${dtText(o)}`))
          : a !== (o.za || 0) &&
            ((S.zalt[o.zi] = o.za || 0),
            (R.enemies = []),
            (R.corpses = []),
            (R.field = null),
            (R.zoneShown = null),
            log(`🗺 Dã Tẩu: tới <b>${esc(o.zn)}</b>`));
        return;
      }
      const s = bestZoneIdx();
      zoneIdx(Math.min(S.stage, STAGES)) !== s && gotoZone(s, `Dã Tẩu: ${dtText(o)}`);
      return;
    }
  }
  if (matHave("misc", "lb") > 0 && S.lvl >= 20) {
    stStart(stTierMax());
    return;
  }
  if (typeof boatLeft == "function" && boatOk() && boatLeft() > 0 && verVio()) {
    boatStart();
    return;
  }
  const e = bestZoneIdx();
  zoneIdx(Math.min(S.stage, STAGES)) !== e && gotoZone(e, "Hết nhiệm vụ, luyện công");
}
const MODES = [
    ["farm", "⚔", "Luyện Công", "Dịch chuyển tới bãi luyện công hợp cấp"],
    ["dg", "🏯", "Phó Bản", "Dịch chuyển vào phó bản cao nhất còn lượt, lần lượt đi hết; hết lượt thì luyện công"],
    ["quest", "📜", "Nhiệm Vụ", "Dịch chuyển tới bản đồ nhiệm vụ: Dã Tẩu, Sát Thủ, đi thuyền; xong thì luyện công"],
  ],
  modeOf = () => MODES.find((t) => t[0] === (S.mode || "farm")) || MODES[0];
function setMode(t) {
  if ((S.mode || "farm") !== t) {
    if (
      ((S.mode = t),
      (R.dgSkip = {}),
      save(),
      R.dg && R.dg.kind !== "wb" && dgExit(),
      R.town && backFromTown(),
      (R.dgPilotT = 0),
      (qpT = 0),
      t === "quest")
    )
      log("📜 Chế độ <b>Nhiệm Vụ</b>: dịch chuyển tới bản đồ nhiệm vụ.");
    else if (t === "dg")
      (log("🏯 Chế độ <b>Phó Bản</b>: tự vào phó bản còn lượt."),
        dgNext() || toast("Hết lượt phó bản hôm nay: luyện công"));
    else {
      log("⚔ Chế độ <b>Luyện Công</b>.");
      const n = S.autoMap === !1 ? zoneIdx(Math.min(S.stage, STAGES)) : bestZoneIdx();
      gotoZone(n, "Luyện công");
    }
    refresh();
  }
}
function modeCard(t) {
  const n = S.mode === "quest",
    e = S.mode === "dg",
    o = DT(),
    s = o.task,
    a = R.dg
      ? R.dg.kind === "boat"
        ? "⛵ Đang đi thuyền Phong Lăng Độ"
        : `Trong ${R.dg.kind === "wb" ? "Boss tuần" : esc(R.dg.d.n)}`
      : R.sat
        ? `🗡 Truy sát Sát Thủ cấp ${R.sat.tier}`
        : n
          ? S.lvl >= DT_LV && o.today < DT_DAY && s
            ? `📜 Dã Tẩu: ${esc(dtText(s))} ${dtProg(s)}`
            : "Hết nhiệm vụ: luyện công"
          : e
            ? dgNext()
              ? `🏯 Sắp vào ${esc(dgNext().n)}`
              : "🏯 Hết lượt phó bản: luyện công"
            : "";
  return `<div class="card modec">
    <div><b>${esc(t.n)}</b> <small class="dim">bản đồ cấp ${t.lo}–${t.hi} · quái cấp ~${stageLevel(S.stage)} · trùm hồi sinh ${FLD_BOSS_RESPAWN / 60} phút</small></div>
    ${a ? `<div class="small cp">${a}</div>` : ""}
    ${n ? "" : `<label class="small"><input type="checkbox" id="cAutoMap" ${S.autoMap === !1 ? "" : "checked"}> Tự đổi bãi luyện công khi lên cấp</label>`}</div>`;
}
function modeSwSync() {
  let t = $("#modeSw");
  (t ||
    ((t = document.createElement("div")),
    (t.id = "modeSw"),
    (t.innerHTML = `<button id="mswBtn"></button><div id="mswMenu" class="hidden">${MODES.map((e) => `<button data-msw="${e[0]}" title="${e[3]}">${e[1]} ${e[2]}</button>`).join("")}</div>`),
    $("#battle").appendChild(t),
    ($("#mswBtn").onclick = (e) => {
      (e.stopPropagation(), $("#mswMenu").classList.toggle("hidden"));
    }),
    t.querySelectorAll("[data-msw]").forEach(
      (e) =>
        (e.onclick = (o) => {
          (o.stopPropagation(), $("#mswMenu").classList.add("hidden"), setMode(e.dataset.msw));
        }),
    ),
    document.addEventListener("pointerdown", (e) => {
      t.contains(e.target) || $("#mswMenu").classList.add("hidden");
    })),
    t.classList.toggle("hidden", !S.fac));
  const n = modeOf();
  (($("#mswBtn").innerHTML = `Chế Độ: <b>${n[1]} ${n[2]}</b> ▴`),
    t.querySelectorAll("[data-msw]").forEach((e) => e.classList.toggle("on", e.dataset.msw === n[0])));
}
function bindModeCard() {
  document.querySelectorAll("[data-mode]").forEach((n) => (n.onclick = () => setMode(n.dataset.mode)));
  const t = $("#cAutoMap");
  t &&
    (t.onchange = () => {
      ((S.autoMap = t.checked), t.checked && autoMapCheck(), save(), refresh());
    });
}
