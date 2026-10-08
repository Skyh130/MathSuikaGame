import { assetUrl } from '../game/assets';
import { TOPIC_NAMES, type BuildQuest, type Quest } from '../content/quests';
import { evaluate, type Token } from '../math/evaluate';

export interface QuestResult {
  solved: boolean;
  hintsUsed: number;
  attempts: number;
  /** 틀린 횟수 (오답 상자에 넣을지 정한다) */
  wrong: number;
}

export interface QuestOptions {
  /** 오답 상자에서 다시 나온 문제 */
  review?: boolean;
}

/** 퀘스트 카드를 overlay 안에 띄우고, 끝나면 결과를 돌려준다. 시간제한은 없다. */
export function showQuest(overlay: HTMLElement, quest: Quest, opts: QuestOptions = {}): Promise<QuestResult> {
  return new Promise((resolve) => {
    let hintsUsed = 0;
    let attempts = 0;
    let wrong = 0;
    let solved = false;

    const card = document.createElement('div');
    card.className = 'card';
    overlay.replaceChildren(card);
    overlay.classList.remove('hidden');

    const finish = () => {
      overlay.classList.add('hidden');
      overlay.replaceChildren();
      resolve({ solved, hintsUsed, attempts, wrong });
    };

    // 공통 뼈대
    card.innerHTML = `
      <img class="fox corner" src="${assetUrl('fox/think.png')}" alt="" />
      <span class="ribbon${opts.review ? ' review' : ''}">${
        opts.review ? '🔁 오답 다시 도전' : '🎁 미스터리 퀘스트'
      } · ${TOPIC_NAMES[quest.topic]}</span>
      <p class="q"></p>
      <div class="body"></div>
      <div class="hints"></div>
      <div class="msg"></div>
      <div class="actions">
        <button class="btn alt" data-act="hint">💡 힌트 (<span class="hn">3</span>)</button>
        <button class="btn" data-act="check">확인 ✓</button>
      </div>
      <button class="btn alt" data-act="skip" style="font-size:14px;padding:6px 14px">다음에 풀래요</button>`;
    (card.querySelector('.q') as HTMLElement).textContent = quest.prompt;

    const body = card.querySelector('.body') as HTMLElement;
    const hintsEl = card.querySelector('.hints') as HTMLElement;
    const msg = card.querySelector('.msg') as HTMLElement;
    const hintBtn = card.querySelector('[data-act=hint]') as HTMLButtonElement;
    const checkBtn = card.querySelector('[data-act=check]') as HTMLButtonElement;

    const say = (text: string, cls: '' | 'bad' | 'good' = '') => {
      msg.textContent = text;
      msg.className = `msg ${cls}`;
    };
    const shakeCard = () => {
      card.classList.remove('shake');
      void card.offsetWidth;
      card.classList.add('shake');
      if (!msg.textContent) say('아깝다! 한 번 더 생각해 볼까요? 💪', 'bad');
    };
    const win = () => {
      solved = true;
      card.querySelector('.actions')!.innerHTML = `<button class="btn" data-act="done">🎉 선물 받기</button>`;
      (card.querySelector('[data-act=skip]') as HTMLElement).remove();
      body.style.pointerEvents = 'none';
      (card.querySelector('.fox') as HTMLImageElement).src = assetUrl('fox/thumb.png');
      say(`정답! ${quest.explanation}`, 'good');
      (card.querySelector('[data-act=done]') as HTMLElement).onclick = finish;
    };

    // 문제 유형별 입력 UI와 정답 검사
    let check: () => boolean;
    if (quest.kind === 'choice') {
      let sel = -1;
      body.innerHTML = `<div class="opts">${quest.options.map((o, i) => `<button data-i="${i}">${o}</button>`).join('')}</div>`;
      body.querySelectorAll<HTMLButtonElement>('.opts button').forEach((b) => {
        b.onclick = () => {
          sel = Number(b.dataset.i);
          body.querySelectorAll('.opts button').forEach((x) => x.classList.toggle('sel', x === b));
        };
      });
      check = () => sel === quest.answer;
    } else if (quest.kind === 'input') {
      body.innerHTML = `<input class="answer" inputmode="numeric" pattern="[0-9]*" autocomplete="off" placeholder="?" />${
        quest.unit ? `<div class="sub">단위: ${quest.unit}</div>` : ''
      }`;
      const input = body.querySelector('input') as HTMLInputElement;
      check = () => input.value.trim() !== '' && Number(input.value) === quest.answer;
    } else {
      check = buildUI(body, quest, say);
    }

    hintBtn.onclick = () => {
      if (hintsUsed >= 3) return;
      const h = document.createElement('div');
      h.className = 'hintbox';
      h.textContent = `힌트 ${hintsUsed + 1}: ${quest.hints[hintsUsed]}`;
      hintsEl.appendChild(h);
      hintsUsed++;
      (card.querySelector('.hn') as HTMLElement).textContent = String(3 - hintsUsed);
      if (hintsUsed >= 3) hintBtn.disabled = true;
    };
    checkBtn.onclick = () => {
      attempts++;
      say('');
      if (check()) win();
      else {
        wrong++;
        shakeCard();
      }
    };
    (card.querySelector('[data-act=skip]') as HTMLElement).onclick = finish;
  });
}

type Pick = { kind: 'card'; idx: number } | { kind: 'op'; ch: '+' | '−' | '×' };

/** 카드 + 연산자를 눌러 식을 만드는 UI. 정답 검사 함수를 돌려준다. */
function buildUI(body: HTMLElement, quest: BuildQuest, say: (t: string, c?: '' | 'bad' | 'good') => void) {
  const picks: Pick[] = [];
  body.innerHTML = `
    <div class="expr"></div>
    <div class="cards num"></div>
    <div class="cards ops"></div>
    <div><button class="btn alt" data-b="back" style="font-size:15px;padding:6px 14px">⌫ 지우기</button>
    <button class="btn alt" data-b="clear" style="font-size:15px;padding:6px 14px">처음부터</button></div>`;
  const exprEl = body.querySelector('.expr') as HTMLElement;
  const numEl = body.querySelector('.num') as HTMLElement;
  const opsEl = body.querySelector('.ops') as HTMLElement;

  const render = () => {
    exprEl.innerHTML = '';
    for (const p of picks) {
      const s = document.createElement('span');
      s.textContent = p.kind === 'card' ? String(quest.cards[p.idx]) : p.ch;
      exprEl.appendChild(s);
    }
    const t = document.createElement('span');
    t.className = 'target';
    t.textContent = `= ${quest.target}`;
    exprEl.appendChild(t);
    numEl.querySelectorAll<HTMLButtonElement>('.tile').forEach((b) => {
      const used = picks.some((p) => p.kind === 'card' && p.idx === Number(b.dataset.i));
      b.classList.toggle('used', used);
      b.disabled = used;
    });
  };
  quest.cards.forEach((c, i) => {
    const b = document.createElement('button');
    b.className = 'tile';
    b.textContent = String(c);
    b.dataset.i = String(i);
    b.onclick = () => {
      const last = picks[picks.length - 1];
      if (last && last.kind === 'card') return say('카드 사이에는 + − × 중 하나를 넣어요', 'bad');
      picks.push({ kind: 'card', idx: i });
      say('');
      render();
    };
    numEl.appendChild(b);
  });
  (['+', '−', '×'] as const).forEach((ch) => {
    const b = document.createElement('button');
    b.className = 'tile op';
    b.textContent = ch;
    b.onclick = () => {
      const last = picks[picks.length - 1];
      if (!last || last.kind === 'op') return say('먼저 숫자 카드를 골라요', 'bad');
      picks.push({ kind: 'op', ch });
      say('');
      render();
    };
    opsEl.appendChild(b);
  });
  (body.querySelector('[data-b=back]') as HTMLElement).onclick = () => {
    picks.pop();
    render();
  };
  (body.querySelector('[data-b=clear]') as HTMLElement).onclick = () => {
    picks.length = 0;
    render();
  };
  render();

  return () => {
    const used = picks.filter((p) => p.kind === 'card').length;
    if (used !== quest.cards.length) {
      say('카드를 모두 한 번씩 써야 해요', 'bad');
      return false;
    }
    const tokens: Token[] = picks.map((p) => (p.kind === 'card' ? quest.cards[p.idx] : p.ch));
    return evaluate(tokens) === quest.target;
  };
}
