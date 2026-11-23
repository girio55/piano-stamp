/* =========================================================
   ピアノ すごろく 共通エンジン（子どもごとに 1つの盤面・1つのたまご）
   各ページの index.html で window.APP_CONFIG を決めてから、このファイルを読み込む。

   遊び方：ひいた曲のボタンを押す → その曲の演出でサイコロ（1〜3）→ たまごをのせたコマが進む。
   進むと たまご → あかちゃん → こども → ゴールで おとな に育ち、ずかんに登録される。
   練習回数は「曲ごと」に数え、盤面とたまごは「子どもごと」に1つ。
   ========================================================= */
(() => {
const CONFIG = Object.assign(
  { storageKey: "piano-sugoroku-v3", childName: "", songs: ["aladdin", "neko"], legacyKeys: [], recitalDate: "" },
  window.APP_CONFIG || {}
);
const STORAGE_KEY = CONFIG.storageKey;

/* ---------- すごろくのルール ---------- */
const GOAL = 15;                        // マスは 0（スタート）〜 15（ゴール）の16マス
const COLS = 4;                         // 4×4 に並べて、行ごとに向きを変える（ジグザグ）
const DICE_MAX = 3;                     // サイコロは 1〜3。1周 だいたい7〜8回でゴール
const STAGE_AT = [0, 5, 10, GOAL];      // ここを越えると育つ：たまご → あかちゃん → こども → おとな
const EVENTS = { 3: "star", 5: "warp", 7: "treat", 10: "star", 12: "warp", 13: "treat" };
const EVENT_ICON = { star: "⭐", warp: "🌀", treat: "🎁" };
const TREATS = ["🍓", "🍰", "🍩", "🍭", "🍎", "🧁", "🍪", "🍮"];

/* ---------- うまれてくる なかま ----------
   st: [あかちゃん, こども, おとな]。rare は出にくい（たまごがキラキラ） */
const SPECIES = {
  hiyoko:  { name: "にわとり",     st: ["🐣", "🐥", "🐓"], egg: "#fff3c4", spot: "#ffc94d" },
  lion:    { name: "ライオン",     st: ["🐱", "🐯", "🦁"], egg: "#ffe1c2", spot: "#f3a35c" },
  whale:   { name: "くじら",       st: ["🐟", "🐬", "🐳"], egg: "#d6efff", spot: "#7cc4f5" },
  dino:    { name: "きょうりゅう", st: ["🦕", "🦕", "🦖"], egg: "#dcf5c8", spot: "#7cc96a" },
  chou:    { name: "ちょうちょ",   st: ["🐛", "🐛", "🦋"], egg: "#ffe3f0", spot: "#ff9ecb" },
  dragon:  { name: "ドラゴン",     st: ["🦎", "🐲", "🐉"], egg: "#c9f2e3", spot: "#ffd23f", rare: true },
  unicorn: { name: "ユニコーン",   st: ["🐴", "🐴", "🦄"], egg: "#f3e0ff", spot: "#c89bff", rare: true },
};
const SPECIES_IDS = Object.keys(SPECIES);

/* ---------- 曲（カード）のカタログ ----------
   id は保存データのキーになるので、あとから変えないこと */
const CARD_LIB = {
  aladdin:  { title: "アラジン", icon: "🪔", theme: "night",
    emojis: ["✨", "⭐", "🌟", "💫"], colors: ["#ffd23f", "#ffe9a8", "#b28dff", "#8a5ff0", "#ffffff"], extra: { type: "rain" } },
  neko:     { title: "ねこふんじゃった", icon: "🐱", theme: "pink",
    emojis: ["🐾", "💖", "🎵", "🌸"], colors: ["#ff5c93", "#ffb3cc", "#ffd166", "#9be7ff", "#ffffff"], extra: { type: "steps", char: "🐾", rot: 80 } },
  tulip:    { title: "チューリップ", icon: "🌷", theme: "garden",
    emojis: ["🌷", "🌸", "🦋", "✨"], colors: ["#ff5a5f", "#ffd54d", "#ff9ecb", "#8fd694", "#ffffff"], extra: { type: "rain" } },
  sheep:    { title: "メリーさんのひつじ", icon: "🐑", theme: "meadow",
    emojis: ["🐑", "☁️", "🌼", "🎵"], colors: ["#4aa3df", "#bfe6ff", "#ffd54d", "#ffffff", "#8fd694"], extra: { type: "hop", char: "🐑" } },
  risu:     { title: "やまのおんがくか", icon: "🐿️", theme: "forest",
    emojis: ["🐿️", "🌰", "🍂", "🎻"], colors: ["#e07b24", "#ffc58a", "#8a4b1e", "#8fd694", "#ffffff"], extra: { type: "hop", char: "🐿️" } },
  kitsune:  { title: "こぎつね", icon: "🦊", theme: "dusk",
    emojis: ["🦊", "🍁", "🌸", "✨"], colors: ["#f28c28", "#ff9eaa", "#ffd166", "#b28dff", "#ffffff"], extra: { type: "steps", char: "🐾", rot: 80 } },
  hige:     { title: "ひげじいさん", icon: "👴", theme: "playroom",
    emojis: ["👴", "🎵", "👓", "👋"], colors: ["#2bb3a3", "#ffd166", "#ff8fab", "#7cc4f5", "#ffffff"], extra: { type: "rain" } },
  kirakira: { title: "きらきらぼし", icon: "⭐", theme: "starry",
    emojis: ["⭐", "🌟", "✨", "💫"], colors: ["#ffcf33", "#ffe680", "#9ec5ff", "#ffffff", "#c9a7ff"], extra: { type: "rain" } },
};
const CARDS = CONFIG.songs.map(id => ({ id, ...CARD_LIB[id] }));
const SONG = Object.fromEntries(CARDS.map(c => [c.id, c]));

/* ---------- 小さな道具 ---------- */
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const $ = id => document.getElementById(id);
const wait = ms => new Promise(r => setTimeout(r, ms));   // await wait(500) で「0.5秒まつ」と書ける

/* =========================================================
   データの保存（localStorage）
   ========================================================= */
function loadJSON(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

/* つぎのたまごを決める。レアは出にくく、前回と同じ種類は出さない */
function rollSpecies(prev) {
  const pool = SPECIES_IDS.filter(id => id !== prev);
  const weight = id => (SPECIES[id].rare ? 1 : 3);
  let r = Math.random() * pool.reduce((sum, id) => sum + weight(id), 0);
  for (const id of pool) { r -= weight(id); if (r < 0) return id; }
  return pool[0];
}

/* いまのデータの形（v3）
   { v:3, pos, species, moves:[{from, song}], laps, totals:{曲: 回数}, zukan:{種類: 回数}, lastSong } */
function freshState() {
  return { v: 3, pos: 0, species: rollSpecies(), moves: [], laps: 0, totals: {}, zukan: {}, lastSong: CARDS[0].id };
}

/* 引っ越し（マイグレーション）
   以前は「曲ごと」に別々のデータだった（ページも2つに分かれていた）。
   この子の曲のデータを古い保存場所から全部集めて、1つにまとめる。
   - v1（スタンプカード）：{ stamps:[...], cleared }   → 回数 = cleared×5 + stamps数
   - v2（曲ごとのすごろく）：{ v:2, total, laps, pos, species } → 回数 = total
   盤面の位置とたまごは、いちばん進んでいた曲のものを引き継ぐ */
function migrateFromLegacy() {
  const s = freshState();
  let best = null;
  for (const key of CONFIG.legacyKeys) {
    const old = loadJSON(key);
    if (!old) continue;
    let mine = false;
    for (const c of CARDS) {
      const o = old[c.id];
      if (!o) continue;
      mine = true;
      const n = o.v === 2 ? (o.total || 0) : (o.cleared || 0) * 5 + (o.stamps ? o.stamps.length : 0);
      s.totals[c.id] = (s.totals[c.id] || 0) + n;
      if (o.v === 2) {
        s.laps += o.laps || 0;
        if (!best || o.pos > best.pos) best = o;
      }
    }
    if (mine && old._zukan) {
      for (const [k, v] of Object.entries(old._zukan)) s.zukan[k] = (s.zukan[k] || 0) + v;
    }
  }
  if (best && best.pos < GOAL && SPECIES[best.species]) { s.pos = best.pos; s.species = best.species; }
  return s;
}

let state = loadJSON(STORAGE_KEY);
if (!state || state.v !== 3) state = migrateFromLegacy();
if (state.pos >= GOAL) { state.pos = 0; state.moves = []; state.species = rollSpecies(state.species); }
if (!SONG[state.lastSong]) state.lastSong = CARDS[0].id;
saveState();
navigator.storage?.persist?.();

const totalAll = () => Object.values(state.totals).reduce((a, b) => a + b, 0);
const stageOf = pos => (pos >= STAGE_AT[3] ? 3 : pos >= STAGE_AT[2] ? 2 : pos >= STAGE_AT[1] ? 1 : 0);
/* i番目のマスが 盤面の何行・何列目か（ジグザグ） */
function cellXY(i) {
  const r = Math.floor(i / COLS), k = i % COLS;
  return { r, col: r % 2 === 0 ? k : COLS - 1 - k };
}

/* =========================================================
   画面の骨組みをつくる
   上：名前・たまご・盤面（盤面は残りの高さに合わせて縮む） 下：曲ボタン
   ========================================================= */
document.body.insertAdjacentHTML("afterbegin", `
  ${CARDS.map(c => `<div class="bg bg-${c.theme}" data-id="${c.id}"></div>`).join("")}
  <main class="app" id="app">
    <div class="card">
      <div class="top">
        <div class="titles">
          <div class="sub">ピアノ すごろく</div>
          <h1 id="childTitle">🎹 ${CONFIG.childName || "ピアノ すごろく"}</h1>
          <div class="medals" id="stats"></div>
        </div>
        <button class="round-btn" id="undoBtn" aria-label="ひとつ もどす">↩︎</button>
        <button class="round-btn" id="zukanBtn" aria-label="ずかん">📖</button>
      </div>
      <div class="pet-panel" id="pet"></div>
      <div class="board-wrap"><div class="board" id="board"></div></div>
    </div>
    <div class="songs-label">🎹 ひいた きょくを おしてね</div>
    <div class="songs" id="songs">
      ${CARDS.map(c => `<button class="song ${c.theme}" data-id="${c.id}"><span class="ic">${c.icon}</span><span class="t">${c.title}</span></button>`).join("")}
    </div>
  </main>

  <div class="overlay" id="overlay">
    <div class="panel">
      <div class="medal" id="ovMedal">🏅</div>
      <h2 id="ovTitle">ゴール！</h2>
      <p id="ovText"></p>
      <button class="ov-btn" id="ovBtn">やったね！</button>
    </div>
  </div>

  <div class="overlay" id="zukanOv">
    <div class="panel zukan-panel">
      <h3>📖 なかま ずかん</h3>
      <div class="zukan-grid" id="zukanGrid"></div>
      <button class="menu-btn cancel" id="zukanClose">とじる</button>
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
      <button class="menu-btn" data-act="restart">すごろくを さいしょから</button>
      <button class="menu-btn" data-act="finale" ${CONFIG.recitalDate ? "" : "hidden"}>🎤 はっぴょうかいを みる</button>
      <button class="menu-btn danger" data-act="all">きろくを ぜんぶ消す</button>
      <button class="menu-btn cancel" data-act="cancel">やめる</button>
    </div>
  </div>

  <div class="stage" id="stage">
    <div class="spot s1"></div><div class="spot s2"></div>
    <div class="stage-content">
      <div class="stage-title" id="stageTitle"></div>
      <div class="cert" id="cert"></div>
      <div class="stage-btns">
        <button class="again" id="stageAgain">🎉 もういちど みる</button>
        <button class="close" id="stageClose">とじる</button>
      </div>
    </div>
    <div class="curtain l"></div><div class="curtain r"></div>
    <div class="valance"></div>
    <div class="curtain-label">
      <div class="big">🎹 きょうは<br>はっぴょうかい 🎹</div>
      <div class="tap">タップしてね ✨</div>
    </div>
  </div>

  <canvas id="fx"></canvas>
`);

const appEl = $("app");
const boardEl = $("board");
const bgEls = [...document.querySelectorAll(".bg")];
bgEls.forEach(bg => decorate(bg, SONG[bg.dataset.id].theme));

/* 背景の飾り（テーマごと） */

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
  if (theme === "forest") {
    fallers(bg, ["🍂", "🍁", "🌰"], 10, 0.6);
    bg.insertAdjacentHTML("beforeend",
      `<div class="flowerbed trees">${Array.from({ length: 7 }, (_, i) =>
        `<span style="animation-delay:${-i * 0.5}s">${i % 2 ? "🌳" : "🌲"}</span>`).join("")}</div>`);
  }
  if (theme === "starry") {
    bg.insertAdjacentHTML("beforeend", `<div class="shooting"></div>`);
    for (let i = 0; i < 80; i++) {
      const s = document.createElement("i");
      s.className = "star";
      s.style.cssText = `left:${rand(0, 100)}%;top:${rand(0, 100)}%;--s:${rand(1, 3.5)}px;animation-duration:${rand(1.5, 4)}s;animation-delay:${rand(-5, 0)}s`;
      bg.appendChild(s);
    }
    floaters(bg, ["⭐", "✨"], 8, 0.5);
  }
  if (theme === "playroom") floaters(bg, ["🎵", "🎶", "👓"], 12, 0.35);
  if (theme === "dusk") {
    bg.insertAdjacentHTML("beforeend", `<div class="mountain far"></div><div class="mountain near"></div>`);
    fallers(bg, ["🍁", "🍂"], 9, 0.55);
    for (let i = 0; i < 25; i++) {
      const s = document.createElement("i");
      s.className = "star";
      s.style.cssText = `left:${rand(0, 100)}%;top:${rand(0, 30)}%;--s:${rand(1, 2.5)}px;animation-duration:${rand(2, 5)}s;animation-delay:${rand(-5, 0)}s`;
      bg.appendChild(s);
    }
  }
}
/* 上から下へ、ひらひら落ちてくる飾り（落ち葉） */
function fallers(bg, chars, n, opacity) {
  for (let i = 0; i < n; i++) {
    const p = document.createElement("span");
    p.className = "fall";
    p.textContent = pick(chars);
    const dur = rand(10, 18);
    p.style.cssText = `left:${rand(0, 95)}%;font-size:${rand(18, 34)}px;opacity:${opacity};animation-duration:${dur}s;animation-delay:${-dur * Math.random()}s`;
    bg.appendChild(p);
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

/* =========================================================
   ペット（たまご・なかま）の絵
   ========================================================= */
function eggSVG(sp, cracked) {
  return `<svg class="egg" viewBox="0 0 100 120" aria-hidden="true">
    <path d="M50 6 C78 6 92 52 92 76 C92 100 73 114 50 114 C27 114 8 100 8 76 C8 52 22 6 50 6 Z" fill="${sp.egg}" stroke="${sp.spot}" stroke-width="3"/>
    <circle cx="30" cy="72" r="8" fill="${sp.spot}"/><circle cx="64" cy="52" r="10" fill="${sp.spot}"/>
    <circle cx="60" cy="94" r="7" fill="${sp.spot}"/><circle cx="38" cy="36" r="5" fill="${sp.spot}"/>
    <ellipse cx="34" cy="34" rx="7" ry="13" fill="#fff" opacity=".6" transform="rotate(20 34 34)"/>
    <path class="crack ${cracked ? "on" : ""}" d="M12 66 L25 57 L34 68 L46 55 L56 68 L67 55 L77 66 L89 59" fill="none" stroke="#7a5a3a" stroke-width="3.5" stroke-linejoin="round"/>
    ${sp.rare ? `<path d="M84 18 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z" fill="#ffd23f"/><path d="M14 40 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="#ffd23f"/>` : ""}
  </svg>`;
}
/* stage 0=たまご 1=あかちゃん 2=こども 3=おとな（王冠つき） */
function petHTML(speciesId, stage, pos = 0) {
  const sp = SPECIES[speciesId];
  if (stage === 0) return `<span class="pet st0 ${pos >= 3 ? "wobble" : ""}">${eggSVG(sp, pos >= 3)}</span>`;
  return `<span class="pet st${stage}">${sp.st[stage - 1]}${stage === 3 ? `<i class="crown">👑</i>` : ""}</span>`;
}

/* =========================================================
   見た目をつくる
   「データが正、画面はその写し」：state を見て毎回つくり直す。
   pos/stage を渡すと「アニメ中に見せたい位置・姿」で描ける
   ========================================================= */
/* 押した曲のテーマ（色・背景）に切り替える */
function setTheme(c) {
  appEl.className = `app ${c.theme}`;
  bgEls.forEach(b => b.classList.toggle("on", b.dataset.id === c.id));
  document.querySelectorAll(".song").forEach(b => b.classList.toggle("last", b.dataset.id === c.id));
}

function render({ pos, stage, pop = false } = {}) {
  pos ??= state.pos;
  stage ??= stageOf(pos);
  const sp = SPECIES[state.species];

  // --- 盤面 ---
  let squares = "";
  for (let i = 0; i <= GOAL; i++) {
    const { r, col } = cellXY(i);
    const kind = i === 0 ? "start" : i === GOAL ? "goal" : (EVENTS[i] || "plain");
    const label = i === 0 ? "スタート" : i === GOAL ? "🏰" : EVENT_ICON[kind] || i;
    squares += `<div class="sq ${kind} ${i <= pos ? "visited" : ""} ${pop ? "pop" : ""}" data-i="${i}"
      style="grid-row:${r + 1};grid-column:${col + 1};--i:${i}"><span>${label}</span></div>`;
  }
  const pts = Array.from({ length: GOAL + 1 }, (_, i) => {
    const { r, col } = cellXY(i);
    return `${col * 100 + 50},${r * 100 + 50}`;
  }).join(" ");
  boardEl.innerHTML = `
    <svg class="path" viewBox="0 0 400 400" preserveAspectRatio="none"><polyline points="${pts}"/></svg>
    ${squares}
    <div class="token">${petHTML(state.species, stage, pos)}</div>
    <div class="toast"></div>`;
  placeToken(pos, false);

  // --- ペットの様子 ---
  const name = stage === 0 ? (pos >= 3 ? "なにか うごいてる…！" : "なぞの たまご")
    : stage === 1 ? `${sp.name}の あかちゃん`
    : stage === 2 ? `${sp.name}` : `${sp.name}（おとな）`;
  const hint = stage === 0 ? `うまれるまで あと ${STAGE_AT[1] - pos}マス`
    : stage === 1 ? `おおきく なるまで あと ${STAGE_AT[2] - pos}マス`
    : stage === 2 ? `おとなまで あと ${GOAL - pos}マス` : "なかまに なったよ！";
  $("pet").innerHTML = `
    <div class="pet-big">${petHTML(state.species, stage, pos)}</div>
    <div class="pet-info">
      <div class="pet-name">${sp.rare && stage > 0 ? "✨" : ""}${name}</div>
      <div class="gbar"><i style="width:${(pos / GOAL) * 100}%"></i>
        <b style="left:${(STAGE_AT[1] / GOAL) * 100}%">🐣</b><b style="left:${(STAGE_AT[2] / GOAL) * 100}%">⬆️</b><b style="left:100%">👑</b></div>
      <div class="pet-hint">${hint}<span class="to-goal"> ・ 🏰まで ${Math.max(0, GOAL - pos)}マス</span></div>
    </div>`;

  $("stats").textContent = `🏁 ゴール ${state.laps}かい ・ 🎹 ぜんぶで ${totalAll()}かい`;
  $("undoBtn").classList.toggle("hidden", state.moves.length === 0);
}

/* コマ（ペット）を pos のマスへ置く。jump=true なら ぴょんと跳ねる */
function placeToken(pos, jump) {
  const t = boardEl.querySelector(".token");
  const { r, col } = cellXY(Math.min(pos, GOAL));
  t.style.left = `${(col / COLS) * 100}%`;
  t.style.top = `${(r / COLS) * 100}%`;
  if (jump) { t.classList.remove("hop"); void t.offsetWidth; t.classList.add("hop"); }
  boardEl.querySelectorAll(".sq").forEach(sq => sq.classList.toggle("visited", Number(sq.dataset.i) <= pos));
}

/* =========================================================
   曲ボタンを押したとき
   1) サイコロ → 2) コマが進む → 3) マスのイベント → 4) 育つ → 5) ゴール
   ========================================================= */
let busy = false;   // 演出中の連打を防ぐ

document.querySelectorAll(".song").forEach(b => b.addEventListener("click", () => onPlay(SONG[b.dataset.id])));

async function onPlay(c) {
  if (busy) return;
  busy = true;
  disarmUndo();
  setTheme(c);

  // --- 先に結果を全部決めて保存する（途中でアプリを閉じても記録が消えない）---
  const roll = 1 + Math.floor(Math.random() * DICE_MAX);
  const from = state.pos;
  const to = Math.min(GOAL, from + roll);
  const event = to < GOAL ? EVENTS[to] : null;
  const final = event === "warp" ? Math.min(GOAL, to + 2) : to;
  state.totals[c.id] = (state.totals[c.id] || 0) + 1;
  state.lastSong = c.id;
  state.pos = final;
  state.moves.push({ from, song: c.id });
  const reachedGoal = final >= GOAL;
  if (reachedGoal) {
    state.laps++;
    state.zukan[state.species] = (state.zukan[state.species] || 0) + 1;
  }
  saveState();

  // --- ここから演出 ---
  const stage0 = stageOf(from);
  render({ pos: from });
  await rollDice(c, roll);
  await walk(c, from, to, stage0);
  if (event) await doEvent(c, event, to, final, stage0);
  const stage1 = stageOf(final);
  if (stage1 > stage0) await growShow(c, stage0, stage1);
  render();
  if (reachedGoal) {
    await goalShow(c);
    newEgg();
  }
  busy = false;
}

/* --- 1) サイコロ --- */
function rollDice(c, roll) {
  return new Promise(resolve => {
    openShow(c, "dice", "サイコロ ころころ…");
    const die = document.createElement("div");
    die.className = "die rolling";
    die.innerHTML = Array.from({ length: 9 }, (_, k) => `<i class="pip p${k + 1}"></i>`).join("");
    die.dataset.f = 1;
    showFly.appendChild(die);
    sfx.whoosh();

    // 0.07秒ごとに目を変えて「ころころ」感を出す
    const spin = setInterval(() => { die.dataset.f = 1 + Math.floor(Math.random() * DICE_MAX); sfx.tick(); }, 70);
    setTimeout(() => {
      clearInterval(spin);
      die.dataset.f = roll;
      die.classList.remove("rolling");
      die.classList.add("landed");
      $("showPraise").textContent = `${roll}マス すすむ！`;
      showEl.classList.add("rolled");
      burstAt(showFly, c, 35, 9);
      sfx.count(roll);
    }, 1150);
    setTimeout(() => closeShow(resolve), 2300);
  });
}

/* --- 2) コマを1マスずつ進める --- */
async function walk(c, from, to, stage) {
  for (let p = from + 1; p <= to; p++) {
    placeToken(p, true);
    sfx.step(p);
    await wait(340);
  }
  const sq = boardEl.querySelector(`[data-i="${Math.min(to, GOAL)}"]`);
  burstAt(sq, c, 10, 3);
  await wait(150);
}

/* --- 3) マスのイベント --- */
async function doEvent(c, event, at, final, stage) {
  const sq = boardEl.querySelector(`[data-i="${at}"]`);
  if (event === "star") {
    toast(c, "⭐ キラキラ ボーナス！");
    const r = boardEl.getBoundingClientRect();
    for (let k = 0; k < 3; k++) {
      setTimeout(() => { fx.firework(rand(r.left + 30, r.right - 30), rand(r.top - 40, r.top + r.height / 2), c); sfx.sparkle(); }, k * 300);
    }
    await wait(1700);
  }
  if (event === "treat") {
    const t = pick(TREATS);
    toast(c, `🎁 おやつ ${t} ゲット！<br><small>もぐもぐ… おいしい！</small>`);
    const tok = boardEl.querySelector(".token");
    tok.classList.add("munch");
    [0, 250, 500].forEach(ms => setTimeout(() => sfx.step(ms), ms + 300));
    burstAt(sq, { emojis: [t, "💖"], colors: c.colors }, 14, 5);
    await wait(1700);
    tok.classList.remove("munch");
  }
  if (event === "warp") {
    toast(c, "🌀 ワープ！ 2マス すすむ");
    sfx.whoosh();
    await wait(800);
    await walk(c, at, final, stage);
  }
  hideToast();
}
function toast(c, html) {
  const t = boardEl.querySelector(".toast");
  t.innerHTML = html;
  t.classList.remove("show"); void t.offsetWidth; t.classList.add("show");
}
function hideToast() { boardEl.querySelector(".toast").classList.remove("show"); }

/* --- 4) 育つ演出（うまれる／おおきくなる／おとなになる）--- */
function growShow(c, from, to) {
  return new Promise(resolve => {
    const sp = SPECIES[state.species];
    const title = to === 1 ? "あれれ…？ たまごが…" : to === 2 ? "ぐんぐん…！" : "わあ…！ ひかってる！";
    openShow(c, "grow", title);
    const holder = document.createElement("div");
    holder.className = "grow-pet";
    holder.innerHTML = to === 1 ? petHTML(state.species, 0, 4) : petHTML(state.species, from);
    showFly.appendChild(holder);

    const reveal = to === 1 ? 2000 : 1500;
    if (to === 1) {
      holder.classList.add("shaking");
      [300, 750, 1200].forEach(ms => setTimeout(() => sfx.rattle(), ms));
      setTimeout(() => { holder.querySelector(".crack")?.classList.add("on"); sfx.pop(); }, 1500);
    } else {
      holder.classList.add("glowing");
      [0, 400, 800, 1100].forEach(ms => setTimeout(() => sfx.sparkle(), ms));
    }
    setTimeout(() => {
      holder.className = "grow-pet born";
      holder.innerHTML = petHTML(state.species, to);
      $("showCount").textContent = to === 1 ? `${sp.rare ? "★レア★ " : ""}${sp.name}の あかちゃん！` : sp.name;
      $("showPraise").textContent = to === 1 ? "うまれた！" : to === 2 ? "おおきく なった！" : "おとなに なった！";
      showEl.classList.add("rolled");
      burstAt(showFly, c, 70, 13);
      if (to === 3) { sfx.fanfare(); fx.rain(c, 120); } else sfx.jingle(to);
      if (sp.rare) setTimeout(() => fx.firework(innerWidth / 2, innerHeight * 0.3, c), 300);
    }, reveal);
    setTimeout(() => closeShow(resolve), reveal + 2300);
  });
}

/* --- 5) ゴール！ --- */
function goalShow(c) {
  return new Promise(resolve => {
    const sp = SPECIES[state.species];
    overlay.dataset.theme = c.theme;
    $("ovMedal").textContent = sp.st[2];
    $("ovTitle").textContent = "ゴール！";
    $("ovText").innerHTML = `${sp.name}が なかまに なったよ！<br>📖 ずかんに とうろく されました<br>ゴール ${state.laps}かいめ 🎉<br><small>つぎの たまごが とどくよ 🥚</small>`;
    overlay.classList.add("show");
    if (c.extra.type === "steps") walkSteps(c.extra);
    if (c.extra.type === "hop") hopAcross(c.extra);
    fx.rain(c);
    overlay.onDone = resolve;
  });
}

/* --- あたらしいたまご --- */
function newEgg() {
  state.species = rollSpecies(state.species);
  state.pos = 0;
  state.moves = [];
  saveState();
  render({ pop: true });
  sfx.arpeggio();
}

/* 「もどす」は2回タップで実行（子どもの誤タップ対策） */
let undoArmed = false, undoTimer = null;
$("undoBtn").addEventListener("click", () => {
  if (busy || !state.moves.length) return;
  if (!undoArmed) {
    undoArmed = true;
    $("undoBtn").classList.add("armed");
    toast(null, "↩︎ もういちど おすと<br>ひとつ もどります");
    undoTimer = setTimeout(() => { disarmUndo(); hideToast(); }, 3000);
    return;
  }
  disarmUndo();
  const m = state.moves.pop();
  state.pos = m.from;
  state.totals[m.song] = Math.max(0, (state.totals[m.song] || 0) - 1);
  saveState();
  render();
});
function disarmUndo() {
  undoArmed = false;
  clearTimeout(undoTimer);
  $("undoBtn").classList.remove("armed");
}

/* =========================================================
   全画面の演出レイヤー（サイコロ・育つ演出で共用）
   ========================================================= */
const showEl = $("show");
const showFly = $("showFly");
let showCard = null;

function openShow(c, kind, title) {
  showCard = c;
  showEl.className = `show-layer ${c.theme} v-${kind}`;
  showFly.innerHTML = "";
  $("showCount").textContent = title;
  $("showPraise").textContent = "";
  void showEl.offsetWidth;           // リフローさせてからクラスを付けると、毎回アニメが最初から再生される
  showEl.classList.add("show");
}
function closeShow(resolve) {
  showEl.classList.add("leaving");
  setTimeout(() => {
    showEl.className = "show-layer";
    showFly.innerHTML = "";
    resolve();
  }, 350);
}
function centerOf(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width };
}
function burstAt(el, c, count, power) {
  const p = centerOf(el);
  fx.burst(p.x, p.y, c, count, power);
}

/* ゴールのときの おまけ演出 */
function walkSteps({ char, rot }) {
  for (let k = 0; k < 9; k++) {
    setTimeout(() => {
      const p = document.createElement("span");
      p.className = "walk-paw";
      p.textContent = char;
      const x = 10 + (k / 8) * (innerWidth - 60);
      const y = innerHeight * 0.86 + (k % 2 ? -18 : 18);
      p.style.cssText = `left:${x}px;top:${y}px;--rot:${rot + rand(-10, 10)}deg;z-index:21`;
      document.body.appendChild(p);
      sfx.step(k);
      setTimeout(() => p.remove(), 1500);
    }, 300 + k * 260);
  }
}
function hopAcross({ char }) {
  const el = document.createElement("span");
  el.className = "hopper";
  el.innerHTML = `<span>${char}</span>`;
  el.style.cssText = `top:${innerHeight * 0.82}px;position:fixed;z-index:21`;
  document.body.appendChild(el);
  const anim = el.animate(
    [{ transform: `translateX(${innerWidth + 20}px)` }, { transform: "translateX(-90px)" }],
    { duration: 2640, delay: 300, easing: "linear", fill: "both" });
  anim.onfinish = () => el.remove();
  for (let k = 0; k < 8; k++) setTimeout(() => sfx.boing(k), 300 + k * 330);
}

/* 演出中に画面をタップすると、そこでキラキラ＋音 */
showEl.addEventListener("pointerdown", e => {
  if (!showEl.classList.contains("show") || showEl.classList.contains("leaving")) return;
  fx.burst(e.clientX, e.clientY, showCard, 14, 6);
  sfx.sparkle();
});

/* =========================================================
   ずかん
   ========================================================= */
const zukanOv = $("zukanOv");
$("zukanBtn").addEventListener("click", () => {
  if (busy) return;
  const z = state.zukan;
  const got = SPECIES_IDS.filter(id => z[id]).length;
  $("zukanGrid").innerHTML = `<p class="zukan-count">${got} / ${SPECIES_IDS.length} しゅるい</p>` +
    SPECIES_IDS.map(id => {
      const sp = SPECIES[id], n = z[id] || 0;
      return `<div class="zk ${n ? "got" : "none"} ${sp.rare ? "rare" : ""}">
        <span class="zk-pet">${sp.st[2]}</span>
        <span class="zk-name">${n ? sp.name : "？？？"}</span>
        ${n ? `<span class="zk-n">×${n}</span>` : ""}${sp.rare ? `<span class="zk-rare">レア</span>` : ""}
      </div>`;
    }).join("");
  zukanOv.dataset.theme = SONG[state.lastSong].theme;
  zukanOv.classList.add("show");
});
$("zukanClose").addEventListener("click", () => zukanOv.classList.remove("show"));
zukanOv.addEventListener("click", e => { if (e.target === zukanOv) zukanOv.classList.remove("show"); });

/* =========================================================
   ゴール画面（おめでとう）
   ========================================================= */
const overlay = $("overlay");
$("ovBtn").addEventListener("click", () => {
  overlay.classList.remove("show");
  sfx.arpeggio();
  overlay.onDone?.();
  overlay.onDone = null;
});

/* =========================================================
   おとなメニュー：名前を2秒長押しで開く（子どもが偶然開かないように）
   ========================================================= */
const menuOv = $("menuOv");
(() => {
  const h1 = $("childTitle");
  let timer = null;
  h1.addEventListener("pointerdown", () => {
    h1.classList.add("holding");
    timer = setTimeout(() => { h1.classList.remove("holding"); openMenu(); }, 2000);
  });
  const stop = () => { clearTimeout(timer); h1.classList.remove("holding"); };
  ["pointerup", "pointerleave", "pointercancel"].forEach(ev => h1.addEventListener(ev, stop));
})();

function openMenu() {
  if (busy) return;
  menuOv.dataset.theme = SONG[state.lastSong].theme;
  $("menuText").innerHTML = `いま：${state.pos}マスめ ／ ゴール ${state.laps}かい<br>
    <small>${CARDS.map(c => `${c.icon}${state.totals[c.id] || 0}`).join("　")}<br>（ずかんは消えません）</small>`;
  menuOv.classList.add("show");
}

menuOv.addEventListener("click", e => {
  const act = e.target.dataset?.act;
  if (!act && e.target !== menuOv) return;   // パネルの余白タップは無視、背景タップは閉じる
  menuOv.classList.remove("show");
  if (act === "restart") { state.pos = 0; state.moves = []; }
  if (act === "all") { state.pos = 0; state.moves = []; state.totals = {}; state.laps = 0; state.species = rollSpecies(state.species); }
  if (act === "restart" || act === "all") { saveState(); render({ pop: true }); }
  if (act === "finale") { openStage(); runFinale(); }
});

/* iOSで :active（押し込みの見た目）を効かせるおまじない */
document.addEventListener("touchstart", () => {}, { passive: true });

/* 最初の表示 */
setTheme(SONG[state.lastSong]);
render();

/* =========================================================
   はっぴょうかい（発表会の日のスペシャル演出）
   幕が閉じた状態で表示 → タップで開幕（タップが音を鳴らすきっかけになる）
   ========================================================= */
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function finaleOn() { return !!CONFIG.recitalDate && todayStr() >= CONFIG.recitalDate; }

const stage = $("stage");
let stageTimers = [];
const FINALE_FX = { emojis: ["🎉", "⭐", "🎵", "💖", "🌟", "🎶"],
  colors: ["#ffd23f", "#ff5c93", "#7cc4f5", "#8fd694", "#b28dff", "#ffffff", "#ff7b54"] };

function openStage() {
  stageTimers.forEach(clearTimeout); stageTimers = [];
  const name = CONFIG.childName ? `${CONFIG.childName} ちゃん` : "がんばりやさん";
  const d = new Date();
  let total = 0;
  const rows = CARDS.map(c => {
    const n = state.totals[c.id] || 0;
    total += n;
    return `<div class="cert-row"><span>${c.icon} ${c.title}</span><span><b data-n="${n}">0</b> かい</span></div>`;
  }).join("");

  // 1文字ずつ span にして、順番に跳ねて出てくるようにする
  $("stageTitle").innerHTML = [..."はっぴょうかい", "\n", ..."おめでとう！"].map((ch, k) =>
    ch === "\n" ? "<br>" : `<span style="--k:${k}">${ch}</span>`).join("");

  $("cert").innerHTML = `
    <div class="cert-head">しょうじょう</div>
    <div class="cert-award">🏆 がんばったで賞</div><br>
    <div class="cert-name">${name}</div>
    <div class="cert-body">まいにち ピアノの れんしゅうを<br>よく がんばりました。<br>はっぴょうかい おめでとう！</div>
    <div class="cert-stats">${rows}</div>
    <div class="cert-total">ぜんぶで <b data-n="${total}">0</b> かい れんしゅう したよ</div>
    <div class="cert-date">${d.getFullYear()}ねん ${d.getMonth() + 1}がつ ${d.getDate()}にち</div>
    <div class="cert-seal">🏅</div>`;

  stage.className = "stage show";
  state._finaleShown = todayStr();
  saveState();
}

function runFinale() {
  if (stage.classList.contains("rolling") || stage.classList.contains("open")) return;
  const at = (ms, fn) => stageTimers.push(setTimeout(fn, ms));
  const W = innerWidth, H = innerHeight;

  // 1) ドラムロールで幕がふるえる
  stage.classList.add("rolling", "lit");
  sfx.drumroll(1.6);

  // 2) シンバル！ 幕が開いて、花火・拍手・ファンファーレ
  at(1600, () => {
    stage.classList.remove("rolling");
    stage.classList.add("open");
    sfx.cymbal();
    sfx.grandFanfare();
    sfx.applause(5);
  });
  for (let k = 0; k < 16; k++) {
    at(1800 + k * 380, () => {
      fx.firework(rand(0.15, 0.85) * W, rand(0.1, 0.38) * H, FINALE_FX);
      if (k % 3 === 0) sfx.pop();
    });
  }
  at(1900, () => fx.rain(FINALE_FX, 220));

  // 3) 賞状がくるっと登場 → 数字がカウントアップ
  at(3400, () => { stage.classList.add("cert-in"); sfx.whoosh(); });
  at(4200, () => countUp(1300));

  // 4) メダルの判子をドンッ
  at(5700, () => {
    stage.classList.add("sealed");
    at(380, () => {
      sfx.boom();
      const r = stage.querySelector(".cert-seal").getBoundingClientRect();
      fx.burst(r.left + r.width / 2, r.top + r.height / 2, FINALE_FX, 60, 12);
    });
  });
  at(6400, () => { stage.classList.add("done"); fx.rain(FINALE_FX, 120); });
}

function countUp(dur) {
  const nums = [...stage.querySelectorAll("[data-n]")];
  const t0 = performance.now();
  let lastTick = 0;
  (function step(now) {
    const k = Math.min(1, (now - t0) / dur);
    const e = 1 - Math.pow(1 - k, 3);          // 最後にゆっくりになる（ease-out）
    nums.forEach(b => { b.textContent = Math.round(Number(b.dataset.n) * e); });
    if (now - lastTick > 70 && k < 1) { sfx.tick(); lastTick = now; }
    if (k < 1) requestAnimationFrame(step);
    else sfx.arpeggio();
  })(t0);
}

stage.addEventListener("click", e => {
  if (e.target.closest(".stage-btns")) return;
  runFinale();
});
$("stageAgain").addEventListener("click", () => { openStage(); setTimeout(runFinale, 50); });
$("stageClose").addEventListener("click", () => {
  stageTimers.forEach(clearTimeout); stageTimers = [];
  stage.className = "stage";
});

// 発表会の当日、最初に開いたときは自動で幕を表示する（1日1回）
if (CONFIG.recitalDate && todayStr() === CONFIG.recitalDate && state._finaleShown !== todayStr()) {
  requestAnimationFrame(openStage);
}

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

  // 打ち上げ花火：下から玉が上がって、上でパッと開く
  function firework(x, y, c) {
    const g = 0.18;
    parts.push({ kind: "rocket", x, y: H + 10, vx: rand(-0.6, 0.6), vy: -Math.sqrt(2 * g * (H + 10 - y)),
      g, drag: 1, ty: y, life: 0, max: 400, color: pick(c.colors), c, size: 3 });
    start();
  }
  function explode(p) {
    const n = 70, base = rand(3.5, 6);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, sp = base * rand(0.85, 1.05);
      parts.push({ kind: "dot", x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        g: 0.06, drag: 0.965, life: 0, max: rand(60, 90), color: Math.random() < 0.8 ? p.color : "#ffffff",
        size: rand(2, 3.4), rot: 0, vr: 0, sway: 0, swayAmp: 0 });
    }
    for (let i = 0; i < 8; i++) parts.push(make(p.x, p.y, rand(-4, 4), rand(-4, 2), p.c, { emojiRate: 1, g: 0.08 }));
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
    parts = parts.filter(p => p.life < p.max && (p.y < H + 60 || p.kind === "rocket"));
    const spawned = [];
    const all = parts;
    parts = spawned;                 // 爆発で増える粒は spawned に入り、最後に合流させる
    for (const p of all) {
      if (p.kind === "rocket") {
        p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life += dt;
        if (p.vy >= -1 || p.y <= p.ty) { p.life = p.max; explode(p); continue; }
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = p.color; ctx.lineWidth = 3; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 4, p.y - p.vy * 4); ctx.stroke();
        ctx.restore();
        continue;
      }
      if (p.kind === "dot") {
        p.vx *= Math.pow(p.drag, dt); p.vy = p.vy * Math.pow(p.drag, dt) + p.g * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.life += dt;
        const t = p.life / p.max;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";   // 重なると明るくなる＝光っぽく見える
        ctx.globalAlpha = Math.max(0, 1 - t) * (Math.random() < 0.15 && t > 0.5 ? 0.3 : 1);   // 終わりぎわにチカチカ
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        continue;
      }
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
    parts = all.concat(spawned);
    if (parts.length) requestAnimationFrame(tick);
    else { running = false; ctx.clearRect(0, 0, W, H); }
  }

  return { burst, rain, firework };
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
    tick() { tone(1800, ctx().currentTime, 0.04, "square", 0.025); },
    count(n) {                                                                // サイコロの目の数だけ ドレミ
      const t = ctx().currentTime;
      for (let k = 0; k < n; k++) piano(SCALE[k * 2 % SCALE.length] * (k === n - 1 ? 2 : 1), t + k * 0.12, k === n - 1 ? 0.9 : 0.3);
    },        // カウントアップのカチカチ
    drumroll(dur) {                                                           // ドロロロロ…（だんだん大きく）
      const t = ctx().currentTime;
      for (let x = 0; x < dur; x += 0.045) noise(t + x, 0.06, 0.05 + 0.3 * (x / dur), 900);
    },
    cymbal() { const t = ctx().currentTime; noise(t, 1.8, 0.28, 5000, "highpass"); sweep(160, 50, t, 0.5, 0.5); },
    applause(dur) {                                                           // 拍手：短いノイズをたくさんランダムに
      const t = ctx().currentTime;
      for (let i = 0; i < dur * 45; i++) {
        const off = rand(0, dur);
        noise(t + off, 0.035, rand(0.03, 0.09) * (1 - 0.6 * off / dur), rand(1200, 2600), "bandpass");
      }
    },
    grandFanfare() {                                                          // 発表会用のオリジナルファンファーレ
      const t = ctx().currentTime + 0.05;
      const mel = [[0, 523.25, .2], [.15, 659.25, .2], [.3, 783.99, .2], [.45, 1046.5, .6],
                   [.9, 987.77, .2], [1.05, 1046.5, .2], [1.2, 1174.66, .2], [1.35, 1318.5, .9],
                   [2.0, 1174.66, .2], [2.15, 1318.5, .2], [2.3, 1567.98, 2.2]];
      mel.forEach(([o, f, d]) => piano(f, t + o, d));
      [[0, [130.81, 196]], [.9, [174.61, 261.63]], [1.35, [196, 293.66]], [2.3, [130.81, 261.63, 329.63, 392]]]
        .forEach(([o, fs]) => fs.forEach(f => piano(f, t + o, o === 2.3 ? 2.6 : 0.9)));
    },
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
