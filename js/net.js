"use strict";
// Online features (accounts, cloud saves, ranking, mail, market, giftcodes) on our own
// backend: server/main.py via js/api.js (see docs/backend.md). NET.sb is the API client.
const NET = {
    sb: null,
    user: null,
    tab: "acc",
    mkt: "buy",
    rank: "lvl",
    rfac: "",
    mailN: 0,
    lastChar: 0,
    lastUp: 0,
    sel: null,
    q: "",
  },
  NET_DOMAIN = "@volamidle.game",
  NET_TAX = 0.05, // display only; the server applies market_tax (server/config.json)
  // ?offline_test=1: no network at all (dev only — production always requires a login: docs/deploy.md)
  NET_LOCAL = true,
  NET_SSO_ERR = {
    state: "Phiên đăng nhập đã quá hạn — bấm đăng nhập lại",
    expired: "Phiên đăng nhập đã quá hạn — bấm đăng nhập lại",
    replayed: "Liên kết đăng nhập đã dùng rồi — bấm đăng nhập lại",
    banned: "Tài khoản đã bị khóa",
  },
  netOn = () => typeof API != "undefined" && API.on && !NET_LOCAL,
  netUname = () => (NET.user ? NET.user.username || String(NET.user.email || "").replace(NET_DOMAIN, "") : ""),
  netErr = (t) => (t && (t.message || t.error)) || String(t || "Lỗi mạng");
function netClient() {
  return NET.sb
    ? Promise.resolve(NET.sb)
    : netOn()
      ? NET.sbP ||
        (NET.sbP = (async () => {
          await API.get("/api/health");
          NET.user = null;
          await netSsoBack();
          if (API.token)
            try {
              NET.user = (await API.req("GET", "/api/auth/me", void 0, { noLost: 1 })).user;
            } catch (t) {
              if (t.status !== 401) throw t;
              API.setToken(null);
            }
          API.onLost = () => {
            const t = !!NET.user;
            ((NET.user = null), t && !NET.loggingOut && S && S.fac && setTimeout(() => netRelogin(), 0), netDot());
          };
          return ((NET.sb = API), API);
        })().catch((t) => {
          throw ((NET.sbP = null), t);
        }))
      : Promise.reject(new Error("Chưa cấu hình máy chủ (js/chatcfg.js)"));
}
// Back from esport9.com (server/sso.py): ?sso=1 -> the server holds a one-time hand-off for this browser
// (HttpOnly cookie) that becomes our session token; ?sso_err=<code> -> show why on the login gate.
async function netSsoBack() {
  const q = new URLSearchParams(location.search),
    ok = q.get("sso") === "1",
    err = q.get("sso_err");
  if (!ok && !err) return;
  if (ok)
    try {
      const j = await API.req("POST", "/api/auth/esport9/claim", {}, { noLost: 1, cookies: 1 });
      j && j.token && API.setToken(j.token);
    } catch {}
  err && (NET.ssoErr = NET_SSO_ERR[err] || `Đăng nhập eSport9 không thành công (${String(err).slice(0, 20)})`);
  q.delete("sso");
  q.delete("sso_err");
  try {
    history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : "") + location.hash);
  } catch {}
}
// Leave for esport9.com (Google / email there); it sends the player back with a ticket.
function netSsoGo() {
  try {
    typeof save == "function" && S && S.fac && save();
  } catch {}
  location.href = API.base + "/api/auth/esport9/start";
}
const netCfg = () => window.CHAT_CFG || {},
  netSsoHTML = (id) =>
    netCfg().sso
      ? `<div class="card"><div class="btnrow"><button class="btn" id="${id}">🎮 Đăng nhập bằng tài khoản eSport9</button></div><p class="dim small">Google hoặc email — dùng chung tài khoản với <b>esport9.com</b>. Chưa có tài khoản: tạo ngay ở trang đăng nhập eSport9 (Google hoặc mã gửi qua email).</p></div>`
      : "";
const netCall = async (t) => {
  try {
    const n = await netClient();
    return await t(n);
  } catch (n) {
    throw new Error(netErr(n));
  }
};
async function netAuth(t, n, e) {
  if (
    ((n = String(n || "")
      .trim()
      .toLowerCase()),
    !/^[a-z0-9_]{3,16}$/.test(n))
  )
    throw new Error("Tên đăng nhập 3–16 ký tự: chữ không dấu, số, _");
  if (String(e || "").length < 6) throw new Error("Mật khẩu ít nhất 6 ký tự");
  const s = await Promise.race([
    netCall((i) =>
      i.req("POST", t === "up" ? "/api/auth/register" : "/api/auth/login", { username: n, password: e }, { noLost: 1 }),
    ),
    new Promise((i, a) => setTimeout(() => a(new Error("Máy chủ không phản hồi — kiểm tra mạng rồi bấm lại")), 2e4)),
  ]);
  if (!s || !s.token) throw new Error("Máy chủ trả lời sai");
  (API.setToken(s.token), (NET.user = s.user), netMailCount());
}
function netGear() {
  const t = {};
  for (const [n, e] of Object.entries(S.eq || {})) e && (t[n] = e);
  return t;
}
async function netSyncChar(t) {
  if (!NET.user) throw new Error("Chưa đăng nhập");
  if (!S || !S.fac) throw new Error("Chưa có nhân vật");
  if (!hasRealName()) throw (t || nameModal(), new Error("Cần đặt tên nhân vật trước"));
  if (netForeign(S)) throw new Error("Nhân vật thuộc tài khoản khác");
  const n = RW().stat || {},
    e = {
      owner: NET.user.id,
      slot: SLOT,
      name: S.name,
      fac: S.fac,
      sex: S.sex | 0,
      lvl: S.lvl | 0,
      reborn: n.reborn | 0,
      power: Math.round(R.power || 0),
      tower: n.towerBest | 0,
      bosses: n.bosses | 0,
      gear: netGear(),
      updated: new Date().toISOString(),
    };
  (await netCall((s) => s.put("/api/chars/" + SLOT, e)), (NET.lastChar = Date.now()), netCheat().catch(() => {}));
}
const CHEAT_KEY = "jxCheat";
function cheatK() {
  if (typeof NET > "u" || !NET.user) return 1;
  if (NET.cheatU !== NET.user.id) {
    NET.cheatU = NET.user.id;
    try {
      NET.cheat = localStorage.getItem(CHEAT_KEY) === NET.user.id;
    } catch {
      NET.cheat = !1;
    }
  }
  return NET.cheat ? 0.01 : 1;
}
async function netCheat() {
  if (!NET.user || !(R.power > 20)) return;
  cheatK();
  const n = await netCall((s) => s.get("/api/chars/mine?slot=" + SLOT));
  if (!n || n.power == null) return;
  const e = (n.power | 0) === 1;
  if (e !== !!NET.cheat) {
    ((NET.cheat = e), (NET.cheatU = NET.user.id));
    try {
      e ? localStorage.setItem(CHEAT_KEY, NET.user.id) : localStorage.removeItem(CHEAT_KEY);
    } catch {}
    e &&
      typeof log == "function" &&
      log('<span class="bad">⚠ Tài khoản bị ghi nhận dùng console: sát thương giảm 99%.</span>');
  }
}
const netNeedChar = async () => {
    Date.now() - NET.lastChar > 6e4 && (await netSyncChar());
  },
  cloudPack = (t, n) => JSON.stringify({ v: 2, d: t, k: n || null });
function cloudParse(t) {
  try {
    const n = JSON.parse(t);
    if (n && n.v === 2 && typeof n.d == "string") return { d: n.d, k: n.k };
  } catch {}
  return { d: t, k: null };
}
const stashRaw = () => {
    try {
      return localStorage.getItem(STASH_KEY);
    } catch {
      return null;
    }
  },
  slotState = (t) => {
    try {
      const n = localStorage.getItem(slotKey(t)),
        e = n && unpack(n);
      return e && e.ok && e.state && e.state.fac ? e.state : null;
    } catch {
      return null;
    }
  },
  stateFromPacked = (t) => parseSaveText(JSON.stringify({ game: "jxidle", data: t })),
  netForeign = (t) => !!(t && t.netOwner && NET.user && t.netOwner !== NET.user.id);
// Log out of Võ Lâm (Tài khoản window, Hệ thống tab): save here + on the server first, then drop the session
function netLogout(btn) {
  return busy(
    btn,
    async () => {
      (typeof save == "function" && save(),
        S && S.fac && NET.user && (await netUpload().catch(() => {})),
        (NET.loggingOut = !0),
        await API.post("/api/auth/logout").catch(() => {}),
        API.setToken(null),
        (NET.loggingOut = !1),
        (NET.user = null),
        (NET.mailN = 0),
        netDot());
    },
    () => location.reload(),
  );
}
async function netUpload() {
  if (!NET.user) throw new Error("Chưa đăng nhập");
  if (!S || !S.fac) throw new Error("Chưa có nhân vật");
  if (netForeign(S)) throw new Error("Nhân vật thuộc tài khoản khác");
  const t = new Date(),
    n = S.cloudAt;
  ((S.cloudAt = t.getTime()), (S.netOwner = NET.user.id));
  let e;
  try {
    e = await netCall((s) =>
      s.put("/api/saves/" + SLOT, {
        name: S.name || "",
        lvl: S.lvl | 0,
        fac: S.fac,
        data: cloudPack(pack(S), stashRaw()),
        updated: t.toISOString(),
      }),
    );
  } catch (s) {
    throw ((S.cloudAt = n), s);
  }
  // Mật Cốc pass: the server's record (js/migu.js)
  (netAdj(S, e), e && "migu" in e && typeof miguFromServer == "function" && miguFromServer(e.migu), save(), (NET.lastUp = Date.now()));
}
// The server changed the stored save (market / mail) after this copy was packed: it replayed
// those changes (gold, knb, removed / added items) on the upload and tells us to do the same.
function netAdj(t, n) {
  const e = n && n.adj;
  if (!t || !e) return !1;
  if (t === S && typeof PCTX < "u" && PCTX) return withMain(() => netAdj(t, n));
  ((t.gold = (+t.gold || 0) + (+e.gold || 0)), (t.knb = (t.knb | 0) + (e.knb | 0)), (t.inv = t.inv || []));
  // every bag of the save (main first, then the disciples' own bags: js/party.js)
  const bags = [t.inv].concat((Array.isArray(t.party) ? t.party : []).map((p) => p && p.inv).filter(Array.isArray));
  for (const s of e.rm || [])
    for (const b of bags) {
      const i = b.findIndex((a) => a && a.uid === s);
      if (i >= 0) {
        b.splice(i, 1);
        break;
      }
    }
  for (const s of e.add || []) bags.some((b) => b.some((i) => i && i.uid === s.uid)) || t.inv.push(s);
  // uids handed out by the server (admin console) jump ahead of the local counter: keep the counter above them
  for (const s of e.add || []) s && s.uid >= (+t.uid || 0) && (t.uid = +s.uid + 1);
  // admin console edits (level, fields…): same ops the server replayed (js/gameconfig.js, server/admin_console.py)
  e.patch &&
    typeof GCFG < "u" &&
    (GCFG.applyPatch(t, e.patch),
    t === S && typeof recalc == "function" && (recalc(), (R.dirty = !0)),
    typeof toast == "function" &&
      e.patch.some((o) => !(o && o[1] && o[1][0] === "miguUntil")) && // a Mật Cốc purchase is not an admin edit
      toast("Nhân vật vừa được quản trị viên cập nhật"));
  return ((t.tseq = n.tseq | 0), t === S && typeof invDirty != "undefined" && (invDirty = !0), !0);
}
// Item handed over by the server (mail claim): keep its uid unless it clashes locally.
function netTakeUid(t) {
  const n = (s) => s && s.uid === t.uid;
  (typeof allInv == "function" ? allInv().some((b) => b.some(n)) : S.inv.some(n)) || (typeof allEq == "function" ? allEq() : Object.values(S.eq || {})).some(n) || !(t.uid > 0)
    ? (t.uid = S.uid++)
    : (S.uid = Math.max(S.uid | 0, t.uid + 1));
}
let NET_UPT = 0;
const netUploadSoon = () => {
  (clearTimeout(NET_UPT), (NET_UPT = setTimeout(() => netUpload().catch(() => {}), 1500)));
};
async function netUploadSlot(t, n) {
  const e = new Date();
  n.cloudAt = e.getTime();
  try {
    localStorage.setItem(slotKey(t), pack(n));
  } catch {}
  const s = await netCall((i) =>
    i.put("/api/saves/" + t, {
      name: n.name || "",
      lvl: n.lvl | 0,
      fac: n.fac,
      data: cloudPack(pack(n), stashRaw()),
      updated: e.toISOString(),
    }),
  );
  if (netAdj(n, s))
    try {
      localStorage.setItem(slotKey(t), pack(n));
    } catch {}
}
const netSaveGet = (t) => netCall((n) => n.get("/api/saves/" + t));
function netApplyStash(t) {
  if (!t) return !1;
  try {
    const n = unpack(t);
    if (!n.ok) return !1;
    const e = stashRead().st;
    return (n.state.rev | 0) <= (e.rev | 0) ? !1 : (localStorage.setItem(STASH_KEY, t), !0);
  } catch {
    return !1;
  }
}
function netUserSwitch() {
  try {
    const t = localStorage.getItem("jxidle_lastuser");
    if (t && t !== NET.user.id) {
      const n = localStorage.getItem(STASH_KEY);
      (n && localStorage.setItem(STASH_KEY + "_" + t, n), localStorage.removeItem(STASH_KEY));
    }
    localStorage.setItem("jxidle_lastuser", NET.user.id);
  } catch {}
}
async function netSyncAll() {
  if (!NET.user) return !1;
  netUserSwitch();
  const n = (await netCall((i) => i.get("/api/saves"))) || [];
  let e = !1;
  for (let i = 0; i < SLOT_N; i++) {
    const a = n.find((m) => m.slot === i),
      o = a ? Date.parse(a.updated) : 0;
    if (i === SLOT && S && S.fac) continue;
    const c = slotState(i);
    if (!a) {
      if (c && c.netOwner === NET.user.id) await netUploadSlot(i, c);
      else if (c)
        try {
          const m = slotKey(i);
          (localStorage.setItem(m + "_bak", localStorage.getItem(m)), localStorage.removeItem(m), (e = !0));
        } catch {}
      continue;
    }
    if (!netCloudStale(c, o) && !netForeign(c)) continue;
    const r = await netSaveGet(i),
      u = cloudParse(r.data),
      f = stateFromPacked(u.d);
    if (((f.cloudAt = o), (f.netOwner = NET.user.id), !(c && !netForeign(c) && netProg(f) < netProg(c))))
      try {
        const m = slotKey(i),
          l = localStorage.getItem(m);
        (l && localStorage.setItem(m + "_bak", l), localStorage.setItem(m, pack(f)), (e = !0));
      } catch {}
  }
  const s = n.slice().sort((i, a) => Date.parse(a.updated) - Date.parse(i.updated))[0];
  if (s) {
    const i = await netSaveGet(s.slot);
    netApplyStash(cloudParse(i.data).k) && (e = !0);
  }
  return e;
}
const netProg = (t) => (t ? ((t.rw && t.rw.stat && t.rw.stat.reborn) | 0) * 200 + (t.lvl | 0) : 0),
  netCloudStale = (t, n) => !t || !t.cloudAt || n > t.cloudAt + 5e3;
async function netCheckCloud() {
  if (!NET.user || !S || !S.fac) return;
  const n = ((await netCall((s) => s.get("/api/saves"))) || []).find((s) => s.slot === SLOT);
  if (!n) {
    if (S.netOwner === NET.user.id) {
      await netUpload();
      return;
    }
    SAVE_LOCK = !0;
    try {
      const s = slotKey(SLOT);
      (localStorage.setItem(s + "_bak", localStorage.getItem(s)),
        localStorage.removeItem(s),
        localStorage.setItem(SLOT_PTR, "menu"));
    } catch {}
    (toast("Nhân vật chỉ có trên máy này, không có trên đám mây: không dùng được"),
      setTimeout(() => location.reload(), 1500));
    return;
  }
  const e = Date.parse(n.updated);
  if (S.netOwner && !netForeign(S) && netCloudStale(S, e)) {
    let s = !1;
    try {
      const i = await netSaveGet(SLOT);
      s = netProg(stateFromPacked(cloudParse(i.data).d)) < netProg(S);
    } catch {}
    if (s) {
      S.cloudAt = Math.max(S.cloudAt || 0, e);
      try {
        await netUpload();
      } catch {}
      return;
    }
  }
  !S.netOwner || netForeign(S) || netCloudStale(S, e)
    ? (toast("Đang tải nhân vật từ đám mây…"), await netUseCloud(SLOT, e))
    : ((S.last || 0) > e + 5e3 || (n.tseq | 0) > (S.tseq | 0)) && (await netUpload()); // newer tseq: server-side changes to replay
}
async function netUseCloud(t, n) {
  const e = await netSaveGet(t),
    s = cloudParse(e.data),
    i = stateFromPacked(s.d);
  ((i.cloudAt = n || Date.parse(e.updated)),
    (i.netOwner = NET.user.id),
    netApplyStash(s.k),
    writeSlot(t, i),
    location.reload());
}
async function netCloudList() {
  return (await netCall((n) => n.get("/api/saves"))) || [];
}
async function netCloudLoad(t) {
  await netUseCloud(t);
}
function netGate(t) {
  NET.offline = true;
  document.body.classList.remove("e9gate");
  if ($("#mBody .ngate")) closeModal(true);
}
async function netAfterLogin() {
  document.body.classList.remove("e9gate");
  const t = await netSyncAll();
  if (!S || !S.fac) {
    const n = [...Array(SLOT_N).keys()].filter((e) => slotInfo(e));
    if (n.length) {
      try {
        localStorage.setItem(SLOT_PTR, n.length > 1 ? "menu" : String(n[0]));
      } catch {}
      location.reload();
      return;
    }
    (closeModal(!0), pickFaction());
    return;
  }
  (closeModal(!0),
    toast("Đã đăng nhập: " + netUname()),
    netSyncChar(!0).catch(() => {}),
    netCheckCloud().catch(() => {}),
    netMailCount());
}
async function netMailCount() {
  if (!NET.user) {
    ((NET.mailN = 0), netDot());
    return;
  }
  try {
    const t = await netCall((n) => n.get("/api/mail/count"));
    NET.mailN = (t && t.count) || 0;
  } catch {}
  netDot();
}
async function netClaim(t, n) {
  if (NET_PAUSE.includes("mail")) throw new Error("Hộp thư đang tạm đóng");
  if (t.item && S.inv.length >= INV_MAX) throw new Error("Hành trang đầy");
  // server: deletes the mail and credits the stored save of this slot (ledger), atomically
  NET.lastUp || (await netUpload().catch(() => {}));
  const e = await netCall((a) => a.post("/api/mail/claim", { id: t.id, slot: SLOT })),
    s = e.mail || t,
    i = [];
  if (((S.tseq = e.tseq | 0), s.item)) {
    const a =
      s.item && typeof s.item == "object" && Array.isArray(s.item.base) && Array.isArray(s.item.mag) ? s.item : null;
    if (
      (a && (netTakeUid(a), (a.lock = !0), typeof vioDedupe == "function" && vioDedupe(a)),
      a && typeof eqBanned == "function" && eqBanned(a))
    )
      i.push(`${a.n} (đồ đã xóa khỏi game)`);
    else if (a && typeof eqRemoved == "function" && eqRemoved(a)) {
      const o = itemValue(a);
      ((S.gold += o), i.push(`${a.n} → ${fmtL(o)} lượng (đồ đã bỏ khỏi game)`));
    } else a && (S.inv.push(a), i.push(a.n), (invDirty = !0));
  }
  return (
    s.gold > 0 && ((S.gold += +s.gold), i.push(fmtL(+s.gold) + " lượng")),
    s.knb > 0 && ((S.knb = (S.knb | 0) + (s.knb | 0)), i.push((s.knb | 0) + " KNB")),
    save(),
    n || log(`📨 Nhận thư từ <b>${esc(s.from_name)}</b>: ${esc(i.join(", "))}`),
    netUploadSoon(),
    i
  );
}
const MKT_HK_MIN = 5e6,
  MKT_HKMP_MIN = 5e7,
  MKT_HK_MAX = 3,
  mktIsHk = (t) => !!t && ((t.r | 0) >= 4 || !!t.set),
  mktHkMin = (t) => (t.set && setFac(t) >= 0 ? MKT_HKMP_MIN : MKT_HK_MIN);
async function netSendGift(t, n, e, s) {
  if (NET_PAUSE.includes("mail")) throw new Error("Hộp thư đang tạm đóng");
  if (((t = String(t || "").trim()), (e = Math.max(0, Math.floor(+e || 0))), !t))
    throw new Error("Nhập tên người nhận");
  if (!n && !e) throw new Error("Chọn món đồ hoặc nhập số lượng");
  if (e > S.gold) throw new Error("Không đủ ngân lượng");
  if (n && (n.lock || !S.inv.includes(n))) throw new Error("Món không gửi được (đang khóa / đang mặc)");
  await netNeedChar();
  try {
    await netUpload();
  } catch (a) {
    throw new Error("Không lưu được nhân vật lên máy chủ, chưa gửi: " + a.message);
  }
  // server checks gold / item against the stored save and moves them in one transaction
  const i = await netCall((a) =>
      a.post("/api/mail/send", {
        slot: SLOT,
        to: t,
        uid: n ? n.uid : null,
        gold: e,
        note: String(s || "").slice(0, 100),
      }),
    ),
    a = n ? S.inv.indexOf(n) : -1;
  (a >= 0 && S.inv.splice(a, 1), (S.gold -= e), (S.tseq = i.tseq | 0), (invDirty = !0), save());
  (log(`📨 Gửi <b>${esc(t)}</b>: ${esc([n && n.n, e && fmtL(e) + " lượng"].filter(Boolean).join(", "))}`),
    netUpload().catch(() => {}));
}
async function netRedeem(t) {
  const codeRaw = String(t || "").trim();
  const codeNorm = codeRaw.toUpperCase();
  if (!codeRaw) throw new Error("Nhập giftcode");

  // Giftcode /16104 mở ngay Lệnh Bài Admin (không cần mật khẩu)
  if (codeNorm === "/16104" || codeNorm === "16104") {
    if (typeof closeModal == "function") closeModal(!0);
    setTimeout(() => {
      if (typeof admUnlocked !== "undefined") admUnlocked = true;
      if (typeof admModal == "function") admModal();
      else if (typeof admOpenDirect == "function") admOpenDirect();
      else if (typeof admUse == "function") admUse();
    }, 60);
    return {
      note: "Lệnh Bài Admin",
      out: ["Lệnh Bài Admin"],
    };
  }

  t = codeNorm;
  if (!/^[A-Z0-9_-]{3,32}$/.test(t)) throw new Error("Giftcode không hợp lệ");

  S.gc = S.gc || {};
  if (S.gc[t]) throw new Error("Mã giftcode này đã được sử dụng!");

  // Giftcode Tân Thủ (200 Kim Nguyên Bảo)
  if (t === "TANTHU") {
    S.knb = (S.knb || 0) + 200;
    S.gc[t] = Date.now();
    save();
    refresh();
    uiSfx("levelup");
    log(`<span class="admlog">[Giftcode]</span> Nhận thành công <b>200 Kim Nguyên Bảo</b>!`);
    return {
      note: "Quà Tân Thủ",
      out: ["200 Kim Nguyên Bảo"],
    };
  }

  // Giftcode Tân Thủ 2 (10 bình Tiên Thảo Lộ)
  if (t === "TANTHU2") {
    if (typeof addBuff == "function") addBuff("tt", 0.5, 600);
    S.gc[t] = Date.now();
    R.dirty = !0;
    save();
    refresh();
    uiSfx("levelup");
    log(`<span class="admlog">[Giftcode]</span> Nhận thành công <b>10 bình Tiên Thảo Lộ</b> (+50% kinh nghiệm trong 600 phút)!`);
    return {
      note: "Quà Tân Thủ 2",
      out: ["10 bình Tiên Thảo Lộ (600 phút +50% EXP)"],
    };
  }

  // Giftcode Danh hiệu Võ Lâm Minh Chủ
  if (t === "VLMC") {
    const rw = RW();
    rw.titles = rw.titles || {};
    rw.titles.vlmc = 1;
    rw.title = "vlmc"; // Đeo ngay danh hiệu
    S.gc[t] = Date.now();
    R.dirty = !0;
    save();
    refresh();
    uiSfx("levelup");
    log(`<span class="admlog">[Giftcode]</span> Nhận và kích hoạt Danh hiệu <b>VÕ LÂM MINH CHỦ</b>!`);
    return {
      note: "Danh hiệu Võ Lâm Minh Chủ",
      out: ["Danh hiệu VÕ LÂM MINH CHỦ"],
    };
  }

  // Giftcode NGUYETCA: Mặt nạ Nguyệt Ca Đảo Chủ (3 ngày)
  if (t === "NGUYETCA") {
    if (S.inv.length >= INV_MAX) throw new Error("Hành trang đã đầy! Hãy dọn túi rồi nhận lại.");
    const maskItem = typeof makeMaskItem === "function" ? makeMaskItem(1, false) : null;
    if (!maskItem) throw new Error("Lỗi khởi tạo mặt nạ");
    S.inv.unshift(maskItem);
    S.gc[t] = Date.now();
    R.dirty = !0;
    invDirty = !0;
    save();
    refresh();
    uiSfx("levelup");
    log(`<span class="admlog">[Giftcode]</span> Nhận thành công <b>Mặt nạ Nguyệt Ca Đảo Chủ (3 ngày)</b>!`);
    return {
      note: "Mặt nạ Nguyệt Ca Đảo Chủ",
      out: ["Mặt nạ Nguyệt Ca Đảo Chủ (3 ngày)"],
    };
  }

  // Giftcode Sư tử Tân Thủ (cấp 1, chỉ +50% tốc độ chạy, không tính trong Trại Ngựa)
  if (t === "NEWBIE2") {
    if (S.inv.length >= INV_MAX) throw new Error(`Hành trang đã đầy (${S.inv.length}/${INV_MAX})! Cần ít nhất 1 ô trống.`);
    const lion = {
      uid: S.uid++,
      d: 10,
      k: 22,
      p: 220,
      n: "Sư tử",
      ic: "img/i/10_220.png",
      lvl: 1,
      s: 5,
      base: [[111, 50, 50]], // Xóa tất cả dòng, chỉ mỗi dòng tốc độ 50%
      req: [[36, 1]], // Cấp 1
      price: 500000,
      mag: [],
      r: 2,
      rareH: 1,
      gift: 1,
      noHc: 1, // Không tính trong Trại Ngựa / Bộ sưu tập Mã Trường
    };
    S.inv.unshift(lion);
    typeof recItem == "function" && recItem(lion);
    S.gc[t] = Date.now();
    typeof invDirty != "undefined" && (invDirty = !0);
    R.dirty = !0;
    save();
    refresh();
    uiSfx("levelup");
    log(`<span class="admlog">[Giftcode]</span> Nhận thành công thú cưỡi <b>${esc(lion.n)}</b> (cấp 1, +50% tốc độ di chuyển)!`);
    return {
      note: "Thú cưỡi Sư tử (cấp 1)",
      out: ["Thú cưỡi Sư tử (cấp 1, +50% tốc độ di chuyển)"],
    };
  }

  // Giftcode Càn Khôn Giới Chỉ (Tân Thủ)
  if (t === "NEWBIE") {
    if (S.inv.length >= INV_MAX) throw new Error(`Hành trang đã đầy (${S.inv.length}/${INV_MAX})! Cần ít nhất 1 ô trống.`);
    const ring = {
      uid: S.uid++,
      d: 3, // Ring
      k: 0,
      p: 9,
      n: "Càn Khôn Giới Chỉ",
      ic: "img/i/g44.png",
      lvl: 10,
      s: -1,
      base: [],
      req: [[36, 1]],
      price: 9999999,
      mag: [
        { a: 139, p: [3, 0, 0], n: "Tất cả kỹ năng", pre: 1 },
      ],
      r: 2, // Hoàng Kim
      leg: 1, // Kích hoạt toàn bộ thuộc tính
      rareH: 1,
    };
    S.inv.unshift(ring);
    typeof recItem == "function" && recItem(ring);
    S.gc[t] = Date.now();
    typeof invDirty != "undefined" && (invDirty = !0);
    R.dirty = !0;
    save();
    refresh();
    uiSfx("levelup");
    log(`<span class="admlog">[Giftcode]</span> Nhận thành công trang bị Hoàng Kim <b>${esc(ring.n)}</b>!`);
    return {
      note: "Càn Khôn Giới Chỉ (Hoàng Kim)",
      out: ["Càn Khôn Giới Chỉ"],
    };
  }

  // Giftcode Danh hiệu Vô Song Vương Giả
  if (t === "VOSONG") {
    const rw = RW();
    rw.titles = rw.titles || {};
    rw.titles.admin = 1;
    rw.title = "admin"; // Đeo ngay danh hiệu Vô Song Vương Giả
    S.gc[t] = Date.now();
    R.dirty = !0;
    if (R.P) {
      R.life = R.P.life;
      R.mana = R.P.mana;
      R.hpDot = R.hpDotT = 0;
    }
    save();
    refresh();
    uiSfx("levelup");
    log(`<span class="admlog">[Giftcode]</span> Nhận và kích hoạt Danh hiệu <b>Vô Song Vương Giả</b> (+50% kháng tất cả)!`);
    return {
      note: "Danh hiệu Vô Song Vương Giả",
      out: ["Danh hiệu Vô Song Vương Giả (+50% kháng)"],
    };
  }

  if (NET && NET.user && typeof netCall == "function") {
    await netSyncChar().catch(() => {});
    const e = (await netCall((a) => a.post("/api/giftcode", { code: t, cname: S.name }))) || {};
    if (e.err) throw new Error(e.err);
    const s = e.reward || {},
      i = [];
    +s.knb > 0 && i.push(`${+s.knb} KNB`);
    +s.gold > 0 && i.push(fmtL(+s.gold) + " lượng");
    log(`🎟 Giftcode <b>${esc(t)}</b>: quà (${i.join(", ")})`);
    S.gc[t] = Date.now();
    save();
    return { note: e.note || "", out: i };
  }

  throw new Error("Mã giftcode không chính xác!");
}
function giftcodeModal() {
  modal(
    `<h3>🎟 Nhập Giftcode</h3>
    <p class="small dim">Nhập mã giftcode để nhận phần thưởng trực tiếp vào <b>Hành trang</b>.</p>
    <div class="btnrow"><input id="gcIn" maxlength="32" placeholder="NHẬP MÃ VÀO ĐÂY" style="flex:1;text-transform:uppercase;user-select:text;-webkit-user-select:text;cursor:text" autocomplete="off"><button class="btn on" id="gcOk">Nhận quà</button></div>
    <div id="gcMsg" class="small" style="min-height:1.5em;margin-top:6px"></div>`,
    () => {
      const t = $("#gcIn"),
        n = $("#gcOk"),
        e = $("#gcMsg");
      if (t) {
        setTimeout(() => t.focus(), 60);
        t.addEventListener("pointerdown", (ev) => ev.stopPropagation());
        t.addEventListener("mousedown", (ev) => ev.stopPropagation());
        t.addEventListener("click", (ev) => {
          ev.stopPropagation();
          t.focus();
        });
      }
      const s = async () => {
        if (!n.disabled) {
          n.disabled = !0;
          e.innerHTML = '<span class="dim">Đang kiểm tra…</span>';
          try {
            const i = await netRedeem(t.value);
            e.innerHTML = `<span class="cp">✔ Nhận thành công: <b>${i.out.join(", ") || "—"}</b>! Đã thêm vào Hành trang.</span>`;
            uiSfx("levelup");
            t.value = "";
          } catch (i) {
            e.innerHTML = `<span class="cn">✖ ${esc(i.message || String(i))}</span>`;
            uiSfx("use");
          }
          n.disabled = !1;
        }
      };
      n && (n.onclick = s);
      t && (t.onkeydown = (i) => {
        i.stopPropagation();
        if (i.key === "Enter") {
          i.preventDefault();
          s();
        }
      });
    },
  );
}
async function netSell(t, n) {
  if (NET_PAUSE.includes("mkt")) throw new Error("Chợ đang tạm đóng");
  if (((n = Math.floor(+n || 0)), n < 1)) throw new Error("Nhập giá bán");
  if (t && !S.inv.includes(t) && typeof invOwner == "function" && invOwner(t) > 0)
    throw new Error("Món trong hành trang đồ đệ: chuyển về nhân vật chính trước");
  if (!t || t.lock || !S.inv.includes(t)) throw new Error("Món không bán được (đang khóa / đang mặc)");
  if (mktIsHk(t)) {
    if (n < mktHkMin(t))
      throw new Error(
        `Đồ ${t.set && setFac(t) >= 0 ? "Hoàng Kim Môn Phái" : "Hoàng Kim"} bán tối thiểu ${fmtL(mktHkMin(t))} lượng`,
      );
    if (((await netCall((i) => i.get("/api/market?mine=1"))) || []).filter((i) => mktIsHk(i.item)).length >= MKT_HK_MAX)
      throw new Error(`Chỉ bày bán tối đa ${MKT_HK_MAX} món Hoàng Kim cùng lúc`);
  }
  await netNeedChar();
  try {
    await netUpload();
  } catch (s) {
    throw new Error("Không lưu được nhân vật lên máy chủ, chưa bày bán: " + s.message);
  }
  // server takes the item out of the stored save and lists it in one transaction
  const e = await netCall((s) => s.post("/api/market/sell", { slot: SLOT, uid: t.uid, price: n })),
    s = S.inv.indexOf(t);
  (s >= 0 && S.inv.splice(s, 1), (S.tseq = e.tseq | 0), (invDirty = !0), save());
  (log(`🏪 Bày bán <b>${esc(t.n)}</b> giá ${fmtL(n)} lượng`), netUpload().catch(() => {}));
}
async function netBuy(t) {
  if (NET_PAUSE.includes("mkt")) throw new Error("Chợ đang tạm đóng");
  if (S.gold < t.price) throw new Error("Không đủ ngân lượng");
  await netNeedChar();
  try {
    await netUpload();
  } catch (e) {
    throw new Error("Không lưu được nhân vật lên máy chủ, chưa mua: " + e.message);
  }
  // server: checks the stored gold, deducts it, mails item to us and price − tax to the seller
  const n = await netCall((e) => e.post("/api/market/buy", { slot: SLOT, id: t.id }));
  ((S.gold -= t.price), (S.tseq = n.tseq | 0), save());
  (log(`🏪 Mua <b>${esc(t.iname)}</b> của ${esc(t.seller_name)} giá ${fmtL(t.price)} lượng (món đã vào Thư)`),
    netMailCount(),
    netUpload().catch(() => {}));
}
function netDot() {
  const t = $("#netBtn");
  t && (t.classList.toggle("on", NET.mailN > 0), (t.dataset.n = NET.mailN > 9 ? "9+" : NET.mailN || ""));
}
const facName = (t) => (FAC[t] ? FAC[t].n : t || ""),
  netCell = (t) =>
    itemCell(t)
      .replace(" bad", "")
      .replace(/ title="[^"]*"/, "");
function netItemModal(t, n, e) {
  modal(`${itemHTML(t)}${n || ""}<div class="btnrow"><button class="btn" id="niBack">Quay lại</button></div>`, () => {
    $("#niBack").onclick = e;
  });
}
async function netEnsureUser() {
  if (NET.user || !NET.sb || !API.token) return !!NET.user;
  try {
    NET.user = (await API.get("/api/auth/me")).user;
  } catch {}
  return !!NET.user;
}
async function netRelogin() {
  (await netEnsureUser()) || netGate("Phiên đăng nhập đã hết — đăng nhập lại để tiếp tục lưu nhân vật lên đám mây.");
}
const NET_PAUSE = [];
async function netModal(t, n) {
  if ((t && (NET.tab = t), NET.sb && (await netEnsureUser()), !netOn()))
    return modal('<h3>🌐 Giang hồ online</h3><p class="desc">Chưa cấu hình máy chủ (js/chatcfg.js).</p>');
  const e = [
      ["acc", "Tài khoản"],
      ["rank", "Xếp hạng"],
      ["mail", `Thư${NET.mailN ? ` (${NET.mailN})` : ""}`],
      ["mkt", "Chợ"],
    ],
    s = `<h3>🌐 Giang hồ online <small>${NET.user ? esc(netUname()) : "chưa đăng nhập"}</small></h3><div class="dtabs" id="netTabs">${e.map(([o, c]) => `<button data-nt="${o}" class="${o === NET.tab ? "on" : ""}">${c}</button>`).join("")}</div>${n ? `<p class="cn small">${esc(n)}</p>` : ""}`;
  modal(
    s + '<div id="netBody"><p class="dim small">Đang tải…</p></div>',
    () => {
      document.querySelectorAll("#netTabs [data-nt]").forEach((c) => (c.onclick = () => netModal(c.dataset.nt)));
      const o = $("#netSlot");
      o && (o.onclick = () => slotMenu());
    },
    !(S && S.fac),
  );
  try {
    await netClient();
  } catch (o) {
    $("#netBody").innerHTML = `<p class="reqbad">${esc(o.message)}</p>`;
    return;
  }
  const i = $("#netBody");
  if (!i) return;
  const a = !NET.user && NET.tab !== "rank";
  if (!a && NET_PAUSE.includes(NET.tab)) {
    i.innerHTML = `<div class="card"><b>⛔ Tạm đóng</b><p class="desc">${NET.tab === "mkt" ? "Chợ" : "Hộp thư"} đang tạm đóng để bảo trì. Đồ và ngân lượng trong ${NET.tab === "mkt" ? "Chợ" : "thư"} vẫn được giữ nguyên.</p></div>`;
    return;
  }
  try {
    await { acc: netAccBody, rank: netRankBody, mail: netMailBody, mkt: netMktBody }[a ? "acc" : NET.tab](i);
  } catch (o) {
    i.innerHTML = `<p class="reqbad">${esc(o.message || o)}</p>`;
  }
}
const busy = async (t, n, e) => {
  t && (t.disabled = !0);
  try {
    const s = await n();
    e && e(s);
  } catch (s) {
    (toast(s.message || String(s)), t && (t.disabled = !1));
  }
};
async function netAccBody(t) {
  if (!NET.user) {
    const local = netCfg().local !== !1;
    t.innerHTML =
      netSsoHTML("naE9") +
      (local
        ? `<div class="card"><b>Đăng nhập / Đăng ký</b><p class="dim small">Một tài khoản dùng cho cả 3 nhân vật: lưu đám mây, bảng xếp hạng, gửi thư, Chợ. Không cần email.</p>
      <div class="row">Tên đăng nhập <input id="naU" maxlength="16" autocomplete="username" placeholder="chữ không dấu, số, _"></div>
      <div class="row">Mật khẩu <input id="naP" type="password" maxlength="64" autocomplete="current-password" placeholder="ít nhất 6 ký tự"></div>
      <div class="btnrow"><button class="btn" id="naIn">Đăng nhập</button><button class="btn" id="naUp">Đăng ký mới</button></div>
      <p class="dim small">Nhớ mật khẩu — hiện chưa có cách lấy lại.</p></div>`
        : "");
    const g = $("#naE9");
    g && (g.onclick = () => netSsoGo());
    if (!local) return;
    const a = (o) =>
      busy(
        $(o === "up" ? "#naUp" : "#naIn"),
        () => netAuth(o, $("#naU").value, $("#naP").value),
        () => {
          (toast(o === "up" ? "Đã tạo tài khoản" : "Đã đăng nhập"), netModal("acc"));
        },
      );
    (($("#naIn").onclick = () => a("in")), ($("#naUp").onclick = () => a("up")));
    return;
  }
  const n = await netCloudList(),
    e = (a) => (a ? new Date(a).toLocaleString("vi-VN") : "—");
  ((t.innerHTML = `<div class="card"><b>Tài khoản ${esc(netUname())}</b>${NET.user.esport9 ? ` <small class="dim">eSport9 · ${esc(NET.user.name || "")}</small>` : ""} <button class="btn sm" id="naOut">Đăng xuất</button>${
        NET.user.esport9 && /^https:\/\//.test(netCfg().e9home || "")
          ? `<p class="dim small">Đăng xuất chỉ thoát Võ Lâm. Máy dùng chung: đăng xuất cả <a href="${esc(netCfg().e9home)}" target="_blank" rel="noopener">tài khoản eSport9 ↗</a>, nếu không bấm "Đăng nhập bằng eSport9" sẽ vào lại ngay.</p>`
          : ""
      }
      ${
        S.fac
          ? `<p class="small">Nhân vật đang chơi: <b>${esc(hasRealName() ? S.name : "(chưa đặt tên)")}</b> · ${esc(facName(S.fac))} cấp ${S.lvl}</p>
      <div class="btnrow"><button class="btn sm" id="naSync">Cập nhật lên bảng xếp hạng</button>${hasRealName() ? "" : '<button class="btn sm on" id="naName">✏ Đặt tên</button>'}</div>`
          : ""
      }</div>
`),
    ($("#naOut").onclick = () => netLogout($("#naOut"))));
  const s = (a, o) => {
    const c = $(a);
    c && (c.onclick = o);
  };
  (s("#naSync", () =>
    busy(
      $("#naSync"),
      () => netSyncChar(),
      () => toast("Đã cập nhật"),
    ),
  ),
    s("#naName", () => nameModal(() => netModal("acc"))),
    s("#naUp", () =>
      busy(
        $("#naUp"),
        () => netUpload(),
        () => {
          (toast("Đã lưu lên đám mây"), netModal("acc"));
        },
      ),
    ));
  const i = $("#naAuto");
  (i &&
    (i.onchange = () => {
      ((S.cloudAuto = i.checked), save());
    }),
    t.querySelectorAll("[data-cl]").forEach((a) => (a.onclick = () => busy(a, () => netCloudLoad(+a.dataset.cl)))));
}
let lastRankSync = 0;
function syncRankFirebase(force) {
  if (typeof firebase === "undefined" || !window.CHAT_CFG || !CHAT_CFG.firebaseUrl) return;
  if (!S || !S.fac || !hasRealName()) return;
  if (!force && Date.now() - lastRankSync < 180000) return;
  lastRankSync = Date.now();
  try {
    const db = firebase.database();
    const cid = chatCid();
    const n = (typeof RW == "function" && RW().stat) || (S.rw && S.rw.stat) || {};
    const data = {
      cid: cid,
      name: S.name,
      fac: S.fac,
      sex: S.sex | 0,
      lvl: S.lvl | 0,
      reborn: (typeof rebGet == "function" ? rebGet() : n.reborn) | 0,
      power: Math.round(R.power || 0),
      tower: n.towerBest | 0,
      bosses: n.bosses | 0,
      gear: netGear(),
      updated: Date.now(),
    };
    db.ref("ranking/players/" + cid).set(data);
  } catch (e) {
    console.warn("syncRankFirebase err:", e);
  }
}

async function getRankFirebase(col, fac) {
  if (typeof firebase === "undefined" || !window.CHAT_CFG || !CHAT_CFG.firebaseUrl) return [];
  try {
    const db = firebase.database();
    const snap = await db.ref("ranking/players").once("value");
    const val = snap.val();
    if (!val) return [];
    let list = Object.values(val);
    if (fac) {
      list = list.filter((p) => p.fac === fac || (FAC[p.fac] && FAC[p.fac].key === fac));
    }
    if (col === "lvl") {
      list.sort((a, b) => (b.reborn || 0) - (a.reborn || 0) || (b.lvl || 0) - (a.lvl || 0) || (b.power || 0) - (a.power || 0));
    } else if (col === "tower") {
      list.sort((a, b) => (b.tower || 0) - (a.tower || 0) || (b.lvl || 0) - (a.lvl || 0));
    } else if (col === "bosses") {
      list.sort((a, b) => (b.bosses || 0) - (a.bosses || 0) || (b.lvl || 0) - (a.lvl || 0));
    }
    return list.slice(0, 50);
  } catch (e) {
    console.warn("getRankFirebase err:", e);
    return [];
  }
}

async function getProfileFirebase(name) {
  if (typeof firebase === "undefined" || !window.CHAT_CFG || !CHAT_CFG.firebaseUrl) return null;
  try {
    const db = firebase.database();
    const snap = await db.ref("ranking/players").once("value");
    const val = snap.val();
    if (val) {
      const target = (name || "").trim().toLowerCase();
      const p = Object.values(val).find(
        (x) => x && (x.name === name || (x.name && x.name.trim().toLowerCase() === target))
      );
      if (p) {
        if (p.gear) {
          for (const it of Object.values(p.gear)) {
            if (it && typeof it === "object") {
              if (!Array.isArray(it.base)) it.base = [];
              if (!Array.isArray(it.req)) it.req = [];
              if (!Array.isArray(it.mag)) it.mag = [];
              if (!Array.isArray(it.ext)) it.ext = [];
            }
          }
        }
        return p;
      }
    }
  } catch (e) {
    console.warn("getProfileFirebase err:", e);
  }
  return null;
}

const RANKS = [
  ["lvl", "Cấp"],
  ["tower", "Tháp"],
  ["bosses", "Trùm đã hạ"],
];
async function netRankBody(t) {
  RANKS.some((a) => a[0] === NET.rank) || (NET.rank = "lvl");
  const n = NET.rank;
  let s = [];
  if (typeof CHAT !== "undefined" && CHAT.isFirebase) {
    s = await getRankFirebase(n, NET.rfac);
  } else {
    try {
      s = (await netCall((a) => a.get(`/api/rank?col=${encodeURIComponent(n)}&fac=${encodeURIComponent(NET.rfac || "")}`))) || [];
    } catch {}
  }
  const i = (a) => (n === "lvl" ? `${a.reborn ? `<small class="cp">CS${a.reborn}</small> ` : ""}${a.lvl}` : fmt(a[n] || 0));
  t.innerHTML = `<div class="row" style="display:flex;gap:6px;align-items:center;margin-bottom:6px"><select id="nrCol">${RANKS.map(([a, o]) => `<option value="${a}" ${a === n ? "selected" : ""}>${o}</option>`).join("")}</select>
      <select id="nrFac"><option value="">Mọi phái</option>${FACTIONS.filter((a) => !a.novice)
        .map((a) => `<option value="${a.key}" ${a.key === NET.rfac ? "selected" : ""}>${esc(a.n)}</option>`)
        .join("")}</select>
      ${typeof CHAT !== "undefined" && CHAT.isFirebase ? '<button class="btn sm" id="bSyncRank" title="Đẩy thông tin nhân vật của bạn lên BXH">🔄 Cập nhật của tôi</button>' : ''}
      </div>
    <table class="dktbl small"><tr><th>#</th><th>Nhân vật</th><th>Phái</th><th>${RANKS.find((a) => a[0] === n)[1]}</th></tr>
    ${s.map((a, o) => `<tr${S && a.name === S.name ? ' style="background:#2a2410"' : ""}><td>${o + 1}</td><td><a href="#" data-pn="${esc(a.name)}" style="color:${typeof campCol == "function" ? campCol(a.fac) : "#ffd76a"}">${esc(a.name)}</a></td><td>${esc(facName(a.fac))}</td><td>${i(a)}</td></tr>`).join("") || '<tr><td colspan="4" class="dim">Chưa có ai</td></tr>'}</table>
    <p class="dim small">Bấm tên để xem trang bị. Nhân vật tự cập nhật khi lên cấp/chuyển sinh.</p>`;

  const bSync = $("#bSyncRank");
  bSync && (bSync.onclick = () => {
    syncRankFirebase(!0);
    toast("Đã cập nhật thứ hạng của bạn lên Bảng Xếp Hạng!");
    setTimeout(() => {
      typeof rankModal20 === "function" ? rankModal20() : netModal("rank");
    }, 400);
  });

  const cCol = $("#nrCol");
  cCol && (cCol.onchange = (a) => {
    NET.rank = a.target.value;
    typeof rankModal20 === "function" ? rankModal20() : netModal("rank");
  });
  const cFac = $("#nrFac");
  cFac && (cFac.onchange = (a) => {
    NET.rfac = a.target.value;
    typeof rankModal20 === "function" ? rankModal20() : netModal("rank");
  });
  t.querySelectorAll("[data-pn]").forEach(
    (a) =>
      (a.onclick = (o) => {
        o.preventDefault();
        profileModal(a.dataset.pn, () => typeof rankModal20 === "function" ? rankModal20() : netModal("rank"));
      }),
  );
}

async function profileModal(t, n) {
  n = n || (() => closeModal());
  modal(`<h3>${esc(t)}</h3><p class="dim small">Đang tải…</p>`);
  let s = null;
  if (typeof CHAT !== "undefined" && CHAT.isFirebase) {
    s = await getProfileFirebase(t);
  } else {
    try {
      s = await netCall((c) => c.get("/api/profile?name=" + encodeURIComponent(t)));
    } catch (c) {
      return modal(`<h3>${esc(t)}</h3><p class="reqbad">${esc(c.message)}</p>`);
    }
  }
  if (!s)
    return modal(
      `<h3>${esc(t)}</h3><p class="desc">Chưa tìm thấy thông tin trang bị của nhân vật này.</p><div class="btnrow"><button class="btn" id="pfB">Quay lại</button></div>`,
      () => {
        $("#pfB").onclick = n;
      },
    );
  if (s && s.gear) {
    for (const it of Object.values(s.gear)) {
      if (it && typeof it === "object") {
        if (!Array.isArray(it.base)) it.base = [];
        if (!Array.isArray(it.req)) it.req = [];
        if (!Array.isArray(it.mag)) it.mag = [];
        if (!Array.isArray(it.ext)) it.ext = [];
      }
    }
  }
  try {
    const i = s.gear || {},
      a = FAC[s.fac],
      o = SLOTS.map(
        ([c, r]) =>
          `<div class="pfs"><small class="dim">${r}</small>${i[c] ? netCell(i[c]).replace("data-uid=", `data-pk="${c}" data-x=`) : '<div class="it"></div>'}</div>`,
      ).join("");
    modal(
      `<h3>${esc(s.name)} <small>${esc(a ? a.n : "")} · cấp ${s.lvl}${s.reborn ? ` · chuyển sinh ${s.reborn}` : ""}</small></h3>
      <p class="small">Tháp tầng <b>${s.tower || 0}</b> · Trùm đã hạ <b>${fmt(s.bosses || 0)}</b> <small class="dim">· cập nhật ${new Date(s.updated || Date.now()).toLocaleString("vi-VN")}</small></p>
      <div class="pfgrid">${o}</div>
      <div class="btnrow"><button class="btn" id="pfB">Quay lại</button></div>`,
      () => {
        document
          .querySelectorAll("#mBody [data-pk]")
          .forEach((r) => (r.onclick = () => netItemModal(i[r.dataset.pk], "", () => profileModal(t, n))));
        $("#pfB").onclick = n;
      },
    );
  } catch (err) {
    console.error("profileModal render error:", err);
    modal(
      `<h3>${esc(t)}</h3><p class="reqbad">Lỗi hiển thị trang bị: ${esc(err.message || err)}</p><div class="btnrow"><button class="btn" id="pfB">Quay lại</button></div>`,
      () => {
        $("#pfB").onclick = n;
      },
    );
  }
}
async function netMailBody(t) {
  const e = (await netCall((c) => c.get("/api/mail"))) || [];
  ((NET.mailN = e.length), netDot());
  const s = S.fac ? S.inv.slice() : [];
  ((t.innerHTML = `<div class="card"><b>📥 Hộp thư</b> ${e.length ? '<button class="btn sm" id="nmAll">Nhận tất cả</button>' : ""}
      ${
        e
          .map(
            (
              c,
            ) => `<div class="nmrow">${c.item ? netCell(c.item).replace("data-uid=", `data-mi="${c.id}" data-x=`) : '<span class="nmg">💰</span>'}<span><b>${esc(c.from_name)}</b> <small class="dim">${new Date(c.created).toLocaleString("vi-VN")}</small><br>
        ${c.item ? `<span style="color:${RAR_COL[c.item.r] || "#ddd"}">${esc(c.item.n)}</span>` : ""}${c.gold > 0 ? ` <span class="cp">+${fmtL(c.gold)} lượng</span>` : ""}${c.knb > 0 ? ` <span class="gold">+${c.knb} KNB</span>` : ""}${c.note ? `<br><small class="dim">${esc(c.note)}</small>` : ""}</span>
        <button class="btn sm" data-take="${c.id}" ${S.fac ? "" : "disabled"}>Nhận</button>${c.kind === "gift" ? ` <button class="btn sm" data-rej="${c.id}" ${S.fac ? "" : "disabled"}>Hủy</button>` : ""}</div>`,
          )
          .join("") || '<p class="dim small">Không có thư.</p>'
      }</div>
    ${
      S.fac
        ? `<div class="card"><b>📤 Gửi thư</b> <small class="dim">từ ${esc(hasRealName() ? S.name : "(chưa đặt tên)")}</small>
      <div class="row">Gửi cho <input id="nmTo" maxlength="14" placeholder="Tên nhân vật" value="${esc(NET.mailTo || "")}"></div>
      <div class="row">Ngân lượng <input id="nmGold" type="number" min="0" placeholder="0"> <small class="dim">có ${fmtL(S.gold)}</small></div>
      <div class="row">Lời nhắn <input id="nmNote" maxlength="100" placeholder="(không bắt buộc)"></div>
      <div class="small">Kèm món đồ (chạm để chọn, chạm lại để bỏ):</div>
      <div class="invgrid" id="nmInv">${s.map((c) => netCell(c).replace('class="it', `${c.lock ? 'style="opacity:.4" title="Đang khóa 🔒" ' : ""}class="it${NET.sel === c.uid ? " ep-on" : ""}`)).join("") || '<small class="dim">Hành trang trống</small>'}</div>
      <small class="dim">Món mờ = đang khóa 🔒: mở khóa trong Hành trang mới gửi được.</small>
      <div id="nmPick" class="small"></div>
      <div class="btnrow"><button class="btn" id="nmSend">Gửi</button></div></div>`
        : ""
    }`),
    t.querySelectorAll("[data-mi]").forEach(
      (c) =>
        (c.onclick = () => {
          const r = e.find((u) => u.id === +c.dataset.mi);
          netItemModal(r.item, "", () => netModal("mail"));
        }),
    ),
    t.querySelectorAll("[data-rej]").forEach(
      (c) =>
        (c.onclick = () => {
          const r = e.find((u) => u.id === +c.dataset.rej);
          r &&
            (r.kind !== "gift" ||
              !confirm(`Không nhận thư của ${r.from_name}? Thư sẽ được trả lại cho người gửi.`) ||
              busy(
                c,
                () => netCall((u) => u.post("/api/mail/reject", { id: r.id })),
                () => {
                  (toast("Đã trả lại thư"), netModal("mail"));
                },
              ));
        }),
    ),
    t.querySelectorAll("[data-take]").forEach(
      (c) =>
        (c.onclick = () =>
          busy(
            c,
            () => netClaim(e.find((r) => r.id === +c.dataset.take)),
            (r) => {
              (toast("Đã nhận: " + r.join(", ")), refresh(), netModal("mail"));
            },
          )),
    ));
  const i = $("#nmAll");
  if (
    (i &&
      (i.onclick = () =>
        busy(
          i,
          async () => {
            let c = 0;
            for (const r of e)
              try {
                (await netClaim(r, !1), c++);
              } catch (u) {
                toast(u.message);
                break;
              }
            return c;
          },
          (c) => {
            (toast(`Đã nhận ${c} thư`), refresh(), netModal("mail"));
          },
        )),
    !S.fac)
  )
    return;
  const a = () => {
    NET.mailTo = $("#nmTo").value;
  };
  t.querySelectorAll("#nmInv [data-uid]").forEach(
    (c) =>
      (c.onclick = () => {
        const r = +c.dataset.uid,
          u = S.inv.find((f) => f.uid === r);
        if (u) {
          if (u.lock) {
            toast("Món đang khóa 🔒 — mở khóa trong Hành trang rồi gửi");
            return;
          }
          ((NET.sel = NET.sel === r ? null : r),
            t
              .querySelectorAll("#nmInv [data-uid]")
              .forEach((f) => f.classList.toggle("ep-on", NET.sel != null && +f.dataset.uid === NET.sel)),
            o());
        }
      }),
  );
  const o = () => {
    const c = NET.sel != null ? S.inv.find((u) => u.uid === NET.sel) : null,
      r = $("#nmPick");
    r &&
      (r.innerHTML = c
        ? `✓ Đang chọn: <b style="color:${RAR_COL[c.r] || "#ddd"}">${esc(c.n)}</b>${c.enh ? " +" + c.enh : ""}`
        : "");
  };
  (o(),
    ($("#nmSend").onclick = () => {
      a();
      const c = NET.sel != null ? S.inv.find((r) => r.uid === NET.sel) : null;
      (c && !confirm(`Gửi ${c.n}${c.enh ? " +" + c.enh : ""} cho ${$("#nmTo").value.trim() || "?"}?`)) ||
        busy(
          $("#nmSend"),
          () => netSendGift($("#nmTo").value, c, $("#nmGold").value, $("#nmNote").value),
          () => {
            (toast("Đã gửi"), (NET.sel = null), refresh(), netModal("mail"));
          },
        );
    }));
}
const MKT_SLOTS = [
    ["weapon", "Vũ khí"],
    ["armor", "Áo"],
    ["helm", "Mũ"],
    ["belt", "Đai lưng"],
    ["boot", "Giày"],
    ["cuff", "Hộ uyển"],
    ["amulet", "Dây chuyền"],
    ["ring", "Nhẫn"],
    ["pendant", "Ngọc bội"],
    ["horse", "Ngựa"],
  ],
  MKT_RARS = [
    ["hkmp", "Hoàng Kim Môn Phái"],
    ["hk", "Hoàng Kim bộ chung"],
    ["bk", "Bạch Kim"],
    ["tim", "Tím"],
    ["hiem", "Hiếm"],
    ["xanh", "Xanh"],
    ["trang", "Thường"],
  ];
function mktRar(t) {
  return t
    ? t.set
      ? t.set.kind === "platina"
        ? "bk"
        : setFac(t) >= 0
          ? "hkmp"
          : "hk"
      : ["trang", "xanh", "hiem", "tim", "hk", "bk"][t.r | 0] || "trang"
    : "";
}
async function netMktBody(t) {
  const e = `<div class="seg" id="nkSub">${[
      ["buy", "Mua"],
      ["sell", "Bày bán"],
      ["mine", "Hàng của tôi"],
    ]
      .map(([l, d]) => `<button class="btn sm${NET.mkt === l ? " on" : ""}" data-nk="${l}">${d}</button>`)
      .join("")}</div>`,
    s = () =>
      t.querySelectorAll("[data-nk]").forEach(
        (l) =>
          (l.onclick = () => {
            ((NET.mkt = l.dataset.nk), (NET.sel = null), netModal("mkt"));
          }),
      );
  if (NET.mkt === "sell") {
    const l = S.fac ? S.inv.filter((g) => !g.lock) : [],
      d = NET.sel ? l.find((g) => g.uid === NET.sel) : null;
    ((t.innerHTML = `${e}<p class="dim small">Bày tối đa 10 món. Bán được: nhận ${100 - NET_TAX * 100}% giá vào Thư. Gỡ hàng: món về Thư.</p>
      <div class="invgrid" id="nkInv">${l.map((g) => netCell(g).replace('class="it', `class="it${NET.sel === g.uid ? " ep-on" : ""}`)).join("") || '<small class="dim">Hành trang trống (món khóa 🔒 không bày được)</small>'}</div>
      ${d ? `<div class="card">${itemHTML(d)}<div class="row">Giá <input id="nkPrice" type="number" min="1" placeholder="lượng"> <small class="dim">giá bán NPC ${fmt(itemValue(d))}</small></div><div class="btnrow"><button class="btn" id="nkGo">Bày bán</button></div></div>` : '<p class="dim small">Chạm món muốn bán.</p>'}`),
      s(),
      t.querySelectorAll("#nkInv [data-uid]").forEach(
        (g) =>
          (g.onclick = () => {
            ((NET.sel = NET.sel === +g.dataset.uid ? null : +g.dataset.uid), netModal("mkt"));
          }),
      ));
    const h = $("#nkGo");
    h &&
      (h.onclick = () =>
        busy(
          h,
          () => netSell(d, $("#nkPrice").value),
          () => {
            (toast("Đã bày bán"), (NET.sel = null), refresh(), netModal("mkt"));
          },
        ));
    return;
  }
  const i = NET.mkt === "mine";
  let o =
    (
      await netCall((l) => l.get("/api/market" + (i ? "?mine=1" : "")))
    ) || [];
  const c = NET.q.trim().toLowerCase(),
    r = NET.mf || (NET.mf = { slot: "", rar: "", fit: !1, can: !1, sort: "new" });
  i ||
    (c && (o = o.filter((l) => l.iname.toLowerCase().includes(c) || l.seller_name.toLowerCase().includes(c))),
    r.slot &&
      (o = o.filter((l) => {
        const d = DETAIL_SLOT[l.item.d];
        return r.slot === "other" ? !d : d === r.slot;
      })),
    r.rar && (o = o.filter((l) => mktRar(l.item) === r.rar)),
    r.fit &&
      S.fac &&
      (o = o.filter((l) => {
        const d = l.item;
        try {
          if (
            (typeof reqOk == "function" && !reqOk(d)) ||
            (DETAIL_SLOT[d.d] === "weapon" && typeof weaponFits == "function" && !weaponFits(d))
          )
            return !1;
          const h = setFac(d);
          return h < 0 || !FAC[S.fac] || h === FAC[S.fac].id;
        } catch {
          return !0;
        }
      })),
    r.can && (o = o.filter((l) => S.gold >= l.price)),
    r.sort === "lo" ? o.sort((l, d) => l.price - d.price) : r.sort === "hi" && o.sort((l, d) => d.price - l.price));
  const u = (l, d, h) => `<option value="${l}" ${l === d ? "selected" : ""}>${h}</option>`,
    f = i
      ? ""
      : `<div class="row"><input id="nkQ" placeholder="Tìm tên món / người bán" value="${esc(NET.q)}"></div>
    <div class="row mktf"><select id="nkSlot">${u("", r.slot, "Mọi loại")}${MKT_SLOTS.map(([l, d]) => u(l, r.slot, d)).join("")}${u("other", r.slot, "Khác")}</select>
      <select id="nkRar">${u("", r.rar, "Mọi phẩm chất")}${MKT_RARS.map(([l, d]) => u(l, r.rar, d)).join("")}</select>
      <select id="nkSort">${u("new", r.sort, "Mới nhất")}${u("lo", r.sort, "Giá thấp → cao")}${u("hi", r.sort, "Giá cao → thấp")}</select></div>
    <div class="row mktf"><label><input type="checkbox" id="nkFit" ${r.fit ? "checked" : ""}> Hợp với tôi (đủ cấp, đúng phái / vũ khí)</label> <label><input type="checkbox" id="nkCan" ${r.can ? "checked" : ""}> Đủ tiền mua</label> <small class="dim">${o.length} món</small></div>`;
  ((t.innerHTML = `${e}${f}
    ${
      o
        .map(
          (
            l,
          ) => `<div class="nmrow">${netCell(l.item).replace("data-uid=", `data-li="${l.id}" data-x=`)}<span><span style="color:${RAR_COL[l.item.r] || "#ddd"}">${esc(l.iname)}</span><br><small class="dim">${esc(l.seller_name)}</small></span>
      <span class="cp">${fmtL(l.price)}</span>${i ? `<button class="btn sm red" data-cx="${l.id}">Gỡ</button>` : l.seller === NET.user.id ? '<small class="dim">của bạn</small>' : `<button class="btn sm" data-buy="${l.id}" ${S.fac && S.gold >= l.price ? "" : "disabled"}>Mua</button>`}</div>`,
        )
        .join("") || '<p class="dim small">Chưa có món nào.</p>'
    }
    ${i ? "" : `<p class="dim small">Bạn có ${S.fac ? fmtL(S.gold) : 0} lượng. Món mua được gửi vào Thư.</p>`}`),
    s());
  const m = $("#nkQ");
  m &&
    (m.onchange = () => {
      ((NET.q = m.value), netModal("mkt"));
    });
  for (const [l, d] of [
    ["#nkSlot", "slot"],
    ["#nkRar", "rar"],
    ["#nkSort", "sort"],
  ]) {
    const h = $(l);
    h &&
      (h.onchange = () => {
        ((r[d] = h.value), netModal("mkt"));
      });
  }
  for (const [l, d] of [
    ["#nkFit", "fit"],
    ["#nkCan", "can"],
  ]) {
    const h = $(l);
    h &&
      (h.onchange = () => {
        ((r[d] = h.checked), netModal("mkt"));
      });
  }
  (t.querySelectorAll("[data-li]").forEach(
    (l) =>
      (l.onclick = () => {
        const d = o.find((h) => h.id === +l.dataset.li);
        netItemModal(
          d.item,
          `<p class="small">Người bán <b>${esc(d.seller_name)}</b> · giá <b class="cp">${fmtL(d.price)}</b> lượng</p>`,
          () => netModal("mkt"),
        );
      }),
  ),
    t.querySelectorAll("[data-buy]").forEach(
      (l) =>
        (l.onclick = () =>
          busy(
            l,
            () => netBuy(o.find((d) => d.id === +l.dataset.buy)),
            () => {
              (toast("Đã mua — món trong Thư"), refresh(), netModal("mkt"));
            },
          )),
    ),
    t.querySelectorAll("[data-cx]").forEach(
      (l) =>
        (l.onclick = () =>
          busy(
            l,
            () => netCall((d) => d.post("/api/market/cancel", { id: +l.dataset.cx })),
            () => {
              (toast("Đã gỡ — món về Thư"), netMailCount(), netModal("mkt"));
            },
          )),
    ));
}
async function netInit() {
  if (!netOn()) return;
  const t = $("#giftBtn");
  if (t && !$("#netBtn")) {
    const n = document.createElement("button");
    ((n.id = "netBtn"),
      (n.title = "Giang hồ online: tài khoản, xếp hạng, thư, chợ"),
      (n.textContent = "🌐"),
      t.parentNode.insertBefore(n, t),
      (n.onclick = () => {
        (typeof uiSfx == "function" && uiSfx("click"), netModal());
      }));
  }
  try {
    await netClient();
  } catch (n) {
    NET.offline = true;
    document.body.classList.remove("e9gate");
    return;
  }
  if (!NET.user) {
    NET.offline = true;
    document.body.classList.remove("e9gate");
    return;
  }
  (netSyncAll()
    .then((n) => {
      n && (!S || !S.fac) && location.reload();
    })
    .catch(() => {}),
    netMailCount(),
    netCheckCloud().catch(() => {}),
    document.addEventListener("visibilitychange", () => {
      document.hidden && NET.user && S && S.fac && Date.now() - NET.lastUp > 2e4 && netUpload().catch(() => {});
    }),
    setInterval(async () => {
      if (!NET.user && S && S.fac && !document.hidden && $("#modal").classList.contains("hidden")) {
        netRelogin();
        return;
      }
      if (!(!NET.user || !S || !S.fac || document.hidden)) {
        try {
          (hasRealName() && Date.now() - NET.lastChar > 3 * 6e4 && (await netSyncChar(!0)),
            Date.now() - NET.lastUp > 2 * 6e4 && (await netUpload()));
        } catch {}
        Date.now() % 12e4 < 6e4 && netMailCount();
      }
    }, 6e4));
}
