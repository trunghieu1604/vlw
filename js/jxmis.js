"use strict";
const JM_FPS = 18,
  JM_MAX = 160,
  JM_DIR = (Math.PI * 2) / 64,
  JM_Z = 0.5,
  jmK = (t) => (JFX.k && JFX.k[t]) || null,
  JM_SHADOW = {
    10: 5,
    11: 5,
    32: 5,
    37: 5,
    40: 5,
    41: 5,
    267: 5,
    271: 2,
    318: 5,
    320: 5,
    322: 5,
    323: 5,
    324: 5,
    325: 5,
    368: 5,
    395: 5,
  };
(JFX.f && JFX.f[10] && (JFX.f[10].c = 140), JFX.s && (JFX.s[10] = 140));
const JM_FLY = { 302: { t: 30, mid: 126, n: 4, form: 3 } };
// Missiles generated from the JX1 tables (fxjx.js, tools/jxmap/skillfx.py) carry nat:1 and follow the
// cocos2dx client (KMissle / KMissleRes / KSkillSpecial):
//   - positions are the feet of launcher / target; the missile height is drawn as z*887/1024 px
//     (KScenePlaceC), sheets at native scale (k:1), picture direction from the map-space heading;
//   - MultiShow: each missile picks the A or B picture set at random (flyB; blank = set A has none);
//   - the collision picture (AnimFile4) plays on every npc the missile touches, at the npc's feet;
//     missiles that do not move hit the npcs inside their range on their first frame; ColVanish ends
//     the missile on its first hit; at the end of its life only the vanish picture (AnimFile3) shows.
const JM_ZN = 887 / 1024,
  jmNat = (t) => !!(JFX.m[t] && JFX.m[t].nat);
let JM_OV = null;
const jmAng = (t, a) => Math.atan2(a * 2, t);
function jmGenTime(t, a, n) {
  const s = t ? t[5] : 0,
    l = t ? t[3] : 0,
    u = t ? t[4] : 0;
  switch (l) {
    case 1:
      return s + u;
    case 2:
      return s + a * u;
    case 3:
      return Math.max(0, s + a * u + (Math.random() < 0.5 ? Math.random() * u : (-Math.random() * u) / 2));
    case 4:
      return s + Math.random() * u;
    case 5:
      return n <= 1 ? s : s + Math.abs(a - Math.floor(n / 2)) * u;
  }
  return s;
}
function jmSpawn(t, a, n, s, l, u, i) {
  const f = JFX.m[t];
  const maxM = S.lowFx ? 50 : 100;
  if (!f || R.quiet || R.fx.length > maxM) return null;
  const d = jmK(t) || [f.fly ? 1 : 0, 16, Math.round((f.spd || 360) / 18), 10, 0, 0, 1, 1, 0, 1, 0, 0];
  let [x, y, M, J, g, z, o, m, F, e] = d;
  (f.fly || ((x = 0), (y = 1)),
    JM_OV && (JM_OV.life && (y = JM_OV.life), JM_OV.spd && (M = JM_OV.spd)),
    (y = clamp(y || 12, 1, 72)));
  const r = {
    k: "jm",
    life: 1,
    m: f,
    mid: t,
    kind: x,
    lf: y,
    spd: M || 0,
    x: a,
    y: n,
    z: J * (z ? 1 : 0),
    vz: g / 1024,
    za: z / 1024,
    hz: z ? 0 : J,
    loop: !!o,
    cv: !!m,
    ae: !!F,
    cr: 10 + (e || 1) * 14,
    age: -(u || 0),
    ang: s,
    tgt: l || null,
    hit: !1,
    cx: i && i.cx,
    cy: i && i.cy,
    rad: (i && i.rad) || 0,
    spin: (i && i.spin) || 1,
    sh: (JM_OV && JM_OV.sh) || 0,
    tr: [],
  };
  if (f.nat) {
    r.nat = 1;
    r.fs = f.flyB && Math.random() < 0.5 ? f.flyB : f.fly;
    f.blank && Math.random() < 0.5 && (r.fs = null);
    r.hs = new Set();
    r.dr = (e || 1) * 32;
  }
  return (
    (x === 3 || x === 4) &&
      ((r.cx = r.cx != null ? r.cx : H.x),
      (r.cy = r.cy != null ? r.cy : H.y),
      (r.rad = r.rad || Math.max(30, Math.hypot(a - r.cx, (n - r.cy) * 2)))),
    R.fx.push(r),
    r
  );
}
function jmBoom(t, a, n, v) {
  const s = v ? t.m.van : t.m.hit;
  !s || R.fx.length > 160 || (R.fxQ || (R.fxQ = [])).push({ k: "boom", s, x: a, y: n, t: 0, life: animDur(s), dir: 0 });
}
function jmFrame(t) {
  t.sh && (t.tr.push([t.x, t.y]), t.tr.length > t.sh && t.tr.shift());
  const a = (n, s) => {
    ((t.x += Math.cos(n) * s), (t.y += (Math.sin(n) * s) / 2));
  };
  switch (t.kind) {
    case 1:
    case 7:
    case 8:
    case 100:
      a(t.ang, t.spd);
      break;
    case 5:
      (t.tgt && !t.tgt.dead && Math.floor(t.age) % 8 === 0 && (t.ang = jmAng(t.tgt.x - t.x, t.tgt.y - 14 - t.y)),
        a(t.ang, t.spd));
      break;
    case 2:
      ((t.ang += (Math.random() - 0.5) * 0.9), a(t.ang, t.spd));
      break;
    case 3:
    case 4: {
      ((t.ang += JM_DIR * t.spin), t.kind === 4 && (t.rad += (t.spd + 50) * JM_DIR));
      const n = t.kind === 3 ? H.x : t.cx,
        s = t.kind === 3 ? H.y : t.cy;
      ((t.x = n + Math.cos(t.ang) * t.rad), (t.y = s - 14 + (Math.sin(t.ang) * t.rad) / 2));
      break;
    }
  }
  t.za && ((t.z = Math.max(0, t.z + t.vz)), (t.vz -= t.za));
}
function jmStep(t, a) {
  const n = t.age;
  if (((t.age += a * 18), t.age < 0)) return !0;
  if (OBS.g && t.kind && t.kind !== 3 && t.kind !== 4 && !obsAt(t.x, t.y + 14)) return !1;
  for (let l = Math.max(0, Math.floor(n)) + 1; l <= Math.floor(t.age) && l <= t.lf; l++) jmFrame(t);
  if (t.nat) return jmStepNat(t);
  const s = t.tgt;
  return s &&
    !t.hit &&
    t.kind &&
    !(t.za && t.z > 20) &&
    Math.hypot(t.x - s.x, (t.y - (s.y - 14)) * 2) < t.cr &&
    ((t.hit = !0), jmBoom(t, s.x, s.y - 14), t.cv)
    ? !1
    : t.age >= t.lf
      ? (!t.hit && (t.ae || !t.kind || t.za) && jmBoom(t, t.x, t.y), !1)
      : !0;
}
function jmStepNat(t) {
  // one collision picture per npc and missile (KMissle::CreateSpecialEffect)
  const hit = (e) => (t.hs.has(e) ? !1 : (t.hs.add(e), t.hs.size <= 6 && jmBoom(t, e.x, e.y), t.cv));
  if (!(t.za && t.z > 20) && R.enemies)
    if (t.kind) {
      // moving: whatever it touches on its way (ColVanish: the first one ends it)
      for (const e of R.enemies) if (!e.dead && Math.hypot(t.x - e.x, (t.y - e.y) * 2) < t.cr && hit(e)) return !1;
    } else if (!t.st) {
      // standing (the strikes): the npcs inside its damage range, on its first frame
      t.st = 1;
      for (const e of R.enemies) !e.dead && Math.hypot(t.x - e.x, (t.y - e.y) * 2) < t.dr && hit(e);
    }
  return t.age >= t.lf ? (t.m.van && jmBoom(t, t.x, t.y - (t.z + t.hz) * JM_ZN, 1), !1) : !0;
}
function jmDraw(t) {
  if (t.age < 0) return;
  if (t.nat) return jmDrawNat(t);
  const a = t.m.fly;
  if (!a) return;
  const n = a.n,
    s = Math.max(1, Math.round(a.ms / (1e3 / 18))),
    l = t.loop ? Math.floor(t.age / s) % n : Math.min(n - 1, Math.floor((n * t.age) / t.lf)),
    u = a.d > 1 ? dir16(Math.cos(t.ang), Math.sin(t.ang) / 2) : 0;
  if (t.sh && t.tr.length) {
    const i = CX,
      f = i.globalAlpha;
    (t.tr.forEach((d, x) => {
      ((i.globalAlpha = (f * 0.55 * (x + 1)) / (t.tr.length + 1)),
        drawFxSprite(a, u, ((l + 0.5) * a.ms) / 1e3, d[0], d[1] - (t.z + t.hz) * JM_Z, !1));
    }),
      (i.globalAlpha = f));
  }
  drawFxSprite(a, u, ((l + 0.5) * a.ms) / 1e3, t.x, t.y - (t.z + t.hz) * JM_Z, !1);
}
function jmDrawNat(t) {
  const a = t.fs;
  if (!a) return;
  const n = a.n,
    s = Math.max(1, Math.round(a.ms / (1e3 / 18))),
    l = t.loop ? Math.floor(t.age / s) % n : Math.floor((n * t.age) / t.lf);
  if (l > n - 1) return;
  // KMissleRes::Draw: picture direction = the 64-direction heading in map space
  const u = a.d > 1 ? dir16(Math.cos(t.ang), Math.sin(t.ang)) : 0;
  drawFxSprite(a, u, ((l + 0.5) * a.ms) / 1e3, t.x, t.y - (t.z + t.hz) * JM_ZN, !1);
}
function jmCast(t, a, n, s, l, u, i) {
  const N = jmNat(t),
    f = l.x,
    d = N ? l.y : l.y - 20,
    x = u.x,
    y = N ? u.y : u.y - 14,
    M = jmAng(x - f, y - d),
    J = s ? s[1] : 0,
    g = s ? s[2] : 0,
    z = jmK(t),
    o = z ? z[0] !== 0 : !!(JFX.m[t] || {}).fly,
    m = (e) => jmGenTime(s, e, n),
    F = (e, r, c, h) => [e + Math.cos(c) * h, r + (Math.sin(c) * h) / 2];
  if (a === 8 && o) {
    for (let e = 0; e < n; e++) jmSpawn(t, f, d, M, i, e * Math.max(3, J || 4), null);
    return;
  }
  if (a >= 8) {
    for (let e = 0; e < n; e++)
      jmSpawn(t, x + (n > 1 ? rnd(-14, 14) : 0), y + (n > 1 ? rnd(-8, 8) : 0), M, i, e * Math.max(3, J || 4), null);
    return;
  }
  switch (a) {
    case 0: {
      const e = J || 32,
        r = M + Math.PI / 2,
        [c, h] = o ? [f, d] : [x, y];
      for (let _ = 0; _ < n; _++) {
        const p = (_ - (n - 1) / 2) * e,
          [X, v] = F(c, h, r, p);
        jmSpawn(t, X, v, g ? M : r, i, m(_));
      }
      return;
    }
    case 1: {
      // KSkill::CastLine: Param1 = spacing (0 = all from the launcher), along the heading from the 1st step
      const e = N ? J : J || 24;
      for (let r = 0; r < n; r++) {
        let c, h;
        if (g) {
          const _ = r % 2 ? 1 : -1,
            p = Math.ceil(r / 2);
          [c, h] = F(f, d, M + Math.PI / 2, _ * p * e);
        } else [c, h] = F(f, d, M, e * (N ? r + 1 : r));
        jmSpawn(t, c, h, M, i, m(r));
      }
      return;
    }
    case 2: {
      const e = (J || 2) * JM_DIR,
        [r, c] = F(f, d, M, g || 0);
      for (let h = 0; h < n; h++) jmSpawn(t, r, c, M + (h - Math.floor(n / 2)) * e, i, m(h));
      return;
    }
    case 3: {
      for (let e = 0; e < n; e++) {
        const r = M + (e * Math.PI * 2) / n,
          [c, h] = F(f, d, r, g || 20);
        jmSpawn(t, c, h, r, null, m(e), { cx: f, cy: d + 14 });
      }
      return;
    }
    case 4:
      for (let e = 0; e < n; e++)
        jmSpawn(t, x + (n > 1 ? rnd(-50, 50) : 0), y + (n > 1 ? rnd(-26, 26) : 0), M, i, m(e) + (s ? 0 : e * 2));
      return;
    default: {
      const [e, r] = a === 7 ? [f, N ? d : d + 20] : [x, y],
        c = Math.min(n, 6),
        h = [];
      for (let p = 0; p < c; p++)
        for (let X = 0; X < c; X++)
          (J === 1 && c > 2 && (p - (c - 1) / 2) ** 2 + (X - (c - 1) / 2) ** 2 > (c * c) / 4) ||
            h.push([p * c + X, e + (X - (c - 1) / 2) * 32, r + (p - (c - 1) / 2) * 16]);
      const _ = h.length > 20 ? h.sort(() => Math.random() - 0.5).slice(0, 20) : h;
      for (const [p, X, v] of _) jmSpawn(t, X + (c > 1 ? rnd(-6, 6) : 0), v + (c > 1 ? rnd(-4, 4) : 0), M, i, m(p));
    }
  }
}
function skillFx(t, a, n) {
  let s = (n.id && JFX.f && JFX.f[n.id]) || {},
    l = JFX.g && JFX.g[n.id];
  const u = SK[n.id],
    i = u && u.child,
    f = i && JFX.g && JFX.g[i];
  let d = !1;
  l &&
    l[0] === 12 &&
    f &&
    JFX.f[i] &&
    JFX.f[i].c &&
    ((s = Object.assign({}, JFX.f[i], { pre: s.pre })), (l = f), (d = !0));
  const x = s.c || JFX.s[n.id],
    y = n.id && JFX.m[x];
  if ((castFx(n), !y || R.quiet)) {
    fxLine(t, a, n);
    return;
  }
  const isDisc = typeof PCTX !== "undefined" && PCTX > 0,
    maxJ = isDisc ? (S.lowFx ? 3 : 6) : (S.lowFx ? 4 : 16),
    M = l ? l[0] : s.form === void 0 ? 1 : s.form,
    J = clamp(!d && n.nMis > 1 ? Math.min(n.nMis, maxJ) : (l && l[6]) || s.num || 1, 1, maxJ),
    g = SK[n.id],
    z = n.L || 1,
    o = (e) => (g && g.attr && g.attr[e] ? (skVal(g, e, z) || [0])[0] : 0);
  JM_OV = window.NO_JMOV
    ? null
    : M === 8 || JM_FLY[n.id]
      ? { life: o("missle_lifetime_v"), spd: o("missle_speed_v"), sh: JM_SHADOW[n.id] || 0 }
      : { sh: JM_SHADOW[n.id] || 0 };
  const m = JM_FLY[n.id],
    F = JM_OV && JM_OV.life;
  try {
    jmCast(x, M, S.lowFx ? Math.min(J, 3) : J, l, t, a, a);
    // JX1 StartEvent: a second skill cast by the launcher at the same moment (e.g. 172 -> 399)
    const st = s.start;
    st && JFX.m[st.c] && jmCast(st.c, st.g[0], S.lowFx ? Math.min(st.g[6], 3) : st.g[6], st.g, t, a, a);
  } finally {
    JM_OV = null;
  }
  if (m && F >= m.t) {
    const e = { x: a.x, y: a.y + 6 };
    for (let r = m.t; r <= F; r += m.t)
      setTimeout(
        () => {
          R.quiet || jmCast(m.mid, m.form, m.n, null, e, a, null);
        },
        (r / 18) * 1e3,
      );
  }
  s.sub &&
    String(s.sub.c) !== String(x) &&
    setTimeout(() => {
      R.quiet ||
        jmCast(s.sub.c, s.sub.form === 3 ? 3 : 4, clamp(s.sub.n || 1, 1, 8), null, { x: a.x, y: a.y + 6 }, a, null);
    }, 250);
}

// Buff / curse cast (js/skillsys.js) for skills whose missile comes from the JX1 tables: the cast
// picture (PreCastSpr) on the caster and the missile's collision picture on the target.
function jmSupFx(id, tgt, pre) {
  const f = JFX.f && JFX.f[id],
    m = f && JFX.m[f.c];
  if (!m || !m.nat || R.quiet || S.lowFx) return;
  pre && castFx({ id });
  const s = m.hit || m.van;
  tgt && s && R.fx.length < 160 && R.fx.push({ k: "boom", s, x: tgt.x, y: tgt.y, t: -0.1, life: animDur(s), dir: 0 });
}
