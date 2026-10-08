import './style.css';
import { goalLines, isCleared, MAX_STARS, stagesFor, starsFor, type Progress, type Stage } from './content/adventure';
import { drawQuest } from './content/bank';
import type { Difficulty, Quest } from './content/quests';
import { getWorld, SPRITE_COUNT, WORLDS, type WorldDef } from './content/worlds';
import { assetUrl, loadAssets } from './game/assets';
import { CH, CW } from './game/config';
import { Game, type Piece } from './game/Game';
import { loadSave, writeSave, type HintLevel, type PowerUp } from './state/storage';
import { pickDue, record, reviewBatch, type Outcome } from './state/wrongbox';
import { showPause, showStageClear, showStageFail, showStageIntro, showStageMap, totalStars } from './ui/adventure';
import { showQuest, type QuestResult } from './ui/quest';
import { showReviewSummary, showWrongBox } from './ui/wrongbox';

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
function renderLadder(goalTier?: number) {
  const n = world.ladder.length;
  ladderEl.innerHTML = world.ladder
    .map((v, i) => {
      const size = Math.round(16 + (i / (n - 1)) * 18);
      return `<span class="step${i === goalTier ? ' goal' : ''}" data-i="${i}"><img class="dot" style="--sz:${size}px" src="${assetUrl(
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

// ───────── 모험 모드 상태 ─────────
interface StageRun {
  stage: Stage;
  progress: Progress;
}
/** 모험 중이면 현재 스테이지, 자유 모드면 null */
let run: StageRun | null = null;
const goalsEl = $('goals');

function renderGoals() {
  if (!run) {
    goalsEl.classList.add('hidden');
    return;
  }
  goalsEl.classList.remove('hidden');
  goalsEl.innerHTML = goalLines(world, run.stage.goal, run.progress)
    .map((l) => `<span class="chip${l.done ? ' done' : ''}">${l.icon} ${l.text}</span>`)
    .join('');
}

/** 자유 모드로 돌아간다 (목표 표시 제거, 사용자가 정한 힌트 단계) */
function enterFree() {
  run = null;
  game.setSettings({ hint: save.settings.hint });
  game.setQuestPace(5, 8);
  renderGoals();
  renderLadder();
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
    onMaxTier: (t) => {
      ladderEl.querySelectorAll('.step').forEach((el, i) => el.classList.toggle('on', i <= t));
      if (run && t > run.progress.maxTier) {
        run.progress.maxTier = t;
        renderGoals();
        checkStage();
      }
    },
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

let devLast: Quest | null = null; // 개발 중 화면 테스트용
const recentIds: string[] = [];
const recentTpl: string[] = [];

const remember = (q: Quest) => {
  devLast = q;
  recentIds.push(q.id);
  if (recentIds.length > 30) recentIds.shift();
  if (q.tpl) recentTpl.push(q.tpl);
  if (recentTpl.length > 12) recentTpl.shift();
};

/** 모험 중에는 스테이지의 힌트 단계에 맞춘 난이도를, 자유 모드에서는 난이도를 따지지 않는다 */
const wantedDiff = (): Difficulty | undefined =>
  run ? ({ easy: 1, normal: 2, hard: 3 } as const)[run.stage.hint] : undefined;

/** 문제은행에서 퀘스트를 하나 뽑는다. 복습할 때가 된 오답이 있으면 절반쯤은 그걸 낸다. */
function nextQuest(): { quest: Quest; review: boolean } {
  const due = pickDue(save.wrong, recentIds);
  if (due && Math.random() < 0.5) {
    remember(due.quest);
    return { quest: due.quest, review: true };
  }
  const quest = drawQuest({
    maxGrade: save.settings.maxGrade,
    worldTopics: world.topics,
    diff: wantedDiff(),
    stats: save.stats,
    recentTpl,
    recentIds,
  });
  remember(quest);
  return { quest, review: false };
}

/** 퀘스트 결과를 기록한다: 주제별 정답률, 오답 상자 */
function applyResult(quest: Quest, res: QuestResult): ReturnType<typeof record> {
  const st = (save.stats[quest.topic] ??= { seen: 0, correct: 0, hints: 0 });
  st.seen++;
  st.hints += res.hintsUsed;
  if (res.solved) st.correct++;
  const outcome: Outcome = { solved: res.solved, hintsUsed: res.hintsUsed, wrong: res.wrong };
  const change = record(save.wrong, quest, outcome);
  writeSave(save);
  return change;
}

async function runQuest() {
  if (questing) return;
  questing = true;
  game.pause();
  const { quest, review } = nextQuest();
  const res = await showQuest(overlay, quest, { review });
  const change = applyResult(quest, res);
  if (res.solved) {
    if (run) {
      run.progress.quests++;
      if (res.hintsUsed === 0) run.progress.noHintQuests++;
      renderGoals();
    }
    const r = Math.random();
    const kind: PowerUp = r < 0.4 ? 'hint' : r < 0.6 ? 'bomb' : r < 0.8 ? 'shake' : 'undo';
    game.addPowerup(kind);
    const names = { hint: '🔍 힌트', bomb: '💣 폭탄', shake: '🌀 흔들기', undo: '⏪ 되돌리기' };
    toast(change === 'graduated' ? '🎓 오답 졸업! 아이템도 받았어요' : `${names[kind]} 아이템을 얻었어요!`);
  } else if (change === 'added') {
    toast('📦 틀린 문제를 오답 상자에 담아 뒀어요');
  }
  questing = false;
  if (checkStage()) return;
  game.resume();
}

// ───────── 오답 상자 ─────────
function openWrongBox() {
  enterFree();
  showWrongBox(overlay, save.wrong, { onStart: (n) => void runReview(n), onBack: showStart });
}

/** 게임 없이 오답 상자의 문제만 연달아 푼다 */
async function runReview(n: number) {
  const batch = reviewBatch(save.wrong, n).map((i) => i.quest);
  const graduatedBefore = save.wrong.graduated;
  let clean = 0;
  for (const quest of batch) {
    devLast = quest;
    const res = await showQuest(overlay, quest, { review: true });
    applyResult(quest, res);
    if (res.solved && res.wrong === 0 && res.hintsUsed === 0) clean++;
  }
  showReviewSummary(
    overlay,
    { total: batch.length, clean, graduated: save.wrong.graduated - graduatedBefore, left: save.wrong.items.length },
    { onAgain: () => void runReview(Math.min(5, save.wrong.items.length)), onBack: openWrongBox },
  );
}

// ───────── 모험 모드 흐름 ─────────
/** 목표를 이뤘으면 클리어 처리하고 true */
function checkStage(): boolean {
  if (!run || game.state === 'won' || !isCleared(run.stage.goal, run.progress)) return false;
  const { stage, progress } = run;
  game.finish();
  progress.drops = game.drops;
  const stars = starsFor(stage, progress);
  const best = save.adventure[stage.id] ?? 0;
  save.adventure[stage.id] = Math.max(best, stars);
  writeSave(save);
  const hasNext = stage.index + 1 < stagesFor(world).length;
  showStageClear(
    overlay,
    { world, stage, stars, best, hasNext, drops: progress.drops },
    {
      onNext: () => startStage(stagesFor(world)[stage.index + 1]),
      onRetry: () => startStage(stage),
      onMap: openMap,
    },
  );
  return true;
}

function startStage(stage: Stage) {
  run = { stage, progress: { maxTier: -1, quests: 0, noHintQuests: 0, drops: 0 } };
  game.setSettings({ hint: stage.hint });
  game.setQuestPace(...stage.pace);
  renderGoals();
  renderLadder(stage.goal.tier);
  overlay.classList.add('hidden');
  game.start();
}

function openMap() {
  enterFree();
  const stages = stagesFor(world);
  showStageMap(overlay, world, stages, save.adventure, {
    onPick: (i) =>
      showStageIntro(overlay, world, stages[i], { onGo: () => startStage(stages[i]), onBack: openMap }),
    onBack: showStart,
  });
}

function startFree() {
  enterFree();
  overlay.classList.add('hidden');
  game.start();
}

function gameOver(score: number) {
  if (run) {
    showStageFail(overlay, { world, stage: run.stage, progress: run.progress }, {
      onRetry: () => startStage(run!.stage),
      onMap: openMap,
    });
    return;
  }
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
  $('again').onclick = startFree;
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
  enterFree();
  overlay.classList.remove('hidden');
  const card = (w: WorldDef) => {
    const stars = totalStars(stagesFor(w), save.adventure);
    return `<button class="world${w.id === world.id ? ' sel' : ''}" data-id="${w.id}">
      <span class="we">${w.emoji}</span><b>${w.name}</b><small>${w.grades}</small>
      <i>${stars ? `⭐ ${stars}/${MAX_STARS}` : '&nbsp;'}</i></button>`;
  };
  overlay.innerHTML = `<div class="card">
    <img class="logo" src="${assetUrl('ui/logo.png')}" alt="Math Suika Game" />
    <p class="sub">값이 같은 과일끼리 닿으면 한 단계 커져요!</p>
    <div class="worlds">${WORLDS.map(card).join('')}</div>
    <p class="sub blurb" id="blurb">${world.emoji} ${world.blurb}</p>
    <div class="start-actions">
      <button class="btn" id="go-adv">🗺️ 모험</button>
      <button class="btn" id="go-free">♾️ 자유</button>
    </div>
    <div class="start-actions">
      <button class="btn alt" id="go-box">📦 오답 상자${save.wrong.items.length ? ` <span class="badge">${save.wrong.items.length}</span>` : ''}</button>
      <button class="btn alt" id="cfg">설정</button>
    </div></div>`;
  overlay.querySelectorAll<HTMLButtonElement>('.world').forEach((b) => {
    b.onclick = () => {
      chooseWorld(b.dataset.id!);
      overlay.querySelectorAll('.world').forEach((x) => x.classList.toggle('sel', x === b));
      $('blurb').textContent = `${world.emoji} ${world.blurb}`;
    };
  });
  $('go-adv').onclick = openMap;
  $('go-free').onclick = startFree;
  $('go-box').onclick = openWrongBox;
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
    const resume = () => {
      overlay.classList.add('hidden');
      game.resume();
    };
    if (run) {
      showPause(overlay, { onResume: resume, onRetry: () => startStage(run!.stage), onMap: openMap });
    } else {
      showSettings(resume);
    }
  } else if (game.state === 'ready') showSettings(showStart);
};

document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.state === 'playing' && !questing) game.pause();
  else if (!document.hidden && game.state === 'paused' && !questing && overlay.classList.contains('hidden')) game.resume();
});

fitCanvas();
showStart();
game.boot();

if (import.meta.env.DEV) Object.assign(window, { __game: game, __save: save, __runReview: runReview, __last: () => devLast });
