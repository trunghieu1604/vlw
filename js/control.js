"use strict";
const INPUT = { active: !1, id: null, fromJoy: !1, ox: 0, oy: 0, x: 0, y: 0, moved: !1, keys: {}, target: null },
  JOY_R = 45,
  TAP_MOVE = 8,
  TP_CD = 20,
  POT_CD = 1.5,
  manual = () => S.ctrl === "manual" && !(typeof PCTX < "u" && PCTX), // disciples always fight on their own
  joyFixed = () => S.joy !== "float",
  isDesktopLandscape = () =>
    !!(
      window.matchMedia &&
      window.matchMedia("(orientation: landscape) and (min-width: 900px) and (hover: hover) and (pointer: fine)")
        .matches
    ),
  inputMode = () => (S.inputMode ? S.inputMode : (isDesktopLandscape() ? "mouse" : "joy")),
  mouseMode = () => inputMode() === "mouse";
function refreshRotBtn() {
  const t = $("#rotBtn");
  if (!t) return;
  const o = S.rot !== !1;
  ((t.innerHTML = 'Xoay chiêu: <i class="ck"></i>'),
    (t.title = o ? "Xoay chiêu: luân phiên chiêu ở ô Q W E A khi tự đánh (R)" : "Chỉ đánh chiêu chính"),
    t.classList.toggle("on", o));
}
function toggleRot() {
  ((S.rot = S.rot === !1),
    refreshRotBtn(),
    (R.dirty = !0),
    save(),
    toast(
      S.rot !== !1
        ? "Xoay chiêu: luân phiên các chiêu ở ô Q W E A khi tự đánh"
        : "Xoay chiêu tắt: chỉ đánh chiêu chính",
    ));
}
function refreshInputBtn() {
  const t = isDesktopLandscape();
  document.body.classList.toggle("deskland", t);
  const o = $("#inBtn");
  o && (o.textContent = mouseMode() ? "🖱 Chuột" : "🕹 Joystick");
}
const joyAnchor = () => ({ x: JOY_R + 14, y: (AR.cssH || AR.h) - JOY_R - 14 }),
  GP = { v: [0, 0], prev: [] };
function gamepadPoll() {
  const t = navigator.getGamepads ? Array.from(navigator.getGamepads()) : [],
    o = t.find((s) => s && s.connected);
  if (!o) {
    ((GP.v = [0, 0]), (GP.prev = []));
    return;
  }
  const a = (s) => !!(o.buttons[s] && o.buttons[s].pressed);
  let e = o.axes[0] || 0,
    n = o.axes[1] || 0;
  (Math.hypot(e, n) < 0.25 && ((e = 0), (n = 0)),
    a(14) && (e = -1),
    a(15) && (e = 1),
    a(12) && (n = -1),
    a(13) && (n = 1),
    (GP.v = [e, n]),
    (e || n) && S.fac && !R.town && !manual() && setCtrl("manual", !0));
  const i = (s) => a(s) && !GP.prev[s];
  if (S.fac) {
    for (let s = 0; s < 4; s++) i(s) && pressSlot(s);
    (i(4) && drinkNow("life"), i(5) && drinkNow("mana"), i(8) && tdpToggle());
  }
  GP.prev = o.buttons.map((s) => !!s.pressed);
}
function inputVec() {
  if (INPUT.active && INPUT.moved) {
    const n = INPUT.x - INPUT.ox,
      i = INPUT.y - INPUT.oy,
      s = Math.hypot(n, i);
    if (s < 6) return [0, 0];
    const r = Math.min(1, s / JOY_R) / s;
    return [n * r, i * r];
  }
  if (GP.v[0] || GP.v[1]) {
    INPUT.target = null;
    const n = Math.hypot(GP.v[0], GP.v[1]);
    return n > 1 ? [GP.v[0] / n, GP.v[1] / n] : GP.v.slice();
  }
  const t = INPUT.keys;
  let o = 0,
    a = 0;
  (t.ArrowLeft && (o -= 1), t.ArrowRight && (o += 1), t.ArrowUp && (a -= 1), t.ArrowDown && (a += 1));
  const e = Math.hypot(o, a);
  return e ? ((INPUT.target = null), [o / e, a / e]) : [0, 0];
}
// Joystick / keys / gamepad steer directly (sliding along walls); a clicked ground point is walked to along
// a path (navGo). Speed is ground speed: half on screen when moving straight up/down, like JX1.
// JX1: no moving while a skill / attack animation plays (do_attack/do_magic finish first); a clicked
// target is kept and walked to once the cast ends.
const heroCasting = () => H.act === "at" && !(R.deadT > 0);
// The main character prefers moving over attacking: while the player steers (keys / joystick / gamepad) or a
// clicked point / NPC is still being walked to, no new attack starts (one already casting still finishes).
// Disciples (withChar context) are never held back by the player's input.
function heroWantsMove() {
  if ((typeof PCTX != "undefined" && PCTX) || !manual()) return !1;
  if (INPUT.target) return !0;
  const [o, a] = inputVec();
  return !!(o || a);
}
function moveManual(t) {
  if (heroCasting()) return !0;
  const [o, a] = inputVec(),
    e = 150 * curSpeed() * t;
  if (o || a) {
    const k = isoK(o, a),
      [n, i] = clampWorld(H.x + o * e * k, H.y + a * e * k);
    return (obsMove(H, n, i), (H._nav = null), (R.pickTarget = null), !0);
  }
  if (!INPUT.target) return !1;
  return (navGo(H, INPUT.target.x, INPUT.target.y, e, 0) <= 0 && (INPUT.target = null), (R.pickTarget = null), !0);
}
function setCtrl(t, o) {
  ((S.ctrl = t),
    (INPUT.target = null),
    renderPad(),
    o ||
      toast(
        t === "manual"
          ? "Tự điều khiển: kéo trên sân để đi, nhân vật tự đánh quái trong tầm"
          : "Tự động: nhân vật tự đi đánh và nhặt đồ",
      ));
}
function learnedAttacks() {
  return Object.keys(S.sk)
    .map(Number)
    .filter((t) => S.sk[t] && isAttack(SK[t]));
}
function fillSlots() {
  S.slots = (S.slots || [0, 0, 0, 0]).map((t) => (t === -1 ? -1 : t && S.sk[t] ? t : 0));
  for (const t of learnedAttacks().sort((o, a) => SK[a].req - SK[o].req)) {
    if (S.slots.includes(t)) continue;
    const o = S.slots.indexOf(0);
    if (o < 0) break;
    S.slots[o] = t;
  }
}
function assignSlot(t, o) {
  if ((fillSlots(), o === -1)) {
    ((S.slots[t] = -1), renderPad(), save());
    return;
  }
  const a = S.slots.indexOf(o);
  (a >= 0 && (S.slots[a] = S.slots[t]), (S.slots[t] = o), renderPad(), save());
}
function skSlotModal(t) {
  fillSlots();
  let o = $("#skPick");
  if (o && o.dataset.i === String(t)) {
    o.remove();
    return;
  }
  o && o.remove();
  const a = S.slots[t],
    e = learnedAttacks().sort((c, d) => SK[c].req - SK[d].req),
    n = $("#battle");
  ((o = document.createElement("div")), (o.id = "skPick"), (o.dataset.i = t));
  const i = (c) => {
    const d = SK[c],
      h = S.slots.indexOf(c);
    return `<b>${esc(d.n)}</b> <small>cấp ${S.sk[c] || 0}${h >= 0 && h !== t ? ` · đang ở F${h + 1}` : ""}</small>`;
  };
  ((o.innerHTML =
    `<div class="nm">F${t + 1} · ${a > 0 ? i(a) : "<small>trống</small>"}</div>` +
    (a > 0 ? '<button class="spk spk0" data-ss="-1" title="Bỏ chiêu khỏi ô này">✕</button>' : "") +
    (e
      .map((c) => {
        const d = S.slots.indexOf(c);
        return `<button class="spk${c === a ? " on" : ""}" data-ss="${c}" style="background-image:url('${esc(SK[c].ic || "")}')">${d >= 0 ? `<i>F${d + 1}</i>` : ""}<u>${S.sk[c] || 0}</u></button>`;
      })
      .join("") || '<small class="dim">Chưa học chiêu tấn công</small>')),
    n.appendChild(o));
  const s = uiScale(),
    r = n.getBoundingClientRect(),
    l = $(`#pad .sk[data-i="${t}"]`).getBoundingClientRect(),
    f = $("#pad").getBoundingClientRect(),
    u = o.offsetWidth,
    p = clamp((l.left + l.width / 2 - r.left) / s - u / 2, 4, r.width / s - u - 4);
  ((o.style.left = p + "px"),
    (o.style.bottom = (r.bottom - f.top) / s + 6 + "px"),
    o.querySelectorAll("[data-ss]").forEach((c) => {
      ((c.onpointerenter = () => {
        o.querySelector(".nm").innerHTML =
          `F${t + 1} · ${+c.dataset.ss == -1 ? "<b>Bỏ trống ô này</b>" : i(+c.dataset.ss)}`;
      }),
        (c.onclick = (d) => {
          (d.stopPropagation(), assignSlot(t, +c.dataset.ss), o.remove(), curTab === "skill" && refresh());
        }));
    }),
    setTimeout(
      () =>
        document.addEventListener(
          "pointerdown",
          function c(d) {
            o.contains(d.target) || (o.remove(), document.removeEventListener("pointerdown", c, !0));
          },
          !0,
        ),
      0,
    ));
}
function pressSlot(t) {
  fillSlots();
  const o = S.slots[t];
  if (!(o > 0)) {
    skSlotModal(t);
    return;
  }
  ((S.main = o), (S.mainLock = !0), (R.dirty = !0), recalc(), renderPad(), toast("Chiêu chính: " + SK[o].n));
}
function drinkNow(t) {
  if (((R.potCd = R.potCd || { life: 0, mana: 0 }), R.potCd[t] > 0)) return;
  const o = slotPick(t === "mana" ? 1 : 0);
  if (!o) {
    toast("Không đủ ngân lượng mua thuốc");
    return;
  }
  const a = o.p;
  (usePotion(t, a, o.free),
    (R.potCd[t] = POT_CD),
    toast(o.free ? `${a.n} (còn ${potStock(a.kind)[a.tier] || 0})` : `${a.n} (-${fmtL(potPrice(a))} lượng)`));
}
function goTown() {
  if (!R.town) {
    if (R.dg) {
      toast("Đang trong phó bản / boss tuần");
      return;
    }
    if ((R.tpCd || 0) > 0) {
      toast(`Thổ Địa Phù hồi sau ${Math.ceil(R.tpCd)} giây`);
      return;
    }
    ((R.town = !0),
      (R.enemies = []),
      (R.corpses = []),
      (R.pickTarget = null),
      (R.moveTo = null),
      (INPUT.target = null),
      obsLoad("town"),
      ([H.x, H.y] = inWorld(...(typeof mapMid == "function" ? mapMid() : [WORLD.w / 2, WORLD.h / 2]))),
      snapCamera(),
      (R.bgImg = img(W.town.bg)),
      uiSfx("use"),
      playMusic(W.town.id),
      ($("#townName").textContent = W.town.n),
      $("#townBar").classList.remove("hidden"),
      (R.banner = { t: 2.2, text: W.town.n, sub: "Hồi phục · bán đồ · trở lại bãi" }),
      log(`Dùng Thổ Địa Phù về <b>${esc(W.town.n)}</b>.`));
  }
}
// Thổ Địa Phù key / button: loads the target map first (js/maptravel.js), then goes there.
function tdpToggle() {
  if (typeof mgTravel == "function") return mgTravel(R.town ? "back" : "town");
  R.town ? backFromTown() : goTown();
}
function backFromTown() {
  if (R.town) {
    R.town = !1;
    {
      const t = zoneOf(Math.min(S.stage, STAGES));
      (obsLoad(t.id), ([H.x, H.y] = inWorld(H.x, H.y)), snapCamera());
    }
    ((R.tpCd = TP_CD),
      (S.wave = 1),
      (R.spawnT = 0.5),
      (R.zoneShown = null),
      $("#townBar").classList.add("hidden"),
      onZoneChange(zoneOf(Math.min(S.stage, STAGES))));
  }
}
function townTick(t) {
  ((R.life = Math.min(R.P.life, R.life + R.P.life * 0.25 * t)),
    (R.mana = Math.min(R.P.mana, R.mana + R.P.mana * 0.25 * t)),
    moveManual(t));
}
function renderPad() {
  if (!S || !S.fac || (typeof pDefer == "function" && pDefer("renderPad", renderPad))) return;
  (fillSlots(),
    document.querySelectorAll("#pad .sk").forEach((e) => {
      const n = S.slots[+e.dataset.i],
        i = SK[n];
      (e.classList.toggle("empty", !i),
        e.classList.toggle("nowp", !!i && !skWOk(i)),
        e.classList.toggle("cur", !!(i && R.P && R.P.main.id === n)),
        (e.querySelector("i").style.backgroundImage = i && i.ic ? `url('${i.ic}')` : ""));
      const s = i ? (S.sk[n] || 0) + (typeof skillBonusLv == "function" ? skillBonusLv(n) : 0) : 0,
        r = i && typeof skillBonusLv == "function" ? skillBonusLv(n) : 0;
      e.title = i
        ? `${i.n} · cấp ${s}${r ? ` (${S.sk[n]}+${r})` : ""}${skWOk(i) ? "" : " · cần " + EQT_VI[skEqt(i)]}`
        : "Ô trống";
      e.title += ` (phím ${"QWEA"[+e.dataset.i] || ""})`;
      let l = e.querySelector(".sklv");
      (l || ((l = document.createElement("u")), (l.className = "sklv"), e.appendChild(l)),
        (l.textContent = i ? s : ""),
        l.classList.toggle("up", !!r));
    }));
  const t = R.P && R.P.main,
    o = $("#bMain");
  if (o) {
    const e = S.eq && S.eq.weapon,
      n = t && R.P.basic === t,
      i = n ? "img/s/8.png" : t && SK[t.id] && SK[t.id].ic;
    ((o.querySelector("i").style.backgroundImage = i ? `url('${i}')` : ""),
      (o.title = "Chiêu chính: " + (n ? "Đánh thường" : t && SK[t.id] ? SK[t.id].n : "—")));
  }
  const a = $("#ctrlBtn");
  ((a.innerHTML = 'Tự Động Đánh: <i class="ck"></i>'),
    a.classList.toggle("on", !manual()),
    (a.title = manual() ? "Tự điều khiển (F)" : "Tự động đánh (F)"));
}
function updatePadCd() {
  const t = R.potCd || {},
    o = (a, e, n) => a && a.querySelector(".cd").style.setProperty("--p", `${clamp(e / n, 0, 1) * 100}%`);
  (o($("#bHp"), t.life || 0, POT_CD), o($("#bMp"), t.mana || 0, POT_CD), o($("#bTp"), R.tpCd || 0, TP_CD));
  for (const [a, e] of [
    ["#bHp", 0],
    ["#bMp", 1],
  ]) {
    const n = $(a);
    if (!n || typeof slotShow != "function") continue;
    const i = slotShow(e),
      s = i.ic + "|" + i.n + "|" + i.name;
    n._k !== s &&
      ((n._k = s),
      (n.querySelector("i").style.backgroundImage = i.ic ? `url('${i.ic}')` : ""),
      (n.querySelector("em").textContent = i.n || ""),
      (n.title = `${i.name} (phím ${e + 1}) · chuột phải / ▾ để chọn thuốc`));
  }
}
function bindControls() {
  const t = (e) => {
    const n = CV.getBoundingClientRect(),
      sx = (AR.cssW || n.width) / (n.width || 1),
      sy = (AR.cssH || n.height) / (n.height || 1);
    return [(e.clientX - n.left) * sx, (e.clientY - n.top) * sy];
  };
  const toWorld = (sx, sy) => {
    const cw = AR.cssW || 1, ch = AR.cssH || 1;
    return [sx * (AR.w / cw) + CAM.x, sy * (AR.h / ch) + CAM.y];
  };
  (CV.addEventListener("pointerdown", (e) => {
    if (INPUT.active) return;
    if (mouseMode() && e.pointerType !== "touch") {
      const [l, f] = t(e),
        [wx, wy] = toWorld(l, f),
        u = groundAt(wx, wy);
      if (
        (Object.assign(INPUT, { active: !0, id: e.pointerId, fromJoy: !1, mouse: !0, moved: !1, x: l, y: f }),
        CV.setPointerCapture && CV.setPointerCapture(e.pointerId),
        u)
      ) {
        ((R.pickTarget = R.pickTarget === u ? null : u),
          R.pickTarget && toast(`Đi nhặt: ${u.it.n}`),
          (INPUT.mouse = !1));
        return;
      }
      manual() || setCtrl("manual");
      const [p, c] = inWorld(wx, wy);
      ((INPUT.target = { x: p, y: c }), (R.pickTarget = null));
      return;
    }
    const [n, i] = t(e),
      s = joyAnchor(),
      isLeftHalf = n < ((AR.cssW || AR.w) ? (AR.cssW || AR.w) * 0.48 : 340),
      isNearAnchor = Math.hypot(n - s.x, i - s.y) <= JOY_R * 2.2,
      r = !joyFixed() || isLeftHalf || isNearAnchor;
    (Object.assign(INPUT, {
      active: !0,
      id: e.pointerId,
      fromJoy: r,
      ox: r && joyFixed() && isNearAnchor ? s.x : n,
      oy: r && joyFixed() && isNearAnchor ? s.y : i,
      x: n,
      y: i,
      moved: !1,
    }),
      CV.setPointerCapture && CV.setPointerCapture(e.pointerId));
  }),
    CV.addEventListener("pointermove", (e) => {
      if (!INPUT.active || e.pointerId !== INPUT.id) return;
      const [n, i] = t(e);
      if (((INPUT.x = n), (INPUT.y = i), INPUT.mouse)) {
        const [wx, wy] = toWorld(n, i);
        const [s, r] = inWorld(wx, wy);
        INPUT.target = { x: s, y: r };
        return;
      }
      if (!INPUT.fromJoy) return;
      if (
        !INPUT.moved &&
        Math.hypot(n - INPUT.ox, i - INPUT.oy) > TAP_MOVE
      ) {
        ((INPUT.moved = !0), (INPUT.target = null), manual() || setCtrl("manual"));
      }
    }));
  const o = (e) => {
    if (e.pointerId !== INPUT.id) return;
    const [n, i] = t(e),
      s = !INPUT.moved && !INPUT.mouse;
    if (((INPUT.mouse = !1), (INPUT.active = !1), (INPUT.id = null), (INPUT.moved = !1), !s)) return;
    const [wx, wy] = toWorld(n, i);
    const r = groundAt(wx, wy);
    if (r) {
      ((R.pickTarget = R.pickTarget === r ? null : r), R.pickTarget && toast(`Đi nhặt: ${r.it.n}`));
      return;
    }
    manual() || setCtrl("manual");
    const [l, f] = inWorld(wx, wy);
    INPUT.target = { x: l, y: f };
  };
  (CV.addEventListener("pointerup", o),
    CV.addEventListener("pointercancel", (e) => {
      e.pointerId === INPUT.id && ((INPUT.active = !1), (INPUT.id = null), (INPUT.moved = !1));
    }),
    window.addEventListener("keydown", (e) => {
      if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
      const n = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      ((INPUT.keys[n] = !0),
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(n) && !manual() && setCtrl("manual"),
        !e.repeat &&
          (n === "1" && drinkNow("life"),
          n === "2" && drinkNow("mana"),
          (n === "3" || n === "t") && tdpToggle(),
          n === "f" && setCtrl(manual() ? "auto" : "manual"),
          n === "r" && toggleRot(),
          n === "m" && toggleMount(),
          n === " " && (e.preventDefault(), pickNearest())));
    }),
    window.addEventListener("keyup", (e) => {
      INPUT.keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = !1;
    }));
  const a = (e, n) =>
    e.addEventListener("pointerdown", (i) => {
      (i.preventDefault(), i.stopPropagation(), n());
    });
  document.querySelectorAll("#pad .sk").forEach((e) => {
    (e.addEventListener("pointerdown", (n) => {
      if ((n.preventDefault(), n.stopPropagation(), n.button === 2)) return;
      const i = +e.dataset.i;
      (fillSlots(), n.target.closest(".pk") || !(S.slots[i] > 0) ? skSlotModal(i) : pressSlot(i));
    }),
      e.addEventListener("contextmenu", (n) => {
        (n.preventDefault(), skSlotModal(+e.dataset.i));
      }));
  });
  for (const [e, n, i] of [
    ["#bHp", 0, "life"],
    ["#bMp", 1, "mana"],
  ]) {
    const s = $(e);
    (s.addEventListener("pointerdown", (r) => {
      (r.preventDefault(),
        r.stopPropagation(),
        r.button !== 2 && (r.target.closest(".pk") ? potSlotModal(n) : drinkNow(i)));
    }),
      s.addEventListener("contextmenu", (r) => {
        (r.preventDefault(), potSlotModal(n));
      }));
  }
  (a($("#bTp"), tdpToggle),
    ($("#bMain").onclick = () => typeof showTab == "function" && showTab("skill")),
    ($("#ctrlBtn").onclick = () => setCtrl(manual() ? "auto" : "manual")),
    ($("#inBtn").onclick = () => {
      ((S.inputMode = mouseMode() ? "joy" : "mouse"),
        (INPUT.target = null),
        refreshInputBtn(),
        save(),
        toast(
          mouseMode()
            ? "Điều khiển bằng chuột: bấm hoặc giữ chuột để đi"
            : "Điều khiển bằng joystick: kéo ở góc trái dưới",
        ));
    }),
    refreshInputBtn(),
    window.addEventListener("resize", refreshInputBtn),
    ($("#rotBtn").onclick = () => toggleRot()),
    ($("#rideBtn").onclick = () => toggleMount()),
    refreshRideBtn(),
    refreshRotBtn(),
    ($("#bBack").onclick = () => (typeof mgTravel == "function" ? mgTravel("back") : backFromTown())));
  {
    const e = $("#ktcBtn");
    e && (e.onclick = () => ktcModal());
  }
  (($("#bShop").onclick = () => shopModal()),
    ($("#bKtcT").onclick = () => ktcModal()),
    ($("#bStashT").onclick = () => stashModal()),
    ($("#bSellTown").onclick = () => {
      const e = sellUnmatched();
      (toast(`Bán ${e.n} món`), refresh());
    }));
}
function drawJoystick(t) {
  if (mouseMode()) return;
  const o = joyFixed(),
    a = joyAnchor(),
    e = INPUT.active && (o ? INPUT.fromJoy : !0);
  if (!o && !(e && INPUT.moved)) return;
  const n = e && INPUT.fromJoy ? INPUT.ox : a.x,
    i = e && INPUT.fromJoy ? INPUT.oy : a.y;
  ((t.globalAlpha = e ? 0.35 : 0.12), (t.fillStyle = "#000"), t.beginPath(), t.arc(n, i, JOY_R, 0, 7), t.fill());
  const s = img("ui/ring.png");
  if (s && s.complete && s.naturalWidth) {
    const l = s.naturalWidth / 4,
      f = Math.floor(performance.now() / 90) % 4,
      u = JOY_R * 2.6;
    ((t.globalAlpha = e ? 0.9 : 0.4), t.drawImage(s, f * l, 0, l, s.naturalHeight, n - u / 2, i - u / 2, u, u));
  } else
    ((t.globalAlpha = e ? 0.8 : 0.35),
      (t.strokeStyle = "#e6c67a"),
      (t.lineWidth = 2),
      t.beginPath(),
      t.arc(n, i, JOY_R, 0, 7),
      t.stroke());
  if (e) {
    const r = INPUT.x - n,
      l = INPUT.y - i,
      f = Math.hypot(r, l),
      u = f > JOY_R ? JOY_R / f : 1;
    ((t.globalAlpha = 0.8), (t.fillStyle = "#e6c67a"), t.beginPath(), t.arc(n + r * u, i + l * u, 14, 0, 7), t.fill());
  }
  t.globalAlpha = 1;
}
