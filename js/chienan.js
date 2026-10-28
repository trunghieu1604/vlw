/**
 * - 4 Loại ấn: Bạch Ấn, Khiếu Hổ ấn (Tất cả kỹ năng +1), Thanh Ấn, Bàn Long ấn (Tất cả kỹ năng +1)
 * - Thợ Khắc Ấn: Tạo ấn, Khắc ấn, Thu hồi ấn
 * - 5 Hồn Thạch: Kim, Mộc, Thủy, Hỏa, Thổ + Bạch Nguyệt Ngọc + Chiến ấn Hồn Thạch
 */
(function () {
  "use strict";

  const KIND = [
    {
      k: 0,
      n: "Bạch Ấn",
      lvl: 1,
      high: 0,
      ic: "img/i/11_0.png",
      d: "Chiến ấn trắng tinh thuần khiết, chứa đựng sức mạnh to lớn",
    },
    {
      k: 1,
      n: "Khiếu Hổ ấn",
      lvl: 1,
      high: 1,
      ic: "img/i/11_1.png",
      d: "Luyện khí công nhận được cảm ngộ từ thiên quan ngũ thú chế tạo Chiến ấn, có sức mạnh khổng lồ!",
    },
    {
      k: 2,
      n: "Thanh Ấn",
      lvl: 2,
      high: 0,
      ic: "img/i/11_2.png",
      d: "Chiến ấn xanh như nước suối, tỏa ra năng lượng vô hạn",
    },
    {
      k: 3,
      n: "Bàn Long ấn",
      lvl: 2,
      high: 1,
      ic: "img/i/11_3.png",
      d: "Luyện khí công nhận được cảm ngộ từ thiên quan ngũ thú chế tạo Chiến ấn, có sức mạnh khổng lồ!",
    },
  ];

  const FIX = {
    allres: { 1: 5, 2: 10 },
    res: { 1: 5, 2: 10 },
    skill: { 1: 1, 3: 1 },
  };

  const SERIES_RES = [101, 103, 102, 104, 105];
  const REQ_LV = { 1: 60, 2: 70 };

  const POOL = [
    [85, 50, "lifemax_v"],
    [88, 1, "fastlifereplenish_v"],
    [89, 10, "manamax_v"],
    [92, 1, "fastmanareplenish_v"],
    [97, 5, "strength_v"],
    [98, 5, "dexterity_v"],
    [99, 5, "vitality_v"],
    [108, 1, "poisontimereduce_p"],
    [121, 2, "addphysicsdamage_v"],
    [122, 10, "addfiredamage_v"],
    [123, 4.5, "addcolddamage_v"],
    [124, 10, "addlightingdamage_v"],
    [125, 1, "addpoisondamage_v"],
    [150, 3, "adddefense_v"],
    [140, 25, "addphysicsmagic_v"],
    [141, 25, "addcoldmagic_v"],
    [142, 25, "addfiremagic_v"],
    [143, 25, "addlightingmagic_v"],
    [144, 2, "addpoisonmagic_v"],
    [114, 1, "damage_all_resist"],
    [104, 1, "damage_physics_resist"],
    [101, 1, "damage_poison_resist"],
    [105, 1, "damage_cold_resist"],
    [102, 1, "damage_fire_resist"],
    [103, 1, "damage_light_resist"],
  ].map(([a, step, j]) => ({ a, step, j }));

  const STEP = {};
  for (const u of POOL) STEP[u.a] = u.step;

  function caLineVal(step, lv, tier) {
    const cap = tier >= 2 ? 10 : 5;
    const clv = Math.max(0, lv | 0);
    return Math.round(clv <= cap ? step * clv : step * cap + (clv - cap) * 2 * step);
  }

  const MAT = {
    hkim: {
      n: "Kim Hồn Thạch",
      id: 8000082,
      ic: "img/ep/hkim.png",
      d: "Tỏa ra sức mạnh vàng rực rỡ, là một trong những nguyên liệu tạo chiến ấn.",
    },
    hmoc: {
      n: "Mộc Hồn Thạch",
      id: 8000083,
      ic: "img/ep/hmoc.png",
      d: "Sở hữu sức mạnh sinh trưởng tự nhiên, là một trong những nguyên liệu tạo chiến ấn.",
    },
    hthuy: {
      n: "Thủy Hồn Thạch",
      id: 8000084,
      ic: "img/ep/hthuy.png",
      d: "Hàm chứa sức mạnh dòng chảy trong trẻo, là một trong những nguyên liệu tạo chiến ấn.",
    },
    hhoa: {
      n: "Hỏa Hồn Thạch",
      id: 8000085,
      ic: "img/ep/hhoa.png",
      d: "Tỏa ra sức mạnh hỏa diệm rực cháy, là một trong những nguyên liệu tạo chiến ấn.",
    },
    htho: {
      n: "Thổ Hồn Thạch",
      id: 8000086,
      ic: "img/ep/htho.png",
      d: "Chứa đựng sức mạnh vững chắc của đại địa, là một trong những nguyên liệu tạo chiến ấn.",
    },
    bnn: {
      n: "Bạch Nguyệt Ngọc",
      id: 8000080,
      ic: "img/ep/bnn.png",
      d: "Nguyên liệu khắc Chiến ấn.",
    },
    caht: {
      n: "Chiến ấn Hồn Thạch",
      id: 8000089,
      ic: "img/ep/caht.png",
      d: "Khi mở ra sẽ nhận được ngẫu nhiên 1 Hồn Thạch từ Kim, Mộc, Thủy, Hỏa, Thổ.",
    },
    cahtTui: {
      n: "Chiến ấn Hồn Thạch (Túi)",
      id: 8000090,
      ic: "img/ep/cahtTui.png",
      d: "Cất vào túi, bấm Dùng: nhận Hồn Thạch đủ 5 hệ khác nhau (Kim, Mộc, Thủy, Hỏa, Thổ).",
    },
    bnnTui: {
      n: "Bạch Nguyệt Ngọc (Túi)",
      id: 8000091,
      ic: "img/ep/bnnTui.png",
      d: "Cất vào túi, bấm Dùng: nhận 5 Bạch Nguyệt Ngọc.",
    },
    hthTc: {
      n: "Hồn Thạch Tự Chọn",
      id: 8000092,
      ic: "img/ep/hthTc.png",
      d: "Khi mở ra có thể tự chọn 1 Hồn Thạch Kim, Mộc, Thủy, Hỏa hoặc Thổ theo ý muốn.",
    },
  };

  const HT = ["hkim", "hmoc", "hthuy", "hhoa", "htho"];
  const MAT_N = {};
  for (const k in MAT) MAT_N[k] = MAT[k].n;

  // Initialize J.items[11]
  const sealList = [];
  for (const u of KIND) {
    for (let f = 0; f < 5; f++) {
      sealList.push({
        p: u.k * 5 + f,
        n: u.n,
        k: u.k,
        d: 11,
        s: f,
        price: 1,
        lvl: u.lvl,
        base: [
          [114, FIX.allres[u.lvl], FIX.allres[u.lvl]],
          u.high ? [139, FIX.skill[u.k], FIX.skill[u.k]] : [SERIES_RES[f], FIX.res[u.lvl], FIX.res[u.lvl]],
        ],
        req: [[36, REQ_LV[u.lvl]]],
        ic: u.ic,
        desc: u.d,
      });
    }
  }

  if (typeof J !== "undefined" && J && J.items) {
    J.items[11] = {
      detail: 11,
      file: "chienan",
      n: "Chiến Ấn",
      list: sealList,
    };
  }

  const LINES = { 1: 3, 2: 4 };
  const CAP = { 1: 10, 2: 15 };
  const MAX = { 1: 12, 2: 32 };

  const I0 = {
    D: 11,
    SLOT: "an",
    KIND,
    FIX,
    SERIES_RES,
    REQ_LV,
    POOL,
    STEP,
    LINES,
    LINE_CAP: CAP,
    CARVE_MAX: MAX,
    cap: CAP,
    max: MAX,
    lines: LINES,
    startLv: 1,
    ODDS: [
      { k: 1, w: 0.00025 },
      { k: 3, w: 0.00025 },
      { k: 2, w: 0.0995 },
      { k: 0, w: 0.9 },
    ],
    MAT,
    MAT_N,
    HT,
    COST: {
      make: {
        mats: { hkim: 1, hmoc: 1, hthuy: 1, hhoa: 1, htho: 1 },
        gold: 100000,
      },
      carve: {
        mats: { bnn: 5 },
        gold: 100000,
      },
      recall: {
        bnnPerCarve: 2.5,
        caht: 2,
      },
    },
    row: (k, s) => sealList[k * 5 + s] || null,
    kind: (k) => KIND[k] || null,
    pickKind(u = Math.random()) {
      let acc = 0;
      for (const v of this.ODDS) {
        if (u < (acc += v.w)) return v.k;
      }
      return 0;
    },
    lineVal: caLineVal,
    caLineVal,
    line(attrId, lv, tier) {
      const step = STEP[attrId];
      if (step == null) return null;
      return {
        a: attrId,
        p: [caLineVal(step, lv, tier), -1, 0],
        lv: lv,
      };
    },
  };
  window.I0 = I0;

  // Integrate material names with MISC_N in giangho.js if loaded
  if (typeof MISC_N === "object" && MISC_N) {
    Object.assign(MISC_N, MAT_N);
  }

  function isChienAn(it) {
    return !!it && it.d === I0.D && !!it.ca;
  }
  window.isChienAn = isChienAn;

  function getAllSeals() {
    if (typeof S === "undefined" || !S) return [];
    const eqList = Object.values(S.eq || {}).filter(isChienAn);
    const invList = (S.inv || []).filter(isChienAn);
    const epList = typeof epBox === "function" ? epBox().filter(isChienAn) : [];
    return eqList.concat(invList, epList);
  }

  function generateChienAnItem(kindId = 0, series) {
    if (kindId == null || kindId < 0 || kindId > 3) kindId = I0.pickKind(Math.random());
    if (series == null || series < 0 || series > 4) series = typeof irnd === "function" ? irnd(0, 4) : Math.floor(Math.random() * 5);
    const row = I0.row(kindId, series) || I0.row(0, 0);
    const tier = row.lvl;
    const pool = I0.POOL.slice();
    const mag = [];

    for (let i = 0; i < I0.lines[tier] && pool.length; i++) {
      const idx = typeof irnd === "function" ? irnd(0, pool.length - 1) : Math.floor(Math.random() * pool.length);
      const chosen = pool.splice(idx, 1)[0];
      mag.push(I0.line(chosen.a, I0.startLv, tier));
    }

    const it = {
      uid: typeof genUid === "function" ? genUid() : Date.now() + Math.floor(Math.random() * 10000),
      d: I0.D,
      k: row.k,
      p: row.p,
      n: row.n,
      ic: row.ic,
      lvl: tier,
      s: row.s,
      base: row.base.map((b) => b.slice()),
      req: row.req.map((r) => r.slice()),
      price: row.price || 1,
      r: 4,
      mag: mag,
      ca: {
        lvl: tier,
        carve: 0,
        max: I0.max[tier],
      },
      lock: true,
    };
    return it;
  }
  window.generateChienAnItem = generateChienAnItem;

  function makeChienAn() {
    if (typeof S === "undefined" || !S) return { ok: false, msg: "Chưa kết nối dữ liệu" };
    const cost = I0.COST.make;
    for (const m in cost.mats) {
      if (typeof matHave === "function" && matHave("misc", m) < cost.mats[m]) {
        return { ok: false, msg: `Không tìm thấy ${I0.MAT[m].n}` };
      }
    }
    if ((S.gold || 0) < cost.gold) {
      return { ok: false, msg: `Cần ${typeof fmtL === "function" ? fmtL(cost.gold) : cost.gold} lượng` };
    }
    if ((S.inv || []).length >= (typeof INV_MAX !== "undefined" ? INV_MAX : 60)) {
      return { ok: false, msg: "Hành trang đầy" };
    }

    // Deduct materials and gold
    for (const m in cost.mats) {
      if (typeof matAdd === "function") matAdd("misc", m, -cost.mats[m]);
    }
    S.gold -= cost.gold;

    const kindId = I0.pickKind(Math.random());
    const series = typeof irnd === "function" ? irnd(0, 4) : Math.floor(Math.random() * 5);
    const it = generateChienAnItem(kindId, series);
    const kind = I0.kind(kindId) || {};

    S.inv.push(it);
    if (typeof invDirty !== "undefined") invDirty = true;
    if (typeof R !== "undefined" && R) R.dirty = true;
    if (typeof save === "function") save();
    if (typeof refresh === "function") refresh();

    return {
      ok: true,
      item: it,
      hi: !!kind.high,
      msg: `Chế tạo thành công ${it.n}${kind.high ? ": Tất cả kỹ năng +1!" : ""}`,
    };
  }
  window.makeChienAn = makeChienAn;

  function carveChienAn(item) {
    if (!item || !isChienAn(item)) return { ok: false, msg: "Ấn không tồn tại!" };
    const tier = item.ca.lvl;
    const cap = I0.cap[tier];
    const maxCarve = item.ca.max || I0.max[tier];
    const eligible = (item.mag || [])
      .map((l, idx) => ((l.lv || 1) < cap ? idx : -1))
      .filter((idx) => idx >= 0);

    if ((item.ca.carve || 0) >= maxCarve || !eligible.length) {
      return { ok: false, msg: "Ấn đã khắc tối đa" };
    }

    const cost = I0.COST.carve;
    for (const m in cost.mats) {
      if (typeof matHave === "function" && matHave("misc", m) < cost.mats[m]) {
        return { ok: false, msg: `Ngươi mang thiếu ${I0.MAT[m].n}, hãy kiểm tra lại!` };
      }
    }
    if ((S.gold || 0) < cost.gold) {
      return { ok: false, msg: "Ngân lượng mang trên người không đủ" };
    }

    // Deduct
    for (const m in cost.mats) {
      if (typeof matAdd === "function") matAdd("misc", m, -cost.mats[m]);
    }
    S.gold -= cost.gold;

    const chosenIdx = eligible[typeof irnd === "function" ? irnd(0, eligible.length - 1) : Math.floor(Math.random() * eligible.length)];
    const lineObj = item.mag[chosenIdx];
    const nextLv = (lineObj.lv || 1) + 1;
    const newLine = I0.line(lineObj.a, nextLv, tier);

    if (!newLine) return { ok: false, msg: "Dòng khắc không hợp lệ" };

    lineObj.lv = newLine.lv;
    lineObj.p = newLine.p;
    item.ca.carve = (item.ca.carve || 0) + 1;

    if (typeof invDirty !== "undefined") invDirty = true;
    if (typeof R !== "undefined" && R) R.dirty = true;
    if (typeof save === "function") save();
    if (typeof refresh === "function") refresh();

    const lineDesc = typeof magText === "function" ? magText(lineObj) : lineObj.a;
    return {
      ok: true,
      item: item,
      line: chosenIdx,
      lv: nextLv,
      carve: item.ca.carve,
      msg: `Khắc ${item.n} lên +${item.ca.carve}/${maxCarve} thành công: ${lineDesc} (${nextLv}/${cap})`,
    };
  }
  window.carveChienAn = carveChienAn;

  function calcRecallReturn(items) {
    const cost = I0.COST.recall;
    return {
      bnn: Math.floor(items.reduce((acc, it) => acc + cost.bnnPerCarve * ((it.ca && it.ca.carve) || 0), 0)),
      caht: items.length * cost.caht,
    };
  }
  window.calcRecallReturn = calcRecallReturn;

  function recallChienAn(items) {
    const list = [...new Set(Array.isArray(items) ? items : [items])].filter(Boolean);
    if (!list.length) return { ok: false, msg: "Không có Chiến ấn, không thể thu hồi!" };

    const equipped = Object.values(S.eq || {});
    for (const it of list) {
      if (!isChienAn(it)) return { ok: false, msg: "Vật phẩm không phải Chiến ấn!" };
      if (equipped.includes(it)) return { ok: false, msg: `${it.n}: đang mặc, không thu hồi được` };
    }

    const ret = calcRecallReturn(list);
    for (const it of list) {
      if (typeof itemRemove === "function") itemRemove(it);
      else {
        const idx = S.inv.indexOf(it);
        if (idx >= 0) S.inv.splice(idx, 1);
      }
    }

    if (ret.bnn > 0 && typeof matAdd === "function") matAdd("misc", "bnn", ret.bnn);
    if (ret.caht > 0 && typeof matAdd === "function") matAdd("misc", "caht", ret.caht);

    if (typeof invDirty !== "undefined") invDirty = true;
    if (typeof R !== "undefined" && R) R.dirty = true;
    if (typeof save === "function") save();
    if (typeof refresh === "function") refresh();

    return {
      ok: true,
      n: list.length,
      bnn: ret.bnn,
      caht: ret.caht,
      msg: `Thu hồi ${list.length} Chiến ấn: nhận ${ret.bnn} ${I0.MAT.bnn.n}, ${ret.caht} ${I0.MAT.caht.n}`,
    };
  }
  window.recallChienAn = recallChienAn;

  function useCaht(qty = 1) {
    const have = typeof matHave === "function" ? matHave("misc", "caht") : 0;
    if (have < 1) return typeof toast === "function" ? toast("Không có Chiến ấn Hồn Thạch") : null;
    const count = Math.min(qty, have);
    matAdd("misc", "caht", -count);

    const got = {};
    for (let i = 0; i < count; i++) {
      const k = HT[typeof irnd === "function" ? irnd(0, HT.length - 1) : Math.floor(Math.random() * HT.length)];
      got[k] = (got[k] || 0) + 1;
      matAdd("misc", k, 1);
    }

    const desc = Object.entries(got)
      .map(([k, c]) => `${c} ${I0.MAT[k].n}`)
      .join(", ");
    if (typeof toast === "function") toast(`Mở ${count} Chiến ấn Hồn Thạch: nhận ${desc}`);
    if (typeof uiSfx === "function") uiSfx("use");
    if (typeof save === "function") save();
    if (typeof refresh === "function") refresh();
  }
  window.useCaht = useCaht;

  function useCahtTui(qty = 1) {
    const have = typeof matHave === "function" ? matHave("misc", "cahtTui") : 0;
    if (have < 1) return typeof toast === "function" ? toast("Không có Túi Chiến ấn Hồn Thạch") : null;
    const count = Math.min(qty, have);
    matAdd("misc", "cahtTui", -count);
    for (const k of HT) matAdd("misc", k, count);
    if (typeof toast === "function") toast(`Mở ${count} Túi Hồn Thạch: nhận đủ ngũ hành Kim, Mộc, Thủy, Hỏa, Thổ ×${count}`);
    if (typeof uiSfx === "function") uiSfx("use");
    if (typeof save === "function") save();
    if (typeof refresh === "function") refresh();
  }
  window.useCahtTui = useCahtTui;

  function useBnnTui(qty = 1) {
    const have = typeof matHave === "function" ? matHave("misc", "bnnTui") : 0;
    if (have < 1) return typeof toast === "function" ? toast("Không có Túi Bạch Nguyệt Ngọc") : null;
    const count = Math.min(qty, have);
    matAdd("misc", "bnnTui", -count);
    matAdd("misc", "bnn", count * 5);
    if (typeof toast === "function") toast(`Mở ${count} Túi Bạch Nguyệt Ngọc: nhận ${count * 5} Bạch Nguyệt Ngọc`);
    if (typeof uiSfx === "function") uiSfx("use");
    if (typeof save === "function") save();
    if (typeof refresh === "function") refresh();
  }
  window.useBnnTui = useBnnTui;

  function useHthTcModal() {
    const have = typeof matHave === "function" ? matHave("misc", "hthTc") : 0;
    if (have < 1) return typeof toast === "function" ? toast("Không có Hồn Thạch Tự Chọn") : null;
    if (typeof modal !== "function") return;
    const seriesNames = typeof SERIES !== "undefined" ? SERIES : ["Kim", "Mộc", "Thủy", "Hỏa", "Thổ"];
    modal(
      `<h3>Hồn Thạch Tự Chọn</h3>
      <div class="card"><p class="small dim">Chọn loại Hồn Thạch muốn nhận (đang có ${have} Hồn Thạch Tự Chọn):</p>
        <div class="camats" style="justify-content:center;gap:8px;margin:12px 0">
          ${HT.map((k, i) => `<button class="btn camat" data-hth="${k}"><img src="${I0.MAT[k].ic}" alt=""><span><b>${I0.MAT[k].n}</b><br><small>Hệ ${seriesNames[i]}</small></span></button>`).join("")}
        </div>
      </div>
      <div class="btnrow"><button class="btn" id="hthClose">Đóng</button></div>`,
      () => {
        const closeB = document.getElementById("hthClose");
        if (closeB) closeB.onclick = typeof closeModal === "function" ? closeModal : null;
        document.querySelectorAll("[data-hth]").forEach((btn) => {
          btn.onclick = () => {
            const k = btn.dataset.hth;
            matAdd("misc", "hthTc", -1);
            matAdd("misc", k, 1);
            if (typeof toast === "function") toast(`Nhận 1 ${I0.MAT[k].n}`);
            if (typeof uiSfx === "function") uiSfx("use");
            if (typeof save === "function") save();
            if (typeof refresh === "function") refresh();
            if (typeof matHave === "function" && matHave("misc", "hthTc") > 0) useHthTcModal();
            else if (typeof closeModal === "function") closeModal();
          };
        });
      }
    );
  }
  window.useHthTcModal = useHthTcModal;

  // Injected CSS
  function ensureCaCSS() {
    if (document.getElementById("caCss")) return;
    const s = document.createElement("style");
    s.id = "caCss";
    s.textContent = `
.camats{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}
.camat{display:flex;align-items:center;gap:4px;padding:3px 6px;border:1px solid rgba(217,182,90,.35);border-radius:4px;background:rgba(0,0,0,.25);font-size:12px}
.camat img{width:28px;height:28px;image-rendering:auto}
.camat b{white-space:nowrap}.camat.no b{color:#ff6a5a}
.cagrid{display:flex;flex-wrap:wrap;gap:4px;margin:6px 0;max-height:180px;overflow:auto}
.cagrid .it.on{outline:2px solid #ffe27a;outline-offset:-2px}
.cagrid .cw{position:relative;display:inline-block}
.cagrid .cw small{position:absolute;left:0;right:0;bottom:-2px;text-align:center;font-size:9px;color:#9fe8ff;pointer-events:none}
.caln{display:grid;grid-template-columns:1fr 70px 44px;gap:6px;align-items:center;padding:3px 0;font-size:12px}
.caln .bar{height:8px;border:1px solid rgba(217,182,90,.5);border-radius:3px;background:rgba(0,0,0,.4);overflow:hidden}
.caln .bar i{display:block;height:100%;background:linear-gradient(90deg,#b8862e,#ffe27a)}
.caln.full .bar i{background:linear-gradient(90deg,#4aa86a,#9fe8a0)}
.caln.fl{animation:caFl 1.2s ease-out}
.cacnt{color:#ff6a5a;font-weight:700}
.careveal{text-align:center;animation:caIn .7s ease-out}.careveal .sl{text-align:left}.careveal .idet{text-align:left}
.careveal .pic{display:inline-block;width:64px;height:64px;padding:6px;border-radius:50%;background:radial-gradient(circle,rgba(255,226,122,.45),transparent 70%)}
.careveal .pic img{width:52px;height:52px}
.careveal.hi .pic{background:radial-gradient(circle,rgba(255,170,0,.85),rgba(255,120,0,.2) 55%,transparent 75%);animation:caGlow 1.4s ease-in-out infinite alternate}
@keyframes caIn{0%{transform:scale(.3);opacity:0}60%{transform:scale(1.08);opacity:1}100%{transform:scale(1)}}
@keyframes caGlow{to{filter:brightness(1.5)}}
@keyframes caFl{0%{background:rgba(255,226,122,.55)}100%{background:transparent}}
@media (max-width:520px){.caln{grid-template-columns:1fr 54px 40px}.camat img{width:24px;height:24px}}
`;
    document.head.appendChild(s);
  }

  // State
  const caState = {
    tab: "make",
    uid: 0,
    pick: new Set(),
    made: 0,
    reveal: 0,
    flash: -1,
  };

  function renderMatChip(key, need) {
    const mat = I0.MAT[key] || { n: key, ic: "" };
    const have = typeof matHave === "function" ? matHave("misc", key) : 0;
    const notEnough = need && have < need;
    const escFn = typeof esc === "function" ? esc : (s) => s;
    return `<span class="camat${notEnough ? " no" : ""}" title="${escFn(mat.n)}">${mat.ic ? `<img src="${escFn(mat.ic)}" alt="">` : ""}<span><b>${need ? `${have}/${need}` : have}</b><br><small>${escFn(mat.n)}</small></span></span>`;
  }

  function renderCostBlock(cost) {
    const goldHave = (typeof S !== "undefined" && S && S.gold) || 0;
    const fmtLFn = typeof fmtL === "function" ? fmtL : (n) => n;
    const chips = Object.keys(cost.mats || {})
      .map((k) => renderMatChip(k, cost.mats[k]))
      .join("");
    const goldChip = cost.gold
      ? `<span class="camat${goldHave < cost.gold ? " no" : ""}"><span><b>${fmtLFn(cost.gold)}</b><br><small>lượng (có ${fmtLFn(goldHave)})</small></span></span>`
      : "";
    return `<div class="camats">${chips}${goldChip}</div>`;
  }

  function getDeficits(cost) {
    const def = [];
    for (const k in cost.mats || {}) {
      if ((typeof matHave === "function" ? matHave("misc", k) : 0) < cost.mats[k]) {
        def.push(I0.MAT[k] ? I0.MAT[k].n : k);
      }
    }
    const goldHave = (typeof S !== "undefined" && S && S.gold) || 0;
    if (goldHave < (cost.gold || 0)) def.push("ngân lượng");
    return def;
  }

  function renderLinesProgress(item, flashIdx) {
    const tier = item.ca.lvl;
    const cap = I0.cap[tier];
    const escFn = typeof esc === "function" ? esc : (s) => s;
    const magFn = typeof magText === "function" ? magText : (s) => s.a;

    return (item.mag || [])
      .map((s, idx) => {
        const lv = s.lv || 1;
        const isFull = lv >= cap;
        const isFl = idx === flashIdx;
        return `<div class="caln${isFull ? " full" : ""}${isFl ? " fl" : ""}"><span class="m">${escFn(magFn(s))}</span><span class="bar"><i style="width:${Math.round((100 * lv) / cap)}%"></i></span><b>${lv}/${cap}</b></div>`;
      })
      .join("");
  }

  function renderSealCell(it, isSelected, badgeText) {
    const cellFn = typeof itemCell === "function" ? itemCell : () => `<button class="it"><span>${it.n}</span></button>`;
    const cellHtml = cellFn(it);
    return `<span class="cw${isSelected ? " on" : ""}" data-uid="${it.uid}">${cellHtml.replace('class="it', `class="it${isSelected ? " on" : ""}`)}${badgeText ? `<small>${badgeText}</small>` : ""}</span>`;
  }

  function renderTabMake() {
    const cost = I0.COST.make;
    const deficits = getDeficits(cost);
    const escFn = typeof esc === "function" ? esc : (s) => s;
    const disabledAttr = deficits.length ? `disabled title="${escFn("Thiếu " + deficits.join(", "))}"` : "";

    return `<div class="card"><b>Chế tạo Chiến ấn</b> <small class="dim">Thanh Ấn 9,95% · Bạch Ấn 90% · Khiếu Hổ ấn / Bàn Long ấn (Tất cả kỹ năng +1) 0,05%</small>
      ${renderCostBlock(cost)}
      <div class="btnrow"><button class="btn" id="caMk" ${disabledAttr}>Tạo ấn</button></div></div>`;
  }

  function renderTabCarve() {
    const all = getAllSeals();
    const sel = all.find((p) => p.uid === caState.uid) || null;
    const cost = I0.COST.carve;
    const isEq = (it) => Object.values(S.eq || {}).includes(it);

    if (!all.length) {
      return '<div class="card"><small class="dim">Chưa có Chiến ấn: hãy chế tạo ở thẻ «Tạo ấn».</small></div>';
    }

    const grid = `<div class="cagrid" id="caPick">${all
      .map((p) => renderSealCell(p, sel === p, isEq(p) ? "đang mặc" : `${p.ca.carve || 0}/${p.ca.max}`))
      .join("")}</div>`;

    if (!sel) {
      return `<div class="card"><b>Khắc Chiến ấn</b> <small class="dim">Hãy đặt vào ấn!</small>${grid}</div>`;
    }

    const tier = sel.ca.lvl;
    const maxCarve = sel.ca.max || I0.max[tier];
    const isMaxed = (sel.ca.carve || 0) >= maxCarve || (sel.mag || []).every((l) => (l.lv || 1) >= I0.cap[tier]);
    const deficits = getDeficits(cost);
    const escFn = typeof esc === "function" ? esc : (s) => s;
    const rarCol = typeof RAR_COL !== "undefined" ? RAR_COL[sel.r] || RAR_COL[0] : "#ffd76a";

    return `<div class="card"><b>Khắc Chiến ấn</b> <small class="dim">mỗi lần khắc chắc chắn thành công: 1 dòng ngẫu nhiên +1 cấp</small>${grid}</div>
      <div class="card"><div class="idet"><div class="pic r${sel.r}">${sel.ic ? `<img src="${escFn(sel.ic)}" alt="">` : ""}</div><div><h4 style="color:${rarCol}">${escFn(sel.n)}</h4>
        <small>Số lần khắc: <span class="cacnt">${sel.ca.carve || 0}/${maxCarve}</span></small></div></div>
        <div class="sl">${renderLinesProgress(sel, caState.flash)}</div>
        ${isMaxed ? '<small class="dim">Ấn đã khắc tối đa</small>' : renderCostBlock(cost)}
        <div class="btnrow"><button class="btn" id="caCv" ${isMaxed || deficits.length ? `disabled${deficits.length && !isMaxed ? ` title="${escFn("Thiếu " + deficits.join(", "))}"` : ""}` : ""}>Khắc</button></div></div>`;
  }

  function renderTabRecall() {
    const equipped = Object.values(S.eq || {});
    const unequipped = getAllSeals().filter((it) => !equipped.includes(it));

    // Clear stale picks
    for (const uid of [...caState.pick]) {
      if (!unequipped.some((s) => s.uid === uid)) caState.pick.delete(uid);
    }

    const selected = unequipped.filter((s) => caState.pick.has(s.uid));
    const ret = calcRecallReturn(selected);
    const escFn = typeof esc === "function" ? esc : (s) => s;

    return `<div class="card"><b>Thu hồi Chiến ấn</b> <small class="dim">ấn bị hủy, trả lại ${I0.MAT.bnn.n} theo số lần đã khắc và ${I0.MAT.caht.n}. Ấn đang mặc không thu hồi được: tháo ra trước.</small>
      ${
        unequipped.length
          ? `<div class="cagrid" id="caRc">${unequipped
              .map((it) => renderSealCell(it, caState.pick.has(it.uid), `${it.ca.carve || 0}/${it.ca.max}`))
              .join("")}</div>
        <div class="btnrow"><button class="btn sm" id="caAllOn">Chọn tất cả</button><button class="btn sm" id="caAllOff" ${selected.length ? "" : "disabled"}>Bỏ chọn</button></div>`
          : '<br><small class="dim">Không có Chiến ấn nào trong hành trang để thu hồi.</small>'
      }</div>
      <div class="card"><b>Nhận lại</b> <small class="dim">${selected.length} ấn đã chọn</small>
        <div class="camats">
          ${[["bnn", ret.bnn], ["caht", ret.caht]]
            .map(([k, amt]) => {
              const mat = I0.MAT[k];
              return `<span class="camat">${mat.ic ? `<img src="${escFn(mat.ic)}" alt="">` : ""}<span><b>+${amt}</b><br><small>${escFn(mat.n)}</small></span></span>`;
            })
            .join("")}
        </div>
        <div class="btnrow"><button class="btn red" id="caRcGo" ${selected.length ? "" : "disabled"}>Thu hồi${selected.length ? ` (${selected.length})` : ""}</button></div></div>`;
  }

  function renderRevealModal(item) {
    const kind = I0.kind(item.k) || {};
    const isHi = !!kind.high;
    const itemHtmlFn = typeof itemHTML === "function" ? itemHTML : () => `<b>${item.n}</b>`;

    if (typeof modal !== "function") return;
    modal(
      `<h3>${isHi ? "✨ " : ""}Tạo ấn thành công</h3>
      <div class="card careveal${isHi ? " hi" : ""}">${itemHtmlFn(item)}</div>
      <div class="btnrow"><button class="btn" id="caRvCarve">Khắc ấn này</button><button class="btn" id="caRvClose">Đóng</button></div>`,
      () => {
        const cBtn = document.getElementById("caRvCarve");
        const xBtn = document.getElementById("caRvClose");
        if (cBtn) cBtn.onclick = () => caModal("carve", item.uid);
        if (xBtn) xBtn.onclick = () => caModal("make");
      }
    );
  }

  function caModal(tab, uid) {
    if (tab) caState.tab = tab;
    if (uid) caState.uid = +uid;
    ensureCaCSS();

    if (caState.reveal) {
      const item = getAllSeals().find((t) => t.uid === caState.reveal);
      caState.reveal = 0;
      if (item) return renderRevealModal(item);
    }

    const tabs = [
      ["make", "Tạo ấn"],
      ["carve", "Khắc ấn"],
      ["recall", "Thu hồi"],
    ];

    if (caState.tab === "carve" && !getAllSeals().some((s) => s.uid === caState.uid)) {
      caState.uid = (getAllSeals()[0] || {}).uid || 0;
    }

    const flash = caState.flash;
    caState.flash = -1;

    const goldHave = (typeof S !== "undefined" && S && S.gold) || 0;
    const bnnHave = typeof matHave === "function" ? matHave("misc", "bnn") : 0;
    const fmtLFn = typeof fmtL === "function" ? fmtL : (n) => n;

    const bodyHtml =
      caState.tab === "carve"
        ? (caState.flash = flash, renderTabCarve())
        : caState.tab === "recall"
          ? renderTabRecall()
          : renderTabMake();

    if (typeof modal !== "function") return;
    modal(
      `<h3>Thợ Khắc Ấn <small><span data-live="gold">${fmtLFn(goldHave)}</span> lượng · ${bnnHave} ${I0.MAT.bnn.n}</small></h3>
      <p class="desc">Chiến ấn mang lại sức mạnh to lớn cho chủ nhân sở hữu, cấp cường hóa càng cao thuộc tính ấn càng cao. Ở đây có thể Chế tạo, khắc và thu hồi Chiến ấn.</p>
      <div class="dtabs" id="caTabs">${tabs.map(([id, title]) => `<button data-ct="${id}" class="${id === caState.tab ? "on" : ""}">${title}</button>`).join("")}</div>
      ${bodyHtml}`,
      () => {
        caState.flash = -1;

        // Tabs
        document.querySelectorAll("#caTabs [data-ct]").forEach((btn) => {
          btn.onclick = () => caModal(btn.dataset.ct);
        });

        // Make button
        const mkBtn = document.getElementById("caMk");
        if (mkBtn) {
          mkBtn.onclick = () => {
            const res = makeChienAn();
            if (!res.ok) {
              if (typeof toast === "function") toast(res.msg);
              return;
            }
            caState.made = res.item.uid;
            caState.reveal = res.item.uid;
            caState.tab = "make";
            if (typeof uiSfx === "function") uiSfx(res.hi ? "levelup" : "learn");
            caModal();
          };
        }

        // Carve selection
        document.querySelectorAll("#caPick [data-uid]").forEach((el) => {
          el.onclick = () => caModal("carve", +el.dataset.uid);
        });

        // Carve button
        const cvBtn = document.getElementById("caCv");
        if (cvBtn) {
          cvBtn.onclick = () => {
            const item = getAllSeals().find((h) => h.uid === caState.uid);
            if (!item) return typeof toast === "function" ? toast("Ấn không tồn tại!") : null;
            const res = carveChienAn(item);
            if (!res.ok) {
              if (typeof toast === "function") toast(res.msg);
              return;
            }
            caState.flash = res.line;
            caState.tab = "carve";
            if (typeof uiSfx === "function") uiSfx("learn");
            caModal();
          };
        }

        // Recall selection
        document.querySelectorAll("#caRc [data-uid]").forEach((el) => {
          el.onclick = () => {
            const uidVal = +el.dataset.uid;
            if (caState.pick.has(uidVal)) caState.pick.delete(uidVal);
            else caState.pick.add(uidVal);
            caModal("recall");
          };
        });

        // Recall all / off
        const allOnBtn = document.getElementById("caAllOn");
        const allOffBtn = document.getElementById("caAllOff");
        const rcGoBtn = document.getElementById("caRcGo");

        if (allOnBtn) {
          allOnBtn.onclick = () => {
            const equipped = Object.values(S.eq || {});
            getAllSeals()
              .filter((it) => !equipped.includes(it))
              .forEach((it) => caState.pick.add(it.uid));
            caModal("recall");
          };
        }
        if (allOffBtn) {
          allOffBtn.onclick = () => {
            caState.pick.clear();
            caModal("recall");
          };
        }
        if (rcGoBtn) {
          rcGoBtn.onclick = () => {
            const equipped = Object.values(S.eq || {});
            const targetItems = getAllSeals().filter((it) => !equipped.includes(it) && caState.pick.has(it.uid));
            if (!targetItems.length) return typeof toast === "function" ? toast("Hãy đặt vào Chiến ấn!") : null;
            const ret = calcRecallReturn(targetItems);
            const confirmed = confirm(
              `Thu hồi ${targetItems.length} Chiến ấn? Ấn sẽ bị hủy, nhận lại ${ret.bnn} ${I0.MAT.bnn.n} và ${ret.caht} ${I0.MAT.caht.n}.`
            );
            if (confirmed) {
              const res = recallChienAn(targetItems);
              if (res.ok) {
                caState.pick.clear();
                if (typeof toast === "function") toast(res.msg);
                if (typeof uiSfx === "function") uiSfx("use");
                caModal("recall");
              } else if (typeof toast === "function") {
                toast(res.msg);
              }
            }
          };
        }
      }
    );
  }
  window.caModal = caModal;
})();
