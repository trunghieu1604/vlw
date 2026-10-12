"use strict";
const NAME_MIN = 2,
  NAME_MAX = 14,
  hasRealName = () => !!(S && S.name && S.name !== "Tân thủ" && !FACTIONS.some((n) => n.n === S.name));
function nameCheck(n) {
  return (
    (n = String(n || "")
      .replace(/\s+/g, " ")
      .trim()),
    n.length < 2
      ? { ok: !1, msg: "Tên cần ít nhất 2 ký tự" }
      : n.length > 14
        ? { ok: !1, msg: "Tên tối đa 14 ký tự" }
        : FACTIONS.some((e) => e.n.toLowerCase() === n.toLowerCase()) || /^tân thủ$/i.test(n)
          ? { ok: !1, msg: "Không dùng tên môn phái" }
          : /[<>"'`\\]/.test(n)
            ? { ok: !1, msg: "Tên có ký tự không hợp lệ" }
            : { ok: !0, n }
  );
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
