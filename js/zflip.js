"use strict";

let ZFLIP_AFK = !1,
  afkStartTime = 0,
  afkStartExp = 0,
  afkStartGold = 0,
  afkStartKnb = 0,
  afkTimer = null,
  afkTapCount = 0,
  afkTapTimer = null;

function zflipOn() {
  if (typeof S !== "undefined" && S && S.zflipMode !== undefined) {
    return !!S.zflipMode;
  }
  const w = window.innerWidth,
    h = window.innerHeight;
  const ratio = w / (h || 1);
  return w <= 480 && h <= 480 && w >= 200 && h >= 200 && ratio >= 0.75 && ratio <= 1.35;
}

function zflipApply() {
  const on = zflipOn();
  const changed = document.body.classList.contains("zflip") !== on;
  document.documentElement.classList.toggle("zflip", on);
  document.body.classList.toggle("zflip", on);
  document.documentElement.style.backgroundColor = on ? "#000000" : "";
  document.body.style.backgroundColor = on ? "#000000" : "";

  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    m.setAttribute("content", on ? "#000000" : "#0e1412");
  });

  if (on) {
    zflipInit();
    zflipSyncDock();
    zflipSyncPanel();
    const tabs = document.getElementById("tabs");
    if (tabs) tabs.style.setProperty("display", "none", "important");
    const u20r = document.getElementById("u20r");
    if (u20r) u20r.style.setProperty("display", "none", "important");
    const u20zb = document.getElementById("u20zb");
    if (u20zb) u20zb.style.setProperty("display", "none", "important");
    const topCtl = document.getElementById("topCtl");
    if (topCtl) topCtl.style.setProperty("display", "none", "important");
  } else if (changed) {
    const tabs = document.getElementById("tabs");
    if (tabs) tabs.style.removeProperty("display");
    const u20r = document.getElementById("u20r");
    if (u20r) u20r.style.removeProperty("display");
    const u20zb = document.getElementById("u20zb");
    if (u20zb) u20zb.style.removeProperty("display");
    const topCtl = document.getElementById("topCtl");
    if (topCtl) topCtl.style.removeProperty("display");
  }

  if (changed) {
    typeof resizeArena === "function" && typeof CV !== "undefined" && CV && resizeArena();
  }
}

function zflipInit() {
  if (document.getElementById("zflipDock")) return;

  // 1. Thanh dock duoi cung
  const dock = document.createElement("div");
  dock.id = "zflipDock";
  dock.innerHTML = `
    <button class="zfb" id="zfbAuto" title="Bật / tắt Tự Đánh"><span class="ico">⚔</span><span class="txt">Auto</span></button>
    <button class="zfb" id="zfbPad" title="Ẩn / hiện phím điều khiển"><span class="ico">🎮</span><span class="txt">Phím</span></button>
    <button class="zfb" id="zfbInv" title="Hành trang"><span class="ico">🎒</span><span class="txt">Túi</span></button>
    <button class="zfb" id="zfbSkill" title="Võ công / Kỹ năng"><span class="ico">⚡</span><span class="txt">Chiêu</span></button>
    <button class="zfb" id="zfbChar" title="Nhân vật"><span class="ico">👤</span><span class="txt">NV</span></button>
    <button class="zfb" id="zfbMap" title="Bản đồ luyện công"><span class="ico">🗺</span><span class="txt">Map</span></button>
    <button class="zfb" id="zfbAfk" title="Treo máy tiết kiệm pin (OLED)"><span class="ico">💤</span><span class="txt">Treo</span></button>
    <button class="zfb" id="zfbMenu" title="Hệ thống / Lưu game"><span class="ico">⚙</span><span class="txt">Menu</span></button>
  `;
  document.body.appendChild(dock);

  // 2. Man hinh treo may tiet kiem pin AMOLED Black
  const afk = document.createElement("div");
  afk.id = "zflipAfk";
  afk.innerHTML = `
    <div class="afk-head">
      <div class="afk-char" id="afkChar">Đang cắm auto</div>
      <div class="afk-sub" id="afkSub">Màn hình ngoài Galaxy Z Flip · Chế độ tiết kiệm pin</div>
      <div class="afk-bars">
        <div class="afk-bar hp"><i id="afkHp" style="width:100%"></i></div>
        <div class="afk-bar mp"><i id="afkMp" style="width:100%"></i></div>
      </div>
    </div>
    <div class="afk-stats">
      <div class="afk-row"><span>Thời gian treo:</span><b id="afkTime">00:00:00</b></div>
      <div class="afk-row"><span>Kinh nghiệm:</span><b id="afkExp" style="color:#ffd24a">+0</b></div>
      <div class="afk-row"><span>Bạc nhặt:</span><b id="afkGold" style="color:#ffd24a">+0</b></div>
      <div class="afk-row"><span>KNB nhặt:</span><b id="afkKnb" style="color:#ffd24a">+0</b></div>
      <div class="afk-row"><span>Trạng thái:</span><b id="afkSt" style="color:#2ecc71">Auto diệt quái</b></div>
    </div>
    <div class="afk-tip">Chạm 2 lần để đánh thức màn hình</div>
  `;
  document.body.appendChild(afk);

  // Bind su kien dock
  document.getElementById("zfbAuto").onclick = () => {
    if (typeof toggleAuto === "function") toggleAuto();
    else if (typeof manual === "function") {
      S.ctrl = manual() ? "auto" : "manual";
      if (typeof refreshTopCtl === "function") refreshTopCtl();
    }
    zflipSyncDock();
  };

  document.getElementById("zfbPad").onclick = () => {
    document.body.classList.toggle("pad-hide");
    const h = document.body.classList.contains("pad-hide");
    document.getElementById("zfbPad").classList.toggle("on", !h);
    if (typeof toast === "function") toast(h ? "Đã ẩn cụm phím điều khiển" : "Đã hiện cụm phím điều khiển");
  };

  document.getElementById("zfbInv").onclick = () => {
    const a = document.getElementById("u20zl");
    if (a) a.classList.add("hidden");
    document.body.classList.remove("map-open");
    if (typeof u20Toggle === "function" && typeof U20W !== "undefined" && U20W.on) u20Toggle("inv");
    else if (typeof showTab === "function") showTab("inv");
  };
  document.getElementById("zfbSkill").onclick = () => {
    const a = document.getElementById("u20zl");
    if (a) a.classList.add("hidden");
    document.body.classList.remove("map-open");
    if (typeof u20Toggle === "function" && typeof U20W !== "undefined" && U20W.on) u20Toggle("skill");
    else if (typeof showTab === "function") showTab("skill");
  };
  document.getElementById("zfbChar").onclick = () => {
    const a = document.getElementById("u20zl");
    if (a) a.classList.add("hidden");
    document.body.classList.remove("map-open");
    if (typeof u20Toggle === "function" && typeof U20W !== "undefined" && U20W.on) u20Toggle("char");
    else if (typeof showTab === "function") showTab("char");
  };
  document.getElementById("zfbMap").onclick = () => zflipToggleMap();
  document.getElementById("zfbAfk").onclick = () => {
    const a = document.getElementById("u20zl");
    if (a) a.classList.add("hidden");
    document.body.classList.remove("map-open");
    zflipAfkStart();
  };
  document.getElementById("zfbMenu").onclick = () => {
    const a = document.getElementById("u20zl");
    if (a) a.classList.add("hidden");
    document.body.classList.remove("map-open");
    if (typeof u20Toggle === "function" && typeof U20W !== "undefined" && U20W.on) u20Toggle("more");
    else if (typeof showTab === "function") showTab("more");
  };

  // Danh thuc AFK
  afk.onclick = () => {
    afkTapCount++;
    clearTimeout(afkTapTimer);
    if (afkTapCount >= 2) {
      afkTapCount = 0;
      zflipAfkStop();
    } else {
      afkTapTimer = setTimeout(() => {
        afkTapCount = 0;
      }, 400);
    }
  };
}

function zflipSyncDock() {
  const bAuto = document.getElementById("zfbAuto");
  if (bAuto) {
    const isAuto = typeof manual === "function" ? !manual() : (S && S.ctrl !== "manual");
    bAuto.classList.toggle("on", isAuto);
  }
  const bPad = document.getElementById("zfbPad");
  if (bPad) {
    bPad.classList.toggle("on", !document.body.classList.contains("pad-hide"));
  }
  const bInv = document.getElementById("zfbInv");
  if (bInv) bInv.classList.toggle("on", typeof u20IsOpen === "function" ? u20IsOpen("inv") : (typeof curTab !== "undefined" && curTab === "inv"));
  const bSkill = document.getElementById("zfbSkill");
  if (bSkill) bSkill.classList.toggle("on", typeof u20IsOpen === "function" ? u20IsOpen("skill") : (typeof curTab !== "undefined" && curTab === "skill"));
  const bChar = document.getElementById("zfbChar");
  if (bChar) bChar.classList.toggle("on", typeof u20IsOpen === "function" ? u20IsOpen("char") : (typeof curTab !== "undefined" && curTab === "char"));
  const bMap = document.getElementById("zfbMap");
  if (bMap) {
    const a = document.getElementById("u20zl");
    const isOpen = !!(a && !a.classList.contains("hidden"));
    bMap.classList.toggle("on", isOpen);
    document.body.classList.toggle("map-open", isOpen);
  }
  const bMenu = document.getElementById("zfbMenu");
  if (bMenu) bMenu.classList.toggle("on", typeof u20IsOpen === "function" ? u20IsOpen("more") : (typeof curTab !== "undefined" && curTab === "more"));
}

function zflipToggleMap() {
  const a = document.getElementById("u20zl");
  if (!a) {
    if (typeof openMapTravel === "function") openMapTravel();
    return;
  }
  const isOpen = !a.classList.contains("hidden");
  if (isOpen) {
    a.classList.add("hidden");
    document.body.classList.remove("map-open");
  } else {
    if (typeof u20Close === "function") u20Close();
    if (typeof u20ZoneList === "function") u20ZoneList(!0);
    document.body.classList.add("map-open");
    const zx = document.getElementById("u20zx");
    if (zx) {
      zx.onclick = (e) => {
        e.stopPropagation();
        a.classList.add("hidden");
        document.body.classList.remove("map-open");
        zflipSyncDock();
      };
    }
  }
  zflipSyncDock();
}

function zflipOpenTab(tab, title) {
  const a = document.getElementById("u20zl");
  if (a) a.classList.add("hidden");
  document.body.classList.remove("map-open");
  if (typeof u20Open === "function" && typeof U20W !== "undefined" && U20W.on) {
    u20Open(tab);
    return;
  }
  const panel = document.getElementById("panel");
  if (panel) panel.classList.add("active");
  if (typeof showTab === "function") showTab(tab);
}

function zflipClosePanel() {
  const a = document.getElementById("u20zl");
  if (a) a.classList.add("hidden");
  document.body.classList.remove("map-open");
  if (typeof u20Close === "function") u20Close();
  const panel = document.getElementById("panel");
  if (panel) panel.classList.remove("active");
  if (typeof showTab === "function") showTab("log");
  zflipSyncDock();
}

function zflipSyncPanel() {
  const panel = document.getElementById("panel");
  const isPanel = typeof curTab !== "undefined" && curTab !== "log";
  if (panel) panel.classList.toggle("active", isPanel);
}

// AFK Screen Saver
function zflipAfkStart() {
  ZFLIP_AFK = !0;
  afkStartTime = Date.now();
  afkStartExp = S ? (S.exp || 0) : 0;
  afkStartGold = S ? (S.gold || 0) : 0;
  afkStartKnb = S ? (S.knb || 0) : 0;

  const afk = document.getElementById("zflipAfk");
  if (afk) afk.classList.add("on");

  // Tu bat auto neu chua bat
  if (typeof manual === "function" && manual()) {
    if (typeof toggleAuto === "function") toggleAuto();
    else S.ctrl = "auto";
    zflipSyncDock();
  }

  // Cap nhat thong so ngay lap tuc
  zflipAfkTick();
  clearInterval(afkTimer);
  afkTimer = setInterval(zflipAfkTick, 1000);

  if (typeof toast === "function") toast("Đã bật chế độ treo máy tiết kiệm pin AMOLED");
}

function zflipAfkStop() {
  ZFLIP_AFK = !1;
  clearInterval(afkTimer);
  const afk = document.getElementById("zflipAfk");
  if (afk) afk.classList.remove("on");

  // Ve lai san dau ngay lap tuc
  typeof resizeArena === "function" && typeof CV !== "undefined" && CV && resizeArena();
  if (typeof toast === "function") toast("Đã mở lại màn hình!");
}

function zflipAfkTick() {
  if (!ZFLIP_AFK || !S) return;

  // 1. Thoi gian
  const elapsed = Math.floor((Date.now() - afkStartTime) / 1000);
  const hh = String(Math.floor(elapsed / 3600)).padStart(2, "0");
  const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  const tEl = document.getElementById("afkTime");
  if (tEl) tEl.textContent = `${hh}:${mm}:${ss}`;

  // 2. Ten nhan vat va Cap do
  const cEl = document.getElementById("afkChar");
  if (cEl) cEl.textContent = `${S.name || "Hiệp Khách"} · Lv.${S.lvl || 1}`;

  // 3. Máu và Mana
  const maxHp = typeof maxHpVal === "function" ? maxHpVal() : (S.maxHp || 100);
  const hpPct = Math.max(0, Math.min(100, Math.round(((S.hp || 0) / (maxHp || 1)) * 100)));
  const hpBar = document.getElementById("afkHp");
  if (hpBar) hpBar.style.width = hpPct + "%";

  const maxMp = typeof maxMpVal === "function" ? maxMpVal() : (S.maxMp || 100);
  const mpPct = Math.max(0, Math.min(100, Math.round(((S.mp || 0) / (maxMp || 1)) * 100)));
  const mpBar = document.getElementById("afkMp");
  if (mpBar) mpBar.style.width = mpPct + "%";

  // 4. Thong so EXP, Bạc, KNB
  const diffExp = Math.max(0, (S.exp || 0) - afkStartExp);
  const diffGold = Math.max(0, (S.gold || 0) - afkStartGold);
  const diffKnb = Math.max(0, (S.knb || 0) - afkStartKnb);

  const eEl = document.getElementById("afkExp");
  if (eEl) eEl.textContent = "+" + (diffExp >= 10000 ? (diffExp / 10000).toFixed(1) + " vạn" : diffExp);

  const gEl = document.getElementById("afkGold");
  if (gEl) gEl.textContent = "+" + (typeof fmtVan === "function" ? fmtVan(diffGold) : diffGold + " lượng");

  const kEl = document.getElementById("afkKnb");
  if (kEl) kEl.textContent = "+" + diffKnb;
}

// Hook su kien khoi dong va resize
window.addEventListener("resize", zflipApply);
window.addEventListener("orientationchange", zflipApply);
document.addEventListener("DOMContentLoaded", () => {
  zflipApply();
  setTimeout(zflipApply, 200);
});
// Chay som ngay lap tuc neu script load sau
zflipApply();
