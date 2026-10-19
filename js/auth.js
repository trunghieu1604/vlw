"use strict";

/**
 * === HỆ THỐNG TÀI KHOẢN & ĐỒNG BỘ ĐÁM MÂY (FIREBASE AUTH & CLOUD SAVE) ===
 * Quản lý Đăng ký / Đăng nhập và tự động đồng bộ Save game qua Firebase Realtime Database.
 */

const AUTH = {
  user: null,
  passHash: null,
  cloudMeta: null,
  lastSyncAt: 0,
  syncTimer: null,
  autoSaveTimer: null
};

// Hàm mã hóa mật khẩu SHA-256 an toàn bằng Web Crypto API
async function authHashPass(pass) {
  try {
    const salt = "_jx_cloud_v1_";
    const data = new TextEncoder().encode(salt + pass);
    const hashBuf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch (e) {
    // Fallback nếu môi trường không hỗ trợ crypto.subtle
    let h = 0;
    for (let i = 0; i < pass.length; i++) {
      h = Math.imul(31, h) + pass.charCodeAt(i) | 0;
    }
    return "h_" + Math.abs(h).toString(16);
  }
}

function authFormatTime(ts) {
  if (!ts) return "Chưa lưu";
  const d = new Date(ts);
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (d.toDateString() === now.toDateString()) {
    return `Hôm nay lúc ${timeStr}`;
  }
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} lúc ${timeStr}`;
}

/**
 * Khởi tạo kiểm tra đăng nhập khi mở game
 */
async function initAuth() {
  const savedUser = localStorage.getItem("vl_auth_user");
  const savedHash = localStorage.getItem("vl_auth_pass");

  if (savedUser && savedHash) {
    AUTH.user = savedUser;
    AUTH.passHash = savedHash;
    // Kiểm tra nhanh với Firebase
    authVerifySession(savedUser, savedHash);
  } else {
    // Chưa đăng nhập: Mở màn hình Chào mừng / Đăng nhập
    showLoginOverlay();
  }

  // Lên lịch tự động sync lên mây mỗi 60 giây nếu đã đăng nhập
  if (AUTH.autoSaveTimer) clearInterval(AUTH.autoSaveTimer);
  AUTH.autoSaveTimer = setInterval(() => {
    if (AUTH.user) authCloudSave(false);
  }, 60 * 1000);

  // Lưu khi thoát hoặc ẩn tab
  window.addEventListener("pagehide", () => {
    if (AUTH.user) authCloudSave(false);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && AUTH.user) authCloudSave(false);
  });
}

/**
 * Xác thực phiên đăng nhập đã lưu
 */
function authVerifySession(user, hash) {
  const db = typeof getFirebaseDb === "function" ? getFirebaseDb() : null;
  if (!db) {
    // Không có mạng/DB: vẫn coi như đăng nhập ở máy này
    updateInGameAuthUI();
    return;
  }

  db.ref("accounts/" + user).once("value", (snap) => {
    const data = snap.val();
    if (!data || data.p !== hash) {
      // Mật khẩu đã đổi hoặc tài khoản không hợp lệ
      AUTH.user = null;
      AUTH.passHash = null;
      localStorage.removeItem("vl_auth_user");
      localStorage.removeItem("vl_auth_pass");
      showLoginOverlay();
    } else {
      AUTH.cloudMeta = data;
      // Cập nhật last login
      db.ref("accounts/" + user).update({ lastLogin: Date.now() });
      updateInGameAuthUI();
    }
  }).catch(() => {
    updateInGameAuthUI();
  });
}

/**
 * Hiển thị Màn hình Đăng nhập / Chào mừng (Overlay)
 */
function showLoginOverlay() {
  let el = document.getElementById("loginOverlay");
  if (!el) {
    el = document.createElement("div");
    el.id = "loginOverlay";
    el.className = "login-overlay";
    document.body.appendChild(el);
  }

  el.classList.remove("hidden");
  renderLoginOverlayContent();
}

/**
 * Ẩn Màn hình Đăng nhập
 */
function hideLoginOverlay() {
  const el = document.getElementById("loginOverlay");
  if (el) el.classList.add("hidden");
  updateInGameAuthUI();
}

/**
 * Render nội dung cho Login Overlay
 */
function renderLoginOverlayContent() {
  const el = document.getElementById("loginOverlay");
  if (!el) return;

  if (AUTH.user) {
    // Đã đăng nhập: Hiển thị Thẻ Chào Mừng & Vào Game
    const meta = AUTH.cloudMeta || {};
    const cName = meta.charName || (typeof S !== "undefined" && S && S.name) || "Tân thủ";
    const cLvl = meta.lvl || (typeof S !== "undefined" && S && S.lvl) || 1;
    const cRb = meta.reborn != null ? meta.reborn : (typeof rebornN === "function" ? rebornN() : 0);
    const saveTime = meta.saveAt ? authFormatTime(meta.saveAt) : "Chưa có bản lưu";

    el.innerHTML = `
      <div class="login-card">
        <div class="login-header">
          <h1 class="login-title">VÕ LÂM WEB</h1>
          <div class="login-sub">Kiếm Hiệp Tình Duyên · Nhập Vai Đỉnh Cao</div>
        </div>

        <div style="background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.3);border-radius:8px;padding:14px;margin-bottom:18px;">
          <div style="font-size:15px;color:#ffd700;font-weight:bold;margin-bottom:6px">
            ⚔ Chào mừng Đại Hiệp <span style="color:#fff">${AUTH.user}</span>!
          </div>
          <div style="font-size:13px;color:#c9d5e3;line-height:1.6">
            Nhân vật đám mây: <b style="color:#7ee07e">${cName}</b><br>
            Cấp bậc: <b>Cấp ${cLvl}</b> ${cRb > 0 ? `· <b style="color:#ffb347">Chuyển sinh ${cRb}</b>` : ""}<br>
            Lần lưu đám mây: <span style="color:#aaa">${saveTime}</span>
          </div>
        </div>

        <button class="login-btn-primary" onclick="hideLoginOverlay()">⚔ VÀO GAME TIẾP TỤC</button>
        <button class="login-guest-btn" onclick="authLogout(); renderLoginOverlayContent();">⎋ Đổi Tài Khoản Khác</button>
      </div>
    `;
    return;
  }

  // Chưa đăng nhập: Form Đăng Nhập / Đăng Ký
  el.innerHTML = `
    <div class="login-card">
      <div class="login-header">
        <h1 class="login-title">VÕ LÂM WEB</h1>
        <div class="login-sub">Kiếm Hiệp Tình Duyên · Nhập Vai Đỉnh Cao</div>
      </div>

      <div class="login-tabs">
        <button class="login-tab-btn active" id="tabBtnLogin" onclick="switchLoginTab('login')">Đăng Nhập</button>
        <button class="login-tab-btn" id="tabBtnReg" onclick="switchLoginTab('reg')">Đăng Ký Mới</button>
      </div>

      <!-- FORM ĐĂNG NHẬP -->
      <form id="formLogin" onsubmit="event.preventDefault(); handleAuthLogin();">
        <div class="login-form-group">
          <label class="login-label">Tên tài khoản</label>
          <input type="text" id="authLogU" class="login-input" placeholder="Tên tài khoản (a-z, 0-9)" maxlength="16" autocomplete="username" required>
        </div>
        <div class="login-form-group">
          <label class="login-label">Mật khẩu</label>
          <input type="password" id="authLogP" class="login-input" placeholder="Mật khẩu" maxlength="32" autocomplete="current-password" required>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;font-size:12px;color:#aaa">
          <label style="cursor:pointer;display:flex;align-items:center;gap:5px">
            <input type="checkbox" id="authRemember" checked> Ghi nhớ đăng nhập
          </label>
        </div>
        <button type="submit" id="btnSubmitLogin" class="login-btn-primary">⚔ ĐĂNG NHẬP VÀO GAME</button>
      </form>

      <!-- FORM ĐĂNG KÝ -->
      <form id="formReg" class="hidden" onsubmit="event.preventDefault(); handleAuthRegister();">
        <div class="login-form-group">
          <label class="login-label">Tên tài khoản mới</label>
          <input type="text" id="authRegU" class="login-input" placeholder="3–16 ký tự: chữ thường, số, _" maxlength="16" autocomplete="username" required>
        </div>
        <div class="login-form-group">
          <label class="login-label">Mật khẩu</label>
          <input type="password" id="authRegP" class="login-input" placeholder="Tối thiểu 4 ký tự" minlength="4" maxlength="32" autocomplete="new-password" required>
        </div>
        <div class="login-form-group">
          <label class="login-label">Nhập lại mật khẩu</label>
          <input type="password" id="authRegP2" class="login-input" placeholder="Nhập lại mật khẩu trên" minlength="4" maxlength="32" autocomplete="new-password" required>
        </div>
        <div class="login-tip">
          💡 <i>Lưu ý: Nếu trên máy hiện đang có nhân vật đang chơi, tiến độ sẽ tự động liên kết và lưu vào tài khoản mới tạo.</i>
        </div>
        <button type="submit" id="btnSubmitReg" class="login-btn-primary" style="margin-top:12px">⚡ ĐĂNG KÝ & LIÊN KẾT MÂY</button>
      </form>

      <button class="login-guest-btn" onclick="hideLoginOverlay()">🚪 Chơi Ngay (Chế độ Khách) ❯</button>
    </div>
  `;
}

function switchLoginTab(tab) {
  const fLog = document.getElementById("formLogin");
  const fReg = document.getElementById("formReg");
  const bLog = document.getElementById("tabBtnLogin");
  const bReg = document.getElementById("tabBtnReg");
  if (!fLog || !fReg) return;

  if (tab === "login") {
    fLog.classList.remove("hidden");
    fReg.classList.add("hidden");
    bLog.classList.add("active");
    bReg.classList.remove("active");
  } else {
    fLog.classList.add("hidden");
    fReg.classList.remove("hidden");
    bLog.classList.remove("active");
    bReg.classList.add("active");
  }
}

/**
 * Xử lý Đăng Nhập
 */
async function handleAuthLogin() {
  const uInput = document.getElementById("authLogU");
  const pInput = document.getElementById("authLogP");
  const btn = document.getElementById("btnSubmitLogin");
  if (!uInput || !pInput) return;

  const u = uInput.value.trim().toLowerCase();
  const p = pInput.value;
  if (!/^[a-z0-9_]{3,16}$/.test(u)) {
    alert("Tên tài khoản không hợp lệ (3–16 ký tự, chỉ gồm chữ thường, số, dấu gạch dưới)!");
    return;
  }
  if (!p) {
    alert("Vui lòng nhập mật khẩu!");
    return;
  }

  const db = typeof getFirebaseDb === "function" ? getFirebaseDb() : null;
  if (!db) {
    alert("Không thể kết nối đến máy chủ lưu trữ. Vui lòng kiểm tra kết nối mạng!");
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = "Đang đăng nhập...";
  }

  try {
    const hash = await authHashPass(p);
    const snap = await db.ref("accounts/" + u).once("value");
    const val = snap.val();

    if (!val) {
      alert("Tên tài khoản không tồn tại! Hãy bấm tab 'Đăng Ký Mới' để tạo tài khoản.");
      if (btn) {
        btn.disabled = false;
        btn.textContent = "⚔ ĐĂNG NHẬP VÀO GAME";
      }
      return;
    }

    if (val.p !== hash) {
      alert("Mật khẩu không chính xác! Vui lòng thử lại.");
      if (btn) {
        btn.disabled = false;
        btn.textContent = "⚔ ĐĂNG NHẬP VÀO GAME";
      }
      return;
    }

    // Đăng nhập thành công
    AUTH.user = u;
    AUTH.passHash = hash;
    AUTH.cloudMeta = val;

    const remember = document.getElementById("authRemember");
    if (!remember || remember.checked) {
      localStorage.setItem("vl_auth_user", u);
      localStorage.setItem("vl_auth_pass", hash);
    }

    db.ref("accounts/" + u).update({ lastLogin: Date.now() });

    // Xử lý nạp bản lưu
    await resolveSaveOnLogin(val);

    hideLoginOverlay();
    if (typeof toast === "function") toast("⚔ Đã đăng nhập: " + u);
  } catch (err) {
    console.error("Login err:", err);
    alert("Lỗi khi đăng nhập: " + (err.message || err));
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "⚔ ĐĂNG NHẬP VÀO GAME";
    }
  }
}

/**
 * Xử lý Đăng Ký
 */
async function handleAuthRegister() {
  const uInput = document.getElementById("authRegU");
  const pInput = document.getElementById("authRegP");
  const p2Input = document.getElementById("authRegP2");
  const btn = document.getElementById("btnSubmitReg");
  if (!uInput || !pInput || !p2Input) return;

  const u = uInput.value.trim().toLowerCase();
  const p = pInput.value;
  const p2 = p2Input.value;

  if (!/^[a-z0-9_]{3,16}$/.test(u)) {
    alert("Tên tài khoản từ 3–16 ký tự, chỉ gồm chữ thường không dấu, số, hoặc dấu gạch dưới (_).");
    return;
  }
  if (p.length < 4) {
    alert("Mật khẩu phải có ít nhất 4 ký tự!");
    return;
  }
  if (p !== p2) {
    alert("Hai lần nhập mật khẩu không khớp nhau!");
    return;
  }

  const db = typeof getFirebaseDb === "function" ? getFirebaseDb() : null;
  if (!db) {
    alert("Không thể kết nối đến máy chủ Firebase. Vui lòng kiểm tra lại mạng!");
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = "Đang tạo tài khoản...";
  }

  try {
    const snap = await db.ref("accounts/" + u).once("value");
    if (snap.exists()) {
      alert("Tên tài khoản '" + u + "' đã có người đăng ký! Vui lòng chọn tên khác.");
      if (btn) {
        btn.disabled = false;
        btn.textContent = "⚡ ĐĂNG KÝ & LIÊN KẾT MÂY";
      }
      return;
    }

    const hash = await authHashPass(p);
    let curSave = null;
    let charName = "Tân thủ";
    let lvl = 1;
    let rb = 0;

    if (typeof S !== "undefined" && S && S.fac) {
      if (typeof pack === "function") curSave = pack(S);
      charName = S.name || "Tân thủ";
      lvl = S.lvl || 1;
      rb = typeof rebornN === "function" ? rebornN() : 0;
    }

    const now = Date.now();
    const newAccountData = {
      u: u,
      p: hash,
      createdAt: now,
      lastLogin: now,
      saveData: curSave,
      saveAt: curSave ? now : 0,
      charName: charName,
      lvl: lvl,
      reborn: rb
    };

    await db.ref("accounts/" + u).set(newAccountData);

    AUTH.user = u;
    AUTH.passHash = hash;
    AUTH.cloudMeta = newAccountData;

    localStorage.setItem("vl_auth_user", u);
    localStorage.setItem("vl_auth_pass", hash);

    hideLoginOverlay();
    if (typeof toast === "function") {
      toast("⚡ Đăng ký thành công tài khoản " + u + "! Đã bảo vệ save trên mây.");
    }
  } catch (err) {
    console.error("Register err:", err);
    alert("Lỗi khi đăng ký: " + (err.message || err));
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "⚡ ĐĂNG KÝ & LIÊN KẾT MÂY";
    }
  }
}

/**
 * Phân giải xung đột Save khi đăng nhập
 */
async function resolveSaveOnLogin(cloudVal) {
  const hasCloudSave = !!(cloudVal && cloudVal.saveData);
  const hasLocalChar = typeof S !== "undefined" && S && S.fac && S.lvl > 1;

  if (hasCloudSave && !hasLocalChar) {
    // Trên máy chưa có nhân vật hoặc mới cấp 1 -> Tự nạp bản lưu từ Mây
    authApplyCloudSave(cloudVal.saveData);
    return;
  }

  if (!hasCloudSave && hasLocalChar) {
    // Trên Mây chưa có save nhưng máy có nhân vật -> Tự động đẩy lên mây
    authCloudSave(true);
    return;
  }

  if (hasCloudSave && hasLocalChar) {
    // Cả 2 nơi đều có save -> Hỏi người chơi rõ ràng
    const cName = cloudVal.charName || "Nhân vật mây";
    const cLvl = cloudVal.lvl || 1;
    const cRb = cloudVal.reborn || 0;
    const cTime = authFormatTime(cloudVal.saveAt);

    const lName = S.name || "Nhân vật máy";
    const lLvl = S.lvl || 1;
    const lRb = typeof rebornN === "function" ? rebornN() : 0;
    const lTime = authFormatTime(S.last || Date.now());

    // Nếu dữ liệu giống hệt nhau thì không cần hỏi
    if (cLvl === lLvl && cRb === lRb && cName === lName) {
      return;
    }

    return new Promise((resolve) => {
      if (typeof modal === "function") {
        modal(`
          <h3>☁ Đồng Bộ Dữ Liệu Đám Mây</h3>
          <p style="font-size:13px;color:#c9d5e3">Phát hiện tài khoản <b>${cloudVal.u}</b> có bản lưu khác với nhân vật trên máy này:</p>
          
          <div class="card" style="margin-bottom:8px;border:1px solid #5aa0ff;background:rgba(90,160,255,0.08)">
            <b style="color:#6aa8ff">☁ Bản lưu trên Đám Mây:</b><br>
            Nhân vật: <b>${cName}</b> · Cấp: <b>${cLvl}</b> · CS: <b>${cRb}</b><br>
            <small class="dim">Lưu lúc: ${cTime}</small>
          </div>

          <div class="card" style="margin-bottom:12px;border:1px solid #7ee07e;background:rgba(126,224,126,0.08)">
            <b style="color:#7ee07e">💻 Bản lưu trên Máy này:</b><br>
            Nhân vật: <b>${lName}</b> · Cấp: <b>${lLvl}</b> · CS: <b>${lRb}</b><br>
            <small class="dim">Lưu lúc: ${lTime}</small>
          </div>

          <div class="btnrow" style="display:flex;gap:10px">
            <button class="btn on" id="btnSyncPickCloud" style="flex:1">☁ Lấy bản trên Mây</button>
            <button class="btn" id="btnSyncPickLocal" style="flex:1">💻 Lấy bản Máy ghi đè Mây</button>
          </div>
        `, () => {
          const btnC = document.getElementById("btnSyncPickCloud");
          const btnL = document.getElementById("btnSyncPickLocal");
          if (btnC) {
            btnC.onclick = () => {
              authApplyCloudSave(cloudVal.saveData);
              if (typeof closeModal === "function") closeModal(true);
              resolve();
            };
          }
          if (btnL) {
            btnL.onclick = () => {
              authCloudSave(true);
              if (typeof closeModal === "function") closeModal(true);
              resolve();
            };
          }
        });
      } else {
        resolve();
      }
    });
  }
}

/**
 * Nạp bản save từ mây vào bộ nhớ game
 */
function authApplyCloudSave(saveStr) {
  if (!saveStr) return;
  try {
    if (typeof unpack !== "function" || typeof migrate !== "function") return;
    const up = unpack(saveStr);
    if (!up || !up.ok || !up.state) {
      if (typeof toast === "function") toast("Bản lưu trên đám mây bị lỗi hoặc không khớp phiên bản!");
      return;
    }
    S = migrate(up.state);
    if (typeof save === "function") save();
    if (typeof recalc === "function") recalc();
    if (typeof refresh === "function") refresh();
    if (typeof toast === "function") toast("☁ Đã tải bản lưu từ Đám Mây thành công!");
  } catch (e) {
    console.error("authApplyCloudSave err:", e);
    if (typeof toast === "function") toast("Lỗi khi nạp bản lưu từ mây!");
  }
}

/**
 * Lưu tiến độ hiện tại lên Đám Mây
 */
async function authCloudSave(notify = false) {
  if (!AUTH.user) return;
  const db = typeof getFirebaseDb === "function" ? getFirebaseDb() : null;
  if (!db || typeof pack !== "function" || typeof S === "undefined" || !S || !S.fac) return;

  try {
    const sData = pack(S);
    const now = Date.now();
    const meta = {
      saveData: sData,
      saveAt: now,
      charName: S.name || "Tân thủ",
      lvl: S.lvl || 1,
      reborn: typeof rebornN === "function" ? rebornN() : 0,
      lastLogin: now
    };

    await db.ref("accounts/" + AUTH.user).update(meta);
    AUTH.cloudMeta = Object.assign(AUTH.cloudMeta || {}, meta);
    AUTH.lastSyncAt = now;

    if (notify && typeof toast === "function") {
      toast("☁ Đã lưu tiến độ lên Đám Mây thành công!");
    }
    updateInGameAuthUI();
  } catch (e) {
    console.warn("authCloudSave err:", e);
    if (notify && typeof toast === "function") toast("Lỗi kết nối khi lưu lên Mây!");
  }
}

/**
 * Đăng xuất tài khoản
 */
function authLogout() {
  AUTH.user = null;
  AUTH.passHash = null;
  AUTH.cloudMeta = null;
  localStorage.removeItem("vl_auth_user");
  localStorage.removeItem("vl_auth_pass");
  updateInGameAuthUI();
  if (typeof toast === "function") toast("Đã đăng xuất tài khoản.");
}

/**
 * Bảng Quản Lý Tài Khoản / Đám Mây trong game (khi bấm nút Đám Mây)
 */
function openCloudAccountModal() {
  if (!AUTH.user) {
    showLoginOverlay();
    return;
  }

  const meta = AUTH.cloudMeta || {};
  const cName = meta.charName || (typeof S !== "undefined" && S && S.name) || "Tân thủ";
  const cLvl = meta.lvl || (typeof S !== "undefined" && S && S.lvl) || 1;
  const cRb = meta.reborn != null ? meta.reborn : (typeof rebornN === "function" ? rebornN() : 0);
  const saveTime = meta.saveAt ? authFormatTime(meta.saveAt) : "Chưa có bản lưu";

  if (typeof modal === "function") {
    modal(`
      <h3>☁ Tài Khoản & Đồng Bộ Đám Mây</h3>
      <div class="card" style="margin-bottom:10px">
        <div style="font-size:14px;color:#ffd700;font-weight:bold;margin-bottom:6px">
          Tài khoản: <span style="color:#fff">${AUTH.user}</span> (Đã đăng nhập)
        </div>
        <div style="font-size:13px;color:#c9d5e3;line-height:1.6">
          Nhân vật trên mây: <b>${cName}</b><br>
          Cấp bậc: <b>Cấp ${cLvl}</b> ${cRb > 0 ? `· <b style="color:#ffb347">Chuyển sinh ${cRb}</b>` : ""}<br>
          Đồng bộ lần cuối: <span style="color:#aaa">${saveTime}</span>
        </div>
      </div>

      <div class="btnrow" style="margin-bottom:8px">
        <button class="btn on" id="mBtnSaveCloud">☁ Lưu lên Mây ngay</button>
        <button class="btn" id="mBtnLoadCloud">☁ Tải lại từ Mây</button>
      </div>

      <div class="btnrow">
        <button class="btn red" id="mBtnLogout">⎋ Đăng xuất tài khoản</button>
      </div>
      <p class="dim small" style="margin-top:8px">Tiến độ được tự động lưu lên đám mây mỗi khi lưu game hoặc thoát trang.</p>
    `, () => {
      const btnS = document.getElementById("mBtnSaveCloud");
      const btnL = document.getElementById("mBtnLoadCloud");
      const btnO = document.getElementById("mBtnLogout");
      if (btnS) {
        btnS.onclick = () => {
          authCloudSave(true);
          if (typeof closeModal === "function") closeModal(true);
        };
      }
      if (btnL) {
        btnL.onclick = () => {
          if (confirm("Tải lại bản lưu từ Mây sẽ ghi đè nhân vật trên máy này bằng bản lưu gần nhất trên Mây. Tiếp tục?")) {
            const db = typeof getFirebaseDb === "function" ? getFirebaseDb() : null;
            if (db && AUTH.user) {
              db.ref("accounts/" + AUTH.user).once("value", (snap) => {
                const val = snap.val();
                if (val && val.saveData) {
                  authApplyCloudSave(val.saveData);
                } else {
                  if (typeof toast === "function") toast("Chưa có bản lưu nào trên Mây!");
                }
                if (typeof closeModal === "function") closeModal(true);
              });
            }
          }
        };
      }
      if (btnO) {
        btnO.onclick = () => {
          if (confirm("Đăng xuất tài khoản khỏi máy này? (Save game vẫn được lưu an toàn)")) {
            authLogout();
            if (typeof closeModal === "function") closeModal(true);
          }
        };
      }
    });
  }
}

/**
 * Cập nhật giao diện nút tài khoản trong game
 */
function updateInGameAuthUI() {
  const btn = document.getElementById("cloudBtn");
  if (btn) {
    if (AUTH.user) {
      btn.innerHTML = `☁ ${AUTH.user}`;
      btn.style.color = "#7ee07e";
    } else {
      btn.innerHTML = "☁ Đăng nhập";
      btn.style.color = "#ffd700";
    }
  }

  // Cập nhật thẻ lưu game trong Tab Hệ thống nếu đang mở
  const card = document.getElementById("cloudAccSection");
  if (card) {
    if (AUTH.user) {
      card.innerHTML = `
        <div style="font-size:13px;margin-bottom:6px">Tài khoản: <b style="color:#7ee07e">${AUTH.user}</b> (Đã kết nối mây ☁)</div>
        <div class="btnrow">
          <button class="btn on sm" onclick="authCloudSave(true)">☁ Lưu Lên Mây</button>
          <button class="btn sm" onclick="openCloudAccountModal()">Quản lý đám mây</button>
          <button class="btn red sm" onclick="authLogout()">Đăng xuất</button>
        </div>
      `;
    } else {
      card.innerHTML = `
        <div style="font-size:13px;margin-bottom:6px;color:#aaa">Chưa đăng nhập (Đang chơi chế độ Khách)</div>
        <div class="btnrow">
          <button class="btn on sm" onclick="showLoginOverlay()">🔑 Đăng Nhập / Đăng Ký Mây</button>
        </div>
      `;
    }
  }
}

// Xuất các hàm ra phạm vi toàn cục
window.AUTH = AUTH;
window.initAuth = initAuth;
window.showLoginOverlay = showLoginOverlay;
window.hideLoginOverlay = hideLoginOverlay;
window.renderLoginOverlayContent = renderLoginOverlayContent;
window.switchLoginTab = switchLoginTab;
window.handleAuthLogin = handleAuthLogin;
window.handleAuthRegister = handleAuthRegister;
window.authCloudSave = authCloudSave;
window.authLogout = authLogout;
window.openCloudAccountModal = openCloudAccountModal;
window.updateInGameAuthUI = updateInGameAuthUI;

// Tự khởi chạy sau khi DOM sẵn sàng
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => setTimeout(initAuth, 100));
} else {
  setTimeout(initAuth, 100);
}
