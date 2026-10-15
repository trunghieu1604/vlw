"use strict";
const NAME_MIN = 2,
  NAME_MAX = 14;
const isBannedName = (n) => {
  if (!n) return false;
  const s = String(n).toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[@4]/g, "a")
    .replace(/[1!|]/g, "i")
    .replace(/[0]/g, "o")
    .replace(/[^a-z0-9]/g, "");
  return s.includes("admin") || s.includes("administrator");
};
window.isBannedName = isBannedName;
const hasRealName = () => !!(S && S.name && S.name !== "Tân thủ" && !FACTIONS.some((n) => n.n === S.name) && !isBannedName(S.name));
function nameCheck(n) {
  n = String(n || "").replace(/\s+/g, " ").trim();
  if (n.length < 2) return { ok: !1, msg: "Tên cần ít nhất 2 ký tự" };
  if (n.length > 14) return { ok: !1, msg: "Tên tối đa 14 ký tự" };
  if (isBannedName(n)) return { ok: !1, msg: "Tuyệt đối không được đặt tên là Admin hoặc Administrator!" };
  if (FACTIONS.some((e) => e.n.toLowerCase() === n.toLowerCase()) || /^tân thủ$/i.test(n))
    return { ok: !1, msg: "Không dùng tên môn phái" };
  if (/[<>"'`\\]/.test(n)) return { ok: !1, msg: "Tên có ký tự không hợp lệ" };
  return { ok: !0, n };
}
function nameModal(n) {
  const e = hasRealName() ? S.name : "";
  modal(
    `<h3>${e ? "Đổi tên nhân vật" : "Đặt tên nhân vật"}</h3>
    <p class="desc">${e ? "" : "Nhân vật này tạo từ bản cũ nên chưa có tên riêng. "}Tên hiện trên đầu nhân vật, và trong chat thế giới. Miễn phí, đổi lại được.</p>
    <div class="row">Tên <input id="nmIn" maxlength="14" placeholder="2–14 ký tự" value="${esc(e)}"></div>
    <div class="btnrow"><button class="btn" id="nmOk">Lưu tên</button><button class="btn" id="nmNo">Để sau</button></div>`,
    () => {
      const o = $("#nmIn");
      setTimeout(() => o.focus(), 0);
      const s = () => {
        const t = nameCheck(o.value);
        if (!t.ok) return toast(t.msg);
        ((S.name = t.n), save(), log(`Đặt tên nhân vật: <b>${esc(t.n)}</b>`), closeModal(!0));
        try {
          CHAT.ch && CHAT.state === "ok" && CHAT.ch.track({ name: t.n, lvl: S.lvl | 0 });
        } catch {}
        (refresh(), n && n());
      };
      (($("#nmOk").onclick = s),
        (o.onkeydown = (t) => {
          t.key === "Enter" && s();
        }),
        ($("#nmNo").onclick = () => closeModal()));
    },
  );
}
