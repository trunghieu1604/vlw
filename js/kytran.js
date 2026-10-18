"use strict";
const KNB_GOLD = 1e6,
  KNB_DAY = 1 / 0,
  DGT_KNB = 10,
  LDT_BUY_DAY = 5,
  ldtDay = () => {
    const i = RW(),
      n = dayKey(new Date());
    return ((!i.ldtBuy || i.ldtBuy.d !== n) && (i.ldtBuy = { d: n, n: 0 }), i.ldtBuy);
  },
  knbDay = () => {
    const i = RW(),
      n = dayKey(new Date());
    return ((!i.knbBuy || i.knbBuy.d !== n) && (i.knbBuy = { d: n, n: 0 }), i.knbBuy);
  },
  KTC = [
    {
      k: "knb",
      n: "Kim Nguyên Bảo",
      ic: "img/ep/knb.png",
      gold: 1e6,
      d: "Đổi ngân lượng lấy Kim Nguyên Bảo · không giới hạn",
      use: () => ((S.knb = (S.knb || 0) + 1), knbDay().n++, "Nhận 1 Kim Nguyên Bảo"),
    },
    {
      k: "tt",
      n: "Tiên Thảo Lộ",
      ic: "img/ep/tt.png",
      knb: 2,
      d: "+50% kinh nghiệm trong 60 phút (cộng dồn thời gian)",
      use: () => (addBuff("tt", 0.5, 60), "Tiên Thảo Lộ: +50% kinh nghiệm 60 phút"),
    },
    {
      k: "qht",
      n: "Quế Hoa Tửu",
      ic: "img/ep/qht.png",
      knb: 2,
      d: "+20 may mắn trong 60 phút: đồ rơi nhiều dòng / dòng tốt hơn, +10% tỉ lệ rơi đồ",
      use: () => (addBuff("luck", 20, 60), (R.dirty = !0), "Quế Hoa Tửu: +20 may mắn 60 phút"),
    },
    {
      k: "rht",
      n: "Rương Huyền Tinh",
      ic: "img/ep/box2.png",
      gold: 3e4,
      vio: 1,
      d: "2–3 Huyền Tinh Khoáng Thạch (cấp theo cấp nhân vật)",
      use: () => {
        const i = clamp(Math.floor(S.lvl / 15) + irnd(0, 1), 1, HT_MAX),
          n = irnd(2, 3);
        return (matAdd("ht", i, n), `Rương Huyền Tinh: ${n} Huyền Tinh cấp ${i}`);
      },
    },
    {
      k: "rda",
      n: "Rương Đá Thuộc Tính",
      ic: "img/ep/box3.png",
      gold: 5e4,
      vio: 1,
      d: "1–2 đá thuộc tính (hợp hệ / loại đồ đang mặc)",
      use: () => {
        const i = [forceOre(S.lvl)];
        return (Math.random() < 0.3 && i.push(forceOre(S.lvl)), "Rương Đá Thuộc Tính: " + i.join(", "));
      },
    },
    {
      k: "mt90",
      n: "Võ Lâm Mật Tịch 90",
      ic: "img/ep/mt90.png",
      knb: 5,
      d: "Lĩnh ngộ 1 võ công 90 từ cấp 80 (cấp 1, sau đó luyện)",
      use: () => (matAdd("misc", "bk90", 1), "Nhận 1 Võ Lâm Mật Tịch 90"),
    },
    {
      k: "ldt",
      n: "Lệnh Bài Dã Tẩu",
      ic: "img/ep/ldt.png",
      knb: 5,
      d: "Tối đa 5 / ngày · +20 lượt nhiệm vụ Dã Tẩu trong ngày (dùng ở thẻ Nhiệm vụ › Dã Tẩu, tại đây, hoặc tự dùng khi hết lượt)",
      use: () => (matAdd("misc", "ldt", 1), ldtDay().n++, "Nhận 1 Lệnh Bài Dã Tẩu"),
    },
    {
      k: "ldp",
      n: "Lệnh Bài Đổi Phái",
      ic: "img/ep/ldp.png",
      knb: 20,
      d: "Đổi sang môn phái khác (kể cả khác hệ). Giữ cấp, tiềm năng, trang bị; hoàn lại toàn bộ điểm kỹ năng",
      use: () => (matAdd("misc", "ldp", 1), "Nhận 1 Lệnh Bài Đổi Phái (dùng ở thẻ Nhân vật hoặc tại đây)"),
    },
    {
      k: "dgt",
      n: "Thẻ Đổi Giới Tính",
      ic: "img/ep/ldp.png",
      knb: 10,
      d: "Đổi Nam ↔ Nữ: đổi ngoại hình; đồ chỉ dành cho giới cũ tự tháo vào hành trang. Giữ cấp, điểm, võ công. Thiếu Lâm / Nga My / Thúy Yên không đổi được",
      use: () => (matAdd("misc", "dgt", 1), "Nhận 1 Thẻ Đổi Giới Tính"),
    },
    {
      k: "rngua",
      n: "Rương Ngựa",
      ic: "img/ep/box2.png",
      knb: 20,
      d: "Cất vào túi, bấm Dùng để mở 1 con ngựa (nguồn ngựa duy nhất) · Thường 56% · Tốt 31,5% · Quý 6% · Thần 3% · Danh mã 2% · Bảo mã 1% · Chí tôn 0,5% (Quý trở lên tự khóa; ngựa cấp yêu cầu cao cần Trùng Sinh). Còn rơi từ trùm, phó bản, mốc Dã Tẩu",
      use: () => (matAdd("misc", "rngua", 1), "Nhận 1 Rương Ngựa (bấm Dùng để mở)"),
    },
    {
      k: "rmatna",
      n: "Rương Mặt Nạ",
      ic: "img/ep/box3.png",
      knb: 50,
      d: "Cất vào túi, bấm Dùng để mở 1 Mặt Nạ (hạn 3 ngày). Có tỷ lệ 3% mở ra Mặt Nạ VĨNH VIỄN.",
      use: () => (matAdd("misc", "rmatna", 1), "Nhận 1 Rương Mặt Nạ (bấm Dùng để mở)"),
    },
    {
      k: "dtbk",
      n: "Đại Thành Bí Kíp",
      ic: "img/ep/dtbk.png",
      knb: 25,
      d: "Đưa 1 võ công 90 đã học lên cấp 20 ngay, không cần luyện (dùng ở thẻ Võ công)",
      use: () => (matAdd("misc", "dtbk", 1), "Nhận 1 Đại Thành Bí Kíp"),
    },
    {
      k: "bk120",
      n: "Mật Tịch 120",
      ic: "img/ep/dtbk.png",
      knb: 1000,
      d: "Dùng để lĩnh ngộ tuyệt kỹ 120 của môn phái (cần cấp 120)",
      use: () => (matAdd("misc", "bk120", 1), "Nhận 1 Mật Tịch 120 (bấm Lĩnh ngộ để học chiêu)"),
    },
    {
      k: "bk150",
      n: "Mật Tịch 150",
      ic: "img/ep/dtbk.png",
      knb: 2000,
      d: "Dùng để lĩnh ngộ 1 võ công 150 của môn phái (cần cấp 150)",
      use: () => (matAdd("misc", "bk150", 1), "Nhận 1 Mật Tịch 150 (bấm Lĩnh ngộ để chọn chiêu)"),
    },
    {
      k: "rhk",
      n: "Rương Hoàng Kim",
      ic: "img/ep/box2.png",
      knb: 500,
      d: "Mở 100% ra đồ HK môn phái lv 120-180. Tỷ lệ 0.5% ra trọn bộ (full set) HK.",
      use: () => (matAdd("misc", "rhk", 1), "Nhận 1 Rương Hoàng Kim (bấm Dùng để mở)"),
    },
    {
      k: "rfullhk",
      n: "Rương Trọn Bộ HKMP",
      ic: "img/ep/box3.png",
      knb: 1500,
      d: "Mở 100% nhận TRỌN BỘ CÁC MÓN Hoàng Kim Môn Phái (gồm cả bộ Tống Kim) theo đúng môn phái đang chơi.",
      use: () => (matAdd("misc", "rfullhk", 1), "Nhận 1 Rương Trọn Bộ HKMP (bấm Dùng để mở)"),
    },
  ];
function useDaiThanh(i) {
  const n = SK[i];
  if (!n || n.tier !== 90 || !S.sk[i] || matHave("misc", "dtbk") < 1) return;
  const t = SKL(),
    c = t[i] || (t[i] = { lv: S.sk[i], xp: 0 });
  if (c.lv >= n.max) {
    toast("Đã đại thành");
    return;
  }
  (matAdd("misc", "dtbk", -1),
    (c.lv = n.max),
    (c.xp = 0),
    (S.sk[i] = n.max),
    (R.dirty = !0),
    recalc(),
    log(`📕 Dùng Đại Thành Bí Kíp: <b style="color:#ffd24a">${esc(n.n)}</b> đại thành cấp ${n.max}!`),
    toast(`${n.n} cấp ${n.max}`),
    uiSfx("levelup"),
    save(),
    refresh());
}
// daily limit per item: i.lim (admin config, js/gcfg/shops.js), else Lệnh Bài Dã Tẩu 5 / day; -1 = none
const ktcLim = (i) => (i.lim != null ? i.lim : i.k === "ldt" ? LDT_BUY_DAY : -1),
  ktcDay = () => {
    const i = RW(),
      n = dayKey(new Date());
    return ((!i.ktcDay || i.ktcDay.d !== n) && (i.ktcDay = { d: n, n: {} }), i.ktcDay);
  },
  ktcDayN = (i) => (i.k === "knb" ? knbDay().n : i.k === "ldt" ? ldtDay().n : ktcDay().n[i.k] || 0),
  ktcOk = (i) => !i.vio || verVio(),
  ktcCost = (i) => (i.knb ? `${i.knb} KNB` : fmtL(i.gold)),
  ktcCan = (i, n = 1) => {
    return (i.knb ? (S.knb || 0) >= i.knb * n : S.gold >= i.gold * n) &&
      (ktcLim(i) < 0 || ktcDayN(i) + n <= ktcLim(i));
  };
function ktcBuy(i, n = 1) {
  const t = KTC.find((e) => e.k === i);
  if (!t || !ktcOk(t)) return;
  let c = 0;
  const a = [];
  for (let e = 0; e < n && ktcCan(t); e++)
    (t.knb ? (S.knb -= t.knb) : (S.gold -= t.gold),
      a.push(t.use()),
      c++,
      t.k !== "knb" && t.k !== "ldt" && (ktcDay().n[t.k] = (ktcDay().n[t.k] || 0) + 1));
  if (!c) {
    toast(t.knb ? "Không đủ Kim Nguyên Bảo" : "Không đủ ngân lượng");
    return;
  }
  RW().stat.ktc = (RW().stat.ktc || 0) + c;
  const o = a[a.length - 1];
  (log(
    `🏮 Kỳ Trân Các: ${c > 1 ? `mua ${c} × ${esc(t.n)} · ` : ""}${esc(c > 1 && t.k.startsWith("r") ? a.join(" · ") : o)} (−${t.knb ? t.knb * c + " Kim Nguyên Bảo" : fmtL(t.gold * c) + " lượng"})`,
  ),
    toast(c > 1 ? `${t.n} ×${c}` : o),
    uiSfx("learn"),
    (R.dirty = !0),
    (invDirty = !0),
    save(),
    ktcModal(ktcTab));
}
let ktcTab = "item";

function getActiveMask(maskKey) {
  if (S.eq && S.eq.mask && S.eq.mask.k === maskKey && (!S.eq.mask.expireAt || S.eq.mask.expireAt > Date.now())) {
    return S.eq.mask;
  }
  const found = (S.inv || []).find((it) => it && it.d === 11 && it.k === maskKey && (!it.expireAt || it.expireAt > Date.now()));
  return found || null;
}
window.getActiveMask = getActiveMask;

function buyMask(maskKey) {
  if ((S.knb || 0) < 50) {
    toast("Không đủ Kim Nguyên Bảo (cần 50 KNB)");
    return;
  }
  if (S.inv.length >= INV_MAX) {
    toast("Hành trang đã đầy, hãy dọn túi trước");
    return;
  }
  S.knb -= 50;
  const it = typeof makeMaskItem === "function" ? makeMaskItem(maskKey, false) : null;
  if (!it) {
    toast("Không thể tạo mặt nạ");
    return;
  }
  S.inv.unshift(it);
  RW().stat.ktc = (RW().stat.ktc || 0) + 1;
  log(`🏮 Kỳ Trân Các: mua 1 × <b style="color:#ffd24a">${esc(it.n)}</b> (−50 Kim Nguyên Bảo) · Hạn sử dụng 3 ngày`);
  toast(`Mua thành công ${it.n} (Hạn dùng 3 ngày)`);
  uiSfx("learn");
  R.dirty = !0;
  invDirty = !0;
  save();
  ktcModal("mask");
}
window.buyMask = buyMask;

function hkBoxHave() {
  return typeof matHave === "function" ? matHave("misc", "rhk") : 0;
}
window.hkBoxHave = hkBoxHave;

function fullHkBoxHave() {
  return typeof matHave === "function" ? matHave("misc", "rfullhk") : 0;
}
window.fullHkBoxHave = fullHkBoxHave;

function getHkBoxPool() {
  if (!S || !S.fac || (typeof isNovice === "function" && isNovice()) || !FAC[S.fac] || FAC[S.fac].id < 0) return null;
  const facId = FAC[S.fac].id;
  const pool = (typeof J !== "undefined" && J.sets && J.sets.gold ? J.sets.gold : []).filter((r) => {
    const fid = (r.req.find((l) => l[0] === 39) || [0, -1])[1];
    const lvl = (r.req.find((l) => l[0] === 36) || [0, 0])[1];
    return fid === facId && lvl >= 120 && lvl <= 180 && (typeof setRowOk !== "function" || setRowOk(r)) && (typeof sexReqOk !== "function" || sexReqOk(r.req));
  });
  if (!pool.length) return null;

  const grpMap = new Map();
  pool.forEach((r) => {
    if (!grpMap.has(r.grp)) grpMap.set(r.grp, []);
    grpMap.get(r.grp).push(r);
  });

  const properSets = [];
  for (const [grp, rows] of grpMap) {
    const setRows = rows.length === 20 ? rows.slice(10, 20) : rows;
    const distinct = [];
    const seenSid = new Set();
    for (const item of setRows) {
      if (!seenSid.has(item.sid)) {
        seenSid.add(item.sid);
        distinct.push(item);
      }
    }
    if (distinct.length >= 4) {
      const name = (typeof admGetSetName === "function" ? admGetSetName(distinct, grp, false) : null) || (typeof SET_GRP_NAME !== "undefined" && SET_GRP_NAME[grp]) || distinct[0].n.split(" ").slice(0, 4).join(" ");
      properSets.push({ grp, name, items: distinct });
    }
  }

  return { pool, properSets };
}
window.getHkBoxPool = getHkBoxPool;

function giveHkItem(it) {
  if (S.inv.length < INV_MAX) {
    S.inv.unshift(it);
  } else if (typeof epBox === "function" && epBox().length < (typeof EP_BOX_MAX === "number" ? EP_BOX_MAX : 120)) {
    epBox().push(it);
    toast("Hành trang đầy: trang bị đã chuyển vào Kho Rèn");
  } else if (typeof makeRoom === "function" && makeRoom(it, true)) {
    S.inv.unshift(it);
  } else {
    S.inv.push(it);
  }
  if (typeof recItem === "function") recItem(it);
  if (typeof dtItemGot === "function") dtItemGot(it);
}

function hkBoxUse(n = 1) {
  if (hkBoxHave() < 1) {
    toast("Không có Rương Hoàng Kim trong túi");
    return;
  }
  if (!S || !S.fac || (typeof isNovice === "function" && isNovice()) || !FAC[S.fac] || FAC[S.fac].id < 0) {
    toast("Cần gia nhập môn phái để mở Rương Hoàng Kim!");
    return;
  }
  if (S.inv.length >= INV_MAX) {
    toast("Hành trang đã đầy, hãy dọn túi trước");
    return;
  }
  const data = getHkBoxPool();
  if (!data || !data.pool.length) {
    toast("Không tìm thấy dữ liệu Hoàng Kim môn phái!");
    return;
  }

  let opened = 0;
  const fullSetHits = [];
  const singleItems = [];

  for (let i = 0; i < n; i++) {
    if (hkBoxHave() < 1) break;
    if (S.inv.length >= INV_MAX) {
      toast("Hành trang đã đầy!");
      break;
    }
    matAdd("misc", "rhk", -1);
    opened++;

    // Tỷ lệ 0.5% (0.005) mở ra trọn bộ (full set) Hoàng Kim
    const isFullSet = Math.random() < 0.005 && data.properSets.length > 0;
    if (isFullSet) {
      const chosenSet = pick(data.properSets);
      const setPieces = [];
      for (const row of chosenSet.items) {
        const it = makeSetItem("gold", row, 5);
        giveHkItem(it);
        setPieces.push(it);
      }
      fullSetHits.push({ set: chosenSet, items: setPieces });
    } else {
      const row = pick(data.pool);
      const it = makeSetItem("gold", row, 5);
      giveHkItem(it);
      singleItems.push(it);
    }
  }

  if (!opened) return;

  if (fullSetHits.length > 0) {
    uiSfx("levelup");
    for (const hit of fullSetHits) {
      log(`🎉 <b style="color:#ff3333">[TỶ LỆ 0.5% CỰC HIẾM]</b> Mở Rương Hoàng Kim nhận <b>TRỌN BỘ HOÀNG KIM ${esc(hit.set.name)}</b> (${hit.items.length} món)!`);
      toast(`🎉 [0.5%] Nhận TRỌN BỘ ${hit.set.name} (${hit.items.length} món)!`);
    }
  } else {
    uiSfx("learn");
  }

  if (singleItems.length > 0) {
    if (singleItems.length === 1 && fullSetHits.length === 0) {
      const it = singleItems[0];
      const lvl = (it.req.find(l => l[0] === 36) || [0, 0])[1];
      log(`🎁 Mở Rương Hoàng Kim: nhận <b style="color:#ffd24a">${esc(it.n)}</b> (cấp ${lvl})`);
      toast(`Nhận: ${it.n} (cấp ${lvl})`);
    } else {
      log(`🎁 Mở ${opened} Rương Hoàng Kim: nhận ${singleItems.length} món Hoàng Kim${fullSetHits.length ? ` + ${fullSetHits.length} TRỌN BỘ` : ""}`);
      if (fullSetHits.length === 0) {
        toast(`Mở ${opened} Rương Hoàng Kim: nhận ${singleItems.length} món`);
      }
    }
  }

  R.dirty = !0;
  invDirty = !0;
  save();
  refresh();
  if (document.getElementById("mBody")) {
    ktcModal(ktcTab);
  }
}
window.hkBoxUse = hkBoxUse;

const HKMP_FULL_MERGE_DATA = {
  2: [61], 3: [62], 4: [63], 5: [64], 6: [65], 7: [66], 8: [67],
  10: [68], 11: [69], 12: [70], 13: [71], 15: [72], 16: [73], 17: [74],
  19: [75], 20: [76], 21: [77], 23: [78], 24: [79], 25: [80], 26: [81], 27: [82]
};
if (typeof window !== "undefined") {
  window.ADM_HKMP_MERGE = window.ADM_HKMP_MERGE || HKMP_FULL_MERGE_DATA;
}

function getFullHkSetsForFaction(facId) {
  const gold = (typeof J !== "undefined" && J.sets && J.sets.gold) ? J.sets.gold : ((typeof JX !== "undefined" && JX.sets && JX.sets.gold) ? JX.sets.gold : []);
  if (!gold.length) return [];

  const grpMap = new Map();
  gold.forEach((r) => {
    if (!grpMap.has(r.grp)) grpMap.set(r.grp, []);
    grpMap.get(r.grp).push(r);
  });

  const mergeMap = (typeof ADM_HKMP_MERGE !== "undefined" && ADM_HKMP_MERGE) ? ADM_HKMP_MERGE : HKMP_FULL_MERGE_DATA;
  const sets = [];

  for (let g = 1; g <= 28; g++) {
    const r1 = grpMap.get(g) || [];
    if (!r1.length) continue;
    const f = (r1[0].req.find((x) => x[0] === 39) || [0, -1])[1];
    if (f !== facId) continue;

    const extraGrps = mergeMap[g] || [];
    const r2 = extraGrps.flatMap((eg) => grpMap.get(eg) || []);
    const allRows = [...r1, ...r2];

    const nm = (typeof admGetSetName === "function" ? admGetSetName(allRows, g, false) : null) ||
               (typeof SET_GRP_NAME !== "undefined" && SET_GRP_NAME[g]) ||
               allRows[0].n.split(" ").slice(0, 2).join(" ");

    const minLvl = Math.min(...allRows.map((x) => (x.req.find((r) => r[0] === 36) || [0, 0])[1]));
    const maxLvl = Math.max(...allRows.map((x) => (x.req.find((r) => r[0] === 36) || [0, 0])[1]));
    const lvlStr = minLvl !== maxLvl ? `${minLvl}–${maxLvl}` : `${minLvl}`;

    sets.push({
      grp: g,
      name: nm,
      itemCount: allRows.length,
      lvlStr: lvlStr,
      rows: allRows,
    });
  }

  return sets;
}
window.getFullHkSetsForFaction = getFullHkSetsForFaction;

function openFullHkSetPicker() {
  const hasBox = fullHkBoxHave();
  if (hasBox < 1) {
    toast("Không có Rương Trọn Bộ HKMP trong túi");
    return;
  }
  if (!S || S.fac == null || (typeof isNovice === "function" && isNovice()) || !FAC[S.fac] || FAC[S.fac].id < 0) {
    toast("Cần gia nhập môn phái để mở Rương Trọn Bộ!");
    return;
  }
  const facId = FAC[S.fac].id;
  const facName = FAC[S.fac].n || "Môn Phái";
  const sets = getFullHkSetsForFaction(facId);
  if (!sets.length) {
    toast(`Không tìm thấy dữ liệu bộ Hoàng Kim cho ${facName}!`);
    return;
  }

  const cardsHtml = sets.map((st) => {
    const piecesHtml = st.rows.map((r) => {
      const lvl = (r.req.find((x) => x[0] === 36) || [0, 0])[1];
      const isTk = r.n.includes("Tống Kim");
      return `<span style="display:inline-block;background:rgba(0,0,0,0.5);border:1px solid ${isTk ? '#ff9e42' : 'rgba(255,210,74,0.4)'};padding:2px 7px;border-radius:3px;font-size:11px;color:${isTk ? '#ffb86c' : '#ffd24a'}">${esc(r.n)} <small class="dim" style="font-size:10px">(cấp ${lvl})</small></span>`;
    }).join("");

    const hasShoes = st.rows.some((r) => r.d === 5);
    const hasBelt = st.rows.some((r) => r.d === 6);
    const missingBadges = [];
    if (!hasShoes) missingBadges.push(`<span style="color:#ff6b6b;font-size:12px;font-weight:bold;margin-left:4px">(Thiếu Giày)</span>`);
    if (!hasBelt) missingBadges.push(`<span style="color:#ff9e42;font-size:12px;font-weight:bold;margin-left:4px">(Thiếu Đai)</span>`);
    const missingHtml = missingBadges.join(" ");

    return `
      <div style="background:linear-gradient(135deg, rgba(255,210,74,0.12), rgba(20,15,10,0.85));border:1px solid #ffd24a;border-radius:6px;padding:12px;margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <div style="font-size:15px;color:#ffd24a;font-weight:bold">★ Bộ ${esc(st.name)}${missingHtml} · <span style="color:#8fe34a">${st.itemCount} món</span> <span style="font-size:12px;color:#ddd">(Cấp ${st.lvlStr})</span></div>
          <button class="btn on" data-choose-set="${st.grp}" style="background:linear-gradient(135deg, #ffd24a, #ff9e42);color:#000;font-weight:bold;padding:6px 14px;font-size:12px;border:none;cursor:pointer">🎁 Nhận Trọn Bộ</button>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">
          ${piecesHtml}
        </div>
      </div>
    `;
  }).join("");

  modal(
    `<h3>🎁 Rương Trọn Bộ Hoàng Kim · ${esc(facName)}</h3>
    <div style="margin-bottom:10px;padding:10px 12px;background:rgba(255,210,74,0.08);border:1px solid rgba(255,210,74,0.3);border-radius:6px;font-size:12px;line-height:1.5">
      Đang có: <b style="color:#ffd24a">${hasBox} Rương Trọn Bộ HKMP</b>.<br>
      Hãy chọn 1 bộ Hoàng Kim bên dưới phù hợp với đường tu luyện của bạn để nhận <b>100% TRỌN BỘ CÁC MÓN</b> (gồm cả bộ Tống Kim, phẩm cấp 10 hoàn mỹ).
    </div>
    <div style="max-height:420px;overflow-y:auto;padding-right:4px">
      ${cardsHtml}
    </div>
    <div style="display:flex;justify-content:flex-end;margin-top:10px">
      <button class="btn" id="fullHkBackKtc" style="background:rgba(255,255,255,0.08);color:#ddd;padding:6px 14px;border:1px solid #555;cursor:pointer">Quay lại Kỳ Trân Các</button>
    </div>`,
    () => {
      const backKtc = $("#fullHkBackKtc");
      backKtc && (backKtc.onclick = () => ktcModal());
      document.querySelectorAll("#mBody [data-choose-set]").forEach((btn) => {
        btn.onclick = () => {
          const grp = +btn.dataset.chooseSet;
          const chosen = sets.find((x) => x.grp === grp);
          if (!chosen) return;
          if (fullHkBoxHave() < 1) {
            toast("Không có Rương Trọn Bộ HKMP trong túi!");
            return;
          }
          if (S.inv.length >= INV_MAX && (typeof epBox !== "function" || epBox().length >= (typeof EP_BOX_MAX === "number" ? EP_BOX_MAX : 120))) {
            toast("Hành trang và Kho Rèn đã đầy, hãy dọn túi trước!");
            return;
          }

          matAdd("misc", "rfullhk", -1);
          const items = chosen.rows.map((r) => makeSetItem("gold", r, 10));
          for (const it of items) {
            giveHkItem(it);
          }

          const hasShoes = chosen.rows.some((r) => r.d === 5);
          const hasBelt = chosen.rows.some((r) => r.d === 6);
          const missingNotes = [];
          if (!hasShoes) missingNotes.push("(Thiếu Giày)");
          if (!hasBelt) missingNotes.push("(Thiếu Đai)");
          const missingStr = missingNotes.join(" ");
          const displayName = missingStr ? `${chosen.name} ${missingStr}` : chosen.name;

          uiSfx("levelup");
          log(`🎉 <b style="color:#ffd24a">[RƯƠNG TRỌN BỘ HKMP]</b> Nhận <b>TRỌN BỘ ${esc(displayName)}</b> (${items.length} món Hoàng Kim Môn Phái cấp ${chosen.lvlStr})!`);
          toast(`🎉 Nhận TRỌN BỘ ${displayName} (${items.length} món)!`);

          R.dirty = !0;
          invDirty = !0;
          save();
          refresh();

          if (fullHkBoxHave() > 0) {
            openFullHkSetPicker();
          } else {
            closeModal(true);
          }
        };
      });
    }
  );
}
window.openFullHkSetPicker = openFullHkSetPicker;

function fullHkBoxUse(n = 1) {
  if (fullHkBoxHave() < 1) {
    toast("Không có Rương Trọn Bộ HKMP trong túi");
    return;
  }
  if (!S || S.fac == null || (typeof isNovice === "function" && isNovice()) || !FAC[S.fac] || FAC[S.fac].id < 0) {
    toast("Cần gia nhập môn phái để mở Rương Trọn Bộ!");
    return;
  }
  if (S.inv.length >= INV_MAX && (typeof epBox !== "function" || epBox().length >= (typeof EP_BOX_MAX === "number" ? EP_BOX_MAX : 120))) {
    toast("Hành trang đã đầy, hãy dọn túi trước");
    return;
  }
  openFullHkSetPicker();
}
window.fullHkBoxUse = fullHkBoxUse;

function ktcModal(tab) {
  if (typeof migrateMasks == "function") migrateMasks();
  if (tab === "mask" || tab === "Mặt nạ" || tab === "ruongtb" || tab === "Rương TB") {
    ktcTab = "ruongtb";
  } else if (tab === "ruonghk" || tab === "Rương HK" || tab === "rhk") {
    ktcTab = "ruonghk";
  } else if (tab) {
    ktcTab = tab;
  }
  const i = R.P ? Math.round(R.P.lucky) : 0;
  const KTC_TABS = [
    ["item", "Vật phẩm"],
    ["ruongtb", "Rương TB"],
    ["ruonghk", "Rương HK"],
  ];
  const tabHeader = `<div class="dtabs" id="ktcTabs" style="margin-bottom:10px">${KTC_TABS.map(([k, l]) => `<button data-kt="${k}" class="${k === ktcTab ? "on" : ""}">${l}</button>`).join("")}</div>`;

  let contentHtml = "";
  if (ktcTab === "ruonghk") {
    const hasHkBox = typeof matHave === "function" ? matHave("misc", "rhk") : 0;
    const hasFullHkBox = typeof fullHkBoxHave === "function" ? fullHkBoxHave() : 0;
    const canBuyHk = (S.knb || 0) >= 500;
    const canBuyHk10 = (S.knb || 0) >= 5000;
    const canBuyFullHk = (S.knb || 0) >= 1500;
    const facName = FAC[S.fac] ? FAC[S.fac].n : "Môn Phái";
    const isNov = typeof isNovice === "function" && isNovice();

    contentHtml = `
      <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:12px">
        <!-- Rương Trọn Bộ Hoàng Kim Môn Phái (1000 KNB) -->
        <div style="background:linear-gradient(135deg, rgba(255,210,74,0.22), rgba(60,35,10,0.85));border:1.5px solid #ffd24a;box-shadow:0 0 10px rgba(255,210,74,0.25);border-radius:6px;padding:14px;display:flex;align-items:center;gap:14px">
          <img src="img/ep/box3.png" alt="" style="width:54px;height:54px;image-rendering:pixelated">
          <div style="flex:1">
            <div style="font-size:15px;color:#ffd24a;font-weight:bold">★ Rương Trọn Bộ HK ${esc(facName)} · <span style="color:#ff9e42">1500 KNB</span></div>
            <div style="font-size:12px;color:#eee;margin:6px 0;line-height:1.5">
              Mở <b style="color:#ffd24a">100% nhận TRỌN BỘ CÁC MÓN Hoàng Kim</b> môn phái ${esc(facName)} (gồm cả phần 1 và bộ Tống Kim, phẩm cấp 10 hoàn mỹ).<br>
              <span style="color:#8fe34a;font-weight:bold">★ Đặc quyền: Tự do chọn bộ theo đường tu luyện của bạn (Đao, Kiếm, Chưởng, Thương, Bổng...)!</span><br>
              <span class="dim">Cất vào túi, bấm Dùng để mở bảng chọn bộ. ${isNov ? '<b class="bad">Bạn chưa gia nhập môn phái!</b>' : ''}</span>
            </div>
            ${hasFullHkBox ? `<div style="color:#ffd24a;font-size:13px;font-weight:bold">🎁 Đang có <b>${hasFullHkBox} Rương Trọn Bộ HKMP</b> trong túi!</div>` : ""}
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
            <button class="btn sm knb" id="ktcBuyFullHkTab" ${canBuyFullHk ? "" : "disabled"} style="padding:7px 16px;font-weight:bold;font-size:13px">Mua 1500 KNB</button>
            ${hasFullHkBox ? `<button class="btn sm on" id="ktcRfullhkTab" style="background:linear-gradient(135deg, #ffd24a, #ff9e42);color:#000;font-weight:bold;padding:6px 14px;font-size:13px">Mở Rương (${hasFullHkBox})</button>` : ""}
          </div>
        </div>

        <!-- Rương Hoàng Kim Môn Phái (500 KNB) -->
        <div style="background:linear-gradient(135deg, rgba(255,210,74,0.14), rgba(40,25,10,0.7));border:1px solid #ff9e42;border-radius:6px;padding:14px;display:flex;align-items:center;gap:14px">
          <img src="img/ep/box2.png" alt="" style="width:54px;height:54px;image-rendering:pixelated">
          <div style="flex:1">
            <div style="font-size:15px;color:#ffd24a;font-weight:bold">Rương Hoàng Kim ${esc(facName)} · <span style="color:#ff9e42">500 KNB</span></div>
            <div style="font-size:12px;color:#eee;margin:6px 0;line-height:1.5">
              Mở <b>100% nhận ngẫu nhiên 1 trang bị Hoàng Kim môn phái ${esc(facName)} (cấp 120–180)</b>.<br>
              <span style="color:#ff5555;font-weight:bold">★ Chú thích: Có tỷ lệ 0.5% mở ra TRỌN BỘ (FULL SET) Hoàng Kim môn phái!</span><br>
              <span class="dim">Cất vào túi, bấm Dùng để mở. ${isNov ? '<b class="bad">Bạn chưa gia nhập môn phái!</b>' : ''}</span>
            </div>
            ${hasHkBox ? `<div style="color:#ffd24a;font-size:13px;font-weight:bold">🎁 Đang có <b>${hasHkBox} Rương Hoàng Kim</b> trong túi!</div>` : ""}
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
            <button class="btn sm knb" id="ktcBuyHkTab" ${canBuyHk ? "" : "disabled"} style="padding:7px 16px;font-weight:bold;font-size:13px">Mua 500 KNB</button>
            ${canBuyHk10 ? `<button class="btn sm knb" id="ktcBuyHkTab10" style="padding:4px 10px;font-size:11px">Mua ×10 (5000 KNB)</button>` : ""}
            ${hasHkBox ? `<button class="btn sm on" id="ktcRhkTab" style="background:#ffd24a;color:#000;font-weight:bold;padding:6px 14px;font-size:13px">Mở Rương (${hasHkBox})</button>` : ""}
            ${hasHkBox > 1 ? `<button class="btn sm on" id="ktcRhkTab10" style="background:#ff9e42;color:#000;font-weight:bold;padding:4px 10px;font-size:11px">Mở ×${Math.min(10, hasHkBox)}</button>` : ""}
          </div>
        </div>
      </div>
      <div class="card small" style="background:rgba(255,210,74,0.06);border:1px solid rgba(255,210,74,0.3);padding:10px;border-radius:6px">
        <div style="color:#ffd24a;font-weight:bold;margin-bottom:4px">📜 Quy tắc Rương Hoàng Kim:</div>
        <div class="dim small" style="line-height:1.5">
          • <b>Rương Trọn Bộ HKMP (1500 KNB)</b>: Nhận 100% đủ set các món môn phái (${esc(facName)}) gồm cả bộ Tống Kim, phẩm cấp 10 hoàn mỹ, được chọn bộ theo hướng chơi.<br>
          • <b>Rương Hoàng Kim (500 KNB)</b>: Mở 100% ra 1 trang bị Hoàng Kim môn phái cấp 120–180. Tỷ lệ 0.5% (1/200) nhận trọn bộ.<br>
          • Cất vào túi, bấm Dùng để mở hoặc mở trực tiếp tại Kỳ Trân Các.
        </div>
      </div>
    `;
  } else if (ktcTab === "ruongtb" || ktcTab === "mask") {
    const hasHorseBox = typeof matHave === "function" ? matHave("misc", "rngua") : 0;
    const hasMaskBox = typeof maskBoxHave === "function" ? maskBoxHave() : 0;
    const canBuyHorse = (S.knb || 0) >= 20;
    const canBuyMask = (S.knb || 0) >= 50;

    contentHtml = `
      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:12px">
        <!-- Rương Ngựa -->
        <div style="background:linear-gradient(135deg, rgba(255,210,74,0.12), rgba(30,20,10,0.6));border:1px solid #ff9e42;border-radius:6px;padding:12px;display:flex;align-items:center;gap:12px">
          <img src="img/ep/box2.png" alt="" style="width:48px;height:48px;image-rendering:pixelated">
          <div style="flex:1">
            <div style="font-size:14px;color:#ffd24a;font-weight:bold">Rương Ngựa · <span style="color:#ff9e42">20 KNB</span></div>
            <div style="font-size:12px;color:#ddd;margin:4px 0">
              Mở ra <b>ngẫu nhiên 1 trong 48 loài thú cưỡi Võ Lâm</b> (nguồn ngựa duy nhất).<br>
              <span class="dim">Cất vào túi, bấm Dùng để mở.</span>
            </div>
            ${hasHorseBox ? `<div style="color:#ff9e42;font-size:12px;font-weight:bold">🎁 Đang có <b>${hasHorseBox} Rương Ngựa</b> trong túi!</div>` : ""}
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
            <button class="btn sm knb" id="ktcBuyHorseTab" ${canBuyHorse ? "" : "disabled"} style="padding:6px 14px;font-weight:bold">Mua 20 KNB</button>
            ${hasHorseBox ? `<button class="btn sm on" id="ktcRnguaTab" style="background:#ff9e42;color:#000;font-weight:bold;padding:5px 12px;font-size:12px">Mở Rương (${hasHorseBox})</button>` : ""}
          </div>
        </div>

        <!-- Rương Mặt Nạ -->
        <div style="background:linear-gradient(135deg, rgba(255,210,74,0.12), rgba(30,20,10,0.6));border:1px solid #ff9e42;border-radius:6px;padding:12px;display:flex;align-items:center;gap:12px">
          <img src="img/ep/box3.png" alt="" style="width:48px;height:48px;image-rendering:pixelated">
          <div style="flex:1">
            <div style="font-size:14px;color:#ffd24a;font-weight:bold">Rương Mặt Nạ · <span style="color:#ff9e42">50 KNB</span></div>
            <div style="font-size:12px;color:#ddd;margin:4px 0">
              Mở ra <b>ngẫu nhiên 1 trong 13 Mặt Nạ Võ Lâm</b> (hạn dùng 3 ngày).<br>
              <span style="color:#ffd24a;font-weight:bold">★ Đặc biệt: Có tỷ lệ 3% mở ra Mặt Nạ VĨNH VIỄN.</span><br>
              <span class="dim">Mua không giới hạn số lượng. Đeo ở phím F3 để đổi ngoại trang.</span>
            </div>
            ${hasMaskBox ? `<div style="color:#ff9e42;font-size:12px;font-weight:bold">🎁 Đang có <b>${hasMaskBox} Rương Mặt Nạ</b> trong túi!</div>` : ""}
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
            <button class="btn sm knb" id="ktcBuyMaskTab" ${canBuyMask ? "" : "disabled"} style="padding:6px 14px;font-weight:bold">Mua 50 KNB</button>
            ${hasMaskBox ? `<button class="btn sm on" id="ktcRmatnaTab" style="background:#ff9e42;color:#000;font-weight:bold;padding:5px 12px;font-size:12px">Mở Rương (${hasMaskBox})</button>` : ""}
          </div>
        </div>
      </div>
      <p class="dim small">Các loại rương trang bị mua bằng Kim Nguyên Bảo, cất vào túi và bấm Dùng để mở.</p>
    `;
  } else {
    contentHtml = `
      <p class="desc">Giá cố định. Mua bằng <b>Kim Nguyên Bảo</b> (rơi từ trùm 10%, trùm Hoàng Kim / boss tuần 50%); Rương Huyền Tinh và Rương Đá Thuộc Tính mua bằng ngân lượng. Rương Huyền Tinh / Đá mở ngay khi mua; Rương Ngựa / Rương Mặt Nạ / Rương Hoàng Kim cất vào túi, bấm Dùng để mở.</p>
      ${buffText() ? `<div class="card small">Đang có: ${buffText()}</div>` : ""}
      <div class="shoplist">${KTC.map((n) => {
        const t = ktcOk(n),
          c =
            n.k === "mt90"
              ? matHave("misc", "bk90")
              : n.k === "dtbk"
                ? matHave("misc", "dtbk")
                : n.k === "ldp"
                  ? matHave("misc", "ldp")
                  : n.k === "ldt"
                    ? matHave("misc", "ldt")
                    : n.k === "dgt"
                      ? matHave("misc", "dgt")
                      : n.k === "rngua"
                        ? matHave("misc", "rngua")
                        : n.k === "rmatna"
                          ? matHave("misc", "rmatna")
                          : n.k === "rhk"
                            ? matHave("misc", "rhk")
                            : n.k === "rfullhk"
                              ? matHave("misc", "rfullhk")
                        : n.k === "bk120"
                          ? matHave("misc", "bk120")
                          : n.k === "bk150"
                            ? matHave("misc", "bk150")
                            : n.k === "knb"
                              ? `${knbDay().n} hôm nay (${ktcLim(n) < 0 ? "không giới hạn" : "tối đa " + ktcLim(n)})`
                              : null;
        return `<div class="shoprow ktc${t ? "" : " bad"}"><img src="${n.ic}" alt="" style="image-rendering:pixelated"><span><b>${esc(n.n)}</b><small>${esc(n.d)}${c != null ? (n.k === "knb" ? ` · đã đổi ${c}` : ` · có ${c}`) : ""}${ktcLim(n) >= 0 && n.k !== "knb" ? ` · hôm nay ${ktcDayN(n)}/${ktcLim(n)}` : ""}${t ? "" : " · cần phiên bản 2 (đổi ở thẻ Khác)"}</small></span>
          <span class="btnrow"><button class="btn sm${n.knb ? " knb" : ""}" data-ktc="${n.k}" ${t && ktcCan(n) ? "" : "disabled"}>${ktcCost(n)}</button>${n.k === "ldp" && c ? '<button class="btn sm on" id="ktcLdp">Dùng</button>' : ""}${n.k === "ldt" && c ? '<button class="btn sm on" id="ktcLdt">Dùng</button>' : ""}${n.k === "rngua" && c ? '<button class="btn sm on" id="ktcRngua">Dùng</button>' + (c > 1 ? `<button class="btn sm on" id="ktcRngua10">Dùng ×${Math.min(10, c)}</button>` : "") : ""}${n.k === "rmatna" && c ? '<button class="btn sm on" id="ktcRmatna">Dùng</button>' : ""}${n.k === "rhk" && c ? '<button class="btn sm on" id="ktcRhk">Dùng</button>' + (c > 1 ? `<button class="btn sm on" id="ktcRhk10">Dùng ×${Math.min(10, c)}</button>` : "") : ""}${n.k === "rfullhk" && c ? '<button class="btn sm on" id="ktcRfullhk">Dùng</button>' : ""}${n.k === "mt90" && c ? '<button class="btn sm on" id="ktcMt">Lĩnh ngộ</button>' : ""}${n.k === "bk120" && c ? '<button class="btn sm on" id="ktcBk120">Lĩnh ngộ</button>' : ""}${n.k === "bk150" && c ? '<button class="btn sm on" id="ktcBk150">Lĩnh ngộ</button>' : ""}${n.k === "dgt" && c ? '<button class="btn sm on" id="ktcDgt">Dùng</button>' : ""}${n.k === "dtbk" && c ? '<button class="btn sm on" id="ktcDtbk">Dùng</button>' : ""}${n.k === "dtbk" || n.k === "ldp" || n.k === "dgt" || n.k === "bk120" || n.k === "bk150" ? "" : `<button class="btn sm" data-ktc10="${n.k}" ${t && ktcCan(n, 10) ? "" : "disabled"}>×10</button>`}</span></div>`;
      }).join("")}</div>
      <p class="dim small">May mắn hiện tại: <b>${i}</b> (trang bị + Quế Hoa Tửu). Mỗi điểm: đồ rơi có nhiều dòng / dòng cấp cao hơn, +0,5% tỉ lệ rơi đồ.</p>
    `;
  }

  modal(
    `<h3>🏮 Kỳ Trân Các <small><img src="img/ep/knb.png" alt="" style="height:14px;vertical-align:middle;image-rendering:pixelated"> ${S.knb || 0} Kim Nguyên Bảo · ${fmtL(S.gold)} lượng</small></h3>
    ${tabHeader}
    ${contentHtml}`,
    () => {
      document.querySelectorAll("#mBody [data-kt]").forEach((b) => {
        b.onclick = () => ktcModal(b.dataset.kt);
      });
      if (ktcTab === "ruonghk") {
        const buyFullHkTab = $("#ktcBuyFullHkTab");
        buyFullHkTab && (buyFullHkTab.onclick = () => { ktcBuy("rfullhk", 1); ktcModal("ruonghk"); });
        const rfullhkTab = $("#ktcRfullhkTab");
        rfullhkTab && (rfullhkTab.onclick = () => { typeof fullHkBoxUse === "function" && fullHkBoxUse(1); });

        const buyHkTab = $("#ktcBuyHkTab");
        buyHkTab && (buyHkTab.onclick = () => { ktcBuy("rhk", 1); ktcModal("ruonghk"); });
        const buyHkTab10 = $("#ktcBuyHkTab10");
        buyHkTab10 && (buyHkTab10.onclick = () => { ktcBuy("rhk", 10); ktcModal("ruonghk"); });
        const rhkTab = $("#ktcRhkTab");
        rhkTab && (rhkTab.onclick = () => { typeof hkBoxUse === "function" && hkBoxUse(1); ktcModal("ruonghk"); });
        const rhkTab10 = $("#ktcRhkTab10");
        rhkTab10 && (rhkTab10.onclick = () => { typeof hkBoxUse === "function" && hkBoxUse(10); ktcModal("ruonghk"); });
        return;
      }

      if (ktcTab === "ruongtb" || ktcTab === "mask") {
        const buyHorseTab = $("#ktcBuyHorseTab");
        buyHorseTab && (buyHorseTab.onclick = () => { ktcBuy("rngua", 1); ktcModal("ruongtb"); });
        const rnguaTab = $("#ktcRnguaTab");
        rnguaTab && (rnguaTab.onclick = () => { typeof horseBoxUse === "function" && horseBoxUse(1); ktcModal("ruongtb"); });

        const buyMaskTab = $("#ktcBuyMaskTab");
        buyMaskTab && (buyMaskTab.onclick = () => { ktcBuy("rmatna", 1); ktcModal("ruongtb"); });
        const rmatnaTab = $("#ktcRmatnaTab");
        rmatnaTab && (rmatnaTab.onclick = () => { typeof maskBoxUse === "function" && maskBoxUse(1); ktcModal("ruongtb"); });
        return;
      }

      (document.querySelectorAll("#mBody [data-ktc]").forEach((l) => (l.onclick = () => ktcBuy(l.dataset.ktc, 1))),
        document
          .querySelectorAll("#mBody [data-ktc10]")
          .forEach((l) => (l.onclick = () => ktcBuy(l.dataset.ktc10, 10))));
      const n = $("#ktcLdp");
      n && (n.onclick = doiPhaiModal);
      const t = $("#ktcMt");
      t &&
        (t.onclick = () => {
          if (S.lvl < 80 && !rebornN()) {
            toast("Võ công 90 cần cấp 80");
            return;
          }
          (closeModal(!0), showTab("skill"), toast("Bấm + ở võ công 90 để lĩnh ngộ (không tốn điểm)"));
        });
      const b120 = $("#ktcBk120");
      b120 && (b120.onclick = ktcBk120Modal);
      const b150 = $("#ktcBk150");
      b150 && (b150.onclick = ktcBk150Modal);
      const c = $("#ktcDgt");
      c && (c.onclick = doiGioiTinhModal);
      const a = $("#ktcDtbk");
      a &&
        (a.onclick = () => {
          (closeModal(!0), showTab("skill"), toast("Bấm 📕 ở võ công 90 đã học để đại thành cấp 20"));
        });
      const o = $("#ktcRngua");
      o &&
        (o.onclick = () => {
          (horseBoxUse(1), ktcModal());
        });
      const e = $("#ktcRngua10");
      e &&
        (e.onclick = () => {
          (horseBoxUse(10), ktcModal());
        });
      const rmb = $("#ktcRmatna");
      rmb &&
        (rmb.onclick = () => {
          (maskBoxUse(1), ktcModal());
        });
      const rhkBtn = $("#ktcRhk");
      rhkBtn &&
        (rhkBtn.onclick = () => {
          (hkBoxUse(1), ktcModal());
        });
      const rhk10Btn = $("#ktcRhk10");
      rhk10Btn &&
        (rhk10Btn.onclick = () => {
          (hkBoxUse(10), ktcModal());
        });
      const rfullhkBtn = $("#ktcRfullhk");
      rfullhkBtn &&
        (rfullhkBtn.onclick = () => {
          fullHkBoxUse(1);
        });
      const s = $("#ktcLdt");
      s &&
        (s.onclick = () => {
          if (S.lvl < DT_LV) {
            toast(`Dã Tẩu mở từ cấp ${DT_LV}`);
            return;
          }
          (dtUseLdt(!1), ktcModal());
        });
    },
  );
}

function ktcBk120Modal() {
  if (!S.fac || (typeof isNovice == "function" && isNovice())) {
    toast("Chưa gia nhập môn phái");
    return;
  }
  if (S.lvl < 120 && !(typeof rebornN == "function" && rebornN())) {
    toast("Tuyệt kỹ 120 cần cấp 120");
    return;
  }
  const have = matHave("misc", "bk120");
  if (have < 1) {
    toast("Chưa có Mật Tịch 120");
    return;
  }
  const id = typeof sk120IdOf == "function" ? sk120IdOf(S.fac) : 0;
  if (!id || !SK[id]) {
    toast("Phái này chưa có tuyệt kỹ 120");
    return;
  }
  const sk = SK[id];
  const learned = S.sk[id] > 0;
  modal(
    `<h3>Lĩnh ngộ tuyệt kỹ 120 <small>${have} Mật Tịch 120</small></h3>
    <p class="desc">Dùng 1 Mật Tịch 120 để lĩnh ngộ tuyệt kỹ 120 bổn phái (cần cấp 120, học cấp 1 sau đó luyện theo điểm kinh nghiệm).</p>
    <div class="card" style="display:flex;align-items:center;justify-content:space-between;margin:6px 0;padding:8px">
      <div style="display:flex;align-items:center;gap:8px">
        <img src="${esc(sk.ic || "")}" alt="" style="width:36px;height:36px;border-radius:4px;image-rendering:pixelated">
        <div><b>${esc(sk.n)}</b><br><small class="dim">${esc(sk.d || "")}</small></div>
      </div>
      <div>
        ${learned ? '<span class="tag">Đã học</span>' : `<button class="btn sm on" id="bLearn120">Lĩnh ngộ</button>`}
      </div>
    </div>`,
    () => {
      const btn = $("#bLearn120");
      if (btn) {
        btn.onclick = () => {
          if (S.sk[id] || matHave("misc", "bk120") < 1) return;
          matAdd("misc", "bk120", -1);
          S.sk[id] = 1;
          const lx = typeof skTrainMap == "function" ? skTrainMap() : (S.lx || (S.lx = {}));
          lx[id] = { lv: 1, xp: 0 };
          recalc();
          save();
          closeModal(true);
          toast(`Đã lĩnh ngộ ${sk.n}!`);
          log(`📕 Dùng Mật Tịch 120: lĩnh ngộ tuyệt kỹ 120 <b style="color:#ffd24a">${esc(sk.n)}</b>!`);
          uiSfx("levelup");
          refresh();
        };
      }
    }
  );
}

function ktcBk150Modal() {
  if (!S.fac || (typeof isNovice == "function" && isNovice())) {
    toast("Chưa gia nhập môn phái");
    return;
  }
  if (S.lvl < 150 && !(typeof rebornN == "function" && rebornN())) {
    toast("Võ công 150 cần cấp 150");
    return;
  }
  const have = matHave("misc", "bk150");
  if (have < 1) {
    toast("Chưa có Mật Tịch 150");
    return;
  }
  const list = typeof sk150List == "function" ? sk150List(S.fac) : [];
  if (!list.length) {
    toast("Môn phái chưa có võ công 150");
    return;
  }
  const rows = list.map(id => {
    const sk = SK[id];
    if (!sk) return "";
    const learned = S.sk[id] > 0;
    return `<div class="card" style="display:flex;align-items:center;justify-content:space-between;margin:6px 0;padding:8px">
      <div style="display:flex;align-items:center;gap:8px">
        <img src="${esc(sk.ic || "")}" alt="" style="width:36px;height:36px;border-radius:4px;image-rendering:pixelated">
        <div><b>${esc(sk.n)}</b><br><small class="dim">${esc(sk.d || "")}</small></div>
      </div>
      <div>
        ${learned ? '<span class="tag">Đã học</span>' : `<button class="btn sm on" data-learn150="${id}">Lĩnh ngộ</button>`}
      </div>
    </div>`;
  }).join("");

  modal(
    `<h3>Lĩnh ngộ võ công 150 <small>${have} Mật Tịch 150</small></h3>
    <p class="desc">Dùng 1 Mật Tịch 150 để lĩnh ngộ tuyệt kỹ 150 bổn phái (cần cấp 150, sau đó luyện theo điểm kinh nghiệm).</p>
    <div class="list">${rows}</div>`,
    () => {
      document.querySelectorAll("#mBody [data-learn150]").forEach(btn => {
        btn.onclick = () => {
          const id = +btn.dataset.learn150;
          const sk = SK[id];
          if (!sk || S.sk[id] || matHave("misc", "bk150") < 1) return;
          matAdd("misc", "bk150", -1);
          S.sk[id] = 1;
          const lx = typeof skTrainMap == "function" ? skTrainMap() : (S.lx || (S.lx = {}));
          lx[id] = { lv: 1, xp: 0 };
          recalc();
          save();
          closeModal(true);
          toast(`Đã lĩnh ngộ ${sk.n}!`);
          log(`📕 Dùng Mật Tịch 150: lĩnh ngộ võ công 150 <b style="color:#ffd24a">${esc(sk.n)}</b>!`);
          uiSfx("levelup");
          refresh();
        };
      });
    }
  );
}
function doiPhaiModal() {
  if (!S.fac || isNovice()) {
    toast("Vô Môn Phái: gia nhập môn phái ở cấp " + NOVICE_LV);
    return;
  }
  const i = matHave("misc", "ldp"),
    n = FACTIONS.filter((t) => !t.novice)
      .map((t) => {
        const c = facAllowed(t, S.sex) && t.key !== S.fac,
          a = t.starter && SK[t.starter];
        return `<button data-dp="${t.key}" ${c && i ? "" : "disabled"} style="--c:${SERIES_COL[t.series]}"><img src="${(W.hero[t.key] || {}).img || ""}" alt=""><b>${esc(t.n)}</b><small>${t.key === S.fac ? "Môn phái hiện tại" : facAllowed(t, S.sex) ? `Hệ ${SERIES[t.series]} · ${weaponTypeName(t)}${a ? " · " + esc(a.n) : ""}` : "Không nhận giới tính này"}</small></button>`;
      })
      .join("");
  modal(
    `<h3>Đổi môn phái <small>${i} Lệnh Bài Đổi Phái</small></h3>
    <p class="desc">Dùng 1 Lệnh Bài Đổi Phái: chuyển sang phái mới (đổi cả hệ ngũ hành nếu khác hệ). <b>Giữ</b> cấp, tiềm năng, trang bị, cấp võ công 90 đã luyện; <b>hoàn lại toàn bộ điểm kỹ năng</b> để học võ công phái mới; nhận chiêu nhập môn + vũ khí phái mới.</p>
    ${i ? "" : '<p class="bad small">Chưa có Lệnh Bài Đổi Phái — mua ở Kỳ Trân Các.</p>'}<div class="facpick">${n}</div>`,
    () => {
      document.querySelectorAll("#mBody [data-dp]").forEach(
        (t) =>
          (t.onclick = () => {
            const c = FAC[t.dataset.dp];
            confirm(`Đổi sang ${c.n}? Toàn bộ điểm kỹ năng được hoàn lại.`) && changeFaction(c.key);
          }),
      );
    },
  );
}
function changeFaction(i) {
  const n = FAC[i],
    t = FAC[S.fac];
  if (!n || n.novice || i === S.fac || !facAllowed(n, S.sex) || matHave("misc", "ldp") < 1) return;
  if (R.dg || R.tower) {
    toast("Ra khỏi phó bản / tháp rồi đổi phái");
    return;
  }
  matAdd("misc", "ldp", -1);
  const c = S.bkOk || (S.bkOk = {});
  for (const s in S.sk)
    (SK[s] && SK[s].book && (c[s] = 1),
      (S.skPts += SK[s] && SK[s].tier === 90 && !(typeof isBr90 == "function" && isBr90(s)) ? 0 : S.sk[s]));
  ((S.sk = {}),
    (S.fac = i),
    (S.main = 0),
    (S.mainLock = !1),
    (S.slots = [0, 0, 0, 0]),
    (S.auraOff = {}),
    (R.sks = null),
    n.starter && ((S.sk[n.starter] = 1), (S.skPts = Math.max(0, S.skPts - 1)), (S.main = n.starter)));
  const a = facWeaponDP(n),
    o = (s) => makeItem(a[0], a[1], s, 0);
  let e = null;
  for (let s = clamp(Math.round(S.lvl / 12) + 1, 1, 10); s >= 1 && ((e = o(s)), !(e && reqOk(e))); s--);
  (e && (S.inv.unshift(e), (invDirty = !0), reqOk(e) && equip(e, !0)),
    (R.dirty = !0),
    recalc(),
    typeof autoEquipAll == "function" && autoEquipAll(),
    S.autoPts === !0 && autoSpendSkills(),
    fillSlots(),
    (R.dirty = !0),
    recalc(),
    (R.life = Math.min(R.life, R.P.life)),
    (R.mana = Math.min(R.mana, R.P.mana)),
    closeModal(!0),
    renderPad(),
    refresh(),
    save(),
    uiSfx("levelup"),
    (R.banner = {
      t: 2.8,
      text: "Gia nhập " + n.n,
      sub: `Rời ${t ? t.n : ""} · ${S.skPts} điểm kỹ năng chờ phân phối`,
    }),
    log(
      `🏮 Lệnh Bài Đổi Phái: rời <b>${esc(t ? t.n : "")}</b>, gia nhập <b style="color:${SERIES_COL[n.series]}">${esc(n.n)}</b> (hệ ${SERIES[n.series]}). Hoàn lại ${S.skPts} điểm kỹ năng.`,
    ));
}
function doiGioiTinhModal() {
  const i = matHave("misc", "dgt"),
    n = S.sex ? 0 : 1,
    t = S.fac && S.fac in FAC_SEX,
    c = Object.entries(S.eq)
      .filter(([a, o]) => o && a !== "horse" && !sexReqOkFor(o, n))
      .map(([, a]) => a);
  modal(
    `<h3>Đổi giới tính <small>${i} thẻ</small></h3>
    <p class="desc">${S.sex ? "Nữ" : "Nam"} → <b>${n ? "Nữ" : "Nam"}</b>. Giữ cấp, tiềm năng, võ công, trang bị.</p>
    ${t ? `<p class="reqbad">${esc(FAC[S.fac].n)} chỉ nhận ${FAC_SEX[S.fac] ? "Nữ" : "Nam"}: cần đổi phái trước.</p>` : ""}
    ${c.length ? `<p class="small">Sẽ tháo vào hành trang (chỉ dành cho ${S.sex ? "Nữ" : "Nam"}): ${c.map((a) => esc(a.n)).join(", ")}</p>` : ""}
    <div class="btnrow"><button class="btn red" id="dgtGo" ${i && !t ? "" : "disabled"}>Đổi sang ${n ? "Nữ" : "Nam"}</button><button class="btn" id="dgtNo">Đóng</button></div>`,
    () => {
      (($("#dgtNo").onclick = () => ktcModal()),
        ($("#dgtGo").onclick = () => {
          if (!(!(matHave("misc", "dgt") > 0) || t)) {
            if (S.inv.length + c.length > INV_MAX) {
              toast("Hành trang không đủ chỗ cho đồ phải tháo");
              return;
            }
            (matAdd("misc", "dgt", -1), (S.sex = n));
            for (const [a, o] of Object.entries(S.eq)) o && c.includes(o) && (delete S.eq[a], S.inv.unshift(o));
            ((invDirty = !0),
              (R.dirty = !0),
              recalc(),
              typeof autoEquipAll == "function" && autoEquipAll(),
              (R.dirty = !0),
              recalc(),
              renderPad(),
              save(),
              log(
                `🎭 Dùng Thẻ Đổi Giới Tính: nhân vật đổi sang <b>${n ? "Nữ" : "Nam"}</b>${c.length ? ` (tháo ${c.length} món)` : ""}.`,
              ),
              toast(`Đã đổi sang ${n ? "Nữ" : "Nam"}`),
              uiSfx("levelup"),
              closeModal(!0),
              refresh());
          }
        }));
    },
  );
}
