"use strict";
// Admin console commands (section "player-edit", server/admin_sections/player_edit.py, docs/admin-console.md).
//
// The server edits a stored save through its sequence log (ledger + tseq): gold / KNB / items directly, and what has
// to run the game's own code (level, EXP, resetting points, moving a given item into a disciple's bag, taking off a
// worn item) as a *command* queued in the save by a patch op of the same ledger entry:
//     S.admQ = {"<id>": {id, op: "lvl"|"xp"|"reset"|"move"|"rm", ch: 0 | disciple k, t, by, n, …}}
// It reaches the game like every ledger entry: in the downloaded save (reload / another device) or in the `adj.patch`
// of an upload made on an older copy (js/net.js netAdj → GCFG.applyPatch). This file runs the queue through the game's
// code paths (level-up loop + onLevelUp, Tẩy Tủy, withChar for disciples, invGive) once the game is running,
// remembers applied ids in S.admDone (a replayed command never runs twice), empties S.admQ, saves and uploads.
// Load it after js/gameconfig.js and before js/main.js.
(function () {
  const TAG = "[Quản trị]",
    DONE_MAX = 200;
  // ---------- applying
  const ready = () =>
    typeof S != "undefined" && S && S.fac && typeof R != "undefined" && R && R.P && !(typeof PCTX != "undefined" && PCTX) && !(typeof SAVE_LOCK != "undefined" && SAVE_LOCK);
  const inCh = (k, fn) => {
    k = k | 0;
    if (!k) return fn();
    if (typeof withChar != "function" || typeof partyN != "function" || k > partyN()) return null;
    return withChar(k, fn);
  };
  const nm = () => (typeof PCTX != "undefined" && PCTX ? esc(S.name || "") + ": " : "");
  function lvLoop() {
    const cap = typeof levelCap == "function" ? levelCap() : 200;
    let up = 0;
    // same step as gainXp() (js/combat.js) / admLvLoop (js/admin.js), onLevelUp once for the whole jump
    for (; S.lvl < cap && S.xp >= lvNeed(S.lvl); )
      ((S.xp -= lvNeed(S.lvl)), S.lvl++, (S.attrPts += PTS_PER_LEVEL), (S.skPts += SKILL_PTS_PER_LEVEL), up++);
    S.lvl >= cap && (S.xp = 0);
    if (up) ((R.dirty = !0), typeof onLevelUp == "function" && onLevelUp());
    return up;
  }
  // Tẩy Tủy (js/vocong.js tayTuy) without its UI: 90-level book skills keep their level, the rest is refunded
  function resetPts(a, s) {
    if (a) for (const k in S.attr) ((S.attrPts += S.attr[k] | 0), (S.attr[k] = 0));
    if (s) {
      const keep = {},
        bk = S.bkOk || (S.bkOk = {});
      for (const id in S.sk) {
        const t = SK[id];
        t && t.book && (bk[id] = 1);
        t && t.tier === 90 && !(typeof isBr90 == "function" && isBr90(id)) ? (keep[id] = S.sk[id]) : (S.skPts += S.sk[id] | 0);
      }
      ((S.sk = keep), (S.main = 0), (S.mainLock = !1), (S.slots = [0, 0, 0, 0]));
    }
    R.dirty = !0;
  }
  function lvSet(v) {
    const cap = typeof levelCap == "function" ? levelCap() : 200,
      to = clamp(v | 0, 1, cap),
      from = S.lvl;
    if (to > from) {
      let need = -S.xp;
      for (let l = from; l < to; l++) need += lvNeed(l);
      S.xp += Math.max(0, need);
      lvLoop();
      return `${nm()}lên cấp ${from} → <b>${S.lvl}</b>`;
    }
    if (to === from) return `${nm()}đang ở cấp ${from}`;
    // down (the server refused the unsafe cases: faction joined below 10, 90-level skills below 90):
    // refund every point, take away the points of the lost levels, take off gear above the new level
    resetPts(!0, !0);
    const d = from - to;
    ((S.lvl = to), (S.xp = 0), (S.attrPts = Math.max(0, S.attrPts - d * PTS_PER_LEVEL)), (S.skPts = Math.max(0, S.skPts - d * SKILL_PTS_PER_LEVEL)));
    const eqLv = typeof eqLevel == "function" ? eqLevel() : to;
    let off = 0;
    for (const k of Object.keys(S.eq || {})) {
      const it = S.eq[k];
      if (!it || !(it.req || []).some(([n, e]) => n === 36 && e > eqLv)) continue;
      if (S.inv.length >= INV_MAX) break;
      (S.inv.unshift(it), delete S.eq[k], off++);
    }
    R.dirty = !0;
    return `${nm()}giảm cấp ${from} → <b>${to}</b> (tẩy điểm, trừ ${d * PTS_PER_LEVEL} tiềm năng / ${d * SKILL_PTS_PER_LEVEL} kỹ năng${off ? `, tháo ${off} món quá cấp` : ""})`;
  }
  function xpAdd(v) {
    v = +v || 0;
    if (v < 0) return ((S.xp = Math.max(0, (+S.xp || 0) + v)), `${nm()}${fmt(v)} kinh nghiệm`);
    const from = S.lvl;
    S.xp = (+S.xp || 0) + v;
    lvLoop();
    return `${nm()}+${fmt(v)} kinh nghiệm${S.lvl > from ? ` · lên cấp <b>${S.lvl}</b>` : ""}`;
  }
  function rmUid(uid) {
    const owners = [S].concat(Array.isArray(S.party) ? S.party.filter(Boolean) : []);
    for (const o of owners) {
      const i = Array.isArray(o.inv) ? o.inv.findIndex((x) => x && x.uid === uid) : -1;
      if (i >= 0) return o.inv.splice(i, 1)[0];
      for (const k in o.eq || {})
        if (o.eq[k] && o.eq[k].uid === uid) {
          const it = o.eq[k];
          delete o.eq[k];
          return it;
        }
    }
    for (const n of ["stable", "epBox"]) {
      const b = S[n],
        i = Array.isArray(b) ? b.findIndex((x) => x && x.uid === uid) : -1;
      if (i >= 0) return b.splice(i, 1)[0];
    }
    return null;
  }
  function moveTo(uids, k) {
    let n = 0;
    for (const u of uids || []) {
      const it = S.inv.find((x) => x && x.uid === u);
      if (!it) continue;
      if (typeof invGive == "function") invGive(it, k).ok && n++;
    }
    return `chuyển ${n}/${(uids || []).length} món vào hành trang ${esc((typeof charGet == "function" && charGet(k, "name")) || "đồ đệ " + k)}`;
  }
  function run(g) {
    switch (g.op) {
      case "lvl":
        return inCh(g.ch, () => lvSet(g.v));
      case "xp":
        return inCh(g.ch, () => xpAdd(g.v));
      case "reset":
        return inCh(g.ch, () => (resetPts(!!g.a, !!g.s), `${nm()}tẩy ${[g.a && "tiềm năng", g.s && "kỹ năng"].filter(Boolean).join(" + ")}: ${S.attrPts} tiềm năng, ${S.skPts} điểm kỹ năng`));
      case "move":
        return moveTo(g.uids, g.ch | 0);
      case "gold":
        S.gold = Math.max(0, (S.gold || 0) + (+g.v || 0));
        return `${nm()}${(+g.v >= 0 ? "+" : "") + fmtL(g.v)} ngân lượng`;
      case "knb":
        S.knb = Math.max(0, (S.knb || 0) + (+g.v || 0));
        return `${nm()}${(+g.v >= 0 ? "+" : "") + (+g.v)} KNB`;
      case "msg":
        setTimeout(() => {
          typeof modal === "function" && modal(
            `<h3>📢 Lời Nhắn Từ Quản Trị Viên</h3>
            <p class="desc" style="font-size:14px;color:#ffd76a;padding:8px 0;line-height:1.5">${esc(g.v)}</p>
            <div class="btnrow"><button class="btn primary" onclick="closeModal()">Đã Hiểu</button></div>`
          );
        }, 100);
        return `${nm()}lời nhắn: ${esc(g.v)}`;
      case "rm": {
        const it = rmUid(g.uid);
        return it ? `thu hồi <b>${esc(it.n || "")}</b>` : "";
      }
      case "reborn": {
        const from = typeof rebGet === "function" ? rebGet() : ((S.rw && S.rw.stat && S.rw.stat.reborn) | 0);
        let to = from;
        if (typeof g.v !== "undefined") {
          to = Math.max(0, Math.min(10, Math.floor(+g.v) || 0));
        } else if (typeof g.delta !== "undefined") {
          to = Math.max(0, Math.min(10, from + (+g.delta || 0)));
        }
        if (typeof rebSet === "function") rebSet(to);
        else {
          const rw = S.rw || (S.rw = {});
          (rw.stat || (rw.stat = {})).reborn = to;
        }
        let off = 0;
        if (to < from) {
          const eqLv = typeof eqLevel === "function" ? eqLevel() : (S.lvl || 1);
          for (const k of Object.keys(S.eq || {})) {
            const it = S.eq[k];
            if (!it || !(it.req || []).some(([n, e]) => n === 36 && e > eqLv)) continue;
            if (S.inv.length >= INV_MAX) break;
            S.inv.unshift(it);
            delete S.eq[k];
            off++;
          }
        }
        R.dirty = !0;
        typeof invDirty !== "undefined" && (invDirty = !0);
        return `${nm()}${to < from ? "giảm" : "chỉnh"} chuyển sinh ${from} → <b>CS ${to}</b>${off ? ` (tháo ${off} món quá cấp)` : ""}`;
      }
      case "horse": {
        let h = null;
        if (g.isTm || (g.horseId && String(g.horseId).startsWith("tm_"))) {
          const tmId = g.tmId != null ? g.tmId : String(g.horseId).replace(/^tm_/, "");
          if (typeof makeThanMa === "function") h = makeThanMa(+tmId || tmId);
        } else if (g.k != null && g.lvl != null) {
          if (typeof makeItem === "function") {
            h = makeItem(10, g.k, g.lvl, 0);
            if (h && typeof HORSE_RARE !== "undefined" && HORSE_RARE.includes(g.k)) {
              h.r = 2;
              h.rareH = 1;
            }
          }
        }
        if (!h && g.horseId) {
          const hs = typeof admHorses === "function" ? admHorses() : [];
          const found = hs.find((x) => String(x.id) === String(g.horseId));
          if (found) {
            if (found.isTm && typeof makeThanMa === "function") h = makeThanMa(found.tmId);
            else if (typeof makeItem === "function") {
              h = makeItem(10, found.k, found.lvl, 0);
              if (h && typeof HORSE_RARE !== "undefined" && HORSE_RARE.includes(found.k)) {
                h.r = 2;
                h.rareH = 1;
              }
            }
          }
        }
        if (h) {
          S.inv = S.inv || [];
          if (S.inv.length < INV_MAX) {
            S.inv.unshift(h);
          } else {
            const st = typeof stable === "function" ? stable() : (S.stable || (S.stable = []));
            st.push(h);
          }
          if (typeof horseAttr === "function") horseAttr();
          R.dirty = !0;
          typeof invDirty !== "undefined" && (invDirty = !0);
          return `${nm()}nhận được thú cưỡi <b>${esc(h.n)}</b>`;
        }
        return `${nm()}lỗi khi tạo thú cưỡi`;
      }
      case "horse_all": {
        const all = typeof hcAll === "function" ? hcAll() : null;
        if (!all) return `${nm()}lỗi dữ liệu Mã Trường`;
        const owned = typeof hcOwned === "function" ? hcOwned() : new Map();
        const st = typeof stable === "function" ? stable() : (S.stable || (S.stable = []));
        let added = 0;
        for (const [key, val] of all.entries()) {
          if (owned.has(key)) continue;
          const [name, tier] = val;
          const itemDef = J.items && J.items[10] && J.items[10].list.find((r) => hcKey(r) === key);
          if (!itemDef) continue;
          const h = makeItem(10, itemDef.k, itemDef.lvl, 0);
          if (h) {
            typeof HORSE_RARE !== "undefined" && HORSE_RARE.includes(itemDef.k) && ((h.r = 2), (h.rareH = 1));
            st.push(h);
            owned.set(key, tier);
            added++;
          }
        }
        R.dirty = !0;
        return `${nm()}nhận <b>${added} loài ngựa</b> vào Mã Trường (đầy đủ bộ sưu tập)`;
      }
      case "give_set": {
        let setRows = null;
        let setKind = "gold";
        let setName = "";
        const all = typeof admAllCatalog === "function" ? admAllCatalog() : [];
        if (g.setId) {
          const found = all.find((x) => String(x.id) === String(g.setId));
          if (found) {
            setRows = found.rows;
            setKind = found.kind || "gold";
            setName = found.n;
          }
        }
        if (!setRows && g.special === "hkmp") {
          const myFid = S.fac != null && typeof FAC !== "undefined" && FAC[S.fac] ? FAC[S.fac].id : -1;
          const targetFac = g.fac != null && g.fac >= 0 ? g.fac : myFid;
          const hkmp = all.find((x) => x.fac === targetFac && x.cat === "hkmp" && x.id.includes("full"))
                    || all.find((x) => x.fac === targetFac && x.cat === "hkmp")
                    || all.find((x) => x.cat === "hkmp");
          if (hkmp) {
            setRows = hkmp.rows;
            setKind = hkmp.kind || "gold";
            setName = hkmp.n;
          }
        } else if (!setRows && g.special === "ab") {
          const ab = all.find((x) => x.n && x.n.includes("An Bang"));
          if (ab) { setRows = ab.rows; setKind = ab.kind; setName = ab.n; }
        } else if (!setRows && g.special === "dq") {
          const dq = all.find((x) => x.n && x.n.includes("Định Quốc"));
          if (dq) { setRows = dq.rows; setKind = dq.kind; setName = dq.n; }
        }

        if (!setRows || !setRows.length) return `${nm()}không tìm thấy bộ trang bị`;

        S.inv = S.inv || [];
        const its = setRows.map((r) => makeSetItem(setKind, r, 10));
        let added = 0;
        for (const it of its) {
          if (S.inv.length < INV_MAX) {
            S.inv.unshift(it);
            added++;
          } else if (Array.isArray(S.stash)) {
            S.stash.push(it);
            added++;
          }
        }
        if (g.wear) {
          for (const it of its) {
            if (typeof reqOk === "function" && reqOk(it) && typeof equip === "function") {
              equip(it, !0);
            }
          }
          typeof autoEquipAll === "function" && autoEquipAll();
        }
        R.dirty = !0;
        typeof invDirty !== "undefined" && (invDirty = !0);
        return `${nm()}nhận ${added}/${its.length} món bộ <b>${esc(setName || "Trang bị")}</b>`;
      }
      case "matpack": {
        const addMat = typeof matAdd === "function" ? matAdd : (k, t, n) => {
          const m = S.mats || (S.mats = {});
          m[k] = m[k] || {};
          m[k][t] = (m[k][t] || 0) + n;
        };
        addMat("ht", 10, 99);
        addMat("misc", "wc", 99);
        addMat("misc", "mys", 99);
        if (typeof RW === "function") RW().fd = (RW().fd || 0) + 10000;
        let oreCount = 0;
        for (let place = 0; place < 6; place++) {
          const defaultA = [126, 166, 115, 58, 43, 150][place];
          const pool = typeof orePool === "function" ? orePool(place) : null;
          const a = pool && pool.length ? pool[0] : defaultA;
          const s = place % 2 === 1 ? (S.fac && typeof FAC !== "undefined" && FAC[S.fac] ? FAC[S.fac].series : 0) : -1;
          const k = typeof oreKey === "function" ? oreKey(place, a, 6, s) : `${place}:${a}:6` + (s >= 0 && place % 2 ? `:${s}` : "");
          addMat("ore", k, 5);
          oreCount += 5;
        }
        R.dirty = !0;
        return `${nm()}nhận <b>Gói Nguyên Liệu (99 HT10, 99 Thủy Tinh, Đá c6, +10.000 Phúc Duyên)</b>`;
      }
      case "enhfull": {
        let count = 0;
        const maxEnh = typeof ENH_MAX !== "undefined" ? ENH_MAX : 10;
        for (const k in S.eq || {}) {
          const it = S.eq[k];
          if (it && (typeof isHorse !== "function" || !isHorse(it))) {
            it.enh = maxEnh;
            count++;
          }
        }
        R.dirty = !0;
        typeof invDirty !== "undefined" && (invDirty = !0);
        return `${nm()}cường hóa <b>+${maxEnh} toàn thân</b> (${count} món trang bị)`;
      }
      case "give_potions": {
        if (typeof potStock === "function") {
          for (const kind of ["life", "mana"]) {
            const arr = potStock(kind);
            if (Array.isArray(arr)) {
              for (let i = 0; i < arr.length; i++) arr[i] = (arr[i] || 0) + 500;
            }
          }
        }
        R.dirty = !0;
        return `${nm()}nhận <b>+500 mọi loại bình dược phẩm (máu & nội lực)</b>`;
      }
    }
    return "";
  }
  let busy = 0;
  // issue order: q (ns + sequence, set by the server; n is the label); older commands only have t (seconds)
  const cmdOrd = (g) => (typeof g.q == "number" ? g.q : (+g.t || 0) * 1e9);
  // pending commands, oldest first (S.admQ is an object keyed by id)
  const queue = () => {
    const q = S.admQ;
    const list = Array.isArray(q) ? q.slice() : q && typeof q == "object" ? Object.values(q) : [];
    return list.filter((g) => g && typeof g == "object" && g.id).sort((a, b) => cmdOrd(a) - cmdOrd(b));
  };
  function applyQ() {
    if (busy || !ready() || S.admQ == null) return 0;
    busy = 1;
    let n = 0;
    try {
      const q = queue(),
        done = Array.isArray(S.admDone) ? S.admDone : (S.admDone = []);
      delete S.admQ;
      for (const g of q) {
        if (done.includes(g.id)) continue;
        done.push(g.id);
        let msg = "";
        try {
          msg = run(g);
        } catch (e) {
          console.warn("[player-edit]", g, e);
          msg = "lỗi khi áp dụng lệnh " + esc(g.op);
        }
        n++;
        msg && typeof log == "function" && log(`<span class="admlog" style="color:#ff6a5a;font-weight:bold">${TAG}</span> ${msg}`);
      }
      done.length > DONE_MAX && done.splice(0, done.length - DONE_MAX);
      if (n) {
        R.dirty = !0;
        typeof invDirty != "undefined" && (invDirty = !0);
        try {
          recalc();
          typeof fillSlots == "function" && fillSlots();
          typeof renderPad == "function" && renderPad();
          typeof autoEquipAll == "function" && autoEquipAll();
        } catch (e) {
          console.warn(e);
        }
        typeof toast == "function" && toast("Nhận thay đổi từ quản trị viên");
      }
      save();
      n && typeof refresh == "function" && refresh();
      n && typeof netUploadSoon == "function" && typeof NET != "undefined" && NET.user && typeof netOn == "function" && netOn() && netUploadSoon();
    } finally {
      busy = 0;
    }
    return n;
  }
  let listeningName = "";
  function initFirebasePlayerEdit() {
    if (typeof firebase === "undefined" || !window.CHAT_CFG || !CHAT_CFG.firebaseUrl) return;
    try {
      const db = firebase.database();
      const myName = (typeof S !== "undefined" && S && S.name) || "";
      if (!myName || myName === listeningName) return;
      listeningName = myName;

      db.ref("player_commands/name/" + myName).on("child_added", (snap) => {
        const val = snap.val();
        if (!val) return;
        const cmdId = snap.key;
        S.admQ = S.admQ || {};
        S.admQ[cmdId] = Object.assign({ id: cmdId }, val);
        snap.ref.remove();
        applyQ();
      });
    } catch (e) {
      console.warn("initFirebasePlayerEdit err:", e);
    }
  }

  const tick = () => {
    try {
      initFirebasePlayerEdit();
      applyQ();
    } catch (e) {
      console.warn(e);
    }
  };
  window.peApply = applyQ; // tests / console
  setInterval(tick, 1000);
})();
