/* =========================================================
   ピアノ スタンプカード 共通エンジン
   各ページの index.html で window.APP_CONFIG を決めてから、このファイルを読み込む。
   「設定（どの曲・どこに保存）」と「仕組み（動き・保存処理）」を分けておくと、
   ページを増やしても直すのは1か所で済む。
   ========================================================= */
(() => {
const CONFIG = Object.assign(
  { storageKey: "piano-stamp-card-v1", childName: "", goal: 5, cards: ["aladdin", "neko"] },
  window.APP_CONFIG || {}
);
const GOAL = CONFIG.goal;
const STORAGE_KEY = CONFIG.storageKey;

/* ---------- スタンプの絵（SVG） ---------- */
const SVG = {
  lamp: `<svg viewBox="0 0 100 100" aria-hidden="true">
    <g fill="#ffd23f" stroke="#c98a00" stroke-width="2" stroke-linejoin="round">
      <circle cx="50" cy="31" r="5"/>
      <path d="M36 50 Q50 33 64 50 Z"/>
      <path d="M20 54 Q50 43 78 54 Q86 54 96 41 Q94 58 80 66 Q70 77 50 77 Q30 77 23 66 Q19 61 20 54 Z"/>
      <path d="M39 77 L61 77 L66 86 L34 86 Z"/>
    </g>
    <path d="M21 57 Q6 55 9 66 Q12 74 25 68" fill="none" stroke="#ffd23f" stroke-width="5" stroke-linecap="round"/>
    <ellipse cx="38" cy="60" rx="9" ry="3.5" fill="#fff" opacity=".55"/>
    <path d="M86 18 l2.5 6.5 6.5 2.5 -6.5 2.5 -2.5 6.5 -2.5 -6.5 -6.5 -2.5 6.5 -2.5z" fill="#fff6c4"/>
  </svg>`,
  cat: `<svg viewBox="0 0 100 100" aria-hidden="true">
    <g fill="#fff"><path d="M19 46 L23 13 L45 30 Z"/><path d="M81 46 L77 13 L55 30 Z"/><ellipse cx="50" cy="56" rx="32" ry="27"/></g>
    <path d="M25 38 L26 22 L37 31 Z" fill="#ffb3cc"/><path d="M75 38 L74 22 L63 31 Z" fill="#ffb3cc"/>
    <g fill="none" stroke="#ff5c93" stroke-width="4" stroke-linecap="round">
      <path d="M33 54 Q38 47 43 54"/><path d="M57 54 Q62 47 67 54"/>
      <path d="M43 66 Q46.5 70 50 66 Q53.5 70 57 66"/>
    </g>
    <path d="M46.5 60.5 L53.5 60.5 L50 64 Z" fill="#ff5c93"/>
    <circle cx="30" cy="63" r="4.5" fill="#ffb3cc"/><circle cx="70" cy="63" r="4.5" fill="#ffb3cc"/>
    <g stroke="#fff" stroke-width="3" stroke-linecap="round"><path d="M4 56 L20 58 M5 66 L20 63 M96 56 L80 58 M95 66 L80 63"/></g>
  </svg>`,
  tulip: `<svg viewBox="0 0 100 100" aria-hidden="true">
    <path d="M50 52 L50 90" stroke="#3fa34d" stroke-width="5" stroke-linecap="round"/>
    <path d="M50 82 Q28 76 22 54 Q42 58 50 76 Z" fill="#5cc26a"/>
    <path d="M50 74 Q70 64 76 44 Q58 50 50 68 Z" fill="#5cc26a"/>
    <path d="M28 18 L39 32 L50 14 L61 32 L72 18 Q78 46 50 57 Q22 46 28 18 Z" fill="#ff5a5f" stroke="#d94045" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M39 32 Q44 44 50 46 Q56 44 61 32" fill="none" stroke="#d94045" stroke-width="2" opacity=".6"/>
    <ellipse cx="38" cy="34" rx="3.5" ry="7" fill="#fff" opacity=".55"/>
  </svg>`,
  sheep: `<svg viewBox="12 20 80 80" aria-hidden="true">
    <g fill="#5a4a42"><rect x="40" y="64" width="6" height="18" rx="3"/><rect x="52" y="66" width="6" height="16" rx="3"/>
      <rect x="64" y="64" width="6" height="18" rx="3"/><rect x="74" y="62" width="6" height="18" rx="3"/></g>
    <g fill="#fff">
      <circle cx="44" cy="46" r="14"/><circle cx="58" cy="40" r="14"/><circle cx="72" cy="46" r="13"/>
      <circle cx="78" cy="58" r="11"/><circle cx="64" cy="64" r="13"/><circle cx="48" cy="62" r="13"/><circle cx="58" cy="52" r="16"/>
    </g>
    <ellipse cx="28" cy="52" rx="12" ry="11" fill="#5a4a42"/>
    <ellipse cx="20" cy="45" rx="7" ry="3.5" fill="#5a4a42" transform="rotate(-25 20 45)"/>
    <circle cx="33" cy="42" r="7" fill="#fff"/>
    <path d="M21 52 Q24 48 27 52" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="25" cy="58" r="3" fill="#ff9eb5"/>
  </svg>`,
};

/* ---------- 曲（カード）のカタログ ----------
   id は保存データのキーになるので、あとから変えないこと */
const CARD_LIB = {
  aladdin: { title: "アラジン", icon: "🪔", theme: "night", svg: SVG.lamp,
    emojis: ["✨", "⭐", "🌟", "💫"], colors: ["#ffd23f", "#ffe9a8", "#b28dff", "#8a5ff0", "#ffffff"],
    extra: { type: "rain" } },
  neko: { title: "ねこふんじゃった", icon: "🐱", theme: "pink", svg: SVG.cat,
    emojis: ["🐾", "💖", "🎵", "🌸"], colors: ["#ff5c93", "#ffb3cc", "#ffd166", "#9be7ff", "#ffffff"],
    extra: { type: "steps", char: "🐾", rot: 80 } },
  tulip: { title: "チューリップ", icon: "🌷", theme: "garden", svg: SVG.tulip,
    emojis: ["🌷", "🌸", "🦋", "✨"], colors: ["#ff5a5f", "#ffd54d", "#ff9ecb", "#8fd694", "#ffffff"],
    extra: { type: "rain" } },
  sheep: { title: "メリーさんのひつじ", icon: "🐑", theme: "meadow", svg: SVG.sheep,
    emojis: ["🐑", "☁️", "🌼", "🎵"], colors: ["#4aa3df", "#bfe6ff", "#ffd54d", "#ffffff", "#8fd694"],
    extra: { type: "hop", char: "🐑" } },
};
const CARDS = CONFIG.cards.map(id => ({ id, ...CARD_LIB[id] }));

/* ---------- 小さな道具 ---------- */
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const fmtDate = t => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()}`; };
const $ = id => document.getElementById(id);

/* =========================================================
   データの保存（localStorage）
   localStorage は「ドメインごと」に1つ。同じ girio55.github.io の
   別ページと混ざらないよう、ページごとに別のキーを使う
   ========================================================= */
function loadState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}
function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}
const state = loadState();
for (const c of CARDS) state[c.id] ??= { stamps: [], cleared: 0 };
navigator.storage?.persist?.();

/* =========================================================
   画面の骨組みをつくる
   ========================================================= */
document.body.insertAdjacentHTML("afterbegin", `
  ${CARDS.map((c, k) => `<div class="bg bg-${c.theme}" data-k="${k}"></div>`).join("")}
  <nav class="tabs" id="tabs" style="--n:${CARDS.length}">
    <span class="tab-indicator"></span>
    ${CARDS.map((c, k) => `<button data-go="${k}">${c.icon} ${c.title}</button>`).join("")}
  </nav>
  <main class="pages" id="pages"></main>

  <div class="overlay" id="overlay">
    <div class="panel">
      <div class="medal">🏅</div>
      <h2>おめでとう！</h2>
      <p id="ovText"></p>
      <button class="ov-btn" id="ovBtn">やったね！</button>
    </div>
  </div>

  <div class="show-layer" id="show">
    <div class="show-bg"></div>
    <div class="show-rays"></div>
    <div class="show-count" id="showCount"></div>
    <div class="show-fly" id="showFly"></div>
    <div class="show-praise" id="showPraise"></div>
    <div class="show-hint">がめんを タップして キラキラ！</div>
  </div>

  <div class="overlay" id="menuOv">
    <div class="panel">
      <h3>🔧 おとなメニュー</h3>
      <p id="menuText"></p>
      <button class="menu-btn" data-act="stamps">いまのカードの スタンプを消す</button>
      <button class="menu-btn danger" data-act="all">クリア回数も ふくめて ぜんぶ消す</button>
      <button class="menu-btn cancel" data-act="cancel">やめる</button>
    </div>
  </div>

  <canvas id="fx"></canvas>
`);

/* 背景の飾り（テーマごと） */
const bgEls = [...document.querySelectorAll(".bg")];
bgEls.forEach((bg, k) => decorate(bg, CARDS[k].theme));

function decorate(bg, theme) {
  if (theme === "night") {
    bg.insertAdjacentHTML("beforeend", `<div class="moon"></div><div class="shooting"></div>`);
    for (let i = 0; i < 60; i++) {
      const s = document.createElement("i");
      s.className = "star";
      s.style.cssText = `left:${rand(0, 100)}%;top:${rand(0, 100)}%;--s:${rand(1, 3.2)}px;animation-duration:${rand(2, 5)}s;animation-delay:${rand(-5, 0)}s`;
      bg.appendChild(s);
    }
  }
  if (theme === "pink") floaters(bg, ["🐾"], 14, 0.22);
  if (theme === "garden") {
    floaters(bg, ["🦋", "🌸"], 8, 0.5);
    bg.insertAdjacentHTML("beforeend",
      `<div class="flowerbed">${Array.from({ length: 8 }, (_, i) =>
        `<span style="animation-delay:${-i * 0.37}s">🌷</span>`).join("")}</div>`);
  }
  if (theme === "meadow") {
    bg.insertAdjacentHTML("beforeend", `<div class="hill"></div>`);
    for (let i = 0; i < 5; i++) {
      const c = document.createElement("span");
      c.className = "cloud";
      c.textContent = "☁️";
      const dur = rand(28, 50);
      c.style.cssText = `top:${rand(3, 45)}%;font-size:${rand(40, 80)}px;animation-duration:${dur}s;animation-delay:${-rand(0, dur)}s`;
      bg.appendChild(c);
    }
    floaters(bg, ["🌼"], 5, 0.45);
  }
}
function floaters(bg, chars, n, opacity) {
  for (let i = 0; i < n; i++) {
    const p = document.createElement("span");
    p.className = "drift";
    p.textContent = pick(chars);
    const dur = rand(12, 22);
    p.style.cssText = `left:${rand(0, 95)}%;font-size:${rand(18, 36)}px;opacity:${opacity};--rot:${rand(-30, 30)}deg;animation-duration:${dur}s;animation-delay:${-dur * Math.random()}s`;
    bg.appendChild(p);
  }
}

/* ページ（カード）をつくる */
const pagesEl = $("pages");
const els = {};
for (const c of CARDS) {
  const page = document.createElement("section");
  page.className = `page ${c.theme}`;
  page.innerHTML = `
    <div class="card">
      <div class="card-head">
        <div class="sub">${CONFIG.childName ? CONFIG.childName + "ちゃんの " : ""}ピアノ スタンプカード</div>
        <h1><span class="head-icon">${c.icon}</span>${c.title}</h1>
        <div class="medals"></div>
      </div>
      <div class="grid"></div>
      <p class="msg"></p>
    </div>
    <div class="actions">
      <button class="play"></button>
      <button class="undo">ひとつ もどす</button>
    </div>`;
  pagesEl.appendChild(page);
  els[c.id] = {
    page, card: page.querySelector(".card"), grid: page.querySelector(".grid"),
    msg: page.querySelector(".msg"), medals: page.querySelector(".medals"),
    play: page.querySelector(".play"), undo: page.querySelector(".undo"),
  };
  els[c.id].play.addEventListener("click", () => onPlay(c));
  els[c.id].undo.addEventListener("click", () => onUndo(c));
  setupHold(c);
  render(c);
}

/* 状態(state) → 見た目 を毎回つくり直す。
   「データが正、画面はその写し」にしておくとバグりにくい */
function render(c, { land = -1, pop = false, pending = -1 } = {}) {
  const s = state[c.id], e = els[c.id];
  // pending: 保存は済んでいるが、まだカードに着地していないスタンプの番号
  const n = pending >= 0 ? pending : s.stamps.length;
  const done = n >= GOAL && land !== GOAL - 1;

  let html = "";
  for (let i = 0; i < GOAL; i++) {
    const st = i < n ? s.stamps[i] : null;
    const cls = ["slot", st && "filled", i === n && "next", pop && "pop", i === land && "landing"].filter(Boolean).join(" ");
    html += `<div class="${cls}" style="--i:${i}" data-i="${i}">`;
    html += st
      ? `<div class="stamp ${i === land ? "land" : ""}" style="--r:${st.r}deg">${c.svg}<span class="stamp-text">よくできました</span></div><span class="date">${fmtDate(st.t)}</span>`
      : `<span class="num">${i + 1}</span>`;
    html += `</div>`;
  }
  html += `<div class="goal ${done ? "done" : ""} ${pop ? "pop" : ""}" style="--i:${GOAL}">
             <span class="gift">${done ? "🏆" : "🎁"}</span><span class="glabel">${done ? "ゴール！" : "ゴール"}</span></div>`;
  e.grid.innerHTML = html;

  e.msg.textContent =
    n === 0 ? "ひいたら ボタンを おしてね 🎹" :
    n < GOAL ? `あと ${GOAL - n}かい で ゴール！` :
    "ゴール！ よく がんばったね！";
  e.play.textContent = n >= GOAL ? "🎁 あたらしい カードに する" : "🎹 1かい ひいたよ！";
  e.medals.textContent = s.cleared > 0
    ? `クリア ${"🏅".repeat(Math.min(s.cleared, 5))}${s.cleared > 5 ? ` ×${s.cleared}` : ""}` : "";
  e.undo.classList.toggle("hidden", n === 0);
}

/* =========================================================
   ボタンを押したとき
   ========================================================= */
let busy = false;   // 演出中の連打を防ぐ

async function onPlay(c) {
  if (busy) return;
  const s = state[c.id];
  if (s.stamps.length >= GOAL) return newCard(c);

  busy = true;
  s.stamps.push({ t: Date.now(), r: Math.round(rand(-14, 14)) });
  saveState();                         // 先に保存しておく（途中でアプリを閉じても消えない）
  const i = s.stamps.length - 1;
  render(c, { pending: i });

  await showStamp(c, i);               // ごほうびタイム（約4秒）が終わるまで待つ

  render(c, { land: i });
  sfx.stamp(i, 0.08);
  setTimeout(() => {                   // カードに着地した瞬間の演出
    const slot = els[c.id].grid.querySelector(`[data-i="${i}"]`);
    const ring = document.createElement("div");
    ring.className = "ring";
    slot.appendChild(ring);
    const card = els[c.id].card;
    card.classList.remove("thump"); void card.offsetWidth; card.classList.add("thump");
    const p = centerOf(slot);
    fx.burst(p.x, p.y, c, 30, 8);
  }, 100);

  if (i === GOAL - 1) setTimeout(() => celebrate(c), 700);
  else setTimeout(() => (busy = false), 500);
}

function celebrate(c) {
  const goal = els[c.id].grid.querySelector(".goal");
  goal.classList.add("done", "unlock");
  goal.querySelector(".gift").textContent = "🏆";
  goal.querySelector(".glabel").textContent = "ゴール！";
  const p = centerOf(goal);
  fx.burst(p.x, p.y, c, 60, 11);
  sfx.fanfare();
  setTimeout(() => {
    fx.rain(c);
    showOverlay(c);
    busy = false;
  }, 600);
}

function newCard(c) {
  const s = state[c.id];
  s.cleared++;
  s.stamps = [];
  saveState();
  render(c, { pop: true });
  sfx.arpeggio();
  busy = true;
  setTimeout(() => (busy = false), 700);
}

/* 「ひとつもどす」は2回タップで実行（子どもの誤タップ対策） */
let undoArm = null, undoTimer = null;
function onUndo(c) {
  if (busy) return;
  const btn = els[c.id].undo;
  if (undoArm !== c.id) {
    undoArm = c.id;
    btn.textContent = "もういちど おすと もどります";
    btn.classList.add("armed");
    clearTimeout(undoTimer);
    undoTimer = setTimeout(() => disarmUndo(c), 3000);
    return;
  }
  disarmUndo(c);
  state[c.id].stamps.pop();
  saveState();
  render(c);
}
function disarmUndo(c) {
  undoArm = null;
  els[c.id].undo.textContent = "ひとつ もどす";
  els[c.id].undo.classList.remove("armed");
}

/* =========================================================
   ごほうびタイム
   画面いっぱいに大きなスタンプ → メロディ → カードへ飛んでいく
   ========================================================= */
const PRAISE = ["すごい！", "じょうず！", "かっこいい！", "てんさい！", "ばっちり！", "がんばったね！", "ステキ！"];
const showEl = $("show");
const showFly = $("showFly");
let showCard = null;

function centerOf(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width };
}

/* 3つの登場パターン。同じのが続かないように、前回以外から選ぶ */
const VARIANTS = ["spin", "drop", "gift"];
let lastVariant = null;

function showStamp(c, i) {
  return new Promise(resolve => {
    const st = state[c.id].stamps[i];
    const variant = pick(VARIANTS.filter(v => v !== lastVariant));
    lastVariant = variant;

    showCard = c;
    showEl.className = `show-layer ${c.theme} v-${variant}`;
    showFly.innerHTML = `<div class="stamp" style="--r:${st.r}deg">${c.svg}<span class="stamp-text">よくできました</span></div>`
      + (variant === "gift" ? `<div class="show-gift">🎁</div>` : "");
    $("showCount").textContent = `${i + 1}かいめ！`;
    $("showPraise").textContent = pick(PRAISE);
    void showEl.offsetWidth;           // リフローさせてからクラスを付けると、毎回アニメが最初から再生される
    showEl.classList.add("show");

    // パターンごとの「タイムライン」：何ミリ秒後に何をするか
    const at = (ms, fn) => setTimeout(fn, ms);
    let reveal;                        // スタンプがはっきり見える瞬間
    if (variant === "spin") {
      reveal = 650;
      sfx.jingle(i);
      at(reveal, () => burstAtStamp(c, 45, 11));
    }
    if (variant === "drop") {
      reveal = 560;
      sfx.fall();
      at(reveal, () => {
        showEl.classList.add("quake");
        showFly.insertAdjacentHTML("beforeend", `<div class="shock"></div><div class="shock late"></div>`);
        burstAtStamp(c, 70, 14);
        sfx.boom();
      });
      at(reveal + 150, () => sfx.jingle(i));
    }
    if (variant === "gift") {
      reveal = 1600;
      sfx.pop();
      [650, 950, 1250].forEach(ms => at(ms, () => sfx.rattle()));
      at(reveal, () => {
        showEl.classList.add("opened");
        burstAtStamp(c, 70, 13);
        sfx.pop();
        sfx.jingle(i);
      });
    }

    for (let k = 0; k < 7; k++) {      // スタンプのまわりでキラキラが順番にはじける
      at(reveal + 300 + k * 320, () => {
        const p = centerOf(showFly), a = rand(0, Math.PI * 2), rad = p.w * 0.65;
        fx.burst(p.x + Math.cos(a) * rad, p.y + Math.sin(a) * rad, c, 7, 3.5);
      });
    }
    const extraAt = Math.max(0, reveal - 350);
    if (c.extra.type === "steps") at(extraAt, () => walkSteps(c.extra));
    if (c.extra.type === "hop") at(extraAt, () => hopAcross(c.extra));
    if (c.extra.type === "rain") at(extraAt, () => fx.rain(c, 60));

    at(reveal + 2650, () => flyToCard(c, i, resolve));
  });
}

function burstAtStamp(c, count, power) {
  const p = centerOf(showFly);
  fx.burst(p.x, p.y, c, count, power);
}

/* 足あとがトコトコ並んでいく（ねこ） */
function walkSteps({ char, rot }) {
  for (let k = 0; k < 9; k++) {
    setTimeout(() => {
      const p = document.createElement("span");
      p.className = "walk-paw";
      p.textContent = char;
      const x = 10 + (k / 8) * (innerWidth - 60);
      const y = innerHeight * 0.76 + (k % 2 ? -22 : 22);
      p.style.cssText = `left:${x}px;top:${y}px;--rot:${rot + rand(-10, 10)}deg`;
      showEl.appendChild(p);
      sfx.step(k);
      setTimeout(() => p.remove(), 1500);
    }, 500 + k * 260);
  }
}

/* ぴょんぴょん跳ねながら横切る（ひつじ） */
function hopAcross({ char }) {
  const el = document.createElement("span");
  el.className = "hopper";
  el.innerHTML = `<span>${char}</span>`;
  el.style.top = `${innerHeight * 0.74}px`;
  showEl.appendChild(el);
  const anim = el.animate(
    [{ transform: `translateX(${innerWidth + 20}px)` }, { transform: "translateX(-90px)" }],
    { duration: 2640, delay: 350, easing: "linear", fill: "both" });
  anim.onfinish = () => el.remove();
  for (let k = 0; k < 8; k++) setTimeout(() => sfx.boing(k), 350 + k * 330);
}

/* 大きいスタンプを、カードの枠の位置・大きさまで縮めながら飛ばす（FLIP） */
function flyToCard(c, i, resolve) {
  const slot = els[c.id].grid.querySelector(`[data-i="${i}"]`);
  const from = centerOf(showFly), to = centerOf(slot);
  showEl.classList.add("leaving");
  sfx.whoosh();
  const anim = showFly.animate(
    [{ transform: "translate(0, 0) scale(1)" },
     { transform: `translate(${to.x - from.x}px, ${to.y - from.y}px) scale(${to.w / from.w})` }],
    { duration: 550, easing: "cubic-bezier(.55, 0, .75, .2)", fill: "forwards" });
  anim.onfinish = () => {
    showEl.classList.remove("show", "leaving");
    showFly.innerHTML = "";
    anim.cancel();
    showEl.querySelectorAll(".walk-paw, .hopper").forEach(e => e.remove());
    resolve();
  };
}

/* ごほうびタイム中に画面をタップすると、そこでキラキラ＋音 */
showEl.addEventListener("pointerdown", e => {
  if (!showEl.classList.contains("show") || showEl.classList.contains("leaving")) return;
  fx.burst(e.clientX, e.clientY, showCard, 14, 6);
  sfx.sparkle();
});

/* =========================================================
   おめでとう画面
   ========================================================= */
const overlay = $("overlay");
function showOverlay(c) {
  overlay.dataset.theme = c.theme;
  $("ovText").innerHTML =
    `${c.title} を ${GOAL}かい<br>ひけたね！ すごい！<br>これで ${state[c.id].cleared + 1}まいめ クリア 🎉`;
  overlay.classList.add("show");
}
$("ovBtn").addEventListener("click", () => {
  overlay.classList.remove("show");
  sfx.arpeggio();
});

/* =========================================================
   おとなメニュー：タイトルを2秒長押しで開く（子どもが偶然開かないように）
   ========================================================= */
const menuOv = $("menuOv");
let menuCard = null;

function setupHold(c) {
  const h1 = els[c.id].page.querySelector("h1");
  let timer = null;
  h1.addEventListener("pointerdown", () => {
    h1.classList.add("holding");
    timer = setTimeout(() => { h1.classList.remove("holding"); openMenu(c); }, 2000);
  });
  const stop = () => { clearTimeout(timer); h1.classList.remove("holding"); };
  ["pointerup", "pointerleave", "pointercancel"].forEach(ev => h1.addEventListener(ev, stop));
}

function openMenu(c) {
  if (busy) return;
  menuCard = c;
  const s = state[c.id];
  menuOv.dataset.theme = c.theme;
  $("menuText").innerHTML =
    `「${c.title}」の カードを どうする？<br><small>いま：スタンプ ${s.stamps.length}こ ／ クリア ${s.cleared}まい</small>`;
  menuOv.classList.add("show");
}

menuOv.addEventListener("click", e => {
  const act = e.target.dataset?.act;
  if (!act && e.target !== menuOv) return;   // パネルの余白タップは無視、背景タップは閉じる
  const s = state[menuCard.id];
  if (act === "stamps") s.stamps = [];
  if (act === "all") { s.stamps = []; s.cleared = 0; }
  if (act === "stamps" || act === "all") { saveState(); render(menuCard, { pop: true }); }
  menuOv.classList.remove("show");
});

/* =========================================================
   スワイプ／タブ切り替え
   スクロール位置 p（0, 1, 2…）で背景とタブを連動させる
   ========================================================= */
const tabs = $("tabs");
const tabBtns = [...tabs.querySelectorAll("button")];

function onScroll() {
  const p = pagesEl.scrollLeft / pagesEl.clientWidth;
  // 背景は下から順に重ねてあるので、k枚目は p が k-1 → k に進むにつれて 0 → 1 になる
  bgEls.forEach((bg, k) => { bg.style.opacity = k === 0 ? 1 : Math.min(1, Math.max(0, p - (k - 1))); });
  tabs.style.setProperty("--p", p);
  const idx = Math.round(p);
  tabBtns.forEach((b, i) => b.classList.toggle("active", i === idx));
  clearTimeout(onScroll.saveTimer);
  onScroll.saveTimer = setTimeout(() => { state._page = idx; saveState(); }, 300);
}
pagesEl.addEventListener("scroll", onScroll, { passive: true });

tabBtns.forEach(b => b.addEventListener("click", () => {
  pagesEl.scrollTo({ left: Number(b.dataset.go) * pagesEl.clientWidth, behavior: "smooth" });
}));

requestAnimationFrame(() => {     // 前回見ていたカードを開く
  pagesEl.scrollLeft = Math.min(state._page || 0, CARDS.length - 1) * pagesEl.clientWidth;
  onScroll();
});

/* iOSで :active（押し込みの見た目）を効かせるおまじない */
document.addEventListener("touchstart", () => {}, { passive: true });

/* =========================================================
   パーティクル（紙吹雪・キラキラ）を canvas で描く
   DOM要素を何百個も作るより、canvas に毎フレーム描く方が軽い
   ========================================================= */
const fx = (() => {
  const canvas = $("fx");
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, parts = [], running = false, last = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  addEventListener("resize", resize);

  function make(x, y, vx, vy, c, opt = {}) {
    const emoji = Math.random() < (opt.emojiRate ?? 0.4);
    return {
      x, y, vx, vy, g: opt.g ?? 0.28, drag: opt.drag ?? 0.985,
      rot: rand(0, Math.PI * 2), vr: rand(-0.25, 0.25),
      life: 0, max: opt.max ?? rand(55, 90), sway: rand(0, 6.28), swayAmp: opt.swayAmp ?? 0,
      emoji, char: pick(c.emojis), color: pick(c.colors),
      size: emoji ? rand(16, 28) : rand(7, 13),
    };
  }

  function burst(x, y, c, count = 30, power = 8) {
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(power * 0.35, power);
      parts.push(make(x, y, Math.cos(a) * sp, Math.sin(a) * sp - 3, c));
    }
    start();
  }

  function rain(c, count = 170) {
    for (let i = 0; i < count; i++) {
      parts.push(make(rand(0, W), rand(-H * 0.8, -20), rand(-1, 1), rand(2, 5), c,
        { g: 0.04, drag: 0.995, max: 400, swayAmp: 1.2, emojiRate: 0.25 }));
    }
    start();
  }

  function start() {
    if (running) return;
    running = true; last = performance.now();
    requestAnimationFrame(tick);
  }

  function tick(now) {
    // dt: 60fps基準で何フレーム分経ったか。120HzのiPhoneでも同じ速さになる
    const dt = Math.min((now - last) / 16.67, 3); last = now;
    ctx.clearRect(0, 0, W, H);
    parts = parts.filter(p => p.life < p.max && p.y < H + 60);
    for (const p of parts) {
      p.vx *= Math.pow(p.drag, dt); p.vy = p.vy * Math.pow(p.drag, dt) + p.g * dt;
      p.x += (p.vx + Math.sin(p.life * 0.06 + p.sway) * p.swayAmp) * dt;
      p.y += p.vy * dt; p.rot += p.vr * dt; p.life += dt;
      const t = p.life / p.max;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t * t);
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      if (p.emoji) {
        ctx.font = `${p.size}px "Apple Color Emoji", sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(p.char, 0, 0);
      } else {
        ctx.scale(1, Math.cos(p.life * 0.25));   // ひらひら裏返る
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      }
      ctx.restore();
    }
    if (parts.length) requestAnimationFrame(tick);
    else { running = false; ctx.clearRect(0, 0, W, H); }
  }

  return { burst, rain };
})();

/* =========================================================
   効果音（Web Audio APIで音をその場で合成。音声ファイル不要）
   iOSは「ユーザーがタップした瞬間」でないと音を出せないので、
   タップの処理の中で AudioContext を作る/再開する
   ========================================================= */
const sfx = (() => {
  let ac = null;
  const SCALE = [523.25, 587.33, 659.25, 783.99, 880.0];   // ド レ ミ ソ ラ（1個ごとに音が上がる）
  // 1回ごとにちがう、短いオリジナルのメロディ（ドレミソラだけで作ると明るく聞こえる）
  const JINGLES = [
    [392, 523.25, 659.25, 783.99, 659.25, 783.99, 1046.5],
    [523.25, 587.33, 659.25, 783.99, 880, 783.99, 1046.5],
    [659.25, 783.99, 880, 783.99, 659.25, 783.99, 1046.5, 1174.66],
    [783.99, 659.25, 523.25, 659.25, 783.99, 880, 1046.5, 1318.5],
    [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5, 1567.98],
  ];
  const HIGH = [1046.5, 1174.66, 1318.5, 1567.98, 1760, 2093];

  // iOS 17以降：音の扱いを「音楽再生」にする。消音スイッチや他アプリの状態に左右されにくくなる
  try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch {}

  function ctx() {
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
    // iOSには "suspended" のほかに "interrupted"（電話・別タブ・バックグラウンド復帰など）という状態がある。
    // "running" 以外なら何でも再開を試みる
    if (ac.state !== "running") ac.resume().catch(() => {});
    return ac;
  }

  // 最初のタッチで「無音を一瞬だけ鳴らす」と、以降の音が確実に出るようになる（iOSの定番の解錠テクニック）
  function unlock() {
    const a = ctx();
    const buf = a.createBuffer(1, 1, 22050);
    const src = a.createBufferSource();
    src.buffer = buf;
    src.connect(a.destination);
    src.start(0);
  }
  ["touchend", "pointerup", "click"].forEach(ev =>
    document.addEventListener(ev, unlock, { passive: true }));

  // アプリを裏に回して戻ってきたとき、止まった音を再開する
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && ac && ac.state !== "running") ac.resume().catch(() => {});
  });
  function tone(freq, at, dur, type = "triangle", vol = 0.22) {
    const a = ctx(), o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.01);   // 一瞬で立ち上がって
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur); // ゆっくり減衰 → ピアノっぽい
    o.connect(g).connect(a.destination);
    o.start(at); o.stop(at + dur + 0.05);
  }
  function sweep(f1, f2, at, dur, vol) {
    const a = ctx(), o = a.createOscillator(), g = a.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(f1, at);
    o.frequency.exponentialRampToValueAtTime(f2, at + dur * 0.8);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(a.destination);
    o.start(at); o.stop(at + dur + 0.05);
  }
  // ノイズ（ザーッという音）を短く鳴らす。フィルタで「ドン」「ガタッ」などの質感を作る
  function noise(at, dur, vol, freq, type = "lowpass") {
    const a = ctx();
    const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    src.buffer = buf; f.type = type; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(f).connect(g).connect(a.destination);
    src.start(at);
  }
  function piano(freq, at, dur = 1) {
    tone(freq, at, dur, "triangle", 0.22);
    tone(freq * 2, at, dur * 0.5, "sine", 0.05);   // 倍音を少し足す
  }

  return {
    jingle(i) {
      const t = ctx().currentTime + 0.05;
      const mel = JINGLES[i % JINGLES.length];
      mel.forEach((f, k) => piano(f, t + k * 0.15, k === mel.length - 1 ? 1.5 : 0.5));
      piano(130.81, t, 1.6);                         // 低い「ド」で支える
      piano(196, t + mel.length * 0.15 - 0.15, 1.6); // 最後に低い「ソ」
    },
    sparkle() {
      const t = ctx().currentTime, f = pick(HIGH);
      tone(f, t, 0.35, "sine", 0.12);
      tone(f * 1.5, t + 0.05, 0.25, "sine", 0.04);
    },
    step(k) { tone(1200 + (k % 2) * 200, ctx().currentTime, 0.1, "sine", 0.06); },
    boing(k) { sweep(300 + (k % 2) * 80, 700 + (k % 2) * 120, ctx().currentTime, 0.22, 0.08); },
    whoosh() { sweep(400, 1600, ctx().currentTime, 0.45, 0.07); },
    fall()   { sweep(1500, 300, ctx().currentTime, 0.55, 0.07); },          // ヒューッ
    boom() {                                                                  // ドーン
      const t = ctx().currentTime;
      sweep(160, 40, t, 0.6, 0.6);
      noise(t, 0.4, 0.35, 500);
    },
    rattle() {                                                                // ガタッ
      const t = ctx().currentTime;
      noise(t, 0.09, 0.18, 1800, "bandpass");
      tone(260 + rand(0, 80), t, 0.08, "triangle", 0.1);
    },
    pop() { sweep(400, 1000, ctx().currentTime, 0.15, 0.12); },             // ポンッ
    stamp(i, delay) {
      const t = ctx().currentTime + delay;
      sweep(220, 60, t, 0.2, 0.5);                    // ポン
      piano(SCALE[i % SCALE.length], t + 0.02, 1.1);
      tone(2093, t + 0.1, 0.25, "sine", 0.06);        // キラッ
    },
    fanfare() {
      const t = ctx().currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((f, k) => piano(f, t + k * 0.13, 0.9));
      [523.25, 659.25, 783.99, 1046.5].forEach(f => piano(f, t + 0.6, 1.8));
    },
    arpeggio() {
      const t = ctx().currentTime;
      [783.99, 987.77, 1174.66].forEach((f, k) => piano(f, t + k * 0.08, 0.6));
    },
  };
})();
})();
