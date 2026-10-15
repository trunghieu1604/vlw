"use strict";
// Shared presence in towns / villages (docs/presence.md, server/presence.py).
// Every logged-in player in a shared map (a JX1 safe map shown with its full map: Thành thị / Thôn trang)
// sees the other players of that map: layered JX look (gear rows, horse), name · Lv in the faction colour,
// shadow, idle / run animation, smooth (interpolated) movement, and their disciples unless they are away.
// Training maps, Mật Cốc, dungeons, the boat, the tower: the client leaves its room, nobody sees it there.
// Offline play (?offline_test=1, no server, no session) never opens the socket.
//
// Hooks: render.js already asks `othEnts()` for extra depth-sorted entries and draws them with `othDraw()`;
// shadow.js `drawShadows` calls `othShadows()`; clicks are taken in the capture phase like js/npc.js.
// The local S / R / H are never modified: remote looks are built by presLook() from the snapshot.
const PRES = {
  ws: null,
  st: "off", // off | conn | auth | ok
  me: "", // own presence id
  map: "", // map id we want to be in ("" = none)
  room: "", // map id the server put us in
  ch: 0,
  list: new Map(), // id -> remote player {id, s, ent, d: [ent...], look...}
  lastP: "",
  lastS: "",
  sT: 0,
  retry: 0,
  retryAt: 0,
  idleAt: 0,
  stepAt: 0,
  drawn: [],
  sent: 0,
  recv: 0,
};
const PRES_HZ = 8, // position updates per second (only when changed)
  PRES_DELAY = 150, // ms interpolation delay
  PRES_MAX_DRAW = 40, // remote players drawn (nearest first)
  PRES_MAX_ACT = 90, // remote actors drawn in total (players + disciples)
  PRES_IDLE_CLOSE = 60e3, // close the socket this long after leaving the shared maps
  PRES_DCOL = "#c9dcff"; // remote disciples' name colour

// ---------------------------------------------------------------- where are we
const presFirebaseOn = () =>
  typeof firebase !== "undefined" && window.CHAT_CFG && !!CHAT_CFG.firebaseUrl;

const presOn = () =>
  presFirebaseOn() ||
  (typeof netOn == "function" &&
    netOn() &&
    typeof NET == "object" &&
    !!NET.user &&
    typeof API == "object" &&
    !!API.token);

// The shared map currently shown: town, stage, or World Boss arena
function presMapId() {
  if (typeof S != "object" || !S || !S.fac) return "";
  if (typeof WB != "undefined" && WB.arena && WB.arena.on) return "wb_337";
  if (R.town && typeof W == "object" && W.town) return "town_" + (W.town.id || "37");
  if (S && S.stage) return "stage_" + Math.min(S.stage || 1, 30);
  return "";
}

// ---------------------------------------------------------------- own snapshot
// JX look rows of the character in context (same as jxSetup, horse row independent of mounting).
function presRows() {
  if (!JXL || !S.eq) return [-1, -1, -1, -1];
  const q = S.eq,
    w = q.weapon;
  let h = -1;
  try {
    h = q.horse ? jxHorseRow(q.horse) : -1;
  } catch {}
  return [jxRow("helm", q.helm), jxRow("armor", q.armor), jxRow(w && w.d === 1 ? "range" : "melee", w), h];
}
function presChar() {
  const t = R.P && R.P.main,
    k = t && t !== R.P.basic && t.id != null ? +t.id || 0 : 0;
  return {
    n: String(S.name || (FAC[S.fac] && FAC[S.fac].n) || "").slice(0, 20),
    f: S.fac || "",
    x: S.sex ? 1 : 0,
    l: S.lvl | 0,
    k,
    r: presRows(),
    m: S.eq && S.eq.horse && R.mounted ? 1 : 0,
  };
}
function presSnap() {
  const s = presChar();
  s.rb = typeof rebGet == "function" ? rebGet() : 0;
  typeof ptCamp == "function" && (s.pc = ptCamp()); // màu tổ đội (title.js PT_CAMP)

  // Title & Halo của nhân vật chính
  try {
    const worn = typeof titleWorn === "function" ? titleWorn() : null;
    if (worn) {
      s.tk = worn[0] || "";
      s.tn = typeof titleName === "function" ? titleName(worn) : (worn[1] || "");
      s.tc = (worn[0] === "admin" ? "#ffd700" : (worn[0] === "vlmc" ? "#ff3333" : (typeof TIER !== "undefined" && TIER[worn[3]] ? TIER[worn[3]].c : "#ffd700")));
    }
    const h = typeof getHeroHalo === "function" ? getHeroHalo() : null;
    if (h && h.k) {
      s.hk = h.k;
    }
  } catch {}

  s.d = [];
  if (typeof partyN == "function" && !partyAway() && !PCTX)
    for (let k = 1; k <= partyN(); k++) {
      if (typeof pActive == "function" && !pActive(k)) continue;
      const c = withChar(k, presChar);
      c && s.d.push(c);
    }
  return s;
}
const presP = (h) => {
  const isAtk = h.act === "at" || (h.lastAtkT && performance.now() - h.lastAtkT < 400);
  return [
    Math.round(h.x),
    Math.round(h.y),
    (h.dir || 0) & 7,
    isAtk ? 2 : (h.moving ? 1 : 0),
    h.castSk || 0
  ];
};
function presQ() {
  const q = [];
  if (typeof partyN == "function" && !partyAway()) {
    for (let k = 1; k <= partyN(); k++) {
      if (typeof pActive == "function" && !pActive(k)) continue;
      q.push(presP(pAct(k).h));
    }
  }
  return q;
}

// ---------------------------------------------------------------- Firebase presence
let fbPresMapRef = null;
let fbPresMyRef = null;
let fbPresLastP = "";
let fbPresLastS = "";
let fbPresLastMoveT = 0;

function presJoinFirebase(mapId) {
  presLeaveFirebase();
  PRES.room = mapId;
  PRES.me = typeof chatCid === "function" ? chatCid() : "cid_" + (S.name || "anon");
  PRES.st = "ok";
  PRES.list.clear();

  try {
    const db = firebase.database();
    fbPresMapRef = db.ref("presence/maps/" + mapId);
    fbPresMyRef = fbPresMapRef.child(PRES.me);

    const snap = presSnap();
    const p = presP(H);
    const q = presQ();

    fbPresMyRef.onDisconnect().remove();
    fbPresMyRef.set({
      id: PRES.me,
      s: snap,
      p: p,
      q: q,
      t: Date.now()
    });

    fbPresMapRef.on("child_added", (childSnap) => {
      const k = childSnap.key;
      if (k === PRES.me) return;
      const val = childSnap.val();
      if (val && val.s && val.p) {
        presAdd({ id: k, s: val.s, p: val.p, q: val.q });
      }
    });

    fbPresMapRef.on("child_changed", (childSnap) => {
      const k = childSnap.key;
      if (k === PRES.me) return;
      const val = childSnap.val();
      if (!val) return;
      const player = PRES.list.get(k);
      if (!player) {
        if (val.s && val.p) presAdd({ id: k, s: val.s, p: val.p, q: val.q });
      } else {
        if (val.s) presSetSnap(player, val.s);
        if (val.p) presMove(player, val.p, val.q);
      }
    });

    fbPresMapRef.on("child_removed", (childSnap) => {
      const k = childSnap.key;
      if (k === PRES.me) return;
      PRES.list.delete(k);
    });
  } catch (e) {
    console.warn("presJoinFirebase err:", e);
  }
}

function presLeaveFirebase() {
  if (fbPresMapRef) {
    try { fbPresMapRef.off(); } catch {}
    fbPresMapRef = null;
  }
  if (fbPresMyRef) {
    try { fbPresMyRef.remove(); } catch {}
    fbPresMyRef = null;
  }
  PRES.room = "";
  PRES.list.clear();
}

function presTickFirebase() {
  if (!presFirebaseOn()) return;
  if (!S || !S.fac || (typeof hasRealName == "function" && !hasRealName())) {
    if (PRES.room) presLeaveFirebase();
    return;
  }
  const mapId = presMapId();
  if (mapId !== PRES.map) {
    PRES.map = mapId;
    if (!mapId) {
      presLeaveFirebase();
      return;
    }
    presJoinFirebase(mapId);
  }
  if (!PRES.room || !fbPresMyRef) return;

  const now = Date.now();
  if (now - PRES.sT > 2000) {
    PRES.sT = now;
    const s = presSnap();
    const strS = JSON.stringify(s);
    if (strS !== fbPresLastS) {
      fbPresLastS = strS;
      fbPresMyRef.child("s").set(s);
    }
  }

  const p = presP(H);
  const q = presQ();
  const strP = JSON.stringify([p, q]);
  const isAtk = p[3] === 2;
  if (strP !== fbPresLastP && (isAtk ? now - fbPresLastMoveT >= 60 : now - fbPresLastMoveT >= 1000 / PRES_HZ)) {
    fbPresLastP = strP;
    fbPresLastMoveT = now;
    fbPresMyRef.update({ p: p, q: q, t: now });
  }
}

// ---------------------------------------------------------------- socket
function presSend(o) {
  const w = PRES.ws;
  if (!w || w.readyState !== 1) return !1;
  try {
    w.send(JSON.stringify(o));
    PRES.sent++;
    return !0;
  } catch {
    return !1;
  }
}
function presConnect() {
  if (PRES.ws || Date.now() < PRES.retryAt) return;
  let w;
  try {
    w = new WebSocket(API.wsUrl("/api/world/ws"));
  } catch {
    return presRetry();
  }
  PRES.ws = w;
  PRES.st = "conn";
  w.onopen = () => {
    PRES.st = "auth";
    w.send(JSON.stringify({ t: "auth", tok: API.token }));
  };
  w.onmessage = (e) => {
    let o;
    try {
      o = JSON.parse(e.data);
    } catch {
      return;
    }
    PRES.recv++;
    o && typeof o == "object" && presMsg(o);
  };
  w.onclose = w.onerror = () => {
    if (PRES.ws !== w) return;
    PRES.ws = null;
    PRES.st = "off";
    PRES.room = "";
    PRES.list.clear();
    presRetry();
  };
}
function presRetry() {
  PRES.retry = Math.min(6, PRES.retry + 1);
  PRES.retryAt = Date.now() + 1e3 * 2 ** PRES.retry;
}
function presClose() {
  if (presFirebaseOn()) {
    presLeaveFirebase();
  }
  const w = PRES.ws;
  PRES.ws = null;
  PRES.st = "off";
  PRES.room = "";
  PRES.list.clear();
  if (w)
    try {
      w.close();
    } catch {}
}
function presJoin() {
  PRES.lastS = JSON.stringify((PRES.snap = presSnap()));
  PRES.lastP = "";
  presSend({ t: "join", map: PRES.map, s: PRES.snap, p: presP(H), q: presQ() });
}
function presMsg(o) {
  switch (o.t) {
    case "deploy": // the server is being replaced (js/deploy.js)
      typeof deployNotice == "function" && deployNotice(o.build, !0);
      break;
    case "hi":
      typeof deployNotice == "function" && deployNotice(o.build, !1);
      PRES.st = "ok";
      PRES.me = String(o.id || "");
      PRES.retry = 0;
      PRES.map && presJoin();
      break;
    case "room":
      if (String(o.map) !== PRES.map) return; // answer to an older join (a newer join / leave is queued)
      PRES.room = String(o.map);
      PRES.ch = o.ch | 0;
      PRES.list.clear();
      for (const m of Array.isArray(o.l) ? o.l : []) presAdd(m);
      break;
    case "add":
      PRES.room && presAdd(o);
      break;
    case "look": {
      const p = PRES.list.get(String(o.id));
      p && presSetSnap(p, o.s);
      break;
    }
    case "mv":
      if (!PRES.room || !Array.isArray(o.l)) return;
      for (const r of o.l) {
        const p = Array.isArray(r) && PRES.list.get(String(r[0]));
        p && presMove(p, r[1], r[2]);
      }
      break;
    case "del":
      PRES.list.delete(String(o.id));
      break;
    case "err":
      if (o.c === "auth")
        (presClose(), (PRES.retryAt = Date.now() + 6e4)); // session gone: net.js shows its gate
      else if (o.c === "map") PRES.room = "";
      break;
  }
}

// ---------------------------------------------------------------- remote players
const presNum = (v, lo, hi) => (Number.isFinite(+v) ? Math.max(lo, Math.min(hi, Math.round(+v))) : lo);
function presCleanChar(c) {
  c = c && typeof c == "object" ? c : {};
  const r = Array.isArray(c.r) ? c.r : [];
  return {
    n: String(c.n || "").slice(0, 20),
    f: FAC[c.f] ? c.f : "",
    x: c.x ? 1 : 0,
    l: presNum(c.l, 1, 999),
    k: presNum(c.k, 0, 99999),
    r: [0, 1, 2, 3].map((i) => presNum(r[i] ?? -1, -1, 255)),
    m: c.m ? 1 : 0,
    tk: c.tk ? String(c.tk).slice(0, 30) : "",
    tn: c.tn ? String(c.tn).slice(0, 30) : "",
    tc: c.tc ? String(c.tc).slice(0, 20) : "",
    hk: c.hk ? String(c.hk).slice(0, 10) : "",
    rb: presNum(c.rb, 0, 99),
  };
}
function presEnt(p) {
  const e = { x: 0, y: 0, dir: 0, act: "st", actT: Math.random() * 2, buf: [], runT: 0, atkT: 0, oth: null };
  p && presSample(e, p, !0);
  return e;
}
function presAdd(o) {
  const id = String(o.id || "");
  if (!id || id === PRES.me) return;
  const p = { id, s: null, ent: presEnt(o.p), d: [] };
  p.ent.oth = { p, k: -1 };
  presSetSnap(p, o.s);
  presMove(p, null, o.q, !0);
  PRES.list.set(id, p);
}
function presSetSnap(p, s) {
  s = s && typeof s == "object" ? s : {};
  const c = presCleanChar(s);
  c.v = s.v ? 1 : 0;
  c.rb = presNum(s.rb, 0, 99);
  c.tk = s.tk || "";
  c.tn = s.tn || "";
  c.tc = s.tc || "";
  c.hk = s.hk || "";
  c.pc = typeof PT_CAMP < "u" && PT_CAMP[s.pc] ? s.pc : ""; // party colour ("" = older client: per-character colours)
  c.d = (Array.isArray(s.d) ? s.d : []).slice(0, 6).map(presCleanChar);
  p.s = c;
  p.look = presLook(c);
  p.dl = c.d.map(presLook);
  while (p.d.length < c.d.length) {
    const e = presEnt([p.ent.x - 26 * (p.d.length + 1), p.ent.y + 12, 0, 0]);
    e.oth = { p, k: p.d.length };
    p.d.push(e);
  }
  p.d.length = c.d.length;
}
function presMove(p, pos, q, snap) {
  pos && presSample(p.ent, pos, snap);
  if (Array.isArray(q)) for (let i = 0; i < p.d.length && i < q.length; i++) q[i] && presSample(p.d[i], q[i], snap);
}
// position sample -> interpolation buffer (time of arrival)
function presSample(e, p, snap) {
  if (!Array.isArray(p) || p.length < 2) return;
  const t = performance.now(),
    s = { t, x: +p[0] || 0, y: +p[1] || 0, d: (p[2] | 0) & 7, a: p[3] | 0, sk: (p[4] | 0) },
    b = e.buf,
    l = b[b.length - 1];
  if (s.a === 2) {
    e.atkT = 0.45;
    e.act = "at";
    e.actT = 0;
    e.dir = s.d;
    e.castSk = s.sk;
  }
  if (snap || !l || Math.hypot(s.x - l.x, s.y - l.y) > 600) {
    b.length = 0;
    b.push(s);
    e.x = s.x;
    e.y = s.y;
    e.dir = s.d;
    return;
  }
  // was standing still: it stood at the last point until just before this sample
  t - l.t > 250 && b.push({ t: t - 1e3 / PRES_HZ, x: l.x, y: l.y, d: l.d, a: 0 });
  b.push(s);
  b.length > 12 && b.splice(0, b.length - 12);
}
// interpolated position at (now - PRES_DELAY), run / stand animation from the actual displacement
function presStepEnt(e, now, dt) {
  const b = e.buf;
  if (!b.length) return;
  const rt = now - PRES_DELAY;
  while (b.length > 2 && b[1].t <= rt) b.shift();
  let x, y, d;
  if (b.length === 1 || rt <= b[0].t) ((x = b[0].x), (y = b[0].y), (d = b[0].d));
  else {
    const a = b[0],
      c = b[1],
      k = Math.min(1, (rt - a.t) / Math.max(1, c.t - a.t));
    ((x = a.x + (c.x - a.x) * k), (y = a.y + (c.y - a.y) * k), (d = c.d));
    k >= 1 && b.length === 2 && b.shift();
  }
  const dist = Math.hypot(x - e.x, (y - e.y) * 2);
  dist > 0.05 && (e.runT = 0.12);
  e.runT -= dt;
  if (e.atkT > 0) {
    e.atkT -= dt;
    e.act = "at";
    e.actT += dt;
    if (e.atkT <= 0) {
      e.act = e.runT > 0 ? "run" : "st";
      e.actT = 0;
    }
  } else {
    const act = e.runT > 0 ? "run" : "st";
    act !== e.act && ((e.act = act), (e.actT = 0));
    e.actT += act === "run" ? (Math.min(dist, 96) / 10) * ((typeof JX_MS == "object" ? JX_MS.run : 42.5) / 1e3) : dt;
  }
  e.x = x;
  e.y = y;
  e.dir = d;
}
// JX look of a snapshot (pure: never reads the local S / R): the tail of jxSetup() with the sent rows.
const PRES_LOOKS = new Map();
function presLook(c) {
  if (!JXL || !c || !c.f) return null;
  const sx = c.x ? "f" : "m",
    r = c.r,
    rows = { helm: r[0], armor: r[1], weapon: Math.max(0, r[2]), horse: c.m && r[3] >= 0 ? r[3] : -1 },
    a0 = JXL.assoc[sx] || {},
    w = (JXL.wnames[sx] || [])[rows.weapon] || "空手",
    s = a0[w] || a0.空手,
    ride = rows.horse >= 0 && s && s[1] ? 1 : 0,
    key = JSON.stringify([sx, rows, ride]);
  let L = PRES_LOOKS.get(key);
  if (!L) {
    L = { sx, rows, asc: s ? s[ride] || s[0] : {}, ride, key };
    PRES_LOOKS.size > 300 && PRES_LOOKS.clear();
    PRES_LOOKS.set(key, L);
  }
  return L;
}
// once per frame (shadows run before the depth-sorted bodies)
function presStep() {
  const now = performance.now();
  if (now - PRES.stepAt < 4) return;
  const dt = Math.min(0.1, (now - (PRES.stepAt || now)) / 1e3);
  PRES.stepAt = now;
  const out = (PRES.drawn = []);
  if (!PRES.list.size || !PRES.room || presMapId() !== PRES.room) return;
  const cand = [];
  for (const p of PRES.list.values()) {
    JXL && !p.look && p.s.f && ((p.look = presLook(p.s)), (p.dl = p.s.d.map(presLook))); // jxlook.js arrived late
    presStepEnt(p.ent, now, dt);
    for (const e of p.d) presStepEnt(e, now, dt);
    (onScreen(p.ent.x, p.ent.y, 220) || p.d.some((e) => onScreen(e.x, e.y, 200))) &&
      cand.push([Math.hypot(p.ent.x - H.x, (p.ent.y - H.y) * 2), p]);
  }
  cand.sort((a, b) => a[0] - b[0]);
  const hideOtherParty = !!(typeof S == "object" && S && (S.hideOtherParty || S.partyAway));
  let n = 0;
  for (const [, p] of cand.slice(0, PRES_MAX_DRAW)) {
    if (n >= PRES_MAX_ACT) break;
    out.push(p.ent);
    n++;
    if (!hideOtherParty && p.s.d.length) for (const e of p.d) n < PRES_MAX_ACT && onScreen(e.x, e.y, 200) && (out.push(e), n++);
  }
}
const presLookOf = (e) => (e.oth.k < 0 ? e.oth.p.look : e.oth.p.dl[e.oth.k]);
// name colour of a remote character: the player's party colour (s.pc) for the main and every disciple; older
// clients send none -> main in its faction camp colour, disciples PRES_DCOL. fac null = a disciple
function presCol(s, fac, def) {
  if (s && s.pc && typeof PT_CAMP < "u" && PT_CAMP[s.pc]) return PT_CAMP[s.pc].c;
  if (fac === null) return PRES_DCOL;
  return typeof campCol == "function" ? campCol(fac) : def || NAME_COL.hero;
}
const presCharOf = (e) => (e.oth.k < 0 ? e.oth.p.s : e.oth.p.s.d[e.oth.k]);
const presJx = () => typeof jxOn == "function" && jxOn();
// render.js: depth-sorted entries
function othEnts() {
  presStep();
  return PRES.drawn.map((e) => ({ oth: e, x: e.x, y: e.y }));
}
function othShadows(c) {
  presStep();
  for (const e of PRES.drawn) {
    const ch = presCharOf(e),
      L = presLookOf(e);
    if (!ch) continue;
    if (presJx() && L && shJxHero(c, e.act, e.dir, e.actT, e.x, e.y, HERO_SCALE, null, L)) continue;
    const g = heroGfx(ch.f, ch.x);
    g && g.anim && shAnim(c, g.anim, e.act, e.dir, e.actT, e.x, e.y, HERO_SCALE);
  }
}
function othDraw(c, e) {
  const ch = presCharOf(e),
    L = presLookOf(e);
  if (!ch) return;
  const main = e.oth.k < 0;

  // 1. Draw Halo (vòng sáng) under foot for main character
  if (main) {
    if (ch.hk && typeof drawHalo === "function") {
      drawHalo(c, ch.hk, e.x, e.y, 0.96);
    } else if (ch.rb > 0 && typeof JXCS !== "undefined") {
      const csIdx = Math.min(5, ch.rb);
      if (JXCS[csIdx] && typeof drawState === "function") {
        drawState(c, JXCS[csIdx], e.x, e.y, 0, (typeof R !== "undefined" && R.clock) || 0, (typeof ST_HERO_K !== "undefined" ? ST_HERO_K : 1 / 0.6), 0.95);
      }
    }
  }

  let h = 0;
  const jx = presJx() && L;
  // layered look: nothing until all its sheets are loaded (no pop from the old single-sheet sprite)
  if (jx) h = drawJxHero(e.act, e.dir, e.actT, e.x, e.y, HERO_SCALE, 1, null, L);
  else {
    const g = heroGfx(ch.f, ch.x);
    h = g && g.anim ? drawAnim(g.anim, e.act, e.dir, e.actT, e.x, e.y, HERO_SCALE) : 0;
  }
  if (!h) ((c.fillStyle = "#0007"), c.beginPath(), c.ellipse(e.x, e.y, 14, 5, 0, 0, 7), c.fill());
  if (PRES.hover === e && h && presJx() && L) {
    c.save();
    c.globalCompositeOperation = "lighter";
    drawJxHero(e.act, e.dir, e.actT, e.x, e.y, HERO_SCALE, 0.3, null, L);
    c.restore();
  }
  // JX1 pate height (render.js heroLabelLift) of the remote character
  const lift = 10 + Math.round(((ch.x ? 80 : 90) + (ch.m ? 20 : 0) + 13) * 0.866);
  const subText = main && ch.tn ? (ch.tk === "admin" ? ch.tn : `«${ch.tn}»`) : "";
  const subCol = main && ch.tc ? ch.tc : "#ffd700";
  label(
    e.x,
    e.y - lift,
    `${ch.n || facName(ch.f) || "?"} · Lv${ch.l}`,
    presCol(e.oth.p.s, main ? ch.f : null),
    main ? 12 : 11,
    -1,
    "",
    subText,
    subCol,
  );
}

// ---------------------------------------------------------------- send loop
function presTick() {
  if (presFirebaseOn()) {
    presTickFirebase();
    return;
  }
  if (!presOn()) {
    PRES.ws && presClose();
    return;
  }
  const id = presMapId(),
    now = Date.now();
  if (id !== PRES.map) {
    PRES.map = id;
    if (!id) {
      PRES.room && presSend({ t: "leave" });
      PRES.room = "";
      PRES.list.clear();
      PRES.idleAt = now;
    } else if (PRES.st === "ok") presJoin();
  }
  if (!id) {
    PRES.ws && now - PRES.idleAt > PRES_IDLE_CLOSE && presClose();
    return;
  }
  if (!PRES.ws) return presConnect();
  if (PRES.st !== "ok" || !PRES.room) return;
  // appearance: once a second, sent only when it changed
  if (now - PRES.sT > 1e3) {
    PRES.sT = now;
    const s = presSnap(),
      j = JSON.stringify(s);
    j !== PRES.lastS && ((PRES.lastS = j), (PRES.snap = s), presSend({ t: "look", s }));
  }
  const p = presP(H),
    q = presQ(),
    j = JSON.stringify([p, q]);
  j !== PRES.lastP && ((PRES.lastP = j), presSend({ t: "mv", p, q }));
}

// ---------------------------------------------------------------- click -> info popup
// remote actor (player or disciple) under the point, nearest to the viewer first
function presAt(x, y) {
  let best = null;
  for (const e of PRES.drawn) {
    const ch = presCharOf(e);
    if (!ch) continue;
    const top = (ch.x ? 80 : 90) + (ch.m ? 20 : 0),
      w = e.oth.k < 0 ? 18 : 16;
    x >= e.x - w && x <= e.x + w && y >= e.y - top && y <= e.y + 6 && (!best || e.y > best.y) && (best = e);
  }
  return best;
}
function presPt(e) {
  const r = CV.getBoundingClientRect(),
    s = typeof uiScale == "function" ? uiScale() : 1;
  return [(e.clientX - r.left) / s + CAM.x, (e.clientY - r.top) / s + CAM.y];
}
function presPointerDown(e) {
  if (!PRES.drawn.length || e.target !== CV || (e.button != null && e.button > 0)) return;
  const [x, y] = presPt(e);
  if (typeof npcAt == "function" && npcAt(x, y)) return; // town NPCs first (js/npc.js)
  const a = presAt(x, y);
  if (!a) return;
  e.stopPropagation();
  e.stopImmediatePropagation();
  e.preventDefault();
  presInfo(a.oth.p, a.oth.k);
}
function presPointerMove(e) {
  if (!PRES.drawn.length || e.pointerType === "touch") return void (PRES.hover = null);
  const [x, y] = presPt(e),
    a = presAt(x, y);
  if (PRES.hover !== a) {
    PRES.hover = a;
    !(typeof NPCV == "object" && NPCV.hover) && (CV.style.cursor = a ? "pointer" : "");
  }
}
const presSkill = (k) => {
  const s = k && SK[k];
  return s
    ? `${s.ic ? `<img src="${esc(s.ic)}" alt="" style="width:18px;height:18px;vertical-align:middle"> ` : ""}${esc(s.n || "")}`
    : "Đánh thường";
};
// Popup of remote player p on tab k (-1 = main, 0.. = its disciple k): the main character and every disciple
// from the player's latest stored save (GET /api/char/view, server/charview.py), read-only. Falls back to the
// former ranking-gear popup (main character only) when the endpoint fails.
const PRES_VIEW_TTL = 1e4;
async function presInfo(p, k = -1) {
  const s = p.s,
    want = k >= 0 && s.d[k] ? s.d[k].n : s.n;
  if (typeof CHAT !== "undefined" && CHAT.isFirebase && typeof profileModal === "function") {
    return profileModal(want || s.n);
  }
  if (p.view && Date.now() - p.viewT < PRES_VIEW_TTL) return presView(p, presViewIdx(p.view, want, k));
  const tok = (PRES.viewTok = {});
  modal(`<h3>${esc(want || "?")}</h3><p class="dim small">Đang tải trang bị…</p>`);
  try {
    const q = s.v ? "name=" + encodeURIComponent(s.n) : "id=" + encodeURIComponent(p.id),
      r = await API.get("/api/char/view?" + q);
    if (PRES.viewTok !== tok) return;
    if (!r || !Array.isArray(r.chars) || !r.chars.length) throw new Error("empty");
    p.view = presViewClean(r.chars);
    p.viewT = Date.now();
    $("#modal").classList.contains("hidden") || presView(p, presViewIdx(p.view, want, k));
  } catch {
    PRES.viewTok === tok && !$("#modal").classList.contains("hidden") && presInfoOld(p);
  }
}
// tab of the clicked character: by name, else by its party position
function presViewIdx(v, name, k) {
  const i = name ? v.findIndex((c) => c.name === name) : -1;
  return i >= 0 ? i : k >= 0 && k + 1 < v.length ? k + 1 : 0;
}
// server data comes from another player's save: keep only items the client knows how to draw
function presViewClean(l) {
  return l.slice(0, 7).map((c) => {
    const eq = {};
    for (const [sl] of SLOTS) {
      const it = c.eq && c.eq[sl];
      it && typeof it == "object" && J.items[it.d] && typeof it.n == "string" && it.n && (eq[sl] = presItem(it));
    }
    return {
      name: String(c.name || "").slice(0, 20),
      fac: FAC[c.fac] ? c.fac : "",
      sex: c.sex ? 1 : 0,
      lvl: presNum(c.lvl, 0, 999),
      reborn: presNum(c.reborn, 0, 999),
      main: presNum(c.main, 0, 99999),
      eq,
    };
  });
}
function presItem(it) {
  const o = Object.assign({}, it);
  o.r = presNum(o.r, 0, RAR_COL.length - 1);
  o.lvl = presNum(o.lvl, 1, 999);
  for (const a of ["mag", "base", "req"]) Array.isArray(o[a]) || (o[a] = []);
  (typeof o.ic != "string" || !/^img\/[\w\/.-]+\.(png|webp|jpg)$/.test(o.ic) || o.ic.includes("..")) && delete o.ic;
  return o;
}
// item lines as seen on its owner (set counts, hidden lines activated by its own gear and faction);
// requirement lines are not judged against the viewer. S is restored before anything else can run.
function presItemHTML(it, c) {
  const eq0 = S.eq,
    fac0 = S.fac;
  try {
    S.eq = c.eq;
    S.fac = c.fac || fac0;
    return itemHTML(it).replace(/class="rq"/g, 'class="b"');
  } catch {
    return `<h4 style="color:${RAR_COL[it.r] || "#ddd"}">${esc(it.n)}</h4><p class="dim small">Không đọc được chi tiết món đồ.</p>`;
  } finally {
    S.eq = eq0;
    S.fac = fac0;
  }
}
// JX look row of a stored item (jxRow without the viewer's requirement check: it is worn by its owner)
function presJxRow(n, it) {
  const t = JXL && JXL.res[n];
  if (!t) return -1;
  const pp = it && typeof jxItemP == "function" ? jxItemP(it) : -1,
    r = t[pp >= 0 ? pp + 2 : 1] ?? t[1];
  return r == null ? -1 : r - 2;
}
function presViewLook(c) {
  if (!JXL || !c.fac) return null;
  if (c.look) return c.look;
  if (c.r && Array.isArray(c.r)) return presLook({ f: c.fac, x: c.sex, m: c.m != null ? c.m : (c.eq && c.eq.horse ? 1 : 0), r: c.r });
  const q = c.eq || {},
    w = q.weapon;
  return presLook({
    f: c.fac,
    x: c.sex,
    m: c.m != null ? c.m : (q.horse ? 1 : 0),
    r: [presJxRow("helm", q.helm), presJxRow("armor", q.armor), presJxRow(w && w.d === 1 ? "range" : "melee", w), -1],
  });
}
function presView(p, sel) {
  const v = p.view,
    c = v[sel] || v[0],
    s = p.s,
    live = [s].concat(s.d).find((x) => x.n === c.name), // live main skill from the town snapshot
    sk = (live && live.k) || c.main,
    f = FAC[c.fac],
    col = (c && c.nameCol) || presCol(s, sel ? null : c.fac, "#ffd76a"),
    tabs = `<div class="dtabs ptabs prtabs">${v
      .map((x, i) => {
        const g = typeof heroGfx == "function" ? heroGfx(x.fac, x.sex) : null,
          xf = FAC[x.fac];
        return `<button data-pv="${i}" class="${i === sel ? "on" : ""}" title="${esc(x.name)}${i ? " (đồ đệ)" : " (nhân vật chính)"} · ${xf ? esc(xf.n) : ""} · cấp ${x.lvl}"><b class="pn">${i + 1}</b>${g && g.img ? `<img src="${esc(g.img)}" alt="">` : ""}<span class="pnm" style="color:${xf ? SERIES_COL[xf.series] : "#ddd"}">${esc(x.name || "?")}</span><small>${x.lvl}</small></button>`;
      })
      .join("")}</div>`,
    doll = SLOTS.map(([sl, nm]) => {
      const [x, y, w, h] = U2_DOLL[sl],
        it = c.eq[sl];
      return `<div class="u2s slot" data-ps="${sl}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px">${it ? netCell(it).replace(/data-uid="[^"]*"/, `data-ps="${sl}"`) : `<span>${nm}</span>`}</div>`;
    }).join(""),
    n = Object.keys(c.eq).length;
  modal(
    `${c.title ? `<div style="text-align:center;color:${c.titleCol || "#ff3333"};font-weight:900;letter-spacing:2px;font-size:14px;margin-bottom:4px;text-shadow:0 0 6px rgba(255,51,51,0.5)">${esc(c.title)}</div>` : ""}
    <h3 style="color:${col}">${esc(c.name || "?")} <small>${sel ? "đồ đệ của " + esc(v[0].name) + " · " : ""}${esc(facName(c.fac))} · cấp ${c.lvl}${c.reborn ? ` · chuyển sinh ${c.reborn}` : ""}</small></h3>
    ${v.length > 1 ? tabs : ""}
    <div class="prview"><div class="prdollw"><div class="u2doll prdoll"><canvas id="prDoll" width="252" height="300"></canvas>${doll}</div>
      <div class="prsk small">${f ? `<b style="color:${SERIES_COL[f.series]}">${esc(f.n)}</b> · ` : ""}Võ công chính: <b class="gold">${presSkill(sk)}</b></div></div>
      <div class="prdet" id="prDet">${n ? '<p class="dim small">Rê chuột / chạm vào một món để xem chi tiết.</p>' : '<p class="dim small">Không mặc trang bị nào.</p>'}</div></div>
    <div class="btnrow"><button class="btn" id="prB">Đóng</button></div>`,
    () => {
      $("#prB").onclick = () => closeModal();
      document.querySelectorAll("#mBody [data-pv]").forEach((b) => (b.onclick = () => presView(p, +b.dataset.pv)));
      const show = (sl) => {
        const it = c.eq[sl],
          d = $("#prDet");
        if (!it || !d || d.dataset.sl === sl) return;
        d.dataset.sl = sl;
        d.innerHTML = presItemHTML(it, c);
        document.querySelectorAll("#mBody .prdoll .u2s").forEach((e) => e.classList.toggle("on", e.dataset.ps === sl));
      };
      document.querySelectorAll("#mBody .prdoll .u2s").forEach((e) => {
        e.onmouseenter = () => show(e.dataset.ps);
        e.onclick = () => show(e.dataset.ps);
      });
      const first = SLOTS.find(([sl]) => c.eq[sl]);
      first && show(first[0]);
      presDrawDoll($("#prDoll"), presViewLook(c));
    },
  );
}
// the character standing on the doll (u2DrawDoll with an explicit look): drawn 1:1 off screen, cropped,
// scaled up by a whole factor
function presDrawDoll(n, L, tries = 0) {
  if (!n || !L || typeof drawJxHero != "function") return;
  const a = document.createElement("canvas");
  a.width = a.height = 600;
  const c = a.getContext("2d"),
    s = CX;
  CX = c;
  let ok = !1;
  try {
    ok = drawJxHero("st", 0, 0, 300, 440, 1, 1, null, L);
  } catch {
    ok = !1;
  } finally {
    CX = s;
  }
  if (!ok) return void (tries < 15 && setTimeout(() => n.isConnected && presDrawDoll(n, L, tries + 1), 400));
  const t = c.getImageData(0, 0, 600, 600).data;
  let x0 = 600,
    x1 = 0,
    y0 = 600,
    y1 = 0;
  for (let i = 3; i < t.length; i += 16)
    if (t[i] > 20) {
      const k = (i - 3) / 4,
        x = k % 600,
        y = (k / 600) | 0;
      (x < x0 && (x0 = x), x > x1 && (x1 = x), y < y0 && (y0 = y), y > y1 && (y1 = y));
    }
  if (x1 <= x0) return;
  const w = x1 - x0 + 4,
    h = y1 - y0 + 4,
    q = Math.min(236 / w, 284 / h),
    l = q >= 2 ? Math.floor(q) : q,
    g = n.getContext("2d");
  g.imageSmoothingEnabled = l !== Math.round(l);
  g.clearRect(0, 0, n.width, n.height);
  g.drawImage(a, x0 - 2, y0 - 2, w, h, Math.round((252 - w * l) / 2), Math.round(296 - h * l), w * l, h * l);
}
// the former popup (main character, ranking gear from /api/profile): fallback when /api/char/view fails
async function presInfoOld(p) {
  const s = p.s,
    col = presCol(s, s.f, "#ffd76a"),
    head = `<h3 style="color:${col}">${esc(s.n || "?")} <small>${esc(facName(s.f))} · cấp ${s.l}${s.rb ? ` · chuyển sinh ${s.rb}` : ""}</small></h3>
    <p class="small">Võ công chính: ${presSkill(s.k)}${s.m ? " · đang cưỡi ngựa" : ""}</p>
    ${
      s.d.length
        ? `<p class="small">Đồ đệ: ${s.d.map((d) => `<b style="color:${presCol(s, null)}">${esc(d.n)}</b> <small class="dim">${esc(facName(d.f))} ${d.l}</small>`).join(" · ")}</p>`
        : ""
    }`,
    back = () => closeModal(),
    done = (body) =>
      modal(`${head}${body}<div class="btnrow"><button class="btn" id="prB">Đóng</button></div>`, () => {
        $("#prB").onclick = back;
        document.querySelectorAll("#mBody [data-pk]").forEach((r) => {
          r.onclick = () => netItemModal(p.gear[r.dataset.pk], "", () => presInfoOld(p));
        });
      });
  if (!s.v) return done('<p class="dim small">Nhân vật chưa liên kết bảng xếp hạng: chưa xem được trang bị.</p>');
  if (p.gear && Date.now() - p.gearT < 6e4) return done(presGear(p.gear));
  done('<p class="dim small">Đang tải trang bị…</p>');
  try {
    const r = await API.get("/api/profile?name=" + encodeURIComponent(s.n));
    p.gear = (r && r.gear) || {};
    p.gearT = Date.now();
    $("#prB") && done(presGear(p.gear));
  } catch (e) {
    $("#prB") && done(`<p class="reqbad">${esc(e.message)}</p>`);
  }
}
function presGear(g) {
  return `<div class="pfgrid">${SLOTS.map(
    ([c, r]) =>
      `<div class="pfs"><small class="dim">${r}</small>${g[c] ? netCell(g[c]).replace("data-uid=", `data-pk="${c}" data-x=`) : '<div class="it"></div>'}</div>`,
  ).join("")}</div>`;
}

// ---------------------------------------------------------------- test helper: fake remote players
// presFake(20): n fake players walking around the hero (frame cost measurement); presFake(0) removes them.
function presFake(n) {
  for (const id of [...PRES.list.keys()]) id.startsWith("fake") && PRES.list.delete(id);
  clearInterval(PRES.fakeT);
  if (!n) return;
  PRES.room = PRES.map = presMapId() || PRES.map;
  const facs = Object.keys(FAC).filter((f) => !FAC[f].novice),
    pts = [];
  for (let i = 0; i < n; i++) {
    const f = facs[i % facs.length],
      x = H.x + rnd(-300, 300),
      y = H.y + rnd(-160, 160);
    presAdd({
      id: "fake" + i,
      s: {
        n: "Khách " + i,
        f,
        x: i & 1,
        l: 10 + i,
        k: 0,
        r: [i % 5, i % 7, i % 9, i % 4],
        m: i % 3 === 0 ? 1 : 0,
        d: i % 4 ? [] : [{ n: "Đệ " + i, f, l: 5, r: [0, 0, 0, -1] }],
        pc: i % 4 ? "" : ["free", "blue", "green", "event"][(i >> 2) % 4],
      },
      p: [x, y, 0, 0],
      q: [[x - 26, y + 12, 0, 0]],
    });
    pts.push([x, y]);
  }
  let t = 0;
  PRES.fakeT = setInterval(() => {
    t += 1 / PRES_HZ;
    for (let i = 0; i < n; i++) {
      const p = PRES.list.get("fake" + i);
      if (!p) continue;
      const a = t * 0.6 + i,
        x = pts[i][0] + Math.cos(a) * 120,
        y = pts[i][1] + Math.sin(a) * 60;
      presMove(p, [x, y, dirOf(-Math.sin(a), Math.cos(a)), 1], [[x - 26, y + 12, 0, 1]]);
    }
  }, 1e3 / PRES_HZ);
}

// ---------------------------------------------------------------- install
function presInstall() {
  setInterval(() => {
    try {
      presTick();
    } catch (e) {
      console.warn("presence", e);
    }
  }, 1e3 / PRES_HZ);
  window.addEventListener("pointerdown", (e) => presPointerDown(e), !0);
  window.addEventListener(
    "pointermove",
    (e) => typeof CV != "undefined" && e.target === CV && presPointerMove(e),
  );
  window.addEventListener("beforeunload", () => presClose());
}
document.readyState === "loading"
  ? document.addEventListener("DOMContentLoaded", presInstall)
  : setTimeout(presInstall, 0);
