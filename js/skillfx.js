"use strict";
const JXST = window.JXST || {},
  ST_HIT_T = 2.5,
  ST_K = 0.6;
(JXST[390] && !JXST[76] && (JXST[76] = JXST[390]),
  typeof JFX < "u" &&
    JFX.f &&
    ((!JFX.f[272] || !JFX.f[272].c) && (JFX.f[272] = { form: 8, num: 1, c: (JFX.f[10] || {}).c }),
    (!JFX.f[325] || !JFX.f[325].c) && (JFX.f[325] = { form: 12, num: 1, c: (JFX.f[324] || {}).c })));
function heroStates() {
  if (!S || !S.sk || S.lookFx === !1) return [];
  const s = (o) => typeof skApplies != "function" || (skKind(SK[o]) !== "curse" && skApplies(SK[o]) && !R.buffAssume),
    t = Object.keys(S.sk)
      .map(Number)
      .filter((o) => S.sk[o] > 0 && JXST[o] && SK[o] && !isAttack(SK[o]) && s(o));
  // team auras / buffs received from party members show their state too (party.js)
  if (typeof partyShareIds == "function") for (const o of partyShareIds()) JXST[o] && !t.includes(o) && t.push(o);
  const f = t.join(",");
  if (R.stKey === f) return R.stList;
  const c = t.sort((o, i) => SK[i].req - SK[o].req),
    n = {},
    e = [];
  for (const o of c) {
    const i = JXST[o],
      r = n[i.pos] || [];
    r.length >= 3 || r.includes(i.f) || (r.push(i.f), (n[i.pos] = r), e.push(i));
  }
  return ((R.stKey = f), (R.stList = e), e);
}
let CS_GOLD_CV = null;
function getCsGold(r) {
  if (!r || !r.complete || !r.naturalWidth) return r;
  if (CS_GOLD_CV && CS_GOLD_CV._src === r.src && CS_GOLD_CV.width === r.naturalWidth) {
    return CS_GOLD_CV;
  }
  const cv = document.createElement("canvas");
  cv.width = r.naturalWidth;
  cv.height = r.naturalHeight;
  const ctx = cv.getContext("2d");
  ctx.drawImage(r, 0, 0);
  try {
    const imgData = ctx.getImageData(0, 0, cv.width, cv.height);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 5) continue;
      const lum = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
      const t = lum / 255;
      if (t <= 0.45) {
        const k = t / 0.45;
        d[i] = Math.min(255, Math.round(255 * (0.35 + 0.65 * k)));
        d[i + 1] = Math.min(255, Math.round(55 + 105 * k));
        d[i + 2] = Math.min(255, Math.round(4 + 16 * k));
      } else {
        const k = (t - 0.45) / 0.55;
        d[i] = 255;
        d[i + 1] = Math.min(255, Math.round(160 + 85 * k));
        d[i + 2] = Math.min(255, Math.round(20 + 175 * k));
      }
    }
    ctx.putImageData(imgData, 0, 0);
  } catch (err) {
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(r, 0, 0);
    ctx.globalCompositeOperation = "color";
    ctx.fillStyle = "#ff9500";
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.globalCompositeOperation = "source-atop";
    ctx.drawImage(r, 0, 0);
  }
  cv._src = r.src;
  CS_GOLD_CV = cv;
  return cv;
}
let CS_RED_CV = null;
function getCsRed(r) {
  if (!r || !r.complete || !r.naturalWidth) return r;
  if (CS_RED_CV && CS_RED_CV._src === r.src && CS_RED_CV.width === r.naturalWidth) {
    return CS_RED_CV;
  }
  const cv = document.createElement("canvas");
  cv.width = r.naturalWidth;
  cv.height = r.naturalHeight;
  const ctx = cv.getContext("2d");
  ctx.drawImage(r, 0, 0);
  try {
    const imgData = ctx.getImageData(0, 0, cv.width, cv.height);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 5) continue;
      const lum = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
      const t = lum / 255;
      if (t <= 0.45) {
        const k = t / 0.45;
        d[i] = Math.min(255, Math.round(255 * (0.45 + 0.55 * k)));
        d[i + 1] = Math.min(255, Math.round(15 + 40 * k));
        d[i + 2] = Math.min(255, Math.round(5 + 15 * k));
      } else {
        const k = (t - 0.45) / 0.55;
        d[i] = 255;
        d[i + 1] = Math.min(255, Math.round(55 + 135 * k));
        d[i + 2] = Math.min(255, Math.round(20 + 160 * k));
      }
    }
    ctx.putImageData(imgData, 0, 0);
  } catch (err) {
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(r, 0, 0);
    ctx.globalCompositeOperation = "color";
    ctx.fillStyle = "#ff1e00";
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.globalCompositeOperation = "source-atop";
    ctx.drawImage(r, 0, 0);
  }
  cv._src = r.src;
  CS_RED_CV = cv;
  return cv;
}
function drawState(s, t, f, c, n, e, o, i = 1) {
  let r = img(t.f);
  if (!r || !r.complete || !r.naturalWidth) return;
  if (t.gold) r = getCsGold(r);
  else if (t.red) r = getCsRed(r);
  const u = Math.floor((e * 1e3) / t.ms) % t.n,
    a = c;
  ((o *= ST_K),
    (s.globalAlpha = i),
    s.drawImage(r, u * t.w, 0, t.w, t.h, f - t.ax * o, a - t.ay * o, t.w * o, t.h * o),
    (s.globalAlpha = 1));
}
const JXCS = {
  1: { f: "fx/cs_1.webp", n: 15, w: 122, h: 109, ax: 61, ay: 68, ms: 70, pos: "foot" },
  2: { f: "fx/cs_2.webp", n: 15, w: 121, h: 111, ax: 60, ay: 69, ms: 70, pos: "foot" },
  3: { f: "fx/cs_3.webp", n: 15, w: 125, h: 128, ax: 63, ay: 90, ms: 80, pos: "foot" },
  4: { f: "fx/cs_4.webp", n: 14, w: 113, h: 61, ax: 57, ay: 31, ms: 100, pos: "foot" },
  5: { f: "fx/cs_5.webp", n: 10, w: 262, h: 153, ax: 131, ay: 94, ms: 150, pos: "foot" },
},
JXCS_ROYAL = { f: "fx/cs_5.webp", n: 10, w: 262, h: 153, ax: 131, ay: 94, ms: 150, pos: "foot", gold: true },
JXCS_RED = { f: "fx/cs_5.webp", n: 10, w: 262, h: 153, ax: 131, ay: 94, ms: 150, pos: "foot", red: true };
// JX1 (KNpcRes::Draw) draws a state SPR at the npc's position with its own centre, raised by a FIXED height
// (scene z, drawn as z*887/1024 screen px), never by the current animation frame:
//   head: z 70, +28 on a horse      body: z 0, +38 on a horse      foot: z 0 (ground, under the horse)
// Sheets are drawn at the same native 1:1 scale as the hero.
const ST_HERO_K = 1 / ST_K,
  ST_Z = 887 / 1024,
  ST_ZOFF = { head: [70, 28], body: [0, 38], foot: [0, 0] };
const heroStateLift = (pos) => {
  const z = ST_ZOFF[pos] || ST_ZOFF.body;
  return Math.round((z[0] + (R.mounted ? z[1] : 0)) * ST_Z);
};
function drawHeroStates(s, t, f) {
  const c = R.clock || 0;
  if (t === "under" && S.lookFx !== !1) {
    if (typeof drawActiveHalo === "function" && drawActiveHalo(s, H.x, H.y)) {
      // Đã vẽ vòng sáng JX1 webp đích thực từ s1volam.esport9.com
    } else {
      const tw = typeof titleWorn == "function" && titleWorn();
      if (tw && tw[0] === "vlmc") {
        drawState(s, JXCS_RED, H.x, H.y, f, c, ST_HERO_K, 0.98);
      } else if (tw && tw[0] === "admin") {
        drawState(s, JXCS_ROYAL, H.x, H.y, f, c, ST_HERO_K, 0.98);
      } else if (typeof rebornN == "function") {
        const n = Math.min(5, rebornN());
        n > 0 && JXCS[n] && drawState(s, JXCS[n], H.x, H.y, f, c, ST_HERO_K, 0.95);
      }
    }
  }
  for (const n of heroStates())
    (n.pos === "foot") == (t === "under") &&
      drawState(s, n, H.x, H.y - heroStateLift(n.pos), f, c, ST_HERO_K, n.pos === "foot" ? 0.85 : 0.9);
}
function stateOnHit(s, t) {
  if (!s || !s.id || S.lowFx) return;
  const f = JXST[s.id];
  f && isAttack(SK[s.id]) && ((t.stFx = f), (t.stT = ST_HIT_T));
}
function drawEnemyCurses(s, t, f) {
  if (!t.curse || S.lookFx === !1) return;
  const c = R.clock || 0,
    n = {};
  for (const e in t.curse) {
    if (t.curse[e] <= c) continue;
    const o = JXST[e];
    !o || n[o.pos] || ((n[o.pos] = 1), drawState(s, o, t.x, t.y, 0, c, f, Math.min(0.9, (t.curse[e] - c) / 1.5)));
  }
}
function drawEnemyState(s, t, f, c, n) {
  if (t.stFx) {
    if (((t.stT -= n), t.stT <= 0)) {
      t.stFx = null;
      return;
    }
    drawState(s, t.stFx, t.x, t.y, f, R.clock || 0, c, clamp(t.stT, 0, 1));
  }
}
window.JXCS = JXCS;
window.JXCS_ROYAL = JXCS_ROYAL;
window.JXCS_RED = JXCS_RED;
window.drawState = drawState;
window.ST_HERO_K = ST_HERO_K;
