"use strict";
// Bản đồ lớn (Tab), like JX1's map window: the whole current map (full-map mini.webp, or the old zone
// background) with the hero, town NPCs and monsters marked. Click / tap a point and the hero walks there the
// same way as clicking the ground (manual mode + INPUT.target; navGo finds the path). Clicking next to an NPC
// walks up to it and opens its dialog. Opens from Tab, the minimap (field) or the town bar button (town).
const BM = { cv: null, raf: 0, k: 1, src: null, hover: null };
const BM_KIND = {
  shop: ["#ffd25a", "Thương nhân"],
  storage: ["#7fd4ff", "Rương chứa đồ"],
  bank: ["#7fd4ff", "Tiền trang"],
  xaphu: ["#7dff8a", "Xa phu"],
  guard: ["#b8b8b8", "Vệ binh"],
  talk: ["#e8dcc8", "NPC"],
  admin_npc: ["#c060ff", "Administrator"],
};
const BM_CSS = `
#bmWrap{display:flex;flex-direction:column;gap:6px}
#bmHead{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
#bmHead b{font-size:14px;color:#ffe9a8}
#bmHead .sp{flex:1}
#bmBox{position:relative;align-self:center;line-height:0;border:1px solid #5a4a2a;background:#000}
#bmCv{display:block;cursor:crosshair;touch-action:none}
#bmTip{position:absolute;pointer-events:none;background:#000c;color:#fff3c0;font:11px "IBM Plex Mono",monospace;
  padding:2px 5px;border:1px solid #5a4a2a;white-space:nowrap;line-height:1.3;transform:translate(-50%,-140%)}
#bmLeg{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:11px;color:#cfc3a8}
#bmLeg i{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:4px;vertical-align:middle}
`;
function bmSrc() {
  const m = typeof JXM == "object" ? JXM.cur : null,
    mini = typeof jxmMini == "function" ? jxmMini() : null;
  if (m && mini) return { img: mini, w: m.w, h: m.h, name: m.name || "" };
  const b = R.bgImg;
  if (b && b.complete && b.naturalWidth) return { img: b, w: WORLD.w, h: WORLD.h, name: "" };
  return null;
}
function bmName(src) {
  if (R.town && W.town) return W.town.n;
  if (src && src.name) return src.name;
  const z = typeof zoneOf == "function" && S && zoneOf(Math.min(S.stage, STAGES));
  return (z && z.n) || "Bản đồ";
}
const bmIsOpen = () => !!(BM.cv && BM.cv.isConnected && !$("#modal").classList.contains("hidden"));
function bmToggle() {
  if (bmIsOpen()) return closeModal();
  bmOpen();
}
function bmOpen() {
  if (!S || !S.fac) return;
  const src = bmSrc();
  if (!src) return toast("Bản đồ đang tải…");
  if (!document.getElementById("bmCss")) {
    const st = document.createElement("style");
    ((st.id = "bmCss"), (st.textContent = BM_CSS), document.head.appendChild(st));
  }
  const aw = Math.min(window.innerWidth * 0.9, 1000) - 24,
    ah = window.innerHeight * 0.72 - 70,
    k = Math.min(aw / src.w, ah / src.h),
    cw = Math.max(1, Math.round(src.w * k)),
    ch = Math.max(1, Math.round(src.h * k)),
    leg = Object.values(BM_KIND)
      .filter((v, i, a) => a.findIndex((u) => u[1] === v[1]) === i)
      .map(([c, n]) => `<span><i style="background:${c}"></i>${n}</span>`)
      .join("");
  modal(
    `<div id="bmWrap"><div id="bmHead"><b>${esc(bmName(src))}</b><span class="sp"></span>` +
      `<button class="btn sm" id="bmZones">Bản đồ luyện công</button>` +
      `<button class="btn sm" onclick="closeModal()">Đóng (Tab)</button></div>` +
      `<div id="bmBox"><canvas id="bmCv"></canvas><div id="bmTip" hidden></div></div>` +
      `<div id="bmLeg"><span><i style="background:#ffd700"></i>Bạn</span>${leg}` +
      `<span><i style="background:#ff5040"></i>Quái</span><span>Bấm vào bản đồ để đi tới</span></div></div>`,
    () => {
      const cv = $("#bmCv"),
        dpr = Math.min(2, window.devicePixelRatio || 1);
      ((cv.width = Math.round(cw * dpr)), (cv.height = Math.round(ch * dpr)));
      ((cv.style.width = cw + "px"), (cv.style.height = ch + "px"));
      Object.assign(BM, { cv, k, src, dpr, hover: null });
      cv.addEventListener("pointerdown", bmClick);
      cv.addEventListener("pointermove", bmMove);
      cv.addEventListener("pointerleave", () => ((BM.hover = null), ($("#bmTip").hidden = !0)));
      $("#bmZones").onclick = () => (closeModal(), typeof hkMap == "function" && hkMap());
      cancelAnimationFrame(BM.raf);
      bmLoop();
    },
  );
}
function bmLoop() {
  if (!bmIsOpen()) return (BM.cv = null);
  bmDraw();
  BM.raf = requestAnimationFrame(bmLoop);
}
function bmNpcs() {
  return R.town && typeof NPCV == "object" ? NPCV.list.filter((n) => BM_KIND[n.k]) : [];
}
function bmDraw() {
  const { cv, k, src, dpr } = BM,
    c = cv.getContext("2d"),
    s = k * dpr;
  (c.setTransform(1, 0, 0, 1, 0, 0), c.clearRect(0, 0, cv.width, cv.height));
  c.drawImage(src.img, 0, 0, cv.width, cv.height);
  c.setTransform(s, 0, 0, s, 0, 0);
  const r = 1 / k; // 1 css px in world units
  const dot = (x, y, rad, fill, line) => {
    (c.beginPath(), c.arc(x, y, rad * r, 0, 7), (c.fillStyle = fill), c.fill());
    line && ((c.lineWidth = r), (c.strokeStyle = line), c.stroke());
  };
  if (!R.town) for (const e of R.enemies || []) e.hp > 0 && dot(e.x, e.y, e.cls === "boss" ? 3.5 : 2, "#ff5040");
  for (const n of bmNpcs()) dot(n.x, n.y, n.k === "xaphu" ? 4 : 3, BM_KIND[n.k][0], "#000");
  // xa phu / storage names, like the JX1 map labels
  c.font = `${11 * r}px "IBM Plex Mono", monospace`;
  c.textAlign = "center";
  for (const n of bmNpcs())
    if (n.k === "xaphu" || n.k === "storage") {
      (c.fillStyle = "#000"), c.fillText(n.n, n.x + r, n.y - 6 * r + r);
      (c.fillStyle = BM_KIND[n.k][0]), c.fillText(n.n, n.x, n.y - 6 * r);
    }
  const t = INPUT.target;
  if (t) {
    (c.lineWidth = 2 * r), (c.strokeStyle = "#7dff8a");
    (c.beginPath(), c.moveTo(H.x, H.y), c.lineTo(t.x, t.y), c.setLineDash([4 * r, 4 * r]), c.stroke(), c.setLineDash([]));
    (c.beginPath(), c.moveTo(t.x - 5 * r, t.y - 5 * r), c.lineTo(t.x + 5 * r, t.y + 5 * r));
    (c.moveTo(t.x + 5 * r, t.y - 5 * r), c.lineTo(t.x - 5 * r, t.y + 5 * r), c.stroke());
  }
  const p = 4.5 + Math.sin(performance.now() / 180);
  dot(H.x, H.y, p, "#ffd700", "#fff");
}
function bmWorld(e) {
  const b = BM.cv.getBoundingClientRect();
  return [(e.clientX - b.left) / BM.k, (e.clientY - b.top) / BM.k];
}
function bmNear(x, y) {
  let best = null,
    bd = 9 / BM.k;
  for (const n of bmNpcs()) {
    const d = Math.hypot(n.x - x, n.y - y);
    d < bd && ((bd = d), (best = n));
  }
  return best;
}
function bmMove(e) {
  const [x, y] = bmWorld(e),
    n = bmNear(x, y),
    tip = $("#bmTip");
  BM.hover = n;
  if (!n) return (tip.hidden = !0);
  tip.hidden = !1;
  tip.textContent = n.tt ? `${n.n} · ${n.tt}` : n.n;
  ((tip.style.left = n.x * BM.k + "px"), (tip.style.top = n.y * BM.k + "px"));
}
function bmClick(e) {
  e.preventDefault();
  const [x, y] = bmWorld(e),
    n = bmNear(x, y);
  if (n && typeof npcGoTo == "function") return (closeModal(), npcGoTo(n));
  typeof manual == "function" && (manual() || setCtrl("manual"));
  const [tx, ty] = inWorld(x, y);
  ((INPUT.target = { x: tx, y: ty }), (R.pickTarget = null), (H._nav = null));
}
// minimap (field) opens the big map; town has no minimap, so add a button to the town bar
function bmInstall() {
  const tb = $("#townBar");
  if (tb && !$("#bMapT")) {
    const b = document.createElement("button");
    ((b.className = "btn sm"), (b.id = "bMapT"), (b.textContent = "Bản đồ"), (b.title = "Bản đồ (Tab)"));
    ((b.onclick = bmOpen), tb.insertBefore(b, $("#bBack")));
  }
  CV.addEventListener(
    "pointerdown",
    (e) => {
      if (R.town || S.miniMap === !1 || typeof MINI != "object") return;
      const b = CV.getBoundingClientRect(),
        x = e.clientX - b.left,
        y = e.clientY - b.top,
        l = AR.w - MINI.s - MINI.m;
      if (x >= l - 2 && x <= l + MINI.s + 2 && y >= MINI.top - 2 && y <= MINI.top + MINI.s + 2)
        (e.stopImmediatePropagation(), e.preventDefault(), bmOpen());
    },
    !0,
  );
}
window.addEventListener("DOMContentLoaded", bmInstall);
