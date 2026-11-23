/* =========================================================
 *  농사 게임  (HTML + CSS + JavaScript)
 *
 *  ★ 이미지/소리 넣는 법 ★
 *  아래 ASSETS 의 경로에 파일을 넣으면 자동으로 사용됩니다.
 *  파일이 없으면 임시 그림(도형)과 합성 효과음이 대신 나옵니다.
 *
 *  game 폴더
 *  ├─ index.html
 *  ├─ style.css
 *  ├─ game.js
 *  └─ assets
 *     ├─ images  (player.png, minion.png, shopkeeper.png, field.png,
 *     │           item_spellblade.png, item_hammer.png, item_axe.png, item_trinity.png)
 *     └─ sounds  (swing.mp3, hit.mp3, buy.mp3)
 * ========================================================= */

const ASSETS = {
  images: {
    field:      "assets/images/field.png",      // 배경 (960x600 권장)
    player:     "assets/images/player.png",     // 플레이어 (정면, 오른쪽을 보는 이미지 권장)
    minion:     "assets/images/minion.png",     // 자라는 미니언
    shopkeeper: "assets/images/shopkeeper.png", // 상점 주인
  },
  itemIcons: {                                  // 상점 창 아이콘
    spellblade: "assets/images/item_spellblade.png",
    hammer:     "assets/images/item_hammer.png",
    axe:        "assets/images/item_axe.png",
    trinity:    "assets/images/item_trinity.png",
  },
  sounds: {
    swing:  "assets/sounds/swing.mp3",   // 휘두르는 소리
    hit:    "assets/sounds/hit.mp3",     // 타격음
    buy:    "assets/sounds/buy.mp3",     // 구매 소리
  },
};

/* ---------------- 게임 설정값 ---------------- */
const CFG = {
  baseCooldown: 3,        // 수확 기본 쿨타임(초)
  spellbladeCdCut: 2,   // 주문 검: 쿨타임 감소량
  baseSpeed: 200,         // 기본 이동속도(px/s)
  hammerSpeedMul: 1.5,    // 탐식의 망치: 이동속도 +50%
  baseGold: 33,           // 미니언 1마리당 골드
  axeGoldMul: 3,          // 온기가 필요한 자의 도끼: 골드 3배
  castTime: 0.3,          // 공격 캐스팅 시간(초)
  harvestRange: 120,      // 수확 가능 거리
  interactRange: 130,     // 상호작용 가능 거리
  growTime: 6,            // 미니언이 다 자라는 시간(초)
};

const ITEMS = [
  { id: "spellblade", name: "주문 검",             price: 121,  icon: "🗡️", desc: "수확 쿨타임 1.5초 감소" },
  { id: "hammer",     name: "탐식의 망치",         price: 605,  icon: "🔨", desc: "이동속도 50% 증가" },
  { id: "axe",        name: "온기가 필요한 자의 도끼", price: 1111, icon: "🪓", desc: "골드 획득 3배" },
  { id: "trinity",    name: "삼위일체",            price: 3333, icon: "⚜️", desc: "엔딩을 볼 수 있다 (앞의 3개 필요)" },
];

/* ---------------- 캔버스 / 입력 ---------------- */
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width, H = canvas.height;

const keys = {};
const mouse = { x: W / 2, y: H / 2 };
let rightDown = false;      // 우클릭을 누르고 있는 중인지 (누르고 있으면 계속 따라감)
let lastButtons = 0;        // 직전 마우스 버튼 상태 (다른 버튼을 누른 채 누르는 경우 감지용)

window.addEventListener("keydown", e => {
  keys[e.key.toLowerCase()] = true;
  initAudio();
  if (e.key === "Escape") closeShop();
});
window.addEventListener("keyup", e => { keys[e.key.toLowerCase()] = false; });
window.addEventListener("blur", () => { for (const k in keys) keys[k] = false; });

function toGame(e) {                       // 화면 좌표 → 게임 좌표
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
}

/* ----- 모바일 터치: 가상 조이스틱 (왼쪽 아래) ----- */
let isTouch = false;
const JOY = { baseX: 90, baseY: 520, baseR: 70, grabR: 85 };   // 조이스틱 위치/크기
const joy = { active: false, id: null, dx: 0, dy: 0 };          // dx, dy: -1 ~ 1

function updateJoy(p) {
  let vx = (p.x - JOY.baseX) / JOY.baseR;
  let vy = (p.y - JOY.baseY) / JOY.baseR;
  const len = Math.hypot(vx, vy);
  if (len > 1) { vx /= len; vy /= len; }
  joy.dx = vx; joy.dy = vy;
}
function releaseJoy(e) {
  if (e.pointerId === joy.id) { joy.active = false; joy.id = null; joy.dx = joy.dy = 0; }
}

canvas.addEventListener("pointermove", e => {
  const p = toGame(e);
  if (e.pointerType === "touch") {
    if (joy.active && e.pointerId === joy.id) updateJoy(p);
    return;
  }
  mouse.x = p.x; mouse.y = p.y;

  // 우클릭을 누른 채 좌클릭(또는 반대)하면 브라우저가 pointerdown 대신 pointermove로 알려줌
  const nb = e.buttons;
  if (!state.shopOpen && !state.ended) {
    if ((nb & 1) && !(lastButtons & 1)) tryHarvest();
    if ((nb & 2) && !(lastButtons & 2)) { rightDown = true; tryInteract(); }
  }
  lastButtons = nb;
});
canvas.addEventListener("pointerup", releaseJoy);
window.addEventListener("pointerup", e => {
  if (e.pointerType !== "mouse") return;
  if (e.button === 2) rightDown = false;
  lastButtons = e.buttons;
});
window.addEventListener("blur", () => { rightDown = false; });
canvas.addEventListener("pointercancel", releaseJoy);
canvas.addEventListener("contextmenu", e => e.preventDefault()); // 우클릭 메뉴 막기

canvas.addEventListener("pointerdown", e => {
  initAudio();
  const p = toGame(e);

  if (e.pointerType === "touch") {
    if (!isTouch) {                                   // 처음 터치하면 모바일 모드
      isTouch = true;
      document.getElementById("hint").textContent =
        "왼쪽 아래 조이스틱으로 이동 · 미니언 탭: 수확 · 상점 주인 탭: 상점";
    }
    if (state.shopOpen || state.ended) return;

    // 조이스틱 영역에서 시작한 터치 → 이동
    if (!joy.active && Math.hypot(p.x - JOY.baseX, p.y - JOY.baseY) < JOY.grabR) {
      joy.active = true; joy.id = e.pointerId;
      updateJoy(p);
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
      return;
    }
    // 그 밖의 탭 → 상점 주인이면 상호작용, 아니면 그 방향으로 수확
    mouse.x = p.x; mouse.y = p.y;
    if (Math.hypot(p.x - keeper.x, p.y - keeper.y) < 55) tryInteract();
    else tryHarvest();
    return;
  }

  // 마우스: 좌클릭 수확 / 우클릭 이동·상호작용 (롤 방식)
  mouse.x = p.x; mouse.y = p.y;
  if (state.shopOpen || state.ended) return;
  if (e.button === 0) tryHarvest();
  else if (e.button === 2) { rightDown = true; tryInteract(); }
  lastButtons = e.buttons;
});

/* ---------------- 이미지 로드 ---------------- */
const images = {};
for (const [name, src] of Object.entries(ASSETS.images)) {
  const img = new Image();
  img.ok = false;
  img.onload = () => { img.ok = true; };
  img.onerror = () => { img.ok = false; };   // 파일 없으면 임시 그림 사용
  img.src = src;
  images[name] = img;
}

/* ---------------- 소리 (파일 우선, 없으면 합성음) ---------------- */
let audioCtx = null;
function initAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
  }
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
}

const sounds = {};
for (const [name, src] of Object.entries(ASSETS.sounds)) {
  const a = new Audio();
  a.ok = false;
  a.addEventListener("canplaythrough", () => { a.ok = true; });
  a.addEventListener("error", () => { a.ok = false; });
  a.src = src;
  a.preload = "auto";
  sounds[name] = a;
}

function playSound(name) {
  const a = sounds[name];
  if (a && a.ok) {
    const c = a.cloneNode();     // 겹쳐서 재생 가능하게 복제
    c.volume = 0.8;
    c.play().catch(() => {});
    return;
  }
  synth(name);
}

function synth(name) {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const out = audioCtx.createGain();
  out.connect(audioCtx.destination);

  const noise = (dur) => {
    const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * dur, audioCtx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = audioCtx.createBufferSource();
    s.buffer = buf;
    return s;
  };

  if (name === "swing") {            // 휙~ 하는 바람 소리
    const s = noise(0.3);
    const f = audioCtx.createBiquadFilter();
    f.type = "bandpass"; f.Q.value = 2;
    f.frequency.setValueAtTime(400, t);
    f.frequency.exponentialRampToValueAtTime(3000, t + 0.25);
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.6, t + 0.1);
    out.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    s.connect(f); f.connect(out); s.start(t);
  } else if (name === "hit") {       // 퍽! 타격음
    const o = audioCtx.createOscillator();
    o.type = "triangle";
    o.frequency.setValueAtTime(180, t);
    o.frequency.exponentialRampToValueAtTime(50, t + 0.18);
    out.gain.setValueAtTime(0.9, t);
    out.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(out); o.start(t); o.stop(t + 0.22);
    const s = noise(0.1);
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    s.connect(g); g.connect(audioCtx.destination); s.start(t);
  } else if (name === "buy" || name === "ending") {
    const notes = name === "buy" ? [660, 880] : [523, 659, 784, 1047, 1319];
    notes.forEach((fr, i) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = "square"; o.frequency.value = fr;
      const st = t + i * (name === "buy" ? 0.08 : 0.16);
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(0.25, st + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, st + 0.25);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(st); o.stop(st + 0.3);
    });
  }
}

/* ---------------- 게임 상태 ---------------- */
const state = {
  gold: 0,
  owned: { spellblade: false, hammer: false, axe: false, trinity: false },
  shopOpen: false,
  ended: false,
  cooldownLeft: 0,
  cast: null,        // {t, angle, target}
  swing: null,       // {t, angle}  휘두르기 애니메이션
};

const player = { x: 320, y: 300, r: 18, facing: 0 };

// 농장 구역 (왼쪽) — 4열 x 3행 밭
const FIELD = { x1: 30, y1: 60, x2: 640, y2: 560 };
const plots = [];
for (let r = 0; r < 3; r++) {
  for (let c = 0; c < 4; c++) {
    plots.push({
      x: 130 + c * 130,
      y: 150 + r * 150,
      growth: Math.random() * 0.6,
      pending: false,   // 캐스팅 중인지
    });
  }
}

// 상점 구역 (오른쪽)
const SHOP_AREA = { x: 680, y: 60, w: 250, h: 500 };
const keeper = { x: 805, y: 300, r: 30 };

/* ---------------- 수확 / 상호작용 ---------------- */
function currentCooldown() {
  return CFG.baseCooldown - (state.owned.spellblade ? CFG.spellbladeCdCut : 0);
}
function currentSpeed() {
  return CFG.baseSpeed * (state.owned.hammer ? CFG.hammerSpeedMul : 1);
}
function currentGold() {
  return CFG.baseGold * (state.owned.axe ? CFG.axeGoldMul : 1);
}

function hoveredPlot() {
  for (const p of plots) {
    if (p.growth >= 1 && !p.pending && Math.hypot(mouse.x - p.x, mouse.y - (p.y - 20)) < 32) return p;
  }
  return null;
}

function tryHarvest() {
  if (state.cooldownLeft > 0 || state.cast) return;

  // 공격하면 이동 명령을 취소하고 멈춤 (롤 방식)
  player.target = null; player.toKeeper = false;

  const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
  player.facing = angle;

  // 마우스가 다 자란 미니언 위에 있고, 사거리 안일 때만 맞음
  let target = hoveredPlot();
  if (target && Math.hypot(target.x - player.x, target.y - player.y) > CFG.harvestRange) target = null;
  if (target) target.pending = true;

  state.cooldownLeft = currentCooldown();
  state.cast = { t: CFG.castTime, angle, target };
  state.swing = { t: CFG.castTime, angle };
  playSound("swing");
}

/* ----- 클릭 이동 (롤 방식) ----- */
function overKeeper() {
  return Math.hypot(mouse.x - keeper.x, mouse.y - keeper.y) < 45;
}
function nearKeeper() {
  return Math.hypot(player.x - keeper.x, player.y - keeper.y) < CFG.interactRange;
}
function orderMove(x, y, toKeeper) {
  // 갈 수 없는 구역(화면 밖)을 찍어도 가장자리까지만 가도록 보정
  x = Math.max(player.r, Math.min(W - player.r, x));
  y = Math.max(player.r + 40, Math.min(H - player.r, y));
  player.target = { x, y };
  player.toKeeper = toKeeper;
  clickMarker = { x, y, t: 0.5 };
}

// 우클릭(또는 상점 주인 탭): 상점 주인이면 걸어가서 상점 열기, 땅이면 그 지점으로 이동
function tryInteract() {
  if (overKeeper()) {
    if (nearKeeper()) { player.target = null; player.toKeeper = false; openShop(); }
    else orderMove(keeper.x, keeper.y, true);
  } else {
    orderMove(mouse.x, mouse.y, false);
  }
}

function moveToTarget(dt) {
  // 우클릭을 누르고 있으면 마우스를 계속 따라감
  if (rightDown && !overKeeper()) orderMove(mouse.x, mouse.y, false);

  // 상점 주인을 향해 가는 중이면 가까워졌을 때 상점 열기
  if (player.toKeeper && nearKeeper() && Math.hypot(player.x - keeper.x, player.y - keeper.y) < CFG.interactRange - 10) {
    player.target = null; player.toKeeper = false;
    openShop();
    return;
  }

  const t = player.target;
  if (!t) return;
  const d = Math.hypot(t.x - player.x, t.y - player.y);
  const step = currentSpeed() * dt;
  if (d <= step) { player.x = t.x; player.y = t.y; player.target = null; return; }
  player.x += (t.x - player.x) / d * step;
  player.y += (t.y - player.y) / d * step;
}

/* ---------------- 상점 UI ---------------- */
const shopEl = document.getElementById("shop");
const shopListEl = document.getElementById("shopList");

function itemIconHTML(it) {
  const src = ASSETS.itemIcons[it.id];
  // 이미지 파일이 없으면 이모지로 대체
  return `<div class="itemIcon"><img src="${src}" alt="" onerror="var p=this.parentNode;this.remove();p.textContent='${it.icon}'"></div>`;
}

function itemStatus(idx) {
  const it = ITEMS[idx];
  if (state.owned[it.id]) return { text: "보유 중", disabled: true };
  if (idx > 0 && !state.owned[ITEMS[idx - 1].id]) return { text: "🔒 순서 잠김", disabled: true };
  if (state.gold < it.price) return { text: it.price + "원", disabled: true };
  return { text: it.price + "원 구매", disabled: false };
}

function renderShop() {
  document.getElementById("shopGoldText").textContent = state.gold;
  shopListEl.innerHTML = "";
  ITEMS.forEach((it, idx) => {
    const st = itemStatus(idx);
    const li = document.createElement("li");
    li.innerHTML = `${itemIconHTML(it)}
      <div class="itemInfo"><div class="name">${idx + 1}. ${it.name}</div><div class="desc">${it.desc}</div></div>`;
    const btn = document.createElement("button");
    btn.className = "buyBtn";
    btn.textContent = st.text;
    btn.disabled = st.disabled;
    btn.onclick = () => buy(idx);
    li.appendChild(btn);
    shopListEl.appendChild(li);
  });
}

function openShop()  {
  state.shopOpen = true; rightDown = false; player.target = null; player.toKeeper = false;
  shopEl.classList.remove("hidden"); renderShop();
}
function closeShop() { state.shopOpen = false; shopEl.classList.add("hidden"); }
document.getElementById("shopClose").onclick = closeShop;
shopEl.addEventListener("mousedown", e => { if (e.target === shopEl) closeShop(); });

function buy(idx) {
  const it = ITEMS[idx];
  const st = itemStatus(idx);
  if (st.disabled) return;
  state.gold -= it.price;
  state.owned[it.id] = true;
  playSound("buy");
  renderShop();
  updateHUD();
  if (it.id === "trinity") {
    setTimeout(() => {
      closeShop();
      state.ended = true;
      document.getElementById("ending").classList.remove("hidden");
    }, 400);
  }
}

document.getElementById("restart").onclick = () => location.reload();

/* ---------------- HUD ---------------- */
function updateHUD() {
  document.getElementById("goldText").textContent = state.gold;
  const inv = document.getElementById("inv");
  inv.innerHTML = ITEMS.filter(i => state.owned[i.id])
    .map(i => `<div class="invItem">${i.icon} ${i.name}</div>`).join("");
}
function updateCooldownBar() {
  const bar = document.getElementById("cdBar");
  const txt = document.getElementById("cdText");
  const max = currentCooldown();
  if (state.cooldownLeft > 0) {
    const ratio = 1 - Math.min(state.cooldownLeft / max, 1);
    bar.style.width = (ratio * 100) + "%";
    bar.style.background = "#666";
    txt.textContent = state.cooldownLeft.toFixed(1) + "초";
  } else {
    bar.style.width = "100%";
    bar.style.background = "#4aa3ff";
    txt.textContent = "수확 준비 완료";
  }
}

/* ---------------- 업데이트 ---------------- */
function update(dt) {
  // 이동 (우클릭 클릭 이동 / 모바일 조이스틱)
  if (!state.shopOpen && !state.ended) {
    let dx = 0, dy = 0;
    let mag = 1;                                         // 속도 비율 (조이스틱은 기울기만큼)
    if (!dx && !dy && joy.active && !state.cast) {   // 캐스팅(휘두르는) 중에는 이동 불가
      const jl = Math.hypot(joy.dx, joy.dy);
      if (jl > 0.15) { dx = joy.dx; dy = joy.dy; mag = Math.min(1, jl); }
    }
    if (dx || dy) {
      const len = Math.hypot(dx, dy);
      player.x += (dx / len) * currentSpeed() * mag * dt;
      player.y += (dy / len) * currentSpeed() * mag * dt;
      player.target = null; player.toKeeper = false;   // 조이스틱을 쓰면 클릭 이동 취소
    } else if (!state.cast) {
      moveToTarget(dt);
    }
    player.x = Math.max(player.r, Math.min(W - player.r, player.x));
    player.y = Math.max(player.r + 40, Math.min(H - player.r, player.y));
  }

  // 쿨타임
  if (state.cooldownLeft > 0) state.cooldownLeft = Math.max(0, state.cooldownLeft - dt);

  // 미니언 성장
  for (const p of plots) {
    if (!p.pending && p.growth < 1) p.growth = Math.min(1, p.growth + dt / CFG.growTime);
  }

  // 캐스팅 (0.3초 후 판정)
  if (state.cast) {
    state.cast.t -= dt;
    if (state.cast.t <= 0) {
      const tg = state.cast.target;
      if (tg) {
        tg.growth = 0;
        tg.pending = false;
        state.gold += currentGold();
        playSound("hit");
        updateHUD();
        floaters.push({ x: tg.x, y: tg.y - 50, text: "+" + currentGold(), t: 1 });
      }
      state.cast = null;
    }
  }

  // 휘두르기 애니메이션
  if (state.swing) {
    state.swing.t -= dt;
    if (state.swing.t <= -0.15) state.swing = null;
  }

  if (clickMarker) { clickMarker.t -= dt; if (clickMarker.t <= 0) clickMarker = null; }

  // 떠오르는 골드 텍스트
  for (const f of floaters) { f.t -= dt; f.y -= 40 * dt; }
  for (let i = floaters.length - 1; i >= 0; i--) if (floaters[i].t <= 0) floaters.splice(i, 1);

  updateCooldownBar();
}
const floaters = [];
let clickMarker = null;     // 우클릭한 지점 표시 {x, y, t}

/* ---------------- 그리기 ---------------- */
function draw() {
  // 배경
  if (images.field.ok) {
    ctx.drawImage(images.field, 0, 0, W, H);
  } else {
    ctx.fillStyle = "#35592f"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#4b7a3d"; ctx.fillRect(FIELD.x1, FIELD.y1, FIELD.x2 - FIELD.x1, FIELD.y2 - FIELD.y1);
    ctx.fillStyle = "#6b5a3a"; ctx.fillRect(SHOP_AREA.x, SHOP_AREA.y, SHOP_AREA.w, SHOP_AREA.h);
    ctx.strokeStyle = "#000"; ctx.lineWidth = 3;
    ctx.strokeRect(FIELD.x1, FIELD.y1, FIELD.x2 - FIELD.x1, FIELD.y2 - FIELD.y1);
    ctx.strokeRect(SHOP_AREA.x, SHOP_AREA.y, SHOP_AREA.w, SHOP_AREA.h);
    ctx.fillStyle = "#fff"; ctx.font = "bold 16px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("🌱 농장", (FIELD.x1 + FIELD.x2) / 2, FIELD.y1 - 12);
    ctx.fillText("🏪 상점", SHOP_AREA.x + SHOP_AREA.w / 2, SHOP_AREA.y - 12);
  }

  const hp = hoveredPlot();

  // 밭 + 미니언
  for (const p of plots) {
    ctx.fillStyle = "#5a4326";
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 10, 40, 16, 0, 0, Math.PI * 2); ctx.fill();
    if (p.growth > 0.02) drawMinion(p, p === hp);
  }

  // 우클릭 이동 지점 표시 (초록 원이 줄어듦)
  if (clickMarker) {
    const k = clickMarker.t / 0.5;
    ctx.strokeStyle = "#8dff8d"; ctx.lineWidth = 3;
    ctx.globalAlpha = k;
    ctx.beginPath(); ctx.ellipse(clickMarker.x, clickMarker.y + 14, 8 + 18 * k, (8 + 18 * k) * 0.45, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // 상점 주인
  drawKeeper();

  // 플레이어
  drawPlayer();

  // 휘두르기 효과
  drawSwing();

  // 골드 텍스트
  ctx.textAlign = "center";
  ctx.font = "bold 22px sans-serif";
  for (const f of floaters) {
    ctx.globalAlpha = Math.max(0, f.t);
    ctx.fillStyle = "#ffd84a";
    ctx.strokeStyle = "#000"; ctx.lineWidth = 3;
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;

  // 상점 근처 안내
  if (overKeeper() && !state.shopOpen) {
    ctx.fillStyle = "#8dff8d";
    ctx.font = "bold 14px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(isTouch ? "탭: 상점 열기" : "우클릭: 상점 열기", keeper.x, keeper.y - 70);
  }
}

function drawMinion(p, hovered) {
  const s = 0.35 + 0.65 * p.growth;           // 자라나는 크기
  const ripe = p.growth >= 1;
  const inRange = Math.hypot(p.x - player.x, p.y - player.y) <= CFG.harvestRange;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.globalAlpha = p.pending ? 0.6 : 1;

  if (images.minion.ok) {
    const w = 64 * s, h = 64 * s;
    ctx.drawImage(images.minion, -w / 2, -h - 4 + 20, w, h);
  } else {
    // 임시 그림: 동그란 몸 + 눈 (직접 만든 이미지로 교체하세요)
    ctx.fillStyle = ripe ? "#6aa9ff" : "#7fbf7f";
    ctx.beginPath(); ctx.ellipse(0, -10 * s, 24 * s, 26 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(-8 * s, -16 * s, 5 * s, 0, Math.PI * 2); ctx.arc(8 * s, -16 * s, 5 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#000";
    ctx.beginPath(); ctx.arc(-8 * s, -15 * s, 2 * s, 0, Math.PI * 2); ctx.arc(8 * s, -15 * s, 2 * s, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  if (ripe && hovered && !p.pending) {          // 마우스 올렸을 때 테두리
    ctx.strokeStyle = inRange ? "#8dff8d" : "#ff8d8d";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(p.x, p.y - 20, 32, 0, Math.PI * 2); ctx.stroke();
  }
  if (!ripe) {                                   // 성장 바
    ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillRect(p.x - 22, p.y + 24, 44, 5);
    ctx.fillStyle = "#9be36b"; ctx.fillRect(p.x - 22, p.y + 24, 44 * p.growth, 5);
  }
}

function drawKeeper() {
  if (images.shopkeeper.ok) {
    ctx.drawImage(images.shopkeeper, keeper.x - 40, keeper.y - 60, 80, 100);
  } else {
    // 임시 그림: 가판대 + 상인
    ctx.fillStyle = "#8a5a2b"; ctx.fillRect(keeper.x - 60, keeper.y + 10, 120, 40);
    ctx.fillStyle = "#c33"; ctx.fillRect(keeper.x - 65, keeper.y - 5, 130, 16);
    ctx.fillStyle = "#e8c39a";
    ctx.beginPath(); ctx.arc(keeper.x, keeper.y - 20, 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#5b3b8a";
    ctx.beginPath(); ctx.arc(keeper.x, keeper.y - 28, 24, Math.PI, 0); ctx.fill();
    ctx.fillStyle = "#000";
    ctx.fillRect(keeper.x - 9, keeper.y - 22, 4, 4); ctx.fillRect(keeper.x + 5, keeper.y - 22, 4, 4);
  }
}

function drawPlayer() {
  const ang = state.swing ? state.swing.angle : Math.atan2(mouse.y - player.y, mouse.x - player.x);
  if (images.player.ok) {
    ctx.save();
    ctx.translate(player.x, player.y);
    if (Math.cos(ang) < 0) ctx.scale(-1, 1);   // 좌우 반전
    ctx.drawImage(images.player, -40, -50, 80, 100);
    ctx.restore();
  } else {
    // 임시 그림: 원형 몸 + 방향 표시
    ctx.fillStyle = "#4a5a8a";
    ctx.beginPath(); ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#000"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "#ffd";
    ctx.beginPath(); ctx.arc(player.x + Math.cos(ang) * 9, player.y + Math.sin(ang) * 9, 5, 0, Math.PI * 2); ctx.fill();
  }
  // 사거리 표시 (마우스 근처 미니언 확인용)
  ctx.strokeStyle = "rgba(255,255,255,.12)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(player.x, player.y, CFG.harvestRange, 0, Math.PI * 2); ctx.stroke();
}

function drawSwing() {
  if (!state.swing) return;
  const total = CFG.castTime;
  const prog = Math.min(1, Math.max(0, 1 - state.swing.t / total));   // 0 → 1
  const a0 = state.swing.angle - 1.2;
  const a1 = state.swing.angle + 1.2;
  const cur = a0 + (a1 - a0) * prog;

  ctx.save();
  ctx.translate(player.x, player.y);
  // 잔상 호
  ctx.strokeStyle = "rgba(255,255,255,.55)";
  ctx.lineWidth = 10; ctx.lineCap = "round";
  ctx.beginPath(); ctx.arc(0, 0, 60, a0, cur); ctx.stroke();
  // 낫(무기)
  ctx.rotate(cur);
  ctx.strokeStyle = "#8a6a3a"; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(62, 0); ctx.stroke();
  ctx.fillStyle = "#cfd8dc";
  ctx.beginPath(); ctx.moveTo(62, -4); ctx.quadraticCurveTo(88, -6, 84, 22); ctx.quadraticCurveTo(76, 4, 62, 4); ctx.fill();
  ctx.restore();
}

function drawJoystick() {
  if (!isTouch || state.shopOpen || state.ended) return;
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = "#000";
  ctx.beginPath(); ctx.arc(JOY.baseX, JOY.baseY, JOY.baseR, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.stroke();
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(JOY.baseX + joy.dx * JOY.baseR * 0.6, JOY.baseY + joy.dy * JOY.baseR * 0.6, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/* ---------------- 메인 루프 ---------------- */
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  ctx.clearRect(0, 0, W, H);
  draw();
  drawJoystick();
  requestAnimationFrame(loop);
}
updateHUD();
requestAnimationFrame(loop);
