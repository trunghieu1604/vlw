"use strict";
// JX1 keyboard shortcuts (docs/hotkeys.md). Source: the client's default key script \Ui\autoexec.lua
// (website/data/updata03.pak, overrides ui.pak; listed as ShortcutSet 0 "默认配置" in \Ui\uiconfig.ini):
//   F1 help · F2 options · F3 status · F4 items · F5 skills · F6 friend · F11 tasknote · Tab map ·
//   Esc system · Enter chat line · U market · Y shouyi · Q W E A … ShortcutSkill(0..) · 1–9 ShortcutUseItem.
// Items 1–5, M (horse), R, F, T, Space and the arrow keys stay in control.js / thanhanh.js / admin.js.
const HK_WIN = {
  F1: ["help", "Hướng dẫn"],
  F2: ["more", "Hệ thống · Tùy chọn"],
  F3: ["char", "Nhân vật"],
  F4: ["inv", "Hành trang"],
  F5: ["skill", "Võ công"],
  F6: ["friend", "Giang hồ online"],
  F11: ["quest", "Nhiệm vụ"],
};
const HK_SKILL = { KeyQ: 0, KeyW: 1, KeyE: 2, KeyA: 3 },
  HK_SKILL_LBL = ["Q", "W", "E", "A"],
  HK = { mod: null };
// Text-entry focus (chat, search, rename…): shortcuts must not fire. Checkboxes / range sliders don't count.
function hkTyping(t) {
  const el = t || (typeof document !== "undefined" && document.activeElement);
  if (!el || !el.tagName) return !1;
  if (el.isContentEditable || el.tagName === "TEXTAREA" || el.tagName === "SELECT") return !0;
  return el.tagName === "INPUT" && !/^(checkbox|radio|range|button|submit|reset|color|file)$/i.test(el.type);
}
const hkModalOn = () => {
    const m = $("#modal");
    return !!m && !m.classList.contains("hidden");
  },
  hkU20 = () => document.body.classList.contains("u20");
// u20 (desktop): every panel is its own window (js/ui20.js), any number open at once, each key toggles its own
const hkMulti = () => hkU20() && typeof U20W < "u" && U20W.on;
function hkWinOpen(w) {
  if (hkMulti()) {
    if (w === "tt" || w === "more") return u20IsOpen("more") && (u20MoreMode === "tt") === (w === "tt");
    return u20IsOpen(w);
  }
  if (hkU20()) return document.body.classList.contains("u20win") && typeof u20Cur < "u" && u20Cur === w;
  if (w === "tt") return curTab === "more" && typeof u20MoreMode < "u" && u20MoreMode === "tt";
  if (w === "more") return curTab === "more" && !(typeof u20MoreMode < "u" && u20MoreMode === "tt");
  return curTab === w;
}
function hkWinClose(w) {
  hkU20() ? u20Close(hkMulti() && w ? (w === "tt" ? "more" : w) : void 0) : showTab("log");
}
// Toggle a panel window (Nhân vật / Hành trang / Võ công / Nhiệm vụ / Hệ thống); same key again closes it.
function hkToggleWin(w) {
  if (hkWinOpen(w)) return hkWinClose(w);
  hkModalOn() && closeModal();
  typeof u2Open == "function" ? u2Open(w) : showTab(w);
}
// Toggle a modal window opened by key k (pressing k again while it is still up closes it).
function hkToggleModal(k, open) {
  if (hkModalOn() && HK.mod === k) return (closeModal(), (HK.mod = null));
  (open(), (HK.mod = hkModalOn() ? k : null));
}
function hkMap() {
  const z = $("#u20zone"),
    l = $("#u20zl");
  if (!z || z.style.display === "none" || typeof u20ZoneList != "function") return toast("Bản đồ: mở ở thanh bản đồ luyện công");
  l && !l.classList.contains("hidden") ? l.classList.add("hidden") : (u20ZoneList(!0), typeof u20Front == "function" && u20Front(z));
}
function hkSocial() {
  if (typeof netModal == "function" && typeof netOn == "function" && netOn()) return netModal("rank");
  toast("Bản chơi trên máy không có bằng hữu / xếp hạng online");
}
function hkChat() {
  if (typeof chatToggle != "function" || !$("#chatBox") || document.body.classList.contains("nochat")) return;
  try {
    CHAT.open || chatToggle(!0);
  } catch {}
  const i = $("#chatTxt");
  i && i.focus();
}
// Esc like JX1: close the top-most thing that is open (windows one by one, top-most first); with nothing
// open, open the system window.
function hkEsc() {
  if (hkModalOn()) return; // main.js closes the modal (respects locked dialogs)
  const l = $("#u20zl");
  if (l && !l.classList.contains("hidden")) return l.classList.add("hidden");
  if (hkMulti()) {
    if (u20CloseTop()) return;
  } else if (hkU20() ? document.body.classList.contains("u20win") : curTab !== "log") return hkWinClose();
  if (typeof CHAT < "u" && CHAT.open && $("#chatBox")) return chatToggle(!1);
  hkToggleWin("more");
}
function hkDown(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return; // keep browser combos (Ctrl+F5, Cmd+R, Alt+Tab…)
  const k = e.key;
  if (k === "F12") return; // JX1 opens the task log here; left to the browser's devtools on purpose
  if (hkTyping(e.target) || hkTyping(document.activeElement)) {
    const act = (e.target && e.target.tagName === "INPUT") ? e.target : document.activeElement;
    k === "Escape" && act && act.id === "chatTxt" && (act.blur(), e.stopPropagation());
    HK_WIN[k] && e.preventDefault(); // no reload / find bar while typing either
    return;
  }
  if (!S || !S.fac) return;
  const m = $("#modal");
  if (m && !m.classList.contains("hidden") && m.dataset.locked) return; // login gate / forced dialogs
  const win = HK_WIN[k];
  let act = null;
  if (win) {
    const w = win[0];
    act =
      w === "help"
        ? () => hkToggleModal(k, () => tutorialModal(0))
        : w === "friend"
          ? () => hkToggleModal(k, hkSocial)
          : () => hkToggleWin(w);
  } else if (k === "Tab") act = typeof bmToggle == "function" ? bmToggle : hkMap;
  else if (k === "Escape") act = hkEsc;
  else if (k === "Enter") {
    if (e.target && /^(BUTTON|A)$/.test(e.target.tagName)) return; // Enter activates the focused button
    act = hkChat;
  } else if (e.code === "KeyU") act = () => hkToggleModal("U", () => ktcModal());
  else if (e.code === "KeyY") act = () => hkToggleModal("Y", () => giftModal(!0));
  else if (e.code in HK_SKILL) act = () => pressSlot(HK_SKILL[e.code]);
  if (!act) return;
  e.preventDefault(); // F1 help, F3 find, F5 reload, F6 address bar, F11 fullscreen, Tab focus
  if (e.repeat) return;
  try {
    act();
  } catch (x) {
    console.warn("hotkey", k, x);
  }
}
window.addEventListener("keydown", hkDown, !0);
// Show the key in button tooltips, JX1-style "Hành trang (F4)".
function hkTitles() {
  const set = (el, t) => el && (el.title = t);
  const tabKey = { char: "F3", inv: "F4", skill: "F5", quest: "F11", more: "F2" };
  document.querySelectorAll("#tabs button[data-t], #u20menu .u20mi[data-u]").forEach((b) => {
    const t = b.dataset.t || b.dataset.u,
      key = tabKey[t];
    if (!key) return;
    const base = b.dataset.hkBase || (b.title || b.textContent || "").replace(/\s*\([^)]*\)\s*$/, "").trim();
    ((b.dataset.hkBase = base), (b.title = `${base} (${key})`));
  });
  set($("#tabRide"), "Lên / xuống ngựa (M)");
  set($("#u20ktc"), "Kỳ Trân Các (U)");
  set($("#bKtcT"), "Kỳ Trân Các (U)");
  set($("#u20gift"), "Phần thưởng (Y)");
  set($("#u20zb"), "Bản đồ luyện công (Tab)");
  set($("#chatBtn"), "Chat thế giới (Enter)");
  document.querySelectorAll("#pad .sk").forEach((b) => {
    const l = b.querySelector("b");
    l && (l.textContent = HK_SKILL_LBL[+b.dataset.i] || "");
  });
}
// #u20menu / chat are built after login: retry until they exist.
let hkTitleN = 0;
const hkTitleT = setInterval(() => {
  try {
    hkTitles();
    (($("#u20menu") && $("#chatBtn")) || ++hkTitleN > 60) && clearInterval(hkTitleT);
  } catch {}
}, 1e3);
setTimeout(hkTitles, 0);
