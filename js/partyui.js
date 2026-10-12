"use strict";
// Đồ đệ UI: character tabs 1 2 3 4 in the Nhân vật / Võ công / Hành trang windows (u20 desktop, u2m mobile and
// the classic tabs). Tab k renders and edits character k through withChar (js/party.js); the hotbar and the
// Q W E A keys keep controlling the main character.
const P_TABS = { char: 1, skill: 1, inv: 1 };
// selected character per window: with the u20 multi windows (js/ui20.js) Nhân vật / Võ công / Hành trang each
// keep their own tab; the classic one-tab-at-a-time panel shares PSEL like before
const P_WSEL = { char: 0, skill: 0, inv: 0 },
  pMulti = () => typeof U20W < "u" && U20W.on,
  pSelOf = (tab) => (pMulti() && tab in P_WSEL ? P_WSEL[tab] : PSEL),
  pSelSet = (tab, k) => (pMulti() && tab in P_WSEL ? (P_WSEL[tab] = k) : (PSEL = k));
function pFacIcon(k) {
  const g = typeof heroGfx == "function" ? heroGfx(charGet(k, "fac"), charGet(k, "sex")) : null;
  return g && g.img ? `<img src="${esc(g.img)}" alt="">` : "";
}
// something to do on character k (unspent potential, faction to join)
function pDot(k) {
  const pts = charGet(k, "attrPts") | 0,
    f = FAC[charGet(k, "fac")];
  return pts > 0 || (f && f.novice && (charGet(k, "lvl") | 0) >= NOVICE_LV);
}
function pTabsHTML(tab) {
  const active = partyIdx().filter((k) => k === 0 || !(typeof pBenched == "function" && pBenched(k)));
  if (active.length <= 1) return "";
  const sel = pSelOf(tab);
  return `<div class="dtabs ptabs">${active
    .map((k) => {
      const f = FAC[charGet(k, "fac")],
        ko = k && pAct(k).r.deadT > 0;
      return `<button data-pk="${k}" class="${k === sel ? "on" : ""}${ko ? " ko" : ""}" title="${esc(charGet(k, "name") || "")}${k ? " (Xuất chiến)" : " (nhân vật chính)"} · ${f ? esc(f.n) : ""} · cấp ${charGet(k, "lvl")}"><b class="pn">${k + 1}</b>${pFacIcon(k)}<span class="pnm" style="color:${f ? SERIES_COL[f.series] : "#ddd"}">${esc(charGet(k, "name") || "")}</span><small>${charGet(k, "lvl")}</small>${pDot(k) ? '<i class="gdot"></i>' : ""}</button>`;
    })
    .join(
      "",
    )}${sel ? `<button class="pmain" id="pMakeMain" title="Đổi đồ đệ này lên làm nhân vật chính (nhân vật chính hiện tại xuống làm đồ đệ)">Lên chính</button><button class="btn sm on" id="pToggleBench" style="margin-left:4px;padding:1px 6px;font-size:11px" title="Cho đồ đệ này vào hàng Dự bị (tạm nghỉ ngơi)">Dự bị</button>` : `<button class="btn sm" id="pOpenDuBi" style="margin-left:auto;padding:1px 6px;font-size:11px" title="Quản lý danh sách Dự bị / Xuất chiến">👥 Dự Bị</button>`}</div>`;
}
function pSelect(k, tab) {
  const v = clamp(k | 0, 0, partyN());
  (pSelSet(tab, v), (PT.stK = v), typeof uiSfx == "function" && uiSfx("click"), refresh());
}
// 4 skill slots of a disciple (the main's are on the hotbar): rotation pool used when it fights
function pSlotsHTML() {
  fillSlots();
  const L = learnedAttacks().sort((a, c) => SK[a].req - SK[c].req);
  return `<div class="pslots"><span class="dim small">Ô chiêu (xoay chiêu khi đánh)</span>${S.slots
    .map(
      (id, i) =>
        `<button class="psl${PT.slotI === i ? " on" : ""}" data-psl="${i}" title="Ô ${i + 1}${SK[id] ? ": " + esc(SK[id].n) : ""}">${SK[id] && SK[id].ic ? `<img src="${esc(SK[id].ic)}" alt="">` : ""}<u>${i + 1}</u></button>`,
    )
    .join("")}${
    PT.slotI >= 0
      ? `<div class="pslpick">${L.map((id) => `<button class="psl" data-pss="${id}" title="${esc(SK[id].n)}"><img src="${esc(SK[id].ic || "")}" alt=""><u>${S.sk[id] || 0}</u></button>`).join("") || '<small class="dim">Chưa học chiêu tấn công</small>'}<button class="btn sm" data-pss="-1">Bỏ trống</button></div>`
      : ""
  }</div>`;
}
function pRender(tab, fn) {
  // another window borrowing this renderer (Trợ Thủ › Nhặt đồ uses the bag one): main character, no tabs
  if (!partyOk() || !P_TABS[tab] || (pMulti() && U20W.rendering && U20W.rendering !== tab)) return fn();
  // called while a disciple is swapped in (a handler of its tab: "+" point, Đánh thường lock, skill popup's
  // "Chọn làm chiêu chính", auto-equip…): rendering right here would draw the tab without the character tabs
  // and with handlers NOT bound to that disciple (the next click — e.g. the main skill picker — then acted on
  // the main character). Re-render once back in the main context instead (party.js pFlush).
  if (PCTX) return void pDefer("pr_" + tab, () => ({ char: renderChar, skill: renderSkill, inv: renderInv })[tab]());
  if (pSelOf(tab) > partyN() || (pSelOf(tab) > 0 && typeof pBenched === "function" && pBenched(pSelOf(tab)))) {
    pSelSet(tab, 0);
  }
  const k = pSelOf(tab);
  withChar(k, () => {
    (k && (R.dirty || !R.P) && recalc(), fn());
    const root = $("#t-" + tab);
    root && tab === "skill" && k && FAC[S.fac] && !FAC[S.fac].novice && root.insertAdjacentHTML("beforeend", pSlotsHTML());
  });
  const root = $("#t-" + tab);
  if (!root) return;
  (root.querySelector(".ptabs") && root.querySelector(".ptabs").remove(),
    root.insertAdjacentHTML("afterbegin", pTabsHTML(tab)),
    root.querySelectorAll(".ptabs [data-pk]").forEach((b) => (b.onclick = () => pSelect(+b.dataset.pk, tab))));
  const ob = root.querySelector("#pOpenDuBi");
  ob && (ob.onclick = () => typeof duBiModal == "function" && duBiModal());
  const mm = root.querySelector("#pMakeMain");
  mm &&
    (mm.onclick = () =>
      modal(
        `<h3>Làm nhân vật chính</h3><p class="desc"><b>${esc(charGet(k, "name"))}</b> lên làm nhân vật chính (điều khiển, phím tắt, cưỡi ngựa, nhặt đồ); <b>${esc(S.name)}</b> xuống làm đồ đệ. Trang bị, kỹ năng, cấp của mỗi người giữ nguyên.</p><div class="btnrow"><button class="btn on" id="pMmOk">Đổi</button><button class="btn" id="pMmNo">Hủy</button></div>`,
        () => {
          (($("#pMmOk").onclick = () => {
            (closeModal(!0), swapMain(k));
          }),
            ($("#pMmNo").onclick = () => closeModal(!0)));
        },
      ));
  const tb = root.querySelector("#pToggleBench");
  tb &&
    (tb.onclick = () => {
      const sh = pSheet(k);
      if (sh) {
        sh.bench = true;
        pSelSet(tab, 0);
        if (PSEL === k) PSEL = 0;
        typeof toast == "function" && toast(`${charGet(k, "name")} vào hàng Dự Bị (nghỉ ngơi)`);
        typeof save == "function" && save();
        refresh();
      }
    });
  if (!k) return;
  // disciple-specific bits inside its context
  root.querySelectorAll("[data-psl]").forEach(
    (b) =>
      (b.onclick = () => {
        ((PT.slotI = PT.slotI === +b.dataset.psl ? -1 : +b.dataset.psl), refresh());
      }),
  );
  root.querySelectorAll("[data-pss]").forEach(
    (b) =>
      (b.onclick = () => {
        (assignSlot(PT.slotI, +b.dataset.pss), (PT.slotI = -1), refresh());
      }),
  );
  pBindCtx(root, k);
}
PT.slotI = -1;
{
  const rc = renderChar,
    rs = renderSkill,
    ri = renderInv;
  ((renderChar = () => pRender("char", rc)),
    (renderSkill = () => pRender("skill", rs)),
    (renderInv = () => pRender("inv", ri)));
}
// "Đồ đệ" activity tab (replaces the old monster pet "Đồng hành"): overview of the party
function partyBody() {
  if (!partyOk()) return '<p class="desc">Chưa có nhân vật.</p>';
  const rows = partyIdx()
    .map((k) =>
      withChar(k, () => {
        const f = FAC[S.fac],
          P = R.P,
          ko = R.deadT > 0;
        return `<div class="qrow"><span><b style="color:${partyCol[k]}">${k + 1}. ${esc(S.name)}</b>${k ? "" : ' <small class="cp">chính</small>'}<small>${f ? esc(f.n) : ""} · hệ ${SERIES[heroSeries()]} · cấp ${S.lvl}${rebornN() ? ` · CS ${rebornN()}` : ""} · ${P ? `sinh lực ${fmt(R.life)}/${fmt(P.life)} · ${esc(P.main.n)}` : ""}${ko ? ' · <span class="bad">trọng thương</span>' : ""}</small></span><small></small><span class="btnrow"><button class="btn sm" data-pv="${k}">Xem</button>${k ? `<button class="btn sm" data-pm="${k}" ${ko || (k && R.deadT > 0) ? "disabled" : ""}>Lên làm chính</button>` : ""}</span></div>`;
      }),
    )
    .join("");
  return `<p class="desc">Đồ đệ đi theo nhân vật chính, tự đánh quái gần đó bằng võ công của mình, nhận đủ kinh nghiệm mỗi quái hạ được. Mỗi người có hành trang riêng (nhân vật chính nhặt đồ; bấm vào món đồ → <b>Chuyển cho…</b> để đưa cho người khác), kho chung dùng chung; cộng điểm, học võ công, gán 4 ô chiêu ở thẻ <b>1 2 3 4</b> của bảng Nhân vật / Võ công / Hành trang. Trọng thương thì ${P_KO_T} giây sau hồi phục cạnh nhân vật chính (về thành: hồi ngay). Tối đa ${PARTY_MAX} nhân vật.</p>${ptCampHTML()}${rows}`;
}
// Màu tổ đội (JX1 camp colours, title.js PT_CAMP): one click = the name colour of the main + every disciple
// (also what other players see in shared towns, js/presence.js)
function ptCampHTML() {
  if (typeof PT_CAMP > "u") return "";
  const cur = ptCamp();
  return `<div class="qrow ptcamp" style="display:block"><span><b>Màu tổ đội</b><small>Màu tên của nhân vật chính và mọi đồ đệ.</small></span><div class="btnrow" style="margin-top:6px;gap:4px">${Object.entries(
    PT_CAMP,
  )
    .map(
      ([key, v]) =>
        `<button class="btn sm${key === cur ? " on" : ""}" data-ptc="${key}" title="${v.n}"><i style="display:inline-block;width:10px;height:10px;margin-right:4px;vertical-align:-1px;background:${v.c};border:1px solid #000;box-shadow:0 0 0 1px #fff4"></i><span style="color:${v.c}">${v.n}</span></button>`,
    )
    .join("")}</div></div>`;
}
// the "Màu tổ đội" row (Đồ đệ tab, character window F3): the colour is the party's, stored on the main character
function ptCampBind(root) {
  root &&
    root.querySelectorAll("[data-ptc]").forEach(
      (b) =>
        (b.onclick = () => {
          const v = b.dataset.ptc;
          if (typeof PT_CAMP > "u" || !PT_CAMP[v]) return;
          const set = () => ((S.ptCamp = v), save());
          (PCTX && typeof withMain == "function" ? withMain(set) : set(), typeof uiSfx == "function" && uiSfx("click"));
          document.querySelectorAll("[data-ptc]").forEach((x) => x.classList.toggle("on", x.dataset.ptc === v));
          typeof R != "undefined" && R && (R.dirty = !0);
        }),
    );
}
function partyBind(root, after) {
  if (!root) return;
  (root.querySelectorAll("[data-pv]").forEach(
    (b) =>
      (b.onclick = () => {
        (pSelSet("char", +b.dataset.pv),
          closeModal(!0),
          typeof u2Open == "function" ? u2Open("char") : showTab("char"));
      }),
  ),
    ptCampBind(root),
    root.querySelectorAll("[data-pm]").forEach(
      (b) =>
        (b.onclick = () => {
          (swapMain(+b.dataset.pm), after && after());
        }),
    ));
}
// Kho chung (shared stash): items move to / from the bag of the selected character (row of buttons in the
// "Đồ" tab; default: the character tab last selected in Nhân vật / Võ công / Hành trang)
if (typeof stashModal == "function") {
  const sm = stashModal;
  stashModal = (n) => {
    if (!partyOk() || !partyN()) return sm(n);
    const k = clamp(PT.stK != null ? PT.stK : PSEL, 0, partyN());
    withChar(k, () => sm(n));
    const b = $("#mBody"),
      inv = b && b.querySelector("#stInv");
    if (!inv) return;
    const h = inv.previousElementSibling;
    h &&
      h.insertAdjacentHTML(
        "beforebegin",
        `<div class="dtabs pstk"><small class="dim">Hành trang của:</small>${partyIdx()
          .map(
            (j) =>
              `<button data-stk="${j}" class="${j === k ? "on" : ""}"><b style="color:${partyCol[j]}">${j + 1}.</b> ${esc(charGet(j, "name") || "")} <small>${(charInv(j) || []).length}/${INV_MAX}</small></button>`,
          )
          .join("")}</div>`,
      );
    // plain handlers (not bound to the disciple's context): they only pick whose bag is shown
    b.querySelectorAll("[data-stk]").forEach(
      (x) =>
        (x.onclick = () => {
          PT.stK = +x.dataset.stk;
          setTimeout(() => stashModal(), 0);
        }),
    );
  };
}
// swapping the main character resets the selection (party.js sets PSEL = 0): same for every window
{
  const sm = swapMain;
  swapMain = (k) => {
    const r = sm(k);
    if (r && !PCTX && PSEL === 0 && Object.values(P_WSEL).some(Boolean)) {
      for (const t in P_WSEL) P_WSEL[t] = 0;
      typeof refresh == "function" && refresh();
    }
    return r;
  };
}
// shops buy into / sell from the main character's bag (the leader trades for the party)
for (const f of ["shopModal", "openNpcShop"])
  if (typeof window[f] == "function") {
    const o = window[f];
    window[f] = function (...a) {
      return withMain(() => o.apply(this, a));
    };
  }

function duBiModal() {
  if (!partyOk() || !partyN()) {
    typeof toast == "function" && toast("Chưa có đồ đệ trong tổ đội");
    return;
  }
  const rows = partyIdx()
    .slice(1)
    .map((k) => {
      const d = pSheet(k);
      if (!d) return "";
      const isB = typeof pBenched == "function" && pBenched(k);
      const f = FAC[charGet(k, "fac")];
      const col = f ? SERIES_COL[f.series] : "#ffd24a";
      return `<div class="card" style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;margin:8px 0;background:#181814;border:1px solid ${isB ? "#4a3328" : "#2a5438"}">
        <label style="display:flex;align-items:center;gap:12px;cursor:pointer;flex:1">
          <input type="checkbox" class="dubi-ck" data-k="${k}" ${isB ? "" : "checked"} style="width:20px;height:20px;accent-color:#ffd24a;cursor:pointer">
          <div>
            <div style="font-size:15px;font-weight:bold;color:${col}">${k}. ${esc(charGet(k, "name") || "")}</div>
            <small class="dim">${f ? esc(f.n) : ""} · Cấp ${charGet(k, "lvl")}</small>
          </div>
        </label>
        <div>
          <button class="btn sm ${isB ? "bad" : "ok"}" data-toggle="${k}" style="font-weight:bold;min-width:110px">
            ${isB ? "Dự Bị (Nghỉ)" : "✓ Xuất Chiến"}
          </button>
        </div>
      </div>`;
    })
    .join("");

  modal(
    `<h3>👥 Đội Hình Dự Bị <small>Chọn đồ đệ tham gia xuất chiến</small></h3>
    <p class="desc">Tích chọn <b>[✓]</b> để đồ đệ cùng xuất chiến đánh quái. Bỏ chọn để đưa vào hàng <b>Dự Bị</b> (tạm nghỉ ngơi, không ra trận).</p>
    <div class="dubilist" style="max-height:340px;overflow-y:auto;padding-right:4px">${rows}</div>
    <div class="btnrow" style="margin-top:12px">
      <button class="btn" id="dubiAll">Tất cả xuất chiến</button>
      <button class="btn" id="dubiNone">Dự bị tất cả (Chỉ 1 mình)</button>
      <button class="btn" onclick="closeModal(!0)">Đóng</button>
    </div>`,
    () => {
      const applyBench = (k, val) => {
        const sh = pSheet(k);
        if (sh) {
          sh.bench = val;
          if (!val) S.partyAway = false;
          if (val) {
            for (const t in P_WSEL) {
              if (P_WSEL[t] === k) P_WSEL[t] = 0;
            }
            if (PSEL === k) PSEL = 0;
          }
          typeof toast == "function" && toast(sh.bench ? `${charGet(k, "name")} vào hàng Dự Bị (nghỉ ngơi)` : `${charGet(k, "name")} tham gia xuất chiến!`);
          typeof save == "function" && save();
          refresh();
          duBiModal();
        }
      };
      document.querySelectorAll(".dubi-ck").forEach((ck) => {
        ck.onchange = () => applyBench(+ck.dataset.k, !ck.checked);
      });
      document.querySelectorAll("[data-toggle]").forEach((btn) => {
        btn.onclick = () => {
          const k = +btn.dataset.toggle;
          const isB = typeof pBenched == "function" && pBenched(k);
          applyBench(k, !isB);
        };
      });
      const bAll = $("#dubiAll");
      if (bAll)
        bAll.onclick = () => {
          S.partyAway = false;
          for (let i = 1; i <= partyN(); i++) {
            const sh = pSheet(i);
            if (sh) sh.bench = false;
          }
          typeof toast == "function" && toast("Tất cả đồ đệ cùng xuất chiến!");
          typeof save == "function" && save();
          refresh();
          duBiModal();
        };
      const bNone = $("#dubiNone");
      if (bNone)
        bNone.onclick = () => {
          for (let i = 1; i <= partyN(); i++) {
            const sh = pSheet(i);
            if (sh) sh.bench = true;
          }
          for (const t in P_WSEL) P_WSEL[t] = 0;
          PSEL = 0;
          typeof toast == "function" && toast("Tất cả đồ đệ vào hàng Dự Bị!");
          typeof save == "function" && save();
          refresh();
          duBiModal();
        };
    },
  );
}
window.duBiModal = duBiModal;
