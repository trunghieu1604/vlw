"use strict";
const U20_TABS = [
    ["char", "char", "Nhân vật", "Nhân vật"],
    ["inv", "inv", "Hành trang", "Vật phẩm"],
    ["skill", "skill", "Võ công", "Kỹ năng"],
    ["forge", "forge", "Lò rèn", "Lò rèn"],
    ["quest", "quest", "Nhiệm vụ · Phó bản", "Chỉ nam nhiệm vụ"],
    ["ride", "ride", "Lên / xuống ngựa (M)", ""],
    ["more", "more", "Hệ thống", "Hệ thống"],
  ],
  U20_SIDE = [],
  U20_LOGT = [
    ["sys", "Hệ thống"],
  ];
let u20LogT = "sys",
  u20Cur = null;
const u20On = () =>
    !!S &&
    window.innerWidth > window.innerHeight &&
    (window.innerWidth >= 900 || (window.innerWidth >= 640 && window.innerHeight <= 520)),
  u2mOn = () => !!S && !u20On();
function u20Init() {
  if (document.getElementById("u20menu")) return;
  const t = (n) => {
    const i = document.createElement("div");
    ((i.innerHTML = n), document.body.appendChild(i.firstElementChild));
  };
  (t(
    `<div id="u20menu">${U20_TABS.map(([n, i, u]) => `<button class="u20mi" data-u="${n}" title="${u}" style="background-image:url(img/u2/${i}.png)"><i class="dot"></i></button>`).join("")}</div>`,
  ),
    t(
      '<div id="u20rc"><div id="u20trk" style="display:none"></div><button id="u20stb" title="Mã Trường: bộ sưu tập ngựa"><b id="u20stbN"></b></button></div>',
    ));
  {
    const n = $("#pwS");
    n &&
      !$("#u20rank") &&
      n.parentNode.insertAdjacentHTML("afterend", '<button id="u20rank" title="Bảng xếp hạng">🏆 Hạng</button>');
    const r = $("#u20rank");
    r && (r.onclick = () => (typeof rankModal20 == "function" ? rankModal20() : typeof netModal == "function" && netModal("rank")));
  }
  (t(
    '<div id="u20zone"><button id="u20zb" title="Bản đồ luyện công"><span id="u20zn"></span> ▾</button><div id="u20zl" class="hidden"></div></div>',
  ),
    t(
      `<div id="u20side">${U20_SIDE.map(([n, i], u) => `<button class="u20sq" data-s="${u}" data-n="${i}">${n}</button>`).join("")}</div>`,
    ),
    t(
      '<div id="u20r"><button class="u20rb" id="u20gift">Phần<br>thưởng</button><button class="u20rb" id="u20ktc">Kỳ Trân<br>Các</button></div>',
    ),
    t(
      '<div id="u20gold"><span><img src="img/ep/knb.png" alt=""><b id="u20knb">0</b></span><span>🪙 <b id="u20g">0</b></span></div>',
    ),
    t(
      `<div id="u20log"><div id="u20lines"></div><div id="u20ct"><button id="u20lt" title="Ẩn / hiện khung thông báo">📜</button>${U20_LOGT.map(([n, i]) => `<button data-lt="${n}" class="${n === u20LogT ? "on" : ""}">${i}</button>`).join("")}</div></div>`,
    ),
    t('<div id="u20boss"><div class="t"></div><div class="b"><i></i><span></span></div></div>'));
  (document
      .querySelectorAll("#u20menu .u20mi")
      .forEach((n) => (n.onclick = () => (n.dataset.u === "ride" ? toggleMount() : u20Toggle(n.dataset.u)))),
    (u20TrkOn = !S || S.u20trk !== !1),
    document.querySelectorAll("#u20side .u20sq").forEach((n) => (n.onclick = () => U20_SIDE[+n.dataset.s][2]())),
    ($("#u20lt").onclick = () => {
      ((S.u20logOff = !S.u20logOff), save(), u20LogVis());
    }),
    document.querySelectorAll("#u20ct button[data-lt]").forEach(
      (n) =>
        (n.onclick = () => {
          ((u20LogT = n.dataset.lt),
            document.querySelectorAll("#u20ct button[data-lt]").forEach((i) => i.classList.toggle("on", i === n)),
            u20LogDraw());
        }),
    ),
    u20LogVis());
  const e = (n) => () =>
    typeof netModal == "function" && typeof netOn == "function" && netOn()
      ? netModal(n)
      : toast("Bản chơi trên máy không có xếp hạng / chợ / thư");
  $("#u20stb") && ($("#u20stb").onclick = () => actModal("horse"));
  $("#u20zb") &&
    ($("#u20zb").onclick = () => {
      (u20ZoneList(), u20Front($("#u20zone")));
    });
  $("#u20gift") && ($("#u20gift").onclick = () => giftModal(!0));
  $("#u20ktc") && ($("#u20ktc").onclick = () => ktcModal());
  if (typeof modal == "function") {
    const n = modal;
    modal = (...i) => {
      const u = n(...i);
      return (u20Front($("#modal")), u);
    };
  }
  if (typeof chatToggle == "function") {
    const n = chatToggle;
    chatToggle = (i) => {
      (n(i), i && u20Front($("#chatBox")));
    };
  }
  (u20Apply(), window.addEventListener("resize", u20Apply), setInterval(u20Tick, 250));
}
function u20StbTick() {
  const t = $("#u20stb");
  if (!t || ((t.style.display = S && S.fac ? "" : "none"), !S || !S.fac)) return;
  const s = typeof horseBoxHave == "function" ? horseBoxHave() : 0;
  let o = 0;
  if (typeof hcOwned == "function") {
    const i = hcOwned(),
      u = new Set();
    for (const c of S.inv)
      isHorse(c) && hcTier(c) >= 0 && !i.has(hcKey(c)) && !u.has(hcKey(c)) && (u.add(hcKey(c)), o++);
  }
  const e = s + o,
    n = e ? String(e > 99 ? "99+" : e) : "";
  t.dataset.n !== n &&
    ((t.dataset.n = n),
    ($("#u20stbN").textContent = n),
    t.classList.toggle("on", !!e),
    (t.title =
      "Mã Trường: bộ sưu tập ngựa" +
      (s ? ` · ${s} Rương Ngựa chưa mở` : "") +
      (o ? ` · ${o} loài mới chưa cất vào Mã Trường` : "")));
}
function u2mZonePos() {
  const t = $("#arena"),
    s = $("#u20zone");
  if (!t || !s) return;
  const o = t.getBoundingClientRect(),
    e = o.width / (t.clientWidth || o.width || 1);
  Object.assign(s.style, {
    top: o.top + (MINI.top + MINI.s + 2) * e + "px",
    right: window.innerWidth - o.right + MINI.m * e + "px",
    width: MINI.s * e + "px",
  });
}
function u20LogVis() {
  const t = !!(S && S.u20logOff);
  document.body.classList.toggle("u20logoff", t);
  const s = $("#u20lt");
  s && (s.classList.toggle("on", !t), (s.title = t ? "Hiện khung thông báo" : "Ẩn khung thông báo"));
}
let u20Z = 50;
function u20Front(t) {
  t && document.body.classList.contains("u20") && t.style.setProperty("z-index", String(++u20Z), "important");
}
// drag handle t moves box s (position:fixed / absolute in viewport px); done(x, y) after a real move
function u20Drag(t, s, done) {
  let o,
    e,
    n,
    i,
    u = !1,
    mv = !1;
  (t.addEventListener("pointerdown", (c) => {
    if (c.target.tagName === "BUTTON" || c.button > 0) return;
    ((u = !0), (mv = !1), (o = c.clientX), (e = c.clientY));
    const d = s.getBoundingClientRect();
    ((n = d.left), (i = d.top), t.setPointerCapture(c.pointerId));
  }),
    t.addEventListener("pointermove", (c) => {
      if (!u) return;
      const x = Math.min(window.innerWidth - 60, Math.max(60 - s.offsetWidth, n + c.clientX - o)),
        y = Math.min(window.innerHeight - 30, Math.max(0, i + c.clientY - e));
      ((mv = mv || Math.abs(c.clientX - o) + Math.abs(c.clientY - e) > 2),
        (s.style.left = x + "px"),
        (s.style.top = y + "px"),
        (s.style.transform = "none"),
        s.classList.contains("u20w") && u20WFit(s, y));
    }),
    t.addEventListener("pointerup", () => {
      (u && mv && done && done(parseFloat(s.style.left) || 0, parseFloat(s.style.top) || 0), (u = !1));
    }),
    t.addEventListener("pointercancel", () => {
      u = !1;
    }));
}
// ---------------------------------------------------------------- JX1-style windows (u20 desktop)
// Every panel (Nhân vật F3, Hành trang F4, Võ công F5, Lò rèn, Nhiệm vụ F11, Hệ thống F2) is its own floating
// window: .u20w[data-w] inside #panel (which becomes a full-screen click-through layer). Windows open / close
// independently, a click brings one to the front, the title bar drags it and the position is remembered
// (double-click the title bar: default place). u2s (landscape phone, short screen) keeps one window at a time;
// u2m / classic tabs keep #panel as it was.
const U20_WINS = ["char", "skill", "inv", "forge", "quest", "more"],
  U20W = { on: !1, open: [], z: 1, rendering: null, pos: null },
  U20W_KEY = "jxU20WinPos",
  u20WEl = (w) => document.querySelector(`#panel > .u20w[data-w="${w}"]`),
  u20IsOpen = (w) => U20W.on && U20W.open.includes(w),
  u20Single = () => document.body.classList.contains("u2s");
function u20WPos() {
  if (!U20W.pos)
    try {
      U20W.pos = JSON.parse(localStorage.getItem(U20W_KEY) || "{}") || {};
    } catch {
      U20W.pos = {};
    }
  return U20W.pos;
}
function u20WPosSave(w, x, y) {
  const p = u20WPos();
  w && (x == null ? delete p[w] : (p[w] = [Math.round(x), Math.round(y)]));
  try {
    localStorage.setItem(U20W_KEY, JSON.stringify(p));
  } catch {}
}
function u20WTitle(w) {
  const el = u20WEl(w);
  if (!el) return;
  const t = U20_TABS.find((e) => e[0] === w),
    s = w === "more" && u20MoreMode === "tt" ? "Trợ Thủ Kiếm Hiệp" : t ? t[3] : "",
    h = el.querySelector(".u20wt");
  (h.textContent !== s && (h.textContent = s), w === "more" && (el.dataset.m = u20MoreMode === "tt" ? "tt" : "sys"));
}
function u20WBuild() {
  const p = $("#panel");
  for (const w of U20_WINS) {
    if (u20WEl(w)) continue;
    const el = document.createElement("section");
    ((el.className = "u20w"),
      (el.dataset.w = w),
      (el.innerHTML =
        '<div class="u20wh"><span class="u20wt"></span><button class="u20wx" title="Đóng (Esc)">✕</button></div>'),
      p.appendChild(el));
    const h = el.firstElementChild;
    ((h.querySelector(".u20wx").onclick = () => u20Close(w)),
      u20Drag(h, el, (x, y) => u20WPosSave(w, x, y)),
      h.addEventListener("dblclick", (e) => {
        e.target.tagName !== "BUTTON" && (u20WPosSave(w, null), u20WPlace(w));
      }),
      el.addEventListener("pointerdown", () => u20WFront(w), !0));
  }
}
// on: move the tab bodies into their windows; off: back into #panel (classic tabs) in the original order
function u20WMount(on) {
  if (on === U20W.on) return;
  const p = $("#panel");
  if (!p) return;
  if (on) {
    u20WBuild();
    for (const w of U20_WINS) {
      const t = $("#t-" + w);
      t && u20WEl(w).appendChild(t);
    }
    ((U20W.on = !0), (U20W.open = []), p.classList.add("u20wl"), u20WSync());
    return;
  }
  const top = U20W.open[U20W.open.length - 1];
  for (const w of U20_WINS) {
    const t = $("#t-" + w),
      el = u20WEl(w);
    (t && p.insertBefore(t, $("#panel > .u20w")), el && el.classList.remove("open"));
  }
  ((U20W.on = !1), (U20W.open = []), p.classList.remove("u20wl"), u20WSync());
  S && S.fac && u20ShowTab0(top || "log");
}
// render one window with its own tab renderer (partyui keeps the window's own character tab 1–4)
function u20RenderOne(w) {
  if (!S || !S.fac || !u20IsOpen(w)) return;
  if (typeof PCTX < "u" && PCTX && typeof pDefer == "function") return void pDefer("u20r_" + w, () => u20RenderOne(w));
  R.dirty && recalc();
  const f = {
      char: renderChar,
      skill: renderSkill,
      inv: renderInv,
      forge: renderForge,
      quest: renderQuest,
      more: renderMore,
    }[w],
    prev = U20W.rendering;
  U20W.rendering = w;
  try {
    f();
  } finally {
    U20W.rendering = prev;
  }
  u20WTitle(w);
}
// body.u20win, u20Cur (top-most window), curTab (= the focused window, for code that refreshes "its" tab)
// and the "open" highlight of the menu buttons
function u20WSync() {
  const top = U20W.open[U20W.open.length - 1] || null;
  ((u20Cur = top),
    document.body.classList.toggle("u20win", !!top),
    U20W.on && typeof curTab < "u" && (curTab = top || "log"));
  for (const b of document.querySelectorAll("#u20menu .u20mi:not([data-u=ride])"))
    b.classList.toggle("on", U20W.open.includes(b.dataset.u));
}
function u20WFront(w) {
  const el = u20WEl(w);
  if (!el || !u20IsOpen(w)) return;
  const m = $("#modal");
  (m && m.classList.contains("hidden") && u20Front($("#panel")),
    U20W.open[U20W.open.length - 1] !== w &&
      ((U20W.open = U20W.open.filter((o) => o !== w).concat(w)), (el.style.zIndex = String(++U20W.z)), u20WSync()));
}
// a window never runs past the bottom edge (nor over the menu buttons): its body scrolls instead
const u20WFit = (el, y) => (el.style.maxHeight = Math.max(160, window.innerHeight - y - 46) + "px");
function u20WSet(el, x, y) {
  const r = el.getBoundingClientRect(),
    W = window.innerWidth,
    H = window.innerHeight;
  ((x = Math.min(W - 60, Math.max(60 - r.width, x))),
    (y = Math.min(H - 30, Math.max(0, y))),
    (el.style.left = Math.round(x) + "px"),
    (el.style.top = Math.round(y) + "px"),
    u20WFit(el, y));
}
// default place, JX1 layout: Nhân vật left, Hành trang right (under the minimap column), Võ công next to
// Nhân vật, the rest centred; among a few candidates the one that covers the other open windows least
function u20WAuto(w) {
  const el = u20WEl(w),
    r = el.getBoundingClientRect(),
    ww = r.width,
    hh = r.height,
    W = window.innerWidth,
    H = window.innerHeight,
    sm = u20Single(),
    top = sm ? 2 : 64,
    rx = W - ww - (sm ? 4 : (typeof MINI < "u" ? MINI.s + MINI.m : 156) + 14),
    pref = { char: 8, inv: rx, skill: 8 }[w] ?? Math.round((W - ww) / 2),
    others = U20W.open.filter((o) => o !== w).map((o) => u20WEl(o).getBoundingClientRect()),
    lo = 4,
    hi = Math.max(lo, W - ww - 4),
    cx = [pref, lo, rx, Math.round((W - ww) / 2)].concat(
      others.map((o) => o.right + 6),
      others.map((o) => o.left - ww - 6),
    ),
    y0 = Math.max(0, Math.min(top, H - hh - 8)),
    ov = (x, y) =>
      others.reduce(
        (a, o) =>
          a +
          Math.max(0, Math.min(x + ww, o.right) - Math.max(x, o.left)) *
            Math.max(0, Math.min(y + hh, o.bottom) - Math.max(y, o.top)),
        0,
      );
  let bx = pref,
    by = y0,
    bs = 1 / 0;
  for (let x of cx) {
    x = Math.min(hi, Math.max(lo, x));
    const s = ov(x, y0) + Math.abs(x - pref) * 0.5;
    s < bs && ((bs = s), (bx = x));
  }
  // still on top of another one: step down so every title bar stays visible
  for (let k = 0; k < 8 && others.some((o) => Math.abs(o.top - by) < 30 && o.left < bx + ww && o.right > bx); k++)
    by += 34;
  return [bx, Math.min(by, Math.max(0, H - 60))];
}
function u20WPlace(w) {
  const el = u20WEl(w);
  if (!el) return;
  const p = u20WPos()[w];
  if (p) return u20WSet(el, p[0], p[1]);
  ((el.style.left = "0px"), (el.style.top = "0px"), (el.style.maxHeight = ""));
  const [x, y] = u20WAuto(w);
  u20WSet(el, x, y);
}
function u20Open(t, s) {
  s && typeof questTab < "u" && (questTab = s);
  const w = t === "tt" ? "more" : t;
  if (((t === "tt" || t === "more") && (u20MoreMode = t === "tt" ? "tt" : "sys"), !U20W.on)) {
    U20_WINS.includes(w) && u20ShowTab0(w);
    return;
  }
  const el = u20WEl(w);
  if (!el) return;
  if (u20Single()) for (const o of U20W.open.slice()) o !== w && u20Close(o);
  const fresh = !U20W.open.includes(w);
  (fresh && (U20W.open.push(w), el.classList.add("open")),
    (el.style.zIndex = String(++U20W.z)),
    (U20W.open = U20W.open.filter((o) => o !== w).concat(w)),
    u20WSync(),
    u20Front($("#panel")),
    u20RenderOne(w),
    fresh && u20WPlace(w));
}
// u20Close(w) closes that window; u20Close() closes them all
function u20Close(w) {
  for (const o of w ? [w] : U20W.open.slice()) {
    const el = u20WEl(o);
    (el && el.classList.remove("open"), (U20W.open = U20W.open.filter((e) => e !== o)));
  }
  (!w && document.body.classList.remove("u20win"), u20WSync());
}
const u20CloseTop = () => !!U20W.open.length && (u20Close(U20W.open[U20W.open.length - 1]), !0);
function u20Toggle(t) {
  const w = t === "tt" ? "more" : t;
  u20IsOpen(w) ? u20Close(w) : u20Open(t);
}
// refresh(): every open window re-renders (only the open ones); showTab(x) opens window x
const u20Refresh0 = refresh,
  u20ShowTab0 = showTab;
refresh = function () {
  if (!U20W.on) return u20Refresh0();
  if (typeof pDefer == "function" && pDefer("refresh", refresh)) return;
  if ((typeof modeSwSync == "function" && modeSwSync(), !S.fac)) return;
  R.dirty && recalc();
  for (const w of U20W.open.slice()) u20RenderOne(w);
  (renderPad(), updateDots());
};
showTab = function (n) {
  if (!U20W.on) return u20ShowTab0(n);
  n === "log" ? u20Close() : u20Open(n);
};
window.addEventListener("resize", () => {
  if (U20W.on)
    for (const w of U20W.open) {
      const el = u20WEl(w);
      el && u20WSet(el, parseFloat(el.style.left) || 0, parseFloat(el.style.top) || 0);
    }
});
function u20Apply() {
  const t = u20On(),
    s = t && window.innerHeight < 560,
    o = u2mOn();
  (document.body.classList.toggle("u20", t),
    document.body.classList.toggle("u2s", s),
    document.body.classList.toggle("u2m", o));
  for (const n of ["u20menu", "u20side", "u20r", "u20gold", "u20log", "u20boss", "u20rc", "u20rank"]) {
    const i = document.getElementById(n);
    i && (i.style.display = t ? "" : "none");
  }
  if (
    (($("#u20zone").style.display = t || o ? "" : "none"),
    typeof MINI < "u" &&
      (t
        ? ((MINI.s = s ? 104 : 150), (MINI.top = s ? 2 : 4), (MINI.m = s ? 4 : 6))
        : ((MINI.s = 92), (MINI.top = 62), (MINI.m = 8))),
    t)
  ) {
    $("#u20r").style.right = MINI.s + MINI.m + (s ? 6 : 12) + "px";
    const n = MINI.s + MINI.top + 2;
    Object.assign($("#u20zone").style, { top: n + "px", right: MINI.m + "px", width: MINI.s + "px" });
    const i = s && matchMedia("(pointer: coarse)").matches ? 32 : 24;
    (($("#u20side").style.top = n + i + 4 + "px"), ($("#u20rc").style.top = n + i + 4 + "px"));
  }
  o && u2mZonePos();
  const e = $("#chatBox");
  if (e) {
    const n = t ? document.body : $("#battle");
    e.parentNode !== n && n.appendChild(e);
  }
  (t ? u20WMount(!0) : U20W.on && (u20WMount(!1), (u20MoreMode = "sys"), S && S.fac && refresh()),
    t && s && U20W.open.length > 1 && u20Close(), // became a short screen: one window at a time
    t && U20W.s !== s && ((U20W.s = s), U20W.open.forEach(u20WPlace)), // short <-> tall screen: re-place
    typeof resizeArena == "function" && typeof CV < "u" && CV && resizeArena());
}
function u20Helper() {
  const t = (o, e, n) => `<label><input type="checkbox" id="${o}" ${e ? "checked" : ""}> ${n}</label>`,
    s = typeof DT == "function" ? DT() : {};
  modal(
    `<h3>Trợ Thủ Kiếm Hiệp</h3><div class="u20tt">
    <h4>Chiến đấu</h4>${t("tAuto", !manual(), "Tự đánh (Auto) · phím F")}${t("tRot", S.rot !== !1, "Xoay chiêu ô Q W E A · phím R")}${t("tClose", !!S.closeAtk, "Đánh tiếp cận (chạy sát quái rồi mới ra chiêu)")}${t("tBoss", !!S.bossFirst, "Ưu tiên đánh boss (trùm / trùm Hoàng Kim trên bản đồ: bỏ quái thường, chạy tới đánh trùm)")}${t("tRide", S.autoRide !== !1, "Tự lên ngựa khi di chuyển, xuống ngựa khi đánh chiêu không dùng trên ngựa · phím M")}${t("tMap", S.autoMap !== !1, "Tự đổi bãi luyện công theo cấp")}
    <h4>Thuốc</h4>${t("tPot", !S.potOff, "Dùng thuốc khi sinh lực / nội lực dưới 50%")}${t("tBuy", S.potBuy !== !1, "Tự mua thuốc khi hết (tối đa 20% ngân lượng)")}
    <h4>Đồ đạc</h4>${t("tEq", !!S.autoEquip, "Tự mặc đồ tốt hơn khi nhặt")}${t("tJunk", S.autoJunk !== !1, "Tự bán đồ thừa")}${t("tPts", S.autoPts === !0, "Tự cộng điểm tiềm năng và võ công")}
    <h4>Nhiệm vụ</h4>${t("tDt", s.auto !== !1, "Dã Tẩu tự trả / nhận")}${t("tLdt", S.autoLdt !== !1, "Tự dùng Lệnh Bài Dã Tẩu khi hết lượt")}</div>`,
    () => {
      const o = (e, n) => {
        const i = $(e);
        i &&
          (i.onchange = () => {
            (n(i.checked), save());
          });
      };
      (o("#tAuto", (e) => setCtrl(e ? "auto" : "manual")),
        o("#tRot", (e) => {
          ((S.rot = e), refreshRotBtn(), (R.dirty = !0));
        }),
        o("#tRide", (e) => {
          S.autoRide = e;
        }),
        o("#tMap", (e) => {
          S.autoMap = e;
        }),
        o("#tClose", (e) => {
          S.closeAtk = e;
        }),
        o("#tBoss", (e) => {
          S.bossFirst = e;
        }),
        o("#tPot", (e) => {
          S.potOff = !e;
        }),
        o("#tBuy", (e) => {
          S.potBuy = e;
        }),
        o("#tEq", (e) => {
          S.autoEquip = e;
        }),
        o("#tJunk", (e) => {
          S.autoJunk = e;
        }),
        o("#tPts", (e) => {
          S.autoPts = e;
        }),
        o("#tDt", (e) => {
          DT().auto = e;
        }),
        o("#tLdt", (e) => {
          S.autoLdt = e;
        }));
    },
  );
}
const u20Kind = (t) =>
  /class="xpl"/.test(t)
    ? "fight"
    : /Nhặt được|rơi ra|Tự mua|Hành trang đầy/.test(t)
      ? "loot"
      : /📜|Dã Tẩu|Sát Thủ|Phó bản|🏯|thuyền/i.test(t)
        ? "quest"
        : /Hạ |xuất hiện|trọng thương|Trùm|trốn thoát/.test(t)
          ? "fight"
          : "sys";
let u20LogN = -1;
function u20LogDraw() {
  const t = $("#u20lines");
  if (!t) return;
  if (u20LogT === "chat") {
    t.innerHTML =
      typeof CHAT < "u" && CHAT.msgs.length
        ? CHAT.msgs.slice(-10).map(chatLine).join("")
        : '<div style="color:#999">Chưa có tin nhắn · bấm 💬 để chat</div>';
    return;
  }
  const s = (R.logs || []).slice(0, 10).reverse();
  t.innerHTML = s.map((o) => `<div>${o}</div>`).join("");
}
function u20Tick() {
  if (document.body.classList.contains("u2m") && S && S.fac) {
    (u20ZoneName(), u2mZonePos());
    const n = document.getElementById("tabRide");
    n && (n.classList.toggle("on", !!R.mounted), n.classList.toggle("off", !canRide()));
    return;
  }
  if (!document.body.classList.contains("u20") || !S || !S.fac) return;
  (u20TrkDraw(), u20ZoneName(), u20StbTick());
  // loot picked up: main.js re-renders the bag only when it is the focused window (curTab)
  typeof invDirty < "u" && invDirty && curTab !== "inv" && u20IsOpen("inv") && u20RenderOne("inv");
  {
    $("#u20mail") && ($("#u20mail").style.display = "none");
    $("#u20mkt") && ($("#u20mkt").style.display = "none");
    const u = $("#u20rank");
    u && (u.style.display = "none");
  }
  const t = $("#chatBox");
  t && t.parentNode !== document.body && document.body.appendChild(t);
  for (const n of document.querySelectorAll('#u20menu [data-u="ride"], #tabRide'))
    (n.classList.toggle("on", !!R.mounted), n.classList.toggle("off", !canRide()));
  const s = (R.logs || []).length + "|" + (R.logs || [])[0] + "|" + (typeof CHAT < "u" ? CHAT.msgs.length : 0);
  (s !== u20LogN && ((u20LogN = s), u20LogDraw()),
    ($("#u20g").textContent = fmtL(S.gold)),
    ($("#u20knb").textContent = fmt(S.knb || 0)));
  const o =
      R.enemies &&
      R.enemies
        .filter((n) => !n.dead && n.cls === "boss" && Math.hypot(n.x - H.x, n.y - H.y) < 700)
        .sort((n, i) => Math.hypot(n.x - H.x, n.y - H.y) - Math.hypot(i.x - H.x, i.y - H.y))[0],
    e = $("#u20boss");
  if (o) {
    ((e.style.display = "block"), (e.querySelector(".t").textContent = `${o.n} · Lv ${o.L}`));
    const n = Math.max(0, (o.hp / o.max) * 100);
    ((e.querySelector("i").style.width = n + "%"), (e.querySelector("span").textContent = n.toFixed(1) + "%"));
  } else e.style.display = "none";
  for (const [n, i] of [
    ["char", "dotChar"],
    ["skill", "dotSkill"],
    ["forge", "dotForge"],
    ["quest", "dotQuest"],
  ]) {
    const u = document.getElementById(i),
      c = document.querySelector(`#u20menu [data-u="${n}"] .dot`);
    u && c && c.classList.toggle("on", u.classList.contains("on"));
  }
}
document.readyState === "loading"
  ? document.addEventListener("DOMContentLoaded", () => setTimeout(u20Init, 300))
  : setTimeout(u20Init, 300);
