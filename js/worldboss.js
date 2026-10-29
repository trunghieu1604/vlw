"use strict";

// === BOSS THẾ GIỚI: TRUNG HIẾU (WORLD BOSS) ===
// Map độc quyền: img/z/337.jpg (Phong Lăng Độ · Thuyền)
// Xuất hiện 19:00 (7h tối) mỗi ngày 1 lần duy nhất
// Danh hiệu TOP 1 BTG & Vòng Sáng Tử Vân (zw) hiệu lực 1 ngày

const WB_BOSS_CONFIG = {
  name: "Trung Hiếu",
  title: "BOSS THẾ GIỚI",
  mapName: "Phong Lăng Độ (Thuyền 337)",
  mapImg: "img/z/337.jpg",
  mapId: 337,
  lvl: 200,
  hpMax: 120000000,
  dmg: 13500,
  series: 3, // Hỏa (Cái Bang)
  heroLook: {
    f: "gaibang",
    x: 0,
    r: [17, 17, 26, 20], // Phái Cái Bang, Đằng Long 180 +10, Cưỡi Sư Tử
    m: 1,
    rb: 5,
    glow: { c: "#ffe9a8", n: 3 }
  }
};

const WB_BOT_POOL = [
  { n: "Tiếu Ngạo Giang Hồ", fac: "gaibang", lvl: 118, col: "#ffe9a6", baseDps: 32000 },
  { n: "Độc Cô Cầu Bại", fac: "wudang", lvl: 120, col: "#6aa8ff", baseDps: 38000 },
  { n: "Lệnh Hồ Xung", fac: "wudang", lvl: 115, col: "#6aa8ff", baseDps: 28000 },
  { n: "Bắc Cái", fac: "gaibang", lvl: 120, col: "#ffe9a6", baseDps: 35000 },
  { n: "Tây Độc", fac: "wudu", lvl: 116, col: "#c77bff", baseDps: 27000 },
  { n: "Đông Tà", fac: "cuiyan", lvl: 117, col: "#7ee07e", baseDps: 29000 },
  { n: "Nam Đế", fac: "shaolin", lvl: 119, col: "#ffb347", baseDps: 33000 },
  { n: "Dương Quá", fac: "kunlun", lvl: 115, col: "#7ee07e", baseDps: 31000 },
  { n: "Tiểu Long Nữ", fac: "emei", lvl: 114, col: "#ffb347", baseDps: 26000 },
  { n: "Kiều Phong", fac: "gaibang", lvl: 120, col: "#ffe9a6", baseDps: 39000 },
  { n: "Hư Trúc", fac: "shaolin", lvl: 116, col: "#ffb347", baseDps: 30000 },
  { n: "Trương Tam Phong", fac: "wudang", lvl: 120, col: "#6aa8ff", baseDps: 41000 },
  { n: "Quách Tĩnh", fac: "gaibang", lvl: 119, col: "#ffe9a6", baseDps: 36000 }
];

const WB = {
  boss: null,
  st: "soon", // "up" | "soon" | "dead" | "gone"
  isSummon: false,
  end: 0,
  next: 0,
  top: [],
  bots: [],
  realPlayers: [],
  playerDmg: 0,
  defeatDone: false,
  defeatedHandled: false,
  bannerTimer: null,
  arena: {
    on: false,
    bossInst: null
  }
};

function wbNum(n) {
  return Number(n || 0).toLocaleString("vi-VN");
}

function wbFormatTime(sec) {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h} giờ ${m} phút ${String(s).padStart(2, "0")} giây`;
  return `${m} phút ${String(s).padStart(2, "0")} giây`;
}

function wbFormatNextDate(ts) {
  if (!ts || isNaN(ts) || ts <= 0) return "19:00 ngày mai";
  const d = new Date(ts);
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${hours}:${mins} ngày ${day}/${month}/${year}`;
}

function initBossObj(customHp) {
  WB.boss = {
    name: WB_BOSS_CONFIG.name,
    title: WB_BOSS_CONFIG.title,
    mapName: WB_BOSS_CONFIG.mapName,
    mapImg: WB_BOSS_CONFIG.mapImg,
    lvl: WB_BOSS_CONFIG.lvl,
    hp: customHp != null ? customHp : WB_BOSS_CONFIG.hpMax,
    hpMax: WB_BOSS_CONFIG.hpMax,
    series: WB_BOSS_CONFIG.series,
    heroLook: Object.assign({}, WB_BOSS_CONFIG.heroLook)
  };
}

/**
 * 7:00 PM (19:00) Schedule calculation (Vietnam UTC+7)
 */
function getWbSchedule() {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  const todayKey = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const startToday = new Date(y, m, d, 19, 0, 0, 0).getTime();
  const endToday = startToday + 10 * 60 * 1000; // 19:10 (10 mins duration)
  const startTomorrow = new Date(y, m, d + 1, 19, 0, 0, 0).getTime();
  const nowMs = now.getTime();

  const killedToday = !!(S && S.rw && S.rw.wbKilledDate === todayKey);

  if (killedToday) {
    return { st: "dead", next: startTomorrow, start: startToday, end: endToday, killedToday: true, todayKey: todayKey };
  }

  if (nowMs >= startToday && nowMs <= endToday) {
    return { st: "up", next: startTomorrow, start: startToday, end: endToday, killedToday: false, todayKey: todayKey };
  } else if (nowMs < startToday) {
    return { st: "soon", next: startToday, start: startToday, end: endToday, killedToday: false, todayKey: todayKey };
  } else {
    return { st: "gone", next: startTomorrow, start: startToday, end: endToday, killedToday: false, todayKey: todayKey };
  }
}

/**
 * Spawns Boss instance (isSummon = true if summoned by Võ Lâm Minh Chủ)
 */
function spawnWorldBoss(isSummon = false) {
  const sched = getWbSchedule();
  WB.isSummon = !!isSummon;

  initBossObj();

  WB.st = "up";
  WB.end = isSummon ? (Date.now() + 10 * 60 * 1000) : (sched.end || (Date.now() + 10 * 60 * 1000));
  WB.playerDmg = 0;
  WB.defeatDone = false;
  WB.defeatedHandled = false;
  WB.rewardClaimed = false;
  WB.resultModalShown = false;

  const db = typeof getFirebaseDb === "function" ? getFirebaseDb() : (typeof firebase !== "undefined" && firebase.apps && firebase.apps.length ? firebase.database() : null);
  if (db && (isSummon || sched.st === "up")) {
    try {
      db.ref("worldboss/state").set({
        st: "up",
        isSummon: !!isSummon,
        name: WB_BOSS_CONFIG.name,
        startedAt: isSummon ? Date.now() : sched.start,
        end: WB.end,
        todayKey: sched.todayKey,
        killer: ""
      });
      db.ref("worldboss/damage").remove();
    } catch (e) {
      console.warn("spawnWorldBoss fb err:", e);
    }
  }

  WB.bots = WB_BOT_POOL.map((b) => ({
    name: b.n,
    fac: b.fac,
    lvl: b.lvl,
    col: b.col,
    baseDps: b.baseDps,
    dmg: Math.round(b.baseDps * (3 + Math.random() * 8))
  }));

  updateWbLeaderboard();
  showWbBanner(`⚔ Boss thế giới <b>Trung Hiếu</b> đã xuất hiện tại <b>Phong Lăng Độ</b>!`);
  updateWbButtonState();

  // Thông báo toàn diện: Log, Toast, Banner màn hình, Âm thanh, Kênh Chat
  if (typeof log === "function") {
    log(`<b style="color:#ff3333">📢 [BOSS THẾ GIỚI]:</b> Boss <b>Trung Hiếu</b> đã xuất hiện tại <b>Phong Lăng Độ</b>! Mau vào tham chiến!`);
  }
  if (typeof toast === "function") {
    toast("⚔ BOSS THẾ GIỚI TRUNG HIẾU ĐÃ XUẤT HIỆN TẠI PHONG LĂNG ĐỘ!");
  }
  if (typeof R === "object" && R) {
    R.banner = {
      t: 6,
      text: "⚔ Boss Thế Giới: Trung Hiếu đã xuất hiện!",
      sub: "Phong Lăng Độ · Bấm vào Boss Thế Giới để tham chiến"
    };
  }
  if (typeof uiSfx === "function") uiSfx("gold");

  const msgText = "📢 [BOSS THẾ GIỚI]: Boss Trung Hiếu đã xuất hiện tại Phong Lăng Độ! Anh em mau vào săn!";
  if (typeof chatPush === "function") {
    chatPush({
      cid: "system",
      sys: true,
      name: "Hệ Thống",
      msg: msgText,
      ts: Date.now()
    });
  }
  if (db) {
    try {
      db.ref("chat/msgs").push({
        cid: "system",
        sys: true,
        name: "Hệ Thống",
        msg: msgText,
        ts: Date.now()
      });
    } catch (e) {}
  }
}

let wbPendingDmg = 0;
let wbLastSyncT = 0;
let wbSyncTimer = null;
let wbFbInitialized = false;

function wbFirebaseOn() {
  return typeof firebase !== "undefined" && window.CHAT_CFG && !!CHAT_CFG.firebaseUrl;
}

function wbSyncHitFirebase() {
  if (!wbFirebaseOn() || !wbPendingDmg) return;
  const d = wbPendingDmg;
  wbPendingDmg = 0;
  wbLastSyncT = Date.now();
  try {
    const db = typeof getFirebaseDb === "function" ? getFirebaseDb() : (typeof firebase !== "undefined" && firebase.apps && firebase.apps.length ? firebase.database() : null);
    if (!db) return;
    const cid = typeof chatCid === "function" ? chatCid() : "anon";
    db.ref("worldboss/damage/" + cid).set({
      cid: cid,
      name: S.name || "Hiệp Sĩ",
      fac: S.fac || "",
      lvl: S.lvl || 1,
      dmg: WB.playerDmg,
      updated: Date.now()
    });
    db.ref("worldboss/state/hp").transaction((curr) => {
      // Nếu Firebase chưa có hoặc đang lưu số 0 từ trước nhưng boss đang được bật
      if (curr == null || curr <= 0) {
        if (WB.st === "up" && WB.boss && WB.boss.hp > 0) {
          return Math.max(0, WB.boss.hp - d);
        }
        return 0;
      }
      const next = curr - d;
      return next <= 0 ? 0 : next;
    }, (err, committed, snap) => {
      if (committed && snap && snap.val() === 0 && WB.boss && WB.boss.hp <= 0) {
        db.ref("worldboss/state").update({
          st: "dead",
          hp: 0,
          killer: S.name || "Hiệp Sĩ",
          endedAt: Date.now()
        });
        try {
          db.ref("chat/msgs").push({
            cid: "system",
            sys: true,
            name: "Hệ Thống",
            msg: `🏆 Hào kiệt [${S.name || "Hiệp Sĩ"}] đã tung đòn kết liễu Boss Thế Giới Trung Hiếu!`,
            ts: Date.now()
          });
        } catch {}
      }
    });
  } catch (e) {
    console.warn("wbSyncHitFirebase err:", e);
  }
}

let wbFbFirstLoad = true;

function wbInitFirebase() {
  if (!wbFirebaseOn() || wbFbInitialized) return;
  try {
    const db = typeof getFirebaseDb === "function" ? getFirebaseDb() : (typeof firebase !== "undefined" && firebase.apps && firebase.apps.length ? firebase.database() : null);
    if (!db) return;
    wbFbInitialized = true;
    db.ref("worldboss/state").on("value", (snap) => {
      const val = snap.val();
      const sched = getWbSchedule();
      if (!val) {
        WB.st = sched.st;
        WB.next = sched.next;
        updateWbButtonState();
        return;
      }

      // Check whether this Firebase state is relevant to TODAY's scheduled session or an active summon:
      const isSummonActive = !!val.isSummon && val.st === "up" && val.end && (Date.now() < val.end);
      const isTodaySession = (val.todayKey === sched.todayKey) || 
                             (val.startedAt && val.startedAt >= sched.start && val.startedAt <= sched.end);

      if (wbFbFirstLoad) {
        wbFbFirstLoad = false;

        if (isSummonActive) {
          WB.st = "up";
          WB.isSummon = true;
          WB.end = val.end;
          WB.defeatDone = false;
          WB.defeatedHandled = false;
          WB.rewardClaimed = false;
          if (!WB.boss) initBossObj(val.hp);
        } else if (isTodaySession) {
          if (val.st === "up" && val.end && Date.now() < val.end) {
            WB.st = "up";
            WB.isSummon = false;
            WB.end = val.end;
            WB.defeatDone = false;
            WB.defeatedHandled = false;
            WB.rewardClaimed = false;
            if (!WB.boss) initBossObj(val.hp);
          } else {
            WB.st = "dead";
            WB.defeatDone = true;
            WB.defeatedHandled = true;
            WB.rewardClaimed = true;
          }
        } else {
          // Record was from yesterday or past days! Ignore old dead state!
          WB.st = sched.st;
          WB.next = sched.next;
          WB.defeatDone = (sched.st === "dead");
          WB.defeatedHandled = (sched.st === "dead");
          WB.rewardClaimed = (sched.st === "dead");
          if (sched.st === "up") {
            WB.end = sched.end;
            if (!WB.boss) initBossObj();
          }
        }
        updateWbButtonState();
        renderWbDpsMeter();
        return;
      }

      if (val.st === "up") {
        const isUpNow = val.end ? (Date.now() < val.end) : true;
        if (isUpNow) {
          const prevSt = WB.st;
          WB.st = "up";
          WB.isSummon = !!val.isSummon;
          if (val.end) WB.end = val.end;
          WB.defeatDone = false;
          WB.defeatedHandled = false;
          WB.rewardClaimed = false;
          WB.resultModalShown = false;
          if (!WB.boss) initBossObj(val.hp);

          if (prevSt !== "up" && !WB.arena.on) {
            showWbBanner(`⚔ Boss thế giới <b>Trung Hiếu</b> đã xuất hiện tại <b>Phong Lăng Độ</b>!`);
            if (typeof toast === "function") toast("⚔ BOSS THẾ GIỚI TRUNG HIẾU ĐÃ XUẤT HIỆN TẠI PHONG LĂNG ĐỘ!");
            if (typeof uiSfx === "function") uiSfx("gold");
          }
        }
      } else if (val.st === "dead") {
        if (WB.st === "up" && !WB.defeatDone && !WB.isSummon) {
          WB.defeatedHandled = true;
          handleBossDefeated(true, val.killer);
        } else {
          WB.st = "dead";
          WB.defeatDone = true;
        }
      }

      updateWbButtonState();
      renderWbDpsMeter();
    });

    db.ref("worldboss/damage").on("value", (snap) => {
      const val = snap.val();
      WB.realPlayers = val ? Object.values(val) : [];
      updateWbLeaderboard();
      renderWbDpsMeter();
    });
  } catch (e) {
    console.warn("wbInitFirebase err:", e);
  }
}
window.wbInitFirebase = wbInitFirebase;

/**
 * Updates Leaderboard sorted strictly by damage (merging real players & bots)
 */
function updateWbLeaderboard() {
  if (!WB.boss) return;
  const list = [];
  const myCid = typeof chatCid === "function" ? chatCid() : "";
  let hasMe = false;

  if (WB.realPlayers && WB.realPlayers.length) {
    for (const rp of WB.realPlayers) {
      const isMe = rp.cid === myCid || (S && rp.name === S.name);
      if (isMe) hasMe = true;
      list.push({
        name: rp.name || "Hiệp Sĩ",
        dmg: isMe ? Math.max(rp.dmg || 0, WB.playerDmg) : (rp.dmg || 0),
        isPlayer: isMe
      });
    }
  }
  if (!hasMe) {
    list.push({ name: (S && S.name) || "Hiệp Sĩ", dmg: WB.playerDmg, isPlayer: true });
  }

  // If fewer than 5 fighters, fill with remaining bots so list always looks full
  if (list.length < 5 && WB.bots && WB.bots.length) {
    for (const b of WB.bots) {
      if (list.length >= 5) break;
      if (!list.some(x => x.name === b.name)) {
        list.push({ name: b.name, dmg: b.dmg, isPlayer: false });
      }
    }
  }

  list.sort((a, b) => b.dmg - a.dmg);

  const topDmg = list.length > 0 ? Math.max(1, list[0].dmg) : 1;
  const totalDmg = Math.max(1, list.reduce((acc, cur) => acc + (cur.dmg || 0), 0));

  WB.top = list.map((item, idx) => ({
    rank: idx + 1,
    name: item.name,
    dmg: item.dmg,
    share: Math.min(1, item.dmg / topDmg),
    totalShare: item.dmg / totalDmg,
    isPlayer: item.isPlayer
  }));
}

/**
 * Main Tick for World Boss & simulated combat
 */
function wbTick() {
  const sched = getWbSchedule();

  if (!WB.isSummon) {
    if (sched.killedToday) {
      WB.st = "dead";
      WB.defeatDone = true;
      WB.next = sched.next;
      updateWbButtonState();
      updateWbDialogLive();
      return;
    }

    if (sched.st === "up") {
      if (WB.st !== "up" && !WB.defeatDone) {
        spawnWorldBoss(false);
      }
    } else if (sched.st === "soon") {
      if (WB.st !== "soon") {
        WB.st = "soon";
        WB.defeatDone = false;
        WB.defeatedHandled = false;
      }
      WB.next = sched.next;
    } else if (sched.st === "gone") {
      if (WB.st === "up") {
        handleBossDefeated(true);
        return;
      } else {
        WB.st = "gone";
        WB.defeatDone = true;
      }
      WB.next = sched.next;
    }
  }

  // Ensure existing arena limit matches remaining time
  if (WB.arena.on && typeof R === "object" && R && R.dg && R.dg.kind === "worldboss") {
    const rem = (WB.end && WB.end > Date.now()) ? Math.max(1, Math.round((WB.end - Date.now()) / 1000)) : 0;
    R.dg.limit = rem;
    R.dg.t = 0;
  }

  // Check boss expiration (10 mins passed)
  if (WB.st === "up" && WB.end && Date.now() >= WB.end) {
    handleBossDefeated(true);
    return;
  }

  // If in arena, simulate BOT damage every second (accumulate DPS for leaderboard)
  if (WB.arena.on && WB.boss) {
    WB.bots.forEach(b => {
      const variance = 0.85 + Math.random() * 0.3;
      const d = Math.round(b.baseDps * variance);
      b.dmg += d;
    });

    updateWbLeaderboard();
    renderWbDpsMeter();
  }

  renderWbDpsMeter();
  updateWbDialogLive();
  updateWbButtonState();
}

/**
 * When 10m battle timeout expires
 */
function handleBossDefeated(isTimeout = true) {
  if (WB.defeatDone) return;
  WB.defeatDone = true;
  WB.st = "dead";
  const wasSummon = WB.isSummon;
  const dpsEl = document.getElementById("wbDpsMeter");
  if (dpsEl) dpsEl.style.display = "none";
  const sched = getWbSchedule();

  // Only record daily kill date if this was the scheduled daily boss, NOT VLMC summon!
  if (!wasSummon && S && S.rw) {
    S.rw.wbKilledDate = sched.todayKey;
  }

  // Cập nhật Firebase ngay lập tức
  if (wbFirebaseOn()) {
    try {
      const db = typeof getFirebaseDb === "function" ? getFirebaseDb() : (typeof firebase !== "undefined" && firebase.apps && firebase.apps.length ? firebase.database() : null);
      if (db) {
        db.ref("worldboss/state").update({
          st: "dead",
          isSummon: false,
          killer: (S && S.name) || "Hiệp Sĩ",
          endedAt: Date.now()
        });
      }
    } catch (e) {}
  }

  updateWbLeaderboard();
  const top1 = (WB.top && WB.top[0]) || { name: "Hiệp Sĩ", dmg: 0 };
  const top1Name = top1.name;

  showWbBanner(`🏆 <b>Hết 10 phút khiêu chiến Boss Thế Giới!</b> Quán quân TOP 1: <b>${top1Name}</b>.`);
  if (typeof log === "function") {
    log(`🏆 <b>Hết 10 phút khiêu chiến Boss Thế Giới Trung Hiếu!</b> Quán quân sát thương TOP 1 thuộc về <b>${top1Name}</b> (${wbNum(top1.dmg)} sát thương)!`);
  }

  const participated = (WB.playerDmg > 0) || (WB.arena && WB.arena.on);
  if (participated) {
    grantPlayerWbRewards(true);
  }

  if (WB.arena.bossInst) {
    WB.arena.bossInst.act = "st";
  }

  // Gracefully return player to normal training grounds
  if (WB.arena.on && typeof exitWorldBoss === "function") {
    exitWorldBoss(false);
  }

  if (wasSummon) {
    WB.isSummon = false;
  }

  if (participated) {
    setTimeout(() => {
      openWbResultModal(top1Name, true);
    }, 400);
  }

  updateWbButtonState();
}

/**
 * Grant Rewards & 1-day title/halo & real items (strictly by damage ranking)
 */
function grantPlayerWbRewards(isTimeout = false) {
  if (WB.rewardClaimed) return;
  // Non-participants or 0 damage NEVER get rewards
  if (!WB.playerDmg || WB.playerDmg <= 0) {
    WB.rewardClaimed = true;
    return;
  }
  WB.rewardClaimed = true;
  const me = (WB.top || []).find(t => t.isPlayer);
  if (!me || me.dmg <= 0) return;
  let knbGain = 0;
  let goldGain = 0;
  let itemsGained = [];

  const isTop1 = (me.rank === 1);

  if (isTop1) {
    knbGain += 500;
    goldGain += 1000000;

    // 1-Day Title & Halo
    itemsGained.push(
      "👑 Danh hiệu «TOP 1 BTG» (1 ngày)",
      "✨ Vòng sáng Tử Vân (1 ngày)"
    );
    if (S) {
      S.rw = S.rw || {};
      S.rw.titleExp = S.rw.titleExp || {};
      const oneDayMs = 24 * 3600 * 1000;
      S.rw.titleExp.top1_btg = Date.now() + oneDayMs;

      const rw = typeof RW === "function" ? RW() : S.rw;
      rw.titles = rw.titles || {};
      rw.titles.top1_btg = 1;
      rw.title = "top1_btg"; // Auto wear
    }
    if (typeof depositHalo === "function") {
      depositHalo("zw", "TOP 1 BTG", 1, "wb", "lq");
    }

    // 2 REAL Hoàng Kim items
    try {
      const it1 = (typeof forceSetItem === "function" ? forceSetItem(false, true) : null) || (typeof forceSetItem === "function" ? forceSetItem(true) : null);
      if (it1 && typeof addItem === "function") {
        addItem(it1, false, true, true);
        itemsGained.push(`Trang bị HK: ${it1.n}`);
      }
      const it2 = typeof forceSetItem === "function" ? forceSetItem(true) : null;
      if (it2 && typeof addItem === "function") {
        addItem(it2, false, true, true);
        itemsGained.push(`Trang bị HK: ${it2.n}`);
      }
    } catch (e) {
      console.warn("Loot HK error:", e);
    }

    // 1 Huyền Tinh cấp 6
    if (typeof matAdd === "function") {
      matAdd("ht", 6, 1);
      itemsGained.push("1 Huyền Tinh cấp 6");
    }

    // 2 Tiên Thảo Lộ (+50% exp in 120 mins)
    if (typeof addBuff === "function") {
      addBuff("tt", 0.5, 120);
      itemsGained.push("2 Tiên Thảo Lộ (120 phút +50% EXP)");
    }
  } else if (me.rank >= 2 && me.rank <= 5) {
    knbGain += 250;
    goldGain += 400000;
    itemsGained.push("🎖 Danh hiệu «TOP 2-5 BTG» (1 ngày)");
    const rw = typeof RW === "function" ? RW() : (S && S.rw);
    if (rw) {
      rw.titles = rw.titles || {};
      rw.titles.top2_btg = 1;
      rw.titleExp = rw.titleExp || {};
      rw.titleExp.top2_btg = Date.now() + 24 * 3600 * 1000;
    }

    // 1 REAL Hoàng Kim item
    try {
      const it = typeof forceSetItem === "function" ? forceSetItem(true) : null;
      if (it && typeof addItem === "function") {
        addItem(it, false, true, true);
        itemsGained.push(`Trang bị HK: ${it.n}`);
      }
    } catch (e) {
      console.warn("Loot HK error:", e);
    }

    // 1 Huyền Tinh cấp 5
    if (typeof matAdd === "function") {
      matAdd("ht", 5, 1);
      itemsGained.push("1 Huyền Tinh cấp 5");
    }

    // 1 Tiên Thảo Lộ (60 mins)
    if (typeof addBuff === "function") {
      addBuff("tt", 0.5, 60);
      itemsGained.push("1 Tiên Thảo Lộ (60 phút +50% EXP)");
    }
  } else if (me.rank >= 6 && me.rank <= 10) {
    knbGain += 120;
    goldGain += 200000;

    // 1 Huyền Tinh cấp 4
    if (typeof matAdd === "function") {
      matAdd("ht", 4, 1);
      itemsGained.push("1 Huyền Tinh cấp 4");
    }

    // 1 Tiên Thảo Lộ (30 mins)
    if (typeof addBuff === "function") {
      addBuff("tt", 0.5, 30);
      itemsGained.push("1 Tiên Thảo Lộ (30 phút +50% EXP)");
    }
  } else if (me.dmg > 0) {
    knbGain += 50;
    goldGain += 100000;

    // 1 random rare gear item
    try {
      const it = typeof forceSetItem === "function" ? forceSetItem(true) : null;
      if (it && typeof addItem === "function") {
        addItem(it, false, true, true);
        itemsGained.push(`Trang bị: ${it.n}`);
      }
    } catch (e) {
      console.warn("Loot error:", e);
    }
  }

  if (knbGain > 0 && S) S.knb = (S.knb || 0) + knbGain;
  if (goldGain > 0 && S) S.gold = (S.gold || 0) + goldGain;
  if (typeof save === "function") save();
  if (typeof uiSfx === "function") uiSfx("levelup");

  if (typeof log === "function") {
    const rewardStrs = [
      knbGain ? `+${wbNum(knbGain)} KNB` : "",
      goldGain ? `+${wbNum(goldGain)} lượng` : "",
      ...itemsGained
    ].filter(Boolean);
    log(`🎁 <b>Nhận thưởng Boss Thế Giới (Hạng #${me.rank}):</b> ${rewardStrs.join(", ")}`);
  }

  WB.lastRewards = {
    rank: me.rank,
    dmg: me.dmg,
    share: me.share,
    isTop1: isTop1,
    isTimeout: isTimeout,
    knb: knbGain,
    gold: goldGain,
    items: itemsGained
  };
}

/**
 * Result Dialog
 */
function openWbResultModal(top1Name, isTimeout = false) {
  if (WB.resultModalShown) return;
  if (!WB.playerDmg || WB.playerDmg <= 0) return;
  WB.resultModalShown = true;
  const r = WB.lastRewards || {};
  const medal = r.rank === 1 ? "👑" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : `#${r.rank || 1}`;
  let body = `
    <div class="wbbox" style="padding:10px;color:#f3e2b3;font-size:14px;line-height:1.5">
      <h3 style="color:#ffd700;text-align:center;margin:4px 0 10px">🏆 Kết Quả Boss Thế Giới 🏆</h3>
      <p style="text-align:center;font-size:15px;margin-bottom:10px">
        ${isTimeout ? `⏰ <b>Đã hết thời gian khiêu chiến 10 phút!</b> Quán quân sát thương: <b>${top1Name}</b>.` : `Boss <b>Trung Hiếu</b> đã kết thúc khiêu chiến! TOP 1 Sát Thương: <b>${top1Name}</b>.`}
      </p>
  `;

  if (r.isTop1) {
    body += `
      <div style="background:rgba(255,215,0,0.18);border:1.5px solid #ffd700;border-radius:6px;padding:10px;text-align:center;margin-bottom:10px">
        <b style="color:#ffd700;font-size:16px">👑 BẠN ĐẠT TOP 1 SÁT THƯƠNG BOSS THẾ GIỚI! 👑</b>
        <div style="font-size:13px;color:#fff;margin-top:4px">
          Được phong tặng danh hiệu <b style="color:#ffd700">«TOP 1 BTG»</b> (hiệu lực 1 ngày) và <b style="color:#bf55ec">Vòng Sáng Tử Vân</b>!
        </div>
      </div>
    `;
  }

  body += `
      <div style="background:rgba(255,215,140,0.06);border:1px solid rgba(176,138,58,0.3);border-radius:6px;padding:10px;margin-bottom:10px">
        <div><b>Hạng sát thương:</b> <span style="color:#ffd700;font-size:16px;font-weight:bold">${medal} Hạng ${r.rank || 1}</span></div>
        <div><b>Sát thương gây ra:</b> ${wbNum(r.dmg)} (${((r.share || 0) * 100).toFixed(1)}%)</div>
        <div style="margin-top:8px;border-top:1px dashed #6b4a1e;padding-top:8px">
          <b>Vật phẩm đã nhận được vào túi:</b>
          <ul style="margin:6px 0 0 18px;padding:0">
            ${r.knb ? `<li style="color:#ffd24a;font-weight:bold">+${wbNum(r.knb)} Kim Nguyên Bảo</li>` : ""}
            ${r.gold ? `<li style="color:#fff;font-weight:bold">+${wbNum(r.gold)} Lượng</li>` : ""}
            ${(r.items || []).map(it => `<li style="color:#8fe08a">${it}</li>`).join("")}
          </ul>
        </div>
      </div>
      <div class="btnrow" style="text-align:center;margin-top:14px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
        <button class="btn on" onclick="exitWorldBoss(true); closeModal(true);" style="font-size:15px;padding:8px 24px;font-weight:bold;background:#2d882d;color:#fff;border:1px solid #5cd65c">🚪 Quay Lại Bãi Luyện Công</button>
        <button class="btn" onclick="closeModal(true)">Đóng</button>
      </div>
    </div>
  `;

  if (typeof openModal === "function") openModal(body);
  else if (typeof modal === "function") modal(body);
}

/**
 * Notice banner at top
 */
function showWbBanner(html) {
  let el = document.getElementById("wbBan");
  if (!el) {
    el = document.createElement("div");
    el.id = "wbBan";
    document.body.appendChild(el);
  }
  el.innerHTML = `
    <span>${html}</span>
    ${WB.st === "up" ? '<button class="btn" onclick="joinWorldBoss()">Tham chiến</button>' : ""}
    <button class="btn" onclick="openWorldBossModal()">Xem</button>
    <button class="wbx" onclick="hideWbBanner()" title="Đóng">✕</button>
  `;
  el.classList.add("on");
  clearTimeout(WB.bannerTimer);
  WB.bannerTimer = setTimeout(hideWbBanner, 15000);
}

function hideWbBanner() {
  const el = document.getElementById("wbBan");
  if (el) el.classList.remove("on");
}

/**
 * Player enters Combat Arena: map img/z/337.jpg exclusively with ONLY Boss Trung Hiếu
 */
function joinWorldBoss() {
  const sched = getWbSchedule();
  if (WB.st !== "up" || !WB.boss) {
    spawnWorldBoss(sched.st !== "up");
  }
  if (!WB.boss) {
    WB.boss = {
      name: WB_BOSS_CONFIG.name,
      title: WB_BOSS_CONFIG.title,
      mapName: WB_BOSS_CONFIG.mapName,
      mapImg: WB_BOSS_CONFIG.mapImg,
      lvl: WB_BOSS_CONFIG.lvl,
      hp: WB_BOSS_CONFIG.hpMax,
      hpMax: WB_BOSS_CONFIG.hpMax,
      series: WB_BOSS_CONFIG.series,
      heroLook: Object.assign({}, WB_BOSS_CONFIG.heroLook)
    };
    WB.st = "up";
    WB.defeatDone = false;
  }
  if (typeof closeModal === "function") closeModal(true);

  WB.arena.on = true;

  if (typeof R === "object" && R) {
    // Leave town if in town
    if (R.town && typeof backFromTown === "function") {
      backFromTown();
    }

    // Enter dungeon mode with kind "worldboss" so fieldTick never purges R.enemies
    if (typeof dgEnterCommon === "function") {
      dgEnterCommon();
    }

    // Load exclusively map 337 (Phong Lăng Độ · Thuyền)
    if (typeof obsLoad === "function") {
      obsLoad(337);
    }
    R.bgImg = (typeof img === "function") ? img(WB_BOSS_CONFIG.mapImg) : null;
    R.zoneShown = "Boss Thế Giới: Trung Hiếu";

    // Place hero safely on the boat deck
    const heroPos = (typeof inWorld === "function") ? inWorld(2150, 1130) : [2150, 1130];
    H.x = heroPos[0];
    H.y = heroPos[1];
    H.dir = 1;

    // Create the Boss Trung Hiếu entity cleanly as a hero-boss NPC
    const spawnX = H.x + 130;
    const spawnY = H.y - 30;
    const bossHp = 999999999;
    const b = {
      id: "wb_boss_trunghieu",
      tid: 9999,
      n: WB_BOSS_CONFIG.name,
      wb: true,
      isWbBoss: true,
      cls: "boss",
      goldBoss: true,
      aggro: true,
      L: WB_BOSS_CONFIG.lvl,
      lvl: WB_BOSS_CONFIG.lvl,
      x: spawnX,
      y: spawnY,
      dir: 5,
      act: "st",
      actT: 0,
      hp: bossHp,
      max: bossHp,
      r: 60,
      series: WB_BOSS_CONFIG.series,
      dmg: 13500,
      ar: 25000,
      def: 2500,
      atkCd: 0.27,
      cd: 0.27,
      spd: 85,
      reach: 100,
      hitT: 0,
      animKey: "pl_gaibang",
      heroLook: Object.assign({}, WB_BOSS_CONFIG.heroLook),
      res: { phys: 85, fire: 85, cold: 85, light: 85, poison: 85 },
      stunRed: 100,
      freezeRed: 100,
      shOk: true
    };

    R.spawnT = 0;
    R.stall = 0;

    const remSec = (WB.end && WB.end > Date.now())
      ? Math.max(1, Math.round((WB.end - Date.now()) / 1000))
      : 600;

    R.dg = {
      kind: "worldboss",
      d: { n: "Boss Thế Giới: Trung Hiếu" },
      room: 1,
      rooms: 1,
      limit: remSec,
      t: 0,
      boss: b
    };

    // ONLY Boss Trung Hiếu on the map, no other monsters
    R.enemies = [b];
    R.corpses = [];
    R.ground = [];
    WB.arena.bossInst = b;

    const oldExit = document.getElementById("wbExitBtn");
    if (oldExit) oldExit.remove();
    if (typeof recalc === "function") recalc();
    if (typeof snapCamera === "function") snapCamera();
    if (typeof toast === "function") toast(`⚔ Đã tiến vào chiến thuyền Phong Lăng Độ khiêu chiến Boss Thế Giới Trung Hiếu!`);
    if (typeof log === "function") log(`⚔ Tiến vào chiến trường khiêu chiến <b>Boss Thế Giới Trung Hiếu</b> tại <b>Phong Lăng Độ</b>!`);
  }
}

function showWbExitButton() {
  const btn = document.getElementById("wbExitBtn");
  if (btn) btn.remove();
}

function hideWbExitButton() {
  const btn = document.getElementById("wbExitBtn");
  if (btn) btn.remove();
}
window.showWbExitButton = showWbExitButton;
window.hideWbExitButton = hideWbExitButton;

/**
 * Exit Combat Arena back to normal training stage
 */
function exitWorldBoss(notify = true) {
  WB.arena.on = false;
  hideWbExitButton();
  const dpsEl = document.getElementById("wbDpsMeter");
  if (dpsEl) dpsEl.style.display = "none";
  if (typeof R === "object" && R) {
    R.dg = null;
    R.enemies = [];
    R.corpses = [];
    R.zoneShown = null;
    R.stall = 0;
    R.spawnT = 0.8;
    const stage = (S && S.stage) || 1;
    const maxStages = (typeof STAGES !== "undefined" ? STAGES : 30);
    const targetStage = Math.min(stage, maxStages);
    const z = typeof zoneOf === "function" ? zoneOf(targetStage) : null;
    if (z && typeof onZoneChange === "function") {
      onZoneChange(z);
    }
    if (typeof fieldInit === "function") {
      fieldInit();
    }
    if (typeof inWorld === "function" && typeof H !== "undefined" && H) {
      [H.x, H.y] = inWorld(H.x || 1500, H.y || 1000);
    }
    if (typeof recalc === "function") recalc();
    if (typeof snapCamera === "function") snapCamera();
  }
  if (notify && typeof toast === "function") toast("Đã rời chiến trường Boss Thế Giới, quay lại bãi luyện công.");
  if (typeof refresh === "function") refresh();
}
window.exitWorldBoss = exitWorldBoss;

/**
 * Damage hook from player combat
 */
function onHeroHitWb(dmg) {
  if (!WB.arena.on || WB.st !== "up" || !WB.boss) return;
  WB.playerDmg += dmg;
  wbPendingDmg += dmg;
  if (WB.arena.bossInst) {
    WB.arena.bossInst.hp = WB.arena.bossInst.max || 999999999;
  }
  updateWbLeaderboard();
  renderWbDpsMeter();

  if (wbFirebaseOn()) {
    const now = Date.now();
    if (now - wbLastSyncT > 300) {
      wbSyncHitFirebase();
    } else if (!wbSyncTimer) {
      wbSyncTimer = setTimeout(() => {
        wbSyncTimer = null;
        wbSyncHitFirebase();
      }, 350);
    }
  }
}

function isWbHeroVlmc() {
  if (typeof window.isHeroWearingVlmc === "function") return window.isHeroWearingVlmc();
  const tw = typeof titleWorn === "function" ? titleWorn() : null;
  if (tw) return tw[0] === "vlmc";
  const rw = typeof RW === "function" ? RW() : (S && S.rw);
  return !!(rw && rw.title === "vlmc");
}

/**
 * Main World Boss Dialog
 */
function openWorldBossModal() {
  hideWbBanner();
  const sched = getWbSchedule();

  if (sched.st === "up" && !sched.killedToday && (WB.st !== "up" || !WB.boss)) {
    spawnWorldBoss(false);
  }

  const isUp = (WB.st === "up" || (sched.st === "up" && !sched.killedToday)) && WB.boss;
  const remSec = isUp
    ? Math.max(0, ((WB.end || sched.end) - Date.now()) / 1000)
    : Math.max(0, (sched.next - Date.now()) / 1000);
  const b = WB.boss;
  const me = (WB.top || []).find(t => t.isPlayer) || { rank: 1, dmg: WB.playerDmg, share: 0 };

  const content = `
    <div id="wbBox" class="wbbox" style="padding:10px;color:#f3e2b3;font-size:14px;line-height:1.5">
      <h3 style="color:#ffd700;text-align:center;margin:0 0 8px">⚔ Boss Thế Giới: Trung Hiếu ⚔</h3>
      <div id="wbIn">
        ${isUp && b ? `
          <div style="background:rgba(255,100,0,0.12);border:1px solid #c96d1a;border-radius:6px;padding:10px 12px;margin-bottom:10px;text-align:center">
            <div style="font-size:15px;color:#ffd700;font-weight:bold">⚔ ${b.name} (${b.title})</div>
            <div style="font-size:12px;color:#bbb;margin:4px 0">Chiến trường độc quyền: <b>${b.mapName}</b></div>
            <div style="margin-top:8px;padding:8px;background:rgba(0,0,0,0.4);border-radius:4px;border:1px solid rgba(255,204,0,0.3)">
              <div style="font-size:12px;color:#eee">⏱ Thời gian khiêu chiến còn lại:</div>
              <div class="wbt" style="font-size:22px;color:#ffcc00;font-weight:bold;margin-top:2px">${wbFormatTime(remSec)}</div>
              <div style="font-size:11px;color:#aaa;margin-top:3px">Sự kiện tính tổng sát thương gây ra để xếp hạng BXH</div>
            </div>
          </div>
          <p class="small" style="color:#bbb;margin:6px 0;text-align:center">
            Sát thương hiện tại của bạn: <b style="color:#ffd700">${wbNum(me.dmg)}</b> (Hạng <b style="color:#ffcc00">#${me.rank}</b>)
          </p>

          <div class="btnrow" style="margin:12px 0;display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
            ${(WB.arena.on || (typeof R === "object" && R && R.dg && R.dg.kind === "worldboss")) ? `
              <button class="btn on red" onclick="exitWorldBoss(true); closeModal(true);" style="font-size:14px;padding:6px 18px;font-weight:bold">🚪 Quay Lại Bãi Luyện Công</button>
            ` : `
              <button class="btn on" onclick="joinWorldBoss()">Tham chiến</button>
            `}
            ${isWbHeroVlmc() ? '<button class="btn" onclick="spawnWorldBoss(true); openWorldBossModal();">⚡ Triệu hồi lại Boss (VLMC)</button>' : ''}
          </div>
        ` : `
          <div style="background:rgba(255,215,140,0.08);border:1px solid rgba(176,138,58,0.3);border-radius:6px;padding:12px;text-align:center;margin-bottom:12px">
            <p style="margin:0 0 6px;color:#ffcc00;font-size:15px">
              ${sched.killedToday ? "🏆 Boss hôm nay đã kết thúc thời gian khiêu chiến!" : "⏰ Giờ xuất hiện: <b>19:00 (7h tối)</b> mỗi ngày (1 lần duy nhất)."}
            </p>
            <p style="margin:0;color:#aaa;font-size:13px">
              Lần tiếp theo: <b>${wbFormatNextDate(sched.next)}</b> (còn <b class="wbt" style="color:#ffd700">${wbFormatTime(remSec)}</b>)
            </p>
          </div>
          ${(WB.arena.on || (typeof R === "object" && R && R.dg && R.dg.kind === "worldboss")) ? `
          <div class="btnrow" style="text-align:center;margin:12px 0;display:flex;gap:8px;justify-content:center">
            <button class="btn on red" onclick="exitWorldBoss(true); closeModal(true);" style="font-size:14px;padding:6px 18px;font-weight:bold">🚪 Quay Lại Bãi Luyện Công</button>
          </div>` : ''}
          ${isWbHeroVlmc() ? `
          <div class="btnrow" style="text-align:center;margin:12px 0;display:flex;gap:8px;justify-content:center">
            <button class="btn on" onclick="spawnWorldBoss(true); openWorldBossModal();">⚡ Triệu hồi thử nghiệm (Võ Lâm Minh Chủ)</button>
          </div>` : ''}
        `}

        <h4 style="color:#ffd700;margin:14px 0 6px">🎁 Phần thưởng trận chiến</h4>
        ${renderWbRewardTable()}
      </div>
    </div>
  `;

  if (typeof openModal === "function") openModal(content);
  else if (typeof modal === "function") modal(content);
}

function updateWbDialogLive() {
  const wbIn = document.getElementById("wbIn");
  if (!wbIn) return;
  const timeTxt = wbIn.querySelector(".wbt");
  if (timeTxt) {
    const sched = getWbSchedule();
    const isUp = (WB.st === "up" || (sched.st === "up" && !sched.killedToday)) && WB.boss;
    const remSec = isUp
      ? Math.max(0, ((WB.end || sched.end) - Date.now()) / 1000)
      : Math.max(0, (sched.next - Date.now()) / 1000);
    timeTxt.textContent = wbFormatTime(remSec);
  }
}

function renderWbLeaderboardTable(topList) {
  if (!topList || !topList.length) return '<p class="dim small">Chưa có ai gây sát thương.</p>';
  return `
    <table class="wbtab">
      <tr><th>#</th><th>Nhân vật</th><th>Sát thương</th><th>%</th></tr>
      ${topList.slice(0, 10).map(e => `
        <tr style="${e.isPlayer ? 'color:#ffd700;font-weight:bold;background:rgba(255,215,0,0.1)' : ''}">
          <td>${e.rank}</td>
          <td>${e.name}${e.isPlayer ? " (Bạn)" : ""}</td>
          <td>${wbNum(e.dmg)}</td>
          <td>${((e.share || 0) * 100).toFixed(1)}%</td>
        </tr>
      `).join("")}
    </table>
  `;
}

function renderWbRewardTable() {
  const haloBadge = (typeof renderHaloBadge === "function") ? renderHaloBadge('zw', 22) : '<i>✨</i>';
  return `
    <table class="rwt">
      <tr><th>Hạng</th><th>Phần thưởng</th><th>Vòng sáng · danh hiệu</th></tr>
      <tr class="rwlast">
        <td class="rwr0"><i class="rwe">👑</i>TOP 1</td>
        <td>
          <span class="rwc knb" title="500 Kim Nguyên Bảo"><img src="img/ep/knb.png"><b>×500</b></span>
          <span class="rwc" title="1.000.000 lượng"><i class="rwe">🪙</i><b>1.000.000</b></span>
          <span class="rwc hk" title="2 trang bị Hoàng Kim"><img src="img/i/g0.png"><b>×2</b></span>
          <span class="rwc" title="Huyền Tinh cấp 6"><img src="img/ep/ht.png"><b>c6</b></span>
          <span class="rwc" title="2 Tiên Thảo Lộ"><img src="img/ep/tt.png"><b>×2</b></span>
        </td>
        <td>
          <span class="rwp">
            <span class="rwc halo" title="Vòng sáng Tử Vân 1 ngày">${haloBadge}<b>1 ngày</b></span>
            <span style="color:#ffd700;font-weight:bold">«TOP 1 BTG»</span>
          </span>
        </td>
      </tr>
      <tr>
        <td class="rwr0">2–5</td>
        <td>
          <span class="rwc knb"><img src="img/ep/knb.png"><b>×250</b></span>
          <span class="rwc"><i class="rwe">🪙</i><b>400.000</b></span>
          <span class="rwc hk"><img src="img/i/g0.png"><b>×1</b></span>
          <span class="rwc"><img src="img/ep/ht.png"><b>c5</b></span>
          <span class="rwc"><img src="img/ep/tt.png"><b>×1</b></span>
        </td>
        <td><span style="color:#6aa8ff">«TOP 2-5 BTG»</span> <small style="color:#aaa">(1 ngày)</small></td>
      </tr>
      <tr>
        <td class="rwr0">6–10</td>
        <td>
          <span class="rwc knb"><img src="img/ep/knb.png"><b>×120</b></span>
          <span class="rwc"><i class="rwe">🪙</i><b>200.000</b></span>
          <span class="rwc"><img src="img/ep/ht.png"><b>c4</b></span>
          <span class="rwc"><img src="img/ep/tt.png"><b>×1</b></span>
        </td>
        <td><span class="dim">—</span></td>
      </tr>
      <tr>
        <td class="rwr0">≥0.5%</td>
        <td>
          <span class="rwc knb"><img src="img/ep/knb.png"><b>×50</b></span>
          <span class="rwc"><i class="rwe">🪙</i><b>100.000</b></span>
          <span class="rwc blue"><img src="img/i/0_10.png"><b>×1</b></span>
        </td>
        <td><span class="dim">—</span></td>
      </tr>
    </table>
    <p class="rwnote" style="font-size:12px;color:#aaa;margin-top:6px">
      ✨ <b>Danh hiệu TOP 1 BTG (kèm Vòng Sáng Tử Vân) & Danh hiệu TOP 2-5 BTG</b> có hiệu lực <b>1 ngày (24 giờ)</b> sau khi đạt được.
    </p>
  `;
}

function updateWbButtonState() {
  const btn = document.getElementById("u20wb");
  if (btn) {
    btn.classList.toggle("wbup", WB.st === "up");
    btn.classList.toggle("wbsoon", WB.st === "soon");
  }
  const topBtn = document.getElementById("wbTopBtn");
  if (topBtn) {
    topBtn.classList.toggle("wbup", WB.st === "up");
    topBtn.classList.toggle("wbsoon", WB.st === "soon");
  }
  const sysBtn = document.getElementById("bWbSys");
  if (sysBtn) {
    sysBtn.classList.toggle("wbup", WB.st === "up");
    sysBtn.classList.toggle("wbsoon", WB.st === "soon");
  }
}

/**
 * Global Event Delegation for clicking #u20wb & #wbTopBtn & #bWbSys
 */
document.addEventListener("click", function(e) {
  const btn = e.target && e.target.closest("#u20wb, #wbTopBtn, #bWbSys");
  if (btn) {
    e.preventDefault();
    openWorldBossModal();
  }
});

function injectWbStyles() {
  if (document.getElementById("wbCss")) return;
  const style = document.createElement("style");
  style.id = "wbCss";
  style.textContent = `
    #wbBan {
      position: fixed;
      left: 50%;
      top: calc(8px + env(safe-area-inset-top, 0px));
      transform: translate(-50%, -140%);
      z-index: 9000;
      display: flex;
      gap: 8px;
      align-items: center;
      max-width: min(94vw, 640px);
      padding: 8px 12px;
      border: 1px solid #b08a3a;
      border-radius: 8px;
      background: rgba(29, 22, 13, 0.94);
      color: #f3e2b3;
      font-size: 14px;
      box-shadow: 0 4px 18px rgba(0, 0, 0, 0.5);
      box-sizing: border-box;
      visibility: hidden;
      pointer-events: none;
      transition: transform 0.35s, visibility 0s 0.35s;
    }
    #wbBan.on {
      transform: translate(-50%, 0);
      visibility: visible;
      pointer-events: auto;
      transition: transform 0.35s;
    }
    #wbBan span { flex: 1; line-height: 1.35; }
    #wbBan .btn { white-space: nowrap; }
    #wbBan .wbx { background: none; border: 0; color: #c9b27a; cursor: pointer; font-size: 15px; }
    @media (max-width: 600px) {
      #wbBan {
        flex-wrap: wrap;
        justify-content: center;
        width: calc(100vw - 16px);
        max-width: none;
        font-size: 13px;
        padding: 6px 8px;
        gap: 6px;
      }
      #wbBan span { flex: 1 1 100%; text-align: center; }
    }
    #u20wb.wbup {
      color: #ffd24a;
      text-shadow: 0 0 6px #f40;
      animation: wbPulse 1.2s infinite alternate;
    }
    #u20wb.wbsoon { color: #ffe9a6; }
    @keyframes wbPulse {
      to { filter: brightness(1.6); transform: scale(1.05); }
    }
    .wbbox p { margin: 6px 0; line-height: 1.45; }
    .wbbox h4 { margin: 10px 0 4px; }
    .wbhp {
      position: relative;
      height: 18px;
      border: 1px solid #6b4a1e;
      border-radius: 4px;
      background: #1a0f08;
      overflow: hidden;
      margin: 6px 0;
    }
    .wbhp i {
      position: absolute;
      left: 0; top: 0; bottom: 0;
      background: linear-gradient(#e0402a, #8e1a10);
      transition: width 0.3s;
    }
    .wbhp span {
      position: relative;
      display: block;
      text-align: center;
      font-size: 12px;
      line-height: 18px;
      color: #fff;
      text-shadow: 0 1px 2px #000;
    }
    .wbtab { width: 100%; border-collapse: collapse; font-size: 13px; }
    .wbtab th, .wbtab td {
      padding: 3px 6px;
      border-bottom: 1px solid rgba(176, 138, 58, 0.25);
      text-align: left;
    }
    .wbtab td:nth-child(n+3), .wbtab th:nth-child(n+3) { text-align: right; }
    .rwt {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0 3px;
      font-size: 13px;
      margin: 4px 0;
    }
    .rwt th {
      padding: 2px 6px;
      font-size: 11px;
      font-weight: normal;
      color: #a8946a;
      text-align: left;
    }
    .rwt td {
      padding: 4px 6px;
      background: rgba(255, 215, 140, 0.06);
      border-top: 1px solid rgba(176, 138, 58, 0.22);
      border-bottom: 1px solid rgba(176, 138, 58, 0.22);
      vertical-align: middle;
    }
    .rwt td:first-child { border-left: 1px solid rgba(176, 138, 58, 0.22); border-radius: 6px 0 0 6px; }
    .rwt td:last-child { border-right: 1px solid rgba(176, 138, 58, 0.22); border-radius: 0 6px 6px 0; }
    .rwt .rwr0 {
      width: 1%;
      min-width: 40px;
      white-space: nowrap;
      font-weight: bold;
      color: #ffe9a6;
      text-align: center;
    }
    .rwt tr.rwlast td { background: rgba(255, 107, 61, 0.12); }
    .rwc {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      margin: 1px 6px 1px 0;
      white-space: nowrap;
      vertical-align: middle;
    }
    .rwc img { width: 22px; height: 22px; object-fit: contain; image-rendering: pixelated; }
    .rwc b { font-size: 12px; color: #fff; font-weight: bold; }
    .rwc.blue img { filter: drop-shadow(0 0 2px #6aa8ff); }
    .rwc.hk img { filter: drop-shadow(0 0 2px #ffcc00); }
    .rwc.knb b { color: #ffd24a; }
    .rwc.halo b { font-weight: normal; color: #e8dcc0; font-size: 11px; }
    .rwh { display: inline-block; background-repeat: no-repeat; vertical-align: middle; }
    .rwe { font-style: normal; margin-right: 2px; }
    .rwp { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 4px; }
    #wbDpsMeter {
      position: fixed;
      left: 10px;
      top: 56px;
      z-index: 99;
      width: 242px;
      background: radial-gradient(circle at 50% 30%, #241a0e 0%, #120c06 100%);
      border: 2px solid #9e7f42;
      outline: 1px solid #140d05;
      outline-offset: -3px;
      box-shadow: 0 4px 18px rgba(0, 0, 0, 0.9), inset 0 0 12px rgba(0, 0, 0, 0.85), 0 0 0 1px #46341a;
      border-radius: 4px;
      color: #f3e2b3;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "IBM Plex Mono", sans-serif;
      font-size: 11.5px;
      line-height: 1.35;
      pointer-events: auto;
      user-select: none;
      display: none;
      backdrop-filter: blur(4px);
    }
    #wbDpsMeter::before,
    #wbDpsMeter::after {
      content: "";
      position: absolute;
      width: 7px;
      height: 7px;
      pointer-events: none;
      z-index: 10;
    }
    #wbDpsMeter::before {
      top: -2px; left: -2px;
      border-top: 2px solid #ffd700;
      border-left: 2px solid #ffd700;
      box-shadow: 0 0 3px rgba(255, 215, 0, 0.7);
    }
    #wbDpsMeter::after {
      bottom: -2px; right: -2px;
      border-bottom: 2px solid #ffd700;
      border-right: 2px solid #ffd700;
      box-shadow: 0 0 3px rgba(255, 215, 0, 0.7);
    }
    #wbDpsMeter .wbdps-head {
      position: relative;
      display: flex;
      justify-content: space-between;
      align-items: center;
      height: 27px;
      padding: 0 8px;
      background:
        url(ui/jx1/tl.png) left center/auto 100% no-repeat,
        url(ui/jx1/tr.png) right center/auto 100% no-repeat,
        url(ui/jx1/tm.png) center/auto 100% repeat-x;
      border-bottom: 1px solid #3c2a13;
      font-weight: bold;
      color: #0f1a14;
      text-shadow: 0 0 3px #bfe8d4, 0 0 1px #bfe8d4;
      font-size: 12px;
      letter-spacing: 0.5px;
      border-radius: 2px 2px 0 0;
    }
    #wbDpsMeter .wbdps-head::before {
      content: "";
      position: absolute;
      top: -2px; right: -2px;
      width: 7px; height: 7px;
      border-top: 2px solid #ffd700;
      border-right: 2px solid #ffd700;
      pointer-events: none;
      box-shadow: 0 0 3px rgba(255, 215, 0, 0.7);
    }
    #wbDpsMeter .wbdps-title {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-weight: bold;
      color: #0d1714;
      text-shadow: 0 0 3px #bfe8d4, 0 0 1px #bfe8d4;
    }
    #wbDpsMeter .wbdps-btn {
      background: linear-gradient(180deg, #443621 0%, #1e170c 100%);
      border: 1px solid #9e8144;
      color: #ffd700;
      cursor: pointer;
      width: 19px;
      height: 19px;
      line-height: 17px;
      border-radius: 2px;
      padding: 0;
      text-align: center;
      font-size: 13px;
      font-weight: bold;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 1px 3px rgba(0, 0, 0, 0.6);
      text-shadow: 0 1px 1px #000;
    }
    #wbDpsMeter .wbdps-btn:hover {
      filter: brightness(1.2);
      border-color: #ffd700;
    }
    #wbDpsMeter .wbdps-body {
      position: relative;
      padding: 4px 5px;
      display: flex;
      flex-direction: column;
      gap: 3px;
      background: rgba(14, 10, 6, 0.75);
    }
    #wbDpsMeter .wbdps-body::after {
      content: "";
      position: absolute;
      bottom: -2px; left: -2px;
      width: 7px; height: 7px;
      border-bottom: 2px solid #ffd700;
      border-left: 2px solid #ffd700;
      pointer-events: none;
      box-shadow: 0 0 3px rgba(255, 215, 0, 0.7);
    }
    #wbDpsMeter .wbdps-row {
      position: relative;
      display: flex;
      align-items: center;
      padding: 3px 6px;
      border-radius: 2px;
      background: rgba(30, 22, 13, 0.7);
      border: 1px solid rgba(142, 115, 67, 0.3);
      overflow: hidden;
      font-size: 11.5px;
      box-sizing: border-box;
    }
    #wbDpsMeter .wbdps-row.r1 {
      background: linear-gradient(90deg, rgba(255, 215, 0, 0.22) 0%, rgba(255, 140, 0, 0.08) 100%);
      border-color: #d4af37;
      box-shadow: 0 0 6px rgba(255, 215, 0, 0.25);
    }
    #wbDpsMeter .wbdps-row.me {
      background: linear-gradient(90deg, rgba(255, 215, 0, 0.32) 0%, rgba(184, 134, 11, 0.16) 100%);
      border: 1px solid #ffd700;
      box-shadow: inset 0 0 8px rgba(255, 215, 0, 0.35), 0 0 6px rgba(255, 215, 0, 0.2);
      color: #fff;
    }
    #wbDpsMeter .wbdps-rank {
      width: 22px;
      font-weight: bold;
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      font-size: 12px;
    }
    #wbDpsMeter .wbdps-name {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-right: 4px;
      z-index: 1;
      text-shadow: 0 1px 2px #000;
    }
    #wbDpsMeter .wbdps-val {
      font-size: 11px;
      color: #ffe9a6;
      white-space: nowrap;
      z-index: 1;
      text-shadow: 0 1px 2px #000;
    }
    #wbDpsMeter .wbdps-val small {
      color: #c4b694;
    }
    #wbDpsMeter .wbdps-bar {
      position: absolute;
      left: 0; top: 0; bottom: 0;
      background: linear-gradient(90deg, rgba(184, 134, 11, 0.3) 0%, rgba(212, 175, 55, 0.15) 100%);
      border-right: 1px solid rgba(255, 215, 0, 0.3);
      z-index: 0;
      pointer-events: none;
    }
    #wbDpsMeter .wbdps-row.r1 .wbdps-bar {
      background: linear-gradient(90deg, rgba(255, 215, 0, 0.45) 0%, rgba(255, 140, 0, 0.2) 100%);
      border-right: 1px solid #ffd700;
    }
    #wbDpsMeter .wbdps-row.me .wbdps-bar {
      background: linear-gradient(90deg, rgba(255, 215, 0, 0.5) 0%, rgba(255, 180, 0, 0.25) 100%);
      border-right: 1px solid #fff;
    }
    #wbDpsMeter .wbdps-sep {
      text-align: center;
      color: #9e8144;
      font-size: 11px;
      line-height: 8px;
      letter-spacing: 2px;
    }
    #wbDpsMeter .wbdps-mini {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 5px 8px;
      cursor: pointer;
      background:
        url(ui/jx1/tl.png) left center/auto 100% no-repeat,
        url(ui/jx1/tr.png) right center/auto 100% no-repeat,
        url(ui/jx1/tm.png) center/auto 100% repeat-x;
      color: #0d1714;
      text-shadow: 0 0 2px #bfe8d4;
      font-size: 11.5px;
      font-weight: bold;
    }
    @media (max-width: 600px) {
      #wbDpsMeter {
        width: 185px;
        left: 6px;
        top: 54px;
      }
    }
  `;
  document.head.appendChild(style);
}

/**
 * Live Outside DPS Leaderboard Overlay
 */
function renderWbDpsMeter() {
  let el = document.getElementById("wbDpsMeter");
  if (!el) {
    el = document.createElement("div");
    el.id = "wbDpsMeter";
    document.body.appendChild(el);
  }
  if (!WB.arena.on || WB.st !== "up" || !WB.boss) {
    el.style.display = "none";
    return;
  }
  el.style.display = "block";

  const isCollapsed = el.dataset.collapsed === "1";
  const me = (WB.top || []).find(t => t.isPlayer) || { rank: 1, dmg: WB.playerDmg, share: 0 };

  const remSec = Math.max(0, (WB.end - Date.now()) / 1000);
  const timeStr = wbFormatTime(remSec);

  if (isCollapsed) {
    el.innerHTML = `
      <div class="wbdps-mini" onclick="toggleWbDpsMeter()" style="display:flex;align-items:center;justify-content:space-between;gap:4px">
        <span>⚔ <b>#${me.rank}</b> Bạn (${wbNum(me.dmg)}) · <b style="color:#ffd700">${timeStr}</b></span>
        <span style="display:inline-flex;gap:4px;align-items:center">
          <button class="wbdps-btn" title="Mở rộng BXH">▸</button>
          <button class="btn sm red" onclick="event.stopPropagation(); exitWorldBoss(true);" title="Rời Boss về bãi" style="font-size:11px;padding:1px 6px">🚪 Về bãi</button>
        </span>
      </div>
    `;
    return;
  }

  const top5 = (WB.top || []).slice(0, 5);
  const isMeInTop5 = top5.some(t => t.isPlayer);

  let rowsHtml = top5.map(t => {
    const pct = Math.round((t.share || 0) * 100);
    const isMe = t.isPlayer;
    const isR1 = t.rank === 1;
    const rankCol = isR1 ? '#ffd700' : t.rank <= 3 ? '#6aa8ff' : '#ddd';
    const rankIcon = isR1 ? '👑' : t.rank === 2 ? '🥈' : t.rank === 3 ? '🥉' : `#${t.rank}`;
    return `
      <div class="wbdps-row${isR1 ? ' r1' : ''}${isMe ? ' me' : ''}">
        <span class="wbdps-rank" style="color:${rankCol}">${rankIcon}</span>
        <span class="wbdps-name" title="${t.name}">${isMe ? '<b style="color:#ffd700">【 Bạn 】</b>' : t.name}</span>
        <span class="wbdps-val">${wbNum(t.dmg)} <small>(${pct}%)</small></span>
        <div class="wbdps-bar" style="width:${Math.min(100, pct)}%"></div>
      </div>
    `;
  }).join("");

  if (!isMeInTop5 && me) {
    const pct = Math.round((me.share || 0) * 100);
    rowsHtml += `
      <div class="wbdps-sep">···</div>
      <div class="wbdps-row me">
        <span class="wbdps-rank" style="color:#ffd700">#${me.rank}</span>
        <span class="wbdps-name"><b style="color:#ffd700">【 Bạn 】</b></span>
        <span class="wbdps-val">${wbNum(me.dmg)} <small>(${pct}%)</small></span>
        <div class="wbdps-bar" style="width:${Math.min(100, pct)}%"></div>
      </div>
    `;
  }

  el.innerHTML = `
    <div class="wbdps-head">
      <span class="wbdps-title">⚔ BXH SÁT THƯƠNG · ${timeStr} ⚔</span>
      <button class="wbdps-btn" onclick="toggleWbDpsMeter()" title="Thu gọn">−</button>
    </div>
    <div class="wbdps-body">
      ${rowsHtml}
      <div style="padding:6px;text-align:center;border-top:1px solid rgba(255,215,0,0.25);margin-top:6px">
        <button class="btn sm red" onclick="exitWorldBoss(true)" style="width:100%;font-size:12px;padding:5px 8px;font-weight:bold;cursor:pointer">🚪 Rời Khỏi / Quay Lại Bãi</button>
      </div>
    </div>
  `;
}

window.toggleWbDpsMeter = function() {
  const el = document.getElementById("wbDpsMeter");
  if (!el) return;
  el.dataset.collapsed = el.dataset.collapsed === "1" ? "0" : "1";
  renderWbDpsMeter();
};

function initWorldBoss() {
  injectWbStyles();
  renderWbDpsMeter();
  const sched = getWbSchedule();
  WB.st = sched.st;
  WB.next = sched.next;
  updateWbButtonState();
  setInterval(wbTick, 1000);
  if (typeof wbInitFirebase === "function") {
    wbInitFirebase();
  }
}

// Global Exports
window.WB = WB;
window.joinWorldBoss = joinWorldBoss;
window.exitWorldBoss = exitWorldBoss;
window.openWorldBossModal = openWorldBossModal;
window.spawnWorldBoss = spawnWorldBoss;
window.onHeroHitWb = onHeroHitWb;
window.hideWbBanner = hideWbBanner;
window.renderWbDpsMeter = renderWbDpsMeter;
window.handleBossDefeated = handleBossDefeated;
window.openWbResultModal = openWbResultModal;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initWorldBoss);
} else {
  setTimeout(initWorldBoss, 50);
}
