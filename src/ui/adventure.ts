import { goalLines, MAX_STARS, type Progress, type Stage } from '../content/adventure';
import type { WorldDef } from '../content/worlds';
import { assetUrl } from '../game/assets';
import type { HintLevel } from '../state/storage';

const HINT_NAMES: Record<HintLevel, string> = { easy: '쉬움', normal: '보통', hard: '어려움' };

export const starText = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n);

const show = (overlay: HTMLElement, html: string) => {
  overlay.classList.remove('hidden');
  overlay.innerHTML = `<div class="card">${html}</div>`;
};

const on = (overlay: HTMLElement, sel: string, fn: () => void) => {
  (overlay.querySelector(sel) as HTMLElement).onclick = fn;
};

export const totalStars = (stages: Stage[], stars: Record<string, number>) =>
  stages.reduce((sum, s) => sum + (stars[s.id] ?? 0), 0);

/** 월드의 스테이지 지도. 앞 스테이지를 깨야 다음이 열린다. */
export function showStageMap(
  overlay: HTMLElement,
  world: WorldDef,
  stages: Stage[],
  stars: Record<string, number>,
  cb: { onPick: (index: number) => void; onBack: () => void },
): void {
  const nodes = stages
    .map((s, i) => {
      const locked = i > 0 && !(stars[stages[i - 1].id] > 0);
      const goal = goalLines(world, s.goal)
        .map((l) => `${l.icon} ${l.text}`)
        .join('  ');
      return `<button class="node${locked ? ' locked' : ''}${stars[s.id] ? ' done' : ''}" data-i="${i}" ${locked ? 'disabled' : ''}>
        <span class="no">${locked ? '🔒' : i + 1}</span>
        <span class="tx"><b>${s.name}</b><small>${goal}</small></span>
        <span class="stars">${starText(stars[s.id] ?? 0)}</span></button>`;
    })
    .join('');
  show(
    overlay,
    `<h2>${world.emoji} ${world.name} 모험</h2>
     <p class="sub">⭐ ${totalStars(stages, stars)}/${MAX_STARS} · 과일 힌트는 뒤로 갈수록 줄어들어요</p>
     <div class="nodes">${nodes}</div>
     <button class="btn alt" id="back">뒤로</button>`,
  );
  overlay.querySelectorAll<HTMLButtonElement>('.node:not(.locked)').forEach((b) => {
    b.onclick = () => cb.onPick(Number(b.dataset.i));
  });
  on(overlay, '#back', cb.onBack);
}

/** 스테이지 시작 전 안내: 목표와 별 얻는 법 */
export function showStageIntro(
  overlay: HTMLElement,
  world: WorldDef,
  stage: Stage,
  cb: { onGo: () => void; onBack: () => void },
): void {
  const chips = goalLines(world, stage.goal)
    .map((l) => `<span class="chip">${l.icon} ${l.text}</span>`)
    .join('');
  show(
    overlay,
    `<img class="fox" src="${assetUrl('fox/think.png')}" alt="" />
     <span class="ribbon">스테이지 ${stage.index + 1}</span>
     <h2>${stage.name}</h2>
     <div class="chips">${chips}</div>
     <p class="sub">과일 힌트: ${HINT_NAMES[stage.hint]}</p>
     <div class="howto">
       <div>★ 목표를 이루면 클리어</div>
       <div>★★ 힌트 없이 퀘스트를 맞히면</div>
       <div>★★★ 과일 ${stage.par}개 이하로 클리어</div>
     </div>
     <button class="btn" id="go">도전!</button>
     <button class="btn alt" id="back">뒤로</button>`,
  );
  on(overlay, '#go', cb.onGo);
  on(overlay, '#back', cb.onBack);
}

export function showStageClear(
  overlay: HTMLElement,
  o: { world: WorldDef; stage: Stage; stars: 1 | 2 | 3; best: number; hasNext: boolean; drops: number },
  cb: { onNext: () => void; onRetry: () => void; onMap: () => void },
): void {
  const improved = o.stars > o.best;
  show(
    overlay,
    `<img class="fox" src="${assetUrl('fox/cheer.png')}" alt="" />
     <h2>${o.hasNext ? '스테이지 클리어!' : `${o.world.name} 정복! 🎉`}</h2>
     <div class="bigstars">${[1, 2, 3].map((n) => `<span class="${n <= o.stars ? 'on' : ''}" style="--d:${n * 0.18}s">★</span>`).join('')}</div>
     <p class="sub">과일 ${o.drops}개 사용${improved ? ' · 새 기록!' : ''}</p>
     ${o.stars < 3 ? `<p class="sub">${o.stars === 1 ? '힌트 없이 퀘스트를 맞히면 ★★!' : `과일 ${o.stage.par}개 이하로 깨면 ★★★!`}</p>` : '<p class="sub">완벽해요!</p>'}
     ${o.hasNext ? '<button class="btn" id="next">다음 스테이지</button>' : ''}
     <button class="btn alt" id="retry">다시 도전</button>
     <button class="btn alt" id="map">지도</button>`,
  );
  if (o.hasNext) on(overlay, '#next', cb.onNext);
  on(overlay, '#retry', cb.onRetry);
  on(overlay, '#map', cb.onMap);
}

export function showStageFail(
  overlay: HTMLElement,
  o: { world: WorldDef; stage: Stage; progress: Progress },
  cb: { onRetry: () => void; onMap: () => void },
): void {
  const lines = goalLines(o.world, o.stage.goal, o.progress)
    .map((l) => `<span class="chip${l.done ? ' done' : ''}">${l.icon} ${l.text}</span>`)
    .join('');
  show(
    overlay,
    `<img class="fox" src="${assetUrl('fox/think.png')}" alt="" />
     <h2>아쉽다, 한 번 더!</h2>
     <div class="chips">${lines}</div>
     <p class="sub">상자가 가득 찼어요. 같은 값끼리 모아 보세요.</p>
     <button class="btn" id="retry">다시 도전</button>
     <button class="btn alt" id="map">지도</button>`,
  );
  on(overlay, '#retry', cb.onRetry);
  on(overlay, '#map', cb.onMap);
}

/** 모험 중 일시정지 메뉴 */
export function showPause(overlay: HTMLElement, cb: { onResume: () => void; onRetry: () => void; onMap: () => void }): void {
  show(
    overlay,
    `<h2>⏸ 잠깐 쉬어요</h2>
     <button class="btn" id="resume">계속하기</button>
     <button class="btn alt" id="retry">처음부터</button>
     <button class="btn alt" id="map">지도</button>`,
  );
  on(overlay, '#resume', cb.onResume);
  on(overlay, '#retry', cb.onRetry);
  on(overlay, '#map', cb.onMap);
}
