"use strict";
let curTab = "log",
  invDirty = !0;
function log(n) {
  R.quiet || (R.logs.unshift(n), R.logs.length > 150 && R.logs.pop(), (R.logDirty = !0));
}
let toastT;
function toast(n) {
  const t = $("#toast");
  ((t.textContent = n),
    t.classList.add("on"),
    clearTimeout(toastT),
    (toastT = setTimeout(() => t.classList.remove("on"), 1800)));
}
function modal(n, t, e) {
  (($("#mBody").innerHTML = n),
    $("#modal").classList.remove("hidden"),
    ($("#modal").dataset.locked = e ? "1" : ""),
    t && t(),
    // opened for a disciple (js/party.js): its buttons act on that disciple
    typeof PCTX < "u" && PCTX && typeof pModalCtx == "function" && pModalCtx(PCTX));
  try {
    $("#modal .mbox").focus({ preventScroll: !0 });
  } catch {}
}
function closeModal(n) {
  ($("#modal").dataset.locked && !n) || $("#modal").classList.add("hidden");
}
const FUSE_KEEP = 6;
function isJunk(n) {
  if (
    (typeof dtNeed == "function" && dtNeed(n)) ||
    (S.lootF && S.lootF.pickAll && lootMatch(n)) ||
    (n.set && !n.lock && !n.plv && setKept(n), n.set || n.vio || n.plv || n.lock || n.thanma)
  )
    return !1;
  if (!sexOk(n)) return !0;
  const t = FAC[S.fac];
  if (DETAIL_SLOT[n.d] === "weapon" && t && !weaponFits(n)) return !0;
  const e = S.eq[slotFor(n)];
  return !(
    !e ||
    betterThanEquipped(n) ||
    itemPower(n) > itemPower(e) * 0.85 ||
    (FUSE_SLOTS.includes(n.d) && S.inv.filter((s) => FUSE_SLOTS.includes(s.d) && !s.set && !s.vio).length < FUSE_KEEP)
  );
}
function sweepJunk() {
  if (S.autoJunk === !1) return 0;
  let n = 0;
  for (let t = 0; t < INV_MAX; t++) {
    const e = S.inv.filter(isJunk).sort((s, a) => itemPower(s) - itemPower(a))[0];
    if (!e) break;
    (S.inv.splice(S.inv.indexOf(e), 1), (S.gold += itemValue(e)), n++);
  }
  return (n && (invDirty = !0), n);
}
function addItem(n, t, e, s) {
  if (typeof eqBanned == "function" && eqBanned(n))
    return (t || log(`<span class="dim">${esc(n.n)}: đồ đã xóa khỏi game</span>`), !1);
  if (typeof eqRemoved == "function" && eqRemoved(n)) {
    const a = itemValue(n);
    return (
      (S.gold += a),
      t || log(`<span class="dim">${esc(n.n)} (đồ đã bỏ khỏi game) đổi thành ${fmtL(a)} lượng</span>`),
      !1
    );
  }
  return typeof epAutoStore == "function" && epAutoStore(n)
    ? ((invDirty = !0), !0)
    : !e && !lootMatch(n)
      ? ((S.gold += itemValue(n)), !1)
      : (S.inv.length >= INV_MAX && (n.set || n.vio || n.plv) && makeRoom(n, !0),
        S.inv.length >= INV_MAX
          ? ((S.gold += itemValue(n)), t || log('<span class="dim">Túi đầy, tự bán ' + esc(n.n) + "</span>"), !1)
          : !s && S.autoJunk !== !1 && isJunk(n)
            ? ((S.gold += itemValue(n)), !1)
            : (S.inv.unshift(n),
              (invDirty = !0),
              recItem(n),
              typeof dtItemGot == "function" && dtItemGot(n),
              !t && n.r >= 2 && log(`Nhặt được <span style="color:${RAR_COL[n.r]}">${esc(n.n)}</span>`),
              S.autoEquip && betterThanEquipped(n) && equip(n, !0),
              !0));
}
function equipGain(n) {
  if (!reqOk(n)) return -1;
  const t = Object.assign({}, S.eq);
  return ((t[slotFor(n)] = n), power(calc(t)) / Math.max(1, power(calc(S.eq))) - 1);
}
function betterThanEquipped(n) {
  const t = FAC[S.fac];
  return DETAIL_SLOT[n.d] === "weapon" && t && !weaponFits(n) ? !1 : equipGain(n) > 0.01;
}
function equip(n, t) {
  if (!reqOk(n)) {
    t || toast("Chưa mặc được: " + reqProblems(n).join("; "));
    return;
  }
  const e = slotFor(n),
    s = S.eq[e];
  ((S.inv = S.inv.filter((a) => a !== n)),
    s && S.inv.unshift(s),
    (S.eq[e] = n),
    (R.dirty = !0),
    (invDirty = !0),
    t || uiSfx(n.d <= 1 ? "equipWeapon" : "equipCloth"),
    t || (closeModal(), refresh()));
}
function unequip(n) {
  const t = S.eq[n];
  if (t) {
    if (S.inv.length >= INV_MAX) {
      toast("Túi đầy");
      return;
    }
    (delete S.eq[n], S.inv.unshift(t), (R.dirty = !0), (invDirty = !0), closeModal(), refresh());
  }
}
const sellProtected = (n) =>
  !!((n.set && setKept(n)) || n.vio || n.plv || n.lock || n.thanma || (typeof dtNeed == "function" && dtNeed(n)));
function sellUnmatched() {
  const n = S.inv.filter((e) => !lootMatch(e) && !sellProtected(e));
  let t = 0;
  for (const e of n) t += itemValue(e);
  return (
    (S.gold += t),
    (S.inv = S.inv.filter((e) => !n.includes(e))),
    (invDirty = !0),
    { n: n.length, gold: t, kept: S.inv.filter((e) => !lootMatch(e)).length }
  );
}
function sell(n) {
  if (!S.inv.includes(n)) {
    closeModal();
    return;
  }
  if (n.lock) {
    toast("Món đã khóa: mở khóa trước khi bán");
    return;
  }
  ((S.inv = S.inv.filter((t) => t !== n)), (S.gold += itemValue(n)), (invDirty = !0), closeModal(), refresh());
}
function findItem(n) {
  return (
    (n = +n),
    S.inv.find((t) => t.uid === n) ||
      (S.stable || []).find((t) => t.uid === n) ||
      Object.values(S.eq).find((t) => t && t.uid === n) ||
      (R.ground.find((t) => t.it.uid === n) || {}).it
  );
}
function itemCell(n) {
  return n
    ? `<button class="it r${n.r}${reqOk(n) ? "" : " bad"}" data-uid="${n.uid}"${reqOk(n) ? "" : ` title="${esc("Chưa mặc được: " + reqProblems(n).join("; "))}"`}>${n.ic ? `<img src="${esc(n.ic)}" alt="">` : ""}<i>${n.lvl}</i>${typeof isUpgrade == "function" && S.inv.includes(n) ? (isUpgrade(n) ? '<u class="up" title="Mạnh hơn đồ đang mặc">▲</u>' : isPotential(n) ? `<u class="up pot" title="Cường hóa lên +${enhGain(n).enh} thì mạnh hơn đồ đang mặc">△</u>` : "") : ""}${n.s >= 0 ? `<b class="s5" style="background:${SERIES_COL[n.s]}"></b>` : ""}${betterThanEquipped(n) && S.inv.includes(n) ? "<em>▲</em>" : ""}${n.lock ? '<u class="lk">🔒</u>' : typeof dtNeed == "function" && S.inv.includes(n) && dtNeed(n) ? '<u class="lk" title="Giữ để trả Dã Tẩu">📜</u>' : ""}${n.enh ? `<u class="en">+${n.enh}</u>` : ""}</button>`
    : "";
}
function itemHTML(n) {
  return `<div class="idet"><div class="pic r${n.r}">${n.ic ? `<img src="${esc(n.ic)}" alt="">` : ""}</div><div><h4 style="color:${RAR_COL[n.r]}">${esc(n.n)}${n.enh ? ` <span class="enh">+${n.enh}</span>` : ""}${n.vio ? ` <small class="vtag">Tím ${(n.mag || []).length}/${VIO_SLOTS}</small>` : ""}</h4>
  <small class="dim">${esc(J.items[n.d].n)} · cấp ${n.lvl}${n.s >= 0 ? ` · <span style="color:${SERIES_COL[n.s]}">hệ ${SERIES[n.s]}</span>` : ""}</small></div></div>
  <div class="sl">${itemLines(n)
    .map(([t, e, s]) => `<div class="${t}"${s ? ` style="color:${s}"` : ""}>${esc(e)}</div>`)
    .join("")}</div>`;
}
function fixReqPoints(n) {
  const t = reqDeficit(n),
    e = Object.values(t).reduce((s, a) => s + a, 0);
  if (!e) return !1;
  if (S.attrPts < e) return (toast(`Cần ${e} điểm tiềm năng, đang có ${S.attrPts}`), !1);
  for (const s in t) ((S.attr[s] += t[s]), (S.attrPts -= t[s]));
  return ((R.dirty = !0), recalc(), toast("Đã cộng điểm để đủ điều kiện"), !0);
}
function cmpLines(n, t) {
  if (t) return "";
  const e = reqOk(n),
    s = equipCompare(n, !e),
    a = (p) => (p > 5e-4 ? "cp" : p < -5e-4 ? "cn" : "dim"),
    c = (p, h, l) => `<span class="${a(h)}">${p} ${l}</span>`,
    i = e ? "So với đang mặc" : "Nếu đủ điều kiện, so với đang mặc",
    d = e ? [] : reqProblems(n),
    u = DETAIL_SLOT[n.d] === "weapon" && FAC[S.fac] && !weaponFits(n),
    m = Object.values(reqDeficit(n)).reduce((p, h) => p + h, 0),
    o = d.length > 0 && d.length === Object.keys(reqDeficit(n)).length;
  return `<div class="cmp2"><small class="dim">${i}:</small><div class="cmpv">${c("Sức mạnh", s.gain, pctTxt(s.gain))} ${c("DPS", s.dps, pctTxt(s.dps))} ${c("Sinh lực", s.life, numTxt(s.life))} ${c("Né", s.def, numTxt(s.def))} ${c("Kháng TB", s.res, numTxt(s.res) + "%")}</div>
    ${d.length ? `<div class="reqbad"><b>Chưa mặc được, thiếu:</b><br>${d.map(esc).join("<br>")}${o ? `<br><small>Cần ${m} điểm tiềm năng${S.attrPts >= m ? ` (đang có ${S.attrPts}): bấm "Cộng điểm" để đủ điều kiện` : `, đang có ${S.attrPts}: lên cấp thêm`}.</small>` : ""}</div>` : ""}
    <div class="reqnote"><b>Vì sao:</b><br>${s.why.map(esc).join("<br>")}</div>
    ${u ? '<div class="reqnote">Sai loại vũ khí của môn phái: tự mặc sẽ bỏ qua, bạn vẫn mặc tay được.</div>' : ""}</div>`;
}
function autoEquipAll() {
  if (!S.autoEquip) return 0;
  let n = 0;
  for (let t = 0; t < 14; t++) {
    let e = null,
      s = 0.01;
    for (const c of S.inv.concat(
      typeof epBox == "function" ? epBox().filter((i) => i.vio && (i.mag || []).length) : [],
    )) {
      if (!reqOk(c)) continue;
      const i = FAC[S.fac];
      if (DETAIL_SLOT[c.d] === "weapon" && i && !weaponFits(c)) continue;
      const d = equipGain(c);
      d > s && ((s = d), (e = c));
    }
    if (!e) break;
    S.inv.includes(e) || (itemRemove(e), S.inv.push(e));
    const a = S.eq[slotFor(e)];
    (equip(e, !0),
      n++,
      a &&
        a.lock &&
        !R.quiet &&
        log(
          `<span class="dim">Tự mặc đồ tốt hơn: thay <b>${esc(a.n)}</b> bằng <b>${esc(e.n)}</b> (món cũ đã khóa 🔒, ở hành trang)</span>`,
        ),
      S.inv.length > INV_MAX && typeof epBox == "function" && epBox().push(S.inv.shift()));
  }
  return (n && ((invDirty = !0), (R.dirty = !0)), n);
}
function itemModal(n, t) {
  const e = !t && S.eq[slotFor(n)],
    s = !t && typeof enhGain == "function" && !isUpgrade(n) && enhGain(n);
  modal(
    `${itemHTML(n)}${cmpLines(n, t)}${s ? `<div class="cp small">△ Cường hóa lên +${s.enh}: mạnh hơn đồ đang mặc ${(s.gain * 100).toFixed(1)}% · ước tính ${enhExpected(n, s.enh)} KNB</div>` : ""}${e ? `<div class="cmp"><small class="dim">Đang mặc:</small>${itemHTML(e)}</div>` : ""}
    <div class="btnrow">${t ? '<button class="btn" id="bUn">Tháo</button>' : `<button class="btn" id="bEq" ${reqOk(n) ? "" : "disabled"}>Trang bị</button>${!reqOk(n) && Object.keys(reqDeficit(n)).length && reqProblems(n).length === Object.keys(reqDeficit(n)).length ? '<button class="btn" id="bReqPts">Cộng điểm</button>' : ""}<button class="btn red" id="bSell" ${n.lock ? "disabled" : ""}>Bán (${fmt(itemValue(n))})</button>${S.inv.includes(n) ? '<button class="btn" id="bStashIt">Gửi kho</button>' : ""}${S.inv.includes(n) && typeof partyN == "function" && partyN() ? '<button class="btn" id="bGive">Chuyển cho…</button>' : ""}${S.inv.includes(n) && n.d === 10 ? '<button class="btn" id="bStable">Cất vào Mã Trường</button>' : ""}`}${findItem(n.uid) && n.d <= 10 ? '<button class="btn" id="bForge">Rèn đồ</button>' : ""}${owned(n) ? `<button class="btn" id="bLock">${n.lock ? "🔓 Mở khóa" : "🔒 Khóa"}</button>` : ""}</div>`,
    () => {
      const a = $("#bEq"),
        c = $("#bSell"),
        i = $("#bUn"),
        d = $("#bForge"),
        u = $("#bStable");
      u &&
        (u.onclick = () => {
          const h = stableIn(n);
          (toast(h.msg), h.ok && (closeModal(), refresh()));
        });
      const g = $("#bGive");
      g && (g.onclick = () => invGiveModal(n));
      const m = $("#bStashIt");
      m &&
        (m.onclick = () => {
          const h = stashDeposit(n);
          (toast(h.msg), h.ok && (closeModal(), refresh()));
        });
      const o = $("#bReqPts");
      o &&
        (o.onclick = () => {
          fixReqPoints(n) && (reqOk(n) ? equip(n) : itemModal(n, t));
        });
      const p = $("#bLock");
      (p &&
        (p.onclick = () => {
          ((n.lock = !n.lock),
            n.lock || delete n.lock,
            (invDirty = !0),
            save(),
            toast(n.lock ? "Đã khóa: không tự bán, không hợp Huyền Tinh" : "Đã mở khóa"),
            itemModal(n, t));
        }),
        a && (a.onclick = () => equip(n)),
        c && (c.onclick = () => sell(n)),
        i && (i.onclick = () => unequip(t)),
        d && (d.onclick = () => forgeModal(n)));
    },
  );
}
function seriesMix(n) {
  return zoneSeries(n)
    .map((e, s) => (e ? `<span style="color:${SERIES_COL[s]}">${SERIES[s]} ${e}</span>` : ""))
    .filter(Boolean)
    .join(" · ");
}
function seriesDots(n) {
  return zoneSeries(n)
    .map((e, s) => ('<i class="sdot" style="background:' + SERIES_COL[s] + '"></i>').repeat(e))
    .join("");
}
function renderLog() {
  const n = zoneOf(Math.min(S.stage, STAGES)),
    t = ZONES.map((s, a) => {
      const c = zoneOpen(a),
        i = zoneIdx(Math.min(S.stage, STAGES)) === a,
        d = ZALT[a],
        u = (S.zalt || {})[a] || 0,
        m = (d && u && d[u - 1]) || s,
        o =
          d && c
            ? `<div class="zalt">${[s]
                .concat(d)
                .map((p, h) => `<button class="chip2${h === u ? " on" : ""}" data-za="${a}:${h}">${esc(p.n)}</button>`)
                .join("")}</div>`
            : "";
      return `<button class="zrow${i ? " cur" : ""}${c ? "" : " lock"}" data-z="${a}" ${c ? "" : "disabled"}><b>${esc(m.n)}</b><span>${seriesDots(m)} Cấp ${s.lo}–${s.hi}${d ? ` · ${d.length + 1} bản đồ` : ""}</span></button>${o}`;
    }).join("");
  (($("#t-log").innerHTML =
    `${todoHTML()}${modeCard(n)}<div class="card"><div><small class="dim">Quái hệ: ${seriesMix(n)}${FAC[S.fac] ? ` · bạn hệ <span style="color:${SERIES_COL[heroSeries()]}">${SERIES[heroSeries()]}</span>: khắc <span style="color:${SERIES_COL[KHAC[heroSeries()]]}">${SERIES[KHAC[heroSeries()]]}</span> (+10%), bị <span style="color:${SERIES_COL[+Object.keys(KHAC).find((s) => KHAC[s] === heroSeries())]}">${SERIES[+Object.keys(KHAC).find((s) => KHAC[s] === heroSeries())]}</span> khắc (−10%)` : ""}</small></div>
    ${buffText() ? `<div class="small">${buffText()}</div>` : ""}</div>
    <div class="log" id="logBox">${R.logs.map((s) => `<div>${s}</div>`).join("")}</div>
    <h3>Bản đồ luyện công <small>chạm để chọn bãi (tắt tự đổi theo cấp)</small></h3><div class="zlist">${t}</div>`),
    bindTodo(),
    bindModeCard());
  const e = (s) => {
    ((S.mode === "quest" || S.mode === "dg") &&
      ((S.mode = "farm"), log("⚔ Chọn bãi luyện công: chuyển sang chế độ Luyện công.")),
      (S.autoMap = !1),
      gotoZone(s, "Chọn bãi luyện công"),
      save(),
      refresh());
  };
  (document.querySelectorAll(".zrow").forEach((s) => (s.onclick = () => e(+s.dataset.z))),
    document.querySelectorAll("[data-za]").forEach(
      (s) =>
        (s.onclick = () => {
          const [a, c] = s.dataset.za.split(":").map(Number);
          (((S.zalt || (S.zalt = {}))[a] = c),
            zoneIdx(Math.min(S.stage, STAGES)) === a
              ? ((S.wave = 1), (R.enemies = []), (R.spawnT = 0.3), (R.zoneShown = null))
              : e(a),
            save(),
            refresh());
        }),
    ));
}
function renderLogOnly() {
  const n = $("#logBox");
  n && (n.innerHTML = R.logs.map((t) => `<div>${t}</div>`).join(""));
}
const ATTR_VI = { str: "Sức mạnh", dex: "Thân pháp", vit: "Sinh khí", eng: "Nội công" };
function renderChar() {
  const n = R.P,
    t = FAC[S.fac],
    e = Object.values(S.eq).filter((o) => o && !reqOk(o)),
    s = calc({}),
    a = { life: Math.round(n.life - s.life), mana: Math.round(n.mana - s.mana) },
    c = SLOTS.map(
      ([o, p]) => `<div class="slot" data-slot="${o}">${S.eq[o] ? itemCell(S.eq[o]) : `<span>${p}</span>`}</div>`,
    ).join(""),
    i = Object.keys(ATTR_VI)
      .map(
        (o) =>
          `<div class="attr"><span>${ATTR_VI[o]}</span><b>${Math.round(n[o])}</b><span class="pm"><button class="plus" data-a="${o}" ${S.attrPts ? "" : "disabled"}>+</button><button class="minus" data-a="${o}" title="Rút lại 1 điểm" ${S.attr[o] > 0 ? "" : "disabled"}>−</button></span></div>`,
      )
      .join(""),
    d = ELEM.map((o) => `<span>Kháng ${ELEM_VI[o]}</span><span>${Math.round(n.res[o])}%</span>`).join("");
  (($("#t-char").innerHTML =
    `<div class="card"><b style="color:${SERIES_COL[t.series]}">${esc(t.n)}</b> · hệ ${SERIES[t.series]} · Cấp ${S.lvl}${rebornN() ? ` <small class="cp">chuyển sinh ${rebornN()} · mặc đồ như cấp ${eqLevel()}</small>` : ""}<br><small class="dim">Lực tay trái ${lucTay(n.basic)} · Lực tay phải ${lucTay(n.main)}</small> <button class="btn sm" id="bTitle">🎖 Danh hiệu</button> <button class="btn sm${hasRealName() ? "" : " on"}" id="bName">${hasRealName() ? "✏ " + esc(S.name) : "✏ Đặt tên"}</button> <button class="btn sm${S.lvl >= REBORN_LV && RW().stat.reborn < REBORN_MAX ? " on" : ""}" id="bReb">Chuyển sinh</button><button class="btn sm" id="bDuBi" title="Dự Bị: Chọn đồ đệ tham gia xuất chiến hoặc tạm nghỉ">👥 Dự Bị</button>${matHave("misc", "ldp") > 0 ? ` <button class="btn sm on" id="bDoiPhai">Đổi phái (${matHave("misc", "ldp")})</button>` : ""}</div>
    <div class="eqgrid">${c}</div>${e.length ? `<div class="reqbad"><b>⚠ ${e.length} món đang mặc chưa đủ điều kiện, không được cộng chỉ số:</b><br>${e.map((o) => `${esc(o.n)}: ${esc(reqProblems(o).join("; "))}`).join("<br>")}</div>` : ""}
    <p class="dim small">Dòng ẩn (2, 4, 6) của mỗi món mở khi hệ nhân vật hoặc 2 món liên kết <b>tương sinh</b> với hệ món đó (Kim→Thủy→Mộc→Hỏa→Thổ→Kim). Đang mở: ${
      SLOTS.filter(([o]) => S.eq[o] && S.eq[o].mag.length > 1)
        .map(([o, p]) => `${p} ${hiddenActive(S.eq[o])}/${Math.floor(S.eq[o].mag.length / 2)}`)
        .join(" · ") || "—"
    }</p>
    <h3>Tiềm năng <small>${S.attrPts} điểm</small> <button class="btn sm" id="bSugAt">Gợi ý</button> <button class="btn sm" id="bTTa">Tẩy Tủy</button></h3><div class="card">${i}</div>
    <h3>Chỉ số</h3><div class="card stats">
      <span>Sinh lực</span><span>${fmt(n.life)}${a.life ? ` <small class="cp">(trang bị +${fmt(a.life)})</small>` : ""}</span><span>Nội lực</span><span>${fmt(n.mana)}${a.mana ? ` <small class="cp">(+${fmt(a.mana)})</small>` : ""}</span>
      ${
        n.plusSkill || Object.keys(n.skAdd || {}).length
          ? `<span>Kỹ năng từ trang bị</span><span class="cp">${n.plusSkill ? `Tất cả +${n.plusSkill}` : ""}${Object.entries(
              n.skAdd || {},
            )
              .map(([o, p]) => ` · ${SK[o] ? esc(SK[o].n) : o} +${p}`)
              .join("")}</span>`
          : ""
      }
      <span>Sát thương vũ khí</span><span>${Math.round(n.wmin)}–${Math.round(n.wmax)}</span>
      <span>Chiêu chính</span><span>${esc(n.main.n)} (${fmt(n.main.tot)})</span>
      <span>Chính xác</span><span>${Math.round(n.ar)}</span><span>Né tránh</span><span>${Math.round(n.def)}</span>
      <span>Chí mạng</span><span>${Math.round(n.main.crit)}%</span><span>Tốc độ đánh</span><span>${n.aspd.toFixed(2)}</span>${d}</div>${typeof ptCampHTML == "function" ? ptCampHTML() : ""}`),
    ($("#bTTa").onclick = tayTuyModal),
    document.querySelectorAll("#t-char .plus").forEach((o) => (o.onclick = () => attrAddModal(o.dataset.a))),
    ($("#bTitle").onclick = () => titleModal()),
    ($("#bName").onclick = () => nameModal()),
    ($("#bReb").onclick = rebornModal),
    ($("#bDuBi") && ($("#bDuBi").onclick = () => (typeof duBiModal == "function" ? duBiModal() : null))));
  const u = $("#bDoiPhai");
  (u && (u.onclick = doiPhaiModal),
    ($("#bSugAt").onclick = suggestModal),
    document.querySelectorAll("#t-char .minus").forEach((o) => (o.onclick = () => unspendAttr(o.dataset.a))),
    typeof ptCampBind == "function" && ptCampBind($("#t-char")),
    document
      .querySelectorAll("#t-char .slot .it")
      .forEach(
        (o) =>
          (o.onclick = () =>
            o.parentNode.dataset.slot === "horse"
              ? horsePickModal()
              : itemModal(findItem(o.dataset.uid), o.parentNode.dataset.slot)),
      ));
  const m = document.querySelector('#t-char .slot[data-slot="horse"]');
  m && !S.eq.horse && (m.onclick = () => horsePickModal());
}
function unlearnSkill(n) {
  const t = S.sk[n] || 0;
  if (!t) return !1;
  const e = SK[n].tier === 90 && !isBr90(n);
  return (
    t <= 1 || e ? delete S.sk[n] : (S.sk[n] = t - 1),
    e || S.skPts++,
    !S.sk[n] && S.main === n && (S.mainLock = !1),
    (R.dirty = !0),
    recalc(),
    fillSlots(),
    renderSkill(),
    renderPad(),
    updateDots(),
    save(),
    toast(`Rút 1 điểm: ${SK[n].n} ${S.sk[n] || 0}/${SK[n].max}`),
    !0
  );
}
function attrAddModal(n) {
  if (!S.attrPts) return;
  const t = S.attrPts;
  modal(
    `<h3>Cộng tiềm năng: ${esc(ATTR_VI[n])}</h3><div class="small">Còn <span style="color:#ffd24a;font-weight:bold">${t}</span> điểm · hiện ${Math.round(R.P[n])}</div>
    <div class="btnrow"><input type="number" id="apN" min="1" max="${t}" value="${t}" style="width:110px;font-size:16px;padding:4px 6px"></div>
    <div class="btnrow">${[1, 10, 50, 100]
      .filter((e) => e < t)
      .map((e) => `<button class="btn sm" data-apq="${e}">${e}</button>`)
      .join("")}<button class="btn sm" data-apq="${t}">Tất cả (${t})</button></div>
    <div class="btnrow"><button class="btn on" id="apOk">Cộng</button><button class="btn" id="apNo">Hủy</button></div>`,
    () => {
      const e = $("#apN"),
        s = () => {
          const a = clamp(Math.floor(+e.value || 0), 0, S.attrPts);
          (a > 0 &&
            ((S.attrPts -= a),
            (S.attr[n] += a),
            (R.dirty = !0),
            recalc(),
            updateDots(),
            save(),
            toast(`+${a} ${ATTR_VI[n]}`)),
            closeModal(!0),
            renderChar());
        };
      (e.focus(),
        e.select(),
        (e.onkeydown = (a) => {
          a.key === "Enter" && s();
        }),
        document.querySelectorAll("#mBody [data-apq]").forEach(
          (a) =>
            (a.onclick = () => {
              ((e.value = a.dataset.apq), e.focus());
            }),
        ),
        ($("#apOk").onclick = s),
        ($("#apNo").onclick = () => closeModal(!0)));
    },
  );
}
function unspendAttr(n) {
  return S.attr[n] > 0
    ? (S.attr[n]--, S.attrPts++, (R.dirty = !0), recalc(), renderChar(), updateDots(), save(), !0)
    : !1;
}
const SK_HIDE = /^(skill_attackradius|missle_|skill_cost_v|skill_eventskilllevel|addskilldamage|skill_)/;
function skillEffectLines(n, t) {
  const e = [];
  for (const a in n.attr) {
    if (SK_HIDE.test(a) || !J.attrDesc[a]) continue;
    const c = skVal(n, a, t);
    if (!c) continue;
    const i =
      attrText(a, c) + (a === "dynamicmagicshield_v" ? ` (tối đa ${Math.round(DMG_SHIELD_MAX * 100)}% mỗi đòn)` : "");
    i && !/^\s*$/.test(i) && e.push(i);
  }
  const s = new Set();
  for (const a in n.attr)
    if (a.startsWith("addskilldamage")) {
      const c = skVal(n, a, t);
      if (!c || !c[2]) continue;
      const i = supTargetName(+c[0], n);
      if (!i || s.has(i)) continue;
      (s.add(i), e.push(`Tăng sát thương ${i}: +${c[2]}%`));
    }
  return e;
}
const SK15_N = {
    1055: "Kim Cang Chưởng",
    1056: "Vi Đà Hiến Chử",
    1057: "Tam Giới Quy Thiền",
    1058: "Hào Hùng Trảm",
    1059: "Tung Hoành Bát Hoang",
    1060: "Bá Vương Tạm Kim",
    1061: "Kiếm Hoa Vãn Tinh",
    1062: "Băng Vũ Lạc Tinh",
    1063: "Băng Tước Việt Chi",
    1065: "Thủy Ánh Mạn Tú",
    1066: "Hình Tiêu Cốt Lập",
    1067: "U Hồn Phệ Ảnh",
    1069: "Vô Ảnh Xuyên",
    1070: "Thiết Liên Tứ Sát",
    1071: "Càn Khôn Nhất Trịch",
    1073: "Thời Thừa Lục Long",
    1074: "Bổng Huýnh Lược Địa",
    1075: "Giang Hải Nộ Lan",
    1076: "Tật Hỏa Liêu Nguyên",
    1078: "Tạo Hóa Thái Thanh",
    1079: "Kiếm Thùy Tinh Hà",
    1080: "Cửu Thiên Cương Phong",
    1083: "Long Thừa Bát Nhã Thủ",
    1091: "Lưu Phong Hồi Tuyết Băng Trụ",
    1108: "Phong Minh Ngọc Toái",
    1109: "Lôi Động Càn Khôn",
  },
  SK15_PART = {
    1084: 1058,
    1086: 1058,
    1087: 1059,
    1088: 1060,
    1094: 1066,
    1096: 1066,
    1099: 1071,
    1100: 1071,
    1101: 1073,
  },
  SK15_EV = {
    1064: ["Băng Ngưng Hàn Yên", 1063],
    1085: ["Vạn Vật Đế Quy Nhất", 1057],
    1093: ["Khinh Sa Phù Thủy", 1065],
    1095: ["Hồn Ảnh Tùng Sinh", 1067],
    1097: ["Truy Tâm Tỏa Mệnh", 1069],
    1107: ["Kiếm Minh Thương Khung", 1079],
  },
  SUB_OF = (() => {
    const n = {};
    for (const t in EV2) {
      const e = EV2[t];
      (e.sid && (n[e.sid] = [e.n, +t, 2]), e.at16 && e.at16.sid && (n[e.at16.sid] = [e.at16.n, +t, 3]));
    }
    return n;
  })();
function supTargetName(n, t) {
  const e = SUB_OF[n];
  if (e && SK[e[1]]) return `${e[0]} (tầng ${e[2]} ${SK[e[1]].n})`;
  if (n >= 1e3) return null;
  const s = SK[n];
  if (!s || /\(##\)/.test(s.n) || (t.f && s.f && s.f !== t.f)) return null;
  const a = Object.values(SK).find((c) => c.child === n && c.f === t.f && c.id !== n);
  return a ? a.n : s.req > 0 || s.f ? s.n : null;
}
function skillSupport(n) {
  const t = [];
  for (const e in SK) {
    const s = SK[e];
    if (!(!s.attr || (s.f && s.f !== SK[n].f))) {
      for (const a in s.attr)
        if (a.startsWith("addskilldamage")) {
          const c = S.sk[e] ? S.sk[e] + skillBonusLv(+e) : 0,
            i = skVal(s, a, Math.max(1, c));
          if (!i || !i[2] || /\(##\)/.test(s.n) || s.req <= 0) continue;
          const d = SUB_OF[+i[0]];
          +i[0] == +n
            ? t.push([s.n, c, c ? i[2] : 0, i[2]])
            : d && d[1] === +n && t.push([s.n + ` → ${d[0]} (tầng ${d[2]})`, c, c ? i[2] : 0, i[2], !0]);
        }
    }
  }
  return t;
}
function skillModal(n) {
  const t = SK[n];
  if (!t) return;
  const e = S.sk[n] || 0,
    s = e ? skillBonusLv(n) : 0,
    a = e + s,
    c = isAttack(t),
    i = Math.max(1, a),
    d = e < t.max ? a + 1 : 0,
    u = (o) =>
      skillEffectLines(t, o)
        .map((p) => `<div>${esc(p)}</div>`)
        .join("") || '<div class="dim">—</div>';
  let m = "";
  if (c) {
    const o = activeInfo(R.P, t, i + 0);
    m = `<div class="card stats"><span>Sát thương mỗi đòn</span><span>${fmt(o.tot)}</span><span>DPS ước tính</span><span>${fmt(o.dps)}</span><span>${o.costLife ? "Sinh lực" : "Nội lực"} tiêu hao</span><span>${Math.round(o.cost)}</span><span>Hút sinh lực / nội lực</span><span>${o.wpn ? "Có (trang bị)" : "Không (trang bị)"}${o.skLeech || o.skMLeech ? ` · chiêu: ${o.skLeech ? `+${o.skLeech}% sinh lực` : ""}${o.skLeech && o.skMLeech ? ", " : ""}${o.skMLeech ? `+${o.skMLeech}% nội lực` : ""}` : ""}</span><span>Tầm đánh</span><span>${Math.round(o.rad)}</span></div>`;
  }
  modal(
    `<h3>${esc(t.n)} <small>${e}/${t.max}${s ? ` <span class="cp">+${s} từ trang bị → cấp ${a}</span>` : ""}</small></h3>
    <p class="desc">${esc(t.d || "Không có mô tả.")}</p>
    <div class="idet">${c ? '<span class="tag attack">Tấn công</span>' : skStateTag(t)}${skEqt(t) !== null ? `<small class="${skWOk(t) ? "dim" : "reqbad"}">Vũ khí: ${EQT_VI[skEqt(t)]}</small> · ` : ""}<small class="dim">${t.tier === 90 && rebornN() > 0 ? "Đã chuyển sinh: không cần cấp" : `Yêu cầu cấp ${t.req}${S.lvl < t.req ? ` (bạn cấp ${S.lvl})` : ""}`} · ${t.tier === 90 ? (typeof SK9_BRANCH < "u" && SK9_BRANCH[t.id] ? "Võ công 90: cộng 1 điểm để học · " + sk9Text(t.id) : "Võ công 90") : `cộng tối đa cấp ${skCap(t)} ở cấp nhân vật hiện tại`}</small></div>${t.tier === 90 && e ? (sk9BarHTML(n, "d") || `<p class="desc" style="color:#7fd0b0">${sk9Text(n)}</p>`) : ""}
    ${m}${
      c
        ? (() => {
            const o = skillSupport(n);
            return o.length
              ? `<div class="sl"><b>Chiêu hỗ trợ <small class="cp">+${o.filter((h) => !h[4]).reduce((h, l) => h + l[2], 0)}% sát thương</small></b>${o.map((h) => `<div class="${h[1] ? "" : "dim"}">${esc(h[0])} ${h[1] ? `cấp ${h[1]}: +${h[2]}%` : `(chưa học, cấp 1: +${h[3]}%)`}</div>`).join("")}</div>`
              : "";
          })()
        : ""
    }
    <div class="sl"><b>${a ? "Cấp hiện tại " + a : "Nếu học (cấp 1)"}</b>${u(i)}</div>
    ${d && a ? `<div class="sl"><b>Cấp kế tiếp ${d}</b>${u(d)}</div>` : ""}
    <div class="btnrow">${c && a ? '<button class="btn" id="skMain">Chọn làm chiêu chính</button>' : ""}<button class="btn" id="skPlus" ${canLearn(t) ? "" : "disabled"}>+ Cộng điểm</button><button class="btn red" id="skMinus" ${a ? "" : "disabled"}>− Rút điểm</button></div>`,
    () => {
      bindSkState($("#mBody"));
      const o = $("#skMain");
      (o &&
        (o.onclick = () => {
          ((S.main = t.id),
            (S.mainLock = !0),
            (R.dirty = !0),
            recalc(),
            renderSkill(),
            toast("Chiêu chính: " + t.n),
            skillModal(n));
        }),
        ($("#skPlus").onclick = () => {
          canLearn(t) && (skLearn(n), uiSfx("learn"), (R.dirty = !0), recalc(), renderSkill(), save(), skillModal(n));
        }),
        ($("#skMinus").onclick = () => {
          unlearnSkill(n) && skillModal(n);
        }));
    },
  );
}
function basicCard() {
  const n = R.P && R.P.basic;
  if (!n) return "";
  const t = S.eq.weapon,
    e = S.mainLock && S.main === "basic",
    s = R.P.main === n,
    a = t ? (R.P.ranged ? "Ám khí / tầm xa" : "Binh khí cận chiến") : "Quyền cước (tay không)";
  return `<div class="skl${s ? " main" : ""}" id="basicSk"><img class="sic" src="img/s/8.png" alt=""><div class="info"><b>Đánh thường</b> <span class="tag attack">Tấn công</span>
    <small>${a} · ~${fmt(Math.round(n.tot))} sát thương / đòn · ${n.rate.toFixed(2)} đòn/giây · tầm ${n.rad} · 0 nội lực</small></div>
    <span class="pm"><button class="btn sm${e ? " on" : ""}" id="bBasic">${e ? "Đang khóa" : "Dùng làm chiêu chính"}</button></span></div>`;
}
function renderSkill() {
  const n = FAC[S.fac];
  if (n.novice) {
    const a = FACTIONS.filter((c) => c.series === n.series);
    (($("#t-skill").innerHTML =
      `<h3>Vô Môn Phái <small>${S.skPts} điểm kỹ năng</small></h3><div class="card"><p class="desc">Chưa có võ công. Đạt <b>cấp ${NOVICE_LV}</b> để gia nhập môn phái hệ <b style="color:${SERIES_COL[n.series]}">${SERIES[n.series]}</b>: ${a.map((c) => (facAllowed(c, S.sex) ? esc(c.n) : `<s>${esc(c.n)}</s>`)).join(", ")}. Điểm kỹ năng nhận được trước đó được giữ lại.</p><div class="btnrow"><button class="btn" id="bJoin" ${S.lvl >= NOVICE_LV ? "" : "disabled"}>Gia nhập môn phái${S.lvl >= NOVICE_LV ? "" : ` (cấp ${S.lvl}/${NOVICE_LV})`}</button></div></div>`),
      ($("#bJoin").onclick = joinModal));
    return;
  }
  const t = n.skills
    .map((a) => {
      const c = SK[a],
        i = S.sk[a] || 0,
        d = isAttack(c),
        u = i ? skillBonusLv(a) : 0,
        m = d && i ? activeInfo(R.P, c, i + u) : null;
      return `<div class="skl${skReqOk(c) ? "" : " lock"}${R.P.main.id === +a ? " main" : ""}" data-id="${a}">
      <img class="sic" src="${esc(c.ic || "")}" alt=""><div class="info"><b>${esc(c.n)}</b>${c.book && !bookOk(c) ? ' <small class="reqbad">cần Mật Tịch</small>' : ""}${c.tier === 90 && i && i < c.max && matHave("misc", "dtbk") > 0 ? ` <button class="btn sm" data-dt="${a}">📕</button>` : ""}${c.tier === 90 ? sk9BarHTML(a, "r") : ""}</div>
      <span class="lvl">${u ? `<b class="skb" title="Cấp hiệu lực = ${i} + ${u} từ trang bị">${i + u}</b><small>/${c.max} (${i}+${u})</small>` : `${i}/${c.max}`}</span><span class="pm"><button class="plus" data-id="${a}" title="Cộng 1 điểm" ${canLearn(c) ? "" : "disabled"}>+</button><button class="minus" data-id="${a}" title="Rút lại 1 điểm" ${i > 0 ? "" : "disabled"}>−</button><button class="skinfo" data-id="${a}" title="Thông tin kỹ năng">i</button></span>
      </div>`;
    })
    .join("");
  (($("#t-skill").innerHTML =
    `<h3>${esc(n.n)} <small>${S.skPts} điểm kỹ năng</small> <button class="btn sm" id="bSugSk">Gợi ý</button> <button class="btn sm" id="bTT">Tẩy Tủy</button></h3><div class="dim small">Mật Tịch: ${Object.keys(
      BOOK_N,
    )
      .map((a) => `${BOOK_N[a].replace("Võ Lâm Mật Tịch ", "")} ×${matHave("misc", a)}`)
      .join(
        " · ",
      )} <span class="dim">(hạ trùm cấp cao, Dã Tẩu, Sát Thủ, Kỳ Trân Các)</span> · Đại Thành Bí Kíp ×${matHave("misc", "dtbk")} · Kim Nguyên Bảo ${S.knb || 0}</div><div class="card"><label><input type="checkbox" id="cRot" ${S.rot === !1 ? "" : "checked"}> Xoay chiêu tự động khi farm: luân phiên các chiêu gán ở ô 1 đến 4 (phím R), luôn có 2 chiêu mạnh nhất, bỏ chiêu hết nội lực</label>${skOptsHTML()}</div><p class="dim small">Chạm vào chiêu tấn công đã học để khóa làm chiêu chính${S.mainLock ? ' (<a id="bAutoMain">bỏ khóa</a>)' : " (đang tự chọn chiêu mạnh nhất)"}.</p>${t}`),
    document.querySelectorAll("#t-skill .plus").forEach(
      (a) =>
        (a.onclick = (c) => {
          c.stopPropagation();
          const i = SK[a.dataset.id];
          canLearn(i) && (skLearn(i.id), uiSfx("learn"), (R.dirty = !0), recalc(), renderSkill(), save());
        }),
    ),
    document.querySelectorAll("#t-skill .minus").forEach(
      (a) =>
        (a.onclick = (c) => {
          (c.stopPropagation(), unlearnSkill(+a.dataset.id));
        }),
    ),
    document.querySelectorAll("#t-skill .skinfo").forEach(
      (a) =>
        (a.onclick = (c) => {
          (c.stopPropagation(), skillModal(+a.dataset.id));
        }),
    ),
    document.querySelectorAll("#t-skill .slots button").forEach(
      (a) =>
        (a.onclick = (c) => {
          (c.stopPropagation(), assignSlot(+a.dataset.slot, +a.dataset.sid), renderSkill());
        }),
    ),
    ($("#bSugSk").onclick = suggestModal),
    ($("#bTT").onclick = tayTuyModal),
    ($("#cRot").onchange = () => toggleRot()),
    document.querySelectorAll("#t-skill [data-dt]").forEach(
      (a) =>
        (a.onclick = (c) => {
          (c.stopPropagation(), useDaiThanh(+a.dataset.dt));
        }),
    ),
    bindSkOpts(),
    bindSkState($("#t-skill")));
  const e = $("#bAutoMain");
  e &&
    (e.onclick = () => {
      ((S.mainLock = !1), (R.dirty = !0), recalc(), renderSkill());
    });
  const s = $("#bBasic");
  (s &&
    (s.onclick = (a) => {
      (a.stopPropagation(),
        S.mainLock && S.main === "basic" ? (S.mainLock = !1) : ((S.main = "basic"), (S.mainLock = !0)),
        (R.dirty = !0),
        recalc(),
        renderSkill(),
        renderPad(),
        save(),
        toast(S.mainLock && S.main === "basic" ? "Chiêu chính: Đánh thường" : "Bỏ khóa đánh thường"));
    }),
    document.querySelectorAll("#t-skill .skl[data-id]").forEach(
      (a) =>
        (a.onclick = () => {
          const c = SK[a.dataset.id];
          isAttack(c) && S.sk[c.id]
            ? ((S.main = c.id),
              (S.mainLock = !0),
              (R.dirty = !0),
              recalc(),
              renderSkill(),
              toast("Chiêu chính: " + c.n))
            : skillModal(c.id);
        }),
    ));
}
const INV_SORTS = [
    ["new", "Mới nhặt"],
    ["rar", "Độ hiếm"],
    ["lvl", "Cấp đồ"],
    ["slot", "Loại"],
    ["pow", "Sức mạnh"],
  ],
  SLOT_ORDER = Object.fromEntries(SLOTS.map(([n], t) => [n, t]).concat([["ring", 7]]));
function invSorted() {
  const n = S.invSort || "new",
    t = S.inv.slice();
  return (
    n === "rar"
      ? t.sort((e, s) => s.r - e.r || s.lvl - e.lvl)
      : n === "lvl"
        ? t.sort((e, s) => s.lvl - e.lvl || s.r - e.r)
        : n === "slot"
          ? t.sort(
              (e, s) => (SLOT_ORDER[DETAIL_SLOT[e.d]] ?? 99) - (SLOT_ORDER[DETAIL_SLOT[s.d]] ?? 99) || s.lvl - e.lvl,
            )
          : n === "pow" && t.sort((e, s) => itemPower(s) - itemPower(e)),
    t
  );
}
function renderInv() {
  invDirty = !1;
  const n = lootFilter(),
    t = RAR_VI.map((l, r) => `<option value="${r}" ${n.minRar === r ? "selected" : ""}>${l}</option>`).join(""),
    e = Array.from(
      { length: 10 },
      (l, r) => `<option value="${r + 1}" ${n.minLvl === r + 1 ? "selected" : ""}>${r + 1}</option>`,
    ).join(""),
    s = Array.from(
      { length: 7 },
      (l, r) => `<option value="${r}" ${(n.minMag || 0) === r ? "selected" : ""}>${r}</option>`,
    ).join(""),
    a = LOOT_ATTR_GROUPS.map(
      ([l], r) =>
        `<label class="chip2"><input type="checkbox" data-g="${r}" ${n.groups.includes(r) ? "checked" : ""}>${l}</label>`,
    ).join(""),
    c = SERIES.map(
      (l, r) =>
        `<label class="chip2" style="color:${SERIES_COL[r]}"><input type="checkbox" data-s="${r}" ${n.series.includes(r) ? "checked" : ""}>${l}</label>`,
    ).join(""),
    i = LOOT_SLOT_GROUPS.map(
      ([l, r]) =>
        `<label class="chip2"><input type="checkbox" data-sl="${l}" ${n.slots.includes(l) ? "checked" : ""}>${r}</label>`,
    ).join(""),
    d = R.ground.length,
    u = R.ground.filter((l) => lootMatch(l.it)).length,
    m = S.inv.filter((l) => !lootMatch(l) && !sellProtected(l)),
    o = S.inv.filter((l) => l.lock).length,
    p = lootPresets();
  $("#t-inv").innerHTML =
    `<div class="invbar"><span>${S.inv.length}/${INV_MAX}</span><select id="iSort" title="Sắp xếp hiển thị">${INV_SORTS.map(([l, r]) => `<option value="${l}" ${(S.invSort || "new") === l ? "selected" : ""}>${r}</option>`).join("")}</select><span class="sp"></span>
    <button class="btn sm" id="bStash">Kho chung</button><button class="btn sm" id="bDonKho">🧹 Dọn kho</button><button class="btn sm" id="bBest">Mặc đồ tốt</button><button class="btn sm red" id="bSellAll" ${m.length ? "" : "disabled"}>${m.length ? `Bán ${m.length} món không khớp lọc` : "Không có đồ để bán"}</button></div>
    <div class="invgrid">${invSorted().map(itemCell).join("")}</div>
    <p class="dim small">${o ? `${o} món đã khóa 🔒 (không tự bán, không bán hàng loạt, không hợp Huyền Tinh). ` : ""}Mở chi tiết món đồ để khóa / mở khóa.</p>
    <div class="btnrow"><button class="btn sm" id="bKtcI">🏮 Kỳ Trân Các</button></div>
    ${
      verVio()
        ? (() => {
            const l = n.ep;
            return `<div class="card lootf" id="epLoot"><b>💎 Đồ để ép Tím</b> <small class="dim">nhặt riêng cả khi không khớp bộ lọc bên dưới, không chiếm hành trang</small>
      <label><input type="checkbox" id="eWhite" ${l.white ? "checked" : ""}> Đồ trắng (phôi để chế tạo đồ Tím)</label>
      <label><input type="checkbox" id="eJew" ${l.jew ? "checked" : ""}> Nhẫn / dây chuyền / ngọc bội không tốt hơn đồ đang mặc (luyện Huyền Tinh)</label>
      <label><input type="checkbox" id="eBlue" ${l.blue ? "checked" : ""}> Đồ xanh có dòng cấp ≥ <select id="eBlueLv">${Array.from({ length: 10 }, (r, b) => `<option value="${b + 1}" ${l.blueLv === b + 1 ? "selected" : ""}>${b + 1}</option>`).join("")}</select> (lấy thuộc tính ra đá)</label>
      <div class="row">Cất vào <select id="eDest">${[
        ["box", "Kho Rèn"],
        ["stash", "Kho chung"],
        ["inv", "Hành trang"],
      ]
        .map(([r, b]) => `<option value="${r}" ${l.dest === r ? "selected" : ""}>${b}</option>`)
        .join("")}</select> <small class="dim">Kho Rèn ${epBox().length}/${EP_BOX_MAX}</small></div></div>`;
          })()
        : ""
    }
    <h3>Bộ lọc đồ <small>${d} món trên đất · ${u} khớp</small></h3>
    <div class="card lootf${n.custom ? "" : " smart"}">
      <div class="desc small">Giữ đồ quý, đồ nộp Dã Tẩu và các mục được tick dưới đây; còn lại tự bán. Đồ để ép Tím nhặt riêng theo mục 💎 ở trên.</div>
      <div class="btnrow presets">${LOOT_QUICK.map(([l], r) => `<button class="btn sm" data-q="${r}">${l}</button>`).join("")}</div>
      <div class="btnrow presets">${p.map((l, r) => `<span class="pslot"><button class="btn sm" data-pl="${r}" ${l ? "" : "disabled"}>Bộ ${r + 1}${l ? "" : " (trống)"}</button><button class="btn sm" data-ps="${r}" title="Lưu bộ lọc hiện tại vào bộ ${r + 1}">💾</button></span>`).join("")}</div>
      <label><input type="checkbox" id="fAuto" ${n.auto ? "checked" : ""}> Tự đi nhặt đồ khi hết quái</label>
      <label><input type="checkbox" id="fAll" ${n.pickAll ? "checked" : ""}> <b>Nhặt toàn bộ</b>, bán theo bộ lọc: nhặt mọi món rơi ra; khi hành trang đầy hoặc bấm Bán thì chỉ bán món không khớp bộ lọc (bỏ chọn: chỉ nhặt món khớp bộ lọc)</label>
      <label><input type="checkbox" id="fRare" ${n.keepRare ? "checked" : ""}> Luôn nhặt đồ quý (Hoàng Kim, Tím, ngựa hiếm)</label>
      <label><input type="checkbox" id="fSmart" ${n.smartUp ? "checked" : ""}> ⭐ <b>Giữ đồ nâng cấp</b> (lọc thông minh): món làm nhân vật mạnh hơn đồ đang mặc (▲), kể cả món sắp mặc được (cấp yêu cầu ≤ cấp + 10, đúng giới tính / phái / loại vũ khí) và món cường hóa lên sẽ mạnh hơn (△) <small class="dim">· hành trang có ${S.inv.filter(isUpgrade).length} món</small></label>
      <label><input type="checkbox" id="fCustom" ${n.custom ? "checked" : ""}> ⚙ <b>Giữ thêm đồ khớp điều kiện tùy chỉnh</b> bên dưới</label>
      <div class="lc row">Độ hiếm từ <select id="fRar">${t}</select> · cấp đồ từ <select id="fLvl">${e}</select> · ít nhất <select id="fMag">${s}</select> dòng</div>
      <label class="lc"><input type="checkbox" id="fWear" ${n.wear ? "checked" : ""}> Chỉ đồ nhân vật mặc được (giới tính, hệ, môn phái; cấp yêu cầu ≤ cấp hiện tại + 5)</label>
      <label class="lc"><input type="checkbox" id="fFacW" ${n.facW ? "checked" : ""}> Vũ khí: chỉ đúng loại của môn phái</label>
      <label class="lc"><input type="checkbox" id="fAcc" ${n.accrue ? "checked" : ""}> Chỉ hệ được nhân vật tương sinh (${FAC[S.fac] ? SERIES[heroSeries()] + " → " + SERIES[ACCRUE[heroSeries()]] : ""}: tự mở 1 dòng ẩn)</label>
      <div class="lc dim small">Loại trang bị (bỏ trống = mọi loại):</div><div class="lc chips">${i}</div>
      <div class="lc dim small">Có ít nhất một thuộc tính (bỏ trống = mọi thuộc tính):</div><div class="lc chips">${a}</div>
      <div class="lc dim small">Hệ của món đồ (bỏ trống = mọi hệ):</div><div class="lc chips">${c}</div>
      <div class="dim small">Hành trang: ${S.inv.length - m.length}/${S.inv.length} món khớp hoặc được bảo vệ. Chạm vào món đồ trên sân để đi nhặt tay. Trên 40 món thì món cũ nhất tự bán. Khi vắng mặt, đồ không khớp tự bán.</div>
    </div>`;
  const h = () => {
    ((LF_KEY = null), save(), renderInv());
  };
  if (
    (($("#fSmart").onchange = (l) => {
      ((n.smartUp = l.target.checked), h());
    }),
    ($("#fCustom").onchange = (l) => {
      ((n.custom = l.target.checked), h());
    }),
    ($("#iSort").onchange = (l) => {
      ((S.invSort = l.target.value), renderInv(), save());
    }),
    ($("#fAuto").onchange = (l) => {
      ((n.auto = l.target.checked), h());
    }),
    ($("#fAll").onchange = (l) => {
      ((n.pickAll = l.target.checked), h());
    }),
    ($("#fRare").onchange = (l) => {
      ((n.keepRare = l.target.checked), h());
    }),
    ($("#fWear").onchange = (l) => {
      ((n.wear = l.target.checked), h());
    }),
    ($("#fFacW").onchange = (l) => {
      ((n.facW = l.target.checked), h());
    }),
    ($("#fAcc").onchange = (l) => {
      ((n.accrue = l.target.checked), h());
    }),
    ($("#fRar").onchange = (l) => {
      ((n.minRar = +l.target.value), h());
    }),
    ($("#fLvl").onchange = (l) => {
      ((n.minLvl = +l.target.value), h());
    }),
    ($("#fMag").onchange = (l) => {
      ((n.minMag = +l.target.value), h());
    }),
    document.querySelectorAll("#t-inv [data-g]").forEach(
      (l) =>
        (l.onchange = () => {
          const r = +l.dataset.g;
          ((n.groups = l.checked ? [...new Set(n.groups.concat(r))] : n.groups.filter((b) => b !== r)), h());
        }),
    ),
    document.querySelectorAll("#t-inv [data-s]").forEach(
      (l) =>
        (l.onchange = () => {
          const r = +l.dataset.s;
          ((n.series = l.checked ? [...new Set(n.series.concat(r))] : n.series.filter((b) => b !== r)), h());
        }),
    ),
    document.querySelectorAll("#t-inv [data-sl]").forEach(
      (l) =>
        (l.onchange = () => {
          const r = l.dataset.sl;
          ((n.slots = l.checked ? [...new Set(n.slots.concat(r))] : n.slots.filter((b) => b !== r)), h());
        }),
    ),
    document.querySelectorAll("#t-inv [data-q]").forEach(
      (l) =>
        (l.onclick = () => {
          const r = LOOT_QUICK[+l.dataset.q];
          (lootLoadPreset(Object.assign(LOOT_DEF(), r[1])), toast("Bộ lọc: " + r[0]), h());
        }),
    ),
    document.querySelectorAll("#t-inv [data-pl]").forEach(
      (l) =>
        (l.onclick = () => {
          const r = lootPresets()[+l.dataset.pl];
          r && (lootLoadPreset(r), toast(`Dùng bộ lọc ${+l.dataset.pl + 1}`), h());
        }),
    ),
    document.querySelectorAll("#t-inv [data-ps]").forEach(
      (l) =>
        (l.onclick = () => {
          (lootSavePreset(+l.dataset.ps), toast(`Đã lưu bộ lọc ${+l.dataset.ps + 1}`), h());
        }),
    ),
    ($("#bStash").onclick = () => stashModal()),
    ($("#bKtcI").onclick = () => ktcModal()),
    $("#epLoot"))
  ) {
    const l = lootFilter().ep,
      r = () => {
        (save(), (invDirty = !0));
      };
    (($("#eWhite").onchange = (b) => {
      ((l.white = b.target.checked), r());
    }),
      ($("#eJew").onchange = (b) => {
        ((l.jew = b.target.checked), r());
      }),
      ($("#eBlue").onchange = (b) => {
        ((l.blue = b.target.checked), r());
      }),
      ($("#eBlueLv").onchange = (b) => {
        ((l.blueLv = +b.target.value), r());
      }),
      ($("#eDest").onchange = (b) => {
        ((l.dest = b.target.value), r());
      }));
  }
  (($("#bBest").onclick = () => {
    for (const l of S.inv.slice()) betterThanEquipped(l) && equip(l, !0);
    refresh();
  }),
    ($("#bDonKho").onclick = () => donKhoModal()),
    ($("#bSellAll").onclick = () => {
      const l = sellUnmatched();
      (toast(`Bán ${l.n} món (+${fmtL(l.gold)} lượng)${l.kept ? `, giữ ${l.kept} món được bảo vệ` : ""}`), refresh());
    }),
    document
      .querySelectorAll("#t-inv .invgrid .it")
      .forEach((l) => (l.onclick = () => itemModal(findItem(l.dataset.uid)))));
}
async function resetGameAll() {
  if (
    !confirm(
      "Bạn có chắc chắn muốn xóa toàn bộ dữ liệu và chơi lại từ đầu không?\n\nToàn bộ nhân vật, trang bị, kho đồ và cài đặt sẽ bị xóa hoàn toàn!"
    )
  ) {
    return;
  }
  try {
    if (typeof SAVE_LOCK !== "undefined") SAVE_LOCK = true;
    if (typeof save === "function") save = () => {};
    window.onbeforeunload = null;
  } catch (e) {}

  try {
    if (typeof API !== "undefined" && API && API.setToken) API.setToken(null);
    if (typeof NET !== "undefined" && NET) NET.user = null;
  } catch (e) {}

  try {
    localStorage.clear();
  } catch (e) {}

  try {
    sessionStorage.clear();
  } catch (e) {}

  try {
    if (window.indexedDB && indexedDB.databases) {
      const dbs = await indexedDB.databases();
      for (const db of dbs) {
        if (db && db.name) indexedDB.deleteDatabase(db.name);
      }
    }
  } catch (e) {}

  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch (e) {}

  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const reg of regs) {
        await reg.unregister();
      }
    }
  } catch (e) {}

  try {
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
  } catch (e) {}

  try {
    if (location.protocol === "file:") {
      location.reload();
    } else {
      location.href = location.pathname + "?reset=" + Date.now();
    }
  } catch (e) {
    location.reload();
  }
}
window.resetGameAll = resetGameAll;

function renderMore() {
  setTimeout(() => {
    const r = document.getElementById("bResetGame");
    r && (r.onclick = () => resetGameAll());
    const e = document.getElementById("bGcode");
    e && (e.onclick = () => giftcodeModal());
    const o = document.getElementById("bLogout");
    o && typeof netLogout == "function" && (o.onclick = () => netLogout(o));
  }, 0);
  const n = typeof netOn == "function" && netOn() && !NET.offline;
  $("#t-more").innerHTML = `<div class="btnrow"><button class="btn" id="bResetGame" onclick="resetGameAll()">🔄 Chơi Lại Từ Đầu</button></div><div class="btnrow"><button class="btn" id="bGcode">🎟 Nhập Giftcode</button>${n && NET.user ? `<button class="btn red" id="bLogout" title="Lưu rồi thoát tài khoản ${esc(typeof netUname == "function" ? netUname() : "")}">⎋ Đăng xuất</button>` : ""}</div>${
    n
      ? "" // online: saved on the server automatically; no cloud-save / slot / delete controls in our version
      : `<h3>Lưu game</h3><div class="card"><p class="dim small">Nhân vật lưu trong trình duyệt của từng thiết bị. Để chơi trên thiết bị khác: bấm <b>Tải file lưu</b>, chuyển file <code></code> sang thiết bị kia (Zalo, Drive, cáp…), rồi mở game ở đó và bấm <b>Nạp từ file</b>. File có chữ ký, sửa tay sẽ bị từ chối. Nên tải file định kỳ để sao lưu.</p>
    <div class="btnrow"><button class="btn" id="bDl">Tải file lưu</button><button class="btn" id="bFile">Nạp từ file</button></div>
    <p class="dim small">Hoặc dùng mã văn bản:</p><div class="btnrow"><button class="btn" id="bExp">Xuất mã</button><button class="btn" id="bImp">Nhập mã</button></div><textarea id="saveTxt" rows="4" placeholder="Mã lưu game"></textarea></div>`
  }
    <h3>Âm thanh</h3><div class="card lootf">
      <label><input type="checkbox" id="sOn" ${sndCfg().on ? "checked" : ""}> Tiếng động (đòn đánh, chiêu, quái, rơi đồ)</label>
      <div class="row">Âm lượng <input type="range" id="sVol" min="0" max="1" step="0.05" value="${sndCfg().vol}"></div>
      <label><input type="checkbox" id="mOn" ${sndCfg().music ? "checked" : ""}> Nhạc nền theo bản đồ</label>
      <div class="row">Nhạc <input type="range" id="mVol" min="0" max="1" step="0.05" value="${sndCfg().mvol}"></div></div>
    <h3>Tự động</h3><div class="card"><label><input type="checkbox" id="cAuto" ${S.autoEquip ? "checked" : ""}> Tự mặc đồ tốt hơn khi nhặt</label><br>
      <label><input type="checkbox" id="cPot" ${S.potOff ? "" : "checked"}> Tự dùng thuốc khi sinh lực / nội lực dưới 50% · đã dùng ${fmt(S.potUsed || 0)}</label><br>
      <label><input type="checkbox" id="cPotBuy" ${S.potBuy === !1 ? "" : "checked"}> Tự mua thuốc khi hết</label><br>
      <label><input type="checkbox" id="cRide" ${S.autoRide === !1 ? "" : "checked"}> Auto tự lên ngựa khi di chuyển, xuống ngựa khi đánh bằng chiêu không dùng được trên ngựa</label>
      <div class="row small">${[0, 1]
        .map((e) => {
          const s = typeof slotShow == "function" ? slotShow(e) : { name: "" };
          return `<button class="btn sm" data-potsl="${e}">${e ? "Nội lực (ô 2)" : "Sinh lực (ô 1)"}: ${esc(s.name || "Tự động")} ▾</button>`;
        })
        .join(" ")}</div>
      <label><input type="checkbox" id="cJunk" ${S.autoJunk === !1 ? "" : "checked"}> Tự bán đồ thừa (yếu hơn đồ đang mặc cùng ô, vũ khí sai loại của phái; giữ tối đa 6 nhẫn / dây chuyền / ngọc bội để hợp Huyền Tinh)</label><br>
      <label><input type="checkbox" id="cPts" ${S.autoPts === !0 ? "checked" : ""}> Tự cộng điểm tiềm năng và võ công (mặc định tắt: tự cộng ở thẻ Nhân vật và Võ công)</label></div>
    <h3>Tiện ích</h3><div class="card lootf">

      <label><input type="checkbox" id="cBuy" ${S.autoBuy === !1 ? "" : "checked"}> Tự mua vũ khí đúng loại ở Biện Kinh khi mạnh hơn ≥ 25% (tối đa 60% ngân lượng)</label>
      <div class="btnrow"><button class="btn" id="bKtc">🏮 Kỳ Trân Các</button><button class="btn" id="bStashM">Kho chung</button><button class="btn" id="bTut">Hướng dẫn</button><button class="btn" id="bCodex">Bách khoa</button><button class="btn" id="bSug">Gợi ý cộng điểm</button></div></div>
    <h3>Trợ năng</h3><div class="card lootf">
      <div class="row">Cỡ chữ <select id="uFs">${UI_FS.map((e, s) => `<option value="${s}" ${uiPrefs().fs === s ? "selected" : ""}>${UI_FS_NAME[s]}</option>`).join("")}</select> <small class="dim">áp dụng cho bảng thông tin, thẻ và hộp thoại</small></div>
      <label><input type="checkbox" id="uSaver" ${uiPrefs().saver ? "checked" : ""}> Tiết kiệm pin (vẽ 30 khung/giây, ngừng vẽ khi ẩn tab)</label>
      <small class="dim">Tay cầm: cần analog / D-pad để đi, A B X Y dùng chiêu 1–4, LB / RB uống thuốc HP / MP. Phím Esc đóng hộp thoại.<br>Phím tắt (như Võ Lâm 1): F1 hướng dẫn · F2 hệ thống · F3 nhân vật · F4 hành trang · F5 võ công · F6 giang hồ online · F11 nhiệm vụ · Tab bản đồ · Enter chat · Q W E A chiêu 1–4 · 1–5 vật phẩm · M ngựa · R xoay chiêu · F tự đánh · U Kỳ Trân Các · Y phần thưởng · Esc đóng cửa sổ / mở hệ thống · phím mũi tên đi lại.</small></div>
    <h3>Điều khiển & Hiển thị</h3><div class="card"><div class="row" style="margin-bottom:6px">Điều khiển di chuyển <span class="seg"><button class="btn sm${mouseMode() ? " on" : ""}" id="bInMouse">🖱 Chuột</button><button class="btn sm${!mouseMode() ? " on" : ""}" id="bInJoy">🕹 Joystick</button></span></div>
      <label><input type="checkbox" id="cJoy" ${joyFixed() ? "checked" : ""}> Joystick cố định ở góc trái dưới (bỏ chọn: joystick nổi theo ngón tay)</label><br>
      <label><input type="checkbox" id="cLowFx" ${S.lowFx ? "checked" : ""}> Giảm hiệu ứng (mượt hơn trên máy yếu / đông quái)</label></div>
    <h3>Nguồn dữ liệu</h3><div class="card small dim">Kỹ năng, quái, trang bị, thuộc tính và tỉ lệ rơi đồ trích từ dữ liệu Võ Lâm Truyền Kỳ 1 (bản fan chơi offline, phi thương mại).</div>
`;
  const t = (e, s) => {
    const a = $(e);
    a && (a.onclick = s);
  };
  (t("#bCloud", () => netModal("acc")),
    t("#bDl", () => {
      downloadSaveFile() && toast("Đã tải file lưu: " + saveFileName());
    }),
    t("#bFile", () => pickSaveFile(null)),
    t("#bExp", () => {
      (($("#saveTxt").value = exportSave()), toast("Đã xuất mã"));
    }),
    t("#bImp", () => importFlow($("#saveTxt").value, null)),
    ($("#cAuto").onchange = (e) => {
      ((S.autoEquip = e.target.checked), save());
    }),
    ($("#cJunk").onchange = (e) => {
      ((S.autoJunk = e.target.checked), save());
    }),
    ($("#sOn").onchange = (e) => {
      (audInit(), (sndCfg().on = e.target.checked), audApply(), save());
    }),
    ($("#mOn").onchange = (e) => {
      (audInit(),
        (sndCfg().music = e.target.checked),
        audApply(),
        sndCfg().music && playMusic(R.town ? W.town.id : zoneOf(Math.min(S.stage, STAGES)).id),
        save());
    }),
    ($("#sVol").oninput = (e) => {
      ((sndCfg().vol = +e.target.value), audApply());
    }),
    ($("#mVol").oninput = (e) => {
      ((sndCfg().mvol = +e.target.value), audApply());
    }),
    ($("#sVol").onchange = $("#mVol").onchange = () => save()),
    ($("#cPot").onchange = (e) => {
      ((S.potOff = !e.target.checked), save());
    }),
    ($("#cPotBuy").onchange = (e) => {
      ((S.potBuy = e.target.checked), save());
    }),
    ($("#cRide").onchange = (e) => {
      ((S.autoRide = e.target.checked), save());
    }),
    document.querySelectorAll("[data-potsl]").forEach((e) => (e.onclick = () => potSlotModal(+e.dataset.potsl))),
    ($("#cPts").onchange = (e) => {
      ((S.autoPts = e.target.checked), S.autoPts && (autoSpendAttrs(), autoSpendSkills(), recalc()), save());
    }),
    t("#bInMouse", () => {
      S.inputMode = "mouse";
      INPUT.target = null;
      typeof refreshInputBtn == "function" && refreshInputBtn();
      save();
      toast("Điều khiển bằng chuột: bấm hoặc giữ chuột để đi");
      renderMore();
    }),
    t("#bInJoy", () => {
      S.inputMode = "joy";
      INPUT.target = null;
      typeof refreshInputBtn == "function" && refreshInputBtn();
      save();
      toast("Điều khiển bằng joystick: kéo ở góc trái dưới");
      renderMore();
    }),
    ($("#cJoy").onchange = (e) => {
      ((S.joy = e.target.checked ? "fixed" : "float"), save());
    }),
    ($("#cLowFx").onchange = (e) => {
      ((S.lowFx = e.target.checked), save());
    }),
    ($("#cBuy").onchange = (e) => {
      ((S.autoBuy = e.target.checked), save());
    }),
    ($("#bStashM").onclick = () => stashModal()),
    ($("#bKtc").onclick = () => ktcModal()),
    ($("#bTut").onclick = () => tutorialModal(0)),
    ($("#bCodex").onclick = () => codexModal()),
    ($("#bSug").onclick = suggestModal),
    ($("#uFs").onchange = (e) => {
      setUiPref({ fs: +e.target.value });
    }),
    ($("#uSaver").onchange = (e) => setUiPref({ saver: e.target.checked })));
}
function showTab(n) {
  ((curTab = n),
    document.querySelectorAll("#tabs button").forEach((t) => t.classList.toggle("on", t.dataset.t === n)),
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("hidden", t.id !== "t-" + n)),
    refresh());
}
function refresh() {
  if (typeof pDefer == "function" && pDefer("refresh", refresh)) return;
  (typeof modeSwSync == "function" && modeSwSync(),
    S.fac &&
      (R.dirty && recalc(),
      {
        log: renderLog,
        char: renderChar,
        skill: renderSkill,
        inv: renderInv,
        forge: renderForge,
        quest: renderQuest,
        more: renderMore,
      }[curTab](),
      renderPad(),
      updateDots()));
}
function updateDots() {
  if (typeof pDefer == "function" && pDefer("updateDots", updateDots)) return;
  $("#dotChar").classList.toggle("on", S.attrPts > 0);
  const n = $("#dotForge"),
    t = $("#dotQuest");
  (n && n.classList.toggle("on", forgeDot()),
    t && t.classList.toggle("on", questDot()),
    $("#dotSkill").classList.toggle(
      "on",
      (S.skPts > 0 && FAC[S.fac] && FAC[S.fac].skills.some((e) => canLearn(SK[e]))) ||
        (isNovice() && S.lvl >= NOVICE_LV),
    ));
}
function updateTop() {
  const n = R.P;
  if (!n) return;
  {
    const a = heroGfx(),
      c = $(".lvbox");
    a && c && c.style.setProperty("--pl", `url('${a.img}')`);
  }
  (($("#lv").textContent = S.lvl), ($("#gold").textContent = fmtL(S.gold)));
  {
    const a = $("#knbTop");
    a && (a.textContent = fmt(S.knb || 0));
  }
  $("#heroName").textContent = FAC[S.fac] ? FAC[S.fac].n : "";
  {
    let a = $("#skBuffs");
    a || ((a = document.createElement("div")), (a.id = "skBuffs"), $("#battle").appendChild(a));
    const i = (typeof stateIcons == "function" ? stateIcons() : [])
      .map(
        (d) => `<div class="sti" title="${esc(d.n)}"><img src="${esc(d.ic || "")}" alt=""><b>${fmtLeft(d.t)}</b></div>`,
      )
      .join("");
    a.innerHTML !== i && (a.innerHTML = i);
  }
  $("#stageLbl").textContent = R.dg
    ? R.dg.kind === "boat"
      ? "⛵ Phong Lăng Độ"
      : R.dg.kind === "wb"
        ? "Boss tuần"
        : R.dg.d.n
    : `${modeOf()[1]} ${zoneOf(Math.min(S.stage, STAGES)).n} ${R.field && !R.town ? ` · hạ ${fmt(R.field.kills)}` : ""}`;
  const t = lvNeed(S.lvl) || 1;
  (($("#xpBar").style.width = (S.xp / t) * 100 + "%"),
    ($("#xpTxt").textContent = `${((S.xp / t) * 100).toFixed(1)}%`),
    ($("#hpBar").style.width = (R.life / n.life) * 100 + "%"),
    ($("#hpTxt").textContent = `${fmt(R.life)} / ${fmt(n.life)}`),
    ($("#mpBar").style.width = (R.mana / n.mana) * 100 + "%"),
    ($("#mpTxt").textContent = `${fmt(R.mana)} / ${fmt(n.mana)}`),
    ($("#mainSk").textContent = n.main.n),
    typeof sk9Live == "function" && sk9Live());
  const e = $("#lvS");
  e && (e.textContent = S.lvl);
  const s = $("#pwS");
  s && R.P && (s.textContent = fmt(Math.round(R.P.main.tot)));
}
function pickSaveFile(n) {
  if (typeof netOn == "function" && netOn()) {
    toast("Bản online chỉ dùng lưu đám mây");
    return;
  }
  const t = document.createElement("input");
  ((t.type = "file"),
    (t.accept = ".jxsave,.json,.txt,application/json,text/plain"),
    (t.style.display = "none"),
    (t.onchange = () => {
      const e = t.files && t.files[0];
      if ((t.remove(), !e)) return;
      const s = new FileReader();
      ((s.onload = () => importFlow(String(s.result), n)),
        (s.onerror = () => toast("Không đọc được file")),
        s.readAsText(e));
    }),
    document.body.appendChild(t),
    t.click());
}
function importFlow(n, t, e) {
  if (typeof netOn == "function" && netOn()) {
    toast("Bản online chỉ dùng lưu đám mây");
    return;
  }
  let s;
  try {
    s = parseSaveText(n);
  } catch (d) {
    toast(d.message || "File không hợp lệ");
    return;
  }
  const a = FAC[s.fac],
    c = `${esc(a.n)} cấp ${Math.max(1, Math.min(MAX_LEVEL, s.lvl | 0))}`,
    i = [...Array(SLOT_N).keys()]
      .map((d) => {
        const u = slotInfo(d),
          m = u && FAC[u.fac];
        return `<div class="slotrow ${u ? "" : "empty"}"><span><b>Slot ${d + 1}</b><small>${u && m ? esc(m.n) + " cấp " + u.lvl + " (sẽ bị ghi đè)" : "Trống"}</small></span><button class="btn ${u ? "red" : ""}" data-into="${d}">${u ? "Ghi đè" : "Nạp vào"}</button></div>`;
      })
      .join("");
  modal(
    `<h3>Nạp file lưu</h3><p class="desc">Nhân vật trong file: <b>${c}</b>. Chọn slot để nạp (slot đã có nhân vật sẽ giữ một bản sao lưu).</p><div class="slotlist">${i}</div>${t ? '<div class="btnrow"><button class="btn" id="impBack">Quay lại</button></div>' : ""}`,
    () => {
      document.querySelectorAll("#mBody [data-into]").forEach(
        (u) =>
          (u.onclick = () => {
            try {
              (SLOT === +u.dataset.into && (SAVE_LOCK = !0), writeSlot(+u.dataset.into, s));
            } catch (m) {
              toast(m.message);
              return;
            }
            location.reload();
          }),
      );
      const d = $("#impBack");
      d && (d.onclick = t);
    },
    !!t && !S.fac,
  );
}
function slotMenu(n) {
  const t = [...Array(SLOT_N).keys()]
    .map((e) => {
      const s = slotInfo(e),
        a = s && FAC[s.fac];
      if (!s || !a)
        return `<div class="slotrow empty"><span><b>Slot ${e + 1}</b><small>Trống</small></span><button class="btn" data-play="${e}">Tạo nhân vật</button></div>`;
      const c = s.last ? new Date(s.last).toLocaleString("vi-VN") : "";
      return n === e
        ? `<div class="slotrow del"><span><b>Xóa slot ${e + 1}?</b><small>${esc(a.n)} cấp ${s.lvl} sẽ mất vĩnh viễn</small></span><button class="btn red" data-del-yes="${e}">Xóa</button><button class="btn" data-del-no="1">Hủy</button></div>`
        : `<div class="slotrow"><img src="${esc((heroGfx(s.fac, s.sex) || {}).img || "")}" alt=""><span><b style="color:${SERIES_COL[a.series]}">${esc(s.name && s.name !== a.n ? s.name + " · " : "")}${esc(a.n)}</b><small>Cấp ${s.lvl} · ải ${s.stage}${c ? " · " + esc(c) : ""}</small></span><button class="btn" data-play="${e}">Chơi</button><button class="btn red" data-del="${e}">Xóa</button></div>`;
    })
    .join("");
  modal(
    `<h3>Chọn nhân vật</h3><p class="desc">Mỗi slot là một nhân vật riêng, lưu độc lập.</p><div class="slotlist">${t}</div>${typeof netOn == "function" && netOn() ? "" : '<div class="btnrow"><button class="btn" id="slotImp">Nạp từ file lưu (.jxsave)</button></div>'}`,
    () => {
      const e = $("#slotCloud");
      e && (e.onclick = () => netModal("acc"));
      const s = $("#slotImp");
      (s && (s.onclick = () => pickSaveFile(() => slotMenu())),
        document.querySelectorAll("#mBody [data-play]").forEach(
          (a) =>
            (a.onclick = () => {
              try {
                localStorage.setItem(SLOT_PTR, a.dataset.play);
              } catch {}
              ((SAVE_LOCK = !0), location.reload());
            }),
        ),
        document.querySelectorAll("#mBody [data-del]").forEach((a) => (a.onclick = () => slotMenu(+a.dataset.del))),
        document.querySelectorAll("#mBody [data-del-no]").forEach((a) => (a.onclick = () => slotMenu())),
        document
          .querySelectorAll("#mBody [data-del-yes]")
          .forEach((a) => (a.onclick = () => deleteSlot(+a.dataset.delYes))));
    },
    !0,
  );
}
const SERIES_DESC = [
  "Cương mãnh, ngoại công mạnh",
  "Độc dược, ám khí",
  "Mềm dẻo, nội công băng",
  "Hỏa công, lực đánh lớn",
  "Lôi, kiếm khí, bền bỉ",
];
let NEWC = { name: "", sex: 0, s: 0 };
// disciples set up on the creation screen (js/party.js): name, sex, element; default: random names, elements
// different from the main one (and from each other)
function newcDisc() {
  const nd = PARTY_MAX - 1;
  if (!Array.isArray(NEWC.d)) NEWC.d = [];
  for (; NEWC.d.length < nd; ) {
    const sex = NEWC.d.length % 2;
    const nm = randName(sex, [NEWC.name].concat(NEWC.d.map((d) => d.name)));
    NEWC.d.push({ name: nm, gen: nm, sex, s: -1, auto: !0 });
  }
  // auto elements: avoid the main's and the ones picked by hand
  const used = new Set([NEWC.s].concat(NEWC.d.filter((d) => !d.auto).map((d) => d.s)));
  for (const d of NEWC.d) {
    if (!d.auto && d.s >= 0) continue;
    const free = [0, 1, 2, 3, 4].filter((x) => !used.has(x));
    ((d.s = free.length ? free[0] : [0, 1, 2, 3, 4].find((x) => x !== NEWC.s)), used.add(d.s));
  }
  return NEWC.d;
}
function newcDiscHTML() {
  return `<div class="dim small" style="margin-top:8px">Đồ đệ (${PARTY_MAX - 1}): đi theo, cùng đánh quái, mỗi người một hành trang riêng. Đổi được làm nhân vật chính.</div>${newcDisc()
    .map(
      (d, i) =>
        `<div class="row ncd"><input data-dn="${i}" maxlength="14" placeholder="Tên đồ đệ ${i + 1}" value="${esc(d.name)}"><span class="seg">${["Nam", "Nữ"].map((a, c) => `<button class="btn sm${d.sex === c ? " on" : ""}" data-dsx="${i}:${c}">${a}</button>`).join("")}</span><span class="seg ncs">${[0, 1, 2, 3, 4].map((x) => (seriesSexOk(x, d.sex) ? `<button class="btn sm${d.s === x ? " on" : ""}" data-dse="${i}:${x}" style="color:${SERIES_COL[x]}" title="Hệ ${SERIES[x]}">${SERIES[x]}</button>` : `<button class="btn sm" disabled style="color:${SERIES_COL[x]};opacity:.3;cursor:not-allowed" title="Hệ ${SERIES[x]} chỉ có môn phái nhận ${d.sex ? "nam" : "nữ"}">${SERIES[x]}</button>`)).join("")}</span></div>`,
    )
    .join("")}`;
}
function pickFaction() {
  const n = (a) => FACTIONS.filter((c) => c.series === a),
    t = (a, c) =>
      n(a)
        .map((i) => (facAllowed(i, c) ? esc(i.n) : `<s>${esc(i.n)}</s>`))
        .join(" · "),
    e = J.start[NEWC.s * 2 + NEWC.sex] || {},
    s = n(NEWC.s).some((a) => facAllowed(a, NEWC.sex));
  modal(
    `<h3>Tạo nhân vật</h3><p class="desc">Như Võ Lâm Truyền Kỳ: chọn tên, giới tính và hệ ngũ hành. Đến <b>cấp ${NOVICE_LV}</b> mới gia nhập môn phái cùng hệ.</p>
    <div class="card lootf newc"><div class="row">Tên <input id="ncName" maxlength="14" placeholder="Tên nhân vật" value="${esc(NEWC.name)}"></div>
      <div class="row">Giới tính <span class="seg">${["Nam", "Nữ"].map((a, c) => `<button class="btn sm${NEWC.sex === c ? " on" : ""}" data-sx="${c}">${a}</button>`).join("")}</span></div>
      <div class="dim small">Hệ ngũ hành (Kim khắc Mộc, Mộc khắc Thổ, Thổ khắc Thủy, Thủy khắc Hỏa, Hỏa khắc Kim):</div>
      <div class="serpick">${[0, 1, 2, 3, 4].map((a) => `<button data-se="${a}" class="${NEWC.s === a ? "on" : ""}" style="--c:${SERIES_COL[a]}"><b>${SERIES[a]}</b><small>${SERIES_DESC[a]}</small><small>Phái: ${t(a, NEWC.sex)}</small></button>`).join("")}</div>
      <div class="stats"><span>Sức mạnh</span><span>${e.str ?? "-"}</span><span>Thân pháp</span><span>${e.dex ?? "-"}</span><span>Sinh khí</span><span>${e.vit ?? "-"}</span><span>Nội công</span><span>${e.eng ?? "-"}</span></div>
      ${s ? "" : `<p class="reqbad">Hệ ${SERIES[NEWC.s]} không có môn phái nhận ${NEWC.sex ? "nữ" : "nam"}.</p>`}
      ${newcDiscHTML()}
      <div class="btnrow"><button class="btn" id="ncGo" ${s ? "" : "disabled"}>Vào giang hồ</button></div></div>`,
    () => {
      const a = $("#ncName");
      (document.querySelectorAll("#mBody [data-dn]").forEach(
        (c) =>
          (c.oninput = () => {
            NEWC.d[+c.dataset.dn].name = c.value;
          }),
      ),
        document.querySelectorAll("#mBody [data-dsx]").forEach(
          (c) =>
            (c.onclick = () => {
              const [i, x] = c.dataset.dsx.split(":").map(Number);
              const d = NEWC.d[i];
              (d.name === d.gen && (d.name = d.gen = randName(x, [a.value].concat(NEWC.d.map((o) => o.name))))),
                (NEWC.name = a.value), (d.sex = x),
                // the element must have a faction that takes this sex (male: no Thủy, female: no Kim)
                seriesSexOk(d.s, x) || (d.s = [1, 2, 3, 4, 0].map((k) => (d.s + k) % 5).find((k) => seriesSexOk(k, x)) ?? d.s),
                pickFaction();
            }),
        ),
        document.querySelectorAll("#mBody [data-dse]").forEach(
          (c) =>
            (c.onclick = () => {
              const [i, x] = c.dataset.dse.split(":").map(Number);
              ((NEWC.name = a.value), (NEWC.d[i].s = x), (NEWC.d[i].auto = !1), pickFaction());
            }),
        ));
      ((a.oninput = () => {
        NEWC.name = a.value;
      }),
        document.querySelectorAll("#mBody [data-sx]").forEach(
          (c) =>
            (c.onclick = () => {
              ((NEWC.name = a.value), (NEWC.sex = +c.dataset.sx), pickFaction());
            }),
        ),
        document.querySelectorAll("#mBody [data-se]").forEach(
          (c) =>
            (c.onclick = () => {
              ((NEWC.name = a.value), (NEWC.s = +c.dataset.se), pickFaction());
            }),
        ),
        ($("#ncGo").onclick = () => {
          const c = a.value.trim().replace(/\s+/g, " ");
          if (c.length < 2) {
            toast("Tên cần ít nhất 2 ký tự");
            return;
          }
          const dn = [c.toLowerCase()];
          for (const d of NEWC.d) {
            const v = String(d.name || "")
                .trim()
                .replace(/\s+/g, " "),
              ok = typeof nameCheck == "function" ? nameCheck(v) : { ok: v.length >= 2, msg: "Tên cần ít nhất 2 ký tự" };
            if (!ok.ok) return toast(`Đồ đệ: ${ok.msg}`);
            if (dn.includes(v.toLowerCase())) return toast(`Tên trùng: ${v}`);
            if (!seriesSexOk(d.s, d.sex)) return toast(`${v}: hệ ${SERIES[d.s]} không có phái nhận ${d.sex ? "nữ" : "nam"}`);
            (dn.push(v.toLowerCase()), (d.name = v.slice(0, 14)));
          }
          createCharacter(c.slice(0, 14), NEWC.sex, NEWC.s, NEWC.d);
        }));
    },
    !0,
  );
}
function createCharacter(n, t, e, dd) {
  ((S.fac = "vo" + e),
    (S.sex = t),
    (S.sexSet = 1),
    (S.name = n),
    typeof NET < "u" && NET.user && (S.netOwner = NET.user.id),
    starterGear(),
    typeof partyEnsure == "function" && partyEnsure(dd),
    (R.dirty = !0),
    recalc(),
    (R.life = R.P.life),
    (R.mana = R.P.mana),
    loginCheck(),
    dotGift(),
    closeModal(!0),
    save(),
    showTab("log"),
    noticeModal(),
    S.party &&
      S.party.length &&
      log(
        `Đồ đệ: ${S.party.map((d) => `<b>${esc(d.name)}</b> (hệ <span style="color:${SERIES_COL[FAC[d.fac].series]}">${SERIES[FAC[d.fac].series]}</span>)`).join(", ")} theo bạn hành tẩu.`,
      ),
    log(
      `<b>${esc(n)}</b> (${t ? "nữ" : "nam"}, hệ <span style="color:${SERIES_COL[e]}">${SERIES[e]}</span>) bước vào giang hồ. Đạt cấp ${NOVICE_LV} để gia nhập môn phái.`,
    ),
    log(
      `🌱 Nhận <b>Hỗ Trợ Tân Thủ</b>: vòng sáng hồi ${NEWBIE_REGEN.life * 100}% sinh lực + ${NEWBIE_REGEN.mana * 100}% nội lực mỗi giây, <b>+${NEWBIE_XP * 100}% kinh nghiệm</b> luyện cấp đến cấp ${NEWBIE_LV}.`,
    ));
}
function joinModal() {
  if (!isNovice()) return;
  const n = heroSeries(),
    t = FACTIONS.filter((s) => s.series === n);
  if (S.lvl < NOVICE_LV) {
    modal(
      `<h3>Gia nhập môn phái</h3><p class="desc">Cần đạt cấp ${NOVICE_LV} (hiện cấp ${S.lvl}). Các phái hệ ${SERIES[n]}: ${t.map((s) => esc(s.n)).join(", ")}.</p>`,
    );
    return;
  }
  const e = t
    .map((s) => {
      const a = facAllowed(s, S.sex),
        c = s.starter && SK[s.starter];
      return `<button data-j="${s.key}" ${a ? "" : "disabled"} style="--c:${SERIES_COL[s.series]}"><img src="${(W.hero[s.key] || {}).img || ""}" alt=""><b>${esc(s.n)}</b><small>${a ? `Chiêu nhập môn: ${c ? esc(c.n) : "—"} · ${weaponTypeName(s)}` : `Chỉ nhận ${FAC_SEX[s.key] ? "nữ" : "nam"}`}</small></button>`;
    })
    .join("");
  modal(
    `<h3>Gia nhập môn phái <small>hệ ${SERIES[n]}</small></h3><p class="desc">Đã đạt cấp ${NOVICE_LV}. Chọn môn phái cùng hệ ${SERIES[n]}: nhận chiêu nhập môn và vũ khí của phái. Điểm kỹ năng tích lũy từ trước vẫn giữ.</p><div class="facpick">${e}</div>`,
    () => {
      document.querySelectorAll("#mBody [data-j]").forEach((s) => (s.onclick = () => joinFaction(s.dataset.j)));
    },
  );
}
const WTYPE_VI = {
    0: "kiếm",
    1: "đao",
    2: "côn",
    3: "thương",
    4: "chùy",
    5: "song đao",
    7: "ám khí",
    9: "quyền chưởng",
  },
  weaponTypeName = (n) => WTYPE_VI[n.wcode] || "vũ khí";
function joinFaction(n) {
  const t = FAC[n];
  if (!t || t.novice || !isNovice() || t.series !== heroSeries() || !facAllowed(t, S.sex)) return;
  ((S.fac = n),
    t.starter &&
      !S.sk[t.starter] &&
      ((S.sk[t.starter] = 1), (S.skPts = Math.max(0, S.skPts - 1)), (S.main = t.starter)));
  const e = clamp(Math.round(S.lvl / 12) + 1, 1, 10),
    s = facWeaponDP(t),
    a = makeItem(s[0], s[1], e, 0);
  if ((a && (S.inv.unshift(a), (invDirty = !0)), S.autoPts === !0)) {
    let c = 0;
    for (const i in S.attr) ((c += S.attr[i]), (S.attrPts += S.attr[i]), (S.attr[i] = 0));
    if (a) {
      const i = reqDeficit(a);
      for (const d in i) {
        const u = Math.min(i[d], S.attrPts);
        ((S.attr[d] += u), (S.attrPts -= u));
      }
    }
    ((R.dirty = !0),
      recalc(),
      a && reqOk(a) && equip(a, !0),
      (R.dirty = !0),
      recalc(),
      autoSpendSkills(),
      autoSpendAttrs(),
      typeof autoEquipAll == "function" && autoEquipAll(),
      c && log(`🌊 Vào phái: phân phối lại ${c} điểm tiềm năng theo võ công / vũ khí ${esc(t.n)}.`));
  } else a && reqOk(a) && equip(a, !0);
  (fillSlots(),
    (R.dirty = !0),
    recalc(),
    closeModal(!0),
    refresh(),
    renderPad(),
    save(),
    (R.banner = { t: 2.6, text: "Gia nhập " + t.n, sub: "Học võ công ở thẻ Võ công" }),
    log(`<b class="up">Gia nhập <span style="color:${SERIES_COL[t.series]}">${esc(t.n)}</span>!</b>`),
    uiSfx("levelup"));
}
const NOTICE_TXT = "JxOffline - Phi thương mại, ưu tiên giải trí trên chính thiết bị của mình";
function noticeModal() {
  (modal(
    `<h3>JxOffline</h3><p class="desc notice">${esc(NOTICE_TXT)}</p><div class="btnrow"><button class="btn" id="bNotice">Đã hiểu</button></div>`,
    () => {
      $("#bNotice").onclick = () => {
        (closeModal(!0), S.tut || tutorialModal(0));
      };
    },
  ),
    log(`<span class="dim">${esc(NOTICE_TXT)}</span>`));
}
function startFaction(n) {
  const t = FAC[n];
  ((S.fac = n),
    (S.sex = ["emei", "cuiyan"].includes(n) ? 1 : 0),
    (S.sexSet = 1),
    (S.name = S.name && S.name !== "Tân thủ" ? S.name : t.n),
    t.starter && ((S.sk[t.starter] = 1), (S.skPts = Math.max(0, S.skPts - 1)), (S.main = t.starter)),
    starterGear(),
    (R.dirty = !0),
    recalc(),
    (R.life = R.P.life),
    (R.mana = R.P.mana),
    loginCheck(),
    dotGift(),
    closeModal(!0),
    save(),
    showTab("log"),
    noticeModal(),
    log(`Gia nhập <b style="color:${SERIES_COL[t.series]}">${esc(t.n)}</b>. Bắt đầu hành tẩu giang hồ!`),
    log(
      `🌱 Nhận <b>Hỗ Trợ Tân Thủ</b>: vòng sáng hồi ${NEWBIE_REGEN.life * 100}% sinh lực + ${NEWBIE_REGEN.mana * 100}% nội lực mỗi giây, <b>+${NEWBIE_XP * 100}% kinh nghiệm</b> luyện cấp đến cấp ${NEWBIE_LV}.`,
    ));
}
function starterGear() {
  if (S.eq.weapon) return;
  const n = FAC[S.fac],
    t = n && !n.novice ? facWeaponDP(n) : [0, n && n.wcode >= 0 && n.wcode !== 9 ? n.wcode : 6],
    e = makeItem(t[0], t[1], 1, 0);
  e && (S.eq.weapon = e);
  const s = makeItem(2, sexPart(2, 0), 1, 0);
  s && sexOk(s) && (S.eq.armor = s);
}
