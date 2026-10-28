"use strict";

const HALO_DEFS = {
  bj: { f: "img/halo/bj.webp", n: 10, w: 156, h: 141, ax: 76, ay: 107, ms: 150, name: "Vòng sáng Bá Chủ Hoàng Kim", title: "Vô Song Vương Giả", titleKey: "admin", life: 15, luck: 15 },
  yl: { f: "img/halo/yl.webp", n: 10, w: 168, h: 139, ax: 84, ay: 98, ms: 180, name: "Vòng sáng Yến Lạc Lam Vũ", title: "Chưởng Môn", titleKey: "mp4", life: 10, luck: 10 },
  ab: { f: "img/halo/ab.webp", n: 10, w: 320, h: 191, ax: 158, ay: 99, ms: 150, name: "Vòng sáng Ám Dạ Bát Quái", title: "Trường Bạch Sơn Chủ", titleKey: "zone16", life: 12, luck: 12 },
  zw: { f: "img/halo/zw.webp", n: 11, w: 320, h: 165, ax: 160, ay: 67, ms: 113, name: "Vòng sáng Tử Vân (Boss TG)", title: "TOP 1 BTG", titleKey: "top1_btg", life: 20, luck: 20 },
  dg: { f: "img/halo/dg.webp", n: 10, w: 156, h: 145, ax: 77, ay: 106, ms: 100, name: "Vòng sáng Đồ Long (Võ Lâm Minh Chủ)", title: "VÕ LÂM MINH CHỦ", titleKey: "vlmc", life: 15, luck: 15 },
  ndg: { f: "img/halo/ndg.webp", n: 15, w: 145, h: 128, ax: 72, ay: 80, ms: 40, name: "Vòng sáng Thiên Lam Thần Quang", life: 15, luck: 15 },
  nab: { f: "img/halo/nab.webp", n: 15, w: 179, h: 148, ax: 88, ay: 106, ms: 70, name: "Vòng sáng Nguyệt Ảnh Hoàng Kim", life: 12, luck: 12 },
  nbj: { f: "img/halo/nbj.webp", n: 20, w: 128, h: 128, ax: 64, ay: 84, ms: 40, name: "Vòng sáng Bích Hải Tinh Luân", life: 10, luck: 10 },
  nyl: { f: "img/halo/nyl.webp", n: 11, w: 103, h: 116, ax: 51, ay: 78, ms: 50, name: "Vòng sáng Hoàng Kim Hoa Quan", life: 8, luck: 8 }
};
const xs = HALO_DEFS;
const gz = {
  bj: [14, 40, 127, 96],
  yl: [13, 16, 142, 117],
  ab: [105, 3, 110, 112],
  zw: [120, 47, 80, 41],
  dg: [14, 10, 127, 130],
  ndg: [2, 2, 140, 117],
  nab: [24, 34, 155, 111],
  nbj: [17, 44, 94, 75],
  nyl: [20, 53, 64, 47]
};

const TITLE_HALO_MAP = {
  vlmc: { haloKey: "dg", titleName: "VÕ LÂM MINH CHỦ" },
  top1_btg: { haloKey: "zw", titleName: "TOP 1 BTG" }
};

// Halos available for rental in Kỳ Trân Các (50 KNB / 3 ngày, cộng dồn)
// Excluded by request: cs5 (chuyển sinh 5), top1_btg / zw, vlmc / dg
const KTC_HALOS = [
  { k: "ndg", name: "Vòng sáng Thiên Lam Thần Quang", desc: "Vòng sáng lam diễm thần quang rực rỡ kỳ ảo, uy dũng phi thường", life: 15, luck: 15 },
  { k: "nab", name: "Vòng sáng Nguyệt Ảnh Hoàng Kim", desc: "Vòng sáng trăng khuyết hoàng kim lấp lánh tuyệt mỹ", life: 12, luck: 12 },
  { k: "nbj", name: "Vòng sáng Bích Hải Tinh Luân", desc: "Vòng sáng tinh vân xanh biếc luân chuyển hộ thể", life: 10, luck: 10 },
  { k: "nyl", name: "Vòng sáng Hoàng Kim Hoa Quan", desc: "Vòng sáng hoa quan hoàng kim tao nhã quý phái", life: 8, luck: 8 },
  { k: "bj", name: "Vòng sáng Bá Chủ Hoàng Kim", desc: "Vòng sáng đế vương hoàng kim tỏa khí phách ngút trời", life: 15, luck: 15 },
  { k: "yl", name: "Vòng sáng Yến Lạc Lam Vũ", desc: "Vòng sáng lam vũ tinh trần thanh thoát thoát tục", life: 10, luck: 10 },
  { k: "ab", name: "Vòng sáng Ám Dạ Bát Quái", desc: "Vòng sáng cực quang bát quái âm dương huyền diệu", life: 12, luck: 12 }
];
window.KTC_HALOS = KTC_HALOS;

// Check if player is wearing the title "VÕ LÂM MINH CHỦ"
function isHeroWearingVlmc() {
  const tw = typeof titleWorn === "function" ? titleWorn() : null;
  if (tw) return tw[0] === "vlmc";
  const rw = typeof RW === "function" ? RW() : (S && S.rw);
  return !!(rw && rw.title === "vlmc");
}
window.isHeroWearingVlmc = isHeroWearingVlmc;

function purgeStaleTitles(rw) {
  if (!rw) return;
  if (rw.titles) {
    delete rw.titles.bachu;
    delete rw.titles.tuyetthe;
    delete rw.titles.thanlong;
  }
  if (rw.titleExp) {
    delete rw.titleExp.vlmc;
    delete rw.titleExp.bachu;
    delete rw.titleExp.tuyetthe;
    delete rw.titleExp.thanlong;
  }
  if (rw.title === "bachu" || rw.title === "tuyetthe" || rw.title === "thanlong") {
    rw.title = "";
  }
}

// Preload halo images
const HALO_IMGS = {};
for (const k in HALO_DEFS) {
  const im = new Image();
  im.src = HALO_DEFS[k].f;
  HALO_IMGS[k] = im;
}

/**
 * Draws animated halo sprite sheet at (x, y)
 */
function drawHalo(ctx, haloKey, x, y, alpha = 1) {
  const g = xs[haloKey];
  if (!g) return;
  const im = HALO_IMGS[haloKey] || (typeof img === "function" ? img(g.f) : null);
  if (!im || !im.complete || !im.naturalWidth) return;
  const r = Math.floor(performance.now() / g.ms) % g.n;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(
    im,
    r * g.w, 0, g.w, g.h,
    Math.round(x - g.ax), Math.round(y - g.ay),
    g.w, g.h
  );
  ctx.restore();
}

/**
 * Gets currently active hero halo.
 * 1. Checks S.halo (rented/owned directly via KTC).
 * 2. Fallback to special achievement titles (VLMC dg, TOP 1 BTG zw).
 */
function getHeroHalo() {
  if (typeof S !== "object" || !S) return null;
  const rw = typeof RW === "function" ? RW() : (S && S.rw);

  // 1. Explicitly equipped halo from S.halo (purchased/rented in KTC or granted by admin)
  if (S.halo && xs[S.halo]) {
    const k = S.halo;
    const def = xs[k];
    const exp = (S.haloExp && S.haloExp[k]) || 0;
    const isPerm = exp === -1 || (S.haloPerm && S.haloPerm[k]);
    if (isPerm) {
      return {
        k: k,
        name: def.name,
        u: 0,
        life: def.life || 10,
        luck: def.luck || 10
      };
    }
    if (exp) {
      if (Date.now() >= exp) {
        if (S.haloExp) delete S.haloExp[k];
        S.halo = "";
      } else {
        return {
          k: k,
          name: def.name,
          u: exp,
          life: def.life || 10,
          luck: def.luck || 10
        };
      }
    } else {
      return {
        k: k,
        name: def.name,
        u: 0,
        life: def.life || 10,
        luck: def.luck || 10
      };
    }
  }

  // 2. Special achievement titles (VLMC and TOP 1 BTG only)
  const worn = typeof titleWorn === "function" ? titleWorn() : null;
  const wornKey = worn ? worn[0] : (rw && rw.title ? rw.title : "");

  if (wornKey === "vlmc") {
    const def = xs.dg;
    return { k: "dg", name: def ? def.name : "Võ Lâm Minh Chủ", u: 0, life: 15, luck: 15 };
  }
  if (wornKey === "top1_btg") {
    const exp = rw && rw.titleExp && rw.titleExp.top1_btg;
    if (exp && Date.now() < exp) {
      const def = xs.zw;
      return { k: "zw", name: def ? def.name : "TOP 1 BTG", u: exp, life: 20, luck: 20 };
    }
  }

  return null;
}

/**
 * Draws active halo under hero feet
 */
function drawActiveHalo(ctx, x, y, alpha = 0.96) {
  const h = getHeroHalo();
  if (h && xs[h.k]) {
    drawHalo(ctx, h.k, x, y, alpha);
    return true;
  }
  return false;
}

/**
 * Adds halo bonus stats to player attributes
 */
function haloAttr(n) {
  const h = typeof getHeroHalo === "function" ? getHeroHalo() : null;
  if (!h) return;
  if (h.life && typeof addAttr === "function") addAttr(n, "lifemax_p", [h.life, 0, 0]);
  if (h.luck && typeof addAttr === "function") addAttr(n, "lucky_v", [h.luck, 0, 0]);
}
window.haloAttr = haloAttr;

/**
 * Rent a halo in Kỳ Trân Các (50 KNB / 3 ngày, cộng dồn) - PURE HALO, NO TITLES
 */
function rentHalo(haloKey) {
  if (!xs[haloKey]) return false;
  if (haloKey === "zw" || haloKey === "dg") {
    toast("Vòng sáng này là phần thưởng đặc biệt, không bán trong Kỳ Trân Các!");
    return false;
  }
  const exp = (S.haloExp && S.haloExp[haloKey]) || 0;
  const isPerm = exp === -1 || (S.haloPerm && S.haloPerm[haloKey]);
  if (isPerm) {
    toast("Bạn đã sở hữu vĩnh viễn vòng sáng này!");
    return false;
  }
  const cost = 50;
  if ((S.knb || 0) < cost) {
    toast("Không đủ Kim Nguyên Bảo (cần 50 KNB)");
    return false;
  }
  const def = xs[haloKey];

  S.knb -= cost;

  const DURATION = 3 * 86400 * 1000; // 3 days in ms
  S.haloExp = S.haloExp || {};

  const currentExp = S.haloExp[haloKey] || 0;
  const baseTime = (currentExp > Date.now()) ? currentExp : Date.now();
  const newExp = baseTime + DURATION;

  S.haloExp[haloKey] = newExp;
  S.halo = haloKey; // Automatically equip

  RW().stat.ktc = (RW().stat.ktc || 0) + 1;
  if (typeof R === "object" && R) R.dirty = true;
  if (typeof recalc === "function") recalc();
  if (typeof save === "function") save();
  if (typeof refresh === "function") refresh();
  if (typeof uiSfx === "function") uiSfx("learn");

  const remStr = formatDuration(newExp);
  toast(`✨ Đã thuê thành công ${def.name}! Hạn dùng: ${remStr}`);
  if (typeof log === "function") {
    log(`🏮 Kỳ Trân Các: thuê <b>${def.name}</b> (−50 Kim Nguyên Bảo) · Hạn dùng còn: <b>${remStr}</b> (+${def.life}% sinh lực, +${def.luck}% may mắn)`);
  }
  return true;
}
window.rentHalo = rentHalo;

/**
 * Toggles wearing a rented or owned halo
 */
function toggleWearHalo(haloKey) {
  if (!xs[haloKey]) return;
  const exp = (S.haloExp && S.haloExp[haloKey]) || 0;
  const isPerm = exp === -1 || (S.haloPerm && S.haloPerm[haloKey]);
  if (!isPerm && exp && Date.now() >= exp) {
    toast("Vòng sáng này đã hết hạn, hãy thuê thêm!");
    return;
  }
  if (!isPerm && !exp) {
    toast("Bạn chưa sở hữu hoặc thuê vòng sáng này!");
    return;
  }
  const def = xs[haloKey];
  if (S.halo === haloKey) {
    S.halo = "";
    toast(`Đã tháo ${def.name}`);
  } else {
    S.halo = haloKey;
    toast(`Đã đeo ${def.name}`);
  }
  if (typeof R === "object" && R) R.dirty = true;
  if (typeof recalc === "function") recalc();
  if (typeof save === "function") save();
  if (typeof refresh === "function") refresh();
}
window.toggleWearHalo = toggleWearHalo;

/**
 * Grants a halo to the player (permanent or temporary)
 */
function grantHalo(haloKey, perm = true, days = 3) {
  if (!xs[haloKey]) return false;
  S.haloExp = S.haloExp || {};
  S.haloPerm = S.haloPerm || {};
  if (perm) {
    S.haloPerm[haloKey] = 1;
    S.haloExp[haloKey] = -1;
  } else {
    const DURATION = (days || 3) * 86400 * 1000;
    const currentExp = S.haloExp[haloKey] || 0;
    const baseTime = (currentExp > Date.now()) ? currentExp : Date.now();
    S.haloExp[haloKey] = baseTime + DURATION;
  }
  S.halo = haloKey; // Automatically equip
  if (typeof R === "object" && R) R.dirty = true;
  if (typeof recalc === "function") recalc();
  if (typeof save === "function") save();
  if (typeof refresh === "function") refresh();
  return true;
}
window.grantHalo = grantHalo;

/**
 * Revokes a halo from the player
 */
function revokeHalo(haloKey) {
  if (S.haloPerm) delete S.haloPerm[haloKey];
  if (S.haloExp) delete S.haloExp[haloKey];
  if (S.halo === haloKey) S.halo = "";
  if (typeof R === "object" && R) R.dirty = true;
  if (typeof recalc === "function") recalc();
  if (typeof save === "function") save();
  if (typeof refresh === "function") refresh();
  return true;
}
window.revokeHalo = revokeHalo;

/**
 * Equips a title and activates its own halo
 */
window.wearTitleHalo = function(titleKey, refreshCb) {
  const rw = typeof RW === "function" ? RW() : (S && S.rw);
  if (!rw) return;
  rw.title = rw.title === titleKey ? "" : titleKey;
  if (typeof R === "object" && R) R.dirty = true;
  if (typeof recalc === "function") recalc();
  if (typeof save === "function") save();
  if (typeof refresh === "function") refresh();
  if (typeof refreshCb === "function") {
    refreshCb();
  } else if (typeof ktcModal === "function" && document.querySelector("#ktcTabs") && document.querySelector("#ktcTabs [data-kt='halo']")) {
    ktcModal("halo");
  } else if (typeof ktcModal20 === "function" && document.querySelector(".u2shop")) {
    ktcModal20("halo");
  } else {
    openLequanHaloModal();
  }
};

/**
 * Returns pending halos from haloBox
 */
function getPendingHalos() {
  if (!S || !S.rw || typeof S.rw.haloBox !== "object") return [];
  const box = S.rw.haloBox || {};
  const now = Date.now();
  return Object.keys(box)
    .map(k => Object.assign({ id: k }, box[k]))
    .filter(item => item && xs[item.k] && (!item.exp || item.exp > now));
}

/**
 * Adds a pending halo to hero's haloBox for Trung Hiếu / Lễ Quan claiming
 */
function depositHalo(haloKey, titleName, days = 0, src = "wb", npc = "lq") {
  S.rw = S.rw || {};
  S.rw.haloBox = S.rw.haloBox || {};
  const id = Date.now();
  const def = xs[haloKey] || xs.zw;
  const isExpiring = (haloKey === "zw");
  const finalDays = isExpiring ? 1 : 0;
  S.rw.haloBox[id] = {
    src: src,
    k: haloKey,
    tn: titleName || def.title,
    tc: "gold",
    days: finalDays,
    life: def.life || 10,
    luck: def.luck || 10,
    t: id,
    exp: id + 86400 * 1000 * 2, // 48h to claim
    npc: npc
  };
  if (typeof save === "function") save();
}

/**
 * Format remaining duration
 */
function formatDuration(targetTime) {
  if (!targetTime || targetTime === -1 || targetTime === Infinity || targetTime > 4000000000000) return "Vĩnh viễn";
  const rem = Math.max(0, Math.floor((targetTime - Date.now()) / 1000));
  const days = Math.floor(rem / 86400);
  const hours = Math.floor((rem % 86400) / 3600);
  const mins = Math.floor((rem % 3600) / 60);
  if (days > 0) return `${days} ngày ${hours} giờ`;
  if (hours > 0) return `${hours} giờ ${mins} phút`;
  if (mins > 0) return `${mins} phút`;
  return "Đã hết hạn";
}

/**
 * NPC Trung Hiếu (Kiêm nhiệm Lễ Quan) Dialogue for claiming & managing World Boss halo
 */
function openLequanHaloModal() {
  const active = getHeroHalo();
  const pending = getPendingHalos();
  const rw = typeof RW === "function" ? RW() : (S && S.rw);
  const titles = (rw && rw.titles) || {};
  const wornTitle = (rw && rw.title) || "";

  // Clean stale titles
  purgeStaleTitles(rw);

  let body = `
    <div style="padding:10px;color:#f3e2b3;font-size:14px;line-height:1.6">
      <p style="margin-bottom:12px">
        <b style="color:#bf55ec">Trung Hiếu:</b> Ta kiêm nhiệm trọng trách của <b>Lễ Quan</b>: 
        quản lý và kích hoạt <b>Vòng Sáng</b> cho các bậc anh hùng hiệp khách! 
        Vòng sáng Đồ Long (Võ Lâm Minh Chủ) là <b>vĩnh viễn</b>; Vòng sáng Tử Vân (TOP 1 Boss Thế Giới) có thời hạn <b>1 ngày</b>. 
        Tất cả các loại Vòng Sáng rực rỡ khác quý nhân sĩ có thể đến thuê trực tiếp tại <b>Kỳ Trân Các</b> (thời hạn 3 ngày với giá 50 Kim Nguyên Bảo)!
      </p>
  `;

  if (active) {
    const def = xs[active.k];
    body += `
      <div style="background:rgba(255,215,140,0.08);border:1px solid #b08a3a;border-radius:6px;padding:8px 12px;margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:10px">
          ${renderHaloBadge(active.k, 32)}
          <div>
            <div style="font-weight:bold;color:#ffd700">Đang mang: ${def ? def.name : "Vòng sáng"}</div>
            <div style="font-size:12px;color:#bbb">${active.u ? `Thời hạn: còn <b>${formatDuration(active.u)}</b>` : 'Thời hạn: <b>Vĩnh viễn</b>'}</div>
            <div style="font-size:12px;color:#8fe08a">+${active.life}% sinh lực · +${active.luck}% may mắn</div>
          </div>
        </div>
      </div>
    `;
  } else {
    body += `
      <div style="background:rgba(255,255,255,0.04);border:1px dashed #665;border-radius:6px;padding:8px 12px;margin-bottom:12px;color:#aaa;font-size:13px">
        <i>Hiện chưa đeo Vòng Sáng. Hãy chọn đeo Vòng Sáng bên dưới hoặc ghé thăm Kỳ Trân Các để thuê!</i>
      </div>
    `;
  }

  // Owned / Rented / Permanent halos list
  const ownedList = [];
  for (const haloKey of Object.keys(xs)) {
    const def = xs[haloKey];
    const exp = (S.haloExp && S.haloExp[haloKey]) || 0;
    const isPerm = exp === -1 || (S.haloPerm && S.haloPerm[haloKey]);
    if (isPerm || (exp && exp > Date.now())) {
      ownedList.push({ haloKey, def, isRented: true, isPerm: isPerm, exp: isPerm ? 0 : exp });
    }
  }
  for (const tk in TITLE_HALO_MAP) {
    if (titles[tk]) {
      const haloKey = TITLE_HALO_MAP[tk].haloKey;
      const def = xs[haloKey];
      const exp = rw && rw.titleExp && rw.titleExp[tk];
      if (!exp || exp > Date.now()) {
        if (!ownedList.some(o => o.haloKey === haloKey)) {
          ownedList.push({ haloKey, def, isTitle: true, titleKey: tk, exp: exp || 0 });
        }
      }
    }
  }

  if (ownedList.length > 0) {
    body += `
      <h4 style="color:#ffd700;margin:12px 0 6px">👑 Vòng Sáng đã sở hữu (${ownedList.length})</h4>
      <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px">
    `;
    ownedList.forEach(item => {
      const isWorn = item.isRented ? (S.halo === item.haloKey) : (wornTitle === item.titleKey);
      const actionFn = item.isRented ? `toggleWearHalo('${item.haloKey}');openLequanHaloModal()` : `wearTitleHalo('${item.titleKey}')`;
      body += `
        <div style="display:flex;align-items:center;justify-content:space-between;background:rgba(0,0,0,0.25);border:1px solid ${isWorn ? '#ffd700' : '#554'};border-radius:6px;padding:6px 10px">
          <div style="display:flex;align-items:center;gap:8px">
            ${renderHaloBadge(item.haloKey, 26)}
            <div>
              <b style="color:${isWorn ? '#ffd700' : '#e6d0a5'}">${item.def.name}</b>
              <div style="font-size:12px;color:#999">${item.exp ? `Còn <b>${formatDuration(item.exp)}</b>` : '<b>Vĩnh viễn</b>'}</div>
            </div>
          </div>
          <button class="btn sm${isWorn ? ' on' : ''}" onclick="${actionFn}">${isWorn ? 'Đang đeo' : 'Đeo ngay'}</button>
        </div>
      `;
    });
    body += `</div>`;
  }

  if (pending.length > 0) {
    body += `
      <h4 style="color:#ffd700;margin:10px 0 6px">🎁 Vòng sáng chờ nhận (${pending.length})</h4>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px">
    `;
    pending.forEach(p => {
      const def = xs[p.k];
      const durLabel = p.k === "zw" ? "1 ngày" : "Vĩnh viễn";
      body += `
        <div style="display:flex;align-items:center;justify-content:space-between;background:rgba(0,0,0,0.3);border:1px solid #7a5a22;border-radius:6px;padding:8px 12px">
          <div style="display:flex;align-items:center;gap:8px">
            ${renderHaloBadge(p.k, 28)}
            <div>
              <b style="color:#ffe9a6">${def ? def.name : "Vòng sáng Boss Thế Giới"}</b>
              <div style="font-size:12px;color:#aaa">Hạn dùng <b>${durLabel}</b> · Hạn nhận còn ${formatDuration(p.exp)}</div>
            </div>
          </div>
          <button class="btn sm on" onclick="claimHaloItem('${p.id}')">Nhận ngay</button>
        </div>
      `;
    });
    body += `</div>`;
  } else if (!ownedList.length) {
    body += `<p style="color:#999;font-size:13px;margin:10px 0">Hiện tại bạn chưa sở hữu vòng sáng nào từ Boss Thế Giới hoặc Lễ Quan.</p>`;
  }

  body += `
    <div class="btnrow" style="text-align:center;margin-top:14px">
      <button class="btn" onclick="closeModal(true)">Đóng</button>
    </div>
  </div>`;

  if (typeof openModal === "function") {
    openModal(body);
  } else if (typeof modal === "function") {
    modal(body);
  }
}

window.claimHaloItem = function(id) {
  if (!S || !S.rw || !S.rw.haloBox || !S.rw.haloBox[id]) return;
  const p = S.rw.haloBox[id];
  wearHalo(p.k, p.tn, p.days, p.src);
  delete S.rw.haloBox[id];
  if (typeof save === "function") save();
  openLequanHaloModal();
};

/**
 * Returns HTML badge for reward table preview
 */
function renderHaloBadge(key, size = 26) {
  const a = xs[key];
  const s = gz[key];
  if (!a || !s) return '<i class="rwh">✨</i>';
  const g = Math.min(size / s[3], (size * 1.5) / s[2]);
  const A = r => `${+(r * g).toFixed(1)}px`;
  return `<i class="rwh" style="display:inline-block;vertical-align:middle;width:${A(s[2])};height:${A(s[3])};background-image:url(${a.f});background-size:${A(a.n * a.w)} ${A(a.h)};background-position:-${A(s[0])} -${A(s[1])}"></i>`;
}

/**
 * Number of Rương Vòng Sáng in player's inventory
 */
function haloBoxHave() {
  return typeof matHave === "function" ? matHave("misc", "rvongsang") : 0;
}
window.haloBoxHave = haloBoxHave;

/**
 * Open halo selector modal when using Rương Vòng Sáng (from bag or KTC)
 */
function openHaloSelectorModal() {
  const boxCount = haloBoxHave();
  const currentWorn = S.halo || "";
  const halos = typeof KTC_HALOS !== "undefined" ? KTC_HALOS : [];

  let body = `
    <div style="padding:10px;color:#f3e2b3;font-size:14px;line-height:1.6">
      <div style="background:linear-gradient(135deg,rgba(255,215,0,0.18),rgba(40,25,10,0.85));border:1.5px solid #ffd700;box-shadow:0 0 12px rgba(255,215,0,0.25);border-radius:6px;padding:12px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:12px">
          <img src="img/ep/box2.png" alt="" style="width:44px;height:44px;image-rendering:pixelated">
          <div>
            <div style="font-size:15px;color:#ffd700;font-weight:bold">🎁 Rương Vòng Sáng Kỳ Bí</div>
            <div style="font-size:12px;color:#ddd;margin-top:2px">
              Tự do chọn 1 Vòng Sáng tuyệt mỹ dưới đây để kích hoạt hoặc <b>cộng dồn 3 ngày</b> (+15% Sinh Lực, +15% May Mắn)!
            </div>
          </div>
        </div>
        <div style="text-align:right;white-space:nowrap;padding-left:10px">
          <div style="font-size:11px;color:#bbb">Số rương trong túi:</div>
          <b style="color:#ffd700;font-size:16px">${boxCount} Rương</b>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:8px;max-height:55vh;overflow-y:auto;padding-right:2px">
  `;

  halos.forEach(item => {
    const exp = (S.haloExp && S.haloExp[item.k]) || 0;
    const isPerm = exp === -1 || (S.haloPerm && S.haloPerm[item.k]);
    const isActive = isPerm || (exp && exp > Date.now());
    const isWorn = currentWorn === item.k && isActive;
    const durStr = isPerm
      ? `<b style="color:#ffd700">Vĩnh viễn</b>`
      : (exp && exp > Date.now() ? `Còn <b style="color:#8fe08a">${formatDuration(exp)}</b>` : `<span style="color:#888">Chưa kích hoạt</span>`);

    body += `
      <div style="background:rgba(0,0,0,0.4);border:1.5px solid ${isWorn ? '#ffd700' : isActive ? '#55aa77' : '#554433'};border-radius:6px;padding:10px 12px;display:flex;align-items:center;gap:12px;box-shadow:${isWorn ? '0 0 10px rgba(255,215,0,0.3)' : 'none'}">
        <div style="width:48px;height:48px;min-width:48px;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);border:1px solid ${isWorn ? '#ffd700' : '#444'};border-radius:6px">
          ${renderHaloBadge(item.k, 38)}
        </div>
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px">
            <b style="color:${isWorn ? '#ffd700' : '#ffe8a8'};font-size:13px">${esc(item.name)}</b>
            ${isWorn ? '<span style="color:#ffd700;font-size:10px;padding:1px 6px;border:1px solid #ffd700;border-radius:3px">Đang đeo</span>' : ''}
          </div>
          <div style="font-size:11px;color:#ccc;margin:2px 0">${esc(item.desc)}</div>
          <div style="font-size:11px;display:flex;align-items:center;gap:10px">
            <span style="color:#8fe08a">+${item.life}% HP · +${item.luck}% May mắn</span>
            <span style="color:#aaa">| ${durStr}</span>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:5px;align-items:flex-end;min-width:110px">
          ${boxCount > 0 ? `
            <button class="btn sm on" onclick="chooseHaloFromBox('${item.k}')" style="background:#ffd700;color:#000;font-weight:bold;padding:5px 12px;font-size:12px;white-space:nowrap">
              🎁 Mở Chọn (+3 ngày)
            </button>
          ` : `
            <button class="btn sm knb" onclick="ktcBuyHaloAndChoose('${item.k}')" style="padding:5px 10px;font-size:11px;font-weight:bold;white-space:nowrap">
              Mua 50 KNB (+3 ngày)
            </button>
          `}
          ${isActive ? `
            <button class="btn sm" onclick="toggleWearHalo('${item.k}');openHaloSelectorModal()" style="padding:3px 10px;font-size:11px;white-space:nowrap">
              ${isWorn ? 'Tháo vòng sáng' : 'Đeo ngay'}
            </button>
          ` : ''}
        </div>
      </div>
    `;
  });

  body += `
      </div>
      <div style="margin-top:12px;display:flex;align-items:center;justify-content:space-between">
        <span class="dim small">• Mở 1 Rương Vòng Sáng sẽ kích hoạt hoặc cộng dồn thêm 3 ngày hạn dùng cho Vòng Sáng đã chọn.</span>
        <button class="btn" onclick="closeModal(true)">Đóng</button>
      </div>
    </div>
  `;

  if (typeof openModal === "function") {
    openModal(body);
  } else if (typeof modal === "function") {
    modal(body);
  }
}
window.openHaloSelectorModal = openHaloSelectorModal;
window.haloBoxUse = openHaloSelectorModal;

/**
 * Consumes 1 Rương Vòng Sáng and grants 3 days (cumulative) of the chosen halo
 */
function chooseHaloFromBox(haloKey) {
  if (haloBoxHave() < 1) {
    toast("Bạn không còn Rương Vòng Sáng trong túi!");
    return false;
  }
  const def = xs[haloKey];
  if (!def) return false;

  matAdd("misc", "rvongsang", -1);

  const DURATION = 3 * 86400 * 1000;
  S.haloExp = S.haloExp || {};
  const currentExp = S.haloExp[haloKey] || 0;
  const baseTime = (currentExp > Date.now()) ? currentExp : Date.now();
  const newExp = baseTime + DURATION;

  S.haloExp[haloKey] = newExp;
  S.halo = haloKey; // Automatically equip

  if (typeof R === "object" && R) R.dirty = true;
  if (typeof recalc === "function") recalc();
  if (typeof save === "function") save();
  if (typeof refresh === "function") refresh();
  if (typeof uiSfx === "function") uiSfx("learn");

  const remStr = formatDuration(newExp);
  toast(`✨ Mở Rương thành công: Nhận ${def.name}! Hạn dùng còn: ${remStr}`);
  if (typeof log === "function") {
    log(`🎁 Mở <b>Rương Vòng Sáng</b>: kích hoạt <b>${def.name}</b> (+3 ngày) · Hạn dùng còn: <b>${remStr}</b> (+${def.life}% sinh lực, +${def.luck}% may mắn)`);
  }

  openHaloSelectorModal();
  return true;
}
window.chooseHaloFromBox = chooseHaloFromBox;

/**
 * Quick buy from KTC and immediately choose halo
 */
function ktcBuyHaloAndChoose(haloKey) {
  const cost = 50;
  if ((S.knb || 0) < cost) {
    toast("Không đủ Kim Nguyên Bảo (cần 50 KNB)");
    return false;
  }
  S.knb -= cost;
  matAdd("misc", "rvongsang", 1);
  chooseHaloFromBox(haloKey);
  return true;
}
window.ktcBuyHaloAndChoose = ktcBuyHaloAndChoose;
