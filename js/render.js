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
  FX_MAX = 60,
  dir16 = (i, t) => ((Math.round(Math.atan2(-i, t) / (Math.PI / 8)) % 16) + 16) % 16;
// native (k:1) cast sheets are JX1 PreCastSpr: drawn at the caster's feet, 38 scene-z higher on a horse
// (KNpcRes special spr)
function castFx(i) {
  const t = i && i.id && JFX.f && JFX.f[i.id],
    n = t && t.pre && JFX.c && JFX.c[t.pre];
  !n ||
    R.quiet ||
    R.fx.length > FX_MAX ||
    R.fx.push({
      k: "boom",
      s: n,
      x: H.x,
      y: n.k ? H.y - (R.mounted ? Math.round((38 * 887) / 1024) : 0) : H.y - 6,
      t: 0,
      life: animDur(n),
      dir: 0,
    });
}
function skillFx(i, t, n) {
  const o = (n.id && JFX.f && JFX.f[n.id]) || {},
    e = n.id && JFX.m[o.c || JFX.s[n.id]];
  if ((castFx(n), o.sub && !R.quiet && String(o.sub.c) !== String(o.c) && subFx(i, t, o.sub), !e || R.quiet)) {
    fxLine(i, t, n);
    return;
  }
  if (R.fx.length > FX_MAX) return;
  const l = i.x,
    r = i.y - 20,
    s = t.x,
    f = t.y - 14,
    a = s - l,
    h = f - r,
    u = Math.hypot(a, h) || 1,
    x = o.form === void 0 ? 1 : o.form,
    m = clamp(n.nMis > 1 ? Math.max(o.num || 1, Math.min(n.nMis, 8)) : o.num || 1, 1, 8),
    M = Math.atan2(h, a),
    d = (c, y, g, w = 0) => R.fx.push({ k: "boom", s: c, x: y, y: g, t: -w, life: animDur(c), dir: dir16(a, h) }),
    p = (c, y, g = 0) =>
      R.fx.push({
        k: "mis",
        s: e.fly,
        hit: e.hit,
        x1: l,
        y1: r,
        x2: c,
        y2: y,
        t: -g,
        life: Math.min(0.6, Math.hypot(c - l, y - r) / e.spd),
        dir: dir16(c - l, y - r),
      }),
    b = e.hit || e.fly,
    A = e.fly && e.fly.d === 1 && e.fly.ay > 150,
    k = (c, y, g = 0) => {
      const w = (e.fly.n * e.fly.ms) / 1e3,
        T = Math.min(0.8, w);
      (R.fx.push({ k: "boom", s: e.fly, x: c, y: y + 14, t: -g, life: T, sp: w / T, dir: 0 }),
        e.hit && d(e.hit, c, y, g + T * 0.8));
    };
  if (A && (x === 6 || x >= 8)) {
    for (let c = 0; c < m; c++) k(s + (m > 1 ? rnd(-40, 40) : 0), f + (m > 1 ? rnd(-26, 26) : 0), c * 0.12);
    return;
  }
  if ((n.melee && !o.meleeFly) || x >= 8) {
    d(b, s, f);
    return;
  }
  if (x === 7) {
    e.fly && e.fly.d === 1 && e.hit ? (d(e.fly, l, r + 8), d(e.hit, s, f, 0.12)) : d(b, l, r + 8);
    return;
  }
  if (x === 6) {
    for (let c = 0; c < m; c++) d(b, s + (m > 1 ? rnd(-36, 36) : 0), f + (m > 1 ? rnd(-24, 24) : 0), c * 0.07);
    return;
  }
  if (!e.fly) {
    d(b, s, f);
    return;
  }
  if (x === 3) {
    for (let c = 0; c < m; c++) {
      const y = M + (c / m) * Math.PI * 2;
      p(l + Math.cos(y) * 130, r + Math.sin(y) * 130);
    }
    return;
  }
  if (x === 2) {
    for (let c = 0; c < m; c++) {
      const y = M + (c - (m - 1) / 2) * 0.26;
      p(l + Math.cos(y) * u, r + Math.sin(y) * u);
    }
    return;
  }
  if (x === 1) {
    for (let c = 0; c < m; c++) p(s, f, c * 0.09);
    return;
  }
  if (x === 0) {
    const c = -h / u,
      y = a / u;
    for (let g = 0; g < m; g++) {
      const w = (g - (m - 1) / 2) * 34;
      p(s + c * w, f + y * w);
    }
    return;
  }
  for (let c = 0; c < m; c++) p(s + rnd(-60, 60), f + rnd(-40, 40), c * 0.05);
}
function subFx(i, t, n) {
  const o = JFX.m[n.c];
  if (!o || R.fx.length > FX_MAX) return;
  const e = clamp(n.n || 1, 1, 8),
    l = t.x,
    r = t.y - 14,
    s = o.hit || o.fly,
    f = 0.18,
    a = (h, u, x, m, M) =>
      o.fly
        ? R.fx.push({
            k: "mis",
            s: o.fly,
            hit: o.hit,
            x1: h,
            y1: u,
            x2: x,
            y2: m,
            t: -M,
            life: Math.min(0.55, Math.hypot(x - h, m - u) / (o.spd || 360)),
            dir: dir16(x - h, m - u),
          })
        : R.fx.push({ k: "boom", s, x, y: m, t: -M, life: animDur(s), dir: 0 });
  if (n.form === 3) {
    const h = Math.random() * Math.PI;
    for (let u = 0; u < e; u++) {
      const x = h + (u / e) * Math.PI * 2;
      a(l, r, l + Math.cos(x) * 110, r + Math.sin(x) * 70, f);
    }
    return;
  }
  if (n.form === 1) {
    for (let h = 0; h < e; h++) a(i.x, i.y - 20, l + rnd(-20, 20), r + rnd(-14, 14), f + h * 0.06);
    return;
  }
  for (let h = 0; h < e; h++)
    R.fx.push({ k: "boom", s, x: l + rnd(-40, 40), y: r + rnd(-26, 26), t: -(f + h * 0.08), life: animDur(s), dir: 0 });
}
function ev2Fx(i, t, n, o, e) {
  if (R.quiet) return;
  const l = (t.id && JFX.f && JFX.f[t.id]) || {},
    r = t.id && (JFX.m[(e && e.fx) || l.ev2c] || JFX.m[l.c || JFX.s[t.id]]),
    s = r && (r.fly && r.fly.d === 1 && !o ? r.fly : r.hit && r.hit.ax >= 0 ? r.hit : r.fly || r.hit);
  if (r && r.nat && s && !o && !(e && e.self)) {
    // JX1 collide-event missile (e.g. 375 -> 387 -> 193): its picture where it was triggered, at the
    // missile height, then its collision picture on the npc
    if (R.fx.length > FX_MAX) return;
    const z = Math.round((r.z || 0) * (887 / 1024)),
      d = s === r.fly ? animDur(s) : 0;
    (R.fx.push({ k: "boom", s, x: i.x, y: i.y - z, t: -0.15, life: animDur(s), dir: 0 }),
      d &&
        r.hit &&
        R.fx.push({ k: "boom", s: r.hit, x: i.x, y: i.y, t: -(0.15 + d * 0.5), life: animDur(r.hit), dir: 0 }));
    return;
  }
  if (!(!s || R.fx.length > FX_MAX)) {
    if (o && r.fly) {
      R.fx.push({
        k: "mis",
        s: r.fly,
        hit: r.hit,
        x1: o.x,
        y1: o.y - 20,
        x2: i.x,
        y2: i.y - 14,
        t: -0.15,
        life: 0.35,
        dir: dir16(i.x - o.x, i.y - o.y),
      });
      return;
    }
    if (e && e.self) {
      R.fx.push({ k: "boom", s, x: i.x, y: i.y, t: -0.1, life: animDur(s), dir: 0 });
      return;
    }
    for (let f = 0; f < 2; f++)
      R.fx.push({
        k: "boom",
        s,
        x: i.x + rnd(-18, 18),
        y: i.y - 14 + rnd(-12, 12),
        t: -(0.18 + f * 0.12),
        life: animDur(s),
        dir: 0,
      });
  }
}
// native JX1 sheets (k:1, fxjx.js) play their whole animation; the old site sheets stop at 1.2 s
const animDur = (i) => Math.min(i.k ? 3 : 1.2, (i.n * i.ms) / 1e3);
function drawFxSprite(i, t, n, o, e, l) {
  const r = img(i.f);
  if (!r || !r.complete || !r.naturalWidth) return !1;
  const s = l ? Math.floor((n * 1e3) / i.ms) % i.n : Math.min(i.n - 1, Math.floor((n * 1e3) / i.ms)),
    f = i.d > 1 ? Math.round((t * i.d) / 16) % i.d : 0,
    k = i.k || FX_SCALE;
  return (CX.drawImage(r, s * i.w, f * i.h, i.w, i.h, o - i.ax * k, e - i.ay * k, i.w * k, i.h * k), !0);
}
function stepFx(i, t) {
  return (
    (i.t += t),
    i.t < 0
      ? !0
      : i.k === "mis" && i.t >= i.life
        ? i.hit
          ? (Object.assign(i, { k: "boom", s: i.hit, x: i.x2, y: i.y2, t: 0, life: animDur(i.hit) }), !0)
          : !1
        : i.t < i.life
  );
}
function drawFx(i) {
  if (i.t < 0) return !1;
  if (i.k === "mis") {
    const t = clamp(i.t / i.life, 0, 1);
    return drawFxSprite(i.s, i.dir, i.t, i.x1 + (i.x2 - i.x1) * t, i.y1 + (i.y2 - i.y1) * t, !0);
  }
  return drawFxSprite(i.s, i.dir, i.t * (i.sp || 1), i.x, i.y, !1);
}
const UI_SCALE_MOBILE = 0.8,
  isMobileUI = () =>
    !(typeof isDesktopLandscape == "function" && isDesktopLandscape()) &&
    !!(window.matchMedia && (window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 700)),
  uiScale = () => (document.body.classList.contains("mob") ? UI_SCALE_MOBILE : 1);
function resizeArena() {
  const i = $("#battle"),
    t = { width: i.offsetWidth, height: i.offsetHeight };
  ((DPR = Math.min(2, window.devicePixelRatio || 1) * uiScale()),
    (CV.width = Math.round(t.width * DPR)),
    (CV.height = Math.round(t.height * DPR)),
    (AR.w = t.width),
    (AR.h = t.height),
    (AR.top = 58),
    (AR.bot = t.height - 12),
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
const MINI = { s: 92, m: 8, top: 62 };
function drawMinimap(i) {
  if (R.town || S.miniMap === !1) return;
  const t = MINI.s,
    n = AR.w - t - MINI.m,
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
      ((CX.font = `${t.size - 1}px "IBM Plex Mono", monospace`),
        CX.strokeText(t.sub, t.x, r),
        (CX.fillStyle = t.subCol || t.col),
        CX.fillText(t.sub, t.x, r));
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
    d ? `«${titleName(d)}»` : "",
    d ? TIER[d[3]].c : "",
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
  (t.setTransform(DPR, 0, 0, DPR, 0, 0),
    t.clearRect(0, 0, AR.w, AR.h),
    updateCamera(i),
    t.setTransform(DPR, 0, 0, DPR, -Math.round(CAM.x) * DPR, -Math.round(CAM.y) * DPR));
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
  if (
    (jxmDrawAbove(t),
    (R.fx = R.fx.filter((e) => {
      if (e.k === "jm") {
        const r = jmStep(e, i);
        return (r && jmDraw(e), r);
      }
      if (e.k !== "mis" && e.k !== "boom") return !0;
      const l = stepFx(e, i);
      return (l && drawFx(e), l);
    })),
    R.fxQ && R.fxQ.length)
  ) {
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
  ((t.globalAlpha = 1), (R.fx = R.fx.filter((e) => e.life > 0)), (t.textAlign = "center"), flushLabels());
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
      t.fillRect(0, AR.h * 0.36, AR.w, 54),
      (t.font = '20px "IBM Plex Mono", monospace'),
      (t.fillStyle = "#f3d88a"),
      t.fillText(R.banner.text, AR.w / 2, AR.h * 0.36 + 26),
      (t.font = '12px "IBM Plex Mono", monospace'),
      (t.fillStyle = "#d8ccb4"),
      t.fillText(R.banner.sub, AR.w / 2, AR.h * 0.36 + 44),
      (t.globalAlpha = 1)));
}
