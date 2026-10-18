"use strict";
let lastT = performance.now(),
  saveT = 0,
  uiT = 0,
  drawTog = !1;
const UI_KEY = "jxidle_ui",
  UI_FS = [0.9, 1, 1.15, 1.3],
  UI_FS_NAME = ["Nhỏ", "Vừa", "Lớn", "Rất lớn"];
let UIP = null;
function uiPrefs() {
  if (!UIP)
    try {
      UIP = JSON.parse(localStorage.getItem(UI_KEY) || "{}") || {};
    } catch {
      UIP = {};
    }
  return (
    (UIP.fs = Number.isInteger(UIP.fs) && UIP.fs >= 0 && UIP.fs < UI_FS.length ? UIP.fs : 1),
    (UIP.saver = !!UIP.saver),
    (UIP.compact = !!UIP.compact),
    (UIP.arenaZoom = typeof UIP.arenaZoom === "number" && UIP.arenaZoom >= 0.35 && UIP.arenaZoom <= 2 ? UIP.arenaZoom : null),
    UIP
  );
}
function getArenaZoom() {
  const p = typeof uiPrefs == "function" ? uiPrefs().arenaZoom : null;
  if (typeof p === "number" && p >= 0.35 && p <= 2) return p;
  if (typeof S !== "undefined" && S && typeof S.arenaZoom === "number" && S.arenaZoom >= 0.35 && S.arenaZoom <= 2) {
    return S.arenaZoom;
  }
  if (typeof zflipOn == "function" && zflipOn()) return 0.7;
  return 1;
}
function setArenaZoom(z) {
  z = Math.max(0.4, Math.min(1.5, Math.round(z * 100) / 100));
  if (typeof setUiPref == "function") setUiPref({ arenaZoom: z });
  if (typeof S !== "undefined" && S) {
    S.arenaZoom = z;
    typeof save == "function" && save();
  }
  if (typeof resizeArena == "function") resizeArena();
  updateArenaZoomUI();
}
function updateArenaZoomUI() {
  const z = getArenaZoom();
  const pct = Math.round(z * 100);
  const lbl = document.getElementById("lblArenaZoom");
  if (lbl) lbl.textContent = pct + "%";
  const sl = document.getElementById("slArenaZoom");
  if (sl && +sl.value !== pct) sl.value = pct;
  document.querySelectorAll("#grpArenaZoom button[data-zoom]").forEach((b) => {
    b.classList.toggle("on", Math.abs(+b.dataset.zoom - z) < 0.04);
  });
}
window.getArenaZoom = getArenaZoom;
window.setArenaZoom = setArenaZoom;
window.updateArenaZoomUI = updateArenaZoomUI;
function applyUiPrefs() {
  const n = uiPrefs();
  (document.documentElement.style.setProperty("--fs", UI_FS[n.fs]),
    document.body.classList.toggle("saver", n.saver),
    document.body.classList.toggle("compact", n.compact));
}
function setUiPref(n) {
  Object.assign(uiPrefs(), n);
  try {
    localStorage.setItem(UI_KEY, JSON.stringify(UIP));
  } catch {}
  (applyUiPrefs(), fitApp());
}
function onZoneChange(n) {
  (obsLoad(n.id), ([H.x, H.y] = inWorld(H.x, H.y)));
  for (const e of R.enemies) [e.x, e.y] = inWorld(e.x, e.y);
  for (const e of R.ground) [e.x, e.y] = inWorld(e.x, e.y);
  (snapCamera(),
    (R.bgImg = n.bg ? img(n.bg) : null),
    playMusic(n.id),
    preloadZoneSounds(n),
    curTab === "log" && refresh());
}
function onStageChange() {
  curTab === "log" && refresh();
}
function onLevelUp() {
  // a disciple levelling up (js/party.js): its own points / gear / faction only, no map or UI changes
  if (typeof PCTX < "u" && PCTX) {
    (isNovice() &&
      S.lvl >= NOVICE_LV &&
      !R.quiet &&
      toast(`${S.name} đạt cấp ${NOVICE_LV}: gia nhập môn phái ở thẻ Võ công`),
      S.autoPts === !0 && (autoSpendAttrs(), autoSpendSkills()),
      autoEquipAll(),
      R.quiet || updateDots());
    return;
  }
  (S.lvl === NEWBIE_LV && !rebornN() && log("🌱 Đạt cấp " + NEWBIE_LV + ": hết <b>Hỗ Trợ Tân Thủ</b>."),
    typeof autoMapCheck == "function" && autoMapCheck(),
    isNovice() &&
      S.lvl >= NOVICE_LV &&
      !R.quiet &&
      (toast("Đạt cấp " + NOVICE_LV + ": gia nhập môn phái!"), $("#modal").classList.contains("hidden") && joinModal()),
    S.autoPts === !0 && (autoSpendAttrs(), autoSpendSkills()),
    autoEquipAll(),
    R.quiet ||
      (checkHints(),
      updateDots(),
      renderPad(),
      dotGift(),
      LV_MS.some((n) => n[0] === S.lvl) && toast(`Đạt mốc cấp ${S.lvl}: nhận quà ở nút 🎁`)));
}
const STEP = 1 / 60,
  MAX_STEPS = 4,
  LERP_MAX = 120;
let simAcc = 0;
function movers() {
  return [H]
    .concat(
      typeof partyN == "function"
        ? partyIdx()
            .slice(1)
            .filter((k) => typeof pActive != "function" || pActive(k))
            .map((k) => pAct(k).h)
        : [],
      R.enemies || [],
    )
    .filter(Boolean);
}
function simulateFrame(n) {
  simAcc = Math.min(simAcc + n, STEP * 4);
  let e = 0;
  for (; simAcc >= STEP && e < MAX_STEPS;) {
    for (const o of movers()) ((o._px = o.x), (o._py = o.y));
    (tick(STEP), (simAcc -= STEP), e++);
  }
  if (e >= MAX_STEPS) simAcc = 0;
}
function drawLerp(n) {
  const e = simAcc / STEP,
    o = movers().filter((t) => t._px !== void 0 && Math.hypot(t.x - t._px, t.y - t._py) < LERP_MAX);
  for (const t of o)
    ((t._cx = t.x), (t._cy = t.y), (t.x = t._px + (t.x - t._px) * e), (t.y = t._py + (t.y - t._py) * e));
  try {
    draw(n);
  } finally {
    for (const t of o) ((t.x = t._cx), (t.y = t._cy));
  }
}
let loopErr = 0,
  loopLast = "";
function guard(n, e) {
  try {
    (e(), (loopErr = Math.max(0, loopErr - 0.02)));
  } catch (o) {
    loopErr++;
    const t = n + ": " + (o && o.message);
    (t !== loopLast && ((loopLast = t), console.error("[loi vong lap]", n, o)),
      loopErr > 30 &&
        ((loopErr = 0),
        (R.fx = []),
        (R.txt = []),
        (R.enemies = []),
        (R.spawnT = 0.5),
        (R.deadT = 0),
        (simAcc = 0),
        (R.quiet = !1),
        closeModal(!0)));
  }
}
function frame(n) {
  const e = Math.min(0.25, (n - lastT) / 1e3);
  ((lastT = n),
    guard("tay cam", gamepadPoll),
    // js/maptravel.js: no simulation while a map is loading, no drawing until a switched map is ready
    S.fac &&
      !document.hidden &&
      ((typeof mgCheck != "function" || !mgCheck(!1)) && guard("mo phong", () => simulateFrame(e)),
      (!uiPrefs().saver || (drawTog = !drawTog)) &&
        (typeof mgCheck != "function" || !mgCheck(!0)) &&
        guard("ve", () => drawLerp(e))),
    (uiT += e),
    uiT > 0.1 &&
      S.fac &&
      ((uiT = 0),
      guard("giao dien", () => {
        (updateTop(),
          updatePadCd(),
          R.logDirty && curTab === "log" && ((R.logDirty = !1), renderLogOnly()),
          invDirty && curTab === "inv" && renderInv());
      })),
    (saveT += e),
    saveT > 10 &&
      S.fac &&
      guard("luu", () => {
        ((saveT = 0), loginCheck(), achCheck(), dotGift(), actDot());
        const o = R.activeT || 0;
        (o > 30 && (S.kps = R.kills / o), save());
      }),
    requestAnimationFrame(frame));
}
function showOffline(n) {
  if (!n) return;
  const e = Math.floor(n.secs / 3600),
    o = Math.floor((n.secs % 3600) / 60);
  modal(`<h3>Chào mừng trở lại!</h3><p class="desc">Vắng mặt ${e ? e + " giờ " : ""}${o} phút, nhân vật vẫn luyện công tại ${esc(zoneOf(Math.min(S.stage, STAGES)).n)}.</p>
    <div class="card stats"><span>Quái bị hạ</span><span>${fmt(n.kills)}</span><span>Kinh nghiệm</span><span>${fmt(n.xp)}</span>
    <span>Ngân lượng</span><span>${fmtL(n.gold)}</span><span>Cấp</span><span>${n.lv0} → ${n.lv1}</span><span>Vật phẩm</span><span>${n.got}${n.sold ? ` (+${n.sold} bán)` : ""}</span>
    <span>Rương tu luyện</span><span>${n.chests || 0} / 3 mốc (1 · 4 · 8 giờ)</span></div>
    ${n.chests ? '<p class="desc">Quà các mốc đã vào túi — xem nhật ký Giang hồ.</p>' : ""}
    <div class="btnrow"><button class="btn" onclick="closeModal()">Nhận</button></div>`);
}
function fitApp() {
  document.body.classList.toggle("mob", isMobileUI());
  const n = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  (n > 0 && document.documentElement.style.setProperty("--app-h", Math.round(n) + "px"), CV && resizeArena());
}
function toggleFullscreen() {
  const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
  if (!isFs) {
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (req) {
      req.call(el, { navigationUI: "hide" }).catch(() => {
        req.call(el).catch(() => {});
      });
    }
    try {
      if (window.screen && window.screen.orientation && typeof window.screen.orientation.unlock === "function") {
        window.screen.orientation.unlock();
      }
    } catch {}
  } else {
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (exit) exit.call(document);
  }
}
window.toggleFullscreen = toggleFullscreen;
function updateFsBtn() {
  const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
  const b1 = $("#fsBtn");
  if (b1) {
    b1.textContent = isFs ? "🗗" : "⛶";
    b1.classList.toggle("on", isFs);
  }
  const b2 = $("#u20fs");
  if (b2) {
    b2.innerHTML = isFs ? "Thu<br>nhỏ" : "Toàn<br>màn";
    b2.classList.toggle("on", isFs);
  }
}
document.addEventListener("fullscreenchange", updateFsBtn);
document.addEventListener("webkitfullscreenchange", updateFsBtn);
function setCompact(n) {
  (setUiPref({ compact: n }), !n && S.fac && refresh());
}
function init() {
  const n = pickSlot();
  ((SLOT = n.slot), n.menu && (S = newSave()));
  const e = n.menu ? !1 : load();
  ((CV = $("#arena")),
    (CX = CV.getContext("2d")),
    $("#tabs").addEventListener("click", (t) => {
      if (t.target.closest("#tabRide")) {
        typeof toggleMount == "function" && toggleMount();
        return;
      }
      const i = t.target.closest("button[data-t]");
      i && (i.dataset.t === "more" && typeof u20MoreMode < "u" && (u20MoreMode = "sys"), showTab(i.dataset.t));
    }),
    ($("#mClose").onclick = () => closeModal(!0)),
    ($("#giftBtn") && ($("#giftBtn").onclick = () => {
      S.fac && (uiSfx("click"), giftModal(!0));
    })),
    ($("#actBtn") && ($("#actBtn").onclick = () => {
      S.fac && (uiSfx("click"), openQuest("act"));
    })),
    ($("#modal").onclick = (t) => {
      t.target.id === "modal" && closeModal();
    }),
    window.addEventListener("resize", fitApp),
    window.addEventListener("orientationchange", fitApp),
    window.visualViewport && window.visualViewport.addEventListener("resize", fitApp),
    ($("#compactBtn") && ($("#compactBtn").onclick = () => setCompact(!document.body.classList.contains("compact")))),
    ($("#compactExitBtn") && ($("#compactExitBtn").onclick = () => setCompact(!1))),
    ($("#fsBtn") && ($("#fsBtn").onclick = toggleFullscreen)),
    applyUiPrefs(),
    fitApp(),
    bindControls());
  const o = () => {
    audInit();
    const t = zoneOf(Math.min(S.stage, STAGES));
    (preloadZoneSounds(t),
      AUD.music && sndCfg().music && AUD.music.paused
        ? AUD.music.play().catch(() => {})
        : !AUD.music && S.fac && playMusic(R.town ? W.town.id : t.id));
  };
  if (
    (document.addEventListener("pointerdown", o, !0),
    document.addEventListener("keydown", o, !0),
    resizeArena(),
    ([H.x, H.y] = inWorld(...(typeof mapMid == "function" ? mapMid() : [WORLD.w / 2, WORLD.h / 2]))),
    snapCamera(),
    restoreGround(),
    n.menu)
  )
    slotMenu();
  else if (!S.fac) pickFaction();
  else {
    if (
      (delete S.jxLook,
      delete S.lookFx,
      recalc(),
      (R.life = R.P.life),
      (R.mana = R.P.mana),
      e && (recalc(), showOffline(offlineGains())),
      typeof XP_EVENT < "u" &&
        expCfg("event", XP_EVENT) > 1 &&
        log(`<b style="color:#ffd24a">🎉 Sự kiện toàn máy chủ: x${expCfg("event", XP_EVENT)} kinh nghiệm!</b>`),
      showTab("log"),
      log("Tiếp tục hành tẩu giang hồ…"),
      // old save: give the 3 disciples once (js/party.js)
      typeof partyEnsure == "function" &&
        partyEnsure() &&
        (log(
          `🎎 Nhận ${S.party.length} đồ đệ: ${S.party.map((t) => `<b>${esc(t.name)}</b> (${FAC[t.fac].n} hệ ${SERIES[FAC[t.fac].series]})`).join(", ")}. Đổi tên / trang bị / kỹ năng ở các thẻ 1 2 3 4 trong bảng Nhân vật.`,
        ),
        toast(`Nhận ${S.party.length} đồ đệ`),
        save()),
      S.eqRebuildMsg)
    ) {
      const [t, i] = S.eqRebuildMsg;
      (log(
        `Hệ thống trang bị mới: bỏ Bạch Kim và Hoàng Kim lộ trình — thu hồi <b>${t}</b> món, hoàn <b class="up">${fmtL(i)}</b> lượng`,
      ),
        toast(`Thu hồi ${t} món, hoàn ${fmtL(i)} lượng`),
        delete S.eqRebuildMsg,
        save());
    }
    (S.petGold &&
      (log(
        `Đồng hành (thú nuôi) đã được thay bằng <b>đồ đệ</b>: thú cấp ${S.petGold[0]} đổi thành <b class="up">${fmtL(S.petGold[1])}</b> lượng.`,
      ),
      toast(`Thú đồng hành đổi thành ${fmtL(S.petGold[1])} lượng`),
      delete S.petGold,
      save()),
      S.banMsg &&
      (log(
        `Hoàng Kim biến thể ([Cực phẩm], [Hoàn Mỹ], [Tinh Xảo]…), Dương Thần và đồ sự kiện (Hắc Thần, Thương Khung, Long Tương…) đã xóa khỏi game: thu hồi <b>${S.banMsg}</b> món`,
      ),
      delete S.banMsg,
      save()),
      S.horseEnhBack &&
        (log(
          `Ngựa không còn cường hóa: ngựa đã cường hóa về +0, hoàn lại <b class="up">${fmtL(S.horseEnhBack)}</b> lượng`,
        ),
        toast(`Hoàn ${fmtL(S.horseEnhBack)} lượng cường hóa ngựa`),
        delete S.horseEnhBack,
        save()),
      window.__tampered &&
        (log(
          '<span class="dim">Dữ liệu lưu không khớp chữ ký (đã chỉnh sửa ngoài game): dùng bản sao lưu gần nhất nếu có.</span>',
        ),
        toast("Phát hiện chỉnh sửa file lưu")),
      loginCheck(),
      dotGift(),
      actDot(),
      typeof autoMapCheck == "function" && (syncMaxStage(), S.mode !== "quest" && S.autoMap !== !1 && autoMapCheck()));
    {
      let t = 0,
        i = 0;
      for (const a of S.inv.concat(Object.values(S.eq || {}), S.epBox || [])) {
        const s = vioDedup(a);
        s && ((t += s), i++);
      }
      t &&
        ((R.dirty = !0),
        log(
          `Sửa ${i} món Tím bị trùng dòng: gỡ ${t} dòng từ dòng trùng đầu tiên trở đi, trả lại đá thuộc tính để khảm lại.`,
        ));
    }
    if (window.SET_PURGED) {
      const t = window.SET_PURGED.reduce((i, a) => i + a, 0);
      ((window.SET_PURGED = null), log(`Đã xóa ${t} món thuộc bộ không còn trong game (Đằng Long, Tinh Sương…).`));
    }
  }
  if (
    (document.addEventListener("visibilitychange", () => {
      (document.hidden
        ? S.fac && save()
        : S.fac && Date.now() - S.last > 6e4 && ((R.dirty = !0), recalc(), showOffline(offlineGains()), refresh()),
        (lastT = performance.now()));
    }),
    window.addEventListener("pagehide", () => {
      S.fac && save();
    }),
    window.addEventListener("keydown", (t) => {
      t.key === "Escape" && !$("#modal").classList.contains("hidden") && closeModal();
    }),
    typeof chatInit == "function")
  )
    try {
      chatInit();
    } catch {}
  if (typeof netInit == "function")
    try {
      netInit();
    } catch {}
  requestAnimationFrame(frame);
}
(init(),
  "serviceWorker" in navigator &&
    location.protocol.startsWith("http") &&
    navigator.serviceWorker.register("sw.js").catch(() => {}));
let APP_V = 457;
function getAppV() {
  try {
    const s = document.querySelector('script[src*="main.js"]');
    if (s && s.src.includes("?v=")) {
      const v = +s.src.split("?v=")[1].replace(/[^0-9]/g, "");
      if (v) APP_V = v;
    }
  } catch {}
  return APP_V || 457;
}
function appVerCheck() {
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") return;
  fetch("ver.json?t=" + Date.now(), { cache: "no-store" })
    .then((n) => (n.ok ? n.json() : null))
    .then((n) => {
      if (!n || !n.v) return;
      const cur = getAppV();
      const lastSeen = sessionStorage.getItem("jxidle_seen_ver") || localStorage.getItem("jxidle_seen_ver");
      if (lastSeen && +lastSeen >= +n.v) return;
      if (+n.v > cur) {
        sessionStorage.setItem("jxidle_seen_ver", String(n.v));
        try { localStorage.setItem("jxidle_seen_ver", String(n.v)); } catch {}
        APP_V = +n.v;
        try {
          save();
        } catch {}
        (typeof toast == "function" && toast("Có bản cập nhật mới — đang tải lại…"),
          setTimeout(() => (typeof deployReload == "function" ? deployReload("ver") : location.reload()), 3e3));
      }
    })
    .catch(() => {});
}
setInterval(appVerCheck, 300 * 1e3);
// also when the tab comes back after a while (phones keep tabs asleep for hours)
document.addEventListener("visibilitychange", () => {
  document.hidden || Date.now() - (window.__verAt || 0) < 6e4 || ((window.__verAt = Date.now()), appVerCheck());
});
