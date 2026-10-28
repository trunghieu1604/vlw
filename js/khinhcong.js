"use strict";

const KC_DUR = 0.5,
  KC_HEIGHT = 56,
  KC_CD = 5,
  KC_STATE = { j: null, cd: 0 };

function kcHeight() {
  return KC_STATE.j ? Math.sin(Math.PI * Math.min(1, KC_STATE.j.t / KC_DUR)) * KC_HEIGHT : 0;
}

function khinhCong() {
  if (!S || !S.fac || (typeof R !== "undefined" && R.deadT > 0) || KC_STATE.j || (typeof DG !== "undefined" && DG && DG.on)) return;
  const cdLeft = KC_STATE.cd - performance.now() / 1e3;
  if (cdLeft > 0) {
    if (typeof toast === "function") toast(`Khinh công hồi sau ${Math.ceil(cdLeft)} giây`);
    return;
  }

  // Determine direction [dx, dy]
  const [dx, dy] = (function () {
    if (typeof mouseMode === "function" && mouseMode() && typeof INPUT !== "undefined" && INPUT.aimS && typeof CAM !== "undefined") {
      const nx = INPUT.aimS[0] + CAM.x - H.x,
        ny = INPUT.aimS[1] + CAM.y - H.y,
        d = Math.hypot(nx, ny);
      if (d > 8) return [nx / d, ny / d];
    }
    if (typeof INPUT !== "undefined" && INPUT.target) {
      const nx = INPUT.target.x - H.x,
        ny = INPUT.target.y - H.y,
        d = Math.hypot(nx, ny);
      if (d > 8) return [nx / d, ny / d];
    }
    const k = (typeof INPUT !== "undefined" && INPUT.keys) || {},
      kx = (k.d || k.ArrowRight ? 1 : 0) - (k.a || k.ArrowLeft ? 1 : 0),
      ky = (k.s || k.ArrowDown ? 1 : 0) - (k.w || k.ArrowUp ? 1 : 0);
    if (kx || ky) {
      const d = Math.hypot(kx, ky);
      return [kx / d, ky / d];
    }
    const ang = Math.PI / 2 + ((H.dir || 0) * Math.PI) / 4;
    return [Math.cos(ang), Math.sin(ang)];
  })();

  // Raycast distance check (from 280 down to 40 step 20)
  let targetX = H.x,
    targetY = H.y;
  for (let dist = 280; dist >= 40; dist -= 20) {
    const [cx, cy] = typeof clampWorld === "function" ? clampWorld(H.x + dx * dist, H.y + dy * dist) : [H.x + dx * dist, H.y + dy * dist];
    if (
      typeof OBS === "undefined" ||
      !OBS.g ||
      (typeof obsWalk === "function" && obsWalk(cx, cy) && (typeof obsCanWalk === "function" ? obsCanWalk(H.x, H.y, cx, cy) : true))
    ) {
      targetX = cx;
      targetY = cy;
      break;
    }
  }

  if (Math.hypot(targetX - H.x, targetY - H.y) < 30) {
    if (typeof toast === "function") toast("Phía trước bị chắn, không nhảy được");
  } else {
    KC_STATE.j = { t: 0, x0: H.x, y0: H.y, x1: targetX, y1: targetY };
    KC_STATE.cd = performance.now() / 1e3 + KC_CD;
    if (Math.abs(dx) > 0.2) H.face = dx < 0 ? -1 : 1;
    if (typeof dirOf === "function") H.dir = dirOf(dx, dy);
    if (typeof INPUT !== "undefined") INPUT.target = null;
    H._pp = null;
    if (typeof burst === "function") burst(H.x, H.y, "#d8c49a");
    if (typeof uiSfx === "function") uiSfx("click");
    updateKcUi();
  }
}

function kcTick(dt) {
  const j = KC_STATE.j;
  if (!j) return;
  j.t += dt;
  const p = Math.min(1, j.t / KC_DUR);
  const ease = 1 - (1 - p) * (1 - p);
  H.x = j.x0 + (j.x1 - j.x0) * ease;
  H.y = j.y0 + (j.y1 - j.y0) * ease;
  if (p >= 1) {
    KC_STATE.j = null;
    if (typeof burst === "function") burst(H.x, H.y, "#d8c49a");
  }
}

function updateKcUi() {
  const btn = document.getElementById("bKc");
  if (!btn) return;
  const cdOverlay = btn.querySelector(".cd");
  const cdLeft = Math.max(0, KC_STATE.cd - performance.now() / 1e3);
  if (cdOverlay) cdOverlay.style.height = (cdLeft / KC_CD) * 100 + "%";
  btn.classList.toggle("off", cdLeft > 0);
  const sm = btn.querySelector("small");
  if (sm) sm.textContent = cdLeft > 0 ? Math.ceil(cdLeft) + "s" : "";
}

function initKhinhCongUi() {
  const pad = document.getElementById("pad");
  if (!pad) return;
  let btn = document.getElementById("bKc");
  if (!btn) {
    let hb = pad.querySelector(".hb-kc");
    if (!hb) {
      hb = document.createElement("div");
      hb.className = "hb hb-kc";
      pad.appendChild(hb);
    }
    btn = document.createElement("button");
    btn.className = "pbtn kc";
    btn.id = "bKc";
    btn.title = "Khinh công (Space) · hồi 5 giây";
    btn.innerHTML = '<i></i><div class="cd"></div><small></small><b>Space</b>';
    btn.dataset.key = "Space";
    hb.appendChild(btn);
  } else {
    if (!btn.parentElement || !btn.parentElement.classList.contains("hb")) {
      const hb = document.createElement("div");
      hb.className = "hb hb-kc";
      btn.parentElement.insertBefore(hb, btn);
      hb.appendChild(btn);
    }
    if (!btn.querySelector("i")) {
      const i = document.createElement("i");
      btn.insertBefore(i, btn.firstChild);
    }
    if (!btn.querySelector(".cd")) {
      const cd = document.createElement("div");
      cd.className = "cd";
      btn.appendChild(cd);
    }
    if (!btn.querySelector("small")) {
      const sm = document.createElement("small");
      btn.appendChild(sm);
    }
    if (!btn.querySelector("b")) {
      const b = document.createElement("b");
      b.textContent = "Space";
      btn.appendChild(b);
    }
  }
  btn.title = "Khinh công (Space) · hồi 5 giây";
  btn.onpointerdown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    khinhCong();
  };
  btn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    khinhCong();
  };
  window.addEventListener("keydown", (e) => {
    if (e.code !== "Space" || e.repeat || /INPUT|TEXTAREA|SELECT|BUTTON/.test((e.target && e.target.tagName) || "")) return;
    e.preventDefault();
    khinhCong();
  });
  setInterval(updateKcUi, 250);
}

// Raycast helper for obstacle collision check
function obsCanWalk(x0, y0, x1, y1) {
  if (typeof OBS === "undefined" || !OBS.g || typeof obsWalk !== "function") return true;
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.ceil(dist / 8);
  for (let s = 1; s <= steps; s++) {
    const t = s / steps;
    if (!obsWalk(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false;
  }
  return true;
}

if (typeof window !== "undefined") {
  window.KC_STATE = KC_STATE;
  window.kcHeight = kcHeight;
  window.khinhCong = khinhCong;
  window.kcTick = kcTick;
  window.updateKcUi = updateKcUi;
  window.obsCanWalk = obsCanWalk;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initKhinhCongUi);
  } else {
    initKhinhCongUi();
  }
}
