/* ======================= HIEU UNG NGOAI HINH DUNG CHUNG =======================
   Nhu VLTK 1: bo do va vu khi phat sang theo he va muc cuong hoa (vk +5 phat sang he, +8 cuong do manh hon, +10 ruc ro).
   Hao quang quanh nguoi theo bo do Hoang Kim / Bach Kim hoac tong cap cuong hoa. */
'use strict';
const LOOK_RAR_A = [0, 0.24, 0.32, 0.40, 0.42, 0.42];
const TM_DUST = { ovan: '#5fb8ff', xtho: '#ff6a3a', tanh: '#f3d35b', dlo: '#6fd46a', cdsu: '#c8965a' };
const HORSE_FX = {
  "Ô Vân Đạp Tuyết": ["#5fb8ff", 3],
  "Xích Thố": ["#ff6a3a", 3],
  "Tuyệt Ảnh": ["#f3d35b", 3],
  "Tuyệt ảnh": ["#f3d35b", 3],
  "Đích Lô": ["#6fd46a", 3],
  "Chiếu Dạ Ngọc Sư Tử": ["#fff1a8", 3],
  "Phi Vân": ["#d8e6ff", 2],
  "Bôn Tiêu": ["#ff9ad0", 2],
  "Xích Long Câu": ["#ff5a3a", 2],
  "Du Huy": ["#c8f0ff", 2],
  "Tuyệt Địa": ["#b48cff", 2],
  "Đằng Vụ": ["#9fd8d0", 2],
  "Siêu Quang": ["#ffe36a", 2],
  "Phiên Vũ": ["#ffb8e8", 3],
  "Hãn Huyết Long Câu": ["#ff3048", 3],
  "Kim Tinh Bạch Hổ Vương": ["#f0f8ff", 3],
  "Phong Vân Thần Mã": ["#ffd24a", 3],
  "Kim Tinh Hổ Vương": ["#ffc84a", 2],
  "Hỏa Tinh Kim Hổ Vương": ["#ff7a2a", 2],
  "Long Tinh Hắc Hổ Vương": ["#9a7aff", 2],
  "Phong Vân Bạch Mã": ["#e8f2ff", 2],
  "Phong Vân Chiến Mã": ["#ffb04a", 2],
  "Sư tử": ["#f3c96a", 1],
  "Lạc đà": ["#d8b47a", 1],
  "Dương Đà": ["#c8a070", 1],
  "Hươu đốm": ["#c89a5a", 1],
  "Dương Sa": ["#e0c090", 1],
  "Ngự Phong": ["#a8e8ff", 1],
  "Truy điện": ["#e8f06a", 1],
  "Lưu Tinh": ["#bfe0ff", 1]
};

function horseFx(it) {
  if (!it) return null;
  const name = (it.n || '').replace(/\s+\d+$/, '');
  const fx = HORSE_FX[name];
  if (fx) return fx;
  return it.thanma ? [TM_DUST[it.thanma] || '#ffd24a', 3] : null;
}

function partTint(it) {
  if (!it || !reqOk(it)) return null;
  if (it.set) return it.set.kind === 'platina' ? { c: '#e6f4ff', a: 0.48 } : { c: '#ffc93c', a: 0.44 };
  const a = LOOK_RAR_A[it.r || 0];
  return a ? { c: it.s >= 0 ? SERIES_COL[it.s] : RAR_COL[it.r], a } : null;
}

function heroLook() {
  const eq = S.eq;
  const worn = Object.values(eq).filter(it => it && it.d !== 10);
  const armorT = partTint(eq.armor), helmT = partTint(eq.helm);
  let aura = null;
  if (typeof enoughToActive === 'function' && enoughToActive(eq)) {
    const plat = worn.filter(it => it.set && it.set.kind === 'platina').length;
    const gold = worn.filter(it => it.set && it.set.kind === 'gold').length;
    aura = plat >= gold ? { c: '#bfe6ff', c2: '#ffffff', k: 1 } : { c: '#ffb52e', c2: '#fff1a8', k: 1 };
  } else if (worn.length >= 5) {
    const avgEnh = worn.reduce((sum, it) => sum + (it.enh || 0), 0) / worn.length;
    if (avgEnh >= 7) aura = { c: SERIES_COL[heroSeries()], c2: '#ffffff', k: avgEnh >= 9 ? 0.9 : 0.6 };
  }
  const w = eq.weapon, enh = w && reqOk(w) && w.enh || 0;
  const wGlow = enh >= 5 ? { c: w.s >= 0 ? SERIES_COL[w.s] : '#ffe9a8', n: enh >= 10 ? 3 : enh >= 8 ? 2 : 1 } : null;
  const h = eq.horse, fx = horseFx(h);
  const dust = fx ? fx[0] : null, hlv = fx ? fx[1] : 0;
  return { body: armorT, head: helmT, aura, glow: wGlow, dust, hlv, key: JSON.stringify([armorT, helmT, aura, wGlow, dust, hlv]) };
}

const lookOn = () => S && S.lookFx !== false;
const LOOK_CACHE = new Map();

function tintedFrame(imgEl, a, cFr, rDir, look) {
  const key = `${a.f}|${cFr}|${rDir}|${look.key}`;
  let cached = LOOK_CACHE.get(key);
  if (cached) return cached;
  cached = document.createElement('canvas');
  cached.width = a.w; cached.height = a.h;
  const ctx = cached.getContext('2d');
  ctx.drawImage(imgEl, cFr * a.w, rDir * a.h, a.w, a.h, 0, 0, a.w, a.h);
  ctx.globalCompositeOperation = 'source-atop';
  const chestY = Math.max(0, a.ay - a.h * 0.8), headY = chestY + (a.ay - chestY) * 0.28;
  if (look.body) {
    const g = ctx.createLinearGradient(0, headY - 4, 0, headY + 6);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, look.body.c);
    ctx.globalAlpha = look.body.a; ctx.fillStyle = g; ctx.fillRect(0, headY - 4, a.w, a.h);
  }
  if (look.head) {
    ctx.globalAlpha = look.head.a; ctx.fillStyle = look.head.c; ctx.fillRect(0, 0, a.w, headY);
  }
  if (LOOK_CACHE.size > 600) LOOK_CACHE.clear();
  LOOK_CACHE.set(key, cached);
  return cached;
}

function drawHeroAnim(animKey, act, dir8, time, x, y, sc, alpha = 1) {
  if (typeof jxOn === 'function' && jxOn() && R.jx) {
    const h = drawJxHero(act, dir8, time, x, y, sc, alpha);
    if (h) return h;
  }
  const look = R.look;
  if (!lookOn() || !look || (!look.body && !look.head)) return drawAnim(animKey, act, dir8, time, x, y, sc, alpha);
  const aGroup = W.anim && W.anim[animKey]; if (!aGroup) return false;
  const a = aGroup[act] || aGroup.st; if (!a) return false;
  const im = img('img/a/' + a.f); if (!im.complete || !im.naturalWidth) return false;
  let cFr = Math.floor(time * 1000 / a.ms);
  cFr = ONCE[act] ? Math.min(cFr, a.n - 1) : cFr % a.n;
  const rDir = a.d >= 8 ? dir8 : Math.floor(dir8 * a.d / 8);
  CX.globalAlpha = alpha;
  CX.drawImage(tintedFrame(im, a, cFr, rDir, look), x - a.ax * sc, y - a.ay * sc, a.w * sc, a.h * sc);
  CX.globalAlpha = 1;
  return a.h * sc;
}

function drawAura(c) {
  const look = R.look; if (!lookOn() || !look || !look.aura) return;
  const t = R.clock || 0, pulse = 0.5 + 0.5 * Math.sin(t * 3), a = look.aura;
  c.save();
  c.globalAlpha = (0.35 + 0.25 * pulse) * a.k; c.strokeStyle = a.c; c.lineWidth = 2;
  c.beginPath(); c.ellipse(H.x, H.y, 24 + pulse * 4, 9 + pulse * 1.5, 0, 0, Math.PI * 2); c.stroke();
  c.globalAlpha = 0.18 * a.k; c.fillStyle = a.c;
  c.beginPath(); c.ellipse(H.x, H.y, 22, 8, 0, 0, Math.PI * 2); c.fill();
  c.restore();
  if (S.lowFx) return;
  const pts = R.lookP || (R.lookP = []);
  if (Math.random() < 0.25 * a.k) pts.push({ x: H.x + rnd(-18, 18), y: H.y + rnd(-3, 3), vy: -rnd(18, 34), life: 1.1, c: Math.random() < 0.5 ? a.c : a.c2 });
}

function drawLookFx(c, dt) {
  const look = R.look;
  if (!lookOn() || !look || S.lowFx) { R.lookP = null; return; }
  const pts = R.lookP || (R.lookP = []);
  if (look.glow && Math.random() < 0.12 * look.glow.n) {
    const a = rnd(0, Math.PI * 2);
    pts.push({ x: H.x + Math.cos(a) * rnd(8, 20), y: H.y - 26 + Math.sin(a) * rnd(6, 16), vy: -rnd(6, 16), life: 0.7, c: look.glow.c, s: 1 + look.glow.n * 0.5 });
  }
  c.save();
  for (const p of pts) {
    p.life -= dt; p.y += p.vy * dt;
    c.globalAlpha = clamp(p.life, 0, 1) * 0.85; c.fillStyle = p.c;
    c.beginPath(); c.arc(p.x, p.y, p.s || 1.4, 0, Math.PI * 2); c.fill();
  }
  c.restore();
  R.lookP = pts.filter(p => p.life > 0).slice(-80);
}
