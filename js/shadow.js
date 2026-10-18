"use strict";
// JX1-style actor shadows.
// JX1 never draws a blob: every NPC/player has a separate pre-rendered shadow SPR drawn first
// (z-order 0, under the body parts) with the same frame/direction as the body:
//   players  -> settings\npcres\主角动作阴影对应表.txt : {ma,fm}_yy_999_<act>.spr (KNpcResNode.cpp)
//   monsters -> <body spr>b.spr (KNpcResNode::GetShadowName), drawn by KgameWorld::DrawPrimitives
// Those sprites are extracted by tools/jxmap/shadows.py into img/sh/** + shadata.js (window.JXSHADOW).
// Monsters whose JX1 sprites have the shadow baked into the body (most bosses) get no extra shadow.
// Sheets without a JX1 shadow (pl_* composites, a few missing actions) fall back to a cached
// black silhouette of the frame, flattened and skewed the same way as the JX1 shadow sprites.
let SHD = window.JXSHADOW || null;
if (!SHD && typeof document < "u") {
  const n = document.createElement("script");
  ((n.src = "shadata.js?v=" + ((document.querySelector('script[src*="js/core.js"]') || {}).src || "").split("v=")[1]),
    (n.onload = () => (SHD = window.JXSHADOW || null)),
    document.head.appendChild(n));
}
const SH_SIL = { a: 0.42, flat: 0.34, shear: 0.62 },
  SH_SILCV = new Map();
const shReady = (i) => i && i.complete && i.naturalWidth;
// black silhouette of a whole sheet, built once per sheet (no getImageData)
function shSilhouette(im) {
  let c = SH_SILCV.get(im.src);
  if (c) return c;
  c = document.createElement("canvas");
  ((c.width = im.naturalWidth), (c.height = im.naturalHeight));
  const g = c.getContext("2d");
  (g.drawImage(im, 0, 0),
    (g.globalCompositeOperation = "source-in"),
    (g.fillStyle = "#000"),
    g.fillRect(0, 0, c.width, c.height));
  return (SH_SILCV.size > 60 && SH_SILCV.clear(), SH_SILCV.set(im.src, c), c);
}
// silhouette cell (sx,sy,w,h) whose foot anchor is (ax,ay) in the cell, drawn at x,y with scale r
function shDrawSil(c, im, sx, sy, w, h, ax, ay, x, y, r, al) {
  if (!shReady(im)) return !1;
  const k = shSilhouette(im);
  return (
    c.save(),
    (c.globalAlpha = SH_SIL.a * al),
    c.transform(1, 0, -SH_SIL.shear, SH_SIL.flat, x, y),
    c.drawImage(k, sx, sy, w, h, -ax * r, -ay * r, w * r, h * r),
    c.restore(),
    !0
  );
}
// JX1 sprite with the shadow painted into the body (no <spr>b.spr for any action, e.g. bosses)
const SH_BAKED = new Map();
function shBaked(key, f) {
  let v = SH_BAKED.get(key);
  return (
    v === void 0 &&
      ((v = !key.startsWith("pl_") && !Object.keys(f).some((s) => SHD.a[f[s].f.slice(0, -5)])), SH_BAKED.set(key, v)),
    v
  );
}
// monster / pl_* sheets from W.anim (same frame & direction choice as drawAnim)
function shAnim(c, key, act, dir, t, x, y, r, al = 1) {
  const f = W.anim && W.anim[key];
  if (!f) return !1;
  const a = f[act] || f.st;
  if (!a) return !1;
  let u = Math.floor((t * 1e3) / a.ms);
  u = ONCE[act] ? Math.min(u, a.n - 1) : u % a.n;
  const row = animRow(a, dir),
    id = a.f.slice(0, -5),
    m = SHD && SHD.a[id];
  if (m) {
    const im = img("img/sh/a/" + id + ".webp" + SPR_V);
    if (!shReady(im)) return !1;
    const [w, h, ax, ay, n, d] = m,
      fi = Math.min(n - 1, Math.floor((u * n) / a.n)),
      ri = Math.floor(((dir % 8) * d) / 8 + 0.5) % d,
      px = r === 1 ? Math.round(x) : x,
      py = r === 1 ? Math.round(y) : y;
    return (
      (c.globalAlpha = al),
      c.drawImage(im, fi * w, ri * h, w, h, px - ax * r, py - ay * r, w * r, h * r),
      (c.globalAlpha = 1),
      !0
    );
  }
  // JX1 had the shadow baked into these body sprites (bosses etc.): nothing extra to draw
  if (SHD && shBaked(key, f)) return !0;
  return shDrawSil(c, img("img/a/" + a.f + SPR_V), u * a.w, row * a.h, a.w, a.h, a.ax, a.ay, x, y, r / (a.sc || 1), al);
}
// hero drawn from JXLOOK layered parts: use the JX1 per-action player shadow (ma/fm_yy_999_<act>)
// lk: an explicit look (other players in a shared town, js/presence.js) instead of the current R.jx
function shJxHero(c, act, dir, t, x, y, s, O, lk) {
  const u = lk || R.jx;
  if (!u || !SHD || typeof JXL > "u" || !JXL) return !1;
  const J = !lk && act === "at" && jxCastMg() && u.asc.mg,
    g = u.asc[J ? "mg" : act] || u.asc.st;
  if (!g) return !1;
  const L = JXL.tabs[u.sx] || {};
  let p = null,
    nm = "";
  for (const part of ["躯体", "马中", "头部", "左手", "右手"]) {
    const row = u.rows[JX_GROUP[part]],
      l = row >= 0 && ((L[part] || {})[row] || {})[g],
      sh = l && JXL.sheets[jxSheetKey(u.sx, l)];
    if (sh) {
      ((p = sh), (nm = l));
      break;
    }
  }
  if (!p) return !1;
  const m = (SHD.jx[u.sx] || {})[nm.slice(nm.lastIndexOf("_") + 1)];
  if (!m) return !1;
  const im = img("img/sh/jx/" + u.sx + "/" + nm.slice(nm.lastIndexOf("_") + 1) + ".webp" + SPR_V);
  if (!shReady(im)) return !1;
  const d = p[4];
  let w;
  if (act === "st" || act === "run") w = Math.floor((t * 1e3) / (JX_MS[act] || 55)) % d;
  else {
    const i = (typeof animLen == "function" && animLen(O, act)) || d * 0.05;
    w = Math.min(d - 1, Math.floor(clamp(t / Math.max(0.1, i), 0, 0.999) * d));
  }
  const [sw, shh, ox, oy, n, nd] = m,
    fi = Math.min(n - 1, Math.floor((w * n) / d)),
    ri = Math.floor(((dir % 8) * nd) / 8 + 0.5) % nd,
    k = s / (JXL.sc || 1);
  return (
    c.drawImage(
      im,
      fi * sw,
      ri * shh,
      sw,
      shh,
      (k === 1 ? Math.round(x) : x) + (ox - JXL.foot[0]) * k,
      (k === 1 ? Math.round(y) : y) + (oy - JXL.foot[1]) * k,
      sw * k,
      shh * k,
    ),
    !0
  );
}
function shHero(c) {
  const a = typeof heroGfx == "function" && heroGfx(),
    act = R.deadT > 0 ? "die" : H.act || "st";
  if (
    typeof jxOn == "function" &&
    jxOn() &&
    R.jx &&
    shJxHero(c, act, H.dir || 0, H.actT || 0, H.x, H.y, HERO_SCALE, a && a.anim)
  )
    return !0;
  return !!(a && a.anim && shAnim(c, a.anim, act, H.dir || 0, H.actT || 0, H.x, H.y, HERO_SCALE));
}
// one pass for every actor, drawn after ground/loot and before the depth-sorted actors & map objects,
// so shadows sit on the ground but under every body, tree and house.
function drawShadows(c) {
  if (S.shadow === !1) return;
  const ok = (x, y) => typeof onScreen != "function" || onScreen(x, y, 160);
  for (const e of R.corpses)
    e.animKey &&
      ok(e.x, e.y) &&
      shAnim(c, e.animKey, "die", e.dir || 0, e.actT || 0, e.x, e.y, MON_SCALE, clamp(1.6 - e.actT, 0, 1));
  for (const e of R.enemies)
    !e.dead &&
      ok(e.x, e.y) &&
      (e.heroLook
        ? (e.shOk = true)
        : MON[e.tid] && (e.shOk = !!shAnim(c, MON[e.tid].anim, e.act || "st", e.dir || 0, e.actT || 0, e.x, e.y, MON_SCALE)));
  H.shOk = shHero(c);
  typeof partyEach == "function" && partyEach(() => (H.shOk = shHero(c)), !0);
  typeof othShadows == "function" && othShadows(c); // other players in a shared town (js/presence.js)
}
