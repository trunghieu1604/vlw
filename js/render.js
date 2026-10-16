"use strict";
let CV,
  CX,
  DPR = 1;
// Actor sheets (img/jx, img/a) are native JX1 SPR pixels: the world is 1:1 like the JX1 client.
// Effects that are still the original site's 0.6x exports (stun / state / curse sheets) keep their
// old on-screen size through ACT_FX_SCALE.
const MON_SCALE = 1,
  HERO_SCALE = 1,
  ACT_FX_SCALE = 1.35,
  // cache-buster of the native actor sheets (same file names as the old 0.6x sheets, which the
  // service worker / HTTP cache may still hold)
  SPR_V = "?n1",
  IMG = {};
// nearest-neighbour while a sprite lands on whole device pixels (1:1, or DPR 2 = exact 2x copies);
// returns the previous imageSmoothingEnabled so the caller can restore it
function sprCrisp(c, k) {
  const v = c.imageSmoothingEnabled,
    q = (c.getTransform ? c.getTransform().a : DPR || 1) * k;
  return (Math.abs(q - Math.round(q)) < 1e-6 && (c.imageSmoothingEnabled = !1), v);
}
function img(i) {
  if (!i) return null;
  let t = IMG[i];
  return (t || ((t = new Image()), (t.src = i), (IMG[i] = t)), t);
}
function addText(i, t, n, o, e = 12) {
  const isDisc = typeof PCTX !== "undefined" && PCTX > 0;
  const l = S.lowFx ? 18 : 36;
  if (R.quiet || R.txt.length > l || (isDisc && R.txt.length > 20)) return;
  R.txt.push({ x: i, y: t, t: n, color: o, size: e, life: S.lowFx ? 0.5 : 0.75 });
}
function burst(i, t, n) {
  R.quiet || R.fx.push({ k: "ring", x: i, y: t, color: n, life: 0.45, max: 0.45 });
}
function fxLine(i, t, n) {
  if (R.quiet || R.fx.length > 80) return;
  let o = "phys",
    e = 0;
  for (const l in n.parts) n.parts[l] > e && ((e = n.parts[l]), (o = l));
  R.fx.push({ k: "line", x1: i.x, y1: i.y - 20, x2: t.x, y2: t.y - 14, color: ELEM_COL[o], life: 0.18, max: 0.18 });
}
const JFX = window.JFX || { m: {}, s: {}, c: {}, f: {} },
  FX_SCALE = 1.4,
  MAX_FX = 90,
  MAX_DEPTH = 3,
  FRAME_DELTA = 1 / 18,
  UA = 2,
  GA = 0.3,
  dir16 = (dx, dy) => ((Math.round(Math.atan2(-dx, dy) / (Math.PI / 8)) % 16) + 16) % 16,
  animDur = (s) => (s && s.n && s.ms ? Math.max(0.2, (s.n * s.ms) / 1000) : 0.6),
  PRELOADED_SKILLS = new Set();

function preloadSkillFx(id, depth = 0) {
  const f = JFX.f && JFX.f[id];
  if (!f || depth > MAX_DEPTH + 1 || (depth === 0 && PRELOADED_SKILLS.has(id))) return;
  depth === 0 && PRELOADED_SKILLS.add(id);
  if (f.pre && JFX.c && JFX.c[f.pre]) img(JFX.c[f.pre].f);
  const m = f.c && JFX.m && JFX.m[f.c];
  if (m) {
    if (m.fly && m.fly.f) img(m.fly.f);
    if (m.flyb && m.flyb.f) img(m.flyb.f);
    if (m.hit && m.hit.f) img(m.hit.f);
    if (m.hitb && m.hitb.f) img(m.hitb.f);
    if (m.van && m.van.f) img(m.van.f);
    if (m.vanb && m.vanb.f) img(m.vanb.f);
  }
  for (const key of ["sk", "es", "ef", "ec", "ev"]) {
    f[key] && preloadSkillFx(f[key], depth + 1);
  }
}

function preloadHeroSkills() {
  if (typeof S !== "undefined" && S && S.fac) {
    for (const id of [S.main, ...(S.slots || [])]) id && preloadSkillFx(id);
  }
}

function castFx(sk) {
  const f = sk && sk.id && JFX.f && JFX.f[sk.id],
    pre = f && f.pre && JFX.c && JFX.c[f.pre];
  if (!pre || R.quiet || R.fx.length > MAX_FX) return;
  R.fx.push({
    k: "boom",
    s: pre,
    x: H.x,
    y: pre.k ? H.y - (R.mounted ? Math.round((38 * 887) / 1024) : 0) : H.y - 6,
    t: 0,
    life: animDur(pre),
    dir: 0,
  });
}

function spawnBoom(m, type, x, y, dir, delay = 0) {
  if (!m) return false;
  const o = m[type],
    c = m[type + "b"];
  if (!o && !c) return false;
  const main = o || c;
  R.fx.push({
    k: "boom",
    s: main,
    sb: o && c ? c : null,
    x: x,
    y: y,
    t: -delay,
    life: Math.max(animDur(main), c ? animDur(c) : 0),
    dir: dir || 0,
  });
  return true;
}

const XA = 84;
let Ta = 1.2;
const QA = new Set([354]);

function spawnSkillChain(skId, startPos, targetPos, depth, delay, targetActor) {
  const f = JFX.f && JFX.f[skId];
  if (!f || depth > MAX_DEPTH || R.fx.length > MAX_FX) return;
  if (f.es) spawnSkillChain(f.es, startPos, targetPos, depth + 1, delay, targetActor);
  if (f.sk) {
    const numSub = Math.min(f.num || 1, 3);
    for (let n = 0; n < numSub; n++) {
      spawnSkillChain(f.sk, startPos, targetPos, depth + 1, delay + 0.12 * n, targetActor);
    }
  }
  const m = f.c && JFX.m && JFX.m[f.c];
  if (!m) return;
  const dx = targetPos.x - startPos.x,
    dy = targetPos.y - startPos.y,
    dist = Math.hypot(dx, dy) || 1,
    ang = Math.atan2(dy, dx),
    num = clamp(f.num || 1, 1, 16),
    reach = Math.min(280, Math.max(90, (m.spd || 300) * Math.min(m.life || 0.6, 1))),
    fireMis = (x1, y1, x2, y2, off, isTgt) => spawnMis(f, m, x1, y1, x2, y2, delay + off, depth, isTgt ? targetActor : null),
    fireBoom = (x, y, off, isTgt) => spawnMis(f, m, x, y, x, y, delay + off, depth, isTgt ? targetActor : null),
    form = f.form ?? 1;

  if (form >= 8 || form === 6) {
    for (let n = 0; n < Math.min(num, 6); n++) {
      fireBoom(
        targetPos.x + (n ? rnd(-40, 40) : 0),
        targetPos.y + (n ? rnd(-26, 26) : 0),
        0.08 * n,
        !n
      );
    }
  } else if (form === 7) {
    fireBoom(startPos.x, startPos.y + 14, 0, false);
  } else if (form === 3 && m.mk === 5 && targetActor) {
    for (let n = 0; n < num; n++) {
      const a = ang + ((n + 0.5) / num) * Math.PI * 2;
      fireMis(
        startPos.x + Math.cos(a) * XA,
        startPos.y + Math.sin(a) * XA * 0.7,
        targetPos.x,
        targetPos.y,
        0.05 * n,
        true
      );
    }
  } else if (form === 3) {
    for (let n = 0; n < num; n++) {
      const a = ang + (n / num) * Math.PI * 2;
      fireMis(
        startPos.x,
        startPos.y,
        startPos.x + Math.cos(a) * reach,
        startPos.y + Math.sin(a) * reach * 0.75,
        0,
        false
      );
    }
  } else if (form === 2) {
    for (let n = 0; n < num; n++) {
      const off = n - (num - 1) / 2,
        a = ang + 0.2 * off;
      fireMis(
        startPos.x,
        startPos.y,
        startPos.x + Math.cos(a) * dist,
        startPos.y + Math.sin(a) * dist,
        0,
        Math.abs(off) < 0.6
      );
    }
  } else if (form === 0) {
    const nx = -dy / dist,
      ny = dx / dist;
    for (let s = 0; s < num; s++) {
      const off = 30 * (s - (num - 1) / 2);
      fireMis(
        startPos.x + nx * off,
        startPos.y + ny * off,
        targetPos.x + nx * off,
        targetPos.y + ny * off,
        0,
        Math.abs(off) < 16
      );
    }
  } else if (form === 4 || form === 5) {
    for (let n = 0; n < Math.min(num, 8); n++) {
      fireMis(
        startPos.x,
        startPos.y,
        targetPos.x + rnd(-60, 60),
        targetPos.y + rnd(-40, 40),
        0.05 * n,
        !n
      );
    }
  } else {
    for (let n = 0; n < Math.min(num, 6); n++) {
      fireMis(startPos.x, startPos.y, targetPos.x, targetPos.y, 0.09 * n, true);
    }
  }
}

function spawnMis(f, m, x1, y1, x2, y2, delay, depth, tgt) {
  if (R.fx.length > MAX_FX) return;
  const still = x1 === x2 && y1 === y2;
  if (still && !m.fly && !m.flyb) {
    spawnBoom(m, "hit", x1, y1, 0, delay) || spawnBoom(m, "van", x1, y1, 0, delay);
    if (f.ec) spawnSkillChain(f.ec, { x: x1, y: y1 }, { x: x1, y: y1 }, depth + 1, delay + 0.05, tgt);
    if (f.ev) triggerEventVanish(f.ev, { x: x1, y: y1 }, depth, tgt, delay + 0.05);
    return;
  }
  const d = Math.hypot(x2 - x1, y2 - y1),
    fullAnimLife = (m.fly && m.fly.n && m.fly.ms ? (m.fly.n * m.fly.ms) / 1000 : 0) || m.life || 0.6,
    dur = still
      ? Math.max(0.3, fullAnimLife)
      : clamp(d / Math.max(60, m.spd || 300), 0.12, Math.min(0.9, Math.max(0.2, m.life || 0.9)));
  R.fx.push({
    k: "mis",
    f: f,
    m: m,
    x1: x1,
    y1: y1,
    x2: x2,
    y2: y2,
    x: x1,
    y: y1,
    t: -delay,
    life: dur,
    still: still,
    hit: !!tgt || still,
    tgt: tgt,
    depth: depth,
    dir: dir16(x2 - x1, y2 - y1),
    ft: 0,
    fn: 0,
  });
}

function triggerEventVanish(evId, pos, depth, tgt, delay = 0) {
  const f = JFX.f && JFX.f[evId];
  if (!f || (S && S.lowFx)) return;
  if (!QA.has(evId) && R.fx.some((fx) => fx.k === "mis" && fx.f === f && fx.t < GA)) return;
  Ta = UA;
  try {
    spawnSkillChain(evId, pos, pos, depth + 1, delay, tgt);
  } finally {
    Ta = 1.2;
  }
}

function stepFx(fx, dt) {
  fx.t += dt;
  if (fx.t < 0) return true;
  if (fx.k !== "mis") return fx.t < fx.life;
  
  const m = fx.m,
    f = fx.f;
  if (fx.tgt && m.mk === 5 && !fx.tgt.dead) {
    fx.x2 = fx.tgt.x;
    fx.y2 = fx.tgt.y - 14;
  }
  const s = clamp(fx.t / fx.life, 0, 1);
  let curX = fx.x1 + (fx.x2 - fx.x1) * s,
    curY = fx.y1 + (fx.y2 - fx.y1) * s;
  
  if (m.mk === 7 && !fx.still) {
    curY -= Math.sin(Math.PI * s) * Math.min(90, 0.35 * Math.hypot(fx.x2 - fx.x1, fx.y2 - fx.y1));
  }
  if (m.mk === 4 && !fx.still) {
    const dist = Math.hypot(fx.x2 - fx.x1, fx.y2 - fx.y1) || 1,
      wave = 14 * Math.sin(s * Math.PI * 4);
    curX += (-(fx.y2 - fx.y1) / dist) * wave;
    curY += ((fx.x2 - fx.x1) / dist) * wave;
  }
  
  if (!fx.still && Math.abs(curX - fx.x) + Math.abs(curY - fx.y) > 0.5) {
    fx.dir = dir16(curX - fx.x, curY - fx.y);
  }
  fx.x = curX;
  fx.y = curY;
  
  if (f.ef && fx.fn < 6 && (fx.ft += dt) >= Math.min((f.eft || 1) * FRAME_DELTA, fx.life / 3)) {
    fx.ft = 0;
    fx.fn++;
    spawnSkillChain(f.ef, { x: curX, y: curY }, { x: fx.x2, y: fx.y2 }, fx.depth + 1, 0, fx.tgt);
  }
  
  if (fx.t < fx.life) return true;
  
  const endPos = { x: fx.x, y: fx.y };
  if (fx.hit) {
    spawnBoom(m, "hit", endPos.x, endPos.y, fx.dir) || spawnBoom(m, "van", endPos.x, endPos.y, fx.dir);
    if (f.ec) spawnSkillChain(f.ec, endPos, endPos, fx.depth + 1, 0, fx.tgt);
    if (fx.still && f.ev) triggerEventVanish(f.ev, endPos, fx.depth, fx.tgt);
  } else {
    spawnBoom(m, "van", endPos.x, endPos.y, fx.dir);
    if (f.ev) spawnSkillChain(f.ev, endPos, { x: endPos.x + (fx.x2 - fx.x1), y: endPos.y + (fx.y2 - fx.y1) }, fx.depth + 1, 0, fx.tgt);
  }
  return false;
}

const FEATHER_CACHE = new Map();

function getFeatheredSheet(image, sheet) {
  if (!image || !image.complete || !image.naturalWidth) return image;
  const key = sheet.f;
  if (FEATHER_CACHE.has(key)) return FEATHER_CACHE.get(key);

  const w = sheet.w || image.naturalWidth;
  const h = sheet.h || image.naturalHeight;
  const n = sheet.n || 1;
  const d = sheet.d || 1;

  // Tự động làm mềm viền (feather) cho các hiệu ứng chạm viền frame
  const padX = Math.min(18, Math.floor(w * 0.08));
  const padY = Math.min(18, Math.floor(h * 0.08));

  if (padX < 3 && padY < 3) {
    FEATHER_CACHE.set(key, image);
    return image;
  }

  try {
    const cv = document.createElement("canvas");
    cv.width = image.naturalWidth;
    cv.height = image.naturalHeight;
    const ctx = cv.getContext("2d");
    ctx.drawImage(image, 0, 0);

    ctx.globalCompositeOperation = "destination-out";

    for (let c = 0; c < n; c++) {
      const fx = c * w;
      for (let r = 0; r < d; r++) {
        const fy = r * h;

        if (padX >= 3) {
          const gL = ctx.createLinearGradient(fx, fy, fx + padX, fy);
          gL.addColorStop(0, "rgba(0,0,0,1)");
          gL.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = gL;
          ctx.fillRect(fx, fy, padX, h);

          const gR = ctx.createLinearGradient(fx + w - padX, fy, fx + w, fy);
          gR.addColorStop(0, "rgba(0,0,0,0)");
          gR.addColorStop(1, "rgba(0,0,0,1)");
          ctx.fillStyle = gR;
          ctx.fillRect(fx + w - padX, fy, padX, h);
        }

        if (padY >= 3) {
          const gT = ctx.createLinearGradient(fx, fy, fx, fy + padY);
          gT.addColorStop(0, "rgba(0,0,0,1)");
          gT.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = gT;
          ctx.fillRect(fx, fy, w, padY);

          const gB = ctx.createLinearGradient(fx, fy + h - padY, fx, fy + h);
          gB.addColorStop(0, "rgba(0,0,0,0)");
          gB.addColorStop(1, "rgba(0,0,0,1)");
          ctx.fillStyle = gB;
          ctx.fillRect(fx, fy + h - padY, w, padY);
        }
      }
    }

    FEATHER_CACHE.set(key, cv);
    return cv;
  } catch (err) {
    FEATHER_CACHE.set(key, image);
    return image;
  }
}

function drawFxSpriteSheet(sheet, dir, t, x, y, loop) {
  if (!sheet || !sheet.f) return false;
  const rawImg = img(sheet.f);
  if (!rawImg || !rawImg.complete || !rawImg.naturalWidth) return false;
  const ms = Math.max(1, sheet.ms || 56);
  const n = Math.max(1, sheet.n || 1);
  const d = Math.max(1, sheet.d || 1);
  const fIdx = Math.floor((1000 * Math.max(0, t)) / ms);

  // Nếu không lặp, dừng vẽ ngay khi đã diễn xong hết frame cuối, tránh đơ/chớp hình
  if (!loop && fIdx >= n) return false;

  const col = loop ? (fIdx % n) : fIdx;
  const row = d > 1 ? (((Math.round((dir * d) / 16) % d) + d) % d) : 0;
  const image = getFeatheredSheet(rawImg, sheet);

  const dw = Math.round(sheet.w * FX_SCALE);
  const dh = Math.round(sheet.h * FX_SCALE);
  const dx = Math.round(x - sheet.ax * FX_SCALE);
  const dy = Math.round(y - sheet.ay * FX_SCALE);

  CX.imageSmoothingEnabled = true;
  CX.imageSmoothingQuality = "high";

  CX.drawImage(
    image,
    col * sheet.w,
    row * sheet.h,
    sheet.w,
    sheet.h,
    dx,
    dy,
    dw,
    dh
  );
  return true;
}

function drawFx(fx) {
  if (fx.t < 0) return false;
  if (fx.k === "mis") {
    const m = fx.m;
    let drawn = false;
    const isLoop = !fx.still;
    if (m.flyb) drawn = drawFxSpriteSheet(m.flyb, fx.dir, fx.t, fx.x, fx.y, isLoop);
    if (m.fly) drawn = drawFxSpriteSheet(m.fly, fx.dir, fx.t, fx.x, fx.y, isLoop) || drawn;
    return drawn;
  }
  if (fx.k === "boom") {
    let drawn = false;
    if (fx.sb) drawn = drawFxSpriteSheet(fx.sb, fx.dir, fx.t, fx.x, fx.y, false) || drawn;
    if (fx.s) drawn = drawFxSpriteSheet(fx.s, fx.dir, fx.t, fx.x, fx.y, false) || drawn;
    return drawn;
  }
  return true;
}

function skillFx(launcher, target, skill) {
  if (!skill) return;
  if (skill.id) preloadSkillFx(skill.id);
  castFx(skill);
  if (R.quiet) return;
  if (skill.id && JFX.f && JFX.f[skill.id]) {
    spawnSkillChain(
      skill.id,
      { x: launcher.x, y: launcher.y - 20 },
      { x: target.x, y: target.y - 14 },
      0,
      0,
      target
    );
  } else {
    fxLine(launcher, target, skill);
  }
}

function jmSupFx(id, tgt, pre) {
  if (R.quiet || (typeof S != "undefined" && S && S.lowFx)) return;
  pre && castFx({ id });
  const f = JFX.f && JFX.f[id],
    m = f && f.c && JFX.m && JFX.m[f.c];
  const s = m && (m.hit || m.van || m.fly);
  if (tgt && s && R.fx.length < MAX_FX) {
    R.fx.push({ k: "boom", s, x: tgt.x, y: tgt.y - 14, t: 0, life: animDur(s), dir: 0 });
  }
}

function ev2Fx(i, t, n, o, e) {
  if (R.quiet) return;
  const l = (t.id && JFX.f && JFX.f[t.id]) || {},
    r = t.id && (JFX.m[(e && e.fx) || l.ev2c] || JFX.m[l.c || (JFX.s && JFX.s[t.id])]),
    s = r && (r.hit || r.van || r.fly);
  if (s) {
    R.fx.push({
      k: "boom",
      s: s,
      x: i.x,
      y: i.y - 14,
      t: -0.1,
      life: animDur(s),
      dir: 0,
    });
  }
}
const UI_SCALE_MOBILE = 0.8,
  isMobileUI = () =>
    !(typeof isDesktopLandscape == "function" && isDesktopLandscape()) &&
    !!(window.matchMedia && (window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 700)),
  uiScale = () => (!document.body.classList.contains("u20") && document.body.classList.contains("mob") ? UI_SCALE_MOBILE : 1);
function resizeArena() {
  const i = $("#battle"),
    t = { width: i.offsetWidth, height: i.offsetHeight };
  const z = typeof getArenaZoom == "function" ? getArenaZoom() : 1;
  ((DPR = Math.min(2, window.devicePixelRatio || 1) * uiScale()),
    (CV.width = Math.round(t.width * DPR)),
    (CV.height = Math.round(t.height * DPR)),
    (AR.cssW = t.width),
    (AR.cssH = t.height),
    (AR.w = Math.round(t.width / z)),
    (AR.h = Math.round(t.height / z)),
    (AR.top = 58),
    (AR.bot = AR.h - 12),
    snapCamera());
}
const CAM = { x: 0, y: 0 },
  camTarget = () => [
    clamp(H.x - AR.w / 2, 0, Math.max(0, WORLD.w - AR.w)),
    clamp(H.y - AR.h * 0.55, 0, Math.max(0, WORLD.h - AR.h)),
  ];
function snapCamera() {
  [CAM.x, CAM.y] = camTarget();
}
function updateCamera(i) {
  const [t, n] = camTarget(),
    o = Math.min(1, i * 6);
  ((CAM.x += (t - CAM.x) * o), (CAM.y += (n - CAM.y) * o));
}
const BG_TILE = 1536;
function drawTiledBg(i, t) {
  if (typeof jxmDrawGround == "function" && jxmDrawGround(i)) return;
  if (!(t && t.complete && t.naturalWidth)) {
    const fallback = (R.town && W && W.town && W.town.bg) ? img(W.town.bg) : (R.bgImg || img("img/z/town.jpg"));
    if (fallback && fallback.complete && fallback.naturalWidth) t = fallback;
    else {
      ((i.fillStyle = "#26301f"), i.fillRect(CAM.x - 2, CAM.y - 2, AR.w + 4, AR.h + 4));
      return;
    }
  }
  if (OBS.g) {
    i.drawImage(t, 0, 0, WORLD.w, WORLD.h);
    return;
  }
  const n = BG_TILE,
    o = Math.floor(CAM.x / n),
    e = Math.floor((CAM.x + AR.w) / n),
    l = Math.floor(CAM.y / n),
    r = Math.floor((CAM.y + AR.h) / n);
  for (let s = o; s <= e; s++)
    for (let f = l; f <= r; f++) {
      const a = s & 1,
        h = f & 1;
      if (!a && !h) {
        i.drawImage(t, s * n, f * n, n, n);
        continue;
      }
      (i.save(),
        i.translate(s * n + (a ? n : 0), f * n + (h ? n : 0)),
        i.scale(a ? -1 : 1, h ? -1 : 1),
        i.drawImage(t, 0, 0, n, n),
        i.restore());
    }
}
const MINI = { s: 92, m: 8, top: 26 };
function drawMinimap(i) {
  if (R.town || S.miniMap === !1 || document.body.classList.contains("zflip")) return;
  const t = MINI.s,
    n = (AR.cssW || AR.w) - t - MINI.m,
    o = MINI.top,
    e = t / Math.max(WORLD.w, WORLD.h);
  (i.save(), (i.globalAlpha = 0.9), (i.fillStyle = "#000c"), i.fillRect(n - 2, o - 2, t + 4, t + 4));
  const l = (typeof jxmMini == "function" && jxmMini()) || R.bgImg || ((R.town && W && W.town && W.town.bg) ? img(W.town.bg) : img("img/z/town.jpg"));
  if (l && l.complete && l.naturalWidth)
    if (OBS.g) i.drawImage(l, n, o, WORLD.w * e, WORLD.h * e);
    else {
      const a = Math.round(WORLD.w / BG_TILE),
        h = t / a;
      for (let u = 0; u < a; u++)
        for (let x = 0; x < a; x++)
          (i.save(),
            i.translate(n + u * h + (u & 1 ? h : 0), o + x * h + (x & 1 ? h : 0)),
            i.scale(u & 1 ? -1 : 1, x & 1 ? -1 : 1),
            i.drawImage(l, 0, 0, h, h),
            i.restore());
    }
  else ((i.fillStyle = "#26301f"), i.fillRect(n, o, t, t));
  ((i.globalAlpha = 1),
    (i.strokeStyle = "#fff6"),
    (i.lineWidth = 1),
    i.strokeRect(n + CAM.x * e, o + CAM.y * e, Math.min(t, AR.w * e), Math.min(t, AR.h * e)));
  for (const a of R.ground)
    lootMatch(a.it) && ((i.fillStyle = RAR_COL[a.it.r]), i.fillRect(n + a.x * e - 1, o + a.y * e - 1, 2, 2));
  for (const a of R.enemies) {
    if (a.dead) continue;
    const h = a.cls === "boss" ? 3.2 : a.cls === "elite" ? 2.4 : 1.8;
    ((i.fillStyle = a.goldBoss ? "#ffd24a" : a.cls === "boss" ? "#ff4a3a" : SERIES_COL[a.series]),
      i.beginPath(),
      i.arc(n + a.x * e, o + a.y * e, h, 0, 7),
      i.fill());
  }
  if (typeof partyN == "function")
    for (let k = 1; k <= partyN(); k++) {
      const a = pAct(k).h;
      ((i.fillStyle = partyCol[k] || "#9fe8ff"), i.fillRect(n + a.x * e - 1.5, o + a.y * e - 1.5, 3, 3));
    }
  const r = n + H.x * e,
    s = o + H.y * e,
    f = Math.PI / 2 + ((H.dir || 0) * Math.PI) / 4;
  ((i.fillStyle = "#fff"),
    (i.strokeStyle = "#000"),
    i.beginPath(),
    i.moveTo(r + Math.cos(f) * 5, s + Math.sin(f) * 5),
    i.lineTo(r + Math.cos(f + 2.5) * 4, s + Math.sin(f + 2.5) * 4),
    i.lineTo(r + Math.cos(f - 2.5) * 4, s + Math.sin(f - 2.5) * 4),
    i.closePath(),
    i.fill(),
    i.stroke(),
    (i.strokeStyle = "#c8a45a"),
    i.strokeRect(n - 2, o - 2, t + 4, t + 4),
    (i.font = '9px "IBM Plex Mono", monospace'),
    (i.textAlign = "center"),
    (i.fillStyle = "#f3d88a"),
    i.fillText(
      R.dg
        ? R.dg.kind === "wb"
          ? "Boss tuần"
          : R.dg.d.n
        : R.tower
          ? `Tháp · tầng ${R.tower.floor}`
          : zoneOf(Math.min(S.stage, STAGES)).n,
      n + t / 2,
      o + t + 11,
    ),
    i.restore());
}
const onScreen = (i, t, n = 120) => i > CAM.x - n && i < CAM.x + AR.w + n && t > CAM.y - n && t < CAM.y + AR.h + n,
  ST_TINT = { cold: "rgba(255,215,40,0.5)", poison: "rgba(80,215,60,0.45)" },
  ST_STUN = { f: "fx/st_stun.webp", n: 10, w: 54, h: 47, ax: 25, ay: 72, ms: 110 };
let tintCv = null;
function drawTinted(i, t, n, o, e, l) {
  if (!i || S.lowFx || (R.enemies && R.enemies.length > 5)) return l();
  // whole-pixel box: the tinted copy is blitted back 1:1 (no resampling blur)
  ((t = Math.round(t)), (n = Math.round(n)));
  const r = DPR || 1,
    s = Math.ceil(o * r),
    f = Math.ceil(e * r);
  (tintCv || (tintCv = document.createElement("canvas")),
    (tintCv.width < s || tintCv.height < f) &&
      ((tintCv.width = Math.max(tintCv.width, s)), (tintCv.height = Math.max(tintCv.height, f))));
  const a = tintCv.getContext("2d");
  (a.setTransform(1, 0, 0, 1, 0, 0), a.clearRect(0, 0, s, f), a.setTransform(r, 0, 0, r, -t * r, -n * r));
  const h = CX;
  CX = a;
  let u;
  try {
    u = l();
  } finally {
    CX = h;
  }
  return (
    a.setTransform(1, 0, 0, 1, 0, 0),
    (a.globalCompositeOperation = "source-atop"),
    (a.fillStyle = i),
    a.fillRect(0, 0, s, f),
    (a.globalCompositeOperation = "source-over"),
    h.drawImage(tintCv, 0, 0, s, f, t, n, o, e),
    u
  );
}
function drawStun(i, t, n) {
  const o = ST_STUN,
    e = img(o.f);
  if (!e.complete || !e.naturalWidth) return;
  const l = Math.floor(((R.clock || 0) * 1e3) / o.ms) % o.n,
    r = n;
  CX.drawImage(e, l * o.w, 0, o.w, o.h, i - o.ax * r, t - o.h * r * 0.55, o.w * r, o.h * r);
}
const entTint = (i, t) => (i ? ST_TINT.cold : t ? ST_TINT.poison : null);
function drawSprite(i, t, n, o, e, l, r = 1) {
  if (!i || !i.complete || !i.naturalWidth) return !1;
  const s = i.naturalWidth * e,
    f = i.naturalHeight * e,
    a = t && t[2] >= 0 && t[2] <= i.naturalWidth && t[3] >= i.naturalHeight * 0.5 && t[3] <= i.naturalHeight * 1.2,
    h = a ? t[2] * e : s / 2,
    u = a ? t[3] * e : f * 0.95;
  return (
    CX.save(),
    (CX.globalAlpha = r),
    CX.translate(n, o),
    l && CX.scale(-1, 1),
    CX.drawImage(i, -h, -u, s, f),
    CX.restore(),
    !0
  );
}
// 8-way sprite direction of a screen-space vector. JX1 (g_GetDirIndex) works in scene space, where y is twice
// the screen y (2:1 isometric view), so a screen diagonal of 2:1 is the sprites' 45-degree direction.
const dirOf = (i, t) => ((Math.round(Math.atan2(-i, t * 2) / (Math.PI / 4)) % 8) + 8) % 8,
  ONCE = { at: 1, hurt: 1, die: 1 };
function animLen(i, t) {
  const n = W.anim && W.anim[i] && W.anim[i][t];
  return n ? (n.n * n.ms) / 1e3 : 0;
}
function drawAnim(i, t, n, o, e, l, r, s = 1) {
  const f = W.anim && W.anim[i];
  if (!f) return !1;
  const a = f[t] || f.st;
  if (!a) return !1;
  const h = img("img/a/" + a.f + SPR_V);
  if (!h.complete || !h.naturalWidth) return !1;
  let u = Math.floor((o * 1e3) / a.ms);
  u = ONCE[t] ? Math.min(u, a.n - 1) : u % a.n;
  const x = animRow(a, n),
    k = r / (a.sc || 1),
    px = k === 1 ? Math.round(e) : e,
    py = k === 1 ? Math.round(l) : l,
    sm = sprCrisp(CX, k);
  return (
    (CX.globalAlpha = s),
    CX.drawImage(h, u * a.w, x * a.h, a.w, a.h, px - a.ax * k, py - a.ay * k, a.w * k, a.h * k),
    (CX.globalAlpha = 1),
    (CX.imageSmoothingEnabled = sm),
    Math.max(1, a.ay * k)
  );
}
// sheet row of 8-way direction n (JX1 KNpcResVN::Draw: nearest of the sheet's d directions)
const animRow = (a, n) => Math.floor((n * a.d) / 8 + 0.5) % a.d;
// Name / HP bar heights are fixed like JX1 (KNpc::GetNpcPate + PaintInfo), never the current frame's height:
// player pate = 90 (male) / 80 (female), +20 on a horse; the name is drawn at z = pate + font + 1, 10 px up.
const heroPate = () => (S.sex ? 80 : 90) + (R.mounted ? 20 : 0);
const heroLabelLift = () => 10 + Math.round((heroPate() + 13) * 0.866);
// monsters: their stand sheet's anchor height (constant per npc type, like JX1's m_nStature)
function monTop(e, s) {
  const a = W.anim && W.anim[e.animKey],
    st = a && (a.st || a.run);
  return st ? st.ay * MON_SCALE : s;
}
function setAct(i, t) {
  i.act !== t && ((i.act = t), (i.actT = 0));
}
// JX1 (KNpc::DoRun) plays one run frame per RunSpeed scene units travelled: a run cycle always covers
// RunFrame * RunSpeed on the ground, so a faster/slower/vertical move speeds up/slows down the legs instead
// of sliding the feet. Player RunSpeed is 10, monsters use their own `run` (JX1 npc RunSpeed).
const HERO_RUN_STRIDE = 10;
function runStride(i) {
  if (i === H) return HERO_RUN_STRIDE;
  const m = i.tid != null && typeof MON != "undefined" && MON[i.tid];
  return (m && m.run) || 6;
}
function runFrameMs(i) {
  if (i === H && typeof jxOn == "function" && jxOn() && R.jx) return JX_MS.run;
  const a = W.anim && W.anim[i.animKey || (i === H && R.P && R.P.anim)];
  return (a && a.run && a.run.ms) || 85;
}
function stepAct(i, t, n) {
  const dx = i.x - (i._sx ?? i.x),
    dy = i.y - (i._sy ?? i.y);
  ((i._sx = i.x), (i._sy = i.y));
  if (i.act === "run" && t > 0) {
    let d = Math.hypot(dx, dy * 2);
    d > 96 && (d = 0); // teleport / map change
    i.actT = (i.actT || 0) + (d / runStride(i)) * (runFrameMs(i) / 1e3);
  } else i.actT = (i.actT || 0) + t;
  (i.act === "at" || i.act === "hurt") && i.actT >= Math.max(0.25, animLen(i.animKey, i.act)) && setAct(i, n);
}
const NAME_COL = {
    boss: "#ffb070",
    elite: "#8fc6ff",
    normal: "#e8dcc8",
    hero: "#fff3c0",
    pet: "#9fe36a",
    gold: "#ffd24a",
  },
  LABELS = [];
function label(i, t, n, o, e, l, r, s, f, a, ic) {
  LABELS.push({ x: i, y: t, text: n, col: o, size: e, hp: l, barCol: r, sub: s, subCol: f, dot: a, ic });
}
// small framed icon after a label's name + HP bar (disciples: their current main skill)
const LABEL_IC = 16;
function labelIcon(t, n) {
  const im = img(t.ic);
  if (!im.complete || !im.naturalWidth) return;
  const w = Math.max(Math.min(t.w, 56), t.tw || 0),
    x = Math.round(t.x + w / 2 + 4),
    y = Math.round(n - LABEL_IC - (t.hp >= 0 ? 1 : 3));
  ((CX.fillStyle = "#000c"),
    CX.fillRect(x - 1, y - 1, LABEL_IC + 2, LABEL_IC + 2),
    CX.drawImage(im, x, y, LABEL_IC, LABEL_IC),
    (CX.lineWidth = 1),
    (CX.strokeStyle = "#c9a45a"),
    CX.strokeRect(x - 0.5, y - 0.5, LABEL_IC + 1, LABEL_IC + 1),
    (CX.lineWidth = 3),
    (CX.strokeStyle = "#000c"));
}
// icon of the current character's main skill (same as the hotbar #bMain): basic attack or SK[id].ic
function mainSkIcon() {
  const t = R.P && R.P.main;
  if (!t) return "";
  return R.P.basic === t ? "img/s/8.png" : (SK[t.id] && SK[t.id].ic) || "";
}
function flushLabels() {
  if (!LABELS.length) return;
  ((CX.textAlign = "center"), (CX.lineJoin = "round"));
  const i = [];
  for (const t of LABELS.sort((n, o) => o.y - n.y)) {
    ((CX.font = `${t.size}px "IBM Plex Mono", monospace`),
      (t.tw = CX.measureText(t.text).width),
      (t.w = Math.max(t.tw + (t.dot ? 12 : 0), t.sub ? CX.measureText(t.sub).width : 0, 44)),
      (t.h = t.size + 4 + (t.hp >= 0 ? 11 : 0) + (t.sub ? t.size + 2 : 0)));
    let n = t.y;
    const maxL = LABELS.length > 15 ? 2 : 6;
    for (let o = 0; o < maxL; o++) {
      const e = i.find((l) => Math.abs(l.x - t.x) < (l.w + t.w) / 2 && n > l.top && n - t.h < l.y);
      if (!e) break;
      n = e.top - 1;
    }
    ((t.py = n), (t.top = n - t.h), i.push({ x: t.x, w: t.w, y: n, top: t.top }));
  }
  for (const t of LABELS) {
    const n = t.py,
      o = Math.min(t.w, 56);
    (t.hp >= 0 &&
      ((CX.fillStyle = "#000c"),
      CX.fillRect(t.x - o / 2 - 1, n - 6, o + 2, 6),
      (CX.fillStyle = t.barCol),
      CX.fillRect(t.x - o / 2, n - 5, o * clamp(t.hp, 0, 1), 4)),
      (CX.font = `${t.size}px "IBM Plex Mono", monospace`),
      (CX.lineWidth = 3),
      (CX.strokeStyle = "#000c"));
    const e = n - (t.hp >= 0 ? 12 : 1), // name clear of the HP bar (Vietnamese descenders/dots)
      l = t.x + (t.dot ? 6 : 0);
    if ((CX.strokeText(t.text, l, e), (CX.fillStyle = t.col), CX.fillText(t.text, l, e), t.dot)) {
      const r = l - t.tw / 2 - 7,
        s = e - t.size * 0.36;
      (CX.beginPath(),
        CX.arc(r, s, 4, 0, Math.PI * 2),
        (CX.fillStyle = t.dot),
        CX.fill(),
        (CX.lineWidth = 1.5),
        (CX.strokeStyle = "#000d"),
        CX.stroke(),
        (CX.lineWidth = 3),
        (CX.strokeStyle = "#000c"));
    }
    t.ic && labelIcon(t, n);
    if (t.sub) {
      const r = e - t.size - 2;
      const isVlmc = t.sub.includes("VÕ LÂM MINH CHỦ");
      const isRoyal = t.sub.includes("Vô Song Vương Giả");
      const isTop1Btg = t.sub.includes("TOP 1 BTG");
      if (isVlmc) {
        CX.save();
        CX.font = `bold ${t.size}px "IBM Plex Mono", monospace`;
        const tw = CX.measureText(t.sub).width;
        const grad = CX.createLinearGradient(t.x - tw / 2, 0, t.x + tw / 2, 0);
        grad.addColorStop(0, "#ff3300");
        grad.addColorStop(0.25, "#ff7700");
        grad.addColorStop(0.5, "#ffcc44");
        grad.addColorStop(0.75, "#ff5500");
        grad.addColorStop(1, "#ff2200");
        // Hào quang viền kép (tránh shadowBlur vì WebKit/Safari trên iOS bị lỗi hộp chữ nhật đặc màu)
        const pulse = 0.5 + 0.3 * Math.sin(Date.now() / 200);
        CX.lineWidth = 4.5;
        CX.strokeStyle = `rgba(255, 50, 0, ${pulse})`;
        CX.strokeText(t.sub, t.x, r);
        CX.lineWidth = 2.5;
        CX.strokeStyle = "#380000";
        CX.strokeText(t.sub, t.x, r);
        CX.fillStyle = grad;
        CX.fillText(t.sub, t.x, r);
        CX.restore();
      } else if (isTop1Btg) {
        CX.save();
        CX.font = `bold ${t.size}px "IBM Plex Mono", monospace`;
        const tw = CX.measureText(t.sub).width;
        const grad = CX.createLinearGradient(t.x - tw / 2, 0, t.x + tw / 2, 0);
        grad.addColorStop(0, "#ffd700");
        grad.addColorStop(0.25, "#ffffff");
        grad.addColorStop(0.5, "#ffd700");
        grad.addColorStop(0.75, "#ff4500");
        grad.addColorStop(1, "#ffd700");
        const pulse = 0.55 + 0.35 * Math.sin(Date.now() / 200);
        CX.lineWidth = 4.5;
        CX.strokeStyle = `rgba(255, 215, 0, ${pulse})`;
        CX.strokeText(t.sub, t.x, r);
        CX.lineWidth = 2.5;
        CX.strokeStyle = "#380000";
        CX.strokeText(t.sub, t.x, r);
        CX.fillStyle = grad;
        CX.fillText(t.sub, t.x, r);
        CX.restore();
      } else if (isRoyal) {
        CX.save();
        CX.font = `bold ${t.size}px "IBM Plex Mono", monospace`;
        const tw = CX.measureText(t.sub).width;
        const grad = CX.createLinearGradient(t.x - tw / 2, 0, t.x + tw / 2, 0);
        grad.addColorStop(0, "#ffb800");
        grad.addColorStop(0.25, "#ffe875");
        grad.addColorStop(0.5, "#ffffff");
        grad.addColorStop(0.75, "#ff4500");
        grad.addColorStop(1, "#ffb800");
        // Hào quang viền kép (tránh shadowBlur vì WebKit/Safari trên iOS bị lỗi hộp chữ nhật đặc màu)
        const pulse = 0.5 + 0.3 * Math.sin(Date.now() / 250);
        CX.lineWidth = 4.5;
        CX.strokeStyle = `rgba(255, 170, 0, ${pulse})`;
        CX.strokeText(t.sub, t.x, r);
        CX.lineWidth = 2.5;
        CX.strokeStyle = "#2b0500";
        CX.strokeText(t.sub, t.x, r);
        CX.fillStyle = grad;
        CX.fillText(t.sub, t.x, r);
        CX.restore();
      } else {
        ((CX.font = `${t.size - 1}px "IBM Plex Mono", monospace`),
          CX.strokeText(t.sub, t.x, r),
          (CX.fillStyle = t.subCol || t.col),
          CX.fillText(t.sub, t.x, r));
      }
    }
  }
  LABELS.length = 0;
}
const enemyName = (i) => `${i.curse && typeof isCursed == "function" && isCursed(i) ? "☠ " : ""}${i.n} · Lv${i.L}`;
function bar(i, t, n, o, e, l) {
  ((CX.fillStyle = "#000a"), CX.fillRect(i, t, n, o), (CX.fillStyle = l), CX.fillRect(i, t, n * clamp(e, 0, 1), o));
}
// the main character (k = 0) or a disciple swapped in by withChar (js/party.js): same JX1 drawing, name label at
// the fixed JX1 pate height (heroLabelLift / heroStateLift read the swapped-in sex / mount)
function drawHeroEnt(t, i, k) {
  H.shOk || ((t.fillStyle = "#0007"), t.beginPath(), t.ellipse(H.x, H.y, 16, 6, 0, 0, 7), t.fill());
  const a = heroGfx();
  H.animKey = a && a.anim;
  const h = H.x - (H.px ?? H.x),
    u = H.y - (H.py ?? H.y);
  if (
    ((H.px = H.x),
    (H.py = H.y),
    (H.moving = Math.hypot(h, u) > 0.4),
    H.moving && H.act !== "at" && (H.dir = dirOf(h, u)),
    stepAct(H, R.stunT > 0 ? 0 : R.slowT > 0 ? i * ELEM_SLOW : i, H.moving ? "run" : "st"),
    R.deadT > 0 ? setAct(H, "die") : H.act !== "at" && H.act !== "hurt" && setAct(H, H.moving ? "run" : "st"),
    drawAura(t),
    drawHeroStates(t, "under", 0),
    R.dashTrail && a && a.anim)
  )
    for (const p of R.dashTrail)
      drawHeroAnim(a.anim, "run", p.dir || 0, 0, p.x, p.y, HERO_SCALE, 0.45 * (1 - p.t / 0.3));
  const x = entTint(R.slowT > 0, R.hpDotT > 0),
    m =
      a &&
      a.anim &&
      drawTinted(x, H.x - 170, H.y - 215, 340, 340, () =>
        drawHeroAnim(a.anim, H.act || "st", H.dir || 0, H.actT || 0, H.x, H.y, HERO_SCALE),
      );
  (drawHeroStates(t, "over", m ? Math.min(m, 130) : 60), drawLookFx(t, i));
  const M = H.y - heroLabelLift(),
    d = !k && typeof titleWorn == "function" && titleWorn();
  (label(
    H.x,
    M,
    `${S.name || (FAC[S.fac] && FAC[S.fac].n) || ""} · Lv${S.lvl}`,
    typeof ptCol == "function" ? ptCol() : NAME_COL.hero, // màu tổ đội (title.js): main + every disciple
    12,
    R.life / Math.max(1, R.P.life),
    "#4fd04f",
    d ? (d[0] === "admin" ? titleName(d) : `«${titleName(d)}»`) : "",
    d ? (d[0] === "admin" ? "#ffd700" : TIER[d[3]].c) : "",
    void 0,
    k ? mainSkIcon() : "",
  ),
    !m &&
      !(a && drawSprite(img(a.img), a.sz, H.x, H.y, 0.9, H.face < 0, R.deadT > 0 ? 0.35 : 1)) &&
      ((t.fillStyle = SERIES_COL[heroSeries()]), t.beginPath(), t.arc(H.x, H.y - 20, 14, 0, 7), t.fill()),
    R.stunT > 0 && drawStun(H.x, H.y - Math.round(heroPate() * 0.866), ACT_FX_SCALE),
    R.hurtT > 0 && ((t.fillStyle = "#f004"), t.beginPath(), t.arc(H.x, H.y - 24, 20, 0, 7), t.fill()));
}
function draw(i) {
  const t = CX;
  const z = typeof getArenaZoom == "function" ? getArenaZoom() : 1;
  const worldScale = DPR * z;
  (t.setTransform(DPR, 0, 0, DPR, 0, 0),
    t.clearRect(0, 0, AR.cssW || AR.w, AR.cssH || AR.h),
    updateCamera(i),
    t.setTransform(worldScale, 0, 0, worldScale, -Math.round(CAM.x) * worldScale, -Math.round(CAM.y) * worldScale));
  const n = R.bgImg;
  (drawTiledBg(t, n), (t.textAlign = "center"));
  for (const e of R.town ? [] : R.ground) {
    const l = e.it.ic ? img(e.it.ic) : null,
      r = lootMatch(e.it),
      s = R.pickTarget === e,
      f = Math.sin((e.age + e.x) * 3) * 1.5;
    if (
      ((t.fillStyle = "#0008"),
      t.beginPath(),
      t.ellipse(e.x, e.y + 2, 11, 4, 0, 0, 7),
      t.fill(),
      (t.strokeStyle = RAR_COL[e.it.r]),
      (t.lineWidth = s ? 2.5 : r ? 1.6 : 0.8),
      (t.globalAlpha = r || s ? 1 : 0.55),
      t.beginPath(),
      t.ellipse(e.x, e.y + 2, 12, 5, 0, 0, 7),
      t.stroke(),
      l && l.complete && l.naturalWidth)
    ) {
      const a = Math.min(26 / l.naturalWidth, 26 / l.naturalHeight);
      t.drawImage(
        l,
        e.x - (l.naturalWidth * a) / 2,
        e.y - l.naturalHeight * a + f,
        l.naturalWidth * a,
        l.naturalHeight * a,
      );
    }
    ((r || s || e.it.r >= 2) &&
      ((t.font = '9px "IBM Plex Mono", monospace'),
      (t.fillStyle = "#000"),
      t.fillText(e.it.n, e.x + 1, e.y - 27),
      (t.fillStyle = RAR_COL[e.it.r]),
      t.fillText(e.it.n, e.x, e.y - 28)),
      (t.globalAlpha = 1));
  }
  for (const e of R.corpses) {
    e.actT += i;
    const l = clamp(1.6 - e.actT, 0, 1),
      r = 1;
    (e.animKey && drawAnim(e.animKey, "die", e.dir || 0, e.actT, e.x, e.y, r * MON_SCALE, l)) ||
      ((t.globalAlpha = l * 0.5), drawSprite(e.img, e.sz, e.x, e.y, r, e.face < 0), (t.globalAlpha = 1));
  }
  ((R.corpses = R.corpses.filter((e) => e.actT < 1.6)),
    drawMount(t, i),
    typeof partyEach == "function" && partyEach(() => drawMount(t, i), !0),
    typeof drawShadows == "function" && drawShadows(t));
  const o = jxmSort(
    R.enemies
      .filter((e) => !e.dead)
      .concat(
        [{ hero: !0, y: H.y }],
        typeof partyEnts == "function" ? partyEnts() : [],
        typeof othEnts == "function" ? othEnts() : [],
      ),
  );
  for (const e of o) {
    if (e.jo) {
      jxmDrawObj(t, e.jo);
      continue;
    }
    if (e.oth) {
      othDraw(t, e.oth, i);
      continue;
    }
    if (e.hero) {
      drawHeroEnt(t, i, 0);
      continue;
    }
    if (e.disc) {
      withChar(e.disc, () => drawHeroEnt(t, i, e.disc));
      continue;
    }
    if (e.heroLook) {
      if (typeof drawHalo === "function") {
        drawHalo(t, "zw", e.x, e.y, 0.98);
      }
      const csAura = (typeof JXCS_RED != "undefined" && JXCS_RED) || (typeof JXCS != "undefined" && JXCS[5]);
      if (csAura && typeof drawState == "function") {
        drawState(t, csAura, e.x, e.y, 0, (R && R.clock) || 0, (typeof ST_HERO_K != "undefined" ? ST_HERO_K : 1 / 0.6), 0.98);
      }
      t.fillStyle = "#0007";
      t.beginPath();
      t.ellipse(e.x, e.y, 24, 9, 0, 0, 7);
      t.fill();
      stepAct(e, e.stun > 0 ? 0 : e.slowT > 0 ? i * ELEM_SLOW : i, e.moving ? "run" : "st");
      const L = typeof presLook == "function" ? presLook(e.heroLook) : null;
      let h = 0;
      if (L && typeof drawJxHero == "function") {
        h = drawJxHero(e.act || "st", e.dir || 0, e.actT || 0, e.x, e.y, HERO_SCALE * 1.15, e.hitT > 0 ? 0.75 : 1, null, L);
      }
      if (!h) {
        const g = typeof heroGfx == "function" ? heroGfx(e.heroLook.f, e.heroLook.x) : null;
        h = g && g.anim ? drawAnim(g.anim, e.act || "st", e.dir || 0, e.actT || 0, e.x, e.y, HERO_SCALE * 1.15, e.hitT > 0 ? 0.75 : 1) : 0;
      }
      e.hitT > 0 && (e.hitT -= i);
      const topH = h ? Math.min(h, 140) : 110;
      const f = e.y - topH - 8;
      label(
        e.x,
        f,
        `${e.n} · Lv${e.L || 200}`,
        "#ffd700",
        12,
        e.hp / e.max,
        "#ff3030",
        "«BOSS THẾ GIỚI»",
        "#ff2200"
      );
      continue;
    }
    const l = 1;
    (e.shOk || ((t.fillStyle = "#0007"), t.beginPath(), t.ellipse(e.x, e.y, e.r, e.r * 0.38, 0, 0, 7), t.fill()),
      (t.strokeStyle = SERIES_COL[e.series]),
      (t.lineWidth = e.cls === "normal" ? 1.2 : 2.4),
      t.beginPath(),
      t.ellipse(e.x, e.y, e.r, e.r * 0.38, 0, 0, 7),
      t.stroke(),
      (e.animKey = MON[e.tid].anim),
      stepAct(e, e.stun > 0 ? 0 : e.slowT > 0 ? i * ELEM_SLOW : i, e.moving ? "run" : "st"));
    const r = entTint(e.slowT > 0, e.poison > 0),
      s =
        e.animKey &&
        drawTinted(
          r,
          e.x - 170,
          e.y - 240,
          340,
          400,
          () =>
            drawAnim(e.animKey, e.act || "st", e.dir || 0, e.actT || 0, e.x, e.y, l * MON_SCALE, e.hitT > 0 ? 0.75 : 1),
        );
    const sh = s && monTop(e, s);
    (e.curse && drawEnemyCurses(t, e, l * ACT_FX_SCALE),
      e.stFx && drawEnemyState(t, e, sh ? Math.min(sh, 140) : 50, l * ACT_FX_SCALE, i),
      !s &&
        !drawTinted(
          r,
          e.x - 170,
          e.y - 240,
          340,
          400,
          () => drawSprite(e.img, e.sz, e.x, e.y, l, e.face < 0, e.hitT > 0 ? 0.6 : 1),
        ) &&
        ((t.fillStyle = SERIES_COL[e.series]), t.beginPath(), t.arc(e.x, e.y - e.r, e.r, 0, 7), t.fill()),
      e.stun > 0 &&
        drawStun(
          e.x,
          e.y - (sh ? Math.min(sh, 140) * 0.85 : e.img && e.img.naturalHeight ? e.img.naturalHeight : e.r * 2),
          l * ACT_FX_SCALE,
        ),
      e.hitT > 0 && (e.hitT -= i));
    const f = e.y - (sh ? Math.min(sh, 140) * 0.85 : e.img && e.img.naturalHeight ? e.img.naturalHeight * l : e.r * 2) - 8;
    (label(
      e.x,
      f,
      enemyName(e),
      e.goldBoss ? NAME_COL.gold : NAME_COL[e.cls] || NAME_COL.normal,
      e.cls === "boss" ? 12 : 11,
      e.hp / e.max,
      e.cls === "boss" ? "#ff5030" : "#e03a2a",
      void 0,
      void 0,
      SERIES_COL[e.series],
    ),
      e.poison > 0 && ((t.fillStyle = "#8fe34a"), t.fillRect(e.x - 22, f + 5, (44 * e.poison) / 3, 2)));
  }
  typeof jxmDrawAbove == "function" && jxmDrawAbove(t);
  // FX step+draw — chạy 1 lần/frame, NGOÀI entity loop
  const fxList = R.fx;
  R.fx = [];
  const kept = fxList.filter((e) => {
    if (e.k !== "mis" && e.k !== "boom") return true;
    const l = stepFx(e, i);
    return (l && drawFx(e), l);
  });
  R.fx = kept.concat(R.fx);
  if (R.fxQ && R.fxQ.length) {
    for (const e of R.fxQ) R.fx.push(e);
    R.fxQ.length = 0;
  }
  for (const e of R.fx) {
    if (e.k === "mis" || e.k === "boom" || e.k === "jm") continue;
    e.life -= i;
    const l = clamp(e.life / e.max, 0, 1);
    ((t.globalAlpha = l),
      (t.strokeStyle = e.color),
      e.k === "line"
        ? ((t.lineWidth = 3), t.beginPath(), t.moveTo(e.x1, e.y1), t.lineTo(e.x2, e.y2), t.stroke())
        : ((t.lineWidth = e.r ? 3 : 2),
          t.beginPath(),
          t.arc(e.x, e.y - (e.r ? 0 : 10), 8 + (1 - l) * (e.r || 30), 0, 7),
          t.stroke()));
  }
  ((t.globalAlpha = 1), (R.fx = R.fx.filter((e) => (e.k === "mis" || e.k === "boom" || e.k === "jm" ? true : e.life > 0))), (t.textAlign = "center"), flushLabels());
  let curFn = "";
  for (const e of R.txt) {
    e.life -= i;
    e.y -= 32 * i;
    t.globalAlpha = clamp(e.life / 0.5, 0, 1);
    const fn = `${e.size}px "IBM Plex Mono", monospace`;
    if (curFn !== fn) {
      t.font = fn;
      curFn = fn;
    }
    t.fillStyle = "#000";
    t.fillText(e.t, e.x + 1, e.y + 1);
    t.fillStyle = e.color;
    t.fillText(e.t, e.x, e.y);
  }
  ((t.globalAlpha = 1),
    (R.txt = R.txt.filter((e) => e.life > 0)),
    t.setTransform(DPR, 0, 0, DPR, 0, 0),
    typeof drawJoystick == "function" && drawJoystick(t),
    drawMinimap(t),
    drawDgHud(t),
    R.banner &&
      R.banner.t > 0 &&
      ((R.banner.t -= i),
      (t.globalAlpha = clamp(R.banner.t, 0, 1)),
      (t.fillStyle = "#000a"),
      t.fillRect(0, (AR.cssH || AR.h) * 0.36, AR.cssW || AR.w, 54),
      (t.font = '20px "IBM Plex Mono", monospace'),
      (t.fillStyle = "#f3d88a"),
      t.fillText(R.banner.text, (AR.cssW || AR.w) / 2, (AR.cssH || AR.h) * 0.36 + 26),
      (t.font = '12px "IBM Plex Mono", monospace'),
      (t.fillStyle = "#d8ccb4"),
      t.fillText(R.banner.sub, (AR.cssW || AR.w) / 2, (AR.cssH || AR.h) * 0.36 + 44),
      (t.globalAlpha = 1)));
}
