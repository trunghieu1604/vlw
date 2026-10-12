"use strict";
// Screen Wake Lock & PWA helper: Giữ màn hình điện thoại không tắt khi treo máy cày cuốc
(function () {
  let wakeLock = null;
  let fallbackVideo = null;

  async function requestWakeLock() {
    try {
      if ("wakeLock" in navigator && navigator.wakeLock) {
        if (!wakeLock) {
          wakeLock = await navigator.wakeLock.request("screen");
          wakeLock.addEventListener("release", () => {
            wakeLock = null;
          });
          console.log("[WakeLock] Màn hình đang được giữ sáng");
        }
      } else {
        ensureFallbackVideo();
      }
    } catch (e) {
      // Có thể lỗi khi tab chưa active hoặc tiết kiệm pin
      ensureFallbackVideo();
    }
  }

  function ensureFallbackVideo() {
    if (wakeLock || fallbackVideo) return;
    try {
      // Looping 1x1 invisible muted video fallback (hỗ trợ iOS Safari và trình duyệt cũ)
      const v = document.createElement("video");
      v.setAttribute("playsinline", "");
      v.setAttribute("webkit-playsinline", "");
      v.setAttribute("loop", "");
      v.setAttribute("muted", "");
      v.muted = true;
      v.src = "data:video/mp4;base64,AAAAHGZ0eXBtcDQyAAAAAG1wNDJpc29tYXZjMQAAAD5tb292AAAAbG12aGQAAAAA4B6m8OAepvAAAA+gAAAAAAABAAABAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAE1kYXQAAAAAAAAB8AGoAAAAAAAWAAAACnRyYWsAAAAAbHRraGQAAAAH4B6m8OAepvAAAAABAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAABAAAAAQAAAAAAAABtZGlhAAAAIG1kaGQAAAAA4B6m8OAepvAAAA+gAAAAAAAIQAAA";
      v.style.position = "fixed";
      v.style.top = "-9999px";
      v.style.left = "-9999px";
      v.style.width = "1px";
      v.style.height = "1px";
      v.style.opacity = "0";
      v.style.pointerEvents = "none";
      document.body ? document.body.appendChild(v) : document.addEventListener("DOMContentLoaded", () => document.body.appendChild(v));
      v.play().then(() => {
        fallbackVideo = v;
        console.log("[WakeLock] Fallback video loop kích hoạt");
      }).catch(() => {});
    } catch {}
  }

  // Tự động yêu cầu lại khi chuyển tab trở lại
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      requestWakeLock();
    }
  });

  // Tương tác chạm màn hình đầu tiên để kích hoạt WakeLock
  ["click", "touchstart", "pointerdown", "keydown"].forEach((evt) => {
    window.addEventListener(evt, () => {
      if (!wakeLock) requestWakeLock();
    }, { passive: true });
  });

  // Khởi động ngay
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", requestWakeLock);
  } else {
    requestWakeLock();
  }

  // Bắt sự kiện cài đặt Native App (PWA)
  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const btn = document.getElementById("pwaBtn");
    if (btn) {
      btn.classList.remove("hidden");
      btn.onclick = () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          deferredPrompt.userChoice.then((choice) => {
            if (choice.outcome === "accepted") {
              btn.classList.add("hidden");
            }
            deferredPrompt = null;
          });
        }
      };
    }
    window.pwaInstall = function () {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(() => {
          deferredPrompt = null;
        });
      }
    };
  });

  window.addEventListener("appinstalled", () => {
    const btn = document.getElementById("pwaBtn");
    btn && btn.classList.add("hidden");
    console.log("[PWA] Ứng dụng đã được cài đặt thành công");
  });
})();
