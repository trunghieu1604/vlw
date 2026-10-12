"use strict";
const FLD_RESPAWN = 20,
  FLD_BOSS_RESPAWN = 180,
  FLD_BOSS_FIRST = 60,
  FLD_CLUSTERS = 14,
  FLD_GAP = 300,
  FLD_SPREAD = 60,
  FLD_WANDER = 50,
  FLD_AGGRO = 400,
  FLD_LEASH = 700,
  FLD_ROUND_KILLS = 24,
  fieldMode = () => !R.dg && !R.tower && !R.town && !window.NO_FIELD,
  fieldKey = () => `${OBS.key}|${zoneOf(Math.min(S.stage, STAGES)).id}|${S.diff}|${rebornN()}`,
  VOIDC = { key: null, d: null };
function voidAt(t, s) {
  const n = R.bgImg;
  if (typeof JXM < "u" && JXM.cur) return !1;
  if (!n || !n.complete || !n.naturalWidth) return !1;
  if (VOIDC.key !== n.src)
    try {
      const a = Math.ceil(n.naturalWidth / 16),
        d = Math.ceil(n.naturalHeight / 16),
        r = document.createElement("canvas");
      ((r.width = a), (r.height = d));
      const l = r.getContext("2d");
      (l.drawImage(n, 0, 0, a, d),
        (VOIDC.d = l.getImageData(0, 0, a, d)),
        (VOIDC.key = n.src),
        (VOIDC.k = a / WORLD.w));
    } catch {
      ((VOIDC.key = n.src), (VOIDC.d = null));
    }
  const o = VOIDC.d;
  if (!o) return !1;
  const e = Math.floor(t * VOIDC.k),
    f = Math.floor(s * VOIDC.k);
  if (e < 0 || f < 0 || e >= o.width || f >= o.height) return !0;
  const i = (f * o.width + e) * 4;
  return o.data[i] + o.data[i + 1] + o.data[i + 2] < 75;
}
// ---- Camps on full maps without a farming crop (Thần Hành Phù visit maps) ----
// A rectangle around the landing point is not enough there: Nguyệt Ca Mật Cốc (969) is 49 walled valleys of
// ~1300x1000 px each, so most of the rect is cliff and camp members snapped onto the valley walls. Camps are
// drawn instead from the cells the hero can actually walk to from the landing point (BFS over OBS.g.ok,
// FLD_REACH path steps), away from walls, spaced by the area that is really there.
const FLD_REACH = 160, // BFS steps (cells; one step = 32 ground units) camps may be from the landing point
  FLD_REACH_CELLS = 9000, // ... or fewer: the BFS stops growing once this much ground (~4.6M px²) is found
  FLD_CAMP_AREA = 1.1e5, // open screen px² per camp
  FLD_BOSS_D = [10, 22]; // boss camp path distance (steps): JX1 Mật Cốc spawns its boss at the trigger trap
// 300-500 scene units beside the landing point (script\trap\月歌秘谷\触发.lua: AddNpc(1850, ...) at the player)
const fieldNav = () => {
  const g = OBS.g;
  return !!(g && g.jm && typeof JXM == "object" && JXM.cur && !JXM.cur.crop);
};
// BFS from (x, y) over walkable cells, up to max steps / about maxN cells
// -> { cells: [...], d: Int16Array steps (-1 = not reached) }
function fieldReach(x, y, max, maxN) {
  const g = OBS.g,
    gw = g.gw,
    gh = g.gh,
    ok = g.ok,
    N = gw * gh;
  (!fieldReach.d || fieldReach.d.length !== N) &&
    ((fieldReach.d = new Int16Array(N)), (fieldReach.q = new Int32Array(N)));
  const d = fieldReach.d.fill(-1),
    q = fieldReach.q,
    s = navCell(x, y),
    cells = [];
  if (!ok[s]) return { cells, d };
  let h = 0,
    b = 0,
    stop = max;
  ((q[b++] = s), (d[s] = 0));
  for (; h < b;) {
    const c = q[h++],
      cx = c % gw,
      cy = (c / gw) | 0;
    cells.push(c);
    maxN && cells.length >= maxN && stop === max && (stop = d[c]);
    if (d[c] >= stop) continue;
    for (let j = -1; j <= 1; j++)
      for (let i = -1; i <= 1; i++) {
        const X = cx + i,
          Y = cy + j;
        if ((!i && !j) || X < 0 || Y < 0 || X >= gw || Y >= gh) continue;
        const k = Y * gw + X;
        // no corner cutting (same rule as obsLoad / navSearch)
        if (!ok[k] || d[k] >= 0 || (i && j && (!ok[cy * gw + X] || !ok[Y * gw + cx]))) continue;
        ((d[k] = d[c] + 1), (q[b++] = k));
      }
  }
  return { cells, d };
}
// cell c has walkable cells all around it within k cells (k cells = k*32 ground units each way)
function fieldClear(c, k) {
  const g = OBS.g,
    cx = c % g.gw,
    cy = (c / g.gw) | 0;
  for (let j = -k; j <= k; j++)
    for (let i = -k; i <= k; i++) {
      const X = cx + i,
        Y = cy + j;
      if (X < 0 || Y < 0 || X >= g.gw || Y >= g.gh || !g.ok[Y * g.gw + X]) return !1;
    }
  return !0;
}
function fieldPointsNav(t, s, n) {
  const g = OBS.g,
    lp = JXM.lands[String(JXM.cur.id)],
    ls = lp && obsSnap(lp[0], lp[1]),
    // around the landing point when it lies in the hero's area (else around the hero)
    o0 = ls && obsWalk(ls[0], ls[1]) ? ls : n,
    R0 = fieldReach(o0[0], o0[1], FLD_REACH, FLD_REACH_CELLS);
  if (R0.cells.length < 60) return null;
  let pool = R0.cells;
  for (const k of [3, 2, 1]) {
    const p = R0.cells.filter((c) => fieldClear(c, k));
    if (p.length >= Math.min(400, R0.cells.length * 0.2)) {
      pool = p;
      break;
    }
  }
  // camp count and spacing from the open area (a Mật Cốc valley holds ~7 camps ~200 px apart, not 15 x 300 px)
  const area = pool.length * g.cw * g.ch;
  t = clamp(Math.round(area / FLD_CAMP_AREA), 3, t);
  const gap = clamp(Math.sqrt(area / t) * 0.8, 120, s),
    near = Math.min(220, gap),
    o = [],
    at = (c) => [((c % g.gw) + 0.5) * g.cw, (((c / g.gw) | 0) + 0.5) * g.ch],
    fits = (x, y) =>
      obsWalk(x, y) &&
      !o.some((d) => Math.hypot(d[0] - x, d[1] - y) < gap) &&
      !(n && Math.hypot(n[0] - x, n[1] - y) < near);
  // boss camp first (fieldBuild makes point 0 the boss)
  const bp = pool.filter((c) => R0.d[c] >= FLD_BOSS_D[0] && R0.d[c] <= FLD_BOSS_D[1]);
  for (let k = 0; k < 60 && bp.length && !o.length; k++) {
    const [x, y] = at(pick(bp));
    fits(x, y) && o.push([x, y]);
  }
  for (let k = 0; k < t * 80 && o.length < t; k++) {
    const [x, y] = at(pick(pool));
    fits(x, y) && o.push([x, y]);
  }
  return o.length >= 2 ? o : null;
}
// A camp member near its centre (x, y): walkable and in straight reach of the centre (no snapping onto a wall
// or into the next pocket of the map).
function fieldMember(x, y) {
  if (!OBS.g) return inWorld(x + rnd(-80, 80), y + rnd(-80, 80) * 0.6);
  for (let k = 0; k < 12; k++) {
    const px = x + rnd(-80, 80),
      py = y + rnd(-80, 80) * 0.6;
    if (obsWalk(px, py) && navSeg(x, y, px, py)) return [px, py];
  }
  return obsWalk(x, y) ? [x, y] : inWorld(x, y);
}
function fieldPoints(t, s, n) {
  if (fieldNav()) {
    const p = fieldPointsNav(t, s, n);
    if (p) return p;
  }
  const o = [],
    e = OBS.g,
    fr = e && typeof jxmFieldRect == "function" ? jxmFieldRect() : null;
  for (let f = 0; f < t * 60 && o.length < t; f++) {
    let i, a;
    if (e) {
      // full maps: camps stay inside the old crop so farming spots keep their place on the terrain
      const d = fr
        ? clamp(Math.floor(rnd(fr.y, fr.y + fr.h) / e.ch), 0, e.gh - 1) * e.gw +
          clamp(Math.floor(rnd(fr.x, fr.x + fr.w) / e.cw), 0, e.gw - 1)
        : irnd(0, e.gw * e.gh - 1);
      if (!e.ok[d] || ((i = ((d % e.gw) + 0.5) * e.cw), (a = (Math.floor(d / e.gw) + 0.5) * e.ch), !obsWalk(i, a)))
        continue;
    } else ((i = rnd(150, WORLD.w - 150)), (a = rnd(150, WORLD.h - 150)));
    o.some((d) => Math.hypot(d[0] - i, d[1] - a) < s) ||
      voidAt(i, a) ||
      (n && Math.hypot(n[0] - i, n[1] - a) < 220) ||
      o.push([i, a]);
  }
  return o;
}
// ---- JX1 monsters per map (jxmon.js, generated by tools/jxmap/monsters.py) ----
// Each map shows the JX1 monsters of that map (name + sprite) and its boss; level / HP / damage / exp / drops
// still come from the zone's stage logic (makeEnemy(tid, stageLevel ...)), so balance is unchanged.
// Zone and alt maps are switched once at load; Thần Hành Phù visit maps (temporary alts borrowing a zone's
// stats) when their field is built. z.m0 / z.boss0 keep the game's own list (old saves' quests are remapped).
const JXMON_ON = typeof JXMON == "object" && !!JXMON && !!JXMON.map;
function jxmonApply(z) {
  const e = JXMON_ON && z && JXMON.map[z.id];
  if (!e || z.jxm === z.id) return z;
  const m = e.m.filter((i) => MON[i]);
  if (!m.length) return z;
  z.m0 || ((z.m0 = z.m), (z.boss0 = z.boss));
  z.m = m;
  if (e.b && MON[e.b]) z.boss = e.b;
  else if (z.thv) {
    // a visit map without a JX1 boss borrows its zone's boss: the game's own one, not that zone map's JX1 boss
    const Z = ZONES.find((q) => q.boss === z.boss && q.boss0 != null);
    Z && (z.boss = Z.boss0);
  }
  z.jxm = z.id;
  return z;
}
if (JXMON_ON) {
  for (const k in JXMON.mon) MON[k] || (MON[k] = JXMON.mon[k]);
  for (const k in JXMON.anim) W.anim[k] || (W.anim[k] = JXMON.anim[k]);
  for (const z of ZONES) jxmonApply(z);
  for (const k in ZALT) for (const z of ZALT[k]) jxmonApply(z);
}
// a saved Dã Tẩu quest on this map that names a monster / boss of the game's old list -> its JX1 counterpart
function jxmonTask(z, zi) {
  const k = S.dt && S.dt.task;
  if (!k || !z.m0 || k.zi !== zi || ((S.zalt || {})[zi] || 0) !== (k.za || 0)) return;
  if (k.t === "killm" && !z.m.includes(k.tid)) {
    const i = z.m0.indexOf(k.tid);
    k.tid = z.m[(i < 0 ? 0 : i) % z.m.length];
  }
  k.t === "boss" && k.tid === z.boss0 && (k.tid = z.boss);
}
// JX1 spawn points of the map on screen: {boss: [x, y] | null, camps: [[x, y, tid]]} (full-map px, only those
// on ground the hero can walk to), or null when the map has none / is not shown as a full JX1 map
function fieldJx(t) {
  const e = JXMON_ON && JXMON.map[t.id],
    g = OBS.g;
  if (!e || (!e.mp && !e.bp) || !g || !g.jm || typeof JXM != "object" || !JXM.cur || String(JXM.cur.id) !== String(t.id))
    return null;
  const R0 = fieldReach(H.x, H.y, 32000, 0),
    reach = (p) => {
      if (!obsWalk(p[0], p[1])) return -1;
      const c = navCell(p[0], p[1]);
      return c >= 0 && c < R0.d.length ? R0.d[c] : -1;
    },
    camps = [];
  for (const id in e.mp || {})
    if (MON[id] && t.m.includes(+id)) for (const p of e.mp[id]) reach(p) >= 0 && camps.push([p[0], p[1], +id]);
  let boss = null,
    bd = 1e9;
  for (const p of e.bp || []) {
    const d = reach(p);
    d >= 0 && d < bd && ((bd = d), (boss = [p[0], p[1]]));
  }
  return boss || camps.length ? { boss, camps } : null;
}
function fieldBuild() {
  const zi = zoneIdx(Math.min(S.stage, STAGES)),
    t = jxmonApply(zoneOf(Math.min(S.stage, STAGES))),
    s = densRange(),
    o = [],
    e = new Set();
  let n = fieldPoints(15, 300, [H.x, H.y]);
  jxmonTask(t, zi);
  const jp = fieldJx(t);
  if (jp) {
    // camps on the JX1 points first (boss camp = a JX1 boss spot), the reachable-area layout fills the rest
    const near = (p, L) => L.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 260),
      fixed = jp.boss ? jp.camps.concat([jp.boss]) : jp.camps;
    n = [jp.boss || n[0]].concat(jp.camps, n.slice(1).filter((p) => !near(p, fixed))).slice(0, Math.max(15, jp.camps.length + 1));
    R.fieldJx = { id: t.id, boss: !!jp.boss, camps: jp.camps.length };
  } else R.fieldJx = null;
  for (; e.size < Math.min(4, n.length - 1);) e.add(irnd(1, n.length - 1));
  (n.forEach(([i, a, jt], d) => {
    if (d === 0) {
      o.push({ x: i, y: a, cls: "boss", tid: t.boss, t: 60 });
      return;
    }
    const r = monCount((t.lo || 0) >= FLD_HI_LV ? irnd(5, 7) : Math.max(2, Math.round(irnd(s[1], s[2]) / 2))),
      l = jt != null && MON[jt] ? jt : pick(t.m);
    for (let c = 0; c < r; c++) {
      const [h, u] = fieldMember(i, a);
      o.push({ x: h, y: u, cls: c === 0 && (e.has(d) || Math.random() < 0.25) ? "elite" : "normal", tid: l, t: 0 });
    }
  }),
    (R.field = { key: fieldKey(), pts: o, kills: 0, g: OBS.g, ver: OBS.ver }),
    (R.enemies = R.enemies.filter((i) => (i.goldBoss || i.sat || i.satG) && !i.dead)));
  for (const i of R.field.pts) i.t <= 0 && fieldSpawn(i);
  const f = t;
  f.id !== R.zoneShown &&
    ((R.zoneShown = f.id),
    (R.banner = { t: 2.4, text: f.n, sub: `Cấp ${f.lo}–${f.hi}` }),
    typeof onZoneChange == "function" && onZoneChange(f));
}
const FLD_HI_LV = 60;
function fieldSpawn(t) {
  const s = stageLevel(S.stage) + (t.cls === "boss" ? 1 : 0),
    n = makeEnemy(t.tid, s, t.cls, t.x, t.y);
  (t.cls === "normal" && ((n.dens = !0), (n.dmg *= DENS_DMG)),
    (n.home = t),
    (n.aggro = !1),
    (n.wT = rnd(0, 3)),
    (t.e = n),
    (t.t = 0),
    R.enemies.push(n),
    t.cls === "boss" &&
      ((n.n = bossName(t.tid, zoneOf(Math.min(S.stage, STAGES)).n)),
      log(`<b class="boss">${esc(n.n)}</b> xuất hiện!`)));
}
function fieldTick(t) {
  const s = R.field;
  if (!s || s.key !== fieldKey() || (!R.enemies.length && s.pts.some((n) => n.e && !n.e.dead))) {
    fieldBuild();
    return;
  }
  // obstacle grid replaced since the camps were laid out (full map meta arrived after the zone was entered,
  // landing area switched): camps placed without it (or now off the walkable area) are laid out again
  if (s.g !== OBS.g || s.ver !== OBS.ver) {
    const jx = JXMON_ON && !R.fieldJx && JXMON.map[zoneOf(Math.min(S.stage, STAGES)).id];
    if (OBS.g && (!s.g || s.pts.some((n) => !obsWalk(n.x, n.y)) || (jx && (jx.mp || jx.bp) && OBS.g.jm))) {
      fieldBuild();
      return;
    }
    ((s.g = OBS.g), (s.ver = OBS.ver));
  }
  for (const n of s.pts) {
    if (
      (n.e && n.e.dead && ((n.e = null), (n.t = n.cls === "boss" ? 180 : 20 / mountHaste())),
      !n.e && n.cls === "boss" && n.t > 20)
    ) {
      const o = S.dt && S.dt.task;
      o && o.t === "boss" && o.tid === n.tid && o.have < o.need && (n.t = 20);
    }
    if (!n.e && (n.t -= t) <= 0) {
      if (Math.hypot(H.x - n.x, H.y - n.y) < 90) {
        n.t = 1;
        continue;
      }
      fieldSpawn(n);
    }
  }
  ((R.enemies.length > 80 || R.enemies.some((n) => n.dead)) && (R.enemies = R.enemies.filter((n) => !n.dead)),
    goldBossDue() && spawnGoldBoss());
}
function fieldIdle(t, s) {
  const n = t.home,
    o = jxdE(H, t);
  if (
    ((t.agT = (t.agT || 0) - s) <= 0 &&
      ((t.agT = 0.4), o < 400 && R.life > 0 && obsSee(t.x, t.y, H.x, H.y) && (t.aggro = !0)),
    t.aggro)
  )
    return !1;
  if (t.backT > 0) {
    t.backT -= s;
    const r = navGo(t, n.x, n.y, t.spd * 1.6 * s, 1);
    ((t.moving = r > 0), navFace(t), (r <= 0 || Math.hypot(n.x - t.x, n.y - t.y) < 12) && (t.backT = 0));
    return !0;
  }
  // JX1 KNpcAI::CommonAction: mostly stand, now and then walk to a random point around the camp (walk speed =
  // run speed for nearly all monsters). Points must be walkable and in straight sight of the monster.
  if ((t.wT -= s) <= 0) {
    ((t.wT = rnd(2, 5)), (t.wx = null));
    if (Math.random() < 0.4)
      for (let k = 0; k < 6; k++) {
        const x = n.x + rnd(-FLD_WANDER, FLD_WANDER),
          y = n.y + rnd(-FLD_WANDER, FLD_WANDER) * 0.5;
        if (obsWalk(x, y) && Math.hypot(x - t.x, y - t.y) > 8 && navSeg(t.x, t.y, x, y)) {
          ((t.wx = x), (t.wy = y));
          break;
        }
      }
  }
  t.moving = !1;
  if (t.wx != null) {
    const r = navGo(t, t.wx, t.wy, t.spd * s, 1);
    ((t.moving = r > 0), navFace(t), r <= 0 && (t.wx = null));
  }
  return (navSep(t, R.enemies, 14), !0);
}
function fieldLeash(t) {
  const s = t.home;
  !s ||
    !t.aggro ||
    t.cls === "boss" ||
    (jxdE(s, t) > 700 &&
      jxdE(H, t) > 200 &&
      ((t.aggro = !1), (t.backT = 6), (t.hp = t.max), (t.poison = 0), (t.slowT = 0)));
}
function fieldOnKill() {
  const t = R.field;
  !t ||
    !fieldMode() ||
    ++t.kills % 24 ||
    ((R.round = (R.round || 0) + 1), questTick("stages"), typeof onStageChange == "function" && onStageChange());
}
