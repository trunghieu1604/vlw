"use strict";
const CHAT = { sb: null, ch: null, msgs: [], open: !1, unread: 0, online: 0, state: "off", last: 0, err: "", isFirebase: !1 },
  CHAT_MAX = 150,
  CHAT_KEEP = 80,
  CHAT_GAP = 5000,
  chatCid = () => {
    try {
      let t = localStorage.getItem("jxidle_cid");
      return (
        t ||
          ((t = Math.random().toString(36).slice(2, 12) + Date.now().toString(36)),
          localStorage.setItem("jxidle_cid", t)),
        t
      );
    } catch {
      return "anon" + Math.random().toString(36).slice(2, 10);
    }
  },
  chatName = () => String((S && (S.name || (FAC[S.fac] && FAC[S.fac].n))) || "Vô danh").slice(0, 20),
  chatTime = (t) => {
    const e = new Date(t || Date.now());
    return `${String(e.getHours()).padStart(2, "0")}:${String(e.getMinutes()).padStart(2, "0")}`;
  };

function chatDom() {
  if ($("#chatBox")) return;
  const battle = $("#battle");
  if (!battle) return;
  const t = document.createElement("div");
  ((t.id = "chatBox"),
    (t.innerHTML = `<div id="chatHead"><b>Thế giới</b><small id="chatOn"></small><button id="chatX" title="Thu gọn">▾</button></div>
    <div id="chatLines"></div>
    <form id="chatIn" autocomplete="off"><span id="chatAtt"></span><input id="chatTxt" maxlength="${CHAT_MAX}" placeholder="Nhập tin nhắn…"><button class="btn sm">Gửi</button></form>
    <button id="chatBtn" title="Chat thế giới">💬<b id="chatN"></b></button>`),
    battle.appendChild(t),
    ($("#chatLines").onclick = (e) => {
      const n = e.target.closest("[data-ci]");
      if (n) {
        chatItemShow(n.dataset.ci);
        return;
      }
      const s = e.target.closest("[data-pn]");
      s && CHAT.open && typeof profileModal == "function" && profileModal(s.dataset.pn);
    }),
    ($("#chatBtn").onclick = () => chatToggle(!0)),
    ($("#chatX").onclick = () => chatToggle(!1)),
    ($("#chatIn").onsubmit = (e) => {
      (e.preventDefault(), chatSend($("#chatTxt").value));
    }));
}

function chatToggle(t) {
  CHAT.open = t;
  const box = $("#chatBox");
  box && box.classList.toggle("open", t);
  document.body.classList.toggle("chat-open", !!t);
  if (t) {
    CHAT.unread = 0;
    if (!CHAT.isFirebase) chatPoll(!0);
    setTimeout(() => {
      const e = $("#chatTxt");
      e && !matchMedia("(pointer:coarse)").matches && e.focus();
    }, 0);
  }
  chatRender();
}

function chatLine(t) {
  return t.sys
    ? `<div class="cl sys">${esc(t.msg)}</div>`
    : `<div class="cl${t.cid === chatCid() ? " me" : ""}${t.pending ? " pend" : ""}"><i>${chatTime(t.ts)}</i> <b data-pn="${esc(t.name)}"${(() => {
        const n = FACTIONS.find((s) => s.n === t.fac);
        return typeof campCol == "function" ? ` style="color:${campCol(n ? n.key : "")}"` : "";
      })()}>${esc(t.name)}</b>${t.lvl ? `<small> ${esc(t.fac || "")} ${t.lvl}</small>` : ""}: ${chatMsgHTML(t)}</div>`;
}

function chatRender() {
  CHAT.rq ||
    (CHAT.rq = requestAnimationFrame(() => {
      ((CHAT.rq = 0), chatRenderNow());
    }));
}

function chatRenderNow() {
  const t = $("#chatBox");
  if (!t) return;
  const e = CHAT.msgs.filter((o) => o.sys || !chatIsCode(o.msg)),
    n = CHAT.open ? e : e.slice(-4),
    s =
      CHAT.state === "off"
        ? '<div class="cl sys">Chat chưa bật (điền js/chatcfg.js)</div>'
        : CHAT.state === "load"
          ? '<div class="cl sys">Đang kết nối…</div>'
          : CHAT.state === "err"
            ? `<div class="cl sys">Không kết nối được chat${CHAT.err ? ": " + esc(CHAT.err) : ""}</div>`
            : "",
    a = $("#chatLines");
  if (!a) return;
  const i = a.scrollTop + a.clientHeight >= a.scrollHeight - 30,
    c = (CHAT.open || !CHAT.msgs.length ? s : "") + n.map(chatLine).join("");
  (c !== CHAT.lastH && ((CHAT.lastH = c), (a.innerHTML = c), (i || !CHAT.open) && (a.scrollTop = a.scrollHeight)),
    ($("#chatOn").textContent =
      CHAT.state === "ok" && CHAT.online
        ? ` · ${CHAT.online} người online`
        : CHAT.state === "ok" && !CHAT.subOk
          ? " · đang nối…"
          : ""),
    (() => {
      const u = CHAT.unread ? (CHAT.unread > 9 ? "9+" : CHAT.unread) : "";
      const n1 = $("#chatN");
      n1 && (n1.textContent = u);
      const u2 = $("#u20chatBtn");
      if (u2) {
        let b = u2.querySelector("b");
        if (!b) {
          b = document.createElement("b");
          u2.appendChild(b);
        }
        b.textContent = u;
      }
    })(),
    t.classList.toggle("quiet", !CHAT.open && !CHAT.msgs.length && CHAT.state === "off"));
}

function chatPush(t) {
  if (!t) return;
  if (t.id && CHAT.msgs.some((e) => String(e.id) === String(t.id))) return;
  if (t.cid === chatCid()) {
    const e = CHAT.msgs.findIndex((n) => n.pending && n.msg === t.msg);
    if (e >= 0) {
      ((CHAT.msgs[e] = t), chatRender());
      return;
    }
  }
  (CHAT.msgs.push(t),
    CHAT.msgs.length > CHAT_KEEP && CHAT.msgs.shift(),
    !CHAT.open && !t.sys && t.cid !== chatCid() && CHAT.unread++,
    chatRender());
}

const CHAT_CODE =
    /^\s*[\/／](?!spam\b)|(?<![A-Za-z0-9])[SR]\s*\.\s*[a-z_]{2,}\s*(\[|=|\.|\()|\w\s*=>\s*[\{\w(]|\bconsole\b|localStorage|sessionStorage|\.forEach\s*\(|\bfunction\s*\(|\bdocument\s*\.|\bwindow\s*\.|\beval\s*\(|Object\s*\.\s*(keys|assign|values)/i,
  chatIsCode = (t) => CHAT_CODE.test(String(t || ""));

function chatPruneFirebase() {
  if (!CHAT.isFirebase || !CHAT.sb || Math.random() > 0.15) return;
  try {
    CHAT.sb.ref("chat/msgs").once("value", (snap) => {
      const count = snap.numChildren();
      if (count > 80) {
        let toRemove = count - 60;
        snap.forEach((child) => {
          if (toRemove > 0) {
            child.ref.remove();
            toRemove--;
          }
        });
      }
    });
  } catch {}
}

function chatInitFirebasePresence() {
  if (!CHAT.sb) return;
  try {
    const myCid = chatCid();
    const myRef = CHAT.sb.ref("chat/presence/" + myCid);
    const connectedRef = CHAT.sb.ref(".info/connected");
    const listRef = CHAT.sb.ref("chat/presence");

    connectedRef.on("value", (snap) => {
      if (snap.val() === true) {
        myRef.onDisconnect().remove();
        myRef.set({
          name: chatName(),
          fac: FAC[S.fac] ? FAC[S.fac].n : "",
          lvl: (S && S.lvl) | 0,
          ts: Date.now()
        });
      }
    });

    listRef.on("value", (snap) => {
      const val = snap.val();
      if (val && typeof val === "object") {
        CHAT.online = Math.max(1, Object.keys(val).length);
      } else {
        CHAT.online = 1;
      }
      chatRender();
    });

    window.addEventListener("pagehide", () => {
      try {
        myRef.remove();
      } catch {}
    });
  } catch (e) {
    console.warn("Presence err:", e);
  }
}

async function chatSend(t) {
  if (
    ((t = String(t || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, CHAT_MAX)),
    !t && CHAT.att && (t = `[${CHAT.att.n}]`),
    !t)
  )
    return;
  const spamMatch = t.match(/^\/spam(?:\s+(.*))?$/i);
  if (spamMatch) {
    const msgText = (spamMatch[1] || "").trim();
    if (!msgText) return toast("Cú pháp: /spam <nội dung thông báo>");
    const isAdm = (typeof S !== "undefined" && S && S.adm) ||
                  (typeof admHostOk === "function" && admHostOk()) ||
                  (typeof admUnlocked !== "undefined" && admUnlocked);
    if (!isAdm) return toast("Lệnh /spam chỉ dành cho Admin!");
    const bcastMsg = "📢 [THÔNG BÁO]: " + msgText;
    if (typeof firebase !== "undefined" && window.CHAT_CFG && CHAT_CFG.firebaseUrl) {
      try {
        await firebase.database().ref("chat/msgs").push({
          cid: "admin",
          sys: true,
          name: "Hệ Thống",
          msg: bcastMsg,
          ts: Date.now()
        });
        $("#chatTxt").value = "";
        toast("Đã phát thông báo toàn server!");
      } catch (e) {
        toast("Lỗi phát thông báo: " + e.message);
      }
    } else {
      CHAT.msgs.push({
        id: "sys" + Date.now(),
        cid: "admin",
        sys: true,
        name: "Hệ Thống",
        msg: bcastMsg,
        ts: Date.now()
      });
      chatRender();
      $("#chatTxt").value = "";
      toast("Đã phát thông báo toàn server!");
    }
    return;
  }
  if (chatIsCode(t)) return toast("Không gửi được tin dạng câu lệnh / mã lệnh");
  if (!CHAT.sb) return toast(CHAT.state === "load" ? "Chat đang kết nối, thử lại sau giây lát" : "Chat chưa kết nối");
  if (typeof hasRealName == "function" && !hasRealName())
    return nameModal(() => {
      (chatToggle(!0), ($("#chatTxt").value = t));
    });
  if (Date.now() - CHAT.last < CHAT_GAP)
    return toast(`Chờ ${Math.ceil((CHAT_GAP - (Date.now() - CHAT.last)) / 1e3)} giây nữa mới gửi được`);
  if (!CHAT.isFirebase && typeof NET != "undefined" && !NET.user) return toast("Đăng nhập tài khoản (nút 🌐) để chat");
  ((CHAT.last = Date.now()), ($("#chatTxt").value = ""));
  if (!CHAT.isFirebase && typeof netNeedChar == "function") await netNeedChar().catch(() => {});
  const e = { cid: chatCid(), name: chatName(), fac: FAC[S.fac] ? FAC[S.fac].n : "", lvl: (S && S.lvl) | 0, msg: t },
    n = CHAT.att;
  if (n) {
    e.item = n;
    const c = `[${n.n}]`;
    t.includes(c) || (e.msg = (t === c ? "" : t.slice(0, CHAT_MAX - c.length - 1) + " ") + c);
  }
  const s = Object.assign({ id: "tmp" + Date.now(), ts: Date.now(), pending: !0 }, e);
  (CHAT.msgs.push(s), chatAttach(null), chatRender());

  if (CHAT.isFirebase) {
    try {
      e.ts = Date.now();
      const ref = CHAT.sb.ref("chat/msgs").push();
      await ref.set(e);
      s.id = ref.key;
      s.pending = false;
      chatRender();
      chatPruneFirebase();
    } catch (err) {
      CHAT.msgs = CHAT.msgs.filter((c) => c !== s);
      chatRender();
      n && chatAttach(n);
      toast("Gửi lỗi: " + (err.message || ""));
      $("#chatTxt").value = t;
      CHAT.last = 0;
    }
    return;
  }

  let a = null;
  try {
    a = await API.post("/api/chat", e);
  } catch (i) {
    ((CHAT.msgs = CHAT.msgs.filter((c) => c !== s)),
      chatRender(),
      n && chatAttach(n),
      toast("Gửi lỗi: " + (i.message || "")),
      ($("#chatTxt").value = t),
      (CHAT.last = 0));
    return;
  }
  if (a) {
    const c = CHAT.msgs.indexOf(s);
    (c >= 0 ? (CHAT.msgs.some((o) => o.id === a.id) ? CHAT.msgs.splice(c, 1) : (CHAT.msgs[c] = a)) : chatPush(a),
      chatRender());
  }
}

async function chatInit() {
  const cfg = window.CHAT_CFG || {};
  if (cfg.off) {
    document.body.classList.add("nochat");
    return;
  }
  document.body.classList.remove("nochat");
  chatDom();

  if (cfg.firebaseUrl) {
    if (typeof firebase === "undefined") {
      CHAT.state = "err";
      CHAT.err = "Chưa nạp Firebase SDK";
      chatRender();
      return;
    }
    try {
      CHAT.state = "load";
      chatRender();
      if (!firebase.apps || !firebase.apps.length) {
        firebase.initializeApp({ databaseURL: cfg.firebaseUrl });
      }
      const db = firebase.database();
      CHAT.sb = db;
      CHAT.isFirebase = true;
      CHAT.state = "ok";
      CHAT.subOk = true;

      db.ref("chat/msgs").limitToLast(60).on("child_added", (snap) => {
        const val = snap.val();
        if (val) {
          val.id = snap.key;
          chatPush(val);
        }
      });

      db.ref("chat/msgs").on("value", (snap) => {
        if (!snap.exists() || !snap.hasChildren()) {
          CHAT.msgs = [];
          CHAT.unread = 0;
          CHAT.lastH = "";
          const a = $("#chatLines");
          if (a) a.innerHTML = "";
          chatRender();
        }
      });

      chatInitFirebasePresence();
      typeof syncRankFirebase == "function" && syncRankFirebase();
      typeof wbInitFirebase == "function" && wbInitFirebase();
      chatRender();
      return;
    } catch (e) {
      console.error("Firebase init failed:", e);
      CHAT.state = "err";
      CHAT.err = e.message || String(e);
      chatRender();
      return;
    }
  }

  if (cfg.server) {
    try {
      CHAT.state = "load";
      chatRender();
      CHAT.sb = !0;
      chatSub();
      await chatPoll(!0);
    } catch (e) {
      CHAT.state = "err";
      CHAT.err = e.message || "";
      chatRender();
    }
  } else {
    CHAT.state = "off";
    chatRender();
  }
}

function chatClearAll() {
  if (typeof CHAT !== "undefined" && CHAT) {
    CHAT.msgs = [];
    CHAT.unread = 0;
    CHAT.lastH = "";
    CHAT.last = 0;
  }
  const a = typeof $ === "function" ? $("#chatLines") : document.getElementById("chatLines");
  if (a) a.innerHTML = "";
  const n = typeof $ === "function" ? $("#chatN") : document.getElementById("chatN");
  if (n) { n.textContent = ""; n.style.display = "none"; }
  if (typeof chatRender === "function") chatRender();

  if (typeof R !== "undefined" && R) {
    R.logs = [];
    R.logDirty = true;
    const lb = typeof $ === "function" ? $("#logBox") : document.getElementById("logBox");
    if (lb) lb.innerHTML = "";
    const u20 = typeof $ === "function" ? $("#u20lines") : document.getElementById("u20lines");
    if (u20) u20.innerHTML = "";
  }
  if (typeof u20LogDraw === "function") u20LogDraw();

  const db = typeof getFirebaseDb === "function" ? getFirebaseDb() : (typeof firebase !== "undefined" && firebase.apps && firebase.apps.length ? firebase.database() : null);
  if (db) {
    try {
      db.ref("chat/msgs").remove();
    } catch (e) {
      console.warn("chatClearAll err:", e);
    }
  }
}
window.chatClearAll = chatClearAll;

const CHAT_IT_DROP = new Set(["uid", "lock", "price", "dtk"]);
function chatItemClean(t, e = 0) {
  if (!(e > 4 || t == null)) {
    if (typeof t == "number") return Number.isFinite(t) ? t : void 0;
    if (typeof t == "boolean") return t;
    if (typeof t == "string") return t.slice(0, 60);
    if (Array.isArray(t))
      return t
        .slice(0, 24)
        .map((n) => chatItemClean(n, e + 1))
        .filter((n) => n !== void 0);
    if (typeof t == "object") {
      const n = {};
      let s = 0;
      for (const a in t) {
        if (CHAT_IT_DROP.has(a) || ++s > 30 || !/^\w{1,12}$/.test(a)) continue;
        const i = chatItemClean(t[a], e + 1);
        i !== void 0 && (n[a] = i);
      }
      return n;
    }
  }
}

function chatItemOk(t) {
  return !t ||
    typeof t != "object" ||
    !J.items[t.d] ||
    typeof t.n != "string" ||
    !t.n ||
    ((t = chatItemClean(t)),
    (t.r = clamp(Math.round(+t.r || 0), 0, RAR_COL.length - 1)),
    (t.lvl = clamp(Math.round(+t.lvl || 1), 1, 99)),
    (typeof t.ic != "string" || !/^img\/[\w\/.-]+\.(png|webp|jpg)$/.test(t.ic) || t.ic.includes("..")) && delete t.ic,
    Array.isArray(t.mag) || (t.mag = []),
    (typeof eqBanned == "function" && eqBanned(t)) || (typeof eqRemoved == "function" && eqRemoved(t)))
    ? null
    : t;
}

function chatAttach(t) {
  CHAT.att = t ? chatItemOk(chatItemClean(t)) : null;
  const e = $("#chatAtt");
  if (!e) return;
  e.innerHTML = CHAT.att
    ? `<b style="color:${RAR_COL[CHAT.att.r]}">[${esc(CHAT.att.n)}]</b><button type="button" title="Bỏ đính kèm">✕</button>`
    : "";
  const n = e.querySelector("button");
  n && (n.onclick = () => chatAttach(null));
}

function chatMsgHTML(t) {
  const e = t.item && chatItemOk(t.item);
  let n = esc(t.msg);
  if (e) {
    const s = esc(`[${e.n}]`),
      a = `<a class="chit" data-ci="${esc(t.id || "")}" style="color:${RAR_COL[e.r]}">${s}</a>`;
    n = n.includes(s) ? n.replace(s, a) : n + " " + a;
  }
  return n;
}

function chatItemShow(t) {
  const e = CHAT.msgs.find((a) => String(a.id) === String(t)),
    n = e && chatItemOk(e.item);
  if (!n) return;
  let s = "";
  try {
    s = itemHTML(n);
  } catch {
    s = `<h4 style="color:${RAR_COL[n.r]}">${esc(n.n)}</h4><p class="dim">Không đọc được chi tiết món đồ.</p>`;
  }
  modal(`<h3>Đồ của ${esc(e.name)} <small>${esc(e.fac || "")} ${e.lvl || ""}</small></h3>${s}`);
}

function chatShowItem(t) {
  if (document.body.classList.contains("nochat")) return toast("Bản chơi trên máy không có chat");
  if (!$("#chatBox")) return toast("Chat chưa bật");
  (closeModal(!0), chatAttach(t), chatToggle(!0), toast("Đã đính kèm vào chat · gõ thêm lời nhắn rồi bấm Gửi"));
}

const CHAT_RT = !0;
async function chatSub() {
  if (CHAT.isFirebase) {
    CHAT.subOk = !0;
    return;
  }
  if (!CHAT_RT) {
    CHAT.subOk = !0;
    return;
  }
  if (!CHAT.sb || CHAT.subBusy) return;
  const t = CHAT.ch;
  if (((CHAT.ch = null), clearTimeout(CHAT.reT), t))
    try {
      t.close();
    } catch {}
  let e;
  try {
    e = new WebSocket(API.wsUrl("/api/chat/ws"));
  } catch {
    return;
  }
  const n = (CHAT.ch = {
    state: "joining",
    track(s) {
      try {
        e.readyState === 1 && e.send(JSON.stringify(Object.assign({ t: "track", cid: chatCid() }, s)));
      } catch {}
    },
    close() {
      ((n.state = "closed"), e.close());
    },
  });
  ((e.onopen = () => {
    CHAT.ch === n &&
      ((n.state = "joined"),
      (CHAT.subOk = !0),
      (CHAT.reN = 0),
      (CHAT.state = "ok"),
      (CHAT.err = ""),
      n.track({ name: chatName(), lvl: (S && S.lvl) | 0 }),
      chatRender());
  }),
    (e.onmessage = (s) => {
      if (CHAT.ch !== n) return;
      let i;
      try {
        i = JSON.parse(s.data);
      } catch {
        return;
      }
      if (i.t === "deploy" || i.t === "hello")
        typeof deployNotice == "function" && deployNotice(i.build, i.t === "deploy");
      i.t === "msg" && i.m
        ? chatPush(i.m)
        : (i.t === "on" || i.t === "hello") && ((CHAT.online = i.n ?? i.online ?? 0), chatRender());
    }),
    (e.onclose = () => {
      CHAT.ch === n &&
        n.state !== "closed" &&
        ((n.state = "closed"),
        (CHAT.subOk = !1),
        chatRender(),
        clearTimeout(CHAT.reT),
        (CHAT.reN = (CHAT.reN || 0) + 1),
        (CHAT.reT = setTimeout(chatSub, Math.min(12e4, 3e3 * 2 ** Math.min(6, CHAT.reN - 1)) + Math.random() * 3e3)));
    }));
}

async function chatPoll(t) {
  if (CHAT.isFirebase || !CHAT.sb || document.hidden) return;
  const n = CHAT_RT && CHAT.subOk && CHAT.ch && CHAT.ch.state === "joined" ? 6e4 : CHAT.open ? 8e3 : 3e4;
  if (!(t !== !0 && Date.now() - (CHAT.polled || 0) < n)) {
    ((CHAT.polled = Date.now()), CHAT_RT && !CHAT.reN && (!CHAT.ch || CHAT.ch.state === "closed") && chatSub());
    try {
      const s = CHAT.msgs.reduce((i, c) => Math.max(i, +c.id || 0), 0);
      ((await API.get("/api/chat?after=" + s)) || []).forEach(chatPush);
    } catch {}
  }
}
