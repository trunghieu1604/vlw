"use strict";
const OBS = { g: null, key: null, ver: 0 },
  OBS_DEFAULT_WORLD = 3072;
// map/<id>/meta.js arrived: if that map is still the active one, rebuild it in full-map space
function obsJmapReady() {
  const id = String(OBS.key === "town" ? W.town.id : OBS.key);
  window.JMAP && JMAP[id] && !(OBS.g && OBS.g.jm) && typeof jxmReload == "function" && jxmReload();
}
function obsLoad(t) {
  // Full JX1 map (map/<id>/meta.js, see docs/map-format.md) when loaded, else the old 7x7 JMO crop.
  const id = String(t === "town" ? W.town.id : t),
    jm = !window.NO_OBS && typeof jxmGet == "function" ? jxmGet(id, obsJmapReady) : null,
    e = window.NO_OBS ? null : jm || (window.JMO && window.JMO[id]),
    dl = typeof jxmSetMap == "function" ? jxmSetMap(jm) : [0, 0];
  if (((OBS.key = t), (OBS.g = null), !e))
    return ((WORLD.w = WORLD.h = OBS_DEFAULT_WORLD), typeof jxmShift == "function" && jxmShift(dl[0], dl[1]), !1);
  const n = atob(e.obs),
    s = new Uint8Array(n.length);
  for (let r = 0; r < n.length; r++) s[r] = n.charCodeAt(r);
  const l = e.gw * e.gh,
    c = new Uint8Array(l);
  for (let r = 0; r < l; r++) c[r] = r >> 3 < s.length && (s[r >> 3] >> (r & 7)) & 1 ? 0 : 1;
  if (jm && jm.tmask) {
    // cells of regions without a ground tile are void
    const cx = 512 / e.cw,
      cy = 512 / e.ch;
    for (let r = 0; r < l; r++)
      c[r] && !jm.tmask[((((r / e.gw) | 0) / cy) | 0) * jm.rw + (((r % e.gw) / cx) | 0)] && (c[r] = 0);
  }
  const o = new Int32Array(l).fill(-1),
    h = new Int32Array(l);
  let p = 0;
  const a = [];
  for (let r = 0; r < l; r++) {
    if (!c[r] || o[r] >= 0) continue;
    let x = 0,
      b = 0;
    for (h[b++] = r, o[r] = p; x < b;) {
      const g = h[x++],
        O = g % e.gw,
        w = (g / e.gw) | 0;
      for (let d = -1; d <= 1; d++)
        for (let f = -1; f <= 1; f++) {
          if (!f && !d) continue;
          const i = O + f,
            M = w + d;
          if (i < 0 || M < 0 || i >= e.gw || M >= e.gh) continue;
          const k = M * e.gw + i;
          !c[k] || o[k] >= 0 || (f && d && (!c[w * e.gw + i] || !c[M * e.gw + O])) || ((o[k] = p), (h[b++] = k));
        }
    }
    (a.push(b), p++);
  }
  // Component weight: cells inside the old crop on full maps (keeps the same playable area / dungeon
  // islands as before), plain size otherwise. Only the heaviest component is walkable, so every
  // walkable cell (spawns, snaps) is reachable from the hero.
  const wt = a.slice(),
    cr = jm && jm.crop && typeof jxmFieldRect == "function" ? jxmFieldRect() : null;
  if (cr) {
    wt.fill(0);
    const c0 = Math.max(0, Math.floor(cr.x / e.cw)),
      c1 = Math.min(e.gw, Math.ceil((cr.x + cr.w) / e.cw)),
      r0 = Math.max(0, Math.floor(cr.y / e.ch)),
      r1 = Math.min(e.gh, Math.ceil((cr.y + cr.h) / e.ch));
    for (let y = r0; y < r1; y++) for (let x = c0; x < c1; x++) o[y * e.gw + x] >= 0 && wt[o[y * e.gw + x]]++;
  }
  let u = -1,
    y = 0;
  for (let r = 0; r < wt.length; r++) (wt[r] > y || (wt[r] === y && u >= 0 && a[r] > a[u])) && ((y = wt[r]), (u = r));
  for (let r = 0; r < l; r++) c[r] = o[r] === u ? 1 : 0;
  if (
    ((OBS.g = {
      gw: e.gw,
      gh: e.gh,
      cw: e.cw,
      ch: e.ch,
      w: e.w,
      h: e.h,
      jm: !!jm,
      ok: c,
      free: u >= 0 ? a[u] : 0,
      comp: o,
      sz: a, // cells per component (jxmLandComp skips the 1-cell fragments along cliff edges)
      isl: wt
        .map((r, x) => [x, r])
        .filter((r) => r[1] >= Math.max(300, y * 0.25))
        .sort((r, x) => x[1] - r[1])
        .map((r) => r[0]),
    }),
    (WORLD.w = e.w),
    (WORLD.h = e.h),
    typeof jxmShift == "function" && jxmShift(dl[0], dl[1]),
    // the landing point's area (js/jxmap.js) before anything is snapped onto the walkable cells
    typeof jxmLandComp == "function" && jxmLandComp(),
    typeof R < "u" && R.ground)
  )
    for (const r of R.ground) [r.x, r.y] = inWorld(r.x, r.y);
  return !0;
}
function obsIsland(t) {
  const e = OBS.g;
  if (!e || !e.isl || e.isl.length < 2) return !1;
  const n = e.isl[((t % e.isl.length) + e.isl.length) % e.isl.length];
  let s = 0,
    l = 0,
    c = 0;
  for (let o = 0; o < e.ok.length; o++)
    ((e.ok[o] = e.comp[o] === n ? 1 : 0), e.ok[o] && ((s += o % e.gw), (l += (o / e.gw) | 0), c++));
  return (
    (e.free = c),
    (OBS.ver = (OBS.ver || 0) + 1), // invalidates planned paths (navGo)
    typeof FIELD < "u" && ((FIELD.cell = -1), (FIELD.g = null)),
    obsSnap((s / c + 0.5) * e.cw, (l / c + 0.5) * e.ch)
  );
}
const obsCell = (t, e) => {
  const n = OBS.g;
  return [Math.floor(t / n.cw), Math.floor(e / n.ch)];
};
function obsAt(t, e) {
  const n = OBS.g;
  if (!n) return !0;
  const s = Math.floor(t / n.cw),
    l = Math.floor(e / n.ch);
  return s >= 0 && l >= 0 && s < n.gw && l < n.gh && n.ok[l * n.gw + s] === 1;
}
const OBS_R = 9,
  obsWalk = (t, e) => obsAt(t, e) && obsAt(t - OBS_R, e) && obsAt(t + OBS_R, e);
function obsSnap(t, e) {
  const n = OBS.g;
  if (!n || obsWalk(t, e)) return [t, e];
  const [s, l] = obsCell(clamp(t, 0, n.w - 1), clamp(e, 0, n.h - 1)),
    R2 = Math.max(n.gw, n.gh);
  let o = 1e18,
    h = null;
  const tr = (y, u) => {
    const p = (s + y + 0.5) * n.cw,
      a = (l + u + 0.5) * n.ch;
    if (s + y < 0 || l + u < 0 || s + y >= n.gw || l + u >= n.gh || !obsWalk(p, a)) return;
    const r = (p - t) ** 2 + (a - e) ** 2;
    r < o && ((o = r), (h = [p, a]));
  };
  // walk ring perimeters only; cells are 2:1 so keep going until the ring is farther than the best hit
  for (let c = 1; c < R2; c++) {
    for (let y = -c; y <= c; y++) (tr(y, -c), tr(y, c));
    for (let u = -c + 1; u < c; u++) (tr(-c, u), tr(c, u));
    if (h && (c * n.ch) ** 2 > o) return h;
  }
  return h || [n.w / 2, n.h / 2];
}
// Wall normal at (x, y): distance-weighted sum of directions from nearby blocked cells to the point.
// Averaging over a 5x9-cell window turns the stair-stepped JX1 grid into the wall's real slope.
function obsNormal(x, y) {
  const g = OBS.g,
    cx = Math.floor(x / g.cw),
    cy = Math.floor(y / g.ch);
  let nx = 0,
    ny = 0;
  for (let j = -4; j <= 4; j++)
    for (let i = -2; i <= 2; i++) {
      const u = cx + i,
        v = cy + j;
      if (u >= 0 && v >= 0 && u < g.gw && v < g.gh && g.ok[v * g.gw + u]) continue;
      const dx = x - (u + 0.5) * g.cw,
        dy = y - (v + 0.5) * g.ch,
        d2 = dx * dx + dy * dy + 1;
      ((nx += dx / d2), (ny += dy / d2));
    }
  const l = Math.hypot(nx, ny);
  return l > 1e-9 ? [nx / l, ny / l] : null;
}
// Move t towards (e, n). Blocked: try the dominant axis, then slide along the wall tangent (from
// obsNormal, nudged off the wall), then rotated directions. Returns whether t moved.
const OBS_SLIDE = [0.5, -0.5, 1.05, -1.05];
function obsMove(t, e, n) {
  if (!OBS.g || obsWalk(e, n)) return ((t.x = e), (t.y = n), !0);
  const x = e - t.x,
    y = n - t.y;
  if (Math.abs(x) >= Math.abs(y)) {
    if (x && obsWalk(e, t.y)) return ((t.x = e), !0);
    if (y && obsWalk(t.x, n)) return ((t.y = n), !0);
  } else {
    if (y && obsWalk(t.x, n)) return ((t.y = n), !0);
    if (x && obsWalk(e, t.y)) return ((t.x = e), !0);
  }
  const L = Math.hypot(x, y);
  if (!L) return !1;
  const N = obsNormal(e, n);
  if (N) {
    // tangent component of the wanted move; stop when pushing (almost) straight into the wall
    const p = (-x * N[1] + y * N[0]) / L;
    if (Math.abs(p) > 0.2) {
      const sg = Math.sign(p),
        tx = -N[1] * sg,
        ty = N[0] * sg,
        v = L * Math.max(Math.abs(p), 0.5);
      // along the tangent, nudged off the wall, then its axis parts (grid steps are axis aligned)
      for (const [ax, ay] of [
        [tx, ty],
        [tx + N[0] * 0.4, ty + N[1] * 0.4],
        [tx, 0],
        [0, ty],
      ]) {
        const px = t.x + ax * v,
          py = t.y + ay * v;
        if ((ax || ay) && obsWalk(px, py)) return ((t.x = px), (t.y = py), !0);
      }
    }
  }
  // prefer the side the actor slid to last time so it does not jitter between the two
  const sd = t._sd || 1;
  for (const a0 of OBS_SLIDE) {
    const a = a0 * sd,
      c = Math.cos(a),
      si = Math.sin(a),
      px = t.x + (x * c - y * si) * c,
      py = t.y + (x * si + y * c) * c;
    if (obsWalk(px, py)) return ((t.x = px), (t.y = py), (t._sd = Math.sign(a) || 1), !0);
  }
  return !1;
}
function obsSee(t, e, n, s) {
  if (!OBS.g) return !0;
  const l = Math.hypot(n - t, s - e),
    c = Math.ceil(l / 10);
  for (let o = 1; o < c; o++) {
    const h = o / c;
    if (!obsAt(t + (n - t) * h, e + (s - e) * h)) return !1;
  }
  return !0;
}
// ---- Navigation --------------------------------------------------------------------------------
// JX1 works in scene units: an obstacle cell is 32x32 scene = 32x16 screen px, and an actor moving at speed v
// covers v scene units per frame in any direction (KNpc::ServeMove), i.e. only half of that on screen when
// it walks straight up or down. navGo() does the same: `s` is the ground step (screen px for a horizontal move).
// Paths: A* on the obstacle grid (square cells in scene space, 8 neighbours, no corner cutting), bounded node
// count, typed arrays + binary heap, then string-pulled with the actors' own walkability test (obsWalk).
const isoK = (dx, dy) => {
    const l = Math.hypot(dx, dy);
    return l > 1e-9 ? l / Math.hypot(dx, dy * 2) : 1;
  },
  NAV = {
    g: null,
    gc: null,
    st: null,
    pd: null,
    gen: 0,
    hn: new Int32Array(4096),
    hk: new Float64Array(4096),
    used: 0,
    frame: 0,
  },
  NAV_DX = [1, -1, 0, 0, 1, -1, 1, -1],
  NAV_DY = [0, 0, 1, -1, 1, 1, -1, -1],
  NAV_HERO_NODES = 60000, // one hero search (Biện Kinh is 1168x1632 cells); longer trips continue from a partial path
  NAV_MOB_NODES = 2500, // one monster search (chase/leash distances are a few dozen cells)
  NAV_FRAME_NODES = 15000, // monster searches per tick
  NAV_SEG_MAX = 900; // longest straight segment kept by the string pulling
// Straight segment test with the actors' footprint (obsWalk), 3 px samples.
function navSeg(ax, ay, bx, by) {
  if (!OBS.g) return !0;
  const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 3);
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    if (!obsWalk(ax + (bx - ax) * t, ay + (by - ay) * t)) return !1;
  }
  return !0;
}
// A* from cell s to cell t (indices). Returns the cell chain start..end; .partial when the node cap was hit
// (or t is unreachable) and the chain ends at the explored cell closest to t.
function navSearch(s, t, maxN, w) {
  const g = OBS.g,
    gw = g.gw,
    gh = g.gh,
    ok = g.ok;
  if (NAV.g !== g) {
    const n = gw * gh;
    NAV.g = g;
    NAV.gc = new Int32Array(n);
    NAV.st = new Uint16Array(n);
    NAV.pd = new Uint8Array(n);
    NAV.gen = 0;
  }
  if (++NAV.gen > 32766) (NAV.st.fill(0), (NAV.gen = 1));
  const O = NAV.gen * 2,
    C = O + 1,
    st = NAV.st,
    gc = NAV.gc,
    pd = NAV.pd,
    tx = t % gw,
    ty = (t / gw) | 0,
    hf = (i) => {
      const dx = Math.abs((i % gw) - tx),
        dy = Math.abs(((i / gw) | 0) - ty);
      return dx > dy ? 10 * dx + 4 * dy : 10 * dy + 4 * dx;
    };
  let hn = NAV.hn,
    hk = NAV.hk,
    len = 0;
  const push = (i, k) => {
      if (len === hn.length) {
        const a = new Int32Array(len * 2),
          b = new Float64Array(len * 2);
        (a.set(hn), b.set(hk), (NAV.hn = hn = a), (NAV.hk = hk = b));
      }
      let c = len++;
      for (; c > 0;) {
        const p = (c - 1) >> 1;
        if (hk[p] <= k) break;
        ((hn[c] = hn[p]), (hk[c] = hk[p]), (c = p));
      }
      ((hn[c] = i), (hk[c] = k));
    },
    pop = () => {
      const top = hn[0],
        li = hn[--len],
        lk = hk[len];
      let c = 0;
      for (;;) {
        let m = 2 * c + 1;
        if (m >= len) break;
        m + 1 < len && hk[m + 1] < hk[m] && m++;
        if (hk[m] >= lk) break;
        ((hn[c] = hn[m]), (hk[c] = hk[m]), (c = m));
      }
      ((hn[c] = li), (hk[c] = lk));
      return top;
    };
  ((st[s] = O), (gc[s] = 0), (pd[s] = 255), push(s, hf(s) * w));
  let best = s,
    bestH = hf(s),
    n = 0;
  for (; len;) {
    const i = pop();
    if (st[i] === C) continue;
    if (((st[i] = C), i === t)) {
      best = t;
      break;
    }
    if (++n > maxN) break;
    const x = i % gw,
      y = (i / gw) | 0,
      gi = gc[i],
      h = hf(i);
    h < bestH && ((bestH = h), (best = i));
    for (let d = 0; d < 8; d++) {
      const nx = x + NAV_DX[d],
        ny = y + NAV_DY[d];
      if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
      const j = ny * gw + nx;
      if (!ok[j] || st[j] === C || (d > 3 && (!ok[y * gw + nx] || !ok[ny * gw + x]))) continue;
      const ng = gi + (d > 3 ? 14 : 10);
      if (st[j] === O && ng >= gc[j]) continue;
      const hj = hf(j);
      ((st[j] = O), (gc[j] = ng), (pd[j] = d), push(j, ng + hj * w + hj * 1e-3));
    }
  }
  NAV.used += n;
  const out = [];
  for (let i = best; ;) {
    out.push(i);
    const d = pd[i];
    if (d === 255) break;
    i -= NAV_DY[d] * gw + NAV_DX[d];
  }
  out.reverse();
  out.partial = best !== t;
  out.n = n;
  return out;
}
// Cell chain -> waypoints (screen px): cell centres, the real goal at the end, then string pulling.
function navPts(cells, sx, sy, gx, gy) {
  const g = OBS.g,
    P = [];
  for (let k = 1; k < cells.length; k++) {
    const c = cells[k];
    P.push({ x: ((c % g.gw) + 0.5) * g.cw, y: (((c / g.gw) | 0) + 0.5) * g.ch });
  }
  cells.partial || (P.length ? (P[P.length - 1] = { x: gx, y: gy }) : P.push({ x: gx, y: gy }));
  const out = [];
  let ax = sx,
    ay = sy,
    k = 0;
  for (; k < P.length;) {
    let j = k;
    for (
      ;
      j + 1 < P.length &&
      Math.hypot(P[j + 1].x - ax, P[j + 1].y - ay) <= NAV_SEG_MAX &&
      navSeg(ax, ay, P[j + 1].x, P[j + 1].y);
    )
      j++;
    (out.push(P[j]), (ax = P[j].x), (ay = P[j].y), (k = j + 1));
  }
  return out;
}
function navCell(x, y) {
  const g = OBS.g;
  let c = clamp(Math.floor(y / g.ch), 0, g.gh - 1) * g.gw + clamp(Math.floor(x / g.cw), 0, g.gw - 1);
  if (!g.ok[c]) {
    const [a, b] = obsSnap(x, y);
    c = clamp(Math.floor(b / g.ch), 0, g.gh - 1) * g.gw + clamp(Math.floor(a / g.cw), 0, g.gw - 1);
  }
  return c;
}
// (Re)plan a._nav towards (tx, ty). Monsters (mob) share a per-tick node budget and keep their old path when
// it is spent. Returns false when there is no way at all.
function navPlan(a, n, tx, ty, mob) {
  const [gx, gy] = obsWalk(tx, ty) ? [tx, ty] : obsSnap(tx, ty);
  ((n.f = NAV.frame), (n.tx = tx), (n.ty = ty));
  // stuck on a straight line (sampling missed a corner): plan on the grid instead
  if (!(n.direct && n.stk >= 3) && navSeg(a.x, a.y, gx, gy))
    return ((n.p = [{ x: gx, y: gy }]), (n.i = 0), (n.partial = !1), (n.direct = !0), !0);
  if (mob && NAV.used > NAV_FRAME_NODES && n.p) return ((n.f -= 6), !0);
  const cells = navSearch(navCell(a.x, a.y), navCell(gx, gy), mob ? NAV_MOB_NODES : NAV_HERO_NODES, mob ? 1 : 1.2);
  ((n.p = navPts(cells, a.x, a.y, gx, gy)), (n.i = 0), (n.partial = cells.partial), (n.direct = !1));
  return n.p.length > 0;
}
// Move actor a towards (tx, ty) along a planned path by ground step s.
// Returns 1 while moving, 0 when arrived (or as close as it can get), -1 when blocked / no way.
// Leaves the actual displacement in a._mx, a._my (for facing).
function navGo(a, tx, ty, s, mob) {
  const g = OBS.g,
    x0 = a.x,
    y0 = a.y;
  a._mx = a._my = 0;
  if (!g) {
    const dx = tx - a.x,
      dy = ty - a.y,
      L = Math.hypot(dx, dy);
    if (L < 1) return 0;
    const st = Math.min(1, (s * isoK(dx, dy)) / L);
    return ((a.x += dx * st), (a.y += dy * st), (a._mx = a.x - x0), (a._my = a.y - y0), 1);
  }
  let n = a._nav;
  (!n || n.g !== g || n.ver !== OBS.ver) &&
    (n = a._nav = { g, ver: OBS.ver, p: null, i: 0, tx: NaN, ty: NaN, f: -99, stk: 0, partial: !1 });
  if (Math.hypot(tx - a.x, ty - a.y) < 1) return 0;
  const moved = Math.hypot(tx - n.tx, ty - n.ty),
    age = NAV.frame - n.f;
  const done = n.p && n.i >= n.p.length,
    retarget =
      moved > 0.5 && (done || moved > 64 || (n.direct ? age >= 4 : moved > (mob ? 24 : 12) && age >= (mob ? 15 : 8)));
  retarget && moved > 24 && (n.stk = 0);
  (!n.p || n.stk % 5 === 3 || (n.partial && done) || retarget) && navPlan(a, n, tx, ty, mob);
  if (!n.p || !n.p.length) return -1;
  let rem = s;
  for (; rem > 1e-6 && n.i < n.p.length;) {
    const w = n.p[n.i],
      dx = w.x - a.x,
      dy = w.y - a.y,
      L = Math.hypot(dx, dy);
    if (L < 0.5) {
      n.i++;
      continue;
    }
    const k = isoK(dx, dy),
      can = rem * k;
    if (L <= can) {
      if (!obsMove(a, w.x, w.y)) break;
      if (Math.hypot(w.x - a.x, w.y - a.y) > 0.5) break; // slid instead of reaching it
      ((rem -= L / k), n.i++);
    } else (obsMove(a, a.x + (dx / L) * can, a.y + (dy / L) * can), (rem = 0));
  }
  ((a._mx = a.x - x0), (a._my = a.y - y0));
  const mv = Math.hypot(a._mx, a._my);
  if (n.i >= n.p.length && !n.partial) return ((n.stk = 0), 0);
  mv < Math.max(0.05, s * 0.15) ? n.stk++ : (n.stk = 0);
  return n.stk > 12 ? -1 : 1;
}
// Facing from the last navGo displacement (JX1: direction of travel, y scaled x2 inside dirOf).
function navFace(a) {
  return Math.hypot(a._mx || 0, a._my || 0) > 0.05
    ? ((a.dir = dirOf(a._mx, a._my)), Math.abs(a._mx) > 0.05 && (a.face = a._mx > 0 ? 1 : -1), !0)
    : !1;
}
// Keep monsters from standing inside each other: small push apart (iso distance), only onto walkable ground.
function navSep(a, list, r) {
  let px = 0,
    py = 0;
  for (const b of list) {
    if (b === a || b.dead || !(b.hp > 0)) continue;
    const dx = a.x - b.x,
      dy = (a.y - b.y) * 2,
      d = Math.hypot(dx, dy);
    if (d >= r) continue;
    const k = (r - d) / r;
    d > 0.01 ? ((px += (dx / d) * k), (py += (dy / d) * k)) : ((px += a.id > b.id ? k : -k), (py += 0));
  }
  if (!px && !py) return;
  const L = Math.hypot(px, py),
    m = Math.min(0.6, L * 0.6);
  obsMove(a, a.x + (px / L) * m, a.y + (py / L) * m * 0.5);
}
// Compatibility wrappers (hero auto-walk / loot pick-up, monster chase).
function obsSteer(t, e, n, s) {
  return navGo(t, e, n, s, 0);
}
function obsChase(t, e, n, s) {
  return navGo(t, e, n, s, 1);
}
function obsPath(t, e, n, s, l = NAV_HERO_NODES) {
  if (!OBS.g) return null;
  const [gx, gy] = obsWalk(n, s) ? [n, s] : obsSnap(n, s),
    c = navSearch(navCell(t, e), navCell(gx, gy), l, 1.2);
  return c.partial ? null : navPts(c, t, e, gx, gy);
}
const FIELD = { g: null, cell: -1 }; // legacy flow-field cache handle (reset by jxmShift / obsIsland)
const obsFrame = () => {
  ((NAV.used = 0), NAV.frame++);
};
