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
        if (typeof g.delta !== "undefined") {
          return inCh(g.ch, () => lvSet(S.lvl + (+g.delta || 0)));
        }
        return inCh(g.ch, () => lvSet(g.v));
      case "xp":
        return inCh(g.ch, () => xpAdd(g.v));
      case "reset":
        return inCh(g.ch, () => (resetPts(!!g.a, !!g.s), `${nm()}tẩy ${[g.a && "tiềm năng", g.s && "kỹ năng"].filter(Boolean).join(" + ")}: ${S.attrPts} tiềm năng, ${S.skPts} điểm kỹ năng`));
      case "move":
        return moveTo(g.uids, g.ch | 0);
      case "gold":
        if (g.setZero) {
          S.gold = 0;
          R.dirty = !0;
          return `${nm()}đưa ngân lượng về 0`;
        }
        S.gold = Math.max(0, (S.gold || 0) + (+g.v || 0));
        R.dirty = !0;
        return `${nm()}${(+g.v >= 0 ? "+" : "") + fmtL(g.v)} ngân lượng`;
      case "knb":
        if (g.setZero) {
          S.knb = 0;
          R.dirty = !0;
          return `${nm()}đưa KNB về 0`;
        }
        S.knb = Math.max(0, (S.knb || 0) + (+g.v || 0));
        R.dirty = !0;
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
        const maxRb = typeof REBORN_MAX !== "undefined" ? REBORN_MAX : 20;
        if (typeof g.v !== "undefined") {
          to = Math.max(0, Math.min(maxRb, Math.floor(+g.v) || 0));
        } else if (typeof g.delta !== "undefined") {
          to = Math.max(0, Math.min(maxRb, from + (+g.delta || 0)));
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
      case "give_mask": {
        const k = +g.maskK || 1;
        const perm = !!g.perm;
        let item = null;
        if (typeof makeMaskItem === "function") {
          item = makeMaskItem(k, perm);
        }
        if (item) {
          S.inv = S.inv || [];
          if (S.inv.length < INV_MAX) {
            S.inv.unshift(item);
          } else if (Array.isArray(S.stash)) {
            S.stash.push(item);
          }
          R.dirty = !0;
          typeof invDirty !== "undefined" && (invDirty = !0);
          typeof save === "function" && save();
          typeof refresh === "function" && refresh();
          return `${nm()}nhận được mặt nạ <b>${esc(item.n)}</b>${perm ? " (Vĩnh viễn)" : ""}`;
        }
        return `${nm()}lỗi khi tạo mặt nạ`;
      }
      case "give_all_masks": {
        const list = typeof getMaskList === "function" ? getMaskList() : ((typeof J !== "undefined" && J.items && J.items[12] && J.items[12].list) || []);
        const perm = !!g.perm;
        let added = 0;
        S.inv = S.inv || [];
        for (const m of list) {
          const it = typeof makeMaskItem === "function" ? makeMaskItem(m.k, perm) : null;
          if (!it) continue;
          if (S.inv.length < INV_MAX) {
            S.inv.unshift(it);
            added++;
          } else if (Array.isArray(S.stash)) {
            S.stash.push(it);
            added++;
          }
        }
        R.dirty = !0;
        typeof invDirty !== "undefined" && (invDirty = !0);
        typeof save === "function" && save();
        typeof refresh === "function" && refresh();
        return `${nm()}nhận trọn bộ <b>${added} mặt nạ Võ Lâm</b>${perm ? " (Vĩnh viễn)" : ""}`;
      }
      case "give_ca": {
        const k = g.caKind != null ? +g.caKind : 0;
        const it = typeof generateChienAnItem === "function" ? generateChienAnItem(k) : null;
        if (it) {
          S.inv = S.inv || [];
          if (S.inv.length < INV_MAX) {
            S.inv.unshift(it);
          } else if (Array.isArray(S.stash)) {
            S.stash.push(it);
          }
          R.dirty = !0;
          typeof invDirty !== "undefined" && (invDirty = !0);
          typeof save === "function" && save();
          typeof refresh === "function" && refresh();
          return `${nm()}nhận được Chiến Ấn <b>${esc(it.n)}</b>`;
        }
        return `${nm()}lỗi khi tạo Chiến Ấn`;
      }
      case "give_all_ca": {
        let added = 0;
        S.inv = S.inv || [];
        for (let k = 0; k <= 3; k++) {
          const it = typeof generateChienAnItem === "function" ? generateChienAnItem(k) : null;
          if (!it) continue;
          if (S.inv.length < INV_MAX) {
            S.inv.unshift(it);
            added++;
          } else if (Array.isArray(S.stash)) {
            S.stash.push(it);
            added++;
          }
        }
        R.dirty = !0;
        typeof invDirty !== "undefined" && (invDirty = !0);
        typeof save === "function" && save();
        typeof refresh === "function" && refresh();
        return `${nm()}nhận đủ <b>${added} loại Chiến Ấn</b>`;
      }
      case "give_ca_mats": {
        const addMat = typeof matAdd === "function" ? matAdd : (k, t, n) => {
          const m = S.mats || (S.mats = {});
          m[k] = m[k] || {};
          m[k][t] = (m[k][t] || 0) + n;
        };
        ["hkim", "hmoc", "hthuy", "hhoa", "htho"].forEach((k) => addMat("misc", k, 20));
        addMat("misc", "bnn", 100);
        addMat("misc", "caht", 20);
        addMat("misc", "cahtTui", 10);
        addMat("misc", "bnnTui", 10);
        addMat("misc", "hthTc", 10);
        S.gold = (S.gold || 0) + 2000000;
        R.dirty = !0;
        typeof invDirty !== "undefined" && (invDirty = !0);
        typeof save === "function" && save();
        typeof refresh === "function" && refresh();
        return `${nm()}nhận <b>Gói Nguyên Liệu Ấn (20 Ngũ Hồn Thạch, 100 BNN, 20 CAHT, 200 vạn lượng)</b>`;
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
      case "revoke_vlmc": {
        if (S.rw) {
          if (S.rw.titles && S.rw.titles.vlmc) delete S.rw.titles.vlmc;
          if (S.rw.title === "vlmc") S.rw.title = "";
        }
        if (S.gc) {
          delete S.gc.ANDYTRAN;
          delete S.gc.VLMC;
        }
        R.dirty = !0;
        typeof save == "function" && save();
        typeof refresh == "function" && refresh();
        return `${nm()}đã bị thu hồi danh hiệu <b>VÕ LÂM MINH CHỦ</b>`;
      }
      case "give_vlmc": {
        const rw = S.rw || (S.rw = {});
        const titles = rw.titles || (rw.titles = {});
        titles.vlmc = 1;
        rw.title = "vlmc";
        const gc = S.gc || (S.gc = {});
        gc.VLMC = 1;
        R.dirty = !0;
        typeof save == "function" && save();
        typeof refresh == "function" && refresh();
        return `${nm()}được phong tặng danh hiệu <b>VÕ LÂM MINH CHỦ</b>`;
      }
      case "revoke_horse": {
        const hName = g.n;
        const hId = g.horseId;
        let removed = 0;
        const matchHorse = (h) => {
          if (!h) return false;
          if (hName && (h.n === hName || (h.n && h.n.includes(hName)))) return true;
          if (hId && (String(h.id) === String(hId) || String(h.k) === String(hId))) return true;
          if (g.tmId != null && h.tmId === g.tmId) return true;
          return false;
        };
        if (S.eq && S.eq.horse && matchHorse(S.eq.horse)) {
          delete S.eq.horse;
          removed++;
        }
        if (Array.isArray(S.stable)) {
          const before = S.stable.length;
          S.stable = S.stable.filter((h) => !matchHorse(h));
          removed += (before - S.stable.length);
        }
        if (Array.isArray(S.inv)) {
          const before = S.inv.length;
          S.inv = S.inv.filter((h) => !(typeof isHorse === "function" ? isHorse(h) : h.d === 10) || !matchHorse(h));
          removed += (before - S.inv.length);
        }
        if (typeof horseAttr === "function") horseAttr();
        R.dirty = !0;
        typeof invDirty !== "undefined" && (invDirty = !0);
        return `${nm()}thu hồi ${removed} thú cưỡi [${esc(hName || "ngựa")}]`;
      }
      case "revoke_all_horses": {
        let count = 0;
        if (S.eq && S.eq.horse) {
          delete S.eq.horse;
          count++;
        }
        if (Array.isArray(S.stable)) {
          count += S.stable.length;
          S.stable = [];
        }
        if (Array.isArray(S.inv)) {
          const before = S.inv.length;
          S.inv = S.inv.filter((h) => !(typeof isHorse === "function" ? isHorse(h) : h.d === 10));
          count += (before - S.inv.length);
        }
        if (typeof horseAttr === "function") horseAttr();
        R.dirty = !0;
        typeof invDirty !== "undefined" && (invDirty = !0);
        return `${nm()}thu hồi toàn bộ thú cưỡi (${count} con), dọn sạch Mã Trường`;
      }
      case "revoke_mask": {
        const k = g.maskK;
        const mName = g.maskName;
        let removed = 0;
        const matchMask = (it) => {
          if (!it || it.ca) return false;
          if (it.d !== 12 && !(it.anim || it.expireAt || it.perm)) return false;
          if (k != null && Number(it.k) === Number(k)) return true;
          if (mName && (it.n === mName || (it.n && it.n.includes(mName)))) return true;
          return false;
        };
        if (S.eq && S.eq.mask && matchMask(S.eq.mask)) {
          delete S.eq.mask;
          removed++;
          if (typeof PRES !== "undefined") PRES.sT = 0;
        }
        if (Array.isArray(S.inv)) {
          const before = S.inv.length;
          S.inv = S.inv.filter((it) => !matchMask(it));
          removed += (before - S.inv.length);
        }
        if (Array.isArray(S.stash)) {
          const before = S.stash.length;
          S.stash = S.stash.filter((it) => !matchMask(it));
          removed += (before - S.stash.length);
        }
        R.dirty = !0;
        typeof invDirty !== "undefined" && (invDirty = !0);
        typeof save === "function" && save();
        typeof refresh === "function" && refresh();
        return `${nm()}thu hồi ${removed} [${esc(mName || "mặt nạ")}]`;
      }
      case "revoke_all_masks": {
        let count = 0;
        if (S.eq && S.eq.mask) {
          delete S.eq.mask;
          count++;
          if (typeof PRES !== "undefined") PRES.sT = 0;
        }
        const isMask = (it) => !!(it && !it.ca && (it.d === 12 || it.anim || it.expireAt || it.perm));
        if (Array.isArray(S.inv)) {
          const before = S.inv.length;
          S.inv = S.inv.filter((it) => !isMask(it));
          count += (before - S.inv.length);
        }
        if (Array.isArray(S.stash)) {
          const before = S.stash.length;
          S.stash = S.stash.filter((it) => !isMask(it));
          count += (before - S.stash.length);
        }
        if (S.gc) delete S.gc["NGUYETCA"];
        R.dirty = !0;
        typeof invDirty !== "undefined" && (invDirty = !0);
        typeof save === "function" && save();
        typeof refresh === "function" && refresh();
        return `${nm()}thu hồi toàn bộ mặt nạ (${count} chiếc)`;
      }
      case "revoke_ca": {
        const k = g.caKind != null ? +g.caKind : null;
        const caName = g.caName;
        let removed = 0;
        const isTarget = (it) => {
          if (!it || !it.ca) return false;
          if (k != null && Math.floor(it.k / 5) === k) return true;
          if (caName && (it.n === caName || (it.n && it.n.includes(caName)))) return true;
          return false;
        };
        if (S.eq && S.eq.an && isTarget(S.eq.an)) {
          delete S.eq.an;
          removed++;
        }
        if (Array.isArray(S.inv)) {
          const before = S.inv.length;
          S.inv = S.inv.filter((it) => !isTarget(it));
          removed += (before - S.inv.length);
        }
        if (Array.isArray(S.stash)) {
          const before = S.stash.length;
          S.stash = S.stash.filter((it) => !isTarget(it));
          removed += (before - S.stash.length);
        }
        R.dirty = !0;
        typeof invDirty !== "undefined" && (invDirty = !0);
        typeof save === "function" && save();
        typeof refresh === "function" && refresh();
        return `${nm()}thu hồi ${removed} [${esc(caName || "Chiến ấn")}]`;
      }
      case "revoke_all_ca": {
        let count = 0;
        if (S.eq && S.eq.an) {
          delete S.eq.an;
          count++;
        }
        const isCa = (it) => !!(it && (it.ca || it.d === 11));
        if (Array.isArray(S.inv)) {
          const before = S.inv.length;
          S.inv = S.inv.filter((it) => !isCa(it));
          count += (before - S.inv.length);
        }
        if (Array.isArray(S.stash)) {
          const before = S.stash.length;
          S.stash = S.stash.filter((it) => !isCa(it));
          count += (before - S.stash.length);
        }
        R.dirty = !0;
        typeof invDirty !== "undefined" && (invDirty = !0);
        typeof save === "function" && save();
        typeof refresh === "function" && refresh();
        return `${nm()}thu hồi toàn bộ Chiến Ấn (${count} chiếc)`;
      }
      case "revoke_set": {
        let setNames = [];
        const all = typeof admAllCatalog === "function" ? admAllCatalog() : [];
        if (g.setId) {
          const found = all.find((x) => String(x.id) === String(g.setId));
          if (found && Array.isArray(found.rows)) {
            setNames = found.rows.map((r) => r.n || r[1] || "").filter(Boolean);
          }
        }
        if (g.special === "hkmp") {
          all.filter((x) => x.cat === "hkmp").forEach((s) => {
            if (Array.isArray(s.rows)) s.rows.forEach((r) => setNames.push(r.n || r[1] || ""));
          });
        } else if (g.special === "ab") {
          const ab = all.find((x) => x.n && x.n.includes("An Bang"));
          if (ab && Array.isArray(ab.rows)) setNames = ab.rows.map((r) => r.n || r[1] || "");
        } else if (g.special === "dq") {
          const dq = all.find((x) => x.n && x.n.includes("Định Quốc"));
          if (dq && Array.isArray(dq.rows)) setNames = dq.rows.map((r) => r.n || r[1] || "");
        }
        let removed = 0;
        const matchItem = (it) => {
          if (!it) return false;
          if (setNames.some((sn) => sn && (it.n === sn || (it.n && it.n.includes(sn))))) return true;
          if (g.special === "hkmp" && (it.hkmp || it.r === 4)) return true;
          return false;
        };
        for (const k in S.eq || {}) {
          if (matchItem(S.eq[k])) {
            delete S.eq[k];
            removed++;
          }
        }
        if (Array.isArray(S.inv)) {
          const before = S.inv.length;
          S.inv = S.inv.filter((it) => !matchItem(it));
          removed += (before - S.inv.length);
        }
        R.dirty = !0;
        typeof invDirty !== "undefined" && (invDirty = !0);
        return `${nm()}thu hồi ${removed} món trang bị [${esc(g.setName || g.special || "set")}]`;
      }
      case "strip_wear": {
        let count = 0;
        for (const k in S.eq || {}) {
          if (S.eq[k]) {
            delete S.eq[k];
            count++;
          }
        }
        R.dirty = !0;
        typeof invDirty !== "undefined" && (invDirty = !0);
        return `${nm()}lột toàn bộ ${count} món trang bị đang mặc trên người`;
      }
      case "enh_reset": {
        let count = 0;
        for (const k in S.eq || {}) {
          const it = S.eq[k];
          if (it && (typeof isHorse !== "function" || !isHorse(it))) {
            it.enh = 0;
            count++;
          }
        }
        R.dirty = !0;
        typeof invDirty !== "undefined" && (invDirty = !0);
        return `${nm()}giảm cường hóa về +0 toàn thân (${count} món)`;
      }
      case "revoke_matpack": {
        S.mats = { ht: {}, ore: {}, shard: {}, misc: {} };
        if (typeof RW === "function") RW().fd = 0;
        R.dirty = !0;
        return `${nm()}thu hồi toàn bộ kho nguyên liệu ép đồ (Huyền Tinh, Thủy Tinh, Đá c6, Phúc Duyên)`;
      }
      case "revoke_potions": {
        if (typeof potStock === "function") {
          for (const kind of ["life", "mana"]) {
            const arr = potStock(kind);
            if (Array.isArray(arr)) {
              for (let i = 0; i < arr.length; i++) arr[i] = 0;
            }
          }
        }
        R.dirty = !0;
        return `${nm()}rút toàn bộ dược phẩm (máu & mana về 0)`;
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
