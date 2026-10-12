"use strict";
// Full JX1 maps (docs/map-format.md): lazy meta loader, streamed ground tiles,
// depth-sorted object sprites and crop-space <-> full-map coordinate migration.
window.JMAP = window.JMAP || {};
window.NO_JMAP = true;
const JXM = {
  v: ((document.currentScript && /[?&]v=([^&]+)/.exec(document.currentScript.src)) || [])[1] || "1",
  st: {}, // id -> "load" | "ok" | "miss"
  cb: {}, // id -> [callbacks]
  cur: null, // prepared JMAP of the active map, or null (fallback JMO / jpg path)
  off: { x: 0, y: 0 }, // crop offset of the active map (old crop space -> current space)
  // decoded images (one cache shared by mapPreload and the renderer), per map "store" {id, tiles: Map("rx_ry" ->
  // entry), oimg: [entry by image index], mini: entry}; entry = {u, im (decoded image or null), bad, p: Promise}
  cs: { id: "", tiles: new Map(), oimg: [], mini: null }, // store of the active map
  pre: null, // store being preloaded for the next map (adopted by jxmSetMap)
  prev: null, // store of the map left last (trimmed): going back (town, dungeon exit) needs no new download
  mq: {}, // id -> Promise of its meta (jxmMeta)
  above: [],
  stamp: 0,
  t: 0,
  TILE_KEEP: 2, // keep tiles up to this many tiles outside the visible range
  fadeA: 0.7, // opacity of an object while it hides the hero (JX1 style)
  KEEP: 5, // map caches kept on the device (most recently visited maps)
  lands: {}, // id -> [x, y] landing point (Thần Hành Phù / town return point), full-map px
  landPending: null, // map id whose landing is applied when its meta arrives
  pf: null, // background prefetch token
};
// ---- device cache: one Cache Storage cache per map (filled by sw.js), LRU of the KEEP last visited maps.
const JXM_CP = "jxm1-",
  JXM_LRU = "jxm_lru";
function jxmLru() {
  if (!JXM.lru) {
    try {
      JXM.lru = JSON.parse(localStorage.getItem(JXM_LRU) || "[]").map(String);
    } catch {}
    Array.isArray(JXM.lru) || (JXM.lru = []);
  }
  return JXM.lru;
}
// Marks id as the most recent map; opens its cache (so sw.js stores its files) and drops the oldest
// maps' caches. -> {had: was already cached, p: Promise (cache ready)}
function jxmTouch(id) {
  id = String(id);
  const l = jxmLru(),
    i = l.indexOf(id),
    had = i >= 0;
  had && l.splice(i, 1);
  l.unshift(id);
  const old = l.splice(JXM.KEEP);
  try {
    localStorage.setItem(JXM_LRU, JSON.stringify(l));
  } catch {}
  let p = Promise.resolve();
  try {
    if (typeof caches != "undefined") {
      p = caches.open(JXM_CP + id).then(
        () => {},
        () => {},
      );
      for (const o of old) caches.delete(JXM_CP + o).catch(() => {});
    }
  } catch {}
  try {
    for (const o of old) JXM.thumbs[o] && (URL.revokeObjectURL(JXM.thumbs[o]), delete JXM.thumbs[o], delete JXM.thumbs["_" + o]);
  } catch {}
  return { had, p };
}
// Drop map caches that are not in the LRU (e.g. after localStorage was cleared).
function jxmCacheSweep() {
  try {
    typeof caches != "undefined" &&
      caches
        .keys()
        .then((ks) => {
          const l = jxmLru();
          for (const k of ks) k.startsWith(JXM_CP) && !l.includes(k.slice(JXM_CP.length)) && caches.delete(k);
        })
        .catch(() => {});
  } catch {}
}
setTimeout(jxmCacheSweep, 3e3);
// A map that failed to load leaves the LRU (and its empty cache).
function jxmForget(id) {
  const l = jxmLru(),
    i = l.indexOf(String(id));
  if (i < 0) return;
  l.splice(i, 1);
  try {
    localStorage.setItem(JXM_LRU, JSON.stringify(l));
    typeof caches != "undefined" && caches.delete(JXM_CP + id).catch(() => {});
  } catch {}
}
const jxmCached = (id) => jxmLru().includes(String(id));
function jxmName(id) {
  const L = window.JMAP_LIST,
    e = Array.isArray(L) && L.find((m) => String(m.id) === String(id)),
    d = window.TH_DEST && TH_DEST.dest.find((m) => String(m.id) === String(id));
  return (d && d.n) || (e && e.name) || "";
}
// ---- decoded image cache (JXM.cs / pre / prev stores), filled through jxmLoadImage (map file loaders below)
const jxmIW = (im) => (im && (im.naturalWidth || im.width)) || 0,
  jxmIRel = (im) => {
    try {
      im && (im.close ? im.close() : (im.src = ""));
    } catch {}
  },
  jxmNewStore = (id) => ({ id: String(id), tiles: new Map(), oimg: [], mini: null });
// entry for map file f of map id: {u: "<id>/<f>", im: decoded image once loaded, bad: failed, p: Promise}
function jxmIE(id, f) {
  const e = { u: `${id}/${f}`, im: null, bad: !1, dead: !1 };
  e.p = Promise.resolve()
    .then(() => jxmLoadImage(id, f))
    .then(
      (im) => (e.dead ? jxmIRel(im) : (e.im = im), e),
      () => ((e.bad = !0), e),
    );
  return e;
}
function jxmIFree(e) {
  if (!e) return;
  e.dead = !0;
  e.im && (jxmIRel(e.im), (e.im = null));
}
function jxmFreeStore(s) {
  if (!s) return;
  for (const e of s.tiles.values()) jxmIFree(e);
  for (const e of s.oimg) jxmIFree(e);
  jxmIFree(s.mini);
}
// Existing store of map id (active, being preloaded or the one left last), or null.
function jxmStoreGet(id) {
  id = String(id);
  for (const s of [JXM.cur && JXM.cs, JXM.pre, JXM.prev]) if (s && s.id === id) return s;
  return null;
}
// Store to load map id's images into: an existing one, else a new preload store (replaces the pending one).
function jxmStore(id) {
  const s = jxmStoreGet(id);
  if (s) return s;
  jxmFreeStore(JXM.pre);
  return (JXM.pre = jxmNewStore(id));
}
// Camera rect (full-map px) when the hero stands at pt on map m (render.js camTarget on that map).
function jxmCamRect(m, pt) {
  const x = clamp(pt && pt[0] >= 0 ? +pt[0] : m.w / 2, 0, m.w),
    y = clamp(pt && pt[1] >= 0 ? +pt[1] : m.h / 2, 0, m.h);
  return {
    x: clamp(x - AR.w / 2, 0, Math.max(0, m.w - AR.w)),
    y: clamp(y - AR.h * 0.55, 0, Math.max(0, m.h - AR.h)),
    w: AR.w,
    h: AR.h,
  };
}
// Image entries map m needs to draw camera rect r (+ mg tiles margin): minimap, ground tiles, object sprites.
// Missing entries are created (= start loading) in store s.
function jxmNeed(m, s, r, mg = 0) {
  const T = m.tile || 512,
    out = new Set();
  s.mini || (s.mini = jxmIE(m.id, "mini.webp"));
  out.add(s.mini);
  const x0 = Math.max(0, Math.floor(r.x / T) - mg),
    x1 = Math.min(m.rw - 1, Math.floor((r.x + r.w) / T) + mg),
    y0 = Math.max(0, Math.floor(r.y / T) - mg),
    y1 = Math.min(m.rh - 1, Math.floor((r.y + r.h) / T) + mg);
  for (let ry = y0; ry <= y1; ry++)
    for (let rx = x0; rx <= x1; rx++) {
      if (!m.tmask[ry * m.rw + rx]) continue;
      const k = rx + "_" + ry;
      let e = s.tiles.get(k);
      e || s.tiles.set(k, (e = jxmIE(m.id, `g/${k}.webp`)));
      out.add(e);
    }
  // object sprites touching the rect (jxmVisible's 32 px pad, half a tile more per margin step)
  const pad = 32 + (mg * T) / 2,
    cx0 = r.x - pad,
    cy0 = r.y - pad,
    cx1 = r.x + r.w + pad,
    cy1 = r.y + r.h + pad,
    seen = new Set();
  for (let ry = Math.max(0, Math.floor(cy0 / T)); ry <= Math.min(m.rh - 1, Math.floor(cy1 / T)); ry++)
    for (let rx = Math.max(0, Math.floor(cx0 / T)); rx <= Math.min(m.rw - 1, Math.floor(cx1 / T)); rx++)
      for (const o of m.bk[ry * m.rw + rx]) {
        if (seen.has(o)) continue;
        seen.add(o);
        if (!(o.x < cx1 && o.x + o.w > cx0 && o.y < cy1 && o.y + o.h > cy0)) continue;
        s.oimg[o.i] || (s.oimg[o.i] = jxmIE(m.id, "o/" + m.imgs[o.i]));
        out.add(s.oimg[o.i]);
      }
  const t = performance.now();
  for (const e of out) e.t = t; // wanted now: the draw loop's eviction leaves it alone for a while
  return [...out];
}
// The store of the map being left keeps only what is around the hero (going back lands there or close by).
function jxmTrimStore(s, m) {
  if (!s || !m || !m.rw) return;
  const T = m.tile || 512,
    cx = Math.floor(H.x / T),
    cy = Math.floor(H.y / T),
    r = 2,
    keep = new Set();
  for (const [k, e] of s.tiles) {
    const [x, y] = k.split("_").map(Number);
    (Math.abs(x - cx) > r || Math.abs(y - cy) > r) && (jxmIFree(e), s.tiles.delete(k));
  }
  for (let y = Math.max(0, cy - r); y <= Math.min(m.rh - 1, cy + r); y++)
    for (let x = Math.max(0, cx - r); x <= Math.min(m.rw - 1, cx + r); x++)
      for (const o of m.bk[y * m.rw + x]) keep.add(o.i);
  s.oimg.forEach((e, i) => e && !keep.has(i) && (jxmIFree(e), (s.oimg[i] = void 0)));
}
// ---- preload before travelling (js/maptravel.js): load first, then switch
// Preloads map id for a landing at (x, y) (full-map px; x may also be [x, y] or a function (meta) -> [x, y]):
// meta, minimap, every ground tile of the first screen + 1 tile margin (current viewport) and the object sprites
// there, decoded into the store the renderer adopts on the switch (nothing is fetched again). Towns (opt.town):
// npcdata.js and the visible NPCs' sprites too. opt.onp(fraction) reports progress.
// -> Promise<{ok, miss?, timeout?}>: ok false = the map could not be loaded (do not travel); resolves at the
// latest after opt.to ms (20 s) with timeout: true.
function mapPreload(id, x, y, opt = {}) {
  id = String(id);
  const onp = (f) => {
    try {
      opt.onp && opt.onp(clamp(f, 0, 1));
    } catch {}
  };
  let tid;
  const tmo = new Promise((r) => (tid = setTimeout(() => r({ ok: !0, timeout: !0 }), opt.to || 2e4))),
    run = (async () => {
      onp(0.02);
      if (window.NO_JMAP) return { ok: !0, miss: !0 };
      let m;
      try {
        m = await jxmMeta(id);
      } catch (e) {
        return { ok: !0, miss: !0 };
      }
      onp(0.15);
      const pt = typeof x == "function" ? x(m) : Array.isArray(x) ? x : [x, y],
        r = jxmCamRect(m, pt),
        ps = jxmNeed(m, jxmStore(id), r, 1).map((e) => e.p);
      opt.town && ps.push(jxmNpcPre(id, r));
      let k = 0;
      const one = () => onp(0.15 + (0.85 * ++k) / ps.length);
      await Promise.all(ps.map((p) => p.then(one, one)));
      return { ok: !0, pt };
    })();
  return Promise.race([run, tmo]).finally(() => clearTimeout(tid));
}
// Town NPCs (js/npc.js): npcdata.js and the stand sheets of the NPCs around rect r.
function jxmNpcPre(id, r) {
  if (typeof npcData != "function") return Promise.resolve();
  return new Promise((res) => {
    const f = () => (window.JNPC || (typeof NPCV == "object" && NPCV.st === 2) ? res() : setTimeout(f, 80));
    npcData();
    f();
  }).then(() => {
    const J = window.JNPC;
    if (!J || typeof img != "function") return;
    typeof npcInit == "function" && npcInit();
    const ps = [];
    for (const n of (J.maps && J.maps[id]) || []) {
      if (n.x < r.x - 200 || n.x > r.x + r.w + 200 || n.y < r.y - 60 || n.y > r.y + r.h + 300) continue;
      const a = W.anim && W.anim[n.a],
        st = a && a.st;
      if (!st) continue;
      const im = img("img/a/" + st.f + (typeof SPR_V == "string" ? SPR_V : ""));
      im.complete || ps.push(new Promise((ok) => (im.addEventListener("load", ok), im.addEventListener("error", ok))));
    }
    return Promise.all(ps);
  });
}
// Sync: can map id be shown at pt right now (meta + visible tiles / sprites decoded)? Missing images start loading.
function mapReady(id, pt, town) {
  if (window.NO_JMAP) return !0;
  id = String(id);
  if (JXM.st[id] === "miss" || (JXM.idx instanceof Set && !JXM.idx.has(id))) return !0;
  const m = JMAP[id] && jxmPrep(JMAP[id]),
    s = m && jxmStoreGet(id);
  if (!s || (town && typeof npcData == "function" && !window.JNPC)) {
    if (!JMAP[id]) return !0;
    return !1;
  }
  return jxmNeed(m, s, jxmCamRect(m, typeof pt == "function" ? pt(m) : pt), 0).every((e) => e.im || e.bad);
}
// Background prefetch of the tiles around the hero (low priority, one at a time) once a map is shown.
async function jxmPrefetch(m, r = 3) {
  const tok = (JXM.pf = {}),
    T = m.tile || 512,
    cx = Math.floor(H.x / T),
    cy = Math.floor(H.y / T),
    l = [];
  for (let y = cy - r; y <= cy + r; y++)
    for (let x = cx - r; x <= cx + r; x++)
      x >= 0 &&
        y >= 0 &&
        x < m.rw &&
        y < m.rh &&
        m.tmask[y * m.rw + x] &&
        !JXM.cs.tiles.has(x + "_" + y) &&
        l.push([x, y]);
  l.sort((a, b) => Math.hypot(a[0] - cx, a[1] - cy) - Math.hypot(b[0] - cx, b[1] - cy));
  for (const [x, y] of l) {
    if (JXM.pf !== tok || JXM.cur !== m || typeof fetch != "function") return;
    try {
      await jxmFetchRaw(m.id, `g/${x}_${y}.webp`, { priority: "low" });
    } catch {
      return;
    }
  }
}
// Landing point (full-map px) used by mapMid() / field camps on map id.
function jxmLand(id, x, y) {
  JXM.lands[String(id)] = [x, y];
}
// Put the hero on the active map's landing point (when its full map is shown). -> true if moved
function jxmLandNow() {
  const m = JXM.cur,
    p = m && JXM.lands[String(m.id)];
  if (!p || !OBS.g || !OBS.g.jm) return !1;
  JXM.landPending = null;
  [H.x, H.y] = inWorld(p[0], p[1]);
  typeof snapCamera == "function" && snapCamera();
  return !0;
}
// ---- map file loaders (docs/map-format.md "CDN"). Files come from the CDN (CHAT_CFG.mapBase, Cloudflare R2) as
// AES-256-GCM ciphertext (server/mapcrypt.py: "VLM1" | nonce 12 | ciphertext+tag, AAD "<id>/<name>", meta as
// meta.json), decrypted here with a per-map key from GET /api/map/key (memory only). A map whose CDN file fails
// (network, CORS, HTTP error, bad ciphertext) switches to the same-origin server (/map/, plain) for this session;
// after 3 such maps the CDN is off for the session. f = logical name: "meta.js" | "mini.webp" | "g/x_y.webp" | "o/<n>".
JXM.loc = new Set(); // map ids served by the same-origin server
JXM.keys = {}; // id -> Promise<CryptoKey>
JXM.mp = {}; // id -> pending jxmLoadMeta
JXM.thumbs = {}; // id -> object URL of mini.webp (maps in the device LRU), see jxmThumb
function jxmCdn(id) {
  if (typeof location != "undefined" && (/^localhost\b|^127\.0\.0\.1\b/i.test(location.hostname) || location.protocol === "file:")) return false;
  const b = window.CHAT_CFG && CHAT_CFG.mapBase;
  return !!b && !JXM.cdnOff && !JXM.loc.has(String(id)) && typeof crypto != "undefined" && !!crypto.subtle;
}
const jxmCdnName = (f) => (f === "meta.js" ? "meta.json" : f);
const jxmLocUrl = (id, f) => `map/${id}/${f}?v=${JXM.v}`;
const jxmUrl = (id, f) =>
  jxmCdn(id) ? `${String(CHAT_CFG.mapBase).replace(/\/+$/, "")}/${id}/${jxmCdnName(f)}` : jxmLocUrl(id, f);
function jxmAuthHdr() {
  const t = typeof API != "undefined" && API.token;
  return t ? { Authorization: "Bearer " + t } : {};
}
const jxmAuthErr = () => Object.assign(new Error("map: not logged in"), { auth: !0 });
function jxmCdnFail(id, e) {
  id = String(id);
  if (JXM.loc.has(id)) return;
  JXM.loc.add(id);
  JXM.cdnFails = (JXM.cdnFails || 0) + 1;
  JXM.cdnFails >= 3 && (JXM.cdnOff = !0);
  try {
    console.warn(`map ${id}: CDN failed (${(e && e.message) || e}), using the server`);
  } catch {}
}
function jxmKey(id) {
  id = String(id);
  return (
    JXM.keys[id] ||
    (JXM.keys[id] = (async () => {
      const base = (typeof API != "undefined" && API.base) || "",
        r = await fetch(`${base}/api/map/key?id=${encodeURIComponent(id)}`, { headers: jxmAuthHdr(), cache: "no-store" });
      if (r.status === 401 || r.status === 403) throw jxmAuthErr();
      if (!r.ok) throw new Error(`key ${r.status}`);
      const j = await r.json(),
        s = atob(j.k),
        raw = new Uint8Array(s.length);
      for (let i = 0; i < s.length; i++) raw[i] = s.charCodeAt(i);
      return crypto.subtle.importKey("raw", raw, "AES-GCM", !1, ["decrypt"]);
    })().catch((e) => {
      delete JXM.keys[id];
      throw e;
    }))
  );
}
async function jxmDecrypt(id, name, buf) {
  const u = new Uint8Array(buf);
  if (u.length < 32 || u[0] !== 86 || u[1] !== 76 || u[2] !== 77 || u[3] !== 49) throw new Error("not VLM1");
  const k = await jxmKey(id);
  return crypto.subtle.decrypt(
    { name: "AES-GCM", iv: u.subarray(4, 16), additionalData: new TextEncoder().encode(`${id}/${name}`) },
    k,
    u.subarray(16),
  );
}
// "map/37/g/1_2.webp?v=1" | "https://cdn/…/37/meta.json" -> [id, f]
function jxmParse(url) {
  const m = /(?:^|\/)(\d+)\/((?:g|o)\/[^?#]+|mini\.webp|meta\.js(?:on)?)(?:[?#]|$)/.exec(String(url));
  if (!m) throw new Error("not a map url: " + url);
  return [m[1], m[2] === "meta.json" ? "meta.js" : m[2]];
}
// Raw file (ciphertext from the CDN) without decrypting: warms the device cache (sw.js) / HTTP cache.
function jxmFetchRaw(id, f, opt) {
  return jxmCdn(id)
    ? fetch(jxmUrl(id, f), Object.assign({ mode: "cors", credentials: "omit" }, opt))
    : fetch(jxmLocUrl(id, f), Object.assign({ headers: jxmAuthHdr() }, opt));
}
// -> Promise<ArrayBuffer> plaintext of map file f. Rejects with e.auth when the server wants a login (prod).
async function jxmFetchBytes(id, f) {
  if (window.NO_JMAP) throw new Error("NO_JMAP");
  id = String(id);
  if (jxmCdn(id)) {
    try {
      const r = await fetch(jxmUrl(id, f), { mode: "cors", credentials: "omit" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await jxmDecrypt(id, jxmCdnName(f), await r.arrayBuffer());
    } catch (e) {
      if (e && e.auth) throw e;
      jxmCdnFail(id, e);
    }
  }
  const r = await fetch(jxmLocUrl(id, f), { headers: jxmAuthHdr() });
  if (r.status === 401) throw jxmAuthErr();
  if (!r.ok) throw Object.assign(new Error(`map ${id}/${f}: HTTP ${r.status}`), { status: r.status });
  return r.arrayBuffer();
}
// -> Promise<HTMLImageElement> (decoded) for map file f of id, or for a URL made by jxmUrl (jxmLoadImage(url)).
// im: fill this element instead of a new one. im.jxDone is set once it settled (loaded or failed).
async function jxmLoadImage(id, f, im) {
  f === void 0 && ([id, f] = jxmParse(id));
  im = im || new Image();
  im.jxDone = !1;
  let u = "";
  try {
    const b = await jxmFetchBytes(id, f);
    u = URL.createObjectURL(new Blob([b], { type: "image/webp" }));
    im.src = u;
    await im.decode();
    return im;
  } finally {
    im.jxDone = !0;
    // the decoded image stays usable after the revoke; mini.webp keeps its URL for the Thần Hành Phù picker
    u && (f === "mini.webp" && jxmCached(id) ? jxmKeepThumb(id, u) : URL.revokeObjectURL(u));
  }
}
// Synchronous form for the draw loop: an <img> that fills in later (complete && naturalWidth once drawn).
function jxmImage(id, f) {
  const im = new Image();
  jxmLoadImage(id, f, im).catch(() => {});
  return im;
}
// -> Promise<JMAP entry> (also sets JMAP[id]); rejects when the map cannot be loaded (e.auth: login needed).
function jxmLoadMeta(id) {
  id = String(id);
  if (JMAP[id]) return Promise.resolve(JMAP[id]);
  return (
    JXM.mp[id] ||
    (JXM.mp[id] = jxmFetchBytes(id, "meta.js")
      .then((b) => {
        let t = new TextDecoder().decode(b).trim();
        // plain meta.js from the server: "window.JMAP = …;\nJMAP[<id>] = {…};" -> the JSON part
        t[0] === "{" || (t = t.slice(t.indexOf("] = ") + 4).replace(/;\s*$/, ""));
        const m = JSON.parse(t);
        if (!m || String(m.id) !== id) throw new Error("bad meta " + id);
        return (JMAP[id] = m);
      })
      .finally(() => delete JXM.mp[id]))
  );
}
function jxmKeepThumb(id, u) {
  id = String(id);
  JXM.thumbs[id] && JXM.thumbs[id] !== u && URL.revokeObjectURL(JXM.thumbs[id]);
  JXM.thumbs[id] = u;
}
// Preview (object URL) of a map kept on this device, "" otherwise (loads it for the next time).
function jxmThumb(id) {
  if (window.NO_JMAP) return "";
  id = String(id);
  if (JXM.thumbs[id]) return JXM.thumbs[id];
  jxmCached(id) && !JXM.thumbs["_" + id] && ((JXM.thumbs["_" + id] = 1), jxmLoadImage(id, "mini.webp").catch(() => {}));
  return "";
}
function jxmBits(b64, n) {
  const s = atob(b64 || ""),
    o = new Uint8Array(n);
  for (let i = 0; i < n; i++) o[i] = i >> 3 < s.length ? (s.charCodeAt(i >> 3) >> (i & 7)) & 1 : 0;
  return o;
}
// One-time preparation of a JMAP entry: decoded tile mask, object records, region buckets.
function jxmPrep(m) {
  if (m._prep) return m;
  const T = m.tile || 512;
  m.tmask = m.tiles ? jxmBits(m.tiles, m.rw * m.rh) : new Uint8Array(m.rw * m.rh).fill(1);
  m.ob = (m.objs || []).map((r, k) => ({
    k,
    i: r[0],
    x: r[1],
    y: r[2],
    w: r[3],
    h: r[4],
    s: r[5],
    bx1: r[6],
    by1: r[7],
    bx2: r[8],
    by2: r[9],
    fr: r[10] || 1,
    ms: r[11] || 0,
    seen: -1,
    al: 1,
  }));
  m.bk = Array.from({ length: m.rw * m.rh }, () => []);
  for (const o of m.ob) {
    const x0 = clamp(Math.floor(o.x / T), 0, m.rw - 1),
      x1 = clamp(Math.floor((o.x + o.w) / T), 0, m.rw - 1),
      y0 = clamp(Math.floor(o.y / T), 0, m.rh - 1),
      y1 = clamp(Math.floor((o.y + o.h) / T), 0, m.rh - 1);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) m.bk[y * m.rw + x].push(o);
  }
  m._prep = !0;
  return m;
}
// Meta of map id -> Promise<prepared JMAP entry>, loaded once (map/index.js first: no 404 per unexported map;
// the map's device cache is opened before so sw.js keeps its files). Rejects with {miss: true} for a map that
// has no full map (never retried); a failed download is retried by the next call.
function jxmMeta(id) {
  id = String(id);
  const miss = () => {
    JXM.st[id] = "miss";
    const e = new Error("no full map " + id);
    e.miss = !0;
    throw e;
  };
  if (window.NO_JMAP) return Promise.reject(Object.assign(new Error("NO_JMAP"), { miss: !0 }));
  if (JMAP[id]) return ((JXM.st[id] = "ok"), Promise.resolve(jxmPrep(JMAP[id])));
  if (JXM.st[id] === "miss") return Promise.resolve().then(miss);
  if (JXM.mq[id]) return JXM.mq[id];
  JXM.st[id] = JXM.idx === void 0 ? "wait" : "load";
  const p = (JXM.mq[id] = new Promise((r) => (JXM.idx === void 0 ? jxmIndex(r) : r()))
    .then(() => {
      if (JXM.idx && !JXM.idx.has(id)) miss();
      JXM.st[id] = "load";
      return Promise.race([jxmTouch(id).p, new Promise((r) => setTimeout(r, 400))]);
    })
    .then(() => jxmLoadMeta(id))
    .then(
      (m) => ((JXM.st[id] = "ok"), (JMAP[id] = JMAP[id] || m), jxmPrep(JMAP[id])),
      (e) => {
        delete JXM.mq[id];
        JXM.st[id] = "miss";
        const err = Object.assign(new Error("map " + id), { miss: !0 });
        throw err;
      },
    ));
  return p;
}
// Returns the prepared JMAP for id when loaded; otherwise starts loading its meta (jxmMeta) and calls cb()
// when it arrives.
function jxmGet(id, cb) {
  id = String(id);
  if (window.NO_JMAP) return null;
  if (JMAP[id]) return ((JXM.st[id] = "ok"), jxmPrep(JMAP[id]));
  if (JXM.st[id] === "miss") return null;
  jxmMeta(id).then(
    () => cb && cb(),
    // prod before login: the server wants a session -> try again
    (e) =>
      e &&
      e.auth &&
      ((JXM.st[id] = "wait"), setTimeout(() => (JXM.st[id] === "wait" && delete JXM.st[id], jxmGet(id, cb)), 3e3)),
  );
  return null;
}
function jxmIndex(cb) {
  (JXM.idxCb = JXM.idxCb || []).push(cb);
  if (JXM.idxCb.length > 1) return;
  const fin = () => {
    // no map/index.js (no server, no export): no full maps at all -> no per-map 404s
    JXM.idx = new Set(Array.isArray(window.JMAP_LIST) ? window.JMAP_LIST.map((m) => String(m.id)) : []);
    const l = JXM.idxCb;
    JXM.idxCb = [];
    for (const f of l) f();
  };
  if (window.JMAP_LIST) return fin();
  const s = document.createElement("script");
  s.src = `map/index.js?v=${JXM.v}`;
  s.async = !0;
  s.onload = s.onerror = fin;
  document.head.appendChild(s);
}
// Called by obsLoad: activates m (or null) and returns the coordinate delta to apply to live entities.
function jxmSetMap(m) {
  const o = m && m.crop ? { x: m.crop.ox, y: m.crop.oy } : { x: 0, y: 0 },
    d = [o.x - JXM.off.x, o.y - JXM.off.y];
  if (JXM.cur !== m) {
    const id = m ? String(m.id) : "",
      old = JXM.cs;
    // the images preloaded for this map (mapPreload), or those kept from when we left it
    let s = null;
    for (const k of ["pre", "prev"]) JXM[k] && JXM[k].id === id && ((s = JXM[k]), (JXM[k] = null));
    s = s || (old && old.id === id ? old : jxmNewStore(id));
    if (old !== s) {
      // keep (part of) the map we leave: Thổ Địa Phù / dungeon / boat round trips come back without loading
      if (old && old.id && JXM.cur) {
        jxmTrimStore(old, JXM.cur);
        jxmFreeStore(JXM.prev);
        JXM.prev = old;
      } else jxmFreeStore(old);
    }
    JXM.cs = s;
    m && !s.mini && (s.mini = jxmIE(m.id, "mini.webp"));
    JXM.above = [];
    JXM.pf = null;
    m && jxmTouch(m.id);
  }
  JXM.cur = m;
  JXM.off = o;
  return d;
}
// Translate every live world-space thing by (dx, dy) when the coordinate space changes.
function jxmShift(dx, dy) {
  if (!dx && !dy) return;
  const seen = new Set(),
    mv = (o) => {
      if (!o || typeof o.x != "number" || seen.has(o)) return;
      seen.add(o);
      o.x += dx;
      o.y += dy;
      for (const [a, b] of [
        ["px", "py"],
        ["_px", "_py"],
        ["wx", "wy"],
      ])
        typeof o[a] == "number" && ((o[a] += dx), (o[b] += dy));
      o._pp = null;
      o._pk = null;
    };
  mv(H);
  if (typeof R > "u") return;
  (R.enemies || []).forEach(mv);
  (R.ground || []).forEach(mv);
  (R.corpses || []).forEach(mv);
  (R.dust || []).forEach(mv);
  R.field && (R.field.pts || []).forEach(mv);
  // disciples (js/party.js): their actors, formation anchor re-computed
  if (typeof partyN == "function") {
    for (let k = 1; k <= partyN(); k++) mv(pAct(k).h);
    PT.anc = null;
  }
  mv(R.moveTo);
  typeof INPUT < "u" && mv(INPUT.target);
  typeof FIELD < "u" && ((FIELD.cell = -1), (FIELD.g = null));
}
// Old crop-space point -> current map space.
const jxo = (x, y) => [x + JXM.off.x, y + JXM.off.y];
// Spawn centre: middle of the old 7x7 crop when a full map with crop is active, else world centre.
function mapMid() {
  const m = JXM.cur,
    p = m && OBS.g && OBS.g.jm && JXM.lands[String(m.id)];
  if (p) return p.slice();
  if (m && m.crop) {
    const j = window.JMO && window.JMO[String(m.id)],
      w = (j && j.w) || 3584,
      h = (j && j.h) || 3584;
    return [m.crop.ox + w / 2, m.crop.oy + h / 2];
  }
  return [WORLD.w / 2, WORLD.h / 2];
}
// Field camps stay inside the old crop (same spots relative to the terrain); null = whole map.
function jxmFieldRect() {
  const m = JXM.cur;
  if (m && !m.crop && JXM.lands[String(m.id)]) {
    // maps without a farming crop (Thần Hành Phù destinations): camps around the landing point
    const [x, y] = JXM.lands[String(m.id)],
      A = 3584,
      w = Math.min(A, m.w),
      h = Math.min(A, m.h);
    return { x: clamp(x - w / 2, 0, m.w - w), y: clamp(y - h / 2, 0, m.h - h), w, h };
  }
  if (!m || !m.crop) return null;
  const j = window.JMO && window.JMO[String(m.id)];
  return { x: m.crop.ox, y: m.crop.oy, w: (j && j.w) || 3584, h: (j && j.h) || 3584 };
}
// Meta arrived while its map is already shown (first visit): rebuild obstacles in full-map space.
function jxmReload() {
  if (OBS.key == null) return;
  obsLoad(OBS.key);
  [H.x, H.y] = inWorld(H.x, H.y);
  for (const e of R.enemies) [e.x, e.y] = inWorld(e.x, e.y);
  if (R.dg && R.dg.d && R.dg.d.islands && R.zoneShown === "dg" && R.dg.room > 0) {
    const p = obsIsland(R.dg.room - 1);
    p && ([H.x, H.y] = p);
  }
  JXM.cur && JXM.landPending === String(JXM.cur.id) && jxmLandNow();
  typeof snapCamera == "function" && snapCamera();
}
// Ground: 512x512 tiles in view (+1 margin), mini.webp as placeholder while loading; far tiles evicted.
function jxmDrawGround(c) {
  const m = JXM.cur;
  if (!m || !OBS.g) return !1;
  const T = m.tile || 512,
    x0 = Math.floor(CAM.x / T),
    x1 = Math.floor((CAM.x + AR.w) / T),
    y0 = Math.floor(CAM.y / T),
    y1 = Math.floor((CAM.y + AR.h) / T),
    tl = JXM.cs.tiles,
    mini = jxmMini(),
    mk = mini ? jxmIW(mini) / m.w : 0;
  let drawn = false;
  for (let ry = y0 - 1; ry <= y1 + 1; ry++)
    for (let rx = x0 - 1; rx <= x1 + 1; rx++) {
      if (rx < 0 || ry < 0 || rx >= m.rw || ry >= m.rh) continue;
      const vis = rx >= x0 && rx <= x1 && ry >= y0 && ry <= y1;
      if (!m.tmask[ry * m.rw + rx]) {
        vis && ((c.fillStyle = "#000"), c.fillRect(rx * T, ry * T, T, T));
        continue;
      }
      const key = rx + "_" + ry;
      let e = tl.get(key);
      e || tl.set(key, (e = jxmIE(m.id, `g/${key}.webp`)));
      if (!vis) continue;
      if (e.im) {
        c.drawImage(e.im, rx * T, ry * T, T + 0.5, T + 0.5);
        drawn = true;
      } else if (mini) {
        c.drawImage(mini, rx * T * mk, ry * T * mk, T * mk, T * mk, rx * T, ry * T, T + 0.5, T + 0.5);
        drawn = true;
      }
    }
  if (!drawn) return !1;
  if (tl.size > 40) {
    const k = JXM.TILE_KEEP + 1;
    for (const [key, e] of tl) {
      const [rx, ry] = key.split("_").map(Number);
      // tiles a preload / hold asked for in the last 30 s stay (the hero is about to land there)
      (rx < x0 - k || rx > x1 + k || ry < y0 - k || ry > y1 + k) &&
        !(e.t > performance.now() - 3e4) &&
        (jxmIFree(e), tl.delete(key));
    }
  }
  return !0;
}
const jxmMini = () => (JXM.cur && JXM.cs.mini && JXM.cs.mini.im) || null;
// Decoded sprite of object image i of the active map, or null while loading (starts the load).
function jxmObjImg(i) {
  const m = JXM.cur,
    s = JXM.cs;
  s.oimg[i] || (s.oimg[i] = jxmIE(m.id, "o/" + m.imgs[i]));
  return s.oimg[i].im;
}
// Objects whose sprite rect touches the camera (region buckets, deduped by frame stamp).
function jxmVisible() {
  const m = JXM.cur,
    T = m.tile || 512,
    pad = 32,
    cx0 = CAM.x - pad,
    cy0 = CAM.y - pad,
    cx1 = CAM.x + AR.w + pad,
    cy1 = CAM.y + AR.h + pad,
    st = ++JXM.stamp,
    out = [];
  for (let ry = Math.max(0, Math.floor(cy0 / T)); ry <= Math.min(m.rh - 1, Math.floor(cy1 / T)); ry++)
    for (let rx = Math.max(0, Math.floor(cx0 / T)); rx <= Math.min(m.rw - 1, Math.floor(cx1 / T)); rx++)
      for (const o of m.bk[ry * m.rw + rx]) {
        if (o.seen === st) continue;
        o.seen = st;
        o.x < cx1 && o.x + o.w > cx0 && o.y < cy1 && o.y + o.h > cy0 && out.push(o);
      }
  return out;
}
// Base y of a line object at x (segment interpolated, clamped to its ends).
function jxmLineY(o, x) {
  const dx = o.bx2 - o.bx1;
  return dx ? o.by1 + (o.by2 - o.by1) * clamp((x - o.bx1) / dx, 0, 1) : Math.max(o.by1, o.by2);
}
// Hero body probe used to fade objects that hide the hero.
const jxmCovers = (o) => H.x > o.x + 6 && H.x < o.x + o.w - 6 && H.y - 30 > o.y + 6 && H.y - 30 < o.y + o.h;
// Sorts the render list (actors with .y; hero entry {hero:true}) and interleaves visible map objects.
// Point/tree: actor behind when actor.y < by1. Line: behind when actor.y < base segment y at actor.x.
// Sort 3 (above) objects are collected into JXM.above and drawn after all actors by jxmDrawAbove.
function jxmSort(list) {
  list.sort((a, b) => a.y - b.y);
  const m = JXM.cur;
  JXM.above.length = 0;
  if (!m || !OBS.g || !m.ob.length) return list;
  const now = performance.now(),
    dt = Math.min(0.1, (now - (JXM.t || now)) / 1e3);
  JXM.t = now;
  const ax = (a) => (a.hero ? H.x : a.x),
    acts = list.filter((a) => !a.hero && typeof a.x == "number");
  acts.push({ hero: !0, y: H.y });
  const objs = [];
  for (const o of jxmVisible()) {
    let fade = !1;
    if (o.s === 3) {
      JXM.above.push(o);
      fade = o.h >= 40 && jxmCovers(o);
    } else {
      let k = o.s === 1 ? (o.by1 + o.by2) / 2 : o.by1;
      if (o.s === 1)
        // one key cannot satisfy a slanted base for every actor: honour each overlapping actor, hero last wins
        for (const a of acts) {
          const x = ax(a);
          if (x < o.x || x > o.x + o.w || a.y < o.y || a.y > o.y + o.h + 64) continue;
          a.y < jxmLineY(o, x) ? k <= a.y && (k = a.y + 0.01) : k > a.y && (k = a.y - 0.01);
        }
      o.key = k;
      fade = o.h >= 48 && H.y < (o.s === 1 ? jxmLineY(o, H.x) : o.by1) && jxmCovers(o);
      objs.push({ jo: o, y: k });
    }
    o.al += ((fade ? JXM.fadeA : 1) - o.al) * Math.min(1, dt * 8);
  }
  if (!objs.length) return list;
  return list.concat(objs).sort((a, b) => a.y - b.y || (b.jo ? 1 : 0) - (a.jo ? 1 : 0));
}
function jxmDrawObj(c, o) {
  const im = jxmObjImg(o.i);
  if (!im) return;
  const f = o.fr > 1 && o.ms > 0 ? Math.floor(performance.now() / o.ms) % o.fr : 0;
  o.al < 0.99 && (c.globalAlpha = o.al);
  c.drawImage(im, f * o.w, 0, o.w, o.h, o.x, o.y, o.w, o.h);
  c.globalAlpha = 1;
}
function jxmDrawAbove(c) {
  if (!JXM.cur) return;
  for (const o of JXM.above.sort((a, b) => a.by1 - b.by1)) jxmDrawObj(c, o);
}
// obsLoad keeps only the heaviest walkable component; on a map with a landing point the walkable area
// is the component under (or nearest to) the landing point instead, so the hero lands where JX1 puts him.
// Called by obsLoad itself, before ground items are snapped (else loot lands in the wrong area).
function jxmLandComp() {
  const m = JXM.cur,
    g = OBS.g,
    p = m && g && g.jm && g.comp && JXM.lands[String(m.id)];
  if (!p) return;
  const cx = Math.floor(p[0] / g.cw),
    cy = Math.floor(p[1] / g.ch);
  // Nearest component on growing rings; cliff edges are full of 1-cell walkable fragments (Nguyệt Ca Mật Cốc
  // has ~6700 of them), so a real area (>= 64 cells) within reach wins over a closer fragment.
  let k = -1,
    k0 = -1;
  for (let r = 0; r <= 24 && k < 0; r++)
    for (let y = cy - r; y <= cy + r && k < 0; y++)
      for (let x = cx - r; x <= cx + r; x++) {
        if (x < 0 || y < 0 || x >= g.gw || y >= g.gh || (Math.abs(x - cx) < r && Math.abs(y - cy) < r)) continue;
        const c = g.comp[y * g.gw + x];
        if (c < 0) continue;
        k0 < 0 && (k0 = c);
        if (!g.sz || g.sz[c] >= 64) {
          k = c;
          break;
        }
      }
  k < 0 && (k = k0);
  if (k < 0 || g.lc === k) return;
  // the chosen (heaviest) component already holds a real area at the landing point
  let cur = -1;
  for (let i = 0; i < g.ok.length && cur < 0; i++) g.ok[i] && (cur = g.comp[i]);
  if (cur === k) return;
  let n = 0;
  for (let i = 0; i < g.ok.length; i++) n += g.ok[i] = g.comp[i] === k ? 1 : 0;
  g.free = n;
  g.lc = k;
  OBS.ver = (OBS.ver || 0) + 1; // invalidates planned paths and fields built on the old component
  typeof FIELD != "undefined" && ((FIELD.cell = -1), (FIELD.g = null));
}
// A pending landing (Thần Hành Phù) is applied as soon as its full map becomes the active one
// (obsLoad runs on zone changes, town entry / exit and when a map's meta arrives).
if (typeof obsLoad == "function") {
  const o = obsLoad;
  obsLoad = function () {
    const r = o.apply(this, arguments);
    try {
      jxmLandComp();
      JXM.cur && JXM.landPending === String(JXM.cur.id) && jxmLandNow();
    } catch {}
    return r;
  };
}
