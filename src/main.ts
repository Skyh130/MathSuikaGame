import './style.css';
import { QUESTS, type Quest } from './content/quests';
import { getWorld, SPRITE_COUNT, WORLDS, type WorldDef } from './content/worlds';
import { assetUrl, loadAssets } from './game/assets';
import { CH, CW } from './game/config';
import { Game, type Piece } from './game/Game';
import { loadSave, writeSave, type HintLevel, type PowerUp } from './state/storage';
import { showQuest } from './ui/quest';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const save = loadSave();
let world: WorldDef = getWorld(save.world);
const assets = await loadAssets(SPRITE_COUNT);

// ───────── 캔버스 ─────────
const board = $<HTMLCanvasElement>('board');
const ctx = board.getContext('2d')!;
function fitCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const rect = board.getBoundingClientRect();
  const scale = (rect.width / CW) * dpr;
  board.width = Math.round(rect.width * dpr);
  board.height = Math.round((rect.width * CH * dpr) / CW);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
}
new ResizeObserver(fitCanvas).observe(board);

// ───────── HUD ─────────
const scoreEl = $('score');
const bestEl = $('best');
const nextCanvas = $<HTMLCanvasElement>('next');
const nextCtx = nextCanvas.getContext('2d')!;
const toastEl = $('toast');
const overlay = $('overlay');
const updateBest = () => (bestEl.textContent = String(save.bests[world.id] ?? 0));
updateBest();

let toastTimer = 0;
function toast(msg: string) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 2600);
}

const ladderEl = $('ladder');
function renderLadder() {
  const n = world.ladder.length;
  ladderEl.innerHTML = world.ladder
    .map((v, i) => {
      const size = Math.round(16 + (i / (n - 1)) * 18);
      return `<span class="step" data-i="${i}"><img class="dot" style="--sz:${size}px" src="${assetUrl(
        `fruits/${world.sprites[i]}.png`,
      )}" alt="" /><span class="lbl">${world.format(v)}</span></span>`;
    })
    .join('');
}
renderLadder();
document.body.dataset.world = world.id;

function chooseWorld(id: string) {
  world = getWorld(id);
  save.world = world.id;
  game.setWorld(world);
  document.body.dataset.world = world.id;
  renderLadder();
  updateBest();
  writeSave(save);
}

function updatePowerups(c: Record<PowerUp, number>) {
  for (const k of Object.keys(c) as PowerUp[]) {
    $(`pu-${k}`).textContent = String(c[k]);
    $(`pu-${k}`).parentElement!.classList.toggle('zero', c[k] === 0);
  }
  save.powerups = { ...c };
  writeSave(save);
}

// ───────── 게임 ─────────
let questing = false;
const game: Game = new Game(
  ctx,
  world,
  { hint: save.settings.hint },
  {
    onScore: (s) => (scoreEl.textContent = String(s)),
    onNext: (p: Piece) => game.drawPreview(nextCtx, p, nextCanvas.width),
    onMaxTier: (t) =>
      ladderEl.querySelectorAll('.step').forEach((el, i) => el.classList.toggle('on', i <= t)),
    onQuest: () => void runQuest(),
    onOver: (s) => gameOver(s),
    onToast: toast,
    onPowerups: updatePowerups,
    onBombMode: (on) => $('btn-bomb').classList.toggle('armed', on),
  },
  assets,
  save.powerups,
);
updatePowerups(game.powerups);

const recentQuests: string[] = [];

function pickQuest(): Quest {
  const all = QUESTS.filter((q) => q.grade <= save.settings.maxGrade);
  // 최근에 낸 문제는 잠시 빼고 (문제 수가 모자라면 전체 사용)
  const fresh = all.filter((q) => !recentQuests.includes(q.id));
  const pool = fresh.length >= 3 ? fresh : all;
  const inWorld = (q: Quest) => (world.topics.includes(q.topic) ? 3 : 1);
  // 덜 본 주제와 틀렸던 주제를 우선 (간단한 가중치)
  const weight = (q: Quest) => {
    const st = save.stats[q.topic];
    if (!st) return 3 * inWorld(q);
    return (1 + Math.max(0, st.seen - st.correct) * 1.5 + (st.hints > st.seen ? 0.5 : 0)) * inWorld(q);
  };
  const total = pool.reduce((a, q) => a + weight(q), 0);
  let r = Math.random() * total;
  let chosen = pool[0];
  for (const q of pool) {
    if ((r -= weight(q)) <= 0) {
      chosen = q;
      break;
    }
  }
  recentQuests.push(chosen.id);
  if (recentQuests.length > 8) recentQuests.shift();
  return chosen;
}

async function runQuest() {
  if (questing) return;
  questing = true;
  game.pause();
  const quest = pickQuest();
  const res = await showQuest(overlay, quest);
  const st = (save.stats[quest.topic] ??= { seen: 0, correct: 0, hints: 0 });
  st.seen++;
  st.hints += res.hintsUsed;
  if (res.solved) {
    st.correct++;
    const r = Math.random();
    const kind: PowerUp = r < 0.4 ? 'hint' : r < 0.6 ? 'bomb' : r < 0.8 ? 'shake' : 'undo';
    game.addPowerup(kind);
    const names = { hint: '🔍 힌트', bomb: '💣 폭탄', shake: '🌀 흔들기', undo: '⏪ 되돌리기' };
    toast(`${names[kind]} 아이템을 얻었어요!`);
  }
  writeSave(save);
  questing = false;
  game.resume();
}

function gameOver(score: number) {
  const isBest = score > (save.bests[world.id] ?? 0);
  if (isBest) {
    save.bests[world.id] = score;
    updateBest();
  }
  writeSave(save);
  overlay.classList.remove('hidden');
  overlay.innerHTML = `<div class="card">
    <img class="fox" src="${assetUrl(isBest ? 'fox/cheer.png' : 'fox/think.png')}" alt="" />
    <h2>${isBest ? '최고 기록이에요!' : '아쉽다, 한 번 더!'}</h2>
    <p>점수 <b>${score}</b></p>
    <button class="btn" id="again">다시 하기</button>
    <button class="btn alt" id="home">처음으로</button></div>`;
  $('again').onclick = () => {
    overlay.classList.add('hidden');
    game.start();
  };
  $('home').onclick = showStart;
}

function showSettings(back: () => void) {
  const s = save.settings;
  overlay.classList.remove('hidden');
  overlay.innerHTML = `<div class="card">
    <h2>⚙️ 설정</h2>
    <div class="row"><span>과일 힌트</span>
      <select id="set-hint">
        <option value="easy">쉬움 (색으로 단계 알려줌)</option>
        <option value="normal">보통 (색 힌트 없음)</option>
        <option value="hard">어려움 (긴 식)</option>
      </select></div>
    <div class="row"><span>퀘스트 학년</span>
      <select id="set-grade">
        <option value="2">2학년까지</option><option value="3">3학년까지</option><option value="4">4학년까지</option>
      </select></div>
    <button class="btn" id="set-ok">확인</button></div>`;
  ($('set-hint') as HTMLSelectElement).value = s.hint;
  ($('set-grade') as HTMLSelectElement).value = String(s.maxGrade);
  $('set-ok').onclick = () => {
    s.hint = ($('set-hint') as HTMLSelectElement).value as HintLevel;
    s.maxGrade = Number(($('set-grade') as HTMLSelectElement).value) as 2 | 3 | 4;
    game.setSettings({ hint: s.hint });
    writeSave(save);
    back();
  };
}

function showStart() {
  overlay.classList.remove('hidden');
  const card = (w: WorldDef) => `<button class="world${w.id === world.id ? ' sel' : ''}" data-id="${w.id}">
      <span class="we">${w.emoji}</span><b>${w.name}</b><small>${w.grades}</small>
      <i>${save.bests[w.id] ? `🏆 ${save.bests[w.id]}` : '&nbsp;'}</i></button>`;
  overlay.innerHTML = `<div class="card">
    <img class="logo" src="${assetUrl('ui/logo.png')}" alt="Math Suika Game" />
    <p class="sub">값이 같은 과일끼리 닿으면 한 단계 커져요!</p>
    <div class="worlds">${WORLDS.map(card).join('')}</div>
    <p class="sub blurb" id="blurb">${world.emoji} ${world.blurb}</p>
    <button class="btn" id="go">시작하기</button>
    <button class="btn alt" id="cfg">설정</button></div>`;
  overlay.querySelectorAll<HTMLButtonElement>('.world').forEach((b) => {
    b.onclick = () => {
      chooseWorld(b.dataset.id!);
      overlay.querySelectorAll('.world').forEach((x) => x.classList.toggle('sel', x === b));
      $('blurb').textContent = `${world.emoji} ${world.blurb}`;
    };
  });
  $('go').onclick = () => {
    overlay.classList.add('hidden');
    game.start();
  };
  $('cfg').onclick = () => showSettings(showStart);
}

// ───────── 입력 ─────────
const toLogical = (e: PointerEvent) => {
  const r = board.getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * CW, y: ((e.clientY - r.top) / r.height) * CH };
};
board.addEventListener('pointerdown', (e) => {
  board.setPointerCapture(e.pointerId);
  game.setAim(toLogical(e).x);
});
board.addEventListener('pointermove', (e) => game.setAim(toLogical(e).x));
board.addEventListener('pointerup', (e) => {
  const p = toLogical(e);
  game.release(p.x, p.y);
});
document.querySelectorAll<HTMLButtonElement>('.powerups button').forEach((b) => {
  b.addEventListener('click', () => {
    const kind = b.dataset.pu as PowerUp;
    game.usePowerup(kind);
  });
});
$('btn-settings').onclick = () => {
  if (game.state === 'playing') {
    game.pause();
    showSettings(() => {
      overlay.classList.add('hidden');
      game.resume();
    });
  } else if (game.state === 'ready') showSettings(showStart);
};

document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.state === 'playing' && !questing) game.pause();
  else if (!document.hidden && game.state === 'paused' && !questing && overlay.classList.contains('hidden')) game.resume();
});

fitCanvas();
showStart();
game.boot();

if (import.meta.env.DEV) (window as unknown as { __game: Game }).__game = game;
