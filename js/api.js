"use strict";
// Small client for our own backend (server/main.py). Replaces supabase-js: REST under /api/,
// world chat over a WebSocket at /api/chat/ws. Session token in localStorage "jxidle_tok".
// Every answer carries X-Volam-Build (+ X-Volam-Drain while the server is being replaced): js/deploy.js
// saves and reloads on a deploy. Production (CHAT_CFG.prod): same origin only, no ?server= override.
const API = (() => {
  const cfg = window.CHAT_CFG || {},
    TK = "jxidle_tok";
  let base = "";
  try {
    cfg.prod || (base = new URLSearchParams(location.search).get("server") || "");
  } catch {}
  base || (base = cfg.server || (/^https?:$/.test(location.protocol) ? location.origin : ""));
  base = String(base).replace(/\/+$/, "");
  let tok = null;
  try {
    tok = localStorage.getItem(TK);
  } catch {}
  const A = {
    base,
    // never talk to the original site's Supabase project, even if asked to
    on: !cfg.off && /^https?:\/\//.test(base) && !/supabase\.(co|in)\b/i.test(base),
    onLost: null,
    get token() {
      return tok;
    },
    setToken(t) {
      tok = t || null;
      try {
        t ? localStorage.setItem(TK, t) : localStorage.removeItem(TK);
      } catch {}
    },
    async req(method, path, body, opt) {
      if (!A.on) throw new Error("Chưa cấu hình máy chủ (js/chatcfg.js)");
      const h = {};
      body !== void 0 && (h["Content-Type"] = "application/json");
      tok && (h.Authorization = "Bearer " + tok);
      let r;
      try {
        r = await fetch(A.base + path, {
          method,
          headers: h,
          body: body === void 0 ? void 0 : JSON.stringify(body),
          cache: "no-store",
          credentials: opt && opt.cookies ? "include" : "same-origin",
        });
      } catch {
        throw new Error("Không kết nối được máy chủ");
      }
      try {
        typeof deployNotice == "function" && deployNotice(r.headers.get("X-Volam-Build"), r.headers.get("X-Volam-Drain") === "1");
      } catch {}
      let j = null;
      try {
        j = await r.json();
      } catch {}
      if (!r.ok) {
        r.status === 401 && tok && !(opt && opt.noLost) && (A.setToken(null), A.onLost && A.onLost());
        const e = new Error((j && j.error) || `Lỗi máy chủ (${r.status})`);
        throw ((e.status = r.status), e);
      }
      return j;
    },
    get: (p) => A.req("GET", p),
    post: (p, b) => A.req("POST", p, b || {}),
    put: (p, b) => A.req("PUT", p, b),
    del: (p) => A.req("DELETE", p),
    wsUrl: (p) => A.base.replace(/^http/, "ws") + p,
  };
  return A;
})();
