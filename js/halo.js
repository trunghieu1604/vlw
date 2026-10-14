"use strict";

const HALO_DEFS = {
  bj: { f: "img/halo/bj.webp", n: 10, w: 156, h: 141, ax: 76, ay: 107, ms: 150, name: "Vòng sáng Bá Chủ", title: "VÕ LÂM MINH CHỦ", titleKey: "vlmc", life: 15, luck: 15 },
  yl: { f: "img/halo/yl.webp", n: 10, w: 168, h: 139, ax: 84, ay: 98, ms: 180, name: "Vòng sáng Yến Lạc (Lam)", title: "Chưởng Môn", titleKey: "mp4", life: 10, luck: 10 },
  ab: { f: "img/halo/ab.webp", n: 10, w: 320, h: 191, ax: 158, ay: 99, ms: 150, name: "Vòng sáng Ám Dạ (Bát Quái)", title: "Trường Bạch Sơn Chủ", titleKey: "zone16", life: 12, luck: 12 },
  zw: { f: "img/halo/zw.webp", n: 11, w: 320, h: 165, ax: 160, ay: 67, ms: 113, name: "Vòng sáng Tử Vân (Boss TG)", title: "TOP 1 BTG", titleKey: "top1_btg", life: 20, luck: 20 },
  dg: { f: "img/halo/dg.webp", n: 10, w: 156, h: 145, ax: 77, ay: 106, ms: 100, name: "Vòng sáng Đồ Long (Vàng)", title: "Vô Song Vương Giả", titleKey: "admin", life: 15, luck: 15 }
};
const xs = HALO_DEFS;
const gz = { bj: [14, 40, 127, 96], yl: [13, 16, 142, 117], ab: [105, 3, 110, 112], zw: [120, 47, 80, 41], dg: [14, 10, 127, 130] };

const TITLE_HALO_MAP = {
  vlmc: { haloKey: "bj", titleName: "VÕ LÂM MINH CHỦ" },         // Võ Lâm Minh Chủ dùng vòng sáng Bá Chủ (Vàng)
  mp4: { haloKey: "yl", titleName: "Chưởng Môn" },              // Chưởng Môn dùng vòng sáng Yến Lạc (Lam)
  zone16: { haloKey: "ab", titleName: "Trường Bạch Sơn Chủ" },  // Trường Bạch Sơn Chủ dùng Ám Dạ (Bát Quái)
  top1_btg: { haloKey: "zw", titleName: "TOP 1 BTG" },          // TOP 1 BTG dùng Tử Vân (Boss TG - 1 ngày)
  admin: { haloKey: "dg", titleName: "Vô Song Vương Giả" }      // Vô Song dùng Đồ Long (Vàng)
};

const HALO_TO_TITLE_MAP = {
  bj: "vlmc",
  yl: "mp4",
  ab: "zone16",
  zw: "top1_btg",
  dg: "admin"
};

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
    delete rw.titleExp.mp4;
    delete rw.titleExp.zone16;
    delete rw.titleExp.admin;
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
 * Gets currently active hero halo from currently worn title.
 * ONLY TOP 1 BTG (zw) expires in 1 day; ALL other halos are PERMANENT (vĩnh viễn)!
 */
function getHeroHalo() {
  if (typeof S !== "object" || !S) return null;
  const rw = typeof RW === "function" ? RW() : (S && S.rw);
  if (!rw) return null;

  // Determine halo from the currently worn title
  const worn = typeof titleWorn === "function" ? titleWorn() : null;
  const wornKey = worn ? worn[0] : (rw.title || "");

  if (wornKey && TITLE_HALO_MAP[wornKey]) {
    const map = TITLE_HALO_MAP[wornKey];
    const k = map.haloKey;
    const def = xs[k];
    if (def) {
      // ONLY top1_btg expires after 1 day
      if (wornKey === "top1_btg") {
        const exp = rw.titleExp && rw.titleExp.top1_btg;
        if (exp && Date.now() >= exp) {
          if (rw.titles && rw.titles.top1_btg) delete rw.titles.top1_btg;
          if (rw.title === "top1_btg") rw.title = "";
          return null;
        }
        return {
          k: k,
          titleKey: wornKey,
          tn: (worn && typeof titleName === "function") ? titleName(worn) : map.titleName,
          u: exp || 0,
          life: def.life || 20,
          luck: def.luck || 20
        };
      }

      // ALL other halos are PERMANENT (VĨNH VIỄN)
      return {
        k: k,
        titleKey: wornKey,
        tn: (worn && typeof titleName === "function") ? titleName(worn) : map.titleName,
        u: 0, // 0 = vĩnh viễn
        life: def.life || 15,
        luck: def.luck || 15
      };
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
 * Equips a halo on the player and unlocks its corresponding title.
 * ONLY top1_btg expires after 1 day. All other halos are PERMANENT!
 */
function wearHalo(haloKey, titleName, days = 0, src = "wb") {
  if (!xs[haloKey]) return false;
  const rw = typeof RW === "function" ? RW() : (S && S.rw);
  if (!rw) return false;
  const def = xs[haloKey];
  const titleKey = HALO_TO_TITLE_MAP[haloKey] || "top1_btg";

  // Only TOP 1 BTG has 1-day expiration. All others are permanent.
  const isExpiring = (haloKey === "zw" || titleKey === "top1_btg");
  const u = isExpiring ? Date.now() + 86400 * 1000 : 0;

  purgeStaleTitles(rw);

  // Unlock title & set expiration ONLY if expiring
  rw.titles = rw.titles || {};
  rw.titles[titleKey] = 1;
  if (u > 0) {
    rw.titleExp = rw.titleExp || {};
    rw.titleExp[titleKey] = u;
  }

  // Immediately equip this title & its halo
  rw.title = titleKey;

  if (typeof R === "object" && R) R.dirty = true;
  if (typeof save === "function") save();
  if (typeof refresh === "function") refresh();
  const durStr = isExpiring ? " (1 ngày)" : " (Vĩnh viễn)";
  if (typeof toast === "function") toast(`✨ Đã kích hoạt danh hiệu «${titleName || def.title}» và ${def.name}${durStr}!`);
  if (typeof log === "function") log(`✨ Đã nhận danh hiệu <b>«${titleName || def.title}»</b> và <b>${def.name}</b>${durStr} (+${def.life}% sinh lực, +${def.luck}% may mắn)!`);
  return true;
}

/**
 * Equips a title and activates its own halo
 */
window.wearTitleHalo = function(titleKey) {
  const rw = typeof RW === "function" ? RW() : (S && S.rw);
  if (!rw) return;
  rw.title = rw.title === titleKey ? "" : titleKey;
  if (typeof R === "object" && R) R.dirty = true;
  if (typeof save === "function") save();
  if (typeof refresh === "function") refresh();
  openLequanHaloModal();
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
  if (!targetTime) return "Vĩnh viễn";
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
        ban thưởng cho các anh hùng khiêu chiến <b>Boss Thế Giới</b> và các kỳ nhân dị sĩ có công trạng lớn! 
        Mỗi danh hiệu cao quý đều sở hữu <b>Vòng Sáng riêng biệt</b> (Võ Lâm Minh Chủ, Chưởng Môn, Trường Bạch Sơn Chủ là <b>vĩnh viễn</b>; chỉ riêng TOP 1 BTG là <b>1 ngày</b>). Đeo danh hiệu nào, Vòng Sáng của danh hiệu đó sẽ lập tức xuất hiện dưới chân!
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
            <div style="font-size:12px;color:#bbb">Danh hiệu: «${active.tn || "VÕ LÂM MINH CHỦ"}» · ${active.u ? `Còn <b>${formatDuration(active.u)}</b>` : '<b>Vĩnh viễn</b>'}</div>
            <div style="font-size:12px;color:#8fe08a">+${active.life}% sinh lực · +${active.luck}% may mắn</div>
          </div>
        </div>
      </div>
    `;
  } else {
    body += `
      <div style="background:rgba(255,255,255,0.04);border:1px dashed #665;border-radius:6px;padding:8px 12px;margin-bottom:12px;color:#aaa;font-size:13px">
        <i>Hiện chưa đeo danh hiệu có Vòng Sáng. Hãy chọn đeo danh hiệu bên dưới hoặc ở Thẻ Nhân Vật!</i>
      </div>
    `;
  }

  // Owned halos / titles list
  const ownedList = [];
  for (const haloKey in HALO_DEFS) {
    const def = HALO_DEFS[haloKey];
    const tk = def.titleKey;
    if (titles[tk]) {
      const exp = rw && rw.titleExp && rw.titleExp[tk];
      if (tk !== "top1_btg" || !exp || exp > Date.now()) {
        ownedList.push({ haloKey, def, titleKey: tk, exp: (tk === "top1_btg" ? exp : 0) });
      }
    }
  }

  if (ownedList.length > 0) {
    body += `
      <h4 style="color:#ffd700;margin:12px 0 6px">👑 Vòng Sáng đã sở hữu (${ownedList.length})</h4>
      <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px">
    `;
    ownedList.forEach(item => {
      const isWorn = wornTitle === item.titleKey;
      body += `
        <div style="display:flex;align-items:center;justify-content:space-between;background:rgba(0,0,0,0.25);border:1px solid ${isWorn ? '#ffd700' : '#554'};border-radius:6px;padding:6px 10px">
          <div style="display:flex;align-items:center;gap:8px">
            ${renderHaloBadge(item.haloKey, 26)}
            <div>
              <b style="color:${isWorn ? '#ffd700' : '#e6d0a5'}">${item.def.name}</b>
              <div style="font-size:12px;color:#999">Danh hiệu «${item.def.title}» · ${item.exp ? `Còn <b>${formatDuration(item.exp)}</b>` : '<b>Vĩnh viễn</b>'}</div>
            </div>
          </div>
          <button class="btn sm${isWorn ? ' on' : ''}" onclick="wearTitleHalo('${item.titleKey}')">${isWorn ? 'Đang đeo' : 'Đeo ngay'}</button>
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
