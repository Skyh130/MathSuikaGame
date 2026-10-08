import { TOPIC_NAMES } from '../content/quests';
import { assetUrl } from '../game/assets';
import { GRADUATE_LEVEL, topicCounts, type WrongBox } from '../state/wrongbox';

const show = (overlay: HTMLElement, html: string) => {
  overlay.classList.remove('hidden');
  overlay.innerHTML = `<div class="card">${html}</div>`;
};
const on = (overlay: HTMLElement, sel: string, fn: () => void) => {
  (overlay.querySelector(sel) as HTMLElement).onclick = fn;
};
const esc = (t: string) => t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);

/** 오답 상자 보기: 주제별 개수와 문제 목록, 복습 시작 */
export function showWrongBox(
  overlay: HTMLElement,
  box: WrongBox,
  cb: { onStart: (count: number) => void; onBack: () => void },
): void {
  if (box.items.length === 0) {
    show(
      overlay,
      `<img class="fox" src="${assetUrl('fox/thumb.png')}" alt="" />
       <h2>📦 오답 상자</h2>
       <p>비어 있어요! 틀린 문제가 생기면 여기에 모아 두었다가<br />다시 도전할 수 있게 해 줄게요.</p>
       ${box.graduated ? `<p class="sub">🎓 지금까지 ${box.graduated}문제를 졸업했어요</p>` : ''}
       <button class="btn alt" id="back">뒤로</button>`,
    );
    on(overlay, '#back', cb.onBack);
    return;
  }
  const chips = topicCounts(box)
    .map(([t, n]) => `<span class="chip">${TOPIC_NAMES[t]} ${n}</span>`)
    .join('');
  const list = [...box.items]
    .sort((a, b) => b.added - a.added)
    .slice(0, 30)
    .map((i) => {
      const dots = Array.from({ length: GRADUATE_LEVEL }, (_, k) => (k < i.level ? '●' : '○')).join('');
      return `<li><span class="tag">${TOPIC_NAMES[i.quest.topic]}</span><span class="pr">${esc(i.quest.prompt.replace(/\n/g, ' '))}</span><span class="lv" title="연속으로 맞힌 횟수">${dots}</span></li>`;
    })
    .join('');
  const n = Math.min(5, box.items.length);
  show(
    overlay,
    `<h2>📦 오답 상자 <small>(${box.items.length})</small></h2>
     <div class="chips">${chips}</div>
     <p class="sub">틀린 문제를 그대로 모아 뒀어요. 간격을 두고 세 번 연속 맞히면 🎓 졸업!${box.graduated ? ` (졸업 ${box.graduated})` : ''}</p>
     <ul class="wlist">${list}</ul>
     <button class="btn" id="start">복습하기 (${n}문제)</button>
     <button class="btn alt" id="back">뒤로</button>`,
  );
  on(overlay, '#start', () => cb.onStart(n));
  on(overlay, '#back', cb.onBack);
}

export interface ReviewSummary {
  total: number;
  clean: number;
  graduated: number;
  left: number;
}

export function showReviewSummary(overlay: HTMLElement, s: ReviewSummary, cb: { onAgain: () => void; onBack: () => void }): void {
  const great = s.total > 0 && s.clean === s.total;
  show(
    overlay,
    `<img class="fox" src="${assetUrl(great ? 'fox/cheer.png' : 'fox/think.png')}" alt="" />
     <h2>${great ? '모두 해냈어요!' : '복습 끝!'}</h2>
     <p>${s.total}문제 중 <b>${s.clean}문제</b>를 힌트 없이 맞혔어요</p>
     ${s.graduated ? `<p>🎓 ${s.graduated}문제가 졸업했어요!</p>` : ''}
     <p class="sub">${s.left ? `상자에 ${s.left}문제가 남아 있어요` : '상자가 비었어요 🎉'}</p>
     ${s.left ? '<button class="btn" id="again">또 복습</button>' : ''}
     <button class="btn alt" id="back">상자로</button>`,
  );
  if (s.left) on(overlay, '#again', cb.onAgain);
  on(overlay, '#back', cb.onBack);
}
