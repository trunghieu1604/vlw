"use strict";
const CAMP = {
    shaolin: "chinh",
    wudang: "chinh",
    emei: "chinh",
    gaibang: "chinh",
    tianwang: "trung",
    tangmen: "trung",
    cuiyan: "trung",
    kunlun: "trung",
    wudu: "ta",
    tianren: "ta",
  },
  CAMP_INFO = {
    chinh: { n: "Chính phái", c: "#ffb347" },
    trung: { n: "Trung lập", c: "#7ee07e" },
    ta: { n: "Tà phái", c: "#c77bff" },
    tan: { n: "Tân thủ", c: "#ececec" },
  },
  campOf = (n) => CAMP[n] || "tan",
  campCol = (n) => CAMP_INFO[campOf(n)].c,
  // Màu tổ đội (JX1 m_CurrentCamp, KgameWorldVN.cpp / KNpc.cpp): every member of one party (main + disciples)
  // shows the party's camp colour over the head; S.ptCamp (main save) picks it, default = the main's faction camp
  PT_CAMP = {
    begin: { n: "Tân thủ", c: "#ffffff" },
    justice: { n: "Chính phái", c: "#ffa85e" },
    evil: { n: "Tà phái", c: "#ff92ff" },
    balance: { n: "Trung lập", c: "#55ff91" },
    free: { n: "Sát thủ", c: "#ff0000" },
    event: { n: "Sự kiện", c: "#ee1289" },
    blue: { n: "Lam", c: "#4a4aff" },
    green: { n: "Lục", c: "#00ff00" },
  },
  ptCampDef = (fac) => ({ chinh: "justice", trung: "balance", ta: "evil" })[campOf(fac)] || "begin",
  // party camp of the local party (S.ptCamp is not a per-character key: it stays on S while a disciple is swapped in)
  ptCamp = () => {
    if (typeof S > "u" || !S) return "begin";
    if (PT_CAMP[S.ptCamp]) return S.ptCamp;
    const f = typeof PCTX < "u" && PCTX && typeof charGet == "function" ? charGet(0, "fac") : S.fac;
    return ptCampDef(f);
  },
  ptCol = () => PT_CAMP[ptCamp()].c,
  TIER = [
    null,
    { n: "Thường", c: "#e8e0d0" },
    { n: "Hiếm", c: "#6aa8ff" },
    { n: "Quý", c: "#c77bff" },
    { n: "Truyền kỳ", c: "#ffb52e" },
    { n: "Chí tôn", c: "#ff5a3c" },
  ],
  FAC_SHORT = {
    shaolin: "Thiếu Lâm",
    tianwang: "Thiên Vương",
    tangmen: "Đường Môn",
    wudu: "Ngũ Độc",
    emei: "Nga My",
    cuiyan: "Thúy Yên",
    gaibang: "Cái Bang",
    tianren: "Thiên Nhẫn",
    wudang: "Võ Đang",
    kunlun: "Côn Lôn",
  },
  facShort = () => FAC_SHORT[S.fac] || "",
  lvTop = () => (RW().stat.reborn > 0 ? 200 : S.lvl),
  has90 = (n = 1) => Object.keys(S.sk || {}).some((t) => SK[t] && SK[t].tier === 90 && S.sk[t] >= n),
  dtN = () => (S.dt && S.dt.n) || 0,
  TITLES = [
    [
      "xuatson",
      "Sơ Nhập Giang Hồ",
      "Cấp bậc",
      1,
      () => lvTop() >= 10 && !FAC[S.fac].novice,
      "Gia nhập môn phái",
      ["lifemax_p", 2],
    ],
    ["lv30", "Xuất Sơn", "Cấp bậc", 1, () => lvTop() >= 30, "Đạt cấp 30", ["lifemax_p", 3]],
    ["lv50", "Thiếu Hiệp", "Cấp bậc", 2, () => lvTop() >= 50, "Đạt cấp 50", ["lifemax_p", 4]],
    ["lv80", "Danh Chấn Giang Hồ", "Cấp bậc", 2, () => lvTop() >= 80, "Đạt cấp 80", ["attackspeed_v", 3]],
    ["lv100", "Đại Hiệp", "Cấp bậc", 3, () => lvTop() >= 100, "Đạt cấp 100", ["allres_p", 4]],
    ["lv150", "Tông Sư", "Cấp bậc", 4, () => lvTop() >= 150, "Đạt cấp 150", ["allres_p", 6]],
    ["lv200", "Võ Lâm Chí Tôn", "Cấp bậc", 5, () => lvTop() >= 200, "Đạt cấp 200", ["allres_p", 8]],
    ["cs1", "Nhất Trùng Sinh", "Chuyển sinh", 3, () => RW().stat.reborn >= 1, "Chuyển sinh 1 lần", ["lifemax_p", 8]],
    ["cs3", "Tam Trùng Sinh", "Chuyển sinh", 4, () => RW().stat.reborn >= 3, "Chuyển sinh 3 lần", ["lifemax_p", 10]],
    [
      "cs5",
      "Ngũ Trùng Tuyệt Đỉnh",
      "Chuyển sinh",
      5,
      () => RW().stat.reborn >= 5,
      "Chuyển sinh 5 lần",
      ["lifemax_p", 14],
    ],
    [
      "cs10",
      "Thập Trùng Tuyệt Đỉnh",
      "Chuyển sinh",
      5,
      () => RW().stat.reborn >= 10,
      "Chuyển sinh 10 lần",
      ["lifemax_p", 20],
    ],
    [
      "cs20",
      "Nhị Thập Trùng Sinh",
      "Chuyển sinh",
      5,
      () => RW().stat.reborn >= 20,
      "Chuyển sinh 20 lần",
      ["manamax_p", 20],
    ],
    [
      "mp1",
      () => facShort() + " Đệ Tử",
      "Môn phái",
      1,
      () => !FAC[S.fac].novice,
      "Gia nhập môn phái",
      ["manamax_p", 3],
    ],
    [
      "mp2",
      () => facShort() + " Hộ Pháp",
      "Môn phái",
      2,
      () => !FAC[S.fac].novice && lvTop() >= 60,
      "Cấp 60 trong môn phái",
      ["manamax_p", 5],
    ],
    [
      "mp3",
      () => facShort() + " Trưởng Lão",
      "Môn phái",
      3,
      () => !FAC[S.fac].novice && lvTop() >= 90 && has90(),
      "Cấp 90 + lĩnh ngộ võ công 90",
      ["manamax_p", 7],
    ],
    [
      "mp4",
      () => facShort() + " Chưởng Môn",
      "Môn phái",
      4,
      () => !FAC[S.fac].novice && lvTop() >= 150 && has90(20),
      "Cấp 150 + một võ công 90 cấp 20",
      ["allres_p", 6],
    ],
    ["k1000", "Sát Thủ", "Chiến công", 1, () => RW().stat.kills >= 1e3, "Hạ 1.000 quái", ["manamax_p", 4]],
    ["k10000", "Vạn Nhân Địch", "Chiến công", 2, () => RW().stat.kills >= 1e4, "Hạ 10.000 quái", ["attackspeed_v", 5]],
    [
      "k100000",
      "Huyết Sát Thiên Hạ",
      "Chiến công",
      4,
      () => RW().stat.kills >= 1e5,
      "Hạ 100.000 quái",
      ["attackspeed_v", 8],
    ],
    ["b50", "Diệt Trùm", "Chiến công", 2, () => RW().stat.bosses >= 50, "Hạ 50 Trùm", ["allres_p", 3]],
    ["b500", "Đồ Long Hiệp Sĩ", "Chiến công", 4, () => RW().stat.bosses >= 500, "Hạ 500 Trùm", ["allres_p", 6]],
    [
      "gold5",
      "Săn Trùm Hoàng Kim",
      "Chiến công",
      3,
      () => RW().stat.goldBoss >= 5,
      "Hạ 5 Trùm Hoàng Kim",
      ["lucky_v", 10],
    ],
    [
      "tower20",
      "Phá Tháp Giả",
      "Chiến công",
      3,
      () => RW().stat.towerBest >= 20,
      "Leo tháp tầng 20",
      ["attackspeed_v", 6],
    ],
    [
      "tower50",
      "Thông Thiên Tháp Chủ",
      "Chiến công",
      5,
      () => RW().stat.towerBest >= 50,
      "Leo tháp tầng 50",
      ["attackspeed_v", 10],
    ],
    [
      "dt100",
      "Hành Hiệp Trượng Nghĩa",
      "Hành hiệp",
      2,
      () => dtN() >= 100,
      "Hoàn thành 100 nhiệm vụ Dã Tẩu",
      ["lucky_v", 8],
    ],
    [
      "dt1000",
      "Nghĩa Hiệp Thiên Hạ",
      "Hành hiệp",
      4,
      () => dtN() >= 1e3,
      "Hoàn thành 1.000 nhiệm vụ Dã Tẩu",
      ["lucky_v", 15],
    ],
    [
      "zone8",
      "Nửa Giang Sơn",
      "Hành hiệp",
      2,
      () => S.maxStage >= STAGES / 2,
      "Mở nửa số bản đồ",
      ["fastwalkrun_p", 5],
    ],
    ["zone16", "Trường Bạch Sơn Chủ", "Hành hiệp", 3, () => S.maxStage > STAGES, "Mở hết bản đồ", ["lifemax_p", 6]],
    [
      "login30",
      "Giang Hồ Lão Luyện",
      "Giang hồ",
      2,
      () => RW().login.total >= 30,
      "Đăng nhập 30 ngày",
      ["manamax_p", 6],
    ],
    [
      "setfull",
      "Hoàng Kim Gia Thân",
      "Giang hồ",
      4,
      () => typeof enoughToActive == "function" && enoughToActive(S.eq),
      "Mặc đủ 1 bộ Hoàng Kim",
      ["allres_p", 5],
    ],
    [
      "vio6",
      "Huyền Tinh Thần Tượng",
      "Giang hồ",
      3,
      () => Object.values(S.eq || {}).some((n) => n && n.vio && (n.mag || []).length >= 6),
      "Mặc 1 món Tím đủ 6 dòng",
      ["allres_p", 4],
    ],
    ["rich", "Phú Giáp Nhất Phương", "Giang hồ", 3, () => S.gold >= 1e7, "Có 10 triệu lượng", ["lucky_v", 12]],
    [
      "admin",
      "Vô Song Vương Giả",
      "Đặc biệt",
      5,
      () => !!(typeof RW == "function" && RW().titles && RW().titles.admin),
      "Vòng Sáng Hoàng Kim",
      ["allres_p", 50],
      true,
    ],
    [
      "vlmc",
      "VÕ LÂM MINH CHỦ",
      "Đặc biệt",
      5,
      () => !!(typeof RW == "function" && RW().titles && RW().titles.vlmc),
      "Vòng sáng Quyền Lực - ADMIN",
      null,
      true,
    ],
    [
      "top1_btg",
      "TOP 1 BTG",
      "Boss Thế Giới",
      5,
      () => {
        const rw = typeof RW === "function" ? RW() : (S && S.rw);
        const exp = rw && rw.titleExp && rw.titleExp.top1_btg;
        if (exp && Date.now() < exp) return true;
        if (rw && rw.titles && rw.titles.top1_btg) delete rw.titles.top1_btg;
        if (rw && rw.title === "top1_btg") rw.title = "";
        return false;
      },
      "TOP 1 Sát Thương Boss Thế Giới · Hiệu lực 1 ngày (+20% Sinh Lực, +20% May Mắn)",
      [["lifemax_p", 20], ["lucky_v", 20]],
      true,
    ],
    [
      "top2_btg",
      "TOP 2-5 BTG",
      "Boss Thế Giới",
      4,
      () => {
        const rw = typeof RW === "function" ? RW() : (S && S.rw);
        const exp = rw && rw.titleExp && rw.titleExp.top2_btg;
        if (exp && Date.now() < exp) return true;
        if (rw && rw.titles && rw.titles.top2_btg) delete rw.titles.top2_btg;
        if (rw && rw.title === "top2_btg") rw.title = "";
        return false;
      },
      "TOP 2-5 Sát Thương Boss Thế Giới · Hiệu lực 1 ngày (+10% Kháng Tất Cả)",
      ["allres_p", 10],
      true,
    ],
  ],
  TITLE_BY = Object.fromEntries(TITLES.map((n) => [n[0], n])),
  titleName = (n) => (typeof n[1] == "function" ? n[1]() : n[1]),
  TT = () => {
    const n = RW();
    n.titles = n.titles || {};
    delete n.titles.bachu;
    delete n.titles.tuyetthe;
    delete n.titles.thanlong;
    if (n.titleExp) {
      const now = Date.now();
      for (const k in n.titleExp) {
        if (n.titleExp[k] && now >= n.titleExp[k]) {
          delete n.titles[k];
          delete n.titleExp[k];
          if (n.title === k) n.title = "";
        }
      }
    }
    for (const t in n.ach || {}) TITLE_BY[t] && (n.titles[t] = 1);
    return n.titles;
  };
function titleCheck(n) {
  if (!S || !S.fac) return 0;
  const t = TT();
  let h = 0;
  for (const c of TITLES)
    !t[c[0]] &&
      c[4]() &&
      ((t[c[0]] = 1),
      h++,
      !n &&
        !R.quiet &&
        (log(
          `🎖 Đạt danh hiệu <b style="color:${TIER[c[3]].c}">«${esc(titleName(c))}»</b> (${TIER[c[3]].n}) — đeo ở thẻ Nhân vật.`,
        ),
        toast("Danh hiệu mới: " + titleName(c))));
  return h;
}
const titleWorn = () => {
  const n = S && S.rw && S.rw.title,
    t = n && TITLE_BY[n];
  return t && TT()[n] ? t : null;
};
function titleAttr(n) {
  const t = titleWorn();
  if (!t || !t[6]) return;
  const isWbScene = (typeof WB !== "undefined" && WB.arena && WB.arena.on) || (typeof R !== "undefined" && R && R.dg && R.dg.kind === "worldboss");
  if (isWbScene && t[0] === "admin") return;
  if (Array.isArray(t[6][0])) {
    for (const a of t[6]) addAttr(n, a[0], [a[1], 0, 0]);
  } else {
    addAttr(n, t[6][0], [t[6][1], 0, 0]);
  }
}
function titleModal() {
  titleCheck();
  const n = TT(),
    t = titleWorn(),
    list = TITLES.filter((a) => !a[7] || n[a[0]]),
    h = [...new Set(list.map((i) => i[2]))],
    c = list.filter((i) => n[i[0]]).length,
    s = CAMP_INFO[campOf(S.fac)],
    rwObj = typeof RW === "function" ? RW() : (S && S.rw);
  if (rwObj && (rwObj.title === "bachu" || rwObj.title === "tuyetthe" || rwObj.title === "thanlong")) {
    rwObj.title = "";
  }
  modal(
    `<h3>🎖 Danh hiệu <small>${c}/${list.length}</small></h3>
    <p class="desc">Phe: <b style="color:${s.c}">${s.n}</b>. Màu tên đổi ở Đồ đệ › Màu tổ đội. Đeo 1 danh hiệu: hiện phía trên tên và cộng chỉ số. Mỗi danh hiệu có Vòng Sáng riêng. ${t ? `Đang đeo: <b style="color:${TIER[t[3]].c}">${t[0] === "admin" || t[0] === "vlmc" || t[0] === "top1_btg" ? esc(titleName(t)) : `«${esc(titleName(t))}»`}</b>` : "Chưa đeo danh hiệu."}</p>
    ${h
      .map(
        (i) =>
          `<h3>${i}</h3>` +
          list.filter((a) => a[2] === i)
            .map((a) => {
              const e = !(!n[a[0]]),
                l = t === a,
                isVlmc = a[0] === "vlmc",
                isTop1 = a[0] === "top1_btg",
                isAdm = a[0] === "admin" || isVlmc || isTop1;
              const royalCol = isVlmc ? "#ff2200" : isTop1 ? "#ffd700" : "#ffd700";
              const royalShadow = isVlmc ? "#cc0000" : isTop1 ? "#ff5500" : "#ff9900";
              const royalBorder = isVlmc ? "#ff3300" : isTop1 ? "#ffd700" : "#ffd700";
              const royalBox = isVlmc ? "rgba(255,34,0,0.4)" : isTop1 ? "rgba(255,180,0,0.35)" : "rgba(255,180,0,0.35)";
              const royalBg = isVlmc ? "linear-gradient(90deg,rgba(255,34,0,0.25),rgba(180,10,0,0.2),rgba(255,34,0,0.25))" : isTop1 ? "linear-gradient(90deg,rgba(255,215,0,0.22),rgba(180,50,0,0.18),rgba(255,215,0,0.22))" : "linear-gradient(90deg,rgba(255,180,0,0.22),rgba(180,20,0,0.18),rgba(255,180,0,0.22))";
              const royalStyle = isAdm ? `style="background:${royalBg};border:1.5px solid ${royalBorder};box-shadow:0 0 10px ${royalBox};border-radius:6px;padding:6px 8px;margin:4px 0"` : "";
              const royalTitle = isAdm ? `<b style="color:${royalCol};text-shadow:0 0 8px ${royalShadow};font-size:13px">${esc(titleName(a))}</b> <small class="dim">${TIER[a[3]].n}</small>` : `<b style="color:${e ? TIER[a[3]].c : "#777"}">«${esc(titleName(a))}»</b> <small class="dim">${TIER[a[3]].n}</small>`;
              const attrStr = a[6] ? (Array.isArray(a[6][0]) ? a[6].map((x) => attrText(x[0], [x[1], 0, 0])).join(" · ") : attrText(a[6][0], [a[6][1], 0, 0])) : "";
              let expStr = "";
              if (rwObj && rwObj.titleExp && rwObj.titleExp[a[0]]) {
                const rem = Math.max(0, rwObj.titleExp[a[0]] - Date.now());
                const rd = Math.floor(rem / 86400000);
                const rh = Math.floor((rem % 86400000) / 3600000);
                const rm = Math.floor((rem % 3600000) / 60000);
                expStr = rem > 0 ? (rd > 0 ? ` <b style="color:#ffcc00">· Còn ${rd} ngày ${rh} giờ</b>` : ` <b style="color:#ffcc00">· Còn ${rh} giờ ${rm} phút</b>`) : " <b style=\"color:#f55\">· Đã hết hạn</b>";
              }
              const btnStyle = isAdm && !l ? (isVlmc ? "background:#c92010;color:#fff;border-color:#ff2200" : "background:#c98d1a;color:#fff;border-color:#ffd700") : "";
              return `<div class="qrow${e ? "" : " lock"}" ${royalStyle}><span>${royalTitle}<small style="${isAdm ? "color:#ffe8a8" : ""}">${esc(a[5])}${attrStr ? " · " + esc(attrStr) : ""}${expStr}</small></span><small></small>
        <button class="btn sm${l ? " on" : ""}" data-tt="${a[0]}" ${e ? "" : "disabled"} style="${btnStyle}">${l ? "Tháo" : e ? "Đeo" : "Chưa đạt"}</button></div>`;
            })
            .join(""),
      )
      .join("")}`,
    () => {
      document.querySelectorAll("#mBody [data-tt]").forEach(
        (i) =>
          (i.onclick = () => {
            const a = RW();
            ((a.title = a.title === i.dataset.tt ? "" : i.dataset.tt), (R.dirty = !0), save(), refresh(), titleModal());
          }),
      );
    },
  );
}
