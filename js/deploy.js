"use strict";
// Zero-loss deploys and version reloads (docs/deploy.md §3). Loaded after js/main.js (init() has run).
//
// 1. The server being replaced sends {t:"deploy", build} on the chat / world sockets (and answers every API call
//    with "X-Volam-Drain: 1"); an API answer from a different build ("X-Volam-Build") means the new version is
//    already serving. Either way deployStart():
//      - writes S.resume = {at, map, x, y, town, tid, m, q} (where the hero stands, town or field, mounted,
//        disciples' positions), saves locally and uploads the save to the cloud (netUpload),
//      - shows "Đang cập nhật phiên bản mới…" and polls /api/health until a different build answers (not
//        draining), then reloads (at the latest after DEP_MAX ms).
// 2. After the reload, resumeApply() puts the hero back: same town (Thổ Địa Phù entry) or same field map, at the
//    same position (the map's landing point mechanism of js/jxmap.js), mounted again, disciples next to it.
//    Only a resume younger than RESUME_MAX is applied; dungeons / the tower / the boat are not resumed (they restart).
//    Every save() writes the block (hook at the end of this file), so a plain F5 / a crashed tab resumes too.
// 3. ver.json bumps (appVerCheck in js/main.js) go through deployReload() too, with a guard against reload loops.
const DEP = { on: !1, from: "", seen: "", t0: 0, el: null, saved: !1 },
  DEP_MAX = 9e4,
  RESUME_MAX = 15 * 6e4;

function resumeMark() {
  if (typeof S != "object" || !S || !S.fac) return;
  try {
    const q = [];
    if (typeof partyN == "function" && typeof pAct == "function" && !(typeof partyAway == "function" && partyAway()))
      for (let k = 1; k <= partyN(); k++) {
        const h = pAct(k).h;
        q.push([Math.round(h.x), Math.round(h.y)]);
      }
    S.resume = {
      at: Date.now(),
      map: typeof JXM == "object" && JXM.cur ? String(JXM.cur.id) : "",
      x: Math.round(H.x),
      y: Math.round(H.y),
      town: R.town ? 1 : 0,
      tid: typeof W == "object" && W.town ? String(W.town.id) : "",
      m: R.mounted ? 1 : 0,
      dg: R.dg || R.tower ? 1 : 0,
      q,
    };
  } catch (e) {
    console.warn("resumeMark", e);
  }
}

// Land on (x, y) of map id ONCE: JXM.lands[id] is also the town's Thổ Địa Phù point / a visit map's camp centre
// (jxmFieldRect), so the previous value is put back as soon as the landing was applied (or after 30 s).
function resumeLand(id, x, y) {
  if (typeof jxmLand != "function" || typeof JXM != "object") return;
  const had = Object.prototype.hasOwnProperty.call(JXM.lands, id),
    prev = JXM.lands[id],
    t0 = Date.now();
  jxmLand(id, x, y);
  JXM.landPending = id;
  const back = () => {
    if (JXM.landPending === id && Date.now() - t0 < 3e4) return void setTimeout(back, 250);
    JXM.landPending === id && (JXM.landPending = null);
    had ? (JXM.lands[id] = prev) : delete JXM.lands[id];
  };
  setTimeout(back, 250);
}

function resumeApply() {
  const r = typeof S == "object" && S && S.resume;
  if (!r) return;
  delete S.resume;
  if (!S.fac || !(Date.now() - (+r.at || 0) < RESUME_MAX) || r.dg) return;
  try {
    const map = String(r.map || "");
    if (r.town) {
      // the town itself was restored from S.thTown by thRestore(); land on the saved spot, then enter it
      const tid = String(W.town.id);
      if (map === tid) resumeLand(tid, r.x, r.y);
      typeof thToTown == "function" && thToTown();
    } else if (map && typeof jxmLand == "function") {
      // field: S.stage / S.zalt already pick the same map; land on the saved spot when its meta is active
      resumeLand(map, r.x, r.y);
      JXM.cur && String(JXM.cur.id) === map && typeof jxmLandNow == "function" && jxmLandNow();
    }
    if (r.m && typeof setMount == "function") ((R.rideCd = 0), setMount(!0, !0));
    // disciples: next to where they stood (the follow code re-forms them right after)
    const q = Array.isArray(r.q) ? r.q : [];
    setTimeout(() => {
      try {
        if (typeof pAct != "function") return;
        q.forEach((p, i) => {
          const h = pAct(i + 1).h;
          Array.isArray(p) && Math.hypot(p[0] - H.x, p[1] - H.y) < 600 && ((h.x = p[0]), (h.y = p[1]));
        });
      } catch {}
    }, 1500);
    typeof log == "function" && log("↻ Đã cập nhật trạng thái — tiếp tục tại chỗ cũ.");
  } catch (e) {
    console.warn("resumeApply", e);
  }
  typeof save == "function" && save();
}

function deployOverlay(msg) {
  let el = DEP.el;
  if (!el) {
    el = DEP.el = document.createElement("div");
    el.id = "deployOv";
    el.style.cssText =
      "position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;background:rgba(8,6,4,.78);color:#f3e2b3;font:16px/1.5 system-ui,sans-serif;text-align:center;padding:24px";
    document.body.appendChild(el);
  }
  el.innerHTML = `<div style="max-width:420px;padding:22px 26px;border:1px solid #8a6a2a;border-radius:10px;background:#1d160d"><b style="font-size:18px">⚙ Đang cập nhật phiên bản mới…</b><p style="margin:10px 0 0">${msg}</p></div>`;
}

async function deploySave() {
  resumeMark();
  try {
    typeof save == "function" && save();
  } catch {}
  if (typeof NET == "object" && NET.user && S && S.fac && typeof netUpload == "function")
    for (let i = 0; i < 3; i++)
      try {
        await netUpload();
        return !0;
      } catch (e) {
        await new Promise((r) => setTimeout(r, 800 * (i + 1)));
      }
  return !1;
}

// o = {build: build of the server going away}
async function deployStart(o) {
  if (DEP.on) return;
  DEP.on = !0;
  DEP.t0 = Date.now();
  DEP.from = String((o && o.build) || DEP.seen || "");
  deployOverlay("Đang lưu nhân vật…");
  DEP.saved = await deploySave();
  deployOverlay(
    (DEP.saved ? "Đã lưu nhân vật lên máy chủ ✓" : "Đã lưu nhân vật trên máy này ✓") +
      "<br><small>Trò chơi tự tải lại khi phiên bản mới sẵn sàng (vài giây).</small>",
  );
  const base = typeof API == "object" && API.base ? API.base : "";
  for (;;) {
    await new Promise((r) => setTimeout(r, 1500));
    if (Date.now() - DEP.t0 > DEP_MAX) break;
    try {
      const r = await fetch(base + "/api/health?t=" + Date.now(), { cache: "no-store" });
      if (!r.ok) continue;
      const j = await r.json();
      if (j && j.ok && !j.draining && String(j.build) !== DEP.from) break;
    } catch {}
  }
  deployReload("deploy", !0);
}

// Reload now, keeping the place (also used by the ver.json check). force = skip the loop guard.
function deployReload(why, force) {
  const t = Date.now();
  let g = null;
  try {
    g = JSON.parse(sessionStorage.getItem("jxidle_reload") || "null");
  } catch {}
  if (!g || !(t - (+g.t || 0) < 6e5)) g = { n: 0, t };
  if (!force && (g.n | 0) >= 2) {
    // e.g. ver.json bumped without APP_V: never loop
    console.warn("deployReload: reloaded twice in 10 min already, not again (" + why + ")");
    return !1;
  }
  // a deploy reload (force) waits for a new build to answer, so it cannot loop: only version reloads count
  if (!force)
    try {
      sessionStorage.setItem("jxidle_reload", JSON.stringify({ n: (g.n | 0) + 1, t: g.t, why }));
    } catch {}
  resumeMark();
  try {
    typeof save == "function" && save();
  } catch {}
  DEP.reloading = !0;
  location.reload();
  return !0;
}

// Called by js/api.js for every API answer (headers) and by the sockets ({t:"deploy"}, {t:"hi"/"hello", build}).
function deployNotice(build, draining) {
  if (DEP.on || DEP.reloading) return;
  build = String(build || "");
  if (draining) return void deployStart({ build: build || DEP.seen });
  if (!build) return;
  if (!DEP.seen) DEP.seen = build;
  else if (build !== DEP.seen) deployStart({ build: DEP.seen }); // the new version already answers
}

window.addEventListener("pagehide", () => {
  // leaving while a deploy / version reload is going on: keep the place for the next load
  (DEP.on || DEP.reloading) && (resumeMark(), typeof save == "function" && save());
});

try {
  resumeApply();
} catch (e) {
  console.warn(e);
}

// Every save from now on carries the current place, so a plain F5 / a crashed tab / a closed laptop resumes
// from the last periodic save (every 10 s, js/main.js) too — not only a deploy. Installed after resumeApply():
// init()'s own early saves must not overwrite the block before it was applied. Not while a disciple is swapped
// into S/H (js/party.js defers that save anyway).
if (typeof save == "function") {
  const o = save;
  save = function () {
    typeof PCTX != "undefined" && PCTX ? 0 : resumeMark();
    return o.apply(this, arguments);
  };
}

// Test environments (VOLAM_ENV_LABEL, e.g. uatvolam.esport9.com = "UAT"): a fixed badge + tab title prefix, so a
// test page is never mistaken for production.
(function () {
  const l = self.CHAT_CFG && CHAT_CFG.label;
  if (!l) return;
  document.title = "[" + l + "] " + document.title;
  const b = document.createElement("div");
  b.textContent = l;
  b.title = "Môi trường thử nghiệm: dữ liệu ở đây không ảnh hưởng máy chủ chính";
  b.style.cssText =
    "position:fixed;left:50%;top:0;transform:translateX(-50%);z-index:99999;pointer-events:none;padding:1px 10px;" +
    "background:#c4302b;color:#fff;font:700 11px/16px sans-serif;border-radius:0 0 6px 6px;opacity:.85";
  (document.body || document.documentElement).appendChild(b);
})();
