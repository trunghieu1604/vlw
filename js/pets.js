"use strict";

const PET_UNLOCK_LV = 20,
  PET_S2_LV = 30,
  PET_ROLES = {
    aoe: {
      tags: ["Đánh lan", "Khống chế"],
      hint: "Hợp khi bị nhiều quái áp sát: đánh lan quanh mục tiêu, dậm đất làm choáng.",
      s1: ["Quét Ngang", "Mỗi đòn lan 60% sát thương ra các quái quanh mục tiêu."],
      s2: ["Chấn Địa", "Mỗi 8 giây dậm đất 150% sát thương quanh mình, choáng 0,8 giây."],
    },
    exe: {
      tags: ["Kết liễu", "Dồn sát thương"],
      hint: "Hợp dọn quái yếu máu, săn trùm: càng về cuối càng đau.",
      s1: ["Truy Sát", "+60% sát thương lên quái dưới 30% sinh lực."],
      s2: ["Đoạt Mệnh", "Mỗi 10 giây vồ 300% sát thương vào quái yếu máu nhất gần đó."],
    },
    ctl: {
      tags: ["Khống chế", "Choáng"],
      hint: "Hợp giữ chân quái mạnh, giảm sức ép cho chủ.",
      s1: ["Húc Ngã", "20% cơ hội làm choáng mục tiêu 1 giây."],
      s2: ["Gầm Uy", "Mỗi 12 giây gầm vang, choáng mọi quái quanh 1,2 giây."],
    },
    heal: {
      tags: ["Hồi phục", "Hỗ trợ"],
      hint: "Hợp nhân vật máu mỏng, treo máy lâu.",
      s1: ["Linh Khí", "Mỗi 6 giây hồi cho chủ 2% sinh lực."],
      s2: ["Hồi Xuân", "Mỗi 15 giây hồi cho chủ 10% sinh lực và nội lực."],
    },
    tank: {
      tags: ["Chống chịu", "Hỗ trợ"],
      hint: "Hợp leo tháp, đánh trùm: chủ chịu đòn tốt hơn.",
      s1: ["Hộ Chủ", "Chủ giảm 4% sát thương nhận vào."],
      s2: ["Thiết Bì", "Chủ giảm thêm 6% sát thương nhận vào và phản 10% sát thương cận chiến."],
    },
    poison: {
      tags: ["Độc", "Làm chậm"],
      hint: "Hợp đánh quái máu dày: độc ngấm dần.",
      s1: ["Nọc Độc", "Mỗi đòn gây độc thêm 60% sát thương trong 3 giây."],
      s2: ["Vạn Độc", "Mỗi 10 giây phun độc quanh mục tiêu (120% sát thương theo thời gian), làm chậm."],
    },
    multi: {
      tags: ["Liên kích", "Dồn sát thương"],
      hint: "Hợp dồn sát thương lên một mục tiêu.",
      s1: ["Song Trảo", "Mỗi lượt đánh 2 lần (mỗi lần 60%)."],
      s2: ["Tốc Ảnh", "Tốc độ đánh của đồng hành +50%."],
    },
    drain: {
      tags: ["Hút máu", "Hồi nội lực"],
      hint: "Hợp nhân vật hay cạn máu, cạn nội lực.",
      s1: ["Hút Huyết", "Chủ hồi sinh lực bằng 20% sát thương đồng hành gây ra."],
      s2: ["Hút Hồn", "Chủ hồi nội lực bằng 15% sát thương đồng hành gây ra."],
    },
  },
  PET_ROLE_KEYS = Object.keys(PET_ROLES),
  PET_REGEXES = [
    [/hươu|lộc|nai|hạc|ưng|điêu|kền/i, "heal"],
    [/nhện|rắn|xà|độc|rết|bọ|nhím|cóc|thằn lằn/i, "poison"],
    [/dơi|bức|hút|hồn|phách/i, "drain"],
    [/hổ|báo|miêu|mèo|khỉ|hầu|ly|cung|ảnh/i, "multi"],
    [/sói|lang|sài|đao|trảm|liêm|đoạt/i, "exe"],
    [/gấu|hùng|trâu|ngưu|chùy|tê/i, "ctl"],
    [/rùa|giáp|thạch|võ sĩ|cá sấu|quái/i, "tank"],
    [/heo|trư|lợn|voi|tượng|thương|kích|côn/i, "aoe"],
  ];

function petRoleOf(tid) {
  const name = (typeof MON !== "undefined" && MON[tid] && MON[tid].n) || "";
  for (const [regex, role] of PET_REGEXES) {
    if (regex.test(name)) return role;
  }
  return PET_ROLE_KEYS[tid % PET_ROLE_KEYS.length];
}

function petTagBadges(role) {
  const roleData = PET_ROLES[role];
  if (!roleData || !roleData.tags) return "";
  return roleData.tags.map((t) => `<span class="pettag">${t}</span>`).join("");
}

function petTankBuff() {
  const pet = typeof S !== "undefined" && S && S.rw && S.rw.pet;
  if (!pet || typeof MON === "undefined" || !MON[pet.tid] || petRoleOf(pet.tid) !== "tank") {
    return { sorb: 0, ret: 0 };
  }
  return pet.lvl >= PET_S2_LV ? { sorb: 10, ret: 10 } : { sorb: 4, ret: 0 };
}

function petDealDmg(enemy, dmg, role, pet, enemies) {
  if (!enemy || enemy.dead || enemy.hp <= 0) return;
  if (role === "exe" && enemy.hp < 0.3 * enemy.max) {
    dmg *= 1.6;
  }
  if (enemy.isWbBoss) {
    if (typeof onHeroHitWb === "function") onHeroHitWb(dmg);
  } else {
    enemy.hp = Math.max(0, enemy.hp - dmg);
  }
  enemy.hitT = 0.1;
  if (typeof addText === "function") addText(enemy.x, enemy.y - 30, fmt(Math.round(dmg)), "#9fe36a", 11);

  if (role === "aoe" && enemies) {
    for (const other of enemies) {
      if (other !== enemy && !other.dead && Math.hypot(other.x - enemy.x, other.y - enemy.y) < 80) {
        if (other.isWbBoss) {
          if (typeof onHeroHitWb === "function") onHeroHitWb(0.6 * dmg);
        } else {
          other.hp = Math.max(0, other.hp - 0.6 * dmg);
        }
        other.hitT = 0.1;
      }
    }
  }

  if (role === "ctl" && Math.random() < 0.2) {
    enemy.stun = Math.max(enemy.stun || 0, 1);
  }

  if (role === "poison") {
    const prev = enemy.poison > 0 ? (enemy.poisonDmg || 0) * enemy.poison : 0;
    enemy.poisonDmg = (prev + 0.6 * dmg) / 3;
    enemy.poison = 3;
  }

  if (role === "drain") {
    if (typeof heal === "function") heal(0.2 * dmg, !0);
    if (pet.lvl >= PET_S2_LV && typeof R !== "undefined" && R.P) {
      R.mana = Math.min(R.P.mana, R.mana + 0.15 * dmg);
    }
  }
}

function petTick(dt) {
  const pet = typeof S !== "undefined" && S && S.rw && S.rw.pet;
  if (!pet || typeof R === "undefined" || R.town || typeof MON === "undefined" || !MON[pet.tid]) {
    if (typeof R !== "undefined") R.petPos = null;
    return;
  }
  const pos = R.petPos || (R.petPos = { x: H.x - 30, y: H.y + 10, t: 0, c1: 6, c2: 8, act: "st", actT: 0, dir: 0 });
  const role = petRoleOf(pet.tid);
  const s2Active = pet.lvl >= PET_S2_LV;
  const enemies = typeof alive === "function" ? alive() : (R.enemies || []).filter((e) => !e.dead);
  const nearest = enemies.slice().sort((a, b) => Math.hypot(a.x - pos.x, a.y - pos.y) - Math.hypot(b.x - pos.x, b.y - pos.y))[0];
  const target = nearest || { x: H.x - 36, y: H.y + 12 };
  const dist = Math.hypot(target.x - pos.x, target.y - pos.y);
  const stopDist = nearest ? (nearest.r || 20) + 14 : 10;

  pos.moving = dist > stopDist;
  if (pos.moving) {
    const step = Math.min(1, (170 * dt) / dist);
    if (typeof dirOf === "function") pos.dir = dirOf(target.x - pos.x, target.y - pos.y);
    pos.x += (target.x - pos.x) * step;
    pos.y += (target.y - pos.y) * step;
  }
  if (Math.hypot(H.x - pos.x, H.y - pos.y) > 500) {
    pos.x = H.x - 30;
    pos.y = H.y + 10;
  }

  pos.t -= dt;
  pos.c1 -= dt;
  pos.c2 -= dt;

  const dmg = (6 + 5 * pet.lvl) * (1 + 0.04 * pet.lvl);

  if (nearest && !pos.moving && pos.t <= 0) {
    pos.t = role === "multi" && s2Active ? 0.8 : 1.2;
    pos.act = "at";
    pos.actT = 0;
    if (typeof dirOf === "function") pos.dir = dirOf(nearest.x - pos.x, nearest.y - pos.y);
    if (role === "multi") {
      petDealDmg(nearest, 0.6 * dmg, role, pet, enemies);
      petDealDmg(nearest, 0.6 * dmg, role, pet, enemies);
    } else {
      petDealDmg(nearest, dmg, role, pet, enemies);
    }
  }

  if (role === "heal" && pos.c1 <= 0) {
    pos.c1 = 6;
    if (typeof heal === "function" && R.P) heal(0.02 * R.P.life, !0);
  }

  if (s2Active && !(pos.c2 > 0)) {
    if (role === "aoe" && nearest) {
      pos.c2 = 8;
      for (const en of enemies) {
        if (Math.hypot(en.x - pos.x, en.y - pos.y) < 120) {
          if (en.isWbBoss) {
            if (typeof onHeroHitWb === "function") onHeroHitWb(1.5 * dmg);
          } else {
            en.hp = Math.max(0, en.hp - 1.5 * dmg);
          }
          en.stun = Math.max(en.stun || 0, 0.8);
          en.hitT = 0.1;
        }
      }
      if (typeof addText === "function") addText(pos.x, pos.y - 46, "Chấn Địa", "#9fe36a", 12);
    } else if (role === "exe" && nearest) {
      pos.c2 = 10;
      const weakest = enemies
        .filter((en) => Math.hypot(en.x - pos.x, en.y - pos.y) < 400)
        .sort((a, b) => a.hp / (a.max || 1) - b.hp / (b.max || 1))[0];
      if (weakest) {
        petDealDmg(weakest, 3 * dmg, role, pet, enemies);
        if (typeof addText === "function") addText(weakest.x, weakest.y - 46, "Đoạt Mệnh", "#9fe36a", 12);
      }
    } else if (role === "ctl" && nearest) {
      pos.c2 = 12;
      for (const en of enemies) {
        if (Math.hypot(en.x - pos.x, en.y - pos.y) < 150) {
          en.stun = Math.max(en.stun || 0, 1.2);
        }
      }
      if (typeof addText === "function") addText(pos.x, pos.y - 46, "Gầm Uy", "#9fe36a", 12);
    } else if (role === "heal") {
      pos.c2 = 15;
      if (typeof heal === "function" && R.P) heal(0.1 * R.P.life, !0);
      if (R.P) R.mana = Math.min(R.P.mana, R.mana + 0.1 * R.P.mana);
      if (typeof addText === "function") addText(H.x, H.y - 60, "Hồi Xuân", "#9fe36a", 12);
    } else if (role === "poison" && nearest) {
      pos.c2 = 10;
      for (const en of enemies) {
        if (Math.hypot(en.x - nearest.x, en.y - nearest.y) < 100) {
          const prev = en.poison > 0 ? (en.poisonDmg || 0) * en.poison : 0;
          en.poisonDmg = (prev + 1.2 * dmg) / 3;
          en.poison = 3;
        }
      }
      if (typeof addText === "function") addText(nearest.x, nearest.y - 46, "Vạn Độc", "#9fe36a", 12);
    }
  }
}

function drawPet(ctx, dt) {
  const pet = typeof S !== "undefined" && S && S.rw && S.rw.pet,
    pos = typeof R !== "undefined" && R.petPos;
  if (!pet || !pos || typeof MON === "undefined" || !MON[pet.tid]) return;
  const mon = MON[pet.tid];
  pos.animKey = mon.anim;

  if (typeof stepAct === "function") stepAct(pos, dt, pos.moving ? "run" : "st");
  if (pos.act !== "at" && typeof setAct === "function") setAct(pos, pos.moving ? "run" : "st");

  ctx.fillStyle = "#0007";
  ctx.beginPath();
  ctx.ellipse(pos.x, pos.y, 14, 5, 0, 0, 7);
  ctx.fill();

  if (pos.animKey && typeof drawAnim === "function") {
    drawAnim(
      pos.animKey,
      pos.act || "st",
      pos.dir || 0,
      pos.actT || 0,
      pos.x,
      pos.y,
      0.75 * (typeof MON_SCALE !== "undefined" ? MON_SCALE : 1),
    );
  } else if (mon.img && typeof drawSprite === "function") {
    drawSprite(
      img(mon.img),
      mon.sz,
      pos.x,
      pos.y,
      0.75 * (typeof MON_SCALE !== "undefined" ? MON_SCALE : 1),
      pos.face < 0,
    );
  }

  if (typeof label === "function") {
    label(pos.x, pos.y - 42, `${mon.n} · Lv${pet.lvl}`, (typeof NAME_COL !== "undefined" && NAME_COL.pet) || "#9fe36a", 10, -1);
  }
}

let petViewingId = null;

function renderPetTab(rw) {
  if (S.lvl < PET_UNLOCK_LV) {
    return `<p class="desc">Đồng hành mở khóa ở cấp ${PET_UNLOCK_LV}.</p>`;
  }
  const curPet = rw.pet;
  const visitedIdx =
    typeof zoneIdx === "function" ? zoneIdx(Math.min(S.maxStage || 1, typeof STAGES !== "undefined" ? STAGES : 200)) : 0;
  const seenSpecies = new Set();
  const zoneList = (typeof ZONES !== "undefined" ? ZONES : [])
    .map((z, idx) => ({
      z,
      i: idx,
      list: (z.m || []).filter((tid) => MON[tid] && MON[tid].anim && !seenSpecies.has(tid) && seenSpecies.add(tid)),
    }))
    .filter((z) => z.list.length);

  const totalUnlocked = zoneList.filter((z) => z.i <= visitedIdx).reduce((acc, z) => acc + z.list.length, 0);
  const totalSpecies = zoneList.reduce((acc, z) => acc + z.list.length, 0);

  const viewingId =
    petViewingId != null && MON[petViewingId] ? petViewingId : curPet && MON[curPet.tid] ? curPet.tid : null;
  const curLvl = curPet ? curPet.lvl : 1;

  let headHtml = '<div class="petpane"><small class="dim">Chọn một loài bên dưới để xem vai trò và kỹ năng.</small></div>';
  if (viewingId != null) {
    const role = petRoleOf(viewingId);
    const roleData = PET_ROLES[role];
    const isSelected = curPet && curPet.tid === viewingId;
    const s2Active = curLvl >= PET_S2_LV;
    const mon = MON[viewingId];
    headHtml = `<div class="petpane">
      <div class="pethead">
        ${mon.img ? `<img src="${esc(mon.img)}" alt="">` : ""}
        <span>
          <small>${isSelected ? "ĐANG DẪN THEO" : "ĐANG XEM"}</small>
          <b>${esc(mon.n)} · cấp ${curLvl}</b>
        </span>
        <button class="btn" data-p="${viewingId}" ${isSelected ? "disabled" : ""}>${isSelected ? "Đang dẫn theo" : "Dẫn theo"}</button>
      </div>
      <div class="petrole">
        <small>VAI TRÒ</small>
        <div>${petTagBadges(role)}</div>
        <p><b class="up">Hợp khi:</b> ${roleData.hint}</p>
      </div>
      <div class="petskills">
        <div class="petsk">
          <b>${roleData.s1[0]}</b>
          <small>${roleData.s1[1]}</small>
        </div>
        <div class="petsk${s2Active ? "" : " off"}">
          <b>${roleData.s2[0]}</b>
          <small>${roleData.s2[1]}${s2Active ? "" : ` · mở ở cấp ${PET_S2_LV}`}</small>
        </div>
      </div>
    </div>`;
  }

  const zonesHtml = zoneList
    .map((item) => {
      const isLocked = item.i > visitedIdx;
      if (isLocked && item.i > visitedIdx + 1) return "";
      return `<h4 class="petzone">
      ${esc(item.z.n)}
      <small>${isLocked ? "🔒 tới vùng này để mở" : `Quái cấp ${item.z.lo}–${item.z.hi}`}</small>
    </h4>
    <div class="petgrid">
      ${item.list
        .map((tid) => {
          const role = petRoleOf(tid);
          const roleData = PET_ROLES[role];
          const mon = MON[tid];
          const isCurrent = curPet && curPet.tid === tid;
          const isViewing = viewingId === tid;
          return `<button class="petcard${isViewing ? " on" : ""}${isCurrent ? " mine" : ""}${isLocked ? " lock" : ""}" ${isLocked ? "disabled" : `data-pv="${tid}"`}>
          ${mon.img ? `<img src="${esc(mon.img)}" alt="">` : ""}
          <b>${esc(mon.n)}</b>
          <span>${petTagBadges(role)}</span>
          <small>${roleData.s1[0]} · ${roleData.s2[0]} (Lv${PET_S2_LV})</small>
        </button>`;
        })
        .join("")}
    </div>`;
    })
    .join("");

  return `<p class="desc">Đồng hành đi theo và cùng đánh quái, lên cấp theo số quái hạ (đổi loài vẫn giữ cấp). Mỗi loài có <b>vai trò</b> và <b>2 kỹ năng</b> riêng; kỹ năng thứ hai mở ở cấp ${PET_S2_LV}. Loài mới mở dần theo vùng đã tới.</p>
    <p class="desc small">Nhãn: Đánh lan · Kết liễu · Khống chế · Hồi phục · Chống chịu · Độc · Liên kích · Hút máu. Đã mở <b>${totalUnlocked}/${totalSpecies}</b> loài.${curPet && MON[curPet.tid] ? ` Đang dẫn theo: <b>${esc(MON[curPet.tid].n)}</b> cấp ${curPet.lvl}.` : " Chưa có đồng hành được chọn."}</p>
    ${headHtml}
    ${zonesHtml}`;
}

function setupPetTabEvents(rw, refreshFn) {
  document.querySelectorAll("#mBody [data-pv]").forEach((b) => {
    b.onclick = () => {
      petViewingId = +b.dataset.pv;
      refreshFn();
    };
  });
  document.querySelectorAll("#mBody .petpane [data-p]").forEach((b) => {
    b.onclick = () => {
      const tid = +b.dataset.p;
      const cur = rw.pet;
      rw.pet = { tid, lvl: cur ? cur.lvl : 1, xp: cur ? cur.xp : 0 };
      if (typeof S !== "undefined" && S) {
        S.rw = S.rw || {};
        S.rw.pet = rw.pet;
      }
      if (typeof R !== "undefined") {
        R.petPos = null;
        R.dirty = !0;
      }
      if (typeof toast === "function") toast("Đồng hành: " + (MON[tid] ? MON[tid].n : "Linh thú"));
      if (typeof save === "function") save();
      refreshFn();
    };
  });
}

function petOnKill(enemy) {
  const pet = typeof S !== "undefined" && S && S.rw && S.rw.pet;
  if (!pet || typeof MON === "undefined" || !MON[pet.tid]) return;
  const xpGain = enemy.cls === "boss" ? 10 : enemy.cls === "elite" ? 3 : 1;
  pet.xp = (pet.xp || 0) + xpGain;
  const xpNeed = 20 + 12 * pet.lvl;
  if (pet.xp >= xpNeed) {
    pet.xp -= xpNeed;
    pet.lvl++;
    const mon = MON[pet.tid];
    if (typeof toast === "function") {
      toast(
        `Đồng hành ${esc(mon ? mon.n : "Linh thú")} lên cấp ${pet.lvl}${pet.lvl === PET_S2_LV ? " · mở kỹ năng thứ hai!" : ""}`,
      );
    }
    if (pet.lvl === PET_S2_LV && typeof R !== "undefined" && R) R.dirty = !0;
  }
}

if (typeof window !== "undefined") {
  window.PET_UNLOCK_LV = PET_UNLOCK_LV;
  window.PET_S2_LV = PET_S2_LV;
  window.PET_ROLES = PET_ROLES;
  window.petRoleOf = petRoleOf;
  window.petTagBadges = petTagBadges;
  window.petTankBuff = petTankBuff;
  window.petTick = petTick;
  window.drawPet = drawPet;
  window.renderPetTab = renderPetTab;
  window.setupPetTabEvents = setupPetTabEvents;
  window.petOnKill = petOnKill;
}
